import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkLoginRateLimit, validateCompanyEmail } from "@/lib/auth";

export async function POST(req: Request) {
  const input = z
    .object({
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().email().max(254),
      type: z.enum(["NEW_ACCOUNT", "PASSWORD_RESET"]),
      message: z.string().trim().max(2000).optional(),
    })
    .safeParse(await req.json());
  if (!input.success)
    return NextResponse.json(
      {
        error: "Enter your name, company email, and the access help you need.",
      },
      { status: 400 },
    );
  const email = input.data.email.toLowerCase();
  if (!validateCompanyEmail(email))
    return NextResponse.json(
      { error: "Use your @harbingergroup.com email address." },
      { status: 400 },
    );
  const limit = checkLoginRateLimit(
    `access:${req.headers.get("x-forwarded-for") || "local"}`,
  );
  if (!limit.allowed)
    return NextResponse.json(
      {
        error: `Please wait ${limit.waitMinutes} minutes before sending another request.`,
      },
      { status: 429 },
    );
  const existing = await prisma.accessRequest.findFirst({
    where: { email, type: input.data.type, status: "PENDING" },
  });
  if (!existing) {
    const request = await prisma.accessRequest.create({
      data: { ...input.data, email },
    });
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });
    for (const admin of admins)
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "Account access request",
          message: `${input.data.name} requested ${input.data.type === "NEW_ACCOUNT" ? "an account" : "password help"}. Verify their identity through the company directory before processing.`,
          linkUrl: "/admin/access",
        },
      });
    await prisma.auditLog.create({
      data: {
        action: "ACCESS_REQUEST_RECEIVED",
        details: JSON.stringify({ requestId: request.id, type: request.type }),
      },
    });
  }
  return NextResponse.json({
    success: true,
    message:
      "Your request has been recorded. An administrator will verify your identity and contact you through an approved company channel. If you already sent this request, it remains in the queue.",
  });
}
