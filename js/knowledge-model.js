/* MTI6-GTADWIY-COCKPIT — Knowledge object model (overnight shift, Priority 1)
 *
 * Extends the existing saved-knowledge store (localStorage key
 * mti6_knowledge_v1, owned by js/knowledge.js / KnowledgeScout). This
 * file adds a model layer on top of that store; it does NOT create a
 * new localStorage key, a new IndexedDB store, or any network call,
 * and it invents no knowledge, sources, or conclusions.
 *
 * Rules, fail-closed throughout:
 *   - normalizeKnowledge() returns an enriched VIEW and never mutates
 *     the stored record. Old-shape entries (no verificationStatus,
 *     confidence, sourceType) load fine.
 *   - Nothing is upgraded to VERIFIED by this file: VERIFIED survives
 *     normalisation only when the entry already claims VERIFIED and
 *     carries a source AND a lastChecked/fetchedAt timestamp. A
 *     VERIFIED claim without those is downgraded to UNVERIFIED.
 *   - STALE is derived from age, never asserted: fetchedAt older than
 *     30 days (or the caller's maxAgeDays) makes kind and
 *     verificationStatus STALE.
 *   - validateKnowledgeEntry() rejects secret-looking fields, a
 *     VERIFIED claim without source + timestamp, and unknown
 *     verificationStatus/kind values.
 *   - Retrieval helpers wrap KnowledgeScout when it is loaded and
 *     return normalised views. When it is absent they return [] and
 *     report state NOT_CONNECTED — never throw, never fabricate.
 *   - Threat knowledge never becomes transactional (see Truth).
 *     Knowing a technique is not authorization or capability.
 */
(function (global) {
  "use strict";

  var DEFAULT_MAX_AGE_DAYS = 30;
  var FRESH_DAYS = 7;
  var CONFIDENCES = ["low", "medium", "high"];

  // Legacy storage kinds written by js/knowledge.js before this model
  // existed ("scraped" is the default kind there). Accepted by the
  // validator for backward compatibility only; normalisation maps
  // them to UNVERIFIED, never to a verified kind.
  var LEGACY_KINDS = ["scraped"];

  var SECRET_KEY_PARTS = ["seed", "mnemonic", "privatekey", "private_key",
    "apikey", "api_key", "apisecret", "password", "secret"];

  function truth() { return global.Truth || null; }

  function knownVerificationStates() {
    var states = [];
    if (global.CryptoWorld && global.CryptoWorld.VERIFICATION_STATES) {
      states = states.concat(global.CryptoWorld.VERIFICATION_STATES);
    }
    var t = truth();
    if (t && t.TRUTH_STATES) states = states.concat(t.TRUTH_STATES);
    if (!states.length) {
      states = ["UNKNOWN", "DISCOVERED", "UNVERIFIED", "VERIFIED", "STALE",
        "UNAVAILABLE", "NOT_CONNECTED", "DISABLED", "LIVE"];
    }
    return states;
  }

  function knownKinds() {
    var t = truth();
    if (t && t.KNOWLEDGE_KINDS) return t.KNOWLEDGE_KINDS;
    return ["FACT", "OBSERVATION", "DISCOVERY", "UNVERIFIED", "VERIFIED",
      "STALE", "UNAVAILABLE", "NOT_CONNECTED", "OWNER_DECISION",
      "SYSTEM_RULE", "THREAT", "DEFENSE"];
  }

  function asArray(value) {
    if (Array.isArray(value)) return value.slice();
    return [];
  }

  function parseDate(value) {
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function ageDays(entry) {
    var d = parseDate((entry && (entry.fetchedAt || entry.lastChecked)) || null);
    if (!d) return null;
    return (Date.now() - d.getTime()) / 86400000;
  }

  function isStale(entry, maxAgeDays) {
    var max = (maxAgeDays === undefined || maxAgeDays === null) ?
      DEFAULT_MAX_AGE_DAYS : Number(maxAgeDays);
    if (!(max >= 0)) max = DEFAULT_MAX_AGE_DAYS;
    var age = ageDays(entry);
    // Unknown age is not stale, it is unknown — see classifyFreshness.
    if (age === null) return false;
    return age > max;
  }

  function classifyFreshness(entry, maxAgeDays) {
    var age = ageDays(entry);
    if (age === null) return "unknown";
    if (isStale(entry, maxAgeDays)) return "stale";
    if (age <= FRESH_DAYS) return "fresh";
    return "aging";
  }

  function freshnessLabel(entry, maxAgeDays) {
    var f = classifyFreshness(entry, maxAgeDays);
    if (f === "fresh") return "Fresh";
    if (f === "aging") return "Aging";
    if (f === "stale") return "Stale";
    return "Unknown age";
  }

  // Enriched VIEW of a stored entry. Never mutates its argument.
  // Old-shape entries (no new fields) normalise without throwing.
  function normalizeKnowledge(entry) {
    var raw = (entry && typeof entry === "object") ? entry : {};
    var source = raw.source ? String(raw.source) : "";
    var fetchedAt = raw.fetchedAt || raw.lastChecked || "";
    var hasTimestamp = !!parseDate(fetchedAt);
    var stale = isStale(raw, DEFAULT_MAX_AGE_DAYS);

    // VERIFIED survives only with source + timestamp; never upgraded.
    var verificationStatus = "UNVERIFIED";
    if (raw.verificationStatus === "VERIFIED" && source && hasTimestamp) {
      verificationStatus = "VERIFIED";
    } else if (typeof raw.verificationStatus === "string" &&
        knownVerificationStates().indexOf(raw.verificationStatus) !== -1 &&
        raw.verificationStatus !== "VERIFIED") {
      verificationStatus = raw.verificationStatus;
    }
    if (stale) verificationStatus = "STALE";

    // Kind: the entry's kind when it is a known kind, else UNVERIFIED.
    // Legacy storage kinds (e.g. "scraped") are not knowledge kinds.
    var kind = "UNVERIFIED";
    if (typeof raw.kind === "string") {
      var upperKind = raw.kind.toUpperCase();
      if (knownKinds().indexOf(upperKind) !== -1) kind = upperKind;
    }
    if (stale) kind = "STALE";
    else if (verificationStatus === "VERIFIED" && kind === "UNVERIFIED") {
      kind = "VERIFIED";
    }

    var confidence = "unknown";
    if (typeof raw.confidence === "string" &&
        CONFIDENCES.indexOf(raw.confidence.toLowerCase()) !== -1) {
      confidence = raw.confidence.toLowerCase();
    }

    var relationships = asArray(raw.relationships).map(function (r) {
      if (r && typeof r === "object") {
        return { id: String(r.id || ""), label: String(r.label || r.id || "") };
      }
      return { id: String(r || ""), label: String(r || "") };
    }).filter(function (r) { return r.id !== ""; });

    var taxonomyRefs = asArray(raw.taxonomyRefs).map(function (v) {
      return String(v);
    });

    // Shallow-copy the stored fields, then overlay the enriched model.
    // The stored record itself is never written to here.
    var view = {};
    Object.keys(raw).forEach(function (k) { view[k] = raw[k]; });
    view.verificationStatus = verificationStatus;
    view.kind = kind;
    view.confidence = confidence;
    view.sourceType = raw.sourceType ||
      (raw.kind === "scraped" ? "page-scrape" : (source || "unknown"));
    view.provenance = {
      source: source,
      url: raw.url ? String(raw.url) : "",
      fetchedAt: fetchedAt ? String(fetchedAt) : "",
      sourceType: view.sourceType
    };
    view.taxonomyRefs = taxonomyRefs;
    view.relationships = relationships;
    view.freshness = classifyFreshness(raw, DEFAULT_MAX_AGE_DAYS);
    view.freshnessLabel = freshnessLabel(raw, DEFAULT_MAX_AGE_DAYS);
    return view;
  }

  function isSecretKey(key) {
    var k = String(key || "").toLowerCase().replace(/[-_]/g, "");
    for (var i = 0; i < SECRET_KEY_PARTS.length; i++) {
      var part = SECRET_KEY_PARTS[i].replace(/[-_]/g, "");
      if (k.indexOf(part) !== -1) return true;
    }
    return false;
  }

  // Strict gate for new/edited entries. Returns an array of error
  // strings; an empty array means the entry passes. Does not throw.
  function validateKnowledgeEntry(entry) {
    var errors = [];
    if (!entry || typeof entry !== "object") {
      return ["Knowledge entry must be an object."];
    }
    Object.keys(entry).forEach(function (k) {
      if (isSecretKey(k)) {
        errors.push("Secret-looking field not allowed in a knowledge entry: " + k + ".");
      }
    });
    if (entry.verificationStatus !== undefined) {
      if (knownVerificationStates().indexOf(entry.verificationStatus) === -1) {
        errors.push("Unknown verification status: " + entry.verificationStatus + ".");
      }
    }
    if (entry.kind !== undefined) {
      var upperKind = String(entry.kind).toUpperCase();
      if (knownKinds().indexOf(upperKind) === -1 &&
          LEGACY_KINDS.indexOf(String(entry.kind).toLowerCase()) === -1) {
        errors.push("Unknown knowledge kind: " + entry.kind + ".");
      }
    }
    if (entry.confidence !== undefined &&
        CONFIDENCES.indexOf(String(entry.confidence).toLowerCase()) === -1 &&
        String(entry.confidence).toLowerCase() !== "unknown") {
      errors.push("Unknown confidence: " + entry.confidence + " (use low, medium, high, or unknown).");
    }
    // A VERIFIED claim needs a source and a last-checked timestamp
    // (fetchedAt is this store's last-checked timestamp). Without
    // both, the claim is rejected, never silently accepted.
    if (entry.verificationStatus === "VERIFIED") {
      if (!entry.source) {
        errors.push("A VERIFIED knowledge entry needs a source.");
      }
      if (!entry.lastChecked && !entry.fetchedAt) {
        errors.push("A VERIFIED knowledge entry needs a lastChecked/fetchedAt timestamp.");
      }
    }
    if (entry.taxonomyRefs !== undefined && !Array.isArray(entry.taxonomyRefs)) {
      errors.push("taxonomyRefs must be an array.");
    }
    if (entry.relationships !== undefined && !Array.isArray(entry.relationships)) {
      errors.push("relationships must be an array.");
    }
    return errors;
  }

  function formatDate(value) {
    var d = parseDate(value);
    if (!d) return "unknown date";
    try { return d.toISOString().slice(0, 10); } catch (e) { return String(value); }
  }

  // Truthful citation for STAR / search: topic, source, fetch date,
  // verification status. No source recorded means no citation to give.
  function cite(entry) {
    var view = normalizeKnowledge(entry);
    if (!view.provenance.source) return "UNKNOWN — no source recorded";
    var topic = view.topic ? String(view.topic) : "Untitled";
    return topic + " — " + view.provenance.source +
      ", fetched " + formatDate(view.provenance.fetchedAt) +
      ", status " + view.verificationStatus;
  }

  // ---- Retrieval: wrap KnowledgeScout, never throw, never fabricate --
  var lastRetrievalState = "NOT_CONNECTED";

  function getRetrievalState() { return lastRetrievalState; }

  function scout() {
    if (global.KnowledgeScout &&
        typeof global.KnowledgeScout.searchKnowledge === "function" &&
        typeof global.KnowledgeScout.listKnowledge === "function") {
      return global.KnowledgeScout;
    }
    return null;
  }

  function searchKnowledge(query) {
    var s = scout();
    if (!s) { lastRetrievalState = "NOT_CONNECTED"; return []; }
    try {
      var hits = s.searchKnowledge(query) || [];
      lastRetrievalState = "OK";
      return (Array.isArray(hits) ? hits : []).map(normalizeKnowledge);
    } catch (e) {
      lastRetrievalState = "UNAVAILABLE";
      return [];
    }
  }

  function listKnowledge() {
    var s = scout();
    if (!s) { lastRetrievalState = "NOT_CONNECTED"; return []; }
    try {
      var all = s.listKnowledge() || [];
      lastRetrievalState = "OK";
      return (Array.isArray(all) ? all : []).map(normalizeKnowledge);
    } catch (e) {
      lastRetrievalState = "UNAVAILABLE";
      return [];
    }
  }

  global.KnowledgeModel = {
    normalizeKnowledge: normalizeKnowledge,
    validateKnowledgeEntry: validateKnowledgeEntry,
    cite: cite,
    isStale: isStale,
    classifyFreshness: classifyFreshness,
    freshnessLabel: freshnessLabel,
    searchKnowledge: searchKnowledge,
    listKnowledge: listKnowledge,
    getRetrievalState: getRetrievalState,
    DEFAULT_MAX_AGE_DAYS: DEFAULT_MAX_AGE_DAYS,
    CONFIDENCES: CONFIDENCES,
    LEGACY_KINDS: LEGACY_KINDS
  };
})(window);
