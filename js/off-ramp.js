/* MTI6-GTADWIY-COCKPIT — Off-ramp / cash-out interface contract (Wallet spec W10, step 16)
 *
 * RECORDS + VALIDATION ONLY. This module is an interface CONTRACT:
 *   - No live cash-out, no money movement, no transfer execution.
 *   - No network calls, no live prices, no conversion rates.
 *   - No secrets: secret-looking fields are rejected, never stored.
 *   - No fabricated amounts: fees/costs are sourced numbers or
 *     UNKNOWN — never 0, never invented.
 *
 * Cash App is modelled as TWO separate destinations, never one
 * universal crypto wallet:
 *   - BTC_DESTINATION       — receives BTC only.
 *   - FIAT_CASH_DESTINATION — receives fiat/cash only (USD in this
 *     contract version).
 * A destination's TYPE decides what it can receive; the label never
 * does. A non-BTC asset sent to a BTC destination, or any crypto
 * asset sent to a fiat destination, REQUIRES a conversion step
 * ({fromAsset, toAsset, provider, state: "REQUIRED"}). The conversion
 * is recorded as a required step only — never skipped, never assumed
 * to have happened, never recorded as completed by this module.
 *
 * Owner-only provenance:
 *   - Destinations are owner-approved records only. A bot origin
 *     (approvedBy naming STAR, a bot, worker, tribe, agent, or the
 *     system) is rejected with DESTINATION_REQUIRES_OWNER_APPROVAL.
 *     Bots NEVER create a destination.
 *   - Every off-ramp needs the owner's instruction
 *     ({instructionId, text, givenBy, givenAt}); a bot-given
 *     instruction is rejected. A bot never instructs a cash-out.
 *
 * States: an off-ramp record is PREPARED until a real confirmation
 * exists; confirmOffRamp() records an EXTERNAL confirmation
 * ({confirmedBy, confirmedAt, reference}) and moves the record to
 * CONFIRMED. There is no EXECUTED state in this module at all:
 * confirmation is a record of an external confirmation, and no
 * function here performs the underlying transfer. canExecuteCashOut()
 * is always false and requestCashOut() always refuses.
 *
 * Depends on nothing at load time. Truth, WalletIntelligence and
 * StarAccountant are consulted only through typeof/globalThis guards
 * with identical fallbacks when absent, so this file loads in a bare
 * vm context with no DOM and no network. Vanilla JS only, one global:
 * OffRamp. Load order when wiring: js/truth.js,
 * js/wallet-intelligence.js, js/star-accountant.js, then
 * js/off-ramp.js.
 *
 *   OffRamp.createDestination(input)              -> destination record
 *   OffRamp.validateDestination(record)           -> error strings []
 *   OffRamp.getDestination(id) / listDestinations()
 *   OffRamp.prepareOffRamp(input)                 -> record (PREPARED)
 *   OffRamp.validateOffRamp(record)               -> error strings []
 *   OffRamp.getOffRamp(id) / listOffRamps()
 *   OffRamp.confirmOffRamp(id, confirmation)      -> record (CONFIRMED)
 *   OffRamp.recordReconciliation(id, reconciliation)
 *   OffRamp.describeOffRamp(id)
 *   OffRamp.summary()
 *   OffRamp.canExecuteCashOut()                   -> always false
 *   OffRamp.requestCashOut(id)                    -> refused, never runs
 *   OffRamp.getAuditLog() / clearAuditLog() / reset()
 */
var OffRamp = (function () {
  "use strict";

  var globalScope = (typeof globalThis !== "undefined") ? globalThis : null;

  function truth() {
    return (globalScope && globalScope.Truth) || null;
  }

  // ---- Vocabulary ------------------------------------------------------

  // The only off-ramp states. There is deliberately no EXECUTED state:
  // this module records preparation and confirmation only, and no
  // record it produces may ever claim a transfer was executed.
  var OFF_RAMP_STATES = ["PREPARED", "CONFIRMED"];

  // Cash App, modelled as two separate destinations. No universal
  // crypto-wallet destination type exists in this contract version;
  // any further destination kind needs a spec extension, not a
  // silent addition here.
  var DESTINATION_TYPES = ["BTC_DESTINATION", "FIAT_CASH_DESTINATION"];

  // A conversion is recorded as REQUIRED and nothing else. This
  // module never observes a conversion happening, so it never records
  // one as completed, done, or executed.
  var CONVERSION_STATES = ["REQUIRED"];

  // The only fiat asset modelled in this contract version. A fiat
  // destination receives USD; any other asset sent to it needs a
  // conversion step to USD first.
  var FIAT_ASSETS = ["USD"];

  var AUDIT_MAX = 200;

  var REASONS = {
    CONVERSION_REQUIRED: "CONVERSION_REQUIRED",
    CONVERSION_NOT_NEEDED: "CONVERSION_NOT_NEEDED",
    DESTINATION_REQUIRES_OWNER_APPROVAL: "DESTINATION_REQUIRES_OWNER_APPROVAL",
    INSTRUCTION_REQUIRES_OWNER: "INSTRUCTION_REQUIRES_OWNER",
    UNKNOWN_DESTINATION: "UNKNOWN_DESTINATION"
  };

  var CASH_OUT_REFUSAL =
    "Off-ramp execution is not performed by this module. This is a " +
    "record-only contract: preparation and confirmation are recorded, " +
    "and the underlying transfer — if one ever happens — happens " +
    "outside this module, with its own owner authorization. Nothing " +
    "was sent, converted, or moved.";

  // Verification states: Truth's list when loaded, else the same
  // closed list (mirrors StarAccountant's fallback).
  var FALLBACK_VERIFICATION_STATES = ["NOT_CONNECTED", "UNKNOWN",
    "UNVERIFIED", "STALE", "DISABLED", "UNAVAILABLE", "VERIFIED", "LIVE"];

  function verificationStates() {
    var t = truth();
    if (t && t.TRUTH_STATES) return t.TRUTH_STATES;
    return FALLBACK_VERIFICATION_STATES;
  }

  // ---- Secret rejection (same patterns as WalletIntelligence) ----------

  var SECRET_KEY_PARTS = ["seed", "mnemonic", "privatekey", "private_key",
    "apikey", "api_key", "apisecret", "password", "secret"];

  var SECRET_VALUE_PATTERN = /(api[_-]?key|secret|password|passwd|private[_-]?key|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-live-[a-z0-9]+|ghp_[a-z0-9]+|github_pat_[a-z0-9_]+|xox[baprs]-[a-z0-9-]+|0x[0-9a-f]{64})/i;
  var STRONG_SECRET_VALUE_PATTERN = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|0x[0-9a-f]{64}|sk-live-[a-z0-9]+|ghp_[a-z0-9]+|github_pat_[a-z0-9_]+|xox[baprs]-[a-z0-9-]+)/i;

  function isSecretKey(key) {
    var k = String(key || "").toLowerCase().replace(/[-_]/g, "");
    for (var i = 0; i < SECRET_KEY_PARTS.length; i++) {
      var part = SECRET_KEY_PARTS[i].replace(/[-_]/g, "");
      if (k.indexOf(part) !== -1) return true;
    }
    return false;
  }

  function findSecret(value, path) {
    if (typeof value === "string") {
      var isLabel = /(^|\.)label$/.test(path || "");
      var pattern = isLabel ? STRONG_SECRET_VALUE_PATTERN : SECRET_VALUE_PATTERN;
      if (pattern.test(value)) return path || "(value)";
      return null;
    }
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i++) {
        var hit = findSecret(value[i], path + "[" + i + "]");
        if (hit) return hit;
      }
      return null;
    }
    if (value && typeof value === "object") {
      var keys = Object.keys(value);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        if (isSecretKey(key)) return (path ? path + "." : "") + key;
        var nested = findSecret(value[key], (path ? path + "." : "") + key);
        if (nested) return nested;
      }
    }
    return null;
  }

  // ---- Helpers -----------------------------------------------------------

  function nowIso() {
    return new Date().toISOString();
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function parseDate(value) {
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function newOffRampId() {
    return "offramp-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 8);
  }

  function newDestinationId() {
    return "dest-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 8);
  }

  // An actor string counts as a bot (or system) origin when it names
  // STAR, a bot, a worker, a tribe principal, an agent, or the system
  // itself — by exact name, by a "name:" prefix, or by the word
  // "bot" anywhere in it. There is no existing codebase convention
  // for bot-origin detection, so this closed list is defined here
  // and documented: owner provenance must name the owner, never a
  // bot, a worker, or the system. A plain personal name passes.
  function looksLikeBot(actor) {
    if (typeof actor !== "string") return true;
    var a = actor.trim().toLowerCase();
    if (!a) return true;
    if (a === "star" || a === "bot" || a === "system" ||
        a === "automated" || a === "agent") return true;
    if (/^(bot|star|worker|tribe|agent|system)\s*:/.test(a)) return true;
    if (/\bbot\b/.test(a)) return true;
    return false;
  }

  // ---- Destination acceptance -------------------------------------------
  // The TYPE decides what a destination can receive; the label never
  // does. A BTC destination receives BTC only; a fiat destination
  // receives USD only (the only fiat modelled here).

  function destinationAccepts(type, assetId) {
    if (type === "BTC_DESTINATION") return assetId === "BTC";
    if (type === "FIAT_CASH_DESTINATION") {
      return FIAT_ASSETS.indexOf(assetId) !== -1;
    }
    return false;
  }

  // The asset a conversion must target for this destination type:
  // BTC for a BTC destination, USD for a fiat destination.
  function conversionTargetFor(type) {
    if (type === "BTC_DESTINATION") return "BTC";
    if (type === "FIAT_CASH_DESTINATION") return "USD";
    return null;
  }

  // ---- Figures: sourced numbers or UNKNOWN ------------------------------
  // A fee/cost figure is KNOWN only as a sourced number: a finite
  // number greater than zero, with a currency and a source. Zero is
  // never a fee — a zero fee is UNKNOWN, not 0 — and an unsourced
  // number is rejected outright, never silently kept or invented.
  // Missing, null, or the string "UNKNOWN" all mean UNKNOWN
  // ({value: null, currency: null, state: "UNKNOWN", source: null}).

  function unknownFigure() {
    return { value: null, currency: null, state: "UNKNOWN", source: null };
  }

  function normalizeFigure(input, fieldName) {
    if (input === undefined || input === null) return unknownFigure();
    if (typeof input === "string" && input.trim() === "UNKNOWN") {
      return unknownFigure();
    }
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("Invalid off-ramp " + fieldName + ": a fee/cost must " +
        "be a sourced figure {value, currency, source} or omitted " +
        "(UNKNOWN) — never a bare number, never 0, never invented.");
    }
    var reasons = [];
    if (typeof input.value !== "number" || !isFinite(input.value)) {
      reasons.push(fieldName + ".value must be a finite number.");
    } else if (input.value <= 0) {
      reasons.push(fieldName + ".value must be greater than 0 — a fee/cost " +
        "is a sourced number or UNKNOWN, never 0.");
    }
    if (!isNonEmptyString(input.currency)) {
      reasons.push(fieldName + ".currency is required (what the figure is in).");
    }
    if (!isNonEmptyString(input.source)) {
      reasons.push(fieldName + ".source is required — a fee/cost number " +
        "without a source is not recorded as KNOWN.");
    }
    if (reasons.length) {
      throw new Error("Invalid off-ramp " + fieldName + ": " + reasons.join(" "));
    }
    return {
      value: input.value,
      currency: String(input.currency).trim(),
      state: "KNOWN",
      source: String(input.source).trim()
    };
  }

  function validateFigure(figure, fieldName, errors) {
    if (!figure || typeof figure !== "object" || Array.isArray(figure)) {
      errors.push(fieldName + " must be a figure {value, currency, state, source}.");
      return;
    }
    if (figure.state === "KNOWN") {
      if (typeof figure.value !== "number" || !isFinite(figure.value) ||
          figure.value <= 0) {
        errors.push(fieldName + " is KNOWN but its value is not a finite number greater than 0.");
      }
      if (!isNonEmptyString(figure.currency)) {
        errors.push(fieldName + " is KNOWN but has no currency.");
      }
      if (!isNonEmptyString(figure.source)) {
        errors.push(fieldName + " is KNOWN but has no source.");
      }
    } else if (figure.state === "UNKNOWN") {
      if (figure.value !== null && figure.value !== undefined) {
        errors.push(fieldName + " is UNKNOWN but carries a value — an UNKNOWN figure never carries a number.");
      }
    } else {
      errors.push(fieldName + ".state must be KNOWN or UNKNOWN.");
    }
  }

  // ---- Owner instruction -------------------------------------------------
  // Required on every off-ramp. The owner's instruction, never a
  // bot's: givenBy must name the owner, and a bot-like givenBy is
  // rejected with INSTRUCTION_REQUIRES_OWNER.

  function normalizeOwnerInstruction(input) {
    var data = (input && typeof input === "object") ? input : {};
    var reasons = [];
    if (!isNonEmptyString(data.instructionId)) {
      reasons.push("ownerInstruction.instructionId is required.");
    }
    if (!isNonEmptyString(data.text)) {
      reasons.push("ownerInstruction.text is required (what the owner instructed).");
    }
    if (!isNonEmptyString(data.givenBy)) {
      reasons.push("ownerInstruction.givenBy is required (who gave the instruction).");
    } else if (looksLikeBot(data.givenBy)) {
      throw new Error(REASONS.INSTRUCTION_REQUIRES_OWNER + ": the off-ramp " +
        "instruction must come from the owner, never from a bot, worker, " +
        "or the system (givenBy: " + String(data.givenBy).trim() + ").");
    }
    if (!parseDate(data.givenAt)) {
      reasons.push("ownerInstruction.givenAt must be a valid timestamp.");
    }
    if (reasons.length) {
      throw new Error("Invalid ownerInstruction: " + reasons.join(" "));
    }
    return {
      instructionId: String(data.instructionId).trim(),
      text: String(data.text).trim(),
      givenBy: String(data.givenBy).trim(),
      givenAt: new Date(data.givenAt).toISOString()
    };
  }

  // ---- Conversion step ---------------------------------------------------
  // Decided by the destination type and the asset, never by the
  // caller's say-so. When no conversion is needed the record carries
  // null; when one is needed the caller must supply it, and it must
  // target exactly the asset the destination accepts, with state
  // REQUIRED. A conversion is never recorded as completed here.

  function normalizeConversion(input, assetId, destinationType) {
    var needed = !destinationAccepts(destinationType, assetId);
    if (!needed) {
      if (input !== undefined && input !== null) {
        throw new Error(REASONS.CONVERSION_NOT_NEEDED + ": no conversion " +
          "is needed to send " + assetId + " to a " + destinationType +
          " — a conversion step must not be recorded where none is needed.");
      }
      return null;
    }
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error(REASONS.CONVERSION_REQUIRED + ": sending " + assetId +
        " to a " + destinationType + " requires a conversion step " +
        "({fromAsset, toAsset: \"" + conversionTargetFor(destinationType) +
        "\", provider, state: \"REQUIRED\"}) — the conversion is recorded " +
        "as a required step, never skipped, never assumed to have happened.");
    }
    var target = conversionTargetFor(destinationType);
    var reasons = [];
    if (String(input.fromAsset || "").trim().toUpperCase() !== assetId) {
      reasons.push("conversion.fromAsset must be the off-ramp asset (" + assetId + ").");
    }
    if (String(input.toAsset || "").trim().toUpperCase() !== target) {
      reasons.push("conversion.toAsset must be \"" + target + "\" for a " +
        destinationType + " — it receives " + target + " only.");
    }
    if (!isNonEmptyString(input.provider)) {
      reasons.push("conversion.provider is required (who would perform the conversion).");
    }
    if (input.state !== "REQUIRED") {
      reasons.push("conversion.state must be \"REQUIRED\" — a conversion is " +
        "recorded as a required step only, never as completed.");
    }
    if (reasons.length) {
      throw new Error(REASONS.CONVERSION_REQUIRED + ": " + reasons.join(" "));
    }
    return {
      fromAsset: assetId,
      toAsset: target,
      provider: String(input.provider).trim(),
      state: "REQUIRED"
    };
  }

  // ---- In-memory stores (start EMPTY) ------------------------------------

  var destinations = [];
  var offRamps = [];
  var auditLog = [];

  function appendAudit(entry) {
    auditLog.push(entry);
    if (auditLog.length > AUDIT_MAX) {
      auditLog.splice(0, auditLog.length - AUDIT_MAX);
    }
  }

  function audit(action, offRampId, destinationId, note) {
    appendAudit({
      at: nowIso(),
      action: action,
      offRampId: offRampId || null,
      destinationId: destinationId || null,
      note: typeof note === "string" ? note : ""
    });
  }

  function cloneDestination(record) {
    return {
      destinationId: record.destinationId,
      type: record.type,
      label: record.label,
      approvedBy: record.approvedBy,
      approvedAt: record.approvedAt
    };
  }

  function cloneFigure(figure) {
    if (!figure || typeof figure !== "object") return unknownFigure();
    return {
      value: figure.value === undefined ? null : figure.value,
      currency: figure.currency === undefined ? null : figure.currency,
      state: figure.state || "UNKNOWN",
      source: figure.source === undefined ? null : figure.source
    };
  }

  function cloneOffRamp(record) {
    return {
      offRampId: record.offRampId,
      assetId: record.assetId,
      conversion: record.conversion ? {
        fromAsset: record.conversion.fromAsset,
        toAsset: record.conversion.toAsset,
        provider: record.conversion.provider,
        state: record.conversion.state
      } : null,
      offRampProvider: record.offRampProvider,
      fees: cloneFigure(record.fees),
      costs: cloneFigure(record.costs),
      ownerInstruction: {
        instructionId: record.ownerInstruction.instructionId,
        text: record.ownerInstruction.text,
        givenBy: record.ownerInstruction.givenBy,
        givenAt: record.ownerInstruction.givenAt
      },
      approvedDestination: cloneDestination(record.approvedDestination),
      confirmation: record.confirmation ? {
        confirmedBy: record.confirmation.confirmedBy,
        confirmedAt: record.confirmation.confirmedAt,
        reference: record.confirmation.reference,
        recordedAt: record.confirmation.recordedAt
      } : null,
      reconciliation: record.reconciliation ? {
        reconciledBy: record.reconciliation.reconciledBy,
        reconciledAt: record.reconciliation.reconciledAt,
        reference: record.reconciliation.reference,
        recordedAt: record.reconciliation.recordedAt
      } : null,
      accountingRef: record.accountingRef,
      state: record.state,
      preparedAt: record.preparedAt
    };
  }

  // ---- Destinations ------------------------------------------------------
  // Owner-approved records only. Bots NEVER create a destination:
  // a missing approvedBy/approvedAt, or a bot-like approvedBy, is
  // rejected with DESTINATION_REQUIRES_OWNER_APPROVAL.

  function validateDestination(record) {
    var errors = [];
    if (!record || typeof record !== "object") {
      return ["Destination record must be an object."];
    }
    if (!isNonEmptyString(record.destinationId)) {
      errors.push("destinationId is required and must be a non-empty string.");
    }
    if (DESTINATION_TYPES.indexOf(record.type) === -1) {
      errors.push("type must be one of: " + DESTINATION_TYPES.join(", ") + ".");
    }
    if (!isNonEmptyString(record.label)) {
      errors.push("label is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(record.approvedBy)) {
      errors.push("approvedBy is required — a destination is owner-approved only.");
    } else if (looksLikeBot(record.approvedBy)) {
      errors.push("approvedBy names a bot, worker, or the system — a destination " +
        "is owner-approved only (" + REASONS.DESTINATION_REQUIRES_OWNER_APPROVAL + ").");
    }
    if (!parseDate(record.approvedAt)) {
      errors.push("approvedAt must be a valid timestamp.");
    }
    var secretField = findSecret(record, "");
    if (secretField) {
      errors.push("Field " + secretField +
        " looks like a secret or credential and must not be stored in a destination record.");
    }
    return errors;
  }

  function createDestination(input) {
    var data = (input && typeof input === "object") ? input : {};
    if (!isNonEmptyString(data.approvedBy) || !parseDate(data.approvedAt)) {
      throw new Error(REASONS.DESTINATION_REQUIRES_OWNER_APPROVAL + ": a " +
        "destination is owner-approved only — approvedBy and approvedAt " +
        "are both required, and a bot origin is never accepted.");
    }
    if (looksLikeBot(data.approvedBy)) {
      throw new Error(REASONS.DESTINATION_REQUIRES_OWNER_APPROVAL + ": a " +
        "destination is owner-approved only — bots never create a " +
        "destination (approvedBy: " + String(data.approvedBy).trim() + ").");
    }
    var reasons = [];
    if (DESTINATION_TYPES.indexOf(data.type) === -1) {
      reasons.push("type must be one of: " + DESTINATION_TYPES.join(", ") + ".");
    }
    if (!isNonEmptyString(data.label)) {
      reasons.push("label is required and must be a non-empty string.");
    }
    if (data.destinationId !== undefined && !isNonEmptyString(data.destinationId)) {
      reasons.push("destinationId must be a non-empty string.");
    }
    if (reasons.length) {
      throw new Error("Invalid destination: " + reasons.join(" "));
    }
    var record = {
      destinationId: data.destinationId ? data.destinationId.trim() : newDestinationId(),
      type: data.type,
      label: data.label.trim(),
      approvedBy: String(data.approvedBy).trim(),
      approvedAt: new Date(data.approvedAt).toISOString()
    };
    var errors = validateDestination(record);
    if (errors.length) {
      throw new Error("Invalid destination: " + errors.join(" "));
    }
    for (var i = 0; i < destinations.length; i++) {
      if (destinations[i].destinationId === record.destinationId) {
        throw new Error("A destination with id " + record.destinationId +
          " already exists.");
      }
    }
    destinations.push(record);
    audit("destination-created", null, record.destinationId,
      record.type + " \"" + record.label + "\" approved by " +
      record.approvedBy + ".");
    return cloneDestination(record);
  }

  function getDestination(id) {
    if (typeof id !== "string") return null;
    for (var i = 0; i < destinations.length; i++) {
      if (destinations[i].destinationId === id) {
        return cloneDestination(destinations[i]);
      }
    }
    return null;
  }

  function listDestinations() {
    return destinations.map(cloneDestination);
  }

  // ---- Off-ramp records --------------------------------------------------

  function resolveDestination(input) {
    var id = null;
    if (typeof input === "string") {
      id = input;
    } else if (input && typeof input === "object" &&
        typeof input.destinationId === "string") {
      id = input.destinationId;
    }
    if (!isNonEmptyString(id)) {
      throw new Error("Invalid off-ramp: approvedDestination is required and " +
        "must reference an existing destination record (a destinationId).");
    }
    var found = null;
    for (var i = 0; i < destinations.length; i++) {
      if (destinations[i].destinationId === id.trim()) {
        found = destinations[i];
        break;
      }
    }
    if (!found) {
      throw new Error(REASONS.UNKNOWN_DESTINATION + ": no destination " +
        "record exists with id " + id.trim() + " — an off-ramp may only " +
        "name an existing owner-approved destination.");
    }
    // Snapshot the STORED destination, never caller-supplied fields:
    // approval cannot be forged by passing a doctored object.
    return cloneDestination(found);
  }

  function validateOffRamp(record) {
    var errors = [];
    if (!record || typeof record !== "object") {
      return ["Off-ramp record must be an object."];
    }
    if (!isNonEmptyString(record.offRampId)) {
      errors.push("offRampId is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(record.assetId)) {
      errors.push("assetId is required and must be a non-empty string.");
    }
    if (OFF_RAMP_STATES.indexOf(record.state) === -1) {
      errors.push("state must be one of: " + OFF_RAMP_STATES.join(", ") +
        " — there is no EXECUTED state; no record may claim a transfer was executed.");
    }
    if (!isNonEmptyString(record.offRampProvider)) {
      errors.push("offRampProvider is required and must be a non-empty string.");
    }
    validateFigure(record.fees, "fees", errors);
    validateFigure(record.costs, "costs", errors);
    if (!record.ownerInstruction || typeof record.ownerInstruction !== "object") {
      errors.push("ownerInstruction is required.");
    } else {
      var instr = record.ownerInstruction;
      if (!isNonEmptyString(instr.instructionId)) {
        errors.push("ownerInstruction.instructionId is required.");
      }
      if (!isNonEmptyString(instr.text)) {
        errors.push("ownerInstruction.text is required.");
      }
      if (!isNonEmptyString(instr.givenBy)) {
        errors.push("ownerInstruction.givenBy is required.");
      } else if (looksLikeBot(instr.givenBy)) {
        errors.push("ownerInstruction.givenBy names a bot — the instruction " +
          "must come from the owner.");
      }
      if (!parseDate(instr.givenAt)) {
        errors.push("ownerInstruction.givenAt must be a valid timestamp.");
      }
    }
    if (!record.approvedDestination || typeof record.approvedDestination !== "object") {
      errors.push("approvedDestination is required and must be an existing destination record.");
    } else {
      var destErrors = validateDestination(record.approvedDestination);
      destErrors.forEach(function (e) {
        errors.push("approvedDestination: " + e);
      });
      // Conversion consistency: the recorded conversion must be
      // exactly what this asset + destination type require — null
      // when none is needed, a REQUIRED step to the accepted asset
      // when one is needed.
      var asset = String(record.assetId || "").trim().toUpperCase();
      var destType = record.approvedDestination.type;
      if (DESTINATION_TYPES.indexOf(destType) !== -1) {
        var needsConversion = !destinationAccepts(destType, asset);
        if (!needsConversion && record.conversion !== null &&
            record.conversion !== undefined) {
          errors.push("conversion must be null: no conversion is needed to send " +
            asset + " to a " + destType + ".");
        }
        if (needsConversion) {
          var conv = record.conversion;
          if (!conv || typeof conv !== "object") {
            errors.push(REASONS.CONVERSION_REQUIRED + ": sending " + asset +
              " to a " + destType + " requires a conversion step.");
          } else {
            if (String(conv.fromAsset || "").trim().toUpperCase() !== asset) {
              errors.push("conversion.fromAsset must be the off-ramp asset (" + asset + ").");
            }
            if (String(conv.toAsset || "").trim().toUpperCase() !== conversionTargetFor(destType)) {
              errors.push("conversion.toAsset must be \"" +
                conversionTargetFor(destType) + "\" for a " + destType + ".");
            }
            if (conv.state !== "REQUIRED") {
              errors.push("conversion.state must be \"REQUIRED\" — never completed.");
            }
            if (!isNonEmptyString(conv.provider)) {
              errors.push("conversion.provider is required.");
            }
          }
        }
      }
    }
    if (record.confirmation !== null && record.confirmation !== undefined) {
      var conf = record.confirmation;
      if (!conf || typeof conf !== "object") {
        errors.push("confirmation must be null or a confirmation record.");
      } else {
        if (!isNonEmptyString(conf.confirmedBy)) {
          errors.push("confirmation.confirmedBy is required.");
        }
        if (!parseDate(conf.confirmedAt)) {
          errors.push("confirmation.confirmedAt must be a valid timestamp.");
        }
        if (!isNonEmptyString(conf.reference)) {
          errors.push("confirmation.reference is required — nothing is confirmed without a reference.");
        }
      }
      if (record.state === "PREPARED" && record.confirmation) {
        errors.push("a PREPARED record must not carry a confirmation — confirmation moves the record to CONFIRMED.");
      }
    }
    if (record.state === "CONFIRMED" &&
        (!record.confirmation || typeof record.confirmation !== "object")) {
      errors.push("a CONFIRMED record must carry its confirmation.");
    }
    if (record.reconciliation !== null && record.reconciliation !== undefined) {
      var rec = record.reconciliation;
      if (!rec || typeof rec !== "object") {
        errors.push("reconciliation must be null or a reconciliation record.");
      } else {
        if (!isNonEmptyString(rec.reconciledBy)) {
          errors.push("reconciliation.reconciledBy is required.");
        }
        if (!parseDate(rec.reconciledAt)) {
          errors.push("reconciliation.reconciledAt must be a valid timestamp.");
        }
        if (!isNonEmptyString(rec.reference)) {
          errors.push("reconciliation.reference is required.");
        }
      }
    }
    if (record.accountingRef !== null && record.accountingRef !== undefined &&
        !isNonEmptyString(record.accountingRef)) {
      errors.push("accountingRef must be null or a non-empty string reference.");
    }
    var secretField = findSecret(record, "");
    if (secretField) {
      errors.push("Field " + secretField +
        " looks like a secret or credential and must not be stored in an off-ramp record.");
    }
    return errors;
  }

  // Builds an off-ramp record. Always starts PREPARED, with
  // confirmation and reconciliation null. Never EXECUTED — there is
  // no path in this module from PREPARED to anything but CONFIRMED,
  // and CONFIRMED records a confirmation, not a transfer.
  function prepareOffRamp(input) {
    var data = (input && typeof input === "object") ? input : {};
    var reasons = [];
    if (!isNonEmptyString(data.assetId)) {
      reasons.push("assetId is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(data.offRampProvider)) {
      reasons.push("offRampProvider is required and must be a non-empty string.");
    }
    if (data.offRampId !== undefined && !isNonEmptyString(data.offRampId)) {
      reasons.push("offRampId must be a non-empty string.");
    }
    if (data.accountingRef !== undefined && data.accountingRef !== null &&
        !isNonEmptyString(data.accountingRef)) {
      reasons.push("accountingRef must be null or a non-empty string reference.");
    }
    if (reasons.length) {
      throw new Error("Invalid off-ramp: " + reasons.join(" "));
    }
    var assetId = String(data.assetId).trim().toUpperCase();
    var destination = resolveDestination(data.approvedDestination);
    var conversion = normalizeConversion(data.conversion, assetId, destination.type);
    var ownerInstruction = normalizeOwnerInstruction(data.ownerInstruction);
    var fees = normalizeFigure(data.fees, "fees");
    var costs = normalizeFigure(data.costs, "costs");
    var record = {
      offRampId: data.offRampId ? data.offRampId.trim() : newOffRampId(),
      assetId: assetId,
      conversion: conversion,
      offRampProvider: String(data.offRampProvider).trim(),
      fees: fees,
      costs: costs,
      ownerInstruction: ownerInstruction,
      approvedDestination: destination,
      confirmation: null,
      reconciliation: null,
      accountingRef: (data.accountingRef === undefined || data.accountingRef === null) ?
        null : String(data.accountingRef).trim(),
      state: "PREPARED",
      preparedAt: nowIso()
    };
    var errors = validateOffRamp(record);
    if (errors.length) {
      throw new Error("Invalid off-ramp: " + errors.join(" "));
    }
    for (var i = 0; i < offRamps.length; i++) {
      if (offRamps[i].offRampId === record.offRampId) {
        throw new Error("An off-ramp with id " + record.offRampId + " already exists.");
      }
    }
    offRamps.push(record);
    audit("off-ramp-prepared", record.offRampId, destination.destinationId,
      assetId + " -> " + destination.type + " (" + destination.label + ")" +
      (conversion ? " via required conversion " + conversion.fromAsset +
        " -> " + conversion.toAsset + " (" + conversion.provider + ")" :
        " (no conversion needed)") + ". State PREPARED; nothing was sent.");
    return cloneOffRamp(record);
  }

  function getOffRamp(id) {
    if (typeof id !== "string") return null;
    for (var i = 0; i < offRamps.length; i++) {
      if (offRamps[i].offRampId === id) return cloneOffRamp(offRamps[i]);
    }
    return null;
  }

  function listOffRamps() {
    return offRamps.map(cloneOffRamp);
  }

  // Records an EXTERNAL confirmation and moves the record PREPARED
  // -> CONFIRMED. The confirmation must name who confirmed it, when,
  // and its reference; without a reference nothing is confirmed.
  // This records a confirmation — it never performs the transfer.
  function confirmOffRamp(id, confirmation) {
    if (typeof id !== "string") {
      throw new Error("confirmOffRamp requires an off-ramp id.");
    }
    var record = null;
    var index = -1;
    for (var i = 0; i < offRamps.length; i++) {
      if (offRamps[i].offRampId === id) { record = offRamps[i]; index = i; break; }
    }
    if (!record) {
      throw new Error("No off-ramp with id " + id + ".");
    }
    if (record.state !== "PREPARED") {
      throw new Error("Cannot confirm off-ramp " + id + ": it is already " +
        record.state + " — a record is confirmed once, from PREPARED.");
    }
    var conf = (confirmation && typeof confirmation === "object") ? confirmation : {};
    var reasons = [];
    if (!isNonEmptyString(conf.confirmedBy)) {
      reasons.push("confirmation.confirmedBy is required (who confirmed it).");
    }
    if (!parseDate(conf.confirmedAt)) {
      reasons.push("confirmation.confirmedAt must be a valid timestamp.");
    }
    if (!isNonEmptyString(conf.reference)) {
      reasons.push("confirmation.reference is required — nothing is confirmed without a reference.");
    }
    if (reasons.length) {
      throw new Error("Invalid confirmation: " + reasons.join(" "));
    }
    var updated = cloneOffRamp(record);
    updated.confirmation = {
      confirmedBy: String(conf.confirmedBy).trim(),
      confirmedAt: new Date(conf.confirmedAt).toISOString(),
      reference: String(conf.reference).trim(),
      recordedAt: nowIso()
    };
    updated.state = "CONFIRMED";
    var errors = validateOffRamp(updated);
    if (errors.length) {
      throw new Error("Invalid off-ramp: " + errors.join(" "));
    }
    offRamps[index] = updated;
    audit("off-ramp-confirmed", id, updated.approvedDestination.destinationId,
      "External confirmation recorded (ref " + updated.confirmation.reference +
      "). State CONFIRMED — this records a confirmation; it did not move money.");
    return cloneOffRamp(updated);
  }

  // Records a reconciliation against an already-CONFIRMED off-ramp.
  // Reconciliation is a record only, like confirmation: it checks
  // the books against an external reference, it moves nothing.
  function recordReconciliation(id, reconciliation) {
    if (typeof id !== "string") {
      throw new Error("recordReconciliation requires an off-ramp id.");
    }
    var record = null;
    var index = -1;
    for (var i = 0; i < offRamps.length; i++) {
      if (offRamps[i].offRampId === id) { record = offRamps[i]; index = i; break; }
    }
    if (!record) {
      throw new Error("No off-ramp with id " + id + ".");
    }
    if (record.state !== "CONFIRMED") {
      throw new Error("Cannot reconcile off-ramp " + id + ": it is " +
        record.state + " — only a CONFIRMED off-ramp can be reconciled.");
    }
    var rec = (reconciliation && typeof reconciliation === "object") ? reconciliation : {};
    var reasons = [];
    if (!isNonEmptyString(rec.reconciledBy)) {
      reasons.push("reconciliation.reconciledBy is required.");
    }
    if (!parseDate(rec.reconciledAt)) {
      reasons.push("reconciliation.reconciledAt must be a valid timestamp.");
    }
    if (!isNonEmptyString(rec.reference)) {
      reasons.push("reconciliation.reference is required.");
    }
    if (reasons.length) {
      throw new Error("Invalid reconciliation: " + reasons.join(" "));
    }
    var updated = cloneOffRamp(record);
    updated.reconciliation = {
      reconciledBy: String(rec.reconciledBy).trim(),
      reconciledAt: new Date(rec.reconciledAt).toISOString(),
      reference: String(rec.reference).trim(),
      recordedAt: nowIso()
    };
    var errors = validateOffRamp(updated);
    if (errors.length) {
      throw new Error("Invalid off-ramp: " + errors.join(" "));
    }
    offRamps[index] = updated;
    audit("off-ramp-reconciled", id, updated.approvedDestination.destinationId,
      "Reconciliation recorded (ref " + updated.reconciliation.reference + ").");
    return cloneOffRamp(updated);
  }

  // ---- Truthful views ----------------------------------------------------

  function describeOffRamp(id) {
    var record = getOffRamp(id);
    if (!record) return null;
    var figureText = function (figure) {
      if (figure.state === "KNOWN") {
        return figure.value + " " + figure.currency + " (sourced: " + figure.source + ")";
      }
      return "UNKNOWN — no sourced figure recorded";
    };
    return {
      offRampId: record.offRampId,
      assetId: record.assetId,
      conversion: record.conversion,
      conversionNote: record.conversion ?
        "Conversion required: " + record.conversion.fromAsset + " -> " +
        record.conversion.toAsset + " via " + record.conversion.provider +
        " (state REQUIRED — recorded as a required step, not as done)." :
        "No conversion needed for this asset and destination.",
      offRampProvider: record.offRampProvider,
      fees: figureText(record.fees),
      costs: figureText(record.costs),
      ownerInstruction: record.ownerInstruction,
      approvedDestination: record.approvedDestination,
      confirmation: record.confirmation,
      reconciliation: record.reconciliation,
      accountingRef: record.accountingRef,
      state: record.state,
      stateDescription: record.state === "PREPARED" ?
        "Prepared — recorded only. Nothing confirmed, nothing sent." :
        "Confirmed — an external confirmation was recorded. This records a confirmation; it did not move money.",
      executionAvailable: false,
      note: "Execution is unavailable in this module. A CONFIRMED record " +
        "is a record of an external confirmation, never a transfer."
    };
  }

  function summary() {
    var byState = {};
    OFF_RAMP_STATES.forEach(function (s) { byState[s] = 0; });
    var needingConversion = 0;
    offRamps.forEach(function (r) {
      if (byState.hasOwnProperty(r.state)) byState[r.state] += 1;
      if (r.conversion) needingConversion += 1;
    });
    return {
      total: offRamps.length,
      byState: byState,
      needingConversion: needingConversion,
      destinations: destinations.length,
      executionAvailable: false,
      note: offRamps.length === 0 ?
        "No off-ramps prepared — nothing was sent, converted, or moved." :
        "Execution is unavailable in this module — records only; no transfer can run from any off-ramp state."
    };
  }

  // ---- Execution: always unavailable -------------------------------------

  function canExecuteCashOut() {
    return false;
  }

  // Never executes. Returns a refusal, whatever arguments it is
  // given, and changes no state.
  function requestCashOut(id) {
    void id;
    return {
      executed: false,
      resultState: "NOT_AUTHORIZED",
      reason: CASH_OUT_REFUSAL
    };
  }

  // ---- Audit log ---------------------------------------------------------

  function getAuditLog() {
    return auditLog.slice();
  }

  function clearAuditLog() {
    auditLog = [];
    return true;
  }

  // Test / maintenance helper: forgets every destination and off-ramp
  // and clears the audit log. Both lists start empty again.
  function reset() {
    destinations = [];
    offRamps = [];
    auditLog = [];
    return true;
  }

  return {
    OFF_RAMP_STATES: OFF_RAMP_STATES.slice(),
    DESTINATION_TYPES: DESTINATION_TYPES.slice(),
    CONVERSION_STATES: CONVERSION_STATES.slice(),
    FIAT_ASSETS: FIAT_ASSETS.slice(),
    REASONS: REASONS,
    CASH_OUT_REFUSAL: CASH_OUT_REFUSAL,
    AUDIT_MAX: AUDIT_MAX,
    newOffRampId: newOffRampId,
    newDestinationId: newDestinationId,
    looksLikeBot: looksLikeBot,
    destinationAccepts: destinationAccepts,
    conversionTargetFor: conversionTargetFor,
    createDestination: createDestination,
    validateDestination: validateDestination,
    getDestination: getDestination,
    listDestinations: listDestinations,
    prepareOffRamp: prepareOffRamp,
    validateOffRamp: validateOffRamp,
    getOffRamp: getOffRamp,
    listOffRamps: listOffRamps,
    confirmOffRamp: confirmOffRamp,
    recordReconciliation: recordReconciliation,
    describeOffRamp: describeOffRamp,
    summary: summary,
    canExecuteCashOut: canExecuteCashOut,
    requestCashOut: requestCashOut,
    getAuditLog: getAuditLog,
    clearAuditLog: clearAuditLog,
    reset: reset
  };
})();
