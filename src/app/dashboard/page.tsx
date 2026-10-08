"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ArrowRight, RefreshCw, FileText } from "lucide-react";
import { api } from "@/lib/api-client";
import {
  type CaseView,
  nextAction,
  visaLabel,
  formatDate,
} from "@/lib/workflow";
import { WorkflowShell } from "@/components/WorkflowShell";
import { Message, StatusBadge } from "@/components/WorkflowUI";

export default function DashboardPage() {
  const [cases, setCases] = useState<CaseView[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("ALL");
  async function load() {
    setLoading(true);
    setError("");
    try {
      setCases(
        (await api<{ applications: CaseView[] }>("/api/applications"))
          .applications,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const visible = cases.filter(
    (c) =>
      (filter === "ALL" ||
        (filter === "DRAFTS" ? c.progress.editable : c.status === filter)) &&
      (c.caseNumber + " " + c.destinationCountry + " " + c.travelPurpose)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <WorkflowShell
      title="My applications"
      description="Prepare your trip, send it to the travel team, and track what happens next."
      eyebrow="Employee workspace"
      action={
        <Link className="wf-btn" href="/applications/new">
          <Plus size={18} />
          New application
        </Link>
      }
    >
      <div className="wf-stack">
        <div className="wf-grid">
          <div className="wf-card">
            <span className="wf-metric">
              {cases.filter((c) => c.status === "MORE_INFO_REQUESTED").length}
            </span>
            <p className="wf-muted">Need your attention</p>
          </div>
          <div className="wf-card">
            <span className="wf-metric">
              {
                cases.filter((c) =>
                  ["SUBMITTED", "IN_REVIEW", "ESCALATED"].includes(c.status),
                ).length
              }
            </span>
            <p className="wf-muted">With the travel team</p>
          </div>
        </div>
        <div className="wf-toolbar">
          <input
            aria-label="Search applications"
            placeholder="Search case number, destination, or purpose"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Filter applications"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">All applications</option>
            <option value="DRAFTS">Drafts & changes</option>
            <option value="MORE_INFO_REQUESTED">Action needed</option>
            <option value="VERIFIED">Ready for filing</option>
          </select>
          <button
            className="wf-btn secondary"
            onClick={load}
            disabled={loading}
            aria-label="Refresh applications"
          >
            <RefreshCw size={18} />
          </button>
        </div>
        {error && <Message error>{error}</Message>}
        {loading ? (
          <p role="status">Loading applications…</p>
        ) : !visible.length ? (
          <div className="wf-card text-center py-12">
            <FileText className="mx-auto mb-4 text-teal-200" size={32} />
            <h2>
              {cases.length
                ? "No matching applications"
                : "Your next trip starts here"}
            </h2>
            <p className="wf-muted mb-6">
              {cases.length
                ? "Try another search or filter."
                : "Create an application. You can save your answers and return whenever you're ready."}
            </p>
            {!cases.length && (
              <Link className="wf-btn" href="/applications/new">
                Start an application <ArrowRight size={16} />
              </Link>
            )}
          </div>
        ) : (
          <div className="wf-stack">
            {visible.map((c) => (
              <article className="wf-card" key={c.id}>
                <div className="wf-head mb-4">
                  <div>
                    <p className="wf-kicker mb-2">{c.caseNumber}</p>
                    <h2 className="mb-1">{visaLabel(c.visaType)}</h2>
                    <p className="wf-muted">
                      {formatDate(c.departureDate)} – {formatDate(c.returnDate)}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mb-4 break-words">{c.travelPurpose}</p>
                {c.status === "MORE_INFO_REQUESTED" && c.decisions[0] && (
                  <div className="mb-4">
                    <Message>
                      <strong>Travel team:</strong> {c.decisions[0].notes}
                    </Message>
                  </div>
                )}
                <div className="wf-actions justify-between">
                  <p className="wf-muted">
                    {c.progress.answered}/{c.progress.totalQuestions} required
                    answers · {c.progress.uploaded}/{c.progress.totalDocuments}{" "}
                    required documents
                  </p>
                  <Link
                    className="wf-btn secondary"
                    href={"/applications/" + c.id}
                  >
                    {nextAction(c)}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </WorkflowShell>
  );
}
