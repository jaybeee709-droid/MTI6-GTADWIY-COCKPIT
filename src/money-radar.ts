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
import { fetchYields, fmtTime, fmtUsd, type PoolYield } from './live-data';
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
  radarType: RadarType;
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
  { name: 'Yield', state: 'ACTIVE', note: 'DefiLlama Yields watched pools' },
  { name: 'Liquidity', state: 'ACTIVE', note: 'Curve / Uniswap watched pools in the yields feed' },
  { name: 'Lending', state: 'ACTIVE', note: 'Aave / Compound / Kamino watched pools' },
  { name: 'Staking', state: 'ACTIVE', note: 'Lido watched pools' },
  { name: 'Restaking', state: 'NO_DATA', note: 'EigenLayer and Babylon are absent from the yields source' },
  { name: 'Governance', state: 'NO_DATA', note: 'no governance source connected (Snapshot is registered, not wired to the radar)' },
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
}

interface RadarBaseline {
  observedAt: number;
  source: string | null;
  status: string;
  pools: PoolObs[];
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
  }));
  const baseline = loadBaseline();
  const prev = new Map((baseline?.pools ?? []).map((p) => [p.key, p]));
  const signals: MoneySignal[] = [];
  const mk = (
    signalType: string,
    pool: PoolObs | null,
    project: string,
    radarType: RadarType,
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
    if (s.signalType !== 'POOL_CREATION' && s.signalType !== 'TVL_INCREASE' && s.signalType !== 'APY_INCREASE') continue;
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
    if (s.signalType !== 'TVL_DECREASE' && s.signalType !== 'APY_DECREASE' && s.signalType !== 'POOL_REMOVED') continue;
    const pool = [...current, ...(baseline?.pools ?? [])].find((p) => p.key === s.poolKey);
    if (pool) dispatch(`Money Radar: risk review ${pool.project} ${pool.symbol} (${pool.chain})`, 'Risk');
  }
  for (const s of freshSignals) {
    if (s.signalType === 'LARGE_CAPITAL_MOVEMENT') {
      dispatch(`Money Radar: capital flow review ${s.protocol}`, 'Analysis');
    }
  }

  saveBaseline({ observedAt, source, status: obs.status, pools: current });
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
  return `From the platform's own records: Money Radar holds ${s.totalSignals} signal(s) over ${s.poolsTracked} tracked watched pools — board: ${board}. ${s.radarCandidates} radar opportunity candidate(s) sit in the opportunity store at DISCOVERED / UNVERIFIED for your review, and ${s.dispatchedOpen} radar work order(s) are open in the Bot Work Queue for the Tribe. Latest signals: ${latest}. Signals come only from governed observations (DefiLlama Yields today); categories without a source read NO_DATA. The radar ranks and explains — acting on a candidate is your step, outside the platform.`;
}
