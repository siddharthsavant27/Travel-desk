import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { appOrigin } from "@/lib/app-origin";
import { conciergeConfig } from "@/lib/concierge/config";
import { applicationContext, ownApplicationChoices } from "@/lib/concierge/context";
import { acquireTurn, releaseTurn } from "@/lib/concierge/limits";
import { answerTurn } from "@/lib/concierge/provider";
import { boundedText, chatInput, ConciergeError, hasSensitiveData, readConversation, signConversation } from "@/lib/concierge/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
function json(data: unknown, status = 200, extra: Record<string, string> = {}) { return NextResponse.json(data, { status, headers: { ...headers, ...extra } }); }

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) return json({ error: "Please sign in." }, 401);
  try { return json({ available: Boolean(conciergeConfig()), applications: await ownApplicationChoices(session.userId) }); }
  catch { return json({ error: "The assistant is temporarily unavailable." }, 503); }
}

export async function POST(req: Request) {
  const requestId = randomUUID(), started = Date.now();
  const usage = { promptTokens: 0, completionTokens: 0 };
  let acquired = false, outcome = "unavailable";
  try {
    const session = await getSessionFromRequest(req);
    if (!session) throw new ConciergeError(401, "Please sign in again.");
    const expectedOrigin = appOrigin(req.url);
    if (req.headers.get("origin") !== expectedOrigin || req.headers.get("sec-fetch-site") === "cross-site") throw new ConciergeError(403, "Request origin is not allowed.");
    if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new ConciergeError(415, "Send a JSON message.");
    if (Number(req.headers.get("content-length")) > 32768) throw new ConciergeError(413, "The message is too large.");
    const config = conciergeConfig();
    if (!config) throw new ConciergeError(503, "The assistant is not configured. You can still use the guidance links below.");
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(config.timeout)]);
    let raw;
    try { raw = JSON.parse(await boundedText(req.body, 32768, signal)); }
    catch (error) { if (error instanceof ConciergeError || signal.aborted) throw error; throw new ConciergeError(400, "Send a valid JSON message."); }
    const input = chatInput.safeParse(raw);
    if (!input.success) throw new ConciergeError(400, "Enter a message of 1–2,000 characters with valid conversation details.");
    const applicationId = input.data.applicationId ?? null;
    const binding = { userId: session.userId, version: session.sessionVersion ?? 0, applicationId };
    const history = readConversation(input.data.conversationToken, binding);
    // Count attempts before sensitive-data checks, moderation, or other provider calls.
    await acquireTurn(session.userId, requestId, config);
    acquired = true;
    if (hasSensitiveData(input.data.message)) throw new ConciergeError(422, "Please remove passport or identity numbers, passwords, and API keys before sending your question.");
    const context = await applicationContext(session.userId, applicationId);
    signal.throwIfAborted();
    const result = await answerTurn({ config, message: input.data.message, history, context, signal, usage });
    // A revoked account cannot receive an answer after a slow provider request.
    const current = await getSessionFromRequest(req);
    if (!current || (current.sessionVersion ?? 0) !== binding.version) throw new ConciergeError(401, "Please sign in again.");
    const citations = result.citations.map((source) => source.id === "case" ? { ...source, href: `/applications/${applicationId}` } : source);
    outcome = "ok";
    return json({ ...result, citations, conversationToken: signConversation([...history, { user: input.data.message, assistant: result.answer }], binding), requestId });
  } catch (error) {
    const safe = error instanceof ConciergeError ? error : new ConciergeError(503, "The assistant could not complete the request. Please try again later.");
    outcome = safe.outcome ?? String(safe.status);
    return json({ error: safe.message, requestId }, safe.status, safe.retryAfter ? { "Retry-After": String(safe.retryAfter) } : {});
  } finally {
    if (acquired) await releaseTurn(requestId).catch(() => {}); // Expiry also recovers worker crashes.
    console.info(JSON.stringify({ event: "concierge_turn", requestId, outcome, durationMs: Date.now() - started, ...usage }));
  }
}
