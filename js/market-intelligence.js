/* MTI6-GTADWIY-COCKPIT — Market Intelligence / Price Confidence
 * (continuous development campaign: Crypto spec C5 — market data)
 *
 * CONFIDENCE + FALLBACK + CONFLICT layer over price data supplied by
 * callers. This module NEVER fetches a price, never holds a secret,
 * never invents a price, and never presents a stale value as live.
 * Prices arrive from callers (fed by the ApiRegistry provider chain);
 * this module validates them, orders them, detects disagreement, and
 * keeps a bounded history.
 *
 * Rules, fail-closed throughout:
 *   - A price value is a finite number > 0, OR the explicit state
 *     "UNKNOWN". Zero, negative, NaN, and Infinity are rejected, never
 *     stored, never returned as a price.
 *   - Confidence is a closed label — "HIGH" | "MEDIUM" | "LOW" |
 *     "UNKNOWN" — never a percentage score. No numeric confidence
 *     score exists anywhere in this module.
 *   - Verification status reuses the Truth vocabulary (js/truth.js,
 *     loaded before this file); nothing is upgraded to VERIFIED here.
 *   - Fallback chain (pure ordering, no fetching), following the
 *     ApiRegistry rule: PRIMARY -> FALLBACK 1 -> FALLBACK 2 ->
 *     KEYLESS/PUBLIC -> CACHE (labelled stale) -> honest error.
 *     The provider slots are the real ApiRegistry crypto chain:
 *     PRIMARY = coingecko, FALLBACK 1 = coinbase,
 *     FALLBACK 2 = coinpaprika, KEYLESS/PUBLIC = any further keyless
 *     public provider (e.g. kraken, the registered alternative).
 *     See cryptoChainSlots() for the live mapping.
 *   - A STALE quote is used only when no fresher quote exists, and is
 *     always marked fallbackState "STALE_CACHE" — never presented as
 *     live.
 *   - A material price conflict (relative difference > 2% between the
 *     top usable quotes — see CONFLICT_THRESHOLD_PCT) is never
 *     resolved by picking the convenient number: resolvePrice returns
 *     { state: "PRICE_CONFLICT", value: null } and the conflict is
 *     recorded in the internal conflict log for callers to resolve.
 *   - History is stored per asset + quote currency, bounded at 200
 *     points, oldest dropped. Historical points are never fabricated:
 *     only points supplied by callers are stored.
 *   - INFORMATIONAL never implies TRANSACTIONAL. A price, however
 *     confident, is not authorization or capability to trade.
 *
 * Depends on js/truth.js only (for the shared truth vocabulary) and
 * reads js/api-registry.js when loaded (for the real provider chain);
 * it works without ApiRegistry, falling back to the same slot names
 * in caller-supplied priority order.
 * Pure functions only: no DOM, no network, no secrets, no storage.
 */
var MarketIntelligence = (function (global) {
  "use strict";

  // ---- Truth vocabulary, reused (never a competing copy) ----
  var TRUTH_STATES = (global.Truth && global.Truth.TRUTH_STATES) ||
    ["NOT_CONNECTED", "UNKNOWN", "UNVERIFIED", "STALE", "DISABLED",
      "UNAVAILABLE", "VERIFIED", "LIVE"];
  var VERIFICATION_STATES = (global.CryptoWorld &&
    global.CryptoWorld.VERIFICATION_STATES) || TRUTH_STATES;

  // ---- Closed vocabularies ----
  var FRESHNESS_STATES = ["FRESH", "AGING", "STALE", "UNKNOWN"];
  var CONFIDENCES = ["HIGH", "MEDIUM", "LOW", "UNKNOWN"];

  // Fallback-chain positions, in the order they are tried.
  var FALLBACK_STATES = ["PRIMARY", "FALLBACK_1", "FALLBACK_2",
    "KEYLESS_PUBLIC", "STALE_CACHE", "UNAVAILABLE"];
  var CONFLICT_STATES = ["NONE", "PRICE_CONFLICT"];

  // Material-disagreement threshold, as a fraction of the lower price:
  // two usable quotes disagree materially when
  //   (max - min) / min > 0.02   (i.e. more than 2% apart).
  // The threshold is relative to the LOWER quote so the same pair of
  // prices always gives the same spread whichever order they arrive
  // in. 2% is a judgement threshold for this module: wide enough that
  // normal cross-provider rounding and timing jitter do not trip it,
  // narrow enough that a genuinely different price is never silently
  // averaged away. It is a conflict flag, never a price adjustment.
  var CONFLICT_THRESHOLD = 0.02;
  var CONFLICT_THRESHOLD_PCT = 2;

  // History bound: per asset + quote currency, oldest dropped first.
  var MAX_HISTORY_POINTS = 200;

  // Conflict-log bound, same rule as history.
  var MAX_CONFLICTS = 200;

  // ---- In-memory stores (per-load only; no persistence here) ----
  var historyStore = {};   // key "assetId|quoteCurrency" -> [points]
  var conflictLog = [];    // recorded PRICE_CONFLICT entries, newest last

  // ---- Helpers ----

  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim() !== "";
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function parseDate(value) {
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function historyKey(assetId, quoteCurrency) {
    return String(assetId) + "|" + String(quoteCurrency);
  }

  // A price value is valid when it is a finite number > 0, or the
  // explicit state "UNKNOWN". Anything else (0, negative, NaN,
  // Infinity, a non-numeric string, missing) is invalid.
  function isValidValue(v) {
    if (v === "UNKNOWN") return true;
    return typeof v === "number" && isFinite(v) && v > 0;
  }

  function isKnownPrice(v) {
    return typeof v === "number" && isFinite(v) && v > 0;
  }

  // ---- Provider chain slots (real ApiRegistry ids, never invented) ----
  // The crypto chain in js/api-registry.js is
  //   ["coingecko", "coinbase", "coinpaprika"]
  // with kraken as the registered keyless alternative. When ApiRegistry
  // is loaded, the mapping below is built from its real chain; when it
  // is not loaded, the same provider ids are used as the fallback, so
  // the slot names never change meaning between environments.
  function cryptoChain() {
    if (global.ApiRegistry && typeof global.ApiRegistry.getChain === "function") {
      var chain = global.ApiRegistry.getChain("crypto");
      if (Array.isArray(chain) && chain.length) return chain.slice();
    }
    return ["coingecko", "coinbase", "coinpaprika"];
  }

  function cryptoChainSlots() {
    var chain = cryptoChain();
    var slots = ["PRIMARY", "FALLBACK_1", "FALLBACK_2"];
    var out = [];
    for (var i = 0; i < chain.length; i++) {
      out.push({
        slot: slots[i] || "KEYLESS_PUBLIC",
        provider: chain[i]
      });
    }
    // The keyless/public slot: any further keyless public provider
    // from the registry (kraken is the registered alternative) or, when
    // the registry is absent, kraken by the same registered name.
    var keyless = "kraken";
    if (global.ApiRegistry && typeof global.ApiRegistry.getEntry === "function") {
      var kraken = global.ApiRegistry.getEntry("kraken");
      if (!kraken) keyless = null;
    }
    if (keyless) out.push({ slot: "KEYLESS_PUBLIC", provider: keyless });
    return out;
  }

  // Slot for a provider id from the real chain; unknown providers get
  // no chain slot (null) so callers fall back to position order.
  function chainSlotForProvider(provider) {
    var slots = cryptoChainSlots();
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].provider === provider) return slots[i].slot;
    }
    return null;
  }

  // Slot for a quote by its position in the caller's priority order.
  function positionSlot(index) {
    if (index === 0) return "PRIMARY";
    if (index === 1) return "FALLBACK_1";
    if (index === 2) return "FALLBACK_2";
    return "KEYLESS_PUBLIC";
  }

  function slotForQuote(quote, index) {
    var chainSlot = isNonEmptyString(quote.provider) ?
      chainSlotForProvider(quote.provider) : null;
    return chainSlot || positionSlot(index);
  }

  // ---- Confidence ----
  // Default confidence derived from freshness + verification only, and
  // only when the caller does not supply one. A supplied confidence is
  // kept as-is (after validation). The derivation is deliberately
  // conservative: freshness alone never earns HIGH, and STALE never
  // earns better than LOW.
  function deriveConfidence(freshness, verificationStatus) {
    if (freshness === "FRESH" && verificationStatus === "VERIFIED") return "HIGH";
    if (freshness === "FRESH") return "MEDIUM";
    if (freshness === "AGING" && verificationStatus === "VERIFIED") return "MEDIUM";
    if (freshness === "AGING") return "LOW";
    if (freshness === "STALE") return "LOW";
    return "UNKNOWN";
  }

  // ---- Validation ----
  // Strict gate for a price record input. Returns an array of error
  // strings; an empty array means the input passes. Does not throw,
  // never fabricates, never accepts a secret field.
  function validatePrice(input) {
    var errors = [];
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return ["Price input must be an object."];
    }
    if (!isNonEmptyString(input.assetId)) {
      errors.push("A price needs an assetId.");
    }
    if (!isNonEmptyString(input.quoteCurrency)) {
      errors.push("A price needs a quoteCurrency.");
    }
    if (input.value === undefined) {
      errors.push("A price needs a value (a finite number > 0, or the explicit state UNKNOWN).");
    } else if (!isValidValue(input.value)) {
      errors.push("Price value must be a finite number > 0 or the explicit state UNKNOWN; got " + String(input.value) + ".");
    }
    if (!isNonEmptyString(input.source)) {
      errors.push("A price needs a source.");
    }
    if (!input.observedAt) {
      errors.push("A price needs an observedAt timestamp.");
    } else if (!parseDate(input.observedAt)) {
      errors.push("observedAt is not a parseable timestamp: " + String(input.observedAt) + ".");
    }
    if (input.freshness !== undefined &&
        FRESHNESS_STATES.indexOf(input.freshness) === -1) {
      errors.push("Unknown freshness: " + input.freshness +
        " (use FRESH, AGING, STALE, or UNKNOWN).");
    }
    if (input.verificationStatus !== undefined &&
        VERIFICATION_STATES.indexOf(input.verificationStatus) === -1 &&
        TRUTH_STATES.indexOf(input.verificationStatus) === -1) {
      errors.push("Unknown verificationStatus: " + input.verificationStatus + ".");
    }
    if (input.confidence !== undefined &&
        CONFIDENCES.indexOf(input.confidence) === -1) {
      errors.push("Unknown confidence: " + input.confidence +
        " (use HIGH, MEDIUM, LOW, or UNKNOWN — never a percentage score).");
    }
    if (input.fallbackState !== undefined &&
        FALLBACK_STATES.indexOf(input.fallbackState) === -1) {
      errors.push("Unknown fallbackState: " + input.fallbackState + ".");
    }
    if (input.conflictState !== undefined &&
        CONFLICT_STATES.indexOf(input.conflictState) === -1) {
      errors.push("Unknown conflictState: " + input.conflictState + ".");
    }
    // A VERIFIED price needs provenance it already must carry (source
    // + observedAt are required above); a VERIFIED claim on a STALE
    // price is downgraded, never trusted as live.
    if (input.verificationStatus === "VERIFIED" && input.freshness === "STALE") {
      errors.push("A STALE price cannot claim VERIFIED: stale data is not verified-live.");
    }
    return errors;
  }

  // A quote inside resolvePrice / detectConflict carries the same
  // price fields, minus the record-level bookkeeping. provider is
  // required here: an anonymous quote cannot be placed in the chain.
  function validateQuote(quote, where) {
    var errors = validatePrice(quote || {});
    if (!quote || typeof quote !== "object") return errors;
    if (!isNonEmptyString(quote.provider)) {
      errors.push((where || "quote") + " needs a provider (the ApiRegistry provider id).");
    }
    return errors;
  }

  // ---- Price records ----

  function recordPrice(input) {
    var errors = validatePrice(input || {});
    if (errors.length) return { ok: false, errors: errors };
    var freshness = input.freshness || "UNKNOWN";
    var verificationStatus = input.verificationStatus || "UNVERIFIED";
    var confidence = input.confidence ||
      deriveConfidence(freshness, verificationStatus);
    var observedAt = parseDate(input.observedAt).toISOString();
    var record = {
      priceId: isNonEmptyString(input.priceId) ? String(input.priceId) :
        String(input.assetId) + ":" + String(input.quoteCurrency) + ":" + observedAt,
      assetId: String(input.assetId),
      quoteCurrency: String(input.quoteCurrency),
      value: input.value,
      source: String(input.source),
      observedAt: observedAt,
      receivedAt: new Date().toISOString(),
      freshness: freshness,
      verificationStatus: verificationStatus,
      confidence: confidence,
      fallbackState: input.fallbackState || "PRIMARY",
      conflictState: input.conflictState || "NONE"
    };
    if (isNonEmptyString(input.provider)) record.provider = String(input.provider);
    return { ok: true, record: record };
  }

  // ---- Usability tiers (pure ordering, no fetching) ----
  // Tier 1 (live-usable): FRESH, or AGING with verificationStatus
  // VERIFIED. Tier 2 (last resort only): STALE. UNKNOWN freshness
  // cannot be judged, so it is never usable as a price — fail closed.
  function usabilityTier(quote) {
    if (!quote || !isKnownPrice(quote.value)) return null;
    if (quote.freshness === "FRESH") return 1;
    if (quote.freshness === "AGING" && quote.verificationStatus === "VERIFIED") return 1;
    if (quote.freshness === "STALE") return 2;
    return null;
  }

  // ---- Conflict detection ----
  // Relative spread between the lowest and highest usable quotes:
  //   spread = (max - min) / min
  // A material conflict is spread > CONFLICT_THRESHOLD (2%). The
  // comparison uses only tier-1 usable quotes (FRESH, or AGING +
  // VERIFIED): STALE quotes are never "top usable quotes", and UNKNOWN
  // freshness is never usable. When fewer than two tier-1 quotes
  // exist there is nothing to compare, so no conflict.
  function detectConflict(quotes) {
    var list = Array.isArray(quotes) ? quotes : [];
    var usable = [];
    list.forEach(function (q) {
      if (usabilityTier(q) === 1) usable.push(q);
    });
    if (usable.length < 2) {
      return {
        conflict: false,
        state: "INSUFFICIENT_QUOTES",
        spread: null,
        threshold: CONFLICT_THRESHOLD,
        thresholdPct: CONFLICT_THRESHOLD_PCT,
        quotes: clone(usable)
      };
    }
    var min = usable[0].value;
    var max = usable[0].value;
    usable.forEach(function (q) {
      if (q.value < min) min = q.value;
      if (q.value > max) max = q.value;
    });
    var spread = (max - min) / min;
    var result = {
      conflict: spread > CONFLICT_THRESHOLD,
      state: spread > CONFLICT_THRESHOLD ? "PRICE_CONFLICT" : "NO_CONFLICT",
      spread: spread,
      threshold: CONFLICT_THRESHOLD,
      thresholdPct: CONFLICT_THRESHOLD_PCT,
      quotes: clone(usable)
    };
    if (result.conflict) {
      // The conflict is recorded, with the asset/currency taken from
      // the first usable quote. Callers must resolve it; this module
      // never picks a side.
      var entry = {
        recordedAt: new Date().toISOString(),
        assetId: usable[0].assetId || null,
        quoteCurrency: usable[0].quoteCurrency || null,
        state: "PRICE_CONFLICT",
        spread: spread,
        threshold: CONFLICT_THRESHOLD,
        quotes: clone(usable)
      };
      conflictLog.push(entry);
      if (conflictLog.length > MAX_CONFLICTS) {
        conflictLog = conflictLog.slice(conflictLog.length - MAX_CONFLICTS);
      }
      result.recorded = true;
    }
    return result;
  }

  function listConflicts() {
    return clone(conflictLog);
  }

  function clearConflicts() {
    conflictLog = [];
    return true;
  }

  // ---- Fallback resolution (pure ordering, no fetching) ----
  // quotes: array of { provider, value, source, observedAt, freshness,
  // verificationStatus, ... } in priority order (ApiRegistry crypto
  // chain order: coingecko -> coinbase -> coinpaprika -> keyless/public).
  // Returns one of:
  //   { state: "FRESH", value, provider, source, observedAt, freshness,
  //     verificationStatus, confidence, fallbackState, conflictState: "NONE" }
  //   { state: "STALE_CACHE", value, ... fallbackState: "STALE_CACHE",
  //     conflictState: "NONE" }   — only when no fresher quote exists
  //   { state: "PRICE_CONFLICT", value: null, ... } — top usable quotes
  //     disagree materially; callers must resolve it, not this module
  //   { state: "UNAVAILABLE", value: null } — no usable quote at all
  // A stale value is never presented as live, and a price is never
  // fabricated to fill the gap.
  function resolvePrice(assetId, quoteCurrency, quotes) {
    if (!isNonEmptyString(assetId)) {
      return { state: "UNAVAILABLE", value: null,
        reason: "resolvePrice needs an assetId." };
    }
    if (!isNonEmptyString(quoteCurrency)) {
      return { state: "UNAVAILABLE", value: null,
        reason: "resolvePrice needs a quoteCurrency." };
    }
    var list = Array.isArray(quotes) ? quotes : [];
    var tier1 = [];
    var stale = [];
    list.forEach(function (q, i) {
      if (!q || typeof q !== "object") return;
      var tier = usabilityTier(q);
      if (tier === 1) tier1.push({ quote: q, index: i });
      else if (tier === 2) stale.push({ quote: q, index: i });
    });

    if (tier1.length) {
      // Material conflict among the top usable quotes: refuse to pick
      // a number. The conflict is recorded by detectConflict.
      var conflict = detectConflict(tier1.map(function (t) { return t.quote; }));
      if (conflict.conflict) {
        return {
          state: "PRICE_CONFLICT",
          value: null,
          assetId: String(assetId),
          quoteCurrency: String(quoteCurrency),
          spread: conflict.spread,
          threshold: CONFLICT_THRESHOLD,
          thresholdPct: CONFLICT_THRESHOLD_PCT,
          quotes: conflict.quotes,
          fallbackState: "UNAVAILABLE",
          conflictState: "PRICE_CONFLICT",
          reason: "Usable quotes disagree by more than " +
            CONFLICT_THRESHOLD_PCT + "%; no price is chosen."
        };
      }
      var best = tier1[0];
      var q = best.quote;
      var freshness = q.freshness || "UNKNOWN";
      var verificationStatus = q.verificationStatus || "UNVERIFIED";
      return {
        state: "FRESH",
        value: q.value,
        assetId: String(assetId),
        quoteCurrency: String(quoteCurrency),
        provider: q.provider || null,
        source: q.source || null,
        observedAt: q.observedAt || null,
        freshness: freshness,
        verificationStatus: verificationStatus,
        confidence: q.confidence || deriveConfidence(freshness, verificationStatus),
        fallbackState: slotForQuote(q, best.index),
        conflictState: "NONE"
      };
    }

    if (stale.length) {
      var sq = stale[0].quote;
      var sFreshness = sq.freshness || "STALE";
      var sVerification = sq.verificationStatus || "UNVERIFIED";
      return {
        state: "STALE_CACHE",
        value: sq.value,
        assetId: String(assetId),
        quoteCurrency: String(quoteCurrency),
        provider: sq.provider || null,
        source: sq.source || null,
        observedAt: sq.observedAt || null,
        freshness: sFreshness,
        verificationStatus: sVerification,
        confidence: sq.confidence || deriveConfidence(sFreshness, sVerification),
        fallbackState: "STALE_CACHE",
        conflictState: "NONE",
        reason: "No fresh quote available; returning the newest stale quote, labelled STALE_CACHE."
      };
    }

    return {
      state: "UNAVAILABLE",
      value: null,
      assetId: String(assetId),
      quoteCurrency: String(quoteCurrency),
      fallbackState: "UNAVAILABLE",
      conflictState: "NONE",
      reason: "No usable quote: no FRESH or AGING+VERIFIED quote and no STALE quote to fall back to."
    };
  }

  // ---- Price history ----
  // points: [{ value, observedAt, source }] — same validation as a
  // price record (value finite > 0 or UNKNOWN; source + observedAt
  // required). Only caller-supplied points are stored; nothing is
  // fabricated. Bounded at MAX_HISTORY_POINTS (200) per asset +
  // currency, oldest dropped first. Returns { ok, count, dropped } or
  // { ok: false, errors }.
  function recordPriceHistory(assetId, quoteCurrency, points) {
    if (!isNonEmptyString(assetId)) {
      return { ok: false, errors: ["Price history needs an assetId."] };
    }
    if (!isNonEmptyString(quoteCurrency)) {
      return { ok: false, errors: ["Price history needs a quoteCurrency."] };
    }
    if (!Array.isArray(points)) {
      return { ok: false, errors: ["Price history points must be an array."] };
    }
    var errors = [];
    var valid = [];
    points.forEach(function (p, i) {
      var where = "points[" + i + "]";
      var pointErrors = [];
      if (!p || typeof p !== "object" || Array.isArray(p)) {
        pointErrors.push(where + " must be an object.");
      } else {
        if (p.value === undefined) {
          pointErrors.push(where + " needs a value (a finite number > 0, or the explicit state UNKNOWN).");
        } else if (!isValidValue(p.value)) {
          pointErrors.push(where + " value must be a finite number > 0 or the explicit state UNKNOWN; got " + String(p.value) + ".");
        }
        if (!isNonEmptyString(p.source)) {
          pointErrors.push(where + " needs a source.");
        }
        if (!p.observedAt) {
          pointErrors.push(where + " needs an observedAt timestamp.");
        } else if (!parseDate(p.observedAt)) {
          pointErrors.push(where + " observedAt is not a parseable timestamp: " + String(p.observedAt) + ".");
        }
      }
      if (pointErrors.length) {
        errors = errors.concat(pointErrors);
      } else {
        valid.push({
          value: p.value,
          observedAt: parseDate(p.observedAt).toISOString(),
          source: String(p.source)
        });
      }
    });
    if (errors.length) return { ok: false, errors: errors };
    var key = historyKey(assetId, quoteCurrency);
    var existing = historyStore[key] || [];
    var combined = existing.concat(valid);
    var dropped = 0;
    if (combined.length > MAX_HISTORY_POINTS) {
      dropped = combined.length - MAX_HISTORY_POINTS;
      combined = combined.slice(combined.length - MAX_HISTORY_POINTS);
    }
    historyStore[key] = combined;
    return {
      ok: true,
      assetId: String(assetId),
      quoteCurrency: String(quoteCurrency),
      count: combined.length,
      dropped: dropped
    };
  }

  function getPriceHistory(assetId, quoteCurrency) {
    if (!isNonEmptyString(assetId) || !isNonEmptyString(quoteCurrency)) return [];
    var stored = historyStore[historyKey(assetId, quoteCurrency)];
    return stored ? clone(stored) : [];
  }

  function clearPriceHistory(assetId, quoteCurrency) {
    if (isNonEmptyString(assetId) && isNonEmptyString(quoteCurrency)) {
      delete historyStore[historyKey(assetId, quoteCurrency)];
    } else {
      historyStore = {};
    }
    return true;
  }

  var api = {
    FRESHNESS_STATES: FRESHNESS_STATES,
    CONFIDENCES: CONFIDENCES,
    FALLBACK_STATES: FALLBACK_STATES,
    CONFLICT_STATES: CONFLICT_STATES,
    CONFLICT_THRESHOLD: CONFLICT_THRESHOLD,
    CONFLICT_THRESHOLD_PCT: CONFLICT_THRESHOLD_PCT,
    MAX_HISTORY_POINTS: MAX_HISTORY_POINTS,
    MAX_CONFLICTS: MAX_CONFLICTS,
    TRUTH_STATES: TRUTH_STATES,
    VERIFICATION_STATES: VERIFICATION_STATES,
    validatePrice: validatePrice,
    validateQuote: validateQuote,
    recordPrice: recordPrice,
    deriveConfidence: deriveConfidence,
    cryptoChain: cryptoChain,
    cryptoChainSlots: cryptoChainSlots,
    chainSlotForProvider: chainSlotForProvider,
    resolvePrice: resolvePrice,
    detectConflict: detectConflict,
    listConflicts: listConflicts,
    clearConflicts: clearConflicts,
    recordPriceHistory: recordPriceHistory,
    getPriceHistory: getPriceHistory,
    clearPriceHistory: clearPriceHistory
  };

  global.MarketIntelligence = api;
  return api;
})(typeof globalThis !== "undefined" ? globalThis :
  (typeof window !== "undefined" ? window : this));
