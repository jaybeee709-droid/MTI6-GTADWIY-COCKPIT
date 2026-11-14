/* MTI6-GTADWIY-COCKPIT — Bot body / avatar hooks (continuous development campaign)
 *
 * Identity/body separation layer (owner spec §44 item 16). Schema and
 * runtime structure FIRST; photorealistic rendering is explicitly NOT
 * part of this unit and nothing here blocks functional work on it.
 *
 * A BODY is a presentational record only: how an agent may be shown
 * (human form, robot form, console portrait, full-body view). An
 * IDENTITY is who the agent is (id, canonical name, parent principal,
 * Tribe, permissions, history, audit record) and lives in
 * js/tribe-principals.js, js/angel-identities.js, js/worker-engine.js
 * and js/bot-ops-model.js. The two never mix:
 *   - assignBody / changeBody REJECT any body spec that names an
 *     identity field (reason "IDENTITY_FIELD_IN_BODY").
 *   - Changing a body never changes the agent's identity: when
 *     TribePrincipals / BotOpsModel are loaded, the identity record is
 *     snapshotted before the change and verified unchanged after it;
 *     a mismatch rolls the change back.
 *   - An agent with no body record has NO body: bodyFor returns null.
 *     No default or invented body is ever supplied.
 *   - STAR may have a body record, but STAR is never a Tribe principal
 *     and never appears in a tribe body list.
 *
 * Config values are free-form descriptive strings only. There are no
 * image fields and no external URLs anywhere in this module: a body
 * describes an appearance in words so a renderer can be built later;
 * it never copies copyrighted character imagery and never points at
 * an outside asset.
 *
 * Human-form config: hair, beard, clothing, fringes, jewelry, facial
 * appearance, gesture, colour scheme, presentation style.
 * Robot-form config: white/silver outer mechanical architecture, dark
 * internal structure, electric-blue/cyan illumination, command-center
 * / lab appearance — as config fields (outerMaterial,
 * internalStructure, illumination, appearance), original forms only.
 *
 * No DOM, no network, no credentials, no storage, no rendering.
 * In-memory only: bodies live for the session. Load order for the
 * page: js/truth.js -> js/bot-body.js (it consults
 * js/tribe-principals.js, js/angel-identities.js, js/bot-ops-model.js
 * and js/worker-engine.js when they are loaded, and degrades
 * gracefully when they are not).
 *
 *   BotBody.KINDS / PRESENTATIONS / BODY_STATES
 *   BotBody.HUMAN_CONFIG_FIELDS / ROBOT_CONFIG_FIELDS / IDENTITY_FIELDS
 *   BotBody.validateBodySpec(spec) / validateBody(record)
 *   BotBody.assignBody(agentId, bodySpec) / changeBody(agentId, bodySpec)
 *   BotBody.bodyFor(agentId) / setBodyState(agentId, state)
 *   BotBody.removeBody(agentId)
 *   BotBody.listBodies() / listTribeBodies() / starBody()
 *   BotBody.isStarId(value) / identityKindFor(agentId)
 *   BotBody.summary() / reset()
 */
var BotBody = (function (global) {
  "use strict";

  // ---- Closed sets ------------------------------------------------------

  var KINDS = ["human", "robot", "console-portrait", "full-body"];

  var PRESENTATIONS = ["photorealistic-human", "advanced-robotic",
    "command-console-portrait", "full-body-view", "participant-window"];

  var BODY_STATES = ["working", "listening", "speaking", "warning",
    "offline"];

  // Config fields, by form. console-portrait and full-body are framing
  // kinds (how the body is shown), so they accept the union: the body
  // shown in the frame may be human-form or robot-form.
  var HUMAN_CONFIG_FIELDS = ["hair", "beard", "clothing", "fringes",
    "jewelry", "facialAppearance", "gesture", "colorScheme",
    "presentationStyle"];
  var ROBOT_CONFIG_FIELDS = ["outerMaterial", "internalStructure",
    "illumination", "appearance", "colorScheme", "gesture"];
  var ALL_CONFIG_FIELDS = ["hair", "beard", "clothing", "fringes",
    "jewelry", "facialAppearance", "gesture", "colorScheme",
    "presentationStyle", "outerMaterial", "internalStructure",
    "illumination", "appearance"];

  // Identity fields. A body spec naming ANY of these is rejected with
  // reason "IDENTITY_FIELD_IN_BODY": identity lives in the identity
  // registries, never in a body record.
  var IDENTITY_FIELDS = ["id", "canonicalName", "displayName",
    "parentPrincipalId", "parentTribeId", "tribe", "Tribe",
    "parentTribe", "permissions", "permissionProfile", "history",
    "audit", "auditRecord", "auditTrail", "identityRef"];

  // Image / external-asset fields are never body fields: bodies are
  // described in words, never as copied imagery or outside URLs.
  var IMAGE_FIELDS = ["image", "imageUrl", "imageURL", "avatarUrl",
    "photo", "photoUrl", "portrait", "portraitUrl", "url", "src",
    "href", "externalUrl", "assetUrl", "imageData", "base64"];

  // Top-level fields a body spec may carry. Anything else is either an
  // identity field (rejected as IDENTITY_FIELD_IN_BODY) or an unknown
  // field (rejected as an invalid spec).
  var SPEC_FIELDS = ["agentId", "bodyId", "kind", "presentation",
    "config", "state"];

  // The 12 canonical Tribe principal ids, used as a fallback when
  // TribePrincipals is not loaded (same ids, same order).
  var FALLBACK_PRINCIPAL_IDS = ["tribe-judah", "tribe-reuben",
    "tribe-gad", "tribe-asher", "tribe-naphtali", "tribe-manasseh",
    "tribe-simeon", "tribe-levi", "tribe-issachar", "tribe-zebulun",
    "tribe-joseph", "tribe-benjamin"];

  function nowIso() {
    return new Date().toISOString();
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function isIso(value) {
    return typeof value === "string" && !isNaN(Date.parse(value));
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function cloneBody(record) {
    return {
      bodyId: record.bodyId,
      agentId: record.agentId,
      kind: record.kind,
      presentation: record.presentation,
      config: clone(record.config),
      state: record.state,
      identityRef: { agentId: record.identityRef.agentId,
        kind: record.identityRef.kind },
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  // Normalizes an identity string for STAR matching: lower case,
  // separators removed, so "STAR 3.0", "star-3.0" and "star30" all
  // compare equal. Same rule as TribePrincipals.isStarId.
  function normalizeIdentity(value) {
    if (typeof value !== "string") return "";
    return value.toLowerCase().replace(/[\s._\-]+/g, "");
  }

  // STAR sits above / coordinating the Tribe workforce; STAR is never a
  // Tribe principal, but STAR may still have a body record of its own.
  function isStarId(value) {
    if (global.TribePrincipals &&
      typeof global.TribePrincipals.isStarId === "function") {
      try { return !!global.TribePrincipals.isStarId(value); } catch (e) {}
    }
    var n = normalizeIdentity(value);
    return n === "star" || n === "star30";
  }

  function principalIds() {
    if (global.TribePrincipals &&
      Array.isArray(global.TribePrincipals.PRINCIPAL_IDS) &&
      global.TribePrincipals.PRINCIPAL_IDS.length) {
      return global.TribePrincipals.PRINCIPAL_IDS.slice();
    }
    return FALLBACK_PRINCIPAL_IDS.slice();
  }

  function isCanonicalPrincipalId(agentId) {
    if (global.TribePrincipals &&
      typeof global.TribePrincipals.isCanonicalId === "function") {
      try { return !!global.TribePrincipals.isCanonicalId(agentId); } catch (e) {}
    }
    return principalIds().indexOf(agentId) !== -1;
  }

  // The identity kind for identityRef: the agent's stable id plus the
  // kind of identity it is. "unknown" when no registry knows the id —
  // the body still records the agentId honestly, and the kind is never
  // guessed as a principal, worker, or Angel.
  function identityKindFor(agentId) {
    if (isStarId(agentId)) return "star";
    if (isCanonicalPrincipalId(agentId)) return "principal";
    if (global.AngelIdentities &&
      typeof global.AngelIdentities.getIdentity === "function") {
      try {
        if (global.AngelIdentities.getIdentity(agentId)) return "angel";
      } catch (e) {}
    }
    if (global.WorkerEngine &&
      typeof global.WorkerEngine.getWorker === "function") {
      try {
        if (global.WorkerEngine.getWorker(agentId)) return "worker";
      } catch (e) {}
    }
    if (global.BotOpsModel &&
      typeof global.BotOpsModel.describeIdentity === "function") {
      try {
        var dw = global.BotOpsModel.describeIdentity("worker", agentId);
        if (dw && dw.displayName !== null) return "worker";
      } catch (e) {}
    }
    return "unknown";
  }

  // Snapshot of the agent's identity record(s) from every registry that
  // knows the agent, for the before/after identity-preservation check.
  // Only records that actually exist are snapshotted: a describeIdentity
  // record with a null name is an "unknown agent" placeholder, not an
  // identity, and is not snapshotted.
  function snapshotIdentity(agentId) {
    var snap = {};
    if (global.TribePrincipals &&
      typeof global.TribePrincipals.getPrincipal === "function") {
      try {
        var p = global.TribePrincipals.getPrincipal(agentId);
        if (p) snap.principal = p;
      } catch (e) {}
    }
    if (global.AngelIdentities &&
      typeof global.AngelIdentities.getIdentity === "function") {
      try {
        var a = global.AngelIdentities.getIdentity(agentId);
        if (a) snap.angel = a;
      } catch (e) {}
    }
    if (global.BotOpsModel &&
      typeof global.BotOpsModel.describeIdentity === "function") {
      try {
        var dp = global.BotOpsModel.describeIdentity("principal", agentId);
        if (dp && dp.displayName !== null) snap.identityPrincipal = dp;
      } catch (e) {}
      try {
        var dw = global.BotOpsModel.describeIdentity("worker", agentId);
        if (dw && dw.displayName !== null) snap.identityWorker = dw;
      } catch (e) {}
    }
    return snap;
  }

  function identityUnchanged(before, after) {
    try {
      return JSON.stringify(before) === JSON.stringify(after);
    } catch (e) {
      return false;
    }
  }

  // Config fields allowed for a given body kind. console-portrait and
  // full-body are framing kinds, so they accept the full union.
  function allowedConfigFields(kind) {
    if (kind === "human") return HUMAN_CONFIG_FIELDS.slice();
    if (kind === "robot") return ROBOT_CONFIG_FIELDS.slice();
    return ALL_CONFIG_FIELDS.slice();
  }

  // ---- Validation (returns error arrays, never throws) ------------------

  // Validates a body spec as passed to assignBody / changeBody.
  // agentId, when supplied on the spec, must match the agent the body
  // is being assigned to. Identity fields anywhere in the spec (top
  // level or inside config) are identity errors, not generic ones.
  function validateBodySpec(spec) {
    var errors = [];
    if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
      return ["Body spec must be an object."];
    }
    var i, key;
    // Identity fields are rejected wherever they appear in the spec.
    for (i = 0; i < IDENTITY_FIELDS.length; i++) {
      if (Object.prototype.hasOwnProperty.call(spec, IDENTITY_FIELDS[i])) {
        errors.push("IDENTITY_FIELD_IN_BODY: field " + IDENTITY_FIELDS[i] +
          " is an identity field and must not appear in a body spec.");
      }
    }
    for (key in spec) {
      if (!Object.prototype.hasOwnProperty.call(spec, key)) continue;
      if (SPEC_FIELDS.indexOf(key) === -1 &&
        IDENTITY_FIELDS.indexOf(key) === -1) {
        errors.push("Unknown body spec field: " + key + ".");
      }
    }
    if (spec.agentId !== undefined && spec.agentId !== null &&
      !isNonEmptyString(spec.agentId)) {
      errors.push("agentId must be a non-empty string when supplied.");
    }
    if (spec.bodyId !== undefined && spec.bodyId !== null &&
      !isNonEmptyString(spec.bodyId)) {
      errors.push("bodyId must be a non-empty string when supplied.");
    }
    if (!isNonEmptyString(spec.kind)) {
      errors.push("kind is required and must be a non-empty string.");
    } else if (KINDS.indexOf(spec.kind) === -1) {
      errors.push("kind must be one of: " + KINDS.join(", ") + ".");
    }
    if (!isNonEmptyString(spec.presentation)) {
      errors.push("presentation is required and must be a non-empty string.");
    } else if (PRESENTATIONS.indexOf(spec.presentation) === -1) {
      errors.push("presentation must be one of: " +
        PRESENTATIONS.join(", ") + ".");
    }
    if (spec.state !== undefined && spec.state !== null) {
      if (!isNonEmptyString(spec.state)) {
        errors.push("state must be a non-empty string when supplied.");
      } else if (BODY_STATES.indexOf(spec.state) === -1) {
        errors.push("state must be one of: " + BODY_STATES.join(", ") + ".");
      }
    }
    if (spec.config !== undefined && spec.config !== null) {
      if (typeof spec.config !== "object" || Array.isArray(spec.config)) {
        errors.push("config must be an object when supplied.");
      } else {
        var allowed = KINDS.indexOf(spec.kind) !== -1
          ? allowedConfigFields(spec.kind) : ALL_CONFIG_FIELDS.slice();
        for (key in spec.config) {
          if (!Object.prototype.hasOwnProperty.call(spec.config, key)) continue;
          if (IDENTITY_FIELDS.indexOf(key) !== -1) {
            errors.push("IDENTITY_FIELD_IN_BODY: field " + key +
              " is an identity field and must not appear in a body config.");
            continue;
          }
          if (IMAGE_FIELDS.indexOf(key) !== -1) {
            errors.push("Body config must not carry image or external-asset fields (" +
              key + "): bodies are described in words, never as copied imagery or outside URLs.");
            continue;
          }
          if (allowed.indexOf(key) === -1) {
            errors.push("Unknown config field for kind " +
              (typeof spec.kind === "string" ? spec.kind : "?") + ": " +
              key + ". Allowed: " + allowed.join(", ") + ".");
            continue;
          }
          var value = spec.config[key];
          if (typeof value !== "string" || value.trim().length === 0) {
            errors.push("config." + key +
              " must be a non-empty string when present.");
          } else if (/https?:\/\//i.test(value) || /^data:/i.test(value) ||
            /(^|\s)www\./i.test(value)) {
            errors.push("config." + key +
              " must not contain a URL: bodies never point at outside assets.");
          }
        }
      }
    }
    return errors;
  }

  // Validates a stored body record: the spec rules (applied to the
  // spec-shaped fields only — identityRef / createdAt / updatedAt
  // are record fields the module itself owns, not spec fields) plus
  // the record fields the module itself owns (bodyId, agentId,
  // identityRef, createdAt, updatedAt).
  function validateBody(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return ["Body record must be an object."];
    }
    var errors = validateBodySpec({
      agentId: record.agentId,
      bodyId: record.bodyId,
      kind: record.kind,
      presentation: record.presentation,
      config: record.config,
      state: record.state
    });
    if (!isNonEmptyString(record.bodyId)) {
      errors.push("bodyId is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(record.agentId)) {
      errors.push("agentId is required and must be a non-empty string.");
    }
    if (!record.identityRef || typeof record.identityRef !== "object") {
      errors.push("identityRef is required and must be an object.");
    } else {
      if (record.identityRef.agentId !== record.agentId) {
        errors.push("identityRef.agentId must match agentId.");
      }
      if (!isNonEmptyString(record.identityRef.kind)) {
        errors.push("identityRef.kind is required and must be a non-empty string.");
      }
    }
    if (!isIso(record.createdAt)) {
      errors.push("createdAt must be an ISO date string.");
    }
    if (!isIso(record.updatedAt)) {
      errors.push("updatedAt must be an ISO date string.");
    }
    return errors;
  }

  function identityErrorFrom(errors) {
    for (var i = 0; i < errors.length; i++) {
      if (errors[i].indexOf("IDENTITY_FIELD_IN_BODY") === 0) return errors[i];
    }
    return null;
  }

  // ---- In-memory body store (one body per agent, session only) ----------

  var bodies = {};

  function findInternal(agentId) {
    if (typeof agentId !== "string") return null;
    return Object.prototype.hasOwnProperty.call(bodies, agentId)
      ? bodies[agentId] : null;
  }

  function buildRecord(agentId, spec, previous) {
    var stamp = nowIso();
    var config = {};
    if (spec.config && typeof spec.config === "object") {
      var key;
      for (key in spec.config) {
        if (Object.prototype.hasOwnProperty.call(spec.config, key)) {
          config[key] = spec.config[key];
        }
      }
    }
    return {
      bodyId: previous ? previous.bodyId
        : (isNonEmptyString(spec.bodyId) ? spec.bodyId.trim()
          : "body-" + agentId),
      agentId: agentId,
      kind: spec.kind,
      presentation: spec.presentation,
      config: config,
      state: isNonEmptyString(spec.state) ? spec.state : "offline",
      identityRef: { agentId: agentId, kind: identityKindFor(agentId) },
      createdAt: previous ? previous.createdAt : stamp,
      updatedAt: stamp
    };
  }

  // Shared assign/change core. changeBody requires an existing body and
  // preserves bodyId/createdAt; assignBody creates or replaces. Both
  // snapshot the identity record first and verify it is unchanged
  // after the write, rolling back on any mismatch.
  function applyBody(agentId, spec, previous, requireExisting) {
    if (!isNonEmptyString(agentId)) {
      return { ok: false, reason: "INVALID_AGENT_ID",
        errors: ["agentId is required and must be a non-empty string."] };
    }
    var cleanId = agentId.trim();
    if (requireExisting && !findInternal(cleanId)) {
      return { ok: false, reason: "NO_BODY",
        errors: ["No body record exists for agent " + cleanId + "."] };
    }
    var errors = validateBodySpec(spec);
    if (errors.length) {
      var identityError = identityErrorFrom(errors);
      if (identityError) {
        return { ok: false, reason: "IDENTITY_FIELD_IN_BODY",
          errors: errors, field: identityError };
      }
      return { ok: false, reason: "INVALID_BODY_SPEC", errors: errors };
    }
    if (spec.agentId !== undefined && spec.agentId !== null &&
      spec.agentId !== cleanId) {
      return { ok: false, reason: "AGENT_MISMATCH",
        errors: ["Body spec agentId (" + spec.agentId +
          ") does not match agent " + cleanId + "."] };
    }
    if (previous && isNonEmptyString(spec.bodyId) &&
      spec.bodyId.trim() !== previous.bodyId) {
      return { ok: false, reason: "BODY_ID_MISMATCH",
        errors: ["Body spec bodyId (" + spec.bodyId +
          ") does not match the existing body " + previous.bodyId +
          " — a body keeps its bodyId; change its fields, not its id."] };
    }
    var before = snapshotIdentity(cleanId);
    var record = buildRecord(cleanId, spec, previous);
    var recordErrors = validateBody(record);
    if (recordErrors.length) {
      return { ok: false, reason: "INVALID_BODY_SPEC",
        errors: recordErrors };
    }
    var rolledBack = findInternal(cleanId);
    bodies[cleanId] = record;
    var after = snapshotIdentity(cleanId);
    if (!identityUnchanged(before, after)) {
      // A body change must never change the identity. Roll back.
      if (rolledBack) bodies[cleanId] = rolledBack;
      else delete bodies[cleanId];
      return { ok: false, reason: "IDENTITY_CHANGED",
        errors: ["The agent identity record changed during the body change — the change was rolled back."] };
    }
    return { ok: true, body: cloneBody(record) };
  }

  // ---- Public API ---------------------------------------------------------

  // Assigns (creates or replaces) the body for an agent. The body spec
  // carries presentation only — any identity field in it is rejected
  // with reason "IDENTITY_FIELD_IN_BODY" and nothing is written.
  function assignBody(agentId, bodySpec) {
    return applyBody(agentId, bodySpec, null, false);
  }

  // Changes the body of an agent that already has one. Preserves
  // bodyId and createdAt, updates updatedAt, and verifies the agent's
  // identity record is unchanged afterwards. Unknown agent (no body)
  // returns {ok: false, reason: "NO_BODY"}.
  function changeBody(agentId, bodySpec) {
    if (!isNonEmptyString(agentId)) {
      return { ok: false, reason: "INVALID_AGENT_ID",
        errors: ["agentId is required and must be a non-empty string."] };
    }
    var previous = findInternal(agentId.trim());
    if (!previous) {
      return { ok: false, reason: "NO_BODY",
        errors: ["No body record exists for agent " + agentId.trim() + "."] };
    }
    return applyBody(agentId, bodySpec, previous, true);
  }

  // The body record for an agent, or null. An agent without a body
  // record has NO body — never a default or invented one. Returns a
  // clone: callers mutating it never touch the stored record.
  function bodyFor(agentId) {
    var record = findInternal(agentId);
    return record ? cloneBody(record) : null;
  }

  // Sets the runtime state of an agent's body. The state must be in
  // the closed set; an agent with no body returns
  // {ok: false, reason: "NO_BODY"}.
  function setBodyState(agentId, state) {
    if (!isNonEmptyString(agentId)) {
      return { ok: false, reason: "INVALID_AGENT_ID",
        errors: ["agentId is required and must be a non-empty string."] };
    }
    var cleanId = agentId.trim();
    var record = findInternal(cleanId);
    if (!record) {
      return { ok: false, reason: "NO_BODY",
        errors: ["No body record exists for agent " + cleanId + "."] };
    }
    if (!isNonEmptyString(state) || BODY_STATES.indexOf(state) === -1) {
      return { ok: false, reason: "INVALID_STATE",
        errors: ["state must be one of: " + BODY_STATES.join(", ") + "."] };
    }
    record.state = state;
    record.updatedAt = nowIso();
    return { ok: true, body: cloneBody(record) };
  }

  // Removes an agent's body record. Unknown agent (no body) returns
  // {ok: false, reason: "NO_BODY"}.
  function removeBody(agentId) {
    if (!isNonEmptyString(agentId)) {
      return { ok: false, reason: "INVALID_AGENT_ID",
        errors: ["agentId is required and must be a non-empty string."] };
    }
    var cleanId = agentId.trim();
    if (!findInternal(cleanId)) {
      return { ok: false, reason: "NO_BODY",
        errors: ["No body record exists for agent " + cleanId + "."] };
    }
    delete bodies[cleanId];
    return { ok: true, agentId: cleanId };
  }

  // All body records, in assignment order. Clones only.
  function listBodies() {
    var out = [];
    var key;
    for (key in bodies) {
      if (Object.prototype.hasOwnProperty.call(bodies, key)) {
        out.push(cloneBody(bodies[key]));
      }
    }
    return out;
  }

  // Bodies of the Twelve Tribe principals only. STAR is never a Tribe
  // principal, so a STAR body never appears here even though STAR may
  // have a body record (see starBody).
  function listTribeBodies() {
    var ids = principalIds();
    var out = [];
    for (var i = 0; i < ids.length; i++) {
      var record = findInternal(ids[i]);
      if (record) out.push(cloneBody(record));
    }
    return out;
  }

  // STAR's body record, or null when STAR has none. STAR is matched by
  // identity ("star", "STAR", "star-3.0"), not by one spelling.
  function starBody() {
    var key;
    for (key in bodies) {
      if (Object.prototype.hasOwnProperty.call(bodies, key) &&
        isStarId(key)) {
        return cloneBody(bodies[key]);
      }
    }
    return null;
  }

  // Honest counts only: counts of stored body records, never of live
  // activity. A body state of "working" is a presentation state, not
  // evidence that any work is running.
  function summary() {
    var byKind = {};
    var byState = {};
    var i;
    for (i = 0; i < KINDS.length; i++) byKind[KINDS[i]] = 0;
    for (i = 0; i < BODY_STATES.length; i++) byState[BODY_STATES[i]] = 0;
    var all = listBodies();
    for (i = 0; i < all.length; i++) {
      if (byKind.hasOwnProperty(all[i].kind)) byKind[all[i].kind] += 1;
      if (byState.hasOwnProperty(all[i].state)) byState[all[i].state] += 1;
    }
    return {
      total: all.length,
      byKind: byKind,
      byState: byState,
      tribeBodies: listTribeBodies().length,
      starHasBody: starBody() !== null,
      note: "Counts are of stored body records only. A body state is a presentation state, not evidence of live activity."
    };
  }

  // Clears all body records. Test/support use: the store is in-memory
  // and session-only, so a fresh load starts empty anyway.
  function reset() {
    bodies = {};
    return { ok: true, total: 0 };
  }

  return {
    KINDS: KINDS.slice(),
    PRESENTATIONS: PRESENTATIONS.slice(),
    BODY_STATES: BODY_STATES.slice(),
    HUMAN_CONFIG_FIELDS: HUMAN_CONFIG_FIELDS.slice(),
    ROBOT_CONFIG_FIELDS: ROBOT_CONFIG_FIELDS.slice(),
    ALL_CONFIG_FIELDS: ALL_CONFIG_FIELDS.slice(),
    IDENTITY_FIELDS: IDENTITY_FIELDS.slice(),
    validateBodySpec: validateBodySpec,
    validateBody: validateBody,
    assignBody: assignBody,
    changeBody: changeBody,
    bodyFor: bodyFor,
    setBodyState: setBodyState,
    removeBody: removeBody,
    listBodies: listBodies,
    listTribeBodies: listTribeBodies,
    starBody: starBody,
    isStarId: isStarId,
    identityKindFor: identityKindFor,
    summary: summary,
    reset: reset
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
