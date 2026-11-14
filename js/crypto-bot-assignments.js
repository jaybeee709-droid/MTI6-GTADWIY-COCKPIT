/* MTI6-GTADWIY-COCKPIT — Crypto bot assignments (continuous development campaign)
 *
 * Crypto spec C7, §99-12: the crypto analysis ROLE registry and the
 * assignment records that bind a Tribe principal to a crypto role for
 * a subject (asset, network, protocol, opportunity, position, market).
 *
 * Roles are ROLES, not permanent bot names. A Tribe principal's role
 * is an ASSIGNMENT, not its identity: assigning or re-assigning a
 * role never renames the principal (its id and displayName are
 * permanent), and a principal is NEVER permanently glued to one
 * Crypto activity — the same principal may hold different roles over
 * time. Re-assignment is allowed and recorded in history, never
 * blocked.
 *
 * Truth rules enforced here (do not weaken them):
 * - No live workers are fabricated. An assignment with workerId null
 *   is honest (no worker yet). Status ACTIVE requires a real worker
 *   runtime heartbeat (WorkerEngine, recent heartbeat); until then an
 *   assignment stays ASSIGNED, never ACTIVE. isLiveActive() is always
 *   false in this build — no worker runtime exists.
 * - STAR is NOT a principal and Angels are NOT principals: assignRole
 *   rejects STAR and Angel identities. Only the 12 canonical Tribe
 *   principals (js/tribe-principals.js) may hold a crypto assignment.
 * - Roles are INFORMATIONAL analysis only. No role ever requires the
 *   TRANSACTIONAL permission: INFORMATIONAL never implies
 *   TRANSACTIONAL, and no financial execution exists in this build.
 * - In-memory only: assignments live for the session. Persistence is
 *   a coordinator decision (this module persists nothing to
 *   localStorage or IndexedDB).
 *
 * Load order for the page (coordinator wiring):
 *   js/truth.js -> js/tribe-principals.js -> js/bot-ops-model.js ->
 *   js/worker-engine.js -> js/crypto-bot-assignments.js
 * This module degrades gracefully when TribePrincipals / WorkerEngine
 * / StarCommand are absent (closed fallback vocabularies, same
 * values); it never requires them to load.
 *
 *   CryptoBotAssignments.ROLES / .ROLE_IDS / .ASSIGNMENT_STATUSES
 *   CryptoBotAssignments.SUBJECT_TYPES / .PERMISSIONS
 *   CryptoBotAssignments.listRoles() / getRole(roleId) / validateRole(roleId)
 *   CryptoBotAssignments.assignRole(principalId, roleId, options)
 *   CryptoBotAssignments.getAssignment(id) / listAssignments(filters)
 *   CryptoBotAssignments.transitionAssignment(id, to, note)
 *   CryptoBotAssignments.validateAssignment(record)
 *   CryptoBotAssignments.isLiveActive(assignment) -> false, always
 *   CryptoBotAssignments.summary() / resetAssignments()
 */
(function (global) {
  "use strict";

  var G = global || (typeof globalThis !== "undefined" ? globalThis : {});

  // ---- Canonical Tribe principal ids (owner ruling Nov 14, 2026) -------
  // Same 12 ids as js/tribe-principals.js and js/worker-engine.js.
  // Used only when TribePrincipals is not loaded.
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

  // ---- Permission vocabulary -------------------------------------------
  // Reuses StarCommand.PERMISSIONS when loaded, else the same closed
  // list. TRANSACTIONAL is in the list only so it can be recognised
  // and refused: it is never required by any crypto role.
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

  // ---- Crypto analysis role registry (C7) ------------------------------
  // 25 roles. Each role: {roleId, label, description, domains,
  // requiresPermissions}. Permissions are analysis-only: every role
  // requires INFORMATIONAL + READ_ONLY; roles whose analysis feeds
  // assisted work also require ASSISTED; Security Intelligence also
  // requires APPROVAL_REQUIRED (its findings gate approvals). No role
  // ever requires TRANSACTIONAL.
  var ROLES = [
    { roleId: "asset", label: "Asset",
      description: "Analyse a crypto asset from real evidence: what it is, where it is recorded, and what is known or unknown about it — never an invented balance, price, or holding.",
      domains: ["assets", "tokens", "positions"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY"] },
    { roleId: "network", label: "Network",
      description: "Analyse a network from real evidence: its recorded state, assets and protocols on it, and what is known or unknown — never an invented chain state or activity count.",
      domains: ["networks", "chains", "assets"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY"] },
    { roleId: "protocol", label: "Protocol",
      description: "Analyse a protocol from real evidence: its mechanism, recorded positions and relationships, and what is known or unknown — never an invented yield, rate, or eligibility.",
      domains: ["protocols", "assets", "positions"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY"] },
    { roleId: "liquidity", label: "Liquidity",
      description: "Analyse liquidity from real evidence: recorded pools, venues and depths, and what is known or unknown — never an invented depth, rate, or slippage figure.",
      domains: ["liquidity", "pools", "markets"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY"] },
    { roleId: "market", label: "Market",
      description: "Analyse a market from real evidence: recorded prices, venues and activity, and what is known or unknown — never an invented price, volume, or trend.",
      domains: ["markets", "prices", "assets"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY"] },
    { roleId: "risk", label: "Risk",
      description: "Analyse risk from real evidence, as risk DIMENSIONS only, never scores: record which dimensions apply to a subject and what is known or unknown about each.",
      domains: ["risk", "assets", "protocols", "positions"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY"] },
    { roleId: "cost", label: "Cost",
      description: "Analyse cost from real evidence using the approved cost vocabulary (labels only, UNKNOWN never becomes zero): record known costs and what is unknown, never an assumed or zeroed cost.",
      domains: ["cost", "fees", "gas", "routes"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY"] },
    { roleId: "wallet", label: "Wallet",
      description: "Analyse a wallet relationship from real evidence: what is recorded about the wallet and its positions, and what is unknown — never an invented balance or movement, never a seed phrase or private key.",
      domains: ["wallets", "assets", "positions"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY"] },
    { roleId: "opportunity-discovery", label: "Opportunity Discovery",
      description: "Discover candidate opportunities from real evidence only: a candidate is recorded as discovered and unverified until checked — never a promised return or a guaranteed earning.",
      domains: ["opportunities", "assets", "protocols"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY"] },
    { roleId: "opportunity-verification", label: "Opportunity Verification",
      description: "Verify a discovered opportunity against its sources and record whether it verified, with evidence — verification never invents eligibility, returns, or readiness.",
      domains: ["opportunities", "verification", "assets"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY", "ASSISTED"] },
    { roleId: "routing", label: "Routing",
      description: "Analyse a route from real evidence: recorded venues, hops and costs, and what is unknown — a route analysis is never an execution, and simulation is never presented as execution.",
      domains: ["routes", "networks", "liquidity"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY", "ASSISTED"] },
    { roleId: "bridge", label: "Bridge",
      description: "Analyse a bridge from real evidence: recorded routes, costs and risks between networks, and what is unknown — never an invented bridge rate, time, or safety claim.",
      domains: ["bridges", "networks", "routes"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY", "ASSISTED"] },
    { roleId: "lending", label: "Lending",
      description: "Analyse a lending activity from real evidence: recorded markets, terms and risks, and what is unknown — never an invented rate, APY, or guaranteed return.",
      domains: ["lending", "protocols", "assets"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY", "ASSISTED"] },
    { roleId: "staking", label: "Staking",
      description: "Analyse a staking activity from real evidence: recorded validators, terms and risks, and what is unknown — never an invented reward rate or guaranteed return.",
      domains: ["staking", "networks", "assets"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY", "ASSISTED"] },
    { roleId: "restaking", label: "Restaking",
      description: "Analyse a restaking activity from real evidence: recorded restaking positions, terms and risks, and what is unknown — never an invented reward rate or guaranteed return.",
      domains: ["restaking", "staking", "protocols"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY", "ASSISTED"] },
    { roleId: "yield", label: "Yield",
      description: "Analyse a yield activity from real evidence: recorded sources, mechanisms and risks, and what is unknown — never an invented APY, rate, or guaranteed earning.",
      domains: ["yield", "protocols", "assets"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY", "ASSISTED"] },
    { roleId: "derivatives", label: "Derivatives",
      description: "Analyse a derivatives activity from real evidence: recorded instruments, terms and risks, and what is unknown — never an invented price, leverage outcome, or guaranteed profit.",
      domains: ["derivatives", "markets", "protocols"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY", "ASSISTED"] },
    { roleId: "synthetic", label: "Synthetic",
      description: "Analyse a synthetic asset from real evidence: recorded backing, mechanism and risks, and what is unknown — never an invented peg, backing, or safety claim.",
      domains: ["synthetics", "assets", "protocols"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY", "ASSISTED"] },
    { roleId: "rwa", label: "RWA",
      description: "Analyse a real-world-asset activity from real evidence: recorded tokenization, backing and risks, and what is unknown — never an invented backing, value, or legal claim.",
      domains: ["rwa", "assets", "protocols"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY"] },
    { roleId: "nft", label: "NFT",
      description: "Analyse an NFT activity from real evidence: recorded collections, holdings and provenance, and what is unknown — never an invented price, rarity, or value.",
      domains: ["nft", "assets", "markets"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY"] },
    { roleId: "depin", label: "DePIN",
      description: "Analyse a DePIN activity from real evidence: recorded networks, participation and rewards, and what is unknown — never an invented reward rate or guaranteed earning.",
      domains: ["depin", "networks", "protocols"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY"] },
    { roleId: "oracle", label: "Oracle",
      description: "Analyse an oracle from real evidence: recorded feeds, sources and reliability, and what is unknown — never an invented price feed or trust claim; oracle manipulation is THREAT knowledge, never a strategy.",
      domains: ["oracles", "markets", "protocols"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY"] },
    { roleId: "btcfi", label: "BTCFi",
      description: "Analyse a BTCFi activity from real evidence: recorded Bitcoin-based mechanisms, terms and risks, and what is unknown — never an invented rate or guaranteed return.",
      domains: ["btcfi", "assets", "protocols"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY"] },
    { roleId: "provider", label: "Provider",
      description: "Analyse a data provider from real evidence: recorded reachability, freshness and coverage, and what is unknown — a provider check is never a claim that its data is verified.",
      domains: ["providers", "markets", "networks"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY", "NAVIGATIONAL"] },
    { roleId: "security-intelligence", label: "Security Intelligence",
      description: "Analyse a security signal from real evidence with provenance: findings are descriptive only, never transactional; threat knowledge never becomes a strategy or an execution.",
      domains: ["security", "threats", "protocols"],
      requiresPermissions: ["INFORMATIONAL", "READ_ONLY", "APPROVAL_REQUIRED"] }
  ];

  var ROLE_IDS = ROLES.map(function (r) { return r.roleId; });

  var ASSIGNMENT_STATUSES = ["ASSIGNED", "ACTIVE", "PAUSED", "COMPLETE", "FAILED"];

  // Strict allowlist. No transitions out of COMPLETE / FAILED.
  // ASSIGNED is the honest starting state: an assignment becomes
  // ACTIVE only when a real worker runtime heartbeat exists.
  var TRANSITIONS = {
    ASSIGNED: ["ACTIVE", "PAUSED", "COMPLETE", "FAILED"],
    ACTIVE: ["PAUSED", "COMPLETE", "FAILED"],
    PAUSED: ["ASSIGNED", "ACTIVE", "FAILED"],
    COMPLETE: [],
    FAILED: []
  };

  var SUBJECT_TYPES = ["asset", "network", "protocol", "opportunity", "position", "market"];

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

  function cloneRole(role) {
    return {
      roleId: role.roleId,
      label: role.label,
      description: role.description,
      domains: role.domains.slice(),
      requiresPermissions: role.requiresPermissions.slice()
    };
  }

  function cloneAssignment(a) {
    if (!a) return null;
    return {
      assignmentId: a.assignmentId,
      principalId: a.principalId,
      workerId: a.workerId,
      roleId: a.roleId,
      subjectType: a.subjectType,
      subjectId: a.subjectId,
      taskId: a.taskId,
      status: a.status,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      history: a.history.map(function (h) {
        return { at: h.at, by: h.by, change: h.change, note: h.note };
      })
    };
  }

  function newAssignmentId() {
    return "cba-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function findRoleInternal(roleId) {
    if (typeof roleId !== "string") return null;
    for (var i = 0; i < ROLES.length; i++) {
      if (ROLES[i].roleId === roleId) return ROLES[i];
    }
    return null;
  }

  // Canonical Tribe principal check: string list first (works with no
  // other module loaded), resolved against TribePrincipals when it is
  // loaded. STAR and Angel identities are rejected separately with
  // their own reasons, so the rejection is never mistaken for a typo.
  function isCanonicalPrincipalId(value) {
    if (typeof value !== "string") return false;
    if (CANONICAL_TRIBE_IDS.indexOf(value) !== -1) return true;
    var tp = G.TribePrincipals;
    if (tp && typeof tp === "object") {
      try {
        if (typeof tp.isCanonicalId === "function" && tp.isCanonicalId(value)) return true;
        if (typeof tp.getPrincipal === "function" && tp.getPrincipal(value)) return true;
        if (Array.isArray(tp.PRINCIPAL_IDS) && tp.PRINCIPAL_IDS.indexOf(value) !== -1) return true;
      } catch (e) {}
    }
    return false;
  }

  function isStarId(value) {
    var tp = G.TribePrincipals;
    if (tp && typeof tp.isStarId === "function") {
      try { return tp.isStarId(value); } catch (e) {}
    }
    if (typeof value !== "string") return false;
    var n = value.toLowerCase().replace(/[\s._\-]+/g, "");
    return n === "star" || n === "star30";
  }

  function isAngelId(value) {
    var tp = G.TribePrincipals;
    if (tp && typeof tp.isAngelId === "function") {
      try { return tp.isAngelId(value); } catch (e) {}
    }
    if (typeof value !== "string") return false;
    var lower = value.trim().toLowerCase();
    if (lower.indexOf("angel") === 0) return true;
    var names = ["michael", "gabriel", "raphael", "uriel",
      "raguel", "sariel", "saraqael", "remiel"];
    return names.indexOf(lower) !== -1;
  }

  // ---- Role registry ------------------------------------------------------

  // All 25 roles, as copies (callers mutating one never touch the
  // registry).
  function listRoles() {
    return ROLES.map(cloneRole);
  }

  function getRole(roleId) {
    var role = findRoleInternal(roleId);
    return role ? cloneRole(role) : null;
  }

  // Returns an array of error strings (empty = valid). Never throws.
  // A role is valid when it exists in the registry, has a non-empty
  // label/description, non-empty domains, and requiresPermissions that
  // are all known permissions — and never TRANSACTIONAL.
  function validateRole(roleId) {
    var errors = [];
    var role = findRoleInternal(roleId);
    if (!role) {
      return ["Unknown crypto role: " + String(roleId) + ". Known roles: " + ROLE_IDS.join(", ") + "."];
    }
    if (!isNonEmptyString(role.label)) errors.push("Role " + roleId + " has no label.");
    if (!isNonEmptyString(role.description)) errors.push("Role " + roleId + " has no description.");
    if (!Array.isArray(role.domains) || role.domains.length === 0 || !isStringArray(role.domains)) {
      errors.push("Role " + roleId + " must list at least one domain.");
    }
    if (!Array.isArray(role.requiresPermissions) || role.requiresPermissions.length === 0 ||
        !isStringArray(role.requiresPermissions)) {
      errors.push("Role " + roleId + " must list at least one required permission.");
    } else {
      var known = knownPermissions();
      for (var i = 0; i < role.requiresPermissions.length; i++) {
        var perm = role.requiresPermissions[i];
        if (known.indexOf(perm) === -1) {
          errors.push("Role " + roleId + " requires unknown permission: " + perm + ".");
        }
        if (perm === "TRANSACTIONAL") {
          errors.push("Role " + roleId + " must not require TRANSACTIONAL — crypto roles are INFORMATIONAL analysis only.");
        }
      }
    }
    return errors;
  }

  // ---- Assignment store (in-memory only) ----------------------------------

  var assignments = [];

  function findInternal(assignmentId) {
    if (typeof assignmentId !== "string") return null;
    for (var i = 0; i < assignments.length; i++) {
      if (assignments[i].assignmentId === assignmentId) return assignments[i];
    }
    return null;
  }

  function actor(by) {
    return isNonEmptyString(by) ? by.trim() : "system";
  }

  function appendHistory(a, change, by, note) {
    a.history.push({
      at: nowIso(),
      by: actor(by),
      change: change,
      note: typeof note === "string" ? note : ""
    });
  }

  // ---- Assignment validation ----------------------------------------------

  // Returns an array of error strings (empty = valid). Never throws.
  function validateAssignment(record) {
    var errors = [];
    try {
      if (!record || typeof record !== "object") {
        return ["Assignment must be an object."];
      }
      if (!isNonEmptyString(record.assignmentId)) {
        errors.push("assignmentId is required and must be a non-empty string.");
      }
      if (isStarId(record.principalId)) {
        errors.push("STAR cannot hold a crypto assignment: STAR sits above / coordinating the Tribe workforce.");
      } else if (isAngelId(record.principalId)) {
        errors.push("An Angel identity cannot hold a crypto assignment: Angels have a separate registry.");
      } else if (!isCanonicalPrincipalId(record.principalId)) {
        errors.push("principalId must be one of the 12 canonical Tribe principal IDs: " + CANONICAL_TRIBE_IDS.join(", ") + ".");
      }
      var roleErrors = validateRole(record.roleId);
      if (roleErrors.length) errors = errors.concat(roleErrors);
      if (SUBJECT_TYPES.indexOf(record.subjectType) === -1) {
        errors.push("subjectType must be one of: " + SUBJECT_TYPES.join(", ") + ".");
      }
      if (!isNonEmptyString(record.subjectId)) {
        errors.push("subjectId is required and must be a non-empty string.");
      }
      if (record.workerId !== null && !isNonEmptyString(record.workerId)) {
        errors.push("workerId must be a worker id string or null (null = no worker yet).");
      }
      if (record.taskId !== null && !isNonEmptyString(record.taskId)) {
        errors.push("taskId must be a task id string or null (null = no task exists yet).");
      }
      if (ASSIGNMENT_STATUSES.indexOf(record.status) === -1) {
        errors.push("status must be one of: " + ASSIGNMENT_STATUSES.join(", ") + ".");
      }
      // ACTIVE is honest only with a real worker attached: an ACTIVE
      // record with no worker is malformed, not "partly live".
      if (record.status === "ACTIVE" && record.workerId === null) {
        errors.push("status ACTIVE requires a workerId — an assignment with no worker can never be ACTIVE.");
      }
      if (typeof record.createdAt !== "string" || isNaN(Date.parse(record.createdAt))) {
        errors.push("createdAt must be an ISO date string.");
      }
      if (record.updatedAt !== undefined && record.updatedAt !== null &&
          (typeof record.updatedAt !== "string" || isNaN(Date.parse(record.updatedAt)))) {
        errors.push("updatedAt must be an ISO date string or null.");
      }
      if (!Array.isArray(record.history)) {
        errors.push("history must be an array of entries.");
      }
    } catch (e) {
      errors.push("validateAssignment failed: " + (e && e.message ? e.message : String(e)));
    }
    return errors;
  }

  // ---- Assignment ---------------------------------------------------------

  // Binds a canonical Tribe principal to a crypto role for a subject.
  // options: {subjectType, subjectId, workerId?, by?, note?}.
  // Always creates the assignment with status ASSIGNED: even with a
  // workerId, ACTIVE requires a real worker runtime heartbeat (see
  // transitionAssignment) — an assignment is never created ACTIVE.
  // A principal is NEVER permanently glued to one Crypto activity:
  // re-assigning the same principal to a different role is allowed.
  // The previous non-terminal assignment is recorded as superseded in
  // its history, the new assignment records the previous role in its
  // history, and the principal's own currentRole is updated through
  // TribePrincipals when loaded — its id and displayName are never
  // touched. Throws with every reason listed on invalid input;
  // nothing is written.
  function assignRole(principalId, roleId, options) {
    var data = options && typeof options === "object" ? options : {};
    var reasons = [];
    if (isStarId(principalId)) {
      reasons.push("STAR cannot hold a crypto assignment: STAR sits above / coordinating the Tribe workforce.");
    } else if (isAngelId(principalId)) {
      reasons.push("An Angel identity cannot hold a crypto assignment: Angels have a separate registry.");
    } else if (!isCanonicalPrincipalId(principalId)) {
      reasons.push("principalId must be one of the 12 canonical Tribe principal IDs: " + CANONICAL_TRIBE_IDS.join(", ") + ".");
    }
    var roleErrors = validateRole(roleId);
    if (roleErrors.length) reasons = reasons.concat(roleErrors);
    if (SUBJECT_TYPES.indexOf(data.subjectType) === -1) {
      reasons.push("subjectType must be one of: " + SUBJECT_TYPES.join(", ") + ".");
    }
    if (!isNonEmptyString(data.subjectId)) {
      reasons.push("subjectId is required and must be a non-empty string.");
    }
    if (data.workerId !== undefined && data.workerId !== null && !isNonEmptyString(data.workerId)) {
      reasons.push("workerId must be a worker id string or null.");
    }
    if (data.taskId !== undefined && data.taskId !== null && !isNonEmptyString(data.taskId)) {
      reasons.push("taskId must be a task id string or null.");
    }
    if (reasons.length) {
      throw new Error("Invalid crypto assignment: " + reasons.join(" "));
    }

    var stamp = nowIso();
    var assignment = {
      assignmentId: newAssignmentId(),
      principalId: principalId,
      workerId: data.workerId === undefined ? null : data.workerId,
      roleId: roleId,
      subjectType: data.subjectType,
      subjectId: data.subjectId.trim(),
      taskId: data.taskId === undefined ? null : data.taskId,
      status: "ASSIGNED",
      createdAt: stamp,
      updatedAt: stamp,
      history: []
    };

    // Re-assignment: the principal's previous non-terminal assignment
    // is recorded as superseded (history only — its status is a
    // historical record, not rewritten), and the new assignment
    // records the role it replaces. The principal is never blocked
    // from holding a different role over time.
    var previous = null;
    for (var i = assignments.length - 1; i >= 0; i--) {
      var prior = assignments[i];
      if (prior.principalId === principalId &&
          prior.status !== "COMPLETE" && prior.status !== "FAILED") {
        previous = prior;
        break;
      }
    }
    if (previous) {
      appendHistory(previous,
        "superseded by assignment " + assignment.assignmentId + " (role " + roleId + ")",
        data.by, data.note);
      previous.updatedAt = stamp;
    }
    appendHistory(assignment,
      "role assigned: " + roleId +
        (previous ? " (was: " + previous.roleId + ")" : "") +
        " — subject " + assignment.subjectType + " " + assignment.subjectId +
        (assignment.workerId === null ? " — no worker yet" : " — worker " + assignment.workerId),
      data.by, data.note);

    var errors = validateAssignment(assignment);
    if (errors.length) {
      throw new Error("Invalid crypto assignment: " + errors.join(" "));
    }
    assignments.push(assignment);

    // Keep the principal's own currentRole in sync when the registry
    // is loaded. TribePrincipals.assignRole changes currentRole ONLY:
    // it never changes the principal's id or displayName, and it
    // appends its own history entry. A failure there must not lose
    // the assignment record, so it is best-effort.
    var tp = G.TribePrincipals;
    if (tp && typeof tp.assignRole === "function") {
      try {
        tp.assignRole(principalId, roleId, data.by,
          "Crypto assignment " + assignment.assignmentId + " (" + roleId + ").");
      } catch (e) {}
    }

    return cloneAssignment(assignment);
  }

  function getAssignment(assignmentId) {
    var a = findInternal(assignmentId);
    return a ? cloneAssignment(a) : null;
  }

  // Optional filters: principalId, roleId, subjectId, status.
  // Returns copies, newest first.
  function listAssignments(filters) {
    var f = filters && typeof filters === "object" ? filters : {};
    var out = [];
    for (var i = 0; i < assignments.length; i++) {
      var a = assignments[i];
      if (f.principalId !== undefined && f.principalId !== null && a.principalId !== f.principalId) continue;
      if (f.roleId !== undefined && f.roleId !== null && a.roleId !== f.roleId) continue;
      if (f.subjectId !== undefined && f.subjectId !== null && a.subjectId !== f.subjectId) continue;
      if (f.status !== undefined && f.status !== null && a.status !== f.status) continue;
      out.push(cloneAssignment(a));
    }
    out.sort(function (x, y) {
      if (y.createdAt < x.createdAt) return -1;
      if (y.createdAt > x.createdAt) return 1;
      return 0;
    });
    return out;
  }

  // ---- Liveness gate ------------------------------------------------------

  // An assignment record is never live, whatever status its record
  // carries: no worker runtime exists in this build.
  function isLiveActive(assignment) {
    void assignment;
    return false;
  }

  // A worker counts as live-heartbeating only when WorkerEngine is
  // loaded, the worker exists, and its heartbeat is not stale. Any
  // other state means ACTIVE cannot honestly be claimed.
  function hasLiveHeartbeat(workerId) {
    var we = G.WorkerEngine;
    if (!we || typeof we.isStale !== "function") return false;
    try {
      if (typeof we.getWorker === "function" && !we.getWorker(workerId)) return false;
      return we.isStale(workerId) === false;
    } catch (e) {
      return false;
    }
  }

  function canTransition(from, to) {
    if (typeof from !== "string" || typeof to !== "string") return false;
    var allowed = TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.indexOf(to) !== -1;
  }

  // Moves an assignment to a new status, appending a history entry
  // and updating updatedAt. ACTIVE is gated: it requires a workerId
  // AND a recent worker runtime heartbeat — otherwise it throws and
  // nothing is written. An illegal transition throws and nothing is
  // written.
  function transitionAssignment(assignmentId, to, note) {
    if (typeof assignmentId !== "string") {
      throw new Error("transitionAssignment requires an assignment id.");
    }
    if (ASSIGNMENT_STATUSES.indexOf(to) === -1) {
      throw new Error("Unknown assignment status: " + to + ".");
    }
    var a = findInternal(assignmentId);
    if (!a) {
      throw new Error("No crypto assignment with id " + assignmentId + ".");
    }
    if (!canTransition(a.status, to)) {
      throw new Error("Illegal assignment transition: " + a.status + " -> " + to + " is not allowed.");
    }
    if (to === "ACTIVE") {
      if (a.workerId === null) {
        throw new Error("Cannot move assignment " + assignmentId + " to ACTIVE: no worker is attached (workerId is null).");
      }
      if (!hasLiveHeartbeat(a.workerId)) {
        throw new Error("Cannot move assignment " + assignmentId + " to ACTIVE: no recent worker runtime heartbeat for worker " + a.workerId + " — assignments stay ASSIGNED until a real worker runtime reports.");
      }
    }
    var from = a.status;
    a.status = to;
    a.updatedAt = nowIso();
    a.history.push({
      at: a.updatedAt,
      by: "system",
      change: from + " -> " + to,
      note: typeof note === "string" ? note : ""
    });
    var errors = validateAssignment(a);
    if (errors.length) {
      a.status = from;
      a.history.pop();
      throw new Error("Invalid crypto assignment: " + errors.join(" "));
    }
    return cloneAssignment(a);
  }

  // ---- Summary / reset ----------------------------------------------------

  // Counts are real counts of assignment records only. active is
  // always 0: no worker runtime is connected, so no assignment is
  // live.
  function summary() {
    var byStatus = {};
    var i;
    for (i = 0; i < ASSIGNMENT_STATUSES.length; i++) byStatus[ASSIGNMENT_STATUSES[i]] = 0;
    var byRole = {};
    var withoutWorker = 0;
    for (i = 0; i < assignments.length; i++) {
      var a = assignments[i];
      if (byStatus.hasOwnProperty(a.status)) byStatus[a.status] += 1;
      byRole[a.roleId] = (byRole[a.roleId] || 0) + 1;
      if (a.workerId === null) withoutWorker += 1;
    }
    return {
      total: assignments.length,
      byStatus: byStatus,
      byRole: byRole,
      active: 0,
      withoutWorker: withoutWorker,
      note: "No worker runtime is connected — no assignment is live. Assignments with workerId null have no worker yet."
    };
  }

  // Clears all assignment records (tests / reset). The role registry
  // is canonical constants and is never cleared.
  function resetAssignments() {
    assignments = [];
    return true;
  }

  G.CryptoBotAssignments = {
    ROLES: listRoles(),
    ROLE_IDS: ROLE_IDS.slice(),
    ASSIGNMENT_STATUSES: ASSIGNMENT_STATUSES.slice(),
    SUBJECT_TYPES: SUBJECT_TYPES.slice(),
    PERMISSIONS: knownPermissions(),
    listRoles: listRoles,
    getRole: getRole,
    validateRole: validateRole,
    assignRole: assignRole,
    getAssignment: getAssignment,
    listAssignments: listAssignments,
    transitionAssignment: transitionAssignment,
    canTransition: canTransition,
    validateAssignment: validateAssignment,
    isLiveActive: isLiveActive,
    summary: summary,
    resetAssignments: resetAssignments
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
