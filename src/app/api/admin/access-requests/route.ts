import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionFromRequest,
  generateTemporaryPassword,
  hashPassword,
  clearLoginRateLimits,
} from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (session?.role !== "ADMIN")
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 403 },
    );
  const requests = await prisma.accessRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  return NextResponse.json({ requests });
}

export async function PATCH(req: Request) {
  const session = await getSessionFromRequest(req);
  if (session?.role !== "ADMIN")
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 403 },
    );
  const { id, action, identityVerified } = await req.json();
  if (typeof id !== "string" || !["APPROVE", "DISMISS"].includes(action))
    return NextResponse.json(
      { error: "Choose a request and an action." },
      { status: 400 },
    );
  if (action === "APPROVE" && identityVerified !== true)
    return NextResponse.json(
      {
        error:
          "Verify the employee's identity through an approved company channel first.",
      },
      { status: 400 },
    );
  const tempPassword = generateTemporaryPassword();
  const passwordHash =
    action === "APPROVE" ? await hashPassword(tempPassword) : "";
  const result = await prisma.$transaction(async (db) => {
    const request = await db.accessRequest.findUnique({ where: { id } });
    if (!request || request.status !== "PENDING")
      return { error: "This request is no longer pending.", status: 409 };
    if (action === "APPROVE") {
      const user = await db.user.findUnique({
        where: { email: request.email },
      });
      if (request.type === "NEW_ACCOUNT" && user)
        return {
          error:
            "This employee already has an account. Dismiss this request or use the password reset workflow.",
          status: 409,
        };
      if (request.type === "PASSWORD_RESET" && !user)
        return {
          error:
            "No account exists for this email. Dismiss this request and ask the employee to request an account.",
          status: 409,
        };
      if (user && !user.isActive)
        return {
          error:
            "This account is deactivated. Review its status in user management before resetting its password.",
          status: 409,
        };
      if (user?.id === session.userId)
        return {
          error: "Use Change password to update your own credentials.",
          status: 400,
        };
      if (user)
        await db.user.update({
          where: { id: user.id },
          data: {
            passwordHash,
            mustChangePassword: true,
            failedLoginAttempts: 0,
            lockedUntil: null,
            sessionVersion: { increment: 1 },
          },
        });
      else
        await db.user.create({
          data: {
            name: request.name,
            email: request.email,
            passwordHash,
            role: "CUSTOMER",
            mustChangePassword: true,
          },
        });
    }
    await db.accessRequest.update({
      where: { id },
      data: {
        status: action === "APPROVE" ? "APPROVED" : "DISMISSED",
        resolvedAt: new Date(),
        resolvedBy: session.userId,
      },
    });
    await db.auditLog.create({
      data: {
        actorId: session.userId,
        action: `ACCESS_REQUEST_${action}`,
        details: JSON.stringify({
          requestId: id,
          email: request.email,
          type: request.type,
        }),
      },
    });
    return {
      success: true,
      email: request.email,
      tempPassword: action === "APPROVE" ? tempPassword : undefined,
    };
  });
  if ("error" in result)
    return NextResponse.json(result, { status: result.status });
  if (action === "APPROVE") clearLoginRateLimits(result.email);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
