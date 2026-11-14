/* MTI6-GTADWIY-COCKPIT — Twelve Tribe principals (continuous development campaign)
 *
 * Canonical bot identity per the owner's 05:56 EST Nov 14, 2026 ruling.
 * The Twelve Tribe principals are persistent named organizational
 * identities with stable IDs. This module EXTENDS js/tribes.js — it
 * never replaces it: js/tribes.js still owns the 12 generic slots
 * (tribe-01..tribe-12) and the honest WORKERS ACTIVE: 0 / NOT_CONNECTED
 * count; this module owns the canonical principal identities that fill
 * those slots by owner approval.
 *
 * Canonical roster (Revelation 7 arrangement, modern normalized
 * spellings — use EXACTLY, do not alter for alternate spellings):
 *   tribe-judah / JUDAH, tribe-reuben / REUBEN, tribe-gad / GAD,
 *   tribe-asher / ASHER, tribe-naphtali / NAPHTALI,
 *   tribe-manasseh / MANASSEH, tribe-simeon / SIMEON, tribe-levi / LEVI,
 *   tribe-issachar / ISSACHAR, tribe-zebulun / ZEBULUN,
 *   tribe-joseph / JOSEPH, tribe-benjamin / BENJAMIN
 *
 * Identity and role stay SEPARATE: assignRole / assignTask change
 * currentRole / currentTask ONLY. They never change id or displayName,
 * and every change appends a history entry {at, by, change, note}.
 * A principal is never renamed when its assignment changes.
 *
 * STAR is NOT a principal: STAR sits above / coordinating the Tribe
 * workforce and communicates directly with the owner. Any attempt to
 * register "star" / "STAR" / "star-3.0" as a principal is rejected.
 * Angels are NOT principals either: Angels have a separate registry
 * (js/angel-security.js). Any attempt to register an Angel identity
 * as a principal is rejected.
 *
 * Truth rules enforced here (do not weaken them):
 * - No fabricated activity: all 12 principals start UNASSIGNED with
 *   null role/task, and summary() honestly reports 0 assigned.
 * - status "ACTIVE" means the principal IDENTITY is active/canonical.
 *   It is NOT a claim of live activity: there is no worker runtime
 *   in this build, so no principal is ever displayed as live.
 * - The roster is FIXED at these 12. There is no way to add a 13th
 *   principal through this module; registerPrincipal always throws.
 * - Role labels (Research, Risk, Yield, Routing, Security, Builder,
 *   Analysis, Monitoring) are assignment roles, never bot names.
 *
 * No DOM, no network, no secrets, no storage. In-memory only: the
 * roster is canonical constants, so assignments live for the session;
 * identity needs no persistence. Load order for the page:
 *   js/truth.js -> js/bot-ops-model.js -> js/tribe-principals.js
 * This module degrades gracefully when Truth / BotOpsModel are absent
 * (closed fallback role-label list, same values); it never requires
 * them to load.
 *
 *   TribePrincipals.ROSTER / PRINCIPAL_IDS / COUNT
 *   TribePrincipals.listPrincipals() / getPrincipal(id) / isCanonicalId(id)
 *   TribePrincipals.assignRole(principalId, role, by, note)
 *   TribePrincipals.assignTask(principalId, taskId, by, note)
 *   TribePrincipals.unassign(principalId, by, note)
 *   TribePrincipals.recordHistory(principalId, change, by, note)
 *   TribePrincipals.describeForBotOps(principalId)
 *   TribePrincipals.registerPrincipal(input) / addPrincipal(input) — always throws
 *   TribePrincipals.isStarId(value) / isAngelId(value)
 *   TribePrincipals.summary()
 */
(function (global) {
  "use strict";

  // ---- Canonical roster (owner ruling, 05:56 EST Nov 14, 2026) ----------
  // Order is the Revelation 7 arrangement. Do not reorder, rename, or
  // respell: these exact ids and display names are the canonical
  // identities. `order` is 1-12 in this roster order.
  var ROSTER = [
    { id: "tribe-judah", displayName: "JUDAH" },
    { id: "tribe-reuben", displayName: "REUBEN" },
    { id: "tribe-gad", displayName: "GAD" },
    { id: "tribe-asher", displayName: "ASHER" },
    { id: "tribe-naphtali", displayName: "NAPHTALI" },
    { id: "tribe-manasseh", displayName: "MANASSEH" },
    { id: "tribe-simeon", displayName: "SIMEON" },
    { id: "tribe-levi", displayName: "LEVI" },
    { id: "tribe-issachar", displayName: "ISSACHAR" },
    { id: "tribe-zebulun", displayName: "ZEBULUN" },
    { id: "tribe-joseph", displayName: "JOSEPH" },
    { id: "tribe-benjamin", displayName: "BENJAMIN" }
  ];

  var COUNT = ROSTER.length;

  // Role labels reused from Tribes / BotOpsModel when loaded; same
  // closed list as the fallback in bot-ops-model.js. These are the
  // KNOWN assignment labels, shown for UI convenience — assignRole
  // itself accepts any non-empty role string, because the principal
  // registry must not silently re-gate assignments on load order
  // (BotOpsModel.validateTask enforces the closed list for worker
  // tasks, which is where the gate belongs).
  var FALLBACK_ROLE_LABELS = [
    "Research",
    "Risk",
    "Yield",
    "Routing",
    "Security",
    "Builder",
    "Analysis",
    "Monitoring"
  ];

  // Angel names from the owner's canonical bot identity ruling: the
  // owner-approved Angel identity registry (MICHAEL, GABRIEL, RAPHAEL,
  // URIEL) plus candidates pending verification (RAGUEL, SARIEL /
  // SARAQAEL, REMIEL). Any of these — or any id starting with
  // "angel-" — is an Angel identity, never a Tribe principal.
  var ANGEL_NAMES = [
    "MICHAEL",
    "GABRIEL",
    "RAPHAEL",
    "URIEL",
    "RAGUEL",
    "SARIEL",
    "SARAQAEL",
    "REMIEL"
  ];

  function nowIso() {
    return new Date().toISOString();
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  // Normalizes an identity string for STAR / Angel matching: lower
  // case, separators removed, so "STAR 3.0", "star-3.0" and "star30"
  // all compare equal, and "angel-michael" starts with "angel".
  function normalizeIdentity(value) {
    if (typeof value !== "string") return "";
    return value.toLowerCase().replace(/[\s._\-]+/g, "");
  }

  // STAR sits above / coordinating the Tribe workforce; STAR is never
  // a principal. Matches "star" and "star-3.0" (any separator/case).
  function isStarId(value) {
    var n = normalizeIdentity(value);
    return n === "star" || n === "star30";
  }

  // Angels have a separate registry (js/angel-security.js) and are
  // never Tribe principals. Matches any id/name starting with
  // "angel", and any of the Angel names in the ruling, in any case.
  function isAngelId(value) {
    var n = normalizeIdentity(value);
    if (!n) return false;
    if (n.indexOf("angel") === 0) return true;
    for (var i = 0; i < ANGEL_NAMES.length; i++) {
      if (n === ANGEL_NAMES[i].toLowerCase()) return true;
    }
    return false;
  }

  function roleLabels() {
    if (global.BotOpsModel && Array.isArray(global.BotOpsModel.ROLE_LABELS) &&
      global.BotOpsModel.ROLE_LABELS.length) {
      return global.BotOpsModel.ROLE_LABELS.slice();
    }
    if (global.Tribes && Array.isArray(global.Tribes.ROLE_LABELS) &&
      global.Tribes.ROLE_LABELS.length) {
      return global.Tribes.ROLE_LABELS.slice();
    }
    return FALLBACK_ROLE_LABELS.slice();
  }

  function clonePrincipal(p) {
    return {
      id: p.id,
      displayName: p.displayName,
      order: p.order,
      status: p.status,
      assignmentState: p.assignmentState,
      currentRole: p.currentRole,
      currentTask: p.currentTask,
      history: p.history.map(function (h) {
        return { at: h.at, by: h.by, change: h.change, note: h.note };
      })
    };
  }

  // ---- In-memory roster state (fresh on every load) ---------------------
  // Every principal starts UNASSIGNED with null role/task and empty
  // history. Nothing is invented: no assignment exists until one is
  // recorded through assignRole / assignTask with a history entry.
  var principals = ROSTER.map(function (entry, index) {
    return {
      id: entry.id,
      displayName: entry.displayName,
      order: index + 1,
      status: "ACTIVE",
      assignmentState: "UNASSIGNED",
      currentRole: null,
      currentTask: null,
      history: []
    };
  });

  function findInternal(id) {
    if (typeof id !== "string") return null;
    for (var i = 0; i < principals.length; i++) {
      if (principals[i].id === id) return principals[i];
    }
    return null;
  }

  function actor(by) {
    return isNonEmptyString(by) ? by.trim() : "system";
  }

  function noteText(note) {
    return typeof note === "string" ? note : "";
  }

  function appendHistory(p, change, by, note) {
    p.history.push({
      at: nowIso(),
      by: actor(by),
      change: change,
      note: noteText(note)
    });
  }

  function refreshAssignmentState(p) {
    p.assignmentState = (p.currentRole === null && p.currentTask === null)
      ? "UNASSIGNED"
      : "ASSIGNED";
  }

  // ---- Registry ---------------------------------------------------------

  // Roster order, always. Returns copies: callers mutating a returned
  // record never touch internal state.
  function listPrincipals() {
    return principals.map(clonePrincipal);
  }

  function getPrincipal(id) {
    var p = findInternal(id);
    return p ? clonePrincipal(p) : null;
  }

  function isCanonicalId(id) {
    if (typeof id !== "string") return false;
    for (var i = 0; i < ROSTER.length; i++) {
      if (ROSTER[i].id === id) return true;
    }
    return false;
  }

  // ---- Assignment (identity and role stay separate) ---------------------

  // Changes currentRole ONLY. Never changes id or displayName, and
  // appends a history entry. Throws on an unknown principal or an
  // empty role; nothing is written on a throw.
  function assignRole(principalId, role, by, note) {
    var p = findInternal(principalId);
    if (!p) {
      throw new Error("No Tribe principal with id " + principalId + ".");
    }
    if (!isNonEmptyString(role)) {
      throw new Error("assignRole requires a non-empty role string.");
    }
    var previous = p.currentRole;
    p.currentRole = role.trim();
    refreshAssignmentState(p);
    appendHistory(p,
      "role assigned: " + p.currentRole +
        (previous === null ? "" : " (was: " + previous + ")"),
      by, note);
    return clonePrincipal(p);
  }

  // Changes currentTask ONLY. Never changes id or displayName, and
  // appends a history entry. Throws on an unknown principal or an
  // empty task id; nothing is written on a throw.
  function assignTask(principalId, taskId, by, note) {
    var p = findInternal(principalId);
    if (!p) {
      throw new Error("No Tribe principal with id " + principalId + ".");
    }
    if (!isNonEmptyString(taskId)) {
      throw new Error("assignTask requires a non-empty task id string.");
    }
    var previous = p.currentTask;
    p.currentTask = taskId.trim();
    refreshAssignmentState(p);
    appendHistory(p,
      "task assigned: " + p.currentTask +
        (previous === null ? "" : " (was: " + previous + ")"),
      by, note);
    return clonePrincipal(p);
  }

  // Clears role/task and returns assignmentState to UNASSIGNED. Keeps
  // id, displayName, status, and the full history (plus one new
  // "unassigned" entry). Identity is never cleared by unassigning.
  function unassign(principalId, by, note) {
    var p = findInternal(principalId);
    if (!p) {
      throw new Error("No Tribe principal with id " + principalId + ".");
    }
    p.currentRole = null;
    p.currentTask = null;
    refreshAssignmentState(p);
    appendHistory(p, "unassigned", by, note);
    return clonePrincipal(p);
  }

  // Appends a caller-supplied history entry without changing identity,
  // role, or task. Throws on an unknown principal or an empty change.
  function recordHistory(principalId, change, by, note) {
    var p = findInternal(principalId);
    if (!p) {
      throw new Error("No Tribe principal with id " + principalId + ".");
    }
    if (!isNonEmptyString(change)) {
      throw new Error("recordHistory requires a non-empty change string.");
    }
    appendHistory(p, change.trim(), by, note);
    return clonePrincipal(p);
  }

  // ---- Bot Operations view ----------------------------------------------

  // The shape the Bot Operations tribe cards expect: id, displayName,
  // assignmentState, currentRole, currentTask — with NO invented
  // activity. A principal with no assignment reports currentRole null
  // and currentTask null. Returns null for an unknown id.
  function describeForBotOps(principalId) {
    var p = findInternal(principalId);
    if (!p) return null;
    return {
      id: p.id,
      displayName: p.displayName,
      assignmentState: p.assignmentState,
      currentRole: p.currentRole,
      currentTask: p.currentTask
    };
  }

  // ---- Registration (the roster is fixed — always rejected) -------------

  // The Twelve are fixed by owner ruling. There is no way to add a
  // principal through this module: every call throws, and nothing is
  // written. STAR and Angel attempts get their own reasons so the
  // rejection is never mistaken for a typo.
  function registerPrincipal(input) {
    var data = input && typeof input === "object" ? input : {};
    var candidateId = typeof data.id === "string" ? data.id : "";
    var candidateName = typeof data.displayName === "string"
      ? data.displayName
      : (typeof data.name === "string" ? data.name : "");
    if (isStarId(candidateId) || isStarId(candidateName)) {
      throw new Error("STAR cannot be added as a Tribe principal: STAR sits above / coordinating the Tribe workforce and communicates directly with the owner.");
    }
    if (isAngelId(candidateId) || isAngelId(candidateName)) {
      throw new Error("An Angel identity cannot be registered as a Tribe principal: Angels have a separate registry (js/angel-security.js).");
    }
    if (isCanonicalId(candidateId)) {
      throw new Error("Tribe principal " + candidateId + " already exists: the roster is fixed at the 12 canonical principals and a principal cannot be re-registered.");
    }
    throw new Error("The Tribe principal roster is fixed at the 12 canonical principals: no new principal can be registered" +
      (candidateId ? " (" + candidateId + " is not a canonical principal id)." : "."));
  }

  // ---- Summary (honest counts only) -------------------------------------

  // Counts are real counts of the 12 roster records only. Fresh state
  // reports {total: 12, assigned: 0, unassigned: 12} — never a
  // fabricated activity count.
  function summary() {
    var assigned = 0;
    for (var i = 0; i < principals.length; i++) {
      if (principals[i].assignmentState !== "UNASSIGNED") assigned++;
    }
    return {
      total: principals.length,
      assigned: assigned,
      unassigned: principals.length - assigned
    };
  }

  global.TribePrincipals = {
    ROSTER: ROSTER.map(function (entry, index) {
      return { id: entry.id, displayName: entry.displayName, order: index + 1 };
    }),
    PRINCIPAL_IDS: ROSTER.map(function (entry) { return entry.id; }),
    COUNT: COUNT,
    ROLE_LABELS: roleLabels(),
    ANGEL_NAMES: ANGEL_NAMES.slice(),
    listPrincipals: listPrincipals,
    getPrincipal: getPrincipal,
    isCanonicalId: isCanonicalId,
    assignRole: assignRole,
    assignTask: assignTask,
    unassign: unassign,
    recordHistory: recordHistory,
    describeForBotOps: describeForBotOps,
    registerPrincipal: registerPrincipal,
    addPrincipal: registerPrincipal,
    isStarId: isStarId,
    isAngelId: isAngelId,
    summary: summary
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
