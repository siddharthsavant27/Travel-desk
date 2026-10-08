import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest, logAuditEvent, generateTemporaryPassword, hashPassword, clearLoginRateLimits } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, role, isActive } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    // 1. ACTION: CHANGE_ROLE
    if (action === "CHANGE_ROLE") {
      if (!role || !Object.values(Role).includes(role)) {
        return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
      }

      // Safeguard: Cannot demote self
      if (targetUser.id === session.userId && role !== Role.ADMIN) {
        return NextResponse.json(
          { error: "Safeguard violation: An administrator cannot demote their own account." },
          { status: 400 }
        );
      }

      // Safeguard: Cannot demote last active admin
      if (targetUser.role === Role.ADMIN && role !== Role.ADMIN) {
        const activeAdminCount = await prisma.user.count({
          where: { role: Role.ADMIN, isActive: true },
        });
        if (activeAdminCount <= 1) {
          return NextResponse.json(
            { error: "Safeguard violation: Cannot demote the last remaining active administrator." },
            { status: 400 }
          );
        }
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { role: role as Role, sessionVersion: { increment: 1 } },
        select: { id: true, email: true, name: true, role: true, isActive: true },
      });

      await logAuditEvent({
        actorId: session.userId,
        targetUserId: targetUser.id,
        action: "ADMIN_USER_ROLE_CHANGED",
        details: { previousRole: targetUser.role, newRole: role },
      });

      return NextResponse.json({ success: true, user: updated });
    }

    // 2. ACTION: TOGGLE_ACTIVE
    if (action === "TOGGLE_ACTIVE") {
      if (typeof isActive !== "boolean") return NextResponse.json({ error: "isActive must be a boolean." }, { status: 400 });
      const newActiveState = Boolean(isActive);

      // Safeguard: Cannot deactivate self
      if (targetUser.id === session.userId && !newActiveState) {
        return NextResponse.json(
          { error: "Safeguard violation: An administrator cannot deactivate their own account." },
          { status: 400 }
        );
      }

      // Safeguard: Cannot deactivate last active admin
      if (targetUser.role === Role.ADMIN && targetUser.isActive && !newActiveState) {
        const activeAdminCount = await prisma.user.count({
          where: { role: Role.ADMIN, isActive: true },
        });
        if (activeAdminCount <= 1) {
          return NextResponse.json(
            { error: "Safeguard violation: Cannot deactivate the last remaining active administrator." },
            { status: 400 }
          );
        }
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { isActive: newActiveState, sessionVersion: { increment: 1 } },
        select: { id: true, email: true, name: true, role: true, isActive: true },
      });

      await logAuditEvent({
        actorId: session.userId,
        targetUserId: targetUser.id,
        action: newActiveState ? "ADMIN_USER_REACTIVATED" : "ADMIN_USER_DEACTIVATED",
        details: { email: targetUser.email, previousState: targetUser.isActive, newState: newActiveState },
      });

      return NextResponse.json({ success: true, user: updated });
    }

    // 3. ACTION: RESET_PASSWORD
    if (action === "RESET_PASSWORD") {
      if (targetUser.id === session.userId) return NextResponse.json({ error: "Use Change password to update your own credentials." }, { status: 400 });
      const tempPassword = generateTemporaryPassword();
      const passwordHash = await hashPassword(tempPassword);

      const updated = await prisma.user.update({
        where: { id },
        data: {
          passwordHash,
          mustChangePassword: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
          sessionVersion: { increment: 1 },
        },
        select: { id: true, email: true, name: true, role: true, isActive: true, mustChangePassword: true },
      });
      clearLoginRateLimits(targetUser.email);

      await logAuditEvent({
        actorId: session.userId,
        targetUserId: targetUser.id,
        action: "ADMIN_USER_PASSWORD_RESET",
        details: { email: targetUser.email },
      });

      return NextResponse.json({
        success: true,
        user: updated,
        tempPassword, // Disclosed once to admin in copy modal
      });
    }

    return NextResponse.json({ error: "Invalid admin action specified." }, { status: 400 });
  } catch (err) {
    console.error("Error modifying user:", err);
    return NextResponse.json({ error: "Failed to modify user account" }, { status: 500 });
  }
}
