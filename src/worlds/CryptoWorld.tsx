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
  Sparkles,
} from 'lucide-react';
import {
  CRYPTO_WORLD_CONTENTS,
  CRYPTO_CONTENT_GROUPS,
  RULE_NOTE,
  MEMBERSHIP_RULE,
  type CryptoGroup,
} from '../worlds-data';
import { fetchYields, fmtUsd, useObservation, useProvenanceLog } from '../live-data';
import { ProvenanceChip } from '../ProvenanceChip';
import { CANONICAL_60, ENCYCLOPEDIA_FAMILIES } from '../encyclopedia-data';
import { ENTITY_COUNTS, ENTITY_UNIVERSE } from '../entity-data';

/** Gemini-adopted background treatment (owner, 2026-11-23): the
 *  concept set's deep-space tint, rendered ONLY in the platform's
 *  own colours (#00B7FF command cyan, #8B5CFF STAR purple) over the
 *  ruled #050505 base. Backgrounds only — no token or status colour
 *  changes. */
export const SPACE_BG: React.CSSProperties = {
  backgroundImage:
    'radial-gradient(1100px 550px at 85% -10%, rgba(139,92,255,0.16), transparent 60%), radial-gradient(900px 500px at -10% 0%, rgba(0,183,255,0.12), transparent 55%), linear-gradient(#050505, #050505)',
};

/** LIVE DATA — yields (A1, 2026-11-23; the owner's CW-5 pattern:
 *  capability → approved source → normalized observation → panel).
 *  DefiLlama Yields is keyless and free; APY arrives in PERCENT and
 *  is shown in percent, labelled source-reported — a variable rate
 *  observed at fetch time, never a promise and never a platform
 *  figure. EigenLayer and Babylon do not appear in this source, so
 *  they remain NOT_CONNECTED and are not listed. */
const LiveYieldsPanel: React.FC = () => {
  const { obs, refresh, loading } = useObservation(() => fetchYields(), []);
  const pools = obs.value;
  return (
    <div className="rounded-xl border border-[#00B7FF]/25 bg-[#101010] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
          <BarChart3 className="h-4 w-4" />
          <span>LIVE DATA — YIELDS · TOP WATCHED POOLS BY TVL</span>
        </div>
        <div className="flex items-center gap-2">
          <ProvenanceChip obs={obs} />
          <button
            type="button"
            onClick={refresh}
            className="rounded border border-white/15 bg-[#151515] px-2 py-1 font-mono text-[10px] text-white hover:border-[#00B7FF]/60"
          >
            REFRESH
          </button>
        </div>
      </div>
      {pools ? (
        <div className="space-y-1.5">
          {pools.map((p, i) => (
            <div
              key={`${p.project}-${p.symbol}-${p.chain}-${i}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#151515] px-3 py-2"
            >
              <span className="font-mono text-xs">
                <span className="font-semibold text-white">{p.project}</span>{' '}
                <span className="text-[#B8B8B8]">
                  {p.symbol} · {p.chain}
                </span>
              </span>
              <span className="flex items-center gap-3 font-mono text-xs">
                <span className="text-[#B8B8B8]">TVL {fmtUsd(p.tvlUsd)}</span>
                <span className="font-bold text-white">{p.apy.toFixed(2)}%</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-mono text-[11px] text-[#B8B8B8]">
          {loading
            ? 'FETCHING — the DefiLlama pool index (one fetch, governor-cached)…'
            : 'NO DATA — DefiLlama Yields could not be reached. No yield figure is invented.'}
        </p>
      )}
      <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
        APY IS SOURCE-REPORTED IN PERCENT, VARIABLE, OBSERVED AT FETCH TIME —
        NOT A PROMISE AND NOT A PLATFORM FIGURE. EIGENLAYER AND BABYLON DO NOT
        APPEAR IN THIS SOURCE: THEY REMAIN NOT_CONNECTED.
      </p>
    </div>
  );
};

/** GEMINI FAMILY ADOPTION (owner: "do all at once", 2026-11-23).
 *  The concept set's mode strip, adopted under the owner's ladder:
 *  AUTO means auto-MONITORING only — no mode executes anything. */
const MODE_STRIP: { label: string; note: string; current?: boolean }[] = [
  { label: 'MANUAL', note: 'OWNER DRIVES EVERY VIEW' },
  { label: 'MANUAL + ASSISTANTS', note: 'STAR + PRINCIPALS PRESENT & EXPLAIN', current: true },
  { label: 'AUTO', note: 'MONITORING ONLY · EXECUTION DISABLED' },
];

/** The per-family STAR presenter card (Gemini concept pattern),
 *  bound to the real STAR: STAR's face is the owner's portrait, and
 *  its replies live in the STAR panel — labelled DEMO until the owner
 *  configures MTI6_STAR_API_KEY in Netlify. No mock analyst persona. */
const StarPresenterCard: React.FC = () => (
  <div className="rounded-xl border border-[#8B5CFF]/50 bg-[#101010] p-4 space-y-2">
    <div className="flex items-center gap-2 text-xs font-mono text-[#8B5CFF]">
      <Sparkles className="h-4 w-4" />
      <span>STAR — PRESENTER OF THIS WORLD</span>
    </div>
    <p className="text-xs leading-relaxed text-[#B8B8B8]">
      STAR presents Crypto World and answers for it in the STAR panel
      (bottom-right). STAR sits above the 12 Tribe principals; the
      principals are embodied Israelite elders in robes — never the
      robot analysts or invented personas shown in concept art. Until
      the owner adds the STAR key in Netlify, STAR's replies are
      labelled DEMO.
    </p>
    <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
      <span className="rounded border border-[#8B5CFF]/40 bg-[#8B5CFF]/10 px-2 py-0.5 text-[#8B5CFF]">
        STAR · PURPLE #8B5CFF · NEVER A STATUS COLOUR
      </span>
      <span className="rounded border border-white/15 bg-[#151515] px-2 py-0.5 text-[#B8B8B8]">
        EXECUTION: DISABLED
      </span>
    </div>
  </div>
);

/** SPECIALIZED ECONOMIES — the Gemini families 14–16 surfaced as
 *  cards (they already exist as workspaces in the registry; this is
 *  their family view). Every figure is NO DATA until a sourced feed
 *  exists. GameFi is a LOCKED tracking seat only — it is not the
 *  GTADWIY game, which stays deferred by owner ruling. */
const SPECIALIZED_FAMILY: {
  name: string;
  state: string;
  note: string;
}[] = [
  { name: 'Prediction Markets', state: 'NOT CONNECTED', note: 'MARKET DATA UNAVAILABLE · NO DATA' },
  { name: 'Oracles', state: 'NOT CONNECTED', note: 'DATA FEEDS: NO DATA' },
  { name: 'Gauges / Incentive Markets', state: 'NOT IMPLEMENTED', note: 'GAUGE WEIGHTS: NO DATA · ANALYZE ONLY' },
  { name: 'SocialFi', state: 'LOCKED · EXPANSION-GATED', note: 'OWNER-GATED SEAT · NO FEED' },
  { name: 'GameFi', state: 'LOCKED · EXPANSION-GATED', note: 'TRACKING SEAT ONLY · NOT THE GTADWIY GAME BUILD' },
];

const SpecializedFamilyPanel: React.FC = () => (
  <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
        <Layers className="h-4 w-4" />
        <span>SPECIALIZED ECONOMIES — FAMILY VIEW</span>
      </div>
      <span className="font-mono text-[10px] text-[#B8B8B8]">
        ADOPTED FROM THE OWNER'S CONCEPT SET · 2026-11-23
      </span>
    </div>
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-5">
      {SPECIALIZED_FAMILY.map((f) => (
        <div key={f.name} className="space-y-1.5 rounded-lg border border-white/10 bg-[#151515] p-3">
          <div className="text-xs font-semibold text-white">{f.name}</div>
          <span className="inline-block rounded border border-white/15 bg-[#050505] px-1.5 py-0.5 font-mono text-[9px] text-[#B8B8B8]">
            {f.state}
          </span>
          <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">{f.note}</p>
        </div>
      ))}
    </div>
    <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
      CONCEPT FIGURES (TVL, APY, FEED COUNTS) ARE NOT CARRIED OVER — EACH
      CARD SHOWS ITS REAL STATE UNTIL A SOURCED LIVE FEED EXISTS.
    </p>
  </div>
);

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

/** CRYPTO HEALTH (Copilot CW-0 Gap 16 / CW-3 Home): the summary is
 *  derived ONLY from this session's real provenance observations.
 *  The rule is never-HEALTHY-when-unknown: with no observations the
 *  strip says so instead of claiming a state. */
const CryptoHealthStrip: React.FC = () => {
  const prov = useProvenanceLog();
  const counts = { LIVE: 0, CACHED: 0, STALE: 0, NO_DATA: 0 } as Record<string, number>;
  for (const r of prov) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return (
    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
      <span className="text-[#B8B8B8]">CRYPTO HEALTH — OBSERVED THIS SESSION:</span>
      {prov.length === 0 ? (
        <span className="rounded border border-white/15 bg-[#101010] px-2 py-1 text-[#B8B8B8]">
          NO OBSERVATIONS YET — HEALTH IS NOT CLAIMED
        </span>
      ) : (
        <>
          <span className="rounded border border-[#32D74B]/50 bg-[#101010] px-2 py-1 text-white">LIVE {counts.LIVE}</span>
          <span className="rounded border border-[#00B7FF]/50 bg-[#101010] px-2 py-1 text-white">CACHED {counts.CACHED}</span>
          <span className="rounded border border-[#FFB020]/50 bg-[#101010] px-2 py-1 text-white">STALE {counts.STALE}</span>
          <span className="rounded border border-white/15 bg-[#101010] px-2 py-1 text-[#B8B8B8]">NO_DATA {counts.NO_DATA}</span>
        </>
      )}
      <span className="rounded border border-white/15 bg-[#101010] px-2 py-1 text-[#B8B8B8]">
        EVERYTHING NOT OBSERVED READS NOT_CONNECTED — NEVER &quot;HEALTHY&quot;
      </span>
    </div>
  );
};

/** ENTITY REGISTRIES (Copilot CW-0 Gap 4 / CW-3): the canonical
 *  11 networks / 18 assets / 19 protocols listed BY NAME inside
 *  Crypto World — previously they appeared here only as counts.
 *  Data is the generated frozen-batch data (v137); all UNVERIFIED. */
const EntityRegistriesPanel: React.FC = () => {
  const groups: { key: string; label: string; render: (e: (typeof ENTITY_UNIVERSE)[number]) => string }[] = [
    {
      key: 'chains',
      label: `NETWORKS · ${ENTITY_COUNTS.chains}`,
      render: (e) => (typeof e.chainId === 'number' ? `CHAIN ID ${e.chainId}` : 'CHAIN ID NOT RECORDED'),
    },
    {
      key: 'assets',
      label: `ASSETS · ${ENTITY_COUNTS.assets}`,
      render: (e) => (e.symbol ? `SYMBOL ${e.symbol}` : 'SYMBOL NOT RECORDED'),
    },
    {
      key: 'protocols',
      label: `PROTOCOLS · ${ENTITY_COUNTS.protocols}`,
      render: (e) => `${e.activityRefs?.length ?? 0} BACKBONE ACTIVITIES LINKED`,
    },
  ];
  return (
    <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
          <Network className="h-4 w-4" />
          <span>ENTITY REGISTRIES — THE {ENTITY_COUNTS.total} CANONICAL ENTITIES BY NAME</span>
        </div>
        <span className="font-mono text-[10px] text-[#B8B8B8]">ALL UNVERIFIED · FULL RECORDS: ENCYCLOPEDIA</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {groups.map((g) => (
          <div key={g.key} className="rounded-lg border border-white/10 bg-[#151515] p-3">
            <div className="mb-2 font-mono text-[10px] font-semibold text-[#00B7FF]">{g.label}</div>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {ENTITY_UNIVERSE.filter((e) => e.registry === g.key).map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 font-mono text-[10px]">
                  <span className="truncate text-white">{e.title}</span>
                  <span className="shrink-0 text-[#B8B8B8]">{g.render(e)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

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
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-6 space-y-5" style={SPACE_BG}>
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

      {/* Mode strip (Gemini family adoption) — AUTO is monitoring
          only; the ladder still ends at OWNER APPROVAL and EXECUTE
          stays disabled at every mode. */}
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
        <span className="text-[#B8B8B8]">MODE:</span>
        {MODE_STRIP.map((m) => (
          <span
            key={m.label}
            title={m.note}
            className={`rounded border px-2 py-1 ${
              m.current
                ? 'border-[#00B7FF]/60 bg-[#00B7FF]/10 text-white'
                : 'border-white/15 bg-[#101010] text-[#B8B8B8]'
            }`}
          >
            {m.label}
            <span className="ml-1.5 text-[9px] text-[#B8B8B8]">{m.note}</span>
          </span>
        ))}
      </div>

      <LiveYieldsPanel />

      {/* 60 MAPPED ACTIVITIES — the owner's Copilot-built backbone,
          counted from the generated canonical data (v136). The full
          browsable backbone lives on the Encyclopedia screen. */}
      <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
            <Layers className="h-4 w-4" />
            <span>60 MAPPED ACTIVITIES — THE CANONICAL BACKBONE</span>
          </div>
          <span className="font-mono text-[10px] text-[#B8B8B8]">
            FULL BACKBONE BROWSER: ENCYCLOPEDIA SCREEN
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ENCYCLOPEDIA_FAMILIES.map((f) => {
            const n = CANONICAL_60.filter((m) => m.family === f.id).length;
            if (n === 0) return null;
            return (
              <span
                key={f.id}
                className="rounded border border-white/15 bg-[#151515] px-2 py-1 font-mono text-[10px] text-[#B8B8B8]"
              >
                {f.title.toUpperCase()} · <span className="text-white">{n}</span>
              </span>
            );
          })}
        </div>
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          60 MAJOR ACTIVITIES ACROSS 20 FAMILIES · 334 TYPES + 404 STRATEGIES BENEATH THEM ·
          EVERY RECORD UNVERIFIED · COST UNKNOWN AND RISK UNPROFILED UNTIL A SOURCED RECORD SAYS OTHERWISE.
        </p>
      </div>

      <CryptoHealthStrip />

      <EntityRegistriesPanel />

      <StarPresenterCard />

      <SpecializedFamilyPanel />

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
