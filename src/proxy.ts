import { randomBytes } from "node:crypto";
import { NextResponse, NextRequest } from "next/server";
import { browserSecurityHeaders, contentSecurityPolicy } from "@/lib/security-headers";
import { appOrigin, configuredAppUrl } from "@/lib/app-origin";
import { getSessionFromRequest } from "@/lib/auth";
import {
  IS_COOKIE_SECURE,
  roleHome,
  safeReturnPath,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "@/lib/session";

export async function proxy(request: NextRequest) {
  const nonce = randomBytes(18).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "production");
  const forwarded = new Headers(request.headers);
  forwarded.set("x-nonce", nonce);
  forwarded.set("Content-Security-Policy", csp);
  const response = await handleRequest(new NextRequest(request, { headers: forwarded }));
  response.headers.set("Content-Security-Policy", csp);
  for (const { key, value } of browserSecurityHeaders) response.headers.set(key, value);
  if (configuredAppUrl()?.startsWith("https://")) response.headers.set("Strict-Transport-Security", "max-age=31536000");
  if (request.nextUrl.pathname.startsWith("/api/")) response.headers.set("Cache-Control", "no-store");
  return response;
}

async function handleRequest(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (
    pathname.startsWith("/api/") &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method)
  ) {
    const origin = request.headers.get("origin");
    if (origin && origin !== appOrigin(request.url))
      return NextResponse.json(
        { error: "Request origin is not allowed." },
        { status: 403 },
      );
  }
  const publicAuth = [
    "/api/auth/login",
    "/api/auth/demo-login",
    "/api/auth/logout",
    "/api/access-requests",
  ];
  if (publicAuth.includes(pathname)) return NextResponse.next({ request: { headers: request.headers } });

  const session = await getSessionFromRequest(request, true);
  const isApi = pathname.startsWith("/api/");
  const isProtected =
    /^\/(dashboard|applications|interview|review|admin|change-password|flights|hotels)(\/|$)/.test(
      pathname,
    );
  if (!session && (isProtected || isApi)) {
    if (isApi)
      return NextResponse.json(
        { error: "Your session has ended. Please sign in again." },
        { status: 401 },
      );
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname + search);
    if (request.cookies.has(SESSION_COOKIE_NAME))
      url.searchParams.set("expired", "true");
    const response = NextResponse.redirect(url);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
  if (!session) return NextResponse.next({ request: { headers: request.headers } });

  if (
    session.mustChangePassword &&
    pathname !== "/change-password" &&
    pathname !== "/api/auth/change-password"
  ) {
    if (isApi)
      return NextResponse.json(
        {
          error: "Change your temporary password before continuing.",
          redirectUrl: "/change-password",
        },
        { status: 403 },
      );
    const url = new URL("/change-password", request.url);
    const from =
      pathname === "/login"
        ? request.nextUrl.searchParams.get("from")
        : pathname + search;
    url.searchParams.set("from", safeReturnPath(from, roleHome(session.role)));
    return NextResponse.redirect(url);
  }
  if (pathname === "/login") {
    return NextResponse.redirect(
      new URL(
        safeReturnPath(
          request.nextUrl.searchParams.get("from"),
          roleHome(session.role),
        ),
        request.url,
      ),
    );
  }
  if (
    (pathname.startsWith("/admin") && session.role !== "ADMIN") ||
    (pathname.startsWith("/review") && session.role === "CUSTOMER")
  ) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  const response = NextResponse.next({ request: { headers: request.headers } });
  // Workspace API calls renew activity; page prefetch and notification polling do not.
  // Next strips its internal prefetch header before Proxy, so page GETs stay passive.
  const passiveRequest =
    !isApi ||
    (pathname === "/api/notifications" && request.method === "GET") ||
    request.headers.get("purpose") === "prefetch";
  if (!passiveRequest && Date.now() - session.lastActive > 60_000) {
    const token = await signSessionToken({
      ...session,
      lastActive: Date.now(),
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: IS_COOKIE_SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(
        0,
        Math.floor(((session.expiresAt ?? Date.now()) - Date.now()) / 1000),
      ),
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images/|favicon.ico).*)"],
};
