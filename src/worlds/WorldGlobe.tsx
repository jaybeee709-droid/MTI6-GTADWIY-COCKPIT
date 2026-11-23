import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Globe,
  Layers,
  MapPin,
  Radio,
  Train,
} from 'lucide-react';

export interface WorldGlobeProps {
  onSelectWorld?: (world: string) => void;
}

type GlobeViewId =
  | 'command'
  | 'realistic'
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
  { id: 'command', label: 'Command', subtitle: 'Master vector telemetry & global node routing' },
  { id: 'realistic', label: 'Realistic Earth', subtitle: 'Orbital bathymetry, landmass & border layer' },
  { id: 'earnings', label: 'Earnings', subtitle: 'Non-crypto regional yield & settlement corridors' },
  { id: 'crypto', label: 'Crypto', subtitle: 'Read-only validator clusters & RPC latency' },
  { id: 'opportunities', label: 'Opportunities', subtitle: 'Regional scanner & expansion-gated pipelines' },
  { id: 'asset', label: 'Asset', subtitle: 'Physical & urban infrastructure telemetry' },
  { id: 'intelligence', label: 'Intelligence', subtitle: 'Macro signals, alerts & geopolitical feed' },
];

interface EarthRegionNode {
  id: string;
  name: string;
  region: string;
  x: number;
  y: number;
  latencyMs: number;
  status: 'NOMINAL' | 'ALERT';
  alertDetail?: string;
  routes: string;
}

const EARTH_NODES: EarthRegionNode[] = [
  { id: 'nyc', name: 'New York Hub', region: 'North America', x: 286, y: 174, latencyMs: 14, status: 'NOMINAL', routes: 'NYC -> LON / SFO / SAO' },
  { id: 'sfo', name: 'San Francisco', region: 'North America', x: 168, y: 182, latencyMs: 22, status: 'NOMINAL', routes: 'SFO -> TYO / NYC' },
  { id: 'lon', name: 'London Core', region: 'Europe', x: 486, y: 138, latencyMs: 18, status: 'NOMINAL', routes: 'LON -> NYC / FRA / DXB' },
  { id: 'fra', name: 'Frankfurt IX', region: 'Europe', x: 518, y: 146, latencyMs: 21, status: 'ALERT', alertDetail: 'Transit corridor congestion +42ms', routes: 'FRA -> LON / DXB / SIN' },
  { id: 'sao', name: 'Sao Paulo', region: 'South America', x: 356, y: 334, latencyMs: 48, status: 'NOMINAL', routes: 'SAO -> NYC / LON' },
  { id: 'dxb', name: 'Dubai Gateway', region: 'MENA', x: 632, y: 212, latencyMs: 36, status: 'NOMINAL', routes: 'DXB -> FRA / SIN' },
  { id: 'sin', name: 'Singapore Hub', region: 'Asia-Pacific', x: 766, y: 268, latencyMs: 29, status: 'NOMINAL', routes: 'SIN -> TYO / SYD / DXB' },
  { id: 'tyo', name: 'Tokyo Relay', region: 'Asia-Pacific', x: 844, y: 184, latencyMs: 19, status: 'ALERT', alertDetail: 'Subsea cable failover active', routes: 'TYO -> SFO / SIN' },
  { id: 'syd', name: 'Sydney Node', region: 'Oceania', x: 874, y: 366, latencyMs: 41, status: 'NOMINAL', routes: 'SYD -> SIN' },
];

const ROUTE_ARCS: Array<{ from: string; to: string; path: string }> = [
  { from: 'nyc', to: 'lon', path: 'M 286 174 Q 386 112 486 138' },
  { from: 'sfo', to: 'nyc', path: 'M 168 182 Q 227 154 286 174' },
  { from: 'nyc', to: 'sao', path: 'M 286 174 Q 338 250 356 334' },
  { from: 'lon', to: 'fra', path: 'M 486 138 Q 502 135 518 146' },
  { from: 'fra', to: 'dxb', path: 'M 518 146 Q 584 166 632 212' },
  { from: 'dxb', to: 'sin', path: 'M 632 212 Q 705 224 766 268' },
  { from: 'sin', to: 'tyo', path: 'M 766 268 Q 815 222 844 184' },
  { from: 'sin', to: 'syd', path: 'M 766 268 Q 828 310 874 366' },
  { from: 'sfo', to: 'tyo', path: 'M 168 182 Q 80 140 20 170' },
];

const TRANSITLAND_STOPS = [
  { stopId: 's-dr5r-pennstation', city: 'New York', line: 'AMTRAK / NJT NEC', nextDep: '04 min', status: 'ON TIME' },
  { stopId: 's-gcpvj-kingscross', city: 'London', line: 'Thameslink / LNER', nextDep: '07 min', status: 'ON TIME' },
  { stopId: 's-xn77h-shinjuku', city: 'Tokyo', line: 'JR Yamanote Line', nextDep: '02 min', status: 'DELAY +3m' },
  { stopId: 's-9q8yy-embarcadero', city: 'San Francisco', line: 'BART Yellow Line', nextDep: '06 min', status: 'ON TIME' },
];

const CONTINENT_PATHS = [
  'M 96 92 L 152 72 L 235 66 L 298 84 L 318 118 L 292 162 L 265 198 L 242 225 L 224 252 L 204 236 L 188 214 L 166 196 L 148 158 L 116 128 Z',
  'M 326 42 L 382 36 L 404 68 L 368 96 L 334 84 Z',
  'M 244 256 L 298 258 L 352 288 L 372 332 L 344 388 L 316 446 L 292 448 L 284 392 L 262 334 L 242 288 Z',
  'M 454 114 L 516 86 L 568 92 L 584 128 L 558 158 L 524 166 L 486 164 L 462 146 Z',
  'M 464 118 L 478 114 L 484 136 L 468 140 Z',
  'M 466 184 L 538 180 L 584 204 L 606 248 L 578 308 L 554 378 L 520 392 L 498 344 L 486 286 L 456 246 L 452 212 Z',
  'M 594 334 L 608 326 L 606 364 L 592 366 Z',
  'M 584 94 L 686 78 L 798 86 L 888 104 L 866 146 L 832 184 L 788 232 L 758 264 L 722 252 L 684 268 L 654 228 L 614 218 L 588 182 L 574 142 Z',
  'M 838 164 L 856 154 L 854 192 L 836 196 Z',
  'M 754 274 L 798 278 L 818 292 L 774 294 Z',
  'M 786 334 L 854 326 L 888 358 L 872 404 L 816 398 L 784 368 Z',
  'M 908 394 L 924 388 L 920 422 L 904 418 Z',
];

const COUNTRY_BORDERS = [
  'M 152 136 L 288 138',
  'M 176 202 L 236 212',
  'M 278 296 L 352 318',
  'M 294 358 L 348 368',
  'M 492 128 L 534 152',
  'M 464 236 L 576 238',
  'M 508 298 L 572 302',
  'M 622 152 L 784 156',
  'M 684 196 L 752 214',
];

export const WorldGlobe: React.FC<WorldGlobeProps> = ({ onSelectWorld }) => {
  const [activeView, setActiveView] = useState<GlobeViewId>('command');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(EARTH_NODES[0].id);
  const [activityLog, setActivityLog] = useState<string[]>([
    '[SYNC] Command vector grid initialized (#00B7FF)',
    '[ALERT] FRA Frankfurt IX latency spike (+42ms)',
    '[ALERT] TYO Tokyo Relay subsea failover active',
    '[TRANSIT] Transitland API feed staged (READ-ONLY)',
  ]);

  const selectedNode = EARTH_NODES.find((n) => n.id === selectedNodeId) ?? EARTH_NODES[0];
  const currentViewMeta = GLOBE_VIEWS.find((v) => v.id === activeView) ?? GLOBE_VIEWS[0];
  const isRealistic = activeView === 'realistic';
  const alertCount = EARTH_NODES.filter((n) => n.status === 'ALERT').length;

  const handleSelectRegion = (node: EarthRegionNode) => {
    setSelectedNodeId(node.id);
    setActivityLog((prev) => [
      `[FOCUS] ${node.name} (${node.region}) · ${node.status} · ${node.latencyMs}ms`,
      ...prev.slice(0, 7),
    ]);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border border-[#00B7FF]/25 bg-[#101010] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#050505] border border-[#00B7FF]/50 flex items-center justify-center text-[#00B7FF]">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold tracking-wide text-white">WORLD GLOBE · MASTER COMMAND</h1>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#050505] border border-[#00B7FF]/40 text-[#00B7FF]">
                {activeView.toUpperCase()}
              </span>
              {alertCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#FF3B30]/15 border border-[#FF3B30]/50 text-[#FF3B30]">
                  {alertCount} ACTIVE ALERTS
                </span>
              )}
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
        <div className="xl:col-span-3 rounded-xl border border-[#00B7FF]/25 bg-[#050505] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#101010]">
            <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
              <Radio className="h-3.5 w-3.5" />
              <span>EARTH VECTOR PROJECTION · {isRealistic ? 'REALISTIC BATHYMETRY' : 'COMMAND TELEMETRY'}</span>
            </div>
            <span className="text-[11px] font-mono text-[#B8B8B8]">CLICK REGION NODE TO INSPECT</span>
          </div>

          <div className="relative w-full aspect-[2/1] bg-[#050505]">
            <svg viewBox="0 0 1000 500" className="w-full h-full select-none">
              <defs>
                <radialGradient id="earthOcean" cx="50%" cy="50%" r="65%">
                  <stop offset="0%" stopColor={isRealistic ? '#0A2238' : '#080C12'} />
                  <stop offset="100%" stopColor="#050505" />
                </radialGradient>
              </defs>
              <rect width="1000" height="500" fill="url(#earthOcean)" />
              {[100, 200, 300, 400].map((y) => (
                <line key={`lat-${y}`} x1="0" y1={y} x2="1000" y2={y} stroke="#00B7FF" strokeOpacity="0.1" strokeDasharray="3 5" />
              ))}
              {[125, 250, 375, 500, 625, 750, 875].map((x) => (
                <line key={`lon-${x}`} x1={x} y1="0" x2={x} y2="500" stroke="#00B7FF" strokeOpacity="0.1" strokeDasharray="3 5" />
              ))}
              {CONTINENT_PATHS.map((d, i) => (
                <path
                  key={`land-${i}`}
                  d={d}
                  fill={isRealistic ? '#0E2E47' : '#0D141C'}
                  stroke="#00B7FF"
                  strokeOpacity={isRealistic ? 0.7 : 0.5}
                  strokeWidth="1.2"
                />
              ))}
              {COUNTRY_BORDERS.map((d, i) => (
                <path
                  key={`border-${i}`}
                  d={d}
                  fill="none"
                  stroke="#00B7FF"
                  strokeOpacity="0.35"
                  strokeWidth="0.9"
                  strokeDasharray="2 2"
                />
              ))}
              {ROUTE_ARCS.map((arc, idx) => (
                <path
                  key={`arc-${idx}`}
                  d={arc.path}
                  fill="none"
                  stroke="#00B7FF"
                  strokeOpacity="0.75"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              ))}
              {EARTH_NODES.map((node) => {
                const isSelected = node.id === selectedNode.id;
                const isAlert = node.status === 'ALERT';
                const nodeColor = isAlert ? '#FF3B30' : '#00B7FF';
                return (
                  <g key={node.id} onClick={() => handleSelectRegion(node)} className="cursor-pointer">
                    <circle cx={node.x} cy={node.y} r={isSelected ? 12 : 8} fill={nodeColor} fillOpacity={isSelected ? 0.28 : 0.16} />
                    <circle cx={node.x} cy={node.y} r={isSelected ? 5 : 3.5} fill={nodeColor} stroke="#050505" strokeWidth="1.5" />
                    <text x={node.x + 8} y={node.y + 3} fill={isSelected ? '#FFFFFF' : '#B8B8B8'} fontSize="10" fontFamily="monospace">
                      {node.id.toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[#00B7FF]/25 bg-[#101010] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className={`h-4 w-4 ${selectedNode.status === 'ALERT' ? 'text-[#FF3B30]' : 'text-[#00B7FF]'}`} />
                <h2 className="text-sm font-semibold">{selectedNode.name}</h2>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  selectedNode.status === 'ALERT'
                    ? 'bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/40'
                    : 'bg-[#00B7FF]/15 text-[#00B7FF] border border-[#00B7FF]/40'
                }`}
              >
                {selectedNode.status}
              </span>
            </div>
            <div className="text-xs text-[#B8B8B8] space-y-1 font-mono">
              <div>REGION: {selectedNode.region}</div>
              <div>LATENCY: {selectedNode.latencyMs} ms</div>
              <div>ROUTES: {selectedNode.routes}</div>
            </div>
            {selectedNode.alertDetail && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#FF3B30]/10 border border-[#FF3B30]/40 text-xs text-[#FF3B30]">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{selectedNode.alertDetail}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
              <Activity className="h-3.5 w-3.5" />
              <span>ACTIVITY LOG</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px] text-[#B8B8B8]">
              {activityLog.map((entry, idx) => (
                <div
                  key={idx}
                  className={`p-1.5 rounded bg-[#151515] border-l-2 ${
                    entry.includes('[ALERT]') ? 'border-[#FF3B30] text-[#FF3B30]' : 'border-[#00B7FF]'
                  }`}
                >
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Train className="h-4 w-4 text-[#00B7FF]" />
            <span>Transitland Stop Departures</span>
          </div>
          <span className="text-[11px] font-mono text-[#B8B8B8]">EXPANSION-GATED · LIVE API READY</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TRANSITLAND_STOPS.map((stop) => {
            const isDelay = stop.status.startsWith('DELAY');
            return (
              <div key={stop.stopId} className="p-3 rounded-lg bg-[#151515] border border-white/10 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{stop.city}</span>
                  <span className={`font-mono text-[11px] ${isDelay ? 'text-[#FF3B30]' : 'text-[#00B7FF]'}`}>
                    {stop.nextDep}
                  </span>
                </div>
                <div className="text-[11px] text-[#B8B8B8]">{stop.line}</div>
                <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                  <span className="text-white/40">{stop.stopId}</span>
                  <span className={isDelay ? 'text-[#FF3B30]' : 'text-[#32D74B]'}>{stop.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
