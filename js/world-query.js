/* MTI6-GTADWIY-COCKPIT — World Engine query surface (contract §6)
 *
 * The shared deterministic World Engine query contract (§66 step 9,
 * Ruling 4 — adopted in full). One surface every consumer (STAR,
 * Universal Search, Crypto World, World Globe, Bot Operations) asks
 * instead of each reaching into the graph / collect internals in its
 * own way: core getters (§6.1), domain getters (§6.2), entity-centric
 * derived queries (§6.3 — dependencies, dependents, path, risks,
 * strategies, actions, evidence, freshness, assignments, alerts),
 * and the three summary objects (§6.4). Built in the spec's own
 * order inside this one module: core first, dependency/path next,
 * STAR-facing last (Ruling 4.1; WE-2 → WE-4 → WE-5).
 *
 * Contract sources: papers/files/world-engine-contract-proposal.md
 * §6 (§6.0 general rules, §6.1–§6.4) and §8 (consumer contract),
 * and papers/files/world-engine-contract-rulings-and-order.md
 * Ruling 4 + Part B step 9. This package consumes steps 5–8: the
 * truth projection (v101) in alert results, the final kind set with
 * PROTOCOL (v102), the integrity status carried by summaries (v103),
 * and the provenance projection for evidence/freshness (v104).
 *
 * DETERMINISM (§6.0, Ruling 4.3): same graph + same query = same
 * result, byte-for-byte. No wall-clock, no randomness, no hidden
 * state. Multi-result queries return nodeId-sorted order (edges by
 * from, to, type), except getDependencies / getDependents, which
 * sort by (shortest path depth, nodeId) — the depth they carry is
 * the stated otherwise. Nothing here is hard-coded: no query,
 * summary, or surface substitutes expected graph numbers for a
 * computation over the collected graph. Summaries stamp their
 * collection time only from the collection itself
 * (collection.collectedAt); a collection that carries no time
 * reports collectedAt null — a time is never invented here.
 *
 * INPUT: a collected graph (the object collectGraph() returns as
 * .graph), except the summary getters, which take a collection
 * ({ graph, sourceStates } — the collectGraph() return itself, plus
 * optional collectedAt / integrity / pipeline when the caller has
 * them). A bare graph is also accepted by the summaries, with
 * sourceStates {} and the honest degraded flag that follows from
 * having no collection state. Queries are pure functions of the
 * graph: no storage reads, no network, no clocks.
 *
 * HONEST EMPTINESS (§6.0, Ruling 4.5): a query that finds nothing
 * returns an empty array (getEntity: null). The reason class lives
 * in the collection's sourceStates, which the summaries carry:
 * NO_DATA (the collection ran and genuinely contains nothing) vs
 * UNKNOWN (the relevant source was NOT_LOADED / ERROR). Getters
 * take the graph only, so callers that need the reason read the
 * sourceStates of the collection they already hold
 * (WorldQuery.getSourceState(collection, part) is the companion
 * helper). A summary computed from a degraded collection carries
 * degraded: true and the measured degradedReasons.
 *
 * AMBIGUITY (§6.0, Ruling 4.6 — the Standing Anchor Rule as an API
 * rule): id parameters accept a full nodeId ("asset:eth-ethereum")
 * or a bare rawId plus an explicit kind context. A bare rawId that
 * matches more than one kind (e.g. "ethereum-mainnet" is both
 * crypto: and network:) is ambiguous and is NEVER guessed: every
 * id-taking query returns the ambiguity object { ambiguous: true,
 * rawId, candidates: [nodeIds, sorted] } instead of its normal
 * result. Callers resolve by kind or ask. An id that matches
 * nothing returns the empty result (getEntity: null).
 *
 * MATCHES TWINS ARE ONE ENTITY (§2.2, §8.2.5): the entity-centric
 * queries (getDependencies, getDependents, getRisks, getStrategies,
 * getAssignments, getAlerts, getEvidence, getFreshness) treat a
 * node's MATCHES twins as the same entity — a dependency or risk
 * recorded against the twin is the entity's. They never count both
 * endpoints as two entities. getEntity / getNeighbors /
 * getRelationships / getPath are node-level: they answer about the
 * exact node given (a path may still cross a MATCHES edge, since
 * MATCHES is a traversable edge type).
 *
 * TRUTH / PROVENANCE / FRESHNESS ACCOMPANY RESULTS (§6.3, §6.4):
 * getEvidence returns the §5.3 provenance projection; getFreshness
 * delegates to FreshnessPolicy (WE-3, contract §4/§6) and returns
 * CURRENT / STALE / UNKNOWN with a stated basis — never computed
 * from vibes (no window for the record's source class, or no
 * recorded attestation time, means UNKNOWN with the reason);
 * getAlerts carries the §4.4 (truth, alarm) projection per alert.
 * This module is self-contained: where it needs a projection that
 * steps 5–8 already implemented, it calls the shipped module when
 * loaded (Provenance.project, TruthProjection.projectAlertState,
 * FreshnessPolicy.assessEntity) and falls back to a faithful
 * inline implementation of the same tables otherwise, so its
 * behavior is identical in every load context. The harness
 * cross-checks both paths for equality on the real graph.
 *
 * MEASURED-ZERO RULE (binding, Ruling 5): a zero is reported only
 * when the detector actually ran. Counts here are measured by
 * running over the graph: unresolvedCount comes from
 * graph.unresolved (buildGraph's link() measures it); conflictCount
 * and staleCount are never reported by this surface at all — the
 * WE-3 detectors that measure them live in FreshnessPolicy and
 * are reported by the integrity engine, and this module does not
 * invent a second count. Where a count cannot be measured (e.g. a
 * graph with no stats / no unresolved list), the field is null,
 * never 0.
 *
 * related() IS RETAINED (Ruling 4.7): WorldEngine.related stays
 * the compatibility primitive. This surface is an evolution of it;
 * getNeighbors generalizes it. No existing consumer is rewired in
 * this package: no UI surface adopts the query surface here (STAR-
 * facing use is WE-5, a later phase). The private nodesOfKind in
 * js/globe-intelligence.js is the duplication Ruling 4 retires
 * when a consumer adopts this surface — that adoption is a later
 * package, not this one.
 *
 * DEPENDENCY / PATH are in this package (Ruling 4, adopted in
 * full): getDependencies / getDependents / getPath are §6.3, not a
 * later WE-4 package — the §66 order puts the whole §6 surface in
 * this one step (step 9), built core → dependency/path → STAR-facing
 * inside it. Explicitly NOT transaction routing (spec §28).
 *
 * Pure functions only: no DOM, no network, no secrets, no storage.
 * Same discipline as js/truth.js, js/integrity-engine.js and
 * js/provenance.js. This module writes nothing and mutates no
 * input: dependency results are copies carrying `depth`; every
 * other node result is the graph's own node reference, read-only
 * by contract (§8.2.4 — no consumer writes nodes/edges).
 */
(function (global) {
  "use strict";

  var CONTRACT_VERSION = "WE-CONTRACT-1";
  var QUERY_VERSION = 1;

  // The 14 kinds (§1.1–§1.3 + PROTOCOL, Ruling 1 Path B, v102).
  // Kept inline (not read off WorldEngine) so this module is
  // self-contained; the harness asserts equality with
  // WorldEngine.NODE_KINDS.
  var NODE_KINDS = ["CRYPTO_RECORD", "ASSET", "ASSET_CLASS", "NETWORK",
    "PROTOCOL", "WALLET", "OPPORTUNITY", "POSITION", "PRINCIPAL",
    "ASSIGNMENT", "RISK_PROFILE", "COST", "ANGEL", "ALERT"];

  // The 15 closed edge types (§2.1–§2.3).
  var EDGE_TYPES = ["PARENT", "FAMILY", "RELATED_TO", "SOURCE_TYPE",
    "ON_NETWORK", "USES_PROTOCOL", "INSTANTIATES", "HELD_IN",
    "OPENED_FROM", "ASSIGNED_TO", "ASSIGNMENT_SUBJECT", "PROFILE_OF",
    "SUPPORTS_NETWORK", "RAISED_FOR", "MATCHES"];

  // Dependency-bearing edges (§6.3 getDependencies): MATCHES is
  // excluded — a MATCHES twin is the same entity, not a dependency.
  // ASSIGNMENT_SUBJECT, RAISED_FOR, FAMILY, RELATED_TO and
  // SOURCE_TYPE are not in the contract's list and are excluded.
  var DEPENDENCY_EDGE_TYPES = ["PARENT", "ON_NETWORK", "USES_PROTOCOL",
    "INSTANTIATES", "HELD_IN", "OPENED_FROM", "PROFILE_OF",
    "SUPPORTS_NETWORK"];

  // Edges getStrategies walks (§6.3): recorded RELATED_TO /
  // SOURCE_TYPE links plus taxonomy paths (PARENT up/down, FAMILY).
  var STRATEGY_EDGE_TYPES = ["RELATED_TO", "SOURCE_TYPE", "PARENT",
    "FAMILY"];

  // getNeighbors depth bound (§6.1: depth > 1 is breadth-first with
  // cycle protection and a stated max, proposed max 4).
  var MAX_NEIGHBOR_DEPTH = 4;
  var DEFAULT_MAX_DEPTH = 4;

  // Opportunity PIPELINE_STATES (js/opportunity-intelligence.js) —
  // the closed list getSystemSummary.byStage zero-fills over.
  var PIPELINE_STATES = ["DISCOVERED", "IDENTIFIED", "DATA_VERIFIED",
    "ELIGIBILITY_CHECKED", "GROSS_ESTIMATED", "COSTS_ESTIMATED",
    "RISK_ANALYZED", "DEPENDENCIES_CHECKED", "FRESHNESS_CHECKED",
    "SIMULATED", "RANKED", "RECOMMENDED", "PREPARED"];

  // AngelSecurity lifecycle states (js/angel-security.js).
  var ALERT_STATES = ["DETECTED", "VERIFYING", "CONFIRMED", "ACTIVE",
    "MITIGATING", "RESOLVED", "POST_INCIDENT_REVIEW"];

  // The five Globe layers (js/globe-intelligence.js LAYER_DEFS) and
  // the graph kinds + collect() source keys each layer is built
  // from. getWorldSummary derives each layer's state from exactly
  // these, mirroring the Globe's own from-graph builders.
  var LAYER_DEFS = [
    { id: "WORLD", kinds: ["NETWORK"], sourceKeys: ["networks"] },
    { id: "CRYPTO", kinds: ["ASSET", "ASSET_CLASS"],
      sourceKeys: ["assets", "assetClasses"] },
    { id: "OPPORTUNITIES", kinds: ["OPPORTUNITY"],
      sourceKeys: ["opportunities"] },
    { id: "BOT_ACTIVITY", kinds: ["PRINCIPAL", "ASSIGNMENT"],
      sourceKeys: ["principals", "assignments"] },
    { id: "SECURITY_ALERTS", kinds: ["ALERT"], sourceKeys: ["alerts"] }
  ];

  function isString(v) { return typeof v === "string" && v.length > 0; }

  function clone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }

  function byNodeId(a, b) {
    if (a.nodeId < b.nodeId) return -1;
    if (a.nodeId > b.nodeId) return 1;
    return 0;
  }

  function byEdge(a, b) {
    if (a.from !== b.from) return a.from < b.from ? -1 : 1;
    if (a.to !== b.to) return a.to < b.to ? -1 : 1;
    if (a.type !== b.type) return a.type < b.type ? -1 : 1;
    return 0;
  }

  // The nodeId makeNode builds for a kind + rawId (§1.1).
  function nodeIdFor(kind, rawId) {
    return String(kind).toLowerCase().replace("_record", "") + ":" + rawId;
  }

  function isPlainObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  // Adjacency for traversal: the graph's own when buildGraph built
  // it, otherwise derived from graph.edges (same shape:
  // [{nodeId, type, direction}]). Every traversal sorts its
  // neighbor candidates by nodeId, so results are deterministic
  // either way.
  function adjacencyOf(graph) {
    if (graph && isPlainObject(graph.adjacency)) return graph.adjacency;
    var adj = {};
    if (graph && graph.nodes) {
      Object.keys(graph.nodes).forEach(function (id) { adj[id] = []; });
    }
    (graph && Array.isArray(graph.edges) ? graph.edges : [])
      .forEach(function (e) {
        if (!e || !isString(e.from) || !isString(e.to)) return;
        if (!adj[e.from]) adj[e.from] = [];
        if (!adj[e.to]) adj[e.to] = [];
        adj[e.from].push({ nodeId: e.to, type: e.type, direction: "out" });
        adj[e.to].push({ nodeId: e.from, type: e.type, direction: "in" });
      });
    return adj;
  }

  function sortedNodes(nodes) {
    return nodes.slice().sort(byNodeId);
  }

  // ---- Id resolution (§6.0) ------------------------------------------
  //
  // Full nodeId: used verbatim (a kind context is redundant — the id
  // is already kind-qualified). Bare rawId + kind: constructed.
  // Bare rawId, no kind: 0 matches → not_found; 1 → ok; >1 →
  // ambiguous (never guessed).
  function resolveId(graph, id, kind) {
    var none = { status: "not_found", nodeId: null, candidates: [] };
    if (!graph || !isPlainObject(graph.nodes) || !isString(id)) return none;
    if (id.indexOf(":") !== -1) {
      if (graph.nodes[id]) return { status: "ok", nodeId: id, candidates: [] };
      return none;
    }
    var k = kind !== undefined && kind !== null
      ? (typeof kind === "object" ? kind.kind : kind) : null;
    if (isString(k)) {
      var nid = nodeIdFor(k, id);
      if (graph.nodes[nid]) return { status: "ok", nodeId: nid, candidates: [] };
      return none;
    }
    var matches = [];
    Object.keys(graph.nodes).forEach(function (nodeId) {
      var n = graph.nodes[nodeId];
      if (n && n.rawId === id) matches.push(nodeId);
    });
    matches.sort();
    if (matches.length === 0) return none;
    if (matches.length === 1) {
      return { status: "ok", nodeId: matches[0], candidates: [] };
    }
    return { status: "ambiguous", nodeId: null, rawId: id, candidates: matches };
  }

  function ambiguityResult(resolved) {
    return { ambiguous: true, rawId: resolved.rawId || null,
      candidates: resolved.candidates.slice() };
  }

  // The node plus its MATCHES twins (§2.2 — one entity). Used by
  // the entity-centric queries; the twin set is the seed set, and
  // seeds are never returned as their own results.
  function twinNodeIds(graph, nodeId) {
    var out = [nodeId];
    var adj = adjacencyOf(graph);
    (adj[nodeId] || []).forEach(function (a) {
      if (a.type === "MATCHES" && out.indexOf(a.nodeId) === -1) {
        out.push(a.nodeId);
      }
    });
    return out;
  }

  function kindOf(options) {
    if (!options || typeof options !== "object") return null;
    return options.kind !== undefined ? options.kind : null;
  }

  // ---- §6.1 Core getters ---------------------------------------------

  // The node for an exact nodeId (or unambiguous rawId + kind).
  // Null means "not in this graph". Ambiguous bare rawId returns
  // the ambiguity object (§6.0).
  function getEntity(graph, id, kind) {
    var r = resolveId(graph, id, kind);
    if (r.status === "ambiguous") return ambiguityResult(r);
    if (r.status !== "ok") return null;
    return graph.nodes[r.nodeId] || null;
  }

  // All nodes of a kind, sorted by nodeId. An unknown kind has no
  // nodes: [] (measured empty, not an error — the kind list is
  // closed, so an unknown kind names nothing in any graph).
  function getNodesByKind(graph, kind) {
    if (!graph || !isPlainObject(graph.nodes) || !isString(kind)) return [];
    var out = [];
    Object.keys(graph.nodes).forEach(function (nodeId) {
      var n = graph.nodes[nodeId];
      if (n && n.kind === kind) out.push(n);
    });
    return sortedNodes(out);
  }

  // Generalizes related(): adjacent nodes filtered by edge direction
  // (out | in | both, default both — matching related() today),
  // edge type, and neighbor kind. depth defaults to 1; depth > 1 is
  // breadth-first with cycle protection, clamped to
  // MAX_NEIGHBOR_DEPTH (4, §6.1). The kind filter applies to the
  // returned nodes; intermediates of any kind may be stepped
  // through. Results are full nodes, sorted by nodeId; the start
  // node is never returned, even if a cycle leads back to it.
  function getNeighbors(graph, nodeId, options) {
    var kind = kindOf(options);
    var r = resolveId(graph, nodeId, kind);
    if (r.status === "ambiguous") return ambiguityResult(r);
    if (r.status !== "ok") return [];
    options = options || {};
    var direction = options.direction || "both";
    if (direction !== "out" && direction !== "in") direction = "both";
    var depth = typeof options.depth === "number" && options.depth > 0
      ? Math.floor(options.depth) : 1;
    if (depth > MAX_NEIGHBOR_DEPTH) depth = MAX_NEIGHBOR_DEPTH;
    var adj = adjacencyOf(graph);
    var seen = {};
    seen[r.nodeId] = true;
    var frontier = [r.nodeId];
    var found = {};
    var d = 0;
    while (frontier.length && d < depth) {
      d++;
      var next = [];
      frontier.forEach(function (id) {
        (adj[id] || []).forEach(function (a) {
          if (options.type && a.type !== options.type) return;
          if (direction === "out" && a.direction !== "out") return;
          if (direction === "in" && a.direction !== "in") return;
          if (seen[a.nodeId]) return;
          seen[a.nodeId] = true;
          next.push(a.nodeId);
          found[a.nodeId] = true;
        });
      });
      next.sort();
      frontier = next;
    }
    var out = [];
    Object.keys(found).forEach(function (id) {
      var n = graph.nodes[id];
      if (!n) return;
      if (options.kind && n.kind !== options.kind) return;
      out.push(n);
    });
    return sortedNodes(out);
  }

  // All edges touching the node, each annotated with the node's
  // role (from | to) and the other endpoint's nodeId. Sorted by
  // (from, to, type) (§6.0). The edge objects are copies carrying
  // the annotation; the graph is never mutated.
  function getRelationships(graph, nodeId, options) {
    var r = resolveId(graph, nodeId, kindOf(options));
    if (r.status === "ambiguous") return ambiguityResult(r);
    if (r.status !== "ok") return [];
    var id = r.nodeId;
    var out = [];
    (graph && Array.isArray(graph.edges) ? graph.edges : [])
      .forEach(function (e) {
        if (!e || (e.from !== id && e.to !== id)) return;
        var role = e.from === id ? "out" : "in";
        out.push({ from: e.from, to: e.to, type: e.type,
          verificationStatus: e.verificationStatus !== undefined
            ? e.verificationStatus : null,
          role: role, otherNodeId: role === "out" ? e.to : e.from });
      });
    return out.sort(byEdge);
  }

  // ---- §6.2 Domain getters -------------------------------------------
  //
  // getNodesByKind + kind-specific shaping; each returns nodes (with
  // records), never bare counts — counts are summaries (§6.4).
  // getProtocols returns PROTOCOL nodes (Path B, Ruling 1, v102):
  // the function signature and result shape are identical either
  // way; only the kind field of the results differs.

  function getNetworks(graph) { return getNodesByKind(graph, "NETWORK"); }
  function getAssets(graph) { return getNodesByKind(graph, "ASSET"); }
  function getProtocols(graph) { return getNodesByKind(graph, "PROTOCOL"); }
  function getOpportunities(graph) {
    return getNodesByKind(graph, "OPPORTUNITY");
  }

  // ---- §6.3 Entity-centric derived queries ---------------------------
  //
  // All return recorded relationships only. None computes anything
  // that is not in the graph; where the underlying model does not
  // exist yet, the honest empty result is returned instead of a
  // fiction (zero risk profiles → []; zero actions → []).

  // Shared dependency walk for getDependencies / getDependents.
  // Seeds are the entity's node + its MATCHES twins (one entity,
  // §2.2). Follows dependency-bearing edges (§6.3 list) in the
  // given direction; cycle-safe via the seen set; each result is a
  // copy of the node carrying `depth` — its shortest dependency
  // path length. Results sort by (depth, nodeId).
  function walkDependencies(graph, startIds, followOut, maxDepth) {
    var adj = adjacencyOf(graph);
    var seen = {};
    startIds.forEach(function (id) { seen[id] = 0; });
    var frontier = startIds.slice().sort();
    var out = [];
    var depth = 0;
    while (frontier.length && depth < maxDepth) {
      depth++;
      var next = [];
      frontier.forEach(function (id) {
        (adj[id] || []).forEach(function (a) {
          if (DEPENDENCY_EDGE_TYPES.indexOf(a.type) === -1) return;
          if (followOut && a.direction !== "out") return;
          if (!followOut && a.direction !== "in") return;
          if (seen.hasOwnProperty(a.nodeId)) return;
          seen[a.nodeId] = depth;
          next.push(a.nodeId);
          var node = graph.nodes[a.nodeId];
          if (node) {
            var copy = clone(node);
            copy.depth = depth;
            out.push(copy);
          }
        });
      });
      next.sort();
      frontier = next;
    }
    out.sort(function (a, b) {
      if (a.depth !== b.depth) return a.depth - b.depth;
      if (a.nodeId < b.nodeId) return -1;
      if (a.nodeId > b.nodeId) return 1;
      return 0;
    });
    return out;
  }

  function dependencyMaxDepth(options) {
    if (options && typeof options.maxDepth === "number" &&
        options.maxDepth > 0) return Math.floor(options.maxDepth);
    return DEFAULT_MAX_DEPTH;
  }

  // The set of nodes this node depends on, transitively, over
  // dependency-bearing edges. Each result carries its shortest
  // dependency path length as `depth`.
  function getDependencies(graph, nodeId, options) {
    var r = resolveId(graph, nodeId, kindOf(options));
    if (r.status === "ambiguous") return ambiguityResult(r);
    if (r.status !== "ok") return [];
    return walkDependencies(graph, twinNodeIds(graph, r.nodeId), true,
      dependencyMaxDepth(options));
  }

  // The reverse: everything that depends on this node.
  function getDependents(graph, nodeId, options) {
    var r = resolveId(graph, nodeId, kindOf(options));
    if (r.status === "ambiguous") return ambiguityResult(r);
    if (r.status !== "ok") return [];
    return walkDependencies(graph, twinNodeIds(graph, r.nodeId), false,
      dependencyMaxDepth(options));
  }

  // Shortest path as an ordered node/edge list, or null (no path in
  // the recorded graph — a fact, not an error). Deterministic
  // tie-breaking by nodeId order. Explicitly NOT transaction
  // routing (spec §28). A zero-length path (from === to) returns
  // { nodes: [id], edges: [] }. Each edge carries its direction
  // relative to the traversal ("out" = followed an out-edge).
  function getPath(graph, fromId, toId, options) {
    options = options || {};
    var rf = resolveId(graph, fromId, kindOf(options));
    if (rf.status === "ambiguous") return ambiguityResult(rf);
    var rt = resolveId(graph, toId, kindOf(options));
    if (rt.status === "ambiguous") return ambiguityResult(rt);
    if (rf.status !== "ok" || rt.status !== "ok") return null;
    var start = rf.nodeId, goal = rt.nodeId;
    if (start === goal) return { nodes: [start], edges: [] };
    var maxDepth = dependencyMaxDepth(options);
    var allowed = Array.isArray(options.allowedTypes)
      ? options.allowedTypes : null;
    var adj = adjacencyOf(graph);
    var parent = {};
    parent[start] = null;
    var parentEdge = {};
    var frontier = [start];
    var depth = 0;
    var found = false;
    while (frontier.length && depth < maxDepth && !found) {
      depth++;
      var next = [];
      frontier.forEach(function (id) {
        if (found) return;
        var cands = (adj[id] || []).slice().sort(function (a, b) {
          if (a.nodeId !== b.nodeId) return a.nodeId < b.nodeId ? -1 : 1;
          if (a.type !== b.type) return a.type < b.type ? -1 : 1;
          return 0;
        });
        cands.forEach(function (a) {
          if (found) return;
          if (allowed && allowed.indexOf(a.type) === -1) return;
          if (parent.hasOwnProperty(a.nodeId)) return;
          parent[a.nodeId] = id;
          parentEdge[a.nodeId] = { from: id, to: a.nodeId,
            type: a.type, direction: a.direction };
          next.push(a.nodeId);
          if (a.nodeId === goal) found = true;
        });
      });
      next.sort();
      frontier = next;
    }
    if (!parent.hasOwnProperty(goal)) return null;
    var nodes = [goal];
    var edges = [];
    var cur = goal;
    while (parent[cur] !== null) {
      edges.unshift(parentEdge[cur]);
      cur = parent[cur];
      nodes.unshift(cur);
    }
    return { nodes: nodes, edges: edges };
  }

  // RISK_PROFILE nodes whose PROFILE_OF targets the entity (or any
  // MATCHES twin of it). COST nodes also emit PROFILE_OF edges;
  // they are not risks and are excluded. Zero today → [] (NO_DATA).
  function getRisks(graph, entityId, options) {
    var r = resolveId(graph, entityId, kindOf(options));
    if (r.status === "ambiguous") return ambiguityResult(r);
    if (r.status !== "ok") return [];
    var twins = twinNodeIds(graph, r.nodeId);
    var out = {};
    (graph && Array.isArray(graph.edges) ? graph.edges : [])
      .forEach(function (e) {
        if (!e || e.type !== "PROFILE_OF") return;
        if (twins.indexOf(e.to) === -1) return;
        var n = graph.nodes[e.from];
        if (n && n.kind === "RISK_PROFILE") out[n.nodeId] = n;
      });
    return Object.keys(out).sort().map(function (id) { return out[id]; });
  }

  // STRATEGY-level CRYPTO_RECORD nodes connected to the entity via
  // recorded edges (RELATED_TO / SOURCE_TYPE / taxonomy paths).
  // Breadth-first over STRATEGY_EDGE_TYPES from the entity's twin
  // set, depth ≤ 4, cycle-safe; the entity's own nodes are never
  // returned. Sorted by nodeId.
  function getStrategies(graph, entityId, options) {
    var r = resolveId(graph, entityId, kindOf(options));
    if (r.status === "ambiguous") return ambiguityResult(r);
    if (r.status !== "ok") return [];
    var adj = adjacencyOf(graph);
    var seeds = twinNodeIds(graph, r.nodeId);
    var seen = {};
    seeds.forEach(function (id) { seen[id] = true; });
    var frontier = seeds.slice().sort();
    var found = {};
    var depth = 0;
    while (frontier.length && depth < 4) {
      depth++;
      var next = [];
      frontier.forEach(function (id) {
        (adj[id] || []).forEach(function (a) {
          if (STRATEGY_EDGE_TYPES.indexOf(a.type) === -1) return;
          if (seen[a.nodeId]) return;
          seen[a.nodeId] = true;
          next.push(a.nodeId);
          var n = graph.nodes[a.nodeId];
          if (n && n.kind === "CRYPTO_RECORD" && n.level === "STRATEGY") {
            found[a.nodeId] = n;
          }
        });
      });
      next.sort();
      frontier = next;
    }
    return Object.keys(found).sort().map(function (id) { return found[id]; });
  }

  // ACTION-level records under a strategy: nodes with level ACTION
  // holding a PARENT edge to the strategy. Zero exist today →
  // NO_DATA until Batch C or equivalent is separately authorized
  // and imported. The contract does not create actions.
  function getActions(graph, strategyId, options) {
    var r = resolveId(graph, strategyId, kindOf(options));
    if (r.status === "ambiguous") return ambiguityResult(r);
    if (r.status !== "ok") return [];
    var adj = adjacencyOf(graph);
    var out = [];
    (adj[r.nodeId] || []).forEach(function (a) {
      if (a.type !== "PARENT" || a.direction !== "in") return;
      var n = graph.nodes[a.nodeId];
      if (n && n.level === "ACTION") out.push(n);
    });
    return sortedNodes(out);
  }

  // ---- §5.3 provenance projection (for getEvidence) ------------------
  //
  // Delegates to the shipped Provenance.project when loaded (the
  // §66 step 8 implementation — the single source of truth at
  // runtime); otherwise the faithful inline implementation below,
  // which mirrors it field for field. The harness cross-checks both
  // paths for equality on every real record plus synthetic cases.
  // Source-type derivation (§5.3): derived ONLY where the record's
  // own fields determine it — "owner-seed" → OWNER_SEED,
  // "canonical-import" → SYSTEM_IMPORT, anything else → UNKNOWN.

  var EXCLUDED_RECORD_KINDS = ["ENTITY_CANDIDATE",
    "FROZEN_ENTITY_BATCH", "RESOURCE_CANDIDATE", "RESOURCE_GAP"];

  function deriveSourceType(record) {
    if (!isPlainObject(record)) return "UNKNOWN";
    if (record.source === "owner-seed") return "OWNER_SEED";
    if (record.source === "canonical-import") return "SYSTEM_IMPORT";
    return "UNKNOWN";
  }

  function isIso(value) {
    if (typeof value !== "string") return false;
    if (value.indexOf("T") === -1) return false;
    return !isNaN(Date.parse(value));
  }

  function projectProvenanceFallback(record) {
    var base = { source: "UNKNOWN", origin: "UNKNOWN",
      sourceType: "UNKNOWN", acquiredAt: null, retrievedAt: null,
      observedAt: null, evidence: [], transformationHistory: [],
      canonicalState: "CANONICAL", hasBlock: false, excluded: false,
      contractBug: false, blockErrors: [] };
    if (!isPlainObject(record)) {
      base.contractBug = true;
      base.blockErrors = ["project needs a record object."];
      return base;
    }
    if (EXCLUDED_RECORD_KINDS.indexOf(record.recordKind) !== -1) {
      base.excluded = true;
      base.canonicalState = null;
      base.reason = "recordKind " + record.recordKind +
        " is excluded from canonical views; its provenance stays on " +
        "the candidate pipeline's own fields.";
      if (isString(record.source)) base.source = record.source;
      return base;
    }
    if (isString(record.source)) base.source = record.source;
    if (!isPlainObject(record.provenance)) {
      base.sourceType = deriveSourceType(record);
      return base;
    }
    var b = record.provenance;
    var errors = [];
    if (b.source !== undefined && b.source !== null && !isString(b.source)) {
      errors.push("Provenance source must be a non-empty string.");
    }
    if (b.origin !== undefined && b.origin !== null && !isString(b.origin)) {
      errors.push("Provenance origin must be a non-empty string.");
    }
    var sourceTypes = ["OWNER_SEED", "OWNER_RECORDED", "OFFICIAL_DOCS",
      "REGISTRY", "PROVIDER", "CANDIDATE_PROMOTION", "SYSTEM_IMPORT",
      "UNKNOWN"];
    if (b.sourceType !== undefined && b.sourceType !== null &&
        sourceTypes.indexOf(b.sourceType) === -1) {
      errors.push("Provenance sourceType must be one of " +
        sourceTypes.join(", ") + ".");
    }
    ["acquiredAt", "retrievedAt", "observedAt"].forEach(function (k) {
      if (b[k] !== undefined && b[k] !== null && !isIso(b[k])) {
        errors.push("Provenance " + k +
          " must be an ISO-8601 timestamp or null.");
      }
    });
    // Evidence items and history entries are validated with the
    // candidate pipeline's rules (Ruling 3.1), exactly as
    // Provenance.validateBlock does — the fallback must agree with
    // the shipped module on malformed blocks, not only on valid
    // ones.
    var evidenceKinds = ["OWNER_STATEMENT", "OFFICIAL_DOC",
      "REGISTRY", "ONCHAIN_ANCHOR", "SECONDARY"];
    if (b.evidence !== undefined && b.evidence !== null) {
      if (!Array.isArray(b.evidence)) {
        errors.push("Provenance evidence must be an array.");
      } else {
        b.evidence.forEach(function (ev, i) {
          if (!isPlainObject(ev)) {
            errors.push("evidence[" + i + "]: Evidence must be an object.");
            return;
          }
          if (evidenceKinds.indexOf(ev.kind) === -1) {
            errors.push("evidence[" + i + "]: Evidence kind must be one of " +
              evidenceKinds.join(", ") + ".");
          }
          if (!isString(ev.ref)) {
            errors.push("evidence[" + i + "]: Evidence needs a ref (URL, id, or owner note).");
          }
          if (!isString(ev.capturedBy)) {
            errors.push("evidence[" + i + "]: Evidence needs capturedBy.");
          }
          if (ev.capturedAt && isNaN(Date.parse(ev.capturedAt))) {
            errors.push("evidence[" + i + "]: Evidence capturedAt must be a date.");
          }
        });
      }
    }
    if (b.transformationHistory !== undefined &&
        b.transformationHistory !== null) {
      if (!Array.isArray(b.transformationHistory)) {
        errors.push("Provenance transformationHistory must be an array.");
      } else {
        b.transformationHistory.forEach(function (e, i) {
          if (!isPlainObject(e)) {
            errors.push("transformationHistory[" + i + "]: History entry must be an object.");
            return;
          }
          if (!isIso(e.at)) {
            errors.push("transformationHistory[" + i + "]: History entry needs an ISO-8601 `at` timestamp.");
          }
          if (!isString(e.actor)) {
            errors.push("transformationHistory[" + i + "]: History entry needs an actor.");
          }
          if (!isString(e.action)) {
            errors.push("transformationHistory[" + i + "]: History entry needs an action.");
          }
          if (e.note !== undefined && e.note !== null &&
              typeof e.note !== "string") {
            errors.push("transformationHistory[" + i + "]: History entry note must be a string.");
          }
        });
      }
    }
    if (b.canonicalState !== undefined && b.canonicalState !== null &&
        b.canonicalState !== "CANONICAL") {
      errors.push("Provenance canonicalState must be \"CANONICAL\".");
    }
    if (errors.length) {
      base.contractBug = true;
      base.blockErrors = errors;
      base.sourceType = deriveSourceType(record);
      return base;
    }
    base.hasBlock = true;
    base.source = isString(b.source) ? b.source : base.source;
    base.origin = isString(b.origin) ? b.origin : "UNKNOWN";
    base.sourceType = b.sourceType !== undefined && b.sourceType !== null
      ? b.sourceType : "UNKNOWN";
    base.acquiredAt = b.acquiredAt !== undefined ? b.acquiredAt : null;
    base.retrievedAt = b.retrievedAt !== undefined ? b.retrievedAt : null;
    base.observedAt = b.observedAt !== undefined ? b.observedAt : null;
    base.evidence = Array.isArray(b.evidence) ? clone(b.evidence) : [];
    base.transformationHistory =
      Array.isArray(b.transformationHistory)
        ? clone(b.transformationHistory) : [];
    base.canonicalState = b.canonicalState !== undefined &&
      b.canonicalState !== null ? b.canonicalState : null;
    return base;
  }

  function projectProvenance(record) {
    if (global.Provenance &&
        typeof global.Provenance.project === "function") {
      return global.Provenance.project(record);
    }
    return projectProvenanceFallback(record);
  }

  // The record's provenance projection (§5.3): { source, origin,
  // sourceType, acquiredAt, retrievedAt, observedAt, evidence[],
  // transformationHistory[] } with UNKNOWN / null honestly in place.
  // Pre-v104 records project origin UNKNOWN, times null, evidence
  // [] — "no evidence recorded", which is exactly why the records
  // are UNVERIFIED. Provenance explains; it never promotes.
  function getEvidence(graph, entityId, options) {
    var r = resolveId(graph, entityId, kindOf(options));
    if (r.status === "ambiguous") return ambiguityResult(r);
    if (r.status !== "ok") return null;
    var node = graph.nodes[r.nodeId];
    return projectProvenance(node ? node.record : null);
  }

  // { state, basis, ... }: WE-3 freshness policy
  // (js/freshness-policy.js). The entity's MATCHES twins are one
  // entity (§6.0 header): the verdict is assessed over the twin
  // set, the latest attestation governing, and the basis names
  // the twin it was assessed from. A freshness answer is still
  // never computed from vibes: where the policy has no window
  // for the record's source class, or the record carries no
  // recorded attestation time, the answer is UNKNOWN with the
  // reason stated. When FreshnessPolicy is not loaded in this
  // context, the answer is UNKNOWN with the no-policy basis —
  // the pre-WE-3 behavior, preserved as the honest fallback.
  // options.now (ISO / Date / ms) fixes the evaluation time;
  // default is the real current time.
  function getFreshness(graph, entityId, options) {
    var r = resolveId(graph, entityId, kindOf(options));
    if (r.status === "ambiguous") return ambiguityResult(r);
    if (r.status !== "ok") return null;
    var twins = twinNodeIds(graph, r.nodeId);
    var node = graph.nodes[r.nodeId];
    var rec = node ? node.record : null;
    var lastChecked = null;
    if (isPlainObject(rec)) {
      if (isString(rec.lastChecked)) lastChecked = rec.lastChecked;
      else if (isPlainObject(rec.freshness) &&
          isString(rec.freshness.lastChecked)) {
        lastChecked = rec.freshness.lastChecked;
      }
    }
    var FP = global.FreshnessPolicy;
    if (!FP || typeof FP.assessEntity !== "function") {
      var basis = "No freshness policy exists (WE-3); freshness is " +
        "UNKNOWN until one does.";
      if (lastChecked) {
        basis += " Record lastChecked: " + lastChecked +
          " (reported, not judged — no window exists to judge it by).";
      } else {
        basis += " No lastChecked recorded on this record.";
      }
      return { state: "UNKNOWN", basis: basis, lastChecked: lastChecked };
    }
    var entries = twins.map(function (nodeId) {
      var n = graph.nodes[nodeId];
      return { nodeId: nodeId, record: n ? n.record : null };
    });
    var verdict = FP.assessEntity(entries,
      { now: options && options.now !== undefined ? options.now : undefined });
    var assessedNode = graph.nodes[verdict.assessedFrom];
    var assessedRec = assessedNode ? assessedNode.record : null;
    var assessedLC = null;
    if (isPlainObject(assessedRec)) {
      if (isString(assessedRec.lastChecked)) assessedLC = assessedRec.lastChecked;
      else if (isPlainObject(assessedRec.freshness) &&
          isString(assessedRec.freshness.lastChecked)) {
        assessedLC = assessedRec.freshness.lastChecked;
      }
    }
    return {
      state: verdict.state,
      basis: verdict.basis,
      lastChecked: assessedLC,
      sourceType: verdict.sourceType,
      attestedAt: verdict.attestedAt,
      windowMs: verdict.windowMs,
      ageMs: verdict.ageMs,
      assessedFrom: verdict.assessedFrom
    };
  }

  // ASSIGNMENT nodes and ASSIGNED_TO edges touching the entity, in
  // either direction, each labeled with direction (relative to the
  // entity). An entry is { assignment, edge, direction,
  // otherNodeId }: `assignment` is the ASSIGNMENT-kind endpoint
  // when one exists (or the entity itself when it is an ASSIGNMENT
  // node), else null — an ASSIGNED_TO edge recorded on an
  // opportunity/alert record has no ASSIGNMENT node, and the edge
  // is still returned, because it IS the recorded assignment.
  // Answerable only as RECORDED assignments; worker state is
  // NOT_CONNECTED until a real runtime exists (§8.3 Bot Operations).
  function getAssignments(graph, entityId, options) {
    var r = resolveId(graph, entityId, kindOf(options));
    if (r.status === "ambiguous") return ambiguityResult(r);
    if (r.status !== "ok") return [];
    var twins = twinNodeIds(graph, r.nodeId);
    var out = [];
    (graph && Array.isArray(graph.edges) ? graph.edges : [])
      .forEach(function (e) {
        if (!e || (e.type !== "ASSIGNED_TO" &&
            e.type !== "ASSIGNMENT_SUBJECT")) return;
        var onEntity = twins.indexOf(e.from) !== -1;
        var toEntity = twins.indexOf(e.to) !== -1;
        if (!onEntity && !toEntity) return;
        var direction = onEntity ? "out" : "in";
        var otherNodeId = onEntity ? e.to : e.from;
        var assignment = null;
        var fromNode = graph.nodes[e.from];
        var toNode = graph.nodes[e.to];
        if (fromNode && fromNode.kind === "ASSIGNMENT") assignment = fromNode;
        else if (toNode && toNode.kind === "ASSIGNMENT") assignment = toNode;
        else if (graph.nodes[r.nodeId] &&
            graph.nodes[r.nodeId].kind === "ASSIGNMENT") {
          assignment = graph.nodes[r.nodeId];
        }
        out.push({ assignment: assignment,
          edge: { from: e.from, to: e.to, type: e.type,
            verificationStatus: e.verificationStatus !== undefined
              ? e.verificationStatus : null },
          direction: direction, otherNodeId: otherNodeId });
      });
    out.sort(function (a, b) { return byEdge(a.edge, b.edge); });
    return out;
  }

  // ---- §4.4 alert (truth, alarm) projection (for getAlerts) -------
  //
  // Delegates to TruthProjection.projectAlertState when loaded (the
  // §66 step 5 implementation); otherwise the faithful inline table
  // below. The harness cross-checks both paths on every lifecycle
  // state. The CONFIRMED-and-beyond rows are the single sanctioned
  // promotion (§4.5 rule 1): they verify the ALERT RECORD ITSELF
  // through its recorded lifecycle — never any entity the alert
  // concerns.

  var ALERT_TRUTH = {
    DETECTED: { truth: "UNVERIFIED", alarm: false },
    VERIFYING: { truth: "UNVERIFIED", alarm: false },
    CONFIRMED: { truth: "VERIFIED", alarm: true },
    ACTIVE: { truth: "VERIFIED", alarm: true },
    MITIGATING: { truth: "VERIFIED", alarm: true },
    RESOLVED: { truth: "VERIFIED", alarm: false },
    POST_INCIDENT_REVIEW: { truth: "VERIFIED", alarm: false }
  };

  function projectAlertFallback(lifecycleState) {
    if (!isString(lifecycleState)) {
      return { state: "UNKNOWN", original: lifecycleState,
        source: "alert", contractBug: true,
        truth: "UNKNOWN", alarm: false };
    }
    if (lifecycleState === "NO_ALERTS") {
      return { state: "NO_ALERTS", original: lifecycleState,
        source: "alert", contractBug: false,
        truth: "NO_ALERTS", alarm: false };
    }
    if (ALERT_TRUTH.hasOwnProperty(lifecycleState)) {
      var m = ALERT_TRUTH[lifecycleState];
      return { state: m.truth, original: lifecycleState,
        source: "alert", contractBug: false,
        truth: m.truth, alarm: m.alarm };
    }
    return { state: "UNKNOWN", original: lifecycleState,
      source: "alert", contractBug: true,
      truth: "UNKNOWN", alarm: false };
  }

  function projectAlert(lifecycleState) {
    if (global.TruthProjection &&
        typeof global.TruthProjection.projectAlertState === "function") {
      return global.TruthProjection.projectAlertState(lifecycleState);
    }
    return projectAlertFallback(lifecycleState);
  }

  // ALERT nodes RAISED_FOR the entity, with lifecycle + §4.4
  // (truth, alarm) projection per alert. An alert with no
  // resolvable subject still exists as an ALERT node, but it is
  // not returned here — it concerns no entity this query names.
  // Entry: { alert, lifecycleState, truth, alarm, contractBug }.
  function getAlerts(graph, entityId, options) {
    var r = resolveId(graph, entityId, kindOf(options));
    if (r.status === "ambiguous") return ambiguityResult(r);
    if (r.status !== "ok") return [];
    var twins = twinNodeIds(graph, r.nodeId);
    var out = [];
    (graph && Array.isArray(graph.edges) ? graph.edges : [])
      .forEach(function (e) {
        if (!e || e.type !== "RAISED_FOR") return;
        if (twins.indexOf(e.to) === -1) return;
        var n = graph.nodes[e.from];
        if (!n || n.kind !== "ALERT") return;
        var rec = n.record || {};
        var lifecycleState = isString(rec.state) ? rec.state : null;
        var p = projectAlert(lifecycleState);
        out.push({ alert: n, lifecycleState: lifecycleState,
          truth: p.truth, alarm: p.alarm,
          contractBug: !!p.contractBug });
      });
    out.sort(function (a, b) {
      if (a.alert.nodeId < b.alert.nodeId) return -1;
      if (a.alert.nodeId > b.alert.nodeId) return 1;
      return 0;
    });
    return out;
  }

  // ---- §6.4 Summaries — the materializable unit --------------------
  //
  // Deterministic objects computed from a collection, shaped so a
  // future implementation may cache/materialize them (spec §50.9)
  // under the §8 invalidation rules. Summaries are DERIVED state —
  // never canonical, never a write target. Every summary carries
  // its collection's sourceStates and integrity status (the §6.4
  // rule): a summary computed from a degraded collection carries
  // degraded: true and the measured degradedReasons wherever it is
  // rendered. A cached summary is valid only until the next
  // governed write (§8.2.2).
  //
  // The collection is the collectGraph() return ({ graph,
  // sourceStates }), plus optional collectedAt / integrity /
  // pipeline when the caller has them. A bare graph is also
  // accepted (sourceStates {}, collectedAt null, integrity null) —
  // with the honest degraded flag that follows from having no
  // collection state.

  function collectionOf(input) {
    if (!input || typeof input !== "object") return null;
    if (input.graph && isPlainObject(input.graph)) return input;
    if (isPlainObject(input.nodes)) return { graph: input };
    return null;
  }

  function graphOf(input) {
    var c = collectionOf(input);
    return c ? c.graph : null;
  }

  function sourceStatesOf(input) {
    var c = collectionOf(input);
    if (c && isPlainObject(c.sourceStates)) return c.sourceStates;
    return {};
  }

  // The companion helper for the §6.0 honest-emptiness distinction:
  // the state of one collect() part ("LOADED" | "NOT_LOADED" |
  // "ERROR" | ...). A part the collection never reported is
  // "UNKNOWN" — never looked — not "NOT_LOADED", which would claim
  // the module did not load. (Deliberately stricter than the Globe
  // helper, which defaults absent parts to NOT_LOADED for view
  // fallback.)
  function getSourceState(input, part) {
    var states = sourceStatesOf(input);
    if (states[part] && isString(states[part].state)) {
      return states[part].state;
    }
    return "UNKNOWN";
  }

  function byKindOf(graph) {
    var byKind = {};
    NODE_KINDS.forEach(function (k) { byKind[k] = 0; });
    if (graph && graph.stats && isPlainObject(graph.stats.byKind)) {
      NODE_KINDS.forEach(function (k) {
        if (typeof graph.stats.byKind[k] === "number") {
          byKind[k] = graph.stats.byKind[k];
        }
      });
      return byKind;
    }
    if (graph && isPlainObject(graph.nodes)) {
      Object.keys(graph.nodes).forEach(function (id) {
        var n = graph.nodes[id];
        if (n && byKind.hasOwnProperty(n.kind)) byKind[n.kind]++;
      });
    }
    return byKind;
  }

  function graphCounts(graph) {
    if (graph && graph.stats &&
        typeof graph.stats.nodeCount === "number" &&
        typeof graph.stats.edgeCount === "number") {
      return {
        nodes: graph.stats.nodeCount,
        relationships: graph.stats.edgeCount,
        unresolved: Array.isArray(graph.unresolved)
          ? graph.unresolved.length : null
      };
    }
    return {
      nodes: graph && isPlainObject(graph.nodes)
        ? Object.keys(graph.nodes).length : null,
      relationships: graph && Array.isArray(graph.edges)
        ? graph.edges.length : null,
      unresolved: graph && Array.isArray(graph.unresolved)
        ? graph.unresolved.length : null
    };
  }

  // Degradation, measured from the collection itself (§7.2 Tier 2):
  // an unresolved reference above zero; a source NOT_LOADED/ERROR
  // in sourceStates; an integrity report that says DEGRADED/FAILED;
  // sourceStates not supplied at all (a summary from a bare graph
  // cannot vouch for completeness — §8.2.3). Never a hard-coded
  // status: with none of these, degraded is false.
  function degradedOf(input) {
    var states = sourceStatesOf(input);
    var reasons = [];
    if (Object.keys(states).length === 0) {
      reasons.push("sourceStates not supplied (collection state unknown)");
    }
    Object.keys(states).sort().forEach(function (part) {
      var st = states[part] && states[part].state;
      if (st === "NOT_LOADED" || st === "ERROR") {
        reasons.push("source " + part + " is " + st);
      }
    });
    var graph = graphOf(input);
    if (graph && Array.isArray(graph.unresolved) &&
        graph.unresolved.length > 0) {
      reasons.push("unresolved references: " + graph.unresolved.length);
    }
    var c = collectionOf(input);
    if (c && c.integrity && isPlainObject(c.integrity) &&
        (c.integrity.status === "DEGRADED" ||
         c.integrity.status === "FAILED")) {
      reasons.push("integrity status " + c.integrity.status);
    }
    return { degraded: reasons.length > 0, reasons: reasons };
  }

  // The items' truth of a layer (§4.4 layer table: ACTIVE carries
  // the layer's ITEMS' truth). Computed over items carrying a
  // verificationStatus — vocabulary nodes (ASSET_CLASS) carry none
  // and do not vote. One distinct value → that value; mixed →
  // UNKNOWN (no single truth); none carried → null.
  function itemsTruthOf(nodes) {
    var values = {};
    nodes.forEach(function (n) {
      if (n && isString(n.verificationStatus)) {
        values[n.verificationStatus] = true;
      }
    });
    var keys = Object.keys(values).sort();
    if (keys.length === 0) return null;
    if (keys.length === 1) return keys[0];
    return "UNKNOWN";
  }

  function layerStateFor(def, graph, input) {
    var nodes = [];
    def.kinds.forEach(function (k) {
      nodes = nodes.concat(getNodesByKind(graph, k));
    });
    var states = def.sourceKeys.map(function (key) {
      return getSourceState(input, key);
    });
    var allNotLoaded = states.every(function (s) { return s === "NOT_LOADED"; });
    var anyError = states.some(function (s) { return s === "ERROR"; });
    var entry = { id: def.id, state: "UNKNOWN",
      count: nodes.length, itemsTruth: itemsTruthOf(nodes) };
    if (def.id === "BOT_ACTIVITY") {
      // No worker runtime is connected — no bot is live (standing
      // rule; spec §23). The layer reports RECORDED principals and
      // assignments, never live activity.
      var principals = getNodesByKind(graph, "PRINCIPAL").length;
      var assignments = getNodesByKind(graph, "ASSIGNMENT").length;
      entry.state = allNotLoaded ? "NOT_LOADED" : "NOT_CONNECTED";
      entry.workersActive = 0;
      entry.workersState = "NOT_CONNECTED";
      entry.principalsRecorded = principals;
      entry.assignmentsRecorded = assignments;
      entry.itemsTruth = null;
      return entry;
    }
    if (allNotLoaded) { entry.state = "NOT_LOADED"; return entry; }
    if (anyError) { entry.state = "NOT_CONNECTED"; return entry; }
    if (nodes.length === 0) {
      entry.state = def.id === "SECURITY_ALERTS" ? "NO_ALERTS" : "NO_DATA";
      return entry;
    }
    if (def.id === "SECURITY_ALERTS") {
      var anyAlarm = nodes.some(function (n) {
        var rec = n.record || {};
        return projectAlert(isString(rec.state) ? rec.state : null).alarm;
      });
      entry.state = anyAlarm ? "ACTIVE" : "UNVERIFIED";
      return entry;
    }
    entry.state = "ACTIVE";
    return entry;
  }

  // getWorldSummary(collection) → { collectedAt, nodeCount, byKind,
  // layerStates (the five Globe layers with §4 projections),
  // integrity (§7 report reference), sourceStates, degraded,
  // degradedReasons, integrityAvailable }.
  function getWorldSummary(input) {
    var graph = graphOf(input);
    var c = collectionOf(input);
    var counts = graphCounts(graph);
    var deg = degradedOf(input);
    return {
      collectedAt: c && c.collectedAt !== undefined ? c.collectedAt : null,
      nodeCount: counts.nodes,
      byKind: byKindOf(graph),
      layerStates: LAYER_DEFS.map(function (def) {
        return layerStateFor(def, graph, input);
      }),
      integrity: c && c.integrity !== undefined ? c.integrity : null,
      integrityAvailable: !!(c && c.integrity !== undefined &&
        c.integrity !== null),
      sourceStates: sourceStatesOf(input),
      degraded: deg.degraded,
      degradedReasons: deg.reasons
    };
  }

  // getCryptoSummary(collection) → { networks, assets, protocols,
  // assetClasses, activitiesByLevel, strategies, entitiesTotal,
  // allUnverified, candidateCountsExcluded, sourceStates, degraded,
  // degradedReasons, integrity, integrityAvailable }. Counts only,
  // each traceable to getNodesByKind results. allUnverified is
  // MEASURED: true only when every CRYPTO_RECORD node's stored
  // verificationStatus is UNVERIFIED. candidateCountsExcluded is
  // the §0.3 invariant (candidates never enter the graph), stated
  // as the collection's property — not a count.
  function getCryptoSummary(input) {
    var graph = graphOf(input);
    var byKind = byKindOf(graph);
    var activitiesByLevel = { FAMILY: 0, MAJOR_ACTIVITY: 0, TYPE: 0,
      STRATEGY: 0 };
    var entitiesTotal = 0;
    var allUnverified = true;
    var cryptoNodes = getNodesByKind(graph, "CRYPTO_RECORD");
    cryptoNodes.forEach(function (n) {
      if (n.level && activitiesByLevel.hasOwnProperty(n.level)) {
        activitiesByLevel[n.level]++;
      }
      if (n.registry === "chains" || n.registry === "assets" ||
          n.registry === "protocols") entitiesTotal++;
      if (n.verificationStatus !== "UNVERIFIED") allUnverified = false;
    });
    var deg = degradedOf(input);
    var c = collectionOf(input);
    return {
      networks: byKind.NETWORK,
      assets: byKind.ASSET,
      protocols: byKind.PROTOCOL,
      assetClasses: byKind.ASSET_CLASS,
      activitiesByLevel: activitiesByLevel,
      strategies: activitiesByLevel.STRATEGY,
      entitiesTotal: entitiesTotal,
      allUnverified: allUnverified,
      candidateCountsExcluded: true,
      sourceStates: sourceStatesOf(input),
      degraded: deg.degraded,
      degradedReasons: deg.reasons,
      integrity: c && c.integrity !== undefined ? c.integrity : null,
      integrityAvailable: !!(c && c.integrity !== undefined &&
        c.integrity !== null)
    };
  }

  // getSystemSummary(collection) → { graph: { nodes, relationships,
  // unresolved }, pipeline (the EntityGate.pipelineSummary() shape,
  // passed through when the caller supplies it — candidates are
  // excluded from the graph by §0.3, so the pipeline summary is
  // produced by EntityGate, not by this surface; absent → null
  // with pipelineAvailable false, never a fabricated shape),
  // opportunities: { count, byStage }, alerts: { total, alarmCount,
  // state }, workforce: { principals, workers }, wallets: {
  // executionEnabled }, sourceStates, degraded, degradedReasons,
  // integrity, integrityAvailable }.
  //
  // byStage zero-fills the 13 PIPELINE_STATES (the pipelineSummary
  // convention) and adds "UNKNOWN" only when observed — a record
  // with an absent or unknown stage is UNKNOWN, never defaulted to
  // DISCOVERED (the opportunity view's default is that module's
  // presentation choice; the query surface reports the recorded
  // value). alerts.state: NO_ALERTS when the alert layer was read
  // and holds nothing; ACTIVE when any alarm is live; UNVERIFIED
  // when alerts exist but none is verified-and-active; UNKNOWN
  // when the alert source never loaded.
  function getSystemSummary(input) {
    var graph = graphOf(input);
    var counts = graphCounts(graph);
    var c = collectionOf(input);
    var byStage = {};
    PIPELINE_STATES.forEach(function (s) { byStage[s] = 0; });
    var oppUnknown = 0;
    getNodesByKind(graph, "OPPORTUNITY").forEach(function (n) {
      var rec = n.record || {};
      var stage = isString(rec.pipelineState) ? rec.pipelineState : null;
      if (stage && PIPELINE_STATES.indexOf(stage) !== -1) byStage[stage]++;
      else oppUnknown++;
    });
    if (oppUnknown > 0) byStage.UNKNOWN = oppUnknown;
    var alertNodes = getNodesByKind(graph, "ALERT");
    var alarmCount = 0;
    alertNodes.forEach(function (n) {
      var rec = n.record || {};
      if (projectAlert(isString(rec.state) ? rec.state : null).alarm) {
        alarmCount++;
      }
    });
    var alertSource = getSourceState(input, "alerts");
    var alertState;
    if (alertNodes.length === 0) {
      alertState = alertSource === "LOADED" ? "NO_ALERTS" : "UNKNOWN";
    } else {
      alertState = alarmCount > 0 ? "ACTIVE" : "UNVERIFIED";
    }
    var deg = degradedOf(input);
    return {
      graph: { nodes: counts.nodes,
        relationships: counts.relationships,
        unresolved: counts.unresolved },
      pipeline: c && c.pipeline !== undefined ? c.pipeline : null,
      pipelineAvailable: !!(c && c.pipeline !== undefined &&
        c.pipeline !== null),
      opportunities: { count: byKindOf(graph).OPPORTUNITY,
        byStage: byStage },
      alerts: { total: alertNodes.length, alarmCount: alarmCount,
        state: alertState },
      workforce: { principals: byKindOf(graph).PRINCIPAL,
        workers: "NOT_CONNECTED" },
      wallets: { executionEnabled: false },
      sourceStates: sourceStatesOf(input),
      degraded: deg.degraded,
      degradedReasons: deg.reasons,
      integrity: c && c.integrity !== undefined ? c.integrity : null,
      integrityAvailable: !!(c && c.integrity !== undefined &&
        c.integrity !== null)
    };
  }

  global.WorldQuery = {
    CONTRACT_VERSION: CONTRACT_VERSION,
    QUERY_VERSION: QUERY_VERSION,
    NODE_KINDS: NODE_KINDS.slice(),
    EDGE_TYPES: EDGE_TYPES.slice(),
    DEPENDENCY_EDGE_TYPES: DEPENDENCY_EDGE_TYPES.slice(),
    STRATEGY_EDGE_TYPES: STRATEGY_EDGE_TYPES.slice(),
    MAX_NEIGHBOR_DEPTH: MAX_NEIGHBOR_DEPTH,
    DEFAULT_MAX_DEPTH: DEFAULT_MAX_DEPTH,
    PIPELINE_STATES: PIPELINE_STATES.slice(),
    ALERT_STATES: ALERT_STATES.slice(),
    LAYER_DEFS: clone(LAYER_DEFS),
    resolveId: resolveId,
    getEntity: getEntity,
    getNodesByKind: getNodesByKind,
    getNeighbors: getNeighbors,
    getRelationships: getRelationships,
    getNetworks: getNetworks,
    getAssets: getAssets,
    getProtocols: getProtocols,
    getOpportunities: getOpportunities,
    getDependencies: getDependencies,
    getDependents: getDependents,
    getPath: getPath,
    getRisks: getRisks,
    getStrategies: getStrategies,
    getActions: getActions,
    getEvidence: getEvidence,
    getFreshness: getFreshness,
    getAssignments: getAssignments,
    getAlerts: getAlerts,
    getSourceState: getSourceState,
    getWorldSummary: getWorldSummary,
    getCryptoSummary: getCryptoSummary,
    getSystemSummary: getSystemSummary,
    // Exposed for the harness cross-checks only: the inline
    // fallbacks must agree with the shipped step 5 / step 8
    // modules on every input.
    _projectProvenanceFallback: projectProvenanceFallback,
    _projectAlertFallback: projectAlertFallback
  };
})(typeof window !== "undefined" ? window : this);
