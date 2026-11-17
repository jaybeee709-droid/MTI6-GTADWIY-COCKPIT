/* MTI6-GTADWIY-COCKPIT — World Engine Integrity Engine (contract §7)
 *
 * Integrity engine — §66 step 7, Ruling 5 (two-tier model). One pure
 * module that assesses a collected World Engine graph (and, when the
 * caller also supplies the raw snapshot, the record lists the graph
 * was built from) and produces the contract §7.1 integrity report.
 *
 * Contract source: papers/files/world-engine-contract-proposal.md
 * §7 (report shape, fail-closed semantics, surfacing) and §4.5
 * standing rules; papers/files/world-engine-contract-rulings-and-order.md
 * Ruling 5 + the Integrity Reporting Rule.
 *
 * TWO TIERS (§7.2):
 *   Tier 1 — STRUCTURAL CORRUPTION: HARD FAIL. Duplicate canonical
 *   id within a kind; candidate/frozen-artifact contamination in the
 *   graph; an edge whose type is outside the closed EDGE_TYPES
 *   vocabulary; a PARENT cycle; a MATCHES pair with mismatched
 *   rawIds; a node whose kind is outside NODE_KINDS. On FAILED,
 *   consumers must not present graph-derived state as current — the
 *   FAILED report itself, naming the failure, is the deliverable.
 *   Tier 2 — DEGRADATION: CONTINUE BUT SURFACE TRUTHFULLY.
 *   Unresolved references above zero; a source NOT_LOADED/ERROR in
 *   sourceStates; a check a consumer depends on that did not run.
 *   The graph remains usable; every summary/surface derived from it
 *   must carry the degradation.
 *
 * MEASURED-ZERO RULE (binding, Ruling 5): a zero is reported only
 * when the detector actually ran. This module enforces it in code:
 *   - conflictCount / staleCount are MEASURED by the WE-3
 *     detectors in js/freshness-policy.js (twin-field agreement
 *     for conflicts; per-source-class freshness windows for
 *     staleness) whenever that module is loaded — assessCollection
 *     calls it through global.FreshnessPolicy when present. When
 *     the module is NOT loaded (a load context without it), both
 *     counts stay null with computed: false: no detector ran, so
 *     there is no measured zero to report. A 0 with computed:
 *     false would still read as a measured zero to any consumer
 *     that does not check the flag.
 *   - The WE-3 detectors are additive diagnostics: they never
 *     change the Tier 1 / Tier 2 status semantics of §7.2.
 *     Staleness is reported (staleCount + the `freshness` detail),
 *     not a degradation trigger — §7.2's DEGRADED conditions are
 *     unresolved references, NOT_LOADED/ERROR sources, and
 *     required checks that did not run. A stale record is due a
 *     re-check, not a system failure.
 *   - duplicateIds is null with computed: false when no snapshot
 *     was supplied: buildGraph silently dedupes duplicate node ids
 *     (addNode drops the second), so a duplicate can never be
 *     detected from a built graph alone. The authoritative duplicate
 *     detector runs over the raw snapshot lists, mirroring
 *     buildGraph's id resolution exactly. A graph-level secondary
 *     scan (same kind + case-insensitively equal rawId under two
 *     nodeIds) still runs and any hit is a real failure, but it
 *     does not make the authoritative check "computed".
 *   - unresolvedCount is null with computed: false when the graph
 *     carries no unresolved list (buildGraph always supplies one).
 *   - sourceStates is {} with computed: false when the caller did
 *     not supply collection state (collect() / collectGraph()).
 *
 * ORPHAN RULE (§7.1, read as intended, not as literally worded):
 * the contract says "taxonomy children with no PARENT edge". The
 * data model expresses a Major Activity's parent link as a FAMILY
 * edge (primaryFamily), not a parentRef: measured on the v102
 * graph, PARENT edges number exactly 738 = TYPE (334) + STRATEGY
 * (404), and FAMILY edges number exactly 60 = MAJOR_ACTIVITY (60),
 * each Major Activity carrying exactly one FAMILY edge and each
 * Type/Strategy exactly one PARENT edge. A literal PARENT-only
 * rule would report the 60-activity backbone as orphans. An
 * orphan is therefore a taxonomy child (level MAJOR_ACTIVITY /
 * TYPE / STRATEGY / ACTION) with NEITHER an outgoing PARENT edge
 * NOR an outgoing FAMILY edge. FAMILY-level records (28) are
 * roots; level-null records (52 registry twins + meta records)
 * are not taxonomy children; neither is ever an orphan.
 * Non-taxonomy nodes with no edges are reported separately in
 * `edgelessNodes` (additive field), never as orphans — on the v102
 * graph that is the 38 ASSET_CLASS vocabulary nodes + the 12
 * PRINCIPAL nodes, both edgeless by design.
 *
 * CONTAMINATION (§7.1): candidateNodes counts graph nodes whose
 * record carries a non-canonical candidate-family recordKind
 * (ENTITY_CANDIDATE, RESOURCE_CANDIDATE, RESOURCE_GAP — the kinds
 * CryptoWorld.getAllRecords() filters out of canonical views);
 * frozenArtifactNodes counts recordKind FROZEN_ENTITY_BATCH.
 *
 * SURFACING (§7.3): this package specifies and implements the
 * report only. No surface adopts it here — where it appears (a
 * World Engine health panel, Cockpit Status, STAR's status answer)
 * is WE-2's authorized implementation decision. Until then,
 * graph.stats + graph.unresolved remain the de-facto partial
 * report, and no surface may claim integrity checks this report's
 * `computed` flags say did not run.
 *
 * The v102 baseline, measured by this engine (see the harness):
 * nodeCount 976, relationshipCount 1026, unresolved 0, orphans 0,
 * no Tier 1 failures, but status DEGRADED — source costRecords is
 * NOT_LOADED. That is a real, pre-existing wiring gap surfaced by
 * the engine, not a defect in it: WorldEngine.collect() reads
 * CostIntelligence.records, which does not exist (the module
 * exposes getCosts()); the cost source is therefore never loaded
 * into any collection. The engine reports the measured state; the
 * wiring fix belongs to a future package, not this one. (v106
 * shipped that fix; the baseline is OK from v106 on.)
 *
 * WE-3 (cache v108) measures the two counts this header used to
 * report as unmeasured: staleCount via FreshnessPolicy.assessGraph
 * (0 on the real baseline — the harness collection was just
 * imported, so the 48 OWNER_SEED records are within their 90-day
 * window and the 826 SYSTEM_IMPORT records have no window at
 * all) and conflictCount via FreshnessPolicy.detectConflicts (0
 * over 91 compared twin fields on the real baseline). See
 * js/freshness-policy.js for the harness/live divergence note:
 * the live profile's pre-v104 records carry no attestation time
 * and are UNKNOWN there, not CURRENT.
 *
 * Pure functions only: no DOM, no network, no secrets, no storage.
 * Same discipline as js/truth.js and js/truth-projection.js.
 */
(function (global) {
  "use strict";

  var CONTRACT_VERSION = "WE-CONTRACT-1";

  // Closed vocabularies (contract §2.1/§2.2, as in js/world-engine.js
  // at v102). The harness asserts these equal WorldEngine's lists;
  // a caller may override them through options.nodeKinds /
  // options.edgeTypes, and the report then judges against the
  // caller's vocabularies.
  var NODE_KINDS = ["CRYPTO_RECORD", "ASSET", "ASSET_CLASS", "NETWORK", "PROTOCOL", "WALLET",
    "OPPORTUNITY", "POSITION", "PRINCIPAL", "ASSIGNMENT",
    "RISK_PROFILE", "COST", "ANGEL", "ALERT"];
  var EDGE_TYPES = ["PARENT", "FAMILY", "RELATED_TO", "SOURCE_TYPE",
    "ON_NETWORK", "USES_PROTOCOL", "INSTANTIATES", "HELD_IN",
    "OPENED_FROM", "ASSIGNED_TO", "ASSIGNMENT_SUBJECT", "PROFILE_OF",
    "SUPPORTS_NETWORK", "RAISED_FOR", "MATCHES"];

  var TAXONOMY_LEVELS = ["MAJOR_ACTIVITY", "TYPE", "STRATEGY", "ACTION"];
  var ROOT_LEVEL = "FAMILY";

  // Non-canonical recordKinds (CryptoWorld.getAllRecords() filter,
  // js/crypto-world.js). Candidate-family kinds count as candidate
  // contamination; the frozen-batch artifact kind counts separately.
  var CANDIDATE_RECORD_KINDS = ["ENTITY_CANDIDATE", "RESOURCE_CANDIDATE", "RESOURCE_GAP"];
  var FROZEN_ARTIFACT_KIND = "FROZEN_ENTITY_BATCH";

  // Snapshot lists and their id resolution, mirroring buildGraph
  // pass 1 exactly — the duplicate detector must use the same ids
  // the builder uses, or it would report duplicates the builder
  // would not collapse (and miss the ones it would).
  var SNAPSHOT_ID_FIELDS = {
    cryptoRecords: ["id"],
    assets: ["assetId", "id"],
    assetClasses: ["id", "assetClassId"],
    networks: ["networkId", "id"],
    protocols: ["protocolId", "id"],
    wallets: ["walletId", "id"],
    opportunities: ["id"],
    positions: ["positionId", "id"],
    principals: ["id"],
    assignments: ["assignmentId", "id"],
    riskProfiles: ["profileId", "id"],
    costRecords: ["costId", "id"],
    angels: ["angelId", "id"],
    alerts: ["alertId", "id"]
  };
  var SNAPSHOT_KIND = {
    cryptoRecords: "CRYPTO_RECORD",
    assets: "ASSET",
    assetClasses: "ASSET_CLASS",
    networks: "NETWORK",
    protocols: "PROTOCOL",
    wallets: "WALLET",
    opportunities: "OPPORTUNITY",
    positions: "POSITION",
    principals: "PRINCIPAL",
    assignments: "ASSIGNMENT",
    riskProfiles: "RISK_PROFILE",
    costRecords: "COST",
    angels: "ANGEL",
    alerts: "ALERT"
  };

  function isString(v) { return typeof v === "string" && v.length > 0; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function sortedKeys(obj) { return Object.keys(obj).sort(); }

  function resolveId(rec, fields) {
    if (!rec) return null;
    for (var i = 0; i < fields.length; i++) {
      if (isString(rec[fields[i]])) return rec[fields[i]];
    }
    return null;
  }

  function rawIdOf(nodeId) {
    var i = String(nodeId).indexOf(":");
    return i === -1 ? String(nodeId) : String(nodeId).slice(i + 1);
  }

  // ---- Individual checks (each pure; each returns its own result) --

  // Unresolved references: measured from the graph's unresolved list
  // (populated by WorldEngine.link(); never invented here).
  function checkUnresolved(graph) {
    var list = Array.isArray(graph.unresolved) ? graph.unresolved : null;
    return {
      computed: list !== null,
      count: list === null ? null : list.length,
      list: list === null ? null : list.map(function (u) {
        return { from: u.from, ref: u.ref, type: u.type };
      })
    };
  }

  // Orphans: taxonomy children with no parent link (no outgoing
  // PARENT edge and no outgoing FAMILY edge — see header). Also
  // returns the edgeless non-taxonomy nodes, separately, never as
  // orphans.
  function checkOrphans(graph) {
    var nodes = graph.nodes || {};
    var parentFrom = {};
    var familyFrom = {};
    var touched = {};
    arr(graph.edges).forEach(function (e) {
      if (e.type === "PARENT") parentFrom[e.from] = true;
      if (e.type === "FAMILY") familyFrom[e.from] = true;
      touched[e.from] = true;
      touched[e.to] = true;
    });
    var orphans = [];
    var edgelessNodes = [];
    sortedKeys(nodes).forEach(function (nodeId) {
      var n = nodes[nodeId];
      if (n.kind === "CRYPTO_RECORD") {
        if (TAXONOMY_LEVELS.indexOf(n.level) !== -1 &&
            !parentFrom[nodeId] && !familyFrom[nodeId]) {
          orphans.push(nodeId);
        }
      } else if (!touched[nodeId]) {
        edgelessNodes.push(nodeId);
      }
    });
    return { computed: true, count: orphans.length, orphans: orphans,
      edgelessNodes: edgelessNodes };
  }

  // Duplicate canonical ids within a kind, over the raw snapshot
  // lists (the authoritative detector — see header). Returns
  // [{ kind, id, count }] sorted by kind then id; count is the
  // number of records sharing the id.
  function checkDuplicates(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      return { computed: false, duplicateIds: null };
    }
    var counts = {}; // kind|id -> { kind, id, count }
    sortedKeys(SNAPSHOT_ID_FIELDS).forEach(function (listName) {
      var kind = SNAPSHOT_KIND[listName];
      var fields = SNAPSHOT_ID_FIELDS[listName];
      arr(snapshot[listName]).forEach(function (rec) {
        var id = resolveId(rec, fields);
        if (id === null) return;
        var key = kind + "|" + id;
        if (!counts[key]) counts[key] = { kind: kind, id: id, count: 0 };
        counts[key].count++;
      });
    });
    var dups = [];
    sortedKeys(counts).forEach(function (key) {
      if (counts[key].count > 1) dups.push(counts[key]);
    });
    dups.sort(function (a, b) {
      return a.kind < b.kind ? -1 : a.kind > b.kind ? 1
        : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    return { computed: true, duplicateIds: dups };
  }

  // Secondary duplicate scan over a built graph: the same kind +
  // case-insensitively equal rawId under two different nodeIds.
  // buildGraph's own dedupe makes exact duplicates impossible in a
  // built graph; only case variants can survive it.
  function checkDuplicateNodes(graph) {
    var seen = {};
    var dups = [];
    var nodes = graph.nodes || {};
    sortedKeys(nodes).forEach(function (nodeId) {
      var n = nodes[nodeId];
      var key = n.kind + "|" + String(n.rawId).toLowerCase();
      if (seen[key]) {
        dups.push({ kind: n.kind, id: n.rawId, count: 2,
          nodeIds: [seen[key], nodeId] });
      } else {
        seen[key] = nodeId;
      }
    });
    return dups;
  }

  // Contamination: graph nodes carrying non-canonical recordKinds,
  // plus nodes whose kind is outside NODE_KINDS (a structural
  // failure reported separately from the contamination counts).
  function checkContamination(graph, nodeKinds) {
    var kinds = nodeKinds || NODE_KINDS;
    var candidateNodes = 0;
    var frozenArtifactNodes = 0;
    var candidateNodeIds = [];
    var frozenArtifactNodeIds = [];
    var unknownKindNodes = [];
    var nodes = graph.nodes || {};
    sortedKeys(nodes).forEach(function (nodeId) {
      var n = nodes[nodeId];
      if (kinds.indexOf(n.kind) === -1) unknownKindNodes.push(nodeId);
      var rk = n.record && n.record.recordKind;
      if (rk === FROZEN_ARTIFACT_KIND) {
        frozenArtifactNodes++;
        frozenArtifactNodeIds.push(nodeId);
      } else if (isString(rk) && CANDIDATE_RECORD_KINDS.indexOf(rk) !== -1) {
        candidateNodes++;
        candidateNodeIds.push(nodeId);
      }
    });
    return { computed: true, candidateNodes: candidateNodes,
      frozenArtifactNodes: frozenArtifactNodes,
      candidateNodeIds: candidateNodeIds,
      frozenArtifactNodeIds: frozenArtifactNodeIds,
      unknownKindNodes: unknownKindNodes };
  }

  // Edge types outside the closed EDGE_TYPES vocabulary.
  function checkEdgeTypes(graph, edgeTypes) {
    var types = edgeTypes || EDGE_TYPES;
    var invalid = [];
    arr(graph.edges).forEach(function (e) {
      if (types.indexOf(e.type) === -1) {
        invalid.push({ from: e.from, to: e.to, type: e.type });
      }
    });
    invalid.sort(function (a, b) {
      return a.from < b.from ? -1 : a.from > b.from ? 1
        : a.to < b.to ? -1 : a.to > b.to ? 1
        : String(a.type) < String(b.type) ? -1 : 1;
    });
    return { computed: true, invalidEdges: invalid };
  }

  // PARENT cycles (directed, child -> parent). Returns each cycle as
  // an ordered list of nodeIds ending where it started.
  function checkParentCycles(graph) {
    var adj = {};
    arr(graph.edges).forEach(function (e) {
      if (e.type !== "PARENT") return;
      if (!adj[e.from]) adj[e.from] = [];
      adj[e.from].push(e.to);
    });
    Object.keys(adj).forEach(function (k) { adj[k].sort(); });
    var WHITE = 0, GREY = 1, BLACK = 2;
    var color = {};
    var cycles = [];
    function dfs(u, path) {
      color[u] = GREY;
      path.push(u);
      var nexts = adj[u] || [];
      for (var i = 0; i < nexts.length; i++) {
        var v = nexts[i];
        if (color[v] === GREY) {
          cycles.push(path.slice(path.indexOf(v)).concat([v]));
        } else if (!color[v]) {
          dfs(v, path);
        }
      }
      path.pop();
      color[u] = BLACK;
    }
    sortedKeys(adj).forEach(function (u) {
      if (!color[u]) dfs(u, []);
    });
    return { computed: true, cycles: cycles };
  }

  // MATCHES pairs with mismatched rawIds: a MATCHES edge must join
  // a registry node and its own CRYPTO_RECORD twin (same rawId).
  function checkMatches(graph) {
    var mismatches = [];
    arr(graph.edges).forEach(function (e) {
      if (e.type !== "MATCHES") return;
      if (rawIdOf(e.from) !== rawIdOf(e.to)) {
        mismatches.push({ from: e.from, to: e.to });
      }
    });
    mismatches.sort(function (a, b) {
      return a.from < b.from ? -1 : a.from > b.from ? 1
        : a.to < b.to ? -1 : a.to > b.to ? 1 : 0;
    });
    return { computed: true, mismatches: mismatches };
  }

  // Source states: collect() reports { name: { state, count } };
  // the §7.1 report carries plain state words, LOADED normalized
  // to OK. An unrecognized state word is UNKNOWN, never OK.
  function normalizeSourceStates(sourceStates) {
    if (!sourceStates || typeof sourceStates !== "object") {
      return { computed: false, states: {}, degraded: [] };
    }
    var states = {};
    var degraded = [];
    sortedKeys(sourceStates).forEach(function (name) {
      var entry = sourceStates[name];
      var s = null;
      if (isString(entry)) s = entry;
      else if (entry && isString(entry.state)) s = entry.state;
      var norm;
      if (s === "LOADED" || s === "OK") norm = "OK";
      else if (s === "NOT_LOADED") norm = "NOT_LOADED";
      else if (s === "ERROR") norm = "ERROR";
      else norm = "UNKNOWN";
      states[name] = norm;
      if (norm === "NOT_LOADED" || norm === "ERROR") degraded.push(name);
    });
    return { computed: true, states: states, degraded: degraded };
  }

  // ---- The §7.1 report --------------------------------------------------
  //
  // assessCollection({ graph, snapshot, sourceStates }, options)
  //   graph: a WorldEngine.buildGraph() result (required).
  //   snapshot: the raw record lists the graph was built from
  //     (optional; without it the authoritative duplicate check
  //     cannot run and reports computed: false).
  //   sourceStates: the collect()/collectGraph() sourceStates
  //     (optional; without it the report cannot speak about source
  //     health and reports computed: false for that check).
  //   options: { head, cacheVersion, dbVersion, nodeKinds,
  //     edgeTypes, requiredChecks, now } — requiredChecks names computed
  //     flags a consumer depends on; a required check that did not
  //     run degrades the report. `now` (ISO string / Date / ms) is
  //     the evaluation time for the WE-3 freshness detector;
  //     default is the real current time.
  // Throws TypeError when no graph is supplied: no collection, no
  // report — silence would be the fake-green state §7 forbids.
  function assessCollection(input, options) {
    input = input || {};
    options = options || {};
    var graph = input.graph;
    if (!graph || typeof graph !== "object" || !graph.nodes || !graph.edges) {
      throw new TypeError("IntegrityEngine.assessCollection requires a graph (buildGraph result)");
    }
    var nodeKinds = options.nodeKinds || NODE_KINDS;
    var edgeTypes = options.edgeTypes || EDGE_TYPES;
    var sourceStates = input.sourceStates !== undefined
      ? input.sourceStates : options.sourceStates;

    var nodes = graph.nodes;
    var edges = graph.edges;

    var unresolved = checkUnresolved(graph);
    var orphans = checkOrphans(graph);
    var duplicates = checkDuplicates(input.snapshot);
    var graphDups = checkDuplicateNodes(graph);
    var contamination = checkContamination(graph, nodeKinds);
    var edgeTypesCheck = checkEdgeTypes(graph, edgeTypes);
    var cycles = checkParentCycles(graph);
    var matches = checkMatches(graph);
    var sources = normalizeSourceStates(sourceStates);

    // WE-3 detectors (js/freshness-policy.js): staleness by
    // per-source-class freshness windows over the canonical
    // records, conflicts by twin-field agreement. Both run only
    // when the module is loaded; without it the counts stay
    // unmeasured (null, computed: false) — the pre-WE-3 behavior,
    // preserved as the honest fallback. `now` is injectable via
    // options.now for reproducible assessments; the default is
    // the real current time.
    var FP = global.FreshnessPolicy;
    var freshness = { computed: false };
    var conflicts = { computed: false };
    if (FP && typeof FP.assessGraph === "function" &&
        typeof FP.detectConflicts === "function") {
      freshness = FP.assessGraph(graph, { now: options.now });
      conflicts = FP.detectConflicts(graph);
    }

    // byKind / byEdgeType: measured from the graph, every known
    // kind/type present (0 for empty), unknown kinds/types still
    // counted under their own key — a count must never hide a
    // value the vocabulary does not know.
    var byKind = {};
    nodeKinds.forEach(function (k) { byKind[k] = 0; });
    sortedKeys(nodes).forEach(function (nodeId) {
      var k = nodes[nodeId].kind;
      byKind[k] = (byKind[k] || 0) + 1;
    });
    var byEdgeType = {};
    edgeTypes.forEach(function (t) { byEdgeType[t] = 0; });
    edges.forEach(function (e) {
      byEdgeType[e.type] = (byEdgeType[e.type] || 0) + 1;
    });

    // Merge the secondary graph duplicate scan into the duplicate
    // list (deduped by kind|lowercased id); the authoritative flag
    // still reflects only the snapshot check.
    var duplicateIds = duplicates.duplicateIds === null ? null : duplicates.duplicateIds.slice();
    var dupKeys = {};
    if (duplicateIds) {
      duplicateIds.forEach(function (d) { dupKeys[d.kind + "|" + String(d.id).toLowerCase()] = true; });
    }
    var secondaryDups = [];
    graphDups.forEach(function (d) {
      var key = d.kind + "|" + String(d.id).toLowerCase();
      if (!dupKeys[key]) {
        secondaryDups.push(d);
        dupKeys[key] = true;
      }
    });
    if (secondaryDups.length > 0) {
      if (duplicateIds === null) duplicateIds = secondaryDups;
      else duplicateIds = duplicateIds.concat(secondaryDups);
      duplicateIds.sort(function (a, b) {
        return a.kind < b.kind ? -1 : a.kind > b.kind ? 1
          : String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0;
      });
    }

    var failures = [];
    var degradationReasons = [];
    function fail(msg) { failures.push(msg); }

    if (duplicateIds) {
      duplicateIds.forEach(function (d) {
        fail("duplicate canonical id " + d.id + " in kind " + d.kind +
          " (" + d.count + " records)");
      });
    }
    contamination.candidateNodeIds.forEach(function (nodeId) {
      var rk = nodes[nodeId].record && nodes[nodeId].record.recordKind;
      fail("candidate contamination: node " + nodeId +
        " carries non-canonical recordKind " + rk);
    });
    contamination.frozenArtifactNodeIds.forEach(function (nodeId) {
      fail("frozen-artifact contamination: node " + nodeId +
        " carries recordKind " + FROZEN_ARTIFACT_KIND);
    });
    contamination.unknownKindNodes.forEach(function (nodeId) {
      fail("node " + nodeId + " has kind " + nodes[nodeId].kind +
        " outside NODE_KINDS");
    });
    edgeTypesCheck.invalidEdges.forEach(function (e) {
      fail("edge " + e.from + " -> " + e.to + " has type " + e.type +
        " outside EDGE_TYPES");
    });
    cycles.cycles.forEach(function (c) {
      fail("PARENT cycle: " + c.join(" -> "));
    });
    matches.mismatches.forEach(function (m) {
      fail("MATCHES pair with mismatched rawIds: " + m.from + " -> " + m.to);
    });
    // A failure list is a diagnostic, not a dump: cap it, and say so.
    var FAILURE_CAP = 100;
    if (failures.length > FAILURE_CAP) {
      var omitted = failures.length - FAILURE_CAP;
      failures = failures.slice(0, FAILURE_CAP);
      failures.push("+" + omitted + " further failures omitted");
    }

    if (unresolved.count !== null && unresolved.count > 0) {
      degradationReasons.push("unresolved references: " + unresolved.count);
    }
    sources.degraded.forEach(function (name) {
      degradationReasons.push("source " + name + " is " + sources.states[name]);
    });

    var computed = {
      orphanCount: true,
      conflictCount: conflicts.computed === true,
      staleCount: freshness.computed === true,
      duplicateIds: duplicates.computed,
      contamination: true,
      parentCycle: true,
      invalidEdgeType: true,
      matchesMismatch: true,
      unresolvedCount: unresolved.computed,
      sourceStates: sources.computed,
      edgelessNodes: true
    };
    arr(options.requiredChecks).forEach(function (name) {
      if (computed[name] === false) {
        degradationReasons.push("required check " + name +
          " did not run (computed: false)");
      }
    });

    var status = "OK";
    if (failures.length > 0) status = "FAILED";
    else if (degradationReasons.length > 0) status = "DEGRADED";

    return {
      contractVersion: CONTRACT_VERSION,
      generatedFrom: {
        head: options.head !== undefined ? options.head : null,
        cacheVersion: options.cacheVersion !== undefined ? options.cacheVersion : null,
        dbVersion: options.dbVersion !== undefined ? options.dbVersion : null
      },
      status: status,
      nodeCount: Object.keys(nodes).length,
      relationshipCount: edges.length,
      unresolvedCount: unresolved.count,
      orphanCount: orphans.count,
      // WE-3 measures both counts when FreshnessPolicy is loaded;
      // without it they are null (unmeasured), never a 0. The
      // `freshness` / `conflicts` detail objects carry the full
      // census so a 0 is interpretable (how many were UNKNOWN, how
      // many twin fields were actually compared).
      conflictCount: conflicts.computed === true ? conflicts.conflictCount : null,
      staleCount: freshness.computed === true ? freshness.stale : null,
      freshness: freshness,
      conflicts: conflicts,
      byKind: byKind,
      byEdgeType: byEdgeType,
      unresolved: unresolved.list,
      orphans: orphans.orphans,
      edgelessNodes: orphans.edgelessNodes,
      duplicateIds: duplicateIds,
      contamination: {
        candidateNodes: contamination.candidateNodes,
        frozenArtifactNodes: contamination.frozenArtifactNodes
      },
      sourceStates: sources.states,
      failures: failures,
      degradationReasons: degradationReasons,
      computed: computed
    };
  }

  global.IntegrityEngine = {
    CONTRACT_VERSION: CONTRACT_VERSION,
    NODE_KINDS: NODE_KINDS,
    EDGE_TYPES: EDGE_TYPES,
    TAXONOMY_LEVELS: TAXONOMY_LEVELS,
    CANDIDATE_RECORD_KINDS: CANDIDATE_RECORD_KINDS,
    FROZEN_ARTIFACT_KIND: FROZEN_ARTIFACT_KIND,
    checkUnresolved: checkUnresolved,
    checkOrphans: checkOrphans,
    checkDuplicates: checkDuplicates,
    checkDuplicateNodes: checkDuplicateNodes,
    checkContamination: checkContamination,
    checkEdgeTypes: checkEdgeTypes,
    checkParentCycles: checkParentCycles,
    checkMatches: checkMatches,
    normalizeSourceStates: normalizeSourceStates,
    assessCollection: assessCollection
  };
})(typeof window !== "undefined" ? window : this);
