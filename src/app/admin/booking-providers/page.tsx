"use client";
import { useEffect, useState } from "react";
import { WorkflowShell } from "@/components/WorkflowShell";
import { Message } from "@/components/WorkflowUI";
import { api, jsonBody } from "@/lib/api-client";
import type { ProviderView } from "@/lib/booking-types";
function ProviderCard({
  provider,
  onSave,
  busy,
}: {
  provider: ProviderView;
  onSave: (p: ProviderView) => void;
  busy: boolean;
}) {
  const [name, setName] = useState(provider.name),
    [enabled, setEnabled] = useState(provider.enabled);
  return (
    <form
      className="wf-card wf-stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...provider, name, enabled });
      }}
    >
      <h2>
        {provider.id} · {provider.category}
      </h2>
      <label>
        Display name
        <input
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="wf-choice">
        <input
          type="checkbox"
          checked={enabled}
          disabled={!provider.verifiedAt}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Enable this provider
      </label>
      <p className="wf-muted">
        {provider.verifiedAt
          ? "Prefilled search verified on " + provider.verifiedAt.slice(0, 10)
          : "Disabled until its prefilled search passes browser verification."}
      </p>
      <button className="wf-btn self-start" disabled={busy}>
        Save provider
      </button>
    </form>
  );
}
export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderView[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ providers: ProviderView[] }>("/api/admin/booking-providers")
      .then((d) => setProviders(d.providers))
      .catch((e) => setError(e.message));
  }, []);
  async function save(p: ProviderView) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const d = await api<{ provider: ProviderView }>(
        "/api/admin/booking-providers",
        jsonBody({ id: p.id, name: p.name, enabled: p.enabled }, "PATCH"),
      );
      setProviders((v) => v.map((row) => (row.id === p.id ? d.provider : row)));
      setNotice("Provider settings saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <WorkflowShell
      title="Booking websites"
      eyebrow="Administrator"
      back={{ href: "/admin", label: "Admin console" }}
      description="Enable verified search providers and edit their display names. Search destinations and dates always come from the employee’s application."
    >
      <div className="wf-stack">
        {error && <Message error>{error}</Message>}
        {notice && <Message>{notice}</Message>}
        {providers.map((p) => (
          <ProviderCard
            key={p.id}
            provider={p}
            busy={busy}
            onSave={(p) => void save(p)}
          />
        ))}
      </div>
    </WorkflowShell>
  );
}
