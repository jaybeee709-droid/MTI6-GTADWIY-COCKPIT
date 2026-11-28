/* MTI6 — ruled quota configuration (P3, U3(a–d)).
 *
 * STATUS: APPLIED in v254 (P3, 2026-11-25) — in the repo as
 * `js/quota-config.js`. (Drafted by Stream B while the build was
 * stopped by an execution-risk notice; applied after Daniel's 14:57
 * EST "Yes go ahead". CORRECTED PLAN: P3=v254.) Mirror:
 * src/quota-config.ts.
 *
 * Single source for the RULED budgets only. Provider dashboards stay
 * authoritative — every count in MTI6 is this device's count only
 * (ApiRegistry / localStorage), never the provider's official count.
 * Never auto-upgrade: that is a hard-coded rule, not a flag.
 *
 * Cost attribution in P3 stays in ApiRegistry / localStorage ("this
 * device only"). Attribution to the canonical Work Ledger is a
 * deferred P2 follow-on (P2 is not authorized in this stream); the
 * ledger TODO is recorded here, not done.
 */
(function (global) {
  "use strict";

  // Ruled budgets (U3). warn/critical/block are fractions of the budget.
  var QUOTAS = {
    coingecko: {
      provider: "CoinGecko",
      plan: "Demo",
      // 1 request = 1 credit. Demo allowance is 10,000 credits/month;
      // the ruled MTI6 internal budget is 8,000 with a 2,000 reserve
      // the router NEVER spends (testing / recovery / manual use).
      monthlyBudget: 8000,
      reserve: 2000,
      providerAllowance: 10000,
      perMinute: 50,
      perMinuteNote: "Ruled 50/min governor cap (Demo publishes 100/min; the governor runs at half that).",
      warnAt: 0.75,
      criticalAt: 0.90,
      blockAt: 1.0,
      neverAutoUpgrade: true
    },
    defillama: {
      provider: "DefiLlama",
      plan: "Free API",
      // No monthly budget (U3(b)): the free API carries no monthly
      // quota in the ruling. Per-minute governor cap only.
      monthlyBudget: null,
      reserve: 0,
      providerAllowance: null,
      perMinute: 50,
      perMinuteNote: "Free API: no figure in the official docs; secondary sources report approx. 300 requests / 5 min per IP. Governor runs at 50/min.",
      warnAt: 0.75,
      criticalAt: 0.90,
      blockAt: 1.0,
      neverAutoUpgrade: true
    },
    alchemy: {
      provider: "Alchemy",
      plan: "Free tier",
      // Compute Units, not calls. CU accounting comes from the proxy
      // envelope cost fields; call-count-conservative is the fallback
      // when no envelope cost is present (never invented CU).
      monthlyBudgetCU: 20000000,
      reserveCU: 0,
      perSecond: 10,
      cuAccounting: "envelope",
      cuFallback: "call-count-conservative",
      warnAt: 0.75,
      criticalAt: 0.90,
      blockAt: 1.0,
      neverAutoUpgrade: true
    },
    etherscan: {
      provider: "Etherscan",
      plan: "Free tier",
      dailyBudget: 80000,
      reserve: 20000,
      providerAllowancePerDay: 100000,
      perSecond: 2,
      warnAt: 0.75,
      criticalAt: 0.90,
      blockAt: 1.0,
      neverAutoUpgrade: true
    }
  };

  // Cloudflare's OWN quotas, tracked as a resource (P3 §5). Values
  // per FINAL-DECISIONS Part 4 — flagged UNVERIFIED-against-docs
  // until re-checked against the Cloudflare dashboard at
  // provisioning time. Never assert them as measured until then.
  var CLOUDFLARE = {
    provider: "Cloudflare",
    plan: "Workers Free",
    workersRequestsPerDay: 100000,
    workersCpuMsPerInvocation: 10,
    durableObjectsRequestsPerDay: 100000,
    durableObjectsGBSecondsPerDay: 13000,
    durableObjectsStorageGB: 5,
    verificationStatus: "UNVERIFIED",
    verificationNote: "Per FINAL-DECISIONS Part 4; re-check against the Cloudflare dashboard at provisioning time."
  };

  // GitHub compute, tracked like LLM capacity (P3 §5). Values are
  // UNKNOWN until measured — no number is asserted here.
  var GITHUB_COMPUTE = {
    provider: "GitHub",
    plan: "Actions / AI Credits",
    actionsMinutes: null,
    aiCredits: null,
    verificationStatus: "UNKNOWN_REQUIRES_VERIFICATION",
    verificationNote: "No measurement recorded; do not assert a number until one exists."
  };

  // P2 follow-on (deferred, not done): attribute cost to the
  // canonical Work Ledger (server-side, W4) instead of only the
  // this-device ApiRegistry / localStorage ledger. Until P2 lands,
  // every count here is this-device-only.
  var COST_ATTRIBUTION = {
    store: "ApiRegistry/localStorage (this device only)",
    canonicalLedger: "P2 follow-on — NOT DONE in P3",
    dashboardAuthoritative: true
  };

  // Pure helpers (no I/O, no network): level for a used fraction.
  function levelFor(fraction, thresholds) {
    var warn = thresholds && thresholds.warnAt !== undefined ? thresholds.warnAt : 0.75;
    var critical = thresholds && thresholds.criticalAt !== undefined ? thresholds.criticalAt : 0.90;
    var block = thresholds && thresholds.blockAt !== undefined ? thresholds.blockAt : 1.0;
    if (fraction >= block) return "exhausted";
    if (fraction >= critical) return "critical";
    if (fraction >= warn) return "warning";
    return "ok";
  }

  function quotaStateFor(fraction, thresholds) {
    var level = levelFor(fraction, thresholds);
    return level === "exhausted" ? "QUOTA_EXHAUSTED" : level !== "ok" ? "QUOTA_WARNING" : "OK";
  }

  var config = {
    QUOTAS: QUOTAS,
    CLOUDFLARE: CLOUDFLARE,
    GITHUB_COMPUTE: GITHUB_COMPUTE,
    COST_ATTRIBUTION: COST_ATTRIBUTION,
    NEVER_AUTO_UPGRADE: true,
    levelFor: levelFor,
    quotaStateFor: quotaStateFor
  };

  global.MTI6QuotaConfig = config;
  if (typeof module !== "undefined" && module.exports) module.exports = config;
})(typeof window !== "undefined" ? window : globalThis);
