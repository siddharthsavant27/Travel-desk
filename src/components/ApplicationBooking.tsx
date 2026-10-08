"use client";
import Link from "next/link";
import type { CaseView } from "@/lib/workflow";
export function ApplicationBooking({
  application: app,
  employee,
  busy,
  onChange,
}: {
  application: CaseView;
  employee: boolean;
  busy: boolean;
  onChange: () => void;
}) {
  const view = app.booking;
  return (
    <section id="booking" className="wf-card wf-stack scroll-mt-24">
      <p className="wf-kicker">
        Travel bookings · Itinerary {app.itineraryRevision}
      </p>
      <h2>Flights, then your hotel</h2>
      <p className="wf-muted">
        Document approval unlocks flight searches. After you record your booked
        flight, we use its destination arrival and departure dates for hotel
        searches. Confirmations are employee-reported.
      </p>
      <div className="wf-fields">
        <div>
          <h3 className="font-semibold">
            1. Flight {view.flight ? "· Confirmed" : ""}
          </h3>
          {view.flight ? (
            <p className="wf-muted">
              Reference: {view.flight.reference}
              <br />
              Destination stay: {view.flight.arrivalDate} –{" "}
              {view.flight.destinationDepartureDate}
            </p>
          ) : (
            <p className="wf-muted">
              {view.lockedReason ||
                "Ready to search with your approved itinerary."}
            </p>
          )}
          {employee && view.eligible && (
            <Link
              className="wf-btn mt-3"
              href={"/flights?applicationId=" + app.id}
            >
              {view.flight ? "View or update flight" : "Find a flight"}
            </Link>
          )}
        </div>
        <div>
          <h3 className="font-semibold">
            2. Hotel {view.hotel ? "· Confirmed" : ""}
          </h3>
          {view.hotel ? (
            <p className="wf-muted">
              Reference: {view.hotel.reference}
              <br />
              {view.hotel.checkIn} – {view.hotel.checkOut}
            </p>
          ) : (
            <p className="wf-muted">
              {view.hotelEligible
                ? "Your flight is confirmed. Choose your stay."
                : "Confirm your booked flight to unlock hotels."}
            </p>
          )}
          {employee && view.hotelEligible && (
            <Link
              className="wf-btn mt-3"
              href={"/hotels?applicationId=" + app.id}
            >
              {view.hotel ? "View or update hotel" : "Find a hotel"}
            </Link>
          )}
        </div>
      </div>
      {employee && app.status === "VERIFIED" && (
        <div className="border-t border-white/10 pt-4">
          <p className="wf-muted mb-3">
            Changing the approved route or travel dates locks booking and
            requires another review. Existing confirmation records are kept in
            history; external reservations are not cancelled.
          </p>
          <button
            className="wf-btn secondary"
            disabled={busy}
            onClick={onChange}
          >
            Request itinerary change
          </button>
        </div>
      )}
    </section>
  );
}
