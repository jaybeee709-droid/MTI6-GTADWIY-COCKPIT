/* MTI6-GTADWIY-COCKPIT — STAR World Engine responder (Item 7)
 *
 * Deterministic LOCAL answers to cockpit-state questions, computed
 * from the cockpit's real records through the World Engine graph
 * and the intelligence modules' own summaries. This is NOT an AI
 * backend: there is no model, no provider, and no network call —
 * STAR stays in demo mode, and every answer says so. The responder
 * only claims questions about the cockpit's own state (status,
 * counts, recorded opportunities, alerts, assignments, wallets,
 * the entity candidate pipeline);
 * anything else returns null and the normal Star flow continues
 * (StarCommand, PriceScout, KnowledgeScout, demo backend).
 *
 * Truth rules: numbers come only from real records read at answer
 * time. Workers active is 0 / NOT_CONNECTED because no runtime
 * exists. Balances are UNAVAILABLE because no balance source is
 * connected. Nothing here executes, approves, or changes anything.
 */
(function (global) {
  "use strict";

  var FOOTER = "— Local demo answer from the cockpit's real records (World Engine). No AI backend is connected.";

  function has(t, re) { return re.test(t); }

  async function collectGraph() {
    var WE = global.WorldEngine;
    if (!WE || typeof WE.collectGraph !== "function") return null;
    try { return await WE.collectGraph(); } catch (e) { return null; }
  }

  function levelCounts(graph) {
    var counts = {};
    if (!graph || !graph.nodes) return counts;
    Object.keys(graph.nodes).forEach(function (k) {
      var n = graph.nodes[k];
      if (n && n.kind === "CRYPTO_RECORD" && n.level) {
        counts[n.level] = (counts[n.level] || 0) + 1;
      }
    });
    return counts;
  }

  async function statusAnswer() {
    var GI = global.GlobeIntelligence;
    var layers = null;
    if (GI && typeof GI.listLayersLive === "function") {
      try { layers = await GI.listLayersLive(); } catch (e) { layers = null; }
    }
    if (!layers && GI && typeof GI.listLayers === "function") {
      try { layers = GI.listLayers(); } catch (e) { layers = null; }
    }
    var collected = await collectGraph();
    var lines = ["Cockpit status (World Globe layers):"];
    if (layers && layers.length) {
      layers.forEach(function (l) {
        lines.push("• " + l.label + ": " + l.state + " · " + (l.items ? l.items.length : 0));
      });
    } else {
      lines.push("• Layers: NOT_LOADED — GlobeIntelligence is unavailable.");
    }
    if (collected && collected.graph) {
      var st = collected.graph.stats || {};
      lines.push("World Engine graph: " + (st.nodeCount || 0) + " nodes, " +
        (st.edgeCount || 0) + " relationships, " + (st.unresolvedCount || 0) + " unresolved references.");
    }
    lines.push(FOOTER);
    return lines.join("\n");
  }

  async function countsAnswer() {
    var collected = await collectGraph();
    if (!collected || !collected.graph) {
      return "The World Engine is not loaded, so I cannot count the cockpit's records right now. " + FOOTER;
    }
    var byKind = (collected.graph.stats && collected.graph.stats.byKind) || {};
    var levels = levelCounts(collected.graph);
    // The encyclopedia total is the sum of the taxonomy levels —
    // the store also holds meta records (and, after a future entity
    // import, entity records), which are not encyclopedia entries
    // and are reported on their own lines below.
    var encyTotal = Object.keys(levels).reduce(function (sum, k) { return sum + levels[k]; }, 0);
    var lines = ["What the cockpit actually holds right now:"];
    lines.push("• Encyclopedia: " + encyTotal + " records — " +
      (levels.FAMILY || 0) + " families, " + (levels.MAJOR_ACTIVITY || 0) + " major activities, " +
      (levels.TYPE || 0) + " types, " + (levels.STRATEGY || 0) + " strategies, " +
      (levels.ACTION || 0) + " actions. All UNVERIFIED — imported is not verified.");
    lines.push("• Entities: " + (byKind.ASSET || 0) + " assets, " + (byKind.NETWORK || 0) +
      " networks in the graph (" + (byKind.ASSET_CLASS || 0) + " asset classes). " +
      ((byKind.ASSET || 0) === 0
        ? "Entity Batch 1 is wired but not imported yet — that step needs the owner's separate authorization."
        : "Entity records are UNVERIFIED foundation records."));
    lines.push("• Recorded opportunities: " + (byKind.OPPORTUNITY || 0) +
      ". Wallets discovered: " + (byKind.WALLET || 0) +
      ". Alerts recorded: " + (byKind.ALERT || 0) + ".");
    lines.push(FOOTER);
    return lines.join("\n");
  }

  // P5: entity candidate pipeline visibility. READ-ONLY — the
  // numbers come from EntityGate.pipelineSummary (the same single
  // derivation the Bot Operations panel renders), computed from the
  // real candidate records at answer time. Candidates are UNVERIFIED
  // and unregistered; a zero pipeline answers honestly zero.
  async function pipelineAnswer() {
    var EG = global.EntityGate;
    var s = null;
    if (EG && typeof EG.pipelineSummary === "function") {
      try { s = await EG.pipelineSummary(); } catch (e) { s = null; }
    }
    if (!s) {
      return "The entity candidate pipeline could not be read — the pipeline modules are not loaded, so no pipeline state is claimed. " + FOOTER;
    }
    if (!s.total && !s.frozenPendingCount && !s.importedBatchCount) {
      return "Entity candidate pipeline: 0 candidates recorded. Nothing is waiting at the owner authority gate, " +
        "no frozen batch is pending import, and nothing is stale. Candidates are UNVERIFIED, unregistered discoveries " +
        "until the owner freezes them into a batch and the two-phase import gate registers them; the pipeline itself " +
        "is managed in Crypto World's PIPELINE tab. " + FOOTER;
    }
    var staleDays = (global.EntityCandidates && global.EntityCandidates.STALE_DAYS) || 90;
    var lines = ["Entity candidate pipeline: " + s.total + " candidate record(s) — all UNVERIFIED and unregistered until the owner gate and the two-phase import gate say otherwise."];
    var stageParts = [];
    (s.stageOrder || []).forEach(function (st) {
      var n = s.counts ? (s.counts[st] || 0) : 0;
      if (n > 0 && st !== "REJECTED" && st !== "DUPLICATE") stageParts.push(st + " " + n);
    });
    if (stageParts.length) lines.push("• By stage: " + stageParts.join(", ") + ".");
    lines.push("• Waiting at the owner authority gate (PREPARED): " + s.gateQueueCount +
      ". Frozen batches pending import: " + s.frozenPendingCount +
      (s.frozenPendingCount ? " (" + s.frozenPendingBatches.join(", ") + ")" : "") +
      ". Batches already imported through the gate: " + s.importedBatchCount + ".");
    lines.push("• Stale candidates (still in a working stage, unreviewed for over " + staleDays + " days): " + s.staleCount + ".");
    lines.push("• Terminal history: " + s.terminalCount + " (" + s.rejectedCount + " rejected, " + s.duplicateCount +
      " duplicate) — retained as dedupe memory, not pipeline-active.");
    if (s.decisions && s.decisions.length) {
      var d = s.decisions[0];
      lines.push("• Most recent gate decision: " + d.name + " — " + d.from + " → " + d.to + " by " + d.actor +
        (d.at ? " (" + String(d.at).slice(0, 10) + ")" : "") + ".");
    } else {
      lines.push("• No gate decisions have been recorded yet.");
    }
    lines.push("The pipeline is managed in Crypto World's PIPELINE tab; this answer only reports it.");
    lines.push(FOOTER);
    return lines.join("\n");
  }

  // Resource Engine visibility. READ-ONLY — the numbers come from
  // ResourceEngine.summary (the same single derivation the Bot
  // Operations panel renders), computed from the real candidate and
  // gap records at answer time. Candidates are governed proposals,
  // not connections: a provider is CONNECTED only when the record
  // carries wiring evidence, and health is measured or UNKNOWN.
  async function resourceAnswer() {
    var RE = global.ResourceEngine;
    var s = null;
    if (RE && typeof RE.summary === "function") {
      try { s = await RE.summary(); } catch (e) { s = null; }
    }
    if (!s) {
      return "The Resource Engine could not be read — the resource module is not loaded, so no resource state is claimed. " + FOOTER;
    }
    if (!s.total && !s.gapsTotal) {
      return "Resource Engine: 0 source candidates and 0 capability gaps recorded. Nothing is invented to fill the registry; " +
        "candidates enter through governed discovery and connect only after the owner's approval and real wiring. " + FOOTER;
    }
    var lines = ["Resource Engine: " + s.total + " source candidate record(s) — governed proposals, not connections. " +
      s.connectedCount + " CONNECTED with recorded wiring evidence; health is measured by the Capability Router or UNKNOWN, never assumed."];
    var stageParts = [];
    (s.stageOrder || []).forEach(function (st) {
      var n = s.counts ? (s.counts[st] || 0) : 0;
      if (n > 0 && st !== "REJECTED" && st !== "SUPERSEDED") stageParts.push(st + " " + n);
    });
    if (stageParts.length) lines.push("• By stage: " + stageParts.join(", ") + ".");
    lines.push("• Waiting for the owner's decision (PREPARED): " + s.awaitingDecisionCount +
      (s.awaitingDecisionCount ? " (" + s.awaitingDecision.map(function (a) { return a.name; }).join(", ") + ")" : "") +
      ". Approving is the owner's act; nothing auto-connects.");
    lines.push("• Open capability gaps: " + s.openGapCount +
      (s.openGapCount ? " (" + s.openGaps.map(function (g) { return g.title; }).join(", ") + ")" : "") +
      ". A gap is a statement about MTI6's coverage, not about the world.");
    lines.push("• Stale candidates (working stage, unreviewed for over " + ((global.ResourceEngine && global.ResourceEngine.STALE_DAYS) || 90) + " days): " + s.staleCount +
      ". Terminal history: " + s.terminalCount + " (" + s.rejectedCount + " rejected, " + s.supersededCount +
      " superseded) — retained as resource memory, not pipeline-active.");
    if (s.decisions && s.decisions.length) {
      var d = s.decisions[0];
      lines.push("• Most recent recorded decision: " + d.name + " — " + d.from + " → " + d.to + " by " + d.actor +
        (d.at ? " (" + String(d.at).slice(0, 10) + ")" : "") + ".");
    } else {
      lines.push("• No owner decisions have been recorded yet.");
    }
    lines.push("The Resource Engine is managed in Bot Operations; this answer only reports it.");
    lines.push(FOOTER);
    return lines.join("\n");
  }

  function opportunitiesAnswer() {
    var OI = global.OpportunityIntelligence;
    if (!OI || typeof OI.listOpportunities !== "function") {
      return "OpportunityIntelligence is NOT LOADED, so no opportunity state can be verified. " + FOOTER;
    }
    var opps = [];
    try { opps = OI.listOpportunities() || []; } catch (e) { opps = []; }
    if (!opps.length) {
      return "No opportunities are recorded. The pipeline exists (DISCOVERED → … → PREPARED, never EXECUTED), " +
        "and you can record one from the Opportunities screen's owner intake. Nothing is invented to fill it. " + FOOTER;
    }
    var byState = {};
    opps.forEach(function (o) { if (o) byState[o.pipelineState || "UNKNOWN"] = (byState[o.pipelineState || "UNKNOWN"] || 0) + 1; });
    var parts = Object.keys(byState).map(function (k) { return k + " " + byState[k]; });
    return opps.length + " opportunity record(s): " + parts.join(", ") +
      ". Records only — a recorded opportunity is not a recommendation to act, and no return figure exists unless a sourced estimate was recorded at the proper stage. " + FOOTER;
  }

  function alertsAnswer() {
    var AS = global.AngelSecurity;
    if (!AS || typeof AS.summary !== "function") {
      return "AngelSecurity is NOT LOADED, so no alert state can be verified. " + FOOTER;
    }
    var s = null;
    try { s = AS.summary(); } catch (e) { s = null; }
    if (!s) return "AngelSecurity could not be read. " + FOOTER;
    if (!s.count) {
      return "NO_ALERTS — no alerts are recorded and no live alert feed is connected, so no alert is claimed. " +
        "You can record something you observed yourself from the Security screen's owner intake; it starts at DETECTED. " + FOOTER;
    }
    var byState = s.byState || {};
    var parts = Object.keys(byState).filter(function (k) { return byState[k] > 0; })
      .map(function (k) { return k + " " + byState[k]; });
    return s.count + " alert(s) recorded (" + parts.join(", ") + "). " +
      "Alarm red is reserved for alerts walked to CONFIRMED or beyond; a fresh DETECTED alert never turns anything red. " + FOOTER;
  }

  function botsAnswer() {
    var TP = global.TribePrincipals;
    if (!TP || typeof TP.summary !== "function") {
      return "TribePrincipals is NOT LOADED, so no workforce state can be verified. " + FOOTER;
    }
    var s = TP.summary();
    var cbaCount = 0;
    var CBA = global.CryptoBotAssignments;
    if (CBA && typeof CBA.listAssignments === "function") {
      try { cbaCount = (CBA.listAssignments() || []).length; } catch (e) { cbaCount = 0; }
    }
    return "Workforce: " + s.total + " Tribe principals (identities are permanent), " + s.assigned +
      " assigned, " + s.unassigned + " unassigned; " + cbaCount + " crypto assignment record(s). " +
      "Workers active: 0 — NOT_CONNECTED. No worker runtime exists, so no bot is live, whatever the records say. " + FOOTER;
  }

  function walletsAnswer() {
    var WI = global.WalletIntelligence;
    if (!WI || typeof WI.summary !== "function") {
      return "WalletIntelligence is NOT LOADED, so no wallet state can be verified. " + FOOTER;
    }
    var s = null;
    try { s = WI.summary(); } catch (e) { s = null; }
    if (!s) return "WalletIntelligence could not be read. " + FOOTER;
    var canExec = false;
    try { canExec = typeof WI.canExecuteTransaction === "function" && WI.canExecuteTransaction() === true; } catch (e) { canExec = false; }
    return "Wallets: connection state " + (s.connectionState || "NOT_CONNECTED") + ", " + (s.total || 0) +
      " discovered. Balances are UNAVAILABLE — no balance source is connected, and an unavailable balance is not zero. " +
      "Execution: " + (canExec ? "available" : "DISABLED (canExecuteTransaction() is false)") + ". " + FOOTER;
  }

  // CW-9: STAR's selected Crypto World context. READ-ONLY — the
  // context is published by the workspace screen into StarContext
  // (session-only, in-memory); STAR only reports it, never invents
  // a selection. Every answer below is built from that published
  // context and the World Engine, and every one says the context
  // clears on reload.
  function contextAnswer() {
    var SC = global.StarContext;
    if (!SC || typeof SC.describe !== "function") {
      return "STAR context is NOT LOADED — the context keeper did not load, so no selection can be reported. " + FOOTER;
    }
    return SC.describe() + "\n" + FOOTER;
  }

  function whyAnswer() {
    var SC = global.StarContext;
    if (!SC || typeof SC.whyChain !== "function") {
      return "STAR context is NOT LOADED — the context keeper did not load, so no WHY chain can be built. " + FOOTER;
    }
    return SC.whyChain() + "\n" + FOOTER;
  }

  function freshnessAnswer() {
    var SC = global.StarContext;
    if (!SC || typeof SC.freshness !== "function") {
      return "STAR context is NOT LOADED — the context keeper did not load, so no freshness state can be reported. " + FOOTER;
    }
    return SC.freshness() + "\n" + FOOTER;
  }

  function dependenciesAnswer() {
    var SC = global.StarContext;
    if (!SC || typeof SC.dependencies !== "function") {
      return "STAR context is NOT LOADED — the context keeper did not load, so no dependency state can be reported. " + FOOTER;
    }
    return SC.dependencies() + "\n" + FOOTER;
  }

  function simulateAnswer() {
    var SC = global.StarContext;
    if (!SC || typeof SC.simulationBrief !== "function") {
      return "SIMULATED / NOT EXECUTED — the context keeper did not load, so no simulation brief can be built. Nothing was run and nothing was changed. " + FOOTER;
    }
    return SC.simulationBrief() + "\n" + FOOTER;
  }

  function sourceAnswer() {
    var SC = global.StarContext;
    if (!SC || typeof SC.sourceState !== "function") {
      return "STAR context is NOT LOADED — the context keeper did not load, so no source state can be reported. " + FOOTER;
    }
    return SC.sourceState() + "\n" + FOOTER;
  }

  // WE-5: STAR per-entity intents (contract §6, Ruling 4 — the
  // STAR-facing use, contract §10 Decision 4). Every intent below
  // answers ONLY through WorldQuery: the reply is a prose rendering
  // of the getter's own result for the same entity — same nodeIds,
  // same order, same values. STAR adds no private re-implementation
  // of any question and no hard-coded count. The name in the
  // question is resolved to a node by resolveEntity (below); a
  // bare name that matches more than one entity is asked back,
  // never guessed (the Standing Anchor Rule, §6.0); a name that
  // matches nothing is a measured absence. Every answer carries
  // its basis (graph counts, integrity status, source states) and
  // the demo footer. On a FAILED collection (§7.2) no entity data
  // is presented as current — the failures are the deliverable.
  //
  // Phrases that name the aggregate domains STAR already answers
  // (pipeline, candidates, resources, opportunities) are NOT
  // entity intents — they fall through to those routes. Phrases
  // that name the current selection ("this", "it", "selected")
  // are NOT entity intents either — they fall through to the CW-9
  // context routes, which answer from the selection STAR keeps.

  var CONTEXT_PHRASES = ["this", "it", "that", "selected",
    "the context", "my context", "the current context",
    "this asset", "this protocol", "this workspace",
    "the selection", "my selection"];
  // Words that route to STAR's aggregate answers, never to an
  // entity intent — checked inside the extracted phrase.
  var SKIP_WORDS = ["pipeline", "candidate", "frozen", "resource",
    "capability gap", "opportunit"];

  // Kind words a question may carry ("the network ethereum",
  // "the asset bitcoin"): stripped from the phrase and used as
  // the resolution context. Strategy / type / major / family are
  // CRYPTO_RECORD levels, not kinds.
  var KIND_WORDS = {
    protocol: { kind: "PROTOCOL" }, asset: { kind: "ASSET" },
    network: { kind: "NETWORK" }, opportunity: { kind: "OPPORTUNITY" },
    wallet: { kind: "WALLET" }, principal: { kind: "PRINCIPAL" },
    strategy: { kind: "CRYPTO_RECORD", level: "STRATEGY" },
    type: { kind: "CRYPTO_RECORD", level: "TYPE" },
    major: { kind: "CRYPTO_RECORD", level: "MAJOR_ACTIVITY" },
    family: { kind: "CRYPTO_RECORD", level: "FAMILY" }
  };

  function cleanPhrase(raw) {
    if (!raw) return null;
    var p = String(raw).trim().replace(/\s+/g, " ")
      .replace(/[?.,!]+$/, "").trim();
    if (!p) return null;
    var low = p.toLowerCase();
    if (CONTEXT_PHRASES.indexOf(low) !== -1) return null;
    if (/^(this|that|it)\b/.test(low)) return null;
    for (var i = 0; i < SKIP_WORDS.length; i++) {
      if (low.indexOf(SKIP_WORDS[i]) !== -1) return null;
    }
    return p;
  }

  function stripKind(phrase) {
    var p = String(phrase || "").trim();
    var low = p.toLowerCase().replace(/^the\s+/, "");
    var first = low.split(" ")[0];
    var kw = KIND_WORDS[first];
    if (!kw) return { phrase: p, kindCtx: null };
    var rest = low.slice(first.length).trim();
    if (!rest) return { phrase: p, kindCtx: null };
    return { phrase: rest, kindCtx: kw };
  }

  function nodeMatchesKind(node, kindCtx) {
    if (!kindCtx) return true;
    if (kindCtx.kind && node.kind !== kindCtx.kind) return false;
    if (kindCtx.level && node.level !== kindCtx.level) return false;
    return true;
  }

  // Resolves a name to one entity in the graph. Candidates match
  // on exact nodeId, exact rawId, exact label, or exact record
  // title (all case-insensitive) — never a substring, never a
  // guess. Candidates are grouped into entities by MATCHES twin
  // edges: the twins of one entity are one answer, not an
  // ambiguity. Returns { status: "ok", nodeId, group } (nodeId is
  // the anchor: the CRYPTO_RECORD twin when one exists, else the
  // first nodeId), { status: "ambiguous", groups } (each group an
  // anchor { label, kind, nodeId, nodeIds }), or
  // { status: "not_found", phrase }. Exposed on StarWorld as the
  // harness seam and for future consumers (Search) — the
  // resolution itself is STAR's, the answers are WorldQuery's.
  function resolveEntity(graph, phrase, kindCtx) {
    var p = String(phrase || "").trim().toLowerCase();
    if (!graph || !isPlainObject(graph.nodes) || !p) {
      return { status: "not_found", phrase: phrase };
    }
    var candidates = [];
    if (p.indexOf(":") !== -1) {
      if (graph.nodes[p]) candidates.push(p);
      else {
        var lower = p.toLowerCase();
        Object.keys(graph.nodes).forEach(function (id) {
          if (id.toLowerCase() === lower) candidates.push(id);
        });
      }
    } else {
      Object.keys(graph.nodes).forEach(function (id) {
        var n = graph.nodes[id];
        if (!n) return;
        var raw = String(n.rawId || "").toLowerCase();
        var label = String(n.label || "").toLowerCase();
        var title = n.record && String(n.record.title || "").toLowerCase();
        if (raw === p || label === p || title === p) candidates.push(id);
      });
    }
    candidates.sort();
    if (!candidates.length) return { status: "not_found", phrase: phrase };
    // Group by MATCHES twin edges: union-find over the candidate
    // set, so one entity's twins never read as an ambiguity.
    var parent = {};
    candidates.forEach(function (id) { parent[id] = id; });
    function find(x) {
      while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
      return x;
    }
    (graph.edges || []).forEach(function (e) {
      if (!e || e.type !== "MATCHES") return;
      if (parent.hasOwnProperty(e.from) && parent.hasOwnProperty(e.to)) {
        var a = find(e.from), b = find(e.to);
        if (a !== b) parent[a] = b;
      }
    });
    var groups = {};
    candidates.forEach(function (id) {
      var root = find(id);
      (groups[root] = groups[root] || []).push(id);
    });
    var groupList = Object.keys(groups).sort().map(function (root) {
      var ids = groups[root].slice().sort();
      var anchor = ids[0];
      ids.forEach(function (id) {
        if (graph.nodes[id] && graph.nodes[id].kind === "CRYPTO_RECORD") anchor = id;
      });
      var an = graph.nodes[anchor];
      return { label: nodeLabel(an), kind: an.kind, nodeId: anchor, nodeIds: ids };
    });
    if (kindCtx) {
      // A kind word selects WHICH entity and which anchor — it
      // never amputates the twin set: the group qualifies when any
      // member matches, and the anchor becomes the matching member.
      groupList = groupList.filter(function (g) {
        return g.nodeIds.some(function (id) {
          return nodeMatchesKind(graph.nodes[id], kindCtx);
        });
      });
      groupList.forEach(function (g) {
        var match = g.nodeIds.filter(function (id) {
          return nodeMatchesKind(graph.nodes[id], kindCtx);
        }).sort();
        if (match.length) {
          g.nodeId = match[0];
          g.kind = graph.nodes[match[0]].kind;
          g.label = nodeLabel(graph.nodes[match[0]]);
        }
      });
      if (!groupList.length) return { status: "not_found", phrase: phrase };
    }
    // NodeId-sorted groups, so the disambiguation question is
    // deterministic.
    groupList.sort(function (a, b) { return a.nodeId < b.nodeId ? -1 : 1; });
    if (groupList.length === 1) {
      return { status: "ok", nodeId: groupList[0].nodeId,
        group: groupList[0].nodeIds, label: groupList[0].label,
        kind: groupList[0].kind };
    }
    return { status: "ambiguous", groups: groupList, phrase: phrase };
  }

  function isPlainObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  function nodeLabel(n) {
    if (!n) return "?";
    return n.label || (n.record && n.record.title) || n.nodeId;
  }

  function nodeRef(n) {
    return nodeLabel(n) + " (" + n.kind + ", " + n.nodeId + ")";
  }

  // NodeId-sorted list lines, capped with "+N more" (the getters
  // already sort; the cap keeps a long answer readable and the
  // count always states the full total).
  function nodeList(nodes, cap) {
    var limit = cap || 10;
    var shown = (nodes || []).slice(0, limit).map(nodeRef);
    if ((nodes || []).length > limit) {
      shown.push("+" + ((nodes || []).length - limit) + " more");
    }
    return shown;
  }

  // A fresh collection with the snapshot (so the integrity report's
  // duplicate check can run) plus the integrity report itself.
  // Returns { graph, snapshot, sourceStates, report } or
  // { error } — the error is itself an honest answer, never a
  // silent fall-through.
  async function collectFull() {
    var WE = global.WorldEngine;
    var WQ = global.WorldQuery;
    if (!WE || typeof WE.collect !== "function" ||
        typeof WE.buildGraph !== "function") {
      return { error: "WorldEngine is NOT LOADED, so no entity can be read from the graph right now." };
    }
    if (!WQ) {
      return { error: "WorldQuery is NOT LOADED, so no per-entity question can be answered from the query surface right now." };
    }
    var snap = null;
    try { snap = await WE.collect(); } catch (e) {
      return { error: "The World Engine collection failed (" + (e && e.message ? e.message : "unknown error") + "), so no entity answer is available." };
    }
    var graph = null;
    try { graph = WE.buildGraph(snap.snapshot); } catch (e) {
      return { error: "The World Engine graph could not be built (" + (e && e.message ? e.message : "unknown error") + "), so no entity answer is available." };
    }
    var report = null;
    var IE = global.IntegrityEngine;
    if (IE && typeof IE.assessCollection === "function") {
      try {
        report = IE.assessCollection({ graph: graph, snapshot: snap.snapshot,
          sourceStates: snap.sourceStates });
      } catch (e) { report = null; }
    }
    return { graph: graph, snapshot: snap.snapshot,
      sourceStates: snap.sourceStates, report: report };
  }

  // The §8 basis every per-entity answer carries: graph counts,
  // integrity status, source states. Uncomputed checks are never
  // rendered as 0 here either — the integrity line says UNKNOWN
  // when the engine did not load.
  function basisText(c) {
    var st = (c.graph && c.graph.stats) || {};
    var lines = ["Graph: " + (st.nodeCount || 0) + " nodes / " +
      (st.edgeCount || 0) + " relationships / " +
      (st.unresolvedCount || 0) + " unresolved."];
    if (c.report) {
      if (c.report.status === "OK") lines.push("Integrity: OK.");
      else if (c.report.status === "DEGRADED") {
        lines.push("Integrity: DEGRADED — " +
          (c.report.degradationReasons || []).join("; ") + ".");
      } else {
        lines.push("Integrity: FAILED — " +
          (c.report.failures || []).join("; ") + ".");
      }
    } else {
      lines.push("Integrity: UNKNOWN (integrity engine not loaded).");
    }
    var states = c.sourceStates || {};
    var names = Object.keys(states).sort();
    if (!names.length) {
      lines.push("Sources: UNKNOWN (no collection state).");
    } else {
      var bad = names.filter(function (k) {
        var s = states[k] && states[k].state;
        return s === "NOT_LOADED" || s === "ERROR";
      });
      if (!bad.length) lines.push("Sources: all " + names.length + " LOADED.");
      else {
        lines.push("Sources: " + bad.map(function (k) {
          return k + " " + states[k].state;
        }).join(", ") + " — this answer is partial.");
      }
    }
    return "Basis: " + lines.join(" ");
  }

  function notFoundText(phrase, c) {
    var st = (c.graph && c.graph.stats) || {};
    return "“" + phrase + "” is not recorded in the World Engine graph — " +
      "no node matches that name, raw id, or title. The collection ran (" +
      (st.nodeCount || 0) + " nodes); this is a measured absence, not a " +
      "lookup failure. Check the spelling, or name the kind — for example " +
      "“what does MTI6 know about the network ethereum?”.";
  }

  function ambiguityText(phrase, resolved) {
    var lines = ["“" + phrase + "” names more than one thing in the graph, " +
      "so I will not guess. Which one did you mean?"];
    resolved.groups.forEach(function (g) {
      var others = g.nodeIds.filter(function (id) { return id !== g.nodeId; });
      lines.push("• " + g.label + " (" + g.kind + ", " + g.nodeId + ")" +
        (others.length ? " — same entity as " + others.join(", ") : ""));
    });
    lines.push("Ask again naming the kind — for example “what does MTI6 " +
      "know about the network ethereum?”.");
    return lines.join("\n");
  }

  function asArray(v) { return Array.isArray(v) ? v : []; }

  // Neighbours of the ENTITY (its MATCHES twin set), not of one
  // node: getNeighbors is node-level (§6.0), so the consumer
  // composes it over the twin set — the union of the getter's own
  // results, nodeId-sorted, twins excluded (a twin is the entity
  // itself, not a neighbour). The MATCHES link itself stays
  // visible in the relationships section below.
  function entityNeighbors(c, resolved) {
    var WQ = global.WorldQuery, g = c.graph;
    var seen = {}, out = [];
    resolved.group.forEach(function (id) {
      asArray(WQ.getNeighbors(g, id)).forEach(function (n) {
        if (resolved.group.indexOf(n.nodeId) !== -1) return;
        if (seen[n.nodeId]) return;
        seen[n.nodeId] = true;
        out.push(n);
      });
    });
    out.sort(function (a, b) {
      return a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0;
    });
    return out;
  }

  // Relationships touching the ENTITY: the union of
  // getRelationships over the twin set, deduped by (from, to,
  // type), sorted by (from, to, type) like the getter. The role
  // is relative to the anchor node.
  function entityRelationships(c, resolved) {
    var WQ = global.WorldQuery, g = c.graph;
    var seen = {}, out = [];
    resolved.group.forEach(function (id) {
      asArray(WQ.getRelationships(g, id)).forEach(function (e) {
        var key = e.from + "|" + e.to + "|" + e.type;
        if (seen[key]) return;
        seen[key] = true;
        out.push({ from: e.from, to: e.to, type: e.type,
          verificationStatus: e.verificationStatus !== undefined
            ? e.verificationStatus : null,
          role: e.from === resolved.nodeId ? "out" : "in",
          otherNodeId: e.from === resolved.nodeId ? e.to : e.from });
      });
    });
    out.sort(function (a, b) {
      if (a.from !== b.from) return a.from < b.from ? -1 : 1;
      if (a.to !== b.to) return a.to < b.to ? -1 : 1;
      if (a.type !== b.type) return a.type < b.type ? -1 : 1;
      return 0;
    });
    return out;
  }

  function renderKnow(c, resolved) {
    var WQ = global.WorldQuery;
    var g = c.graph;
    var node = g.nodes[resolved.nodeId];
    var neighbors = entityNeighbors(c, resolved);
    var rels = entityRelationships(c, resolved);
    var strategies = asArray(WQ.getStrategies(g, resolved.nodeId));
    var fresh = WQ.getFreshness(g, resolved.nodeId) || null;
    var byType = {};
    rels.forEach(function (e) { byType[e.type] = (byType[e.type] || 0) + 1; });
    var typeParts = Object.keys(byType).sort().map(function (k) {
      return k + " " + byType[k];
    });
    var lines = ["What MTI6 records about " + nodeLabel(node) +
      " (" + node.kind + ", " + node.nodeId + "):"];
    lines.push("• Verification: " + (node.verificationStatus || "UNKNOWN") +
      (node.verificationStatus === "UNVERIFIED" ? " — imported is not verified." : "."));
    lines.push("• Connected: " + neighbors.length + " neighbour(s)" +
      (neighbors.length ? ": " + nodeList(neighbors, 8).join("; ") : " — none recorded."));
    lines.push("• Relationships: " + rels.length + " recorded edge(s)" +
      (rels.length ? " — " + typeParts.join(", ") + "." : "."));
    lines.push("• Strategies using it: " + strategies.length +
      (strategies.length ? ": " + nodeList(strategies, 8).join("; ") : " — none recorded."));
    lines.push("• Freshness: " + (fresh ? fresh.state : "UNKNOWN") +
      (fresh && fresh.basis ? " — " + fresh.basis : " — no freshness verdict available."));
    return lines.join("\n");
  }

  function renderConnected(c, resolved) {
    var WQ = global.WorldQuery;
    var g = c.graph;
    var node = g.nodes[resolved.nodeId];
    var neighbors = entityNeighbors(c, resolved);
    var rels = entityRelationships(c, resolved);
    var byKind = {};
    neighbors.forEach(function (n) {
      (byKind[n.kind] = byKind[n.kind] || []).push(n);
    });
    var byType = {};
    rels.forEach(function (e) { byType[e.type] = (byType[e.type] || 0) + 1; });
    var lines = ["Everything connected to " + nodeLabel(node) +
      " (" + node.kind + ", " + node.nodeId + ") — " +
      neighbors.length + " neighbour(s), nodeId-sorted:"];
    Object.keys(byKind).sort().forEach(function (k) {
      lines.push("• " + k + " (" + byKind[k].length + "): " +
        nodeList(byKind[k], 10).join("; "));
    });
    if (!neighbors.length) lines.push("• No neighbours recorded.");
    lines.push("• Relationships by edge type: " +
      (rels.length ? Object.keys(byType).sort().map(function (k) {
        return k + " " + byType[k];
      }).join(", ") : "none recorded") + ".");
    return lines.join("\n");
  }

  function renderDependencies(c, resolved) {
    var WQ = global.WorldQuery;
    var g = c.graph;
    var node = g.nodes[resolved.nodeId];
    var deps = asArray(WQ.getDependencies(g, resolved.nodeId));
    var lines = ["What " + nodeLabel(node) + " (" + node.kind + ", " + node.nodeId + ") depends on " +
      "(recorded dependencies, shortest-path depth):"];
    if (!deps.length) {
      lines.push("• No recorded dependencies — nothing in the graph records " +
        "a dependency for this entity (MATCHES twins are the same entity, " +
        "not dependencies).");
    } else {
      deps.forEach(function (d) {
        lines.push("• " + nodeRef(d) + " — depth " + d.depth + ".");
      });
    }
    return lines.join("\n");
  }

  function renderDependents(c, resolved) {
    var WQ = global.WorldQuery;
    var g = c.graph;
    var node = g.nodes[resolved.nodeId];
    var deps = asArray(WQ.getDependents(g, resolved.nodeId));
    var lines = ["What depends on " + nodeLabel(node) + " (" + node.kind + ", " + node.nodeId + ")" +
      " (recorded dependents, shortest-path depth):"];
    if (!deps.length) {
      lines.push("• Nothing recorded depends on this entity.");
    } else {
      deps.forEach(function (d) {
        lines.push("• " + nodeRef(d) + " — depth " + d.depth + ".");
      });
    }
    return lines.join("\n");
  }

  function renderPath(c, from, to) {
    var WQ = global.WorldQuery;
    var g = c.graph;
    var fn = g.nodes[from.nodeId];
    var tn = g.nodes[to.nodeId];
    var path = WQ.getPath(g, from.nodeId, to.nodeId);
    var head = "Recorded path from " + nodeLabel(fn) + " (" + fn.kind + ", " + fn.nodeId + ") to " +
      nodeLabel(tn) + " (" + tn.kind + ", " + tn.nodeId + ") (graph path — explicitly NOT transaction routing):";
    if (!path) {
      return head + "\n• No path in the recorded graph between these two " +
        "entities — a fact, not an error. No route is invented.";
    }
    if (path.nodes.length === 1) {
      return head + "\n• The two names resolve to the same node (" +
        nodeRef(fn) + ") — the path is zero-length.";
    }
    var parts = [];
    path.nodes.forEach(function (id, i) {
      parts.push(nodeLabel(g.nodes[id]));
      if (i < path.edges.length) parts.push("—" + path.edges[i].type + "→");
    });
    return head + "\n• " + parts.join(" ") + "\n• Hops: " + path.edges.length +
      " (" + path.edges.map(function (e) { return e.type; }).join(", ") + ").";
  }

  function renderStrategies(c, resolved) {
    var WQ = global.WorldQuery;
    var g = c.graph;
    var node = g.nodes[resolved.nodeId];
    var strategies = asArray(WQ.getStrategies(g, resolved.nodeId));
    var lines = ["Strategies using " + nodeLabel(node) + " (" + node.kind + ", " + node.nodeId + "): " +
      strategies.length + " recorded."];
    if (!strategies.length) {
      lines.push("• None recorded — getStrategies returned a measured empty.");
    } else {
      nodeList(strategies, 10).forEach(function (s) { lines.push("• " + s); });
    }
    return lines.join("\n");
  }

  function renderEvidence(c, resolved) {
    var WQ = global.WorldQuery;
    var g = c.graph;
    var node = g.nodes[resolved.nodeId];
    var ev = WQ.getEvidence(g, resolved.nodeId) || {};
    var lines = ["Why " + nodeLabel(node) + " (" + node.kind + ", " + node.nodeId + ") is " +
      (node.verificationStatus || "UNKNOWN") + " — the evidence MTI6 " +
      "actually holds:"];
    lines.push("• Source: " + (ev.source || "UNKNOWN") +
      " (origin " + (ev.origin || "UNKNOWN") + ", sourceType " +
      (ev.sourceType || "UNKNOWN") + ").");
    lines.push("• Acquired: " + (ev.acquiredAt || "not recorded") +
      "; retrieved: " + (ev.retrievedAt || "not recorded") +
      "; observed: " + (ev.observedAt || "not recorded") + ".");
    if (ev.evidence && ev.evidence.length) {
      lines.push("• Evidence items: " + ev.evidence.length + " — " +
        ev.evidence.map(function (e) {
          return (e.kind || "?") + " " + (e.ref || "?");
        }).join("; ") + ".");
    } else {
      lines.push("• Evidence items: none — no evidence recorded, which is " +
        "exactly why the record is UNVERIFIED.");
    }
    var hist = ev.transformationHistory || [];
    lines.push("• Transformation history: " + hist.length +
      (hist.length ? " entr" + (hist.length === 1 ? "y" : "ies") + " — " +
        hist.map(function (h) {
          return (h.action || "?") + " by " + (h.actor || "?") +
            (h.at ? " (" + String(h.at).slice(0, 10) + ")" : "");
        }).join("; ") + "." : " — none recorded."));
    lines.push("Provenance explains; it never promotes — this record stays " +
      (node.verificationStatus || "UNKNOWN") + ".");
    return lines.join("\n");
  }

  function renderFreshness(c, resolved) {
    var WQ = global.WorldQuery;
    var g = c.graph;
    var node = g.nodes[resolved.nodeId];
    var f = WQ.getFreshness(g, resolved.nodeId) || null;
    if (!f) {
      return "Freshness of " + nodeLabel(node) + " (" + node.kind + ", " + node.nodeId + "): UNKNOWN — no freshness " +
        "verdict is available for this entity.";
    }
    var lines = ["Freshness of " + nodeLabel(node) + " (" + node.kind + ", " + node.nodeId + "): " + f.state + "."];
    lines.push(f.basis || "No basis recorded.");
    if (f.assessedFrom && f.assessedFrom !== resolved.nodeId) {
      lines.push("Assessed from twin " + f.assessedFrom +
        " (the queried record carries no later attestation).");
    }
    lines.push("Last checked: " + (f.lastChecked || "none recorded") + ".");
    return lines.join("\n");
  }

  function renderStaleRecords(c) {
    var rep = c.report;
    if (!rep) {
      return "Stale records: UNMEASURED — the integrity engine is not " +
        "loaded, so staleness has not been computed.";
    }
    if (!rep.computed || !rep.computed.staleCount) {
      return "Stale records: UNMEASURED — no freshness policy is loaded " +
        "(WE-3), so no staleness count exists.";
    }
    var fr = rep.freshness || {};
    var lines = ["Stale records (measured): " + (rep.staleCount || 0) +
      " of " + (fr.total || 0) + " canonical records are STALE; " +
      (fr.current || 0) + " CURRENT, " + (fr.unknown || 0) +
      " UNKNOWN (no recorded attestation time)."];
    var staleIds = fr.staleNodeIds || [];
    if (!staleIds.length) {
      lines.push("• No stale records — none of the canonical records is " +
        "past its freshness window.");
    } else {
      lines.push("• Stale: " + staleIds.slice(0, 10).map(function (id) {
        var n = c.graph.nodes[id];
        return n ? nodeRef(n) : id;
      }).join("; ") + (staleIds.length > 10
        ? " (+" + (staleIds.length - 10) + " more)" : ""));
    }
    return lines.join("\n");
  }

  function renderAssignments(c, resolved) {
    var WQ = global.WorldQuery;
    var g = c.graph;
    var node = g.nodes[resolved.nodeId];
    var list = asArray(WQ.getAssignments(g, resolved.nodeId));
    var lines = ["Bots investigating " + nodeLabel(node) + " (" + node.kind + ", " + node.nodeId + "): " +
      list.length + " recorded assignment(s)."];
    if (!list.length) {
      lines.push("• No assignments recorded for this entity — no bot is " +
        "recorded as investigating it, and no worker runtime exists.");
    } else {
      list.forEach(function (a) {
        var other = g.nodes[a.otherNodeId];
        lines.push("• " + (a.assignment ? nodeLabel(a.assignment)
          : "(no assignment node)") + " — " + a.direction + " via " +
          a.edge.type + " to " + (other ? nodeRef(other) : a.otherNodeId) + ".");
      });
    }
    lines.push("Workers active: 0 — NOT_CONNECTED. No worker runtime " +
      "exists; these are recorded assignments only, not live work.");
    return lines.join("\n");
  }

  function renderAlerts(c, resolved) {
    var WQ = global.WorldQuery;
    var g = c.graph;
    var node = g.nodes[resolved.nodeId];
    var list = asArray(WQ.getAlerts(g, resolved.nodeId));
    var lines = ["Alerts concerning " + nodeLabel(node) + " (" + node.kind + ", " + node.nodeId + "): " +
      list.length + " recorded."];
    if (!list.length) {
      lines.push("• No alerts recorded for this entity.");
    } else {
      list.forEach(function (a) {
        lines.push("• " + nodeLabel(a.alert) + " — lifecycle " +
          (a.lifecycleState || "UNKNOWN") + ", truth " + a.truth +
          ", alarm " + (a.alarm ? "yes" : "no") + ".");
      });
    }
    return lines.join("\n");
  }

  // Matches one per-entity intent in the (padded, lowercased) text.
  // Returns { intent, phrase } / { intent: "path", phrase, phrase2 } /
  // { intent: "stale" } / null. A matched pattern whose phrase is a
  // context word or an aggregate-domain word is NOT an entity intent
  // — the matcher keeps looking, so the CW-9 context routes and the
  // aggregate routes still win those questions.
  function matchEntityIntent(t) {
    var m, p, p2;
    m = /what does (?:mti6|the cockpit) know about (.+?)\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "know", phrase: p };
    m = /tell me about (.+?)\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "know", phrase: p };
    m = /what do you know about (.+?)\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "know", phrase: p };
    m = /(?:show (?:me )?(?:the )?)?path from (.+?) to (.+?)\s*$/.exec(t);
    if (m) {
      p = cleanPhrase(m[1]); p2 = cleanPhrase(m[2]);
      if (p && p2) return { intent: "path", phrase: p, phrase2: p2 };
    }
    m = /what is (.+?)\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "know", phrase: p };
    m = /what does (.+?) depend on\s*\??\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "dependencies", phrase: p };
    m = /what(?:'s| is) dependent on (.+?)\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "dependents", phrase: p };
    m = /what depends on (.+?)\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "dependents", phrase: p };
    m = /(?:how many|what|which) strategies (?:use|involve|are (?:based|built) on) (.+?)\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "strategies", phrase: p };
    m = /why is (.+?) (?:marked )?unverified\s*\??\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "evidence", phrase: p };
    m = /which sources support (.+?)\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "evidence", phrase: p };
    m = /what evidence (?:is there )?(?:for|supports?) (.+?)\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "evidence", phrase: p };
    m = /where did (.+?) come from\s*\??\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "evidence", phrase: p };
    m = /how fresh is (.+?)\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "freshness", phrase: p };
    m = /is (.+?) stale\s*\??\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "freshness", phrase: p };
    if (/show (?:me )?(?:the )?stale records\s*$/.test(t)) return { intent: "stale" };
    m = /(?:what|which) bots are (?:investigating|assigned to|working on|looking into) (.+?)\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "assignments", phrase: p };
    m = /who is (?:investigating|assigned to|working on|looking into) (.+?)\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "assignments", phrase: p };
    m = /(?:what|which) alerts (?:concern|are (?:about|for)|for) (.+?)\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "alerts", phrase: p };
    m = /show (?:me )?everything connected to (.+?)\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "connected", phrase: p };
    m = /what(?:'s| is) connected to (.+?)\s*$/.exec(t);
    if (m && (p = cleanPhrase(m[1]))) return { intent: "connected", phrase: p };
    return null;
  }

  // The WE-5 dispatcher: match, collect, fail-closed check,
  // resolve, render. Returns a reply string, or null when the
  // text is not a per-entity intent (the caller then falls through
  // to the aggregate and context routes).
  async function entityAnswer(t) {
    var m = matchEntityIntent(t);
    if (!m) return null;
    var c = await collectFull();
    if (c.error) return c.error + " " + FOOTER;
    if (c.report && c.report.status === "FAILED") {
      return "The World Engine collection is FAILED — " +
        (c.report.failures || []).join("; ") +
        ". No entity answer is given while the graph is structurally " +
        "invalid: graph-derived state is not presented as current " +
        "(contract §7.2). " + FOOTER;
    }
    if (m.intent === "stale") {
      return renderStaleRecords(c) + "\n" + basisText(c) + "\n" + FOOTER;
    }
    var stripped = stripKind(m.phrase);
    var phrase = stripped.phrase, kindCtx = stripped.kindCtx;
    var resolved = resolveEntity(c.graph, phrase, kindCtx);
    if (resolved.status === "ambiguous") {
      return ambiguityText(phrase, resolved) + "\n" + basisText(c) + "\n" + FOOTER;
    }
    if (resolved.status !== "ok") {
      return notFoundText(phrase, c) + "\n" + basisText(c) + "\n" + FOOTER;
    }
    if (m.intent === "path") {
      var stripped2 = stripKind(m.phrase2);
      var to = resolveEntity(c.graph, stripped2.phrase, stripped2.kindCtx);
      if (to.status === "ambiguous") {
        return ambiguityText(stripped2.phrase, to) + "\n" + basisText(c) + "\n" + FOOTER;
      }
      if (to.status !== "ok") {
        return notFoundText(stripped2.phrase, c) + "\n" + basisText(c) + "\n" + FOOTER;
      }
      return renderPath(c, resolved, to) + "\n" + basisText(c) + "\n" + FOOTER;
    }
    var body = null;
    if (m.intent === "know") body = renderKnow(c, resolved);
    else if (m.intent === "connected") body = renderConnected(c, resolved);
    else if (m.intent === "dependencies") body = renderDependencies(c, resolved);
    else if (m.intent === "dependents") body = renderDependents(c, resolved);
    else if (m.intent === "strategies") body = renderStrategies(c, resolved);
    else if (m.intent === "evidence") body = renderEvidence(c, resolved);
    else if (m.intent === "freshness") body = renderFreshness(c, resolved);
    else if (m.intent === "assignments") body = renderAssignments(c, resolved);
    else if (m.intent === "alerts") body = renderAlerts(c, resolved);
    if (body === null) return null;
    return body + "\n" + basisText(c) + "\n" + FOOTER;
  }

  // CW-9: STAR summons a Tribe principal into its own separate
  // movable/resizable participant window. The principal is named by
  // its canonical identity (JUDAH … BENJAMIN, or tribe-judah …);
  // role labels are assignments, never names, and STAR is never a
  // principal. The main session (you + STAR) stays where it is —
  // STAR remains available while the participant window is open.
  var PRINCIPAL_NAMES = ["JUDAH", "REUBEN", "GAD", "ASHER", "NAPHTALI", "MANASSEH",
    "SIMEON", "LEVI", "ISSACHAR", "ZEBULUN", "JOSEPH", "BENJAMIN"];
  function bringAnswer(text) {
    var t = " " + String(text || "").toLowerCase() + " ";
    var foundId = null;
    PRINCIPAL_NAMES.forEach(function (name) {
      var id = "tribe-" + name.toLowerCase();
      if (t.indexOf(" " + name.toLowerCase() + " ") !== -1 || t.indexOf(id) !== -1) foundId = id;
    });
    if (!foundId) {
      return "To summon a Tribe principal, name one of the twelve: JUDAH, REUBEN, GAD, ASHER, NAPHTALI, MANASSEH, SIMEON, LEVI, ISSACHAR, ZEBULUN, JOSEPH, BENJAMIN — for example “bring Judah”. STAR itself is never a principal, and the window opens as a separate movable/resizable window while this chat stays open. " + FOOTER;
    }
    var P = global.Participants;
    if (!P || typeof P.openPrincipal !== "function") {
      return "Participant windows are NOT_AVAILABLE — the Participants module did not load, so " + foundId + " cannot be summoned. Nothing was opened. " + FOOTER;
    }
    var r = null;
    try { r = P.openPrincipal(foundId); } catch (e) { r = null; }
    if (!r || !r.opened) {
      var reason = (r && r.reason) || "UNKNOWN";
      return "Could not summon " + foundId + " (" + reason + "). No window was opened and nothing was changed. " + FOOTER;
    }
    var name = foundId.replace("tribe-", "").toUpperCase();
    var ctx = "";
    if (global.StarContext && typeof global.StarContext.describe === "function") {
      try {
        var d = global.StarContext.describe();
        if (d && d.indexOf("No Crypto World context") === -1) ctx = " The window carries STAR's current selected context: " + d.split("\n")[0];
      } catch (e) {}
    }
    return name + " is open in a separate participant window" + (r.alreadyOpen ? " (it was already open, so it was focused instead of duplicated)" : "") +
      ". The window shows the principal's real assignment, status and history only — no fabricated activity — and says NOT_CONNECTED while no worker runtime exists." + ctx +
      " This chat stays open: STAR remains available. " + FOOTER;
  }

  function helpAnswer() {
    return "In demo mode I answer from the cockpit's real records — no AI backend is connected. Ask me: " +
      "“cockpit status” (the five Globe layers + World Engine graph), “how many records / majors / strategies” (encyclopedia + entity counts), " +
      "“opportunities” (recorded pipeline), “entity candidates” or “entity pipeline” (candidate stages, owner gate queue, frozen batches), “alerts” or “security status”, “bots / assignments” (workforce records), or “wallets” (connection + execution state). " +
      "Ask about one thing (WE-5, from the World Engine query surface, with its basis): “what does MTI6 know about Uniswap”, “what does Ethereum depend on”, “what depends on Ethereum”, “what strategies use Aave”, “why is X unverified”, “how fresh is X”, “show the path from X to Y”, “what bots are investigating X”, “what alerts concern X”, “show everything connected to X” — an ambiguous name is asked back, never guessed. " +
      "Crypto World context (CW-9): open a Crypto World workspace and ask “current context”, “why is this shown”, “how fresh is this”, “what does this depend on”, “what source failed” or “simulate this” — every answer comes from the selection STAR is keeping, with the WHY chain Canonical Activity → Asset → Network → Protocol → Strategy → Source Observation → Cost → Risk → Freshness → Dependency. " +
      "“Bring Judah” (or any of the twelve Tribe principals) opens that principal in a separate participant window. " +
      "Prices still go to the Price Scouts and news/GitHub activity to the Knowledge Scouts. Anything that would change something outside this device needs your approval and is not executed here. " + FOOTER;
  }

  // Returns a reply string for cockpit-state questions, or null for
  // everything else. Patterns are deliberately narrow so price,
  // news, GitHub, and general conversation keep their existing routes.
  async function answer(text) {
    var t = " " + String(text || "").toLowerCase().replace(/\s+/g, " ").trim() + " ";
    try {
      // WE-5: per-entity intents go first — "what do you know about
      // X" would otherwise match the help route, and "what is in
      // the entity pipeline?" must keep falling through to the
      // pipeline route (the matcher refuses aggregate-domain and
      // context words, so those questions pass through untouched).
      var entityReply = await entityAnswer(t);
      if (entityReply) return entityReply;
      if (/\b(what can you (answer|tell|do)|what do you know|your knowledge)\b/.test(t)) return helpAnswer();
      if (/\b(cockpit status|globe status|layer status|world engine status|system status)\b/.test(t) ||
          (/^\s*(status|status\?)\s*$/.test(t))) return await statusAnswer();
      // Resource Engine route — sits BEFORE the entity pipeline
      // route because "resource candidates" contains "candidate".
      // Narrow triggers: resource-engine / resource-candidate /
      // capability-gap phrasing, so encyclopedia, entity and
      // opportunity questions keep their existing routes.
      if (/\bresource engine\b/.test(t) || /\bresource (candidates|pipeline|gaps)\b/.test(t) ||
          /\b(api|provider) candidates\b/.test(t) || /\bcapability gaps\b/.test(t) ||
          /\bwhat apis\b/.test(t)) return await resourceAnswer();
      // P5: the entity candidate pipeline route sits BEFORE the
      // generic counts route — "how many entity candidates…" would
      // otherwise match countsAnswer on "entit". The trigger stays
      // narrow: it needs a candidate / entity-pipeline / frozen-batch
      // token, so encyclopedia and opportunity questions keep their
      // existing routes.
      if (/\bcandidate/.test(t) || /\bentity pipeline\b/.test(t) || /\bfrozen batch/.test(t) ||
          (/\bpipeline\b/.test(t) && /\b(entit|gate|frozen|discover)/.test(t))) return await pipelineAnswer();
      if (/\b(how many|count|counts)\b/.test(t) && /\b(major|type|strateg|record|asset|network|protocol|entit|encyclopedia)/.test(t)) return await countsAnswer();
      if (/\bencyclopedia\b/.test(t) && /\b(status|count|records|hold|holds|contain|contains)\b/.test(t)) return await countsAnswer();
      if (/\bopportunit/.test(t)) return opportunitiesAnswer();
      if (/\b(alert|alerts|security status)\b/.test(t)) return alertsAnswer();
      if (/\b(bot|bots|principal|principals|assignment|assignments|worker|workers|tribe|workforce)\b/.test(t) &&
          /\b(status|count|how many|assigned|active|list|recorded|operations)\b/.test(t)) return botsAnswer();
      if (/\bwallet/.test(t)) return walletsAnswer();
      // CW-9: selected-context routes — narrow triggers, before the
      // generic fallthrough. "bring/summon" sits first among them
      // so a summon is never answered as a workforce status.
      if (/\b(bring|summon|open)\b/.test(t) &&
          (/\b(judah|reuben|gad|asher|naphtali|manasseh|simeon|levi|issachar|zebulun|joseph|benjamin)\b/.test(t) ||
           /tribe-(judah|reuben|gad|asher|naphtali|manasseh|simeon|levi|issachar|zebulun|joseph|benjamin)/.test(t) ||
           /\b(tribe|principal)\b/.test(t))) return bringAnswer(text);
      if (/\b(simulate|simulation)\b/.test(t)) return simulateAnswer();
      if (/\b(why is this shown|where did this come from|why am i seeing|why this)\b/.test(t)) return whyAnswer();
      if (/\b(current context|what am i looking at|my context|selected context|what is selected)\b/.test(t)) return contextAnswer();
      if (/\b(how fresh|freshness|how old is this|when was this (observed|retrieved|updated))\b/.test(t)) return freshnessAnswer();
      if (/\b(what does (this|it) depend on|dependencies|what depends on)\b/.test(t)) return dependenciesAnswer();
      if (/\b(what source failed|did a fallback|fallback (provide|provided))\b/.test(t) ||
          (/\b(source|fallback)\b/.test(t) && /\b(context|selection|workspace|shown|this)\b/.test(t))) return sourceAnswer();
      if (/\b(world engine|graph)\b/.test(t) && /\b(status|count|how many|nodes|edges|hold|holds)\b/.test(t)) return await countsAnswer();
    } catch (e) {
      return "I could not read the cockpit's records to answer that (local demo). Nothing was changed. " + FOOTER;
    }
    return null;
  }

  global.StarWorld = { answer: answer, resolveEntity: resolveEntity };
})(typeof window !== "undefined" ? window : this);
