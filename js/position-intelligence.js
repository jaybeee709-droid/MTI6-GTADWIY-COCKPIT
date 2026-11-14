/* MTI6-GTADWIY-COCKPIT — Position Intelligence foundation (continuous campaign)
 *
 * Position Intelligence (Crypto spec C1, §99-7): the DATA foundation
 * for the existing Positions & Assets screen (js/modules/positions.js).
 * It does NOT render anything and does NOT replace that screen: the
 * screen stays the UI, this module stays the registry the screen reads
 * from. Link into the screen, never create a competing position screen.
 *
 * A position is a RELATIONSHIP, not a duplicate of an asset: it ties
 * a wallet / account / network / asset(s) / protocol / activity /
 * strategy together and records what is known about that deployed
 * position — size, cost basis, current value, P/L, fees — as sourced
 * values or UNKNOWN. Nothing is ever invented, and nothing defaults
 * to zero: a missing money field is UNKNOWN (null), never 0.
 *
 * Fail-closed throughout:
 *   - References (walletId, accountId, networkId, assetIds,
 *     protocolId, activityId) must be non-empty strings (assetIds a
 *     non-empty array of non-empty strings). This module does NOT
 *     verify that the referenced records exist in other registries:
 *     it records the reference and marks verificationStatus
 *     UNVERIFIED until a caller verifies it (markPositionVerified).
 *   - type is a closed set of 13 values. Anything else is rejected.
 *   - Money fields (size, costBasis, currentValue, pnl, fees) are
 *     either absent (UNKNOWN) or a sourced record { value, currency,
 *     source, checkedAt }. A sourced record needs a finite numeric
 *     value, a currency, a source, and a valid timestamp.
 *   - P/L honesty: pnl is UNKNOWN unless BOTH costBasis and
 *     currentValue are sourced in the SAME currency. A computed P/L
 *     carries source "computed-from-sourced-inputs" and is the exact
 *     difference of the two sourced values — never a fabricated gain.
 *     A caller-supplied pnl is accepted only when it matches the
 *     computed value exactly, and is rejected outright when the
 *     inputs do not support a P/L at all.
 *   - An LP position is a position, never a normal token balance:
 *     isTokenBalance is false for every position type except a plain
 *     "holding". It is derived by the module, never caller-supplied.
 *   - Risk stays dimensions, never scores: a risk record may list
 *     risk dimensions and a note, but a numeric score is rejected.
 *   - verificationStatus comes from the shared Truth / CryptoWorld
 *     vocabulary (js/truth.js, loaded before this file). A VERIFIED
 *     claim needs a source AND a timestamp, or it is rejected.
 *     Nothing is upgraded to VERIFIED here except through
 *     markPositionVerified with explicit provenance.
 *   - Secret-looking fields are rejected anywhere in the record,
 *     following the secret-rejection pattern of
 *     js/wallet-intelligence.js.
 *   - INFORMATIONAL never implies TRANSACTIONAL. Recording a
 *     position is not authorization or capability to move it, close
 *     it, or realise its P/L. There is no execution here.
 *
 * Position -> opportunity links are references only: linking a
 * position to an opportunity never promises a return. A position may
 * link to multiple opportunities.
 *
 * Depends on js/truth.js only (for the shared truth vocabulary),
 * consulted through a typeof guard with an identical fallback, so
 * this file loads in a bare vm context with no DOM and no network.
 * Load order when wiring: js/truth.js, js/asset-intelligence.js,
 * js/network-intelligence.js, js/wallet-intelligence.js, then
 * js/position-intelligence.js.
 *
 *   PositionIntelligence.registerPosition(record)  -> stored record
 *   PositionIntelligence.validatePosition(record)  -> error strings []
 *   PositionIntelligence.getPosition(id) / listPositions(filters)
 *   PositionIntelligence.positionsByWallet(walletId)
 *   PositionIntelligence.positionsByAsset(assetId)
 *   PositionIntelligence.positionsByOpportunity(opportunityId)
 *   PositionIntelligence.linkOpportunity(positionId, opportunityId)
 *   PositionIntelligence.unlinkOpportunity(positionId, opportunityId)
 *   PositionIntelligence.linksFor(positionId)
 *   PositionIntelligence.computePnl(position)
 *   PositionIntelligence.setStatus(id, status)
 *   PositionIntelligence.markPositionVerified(id, provenance)
 *   PositionIntelligence.removePosition(id)
 *   PositionIntelligence.classifyFreshness(position, maxAgeDays)
 *   PositionIntelligence.describePosition(id)
 *   PositionIntelligence.summary()
 *   PositionIntelligence.reset()
 */
var PositionIntelligence = (function (global) {
  "use strict";

  // ---- Vocabulary (reused, with identical fallbacks) ---------------------

  var FALLBACK_VERIFICATION_STATES = ["UNKNOWN", "DISCOVERED",
    "UNVERIFIED", "VERIFIED", "STALE", "UNAVAILABLE", "NOT_CONNECTED",
    "DISABLED"];

  function verificationStates() {
    if (global.CryptoWorld &&
        Array.isArray(global.CryptoWorld.VERIFICATION_STATES) &&
        global.CryptoWorld.VERIFICATION_STATES.length) {
      return global.CryptoWorld.VERIFICATION_STATES.slice();
    }
    if (global.Truth && Array.isArray(global.Truth.TRUTH_STATES) &&
        global.Truth.TRUTH_STATES.length) {
      return global.Truth.TRUTH_STATES.slice();
    }
    return FALLBACK_VERIFICATION_STATES.slice();
  }

  // Closed set of position types. "holding" is a plain token balance
  // held as a position record; every other type is a deployed
  // position and is never a normal token balance.
  var POSITION_TYPES = ["staking", "restaking", "lending-deposit",
    "loan", "lp", "concentrated-liquidity", "vault", "yield-token",
    "derivative", "rwa", "nft-financial", "holding", "other"];

  var POSITION_STATUSES = ["OPEN", "CLOSED", "STALE", "UNKNOWN"];

  var FRESHNESS_VALUES = ["fresh", "aging", "stale", "unknown"];
  var FRESH_DAYS = 7;
  var DEFAULT_MAX_AGE_DAYS = 30;

  var COMPUTED_PNL_SOURCE = "computed-from-sourced-inputs";

  // ---- Secret rejection (same patterns as js/wallet-intelligence.js) ------

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

  // Deep scan of a record: every key name and every string value.
  // Returns a "path" describing the first secret-looking field found,
  // or null. Never throws. The positionId / walletId / accountId /
  // networkId / assetIds / protocolId / activityId / strategyId
  // reference fields are ids, not secrets, and are not matched by the
  // value pattern unless they literally contain secret material.
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

  function parseDate(value) {
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function newPositionId() {
    return "position-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 8);
  }

  function cloneMoney(money) {
    if (money === null || money === undefined) return null;
    return {
      value: money.value,
      currency: money.currency,
      source: money.source,
      checkedAt: money.checkedAt
    };
  }

  function cloneRecord(record) {
    var copy = {};
    Object.keys(record).forEach(function (k) { copy[k] = record[k]; });
    copy.assetIds = (record.assetIds || []).slice();
    copy.size = cloneMoney(record.size);
    copy.costBasis = cloneMoney(record.costBasis);
    copy.currentValue = cloneMoney(record.currentValue);
    copy.pnl = cloneMoney(record.pnl);
    copy.fees = cloneMoney(record.fees);
    copy.risk = record.risk ? JSON.parse(JSON.stringify(record.risk)) : null;
    copy.opportunityIds = (record.opportunityIds || []).slice();
    return copy;
  }

  // A money field is UNKNOWN when it is null or undefined. Anything
  // else must be a sourced record; validateMoney() enforces the shape.
  function isMoneyUnknown(money) {
    return money === null || money === undefined;
  }

  // Freshness of a position at registration / check time, judged from
  // lastCheckedAt only. No timestamp means "unknown": it says "cannot
  // judge", never "fresh".
  function classifyFreshness(position, maxAgeDays) {
    var max = (maxAgeDays === undefined || maxAgeDays === null) ?
      DEFAULT_MAX_AGE_DAYS : Number(maxAgeDays);
    if (!(max >= 0)) max = DEFAULT_MAX_AGE_DAYS;
    var d = parseDate((position && position.lastCheckedAt) || null);
    if (!d) return "unknown";
    var ageDays = (Date.now() - d.getTime()) / 86400000;
    if (ageDays > max) return "stale";
    if (ageDays <= FRESH_DAYS) return "fresh";
    return "aging";
  }

  function freshnessLabel(freshness) {
    if (freshness === "fresh") return "Fresh";
    if (freshness === "aging") return "Aging";
    if (freshness === "stale") return "Stale";
    return "Unknown age";
  }

  // Only a plain holding is a normal token balance. Every deployed
  // position type — LP and concentrated-liquidity included — is a
  // position, never a token balance. Derived by the module; a
  // caller-supplied isTokenBalance is ignored.
  function tokenBalanceFor(type) {
    return type === "holding";
  }

  // ---- Money validation ---------------------------------------------------

  // Validates one money field. Returns error strings (empty = valid or
  // UNKNOWN). `allowNegative` is true only for pnl: a loss is a
  // negative P/L, while size, cost basis, current value, and fees are
  // never negative. A missing field is UNKNOWN, never zero.
  function validateMoney(field, money, allowNegative) {
    var errors = [];
    if (isMoneyUnknown(money)) return errors;
    if (!money || typeof money !== "object" || Array.isArray(money)) {
      return [field + " must be a sourced record { value, currency, source, checkedAt } or UNKNOWN."];
    }
    if (typeof money.value !== "number" || !isFinite(money.value)) {
      errors.push(field + ".value must be a finite number.");
    } else if (!allowNegative && money.value < 0) {
      errors.push(field + ".value must not be negative.");
    }
    if (!isNonEmptyString(money.currency)) {
      errors.push(field + ".currency is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(money.source)) {
      errors.push(field + ".source is required (where this value was read from).");
    }
    if (!parseDate(money.checkedAt)) {
      errors.push(field + ".checkedAt must be a valid timestamp.");
    }
    return errors;
  }

  // ---- P/L ----------------------------------------------------------------

  // Pure P/L derivation. Returns null (UNKNOWN) unless BOTH costBasis
  // and currentValue are sourced records in the SAME currency. When
  // both are sourced, returns the exact difference with source
  // "computed-from-sourced-inputs" and checkedAt set to the later of
  // the two input timestamps. Never fabricates a gain: no inputs, no
  // P/L; mismatched currencies, no P/L.
  function computePnl(position) {
    var cost = position && position.costBasis;
    var current = position && position.currentValue;
    if (isMoneyUnknown(cost) || isMoneyUnknown(current)) return null;
    if (!cost || typeof cost !== "object" || !current ||
        typeof current !== "object") return null;
    if (typeof cost.value !== "number" || !isFinite(cost.value)) return null;
    if (typeof current.value !== "number" || !isFinite(current.value)) return null;
    if (!isNonEmptyString(cost.currency) ||
        !isNonEmptyString(current.currency)) return null;
    if (cost.currency !== current.currency) return null;
    var costAt = parseDate(cost.checkedAt);
    var currentAt = parseDate(current.checkedAt);
    if (!costAt || !currentAt) return null;
    var later = costAt.getTime() >= currentAt.getTime() ? costAt : currentAt;
    return {
      value: current.value - cost.value,
      currency: cost.currency,
      source: COMPUTED_PNL_SOURCE,
      checkedAt: later.toISOString()
    };
  }

  // Why a position's P/L is what it is, in plain words for the
  // Positions & Assets screen. Never claims a gain that was not
  // computed from sourced inputs.
  function pnlExplanation(position) {
    if (!position) return "No position recorded.";
    if (!isMoneyUnknown(position.pnl)) {
      return "P/L computed from sourced cost basis and current value in " +
        position.pnl.currency + ".";
    }
    if (isMoneyUnknown(position.costBasis) &&
        isMoneyUnknown(position.currentValue)) {
      return "P/L is UNKNOWN: neither cost basis nor current value has been sourced.";
    }
    if (isMoneyUnknown(position.costBasis)) {
      return "P/L is UNKNOWN: cost basis has not been sourced.";
    }
    if (isMoneyUnknown(position.currentValue)) {
      return "P/L is UNKNOWN: current value has not been sourced.";
    }
    if (position.costBasis.currency !== position.currentValue.currency) {
      return "P/L is UNKNOWN: cost basis (" + position.costBasis.currency +
        ") and current value (" + position.currentValue.currency +
        ") are in different currencies.";
    }
    return "P/L is UNKNOWN.";
  }

  // ---- Validation ---------------------------------------------------------

  // Returns an array of error strings (empty = valid). Never throws.
  // A record is valid only when: its references are present and
  // non-empty, its type is in the closed set, its money fields are
  // sourced-or-UNKNOWN, its P/L (if supplied) is exactly the value
  // derivable from its sourced inputs, its risk (if present) carries
  // dimensions and no score, and a VERIFIED claim carries provenance.
  function validatePosition(record) {
    var errors = [];
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return ["Position record must be an object."];
    }
    if (record.positionId !== undefined && !isNonEmptyString(record.positionId)) {
      errors.push("positionId must be a non-empty string.");
    }
    // References: required as non-empty strings. This module records
    // the reference; it does NOT verify the referenced record exists
    // in another registry — that is the caller's job, and the record
    // stays UNVERIFIED until then.
    if (!isNonEmptyString(record.walletId)) {
      errors.push("walletId is required and must be a non-empty string (a reference to a wallet record).");
    }
    if (!isNonEmptyString(record.accountId)) {
      errors.push("accountId is required and must be a non-empty string (a reference to an account record).");
    }
    if (!isNonEmptyString(record.networkId)) {
      errors.push("networkId is required and must be a non-empty string (a reference to a network record).");
    }
    if (!Array.isArray(record.assetIds) || record.assetIds.length === 0) {
      errors.push("assetIds is required and must be a non-empty array of asset reference ids.");
    } else {
      record.assetIds.forEach(function (a, i) {
        if (!isNonEmptyString(a)) {
          errors.push("assetIds[" + i + "] must be a non-empty string (a reference to an asset record).");
        }
      });
    }
    if (!isNonEmptyString(record.protocolId)) {
      errors.push("protocolId is required and must be a non-empty string (a reference to a protocol record).");
    }
    if (!isNonEmptyString(record.activityId)) {
      errors.push("activityId is required and must be a non-empty string (a reference to an activity record).");
    }
    if (record.strategyId !== undefined && record.strategyId !== null &&
        !isNonEmptyString(record.strategyId)) {
      errors.push("strategyId must be a non-empty string or null.");
    }
    if (!isNonEmptyString(record.type)) {
      errors.push("type is required and must be one of: " + POSITION_TYPES.join(", ") + ".");
    } else if (POSITION_TYPES.indexOf(record.type) === -1) {
      errors.push("Unknown position type: " + record.type +
        " (use one of: " + POSITION_TYPES.join(", ") + ").");
    }
    // Money fields: sourced-or-UNKNOWN, never invented, never zero
    // by default. A present field must be fully sourced.
    errors = errors.concat(validateMoney("size", record.size, false));
    errors = errors.concat(validateMoney("costBasis", record.costBasis, false));
    errors = errors.concat(validateMoney("currentValue", record.currentValue, false));
    errors = errors.concat(validateMoney("pnl", record.pnl, true));
    errors = errors.concat(validateMoney("fees", record.fees, false));
    // P/L honesty: a supplied pnl is only storable when it is exactly
    // the value derivable from sourced costBasis + currentValue in
    // one currency. Otherwise the P/L is UNKNOWN and the supplied
    // value is rejected, never stored.
    if (!isMoneyUnknown(record.pnl)) {
      var computed = computePnl(record);
      if (computed === null) {
        errors.push("pnl cannot be recorded: P/L is UNKNOWN unless both costBasis and currentValue are sourced in the same currency.");
      } else if (record.pnl.value !== computed.value ||
          record.pnl.currency !== computed.currency) {
        errors.push("pnl does not match the P/L computed from sourced costBasis and currentValue (expected " +
          computed.value + " " + computed.currency + ", got " +
          record.pnl.value + " " + record.pnl.currency + ").");
      }
    }
    // A caller-supplied isTokenBalance that contradicts the derived
    // value is rejected: an LP (or any deployed) position is never a
    // normal token balance, and a holding always is one.
    if (record.isTokenBalance !== undefined &&
        isNonEmptyString(record.type) &&
        POSITION_TYPES.indexOf(record.type) !== -1 &&
        record.isTokenBalance !== tokenBalanceFor(record.type)) {
      errors.push("isTokenBalance must be " + tokenBalanceFor(record.type) +
        " for a " + record.type + " position (an LP position is a position, never a normal token balance).");
    }
    // Risk: dimensions only, never scores.
    if (record.risk !== undefined && record.risk !== null) {
      if (!record.risk || typeof record.risk !== "object" ||
          Array.isArray(record.risk)) {
        errors.push("risk must be an object { dimensions, note } or null.");
      } else {
        if (record.risk.score !== undefined) {
          errors.push("risk must not carry a score: risk stays dimensions, never scores.");
        }
        if (record.risk.dimensions !== undefined) {
          if (!isStringArray(record.risk.dimensions)) {
            errors.push("risk.dimensions must be an array of dimension names (strings).");
          } else {
            record.risk.dimensions.forEach(function (d, i) {
              if (!isNonEmptyString(d)) {
                errors.push("risk.dimensions[" + i + "] must be a non-empty string.");
              }
            });
          }
        }
        if (record.risk.note !== undefined &&
            typeof record.risk.note !== "string") {
          errors.push("risk.note must be a string.");
        }
      }
    }
    if (record.status !== undefined &&
        POSITION_STATUSES.indexOf(record.status) === -1) {
      errors.push("status must be one of: " + POSITION_STATUSES.join(", ") + ".");
    }
    if (record.verificationStatus !== undefined &&
        verificationStates().indexOf(record.verificationStatus) === -1) {
      errors.push("Unknown verificationStatus: " + record.verificationStatus + ".");
    }
    // Present is not verified: a VERIFIED position needs a source and
    // a last-checked timestamp, or it is rejected.
    if (record.verificationStatus === "VERIFIED" &&
        (!isNonEmptyString(record.source) ||
         !isNonEmptyString(record.lastCheckedAt))) {
      errors.push("A VERIFIED position needs a source and lastCheckedAt timestamp.");
    }
    if (record.freshness !== undefined &&
        FRESHNESS_VALUES.indexOf(record.freshness) === -1) {
      errors.push("freshness must be one of: " + FRESHNESS_VALUES.join(", ") + ".");
    }
    if (record.openedAt !== undefined && record.openedAt !== null &&
        !parseDate(record.openedAt)) {
      errors.push("openedAt must be a valid date string or null.");
    }
    if (record.lastCheckedAt !== undefined && record.lastCheckedAt !== null &&
        !parseDate(record.lastCheckedAt)) {
      errors.push("lastCheckedAt must be a valid date string or null.");
    }
    if (record.opportunityIds !== undefined) {
      if (!isStringArray(record.opportunityIds)) {
        errors.push("opportunityIds must be an array of opportunity reference ids (strings).");
      } else {
        record.opportunityIds.forEach(function (o, i) {
          if (!isNonEmptyString(o)) {
            errors.push("opportunityIds[" + i + "] must be a non-empty string.");
          }
        });
      }
    }
    var secretField = findSecret(record, "");
    if (secretField) {
      errors.push("Field " + secretField +
        " looks like a secret or credential and must not be stored in a position record.");
    }
    return errors;
  }

  // ---- Position list (in-memory only; starts EMPTY) -----------------------

  var positions = [];

  function findIndex(id) {
    for (var i = 0; i < positions.length; i++) {
      if (positions[i].positionId === id) return i;
    }
    return -1;
  }

  // Builds a stored position record from caller input. Money fields
  // default to UNKNOWN (null), never zero. pnl is always derived from
  // sourced costBasis + currentValue (see computePnl); a supplied pnl
  // that does not match is rejected by validatePosition. status
  // defaults to UNKNOWN, verificationStatus to UNVERIFIED, freshness
  // is classified from lastCheckedAt. Throws on invalid input.
  function registerPosition(input) {
    var data = (input && typeof input === "object") ? input : {};
    var record = {
      positionId: isNonEmptyString(data.positionId) ?
        data.positionId.trim() : newPositionId(),
      walletId: data.walletId,
      accountId: data.accountId,
      networkId: data.networkId,
      assetIds: Array.isArray(data.assetIds) ? data.assetIds.slice() : data.assetIds,
      protocolId: data.protocolId,
      activityId: data.activityId,
      strategyId: (data.strategyId === undefined) ? null : data.strategyId,
      type: data.type,
      size: isMoneyUnknown(data.size) ? null : cloneMoney(data.size),
      costBasis: isMoneyUnknown(data.costBasis) ? null : cloneMoney(data.costBasis),
      currentValue: isMoneyUnknown(data.currentValue) ? null : cloneMoney(data.currentValue),
      // pnl is derived, never taken on trust: computePnl returns null
      // (UNKNOWN) unless both inputs are sourced in one currency.
      pnl: null,
      fees: isMoneyUnknown(data.fees) ? null : cloneMoney(data.fees),
      risk: (data.risk === undefined || data.risk === null) ? null :
        JSON.parse(JSON.stringify(data.risk)),
      status: data.status === undefined ? "UNKNOWN" : data.status,
      freshness: data.freshness,
      verificationStatus: data.verificationStatus === undefined ?
        "UNVERIFIED" : data.verificationStatus,
      source: isNonEmptyString(data.source) ? String(data.source).trim() : "",
      openedAt: (data.openedAt === undefined) ? null : data.openedAt,
      lastCheckedAt: (data.lastCheckedAt === undefined) ? null : data.lastCheckedAt,
      opportunityIds: Array.isArray(data.opportunityIds) ?
        data.opportunityIds.slice() : []
    };
    // isTokenBalance is derived from type, never caller-supplied.
    record.isTokenBalance = tokenBalanceFor(record.type);
    // Derive pnl from the sourced inputs before validation, so a
    // supplied pnl can be checked against the derived value.
    var derived = computePnl(record);
    if (!isMoneyUnknown(data.pnl)) {
      // Keep the supplied value on the record for validation to
      // compare; registerPosition stores the derived value on success.
      record.pnl = cloneMoney(data.pnl);
      var errors = validatePosition(record);
      if (errors.length) {
        throw new Error("Invalid position: " + errors.join(" "));
      }
      record.pnl = derived;
    } else {
      record.pnl = derived;
      var errs = validatePosition(record);
      if (errs.length) {
        throw new Error("Invalid position: " + errs.join(" "));
      }
    }
    // Freshness is classified from lastCheckedAt when the caller did
    // not state one; a stated freshness that disagrees with the
    // timestamp is corrected, never stored as a false claim.
    record.freshness = classifyFreshness(record, DEFAULT_MAX_AGE_DAYS);
    if (findIndex(record.positionId) !== -1) {
      throw new Error("A position with id " + record.positionId + " already exists.");
    }
    positions.push(record);
    return cloneRecord(record);
  }

  function getPosition(id) {
    if (typeof id !== "string") return null;
    var i = findIndex(id);
    return i === -1 ? null : cloneRecord(positions[i]);
  }

  // Filters by reference. assetId matches when it appears in the
  // position's assetIds array. Unknown filter keys are ignored. No
  // filter returns every stored position.
  function listPositions(filters) {
    var f = (filters && typeof filters === "object") ? filters : {};
    return positions.filter(function (p) {
      if (f.walletId !== undefined && p.walletId !== f.walletId) return false;
      if (f.accountId !== undefined && p.accountId !== f.accountId) return false;
      if (f.networkId !== undefined && p.networkId !== f.networkId) return false;
      if (f.assetId !== undefined && p.assetIds.indexOf(f.assetId) === -1) return false;
      if (f.protocolId !== undefined && p.protocolId !== f.protocolId) return false;
      if (f.activityId !== undefined && p.activityId !== f.activityId) return false;
      if (f.status !== undefined && p.status !== f.status) return false;
      if (f.type !== undefined && p.type !== f.type) return false;
      return true;
    }).map(cloneRecord);
  }

  function positionsByWallet(walletId) {
    if (typeof walletId !== "string") return [];
    return listPositions({ walletId: walletId });
  }

  function positionsByAsset(assetId) {
    if (typeof assetId !== "string") return [];
    return listPositions({ assetId: assetId });
  }

  function positionsByOpportunity(opportunityId) {
    if (typeof opportunityId !== "string") return [];
    return positions.filter(function (p) {
      return p.opportunityIds.indexOf(opportunityId) !== -1;
    }).map(cloneRecord);
  }

  // ---- Position -> opportunity links (references only) --------------------

  // Records the relationship between a position and an opportunity.
  // A link is a reference, never a promise of return. A position may
  // link to multiple opportunities. Linking the same opportunity
  // twice is idempotent: the existing link is kept, no duplicate is
  // added. Throws when the position does not exist or the
  // opportunity id is not a non-empty string. Returns the linked
  // opportunity ids for the position.
  function linkOpportunity(positionId, opportunityId) {
    if (typeof positionId !== "string" || !isNonEmptyString(positionId)) {
      throw new Error("linkOpportunity requires a position id.");
    }
    if (!isNonEmptyString(opportunityId)) {
      throw new Error("linkOpportunity requires a non-empty opportunity id (a reference, never a promised return).");
    }
    var i = findIndex(positionId);
    if (i === -1) {
      throw new Error("No position with id " + positionId + ".");
    }
    var links = positions[i].opportunityIds;
    if (links.indexOf(opportunityId) === -1) {
      links.push(opportunityId);
    }
    return links.slice();
  }

  function unlinkOpportunity(positionId, opportunityId) {
    if (typeof positionId !== "string" || !isNonEmptyString(positionId)) {
      throw new Error("unlinkOpportunity requires a position id.");
    }
    if (!isNonEmptyString(opportunityId)) {
      throw new Error("unlinkOpportunity requires a non-empty opportunity id.");
    }
    var i = findIndex(positionId);
    if (i === -1) {
      throw new Error("No position with id " + positionId + ".");
    }
    var links = positions[i].opportunityIds;
    var at = links.indexOf(opportunityId);
    if (at !== -1) links.splice(at, 1);
    return links.slice();
  }

  function linksFor(positionId) {
    if (typeof positionId !== "string") return null;
    var i = findIndex(positionId);
    return i === -1 ? null : positions[i].opportunityIds.slice();
  }

  // ---- Status and verification --------------------------------------------

  // Moves a position to a new status. Status is a record of what is
  // known, not an action: setting CLOSED records that the position
  // is known closed; it does not close anything, move funds, or
  // realise P/L. Updates lastCheckedAt and re-classifies freshness.
  function setStatus(id, status) {
    if (typeof id !== "string") {
      throw new Error("setStatus requires a position id.");
    }
    if (POSITION_STATUSES.indexOf(status) === -1) {
      throw new Error("Unknown position status: " + status +
        " (use one of: " + POSITION_STATUSES.join(", ") + ").");
    }
    var i = findIndex(id);
    if (i === -1) {
      throw new Error("No position with id " + id + ".");
    }
    positions[i].status = status;
    positions[i].lastCheckedAt = nowIso();
    positions[i].freshness = classifyFreshness(positions[i], DEFAULT_MAX_AGE_DAYS);
    return cloneRecord(positions[i]);
  }

  // Marks a position VERIFIED from explicit provenance. The only path
  // to VERIFIED: a source AND a checked timestamp are required, or
  // the call throws and nothing is written. The position's references
  // stay recorded as references; verification here covers the
  // position record itself, not the existence of the referenced
  // wallet / network / asset records.
  function markPositionVerified(id, provenance) {
    if (typeof id !== "string") {
      throw new Error("markPositionVerified requires a position id.");
    }
    var p = (provenance && typeof provenance === "object") ? provenance : {};
    if (!isNonEmptyString(p.source)) {
      throw new Error("markPositionVerified requires a source.");
    }
    if (!parseDate(p.checkedAt)) {
      throw new Error("markPositionVerified requires a valid checkedAt timestamp.");
    }
    var i = findIndex(id);
    if (i === -1) {
      throw new Error("No position with id " + id + ".");
    }
    positions[i].verificationStatus = "VERIFIED";
    positions[i].source = String(p.source).trim();
    positions[i].lastCheckedAt = new Date(p.checkedAt).toISOString();
    positions[i].freshness = classifyFreshness(positions[i], DEFAULT_MAX_AGE_DAYS);
    return cloneRecord(positions[i]);
  }

  function removePosition(id) {
    if (typeof id !== "string") return false;
    var i = findIndex(id);
    if (i === -1) return false;
    positions.splice(i, 1);
    return true;
  }

  // ---- Truthful views (for the Positions & Assets screen) -----------------

  // Truthful detail view for one position. Never claims more than the
  // record supports: unknown money fields are reported UNKNOWN, P/L
  // carries its explanation, and an LP position is reported as a
  // position, not a token balance.
  function describePosition(id) {
    var position = getPosition(id);
    if (!position) return null;
    return {
      positionId: position.positionId,
      walletId: position.walletId,
      accountId: position.accountId,
      networkId: position.networkId,
      assetIds: position.assetIds.slice(),
      protocolId: position.protocolId,
      activityId: position.activityId,
      strategyId: position.strategyId,
      type: position.type,
      isTokenBalance: position.isTokenBalance,
      size: position.size,
      costBasis: position.costBasis,
      currentValue: position.currentValue,
      pnl: position.pnl,
      pnlExplanation: pnlExplanation(position),
      fees: position.fees,
      risk: position.risk,
      status: position.status,
      freshness: position.freshness,
      freshnessLabel: freshnessLabel(position.freshness),
      verificationStatus: position.verificationStatus,
      source: position.source,
      openedAt: position.openedAt,
      lastCheckedAt: position.lastCheckedAt,
      opportunityIds: position.opportunityIds.slice(),
      note: position.isTokenBalance ?
        "A plain holding: a normal token balance." :
        "A deployed position, not a normal token balance."
    };
  }

  // Counts are real counts of stored position records only. No
  // totals are invented: totalValue / totalPnl are null (UNKNOWN)
  // unless every OPEN position carries a sourced value in one shared
  // currency — mixed or missing currencies never collapse into a
  // single invented total.
  function summary() {
    var byStatus = {};
    POSITION_STATUSES.forEach(function (s) { byStatus[s] = 0; });
    var byType = {};
    POSITION_TYPES.forEach(function (t) { byType[t] = 0; });
    var open = [];
    positions.forEach(function (p) {
      if (byStatus.hasOwnProperty(p.status)) byStatus[p.status] += 1;
      if (byType.hasOwnProperty(p.type)) byType[p.type] += 1;
      if (p.status === "OPEN") open.push(p);
    });
    var totalValue = null;
    var totalPnl = null;
    if (open.length > 0) {
      var currency = null;
      var valueSum = 0;
      var pnlSum = 0;
      var allSourced = true;
      open.forEach(function (p) {
        if (isMoneyUnknown(p.currentValue) || isMoneyUnknown(p.pnl)) {
          allSourced = false;
          return;
        }
        if (currency === null) currency = p.currentValue.currency;
        if (p.currentValue.currency !== currency ||
            p.pnl.currency !== currency) {
          allSourced = false;
          return;
        }
        valueSum += p.currentValue.value;
        pnlSum += p.pnl.value;
      });
      if (allSourced) {
        totalValue = { value: valueSum, currency: currency,
          source: COMPUTED_PNL_SOURCE, checkedAt: nowIso() };
        totalPnl = { value: pnlSum, currency: currency,
          source: COMPUTED_PNL_SOURCE, checkedAt: nowIso() };
      }
    }
    return {
      total: positions.length,
      open: byStatus.OPEN,
      byStatus: byStatus,
      byType: byType,
      totalValue: totalValue,
      totalPnl: totalPnl,
      note: positions.length === 0 ?
        "No positions registered — NOT_CONNECTED. Positions appear only via explicit registerPosition with references." :
        (totalValue === null ?
          "Totals are UNKNOWN: not every open position carries a sourced value in one shared currency." :
          "Totals are the sum of sourced open-position values in one shared currency.")
    };
  }

  // Test / maintenance helper: forgets every position. The list
  // starts empty again — the honest starting state.
  function reset() {
    positions = [];
    return true;
  }

  var api = {
    POSITION_TYPES: POSITION_TYPES.slice(),
    POSITION_STATUSES: POSITION_STATUSES.slice(),
    FRESHNESS_VALUES: FRESHNESS_VALUES.slice(),
    FRESH_DAYS: FRESH_DAYS,
    DEFAULT_MAX_AGE_DAYS: DEFAULT_MAX_AGE_DAYS,
    COMPUTED_PNL_SOURCE: COMPUTED_PNL_SOURCE,
    newPositionId: newPositionId,
    isMoneyUnknown: isMoneyUnknown,
    validateMoney: validateMoney,
    validatePosition: validatePosition,
    registerPosition: registerPosition,
    getPosition: getPosition,
    listPositions: listPositions,
    positionsByWallet: positionsByWallet,
    positionsByAsset: positionsByAsset,
    positionsByOpportunity: positionsByOpportunity,
    linkOpportunity: linkOpportunity,
    unlinkOpportunity: unlinkOpportunity,
    linksFor: linksFor,
    computePnl: computePnl,
    pnlExplanation: pnlExplanation,
    setStatus: setStatus,
    markPositionVerified: markPositionVerified,
    removePosition: removePosition,
    classifyFreshness: classifyFreshness,
    freshnessLabel: freshnessLabel,
    describePosition: describePosition,
    summary: summary,
    reset: reset
  };

  global.PositionIntelligence = api;
  return api;
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
