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
  // No live feed is connected: chain names are real, every metric is
  // honestly NO_DATA. Nothing here is a measured uptime, APR, or latency.
  { chain: 'Ethereum Beacon', uptime: 'NO_DATA', apr: 'NO_DATA', latency: 'NO_DATA', status: 'READ-ONLY' },
  { chain: 'Solana Mainnet', uptime: 'NO_DATA', apr: 'NO_DATA', latency: 'NO_DATA', status: 'NOT CONNECTED' },
  { chain: 'Cosmos Hub', uptime: 'NO_DATA', apr: 'NO_DATA', latency: 'NO_DATA', status: 'READ-ONLY' },
  { chain: 'Arbitrum One', uptime: 'NO_DATA', apr: 'NO_DATA', latency: 'NO_DATA', status: 'EXPANSION-GATED' },
];

const STAKING_PROTOCOLS = [
  // No live feed is connected: protocol names are real, every APY and
  // TVL figure is honestly NO_DATA. Nothing here is a measured rate.
  { protocol: 'Lido stETH', apy: 'NO_DATA', tvl: 'NO_DATA', pill: 'NOT CONNECTED' },
  { protocol: 'JitoSOL', apy: 'NO_DATA', tvl: 'NO_DATA', pill: 'READ-ONLY' },
  { protocol: 'EigenLayer', apy: 'NO_DATA', tvl: 'NO_DATA', pill: 'EXPANSION-GATED' },
  { protocol: 'Celestia TIA', apy: 'NO_DATA', tvl: 'NO_DATA', pill: 'NOT CONNECTED' },
];

const CRYPTO_EVENT_LOG = [
  '[SYNC] BTC/USD spot feed staged (READ-ONLY · NO EXECUTION)',
  '[GATE] Wallet & Exchange APIs locked (NOT CONNECTED)',
];

// UI-only group filter for the 24 contents. The grouping is NOT a
// canonical classification — it only filters the grid.
const GROUPS: CryptoGroup[] = ['Markets', 'Yield & Credit', 'Infrastructure', 'Assets & Sectors'];

export const CryptoWorld: React.FC<CryptoWorldProps> = ({ onOpenWorkspaces }) => {
  const [selectedGroup, setSelectedGroup] = useState<CryptoGroup | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // CRYPTO_WORLD_CONTENTS is string[] (the canonical 24). The group of
  // each content comes from the CRYPTO_CONTENT_GROUPS lookup, not from
  // the item itself.
  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CRYPTO_WORLD_CONTENTS.filter((item) => {
      const group = CRYPTO_CONTENT_GROUPS[item] ?? 'All';
      const matchesGroup = selectedGroup === 'All' || group === selectedGroup;
      const matchesQuery =
        !q ||
        item.toLowerCase().includes(q) ||
        group.toLowerCase().includes(q);
      return matchesGroup && matchesQuery;
    });
  }, [selectedGroup, searchQuery]);

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
            <p className="text-xs text-[#B8B8B8]">{RULE_NOTE} · {MEMBERSHIP_RULE.cryptoWorld}</p>
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
                  <span className="text-[#B8B8B8] font-mono">{v.uptime}</span>
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

        {/* Center Column: BTC/USD (no live feed) + Event Log */}
        <div className="xl:col-span-6 space-y-4">
          <div className="rounded-xl border border-[#00B7FF]/25 bg-[#101010] p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#00B7FF]" />
                <span className="text-sm font-semibold">BTC / USD</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#151515] border border-white/20 text-[#B8B8B8]">
                  NOT CONNECTED
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-[#050505] border border-white/10 p-3 space-y-1">
              <p className="text-xs text-[#B8B8B8]">
                No price feed is connected — no BTC/USD price, candles, or change figure is shown.
              </p>
              <p className="text-[11px] font-mono text-white/40">PRICE: NO_DATA · FEED: NOT_CONNECTED</p>
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
            <div className="text-xl font-bold font-mono text-white">UNAVAILABLE</div>
            <div className="text-[10px] font-mono text-[#00B7FF]">NOT CONNECTED · READ-ONLY</div>
          </div>

          <div className="space-y-2">
            {STAKING_PROTOCOLS.map((item) => (
              <div key={item.protocol} className="p-2.5 rounded-lg bg-[#151515] border border-white/10 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{item.protocol}</span>
                  <span className="font-mono text-[#B8B8B8]">{item.apy} APY</span>
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

      {/* All 24 Crypto Activities Directory — the canonical 24, verbatim */}
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
              placeholder="Filter 24 crypto activities..."
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
          {GROUPS.map((group) => (
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
            <div key={item} className="p-3 rounded-lg bg-[#151515] border border-white/10 flex flex-col justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-[#00B7FF] flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {CRYPTO_CONTENT_GROUPS[item]}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#050505] border border-white/15 text-[#B8B8B8]">
                    READ-ONLY
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-white">{item}</h3>
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
