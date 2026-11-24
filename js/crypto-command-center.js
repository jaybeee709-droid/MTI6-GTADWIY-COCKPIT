/* MTI6-GTADWIY-COCKPIT — Crypto Command Center (Crypto World Screen #1)
 *
 * STAGE 1 — SELF-CONTAINED MODULE. NOTHING MOUNTS THIS YET.
 *
 * Scope of this file, per owner ruling:
 *   - It renders into a container element handed to it. It does NOT touch
 *     the crypto-world route, the 12-tab system, or any existing screen.
 *   - It reads CryptoWorkspaceRegistry READ-ONLY. It never writes to it.
 *   - It does not edit globe.js, globe-engine.js, crypto-world.js,
 *     crypto-workspace.js, crypto-workspace-registry.js or css/style.css.
 *   - It is not yet registered in index.html. Nothing loads it in the app.
 *
 * Architectural rulings this file obeys:
 *   R1      — the live 56-workspace / 7-group registry is the operational
 *             system of record. The five lenses are a PRESENTATION layer
 *             over it, not a second registry and not taxonomy.
 *   §5      — canonical taxonomy is FAMILY > MAJOR ACTIVITY > TYPE >
 *             STRATEGY > ACTION. A lens is never canonical ancestry.
 *   §10     — the situation deck overlays and launches existing
 *             intelligence. It does not replace the 12 tabs.
 *   §20     — World context is READ-ONLY. No Globe edit, no second map.
 *   B4      — first-ever operating mode is MANUAL. Entering Crypto World
 *             is never read as granting assistant or automation authority.
 *   B5      — context commands are available on every device class, and a
 *             visible accessible alternative is ALWAYS present.
 *
 * Truth rules:
 *   - No fabricated price, balance, position, opportunity, alert, bot
 *     activity, provider health or network status appears anywhere here.
 *   - UNKNOWN stays UNKNOWN. A count that cannot be measured is UNKNOWN,
 *     never 0. A measured 0 says so.
 *   - Colour never carries meaning alone; every state carries text.
 *   - EXECUTE is absent from every control surface in this file.
 *
 * Security: no seed phrase, private key, password, signing secret, token or
 * API secret is requested, collected, stored, exposed or referenced here.
 * There is no signing path and no contract-write path.
 *
 * Storage: IndexedDB is NOT touched. No object store. No migration.
 * One localStorage key holds the operating-mode preference only.
 */
(function (global) {
  "use strict";

  var U = global.U;
  if (!U) return;

  // ---- Constants ----------------------------------------------------------

  var MODE_KEY = "mti6_crypto_cc_mode_v1";

  // The three operating modes. `manual` is the first-ever default and is
  // NEVER inferred from entry. AUTO is not unrestricted financial authority.
  var MODES = [
    { key: "manual", label: "MANUAL",
      note: "You operate. STAR answers; nothing initiates." },
    { key: "assisted", label: "MANUAL + ASSISTANTS", short: "+AI",
      note: "You remain the operator. STAR and the Tribes research, compare, " +
        "explain and monitor within granted permissions." },
    { key: "auto", label: "AUTO",
      note: "Only previously and explicitly authorized automation operates, " +
        "within defined permissions. AUTO is not unrestricted financial authority." }
  ];

  // The five user-facing navigation lenses. PRESENTATION ONLY.
  // A lens may present workspaces from several operational groups; that is
  // its whole purpose. A lens owns no canonical activity.
  var LENSES = [
    { id: "discover", label: "DISCOVER",
      draw: "Understanding before acting: what exists, what is connected, what is unknown.",
      tagline: "Explore, compare and understand the crypto world.",
      groups: ["core"],
      extraIds: ["markets-assets", "networks", "protocols", "intelligence", "live-data"] },
    { id: "earn", label: "EARN",
      draw: "Return-seeking activity and the capital that feeds it.",
      tagline: "Staking, liquidity, farming, lending, vaults and infrastructure earning.",
      groups: ["yield", "infrastructure"] },
    { id: "trade", label: "TRADE",
      draw: "Exchange, routing and spread activity.",
      tagline: "Markets, spot, DEX, swap, aggregation, arbitrage and derivatives.",
      groups: ["trading", "derivatives"] },
    { id: "infrastructure", label: "INFRASTRUCTURE",
      draw: "The rails the rest of Crypto World runs on.",
      tagline: "Networks, nodes, validators, bridges and routing.",
      groups: ["routing"] },
    { id: "specialized", label: "SPECIALIZED",
      draw: "Emerging and cross-cutting crypto economies.",
      tagline: "BTCFi, RWA, DePIN, prediction, governance and specialised systems.",
      groups: ["specialized"] }
  ];

  // Situation deck. Each item either summarises existing intelligence or
  // launches an existing surface. NEVER a second data system.
  // `covers` records which of the 12 existing tabs this item draws from.
  var DECK = [
    { id: "markets", label: "MARKETS",
      covers: ["activities", "assets", "networks", "protocols"],
      sources: ["MarketIntelligence", "AssetIntelligence", "NetworkIntelligence"] },
    { id: "opportunities", label: "OPPORTUNITIES",
      covers: ["opportunities"],
      sources: ["OpportunityIntelligence"], route: "#/opportunities" },
    { id: "positions", label: "POSITIONS",
      covers: ["positions"],
      sources: ["PositionIntelligence"], route: "#/positions" },
    { id: "earnings", label: "EARNINGS",
      covers: ["costs"],
      sources: ["CostIntelligence"], route: "#/earn" },
    { id: "bots", label: "BOT ACTIVITY",
      covers: ["bots"],
      sources: ["BotOpsModel"], route: "#/bot-ops" },
    { id: "alerts", label: "ALERTS",
      covers: ["security"],
      sources: ["AngelSecurity"], route: "#/security" }
  ];

  // The twelve existing Crypto World tabs, named here so the reconciliation
  // is visible and testable rather than assumed.
  var EXISTING_TABS = ["overview", "activities", "assets", "networks", "protocols",
    "pipeline", "positions", "opportunities", "risk", "costs", "bots", "security"];

  // Status strip domains. Each reads a REAL source or reports NOT CONNECTED.
  var STATUS_DOMAINS = [
    { id: "engine", label: "WORLD ENGINE", probe: ["WorldEngine", "collect"] },
    { id: "data", label: "DATA", probe: ["CryptoWorld", "getAllRecords"] },
    { id: "router", label: "ROUTER", probe: ["ProviderRouter", "health"] },
    { id: "security", label: "SECURITY", probe: ["AngelSecurity", "summary"] },
    { id: "star", label: "STAR", probe: ["StarBackend", "getStatusLabel"] },
    { id: "bots", label: "BOTS", probe: ["BotOpsModel", "summary"] },
    { id: "wallet", label: "WALLET", probe: ["WalletIntelligence", null] }
  ];

  // Context commands, by canonical entity kind. Only what the entity
  // actually supports is ever offered.
  var CONTEXT_ACTIONS = {
    asset: ["EXPLORE", "MARKETS", "TRADE", "SWAP", "STAKE", "LEND", "YIELD", "RISK", "ENCYCLOPEDIA", "ASK STAR"],
    network: ["EXPLORE", "BRIDGES", "DEXS", "YIELD", "VALIDATORS", "PROTOCOLS", "RISK", "ASK STAR"],
    protocol: ["EXPLORE", "MARKETS", "ROUTES", "RISK", "POSITIONS", "ENCYCLOPEDIA", "ASK STAR"],
    opportunity: ["EXPLORE", "COMPARE", "SIMULATE", "ASK STAR"],
    position: ["EXPLORE", "RISK", "COST", "ASK STAR"],
    strategy: ["EXPLORE", "COMPARE", "SIMULATE", "ASK STAR"]
  };

  // ---- Small helpers ------------------------------------------------------

  function meta(text) {
    return U.el("div", { class: "cw-cc-meta" }, text);
  }

  function el(tag, attrs, children) {
    return U.el(tag, attrs || {}, children || []);
  }

  function region(id, label, children) {
    var node = el("section", { class: "cw-cc-region", "data-cw-cc-region": id, "aria-label": label });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  // Every count in this file passes through here. A value that cannot be
  // measured is UNKNOWN, never 0.
  function count(value, measured) {
    if (value === null || value === undefined) return "UNKNOWN";
    if (measured === false) return "UNMEASURED";
    if (typeof value === "number" && value === 0) return "0 (measured)";
    return String(value);
  }

  function safeCall(fn) {
    try { var r = fn(); return r === undefined ? null : r; } catch (e) { return null; }
  }

  // Truth vocabulary. Reused from Truth when present; the literal fallbacks
  // are the same approved strings, so the screen never invents a new word.
  var TRUTH_FALLBACK = ["NOT_CONNECTED", "NOT_LOADED", "NO_DATA", "UNKNOWN",
    "UNMEASURED", "UNVERIFIED"];
  function truthStates() {
    var T = global.Truth;
    if (T && T.TRUTH_STATES && Array.isArray(T.TRUTH_STATES)) return T.TRUTH_STATES;
    return TRUTH_FALLBACK;
  }
  function truthLabel(state) {
    var T = global.Truth;
    if (T && typeof T.labelFor === "function") {
      var l = safeCall(function () { return T.labelFor(state); });
      if (l) return l;
    }
    return state;
  }

  // ---- Registry reads (READ-ONLY) ----------------------------------------

  function registry() {
    return global.CryptoWorkspaceRegistry || null;
  }

  function workspaces() {
    var R = registry();
    return R && Array.isArray(R.WORKSPACES) ? R.WORKSPACES : null;
  }

  function groups() {
    var R = registry();
    return R && Array.isArray(R.GROUPS) ? R.GROUPS : null;
  }

  // A lens resolves to workspaces from the live registry. Workspaces whose
  // group is listed, plus any explicit extras. Nothing is invented: if the
  // registry is absent, the lens resolves to an empty list and says so.
  function lensWorkspaces(lens) {
    var all = workspaces();
    if (!all) return [];
    var seen = {};
    var out = [];
    all.forEach(function (w) {
      if (!w || !w.workspaceId || seen[w.workspaceId]) return;
      var isExtra = lens.extraIds && lens.extraIds.indexOf(w.workspaceId) !== -1;
      if (lens.groups.indexOf(w.group) !== -1 || isExtra) {
        seen[w.workspaceId] = true;
        out.push(w);
      }
    });
    return out;
  }

  // Coverage is reported honestly: a lens may cover a workspace, and the
  // same workspace may legitimately appear under more than one lens. That is
  // a presentation property, not a data defect, and it is stated as such.
  function lensCoverage() {
    var all = workspaces();
    if (!all) return null;
    var counts = {};
    var perLens = {};
    LENSES.forEach(function (l) {
      var ws = lensWorkspaces(l);
      perLens[l.id] = ws.length;
      ws.forEach(function (w) { counts[w.workspaceId] = (counts[w.workspaceId] || 0) + 1; });
    });
    var covered = Object.keys(counts).length;
    var multi = Object.keys(counts).filter(function (k) { return counts[k] > 1; }).length;
    var uncovered = all.filter(function (w) { return !counts[w.workspaceId]; });
    return {
      total: all.length,
      covered: covered,
      uncovered: uncovered.length,
      uncoveredIds: uncovered.map(function (w) { return w.workspaceId; }),
      multiLens: multi,
      perLens: perLens
    };
  }

  // ---- Region builders ----------------------------------------------------

  function headerRegion() {
    return region("header", "Crypto Command Center", [
      el("h2", { class: "cw-cc-title" }, "◈ Crypto Command Center"),
      meta("Observe, discover, understand, compare, launch. This is the entry experience " +
        "for Crypto World — not a financial execution screen. No wallet, order or transaction " +
        "control appears here.")
    ]);
  }

  // A. MODE STRIP — first-ever default is MANUAL (ruling B4).
  function modeStrip() {
    var current = getMode();
    var box = el("div", { class: "cw-cc-modes", role: "radiogroup", "aria-label": "Operating mode" });
    MODES.forEach(function (m) {
      var btn = el("button", {
        type: "button", role: "radio",
        class: "cw-cc-mode" + (m.key === current ? " cw-cc-mode--on" : ""),
        "aria-checked": m.key === current ? "true" : "false",
        "data-mode": m.key
      }, [
        el("span", { class: "cw-cc-mode-label" }, m.label),
        el("span", { class: "cw-cc-mode-note" }, m.note)
      ]);
      btn.addEventListener("click", function () { setMode(m.key); renderModes(box); });
      box.appendChild(btn);
    });
    return region("modes", "Operating mode", [
      meta("Entering Crypto World never grants assistant or automation authority. " +
        "The first time this screen is opened the mode is MANUAL."),
      box
    ]);
  }

  function renderModes(box) {
    var current = getMode();
    Array.prototype.forEach.call(box.querySelectorAll(".cw-cc-mode"), function (btn) {
      var on = btn.getAttribute("data-mode") === current;
      btn.className = "cw-cc-mode" + (on ? " cw-cc-mode--on" : "");
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function getMode() {
    try {
      var v = global.localStorage.getItem(MODE_KEY);
      for (var i = 0; i < MODES.length; i++) if (MODES[i].key === v) return v;
    } catch (e) {}
    return "manual"; // first-ever default — never inferred from entry
  }

  function setMode(key) {
    for (var i = 0; i < MODES.length; i++) {
      if (MODES[i].key === key) {
        try { global.localStorage.setItem(MODE_KEY, key); } catch (e) {}
        return;
      }
    }
  }

  // B. STATUS STRIP — every dot reads a real source or says NOT CONNECTED.
  function statusStrip() {
    var row = el("div", { class: "cw-cc-status", role: "list", "aria-label": "Platform status" });
    STATUS_DOMAINS.forEach(function (d) {
      var mod = global[d.probe[0]];
      var loaded = !!mod && (!d.probe[1] || typeof mod[d.probe[1]] === "function");
      var stateText = loaded ? "AVAILABLE" : "NOT CONNECTED";
      var item = el("div", {
        role: "listitem",
        class: "cw-cc-status-item" + (loaded ? " cw-cc-status-item--on" : ""),
        "data-domain": d.id, title: d.label + ": " + stateText
      }, [
        el("span", { class: "cw-cc-status-dot", "aria-hidden": "true" }, loaded ? "●" : "○"),
        el("span", { class: "cw-cc-status-label" }, d.label),
        // Text always carries the meaning; colour only reinforces it.
        el("span", { class: "cw-cc-status-state" }, stateText)
      ]);
      row.appendChild(item);
    });
    return region("status", "Platform status", [row]);
  }

  function groupLabels() {
    var g = groups();
    if (!g) return "UNKNOWN";
    return g.map(function (x) { return x.label || x.id; }).join(" · ");
  }

  // C. NAVIGATION LENSES — presentation over the live registry.
  function lensRegion() {
    var R = registry();
    var g = groups();
    var kids = [];

    if (!R || !workspaces()) {
      kids.push(meta("The Crypto workspace registry did not load — NOT LOADED. " +
        "No lens can be populated, and none is invented here."));
      return region("lenses", "Navigation lenses", kids);
    }

    var cov = lensCoverage();

    kids.push(meta("These five lenses are a way to find and launch what already exists. " +
      "They are presentation only: they are not canonical taxonomy, they own no canonical " +
      "activity, and they do not replace the operational workspace groups below."));

    kids.push(el("div", { class: "cw-cc-lens-sub" },
      "Operational system of record: " + count(cov.total, true) + " workspaces across " +
      count(g ? g.length : null, g ? true : false) + " groups — " + groupLabels() + "."));

    LENSES.forEach(function (l) {
      var ws = lensWorkspaces(l);
      var card = el("div", { class: "cw-cc-lens", "data-lens": l.id });
      card.appendChild(el("div", { class: "cw-cc-lens-head" }, [
        el("span", { class: "cw-cc-lens-label" }, l.label),
        el("span", { class: "cw-cc-lens-count" }, count(ws.length, true) + " workspaces")
      ]));
      card.appendChild(el("div", { class: "cw-cc-lens-tagline" }, l.tagline));
      card.appendChild(el("div", { class: "cw-cc-lens-draw" }, l.draw));

      var list = el("ul", { class: "cw-cc-lens-list" });
      if (!ws.length) {
        list.appendChild(el("li", { class: "cw-cc-lens-empty" },
          "No workspaces resolve into this lens from the live registry."));
      } else {
        ws.forEach(function (w) {
          list.appendChild(el("li", { class: "cw-cc-lens-ws" }, [
            el("a", { href: R.hrefFor ? R.hrefFor(w) : "#/crypto-world", class: "cw-cc-lens-link" },
              w.title || w.workspaceId),
            el("span", { class: "cw-cc-lens-meta" },
              (w.group || "UNKNOWN") + " · " + (w.ladderTop || "UNKNOWN"))
          ]));
        });
      }
      card.appendChild(list);
      kids.push(card);
    });

    // Coverage is stated, including what a lens does NOT reach.
    var covBox = el("div", { class: "cw-cc-lens-coverage" });
    covBox.appendChild(el("div", {}, "Workspaces reachable through the lenses: " +
      count(cov.covered, true) + " of " + count(cov.total, true) + ". " +
      (cov.uncovered
        ? count(cov.uncovered, true) + " are not reachable through a lens and remain " +
          "reachable through their operational group."
        : "Every workspace is reachable through at least one lens.")));
    if (cov.multiLens) {
      covBox.appendChild(el("div", {}, count(cov.multiLens, true) +
        " workspace(s) appear under more than one lens. That is a presentation " +
        "property of the lenses, not duplicated data."));
    }
    kids.push(covBox);

    return region("lenses", "Navigation lenses", kids);
  }

  // D. SITUATION DECK MODEL — reconciles with the existing 12 tabs.
  // It launches and summarises. It never replaces a tab.
  function deckRegion() {
    var kids = [];
    kids.push(meta("This deck opens and summarises intelligence that already exists. " +
      "It is a launcher and a summary surface — not a second data system, and not a " +
      "replacement for the Crypto World tabs."));

    var grid = el("div", { class: "cw-cc-deck" });
    DECK.forEach(function (d) {
      var live = d.sources.filter(function (name) { return !!global[name]; });
      var loaded = live.length > 0;
      var card = el("div", { class: "cw-cc-deck-card", "data-deck": d.id });
      card.appendChild(el("div", { class: "cw-cc-deck-head" }, [
        el("span", { class: "cw-cc-deck-label" }, d.label)
      ]));
      // Truthful state: a card with no loaded source says so and shows no number.
      card.appendChild(el("div", { class: "cw-cc-deck-state" },
        loaded ? truthLabel("UNVERIFIED") : truthLabel("NOT_CONNECTED")));
      card.appendChild(el("div", { class: "cw-cc-deck-src" },
        loaded
          ? "Sources available: " + live.join(" · ") + ". Values appear only where a real source reports them."
          : "No source is connected for this card. Nothing is estimated or invented."));
      card.appendChild(el("div", { class: "cw-cc-deck-covers" },
        "Draws from the existing tabs: " + d.covers.join(" · ")));
      if (d.route) {
        card.appendChild(el("div", { class: "cw-cc-actions" }, [
          el("a", { href: d.route, class: "cw-cc-btn" }, "Open")
        ]));
      }
      grid.appendChild(card);
    });
    kids.push(grid);

    // The reconciliation is visible, including what the deck does NOT cover.
    kids.push(deckReconciliationNode());
    return region("deck", "Situation deck", kids);
  }

  // The deck is not a superset of the tabs. The uncovered tabs are named so
  // that nothing looks silently dropped.
  function deckReconciliationData() {
    var covered = {};
    DECK.forEach(function (d) {
      d.covers.forEach(function (t) { covered[t] = (covered[t] || 0) + 1; });
    });
    return {
      tabs: EXISTING_TABS.slice(),
      covered: EXISTING_TABS.filter(function (t) { return !!covered[t]; }),
      uncovered: EXISTING_TABS.filter(function (t) { return !covered[t]; })
    };
  }

  function deckReconciliationNode() {
    var r = deckReconciliationData();
    var box = el("div", { class: "cw-cc-deck-recon" });
    box.appendChild(el("div", {}, "Existing Crypto World tabs: " + count(r.tabs.length, true) +
      ". Summarised by a deck card: " + count(r.covered.length, true) + "."));
    box.appendChild(el("div", {}, r.uncovered.length
      ? "Tabs with no deck card — all of them remain available as tabs: " + r.uncovered.join(" · ")
      : "Every existing tab is represented by at least one deck card."));
    box.appendChild(el("div", {}, "The deck does not remove, hide or replace any tab. All " +
      count(r.tabs.length, true) + " stay reachable exactly as they are today."));
    return box;
  }

  // E. CONTEXT COMMANDS — with a mandatory accessible alternative (B5).
  function contextRegion() {
    var kids = [];
    kids.push(meta("Context actions depend on what the selected entity actually supports. " +
      "Where a capability does not exist the action is not offered, and a disabled action " +
      "always states its reason."));

    var grid = el("div", { class: "cw-cc-ctx" });
    Object.keys(CONTEXT_ACTIONS).forEach(function (kind) {
      var card = el("div", { class: "cw-cc-ctx-card", "data-entity": kind });
      card.appendChild(el("div", { class: "cw-cc-ctx-head" }, kind.toUpperCase()));
      var list = el("ul", { class: "cw-cc-ctx-list" });
      CONTEXT_ACTIONS[kind].forEach(function (a) { list.appendChild(el("li", {}, a)); });
      card.appendChild(list);
      grid.appendChild(card);
    });
    kids.push(grid);

    // The accessible alternative is part of the design, not an extra.
    kids.push(el("div", { class: "cw-cc-ctx-alt" }, [
      el("div", {}, "A visible ⋯ ACTIONS control is always present and always reachable " +
        "by keyboard and touch. Long-press and right-click are never the only route to " +
        "these commands."),
      el("div", { class: "cw-cc-actions" }, [
        el("button", { type: "button", class: "cw-cc-btn",
          "aria-label": "Actions for the selected entity" }, "⋯ ACTIONS")
      ])
    ]));
    return region("context", "Context commands", kids);
  }

  // F. WORLD CONTEXT (READ-ONLY, §20) + responsive intent.
  function worldContextRegion(viewport) {
    var WE = global.WorldEngine;
    var GI = global.GlobeIntelligence;
    var kids = [];
    kids.push(meta("World Globe is the master MTI6 environment. Crypto is a selectable " +
      "intelligence and activity layer inside it. This module reads World context only — " +
      "it does not modify the Globe, build a second map, or replace the World engine."));

    var layers = null;
    if (GI && typeof GI.listLayers === "function") {
      layers = safeCall(function () { return GI.listLayers(); });
    }
    kids.push(el("div", { class: "cw-cc-world-row" }, [
      el("span", {}, "World Engine: " +
        (WE && typeof WE.collect === "function" ? "AVAILABLE" : "NOT CONNECTED")),
      el("span", {}, "Globe intelligence layers: " +
        (Array.isArray(layers) ? count(layers.length, true) : "UNKNOWN"))
    ]));
    kids.push(el("div", { class: "cw-cc-world-note" },
      "Crypto-layer registration inside the Globe is a separate Globe-lane integration task. " +
      "It is not attempted here, and no substitute map is created."));

    // Responsive intent, stated so it can be verified rather than assumed.
    kids.push(el("div", { class: "cw-cc-responsive", "data-viewport": viewport || "unknown" }, [
      el("div", {}, "Desktop — World context stays central; rails are visible."),
      el("div", {}, "Tablet — workspaces open as overlays; World context is never destroyed."),
      el("div", {}, "Phone — World context is a collapsible primary region with a two-line " +
        "context bar. The situation deck becomes the primary surface. No separate mobile taxonomy.")
    ]));
    return region("world", "World context", kids);
  }

  // G. TRUTH + SECURITY STATEMENT — every value on this screen is real state.
  function truthRegion() {
    var states = truthStates();
    var list = el("ul", { class: "cw-cc-truth-list" });
    states.forEach(function (s) { list.appendChild(el("li", {}, s)); });
    return region("truth", "Truth states", [
      meta("Only VERIFIED and LIVE read as healthy. A count that cannot be measured is " +
        "UNKNOWN, never 0. A zero that was measured says so."),
      list,
      meta("This screen has no signing path, no transaction path and no contract-write path. " +
        "It never requests, collects or stores a seed phrase, private key, wallet password " +
        "or signing secret. EXECUTE does not appear on any control in this module.")
    ]);
  }

  // ---- Public render ------------------------------------------------------

  // Renders the Command Center into a supplied container. Stage 1: nothing
  // calls this yet. A later stage mounts it inside the Crypto World route.
  function render(container, options) {
    if (!container) return null;
    var opts = options || {};
    container.innerHTML = "";
    container.setAttribute("data-cw-cc-root", "1");

    var root = el("div", { class: "cw-cc" });
    root.appendChild(headerRegion());
    root.appendChild(modeStrip());
    root.appendChild(statusStrip());
    root.appendChild(lensRegion());
    root.appendChild(deckRegion());
    root.appendChild(contextRegion());
    root.appendChild(worldContextRegion(opts.viewport));
    root.appendChild(truthRegion());
    container.appendChild(root);
    return root;
  }

  // ---- Exports ------------------------------------------------------------

  global.CryptoCommandCenter = {
    render: render,
    // Models, exposed for review and for a future harness.
    MODES: MODES,
    LENSES: LENSES,
    DECK: DECK,
    EXISTING_TABS: EXISTING_TABS,
    STATUS_DOMAINS: STATUS_DOMAINS,
    CONTEXT_ACTIONS: CONTEXT_ACTIONS,
    // Pure helpers, so a harness can assert behaviour without the DOM.
    lensWorkspaces: lensWorkspaces,
    lensCoverage: lensCoverage,
    deckReconciliationData: deckReconciliationData,
    getMode: getMode,
    setMode: setMode,
    truthStates: truthStates
  };
})(window);
