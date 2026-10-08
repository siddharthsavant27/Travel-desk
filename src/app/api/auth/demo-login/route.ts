import { NextResponse } from "next/server";
import { safeReturnPath, roleHome } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { 
  signSessionToken, 
  SESSION_COOKIE_NAME, 
  SESSION_MAX_AGE,
  IS_COOKIE_SECURE,
  logAuditEvent 
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // 1. Strictly verify Demo Mode is enabled
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true" || process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Demo login is disabled in this environment." },
        { status: 403 }
      );
    }

    const { role, from } = await req.json();
    const validRoles = ["CUSTOMER", "CSR", "ADMIN"] as const;

    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid demo role specified." }, { status: 400 });
    }

    // Match exact seeded email for the role
    const demoEmailMap = {
      CUSTOMER: (process.env.DEMO_CUSTOMER_EMAIL || "customer@harbingergroup.com").toLowerCase(),
      CSR: (process.env.DEMO_CSR_EMAIL || "csr@harbingergroup.com").toLowerCase(),
      ADMIN: (process.env.DEMO_ADMIN_EMAIL || "admin@harbingergroup.com").toLowerCase(),
    };

    const targetEmail = demoEmailMap[role as keyof typeof demoEmailMap];

    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!user || !user.isActive || user.role !== role) {
      return NextResponse.json(
        { error: `Demo account for ${role} not found. Please ensure database is seeded.` },
        { status: 404 }
      );
    }

    const token = await signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      sessionVersion: user.sessionVersion,
      lastActive: Date.now(),
    });

    await logAuditEvent({
      actorId: user.id,
      action: "DEMO_LOGIN_SUCCESS",
      details: { role: user.role },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      redirectUrl: user.mustChangePassword ? `/change-password?from=${encodeURIComponent(safeReturnPath(from, roleHome(user.role)))}` : safeReturnPath(from, roleHome(user.role)),
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: IS_COOKIE_SECURE,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Demo login error:", err);
    return NextResponse.json(
      { error: "Failed to process demo authentication." },
      { status: 500 }
    );
  }
}
