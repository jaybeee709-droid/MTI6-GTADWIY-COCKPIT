/* MTI6-GTADWIY-COCKPIT — World Globe screen
 * Weather from Open-Meteo (no key, browser-direct) and world news
 * from the Hacker News API via the scouts layer. No fake data:
 * if a source fails, the error is shown, not a made-up forecast.
 *
 * Master shell (Build 1): the World Globe is HOME — the whole-platform
 * World Engine, not a crypto-only globe. Crypto World is one world /
 * intelligence layer within it. The five visual modes (ELECTRIC,
 * TERRAIN, BOUNDARIES, INTELLIGENCE, WORLD) are view architecture
 * only: they change how the globe presents itself and state plainly
 * what live data is (or is not) connected. No map, terrain, route, or
 * live-activity data is fabricated to fill a view. Normal map
 * boundaries/routes use electric blue/cyan; alarm red is reserved for
 * a real verified critical alert state, and none exists here.
 *
 * Visual Build Stage 2 (W1 — World Globe): the globe dominates the
 * composition (.globe-stage > .globe-visual, mode class kept), with
 * compact .globe-controls (mode tabs, layer tabs with real-state
 * badges, presentation zoom, reset, layer toggles, Details panel,
 * full screen via the browser Fullscreen API) and a collapsible
 * .globe-side-panel showing the selected layer's detail. The zoom
 * scales the 2D presentation only — it is not map data. The visual
 * area is a 2D shell, never labelled as a 3D terrain engine.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  var MODE_KEY = "mti6_globe_mode_v1";
  var MODES = [
    { id: "WORLD", label: "World", note: "Whole-world overview. Weather and headlines below are live public data; there is no live map feed connected." },
    { id: "ELECTRIC", label: "Electric", note: "Electric view. Normal map boundaries and routes use electric blue/cyan. No live map or route data is connected — styling only." },
    { id: "TERRAIN", label: "Terrain", note: "Terrain view. No terrain data is connected — nothing is rendered as terrain." },
    { id: "BOUNDARIES", label: "Boundaries", note: "Boundaries view. No live boundary data is connected." },
    { id: "INTELLIGENCE", label: "Intelligence", note: "Intelligence layer. No live intelligence feeds are connected — the headlines below are the only live layer." }
  ];

  // Intelligence layer selector (same five layers as GlobeIntelligence).
  var LAYER_BUTTONS = [
    { id: "WORLD", label: "World" },
    { id: "CRYPTO", label: "Crypto" },
    { id: "OPPORTUNITIES", label: "Opportunities" },
    { id: "BOT_ACTIVITY", label: "Bot Activity" },
    { id: "SECURITY_ALERTS", label: "Security Alerts" }
  ];

  // Presentation zoom only: scales the 2D visual, never map data.
  var ZOOM_STEPS = [1, 1.25, 1.5, 2];

  // One document-level fullscreenchange listener for the whole module
  // (render() can run more than once; never attach it twice).
  var fsListenerAdded = false;

  function getMode() {
    try {
      var saved = localStorage.getItem(MODE_KEY);
      for (var i = 0; i < MODES.length; i++) {
        if (MODES[i].id === saved) return saved;
      }
    } catch (e) {}
    return "WORLD";
  }

  function setMode(mode) {
    try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
  }

  function modeNote(id) {
    for (var i = 0; i < MODES.length; i++) {
      if (MODES[i].id === id) return MODES[i].note;
    }
    return "";
  }

  function modeLabel(id) {
    for (var i = 0; i < MODES.length; i++) {
      if (MODES[i].id === id) return MODES[i].label;
    }
    return id;
  }

  function layerLabel(id) {
    for (var i = 0; i < LAYER_BUTTONS.length; i++) {
      if (LAYER_BUTTONS[i].id === id) return LAYER_BUTTONS[i].label;
    }
    return id;
  }

  // Honest label inside the visual area. TERRAIN gets the explicit
  // 2D-shell disclaimer; every other mode states plainly that no
  // live map feed is connected.
  function truthLabelForMode(mode) {
    if (mode === "TERRAIN") return "2D visual shell — not a 3D terrain engine. No terrain data is connected.";
    return "No live map feed is connected — this is a 2D visual shell, not a live map.";
  }

  function fmtTime(iso) {
    try { return new Date(iso).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }); }
    catch (e) { return iso || ""; }
  }

  // Badge class follows the Stage 1 convention (bot-ops.js / wallets.js):
  // state lower-cased, underscores to dashes. States without a Stage 1
  // variant (NOT_LOADED, NO_DATA, NO_ALERTS) still render on the base
  // .mti6-badge and the label always carries the real state in text.
  function badgeClassForState(state) {
    return "mti6-badge mti6-badge--" + String(state || "UNKNOWN").toLowerCase().replace(/_/g, "-");
  }

  function emptyBlock(title, body) {
    return U.el("div", { class: "mti6-empty" }, [
      U.el("div", { class: "mti6-empty__title" }, title),
      U.el("p", { class: "mti6-empty__body" }, body)
    ]);
  }

  async function render(root) {
    root.innerHTML = "";
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("globe") : U.el("div", {}, ""));

    var mode = getMode();
    var selectedLayer = "WORLD";
    var panelOpen = false;
    var zoomIndex = 0;

    // ---- Screen header (Stage 1 primitives) -------------------------
    var headerStatus = U.el("div", { class: "mti6-screen-header__status" }, []);
    root.appendChild(U.el("header", { class: "mti6-screen-header" }, [
      U.el("span", { class: "mti6-screen-header__icon", "aria-hidden": "true" }, "🌍"),
      U.el("h2", { class: "mti6-screen-header__title" }, "World Globe"),
      U.el("p", { class: "mti6-screen-header__desc" }, "Home of MTI6 — the whole-platform World Engine"),
      headerStatus
    ]));

    function getLayerSafe(id) {
      var GI = global.GlobeIntelligence;
      if (!GI || typeof GI.getLayer !== "function") return null;
      try { return GI.getLayer(id); } catch (e) { return null; }
    }

    function listLayersSafe() {
      var GI = global.GlobeIntelligence;
      if (GI && typeof GI.listLayers === "function") {
        try {
          var layers = GI.listLayers();
          if (Array.isArray(layers) && layers.length) return layers;
        } catch (e) {}
      }
      return null;
    }

    // Header status: current mode + selected layer state, as badges
    // (colour + text label, never colour alone).
    function refreshHeader() {
      headerStatus.innerHTML = "";
      headerStatus.appendChild(U.el("span", { class: "mti6-badge" }, "Mode: " + modeLabel(mode)));
      var layer = getLayerSafe(selectedLayer);
      if (!global.GlobeIntelligence) {
        headerStatus.appendChild(U.el("span", { class: badgeClassForState("NOT_LOADED") }, "Layers: NOT_LOADED"));
      } else if (!layer) {
        headerStatus.appendChild(U.el("span", { class: badgeClassForState("NOT_CONNECTED") }, "Layer: " + layerLabel(selectedLayer) + " — NOT_CONNECTED"));
      } else {
        headerStatus.appendChild(U.el("span", { class: badgeClassForState(layer.state) },
          "Layer: " + layer.label + " — " + layer.state + " · " + (layer.items ? layer.items.length : 0)));
      }
    }

    // ---- Stage: visual + side panel + compact controls --------------
    var stage = U.el("section", { class: "globe-stage", "aria-label": "World Globe stage" }, []);

    // Visual area: keeps the existing mode class globe-mode-<mode>.
    var truthLabel = U.el("div", { class: "api-meta" }, truthLabelForMode(mode));
    var visual = U.el("div", { class: "globe-visual globe-mode-" + mode.toLowerCase(), id: "globe-visual" }, [
      truthLabel
    ]);
    stage.appendChild(visual);

    // Side panel: selected layer's detail, beside the visual on wide
    // screens and an overlay sheet on phone (layout is the
    // coordinator's CSS pass). Hidden until the Details button opens it.
    var panelContent = U.el("div", {}, []);
    var panel = U.el("aside", {
      class: "globe-side-panel",
      id: "globe-side-panel",
      "aria-label": "Selected intelligence layer details"
    }, [panelContent]);
    stage.appendChild(panel);

    // ---- Controls row 1: mode tabs + mode note as a status line -----
    var modeNoteEl = U.el("div", { class: "api-meta globe-mode-note" }, modeNote(mode));
    var modeTabs = U.el("div", { class: "mti6-tabs", role: "group", "aria-label": "World Globe visual mode" }, []);
    var modeControls = U.el("div", { class: "globe-controls" }, [modeTabs, modeNoteEl]);
    stage.appendChild(modeControls);

    // ---- Controls row 2: layer tabs, each with its real-state badge -
    var layerTabs = U.el("div", { class: "mti6-tabs", role: "group", "aria-label": "World Globe intelligence layer" }, []);
    var layerControls = U.el("div", { class: "globe-controls globe-controls--layers" }, [
      U.el("h3", { class: "globe-controls__heading" }, "Intelligence layers"), layerTabs
    ]);
    stage.appendChild(layerControls);

    // ---- Controls row 3: zoom, reset, layer toggles, Details, full screen
    var zoomReadout = U.el("span", { class: "api-meta" }, "");
    var zoomOutBtn = U.el("button", { class: "btn", type: "button", "aria-label": "Zoom out (presentation zoom only)" }, "−");
    var zoomInBtn = U.el("button", { class: "btn", type: "button", "aria-label": "Zoom in (presentation zoom only)" }, "+");
    var resetBtn = U.el("button", { class: "btn", type: "button" }, "Reset view");
    var detailsBtn = U.el("button", {
      class: "btn", type: "button",
      "aria-pressed": "false", "aria-expanded": "false", "aria-controls": "globe-side-panel"
    }, "Details");
    var fsBtn = U.el("button", { class: "btn", type: "button", "aria-pressed": "false" }, "Full screen");
    var toggleDefs = [
      { id: "SECURITY_ALERTS", label: "Alerts" },
      { id: "OPPORTUNITIES", label: "Opportunities" },
      { id: "BOT_ACTIVITY", label: "Bot activity" }
    ];
    var toggleBtns = {};
    var actionControls = U.el("div", { class: "globe-controls" }, [
      zoomOutBtn, zoomReadout, zoomInBtn, resetBtn
    ]);
    toggleDefs.forEach(function (t) {
      var b = U.el("button", { class: "btn", type: "button", "aria-pressed": "false" }, t.label);
      toggleBtns[t.id] = b;
      actionControls.appendChild(b);
    });
    actionControls.appendChild(detailsBtn);
    actionControls.appendChild(fsBtn);
    stage.appendChild(actionControls);

    root.appendChild(stage);

    // ---- Refreshers ---------------------------------------------------
    function applyZoom() {
      var z = ZOOM_STEPS[zoomIndex];
      // .style exists on every real-DOM element; a minimal stub DOM
      // may not provide it — zoom is presentation-only, so skip the
      // transform there instead of throwing.
      if (visual.style) visual.style.transform = z === 1 ? "" : "scale(" + z + ")";
      zoomReadout.textContent = "Zoom " + Math.round(z * 100) + "% — presentation zoom, not map data";
      zoomOutBtn.disabled = zoomIndex === 0;
      zoomInBtn.disabled = zoomIndex === ZOOM_STEPS.length - 1;
    }

    function refreshModeUI() {
      // The mode class rides on the stage as well as the visual, so
      // the existing .globe-mode-<mode> .globe-mode-note descendant
      // rules keep matching the note in the controls row.
      stage.className = "globe-stage globe-mode-" + mode.toLowerCase();
      visual.className = "globe-visual globe-mode-" + mode.toLowerCase();
      truthLabel.textContent = truthLabelForMode(mode);
      modeNoteEl.textContent = modeNote(mode);
      modeTabs.querySelectorAll(".mti6-tab").forEach(function (x) {
        var active = x.getAttribute("data-mode") === mode;
        // add/remove instead of classList.toggle: identical in a real
        // browser, and works in a minimal stub DOM without toggle.
        if (active) x.classList.add("mti6-tab--active"); else x.classList.remove("mti6-tab--active");
        x.setAttribute("aria-pressed", active ? "true" : "false");
      });
      refreshHeader();
    }

    // Layer detail for the side panel. Items come only from
    // GlobeIntelligence (real registries); verified-and-active alerts
    // render alarm red via colorFor, everything else electric blue.
    // Empty layers stay honest empty states — nothing is invented.
    function renderPanelContent() {
      panelContent.innerHTML = "";
      var GI = global.GlobeIntelligence;
      if (!GI || typeof GI.getLayer !== "function") {
        panelContent.appendChild(emptyBlock("Intelligence layers did not load",
          "GlobeIntelligence is not available (NOT_LOADED). No layer data is shown — nothing is invented in its place."));
        return;
      }
      var layer = getLayerSafe(selectedLayer);
      // Keep a direct reference to the close button instead of
      // re-querying for it by tag: a minimal stub DOM may implement
      // only class-based lookup, so a tag query can return null.
      var closeBtn = U.el("button", { class: "btn", type: "button", "aria-label": "Close details panel" }, "✕");
      closeBtn.addEventListener("click", function () { setPanelOpen(false); });
      var headRow = U.el("div", { class: "globe-controls" }, [
        U.el("h3", { style: "margin:0" }, layer ? layer.label : layerLabel(selectedLayer)),
        closeBtn
      ]);
      panelContent.appendChild(headRow);
      if (!layer) {
        panelContent.appendChild(emptyBlock("Layer not available",
          "Layer " + selectedLayer + " is not available (NOT_CONNECTED)."));
        return;
      }
      panelContent.appendChild(U.el("div", { class: "api-meta" },
        layer.label + " — " + layer.state + (layer.note ? " · " + layer.note : "")));
      if (layer.enabled === false) {
        panelContent.appendChild(emptyBlock(layer.label + " layer is disabled",
          "Enable this layer to view its state. Its recorded state is still " + layer.state + "."));
        return;
      }
      if (!layer.items || layer.items.length === 0) {
        if (layer.id === "SECURITY_ALERTS" && layer.state === "NO_ALERTS") {
          panelContent.appendChild(emptyBlock("No alerts",
            "No items in this layer (NO_ALERTS). What is missing: no alerts are recorded and no live alert feed is connected. " +
            "Is this expected? Yes — AngelSecurity holds no alerts and no feed is wired in. " +
            "What next: check the Security screen, or connect a real alert feed. " +
            "Is it safe? No verified active alert is known, but with no live feed connected this does not prove nothing is wrong elsewhere."));
        } else {
          panelContent.appendChild(emptyBlock("No items in this layer",
            "No items in this layer (" + layer.state + "). Nothing is invented to fill it." +
            (layer.note ? " " + layer.note : "")));
        }
        return;
      }
      var list = U.el("ul", { class: "price-offer-list" });
      layer.items.forEach(function (it) {
        var alarm = it.alarm === true;
        var color = "#00BFFF";
        try {
          if (GI.colorFor) color = GI.colorFor(it);
        } catch (e) {}
        list.appendChild(U.el("li", { style: "color:" + color + (alarm ? ";font-weight:700" : "") },
          it.label + " — " + it.state + (it.source ? " · " + it.source : "")));
      });
      panelContent.appendChild(list);
    }

    function refreshLayerUI() {
      // Rebuild the layer tabs so each button carries its live state
      // badge (state + item count from getLayer / listLayers).
      layerTabs.innerHTML = "";
      var layers = listLayersSafe();
      var byId = {};
      if (layers) layers.forEach(function (l) { if (l) byId[l.id] = l; });
      LAYER_BUTTONS.forEach(function (l) {
        var layer = byId[l.id] || null;
        var state = layer ? layer.state : "NOT_LOADED";
        var count = layer && layer.items ? layer.items.length : 0;
        var active = l.id === selectedLayer;
        var b = U.el("button", {
          class: "mti6-tab" + (active ? " mti6-tab--active" : ""),
          type: "button",
          "aria-pressed": active ? "true" : "false"
        }, [
          U.el("span", {}, l.label + " "),
          U.el("span", { class: badgeClassForState(state) }, state + " · " + count)
        ]);
        b.addEventListener("click", function () { selectLayer(l.id); });
        layerTabs.appendChild(b);
      });
      toggleDefs.forEach(function (t) {
        var b = toggleBtns[t.id];
        if (b) b.setAttribute("aria-pressed", selectedLayer === t.id ? "true" : "false");
      });
      renderPanelContent();
      refreshHeader();
    }

    function selectMode(id) {
      mode = id;
      setMode(id);
      refreshModeUI();
    }

    function selectLayer(id) {
      selectedLayer = id;
      refreshLayerUI();
    }

    function setPanelOpen(open) {
      panelOpen = open;
      // add/remove instead of classList.toggle: identical in a real
      // browser, and works in a minimal stub DOM without toggle.
      if (open) panel.classList.add("globe-side-panel--open"); else panel.classList.remove("globe-side-panel--open");
      detailsBtn.setAttribute("aria-pressed", open ? "true" : "false");
      detailsBtn.setAttribute("aria-expanded", open ? "true" : "false");
    }

    // ---- Wire the controls --------------------------------------------
    MODES.forEach(function (m) {
      var b = U.el("button", {
        class: "mti6-tab" + (m.id === mode ? " mti6-tab--active" : ""),
        type: "button",
        "aria-pressed": m.id === mode ? "true" : "false"
      }, m.label);
      b.setAttribute("data-mode", m.id);
      b.addEventListener("click", function () { selectMode(m.id); });
      modeTabs.appendChild(b);
    });

    toggleDefs.forEach(function (t) {
      toggleBtns[t.id].addEventListener("click", function () {
        // Genuine toggle: pressing the active layer's toggle returns
        // to the World layer; pressing another switches to that layer.
        selectLayer(selectedLayer === t.id ? "WORLD" : t.id);
      });
    });

    zoomOutBtn.addEventListener("click", function () {
      if (zoomIndex > 0) { zoomIndex--; applyZoom(); }
    });
    zoomInBtn.addEventListener("click", function () {
      if (zoomIndex < ZOOM_STEPS.length - 1) { zoomIndex++; applyZoom(); }
    });

    resetBtn.addEventListener("click", function () {
      mode = "WORLD";
      setMode("WORLD");
      zoomIndex = 0;
      selectedLayer = "WORLD";
      applyZoom();
      refreshModeUI();
      refreshLayerUI();
    });

    detailsBtn.addEventListener("click", function () { setPanelOpen(!panelOpen); });

    // Full screen: the browser Fullscreen API on the stage itself.
    // No second window manager is built; if the API is unavailable
    // the button says so honestly instead of pretending.
    function syncFsBtn() {
      var on = false;
      try { on = document.fullscreenElement === stage; } catch (e) {}
      fsBtn.setAttribute("aria-pressed", on ? "true" : "false");
      fsBtn.textContent = on ? "Exit full screen" : "Full screen";
    }
    // The Fullscreen API listener is registered only where the host
    // document actually offers addEventListener (a real browser does;
    // a minimal stub DOM does not) — render must never throw here.
    if (!fsListenerAdded && typeof document !== "undefined" && typeof document.addEventListener === "function") {
      fsListenerAdded = true;
      document.addEventListener("fullscreenchange", function () {
        try {
          if (document.fullscreenElement === stage || !document.fullscreenElement) syncFsBtn();
        } catch (e) {}
      });
    }
    fsBtn.addEventListener("click", function () {
      try {
        if (document.fullscreenElement === stage) {
          if (document.exitFullscreen) document.exitFullscreen();
        } else if (stage.requestFullscreen) {
          var p = stage.requestFullscreen();
          if (p && typeof p.catch === "function") p.catch(function () {
            modeNoteEl.textContent = "Full screen was refused by the browser. The stage stays in place.";
          });
        } else {
          modeNoteEl.textContent = "Full screen is not available in this browser.";
        }
      } catch (e) {
        modeNoteEl.textContent = "Full screen is not available in this browser.";
      }
      syncFsBtn();
    });

    // ---- Initial paint --------------------------------------------------
    applyZoom();
    refreshModeUI();
    refreshLayerUI();

    // ---- Weather (real live public data, unchanged in substance) ------
    var lat = U.el("input", { class: "price-input", type: "text", value: "40.71", "aria-label": "Latitude" });
    var lon = U.el("input", { class: "price-input", type: "text", value: "-74.00", "aria-label": "Longitude" });
    var btn = U.el("button", { class: "btn btn-primary", type: "button" }, "Load weather");
    var out = U.el("div", { class: "api-meta" }, "Enter latitude/longitude (default: New York City) and tap Load weather.");
    btn.addEventListener("click", function () {
      out.textContent = "Loading weather…";
      var url = "https://api.open-meteo.com/v1/forecast?latitude=" + encodeURIComponent(lat.value.trim()) + "&longitude=" + encodeURIComponent(lon.value.trim()) + "&current_weather=true";
      fetch(url).then(function (res) { if (!res.ok) throw new Error("http_" + res.status); return res.json(); }).then(function (data) {
        try { if (global.ApiRegistry) global.ApiRegistry.record("open-meteo", true, 200); } catch (e) {}
        var w = data && data.current_weather;
        if (!w) { out.textContent = "No weather data returned for those coordinates."; return; }
        out.textContent = "Now: " + w.temperature + "°C, wind " + w.windspeed + " km/h, direction " + w.winddirection + "° · Open-Meteo · " + fmtTime(w.time);
      }).catch(function () {
        try { if (global.ApiRegistry) global.ApiRegistry.record("open-meteo", false, null); } catch (e) {}
        out.textContent = "Could not reach Open-Meteo right now. Check the coordinates and try again.";
      });
    });
    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Weather"), U.el("div", { class: "price-input-row" }, [lat, lon, btn]), out
    ]));

    // ---- World headlines (real live public data, unchanged) -----------
    var newsBtn = U.el("button", { class: "btn btn-primary", type: "button" }, "Load headlines");
    var newsOut = U.el("div", { class: "api-meta" }, "Tap Load headlines for Hacker News top stories.");
    newsBtn.addEventListener("click", function () {
      newsOut.textContent = "Loading…";
      if (!global.KnowledgeScout) { newsOut.textContent = "News scout did not load. Reload and try again."; return; }
      global.KnowledgeScout.getNews(8).then(function (r) {
        if (r.status === "error") { newsOut.textContent = r.note; return; }
        newsOut.innerHTML = "";
        var list = U.el("ul", { class: "price-offer-list" });
        r.items.forEach(function (it) { list.appendChild(U.el("li", {}, it.title + " (" + it.score + " pts) — " + it.url)); });
        newsOut.appendChild(list);
      });
    });
    root.appendChild(U.el("div", { class: "api-panel" }, [U.el("h3", {}, "World headlines"), newsBtn, newsOut]));
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.globe = { render: render };
})(window);
