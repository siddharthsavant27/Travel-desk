"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCw, ArrowRight } from "lucide-react";
import { WorkflowShell } from "@/components/WorkflowShell";
import { StatusBadge, Message } from "@/components/WorkflowUI";
import { api } from "@/lib/api-client";
import {
  type CaseView,
  REVIEWABLE_STATUSES,
  visaLabel,
  formatDate,
} from "@/lib/workflow";
function Queue() {
  const params = useSearchParams(),
    router = useRouter();
  const [cases, setCases] = useState<CaseView[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("PENDING");
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
    const id = params.get("caseId");
    if (id) {
      router.replace("/review/" + encodeURIComponent(id));
      return;
    }
    void load();
  }, [params, router]);
  const visible = cases.filter(
    (c) =>
      (filter === "ALL" ||
        (filter === "PENDING" && REVIEWABLE_STATUSES.includes(c.status)) ||
        c.status === filter) &&
      (
        c.caseNumber +
        " " +
        c.user.name +
        " " +
        c.user.email +
        " " +
        c.destinationCountry
      )
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <WorkflowShell
      title="Review queue"
      description="Check submitted packages, request clear corrections, and record the next step."
      eyebrow="Travel team"
      action={
        <button className="wf-btn secondary" onClick={load} disabled={loading}>
          <RefreshCw size={16} />
          Refresh queue
        </button>
      }
    >
      <div className="wf-stack">
        <div className="wf-grid">
          <div className="wf-card">
            <p className="wf-metric">
              {
                cases.filter((c) => REVIEWABLE_STATUSES.includes(c.status))
                  .length
              }
            </p>
            <p className="wf-muted">Awaiting a review decision</p>
          </div>
          <div className="wf-card">
            <p className="wf-metric">
              {cases.filter((c) => c.status === "MORE_INFO_REQUESTED").length}
            </p>
            <p className="wf-muted">Awaiting employee changes</p>
          </div>
        </div>
        <div className="wf-toolbar">
          <input
            aria-label="Search review queue"
            placeholder="Search employee, email, or case number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Filter review queue"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="PENDING">Needs review</option>
            <option value="MORE_INFO_REQUESTED">Awaiting employee</option>
            <option value="VERIFIED">Ready for filing</option>
            <option value="ESCALATED">Specialist review</option>
            <option value="ALL">All applications</option>
          </select>
        </div>
        {error && <Message error>{error}</Message>}
        {loading ? (
          <p role="status">Loading queue…</p>
        ) : !visible.length ? (
          <div className="wf-card">
            <h2>No applications in this view</h2>
            <p className="wf-muted">
              Submitted applications will appear here. Try another filter to see
              other cases.
            </p>
          </div>
        ) : (
          visible.map((c) => (
            <article className="wf-card" key={c.id}>
              <div className="wf-head mb-4">
                <div>
                  <p className="wf-kicker mb-2">{c.caseNumber}</p>
                  <h2 className="mb-1">{c.user.name}</h2>
                  <p className="wf-muted break-all">{c.user.email}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <p className="mb-2">
                {visaLabel(c.visaType)} · {formatDate(c.departureDate)}
              </p>
              <div className="wf-actions justify-between">
                <p className="wf-muted">
                  {c.progress.verified}/{c.progress.totalDocuments} documents
                  verified · {c.flags.filter((f) => !f.resolved).length} open
                  flags
                  {c.assignedCsr ? " · " + c.assignedCsr.name : " · Unassigned"}
                </p>
                <Link className="wf-btn secondary" href={"/review/" + c.id}>
                  Open case
                  <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
    </WorkflowShell>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<div className="wf">Loading queue…</div>}>
      <Queue />
    </Suspense>
  );
}
