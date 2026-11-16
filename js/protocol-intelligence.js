/* MTI6-GTADWIY-COCKPIT — Protocol Intelligence foundation
 * (continuous development campaign: Protocol Intelligence unit,
 * Crypto spec C4 — protocol layer)
 *
 * Runtime registry of PROTOCOLS: the services/protocols a Crypto World
 * activity can run through (a DEX, a bridge, a lending market, ...).
 * This layer MODELS protocols and their references; it never calls a
 * protocol, never fetches, never holds a secret, and never claims a
 * protocol is live, safe, or supported.
 *
 * Rules, fail-closed throughout:
 *   - Categories are a closed 18-value set (CATEGORIES). Anything
 *     else is rejected at registration.
 *   - Protocols REFERENCE the canonical taxonomy by id only
 *     (networks, Major Activities, Types, Strategies). A protocol
 *     record must NEVER copy an Encyclopedia definition: see the
 *     definition-copy guard in validateProtocol. This module does NOT
 *     verify that a referenced id exists in another registry — it
 *     records the reference and the protocol stays UNVERIFIED until a
 *     caller verifies it.
 *   - Registration is never support. A registered protocol has
 *     registrationState "REGISTERED" and supported false. Support is
 *     a separate, explicit flag set ONLY via markSupported(), which
 *     requires a named actor (by) and an evidence record. Nothing
 *     registered here is ever "SUPPORTED" by default, and a record
 *     that arrives claiming supported / "SUPPORTED" is rejected.
 *   - Verification / security states come from the shared Truth
 *     vocabulary (js/truth.js and js/crypto-world.js, loaded before
 *     this file). Nothing is VERIFIED without provenance (a source
 *     AND a lastChecked timestamp); a VERIFIED claim without both is
 *     rejected.
 *   - No protocol is seeded here. The registry starts empty: no
 *     invented protocols. Real protocol records arrive through
 *     researched import with a real source, never by promoting an
 *     example.
 *   - A protocol with no description carries description "UNKNOWN",
 *     never an invented one.
 *   - INFORMATIONAL never implies TRANSACTIONAL. Registering or
 *     marking a protocol supported is not authorization or capability
 *     to use it, move funds through it, or sign anything with it.
 *
 * Depends on js/truth.js, js/network-intelligence.js,
 * js/asset-intelligence.js and js/crypto-world.js (load order: this
 * file after those four). Pure functions: no DOM, no network, no
 * secrets, no storage.
 */
var ProtocolIntelligence = (function (global) {
  "use strict";

  // ---- Closed protocol-category vocabulary (spec C4, exact list) ----
  var CATEGORIES = ["DEX", "AGGREGATOR", "BRIDGE", "LENDING", "STAKING",
    "RESTAKING", "VAULT_YIELD", "DERIVATIVES", "SYNTHETICS", "ORACLE",
    "RWA", "NFT_INFRASTRUCTURE", "DEPIN", "PREDICTION", "IDENTITY",
    "BTCFI", "MODULAR_INFRASTRUCTURE", "OTHER_EMERGING"];

  // Registration state. There is exactly one: REGISTERED. "SUPPORTED"
  // is deliberately NOT a registration state — support is a separate
  // explicit flag (see markSupported).
  var REGISTRATION_STATE = "REGISTERED";

  // Truth vocabulary, reused (never a competing copy).
  var VERIFICATION_STATES = (global.CryptoWorld &&
    global.CryptoWorld.VERIFICATION_STATES) || ["UNKNOWN", "DISCOVERED",
    "UNVERIFIED", "VERIFIED", "STALE", "UNAVAILABLE", "NOT_CONNECTED",
    "DISABLED"];

  var TRUTH_STATES = (global.Truth && global.Truth.TRUTH_STATES) ||
    ["NOT_CONNECTED", "UNKNOWN", "UNVERIFIED", "STALE", "DISABLED",
      "UNAVAILABLE", "VERIFIED", "LIVE"];

  // Secret-field names, same convention as CryptoWorld.SECRET_FIELDS.
  var SECRET_FIELDS = ["seedphrase", "seed", "mnemonic", "privatekey",
    "apikey", "apisecret", "password", "secret"];

  var ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  // Reference-array fields on a protocol record: ids that point at
  // other registries. Shape-validated only, never resolved here.
  var REFERENCE_FIELDS = ["networks", "activities", "types", "strategies"];

  // ---- Registry (in-memory only; no storage, no persistence) ----
  // Starts empty. No seeded protocols: inventing a protocol record
  // would be fabricating a fact about a live service.
  var protocols = [];

  // ---- Helpers ----

  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim() !== "";
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  // Recursively collect secret-looking field names. Keys are checked
  // case-insensitively, at every depth of plain objects and arrays.
  function secretFieldErrors(value, path, errors) {
    if (Array.isArray(value)) {
      value.forEach(function (item, i) {
        secretFieldErrors(item, path + "[" + i + "]", errors);
      });
      return;
    }
    if (!value || typeof value !== "object") return;
    Object.keys(value).forEach(function (k) {
      if (SECRET_FIELDS.indexOf(k.toLowerCase()) !== -1) {
        errors.push("Secret field not allowed: " + path + k + ".");
      }
      secretFieldErrors(value[k], path + k + ".", errors);
    });
  }

  // ---- Definition-copy guard (best-effort) ----
  // A protocol record must NOT contain a copied Encyclopedia
  // definition. The guard has two layers:
  //   1. Hard rule: a record carrying a field named "definition"
  //      (any value) is rejected outright. Protocols describe
  //      themselves in `description`; `definition` is the
  //      Encyclopedia's field, and its presence means a definition
  //      was pasted in.
  //   2. Best-effort verbatim check: a description longer than 500
  //      characters that matches a known Type/Strategy definition
  //      verbatim is rejected. Known definitions come from the
  //      Encyclopedia data files when they are loaded in the same
  //      context (EncyclopediaCanonical60 / EncyclopediaBatchA /
  //      EncyclopediaBatchB .records), or from an explicit
  //      knownDefinitions array passed by the caller. When no
  //      definitions are available the verbatim layer cannot run and
  //      is skipped — it is a guard, not a guarantee — while layer 1
  //      always applies.
  function knownDefinitions(extra) {
    var defs = [];
    function collect(holder) {
      if (!holder || !Array.isArray(holder.records)) return;
      holder.records.forEach(function (rec) {
        if (rec && typeof rec.definition === "string" &&
            rec.definition.trim() !== "") {
          defs.push(rec.definition);
        }
      });
    }
    collect(global.EncyclopediaCanonical60);
    collect(global.EncyclopediaBatchA);
    collect(global.EncyclopediaBatchB);
    if (Array.isArray(extra)) {
      extra.forEach(function (d) {
        if (typeof d === "string" && d.trim() !== "") defs.push(d);
      });
    }
    return defs;
  }

  function descriptionCopiesDefinition(description, extra) {
    if (typeof description !== "string") return false;
    if (description.length <= 500) return false;
    var defs = knownDefinitions(extra);
    for (var i = 0; i < defs.length; i++) {
      if (description === defs[i]) return true;
    }
    return false;
  }

  // ---- Validation ----

  function validateReferenceArray(rec, field, errors) {
    if (rec[field] === undefined) return;
    if (!Array.isArray(rec[field])) {
      errors.push(field + " must be an array of id references.");
      return;
    }
    rec[field].forEach(function (ref, i) {
      if (!isNonEmptyString(ref)) {
        errors.push(field + "[" + i + "] must be a non-empty string id reference.");
      }
    });
  }

  // Strict gate for a protocol record. Returns an array of error
  // strings; an empty array means the record passes. Does not throw,
  // never fabricates, never accepts a secret field or a copied
  // definition. knownDefinitions (optional) is an array of
  // Type/Strategy definition strings for the verbatim guard; see
  // descriptionCopiesDefinition.
  function validateProtocol(rec, knownDefinitionsArg) {
    var errors = [];
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) {
      return ["Protocol record must be an object."];
    }

    // Identity: protocolId + name. Nothing else identifies a protocol.
    if (!isNonEmptyString(rec.protocolId)) {
      errors.push("A protocol needs a non-empty protocolId.");
    } else if (!ID_PATTERN.test(rec.protocolId)) {
      errors.push("protocolId must be lowercase slug form (a-z, 0-9, hyphens).");
    }
    if (!isNonEmptyString(rec.name)) {
      errors.push("A protocol needs a non-empty name.");
    }

    // Category: closed 18-value set, required.
    if (!isNonEmptyString(rec.category)) {
      errors.push("A protocol needs a category.");
    } else if (CATEGORIES.indexOf(rec.category) === -1) {
      errors.push("Unknown protocol category: " + rec.category + ".");
    }

    // References: arrays of non-empty string ids. Shape only — this
    // module does NOT verify the ids exist in other registries; it
    // records the reference and the protocol stays UNVERIFIED until
    // a caller verifies it.
    REFERENCE_FIELDS.forEach(function (field) {
      validateReferenceArray(rec, field, errors);
    });

    // Verification: Truth vocabulary. VERIFIED needs provenance.
    if (rec.verificationStatus !== undefined &&
        VERIFICATION_STATES.indexOf(rec.verificationStatus) === -1) {
      errors.push("Unknown verificationStatus: " + rec.verificationStatus + ".");
    }
    if (rec.verificationStatus === "VERIFIED" &&
        (!isNonEmptyString(rec.source) || !isNonEmptyString(rec.lastChecked))) {
      errors.push("A VERIFIED protocol needs a source and lastChecked timestamp.");
    }

    // Freshness: lastChecked / maxAgeMs shape only. Freshness is
    // judged by freshnessFor(); it is never stored as a claim of
    // liveness.
    if (rec.freshness !== undefined) {
      if (!rec.freshness || typeof rec.freshness !== "object") {
        errors.push("freshness must be an object.");
      } else {
        if (rec.freshness.lastChecked !== undefined &&
            rec.freshness.lastChecked !== null &&
            typeof rec.freshness.lastChecked !== "string") {
          errors.push("freshness.lastChecked must be an ISO timestamp string or null.");
        }
        if (rec.freshness.maxAgeMs !== undefined &&
            rec.freshness.maxAgeMs !== null &&
            (typeof rec.freshness.maxAgeMs !== "number" || rec.freshness.maxAgeMs < 0)) {
          errors.push("freshness.maxAgeMs must be a non-negative number or null.");
        }
      }
    }

    // Security state: Truth vocabulary. UNKNOWN by default; a claim
    // is never upgraded here.
    if (rec.securityState !== undefined &&
        TRUTH_STATES.indexOf(rec.securityState) === -1) {
      errors.push("Unknown securityState: " + rec.securityState + ".");
    }

    // Description: a short own-words description, or UNKNOWN. Never
    // an invented one, and never a copied Encyclopedia definition.
    if (rec.description !== undefined && typeof rec.description !== "string") {
      errors.push("description must be a string.");
    }
    if (Object.prototype.hasOwnProperty.call(rec, "definition")) {
      errors.push("A protocol record must not carry a \"definition\" field: definitions belong to the Encyclopedia; describe the protocol in \"description\" instead.");
    }
    if (isNonEmptyString(rec.description) &&
        descriptionCopiesDefinition(rec.description, knownDefinitionsArg)) {
      errors.push("description copies a known Encyclopedia Type/Strategy definition verbatim (over 500 characters): reference the Type/Strategy by id instead of copying its definition.");
    }

    // Support is never claimed at registration: it is set only via
    // markSupported with evidence. A record arriving with
    // supported true (or a "SUPPORTED" registration state) is
    // rejected, so registration can never smuggle in support.
    if (rec.supported === true) {
      errors.push("A protocol cannot arrive supported: support is set only via markSupported with evidence.");
    }
    if (rec.registrationState !== undefined &&
        rec.registrationState !== REGISTRATION_STATE) {
      errors.push("registrationState must be \"" + REGISTRATION_STATE +
        "\"; a protocol is never \"SUPPORTED\" merely because it is registered.");
    }

    // No secret-looking fields anywhere in the record, at any depth.
    secretFieldErrors(rec, "", errors);

    return errors;
  }

  // ---- Registry operations ----

  function findIndex(protocolId) {
    for (var i = 0; i < protocols.length; i++) {
      if (protocols[i].protocolId === protocolId) return i;
    }
    return -1;
  }

  // Register a protocol. Returns { ok: true, protocol } with the
  // stored (normalized) record, or { ok: false, errors } leaving the
  // registry untouched. Duplicate protocolIds are rejected; nothing
  // is overwritten silently. Normalization: missing description
  // becomes "UNKNOWN"; missing reference arrays become []; missing
  // verificationStatus becomes "UNVERIFIED"; missing freshness
  // becomes { lastChecked: null, maxAgeMs: null }; missing
  // securityState becomes "UNKNOWN"; registrationState is always
  // "REGISTERED" and supported is always false at registration.
  function registerProtocol(rec, knownDefinitionsArg) {
    var errors = validateProtocol(rec, knownDefinitionsArg);
    if (errors.length) return { ok: false, errors: errors };
    if (findIndex(rec.protocolId) !== -1) {
      return { ok: false, errors: ["A protocol with protocolId \"" +
        rec.protocolId + "\" is already registered."] };
    }
    var stored = {
      protocolId: rec.protocolId,
      name: rec.name,
      category: rec.category,
      networks: (rec.networks || []).slice(),
      activities: (rec.activities || []).slice(),
      types: (rec.types || []).slice(),
      strategies: (rec.strategies || []).slice(),
      verificationStatus: rec.verificationStatus || "UNVERIFIED",
      freshness: rec.freshness ? clone(rec.freshness) :
        { lastChecked: null, maxAgeMs: null },
      securityState: rec.securityState || "UNKNOWN",
      description: isNonEmptyString(rec.description) ?
        rec.description : "UNKNOWN",
      registrationState: REGISTRATION_STATE,
      supported: false,
      support: null
    };
    if (isNonEmptyString(rec.source)) stored.source = rec.source;
    if (isNonEmptyString(rec.lastChecked)) stored.lastChecked = rec.lastChecked;
    protocols.push(stored);
    return { ok: true, protocol: clone(stored) };
  }

  // A registered protocol, or null when no protocol has that id.
  // Returns a copy: callers cannot mutate the registry through it.
  function getProtocol(protocolId) {
    var i = findIndex(protocolId);
    return i === -1 ? null : clone(protocols[i]);
  }

  // All registered protocols, optionally filtered by reference:
  // { category, networkId, activityId, typeId, strategyId }.
  // Filters combine (AND). An unknown category matches nothing.
  function listProtocols(filters) {
    var f = filters || {};
    return protocols.filter(function (p) {
      if (f.category !== undefined && p.category !== f.category) return false;
      if (f.networkId !== undefined && p.networks.indexOf(f.networkId) === -1) return false;
      if (f.activityId !== undefined && p.activities.indexOf(f.activityId) === -1) return false;
      if (f.typeId !== undefined && p.types.indexOf(f.typeId) === -1) return false;
      if (f.strategyId !== undefined && p.strategies.indexOf(f.strategyId) === -1) return false;
      return true;
    }).map(clone);
  }

  function protocolsByCategory(category) {
    return listProtocols({ category: category });
  }

  function protocolsForActivity(majorActivityId) {
    return listProtocols({ activityId: majorActivityId });
  }

  function protocolsForNetwork(networkId) {
    return listProtocols({ networkId: networkId });
  }

  function protocolsForType(typeId) {
    return listProtocols({ typeId: typeId });
  }

  function protocolsForStrategy(strategyId) {
    return listProtocols({ strategyId: strategyId });
  }

  // Whether a protocol is supported. Registration alone never makes
  // this true: only markSupported sets it.
  function isSupported(protocolId) {
    var p = getProtocol(protocolId);
    return !!p && p.supported === true;
  }

  // Mark a protocol SUPPORTED — the only path to support. Requires
  // an explicit actor and an evidence record:
  //   { by: "who marked it (non-empty string)",
  //     evidence: "what supports the claim" }
  // evidence must be a non-empty string, or an object with a
  // non-empty `source` string (optionally with detail/url/note).
  // A bare claim ("supported because we say so") is not evidence.
  // Returns { ok: true, protocol } with the updated record, or
  // { ok: false, errors }. Re-marking an already-supported protocol
  // replaces its support record (new evidence supersedes the old).
  // Support is INFORMATIONAL only: it never authorises use,
  // execution, or signing through the protocol.
  function markSupported(protocolId, opts) {
    var errors = [];
    var i = findIndex(protocolId);
    if (i === -1) {
      return { ok: false, errors: ["No registered protocol with protocolId \"" +
        protocolId + "\"."] };
    }
    if (!opts || typeof opts !== "object") {
      return { ok: false, errors: ["markSupported needs { by, evidence }."] };
    }
    if (!isNonEmptyString(opts.by)) {
      errors.push("markSupported needs a non-empty by (who marked the protocol supported).");
    }
    if (opts.evidence === undefined || opts.evidence === null) {
      errors.push("markSupported needs an evidence record: support is never granted without evidence.");
    } else if (typeof opts.evidence === "string") {
      if (!isNonEmptyString(opts.evidence)) {
        errors.push("markSupported evidence must be a non-empty string or an object with a source.");
      }
    } else if (typeof opts.evidence === "object") {
      if (!isNonEmptyString(opts.evidence.source)) {
        errors.push("markSupported evidence object needs a non-empty source.");
      }
    } else {
      errors.push("markSupported evidence must be a non-empty string or an object with a source.");
    }
    if (errors.length) return { ok: false, errors: errors };
    protocols[i].supported = true;
    protocols[i].support = {
      by: opts.by,
      evidence: clone(opts.evidence),
      markedAt: isNonEmptyString(opts.markedAt) ? opts.markedAt : null
    };
    return { ok: true, protocol: clone(protocols[i]) };
  }

  // Freshness of a protocol record at a given time (ms since epoch).
  // Returns "FRESH" when lastChecked is within maxAgeMs, "STALE"
  // when it is older, "UNKNOWN" when there is no lastChecked or no
  // maxAgeMs to judge against. UNKNOWN is honest: it says "cannot
  // judge", never "fresh".
  function freshnessFor(protocol, nowMs) {
    if (!protocol || !protocol.freshness) return "UNKNOWN";
    var last = protocol.freshness.lastChecked;
    var maxAge = protocol.freshness.maxAgeMs;
    if (!isNonEmptyString(last)) return "UNKNOWN";
    if (typeof maxAge !== "number" || maxAge < 0) return "UNKNOWN";
    var when = Date.parse(last);
    if (isNaN(when)) return "UNKNOWN";
    if (typeof nowMs !== "number" || isNaN(nowMs)) nowMs = Date.now();
    return (nowMs - when) <= maxAge ? "FRESH" : "STALE";
  }

  // Number of registered protocols.
  function count() {
    return protocols.length;
  }

  var api = {
    CATEGORIES: CATEGORIES,
    REGISTRATION_STATE: REGISTRATION_STATE,
    VERIFICATION_STATES: VERIFICATION_STATES,
    TRUTH_STATES: TRUTH_STATES,
    REFERENCE_FIELDS: REFERENCE_FIELDS,
    validateProtocol: validateProtocol,
    registerProtocol: registerProtocol,
    getProtocol: getProtocol,
    listProtocols: listProtocols,
    protocolsByCategory: protocolsByCategory,
    protocolsForActivity: protocolsForActivity,
    protocolsForNetwork: protocolsForNetwork,
    protocolsForType: protocolsForType,
    protocolsForStrategy: protocolsForStrategy,
    markSupported: markSupported,
    isSupported: isSupported,
    freshnessFor: freshnessFor,
    count: count
  };

  global.ProtocolIntelligence = api;
  return api;
})(typeof globalThis !== "undefined" ? globalThis :
  (typeof window !== "undefined" ? window : this));
