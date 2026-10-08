"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ApplicationBooking } from "@/components/ApplicationBooking";
import { WorkflowShell } from "@/components/WorkflowShell";
import { StatusBadge, Message, ChecklistItem } from "@/components/WorkflowUI";
import { api, jsonBody } from "@/lib/api-client";
import {
  type CaseView,
  choiceOptions,
  REVIEWABLE_STATUSES,
  visaLabel,
  formatDate,
} from "@/lib/workflow";
type Note = {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string };
};
export default function ReviewCase({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params),
    [app, setApp] = useState<CaseView | null>(null),
    [viewer, setViewer] = useState(""),
    [role, setRole] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [decision, setDecision] = useState("MORE_INFO_REQUESTED"),
    [notes, setNotes] = useState(""),
    [internal, setInternal] = useState(""),
    [internalNotes, setInternalNotes] = useState<Note[]>([]),
    [reasons, setReasons] = useState<Record<string, string>>({});
  const base = "/api/applications/" + id;
  async function load() {
    try {
      const d = await api<{
        application: CaseView;
        role: string;
        viewerId: string;
        internalNotes: Note[];
      }>(base);
      setApp(d.application);
      setViewer(d.viewerId);
      setRole(d.role);
      setInternalNotes(d.internalNotes || []);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  async function mutate(
    url: string,
    body: unknown,
    method = "POST",
    message = "Saved.",
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const d = await api<{ application: CaseView }>(
        url,
        jsonBody(body, method),
      );
      setApp(d.application);
      setNotice(message);
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (!app)
    return (
      <WorkflowShell
        title="Review application"
        back={{ href: "/review", label: "Review queue" }}
      >
        {error ? (
          <Message error>{error}</Message>
        ) : (
          <p role="status">Loading case…</p>
        )}
      </WorkflowShell>
    );
  const reviewable = REVIEWABLE_STATUSES.includes(app.status),
    assignedElsewhere =
      !!app.assignedCsr && app.assignedCsr.id !== viewer && role !== "ADMIN",
    canClaim = reviewable && !assignedElsewhere,
    canReview =
      canClaim && (app.assignedCsr?.id === viewer || role === "ADMIN");
  const ready =
    app.progress.canSubmit &&
    app.progress.criticalFlags === 0 &&
    app.progress.verified === app.progress.totalDocuments;
  return (
    <WorkflowShell
      title={app.user.name}
      eyebrow={app.caseNumber}
      description={app.user.email + " · " + visaLabel(app.visaType)}
      back={{ href: "/review", label: "Review queue" }}
      action={<StatusBadge status={app.status} />}
    >
      <div className="wf-stack">
        {error && <Message error>{error}</Message>}
        {notice && <Message>{notice}</Message>}
        {assignedElsewhere && (
          <Message>
            This case is assigned to {app.assignedCsr?.name}. You can read it;
            the assigned reviewer or an administrator can record changes.
          </Message>
        )}
        {!reviewable && (
          <Message>
            {app.status === "MORE_INFO_REQUESTED"
              ? "Waiting for the employee to correct and resubmit the application."
              : app.status === "VERIFIED"
                ? "This package has been checked and marked ready for filing."
                : "The employee is still preparing this application."}
          </Message>
        )}
        <div className="wf-card">
          <div className="wf-head mb-4">
            <div>
              <h2 className="mb-1">Trip & ownership</h2>
              <p className="wf-muted">
                {app.departureAirportName} ({app.departureAirportCode}) →{" "}
                {app.destinationAirportName} ({app.destinationAirportCode}) ·{" "}
                {app.destinationCity}
                <br />
                {formatDate(app.departureDate)} – {formatDate(app.returnDate)} ·{" "}
                {app.destinationCountry}
              </p>
            </div>
            {canClaim && (
              <button
                disabled={busy}
                className="wf-btn"
                onClick={() =>
                  mutate(
                    base + "/review",
                    {},
                    "POST",
                    "Case assigned to you for review.",
                  )
                }
              >
                {app.assignedCsr?.id === viewer
                  ? "Continue review"
                  : "Assign to me & start review"}
              </button>
            )}
          </div>
          <p className="whitespace-pre-wrap">{app.travelPurpose}</p>
          <p className="wf-muted mt-3">
            Coordinator: {app.assignedCsr?.name || "Unassigned"}
          </p>
        </div>
        <nav
          className="wf-actions wf-review-nav"
          aria-label="Reviewer sections"
        >
          <a className="wf-btn secondary" href="#document-checks">
            Documents
          </a>
          <a className="wf-btn secondary" href="#saved-questionnaire">
            Questionnaire
          </a>
          <a className="wf-btn secondary" href="#review-decision">
            Decision
          </a>
        </nav>
        <div className="wf-grid">
          <div className="wf-stack">
            <section className="wf-card wf-stack" id="document-checks">
              <div>
                <h2>Document checks</h2>
                <p className="wf-muted">
                  Open and inspect each file before verifying it. A rejection
                  reason will be visible to the employee.
                </p>
              </div>
              {app.requirements.map((req) => {
                const doc = app.documents.find(
                  (d) =>
                    d.documentType === req.documentType &&
                    d.status !== "PENDING",
                );
                return (
                  <div
                    key={req.documentType}
                    className="wf-document wf-stack gap-3"
                  >
                    <div className="wf-actions justify-between">
                      <h3>{req.label}</h3>
                      <span className="wf-badge">
                        {doc?.status || "MISSING"}
                      </span>
                    </div>
                    {doc ? (
                      <>
                        <a
                          className="wf-link break-all"
                          href={
                            "/api/documents/" + doc.id + "/download?preview=1"
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          {doc.originalFilename} ↗
                        </a>
                        {doc.rejectionReason && (
                          <p className="wf-muted">
                            Correction: {doc.rejectionReason}
                          </p>
                        )}
                        {canReview && (
                          <>
                            <label>
                              Reason if changes are needed
                              <input
                                aria-label={
                                  "Correction reason for " + req.label
                                }
                                value={reasons[doc.id] || ""}
                                placeholder="Explain the correction clearly"
                                maxLength={5000}
                                onChange={(e) =>
                                  setReasons({
                                    ...reasons,
                                    [doc.id]: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <div className="wf-actions">
                              <button
                                className="wf-btn secondary"
                                disabled={busy || doc.status === "VERIFIED"}
                                onClick={() =>
                                  mutate(
                                    "/api/documents/" + doc.id,
                                    { action: "VERIFY" },
                                    "PATCH",
                                    "Document verified.",
                                  )
                                }
                              >
                                Verify document
                              </button>
                              <button
                                className="wf-btn danger"
                                disabled={
                                  busy ||
                                  (reasons[doc.id] || "").trim().length < 5
                                }
                                onClick={() =>
                                  mutate(
                                    "/api/documents/" + doc.id,
                                    {
                                      action: "REJECT",
                                      reason: reasons[doc.id],
                                    },
                                    "PATCH",
                                    "Document marked for correction. Request changes below to return the package.",
                                  )
                                }
                              >
                                Needs correction
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <p className="wf-muted">
                        {req.isMandatory
                          ? "Required document is missing."
                          : "Optional document not uploaded."}
                      </p>
                    )}
                  </div>
                );
              })}
            </section>
            <section className="wf-card" id="saved-questionnaire">
              <h2>Saved questionnaire</h2>
              <dl className="space-y-5">
                {app.questions.map((q) => {
                  const answer = app.answers.find(
                    (a) => a.questionId === q.id,
                  )?.answerValue;
                  const label =
                    q.responseType === "BOOLEAN"
                      ? answer === "true"
                        ? "Yes"
                        : answer === "false"
                          ? "No"
                          : null
                      : choiceOptions(q).find((o) => o.value === answer)
                          ?.label || answer;
                  return (
                    <div key={q.id}>
                      <dt className="font-medium text-sm mb-1">
                        {q.questionText}
                      </dt>
                      <dd className="wf-muted whitespace-pre-wrap">
                        {label || "Not answered"}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          </div>
          <aside className="wf-stack">
            <section className="wf-card wf-stack">
              <div>
                <h2>Review flags</h2>
                <p className="wf-muted">
                  Critical flags require a recorded resolution before filing
                  readiness can be confirmed.
                </p>
              </div>
              {!app.flags.length && (
                <p className="wf-muted">No automated flags raised.</p>
              )}
              {app.flags.map((flag) => (
                <div className="wf-document wf-stack gap-3" key={flag.id}>
                  <div className="wf-actions">
                    <span className="wf-badge">{flag.severity}</span>
                    {flag.resolved && (
                      <span className="text-teal-200 text-sm">Resolved</span>
                    )}
                  </div>
                  <p className="text-sm">{flag.message}</p>
                  {!flag.resolved && canReview && (
                    <>
                      <label>
                        Resolution and supporting evidence
                        <textarea
                          value={reasons[flag.id] || ""}
                          minLength={10}
                          maxLength={5000}
                          placeholder="Record what you checked and why this flag is resolved"
                          onChange={(e) =>
                            setReasons({
                              ...reasons,
                              [flag.id]: e.target.value,
                            })
                          }
                        />
                      </label>
                      <button
                        className="wf-btn secondary"
                        disabled={
                          busy || (reasons[flag.id] || "").trim().length < 10
                        }
                        onClick={() =>
                          mutate(
                            base + "/flags/" + flag.id,
                            { reason: reasons[flag.id] },
                            "PATCH",
                            "Flag resolved. The reason is saved in internal notes.",
                          )
                        }
                      >
                        Record resolution
                      </button>
                    </>
                  )}
                </div>
              ))}
            </section>
            <section className="wf-card wf-stack">
              <div>
                <h2 id="review-decision">Review decision</h2>
                <p className="wf-muted">
                  Filing readiness confirms the package was checked by your
                  team. It does not confirm a visa grant.
                </p>
              </div>
              <ul className="space-y-3">
                <ChecklistItem complete={app.progress.canSubmit}>
                  Required answers, trip details, and documents present
                </ChecklistItem>
                <ChecklistItem
                  complete={
                    app.progress.verified === app.progress.totalDocuments
                  }
                >
                  {app.progress.verified}/{app.progress.totalDocuments} required
                  documents verified
                </ChecklistItem>
                <ChecklistItem complete={app.progress.criticalFlags === 0}>
                  Critical flags resolved
                </ChecklistItem>
              </ul>
              {canReview && (
                <form
                  className="wf-stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      await mutate(
                        base + "/decision",
                        {
                          decisionType: decision,
                          notes,
                          internalNote: internal,
                        },
                        "POST",
                        "Decision saved and employee notified.",
                      )
                    ) {
                      setNotes("");
                      setInternal("");
                    }
                  }}
                >
                  <label>
                    Next step
                    <select
                      value={decision}
                      onChange={(e) => setDecision(e.target.value)}
                    >
                      <option value="MORE_INFO_REQUESTED">
                        Request changes from employee
                      </option>
                      <option value="ESCALATED">
                        Send for specialist review
                      </option>
                      <option value="VERIFIED" disabled={!ready}>
                        Mark ready for filing
                        {!ready ? " — checks incomplete" : ""}
                      </option>
                    </select>
                  </label>
                  <label>
                    Message to employee
                    <textarea
                      required
                      minLength={5}
                      maxLength={5000}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Explain the next step and any specific changes needed."
                    />
                  </label>
                  <label>
                    Internal note{" "}
                    <span className="wf-muted text-xs">
                      Optional · visible to the travel team only
                    </span>
                    <textarea
                      maxLength={5000}
                      value={internal}
                      onChange={(e) => setInternal(e.target.value)}
                    />
                  </label>
                  <button
                    className="wf-btn"
                    disabled={
                      busy ||
                      notes.trim().length < 5 ||
                      (decision === "VERIFIED" && !ready)
                    }
                  >
                    {busy
                      ? "Saving decision…"
                      : "Record decision & notify employee"}
                  </button>
                </form>
              )}
            </section>
            {app.decisions.length > 0 && (
              <section className="wf-card">
                <h2>Decision history</h2>
                <div className="wf-stack">
                  {app.decisions.map((d) => (
                    <div key={d.id}>
                      <StatusBadge status={d.action} />
                      <p className="text-sm whitespace-pre-wrap mt-2">
                        {d.notes}
                      </p>
                      <p className="wf-muted text-xs mt-1">
                        {d.actor.name} · {formatDate(d.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {internalNotes.length > 0 && (
              <section className="wf-card">
                <h2>Internal notes</h2>
                <div className="wf-stack">
                  {internalNotes.map((note) => (
                    <div key={note.id}>
                      <p className="text-sm whitespace-pre-wrap">
                        {note.content}
                      </p>
                      <p className="wf-muted text-xs mt-1">
                        {note.author.name} · {formatDate(note.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <Link className="wf-link text-sm" href={"/applications/" + id}>
              View employee summary
            </Link>
          </aside>
        </div>
      </div>
      <ApplicationBooking
        application={app}
        employee={false}
        busy={false}
        onChange={() => {}}
      />
      <Link
        className="wf-btn secondary mt-4"
        href={"/flights?applicationId=" + app.id}
      >
        View booking details and history
      </Link>
    </WorkflowShell>
  );
}
