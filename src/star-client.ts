/* STAR client — talks to the /api/mti6 gateway's star.chat action.
 *
 * The browser never holds a provider key and never calls a provider
 * directly: the gateway authenticates server-side from the Netlify
 * environment (MTI6_STAR_API_KEY). When no key is configured, the
 * gateway answers NOT_CONFIGURED and STAR stays in demo mode — the
 * panel says so, and nothing pretends otherwise.
 */

import { recordLesson } from './bot-lessons';

export interface StarMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class StarError extends Error {
  code: string;
  // v242: the upstream HTTP status when the gateway reports one
  // (a number only — never a body). Lets the panel tell a dead
  // model (404) from a rate limit or an outage.
  upstreamStatus: number | null;
  constructor(code: string, message: string, upstreamStatus?: number | null) {
    super(message);
    this.code = code;
    this.upstreamStatus = typeof upstreamStatus === 'number' ? upstreamStatus : null;
  }
}

interface Envelope {
  ok?: boolean;
  data?: unknown;
  error?: { code?: string; message?: string; upstreamStatus?: number };
}

/** Generic gateway POST for other keyed proxy actions (P9: the
 * crypto.* CoinGecko actions). One POST, no retry loop. Throws
 * StarError with the gateway's code — including AUTH_REQUIRED when
 * no key is configured on the server. */
export async function gatewayPost(action: string, payload: unknown): Promise<unknown> {
  if (typeof fetch !== 'function') {
    throw new StarError('UNREACHABLE', 'No fetch in this environment.');
  }
  let res: Response;
  try {
    res = await fetch('/api/mti6', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    });
  } catch {
    throw new StarError('UNREACHABLE', 'The gateway could not be reached.');
  }
  const env = (await res.json().catch(() => null)) as Envelope | null;
  if (!env || !env.ok) {
    throw new StarError(
      env?.error?.code ?? 'UPSTREAM_ERROR',
      env?.error?.message ?? 'The gateway request failed.',
      env?.error?.upstreamStatus ?? null,
    );
  }
  return env.data;
}

/** Is a STAR provider key configured on the server, and which model? */
export async function fetchStarStatus(): Promise<{ configured: boolean; model: string | null }> {
  const data = (await gatewayPost('gateway.status', {})) as {
    star?: { configured?: boolean; model?: string | null };
  } | null;
  return {
    configured: data?.star?.configured === true,
    model: typeof data?.star?.model === 'string' ? data.star.model : null,
  };
}

/** One chat exchange. Throws StarError with the gateway's code.
 *
 * v247 — response time, measured not invented: the round-trip
 * is timed here (performance.now, Date.now fallback) and the
 * provider that answered is read from the proxy's `provider`
 * field (openrouter | anthropic | gemini — the fallback chain
 * order is unchanged: OpenRouter first, then Claude, then
 * Gemini). The measured { provider, ms } are returned with the
 * live provider}) ·{' '}
 * reply and stored as the last live reply for the Bot
 * Intelligence panel. When the reply came from the local brain
 * instead, the caller records it with recordLocalReply() —
 * provider 'local' and the measured (near-zero) ms.
 * On any star.chat provider failure the instant lesson is
 * recorded synchronously (recordStarFailureLesson) before the
 * error propagates — ACTIVE for the very next call. */
export type StarProvider = 'openrouter' | 'anthropic' | 'gemini' | 'local' | 'unknown';

export interface StarChatResult {
  reply: string;
  model: string;
  /** The provider that actually answered (proxy's provider field). */
  provider: StarProvider;
  /** Measured round-trip time in whole milliseconds. */
  ms: number;
}

export interface LastStarReply {
  provider: StarProvider;
  model: string;
  ms: number;
  at: string;
}

export const LAST_STAR_REPLY_KEY = 'mti6_star_last_reply_v1';

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function saveLastStarReply(entry: LastStarReply): void {
  try {
    localStorage.setItem(LAST_STAR_REPLY_KEY, JSON.stringify(entry));
  } catch {
    /* storage blocked — the reply still returns to the caller */
  }
}

/** The last measured STAR reply (live provider or local brain),
 * or null when STAR has not answered yet this browser. */
export function getLastStarReply(): LastStarReply | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LAST_STAR_REPLY_KEY) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return null;
    const r = parsed as LastStarReply;
    if (typeof r.ms !== 'number' || typeof r.provider !== 'string' || typeof r.at !== 'string') return null;
    return r;
  } catch {
    return null;
  }
}

/** Record a local-brain reply with its measured time. The local
 * brain is synchronous, so the caller times answerLocally()
 * itself and passes the measured ms — near-zero, never invented. */
export function recordLocalReply(ms: number): LastStarReply {
  const entry: LastStarReply = {
    provider: 'local',
    model: 'local brain',
    ms: Math.max(0, Math.round(ms)),
    at: new Date().toISOString(),
  };
  saveLastStarReply(entry);
  return entry;
}

/* Instant lessons on bad calls (v247, owner direction #9): the
 * moment a star.chat provider failure is detected, its lesson
 * is recorded AT ONCE via recordLesson() — a synchronous
 * localStorage write, so the lesson is ACTIVE for the very
 * next action. The next STAR call consults active lessons
 * first (wired into the local brain/context by the coordinator).
 *
 * What the lesson records: the error code + upstream status +
 * measured ms + time, and the fix (fall to the next provider
 * in the chain — the proxy fallback already does this; the
 * lesson records that it happened). The duplicate-guard in
 * recordLesson applies: the same failure twice stays one
 * lesson (title is deterministic per code + upstream status).
 *
 * Honest limit: on an all-provider failure the proxy reports
 * only the LAST provider's upstream status, never a provider
 * name — so the lesson names the chain (OpenRouter → Claude →
 * Gemini, all tried in order), not one provider. Two codes
 * are NOT provider failures and record no lesson:
 * NOT_CONFIGURED (no key configured — no provider was
 * attempted, so "fall to the next provider" would be wrong)
 * and INVALID_REQUEST (a client-side payload bug). */
const NO_LESSON_CODES = new Set(['NOT_CONFIGURED', 'INVALID_REQUEST']);

function recordStarFailureLesson(
  code: string,
  upstreamStatus: number | null,
  ms: number,
): void {
  if (NO_LESSON_CODES.has(code)) return;
  try {
    const statusPart = typeof upstreamStatus === 'number' ? ` (upstream ${upstreamStatus})` : '';
    recordLesson({
      title: `STAR provider failure: ${code}${statusPart}`,
      whatWentWrong:
        `A star.chat provider call failed with ${code}${statusPart} after ${ms} ms. ` +
        'The proxy tries the chain in order — OpenRouter, then Claude, then Gemini — and reports only the last ' +
        'provider\u2019s upstream status on an all-provider failure, so the failing provider is the chain, not one name.',
      fix:
        'Fall to the next provider in the chain (OpenRouter → Claude → Gemini). The proxy fallback already does ' +
        'this on every provider failure; the lesson records that it happened so the next STAR call consults it ' +
        'before acting instead of repeating the same failed call. If the same code recurs, try another verified ' +
        'free model (a 429 on a free model is model-specific until proven otherwise).',
      source: `star-client star.chat — ${new Date().toISOString()}`,
      changedWhat:
        'The failure is now an ACTIVE lesson: the next STAR call consults active lessons first, and the failure ' +
        'is no longer silent.',
    });
  } catch {
    /* Lesson recording never breaks the reply path — the
     * original StarError still reaches the caller, which
     * falls back to the local brain. */
  }
}

export async function starChat(
  messages: StarMessage[],
): Promise<StarChatResult> {
  const started = nowMs();
  let data: { reply?: string; model?: string; provider?: string } | null;
  try {
    data = (await gatewayPost('star.chat', { messages })) as {
      reply?: string;
      model?: string;
      provider?: string;
    } | null;
  } catch (err) {
    // Any star.chat provider failure (UPSTREAM_ERROR,
    // RATE_LIMITED, network failure) records its instant
    // lesson synchronously, then the error still propagates
    // so the caller falls back to the local brain.
    const ms = Math.max(0, Math.round(nowMs() - started));
    if (err instanceof StarError) {
      recordStarFailureLesson(err.code, err.upstreamStatus, ms);
    } else {
      recordStarFailureLesson('UPSTREAM_ERROR', null, ms);
    }
    throw err;
  }
  const ms = Math.max(0, Math.round(nowMs() - started));
  if (!data || typeof data.reply !== 'string' || data.reply.length === 0) {
    recordStarFailureLesson('UPSTREAM_ERROR', null, ms);
    throw new StarError('UPSTREAM_ERROR', 'The STAR provider returned an invalid response.');
  }
  const provider: StarProvider =
    data.provider === 'openrouter' || data.provider === 'anthropic' || data.provider === 'gemini'
      ? data.provider
      : 'unknown';
  const model = typeof data.model === 'string' ? data.model : 'unknown';
  saveLastStarReply({ provider, model, ms, at: new Date().toISOString() });
  return { reply: data.reply, model, provider, ms };
}
