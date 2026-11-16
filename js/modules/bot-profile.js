/* MTI6-GTADWIY-COCKPIT — Bot Profile screen (Bot Profiles +
 * Big Screen Build, owner direction 2026-11-16)
 *
 * Route "#/bot-profile/<ref>" — ref is "star", a canonical Tribe
 * principal id, or a WorkerEngine worker id; no ref renders the
 * bot index. Reachable from the sidebar TRIBES accordion, from
 * the Bot Operations principal grid ("Profile" button), and from
 * worker detail views.
 *
 * The profile is a READOUT of the real records (js/bot-profiles.js
 * derives it from TribePrincipals / WorkerEngine / BotOpsModel /
 * CryptoBotAssignments / EntityGate — the same records Bot
 * Operations renders): identity block, "what they are doing" from
 * the recorded assignments, and graphs drawn ONLY from recorded
 * history/task/assignment data, each with its source line and a
 * WHY? toggle revealing the block's provenance chain (World OS
 * §19: result -> source -> derivation -> freshness). A bot with
 * no recorded activity shows the graph frames with an honest
 * "No recorded activity yet" state — never a synthetic curve.
 *
 * §15 (light-touch): findings converge into ONE World Engine
 * context — the activity section carries that line as copy only;
 * no new data plumbing is introduced here. §18: a profile is
 * intelligence, not authority — it assigns, executes, and
 * approves nothing.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  function whyBlock(why) {
    if (!why) {
      return U.el("div", { class: "bot-why" }, [
        U.el("button", { class: "btn btn-ghost btn-sm bot-why-btn", type: "button", "aria-expanded": "false" }, "Why?"),
        U.el("div", { class: "bot-why-panel", hidden: true }, [
          U.el("div", { class: "api-meta" }, "No provenance recorded for this block — nothing can be shown about where it came from.")
        ])
      ]);
    }
    var panel = U.el("div", { class: "bot-why-panel", hidden: true }, [
      U.el("div", { class: "bot-why-line" }, [U.el("strong", {}, "Source record: "), why.source]),
      U.el("div", { class: "bot-why-line" }, [U.el("strong", {}, "Derivation: "), why.derivation]),
      U.el("div", { class: "bot-why-line" }, [U.el("strong", {}, "Freshness: "), why.freshness])
    ]);
    var btn = U.el("button", {
      class: "btn btn-ghost btn-sm bot-why-btn",
      type: "button",
      "aria-expanded": "false",
      onclick: function () {
        var open = panel.hasAttribute("hidden");
        if (open) panel.removeAttribute("hidden"); else panel.setAttribute("hidden", "");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      }
    }, "Why?");
    return U.el("div", { class: "bot-why" }, [btn, panel]);
  }

  function detailRow(label, value) {
    return U.el("div", { class: "status-row" }, [
      U.el("span", {}, label),
      U.el("span", { class: "status-value" }, value)
    ]);
  }

  function figureNode(profile, cls) {
    if (profile.portraitSrc) {
      var img = U.el("img", {
        class: cls,
        src: profile.portraitSrc,
        alt: "",
        onerror: function () {
          var slot = img.parentNode;
          if (slot) {
            slot.innerHTML = "";
            slot.appendChild(U.el("div", { class: "bot-profile-figure-mark", "aria-hidden": "true" }, profile.fallbackMark || "?"));
          }
        }
      });
      return img;
    }
    return U.el("div", { class: "bot-profile-figure-mark", "aria-hidden": "true" }, profile.fallbackMark || "?");
  }

  function graphPanel(graph) {
    var children = [U.el("h3", {}, graph.title)];
    if (graph.sharedLabel) {
      children.push(U.el("div", { class: "api-meta" }, graph.sharedLabel));
    }
    var body = U.el("div", { class: "bot-profile-graph-body" }, []);
    if (graph.items && graph.items.length && global.Charts && typeof global.Charts.barChart === "function") {
      body.innerHTML = global.Charts.barChart(graph.items);
    } else {
      body.appendChild(U.el("div", { class: "mti6-empty" }, [
        U.el("div", { class: "mti6-empty__title" }, "Nothing to chart"),
        U.el("div", { class: "mti6-empty__body" }, graph.emptyText || "No recorded activity yet — nothing to chart")
      ]));
    }
    children.push(body);
    children.push(U.el("div", { class: "api-meta bot-profile-graph-source" }, graph.sourceLine || ""));
    children.push(whyBlock(graph.why));
    return U.el("div", { class: "api-panel bot-profile-graph" }, children);
  }

  function renderIndex(root) {
    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Bot profiles"),
      U.el("div", { class: "api-meta" },
        "Every bot in the cockpit, from the real records: STAR, the 12 Tribe principals, and every recorded worker. Pick one for its full profile — identity, recorded work, and graphs of its recorded activity only.")
    ]));
    var list = U.el("div", { class: "api-panel bot-profile-index" }, []);
    global.BotProfiles.profileIndex().forEach(function (entry) {
      var btn = U.el("button", { class: "btn btn-secondary bot-profile-index-btn", type: "button" },
        entry.name + " — " + entry.line);
      btn.addEventListener("click", function () {
        location.hash = "#/bot-profile/" + entry.ref;
      });
      list.appendChild(btn);
    });
    root.appendChild(list);
  }

  async function render(root) {
    root.innerHTML = "";
    var BP = global.BotProfiles;
    if (!BP || typeof BP.buildProfile !== "function") {
      root.appendChild(U.el("div", { class: "api-panel" }, [
        U.el("h3", {}, "Bot profile unavailable"),
        U.el("div", { class: "api-meta" }, "The BotProfiles data layer is not loaded, so no profile can be derived — nothing is claimed.")
      ]));
      return;
    }
    var ref = global.CockpitRouteParam;
    if (!ref) {
      renderIndex(root);
      return;
    }
    var profile = null;
    try { profile = BP.buildProfile(ref); } catch (e) { profile = null; }
    if (!profile) {
      root.appendChild(U.el("div", { class: "api-panel" }, [
        U.el("h3", {}, "Bot not found"),
        U.el("div", { class: "api-meta" },
          "No record exists for \"" + ref + "\". Worker records live in the session's WorkerEngine store, so a worker from an earlier session is honestly absent — nothing is invented to fill the gap."),
        U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [
          U.el("button", { class: "btn btn-secondary", type: "button", onclick: function () { location.hash = "#/bot-ops"; } }, "Back to Bot Operations")
        ])
      ]));
      return;
    }

    // ---- Header / identity ----
    var presentBtn = U.el("button", { class: "btn btn-primary", type: "button" }, "Present at big screen");
    presentBtn.addEventListener("click", function () {
      if (global.BotPresenter && typeof global.BotPresenter.show === "function") {
        var result = global.BotPresenter.show(profile.ref);
        if (!result.ok) presentBtn.textContent = "Presenter unavailable";
      } else {
        presentBtn.textContent = "Presenter unavailable";
        presentBtn.disabled = true;
      }
    });
    var header = U.el("div", { class: "api-panel bot-profile-header" }, [
      U.el("div", { class: "bot-profile-figure", "aria-hidden": "true" }, [figureNode(profile, "bot-profile-figure-img")]),
      U.el("div", { class: "bot-profile-head-main" }, [
        U.el("h2", {}, profile.displayTitle),
        U.el("div", { class: "api-meta" }, profile.kindLabel + " · " + profile.parentLine),
        U.el("div", { class: "api-meta" }, profile.liveLine)
      ])
    ]);
    header.querySelector(".bot-profile-head-main")
      .appendChild(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [presentBtn]));
    root.appendChild(header);

    var identity = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Identity & assignment (as recorded)")
    ]);
    identity.appendChild(detailRow("Kind", profile.kindLabel));
    identity.appendChild(detailRow("Record id", profile.id));
    identity.appendChild(detailRow("Parent", profile.parentLine));
    identity.appendChild(detailRow("Role / task assignment", profile.roleLine));
    identity.appendChild(detailRow("Current task", profile.taskLine));
    identity.appendChild(detailRow("Status", profile.statusLine));
    identity.appendChild(whyBlock(profile.identityWhy));
    root.appendChild(identity);

    // ---- What they are doing ----
    var activity = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "What " + (profile.kind === "star" ? "STAR is doing" : profile.name + " is doing")),
      U.el("div", { class: "api-meta bot-profile-convergence" }, BP.CONVERGENCE_LINE)
    ]);
    profile.activityLines.forEach(function (line) {
      activity.appendChild(U.el("div", { class: "bot-profile-line" }, line));
    });
    if (profile.kind === "star") {
      var linesBox = U.el("div", { class: "bot-profile-star-lines" }, [
        U.el("div", { class: "api-meta" }, "Reading the cockpit's recorded state…")
      ]);
      activity.appendChild(U.el("h3", {}, "Cockpit status (World Engine)"));
      activity.appendChild(linesBox);
      BP.starStatusLines().then(function (lines) {
        if (!root.isConnected) return;
        linesBox.innerHTML = "";
        lines.forEach(function (line) {
          linesBox.appendChild(U.el("div", { class: "bot-profile-line" }, line));
        });
      }).catch(function () {});
    }
    activity.appendChild(whyBlock(profile.activityWhy));
    root.appendChild(activity);

    // ---- Workers under this principal ----
    if (profile.kind === "principal") {
      var workersPanel = U.el("div", { class: "api-panel" }, [
        U.el("h3", {}, "Workers under " + profile.name)
      ]);
      if (profile.workers.length) {
        profile.workers.forEach(function (w) {
          var btn = U.el("button", { class: "btn btn-secondary", type: "button" }, w.name + " — " + w.line);
          btn.addEventListener("click", function () { location.hash = "#/bot-profile/" + w.ref; });
          workersPanel.appendChild(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [btn]));
        });
      } else {
        workersPanel.appendChild(U.el("div", { class: "api-meta" },
          profile.workersNote || "No workers recorded under this principal yet"));
      }
      root.appendChild(workersPanel);
    }
    if (profile.kind === "worker" && profile.parentRef) {
      var parentBtn = U.el("button", { class: "btn btn-secondary", type: "button" }, "Parent principal profile");
      parentBtn.addEventListener("click", function () { location.hash = "#/bot-profile/" + profile.parentRef; });
      root.appendChild(U.el("div", { class: "api-panel" }, [
        U.el("h3", {}, "Parent"),
        U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [parentBtn])
      ]));
    }

    // ---- Graphs (recorded data only) ----
    var graphs = (profile.graphs || []).slice();
    if (profile.kind === "principal") {
      var pipelineGraph = null;
      try { pipelineGraph = await BP.pipelineGraphFor(profile.id, profile.name); } catch (e) { pipelineGraph = null; }
      if (pipelineGraph) graphs.push(pipelineGraph);
    }
    graphs.forEach(function (graph) { root.appendChild(graphPanel(graph)); });

    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [
        U.el("button", { class: "btn btn-secondary", type: "button", onclick: function () { location.hash = "#/bot-ops"; } }, "Back to Bot Operations"),
        U.el("button", { class: "btn btn-secondary", type: "button", onclick: function () { location.hash = "#/bot-profile"; } }, "All bot profiles")
      ])
    ]));
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules["bot-profile"] = { render: render };
})(window);
