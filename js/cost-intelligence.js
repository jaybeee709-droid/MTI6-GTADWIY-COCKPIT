/* MTI6-GTADWIY-COCKPIT — Cost Intelligence foundation (continuous campaign,
 * Crypto spec C2, §99-9)
 *
 * The canonical Cost Intelligence interface: cost kinds, cost records,
 * cost estimates for an opportunity / action, and expected net value
 * (expected gross value minus known costs).
 *
 * RECORD-KEEPING AND COMPUTATION ONLY:
 *   - No financial execution, no wallet signing, no trades, no
 *     staking, no lending, no bridging, no claims, no cash-out.
 *   - No network calls, no live prices, no conversion rates.
 *   - No storage: records live only in memory for the session.
 *   - No secrets: secret-looking fields are rejected, never stored.
 *   - No fabricated amounts: a figure is KNOWN only with a sourced
 *     value; an UNKNOWN cost has value null — never 0. UNKNOWN is
 *     never treated as zero in any total.
 *
 * Truth rules (from js/truth.js and js/star-accountant.js):
 *   - Every cost carries a state: "KNOWN" only with a sourced value
 *     (finite number >= 0, currency, source, checkedAt); "ESTIMATED"
 *     only with the same plus an explicit { estimated: true, basis }
 *     note; otherwise "UNKNOWN" with value null and currency null.
 *   - Amounts in different currencies are never added together:
 *     totals refuse to compute across mixed currencies because no
 *     conversion rates are held. A mixed-currency total is PARTIAL
 *     with a note, never a mixed-currency sum.
 *   - expectedNet() computes EXPECTED GROSS VALUE minus all KNOWN
 *     costs = EXPECTED NET VALUE, and only when the gross and every
 *     required cost kind are KNOWN in one currency. Otherwise the net
 *     is null with reason "INSUFFICIENT_DATA" — never a fabricated
 *     number.
 *
 * Relationship to js/star-accountant.js (never duplicated):
 *   - The accountant keeps ledger buckets and sums them into
 *     totalCosts() / netResult(). CostIntelligence does not write the
 *     accountant ledger and does not re-implement it.
 *   - The accountant's single generic "fees" bucket does not
 *     distinguish PROTOCOL_FEE, TRADING_SWAP_FEE and
 *     PERFORMANCE_FEE; CostIntelligence keeps those kinds distinct.
 *   - ACCOUNTANT_BUCKET_MAP records, for reference only, which
 *     accountant bucket each cost kind corresponds to where one
 *     exists. EXIT_COST and OTHER have no accountant bucket.
 *
 * Loadable in a bare vm context with no DOM and no network. Vanilla
 * JS only, one global: CostIntelligence.
 */
var CostIntelligence = (function () {
  "use strict";

  var globalScope = (typeof globalThis !== "undefined") ? globalThis : null;

  function truth() {
    return (globalScope && globalScope.Truth) || null;
  }

  // ---- Cost kinds (closed set, exact spec vocabulary) ----------------
  var COST_KINDS = ["NETWORK_GAS_COST", "PROTOCOL_FEE", "TRADING_SWAP_FEE",
    "SLIPPAGE", "BORROW_COST", "FUNDING_COST", "BRIDGE_COST",
    "PERFORMANCE_FEE", "INFRASTRUCTURE_COST", "EXIT_COST", "OTHER",
    "UNKNOWN"];

  var COST_STATES = ["KNOWN", "UNKNOWN", "ESTIMATED"];

  var KIND_LABELS = {
    NETWORK_GAS_COST: "Network gas cost",
    PROTOCOL_FEE: "Protocol fee",
    TRADING_SWAP_FEE: "Trading / swap fee",
    SLIPPAGE: "Slippage",
    BORROW_COST: "Borrow cost",
    FUNDING_COST: "Funding cost",
    BRIDGE_COST: "Bridge cost",
    PERFORMANCE_FEE: "Performance fee",
    INFRASTRUCTURE_COST: "Infrastructure cost",
    EXIT_COST: "Exit cost",
    OTHER: "Other cost",
    UNKNOWN: "Unknown cost"
  };

  var KIND_DESCRIPTIONS = {
    NETWORK_GAS_COST: "The network transaction (gas) fee paid to execute an action on a network.",
    PROTOCOL_FEE: "A fee charged by the protocol or application used, other than a trading or swap fee.",
    TRADING_SWAP_FEE: "The fee charged to trade or swap one asset for another.",
    SLIPPAGE: "The value lost when an execution settles at a worse price than expected.",
    BORROW_COST: "Interest or fees paid to borrow an asset or capital.",
    FUNDING_COST: "Funding payments made to hold a position, such as perpetual funding.",
    BRIDGE_COST: "The fee paid to move an asset across networks via a bridge.",
    PERFORMANCE_FEE: "A fee charged as a share of gains or performance.",
    INFRASTRUCTURE_COST: "The cost of the infrastructure used (API, model, hosting, tooling).",
    EXIT_COST: "The cost of exiting a position or action, other than the trading fee itself.",
    OTHER: "A cost that does not fit any other kind; describe it in the record note.",
    UNKNOWN: "A cost whose kind is not known; it is never treated as zero in any total."
  };

  // Accountant bucket each kind corresponds to, where one exists.
  // Reference only: CostIntelligence never writes the accountant ledger.
  var ACCOUNTANT_BUCKET_MAP = {
    NETWORK_GAS_COST: "gas",
    PROTOCOL_FEE: "fees",
    TRADING_SWAP_FEE: "fees",
    SLIPPAGE: "slippage",
    BORROW_COST: "borrowCost",
    FUNDING_COST: "fundingCost",
    BRIDGE_COST: "bridgeCost",
    PERFORMANCE_FEE: "fees",
    INFRASTRUCTURE_COST: "apiModelInfraCost"
  };

  var MAX_RECORDS = 500;

  // Secret-looking field detection, same list as KnowledgeModel and
  // StarAccountant.
  var SECRET_KEY_PARTS = ["seed", "mnemonic", "privatekey", "private_key",
    "apikey", "api_key", "apisecret", "password", "secret"];

  function isSecretKey(key) {
    var k = String(key || "").toLowerCase().replace(/[-_]/g, "");
    for (var i = 0; i < SECRET_KEY_PARTS.length; i++) {
      var part = SECRET_KEY_PARTS[i].replace(/[-_]/g, "");
      if (k.indexOf(part) !== -1) return true;
    }
    return false;
  }

  // ---- In-memory record store (never persisted) ----------------------
  var records = [];
  var nextId = 1;

  function parseDate(value) {
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim() !== "";
  }

  function isValidValue(v) {
    return typeof v === "number" && isFinite(v) && v >= 0;
  }

  function copyRecord(r) {
    var out = {};
    Object.keys(r).forEach(function (k) {
      if (k === "relatedTo" && r[k] && typeof r[k] === "object") {
        var rel = {};
        Object.keys(r[k]).forEach(function (rk) { rel[rk] = r[k][rk]; });
        out[k] = rel;
      } else {
        out[k] = r[k];
      }
    });
    return out;
  }

  function describeCostKind(kind) {
    if (COST_KINDS.indexOf(kind) === -1) return null;
    return { kind: kind, label: KIND_LABELS[kind],
      description: KIND_DESCRIPTIONS[kind] };
  }

  function isKnownKind(kind) {
    return COST_KINDS.indexOf(kind) !== -1;
  }

  // ---- Validation ------------------------------------------------------
  // Structural validation of a cost-record input (array of error
  // strings; empty means the input passes). The state rules:
  //   - KNOWN requires value (finite number >= 0) + currency +
  //     source + checkedAt.
  //   - ESTIMATED requires the same plus estimated === true and a
  //     non-empty basis note.
  //   - A cost without a sourced value is UNKNOWN (value null, never
  //     0); an UNKNOWN record is accepted, not rejected, with its
  //     missing-value reason recorded on the record.
  //   - Kind UNKNOWN can never carry a KNOWN or ESTIMATED value.
  function validateCost(input) {
    var errors = [];
    if (!input || typeof input !== "object") {
      return ["Cost record must be an object."];
    }
    Object.keys(input).forEach(function (k) {
      if (isSecretKey(k)) {
        errors.push("Secret-looking field not allowed in a cost record: " + k + ".");
      }
    });
    if (input.kind === undefined || COST_KINDS.indexOf(input.kind) === -1) {
      errors.push("Unknown cost kind: " + input.kind + ".");
    }
    if (input.costId !== undefined && !isNonEmptyString(input.costId)) {
      errors.push("Cost costId must be a non-empty string.");
    }
    if (input.state !== undefined && COST_STATES.indexOf(input.state) === -1) {
      errors.push("Unknown cost state: " + input.state + ".");
    }
    if (input.kind === "UNKNOWN" &&
        (input.state === "KNOWN" || input.state === "ESTIMATED")) {
      errors.push("A cost of kind UNKNOWN cannot be KNOWN or ESTIMATED.");
    }
    if (input.relatedTo !== undefined && input.relatedTo !== null) {
      if (typeof input.relatedTo !== "object") {
        errors.push("Cost relatedTo must be an object.");
      } else {
        ["opportunityId", "positionId", "assetId", "networkId",
          "protocolId"].forEach(function (f) {
          if (input.relatedTo[f] !== undefined &&
              !isNonEmptyString(input.relatedTo[f])) {
            errors.push("Cost relatedTo." + f + " must be a non-empty string.");
          }
        });
      }
    }
    if (input.note !== undefined && typeof input.note !== "string") {
      errors.push("Cost note must be a string.");
    }
    if (input.observedAt !== undefined && input.observedAt !== null &&
        !parseDate(input.observedAt)) {
      errors.push("Cost observedAt must be a parseable date.");
    }

    // State-specific value rules. An explicit state wins; without one,
    // a supplied finite value implies KNOWN, an estimated flag implies
    // ESTIMATED, and anything else is UNKNOWN (accepted, value null).
    var state = input.state;
    if (state === undefined) {
      if (input.estimated === true) state = "ESTIMATED";
      else if (typeof input.value === "number") state = "KNOWN";
      else state = "UNKNOWN";
    }
    if (state === "KNOWN" || state === "ESTIMATED") {
      if (typeof input.value !== "number") {
        errors.push("A " + state + " cost requires a numeric value.");
      } else if (!isFinite(input.value)) {
        errors.push("A " + state + " cost value must be finite.");
      } else if (input.value < 0) {
        errors.push("A cost value must not be negative.");
      }
      if (!isNonEmptyString(input.currency)) {
        errors.push("A " + state + " cost requires a currency.");
      }
      if (!isNonEmptyString(input.source)) {
        errors.push("A " + state + " cost requires a source.");
      }
      if (!parseDate(input.checkedAt)) {
        errors.push("A " + state + " cost requires a parseable checkedAt.");
      }
    }
    if (state === "ESTIMATED") {
      if (input.estimated !== true) {
        errors.push("An ESTIMATED cost requires estimated: true.");
      }
      if (!isNonEmptyString(input.basis)) {
        errors.push("An ESTIMATED cost requires a basis note.");
      }
    }
    if (state === "UNKNOWN" && typeof input.value === "number" &&
        input.value !== null) {
      // An explicitly UNKNOWN record must not smuggle a value in:
      // the stored value is always null. A supplied number is a
      // caller error, not a value to keep.
      errors.push("An UNKNOWN cost must not carry a value; omit the value or use state KNOWN or ESTIMATED.");
    }
    return errors;
  }

  // ---- Records ---------------------------------------------------------
  // Validates and stores a cost record. Returns
  // { accepted, record, errors }. A cost without a sourced value is
  // stored as UNKNOWN with value null and currency null — never 0 —
  // and the reason is recorded on the record.
  function recordCost(input) {
    var errors = validateCost(input || {});
    if (errors.length) {
      return { accepted: false, record: null, errors: errors };
    }
    var src = input || {};
    var state = src.state;
    if (state === undefined) {
      if (src.estimated === true) state = "ESTIMATED";
      else if (typeof src.value === "number") state = "KNOWN";
      else state = "UNKNOWN";
    }
    var costId = isNonEmptyString(src.costId)
      ? src.costId.trim() : "ci-" + (nextId++);
    for (var i = 0; i < records.length; i++) {
      if (records[i].costId === costId) {
        return { accepted: false, record: null,
          errors: ["Duplicate costId: " + costId + "."] };
      }
    }
    var relatedTo = null;
    if (src.relatedTo && typeof src.relatedTo === "object") {
      relatedTo = {};
      ["opportunityId", "positionId", "assetId", "networkId",
        "protocolId"].forEach(function (f) {
        if (isNonEmptyString(src.relatedTo[f])) {
          relatedTo[f] = src.relatedTo[f].trim();
        }
      });
      if (!Object.keys(relatedTo).length) relatedTo = null;
    }
    var record = {
      costId: costId,
      kind: src.kind,
      state: state,
      value: (state === "UNKNOWN") ? null : src.value,
      currency: (state === "UNKNOWN") ? null
        : (isNonEmptyString(src.currency) ? src.currency.trim() : null),
      source: isNonEmptyString(src.source) ? src.source.trim() : null,
      observedAt: src.observedAt !== undefined && src.observedAt !== null
        ? src.observedAt : null,
      checkedAt: (state === "UNKNOWN") ? null : src.checkedAt,
      estimated: state === "ESTIMATED",
      basis: state === "ESTIMATED" ? src.basis.trim() : null,
      relatedTo: relatedTo,
      note: typeof src.note === "string" ? src.note : null,
      reason: (state === "UNKNOWN")
        ? "No sourced value recorded; cost is UNKNOWN, never zero."
        : null
    };
    records.push(record);
    if (records.length > MAX_RECORDS) {
      records.splice(0, records.length - MAX_RECORDS);
    }
    return { accepted: true, record: copyRecord(record), errors: [] };
  }

  function getCost(costId) {
    for (var i = 0; i < records.length; i++) {
      if (records[i].costId === costId) return copyRecord(records[i]);
    }
    return null;
  }

  // Optional filter: { kind, opportunityId, positionId, assetId,
  // networkId, protocolId, state }. Returns copies, oldest first.
  function getCosts(filter) {
    var f = filter || {};
    return records.filter(function (r) {
      if (f.kind !== undefined && r.kind !== f.kind) return false;
      if (f.state !== undefined && r.state !== f.state) return false;
      if (f.opportunityId !== undefined &&
          (!r.relatedTo || r.relatedTo.opportunityId !== f.opportunityId)) {
        return false;
      }
      if (f.positionId !== undefined &&
          (!r.relatedTo || r.relatedTo.positionId !== f.positionId)) {
        return false;
      }
      if (f.assetId !== undefined &&
          (!r.relatedTo || r.relatedTo.assetId !== f.assetId)) {
        return false;
      }
      if (f.networkId !== undefined &&
          (!r.relatedTo || r.relatedTo.networkId !== f.networkId)) {
        return false;
      }
      if (f.protocolId !== undefined &&
          (!r.relatedTo || r.relatedTo.protocolId !== f.protocolId)) {
        return false;
      }
      return true;
    }).map(copyRecord);
  }

  function reset() {
    records = [];
    nextId = 1;
    return { reset: true, kinds: COST_KINDS.length, records: 0 };
  }

  // ---- Estimates -------------------------------------------------------
  // The latest record for a kind within a scope (opportunityId and/or
  // positionId, when given). A scoped estimate uses only records
  // linked to that scope; an unscoped estimate uses only records with
  // no scope link (relatedTo null) plus records linked to nothing in
  // particular. Records linked to a different scope never count.
  function latestForKind(kind, scope) {
    var found = null;
    records.forEach(function (r) {
      if (r.kind !== kind) return;
      if (scope.opportunityId !== undefined) {
        if (!r.relatedTo ||
            r.relatedTo.opportunityId !== scope.opportunityId) return;
      } else if (scope.positionId !== undefined) {
        if (!r.relatedTo ||
            r.relatedTo.positionId !== scope.positionId) return;
      } else {
        // Unscoped estimate: only records with no opportunity or
        // position link count; a cost linked to a specific scope
        // never leaks into a global estimate.
        if (r.relatedTo && (r.relatedTo.opportunityId !== undefined ||
            r.relatedTo.positionId !== undefined)) return;
      }
      found = r;
    });
    return found;
  }

  // estimateCosts({ opportunityId?, positionId?, kinds? })
  // kinds defaults to the full closed set. Returns
  // { byKind, total, unknownKinds, estimatedKinds, errors?, note? }.
  // The total sums KNOWN costs in ONE currency only. UNKNOWN kinds are
  // listed in unknownKinds and contribute nothing (never zero);
  // ESTIMATED kinds are listed in estimatedKinds and likewise
  // contribute nothing to the total. Mixed currencies among KNOWN
  // costs give total state PARTIAL with a note and value null — never
  // a mixed-currency sum.
  function estimateCosts(input) {
    var args = input || {};
    var kinds = args.kinds;
    if (kinds === undefined) kinds = COST_KINDS.slice();
    if (!Array.isArray(kinds)) {
      return { byKind: {}, total: { value: null, currency: null,
          state: "UNKNOWN", note: "kinds must be an array." },
        unknownKinds: [], estimatedKinds: [],
        errors: ["kinds must be an array."] };
    }
    var badKinds = kinds.filter(function (k) { return !isKnownKind(k); });
    if (badKinds.length) {
      return { byKind: {}, total: { value: null, currency: null,
          state: "UNKNOWN",
          note: "Unknown cost kind(s): " + badKinds.join(", ") + "." },
        unknownKinds: [], estimatedKinds: [],
        errors: ["Unknown cost kind(s): " + badKinds.join(", ") + "."] };
    }
    var scope = {};
    if (args.opportunityId !== undefined) scope.opportunityId = args.opportunityId;
    if (args.positionId !== undefined) scope.positionId = args.positionId;

    var byKind = {};
    var unknownKinds = [];
    var estimatedKinds = [];
    var knownEntries = [];
    kinds.forEach(function (kind) {
      var rec = latestForKind(kind, scope);
      if (!rec || rec.state === "UNKNOWN" || kind === "UNKNOWN") {
        byKind[kind] = { state: "UNKNOWN", value: null, currency: null,
          source: null };
        unknownKinds.push(kind);
      } else if (rec.state === "ESTIMATED") {
        byKind[kind] = { state: "ESTIMATED", value: rec.value,
          currency: rec.currency, source: rec.source, basis: rec.basis };
        estimatedKinds.push(kind);
      } else {
        byKind[kind] = { state: "KNOWN", value: rec.value,
          currency: rec.currency, source: rec.source };
        knownEntries.push(byKind[kind]);
      }
    });

    var total;
    if (!knownEntries.length) {
      total = { value: null, currency: null, state: "UNKNOWN",
        note: "No requested cost kind is KNOWN; no total can be computed." };
    } else {
      var currencies = [];
      knownEntries.forEach(function (e) {
        if (currencies.indexOf(e.currency) === -1) currencies.push(e.currency);
      });
      if (currencies.length > 1) {
        total = { value: null, currency: null, state: "PARTIAL",
          note: "KNOWN costs use more than one currency (" +
            currencies.join(", ") + "); no conversion rates are held, " +
            "so no total is computed." };
      } else {
        var sum = 0;
        knownEntries.forEach(function (e) { sum += e.value; });
        if (unknownKinds.length || estimatedKinds.length) {
          var missing = unknownKinds.concat(estimatedKinds);
          total = { value: sum, currency: currencies[0], state: "PARTIAL",
            note: "Total covers the KNOWN kinds only; not counted: " +
              missing.join(", ") + "." };
        } else {
          total = { value: sum, currency: currencies[0], state: "KNOWN",
            note: null };
        }
      }
    }
    return { byKind: byKind, total: total, unknownKinds: unknownKinds,
      estimatedKinds: estimatedKinds, errors: [] };
  }

  // ---- Expected net value ----------------------------------------------
  // expectedNet({ gross, costs, requiredKinds? })
  //   gross: { value, currency, source, checkedAt } or UNKNOWN
  //     (null, undefined, or { state: "UNKNOWN" } / value null).
  //   costs: either an estimateCosts() result ({ byKind, ... }) or an
  //     array of { kind, value, currency, state } entries.
  //   requiredKinds: kinds that must be KNOWN for a net to compute;
  //     defaults to the kinds present in the costs input.
  // Returns { gross, costs, unknownCosts, net, currency,
  //   state: "COMPUTED" | "INSUFFICIENT_DATA", reason? }.
  // Net = gross minus all KNOWN costs, in one currency only. When the
  // gross is UNKNOWN, or any required cost kind is UNKNOWN or
  // ESTIMATED, or currencies disagree, net is null with reason
  // "INSUFFICIENT_DATA" — never a fabricated number.
  function expectedNet(input) {
    var args = input || {};
    var grossIn = args.gross;
    var grossKnown = false;
    var gross = null;
    if (grossIn && typeof grossIn === "object" &&
        grossIn.state !== "UNKNOWN" && isValidValue(grossIn.value) &&
        isNonEmptyString(grossIn.currency) &&
        isNonEmptyString(grossIn.source) && parseDate(grossIn.checkedAt)) {
      grossKnown = true;
      gross = { value: grossIn.value, currency: grossIn.currency.trim(),
        source: grossIn.source.trim(), checkedAt: grossIn.checkedAt,
        state: "KNOWN" };
    }

    // Normalise the costs input into { kind, state, value, currency }
    // entries plus the unknown / estimated kind lists.
    var entries = [];
    var unknownCosts = [];
    var estimatedCosts = [];
    if (args.costs && typeof args.costs === "object" &&
        args.costs.byKind && typeof args.costs.byKind === "object") {
      Object.keys(args.costs.byKind).forEach(function (kind) {
        var e = args.costs.byKind[kind];
        entries.push({ kind: kind, state: e.state || "UNKNOWN",
          value: (typeof e.value === "number") ? e.value : null,
          currency: e.currency || null });
        if (e.state === "UNKNOWN" || !e.state) unknownCosts.push(kind);
        else if (e.state === "ESTIMATED") estimatedCosts.push(kind);
      });
      if (Array.isArray(args.costs.unknownKinds)) {
        args.costs.unknownKinds.forEach(function (k) {
          if (unknownCosts.indexOf(k) === -1) unknownCosts.push(k);
        });
      }
    } else if (Array.isArray(args.costs)) {
      args.costs.forEach(function (c) {
        if (!c || typeof c !== "object") return;
        var state = c.state || "UNKNOWN";
        entries.push({ kind: c.kind || "UNKNOWN", state: state,
          value: (typeof c.value === "number") ? c.value : null,
          currency: c.currency || null });
        if (state === "UNKNOWN") unknownCosts.push(c.kind || "UNKNOWN");
        else if (state === "ESTIMATED") estimatedCosts.push(c.kind || "UNKNOWN");
      });
    }

    var requiredKinds = Array.isArray(args.requiredKinds)
      ? args.requiredKinds.slice()
      : entries.map(function (e) { return e.kind; });
    // A required kind with no entry at all is unknown.
    requiredKinds.forEach(function (k) {
      var found = false;
      entries.forEach(function (e) { if (e.kind === k) found = true; });
      if (!found && unknownCosts.indexOf(k) === -1) unknownCosts.push(k);
    });

    function insufficient(reason) {
      return { gross: gross, costs: entries, unknownCosts: unknownCosts,
        estimatedCosts: estimatedCosts, net: null,
        currency: gross ? gross.currency : null,
        state: "INSUFFICIENT_DATA", reason: reason };
    }

    if (!grossKnown) {
      return insufficient("Gross value is UNKNOWN; expected net value " +
        "cannot be computed.");
    }
    var unknownRequired = requiredKinds.filter(function (k) {
      return unknownCosts.indexOf(k) !== -1;
    });
    if (unknownRequired.length) {
      return insufficient("Required cost kind(s) UNKNOWN: " +
        unknownRequired.join(", ") + "; expected net value cannot be computed.");
    }
    var estimatedRequired = requiredKinds.filter(function (k) {
      return estimatedCosts.indexOf(k) !== -1;
    });
    if (estimatedRequired.length) {
      return insufficient("Required cost kind(s) only ESTIMATED: " +
        estimatedRequired.join(", ") +
        "; expected net value cannot be computed from estimates.");
    }
    var badKinds = requiredKinds.filter(function (k) { return !isKnownKind(k); });
    if (badKinds.length) {
      return insufficient("Unknown required cost kind(s): " +
        badKinds.join(", ") + ".");
    }
    var knownEntries = entries.filter(function (e) {
      return e.state === "KNOWN" && isValidValue(e.value) &&
        isNonEmptyString(e.currency);
    });
    var currencies = [gross.currency];
    knownEntries.forEach(function (e) {
      if (currencies.indexOf(e.currency) === -1) currencies.push(e.currency);
    });
    if (currencies.length > 1) {
      return insufficient("Gross and costs use more than one currency (" +
        currencies.join(", ") + "); no conversion rates are held.");
    }
    var costSum = 0;
    knownEntries.forEach(function (e) { costSum += e.value; });
    return { gross: gross, costs: entries, unknownCosts: [],
      estimatedCosts: [], net: gross.value - costSum,
      currency: gross.currency, state: "COMPUTED", reason: null };
  }

  return {
    COST_KINDS: COST_KINDS.slice(),
    COST_STATES: COST_STATES.slice(),
    ACCOUNTANT_BUCKET_MAP: (function () {
      var out = {};
      Object.keys(ACCOUNTANT_BUCKET_MAP).forEach(function (k) {
        out[k] = ACCOUNTANT_BUCKET_MAP[k];
      });
      return out;
    })(),
    MAX_RECORDS: MAX_RECORDS,
    describeCostKind: describeCostKind,
    isKnownKind: isKnownKind,
    validateCost: validateCost,
    recordCost: recordCost,
    getCost: getCost,
    getCosts: getCosts,
    estimateCosts: estimateCosts,
    expectedNet: expectedNet,
    reset: reset,
    truthStates: function () {
      var t = truth();
      return (t && t.TRUTH_STATES) ? t.TRUTH_STATES.slice() : null;
    }
  };
})();
