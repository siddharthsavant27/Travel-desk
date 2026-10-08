import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionFromRequest,
  SESSION_COOKIE_NAME,
  logAuditEvent,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSessionFromRequest(req, true);
    if (session) {
      await prisma.user.update({
        where: { id: session.userId },
        data: { sessionVersion: { increment: 1 } },
      });
      await logAuditEvent({
        actorId: session.userId,
        action: "USER_LOGOUT",
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
    }
  } catch (error) {
    console.error("Session revocation failed during sign-out:", error);
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return response;
}
