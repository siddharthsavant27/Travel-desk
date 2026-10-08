import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export class ConciergeError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number, public outcome?: string) { super(message); }
}
export const chatInput = z.object({
  message: z.string().trim().min(1).max(2000),
  applicationId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).nullable().optional(),
  conversationToken: z.string().max(28000).optional(),
}).strict();
const exchangeSchema = z.object({ user: z.string().max(2000), assistant: z.string().max(6000) }).strict();
const tokenSchema = z.object({
  userId: z.string(), version: z.number().int(), applicationId: z.string().nullable(),
  expires: z.number(), exchanges: z.array(exchangeSchema).max(6),
}).strict();
export type Exchange = z.infer<typeof exchangeSchema>;
export type ConversationBinding = { userId: string; version: number; applicationId: string | null };
function signature(payload: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new ConciergeError(503, "The assistant is unavailable.");
  const key = createHmac("sha256", secret).update("traveldesk:concierge:v1").digest();
  return createHmac("sha256", key).update(payload).digest();
}
export function readConversation(token: string | undefined, binding: ConversationBinding, now = Date.now()): Exchange[] {
  if (!token) return [];
  try {
    const parts = token.split(".");
    if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[1])) throw new Error();
    const expected = signature(parts[0]), actual = Buffer.from(parts[1], "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
    const value = tokenSchema.parse(JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")));
    if (value.userId !== binding.userId || value.version !== binding.version || value.applicationId !== binding.applicationId || value.expires <= now || value.expires > now + 1800000 || JSON.stringify(value.exchanges).length > 12000 || Buffer.byteLength(JSON.stringify(value.exchanges), "utf8") > 16000) throw new Error();
    return value.exchanges;
  } catch { throw new ConciergeError(400, "This conversation has expired or changed. Clear it and try again."); }
}
export function signConversation(exchanges: Exchange[], binding: ConversationBinding, now = Date.now()) {
  const bounded = exchanges.slice(-6);
  // Unicode history must also fit inside the next request's 32 KiB byte limit.
  while (bounded.length && (JSON.stringify(bounded).length > 12000 || Buffer.byteLength(JSON.stringify(bounded), "utf8") > 16000)) bounded.shift();
  const payload = Buffer.from(JSON.stringify({ ...binding, expires: now + 1800000, exchanges: bounded })).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}

export async function boundedText(body: ReadableStream<Uint8Array> | null, limit: number, signal?: AbortSignal) {
  if (!body) throw new ConciergeError(400, "An empty request was received.");
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    signal?.throwIfAborted();
    for (;;) {
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new ConciergeError(413, "The message is too large."); }
      chunks.push(value);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } finally { signal?.removeEventListener("abort", abort); reader.releaseLock(); }
}

export function hasSensitiveData(text: string) {
  const normalized = text.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:phone|mobile|card\s*(?:number|no\.?))\s*[:=]\s*\+?[\d ()-]{8,}/i.test(normalized)) return true;
  return /\b(?:gsk_[\w-]{12,}|sk-[\w-]{16,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)\b|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b[A-Z][0-9]{7}\b|\b[A-Z]{5}[0-9]{4}[A-Z]\b|\b[2-9][0-9]{3}[ -]?[0-9]{4}[ -]?[0-9]{4}\b|\b(?:password|api[_ -]?key|session[_ -]?secret|passport\s*(?:number|no\.?))\s*[:=]\s*\S+/i.test(normalized);
}
export function safeAnswerText(text: string) {
  // Navigation is rendered exclusively through server-resolved source/link IDs.
  return !hasSensitiveData(text) && !/(?:https?:|javascript:|data:|www\.)|<\/?[a-z!]|\]\s*\(/i.test(text);
}
