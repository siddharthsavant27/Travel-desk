import { SignJWT, jwtVerify } from "jose";
import { configuredAppUrl } from "./app-origin";

export const SESSION_COOKIE_NAME = "traveldesk_session";
export const SESSION_MAX_AGE = 8 * 60 * 60;
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const IS_COOKIE_SECURE =
  configuredAppUrl()?.startsWith("https://") === true;

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "CSR" | "ADMIN";
  mustChangePassword?: boolean;
  sessionVersion?: number;
  lastActive: number;
  expiresAt?: number;
}

function secret() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error(
      "Configure SESSION_SECRET with at least 32 characters before starting TravelDesk.",
    );
  }
  return new TextEncoder().encode(process.env.SESSION_SECRET);
}

export function safeReturnPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return fallback;
  try {
    const url = new URL(value, "http://traveldesk.local");
    if (
      url.origin !== "http://traveldesk.local" ||
      /^\/(api|login|change-password)(\/|$)/.test(url.pathname)
    )
      return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

export function roleHome(role: SessionPayload["role"]) {
  return role === "CUSTOMER" ? "/dashboard" : "/review";
}

export async function signSessionToken(
  payload: SessionPayload,
): Promise<string> {
  const expiresAt = payload.expiresAt ?? Date.now() + SESSION_MAX_AGE * 1000;
  return new SignJWT({ ...payload, expiresAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .sign(secret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
    });
    const session = payload as unknown as SessionPayload;
    if (
      !session.userId ||
      !session.lastActive ||
      Date.now() - session.lastActive > IDLE_TIMEOUT_MS
    )
      return null;
    return session;
  } catch {
    return null;
  }
}
