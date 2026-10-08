import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { bookingView, bookingMutation, validateStay } from "@/lib/booking";
import { audit } from "@/lib/case-service";
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, { params }: Context) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      booking: true,
      bookingHistory: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!app)
    return NextResponse.json(
      { error: "Application not found." },
      { status: 404 },
    );
  if (app.userId !== session.userId && session.role === "CUSTOMER")
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  const providers = await prisma.bookingProvider.findMany({
    where: { enabled: true, verifiedAt: { not: null } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    booking: bookingView(app, app.booking),
    providers,
    history: app.bookingHistory.map((h) => ({
      ...h,
      snapshot: JSON.parse(h.snapshot),
    })),
  });
}
export async function PATCH(req: Request, { params }: Context) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const input = bookingMutation.safeParse(await req.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: input.error.issues[0].message },
      { status: 400 },
    );
  const { id } = await params,
    data = input.data;
  const result = await prisma.$transaction(async (db) => {
    const app = await db.application.findUnique({
      where: { id },
      include: { booking: true },
    });
    if (!app) return { error: "Application not found.", status: 404 };
    if (app.userId !== session.userId || session.role !== "CUSTOMER")
      return { error: "Only the employee can update bookings.", status: 403 };
    const view = bookingView(app, app.booking);
    if (!view.eligible) return { error: view.lockedReason!, status: 409 };
    if (data.itineraryRevision !== app.itineraryRevision)
      return {
        error: "The itinerary changed. Reload before continuing.",
        status: 409,
      };
    if (data.action !== "PREFERENCES") {
      const provider = await db.bookingProvider.findUnique({
        where: { id: data.providerId },
      });
      if (!provider?.enabled || !provider.verifiedAt)
        return { error: "This provider is unavailable.", status: 409 };
    }
    let preferences = view.preferences;
    let flightConfirmation = app.booking?.flightConfirmation ?? null,
      hotelConfirmation = app.booking?.hotelConfirmation ?? null;
    if (data.action === "PREFERENCES") {
      preferences = { ...preferences, ...data.preferences };
      const hotelFields = ["rooms", "guests", "checkIn", "checkOut"].some(
        (key) => key in data.preferences,
      );
      if (hotelFields && !view.hotelEligible)
        return {
          error: "Confirm your flight before choosing a hotel stay.",
          status: 409,
        };
      if (
        hotelFields &&
        preferences.checkIn &&
        preferences.checkOut &&
        !validateStay(preferences.checkIn, preferences.checkOut, view.flight!)
      )
        return {
          error: "Hotel dates must fit within your confirmed destination stay.",
          status: 422,
        };
      if (
        preferences.rooms &&
        preferences.guests &&
        preferences.rooms > preferences.guests
      )
        return { error: "Each room needs at least one guest.", status: 422 };
    } else if (data.action === "CONFIRM_FLIGHT") {
      if (!preferences.travellers || !preferences.cabin)
        return { error: "Save travellers and cabin class first.", status: 422 };
      const start = app.departureDate!.toISOString().slice(0, 10),
        end = app.returnDate!.toISOString().slice(0, 10);
      if (
        data.arrivalDate < start ||
        data.destinationDepartureDate > end ||
        data.destinationDepartureDate <= data.arrivalDate
      )
        return {
          error:
            "Destination arrival and departure must fit within the approved travel window and include at least one hotel night.",
          status: 422,
        };
      if (app.booking?.flightConfirmation)
        await db.bookingHistory.create({
          data: {
            applicationId: id,
            itineraryRevision: app.itineraryRevision,
            snapshot: JSON.stringify({
              itinerary: app,
              booking: app.booking,
              reason: "Flight confirmation updated",
            }),
          },
        });
      flightConfirmation = JSON.stringify({
        providerId: data.providerId,
        reference: data.reference,
        arrivalDate: data.arrivalDate,
        destinationDepartureDate: data.destinationDepartureDate,
        confirmedAt: new Date().toISOString(),
      });
      hotelConfirmation = null;
      preferences = {
        travellers: preferences.travellers,
        cabin: preferences.cabin,
        checkIn: data.arrivalDate,
        checkOut: data.destinationDepartureDate,
      };
    } else {
      if (!view.hotelEligible)
        return {
          error: "Confirm your flight before recording a hotel booking.",
          status: 409,
        };
      if (!preferences.rooms || !preferences.guests)
        return { error: "Save rooms and guests first.", status: 422 };
      if (!validateStay(data.checkIn, data.checkOut, view.flight!))
        return {
          error: "Hotel dates must fit within your confirmed destination stay.",
          status: 422,
        };
      if (app.booking?.hotelConfirmation)
        await db.bookingHistory.create({
          data: {
            applicationId: id,
            itineraryRevision: app.itineraryRevision,
            snapshot: JSON.stringify({
              booking: app.booking,
              reason: "Hotel confirmation updated",
            }),
          },
        });
      hotelConfirmation = JSON.stringify({
        providerId: data.providerId,
        reference: data.reference,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        confirmedAt: new Date().toISOString(),
      });
      preferences = {
        ...preferences,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
      };
    }
    const booking = await db.booking.upsert({
      where: { applicationId: id },
      create: {
        applicationId: id,
        itineraryRevision: app.itineraryRevision,
        preferences: JSON.stringify(preferences),
        flightConfirmation,
        hotelConfirmation,
      },
      update: {
        itineraryRevision: app.itineraryRevision,
        preferences: JSON.stringify(preferences),
        flightConfirmation,
        hotelConfirmation,
      },
    });
    await audit(db, session.userId, id, "BOOKING_" + data.action, {
      itineraryRevision: app.itineraryRevision,
    });
    return { booking: bookingView(app, booking) };
  });
  return NextResponse.json(result, {
    status: "error" in result ? result.status : 200,
  });
}
