/* D6 AUTONOMOUS EXECUTOR — DRY-RUN STAGE ONLY (v219).
 *
 * Decision: D6 ACCEPTED WITH CONSTRAINTS, 2026-11-24
 * (Daniel: "Build d6 now" — the build authorized is the
 * paper's §6 dry-run stage). This file is the full decision
 * path: read radar candidates → evaluate the paper's gates
 * → log the would-be trade. IT SIGNS NOTHING.
 *
 * What does NOT exist in this build, by design:
 *  - No signing function. No key is read, no transaction is
 *    built, nothing is broadcast, no wallet is created.
 *  - No scheduled server function. The executor runs when
 *    asked (the console's RUN button); a schedule belongs to
 *    the live stage and needs Daniel's separate decision
 *    after he reviews the dry-run log.
 *  - No live pilot. The live flip needs Daniel's explicit
 *    decision after dry-run review, plus a hot wallet he
 *    creates and funds and a key he places in Netlify
 *    himself. Until then EXECUTOR_MODE is 'DRY_RUN' and
 *    there is no other mode in this file.
 *
 * Gates (§3 of the paper, evaluated in order):
 *  1. KILL_SWITCH — the in-app halt flag. A halted run
 *     evaluates nothing.
 *  2. ONE_OPEN_POSITION — one pilot position at a time.
 *  3. DAILY_CAP — $25/day of would-be volume.
 *  4. NOT_SWAPPABLE_BASE — candidate token must be in the
 *     catalogue with Base support (DEX only, D2).
 *  5. NO_QUOTE — a fresh live quote must answer.
 *  6. HONEYPOT — a live Honeypot.is flag refuses the trade.
 *  7. LOSS_STOP — 20% from the funding mark. The mark is
 *     NOT_MEASURABLE in dry-run: no hot wallet exists yet,
 *     so the stop arms when Daniel funds the wallet.
 *  Slippage: the keyless quote carries no slippage figure,
 *  so it reads NOT_MEASURED; the bound is enforced at
 *  signing from the venue's own quote (the desk's rule).
 *  Pair intel (v220, NOT a gate): when a decision reaches
 *  WOULD_TRADE, the top DexScreener pair and a GeckoTerminal
 *  price cross-check are attached to the record as
 *  intelligence. A pair source that does not answer reads
 *  null — it never blocks or changes the decision.
 *
 * Records: every run is an observation in localStorage
 * (mti6_executor_dryrun_v1). A would-be trade is not a
 * trade — it has no tx hash and no balance read-back. */
import { fetchSwapQuote, fetchHoneypotCheck, fetchDexPairIntel, fetchGeckoTerminalPrice, rawFromHuman } from './live-data';
import { listRadarCandidates } from './money-radar';
import { swappableBySymbol } from './swap-desk';

export const EXECUTOR_MODE = 'DRY_RUN' as const;
export const EXECUTOR_PER_TRADE_USD = 10;
export const EXECUTOR_DAILY_CAP_USD = 25;
export const EXECUTOR_PILOT_SIZE_USD = 10;
export const EXECUTOR_LOSS_STOP_PCT = 20;
export const EXECUTOR_NETWORK = 'base' as const;
export const EXECUTOR_FROM_SYMBOL = 'USDC';

const RUNS_KEY = 'mti6_executor_dryrun_v1';
const HALT_KEY = 'mti6_executor_halt_v1';
const MAX_RUNS = 50;

export interface ExecutorDecision {
  candidateId: string;
  asset: string;
  fromSymbol: string;
  toSymbol: string;
  amountUsd: number;
  network: 'base';
  quoteSource: string | null;
  quoteStatus: string | null;
  toAmount: string | null;
  gasCostUsd: number | null;
  honeypot: boolean | null;
  honeypotRisk: string | null;
  /** DEX pair intelligence (v220): top DexScreener pair + a
   * GeckoTerminal price cross-check for the token the trade
   * would buy. Intelligence only — it never gates a decision,
   * and null means the pair sources did not answer. */
  pairIntel: string | null;
  decision: 'WOULD_TRADE' | 'WOULD_SKIP';
  ruleFired: string;
  reason: string;
  at: number;
}

export interface ExecutorRun {
  id: string;
  ranAt: number;
  mode: 'DRY_RUN';
  halted: boolean;
  decisions: ExecutorDecision[];
  wouldBeVolumeUsd: number;
  note: string;
}

export function executorHalted(): boolean {
  try {
    return localStorage.getItem(HALT_KEY) === '1';
  } catch {
    return false;
  }
}

export function setExecutorHalted(halted: boolean): void {
  try {
    localStorage.setItem(HALT_KEY, halted ? '1' : '0');
  } catch {
    /* storage unavailable — the halt does not persist */
  }
}

export function loadExecutorRuns(): ExecutorRun[] {
  try {
    const raw = localStorage.getItem(RUNS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as ExecutorRun[]) : [];
  } catch {
    return [];
  }
}

function saveRuns(runs: ExecutorRun[]): void {
  try {
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs.slice(0, MAX_RUNS)));
  } catch {
    /* storage unavailable — the run is not recorded */
  }
}

export function executorSummary(): {
  runs: number;
  wouldBeTrades: number;
  wouldBeVolumeUsd: number;
  todayWouldBeVolumeUsd: number;
  pilotPositionOpen: boolean;
  halted: boolean;
  lastRunAt: number | null;
} {
  const runs = loadExecutorRuns();
  const today = new Date().toDateString();
  let wouldBeTrades = 0;
  let wouldBeVolumeUsd = 0;
  let todayWouldBeVolumeUsd = 0;
  let pilotPositionOpen = false;
  for (const run of runs) {
    for (const d of run.decisions) {
      if (d.decision === 'WOULD_TRADE') {
        wouldBeTrades += 1;
        wouldBeVolumeUsd += d.amountUsd;
        if (new Date(d.at).toDateString() === today) todayWouldBeVolumeUsd += d.amountUsd;
      }
    }
  }
  // The pilot position is open when the latest WOULD_TRADE has
  // no WOULD_CLOSE after it; a close is recorded as a run whose
  // note names the close.
  for (const run of runs) {
    if (run.note.startsWith('PILOT POSITION CLOSED')) {
      pilotPositionOpen = false;
      break;
    }
    if (run.decisions.some((d) => d.decision === 'WOULD_TRADE')) {
      pilotPositionOpen = true;
      break;
    }
  }
  return {
    runs: runs.length,
    wouldBeTrades,
    wouldBeVolumeUsd,
    todayWouldBeVolumeUsd,
    pilotPositionOpen,
    halted: executorHalted(),
    lastRunAt: runs.length ? runs[0].ranAt : null,
  };
}

export function closePilotPosition(): ExecutorRun {
  const run: ExecutorRun = {
    id: `exec-${Date.now()}-close`,
    ranAt: Date.now(),
    mode: 'DRY_RUN',
    halted: executorHalted(),
    decisions: [],
    wouldBeVolumeUsd: 0,
    note: 'PILOT POSITION CLOSED (dry-run record only — nothing real was open, nothing was sold). The one-position rule is free again.',
  };
  saveRuns([run, ...loadExecutorRuns()]);
  return run;
}

/** One dry-run cycle: evaluate the strongest radar candidate
 *  against the paper's gates and log what would have happened. */
export async function runDryRunCycle(): Promise<ExecutorRun> {
  const at = Date.now();
  const halted = executorHalted();
  const base: Omit<ExecutorRun, 'decisions' | 'wouldBeVolumeUsd' | 'note'> = {
    id: `exec-${at}`,
    ranAt: at,
    mode: 'DRY_RUN',
    halted,
  };
  if (halted) {
    const run: ExecutorRun = {
      ...base,
      decisions: [],
      wouldBeVolumeUsd: 0,
      note: 'HALTED — kill switch on. No candidate was evaluated and nothing was decided.',
    };
    saveRuns([run, ...loadExecutorRuns()]);
    return run;
  }
  const summary = executorSummary();
  if (summary.pilotPositionOpen) {
    const run: ExecutorRun = {
      ...base,
      decisions: [],
      wouldBeVolumeUsd: 0,
      note: 'WOULD_SKIP — ONE_OPEN_POSITION: the pilot already holds one would-be position. Close it from the console before the next evaluation.',
    };
    saveRuns([run, ...loadExecutorRuns()]);
    return run;
  }
  if (summary.todayWouldBeVolumeUsd + EXECUTOR_PILOT_SIZE_USD > EXECUTOR_DAILY_CAP_USD) {
    const run: ExecutorRun = {
      ...base,
      decisions: [],
      wouldBeVolumeUsd: 0,
      note: `WOULD_SKIP — DAILY_CAP: today\'s would-be volume is $${summary.todayWouldBeVolumeUsd}; another $${EXECUTOR_PILOT_SIZE_USD} would pass the $${EXECUTOR_DAILY_CAP_USD} daily cap.`,
    };
    saveRuns([run, ...loadExecutorRuns()]);
    return run;
  }
  const candidates = listRadarCandidates();
  if (!candidates.length) {
    const run: ExecutorRun = {
      ...base,
      decisions: [],
      wouldBeVolumeUsd: 0,
      note: 'NO_CANDIDATE — the radar holds no candidates, so there is nothing to evaluate. The cycle ran and found nothing; that is a result, not a failure.',
    };
    saveRuns([run, ...loadExecutorRuns()]);
    return run;
  }
  const candidate = candidates[0];
  const to = swappableBySymbol(candidate.asset, 'base');
  if (!to) {
    const run: ExecutorRun = {
      ...base,
      decisions: [
        {
          candidateId: candidate.id,
          asset: candidate.asset,
          fromSymbol: EXECUTOR_FROM_SYMBOL,
          toSymbol: candidate.asset,
          amountUsd: EXECUTOR_PILOT_SIZE_USD,
          network: 'base',
          quoteSource: null,
          quoteStatus: null,
          toAmount: null,
          gasCostUsd: null,
          honeypot: null,
          honeypotRisk: null,
          pairIntel: null,
          decision: 'WOULD_SKIP',
          ruleFired: 'NOT_SWAPPABLE_BASE',
          reason: `${candidate.asset} is a radar candidate but is not a catalogued swappable token on Base — the executor only trades the catalogue, DEX only.`,
          at,
        },
      ],
      wouldBeVolumeUsd: 0,
      note: 'LOSS_STOP NOT_MEASURABLE — no hot wallet exists yet, so there is no funding mark; the 20% stop arms when Daniel funds the wallet. Slippage NOT_MEASURED — the keyless quote carries no slippage figure; the bound is enforced at signing from the venue quote.',
    };
    saveRuns([run, ...loadExecutorRuns()]);
    return run;
  }
  const from = swappableBySymbol(EXECUTOR_FROM_SYMBOL, 'base');
  if (!from) {
    const run: ExecutorRun = {
      ...base,
      decisions: [],
      wouldBeVolumeUsd: 0,
      note: 'WOULD_SKIP — USDC is not swappable on Base in the catalogue, so the pilot leg cannot be priced. This is a catalogue gap, not a market signal.',
    };
    saveRuns([run, ...loadExecutorRuns()]);
    return run;
  }
  const raw = rawFromHuman(String(EXECUTOR_PILOT_SIZE_USD), from.decimals);
  const quoteObs = raw ? await fetchSwapQuote(from, to, raw, undefined, 'base') : null;
  if (!quoteObs?.value) {
    const run: ExecutorRun = {
      ...base,
      decisions: [
        {
          candidateId: candidate.id,
          asset: candidate.asset,
          fromSymbol: EXECUTOR_FROM_SYMBOL,
          toSymbol: candidate.asset,
          amountUsd: EXECUTOR_PILOT_SIZE_USD,
          network: 'base',
          quoteSource: null,
          quoteStatus: quoteObs?.status ?? 'NO_DATA',
          toAmount: null,
          gasCostUsd: null,
          honeypot: null,
          honeypotRisk: null,
          pairIntel: null,
          decision: 'WOULD_SKIP',
          ruleFired: 'NO_QUOTE',
          reason: `The aggregator chain answered NO_DATA (${quoteObs?.status ?? 'NO_DATA'}) for $${EXECUTOR_PILOT_SIZE_USD} USDC → ${candidate.asset} on Base. No quote, no trade — not even a would-be one.`,
          at,
        },
      ],
      wouldBeVolumeUsd: 0,
      note: 'LOSS_STOP NOT_MEASURABLE — no hot wallet exists yet. Slippage NOT_MEASURED.',
    };
    saveRuns([run, ...loadExecutorRuns()]);
    return run;
  }
  const safetyObs = await fetchHoneypotCheck(to.address, 8453);
  if (safetyObs.value?.isHoneypot === true) {
    const run: ExecutorRun = {
      ...base,
      decisions: [
        {
          candidateId: candidate.id,
          asset: candidate.asset,
          fromSymbol: EXECUTOR_FROM_SYMBOL,
          toSymbol: candidate.asset,
          amountUsd: EXECUTOR_PILOT_SIZE_USD,
          network: 'base',
          quoteSource: quoteObs.source,
          quoteStatus: quoteObs.status,
          toAmount: quoteObs.value.toAmount,
          gasCostUsd: quoteObs.value.gasCostUsd,
          honeypot: true,
          honeypotRisk: safetyObs.value?.risk ?? null,
          pairIntel: null,
          decision: 'WOULD_SKIP',
          ruleFired: 'HONEYPOT',
          reason: `Honeypot.is flags ${candidate.asset} as a HONEYPOT (risk ${safetyObs.value?.risk ?? 'unknown'}). The quote was live and the trade would have been refused.`,
          at,
        },
      ],
      wouldBeVolumeUsd: 0,
      note: 'LOSS_STOP NOT_MEASURABLE — no hot wallet exists yet. Slippage NOT_MEASURED.',
    };
    saveRuns([run, ...loadExecutorRuns()]);
    return run;
  }
  /* Pair intel (v220, intelligence only): top DexScreener pair
   * for the token the trade would buy, plus a GeckoTerminal
   * price cross-check. Either source may answer NO_DATA —
   * that reads null and never changes the decision. */
  const pairObs = await fetchDexPairIntel(to.address);
  const gtObs = await fetchGeckoTerminalPrice(to.address);
  const pairIntel: string | null = pairObs.value
    ? `Top DEX pair: ${pairObs.value.dexId} on ${pairObs.value.chainId} — $${pairObs.value.priceUsd ?? '—'} — liq $${pairObs.value.liquidityUsd?.toLocaleString() ?? '—'} — 24h vol $${pairObs.value.volume24h?.toLocaleString() ?? '—'} (${pairObs.value.pairCount} pairs, DexScreener)${gtObs.value ? `; GeckoTerminal cross-check $${gtObs.value.priceUsd}` : '; GeckoTerminal: NO_DATA'}.`
    : null;
  const run: ExecutorRun = {
    ...base,
    decisions: [
      {
        candidateId: candidate.id,
        asset: candidate.asset,
        fromSymbol: EXECUTOR_FROM_SYMBOL,
        toSymbol: candidate.asset,
        amountUsd: EXECUTOR_PILOT_SIZE_USD,
        network: 'base',
        quoteSource: quoteObs.source,
        quoteStatus: quoteObs.status,
        toAmount: quoteObs.value.toAmount,
        gasCostUsd: quoteObs.value.gasCostUsd,
        honeypot: safetyObs.value ? safetyObs.value.isHoneypot : null,
        honeypotRisk: safetyObs.value?.risk ?? null,
        pairIntel,
        decision: 'WOULD_TRADE',
        ruleFired: 'ALL_GATES_PASSED',
        reason: `Live ${quoteObs.source} quote ($${EXECUTOR_PILOT_SIZE_USD} USDC → ${quoteObs.value.toAmount} ${candidate.asset}, ${quoteObs.status}) and a clean Honeypot.is check. In DRY_RUN this is a log entry only — nothing was signed, sent, or bought.${pairIntel ? ` Pair intel: ${pairIntel}` : ' Pair intel: NO_DATA — DexScreener/GeckoTerminal did not answer.'}`,
        at,
      },
    ],
    wouldBeVolumeUsd: EXECUTOR_PILOT_SIZE_USD,
    note: 'LOSS_STOP NOT_MEASURABLE — no hot wallet exists yet, so there is no funding mark; the 20% stop arms when Daniel funds the wallet. Slippage NOT_MEASURED — the keyless quote carries no slippage figure; the bound is enforced at signing from the venue quote. Candidate basis: radar evidence ' + candidate.evidenceCount + ' signal(s), board ' + candidate.boardState + '.',
  };
  saveRuns([run, ...loadExecutorRuns()]);
  return run;
}
