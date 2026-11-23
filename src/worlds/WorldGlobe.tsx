import React, { useState } from 'react';
import {
  Globe,
  Compass,
  Train,
  MapPin,
  Radio,
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

// Node positions are map markers only — no live telemetry exists in this
// build. Latency, load, and status are honestly NO_DATA / NOT_CONNECTED.
interface EarthNode {
  id: string;
  name: string;
  region: string;
  coords: string;
  x: number;
  y: number;
}

const GLOBE_VIEWS: { id: GlobeViewMode; label: string; subtitle: string }[] = [
  { id: 'Command', label: 'Command', subtitle: 'Master multi-domain view — no live feed connected' },
  { id: 'Realistic Earth', label: 'Realistic Earth', subtitle: 'Topographic & atmospheric surface mesh' },
  { id: 'Earnings', label: 'Earnings', subtitle: 'Non-crypto income & local yield corridors' },
  { id: 'Crypto', label: 'Crypto', subtitle: 'On-chain liquidity & validator clusters' },
  { id: 'Opportunities', label: 'Opportunities', subtitle: 'High-signal arbitrage & local bounties' },
  { id: 'Asset', label: 'Asset', subtitle: 'Physical, real-world & equity custody nodes' },
  { id: 'Intelligence', label: 'Intelligence', subtitle: 'Geopolitical, macro & threat synthesis' },
];

const EARTH_NODES: EarthNode[] = [
  { id: 'nyc-01', name: 'NYC-CORE-01', region: 'North America · East', coords: '40.7128° N, 74.0060° W', x: 28, y: 36 },
  { id: 'lon-02', name: 'LON-EDGE-02', region: 'Europe · West', coords: '51.5072° N, 0.1276° W', x: 49, y: 29 },
  { id: 'tyo-03', name: 'TYO-MESH-03', region: 'Asia-Pacific · East', coords: '35.6762° N, 139.6503° E', x: 82, y: 39 },
  { id: 'sao-04', name: 'SAO-RELAY-04', region: 'South America · East', coords: '23.5505° S, 46.6333° W', x: 34, y: 69 },
  { id: 'sgp-05', name: 'SGP-VAULT-05', region: 'Asia-Pacific · South', coords: '1.3521° N, 103.8198° E', x: 75, y: 57 },
];

// Domain radars carry no score in this build: no live feed is connected,
// so no score, signal, or alert count is claimed.
const DOMAIN_RADARS: DomainRadarKey[] = ['Opportunity', 'Earnings', 'Crypto', 'Asset', 'Security'];

export interface WorldGlobeProps {
  onSelectWorld?: (world: string) => void;
}

export const WorldGlobe: React.FC<WorldGlobeProps> = ({ onSelectWorld }) => {
  const [activeView, setActiveView] = useState<GlobeViewMode>('Command');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(EARTH_NODES[0].id);
  const [selectedRadar, setSelectedRadar] = useState<DomainRadarKey>('Opportunity');

  const selectedNode = EARTH_NODES.find((n) => n.id === selectedNodeId) ?? EARTH_NODES[0];
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
          <span className="px-3 py-1.5 rounded-lg border border-[#1E273B] bg-[#111623] text-slate-300 text-xs font-mono font-semibold">
            NOT_CONNECTED · NO_DATA
          </span>
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

      {/* Main Grid: Interactive Earth Explorer + Transit Departures */}
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
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #1E273B 1px, transparent 1px), linear-gradient(to bottom, #1E273B 1px, transparent 1px)',
                backgroundSize: '36px 36px',
              }}
            />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-56 w-56 rounded-full border border-sky-500/20 bg-sky-500/5" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full border border-sky-400/20" />

            {EARTH_NODES.map((node) => {
              const isSelected = node.id === selectedNode.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono transition ${
                    isSelected
                      ? 'border-sky-400 bg-sky-500/20 text-white'
                      : 'border-[#1E273B] bg-[#111623]/90 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-sky-400' : 'bg-slate-500'}`} />
                  <span>{node.name}</span>
                </button>
              );
            })}
          </div>

          {/* Selected Node — honest state only */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 rounded-lg border border-[#1E273B] bg-[#111623] p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-sky-400" />
                  <span className="text-sm font-semibold text-white">{selectedNode.name}</span>
                  <span className="text-xs text-slate-400">· {selectedNode.region}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-200 border border-[#1E273B]">
                  NOT_CONNECTED
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Map marker only — no live feed is connected for this node, so no telemetry, status, or alert
                is claimed.
              </p>
              <div className="text-[11px] font-mono text-slate-500">COORDS: {selectedNode.coords}</div>
            </div>

            <div className="rounded-lg border border-[#1E273B] bg-[#111623] p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">LATENCY</span>
                <span className="font-mono text-white">NO_DATA</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">NODE LOAD</span>
                <span className="font-mono text-white">NO_DATA</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">ALERTS</span>
                <span className="font-mono text-white">NO_DATA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transit Departures Panel — no live feed in this build */}
        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Train className="h-4 w-4 text-sky-400" />
              <h2 className="text-sm font-semibold tracking-wide text-white">TRANSIT DEPARTURES</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#111623] border border-[#1E273B] text-slate-300">
              NOT_CONNECTED
            </span>
          </div>

          <div className="rounded-lg border border-[#1E273B] bg-[#111623] p-3 space-y-1.5">
            <p className="text-xs text-slate-300">
              No transit feed is connected in this build. No departures, stops, routes, or arrival times are
              shown — no stop IDs or minutes-away figures are claimed.
            </p>
            <p className="text-[11px] font-mono text-slate-500">DEPARTURES: NO_DATA · PROVIDER: NOT_CONNECTED</p>
          </div>
        </div>
      </div>

      {/* 5 Domain Radars — no scores in this build */}
      <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-semibold tracking-wide text-white">5 DOMAIN RADARS</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">ACTIVE SELECTION: {selectedRadar.toUpperCase()}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {DOMAIN_RADARS.map((key) => {
            const isSelected = key === selectedRadar;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedRadar(key)}
                className={`rounded-xl border p-3.5 text-left transition ${
                  isSelected
                    ? 'border-sky-400 bg-[#111623]'
                    : 'border-[#1E273B] bg-[#111623] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{key}</span>
                  <span className="text-xs font-mono font-semibold text-slate-400">NO_DATA</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  No live feed connected — no score, signal, or alert count is claimed for this domain.
                </p>
                <div className="mt-2 text-[10px] font-mono text-slate-500">STATUS: NOT_CONNECTED</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorldGlobe;
