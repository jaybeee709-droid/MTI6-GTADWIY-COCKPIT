/* Opportunity Scanner (v214) — the unified board the owner's
 * relayed design asked for (reconciliation:
 * OPPORTUNITY-SCANNER-RECONCILIATION-2026-11-24.md).
 *
 * One ranked board over everything the bots already find:
 * Money Radar signals + radar/opportunity candidates, each
 * entry tagged to a Crypto World lane (the canonical 24
 * contents in js/worlds.js govern — lanes are those names).
 *
 * Ranking is by EVIDENCE DIMENSIONS ONLY — board state,
 * evidence count, source count, support status, freshness,
 * recency. This platform publishes NO composite opportunity
 * score (no 0–100, no Gold/Silver/Bronze): a score would be a
 * number the evidence does not carry. Candidates are
 * UNVERIFIED until Daniel's gate. The scanner never executes;
 * execution lives only in the Swap Desk's owner-sign flow. */
import { loadSignals, boardStateAt, type MoneySignal } from './money-radar';

export interface ScannerEntry {
  id: string;
  kind: 'SIGNAL' | 'CANDIDATE';
  title: string;
  lane: string;
  boardState: string;
  evidenceCount: number;
  sourceCount: number;
  supportStatus: string;
  freshness: string;
  observedAt: number;
  detail: string;
}

/** Lanes of the canonical 24 with NO live scanner source yet.
 * Named honestly on the panel — never filled with invented
 * coverage. (Trading, Swaps, Liquidity, Yield Farming,
 * Staking, Lending, Vaults and Governance have sources via
 * the radar, the yields feed and the registries.) */
export const SCANNER_NO_DATA_LANES: string[] = [
  'Arbitrage', 'Restaking', 'Borrowing', 'Derivatives', 'BTCFi', 'Cross-Chain',
  'NFT-Fi', 'Insurance', 'Oracle', 'RWA', 'DePIN', 'AI Tokens',
  'Nodes', 'Validators', 'Modular Infrastructure', 'Identity Infrastructure',
];

const PROJECT_LANES: [RegExp, string][] = [
  [/aave|compound|morpho|spark|euler|venus|kamino|marginfi/i, 'Lending'],
  [/lido|rocket|ether\.?fi|stakewise|frax/i, 'Staking'],
  [/uniswap|pancake|sushi|curve|balancer|raydium|aerodrome|velodrome|orca/i, 'Swaps'],
  [/yearn|beefy|convex|pendle/i, 'Yield Farming'],
];

export function laneForProject(name: string | null | undefined): string | null {
  if (!name) return null;
  for (const [re, lane] of PROJECT_LANES) if (re.test(name)) return lane;
  return null;
}

function laneForSignal(s: MoneySignal): string {
  if (s.radarType === 'Governance' || s.signalType === 'GOVERNANCE_PROPOSAL') return 'Governance';
  if (s.signalType === 'NEW_PROTOCOL') return 'Swaps';
  if (s.radarType === 'Market') return 'Trading';
  if (s.poolKey || /^(POOL_|TVL_|APY_|VOLUME_)/.test(s.signalType)) {
    return laneForProject(s.protocol) ?? laneForProject(s.entity) ?? 'Yield Farming';
  }
  return laneForProject(s.protocol) ?? 'Trading';
}

const STATE_WEIGHT: Record<string, number> = {
  HOT: 0, NEW: 1, GROWING: 2, READY_FOR_REVIEW: 3, DECLINING: 4, STALE: 5, EXPIRED: 6,
};

interface OppLoose {
  id: string;
  title: string;
  pipelineState?: string;
  radar?: {
    type?: string;
    boardState?: string;
    evidenceCount?: number;
    sourceCount?: number;
    supportStatus?: string;
    freshness?: string;
  };
  protocolRef?: { name?: string } | string;
  [k: string]: unknown;
}

function loadOpps(): OppLoose[] {
  try {
    const raw = localStorage.getItem('mti6_opportunities_v1');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as OppLoose[]) : [];
  } catch {
    return [];
  }
}

export function scannerBoard(limit = 60): {
  entries: ScannerEntry[];
  laneCounts: Record<string, number>;
  signalCount: number;
  candidateCount: number;
} {
  const now = Date.now();
  const entries: ScannerEntry[] = [];
  const signals = loadSignals();
  for (const s of signals) {
    entries.push({
      id: `sig-${s.id}`,
      kind: 'SIGNAL',
      title: `${s.entity}${s.asset ? ` · ${s.asset}` : ''} — ${s.signalType.replace(/_/g, ' ')}`,
      lane: laneForSignal(s),
      boardState: boardStateAt(s, now),
      evidenceCount: s.evidenceCount,
      sourceCount: s.sourceCount,
      supportStatus: s.supportStatus,
      freshness: s.freshness,
      observedAt: s.observedAt,
      detail: s.evidence[0] ?? '',
    });
  }
  let candidateCount = 0;
  for (const o of loadOpps()) {
    if (!o.radar) continue;
    candidateCount += 1;
    const protoName =
      typeof o.protocolRef === 'object' && o.protocolRef ? o.protocolRef.name : undefined;
    entries.push({
      id: `opp-${o.id}`,
      kind: 'CANDIDATE',
      title: o.title,
      lane: laneForProject(protoName) ?? laneForProject(o.title) ?? 'Yield Farming',
      boardState: (o.radar.boardState ?? 'READY_FOR_REVIEW').replace(/_/g, ' '),
      evidenceCount: o.radar.evidenceCount ?? 0,
      sourceCount: o.radar.sourceCount ?? 0,
      supportStatus: o.radar.supportStatus ?? 'OBSERVED',
      freshness: o.radar.freshness ?? 'UNKNOWN',
      observedAt: now,
      detail: `Pipeline: ${o.pipelineState ?? 'DISCOVERED'} · UNVERIFIED — advances only through Daniel's gate.`,
    });
  }
  entries.sort((a, b) => {
    const w = (STATE_WEIGHT[a.boardState.replace(/ /g, '_')] ?? 3) - (STATE_WEIGHT[b.boardState.replace(/ /g, '_')] ?? 3);
    if (w !== 0) return w;
    if (b.evidenceCount !== a.evidenceCount) return b.evidenceCount - a.evidenceCount;
    if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount;
    return b.observedAt - a.observedAt;
  });
  const laneCounts: Record<string, number> = {};
  for (const e of entries) laneCounts[e.lane] = (laneCounts[e.lane] ?? 0) + 1;
  return { entries: entries.slice(0, limit), laneCounts, signalCount: signals.length, candidateCount };
}

export function scannerSummaryText(): string {
  const b = scannerBoard(5);
  const lanes = Object.entries(b.laneCounts)
    .sort((x, y) => y[1] - x[1])
    .map(([l, n]) => `${l} ${n}`)
    .join(' · ');
  const top = b.entries
    .map((e, i) => `${i + 1}. [${e.lane}] ${e.title} (${e.boardState}; evidence ${e.evidenceCount}, sources ${e.sourceCount}, ${e.supportStatus})`)
    .join(' ');
  return (
    `Opportunity Scanner — one board over everything the bots find: ${b.signalCount} radar signals, ${b.candidateCount} candidates. ` +
    (lanes ? `Lanes with live findings: ${lanes}. ` : 'No findings yet — run a Money Radar scan from Bot Operations. ') +
    (top ? `Top by evidence: ${top}. ` : '') +
    `Ranked by evidence dimensions only — this platform publishes no opportunity scores, and every candidate is UNVERIFIED until your gate. ` +
    `Lanes still NO_DATA (no source connected): ${SCANNER_NO_DATA_LANES.join(', ')}. The scanner discovers and ranks; it never executes — execution is the Swap Desk, signed by you.`
  );
}
