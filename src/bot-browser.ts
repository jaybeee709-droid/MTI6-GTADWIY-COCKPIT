/**
 * Bot Browser — Universal Search spec Phase 3, Browser/Computer
 * Use (v245): a governed in-app browser session the bots use to
 * reach GitHub and do build work on the project repo, on the
 * development branch only.
 *
 * WHAT THIS IS — and what it is NOT:
 * - Daniel signs in once to GitHub in the app's browser. That
 *   sign-in is HIS step, done in the browser; the app never asks
 *   for or stores his GitHub password, token, or cookies. The app
 *   cannot verify a GitHub sign-in cross-origin, so SIGNED IN here
 *   means OWNER-CONFIRMED in this browser — the panel says so.
 * - Bots act ONLY on build tasks Daniel approves from the v243
 *   BUILD QUEUE. Every browser action is requested, scope-checked,
 *   and recorded in the log with what page, what action, what
 *   result, and when — including refusals.
 * - The session is scoped to github.com and this repo only.
 *   Anything else is refused and logged, never opened.
 * - The bot does NOT act inside GitHub. An approved, in-scope
 *   action opens the page in a new tab FOR THE OWNER to perform
 *   and verify — the log records OPENED_FOR_OWNER, never a claim
 *   that the bot did the work. There is no commit or push action
 *   in this session at all: every push still needs Daniel's own
 *   approval tap, exactly like Muse pushes. No auto-merge, no
 *   main/production, no force-push/reset — the scope checker
 *   refuses any main-branch page outright.
 * - A bot browser action that cannot be performed (not signed in,
 *   not approved, out of scope, no build task) is recorded as a
 *   refusal, never faked. The panel never claims a build was done
 *   when it was only prepared.
 * - Page-open only, like the rest of the team loop: a closed page
 *   runs nothing. Nothing here is live until Daniel signs in.
 */

export const BOT_BROWSER_REPO = 'jaybeee709-droid/MTI6-GTADWIY-COCKPIT';
export const BOT_BROWSER_REPO_URL = `https://github.com/${BOT_BROWSER_REPO}`;
export const BOT_BROWSER_ALLOWED_BRANCH = 'development';
export const BOT_BROWSER_SCOPE_LINE =
  'github.com · jaybeee709-droid/MTI6-GTADWIY-COCKPIT · development branch ONLY';

export const BOT_BROWSER_SESSION_KEY = 'mti6_bot_browser_v1';
export const BOT_BROWSER_LOG_KEY = 'mti6_bot_browser_log_v1';
const MAX_BROWSER_LOG = 100;

export type BotBrowserSessionState = 'NOT_SIGNED_IN' | 'SIGNED_IN';

export interface BotBrowserSession {
  state: BotBrowserSessionState;
  /** Owner-attested: set only when Daniel taps "I signed in" after
   * signing in to GitHub in the browser. The app cannot verify a
   * GitHub session cross-origin — the panel labels it as such. */
  signedInAt: string | null;
  /** Build item ids Daniel approved for browser work. */
  approvedBuildIds: string[];
}

export type BotBrowserActionResult =
  | 'OPENED_FOR_OWNER'
  | 'REFUSED_NOT_SIGNED_IN'
  | 'REFUSED_NOT_APPROVED'
  | 'REFUSED_OUT_OF_SCOPE'
  | 'REFUSED_NO_BUILD_TASK';

export interface BotBrowserAction {
  id: string;
  at: string;
  principalId: string | null;
  buildItemId: string | null;
  action: string;
  /** Path only — query strings are never recorded (they could
   * carry a token). */
  page: string;
  result: BotBrowserActionResult;
  detail: string;
}

const stamp = (): string => new Date().toISOString();
const uid = (): string =>
  `bb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const EMPTY_SESSION: BotBrowserSession = {
  state: 'NOT_SIGNED_IN',
  signedInAt: null,
  approvedBuildIds: [],
};

export function loadBotBrowserSession(): BotBrowserSession {
  try {
    const raw = localStorage.getItem(BOT_BROWSER_SESSION_KEY);
    if (!raw) return { ...EMPTY_SESSION, approvedBuildIds: [] };
    const parsed = JSON.parse(raw) as Partial<BotBrowserSession>;
    return {
      state: parsed.state === 'SIGNED_IN' ? 'SIGNED_IN' : 'NOT_SIGNED_IN',
      signedInAt: typeof parsed.signedInAt === 'string' ? parsed.signedInAt : null,
      approvedBuildIds: Array.isArray(parsed.approvedBuildIds)
        ? parsed.approvedBuildIds.filter((x): x is string => typeof x === 'string')
        : [],
    };
  } catch {
    return { ...EMPTY_SESSION, approvedBuildIds: [] };
  }
}

export function saveBotBrowserSession(session: BotBrowserSession): BotBrowserSession {
  try {
    localStorage.setItem(BOT_BROWSER_SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable — the session stays in memory this run */
  }
  return session;
}

/** Daniel confirms, after signing in to GitHub in the browser,
 * that the session is signed in. Owner-attested — the app cannot
 * verify it, and the panel labels it as such. */
export function markBotBrowserSignedIn(): BotBrowserSession {
  const s = loadBotBrowserSession();
  return saveBotBrowserSession({ ...s, state: 'SIGNED_IN', signedInAt: stamp() });
}

export function endBotBrowserSession(): BotBrowserSession {
  const s = loadBotBrowserSession();
  return saveBotBrowserSession({ ...s, state: 'NOT_SIGNED_IN', signedInAt: null });
}

export function approveBuildForBrowser(buildItemId: string): BotBrowserSession {
  const s = loadBotBrowserSession();
  if (s.approvedBuildIds.includes(buildItemId)) return s;
  return saveBotBrowserSession({
    ...s,
    approvedBuildIds: [...s.approvedBuildIds, buildItemId],
  });
}

export function revokeBuildForBrowser(buildItemId: string): BotBrowserSession {
  const s = loadBotBrowserSession();
  return saveBotBrowserSession({
    ...s,
    approvedBuildIds: s.approvedBuildIds.filter((id) => id !== buildItemId),
  });
}

export function loadBrowserLog(): BotBrowserAction[] {
  try {
    const raw = localStorage.getItem(BOT_BROWSER_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is BotBrowserAction =>
        !!a && typeof a === 'object' && typeof a.id === 'string' && typeof a.result === 'string',
    );
  } catch {
    return [];
  }
}

export function recordBrowserAction(
  entry: Omit<BotBrowserAction, 'id' | 'at'>,
): BotBrowserAction[] {
  const rec: BotBrowserAction = { ...entry, id: uid(), at: stamp() };
  const next = [rec, ...loadBrowserLog()].slice(0, MAX_BROWSER_LOG);
  try {
    localStorage.setItem(BOT_BROWSER_LOG_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — the log stays in memory this run */
  }
  return next;
}

/* --- Scope: github.com, this repo, development branch only. ---
 * Any branch segment that is not "development" refuses the page —
 * main included. Any other host, any other repo, any settings /
 * actions / admin page refuses. Query strings are stripped before
 * anything is recorded. */
const REPO_PATH = `/${BOT_BROWSER_REPO}`;
const ALLOWED_PATHS: { prefix: string; label: string; exactOnly?: boolean }[] = [
  { prefix: REPO_PATH, label: 'repo root', exactOnly: true },
  { prefix: `${REPO_PATH}/tree/development`, label: 'code tree at development' },
  { prefix: `${REPO_PATH}/blob/development`, label: 'file at development' },
  { prefix: `${REPO_PATH}/commits/development`, label: 'commits on development' },
  { prefix: `${REPO_PATH}/pulls`, label: 'pull requests' },
  { prefix: `${REPO_PATH}/issues`, label: 'issues' },
  { prefix: `${REPO_PATH}/compare/development...development`, label: 'compare within development' },
];

export function checkBrowserUrl(rawUrl: string): { ok: boolean; page: string; reason: string } {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { ok: false, page: rawUrl.trim().slice(0, 120), reason: 'Not a valid URL.' };
  }
  const page = url.pathname.slice(0, 200) || '/';
  if (url.protocol !== 'https:') {
    return { ok: false, page, reason: 'Only https pages are in scope.' };
  }
  if (url.hostname !== 'github.com') {
    return { ok: false, page, reason: `Host ${url.hostname} is outside the scope (github.com only).` };
  }
  const path = url.pathname.replace(/\/+$/, '') || '/';
  // Branch guard: any /tree/<branch>, /blob/<branch>,
  // /commits/<branch> or /compare/<a>...<b> segment that is not
  // "development" refuses the page — main included.
  const segments = path.split('/').filter(Boolean);
  const branchIdx = segments.findIndex((s) => ['tree', 'blob', 'commits'].includes(s));
  if (branchIdx >= 0) {
    const branch = segments[branchIdx + 1] ?? '';
    if (branch !== BOT_BROWSER_ALLOWED_BRANCH) {
      return {
        ok: false,
        page,
        reason: `Branch "${branch || '(none)'}" is outside the scope — development only. No main, no production.`,
      };
    }
  }
  const compareIdx = segments.findIndex((s) => s === 'compare');
  if (compareIdx >= 0) {
    const range = segments[compareIdx + 1] ?? '';
    if (range !== 'development...development') {
      return {
        ok: false,
        page,
        reason: 'Compare range is outside the scope — development...development only.',
      };
    }
  }
  const allowed = ALLOWED_PATHS.some((a) =>
    a.exactOnly ? path === a.prefix : path === a.prefix || path.startsWith(`${a.prefix}/`),
  );
  if (!allowed) {
    return {
      ok: false,
      page,
      reason: 'Page is outside the allowed scope (repo root, code at development, commits on development, pull requests, issues, compare within development).',
    };
  }
  return { ok: true, page, reason: 'In scope.' };
}

export interface BrowserActionRequest {
  principalId: string | null;
  buildItemId: string | null;
  action: string;
  url: string;
}

export interface BrowserActionVerdict {
  result: BotBrowserActionResult;
  page: string;
  detail: string;
  /** Only set when the caller should open the page in a new tab
   * for the owner to perform and verify. */
  openUrl: string | null;
}

/* Decide a bot browser action and record it. The decision order
 * is the governance order: a build task must exist, the owner
 * must have approved it for browser work, the session must be
 * signed in, and the page must be in scope. A refusal records
 * exactly why — never a fake success. */
export function requestBrowserAction(req: BrowserActionRequest): BrowserActionVerdict {
  const session = loadBotBrowserSession();
  const scope = checkBrowserUrl(req.url);
  const base = {
    principalId: req.principalId,
    buildItemId: req.buildItemId,
    action: req.action,
    page: scope.page,
  };
  if (!req.buildItemId) {
    const detail = 'No build task — a browser action needs an approved build item from the Build Queue.';
    recordBrowserAction({ ...base, result: 'REFUSED_NO_BUILD_TASK', detail });
    return { result: 'REFUSED_NO_BUILD_TASK', page: scope.page, detail, openUrl: null };
  }
  if (!session.approvedBuildIds.includes(req.buildItemId)) {
    const detail = 'Build item is not approved for browser work — Daniel approves it in the Bot Browser panel first.';
    recordBrowserAction({ ...base, result: 'REFUSED_NOT_APPROVED', detail });
    return { result: 'REFUSED_NOT_APPROVED', page: scope.page, detail, openUrl: null };
  }
  if (session.state !== 'SIGNED_IN') {
    const detail = 'Session is NOT SIGNED IN — Daniel signs in to GitHub in the browser first.';
    recordBrowserAction({ ...base, result: 'REFUSED_NOT_SIGNED_IN', detail });
    return { result: 'REFUSED_NOT_SIGNED_IN', page: scope.page, detail, openUrl: null };
  }
  if (!scope.ok) {
    const detail = `Out of scope — ${scope.reason}`;
    recordBrowserAction({ ...base, result: 'REFUSED_OUT_OF_SCOPE', detail });
    return { result: 'REFUSED_OUT_OF_SCOPE', page: scope.page, detail, openUrl: null };
  }
  const detail =
    'Opened in a new tab FOR THE OWNER to perform and verify. The bot does not act inside GitHub — it requested the page; Daniel does the step.';
  recordBrowserAction({ ...base, result: 'OPENED_FOR_OWNER', detail });
  return { result: 'OPENED_FOR_OWNER', page: scope.page, detail, openUrl: req.url.trim() };
}

export function botBrowserSummary(): {
  state: BotBrowserSessionState;
  signedInAt: string | null;
  approved: number;
  logCount: number;
  refused: number;
  opened: number;
} {
  const s = loadBotBrowserSession();
  const log = loadBrowserLog();
  return {
    state: s.state,
    signedInAt: s.signedInAt,
    approved: s.approvedBuildIds.length,
    logCount: log.length,
    refused: log.filter((a) => a.result.startsWith('REFUSED')).length,
    opened: log.filter((a) => a.result === 'OPENED_FOR_OWNER').length,
  };
}

export function botBrowserSummaryText(): string {
  const s = botBrowserSummary();
  const state =
    s.state === 'SIGNED_IN'
      ? `SIGNED IN — owner-confirmed in this browser${s.signedInAt ? ` since ${new Date(s.signedInAt).toLocaleString()}` : ''} (the app cannot verify a GitHub sign-in itself; no password, token, or cookie is ever stored)`
      : 'NOT SIGNED IN — Daniel has not signed in to GitHub in the app yet, so no bot browser action can run';
  return `From the platform's own records: the Bot Browser session is ${state}. Scope: ${BOT_BROWSER_SCOPE_LINE}. ${s.approved} build item(s) approved for browser work. The log holds ${s.logCount} action(s): ${s.opened} opened for the owner, ${s.refused} refused (not signed in, not approved, or out of scope). The bot never acts inside GitHub — an approved in-scope page opens in a new tab for Daniel to perform and verify. There is no commit or push action in the session; every push still needs his own approval tap.`;
}
