"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { WorkflowShell } from "./WorkflowShell";
import { Message } from "./WorkflowUI";
import { RedirectModal } from "./RedirectModal";
import { api, jsonBody } from "@/lib/api-client";
import type { CaseView } from "@/lib/workflow";
import type { BookingView, ProviderView } from "@/lib/booking-types";
type History = {
  id: string;
  itineraryRevision: number;
  createdAt: string;
  snapshot: {
    reason?: string;
    booking?: { flightConfirmation?: string; hotelConfirmation?: string };
  };
};
type BookingResponse = {
  booking: BookingView;
  providers: ProviderView[];
  history: History[];
};
function Workspace({ category }: { category: "flight" | "hotel" }) {
  const params = useSearchParams(),
    id = params.get("applicationId");
  const [applications, setApplications] = useState<CaseView[]>([]),
    [app, setApp] = useState<CaseView | null>(null),
    [booking, setBooking] = useState<BookingView | null>(null),
    [providers, setProviders] = useState<ProviderView[]>([]),
    [history, setHistory] = useState<History[]>([]),
    [role, setRole] = useState("CUSTOMER");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const [travellers, setTravellers] = useState(""),
    [cabin, setCabin] = useState(""),
    [rooms, setRooms] = useState(""),
    [guests, setGuests] = useState(""),
    [checkIn, setCheckIn] = useState(""),
    [checkOut, setCheckOut] = useState(""),
    [arrival, setArrival] = useState(""),
    [destinationDeparture, setDestinationDeparture] = useState(""),
    [reference, setReference] = useState(""),
    [providerId, setProviderId] = useState("");
  const [redirect, setRedirect] = useState<{
    url: string;
    name: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (!id) {
          const data = await api<{ applications: CaseView[] }>(
            "/api/applications",
          );
          if (active) setApplications(data.applications);
        } else {
          const [data, details] = await Promise.all([
            api<BookingResponse>("/api/applications/" + id + "/booking"),
            api<{ application: CaseView; role: string }>(
              "/api/applications/" + id,
            ),
          ]);
          if (!active) return;
          setApp(details.application);
          setRole(details.role);
          setBooking(data.booking);
          setProviders(data.providers);
          setHistory(data.history);
          const p = data.booking.preferences;
          setTravellers(p.travellers ? String(p.travellers) : "");
          setCabin(p.cabin || "");
          setRooms(p.rooms ? String(p.rooms) : "");
          setGuests(p.guests ? String(p.guests) : "");
          setCheckIn(p.checkIn || data.booking.flight?.arrivalDate || "");
          setCheckOut(
            p.checkOut || data.booking.flight?.destinationDepartureDate || "",
          );
          setArrival(data.booking.flight?.arrivalDate || "");
          setDestinationDeparture(
            data.booking.flight?.destinationDepartureDate || "",
          );
          const confirmation =
            category === "flight" ? data.booking.flight : data.booking.hotel;
          setReference(confirmation?.reference || "");
          setProviderId(confirmation?.providerId || "");
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoaded(true);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id, category]);
  const base = "/api/applications/" + id + "/booking";
  const available = providers.filter((p) => p.category === category);
  const allowed =
    !!booking?.eligible &&
    (category === "flight" || booking.hotelEligible) &&
    role === "CUSTOMER";
  async function savePreferences() {
    const preferences =
      category === "flight"
        ? { travellers: Number(travellers), cabin }
        : { rooms: Number(rooms), guests: Number(guests), checkIn, checkOut };
    const data = await api<{ booking: BookingView }>(
      base,
      jsonBody(
        {
          action: "PREFERENCES",
          itineraryRevision: booking!.itineraryRevision,
          preferences,
        },
        "PATCH",
      ),
    );
    setBooking(data.booking);
    return data.booking;
  }
  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await savePreferences();
      const data = await api<{ url: string; providerName: string }>(
        base + "/search",
        jsonBody({ providerId, itineraryRevision: booking!.itineraryRevision }),
      );
      setRedirect({ url: data.url, name: data.providerName });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await savePreferences();
      const data = await api<{ booking: BookingView }>(
        base,
        jsonBody(
          {
            action: category === "flight" ? "CONFIRM_FLIGHT" : "CONFIRM_HOTEL",
            itineraryRevision: booking!.itineraryRevision,
            providerId,
            reference,
            ...(category === "flight"
              ? {
                  arrivalDate: arrival,
                  destinationDepartureDate: destinationDeparture,
                }
              : { checkIn, checkOut }),
          },
          "PATCH",
        ),
      );
      setBooking(data.booking);
      const fresh = await api<BookingResponse>(base);
      setHistory(fresh.history);
      setNotice(
        category === "flight"
          ? "Flight confirmation saved. Hotel searches are now available. Updating this flight resets the active hotel confirmation and preserves its history."
          : "Hotel confirmation saved. Your booking steps are complete.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const title = category === "flight" ? "Book your flight" : "Book your hotel";
  return (
    <WorkflowShell
      title={title}
      eyebrow="Approved travel"
      back={{
        href: id ? "/applications/" + id + "#booking" : "/dashboard",
        label: id ? "Back to application" : "My applications",
      }}
      description="Search with your saved itinerary. Prices, availability and payment are handled by the booking website."
    >
      <div className="wf-stack">
        {error && <Message error>{error}</Message>}
        {notice && <Message>{notice}</Message>}
        {!loaded && <p role="status">Loading booking details…</p>}
        {!id && loaded && (
          <section className="wf-card wf-stack">
            <h2>Choose an application</h2>
            <p className="wf-muted">
              Only applications approved by the travel team can start booking.
            </p>
            {applications
              .filter((a) => a.status === "VERIFIED")
              .map((a) => (
                <div key={a.id} className="border-t border-white/10 pt-4">
                  <p className="font-semibold">
                    {a.caseNumber} · {a.destinationCity || a.destinationCountry}
                  </p>
                  <p className="wf-muted">
                    {a.departureDate?.slice(0, 10)} –{" "}
                    {a.returnDate?.slice(0, 10)}
                  </p>
                  <Link
                    className="wf-btn secondary mt-3"
                    href={
                      (category === "flight" ? "/flights" : "/hotels") +
                      "?applicationId=" +
                      a.id
                    }
                  >
                    Open booking details
                  </Link>
                </div>
              ))}
            {!applications.some((a) => a.status === "VERIFIED") && (
              <p className="wf-muted">
                No approved applications yet. Submit your documents and wait for
                the travel team’s decision.
              </p>
            )}
          </section>
        )}
        {app && booking && (
          <>
            <section className="wf-card wf-stack">
              <p className="wf-kicker">
                {app.caseNumber} · Itinerary {app.itineraryRevision}
              </p>
              <h2 className="break-words">
                {app.departureAirportName} ({app.departureAirportCode}) →{" "}
                {app.destinationAirportName} ({app.destinationAirportCode})
              </h2>
              <p className="wf-muted">
                {app.destinationCity}, {app.destinationCountry} · Approved
                travel: {app.departureDate?.slice(0, 10)} –{" "}
                {app.returnDate?.slice(0, 10)}
              </p>
              <nav className="wf-actions" aria-label="Booking steps">
                <Link
                  className="wf-btn secondary"
                  href={"/flights?applicationId=" + id}
                >
                  1. Flight {booking.flight ? "✓" : ""}
                </Link>
                {booking.hotelEligible ? (
                  <Link
                    className="wf-btn secondary"
                    href={"/hotels?applicationId=" + id}
                  >
                    2. Hotel {booking.hotel ? "✓" : ""}
                  </Link>
                ) : (
                  <span className="wf-muted">
                    2. Hotel · Confirm flight first
                  </span>
                )}
              </nav>
            </section>
            {!allowed && (
              <Message>
                {role !== "CUSTOMER"
                  ? "Staff view: only the employee can search and record bookings."
                  : booking.lockedReason ||
                    "Confirm your purchased flight before searching for hotels."}
              </Message>
            )}
            {allowed && (
              <>
                <form className="wf-card wf-stack" onSubmit={search}>
                  <h2>
                    {category === "flight"
                      ? "Search the approved route"
                      : "Search your destination stay"}
                  </h2>
                  {category === "flight" ? (
                    <div className="wf-fields">
                      <label>
                        Travellers
                        <input
                          type="number"
                          min="1"
                          max="9"
                          required
                          value={travellers}
                          onChange={(e) => setTravellers(e.target.value)}
                        />
                      </label>
                      <label>
                        Cabin class
                        <select
                          required
                          value={cabin}
                          onChange={(e) => setCabin(e.target.value)}
                        >
                          <option value="">Choose cabin class</option>
                          <option value="economy">Economy</option>
                          <option value="premiumeconomy">
                            Premium economy
                          </option>
                          <option value="business">Business</option>
                          <option value="first">First</option>
                        </select>
                      </label>
                    </div>
                  ) : (
                    <>
                      <p className="wf-muted">
                        Confirmed destination stay:{" "}
                        {booking.flight?.arrivalDate} –{" "}
                        {booking.flight?.destinationDepartureDate}. You can
                        choose a shorter hotel stay.
                      </p>
                      <div className="wf-fields">
                        <label>
                          Check-in date
                          <input
                            type="date"
                            required
                            min={booking.flight?.arrivalDate}
                            max={booking.flight?.destinationDepartureDate}
                            value={checkIn}
                            onChange={(e) => setCheckIn(e.target.value)}
                            onInput={(e) => setCheckIn(e.currentTarget.value)}
                          />
                        </label>
                        <label>
                          Check-out date
                          <input
                            type="date"
                            required
                            min={checkIn}
                            max={booking.flight?.destinationDepartureDate}
                            value={checkOut}
                            onChange={(e) => setCheckOut(e.target.value)}
                            onInput={(e) => setCheckOut(e.currentTarget.value)}
                          />
                        </label>
                        <label>
                          Rooms
                          <input
                            type="number"
                            min="1"
                            max="30"
                            required
                            value={rooms}
                            onChange={(e) => setRooms(e.target.value)}
                          />
                        </label>
                        <label>
                          Adult guests
                          <input
                            type="number"
                            min="1"
                            max="30"
                            required
                            value={guests}
                            onChange={(e) => setGuests(e.target.value)}
                          />
                        </label>
                      </div>
                    </>
                  )}
                  <label>
                    Booking website
                    <select
                      required
                      value={providerId}
                      onChange={(e) => setProviderId(e.target.value)}
                    >
                      <option value="">Choose a booking website</option>
                      {available.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!available.length && (
                    <Message>
                      No verified booking website is currently enabled. Contact
                      the travel team.
                    </Message>
                  )}
                  <button
                    className="wf-btn self-start"
                    disabled={busy || !available.length}
                  >
                    {busy ? "Saving…" : "Review search & continue"}
                  </button>
                </form>
                <form className="wf-card wf-stack" onSubmit={confirm}>
                  <h2>
                    {category === "flight"
                      ? "Already booked your flight?"
                      : "Already booked your hotel?"}
                  </h2>
                  <p className="wf-muted">
                    Record the confirmation after purchasing on the selected
                    website. This is employee-reported; TravelDesk does not
                    verify or complete the purchase.
                  </p>
                  {category === "flight" && (
                    <div className="wf-fields">
                      <label>
                        Arrival date at destination
                        <input
                          type="date"
                          required
                          min={app.departureDate?.slice(0, 10)}
                          max={app.returnDate?.slice(0, 10)}
                          value={arrival}
                          onChange={(e) => setArrival(e.target.value)}
                          onInput={(e) => setArrival(e.currentTarget.value)}
                        />
                      </label>
                      <label>
                        Departure date from destination
                        <input
                          type="date"
                          required
                          min={arrival}
                          max={app.returnDate?.slice(0, 10)}
                          value={destinationDeparture}
                          onChange={(e) =>
                            setDestinationDeparture(e.target.value)
                          }
                          onInput={(e) =>
                            setDestinationDeparture(e.currentTarget.value)
                          }
                        />
                      </label>
                    </div>
                  )}
                  <label>
                    {category === "flight"
                      ? "Flight booking reference"
                      : "Hotel confirmation reference"}
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </label>
                  <p className="wf-muted">
                    Use the website and search preferences selected above
                    {category === "hotel"
                      ? ", including your hotel stay dates"
                      : ""}
                    .
                  </p>
                  <button
                    className="wf-btn self-start"
                    disabled={
                      busy ||
                      !providerId ||
                      !available.some((p) => p.id === providerId)
                    }
                  >
                    {busy ? "Saving…" : "Save " + category + " confirmation"}
                  </button>
                </form>
              </>
            )}
            {(booking.flight || booking.hotel) && (
              <section className="wf-card wf-stack">
                <h2>Saved confirmations · Employee-reported</h2>
                {booking.flight && (
                  <p>
                    Flight: {booking.flight.reference} · Destination stay{" "}
                    {booking.flight.arrivalDate} –{" "}
                    {booking.flight.destinationDepartureDate}
                  </p>
                )}
                {booking.hotel && (
                  <p>
                    Hotel: {booking.hotel.reference} · {booking.hotel.checkIn} –{" "}
                    {booking.hotel.checkOut}
                  </p>
                )}
                {category === "flight" && booking.hotelEligible && (
                  <Link
                    className="wf-btn self-start"
                    href={"/hotels?applicationId=" + id}
                  >
                    Continue to hotel booking
                  </Link>
                )}
              </section>
            )}
            {!!history.length && (
              <details className="wf-card">
                <summary>Previous booking records ({history.length})</summary>
                <div className="wf-stack mt-4">
                  {history.map((h) => (
                    <div key={h.id}>
                      <p className="font-semibold">
                        Itinerary {h.itineraryRevision} ·{" "}
                        {new Date(h.createdAt).toLocaleString()}
                      </p>
                      <p className="wf-muted">{h.snapshot.reason}</p>
                      {[
                        h.snapshot.booking?.flightConfirmation,
                        h.snapshot.booking?.hotelConfirmation,
                      ]
                        .filter(Boolean)
                        .map((text, i) => {
                          const record = JSON.parse(text!);
                          return (
                            <p key={i} className="text-sm">
                              {i === 0 ? "Flight" : "Hotel"}: {record.reference}{" "}
                              · {record.arrivalDate || record.checkIn} –{" "}
                              {record.destinationDepartureDate ||
                                record.checkOut}
                            </p>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
        {redirect && app && (
          <RedirectModal
            isOpen
            onClose={() => setRedirect(null)}
            partnerName={redirect.name}
            partnerUrl={redirect.url}
            category={category}
            searchSummary={{
              origin:
                category === "flight"
                  ? app.departureAirportCode || undefined
                  : undefined,
              destination:
                category === "flight"
                  ? app.destinationAirportCode!
                  : app.destinationCity + ", " + app.destinationCountry,
              dates:
                category === "flight"
                  ? app.departureDate?.slice(0, 10) +
                    " to " +
                    app.returnDate?.slice(0, 10)
                  : checkIn + " to " + checkOut,
              classOrGuests:
                category === "flight"
                  ? travellers + " traveller(s) · " + cabin
                  : rooms + " room(s) · " + guests + " adult guest(s)",
            }}
          />
        )}
      </div>
    </WorkflowShell>
  );
}
function Selection({ category }: { category: "flight" | "hotel" }) {
  const params = useSearchParams();
  return (
    <Workspace
      key={category + ":" + params.get("applicationId")}
      category={category}
    />
  );
}
export function BookingWorkspace({
  category,
}: {
  category: "flight" | "hotel";
}) {
  return (
    <Suspense fallback={<p>Loading booking workspace…</p>}>
      <Selection category={category} />
    </Suspense>
  );
}
