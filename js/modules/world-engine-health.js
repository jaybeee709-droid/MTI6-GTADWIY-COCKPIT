/* MTI6-GTADWIY-COCKPIT — World Engine Health panel (WE-2, contract §7)
 * Dashboard panel that surfaces the v103 integrity report, exactly as
 * measured. Rendering only — the report is produced by
 * IntegrityEngine.assessCollection on a fresh WorldEngine.collect()
 * + buildGraph, and the degraded flag shown is the WorldQuery
 * summary's (§6.4) own flag on the same collection, so the panel and
 * the summaries can never disagree. Nothing here computes a count, a
 * status, or a state of its own; every number and every state on
 * screen comes from the report, the summary, or the collection's
 * sourceStates. Uncomputed checks render UNMEASURED, never 0
 * (contract §7.1 / Integrity Reporting Rule). On FAILED (§7.2) the
 * graph-derived counts are NOT presented as current — the failures
 * are the deliverable. Read-only: no writes, no navigation, no
 * cached verdict (each render collects fresh, §8.2.2).
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  var COLLECTING_TEXT = "Collecting World Engine health…";

  function line(label, value) {
    return U.el("div", { class: "api-meta" }, label + ": " + value);
  }

  // A count whose check did not run is UNMEASURED, never 0; a count
  // the report does not carry at all is UNKNOWN. A measured count —
  // including a measured 0 — says so.
  function countLine(report, field, label, unmeasuredNote) {
    var c = report.computed || {};
    if (c[field] === false) return line(label, "UNMEASURED (" + unmeasuredNote + ")");
    var v = report[field];
    if (v === null || v === undefined) return line(label, "UNKNOWN (not reported)");
    return line(label, v + (v === 0 ? " (measured)" : ""));
  }

  function listBlock(title, items) {
    var block = U.el("div", { class: "api-meta" }, title + ":");
    if (!items.length) {
      block.appendChild(U.el("div", {}, "none"));
      return block;
    }
    var list = U.el("ul", { class: "price-offer-list" });
    items.forEach(function (t) { list.appendChild(U.el("li", {}, t)); });
    block.appendChild(list);
    return block;
  }

  // Pure presentation: every value comes from the report, the
  // summary, or the collection's sourceStates passed in. Exposed so
  // the harness can render a synthetic FAILED report built by the
  // real engine and assert the fail-closed rendering.
  function renderReport(report, summary, sourceStates) {
    var out = U.el("div", {});
    out.appendChild(line("Status", report.status));

    if (report.status === "FAILED") {
      // §7.2 fail-closed: the failures are the deliverable; graph-
      // derived counts are NOT presented as current.
      out.appendChild(listBlock("Structural failures", report.failures || []));
      out.appendChild(U.el("div", { class: "api-meta" },
        "Graph-derived counts are not presented as current while the collection is FAILED (contract §7.2)."));
    } else {
      out.appendChild(line("Nodes", report.nodeCount + (report.nodeCount === 0 ? " (measured)" : "")));
      out.appendChild(line("Relationships", report.relationshipCount + (report.relationshipCount === 0 ? " (measured)" : "")));
      out.appendChild(countLine(report, "unresolvedCount", "Unresolved references",
        "unresolved references were not counted"));
      out.appendChild(countLine(report, "orphanCount", "Orphan taxonomy nodes",
        "orphans were not counted"));
      out.appendChild(countLine(report, "conflictCount", "Conflicts",
        "no conflict detection has run yet — WE-3"));
      out.appendChild(countLine(report, "staleCount", "Stale records",
        "no freshness policy exists yet — WE-3"));
      var dups = report.computed || {};
      if (dups.duplicateIds === false) {
        out.appendChild(line("Duplicate canonical ids", "UNKNOWN (snapshot not supplied)"));
      } else if (report.duplicateIds && report.duplicateIds.length) {
        out.appendChild(listBlock("Duplicate canonical ids", report.duplicateIds.map(function (d) {
          return d.id + " in kind " + d.kind + " (" + d.count + " records)";
        })));
      } else {
        out.appendChild(line("Duplicate canonical ids", "0 (measured)"));
      }
      out.appendChild(listBlock("Structural failures", report.failures || []));
      out.appendChild(listBlock("Degradation reasons", report.degradationReasons || []));
      var kinds = [];
      Object.keys(report.byKind || {}).sort().forEach(function (k) {
        if (report.byKind[k] > 0) kinds.push(k + " " + report.byKind[k]);
      });
      out.appendChild(line("Nodes by kind", kinds.length ? kinds.join(", ") : "none recorded"));
    }

    var names = Object.keys(sourceStates || {}).sort();
    out.appendChild(listBlock("Sources", names.map(function (n) {
      var s = sourceStates[n] || {};
      return n + ": " + (s.state || "UNKNOWN") + " (" + (typeof s.count === "number" ? s.count : "?") + ")";
    })));

    if (!summary) {
      out.appendChild(line("World summary", "unavailable (no summary supplied)"));
    } else if (summary.degraded) {
      out.appendChild(line("World summary",
        "degraded — " + (summary.degradedReasons || []).join("; ")));
    } else {
      out.appendChild(line("World summary", "not degraded"));
    }
    return out;
  }

  function collectAndFill(body) {
    var WE = global.WorldEngine;
    var IE = global.IntegrityEngine;
    var Q = global.WorldQuery;
    function fail(msg) {
      if (!body.isConnected) return;
      body.innerHTML = "";
      body.appendChild(U.el("div", {}, "World Engine health: UNKNOWN — " + msg));
    }
    if (!WE || typeof WE.collect !== "function" || typeof WE.buildGraph !== "function" ||
        !IE || typeof IE.assessCollection !== "function" ||
        !Q || typeof Q.getWorldSummary !== "function") {
      fail("the World Engine, integrity engine, or query surface did not load.");
      return;
    }
    WE.collect().then(function (collected) {
      var graph = WE.buildGraph(collected.snapshot);
      var dbVersion = (global.CockpitDB && typeof global.CockpitDB.version === "number")
        ? global.CockpitDB.version : null;
      var report = IE.assessCollection(
        { graph: graph, snapshot: collected.snapshot, sourceStates: collected.sourceStates },
        { dbVersion: dbVersion });
      var summary = Q.getWorldSummary(
        { graph: graph, sourceStates: collected.sourceStates, integrity: report });
      if (!body.isConnected) return;
      body.innerHTML = "";
      body.appendChild(renderReport(report, summary, collected.sourceStates));
    }).catch(function (e) {
      fail("collection failed: " + (e && e.message ? e.message : String(e)));
    });
  }

  function renderPanel() {
    var body = U.el("div", { class: "api-meta" }, COLLECTING_TEXT);
    var panel = U.el("section", { class: "api-panel", "aria-label": "World Engine Health" }, [
      U.el("h2", { class: "api-title" }, "🌍 World Engine Health"),
      U.el("div", { class: "api-subtitle" },
        "The World Engine integrity report (contract §7), measured fresh on every visit — " +
        "not a cached verdict. Status, failures, degradation reasons, and per-source states " +
        "come from the integrity engine and the WorldQuery summary on the same collection.")
    ]);
    panel.appendChild(body);
    collectAndFill(body);
    return panel;
  }

  global.WorldEngineHealthUI = { renderPanel: renderPanel, renderReport: renderReport };
})(window);
