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
  //             assignments, graph },
  //   protocolTwins, assetTwins, riskDimensionNames, pipelineStates,
  //   positionSummary, alertSummary, layerCounts, apiUsage,
  //   routerHealth }   (the second group is the CW-3 core-depth
  //   hand-in: the intelligence layers' own derivations over the
  //   same canonical identities, passed in — never re-derived here
  //   from a second source.)
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
    var risks;
    if (ws.riskDimensions.indexOf("ALL") !== -1) {
      // Cross-workspace rows (risk, home, opportunities) register
      // ALL dimensions (§55): expand to the canonical RiskIntelligence
      // dimension names handed in by the caller — the same names
      // profiles are assessed against — never a pseudo-dimension.
      risks = arr(inputs.riskDimensionNames).map(function (name) {
        var assessed = 0;
        riskProfiles.forEach(function (p) {
          var e = p && p.dimensions ? p.dimensions[name] : null;
          if (e && e.state && e.state !== "UNKNOWN") assessed++;
        });
        return { code: name, dimension: null, assessed: assessed, expandedAll: true };
      });
    } else {
      risks = ws.riskDimensions.map(function (code) {
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
    }

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

    // -- CW-3 core depth: workspace-specific derivations over the
    //    same handed-in records and layer state (the CORE workspaces
    //    of registry §5 / CW-3). Every value is computed from the
    //    records; a field the records do not carry stays visibly
    //    unrecorded — never filled by name or ticker matching.
    var core = {};

    // The real opportunity pipeline, counted by recorded stage
    // (platform-wide). Terminal stage is PREPARED — never EXECUTED.
    var pipelineStates = arr(inputs.pipelineStates);
    var stageCounts = {};
    pipelineStates.forEach(function (s) { stageCounts[s] = 0; });
    arr(inputs.opportunities).forEach(function (o) {
      var st = o ? (str(o.pipelineState) || str(o.stage)) : null;
      if (st && Object.prototype.hasOwnProperty.call(stageCounts, st)) stageCounts[st]++;
    });
    core.pipeline = { loaded: !!loaded.opportunities, states: pipelineStates,
      byStage: stageCounts, total: arr(inputs.opportunities).length };

    // PositionIntelligence's own summary derivation, handed in:
    // a null totalValue stays null — UNAVAILABLE, never zero.
    core.positionsSummary = inputs.positionSummary
      ? { loaded: true, summary: inputs.positionSummary }
      : { loaded: false, summary: null };

    if (ws.workspaceId === "networks") {
      var protocolLinks = 0;
      core.networks = entityRecords.networks.map(function (n) {
        var protocolsOn = entityRecords.protocols.filter(function (p) {
          return arr(p.networkRefs).indexOf(n.id) !== -1;
        });
        protocolLinks += protocolsOn.length;
        return { record: n,
          chainId: typeof n.chainId === "number" ? n.chainId : null,
          nativeAsset: str(n.nativeAssetRef) ? (byId[n.nativeAssetRef] || null) : null,
          nativeAssetRecorded: !!str(n.nativeAssetRef),
          assets: entityRecords.assets.filter(function (a) { return a.networkRef === n.id; }),
          protocols: protocolsOn };
      });
      core.networkTotals = { networks: core.networks.length,
        withNativeAsset: core.networks.filter(function (x) { return x.nativeAssetRecorded; }).length,
        protocolLinks: protocolLinks };
    }

    if (ws.workspaceId === "protocols") {
      var pTwins = {};
      arr(inputs.protocolTwins).forEach(function (t) { if (t && str(t.protocolId)) pTwins[t.protocolId] = t; });
      var catCounts = {};
      core.protocols = entityRecords.protocols.map(function (p) {
        var twin = pTwins[p.id] || null;
        var cat = twin && str(twin.category) ? twin.category : null;
        var catKey = cat || "NOT_RECORDED";
        catCounts[catKey] = (catCounts[catKey] || 0) + 1;
        return { record: p, twin: twin, category: cat,
          networks: arr(p.networkRefs).map(function (id) { return byId[id] || null; }).filter(Boolean),
          activities: arr(p.activityRefs).map(function (id) {
            var res = REG ? REG.resolveMajor(id) : null;
            return { record: byId[id] || null, workspaceId: res ? res.primary : null };
          }) };
      });
      core.protocolCategories = catCounts;
    }

    if (ws.workspaceId === "markets-assets") {
      var aTwins = {};
      arr(inputs.assetTwins).forEach(function (t) { if (t && str(t.assetId)) aTwins[t.assetId] = t; });
      var classCounts = {};
      core.assets = entityRecords.assets.map(function (a) {
        var twin = aTwins[a.id] || null;
        var cls = twin && str(twin.assetClass) ? twin.assetClass : null;
        var clsKey = cls || "NOT_RECORDED";
        classCounts[clsKey] = (classCounts[clsKey] || 0) + 1;
        return { record: a, twin: twin, assetClass: cls,
          network: str(a.networkRef) ? (byId[a.networkRef] || null) : null,
          hasContract: !!(twin && str(twin.contractAddress)) };
      });
      core.assetClasses = classCounts;
      core.assetKindCounts = {
        native: entityRecords.assets.filter(function (a) { return a.nativeOrToken === "native"; }).length,
        token: entityRecords.assets.filter(function (a) { return a.nativeOrToken === "token"; }).length };
    }

    if (ws.workspaceId === "risk") {
      var alertsByState = {};
      arr(inputs.alerts).forEach(function (a) {
        var s = a ? (str(a.state) || str(a.status)) : null;
        if (s) alertsByState[s] = (alertsByState[s] || 0) + 1;
      });
      core.risk = {
        dimensions: arr(inputs.riskDimensionNames).map(function (name) {
          var assessed = 0;
          riskProfiles.forEach(function (p) {
            var e = p && p.dimensions ? p.dimensions[name] : null;
            if (e && e.state && e.state !== "UNKNOWN") assessed++;
          });
          return { name: name, assessed: assessed };
        }),
        profiles: riskProfiles.length,
        alertSummary: inputs.alertSummary || null,
        alertsByState: alertsByState,
        // The states that drive the Globe's Alert Mode — measured
        // from the recorded alerts, never assumed.
        verifiedActive: arr(inputs.alerts).filter(function (a) {
          var s = a ? (str(a.state) || str(a.status)) : null;
          return s === "CONFIRMED" || s === "ACTIVE" || s === "MITIGATING";
        }).length
      };
    }

    if (ws.workspaceId === "intelligence") {
      var byLevel = {}, verifiedTotal = 0;
      records.forEach(function (r) {
        if (!r) return;
        var k = r.level || (r.registry ? "ENTITY" : "OTHER");
        byLevel[k] = (byLevel[k] || 0) + 1;
        if (r.verificationStatus === "VERIFIED") verifiedTotal++;
      });
      var graphStats = null;
      if (inputs.graph && inputs.graph.nodes) {
        var rel = 0, missingOut = 0;
        var adj = inputs.graph.adjacency || {};
        Object.keys(adj).forEach(function (nid) {
          arr(adj[nid]).forEach(function (e) {
            if (e && e.direction === "out") {
              rel++;
              if (!inputs.graph.nodes[e.nodeId]) missingOut++;
            }
          });
        });
        graphStats = { nodes: Object.keys(inputs.graph.nodes).length,
          relationships: rel,
          unresolved: Array.isArray(inputs.graph.unresolved)
            ? inputs.graph.unresolved.length : missingOut };
      }
      core.health = { recordsTotal: records.length, byLevel: byLevel,
        entities: { networks: entityRecords.networks.length,
          assets: entityRecords.assets.length,
          protocols: entityRecords.protocols.length },
        verified: verifiedTotal,
        layers: arr(inputs.layerCounts),
        graph: graphStats };
    }

    if (ws.workspaceId === "live-data") {
      core.liveData = { usageLoaded: Array.isArray(inputs.apiUsage),
        usage: arr(inputs.apiUsage),
        routerHealth: inputs.routerHealth || null };
    }

    // -- CW-4 trading depth: workspace-specific derivations for
    //    the TRADING group (registry §5 / CW-4) over the same
    //    handed-in records. The trading taxonomy is structure-rich
    //    and observation-poor: the majors/types/strategies are all
    //    recorded, while venue links exist only where a protocol's
    //    own activityRefs record them — measured here, never
    //    filled by name or ticker matching. Quotes, routes and
    //    spreads have NO connected feed anywhere in the app; the
    //    panels render those states, never figures.
    if (ws.group === "trading") {
      var pTwinMap = {};
      arr(inputs.protocolTwins).forEach(function (t) { if (t && str(t.protocolId)) pTwinMap[t.protocolId] = t; });
      var aTwinMap = {};
      arr(inputs.assetTwins).forEach(function (t) { if (t && str(t.assetId)) aTwinMap[t.assetId] = t; });
      function venueEntry(p) {
        var twin = pTwinMap[p.id] || null;
        return { record: p, twin: twin,
          category: twin && str(twin.category) ? twin.category : null,
          networks: arr(p.networkRefs).map(function (id) { return byId[id] || null; }).filter(Boolean),
          activities: arr(p.activityRefs).map(function (id) {
            var res = REG ? REG.resolveMajor(id) : null;
            return { record: byId[id] || null, workspaceId: res ? res.primary : null };
          }) };
      }
      function majorSummary(tree) {
        return { record: tree.record, typeCount: tree.typeCount, strategyCount: tree.strategyCount,
          types: tree.types.map(function (t) {
            return { record: t.record, strategyCount: t.strategies.length };
          }) };
      }
      var tradingCore = {
        universeProtocols: entityRecords.protocols.length,
        scopeProtocols: protocols.length,
        majors: majors.map(majorSummary),
        scopeOpportunityCount: opportunities.length
      };
      if (ws.workspaceId === "swap" || ws.workspaceId === "dex-aggregation") {
        tradingCore.venues = protocols.map(venueEntry);
        tradingCore.scopeAssets = assets.length;
        tradingCore.contractAssets = assets.filter(function (a) {
          var t = aTwinMap[a.id];
          return !!(t && str(t.contractAddress));
        }).length;
      }
      if (ws.workspaceId === "swap") {
        tradingCore.swapVenues = tradingCore.venues.filter(function (v) {
          return arr(v.record.activityRefs).indexOf("major-token-swapping") !== -1;
        });
        tradingCore.intentVenues = tradingCore.venues.filter(function (v) {
          return arr(v.record.activityRefs).indexOf("major-intent-based-execution") !== -1;
        });
      }
      if (ws.workspaceId === "dex-aggregation") {
        tradingCore.aggregators = tradingCore.venues.filter(function (v) {
          return arr(v.record.activityRefs).indexOf("major-swap-aggregation-route-optimization") !== -1;
        });
        tradingCore.dexVenues = tradingCore.venues.filter(function (v) { return v.category === "DEX"; });
        tradingCore.otherVenues = tradingCore.venues.filter(function (v) {
          return v.category !== "DEX" && tradingCore.aggregators.indexOf(v) === -1;
        });
      }
      if (ws.workspaceId === "arbitrage") {
        var flashTree = treeFor("major-atomic-flash-credit", null);
        tradingCore.flashCredit = flashTree ? majorSummary(flashTree) : null;
        // The peg instruments of the Stablecoin & Peg Arbitrage
        // major: canonical AssetIntelligence identities classified
        // stablecoin — identity records only. No peg observation
        // exists anywhere in the app and none is attached here.
        tradingCore.pegAssets = entityRecords.assets.filter(function (a) {
          var t = aTwinMap[a.id];
          return !!(t && t.assetClass === "stablecoin");
        }).map(function (a) {
          var t = aTwinMap[a.id];
          return { record: a, twin: t,
            network: str(a.networkRef) ? (byId[a.networkRef] || null) : null,
            hasContract: !!(t && str(t.contractAddress)) };
        });
      }
      if (ws.workspaceId === "cex-intelligence") {
        // Measured absence, the CW-1 §1B method applied to every
        // canonical record title: a centralized-venue name occurs
        // nowhere in the taxonomy.
        var cexHits = records.filter(function (r) {
          return r && /\bcex\b|centrali[sz]ed exchange/i.test(r.title || "");
        }).length;
        // What the taxonomy covers instead: the decentralized
        // trading universe of the other four trading workspaces,
        // counted from their recorded primary majors.
        var covered = [];
        REG.byGroup("trading").forEach(function (w2) {
          if (w2.workspaceId === "cex-intelligence") return;
          var tSum = 0, sSum = 0, mList = [];
          w2.majorIds.forEach(function (m) {
            var tr = treeFor(m, w2.typeScope ? w2.typeScope[m] : null);
            if (tr) { tSum += tr.typeCount; sSum += tr.strategyCount; mList.push(tr.record); }
          });
          covered.push({ workspace: w2, majors: mList, typeCount: tSum, strategyCount: sSum });
        });
        var scopeTypes = 0, scopeStrats = 0;
        majors.forEach(function (t) { scopeTypes += t.typeCount; scopeStrats += t.strategyCount; });
        tradingCore.cex = { titleScanHits: cexHits, titlesScanned: records.length,
          coveredInstead: covered,
          scopeCounts: { majors: majors.length, types: scopeTypes, strategies: scopeStrats,
            networks: entities.networks.length, assets: entities.assets.length,
            protocols: entities.protocols.length } };
      }
      core.trading = tradingCore;
    }

    // -- CW-5 yield & capital depth: workspace-specific derivations
    //    for the YIELD group (registry §5 / CW-5) over the same
    //    handed-in records. The yield taxonomy is the largest in
    //    the encyclopedia, and its venue layer exists only where a
    //    protocol's own activityRefs record it — measured here,
    //    never filled by name or ticker matching. Rates are the
    //    sharp edge: NO yield observation source is connected
    //    (DefiLlama's free yield endpoints moved to its paid plan
    //    on 2026-11-13 — the recorded §22 capability gap), so no
    //    APY, rate or earnings figure is derived anywhere below;
    //    the panels render the NOT_CONNECTED / NO_DATA states.
    if (ws.group === "yield") {
      var yTwinMap = {};
      arr(inputs.protocolTwins).forEach(function (t) { if (t && str(t.protocolId)) yTwinMap[t.protocolId] = t; });
      function yieldVenueEntry(p) {
        var twin = yTwinMap[p.id] || null;
        return { record: p, twin: twin,
          category: twin && str(twin.category) ? twin.category : null,
          networks: arr(p.networkRefs).map(function (id) { return byId[id] || null; }).filter(Boolean),
          activities: arr(p.activityRefs).map(function (id) {
            var res = REG ? REG.resolveMajor(id) : null;
            return { record: byId[id] || null, workspaceId: res ? res.primary : null };
          }),
          primaryHits: arr(p.activityRefs).filter(function (a) { return ws.majorIds.indexOf(a) !== -1; }) };
      }
      function yieldMajorSummary(tree) {
        return { record: tree.record, typeCount: tree.typeCount, strategyCount: tree.strategyCount,
          types: tree.types.map(function (t) {
            return { record: t.record, strategyCount: t.strategies.length };
          }),
          protocolHits: entityRecords.protocols.filter(function (p) {
            return arr(p.activityRefs).indexOf(tree.record.id) !== -1;
          }).length };
      }
      var yVenues = protocols.map(yieldVenueEntry);
      var yMajorSummaries = majors.map(yieldMajorSummary);
      var yieldCore = {
        universeProtocols: entityRecords.protocols.length,
        scopeProtocols: protocols.length,
        majors: yMajorSummaries,
        linkedMajorCount: yMajorSummaries.filter(function (m) { return m.protocolHits > 0; }).length,
        venues: yVenues,
        primaryVenues: yVenues.filter(function (v) { return v.primaryHits.length > 0; }),
        secondaryOnlyVenues: yVenues.filter(function (v) { return v.primaryHits.length === 0; }),
        scopeAssets: assets.length,
        scopeNetworks: networks.length,
        scopeOpportunityCount: opportunities.length,
        positionsCount: positions.length,
        positionsLoaded: !!loaded.positions
      };
      if (ws.workspaceId === "liquid-staking") {
        // Measured absence, the CW-4 title-scan method applied to
        // the canonical asset universe: no recorded asset IS a
        // liquid-staking receipt token — the recorded assets in
        // scope are the underlying assets, and no receipt identity
        // is invented to complete the picture.
        yieldCore.receiptScan = {
          hits: entityRecords.assets.filter(function (a) {
            return /liquid|staked|\blst\b/i.test((a.title || "") + " " + a.id);
          }).length,
          scanned: entityRecords.assets.length };
      }
      if (ws.workspaceId === "restaking") {
        // The restaking protocol's own token, where it stands in
        // this workspace's recorded asset scope — identity only.
        yieldCore.eigenAsset = assets.filter(function (a) { return a.id === "eigen-ethereum"; })[0] || null;
      }
      core.yield = yieldCore;
    }

    // -- CW-6 routing + derivatives depth: workspace-specific
    //    derivations for the ROUTING and DERIVATIVES groups
    //    (registry §5 / CW-6) over the same handed-in records.
    //    The routing taxonomy is recorded in full while its venue
    //    layer is two protocols; the derivatives taxonomy is
    //    recorded in full while three of its five workspaces have
    //    NO recorded venue at all. Venue linkage exists only
    //    where a protocol's own activityRefs record a major —
    //    measured here, never filled by name or ticker matching.
    //    Quotes, routes, funding, open interest and liquidation
    //    have NO connected feed anywhere in the app; the panels
    //    render those states, never figures.
    if (ws.group === "routing" || ws.group === "derivatives") {
      var rTwinMap = {};
      arr(inputs.protocolTwins).forEach(function (t) { if (t && str(t.protocolId)) rTwinMap[t.protocolId] = t; });
      function cw6VenueEntry(p) {
        var twin = rTwinMap[p.id] || null;
        return { record: p, twin: twin,
          category: twin && str(twin.category) ? twin.category : null,
          networks: arr(p.networkRefs).map(function (id) { return byId[id] || null; }).filter(Boolean),
          activities: arr(p.activityRefs).map(function (id) {
            var res = REG ? REG.resolveMajor(id) : null;
            return { record: byId[id] || null, workspaceId: res ? res.primary : null };
          }),
          primaryHits: arr(p.activityRefs).filter(function (a) { return ws.majorIds.indexOf(a) !== -1; }) };
      }
      function cw6MajorSummary(tree) {
        return { record: tree.record, typeCount: tree.typeCount, strategyCount: tree.strategyCount,
          types: tree.types.map(function (t) {
            return { record: t.record, strategyCount: t.strategies.length };
          }),
          protocolHits: entityRecords.protocols.filter(function (p) {
            return arr(p.activityRefs).indexOf(tree.record.id) !== -1;
          }).length };
      }
      var cw6Venues = protocols.map(cw6VenueEntry);
      var cw6MajorSummaries = majors.map(cw6MajorSummary);
      var cw6SecondarySummaries = ws.secondaryMajorIds.map(function (mid) {
        var tr = treeFor(mid, ws.typeScope ? ws.typeScope[mid] : null);
        return tr ? cw6MajorSummary(tr) : null;
      }).filter(Boolean);
      var cw6Core = {
        universeProtocols: entityRecords.protocols.length,
        scopeProtocols: protocols.length,
        majors: cw6MajorSummaries,
        secondaryMajors: cw6SecondarySummaries,
        linkedMajorCount: cw6MajorSummaries.filter(function (m) { return m.protocolHits > 0; }).length,
        venues: cw6Venues,
        primaryVenues: cw6Venues.filter(function (v) { return v.primaryHits.length > 0; }),
        secondaryOnlyVenues: cw6Venues.filter(function (v) { return v.primaryHits.length === 0; }),
        scopeAssets: assets.length,
        scopeNetworks: networks.length,
        scopeOpportunityCount: opportunities.length,
        positionsCount: positions.length,
        positionsLoaded: !!loaded.positions
      };
      if (ws.workspaceId === "cross-chain-routing") {
        // Intent routing is a secondary major here: the one
        // protocol recording it enters scope through it, and is
        // labelled as such — never presented as a routing venue.
        cw6Core.intentVenues = cw6Venues.filter(function (v) {
          return arr(v.record.activityRefs).indexOf("major-intent-based-execution") !== -1;
        });
      }
      if (ws.workspaceId === "perpetuals") {
        // dYdX is three distinct canonical entities — a network,
        // an asset and a protocol — never collapsed into one.
        // Each is checked by its own recorded id.
        cw6Core.dydx = { network: !!byId["dydx-mainnet"],
          asset: !!byId["dydx-dydx-chain"], protocol: !!byId["protocol-dydx"] };
      }
      if (ws.workspaceId === "margin-leverage") {
        // Liquidation is a secondary major of this workspace:
        // recorded taxonomy whose state is NO_DATA, never a
        // modelled liquidation figure.
        var liqTree = treeFor("major-liquidations", null);
        cw6Core.liquidation = liqTree ? cw6MajorSummary(liqTree) : null;
      }
      core.cw6 = cw6Core;
    }

    // -- CW-7 infrastructure depth: workspace-specific
    //    derivations for the INFRASTRUCTURE group (registry §5 /
    //    CW-7) over the same handed-in records. The infrastructure
    //    taxonomy is recorded in full while its venue layer is
    //    almost entirely absent: one protocol enters one
    //    workspace through a secondary major, and the other four
    //    frame workspaces have NO recorded protocol at all.
    //    Venue linkage exists only where a protocol's own
    //    activityRefs record a major — measured here, never
    //    filled by name or ticker matching. Hashrate, uptime,
    //    endpoint and capacity observations have NO connected
    //    feed anywhere in the app; the panels render those
    //    states, never figures. The three expansion-gated seats
    //    (ai-compute, modular, identity) get no panel here: the
    //    frame renders their seat state, as it does for GameFi.
    if (ws.group === "infrastructure") {
      var iTwinMap = {};
      arr(inputs.protocolTwins).forEach(function (t) { if (t && str(t.protocolId)) iTwinMap[t.protocolId] = t; });
      function infraVenueEntry(p) {
        var twin = iTwinMap[p.id] || null;
        return { record: p, twin: twin,
          category: twin && str(twin.category) ? twin.category : null,
          networks: arr(p.networkRefs).map(function (id) { return byId[id] || null; }).filter(Boolean),
          activities: arr(p.activityRefs).map(function (id) {
            var res = REG ? REG.resolveMajor(id) : null;
            return { record: byId[id] || null, workspaceId: res ? res.primary : null };
          }),
          primaryHits: arr(p.activityRefs).filter(function (a) { return ws.majorIds.indexOf(a) !== -1; }) };
      }
      function infraMajorSummary(tree) {
        return { record: tree.record, typeCount: tree.typeCount, strategyCount: tree.strategyCount,
          types: tree.types.map(function (t) {
            return { record: t.record, strategyCount: t.strategies.length };
          }),
          protocolHits: entityRecords.protocols.filter(function (p) {
            return arr(p.activityRefs).indexOf(tree.record.id) !== -1;
          }).length };
      }
      var iVenues = protocols.map(infraVenueEntry);
      var iMajorSummaries = majors.map(infraMajorSummary);
      var iSecondarySummaries = ws.secondaryMajorIds.map(function (mid) {
        var tr = treeFor(mid, ws.typeScope ? ws.typeScope[mid] : null);
        return tr ? infraMajorSummary(tr) : null;
      }).filter(Boolean);
      var infraCore = {
        universeProtocols: entityRecords.protocols.length,
        scopeProtocols: protocols.length,
        majors: iMajorSummaries,
        secondaryMajors: iSecondarySummaries,
        linkedMajorCount: iMajorSummaries.filter(function (m) { return m.protocolHits > 0; }).length,
        venues: iVenues,
        primaryVenues: iVenues.filter(function (v) { return v.primaryHits.length > 0; }),
        secondaryOnlyVenues: iVenues.filter(function (v) { return v.primaryHits.length === 0; }),
        scopeAssets: assets.length,
        scopeNetworks: networks.length,
        scopeOpportunityCount: opportunities.length,
        positionsCount: positions.length,
        positionsLoaded: !!loaded.positions,
        // bitcoin-mainnet is a recorded network identity in the
        // canonical universe, whether or not it stands in this
        // workspace's protocol-linked scope.
        bitcoinNetworkRecorded: !!byId["bitcoin-mainnet"]
      };
      core.infra = infraCore;
    }

    // -- CW-8 specialized depth: workspace-specific
    //    derivations for the SPECIALIZED group (registry §5 /
    //    CW-8) over the same handed-in records. One workspace
    //    has a recorded venue (BTCFi, via Babylon); the other
    //    eight frame workspaces have NO recorded protocol at
    //    all. Oracle is the taxonomy-gap workspace: Chainlink
    //    and Pyth are recorded ORACLE-category protocol
    //    identities whose activityRefs are intentionally empty
    //    — no canonical-60 major names oracle data provision —
    //    so the dependency graph answers 0 recorded dependents.
    //    BTC is never collapsed into WBTC: wbtc-ethereum is a
    //    distinct recorded identity and is NOT in BTCFi scope.
    //    The two expansion-gated seats (gamefi, socialfi) get
    //    no panel here: the frame renders their seat state.
    if (ws.group === "specialized") {
      var sTwinMap = {};
      arr(inputs.protocolTwins).forEach(function (t) { if (t && str(t.protocolId)) sTwinMap[t.protocolId] = t; });
      function specVenueEntry(p) {
        var twin = sTwinMap[p.id] || null;
        return { record: p, twin: twin,
          category: twin && str(twin.category) ? twin.category : null,
          networks: arr(p.networkRefs).map(function (id) { return byId[id] || null; }).filter(Boolean),
          activities: arr(p.activityRefs).map(function (id) {
            var res = REG ? REG.resolveMajor(id) : null;
            return { record: byId[id] || null, workspaceId: res ? res.primary : null };
          }),
          primaryHits: arr(p.activityRefs).filter(function (a) { return ws.majorIds.indexOf(a) !== -1; }) };
      }
      function specMajorSummary(tree) {
        return { record: tree.record, typeCount: tree.typeCount, strategyCount: tree.strategyCount,
          types: tree.types.map(function (t) {
            return { record: t.record, strategyCount: t.strategies.length };
          }),
          protocolHits: entityRecords.protocols.filter(function (p) {
            return arr(p.activityRefs).indexOf(tree.record.id) !== -1;
          }).length };
      }
      var sVenues = protocols.map(specVenueEntry);
      var sMajorSummaries = majors.map(specMajorSummary);
      var sSecondarySummaries = ws.secondaryMajorIds.map(function (mid) {
        var tr = treeFor(mid, ws.typeScope ? ws.typeScope[mid] : null);
        return tr ? specMajorSummary(tr) : null;
      }).filter(Boolean);
      var specCore = {
        universeProtocols: entityRecords.protocols.length,
        scopeProtocols: protocols.length,
        majors: sMajorSummaries,
        secondaryMajors: sSecondarySummaries,
        linkedMajorCount: sMajorSummaries.filter(function (m) { return m.protocolHits > 0; }).length,
        venues: sVenues,
        primaryVenues: sVenues.filter(function (v) { return v.primaryHits.length > 0; }),
        secondaryOnlyVenues: sVenues.filter(function (v) { return v.primaryHits.length === 0; }),
        scopeAssets: assets.length,
        scopeNetworks: networks.length,
        scopeOpportunityCount: opportunities.length,
        positionsCount: positions.length,
        positionsLoaded: !!loaded.positions,
        // Oracle-category protocol identities in the universe,
        // with their recorded activity counts (both 0 by design:
        // the taxonomy gap is recorded in the protocol records).
        // Identified by canonical record id — the imported
        // record carries no category field; the title and the
        // activity count are read from the record itself.
        oracleProtocols: ["protocol-chainlink", "protocol-pyth"].map(function (id) {
          var p = byId[id] || null;
          return p ? { id: p.id, title: p.title, activityCount: arr(p.activityRefs).length } : null;
        }).filter(Boolean),
        // WBTC is a distinct recorded identity from native BTC;
        // it is NOT in BTCFi scope and must never be presented
        // as BTC.
        wbtcRecorded: !!byId["wbtc-ethereum"],
        wbtcInScope: assets.some(function (a) { return a.id === "wbtc-ethereum"; })
      };
      core.cw8 = specCore;
    }

    return {
      found: true, workspace: ws,
      core: core,
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
