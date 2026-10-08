import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { audit, refreshCase } from "@/lib/case-service";
import { z } from "zod";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const input = z
    .object({ itineraryRevision: z.number().int() })
    .safeParse(await req.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Reload the current itinerary." },
      { status: 400 },
    );
  const { id } = await params;
  const result = await prisma.$transaction(async (db) => {
    const app = await db.application.findUnique({
      where: { id },
      include: { booking: true },
    });
    if (!app) return { error: "Application not found.", status: 404 };
    if (app.userId !== session.userId || session.role !== "CUSTOMER")
      return { error: "Only the employee can request a change.", status: 403 };
    if (
      app.status !== "VERIFIED" ||
      app.itineraryRevision !== input.data.itineraryRevision
    )
      return {
        error: "Only the current approved itinerary can be reopened.",
        status: 409,
      };
    await db.bookingHistory.create({
      data: {
        applicationId: id,
        itineraryRevision: app.itineraryRevision,
        snapshot: JSON.stringify({
          itinerary: app,
          booking: app.booking,
          reason: "Itinerary reopened for renewed approval",
        }),
      },
    });
    if (app.booking) await db.booking.delete({ where: { applicationId: id } });
    await db.application.update({
      where: { id },
      data: {
        status: "MORE_INFO_REQUESTED",
        itineraryRevision: { increment: 1 },
      },
    });
    await db.caseDecision.create({
      data: {
        applicationId: id,
        actorId: session.userId,
        action: "ITINERARY_CHANGE_REQUESTED",
        notes:
          "Employee requested an itinerary change. Update the trip and resubmit for renewed review.",
        previousStatus: "VERIFIED",
        newStatus: "MORE_INFO_REQUESTED",
      },
    });
    const staff = await db.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: "ADMIN" },
          ...(app.assignedCsrId ? [{ id: app.assignedCsrId }] : []),
        ],
      },
      select: { id: true },
    });
    await db.notification.createMany({
      data: staff.map((user) => ({
        userId: user.id,
        title: "Itinerary change requested",
        message:
          app.caseNumber +
          " needs renewed approval after the employee updates the trip.",
        linkUrl: "/review/" + id,
      })),
    });
    await audit(db, session.userId, id, "ITINERARY_CHANGE_REQUESTED", {
      previousRevision: app.itineraryRevision,
    });
    return { application: await refreshCase(id, db) };
  });
  return NextResponse.json(result, {
    status: "error" in result ? result.status : 200,
  });
}
