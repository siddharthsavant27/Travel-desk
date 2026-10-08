import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import {
  audit,
  caseInclude,
  caseView,
  refreshAnswerFlags,
  refreshCase,
} from "@/lib/case-service";
import { EDITABLE_STATUSES } from "@/lib/workflow";
import { tripSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, { params }: Context) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  const record = await prisma.application.findUnique({
    where: { id },
    include: caseInclude,
  });
  if (!record)
    return NextResponse.json(
      { error: "Application not found." },
      { status: 404 },
    );
  if (record.userId !== session.userId && session.role === "CUSTOMER")
    return NextResponse.json(
      { error: "You do not have access to this application." },
      { status: 403 },
    );
  const application = await caseView(record);
  const internalNotes =
    session.role === "CUSTOMER"
      ? []
      : await prisma.caseNote.findMany({
          where: { applicationId: id, isInternal: true },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: { name: true } },
          },
        });
  return NextResponse.json({
    application,
    questions: application.questions,
    role: session.role,
    viewerId: session.userId,
    ...(session.role !== "CUSTOMER" ? { internalNotes } : {}),
  });
}

export async function PATCH(req: Request, { params }: Context) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  const record = await prisma.application.findUnique({ where: { id } });
  if (!record)
    return NextResponse.json(
      { error: "Application not found." },
      { status: 404 },
    );
  if (record.userId !== session.userId)
    return NextResponse.json(
      { error: "Only the employee can edit trip details." },
      { status: 403 },
    );
  if (!EDITABLE_STATUSES.includes(record.status))
    return NextResponse.json(
      {
        error: "This application is with the review team and cannot be edited.",
      },
      { status: 409 },
    );
  const input = tripSchema.safeParse({
    ...(await req.json()),
    visaType: record.visaType,
  });
  if (!input.success)
    return NextResponse.json(
      { error: input.error.issues[0].message },
      { status: 400 },
    );

  const application = await prisma.$transaction(async (db) => {
    const current = await db.application.findUniqueOrThrow({ where: { id } });
    if (!EDITABLE_STATUSES.includes(current.status))
      return { error: "Trip details are locked during review.", status: 409 };
    const combined = tripSchema.safeParse({
      ...current,
      departureDate: current.departureDate?.toISOString().slice(0, 10) ?? null,
      returnDate: current.returnDate?.toISOString().slice(0, 10) ?? null,
      ...Object.fromEntries(
        Object.entries(input.data).filter(([, value]) => value !== undefined),
      ),
    });
    if (!combined.success)
      return { error: combined.error.issues[0].message, status: 400 };
    const values = combined.data;
    await db.application.update({
      where: { id },
      data: {
        travelPurpose: values.travelPurpose,
        departureDate: values.departureDate
          ? new Date(values.departureDate)
          : null,
        returnDate: values.returnDate ? new Date(values.returnDate) : null,
        departureAirportName:
          input.data.departureAirportName === undefined
            ? current.departureAirportName
            : input.data.departureAirportName || null,
        departureAirportCode:
          input.data.departureAirportCode === undefined
            ? current.departureAirportCode
            : input.data.departureAirportCode || null,
        destinationAirportName:
          input.data.destinationAirportName === undefined
            ? current.destinationAirportName
            : input.data.destinationAirportName || null,
        destinationAirportCode:
          input.data.destinationAirportCode === undefined
            ? current.destinationAirportCode
            : input.data.destinationAirportCode || null,
        destinationCity:
          input.data.destinationCity === undefined
            ? current.destinationCity
            : input.data.destinationCity || null,
      },
    });
    await refreshAnswerFlags(id, db);
    await audit(db, session.userId, id, "TRIP_DETAILS_UPDATED");
    return refreshCase(id, db);
  });
  if ("error" in application)
    return NextResponse.json(application, { status: application.status });
  return NextResponse.json({ application });
}
