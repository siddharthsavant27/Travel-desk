import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { audit, caseInclude, caseView } from "@/lib/case-service";
import { VISA_ROUTES } from "@/lib/workflow";
import { tripSchema } from "@/lib/validation";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const records = await prisma.application.findMany({
    where: session.role === "CUSTOMER" ? { userId: session.userId } : {},
    include: caseInclude,
    orderBy: { updatedAt: "desc" },
  });
  const applications = [];
  for (const record of records) applications.push(await caseView(record));
  return NextResponse.json({ applications, role: session.role });
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (session.role !== "CUSTOMER")
    return NextResponse.json(
      { error: "Applications are created from an employee account." },
      { status: 403 },
    );
  const input = tripSchema.safeParse(await req.json());
  if (!input.success)
    return NextResponse.json(
      { error: input.error.issues[0].message },
      { status: 400 },
    );
  const { visaType, travelPurpose, departureDate, returnDate } = input.data;
  const application = await prisma.$transaction(async (db) => {
    const record = await db.application.create({
      data: {
        caseNumber: `TD-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        userId: session.userId,
        visaType,
        destinationCountry: VISA_ROUTES[visaType].country,
        travelPurpose,
        departureDate: departureDate ? new Date(departureDate) : null,
        returnDate: returnDate ? new Date(returnDate) : null,
        departureAirportName: input.data.departureAirportName || null,
        departureAirportCode: input.data.departureAirportCode || null,
        destinationAirportName: input.data.destinationAirportName || null,
        destinationAirportCode: input.data.destinationAirportCode || null,
        destinationCity: input.data.destinationCity || null,
        interviewSessions: { create: { visaType } },
      },
      include: caseInclude,
    });
    await audit(db, session.userId, record.id, "APPLICATION_CREATED");
    return caseView(record, db);
  });
  return NextResponse.json({ application }, { status: 201 });
}
