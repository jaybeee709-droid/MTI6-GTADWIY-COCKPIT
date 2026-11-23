import React, { useState } from 'react';
import {
  Globe,
  Activity,
  Shield,
  TrendingUp,
  Zap,
  Compass,
  Radio,
  AlertTriangle,
  Train,
  MapPin,
  Layers,
  Cpu,
  Eye,
} from 'lucide-react';

export type GlobeViewMode =
  | 'Command'
  | 'Realistic Earth'
  | 'Earnings'
  | 'Crypto'
  | 'Opportunities'
  | 'Asset'
  | 'Intelligence';

export type DomainRadarKey = 'Opportunity' | 'Earnings' | 'Crypto' | 'Asset' | 'Security';

interface EarthNode {
  id: string;
  name: string;
  region: string;
  coords: string;
  x: number;
  y: number;
  status: 'NOMINAL' | 'ALERT' | 'MONITORING';
  latencyMs: number;
  loadPct: number;
  summary: string;
}

interface TransitDeparture {
  id: string;
  stopName: string;
  stopId: string;
  route: string;
  headsign: string;
  minutesAway: number;
  status: 'ON TIME' | 'DELAYED';
}

interface DomainRadar {
  key: DomainRadarKey;
  score: number;
  signal: string;
  activeAlerts: number;
  status: 'NOMINAL' | 'ALERT';
}

const GLOBE_VIEWS: { id: GlobeViewMode; label: string; subtitle: string }[] = [
  { id: 'Command', label: 'Command', subtitle: 'Master multi-domain telemetry & orbital lock' },
  { id: 'Realistic Earth', label: 'Realistic Earth', subtitle: 'Topographic & atmospheric surface mesh' },
  { id: 'Earnings', label: 'Earnings', subtitle: 'Non-crypto income & local yield corridors' },
  { id: 'Crypto', label: 'Crypto', subtitle: 'On-chain liquidity & validator clusters' },
  { id: 'Opportunities', label: 'Opportunities', subtitle: 'High-signal arbitrage & local bounties' },
  { id: 'Asset', label: 'Asset', subtitle: 'Physical, real-world & equity custody nodes' },
  { id: 'Intelligence', label: 'Intelligence', subtitle: 'Geopolitical, macro & threat synthesis' },
];

const EARTH_NODES: EarthNode[] = [
  {
    id: 'nyc-01',
    name: 'NYC-CORE-01',
    region: 'North America · East',
    coords: '40.7128° N, 74.0060° W',
    x: 28,
    y: 36,
    status: 'NOMINAL',
    latencyMs: 12,
    loadPct: 44,
    summary: 'Primary command uplink & Transitland Northeast feed active.',
  },
  {
    id: 'lon-02',
    name: 'LON-EDGE-02',
    region: 'Europe · West',
    coords: '51.5072° N, 0.1276° W',
    x: 49,
    y: 29,
    status: 'ALERT',
    latencyMs: 68,
    loadPct: 89,
    summary: 'Active alert: Elevated FX & settlement spread anomaly detected.',
  },
  {
    id: 'tyo-03',
    name: 'TYO-MESH-03',
    region: 'Asia-Pacific · East',
    coords: '35.6762° N, 139.6503° E',
    x: 82,
    y: 39,
    status: 'NOMINAL',
    latencyMs: 24,
    loadPct: 51,
    summary: 'APAC telemetry nominal; low-latency transit & market feeds synced.',
  },
  {
    id: 'sao-04',
    name: 'SAO-RELAY-04',
    region: 'South America · East',
    coords: '23.5505° S, 46.6333° W',
    x: 34,
    y: 69,
    status: 'MONITORING',
    latencyMs: 41,
    loadPct: 63,
    summary: 'Regional liquidity & local opportunity scanner calibrating.',
  },
  {
    id: 'sgp-05',
    name: 'SGP-VAULT-05',
    region: 'Asia-Pacific · South',
    coords: '1.3521° N, 103.8198° E',
    x: 75,
    y: 57,
    status: 'ALERT',
    latencyMs: 74,
    loadPct: 92,
    summary: 'Active alert: RPC finality jitter threshold exceeded.',
  },
];

const TRANSITLAND_DEPARTURES: TransitDeparture[] = [
  {
    id: 'dep-1',
    stopName: 'Grand Central Terminal',
    stopId: 's-dr5rs-grandcentral',
    route: '4 · Lexington Exp',
    headsign: 'Woodlawn',
    minutesAway: 2,
    status: 'ON TIME',
  },
  {
    id: 'dep-2',
    stopName: 'Grand Central Terminal',
    stopId: 's-dr5rs-grandcentral',
    route: '7 · Flushing Exp',
    headsign: '34 St-Hudson Yards',
    minutesAway: 5,
    status: 'ON TIME',
  },
  {
    id: 'dep-3',
    stopName: 'Penn Station · Track 12',
    stopId: 's-dr5ru-pennstation',
    route: 'LIRR · Babylon',
    headsign: 'Babylon Express',
    minutesAway: 9,
    status: 'DELAYED',
  },
  {
    id: 'dep-4',
    stopName: 'Fulton Center Hub',
    stopId: 's-dr5re-fulton',
    route: 'A · 8 Ave Express',
    headsign: 'Inwood-207 St',
    minutesAway: 11,
    status: 'ON TIME',
  },
];

const DOMAIN_RADARS: DomainRadar[] = [
  { key: 'Opportunity', score: 86, signal: '14 high-fit leads indexed', activeAlerts: 0, status: 'NOMINAL' },
  { key: 'Earnings', score: 91, signal: 'Non-crypto yield corridors open', activeAlerts: 0, status: 'NOMINAL' },
  { key: 'Crypto', score: 72, signal: 'Read-only telemetry · RPC jitter', activeAlerts: 1, status: 'ALERT' },
  { key: 'Asset', score: 88, signal: 'Custody & valuation baseline steady', activeAlerts: 0, status: 'NOMINAL' },
  { key: 'Security', score: 64, signal: '1 active boundary alert in LON-EDGE-02', activeAlerts: 1, status: 'ALERT' },
];

export interface WorldGlobeProps {
  onSelectWorld?: (world: string) => void;
}

export const WorldGlobe: React.FC<WorldGlobeProps> = ({ onSelectWorld }) => {
  const [activeView, setActiveView] = useState<GlobeViewMode>('Command');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(EARTH_NODES[0].id);
  const [selectedRadar, setSelectedRadar] = useState<DomainRadarKey>('Opportunity');

  const selectedNode = EARTH_NODES.find((n) => n.id === selectedNodeId) ?? EARTH_NODES[0];
  const activeAlerts = EARTH_NODES.filter((n) => n.status === 'ALERT');
  const currentViewMeta = GLOBE_VIEWS.find((v) => v.id === activeView) ?? GLOBE_VIEWS[0];

  return (
    <div className="min-h-screen bg-[#06070B] text-slate-100 p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#111623] border border-[#1E273B] flex items-center justify-center text-sky-400">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-wide text-white">WORLD GLOBE · MASTER COMMAND</h1>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#111623] border border-[#1E273B] text-sky-300">
                {activeView.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400">{currentViewMeta.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeAlerts.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FF3B30] bg-[#FF3B30]/10 text-[#FF3B30] text-xs font-mono font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{activeAlerts.length} ACTIVE ALERTS</span>
            </div>
          )}
          {onSelectWorld && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectWorld('crypto')}
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#111623] border border-[#1E273B] hover:border-sky-400 text-slate-200 transition"
              >
                OPEN CRYPTO
              </button>
              <button
                type="button"
                onClick={() => onSelectWorld('earnings')}
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#111623] border border-[#1E273B] hover:border-[#32D74B] text-slate-200 transition"
              >
                OPEN EARNINGS
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 7 World Globe Views Switcher */}
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
                  ? 'bg-[#111623] border-sky-400 text-white shadow-sm'
                  : 'bg-[#0C0F17] border-[#1E273B] text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold truncate">{view.label}</span>
                <Eye className={`h-3.5 w-3.5 ${isActive ? 'text-sky-400' : 'text-slate-600'}`} />
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-1 truncate">VIEW · {view.id.toUpperCase()}</div>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Interactive Earth Explorer + Transitland Departures */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Interactive Earth Region / Node Explorer */}
        <div className="xl:col-span-2 border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-sky-400" />
              <h2 className="text-sm font-semibold tracking-wide text-white">INTERACTIVE EARTH REGION &amp; NODE EXPLORER</h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">LAYER: {activeView.toUpperCase()}</span>
          </div>

          {/* Orbital Projection Canvas */}
          <div className="relative h-72 rounded-xl border border-[#1E273B] bg-gradient-to-b from-[#080B14] via-[#0B1222] to-[#06080F] overflow-hidden">
            {/* Grid Lines */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #1E273B 1px, transparent 1px), linear-gradient(to bottom, #1E273B 1px, transparent 1px)',
                backgroundSize: '36px 36px',
              }}
            />
            {/* Globe Sphere Ring */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-56 w-56 rounded-full border border-sky-500/20 bg-sky-500/5" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full border border-sky-400/20" />

            {EARTH_NODES.map((node) => {
              const isSelected = node.id === selectedNode.id;
              const isAlert = node.status === 'ALERT';
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono transition ${
                    isAlert
                      ? 'border-[#FF3B30] bg-[#FF3B30]/15 text-[#FF3B30]'
                      : isSelected
                      ? 'border-sky-400 bg-sky-500/20 text-white'
                      : 'border-[#1E273B] bg-[#111623]/90 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isAlert ? 'bg-[#FF3B30] animate-pulse' : isSelected ? 'bg-sky-400' : 'bg-emerald-400'
                    }`}
                  />
                  <span>{node.name}</span>
                </button>
              );
            })}
          </div>

          {/* Selected Node Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 rounded-lg border border-[#1E273B] bg-[#111623] p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-sky-400" />
                  <span className="text-sm font-semibold text-white">{selectedNode.name}</span>
                  <span className="text-xs text-slate-400">· {selectedNode.region}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    selectedNode.status === 'ALERT'
                      ? 'bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]'
                      : 'bg-slate-800 text-slate-200 border border-[#1E273B]'
                  }`}
                >
                  {selectedNode.status}
                </span>
              </div>
              <p className="text-xs text-slate-300">{selectedNode.summary}</p>
              <div className="text-[11px] font-mono text-slate-500">COORDS: {selectedNode.coords}</div>
            </div>

            <div className="rounded-lg border border-[#1E273B] bg-[#111623] p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">LATENCY</span>
                <span className="font-mono text-white">{selectedNode.latencyMs} ms</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">NODE LOAD</span>
                <span className="font-mono text-white">{selectedNode.loadPct}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#06070B] overflow-hidden mt-1">
                <div
                  className={`h-full ${selectedNode.status === 'ALERT' ? 'bg-[#FF3B30]' : 'bg-sky-400'}`}
                  style={{ width: `${selectedNode.loadPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Transitland Stop Departures Panel */}
        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Train className="h-4 w-4 text-sky-400" />
              <h2 className="text-sm font-semibold tracking-wide text-white">TRANSITLAND STOP DEPARTURES</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#111623] border border-[#1E273B] text-slate-300">
              LIVE FEED
            </span>
          </div>

          <div className="space-y-2.5">
            {TRANSITLAND_DEPARTURES.map((dep) => {
              const isDelayed = dep.status === 'DELAYED';
              return (
                <div
                  key={dep.id}
                  className="rounded-lg border border-[#1E273B] bg-[#111623] p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{dep.stopName}</div>
                    <div className="text-[11px] font-mono text-sky-300 truncate">{dep.route}</div>
                    <div className="text-[11px] text-slate-400 truncate">To {dep.headsign}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-semibold text-white">{dep.minutesAway} min</div>
                    <div
                      className={`text-[10px] font-mono font-semibold ${
                        isDelayed ? 'text-[#FF3B30]' : 'text-slate-400'
                      }`}
                    >
                      {dep.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5 Domain Radars */}
      <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-semibold tracking-wide text-white">5 DOMAIN RADARS</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">ACTIVE SELECTION: {selectedRadar.toUpperCase()}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {DOMAIN_RADARS.map((radar) => {
            const isAlert = radar.status === 'ALERT';
            const isSelected = radar.key === selectedRadar;
            const Icon =
              radar.key === 'Opportunity'
                ? Zap
                : radar.key === 'Earnings'
                ? TrendingUp
                : radar.key === 'Crypto'
                ? Cpu
                : radar.key === 'Asset'
                ? Layers
                : Shield;

            return (
              <button
                key={radar.key}
                type="button"
                onClick={() => setSelectedRadar(radar.key)}
                className={`rounded-xl border p-3.5 text-left transition ${
                  isAlert
                    ? 'border-[#FF3B30] bg-[#FF3B30]/5'
                    : isSelected
                    ? 'border-sky-400 bg-[#111623]'
                    : 'border-[#1E273B] bg-[#111623] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${isAlert ? 'text-[#FF3B30]' : 'text-sky-400'}`} />
                    <span className="text-xs font-semibold text-white">{radar.key}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-200">{radar.score}/100</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">{radar.signal}</p>
                <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                  <span className={isAlert ? 'text-[#FF3B30] font-semibold' : 'text-slate-500'}>
                    {isAlert ? `${radar.activeAlerts} ACTIVE ALERT` : 'NOMINAL'}
                  </span>
                  <Activity className={`h-3 w-3 ${isAlert ? 'text-[#FF3B30]' : 'text-slate-600'}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorldGlobe;
