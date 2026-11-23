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
import {
  WorldMapEngine,
  type MapEngineStatus,
  type MapViewReport,
} from './WorldMapEngine';

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

// No transit feed is connected in this build. No departures, stops,
// routes, or arrival times are shown — no stop IDs or minutes-away
// figures are claimed. The real Transitland capability lives in the
// vanilla app; wiring it into this map is Phase 2 work.

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
  const baseLabel =
    engineStatus.base === 'RASTER'
      ? 'OSM RASTER'
      : engineStatus.base === 'FLOOR'
        ? 'VECTOR FLOOR'
        : 'ENGINE UNAVAILABLE';

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-6 space-y-5">
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
            <span className="text-[11px] font-mono text-[#B8B8B8]">DRAG TO PAN · SCROLL TO ZOOM · FETCH ON SETTLE</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-white/10 bg-[#0b0b0b] text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
              Transitland Proxy: READY (Not Polled)
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
              markers={[]}
              onViewChange={handleViewChange}
              onStatusChange={setEngineStatus}
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
                  No crypto pins exist on the flat map. The Sphere lens lands in
                  step 5 — until then, Crypto World holds the 24 contents and 56
                  workspaces.
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
            </div>
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
              <div>MARKERS PLACED: 0 — no verified locations</div>
            </div>
            <p className="text-xs text-[#B8B8B8]">
              Markers appear only for records with verified locations. Every
              layer's record set is currently empty or unconnected, so the map
              honestly places none.
            </p>
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
