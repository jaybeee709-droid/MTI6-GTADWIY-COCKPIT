/**
 * Pinned panels — renderer + wrapper (v247 part 5, owner refinement
 * 2026-11-25 ~6:20 PM; multi-monitor refinement #2 same day).
 *
 * GENERIC pinning system. Any pop-out panel in the app can be wrapped:
 *
 *   <PinnablePanel panelId="netlify" title="Netlify">
 *     ...panel content...
 *   </PinnablePanel>
 *
 * No panel id is hardcoded here — Netlify is only the first user of
 * the system (the coordinator wires `panelId="netlify"`). The wrapper
 * needs only `panelId` + `title` (+ `children`) from its parent.
 *
 * HOW IT WORKS
 * - Unpinned: the panel renders in place as a normal pop-out (in-flow,
 *   where its parent put it), with a title bar: PIN, OPEN ON MONITOR,
 *   close. Pinning pins it IN PLACE (its current on-screen position
 *   becomes its persisted position).
 * - Pinned + open: the panel renders as a floating window fixed at its
 *   persisted store position. It can be dragged by its title bar
 *   (pointer events, mouse + touch), unpinned (returns to normal
 *   pop-out behaviour), closed (stays pinned; reopen restores it at
 *   its persisted position), or opened on another monitor.
 * - Pinned + closed: the wrapper renders nothing, but the pin stays in
 *   the store. Reopen from <PinnedList/> (or anywhere calling
 *   setPanelOpen(id, true)) restores it at its persisted position.
 * - <PinnedPanels/> is the GLOBAL PINNED LAYER: mount it ONCE at the
 *   app root (the coordinator does this). It renders floating windows
 *   for open pinned panels whose source screen is not currently
 *   mounted (stale last view, labelled as such) and placeholders for
 *   panels with no registered content. It never duplicates a window a
 *   live <PinnablePanel/> is already rendering.
 * - <PinnedList/> is a compact list of pinned panels with
 *   reopen / close / unpin / open-on-monitor actions, for the drawer.
 *
 * DRAG + SCROLL: only the TITLE BAR has `touch-action: none` and
 * captures the pointer, so dragging never fights scrolling — the
 * content area scrolls normally on touch. Dragging clamps so the
 * title bar always stays reachable (see clampPosition in pinning.ts).
 *
 * SMALL PHONE SCREENS: free placement still applies, but the window
 * width is capped at the viewport (max-width: calc(100vw - 16px)) and
 * dragging is clamped to the viewport, so a pinned panel can never be
 * lost off-screen. On a very small phone a pinned panel may cover
 * most of the screen while open — that is the honest trade-off of
 * free placement; closing it (it stays pinned) clears the screen.
 *
 * MULTI-MONITOR: the title bar's OPEN ON MONITOR control opens
 * <ScreenPicker/>, which lists screens from the Window Management API
 * (label + Primary / This screen) and opens the panel on the chosen
 * one via openPanelOnScreen() — the new window loads the `?panel=`
 * URL (see pinning.ts for the contract; App.tsx renders just that
 * panel for a `?panel=` URL). If the API is unsupported or permission
 * is denied, the picker shows an honest note and offers a plain
 * separate window to drag manually — never a fake placement claim.
 * ScreenPicker is exported generically so the coordinator can wire
 * the Big Screen / presenter view to a chosen monitor the same way.
 *
 * CAST (refinement #3): the CAST control opens <CastPicker/> and
 * sends the panel to an ACTIVE screen (e.g. a TV/monitor over HDMI).
 * Cast state is shown ON the panel (CAST TO / LAST CAST / NOT CAST)
 * and persisted in a separate cast map (see pinning.ts).
 *
 * SEVERAL MONITORS (refinement #4): the pickers list ALL detected
 * screens, each labelled "Screen N — [Primary] — [API label] —
 * <width>×<height> at (<availLeft>, <availTop>)" plus "· This screen"
 * for the screen the app window is on — so several HDMI monitors can
 * be told apart and different panels cast to different monitors. If
 * a monitor is not in the list, the picker says so honestly
 * ("Monitor not detected — check display settings / HDMI connection;
 * this is a display-settings matter, not the app") instead of
 * pretending it cast. Desktop-first: desktop Chrome/Edge support the
 * Window Management API for placing windows on chosen screens (with
 * permission); the picker requests it and handles denial honestly.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Cast, Monitor, Pin, PinOff, X } from 'lucide-react';
import {
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_WIDTH,
  MONITOR_NOT_DETECTED_MESSAGE,
  PINNED_PANELS_KEY,
  castPanelToScreen,
  clampPosition,
  formatScreenLabel,
  getCastStatus,
  getPinned,
  getScreens,
  isPinned,
  loadPinned,
  movePanel,
  openPanelOnScreen,
  pinPanel,
  setPanelOpen,
  setPanelTitle,
  stopCast,
  subscribeCast,
  subscribePinned,
  unpinPanel,
  type CastRecord,
  type PinnedPanel,
  type ScreenInfo,
} from '../pinning';

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Live snapshot of the pin store (same-tab + cross-tab storage sync). */
function usePinnedPanels(): PinnedPanel[] {
  const [panels, setPanels] = useState<PinnedPanel[]>(() => loadPinned());
  useEffect(() => {
    const refresh = () => setPanels(loadPinned());
    const unsubscribe = subscribePinned(refresh);
    const onStorage = (e: StorageEvent) => {
      if (e.key === PINNED_PANELS_KEY) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return panels;
}

type ScreenListState =
  | { status: 'loading' }
  | { status: 'ready'; screens: ScreenInfo[] }
  | { status: 'unavailable'; message: string };

/** Shared screen-list loader for ScreenPicker and CastPicker. */
function useScreens(): ScreenListState {
  const [state, setState] = useState<ScreenListState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    getScreens().then((result) => {
      if (cancelled) return;
      if (result.screens) {
        setState({ status: 'ready', screens: result.screens });
      } else {
        setState({ status: 'unavailable', message: result.message });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

/**
 * Live cast status for a panel. Re-reads on cast-map changes, and
 * polls the tracked separate window every 2s — the only way to know
 * whether the owner closed the cast window by hand, so CAST TO never
 * goes stale into a false claim.
 */
function useCastStatus(panelId: string): {
  status: 'active' | 'stale' | 'none';
  record: CastRecord | undefined;
} {
  const [cast, setCastState] = useState(() => getCastStatus(panelId));
  useEffect(() => {
    const refresh = () => setCastState(getCastStatus(panelId));
    const unsubscribe = subscribeCast(refresh);
    const timer = window.setInterval(refresh, 2000);
    refresh();
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [panelId]);
  return cast;
}

// ---------------------------------------------------------------------------
// Content registry — lets the global layer render panels whose source
// screen is not mounted, from their last-rendered content.
// ---------------------------------------------------------------------------

interface RegisteredContent {
  title: string;
  node: React.ReactNode;
  /** True while a live <PinnablePanel/> for this id is mounted. */
  live: boolean;
}

const contentRegistry = new Map<string, RegisteredContent>();
const registryListeners = new Set<() => void>();

function notifyRegistry(): void {
  for (const fn of registryListeners) {
    try {
      fn();
    } catch {
      /* a listener must never break the registry */
    }
  }
}

function registerPinnedContent(
  id: string,
  title: string,
  node: React.ReactNode,
  live: boolean,
): void {
  const prev = contentRegistry.get(id);
  if (prev && prev.node === node && prev.title === title && prev.live === live) return;
  contentRegistry.set(id, { title, node, live });
  notifyRegistry();
}

/** A wrapper unmounted: keep its last content, but mark it stale. */
function markPinnedContentStale(id: string): void {
  const prev = contentRegistry.get(id);
  if (!prev || !prev.live) return;
  contentRegistry.set(id, { ...prev, live: false });
  notifyRegistry();
}

function subscribeRegistry(fn: () => void): () => void {
  registryListeners.add(fn);
  return () => {
    registryListeners.delete(fn);
  };
}

/** Re-render when the registry changes; returns a tick, not data. */
function useRegistryTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(
    () => subscribeRegistry(() => setTick((t) => t + 1)),
    [],
  );
  return tick;
}

// ---------------------------------------------------------------------------
// Shared styles (inline — this file owns no CSS file)
// ---------------------------------------------------------------------------

const WINDOW_STYLE: React.CSSProperties = {
  position: 'fixed',
  zIndex: 70,
  display: 'flex',
  flexDirection: 'column',
  background: '#0b0f1a',
  border: '1px solid #2a3348',
  borderRadius: 10,
  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
  color: '#e5e7eb',
  overflow: 'hidden',
};

const TITLE_BAR_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  flexShrink: 0,
  minHeight: 40,
  padding: '4px 6px 4px 12px',
  background: '#111827',
  borderBottom: '1px solid #2a3348',
  cursor: 'grab',
  touchAction: 'none',
  userSelect: 'none',
};

const TITLE_TEXT_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 13,
  fontWeight: 600,
};

const ICON_BUTTON_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  flexShrink: 0,
  borderRadius: 6,
  border: '1px solid transparent',
  background: 'transparent',
  color: '#9ca3af',
  cursor: 'pointer',
};

const ICON_BUTTON_ACTIVE_STYLE: React.CSSProperties = {
  ...ICON_BUTTON_STYLE,
  background: '#8B5CFF',
  color: '#ffffff',
};

const CONTENT_STYLE: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  touchAction: 'auto',
};

const STALE_NOTE_STYLE: React.CSSProperties = {
  flexShrink: 0,
  padding: '6px 12px',
  fontSize: 11,
  color: '#fbbf24',
  background: 'rgba(251,191,36,0.08)',
  borderBottom: '1px solid #2a3348',
};

const CAST_STRIP_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexShrink: 0,
  padding: '5px 12px',
  fontSize: 11,
  borderBottom: '1px solid #2a3348',
  background: 'rgba(139,92,255,0.08)',
};

// ---------------------------------------------------------------------------
// Pinned floating window (draggable by its title bar)
// ---------------------------------------------------------------------------

function PinnedWindow(props: {
  panel: PinnedPanel;
  children: React.ReactNode;
  stale?: boolean;
}): React.ReactNode {
  const { panel, children, stale } = props;
  const winRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const dragPosRef = useRef<{ x: number; y: number } | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [picker, setPicker] = useState<'screens' | 'cast' | null>(null);
  const cast = useCastStatus(panel.id);

  const pos = dragPos ?? { x: panel.x, y: panel.y };
  const width = panel.width ?? DEFAULT_PANEL_WIDTH;
  const height = panel.height ?? DEFAULT_PANEL_HEIGHT;

  const onTitlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const rect = winRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer capture is best-effort */
    }
  };

  const onTitlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const w = winRef.current?.offsetWidth ?? width;
    const h = winRef.current?.offsetHeight ?? height;
    const next = clampPosition(e.clientX - drag.offsetX, e.clientY - drag.offsetY, w, h);
    dragPosRef.current = next;
    setDragPos(next);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (commit && dragPosRef.current) {
      movePanel(panel.id, dragPosRef.current.x, dragPosRef.current.y);
    }
    dragPosRef.current = null;
    setDragPos(null);
  };

  return (
    <div
      ref={winRef}
      role="dialog"
      aria-label={panel.title}
      style={{
        ...WINDOW_STYLE,
        left: pos.x,
        top: pos.y,
        width,
        height,
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'calc(100vh - 16px)',
      }}
    >
      <div
        style={{ ...TITLE_BAR_STYLE, cursor: dragPos ? 'grabbing' : 'grab' }}
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={(e) => endDrag(e, true)}
        onPointerCancel={(e) => endDrag(e, false)}
      >
        <span style={TITLE_TEXT_STYLE}>{panel.title}</span>
        {/* Buttons stop propagation so a tap on them never starts a drag. */}
        <span
          style={{ display: 'inline-flex', gap: 2 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label={`Unpin ${panel.title}`}
            title="Unpin — return to normal pop-out"
            style={ICON_BUTTON_ACTIVE_STYLE}
            onClick={() => unpinPanel(panel.id)}
          >
            <PinOff size={15} />
          </button>
          <button
            type="button"
            aria-label={`Open ${panel.title} on a monitor`}
            title="Open on monitor"
            style={picker === 'screens' ? ICON_BUTTON_ACTIVE_STYLE : ICON_BUTTON_STYLE}
            onClick={() => setPicker((p) => (p === 'screens' ? null : 'screens'))}
          >
            <Monitor size={15} />
          </button>
          <button
            type="button"
            aria-label={`Cast ${panel.title} to a screen`}
            title={
              cast.status === 'active'
                ? `Cast to ${cast.record?.screen.label ?? ''} — tap to change or stop`
                : 'Cast — send this panel to another screen'
            }
            style={
              cast.status === 'active' || picker === 'cast'
                ? ICON_BUTTON_ACTIVE_STYLE
                : ICON_BUTTON_STYLE
            }
            onClick={() => setPicker((p) => (p === 'cast' ? null : 'cast'))}
          >
            <Cast size={15} />
          </button>
          <button
            type="button"
            aria-label={`Close ${panel.title} (stays pinned)`}
            title="Close — stays pinned, reopen from the pinned list"
            style={ICON_BUTTON_STYLE}
            onClick={() => setPanelOpen(panel.id, false)}
          >
            <X size={15} />
          </button>
        </span>
      </div>
      <CastStatusStrip panelId={panel.id} title={panel.title} />
      {picker && (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 8,
              zIndex: 5,
              width: 300,
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            {picker === 'screens' ? (
              <ScreenPicker panelId={panel.id} onOpened={() => setPicker(null)} />
            ) : (
              <CastPicker
                panelId={panel.id}
                title={panel.title}
                onDone={() => setPicker(null)}
              />
            )}
          </div>
        </div>
      )}
      {stale && (
        <div style={STALE_NOTE_STYLE}>
          Showing last view — open the {panel.title} screen for live updates.
        </div>
      )}
      <div style={CONTENT_STYLE}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CastStatusStrip — cast state shown ON the panel.
// "CAST TO: <screen>" only while the cast window is actually open;
// "LAST CAST: <screen>" when the record survives but the window is
// gone (e.g. after a reload — tap Cast to reopen); "NOT CAST" when
// there is no cast record. Never claims a cast that is not live.
// ---------------------------------------------------------------------------

function CastStatusStrip(props: { panelId: string; title: string }): React.ReactNode {
  const { panelId, title } = props;
  const cast = useCastStatus(panelId);
  if (cast.status === 'none') {
    return (
      <div style={{ ...CAST_STRIP_STYLE, background: 'transparent' }}>
        <span style={{ color: '#9ca3af' }}>NOT CAST</span>
      </div>
    );
  }
  const label =
    cast.record?.screen.description ?? cast.record?.screen.label ?? 'Unknown screen';
  if (cast.status === 'active') {
    return (
      <div style={CAST_STRIP_STYLE}>
        <Cast size={12} color="#8B5CFF" />
        <span style={{ flex: 1, minWidth: 0, color: '#e5e7eb' }}>
          CAST TO: {label}
        </span>
        <button
          type="button"
          style={{
            padding: '2px 8px',
            borderRadius: 5,
            border: '1px solid #2a3348',
            background: '#1f2937',
            color: '#e5e7eb',
            cursor: 'pointer',
            fontSize: 11,
          }}
          onClick={() => stopCast(panelId)}
        >
          Stop cast
        </button>
      </div>
    );
  }
  return (
    <div style={{ ...CAST_STRIP_STYLE, background: 'rgba(251,191,36,0.08)' }}>
      <Cast size={12} color="#fbbf24" />
      <span style={{ flex: 1, minWidth: 0, color: '#fbbf24' }}>
        LAST CAST: {label} — window closed, tap Cast to reopen
      </span>
      <button
        type="button"
        style={{
          padding: '2px 8px',
          borderRadius: 5,
          border: '1px solid #2a3348',
          background: '#1f2937',
          color: '#e5e7eb',
          cursor: 'pointer',
          fontSize: 11,
        }}
        onClick={() => stopCast(panelId)}
        aria-label={`Clear last cast for ${title}`}
      >
        Clear
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScreenPicker — generic multi-monitor picker for any panel id.
// ---------------------------------------------------------------------------

export function ScreenPicker(props: {
  panelId: string;
  onOpened?: () => void;
}): React.ReactNode {
  const { panelId, onOpened } = props;
  const state = useScreens();

  const openOn = (screen: ScreenInfo | null) => {
    const opened = openPanelOnScreen(panelId, screen);
    if (opened) {
      onOpened?.();
    }
  };

  const boxStyle: React.CSSProperties = {
    background: '#111827',
    border: '1px solid #2a3348',
    borderRadius: 8,
    boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
    color: '#e5e7eb',
    padding: 10,
    fontSize: 12,
  };

  if (state.status === 'loading') {
    return <div style={boxStyle}>Checking screens…</div>;
  }

  if (state.status === 'unavailable') {
    return (
      <div style={boxStyle}>
        <div style={{ color: '#fbbf24', marginBottom: 8 }}>{state.message}</div>
        <button
          type="button"
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: 6,
            border: '1px solid #2a3348',
            background: '#1f2937',
            color: '#e5e7eb',
            cursor: 'pointer',
            fontSize: 12,
          }}
          onClick={() => openOn(null)}
        >
          Open as a separate window
        </button>
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Open on monitor</div>
      {state.screens.map((screen, i) => (
        <button
          key={`${screen.label}-${screen.availLeft}-${screen.availTop}-${i}`}
          type="button"
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '7px 10px',
            marginBottom: 4,
            borderRadius: 6,
            border: '1px solid #2a3348',
            background: '#1f2937',
            color: '#e5e7eb',
            cursor: 'pointer',
            fontSize: 12,
          }}
          onClick={() => openOn(screen)}
        >
          {formatScreenLabel(screen, i)}
          {screen.isCurrent ? ' · This screen' : ''}
        </button>
      ))}
      <button
        type="button"
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          padding: '7px 10px',
          borderRadius: 6,
          border: '1px solid transparent',
          background: 'transparent',
          color: '#9ca3af',
          cursor: 'pointer',
          fontSize: 12,
        }}
        onClick={() => openOn(null)}
      >
        Open as a separate window (drag it manually)
      </button>
      <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
        {MONITOR_NOT_DETECTED_MESSAGE}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CastPicker — generic CAST picker for any panel id.
// Lists ALL detected screens (refinement #4: several monitors), each
// labelled so they can be told apart; the owner picks ANY one per
// panel, so different panels can go to different monitors. Picking a
// screen casts the panel there (opens its `?panel=` window on that
// screen AND persists the cast record). The manual fallback opens a
// plain window and records NO cast. Stop cast closes the cast window
// and clears the record. Desktop-first: desktop Chrome/Edge support
// the Window Management API for placing windows on chosen screens
// (with permission); the picker requests it and handles denial
// honestly — it never claims a cast to a screen that was not detected.
// ---------------------------------------------------------------------------

export function CastPicker(props: {
  panelId: string;
  title: string;
  onDone?: () => void;
}): React.ReactNode {
  const { panelId, title, onDone } = props;
  const state = useScreens();
  const cast = useCastStatus(panelId);

  const boxStyle: React.CSSProperties = {
    background: '#111827',
    border: '1px solid #2a3348',
    borderRadius: 8,
    boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
    color: '#e5e7eb',
    padding: 10,
    fontSize: 12,
  };

  const castTo = (screen: ScreenInfo | null, index?: number) => {
    const description =
      screen && typeof index === 'number' ? formatScreenLabel(screen, index) : undefined;
    const opened = castPanelToScreen(panelId, title, screen, description);
    if (opened) {
      onDone?.();
    }
  };

  if (state.status === 'loading') {
    return <div style={boxStyle}>Checking screens…</div>;
  }

  if (state.status === 'unavailable') {
    return (
      <div style={boxStyle}>
        <div style={{ color: '#fbbf24', marginBottom: 8 }}>{state.message}</div>
        <button
          type="button"
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: 6,
            border: '1px solid #2a3348',
            background: '#1f2937',
            color: '#e5e7eb',
            cursor: 'pointer',
            fontSize: 12,
          }}
          onClick={() => castTo(null)}
        >
          Open as a separate window
        </button>
        <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
          No cast is recorded for a manual window — the app cannot tell
          which screen it ends up on.
        </div>
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Cast to screen</div>
      {cast.status !== 'none' && (
        <div style={{ marginBottom: 8, fontSize: 12, color: '#c4b5fd' }}>
          {cast.status === 'active' ? 'CAST TO: ' : 'LAST CAST: '}
          {cast.record?.screen.description ?? cast.record?.screen.label}
        </div>
      )}
      {state.screens.map((screen, i) => (
        <button
          key={`${screen.label}-${screen.availLeft}-${screen.availTop}-${i}`}
          type="button"
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '7px 10px',
            marginBottom: 4,
            borderRadius: 6,
            border: '1px solid #2a3348',
            background: '#1f2937',
            color: '#e5e7eb',
            cursor: 'pointer',
            fontSize: 12,
          }}
          onClick={() => castTo(screen, i)}
        >
          {formatScreenLabel(screen, i)}
          {screen.isCurrent ? ' · This screen' : ''}
        </button>
      ))}
      <button
        type="button"
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          padding: '7px 10px',
          borderRadius: 6,
          border: '1px solid transparent',
          background: 'transparent',
          color: '#9ca3af',
          cursor: 'pointer',
          fontSize: 12,
        }}
        onClick={() => castTo(null)}
      >
        Open as a separate window (drag it manually)
      </button>
      {cast.status !== 'none' && (
        <button
          type="button"
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '7px 10px',
            marginTop: 4,
            borderRadius: 6,
            border: '1px solid #2a3348',
            background: '#1f2937',
            color: '#e5e7eb',
            cursor: 'pointer',
            fontSize: 12,
          }}
          onClick={() => {
            stopCast(panelId);
            onDone?.();
          }}
        >
          Stop cast
        </button>
      )}
      <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
        {MONITOR_NOT_DETECTED_MESSAGE}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PinnablePanel — the generic wrapper. Any pop-out panel can use it.
// ---------------------------------------------------------------------------

export function PinnablePanel(props: {
  panelId: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}): React.ReactNode {
  const { panelId, title, children, defaultOpen = true } = props;
  const pinnedPanels = usePinnedPanels();
  const pinned = pinnedPanels.find((p) => p.id === panelId);
  const [visible, setVisible] = useState(defaultOpen);
  const [picker, setPicker] = useState<'screens' | 'cast' | null>(null);
  const cast = useCastStatus(panelId);
  const popoutRef = useRef<HTMLDivElement | null>(null);

  // Keep the global layer's copy of this panel's content current.
  useEffect(() => {
    registerPinnedContent(panelId, title, children, true);
    return () => {
      markPinnedContentStale(panelId);
    };
  }, [panelId, title, children]);

  // Keep the stored title fresh if the source screen retitles.
  useEffect(() => {
    if (pinned && pinned.title !== title) setPanelTitle(panelId, title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned?.title, panelId, title]);

  if (pinned) {
    // Pinned + closed: render nothing; the pin (and position) persist
    // until reopened from <PinnedList/> or setPanelOpen(id, true).
    if (!pinned.open) return null;
    // Pinned + open: free-placed floating window at the stored position.
    return <PinnedWindow panel={pinned}>{children}</PinnedWindow>;
  }

  // Not pinned: normal pop-out behaviour, in place where the parent
  // put it. Closing here only hides it locally (no store record exists).
  if (!visible) return null;
  return (
    <div
      ref={popoutRef}
      role="dialog"
      aria-label={title}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 560,
        display: 'flex',
        flexDirection: 'column',
        background: '#0b0f1a',
        border: '1px solid #2a3348',
        borderRadius: 10,
        color: '#e5e7eb',
        overflow: 'hidden',
      }}
    >
      <div style={{ ...TITLE_BAR_STYLE, cursor: 'default' }}>
        <span style={TITLE_TEXT_STYLE}>{title}</span>
        <span style={{ display: 'inline-flex', gap: 2 }}>
          <button
            type="button"
            aria-label={`Pin ${title}`}
            title="Pin — keep this panel anywhere on screen"
            style={ICON_BUTTON_STYLE}
            onClick={() => {
              // Pin in place: the panel's current on-screen spot
              // becomes its persisted position.
              const rect = popoutRef.current?.getBoundingClientRect();
              pinPanel({
                id: panelId,
                title,
                x: rect ? rect.left : undefined,
                y: rect ? rect.top : undefined,
                width: rect ? Math.round(rect.width) : undefined,
              });
            }}
          >
            <Pin size={15} />
          </button>
          <button
            type="button"
            aria-label={`Open ${title} on a monitor`}
            title="Open on monitor"
            style={picker === 'screens' ? ICON_BUTTON_ACTIVE_STYLE : ICON_BUTTON_STYLE}
            onClick={() => setPicker((p) => (p === 'screens' ? null : 'screens'))}
          >
            <Monitor size={15} />
          </button>
          <button
            type="button"
            aria-label={`Cast ${title} to a screen`}
            title={
              cast.status === 'active'
                ? `Cast to ${cast.record?.screen.label ?? ''} — tap to change or stop`
                : 'Cast — send this panel to another screen'
            }
            style={
              cast.status === 'active' || picker === 'cast'
                ? ICON_BUTTON_ACTIVE_STYLE
                : ICON_BUTTON_STYLE
            }
            onClick={() => setPicker((p) => (p === 'cast' ? null : 'cast'))}
          >
            <Cast size={15} />
          </button>
          <button
            type="button"
            aria-label={`Close ${title}`}
            title="Close"
            style={ICON_BUTTON_STYLE}
            onClick={() => setVisible(false)}
          >
            <X size={15} />
          </button>
        </span>
      </div>
      <CastStatusStrip panelId={panelId} title={title} />
      {picker && (
        <div style={{ padding: 8, borderBottom: '1px solid #2a3348' }}>
          {picker === 'screens' ? (
            <ScreenPicker panelId={panelId} onOpened={() => setPicker(null)} />
          ) : (
            <CastPicker panelId={panelId} title={title} onDone={() => setPicker(null)} />
          )}
        </div>
      )}
      <div style={CONTENT_STYLE}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PinnedPanels — the global pinned layer (mount once at the app root).
// Renders open pinned panels whose live wrapper is NOT mounted, from
// their last registered content (labelled stale), plus a placeholder
// for open pinned panels with no registered content at all.
// ---------------------------------------------------------------------------

export function PinnedPanels(): React.ReactNode {
  const pinnedPanels = usePinnedPanels();
  useRegistryTick();
  const open = pinnedPanels.filter((p) => p.open);
  if (open.length === 0) return null;
  return (
    <>
      {open.map((panel) => {
        const reg = contentRegistry.get(panel.id);
        if (reg?.live) return null; // its live wrapper renders the window
        if (reg) {
          return (
            <PinnedWindow key={panel.id} panel={panel} stale>
              {reg.node}
            </PinnedWindow>
          );
        }
        return (
          <PinnedWindow key={panel.id} panel={panel}>
            <div style={{ padding: 16, fontSize: 13, color: '#9ca3af' }}>
              Open the {panel.title} screen to restore this panel. The pin
              is kept — use the pinned list to reopen or unpin it.
            </div>
          </PinnedWindow>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// PinnedList — compact list of pinned panels (for the drawer).
// ---------------------------------------------------------------------------

export function PinnedList(): React.ReactNode {
  const panels = usePinnedPanels();

  if (panels.length === 0) {
    return (
      <div style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>
        No pinned panels yet. Pin any pop-out panel to keep it on screen.
      </div>
    );
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 4 }}>
      {panels.map((panel) => (
        <PinnedListRow key={panel.id} panel={panel} />
      ))}
    </ul>
  );
}

function PinnedListRow(props: { panel: PinnedPanel }): React.ReactNode {
  const { panel } = props;
  const [picker, setPicker] = useState<'screens' | 'cast' | null>(null);
  const cast = useCastStatus(panel.id);

  return (
    <li
      style={{
        padding: '8px 10px',
        borderBottom: '1px solid #1f2937',
        color: '#e5e7eb',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 0,
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {panel.title}
        </span>
        <span style={{ fontSize: 11, color: panel.open ? '#32D74B' : '#9ca3af' }}>
          {panel.open ? 'Open' : 'Closed'}
        </span>
      </div>
      {panel.screenLabel && (
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
          Last opened on: {panel.screenLabel}
        </div>
      )}
      {cast.status !== 'none' && (
        <div
          style={{
            fontSize: 11,
            color: cast.status === 'active' ? '#c4b5fd' : '#fbbf24',
            marginTop: 2,
          }}
        >
          {cast.status === 'active' ? 'CAST TO: ' : 'LAST CAST: '}
          {cast.record?.screen.description ?? cast.record?.screen.label}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        {panel.open ? (
          <button
            type="button"
            style={listButtonStyle}
            onClick={() => setPanelOpen(panel.id, false)}
          >
            Close
          </button>
        ) : (
          <button
            type="button"
            style={listButtonStyle}
            onClick={() => setPanelOpen(panel.id, true)}
          >
            Reopen
          </button>
        )}
        <button
          type="button"
          style={listButtonStyle}
          onClick={() => setPicker((p) => (p === 'screens' ? null : 'screens'))}
        >
          Monitor
        </button>
        <button
          type="button"
          style={listButtonStyle}
          onClick={() => setPicker((p) => (p === 'cast' ? null : 'cast'))}
        >
          Cast
        </button>
        {cast.status !== 'none' && (
          <button
            type="button"
            style={listButtonStyle}
            onClick={() => stopCast(panel.id)}
          >
            Stop cast
          </button>
        )}
        <button
          type="button"
          style={listButtonStyle}
          onClick={() => unpinPanel(panel.id)}
        >
          Unpin
        </button>
      </div>
      {picker && (
        <div style={{ marginTop: 8 }}>
          {picker === 'screens' ? (
            <ScreenPicker panelId={panel.id} onOpened={() => setPicker(null)} />
          ) : (
            <CastPicker
              panelId={panel.id}
              title={panel.title}
              onDone={() => setPicker(null)}
            />
          )}
        </div>
      )}
    </li>
  );
}

const listButtonStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 6,
  border: '1px solid #2a3348',
  background: '#1f2937',
  color: '#e5e7eb',
  cursor: 'pointer',
  fontSize: 12,
};

// Re-exported for callers that only import this module.
export { getPinned, isPinned };
export type { PinnedPanel, ScreenInfo };
