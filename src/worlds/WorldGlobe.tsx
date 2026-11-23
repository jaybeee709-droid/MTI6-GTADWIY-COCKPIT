import React, { useRef, useState } from 'react';
import {
  Activity,
  Globe,
  Layers,
  MapPin,
  Radio,
  Train,
} from 'lucide-react';

import type { ViewMode, WorldId } from '../App';
import { useCockpitDb } from '../hooks/useCockpitDb';
import { MTI6_LAYER } from '../tokens';
import { EARNINGS_LOCATION_RULES } from '../world-data';
import { fmtTime, useProvenanceLog } from '../live-data';
import {
  WorldMapEngine,
  type MapEngineStatus,
  type MapMarker,
  type MapViewReport,
} from './WorldMapEngine';
import { CryptoSphere } from './CryptoSphere';
import { SPACE_BG } from './CryptoWorld';
import { ALL_ADAPTERS } from '../provider-adapters';

export interface WorldGlobeProps {
  onSelectWorld?: (world: WorldId) => void;
  viewMode?: ViewMode;
}

/* The canonical layer system (Phase 2, step 4 — owner directive
 * 2026-11-23). Eight layers on ONE map: base is always on; the other
 * seven toggle. A layer places a marker ONLY for a record with a
 * verified location — in this build every layer's record set is
 * empty or unconnected, so the map honestly carries zero markers,
 * and each layer's status line says why. */
type LayerId =
  | 'base'
  | 'crypto'
  | 'earnings'
  | 'opportunities'
  | 'positions'
  | 'transit'
  | 'security'
  | 'intelligence';

interface LayerMeta {
  id: LayerId;
  label: string;
  accent: string;
  statusText: string;
}

const earningsRuleCounts = (() => {
  const counts = { PLACE_BOUND: 0, PIN_FROM_RECORD: 0, NEVER: 0 };
  for (const rule of Object.values(EARNINGS_LOCATION_RULES)) counts[rule] += 1;
  return counts;
})();

const LAYERS: LayerMeta[] = [
  {
    id: 'base',
    label: 'Base',
    accent: MTI6_LAYER.all,
    statusText: 'ALWAYS ON — Natural Earth vector floor + keyless OSM raster. The map is never blank.',
  },
  {
    id: 'crypto',
    label: 'Crypto',
    accent: MTI6_LAYER.crypto,
    statusText:
      'SPHERE-ONLY (owner ruling D6) — crypto never pins the flat map; it opens as the Sphere lens. Zero verified crypto locations exist.',
  },
  {
    id: 'earnings',
    label: 'Earnings',
    accent: MTI6_LAYER.earnings,
    statusText: `LOCATION RULES (D4) — place-bound ${earningsRuleCounts.PLACE_BOUND} · pin-from-record ${earningsRuleCounts.PIN_FROM_RECORD} · never located ${earningsRuleCounts.NEVER}. Recorded opportunities: 0 — no pins placed.`,
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    accent: MTI6_LAYER.all,
    statusText: 'NO DATA — the opportunity pipeline holds zero records; nothing exists to place.',
  },
  {
    id: 'positions',
    label: 'Positions',
    accent: MTI6_LAYER.all,
    statusText: 'UNAVAILABLE — no account or wallet is connected; no position has a location to show.',
  },
  {
    id: 'transit',
    label: 'Transit',
    accent: MTI6_LAYER.all,
    statusText: 'READY (Not Polled) — Transitland proxy ready; no route query executed, no stops placed.',
  },
  {
    id: 'security',
    label: 'Security',
    accent: MTI6_LAYER.all,
    statusText:
      'UNMEASURED — AngelSecurity has no verified active alerts in this build. The map turns red only for a CONFIRMED, active alert.',
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    accent: MTI6_LAYER.all,
    statusText: 'UNMEASURED — intelligence layer awaiting STAR backend connection.',
  },
];

const DOMAIN_RADARS: { id: string; label: string; world: WorldId; status: string }[] = [
  { id: 'opportunity-radar', label: 'Opportunity Radar', world: 'opportunities', status: 'STANDBY · NO DATA' },
  { id: 'earnings-radar', label: 'Earnings Radar', world: 'earnings', status: 'STANDBY · NO DATA' },
  { id: 'crypto-radar', label: 'Crypto Radar', world: 'crypto', status: 'RPC NOT CONNECTED' },
  { id: 'asset-radar', label: 'Asset Radar', world: 'positions', status: 'STANDBY · NO DATA' },
  { id: 'security-radar', label: 'Security Radar', world: 'security', status: 'UNMEASURED · NO DATA' },
];

// Transit (A2/A3, 2026-11-23): stops and departures come only from
// the /api/mti6 proxy (Transitland), on the owner's explicit query —
// never polled, never invented. Without a configured server key the
// panel says NOT_CONFIGURED and places nothing.

function fmtLon(lon: number): string {
  return `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
}
function fmtLat(lat: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
}

export const WorldGlobe: React.FC<WorldGlobeProps> = ({ onSelectWorld }) => {
  const cockpitDb = useCockpitDb();
  const [activeLayers, setActiveLayers] = useState<LayerId[]>(['base']);
  const [focusedLayer, setFocusedLayer] = useState<LayerId>('base');
  const [sphereOpen, setSphereOpen] = useState<boolean>(false);
  const provenance = useProvenanceLog();
  // Live transit (A2): stops fetched through the /api/mti6 proxy
  // (Transitland) for the map centre, on the owner's explicit query —
  // never auto-polled. These are the map's first real markers: each
  // carries a location the source itself published.
  const [transitStops, setTransitStops] = useState<MapMarker[]>([]);
  const [transitQuery, setTransitQuery] = useState<{
    state: 'idle' | 'loading' | 'ok' | 'error';
    message: string;
    fetchedAt: number | null;
  }>({ state: 'idle', message: 'NOT QUERIED — the proxy is ready; nothing has been polled.', fetchedAt: null });
  const [selectedStop, setSelectedStop] = useState<MapMarker | null>(null);
  // stop_key per marker id (Onestop ID or feed key from the stops
  // response) — the departures lookup key. A stop whose response
  // carried no key simply has no entry, and says so when asked.
  const [stopKeys, setStopKeys] = useState<Record<string, string>>({});
  const [departures, setDepartures] = useState<{
    state: 'idle' | 'loading' | 'ok' | 'error';
    message: string;
    rows: { time: string; label: string }[];
    fetchedAt: number | null;
  }>({ state: 'idle', message: '', rows: [], fetchedAt: null });
  // The concept sheet's TODAY / TOMORROW tabs — the proxy already
  // accepts relative_date, so the tab is a real second query.
  const [departuresDay, setDeparturesDay] = useState<'TODAY' | 'TOMORROW'>('TODAY');

  const queryDepartures = async (stop: MapMarker, day: 'TODAY' | 'TOMORROW' = departuresDay) => {
    const key = stopKeys[stop.id];
    if (!key) {
      setDepartures({
        state: 'error',
        message: 'This stop carried no Transitland lookup key in the stops response — departures cannot be queried for it.',
        rows: [],
        fetchedAt: null,
      });
      return;
    }
    if (typeof fetch !== 'function') {
      setDepartures({ state: 'error', message: 'NO FETCH IN THIS ENVIRONMENT.', rows: [], fetchedAt: null });
      return;
    }
    setDepartures({ state: 'loading', message: 'QUERYING DEPARTURES…', rows: [], fetchedAt: null });
    try {
      const res = await fetch('/api/mti6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transit.departures',
          payload: { stop_key: key, limit: 8, include_alerts: false, relative_date: day },
        }),
      });
      const env = (await res.json().catch(() => null)) as
        | { ok?: boolean; data?: unknown; error?: { code?: string } }
        | null;
      if (!env || !env.ok) {
        const code = env?.error?.code ?? 'UPSTREAM_ERROR';
        setDepartures({
          state: 'error',
          message:
            code === 'AUTH_REQUIRED'
              ? 'NOT_CONFIGURED — no Transitland key is set on the server.'
              : code === 'NOT_FOUND'
                ? 'NOT_FOUND — Transitland has no departures record for this stop.'
                : `DEPARTURES QUERY FAILED (${code}).`,
          rows: [],
          fetchedAt: null,
        });
        return;
      }
      const data = env.data as {
        departures?: unknown[];
        stop?: { departures?: unknown[] };
      } | null;
      const list = data?.departures ?? data?.stop?.departures ?? [];
      const rows: { time: string; label: string }[] = [];
      for (const raw of list) {
        if (!raw || typeof raw !== 'object') continue;
        const d = raw as Record<string, unknown>;
        const stopTime = d.stop_time as Record<string, unknown> | undefined;
        const trip = d.trip as Record<string, unknown> | undefined;
        const route = trip?.route as Record<string, unknown> | undefined;
        const rawTime =
          d.departure_time ?? d.arrival_time ?? stopTime?.departure_time ?? stopTime?.arrival_time;
        let time = '—';
        if (typeof rawTime === 'string') {
          const parsed = new Date(rawTime);
          time = Number.isNaN(parsed.getTime())
            ? rawTime
            : parsed.toLocaleTimeString('en-US', { hour12: false });
        } else if (typeof rawTime === 'number') {
          time = new Date(rawTime * 1000).toLocaleTimeString('en-US', { hour12: false });
        }
        const label =
          (typeof route?.route_short_name === 'string' && route.route_short_name) ||
          (typeof route?.route_long_name === 'string' && route.route_long_name) ||
          (typeof trip?.headsign === 'string' && trip.headsign) ||
          (typeof d.headsign === 'string' && d.headsign) ||
          'Route';
        rows.push({ time, label: String(label) });
        if (rows.length >= 8) break;
      }
      setDepartures({
        state: 'ok',
        message:
          rows.length > 0
            ? `${rows.length} UPCOMING DEPARTURE${rows.length === 1 ? '' : 'S'} (SCHEDULED FEED DATA).`
            : `NO DEPARTURES RETURNED FOR THIS STOP ${day}.`,
        rows,
        fetchedAt: Date.now(),
      });
    } catch {
      setDepartures({ state: 'error', message: 'DEPARTURES QUERY FAILED (NETWORK).', rows: [], fetchedAt: null });
    }
  };

  const queryTransitStops = async () => {
    if (typeof fetch !== 'function') {
      setTransitQuery({ state: 'error', message: 'NO FETCH IN THIS ENVIRONMENT.', fetchedAt: null });
      return;
    }
    setTransitQuery({ state: 'loading', message: 'QUERYING TRANSITLAND VIA THE PROXY…', fetchedAt: null });
    try {
      const res = await fetch('/api/mti6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transit.stopsNear',
          payload: { lat: mapView.lat, lon: mapView.lon, radius: 1500, limit: 25 },
        }),
      });
      const env = (await res.json().catch(() => null)) as
        | { ok?: boolean; data?: unknown; error?: { code?: string; message?: string } }
        | null;
      if (!env || !env.ok) {
        const code = env?.error?.code ?? 'UPSTREAM_ERROR';
        setTransitQuery({
          state: 'error',
          message:
            code === 'AUTH_REQUIRED'
              ? 'NOT_CONFIGURED — no Transitland key is set on the server (Netlify TRANSITLAND_API_KEY). No stops are shown.'
              : `QUERY FAILED (${code}) — no stops are shown.`,
          fetchedAt: null,
        });
        setTransitStops([]);
        return;
      }
      const data = env.data as { stops?: unknown[] } | null;
      const stops: MapMarker[] = [];
      const keys: Record<string, string> = {};
      if (data && Array.isArray(data.stops)) {
        data.stops.forEach((raw, i) => {
          if (!raw || typeof raw !== 'object') return;
          const s = raw as Record<string, unknown>;
          let lat: number | null = null;
          let lon: number | null = null;
          const geom = s.geometry as { coordinates?: unknown } | undefined;
          if (geom && Array.isArray(geom.coordinates)) {
            lon = typeof geom.coordinates[0] === 'number' ? geom.coordinates[0] : null;
            lat = typeof geom.coordinates[1] === 'number' ? geom.coordinates[1] : null;
          }
          if (lat === null || lon === null) {
            const la = s.stop_lat ?? s.lat ?? s.latitude;
            const lo = s.stop_lon ?? s.lon ?? s.longitude;
            lat = typeof la === 'number' ? la : null;
            lon = typeof lo === 'number' ? lo : null;
          }
          if (lat === null || lon === null) return;
          const name =
            typeof s.stop_name === 'string'
              ? s.stop_name
              : typeof s.name === 'string'
                ? s.name
                : 'Transit stop';
          const id =
            typeof s.onestop_id === 'string'
              ? s.onestop_id
              : typeof s.id === 'string' || typeof s.id === 'number'
                ? String(s.id)
                : `stop-${i}`;
          stops.push({ id, lat, lon, label: name, color: MTI6_LAYER.all });
          const key =
            typeof s.onestop_id === 'string'
              ? s.onestop_id
              : typeof s.id === 'string' || typeof s.id === 'number'
                ? String(s.id)
                : null;
          if (key) keys[id] = key;
        });
      }
      setTransitStops(stops);
      setStopKeys(keys);
      setDepartures({ state: 'idle', message: '', rows: [], fetchedAt: null });
      setTransitQuery({
        state: 'ok',
        message: `${stops.length} STOP${stops.length === 1 ? '' : 'S'} WITHIN 1.5 KM OF THE MAP CENTRE.`,
        fetchedAt: Date.now(),
      });
    } catch {
      setTransitQuery({ state: 'error', message: 'QUERY FAILED (NETWORK) — no stops are shown.', fetchedAt: null });
      setTransitStops([]);
    }
  };
  // Log lines are UI events only (the engine initialized, a layer was
  // toggled, the zoom level changed). No line claims a live feed, a
  // latency, or an alert.
  const [activityLog, setActivityLog] = useState<string[]>([
    '[SYNC] Flat map engine initialized — Natural Earth vector floor',
    '[STATUS] Base imagery: keyless chain — OSM raster over the vector floor',
    '[STATUS] No live feed connected — map layers NOT_CONNECTED',
  ]);
  const [mapView, setMapView] = useState<MapViewReport>({
    lon: 0,
    lat: 18.6,
    zoom: 1.15,
    level: 'World',
  });
  const [engineStatus, setEngineStatus] = useState<MapEngineStatus>({
    base: 'FLOOR',
    tileZoom: 0,
    tilesLoaded: 0,
    tilesFailed: 0,
  });
  const lastLevelRef = useRef<string>('World');

  const toggleLayer = (id: LayerId) => {
    if (id === 'base') {
      setFocusedLayer('base');
      return; // base is always on — it cannot be toggled off
    }
    const on = !activeLayers.includes(id);
    setActiveLayers(on ? [...activeLayers, id] : activeLayers.filter((item) => item !== id));
    setFocusedLayer(on ? id : 'base');
    const meta = LAYERS.find((l) => l.id === id);
    setActivityLog((log) =>
      [
        `[LAYER] ${meta?.label} ${on ? 'ON' : 'OFF'} — ${on ? meta?.statusText : 'layer hidden'}`,
        ...log,
      ].slice(0, 8),
    );
  };

  const handleViewChange = (report: MapViewReport) => {
    setMapView(report);
    if (report.level !== lastLevelRef.current) {
      lastLevelRef.current = report.level;
      setActivityLog((prev) =>
        [`[ZOOM] Level: ${report.level} (z${report.zoom.toFixed(1)})`, ...prev].slice(0, 8),
      );
    }
  };

  const focusedMeta = LAYERS.find((l) => l.id === focusedLayer) ?? LAYERS[0];
  const cryptoOn = activeLayers.includes('crypto');
  const transitOn = activeLayers.includes('transit');
  const baseLabel =
    engineStatus.base === 'RASTER'
      ? 'OSM RASTER'
      : engineStatus.base === 'FLOOR'
        ? 'VECTOR FLOOR'
        : 'ENGINE UNAVAILABLE';

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-6 space-y-5" style={SPACE_BG}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border border-[#00B7FF]/25 bg-[#101010] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#050505] border border-[#00B7FF]/50 flex items-center justify-center text-[#00B7FF]">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold tracking-wide text-white">WORLD MAP · MASTER COMMAND</h1>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#050505] border border-[#00B7FF]/40 text-[#00B7FF]">
                {activeLayers.length} LAYER{activeLayers.length === 1 ? '' : 'S'} ON
              </span>
            </div>
            <p className="text-xs text-[#B8B8B8]">
              One flat map — every world is a layer on it. No second map exists.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg border border-white/15 bg-[#151515] text-[#B8B8B8] text-xs font-mono">
            READ-ONLY · NOT CONNECTED
          </span>
          {onSelectWorld && (
            <>
              <button
                type="button"
                onClick={() => onSelectWorld('crypto')}
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#151515] border border-[#00B7FF]/40 text-[#00B7FF] hover:bg-[#00B7FF]/10 transition"
              >
                OPEN CRYPTO
              </button>
              <button
                type="button"
                onClick={() => onSelectWorld('earnings')}
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#151515] border border-[#8B5CFF]/40 text-[#8B5CFF] hover:bg-[#8B5CFF]/10 transition"
              >
                OPEN EARNINGS
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 rounded-xl border border-[#00B7FF]/25 bg-[#050505] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#101010]">
            <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
              <Radio className="h-3.5 w-3.5" />
              <span>FLAT WORLD MAP · WEBGL PLANE — {mapView.level.toUpperCase()}</span>
            </div>
            <span className="hidden text-[11px] font-mono text-[#B8B8B8] md:inline">DRAG TO PAN · SCROLL TO ZOOM · FETCH ON SETTLE</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-white/10 bg-[#0b0b0b] text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
              Transitland Proxy:{' '}
              {transitQuery.state === 'ok'
                ? `LIVE · ${transitStops.length} STOPS`
                : transitQuery.state === 'error'
                  ? 'QUERY FAILED'
                  : 'READY (Not Polled)'}
            </span>
            <span className="px-2 py-0.5 rounded border border-[#00B7FF]/40 bg-[#00B7FF]/10 text-[#00B7FF]">
              World Engine: 957 Nodes
            </span>
            <span className="px-2 py-0.5 rounded border border-[#00B7FF]/40 bg-[#00B7FF]/10 text-[#00B7FF]">
              Base: {baseLabel}
            </span>
            <span className="px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300">
              STAR Backend: NOT CONNECTED
            </span>
            <span className="px-2 py-0.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300">
              Crypto RPC: NOT CONNECTED
            </span>
            <span className="px-2 py-0.5 rounded border border-[#00B7FF]/40 bg-[#00B7FF]/10 text-[#00B7FF]">CockpitDB: {cockpitDb.status} ({cockpitDb.storeCount} stores)</span>
          </div>

          <div className="relative w-full h-[58dvh] min-h-[340px] md:aspect-[2/1] md:h-auto xl:aspect-none xl:flex-1 xl:min-h-[460px] bg-[#050505]">
            <WorldMapEngine
              markers={transitOn ? transitStops : []}
              onViewChange={handleViewChange}
              onStatusChange={setEngineStatus}
              onMarkerSelect={(m) => {
                setSelectedStop(m);
                setDepartures({ state: 'idle', message: '', rows: [], fetchedAt: null });
                setDeparturesDay('TODAY');
              }}
            />
            {/* Layer chips — 44px touch targets at every tier (the
                Phase 1 chips were ~18px and failed the rule). Phone:
                overlay, scrolls horizontally. Tablet/Desktop: overlay,
                wraps. Ultra-wide: the chips move to a LEFT RAIL
                (owner ruling R2). */}
            <div className="absolute top-2 left-2 right-2 z-10 pointer-events-none flex flex-col gap-1.5 2xl:right-auto 2xl:bottom-2 2xl:w-48">
              <div className="pointer-events-auto flex gap-1.5 overflow-x-auto md:flex-wrap md:overflow-visible 2xl:flex-col 2xl:flex-nowrap 2xl:overflow-visible">
                {LAYERS.map((layer) => {
                  const isOn = activeLayers.includes(layer.id);
                  const isFocused = focusedLayer === layer.id;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => toggleLayer(layer.id)}
                      aria-pressed={isOn}
                      className={`flex h-11 shrink-0 items-center gap-2 rounded-lg border px-3 font-mono text-[11px] transition ${
                        isOn
                          ? 'bg-[#0b0b0b]/90 text-white'
                          : 'bg-[#0b0b0b]/85 border-white/15 text-[#B8B8B8] hover:border-white/40'
                      } ${isFocused ? 'ring-1 ring-[#0080FF]' : ''}`}
                      style={
                        isOn
                          ? { borderColor: layer.accent, color: '#FFFFFF' }
                          : undefined
                      }
                    >
                      <Layers
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: isOn ? layer.accent : '#B8B8B8' }}
                      />
                      <span className="whitespace-nowrap">{layer.label}</span>
                      <span className="font-mono text-[9px] text-[#B8B8B8]">
                        {layer.id === 'base' ? 'ALWAYS' : isOn ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="pointer-events-auto inline-flex max-w-full items-center gap-2 self-start px-2.5 py-1 rounded bg-[#0b0b0b]/90 border border-[#00B7FF]/30 text-[11px] font-mono text-[#B8B8B8] 2xl:self-stretch">
                <span className="font-semibold shrink-0" style={{ color: focusedMeta.accent }}>
                  {focusedMeta.label}:
                </span>
                <span className="truncate">{focusedMeta.statusText}</span>
              </div>
              {/* D6: with Crypto on, the flat map carries this notice
                  instead of pins — the sphere is the crypto view. */}
              {cryptoOn && (
                <div className="pointer-events-auto self-start rounded border border-[#8B5CFF]/50 bg-[#0b0b0b]/90 px-2.5 py-2 font-mono text-[11px] text-[#B8B8B8] 2xl:self-stretch">
                  <span className="font-semibold text-[#8B5CFF]">CRYPTO IS SPHERE-ONLY.</span>{' '}
                  No crypto pins exist on the flat map — crypto opens as a
                  relationship lens over it.
                  <button
                    type="button"
                    onClick={() => setSphereOpen(true)}
                    className="ml-2 font-semibold text-white underline decoration-[#8B5CFF] underline-offset-2"
                  >
                    OPEN SPHERE
                  </button>
                  {onSelectWorld && (
                    <button
                      type="button"
                      onClick={() => onSelectWorld('crypto')}
                      className="ml-2 font-semibold text-white underline decoration-[#8B5CFF] underline-offset-2"
                    >
                      OPEN CRYPTO WORLD
                    </button>
                  )}
                </div>
              )}
              {/* Live transit: an explicit query (never a poll) places
                  real stops — the map's first sourced markers. */}
              {transitOn && (
                <div className="pointer-events-auto self-start rounded border border-[#00B7FF]/50 bg-[#0b0b0b]/90 px-2.5 py-2 font-mono text-[11px] text-[#B8B8B8] 2xl:self-stretch">
                  <span className="font-semibold text-[#00B7FF]">TRANSIT — LIVE QUERY.</span>{' '}
                  {transitQuery.message}
                  {transitQuery.fetchedAt !== null && (
                    <>
                      {' '}
                      SOURCE: TRANSITLAND · FETCHED{' '}
                      {new Date(transitQuery.fetchedAt).toLocaleTimeString('en-US', { hour12: false })}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={queryTransitStops}
                    disabled={transitQuery.state === 'loading'}
                    className="ml-2 font-semibold text-white underline decoration-[#00B7FF] underline-offset-2 disabled:opacity-50"
                  >
                    {transitQuery.state === 'loading' ? 'QUERYING…' : 'QUERY STOPS NEAR CENTRE'}
                  </button>
                  {selectedStop && (
                    <div className="mt-1 hidden border-t border-white/10 pt-1 md:block">
                      STOP: <span className="text-white">{selectedStop.label}</span> ·{' '}
                      {selectedStop.lat.toFixed(5)}, {selectedStop.lon.toFixed(5)} · SOURCE:
                      TRANSITLAND
                      <button
                        type="button"
                        onClick={() => queryDepartures(selectedStop)}
                        disabled={departures.state === 'loading'}
                        className="ml-2 font-semibold text-white underline decoration-[#00B7FF] underline-offset-2 disabled:opacity-50"
                      >
                        {departures.state === 'loading' ? 'QUERYING…' : 'DEPARTURES'}
                      </button>
                      {departures.state !== 'idle' && (
                        <div className="mt-1">
                          <div>{departures.message}</div>
                          {departures.rows.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {departures.rows.map((r, i) => (
                                <li key={i} className="flex justify-between gap-3">
                                  <span className="truncate">{r.label}</span>
                                  <span className="shrink-0 text-white">{r.time}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {departures.fetchedAt !== null && (
                            <div>
                              SOURCE: TRANSITLAND · FETCHED{' '}
                              {new Date(departures.fetchedAt).toLocaleTimeString('en-US', {
                                hour12: false,
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Phone bottom sheet (Gemini transit concept adoption,
                2026-11-23): on phone widths the selected stop's
                departures present as a sheet over the map instead of
                the overlay block (which is md+ only). Same state, same
                query — presentation only. */}
            {transitOn && selectedStop && (
              <div className="absolute inset-x-2 bottom-2 z-20 rounded-xl border border-[#00B7FF]/50 bg-[#0b0b0b]/95 p-3 font-mono text-[11px] text-[#B8B8B8] md:hidden">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white">Stop Departures</div>
                    <div className="truncate">{selectedStop.label}</div>
                    <div>
                      {selectedStop.lat.toFixed(5)}, {selectedStop.lon.toFixed(5)} · SOURCE:
                      TRANSITLAND
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close stop departures"
                    onClick={() => setSelectedStop(null)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {(['TODAY', 'TOMORROW'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDeparturesDay(d);
                        if (departures.state !== 'idle') void queryDepartures(selectedStop, d);
                      }}
                      className={`flex h-11 flex-1 items-center justify-center rounded-lg border ${
                        departuresDay === d
                          ? 'border-[#00B7FF]/60 bg-[#00B7FF]/10 text-white'
                          : 'border-white/15 text-[#B8B8B8]'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => void queryDepartures(selectedStop)}
                    disabled={departures.state === 'loading'}
                    className="flex h-11 flex-1 items-center justify-center rounded-lg border border-[#00B7FF]/60 font-semibold text-white disabled:opacity-50"
                  >
                    {departures.state === 'loading' ? 'QUERYING…' : 'DEPARTURES'}
                  </button>
                </div>
                {departures.state !== 'idle' && (
                  <div className="mt-2">
                    <div>{departures.message}</div>
                    {departures.rows.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {departures.rows.map((r, i) => (
                          <li key={i} className="flex justify-between gap-3">
                            <span className="truncate">{r.label}</span>
                            <span className="shrink-0 text-white">{r.time}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {departures.fetchedAt !== null && (
                      <div>
                        DATA POWERED BY TRANSITLAND · SCHEDULED FEED DATA · FETCHED{' '}
                        {new Date(departures.fetchedAt).toLocaleTimeString('en-US', {
                          hour12: false,
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* The Sphere lens overlays the map panel — the map stays
                home underneath; closing the lens returns to it. */}
            {sphereOpen && cryptoOn && (
              <CryptoSphere onClose={() => setSphereOpen(false)} />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[#00B7FF]/25 bg-[#101010] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#00B7FF]" />
                <h2 className="text-sm font-semibold">Map Position</h2>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#00B7FF]/15 text-[#00B7FF] border border-[#00B7FF]/40">
                {baseLabel}
              </span>
            </div>
            <div className="text-xs text-[#B8B8B8] space-y-1 font-mono">
              <div>CENTRE: {fmtLon(mapView.lon)} · {fmtLat(mapView.lat)}</div>
              <div>LEVEL: {mapView.level} · z{mapView.zoom.toFixed(1)}</div>
              <div>TILES: {engineStatus.tilesLoaded} loaded · {engineStatus.tilesFailed} failed (floor beneath)</div>
              <div>TERRAIN: CANDIDATE — hillshade not rendered</div>
              <div>
                MARKERS PLACED: {transitOn ? transitStops.length : 0}
                {transitOn && transitStops.length > 0
                  ? ' — Transitland stops (sourced locations)'
                  : ' — no verified locations'}
              </div>
            </div>
            <p className="text-xs text-[#B8B8B8]">
              Markers appear only for records with verified locations. Today
              that means the Transitland stops you query for; every other
              layer's record set is empty or unconnected, so the map honestly
              places none of theirs.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-2">
            <div className="text-xs font-mono text-[#00B7FF]">PROVIDER CONTRACTS</div>
            <div className="space-y-1">
              {ALL_ADAPTERS.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 font-mono text-[10px]"
                >
                  <span className="truncate text-[#B8B8B8]">{a.provider}</span>
                  <span
                    className={`shrink-0 ${
                      a.status === 'PLANNED' || a.status === 'NOT_CONNECTED'
                        ? 'text-[#FFB020]'
                        : 'text-white'
                    }`}
                  >
                    {a.status}
                    {a.status === 'PLANNED' ? ' · NOT WIRED' : ''}
                  </span>
                </div>
              ))}
            </div>
            <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
              KEYED PROVIDERS: OWNER APPROVAL + NETLIFY PROXY ONLY (D1) —
              PLANNED MEANS REGISTERED, NEVER CALLED.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-[#00B7FF]">DATA PROVENANCE — THIS SESSION</div>
              <span className="font-mono text-[10px] text-[#B8B8B8]">{provenance.length}</span>
            </div>
            {provenance.length === 0 ? (
              <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                NO OBSERVATIONS YET — visit Crypto Market or Crypto World and
                every live figure the app serves registers here with its
                source, status, and fetch time. Failures register too.
              </p>
            ) : (
              <div className="space-y-1">
                {provenance.slice(0, 12).map((r) => (
                  <div
                    key={r.key}
                    className="flex items-center justify-between gap-2 font-mono text-[10px]"
                  >
                    <span className="truncate text-[#B8B8B8]">{r.label}</span>
                    <span className="shrink-0 text-white">
                      {r.source ?? '—'} ·{' '}
                      <span
                        style={{
                          color:
                            r.status === 'LIVE'
                              ? '#32D74B'
                              : r.status === 'CACHED'
                                ? '#00B7FF'
                                : r.status === 'STALE'
                                  ? '#FFB020'
                                  : '#B8B8B8',
                        }}
                      >
                        {r.status}
                      </span>
                      {r.fetchedAt !== null && <> · {fmtTime(r.fetchedAt)}</>}
                    </span>
                  </div>
                ))}
                {provenance.length > 12 && (
                  <p className="font-mono text-[9px] text-[#B8B8B8]">
                    + {provenance.length - 12} MORE — the newest 12 are shown.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-2">
            <div className="text-xs font-mono text-[#00B7FF]">COVERAGE HERE</div>
            <div className="text-xs text-[#B8B8B8] space-y-1 font-mono">
              <div>Viewport centre: {fmtLon(mapView.lon)} · {fmtLat(mapView.lat)}</div>
              <div>
                Active Layers:{' '}
                {activeLayers
                  .map((id) => LAYERS.find((l) => l.id === id)?.label)
                  .filter(Boolean)
                  .join(', ')}
              </div>
              <div>Data Coverage: NO DATA / PARTIAL</div>
              <div>Live Telemetry: UNMEASURED</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-2">
            <div className="text-xs font-mono text-[#00B7FF]">COCKPIT HEALTH</div>
            <div className="text-xs text-[#B8B8B8] space-y-1 font-mono">
              <div>System Health: PARTIAL</div>
              <div>STAR Status: DISCONNECTED</div>
              <div>Bot Status: PROPOSE-ONLY</div>
              <div>Data Status: {cockpitDb.status} ({cockpitDb.storeCount} stores)</div>
              <div>Security Status: UNMEASURED</div>
              <div>Alerts: UNMEASURED</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
              <Activity className="h-3.5 w-3.5" />
              <span>ACTIVITY LOG</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px] text-[#B8B8B8]">
              {activityLog.map((entry, idx) => (
                <div key={idx} className="p-1.5 rounded bg-[#151515] border-l-2 border-[#00B7FF]">
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {DOMAIN_RADARS.map((radar) => (
          <button
            key={radar.id}
            type="button"
            onClick={() => onSelectWorld?.(radar.world)}
            className="text-left rounded-xl border border-white/10 bg-[#101010] hover:border-[#00B7FF]/60 p-3 transition space-y-1"
          >
            <div className="text-xs font-semibold text-white">{radar.label}</div>
            <div className="text-[10px] font-mono text-[#B8B8B8]">{radar.status}</div>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Train className="h-4 w-4 text-[#00B7FF]" />
            <span>Transitland Stop Departures</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#151515] border border-white/15 text-[#B8B8B8]">
            NOT_CONNECTED
          </span>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#151515] p-3 space-y-1">
          <p className="text-xs text-[#B8B8B8]">
            No transit feed is connected in this build. No departures, stops, routes, or arrival times are
            shown — no stop IDs or minutes-away figures are claimed.
          </p>
          <p className="text-[11px] font-mono text-white/40">DEPARTURES: NO_DATA · PROVIDER: NOT_CONNECTED</p>
        </div>
      </div>
    </div>
  );
};
