/* MTI6-GTADWIY-COCKPIT — Autonomy Control (continuous development campaign)
 *
 * Autonomy-level governance, FOUNDATION ONLY. No financial execution,
 * no signing, no cash-out, no external actions, no network, no
 * secrets, no DOM, no storage. Every decision this module makes is a
 * GOVERNANCE decision (ALLOWED / REQUIRES_APPROVAL / DENIED) about
 * whether an autonomous action may be considered — it never performs
 * the action itself, and there is no execution path anywhere in this
 * file.
 *
 * Vocabulary reuse (no competing vocabulary invented):
 *   - Permissions reuse StarCommand.PERMISSIONS when star-command.js
 *     is loaded (INFORMATIONAL, NAVIGATIONAL, READ_ONLY, ASSISTED,
 *     APPROVAL_REQUIRED, TRANSACTIONAL, UNAVAILABLE), else the same
 *     closed list as a fallback.
 *   - Verification states reuse Truth.TRUTH_STATES / the CryptoWorld
 *     verification vocabulary when truth.js is loaded, else the same
 *     closed list as a fallback. A policy's verificationStatus says
 *     how true its provenance/contents are; it never authorises
 *     execution on its own.
 *   - The financial-execution boundary matches StarCommand's
 *     TRANSACTIONAL_RE and ToolRouter's EXECUTION_RE / FINANCIAL_CLASSES:
 *     naming a financial action never implies permission to do it.
 *   - The bounded in-memory audit log (max 200, newest first) matches
 *     ToolRouter's decision log. It is in-memory only: it is never
 *     persisted to localStorage or IndexedDB by this module, and
 *     policies are likewise in-memory records in this foundation
 *     build — persistence is a coordinator wiring decision, not
 *     something this module does silently.
 *
 * Autonomy levels (closed list, ranked):
 *   MANUAL          — a human does the work; no autonomous action.
 *   ASSISTED        — Star may prepare / suggest; the owner decides.
 *   SUPERVISED_AUTO — Star may act autonomously inside a policy, with
 *                     owner supervision (safe fallback switching and
 *                     safe recovery live here).
 *   AUTO_INTERNAL   — the highest level, and it is explicitly scoped to
 *                     INTERNAL actions only: research, verification,
 *                     analysis, monitoring, safe fallback switching,
 *                     safe recovery, approved internal task management,
 *                     learning, and worker spawning as a RECORD
 *                     creation. AUTO_INTERNAL never covers financial
 *                     execution, signing, cash-out, or external
 *                     actions of any kind.
 *
 * Decision rules, in plain terms:
 *   - Financial execution / signing / cash-out / external purchase
 *     kinds are ALWAYS DENIED with reason
 *     "FINANCIAL_EXECUTION_NOT_AUTHORIZED" — whatever policy exists.
 *   - Any other external kind is DENIED with reason
 *     "EXTERNAL_ACTION_NOT_AUTHORIZED": AUTO_INTERNAL never covers
 *     external actions.
 *   - An internal kind is ALLOWED only when an ACTIVE policy covers
 *     its scope at a sufficient level (see MIN_LEVEL_FOR_KIND);
 *     otherwise it REQUIRES_APPROVAL. No policy, a PAUSED policy, a
 *     REVOKED policy, a policy for a different scope, or a policy
 *     below the minimum level all mean REQUIRES_APPROVAL, never
 *     silent permission.
 *   - Worker spawning is a RECORD creation only: it creates a
 *     traceable record, never a live process (no worker runtime
 *     exists in this build — see BotOpsModel.getWorkersActive, which
 *     is always 0 / NOT_CONNECTED). It is ALLOWED only under an
 *     ACTIVE AUTO_INTERNAL policy for scope "worker-spawning".
 *   - Unknown kinds are never allowed: they REQUIRES_APPROVAL (fail
 *     closed). A malformed action is DENIED with reason
 *     "INVALID_ACTION".
 *   - Policies require owner provenance (createdBy) to be created.
 *     A policy created without it is rejected, not stored.
 *
 * Depends on truth.js and star-command.js at load order time only in
 * the weak sense: both are consulted through typeof guards, and this
 * module degrades to its own identical fallback vocabularies when
 * either is absent. Script tag order (coordinator wiring):
 *   js/truth.js, then js/star-command.js, then js/autonomy.js.
 * Loads in a bare vm context with no window, no DOM, no network.
 *
 *   AutonomyControl.LEVELS            -> [{ id, rank, label, scope }]
 *   AutonomyControl.createPolicy(input) -> stored policy (throws on invalid)
 *   AutonomyControl.getPolicy(id)     -> policy copy or null
 *   AutonomyControl.listPolicies()    -> all policy copies
 *   AutonomyControl.setPolicyState(id, to) -> updated policy (throws on illegal)
 *   AutonomyControl.requestAutonomousAction(action) -> decision object
 *   AutonomyControl.summary()         -> honest counts
 *   AutonomyControl.getAuditLog() / clearAuditLog()
 *   AutonomyControl.reset()           -> clears policies + log (tests / reset)
 */
(function (global) {
  "use strict";

  // ---- Reused vocabularies (fallbacks identical to the source) --------

  var FALLBACK_PERMISSIONS = {
    INFORMATIONAL: "INFORMATIONAL",
    NAVIGATIONAL: "NAVIGATIONAL",
    READ_ONLY: "READ_ONLY",
    ASSISTED: "ASSISTED",
    APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
    TRANSACTIONAL: "TRANSACTIONAL",
    UNAVAILABLE: "UNAVAILABLE"
  };

  var FALLBACK_VERIFICATION_STATES = ["UNKNOWN", "DISCOVERED",
    "UNVERIFIED", "VERIFIED", "STALE", "UNAVAILABLE", "NOT_CONNECTED",
    "DISABLED"];

  function permissions() {
    if (global.StarCommand && global.StarCommand.PERMISSIONS) {
      return global.StarCommand.PERMISSIONS;
    }
    return FALLBACK_PERMISSIONS;
  }

  function verificationStates() {
    if (global.Truth && Array.isArray(global.Truth.VERIFICATION_STATES)) {
      return global.Truth.VERIFICATION_STATES;
    }
    return FALLBACK_VERIFICATION_STATES;
  }

  // ---- Closed vocabularies owned by this module ------------------------

  // Ranked lowest to highest. MANUAL (0) authorises no autonomous
  // action at all; a policy at MANUAL covering a scope still means
  // REQUIRES_APPROVAL for every autonomous action in that scope.
  var LEVELS = [
    { id: "MANUAL", rank: 0, label: "Manual",
      scope: "A human does the work; no autonomous action is permitted." },
    { id: "ASSISTED", rank: 1, label: "Assisted",
      scope: "Star may prepare and suggest; the owner decides and acts." },
    { id: "SUPERVISED_AUTO", rank: 2, label: "Supervised automatic",
      scope: "Star may act autonomously inside a policy, under owner supervision." },
    { id: "AUTO_INTERNAL", rank: 3, label: "Automatic (internal only)",
      scope: "Internal actions only: research, verification, analysis, monitoring, safe fallback switching, safe recovery, approved internal task management, learning, and worker spawning as a record creation. Never financial execution, signing, cash-out, or external actions." }
  ];

  var LEVEL_IDS = ["MANUAL", "ASSISTED", "SUPERVISED_AUTO", "AUTO_INTERNAL"];

  var POLICY_STATES = ["ACTIVE", "PAUSED", "REVOKED"];

  var POLICY_TRANSITIONS = {
    ACTIVE: ["PAUSED", "REVOKED"],
    PAUSED: ["ACTIVE", "REVOKED"],
    REVOKED: []
  };

  var DECISIONS = {
    ALLOWED: "ALLOWED",
    REQUIRES_APPROVAL: "REQUIRES_APPROVAL",
    DENIED: "DENIED"
  };

  // Internal kinds and the minimum autonomy level that may perform
  // them autonomously under a covering ACTIVE policy. Worker spawning
  // needs the top level; safe fallback switching and safe recovery
  // need supervision; the read/prepare kinds need at least ASSISTED.
  var INTERNAL_KINDS = ["research", "verification", "analysis",
    "monitoring", "fallback-switching", "recovery",
    "internal-task-management", "learning", "worker-spawning"];

  var MIN_LEVEL_FOR_KIND = {
    "research": "ASSISTED",
    "verification": "ASSISTED",
    "analysis": "ASSISTED",
    "monitoring": "ASSISTED",
    "learning": "SUPERVISED_AUTO",
    "fallback-switching": "SUPERVISED_AUTO",
    "recovery": "SUPERVISED_AUTO",
    "internal-task-management": "ASSISTED",
    "worker-spawning": "AUTO_INTERNAL"
  };

  // Financial kinds: ALWAYS DENIED, whatever policy exists. The list
  // covers the task's named kinds (financial execution, signing,
  // cash-out, external purchase) plus the execution verbs StarCommand
  // and ToolRouter already treat as transactional, so a request
  // phrased as "buy" or "swap" hits the same wall as one phrased as
  // "financial-execution".
  var FINANCIAL_KINDS = ["financial-execution", "signing", "cash-out",
    "external-purchase", "buy", "sell", "trade", "swap", "stake",
    "lend", "borrow", "claim", "withdraw", "send-money", "purchase",
    "payment", "transfer"];

  var AUDIT_MAX = 200;

  // Same secret shape as bot-ops-model.js / tool-router.js: keys /
  // passwords / private keys / issued tokens. A bare "token" is a
  // legitimate crypto term and is NOT matched.
  var SECRET_PATTERN = /(api[_-]?key|secret|password|passwd|private[_-]?key|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-live-[a-z0-9]+|ghp_[a-z0-9]+|github_pat_[a-z0-9_]+|xox[baprs]-[a-z0-9-]+)/i;

  // ---- State (in-memory only; nothing is persisted) --------------------

  var policies = {}; // id -> policy record
  var auditLog = []; // newest first, bounded to AUDIT_MAX

  // ---- Helpers -----------------------------------------------------------

  function nowIso() {
    return new Date().toISOString();
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function isStringArray(value) {
    if (!Array.isArray(value)) return false;
    for (var i = 0; i < value.length; i++) {
      if (typeof value[i] !== "string") return false;
    }
    return true;
  }

  function levelRank(levelId) {
    for (var i = 0; i < LEVELS.length; i++) {
      if (LEVELS[i].id === levelId) return LEVELS[i].rank;
    }
    return -1;
  }

  function isKnownLevel(levelId) {
    return LEVEL_IDS.indexOf(levelId) !== -1;
  }

  function isFinancialKind(kind) {
    return typeof kind === "string" &&
      FINANCIAL_KINDS.indexOf(kind.trim().toLowerCase()) !== -1;
  }

  function isInternalKind(kind) {
    return typeof kind === "string" &&
      INTERNAL_KINDS.indexOf(kind.trim().toLowerCase()) !== -1;
  }

  function isExternalKind(kind) {
    return typeof kind === "string" &&
      kind.trim().toLowerCase().indexOf("external-") === 0;
  }

  function findSecretField(record, fields) {
    for (var i = 0; i < fields.length; i++) {
      var name = fields[i][0];
      var value = fields[i][1];
      if (typeof value === "string" && SECRET_PATTERN.test(value)) {
        return name;
      }
      if (Array.isArray(value)) {
        for (var j = 0; j < value.length; j++) {
          if (typeof value[j] === "string" && SECRET_PATTERN.test(value[j])) {
            return name + "[" + j + "]";
          }
        }
      }
    }
    return null;
  }

  function copyPolicy(policy) {
    if (!policy) return null;
    return {
      id: policy.id,
      scope: policy.scope,
      level: policy.level,
      constraints: policy.constraints.slice(),
      createdBy: policy.createdBy,
      verificationStatus: policy.verificationStatus,
      state: policy.state,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt
    };
  }

  function newPolicyId() {
    return "pol-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 8);
  }

  function appendAudit(entry) {
    auditLog.unshift(entry);
    if (auditLog.length > AUDIT_MAX) auditLog.length = AUDIT_MAX;
  }

  // ---- Policy validation / creation --------------------------------------

  // Returns an array of error strings (empty = valid). Never throws.
  function validatePolicy(input) {
    var errors = [];
    if (!input || typeof input !== "object") {
      return ["Policy must be an object."];
    }
    if (!isNonEmptyString(input.scope)) {
      errors.push("scope is required and must be a non-empty string (e.g. \"worker-spawning\", \"research\", \"monitoring\").");
    }
    if (!isNonEmptyString(input.level)) {
      errors.push("level is required and must be one of: " + LEVEL_IDS.join(", ") + ".");
    } else if (!isKnownLevel(input.level)) {
      errors.push("level " + input.level + " is not a known autonomy level. Known levels: " + LEVEL_IDS.join(", ") + ".");
    }
    if (input.constraints !== undefined && input.constraints !== null &&
        !isStringArray(input.constraints)) {
      errors.push("constraints must be an array of strings.");
    }
    // Owner provenance is required to create a policy: without a
    // named creator there is no one accountable for the autonomy it
    // grants, so the policy is rejected, not stored.
    if (!isNonEmptyString(input.createdBy)) {
      errors.push("createdBy is required and must be a non-empty string (owner provenance — who created this policy).");
    }
    if (input.verificationStatus !== undefined &&
        input.verificationStatus !== null &&
        verificationStates().indexOf(input.verificationStatus) === -1) {
      errors.push("verificationStatus must be one of: " + verificationStates().join(", ") + ".");
    }
    var secretField = findSecretField(input, [
      ["scope", input.scope],
      ["createdBy", input.createdBy],
      ["constraints", input.constraints]
    ]);
    if (secretField) {
      errors.push("Field " + secretField + " looks like a secret or credential and must not be stored in a policy.");
    }
    return errors;
  }

  // Creates a policy. New policies start ACTIVE. Throws an Error
  // listing every reason on invalid input; nothing is stored.
  function createPolicy(input) {
    var errors = validatePolicy(input);
    if (errors.length) {
      throw new Error("Invalid autonomy policy: " + errors.join(" "));
    }
    var stamp = nowIso();
    var policy = {
      id: newPolicyId(),
      scope: input.scope.trim(),
      level: input.level,
      constraints: input.constraints ? input.constraints.slice() : [],
      createdBy: input.createdBy.trim(),
      verificationStatus: input.verificationStatus || "UNVERIFIED",
      state: "ACTIVE",
      createdAt: stamp,
      updatedAt: stamp
    };
    policies[policy.id] = policy;
    appendAudit({
      at: stamp,
      type: "POLICY_CREATED",
      policyId: policy.id,
      scope: policy.scope,
      level: policy.level,
      state: policy.state,
      createdBy: policy.createdBy,
      decision: null,
      reason: "Policy created by " + policy.createdBy + "."
    });
    return copyPolicy(policy);
  }

  function getPolicy(id) {
    if (typeof id !== "string") return null;
    return copyPolicy(policies[id] || null);
  }

  function listPolicies() {
    return Object.keys(policies).sort().map(function (id) {
      return copyPolicy(policies[id]);
    });
  }

  // Moves a policy between ACTIVE / PAUSED / REVOKED along the allowed
  // transitions only. REVOKED is terminal. Throws on an unknown id or
  // an illegal transition; nothing is changed.
  function setPolicyState(id, to) {
    if (typeof id !== "string" || !policies[id]) {
      throw new Error("setPolicyState: no policy with id " + String(id) + ".");
    }
    if (POLICY_STATES.indexOf(to) === -1) {
      throw new Error("Unknown policy state: " + String(to) + ". Known states: " + POLICY_STATES.join(", ") + ".");
    }
    var policy = policies[id];
    if (POLICY_TRANSITIONS[policy.state].indexOf(to) === -1) {
      throw new Error("Illegal policy transition: " + policy.state + " -> " + to + " is not allowed.");
    }
    var from = policy.state;
    policy.state = to;
    policy.updatedAt = nowIso();
    appendAudit({
      at: policy.updatedAt,
      type: "POLICY_STATE",
      policyId: policy.id,
      scope: policy.scope,
      level: policy.level,
      state: policy.state,
      createdBy: policy.createdBy,
      decision: null,
      reason: "Policy state " + from + " -> " + to + "."
    });
    return copyPolicy(policy);
  }

  // ---- Governance decision (pure computation + bounded audit) -----------

  // Finds the ACTIVE policy covering a scope, if any. Exact scope
  // match only: a policy for "research" never covers "monitoring".
  // When several ACTIVE policies cover the same scope, the highest
  // level governs: a broader grant is not shadowed by a narrower
  // one created earlier.
  function coveringPolicy(scope) {
    var best = null;
    var ids = Object.keys(policies);
    for (var i = 0; i < ids.length; i++) {
      var policy = policies[ids[i]];
      if (policy.state === "ACTIVE" && policy.scope === scope) {
        if (!best || levelRank(policy.level) > levelRank(best.level)) {
          best = policy;
        }
      }
    }
    return best;
  }

  // Decides a request without performing anything. The returned
  // decision object is the whole result: the action is never executed
  // by this module, whatever the decision says.
  function decide(action) {
    var perms = permissions();
    var at = nowIso();
    var kind = action && typeof action.kind === "string"
      ? action.kind.trim().toLowerCase() : null;
    var scope = action && typeof action.scope === "string"
      ? action.scope.trim() : null;

    function base(decision, reason, level, permission, approvalRequired, policyId) {
      return {
        decision: decision,
        reason: reason,
        level: level || null,
        permission: permission,
        approvalRequired: approvalRequired,
        kind: kind,
        scope: scope,
        policyId: policyId || null,
        at: at
      };
    }

    if (!action || typeof action !== "object" || !kind || !scope) {
      return base(DECISIONS.DENIED,
        "INVALID_ACTION — an autonomous action needs { kind, scope, detail }; kind and scope must be non-empty strings. Nothing was executed.",
        null, perms.UNAVAILABLE, false, null);
    }

    // Financial kinds always fail closed, whatever policy exists.
    // This check outranks policy lookup: no policy can authorise
    // financial execution, signing, cash-out, or an external purchase.
    if (isFinancialKind(kind)) {
      return base(DECISIONS.DENIED,
        "FINANCIAL_EXECUTION_NOT_AUTHORIZED — kind \"" + kind + "\" is financial execution, signing, cash-out, or an external purchase, and no autonomous financial execution is authorised in this build. Nothing was bought, sold, traded, signed, or moved.",
        null, perms.TRANSACTIONAL, true, null);
    }

    // Any other external kind is likewise outside AUTO_INTERNAL's
    // scope: AUTO_INTERNAL never covers external actions.
    if (isExternalKind(kind)) {
      return base(DECISIONS.DENIED,
        "EXTERNAL_ACTION_NOT_AUTHORIZED — kind \"" + kind + "\" is an external action, and AUTO_INTERNAL never covers external actions. Nothing was executed.",
        null, perms.APPROVAL_REQUIRED, true, null);
    }

    // Secret-looking free text is refused, not stored or acted on.
    if (typeof action.detail === "string" && SECRET_PATTERN.test(action.detail)) {
      return base(DECISIONS.DENIED,
        "SECRET_CONTENT_REJECTED — the action detail looks like a secret or credential and must not be stored or acted on. Nothing was executed.",
        null, perms.UNAVAILABLE, false, null);
    }

    // Unknown kinds are never allowed: fail closed to approval.
    if (!isInternalKind(kind)) {
      return base(DECISIONS.REQUIRES_APPROVAL,
        "Unknown action kind \"" + kind + "\" — it is not a known internal kind, so it is not permitted autonomously. Owner approval is required. Nothing was executed.",
        null, perms.APPROVAL_REQUIRED, true, null);
    }

    var policy = coveringPolicy(scope);
    if (!policy) {
      return base(DECISIONS.REQUIRES_APPROVAL,
        "No ACTIVE policy covers scope \"" + scope + "\" — autonomous action \"" + kind + "\" requires owner approval. Nothing was executed.",
        null, perms.APPROVAL_REQUIRED, true, null);
    }

    var minLevel = MIN_LEVEL_FOR_KIND[kind];
    if (levelRank(policy.level) < levelRank(minLevel)) {
      return base(DECISIONS.REQUIRES_APPROVAL,
        "Policy for scope \"" + scope + "\" is level " + policy.level + ", below the minimum level " + minLevel + " for \"" + kind + "\" — owner approval is required. Nothing was executed.",
        policy.level, perms.APPROVAL_REQUIRED, true, policy.id);
    }

    // Worker spawning is a RECORD creation only: the decision allows
    // the record to be created (traceable, under the AUTO_INTERNAL
    // policy). It never starts a live process — no worker runtime
    // exists in this build, so no worker count is claimed.
    var note = kind === "worker-spawning"
      ? "Worker spawning allowed as a RECORD creation only under the ACTIVE AUTO_INTERNAL policy for scope \"worker-spawning\" — a traceable record, never a live process. No worker was started."
      : "Internal action \"" + kind + "\" is allowed under the ACTIVE " + policy.level + " policy for scope \"" + scope + "\". The action itself is not performed by this module.";
    return base(DECISIONS.ALLOWED, note,
      policy.level, perms.ASSISTED, false, policy.id);
  }

  // The public entry point. The decision itself is computed purely by
  // decide(); the only side effect is the bounded audit append.
  function requestAutonomousAction(action) {
    var decision = decide(action);
    appendAudit({
      at: decision.at,
      type: "DECISION",
      policyId: decision.policyId,
      scope: decision.scope,
      level: decision.level,
      state: null,
      createdBy: null,
      decision: decision.decision,
      reason: decision.reason
    });
    return decision;
  }

  // ---- Audit log (in-memory, bounded, newest first) ---------------------

  function getAuditLog() {
    return auditLog.map(function (entry) {
      var copy = {};
      var key;
      for (key in entry) {
        if (Object.prototype.hasOwnProperty.call(entry, key)) copy[key] = entry[key];
      }
      return copy;
    });
  }

  function clearAuditLog() {
    auditLog = [];
    return true;
  }

  // ---- Summary (honest counts only) -------------------------------------

  function summary() {
    var byState = { ACTIVE: 0, PAUSED: 0, REVOKED: 0 };
    var byLevel = {};
    var i;
    for (i = 0; i < LEVEL_IDS.length; i++) byLevel[LEVEL_IDS[i]] = 0;
    var ids = Object.keys(policies);
    for (i = 0; i < ids.length; i++) {
      var policy = policies[ids[i]];
      if (byState.hasOwnProperty(policy.state)) byState[policy.state] += 1;
      if (byLevel.hasOwnProperty(policy.level)) byLevel[policy.level] += 1;
    }
    return {
      totalPolicies: ids.length,
      activePolicies: byState.ACTIVE,
      byState: byState,
      byLevel: byLevel,
      auditLogEntries: auditLog.length,
      auditLogMax: AUDIT_MAX,
      note: ids.length === 0
        ? "No autonomy policies exist — with no ACTIVE covering policy, every autonomous action requires owner approval."
        : byState.ACTIVE + " of " + ids.length + " polic(ies) ACTIVE; financial execution, signing, cash-out, and external actions are DENIED whatever policy exists."
    };
  }

  // Clears policies and the audit log. Intended for tests and for an
  // owner-directed reset; it never touches any other module.
  function reset() {
    policies = {};
    auditLog = [];
    return true;
  }

  global.AutonomyControl = {
    LEVELS: LEVELS.map(function (level) {
      return { id: level.id, rank: level.rank, label: level.label, scope: level.scope };
    }),
    LEVEL_IDS: LEVEL_IDS.slice(),
    POLICY_STATES: POLICY_STATES.slice(),
    DECISIONS: DECISIONS,
    INTERNAL_KINDS: INTERNAL_KINDS.slice(),
    FINANCIAL_KINDS: FINANCIAL_KINDS.slice(),
    MIN_LEVEL_FOR_KIND: (function () {
      var copy = {};
      var key;
      for (key in MIN_LEVEL_FOR_KIND) {
        if (Object.prototype.hasOwnProperty.call(MIN_LEVEL_FOR_KIND, key)) copy[key] = MIN_LEVEL_FOR_KIND[key];
      }
      return copy;
    })(),
    AUDIT_MAX: AUDIT_MAX,
    PERMISSIONS: permissions(),
    VERIFICATION_STATES: verificationStates(),
    isFinancialKind: isFinancialKind,
    isInternalKind: isInternalKind,
    levelRank: levelRank,
    validatePolicy: validatePolicy,
    createPolicy: createPolicy,
    getPolicy: getPolicy,
    listPolicies: listPolicies,
    setPolicyState: setPolicyState,
    requestAutonomousAction: requestAutonomousAction,
    decide: decide,
    summary: summary,
    getAuditLog: getAuditLog,
    clearAuditLog: clearAuditLog,
    reset: reset
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
