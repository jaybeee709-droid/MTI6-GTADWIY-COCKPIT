/* MTI6-GTADWIY-COCKPIT — World Engine freshness policy + conflict model
 * (contract §4 STALE / CONFLICTED, §6 getFreshness, §7 computed rule;
 * §66 Ruling 2 condition 3, Ruling 5 + the Integrity Reporting Rule).
 *
 * WE-3 — the computation the §4 vocabulary was waiting for. Until
 * this module, STALE and CONFLICTED were defined but emission-gated:
 * no freshness policy existed, so getFreshness could only answer
 * UNKNOWN and the integrity engine reported staleCount /
 * conflictCount as null with computed: false. This module supplies
 * both detectors, so both counts are now measured — and where a
 * class has no basis for a window, it stays UNKNOWN, by design.
 *
 * FRESHNESS — PER-SOURCE-CLASS WINDOWS
 * A record's freshness is judged only from RECORDED times, never
 * from vibes and never from the wall clock alone. The clock is the
 * record's latest recorded attestation time — the latest parseable
 * ISO time among, in strength order: provenance observedAt (the fact
 * was observed true in the world), provenance retrievedAt (last
 * fetched from its source), the record's own lastChecked /
 * freshness.lastChecked (the record was last checked), provenance
 * acquiredAt (MTI6 acquired the fact — the weakest attestation: it
 * records the import, not a re-check). `lastReviewedAt` is
 * explicitly NOT a clock: it is a review date, never an acquisition
 * / retrieval / observation time (v104 rule, restated here).
 *
 * Windows are per sourceType (the §5.3 provenance vocabulary,
 * total over all 8 values). The window is a policy choice, stated
 * with its basis — not a measurement:
 *   OWNER_SEED / OWNER_RECORDED / CANDIDATE_PROMOTION — 90 days.
 *     Owner-attested world facts (networks, assets, protocols):
 *     the world they describe drifts — rebrands and migrations are
 *     already recorded in the data (e.g. protocol-sky, formerName
 *     Maker) — and the owner's attestation is the only clock. 90
 *     days is the codebase's standing staleness precedent:
 *     EntityCandidates.STALE_DAYS = 90 and
 *     ResourceEngine.STALE_DAYS = 90; bot-ops surfaces the same
 *     90-day window for unreviewed candidates. After 90 days
 *     without re-attestation the fact is STALE: due a re-check,
 *     not false.
 *   SYSTEM_IMPORT — no window (UNKNOWN always). Definitional
 *     reference taxonomy: MTI6's own activity model, changed only
 *     by governed batch revision, never by time. No observation
 *     clock exists for a definition; a time window would
 *     manufacture staleness out of age alone.
 *   OFFICIAL_DOCS / REGISTRY / PROVIDER — no window (UNKNOWN).
 *     No records of these classes exist today and no check
 *     cadence is recorded for any of them; provider facts change
 *     fast, but inventing a short window would be invented
 *     precision. The classes are listed so a future record of
 *     them gets a defined answer (UNKNOWN) instead of an unmapped
 *     one.
 *   UNKNOWN — no window (UNKNOWN). No source class was
 *     determined; there is nothing to judge by.
 *
 * A record whose class has a window but which carries no recorded
 * attestation time is UNKNOWN — never stale-by-guess. A record
 * whose attestation is dated after the evaluation time is UNKNOWN
 * (the window cannot be judged on a future-dated attestation).
 * Within the window (age <= windowMs) the record is CURRENT; past
 * it, STALE.
 *
 * THE HARNESS / LIVE DIVERGENCE (read this before quoting a
 * number): the jsdom harnesses re-import Batches 1–2 into an empty
 * store on every boot, and the v104 writers stamp acquiredAt with
 * the import (boot) time — so in a harness collection the 48
 * OWNER_SEED records were attested seconds ago and are CURRENT.
 * The live profile's records were imported before v104 and carry
 * no provenance block at all, so the same records are UNKNOWN
 * there until a governed write stamps them. Both answers are
 * honest about their own collection; neither is a claim about the
 * other. staleCount is 0 (measured) in both: nothing is past its
 * window in the harness, and nothing has a clock at all live.
 *
 * CONFLICT MODEL — TWIN-FIELD AGREEMENT (the only expressible one)
 * CONFLICTED (contract §4.3) means two or more governed sources
 * assert incompatible claims about the same identity/field. The
 * data expresses exactly one such condition: a MATCHES twin pair —
 * the canonical store record and its intelligence-registry view
 * (ASSET / NETWORK / PROTOCOL) — are two governed sources
 * asserting claims about one entity, and their shared fields can
 * be compared. detectConflicts compares, per pair, the fields
 * whose values are exact claims about the entity and that both
 * sides actually carry: chainId, symbol, nativeOrToken,
 * verificationStatus. A disagreement on any compared field is one
 * conflict. Fields are EXCLUDED deliberately, and the exclusions
 * are part of the model:
 *   - id fields (id / assetId / protocolId / networkId): MATCHES
 *     requires identical rawIds by construction — comparing them
 *     would test the edge, not the sources (that test is Tier 1's
 *     MATCHES-mismatch check, already in the integrity engine).
 *   - source: the NETWORK twin carries "structural-example" as a
 *     label on the VIEW, while the canonical record carries
 *     "owner-seed" as its provenance — comparing them would
 *     manufacture 11 conflicts out of a vocabulary difference.
 *   - free text (note, definition, description, title, name):
 *     two phrasings of the same fact are not a disagreement.
 *   - arrays / objects (aliases, nativeAsset, networks): order
 *     and shape differences are not claim disagreements.
 * Measured on the real baseline: 48 twin pairs, 91 field
 * comparisons, 0 disagreements — conflictCount 0, computed: true.
 * That zero is measured (the detector ran over 91 real
 * comparisons), not the absence of a check. Other conflict
 * shapes the data cannot express are NOT detected and NOT
 * claimed: duplicate canonical ids are Tier 1 structural
 * failures, not conflicts; the provider-router corroboration
 * CONFLICTED is live-provider data, not canonical records; no
 * two canonical records assert incompatible values for the same
 * identity/field anywhere else in the store.
 *
 * DELEGATION: the sourceType and the provenance times come from
 * Provenance.project when it is loaded; otherwise this module
 * falls back to a faithful inline implementation of the same
 * derivation (deriveSourceType + direct block reads), so its
 * behavior is identical in every load context. The harness
 * cross-checks both paths for equality on the real graph.
 *
 * Pure functions only: no DOM, no network, no secrets, no
 * storage. Same discipline as js/truth.js, js/truth-projection.js
 * and js/integrity-engine.js. `now` is injectable (options.now)
 * so every verdict is reproducible; the default is the real
 * current time.
 */
(function (global) {
  "use strict";

  var CONTRACT_VERSION = "WE-CONTRACT-1";
  var POLICY_VERSION = 1;

  // 90 days — the codebase's standing staleness window
  // (EntityCandidates.STALE_DAYS, ResourceEngine.STALE_DAYS).
  var STALE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

  // The §5.3 sourceType vocabulary, total. windowMs null means the
  // class has no freshness window: its records are UNKNOWN, by
  // design, with the reason stated (never a guessed window).
  var SOURCE_TYPES = ["OWNER_SEED", "OWNER_RECORDED", "OFFICIAL_DOCS",
    "REGISTRY", "PROVIDER", "CANDIDATE_PROMOTION", "SYSTEM_IMPORT",
    "UNKNOWN"];
  var WINDOWS = {
    OWNER_SEED: { windowMs: STALE_WINDOW_MS,
      reason: "Owner-attested world facts (networks, assets, " +
        "protocols): the world they describe drifts (rebrands and " +
        "migrations are already recorded, e.g. formerName), and " +
        "the owner's attestation is the only clock. 90 days is " +
        "the codebase's standing staleness window " +
        "(EntityCandidates.STALE_DAYS = 90)." },
    OWNER_RECORDED: { windowMs: STALE_WINDOW_MS,
      reason: "Owner-recorded world facts: same character as " +
        "OWNER_SEED (owner attestation of a changing world), same " +
        "90-day window." },
    CANDIDATE_PROMOTION: { windowMs: STALE_WINDOW_MS,
      reason: "Promoted entity facts: same world-fact character " +
        "as OWNER_SEED, attested at promotion/import time, same " +
        "90-day window." },
    SYSTEM_IMPORT: { windowMs: null,
      reason: "Definitional reference taxonomy: MTI6's own " +
        "activity model, changed only by governed batch revision, " +
        "never by time. No observation clock exists for a " +
        "definition; a time window would manufacture staleness." },
    OFFICIAL_DOCS: { windowMs: null,
      reason: "No records of this class exist and no check " +
        "cadence is recorded; docs change on the publisher's " +
        "schedule, which MTI6 does not record." },
    REGISTRY: { windowMs: null,
      reason: "No records of this class exist and no check " +
        "cadence is recorded for registry facts." },
    PROVIDER: { windowMs: null,
      reason: "Provider facts change fast, but no retrieval " +
        "cadence is recorded and no provider-sourced canonical " +
        "records exist; a short window would be invented precision." },
    UNKNOWN: { windowMs: null,
      reason: "No source class was determined; there is nothing " +
        "to judge by." }
  };

  // Fields compared by the conflict detector (see header for the
  // exclusions). Each is an exact claim about the entity, carried
  // by both sides of a MATCHES pair.
  var CONFLICT_FIELDS = ["chainId", "symbol", "nativeOrToken",
    "verificationStatus"];

  // Clock fields, strongest attestation first. lastReviewedAt is
  // deliberately absent: a review date is never an observation
  // time (v104 rule).
  var CLOCK_FIELDS = ["observedAt", "retrievedAt", "lastChecked",
    "acquiredAt"];

  function isString(v) { return typeof v === "string" && v.length > 0; }
  function isPlainObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  // An ISO-8601 timestamp with a time component (the shape
  // new Date().toISOString() produces). Date-only strings are not
  // attestation times under this contract.
  function parseTime(value) {
    if (typeof value !== "string") return null;
    if (value.indexOf("T") === -1) return null;
    var ms = Date.parse(value);
    return isNaN(ms) ? null : ms;
  }

  function nowMs(options) {
    var n = options && options.now !== undefined ? options.now : null;
    if (n === null || n === undefined) return Date.now();
    if (n instanceof Date) return n.getTime();
    if (typeof n === "number") return n;
    var ms = parseTime(n);
    return ms === null ? Date.now() : ms;
  }

  // ---- Source type ----------------------------------------------------
  //
  // Delegates to Provenance.project when loaded; the inline
  // fallback is the same derivation (record.source is the
  // determinant; importBatch is corroboration, never the
  // determinant — §5.3).
  function deriveSourceTypeFallback(record) {
    if (!isPlainObject(record)) return "UNKNOWN";
    if (record.source === "owner-seed") return "OWNER_SEED";
    if (record.source === "canonical-import") return "SYSTEM_IMPORT";
    return "UNKNOWN";
  }

  function sourceTypeOf(record) {
    if (global.Provenance &&
        typeof global.Provenance.project === "function") {
      return global.Provenance.project(record).sourceType;
    }
    return deriveSourceTypeFallback(record);
  }

  // ---- The attestation clock -------------------------------------------
  //
  // The latest recorded attestation time on the record, and which
  // field supplied it. Provenance times come from the §5.3
  // projection when loaded (identical values either way: the
  // projection carries the block verbatim); the record's own
  // lastChecked / freshness.lastChecked are read directly.
  // A malformed time is not a recorded time: it is ignored, never
  // an error and never a clock.
  function attestedAt(record) {
    if (!isPlainObject(record)) return { at: null, clock: null };
    var times = {}; // clock field -> ms
    var proj = null;
    if (global.Provenance &&
        typeof global.Provenance.project === "function") {
      proj = global.Provenance.project(record);
      ["observedAt", "retrievedAt", "acquiredAt"].forEach(function (k) {
        var ms = parseTime(proj[k]);
        if (ms !== null) times[k] = ms;
      });
    } else if (isPlainObject(record.provenance)) {
      ["observedAt", "retrievedAt", "acquiredAt"].forEach(function (k) {
        var ms = parseTime(record.provenance[k]);
        if (ms !== null) times[k] = ms;
      });
    }
    var lc = parseTime(record.lastChecked);
    if (lc !== null) times.lastChecked = lc;
    if (isPlainObject(record.freshness)) {
      var flc = parseTime(record.freshness.lastChecked);
      if (flc !== null) times.lastChecked = flc;
    }
    var best = null, bestMs = null;
    CLOCK_FIELDS.forEach(function (k) {
      if (times[k] !== undefined && (bestMs === null || times[k] > bestMs)) {
        bestMs = times[k];
        best = k;
      }
    });
    if (best === null) return { at: null, clock: null };
    return { at: new Date(bestMs).toISOString(), clock: best, ms: bestMs };
  }

  // ---- Per-record freshness --------------------------------------------
  //
  // assess(record, options) -> { state, basis, sourceType,
  // attestedAt, clock, windowMs, ageMs, evaluatedAt }.
  // state is CURRENT | STALE | UNKNOWN (the freshness domain's
  // words for "within its window" / "window lapsed" / "no window
  // or no clock"). ageMs is null when no attestation time exists.
  function assess(record, options) {
    var now = nowMs(options);
    var evaluatedAt = new Date(now).toISOString();
    var sourceType = sourceTypeOf(record);
    var win = WINDOWS[sourceType] || WINDOWS.UNKNOWN;
    var att = attestedAt(record);
    var base = {
      state: "UNKNOWN",
      basis: "",
      sourceType: sourceType,
      attestedAt: att.at,
      clock: att.clock,
      windowMs: win.windowMs,
      ageMs: att.at === null ? null : now - att.ms,
      evaluatedAt: evaluatedAt
    };
    if (win.windowMs === null) {
      base.basis = "Source class " + sourceType + " has no freshness " +
        "window (" + win.reason + ")" +
        (att.at !== null
          ? " Recorded attestation " + att.clock + " " + att.at +
            " is reported, not judged — no window exists to judge it by."
          : " No attestation time is recorded on this record.");
      return base;
    }
    if (att.at === null) {
      base.basis = "Source class " + sourceType + " has a " +
        (win.windowMs / 86400000) + "-day freshness window, but no " +
        "attestation time is recorded on this record — freshness is " +
        "UNKNOWN, never stale-by-guess.";
      return base;
    }
    var ageMs = now - att.ms;
    if (ageMs < 0) {
      base.basis = "Attestation " + att.clock + " " + att.at +
        " is dated after the evaluation time " + evaluatedAt +
        " (future-dated); the window cannot be judged — UNKNOWN.";
      return base;
    }
    var days = (ageMs / 86400000);
    var daysText = days < 1 ? (ageMs / 3600000).toFixed(1) + " hours"
      : days.toFixed(1) + " days";
    if (ageMs <= win.windowMs) {
      base.state = "CURRENT";
      base.basis = "Attested " + att.clock + " " + att.at + " (" +
        daysText + " ago); within the " +
        (win.windowMs / 86400000) + "-day window for " + sourceType + ".";
      return base;
    }
    base.state = "STALE";
    base.basis = "Attested " + att.clock + " " + att.at + " (" +
      daysText + " ago); older than the " +
      (win.windowMs / 86400000) + "-day window for " + sourceType +
      " — due a re-check, not false.";
    return base;
  }

  // ---- Entity freshness (MATCHES twins are one entity) -----------------
  //
  // assessEntity([{ nodeId, record }, ...], options): the twin
  // set of one entity, nodeId-sorted by this function. The
  // assessment with the latest attestation governs (the freshest
  // attestation is the entity's); ties go to the lowest nodeId.
  // When no twin carries an attestation, the first record's
  // UNKNOWN verdict stands, with the twin count named. The result
  // carries assessedFrom (the winning twin's nodeId) and the
  // winner's basis, with the twin noted when it is not the first
  // record passed in.
  function assessEntity(records, options) {
    var list = (Array.isArray(records) ? records : []).slice();
    list.sort(function (a, b) {
      return String(a.nodeId) < String(b.nodeId) ? -1
        : String(a.nodeId) > String(b.nodeId) ? 1 : 0;
    });
    if (list.length === 0) {
      return { state: "UNKNOWN",
        basis: "No record supplied for this entity.",
        sourceType: "UNKNOWN", attestedAt: null, clock: null,
        windowMs: null, ageMs: null,
        evaluatedAt: new Date(nowMs(options)).toISOString(),
        assessedFrom: null };
    }
    var best = null, bestMs = null, bestIdx = -1;
    var assessed = list.map(function (entry, i) {
      var r = assess(entry.record, options);
      r._nodeId = entry.nodeId;
      var ms = r.attestedAt === null ? null : Date.parse(r.attestedAt);
      if (ms !== null && (bestMs === null || ms > bestMs)) {
        bestMs = ms;
        bestIdx = i;
      }
      return r;
    });
    var winner = bestIdx === -1 ? assessed[0] : assessed[bestIdx];
    var out = {
      state: winner.state,
      basis: winner.basis,
      sourceType: winner.sourceType,
      attestedAt: winner.attestedAt,
      clock: winner.clock,
      windowMs: winner.windowMs,
      ageMs: winner.ageMs,
      evaluatedAt: winner.evaluatedAt,
      assessedFrom: winner._nodeId
    };
    if (bestIdx === -1 && list.length > 1) {
      out.basis = "No recorded attestation time on any of the " +
        list.length + " twin records. " + out.basis;
    } else if (winner._nodeId !== list[0].nodeId) {
      out.basis = out.basis + " (Assessed from twin " +
        winner._nodeId + "; the queried record carries no later " +
        "attestation.)";
    }
    return out;
  }

  // ---- Graph census (the integrity engine's staleCount) ----------------
  //
  // Counts CRYPTO_RECORD nodes only: twins, classes and principals
  // are views / structural nodes, not canonical records, and carry
  // no freshness of their own — counting them would double-count
  // entities and dilute the census with nodes that can never be
  // STALE. The twin's verdict lives on the canonical record.
  function assessGraph(graph, options) {
    var nodes = (graph && graph.nodes) || {};
    var now = nowMs(options);
    var out = {
      computed: true,
      total: 0,
      stale: 0,
      current: 0,
      unknown: 0,
      staleNodeIds: [],
      bySourceType: {},
      evaluatedAt: new Date(now).toISOString()
    };
    SOURCE_TYPES.forEach(function (t) {
      out.bySourceType[t] = { stale: 0, current: 0, unknown: 0 };
    });
    Object.keys(nodes).sort().forEach(function (nodeId) {
      var n = nodes[nodeId];
      if (!n || n.kind !== "CRYPTO_RECORD") return;
      out.total++;
      var r = assess(n.record || null, { now: now });
      out.bySourceType[r.sourceType][
        r.state === "STALE" ? "stale"
        : r.state === "CURRENT" ? "current" : "unknown"]++;
      if (r.state === "STALE") {
        out.stale++;
        out.staleNodeIds.push(nodeId);
      } else if (r.state === "CURRENT") {
        out.current++;
      } else {
        out.unknown++;
      }
    });
    return out;
  }

  // ---- Conflict model: twin-field agreement -----------------------------
  //
  // detectConflicts(graph) -> { computed, conflictCount,
  // conflicts, comparisons, pairs }. One conflict per (twin pair,
  // field) disagreement. comparisons counts field-pairs actually
  // compared (both sides carrying a non-empty value); a pair with
  // no shared comparable field contributes 0 comparisons and 0
  // conflicts — it is not evidence of agreement, and the count
  // says so. The detector runs even when there are no MATCHES
  // edges: comparisons 0, conflictCount 0, computed true — the
  // detector ran; there was simply nothing to compare.
  function detectConflicts(graph) {
    var edges = (graph && Array.isArray(graph.edges)) ? graph.edges : [];
    var nodes = (graph && graph.nodes) || {};
    var pairs = [];
    edges.forEach(function (e) {
      if (e && e.type === "MATCHES" && nodes[e.from] && nodes[e.to]) {
        pairs.push({ from: e.from, to: e.to });
      }
    });
    pairs.sort(function (a, b) {
      return a.from < b.from ? -1 : a.from > b.from ? 1
        : a.to < b.to ? -1 : a.to > b.to ? 1 : 0;
    });
    var conflicts = [];
    var comparisons = 0;
    pairs.forEach(function (p) {
      var ra = nodes[p.from].record || {};
      var rb = nodes[p.to].record || {};
      CONFLICT_FIELDS.forEach(function (f) {
        var va = ra[f], vb = rb[f];
        var present = function (v) {
          return v !== undefined && v !== null && v !== "";
        };
        if (!present(va) || !present(vb)) return;
        comparisons++;
        if (String(va) !== String(vb)) {
          conflicts.push({
            nodeIds: [p.from, p.to],
            field: f,
            values: { from: va, to: vb }
          });
        }
      });
    });
    conflicts.sort(function (a, b) {
      return a.nodeIds[0] < b.nodeIds[0] ? -1
        : a.nodeIds[0] > b.nodeIds[0] ? 1
        : a.nodeIds[1] < b.nodeIds[1] ? -1
        : a.nodeIds[1] > b.nodeIds[1] ? 1
        : a.field < b.field ? -1 : a.field > b.field ? 1 : 0;
    });
    return {
      computed: true,
      conflictCount: conflicts.length,
      conflicts: conflicts,
      comparisons: comparisons,
      pairs: pairs.length
    };
  }

  global.FreshnessPolicy = {
    CONTRACT_VERSION: CONTRACT_VERSION,
    POLICY_VERSION: POLICY_VERSION,
    SOURCE_TYPES: SOURCE_TYPES,
    WINDOWS: WINDOWS,
    STALE_WINDOW_MS: STALE_WINDOW_MS,
    CONFLICT_FIELDS: CONFLICT_FIELDS,
    CLOCK_FIELDS: CLOCK_FIELDS,
    deriveSourceType: deriveSourceTypeFallback,
    sourceTypeOf: sourceTypeOf,
    attestedAt: attestedAt,
    assess: assess,
    assessEntity: assessEntity,
    assessGraph: assessGraph,
    detectConflicts: detectConflicts
  };
})(typeof window !== "undefined" ? window : this);
