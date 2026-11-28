/* MTI6 — ruled quota configuration, React mirror (P3, U3(a–d)).
 *
 * STATUS: APPLIED in v254 (P3, 2026-11-25) — in the repo as
 * `src/quota-config.ts`. (Drafted by Stream B while the build was
 * stopped by an execution-risk notice; applied after Daniel's 14:57
 * EST "Yes go ahead". CORRECTED PLAN: P3=v254.) Vanilla source of
 * truth: js/quota-config.js — keep the numbers identical; a mismatch
 * between the two files is a bug.
 *
 * Provider dashboards stay authoritative — every count in MTI6 is
 * this device's count only (localStorage ledger), never the
 * provider's official count. Never auto-upgrade: hard-coded rule.
 */

export interface RuledQuota {
  provider: string;
  plan: string;
  /** Monthly budget in the provider's unit (credits / calls / CU). Null = no monthly budget ruled. */
  monthlyBudget: number | null;
  reserve: number;
  providerAllowance: number | null;
  perMinute?: number;
  perSecond?: number;
  warnAt: number;
  criticalAt: number;
  blockAt: number;
  neverAutoUpgrade: true;
}

export const COINGECKO_QUOTA: RuledQuota & {
  perMinuteNote: string;
} = {
  provider: 'CoinGecko',
  plan: 'Demo',
  // 1 request = 1 credit. Demo allowance 10,000/month; ruled MTI6
  // internal budget 8,000 with a 2,000 reserve the router NEVER spends.
  monthlyBudget: 8000,
  reserve: 2000,
  providerAllowance: 10000,
  perMinute: 50,
  perMinuteNote: 'Ruled 50/min governor cap (Demo publishes 100/min; the governor runs at half that).',
  warnAt: 0.75,
  criticalAt: 0.9,
  blockAt: 1.0,
  neverAutoUpgrade: true,
};

export const DEFILLAMA_QUOTA: RuledQuota & { perMinuteNote: string } = {
  provider: 'DefiLlama',
  plan: 'Free API',
  monthlyBudget: null, // No monthly budget (U3(b)).
  reserve: 0,
  providerAllowance: null,
  perMinute: 50,
  perMinuteNote:
    'Free API: no figure in the official docs; secondary sources report approx. 300 requests / 5 min per IP. Governor runs at 50/min.',
  warnAt: 0.75,
  criticalAt: 0.9,
  blockAt: 1.0,
  neverAutoUpgrade: true,
};

export const ALCHEMY_QUOTA = {
  provider: 'Alchemy',
  plan: 'Free tier',
  monthlyBudgetCU: 20000000,
  reserveCU: 0,
  perSecond: 10,
  // CU accounting from the proxy envelope cost fields; the fallback
  // when no envelope cost is present is call-count-conservative —
  // never invented CU.
  cuAccounting: 'envelope' as const,
  cuFallback: 'call-count-conservative' as const,
  warnAt: 0.75,
  criticalAt: 0.9,
  blockAt: 1.0,
  neverAutoUpgrade: true as const,
};

export const ETHERSCAN_QUOTA = {
  provider: 'Etherscan',
  plan: 'Free tier',
  dailyBudget: 80000,
  reserve: 20000,
  providerAllowancePerDay: 100000,
  perSecond: 2,
  warnAt: 0.75,
  criticalAt: 0.9,
  blockAt: 1.0,
  neverAutoUpgrade: true as const,
};

/** Cloudflare's own quotas — flagged UNVERIFIED-against-docs until re-checked at provisioning time. */
export const CLOUDFLARE_QUOTA = {
  provider: 'Cloudflare',
  plan: 'Workers Free',
  workersRequestsPerDay: 100000,
  workersCpuMsPerInvocation: 10,
  durableObjectsRequestsPerDay: 100000,
  durableObjectsGBSecondsPerDay: 13000,
  durableObjectsStorageGB: 5,
  verificationStatus: 'UNVERIFIED' as const,
  verificationNote: 'Per FINAL-DECISIONS Part 4; re-check against the Cloudflare dashboard at provisioning time.',
};

/** GitHub compute — UNKNOWN until measured; no number asserted. */
export const GITHUB_COMPUTE_QUOTA = {
  provider: 'GitHub',
  plan: 'Actions / AI Credits',
  actionsMinutes: null as number | null,
  aiCredits: null as number | null,
  verificationStatus: 'UNKNOWN_REQUIRES_VERIFICATION' as const,
  verificationNote: 'No measurement recorded; do not assert a number until one exists.',
};

export const NEVER_AUTO_UPGRADE = true;

/** P2 follow-on (deferred, not done): cost attribution to the canonical Work Ledger. */
export const COST_ATTRIBUTION = {
  store: 'localStorage (this device only)',
  canonicalLedger: 'P2 follow-on — NOT DONE in P3',
  dashboardAuthoritative: true,
} as const;

export type QuotaLevel = 'ok' | 'warning' | 'critical' | 'exhausted';

export function levelFor(
  fraction: number,
  thresholds: { warnAt?: number; criticalAt?: number; blockAt?: number } = {},
): QuotaLevel {
  const warn = thresholds.warnAt ?? 0.75;
  const critical = thresholds.criticalAt ?? 0.9;
  const block = thresholds.blockAt ?? 1.0;
  if (fraction >= block) return 'exhausted';
  if (fraction >= critical) return 'critical';
  if (fraction >= warn) return 'warning';
  return 'ok';
}

export function quotaStateFor(
  fraction: number,
  thresholds: { warnAt?: number; criticalAt?: number; blockAt?: number } = {},
): 'OK' | 'QUOTA_WARNING' | 'QUOTA_EXHAUSTED' {
  const level = levelFor(fraction, thresholds);
  return level === 'exhausted' ? 'QUOTA_EXHAUSTED' : level !== 'ok' ? 'QUOTA_WARNING' : 'OK';
}
