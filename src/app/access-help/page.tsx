"use client";
import { useState } from "react";
import { WorkflowShell } from "@/components/WorkflowShell";
import { Message } from "@/components/WorkflowUI";
export default function AccessHelp() {
  const [type, setType] = useState("NEW_ACCOUNT"),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, type, message }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Unable to send request.");
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <WorkflowShell
      title="Get account access"
      description="Request an employee account or help resetting your password."
      eyebrow="Account support"
      back={{ href: "/login", label: "Sign in" }}
    >
      <div className="wf-grid">
        <div className="wf-stack">
          {error && <Message error>{error}</Message>}
          {sent ? (
            <div className="wf-card">
              <h2>Request received</h2>
              <p className="wf-muted">
                An administrator will review your request and verify your
                identity through a company channel. If the request is eligible,
                they will share sign-in instructions with you.
              </p>
              <p className="wf-muted mt-4">
                You will be asked to choose a new password when using a
                temporary password for the first time.
              </p>
            </div>
          ) : (
            <form className="wf-card wf-stack" onSubmit={submit}>
              <label>
                What do you need?
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="NEW_ACCOUNT">A new employee account</option>
                  <option value="PASSWORD_RESET">Reset my password</option>
                </select>
              </label>
              <label>
                Full name
                <input
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                Company email
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@harbingergroup.com"
                  required
                  maxLength={200}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Additional details{" "}
                <span className="wf-muted text-xs">
                  Optional · team or manager name
                </span>
                <textarea
                  maxLength={1000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              <button className="wf-btn" disabled={busy}>
                {busy ? "Sending request…" : "Send access request"}
              </button>
            </form>
          )}
        </div>
        <aside className="wf-card self-start">
          <h2>Access is managed by your company</h2>
          <p className="wf-muted">
            Use your @harbingergroup.com email. New accounts start with employee
            access; reviewer and admin permissions are managed separately by
            administrators.
          </p>
          <p className="wf-muted mt-4">
            Never include a password or travel document in this request.
          </p>
        </aside>
      </div>
    </WorkflowShell>
  );
}
