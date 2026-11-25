/**
 * Devices panel — Settings > DEVICES (v247 part 6, owner refinement #5,
 * 2026-11-25 ~6:29 PM).
 *
 * ONE place to see and manage every connected screen/monitor/display:
 * what is connected, how it is connected, and which panels are cast
 * or pinned to each screen. The cast/pin controls live here too.
 *
 * WHERE THE LIST COMES FROM
 * - The screen list comes from `getScreens()` in src/pinning.ts — the
 *   browser Window Management API (`window.getScreenDetails()`). That
 *   is the ONLY source: every detected screen is listed, labelled by
 *   `formatScreenLabel()` (number, Primary flag, API label, resolution,
 *   virtual position), plus which screen the app window is currently on
 *   (`isCurrent`). HDMI monitors appear in this list as screens.
 * - The panel does NOT invent a connection type the API does not
 *   report. The API reports label / primary / resolution / virtual
 *   position — it does NOT report HDMI vs DisplayPort vs internal.
 *   That is stated plainly in the panel: a monitor's connection is
 *   whatever the OS reports to the browser. If a monitor is missing
 *   from the list, the panel says so ("not detected — check display
 *   settings / HDMI connection; this is a display-settings matter,
 *   not the app") instead of pretending it is there.
 *
 * CAST / PIN GROUPING
 * - Cast records come from `loadCastMap()` (pinning.ts): each record
 *   carries the screen it was cast to (availLeft/availTop snapshot),
 *   so a cast is matched to a detected screen by virtual position.
 *   A cast whose screen is no longer detected is listed under
 *   "Screen no longer detected", never silently re-assigned.
 * - Pinned panels come from `loadPinned()`: a pinned panel carries
 *   `screenLabel` — the label of the screen it was last opened on,
 *   if any — so it is matched to a detected screen by that label.
 *   A pinned panel with no screen info is listed under "This screen
 *   / not assigned to a monitor".
 * - Cast status is live, not just persisted: `getCastStatus()` says
 *   ACTIVE only while the separate cast window is still open;
 *   otherwise the record shows as LAST CAST (stale — tap Cast to
 *   reopen). The panel re-reads cast status every 2s, so a window
 *   the owner closed by hand stops claiming to be cast.
 *
 * CONTROLS — reused, not rebuilt: <PinnedList/> (reopen / close /
 * unpin per pinned panel, with its own Monitor / Cast pickers) and
 * <CastPicker/> / <ScreenPicker/> (cast / open-on-monitor for a
 * chosen pinned panel) from src/worlds/PinnedPanels.tsx.
 *
 * HONEST STATES
 * - API unsupported → the note + manual-drag fallback (never a fake
 *   cast); the pinned list and any saved cast records are still
 *   shown, labelled as last-known.
 * - Permission denied → the note; same fallback, same honesty.
 * - One screen only → "Single-screen setup" — not an error.
 * - No pinned panels / no casts → says so; nothing is invented.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Cast, Monitor } from 'lucide-react';
import {
  CAST_PANELS_KEY,
  MONITOR_NOT_DETECTED_MESSAGE,
  PINNED_PANELS_KEY,
  formatScreenLabel,
  getCastStatus,
  getScreens,
  loadCastMap,
  loadPinned,
  setPanelOpen,
  stopCast,
  subscribeCast,
  subscribePinned,
  unpinPanel,
  type CastRecord,
  type PinnedPanel,
  type ScreenInfo,
  type ScreenListReason,
} from '../pinning';
import { CastPicker, PinnedList, ScreenPicker } from './PinnedPanels';

// ---------------------------------------------------------------------------
// Styles (inline — this file owns no CSS file; matches PinnedPanels.tsx)
// ---------------------------------------------------------------------------

const SECTION_TITLE_STYLE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#e5e7eb',
  marginBottom: 8,
};

const NOTE_STYLE: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.5,
  color: '#9ca3af',
};

const WARN_STYLE: React.CSSProperties = {
  ...NOTE_STYLE,
  color: '#fbbf24',
};

const SCREEN_CARD_STYLE: React.CSSProperties = {
  border: '1px solid #2a3348',
  borderRadius: 10,
  background: '#0b0f1a',
  padding: 12,
  marginBottom: 8,
};

const SCREEN_HEAD_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  fontSize: 13,
  fontWeight: 600,
  color: '#e5e7eb',
};

const BADGE_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.04em',
  padding: '2px 7px',
  borderRadius: 999,
  border: '1px solid #2a3348',
  background: '#1f2937',
  color: '#9ca3af',
};

const BADGE_CURRENT_STYLE: React.CSSProperties = {
  ...BADGE_STYLE,
  borderColor: '#8B5CFF',
  background: 'rgba(139,92,255,0.15)',
  color: '#c4b5fd',
};

const BADGE_PRIMARY_STYLE: React.CSSProperties = {
  ...BADGE_STYLE,
  borderColor: '#00B7FF',
  background: 'rgba(0,183,255,0.12)',
  color: '#7dd3fc',
};

const SCREEN_META_STYLE: React.CSSProperties = {
  fontSize: 12,
  color: '#9ca3af',
  marginTop: 4,
};

const GROUP_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#9ca3af',
  margin: '10px 0 4px',
};

const ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  padding: '6px 0',
  borderBottom: '1px solid #1f2937',
  fontSize: 12,
  color: '#e5e7eb',
};

const SMALL_BUTTON_STYLE: React.CSSProperties = {
  padding: '3px 9px',
  borderRadius: 6,
  border: '1px solid #2a3348',
  background: '#1f2937',
  color: '#e5e7eb',
  cursor: 'pointer',
  fontSize: 11,
};

const REFRESH_BUTTON_STYLE: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid #2a3348',
  background: '#1f2937',
  color: '#e5e7eb',
  cursor: 'pointer',
  fontSize: 12,
};

// ---------------------------------------------------------------------------
// Matching — cast records and pinned panels to detected screens
// ---------------------------------------------------------------------------

/** A cast record matches a detected screen by virtual position. */
function castScreenMatches(cast: CastRecord, screen: ScreenInfo): boolean {
  return (
    cast.screen.availLeft === screen.availLeft &&
    cast.screen.availTop === screen.availTop
  );
}

/**
 * A pinned panel matches a detected screen by its stored screenLabel
 * (the label of the screen it was last opened on). The API label is
 * often the generic "Display" for several monitors, so a match by
 * label alone is a best-effort grouping — the panel says "last opened
 * on" rather than claiming the panel is on that screen now. A panel
 * opened only as a plain separate window carries screenLabel
 * "Separate window" and is never matched to a monitor.
 */
function pinnedScreenMatches(panel: PinnedPanel, screen: ScreenInfo): boolean {
  if (!panel.screenLabel) return false;
  if (panel.screenLabel === 'Separate window') return false;
  return panel.screenLabel === screen.label;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ScreenListState =
  | { status: 'loading' }
  | { status: 'ready'; screens: ScreenInfo[] }
  | { status: 'unavailable'; reason: ScreenListReason; message: string };

export function DevicesPanel(): React.ReactNode {
  const [screenState, setScreenState] = useState<ScreenListState>({ status: 'loading' });
  const [pinned, setPinned] = useState<PinnedPanel[]>(() => loadPinned());
  const [casts, setCasts] = useState<CastRecord[]>(() => loadCastMap());
  // Tick re-renders so cast ACTIVE/STALE status stays live (the owner
  // may close a cast window by hand; getCastStatus reads the tracked
  // window handle at render time).
  const [, setTick] = useState(0);
  const [pickerPanelId, setPickerPanelId] = useState<string>('');

  const refreshScreens = useCallback(() => {
    setScreenState({ status: 'loading' });
    getScreens().then((result) => {
      if (result.screens) {
        setScreenState({ status: 'ready', screens: result.screens });
      } else {
        setScreenState({
          status: 'unavailable',
          reason: result.reason ?? 'error',
          message: result.message,
        });
      }
    });
  }, []);

  useEffect(() => {
    refreshScreens();
  }, [refreshScreens]);

  // Live pin + cast stores (same-tab + cross-tab storage sync).
  useEffect(() => {
    const refresh = () => {
      setPinned(loadPinned());
      setCasts(loadCastMap());
    };
    const unsubscribePinned = subscribePinned(refresh);
    const unsubscribeCast = subscribeCast(refresh);
    const onStorage = (e: StorageEvent) => {
      if (e.key === PINNED_PANELS_KEY || e.key === CAST_PANELS_KEY) refresh();
    };
    window.addEventListener('storage', onStorage);
    const timer = window.setInterval(() => setTick((t) => t + 1), 2000);
    return () => {
      unsubscribePinned();
      unsubscribeCast();
      window.removeEventListener('storage', onStorage);
      window.clearInterval(timer);
    };
  }, []);

  const screens = screenState.status === 'ready' ? screenState.screens : null;
  const pickerPanel = pinned.find((p) => p.id === pickerPanelId) ?? pinned[0];

  // Group casts + pinned panels per detected screen.
  const castsForScreen = (screen: ScreenInfo): CastRecord[] =>
    casts.filter((c) => castScreenMatches(c, screen));
  const pinnedForScreen = (screen: ScreenInfo): PinnedPanel[] =>
    pinned.filter((p) => pinnedScreenMatches(p, screen));
  const orphanCasts = casts.filter(
    (c) => !screens || !screens.some((s) => castScreenMatches(c, s)),
  );
  const unassignedPinned = pinned.filter(
    (p) => !screens || !screens.some((s) => pinnedScreenMatches(p, s)),
  );

  return (
    <div style={{ fontSize: 12, color: '#e5e7eb' }}>
      {/* What "connected" means here — the connection-type honesty note. */}
      <p style={{ ...NOTE_STYLE, marginBottom: 10 }}>
        Screens below come from the browser&apos;s Window Management API — the
        only list the app can see. It reports each display&apos;s label,
        whether it is the primary display, its resolution, and its
        position in the virtual desktop. It does <strong>not</strong> report
        how a monitor is connected: the browser cannot tell HDMI from
        DisplayPort from an internal display. A monitor&apos;s connection
        is whatever the operating system reports to the browser.
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <button type="button" style={REFRESH_BUTTON_STYLE} onClick={refreshScreens}>
          Refresh screens
        </button>
        {screenState.status === 'ready' && (
          <span style={NOTE_STYLE}>
            {screens && screens.length === 1
              ? 'Single-screen setup — only this screen was detected. That is not an error.'
              : `${screens?.length ?? 0} screens detected.`}
          </span>
        )}
      </div>

      {screenState.status === 'loading' && (
        <p style={NOTE_STYLE}>Checking screens…</p>
      )}

      {screenState.status === 'unavailable' && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ ...WARN_STYLE, marginBottom: 6 }}>
            {screenState.reason === 'denied'
              ? 'Multi-monitor placement was not allowed — permission was denied.'
              : screenState.message}
          </p>
          <p style={NOTE_STYLE}>
            Fallback: open a panel as a separate window and drag it to the
            other monitor manually. No cast is recorded for a manual
            window — the app cannot tell which screen it ends up on, so
            it never claims a cast it cannot see.
          </p>
        </div>
      )}

      {/* One card per detected screen, with what is cast/pinned to it. */}
      {screens &&
        screens.map((screen, i) => {
          const screenCasts = castsForScreen(screen);
          const screenPinned = pinnedForScreen(screen);
          return (
            <div key={`${screen.label}-${screen.availLeft}-${screen.availTop}-${i}`} style={SCREEN_CARD_STYLE}>
              <div style={SCREEN_HEAD_STYLE}>
                <Monitor size={15} color="#00B7FF" />
                <span>{formatScreenLabel(screen, i)}</span>
                {screen.isPrimary && <span style={BADGE_PRIMARY_STYLE}>PRIMARY</span>}
                {screen.isCurrent && <span style={BADGE_CURRENT_STYLE}>THIS SCREEN</span>}
              </div>
              <div style={SCREEN_META_STYLE}>
                Resolution {screen.width}×{screen.height} · Available area{' '}
                {screen.availWidth}×{screen.availHeight} · Position ({screen.availLeft},{' '}
                {screen.availTop})
                {screen.label && screen.label !== 'Display'
                  ? ` · Reported label: ${screen.label}`
                  : ' · No display name reported by the OS'}
              </div>

              <div style={GROUP_LABEL_STYLE}>Cast to this screen</div>
              {screenCasts.length === 0 ? (
                <p style={NOTE_STYLE}>Nothing cast to this screen.</p>
              ) : (
                screenCasts.map((cast) => {
                  const status = getCastStatus(cast.panelId);
                  return (
                    <div key={cast.panelId} style={ROW_STYLE}>
                      <Cast size={13} color={status.status === 'active' ? '#8B5CFF' : '#fbbf24'} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <strong>{cast.title}</strong>{' '}
                        <span style={{ color: status.status === 'active' ? '#c4b5fd' : '#fbbf24' }}>
                          {status.status === 'active' ? 'CAST TO' : 'LAST CAST'}
                        </span>
                        <span style={{ color: '#9ca3af' }}>
                          {' '}
                          · {cast.screen.description ?? cast.screen.label} ·{' '}
                          {new Date(cast.castAt).toLocaleString()}
                        </span>
                      </span>
                      <button
                        type="button"
                        style={SMALL_BUTTON_STYLE}
                        onClick={() => stopCast(cast.panelId)}
                      >
                        Stop cast
                      </button>
                    </div>
                  );
                })
              )}

              <div style={GROUP_LABEL_STYLE}>Pinned to this screen</div>
              {screenPinned.length === 0 ? (
                <p style={NOTE_STYLE}>No pinned panel was last opened on this screen.</p>
              ) : (
                screenPinned.map((panel) => (
                  <div key={panel.id} style={ROW_STYLE}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong>{panel.title}</strong>{' '}
                      <span style={{ color: '#9ca3af' }}>
                        · {panel.open ? 'Open' : 'Closed'} · last opened on {panel.screenLabel}
                      </span>
                    </span>
                    {panel.open ? (
                      <button
                        type="button"
                        style={SMALL_BUTTON_STYLE}
                        onClick={() => setPanelOpen(panel.id, false)}
                      >
                        Close
                      </button>
                    ) : (
                      <button
                        type="button"
                        style={SMALL_BUTTON_STYLE}
                        onClick={() => setPanelOpen(panel.id, true)}
                      >
                        Reopen
                      </button>
                    )}
                    <button
                      type="button"
                      style={SMALL_BUTTON_STYLE}
                      onClick={() => unpinPanel(panel.id)}
                    >
                      Unpin
                    </button>
                  </div>
                ))
              )}
            </div>
          );
        })}

      {/* Casts whose screen is no longer in the detected list. */}
      {screens && orphanCasts.length > 0 && (
        <div style={SCREEN_CARD_STYLE}>
          <div style={SCREEN_HEAD_STYLE}>
            <Monitor size={15} color="#fbbf24" />
            <span>Screen no longer detected</span>
          </div>
          <p style={{ ...WARN_STYLE, marginTop: 6 }}>{MONITOR_NOT_DETECTED_MESSAGE}</p>
          {orphanCasts.map((cast) => {
            const status = getCastStatus(cast.panelId);
            return (
              <div key={cast.panelId} style={ROW_STYLE}>
                <Cast size={13} color="#fbbf24" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{cast.title}</strong>{' '}
                  <span style={{ color: '#fbbf24' }}>
                    {status.status === 'active' ? 'CAST TO' : 'LAST CAST'}
                  </span>
                  <span style={{ color: '#9ca3af' }}>
                    {' '}
                    · {cast.screen.description ?? cast.screen.label} ·{' '}
                    {new Date(cast.castAt).toLocaleString()}
                  </span>
                </span>
                <button
                  type="button"
                  style={SMALL_BUTTON_STYLE}
                  onClick={() => stopCast(cast.panelId)}
                >
                  Stop cast
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Pinned panels with no screen assignment. */}
      {unassignedPinned.length > 0 && (
        <div style={SCREEN_CARD_STYLE}>
          <div style={SCREEN_HEAD_STYLE}>
            <Monitor size={15} color="#9ca3af" />
            <span>This screen / not assigned to a monitor</span>
          </div>
          <p style={{ ...NOTE_STYLE, marginTop: 6 }}>
            Pinned panels with no recorded screen — they live on this screen
            until opened on a monitor.
          </p>
          {unassignedPinned.map((panel) => (
            <div key={panel.id} style={ROW_STYLE}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong>{panel.title}</strong>{' '}
                <span style={{ color: '#9ca3af' }}>
                  · {panel.open ? 'Open' : 'Closed'}
                  {panel.screenLabel ? ` · last opened: ${panel.screenLabel}` : ''}
                </span>
              </span>
              {panel.open ? (
                <button
                  type="button"
                  style={SMALL_BUTTON_STYLE}
                  onClick={() => setPanelOpen(panel.id, false)}
                >
                  Close
                </button>
              ) : (
                <button
                  type="button"
                  style={SMALL_BUTTON_STYLE}
                  onClick={() => setPanelOpen(panel.id, true)}
                >
                  Reopen
                </button>
              )}
              <button
                type="button"
                style={SMALL_BUTTON_STYLE}
                onClick={() => unpinPanel(panel.id)}
              >
                Unpin
              </button>
            </div>
          ))}
        </div>
      )}

      {screens && screens.length === 0 && (
        <p style={WARN_STYLE}>
          No screens were detected. {MONITOR_NOT_DETECTED_MESSAGE}
        </p>
      )}

      {screenState.status === 'unavailable' && casts.length > 0 && (
        <p style={{ ...NOTE_STYLE, marginBottom: 12 }}>
          Saved cast records below are last-known only — without screen
          access the app cannot confirm which monitor they are on.
        </p>
      )}

      {/* Cast / open-on-monitor controls for a chosen pinned panel. */}
      <div style={{ marginTop: 16 }}>
        <div style={SECTION_TITLE_STYLE}>Cast or open a panel on a monitor</div>
        {pinned.length === 0 ? (
          <p style={NOTE_STYLE}>
            No pinned panels yet — pin any pop-out panel first, then cast it
            or open it on a monitor from here. (Any pop-out panel also has
            its own Cast / Monitor buttons.)
          </p>
        ) : (
          <>
            <label style={{ ...NOTE_STYLE, display: 'block', marginBottom: 6 }}>
              Panel:{' '}
              <select
                value={pickerPanel?.id ?? ''}
                onChange={(e) => setPickerPanelId(e.target.value)}
                style={{
                  marginLeft: 4,
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: '1px solid #2a3348',
                  background: '#1f2937',
                  color: '#e5e7eb',
                  fontSize: 12,
                  maxWidth: '100%',
                }}
              >
                {pinned.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            {pickerPanel && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: 10,
                }}
              >
                <div>
                  <div style={GROUP_LABEL_STYLE}>Cast</div>
                  <CastPicker panelId={pickerPanel.id} title={pickerPanel.title} />
                </div>
                <div>
                  <div style={GROUP_LABEL_STYLE}>Open on monitor</div>
                  <ScreenPicker panelId={pickerPanel.id} />
                </div>
              </div>
            )}
            <p style={{ ...NOTE_STYLE, marginTop: 8 }}>{MONITOR_NOT_DETECTED_MESSAGE}</p>
          </>
        )}
      </div>

      {/* Full pinned-panel management list (reopen / close / unpin / cast). */}
      <div style={{ marginTop: 16 }}>
        <div style={SECTION_TITLE_STYLE}>All pinned panels</div>
        <PinnedList />
      </div>
    </div>
  );
}
