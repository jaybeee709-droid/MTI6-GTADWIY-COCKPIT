/* MTI6-GTADWIY-COCKPIT — Self-Healing: low-risk auto-recovery policy
 * (continuous development campaign; Master Bot Workforce spec, 06:05 EST
 * Nov 14, 2026)
 *
 * POLICY + RECORD layer only. This module performs NO network call, NO
 * provider switch, NO source disable, and NO silent repair. It decides
 * whether a low-risk recovery is allowed, performs the two state changes
 * it owns outright (marking its own transient record STALE, clearing its
 * own in-memory transient cache), and otherwise returns a DECISION record
 * for the owning system to execute. Every attempt — allowed, refused, or
 * decision-only — is appended to a bounded audit log.
 *
 * Allowed recovery actions (closed set; nothing else is recoverable
 * here):
 *   SAFE_READ_RETRY              — decision only; owning system retries
 *   APPROVED_FALLBACK_SWITCH     — decision only; needs an approval
 *                                  record naming the fallback
 *   MARK_STALE                   — performs the state change on this
 *                                  module's own transient record store
 *   INVALIDATE_TRANSIENT_CACHE   — clears entries from this module's
 *                                  own in-memory transient cache; needs
 *                                  an approval record naming the source
 *   DISABLE_FAILING_OPTIONAL_SOURCE — decision only; needs an approval
 *                                  record naming the source
 *
 * Forbidden repairs (closed set; ALWAYS rejected, never attempted):
 *   WALLET_PERMISSIONS, PRIVATE_KEY_HANDLING, SECURITY_POLICY,
 *   DB_SCHEMA, FINANCIAL_EXECUTION, TREASURY_LIMITS,
 *   PROVIDER_CREDENTIALS.
 *
 * Financial-target guard: any recovery action naming a financial target
 * (wallet, transaction, treasury, signing) is rejected with
 * FINANCIAL_TARGET_FORBIDDEN, even when the action itself is allowed.
 *
 * Circuit-breaker dependency: js/circuit-breakers.js does not exist yet
 * in staging (it may land in parallel). This module therefore interacts
 * with breakers as a RECORD REFERENCE ONLY — breakerStatus() reports
 * whether global.CircuitBreakers is loaded, and decision records carry
 * that status. This module never calls a breaker API and never blocks
 * on the breaker module. When js/circuit-breakers.js lands, the
 * coordinator may wire decision records into it; no change is needed
 * in this file to stay correct.
 *
 * Truth vocabulary: MARK_STALE uses Truth.TRUTH_STATES ("STALE") when
 * js/truth.js is loaded; otherwise it falls back to the literal "STALE"
 * state. Load order: js/truth.js, then js/self-healing.js.
 *
 * Pure policy/record code: no DOM, no network, no secrets, no storage,
 * no financial execution. One global: SelfHealing.
 */
(function (global) {
  "use strict";

  // ---- Closed vocabularies -------------------------------------------

  var ALLOWED_ACTIONS = [
    {
      id: "SAFE_READ_RETRY",
      label: "Safe read retry",
      description: "Retry a failed read once through the owning system. " +
        "Decision only: this module performs no network call.",
      risk: "LOW",
      requiresApproval: false
    },
    {
      id: "APPROVED_FALLBACK_SWITCH",
      label: "Approved fallback switch",
      description: "Switch to an already-approved fallback source. " +
        "Decision only: the owning system performs the switch. " +
        "Requires an approval record naming the fallback.",
      risk: "LOW",
      requiresApproval: true
    },
    {
      id: "MARK_STALE",
      label: "Mark stale",
      description: "Mark a record in this module's own transient record " +
        "store STALE, with a reason and timestamp. Performed here.",
      risk: "LOW",
      requiresApproval: false
    },
    {
      id: "INVALIDATE_TRANSIENT_CACHE",
      label: "Invalidate transient cache",
      description: "Clear entries from this module's own in-memory " +
        "transient cache. Performed here. Requires an approval record " +
        "naming the source whose cached entries are cleared.",
      risk: "LOW",
      requiresApproval: true
    },
    {
      id: "DISABLE_FAILING_OPTIONAL_SOURCE",
      label: "Disable failing optional source",
      description: "Disable a failing OPTIONAL source. Decision only: " +
        "the owning system performs the disable. Requires an approval " +
        "record naming the source.",
      risk: "LOW",
      requiresApproval: true
    }
  ];

  var FORBIDDEN_REPAIRS = [
    "WALLET_PERMISSIONS",
    "PRIVATE_KEY_HANDLING",
    "SECURITY_POLICY",
    "DB_SCHEMA",
    "FINANCIAL_EXECUTION",
    "TREASURY_LIMITS",
    "PROVIDER_CREDENTIALS"
  ];

  // Financial targets: any recovery action naming one of these is
  // rejected, even when the action itself is allowed. Substring match,
  // case-insensitive, against the target's id/name/type text.
  var FINANCIAL_TARGET_KEYWORDS = ["wallet", "transaction", "treasury",
    "signing"];

  var MAX_AUDIT_ENTRIES = 200;

  var STALE_STATE = "STALE";

  // ---- Small helpers ---------------------------------------------------

  function truth() { return global.Truth || null; }

  function staleState() {
    var t = truth();
    if (t && typeof t.isKnownTruthState === "function" &&
        t.isKnownTruthState("STALE")) {
      return "STALE";
    }
    return STALE_STATE;
  }

  function nowIso() {
    try { return new Date().toISOString(); } catch (e) { return ""; }
  }

  function targetText(target) {
    if (target === undefined || target === null) return "";
    if (typeof target === "string") return target;
    if (typeof target === "object") {
      var parts = [];
      ["id", "name", "type", "key", "source"].forEach(function (k) {
        if (typeof target[k] === "string" && target[k]) parts.push(target[k]);
      });
      return parts.join(" ");
    }
    return String(target);
  }

  function isFinancialTarget(target) {
    var text = targetText(target).toLowerCase();
    if (!text) return false;
    for (var i = 0; i < FINANCIAL_TARGET_KEYWORDS.length; i++) {
      if (text.indexOf(FINANCIAL_TARGET_KEYWORDS[i]) !== -1) return true;
    }
    return false;
  }

  function getAction(id) {
    for (var i = 0; i < ALLOWED_ACTIONS.length; i++) {
      if (ALLOWED_ACTIONS[i].id === id) return ALLOWED_ACTIONS[i];
    }
    return null;
  }

  function isAllowedAction(id) { return getAction(id) !== null; }

  function isForbiddenRepair(id) {
    return FORBIDDEN_REPAIRS.indexOf(id) !== -1;
  }

  function requiresApproval(id) {
    var a = getAction(id);
    return a ? a.requiresApproval : false;
  }

  // An approval record names the fallback/source being acted on and the
  // person or system that approved it. Accepted shapes:
  //   - a non-empty string (the approver's name)
  //   - an object with a non-empty approvedBy/approver, and, when it
  //     names a target/scope/fallback/source, that name must match the
  //     attempt's target (case-insensitive substring, either way).
  // Anything else is not an approval.
  function approvalIsValid(approval, target) {
    if (approval === undefined || approval === null) return false;
    if (typeof approval === "string") return approval.trim() !== "";
    if (typeof approval !== "object") return false;
    var approver = approval.approvedBy || approval.approver || "";
    if (typeof approver !== "string" || approver.trim() === "") return false;
    var named = approval.target || approval.scope || approval.fallback ||
      approval.source || "";
    if (typeof named === "string" && named.trim() !== "") {
      var t = targetText(target).toLowerCase();
      var n = named.toLowerCase();
      if (t && n !== t && t.indexOf(n) === -1 && n.indexOf(t) === -1) {
        return false;
      }
    }
    return true;
  }

  // ---- Audit log (bounded, FIFO) ---------------------------------------

  var auditLog = [];
  var auditSeq = 0;

  function audit(action, target, actor, reason, outcome) {
    auditSeq += 1;
    auditLog.push({
      seq: auditSeq,
      at: nowIso(),
      action: action === undefined || action === null ? "" : String(action),
      target: targetText(target),
      actor: actor === undefined || actor === null ? "" : String(actor),
      reason: reason,
      outcome: outcome
    });
    while (auditLog.length > MAX_AUDIT_ENTRIES) auditLog.shift();
  }

  function getAuditLog() {
    return auditLog.map(function (e) {
      return {
        seq: e.seq, at: e.at, action: e.action, target: e.target,
        actor: e.actor, reason: e.reason, outcome: e.outcome
      };
    });
  }

  // ---- Transient record store (owned by this module) -------------------
  // MARK_STALE is the only action that mutates records, and it only
  // ever touches records registered here. Nothing external is marked.

  var records = {};

  function registerRecord(id, record) {
    if (id === undefined || id === null || String(id) === "") return null;
    var key = String(id);
    var entry = (record && typeof record === "object") ? record : {};
    var stored = {};
    Object.keys(entry).forEach(function (k) { stored[k] = entry[k]; });
    stored.id = key;
    stored.state = stored.state || "UNKNOWN";
    records[key] = stored;
    return stored;
  }

  function getRecord(id) {
    if (id === undefined || id === null) return null;
    var r = records[String(id)];
    return r || null;
  }

  function listRecords() {
    return Object.keys(records).map(function (k) { return records[k]; });
  }

  // ---- Transient cache (owned by this module) --------------------------
  // INVALIDATE_TRANSIENT_CACHE only ever clears entries put here.

  var transientCache = {};

  function cachePut(key, value) {
    if (key === undefined || key === null || String(key) === "") return false;
    transientCache[String(key)] = value;
    return true;
  }

  function cacheGet(key) {
    if (key === undefined || key === null) return undefined;
    return transientCache[String(key)];
  }

  function cacheHas(key) {
    if (key === undefined || key === null) return false;
    return Object.prototype.hasOwnProperty.call(transientCache, String(key));
  }

  function listCacheKeys() { return Object.keys(transientCache); }

  function cacheSize() { return Object.keys(transientCache).length; }

  // ---- Circuit-breaker reference (record only — see header) -------------

  function breakerStatus() {
    if (global.CircuitBreakers &&
        typeof global.CircuitBreakers === "object") {
      return "LOADED";
    }
    return "NOT_LOADED";
  }

  // ---- attemptRecovery --------------------------------------------------
  //
  // attemptRecovery({action, target, reason, authorizedBy, approval})
  // Returns {attempted, recovered, reason} plus, on success, either a
  // `state` (for actions performed here) or a `decision` record (for
  // decision-only actions). Order of guards, fail-closed throughout:
  //   1. forbidden repair          -> FORBIDDEN_REPAIR (refused, logged)
  //   2. unknown action            -> UNKNOWN_ACTION (refused, logged)
  //   3. financial target          -> FINANCIAL_TARGET_FORBIDDEN (refused)
  //   4. missing required approval -> REQUIRES_APPROVAL (refused, logged)
  //   5. perform (MARK_STALE / INVALIDATE_TRANSIENT_CACHE) or record a
  //      decision (SAFE_READ_RETRY / APPROVED_FALLBACK_SWITCH /
  //      DISABLE_FAILING_OPTIONAL_SOURCE).

  function attemptRecovery(opts) {
    var o = (opts && typeof opts === "object") ? opts : {};
    var action = o.action === undefined || o.action === null ?
      "" : String(o.action);
    var target = o.target;
    var reason = o.reason === undefined || o.reason === null ?
      "" : String(o.reason);
    var actor = o.authorizedBy === undefined || o.authorizedBy === null ?
      "" : String(o.authorizedBy);

    // 1. Forbidden repairs are ALWAYS rejected, never attempted.
    if (isForbiddenRepair(action)) {
      audit(action, target, actor, reason, "REFUSED_FORBIDDEN");
      return {
        attempted: false,
        recovered: false,
        reason: "FORBIDDEN_REPAIR"
      };
    }

    // 2. Unknown actions are not recoverable by this module.
    var def = getAction(action);
    if (!def) {
      audit(action, target, actor, reason, "REFUSED_UNKNOWN_ACTION");
      return {
        attempted: false,
        recovered: false,
        reason: "UNKNOWN_ACTION"
      };
    }

    // 3. Financial targets are forbidden even for allowed actions.
    if (isFinancialTarget(target)) {
      audit(action, target, actor, reason, "REFUSED_FINANCIAL_TARGET");
      return {
        attempted: false,
        recovered: false,
        reason: "FINANCIAL_TARGET_FORBIDDEN"
      };
    }

    // 4. Approval-gated actions need a valid approval record.
    if (def.requiresApproval && !approvalIsValid(o.approval, target)) {
      audit(action, target, actor, reason, "REFUSED_REQUIRES_APPROVAL");
      return {
        attempted: false,
        recovered: false,
        reason: "REQUIRES_APPROVAL"
      };
    }

    // 5a. MARK_STALE — performed here, on this module's own record store.
    if (action === "MARK_STALE") {
      var key = targetText(target);
      var rec = getRecord(key);
      if (!rec) {
        audit(action, target, actor, reason, "REFUSED_RECORD_NOT_FOUND");
        return {
          attempted: false,
          recovered: false,
          reason: "RECORD_NOT_FOUND"
        };
      }
      rec.state = staleState();
      rec.staleReason = reason;
      rec.markedStaleAt = nowIso();
      audit(action, target, actor, reason, "MARKED_STALE");
      return {
        attempted: true,
        recovered: true,
        reason: "MARKED_STALE",
        state: rec.state,
        target: key
      };
    }

    // 5b. INVALIDATE_TRANSIENT_CACHE — performed here, on this module's
    // own in-memory cache. Target "ALL" clears the whole cache;
    // otherwise the target names one cache key.
    if (action === "INVALIDATE_TRANSIENT_CACHE") {
      var cleared = [];
      if (targetText(target) === "ALL") {
        cleared = listCacheKeys();
        transientCache = {};
      } else {
        var ckey = targetText(target);
        if (!cacheHas(ckey)) {
          audit(action, target, actor, reason, "REFUSED_CACHE_KEY_NOT_FOUND");
          return {
            attempted: false,
            recovered: false,
            reason: "CACHE_KEY_NOT_FOUND"
          };
        }
        delete transientCache[ckey];
        cleared = [ckey];
      }
      audit(action, target, actor, reason, "CACHE_INVALIDATED");
      return {
        attempted: true,
        recovered: true,
        reason: "CACHE_INVALIDATED",
        clearedKeys: cleared,
        target: targetText(target)
      };
    }

    // 5c. Decision-only actions: SAFE_READ_RETRY,
    // APPROVED_FALLBACK_SWITCH, DISABLE_FAILING_OPTIONAL_SOURCE.
    // The module performs no network call, no provider switch, and no
    // source disable. The owning system executes the decision.
    var decision = {
      action: action,
      target: targetText(target),
      state: "APPROVED_FOR_EXECUTION",
      executedBy: "owning-system",
      reason: reason,
      authorizedBy: actor,
      circuitBreaker: breakerStatus(),
      at: nowIso()
    };
    audit(action, target, actor, reason, "DECISION_RECORDED");
    return {
      attempted: true,
      recovered: false,
      reason: "DECISION_RECORDED",
      decision: decision
    };
  }

  global.SelfHealing = {
    ALLOWED_ACTIONS: ALLOWED_ACTIONS,
    FORBIDDEN_REPAIRS: FORBIDDEN_REPAIRS,
    FINANCIAL_TARGET_KEYWORDS: FINANCIAL_TARGET_KEYWORDS,
    MAX_AUDIT_ENTRIES: MAX_AUDIT_ENTRIES,
    getAction: getAction,
    isAllowedAction: isAllowedAction,
    isForbiddenRepair: isForbiddenRepair,
    requiresApproval: requiresApproval,
    isFinancialTarget: isFinancialTarget,
    attemptRecovery: attemptRecovery,
    registerRecord: registerRecord,
    getRecord: getRecord,
    listRecords: listRecords,
    cachePut: cachePut,
    cacheGet: cacheGet,
    cacheHas: cacheHas,
    listCacheKeys: listCacheKeys,
    cacheSize: cacheSize,
    getAuditLog: getAuditLog,
    breakerStatus: breakerStatus
  };
})(typeof window !== "undefined" ? window :
  (typeof globalThis !== "undefined" ? globalThis : this));
