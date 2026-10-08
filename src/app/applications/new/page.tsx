"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { WorkflowShell } from "@/components/WorkflowShell";
import { Message } from "@/components/WorkflowUI";
import { api, jsonBody } from "@/lib/api-client";
import {
  VISA_ROUTES,
  type VisaType,
  type CaseView,
  localDate,
  visaLabel,
} from "@/lib/workflow";
import { ItineraryFields } from "@/components/ItineraryFields";
import { emptyItinerary } from "@/lib/booking-types";
function NewApplication() {
  const [itinerary, setItinerary] = useState(emptyItinerary);
  const params = useSearchParams(),
    router = useRouter();
  const requested = params.get("visaType") as VisaType;
  const [visa, setVisa] = useState<VisaType>(
      requested in VISA_ROUTES ? requested : "SCHENGEN_BUSINESS",
    ),
    [purpose, setPurpose] = useState(params.get("purpose") || ""),
    [departure, setDeparture] = useState(""),
    [returnDate, setReturn] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [drafts, setDrafts] = useState<CaseView[]>([]);
  useEffect(() => {
    api<{ applications: CaseView[] }>("/api/applications")
      .then((d) => setDrafts(d.applications.filter((c) => c.progress.editable)))
      .catch((e) => setError(e.message));
  }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await api<{ application: CaseView }>(
        "/api/applications",
        jsonBody({
          ...itinerary,
          visaType: visa,
          travelPurpose: purpose,
          departureDate: departure || null,
          returnDate: returnDate || null,
        }),
      );
      router.push("/applications/" + d.application.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const matching = drafts.filter((c) => c.visaType === visa);
  return (
    <WorkflowShell
      title="Set up your trip"
      description="Choose the route and tell us what you're planning. Your draft is saved as soon as you continue."
      eyebrow="New application"
      back={{ href: "/dashboard", label: "My applications" }}
    >
      <div className="wf-grid">
        <div className="wf-stack">
          {error && <Message error>{error}</Message>}
          <form className="wf-card wf-stack" onSubmit={create}>
            <label>
              Visa route
              <select
                value={visa}
                onChange={(e) => setVisa(e.target.value as VisaType)}
              >
                {Object.entries(VISA_ROUTES).map(([key, v]) => (
                  <option key={key} value={key}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="wf-muted">Destination: {VISA_ROUTES[visa].country}</p>
            <label>
              Purpose of travel
              <textarea
                required
                minLength={5}
                maxLength={2000}
                placeholder="For example: client planning meetings in Munich"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </label>
            <ItineraryFields value={itinerary} onChange={setItinerary} />
            <div className="wf-fields">
              <label>
                Departure date{" "}
                <span className="wf-muted text-xs">You can add this later</span>
                <input
                  type="date"
                  min={localDate()}
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  onInput={(e) => setDeparture(e.currentTarget.value)}
                />
              </label>
              <label>
                Return date{" "}
                <span className="wf-muted text-xs">You can add this later</span>
                <input
                  type="date"
                  min={departure || localDate()}
                  value={returnDate}
                  onChange={(e) => setReturn(e.target.value)}
                  onInput={(e) => setReturn(e.currentTarget.value)}
                />
              </label>
            </div>
            <button className="wf-btn" disabled={busy}>
              {busy ? "Creating draft…" : "Create draft & continue"}
            </button>
          </form>
        </div>
        <aside className="wf-stack">
          <div className="wf-card">
            <h2>What happens next</h2>
            <ol className="list-decimal pl-5 space-y-3 wf-muted">
              <li>Answer the preparation questions.</li>
              <li>Upload the required documents.</li>
              <li>Review and submit to the travel team.</li>
              <li>Track checks and any requested changes.</li>
            </ol>
            <p className="wf-muted mt-5">
              “Ready for filing” means your travel team has checked the package.
              Visa decisions remain with the relevant authority.
            </p>
            {VISA_ROUTES[visa].specialist && (
              <div className="mt-5">
                <Message>
                  This route starts a specialist intake. Your coordinator will
                  confirm the petition, employment, and filing requirements.
                </Message>
              </div>
            )}
          </div>
          {matching.length > 0 && (
            <div className="wf-card">
              <h2>Continue an existing draft</h2>
              <p className="wf-muted mb-4">
                You already have an open application for this route. Choose one
                below, or create a separate trip.
              </p>
              <div className="wf-stack">
                {matching.map((c) => (
                  <Link
                    key={c.id}
                    className="wf-link"
                    href={"/applications/" + c.id}
                  >
                    {c.caseNumber} · {visaLabel(c.visaType)}
                    <span className="block wf-muted">{c.travelPurpose}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </WorkflowShell>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<div className="wf">Loading trip setup…</div>}>
      <NewApplication />
    </Suspense>
  );
}
