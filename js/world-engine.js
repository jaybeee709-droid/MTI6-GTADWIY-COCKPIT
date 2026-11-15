/* MTI6-GTADWIY-COCKPIT — World Engine Relationship Core (World Engine
 * Depth Package, Item 1)
 *
 * One read-only relationship resolver over the platform's existing
 * registries. Screens and layers ask this module "what relates to this
 * entity?" once, instead of each doing its own pairwise defensive reads
 * of a dozen other modules.
 *
 * WHAT THIS MODULE IS:
 *   - A pure graph builder over record snapshots (buildGraph) plus a
 *     defensive live collector (collect/collectGraph) that reads the
 *     already-loaded intelligence modules through their public APIs.
 *   - An index of relationships that ALREADY EXIST as fields on real
 *     records: taxonomy parentRef / relatedActivities / strategySources,
 *     opportunity asset/network/protocol/activity refs, position refs,
 *     bot-assignment subjects, risk-profile subjects, wallet networks.
 *
 * WHAT THIS MODULE IS NOT:
 *   - Not a data store. It writes nothing, persists nothing, and holds
 *     no copy of any record beyond the graph a caller builds and keeps.
 *   - Not a source of truth. The registries stay authoritative; this is
 *     a derived, rebuildable index over them.
 *   - Not a data source. It invents no entities and no relationships:
 *     an edge exists only when a real record field names both ends.
 *
 * Truth rules enforced here (do not weaken them):
 *   - A reference to an id that has no node in the graph is NEVER
 *     promoted into a phantom node. It is counted and listed in
 *     graph.unresolved so a consumer can show "references something
 *     not registered" honestly instead of fabricating an entity.
 *   - Verification/freshness states are carried from the source record
 *     onto its node and edges unchanged. Nothing is upgraded: an
 *     UNVERIFIED record's relationships are UNVERIFIED relationships.
 *   - A source module that is absent or throws is reported in
 *     sourceStates as NOT_LOADED / ERROR with count 0 — never silently
 *     treated as "loaded and empty" by collectGraph callers who read
 *     sourceStates, and never allowed to crash the collection.
 *   - No DOM, no network, no storage, no secrets, no execution path.
 */
(function (global) {
  "use strict";

  var VERSION = 1;

  var NODE_KINDS = ["CRYPTO_RECORD", "ASSET", "NETWORK", "WALLET",
    "OPPORTUNITY", "POSITION", "PRINCIPAL", "ASSIGNMENT",
    "RISK_PROFILE", "COST", "ANGEL", "ALERT"];

  var EDGE_TYPES = ["PARENT", "FAMILY", "RELATED_TO", "SOURCE_TYPE",
    "ON_NETWORK", "USES_PROTOCOL", "INSTANTIATES", "HELD_IN",
    "OPENED_FROM", "ASSIGNED_TO", "ASSIGNMENT_SUBJECT", "PROFILE_OF",
    "SUPPORTS_NETWORK", "RAISED_FOR", "MATCHES"];

  function str(v) { return typeof v === "string" && v.length > 0 ? v : null; }
  function arr(v) { return Array.isArray(v) ? v : []; }

  // ---- Node construction -------------------------------------------------

  function makeNode(kind, rawId, label, record) {
    return {
      nodeId: kind.toLowerCase().replace("_record", "") + ":" + rawId,
      kind: kind,
      rawId: rawId,
      label: label || rawId,
      registry: record && str(record.registry) ? record.registry : null,
      level: record && str(record.level) ? record.level : null,
      verificationStatus: record && str(record.verificationStatus)
        ? record.verificationStatus : null,
      record: record || null
    };
  }

  // Maps an assignment/risk subject (type + id) to candidate node ids,
  // most specific first. Mirrors the subject vocabularies already used
  // by CryptoBotAssignments and RiskIntelligence.
  function subjectNodeCandidates(subjectType, subjectId) {
    var t = String(subjectType || "").toLowerCase();
    if (t === "asset") return ["asset:" + subjectId, "crypto:" + subjectId];
    if (t === "network" || t === "chain") return ["network:" + subjectId, "crypto:" + subjectId];
    if (t === "wallet") return ["wallet:" + subjectId];
    if (t === "opportunity") return ["opportunity:" + subjectId];
    if (t === "position") return ["position:" + subjectId];
    // protocol, activity, strategy, type, market, and anything else the
    // current vocabularies allow resolve against the Crypto World store.
    return ["crypto:" + subjectId];
  }

  // ---- Graph builder (pure) ----------------------------------------------

  function buildGraph(snapshot) {
    snapshot = snapshot || {};
    var nodes = {};       // nodeId -> node
    var edges = [];       // {from, to, type, verificationStatus}
    var unresolved = [];  // {from, ref, type} — named but not registered
    var edgeKeys = {};

    function addNode(node) {
      if (!node || nodes[node.nodeId]) return nodes[node.nodeId] || node;
      nodes[node.nodeId] = node;
      return node;
    }

    function addEdge(fromId, toId, type, status) {
      var key = fromId + "|" + type + "|" + toId;
      if (edgeKeys[key]) return;
      edgeKeys[key] = true;
      edges.push({ from: fromId, to: toId, type: type,
        verificationStatus: status || null });
    }

    // Resolve a reference: link to the first candidate node that exists,
    // otherwise record it as unresolved (never invent the target).
    function link(fromId, candidates, type, status) {
      for (var i = 0; i < candidates.length; i++) {
        if (nodes[candidates[i]]) { addEdge(fromId, candidates[i], type, status); return; }
      }
      unresolved.push({ from: fromId, ref: candidates[0], type: type });
    }

    function cryptoRef(id) { return ["crypto:" + id]; }
    function assetRef(id) { return ["asset:" + id, "crypto:" + id]; }
    function networkRef(id) { return ["network:" + id, "crypto:" + id]; }

    var i, rec, node;

    // -- Pass 1: create every node before linking anything, so link
    //    resolution never depends on input ordering.

    arr(snapshot.cryptoRecords).forEach(function (r) {
      if (!r || !str(r.id)) return;
      addNode(makeNode("CRYPTO_RECORD", r.id, str(r.title) || str(r.name), r));
    });
    arr(snapshot.assets).forEach(function (r) {
      var id = r && (str(r.assetId) || str(r.id));
      if (!id) return;
      addNode(makeNode("ASSET", id, str(r.name) || str(r.title), r));
    });
    arr(snapshot.networks).forEach(function (r) {
      var id = r && (str(r.networkId) || str(r.id));
      if (!id) return;
      addNode(makeNode("NETWORK", id, str(r.name) || str(r.title), r));
    });
    arr(snapshot.wallets).forEach(function (r) {
      var id = r && (str(r.walletId) || str(r.id));
      if (!id) return;
      addNode(makeNode("WALLET", id, str(r.label) || str(r.name), r));
    });
    arr(snapshot.opportunities).forEach(function (r) {
      if (!r || !str(r.id)) return;
      addNode(makeNode("OPPORTUNITY", r.id, str(r.title) || str(r.name), r));
    });
    arr(snapshot.positions).forEach(function (r) {
      var id = r && (str(r.positionId) || str(r.id));
      if (!id) return;
      addNode(makeNode("POSITION", id, str(r.title) || str(r.name), r));
    });
    arr(snapshot.principals).forEach(function (r) {
      if (!r || !str(r.id)) return;
      addNode(makeNode("PRINCIPAL", r.id,
        str(r.displayName) || str(r.name), r));
    });
    arr(snapshot.assignments).forEach(function (r) {
      var id = r && (str(r.assignmentId) || str(r.id));
      if (!id) return;
      addNode(makeNode("ASSIGNMENT", id, str(r.roleId) || "assignment", r));
    });
    arr(snapshot.riskProfiles).forEach(function (r) {
      var id = r && (str(r.profileId) || str(r.id));
      if (!id) return;
      addNode(makeNode("RISK_PROFILE", id, "risk profile", r));
    });
    arr(snapshot.costRecords).forEach(function (r) {
      var id = r && (str(r.costId) || str(r.id));
      if (!id) return;
      addNode(makeNode("COST", id, str(r.kind) || "cost", r));
    });
    arr(snapshot.angels).forEach(function (r) {
      var id = r && (str(r.angelId) || str(r.id));
      if (!id) return;
      addNode(makeNode("ANGEL", id, str(r.name) || str(r.identityId), r));
    });
    arr(snapshot.alerts).forEach(function (r) {
      var id = r && (str(r.alertId) || str(r.id));
      if (!id) return;
      addNode(makeNode("ALERT", id, str(r.title) || str(r.alertClassId), r));
    });

    // A Crypto World chains-registry record and a NetworkIntelligence
    // network with the same id are two views of one thing: say so with
    // a MATCHES edge instead of pretending they are unrelated.
    Object.keys(nodes).forEach(function (nodeId) {
      var n = nodes[nodeId];
      if (n.kind === "CRYPTO_RECORD" && n.registry === "chains" &&
          nodes["network:" + n.rawId]) {
        addEdge(nodeId, "network:" + n.rawId, "MATCHES", n.verificationStatus);
      }
      if (n.kind === "CRYPTO_RECORD" && n.registry === "assets" &&
          nodes["asset:" + n.rawId]) {
        addEdge(nodeId, "asset:" + n.rawId, "MATCHES", n.verificationStatus);
      }
    });

    // -- Pass 2: derive edges from the relationship fields that already
    //    exist on the records. Nothing else creates an edge.

    arr(snapshot.cryptoRecords).forEach(function (r) {
      if (!r || !str(r.id)) return;
      var from = "crypto:" + r.id, st = str(r.verificationStatus);
      if (str(r.parentRef)) link(from, cryptoRef(r.parentRef), "PARENT", st);
      if (str(r.primaryFamily)) link(from, cryptoRef(r.primaryFamily), "FAMILY", st);
      arr(r.relatedFamilies).forEach(function (f) {
        if (str(f)) link(from, cryptoRef(f), "FAMILY", st);
      });
      arr(r.relatedActivities).forEach(function (a) {
        if (str(a)) link(from, cryptoRef(a), "RELATED_TO", st);
      });
      arr(r.strategySources).forEach(function (s) {
        if (str(s)) link(from, cryptoRef(s), "SOURCE_TYPE", st);
      });
    });

    arr(snapshot.assets).forEach(function (r) {
      var id = r && (str(r.assetId) || str(r.id));
      if (!id) return;
      var from = "asset:" + id, st = str(r.verificationStatus);
      [r.chain, r.network, r.chainId, r.networkId].forEach(function (ref) {
        if (str(ref)) link(from, networkRef(ref), "ON_NETWORK", st);
      });
    });

    arr(snapshot.wallets).forEach(function (r) {
      var id = r && (str(r.walletId) || str(r.id));
      if (!id) return;
      var from = "wallet:" + id, st = str(r.verificationStatus);
      arr(r.networks).concat(arr(r.chains)).forEach(function (ref) {
        var refId = str(ref) || (ref && str(ref.id));
        if (refId) link(from, networkRef(refId), "SUPPORTS_NETWORK", st);
      });
    });

    arr(snapshot.opportunities).forEach(function (r) {
      if (!r || !str(r.id)) return;
      var from = "opportunity:" + r.id, st = str(r.verificationStatus);
      if (str(r.assetRef)) link(from, assetRef(r.assetRef), "INSTANTIATES", st);
      if (str(r.networkRef)) link(from, networkRef(r.networkRef), "ON_NETWORK", st);
      if (str(r.protocolRef)) link(from, cryptoRef(r.protocolRef), "USES_PROTOCOL", st);
      if (str(r.majorActivityId)) link(from, cryptoRef(r.majorActivityId), "INSTANTIATES", st);
      if (str(r.typeId)) link(from, cryptoRef(r.typeId), "INSTANTIATES", st);
      if (str(r.strategyId)) link(from, cryptoRef(r.strategyId), "INSTANTIATES", st);
      var wa = r.workerAssignment;
      var principalId = str(wa) || (wa && (str(wa.principalId) || str(wa.workerId)));
      if (principalId) link(from, ["principal:" + principalId], "ASSIGNED_TO", st);
    });

    arr(snapshot.positions).forEach(function (r) {
      var id = r && (str(r.positionId) || str(r.id));
      if (!id) return;
      var from = "position:" + id, st = str(r.verificationStatus);
      arr(r.assetIds).forEach(function (a) {
        if (str(a)) link(from, assetRef(a), "INSTANTIATES", st);
      });
      if (str(r.networkId)) link(from, networkRef(r.networkId), "ON_NETWORK", st);
      if (str(r.protocolId)) link(from, cryptoRef(r.protocolId), "USES_PROTOCOL", st);
      if (str(r.activityId)) link(from, cryptoRef(r.activityId), "INSTANTIATES", st);
      if (str(r.strategyId)) link(from, cryptoRef(r.strategyId), "INSTANTIATES", st);
      if (str(r.walletId)) link(from, ["wallet:" + r.walletId], "HELD_IN", st);
      arr(r.opportunityIds).forEach(function (o) {
        if (str(o)) link(from, ["opportunity:" + o], "OPENED_FROM", st);
      });
    });

    arr(snapshot.assignments).forEach(function (r) {
      var id = r && (str(r.assignmentId) || str(r.id));
      if (!id) return;
      var from = "assignment:" + id, st = str(r.verificationStatus);
      if (str(r.principalId)) link(from, ["principal:" + r.principalId], "ASSIGNED_TO", st);
      if (str(r.subjectId)) {
        link(from, subjectNodeCandidates(r.subjectType, r.subjectId),
          "ASSIGNMENT_SUBJECT", st);
      }
    });

    arr(snapshot.riskProfiles).forEach(function (r) {
      var id = r && (str(r.profileId) || str(r.id));
      if (!id) return;
      var subjectId = str(r.subjectId) || str(r.subjectRef);
      if (subjectId) {
        link("risk_profile:" + id, subjectNodeCandidates(r.subjectType, subjectId),
          "PROFILE_OF", str(r.verificationStatus));
      }
    });

    arr(snapshot.costRecords).forEach(function (r) {
      var id = r && (str(r.costId) || str(r.id));
      if (!id) return;
      var subjectId = str(r.subjectId) || str(r.opportunityId) || str(r.positionId);
      if (subjectId) {
        var candidates = str(r.opportunityId)
          ? ["opportunity:" + subjectId]
          : subjectNodeCandidates(r.subjectType, subjectId);
        link("cost:" + id, candidates, "PROFILE_OF", null);
      }
    });

    arr(snapshot.alerts).forEach(function (r) {
      var id = r && (str(r.alertId) || str(r.id));
      if (!id) return;
      var from = "alert:" + id;
      var subjectId = str(r.subjectId) || str(r.targetId) || str(r.walletId);
      if (subjectId) {
        link(from, subjectNodeCandidates(r.subjectType, subjectId), "RAISED_FOR", null);
      }
      var angelId = str(r.assignedAngelId) || str(r.angelId);
      if (angelId) link(from, ["angel:" + angelId], "ASSIGNED_TO", null);
    });

    // -- Adjacency + stats --------------------------------------------------

    var adjacency = {}; // nodeId -> [{nodeId, type, direction}]
    Object.keys(nodes).forEach(function (id) { adjacency[id] = []; });
    edges.forEach(function (e) {
      adjacency[e.from].push({ nodeId: e.to, type: e.type, direction: "out" });
      adjacency[e.to].push({ nodeId: e.from, type: e.type, direction: "in" });
    });

    var byKind = {};
    NODE_KINDS.forEach(function (k) { byKind[k] = 0; });
    Object.keys(nodes).forEach(function (id) { byKind[nodes[id].kind]++; });
    var byEdgeType = {};
    EDGE_TYPES.forEach(function (t) { byEdgeType[t] = 0; });
    edges.forEach(function (e) { byEdgeType[e.type]++; });

    return {
      nodes: nodes,
      edges: edges,
      adjacency: adjacency,
      unresolved: unresolved,
      stats: {
        nodeCount: Object.keys(nodes).length,
        edgeCount: edges.length,
        unresolvedCount: unresolved.length,
        byKind: byKind,
        byEdgeType: byEdgeType
      }
    };
  }

  // All relationships of one node, optionally filtered by kind/type.
  // Returns [] for an unknown node — an unknown entity has no
  // relationships here, and this function never invents any.
  function related(graph, nodeId, options) {
    if (!graph || !graph.adjacency || !graph.adjacency[nodeId]) return [];
    options = options || {};
    return graph.adjacency[nodeId]
      .filter(function (a) {
        if (options.type && a.type !== options.type) return false;
        if (options.kind) {
          var target = graph.nodes[a.nodeId];
          if (!target || target.kind !== options.kind) return false;
        }
        return true;
      })
      .map(function (a) {
        var target = graph.nodes[a.nodeId];
        return { nodeId: a.nodeId, kind: target ? target.kind : null,
          label: target ? target.label : a.nodeId,
          verificationStatus: target ? target.verificationStatus : null,
          type: a.type, direction: a.direction };
      });
  }

  // ---- Live collection (defensive) ---------------------------------------
  //
  // Every source is optional. A missing module, a missing function, or a
  // throw is recorded in sourceStates and contributes an empty list —
  // the same NOT LOADED honesty the rest of the cockpit uses.

  function collectSyncPart(name, fn, states) {
    try {
      if (typeof fn !== "function") { states[name] = { state: "NOT_LOADED", count: 0 }; return []; }
      var out = fn();
      var list = Array.isArray(out) ? out : [];
      states[name] = { state: "LOADED", count: list.length };
      return list;
    } catch (e) {
      states[name] = { state: "ERROR", count: 0 };
      return [];
    }
  }

  async function collect() {
    var states = {};
    var snapshot = {};

    // CryptoWorld records live in IndexedDB: getAllRecords is async.
    try {
      var CW = global.CryptoWorld;
      if (!CW || typeof CW.getAllRecords !== "function") {
        states.cryptoRecords = { state: "NOT_LOADED", count: 0 };
        snapshot.cryptoRecords = [];
      } else {
        var records = await CW.getAllRecords();
        snapshot.cryptoRecords = Array.isArray(records) ? records : [];
        states.cryptoRecords = { state: "LOADED", count: snapshot.cryptoRecords.length };
      }
    } catch (e) {
      states.cryptoRecords = { state: "ERROR", count: 0 };
      snapshot.cryptoRecords = [];
    }

    var AI = global.AssetIntelligence;
    snapshot.assets = collectSyncPart("assets",
      AI && typeof AI.listAssets === "function" ? function () { return AI.listAssets(); } : null, states);

    var NI = global.NetworkIntelligence;
    snapshot.networks = collectSyncPart("networks",
      NI && Array.isArray(NI.EXAMPLE_NETWORKS) ? function () { return NI.EXAMPLE_NETWORKS; } : null, states);

    var WI = global.WalletIntelligence;
    snapshot.wallets = collectSyncPart("wallets",
      WI && typeof WI.listWallets === "function" ? function () { return WI.listWallets(); } : null, states);

    var OI = global.OpportunityIntelligence;
    snapshot.opportunities = collectSyncPart("opportunities",
      OI && typeof OI.listOpportunities === "function" ? function () { return OI.listOpportunities(); } : null, states);

    var PI = global.PositionIntelligence;
    snapshot.positions = collectSyncPart("positions",
      PI && typeof PI.listPositions === "function" ? function () { return PI.listPositions(); } : null, states);

    var TP = global.TribePrincipals;
    snapshot.principals = collectSyncPart("principals",
      TP && typeof TP.listPrincipals === "function" ? function () { return TP.listPrincipals(); } : null, states);

    var CA = global.CryptoBotAssignments;
    snapshot.assignments = collectSyncPart("assignments",
      CA && typeof CA.listAssignments === "function" ? function () { return CA.listAssignments(); } : null, states);

    var RI = global.RiskIntelligence;
    snapshot.riskProfiles = collectSyncPart("riskProfiles",
      RI && typeof RI.listProfiles === "function" ? function () { return RI.listProfiles(); } : null, states);

    var CI = global.CostIntelligence;
    snapshot.costRecords = collectSyncPart("costRecords",
      CI && typeof CI.records === "function" ? function () { return CI.records(); } : null, states);

    var AS = global.AngelSecurity;
    snapshot.angels = collectSyncPart("angels",
      AS && typeof AS.listAngels === "function" ? function () { return AS.listAngels(); } : null, states);
    snapshot.alerts = collectSyncPart("alerts",
      AS && typeof AS.listAlerts === "function" ? function () { return AS.listAlerts(); } : null, states);

    return { snapshot: snapshot, sourceStates: states };
  }

  async function collectGraph() {
    var collected = await collect();
    return { graph: buildGraph(collected.snapshot),
      sourceStates: collected.sourceStates };
  }

  global.WorldEngine = {
    VERSION: VERSION,
    NODE_KINDS: NODE_KINDS,
    EDGE_TYPES: EDGE_TYPES,
    buildGraph: buildGraph,
    related: related,
    collect: collect,
    collectGraph: collectGraph
  };
})(window);
