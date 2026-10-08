import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { 
  getCurrentUser, 
  signSessionToken, 
  SESSION_COOKIE_NAME, 
  SESSION_MAX_AGE,
  IS_COOKIE_SECURE,
  logAuditEvent 
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true" || process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Demo switching is disabled." },
        { status: 403 }
      );
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { role } = await req.json();
    const validRoles = ["CUSTOMER", "CSR", "ADMIN"] as const;

    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role requested." }, { status: 400 });
    }

    const demoEmailMap = {
      CUSTOMER: (process.env.DEMO_CUSTOMER_EMAIL || "customer@harbingergroup.com").toLowerCase(),
      CSR: (process.env.DEMO_CSR_EMAIL || "csr@harbingergroup.com").toLowerCase(),
      ADMIN: (process.env.DEMO_ADMIN_EMAIL || "admin@harbingergroup.com").toLowerCase(),
    };

    const targetEmail = demoEmailMap[role as keyof typeof demoEmailMap];

    const targetUser = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!targetUser || !targetUser.isActive || targetUser.role !== role) {
      return NextResponse.json(
        { error: `Demo account for ${role} not available.` },
        { status: 404 }
      );
    }

    const token = await signSessionToken({
      userId: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      mustChangePassword: targetUser.mustChangePassword,
      sessionVersion: targetUser.sessionVersion,
      lastActive: Date.now(),
    });

    await logAuditEvent({
      actorId: currentUser.id,
      targetUserId: targetUser.id,
      action: "DEMO_ROLE_SWITCHED",
      details: { fromRole: currentUser.role, toRole: targetUser.role },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
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
    console.error("Demo switch error:", err);
    return NextResponse.json({ error: "Failed to switch demo role." }, { status: 500 });
  }
}
