import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { z } from "zod";
export async function GET(req: Request) {
  if ((await getSessionFromRequest(req))?.role !== "ADMIN")
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  return NextResponse.json({
    providers: await prisma.bookingProvider.findMany({
      orderBy: { name: "asc" },
    }),
  });
}
export async function PATCH(req: Request) {
  const session = await getSessionFromRequest(req);
  if (session?.role !== "ADMIN")
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  const input = z
    .object({
      id: z.enum(["skyscanner", "booking"]),
      enabled: z.boolean(),
      name: z.string().trim().min(1).max(80),
    })
    .safeParse(await req.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Enter valid provider settings." },
      { status: 400 },
    );
  const result = await prisma.$transaction(async (db) => {
    const current = await db.bookingProvider.findUnique({
      where: { id: input.data.id },
    });
    if (!current || (input.data.enabled && !current.verifiedAt))
      return {
        error: "This provider has not passed browser verification.",
        status: 409,
      };
    const provider = await db.bookingProvider.update({
      where: { id: current.id },
      data: { enabled: input.data.enabled, name: input.data.name },
    });
    await db.auditLog.create({
      data: {
        actorId: session.userId,
        action: "BOOKING_PROVIDER_UPDATED",
        details: JSON.stringify(input.data),
      },
    });
    return { provider };
  });
  return NextResponse.json(result, {
    status: "error" in result ? result.status : 200,
  });
}
