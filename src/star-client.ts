/* STAR client — talks to the /api/mti6 gateway's star.chat action.
 *
 * The browser never holds a provider key and never calls a provider
 * directly: the gateway authenticates server-side from the Netlify
 * environment (MTI6_STAR_API_KEY). When no key is configured, the
 * gateway answers NOT_CONFIGURED and STAR stays in demo mode — the
 * panel says so, and nothing pretends otherwise.
 */

export interface StarMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class StarError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

interface Envelope {
  ok?: boolean;
  data?: unknown;
  error?: { code?: string; message?: string };
}

async function gateway(action: string, payload: unknown): Promise<unknown> {
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
    );
  }
  return env.data;
}

/** Is a STAR provider key configured on the server, and which model? */
export async function fetchStarStatus(): Promise<{ configured: boolean; model: string | null }> {
  const data = (await gateway('gateway.status', {})) as {
    star?: { configured?: boolean; model?: string | null };
  } | null;
  return {
    configured: data?.star?.configured === true,
    model: typeof data?.star?.model === 'string' ? data.star.model : null,
  };
}

/** One chat exchange. Throws StarError with the gateway's code. */
export async function starChat(
  messages: StarMessage[],
): Promise<{ reply: string; model: string }> {
  const data = (await gateway('star.chat', { messages })) as {
    reply?: string;
    model?: string;
  } | null;
  if (!data || typeof data.reply !== 'string' || data.reply.length === 0) {
    throw new StarError('UPSTREAM_ERROR', 'The STAR provider returned an invalid response.');
  }
  return { reply: data.reply, model: typeof data.model === 'string' ? data.model : 'unknown' };
}
