"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Upload, FileText } from "lucide-react";
import { api, jsonBody } from "@/lib/api-client";
import {
  type CaseView,
  type QuestionView,
  choiceOptions,
  visaLabel,
  formatDate,
} from "@/lib/workflow";
import { WorkflowShell } from "@/components/WorkflowShell";
import { StatusBadge, Message, ChecklistItem } from "@/components/WorkflowUI";

import { ItineraryFields } from "@/components/ItineraryFields";
import { ApplicationBooking } from "@/components/ApplicationBooking";
import { emptyItinerary } from "@/lib/booking-types";
function QuestionInput({
  question,
  value,
  setValue,
}: {
  question: QuestionView;
  value: string;
  setValue: (v: string) => void;
}) {
  if (
    question.responseType === "BOOLEAN" ||
    question.responseType === "SINGLE_CHOICE"
  ) {
    const options =
      question.responseType === "BOOLEAN"
        ? [
            { label: "Yes", value: "true" },
            { label: "No", value: "false" },
          ]
        : choiceOptions(question);
    return (
      <fieldset className="wf-stack gap-3">
        <legend className="sr-only">{question.questionText}</legend>
        {options.map((option) => (
          <label className="wf-choice" key={option.value}>
            <input
              type="radio"
              name={question.id}
              required={question.isMandatory}
              checked={value === option.value}
              value={option.value}
              onChange={() => setValue(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
    );
  }
  return (
    <label>
      <span className="sr-only">{question.questionText}</span>
      {question.responseType === "TEXT" ? (
        <textarea
          value={value}
          maxLength={10000}
          required={question.isMandatory}
          onChange={(e) => setValue(e.target.value)}
        />
      ) : (
        <input
          type={
            question.responseType === "DATE"
              ? "date"
              : question.responseType === "NUMBER"
                ? "number"
                : "text"
          }
          min={question.responseType === "NUMBER" ? 1 : undefined}
          max={question.responseType === "NUMBER" ? 36500 : undefined}
          step={question.responseType === "NUMBER" ? 1 : undefined}
          value={value}
          required={question.isMandatory}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
    </label>
  );
}
function QuestionCard({
  question,
  answer,
  index,
  total,
  busy,
  onSave,
  onBack,
}: {
  question: QuestionView;
  answer: string;
  index: number;
  total: number;
  busy: boolean;
  onSave: (value: string) => Promise<void>;
  onBack: () => void;
}) {
  const [value, setValue] = useState(answer);
  const dirty = value !== answer;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return (
    <form
      className="wf-card wf-stack"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(value);
      }}
    >
      <p className="wf-kicker">
        Question {index + 1} of {total} ·{" "}
        {question.isMandatory ? "Required" : "Optional"}
      </p>
      <h2 className="mb-0">{question.questionText}</h2>
      {question.helpText && <p className="wf-muted">{question.helpText}</p>}
      <QuestionInput question={question} value={value} setValue={setValue} />
      <div className="wf-actions justify-between">
        <button
          type="button"
          className="wf-btn secondary"
          disabled={index === 0 || busy}
          onClick={onBack}
        >
          Previous
        </button>
        <button className="wf-btn" disabled={busy || !value.trim()}>
          {busy
            ? "Saving…"
            : index === total - 1
              ? "Save & continue to documents"
              : "Save & next"}
          <ArrowRight size={16} />
        </button>
      </div>
      <p className="wf-muted text-xs" role="status">
        {dirty
          ? "Unsaved changes. Use Save & next before leaving this question."
          : answer
            ? "Your answer is saved."
            : "Your answer is saved when you continue."}
      </p>
    </form>
  );
}
function TripDetails({
  application,
  onSave,
  busy,
  editable,
}: {
  application: CaseView;
  onSave: (body: unknown) => Promise<void>;
  busy: boolean;
  editable: boolean;
}) {
  const [itinerary, setItinerary] = useState(
    Object.fromEntries(
      Object.keys(emptyItinerary).map((key) => [
        key,
        application[key as keyof typeof emptyItinerary] || "",
      ]),
    ) as typeof emptyItinerary,
  );
  const [purpose, setPurpose] = useState(application.travelPurpose),
    [departure, setDeparture] = useState(
      application.departureDate?.slice(0, 10) || "",
    ),
    [returnDate, setReturn] = useState(
      application.returnDate?.slice(0, 10) || "",
    );
  return (
    <details className="wf-card">
      <summary>
        Trip details · {formatDate(application.departureDate)} –{" "}
        {formatDate(application.returnDate)}
      </summary>
      <form
        className="wf-stack mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          void onSave({
            ...itinerary,
            travelPurpose: purpose,
            departureDate: departure || null,
            returnDate: returnDate || null,
          });
        }}
      >
        <label>
          Purpose of travel
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
            minLength={5}
            maxLength={2000}
            disabled={!editable}
          />
        </label>
        <ItineraryFields
          value={itinerary}
          onChange={setItinerary}
          disabled={!editable}
        />
        <div className="wf-fields">
          <label>
            Departure date
            <input
              type="date"
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              onInput={(e) => setDeparture(e.currentTarget.value)}
              disabled={!editable}
            />
          </label>
          <label>
            Return date
            <input
              type="date"
              value={returnDate}
              min={departure}
              onChange={(e) => setReturn(e.target.value)}
              onInput={(e) => setReturn(e.currentTarget.value)}
              disabled={!editable}
            />
          </label>
        </div>
        {editable && (
          <button className="wf-btn secondary self-start" disabled={busy}>
            Save trip details
          </button>
        )}
      </form>
    </details>
  );
}
function displayAnswer(question: QuestionView, value: string) {
  if (question.responseType === "BOOLEAN")
    return value === "true" ? "Yes" : "No";
  return choiceOptions(question).find((o) => o.value === value)?.label || value;
}
export default function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params),
    [application, setApplication] = useState<CaseView | null>(null),
    [role, setRole] = useState("CUSTOMER"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [step, setStep] = useState(0),
    [index, setIndex] = useState(0);
  useEffect(() => {
    api<{ application: CaseView; role: string }>("/api/applications/" + id)
      .then((d) => {
        setApplication(d.application);
        setRole(d.role);
        const next = d.application.questions.findIndex(
          (q) => !d.application.answers.some((a) => a.questionId === q.id),
        );
        setIndex(next < 0 ? 0 : next);
        setStep(!d.application.progress.editable ? 2 : next < 0 ? 1 : 0);
      })
      .catch((e) => setError(e.message));
  }, [id]);
  async function mutate(url: string, options: RequestInit, message?: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const d = await api<{ application: CaseView }>(url, options);
      setApplication(d.application);
      if (message) setNotice(message);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const base = "/api/applications/" + id;
  if (!application)
    return (
      <WorkflowShell
        title="Application"
        back={{ href: "/dashboard", label: "My applications" }}
      >
        {error ? (
          <Message error>{error}</Message>
        ) : (
          <p role="status">Loading application…</p>
        )}
      </WorkflowShell>
    );
  const app = application,
    editable = app.progress.editable && role === "CUSTOMER",
    question = app.questions[index],
    activeFlags = app.flags.filter((f) => !f.resolved);
  async function saveAnswer(value: string) {
    if (
      await mutate(
        base + "/interview/answer",
        jsonBody({ questionId: question.id, answerValue: value }),
      )
    ) {
      if (index < app.questions.length - 1) setIndex(index + 1);
      else {
        setStep(1);
        setNotice("Questionnaire saved. Continue with your documents.");
      }
    }
  }
  async function upload(
    documentType: string,
    file: File | undefined,
    input: HTMLInputElement,
  ) {
    if (!file) return;
    const data = new FormData();
    data.append("documentType", documentType);
    data.append("file", file);
    await mutate(
      base + "/documents",
      { method: "POST", body: data },
      "Document uploaded and saved.",
    );
    input.value = "";
  }
  return (
    <WorkflowShell
      title={visaLabel(app.visaType)}
      eyebrow={app.caseNumber}
      description={app.destinationCountry + " · Saved application workspace"}
      back={{
        href: role === "CUSTOMER" ? "/dashboard" : "/review",
        label: role === "CUSTOMER" ? "My applications" : "Review queue",
      }}
      action={<StatusBadge status={app.status} />}
    >
      <div className="wf-stack">
        {error && <Message error>{error}</Message>}
        {notice && <Message>{notice}</Message>}
        {app.status === "MORE_INFO_REQUESTED" && app.decisions[0] && (
          <Message>
            <strong>Changes requested by {app.decisions[0].actor.name}</strong>
            <p className="whitespace-pre-wrap mt-1">{app.decisions[0].notes}</p>
            <p className="mt-2">
              Update your answers or documents, then review and resubmit.
            </p>
          </Message>
        )}
        {!app.progress.editable && (
          <Message>
            <strong>
              {app.status === "VERIFIED"
                ? "Your package is ready for filing."
                : "Your application has been received."}
            </strong>
            <p>
              {app.status === "VERIFIED"
                ? "The travel team has checked your package. This is not a visa approval."
                : app.status === "ESCALATED"
                  ? "A specialist is reviewing your application. You'll be notified if anything else is needed."
                  : "The travel team will check your answers and documents. You'll be notified of any requested changes."}
            </p>
            {app.assignedCsr && (
              <p className="mt-1">Coordinator: {app.assignedCsr.name}</p>
            )}
          </Message>
        )}
        {role !== "CUSTOMER" && (
          <Link className="wf-btn self-start" href={"/review/" + id}>
            Open reviewer workspace
          </Link>
        )}
        <ApplicationBooking
          application={app}
          employee={role === "CUSTOMER"}
          busy={busy}
          onChange={() =>
            void mutate(
              base + "/itinerary-change",
              jsonBody({ itineraryRevision: app.itineraryRevision }),
              "Trip reopened. Update your itinerary and resubmit for approval.",
            )
          }
        />
        <div className="wf-grid">
          <div className="wf-card flex items-center gap-4">
            <CheckCircle2 className="text-teal-200" size={26} />
            <div>
              <p className="font-semibold">
                {app.progress.answered}/{app.progress.totalQuestions} required
                answers saved
              </p>
              <p className="wf-muted">
                {app.progress.uploaded}/{app.progress.totalDocuments} required
                documents uploaded
              </p>
            </div>
          </div>
          <div className="wf-card">
            <p className="font-semibold mb-1">
              {app.progress.canSubmit
                ? "Package complete"
                : "Preparation checklist"}
            </p>
            <p className="wf-muted">
              {app.progress.canSubmit
                ? "All required items are present. The review team will check their contents."
                : "Complete your trip dates, required answers, and documents before submitting."}
            </p>
          </div>
        </div>
        <TripDetails
          key={app.id}
          application={app}
          onSave={(body) =>
            mutate(base, jsonBody(body, "PATCH"), "Trip details saved.").then(
              () => {},
            )
          }
          busy={busy}
          editable={editable}
        />
        <nav className="wf-steps" aria-label="Application steps">
          {["1. Questions", "2. Documents", "3. Review"].map((label, i) => (
            <button
              key={label}
              aria-current={step === i ? "step" : undefined}
              disabled={busy}
              onClick={() => {
                setStep(i);
                setNotice("");
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        {step === 0 &&
          (editable && question ? (
            <div className="wf-grid">
              <QuestionCard
                key={question.id}
                question={question}
                answer={
                  app.answers.find((a) => a.questionId === question.id)
                    ?.answerValue || ""
                }
                index={index}
                total={app.questions.length}
                busy={busy}
                onSave={saveAnswer}
                onBack={() => setIndex(index - 1)}
              />
              <aside className="wf-card">
                <h2>Your saved answers</h2>
                <ul className="space-y-4">
                  {app.questions.map((q, i) => (
                    <li key={q.id}>
                      <button
                        className="text-left wf-link text-sm"
                        onClick={() => setIndex(i)}
                        disabled={busy}
                      >
                        {i + 1}. {q.questionText}
                      </button>
                      <p className="wf-muted mt-1">
                        {app.answers.some((a) => a.questionId === q.id)
                          ? "Saved"
                          : "Not answered"}
                      </p>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          ) : (
            <div className="wf-card">
              <h2>Saved questionnaire</h2>
              <dl className="space-y-5">
                {app.questions.map((q) => (
                  <div key={q.id}>
                    <dt className="font-medium mb-1">{q.questionText}</dt>
                    <dd className="wf-muted">
                      {displayAnswer(
                        q,
                        app.answers.find((a) => a.questionId === q.id)
                          ?.answerValue || "Not answered",
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        {step === 1 && (
          <div className="wf-card wf-stack">
            <div>
              <h2>Supporting documents</h2>
              <p className="wf-muted">
                PDF, JPEG, or PNG · maximum 10 MB per document. Replacing a file
                sends the new version for verification.
              </p>
            </div>
            {app.requirements.map((req) => {
              const doc = app.documents.find(
                (d) => d.documentType === req.documentType,
              );
              return (
                <section
                  className="wf-document wf-stack gap-3"
                  key={req.documentType}
                >
                  <div className="wf-actions justify-between">
                    <h3>
                      {req.label}{" "}
                      <span className="wf-badge ml-2">
                        {req.isMandatory ? "Required" : "Optional"}
                      </span>
                    </h3>
                    {doc && (
                      <span className="wf-badge">
                        {doc.status === "PENDING"
                          ? "Removed"
                          : doc.status === "UPLOADED"
                            ? "Awaiting verification"
                            : doc.status === "VERIFIED"
                              ? "Verified"
                              : "Changes needed"}
                      </span>
                    )}
                  </div>
                  <p className="wf-muted">{req.description}</p>
                  {doc && (
                    <div>
                      <a
                        className="wf-link inline-flex gap-2 items-center break-all"
                        href={
                          "/api/documents/" + doc.id + "/download?preview=1"
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileText size={16} />
                        {doc.originalFilename}
                      </a>
                      <p className="wf-muted text-xs mt-1">
                        {(doc.fileSizeBytes / 1024).toFixed(0)} KB · uploaded{" "}
                        {formatDate(doc.createdAt)}
                      </p>
                      {doc.rejectionReason && (
                        <p className="text-amber-200 text-sm mt-2">
                          Reviewer: {doc.rejectionReason}
                        </p>
                      )}
                    </div>
                  )}
                  {editable && (
                    <div className="wf-actions">
                      <label className="flex-1">
                        <span className="wf-muted">
                          {doc && doc.status !== "PENDING"
                            ? "Replace document"
                            : "Upload document"}
                        </span>
                        <input
                          aria-label={
                            (doc ? "Replace " : "Upload ") + req.label
                          }
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          disabled={busy}
                          onChange={(e) =>
                            void upload(
                              req.documentType,
                              e.target.files?.[0],
                              e.target,
                            )
                          }
                        />
                      </label>
                      {doc && (
                        <button
                          className="wf-btn secondary"
                          disabled={busy}
                          onClick={() =>
                            mutate(
                              "/api/documents/" + doc.id,
                              jsonBody(
                                {
                                  action:
                                    doc.status === "PENDING"
                                      ? "RESTORE"
                                      : "REMOVE",
                                },
                                "PATCH",
                              ),
                              doc.status === "PENDING"
                                ? "Document restored."
                                : "Document removed from the package. You can restore it.",
                            )
                          }
                        >
                          {doc.status === "PENDING" ? "Restore" : "Remove"}
                        </button>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
            <button
              className="wf-btn self-start"
              onClick={() => setStep(2)}
              disabled={busy}
            >
              Continue to review
              <ArrowRight size={16} />
            </button>
          </div>
        )}
        {step === 2 && (
          <div className="wf-grid">
            <div className="wf-stack">
              <div className="wf-card">
                <h2>
                  {editable
                    ? "Review before submitting"
                    : "Application summary"}
                </h2>
                <ul className="space-y-3">
                  <ChecklistItem
                    complete={!app.progress.missingTripDetails.length}
                  >
                    Travel details and dates
                  </ChecklistItem>
                  <ChecklistItem
                    complete={!app.progress.missingQuestions.length}
                  >
                    All required questions answered
                  </ChecklistItem>
                  <ChecklistItem
                    complete={!app.progress.missingDocuments.length}
                  >
                    All required documents uploaded
                  </ChecklistItem>
                </ul>
                {!app.progress.canSubmit && (
                  <div className="wf-divider mt-5">
                    <p className="font-semibold text-sm mb-2">Still needed</p>
                    <ul className="list-disc pl-5 space-y-2 wf-muted">
                      {[
                        ...app.progress.missingTripDetails,
                        ...app.progress.missingQuestions,
                        ...app.progress.missingDocuments,
                      ].map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="wf-actions mt-5">
                  <button
                    className="wf-btn secondary"
                    onClick={() => setStep(0)}
                  >
                    View answers
                  </button>
                  <button
                    className="wf-btn secondary"
                    onClick={() => setStep(1)}
                  >
                    <Upload size={16} />
                    View documents
                  </button>
                </div>
              </div>
              {activeFlags.length > 0 && (
                <div className="wf-card">
                  <h2>Items for the travel team</h2>
                  <p className="wf-muted mb-4">
                    These checks are raised for human review and do not prevent
                    you from submitting.
                  </p>
                  <ul className="space-y-3">
                    {activeFlags.map((f) => (
                      <li key={f.id} className="text-sm text-amber-100">
                        {f.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {editable && (
                <div className="wf-card">
                  <h2>
                    {app.status === "MORE_INFO_REQUESTED"
                      ? "Resubmit your application"
                      : "Send to the travel team"}
                  </h2>
                  <p className="wf-muted mb-5">
                    Confirm that your answers and documents are accurate. After
                    submission, the package stays locked while the team reviews
                    it.
                  </p>
                  <button
                    className="wf-btn w-full"
                    disabled={busy || !app.progress.canSubmit}
                    onClick={() =>
                      void mutate(
                        base + "/submit",
                        jsonBody({}),
                        "Application submitted successfully. Your case number is " +
                          app.caseNumber +
                          ".",
                      )
                    }
                  >
                    {busy
                      ? "Submitting…"
                      : app.status === "MORE_INFO_REQUESTED"
                        ? "Confirm & resubmit"
                        : "Confirm & submit application"}
                  </button>
                </div>
              )}
            </div>
            <aside className="wf-card">
              <h2>Application activity</h2>
              <ol className="wf-timeline">
                {app.activity.map((event) => (
                  <li key={event.id}>
                    <p className="text-sm capitalize">
                      {event.action.toLowerCase().replaceAll("_", " ")}
                    </p>
                    <p className="wf-muted text-xs">
                      {formatDate(event.createdAt)}
                      {event.actor ? " · " + event.actor.name : ""}
                    </p>
                  </li>
                ))}
              </ol>
              {app.decisions.length > 0 && (
                <div className="wf-divider mt-6">
                  <h3 className="mb-4">Messages from the travel team</h3>
                  <div className="space-y-5">
                    {app.decisions.map((d) => (
                      <div key={d.id}>
                        <p className="text-sm whitespace-pre-wrap">{d.notes}</p>
                        <p className="wf-muted text-xs mt-1">
                          {d.actor.name} · {formatDate(d.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </WorkflowShell>
  );
}
