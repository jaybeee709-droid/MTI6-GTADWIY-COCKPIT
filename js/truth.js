/* MTI6-GTADWIY-COCKPIT — Truthful-state vocabulary (overnight shift, Priorities 8/9)
 *
 * Shared, reusable truthful states for bot knowledge and bot outputs.
 * Fail-closed by design: nothing is a success unless it is VERIFIED or
 * LIVE (confirmed reachable just now). Every other state is reported
 * honestly as what it is — never silently converted to success, never
 * a fabricated "OK", progress %, bot count, or financial result.
 *
 * Vocabulary reuse (no competing duplicate):
 *   - Verification states come from CryptoWorld.VERIFICATION_STATES
 *     where they overlap (UNKNOWN, UNVERIFIED, VERIFIED, STALE,
 *     UNAVAILABLE, NOT_CONNECTED, DISABLED). DISCOVERED is a Crypto
 *     World discovery-workflow state, not a truth state, so it is not
 *     in TRUTH_STATES. LIVE is the one addition: confirmed reachable
 *     just now (a fresh live check), distinct from VERIFIED (checked
 *     and sourced at a recorded time).
 *   - Threat kinds come from CryptoWorld.THREAT_KINDS when loaded,
 *     else the same closed 6-value list. Threat knowledge NEVER
 *     becomes transactional: knowing a technique is not authorization
 *     or capability.
 *
 * Pure functions only: no DOM, no network, no secrets, no storage.
 */
(function (global) {
  "use strict";

  // Verification states reused from CryptoWorld when it is loaded.
  var CRYPTO_VERIFICATION_STATES = (global.CryptoWorld &&
    global.CryptoWorld.VERIFICATION_STATES) || ["UNKNOWN", "DISCOVERED",
    "UNVERIFIED", "VERIFIED", "STALE", "UNAVAILABLE", "NOT_CONNECTED",
    "DISABLED"];

  // Truth states: the CryptoWorld verification states minus DISCOVERED,
  // plus LIVE. DISCOVERED describes a discovery-workflow position, not
  // whether a claim is true; LIVE means confirmed reachable just now.
  var TRUTH_STATES = ["NOT_CONNECTED", "UNKNOWN", "UNVERIFIED", "STALE",
    "DISABLED", "UNAVAILABLE", "VERIFIED", "LIVE"];

  // Knowledge kinds sit ON TOP of verification state: a kind says what
  // sort of record this is; verificationStatus says how true it is.
  // THREAT / DEFENSE are kinds recorded in the risks registry only.
  var KNOWLEDGE_KINDS = ["FACT", "OBSERVATION", "DISCOVERY", "UNVERIFIED",
    "VERIFIED", "STALE", "UNAVAILABLE", "NOT_CONNECTED", "OWNER_DECISION",
    "SYSTEM_RULE", "THREAT", "DEFENSE"];

  // Closed threat-kind list, identical to CryptoWorld.THREAT_KINDS.
  // Used only when CryptoWorld is not loaded (e.g. in tests).
  var FALLBACK_THREAT_KINDS = ["ORACLE_MANIPULATION", "FALSE_REPORTING",
    "RESOLUTION_MANIPULATION", "PREDATORY_LIQUIDATION", "MEV_PREDATORY",
    "DEFENSE_MONITORING"];

  var NON_TRANSACTIONAL = ["THREAT", "DEFENSE", "UNVERIFIED", "UNKNOWN",
    "STALE", "UNAVAILABLE", "NOT_CONNECTED", "DISABLED"];

  var LABELS = {
    NOT_CONNECTED: "Not connected",
    UNKNOWN: "Unknown",
    UNVERIFIED: "Unverified",
    STALE: "Stale",
    DISABLED: "Disabled",
    UNAVAILABLE: "Unavailable",
    VERIFIED: "Verified",
    LIVE: "Live"
  };

  var DESCRIPTIONS = {
    NOT_CONNECTED: "No source is connected, so nothing was checked.",
    UNKNOWN: "No information is recorded for this yet.",
    UNVERIFIED: "Recorded, but not checked against a source.",
    STALE: "Recorded, but the information is older than its freshness limit.",
    DISABLED: "This source or capability is turned off.",
    UNAVAILABLE: "The source could not be reached right now.",
    VERIFIED: "Checked against a recorded source at a recorded time.",
    LIVE: "Confirmed reachable just now."
  };

  function threatKinds() {
    if (global.CryptoWorld && global.CryptoWorld.THREAT_KINDS) {
      return global.CryptoWorld.THREAT_KINDS;
    }
    return FALLBACK_THREAT_KINDS;
  }

  function labelFor(state) {
    return LABELS[state] || "Unknown";
  }

  function describe(state, detail) {
    var base = DESCRIPTIONS[state] ||
      "State is not recognised; nothing was confirmed.";
    if (detail === undefined || detail === null || detail === "") return base;
    return base + " " + String(detail);
  }

  // Success-like ONLY for VERIFIED or LIVE. Everything else — including
  // UNKNOWN, UNVERIFIED, STALE, UNAVAILABLE, NOT_CONNECTED, DISABLED —
  // is not success. Fail closed.
  function isSuccessLike(state) {
    return state === "VERIFIED" || state === "LIVE";
  }

  function isThreatKind(kind) {
    return threatKinds().indexOf(kind) !== -1;
  }

  function isKnownTruthState(state) {
    return TRUTH_STATES.indexOf(state) !== -1;
  }

  function isKnownKind(kind) {
    return KNOWLEDGE_KINDS.indexOf(kind) !== -1;
  }

  // Threat knowledge NEVER becomes transactional, and neither does
  // anything unverified, unknown, stale, unavailable, not connected,
  // or disabled. Only a VERIFIED or LIVE state can even be considered,
  // and this function alone never authorises execution: INFORMATIONAL
  // never implies TRANSACTIONAL, and a real transaction still needs
  // its own approval path (none exists in this shift).
  function canBeTransactional(kindOrState) {
    if (kindOrState === undefined || kindOrState === null) return false;
    if (NON_TRANSACTIONAL.indexOf(String(kindOrState)) !== -1) return false;
    return String(kindOrState) === "VERIFIED" || String(kindOrState) === "LIVE";
  }

  global.Truth = {
    TRUTH_STATES: TRUTH_STATES,
    VERIFICATION_STATES: CRYPTO_VERIFICATION_STATES,
    KNOWLEDGE_KINDS: KNOWLEDGE_KINDS,
    THREAT_KINDS: FALLBACK_THREAT_KINDS,
    labelFor: labelFor,
    describe: describe,
    isSuccessLike: isSuccessLike,
    isThreatKind: isThreatKind,
    isKnownTruthState: isKnownTruthState,
    isKnownKind: isKnownKind,
    canBeTransactional: canBeTransactional
  };
})(window);
