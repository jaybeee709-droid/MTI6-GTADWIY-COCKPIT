/* Owner lock (v248 part 1) — the shippable gate for the whole app.
 *
 * TWO requirements, BOTH needed (owner clarification 2026-11-25):
 *   (1) the device itself is signed in to the owner's Google account,
 *       jaybeee709@gmail.com — checked against exactly that address;
 *   (2) landing on the app page requires the FRESH APP PASSWORD.
 * Not the owner's Google password. No device runs the app without both.
 *
 * Storage discipline: the unlocked flag lives in sessionStorage ONLY
 * (cleared when the tab closes). The password, its hash, and the
 * Google token are NEVER stored anywhere on the client — the password
 * is sent to the proxy for one server-side check and then dropped,
 * and the Google ID token is decoded for its email claim and dropped.
 *
 * States: LOCK_NOT_SET_UP (no hash configured server-side), LOCKED
 * (hash configured, not yet unlocked this session), UNLOCKED.
 * The client never decides "configured" on its own: appLock.status
 * on the proxy is the authority. If the gateway cannot be reached,
 * the lock FAILS CLOSED — the app stays behind the lock screen with
 * an honest "could not be checked" message, never open by default.
 */

export const OWNER_EMAIL = 'jaybeee709@gmail.com';

/** sessionStorage key for the per-tab unlocked flag. Tab-close clears it. */
const UNLOCK_SESSION_KEY = 'mti6_owner_lock_unlocked';

export type LockState = 'checking' | 'not-set-up' | 'locked' | 'unlocked';

export interface LockStatusResult {
  state: LockState;
  /** true when the server reports a lock hash is set; null when the
   *  gateway could not be reached and configured-ness is unknown. */
  configured: boolean | null;
  /** true when the gateway could not be reached at all. */
  unreachable: boolean;
}

/** The Google OAuth client ID, baked at build time from
 *  VITE_MTI6_GOOGLE_CLIENT_ID (Netlify env, redeploy to take effect).
 *  Null when it was never set — the Google step then reports
 *  "not set up yet" honestly instead of inventing a client ID. */
export function googleClientId(): string | null {
  const env = (
    import.meta as unknown as { env?: Record<string, string | undefined> }
  ).env;
  const v = env?.VITE_MTI6_GOOGLE_CLIENT_ID;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

interface GatewayEnvelope {
  ok?: boolean;
  data?: unknown;
  error?: { code?: string; message?: string };
}

async function gateway(action: string, payload: unknown): Promise<unknown> {
  if (typeof fetch !== 'function') {
    throw new Error('No fetch in this environment.');
  }
  let res: Response;
  try {
    res = await fetch('/api/mti6', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    });
  } catch {
    throw new Error('The gateway could not be reached.');
  }
  const env = (await res.json().catch(() => null)) as GatewayEnvelope | null;
  if (!env || !env.ok) {
    throw new Error(env?.error?.message ?? 'The gateway request failed.');
  }
  return env.data;
}

function sessionUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/** Ask the proxy whether a lock hash is configured, and whether this
 *  tab already unlocked this session. Never throws: an unreachable
 *  gateway resolves to LOCKED + unreachable (fail closed). */
export async function checkLockStatus(): Promise<LockStatusResult> {
  let configured: boolean;
  try {
    const data = (await gateway('appLock.status', {})) as {
      configured?: unknown;
    } | null;
    configured = data?.configured === true;
  } catch {
    return { state: 'locked', configured: null, unreachable: true };
  }
  if (!configured) {
    return { state: 'not-set-up', configured: false, unreachable: false };
  }
  return {
    state: sessionUnlocked() ? 'unlocked' : 'locked',
    configured: true,
    unreachable: false,
  };
}

/** One server-side password check. Returns true only when the proxy
 *  answers { ok: true }. The password is sent for this single check
 *  and never stored; a failed check returns false with no reason
 *  (the proxy never says which part failed). */
export async function verifyPassword(password: string): Promise<boolean> {
  if (typeof password !== 'string' || password.length === 0) return false;
  try {
    const data = (await gateway('appLock.verify', { password })) as {
      ok?: unknown;
    } | null;
    return data?.ok === true;
  } catch {
    return false;
  }
}

/** The Google step: the signed-in account's email must be exactly
 *  the owner's address. Case-insensitive compare only because Gmail
 *  addresses are case-insensitive; the value itself is exact. */
export function verifyGoogleEmail(email: string | null | undefined): boolean {
  return (
    typeof email === 'string' && email.trim().toLowerCase() === OWNER_EMAIL
  );
}

/** Mark this tab unlocked for the rest of the session. Call ONLY
 *  after BOTH the Google step and the password step have passed. */
export function markUnlocked(): void {
  try {
    sessionStorage.setItem(UNLOCK_SESSION_KEY, '1');
  } catch {
    /* storage unavailable — the tab simply stays locked */
  }
}

/** Re-lock this tab immediately (Settings > Devices "Lock now"). */
export function lockNow(): void {
  try {
    sessionStorage.removeItem(UNLOCK_SESSION_KEY);
  } catch {
    /* nothing to clear */
  }
}

/* ------------------------------------------------------------------ */
/* Google Identity Services (step 1 of the lock).                      */
/* The GIS script is loaded on demand from Google; the ID token it    */
/* returns is decoded for its email claim only and never stored.      */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (opts: {
            client_id: string;
            callback: (resp: { credential?: string }) => void;
          }) => void;
          renderButton: (
            el: HTMLElement,
            opts: { theme?: string; size?: string; width?: number },
          ) => void;
        };
      };
    };
  }
}

let gisLoadPromise: Promise<void> | null = null;

/** Load the Google Identity Services script once. Rejects when the
 *  script cannot be fetched (offline / blocked) so the UI can say
 *  so honestly instead of hanging on a missing button. */
export function loadGoogleIdentity(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('No window.'));
  }
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;
  gisLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Google sign-in could not be loaded.')),
      );
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Google sign-in could not be loaded.'));
    document.head.appendChild(s);
  });
  // A failed load must not poison later retries.
  gisLoadPromise.catch(() => {
    gisLoadPromise = null;
  });
  return gisLoadPromise;
}

/** Decode the email claim from a Google ID token (JWT). Returns null
 *  when the token is missing or malformed. The token itself is never
 *  stored — only the email it carries is compared. */
export function emailFromIdToken(credential: string | null | undefined): string | null {
  if (typeof credential !== 'string') return null;
  const parts = credential.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
    ) as { email?: unknown };
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}

/** Render the "Continue with Google" button into `el`. Calls
 *  `onEmail` with the signed-in account's email (or null when the
 *  token could not be read). The caller compares it with
 *  verifyGoogleEmail — a wrong account never passes step 1. */
export function renderGoogleButton(
  el: HTMLElement,
  onEmail: (email: string | null) => void,
): void {
  const clientId = googleClientId();
  const gis = window.google?.accounts?.id;
  if (!clientId || !gis) {
    throw new Error('Google sign-in is not set up yet.');
  }
  gis.initialize({
    client_id: clientId,
    callback: (resp) => onEmail(emailFromIdToken(resp?.credential)),
  });
  gis.renderButton(el, { theme: 'filled_black', size: 'large', width: 320 });
}
