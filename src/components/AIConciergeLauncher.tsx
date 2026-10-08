"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Minus, Send, Compass, FileCheck, Bot, LoaderCircle, Trash2, Square } from "lucide-react";
import { api, jsonBody } from "@/lib/api-client";
import { STATUS_LABELS, visaLabel } from "@/lib/workflow";

type Source = { id: string; title: string; href: string };
type Reply = { answer: string; citations: Source[]; links: Source[]; conversationToken: string };
type Message = { role: "user" | "assistant"; text: string; citations?: Source[]; links?: Source[] };
type Options = { available: boolean; applications: { id: string; caseNumber: string; visaType: string; status: string }[] };
const suggestions = ["How do I prepare my visa application?", "What documents am I missing?", "When can I book my flights and hotel?"];

export function AIConciergeLauncher({ signedIn = false, mustChangePassword = false, configured = false }: {
  signedIn?: boolean; mustChangePassword?: boolean; configured?: boolean;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [options, setOptions] = useState<Options | null>(null);
  const [applicationId, setApplicationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [failedMessage, setFailedMessage] = useState("");
  const token = useRef<string | undefined>(undefined);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const canChat = signedIn && !mustChangePassword && configured && options?.available;

  useEffect(() => {
    if (!isOpen || !signedIn || mustChangePassword || !configured) return;
    const abort = new AbortController();
    api<Options>("/api/concierge", { signal: abort.signal }).then((value) => {
      if (!abort.signal.aborted) setOptions(value);
    }).catch(() => {
      if (!abort.signal.aborted) setError("Unable to load the assistant. Close and reopen to try again.");
    });
    return () => abort.abort();
  }, [isOpen, signedIn, mustChangePassword, configured]);
  useEffect(() => () => { controller.current?.abort(); sequence.current++; }, []);
  useEffect(() => { transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: "smooth" }); }, [messages, pending, error]);
  useEffect(() => { if (isOpen && !isMinimized) (input.current ?? panel.current)?.focus(); }, [isOpen, isMinimized, canChat]);

  function cancel() {
    sequence.current++;
    controller.current?.abort();
    controller.current = null;
    setPending("");
  }
  function clear() {
    cancel(); token.current = undefined;
    setMessages([]); setError(""); setFailedMessage(""); setDraft("");
  }
  function close() { cancel(); setIsOpen(false); requestAnimationFrame(() => launcher.current?.focus()); }
  async function send(text: string) {
    const message = text.trim();
    if (!canChat || pending || !message || message.length > 2000) return;
    const current = ++sequence.current;
    const abort = new AbortController();
    controller.current = abort;
    setPending(message); setDraft(""); setError(""); setFailedMessage("");
    try {
      const reply = await api<Reply>("/api/concierge", {
        ...jsonBody({ message, applicationId: applicationId || null, conversationToken: token.current }), signal: abort.signal,
      });
      if (current !== sequence.current) return;
      token.current = reply.conversationToken;
      setMessages((previous) => [...previous, { role: "user" as const, text: message }, { role: "assistant" as const, text: reply.answer, citations: reply.citations, links: reply.links }].slice(-12));
    } catch (failure) {
      if (current !== sequence.current || abort.signal.aborted) return;
      setError(failure instanceof Error ? failure.message : "Unable to send your message.");
      setFailedMessage(message); setDraft(message);
    } finally {
      if (current === sequence.current) { setPending(""); controller.current = null; }
    }
  }

  if (pathname === "/login") return null;
  return <>
    {!isOpen && <button ref={launcher} onClick={() => { setIsOpen(true); setIsMinimized(false); setError(""); }}
      className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--brand-teal)]/40 bg-[#071426]/95 shadow-xl hover:border-[var(--brand-teal)] focus-visible:ring-2 focus-visible:ring-[var(--brand-teal)]"
      aria-label="Open AI Travel & Visa Concierge" title="Open AI Concierge"><Bot className="h-5 w-5 text-[var(--brand-teal)]" /></button>}
    {isOpen && <div ref={panel} tabIndex={-1} role="dialog" aria-modal="false" aria-label="AI Travel Concierge Assistant" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}
      className={`fixed bottom-5 right-5 z-50 flex w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl glass-floating border border-white/15 shadow-2xl ${isMinimized ? "h-16" : "h-[620px] max-h-[calc(100dvh-6.5rem)]"}`}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2"><Bot className="h-5 w-5 shrink-0 text-[var(--brand-teal)]" /><div>
          <h3 className="text-xs font-semibold text-white">TravelDesk Concierge</h3>
          {!isMinimized && <p className="text-[10px] text-[var(--foreground-subtle)]">Travel guidance and your application</p>}
        </div></div>
        <div className="flex items-center">
          <button onClick={clear} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10" aria-label="Clear conversation" title="Clear conversation"><Trash2 className="h-3.5 w-3.5" /></button>
          <button onClick={() => setIsMinimized(!isMinimized)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10" aria-label={isMinimized ? "Expand concierge" : "Minimize concierge"}><Minus className="h-4 w-4" /></button>
          <button onClick={close} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10" aria-label="Close concierge"><X className="h-4 w-4" /></button>
        </div>
      </div>
      {!isMinimized && <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        {!signedIn ? <p className="text-xs text-slate-300"><Link href={`/login?from=${encodeURIComponent(pathname)}`} className="text-[var(--brand-teal)] underline">Sign in</Link> to ask questions and get help with your application.</p>
          : mustChangePassword ? <p className="text-xs"><Link href="/change-password" className="text-[var(--brand-teal)] underline">Change your temporary password</Link> to use the assistant.</p>
          : !configured || options?.available === false ? <p className="text-xs text-slate-300">The assistant is currently unavailable. Use the guidance links below.</p>
          : <>
            <label className="block text-[11px] text-slate-300">Application context (optional)
              <select aria-label="Application context" value={applicationId} disabled={Boolean(pending) || !options} onChange={(event) => { clear(); setApplicationId(event.target.value); }} className="glass-input mt-1 h-10 w-full min-w-0 rounded-lg px-2 text-xs">
                <option value="">General travel guidance</option>
                {options?.applications.map((app) => <option key={app.id} value={app.id}>{app.caseNumber} · {visaLabel(app.visaType)} · {STATUS_LABELS[app.status]}</option>)}
              </select>
            </label>
            <p className="text-[10px] leading-relaxed text-[var(--foreground-subtle)]">AI can make mistakes. Confirm current rules with the travel team. Questions and a limited selected-case summary are sent to Groq. Do not share identity numbers, documents, or passwords.</p>
          </>}
        <div ref={transcript} role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text" className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && !pending && <div className="space-y-2">
            <p className="text-xs leading-relaxed text-slate-300">Ask about visa preparation, documents, portal steps, or booking after approval. Select an application to discuss its checklist.</p>
            {canChat && suggestions.map((suggestion) => <button key={suggestion} onClick={() => void send(suggestion)} className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-left text-xs hover:bg-white/10">{suggestion}</button>)}
          </div>}
          {messages.map((message, index) => <div key={index} className={`rounded-xl p-3 text-xs leading-relaxed ${message.role === "user" ? "ml-5 bg-[var(--brand-teal)]/15" : "mr-2 border border-white/10 bg-white/5"}`}>
            <p className="mb-1 text-[10px] font-semibold text-[var(--brand-teal)]">{message.role === "user" ? "You" : "Concierge"}</p>
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
            {Boolean(message.citations?.length) && <div className="mt-2 space-y-1 border-t border-white/10 pt-2"><p className="text-[10px] text-slate-400">Sources</p>{message.citations?.map((source) => <Link key={source.id} href={source.href} className="block text-[var(--brand-teal)] underline">{source.title}</Link>)}</div>}
            {message.links?.map((link) => <Link key={link.id} href={link.href} className="mt-2 block text-[var(--brand-teal)] underline">{link.title} →</Link>)}
          </div>)}
          {pending && <><p className="ml-5 whitespace-pre-wrap break-words rounded-xl bg-[var(--brand-teal)]/15 p-3 text-xs">{pending}</p><p role="status" className="flex items-center gap-2 text-xs text-slate-300"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Checking guidance and preparing an answer…</p></>}
          {error && <div role="alert" className="rounded-lg border border-amber-400/30 p-3 text-xs text-amber-100"><p>{error}</p>{failedMessage && <button className="mt-2 underline" onClick={() => void send(failedMessage)}>Retry message</button>}</div>}
        </div>
        {canChat && <form onSubmit={(event) => { event.preventDefault(); void send(draft); }} className="shrink-0">
          <label htmlFor="concierge-message" className="sr-only">Ask the travel assistant</label>
          <textarea ref={input} id="concierge-message" value={draft} maxLength={2000} disabled={Boolean(pending)} onChange={(event) => setDraft(event.target.value)} rows={2}
            onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(draft); } }}
            placeholder="Ask a travel or application question…" className="glass-input w-full resize-none rounded-lg p-3 text-xs" />
          <div className="mt-1 flex items-center justify-between"><span className="text-[10px] text-slate-400">{draft.length}/2,000 · Shift+Enter for a new line</span>
            {pending ? <button type="button" onClick={cancel} className="flex min-h-9 items-center gap-1 rounded-lg border border-white/15 px-3 text-xs"><Square className="h-3 w-3" />Cancel</button>
              : <button type="submit" disabled={!draft.trim()} className="flex min-h-9 items-center gap-1 rounded-lg bg-[var(--brand-teal)] px-3 text-xs font-semibold text-[#071426] disabled:opacity-40"><Send className="h-3 w-3" />Send</button>}
          </div>
        </form>}
        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-white/10 pt-3">
          <Link href="/visas" onClick={close} className="flex min-h-10 items-center justify-center gap-1 rounded-lg bg-[var(--brand-teal)] px-2 text-xs font-semibold text-[#071426]"><Compass className="h-3.5 w-3.5" />Visa Navigator</Link>
          <Link href="/interview" onClick={close} className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-white/15 px-2 text-xs"><FileCheck className="h-3.5 w-3.5" />Pre-Screening</Link>
        </div>
      </div>}
    </div>}
  </>;
}
