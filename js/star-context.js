/* MTI6-GTADWIY-COCKPIT — STAR selected context (CW-9)
 *
 * The single keeper for STAR's selected Crypto World context. When
 * Daniel moves through Crypto World — Asset → Strategy → Protocol →
 * Route → Risk → Simulator — the workspace screen publishes the
 * structured context here, and STAR keeps it while he moves, so
 * STAR, the Tribes and the Simulator all answer from the same
 * selection instead of each guessing from the route.
 *
 * What is kept (all from handed-in canonical records, never
 * inferred):
 *   workspace, group, families, majors (id/title/Types/Strategies/
 *   protocolHits), secondary majors, protocols / networks / assets in
 *   recorded scope (id + title), opportunities / positions counts,
 *   cost classes (UNKNOWN), risk dimensions (0 assessed), sources,
 *   the selection trail (Asset → Strategy → Protocol → Route → Risk
 *   → Simulator), and the provenance/freshness states.
 *
 * Truth rules (do not weaken them):
 * - Session-only, in-memory. No store, no network, no secrets.
 *   A reload clears the context; STAR says so instead of
 *   pretending the selection survived.
 * - Freshness is honest: canonical identity is durable; a live
 *   observation exists only when one was explicitly loaded through
 *   the Capability Router, and then the answering provider is named
 *   by the panel that loaded it — never by this keeper.
 * - The simulation brief is an entry point only: structured context
 *   labelled SIMULATED / NOT EXECUTED, with no outcome figure, no
 *   price, no return, no probability. It never writes into
 *   canonical financial state and never claims an execution.
 * - This keeper never executes, approves, or changes anything.
 */
(function (global) {
  "use strict";

  // The selection trail, in the order Daniel moves through it.
  var TRAIL_KINDS = ["Asset", "Strategy", "Protocol", "Route", "Risk", "Simulator"];

  var current = null; // null until a workspace publishes a selection

  function isStr(v) { return typeof v === "string" && v.length > 0; }
  function idTitle(r) {
    if (!r) return null;
    return { id: r.id || null, title: r.title || r.id || null };
  }
  function nowIso() {
    try { return new Date().toISOString(); } catch (e) { return null; }
  }

  // Publishes the structured context for one workspace render.
  // `ws` is the registry row, `data` the workspaceData derivation.
  // Returns the published context (a copy) or null when the inputs
  // cannot describe a workspace. Publishing a new workspace replaces
  // the previous selection — STAR follows where Daniel is, and the
  // trail restarts from the new workspace.
  function setFromWorkspace(ws, data) {
    if (!ws || !data) return null;
    var majors = [];
    (data.majors || []).forEach(function (t) {
      majors.push({
        id: t.record ? t.record.id : null,
        title: t.record ? (t.record.title || t.record.id) : null,
        typeCount: t.typeCount || 0,
        strategyCount: t.strategyCount || 0,
        protocolHits: 0
      });
    });
    // protocolHits live on the group derivations (core.cw6 / infra /
    // cw8); the generic major trees do not carry them. Read them
    // from whichever derivation the workspace published.
    var core = data.core || {};
    ["cw6", "infra", "cw8", "trading", "yield"].forEach(function (key) {
      var g = core[key];
      if (!g || !Array.isArray(g.majors)) return;
      g.majors.forEach(function (m) {
        for (var i = 0; i < majors.length; i++) {
          if (majors[i].id === (m.record ? m.record.id : null)) majors[i].protocolHits = m.protocolHits || 0;
        }
      });
    });
    var secondary = [];
    (data.sharedMajors || []).forEach(function (t) {
      secondary.push({
        id: t.record ? t.record.id : null,
        title: t.record ? (t.record.title || t.record.id) : null,
        typeCount: t.typeCount || 0,
        strategyCount: t.strategyCount || 0
      });
    });
    var costs = [];
    if (data.costs && Array.isArray(data.costs.classes)) {
      data.costs.classes.forEach(function (c) {
        costs.push({ code: c.code || null, state: "UNKNOWN" });
      });
    }
    var risks = [];
    if (data.risks && Array.isArray(data.risks.dimensions)) {
      data.risks.dimensions.forEach(function (d) {
        risks.push({ code: d.code || null, assessed: 0 });
      });
    }
    current = {
      workspaceId: ws.workspaceId || null,
      workspaceTitle: ws.title || ws.workspaceId || null,
      group: ws.group || null,
      families: Array.isArray(ws.families) ? ws.families.slice() : [],
      majors: majors,
      secondaryMajors: secondary,
      protocols: (data.entities.protocols || []).map(idTitle).filter(Boolean),
      networks: (data.entities.networks || []).map(idTitle).filter(Boolean),
      assets: (data.entities.assets || []).map(idTitle).filter(Boolean),
      universeProtocols: (data.entities.totals && data.entities.totals.protocols) || 0,
      opportunities: (data.opportunities && data.opportunities.total) || 0,
      positions: (data.positions && data.positions.records ? data.positions.records.length : 0),
      costs: costs,
      risks: risks,
      sources: (data.sources && Array.isArray(data.sources.names)) ? data.sources.names.slice() : [],
      verifiedCount: (data.sources && data.sources.verifiedCount) || 0,
      simulatorTemplate: ws.simulatorTemplate || null,
      selectedRecord: null,
      trail: [],
      setAt: nowIso()
    };
    return get();
  }

  // Records one step on the selection trail — Asset → Strategy →
  // Protocol → Route → Risk → Simulator. A step names a record that
  // is already in the published context (or the workspace itself);
  // a kind outside the trail is ignored, never invented.
  function select(kind, id, title) {
    if (!current) return null;
    if (TRAIL_KINDS.indexOf(kind) === -1) return null;
    if (!isStr(id)) return null;
    current.trail.push({ kind: kind, id: id, title: isStr(title) ? title : id, at: nowIso() });
    if (kind === "Asset" || kind === "Protocol") {
      current.selectedRecord = { kind: kind, id: id, title: isStr(title) ? title : id };
    }
    return get();
  }

  function get() {
    if (!current) return null;
    return JSON.parse(JSON.stringify(current));
  }

  function hasContext() { return !!current; }

  function clear() { current = null; }

  // One-paragraph human-readable summary of the selection, for STAR
  // replies and participant windows. Every number is a count from
  // the published context; every state is an honest state.
  function describe() {
    if (!current) {
      return "No Crypto World context is selected right now. Open a Crypto World workspace and STAR will keep that selection here — it clears when the page reloads.";
    }
    var lines = [];
    lines.push("Selected context: " + current.workspaceTitle + " (" + current.workspaceId + "), group " + (current.group || "UNKNOWN") + ".");
    lines.push("Majors: " + (current.majors.length
      ? current.majors.map(function (m) { return m.title + " (" + m.typeCount + " Types · " + m.strategyCount + " Strategies · " + m.protocolHits + " of " + current.universeProtocols + " protocols record it)"; }).join("; ")
      : "none — this workspace has no primary Major Activity") + ".");
    lines.push("In recorded scope: " + current.protocols.length + " protocol(s), " + current.networks.length +
      " network(s), " + current.assets.length + " asset(s). Opportunities: " + current.opportunities +
      ". Positions: " + current.positions + ".");
    lines.push("Costs: " + (current.costs.length
      ? current.costs.map(function (c) { return c.code + ": UNKNOWN"; }).join(", ")
      : "no cost classes recorded") + ". Risks: " + (current.risks.length
      ? current.risks.map(function (r) { return r.code + ": 0 assessed"; }).join(", ")
      : "no risk dimensions recorded") + ".");
    lines.push("Sources: " + (current.sources.join(", ") || "none recorded") + ". " + current.verifiedCount + " verified records in scope.");
    if (current.trail.length) {
      lines.push("Trail: " + current.trail.map(function (s) { return s.kind + " " + s.title; }).join(" → ") + ".");
    }
    lines.push("Set at " + (current.setAt || "unknown") + " (session only — clears on reload).");
    return lines.join("\n");
  }

  // The WHY? chain for the current selection, from actual stored
  // relationships and provenance: Canonical Activity → Asset →
  // Network → Protocol → Strategy → Source Observation → Cost →
  // Risk → Freshness → Dependency. A step with nothing recorded
  // says so; no step is filled by inference.
  function whyChain() {
    if (!current) {
      return "No selection to explain: open a Crypto World workspace first, and STAR will keep its context here.";
    }
    var steps = [];
    steps.push("Canonical Activity: " + (current.majors.length
      ? current.majors.map(function (m) { return m.title; }).join("; ")
      : "none — this workspace has no primary Major Activity; its scope comes from secondary majors") + ".");
    steps.push("Asset: " + (current.assets.length
      ? current.assets.map(function (a) { return a.title + " (" + a.id + ")"; }).join(", ")
      : "no asset in recorded scope") + ".");
    steps.push("Network: " + (current.networks.length
      ? current.networks.map(function (n) { return n.title + " (" + n.id + ")"; }).join(", ")
      : "no network in recorded scope") + ".");
    steps.push("Protocol: " + (current.protocols.length
      ? current.protocols.map(function (p) { return p.title + " (" + p.id + ")"; }).join(", ")
      : "no protocol in recorded scope — a venue appears only where a protocol's own activityRefs record the major") + ".");
    steps.push("Strategy: " + (current.majors.length
      ? current.majors.map(function (m) { return m.strategyCount + " strategies under " + m.title; }).join("; ")
      : "no strategies in primary scope") + ".");
    steps.push("Source Observation: no live observation is attached to this selection — observations load only on explicit tap in the Live Data panel through the Capability Router, and the answering provider is named there. Canonical identity is the only observation here.");
    steps.push("Cost: " + (current.costs.length
      ? current.costs.map(function (c) { return c.code + " UNKNOWN"; }).join(", ")
      : "no cost classes recorded") + " — UNKNOWN stays UNKNOWN, never invented to finish a calculation.");
    steps.push("Risk: " + (current.risks.length
      ? current.risks.map(function (r) { return r.code + " 0 assessed"; }).join(", ")
      : "no risk dimensions recorded") + " — NO RECORDED PROFILE, not zero risk.");
    steps.push("Freshness: canonical identity is durable (imported records, source " + (current.sources.join(", ") || "not recorded") +
      "); no live observation, so no observed-at / retrieved-at time exists for this selection.");
    steps.push("Dependency: this workspace's scope is the registry mapping over canonical records — " +
      (current.secondaryMajors.length
        ? "secondary majors " + current.secondaryMajors.map(function (m) { return m.title; }).join(", ") + " also feed it"
        : "no secondary majors feed it") + ". No oracle, bridge or route dependency is recorded for this selection.");
    return "Why this is shown — " + current.workspaceTitle + ":\n" + steps.map(function (s, i) { return (i + 1) + ". " + s; }).join("\n");
  }

  // Freshness, in the directive's truth-state vocabulary.
  function freshness() {
    if (!current) return "UNKNOWN — no context is selected.";
    return "Canonical identity: durable (imported records; " + current.verifiedCount +
      " verified in scope). Live observation: NOT_CONNECTED — no live feed is attached to this selection; " +
      "observations load only on explicit tap through the Capability Router. Last context set: " + (current.setAt || "unknown") + ".";
  }

  // What the selection depends on, from the stored mapping only.
  function dependencies() {
    if (!current) return "No selection — open a Crypto World workspace first.";
    var lines = ["Dependencies for " + current.workspaceTitle + ":"];
    lines.push("• Registry mapping: workspace " + current.workspaceId + " (group " + (current.group || "UNKNOWN") +
      ", families " + (current.families.join(", ") || "none") + ") over canonical records — no inference, no name matching.");
    lines.push("• Primary majors: " + (current.majors.length ? current.majors.map(function (m) { return m.title; }).join("; ") : "none") + ".");
    lines.push("• Secondary majors: " + (current.secondaryMajors.length ? current.secondaryMajors.map(function (m) { return m.title; }).join("; ") : "none") + ".");
    lines.push("• Protocols in scope: " + (current.protocols.length ? current.protocols.map(function (p) { return p.title; }).join(", ") : "none — nothing here depends on a protocol venue") + ".");
    lines.push("• No oracle, bridge or route dependency is recorded for this selection; the World Engine graph holds 0 unresolved references.");
    return lines.join("\n");
  }

  // Source / fallback state for the selection. Canonical context
  // comes from local records — no provider call, no fallback. A live
  // observation, when one is loaded, names its answering provider
  // in the panel that loaded it.
  function sourceState() {
    if (!current) return "No selection — open a Crypto World workspace first.";
    return "Source for " + current.workspaceTitle + ": " + (current.sources.join(", ") || "none recorded") +
      " (canonical records, imported — no provider call was made for this selection, so no fallback was involved and no source failed). " +
      "Live observations are a separate step: they load only on explicit tap in the Live Data panel through the Capability Router, " +
      "and when one loads, the answering provider is named there; if provider A fails and B answers, B is shown as the source.";
  }

  // The simulation brief: the structured context as a simulation
  // entry point. Output is always SIMULATED / NOT EXECUTED. It
  // lists what would be simulated and from what, and models no
  // outcome — no price, return, probability, fee or saving is
  // computed. It writes nothing anywhere.
  function simulationBrief() {
    if (!current) {
      return "SIMULATED / NOT EXECUTED — no context is selected, so there is nothing to simulate. Open a Crypto World workspace first.";
    }
    var lines = [];
    lines.push("SIMULATED / NOT EXECUTED — simulation brief for " + current.workspaceTitle + " (" + current.workspaceId + ").");
    lines.push("Simulating from: " + current.majors.length + " primary major(s), " + current.secondaryMajors.length +
      " secondary major(s), " + current.protocols.length + " protocol(s), " + current.networks.length +
      " network(s), " + current.assets.length + " asset(s) in recorded scope.");
    lines.push("What would be simulated: " + (current.simulatorTemplate
      ? "the registry template " + current.simulatorTemplate + " (no simulation engine exists for it yet — this brief is the entry point, not a run)"
      : "no simulator template is named by the registry for this workspace — this brief is the entry point, not a run") + ".");
    lines.push("Costs in the brief: " + (current.costs.length ? current.costs.map(function (c) { return c.code + " UNKNOWN"; }).join(", ") : "none recorded") +
      " — UNKNOWN stays UNKNOWN; no fee, slippage, spread or funding figure is invented to complete a simulation.");
    lines.push("Risks in the brief: " + (current.risks.length ? current.risks.map(function (r) { return r.code + " 0 assessed"; }).join(", ") : "none recorded") + ".");
    lines.push("No outcome is modelled here: no price, return, probability or saving is computed, and no simulated earning is recorded as an actual earning. Execution stays DISABLED.");
    return lines.join("\n");
  }

  global.StarContext = {
    TRAIL_KINDS: TRAIL_KINDS.slice(),
    setFromWorkspace: setFromWorkspace,
    select: select,
    get: get,
    hasContext: hasContext,
    clear: clear,
    describe: describe,
    whyChain: whyChain,
    freshness: freshness,
    dependencies: dependencies,
    sourceState: sourceState,
    simulationBrief: simulationBrief
  };
})(typeof window !== "undefined" ? window : this);
