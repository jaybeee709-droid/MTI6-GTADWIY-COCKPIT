/* MTI6-GTADWIY-COCKPIT — Crypto Lifecycle Intelligence (v253)
 *
 * Answers ONE question, per activity and per workspace:
 *   "Where am I in the lifecycle of this activity?"
 *
 * IMPORTANT — what this file is NOT:
 *   - It is NOT trading automation and NOT a workflow engine.
 *     There is no runner, no scheduler, no queue, no side effect.
 *   - It creates NO new records, writes NOTHING, fetches NOTHING,
 *     and holds NO position state.
 *   - It does NOT invent data. Every stage below is a LABEL with a
 *     recorded definition. A stage is never marked "current" for a
 *     user unless a record on this device says so, and no record
 *     system exists yet for lifecycle position — so the honest
 *     default is NOT_RECORDED, rendered as such.
 *
 * The stage list is the owner's directive of 2026-11-28. EXECUTE is
 * carried as a stage so the lifecycle is complete and readable, but
 * it is permanently DISABLED: EXECUTE appears in no workspace's
 * ladderTop, and this file marks it `disabled: true` so no surface
 * can render it as available. That mirrors
 * CryptoMarketScreen.tsx's struck-through rung.
 *
 * Bindings are drawn ONLY from data that already exists in the repo:
 *   CANONICAL_60        — the 60 Major Activities (encyclopedia-data)
 *   CRYPTO_WORKSPACES   — the 56-workspace registry (crypto-workspaces-data)
 *   ENCYCLOPEDIA_FAMILIES — the 28 families (encyclopedia-data)
 *   COST_KINDS          — 12 cost kinds (cost-risk-data)
 *   RISK_DIMENSIONS     — 19 risk dimensions (cost-risk-data)
 * Nothing here re-declares any of those. Ids are referenced, never
 * copied, so the lifecycle can never drift from the backbone.
 */

import { CANONICAL_60, ENCYCLOPEDIA_FAMILIES } from './encyclopedia-data';
import { CRYPTO_WORKSPACES, CRYPTO_WORKSPACE_GROUPS } from './crypto-workspaces-data';
import { COST_KINDS, RISK_DIMENSIONS } from './cost-risk-data';

/* ---- the nine stages, in the owner's order ------------------------- */

export type LifecycleStageId =
  | 'DISCOVER'
  | 'RESEARCH'
  | 'ANALYZE'
  | 'ALLOCATE'
  | 'EXECUTE'
  | 'MONITOR'
  | 'REBALANCE'
  | 'EXIT'
  | 'ARCHIVE_LEARN';

export interface LifecycleStage {
  id: LifecycleStageId;
  /** Display label. EXECUTE's label carries its permanent state. */
  label: string;
  /** One-line meaning, descriptive only — never an instruction. */
  meaning: string;
  /** What the stage produces on this platform, or NONE. */
  produces: string;
  /** True only for EXECUTE. No surface may render a disabled stage as reachable. */
  disabled: boolean;
  /** Recorded reason a stage is disabled. Empty when enabled. */
  disabledReason: string;
}

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: 'DISCOVER',
    label: 'DISCOVER',
    meaning:
      'An activity, asset, protocol or opportunity is noticed and recorded as noticed. Noticing is not knowing.',
    produces: 'A discovery record (UNVERIFIED) or nothing at all',
    disabled: false,
    disabledReason: '',
  },
  {
    id: 'RESEARCH',
    label: 'RESEARCH',
    meaning:
      'The discovered thing is read against its recorded sources: what it is, who records it, what the records do and do not say.',
    produces: 'Recorded references and open questions',
    disabled: false,
    disabledReason: '',
  },
  {
    id: 'ANALYZE',
    label: 'ANALYZE',
    meaning:
      'Cost kinds and risk dimensions are assessed against evidence. A cost is known only with a sourced value; a risk dimension is present only with evidence.',
    produces: 'Cost lines and risk dimensions, each KNOWN / UNKNOWN or PRESENT / ABSENT / UNKNOWN',
    disabled: false,
    disabledReason: '',
  },
  {
    id: 'ALLOCATE',
    label: 'ALLOCATE',
    meaning:
      'Capital is designated to the activity — the intent step, before any asset moves.',
    produces: 'A recorded allocation intent',
    disabled: false,
    disabledReason: '',
  },
  {
    id: 'EXECUTE',
    label: 'EXECUTE — DISABLED',
    meaning:
      'The point at which assets would move. On this platform that point is closed everywhere, by construction.',
    produces: 'NONE — execution is disabled on every workspace',
    disabled: true,
    disabledReason:
      'EXECUTION DISABLED: EXECUTE appears in no workspace ladderTop. Signing is the owner\u2019s own hand in his own wallet, outside this platform.',
  },
  {
    id: 'MONITOR',
    label: 'MONITOR',
    meaning:
      'The recorded state is watched over time: observations accumulate with provenance, and staleness is surfaced rather than hidden.',
    produces: 'Provenance observations (LIVE / CACHED / STALE / NO_DATA)',
    disabled: false,
    disabledReason: '',
  },
  {
    id: 'REBALANCE',
    label: 'REBALANCE',
    meaning:
      'A change to the designated position is considered. Considering is not doing.',
    produces: 'A recorded rebalance intent',
    disabled: false,
    disabledReason: '',
  },
  {
    id: 'EXIT',
    label: 'EXIT',
    meaning:
      'The activity is wound down: what was held is returned or the position is closed.',
    produces: 'A recorded exit record',
    disabled: false,
    disabledReason: '',
  },
  {
    id: 'ARCHIVE_LEARN',
    label: 'ARCHIVE / LEARN',
    meaning:
      'The closed activity is kept as institutional memory — what was believed, what was recorded, what actually happened.',
    produces: 'An archive record and, when a run failed, a lesson',
    disabled: false,
    disabledReason: '',
  },
];

export const LIFECYCLE_STAGE_IDS: LifecycleStageId[] = LIFECYCLE_STAGES.map((s) => s.id);

export function stageById(id: LifecycleStageId): LifecycleStage | null {
  for (const s of LIFECYCLE_STAGES) if (s.id === id) return s;
  return null;
}

/* ---- per-stage furniture: the real cost kinds and risk dimensions --- */

export interface StageAssessment {
  stage: LifecycleStageId;
  costKinds: string[];
  riskDimensions: string[];
}

export const STAGE_ASSESSMENTS: StageAssessment[] = [
  { stage: 'DISCOVER', costKinds: [], riskDimensions: [] },
  { stage: 'RESEARCH', costKinds: [], riskDimensions: ['Protocol risk', 'Token risk', 'Data-source risk'] },
  {
    stage: 'ANALYZE',
    costKinds: [
      'NETWORK_GAS_COST',
      'PROTOCOL_FEE',
      'TRADING_SWAP_FEE',
      'SLIPPAGE',
      'BORROW_COST',
      'BRIDGE_COST',
      'PERFORMANCE_FEE',
      'EXIT_COST',
    ],
    riskDimensions: [
      'Market risk',
      'Volatility risk',
      'Liquidity risk',
      'Smart-contract risk',
      'Oracle risk',
      'Bridge risk',
      'Chain/network risk',
      'Governance risk',
      'Stablecoin/depeg risk',
      'Counterparty/custody risk',
    ],
  },
  { stage: 'ALLOCATE', costKinds: [], riskDimensions: ['Liquidation risk', 'Approval/allowance risk'] },
  { stage: 'EXECUTE', costKinds: ['NETWORK_GAS_COST'], riskDimensions: ['Transaction/gas risk'] },
  { stage: 'MONITOR', costKinds: [], riskDimensions: ['Volatility risk', 'Liquidation risk', 'Chain/network risk'] },
  { stage: 'REBALANCE', costKinds: ['TRADING_SWAP_FEE', 'SLIPPAGE', 'NETWORK_GAS_COST'], riskDimensions: ['Market risk', 'Impermanent-loss risk'] },
  { stage: 'EXIT', costKinds: ['EXIT_COST', 'NETWORK_GAS_COST', 'SLIPPAGE'], riskDimensions: ['Liquidity risk', 'Market risk'] },
  { stage: 'ARCHIVE_LEARN', costKinds: [], riskDimensions: [] },
];

/** Guard: every code referenced above must exist in the canonical lists.
 *  Called by the panel at render time so a typo can never ship silently. */
export function auditStageAssessments(): { ok: boolean; unknownCosts: string[]; unknownRisks: string[] } {
  const costSet = new Set(COST_KINDS.map((k) => k.kind));
  const riskSet = new Set(RISK_DIMENSIONS);
  const unknownCosts: string[] = [];
  const unknownRisks: string[] = [];
  for (const a of STAGE_ASSESSMENTS) {
    for (const c of a.costKinds) if (!costSet.has(c)) unknownCosts.push(`${a.stage}:${c}`);
    for (const r of a.riskDimensions) if (!riskSet.has(r)) unknownRisks.push(`${a.stage}:${r}`);
  }
  return { ok: unknownCosts.length === 0 && unknownRisks.length === 0, unknownCosts, unknownRisks };
}

/* ---- workspace -> lifecycle view ---------------------------------- */

export interface WorkspaceLifecycle {
  workspaceId: string;
  title: string;
  group: string;
  groupLabel: string;
  status: string;
  ladderTop: string;
  gated: boolean;
  stage: LifecycleStageId;
  stageBasis: string;
  majorIds: string[];
  majorTitles: string[];
  familyTitles: string[];
}

/* The stage each workspace group corresponds to, from what the group
 * DOES as the registry describes it. The basis is stated per group
 * and printed on screen — never hidden. */
const GROUP_STAGE: Record<string, { stage: LifecycleStageId; basis: string }> = {
  core: {
    stage: 'ANALYZE',
    basis:
      'The Core group is the observing and organising surface: registry state, entity records, positions and health. Its work is reading what is recorded.',
  },
  trading: {
    stage: 'ANALYZE',
    basis:
      'The Trading group compares venues, routes and prices. Comparison is analysis; the registry records no execution capability in this group.',
  },
  routing: {
    stage: 'ANALYZE',
    basis:
      'The Routing group evaluates cross-chain paths and bridge mechanism. Evaluation is analysis.',
  },
  yield: {
    stage: 'ALLOCATE',
    basis:
      'The Yield / Capital group concerns where capital is designated to sit — staking, lending, vaults. Designating is allocation.',
  },
  derivatives: {
    stage: 'ANALYZE',
    basis:
      'The Derivatives group models instruments, funding and leverage exposure. Modelling is analysis; the registry records no execution capability in this group.',
  },
  infrastructure: {
    stage: 'MONITOR',
    basis:
      'The Infrastructure group concerns nodes, validators and networks that are watched over time. Watching recorded state over time is monitoring.',
  },
  specialized: {
    stage: 'RESEARCH',
    basis:
      'The Specialized Economies group is largely unbuilt and largely un-fed; what exists is reading records about sectors. Reading records is research.',
  },
};

/* Registry workspace id -> canonical workspace home.
 *
 * VALIDATED 2026-11-28 against src/encyclopedia-data.ts CANONICAL_60
 * (all 60 majors, owner-supplied). There are exactly 20 canonical
 * workspace homes. Every value below is one of those 20 - verified,
 * none inferred.
 *
 * A registry workspace ABSENT from this table maps to ZERO canonical
 * Major Activities and renders NO CANONICAL MAJOR ACTIVITY MAPPED.
 * That is truthful, not a defect: those are intelligence or operational
 * surfaces OVER activities, not activities themselves.
 */
const WORKSPACE_TO_CANONICAL_WORKSPACE: Record<string, string> = {
  arbitrage: 'ARBITRAGE_CENTER',
  borrowing: 'LENDING_STRUCTURED_CREDIT',
  bridge: 'CROSS_CHAIN_CENTER',
  btcfi: 'BTCFI_CENTER',
  'cross-chain-routing': 'CROSS_CHAIN_CENTER',
  depin: 'DEPIN_COMPUTE_CENTER',
  'dex-aggregation': 'SWAP_LAB',
  futures: 'DERIVATIVES_SYNTHETICS_CENTER',
  gauges: 'GOVERNANCE_DAO_CENTER',
  governance: 'GOVERNANCE_DAO_CENTER',
  home: 'WALLET_ASSET_CENTER',
  insurance: 'INSURANCE_RISK_MARKETS',
  lending: 'LENDING_STRUCTURED_CREDIT',
  'liquid-staking': 'STAKING_RESTAKING_CENTER',
  liquidity: 'LIQUIDITY_LAB',
  'margin-leverage': 'DERIVATIVES_SYNTHETICS_CENTER',
  'markets-assets': 'TRADING_TERMINAL',
  mining: 'NETWORK_NODE_VALIDATOR_CENTER',
  nftfi: 'NFTFI_CENTER',
  nodes: 'NETWORK_NODE_VALIDATOR_CENTER',
  options: 'DERIVATIVES_SYNTHETICS_CENTER',
  oracle: 'PREDICTION_ORACLE_CENTER',
  payments: 'PAYMENTS_SETTLEMENT_CENTER',
  perpetuals: 'DERIVATIVES_SYNTHETICS_CENTER',
  portfolio: 'WALLET_ASSET_CENTER',
  positions: 'WALLET_ASSET_CENTER',
  prediction: 'PREDICTION_ORACLE_CENTER',
  restaking: 'STAKING_RESTAKING_CENTER',
  'rpc-infrastructure': 'NETWORK_NODE_VALIDATOR_CENTER',
  rwa: 'RWA_TOKENIZED_ASSETS',
  staking: 'STAKING_RESTAKING_CENTER',
  'structured-credit': 'RWA_TOKENIZED_ASSETS',
  swap: 'SWAP_LAB',
  'synthetics-cdp': 'DERIVATIVES_SYNTHETICS_CENTER',
  trading: 'TRADING_TERMINAL',
  validators: 'NETWORK_NODE_VALIDATOR_CENTER',
  vaults: 'VAULT_AUTOMATION_LAB',
  'yield-aggregation': 'VAULT_AUTOMATION_LAB',
  'yield-farming': 'FARMING_YIELD_LAB',
  'yield-trading': 'VAULT_AUTOMATION_LAB',
};

/** Pure. No DOM, no storage, no fetch. */
export function workspaceLifecycle(workspaceId: string): WorkspaceLifecycle | null {
  const row = CRYPTO_WORKSPACES.find((w) => w.id === workspaceId);
  if (!row) return null;

  const group = CRYPTO_WORKSPACE_GROUPS.find((g) => g.id === row.group);
  const mapping = GROUP_STAGE[row.group] ?? {
    stage: 'RESEARCH' as LifecycleStageId,
    basis: 'No group mapping is recorded for this group — shown as research, the safest reading, and named as a gap.',
  };

  const canonicalWorkspace = WORKSPACE_TO_CANONICAL_WORKSPACE[row.id] ?? null;
  const majors = canonicalWorkspace
    ? CANONICAL_60.filter((m) => m.workspace === canonicalWorkspace)
    : [];
  const majorIds = majors.map((m) => m.id);
  const familyIds = Array.from(new Set(majors.map((m) => m.family)));
  const familyTitles = familyIds.map(
    (fid) => ENCYCLOPEDIA_FAMILIES.find((f) => f.id === fid)?.title ?? fid,
  );

  const gatedNote = row.gated
    ? ' This is an owner-gated seat: no canonical Major Activity exists for it, and none is invented.'
    : '';

  return {
    workspaceId: row.id,
    title: row.title,
    group: row.group,
    groupLabel: group?.label ?? row.group,
    status: row.status,
    ladderTop: row.ladderTop,
    gated: row.gated,
    stage: mapping.stage,
    stageBasis: mapping.basis + gatedNote,
    majorIds,
    majorTitles: majors.map((m) => m.title),
    familyTitles,
  };
}

export function allWorkspaceLifecycles(): WorkspaceLifecycle[] {
  return CRYPTO_WORKSPACES.map((w) => workspaceLifecycle(w.id)).filter(
    (x): x is WorkspaceLifecycle => x !== null,
  );
}

/** Counts for the overview strip. Derived from the registry, never typed. */
export function lifecycleCounts(): {
  workspaces: number;
  byStage: Record<LifecycleStageId, number>;
  gated: number;
  mappedMajors: number;
  unmappedWorkspaces: string[];
} {
  const all = allWorkspaceLifecycles();
  const byStage = {} as Record<LifecycleStageId, number>;
  for (const id of LIFECYCLE_STAGE_IDS) byStage[id] = 0;
  let mappedMajors = 0;
  const unmappedWorkspaces: string[] = [];
  for (const w of all) {
    byStage[w.stage] += 1;
    mappedMajors += w.majorIds.length;
    if (w.majorIds.length === 0) unmappedWorkspaces.push(w.title);
  }
  return {
    workspaces: all.length,
    byStage,
    gated: all.filter((w) => w.gated).length,
    mappedMajors,
    unmappedWorkspaces,
  };
}

/** Per-Major-Activity lifecycle reading: which workspaces carry it. */
export function majorsLifecycle(): { majorId: string; title: string; familyTitle: string; workspaceTitles: string[] }[] {
  return CANONICAL_60.map((m) => {
    const ws = CRYPTO_WORKSPACES.filter(
      (w) => WORKSPACE_TO_CANONICAL_WORKSPACE[w.id] === m.workspace,
    );
    return {
      majorId: m.id,
      title: m.title,
      familyTitle: ENCYCLOPEDIA_FAMILIES.find((f) => f.id === m.family)?.title ?? m.family,
      workspaceTitles: ws.map((w) => w.title),
    };
  });
}

/** STAR answer text. Deterministic, from the records above. */
export function lifecycleSummaryText(): string {
  const c = lifecycleCounts();
  const stageLine = LIFECYCLE_STAGES.filter((s) => s.id !== 'EXECUTE')
    .map((s) => `${s.label} ${c.byStage[s.id]}`)
    .join(' · ');
  const unmapped =
    c.unmappedWorkspaces.length > 0
      ? ` ${c.unmappedWorkspaces.length} workspace(s) map to no canonical Major Activity and say so rather than borrowing one: ${c.unmappedWorkspaces.slice(0, 6).join(', ')}${c.unmappedWorkspaces.length > 6 ? '…' : ''}.`
      : '';
  return (
    `From the platform's own records: the lifecycle has ${LIFECYCLE_STAGES.length} stages over ${c.workspaces} workspaces — ${stageLine}. ` +
    `${c.mappedMajors} Major-Activity links resolve to canonical records across those workspaces, and ${c.gated} are owner-gated seats.` +
    unmapped +
    ` EXECUTE is a stage of the lifecycle but is disabled everywhere: it appears in no workspace's ladder top, and signing is your own hand in your own wallet. ` +
    `The lifecycle records where an activity sits; it runs nothing, executes nothing, and moves no funds.`
  );
}
