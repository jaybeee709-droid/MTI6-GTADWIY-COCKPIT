import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Coins,
  Cpu,
  Layers,
  Lock,
  Network,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  CRYPTO_WORLD_CONTENTS,
  CRYPTO_CONTENT_GROUPS,
  RULE_NOTE,
  MEMBERSHIP_RULE,
  type CryptoGroup,
} from '../worlds-data';

export type CryptoSectionId =
  | 'Dashboard'
  | 'Intelligence'
  | 'Networks'
  | 'Assets'
  | 'Protocols'
  | 'Activities'
  | 'Portfolio'
  | 'Positions'
  | 'Cost Engine'
  | 'Encyclopedia';

export interface CryptoWorldProps {
  onOpenWorkspaces?: () => void;
}

const VALIDATOR_METRICS = [
  { chain: 'Ethereum Beacon', uptime: '99.98%', apr: '3.42%', latency: '18ms', status: 'READ-ONLY' },
  { chain: 'Solana Mainnet', uptime: '99.91%', apr: '6.85%', latency: '11ms', status: 'NOT CONNECTED' },
  { chain: 'Cosmos Hub', uptime: '99.95%', apr: '14.20%', latency: '24ms', status: 'READ-ONLY' },
  { chain: 'Arbitrum One', uptime: '99.99%', apr: '1.80%', latency: '9ms', status: 'EXPANSION-GATED' },
];

const STAKING_PROTOCOLS = [
  { protocol: 'Lido stETH', apy: '3.4%', tvl: '$31.2B', pill: 'NOT CONNECTED' },
  { protocol: 'JitoSOL', apy: '7.1%', tvl: '$2.4B', pill: 'READ-ONLY' },
  { protocol: 'EigenLayer', apy: '4.8%', tvl: '$14.9B', pill: 'EXPANSION-GATED' },
  { protocol: 'Celestia TIA', apy: '11.4%', tvl: '$1.8B', pill: 'NOT CONNECTED' },
];

const BTC_CANDLES = [
  { t: '08:00', o: 91200, h: 92400, l: 90800, c: 92100 },
  { t: '10:00', o: 92100, h: 92950, l: 91600, c: 91850 },
  { t: '12:00', o: 91850, h: 93400, l: 91700, c: 93150 },
  { t: '14:00', o: 93150, h: 94100, l: 92800, c: 93900 },
  { t: '16:00', o: 93900, h: 94350, l: 92900, c: 93100 },
  { t: '18:00', o: 93100, h: 94800, l: 93050, c: 94620 },
  { t: '20:00', o: 94620, h: 95200, l: 94100, c: 94980 },
  { t: '22:00', o: 94980, h: 95500, l: 94400, c: 95240 },
];

const CRYPTO_EVENT_LOG = [
  '[SYNC] BTC/USD spot feed staged (READ-ONLY · NO EXECUTION)',
  '[VALIDATOR] Ethereum Beacon epoch finalized · 99.98% uptime',
  '[MEMPOOL] Priority fee 14 gwei · L2 blob fee nominal',
  '[GATE] Wallet & Exchange APIs locked (NOT CONNECTED)',
];

export const CryptoWorld: React.FC<CryptoWorldProps> = ({ onOpenWorkspaces }) => {
  const [selectedGroup, setSelectedGroup] = useState<CryptoGroup | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '1D'>('4H');

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CRYPTO_WORLD_CONTENTS.filter((item) => {
      const matchesGroup = selectedGroup === 'All' || item.group === selectedGroup;
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q);
      return matchesGroup && matchesQuery;
    });
  }, [selectedGroup, searchQuery]);

  const minPrice = 90500;
  const maxPrice = 95800;
  const priceToY = (p: number) => 170 - ((p - minPrice) / (maxPrice - minPrice)) * 150;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-6 space-y-5">
      {/* Header + Strict Domain & Connection Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border border-[#00B7FF]/30 bg-[#101010] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#050505] border border-[#00B7FF]/50 flex items-center justify-center text-[#00B7FF]">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold tracking-wide">CRYPTO INTEL COMMAND</h1>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#00B7FF]/15 border border-[#00B7FF]/40 text-[#00B7FF]">
                CRYPTO-ONLY DOMAIN
              </span>
            </div>
            <p className="text-xs text-[#B8B8B8]">{RULE_NOTE} · {MEMBERSHIP_RULE}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-[#151515] border border-[#00B7FF]/40 text-[#00B7FF]">
            READ-ONLY
          </span>
          <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-[#151515] border border-white/20 text-[#B8B8B8]">
            NOT CONNECTED
          </span>
          <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-[#151515] border border-[#8B5CFF]/40 text-[#8B5CFF]">
            EXPANSION-GATED
          </span>
          {onOpenWorkspaces && (
            <button
              type="button"
              onClick={onOpenWorkspaces}
              className="px-3 py-1 rounded text-xs font-mono bg-[#00B7FF] text-[#050505] font-semibold hover:opacity-90 transition"
            >
              CRYPTO WORKSPACES
            </button>
          )}
        </div>
      </div>

      {/* 3-Column Crypto Intel Command Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left Column: Validator Metrics */}
        <div className="xl:col-span-3 rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
              <Cpu className="h-4 w-4" />
              <span>VALIDATOR METRICS</span>
            </div>
            <span className="text-[10px] font-mono text-[#B8B8B8]">READ-ONLY</span>
          </div>
          <div className="space-y-2.5">
            {VALIDATOR_METRICS.map((v) => (
              <div key={v.chain} className="p-3 rounded-lg bg-[#151515] border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{v.chain}</span>
                  <span className="text-[#32D74B] font-mono">{v.uptime}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#B8B8B8]">
                  <span>APR {v.apr}</span>
                  <span>LAT {v.latency}</span>
                </div>
                <div className="pt-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#050505] border border-white/15 text-[#B8B8B8]">
                    {v.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Column: BTC/USD Candlestick + Event Log */}
        <div className="xl:col-span-6 space-y-4">
          <div className="rounded-xl border border-[#00B7FF]/25 bg-[#101010] p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#00B7FF]" />
                <span className="text-sm font-semibold">BTC / USD</span>
                <span className="text-xs font-mono text-[#32D74B]">$95,240.00 (+2.41%)</span>
              </div>
              <div className="flex items-center gap-1">
                {(['1H', '4H', '1D'] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                      timeframe === tf
                        ? 'bg-[#00B7FF] text-[#050505] font-semibold'
                        : 'bg-[#151515] text-[#B8B8B8] border border-white/10'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-[#050505] border border-white/10 p-2">
              <svg viewBox="0 0 480 185" className="w-full h-44">
                {[91000, 92500, 94000, 95500].map((lvl) => (
                  <g key={lvl}>
                    <line x1="0" y1={priceToY(lvl)} x2="480" y2={priceToY(lvl)} stroke="#ffffff" strokeOpacity="0.08" strokeDasharray="3 3" />
                    <text x="6" y={priceToY(lvl) - 3} fill="#B8B8B8" fontSize="9" fontFamily="monospace">
                      ${lvl.toLocaleString()}
                    </text>
                  </g>
                ))}
                {BTC_CANDLES.map((c, idx) => {
                  const x = 68 + idx * 52;
                  const isUp = c.c >= c.o;
                  const color = isUp ? '#32D74B' : '#FF3B30';
                  const top = priceToY(Math.max(c.o, c.c));
                  const bottom = priceToY(Math.min(c.o, c.c));
                  const height = Math.max(4, bottom - top);
                  return (
                    <g key={c.t}>
                      <line x1={x} y1={priceToY(c.h)} x2={x} y2={priceToY(c.l)} stroke={color} strokeWidth="1.5" />
                      <rect x={x - 9} y={top} width="18" height={height} fill={color} rx="2" />
                      <text x={x - 13} y="180" fill="#B8B8B8" fontSize="9" fontFamily="monospace">
                        {c.t}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
              <Activity className="h-3.5 w-3.5" />
              <span>CRYPTO EVENT LOG</span>
            </div>
            <div className="space-y-1.5 font-mono text-[11px] text-[#B8B8B8]">
              {CRYPTO_EVENT_LOG.map((line, i) => (
                <div key={i} className="p-2 rounded bg-[#151515] border-l-2 border-[#00B7FF]">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Staking Overview */}
        <div className="xl:col-span-3 rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
              <ShieldCheck className="h-4 w-4" />
              <span>STAKING OVERVIEW</span>
            </div>
            <Lock className="h-3.5 w-3.5 text-[#B8B8B8]" />
          </div>

          <div className="p-3 rounded-lg bg-[#050505] border border-[#00B7FF]/30 space-y-1">
            <div className="text-[11px] font-mono text-[#B8B8B8]">CONNECTED STAKED VALUE</div>
            <div className="text-xl font-bold font-mono text-white">$0.00</div>
            <div className="text-[10px] font-mono text-[#00B7FF]">NOT CONNECTED · READ-ONLY</div>
          </div>

          <div className="space-y-2">
            {STAKING_PROTOCOLS.map((item) => (
              <div key={item.protocol} className="p-2.5 rounded-lg bg-[#151515] border border-white/10 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{item.protocol}</span>
                  <span className="font-mono text-[#32D74B]">{item.apy} APY</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-[#B8B8B8]">
                  <span>TVL {item.tvl}</span>
                  <span className="text-[#00B7FF]">{item.pill}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All 28 Crypto Activities Directory */}
      <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-[#00B7FF]" />
            <h2 className="text-sm font-semibold">ALL {CRYPTO_WORLD_CONTENTS.length} CRYPTO ACTIVITIES</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#151515] border border-white/15 text-[#B8B8B8]">
              {filteredActivities.length} SHOWN
            </span>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="h-3.5 w-3.5 text-[#B8B8B8] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter 28 crypto activities..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#050505] border border-white/15 text-xs text-white placeholder-[#B8B8B8]/60 focus:outline-none focus:border-[#00B7FF]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedGroup('All')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
              selectedGroup === 'All'
                ? 'bg-[#00B7FF] text-[#050505] font-semibold'
                : 'bg-[#151515] text-[#B8B8B8] border border-white/10'
            }`}
          >
            All ({CRYPTO_WORLD_CONTENTS.length})
          </button>
          {CRYPTO_CONTENT_GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setSelectedGroup(group)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                selectedGroup === group
                  ? 'bg-[#00B7FF] text-[#050505] font-semibold'
                  : 'bg-[#151515] text-[#B8B8B8] border border-white/10'
              }`}
            >
              {group}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {filteredActivities.map((item) => (
            <div key={item.id} className="p-3 rounded-lg bg-[#151515] border border-white/10 flex flex-col justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-[#00B7FF] flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {item.group}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#050505] border border-white/15 text-[#B8B8B8]">
                    READ-ONLY
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-white">{item.title}</h3>
                <p className="text-[11px] text-[#B8B8B8] line-clamp-2">{item.summary}</p>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] font-mono">
                <span className="text-[#B8B8B8]">NOT CONNECTED</span>
                <span className="text-[#8B5CFF]">EXPANSION-GATED</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
