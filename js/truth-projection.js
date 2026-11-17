/* MTI6-GTADWIY-COCKPIT — World Engine Truth Projection (contract §4)
 *
 * Unified Truth Mapping — one pure translation module (§66 step 5).
 * Maps every existing truth vocabulary into ONE unified vocabulary,
 * by mapping only — never by renaming, never by rewriting a stored
 * value. Each module keeps its own stored/lifecycle values exactly
 * as today; this module computes the cross-system projection at
 * read time. It is never written back into stored records.
 *
 * Contract source: papers/files/world-engine-contract-proposal.md
 * §4.4 (mapping tables, total — every existing value maps exactly
 * once) and §4.5 (standing rules). §66 Ruling 2.
 *
 * STALE / CONFLICTED — emission gate (§4.5 rule 2, §4.3):
 * Both states are vocabulary-complete but are NEVER emitted by this
 * projection, because no staleness or conflict computation exists
 * inside it. The §4.4 table row "STALE → STALE" is conditional on a
 * real staleness computation having produced the stored value, and
 * §4.1 records that no such computation exists for canonical
 * records. A stored STALE therefore projects as UNKNOWN with
 * subReason "STALE" and emissionGated true, the original preserved
 * in `original` — no information destroyed, nothing emitted without
 * measurement. CONFLICTED exists in no source vocabulary, so no
 * input maps to it. The one measured CONFLICTED in the codebase
 * (js/provider-router.js corroboration) stays in its own domain and
 * is not re-emitted here.
 *
 * Promotion rule (§4.5 rule 1): the projection only translates,
 * never promotes. No mapping turns an unverified source value into
 * VERIFIED, except the AngelSecurity CONFIRMED-and-beyond rows,
 * which verify the ALERT RECORD ITSELF through its recorded
 * lifecycle transitions — never any entity the alert concerns.
 *
 * Contract bugs (§4.5 rule 3): a value with no mapping is surfaced
 * as UNKNOWN with contractBug: true — never silently dropped and
 * never guessed. A bare value with no declared source vocabulary
 * is UNKNOWN for the same reason (the dispatcher requires the
 * caller to name the source vocabulary).
 *
 * Pure functions only: no DOM, no network, no secrets, no storage.
 * Same discipline as js/truth.js.
 */
(function (global) {
  "use strict";

  // Unified vocabulary (§4.3) — the projection's value set.
  var UNIFIED_STATES = ["VERIFIED", "UNVERIFIED", "DISCOVERED",
    "CANDIDATE", "PREPARED", "REJECTED", "REGISTERED", "STALE",
    "CONFLICTED", "UNKNOWN", "NOT_CONNECTED", "NO_DATA", "NO_ALERTS",
    "DISABLED", "LIVE"];

  // SIMULATED is a state LAYER (§4.4, opportunity table; spec §18),
  // not a truth state: simulation results project as UNVERIFIED +
  // layer SIMULATED, never as observed reality.
  var STATE_LAYERS = ["SIMULATED"];

  var SOURCE_VOCABULARIES = ["verification", "truth", "candidate",
    "alert", "layer", "opportunity"];

  // Source vocabularies as they exist in the v100 code (used by the
  // harness for totality; the tables below are written against them).
  // CryptoWorld.VERIFICATION_STATES: UNKNOWN, DISCOVERED, UNVERIFIED,
  // VERIFIED, STALE, UNAVAILABLE, NOT_CONNECTED, DISABLED.
  // Truth.TRUTH_STATES: NOT_CONNECTED, UNKNOWN, UNVERIFIED, STALE,
  // DISABLED, UNAVAILABLE, VERIFIED, LIVE.
  // EntityCandidates STAGES: DISCOVERED, IDENTIFIED, DEDUPED,
  // CLASSIFIED, RESOLVED, MAPPED, PREPARED; TERMINAL_STAGES:
  // REJECTED, DUPLICATE; gate states: FROZEN, GATED, REGISTERED.
  // AngelSecurity ALERT_STATES: DETECTED, VERIFYING, CONFIRMED,
  // ACTIVE, MITIGATING, RESOLVED, POST_INCIDENT_REVIEW.
  // GlobeIntelligence LAYER_STATES: NOT_LOADED, NOT_CONNECTED,
  // NO_DATA, NO_ALERTS, ACTIVE, UNVERIFIED, DISABLED.
  // OpportunityIntelligence PIPELINE_STATES: DISCOVERED, IDENTIFIED,
  // DATA_VERIFIED, ELIGIBILITY_CHECKED, GROSS_ESTIMATED,
  // COSTS_ESTIMATED, RISK_ANALYZED, DEPENDENCIES_CHECKED,
  // FRESHNESS_CHECKED, SIMULATED, RANKED, RECOMMENDED, PREPARED.

  function result(state, original, source, extra) {
    var r = { state: state, original: original, source: source,
      contractBug: false };
    if (extra) {
      var k;
      for (k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) r[k] = extra[k];
      }
    }
    return r;
  }

  function unknown(original, source, extra) {
    var e = extra || {};
    e.contractBug = true;
    return result("UNKNOWN", original, source, e);
  }

  // A stored STALE with no measured basis behind it: never emitted.
  // The original is preserved in `original` and named in subReason.
  function gatedStale(original, source) {
    return result("UNKNOWN", original, source,
      { subReason: "STALE", emissionGated: true });
  }

  function isString(v) {
    return typeof v === "string" && v.length > 0;
  }

  // ---- From CryptoWorld.VERIFICATION_STATES / stored
  // verificationStatus (§4.4 table 1) ------------------------------
  //
  // UNAVAILABLE → NO_DATA: the stored value is retained (in
  // `original`) and the projection normalizes it to NO_DATA — no
  // information destroyed, one cross-system word gained.
  function projectVerificationStatus(value) {
    if (!isString(value)) return unknown(value, "verification");
    switch (value) {
      case "VERIFIED": return result("VERIFIED", value, "verification");
      case "UNVERIFIED": return result("UNVERIFIED", value, "verification");
      case "DISCOVERED": return result("DISCOVERED", value, "verification");
      case "STALE": return gatedStale(value, "verification");
      case "UNKNOWN": return result("UNKNOWN", value, "verification");
      case "NOT_CONNECTED": return result("NOT_CONNECTED", value, "verification");
      case "DISABLED": return result("DISABLED", value, "verification");
      case "UNAVAILABLE": return result("NO_DATA", value, "verification");
      default: return unknown(value, "verification");
    }
  }

  // ---- From js/truth.js TRUTH_STATES (§4.4 table 2) --------------
  //
  // Identical to the verification table, plus LIVE → LIVE. A fresh
  // live check is a real, distinct state — dropping it would lose
  // information.
  function projectTruthState(value) {
    if (!isString(value)) return unknown(value, "truth");
    if (value === "LIVE") return result("LIVE", value, "truth");
    var v = projectVerificationStatus(value);
    v.source = "truth";
    return v;
  }

  // ---- From candidate pipelineStage + gate states (§4.4 table 3) --
  //
  // Pipeline stages are a lifecycle, not a truth state: the
  // projection maps stage → unified state as the candidate's
  // cross-system truth, while the candidate's own truthState field
  // stays UNVERIFIED at every stage (carried in the result).
  // Terminal stages take precedence over gate state: a REJECTED or
  // DUPLICATE candidate can never enter the gate, so no gate state
  // can override a terminal stage. REGISTERED is the gate's terminal
  // success event; after it, the promoted record projects from its
  // stored verificationStatus, not from the candidate stage.
  var CANDIDATE_MAP = {
    DISCOVERED: "DISCOVERED",
    IDENTIFIED: "CANDIDATE",
    DEDUPED: "CANDIDATE",
    CLASSIFIED: "CANDIDATE",
    RESOLVED: "CANDIDATE",
    MAPPED: "CANDIDATE",
    PREPARED: "PREPARED",
    REJECTED: "REJECTED"
  };

  function projectCandidateStage(stage, gateState) {
    if (!isString(stage)) {
      return unknown(stage, "candidate",
        { gateState: gateState === undefined ? null : gateState,
          truthState: "UNVERIFIED" });
    }
    var base = { gateState: gateState === undefined ? null : gateState,
      truthState: "UNVERIFIED" };
    if (stage === "DUPLICATE") {
      base.subReason = "DUPLICATE";
      return result("REJECTED", stage, "candidate", base);
    }
    if (CANDIDATE_MAP.hasOwnProperty(stage)) {
      // A terminal REJECTED stage is final; gate bookkeeping cannot
      // move it. Non-terminal stages follow the gate state.
      if (stage !== "REJECTED" && gateState === "REGISTERED") {
        return result("REGISTERED", stage, "candidate", base);
      }
      if (stage !== "REJECTED" &&
          (gateState === "GATED" || gateState === "FROZEN")) {
        // Frozen-for-decision is a form of prepared; the gate's own
        // states remain the internal record.
        return result("PREPARED", stage, "candidate", base);
      }
      return result(CANDIDATE_MAP[stage], stage, "candidate", base);
    }
    return unknown(stage, "candidate", base);
  }

  // ---- From AngelSecurity lifecycle (§4.4 table 4) ----------------
  //
  // Maps to (truth, alarm) pairs: an alert's cross-system meaning
  // is exactly those two things. The CONFIRMED-and-beyond rows are
  // the single sanctioned promotion: they verify the ALERT RECORD
  // ITSELF through its recorded lifecycle transitions — never any
  // entity the alert concerns. Zero alerts (layer read, nothing in
  // it) projects as NO_ALERTS and is accepted here as the "NO_ALERTS"
  // input, the layer-level reading of the same table.
  var ALERT_MAP = {
    DETECTED: { truth: "UNVERIFIED", alarm: false },
    VERIFYING: { truth: "UNVERIFIED", alarm: false },
    CONFIRMED: { truth: "VERIFIED", alarm: true },
    ACTIVE: { truth: "VERIFIED", alarm: true },
    MITIGATING: { truth: "VERIFIED", alarm: true },
    RESOLVED: { truth: "VERIFIED", alarm: false },
    POST_INCIDENT_REVIEW: { truth: "VERIFIED", alarm: false }
  };

  function projectAlertState(lifecycleState) {
    if (!isString(lifecycleState)) return unknown(lifecycleState, "alert",
      { truth: "UNKNOWN", alarm: false });
    if (lifecycleState === "NO_ALERTS") {
      return result("NO_ALERTS", lifecycleState, "alert",
        { truth: "NO_ALERTS", alarm: false });
    }
    if (ALERT_MAP.hasOwnProperty(lifecycleState)) {
      var m = ALERT_MAP[lifecycleState];
      return result(m.truth, lifecycleState, "alert",
        { truth: m.truth, alarm: m.alarm });
    }
    return unknown(lifecycleState, "alert",
      { truth: "UNKNOWN", alarm: false });
  }

  // ---- From Globe LAYER_STATES (§4.4 table 5) ---------------------
  //
  // ACTIVE is not a truth state: it describes a layer with live
  // content. The projection carries the layer's ITEMS' truth and
  // reports the layer itself as populated (populated: true). Today
  // the items' truth for crypto content is UNVERIFIED; callers may
  // pass the items' actual truth state as the second argument — it
  // is carried verbatim, never promoted. ACTIVE must never render
  // as VERIFIED.
  function projectLayerState(state, itemsTruth) {
    if (!isString(state)) return unknown(state, "layer",
      { populated: false });
    switch (state) {
      case "NOT_LOADED":
        return result("UNKNOWN", state, "layer",
          { subReason: "NOT_LOADED", populated: false });
      case "NOT_CONNECTED":
        return result("NOT_CONNECTED", state, "layer", { populated: false });
      case "NO_DATA":
        return result("NO_DATA", state, "layer", { populated: false });
      case "NO_ALERTS":
        return result("NO_ALERTS", state, "layer", { populated: false });
      case "UNVERIFIED":
        return result("UNVERIFIED", state, "layer", { populated: true });
      case "DISABLED":
        return result("DISABLED", state, "layer", { populated: false });
      case "ACTIVE": {
        var items = "UNVERIFIED";
        if (isString(itemsTruth)) {
          var carried = projectVerificationStatus(itemsTruth);
          if (!carried.contractBug) items = carried.state;
          else return unknown(state, "layer",
            { populated: true, itemsTruth: itemsTruth });
        }
        return result(items, state, "layer",
          { populated: true, itemsTruth: items });
      }
      default:
        return unknown(state, "layer", { populated: false });
    }
  }

  // ---- From opportunity PIPELINE_STATES (§4.4 table 6) ------------
  //
  // A lifecycle like the candidate stages, but opportunities are
  // canonical-side records, not candidates: the projection carries
  // the opportunity's STORED verification value at every stage
  // (UNVERIFIED today), with PREPARED → PREPARED at the terminal
  // stage and DISCOVERED → DISCOVERED at the start. The SIMULATED
  // stage additionally marks its outputs as belonging to the
  // SIMULATED state layer (UNVERIFIED + layer SIMULATED) — never
  // presented as observed reality. The intermediate stages named in
  // the code but elided in the §4.1 summary (ELIGIBILITY_CHECKED,
  // GROSS_ESTIMATED, COSTS_ESTIMATED) follow the same "carry the
  // stored verification value" rule the contract states for every
  // stage — they are not a separate mapping, and no value is guessed.
  function projectOpportunityState(pipelineState, verificationStatus) {
    if (!isString(pipelineState)) {
      return unknown(pipelineState, "opportunity",
        { verificationStatus: verificationStatus === undefined
          ? null : verificationStatus });
    }
    var stored = { verificationStatus: verificationStatus === undefined
      ? null : verificationStatus };
    if (pipelineState === "DISCOVERED") {
      return result("DISCOVERED", pipelineState, "opportunity", stored);
    }
    if (pipelineState === "PREPARED") {
      return result("PREPARED", pipelineState, "opportunity", stored);
    }
    if (pipelineState === "SIMULATED") {
      stored.layer = "SIMULATED";
      return result("UNVERIFIED", pipelineState, "opportunity", stored);
    }
    var known = ["IDENTIFIED", "DATA_VERIFIED", "ELIGIBILITY_CHECKED",
      "GROSS_ESTIMATED", "COSTS_ESTIMATED", "RISK_ANALYZED",
      "DEPENDENCIES_CHECKED", "FRESHNESS_CHECKED", "RANKED",
      "RECOMMENDED"];
    if (known.indexOf(pipelineState) === -1) {
      return unknown(pipelineState, "opportunity", stored);
    }
    if (!isString(verificationStatus)) {
      return unknown(pipelineState, "opportunity", stored);
    }
    var carried = projectVerificationStatus(verificationStatus);
    stored.verificationStatus = verificationStatus;
    if (carried.contractBug) return unknown(pipelineState, "opportunity", stored);
    return result(carried.state, pipelineState, "opportunity", stored);
  }

  // ---- Dispatcher ---------------------------------------------------
  //
  // The caller MUST name the source vocabulary. A bare value with
  // no declared source is UNKNOWN, never guessed — the same
  // ambiguity discipline as the query contract's bare-id rule.
  // `extra` carries the per-vocabulary context: candidate →
  // { gateState }, opportunity → { verificationStatus },
  // layer → { itemsTruth }.
  function project(value, sourceVocabulary, extra) {
    extra = extra || {};
    if (!isString(sourceVocabulary)) {
      return unknown(value, null,
        { sourceVocabulary: sourceVocabulary === undefined
          ? null : sourceVocabulary });
    }
    switch (sourceVocabulary) {
      case "verification": return projectVerificationStatus(value);
      case "truth": return projectTruthState(value);
      case "candidate": return projectCandidateStage(value, extra.gateState);
      case "alert": return projectAlertState(value);
      case "layer": return projectLayerState(value, extra.itemsTruth);
      case "opportunity":
        return projectOpportunityState(value, extra.verificationStatus);
      default:
        return unknown(value, sourceVocabulary,
          { sourceVocabulary: sourceVocabulary });
    }
  }

  global.TruthProjection = {
    UNIFIED_STATES: UNIFIED_STATES,
    STATE_LAYERS: STATE_LAYERS,
    SOURCE_VOCABULARIES: SOURCE_VOCABULARIES,
    projectVerificationStatus: projectVerificationStatus,
    projectTruthState: projectTruthState,
    projectCandidateStage: projectCandidateStage,
    projectAlertState: projectAlertState,
    projectLayerState: projectLayerState,
    projectOpportunityState: projectOpportunityState,
    project: project
  };
})(typeof window !== "undefined" ? window : this);
