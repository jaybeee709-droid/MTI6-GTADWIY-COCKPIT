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
import {
  WorldMapEngine,
  type MapEngineStatus,
  type MapViewReport,
} from './WorldMapEngine';

export interface WorldGlobeProps {
  onSelectWorld?: (world: WorldId) => void;
  viewMode?: ViewMode;
}

type GlobeViewId =
  | 'command'
  | 'realistic'
  | 'transitland'
  | 'macro'
  | 'local'
  | 'earnings'
  | 'crypto'
  | 'opportunities'
  | 'asset'
  | 'intelligence';

interface GlobeViewMeta {
  id: GlobeViewId;
  label: string;
  subtitle: string;
}

const GLOBE_VIEWS: GlobeViewMeta[] = [
  { id: 'command', label: 'Command', subtitle: 'Master multi-domain view — no live feed connected' },
  { id: 'realistic', label: 'Realistic Earth', subtitle: 'Topographic & atmospheric surface mesh' },
  { id: 'transitland', label: 'Transitland', subtitle: 'Transitland proxy standby — READY (Not Polled)' },
  { id: 'macro', label: 'Macro', subtitle: 'Macro economic indicators — no live feed connected' },
  { id: 'local', label: 'Local', subtitle: 'Local municipal & corridor layer — no live feed connected' },
  { id: 'earnings', label: 'Earnings', subtitle: 'Non-crypto income & local yield corridors — no live feed connected' },
  { id: 'crypto', label: 'Crypto', subtitle: 'On-chain liquidity & validator clusters — no live feed connected' },
  { id: 'opportunities', label: 'Opportunities', subtitle: 'High-signal arbitrage & local bounties — no live feed connected' },
  { id: 'asset', label: 'Asset', subtitle: 'Physical, real-world & equity custody nodes — no live feed connected' },
  { id: 'intelligence', label: 'Intelligence', subtitle: 'Geopolitical, macro & threat synthesis — no live feed connected' },
];

const LAYER_STATUS: Record<GlobeViewId, { label: string; statusText: string }> = {
  command: { label: 'Command', statusText: 'STANDBY — Command layer active; awaiting live multi-domain telemetry.' },
  realistic: { label: 'Realistic Earth', statusText: 'STANDBY — Realistic Earth base projection; satellite overlay not connected.' },
  transitland: { label: 'Transitland', statusText: 'READY (Not Polled) — Transitland proxy ready; no live route query executed.' },
  macro: { label: 'Macro', statusText: 'NO DATA — Macro indicator feed not connected in this build.' },
  local: { label: 'Local', statusText: 'NO DATA — Local corridor & municipal layer awaiting regional feed.' },
  crypto: { label: 'Crypto', statusText: 'NOT CONNECTED — Crypto RPC offline; no on-chain layer telemetry.' },
  earnings: { label: 'Earnings', statusText: 'NO DATA — Earnings calendar & filings stream not connected.' },
  opportunities: { label: 'Opportunities', statusText: 'NO DATA — Opportunity scanner in standby; no live signals.' },
  asset: { label: 'Asset', statusText: 'NO DATA — Asset custody & valuation layer awaiting feed.' },
  intelligence: { label: 'Intelligence', statusText: 'UNMEASURED — Intelligence layer awaiting STAR backend connection.' },
};

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
  const [activeView, setActiveView] = useState<GlobeViewId>('command');
  const [activeLayers, setActiveLayers] = useState<GlobeViewId[]>(['command']);
  const toggleLayer = (id: GlobeViewId) => {
    setActiveView(id);
    setActiveLayers((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((item) => item !== id) : prev) : [...prev, id],
    );
  };
  // Log lines are UI events only (the engine initialized, the zoom
  // level changed). No line claims a live feed, a latency, or an alert.
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

  const handleViewChange = (report: MapViewReport) => {
    setMapView(report);
    if (report.level !== lastLevelRef.current) {
      lastLevelRef.current = report.level;
      setActivityLog((prev) =>
        [`[ZOOM] Level: ${report.level} (z${report.zoom.toFixed(1)})`, ...prev].slice(0, 8),
      );
    }
  };

  const currentViewMeta = GLOBE_VIEWS.find((v) => v.id === activeView) ?? GLOBE_VIEWS[0];
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
                {activeView.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-[#B8B8B8]">{currentViewMeta.subtitle}</p>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {GLOBE_VIEWS.map((view) => {
          const isActive = view.id === activeView;
          return (
            <button
              key={view.id}
              type="button"
              onClick={() => setActiveView(view.id)}
              className={`px-3 py-2.5 rounded-lg border text-left transition ${
                isActive
                  ? 'bg-[#151515] border-[#00B7FF] text-white'
                  : 'bg-[#101010] border-white/10 text-[#B8B8B8] hover:border-[#00B7FF]/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold truncate">{view.label}</span>
                <Layers className={`h-3.5 w-3.5 ${isActive ? 'text-[#00B7FF]' : 'text-white/30'}`} />
              </div>
            </button>
          );
        })}
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
            <WorldMapEngine onViewChange={handleViewChange} onStatusChange={setEngineStatus} />
            <div className="absolute top-2 left-2 right-2 z-10 pointer-events-none flex flex-col gap-1.5">
              <div className="pointer-events-auto flex flex-wrap gap-1">
                {(Object.keys(LAYER_STATUS) as GlobeViewId[]).map((layerId) => {
                  const isOn = activeLayers.includes(layerId);
                  return (
                    <button
                      key={layerId}
                      type="button"
                      onClick={() => toggleLayer(layerId)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                        isOn
                          ? 'bg-[#00B7FF]/20 border-[#00B7FF] text-white'
                          : 'bg-[#0b0b0b]/85 border-white/15 text-[#B8B8B8] hover:border-[#00B7FF]/50'
                      }`}
                    >
                      {LAYER_STATUS[layerId].label}
                    </button>
                  );
                })}
              </div>
              <div className="pointer-events-auto inline-flex items-center gap-2 self-start px-2.5 py-1 rounded bg-[#0b0b0b]/90 border border-[#00B7FF]/30 text-[11px] font-mono text-[#B8B8B8]">
                <span className="text-[#00B7FF] font-semibold">{LAYER_STATUS[activeView].label}:</span>
                <span>{LAYER_STATUS[activeView].statusText}</span>
              </div>
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
            </div>
            <p className="text-xs text-[#B8B8B8]">
              Markers appear only for records with verified locations — none are
              placed in this build. The Natural Earth vector floor is always
              beneath the tiles, so the map is never blank.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-2">
            <div className="text-xs font-mono text-[#00B7FF]">COVERAGE HERE</div>
            <div className="text-xs text-[#B8B8B8] space-y-1 font-mono">
              <div>Viewport centre: {fmtLon(mapView.lon)} · {fmtLat(mapView.lat)}</div>
              <div>Active Layers: {activeLayers.map((id) => LAYER_STATUS[id].label).join(', ')}</div>
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
