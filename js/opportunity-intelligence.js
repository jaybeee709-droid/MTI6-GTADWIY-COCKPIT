/* MTI6-GTADWIY-COCKPIT — Opportunity Intelligence foundation
 * (continuous development campaign: Opportunity Intelligence unit)
 *
 * Connects asset -> network -> protocol -> Major Activity -> Type ->
 * Strategy -> costs -> risks -> qualification/access -> verification
 * -> freshness -> worker assignment. This layer MODELS opportunities;
 * it never calls a network endpoint, never fetches, never holds a
 * secret, never executes anything, and never fabricates a return.
 *
 * Rules, fail-closed throughout:
 *   - The opportunity list starts EMPTY. No opportunity is seeded,
 *     invented, or implied. Every opportunity arrives through
 *     addOpportunity() and must pass validateOpportunity().
 *   - Costs are UNKNOWN by default. A cost entry is either
 *     { kind, state: "UNKNOWN" } or a sourced value
 *     { kind, value, currency, source, checkedAt }. An unsourced
 *     value is rejected, never silently kept.
 *   - No APY / profit / return fields, ever. validateOpportunity()
 *     REJECTS any return-like field (apy, profit, return, roi,
 *     yield, earnings, ...) anywhere on an opportunity record.
 *     A return that is not sourced does not exist; a return that IS
 *     sourced is still not recorded here — this module records costs
 *     and risks, never promised returns.
 *   - Risks are dimensions, never scores. A risk dimension should
 *     come from the CryptoWorld risk vocabulary where applicable; a
 *     free-form dimension is allowed only with a note explaining it.
 *     Score-like fields (score, riskScore, rating, weight) are
 *     rejected on every risk entry.
 *   - A protocol name without a source is rejected: a protocol is
 *     never invented. protocolRef { name, source } — no source, no
 *     protocol name.
 *   - Verification / freshness come from the Truth vocabulary
 *     (js/truth.js, loaded before this file). Nothing is VERIFIED
 *     without a source AND a timestamp; a VERIFIED claim without
 *     both is downgraded to UNVERIFIED on normalisation and rejected
 *     by the validator. Freshness is derived from age, never
 *     asserted: fresh (<= 7 days), aging (<= 30 days), stale
 *     (> 30 days), unknown (no timestamp).
 *   - resolveOpportunity() never passes a check it could not
 *     perform. When a peer module is absent, that check is recorded
 *     as NOT_CONNECTED, not passed. A shape-only asset check (no
 *     AssetIntelligence loaded) is reported as SHAPE_ONLY, not as
 *     a confirmed class.
 *   - Worker assignment starts null. assignWorker() requires a
 *     workerId plus assignment provenance (source + assignedAt) and
 *     records it; an opportunity with no worker is honestly
 *     "UNASSIGNED". No worker is ever invented.
 *   - INFORMATIONAL never implies TRANSACTIONAL. Resolving or
 *     listing an opportunity is not authorization or capability to
 *     act on it.
 *   - Opportunity pipeline (Crypto spec §99, merged with Wallet
 *     spec W5): DISCOVERED -> IDENTIFIED -> DATA_VERIFIED ->
 *     ELIGIBILITY_CHECKED -> GROSS_ESTIMATED -> COSTS_ESTIMATED ->
 *     RISK_ANALYZED -> DEPENDENCIES_CHECKED -> FRESHNESS_CHECKED ->
 *     SIMULATED -> RANKED -> RECOMMENDED -> PREPARED (terminal in
 *     this build; never EXECUTED). A DISCOVERED opportunity is never
 *     presented as an earning claim: its expected gross value stays
 *     UNKNOWN until GROSS_ESTIMATED with sourced data.
 *   - Eligibility is evidence-only: ELIGIBLE only when the
 *     opportunity's network, asset, wallet, amount, protocol,
 *     capability, access, liquidity, fees, risk, freshness, and
 *     verification all check out from recorded evidence. A bare
 *     asset match never implies ELIGIBLE.
 *   - Simulations are SIMULATION records only (never execution, never
 *     real accounting): every simulation says SIMULATION with inputs,
 *     assumptions, prices used, costs used, unknowns, risk, expected
 *     outcome, and timestamp, and carries accountingScope
 *     "SIMULATION_ONLY". Costs come from CostIntelligence when it is
 *     loaded, else UNKNOWN (never zero, never invented); risk comes
 *     from RiskIntelligence when loaded, else UNKNOWN; prices come
 *     from the opportunity's recorded data or UNKNOWN.
 *   - Expected net is EXPECTED GROSS minus every known cost kind
 *     (gas, protocol fee, swap/trading fees, slippage, bridge cost,
 *     borrow cost, funding cost, performance fee,
 *     infrastructure/API/model cost, exit cost, other). An unknown
 *     cost is never silently zero: it is listed in unknownCosts and
 *     the net is null while any required cost (or the gross) is
 *     UNKNOWN.
 *
 * Depends on js/truth.js only (for the shared truth vocabulary).
 * AssetIntelligence, NetworkIntelligence, EncyclopediaBridge and
 * CryptoWorld are optional peers, always behind guards: when a peer
 * is absent, resolution reports NOT_CONNECTED for its checks.
 * Pure functions: no DOM, no network, no secrets, no storage.
 */
var OpportunityIntelligence = (function (global) {
  "use strict";

  var FALLBACK_TRUTH_STATES = ["NOT_CONNECTED", "UNKNOWN", "UNVERIFIED",
    "STALE", "DISABLED", "UNAVAILABLE", "VERIFIED", "LIVE"];
  var FALLBACK_VERIFICATION_STATES = ["UNKNOWN", "DISCOVERED",
    "UNVERIFIED", "VERIFIED", "STALE", "UNAVAILABLE", "NOT_CONNECTED",
    "DISABLED"];
  var FRESH_DAYS = 7;
  var DEFAULT_MAX_AGE_DAYS = 30;
  var FRESHNESSES = ["fresh", "aging", "stale", "unknown"];

  // Opportunity pipeline (Crypto spec §99). PREPARED is the terminal
  // stage in this build — there is no EXECUTED stage here, and the
  // pipeline never advances to SIMULATED except through
  // simulateOpportunity().
  var PIPELINE_STATES = ["DISCOVERED", "IDENTIFIED", "DATA_VERIFIED",
    "ELIGIBILITY_CHECKED", "GROSS_ESTIMATED", "COSTS_ESTIMATED",
    "RISK_ANALYZED", "DEPENDENCIES_CHECKED", "FRESHNESS_CHECKED",
    "SIMULATED", "RANKED", "RECOMMENDED", "PREPARED"];
  var PIPELINE_INDEX = {};
  PIPELINE_STATES.forEach(function (s, i) { PIPELINE_INDEX[s] = i; });
  var GROSS_STAGE_INDEX = PIPELINE_INDEX.GROSS_ESTIMATED;

  // Eligibility outcomes (Wallet spec W5).
  var ELIGIBILITY_STATES = ["POSSIBLE", "ELIGIBLE", "NOT_ELIGIBLE",
    "UNKNOWN"];

  // Canonical cost kinds for expected-net arithmetic. "swap fee" and
  // "trading fee" are the two halves of the spec's "swap/trading
  // fees"; "infrastructure cost", "api cost" and "model cost" are
  // the three halves of "infrastructure/API/model cost".
  var COST_KINDS = ["gas", "protocol fee", "swap fee", "trading fee",
    "slippage", "bridge cost", "borrow cost", "funding cost",
    "performance fee", "infrastructure cost", "api cost", "model cost",
    "exit cost", "other"];

  // Wallet states, in progression order, for the wallet check in
  // checkEligibility (WalletIntelligence.stateAtLeast is used when
  // that module is loaded; this is the identical fallback).
  var WALLET_STATE_ORDER = { DISCONNECTED: 0, DISCOVERED: 1,
    CONNECTED: 2, ACCOUNT_ACCESSED: 3, SIGNING: 4,
    TRANSACTION_APPROVED: 5 };

  // Same secret-key parts as js/knowledge-model.js (normalised the
  // same way: lowercased, dashes/underscores stripped, substring).
  var SECRET_KEY_PARTS = ["seed", "mnemonic", "privatekey", "private_key",
    "apikey", "api_key", "apisecret", "password", "secret"];

  // Return-like field names. Any key normalising to one of these,
  // anywhere on an opportunity record, is rejected: no fabricated
  // returns, ever. Normalisation: lowercase, dashes/underscores
  // stripped. "return" / "returns" / "roi" / "apy" / "profit" /
  // "yield" / "earnings" / "income" / "revenue" are all return
  // claims, not costs, and this module records costs, never returns.
  var FORBIDDEN_RETURN_FIELDS = ["apy", "apypct",
    "annualpercentageyield", "profit", "expectedprofit",
    "projectedprofit", "return", "returns", "expectedreturn",
    "projectedreturn", "roi", "yield", "yieldpct", "earnings",
    "income", "revenue", "expectedyield", "projectedyield"];

  // Score-like field names on a risk entry. Risks are dimensions
  // with notes, never scores.
  var FORBIDDEN_RISK_SCORE_FIELDS = ["score", "riskscore", "rating",
    "weight", "probability", "severity"];

  // CryptoWorld risk vocabulary (19 dimensions). Reused from
  // CryptoWorld.RISK_DIMENSIONS when loaded; this identical list is
  // the fallback when it is not. Free-form dimensions are allowed
  // only with an explanatory note (see validateRisk).
  var FALLBACK_RISK_DIMENSIONS = ["Market risk", "Volatility risk",
    "Liquidation risk", "Smart-contract risk", "Oracle risk",
    "Bridge risk", "Chain/network risk", "Validator risk",
    "Counterparty/custody risk", "Stablecoin/depeg risk",
    "Liquidity risk", "Impermanent-loss risk", "Governance risk",
    "Token risk", "Protocol risk", "Approval/allowance risk",
    "Transaction/gas risk", "Regulatory/restriction status",
    "Data-source risk"];

  // The opportunity list starts EMPTY. Nothing is seeded.
  var opportunities = [];

  function truth() { return global.Truth || null; }

  function knownVerificationStates() {
    var states = [];
    var t = truth();
    if (t && t.TRUTH_STATES) states = states.concat(t.TRUTH_STATES);
    if (global.CryptoWorld && global.CryptoWorld.VERIFICATION_STATES) {
      states = states.concat(global.CryptoWorld.VERIFICATION_STATES);
    }
    if (!states.length) states = FALLBACK_VERIFICATION_STATES.slice();
    return states;
  }

  function riskDimensions() {
    if (global.CryptoWorld && global.CryptoWorld.RISK_DIMENSIONS) {
      return global.CryptoWorld.RISK_DIMENSIONS.slice();
    }
    return FALLBACK_RISK_DIMENSIONS.slice();
  }

  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim() !== "";
  }

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function parseDate(value) {
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function normaliseKey(key) {
    return String(key || "").toLowerCase().replace(/[-_]/g, "");
  }

  function isSecretKey(key) {
    var k = normaliseKey(key);
    for (var i = 0; i < SECRET_KEY_PARTS.length; i++) {
      if (k.indexOf(normaliseKey(SECRET_KEY_PARTS[i])) !== -1) return true;
    }
    return false;
  }

  // Recursively collect secret-looking keys and return-like keys.
  // Values are never inspected: a note that merely mentions the word
  // "profit" in prose is not a return field; only field NAMES count.
  function forbiddenKeyErrors(value, path, errors) {
    if (Array.isArray(value)) {
      value.forEach(function (item, i) {
        forbiddenKeyErrors(item, path + "[" + i + "]", errors);
      });
      return;
    }
    if (!value || typeof value !== "object") return;
    Object.keys(value).forEach(function (k) {
      var nk = normaliseKey(k);
      if (isSecretKey(k)) {
        errors.push("Secret-looking field not allowed in an opportunity: " + path + k + ".");
      }
      if (FORBIDDEN_RETURN_FIELDS.indexOf(nk) !== -1) {
        errors.push("Return-like field not allowed on an opportunity (no fabricated returns): " + path + k + ".");
      }
      forbiddenKeyErrors(value[k], path + k + ".", errors);
    });
  }

  function ageDays(record) {
    var d = parseDate((record && (record.checkedAt || record.lastChecked ||
      record.fetchedAt)) || null);
    if (!d) return null;
    return (Date.now() - d.getTime()) / 86400000;
  }

  function classifyFreshness(record, maxAgeDays) {
    var max = (maxAgeDays === undefined || maxAgeDays === null) ?
      DEFAULT_MAX_AGE_DAYS : Number(maxAgeDays);
    if (!(max >= 0)) max = DEFAULT_MAX_AGE_DAYS;
    var age = ageDays(record);
    if (age === null) return "unknown";
    if (age > max) return "stale";
    if (age <= FRESH_DAYS) return "fresh";
    return "aging";
  }

  function freshnessLabel(freshness) {
    if (freshness === "fresh") return "Fresh";
    if (freshness === "aging") return "Aging";
    if (freshness === "stale") return "Stale";
    return "Unknown age";
  }

  // Verification status for a record. VERIFIED survives only with a
  // source AND a timestamp; anything stale is STALE. Nothing is
  // upgraded to VERIFIED here.
  function resolveVerificationStatus(record, freshness) {
    var claimed = record.verificationStatus;
    var hasProvenance = isNonEmptyString(record.source) &&
      !!parseDate(record.checkedAt || record.lastChecked || record.fetchedAt);
    if (freshness === "stale") return "STALE";
    if (claimed === "VERIFIED") {
      return hasProvenance ? "VERIFIED" : "UNVERIFIED";
    }
    if (typeof claimed === "string" &&
        knownVerificationStates().indexOf(claimed) !== -1) {
      return claimed;
    }
    return "UNVERIFIED";
  }

  // ---- Costs ------------------------------------------------------------
  // A cost entry is either { kind, state: "UNKNOWN" } or a sourced
  // value { kind, value, currency, source, checkedAt }. UNKNOWN is
  // the default and stays UNKNOWN until a sourced value exists.

  function validateCost(entry, where) {
    var errors = [];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [where + " must be an object."];
    }
    if (!isNonEmptyString(entry.kind)) {
      errors.push(where + " needs a non-empty kind.");
    }
    var hasValue = entry.value !== undefined && entry.value !== null;
    if (entry.state !== undefined && entry.state !== "UNKNOWN") {
      errors.push(where + " has unknown state: " + entry.state + " (only UNKNOWN is a valid cost state).");
    }
    if (entry.state === "UNKNOWN" && hasValue) {
      errors.push(where + " is UNKNOWN and also carries a value: a cost is either UNKNOWN or a sourced value, not both.");
    }
    if (hasValue) {
      if (typeof entry.value !== "number" || !isFinite(entry.value) || entry.value < 0) {
        errors.push(where + " value must be a non-negative finite number.");
      }
      if (!isNonEmptyString(entry.currency)) {
        errors.push(where + " with a value needs a currency.");
      }
      if (!isNonEmptyString(entry.source)) {
        errors.push(where + " with a value needs a source.");
      }
      if (!parseDate(entry.checkedAt)) {
        errors.push(where + " with a value needs a checkedAt timestamp.");
      }
    }
    return errors;
  }

  function normalizeCost(entry) {
    var out = { kind: String(entry.kind) };
    if (entry.value !== undefined && entry.value !== null) {
      out.value = entry.value;
      out.currency = String(entry.currency);
      out.source = String(entry.source);
      out.checkedAt = String(entry.checkedAt);
    } else {
      out.state = "UNKNOWN";
    }
    return out;
  }

  // ---- Sourced amounts (expected gross, liquidity) ----------------------
  // A sourced amount is either { state: "UNKNOWN" } or a sourced
  // value { value, currency, source, checkedAt }. Same rule as a
  // cost: UNKNOWN is the default and stays UNKNOWN until a sourced
  // value exists; a value without currency + source + checkedAt is
  // rejected, never silently kept.

  function validateSourcedAmount(entry, where) {
    var errors = [];
    if (entry === undefined || entry === null) return errors;
    if (typeof entry !== "object" || Array.isArray(entry)) {
      return [where + " must be an object { state: \"UNKNOWN\" } or a sourced value { value, currency, source, checkedAt }."];
    }
    var hasValue = entry.value !== undefined && entry.value !== null;
    if (entry.state !== undefined && entry.state !== "UNKNOWN") {
      errors.push(where + " has unknown state: " + entry.state + " (only UNKNOWN is a valid sourced-amount state).");
    }
    if (entry.state === "UNKNOWN" && hasValue) {
      errors.push(where + " is UNKNOWN and also carries a value: a sourced amount is either UNKNOWN or a sourced value, not both.");
    }
    if (hasValue) {
      if (typeof entry.value !== "number" || !isFinite(entry.value) || entry.value < 0) {
        errors.push(where + " value must be a non-negative finite number.");
      }
      if (!isNonEmptyString(entry.currency)) {
        errors.push(where + " with a value needs a currency.");
      }
      if (!isNonEmptyString(entry.source)) {
        errors.push(where + " with a value needs a source.");
      }
      if (!parseDate(entry.checkedAt)) {
        errors.push(where + " with a value needs a checkedAt timestamp.");
      }
    }
    return errors;
  }

  function normalizeSourcedAmount(entry) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { state: "UNKNOWN" };
    }
    if (entry.value !== undefined && entry.value !== null) {
      return { value: entry.value, currency: String(entry.currency),
        source: String(entry.source), checkedAt: String(entry.checkedAt) };
    }
    return { state: "UNKNOWN" };
  }

  function hasSourcedValue(entry) {
    return !!entry && typeof entry === "object" &&
      entry.value !== undefined && entry.value !== null &&
      typeof entry.value === "number" && isFinite(entry.value);
  }

  // ---- Recorded prices ----------------------------------------------------
  // Optional price evidence on an opportunity: an array of entries,
  // each either { label, state: "UNKNOWN" } or a sourced price
  // { label, value, currency, source, checkedAt }. Prices are
  // recorded evidence only; a simulation uses them or UNKNOWN, never
  // an invented price.

  function validatePrice(entry, where) {
    var errors = [];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [where + " must be an object."];
    }
    if (!isNonEmptyString(entry.label)) {
      errors.push(where + " needs a non-empty label.");
    }
    var hasValue = entry.value !== undefined && entry.value !== null;
    if (entry.state !== undefined && entry.state !== "UNKNOWN") {
      errors.push(where + " has unknown state: " + entry.state + " (only UNKNOWN is a valid price state).");
    }
    if (entry.state === "UNKNOWN" && hasValue) {
      errors.push(where + " is UNKNOWN and also carries a value.");
    }
    if (hasValue) {
      if (typeof entry.value !== "number" || !isFinite(entry.value) || entry.value < 0) {
        errors.push(where + " value must be a non-negative finite number.");
      }
      if (!isNonEmptyString(entry.currency)) {
        errors.push(where + " with a value needs a currency.");
      }
      if (!isNonEmptyString(entry.source)) {
        errors.push(where + " with a value needs a source.");
      }
      if (!parseDate(entry.checkedAt)) {
        errors.push(where + " with a value needs a checkedAt timestamp.");
      }
    }
    return errors;
  }

  function normalizePrice(entry) {
    var out = { label: String(entry.label || "") };
    if (entry.value !== undefined && entry.value !== null) {
      out.value = entry.value;
      out.currency = String(entry.currency);
      out.source = String(entry.source);
      out.checkedAt = String(entry.checkedAt);
    } else {
      out.state = "UNKNOWN";
    }
    return out;
  }

  // ---- Risks ------------------------------------------------------------
  // A risk entry is { dimension, note }. The dimension should come
  // from the CryptoWorld risk vocabulary where applicable; a free-form
  // dimension is allowed only with a note explaining it. No scores.

  function validateRisk(entry, where) {
    var errors = [];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [where + " must be an object."];
    }
    if (!isNonEmptyString(entry.dimension)) {
      errors.push(where + " needs a non-empty dimension.");
      return errors;
    }
    Object.keys(entry).forEach(function (k) {
      if (FORBIDDEN_RISK_SCORE_FIELDS.indexOf(normaliseKey(k)) !== -1) {
        errors.push(where + " must not carry a score-like field: " + k + " (risks are dimensions, never scores).");
      }
    });
    var known = riskDimensions().indexOf(entry.dimension) !== -1;
    if (!known && !isNonEmptyString(entry.note)) {
      errors.push(where + " uses a free-form dimension \"" + entry.dimension +
        "\" outside the CryptoWorld risk vocabulary, so it needs a note explaining it.");
    }
    return errors;
  }

  function normalizeRisk(entry) {
    var out = { dimension: String(entry.dimension) };
    if (isNonEmptyString(entry.note)) out.note = String(entry.note);
    return out;
  }

  // ---- Worker assignment ------------------------------------------------
  // workerAssignment is null until assigned. An assignment records
  // workerId plus provenance (source + assignedAt); without both,
  // no assignment is recorded and no worker is invented.

  function validateWorkerAssignment(assignment, where) {
    var errors = [];
    if (assignment === null || assignment === undefined) return errors;
    if (typeof assignment !== "object" || Array.isArray(assignment)) {
      return [where + " must be null or an object { workerId, source, assignedAt }."];
    }
    if (!isNonEmptyString(assignment.workerId)) {
      errors.push(where + " needs a non-empty workerId.");
    }
    if (!isNonEmptyString(assignment.source) &&
        !isNonEmptyString(assignment.provenance)) {
      errors.push(where + " needs assignment provenance (a source).");
    }
    if (!parseDate(assignment.assignedAt)) {
      errors.push(where + " needs an assignedAt timestamp.");
    }
    return errors;
  }

  function workerStatus(opportunity) {
    if (!opportunity || !opportunity.workerAssignment) return "UNASSIGNED";
    return "ASSIGNED";
  }

  // ---- Validation -------------------------------------------------------
  // Strict gate for an opportunity record. Returns an array of error
  // strings; an empty array means the record passes. Does not throw,
  // never fabricates, never accepts a secret or return-like field.

  function validateOpportunity(op) {
    var errors = [];
    if (!op || typeof op !== "object" || Array.isArray(op)) {
      return ["Opportunity must be an object."];
    }

    forbiddenKeyErrors(op, "", errors);

    if (!isNonEmptyString(op.id)) {
      errors.push("An opportunity needs a non-empty id.");
    }

    // Asset reference: asset class id plus a chain/network. The class
    // id is a string here; its existence is checked by
    // resolveOpportunity(), not by this shape validator.
    if (!op.assetRef || typeof op.assetRef !== "object" || Array.isArray(op.assetRef)) {
      errors.push("An opportunity needs an assetRef { assetClassId, chain/network }.");
    } else {
      if (!isNonEmptyString(op.assetRef.assetClassId)) {
        errors.push("assetRef needs a non-empty assetClassId.");
      }
      if (!isNonEmptyString(op.assetRef.chain) &&
          !isNonEmptyString(op.assetRef.network)) {
        errors.push("assetRef needs a chain or network.");
      }
    }

    // Network reference: a network id string; existence is checked
    // by resolveOpportunity().
    if (!op.networkRef || typeof op.networkRef !== "object" || Array.isArray(op.networkRef)) {
      errors.push("An opportunity needs a networkRef { networkId }.");
    } else if (!isNonEmptyString(op.networkRef.networkId)) {
      errors.push("networkRef needs a non-empty networkId.");
    }

    // Protocol reference: a protocol name without a source is
    // rejected — a protocol is never invented. No protocolRef at
    // all means no protocol is recorded, which is honest.
    if (op.protocolRef !== undefined && op.protocolRef !== null) {
      if (typeof op.protocolRef !== "object" || Array.isArray(op.protocolRef)) {
        errors.push("protocolRef must be an object { name, source }.");
      } else if (isNonEmptyString(op.protocolRef.name) &&
          !isNonEmptyString(op.protocolRef.source)) {
        errors.push("A protocol name without a source is not allowed: protocolRef \"" +
          op.protocolRef.name + "\" needs a source.");
      } else if (!isNonEmptyString(op.protocolRef.name) &&
          isNonEmptyString(op.protocolRef.source)) {
        errors.push("protocolRef has a source but no protocol name.");
      }
    }

    // Taxonomy spine: ids only here; existence and parentage are
    // checked by resolveOpportunity().
    if (!isNonEmptyString(op.majorActivityId)) {
      errors.push("An opportunity needs a non-empty majorActivityId.");
    }
    if (!isNonEmptyString(op.typeId)) {
      errors.push("An opportunity needs a non-empty typeId.");
    }
    if (!isNonEmptyString(op.strategyId)) {
      errors.push("An opportunity needs a non-empty strategyId.");
    }

    // Costs: UNKNOWN by default; a value needs currency + source +
    // checkedAt.
    if (op.costs !== undefined) {
      if (!Array.isArray(op.costs)) {
        errors.push("costs must be an array.");
      } else {
        op.costs.forEach(function (c, i) {
          errors = errors.concat(validateCost(c, "costs[" + i + "]"));
        });
      }
    }

    // Risks: vocabulary dimensions, or free-form with a note; never
    // scores.
    if (op.risks !== undefined) {
      if (!Array.isArray(op.risks)) {
        errors.push("risks must be an array.");
      } else {
        op.risks.forEach(function (r, i) {
          errors = errors.concat(validateRisk(r, "risks[" + i + "]"));
        });
      }
    }

    // Qualification / access: requirements are strings; accessNotes
    // is a string. Neither claims the owner qualifies: access notes
    // never claim eligibility without trustworthy connected data.
    if (op.qualification !== undefined && op.qualification !== null) {
      if (typeof op.qualification !== "object" || Array.isArray(op.qualification)) {
        errors.push("qualification must be an object { requirements, accessNotes }.");
      } else {
        if (op.qualification.requirements !== undefined) {
          if (!Array.isArray(op.qualification.requirements) ||
              op.qualification.requirements.some(function (r) { return typeof r !== "string"; })) {
            errors.push("qualification.requirements must be an array of strings.");
          }
        }
        if (op.qualification.accessNotes !== undefined &&
            typeof op.qualification.accessNotes !== "string") {
          errors.push("qualification.accessNotes must be a string.");
        }
      }
    }

    // Verification / freshness: Truth vocabulary; VERIFIED needs a
    // source AND a timestamp.
    if (op.verificationStatus !== undefined) {
      if (knownVerificationStates().indexOf(op.verificationStatus) === -1) {
        errors.push("Unknown verification status: " + op.verificationStatus + ".");
      }
    }
    if (op.verificationStatus === "VERIFIED") {
      if (!isNonEmptyString(op.source)) {
        errors.push("A VERIFIED opportunity needs a source.");
      }
      if (!op.checkedAt && !op.lastChecked && !op.fetchedAt) {
        errors.push("A VERIFIED opportunity needs a checkedAt/lastChecked/fetchedAt timestamp.");
      }
    }
    if (op.freshness !== undefined &&
        FRESHNESSES.indexOf(op.freshness) === -1) {
      errors.push("Unknown freshness: " + op.freshness + " (use fresh, aging, stale, or unknown).");
    }

    // Pipeline: an unknown stage is rejected. A sourced expected
    // gross value is rejected before GROSS_ESTIMATED — a DISCOVERED
    // opportunity is never presented as an earning claim, and its
    // expected value fields stay UNKNOWN until GROSS_ESTIMATED with
    // sourced data.
    if (op.pipelineState !== undefined &&
        PIPELINE_STATES.indexOf(op.pipelineState) === -1) {
      errors.push("Unknown pipeline state: " + op.pipelineState + ".");
    }
    if (op.pipelineHistory !== undefined) {
      if (!Array.isArray(op.pipelineHistory)) {
        errors.push("pipelineHistory must be an array.");
      } else {
        op.pipelineHistory.forEach(function (h, i) {
          if (!h || typeof h !== "object" || Array.isArray(h)) {
            errors.push("pipelineHistory[" + i + "] must be an object { from, to, at, by, note, reason }.");
          } else {
            if (h.to !== undefined && PIPELINE_STATES.indexOf(h.to) === -1) {
              errors.push("pipelineHistory[" + i + "] has unknown target state: " + h.to + ".");
            }
            if (h.from !== undefined && h.from !== null &&
                PIPELINE_STATES.indexOf(h.from) === -1) {
              errors.push("pipelineHistory[" + i + "] has unknown source state: " + h.from + ".");
            }
            if (h.at !== undefined && !parseDate(h.at)) {
              errors.push("pipelineHistory[" + i + "] needs a parseable at timestamp.");
            }
          }
        });
      }
    }
    errors = errors.concat(validateSourcedAmount(op.expectedGross, "expectedGross"));
    if (hasSourcedValue(op.expectedGross)) {
      var grossStage = op.pipelineState === undefined ? 0 :
        PIPELINE_INDEX[op.pipelineState];
      if (grossStage === undefined || grossStage < GROSS_STAGE_INDEX) {
        errors.push("A sourced expectedGross value is not allowed before GROSS_ESTIMATED: " +
          "an opportunity at pipeline state \"" + (op.pipelineState || "DISCOVERED") +
          "\" keeps its expected value UNKNOWN.");
      }
    }
    errors = errors.concat(validateSourcedAmount(op.liquidity, "liquidity"));
    if (op.prices !== undefined) {
      if (!Array.isArray(op.prices)) {
        errors.push("prices must be an array.");
      } else {
        op.prices.forEach(function (p, i) {
          errors = errors.concat(validatePrice(p, "prices[" + i + "]"));
        });
      }
    }

    // Worker assignment: null is the honest default; a non-null
    // assignment needs workerId + provenance + assignedAt.
    if (op.workerAssignment !== undefined) {
      errors = errors.concat(validateWorkerAssignment(op.workerAssignment, "workerAssignment"));
    }

    return errors;
  }

  // ---- Normalisation ----------------------------------------------------
  // Enriched VIEW of an opportunity record. Never mutates its
  // argument. Defaults: costs UNKNOWN, risks [], qualification
  // empty, workerAssignment null, verificationStatus UNVERIFIED
  // unless proven, freshness derived from age.

  function normalizeOpportunity(op) {
    var raw = (op && typeof op === "object") ? op : {};
    var view = {};
    Object.keys(raw).forEach(function (k) { view[k] = clone(raw[k]); });

    view.id = isNonEmptyString(raw.id) ? String(raw.id) : "";
    view.assetRef = raw.assetRef ? clone(raw.assetRef) : { assetClassId: "", chain: "" };
    view.networkRef = raw.networkRef ? clone(raw.networkRef) : { networkId: "" };
    view.protocolRef = raw.protocolRef ? clone(raw.protocolRef) : { name: "", source: "" };
    view.majorActivityId = isNonEmptyString(raw.majorActivityId) ? String(raw.majorActivityId) : "";
    view.typeId = isNonEmptyString(raw.typeId) ? String(raw.typeId) : "";
    view.strategyId = isNonEmptyString(raw.strategyId) ? String(raw.strategyId) : "";

    view.costs = Array.isArray(raw.costs) ?
      raw.costs.map(function (c) {
        if (!c || typeof c !== "object") return { kind: "", state: "UNKNOWN" };
        return normalizeCost(c);
      }) : [];
    view.risks = Array.isArray(raw.risks) ?
      raw.risks.map(function (r) {
        if (!r || typeof r !== "object") return { dimension: "", note: "" };
        return normalizeRisk(r);
      }) : [];
    view.qualification = {
      requirements: (raw.qualification && Array.isArray(raw.qualification.requirements)) ?
        raw.qualification.requirements.slice() : [],
      accessNotes: (raw.qualification && typeof raw.qualification.accessNotes === "string") ?
        raw.qualification.accessNotes : ""
    };

    view.freshness = classifyFreshness(raw, DEFAULT_MAX_AGE_DAYS);
    view.freshnessLabel = freshnessLabel(view.freshness);
    view.verificationStatus = resolveVerificationStatus(raw, view.freshness);
    view.workerAssignment = raw.workerAssignment ? clone(raw.workerAssignment) : null;
    view.workerStatus = workerStatus(view);

    // Pipeline: DISCOVERED by default. Expected gross and liquidity
    // default UNKNOWN; a sourced expected gross is dropped back to
    // UNKNOWN when the pipeline has not reached GROSS_ESTIMATED —
    // the stage, not the record, decides when an expected value may
    // be carried.
    view.pipelineState = PIPELINE_STATES.indexOf(raw.pipelineState) !== -1 ?
      String(raw.pipelineState) : "DISCOVERED";
    view.pipelineHistory = Array.isArray(raw.pipelineHistory) ?
      raw.pipelineHistory.map(function (h) {
        if (!h || typeof h !== "object") return { from: null, to: "DISCOVERED", at: "", by: "", note: "", reason: "" };
        return {
          from: (h.from === undefined || h.from === null) ? null : String(h.from),
          to: String(h.to || "DISCOVERED"),
          at: String(h.at || ""),
          by: String(h.by || ""),
          note: typeof h.note === "string" ? h.note : "",
          reason: typeof h.reason === "string" ? h.reason : ""
        };
      }) : [];
    view.expectedGross = normalizeSourcedAmount(raw.expectedGross);
    if (PIPELINE_INDEX[view.pipelineState] < GROSS_STAGE_INDEX) {
      view.expectedGross = { state: "UNKNOWN" };
    }
    view.liquidity = normalizeSourcedAmount(raw.liquidity);
    view.prices = Array.isArray(raw.prices) ?
      raw.prices.map(function (p) {
        if (!p || typeof p !== "object") return { label: "", state: "UNKNOWN" };
        return normalizePrice(p);
      }) : [];
    return view;
  }

  // ---- Registry (starts EMPTY) ------------------------------------------

  function listOpportunities() {
    return opportunities.map(function (o) { return clone(o); });
  }

  function getOpportunity(id) {
    var found = null;
    opportunities.forEach(function (o) { if (o.id === id) found = o; });
    return found ? clone(found) : null;
  }

  function countOpportunities() {
    return opportunities.length;
  }

  // Add an opportunity. Pure with respect to the caller's record
  // (it is normalised into a copy); the module list gains one entry
  // on success. Duplicate ids and invalid records are rejected.
  function addOpportunity(op) {
    var errors = validateOpportunity(op);
    if (errors.length) return { ok: false, errors: errors };
    var normalized = normalizeOpportunity(op);
    var duplicate = false;
    opportunities.forEach(function (o) { if (o.id === normalized.id) duplicate = true; });
    if (duplicate) {
      return { ok: false, errors: ["An opportunity with id \"" + normalized.id + "\" already exists."] };
    }
    opportunities.push(normalized);
    return { ok: true, opportunity: clone(normalized) };
  }

  // ---- Resolution -------------------------------------------------------
  // Cross-checks asset class, network, and the encyclopedia spine
  // (Major Activity -> Type -> Strategy, with parentage). Returns
  // { ok, errors, resolved }. Never passes a check it could not
  // perform: an absent peer module records its checks as
  // NOT_CONNECTED, and a shape-only asset check is SHAPE_ONLY.

  function checkAsset(op) {
    var assetClassId = op.assetRef && op.assetRef.assetClassId;
    var AI = global.AssetIntelligence;
    if (AI && typeof AI.getClass === "function") {
      var cls = null;
      try { cls = AI.getClass(assetClassId); } catch (e) { cls = null; }
      if (cls) {
        return { checked: true, found: true, status: "FOUND",
          detail: "Asset class \"" + cls.label + "\" (" + assetClassId + ") exists in AssetIntelligence.",
          source: "AssetIntelligence registry" };
      }
      return { checked: true, found: false, status: "NOT_FOUND",
        detail: "Asset class \"" + assetClassId + "\" does not exist in AssetIntelligence.",
        source: "AssetIntelligence registry" };
    }
    // Shape check only: the id is present and well-formed, but no
    // registry was available to confirm it exists.
    if (isNonEmptyString(assetClassId)) {
      return { checked: false, found: false, status: "SHAPE_ONLY",
        detail: "AssetIntelligence is not loaded: assetClassId \"" + assetClassId +
          "\" is present and well-formed, but its existence was not confirmed.",
        source: "none" };
    }
    return { checked: false, found: false, status: "NOT_CONNECTED",
      detail: "AssetIntelligence is not loaded and no assetClassId was supplied.",
      source: "none" };
  }

  function checkNetwork(op) {
    var networkId = op.networkRef && op.networkRef.networkId;
    var NI = global.NetworkIntelligence;
    if (NI && (typeof NI.getExampleNetwork === "function" ||
        Array.isArray(NI.EXAMPLE_NETWORKS))) {
      var found = null;
      try {
        if (typeof NI.getExampleNetwork === "function") {
          found = NI.getExampleNetwork(networkId);
        }
      } catch (e) { found = null; }
      if (!found && Array.isArray(NI.EXAMPLE_NETWORKS)) {
        NI.EXAMPLE_NETWORKS.forEach(function (n) {
          if (n && n.id === networkId) found = n;
        });
      }
      if (found) {
        return { checked: true, found: true, status: "FOUND",
          detail: "Network \"" + found.name + "\" (" + networkId + ") exists in NetworkIntelligence.",
          source: "NetworkIntelligence registry (structural examples)" };
      }
      return { checked: true, found: false, status: "NOT_FOUND",
        detail: "Network \"" + networkId + "\" does not exist in NetworkIntelligence.",
        source: "NetworkIntelligence registry (structural examples)" };
    }
    return { checked: false, found: false, status: "NOT_CONNECTED",
      detail: "NetworkIntelligence is not loaded: network \"" + networkId + "\" was not checked.",
      source: "none" };
  }

  // One encyclopedia record, via the bridge. Reports the record's own
  // source (the bridge's source reporting): record.source plus its
  // import batch when present. When the bridge is absent, the check
  // is NOT_CONNECTED, never passed.
  function checkEncyclopediaRecord(id, expectedLevel) {
    var EB = global.EncyclopediaBridge;
    if (!EB || typeof EB.getRecord !== "function") {
      return { checked: false, found: false, status: "NOT_CONNECTED",
        detail: "EncyclopediaBridge is not loaded: encyclopedia record \"" + id + "\" was not checked.",
        source: "none", record: null };
    }
    var rec = null;
    try { rec = EB.getRecord(id); } catch (e) { rec = null; }
    if (!rec) {
      return { checked: true, found: false, status: "NOT_FOUND",
        detail: "No encyclopedia record matches id \"" + id + "\".",
        source: "EncyclopediaBridge", record: null };
    }
    var source = rec.source || "canonical-import";
    if (rec.importBatch) source += " (" + rec.importBatch + ")";
    if (expectedLevel && rec.level !== expectedLevel) {
      return { checked: true, found: false, status: "NOT_FOUND",
        detail: "\"" + rec.title + "\" (" + id + ") is a " + (rec.level || "record") +
          ", not a " + expectedLevel + ".",
        source: source, record: { id: rec.id, title: rec.title, level: rec.level } };
    }
    return { checked: true, found: true, status: "FOUND",
      detail: "\"" + rec.title + "\" (" + id + ", " + rec.level +
        ", " + (rec.verificationStatus || "UNKNOWN") + ") exists in the encyclopedia.",
      source: source,
      record: { id: rec.id, title: rec.title, level: rec.level,
        verificationStatus: rec.verificationStatus || "UNKNOWN" } };
  }

  function resolveOpportunity(op) {
    var errors = [];
    var normalized = normalizeOpportunity(op || {});
    // Resolution works on the normalised view so defaults (UNKNOWN
    // costs, null worker) are visible to every check.
    var asset = checkAsset(normalized);
    var network = checkNetwork(normalized);
    var major = checkEncyclopediaRecord(normalized.majorActivityId, "MAJOR_ACTIVITY");
    var type = checkEncyclopediaRecord(normalized.typeId, "TYPE");
    var strategy = checkEncyclopediaRecord(normalized.strategyId, "STRATEGY");

    if (!asset.checked || !asset.found) {
      errors.push("Asset check failed: " + asset.detail);
    }
    if (!network.checked || !network.found) {
      errors.push("Network check failed: " + network.detail);
    }
    if (!major.checked || !major.found) {
      errors.push("Major Activity check failed: " + major.detail);
    }
    if (!type.checked || !type.found) {
      errors.push("Type check failed: " + type.detail);
    }
    if (!strategy.checked || !strategy.found) {
      errors.push("Strategy check failed: " + strategy.detail);
    }

    // Parentage: Type must sit under the Major Activity, Strategy
    // under the Type. Only checkable when the bridge is loaded and
    // both records were found; otherwise the check is already
    // recorded as NOT_CONNECTED / NOT_FOUND above.
    var parentage = { checked: false, ok: false, detail: "", source: "none" };
    var EB = global.EncyclopediaBridge;
    if (EB && typeof EB.getRecord === "function" && major.found && type.found && strategy.found) {
      parentage.checked = true;
      parentage.source = major.source;
      var typeRec = EB.getRecord(normalized.typeId);
      var strategyRec = EB.getRecord(normalized.strategyId);
      var typeOk = typeRec && typeRec.parentRef === normalized.majorActivityId;
      var strategyOk = strategyRec && strategyRec.parentRef === normalized.typeId;
      if (typeOk && strategyOk) {
        parentage.ok = true;
        parentage.detail = "Type sits under the Major Activity and Strategy sits under the Type.";
      } else {
        parentage.detail = "Parentage mismatch:" +
          (typeOk ? "" : " Type \"" + normalized.typeId + "\" does not sit under Major Activity \"" + normalized.majorActivityId + "\".") +
          (strategyOk ? "" : " Strategy \"" + normalized.strategyId + "\" does not sit under Type \"" + normalized.typeId + "\".");
        errors.push("Parentage check failed: " + parentage.detail);
      }
    } else if (major.found && type.found && strategy.found) {
      parentage.detail = "EncyclopediaBridge is not loaded: parentage was not checked.";
      errors.push("Parentage check failed: " + parentage.detail);
    } else {
      parentage.detail = "Parentage was not checked: one or more spine records were not found.";
    }

    // Costs and risks, summarised honestly: UNKNOWN costs are not
    // values, and free-form risk dimensions are flagged, not hidden.
    var knownDims = riskDimensions();
    var costsUnknown = 0;
    var costsSourced = 0;
    normalized.costs.forEach(function (c) {
      if (c.value !== undefined) costsSourced++;
      else costsUnknown++;
    });
    var risksKnown = 0;
    var risksFreeForm = 0;
    normalized.risks.forEach(function (r) {
      if (knownDims.indexOf(r.dimension) !== -1) risksKnown++;
      else risksFreeForm++;
    });

    var worker = normalized.workerAssignment ?
      { checked: true, found: true, status: "ASSIGNED",
        detail: "Assigned to worker \"" + normalized.workerAssignment.workerId + "\".",
        source: normalized.workerAssignment.source || normalized.workerAssignment.provenance || "" } :
      { checked: true, found: false, status: "UNASSIGNED",
        detail: "No worker is assigned to this opportunity.",
        source: "none" };

    var protocol = isNonEmptyString(normalized.protocolRef.name) ?
      { checked: true, found: true, status: "RECORDED",
        detail: "Protocol \"" + normalized.protocolRef.name + "\" recorded with source \"" + normalized.protocolRef.source + "\".",
        source: normalized.protocolRef.source } :
      { checked: true, found: false, status: "NONE",
        detail: "No protocol is recorded for this opportunity.",
        source: "none" };

    var resolved = {
      id: normalized.id,
      asset: asset,
      network: network,
      protocol: protocol,
      encyclopedia: {
        majorActivity: major,
        type: type,
        strategy: strategy,
        parentage: parentage,
        source: major.source
      },
      costs: { unknown: costsUnknown, sourced: costsSourced,
        detail: costsSourced + " sourced cost(s), " + costsUnknown + " UNKNOWN cost(s)." },
      risks: { knownDimensions: risksKnown, freeFormDimensions: risksFreeForm,
        detail: risksKnown + " risk(s) in the CryptoWorld vocabulary, " + risksFreeForm + " free-form dimension(s) with notes." },
      qualification: normalized.qualification,
      worker: worker,
      verificationStatus: normalized.verificationStatus,
      freshness: normalized.freshness,
      freshnessLabel: normalized.freshnessLabel
    };

    return { ok: errors.length === 0, errors: errors, resolved: resolved };
  }

  // ---- Worker assignment ------------------------------------------------
  // assignWorker(opportunity, workerId, provenance) returns
  // { ok, errors, opportunity } with a NEW opportunity object; the
  // input is never mutated. provenance is a source string or an
  // object { source | assignedBy, assignedAt }. assignedAt defaults
  // to the actual time of assignment (now) when not supplied — the
  // time the assignment was made, never a claim about the worker.

  function assignWorker(opportunity, workerId, provenance) {
    var errors = [];
    if (!opportunity || typeof opportunity !== "object") {
      return { ok: false, errors: ["An opportunity record is required."] };
    }
    if (!isNonEmptyString(workerId)) {
      errors.push("assignWorker needs a non-empty workerId.");
    }
    var source = "";
    var assignedBy = "";
    var assignedAt = "";
    if (typeof provenance === "string") {
      source = provenance;
    } else if (provenance && typeof provenance === "object") {
      source = provenance.source || provenance.provenance || "";
      assignedBy = provenance.assignedBy || "";
      if (provenance.assignedAt) assignedAt = String(provenance.assignedAt);
    }
    if (!isNonEmptyString(source)) {
      errors.push("assignWorker needs assignment provenance (a source).");
    }
    if (!assignedAt) {
      assignedAt = new Date().toISOString();
    } else if (!parseDate(assignedAt)) {
      errors.push("Assignment provenance assignedAt must be a parseable timestamp.");
    }
    if (errors.length) return { ok: false, errors: errors };

    var next = normalizeOpportunity(opportunity);
    next.workerAssignment = {
      workerId: String(workerId),
      source: String(source),
      assignedAt: assignedAt
    };
    if (isNonEmptyString(assignedBy)) next.workerAssignment.assignedBy = String(assignedBy);
    next.workerAssignment.provenance = String(source);
    next.workerStatus = "ASSIGNED";
    return { ok: true, opportunity: next };
  }

  // A blank opportunity: identity + spine ids only, everything else
  // UNKNOWN / empty / null. The honest starting point for a recorded
  // opportunity.
  function blankOpportunity(id) {
    return {
      id: id,
      assetRef: { assetClassId: "", chain: "" },
      networkRef: { networkId: "" },
      protocolRef: { name: "", source: "" },
      majorActivityId: "",
      typeId: "",
      strategyId: "",
      costs: [],
      risks: [],
      qualification: { requirements: [], accessNotes: "" },
      verificationStatus: "UNKNOWN",
      freshness: "unknown",
      workerAssignment: null,
      pipelineState: "DISCOVERED",
      pipelineHistory: [],
      expectedGross: { state: "UNKNOWN" },
      liquidity: { state: "UNKNOWN" },
      prices: []
    };
  }

  // ---- Opportunity pipeline ---------------------------------------------
  // The Crypto spec's pipeline, forward-only. A jump of more than one
  // stage needs a recorded reason; SIMULATED is reachable only
  // through simulateOpportunity(); PREPARED is terminal in this
  // build — there is no EXECUTED stage here, and the pipeline never
  // claims one.

  var simulations = [];

  function nowIso() {
    return new Date().toISOString();
  }

  function findStoredIndex(id) {
    for (var i = 0; i < opportunities.length; i++) {
      if (opportunities[i].id === id) return i;
    }
    return -1;
  }

  function pipelineStates() {
    return PIPELINE_STATES.slice();
  }

  function getPipeline(opportunityId) {
    var idx = findStoredIndex(opportunityId);
    if (idx === -1) return null;
    var op = opportunities[idx];
    return {
      opportunityId: op.id,
      state: op.pipelineState || "DISCOVERED",
      history: clone(op.pipelineHistory || [])
    };
  }

  function canAdvancePipeline(from, to) {
    if (PIPELINE_STATES.indexOf(from) === -1 ||
        PIPELINE_STATES.indexOf(to) === -1) return false;
    return PIPELINE_INDEX[to] > PIPELINE_INDEX[from];
  }

  function appendPipelineHistory(stored, from, to, by, note, reason) {
    if (!Array.isArray(stored.pipelineHistory)) stored.pipelineHistory = [];
    stored.pipelineHistory.push({
      from: from,
      to: to,
      at: nowIso(),
      by: isNonEmptyString(by) ? String(by).trim() : "UNKNOWN",
      note: typeof note === "string" ? note : "",
      reason: typeof reason === "string" ? reason : ""
    });
  }

  function advancePipeline(opportunityId, to, options) {
    var opts = (options && typeof options === "object") ? options : {};
    var idx = findStoredIndex(opportunityId);
    if (idx === -1) {
      return { ok: false, reason: "UNKNOWN_OPPORTUNITY",
        message: "No opportunity with id " + String(opportunityId) + "." };
    }
    if (PIPELINE_STATES.indexOf(to) === -1) {
      return { ok: false, reason: "UNKNOWN_STATE",
        message: "Unknown pipeline state: " + String(to) + "." };
    }
    var stored = opportunities[idx];
    var from = stored.pipelineState || "DISCOVERED";
    if (to === "SIMULATED") {
      return { ok: false, reason: "SIMULATION_ONLY",
        message: "Pipeline advances to SIMULATED only when a simulation record is created — use simulateOpportunity()." };
    }
    var distance = PIPELINE_INDEX[to] - PIPELINE_INDEX[from];
    if (distance <= 0) {
      return { ok: false, reason: "ILLEGAL_TRANSITION",
        message: "Illegal pipeline transition: " + from + " -> " + to +
          " is not a forward transition" +
          (from === to ? " (already at " + to + ")." : " (backwards).") };
    }
    var reason = "";
    if (isNonEmptyString(opts.reason)) reason = String(opts.reason).trim();
    else if (isNonEmptyString(opts.note)) reason = String(opts.note).trim();
    if (distance > 1 && !reason) {
      return { ok: false, reason: "REASON_REQUIRED",
        message: "Skipping " + distance + " pipeline stages (" + from + " -> " + to +
          ") needs a recorded reason (options.reason). Advance one stage at a time otherwise." };
    }
    stored.pipelineState = to;
    appendPipelineHistory(stored, from, to, opts.by, opts.note, reason);
    return { ok: true, opportunity: clone(stored) };
  }

  // Records a sourced expected gross value on a stored opportunity.
  // Only allowed once the pipeline has reached GROSS_ESTIMATED:
  // before that stage the expected value stays UNKNOWN, never a
  // claim. The value still needs currency + source + checkedAt.
  function recordGrossEstimate(opportunityId, gross) {
    var idx = findStoredIndex(opportunityId);
    if (idx === -1) {
      return { ok: false, reason: "UNKNOWN_OPPORTUNITY",
        message: "No opportunity with id " + String(opportunityId) + "." };
    }
    var stored = opportunities[idx];
    var stage = PIPELINE_INDEX[stored.pipelineState || "DISCOVERED"];
    if (stage < GROSS_STAGE_INDEX) {
      return { ok: false, reason: "STAGE_TOO_EARLY",
        message: "Expected gross cannot be recorded at pipeline state \"" +
          (stored.pipelineState || "DISCOVERED") +
          "\": advance to GROSS_ESTIMATED first. The expected value stays UNKNOWN until then." };
    }
    var errors = validateSourcedAmount(gross, "expectedGross");
    if (!hasSourcedValue(gross)) {
      errors.push("recordGrossEstimate needs a sourced expectedGross value { value, currency, source, checkedAt } — UNKNOWN is not a gross estimate.");
    }
    if (errors.length) return { ok: false, reason: "INVALID_GROSS", errors: errors };
    stored.expectedGross = normalizeSourcedAmount(gross);
    return { ok: true, opportunity: clone(stored) };
  }

  // ---- Eligibility --------------------------------------------------------
  // Evidence-only eligibility (Wallet spec W5 + Crypto spec). Each
  // check reports PASS, FAIL, UNKNOWN, or NOT_CONNECTED with its
  // detail and source; INFO entries are context, not checks. The
  // verdict is fail-closed:
  //   - any FAIL -> NOT_ELIGIBLE (reasons name the failing check)
  //   - any UNKNOWN on a structural check (network, asset, taxonomy)
  //     -> UNKNOWN (applicability itself could not be established)
  //   - structural checks all PASS but a downstream check UNKNOWN
  //     -> POSSIBLE (structurally applicable, evidence incomplete)
  //   - every check PASS -> ELIGIBLE
  // A bare asset match never implies ELIGIBLE: matching the asset
  // and network only ever reaches POSSIBLE while the other checks
  // have no evidence.

  function walletAtLeast(state, minimum) {
    var WI = global.WalletIntelligence;
    if (WI && typeof WI.stateAtLeast === "function") {
      try { return WI.stateAtLeast(state, minimum); } catch (e) { /* fall through */ }
    }
    if (typeof WALLET_STATE_ORDER[state] !== "number") return false;
    if (typeof WALLET_STATE_ORDER[minimum] !== "number") return false;
    return WALLET_STATE_ORDER[state] >= WALLET_STATE_ORDER[minimum];
  }

  function checkEligibility(opportunityId, context) {
    var ctx = (context && typeof context === "object") ? context : {};
    var checkedAt = nowIso();
    var idx = findStoredIndex(opportunityId);
    if (idx === -1) {
      return { opportunityId: String(opportunityId), checkedAt: checkedAt,
        eligibility: "UNKNOWN",
        reasons: ["Opportunity \"" + String(opportunityId) + "\" was not found: no eligibility check could be performed."],
        evidence: [{ check: "opportunity", status: "UNKNOWN",
          detail: "No stored opportunity matches id \"" + String(opportunityId) + "\".",
          source: "none" }] };
    }
    var op = normalizeOpportunity(opportunities[idx]);
    var evidence = [];
    function ev(check, status, detail, source) {
      evidence.push({ check: check, status: status, detail: detail, source: source });
      return status;
    }

    // Structural checks: network, asset, taxonomy spine. These decide
    // whether the opportunity is applicable at all.
    var structuralUnknown = false;
    var anyFail = false;
    var anyUnknown = false;
    function note(status) {
      if (status === "FAIL") anyFail = true;
      if (status === "UNKNOWN" || status === "NOT_CONNECTED") anyUnknown = true;
    }

    // Network: the caller's network must match the opportunity's
    // network, and the registry must know the network.
    var netStatus;
    if (!isNonEmptyString(ctx.networkId)) {
      netStatus = ev("network", "UNKNOWN",
        "No networkId was supplied, so the opportunity's network \"" +
        op.networkRef.networkId + "\" could not be checked against a wallet or account.",
        "none");
    } else if (ctx.networkId !== op.networkRef.networkId) {
      netStatus = ev("network", "FAIL",
        "Network mismatch: the opportunity is on \"" + op.networkRef.networkId +
        "\" but the supplied network is \"" + ctx.networkId + "\".",
        "caller context vs opportunity record");
    } else {
      var NI = global.NetworkIntelligence;
      var netFound = null;
      if (NI && typeof NI.getExampleNetwork === "function") {
        try { netFound = NI.getExampleNetwork(ctx.networkId); } catch (e) { netFound = null; }
      }
      if (!netFound && NI && Array.isArray(NI.EXAMPLE_NETWORKS)) {
        NI.EXAMPLE_NETWORKS.forEach(function (n) {
          if (n && n.id === ctx.networkId) netFound = n;
        });
      }
      if (netFound) {
        netStatus = ev("network", "PASS",
          "Network \"" + ctx.networkId + "\" matches the opportunity and exists in NetworkIntelligence.",
          "NetworkIntelligence registry");
      } else if (NI) {
        netStatus = ev("network", "FAIL",
          "Network \"" + ctx.networkId + "\" matches the opportunity but does not exist in NetworkIntelligence.",
          "NetworkIntelligence registry");
      } else {
        netStatus = ev("network", "UNKNOWN",
          "Network \"" + ctx.networkId + "\" matches the opportunity, but NetworkIntelligence is not loaded so the network was not confirmed.",
          "none");
      }
    }
    note(netStatus);
    if (netStatus === "UNKNOWN" || netStatus === "NOT_CONNECTED") structuralUnknown = true;

    // Asset: the caller's asset must match the opportunity's asset
    // class, and the registry must know the class. Matching an asset
    // is a structural fact only — it never implies eligibility.
    var assetStatus;
    if (!isNonEmptyString(ctx.assetId)) {
      assetStatus = ev("asset", "UNKNOWN",
        "No assetId was supplied, so the opportunity's asset class \"" +
        op.assetRef.assetClassId + "\" could not be checked.",
        "none");
    } else if (ctx.assetId !== op.assetRef.assetClassId) {
      assetStatus = ev("asset", "FAIL",
        "Asset mismatch: the opportunity is for asset class \"" + op.assetRef.assetClassId +
        "\" but the supplied asset is \"" + ctx.assetId + "\".",
        "caller context vs opportunity record");
    } else {
      var AI = global.AssetIntelligence;
      var cls = null;
      if (AI && typeof AI.getClass === "function") {
        try { cls = AI.getClass(ctx.assetId); } catch (e) { cls = null; }
      }
      if (cls) {
        assetStatus = ev("asset", "PASS",
          "Asset class \"" + ctx.assetId + "\" matches the opportunity and exists in AssetIntelligence.",
          "AssetIntelligence registry");
      } else if (AI) {
        assetStatus = ev("asset", "FAIL",
          "Asset class \"" + ctx.assetId + "\" matches the opportunity but does not exist in AssetIntelligence.",
          "AssetIntelligence registry");
      } else {
        assetStatus = ev("asset", "UNKNOWN",
          "Asset class \"" + ctx.assetId + "\" matches the opportunity, but AssetIntelligence is not loaded so the class was not confirmed.",
          "none");
      }
    }
    note(assetStatus);
    if (assetStatus === "UNKNOWN" || assetStatus === "NOT_CONNECTED") structuralUnknown = true;

    // Taxonomy spine: Major Activity -> Type -> Strategy with
    // parentage, via the same resolution the module already performs.
    var resolved = resolveOpportunity(op);
    var spineStatus;
    var spineNotConnected = resolved.resolved.asset.status === "NOT_CONNECTED" ||
      resolved.resolved.network.status === "NOT_CONNECTED" ||
      resolved.resolved.encyclopedia.majorActivity.status === "NOT_CONNECTED" ||
      resolved.resolved.encyclopedia.type.status === "NOT_CONNECTED" ||
      resolved.resolved.encyclopedia.strategy.status === "NOT_CONNECTED";
    if (spineNotConnected) {
      spineStatus = ev("taxonomy", "UNKNOWN",
        "The encyclopedia spine could not be checked: " + resolved.errors.join(" "),
        "none");
    } else if (resolved.ok) {
      spineStatus = ev("taxonomy", "PASS",
        "Major Activity, Type, and Strategy exist in the encyclopedia with correct parentage.",
        resolved.resolved.encyclopedia.source || "EncyclopediaBridge");
    } else {
      spineStatus = ev("taxonomy", "FAIL",
        "Taxonomy spine check failed: " + resolved.errors.join(" "),
        "EncyclopediaBridge");
    }
    note(spineStatus);
    if (spineStatus === "UNKNOWN" || spineStatus === "NOT_CONNECTED") structuralUnknown = true;

    // Wallet: the wallet must exist, be at least CONNECTED, and list
    // the opportunity's network among its chains (when it records
    // chains at all). A wallet that merely holds the asset proves
    // nothing about the opportunity.
    var walletStatus;
    var WI = global.WalletIntelligence;
    if (!isNonEmptyString(ctx.walletId)) {
      walletStatus = ev("wallet", "UNKNOWN",
        "No walletId was supplied, so no wallet could be checked.",
        "none");
    } else if (!WI || typeof WI.getWallet !== "function") {
      walletStatus = ev("wallet", "UNKNOWN",
        "WalletIntelligence is not loaded, so wallet \"" + ctx.walletId + "\" was not checked.",
        "none");
    } else {
      var wallet = null;
      try { wallet = WI.getWallet(ctx.walletId); } catch (e) { wallet = null; }
      if (!wallet) {
        walletStatus = ev("wallet", "FAIL",
          "Wallet \"" + ctx.walletId + "\" was not found.",
          "WalletIntelligence registry");
      } else if (!walletAtLeast(wallet.state, "CONNECTED")) {
        walletStatus = ev("wallet", "FAIL",
          "Wallet \"" + ctx.walletId + "\" is " + wallet.state +
          ": a wallet must be at least CONNECTED for eligibility.",
          "WalletIntelligence registry");
      } else if (Array.isArray(wallet.chains) && wallet.chains.length > 0 &&
          wallet.chains.indexOf(op.networkRef.networkId) === -1) {
        walletStatus = ev("wallet", "FAIL",
          "Wallet \"" + ctx.walletId + "\" (" + wallet.state + ") does not list network \"" +
          op.networkRef.networkId + "\" among its chains.",
          "WalletIntelligence registry");
      } else if (Array.isArray(wallet.chains) && wallet.chains.length === 0) {
        walletStatus = ev("wallet", "UNKNOWN",
          "Wallet \"" + ctx.walletId + "\" is " + wallet.state +
          " but records no chains, so network support could not be confirmed.",
          "WalletIntelligence registry");
      } else {
        walletStatus = ev("wallet", "PASS",
          "Wallet \"" + ctx.walletId + "\" is " + wallet.state +
          " and lists network \"" + op.networkRef.networkId + "\".",
          "WalletIntelligence registry");
      }
    }
    note(walletStatus);

    // Amount: a supplied, finite, non-negative amount is evidence;
    // a missing amount is unknown, never zero.
    var amountStatus;
    if (ctx.amount === undefined || ctx.amount === null) {
      amountStatus = ev("amount", "UNKNOWN",
        "No amount was supplied, so no amount check could be performed.",
        "none");
    } else if (typeof ctx.amount !== "number" || !isFinite(ctx.amount) || ctx.amount < 0) {
      amountStatus = ev("amount", "FAIL",
        "Supplied amount is not a finite non-negative number: " + String(ctx.amount) + ".",
        "caller context");
    } else {
      amountStatus = ev("amount", "PASS",
        "Amount " + ctx.amount + " was supplied for the check.",
        "caller context");
    }
    note(amountStatus);

    // Protocol: a protocol name with a source is evidence; no
    // protocol recorded is missing evidence, not a pass.
    var protocolStatus = isNonEmptyString(op.protocolRef.name) &&
        isNonEmptyString(op.protocolRef.source) ?
      ev("protocol", "PASS",
        "Protocol \"" + op.protocolRef.name + "\" recorded with source \"" + op.protocolRef.source + "\".",
        op.protocolRef.source) :
      ev("protocol", "UNKNOWN",
        "No protocol is recorded for this opportunity, so protocol eligibility could not be checked.",
        "none");
    note(protocolStatus);

    // Capability: qualification requirements are strings, not
    // verified capabilities. No requirements recorded passes; any
    // recorded requirement is unverified evidence.
    var capabilityStatus = op.qualification.requirements.length === 0 ?
      ev("capability", "PASS",
        "No capability requirements are recorded for this opportunity.",
        "opportunity record") :
      ev("capability", "UNKNOWN",
        "Capability requirements are recorded (" +
        op.qualification.requirements.join("; ") +
        ") but were not verified against wallet evidence.",
        "opportunity record");
    note(capabilityStatus);

    // Access: KYC status supplied by the caller is the evidence.
    // A verified KYC status passes when the opportunity records no
    // restriction; a rejected/denied status fails; anything else is
    // unknown. Jurisdiction is recorded as context only — the
    // opportunity carries no jurisdiction allowlist to check it
    // against, so it is never guessed.
    if (isNonEmptyString(ctx.jurisdiction)) {
      ev("jurisdiction", "INFO",
        "Jurisdiction \"" + ctx.jurisdiction + "\" was supplied; no jurisdiction restriction is recorded on the opportunity, so it was not checked against one.",
        "caller context");
    }
    if (isNonEmptyString(ctx.accountId)) {
      ev("account", "INFO",
        "Account \"" + ctx.accountId + "\" was supplied as context; no account registry is loaded, so it was not checked.",
        "caller context");
    }
    var kyc = typeof ctx.kycStatus === "string" ? ctx.kycStatus.trim().toUpperCase() : "";
    var accessStatus;
    if (kyc === "VERIFIED") {
      accessStatus = ev("access", "PASS",
        "KYC status VERIFIED was supplied and the opportunity records no access restriction.",
        "caller context");
    } else if (kyc === "REJECTED" || kyc === "DENIED" || kyc === "BLOCKED" || kyc === "FAILED") {
      accessStatus = ev("access", "FAIL",
        "KYC status " + kyc + " was supplied: access is not eligible.",
        "caller context");
    } else {
      accessStatus = ev("access", "UNKNOWN",
        "No usable KYC status was supplied, so access could not be checked.",
        "none");
    }
    note(accessStatus);

    // Liquidity: a sourced liquidity record is evidence; anything
    // else is missing evidence.
    var liquidityStatus = hasSourcedValue(op.liquidity) ?
      ev("liquidity", "PASS",
        "Liquidity " + op.liquidity.value + " " + op.liquidity.currency +
        " recorded with source \"" + op.liquidity.source + "\".",
        op.liquidity.source) :
      ev("liquidity", "UNKNOWN",
        "No sourced liquidity is recorded for this opportunity.",
        "none");
    note(liquidityStatus);

    // Fees: every recorded cost must be sourced. Any UNKNOWN cost,
    // or no costs at all, is missing fee evidence.
    var feesStatus;
    if (op.costs.length === 0) {
      feesStatus = ev("fees", "UNKNOWN",
        "No costs are recorded for this opportunity, so fees could not be checked.",
        "none");
    } else {
      var unknownFeeKinds = [];
      op.costs.forEach(function (c) {
        if (c.value === undefined) unknownFeeKinds.push(c.kind);
      });
      feesStatus = unknownFeeKinds.length === 0 ?
        ev("fees", "PASS",
          "All " + op.costs.length + " recorded cost(s) are sourced with currency, source, and checkedAt.",
          "opportunity record") :
        ev("fees", "UNKNOWN",
          "Fee evidence is incomplete: UNKNOWN cost kind(s): " + unknownFeeKinds.join(", ") + ".",
          "opportunity record");
    }
    note(feesStatus);

    // Risk: recorded risk dimensions are evidence. When
    // RiskIntelligence is loaded it is named as the risk source;
    // when it is absent that is recorded too — risk is never
    // assessed from nothing.
    var RI = global.RiskIntelligence;
    var riskStatus;
    if (op.risks.length === 0) {
      riskStatus = ev("risk", "UNKNOWN",
        "No risk dimensions are recorded for this opportunity" +
        (RI ? "." : " and RiskIntelligence is not loaded."),
        RI ? "RiskIntelligence" : "none");
    } else {
      riskStatus = ev("risk", "PASS",
        op.risks.length + " risk dimension(s) recorded: " +
        op.risks.map(function (r) { return r.dimension; }).join("; ") +
        (RI ? " (RiskIntelligence loaded)." : " (RiskIntelligence not loaded; recorded dimensions used)."),
        RI ? "RiskIntelligence" : "opportunity record");
    }
    note(riskStatus);

    // Freshness: only fresh data passes. Aging, stale, or unknown
    // age is missing current evidence, not a failure of the
    // opportunity itself.
    var freshnessStatus = op.freshness === "fresh" ?
      ev("freshness", "PASS",
        "Opportunity data is fresh (checked within " + FRESH_DAYS + " days).",
        "opportunity record") :
      ev("freshness", "UNKNOWN",
        "Opportunity data freshness is \"" + op.freshness + "\": current evidence is missing.",
        "opportunity record");
    note(freshnessStatus);

    // Verification: only VERIFIED or LIVE passes. Anything else is
    // unproven, never a pass.
    var verificationStatus = (op.verificationStatus === "VERIFIED" ||
        op.verificationStatus === "LIVE") ?
      ev("verification", "PASS",
        "Opportunity verification status is " + op.verificationStatus + ".",
        "opportunity record") :
      ev("verification", "UNKNOWN",
        "Opportunity verification status is " + op.verificationStatus + ": not verified.",
        "opportunity record");
    note(verificationStatus);

    // Verdict.
    var reasons = [];
    var eligibility;
    if (anyFail) {
      eligibility = "NOT_ELIGIBLE";
      evidence.forEach(function (e) {
        if (e.status === "FAIL") {
          reasons.push("Check \"" + e.check + "\" failed: " + e.detail);
        }
      });
    } else if (structuralUnknown) {
      eligibility = "UNKNOWN";
      evidence.forEach(function (e) {
        if ((e.check === "network" || e.check === "asset" || e.check === "taxonomy") &&
            (e.status === "UNKNOWN" || e.status === "NOT_CONNECTED")) {
          reasons.push("Check \"" + e.check + "\" has no evidence: " + e.detail);
        }
      });
      if (!reasons.length) {
        reasons.push("A required structural check has no evidence, so eligibility is UNKNOWN (never guessed).");
      }
    } else if (anyUnknown) {
      eligibility = "POSSIBLE";
      evidence.forEach(function (e) {
        if (e.status === "UNKNOWN" || e.status === "NOT_CONNECTED") {
          reasons.push("Check \"" + e.check + "\" has no evidence: " + e.detail);
        }
      });
      reasons.push("The opportunity is structurally applicable (network, asset, and taxonomy match), but eligibility evidence is incomplete.");
    } else {
      eligibility = "ELIGIBLE";
    }

    return { opportunityId: op.id, checkedAt: checkedAt,
      eligibility: eligibility, reasons: reasons, evidence: evidence };
  }

  // ---- Simulator integration (§99-19) -------------------------------------
  // A simulation is a SIMULATION record, never an execution and never
  // real accounting. Costs come from CostIntelligence when it is
  // loaded (defensive: only called when a function exists, inside a
  // guard), else UNKNOWN — never zero, never invented. Risk comes
  // from RiskIntelligence when loaded, else UNKNOWN. Prices come from
  // the opportunity's recorded prices or UNKNOWN, never invented. A
  // simulated gain never appears in real Earnings/Positions
  // accounting: the record carries accountingScope
  // "SIMULATION_ONLY". Creating a simulation advances the
  // opportunity's pipeline to SIMULATED — the only way that stage is
  // reached.

  function unknownCostKinds(op) {
    var sourced = {};
    var unknown = [];
    (op.costs || []).forEach(function (c) {
      if (c && c.value !== undefined) sourced[normaliseKey(c.kind)] = true;
      else if (c && c.kind) unknown.push(String(c.kind));
    });
    COST_KINDS.forEach(function (kind) {
      if (!sourced[normaliseKey(kind)] && unknown.indexOf(kind) === -1) {
        unknown.push(kind);
      }
    });
    return unknown;
  }

  function sourcedCostValues(op) {
    var byKind = {};
    (op.costs || []).forEach(function (c) {
      if (c && c.kind && c.value !== undefined) {
        byKind[String(c.kind)] = { value: c.value, currency: c.currency || "" };
      }
    });
    return byKind;
  }

  function simulateOpportunity(opportunityId, options) {
    var opts = (options && typeof options === "object") ? options : {};
    var idx = findStoredIndex(opportunityId);
    if (idx === -1) {
      return { ok: false, reason: "UNKNOWN_OPPORTUNITY",
        message: "No opportunity with id " + String(opportunityId) + "." };
    }
    var stored = opportunities[idx];
    var op = normalizeOpportunity(stored);
    var stamp = nowIso();
    var assumptions = (opts.assumptions && typeof opts.assumptions === "object") ?
      clone(opts.assumptions) : {};
    var inputs = {
      opportunityId: op.id,
      assetRef: clone(op.assetRef),
      networkRef: clone(op.networkRef),
      strategyId: op.strategyId,
      amount: (assumptions.amount !== undefined && assumptions.amount !== null) ?
        assumptions.amount : "UNKNOWN",
      currency: typeof assumptions.currency === "string" ? assumptions.currency : "UNKNOWN"
    };

    // Prices: recorded prices only, or UNKNOWN. Never invented.
    var sourcedPrices = (op.prices || []).filter(function (p) {
      return p && p.value !== undefined;
    });
    var pricesUsed = sourcedPrices.length > 0 ?
      { state: "SOURCED", source: "opportunity record",
        prices: sourcedPrices.map(function (p) {
          return { label: p.label, value: p.value, currency: p.currency,
            source: p.source, checkedAt: p.checkedAt };
        }) } :
      { state: "UNKNOWN", source: "none",
        detail: "No sourced price is recorded on this opportunity; no price was invented." };

    // Costs: CostIntelligence when loaded, else UNKNOWN.
    var unknowns = [];
    var costsUsed;
    var CI = global.CostIntelligence;
    if (CI && typeof CI === "object") {
      var fromCI = null;
      try {
        if (typeof CI.getCostsForOpportunity === "function") {
          fromCI = CI.getCostsForOpportunity(opportunityId);
        } else if (typeof CI.getCosts === "function") {
          fromCI = CI.getCosts(opportunityId);
        } else if (typeof CI.estimateCosts === "function") {
          fromCI = CI.estimateCosts(opportunityId);
        }
      } catch (e) { fromCI = null; }
      if (fromCI !== null && fromCI !== undefined) {
        costsUsed = { state: "SOURCED", source: "CostIntelligence", costs: clone(fromCI) };
      } else {
        costsUsed = { state: "SOURCED", source: "CostIntelligence loaded (no cost function found); opportunity record",
          costs: clone(op.costs) };
      }
    } else {
      costsUsed = { state: "UNKNOWN", source: "none (CostIntelligence is not loaded)",
        detail: "CostIntelligence is not loaded, so no cost was assumed: costs are UNKNOWN, never zero.",
        kinds: COST_KINDS.slice() };
      unknownCostKinds(op).forEach(function (k) {
        unknowns.push("cost: " + k);
      });
    }
    if (costsUsed.state === "SOURCED" &&
        costsUsed.source.indexOf("opportunity record") !== -1) {
      // The fallback source is the opportunity record, so its
      // unknown kinds stay unknown and can be listed exactly.
      unknownCostKinds(op).forEach(function (k) {
        unknowns.push("cost: " + k);
      });
    }
    if (costsUsed.state === "SOURCED" &&
        costsUsed.source.indexOf("opportunity record") === -1) {
      // Costs came from CostIntelligence, whose return shape is not
      // known here: coverage against the canonical cost kinds cannot
      // be verified, so costs stay an unknown in this record rather
      // than being assumed complete.
      unknowns.push("costs (CostIntelligence coverage not verified against cost kinds)");
    }

    // Risk: RiskIntelligence when loaded, else UNKNOWN.
    var risk;
    var RI = global.RiskIntelligence;
    if (RI && typeof RI === "object") {
      var fromRI = null;
      try {
        if (typeof RI.getRiskForOpportunity === "function") {
          fromRI = RI.getRiskForOpportunity(opportunityId);
        } else if (typeof RI.assessOpportunity === "function") {
          fromRI = RI.assessOpportunity(opportunityId);
        } else if (typeof RI.getRiskAssessment === "function") {
          fromRI = RI.getRiskAssessment(opportunityId);
        }
      } catch (e) { fromRI = null; }
      if (fromRI !== null && fromRI !== undefined) {
        risk = { state: "SOURCED", source: "RiskIntelligence", assessment: clone(fromRI) };
      } else {
        risk = { state: "RECORDED", source: "RiskIntelligence loaded (no assessment function found); opportunity record",
          dimensions: op.risks.map(function (r) { return r.dimension; }) };
      }
    } else {
      risk = { state: "UNKNOWN", source: "none (RiskIntelligence is not loaded)",
        detail: "RiskIntelligence is not loaded, so no risk assessment was performed." };
      unknowns.push("risk");
    }

    if (pricesUsed.state === "UNKNOWN") unknowns.push("prices");
    if (!hasSourcedValue(op.expectedGross)) unknowns.push("expected gross value");

    // Expected outcome: a number only when the gross is sourced, all
    // cost kinds are sourced, and every currency matches the gross
    // currency — and only when the costs used here are verifiable
    // against the opportunity record. When CostIntelligence is
    // absent (costs UNKNOWN) or its coverage cannot be verified,
    // the outcome is UNKNOWN — never a fabricated gain.
    var expectedOutcome = "UNKNOWN";
    if (costsUsed.state === "SOURCED" &&
        costsUsed.source.indexOf("opportunity record") !== -1) {
      var net = expectedNet(opportunityId);
      if (net && net.state === "COMPUTED" && typeof net.net === "number") {
        expectedOutcome = { net: net.net, currency: net.currency,
          gross: net.gross, costs: net.costs.byKind,
          note: "Simulated net (gross minus known costs). SIMULATION ONLY — not real earnings." };
      }
    }

    var simulation = {
      mode: "SIMULATION",
      simulatedAt: stamp,
      timestamp: stamp,
      opportunityId: op.id,
      inputs: inputs,
      assumptions: assumptions,
      pricesUsed: pricesUsed,
      costsUsed: costsUsed,
      unknowns: unknowns,
      risk: risk,
      expectedOutcome: expectedOutcome,
      executed: false,
      accountingScope: "SIMULATION_ONLY"
    };
    simulations.push(clone(simulation));

    // The pipeline advances to SIMULATED only when a simulation
    // record is created — here. Never backwards: if the pipeline is
    // already past SIMULATED, it stays where it is.
    var currentStage = PIPELINE_INDEX[stored.pipelineState || "DISCOVERED"];
    if (currentStage < PIPELINE_INDEX.SIMULATED) {
      var from = stored.pipelineState || "DISCOVERED";
      stored.pipelineState = "SIMULATED";
      appendPipelineHistory(stored, from, "SIMULATED", "simulateOpportunity",
        "Simulation record created.", "simulation created");
    }

    return { ok: true, simulation: clone(simulation) };
  }

  function listSimulations(opportunityId) {
    return simulations.filter(function (s) {
      return opportunityId === undefined || s.opportunityId === opportunityId;
    }).map(function (s) { return clone(s); });
  }

  // ---- Expected net ---------------------------------------------------------
  // EXPECTED GROSS minus every known cost kind (gas, protocol fee,
  // swap/trading fees, slippage, bridge cost, borrow cost, funding
  // cost, performance fee, infrastructure/API/model cost, exit cost,
  // other). Unknown is never silently zero: unknownCosts lists the
  // UNKNOWN kinds, and net is null while any required cost — or the
  // gross — is UNKNOWN. A currency mismatch also leaves net null:
  // no conversion rate is ever invented.

  function expectedNet(opportunityId) {
    var idx = findStoredIndex(opportunityId);
    if (idx === -1) {
      return { opportunityId: String(opportunityId), gross: "UNKNOWN",
        costs: { byKind: {} }, unknownCosts: COST_KINDS.slice(),
        net: null, state: "UNKNOWN",
        note: "Opportunity \"" + String(opportunityId) + "\" was not found: no net value could be computed." };
    }
    var op = normalizeOpportunity(opportunities[idx]);
    var gross = hasSourcedValue(op.expectedGross) ? op.expectedGross.value : "UNKNOWN";
    var currency = hasSourcedValue(op.expectedGross) ? op.expectedGross.currency : null;

    var byKind = {};
    var unknownCosts = [];
    var currencyMismatch = false;
    var total = 0;
    var sourcedByKind = sourcedCostValues(op);
    COST_KINDS.forEach(function (kind) {
      var entry = sourcedByKind[kind];
      if (entry) {
        byKind[kind] = entry.value;
        if (currency !== null && entry.currency && entry.currency !== currency) {
          currencyMismatch = true;
        }
        total += entry.value;
      } else {
        unknownCosts.push(kind);
      }
    });
    // Non-canonical sourced costs are known costs too: they count.
    Object.keys(sourcedByKind).forEach(function (kind) {
      if (COST_KINDS.indexOf(kind) === -1) {
        byKind[kind] = sourcedByKind[kind].value;
        if (currency !== null && sourcedByKind[kind].currency &&
            sourcedByKind[kind].currency !== currency) {
          currencyMismatch = true;
        }
        total += sourcedByKind[kind].value;
      }
    });
    // UNKNOWN cost entries with a non-canonical kind are unknown too.
    (op.costs || []).forEach(function (c) {
      if (c && c.kind && c.value === undefined &&
          COST_KINDS.indexOf(String(c.kind)) === -1 &&
          unknownCosts.indexOf(String(c.kind)) === -1) {
        unknownCosts.push(String(c.kind));
      }
    });

    var net = null;
    var state = "UNKNOWN";
    var note = "";
    if (gross === "UNKNOWN") {
      note = "Expected gross value is UNKNOWN, so no net value can be computed.";
    } else if (unknownCosts.length > 0) {
      note = "Cost kind(s) UNKNOWN (" + unknownCosts.join(", ") +
        "): an unknown cost is never treated as zero, so no net value can be computed.";
    } else if (currencyMismatch) {
      note = "A cost currency differs from the gross currency (" + currency +
        "): no conversion rate is invented, so no net value can be computed.";
    } else {
      net = gross - total;
      state = "COMPUTED";
      note = "Expected net = expected gross (" + gross + " " + currency +
        ") minus known costs (" + total + " " + currency + ").";
    }

    return { opportunityId: op.id, gross: gross, currency: currency,
      costs: { byKind: byKind }, unknownCosts: unknownCosts,
      net: net, state: state, note: note };
  }

  var api = {
    RISK_DIMENSIONS: FALLBACK_RISK_DIMENSIONS,
    VERIFICATION_STATES: FALLBACK_VERIFICATION_STATES,
    FRESHNESSES: FRESHNESSES,
    FORBIDDEN_RETURN_FIELDS: FORBIDDEN_RETURN_FIELDS,
    DEFAULT_MAX_AGE_DAYS: DEFAULT_MAX_AGE_DAYS,
    PIPELINE_STATES: PIPELINE_STATES,
    ELIGIBILITY_STATES: ELIGIBILITY_STATES,
    COST_KINDS: COST_KINDS,
    validateOpportunity: validateOpportunity,
    validateCost: validateCost,
    validateRisk: validateRisk,
    validateSourcedAmount: validateSourcedAmount,
    validatePrice: validatePrice,
    normalizeOpportunity: normalizeOpportunity,
    classifyFreshness: classifyFreshness,
    freshnessLabel: freshnessLabel,
    listOpportunities: listOpportunities,
    getOpportunity: getOpportunity,
    countOpportunities: countOpportunities,
    addOpportunity: addOpportunity,
    resolveOpportunity: resolveOpportunity,
    assignWorker: assignWorker,
    workerStatus: workerStatus,
    blankOpportunity: blankOpportunity,
    pipelineStates: pipelineStates,
    getPipeline: getPipeline,
    canAdvancePipeline: canAdvancePipeline,
    advancePipeline: advancePipeline,
    recordGrossEstimate: recordGrossEstimate,
    checkEligibility: checkEligibility,
    simulateOpportunity: simulateOpportunity,
    listSimulations: listSimulations,
    expectedNet: expectedNet
  };

  global.OpportunityIntelligence = api;
  return api;
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
