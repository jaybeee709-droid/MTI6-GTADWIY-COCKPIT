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

  function helpAnswer() {
    return "In demo mode I answer from the cockpit's real records — no AI backend is connected. Ask me: " +
      "“cockpit status” (the five Globe layers + World Engine graph), “how many records / majors / strategies” (encyclopedia + entity counts), " +
      "“opportunities” (recorded pipeline), “entity candidates” or “entity pipeline” (candidate stages, owner gate queue, frozen batches), “alerts” or “security status”, “bots / assignments” (workforce records), or “wallets” (connection + execution state). " +
      "Prices still go to the Price Scouts and news/GitHub activity to the Knowledge Scouts. Anything that would change something outside this device needs your approval and is not executed here. " + FOOTER;
  }

  // Returns a reply string for cockpit-state questions, or null for
  // everything else. Patterns are deliberately narrow so price,
  // news, GitHub, and general conversation keep their existing routes.
  async function answer(text) {
    var t = " " + String(text || "").toLowerCase().replace(/\s+/g, " ").trim() + " ";
    try {
      if (/\b(what can you (answer|tell|do)|what do you know|your knowledge)\b/.test(t)) return helpAnswer();
      if (/\b(cockpit status|globe status|layer status|world engine status|system status)\b/.test(t) ||
          (/^\s*(status|status\?)\s*$/.test(t))) return await statusAnswer();
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
      if (/\b(world engine|graph)\b/.test(t) && /\b(status|count|how many|nodes|edges|hold|holds)\b/.test(t)) return await countsAnswer();
    } catch (e) {
      return "I could not read the cockpit's records to answer that (local demo). Nothing was changed. " + FOOTER;
    }
    return null;
  }

  global.StarWorld = { answer: answer };
})(typeof window !== "undefined" ? window : this);
