import { z } from "zod";
import { VISA_ROUTES, type VisaType } from "./workflow";

export const tripSchema = z
  .object({
    visaType: z.enum(Object.keys(VISA_ROUTES) as [VisaType, ...VisaType[]]),
    destinationCountry: z.string().optional(),
    departureAirportName: z.string().trim().max(200).optional().nullable(),
    departureAirportCode: z
      .string()
      .trim()
      .toUpperCase()
      .refine(
        (v) => !v || /^[A-Z]{3}$/.test(v),
        "Enter a three-letter departure airport IATA code.",
      )
      .optional()
      .nullable(),
    destinationAirportName: z.string().trim().max(200).optional().nullable(),
    destinationAirportCode: z
      .string()
      .trim()
      .toUpperCase()
      .refine(
        (v) => !v || /^[A-Z]{3}$/.test(v),
        "Enter a three-letter destination airport IATA code.",
      )
      .optional()
      .nullable(),
    destinationCity: z.string().trim().max(200).optional().nullable(),
    travelPurpose: z
      .string()
      .trim()
      .min(5, "Describe the purpose of your trip.")
      .max(2000),
    departureDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    returnDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.departureAirportCode &&
      data.departureAirportCode === data.destinationAirportCode
    )
      ctx.addIssue({
        code: "custom",
        path: ["destinationAirportCode"],
        message: "Choose different departure and destination airports.",
      });
    for (const key of ["departureDate", "returnDate"] as const) {
      if (
        data[key] &&
        (!Number.isFinite(Date.parse(data[key])) ||
          new Date(data[key]).toISOString().slice(0, 10) !== data[key])
      )
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Choose valid travel dates.",
        });
    }
    if (
      data.departureDate &&
      data.returnDate &&
      data.returnDate < data.departureDate
    )
      ctx.addIssue({
        code: "custom",
        path: ["returnDate"],
        message: "Return date must be on or after departure.",
      });
  });
