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
    if (reasons.length) {
      throw new Error("Invalid worker task: " + reasons.join(" "));
    }
    var stamp = nowIso();
    var task = {
      id: newTaskId(),
      title: data.title.trim(),
      role: data.role,
      tribeId: data.tribeId === undefined ? null : data.tribeId,
      state: "UNASSIGNED",
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
      completionEvidence: null
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
    updated.updatedAt = nowIso();
    if (to === "COMPLETE") {
      updated.completionEvidence = evidence;
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
    TASK_STATES: TASK_STATES.slice(),
    ROLE_LABELS: KNOWN_ROLE_LABELS.slice(),
    STORE_KEY: STORE_KEY,
    MAX_TASKS: MAX_TASKS,
    describeBot: describeBot,
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
