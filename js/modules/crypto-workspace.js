/* MTI6-GTADWIY-COCKPIT — Crypto Workspace Frame (CW-2)
 *
 * ONE route (crypto-ws) renders every Crypto World workspace from
 * the Screen Registry (js/crypto-workspace-registry.js) through the
 * ONE shared frame of Master Directive §77:
 *
 *   HEADER      title · current state · source/freshness state ·
 *               STANDARD / ADVANCED / ALL (§4) · the §78 ladder
 *               with this workspace's top rung lit and EXECUTE
 *               DISABLED on every workspace, always.
 *   PRIMARY     the workspace's activity tree — majors -> types ->
 *               strategies drilled down INSIDE the workspace (§91),
 *               context carried by the resolver (§90).
 *   CONTEXT     Networks · Assets · Protocols · Strategies ·
 *               Opportunities · Positions — canonical records only,
 *               entities browsable at last (CW-0 Gap 4).
 *   INTELLIGENCE Costs · Risks · Dependencies · Sources ·
 *               Freshness · Alerts · Bots — engine state, honestly
 *               labelled (UNKNOWN stays UNKNOWN, F-13; risk is
 *               dimensions with evidence, never a score, F-14).
 *   ACTIONS     STAR · Compare · World · Encyclopedia · Graph ·
 *               Source · Simulator — only the controls the registry
 *               row allows (F-5), each bound to its contract:
 *               SOURCE names provenance or the item does not render
 *               as fact (F-16); WHY is structured derivation, never
 *               generated prose (F-17); WORLD never invents
 *               coordinates — no crypto record carries any (F-18);
 *               the Simulator is an honest seat until a §106 engine
 *               exists (F-21).
 *
 * Expansion-gated seats render the F-6 seat frame: what the
 * workspace will be, the verified related material that feeds it
 * today, and the explicit gap. Nothing is invented to fill a seat.
 *
 * View level is a frame-level preference (F-12): one switch, shared
 * by all workspaces, a pure view over the same records.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  var VIEW_KEY = "mti6_crypto_workspace_view_v1";
  var VIEW_LEVELS = ["STANDARD", "ADVANCED", "ALL"];

  function viewLevel() {
    try {
      var v = global.localStorage.getItem(VIEW_KEY);
      if (VIEW_LEVELS.indexOf(v) !== -1) return v;
    } catch (e) {}
    return "STANDARD";
  }
  function setViewLevel(v) {
    try { global.localStorage.setItem(VIEW_KEY, v); } catch (e) {}
  }
  function safeCall(fn) {
    try { var r = fn(); return r === undefined ? null : r; } catch (e) { return null; }
  }
  function meta(text) { return U.el("div", { class: "api-meta" }, text); }
  function panel(title, children) {
    return U.el("section", { class: "api-panel cw2-panel" }, [U.el("h3", {}, title)].concat(children || []));
  }
  function row(label, value) {
    return U.el("div", { class: "status-row" }, [
      U.el("span", {}, label), U.el("span", { class: "status-value" }, value)
    ]);
  }
  function linkBtn(href, label, cls) {
    return U.el("a", { class: "btn " + (cls || "btn-secondary") + " btn-sm", href: href }, label);
  }

  // ---- data gathering -----------------------------------------------------

  async function gather() {
    var inputs = { records: [], opportunities: [], positions: [], costRecords: [],
      riskProfiles: [], alerts: [], assignments: [], graph: null,
      loaded: { opportunities: false, positions: false, costs: false, risks: false,
        alerts: false, assignments: false, graph: false } };
    var CW = global.CryptoWorld;
    if (CW) {
      try { await CW.ensureTaxonomyMeta(); } catch (e) {}
      try { inputs.records = await CW.getAllRecords(); } catch (e) { inputs.records = []; }
    }
    if (global.OpportunityIntelligence) {
      var o = safeCall(function () { return global.OpportunityIntelligence.listOpportunities(); });
      if (Array.isArray(o)) { inputs.opportunities = o; inputs.loaded.opportunities = true; }
    }
    if (global.PositionIntelligence) {
      var p = safeCall(function () { return global.PositionIntelligence.listPositions(); });
      if (Array.isArray(p)) { inputs.positions = p; inputs.loaded.positions = true; }
    }
    if (global.CostIntelligence) {
      var c = safeCall(function () { return global.CostIntelligence.getCosts(); });
      if (Array.isArray(c)) { inputs.costRecords = c; inputs.loaded.costs = true; }
    }
    if (global.RiskIntelligence) {
      var r = safeCall(function () { return global.RiskIntelligence.listProfiles(); });
      if (Array.isArray(r)) { inputs.riskProfiles = r; inputs.loaded.risks = true; }
    }
    if (global.AngelSecurity) {
      var a = safeCall(function () { return global.AngelSecurity.listAlerts(); });
      if (Array.isArray(a)) { inputs.alerts = a; inputs.loaded.alerts = true; }
    }
    if (global.CryptoBotAssignments) {
      var as = safeCall(function () { return global.CryptoBotAssignments.listAssignments(); });
      if (Array.isArray(as)) { inputs.assignments = as; inputs.loaded.assignments = true; }
    }
    if (global.WorldEngine && typeof global.WorldEngine.collectGraph === "function") {
      try {
        var res = await global.WorldEngine.collectGraph();
        var g = res && res.graph ? res.graph : (res && res.nodes ? res : null);
        if (g && g.nodes) { inputs.graph = g; inputs.loaded.graph = true; }
      } catch (e) {}
    }
    return inputs;
  }

  // ---- header ---------------------------------------------------------------

  function ladderStrip(ws) {
    var LADDER = global.CryptoWorkspaceRegistry.LADDER;
    var topIdx = LADDER.indexOf(ws.ladderTop);
    var strip = U.el("div", { class: "cw2-ladder", "aria-label": "Action control ladder" });
    LADDER.forEach(function (rung, i) {
      var cls = "cw2-rung";
      var label = rung;
      if (rung === "EXECUTE") { cls += " cw2-rung--disabled"; label = "EXECUTE — DISABLED"; }
      else if (i <= topIdx) cls += " cw2-rung--top";
      else cls += " cw2-rung--locked";
      strip.appendChild(U.el("span", { class: cls }, label));
    });
    return strip;
  }

  function breadcrumb(ws, trail) {
    var bar = U.el("nav", { class: "mti6-breadcrumb", "aria-label": "Workspace trail" });
    function sep() { return U.el("span", { class: "mti6-breadcrumb__sep" }, ">"); }
    (trail || [{ label: "Crypto World", href: "#/crypto-world" },
      { label: ws.title, href: global.CryptoWorkspaceRegistry.hrefFor(ws) }]).forEach(function (c, i, all) {
      if (i > 0) bar.appendChild(sep());
      if (c.href && i < all.length - 1) bar.appendChild(U.el("a", { href: c.href }, c.label));
      else bar.appendChild(U.el("span", {}, c.label));
    });
    return bar;
  }

  // ---- primary: the activity tree ------------------------------------------

  function recordLine(rec, indent) {
    var kids = [
      U.el("a", { href: "#/encyclopedia/" + encodeURIComponent(rec.id), class: "cw2-rec-link" },
        (rec.title || rec.id)),
      U.el("span", { class: "cw2-rec-state" }, rec.verificationStatus || "UNKNOWN")
    ];
    return U.el("div", { class: "cw2-rec cw2-rec--i" + (indent || 0) }, kids);
  }

  function treeBlock(tree, ws, level, expanded) {
    var major = tree.record;
    var box = U.el("div", { class: "cw2-major" });
    var head = U.el("div", { class: "cw2-major-head" }, [
      U.el("a", { class: "cw2-major-title", href: global.CryptoWorkspaceRegistry.hrefFor(ws, major.id) },
        major.title || major.id),
      U.el("span", { class: "cw2-major-counts" },
        tree.typeCount + " Types · " + tree.strategyCount + " Strategies · " + (major.verificationStatus || "UNKNOWN"))
    ]);
    box.appendChild(head);
    if (level !== "STANDARD" || expanded) {
      if (major.definition && level !== "STANDARD") box.appendChild(meta(major.definition));
    }
    if (expanded || level !== "STANDARD") {
      if (!tree.types.length) {
        box.appendChild(meta("No Types are recorded under this Major Activity — nothing is recorded, not a guess."));
      }
      tree.types.forEach(function (t) {
        box.appendChild(recordLine(t.record, 1));
        if (level !== "STANDARD") {
          if (!t.strategies.length) {
            box.appendChild(U.el("div", { class: "cw2-rec cw2-rec--i2 api-meta" },
              "No canonical strategies recorded under this Type — an honest taxonomy gap (see the knowledge-gap note), never backfilled."));
          }
          t.strategies.forEach(function (s) { box.appendChild(recordLine(s, 2)); });
        }
      });
      if (level === "ALL") {
        box.appendChild(meta("Action / Sub-action levels: ZERO records exist beneath Strategies today — the drill-down honestly ends at Strategy (Batch C remains a separate owner freeze)."));
      }
    } else {
      var typeTitles = tree.types.map(function (t) { return t.record.title || t.record.id; });
      box.appendChild(meta(typeTitles.length
        ? "Types: " + typeTitles.join(" · ")
        : "No Types are recorded under this Major Activity — nothing is recorded, not a guess."));
    }
    return box;
  }

  function primaryPanel(ws, data, level, contextId, inputs) {
    var kids = [];
    if (ws.gated) return null; // seats render their own primary
    if (ws.workspaceId === "cex-intelligence") {
      kids.push(meta("NO CANONICAL FEED: the canonical taxonomy is scoped to decentralized / on-chain crypto — no centralized-venue major, type or strategy exists in the records, and a title scan of all Batch B records finds zero CEX records. This workspace is registered because the directive names it; everything it could ever show is provider or account observation data under per-provider owner authorization (CW-10), and account information requires owner-authorized account integration. It is never backfilled with invented venue data or DEX data relabelled as CEX."));
      return panel("Primary — CEX Intelligence", kids);
    }
    if (!data.majors.length && !data.sharedMajors.length) {
      if (ws.workspaceId === "networks" || ws.workspaceId === "protocols") {
        kids.push(meta("This workspace is entity-driven: networks and protocols are canonical ENTITIES, not activities (§101 — taxonomy answers what can be done; entities answer what exists). Its content is the entity sections in Context below; its activity links arrive through the entities' recorded references."));
      } else if (ws.workspaceId === "margin-leverage" || ws.workspaceId === "rpc-infrastructure") {
        kids.push(meta("This workspace is cross-cutting by design: it holds no primary Major Activity. It consumes the majors listed under Secondary context below — following the records, never claiming them (§99)."));
      } else {
        kids.push(meta("No primary Major Activities are mapped to this workspace in the registry."));
      }
    }
    data.majors.forEach(function (tree) {
      kids.push(treeBlock(tree, ws, level, contextId === tree.record.id));
    });
    data.sharedMajors.forEach(function (tree) {
      kids.push(U.el("div", { class: "api-meta" }, "Shared branch of " + (tree.record.title || tree.record.id) +
        " — this workspace holds only its scoped types (registry §1G split); the major's primary workspace keeps the rest."));
      kids.push(treeBlock(tree, ws, level, contextId === tree.record.id));
    });
    if (data.secondaryMajors.length) {
      kids.push(U.el("h4", {}, "Secondary context — majors whose primary workspace is elsewhere"));
      data.secondaryMajors.forEach(function (m) {
        var res = global.CryptoWorkspace.resolveActivity(m.id, inputs.records);
        kids.push(U.el("div", { class: "cw2-rec cw2-rec--i0" }, [
          U.el("a", { href: "#/encyclopedia/" + encodeURIComponent(m.id), class: "cw2-rec-link" }, m.title || m.id),
          U.el("span", { class: "cw2-rec-state" },
            res && res.primaryWorkspace ? "primary: " + res.primaryWorkspace : "")
        ]));
      });
    }
    if (data.relatedRecords.length) {
      kids.push(U.el("h4", {}, "Related canonical records"));
      data.relatedRecords.forEach(function (r) { kids.push(recordLine(r, 0)); });
    }
    return panel("Primary — Activities", kids);
  }

  // ---- context panels --------------------------------------------------------

  function entityPanel(kindLabel, records, totals, ws) {
    var kids = [];
    if (!records.length) {
      kids.push(meta("No " + kindLabel.toLowerCase() + " records are in this workspace's recorded scope — the canonical universe holds " +
        totals + "; a record appears here only through a recorded link, never by name matching."));
      return panel(kindLabel, kids);
    }
    records.forEach(function (r) {
      kids.push(U.el("div", { class: "cw2-rec cw2-rec--i0" }, [
        U.el("a", { href: "#/encyclopedia/" + encodeURIComponent(r.id), class: "cw2-rec-link" }, r.title || r.id),
        U.el("span", { class: "cw2-rec-state" }, (r.verificationStatus || "UNKNOWN") +
          (r.networkRef ? " · on " + r.networkRef : "") +
          (Array.isArray(r.networkRefs) && r.networkRefs.length ? " · " + r.networkRefs.length + " networks" : "") +
          (Array.isArray(r.activityRefs) ? " · " + r.activityRefs.length + " activities" : ""))
      ]));
    });
    kids.push(meta("Identity records only — no prices, balances or live state are attached to an identity (F-8). Source: " +
      (records[0].source || "not recorded") + " · " + (records[0].importBatch || "batch not recorded") + "."));
    return panel(kindLabel + " (" + records.length + ")", kids);
  }

  function contextPanels(ws, data) {
    var out = [];
    if (ws.entityKinds.indexOf("networks") !== -1) out.push(entityPanel("Networks", data.entities.networks, data.entities.totals.networks, ws));
    if (ws.entityKinds.indexOf("assets") !== -1) out.push(entityPanel("Assets", data.entities.assets, data.entities.totals.assets, ws));
    if (ws.entityKinds.indexOf("protocols") !== -1) out.push(entityPanel("Protocols", data.entities.protocols, data.entities.totals.protocols, ws));
    var stratCount = 0, typeCount = 0;
    data.majors.concat(data.sharedMajors).forEach(function (t) { typeCount += t.typeCount; stratCount += t.strategyCount; });
    out.push(panel("Strategies", [meta(typeCount + " Types · " + stratCount +
      " Strategies in this workspace's primary scope — drilled down in Primary above, defined in the Encyclopedia (F-19).")]));
    var opp = data.opportunities;
    out.push(panel("Opportunities", [meta(!opp.loaded
      ? "OpportunityIntelligence did not load — opportunity state is NOT LOADED, not zero."
      : opp.records.length
        ? opp.records.length + " recorded opportunit" + (opp.records.length === 1 ? "y" : "ies") + " in scope. The pipeline tops at PREPARED — never EXECUTED."
        : "0 opportunities recorded in this workspace's scope (" + opp.total + " recorded platform-wide). Zero is a measured empty, not a feed failure.")]));
    var pos = data.positions;
    out.push(panel("Positions", [meta(!pos.loaded
      ? "PositionIntelligence did not load — position state is NOT LOADED, not zero."
      : pos.records.length
        ? pos.records.length + " recorded position(s). Positions are recorded relationships — no balance, value or gain/loss is derived here."
        : "No recorded positions. Empty means empty: no position source is connected and no holding is inferred.")]));
    return out;
  }

  // ---- intelligence panels ---------------------------------------------------

  function intelligencePanels(ws, data, contextRec, inputs) {
    var out = [];
    // Costs (F-13)
    var costKids = [];
    if (!data.costs.loaded) costKids.push(meta("CostIntelligence did not load — cost state is NOT LOADED."));
    else if (!ws.costClasses.length) costKids.push(meta("This workspace prices nothing — the Cost Engine renders no classes for it (registry row)."));
    else {
      data.costs.classes.forEach(function (c) {
        costKids.push(row("Cost class " + c.code + (c.engineKind ? " (" + c.engineKind + ")" : ""),
          c.state === "RECORDED" ? c.records.length + " recorded" : "UNKNOWN"));
      });
      costKids.push(meta("UNKNOWN is a rendered state, never silently zero; a total including an UNKNOWN component would be labelled partial (F-13). No cost values are invented for this workspace."));
    }
    out.push(panel("Costs", costKids));
    // Risks (F-14)
    var riskKids = [];
    if (!data.risks.loaded) riskKids.push(meta("RiskIntelligence did not load — risk state is NOT LOADED."));
    else if (!ws.riskDimensions.length) riskKids.push(meta("No risk dimensions are registered for this workspace."));
    else {
      data.risks.dimensions.forEach(function (d) {
        riskKids.push(row("Risk " + d.code + (d.dimension ? " (" + d.dimension + ")" : " (no canonical dimension recorded)"),
          data.risks.profiles.length ? d.assessed + " profile(s) assess it" : "NO RECORDED PROFILE"));
      });
      riskKids.push(meta("Risk renders as dimensions with evidence — no single score, no unexplained colour (F-14). " +
        data.risks.profiles.length + " risk profile(s) are recorded platform-wide."));
    }
    out.push(panel("Risks", riskKids));
    // Dependencies (F-15 / §70)
    var depKids = [];
    if (!data.graphLoaded) depKids.push(meta("The World Engine graph did not load — dependency state is NOT LOADED."));
    else if (!contextRec) depKids.push(meta("Select a Major Activity or an entity above to see its recorded World Engine relationships: WHAT DOES THIS DEPEND ON? · WHAT DEPENDS ON THIS? — answered with recorded edges only."));
    else {
      var deps = global.CryptoWorkspace.dependenciesFor(inputs.graph, contextRec);
      if (!deps.length) depKids.push(meta("No World Engine edges are recorded for " + (contextRec.title || contextRec.id) +
        " — 'not recorded', never a guess. (Protocol records carry no graph node kind yet; their recorded network/activity references are listed in Context.)"));
      else {
        deps.forEach(function (d) {
          depKids.push(row((d.direction === "out" ? "→ " : "← ") + d.type, d.label + " (" + d.nodeId + ")"));
        });
        depKids.push(meta(deps.length + " recorded relationship(s) for " + (contextRec.title || contextRec.id) + " — World Engine graph, the one derivation every surface shares (§103)."));
      }
    }
    out.push(panel("Dependencies", depKids));
    // Sources (F-16)
    out.push(panel("Sources", [
      meta("Every factual item in this workspace names its source or does not render as fact (F-16)."),
      row("Sources of the records shown", data.sources.names.length ? data.sources.names.join(", ") : "none recorded"),
      row("Records shown", String(data.sources.shownCount)),
      row("Verified among shown", data.sources.verifiedCount + " — all canonical records are UNVERIFIED until an owner verification process promotes them")
    ]));
    // Freshness (F-8)
    out.push(panel("Freshness", [meta("Canonical identity is durable and carries no live freshness; observations carry source + observed/retrieved time + freshness state per source class (§86). Live observations for this workspace load on explicit request in the Live Data panel (Capability Router) — they are never merged into canonical identity and nothing here is presented as current market state unless a labelled observation says so.")]));
    // Alerts (§82)
    var alertKids = [];
    if (!data.alerts.loaded) alertKids.push(meta("AngelSecurity did not load — alert state is NOT LOADED."));
    else if (!data.alerts.records.length) alertKids.push(meta("NO_ALERTS in this workspace's scope (" + data.alerts.total + " recorded platform-wide). Red is reserved for meaningful active alarms (§82); none are recorded."));
    else data.alerts.records.forEach(function (a) {
      alertKids.push(row(a.title || a.id || "alert", (a.state || a.status || "RECORDED") + ""));
    });
    out.push(panel("Alerts", alertKids));
    // Bots (F-4)
    var botKids = [];
    if (!data.bots.loaded) botKids.push(meta("CryptoBotAssignments did not load — bot state is NOT LOADED."));
    else {
      data.bots.roles.forEach(function (r) {
        botKids.push(row("Role " + r.code, r.assignments.length
          ? r.assignments.length + " recorded assignment(s)"
          : "no recorded assignment"));
      });
      botKids.push(meta("Assignments are records on persistent Tribe principals — roles are assignments, never identity replacements (§62). Workers active: 0 — NOT_CONNECTED (no worker runtime exists)."));
    }
    out.push(panel("Bots", botKids));
    return out;
  }

  // ---- action panels -----------------------------------------------------------

  function actionPanels(ws, data, contextRec, inputs) {
    var panels = {};
    var REG = global.CryptoWorkspaceRegistry;
    if (ws.actions.indexOf("world") !== -1) {
      panels.world = panel("World (§71)", [
        meta("This workspace's recorded Globe lens is " + ws.worldLayer + ". Geographic rendering happens ONLY where a record carries legitimate location data — no crypto record carries coordinates, so WORLD resolves context (the Globe's CRYPTO layer + this workspace's lens) and states the no-geography fact rather than placing a protocol, token or abstract entity at invented coordinates."),
        linkBtn("#/globe", "Open the World Globe")
      ]);
    }
    if (ws.actions.indexOf("encyclopedia") !== -1) {
      panels.encyclopedia = panel("Encyclopedia (§72)", [
        meta("Definitions live in the Encyclopedia only; this workspace never copies definition text into a second store (F-19)."),
        linkBtn(contextRec ? "#/encyclopedia/" + encodeURIComponent(contextRec.id) : "#/encyclopedia",
          contextRec ? "Open " + (contextRec.title || contextRec.id) + " in the Encyclopedia" : "Open the Encyclopedia")
      ]);
    }
    if (ws.actions.indexOf("graph") !== -1) {
      var gKids = [];
      if (!data.graphLoaded) gKids.push(meta("The World Engine graph did not load — NOT LOADED."));
      else if (!contextRec) gKids.push(meta("Select a Major Activity or an entity to open its dependency graph (F-15)."));
      else {
        var deps = global.CryptoWorkspace.dependenciesFor(inputs.graph, contextRec);
        var outs = deps.filter(function (d) { return d.direction === "out"; });
        var ins = deps.filter(function (d) { return d.direction === "in"; });
        gKids.push(U.el("h4", {}, "WHAT DOES THIS DEPEND ON?"));
        if (outs.length) outs.forEach(function (d) { gKids.push(row(d.type, d.label)); });
        else gKids.push(meta("Not recorded."));
        gKids.push(U.el("h4", {}, "WHAT DEPENDS ON THIS?"));
        if (ins.length) ins.forEach(function (d) { gKids.push(row(d.type, d.label)); });
        else gKids.push(meta("Not recorded."));
        if (contextRec.registry === "protocols") {
          gKids.push(meta("Recorded references on the protocol record itself: networks [" +
            (contextRec.networkRefs || []).join(", ") + "] · activities [" +
            (contextRec.activityRefs || []).join(", ") + "] — shown from the record, not from graph edges."));
        }
      }
      panels.graph = panel("Graph (§70)", gKids);
    }
    if (ws.actions.indexOf("source") !== -1) {
      var sKids = [meta("Provenance for what this workspace shows (F-16): SOURCE · ORIGINAL SOURCE · DISCOVERED THROUGH · OBSERVED AT · RETRIEVED AT · FRESHNESS · VERIFICATION STATE. Canonical records carry source + import batch; observed/retrieved times exist on live observations, which load on explicit request in the Live Data panel through the Capability Router and render with their answering provider named.")];
      if (contextRec) {
        sKids.push(row("Selected record", contextRec.title || contextRec.id));
        sKids.push(row("Source", contextRec.source || "not recorded"));
        sKids.push(row("Imported by", contextRec.importBatch || "not recorded"));
        sKids.push(row("Verification state", contextRec.verificationStatus || "UNKNOWN"));
      } else {
        sKids.push(meta("Sources across the shown records: " + (data.sources.names.join(", ") || "none recorded") + ". Select a record to see its own provenance."));
      }
      panels.source = panel("Source (§59)", sKids);
    }
    if (ws.actions.indexOf("compare") !== -1) {
      panels.compare = panel("Compare (§68)", [meta("Compare operates on like-for-like objects over normalized dimensions (cost, risk, liquidity, dependencies, freshness, source coverage). No compare engine is built in this package — the control renders its honest gated state rather than a dead button dressed as live (F-5).")]);
    }
    if (ws.actions.indexOf("simulator") !== -1) {
      panels.simulator = panel("Simulator (§67)", [meta(ws.simulatorTemplate
        ? "Template named by the registry for this workspace: " + ws.simulatorTemplate + ". SIMULATOR NOT BUILT — no §106 simulation engine exists in this build, so no inputs are collected and no outcome is modelled. The opportunity pipeline's SIMULATED stage is a record state, not a model. Any future simulation renders SIMULATED · NOT EXECUTED and writes nothing into canonical financial state (F-21)."
        : "The registry names no simulator template for this workspace.")]);
    }
    // WHY (F-17) rides with the Source contract — structured, never prose.
    var wKids = [];
    if (contextRec) {
      wKids.push(row("Result", (contextRec.title || contextRec.id) + " is shown in " + ws.title));
      wKids.push(row("Because", "it is a canonical record in this workspace's registry scope (primary/secondary mapping, CW-1 §2)"));
      wKids.push(row("Source", contextRec.source || "not recorded"));
      wKids.push(row("Derivation", "Screen Registry mapping over canonical records — no inference, no name matching"));
      wKids.push(row("Freshness", "Canonical identity (durable); no live observation attached"));
      wKids.push(row("Verification", contextRec.verificationStatus || "UNKNOWN"));
    } else {
      wKids.push(meta("WHY answers for a selected record: source → derivation → freshness → verification, assembled from provenance + relationships (F-17). Select a Major Activity or an entity above."));
    }
    panels.why = panel("Why? (§69)", wKids);
    return panels;
  }

  // ---- seat frame (F-6) ---------------------------------------------------------

  var GATE_NOTES = {
    "gamefi": "family-gamefi-socialfi-media exists in Batch A with ZERO majors; a title scan of all 738 Batch B records finds 0 game/gaming records and no GameFi entities exist. GameFi intelligence is crypto-economic only and stays separate from the deferred GTADWIY game; game state never becomes financial truth.",
    "socialfi": "family-gamefi-socialfi-media exists with ZERO majors; 0 social/creator records exist in Batch B and no SocialFi entities exist.",
    "ai-compute": "No standalone AI/Compute major exists. The seat reads the related canonical material named in the registry — the Decentralized Compute Provision type and its strategies under DePIN & Decentralized Compute, and the GPU Mining type under Mining — which stay owned by their home majors (§99). It never presents DePIN compute records as if an AI/Compute taxonomy existed, and never fabricates compute availability.",
    "modular": "family-modular-zk exists with ZERO majors; no taxonomy records describe modular infrastructure (execution / settlement / data-availability / sequencing). The entity side shows the recorded L2 networks; the taxonomy gap is stated, not filled.",
    "identity": "family-privacy-identity exists with ZERO majors; 0 identity/credential/attestation records exist and no entities exist. The stricter §51 privacy boundary applies from the first record: private identity data never becomes ordinary World Engine data."
  };

  function seatPrimary(ws, data) {
    var kids = [
      U.el("span", { class: "mti6-badge mti6-badge--unknown" }, "EXPANSION-GATED SEAT"),
      meta(GATE_NOTES[ws.workspaceId] || "No canonical Major Activity exists for this workspace."),
      meta("A seat graduates only through the governed discovery pipeline plus a separate owner decision — never by a screen build, and never by inventing an activity to fill it.")
    ];
    if (data.relatedRecords.length) {
      kids.push(U.el("h4", {}, "Related canonical material (read-only, owned by its home majors)"));
      data.relatedRecords.forEach(function (r) { kids.push(recordLine(r, 0)); });
    }
    if (data.entities.networks.length) {
      kids.push(U.el("h4", {}, "Recorded entity context"));
      data.entities.networks.forEach(function (r) { kids.push(recordLine(r, 0)); });
    }
    if (!data.relatedRecords.length && !data.entities.networks.length) {
      kids.push(meta("Related canonical material: NONE recorded. The seat is empty because the records do not exist — not because a feed failed."));
    }
    return panel("Primary — Seat", kids);
  }

  // ---- render -------------------------------------------------------------------

  // Live Data (v92, Capability Router): normalized observations
  // for this workspace's recorded protocols/networks/assets,
  // loaded ONLY on the owner's explicit tap. Observations render
  // beside canonical identity and never rewrite it; every line
  // names the provider that actually answered, with observed /
  // retrieved times and freshness. Yields render the §22
  // capability-gap card — no data faked, nothing subscribed.
  function liveDataPanel(ws, data) {
    var results = U.el("div", { class: "cw2-live-results" }, []);
    var loadBtn = U.el("button", { class: "btn btn-primary btn-sm", type: "button" }, "Load live data");
    var yieldsBtn = U.el("button", { class: "btn btn-secondary btn-sm", type: "button" }, "Yields live data");
    function renderResult(res, subjectLabel) {
      if (!res) { results.appendChild(meta(subjectLabel + ": the capability failed unexpectedly — no data shown.")); return; }
      if (res.observations && res.observations.length) {
        res.observations.slice(0, 4).forEach(function (o) {
          results.appendChild(row(subjectLabel,
            o.value + (o.unit ? " " + o.unit : "") + " · SOURCE: " + res.provider +
            " · observed " + (o.observedAt || "not stated") + " · retrieved " + (res.retrievedAt || "not stated") +
            " · " + res.freshnessState + (res.fallbackPosition > 0 ? " · fallback position " + res.fallbackPosition : "")));
        });
        if (res.observations.length > 4) results.appendChild(meta(subjectLabel + ": + " + (res.observations.length - 4) + " more observations from " + res.provider + "."));
      } else {
        results.appendChild(meta(subjectLabel + ": NO DATA — " + (res.note || "no provider answered") +
          (res.failures && res.failures.length ? " Chain: " + res.failures.map(function (f) { return f.provider + " (" + f.failureState + ")"; }).join(" → ") + "." : "")));
      }
    }
    loadBtn.addEventListener("click", function () {
      var CD = global.CryptoData;
      results.innerHTML = "";
      if (!CD || typeof CD.protocol !== "function") {
        results.appendChild(meta("Live data is NOT_CONNECTED — the Capability Router did not load (NOT_LOADED), so no provider was asked."));
        return;
      }
      results.appendChild(meta("Asking the capability router for this workspace's recorded protocols, chains and DEX pairs…"));
      var jobs = [];
      data.entities.protocols.forEach(function (rec) {
        jobs.push(CD.protocol(rec.id).then(function (res) { renderResult(res, "Protocol " + (rec.title || rec.id)); }).catch(function () { renderResult(null, "Protocol " + (rec.title || rec.id)); }));
      });
      data.entities.networks.forEach(function (rec) {
        jobs.push(CD.chain(rec.id).then(function (res) { renderResult(res, "Chain " + (rec.title || rec.id)); }).catch(function () { renderResult(null, "Chain " + (rec.title || rec.id)); }));
      });
      var dexTried = 0;
      data.entities.assets.forEach(function (rec) {
        if (dexTried >= 6) return;
        var ai = null;
        try { ai = (global.AssetIntelligence && typeof global.AssetIntelligence.getAsset === "function") ? global.AssetIntelligence.getAsset(rec.id) : null; } catch (e) {}
        if (ai && ai.contractAddress) {
          dexTried++;
          jobs.push(CD.dexPairsForToken(ai.contractAddress, ai.networkId).then(function (res) { renderResult(res, "DEX pairs " + (rec.title || rec.id)); }).catch(function () { renderResult(null, "DEX pairs " + (rec.title || rec.id)); }));
        }
      });
      if (!dexTried) {
        results.appendChild(meta("No recorded token contract addresses in this workspace's scope — DEX pair lookup not attempted (identity anchors are never guessed)."));
      }
      Promise.all(jobs).then(function () {
        results.appendChild(meta("Done — observations above are the providers' current answers, labelled with source and freshness; canonical records are unchanged by them."));
      });
    });
    yieldsBtn.addEventListener("click", function () {
      var CD = global.CryptoData;
      results.innerHTML = "";
      if (!CD || typeof CD.yields !== "function") {
        results.appendChild(meta("The yields capability did not load (NOT_LOADED)."));
        return;
      }
      CD.yields(ws.workspaceId).then(function (gap) {
        results.appendChild(meta(gap.gap));
        (gap.currentFreeOptions || []).forEach(function (o) { results.appendChild(row("Free option", o)); });
        results.appendChild(row("Limitation", gap.limitation));
        results.appendChild(row("Paid option (not subscribed)", gap.paidOption));
        results.appendChild(row("Expected benefit", gap.expectedBenefit));
        results.appendChild(meta("OWNER DECISION REQUIRED (§22) — no yield data is faked and no subscription is created automatically."));
      });
    });
    return panel("Live Data", [
      meta("Live observations load only on tap, through the Capability Router (Free-First Fallback Directive): DefiLlama free endpoints for protocol/chain TVL, DexScreener for DEX pairs where a token contract address is recorded. TVL is the provider's aggregate under its own methodology — labelled, never presented as a balance or on-chain-verified."),
      U.el("div", { class: "price-input-row" }, [loadBtn, yieldsBtn]),
      results
    ]);
  }

  async function render(root) {
    root.innerHTML = "";
    var REG = global.CryptoWorkspaceRegistry;
    var CW = global.CryptoWorkspace;
    if (!REG || !CW) {
      root.appendChild(panel("Crypto Workspace", [meta("The workspace registry or derivation layer did not load — NOT LOADED, not empty.")]));
      return;
    }
    var param = typeof global.CockpitRouteParam === "string" ? global.CockpitRouteParam : "";
    var parts = param.split("/").filter(Boolean);
    var wsParam = parts[0] || "";
    var routeContext = parts[1] ? decodeURIComponent(parts[1]) : null;
    var ws = REG.WORKSPACES.filter(function (w) { return w.param === wsParam; })[0] || null;
    if (!ws) {
      root.appendChild(panel("Workspace not found", [
        meta("No workspace is registered under \"" + wsParam + "\". The registry holds " + REG.WORKSPACES.length + " workspaces; nothing was guessed."),
        linkBtn("#/crypto-world", "Back to Crypto World")
      ]));
      return;
    }
    var level = viewLevel();
    var inputs = await gather();
    var data = CW.workspaceData(ws.workspaceId, inputs);

    // §83 context: the route carries it, else the session context if
    // it resolves inside this workspace.
    var contextId = routeContext || null;
    if (contextId) CW.setContext(contextId);
    else {
      var sess = CW.getContext();
      if (sess) {
        var res0 = CW.resolveActivity(sess, inputs.records);
        if (res0 && res0.found && (res0.primaryWorkspace === ws.workspaceId ||
          (res0.secondaryWorkspaces || []).indexOf(ws.workspaceId) !== -1)) contextId = sess;
      }
    }
    var contextRec = contextId ? (inputs.records.filter(function (r) { return r && r.id === contextId; })[0] || null) : null;
    var resolution = contextId ? CW.resolveActivity(contextId, inputs.records) : null;
    var trail = resolution && resolution.found ? resolution.trail : null;

    // HEADER (F-1)
    var typeTotal = 0, stratTotal = 0;
    data.majors.concat(data.sharedMajors).forEach(function (t) { typeTotal += t.typeCount; stratTotal += t.strategyCount; });
    var entTotal = data.entities.networks.length + data.entities.assets.length + data.entities.protocols.length;
    var stateLine = ws.gated
      ? "EXPANSION-GATED — no canonical Major Activity exists for this workspace"
      : data.majors.length + " primary Major Activities · " + typeTotal + " Types · " + stratTotal +
        " Strategies · " + entTotal + " entities in recorded scope · " + data.sources.verifiedCount + " verified";
    var header = U.el("div", { class: "mti6-screen-header" }, [
      U.el("span", { class: "mti6-screen-header__icon" }, "💱"),
      U.el("h1", { class: "mti6-screen-header__title" }, ws.title),
      U.el("p", { class: "mti6-screen-header__desc" }, stateLine),
      U.el("div", { class: "mti6-screen-header__status" }, [
        U.el("span", { class: "mti6-badge mti6-badge--read-only" }, "WORKSPACE FRAME — CW-2"),
        U.el("span", { class: "mti6-badge mti6-badge--unverified" }, ws.status111),
        U.el("span", { class: "mti6-badge" }, "SOURCE: " + (data.sources.names.join(", ") || "NONE RECORDED"))
      ])
    ]);
    root.appendChild(header);
    root.appendChild(breadcrumb(ws, trail));
    root.appendChild(ladderStrip(ws));
    root.appendChild(meta("Execution capability: EXECUTION DISABLED — the ladder shows the highest rung this workspace's own controls may reach (" +
      ws.ladderTop + "); OWNER APPROVAL and EXECUTE live only in owner-gated pipeline surfaces."));

    // View-level switch (F-9..F-12)
    var switcher = U.el("div", { class: "price-input-row cw2-views", role: "group", "aria-label": "View level" });
    VIEW_LEVELS.forEach(function (v) {
      var b = U.el("button", { class: "btn " + (v === level ? "btn-primary" : "btn-secondary") + " btn-sm", type: "button" }, v);
      b.addEventListener("click", function () { setViewLevel(v); render(root); });
      switcher.appendChild(b);
    });
    switcher.appendChild(U.el("span", { class: "api-meta" }, "View level changes how much of the SAME records is shown — never which truth (F-12)."));
    root.appendChild(switcher);

    if (ws.gated) {
      root.appendChild(seatPrimary(ws, data));
      intelligencePanels(ws, data, contextRec, inputs).forEach(function (p) {
        if (p.querySelector("h3") && p.querySelector("h3").textContent === "Sources") root.appendChild(p);
      });
      var seatActions = actionPanels(ws, data, contextRec, inputs);
      if (seatActions.encyclopedia) root.appendChild(seatActions.encyclopedia);
      return;
    }

    // PRIMARY
    var primary = primaryPanel(ws, data, level, contextId, inputs);
    if (primary) root.appendChild(primary);

    // CONTEXT + INTELLIGENCE — STANDARD shows the F-9 essentials;
    // ADVANCED/ALL show every panel. Same data at every level.
    var ctx = contextPanels(ws, data);
    var intel = intelligencePanels(ws, data, contextRec, inputs);
    if (level === "STANDARD") {
      ctx.forEach(function (p) { root.appendChild(p); });
      intel.forEach(function (p) {
        var t = p.querySelector("h3") ? p.querySelector("h3").textContent : "";
        if (t === "Costs" || t === "Risks" || t === "Sources") root.appendChild(p);
      });
    } else {
      ctx.forEach(function (p) { root.appendChild(p); });
      intel.forEach(function (p) { root.appendChild(p); });
    }

    // LIVE DATA (v92): workspaces whose recorded scope includes
    // protocols or networks get the router-backed panel.
    if (ws.entityKinds.indexOf("protocols") !== -1 || ws.entityKinds.indexOf("networks") !== -1) {
      root.appendChild(liveDataPanel(ws, data));
    }

    // ACTIONS (F-5): only the controls the registry row allows.
    var actionsBar = U.el("div", { class: "cw2-actions", role: "group", "aria-label": "Workspace actions" });
    var actionPanelsById = actionPanels(ws, data, contextRec, inputs);
    var inspector = U.el("div", { class: "cw2-inspector" });
    function addToggle(id, label, panelEl) {
      if (!panelEl) return;
      panelEl.hidden = true;
      panelEl.setAttribute("data-action-panel", id);
      inspector.appendChild(panelEl);
      var b = U.el("button", { class: "btn btn-secondary btn-sm", type: "button", "aria-expanded": "false", "data-action": id }, label);
      b.addEventListener("click", function () {
        panelEl.hidden = !panelEl.hidden;
        b.setAttribute("aria-expanded", panelEl.hidden ? "false" : "true");
      });
      actionsBar.appendChild(b);
    }
    if (ws.actions.indexOf("star") !== -1) {
      var starBtn = U.el("button", { class: "btn btn-primary btn-sm", type: "button", "data-action": "star" }, "STAR");
      starBtn.addEventListener("click", function () {
        if (global.StarOverlay && typeof global.StarOverlay.open === "function") global.StarOverlay.open();
        else U.toast("STAR did not load — reload and try again.");
      });
      actionsBar.appendChild(starBtn);
    }
    addToggle("compare", "Compare", actionPanelsById.compare);
    addToggle("world", "World", actionPanelsById.world);
    addToggle("encyclopedia", "Encyclopedia", actionPanelsById.encyclopedia);
    addToggle("graph", "Graph", actionPanelsById.graph);
    addToggle("source", "Source", actionPanelsById.source);
    addToggle("why", "Why?", actionPanelsById.why);
    addToggle("simulator", "Simulator", actionPanelsById.simulator);
    root.appendChild(actionsBar);
    root.appendChild(inspector);
    root.appendChild(meta("Workspace " + ws.workspaceId + " · route #/crypto-ws/" + ws.param +
      " · frame generated from the Screen Registry (F-26) · data derived from canonical records + the World Engine, the same derivation every surface shares (§103)."));
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules["crypto-ws"] = { render: render };
})(window);
