/* MTI6-GTADWIY-COCKPIT — STAR Accountant foundation (continuous campaign)
 *
 * STAR's accounting / data foundation. RECORD-KEEPING ONLY:
 *   - No financial execution, no cash-out path, no wallet signing,
 *     no trades, no staking, no lending, no bridging, no claims.
 *   - No network calls, no live prices, no conversion rates.
 *   - No storage: the ledger lives only in memory for the session.
 *   - No secrets: secret-looking fields are rejected, never stored.
 *   - No fabricated amounts: a figure is KNOWN only with a sourced
 *     entry; the fresh ledger is ENTIRELY UNKNOWN.
 *
 * Truth rules (from js/truth.js and js/knowledge-model.js):
 *   - Every figure carries a state: "KNOWN" only with a sourced
 *     entry, otherwise "UNKNOWN". An UNKNOWN figure has value null
 *     and currency null — never a guessed number.
 *   - A VERIFIED claim survives only with a source AND a recordedAt
 *     timestamp. A VERIFIED claim without either is downgraded to
 *     UNVERIFIED with the reason recorded on the entry (the
 *     KnowledgeModel normalisation rule). The entry is still kept in
 *     the log, but it never makes a figure KNOWN.
 *   - Source + recordedAt are therefore required for a figure to
 *     become KNOWN: an entry missing either is logged but does not
 *     update its bucket. (They are enforced at the figure, not by
 *     rejecting the record outright — otherwise the downgrade rule
 *     could never fire.)
 *   - Currency is descriptive only. Amounts in different currencies
 *     are never added together: totals refuse to compute across
 *     mixed currencies because no conversion rates are held.
 *
 * Bucket semantics: each bucket holds ONE figure — the latest sourced
 * entry for that bucket supersedes the previous figure. The bounded
 * entry log (max 500, oldest dropped first) preserves the history;
 * totals sum across distinct cost buckets, never across entries.
 * netResult() is a pure computation (realizedResult minus totalCosts)
 * and does NOT write the netResult bucket: that bucket becomes KNOWN
 * only through its own sourced entry, like every other bucket.
 *
 * Wallet inputs (Wallet spec W9 / Crypto spec §99-16, additive):
 * recordWalletInput() accepts real wallet / account / position /
 * cost / transaction / cash-out / reinvestment inputs, kept in a
 * SEPARATE bounded log (max 500) — wallet inputs never write the
 * 18-bucket ledger, and the ledger, totalCosts(), netResult() and
 * the requestCashOut() refusal are untouched by them. A wallet input
 * is KNOWN only when it carries a finite value AND a non-empty
 * source AND a parseable checkedAt; otherwise it is stored with
 * state UNKNOWN and a stateNote naming what is missing — never an
 * invented amount. Recording a cash-out input is a record only:
 * it never executes a cash-out (requestCashOut() stays refused).
 * accountantInputsSummary() reports honest counts by kind with
 * KNOWN/UNKNOWN tallies; values are never totalled across inputs
 * (mixed currencies are never added; no conversion rates are held).
 *
 * Depends on js/truth.js only (for the verification vocabulary).
 * When Truth is absent (e.g. a bare vm test context) the module falls
 * back to its own closed verification-state list, so it still loads
 * and behaves identically. Loadable in a bare vm context with no DOM
 * and no network. Vanilla JS only, one global: StarAccountant.
 */
var StarAccountant = (function () {
  "use strict";

  var globalScope = (typeof globalThis !== "undefined") ? globalThis : null;

  function truth() {
    return (globalScope && globalScope.Truth) || null;
  }

  // ---- Buckets -------------------------------------------------------
  // Every ledger bucket. Cost buckets are the seven summed by
  // totalCosts(); the rest are capital / result / record buckets.
  var BUCKETS = ["startingCapital", "availableCapital", "reservedCapital",
    "deployedCapital", "grossGain", "grossLoss", "fees", "gas",
    "slippage", "bridgeCost", "borrowCost", "fundingCost",
    "apiModelInfraCost", "realizedResult", "unrealizedResult",
    "netResult", "reinvestment", "cashOut"];

  var COST_BUCKETS = ["fees", "gas", "slippage", "bridgeCost",
    "borrowCost", "fundingCost", "apiModelInfraCost"];

  var MAX_ENTRIES = 500;

  var CASH_OUT_REFUSAL =
    "External cash-out requires a later explicit owner authorization";

  // Verification states: Truth's list when loaded, else the same
  // closed list. "KNOWN" is a figure state, not a verification state.
  var FALLBACK_VERIFICATION_STATES = ["NOT_CONNECTED", "UNKNOWN",
    "UNVERIFIED", "STALE", "DISABLED", "UNAVAILABLE", "VERIFIED", "LIVE"];

  function verificationStates() {
    var t = truth();
    if (t && t.TRUTH_STATES) return t.TRUTH_STATES;
    return FALLBACK_VERIFICATION_STATES;
  }

  // Secret-looking field detection, same list as KnowledgeModel.
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

  // ---- Ledger state (in-memory only, never persisted) ----------------
  var ledger = {};
  var entries = [];
  var nextId = 1;

  // ---- Wallet inputs (separate log; never writes the ledger) ---------
  // Closed kind vocabulary (Wallet spec W9 / Crypto spec §99-16).
  var WALLET_INPUT_KINDS = ["wallet-balance", "position-value",
    "transaction-cost", "cash-out", "reinvestment", "realized-gain",
    "realized-loss", "fee", "gas"];

  var walletInputs = [];
  var nextWalletInputId = 1;

  function freshFigure() {
    return { value: null, currency: null, state: "UNKNOWN" };
  }

  function resetLedger() {
    ledger = {};
    BUCKETS.forEach(function (b) { ledger[b] = freshFigure(); });
  }
  resetLedger();

  function copyFigure(f) {
    return { value: f.value, currency: f.currency, state: f.state };
  }

  function copyEntry(e) {
    var out = {};
    Object.keys(e).forEach(function (k) { out[k] = e[k]; });
    return out;
  }

  function parseDate(value) {
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // ---- Validation / normalisation ------------------------------------
  // Structural validation, mirroring KnowledgeModel.validateKnowledgeEntry
  // (array of error strings; empty means the entry passes). Source and
  // recordedAt are NOT hard-rejection errors here: see the header note.
  // A VERIFIED claim missing them is downgraded by normalizeEntry()
  // instead, and an unsourced entry never makes a figure KNOWN.
  function validateEntry(entry) {
    var errors = [];
    if (!entry || typeof entry !== "object") {
      return ["Accountant entry must be an object."];
    }
    Object.keys(entry).forEach(function (k) {
      if (isSecretKey(k)) {
        errors.push("Secret-looking field not allowed in an accountant entry: " + k + ".");
      }
    });
    if (entry.kind === undefined || BUCKETS.indexOf(entry.kind) === -1) {
      errors.push("Unknown ledger bucket (kind): " + entry.kind + ".");
    }
    if (typeof entry.value !== "number" || !isFinite(entry.value)) {
      errors.push("Entry value must be a finite number.");
    }
    if (typeof entry.currency !== "string" || entry.currency.trim() === "") {
      errors.push("Entry currency must be a non-empty string.");
    }
    if (entry.verificationStatus !== undefined &&
        verificationStates().indexOf(entry.verificationStatus) === -1) {
      errors.push("Unknown verification status: " + entry.verificationStatus + ".");
    }
    if (entry.note !== undefined && typeof entry.note !== "string") {
      errors.push("Entry note must be a string.");
    }
    return errors;
  }

  // Enriched COPY of an entry. Never mutates its argument.
  // VERIFIED survives only with source + parseable recordedAt; without
  // either it is downgraded to UNVERIFIED with the reason recorded.
  function normalizeEntry(entry) {
    var out = copyEntry(entry);
    if (out.verificationStatus === undefined) out.verificationStatus = "UNVERIFIED";
    var source = (typeof out.source === "string") ? out.source.trim() : "";
    var hasTimestamp = !!parseDate(out.recordedAt);
    out.downgraded = false;
    out.downgradeReason = null;
    if (out.verificationStatus === "VERIFIED" && (!source || !hasTimestamp)) {
      var missing = [];
      if (!source) missing.push("source");
      if (!hasTimestamp) missing.push("recordedAt timestamp");
      out.verificationStatus = "UNVERIFIED";
      out.downgraded = true;
      out.downgradeReason = "VERIFIED claim downgraded to UNVERIFIED: missing " +
        missing.join(" and ") + ".";
    }
    return out;
  }

  // ---- Entries --------------------------------------------------------
  // Appends a validated entry to the bounded log. A sourced entry (with
  // a parseable recordedAt) supersedes its bucket's figure; an unsourced
  // entry is logged but leaves the figure UNKNOWN.
  function addEntry(entry) {
    var normalized = normalizeEntry(entry || {});
    var errors = validateEntry(normalized);
    if (errors.length) {
      return { accepted: false, entry: null, errors: errors,
        downgraded: !!normalized.downgraded,
        downgradeReason: normalized.downgradeReason };
    }
    var stored = copyEntry(normalized);
    stored.id = "sa-" + (nextId++);
    entries.push(stored);
    if (entries.length > MAX_ENTRIES) {
      entries.splice(0, entries.length - MAX_ENTRIES);
    }
    var source = (typeof stored.source === "string") ? stored.source.trim() : "";
    var hasTimestamp = !!parseDate(stored.recordedAt);
    if (source && hasTimestamp) {
      ledger[stored.kind] = {
        value: stored.value,
        currency: stored.currency.trim(),
        state: "KNOWN"
      };
    }
    return { accepted: true, entry: copyEntry(stored), errors: [],
      downgraded: !!stored.downgraded,
      downgradeReason: stored.downgradeReason };
  }

  function getFigure(kind) {
    if (BUCKETS.indexOf(kind) === -1) return null;
    return copyFigure(ledger[kind]);
  }

  function getLedger() {
    var out = {};
    BUCKETS.forEach(function (b) { out[b] = copyFigure(ledger[b]); });
    return out;
  }

  function getEntries() {
    return entries.map(copyEntry);
  }

  function reset() {
    resetLedger();
    entries = [];
    nextId = 1;
    walletInputs = [];
    nextWalletInputId = 1;
    return { reset: true, buckets: BUCKETS.length, entries: 0 };
  }

  // ---- Wallet inputs --------------------------------------------------
  // Structural validation for a wallet input (array of error strings;
  // empty means the input passes). Source and checkedAt are NOT
  // hard-rejection errors here: an input missing either is accepted
  // but stored UNKNOWN with a stateNote naming what is missing —
  // the same pattern as addEntry(), where an unsourced entry is
  // logged but never makes a figure KNOWN.
  function validateWalletInput(input) {
    var errors = [];
    if (!input || typeof input !== "object") {
      return ["Wallet input must be an object."];
    }
    Object.keys(input).forEach(function (k) {
      if (isSecretKey(k)) {
        errors.push("Secret-looking field not allowed in a wallet input: " + k + ".");
      }
    });
    if (typeof input.walletId !== "string" || input.walletId.trim() === "") {
      errors.push("walletId is required and must be a non-empty string.");
    }
    if (typeof input.accountId !== "string" || input.accountId.trim() === "") {
      errors.push("accountId is required and must be a non-empty string.");
    }
    if (input.positionId !== undefined && input.positionId !== null &&
        typeof input.positionId !== "string") {
      errors.push("positionId must be a string.");
    }
    if (WALLET_INPUT_KINDS.indexOf(input.kind) === -1) {
      errors.push("Unknown wallet input kind: " + input.kind + ".");
    }
    if (input.value !== undefined && input.value !== null &&
        (typeof input.value !== "number" || !isFinite(input.value))) {
      errors.push("Wallet input value must be a finite number.");
    }
    if (input.currency !== undefined && input.currency !== null &&
        (typeof input.currency !== "string" || input.currency.trim() === "")) {
      errors.push("Wallet input currency must be a non-empty string.");
    }
    if (input.note !== undefined && typeof input.note !== "string") {
      errors.push("Wallet input note must be a string.");
    }
    return errors;
  }

  function copyWalletInput(w) {
    var out = {};
    Object.keys(w).forEach(function (k) { out[k] = w[k]; });
    return out;
  }

  // Records a wallet / account / position input. Accepted inputs are
  // always stored in the bounded wallet-input log (max 500, oldest
  // dropped first), but the input is KNOWN only when it carries a
  // finite value AND a non-empty source AND a parseable checkedAt.
  // Anything missing leaves the input UNKNOWN with a stateNote naming
  // the missing piece — never an invented amount. Recording a
  // "cash-out" input is a record only; it never executes a cash-out.
  // Never mutates its argument; never writes the 18-bucket ledger.
  function recordWalletInput(input) {
    var data = (input && typeof input === "object") ? input : {};
    var errors = validateWalletInput(data);
    if (errors.length) {
      return { accepted: false, input: null, errors: errors };
    }
    var hasValue = typeof data.value === "number" && isFinite(data.value);
    var source = (typeof data.source === "string") ? data.source.trim() : "";
    var hasTimestamp = !!parseDate(data.checkedAt);
    var missing = [];
    if (!hasValue) missing.push("value");
    if (!source) missing.push("source");
    if (!hasTimestamp) missing.push("checkedAt timestamp");
    var state = (missing.length === 0) ? "KNOWN" : "UNKNOWN";
    var stateNote = null;
    if (state === "UNKNOWN") {
      stateNote = hasValue
        ? "Value stays UNKNOWN: missing " + missing.join(" and ") +
          " — a figure becomes KNOWN only with a sourced value and a checkedAt timestamp."
        : "No value recorded; nothing to make KNOWN.";
    }
    var stored = {
      id: "wai-" + (nextWalletInputId++),
      walletId: data.walletId.trim(),
      accountId: data.accountId.trim(),
      positionId: (typeof data.positionId === "string") ? data.positionId : null,
      kind: data.kind,
      value: hasValue ? data.value : null,
      currency: (typeof data.currency === "string" && data.currency.trim() !== "")
        ? data.currency.trim() : null,
      source: source || null,
      checkedAt: hasTimestamp ? new Date(data.checkedAt).toISOString() : null,
      state: state,
      stateNote: stateNote,
      note: (typeof data.note === "string") ? data.note : null
    };
    walletInputs.push(stored);
    if (walletInputs.length > MAX_ENTRIES) {
      walletInputs.splice(0, walletInputs.length - MAX_ENTRIES);
    }
    return { accepted: true, input: copyWalletInput(stored), errors: [] };
  }

  function getWalletInputs() {
    return walletInputs.map(copyWalletInput);
  }

  // Honest counts by kind with KNOWN/UNKNOWN tallies. Values are
  // never totalled across inputs: amounts in different currencies
  // are never added, and no conversion rates are held — so there is
  // no total amount anywhere in this summary, by design.
  function accountantInputsSummary() {
    var byKind = {};
    WALLET_INPUT_KINDS.forEach(function (k) {
      byKind[k] = { total: 0, known: 0, unknown: 0 };
    });
    var known = 0;
    var unknown = 0;
    walletInputs.forEach(function (w) {
      byKind[w.kind].total += 1;
      if (w.state === "KNOWN") { byKind[w.kind].known += 1; known += 1; }
      else { byKind[w.kind].unknown += 1; unknown += 1; }
    });
    return {
      total: walletInputs.length,
      known: known,
      unknown: unknown,
      byKind: byKind,
      note: "Counts only — values are never totalled across inputs " +
        "(mixed currencies are never added; no conversion rates are held)."
    };
  }

  // ---- Computation (pure functions over the ledger) -------------------
  function knownBuckets(list) {
    return list.filter(function (b) { return ledger[b].state === "KNOWN"; });
  }

  function unknownBuckets(list) {
    return list.filter(function (b) { return ledger[b].state !== "KNOWN"; });
  }

  function distinctCurrencies(list) {
    var seen = [];
    list.forEach(function (b) {
      var c = ledger[b].currency;
      if (c && seen.indexOf(c) === -1) seen.push(c);
    });
    return seen;
  }

  // Sums the cost buckets that are KNOWN. Never a guessed number:
  // UNKNOWN when no cost bucket is KNOWN, PARTIAL when only some are
  // KNOWN (value is the sum of the known ones only), and UNKNOWN when
  // the known buckets disagree on currency — no conversion is held.
  function totalCosts() {
    var known = knownBuckets(COST_BUCKETS);
    var unknown = unknownBuckets(COST_BUCKETS);
    if (!known.length) {
      return { state: "UNKNOWN", value: null, currency: null,
        knownBuckets: [], unknownBuckets: unknown,
        reason: "No cost bucket is KNOWN; no costs have been recorded." };
    }
    var currencies = distinctCurrencies(known);
    if (currencies.length > 1) {
      return { state: "UNKNOWN", value: null, currency: null,
        knownBuckets: known, unknownBuckets: unknown,
        reason: "Known cost buckets use more than one currency (" +
          currencies.join(", ") + "); no conversion rates are held." };
    }
    var sum = 0;
    known.forEach(function (b) { sum += ledger[b].value; });
    if (unknown.length) {
      return { state: "PARTIAL", value: sum, currency: currencies[0],
        knownBuckets: known, unknownBuckets: unknown,
        reason: "Only " + known.length + " of " + COST_BUCKETS.length +
          " cost buckets are KNOWN; the total covers the known ones only." };
    }
    return { state: "KNOWN", value: sum, currency: currencies[0],
      knownBuckets: known, unknownBuckets: [],
      reason: null };
  }

  // realizedResult minus totalCosts, only when ALL inputs are KNOWN
  // (realizedResult plus every cost bucket, all in one currency).
  // Otherwise UNKNOWN with the reason — never a guessed number.
  // Pure computation: it does not write the netResult bucket.
  function netResult() {
    var realized = ledger.realizedResult;
    if (realized.state !== "KNOWN") {
      return { state: "UNKNOWN", value: null, currency: null,
        reason: "realizedResult is UNKNOWN; net result cannot be computed." };
    }
    var costs = totalCosts();
    if (costs.state !== "KNOWN") {
      return { state: "UNKNOWN", value: null, currency: null,
        reason: "Total costs are " + costs.state + ": " + costs.reason };
    }
    if (realized.currency !== costs.currency) {
      return { state: "UNKNOWN", value: null, currency: null,
        reason: "realizedResult is in " + realized.currency +
          " but total costs are in " + costs.currency +
          "; no conversion rates are held." };
    }
    return { state: "KNOWN", value: realized.value - costs.value,
      currency: realized.currency, reason: null };
  }

  // Honest per-bucket report plus the derived totals. Nothing here
  // invents a figure: unknown buckets stay UNKNOWN.
  function summary() {
    var buckets = getLedger();
    var knownCount = 0;
    var unknownCount = 0;
    BUCKETS.forEach(function (b) {
      if (buckets[b].state === "KNOWN") knownCount++;
      else unknownCount++;
    });
    return {
      buckets: buckets,
      knownCount: knownCount,
      unknownCount: unknownCount,
      totalBuckets: BUCKETS.length,
      costs: totalCosts(),
      net: netResult(),
      entries: entries.length
    };
  }

  // ---- Cash-out: a RECORD only ---------------------------------------
  // There is no cash-out path in this build. Every request is refused
  // with the same answer, whatever arguments it is given, and no state
  // changes. The cashOut bucket can only ever hold a recorded figure
  // from a sourced entry, like any other bucket.
  function requestCashOut() {
    return { executed: false, resultState: "NOT_AUTHORIZED",
      reason: CASH_OUT_REFUSAL };
  }

  return {
    BUCKETS: BUCKETS.slice(),
    COST_BUCKETS: COST_BUCKETS.slice(),
    WALLET_INPUT_KINDS: WALLET_INPUT_KINDS.slice(),
    MAX_ENTRIES: MAX_ENTRIES,
    CASH_OUT_REFUSAL: CASH_OUT_REFUSAL,
    VERIFICATION_STATES: FALLBACK_VERIFICATION_STATES.slice(),
    validateEntry: validateEntry,
    normalizeEntry: normalizeEntry,
    addEntry: addEntry,
    getFigure: getFigure,
    getLedger: getLedger,
    getEntries: getEntries,
    validateWalletInput: validateWalletInput,
    recordWalletInput: recordWalletInput,
    getWalletInputs: getWalletInputs,
    accountantInputsSummary: accountantInputsSummary,
    totalCosts: totalCosts,
    netResult: netResult,
    summary: summary,
    requestCashOut: requestCashOut,
    reset: reset
  };
})();
