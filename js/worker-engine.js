/* MTI6-GTADWIY-COCKPIT — Dynamic Worker Engine (continuous development campaign)
 *
 * Extends js/bot-ops-model.js toward real orchestration. Worker RECORDS
 * only: spawning creates a traceable identity/task/audit record, never
 * a live process. No DOM, no network, no secrets, no live workers.
 *
 * Hard rules, in plain terms:
 * - A worker record is NOT a live worker. getWorkersActive() ALWAYS
 *   returns {count: 0, state: "NOT_CONNECTED"} and summary() reports
 *   liveCount 0 separately from recordsCount. The count stays 0 until
 *   a real worker runtime exists — no record ever raises it.
 * - NAME persists; ROLE may change. changeRole() updates currentRole
 *   only and never touches canonicalName: a worker is never renamed
 *   to a function (Solomon may do Asset Intelligence today and
 *   Network Intelligence tomorrow; he is still Solomon).
 * - canonicalName is "NAME_PENDING" when a worker needs a name not
 *   yet approved. A name is NEVER invented here. When the naming-pool
 *   registry (BotNamingPool) is loaded, a given name is validated
 *   against it; when it is absent, any non-empty string is accepted
 *   with provenance and approvalState UNKNOWN.
 * - parentTribeId is required and must be one of the 12 canonical
 *   Tribe principal IDs. Angels are NOT Tribe workers: any Angel
 *   identity as parentTribeId is rejected.
 * - Worker lifecycle is a strict allowlist:
 *     SPAWNED -> ASSIGNED -> ACTIVE -> PAUSED -> COMPLETE / FAILED,
 *     plus IDLE. COMPLETE and FAILED are terminal. Illegal jumps throw
 *     and nothing is written.
 * - Heartbeat is honesty, not liveness: a worker with no recent
 *   heartbeat is STALE, never assumed active. isLiveActive() is
 *   always false in this build — no worker runtime exists.
 * - Tools are UNAVAILABLE until granted via ToolRouter. A worker's
 *   tools list is ids only; toolAvailability() reports each tool's
 *   real grant state (UNAVAILABLE when ToolRouter is absent or the
 *   tool is not granted). TRANSACTIONAL permission is never granted.
 * - Secret-looking content is never stored in a worker record. The
 *   pattern mirrors BotOpsModel's SECRET_PATTERN (keys / passwords /
 *   private keys / issued tokens), not ordinary words.
 * - Every spawn appends to a bounded in-memory audit log (max 200)
 *   with workerId, parentTribeId, canonicalName, role, taskId, at,
 *   by. The log is in-memory only: this module persists nothing to
 *   localStorage or IndexedDB (persistence is a coordinator decision).
 *
 * Depends on js/truth.js, js/bot-ops-model.js, js/star-command.js at
 * load order time only in the weak sense: all three are consulted
 * through typeof guards, and this module degrades to its own
 * identical fallback vocabularies when any is absent. js/tribe-
 * principals.js is consulted the same way when present (canonical
 * principal IDs are validated by string list first, resolved against
 * TribePrincipals when loaded). Script tag order (coordinator wiring):
 *   js/truth.js, js/bot-ops-model.js, js/star-command.js,
 *   js/tribe-principals.js (when present), js/worker-engine.js.
 * Loads in a bare vm context with no DOM and no network.
 *
 *   WorkerEngine.CANONICAL_TRIBE_IDS / .ANGEL_IDS / .WORKER_STATES
 *   WorkerEngine.AUTONOMY_LEVELS / .HEALTH_STATES
 *   WorkerEngine.spawnWorker(input)      -> worker record (status SPAWNED)
 *   WorkerEngine.getWorker(id)           -> worker copy or null
 *   WorkerEngine.listWorkers()           -> all worker copies
 *   WorkerEngine.changeRole(id, role)    -> worker (name untouched)
 *   WorkerEngine.transitionWorker(id, to, note) -> worker
 *   WorkerEngine.canTransition(from, to) -> boolean
 *   WorkerEngine.recordHeartbeat(id, {at, note}) -> worker
 *   WorkerEngine.heartbeatAgeMs(id, nowMs) -> ms or null
 *   WorkerEngine.isStale(id, nowMs)      -> boolean
 *   WorkerEngine.recordWarning(id, message) -> worker
 *   WorkerEngine.recordError(id, message)   -> worker
 *   WorkerEngine.isLiveActive(worker)    -> false, always
 *   WorkerEngine.toolAvailability(id)    -> [{toolId, availability, granted}]
 *   WorkerEngine.getWorkersActive()      -> {count: 0, state: "NOT_CONNECTED"}
 *   WorkerEngine.validateWorker(record)  -> [errors]
 *   WorkerEngine.removeWorker(id)        -> boolean
 *   WorkerEngine.summary()               -> honest counts
 *   WorkerEngine.getAuditLog() / clearAuditLog()
 *   WorkerEngine.resetEngine()           -> clears workers + log (tests / reset)
 */
(function (global) {
  "use strict";

  var G = global || (typeof globalThis !== "undefined" ? globalThis : {});

  // ---- Canonical identities ----------------------------------------------

  // The 12 canonical Tribe principal IDs (owner ruling Nov 14, 2026;
  // arrangement corresponds to the Revelation 7 list; modern normalized
  // spellings). These are the ONLY valid parentTribeId values.
  var CANONICAL_TRIBE_IDS = [
    "tribe-judah",
    "tribe-reuben",
    "tribe-gad",
    "tribe-asher",
    "tribe-naphtali",
    "tribe-manasseh",
    "tribe-simeon",
    "tribe-levi",
    "tribe-issachar",
    "tribe-zebulun",
    "tribe-joseph",
    "tribe-benjamin"
  ];

  // Angel identities (separate registry; Angels are NOT Tribe members
  // and are never Tribe workers). Owner-approved: MICHAEL, GABRIEL
  // (KJV), RAPHAEL (APOCRYPHA/TOBIT), URIEL (APOCRYPHA/OTHER);
  // candidates pending verification: RAGUEL, SARIEL/SARAQAEL, REMIEL.
  // Stored lowercase for comparison; "angel-" prefixed forms are
  // rejected too.
  var ANGEL_IDS = [
    "michael",
    "gabriel",
    "raphael",
    "uriel",
    "raguel",
    "sariel",
    "saraqael",
    "remiel"
  ];

  var NAME_PENDING = "NAME_PENDING";

  // ---- Lifecycle ----------------------------------------------------------

  var WORKER_STATES = [
    "SPAWNED",
    "ASSIGNED",
    "ACTIVE",
    "PAUSED",
    "IDLE",
    "COMPLETE",
    "FAILED"
  ];

  // Strict allowlist. No transitions out of COMPLETE / FAILED.
  // IDLE is a holding state: a worker parked between assignments.
  var TRANSITIONS = {
    SPAWNED: ["ASSIGNED", "FAILED"],
    ASSIGNED: ["ACTIVE", "IDLE", "FAILED"],
    ACTIVE: ["PAUSED", "COMPLETE", "FAILED"],
    PAUSED: ["ACTIVE", "IDLE", "FAILED"],
    IDLE: ["ASSIGNED", "ACTIVE", "FAILED"],
    COMPLETE: [],
    FAILED: []
  };

  // A worker with no heartbeat in this window is STALE, never assumed
  // active. 60 seconds: generous enough for a record-keeping heartbeat,
  // short enough that staleness means something.
  var HEARTBEAT_STALE_MS = 60000;

  // Autonomy levels (owner spec §44, closed set). MANUAL is the
  // default: a worker does nothing on its own until its autonomy is
  // explicitly raised, and financial execution is never autonomous.
  var AUTONOMY_LEVELS = ["MANUAL", "ASSISTED", "SUPERVISED_AUTO", "AUTO_INTERNAL"];

  // Health vocabulary. UNKNOWN is the default: no health evidence
  // exists until a heartbeat or a check records it.
  var HEALTH_STATES = ["UNKNOWN", "HEALTHY", "DEGRADED", "UNHEALTHY"];

  // Warnings and errors are append-only and bounded: the newest 50
  // entries are kept, the oldest are dropped.
  var MAX_WARNINGS = 50;
  var MAX_ERRORS = 50;

  var AUDIT_MAX = 200;
  var MAX_WORKERS = 200;

  // ---- Vocabularies (reused, never reinvented) ---------------------------

  // Role labels come from BotOpsModel when loaded. Roles in this engine
  // are descriptive assignment labels (including intelligence domains
  // such as "Asset Intelligence" and "Network Intelligence"), never
  // identities — so any non-empty string is a valid role here; the
  // BotOpsModel labels are exposed for callers that want the closed
  // set, not enforced as the only roles.
  function knownRoleLabels() {
    if (G.BotOpsModel && Array.isArray(G.BotOpsModel.ROLE_LABELS)) {
      return G.BotOpsModel.ROLE_LABELS.slice();
    }
    return ["Research", "Risk", "Yield", "Routing", "Security",
      "Builder", "Analysis", "Monitoring"];
  }

  // Permissions reuse StarCommand.PERMISSIONS when loaded, else the
  // same closed list. TRANSACTIONAL is in the list only so it can be
  // recognised and refused: it is never granted by this engine.
  var FALLBACK_PERMISSIONS = ["INFORMATIONAL", "NAVIGATIONAL",
    "READ_ONLY", "ASSISTED", "APPROVAL_REQUIRED", "TRANSACTIONAL",
    "UNAVAILABLE"];

  function knownPermissions() {
    if (G.StarCommand && G.StarCommand.PERMISSIONS) {
      var out = [];
      var p = G.StarCommand.PERMISSIONS;
      for (var k in p) {
        if (Object.prototype.hasOwnProperty.call(p, k) && typeof p[k] === "string") {
          out.push(p[k]);
        }
      }
      if (out.length) return out;
    }
    return FALLBACK_PERMISSIONS.slice();
  }

  // Secret-looking content is never stored in a worker record. Same
  // shape as BotOpsModel's SECRET_PATTERN: keys / passwords / private
  // keys / issued tokens, not ordinary words (a bare "token" is a
  // legitimate crypto term and is NOT matched).
  var SECRET_PATTERN = /(api[_-]?key|secret|password|passwd|private[_-]?key|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-live-[a-z0-9]+|ghp_[a-z0-9]+|github_pat_[a-z0-9_]+|xox[baprs]-[a-z0-9-]+)/i;

  // ---- Helpers ------------------------------------------------------------

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

  function clone(value) {
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.slice();
    var out = {};
    var key;
    for (key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) out[key] = value[key];
    }
    return out;
  }

  function cloneWorker(worker) {
    if (!worker) return null;
    var out = clone(worker);
    out.tools = Array.isArray(worker.tools) ? worker.tools.slice() : [];
    // Spec aliases: the canonical spec name and the historical name
    // always carry the same value. A record read back without one of
    // them is normalised here so callers never see a disagreement.
    out.toolAssignments = Array.isArray(worker.toolAssignments)
      ? worker.toolAssignments.slice() : out.tools.slice();
    out.permissions = Array.isArray(worker.permissions) ? worker.permissions.slice() : [];
    out.permissionProfile = Array.isArray(worker.permissionProfile)
      ? worker.permissionProfile.slice() : out.permissions.slice();
    out.history = Array.isArray(worker.history) ? worker.history.slice() : [];
    out.warnings = Array.isArray(worker.warnings) ? worker.warnings.slice() : [];
    out.errors = Array.isArray(worker.errors) ? worker.errors.slice() : [];
    out.currentTaskId = worker.currentTaskId !== undefined
      ? worker.currentTaskId
      : (worker.currentTask !== undefined ? worker.currentTask : null);
    out.currentTask = worker.currentTask !== undefined
      ? worker.currentTask
      : (worker.currentTaskId !== undefined ? worker.currentTaskId : null);
    out.parentPrincipalId = worker.parentPrincipalId !== undefined
      ? worker.parentPrincipalId : worker.parentTribeId;
    out.parentTribeId = worker.parentTribeId !== undefined
      ? worker.parentTribeId : worker.parentPrincipalId;
    out.model = clone(worker.model !== undefined ? worker.model : worker.modelAssignment);
    out.modelAssignment = clone(worker.modelAssignment !== undefined ? worker.modelAssignment : worker.model);
    out.lastHeartbeat = worker.lastHeartbeat !== undefined
      ? worker.lastHeartbeat
      : (worker.lastHeartbeatAt !== undefined ? worker.lastHeartbeatAt : null);
    out.lastHeartbeatAt = worker.lastHeartbeatAt !== undefined
      ? worker.lastHeartbeatAt
      : (worker.lastHeartbeat !== undefined ? worker.lastHeartbeat : null);
    return out;
  }

  function newWorkerId() {
    return "wkr-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  // Value equality for alias comparison: primitives by ===, objects
  // (model assignments) by their JSON shape.
  function sameValue(a, b) {
    if (a === b) return true;
    if (a && b && typeof a === "object" && typeof b === "object") {
      try {
        return JSON.stringify(a) === JSON.stringify(b);
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  // Resolves one field given under several names (canonical spec name
  // plus historical aliases). Returns {conflict, value}: conflict is
  // true when two different values were supplied for the same field —
  // the caller rejects that, never silently picks one. A null/undefined
  // value does not count as supplying the field.
  function aliasValue(data, keys) {
    var found;
    var seen = false;
    for (var i = 0; i < keys.length; i++) {
      var v = data[keys[i]];
      if (v !== undefined && v !== null) {
        if (seen && !sameValue(v, found)) return { conflict: true, value: found };
        found = v;
        seen = true;
      }
    }
    return { conflict: false, value: seen ? found : undefined };
  }

  // Warnings / errors entries are {at, message} objects or plain
  // strings; anything else is not a warning/error entry.
  function isWarningList(value) {
    if (!Array.isArray(value)) return false;
    for (var i = 0; i < value.length; i++) {
      var e = value[i];
      if (typeof e === "string") {
        if (!e.trim()) return false;
      } else if (e && typeof e === "object") {
        if (!isNonEmptyString(e.message)) return false;
      } else {
        return false;
      }
    }
    return true;
  }

  function isAngelId(value) {
    if (typeof value !== "string") return false;
    var lower = value.trim().toLowerCase();
    if (ANGEL_IDS.indexOf(lower) !== -1) return true;
    if (lower.indexOf("angel-") === 0) return true;
    // "angel-michael" / "tribe-michael": an Angel name anywhere in the
    // id is an Angel identity, not a Tribe principal.
    for (var i = 0; i < ANGEL_IDS.length; i++) {
      if (lower.indexOf(ANGEL_IDS[i]) !== -1) return true;
    }
    return false;
  }

  // Canonical Tribe id check: string list first (works with no other
  // module loaded), resolved against TribePrincipals when it is loaded.
  // TribePrincipals is consulted, never required: a shape-only fallback
  // keeps spawn working when the parallel module has not landed.
  function isCanonicalTribeId(value) {
    if (typeof value !== "string") return false;
    if (CANONICAL_TRIBE_IDS.indexOf(value) !== -1) return true;
    var tp = G.TribePrincipals;
    if (tp && typeof tp === "object") {
      try {
        if (typeof tp.isCanonicalId === "function" && tp.isCanonicalId(value)) return true;
        if (typeof tp.isValidTribeId === "function" && tp.isValidTribeId(value)) return true;
        if (typeof tp.isTribeId === "function" && tp.isTribeId(value)) return true;
        if (typeof tp.listPrincipals === "function") {
          var list = tp.listPrincipals();
          if (Array.isArray(list)) {
            for (var j = 0; j < list.length; j++) {
              if (list[j] && list[j].id === value) return true;
            }
          }
        }
        if (Array.isArray(tp.PRINCIPALS)) {
          for (var i = 0; i < tp.PRINCIPALS.length; i++) {
            var p = tp.PRINCIPALS[i];
            if (p && (p.id === value || p.principalId === value)) return true;
          }
        }
        if (Array.isArray(tp.ids) && tp.ids.indexOf(value) !== -1) return true;
      } catch (e) {}
    }
    return false;
  }

  // Naming-pool validation. BotNamingPool is consulted when loaded and
  // never required: when absent, a given name is accepted with
  // provenance and approvalState UNKNOWN. When present, the pool's own
  // lookup decides APPROVED vs REQUIRES_VERIFICATION; an uncertain
  // answer is never guessed as approved.
  // Returns { approvalState, note }.
  function checkNameAgainstPool(name) {
    var pool = G.BotNamingPool;
    if (!pool || typeof pool !== "object") {
      return { approvalState: "UNKNOWN", note: "BotNamingPool is not loaded; name accepted with provenance, approvalState UNKNOWN." };
    }
    try {
      if (typeof pool.isApproved === "function") {
        return pool.isApproved(name)
          ? { approvalState: "APPROVED", note: "Name approved in the naming pool." }
          : { approvalState: "REQUIRES_VERIFICATION", note: "Name is not approved in the naming pool; verification required." };
      }
      if (typeof pool.lookup === "function") {
        var found = pool.lookup(name);
        if (found && typeof found === "object") {
          var state = found.approvalState || found.DanielApprovalState || found.state;
          if (state === "APPROVED") return { approvalState: "APPROVED", note: "Name approved in the naming pool." };
          if (state) return { approvalState: "REQUIRES_VERIFICATION", note: "Name record exists in the naming pool with state " + String(state) + "; verification required." };
          return { approvalState: "REQUIRES_VERIFICATION", note: "Name record exists in the naming pool without an approval state; verification required." };
        }
        return { approvalState: "REQUIRES_VERIFICATION", note: "Name was not found in the naming pool; verification required." };
      }
      if (Array.isArray(pool.names)) {
        return pool.names.indexOf(name) !== -1
          ? { approvalState: "APPROVED", note: "Name approved in the naming pool." }
          : { approvalState: "REQUIRES_VERIFICATION", note: "Name was not found in the naming pool; verification required." };
      }
      if (typeof pool.has === "function") {
        return pool.has(name)
          ? { approvalState: "APPROVED", note: "Name approved in the naming pool." }
          : { approvalState: "REQUIRES_VERIFICATION", note: "Name was not found in the naming pool; verification required." };
      }
    } catch (e) {}
    return { approvalState: "UNKNOWN", note: "BotNamingPool is loaded but its lookup shape is not recognised; name accepted with provenance, approvalState UNKNOWN." };
  }

  function findSecretField(worker) {
    var fields = [
      ["canonicalName", worker.canonicalName],
      ["currentRole", worker.currentRole],
      ["currentTask", worker.currentTask],
      ["nameProvenance", typeof worker.nameProvenance === "string" ? worker.nameProvenance : null]
    ];
    var history = Array.isArray(worker.history) ? worker.history : [];
    for (var i = 0; i < history.length; i++) {
      if (history[i] && typeof history[i].note === "string") {
        fields.push(["history[" + i + "].note", history[i].note]);
      }
    }
    for (var j = 0; j < fields.length; j++) {
      if (typeof fields[j][1] === "string" && SECRET_PATTERN.test(fields[j][1])) {
        return fields[j][0];
      }
    }
    return null;
  }

  // ---- In-memory stores (records only; nothing is persisted) -------------

  var workers = [];
  var auditLog = [];

  function appendAudit(entry) {
    auditLog.unshift(entry);
    if (auditLog.length > AUDIT_MAX) auditLog.length = AUDIT_MAX;
  }

  // ---- Validation ---------------------------------------------------------

  // Returns an array of error strings (empty = valid). Never throws.
  function validateWorker(worker) {
    var errors = [];
    if (!worker || typeof worker !== "object") {
      return ["Worker must be an object."];
    }
    if (!isNonEmptyString(worker.workerId)) {
      errors.push("workerId is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(worker.canonicalName)) {
      errors.push("canonicalName is required and must be a non-empty string (use NAME_PENDING when no name is approved).");
    }
    if (!isCanonicalTribeId(worker.parentTribeId)) {
      errors.push("parentTribeId must be one of the 12 canonical Tribe principal IDs: " + CANONICAL_TRIBE_IDS.join(", ") + ".");
    }
    if (isAngelId(worker.parentTribeId)) {
      errors.push("parentTribeId must not be an Angel identity — Angels are not Tribe workers.");
    }
    if (!isNonEmptyString(worker.currentRole)) {
      errors.push("currentRole is required and must be a non-empty string.");
    }
    if (worker.currentTask !== null && !isNonEmptyString(worker.currentTask)) {
      errors.push("currentTask must be a task id string or null.");
    }
    if (worker.currentTaskId !== undefined && worker.currentTaskId !== null &&
        !isNonEmptyString(worker.currentTaskId)) {
      errors.push("currentTaskId must be a task id string or null.");
    }
    if (worker.currentTaskId !== undefined && worker.currentTask !== undefined &&
        worker.currentTaskId !== null && worker.currentTask !== null &&
        worker.currentTaskId !== worker.currentTask) {
      errors.push("currentTaskId and currentTask must agree — they are the same assignment under two names.");
    }
    if (worker.parentPrincipalId !== undefined && worker.parentPrincipalId !== null &&
        worker.parentPrincipalId !== worker.parentTribeId) {
      errors.push("parentPrincipalId and parentTribeId must agree — they are the same principal under two names.");
    }
    if (worker.origin !== undefined && !isNonEmptyString(worker.origin)) {
      errors.push("origin must be a non-empty string describing the spawn provenance.");
    }
    if (worker.autonomyLevel !== undefined &&
        AUTONOMY_LEVELS.indexOf(worker.autonomyLevel) === -1) {
      errors.push("autonomyLevel must be one of: " + AUTONOMY_LEVELS.join(", ") + ".");
    }
    if (worker.health !== undefined && !isNonEmptyString(worker.health)) {
      errors.push("health must be a non-empty string.");
    }
    if (worker.model !== null && worker.model !== undefined) {
      var m = worker.model;
      if (typeof m === "string") {
        if (!m.trim()) errors.push("model must be a non-empty model assignment reference or null.");
      } else if (typeof m === "object") {
        if (!isNonEmptyString(m.modelId) && !isNonEmptyString(m.assignmentId) && !isNonEmptyString(m.id)) {
          errors.push("model object must carry a modelId, assignmentId, or id.");
        }
      } else {
        errors.push("model must be a model-router assignment reference (string or object) or null.");
      }
    }
    if (!Array.isArray(worker.tools) || !isStringArray(worker.tools)) {
      errors.push("tools must be an array of tool ids (strings).");
    }
    if (worker.toolAssignments !== undefined) {
      if (!Array.isArray(worker.toolAssignments) || !isStringArray(worker.toolAssignments)) {
        errors.push("toolAssignments must be an array of tool ids (strings).");
      } else if (Array.isArray(worker.tools) &&
          JSON.stringify(worker.toolAssignments) !== JSON.stringify(worker.tools)) {
        errors.push("toolAssignments and tools must agree — they are the same assignment under two names.");
      }
    }
    if (!Array.isArray(worker.permissions) || !isStringArray(worker.permissions)) {
      errors.push("permissions must be an array of permission strings.");
    } else {
      var known = knownPermissions();
      for (var i = 0; i < worker.permissions.length; i++) {
        if (known.indexOf(worker.permissions[i]) === -1) {
          errors.push("Unknown permission: " + worker.permissions[i] + ".");
        }
        if (worker.permissions[i] === "TRANSACTIONAL") {
          errors.push("TRANSACTIONAL permission is never granted — no transactional capability exists in this cockpit.");
        }
      }
    }
    if (worker.permissionProfile !== undefined) {
      if (!Array.isArray(worker.permissionProfile) || !isStringArray(worker.permissionProfile)) {
        errors.push("permissionProfile must be an array of permission strings.");
      } else if (Array.isArray(worker.permissions) &&
          JSON.stringify(worker.permissionProfile) !== JSON.stringify(worker.permissions)) {
        errors.push("permissionProfile and permissions must agree — they are the same profile under two names.");
      }
    }
    if (worker.modelAssignment !== undefined && !sameValue(worker.modelAssignment, worker.model)) {
      errors.push("modelAssignment and model must agree — they are the same assignment under two names.");
    }
    if (WORKER_STATES.indexOf(worker.status) === -1) {
      errors.push("status must be one of: " + WORKER_STATES.join(", ") + ".");
    }
    if (!Array.isArray(worker.history)) {
      errors.push("history must be an array of entries.");
    }
    if (worker.lastHeartbeatAt !== null && worker.lastHeartbeatAt !== undefined &&
        typeof worker.lastHeartbeatAt !== "number") {
      errors.push("lastHeartbeatAt must be a millisecond timestamp or null.");
    }
    if (worker.lastHeartbeat !== undefined && worker.lastHeartbeat !== null &&
        typeof worker.lastHeartbeat !== "number") {
      errors.push("lastHeartbeat must be a millisecond timestamp or null.");
    }
    if (worker.lastHeartbeat !== undefined && worker.lastHeartbeatAt !== undefined &&
        worker.lastHeartbeat !== null && worker.lastHeartbeatAt !== null &&
        worker.lastHeartbeat !== worker.lastHeartbeatAt) {
      errors.push("lastHeartbeat and lastHeartbeatAt must agree — they are the same heartbeat under two names.");
    }
    if (worker.warnings !== undefined) {
      if (!isWarningList(worker.warnings)) {
        errors.push("warnings must be an array of warning entries (strings or {at, message} objects).");
      } else if (worker.warnings.length > MAX_WARNINGS) {
        errors.push("warnings is bounded to " + MAX_WARNINGS + " entries.");
      }
    }
    if (worker.errors !== undefined) {
      if (!isWarningList(worker.errors)) {
        errors.push("errors must be an array of error entries (strings or {at, message} objects).");
      } else if (worker.errors.length > MAX_ERRORS) {
        errors.push("errors is bounded to " + MAX_ERRORS + " entries.");
      }
    }
    var secretField = findSecretField(worker);
    if (secretField) {
      errors.push("Field " + secretField + " looks like a secret or credential and must not be stored in a worker record.");
    }
    return errors;
  }

  // ---- Lifecycle ----------------------------------------------------------

  function canTransition(from, to) {
    if (typeof from !== "string" || typeof to !== "string") return false;
    var allowed = TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.indexOf(to) !== -1;
  }

  // A worker record is never live, whatever state its record carries:
  // no worker runtime exists in this build.
  function isLiveActive(worker) {
    void worker;
    return false;
  }

  // Real connected worker count. No worker runtime exists, so the
  // honest answer is always zero / not connected — never a made-up
  // number, however many worker records exist.
  function getWorkersActive() {
    return {
      count: 0,
      state: "NOT_CONNECTED",
      note: "No worker runtime is connected. WorkerEngine tracks records only; workers appear here only when a real worker system reports them."
    };
  }

  // ---- Spawn --------------------------------------------------------------

  // Creates a worker RECORD with status SPAWNED and an audit entry. It
  // never claims a live process exists. Throws with every reason listed
  // on invalid input; nothing is stored.
  function spawnWorker(input) {
    var data = input && typeof input === "object" ? input : {};
    var reasons = [];

    // Alias resolution first: the canonical spec name and the
    // historical name are the same field. Two different values for one
    // field are rejected, never silently resolved in favour of one.
    var parent = aliasValue(data, ["parentPrincipalId", "parentTribeId"]);
    if (parent.conflict) {
      reasons.push("parentPrincipalId and parentTribeId must agree — they are the same principal under two names.");
    }
    var parentId = parent.value;
    if (!isCanonicalTribeId(parentId)) {
      reasons.push("parentTribeId must be one of the 12 canonical Tribe principal IDs: " + CANONICAL_TRIBE_IDS.join(", ") + ".");
    }
    if (isAngelId(parentId)) {
      reasons.push("parentTribeId must not be an Angel identity — Angels are not Tribe workers.");
    }
    var task = aliasValue(data, ["currentTaskId", "currentTask", "taskId"]);
    if (task.conflict) {
      reasons.push("currentTaskId, currentTask, and taskId must agree — they are the same assignment under two names.");
    }
    if (task.value !== undefined && !isNonEmptyString(task.value)) {
      reasons.push("taskId must be a non-empty string or omitted.");
    }
    var modelA = aliasValue(data, ["modelAssignment", "model"]);
    if (modelA.conflict) {
      reasons.push("modelAssignment and model must agree — they are the same assignment under two names.");
    }
    var toolsA = aliasValue(data, ["toolAssignments", "tools"]);
    if (toolsA.conflict) {
      reasons.push("toolAssignments and tools must agree — they are the same assignment under two names.");
    }
    if (toolsA.value !== undefined && !isStringArray(toolsA.value)) {
      reasons.push("tools must be an array of tool ids (strings).");
    }
    var permsA = aliasValue(data, ["permissionProfile", "permissions"]);
    if (permsA.conflict) {
      reasons.push("permissionProfile and permissions must agree — they are the same profile under two names.");
    }
    if (permsA.value !== undefined && !isStringArray(permsA.value)) {
      reasons.push("permissions must be an array of permission strings.");
    }
    if (Array.isArray(permsA.value)) {
      for (var i = 0; i < permsA.value.length; i++) {
        if (permsA.value[i] === "TRANSACTIONAL") {
          reasons.push("TRANSACTIONAL permission is never granted — no transactional capability exists in this cockpit.");
        }
      }
    }
    if (modelA.value !== undefined && modelA.value !== null) {
      var m = modelA.value;
      if (typeof m !== "string" && typeof m !== "object") {
        reasons.push("model must be a model-router assignment reference (string or object) or null.");
      }
      if (typeof m === "string" && !m.trim()) {
        reasons.push("model must be a non-empty model assignment reference or null.");
      }
    }
    if (data.canonicalName !== undefined && data.canonicalName !== null &&
        typeof data.canonicalName !== "string") {
      reasons.push("canonicalName must be a string or omitted (NAME_PENDING).");
    }
    if (data.role !== undefined && data.role !== null && !isNonEmptyString(data.role)) {
      reasons.push("role must be a non-empty string.");
    }
    if (data.origin !== undefined && data.origin !== null && !isNonEmptyString(data.origin)) {
      reasons.push("origin must be a non-empty string describing the spawn provenance.");
    }
    if (data.autonomyLevel !== undefined && data.autonomyLevel !== null &&
        AUTONOMY_LEVELS.indexOf(data.autonomyLevel) === -1) {
      reasons.push("autonomyLevel must be one of: " + AUTONOMY_LEVELS.join(", ") + ".");
    }
    if (data.health !== undefined && data.health !== null && !isNonEmptyString(data.health)) {
      reasons.push("health must be a non-empty string.");
    }
    if (reasons.length) {
      throw new Error("Invalid worker spawn: " + reasons.join(" "));
    }

    // Name: use the given name with provenance when provided; when a
    // worker needs a name not yet approved, NAME_PENDING — never invent
    // one. A provided name is validated against the naming pool when
    // loaded; when the pool is absent, approvalState is UNKNOWN.
    var name = isNonEmptyString(data.canonicalName) ? data.canonicalName.trim() : NAME_PENDING;
    var nameCheck = name === NAME_PENDING
      ? { approvalState: "UNKNOWN", note: "No name provided; canonicalName is NAME_PENDING until the owner approves a name." }
      : checkNameAgainstPool(name);

    var stamp = nowIso();
    var taskId = task.value !== undefined ? task.value.trim() : null;
    var modelValue = modelA.value === undefined ? null : clone(modelA.value);
    var toolList = toolsA.value ? toolsA.value.slice() : [];
    var permList = permsA.value ? permsA.value.slice() : ["INFORMATIONAL"];
    var worker = {
      workerId: newWorkerId(),
      canonicalName: name,
      nameProvenance: data.nameProvenance !== undefined ? clone(data.nameProvenance) : null,
      approvalState: nameCheck.approvalState,
      // parentPrincipalId is the canonical spec name; parentTribeId is
      // kept as an alias holding the same value.
      parentPrincipalId: parentId,
      parentTribeId: parentId,
      // Spawn provenance: who/what caused this record. Defaults to the
      // owner; a delegating caller records its own provenance here.
      origin: isNonEmptyString(data.origin) ? data.origin.trim() : "owner-spawned",
      currentRole: isNonEmptyString(data.role) ? data.role.trim() : "Research",
      currentTaskId: taskId,
      currentTask: taskId,
      modelAssignment: clone(modelValue),
      model: clone(modelValue),
      // Tool ids only. Every tool starts UNAVAILABLE until granted via
      // ToolRouter; this list grants nothing by itself.
      toolAssignments: toolList,
      tools: toolList.slice(),
      permissionProfile: permList,
      permissions: permList.slice(),
      autonomyLevel: data.autonomyLevel !== undefined && data.autonomyLevel !== null
        ? data.autonomyLevel : "MANUAL",
      status: "SPAWNED",
      health: isNonEmptyString(data.health) ? data.health.trim() : "UNKNOWN",
      createdAt: stamp,
      updatedAt: stamp,
      // lastHeartbeat is the canonical spec field (millisecond
      // timestamp); lastHeartbeatAt is kept as an alias.
      lastHeartbeat: null,
      lastHeartbeatAt: null,
      lastHeartbeatNote: null,
      // Append-only, bounded (see recordWarning / recordError).
      warnings: [],
      errors: [],
      history: [{
        at: stamp,
        from: null,
        to: "SPAWNED",
        note: "Worker record spawned under " + parentId + ". Record only — no live process exists."
      }]
    };

    var errors = validateWorker(worker);
    if (errors.length) {
      throw new Error("Invalid worker spawn: " + errors.join(" "));
    }

    workers.push(worker);
    if (workers.length > MAX_WORKERS) {
      // Bound the store: drop the oldest COMPLETE/FAILED records first,
      // then the oldest records overall. Never silently drop a live-state
      // record while a terminal one exists.
      var terminalIndex = -1;
      for (var j = 0; j < workers.length; j++) {
        if (workers[j].status === "COMPLETE" || workers[j].status === "FAILED") {
          terminalIndex = j;
          break;
        }
      }
      workers.splice(terminalIndex === -1 ? 0 : terminalIndex, 1);
    }

    // Spawn rule, recorded not executed: every spawn creates a
    // traceable identity/task/audit record.
    appendAudit({
      workerId: worker.workerId,
      parentTribeId: worker.parentTribeId,
      canonicalName: worker.canonicalName,
      role: worker.currentRole,
      taskId: worker.currentTask,
      at: stamp,
      by: typeof data.by === "string" && data.by ? data.by : "star"
    });

    return cloneWorker(worker);
  }

  // ---- Reads --------------------------------------------------------------

  function getWorker(workerId) {
    if (typeof workerId !== "string") return null;
    for (var i = 0; i < workers.length; i++) {
      if (workers[i].workerId === workerId) return cloneWorker(workers[i]);
    }
    return null;
  }

  function listWorkers() {
    return workers.map(cloneWorker);
  }

  // ---- Role change (name persists, role may change) -----------------------

  // Updates currentRole only. canonicalName is never touched: a worker
  // is never renamed to a function. Identity fields (workerId,
  // canonicalName, parentPrincipalId, createdAt) are permanent: a role
  // change touches none of them, and history is only appended to, never
  // rewritten. Throws when the worker does not exist or the role is
  // not a non-empty string; nothing is written.
  function changeRole(workerId, newRole) {
    if (typeof workerId !== "string") {
      throw new Error("changeRole requires a worker id.");
    }
    if (!isNonEmptyString(newRole)) {
      throw new Error("changeRole requires a non-empty role string.");
    }
    var worker = null;
    for (var i = 0; i < workers.length; i++) {
      if (workers[i].workerId === workerId) {
        worker = workers[i];
        break;
      }
    }
    if (!worker) {
      throw new Error("No worker with id " + workerId + ".");
    }
    if (worker.status === "COMPLETE" || worker.status === "FAILED") {
      throw new Error("Cannot change the role of a " + worker.status + " worker.");
    }
    var oldRole = worker.currentRole;
    worker.currentRole = newRole.trim();
    worker.updatedAt = nowIso();
    worker.history.push({
      at: worker.updatedAt,
      from: worker.status,
      to: worker.status,
      note: "Role changed: " + oldRole + " -> " + worker.currentRole + ". Name unchanged: " + worker.canonicalName + "."
    });
    var errors = validateWorker(worker);
    if (errors.length) {
      worker.currentRole = oldRole;
      worker.history.pop();
      throw new Error("Invalid worker: " + errors.join(" "));
    }
    return cloneWorker(worker);
  }

  // ---- State transitions --------------------------------------------------

  function transitionWorker(workerId, to, note) {
    if (typeof workerId !== "string") {
      throw new Error("transitionWorker requires a worker id.");
    }
    if (WORKER_STATES.indexOf(to) === -1) {
      throw new Error("Unknown worker state: " + to + ".");
    }
    var worker = null;
    for (var i = 0; i < workers.length; i++) {
      if (workers[i].workerId === workerId) {
        worker = workers[i];
        break;
      }
    }
    if (!worker) {
      throw new Error("No worker with id " + workerId + ".");
    }
    if (!canTransition(worker.status, to)) {
      throw new Error("Illegal worker transition: " + worker.status + " -> " + to + " is not allowed.");
    }
    var from = worker.status;
    worker.status = to;
    worker.updatedAt = nowIso();
    worker.history.push({
      at: worker.updatedAt,
      from: from,
      to: to,
      note: typeof note === "string" ? note : ""
    });
    var errors = validateWorker(worker);
    if (errors.length) {
      worker.status = from;
      worker.history.pop();
      throw new Error("Invalid worker: " + errors.join(" "));
    }
    return cloneWorker(worker);
  }

  // ---- Heartbeat ----------------------------------------------------------

  // Records a heartbeat: lastHeartbeatAt (ms) and an optional note.
  // `at` may be a millisecond timestamp or an ISO string; anything else
  // is rejected. A heartbeat is a record-keeping signal only — it never
  // makes a worker live.
  function recordHeartbeat(workerId, input) {
    if (typeof workerId !== "string") {
      throw new Error("recordHeartbeat requires a worker id.");
    }
    var worker = null;
    for (var i = 0; i < workers.length; i++) {
      if (workers[i].workerId === workerId) {
        worker = workers[i];
        break;
      }
    }
    if (!worker) {
      throw new Error("No worker with id " + workerId + ".");
    }
    var data = input && typeof input === "object" ? input : {};
    var atMs;
    if (typeof data.at === "number" && isFinite(data.at)) {
      atMs = data.at;
    } else if (typeof data.at === "string" && data.at) {
      var parsed = Date.parse(data.at);
      if (isNaN(parsed)) {
        throw new Error("recordHeartbeat requires at as a millisecond timestamp or an ISO date string.");
      }
      atMs = parsed;
    } else if (data.at === undefined || data.at === null) {
      atMs = Date.now();
    } else {
      throw new Error("recordHeartbeat requires at as a millisecond timestamp or an ISO date string.");
    }
    worker.lastHeartbeat = atMs;
    worker.lastHeartbeatAt = atMs;
    worker.lastHeartbeatNote = typeof data.note === "string" ? data.note : null;
    worker.updatedAt = nowIso();
    worker.history.push({
      at: worker.updatedAt,
      from: worker.status,
      to: worker.status,
      note: "Heartbeat recorded" + (worker.lastHeartbeatNote ? ": " + worker.lastHeartbeatNote : ".")
    });
    return cloneWorker(worker);
  }

  // Milliseconds since the last heartbeat, or null when no heartbeat
  // was ever recorded. `nowMs` defaults to Date.now().
  function heartbeatAgeMs(workerId, nowMs) {
    var worker = null;
    for (var i = 0; i < workers.length; i++) {
      if (workers[i].workerId === workerId) {
        worker = workers[i];
        break;
      }
    }
    if (!worker) return null;
    if (typeof worker.lastHeartbeatAt !== "number") return null;
    var now = typeof nowMs === "number" && isFinite(nowMs) ? nowMs : Date.now();
    return now - worker.lastHeartbeatAt;
  }

  // True when the worker has no heartbeat at all, or its last heartbeat
  // is older than HEARTBEAT_STALE_MS. A stale worker is STALE, never
  // assumed active. Unknown worker ids are stale (nothing is known).
  function isStale(workerId, nowMs) {
    var age = heartbeatAgeMs(workerId, nowMs);
    if (age === null) return true;
    return age > HEARTBEAT_STALE_MS;
  }

  // ---- Warnings / errors (append-only, bounded) ---------------------------

  // Appends one {at, message} entry to a worker's warnings or errors
  // list, dropping the oldest entries past the bound. These lists are
  // evidence, not live state: appending never changes the worker's
  // identity, role, or status. Throws on an unknown worker or an empty
  // message; nothing is written.
  function findWorker(workerId) {
    if (typeof workerId !== "string") return null;
    for (var i = 0; i < workers.length; i++) {
      if (workers[i].workerId === workerId) return workers[i];
    }
    return null;
  }

  function appendBounded(list, entry, max) {
    list.push(entry);
    if (list.length > max) list.splice(0, list.length - max);
  }

  function recordWarning(workerId, message) {
    var worker = findWorker(workerId);
    if (!worker) {
      throw new Error("No worker with id " + workerId + ".");
    }
    if (!isNonEmptyString(message)) {
      throw new Error("recordWarning requires a non-empty message string.");
    }
    if (!Array.isArray(worker.warnings)) worker.warnings = [];
    appendBounded(worker.warnings,
      { at: nowIso(), message: message.trim() }, MAX_WARNINGS);
    worker.updatedAt = nowIso();
    return cloneWorker(worker);
  }

  function recordError(workerId, message) {
    var worker = findWorker(workerId);
    if (!worker) {
      throw new Error("No worker with id " + workerId + ".");
    }
    if (!isNonEmptyString(message)) {
      throw new Error("recordError requires a non-empty message string.");
    }
    if (!Array.isArray(worker.errors)) worker.errors = [];
    appendBounded(worker.errors,
      { at: nowIso(), message: message.trim() }, MAX_ERRORS);
    worker.updatedAt = nowIso();
    return cloneWorker(worker);
  }

  // ---- Tools (governed, never granted here) -------------------------------

  // Per-tool availability for a worker. Every tool is UNAVAILABLE until
  // granted via ToolRouter: when ToolRouter is loaded, its grant state
  // is reported; otherwise every tool reports UNAVAILABLE. This module
  // grants nothing and executes nothing.
  function toolAvailability(workerId) {
    var worker = null;
    for (var i = 0; i < workers.length; i++) {
      if (workers[i].workerId === workerId) {
        worker = workers[i];
        break;
      }
    }
    if (!worker) return [];
    var router = G.ToolRouter;
    return worker.tools.map(function (toolId) {
      var availability = "UNAVAILABLE";
      var granted = false;
      if (router && typeof router.getTool === "function") {
        try {
          var tool = router.getTool(toolId);
          if (tool) {
            granted = tool.enabled === true;
            if (typeof tool.availability === "string" && tool.availability) {
              availability = tool.availability;
            } else if (granted) {
              availability = "AVAILABLE";
            }
          }
        } catch (e) {}
      }
      return { toolId: toolId, availability: availability, granted: granted };
    });
  }

  // ---- Removal / reset ----------------------------------------------------

  function removeWorker(workerId) {
    if (typeof workerId !== "string") return false;
    for (var i = 0; i < workers.length; i++) {
      if (workers[i].workerId === workerId) {
        workers.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  function resetEngine() {
    workers = [];
    auditLog = [];
    return true;
  }

  // ---- Summary (honest counts) --------------------------------------------

  // recordsCount is the count of worker RECORDS. liveCount is always 0:
  // no worker runtime is connected, so no record is live, whatever its
  // status says. staleCount counts records whose heartbeat is stale.
  function summary() {
    var byStatus = {};
    var i;
    for (i = 0; i < WORKER_STATES.length; i++) byStatus[WORKER_STATES[i]] = 0;
    var stale = 0;
    for (i = 0; i < workers.length; i++) {
      if (byStatus.hasOwnProperty(workers[i].status)) {
        byStatus[workers[i].status] += 1;
      }
      if (isStale(workers[i].workerId)) stale += 1;
    }
    return {
      recordsCount: workers.length,
      liveCount: 0,
      liveState: "NOT_CONNECTED",
      byStatus: byStatus,
      staleCount: stale,
      auditEntries: auditLog.length,
      note: "WorkerEngine tracks records only. No worker runtime is connected — no worker is live."
    };
  }

  // ---- Audit log ----------------------------------------------------------

  function getAuditLog() {
    return auditLog.map(function (entry) {
      return clone(entry);
    });
  }

  function clearAuditLog() {
    auditLog = [];
    return true;
  }

  G.WorkerEngine = {
    CANONICAL_TRIBE_IDS: CANONICAL_TRIBE_IDS.slice(),
    ANGEL_IDS: ANGEL_IDS.slice(),
    NAME_PENDING: NAME_PENDING,
    WORKER_STATES: WORKER_STATES.slice(),
    AUTONOMY_LEVELS: AUTONOMY_LEVELS.slice(),
    HEALTH_STATES: HEALTH_STATES.slice(),
    MAX_WARNINGS: MAX_WARNINGS,
    MAX_ERRORS: MAX_ERRORS,
    TRANSITIONS: (function () {
      var out = {};
      for (var k in TRANSITIONS) {
        if (Object.prototype.hasOwnProperty.call(TRANSITIONS, k)) out[k] = TRANSITIONS[k].slice();
      }
      return out;
    })(),
    HEARTBEAT_STALE_MS: HEARTBEAT_STALE_MS,
    AUDIT_MAX: AUDIT_MAX,
    MAX_WORKERS: MAX_WORKERS,
    ROLE_LABELS: knownRoleLabels,
    spawnWorker: spawnWorker,
    getWorker: getWorker,
    listWorkers: listWorkers,
    changeRole: changeRole,
    transitionWorker: transitionWorker,
    canTransition: canTransition,
    recordHeartbeat: recordHeartbeat,
    heartbeatAgeMs: heartbeatAgeMs,
    isStale: isStale,
    recordWarning: recordWarning,
    recordError: recordError,
    isLiveActive: isLiveActive,
    toolAvailability: toolAvailability,
    getWorkersActive: getWorkersActive,
    validateWorker: validateWorker,
    removeWorker: removeWorker,
    summary: summary,
    getAuditLog: getAuditLog,
    clearAuditLog: clearAuditLog,
    resetEngine: resetEngine
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
