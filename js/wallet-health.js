/* MTI6-GTADWIY-COCKPIT — Wallet Health Model (Wallet spec W7, step 12)
 * (continuous development campaign)
 *
 * Derives ONE overall health state for a wallet from eight component
 * states. Health is DERIVED, never fabricated: the overall state is a
 * pure computation over the components supplied to assessWallet().
 * This module never probes a network, wallet, or provider, never
 * fetches, never holds a credential, and never executes a transaction.
 * A component without a valid check time is treated as UNKNOWN — stale
 * health is not health.
 *
 * Component set (fixed — assessWallet rejects any other name):
 *   provider, accountConnection, networkRpc, balanceFreshness,
 *   priceFreshness, positionFreshness, security, execution
 *
 * Component state vocabulary (closed — invalid states are rejected
 * with an error list, never silently coerced):
 *   HEALTHY, DEGRADED, UNAVAILABLE, UNKNOWN
 *
 * Required components: provider, accountConnection. Only a required
 * component being UNAVAILABLE makes the wallet UNAVAILABLE; a
 * non-required component being UNAVAILABLE degrades health instead
 * (the wallet itself is still usable, one of its inputs is down).
 *
 * Overall derivation, in precedence order:
 *   1. No component data at all (no component with a valid check
 *      time)                       -> UNKNOWN
 *   2. Every component UNKNOWN    -> UNKNOWN
 *   3. Any required component UNAVAILABLE -> UNAVAILABLE
 *   4. Any component DEGRADED, or any non-required component
 *      UNAVAILABLE                -> DEGRADED
 *   5. Any required component UNKNOWN (including never assessed)
 *      -> UNKNOWN (fail closed: health cannot be claimed while a
 *      required component is unassessed)
 *   6. Otherwise                   -> HEALTHY
 *
 * Two consequences worth stating plainly:
 *   - HEALTHY requires every required component HEALTHY and every
 *     assessed component HEALTHY. A non-required component assessed
 *     UNKNOWN does not block HEALTHY (it has no usable data, so there
 *     is nothing healthy or unhealthy to report for it), but
 *     summarize() still lists it, so HEALTHY never hides it.
 *   - A missing required component counts as UNKNOWN, not as healthy
 *     and not as unavailable: absence of evidence is unknown.
 *
 * Depends on nothing at load time. Truth vocabulary is consulted
 * through typeof guards with an identical fallback when absent, so
 * this file loads in a bare vm context with no DOM and no network.
 * Load order when wiring: js/truth.js, js/wallet-intelligence.js,
 * then js/wallet-health.js.
 *
 *   WalletHealth.COMPONENTS           -> the eight component names
 *   WalletHealth.COMPONENT_STATES     -> HEALTHY, DEGRADED, UNAVAILABLE, UNKNOWN
 *   WalletHealth.REQUIRED_COMPONENTS  -> provider, accountConnection
 *   WalletHealth.validateHealth(input) -> error strings []
 *   WalletHealth.assessWallet(input)   -> health record (throws on invalid input)
 *   WalletHealth.deriveOverall(components) -> overall state for a component map
 *   WalletHealth.summarize(record)     -> short truthful string
 */
(function (global) {
  "use strict";

  // ---- Vocabulary ---------------------------------------------------------

  var COMPONENTS = ["provider", "accountConnection", "networkRpc",
    "balanceFreshness", "priceFreshness", "positionFreshness",
    "security", "execution"];

  var COMPONENT_STATES = ["HEALTHY", "DEGRADED", "UNAVAILABLE", "UNKNOWN"];

  // Overall health uses the same four states as the components.
  var OVERALL_STATES = ["HEALTHY", "DEGRADED", "UNAVAILABLE", "UNKNOWN"];

  var REQUIRED_COMPONENTS = ["provider", "accountConnection"];

  var COMPONENT_LABELS = {
    provider: "provider",
    accountConnection: "account connection",
    networkRpc: "network RPC",
    balanceFreshness: "balance freshness",
    priceFreshness: "price freshness",
    positionFreshness: "position freshness",
    security: "security",
    execution: "execution"
  };

  // ---- Helpers ------------------------------------------------------------

  function nowIso() {
    return new Date().toISOString();
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  // A check time is valid only when it parses as a date. A missing or
  // unparseable checkedAt means the component was never verifiably
  // checked: it is treated as UNKNOWN, never as healthy.
  function parseCheckedAt(value) {
    if (value === undefined || value === null) return null;
    var d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  function copyEvidence(evidence) {
    if (Array.isArray(evidence)) return evidence.slice();
    if (evidence && typeof evidence === "object") {
      var copy = {};
      Object.keys(evidence).forEach(function (k) { copy[k] = evidence[k]; });
      return copy;
    }
    return evidence === undefined ? null : evidence;
  }

  // ---- Validation ---------------------------------------------------------

  // Returns an array of error strings (empty = valid). Never throws.
  // Invalid component states and unknown component names are errors,
  // never coerced. A missing checkedAt is NOT an error: the component
  // is assessed as UNKNOWN instead (see normalizeComponent).
  function validateHealth(input) {
    var errors = [];
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return ["Wallet health assessment must be an object."];
    }
    if (!isNonEmptyString(input.walletId)) {
      errors.push("walletId is required and must be a non-empty string.");
    }
    var components = input.components;
    if (components !== undefined && components !== null) {
      if (typeof components !== "object" || Array.isArray(components)) {
        errors.push("components must be an object keyed by component name.");
      } else {
        Object.keys(components).forEach(function (name) {
          if (COMPONENTS.indexOf(name) === -1) {
            errors.push("Unknown health component: " + name +
              ". Known components: " + COMPONENTS.join(", ") + ".");
            return;
          }
          var comp = components[name];
          if (!comp || typeof comp !== "object" || Array.isArray(comp)) {
            errors.push("Component " + name + " must be an object " +
              "{ state, detail, checkedAt }.");
            return;
          }
          if (comp.state === undefined || comp.state === null) {
            errors.push("Component " + name + " needs a state. Valid states: " +
              COMPONENT_STATES.join(", ") + ".");
          } else if (typeof comp.state !== "string" ||
              COMPONENT_STATES.indexOf(comp.state) === -1) {
            errors.push("Component " + name + " has invalid state: " +
              String(comp.state) + ". Valid states: " +
              COMPONENT_STATES.join(", ") + ".");
          }
          if (comp.detail !== undefined && comp.detail !== null &&
              typeof comp.detail !== "string") {
            errors.push("Component " + name + " detail must be a string.");
          }
        });
      }
    }
    return errors;
  }

  // ---- Normalization ------------------------------------------------------

  // Normalizes one component into { state, detail, checkedAt }.
  // Absent -> UNKNOWN / "Not assessed." / null. Present without a
  // valid checkedAt -> UNKNOWN (stale health is not health), with an
  // explanatory detail when none was supplied. The input is never
  // mutated.
  function normalizeComponent(name, raw) {
    if (raw === undefined || raw === null) {
      return { state: "UNKNOWN", detail: "Not assessed.", checkedAt: null };
    }
    var checkedAt = parseCheckedAt(raw.checkedAt);
    var state = raw.state;
    var detail = isNonEmptyString(raw.detail) ? raw.detail.trim() : "";
    if (!checkedAt) {
      return {
        state: "UNKNOWN",
        detail: detail ||
          "No valid check time recorded — treated as UNKNOWN.",
        checkedAt: null
      };
    }
    return { state: state, detail: detail, checkedAt: checkedAt };
  }

  function normalizeComponents(rawComponents) {
    var out = {};
    var input = (rawComponents && typeof rawComponents === "object") ?
      rawComponents : {};
    COMPONENTS.forEach(function (name) {
      out[name] = normalizeComponent(name, input[name]);
    });
    return out;
  }

  // ---- Derivation ---------------------------------------------------------

  // Pure derivation of the overall state from a (possibly partial)
  // component map. Missing entries count as UNKNOWN. Precedence is
  // the order documented in the header: no data -> UNKNOWN, all
  // UNKNOWN -> UNKNOWN, required UNAVAILABLE -> UNAVAILABLE, any
  // DEGRADED or non-required UNAVAILABLE -> DEGRADED, required
  // UNKNOWN -> UNKNOWN, otherwise HEALTHY.
  function deriveOverall(components) {
    var input = (components && typeof components === "object") ?
      components : {};
    var hasData = false;
    var allUnknown = true;
    var anyRequiredUnavailable = false;
    var anyDegraded = false;
    var anyNonRequiredUnavailable = false;
    var anyRequiredUnknown = false;
    COMPONENTS.forEach(function (name) {
      var raw = input[name];
      var state;
      var checkedAt = null;
      if (raw && typeof raw === "object") {
        state = COMPONENT_STATES.indexOf(raw.state) !== -1 ?
          raw.state : "UNKNOWN";
        checkedAt = parseCheckedAt(raw.checkedAt);
      } else {
        state = "UNKNOWN";
      }
      // A state without a valid check time is not evidence.
      if (!checkedAt) state = "UNKNOWN";
      var required = REQUIRED_COMPONENTS.indexOf(name) !== -1;
      if (checkedAt) hasData = true;
      if (state !== "UNKNOWN") allUnknown = false;
      if (state === "UNAVAILABLE" && required) {
        anyRequiredUnavailable = true;
      }
      if (state === "UNAVAILABLE" && !required) {
        anyNonRequiredUnavailable = true;
      }
      if (state === "DEGRADED") anyDegraded = true;
      if (state === "UNKNOWN" && required) anyRequiredUnknown = true;
    });
    if (!hasData) return "UNKNOWN";
    if (allUnknown) return "UNKNOWN";
    if (anyRequiredUnavailable) return "UNAVAILABLE";
    if (anyDegraded || anyNonRequiredUnavailable) return "DEGRADED";
    if (anyRequiredUnknown) return "UNKNOWN";
    return "HEALTHY";
  }

  // ---- Assessment ---------------------------------------------------------

  // Builds a health record. Pure computation over the input: it never
  // probes a network, wallet, or provider. Throws on invalid input
  // (unknown component, invalid state, missing walletId); never
  // coerces a bad value into a good-looking one.
  function assessWallet(input) {
    var errors = validateHealth(input);
    if (errors.length) {
      throw new Error("Invalid wallet health assessment: " +
        errors.join(" "));
    }
    var components = normalizeComponents(input.components);
    return {
      walletId: String(input.walletId).trim(),
      components: components,
      overall: deriveOverall(components),
      assessedAt: nowIso(),
      evidence: copyEvidence(input.evidence)
    };
  }

  // ---- Truthful summary ---------------------------------------------------

  // Short truthful string for a health record. Lists each non-HEALTHY
  // component with its state (a component with no check time is listed
  // as "not assessed"). "all components healthy" appears only when
  // the overall state is HEALTHY. Never throws; a malformed record
  // reports UNKNOWN rather than inventing a summary.
  function summarize(record) {
    if (!record || typeof record !== "object" ||
        !isNonEmptyString(record.walletId)) {
      return "Wallet health: UNKNOWN — no assessment record available.";
    }
    var overall = OVERALL_STATES.indexOf(record.overall) !== -1 ?
      record.overall : "UNKNOWN";
    var parts = [];
    var comps = (record.components && typeof record.components === "object") ?
      record.components : {};
    COMPONENTS.forEach(function (name) {
      var comp = comps[name];
      if (!comp || typeof comp !== "object") return;
      var state = comp.state;
      if (state === "HEALTHY" || state === undefined || state === null) return;
      var label = COMPONENT_LABELS[name];
      if (!parseCheckedAt(comp.checkedAt)) {
        parts.push(label + " not assessed");
      } else if (isNonEmptyString(comp.detail)) {
        parts.push(label + " " + state + " (" + comp.detail.trim() + ")");
      } else {
        parts.push(label + " " + state);
      }
    });
    var base = "Wallet " + String(record.walletId).trim() + ": " + overall;
    if (overall === "HEALTHY" && parts.length === 0) {
      return base + " — all components healthy";
    }
    if (parts.length === 0) {
      return base + " — no component data recorded";
    }
    return base + " — " + parts.join(", ");
  }

  global.WalletHealth = {
    COMPONENTS: COMPONENTS.slice(),
    COMPONENT_STATES: COMPONENT_STATES.slice(),
    OVERALL_STATES: OVERALL_STATES.slice(),
    REQUIRED_COMPONENTS: REQUIRED_COMPONENTS.slice(),
    COMPONENT_LABELS: COMPONENT_LABELS,
    validateHealth: validateHealth,
    assessWallet: assessWallet,
    deriveOverall: deriveOverall,
    summarize: summarize
  };
})(typeof globalThis !== "undefined" ? globalThis :
  (typeof window !== "undefined" ? window : this));
