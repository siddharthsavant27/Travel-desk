import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { bookingView, buildSearchUrl } from "@/lib/booking";
import { z } from "zod";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const input = z
    .object({
      providerId: z.enum(["skyscanner", "booking"]),
      itineraryRevision: z.number().int(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Choose a supported provider and current itinerary." },
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
      return {
        error: "Only the employee can search for their trip.",
        status: 403,
      };
    const view = bookingView(app, app.booking);
    if (
      !view.eligible ||
      input.data.itineraryRevision !== app.itineraryRevision
    )
      return {
        error:
          view.lockedReason ||
          "The itinerary changed. Reload before searching.",
        status: 409,
      };
    const provider = await db.bookingProvider.findUnique({
      where: { id: input.data.providerId },
    });
    if (!provider?.enabled || !provider.verifiedAt)
      return { error: "This provider is unavailable.", status: 409 };
    if (provider.category === "hotel" && !view.hotelEligible)
      return {
        error: "Confirm your booked flight before searching for hotels.",
        status: 409,
      };
    try {
      return {
        url: buildSearchUrl(provider.id, app, view.preferences, view.flight),
        providerName: provider.name,
      };
    } catch (error) {
      return { error: (error as Error).message, status: 422 };
    }
  });
  return NextResponse.json(result, {
    status: "error" in result ? result.status : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
