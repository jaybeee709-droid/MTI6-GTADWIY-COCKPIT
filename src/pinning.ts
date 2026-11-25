/**
 * Pinned panels — the GENERAL pinning system (v247 part 5, owner
 * refinement 2026-11-25 ~6:20 PM).
 *
 * Pinning is NOT Netlify-only. EVERY screen/panel that pops out in the
 * app can be pinned, and pinned ANYWHERE on the screen — free placement:
 * the owner drags a pinned panel where he wants it. The Netlify screen
 * is the FIRST pinned screen, not the only one. No panel id is
 * hardcoded here (and none may be added here): callers pin with any
 * stable string id, e.g. the coordinator wires `panelId="netlify"`.
 *
 * Storage: localStorage key `mti6_pinned_panels_v1`, cap 50 records.
 * Nothing is pinned by default — the owner pins explicitly.
 * Positions are viewport px, clamped so a panel can never be dragged
 * fully off-screen (at least its title bar stays reachable).
 *
 * MULTI-MONITOR (owner refinement #2, 2026-11-25): a pinned/pop-out
 * panel can also be opened as a SEPARATE WINDOW on a chosen monitor,
 * via the browser Window Management API (`window.getScreenDetails()`).
 *
 * `?panel=` URL CONTRACT (the coordinator wires App.tsx to honour it):
 * opening `<app-origin><app-path>?panel=<panelId>` renders JUST that
 * panel alone — e.g. `?panel=netlify` renders the Netlify panel alone,
 * with no globe, drawer, or other screens. The panel id in the URL is
 * the same stable `panelId` used by `PinnablePanel` / the pin store.
 * `openPanelOnScreen()` builds exactly this URL and opens it in a new
 * window positioned on the chosen screen. A panel opened this way
 * keeps its pinned state: it is still the same pinned panel, reopened
 * at its placed position; the store record is only annotated with
 * `screenLabel` / `detachedAt` (which screen it was last opened on).
 *
 * Honesty rules: if the Window Management API is unsupported, or the
 * user denies the permission, we NEVER claim the panel was placed on
 * a monitor. `getScreens()` returns null + a reason, the UI shows the
 * honest note, and the fallback is a plain separate window the owner
 * drags to the other monitor manually.
 */

export const PINNED_PANELS_KEY = 'mti6_pinned_panels_v1';
export const MAX_PINNED_PANELS = 50;

/** Default floating-window size (px) for a newly pinned panel. */
export const DEFAULT_PANEL_WIDTH = 360;
export const DEFAULT_PANEL_HEIGHT = 420;

/** Minimum px of a panel that must stay visible, so it stays grabbable. */
export const MIN_VISIBLE_X = 80;
export const MIN_VISIBLE_Y = 40;

export interface PinnedPanel {
  /** Stable string id, e.g. 'netlify'. Chosen by the caller. */
  id: string;
  /** Display title shown in the title bar / pinned list. */
  title: string;
  /** Viewport px, clamped (see clampPosition). */
  x: number;
  y: number;
  width?: number;
  height?: number;
  /** False = closed but still pinned; reopen restores the position. */
  open: boolean;
  /** Label of the screen this panel was last opened on, if any. */
  screenLabel?: string;
  /** ISO timestamp of the last separate-window open, if any. */
  detachedAt?: string;
}

/** Input for pinning a panel. Position is optional (cascaded default). */
export interface PinPanelInput {
  id: string;
  title: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

type PinnedListener = () => void;
const listeners = new Set<PinnedListener>();

function notify(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* a listener must never break the store */
    }
  }
}

/** Subscribe to pin-store changes. Returns an unsubscribe function. */
export function subscribePinned(fn: PinnedListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function isRecord(value: unknown): value is PinnedPanel {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.id === 'string' &&
    rec.id.length > 0 &&
    typeof rec.title === 'string' &&
    typeof rec.x === 'number' &&
    Number.isFinite(rec.x) &&
    typeof rec.y === 'number' &&
    Number.isFinite(rec.y) &&
    typeof rec.open === 'boolean'
  );
}

function sanitize(rec: PinnedPanel): PinnedPanel {
  const clean: PinnedPanel = {
    id: rec.id,
    title: rec.title,
    x: rec.x,
    y: rec.y,
    open: rec.open,
  };
  if (typeof rec.width === 'number' && Number.isFinite(rec.width) && rec.width > 0) {
    clean.width = rec.width;
  }
  if (typeof rec.height === 'number' && Number.isFinite(rec.height) && rec.height > 0) {
    clean.height = rec.height;
  }
  if (typeof rec.screenLabel === 'string' && rec.screenLabel.length > 0) {
    clean.screenLabel = rec.screenLabel;
  }
  if (typeof rec.detachedAt === 'string' && rec.detachedAt.length > 0) {
    clean.detachedAt = rec.detachedAt;
  }
  const pos = clampPosition(clean.x, clean.y, clean.width, clean.height);
  clean.x = pos.x;
  clean.y = pos.y;
  return clean;
}

export function loadPinned(): PinnedPanel[] {
  try {
    const raw = localStorage.getItem(PINNED_PANELS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: PinnedPanel[] = [];
    for (const item of parsed) {
      if (!isRecord(item)) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(sanitize(item));
    }
    return out.slice(0, MAX_PINNED_PANELS);
  } catch {
    return [];
  }
}

function savePinned(panels: PinnedPanel[]): void {
  try {
    localStorage.setItem(PINNED_PANELS_KEY, JSON.stringify(panels));
  } catch {
    /* storage full / unavailable — pin state stays in memory only */
  }
  notify();
}

// ---------------------------------------------------------------------------
// Clamping + default placement
// ---------------------------------------------------------------------------

export function clampPosition(
  x: number,
  y: number,
  width?: number,
  height?: number,
): { x: number; y: number } {
  if (typeof window === 'undefined') return { x, y };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(width ?? DEFAULT_PANEL_WIDTH, vw);
  void height;
  const minX = -(w - MIN_VISIBLE_X);
  const maxX = vw - MIN_VISIBLE_X;
  const minY = 0;
  const maxY = Math.max(0, vh - MIN_VISIBLE_Y);
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
  };
}

/**
 * Cascaded default position for a newly pinned panel, so several pins
 * do not stack exactly on top of each other. `index` is the current
 * pinned count.
 */
export function nextDefaultPosition(index: number): { x: number; y: number } {
  const step = 40;
  const baseX = 80 + (index % 8) * step;
  const baseY = 72 + (index % 8) * step;
  return clampPosition(baseX, baseY);
}

// ---------------------------------------------------------------------------
// Mutations — every change persists immediately.
// ---------------------------------------------------------------------------

/**
 * Pin a panel (or re-pin an existing one: title refreshes, position is
 * kept, and it reopens). New panels open at the given position or a
 * cascaded default. At the 50-panel cap the OLDEST pinned panel is
 * evicted to make room — pinning never silently fails.
 */
export function pinPanel(input: PinPanelInput): PinnedPanel[] {
  if (!input.id || typeof input.id !== 'string') return loadPinned();
  const panels = loadPinned();
  const existing = panels.find((p) => p.id === input.id);
  if (existing) {
    existing.title = input.title;
    existing.open = true;
    if (typeof input.width === 'number') existing.width = input.width;
    if (typeof input.height === 'number') existing.height = input.height;
    savePinned(panels);
    return panels;
  }
  const pos =
    typeof input.x === 'number' && typeof input.y === 'number'
      ? clampPosition(input.x, input.y, input.width, input.height)
      : nextDefaultPosition(panels.length);
  const record: PinnedPanel = {
    id: input.id,
    title: input.title,
    x: pos.x,
    y: pos.y,
    open: true,
  };
  if (typeof input.width === 'number') record.width = input.width;
  if (typeof input.height === 'number') record.height = input.height;
  const next = [...panels, record];
  while (next.length > MAX_PINNED_PANELS) next.shift();
  savePinned(next);
  return next;
}

export function unpinPanel(id: string): PinnedPanel[] {
  const next = loadPinned().filter((p) => p.id !== id);
  savePinned(next);
  return next;
}

export function movePanel(id: string, x: number, y: number): PinnedPanel[] {
  const panels = loadPinned();
  const panel = panels.find((p) => p.id === id);
  if (!panel) return panels;
  const pos = clampPosition(x, y, panel.width, panel.height);
  panel.x = pos.x;
  panel.y = pos.y;
  savePinned(panels);
  return panels;
}

export function setPanelOpen(id: string, open: boolean): PinnedPanel[] {
  const panels = loadPinned();
  const panel = panels.find((p) => p.id === id);
  if (!panel) return panels;
  panel.open = open;
  savePinned(panels);
  return panels;
}

/** Rename a pinned panel (title refresh when the source screen retitles). */
export function setPanelTitle(id: string, title: string): PinnedPanel[] {
  const panels = loadPinned();
  const panel = panels.find((p) => p.id === id);
  if (!panel) return panels;
  panel.title = title;
  savePinned(panels);
  return panels;
}

export function isPinned(id: string): boolean {
  return loadPinned().some((p) => p.id === id);
}

export function getPinned(id: string): PinnedPanel | undefined {
  return loadPinned().find((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// Multi-monitor — Window Management API + `?panel=` separate windows
// ---------------------------------------------------------------------------

/**
 * Minimal typing for the Window Management API
 * (`window.getScreenDetails()`), which is not in this project's DOM lib.
 * Only the fields MTI6 uses are typed.
 */
export interface ScreenDetailedLike {
  label: string;
  isPrimary: boolean;
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
  width: number;
  height: number;
}

interface ScreenDetailsLike {
  screens: ScreenDetailedLike[];
  currentScreen: ScreenDetailedLike;
}

declare global {
  interface Window {
    getScreenDetails?: () => Promise<ScreenDetailsLike>;
  }
}

/** One display, as shown in the screen picker. */
export interface ScreenInfo extends ScreenDetailedLike {
  /** True for the screen this window is currently on. */
  isCurrent: boolean;
}

export type ScreenListReason = 'unsupported' | 'denied' | 'error';

export interface ScreenListResult {
  /** Null when the list could not be obtained — see `reason`. */
  screens: ScreenInfo[] | null;
  reason: ScreenListReason | null;
  /** Human-readable explanation, safe to show in the UI. */
  message: string;
}

export const MULTI_MONITOR_UNSUPPORTED_MESSAGE =
  'Multi-monitor placement is not supported in this browser — drag the window to the other monitor manually.';

export const MONITOR_NOT_DETECTED_MESSAGE =
  'Monitor not detected — check display settings / HDMI connection; this is a display-settings matter, not the app.';

/**
 * Label for one detected screen in the picker (refinement #4: the
 * owner may have SEVERAL monitors, so every entry must be
 * distinguishable). Uses whatever the API actually returns: the
 * screen's number in the detected list, its Primary flag, its API
 * label when present, its resolution, and its position in the
 * virtual desktop — e.g. "Screen 2 — 1920×1080 at (1920, 0)" or
 * "Screen 1 — Primary — Internal Display — 1920×1080 at (0, 0)".
 * `index` is the screen's position in the `getScreenDetails()`
 * list (0-based). The picker appends "· This screen" for the
 * screen the app window is currently on.
 */
export function formatScreenLabel(screen: ScreenInfo, index: number): string {
  const parts: string[] = [`Screen ${index + 1}`];
  if (screen.isPrimary) parts.push('Primary');
  if (screen.label && screen.label !== 'Display') parts.push(screen.label);
  parts.push(`${screen.width}×${screen.height} at (${screen.availLeft}, ${screen.availTop})`);
  return parts.join(' — ');
}

function sameScreen(a: ScreenDetailedLike, b: ScreenDetailedLike): boolean {
  return (
    a.availLeft === b.availLeft &&
    a.availTop === b.availTop &&
    a.width === b.width &&
    a.height === b.height
  );
}

/**
 * List the available screens via the Window Management API. The call
 * may prompt the user for permission. Returns the screen list, or
 * null + a reason — never a fabricated list:
 * - 'unsupported': this browser has no `window.getScreenDetails()`.
 * - 'denied': the user (or browser policy) refused the permission.
 * - 'error': the call failed for another reason.
 */
export async function getScreens(): Promise<ScreenListResult> {
  if (typeof window === 'undefined' || typeof window.getScreenDetails !== 'function') {
    return {
      screens: null,
      reason: 'unsupported',
      message: MULTI_MONITOR_UNSUPPORTED_MESSAGE,
    };
  }
  try {
    const details = await window.getScreenDetails();
    const screens: ScreenInfo[] = details.screens.map((s) => ({
      label: s.label || 'Display',
      isPrimary: s.isPrimary,
      availLeft: s.availLeft,
      availTop: s.availTop,
      availWidth: s.availWidth,
      availHeight: s.availHeight,
      width: s.width,
      height: s.height,
      isCurrent: sameScreen(s, details.currentScreen),
    }));
    return { screens, reason: null, message: '' };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return {
        screens: null,
        reason: 'denied',
        message:
          'Multi-monitor placement was not allowed — permission was denied. Drag the window to the other monitor manually.',
      };
    }
    return {
      screens: null,
      reason: 'error',
      message:
        'Could not list screens — drag the window to the other monitor manually.',
    };
  }
}

/**
 * The `?panel=` URL for a panel: the app origin + path with
 * `?panel=<panelId>`. App.tsx renders just that panel for this URL
 * (coordinator wiring). Existing query params are preserved.
 */
export function panelUrl(panelId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('panel', panelId);
  return url.toString();
}

// ---------------------------------------------------------------------------
// CAST — which screen a panel is currently cast to (refinement #3)
// ---------------------------------------------------------------------------

/**
 * CAST (owner refinement #3, 2026-11-25): each panel gets a CAST
 * button that sends its content to an ACTIVE screen — an external
 * display, e.g. a TV or monitor connected via HDMI (the OS sees it
 * as a second monitor). Same mechanism as multi-monitor open: the new
 * window loads the `?panel=` URL, positioned on the chosen screen
 * via `window.open()` with that screen's availLeft/availTop/
 * availWidth/availHeight.
 *
 * Cast state is persisted SEPARATELY from the pin record, in
 * localStorage key `mti6_cast_panels_v1`, so ANY panel can be cast —
 * pinned or not — and the cast target survives a reload. The pin
 * record is never changed by casting.
 *
 * Honesty: a cast is only "active" while the separate window we
 * opened is still open (tracked in-memory). After a reload the
 * window handle is gone, so a persisted cast shows as LAST CAST
 * (stale — tap Cast to reopen), never as an active cast. If the
 * Window Management API is unsupported or permission is denied, the
 * manual fallback opens a plain window and records NO cast — we
 * cannot know which screen it ended up on, so we never claim it.
 */

export const CAST_PANELS_KEY = 'mti6_cast_panels_v1';
export const MAX_CAST_PANELS = 50;

/** Persisted snapshot of the screen a panel is cast to. */
export interface CastScreen {
  label: string;
  isPrimary: boolean;
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
  /**
   * Human-readable description as shown in the picker at cast time,
   * e.g. "Screen 2 — 1920×1080 at (1920, 0)". The screen list order
   * can change between sessions, so the description is snapshotted
   * here rather than recomputed.
   */
  description?: string;
}

export interface CastRecord {
  panelId: string;
  title: string;
  screen: CastScreen;
  /** ISO timestamp of when the cast was made. */
  castAt: string;
}

type CastListener = () => void;
const castListeners = new Set<CastListener>();

function notifyCast(): void {
  for (const fn of castListeners) {
    try {
      fn();
    } catch {
      /* a listener must never break the store */
    }
  }
}

/** Subscribe to cast-map changes. Returns an unsubscribe function. */
export function subscribeCast(fn: CastListener): () => void {
  castListeners.add(fn);
  return () => {
    castListeners.delete(fn);
  };
}

function isCastRecord(value: unknown): value is CastRecord {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  const screen = rec.screen as Record<string, unknown> | undefined;
  return (
    typeof rec.panelId === 'string' &&
    rec.panelId.length > 0 &&
    typeof rec.title === 'string' &&
    !!screen &&
    typeof screen === 'object' &&
    typeof screen.label === 'string' &&
    typeof screen.isPrimary === 'boolean' &&
    typeof screen.availLeft === 'number' &&
    Number.isFinite(screen.availLeft) &&
    typeof screen.availTop === 'number' &&
    Number.isFinite(screen.availTop) &&
    typeof screen.availWidth === 'number' &&
    Number.isFinite(screen.availWidth) &&
    typeof screen.availHeight === 'number' &&
    Number.isFinite(screen.availHeight) &&
    typeof rec.castAt === 'string'
  );
}

export function loadCastMap(): CastRecord[] {
  try {
    const raw = localStorage.getItem(CAST_PANELS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: CastRecord[] = [];
    for (const item of parsed) {
      if (!isCastRecord(item)) continue;
      if (seen.has(item.panelId)) continue;
      seen.add(item.panelId);
      out.push(item);
    }
    return out.slice(0, MAX_CAST_PANELS);
  } catch {
    return [];
  }
}

function saveCastMap(records: CastRecord[]): void {
  try {
    localStorage.setItem(CAST_PANELS_KEY, JSON.stringify(records));
  } catch {
    /* storage full / unavailable — cast state stays in memory only */
  }
  notifyCast();
}

/** The persisted cast record for a panel, if one exists. */
export function getCast(panelId: string): CastRecord | undefined {
  return loadCastMap().find((r) => r.panelId === panelId);
}

/** True when a cast record exists for the panel (active or stale). */
export function isCast(panelId: string): boolean {
  return getCast(panelId) !== undefined;
}

/**
 * Cast status for a panel:
 * - active: a cast record exists AND the separate window we opened
 *   is still open (tracked in-memory).
 * - stale: a record exists but the window is gone / untracked (e.g.
 *   after a reload, or the owner closed the window by hand). The
 *   record is kept so the owner can re-cast to the same screen with
 *   one tap — it is shown as LAST CAST, never as an active cast.
 * - none: never cast (or cast cleared).
 */
export function getCastStatus(panelId: string): {
  status: 'active' | 'stale' | 'none';
  record: CastRecord | undefined;
} {
  const record = getCast(panelId);
  if (!record) return { status: 'none', record: undefined };
  const win = detachedWindows.get(panelId);
  const active = !!win && !win.closed;
  return { status: active ? 'active' : 'stale', record };
}

export function setCast(
  panelId: string,
  title: string,
  screen: ScreenInfo,
  description?: string,
): CastRecord[] {
  if (!panelId) return loadCastMap();
  const records = loadCastMap();
  const record: CastRecord = {
    panelId,
    title,
    screen: {
      label: screen.label,
      isPrimary: screen.isPrimary,
      availLeft: screen.availLeft,
      availTop: screen.availTop,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      description,
    },
    castAt: new Date().toISOString(),
  };
  const existing = records.findIndex((r) => r.panelId === panelId);
  if (existing >= 0) {
    records[existing] = record;
  } else {
    records.push(record);
    while (records.length > MAX_CAST_PANELS) records.shift();
  }
  saveCastMap(records);
  return records;
}

export function clearCast(panelId: string): CastRecord[] {
  const next = loadCastMap().filter((r) => r.panelId !== panelId);
  saveCastMap(next);
  return next;
}

/** Opened separate-windows, keyed by panel id, so we focus instead of duplicating. */
const detachedWindows = new Map<string, Window>();

/**
 * Open a panel as a separate window, positioned on the chosen screen.
 * `screen` may be null for the manual fallback: a plain window the
 * owner drags to the other monitor himself. The window loads
 * `panelUrl(panelId)` (the `?panel=` contract). The panel's pinned
 * state is NOT changed — a pinned panel opened on another monitor is
 * still the same pinned panel; the store record is only annotated
 * with the screen label + timestamp. Returns the window, or null if
 * the browser blocked / refused to open it.
 *
 * Generic: any panelId works, and the coordinator can pass the Big
 * Screen / presenter panel id the same way.
 */
export function openPanelOnScreen(
  panelId: string,
  screen: ScreenInfo | null,
): Window | null {
  if (typeof window === 'undefined' || !panelId) return null;
  const existing = detachedWindows.get(panelId);
  if (existing && !existing.closed) {
    try {
      existing.focus();
    } catch {
      /* focus is best-effort */
    }
    return existing;
  }
  const url = panelUrl(panelId);
  let features = 'menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes';
  if (screen) {
    const pinned = getPinned(panelId);
    const width = Math.min(
      Math.max(pinned?.width ?? DEFAULT_PANEL_WIDTH, 240),
      screen.availWidth,
    );
    const height = Math.min(
      Math.max(pinned?.height ?? DEFAULT_PANEL_HEIGHT, 240),
      screen.availHeight,
    );
    const left = screen.availLeft + Math.max(0, Math.floor((screen.availWidth - width) / 2));
    const top = screen.availTop + Math.max(0, Math.floor((screen.availHeight - height) / 2));
    features += `,left=${left},top=${top},width=${width},height=${height}`;
  }
  let opened: Window | null = null;
  try {
    opened = window.open(url, `mti6-panel-${panelId}`, features);
  } catch {
    opened = null;
  }
  if (!opened) return null;
  detachedWindows.set(panelId, opened);
  // Annotate (never re-pin / un-pin): the record stays exactly as it was.
  const panels = loadPinned();
  const record = panels.find((p) => p.id === panelId);
  if (record) {
    record.screenLabel = screen ? screen.label : 'Separate window';
    record.detachedAt = new Date().toISOString();
    savePinned(panels);
  }
  return opened;
}

/**
 * Close the separate window opened for a panel, if we still hold it
 * and it is open. Returns true when a window was actually closed.
 * (A window the owner closed by hand, or one from before a reload,
 * is already gone — this returns false and claims nothing.)
 */
export function closeDetachedPanel(panelId: string): boolean {
  const win = detachedWindows.get(panelId);
  detachedWindows.delete(panelId);
  if (!win || win.closed) return false;
  try {
    win.close();
  } catch {
    return false;
  }
  return true;
}

/**
 * CAST a panel to a screen: opens the panel's `?panel=` window on
 * that screen (same mechanism as openPanelOnScreen) AND persists the
 * cast record, so the panel shows CAST TO: <screen label>.
 * `screen` null = manual fallback: opens a plain separate window the
 * owner drags himself, and records NO cast — we cannot know which
 * screen it ended up on. Returns the window, or null if the browser
 * blocked / refused to open it (then nothing is recorded either).
 * Generic: any panelId works; the pin record is untouched.
 */
export function castPanelToScreen(
  panelId: string,
  title: string,
  screen: ScreenInfo | null,
  screenDescription?: string,
): Window | null {
  const opened = openPanelOnScreen(panelId, screen);
  if (!opened) return null;
  if (screen) {
    setCast(panelId, title, screen, screenDescription);
  }
  return opened;
}

/**
 * STOP CAST: closes the panel's separate window (if still open) and
 * clears the persisted cast record, so the panel shows NOT CAST.
 * Does not change the pin record.
 */
export function stopCast(panelId: string): void {
  closeDetachedPanel(panelId);
  clearCast(panelId);
}
