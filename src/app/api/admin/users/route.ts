import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest, logAuditEvent, generateTemporaryPassword, hashPassword, HARBINGER_DOMAIN, validateCompanyEmail } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            applications: true,
            decisions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error("Error fetching admin users list:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, role = Role.CUSTOMER } = body;

    if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !Object.values(Role).includes(role)) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Validate Harbinger domain
    if (!validateCompanyEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: `Corporate policy strictly requires an authorized ${HARBINGER_DOMAIN} email address.` },
        { status: 400 }
      );
    }

    // 2. Check uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A user account with this corporate email address already exists." },
        { status: 409 }
      );
    }

    // 3. Generate strong temporary password & hash
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(tempPassword);

    // 4. Create user
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        role: role as Role,
        passwordHash,
        mustChangePassword: true,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    // 5. Audit log
    await logAuditEvent({
      actorId: session.userId,
      targetUserId: newUser.id,
      action: "ADMIN_USER_CREATED",
      details: { email: newUser.email, role: newUser.role, name: newUser.name },
    });

    return NextResponse.json(
      {
        success: true,
        user: newUser,
        tempPassword, // Disclosed once to admin in copy modal
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating user:", err);
    return NextResponse.json({ error: "Failed to create user account" }, { status: 500 });
  }
}
