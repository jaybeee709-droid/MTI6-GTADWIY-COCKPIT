/* MTI6-GTADWIY-COCKPIT — Big Screen Presenter (Bot Profiles +
 * Big Screen Build, owner direction 2026-11-16)
 *
 * Owner's picture (RoboCop control-room references): the suited
 * man standing BEFORE the wall map, working it. Here, STAR or any
 * bot can stand before the big screen — the World Globe — and
 * present the task/chart it is operating: "the screen is the chart
 * bot operating task I ask for or I need to be showed."
 *
 * Composition: a full standing figure (the bot's real portrait at
 * presenter scale; the established fallback mark when no portrait
 * exists — workers have none) anchored bottom-left before the
 * map, with a presenter card beside it naming the bot, the
 * recorded task it is presenting, and its key graph rendered as
 * the chart. For STAR the card carries STAR's cockpit-status
 * summary (StarWorld's deterministic counts) instead of a task.
 *
 * Truth rules (do not weaken them):
 * - The figure presents REAL recorded state only — the same
 *   BotProfiles derivation the profile view renders. Bots are
 *   labelled "Record readout — not live speech"; STAR's card is
 *   labelled as its local demo derivation. Nothing performs,
 *   speaks, or claims to be live.
 * - One figure system at a time: show() dismisses the Presence
 *   card when one is up, and Presence.show() dismisses the
 *   presenter (see js/presence.js). The STAR launcher
 *   (bottom-right, z 130) is never covered: the presenter sits at
 *   the Presence layer (z 120) on the left.
 * - The presenter belongs to the Globe: navigating away from the
 *   Globe dismisses it. No timers, no motion beyond the shared
 *   entrance fade (off under prefers-reduced-motion).
 *
 * API:
 *   BotPresenter.show(ref) -> {ok, reason}  ("star" | principal id | worker id)
 *   BotPresenter.hide()
 *   BotPresenter.isShowing() -> boolean
 *   BotPresenter.currentRef() -> string | null
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  var rootEl = null;
  var currentRef = null;
  var pendingRef = null;

  function routeBase() {
    var hash = (location.hash || "#/globe").replace(/^#\/?/, "");
    var slash = hash.indexOf("/");
    return slash === -1 ? hash : hash.slice(0, slash);
  }

  function keyGraph(profile) {
    var graphs = Array.isArray(profile.graphs) ? profile.graphs : [];
    for (var i = 0; i < graphs.length; i++) {
      if (graphs[i].items && graphs[i].items.length) return graphs[i];
    }
    return graphs.length ? graphs[0] : null;
  }

  function chartNode(graph) {
    if (!graph) {
      return U.el("div", { class: "api-meta" }, "No chart — no recorded activity to present.");
    }
    var box = U.el("div", { class: "bot-presenter__chart" }, [
      U.el("div", { class: "bot-presenter__chart-title" }, graph.title)
    ]);
    var chartHtml = U.el("div", { class: "bot-presenter__chart-body" }, []);
    if (graph.items && graph.items.length && global.Charts && typeof global.Charts.barChart === "function") {
      chartHtml.innerHTML = global.Charts.barChart(graph.items);
    } else {
      chartHtml.appendChild(U.el("div", { class: "api-meta" }, graph.emptyText || "Nothing to chart"));
    }
    box.appendChild(chartHtml);
    box.appendChild(U.el("div", { class: "api-meta" }, graph.sourceLine || ""));
    return box;
  }

  function figureNode(profile) {
    if (profile.portraitSrc) {
      var img = U.el("img", {
        class: "bot-presenter__figure-img",
        src: profile.portraitSrc,
        alt: "",
        onerror: function () {
          var slot = img.parentNode;
          if (slot) {
            slot.innerHTML = "";
            slot.appendChild(U.el("div", { class: "bot-presenter__figure-mark", "aria-hidden": "true" }, profile.fallbackMark || "?"));
          }
        }
      });
      return img;
    }
    return U.el("div", { class: "bot-presenter__figure-mark", "aria-hidden": "true" }, profile.fallbackMark || "?");
  }

  function mount(profile) {
    hide();
    pendingRef = null;
    var cardChildren = [
      U.el("div", { class: "bot-presenter__head" }, [
        U.el("span", { class: "bot-presenter__name" }, profile.displayTitle),
        U.el("button", {
          class: "btn btn-ghost bot-presenter__close",
          type: "button",
          "aria-label": "Close presenter",
          title: "Close presenter",
          onclick: function () { hide(); }
        }, "×")
      ]),
      U.el("div", { class: "bot-presenter__label" }, profile.presenterLabel || ""),
      U.el("div", { class: "bot-presenter__task" },
        (profile.kind === "star" ? "Presenting: the cockpit's recorded state" : "Presenting: " + profile.taskLine))
    ];
    var chartSlot = U.el("div", { class: "bot-presenter__chart-slot" }, []);
    if (profile.kind === "star") {
      var linesBox = U.el("div", { class: "bot-presenter__lines" }, [
        U.el("div", { class: "api-meta" }, "Reading the cockpit's recorded state…")
      ]);
      cardChildren.push(linesBox);
      if (global.BotProfiles && typeof global.BotProfiles.starStatusLines === "function") {
        global.BotProfiles.starStatusLines().then(function (lines) {
          if (!rootEl) return; // presenter closed meanwhile
          linesBox.innerHTML = "";
          lines.forEach(function (line) {
            linesBox.appendChild(U.el("div", { class: "bot-presenter__line" }, line));
          });
          chartSlot.appendChild(chartNode(keyGraph(profile)));
        }).catch(function () {});
      } else {
        chartSlot.appendChild(chartNode(keyGraph(profile)));
      }
    } else {
      chartSlot.appendChild(chartNode(keyGraph(profile)));
    }
    cardChildren.push(chartSlot);

    rootEl = U.el("div", {
      class: "bot-presenter",
      role: "dialog",
      "aria-label": profile.displayTitle + " presenting at the big screen"
    }, [
      U.el("div", { class: "bot-presenter__figure", "aria-hidden": "true" }, [figureNode(profile)]),
      U.el("div", { class: "bot-presenter__card" }, cardChildren)
    ]);
    currentRef = profile.ref;
    document.body.appendChild(rootEl);
    return rootEl;
  }

  function show(ref) {
    if (!global.BotProfiles || typeof global.BotProfiles.buildProfile !== "function") {
      return { ok: false, reason: "BotProfiles is not loaded — no profile can be presented." };
    }
    var profile = null;
    try { profile = global.BotProfiles.buildProfile(ref); } catch (e) { profile = null; }
    if (!profile) {
      return { ok: false, reason: "No bot record found for " + String(ref) + " — nothing is presented." };
    }
    // One figure system at a time: the presenter replaces the
    // Presence card, and vice versa (js/presence.js hides us).
    if (global.Presence && typeof global.Presence.isShowing === "function" &&
        global.Presence.isShowing() && typeof global.Presence.hide === "function") {
      global.Presence.hide();
    }
    if (routeBase() === "globe") {
      mount(profile);
    } else {
      // Navigate to the big screen; mount when the Globe has
      // rendered (cockpit:route-rendered) so the figure stands
      // before the finished map, not the skeleton.
      pendingRef = ref;
      location.hash = "#/globe";
    }
    return { ok: true, reason: null };
  }

  function hide() {
    if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
    rootEl = null;
    currentRef = null;
    pendingRef = null;
  }

  function isShowing() {
    return !!rootEl;
  }

  window.addEventListener("cockpit:route-rendered", function (ev) {
    if (!pendingRef) return;
    if (!ev || !ev.detail || ev.detail.route !== "globe") return;
    var profile = null;
    try { profile = global.BotProfiles.buildProfile(pendingRef); } catch (e) { profile = null; }
    if (profile) mount(profile);
    else pendingRef = null;
  });

  window.addEventListener("hashchange", function () {
    if (routeBase() !== "globe") hide();
  });

  global.BotPresenter = {
    show: show,
    hide: hide,
    isShowing: isShowing,
    currentRef: function () { return currentRef; }
  };
})(window);
