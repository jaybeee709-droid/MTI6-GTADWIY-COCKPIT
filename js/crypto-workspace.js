/* MTI6-GTADWIY-COCKPIT — Crypto Workspace resolver + derivations (CW-2)
 *
 * Pure derivations for the shared Crypto Workspace Frame (Master
 * Directive §§83, 90, 103): given the canonical records and the
 * live module state handed in by the caller, compute everything a
 * workspace renders. NO DOM, NO fetches, NO writes — and NO invented
 * data: every value below is derived from records that exist, and
 * every empty result is an honest empty (World OS checklist rule 12:
 * measured-empty is NO_DATA, a module that never loaded is
 * NOT_LOADED — the two are never blurred).
 *
 * Consumers read relationships through here and the World Engine —
 * never through per-screen relationship logic of their own (§103).
 * Candidates never reach this module: callers pass
 * CryptoWorld.getAllRecords(), the single-filter canonical view.
 */
(function (global) {
  "use strict";

  var REG = global.CryptoWorkspaceRegistry || null;

  function arr(v) { return Array.isArray(v) ? v : []; }
  function str(v) { return typeof v === "string" && v.length > 0 ? v : null; }

  function indexRecords(records) {
    var byId = {};
    arr(records).forEach(function (r) { if (r && str(r.id)) byId[r.id] = r; });
    return byId;
  }

  function childrenOf(records, parentId, level) {
    return arr(records).filter(function (r) {
      return r && r.parentRef === parentId && (!level || r.level === level);
    });
  }

  // ---- §90 Activity -> Workspace resolver --------------------------------
  //
  // Any taxonomy record (family / major / type / strategy / action)
  // or canonical entity resolves to its workspace context: the
  // primary workspace, the secondaries, and the trail actually
  // traversed (F-24: canonical relationships, not folder structure).

  function resolveActivity(recordId, records) {
    if (!REG) return { found: false, recordId: recordId, reason: "REGISTRY_NOT_LOADED" };
    var byId = indexRecords(records);
    var rec = byId[recordId] || null;
    if (!rec) return { found: false, recordId: recordId, reason: "NOT_RECORDED" };

    // Canonical entity (chains / assets / protocols registries).
    if (rec.registry === "chains" || rec.registry === "assets" || rec.registry === "protocols") {
      return resolveEntity(rec, records, byId);
    }

    var major = null, type = null, strategy = null, action = null;
    if (rec.level === "MAJOR_ACTIVITY") major = rec;
    else if (rec.level === "TYPE") { type = rec; major = byId[rec.parentRef] || null; }
    else if (rec.level === "STRATEGY") {
      strategy = rec; type = byId[rec.parentRef] || null;
      major = type ? (byId[type.parentRef] || null) : null;
    } else if (rec.level === "ACTION") {
      action = rec; strategy = byId[rec.parentRef] || null;
      type = strategy ? (byId[strategy.parentRef] || null) : null;
      major = type ? (byId[type.parentRef] || null) : null;
    } else if (rec.level === "FAMILY") {
      return { found: true, kind: "family", record: rec, major: null,
        primaryWorkspace: null, secondaryWorkspaces: [],
        note: "Families are the organizational shell — they carry no workspace of their own; their Major Activities resolve individually.",
        trail: [{ label: "Crypto World", href: "#/crypto-world" }, { label: rec.title || rec.id, href: null }] };
    }
    if (!major) {
      return { found: true, kind: "orphan", record: rec, major: null,
        primaryWorkspace: null, secondaryWorkspaces: [],
        note: "This record's Major Activity parent is not in the loaded records — no workspace can be resolved, and none is guessed.",
        trail: [{ label: "Crypto World", href: "#/crypto-world" }] };
    }
    var res = REG.resolveMajor(major.id);
    var primary = res ? REG.getWorkspace(res.primary) : null;
    var trail = [{ label: "Crypto World", href: "#/crypto-world" }];
    if (primary) trail.push({ label: primary.title, href: REG.hrefFor(primary, major.id), workspaceId: primary.workspaceId });
    trail.push({ label: major.title || major.id, href: "#/encyclopedia/" + encodeURIComponent(major.id) });
    if (type) trail.push({ label: type.title || type.id, href: "#/encyclopedia/" + encodeURIComponent(type.id) });
    if (strategy) trail.push({ label: strategy.title || strategy.id, href: "#/encyclopedia/" + encodeURIComponent(strategy.id) });
    if (action) trail.push({ label: action.title || action.id, href: "#/encyclopedia/" + encodeURIComponent(action.id) });
    return {
      found: true, kind: "activity", record: rec,
      major: major, type: type, strategy: strategy, action: action,
      primaryWorkspace: primary ? primary.workspaceId : null,
      secondaryWorkspaces: res ? res.secondary : [],
      trail: trail
    };
  }

  function resolveEntity(rec, records, byId) {
    var kind = rec.registry === "chains" ? "networks" : rec.registry;
    var workspaces = [];
    function push(id) { if (id && workspaces.indexOf(id) === -1) workspaces.push(id); }
    if (kind === "networks") {
      push("networks");
      // Protocols recorded as operating on this network pull their
      // workspaces in as context — recorded refs only.
      arr(records).forEach(function (r) {
        if (r && r.registry === "protocols" && arr(r.networkRefs).indexOf(rec.id) !== -1) {
          arr(r.activityRefs).forEach(function (a) {
            var res = REG.resolveMajor(a);
            if (res) push(res.primary);
          });
        }
      });
    } else if (kind === "assets") {
      push("markets-assets");
      if (str(rec.networkRef)) push("networks");
    } else if (kind === "protocols") {
      arr(rec.activityRefs).forEach(function (a) {
        var res = REG.resolveMajor(a);
        if (res) push(res.primary);
      });
      // §1G anchor: the two oracle protocols carry intentionally
      // EMPTY activityRefs; their workspace is the Oracle workspace,
      // anchored through the oracle types — recorded in the CW-1
      // registry, not inferred here.
      if (rec.id === "protocol-chainlink" || rec.id === "protocol-pyth") push("oracle");
      if (!workspaces.length) push("protocols");
    }
    var primary = workspaces.length ? REG.getWorkspace(workspaces[0]) : null;
    var trail = [{ label: "Crypto World", href: "#/crypto-world" }];
    if (primary) trail.push({ label: primary.title, href: REG.hrefFor(primary, rec.id), workspaceId: primary.workspaceId });
    trail.push({ label: rec.title || rec.id, href: "#/encyclopedia/" + encodeURIComponent(rec.id) });
    return {
      found: true, kind: "entity", entityKind: kind, record: rec,
      major: null, type: null, strategy: null, action: null,
      primaryWorkspace: workspaces.length ? workspaces[0] : null,
      secondaryWorkspaces: workspaces.slice(1),
      trail: trail
    };
  }

  // ---- World Engine graph relationships (recorded edges only) ------------
  //
  // Mirrors WorldEngine.related()'s output shape over the graph's
  // own adjacency — the frame consumes the ONE graph (§103); this
  // helper exists so derivations stay pure over a handed-in graph.

  function relatedFromGraph(graph, nodeId) {
    if (!graph || !graph.adjacency || !graph.nodes || !graph.adjacency[nodeId]) return [];
    return graph.adjacency[nodeId].map(function (a) {
      var target = graph.nodes[a.nodeId];
      return { nodeId: a.nodeId, kind: target ? target.kind : null,
        label: target ? target.label : a.nodeId,
        verificationStatus: target ? target.verificationStatus : null,
        type: a.type, direction: a.direction };
    });
  }

  // The graph node ids a canonical record answers to: its own
  // CRYPTO_RECORD node, plus the twin ASSET / NETWORK node where the
  // graph recorded one (MATCHES edges join them).
  function nodeIdsForRecord(graph, rec) {
    if (!graph || !rec) return [];
    var ids = [];
    if (graph.nodes["crypto:" + rec.id]) ids.push("crypto:" + rec.id);
    if (rec.registry === "assets" && graph.nodes["asset:" + rec.id]) ids.push("asset:" + rec.id);
    if (rec.registry === "chains" && graph.nodes["network:" + rec.id]) ids.push("network:" + rec.id);
    return ids;
  }

  function dependenciesFor(graph, rec) {
    var out = [], seen = {};
    nodeIdsForRecord(graph, rec).forEach(function (nodeId) {
      relatedFromGraph(graph, nodeId).forEach(function (rel) {
        var key = rel.nodeId + "|" + rel.type + "|" + rel.direction;
        if (seen[key]) return;
        seen[key] = true;
        out.push(rel);
      });
    });
    return out;
  }

  // ---- Workspace data ------------------------------------------------------
  //
  // inputs: { records, opportunities, positions, costRecords,
  //   riskProfiles, alerts, assignments, graph,
  //   loaded: { opportunities, positions, costs, risks, alerts,
  //             assignments, graph } }
  // Every section carries its own loaded flag so the frame can say
  // NOT LOADED where a layer never arrived and NO_DATA where it
  // arrived empty (checklist rule 12).

  function workspaceData(workspaceId, inputs) {
    inputs = inputs || {};
    var loaded = inputs.loaded || {};
    var ws = REG ? REG.getWorkspace(workspaceId) : null;
    if (!ws) return { found: false, workspaceId: workspaceId };
    var records = arr(inputs.records);
    var byId = indexRecords(records);

    // -- activity tree over the workspace's primary majors (§91:
    //    drill-down inside the workspace, context carried).
    function treeFor(majorId, scopedTypeIds) {
      var major = byId[majorId] || null;
      if (!major) return null;
      var types = childrenOf(records, majorId, "TYPE");
      if (scopedTypeIds) types = types.filter(function (t) { return scopedTypeIds.indexOf(t.id) !== -1; });
      var strategyCount = 0;
      var typeTree = types.map(function (t) {
        var strategies = childrenOf(records, t.id, "STRATEGY");
        strategyCount += strategies.length;
        return { record: t, strategies: strategies };
      });
      return { record: major, types: typeTree, typeCount: types.length, strategyCount: strategyCount };
    }
    var majors = [];
    ws.majorIds.forEach(function (m) {
      var t = treeFor(m, ws.typeScope ? ws.typeScope[m] : null);
      if (t) majors.push(t);
    });
    var sharedMajors = [];
    arr(ws.sharedMajorIds).forEach(function (m) {
      var t = treeFor(m, ws.typeScope ? ws.typeScope[m] : null);
      if (t) sharedMajors.push(t);
    });
    var secondaryMajors = ws.secondaryMajorIds.map(function (m) { return byId[m] || null; }).filter(Boolean);
    var relatedRecords = arr(ws.relatedRecordIds).map(function (id) { return byId[id] || null; }).filter(Boolean);

    // -- entities: browsable at last, filtered by recorded links.
    var entityRecords = { networks: [], assets: [], protocols: [] };
    records.forEach(function (r) {
      if (!r) return;
      if (r.registry === "chains") entityRecords.networks.push(r);
      else if (r.registry === "assets") entityRecords.assets.push(r);
      else if (r.registry === "protocols") entityRecords.protocols.push(r);
    });
    var focusMajors = ws.majorIds.concat(ws.secondaryMajorIds, arr(ws.sharedMajorIds));
    var entityDriven = focusMajors.length === 0;
    function relevantProtocols() {
      if (entityDriven) return entityRecords.protocols;
      return entityRecords.protocols.filter(function (p) {
        return arr(p.activityRefs).some(function (a) { return focusMajors.indexOf(a) !== -1; });
      });
    }
    var protocols = ws.entityKinds.indexOf("protocols") !== -1 ? relevantProtocols() : [];
    var networks = [];
    if (ws.entityKinds.indexOf("networks") !== -1) {
      if (entityDriven || ws.workspaceId === "networks") networks = entityRecords.networks;
      else {
        var wanted = {};
        protocols.forEach(function (p) { arr(p.networkRefs).forEach(function (n) { wanted[n] = true; }); });
        networks = entityRecords.networks.filter(function (n) { return wanted[n.id]; });
      }
    }
    var assets = [];
    if (ws.entityKinds.indexOf("assets") !== -1) {
      if (entityDriven) assets = entityRecords.assets;
      else if (networks.length) {
        var netIds = networks.map(function (n) { return n.id; });
        assets = entityRecords.assets.filter(function (a) { return netIds.indexOf(a.networkRef) !== -1; });
      }
    }
    if (ws.relatedEntityIds) {
      // Seat feed (cw-modular): exactly the recorded entities named.
      networks = entityRecords.networks.filter(function (n) { return ws.relatedEntityIds.indexOf(n.id) !== -1; });
      assets = []; protocols = [];
    }
    var entities = { networks: networks, assets: assets, protocols: protocols,
      totals: { networks: entityRecords.networks.length, assets: entityRecords.assets.length, protocols: entityRecords.protocols.length } };

    // -- opportunities / positions (record systems; zero is honest).
    var opportunities = arr(inputs.opportunities).filter(function (o) {
      if (!o) return false;
      if (!focusMajors.length) return true;
      return focusMajors.indexOf(o.majorActivityId) !== -1 || focusMajors.indexOf(o.activityId) !== -1;
    });
    var positions = arr(inputs.positions);

    // -- costs: the workspace's §57 classes, each UNKNOWN unless a
    //    recorded cost names it (F-13: UNKNOWN is a rendered state,
    //    never silently zero).
    var costRecords = arr(inputs.costRecords);
    var costKindByClass = {
      NF: "NETWORK_GAS_COST", PF: "PROTOCOL_FEE", TF: "TRADING_SWAP_FEE",
      SL: "SLIPPAGE", BC: "BORROW_COST", FC: "FUNDING_COST", BF: "BRIDGE_COST"
    };
    var costs = ws.costClasses.map(function (code) {
      var kind = costKindByClass[code] || null;
      var named = kind ? costRecords.filter(function (c) { return c && c.kind === kind; }) : [];
      return { code: code, engineKind: kind, records: named,
        state: named.length ? "RECORDED" : "UNKNOWN" };
    });

    // -- risks: the workspace's §55 dimensions over recorded risk
    //    profiles only (F-14: dimensions with evidence, no score).
    //    §55 codes map to the RiskIntelligence canonical dimension
    //    names where a correspondence is recorded; OP and DP have
    //    no canonical dimension and say so rather than borrowing one.
    var riskProfiles = arr(inputs.riskProfiles);
    var RISK_DIM_BY_CODE = {
      SC: "Smart-contract risk", AS: "Token risk", PR: "Protocol risk",
      NW: "Chain/network risk", BR: "Bridge risk", OR: "Oracle risk",
      LQ: "Liquidity risk", CP: "Counterparty/custody risk", MK: "Market risk",
      LV: "Liquidation risk", DF: "Data-source risk"
    };
    var risks = ws.riskDimensions.map(function (code) {
      var dimName = RISK_DIM_BY_CODE[code] || null;
      var assessed = 0;
      if (dimName) {
        riskProfiles.forEach(function (p) {
          var e = p && p.dimensions ? p.dimensions[dimName] : null;
          if (e && e.state && e.state !== "UNKNOWN") assessed++;
        });
      }
      return { code: code, dimension: dimName, assessed: assessed };
    });

    // -- alerts: AngelSecurity records whose subject is in scope,
    //    plus unscoped alerts on security/risk surfaces.
    var scopeIds = {};
    focusMajors.forEach(function (m) { scopeIds[m] = true; });
    entities.networks.concat(entities.assets, entities.protocols).forEach(function (e) { scopeIds[e.id] = true; });
    var alerts = arr(inputs.alerts).filter(function (a) {
      if (!a) return false;
      var subj = str(a.subjectId) || str(a.targetId);
      if (ws.workspaceId === "security" || ws.workspaceId === "risk") return true;
      return subj ? !!scopeIds[subj] : false;
    });

    // -- bots: the workspace's §62 roles with their real assignment
    //    state. Assignment roleIds are the CryptoBotAssignments
    //    vocabulary; the map below is the recorded correspondence.
    var ROLE_TO_ASSIGNMENT = {
      MKT: ["market"], PRO: ["protocol"], NET: ["network"], AST: ["asset"],
      YLD: ["yield"], ARB: ["market", "routing"], RSK: ["risk"], SEC: ["security-intelligence"],
      RTE: ["routing", "bridge"], GOV: [], INF: ["depin", "network"], SRD: ["opportunity-discovery"],
      COD: ["provider"], VAL: ["opportunity-verification"]
    };
    var allAssignments = arr(inputs.assignments);
    var roles = ws.botRoles.map(function (code) {
      if (code === "ALL") return { code: code, assignments: allAssignments };
      var wanted = ROLE_TO_ASSIGNMENT[code] || [];
      return { code: code, assignments: allAssignments.filter(function (a) {
        return a && wanted.indexOf(a.roleId) !== -1;
      }) };
    });

    // -- sources / freshness over what the workspace shows.
    var shown = [];
    majors.forEach(function (m) { shown.push(m.record); m.types.forEach(function (t) { shown.push(t.record); t.strategies.forEach(function (s) { shown.push(s); }); }); });
    entities.networks.concat(entities.assets, entities.protocols).forEach(function (e) { shown.push(e); });
    var sourceNames = {}, verified = 0;
    shown.forEach(function (r) {
      if (str(r.source)) sourceNames[r.source] = true;
      if (r.verificationStatus === "VERIFIED") verified++;
    });

    return {
      found: true, workspace: ws,
      majors: majors, sharedMajors: sharedMajors, secondaryMajors: secondaryMajors,
      relatedRecords: relatedRecords,
      entities: entities,
      opportunities: { loaded: !!loaded.opportunities, records: opportunities, total: arr(inputs.opportunities).length },
      positions: { loaded: !!loaded.positions, records: positions },
      costs: { loaded: !!loaded.costs, classes: costs },
      risks: { loaded: !!loaded.risks, dimensions: risks, profiles: riskProfiles },
      alerts: { loaded: !!loaded.alerts, records: alerts, total: arr(inputs.alerts).length },
      bots: { loaded: !!loaded.assignments, roles: roles, total: allAssignments.length },
      sources: { names: Object.keys(sourceNames), shownCount: shown.length, verifiedCount: verified },
      graphLoaded: !!loaded.graph
    };
  }

  // ---- §83 session context -------------------------------------------------
  // Ids only — never copied records (F-23). Survives navigation
  // between workspaces for the session; a compatible workspace
  // pre-selects it.
  var sessionContextId = null;
  function setContext(id) { sessionContextId = str(id); return sessionContextId; }
  function getContext() { return sessionContextId; }

  global.CryptoWorkspace = {
    resolveActivity: resolveActivity,
    workspaceData: workspaceData,
    relatedFromGraph: relatedFromGraph,
    nodeIdsForRecord: nodeIdsForRecord,
    dependenciesFor: dependenciesFor,
    setContext: setContext,
    getContext: getContext
  };
})(window);
