/* MTI6-GTADWIY-COCKPIT — Treasury Mandates (continuous development campaign)
 *
 * Treasury-mandate governance, FOUNDATION ONLY. No financial
 * execution, no signing, no cash-out, no external actions, no
 * network, no secrets, no DOM, no storage. A mandate is a BOUND: it
 * records what a future treasury action would be allowed to do, and
 * checkAction() evaluates a proposed action against that bound. The
 * evaluation never executes anything — there is no execution path
 * anywhere in this file, and a mandate ALLOWING an action does not
 * perform it.
 *
 * Vocabulary reuse (no competing vocabulary invented):
 *   - Verification states reuse Truth.TRUTH_STATES / the CryptoWorld
 *     verification vocabulary when truth.js is loaded, else the same
 *     closed list as a fallback. A mandate's verificationStatus says
 *     how true its provenance/contents are; it never authorises
 *     execution on its own.
 *   - The bounded in-memory audit log (max 200, newest first) matches
 *     ToolRouter's decision log and AutonomyControl's audit log. It
 *     is in-memory only: it is never persisted to localStorage or
 *     IndexedDB by this module, and mandates are likewise in-memory
 *     records in this foundation build — persistence is a coordinator
 *     wiring decision, not something this module does silently.
 *   - The secret scan reuses the bot-ops-model SECRET_PATTERN shape
 *     (keys / passwords / private keys / issued tokens), not ordinary
 *     words: a bare "token" is a legitimate crypto term and is NOT
 *     matched.
 *
 * Limits are numbers or UNKNOWN. null means UNKNOWN, never zero by
 * default: a null maxAction is "no recorded per-action limit", NOT a
 * zero limit. A mandate may only become ACTIVE when it has owner
 * provenance (createdBy) AND at least one limit set (maxAction,
 * lossLimit, or capitalAllocation). Activation without limits is
 * rejected — an unbounded ACTIVE mandate must never exist.
 *
 * State machine (strict allowlist; REVOKED and EXPIRED are terminal):
 *   DRAFT -> ACTIVE -> PAUSED -> ACTIVE
 *   ACTIVE -> EXPIRED (only once past expiration) or REVOKED
 * A DRAFT cannot be paused, a PAUSED mandate cannot be revoked
 * directly (resume it, then revoke it), and nothing leaves REVOKED
 * or EXPIRED. Every transition is audit-logged. checkExpirations()
 * moves ACTIVE mandates whose expiration has passed to EXPIRED; it
 * is the only path into EXPIRED besides expireMandate(), which
 * enforces the same past-expiration condition.
 *
 * checkAction() is a PURE evaluation: it reads the mandate and the
 * proposed action and returns { allowed, reason }. It never mutates
 * the mandate, never logs, and never executes. Denial order:
 *   unknown mandate / not ACTIVE (DRAFT, PAUSED, REVOKED, EXPIRED)
 *   / past expiration / before start / securityHold / securityPause
 *   / allowlist miss (wallet, asset, network, protocol, strategy)
 *   / approved-list miss (wallet, account, network, asset, protocol,
 *   strategy — Wallet spec W9 / Crypto spec §99-17) / amount above
 *   maxAction / amount above maximumActionValue / amount above
 *   remaining daily movement (maxDailyMovement / maximumDailyValue).
 * Allowlist rule (fail closed): a value present on the action must
 * be in the corresponding allowlist. An empty allowlist permits
 * nothing for that field — an allowlist that lists nothing allows
 * nothing. A field absent from the action is not checked (it does
 * not apply to that action).
 *
 * Wallet-spec fields (W9 / §99-16, §99-17 — ADDITIVE, alongside the
 * foundation fields above; no foundation field or rule is changed):
 *   - approvedWalletIds, approvedAccountIds, approvedNetworks,
 *     approvedAssets, approvedProtocols, approvedStrategies:
 *     allowlists in the Wallet-spec naming. Their semantics differ
 *     deliberately from the foundation allowed* lists: a NON-EMPTY
 *     approved* list restricts that dimension (an action naming a
 *     value outside it is denied with reason "NOT_IN_MANDATE"),
 *     while an EMPTY approved* list means "no restriction from this
 *     mandate on that dimension". Both sets of lists are checked
 *     when present, so an action must pass each non-empty list that
 *     applies to it. An allowlist pass is an evaluation only: it
 *     never executes anything, and the financial-execution denial
 *     (no execution path exists anywhere in this module, and
 *     AutonomyControl denies financial kinds) still outranks it —
 *     "allowed within mandate" never means "executed".
 *   - maximumActionValue, maximumDailyValue: per-action and
 *     per-day value caps, enforced in checkAction() exactly like
 *     maxAction / maxDailyMovement (null = UNKNOWN, never zero).
 *     The daily cap shares the same recorded day total as
 *     maxDailyMovement; recording a movement never moves funds.
 *   - minimumReserve, maximumLoss, maximumCosts, riskLimits:
 *     recorded bounds only (riskLimits is a plain object, or null).
 *     Their live enforcement needs loss / cost / capital ledgers
 *     that do not exist yet — no ledger is invented here, and no
 *     limit is silently treated as zero. Same treatment as the
 *     foundation lossLimit / costLimit / riskLimit.
 *   - start: the mandate's validity start (ISO timestamp, or null).
 *     An action dated before start is denied (MANDATE_NOT_STARTED),
 *     symmetric with the expiration gate.
 *   - securityPause: a second pause flag, enforced exactly like
 *     securityHold (SECURITY_PAUSE).
 *   - status: a descriptive status string (or null). Record only:
 *     the state machine (state) remains authoritative, and status
 *     never changes a checkAction() outcome.
 *   - expiration, ownerOverride: already existed as foundation
 *     fields; listed here because the Wallet spec names them too.
 * Activation is UNCHANGED: a mandate may only become ACTIVE with
 * owner provenance AND at least one of maxAction, lossLimit, or
 * capitalAllocation set. The new value fields do not satisfy the
 * activation gate on their own — a mandate carrying only
 * maximumActionValue still cannot activate until one of the three
 * foundation limits is set.
 *
 * Daily movement is bookkeeping, not execution: recordMovement()
 * records that a movement happened (reported from elsewhere) against
 * the mandate's day total, so checkAction() can enforce
 * maxDailyMovement. Recording a movement never moves funds and
 * never implies the movement was authorised by this module. The day
 * total resets when the recorded date changes. lossLimit, costLimit,
 * riskLimit, capitalAllocation, and reserve are recorded bounds in
 * this foundation: they are validated as numbers-or-UNKNOWN and
 * exposed in the mandate record, and their live enforcement needs
 * loss / cost / capital ledgers that do not exist yet — no ledger
 * is invented here, and no limit is silently treated as zero.
 * ownerOverride is recorded provenance only: it does NOT bypass
 * checkAction() denials in this foundation. An override-based
 * allowance needs a future owner-approval path; until one exists,
 * the mandate bound stands.
 *
 * Depends on truth.js at load order time only in the weak sense:
 * it is consulted through a typeof guard, and this module degrades
 * to its own identical fallback vocabulary when it is absent.
 * Script tag order (coordinator wiring):
 *   js/truth.js, then js/treasury-mandates.js.
 * (star-command.js and tool-router.js are not needed by this module,
 * but the campaign loads them before autonomy.js; treasury-mandates.js
 * itself only needs truth.js.) Loads in a bare vm context with no
 * window, no DOM, no network.
 *
 *   TreasuryMandates.MANDATE_STATES -> ["DRAFT","ACTIVE","PAUSED",
 *                                       "EXPIRED","REVOKED"]
 *   TreasuryMandates.createMandate(input) -> stored mandate (throws on invalid)
 *   TreasuryMandates.getMandate(id)       -> mandate copy or null
 *   TreasuryMandates.listMandates()       -> all mandate copies
 *   TreasuryMandates.canActivate(mandate) -> { ok, reasons[] }
 *   TreasuryMandates.activateMandate(id)  -> ACTIVE mandate (throws if rejected)
 *   TreasuryMandates.pauseMandate(id)     -> PAUSED mandate
 *   TreasuryMandates.resumeMandate(id)    -> ACTIVE mandate
 *   TreasuryMandates.revokeMandate(id)    -> REVOKED mandate
 *   TreasuryMandates.expireMandate(id, now) -> EXPIRED mandate
 *   TreasuryMandates.checkExpirations(now)  -> ids moved to EXPIRED
 *   TreasuryMandates.checkAction(mandateId, action) -> { allowed, reason }
 *   TreasuryMandates.recordMovement(mandateId, amount, at) -> day total
 *   TreasuryMandates.summary()            -> honest counts
 *   TreasuryMandates.getAuditLog() / clearAuditLog()
 *   TreasuryMandates.reset()              -> clears mandates + log (tests / reset)
 */
(function (global) {
  "use strict";

  // ---- Reused vocabulary (fallback identical to the source) -------------

  var FALLBACK_VERIFICATION_STATES = ["UNKNOWN", "DISCOVERED",
    "UNVERIFIED", "VERIFIED", "STALE", "UNAVAILABLE", "NOT_CONNECTED",
    "DISABLED"];

  function verificationStates() {
    if (global.Truth && Array.isArray(global.Truth.VERIFICATION_STATES)) {
      return global.Truth.VERIFICATION_STATES;
    }
    return FALLBACK_VERIFICATION_STATES;
  }

  // ---- Closed vocabularies owned by this module ------------------------

  var MANDATE_STATES = ["DRAFT", "ACTIVE", "PAUSED", "EXPIRED", "REVOKED"];

  // Strict allowlist. EXPIRED is entered only through expireMandate()
  // / checkExpirations(), which additionally enforce the
  // past-expiration condition; the map alone does not authorise it.
  var TRANSITIONS = {
    DRAFT: ["ACTIVE"],
    ACTIVE: ["PAUSED", "EXPIRED", "REVOKED"],
    PAUSED: ["ACTIVE"],
    EXPIRED: [],
    REVOKED: []
  };

  var TERMINAL_STATES = ["EXPIRED", "REVOKED"];

  // The limit fields. A limit is a finite number >= 0, or null
  // (UNKNOWN — never zero by default).
  var LIMIT_FIELDS = ["maxAction", "maxDailyMovement", "capitalAllocation",
    "reserve", "lossLimit", "costLimit", "riskLimit"];

  // At least one of these must be set (non-null) for activation.
  var ACTIVATION_LIMIT_FIELDS = ["maxAction", "lossLimit", "capitalAllocation"];

  var ALLOWLIST_FIELDS = ["allowedWallets", "allowedAssets",
    "allowedNetworks", "allowedProtocols", "allowedStrategies"];

  // Action field -> mandate allowlist field, in check order.
  var ALLOWLIST_CHECKS = [
    { actionField: "wallet", listField: "allowedWallets", reason: "WALLET_NOT_ALLOWED" },
    { actionField: "asset", listField: "allowedAssets", reason: "ASSET_NOT_ALLOWED" },
    { actionField: "network", listField: "allowedNetworks", reason: "NETWORK_NOT_ALLOWED" },
    { actionField: "protocol", listField: "allowedProtocols", reason: "PROTOCOL_NOT_ALLOWED" },
    { actionField: "strategy", listField: "allowedStrategies", reason: "STRATEGY_NOT_ALLOWED" }
  ];

  // Wallet-spec approved lists (W9 / §99-17). Semantics differ from
  // the foundation allowed* lists above: a NON-EMPTY approved* list
  // restricts its dimension; an EMPTY one means no restriction from
  // this mandate on that dimension. Action fields are read in order
  // (walletId falls back to wallet, accountId to account).
  var APPROVED_LIST_FIELDS = ["approvedWalletIds", "approvedAccountIds",
    "approvedNetworks", "approvedAssets", "approvedProtocols",
    "approvedStrategies"];

  var APPROVED_CHECKS = [
    { actionFields: ["walletId", "wallet"], listField: "approvedWalletIds", label: "wallet" },
    { actionFields: ["accountId", "account"], listField: "approvedAccountIds", label: "account" },
    { actionFields: ["network"], listField: "approvedNetworks", label: "network" },
    { actionFields: ["asset"], listField: "approvedAssets", label: "asset" },
    { actionFields: ["protocol"], listField: "approvedProtocols", label: "protocol" },
    { actionFields: ["strategy"], listField: "approvedStrategies", label: "strategy" }
  ];

  // Wallet-spec value bounds (W9 / §99-16). maximumActionValue and
  // maximumDailyValue are enforced in checkAction() like maxAction /
  // maxDailyMovement; minimumReserve, maximumLoss and maximumCosts
  // are recorded bounds only (no ledgers exist yet to enforce them
  // against). A bound is a finite number >= 0, or null (UNKNOWN).
  var NEW_LIMIT_FIELDS = ["maximumActionValue", "maximumDailyValue",
    "minimumReserve", "maximumLoss", "maximumCosts"];

  var AUDIT_MAX = 200;

  // Same secret shape as bot-ops-model.js / tool-router.js: keys /
  // passwords / private keys / issued tokens. A bare "token" is a
  // legitimate crypto term and is NOT matched.
  var SECRET_PATTERN = /(api[_-]?key|secret|password|passwd|private[_-]?key|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-live-[a-z0-9]+|ghp_[a-z0-9]+|github_pat_[a-z0-9_]+|xox[baprs]-[a-z0-9-]+)/i;

  // ---- State (in-memory only; nothing is persisted) --------------------

  var mandates = {}; // id -> mandate record
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

  function isValidLimit(value) {
    return value === null || value === undefined ||
      (typeof value === "number" && isFinite(value) && value >= 0);
  }

  function normalizeLimit(value) {
    return (value === null || value === undefined) ? null : value;
  }

  function parseTime(value) {
    if (value === undefined || value === null) return null;
    var ms = Date.parse(value);
    return isNaN(ms) ? null : ms;
  }

  function dayOf(value) {
    var ms = parseTime(value);
    if (ms === null) ms = Date.now();
    return new Date(ms).toISOString().slice(0, 10);
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

  function copyMandate(mandate) {
    if (!mandate) return null;
    var copy = {
      id: mandate.id,
      name: mandate.name,
      state: mandate.state,
      createdBy: mandate.createdBy,
      createdAt: mandate.createdAt,
      updatedAt: mandate.updatedAt,
      expiration: mandate.expiration,
      start: mandate.start,
      securityHold: mandate.securityHold,
      securityPause: mandate.securityPause,
      ownerOverride: mandate.ownerOverride,
      status: mandate.status,
      riskLimits: mandate.riskLimits ? shallowCopy(mandate.riskLimits) : null,
      verificationStatus: mandate.verificationStatus,
      dailyMovement: {
        date: mandate.dailyMovement.date,
        total: mandate.dailyMovement.total
      }
    };
    var i;
    for (i = 0; i < ALLOWLIST_FIELDS.length; i++) {
      copy[ALLOWLIST_FIELDS[i]] = mandate[ALLOWLIST_FIELDS[i]].slice();
    }
    for (i = 0; i < APPROVED_LIST_FIELDS.length; i++) {
      copy[APPROVED_LIST_FIELDS[i]] = mandate[APPROVED_LIST_FIELDS[i]].slice();
    }
    for (i = 0; i < LIMIT_FIELDS.length; i++) {
      copy[LIMIT_FIELDS[i]] = mandate[LIMIT_FIELDS[i]];
    }
    for (i = 0; i < NEW_LIMIT_FIELDS.length; i++) {
      copy[NEW_LIMIT_FIELDS[i]] = mandate[NEW_LIMIT_FIELDS[i]];
    }
    return copy;
  }

  // Shallow copy of a plain object (used for riskLimits).
  function shallowCopy(obj) {
    var out = {};
    Object.keys(obj).forEach(function (k) { out[k] = obj[k]; });
    return out;
  }

  function newMandateId() {
    return "mand-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 8);
  }

  function appendAudit(entry) {
    auditLog.unshift(entry);
    if (auditLog.length > AUDIT_MAX) auditLog.length = AUDIT_MAX;
  }

  // ---- Mandate validation / creation -------------------------------------

  // Returns an array of error strings (empty = valid). Never throws.
  function validateMandate(input) {
    var errors = [];
    var i;
    if (!input || typeof input !== "object") {
      return ["Mandate must be an object."];
    }
    if (!isNonEmptyString(input.name)) {
      errors.push("name is required and must be a non-empty string.");
    }
    // Owner provenance is required to create a mandate: without a
    // named creator there is no one accountable for the bound it
    // sets, so the mandate is rejected, not stored.
    if (!isNonEmptyString(input.createdBy)) {
      errors.push("createdBy is required and must be a non-empty string (owner provenance — who created this mandate).");
    }
    for (i = 0; i < ALLOWLIST_FIELDS.length; i++) {
      var field = ALLOWLIST_FIELDS[i];
      if (input[field] !== undefined && input[field] !== null &&
          !isStringArray(input[field])) {
        errors.push(field + " must be an array of strings.");
      }
    }
    for (i = 0; i < LIMIT_FIELDS.length; i++) {
      var limitField = LIMIT_FIELDS[i];
      if (!isValidLimit(input[limitField])) {
        errors.push(limitField + " must be a finite number >= 0, or null (UNKNOWN — never zero by default).");
      }
    }
    // Wallet-spec approved lists: arrays of strings when present.
    for (i = 0; i < APPROVED_LIST_FIELDS.length; i++) {
      var approvedField = APPROVED_LIST_FIELDS[i];
      if (input[approvedField] !== undefined && input[approvedField] !== null &&
          !isStringArray(input[approvedField])) {
        errors.push(approvedField + " must be an array of strings.");
      }
    }
    // Wallet-spec value bounds: numbers-or-UNKNOWN, like the
    // foundation limits. They are validated here; only
    // maximumActionValue / maximumDailyValue are enforced by
    // checkAction(), the rest are recorded bounds (no ledgers yet).
    for (i = 0; i < NEW_LIMIT_FIELDS.length; i++) {
      var newLimitField = NEW_LIMIT_FIELDS[i];
      if (!isValidLimit(input[newLimitField])) {
        errors.push(newLimitField + " must be a finite number >= 0, or null (UNKNOWN — never zero by default).");
      }
    }
    // riskLimits is a recorded bound object, or null (UNKNOWN).
    if (input.riskLimits !== undefined && input.riskLimits !== null &&
        (typeof input.riskLimits !== "object" || Array.isArray(input.riskLimits))) {
      errors.push("riskLimits must be a plain object, or null (UNKNOWN).");
    }
    if (input.start !== undefined && input.start !== null) {
      if (typeof input.start !== "string" || parseTime(input.start) === null) {
        errors.push("start must be a valid ISO timestamp string, or null.");
      }
    }
    if (input.securityPause !== undefined && input.securityPause !== null &&
        typeof input.securityPause !== "boolean") {
      errors.push("securityPause must be a boolean.");
    }
    if (input.status !== undefined && input.status !== null &&
        typeof input.status !== "string") {
      errors.push("status must be a string, or null.");
    }
    if (input.expiration !== undefined && input.expiration !== null) {
      if (typeof input.expiration !== "string" || parseTime(input.expiration) === null) {
        errors.push("expiration must be a valid ISO timestamp string, or null.");
      }
    }
    if (input.securityHold !== undefined && input.securityHold !== null &&
        typeof input.securityHold !== "boolean") {
      errors.push("securityHold must be a boolean.");
    }
    if (input.ownerOverride !== undefined && input.ownerOverride !== null &&
        typeof input.ownerOverride !== "boolean") {
      errors.push("ownerOverride must be a boolean.");
    }
    if (input.verificationStatus !== undefined &&
        input.verificationStatus !== null &&
        verificationStates().indexOf(input.verificationStatus) === -1) {
      errors.push("verificationStatus must be one of: " + verificationStates().join(", ") + ".");
    }
    var secretFields = [["name", input.name], ["createdBy", input.createdBy]];
    for (i = 0; i < ALLOWLIST_FIELDS.length; i++) {
      secretFields.push([ALLOWLIST_FIELDS[i], input[ALLOWLIST_FIELDS[i]]]);
    }
    for (i = 0; i < APPROVED_LIST_FIELDS.length; i++) {
      secretFields.push([APPROVED_LIST_FIELDS[i], input[APPROVED_LIST_FIELDS[i]]]);
    }
    var secretField = findSecretField(input, secretFields);
    if (secretField) {
      errors.push("Field " + secretField + " looks like a secret or credential and must not be stored in a mandate.");
    }
    return errors;
  }

  // Creates a mandate. New mandates start DRAFT — nothing is ACTIVE
  // until activateMandate() passes the activation gate. Throws an
  // Error listing every reason on invalid input; nothing is stored.
  function createMandate(input) {
    var errors = validateMandate(input);
    if (errors.length) {
      throw new Error("Invalid treasury mandate: " + errors.join(" "));
    }
    var stamp = nowIso();
    var mandate = {
      id: newMandateId(),
      name: input.name.trim(),
      state: "DRAFT",
      createdBy: input.createdBy.trim(),
      createdAt: stamp,
      updatedAt: stamp,
      expiration: input.expiration || null,
      start: input.start || null,
      securityHold: input.securityHold === true,
      securityPause: input.securityPause === true,
      ownerOverride: input.ownerOverride === true,
      status: (typeof input.status === "string" && input.status.trim() !== "")
        ? input.status.trim() : null,
      riskLimits: (input.riskLimits && typeof input.riskLimits === "object")
        ? shallowCopy(input.riskLimits) : null,
      verificationStatus: input.verificationStatus || "UNVERIFIED",
      dailyMovement: { date: null, total: 0 }
    };
    var i;
    for (i = 0; i < ALLOWLIST_FIELDS.length; i++) {
      mandate[ALLOWLIST_FIELDS[i]] = input[ALLOWLIST_FIELDS[i]]
        ? input[ALLOWLIST_FIELDS[i]].slice() : [];
    }
    for (i = 0; i < APPROVED_LIST_FIELDS.length; i++) {
      mandate[APPROVED_LIST_FIELDS[i]] = input[APPROVED_LIST_FIELDS[i]]
        ? input[APPROVED_LIST_FIELDS[i]].slice() : [];
    }
    for (i = 0; i < LIMIT_FIELDS.length; i++) {
      mandate[LIMIT_FIELDS[i]] = normalizeLimit(input[LIMIT_FIELDS[i]]);
    }
    for (i = 0; i < NEW_LIMIT_FIELDS.length; i++) {
      mandate[NEW_LIMIT_FIELDS[i]] = normalizeLimit(input[NEW_LIMIT_FIELDS[i]]);
    }
    mandates[mandate.id] = mandate;
    appendAudit({
      at: stamp,
      type: "MANDATE_CREATED",
      mandateId: mandate.id,
      name: mandate.name,
      from: null,
      to: "DRAFT",
      decision: null,
      reason: "Mandate created by " + mandate.createdBy + " in DRAFT."
    });
    return copyMandate(mandate);
  }

  function getMandate(id) {
    if (typeof id !== "string") return null;
    return copyMandate(mandates[id] || null);
  }

  function listMandates() {
    return Object.keys(mandates).sort().map(function (id) {
      return copyMandate(mandates[id]);
    });
  }

  // ---- Activation gate ---------------------------------------------------

  // Pure check: may this mandate become ACTIVE? Returns
  // { ok, reasons[] }. Activation needs owner provenance AND at
  // least one limit set (maxAction, lossLimit, or capitalAllocation).
  // An unbounded ACTIVE mandate must never exist.
  function canActivate(mandate) {
    var reasons = [];
    if (!mandate || typeof mandate !== "object") {
      return { ok: false, reasons: ["No mandate record was given."] };
    }
    if (!isNonEmptyString(mandate.createdBy)) {
      reasons.push("createdBy (owner provenance) is required for activation.");
    }
    var hasLimit = false;
    for (var i = 0; i < ACTIVATION_LIMIT_FIELDS.length; i++) {
      if (mandate[ACTIVATION_LIMIT_FIELDS[i]] !== null &&
          mandate[ACTIVATION_LIMIT_FIELDS[i]] !== undefined) {
        hasLimit = true;
        break;
      }
    }
    if (!hasLimit) {
      reasons.push("At least one limit must be set (maxAction, lossLimit, or capitalAllocation) — activation without limits is rejected; a limit of null is UNKNOWN, never zero.");
    }
    return { ok: reasons.length === 0, reasons: reasons };
  }

  // ---- State machine -----------------------------------------------------

  function transition(mandate, to, nowMs) {
    var from = mandate.state;
    if (TRANSITIONS[from].indexOf(to) === -1) {
      throw new Error("Illegal mandate transition: " + from + " -> " + to + " is not allowed.");
    }
    if (to === "ACTIVE" && from === "DRAFT") {
      var gate = canActivate(mandate);
      if (!gate.ok) {
        throw new Error("Mandate activation rejected: " + gate.reasons.join(" "));
      }
    }
    if (to === "EXPIRED") {
      if (!mandate.expiration || parseTime(mandate.expiration) === null) {
        throw new Error("Mandate cannot expire: no valid expiration is set.");
      }
      var atMs = (typeof nowMs === "number") ? nowMs : Date.now();
      if (atMs < parseTime(mandate.expiration)) {
        throw new Error("Mandate cannot expire: expiration " + mandate.expiration + " has not passed yet.");
      }
    }
    mandate.state = to;
    mandate.updatedAt = nowIso();
    appendAudit({
      at: mandate.updatedAt,
      type: "MANDATE_STATE",
      mandateId: mandate.id,
      name: mandate.name,
      from: from,
      to: to,
      decision: null,
      reason: "Mandate state " + from + " -> " + to + "."
    });
    return copyMandate(mandate);
  }

  function requireMandate(id) {
    if (typeof id !== "string" || !mandates[id]) {
      throw new Error("No treasury mandate with id " + String(id) + ".");
    }
    return mandates[id];
  }

  function activateMandate(id) {
    return transition(requireMandate(id), "ACTIVE");
  }

  function pauseMandate(id) {
    return transition(requireMandate(id), "PAUSED");
  }

  function resumeMandate(id) {
    return transition(requireMandate(id), "ACTIVE");
  }

  function revokeMandate(id) {
    return transition(requireMandate(id), "REVOKED");
  }

  // Moves one ACTIVE mandate to EXPIRED when its expiration has
  // passed. `now` is an ISO timestamp string (or a Date); defaults
  // to the current time. Throws when the mandate is not ACTIVE or
  // its expiration has not passed.
  function expireMandate(id, now) {
    var mandate = requireMandate(id);
    if (mandate.state !== "ACTIVE") {
      throw new Error("Mandate cannot expire: state is " + mandate.state + ", not ACTIVE.");
    }
    var nowMs = parseTime(now);
    if (nowMs === null) nowMs = Date.now();
    return transition(mandate, "EXPIRED", nowMs);
  }

  // Moves every ACTIVE mandate whose expiration has passed to
  // EXPIRED. `now` is an ISO timestamp string (or a Date); defaults
  // to the current time. Returns the ids moved. A mandate with no
  // expiration never expires.
  function checkExpirations(now) {
    var nowMs = parseTime(now);
    if (nowMs === null) nowMs = Date.now();
    var moved = [];
    var ids = Object.keys(mandates);
    for (var i = 0; i < ids.length; i++) {
      var mandate = mandates[ids[i]];
      if (mandate.state !== "ACTIVE") continue;
      if (!mandate.expiration) continue;
      var expMs = parseTime(mandate.expiration);
      if (expMs !== null && nowMs >= expMs) {
        transition(mandate, "EXPIRED", nowMs);
        moved.push(mandate.id);
      }
    }
    return moved;
  }

  // ---- Daily-movement bookkeeping (records only, never execution) -------

  // Records that a movement of `amount` happened (reported from
  // elsewhere) against the mandate's day total, so checkAction() can
  // enforce maxDailyMovement. This records a fact; it never moves
  // funds, never signs, and never implies the movement was
  // authorised by this module. The day total resets when the
  // recorded date changes. Throws on an unknown mandate or an
  // invalid amount; nothing is recorded.
  function recordMovement(mandateId, amount, at) {
    var mandate = requireMandate(mandateId);
    if (typeof amount !== "number" || !isFinite(amount) || amount < 0) {
      throw new Error("recordMovement requires a finite amount >= 0.");
    }
    var day = dayOf(at);
    if (mandate.dailyMovement.date !== day) {
      mandate.dailyMovement = { date: day, total: 0 };
    }
    mandate.dailyMovement.total += amount;
    mandate.updatedAt = nowIso();
    appendAudit({
      at: mandate.updatedAt,
      type: "MOVEMENT_RECORDED",
      mandateId: mandate.id,
      name: mandate.name,
      from: null,
      to: null,
      decision: null,
      reason: "Movement of " + amount + " recorded for " + day +
        "; day total is now " + mandate.dailyMovement.total +
        ". Recording a movement never moves funds."
    });
    return {
      date: mandate.dailyMovement.date,
      total: mandate.dailyMovement.total
    };
  }

  // Remaining daily movement for a day, or null when no daily limit
  // is set (UNKNOWN — never zero by default). Pure computation.
  function remainingDailyMovement(mandate, at) {
    if (!mandate || mandate.maxDailyMovement === null ||
        mandate.maxDailyMovement === undefined) {
      return null;
    }
    var day = dayOf(at);
    var spent = (mandate.dailyMovement &&
      mandate.dailyMovement.date === day)
      ? mandate.dailyMovement.total : 0;
    var remaining = mandate.maxDailyMovement - spent;
    return remaining < 0 ? 0 : remaining;
  }

  // Remaining daily value under the Wallet-spec maximumDailyValue
  // cap, or null when it is not set. Shares the same recorded day
  // total as remainingDailyMovement: one day total, two caps.
  function remainingDailyValue(mandate, at) {
    if (!mandate || mandate.maximumDailyValue === null ||
        mandate.maximumDailyValue === undefined) {
      return null;
    }
    var day = dayOf(at);
    var spent = (mandate.dailyMovement &&
      mandate.dailyMovement.date === day)
      ? mandate.dailyMovement.total : 0;
    var remaining = mandate.maximumDailyValue - spent;
    return remaining < 0 ? 0 : remaining;
  }

  // ---- Pure evaluation: checkAction --------------------------------------

  // Evaluates a proposed action against a mandate. PURE: it reads
  // the mandate and the action, returns { allowed, reason }, and
  // changes nothing — no state, no log, no execution. A returned
  // allowed=true means "within the mandate bound"; it does NOT
  // perform the action, and no execution path exists in this module.
  function checkAction(mandateId, action) {
    var at = nowIso();

    function result(allowed, reason, mandate) {
      return {
        allowed: !!allowed,
        reason: reason,
        mandateId: typeof mandateId === "string" ? mandateId : null,
        mandateState: mandate ? mandate.state : null,
        kind: action && typeof action.kind === "string" ? action.kind : null,
        amount: action && typeof action.amount === "number" ? action.amount : null,
        remainingDailyMovement: mandate
          ? remainingDailyMovement(mandate, action && action.at ? action.at : at)
          : null,
        remainingDailyValue: mandate
          ? remainingDailyValue(mandate, action && action.at ? action.at : at)
          : null,
        at: at
      };
    }

    if (typeof mandateId !== "string" || !mandates[mandateId]) {
      return result(false,
        "UNKNOWN_MANDATE — no treasury mandate with id " + String(mandateId) + ". Nothing was executed.",
        null);
    }
    var mandate = mandates[mandateId];

    if (!action || typeof action !== "object") {
      return result(false,
        "INVALID_ACTION — an action must be an object { kind, wallet, asset, network, protocol, strategy, amount, at }. Nothing was executed.",
        mandate);
    }

    // State gate: only ACTIVE mandates can allow anything.
    if (mandate.state === "REVOKED") {
      return result(false, "MANDATE_REVOKED — the mandate was revoked. Nothing was executed.", mandate);
    }
    if (mandate.state === "EXPIRED") {
      return result(false, "MANDATE_EXPIRED — the mandate has expired. Nothing was executed.", mandate);
    }
    if (mandate.state === "PAUSED") {
      return result(false, "MANDATE_PAUSED — the mandate is paused. Nothing was executed.", mandate);
    }
    if (mandate.state === "DRAFT") {
      return result(false, "MANDATE_NOT_ACTIVE — the mandate is still a DRAFT and has never been activated. Nothing was executed.", mandate);
    }

    // Expiration gate, evaluated against the action time (or now).
    var actionTime = action.at ? action.at : at;
    if (mandate.expiration) {
      var expMs = parseTime(mandate.expiration);
      var actMs = parseTime(actionTime);
      if (expMs !== null && actMs !== null && actMs >= expMs) {
        return result(false, "MANDATE_EXPIRED — the mandate expired at " + mandate.expiration + ". Nothing was executed.", mandate);
      }
    }

    // Start gate, symmetric with the expiration gate: an action
    // dated before the mandate's start is denied.
    if (mandate.start) {
      var startMs = parseTime(mandate.start);
      var actMs = parseTime(actionTime);
      if (startMs !== null && actMs !== null && actMs < startMs) {
        return result(false, "MANDATE_NOT_STARTED — the mandate starts at " + mandate.start + ". Nothing was executed.", mandate);
      }
    }

    // Security hold outranks the allowlists and limits.
    if (mandate.securityHold === true) {
      return result(false, "SECURITY_HOLD — the mandate is under a security hold. Nothing was executed.", mandate);
    }

    // Wallet-spec security pause, enforced exactly like securityHold.
    if (mandate.securityPause === true) {
      return result(false, "SECURITY_PAUSE — the mandate is under a security pause. Nothing was executed.", mandate);
    }

    // Allowlist gate (fail closed): a value present on the action
    // must be in the corresponding allowlist. An empty allowlist
    // permits nothing for that field.
    for (var i = 0; i < ALLOWLIST_CHECKS.length; i++) {
      var check = ALLOWLIST_CHECKS[i];
      var value = action[check.actionField];
      if (isNonEmptyString(value) &&
          mandate[check.listField].indexOf(value) === -1) {
        return result(false,
          check.reason + " — \"" + value + "\" is not in the mandate's " +
          check.listField + ". Nothing was executed.", mandate);
      }
    }

    // Wallet-spec approved-list gate (W9 / §99-17). A NON-EMPTY
    // approved* list restricts its dimension: an action naming a
    // value outside it is denied with reason NOT_IN_MANDATE. An
    // EMPTY approved* list means no restriction from this mandate
    // on that dimension — the list is simply not consulted. A field
    // absent from the action is not checked. (This differs
    // deliberately from the foundation allowed* lists above, where
    // an empty list permits nothing; both sets are checked.)
    for (var j = 0; j < APPROVED_CHECKS.length; j++) {
      var approved = APPROVED_CHECKS[j];
      var list = mandate[approved.listField];
      if (!list || list.length === 0) continue;
      var named = null;
      for (var k = 0; k < approved.actionFields.length; k++) {
        var candidate = action[approved.actionFields[k]];
        if (isNonEmptyString(candidate)) { named = candidate; break; }
      }
      if (named !== null && list.indexOf(named) === -1) {
        return result(false,
          "NOT_IN_MANDATE — \"" + named + "\" (" + approved.label +
          ") is not in the mandate's " + approved.listField +
          ". Nothing was executed.", mandate);
      }
    }

    // Amount gates. A null limit is UNKNOWN, never zero: it does not
    // deny. Only a set limit denies, and only when exceeded.
    if (typeof action.amount === "number" && isFinite(action.amount)) {
      if (action.amount < 0) {
        return result(false, "INVALID_AMOUNT — amount must be >= 0. Nothing was executed.", mandate);
      }
      if (mandate.maxAction !== null && mandate.maxAction !== undefined &&
          action.amount > mandate.maxAction) {
        return result(false,
          "AMOUNT_EXCEEDS_MAX_ACTION — amount " + action.amount +
          " is above the mandate's maxAction " + mandate.maxAction +
          ". Nothing was executed.", mandate);
      }
      if (mandate.maximumActionValue !== null &&
          mandate.maximumActionValue !== undefined &&
          action.amount > mandate.maximumActionValue) {
        return result(false,
          "AMOUNT_EXCEEDS_MAXIMUM_ACTION_VALUE — amount " + action.amount +
          " is above the mandate's maximumActionValue " +
          mandate.maximumActionValue + ". Nothing was executed.", mandate);
      }
      var remaining = remainingDailyMovement(mandate, actionTime);
      if (remaining !== null && action.amount > remaining) {
        return result(false,
          "AMOUNT_EXCEEDS_DAILY_MOVEMENT — amount " + action.amount +
          " is above the remaining daily movement " + remaining +
          " (maxDailyMovement " + mandate.maxDailyMovement +
          "). Nothing was executed.", mandate);
      }
      var remainingValue = remainingDailyValue(mandate, actionTime);
      if (remainingValue !== null && action.amount > remainingValue) {
        return result(false,
          "AMOUNT_EXCEEDS_MAXIMUM_DAILY_VALUE — amount " + action.amount +
          " is above the remaining daily value " + remainingValue +
          " (maximumDailyValue " + mandate.maximumDailyValue +
          "). Nothing was executed.", mandate);
      }
    }

    // ownerOverride is recorded provenance only: it does NOT bypass
    // any denial above. A passing check means "within the mandate
    // bound" — it never performs the action.
    return result(true,
      "ALLOWED_WITHIN_MANDATE — the action is within the mandate's allowlists and limits. This is an evaluation only; nothing was executed.",
      mandate);
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
    var byState = {};
    var i;
    for (i = 0; i < MANDATE_STATES.length; i++) byState[MANDATE_STATES[i]] = 0;
    var ids = Object.keys(mandates);
    var activeWithLimits = 0;
    for (i = 0; i < ids.length; i++) {
      var mandate = mandates[ids[i]];
      if (byState.hasOwnProperty(mandate.state)) byState[mandate.state] += 1;
      if (mandate.state === "ACTIVE" && canActivate(mandate).ok) activeWithLimits += 1;
    }
    return {
      totalMandates: ids.length,
      activeMandates: byState.ACTIVE,
      activeMandatesWithLimits: activeWithLimits,
      byState: byState,
      auditLogEntries: auditLog.length,
      auditLogMax: AUDIT_MAX,
      note: ids.length === 0
        ? "No treasury mandates exist — with no ACTIVE mandate, every treasury action is denied."
        : byState.ACTIVE + " of " + ids.length + " mandate(s) ACTIVE; checkAction() evaluates only — it never executes anything."
    };
  }

  // Clears mandates and the audit log. Intended for tests and for an
  // owner-directed reset; it never touches any other module.
  function reset() {
    mandates = {};
    auditLog = [];
    return true;
  }

  global.TreasuryMandates = {
    MANDATE_STATES: MANDATE_STATES.slice(),
    TRANSITIONS: (function () {
      var copy = {};
      var key;
      for (key in TRANSITIONS) {
        if (Object.prototype.hasOwnProperty.call(TRANSITIONS, key)) copy[key] = TRANSITIONS[key].slice();
      }
      return copy;
    })(),
    TERMINAL_STATES: TERMINAL_STATES.slice(),
    LIMIT_FIELDS: LIMIT_FIELDS.slice(),
    ACTIVATION_LIMIT_FIELDS: ACTIVATION_LIMIT_FIELDS.slice(),
    ALLOWLIST_FIELDS: ALLOWLIST_FIELDS.slice(),
    APPROVED_LIST_FIELDS: APPROVED_LIST_FIELDS.slice(),
    NEW_LIMIT_FIELDS: NEW_LIMIT_FIELDS.slice(),
    AUDIT_MAX: AUDIT_MAX,
    VERIFICATION_STATES: verificationStates(),
    validateMandate: validateMandate,
    createMandate: createMandate,
    getMandate: getMandate,
    listMandates: listMandates,
    canActivate: canActivate,
    activateMandate: activateMandate,
    pauseMandate: pauseMandate,
    resumeMandate: resumeMandate,
    revokeMandate: revokeMandate,
    expireMandate: expireMandate,
    checkExpirations: checkExpirations,
    checkAction: checkAction,
    recordMovement: recordMovement,
    remainingDailyMovement: function (mandateId, at) {
      if (typeof mandateId !== "string" || !mandates[mandateId]) return null;
      return remainingDailyMovement(mandates[mandateId], at);
    },
    summary: summary,
    getAuditLog: getAuditLog,
    clearAuditLog: clearAuditLog,
    reset: reset
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
