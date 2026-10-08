"use client";
import type { ItineraryFields as Fields } from "@/lib/booking-types";
export function ItineraryFields({
  value,
  onChange,
  disabled = false,
}: {
  value: Fields;
  onChange: (v: Fields) => void;
  disabled?: boolean;
}) {
  const fields: { key: keyof Fields; label: string; code?: boolean }[] = [
    { key: "departureAirportName", label: "Departure airport name" },
    {
      key: "departureAirportCode",
      label: "Departure airport IATA code",
      code: true,
    },
    { key: "destinationAirportName", label: "Destination airport name" },
    {
      key: "destinationAirportCode",
      label: "Destination airport IATA code",
      code: true,
    },
    { key: "destinationCity", label: "Destination city" },
  ];
  return (
    <fieldset disabled={disabled} className="wf-stack">
      <legend className="font-semibold mb-3">
        Flight route and hotel destination
      </legend>
      <p className="wf-muted text-sm">
        Use the airport names and three-letter IATA codes shown on your intended
        route. You can finish these in your draft; all are required before
        review.
      </p>
      <div className="wf-fields">
        {fields.map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              value={value[field.key]}
              maxLength={field.code ? 3 : 200}
              pattern={field.code ? "[A-Za-z]{3}" : undefined}
              autoCapitalize={field.code ? "characters" : undefined}
              onChange={(e) =>
                onChange({
                  ...value,
                  [field.key]: field.code
                    ? e.target.value.toUpperCase()
                    : e.target.value,
                })
              }
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
