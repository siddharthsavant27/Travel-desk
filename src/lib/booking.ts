import type { Application, Booking } from "@prisma/client";
import { z } from "zod";
import type {
  BookingView,
  FlightConfirmation,
  HotelConfirmation,
  BookingPreferences,
} from "./booking-types";

export const SUPPORTED_PROVIDERS = {
  skyscanner: {
    name: "Skyscanner",
    category: "flight",
    host: "www.skyscanner.net",
  },
  booking: { name: "Booking.com", category: "hotel", host: "www.booking.com" },
} as const;
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      Number.isFinite(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Choose a valid date.",
  );
const reference = z.string().trim().min(2).max(100);
export const preferencesSchema = z
  .object({
    travellers: z.number().int().min(1).max(9).optional(),
    cabin: z
      .enum(["economy", "premiumeconomy", "business", "first"])
      .optional(),
    rooms: z.number().int().min(1).max(30).optional(),
    guests: z.number().int().min(1).max(30).optional(),
    checkIn: dateOnly.optional(),
    checkOut: dateOnly.optional(),
  })
  .strict();
export const bookingMutation = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("PREFERENCES"),
    itineraryRevision: z.number().int(),
    preferences: preferencesSchema,
  }),
  z.object({
    action: z.literal("CONFIRM_FLIGHT"),
    itineraryRevision: z.number().int(),
    providerId: z.literal("skyscanner"),
    reference,
    arrivalDate: dateOnly,
    destinationDepartureDate: dateOnly,
  }),
  z.object({
    action: z.literal("CONFIRM_HOTEL"),
    itineraryRevision: z.number().int(),
    providerId: z.literal("booking"),
    reference,
    checkIn: dateOnly,
    checkOut: dateOnly,
  }),
]);
export function bookingView(
  app: Application,
  booking: Booking | null = null,
): BookingView {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const missing =
    !app.departureAirportCode ||
    !app.departureAirportName ||
    !app.destinationAirportCode ||
    !app.destinationAirportName ||
    !app.destinationCity ||
    !app.departureDate ||
    !app.returnDate;
  const lockedReason =
    app.status !== "VERIFIED"
      ? "The travel team must approve this application before booking."
      : missing
        ? "Complete the missing itinerary details and submit them for renewed approval."
        : app.departureDate!.toISOString().slice(0, 10) < today
          ? "These travel dates have passed. Request an itinerary change and renewed approval."
          : null;
  const current =
    booking?.itineraryRevision === app.itineraryRevision ? booking : null;
  const flight: FlightConfirmation | null = current?.flightConfirmation
    ? JSON.parse(current.flightConfirmation)
    : null;
  const hotel: HotelConfirmation | null = current?.hotelConfirmation
    ? JSON.parse(current.hotelConfirmation)
    : null;
  const preferences: BookingPreferences = current
    ? JSON.parse(current.preferences)
    : {};
  return {
    itineraryRevision: app.itineraryRevision,
    eligible: !lockedReason,
    lockedReason,
    hotelEligible: !lockedReason && !!flight,
    progress: lockedReason
      ? "LOCKED"
      : hotel
        ? "COMPLETE"
        : flight
          ? "HOTEL"
          : "FLIGHT",
    preferences,
    flight,
    hotel,
  };
}
export function validateStay(
  checkIn: string,
  checkOut: string,
  flight: FlightConfirmation,
) {
  return (
    checkIn >= flight.arrivalDate &&
    checkOut <= flight.destinationDepartureDate &&
    checkOut > checkIn
  );
}
export function buildSearchUrl(
  providerId: string,
  app: Application,
  prefs: BookingPreferences,
  flight: FlightConfirmation | null,
) {
  if (providerId === "skyscanner") {
    if (!prefs.travellers || !prefs.cabin)
      throw new Error("Choose travellers and cabin class.");
    const url = new URL(
      "https://www.skyscanner.net/g/referrals/v1/flights/day-view/",
    );
    url.search = new URLSearchParams({
      origin: app.departureAirportCode!,
      destination: app.destinationAirportCode!,
      outboundDate: app.departureDate!.toISOString().slice(0, 10),
      inboundDate: app.returnDate!.toISOString().slice(0, 10),
      adultsv2: String(prefs.travellers),
      cabinclass: prefs.cabin,
      rtn: "1",
    }).toString();
    return url.href;
  }
  if (providerId === "booking") {
    if (
      !flight ||
      !prefs.rooms ||
      !prefs.guests ||
      !prefs.checkIn ||
      !prefs.checkOut ||
      !validateStay(prefs.checkIn, prefs.checkOut, flight)
    )
      throw new Error(
        "Choose rooms, guests and a valid stay within your confirmed flight dates.",
      );
    if (prefs.rooms > prefs.guests)
      throw new Error("Each room needs at least one guest.");
    const url = new URL("https://www.booking.com/searchresults.html");
    url.search = new URLSearchParams({
      ss: `${app.destinationCity}, ${app.destinationCountry}`,
      checkin: prefs.checkIn,
      checkout: prefs.checkOut,
      no_rooms: String(prefs.rooms),
      group_adults: String(prefs.guests),
      group_children: "0",
    }).toString();
    return url.href;
  }
  throw new Error("Unsupported booking provider.");
}
