/* MTI6-GTADWIY-COCKPIT — Bot Operations model (overnight shift, Priorities 4 + 5)
 *
 * Structural model ONLY. No DOM, no network, no secrets, no live workers.
 *
 * Truth rules enforced here (do not weaken them):
 * - WORKERS ACTIVE is always 0. No worker orchestration is connected, so
 *   no worker count is ever fabricated.
 * - The 12 Tribe slots stay UNASSIGNED with no invented names. A principal
 *   is named only by owner approval; describeBot() reports name: null
 *   until then.
 * - Role labels (Research, Risk, Yield, Routing, Security, Builder,
 *   Analysis, Monitoring) are assignment roles, never bot names and never
 *   permanent identities.
 * - A task model is NOT a live worker. ACTIVE is a legal state in the
 *   transition map, but isLiveActive() returns false always in this build
 *   because no worker runtime exists — an ACTIVE record must never be
 *   displayed as live activity.
 * - Worker tasks live in localStorage under mti6_worker_tasks_v1. This
 *   store is SEPARATE from Mission Control user tasks, which live in the
 *   IndexedDB "tasks" store (js/modules/tasks.js) with different statuses
 *   ("Not Started", "In Progress", "Blocked", "Done") and a different
 *   purpose. Do not merge the two stores, and do not confuse a worker
 *   task with a user task.
 */
(function (global) {
  "use strict";

  var STORE_KEY = "mti6_worker_tasks_v1";
  var MAX_TASKS = 100;

  // A Tribe principal is a named principal agent (named only by owner
  // approval). A worker is a dynamically scalable task worker that exists
  // only when a real worker system reports it — none does in this build.
  var BOT_KINDS = {
    PRINCIPAL: "principal",
    WORKER: "worker"
  };

  var TASK_STATES = [
    "UNASSIGNED",
    "QUEUED",
    "WAITING",
    "ACTIVE",
    "BLOCKED",
    "PAUSED",
    "COMPLETE",
    "FAILED",
    "CANCELED"
  ];

  // Strict allowlist. No transitions out of COMPLETE / FAILED / CANCELED.
  var TRANSITIONS = {
    UNASSIGNED: ["QUEUED"],
    QUEUED: ["WAITING", "ACTIVE", "CANCELED"],
    WAITING: ["ACTIVE", "BLOCKED", "PAUSED", "CANCELED"],
    ACTIVE: ["BLOCKED", "PAUSED", "COMPLETE", "FAILED", "CANCELED"],
    BLOCKED: ["WAITING", "CANCELED"],
    PAUSED: ["WAITING", "CANCELED"],
    COMPLETE: [],
    FAILED: [],
    CANCELED: []
  };

  var KNOWN_ROLE_LABELS = [
    "Research",
    "Risk",
    "Yield",
    "Routing",
    "Security",
    "Builder",
    "Analysis",
    "Monitoring"
  ];

  var APPROVAL_STATUSES = ["PENDING", "APPROVED", "DENIED"];

  // Canonical identity kinds (owner spec §44). STAR is not a kind here:
  // STAR sits above the Tribe workforce and is never a principal or a
  // worker, so describeIdentity never returns a STAR record.
  var IDENTITY_KINDS = ["principal", "worker"];

  // Autonomy levels for identity records, same closed set as
  // WorkerEngine. "UNKNOWN" is also accepted by the identity validator
  // as a report of ignorance (describeIdentity emits it when no level
  // is known); it is never an assignable level — spawnWorker only
  // accepts the four levels below and defaults to MANUAL.
  var IDENTITY_AUTONOMY_LEVELS = ["MANUAL", "ASSISTED", "SUPERVISED_AUTO", "AUTO_INTERNAL"];

  // Fields that look like a claim that a live worker/runtime is running.
  // A task in state ACTIVE carrying any of these is rejected: ACTIVE is a
  // model state, never evidence that a worker is live.
  var LIVE_CLAIM_FIELDS = ["live", "isLive", "liveWorkerId", "runtimeId"];

  // Secret-looking content is never stored in a worker task. The pattern
  // covers keys/passwords/private keys/issued tokens, not ordinary words
  // (a bare "token" is a legitimate crypto term and is NOT matched).
  var SECRET_PATTERN = /(api[_-]?key|secret|password|passwd|private[_-]?key|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-live-[a-z0-9]+|ghp_[a-z0-9]+|github_pat_[a-z0-9_]+|xox[baprs]-[a-z0-9-]+)/i;

  function nowIso() {
    return new Date().toISOString();
  }

  function roleLabels() {
    if (global.Tribes && Array.isArray(global.Tribes.ROLE_LABELS) && global.Tribes.ROLE_LABELS.length) {
      return global.Tribes.ROLE_LABELS.slice();
    }
    return KNOWN_ROLE_LABELS.slice();
  }

  function isTribeId(value) {
    if (typeof value !== "string") return false;
    var m = /^tribe-(\d{2})$/.exec(value);
    if (!m) return false;
    var n = parseInt(m[1], 10);
    return n >= 1 && n <= 12;
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

  function findSecretField(task) {
    var fields = [
      ["title", task.title],
      ["blockerReason", task.blockerReason],
      ["completionEvidence", task.completionEvidence]
    ];
    var inputs = Array.isArray(task.inputs) ? task.inputs : [];
    var outputs = Array.isArray(task.outputs) ? task.outputs : [];
    var i;
    for (i = 0; i < inputs.length; i++) fields.push(["inputs[" + i + "]", inputs[i]]);
    for (i = 0; i < outputs.length; i++) fields.push(["outputs[" + i + "]", outputs[i]]);
    for (i = 0; i < fields.length; i++) {
      if (typeof fields[i][1] === "string" && SECRET_PATTERN.test(fields[i][1])) {
        return fields[i][0];
      }
    }
    return null;
  }

  // ---- Bot identity -------------------------------------------------------

  // Truthful detail record for one Tribe principal slot. Never invents a
  // name: an unassigned slot reports name null, status UNASSIGNED, and
  // liveStatus NOT_CONNECTED. An assigned slot (name present) reports the
  // stored fields, but liveStatus still stays NOT_CONNECTED unless a real
  // connection exists — none does in this build.
  function describeBot(slot) {
    if (!slot || typeof slot !== "object") return null;
    var assigned = isNonEmptyString(slot.name);
    return {
      id: typeof slot.id === "string" ? slot.id : null,
      label: typeof slot.label === "string" ? slot.label : "Tribe",
      kind: BOT_KINDS.PRINCIPAL,
      name: assigned ? slot.name : null,
      status: assigned ? (typeof slot.status === "string" ? slot.status : "UNASSIGNED") : "UNASSIGNED",
      role: assigned ? (typeof slot.role === "string" ? slot.role : null) : null,
      assignment: assigned ? (typeof slot.assignment === "string" ? slot.assignment : null) : null,
      liveStatus: "NOT_CONNECTED",
      inputs: typeof slot.inputs === "string" ? slot.inputs : "—",
      outputs: typeof slot.outputs === "string" ? slot.outputs : "—",
      progress: typeof slot.progress === "string" ? slot.progress : "—",
      dependencies: typeof slot.dependencies === "string" ? slot.dependencies : "—",
      warnings: "None reported — no live data",
      costs: "No tracked data",
      results: "No tracked data",
      history: "No logs — nothing has run"
    };
  }

  // Real connected worker count. No worker orchestration exists yet, so
  // the honest answer is zero / not connected — never a made-up number.
  // Delegates to Tribes when loaded (same truth), and forces count 0.
  function getWorkersActive() {
    var note = "No worker orchestration is connected. Workers appear here only when a real worker system reports them.";
    if (global.Tribes && typeof global.Tribes.getWorkersActive === "function") {
      try {
        var delegated = global.Tribes.getWorkersActive();
        if (delegated && typeof delegated === "object" && typeof delegated.note === "string" && delegated.note) {
          note = delegated.note;
        }
      } catch (e) {}
    }
    return { count: 0, state: "NOT_CONNECTED", note: note };
  }

  // ---- Canonical identity records (owner spec §44) -----------------------

  // Value equality for alias comparison: primitives by ===, objects by
  // their JSON shape.
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

  // Full canonical identity record for one principal or worker. Every
  // field is always present: unknown values are null (or "UNKNOWN" for
  // the closed-set fields autonomyLevel/status/health, or [] for the
  // list fields), never invented. The record is a snapshot: callers
  // mutating it never touch the underlying registry.
  //
  //   principal: looked up in TribePrincipals when loaded; a principal
  //     reports its displayName as both displayName and canonicalName,
  //     STAR 3.0 as organizationalParent (STAR sits above / coordinating
  //     the Tribe workforce), its currentRole/currentTask, status
  //     "ACTIVE" (identity active — NOT a claim of live activity),
  //     health "UNKNOWN", and its history. model/tools/permissions are
  //     null/[]: a principal holds no model or tool assignment.
  //   worker: looked up in WorkerEngine when loaded; a worker reports
  //     its canonicalName, its parent principal as organizationalParent,
  //     its currentRole, modelAssignment, toolAssignments,
  //     permissionProfile, autonomyLevel, currentTask, status, health,
  //     and history.
  //   Unknown id, or the registry not loaded: the full record is still
  //     returned with UNKNOWN/null values — never null, never invented.
  //   Invalid kind or id: null (not an identity that can be described).
  function describeIdentity(kind, id) {
    if (typeof kind !== "string" || IDENTITY_KINDS.indexOf(kind) === -1) return null;
    if (!isNonEmptyString(id)) return null;
    var cleanId = id.trim();
    var record = {
      kind: kind,
      id: cleanId,
      displayName: null,
      canonicalName: null,
      organizationalParent: null,
      role: null,
      model: null,
      tools: [],
      permissions: [],
      autonomyLevel: "UNKNOWN",
      currentTask: null,
      status: "UNKNOWN",
      health: "UNKNOWN",
      history: []
    };
    if (kind === BOT_KINDS.PRINCIPAL) {
      var tp = global.TribePrincipals;
      var p = null;
      if (tp && typeof tp.getPrincipal === "function") {
        try { p = tp.getPrincipal(cleanId); } catch (e) { p = null; }
      }
      if (p) {
        record.displayName = typeof p.displayName === "string" ? p.displayName : null;
        record.canonicalName = record.displayName;
        record.organizationalParent = "STAR 3.0";
        record.role = typeof p.currentRole === "string" ? p.currentRole : null;
        record.currentTask = typeof p.currentTask === "string" ? p.currentTask : null;
        record.status = typeof p.status === "string" ? p.status : "UNKNOWN";
        record.history = Array.isArray(p.history) ? p.history.slice() : [];
      }
      return record;
    }
    var we = global.WorkerEngine;
    var w = null;
    if (we && typeof we.getWorker === "function") {
      try { w = we.getWorker(cleanId); } catch (e) { w = null; }
    }
    if (w) {
      record.displayName = typeof w.canonicalName === "string" ? w.canonicalName : null;
      record.canonicalName = record.displayName;
      record.organizationalParent = typeof w.parentPrincipalId === "string" ? w.parentPrincipalId
        : (typeof w.parentTribeId === "string" ? w.parentTribeId : null);
      record.role = typeof w.currentRole === "string" ? w.currentRole : null;
      record.model = w.modelAssignment !== undefined && w.modelAssignment !== null
        ? w.modelAssignment : (w.model !== undefined ? w.model : null);
      record.tools = Array.isArray(w.toolAssignments) ? w.toolAssignments.slice()
        : (Array.isArray(w.tools) ? w.tools.slice() : []);
      record.permissions = Array.isArray(w.permissionProfile) ? w.permissionProfile.slice()
        : (Array.isArray(w.permissions) ? w.permissions.slice() : []);
      record.autonomyLevel = typeof w.autonomyLevel === "string" ? w.autonomyLevel : "UNKNOWN";
      record.currentTask = typeof w.currentTaskId === "string" ? w.currentTaskId
        : (typeof w.currentTask === "string" ? w.currentTask : null);
      record.status = typeof w.status === "string" ? w.status : "UNKNOWN";
      record.health = typeof w.health === "string" ? w.health : "UNKNOWN";
      record.history = Array.isArray(w.history) ? w.history.slice() : [];
    }
    return record;
  }

  // Validates a canonical identity record. Returns an array of error
  // strings (empty = valid). Never throws.
  //
  // Field separation is enforced two ways:
  //   - Statically: a name/id that equals the current role, the model
  //     assignment, or the body/avatar means an assignment change
  //     overwrote the identity (a worker renamed to a function, to a
  //     model, or to a body). Alias fields (id/workerId/principalId,
  //     canonicalName/displayName, parentPrincipalId/parentTribeId)
  //     must agree with each other — one identity, one value.
  //   - Against a previous record (optional 2nd argument): the identity
  //     fields (id, canonicalName, parentPrincipalId, createdAt) are
  //     permanent. Only role, task, model, body, tools, permissions,
  //     autonomyLevel, status, health, and history may change. Any
  //     identity-field change is rejected with the old and new values.
  function validateIdentityRecord(record, previous) {
    var errors = [];
    try {
      if (!record || typeof record !== "object") {
        return ["Identity record must be an object."];
      }
      if (typeof record.kind !== "string" || IDENTITY_KINDS.indexOf(record.kind) === -1) {
        errors.push("kind must be \"principal\" or \"worker\".");
      }
      var ids = [];
      ["id", "workerId", "principalId"].forEach(function (field) {
        if (record[field] !== undefined && record[field] !== null) ids.push(record[field]);
      });
      if (!ids.length) {
        errors.push("Identity record needs an id (id, workerId, or principalId).");
      } else {
        for (var i = 0; i < ids.length; i++) {
          if (!isNonEmptyString(ids[i])) {
            errors.push("Identity id fields must be non-empty strings.");
            break;
          }
        }
        for (var j = 1; j < ids.length; j++) {
          if (ids[j] !== ids[0]) {
            errors.push("Identity id fields disagree (" + ids[0] + " vs " + ids[j] + ") — one identity, one id.");
            break;
          }
        }
      }
      var idValue = ids.length ? ids[0] : null;
      if (record.canonicalName !== undefined && record.displayName !== undefined &&
          record.canonicalName !== null && record.displayName !== null &&
          record.canonicalName !== record.displayName) {
        errors.push("canonicalName and displayName disagree — one identity, one name.");
      }
      var name = record.canonicalName !== undefined ? record.canonicalName : record.displayName;
      if (name !== undefined && name !== null && !isNonEmptyString(name)) {
        errors.push("canonicalName must be a non-empty string or null (use NAME_PENDING when no name is approved).");
      }
      var modelRef = null;
      if (typeof record.model === "string") modelRef = record.model;
      else if (record.modelAssignment && typeof record.modelAssignment === "string") modelRef = record.modelAssignment;
      if (isNonEmptyString(name)) {
        if (isNonEmptyString(record.currentRole) && name === record.currentRole) {
          errors.push("canonicalName equals currentRole — the identity was overwritten by a role change. A worker is never renamed to a function.");
        }
        if (modelRef !== null && name === modelRef) {
          errors.push("canonicalName equals the model assignment — the identity was overwritten by a model change.");
        }
        if ((typeof record.body === "string" && name === record.body) ||
            (typeof record.avatar === "string" && name === record.avatar)) {
          errors.push("canonicalName equals the body/avatar — the identity was overwritten by a body change. Identity and body are separate.");
        }
      }
      if (isNonEmptyString(idValue)) {
        if (isNonEmptyString(record.currentRole) && idValue === record.currentRole) {
          errors.push("id equals currentRole — the identity id was overwritten by a role change.");
        }
        if (modelRef !== null && idValue === modelRef) {
          errors.push("id equals the model assignment — the identity id was overwritten by a model change.");
        }
      }
      if (record.parentPrincipalId !== undefined && record.parentTribeId !== undefined &&
          record.parentPrincipalId !== null && record.parentTribeId !== null &&
          record.parentPrincipalId !== record.parentTribeId) {
        errors.push("parentPrincipalId and parentTribeId disagree — one parent, one id.");
      }
      if (record.createdAt !== undefined && record.createdAt !== null) {
        if (typeof record.createdAt !== "string" || isNaN(Date.parse(record.createdAt))) {
          errors.push("createdAt must be an ISO date string.");
        }
      }
      if (record.autonomyLevel !== undefined && record.autonomyLevel !== null &&
          record.autonomyLevel !== "UNKNOWN" &&
          IDENTITY_AUTONOMY_LEVELS.indexOf(record.autonomyLevel) === -1) {
        errors.push("autonomyLevel must be one of: " + IDENTITY_AUTONOMY_LEVELS.join(", ") + " (or UNKNOWN when no level is known).");
      }
      if (record.history !== undefined && !Array.isArray(record.history)) {
        errors.push("history must be an array.");
      }
      if (previous && typeof previous === "object") {
        var prevId = previous.id !== undefined ? previous.id
          : (previous.workerId !== undefined ? previous.workerId : previous.principalId);
        var prevName = previous.canonicalName !== undefined ? previous.canonicalName : previous.displayName;
        var prevParent = previous.parentPrincipalId !== undefined ? previous.parentPrincipalId : previous.parentTribeId;
        var newParent = record.parentPrincipalId !== undefined ? record.parentPrincipalId : record.parentTribeId;
        if (idValue !== undefined && idValue !== null && prevId !== undefined && prevId !== null && idValue !== prevId) {
          errors.push("Identity id changed (" + prevId + " -> " + idValue + ") — identity is permanent; only role, task, model, or body may change.");
        }
        if (name !== undefined && name !== null && prevName !== undefined && prevName !== null && name !== prevName) {
          errors.push("canonicalName changed (" + prevName + " -> " + name + ") — identity is permanent; a worker is never renamed.");
        }
        if (newParent !== undefined && newParent !== null && prevParent !== undefined && prevParent !== null && newParent !== prevParent) {
          errors.push("parentPrincipalId changed (" + prevParent + " -> " + newParent + ") — the organizational parent is part of the identity.");
        }
        if (record.createdAt !== undefined && record.createdAt !== null &&
            previous.createdAt !== undefined && previous.createdAt !== null &&
            record.createdAt !== previous.createdAt) {
          errors.push("createdAt changed — the spawn record is permanent.");
        }
      }
    } catch (e) {
      errors.push("validateIdentityRecord failed: " + (e && e.message ? e.message : String(e)));
    }
    return errors;
  }

  // ---- Task state machine -------------------------------------------------

  function canTransition(from, to) {
    if (typeof from !== "string" || typeof to !== "string") return false;
    var allowed = TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.indexOf(to) !== -1;
  }

  // ACTIVE is a legal state in the model, but it must never be DISPLAYED
  // as live activity: no worker runtime exists in this build, so no task
  // is ever live, whatever state its record carries.
  function isLiveActive(task) {
    return false;
  }

  // ---- Task validation ----------------------------------------------------

  // Returns an array of error strings (empty = valid). Never throws.
  function validateTask(task) {
    var errors = [];
    if (!task || typeof task !== "object") {
      return ["Task must be an object."];
    }
    if (!isNonEmptyString(task.title)) {
      errors.push("title is required and must be a non-empty string.");
    }
    if (typeof task.role !== "string" || roleLabels().indexOf(task.role) === -1) {
      errors.push("role must be one of: " + roleLabels().join(", ") + ".");
    }
    if (task.tribeId !== null && !isTribeId(task.tribeId)) {
      errors.push("tribeId must be a tribe-01..tribe-12 id or null.");
    }
    if (TASK_STATES.indexOf(task.state) === -1) {
      errors.push("state must be one of: " + TASK_STATES.join(", ") + ".");
    }
    if (!Array.isArray(task.dependencies) || !isStringArray(task.dependencies)) {
      errors.push("dependencies must be an array of task ids (strings).");
    }
    if (typeof task.approvalRequired !== "boolean") {
      errors.push("approvalRequired must be a boolean.");
    }
    if (APPROVAL_STATUSES.indexOf(task.approvalStatus) === -1) {
      errors.push("approvalStatus must be one of: " + APPROVAL_STATUSES.join(", ") + ".");
    }
    if (!Array.isArray(task.inputs) || !isStringArray(task.inputs)) {
      errors.push("inputs must be an array of strings.");
    }
    if (!Array.isArray(task.outputs) || !isStringArray(task.outputs)) {
      errors.push("outputs must be an array of strings.");
    }
    if (task.blockerReason !== null && typeof task.blockerReason !== "string") {
      errors.push("blockerReason must be a string or null.");
    }
    if (!Array.isArray(task.history)) {
      errors.push("history must be an array of transition entries.");
    }
    // Completion evidence only counts at completion: a non-COMPLETE task
    // carrying evidence is malformed, not "partly done".
    if (task.state !== "COMPLETE" && task.completionEvidence !== null && task.completionEvidence !== undefined) {
      errors.push("completionEvidence is only valid on a COMPLETE task.");
    }
    if (task.state === "COMPLETE" && !isNonEmptyString(task.completionEvidence)) {
      errors.push("A COMPLETE task requires non-empty completionEvidence.");
    }
    // Spec identity fields (owner spec §44). All are optional on a
    // task; when present they must be well-formed, and the alias pairs
    // (taskId/id, status/state, evidence/completionEvidence) must agree
    // — one task, one id, one state, one completion record.
    if (task.taskId !== undefined && task.taskId !== null) {
      if (!isNonEmptyString(task.taskId)) {
        errors.push("taskId must be a non-empty string or null.");
      } else if (isNonEmptyString(task.id) && task.taskId !== task.id) {
        errors.push("taskId must match id — one task, one id.");
      }
    }
    if (task.status !== undefined && task.status !== null) {
      if (TASK_STATES.indexOf(task.status) === -1) {
        errors.push("status must be one of: " + TASK_STATES.join(", ") + ".");
      } else if (task.status !== task.state) {
        errors.push("status must match state — they are the same state under two names.");
      }
    }
    if (task.principal !== undefined && task.principal !== null && !isNonEmptyString(task.principal)) {
      errors.push("principal must be a Tribe principal id string or null.");
    }
    if (task.worker !== undefined && task.worker !== null && !isNonEmptyString(task.worker)) {
      errors.push("worker must be a worker id string or null.");
    }
    if (task.goal !== undefined && task.goal !== null && !isNonEmptyString(task.goal)) {
      errors.push("goal must be a non-empty string or null.");
    }
    if (task.dataProvenance !== undefined && task.dataProvenance !== null && !isNonEmptyString(task.dataProvenance)) {
      errors.push("dataProvenance must be a non-empty string or null.");
    }
    if (task.model !== undefined && task.model !== null) {
      if (typeof task.model === "string" && !task.model.trim()) {
        errors.push("model must be a non-empty model assignment reference or null.");
      } else if (typeof task.model !== "string" && typeof task.model !== "object") {
        errors.push("model must be a model-router assignment reference (string or object) or null.");
      }
    }
    if (task.tools !== undefined && !isStringArray(task.tools)) {
      errors.push("tools must be an array of tool ids (strings).");
    }
    if (task.permission !== undefined && task.permission !== null && !isNonEmptyString(task.permission)) {
      errors.push("permission must be a non-empty string or null.");
    }
    if (task.start !== undefined && task.start !== null && typeof task.start !== "string") {
      errors.push("start must be an ISO date string or null.");
    }
    if (task.heartbeat !== undefined && task.heartbeat !== null &&
        typeof task.heartbeat !== "string" && typeof task.heartbeat !== "number") {
      errors.push("heartbeat must be an ISO date string, a millisecond timestamp, or null.");
    }
    if (task.evidence !== undefined && task.evidence !== null) {
      if (task.state !== "COMPLETE") {
        errors.push("evidence is only valid on a COMPLETE task.");
      }
      if (task.completionEvidence !== undefined && task.completionEvidence !== null &&
          task.evidence !== task.completionEvidence) {
        errors.push("evidence must match completionEvidence — one completion record, one evidence field.");
      }
    }
    if (task.cost !== undefined && task.cost !== null &&
        typeof task.cost !== "string" && typeof task.cost !== "number" && typeof task.cost !== "object") {
      errors.push("cost must be a string, number, object, or null.");
    }
    if (task.warnings !== undefined && !isStringArray(task.warnings)) {
      errors.push("warnings must be an array of strings.");
    }
    if (task.errors !== undefined && !isStringArray(task.errors)) {
      errors.push("errors must be an array of strings.");
    }
    if (task.completion !== undefined && task.completion !== null) {
      if (typeof task.completion !== "string" || isNaN(Date.parse(task.completion))) {
        errors.push("completion must be an ISO date string or null.");
      } else if (task.state !== "COMPLETE") {
        errors.push("completion is only valid on a COMPLETE task.");
      }
    }
    if (task.verification !== undefined && task.verification !== null && !isNonEmptyString(task.verification)) {
      errors.push("verification must be a non-empty string or null.");
    }
    // An ACTIVE record that claims a live worker/runtime is rejected:
    // no worker runtime exists, so no task can honestly claim one.
    if (task.state === "ACTIVE") {
      for (var i = 0; i < LIVE_CLAIM_FIELDS.length; i++) {
        var field = LIVE_CLAIM_FIELDS[i];
        if (task[field] === true || isNonEmptyString(task[field])) {
          errors.push("state ACTIVE must not claim a live worker or runtime (" + field + " is set, but no worker runtime exists).");
          break;
        }
      }
      if (task.liveStatus === "CONNECTED" || task.liveStatus === "LIVE") {
        errors.push("state ACTIVE must not claim liveStatus " + task.liveStatus + " — no worker runtime exists.");
      }
    }
    var secretField = findSecretField(task);
    if (secretField) {
      errors.push("Field " + secretField + " looks like a secret or credential and must not be stored in a worker task.");
    }
    return errors;
  }

  function newTaskId() {
    return "wt-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  // Validates input and returns a new task record. Rejects invalid input
  // with an Error listing every reason — never creates a malformed task.
  // No task is ever created with state ACTIVE.
  function createWorkerTask(input) {
    var reasons = [];
    var data = input && typeof input === "object" ? input : {};
    if (!isNonEmptyString(data.title)) {
      reasons.push("title is required and must be a non-empty string.");
    }
    if (typeof data.role !== "string" || roleLabels().indexOf(data.role) === -1) {
      reasons.push("role must be one of: " + roleLabels().join(", ") + ".");
    }
    if (data.tribeId !== undefined && data.tribeId !== null && !isTribeId(data.tribeId)) {
      reasons.push("tribeId must be a tribe-01..tribe-12 id or null.");
    }
    if (data.dependencies !== undefined && !isStringArray(data.dependencies)) {
      reasons.push("dependencies must be an array of task ids (strings).");
    }
    if (data.approvalRequired !== undefined && typeof data.approvalRequired !== "boolean") {
      reasons.push("approvalRequired must be a boolean.");
    }
    if (data.inputs !== undefined && !isStringArray(data.inputs)) {
      reasons.push("inputs must be an array of strings.");
    }
    if (data.outputs !== undefined && !isStringArray(data.outputs)) {
      reasons.push("outputs must be an array of strings.");
    }
    // Spec task fields (owner spec §44). All optional; a new task must
    // not carry completion fields (completion/evidence are set only by
    // the completing transition) and its status must be UNASSIGNED.
    if (data.taskId !== undefined && data.taskId !== null && !isNonEmptyString(data.taskId)) {
      reasons.push("taskId must be a non-empty string or omitted.");
    }
    if (data.principal !== undefined && data.principal !== null && !isNonEmptyString(data.principal)) {
      reasons.push("principal must be a Tribe principal id string or null.");
    }
    if (data.worker !== undefined && data.worker !== null && !isNonEmptyString(data.worker)) {
      reasons.push("worker must be a worker id string or null.");
    }
    if (data.goal !== undefined && data.goal !== null && !isNonEmptyString(data.goal)) {
      reasons.push("goal must be a non-empty string or null.");
    }
    if (data.dataProvenance !== undefined && data.dataProvenance !== null && !isNonEmptyString(data.dataProvenance)) {
      reasons.push("dataProvenance must be a non-empty string or null.");
    }
    if (data.model !== undefined && data.model !== null) {
      if (typeof data.model === "string" && !data.model.trim()) {
        reasons.push("model must be a non-empty model assignment reference or null.");
      } else if (typeof data.model !== "string" && typeof data.model !== "object") {
        reasons.push("model must be a model-router assignment reference (string or object) or null.");
      }
    }
    if (data.tools !== undefined && !isStringArray(data.tools)) {
      reasons.push("tools must be an array of tool ids (strings).");
    }
    if (data.permission !== undefined && data.permission !== null && !isNonEmptyString(data.permission)) {
      reasons.push("permission must be a non-empty string or null.");
    }
    if (data.start !== undefined && data.start !== null && typeof data.start !== "string") {
      reasons.push("start must be an ISO date string or null.");
    }
    if (data.heartbeat !== undefined && data.heartbeat !== null &&
        typeof data.heartbeat !== "string" && typeof data.heartbeat !== "number") {
      reasons.push("heartbeat must be an ISO date string, a millisecond timestamp, or null.");
    }
    if (data.cost !== undefined && data.cost !== null &&
        typeof data.cost !== "string" && typeof data.cost !== "number" && typeof data.cost !== "object") {
      reasons.push("cost must be a string, number, object, or null.");
    }
    if (data.warnings !== undefined && !isStringArray(data.warnings)) {
      reasons.push("warnings must be an array of strings.");
    }
    if (data.errors !== undefined && !isStringArray(data.errors)) {
      reasons.push("errors must be an array of strings.");
    }
    if (data.verification !== undefined && data.verification !== null && !isNonEmptyString(data.verification)) {
      reasons.push("verification must be a non-empty string or null.");
    }
    if (data.completion !== undefined && data.completion !== null) {
      reasons.push("completion is set only when a task completes — a new task must not carry it.");
    }
    if (data.evidence !== undefined && data.evidence !== null) {
      reasons.push("evidence is set only when a task completes — a new task must not carry it.");
    }
    if (data.status !== undefined && data.status !== null && data.status !== "UNASSIGNED") {
      reasons.push("status must be UNASSIGNED on a new task.");
    }
    if (reasons.length) {
      throw new Error("Invalid worker task: " + reasons.join(" "));
    }
    var stamp = nowIso();
    // taskId is the task's id: a caller-supplied taskId becomes the id,
    // otherwise the id is generated and taskId mirrors it.
    var taskId = isNonEmptyString(data.taskId) ? data.taskId.trim() : newTaskId();
    var task = {
      id: taskId,
      taskId: taskId,
      title: data.title.trim(),
      role: data.role,
      tribeId: data.tribeId === undefined ? null : data.tribeId,
      state: "UNASSIGNED",
      status: "UNASSIGNED",
      principal: data.principal === undefined ? null : data.principal,
      worker: data.worker === undefined ? null : data.worker,
      goal: data.goal === undefined ? null : data.goal,
      dataProvenance: data.dataProvenance === undefined ? null : data.dataProvenance,
      model: data.model === undefined ? null : data.model,
      tools: data.tools ? data.tools.slice() : [],
      permission: data.permission === undefined ? null : data.permission,
      start: data.start === undefined ? null : data.start,
      heartbeat: data.heartbeat === undefined ? null : data.heartbeat,
      cost: data.cost === undefined ? null : data.cost,
      warnings: data.warnings ? data.warnings.slice() : [],
      errors: data.errors ? data.errors.slice() : [],
      verification: data.verification === undefined ? null : data.verification,
      dependencies: data.dependencies ? data.dependencies.slice() : [],
      // Approval is required by default. There is no read-only flag in
      // this model, so anything created here defaults to approvalRequired
      // true unless the caller explicitly passes false.
      approvalRequired: data.approvalRequired === undefined ? true : data.approvalRequired,
      approvalStatus: "PENDING",
      blockerReason: null,
      inputs: data.inputs ? data.inputs.slice() : [],
      outputs: data.outputs ? data.outputs.slice() : [],
      createdAt: stamp,
      updatedAt: stamp,
      history: [{ at: stamp, from: null, to: "UNASSIGNED", note: "Task created." }],
      completionEvidence: null,
      // evidence mirrors completionEvidence; completion is the ISO
      // timestamp of completion. Both are set only by the completing
      // transition, never at creation.
      evidence: null,
      completion: null
    };
    var errors = validateTask(task);
    if (errors.length) {
      throw new Error("Invalid worker task: " + errors.join(" "));
    }
    return task;
  }

  // ---- Worker-task store (localStorage, separate from user tasks) ---------

  var memoryFallback = [];

  function storage() {
    try {
      if (typeof localStorage !== "undefined" && localStorage) return localStorage;
    } catch (e) {}
    return null;
  }

  function loadAll() {
    var store = storage();
    if (store) {
      try {
        var raw = store.getItem(STORE_KEY);
        if (!raw) return [];
        var parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed;
      } catch (e) {
        return [];
      }
    }
    return memoryFallback.slice();
  }

  function persistAll(tasks) {
    var bounded = tasks.slice(0, MAX_TASKS);
    var store = storage();
    if (store) {
      try {
        store.setItem(STORE_KEY, JSON.stringify(bounded));
      } catch (e) {}
    } else {
      memoryFallback = bounded.slice();
    }
    return bounded;
  }

  function sortNewestFirst(tasks) {
    return tasks.slice().sort(function (a, b) {
      var ta = a && a.createdAt ? String(a.createdAt) : "";
      var tb = b && b.createdAt ? String(b.createdAt) : "";
      if (tb < ta) return -1;
      if (tb > ta) return 1;
      return 0;
    });
  }

  // Newest first, bounded to 100 records.
  function listTasks() {
    return sortNewestFirst(loadAll()).slice(0, MAX_TASKS);
  }

  function getTask(id) {
    if (typeof id !== "string") return null;
    var tasks = loadAll();
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i] && tasks[i].id === id) return tasks[i];
    }
    return null;
  }

  // Writes a task record. A new record must enter as UNASSIGNED; an
  // existing record may only move along an allowed transition (checked
  // with canTransition). An illegal transition throws and nothing is
  // written. Validation errors also throw and nothing is written.
  function saveTask(task) {
    var errors = validateTask(task);
    if (errors.length) {
      throw new Error("Invalid worker task: " + errors.join(" "));
    }
    var tasks = loadAll();
    var existing = null;
    var existingIndex = -1;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i] && tasks[i].id === task.id) {
        existing = tasks[i];
        existingIndex = i;
        break;
      }
    }
    if (!existing) {
      if (task.state !== "UNASSIGNED") {
        throw new Error("Invalid worker task: a new task must start UNASSIGNED, not " + task.state + ".");
      }
      // Prepend: tasks created in the same millisecond share a
      // createdAt timestamp, and the stable newest-first sort must keep
      // the most recently saved one first (so the 100-record bound
      // drops the oldest, never the newest).
      tasks.unshift(task);
    } else {
      if (existing.state !== task.state && !canTransition(existing.state, task.state)) {
        throw new Error("Illegal task transition: " + existing.state + " -> " + task.state + " is not allowed.");
      }
      tasks[existingIndex] = task;
    }
    persistAll(sortNewestFirst(tasks));
    return task;
  }

  // Moves a task to a new state, appending a history entry and updating
  // updatedAt. Setting state COMPLETE requires non-empty
  // completionEvidence, else it throws and nothing is written. Evidence
  // is supplied with the completing transition itself (4th argument):
  // evidence only counts at completion, so a non-COMPLETE record may
  // not carry it, and the completing call is what attaches it. An
  // illegal transition throws and nothing is written.
  function transitionTask(id, to, note, completionEvidence) {
    if (typeof id !== "string") {
      throw new Error("transitionTask requires a task id.");
    }
    if (TASK_STATES.indexOf(to) === -1) {
      throw new Error("Unknown task state: " + to + ".");
    }
    var task = getTask(id);
    if (!task) {
      throw new Error("No worker task with id " + id + ".");
    }
    if (!canTransition(task.state, to)) {
      throw new Error("Illegal task transition: " + task.state + " -> " + to + " is not allowed.");
    }
    var evidence = isNonEmptyString(completionEvidence)
      ? completionEvidence
      : (isNonEmptyString(task.completionEvidence) ? task.completionEvidence : null);
    if (to === "COMPLETE" && !isNonEmptyString(evidence)) {
      throw new Error("Cannot complete task " + id + ": completionEvidence is required.");
    }
    var updated = {};
    var key;
    for (key in task) {
      if (Object.prototype.hasOwnProperty.call(task, key)) updated[key] = task[key];
    }
    updated.history = Array.isArray(task.history) ? task.history.slice() : [];
    updated.history.push({
      at: nowIso(),
      from: task.state,
      to: to,
      note: typeof note === "string" ? note : ""
    });
    updated.state = to;
    // status is the same state under the spec name: keep it in sync.
    updated.status = to;
    updated.updatedAt = nowIso();
    if (to === "COMPLETE") {
      updated.completionEvidence = evidence;
      // evidence mirrors completionEvidence; completion records when.
      updated.evidence = evidence;
      if (!updated.completion) updated.completion = nowIso();
    }
    if (to === "BLOCKED") {
      updated.blockerReason = typeof note === "string" && note ? note : updated.blockerReason;
    } else if (task.state === "BLOCKED") {
      updated.blockerReason = null;
    }
    var errors = validateTask(updated);
    if (errors.length) {
      throw new Error("Invalid worker task: " + errors.join(" "));
    }
    var tasks = loadAll();
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i] && tasks[i].id === id) {
        tasks[i] = updated;
        break;
      }
    }
    persistAll(sortNewestFirst(tasks));
    return updated;
  }

  function deleteTask(id) {
    if (typeof id !== "string") return false;
    var tasks = loadAll();
    var kept = [];
    var removed = false;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i] && tasks[i].id === id) {
        removed = true;
      } else {
        kept.push(tasks[i]);
      }
    }
    if (removed) persistAll(kept);
    return removed;
  }

  // Counts are real counts of stored task records only. active is always
  // 0: no worker runtime is connected, so no task is live.
  function summary() {
    var tasks = loadAll();
    var byState = {};
    var i;
    for (i = 0; i < TASK_STATES.length; i++) byState[TASK_STATES[i]] = 0;
    for (i = 0; i < tasks.length; i++) {
      if (tasks[i] && byState.hasOwnProperty(tasks[i].state)) {
        byState[tasks[i].state] += 1;
      }
    }
    return {
      total: tasks.length,
      byState: byState,
      active: 0,
      note: "No worker runtime is connected — no task is live."
    };
  }

  global.BotOpsModel = {
    BOT_KINDS: BOT_KINDS,
    IDENTITY_KINDS: IDENTITY_KINDS.slice(),
    IDENTITY_AUTONOMY_LEVELS: IDENTITY_AUTONOMY_LEVELS.slice(),
    TASK_STATES: TASK_STATES.slice(),
    ROLE_LABELS: KNOWN_ROLE_LABELS.slice(),
    STORE_KEY: STORE_KEY,
    MAX_TASKS: MAX_TASKS,
    describeBot: describeBot,
    describeIdentity: describeIdentity,
    validateIdentityRecord: validateIdentityRecord,
    getWorkersActive: getWorkersActive,
    canTransition: canTransition,
    isLiveActive: isLiveActive,
    createWorkerTask: createWorkerTask,
    validateTask: validateTask,
    listTasks: listTasks,
    getTask: getTask,
    saveTask: saveTask,
    transitionTask: transitionTask,
    deleteTask: deleteTask,
    summary: summary
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
