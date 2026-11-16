/* MTI6-GTADWIY-COCKPIT — Circuit Breakers (continuous development campaign)
 *
 * Fail-closed breaker foundation from the owner's 06:05 EST Nov 14
 * Master Bot Workforce spec (§ circuit breakers). A breaker is a
 * BLOCK: while a breaker is TRIPPED (or PAUSED), checkAction()
 * refuses every action in that breaker's scope. There is no
 * automatic remediation beyond the block itself, no network, no
 * secrets, no financial execution, no storage, no DOM.
 *
 * Truth rules enforced here (do not weaken them):
 * - A breaker never trips without evidence: tripBreaker() requires
 *   at least one evidence entry {kind, reference, recordedAt}
 *   (same shape as AngelSecurity evidence). No evidence, no trip.
 * - There is NO auto-reset, ever. resetBreaker() requires an
 *   explicit owner approval record {approvedBy, approvedAt, reason};
 *   without it the reset is refused, not queued. PAUSED is a manual
 *   state settable only with the same approval, and a PAUSED breaker
 *   still blocks actions in its scope.
 * - A second trip on an already-TRIPPED breaker appends evidence
 *   and history but does NOT reset trippedAt: the original trip
 *   time is the record of when the fault was first detected.
 * - evaluateCondition() is a pure helper: it maps a detected
 *   condition to its trigger, and returns null with reason
 *   NO_MATCHING_TRIGGER for anything unrecognised. It never invents
 *   a trigger.
 * - The notification on a tripped breaker is a RECORD only
 *   {notifiedAt, channels: ["angel-security", "star"]} of who was
 *   notified — it never sends anything live. There is no live send
 *   path in this module.
 * - INFORMATIONAL never implies TRANSACTIONAL: a breaker allowing
 *   an action only means "no breaker blocks it"; it never executes
 *   anything and never authorises a transaction.
 *
 * State: in-memory only (same pattern as TreasuryMandates). All 16
 * triggers start ARMED at load — one breaker per trigger at its
 * defaultScope. Tripping with a non-default scope creates an
 * additional ARMED-then-TRIPPED breaker for that trigger+scope pair.
 * Breakers are keyed by trigger + scope.
 *
 * Depends on js/truth.js and js/angel-security.js at load order only
 * in the weak sense: this module reuses their vocabulary shapes
 * (evidence entries, history entries, the secret-scan pattern) and
 * degrades gracefully when they are absent. Script tag order
 * (coordinator wiring):
 *   js/truth.js -> js/angel-security.js -> js/circuit-breakers.js
 * Loads in a bare vm context with no window, no DOM, no network.
 *
 *   CircuitBreakers.TRIGGERS / TRIGGER_IDS / BREAKER_STATES / SCOPES
 *   CircuitBreakers.listTriggers() / getTrigger(id)
 *   CircuitBreakers.listBreakers() / getBreaker(id)
 *   CircuitBreakers.tripBreaker(trigger, {scope, evidence, by, note})
 *   CircuitBreakers.checkAction(trigger, scope)
 *   CircuitBreakers.resetBreaker(breakerId, approval)
 *   CircuitBreakers.pauseBreaker(breakerId, approval)
 *   CircuitBreakers.evaluateCondition(condition)
 *   CircuitBreakers.summary()
 *   CircuitBreakers.reset()
 */
(function (global) {
  "use strict";

  // ---- Closed vocabularies owned by this module ------------------------

  // The 16 breaker triggers from the spec. defaultScope is the system
  // area the trigger guards; SCOPES is the closed scope list.
  var TRIGGERS = [
    { id: "UNKNOWN_WALLET", label: "Unknown wallet",
      description: "An action names a wallet that is not recognised or not verified as the owner's. Fail closed: nothing may act on an unknown wallet.",
      defaultScope: "wallet" },
    { id: "UNKNOWN_NETWORK", label: "Unknown network",
      description: "An action names a network that is not recognised. Fail closed: nothing may act on an unknown network.",
      defaultScope: "network" },
    { id: "UNKNOWN_CHAIN", label: "Unknown chain",
      description: "An action names a chain that is not recognised. Fail closed: nothing may act on an unknown chain.",
      defaultScope: "network" },
    { id: "UNKNOWN_ASSET", label: "Unknown asset",
      description: "An action names an asset that is not recognised. Fail closed: nothing may act on an unknown asset.",
      defaultScope: "asset" },
    { id: "UNKNOWN_CONTRACT", label: "Unknown contract",
      description: "An action names a contract that is not recognised or verified. Fail closed: nothing may interact with an unknown contract.",
      defaultScope: "asset" },
    { id: "PRICE_CONFLICT", label: "Price conflict",
      description: "Independent price sources disagree beyond tolerance, so no price can be trusted. Fail closed: nothing may act on a conflicted price.",
      defaultScope: "asset" },
    { id: "DEPEG", label: "Depeg",
      description: "A pegged asset has moved away from its peg. Fail closed: nothing may act as if the peg still holds.",
      defaultScope: "asset" },
    { id: "PROVIDER_COMPROMISE", label: "Provider compromise",
      description: "A provider the cockpit depends on is compromised or cannot be trusted. Fail closed: nothing may act on that provider's data.",
      defaultScope: "provider" },
    { id: "SECURITY_INCIDENT", label: "Security incident",
      description: "A security incident is detected or confirmed. Fail closed: the affected area stops until the owner clears it.",
      defaultScope: "security" },
    { id: "PERMISSION_VIOLATION", label: "Permission violation",
      description: "An agent attempted an action outside its permission profile. Fail closed: the affected area stops until the owner clears it.",
      defaultScope: "security" },
    { id: "AUTHORITY_ESCALATION", label: "Authority escalation",
      description: "An agent attempted to gain authority it was not granted. Fail closed: the affected area stops until the owner clears it.",
      defaultScope: "security" },
    { id: "LOSS_THRESHOLD", label: "Loss threshold",
      description: "A recorded loss limit has been reached. Fail closed: no further action in the treasury area until the owner clears it.",
      defaultScope: "treasury" },
    { id: "COST_THRESHOLD", label: "Cost threshold",
      description: "A recorded cost limit has been reached. Fail closed: no further action in the treasury area until the owner clears it.",
      defaultScope: "treasury" },
    { id: "MANDATE_EXCEEDED", label: "Mandate exceeded",
      description: "A proposed action exceeds its treasury mandate. Fail closed: the action is blocked and the treasury area stops until the owner clears it.",
      defaultScope: "treasury" },
    { id: "INVALID_SIMULATION", label: "Invalid simulation",
      description: "A simulation of a proposed action is invalid or cannot be verified. Fail closed: nothing may proceed on an unverified simulation.",
      defaultScope: "treasury" },
    { id: "UNVERIFIABLE_DEPENDENCY", label: "Unverifiable dependency",
      description: "A dependency of a proposed action cannot be verified. Fail closed: nothing may proceed on an unverifiable dependency.",
      defaultScope: "provider" }
  ];

  var TRIGGER_IDS = TRIGGERS.map(function (t) { return t.id; });

  var BREAKER_STATES = ["ARMED", "TRIPPED", "PAUSED"];

  // Closed scope list: the only scopes a breaker may guard.
  var SCOPES = ["wallet", "network", "asset", "provider", "treasury",
    "security"];

  // Notification channels recorded on a trip. A notification is a
  // RECORD of who was notified, never a live send.
  var NOTIFICATION_CHANNELS = ["angel-security", "star"];

  // evaluateCondition() condition key -> trigger id, in priority
  // order. When several conditions are true at once, the first match
  // in this order wins, so the mapping is deterministic.
  var CONDITION_MAP = [
    { key: "unknownWallet", trigger: "UNKNOWN_WALLET" },
    { key: "unknownNetwork", trigger: "UNKNOWN_NETWORK" },
    { key: "unknownChain", trigger: "UNKNOWN_CHAIN" },
    { key: "unknownAsset", trigger: "UNKNOWN_ASSET" },
    { key: "unknownContract", trigger: "UNKNOWN_CONTRACT" },
    { key: "priceConflict", trigger: "PRICE_CONFLICT" },
    { key: "depeg", trigger: "DEPEG" },
    { key: "providerCompromise", trigger: "PROVIDER_COMPROMISE" },
    { key: "securityIncident", trigger: "SECURITY_INCIDENT" },
    { key: "permissionViolation", trigger: "PERMISSION_VIOLATION" },
    { key: "authorityEscalation", trigger: "AUTHORITY_ESCALATION" },
    { key: "lossThreshold", trigger: "LOSS_THRESHOLD" },
    { key: "costThreshold", trigger: "COST_THRESHOLD" },
    { key: "mandateExceeded", trigger: "MANDATE_EXCEEDED" },
    { key: "invalidSimulation", trigger: "INVALID_SIMULATION" },
    { key: "unverifiableDependency", trigger: "UNVERIFIABLE_DEPENDENCY" }
  ];

  // Same secret shape as bot-ops-model.js / angel-security.js /
  // treasury-mandates.js: keys / passwords / private keys / issued
  // tokens. A bare "token" is a legitimate crypto term and is NOT
  // matched. Secret-looking content is never stored in a breaker.
  var SECRET_PATTERN = /(api[_-]?key|secret|password|passwd|private[_-]?key|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-live-[a-z0-9]+|ghp_[a-z0-9]+|github_pat_[a-z0-9_]+|xox[baprs]-[a-z0-9-]+)/i;

  // ---- State (in-memory only; nothing is persisted) --------------------

  var breakers = {}; // id -> breaker record

  // ---- Helpers -----------------------------------------------------------

  function nowIso() {
    return new Date().toISOString();
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getTriggerDef(id) {
    if (typeof id !== "string") return null;
    for (var i = 0; i < TRIGGERS.length; i++) {
      if (TRIGGERS[i].id === id) return TRIGGERS[i];
    }
    return null;
  }

  function breakerIdFor(trigger, scope) {
    return "breaker-" + trigger.toLowerCase().replace(/_/g, "-") +
      "-" + scope;
  }

  function newBreaker(trigger, scope) {
    var stamp = nowIso();
    return {
      id: breakerIdFor(trigger, scope),
      trigger: trigger,
      scope: scope,
      state: "ARMED",
      trippedAt: null,
      evidence: [],
      history: [{
        from: null,
        to: "ARMED",
        at: stamp,
        by: "system",
        note: "Breaker armed at load for trigger " + trigger +
          " (scope " + scope + ")."
      }],
      notification: null,
      createdAt: stamp
    };
  }

  // All 16 triggers start ARMED at their defaultScope. This is
  // configuration, not a live-state claim: ARMED means the breaker is
  // ready to trip, not that anything has happened.
  function initBreakers() {
    breakers = {};
    for (var i = 0; i < TRIGGERS.length; i++) {
      var b = newBreaker(TRIGGERS[i].id, TRIGGERS[i].defaultScope);
      breakers[b.id] = b;
    }
  }

  function findSecretField(fields) {
    for (var i = 0; i < fields.length; i++) {
      if (typeof fields[i][1] === "string" &&
          SECRET_PATTERN.test(fields[i][1])) {
        return fields[i][0];
      }
    }
    return null;
  }

  // Evidence validation, same shape as AngelSecurity.validateEvidence:
  // a non-empty array of {kind, reference, recordedAt}, all
  // non-empty strings. Returns an error array (empty = valid).
  function validateEvidence(evidence) {
    var errors = [];
    if (!Array.isArray(evidence) || evidence.length === 0) {
      errors.push("evidence must be a non-empty array with at least one entry — a breaker never trips without evidence.");
      return errors;
    }
    for (var i = 0; i < evidence.length; i++) {
      var entry = evidence[i];
      if (!entry || typeof entry !== "object") {
        errors.push("evidence[" + i + "] must be an object.");
        continue;
      }
      if (!isNonEmptyString(entry.kind)) {
        errors.push("evidence[" + i + "].kind is required and must be a non-empty string.");
      }
      if (!isNonEmptyString(entry.reference)) {
        errors.push("evidence[" + i + "].reference is required and must be a non-empty string.");
      }
      if (!isNonEmptyString(entry.recordedAt)) {
        errors.push("evidence[" + i + "].recordedAt is required and must be a non-empty string.");
      }
    }
    return errors;
  }

  // Owner approval validation for reset / pause. Returns an error
  // array (empty = valid). An approval is {approvedBy, approvedAt,
  // reason}, all non-empty strings.
  function validateApproval(approval) {
    var errors = [];
    if (!approval || typeof approval !== "object") {
      errors.push("approval is required: {approvedBy, approvedAt, reason}.");
      return errors;
    }
    if (!isNonEmptyString(approval.approvedBy)) {
      errors.push("approval.approvedBy is required and must be a non-empty string (owner provenance).");
    }
    if (!isNonEmptyString(approval.approvedAt)) {
      errors.push("approval.approvedAt is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(approval.reason)) {
      errors.push("approval.reason is required and must be a non-empty string.");
    }
    return errors;
  }

  function copyBreaker(breaker) {
    return breaker ? clone(breaker) : null;
  }

  initBreakers();

  // ---- Trigger registry --------------------------------------------------

  function listTriggers() {
    return clone(TRIGGERS);
  }

  function getTrigger(id) {
    var def = getTriggerDef(id);
    return def ? clone(def) : null;
  }

  // ---- Breaker records ---------------------------------------------------

  function listBreakers() {
    return Object.keys(breakers).sort().map(function (id) {
      return copyBreaker(breakers[id]);
    });
  }

  function getBreaker(id) {
    if (typeof id !== "string") return null;
    return copyBreaker(breakers[id] || null);
  }

  // ---- Trip (fail-closed block) ------------------------------------------

  // Trips the breaker for a trigger (+ scope). Requires at least one
  // evidence entry; without evidence it throws and nothing changes.
  // Sets state TRIPPED, records trippedAt, preserves the evidence,
  // appends a history entry, and creates the notification record
  // (Angel Security + STAR — a record only, never a live send).
  // A second trip on an already-TRIPPED breaker appends evidence and
  // history but does NOT reset trippedAt. Tripping a PAUSED breaker
  // moves it to TRIPPED and records a fresh trippedAt (it was not
  // tripped before). Throws on an unknown trigger, an unknown scope,
  // missing evidence, or secret-looking content.
  function tripBreaker(trigger, options) {
    var def = getTriggerDef(trigger);
    if (!def) {
      throw new Error("tripBreaker: unknown trigger: " + String(trigger) +
        ". Known triggers: " + TRIGGER_IDS.join(", ") + ".");
    }
    var opts = options && typeof options === "object" ? options : {};
    var scope = opts.scope === undefined ? def.defaultScope : opts.scope;
    if (SCOPES.indexOf(scope) === -1) {
      throw new Error("tripBreaker: unknown scope: " + String(scope) +
        ". Known scopes: " + SCOPES.join(", ") + ".");
    }
    var evidenceErrors = validateEvidence(opts.evidence);
    if (evidenceErrors.length) {
      throw new Error("tripBreaker: " + evidenceErrors.join(" "));
    }
    var secretField = findSecretField(
      (opts.evidence || []).map(function (e, i) {
        return ["evidence[" + i + "].reference", e && e.reference];
      }).concat([["note", opts.note]]));
    if (secretField) {
      throw new Error("tripBreaker: field " + secretField +
        " looks like a secret or credential and must not be stored in a breaker.");
    }
    var by = isNonEmptyString(opts.by) ? opts.by.trim() : "system";
    var note = typeof opts.note === "string" ? opts.note : "";
    var stamp = nowIso();

    var id = breakerIdFor(trigger, scope);
    var breaker = breakers[id];
    if (!breaker) {
      breaker = newBreaker(trigger, scope);
      breakers[id] = breaker;
    }

    if (breaker.state === "TRIPPED") {
      // Second trip: append, never reset trippedAt.
      breaker.evidence = breaker.evidence.concat(clone(opts.evidence));
      breaker.history.push({
        from: "TRIPPED",
        to: "TRIPPED",
        at: stamp,
        by: by,
        note: "Breaker re-tripped while already TRIPPED; evidence appended; original trippedAt " +
          breaker.trippedAt + " preserved." + (note ? " " + note : "")
      });
      return copyBreaker(breaker);
    }

    var from = breaker.state;
    breaker.state = "TRIPPED";
    breaker.trippedAt = stamp;
    breaker.evidence = breaker.evidence.concat(clone(opts.evidence));
    breaker.history.push({
      from: from,
      to: "TRIPPED",
      at: stamp,
      by: by,
      note: "Breaker tripped for trigger " + trigger + " (scope " +
        scope + ")." + (note ? " " + note : "")
    });
    breaker.notification = {
      notifiedAt: stamp,
      channels: NOTIFICATION_CHANNELS.slice()
    };
    return copyBreaker(breaker);
  }

  // ---- Pure evaluation: checkAction --------------------------------------

  // Evaluates whether an action in a scope may proceed. PURE: it
  // reads breaker state and returns {allowed, reason}, changing
  // nothing. Fail closed:
  //   - unknown trigger -> {allowed: false, reason: "UNKNOWN_TRIGGER"}
  //   - any TRIPPED or PAUSED breaker guarding this scope ->
  //     {allowed: false, reason: "CIRCUIT_TRIPPED"} (the block is by
  //     scope, not by trigger: a tripped wallet breaker blocks every
  //     wallet action, whatever trigger the caller names)
  //   - otherwise -> {allowed: true, reason: "ALLOWED"}
  // An allowed result means "no breaker blocks it" only. It never
  // executes anything and never authorises a transaction.
  function checkAction(trigger, scope) {
    var def = getTriggerDef(trigger);
    if (!def) {
      return {
        allowed: false,
        reason: "UNKNOWN_TRIGGER",
        trigger: typeof trigger === "string" ? trigger : null,
        scope: typeof scope === "string" ? scope : null,
        breakerId: null,
        note: "Unknown trigger — nothing was executed."
      };
    }
    var resolvedScope = scope === undefined ? def.defaultScope : scope;
    var blocking = null;
    var ids = Object.keys(breakers);
    for (var i = 0; i < ids.length; i++) {
      var b = breakers[ids[i]];
      if (b.scope === resolvedScope &&
          (b.state === "TRIPPED" || b.state === "PAUSED")) {
        blocking = b;
        break;
      }
    }
    if (blocking) {
      return {
        allowed: false,
        reason: "CIRCUIT_TRIPPED",
        trigger: trigger,
        scope: resolvedScope,
        breakerId: blocking.id,
        blockingTrigger: blocking.trigger,
        blockingState: blocking.state,
        trippedAt: blocking.trippedAt,
        note: "Breaker " + blocking.id + " is " + blocking.state +
          " for trigger " + blocking.trigger + "; actions in scope " +
          resolvedScope + " are blocked. Nothing was executed."
      };
    }
    return {
      allowed: true,
      reason: "ALLOWED",
      trigger: trigger,
      scope: resolvedScope,
      breakerId: null,
      note: "No TRIPPED or PAUSED breaker guards scope " + resolvedScope +
        ". This is an evaluation only; nothing was executed."
    };
  }

  // ---- Reset / pause (owner approval only, never automatic) --------------

  // Returns the breaker to ARMED. Requires an explicit owner
  // approval record {approvedBy, approvedAt, reason}. Without one
  // it returns {reset: false, reason: "REQUIRES_OWNER_APPROVAL"}
  // and changes nothing. There is no auto-reset, ever. Evidence and
  // history are preserved as the audit trail; the notification is
  // cleared (the trip it recorded is now history). Resetting an
  // ARMED breaker or an unknown id also returns reset: false.
  function resetBreaker(breakerId, approval) {
    function refused(reason) {
      return { reset: false, reason: reason, breakerId: typeof breakerId === "string" ? breakerId : null, breaker: null };
    }
    if (typeof breakerId !== "string" || !breakers[breakerId]) {
      return refused("UNKNOWN_BREAKER");
    }
    var approvalErrors = validateApproval(approval);
    if (approvalErrors.length) {
      return refused("REQUIRES_OWNER_APPROVAL");
    }
    var breaker = breakers[breakerId];
    if (breaker.state === "ARMED") {
      return refused("NOT_TRIPPED");
    }
    var from = breaker.state;
    var stamp = nowIso();
    breaker.state = "ARMED";
    breaker.trippedAt = null;
    breaker.notification = null;
    breaker.history.push({
      from: from,
      to: "ARMED",
      at: stamp,
      by: approval.approvedBy.trim(),
      note: "Breaker reset to ARMED by owner approval. Reason: " +
        approval.reason.trim()
    });
    return {
      reset: true,
      reason: "RESET_BY_OWNER_APPROVAL",
      breakerId: breaker.id,
      breaker: copyBreaker(breaker)
    };
  }

  // Sets a breaker to PAUSED (manual state, still blocks actions in
  // its scope). Requires the same owner approval as a reset; without
  // it returns {paused: false, reason: "REQUIRES_OWNER_APPROVAL"}
  // and changes nothing. A PAUSED breaker returns to ARMED only
  // through resetBreaker() with owner approval.
  function pauseBreaker(breakerId, approval) {
    function refused(reason) {
      return { paused: false, reason: reason, breakerId: typeof breakerId === "string" ? breakerId : null, breaker: null };
    }
    if (typeof breakerId !== "string" || !breakers[breakerId]) {
      return refused("UNKNOWN_BREAKER");
    }
    var approvalErrors = validateApproval(approval);
    if (approvalErrors.length) {
      return refused("REQUIRES_OWNER_APPROVAL");
    }
    var breaker = breakers[breakerId];
    if (breaker.state === "PAUSED") {
      return refused("ALREADY_PAUSED");
    }
    var from = breaker.state;
    var stamp = nowIso();
    breaker.state = "PAUSED";
    breaker.history.push({
      from: from,
      to: "PAUSED",
      at: stamp,
      by: approval.approvedBy.trim(),
      note: "Breaker paused by owner approval. Reason: " +
        approval.reason.trim() + (from === "TRIPPED"
          ? " Breaker was TRIPPED; trippedAt " + breaker.trippedAt + " preserved."
          : "")
    });
    return {
      paused: true,
      reason: "PAUSED_BY_OWNER_APPROVAL",
      breakerId: breaker.id,
      breaker: copyBreaker(breaker)
    };
  }

  // ---- Pure helper: condition -> trigger ---------------------------------

  // Maps a detected condition to its trigger. Pure: no state is read
  // or changed. Returns {trigger: <id>, reason: "MATCHED"} for the
  // first matching condition in priority order, or
  // {trigger: null, reason: "NO_MATCHING_TRIGGER"} when nothing
  // matches — including for unrecognised keys, a non-object, or an
  // empty condition. It never invents a trigger.
  function evaluateCondition(condition) {
    if (condition && typeof condition === "object") {
      for (var i = 0; i < CONDITION_MAP.length; i++) {
        if (condition[CONDITION_MAP[i].key] === true) {
          return { trigger: CONDITION_MAP[i].trigger, reason: "MATCHED" };
        }
      }
    }
    return { trigger: null, reason: "NO_MATCHING_TRIGGER" };
  }

  // ---- Summary (honest counts only) --------------------------------------

  function summary() {
    var byState = {};
    var byTrigger = {};
    var i;
    for (i = 0; i < BREAKER_STATES.length; i++) byState[BREAKER_STATES[i]] = 0;
    var ids = Object.keys(breakers);
    var blocking = 0;
    for (i = 0; i < ids.length; i++) {
      var b = breakers[ids[i]];
      if (byState.hasOwnProperty(b.state)) byState[b.state] += 1;
      if (b.state === "TRIPPED" || b.state === "PAUSED") blocking += 1;
      byTrigger[b.trigger] = (byTrigger[b.trigger] || 0) + 1;
    }
    return {
      totalBreakers: ids.length,
      triggers: TRIGGER_IDS.length,
      armed: byState.ARMED,
      tripped: byState.TRIPPED,
      paused: byState.PAUSED,
      blocking: blocking,
      byState: byState,
      byTrigger: byTrigger,
      note: blocking === 0
        ? "All breakers ARMED — no scope is blocked. No live incident feed is connected, so no trip is claimed."
        : blocking + " breaker(s) TRIPPED or PAUSED; actions in their scopes are blocked until an owner approval resets them."
    };
  }

  // Re-initialises all 16 breakers to ARMED. Intended for tests and
  // for an owner-directed reset; it never touches any other module.
  function reset() {
    initBreakers();
    return true;
  }

  global.CircuitBreakers = {
    TRIGGERS: listTriggers(),
    TRIGGER_IDS: TRIGGER_IDS.slice(),
    BREAKER_STATES: BREAKER_STATES.slice(),
    SCOPES: SCOPES.slice(),
    NOTIFICATION_CHANNELS: NOTIFICATION_CHANNELS.slice(),
    listTriggers: listTriggers,
    getTrigger: getTrigger,
    listBreakers: listBreakers,
    getBreaker: getBreaker,
    tripBreaker: tripBreaker,
    checkAction: checkAction,
    resetBreaker: resetBreaker,
    pauseBreaker: pauseBreaker,
    evaluateCondition: evaluateCondition,
    summary: summary,
    reset: reset
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
