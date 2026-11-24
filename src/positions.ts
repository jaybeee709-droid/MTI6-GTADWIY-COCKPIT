/* Owner position records — the React surface of the canonical
 * Position Intelligence contract (js/position-intelligence.js).
 *
 * A position is a RELATIONSHIP, not a duplicate of an asset: it
 * ties wallet / account / network / asset(s) / protocol / activity
 * references together. References are recorded, never verified by
 * this module — every record stays UNVERIFIED, exactly as the
 * canonical module leaves them until a caller verifies with
 * provenance.
 *
 * Money rules (mirrored from the canonical module):
 *  - A money field is either ABSENT (UNKNOWN — null, never 0) or a
 *    sourced record { value, currency, source, checkedAt } with a
 *    finite value >= 0, a currency, and a source.
 *  - P/L is NEVER entered and NEVER stored from a form: it is
 *    computed at display time only when costBasis and
 *    currentValue are both sourced in the SAME currency, and is
 *    UNKNOWN otherwise.
 *  - isTokenBalance is derived from the type (true only for a
 *    plain "holding"); an LP position is a position, never a
 *    normal token balance.
 *  - Risk is dimensions + a note; a numeric score is rejected.
 *
 * The canonical module keeps its records in memory only. This
 * surface persists the owner's own records locally under
 * mti6_positions_v1 so the Positions & Assets screen keeps them
 * between visits; the record shape and validation mirror the
 * canonical contract. Recording a position authorizes nothing
 * and moves nothing. */

export const POSITION_TYPES = [
  'staking', 'restaking', 'lending-deposit', 'loan', 'lp',
  'concentrated-liquidity', 'vault', 'yield-token', 'derivative',
  'rwa', 'nft-financial', 'holding', 'other',
] as const;

export const POSITION_STATUSES = ['OPEN', 'CLOSED', 'STALE', 'UNKNOWN'] as const;

export interface MoneyRecord {
  value: number;
  currency: string;
  source: string;
  checkedAt: string;
}

export interface PositionRecord {
  positionId: string;
  walletId: string;
  accountId: string;
  networkId: string;
  assetIds: string[];
  protocolId: string;
  activityId: string;
  strategyId: string | null;
  type: string;
  status: string;
  size: MoneyRecord | null;
  costBasis: MoneyRecord | null;
  currentValue: MoneyRecord | null;
  fees: MoneyRecord | null;
  risk: { dimensions: string[]; note: string } | null;
  isTokenBalance: boolean;
  verificationStatus: 'UNVERIFIED';
  opportunityIds: string[];
  createdAt: string;
}

const STORAGE_KEY = 'mti6_positions_v1';
const MAX_POSITIONS = 100;

export function tokenBalanceFor(type: string): boolean {
  return type === 'holding';
}

function isMoney(v: unknown): v is MoneyRecord {
  if (!v || typeof v !== 'object') return false;
  const m = v as MoneyRecord;
  return (
    typeof m.value === 'number' && Number.isFinite(m.value) && m.value >= 0 &&
    typeof m.currency === 'string' && m.currency.length > 0 &&
    typeof m.source === 'string' && m.source.length > 0 &&
    typeof m.checkedAt === 'string' && m.checkedAt.length > 0
  );
}

/** Mirrors the canonical validatePosition for the fields this
 *  surface writes. Returns error strings; empty means valid. */
export function validatePosition(r: Partial<PositionRecord>): string[] {
  const errors: string[] = [];
  const req = (v: unknown, name: string) => {
    if (typeof v !== 'string' || v.trim().length === 0)
      errors.push(`${name} is required (a reference, recorded UNVERIFIED).`);
  };
  req(r.walletId, 'walletId');
  req(r.accountId, 'accountId');
  req(r.networkId, 'networkId');
  req(r.protocolId, 'protocolId');
  req(r.activityId, 'activityId');
  if (!Array.isArray(r.assetIds) || r.assetIds.length === 0)
    errors.push('At least one asset reference is required.');
  if (typeof r.type !== 'string' || !(POSITION_TYPES as readonly string[]).includes(r.type))
    errors.push(`type must be one of: ${POSITION_TYPES.join(', ')}.`);
  if (typeof r.status !== 'string' || !(POSITION_STATUSES as readonly string[]).includes(r.status))
    errors.push(`status must be one of: ${POSITION_STATUSES.join(', ')}.`);
  (['size', 'costBasis', 'currentValue', 'fees'] as const).forEach((f) => {
    const v = r[f];
    if (v !== null && v !== undefined && !isMoney(v))
      errors.push(`${f}, when given, must be a sourced record: a value >= 0, a currency, and a source.`);
  });
  if (r.risk != null) {
    const risk = r.risk as { dimensions?: unknown; note?: unknown; score?: unknown };
    if (risk.score !== undefined) errors.push('Risk must not carry a score: risk stays dimensions, never scores.');
    if (!Array.isArray(risk.dimensions) || risk.dimensions.some((d) => typeof d !== 'string' || d.length === 0))
      errors.push('risk.dimensions must be an array of dimension names.');
    if (risk.note !== undefined && typeof risk.note !== 'string') errors.push('risk.note must be a string.');
  }
  return errors;
}

/** P/L honesty, mirrored: computed only from sourced costBasis +
 *  currentValue in one currency; otherwise UNKNOWN (null). */
export function computedPnl(r: PositionRecord): MoneyRecord | null {
  if (r.costBasis && r.currentValue && r.costBasis.currency === r.currentValue.currency) {
    return {
      value: r.currentValue.value - r.costBasis.value,
      currency: r.currentValue.currency,
      source: 'computed-from-sourced-inputs',
      checkedAt: r.currentValue.checkedAt,
    };
  }
  return null;
}

export function loadPositions(): PositionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is PositionRecord =>
        !!p && typeof p === 'object' &&
        typeof (p as PositionRecord).positionId === 'string' &&
        validatePosition(p as PositionRecord).length === 0,
    );
  } catch {
    return [];
  }
}

export function savePositions(list: PositionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_POSITIONS)));
  } catch {
    /* storage unavailable — records simply do not persist */
  }
}

export function makePositionId(seed: string): string {
  const slug =
    seed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'position';
  return `pos-${slug}-${Date.now().toString(36)}`;
}
