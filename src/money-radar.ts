/**
 * Money Radar — the Opportunity Intelligence layer (owner spec,
 * 2026-11-24; goal files/MONEY-RADAR-SPEC-2026-11-24.md).
 *
 * The permanent separation:
 *   World Engine answers "What exists?"
 *   Money Radar answers "What's happening?"
 *   STAR answers "What should Daniel look at next?"
 *   Daniel decides what becomes action.
 *
 * Money Radar observes, detects, ranks, explains, and surfaces.
 * It never executes trades, moves funds, or makes decisions, and
 * it never writes canonical truth: its outputs are SIGNALS
 * (evidence-bearing observations), opportunity CANDIDATES in the
 * owner's opportunity store (born DISCOVERED / UNVERIFIED, no
 * return figures — the platform rule), and role-routed WORK
 * ORDERS in the Bot Work Queue for the Tribe principals and
 * their workers.
 *
 * Signals are computed only from governed observations the
 * platform actually makes. First source: DefiLlama Yields
 * watched pools, compared scan-over-scan against the stored
 * baseline snapshot — a change is claimed only when two real
 * observations differ. Radar categories without a connected
 * source read NO_DATA. Scoring uses evidence dimensions only
 * (freshness, evidenceCount, sourceCount, support status) —
 * never a confidence percentage.
 */
import {
  fetchDexVolumes,
  fetchGovernanceProposals,
  fetchProtocolFees,
  fetchPrice,
  fetchProtocolIndex,
  fetchYields,
  fmtTime,
  fmtUsd,
  type PoolYield,
} from './live-data';
import { classifyCategory } from './classification';
import { loadAssignments } from './principal-assignments';
import { TRIBE_PRINCIPALS } from './worlds-data';
import { createTask, loadTasks } from './worker-tasks';

export const RADAR_TYPES = [
  'Yield',
  'Liquidity',
  'Staking',
  'Restaking',
  'Lending',
  'Borrowing',
  'Governance',
  'Bribe',
  'Points',
  'Campaign',
  'Airdrop',
  'DePIN',
  'AI',
  'Mining',
  'Validator',
  'Bridge',
  'Arbitrage Candidate',
  'Treasury',
  'RWA',
] as const;
export type RadarType = (typeof RADAR_TYPES)[number];

export type RadarBoardState = 'NEW' | 'HOT' | 'GROWING' | 'DECLINING' | 'STALE' | 'EXPIRED';
export const RADAR_BOARD_STATES: RadarBoardState[] = ['NEW', 'HOT', 'GROWING', 'DECLINING', 'STALE', 'EXPIRED'];

export interface MoneySignal {
  id: string;
  signalType: string;
  source: string;
  entity: string;
  asset: string | null;
  protocol: string | null;
  network: string | null;
  poolKey: string | null;
  /** An opportunity type from the owner's 19-type vocabulary, or
   * 'Market' (price movement) / 'Discovery' (new protocol) for
   * signals that feed the radar without naming an opportunity
   * type of their own. */
  radarType: RadarType | 'Market' | 'Discovery';
  boardState: RadarBoardState;
  observedAt: number;
  evidence: string[];
  evidenceCount: number;
  sourceCount: number;
  supportStatus: 'OBSERVED' | 'SUPPORTED' | 'STRONGLY SUPPORTED';
  freshness: 'CURRENT' | 'STALE' | 'UNKNOWN';
}

/* Radar category coverage — honest source state per category.
 * ACTIVE means a governed source feeds it today; NO_DATA means
 * no connected source yet, so the radar reports nothing rather
 * than inventing activity. */
export const RADAR_CATEGORY_STATES: { name: string; state: 'ACTIVE' | 'NO_DATA'; note: string }[] = [
  { name: 'Market Prices', state: 'ACTIVE', note: 'BTC/ETH/SOL governed price chains — source-reported 24h move signals' },
  { name: 'DEX Volume', state: 'ACTIVE', note: 'DefiLlama DEX overview — 24h volume vs the prior day for DEXes ≥ $1M, baseline-guarded' },
  { name: 'Protocol Fees', state: 'ACTIVE', note: 'DefiLlama fees overview — protocol 24h fees vs the prior day for protocols ≥ $100K, baseline-guarded; protocol revenue, never platform earnings' },
  { name: 'Protocol Discovery', state: 'ACTIVE', note: 'DefiLlama protocol index diffed scan-over-scan — new protocols surface as signals' },
  { name: 'Yield', state: 'ACTIVE', note: 'DefiLlama Yields watched pools' },
  { name: 'Liquidity', state: 'ACTIVE', note: 'Curve / Uniswap watched pools in the yields feed' },
  { name: 'Lending', state: 'ACTIVE', note: 'Aave / Compound / Kamino watched pools' },
  { name: 'Staking', state: 'ACTIVE', note: 'Lido watched pools' },
  { name: 'Restaking', state: 'NO_DATA', note: 'EigenLayer and Babylon are absent from the yields source' },
  { name: 'Governance', state: 'ACTIVE', note: 'Snapshot GraphQL — new proposals across 8 API-verified watched spaces' },
  { name: 'Airdrop / Points / Campaign', state: 'NO_DATA', note: 'no incentive source connected' },
  { name: 'DePIN / AI / RWA', state: 'NO_DATA', note: 'no category source connected' },
  { name: 'Bridge / Arbitrage / Treasury', state: 'NO_DATA', note: 'no flow source connected' },
];

const BASELINE_KEY = 'mti6_money_radar_baseline_v1';
const SIGNALS_KEY = 'mti6_money_radar_signals_v1';
const OPP_KEY = 'mti6_opportunities_v1';
const MAX_SIGNALS = 300;
const MAX_DISPATCH_PER_SCAN = 6;

interface PoolObs {
  key: string;
  project: string;
  symbol: string;
  chain: string;
  tvlUsd: number;
  apy: number;
  /** Source-reported 24h volume (v199); optional because
   * baselines written before v199 do not carry it. */
  volumeUsd1d?: number | null;
}

interface RadarBaseline {
  observedAt: number;
  source: string | null;
  status: string;
  pools: PoolObs[];
  /** Last price observation per symbol (v194) — a price signal
   * mints only when the source-reported 24h change itself moved
   * by a full point since the baseline, so re-scans stay quiet. */
  prices?: Record<string, { price: number; change24h: number | null }>;
  /** Protocol index slug set (v194). The first scan records it
   * silently — a baseline, not thousands of false discoveries;
   * later scans diff against it. */
  protocolSlugs?: string[];
  /** Seen Snapshot proposal ids (v195) — same baseline law:
   * the first scan records them silently; later scans diff. */
  governanceIds?: string[];
  /** Last recorded DEX-volume change per slug (v207) — the
   * baseline guard for the DEX overview: a signal mints only
   * when the reported day-over-day move itself shifted by 5+
   * points since the baseline, so re-scans stay quiet. */
  dexVolumes?: Record<string, number>;
  /** Last recorded protocol-fees change per slug (v208) —
   * the same baseline guard as dexVolumes. */
  protocolFees?: Record<string, number>;
}

const poolKeyOf = (p: { project: string; symbol: string; chain: string }): string =>
  `${p.project}|${p.symbol}|${p.chain}`.toLowerCase();

const slug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 56) || 'signal';

function primaryTypeFor(project: string): RadarType {
  switch (project) {
    case 'aave-v3':
    case 'aave-v2':
    case 'compound-v3':
    case 'kamino':
      return 'Lending';
    case 'lido':
      return 'Staking';
    case 'curve-dex':
    case 'uniswap-v3':
      return 'Liquidity';
    default:
      return 'Yield';
  }
}

function loadBaseline(): RadarBaseline | null {
  try {
    const raw = localStorage.getItem(BASELINE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RadarBaseline;
    if (!parsed || !Array.isArray(parsed.pools)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveBaseline(b: RadarBaseline): void {
  try {
    localStorage.setItem(BASELINE_KEY, JSON.stringify(b));
  } catch {
    /* storage unavailable — the next scan simply re-baselines */
  }
}

export function loadSignals(): MoneySignal[] {
  try {
    const raw = localStorage.getItem(SIGNALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is MoneySignal =>
        !!s && typeof s === 'object' && typeof s.id === 'string' && typeof s.signalType === 'string',
    );
  } catch {
    return [];
  }
}

function saveSignals(signals: MoneySignal[]): void {
  try {
    localStorage.setItem(SIGNALS_KEY, JSON.stringify(signals.slice(0, MAX_SIGNALS)));
  } catch {
    /* storage unavailable */
  }
}

interface OppRecordLoose {
  id: string;
  title: string;
  radar?: {
    asset?: string;
    type?: string;
    boardState?: string;
    signalIds?: string[];
    evidenceCount?: number;
    sourceCount?: number;
    supportStatus?: string;
    freshness?: string;
  };
  [k: string]: unknown;
}

function loadOpps(): OppRecordLoose[] {
  try {
    const raw = localStorage.getItem(OPP_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as OppRecordLoose[]) : [];
  } catch {
    return [];
  }
}

/* The principal currently holding a role assignment receives
 * that role's radar work orders; when nobody holds the role the
 * order lands in the UNASSIGNED POOL — routing follows the
 * recorded assignments, never an invented roster. */
function principalForRole(role: string): { id: string; name: string } | null {
  const map = loadAssignments();
  for (const p of TRIBE_PRINCIPALS) {
    if (map[p.id]?.currentRole === role) return { id: p.id, name: p.displayName };
  }
  return null;
}

export interface RadarDispatch {
  title: string;
  role: string;
  principalName: string;
}

export interface RadarScanResult {
  status: string;
  source: string | null;
  fetchedAt: number | null;
  poolsObserved: number;
  baselineWasEmpty: boolean;
  signals: MoneySignal[];
  candidatesCreated: number;
  candidatesExisting: number;
  dispatched: RadarDispatch[];
}

/* One radar scan: fetch the governed yields observation, diff
 * it against the stored baseline, record the signals, generate
 * opportunity candidates for the pools behind positive signals,
 * and dispatch role-routed work orders to the Tribe. The new
 * observation then becomes the baseline for the next scan. */
export async function runMoneyRadarScan(): Promise<RadarScanResult> {
  const empty: RadarScanResult = {
    status: 'NO_DATA',
    source: null,
    fetchedAt: null,
    poolsObserved: 0,
    baselineWasEmpty: false,
    signals: [],
    candidatesCreated: 0,
    candidatesExisting: 0,
    dispatched: [],
  };
  const obs = await fetchYields();
  if (!obs.value || obs.value.length === 0) {
    return { ...empty, status: obs.status, source: obs.source };
  }
  const source = obs.source ?? 'DefiLlama Yields';
  const observedAt = obs.fetchedAt ?? Date.now();
  const freshness: MoneySignal['freshness'] =
    obs.status === 'STALE' ? 'STALE' : obs.status === 'LIVE' || obs.status === 'CACHED' ? 'CURRENT' : 'UNKNOWN';
  const current: PoolObs[] = obs.value.map((p: PoolYield) => ({
    key: poolKeyOf(p),
    project: p.project,
    symbol: p.symbol,
    chain: p.chain,
    tvlUsd: p.tvlUsd,
    apy: p.apy,
    volumeUsd1d: p.volumeUsd1d,
  }));
  const baseline = loadBaseline();
  const prev = new Map((baseline?.pools ?? []).map((p) => [p.key, p]));
  const signals: MoneySignal[] = [];
  const mk = (
    signalType: string,
    pool: PoolObs | null,
    project: string,
    radarType: MoneySignal['radarType'],
    boardState: RadarBoardState,
    evidence: string[],
  ): MoneySignal => ({
    id: `radar-${slug(signalType)}-${slug(pool ? pool.key : project)}-${observedAt}`,
    signalType,
    source,
    entity: pool ? `${project} ${pool.symbol} (${pool.chain})` : project,
    asset: pool ? pool.symbol : null,
    protocol: project,
    network: pool ? pool.chain : null,
    poolKey: pool ? pool.key : null,
    radarType,
    boardState,
    observedAt,
    evidence,
    evidenceCount: evidence.length,
    sourceCount: 1,
    supportStatus: 'OBSERVED',
    freshness,
  });

  for (const pool of current) {
    const before = prev.get(pool.key);
    const type = primaryTypeFor(pool.project);
    if (!before) {
      signals.push(
        mk('POOL_CREATION', pool, pool.project, type, 'NEW', [
          `${source} observation at ${fmtTime(observedAt)} lists this watched pool for the first time in the radar baseline`,
          `Pool TVL ${fmtUsd(pool.tvlUsd)} · source-reported APY ${pool.apy.toFixed(2)}% (percent, variable — shown on the yields surface, never copied into an opportunity record)`,
        ]),
      );
      continue;
    }
    const pct = before.tvlUsd > 0 ? ((pool.tvlUsd - before.tvlUsd) / before.tvlUsd) * 100 : 0;
    const apyDelta = pool.apy - before.apy;
    if (pct >= 5) {
      signals.push(
        mk('TVL_INCREASE', pool, pool.project, type, pct >= 25 ? 'HOT' : 'GROWING', [
          `Watched-pool TVL ${fmtUsd(before.tvlUsd)} → ${fmtUsd(pool.tvlUsd)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%) between the ${fmtTime(baseline?.observedAt ?? null)} and ${fmtTime(observedAt)} ${source} observations`,
          'Scope: this watched pool only — not a whole-protocol TVL claim',
        ]),
      );
    } else if (pct <= -5) {
      signals.push(
        mk('TVL_DECREASE', pool, pool.project, type, pct <= -25 ? 'HOT' : 'DECLINING', [
          `Watched-pool TVL ${fmtUsd(before.tvlUsd)} → ${fmtUsd(pool.tvlUsd)} (${pct.toFixed(1)}%) between the ${fmtTime(baseline?.observedAt ?? null)} and ${fmtTime(observedAt)} ${source} observations`,
          'Scope: this watched pool only — not a whole-protocol TVL claim',
        ]),
      );
    }
    if (apyDelta >= 0.5) {
      signals.push(
        mk('APY_INCREASE', pool, pool.project, type, apyDelta >= 5 ? 'HOT' : 'GROWING', [
          `Source-reported APY ${before.apy.toFixed(2)}% → ${pool.apy.toFixed(2)}% (+${apyDelta.toFixed(2)} points) between the two ${source} observations`,
          'APY is percent, source-reported and variable — an observation, not a promise',
        ]),
      );
    } else if (apyDelta <= -0.5) {
      signals.push(
        mk('APY_DECREASE', pool, pool.project, type, apyDelta <= -5 ? 'HOT' : 'DECLINING', [
          `Source-reported APY ${before.apy.toFixed(2)}% → ${pool.apy.toFixed(2)}% (${apyDelta.toFixed(2)} points) between the two ${source} observations`,
          'APY is percent, source-reported and variable — an observation, not a promise',
        ]),
      );
    }
    /* Volume (v199) — the owner's Level 3 list watches volume
     * movement; the source carries 24h volume for DEX pools
     * (null elsewhere — absence never reads as zero flow). A
     * ±25% move with a $10k absolute floor mints a signal so
     * dust pools cannot shout. */
    const volBefore = typeof before.volumeUsd1d === 'number' ? before.volumeUsd1d : null;
    const volNow = typeof pool.volumeUsd1d === 'number' ? pool.volumeUsd1d : null;
    if (volBefore !== null && volNow !== null && volBefore > 0) {
      const volPct = ((volNow - volBefore) / volBefore) * 100;
      if (volPct >= 25 && volNow >= 10_000) {
        signals.push(
          mk('VOLUME_INCREASE', pool, pool.project, type, volPct >= 100 ? 'HOT' : 'GROWING', [
            `Source-reported 24h pool volume ${fmtUsd(volBefore)} → ${fmtUsd(volNow)} (+${volPct.toFixed(1)}%) between the two ${source} observations`,
            'Volume is source-reported pool activity — an observation of flow, not earnings',
          ]),
        );
      } else if (volPct <= -25 && volBefore >= 10_000) {
        signals.push(
          mk('VOLUME_DECREASE', pool, pool.project, type, volPct <= -50 ? 'HOT' : 'DECLINING', [
            `Source-reported 24h pool volume ${fmtUsd(volBefore)} → ${fmtUsd(volNow)} (${volPct.toFixed(1)}%) between the two ${source} observations`,
            'Volume is source-reported pool activity — an observation of flow, not earnings',
          ]),
        );
      }
    }
  }
  for (const before of baseline?.pools ?? []) {
    if (!current.some((p) => p.key === before.key)) {
      signals.push(
        mk('POOL_REMOVED', before, before.project, primaryTypeFor(before.project), 'DECLINING', [
          `This watched pool appeared in the ${fmtTime(baseline?.observedAt ?? null)} ${source} observation and is absent from the ${fmtTime(observedAt)} one`,
          'Absence from the watched top set is a signal to review, not proof the pool closed',
        ]),
      );
    }
  }
  /* Capital flow over watched pools, aggregated per protocol:
   * entering/exiting is stated for the watched set only, and a
   * migration between two protocols is never claimed from
   * aggregates alone — that stays a candidate interpretation
   * for the owner's review package. */
  const projects = new Set([...current.map((p) => p.project), ...(baseline?.pools ?? []).map((p) => p.project)]);
  for (const project of projects) {
    const nowSum = current.filter((p) => p.project === project).reduce((n, p) => n + p.tvlUsd, 0);
    const prevSum = (baseline?.pools ?? []).filter((p) => p.project === project).reduce((n, p) => n + p.tvlUsd, 0);
    if (prevSum <= 0 || nowSum <= 0) continue;
    const pct = ((nowSum - prevSum) / prevSum) * 100;
    if (Math.abs(pct) < 5) continue;
    signals.push(
      mk(
        'LARGE_CAPITAL_MOVEMENT',
        null,
        project,
        primaryTypeFor(project),
        Math.abs(pct) >= 25 ? 'HOT' : pct > 0 ? 'GROWING' : 'DECLINING',
        [
          `Capital ${pct > 0 ? 'entering' : 'leaving'} ${project}'s watched pools: aggregate watched TVL ${fmtUsd(prevSum)} → ${fmtUsd(nowSum)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%) between the two ${source} observations`,
          'Aggregate of the watched pools only. A migration claim (A → B) is a candidate interpretation, never asserted from aggregates alone',
        ],
      ),
    );
  }

  /* Price movement (v194) — the governed BTC/ETH/SOL chains.
   * The signal rests on the source's own reported 24h change in
   * a single observation; the baseline guard keeps re-scans
   * quiet unless the reported change itself moved a full point. */
  const priceObs: Record<string, { price: number; change24h: number | null }> = { ...(baseline?.prices ?? {}) };
  for (const sym of ['BTC', 'ETH', 'SOL']) {
    try {
      const p = await fetchPrice(sym);
      if (!p.value) continue;
      const change = p.value.change24h;
      priceObs[sym] = { price: p.value.price, change24h: change };
      if (change === null || Math.abs(change) < 5) continue;
      const prevChange = baseline?.prices?.[sym]?.change24h;
      if (prevChange !== undefined && prevChange !== null && Math.abs(change - prevChange) < 1) continue;
      const at = p.fetchedAt ?? observedAt;
      signals.push({
        id: `radar-${change >= 0 ? 'price-surge' : 'price-drop'}-${slug(sym)}-${at}`,
        signalType: change >= 0 ? 'PRICE_SURGE' : 'PRICE_DROP',
        source: p.source ?? 'price chain',
        entity: sym,
        asset: sym,
        protocol: null,
        network: null,
        poolKey: null,
        radarType: 'Market',
        boardState: Math.abs(change) >= 10 ? 'HOT' : change >= 0 ? 'GROWING' : 'DECLINING',
        observedAt: at,
        evidence: [
          `${p.source ?? 'Price chain'} reports ${sym} at ${fmtUsd(p.value.price)} with a 24h change of ${change >= 0 ? '+' : ''}${change.toFixed(2)}% (${p.status}, fetched ${fmtTime(p.fetchedAt)})`,
          'A source-reported market move — intelligence for review, never a trade signal the platform acts on',
        ],
        evidenceCount: 2,
        sourceCount: 1,
        supportStatus: 'OBSERVED',
        freshness: p.status === 'STALE' ? 'STALE' : p.status === 'LIVE' || p.status === 'CACHED' ? 'CURRENT' : 'UNKNOWN',
      });
    } catch {
      /* a failed price chain mints nothing */
    }
  }

  /* Protocol discovery (v194) — the governed DefiLlama protocol
   * index diffed against the baseline slug set. New protocols
   * surface as Discovery signals carrying their deterministic
   * classification as evidence; the first scan only baselines. */
  let protocolSlugs: string[] | undefined = baseline?.protocolSlugs;
  let newDexNames: string[] = [];
  try {
    const idx = await fetchProtocolIndex();
    if (idx.value && idx.value.length > 0) {
      const currentSlugs = idx.value.map((e) => e.slug);
      if (protocolSlugs !== undefined) {
        const knownSlugs = new Set(protocolSlugs);
        const fresh = idx.value.filter((e) => !knownSlugs.has(e.slug)).slice(0, 20);
        for (const entry of fresh) {
          const cls = classifyCategory(entry.category);
          if (cls.cls === 'DEX') newDexNames.push(entry.name);
          signals.push({
            id: `radar-new-protocol-${slug(entry.slug)}-${idx.fetchedAt ?? observedAt}`,
            signalType: 'NEW_PROTOCOL',
            source: idx.source ?? 'DefiLlama Protocols',
            entity: entry.name,
            asset: entry.symbol,
            protocol: entry.name,
            network: entry.chains[0] ?? null,
            poolKey: null,
            radarType: 'Discovery',
            boardState: 'NEW',
            observedAt: idx.fetchedAt ?? observedAt,
            evidence: [
              `${entry.name} appears in the ${idx.source ?? 'DefiLlama Protocols'} index at ${fmtTime(idx.fetchedAt ?? observedAt)} and was absent from the radar baseline slug set`,
              `Source category "${entry.category ?? 'not reported'}" classifies deterministically as ${cls.cls}${cls.subclass ? ` / ${cls.subclass}` : ''} — a candidate for the placement pipeline, not canonical truth`,
            ],
            evidenceCount: 2,
            sourceCount: 1,
            supportStatus: 'OBSERVED',
            freshness: idx.status === 'STALE' ? 'STALE' : idx.status === 'LIVE' || idx.status === 'CACHED' ? 'CURRENT' : 'UNKNOWN',
          });
        }
      }
      protocolSlugs = currentSlugs;
    }
  } catch {
    /* a failed index fetch mints nothing and keeps the old baseline set */
  }

  /* Governance (v195) — Snapshot proposals across the watched
   * spaces, diffed against the baseline id set. A new proposal
   * is a Governance signal; voting itself is never touched —
   * the radar observes governance, it does not participate. */
  let governanceIds: string[] | undefined = baseline?.governanceIds;
  const newProposals: { spaceName: string; title: string }[] = [];
  try {
    const gov = await fetchGovernanceProposals();
    if (gov.value && gov.value.length > 0) {
      const currentIds = gov.value.map((p) => p.id);
      if (governanceIds !== undefined) {
        const seen = new Set(governanceIds);
        const fresh = gov.value.filter((p) => !seen.has(p.id)).slice(0, 12);
        for (const p of fresh) {
          newProposals.push({ spaceName: p.spaceName, title: p.title });
          signals.push({
            id: `radar-governance-${slug(p.spaceId)}-${p.id.slice(0, 16)}`,
            signalType: 'GOVERNANCE_PROPOSAL',
            source: gov.source ?? 'Snapshot GraphQL',
            entity: `${p.spaceName} — ${p.title}`,
            asset: null,
            protocol: p.spaceName,
            network: null,
            poolKey: null,
            radarType: 'Governance',
            boardState: 'NEW',
            observedAt: p.created * 1000,
            evidence: [
              `Snapshot proposal "${p.title}" in the ${p.spaceName} space (${p.spaceId}), state ${p.state}, created ${fmtTime(p.created * 1000)}, voting ends ${fmtTime(p.end * 1000)}`,
              'Governance intelligence for the owner\u2019s review — the platform observes proposals; it never votes or signs',
            ],
            evidenceCount: 2,
            sourceCount: 1,
            supportStatus: 'OBSERVED',
            freshness: gov.status === 'STALE' ? 'STALE' : gov.status === 'LIVE' || gov.status === 'CACHED' ? 'CURRENT' : 'UNKNOWN',
          });
        }
      }
      governanceIds = [...currentIds, ...(governanceIds ?? []).filter((id) => !currentIds.includes(id))].slice(0, 600);
    }
  } catch {
    /* a failed governance fetch mints nothing and keeps the old baseline set */
  }

  /* DEX volume (v207) — the governed DefiLlama DEX overview.
   * The source reports each DEX's 24h volume and the prior
   * day's, so the move rests on the source's own pair of
   * observations. Watched set: 24h volume ≥ $1M, top 150 by
   * volume. A signal mints at a ±30% day-over-day move (HOT at
   * ±100%) only when the move itself shifted 5+ points since
   * the baseline — re-scans of the same observation stay
   * quiet, exactly like the price guard. Minting is capped at
   * the 12 largest qualifying DEXes per scan (materiality
   * first) — a market-wide volume day must not flood the
   * board; the baseline still records all 150 watched. */
  let dexVolumes: Record<string, number> = { ...(baseline?.dexVolumes ?? {}) };
  try {
    const dv = await fetchDexVolumes();
    if (dv.value && dv.value.length > 0) {
      const watched = dv.value.filter((e) => e.total24h >= 1_000_000).slice(0, 150);
      const next: Record<string, number> = {};
      const qualifying = watched.filter((e) => {
        if (e.changePct === null) return false;
        next[e.slug] = e.changePct;
        if (Math.abs(e.changePct) < 30) return false;
        const prevChange = baseline?.dexVolumes?.[e.slug];
        return !(prevChange !== undefined && Math.abs(e.changePct - prevChange) < 5);
      });
      qualifying.sort((a, b) => b.total24h - a.total24h);
      for (const e of qualifying.slice(0, 12)) {
        const changePct = e.changePct ?? 0;
        const up = changePct >= 0;
        signals.push({
          id: `radar-dex-volume-${up ? 'surge' : 'drop'}-${slug(e.slug)}-${dv.fetchedAt ?? observedAt}`,
          signalType: up ? 'DEX_VOLUME_INCREASE' : 'DEX_VOLUME_DECREASE',
          source: dv.source ?? 'DefiLlama DEX Overview',
          entity: e.name,
          asset: null,
          protocol: e.name,
          network: e.chains[0] ?? null,
          poolKey: null,
          radarType: 'Market',
          boardState: Math.abs(changePct) >= 100 ? 'HOT' : up ? 'GROWING' : 'DECLINING',
          observedAt: dv.fetchedAt ?? observedAt,
          evidence: [
            `${dv.source ?? 'DefiLlama DEX Overview'} reports ${e.name} 24h volume ${fmtUsd(e.total24h)} vs ${e.prev24h !== null ? fmtUsd(e.prev24h) : 'not reported'} the prior day (${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%), across ${e.chains.length} chain(s) (${dv.status})`,
            'An observation of flow, not earnings — intelligence for review, never a trade signal the platform acts on',
          ],
          evidenceCount: 2,
          sourceCount: 1,
          supportStatus: 'OBSERVED',
          freshness: dv.status === 'STALE' ? 'STALE' : dv.status === 'LIVE' || dv.status === 'CACHED' ? 'CURRENT' : 'UNKNOWN',
        });
      }
      dexVolumes = next;
    }
  } catch {
    /* a failed overview feed mints nothing */
  }

  /* Protocol fees (v208) — the governed DefiLlama fees
   * overview, the DEX-volume block's sibling. Watched set:
   * 24h fees ≥ $100K, top 100 by fees (all baselined). Same
   * ±30% mint threshold (HOT ±100%), same 5-point baseline
   * guard, same 12-per-scan materiality cap. Fees are a
   * protocol's own revenue observation — the evidence says
   * plainly they are not the platform's or Daniel's earnings. */
  let protocolFees: Record<string, number> = { ...(baseline?.protocolFees ?? {}) };
  try {
    const pf = await fetchProtocolFees();
    if (pf.value && pf.value.length > 0) {
      const watched = pf.value.filter((e) => e.total24h >= 100_000).slice(0, 100);
      const next: Record<string, number> = {};
      const qualifying = watched.filter((e) => {
        if (e.changePct === null) return false;
        next[e.slug] = e.changePct;
        if (Math.abs(e.changePct) < 30) return false;
        const prevChange = baseline?.protocolFees?.[e.slug];
        return !(prevChange !== undefined && Math.abs(e.changePct - prevChange) < 5);
      });
      qualifying.sort((a, b) => b.total24h - a.total24h);
      for (const e of qualifying.slice(0, 12)) {
        const changePct = e.changePct ?? 0;
        const up = changePct >= 0;
        signals.push({
          id: `radar-protocol-fees-${up ? 'surge' : 'drop'}-${slug(e.slug)}-${pf.fetchedAt ?? observedAt}`,
          signalType: up ? 'FEES_INCREASE' : 'FEES_DECREASE',
          source: pf.source ?? 'DefiLlama Fees Overview',
          entity: e.name,
          asset: null,
          protocol: e.name,
          network: e.chains[0] ?? null,
          poolKey: null,
          radarType: 'Market',
          boardState: Math.abs(changePct) >= 100 ? 'HOT' : up ? 'GROWING' : 'DECLINING',
          observedAt: pf.fetchedAt ?? observedAt,
          evidence: [
            `${pf.source ?? 'DefiLlama Fees Overview'} reports ${e.name} 24h protocol fees ${fmtUsd(e.total24h)} vs ${e.prev24h !== null ? fmtUsd(e.prev24h) : 'not reported'} the prior day (${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%) (${pf.status})`,
            "Protocol fees are that protocol's own revenue observation — not the platform's earnings and not Daniel's. Intelligence for review only",
          ],
          evidenceCount: 2,
          sourceCount: 1,
          supportStatus: 'OBSERVED',
          freshness: pf.status === 'STALE' ? 'STALE' : pf.status === 'LIVE' || pf.status === 'CACHED' ? 'CURRENT' : 'UNKNOWN',
        });
      }
      protocolFees = next;
    }
  } catch {
    /* a failed fees feed mints nothing */
  }

  /* Record the signals (deduped by id — a re-scan of the same
   * observation mints nothing twice). */
  const stored = loadSignals();
  const known = new Set(stored.map((s) => s.id));
  const freshSignals = signals.filter((s) => !known.has(s.id));
  if (freshSignals.length > 0) saveSignals([...freshSignals, ...stored]);

  /* Opportunity candidates: one per pool behind a NEW / GROWING /
   * HOT positive signal, in the owner's opportunity store, born
   * DISCOVERED / UNVERIFIED with the radar review state carried
   * on the record's radar block. No return figures — ever. */
  const opps = loadOpps();
  const oppIds = new Set(opps.map((r) => r.id));
  const qualifying = new Map<string, MoneySignal[]>();
  for (const s of freshSignals) {
    if (!s.poolKey) continue;
    if (s.signalType !== 'POOL_CREATION' && s.signalType !== 'TVL_INCREASE' && s.signalType !== 'APY_INCREASE' && s.signalType !== 'VOLUME_INCREASE') continue;
    qualifying.set(s.poolKey, [...(qualifying.get(s.poolKey) ?? []), s]);
  }
  let candidatesCreated = 0;
  let candidatesExisting = 0;
  const candidatePools: PoolObs[] = [];
  const newOpps: OppRecordLoose[] = [];
  for (const [key, sigs] of qualifying) {
    const pool = current.find((p) => p.key === key);
    if (!pool) continue;
    candidatePools.push(pool);
    const id = `opp-radar-${slug(pool.key)}`;
    if (oppIds.has(id)) {
      candidatesExisting += 1;
      continue;
    }
    oppIds.add(id);
    candidatesCreated += 1;
    newOpps.push({
      id,
      title: `${pool.project} ${pool.symbol} pool (${pool.chain}) — Money Radar ${sigs[0].radarType}`,
      assetRef: { assetClassId: '', chain: pool.chain },
      networkRef: { networkId: '' },
      majorActivityId: '',
      typeId: '',
      strategyId: '',
      source: 'worker-runtime:money-radar',
      verificationStatus: 'UNVERIFIED',
      pipelineState: 'DISCOVERED',
      protocolRef: { name: pool.project, source: 'DefiLlama Yields (yields.llama.fi/pools)' },
      returnSource: {
        description:
          'Pool yield is reported by the source and shown, source-labelled, on the yields surface — never copied into this record.',
        source: 'DefiLlama Yields',
      },
      radar: {
        type: sigs[0].radarType,
        asset: pool.symbol,
        boardState: 'READY_FOR_REVIEW',
        signalIds: sigs.map((s) => s.id),
        evidenceCount: sigs.reduce((n, s) => n + s.evidenceCount, 0),
        sourceCount: 1,
        supportStatus: 'OBSERVED',
        freshness,
      },
    });
  }
  if (newOpps.length > 0) {
    try {
      localStorage.setItem(OPP_KEY, JSON.stringify([...newOpps, ...opps]));
    } catch {
      candidatesCreated = 0;
    }
  }

  /* STAR dispatch: surface the findings to the Tribe as work
   * orders in the Bot Work Queue. Verification orders for the
   * candidate pools route to the Yield role; decline reviews to
   * Risk; capital-flow reviews to Analysis. Each order goes to
   * the principal currently holding that role assignment, or to
   * the UNASSIGNED POOL when nobody holds it. Open duplicates
   * are never re-created. */
  const dispatched: RadarDispatch[] = [];
  let tasks = loadTasks();
  const openTitles = new Set(
    tasks
      .filter((t) => !['COMPLETE', 'FAILED', 'CANCELED'].includes(t.state))
      .map((t) => t.title),
  );
  const dispatch = (title: string, role: string) => {
    if (dispatched.length >= MAX_DISPATCH_PER_SCAN || openTitles.has(title)) return;
    const principal = principalForRole(role);
    const next = createTask(tasks, { title, role, principal: principal?.id ?? null });
    if (next.length === tasks.length) return;
    tasks = next;
    openTitles.add(title);
    dispatched.push({ title, role, principalName: principal?.name ?? 'UNASSIGNED POOL' });
  };
  for (const pool of candidatePools) {
    dispatch(`Money Radar: verify ${pool.project} ${pool.symbol} (${pool.chain})`, 'Yield');
  }
  for (const s of freshSignals) {
    if (!s.poolKey) continue;
    if (s.signalType !== 'TVL_DECREASE' && s.signalType !== 'APY_DECREASE' && s.signalType !== 'POOL_REMOVED' && s.signalType !== 'VOLUME_DECREASE') continue;
    const pool = [...current, ...(baseline?.pools ?? [])].find((p) => p.key === s.poolKey);
    if (pool) dispatch(`Money Radar: risk review ${pool.project} ${pool.symbol} (${pool.chain})`, 'Risk');
  }
  for (const s of freshSignals) {
    if (s.signalType === 'LARGE_CAPITAL_MOVEMENT') {
      dispatch(`Money Radar: capital flow review ${s.protocol}`, 'Analysis');
    }
  }
  for (const s of freshSignals) {
    if ((s.signalType === 'PRICE_SURGE' || s.signalType === 'PRICE_DROP') && s.boardState === 'HOT') {
      dispatch(`Money Radar: price move review ${s.asset}`, 'Analysis');
    }
  }
  for (const s of freshSignals) {
    if ((s.signalType === 'DEX_VOLUME_INCREASE' || s.signalType === 'DEX_VOLUME_DECREASE') && s.boardState === 'HOT') {
      dispatch(`Money Radar: DEX volume review ${s.entity}`, 'Analysis');
    }
  }
  for (const s of freshSignals) {
    if ((s.signalType === 'FEES_INCREASE' || s.signalType === 'FEES_DECREASE') && s.boardState === 'HOT') {
      dispatch(`Money Radar: protocol fees review ${s.entity}`, 'Analysis');
    }
  }
  if (newDexNames.length > 0) {
    dispatch(
      `Money Radar: classify + place new DEX candidate(s): ${newDexNames.slice(0, 4).join(', ')}${newDexNames.length > 4 ? ', …' : ''}`,
      'Research',
    );
  }
  for (const p of newProposals) {
    dispatch(`Money Radar: governance review ${p.spaceName} — ${p.title.slice(0, 48)}`, 'Analysis');
  }

  saveBaseline({ observedAt, source, status: obs.status, pools: current, prices: priceObs, protocolSlugs, governanceIds, dexVolumes, protocolFees });
  return {
    status: obs.status,
    source,
    fetchedAt: observedAt,
    poolsObserved: current.length,
    baselineWasEmpty: !baseline || baseline.pools.length === 0,
    signals: freshSignals,
    candidatesCreated,
    candidatesExisting,
    dispatched,
  };
}

/* Board state at read time: a signal's recorded state stands
 * while it is young; past 7 days unrefreshed it reads STALE,
 * past 30 days EXPIRED — the STAR Opportunity Board states. */
export function boardStateAt(signal: MoneySignal, now: number): RadarBoardState {
  const ageDays = (now - signal.observedAt) / 86_400_000;
  if (ageDays > 30) return 'EXPIRED';
  if (ageDays > 7) return 'STALE';
  return signal.boardState;
}

export interface RadarSummary {
  totalSignals: number;
  byBoard: Record<RadarBoardState, number>;
  latest: MoneySignal[];
  lastScanAt: number | null;
  poolsTracked: number;
  radarCandidates: number;
  dispatchedOpen: number;
  assetRadar: { asset: string; protocols: string[]; networks: string[]; pools: number; opportunities: number }[];
  protocolRadar: { protocol: string; pools: number; watchedTvlUsd: number; signals: number }[];
}

export function moneyRadarSummary(): RadarSummary {
  const now = Date.now();
  const signals = loadSignals();
  const byBoard: Record<RadarBoardState, number> = { NEW: 0, HOT: 0, GROWING: 0, DECLINING: 0, STALE: 0, EXPIRED: 0 };
  for (const s of signals) byBoard[boardStateAt(s, now)] += 1;
  const baseline = loadBaseline();
  const opps = loadOpps();
  const radarOpps = opps.filter((r) => r.radar && typeof r.radar === 'object');
  const tasks = loadTasks();
  const dispatchedOpen = tasks.filter(
    (t) => t.title.startsWith('Money Radar:') && !['COMPLETE', 'FAILED', 'CANCELED'].includes(t.state),
  ).length;
  const assetMap = new Map<string, { protocols: Set<string>; networks: Set<string>; pools: number }>();
  for (const p of baseline?.pools ?? []) {
    const row = assetMap.get(p.symbol) ?? { protocols: new Set<string>(), networks: new Set<string>(), pools: 0 };
    row.protocols.add(p.project);
    row.networks.add(p.chain);
    row.pools += 1;
    assetMap.set(p.symbol, row);
  }
  const assetRadar = [...assetMap.entries()].map(([asset, row]) => ({
    asset,
    protocols: [...row.protocols],
    networks: [...row.networks],
    pools: row.pools,
    opportunities: radarOpps.filter((r) => r.radar?.asset === asset).length,
  }));
  const protocolMap = new Map<string, { pools: number; watchedTvlUsd: number }>();
  for (const p of baseline?.pools ?? []) {
    const row = protocolMap.get(p.project) ?? { pools: 0, watchedTvlUsd: 0 };
    row.pools += 1;
    row.watchedTvlUsd += p.tvlUsd;
    protocolMap.set(p.project, row);
  }
  const protocolRadar = [...protocolMap.entries()].map(([protocol, row]) => ({
    protocol,
    pools: row.pools,
    watchedTvlUsd: row.watchedTvlUsd,
    signals: signals.filter((s) => s.protocol === protocol).length,
  }));
  return {
    totalSignals: signals.length,
    byBoard,
    latest: signals.slice(0, 6),
    lastScanAt: baseline?.observedAt ?? null,
    poolsTracked: baseline?.pools.length ?? 0,
    radarCandidates: radarOpps.length,
    dispatchedOpen,
    assetRadar,
    protocolRadar,
  };
}

export function moneyRadarSummaryText(): string {
  const s = moneyRadarSummary();
  const active = RADAR_CATEGORY_STATES.filter((c) => c.state === 'ACTIVE').map((c) => c.name);
  const noData = RADAR_CATEGORY_STATES.filter((c) => c.state === 'NO_DATA').map((c) => c.name);
  if (s.totalSignals === 0) {
    return `From the platform's own records: Money Radar is built — the Opportunity Intelligence layer between the World Engine and Opportunities — and it has recorded no signals yet. Say "run money radar" and a worker fetches the governed yields observation, diffs it against the stored baseline, records the money-movement signals, generates opportunity candidates, and dispatches the follow-up work to the Tribe as queue orders. Active radars today: ${active.join(', ')}. Reading NO_DATA until a source connects: ${noData.join(', ')}. The radar observes and surfaces only — it never moves money.`;
  }
  const board = RADAR_BOARD_STATES.map((b) => `${b} ${s.byBoard[b]}`).join(' · ');
  const latest = s.latest
    .map((x) => `${x.signalType} — ${x.entity} (${boardStateAt(x, Date.now())}, evidence ${x.evidenceCount}, ${x.supportStatus})`)
    .join(' · ');
  return `From the platform's own records: Money Radar holds ${s.totalSignals} signal(s) over ${s.poolsTracked} tracked watched pools — board: ${board}. ${s.radarCandidates} radar opportunity candidate(s) sit in the opportunity store at DISCOVERED / UNVERIFIED for your review, and ${s.dispatchedOpen} radar work order(s) are open in the Bot Work Queue for the Tribe. Latest signals: ${latest}. Signals come only from governed observations (DefiLlama Yields, the BTC/ETH/SOL price chains, the DefiLlama protocol index, the DefiLlama DEX and fees overviews, and Snapshot governance — the diffed sources scan-over-scan, the reported-move sources baseline-guarded); categories without a source read NO_DATA. The radar ranks and explains — acting on a candidate is your step, outside the platform.`;
}
