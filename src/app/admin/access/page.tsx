"use client";
import { useEffect, useState } from "react";
import { WorkflowShell } from "@/components/WorkflowShell";
import { Message } from "@/components/WorkflowUI";
import { api, jsonBody } from "@/lib/api-client";
import { formatDate } from "@/lib/workflow";
type AccessRequest = {
  id: string;
  name: string;
  email: string;
  type: string;
  message: string | null;
  status: string;
  createdAt: string;
};
export default function AccessQueue() {
  const [requests, setRequests] = useState<AccessRequest[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [checked, setChecked] = useState<Record<string, boolean>>({}),
    [credentials, setCredentials] = useState<{
      email: string;
      tempPassword: string;
    } | null>(null),
    [copied, setCopied] = useState(false);
  async function load() {
    try {
      setRequests(
        (await api<{ requests: AccessRequest[] }>("/api/admin/access-requests"))
          .requests,
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
  async function resolve(id: string, action: string) {
    setBusy(true);
    setError("");
    try {
      const d = await api<{ email: string; tempPassword?: string }>(
        "/api/admin/access-requests",
        jsonBody({ id, action, identityVerified: checked[id] }, "PATCH"),
      );
      if (d.tempPassword) {
        setCredentials({ email: d.email, tempPassword: d.tempPassword });
        setCopied(false);
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const pending = requests.filter((r) => r.status === "PENDING");
  return (
    <WorkflowShell
      title="Account access requests"
      description="Verify the employee through an approved company channel before provisioning or resetting access."
      eyebrow="Administration"
      back={{ href: "/admin", label: "User management" }}
    >
      <div className="wf-stack">
        {error && <Message error>{error}</Message>}
        {credentials && (
          <div className="wf-card border-teal-300/40">
            <h2>Temporary sign-in details</h2>
            <p className="wf-muted mb-4">
              Share these through your approved company channel. This password
              is shown once; the employee must change it at first sign-in.
            </p>
            <p className="break-all mb-3">{credentials.email}</p>
            <code className="block rounded-lg bg-black/30 p-4 text-lg select-all">
              {credentials.tempPassword}
            </code>
            <div className="wf-actions mt-4">
              <button
                className="wf-btn"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      credentials.email + "\n" + credentials.tempPassword,
                    );
                    setCopied(true);
                  } catch {
                    setError(
                      "Clipboard access failed. Select and copy the details manually.",
                    );
                  }
                }}
              >
                {copied ? "Copied" : "Copy sign-in details"}
              </button>
              <button
                className="wf-btn secondary"
                onClick={() => setCredentials(null)}
              >
                I've securely shared the details
              </button>
            </div>
          </div>
        )}
        {loading ? (
          <p role="status">Loading requests…</p>
        ) : !pending.length ? (
          <div className="wf-card">
            <h2>No pending access requests</h2>
            <p className="wf-muted">
              Requests submitted from the sign-in page will appear here.
            </p>
          </div>
        ) : (
          pending.map((r) => (
            <article className="wf-card wf-stack" key={r.id}>
              <div className="wf-head mb-0">
                <div>
                  <h2 className="mb-1">{r.name}</h2>
                  <p className="wf-muted break-all">{r.email}</p>
                </div>
                <span className="wf-badge">
                  {r.type === "NEW_ACCOUNT"
                    ? "New employee account"
                    : "Password reset"}
                </span>
              </div>
              {r.message && (
                <p className="whitespace-pre-wrap text-sm">{r.message}</p>
              )}
              <p className="wf-muted text-xs">
                Requested {formatDate(r.createdAt)}
              </p>
              <label className="wf-choice">
                <input
                  type="checkbox"
                  checked={!!checked[r.id]}
                  onChange={(e) =>
                    setChecked({ ...checked, [r.id]: e.target.checked })
                  }
                />
                <span>
                  I verified this employee's identity using the company
                  directory and an approved company channel.
                </span>
              </label>
              <div className="wf-actions">
                <button
                  className="wf-btn"
                  disabled={busy || !checked[r.id] || !!credentials}
                  onClick={() => resolve(r.id, "APPROVE")}
                >
                  {r.type === "NEW_ACCOUNT"
                    ? "Create employee account"
                    : "Reset password"}
                </button>
                <button
                  className="wf-btn secondary"
                  disabled={busy}
                  onClick={() => resolve(r.id, "DISMISS")}
                >
                  Dismiss request
                </button>
              </div>
            </article>
          ))
        )}
        {requests.some((r) => r.status !== "PENDING") && (
          <details className="wf-card">
            <summary>Recently resolved requests</summary>
            <ul className="space-y-4 mt-5">
              {requests
                .filter((r) => r.status !== "PENDING")
                .map((r) => (
                  <li key={r.id} className="text-sm break-all">
                    {r.email} ·{" "}
                    {r.type === "NEW_ACCOUNT"
                      ? "New account"
                      : "Password reset"}{" "}
                    <span className="wf-badge ml-2">{r.status}</span>
                  </li>
                ))}
            </ul>
          </details>
        )}
      </div>
    </WorkflowShell>
  );
}
