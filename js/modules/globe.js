/* MTI6-GTADWIY-COCKPIT — World Globe screen (read-only)
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

  function fmtTime(iso) {
    try { return new Date(iso).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }); }
    catch (e) { return iso || ""; }
  }

  async function render(root) {
    root.innerHTML = "";
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("globe") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "🌍 World Globe"));
    root.appendChild(U.el("p", { class: "api-subtitle" }, "Home of MTI6 — the whole-platform World Engine. Crypto World is one world within it. Weather and news below come from public APIs; nothing here is a live map of you or anyone else."));

    // ---- Visual modes: view architecture only, no fabricated data ----
    var mode = getMode();
    var modeNoteEl = U.el("div", { class: "api-meta globe-mode-note" }, modeNote(mode));
    var modeRow = U.el("div", { class: "globe-modes", role: "group", "aria-label": "World Globe visual mode" });
    MODES.forEach(function (m) {
      var b = U.el("button", {
        class: "btn globe-mode-btn" + (m.id === mode ? " globe-mode-active" : ""),
        type: "button",
        "aria-pressed": m.id === mode ? "true" : "false"
      }, m.label);
      b.addEventListener("click", function () {
        setMode(m.id);
        modeRow.querySelectorAll(".globe-mode-btn").forEach(function (x) {
          x.classList.remove("globe-mode-active");
          x.setAttribute("aria-pressed", "false");
        });
        b.classList.add("globe-mode-active");
        b.setAttribute("aria-pressed", "true");
        modeNoteEl.textContent = modeNote(m.id);
        var wrap = root.querySelector("#globe-view");
        if (wrap) wrap.className = "globe-view globe-mode-" + m.id.toLowerCase();
      });
      modeRow.appendChild(b);
    });
    var view = U.el("div", { class: "globe-view globe-mode-" + mode.toLowerCase(), id: "globe-view" }, [
      U.el("div", { class: "api-panel" }, [
        U.el("h3", {}, "Visual mode"),
        modeRow,
        modeNoteEl
      ])
    ]);
    root.appendChild(view);

    // ---- Intelligence layers (§44 item 14): real registries only ----
    // The selector calls GlobeIntelligence and renders the selected
    // layer's state (items list + honest empty state). If the module
    // or a source registry is absent, the layer shows NOT_LOADED /
    // NOT_CONNECTED — never a crash, never invented points. Normal
    // items render in electric blue; only a VERIFIED-and-active alert
    // item renders in alarm red (GlobeIntelligence.colorFor decides).
    var LAYER_BUTTONS = [
      { id: "WORLD", label: "World" },
      { id: "CRYPTO", label: "Crypto" },
      { id: "OPPORTUNITIES", label: "Opportunities" },
      { id: "BOT_ACTIVITY", label: "Bot Activity" },
      { id: "SECURITY_ALERTS", label: "Security Alerts" }
    ];
    var selectedLayer = "WORLD";
    var layerOut = U.el("div", { class: "api-meta" }, "");
    var layerRow = U.el("div", { class: "globe-modes", role: "group", "aria-label": "World Globe intelligence layer" });
    function renderLayer(id) {
      layerOut.innerHTML = "";
      var GI = global.GlobeIntelligence;
      if (!GI || typeof GI.getLayer !== "function") {
        layerOut.textContent = "Intelligence layers did not load (NOT_LOADED). No layer data is available — nothing is shown in place of real data.";
        return;
      }
      var layer = null;
      try { layer = GI.getLayer(id); } catch (e) { layer = null; }
      if (!layer) {
        layerOut.textContent = "Layer " + id + " is not available (NOT_CONNECTED).";
        return;
      }
      if (layer.enabled === false) {
        layerOut.textContent = layer.label + " layer is disabled. Enable it to view its state.";
        return;
      }
      layerOut.appendChild(U.el("div", { class: "api-meta" },
        layer.label + " — " + layer.state + (layer.note ? " · " + layer.note : "")));
      if (!layer.items || layer.items.length === 0) {
        layerOut.appendChild(U.el("div", { class: "api-meta" },
          "No items in this layer (" + layer.state + "). Nothing is invented to fill it."));
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
      layerOut.appendChild(list);
    }
    LAYER_BUTTONS.forEach(function (l) {
      var b = U.el("button", {
        class: "btn globe-mode-btn" + (l.id === selectedLayer ? " globe-mode-active" : ""),
        type: "button",
        "aria-pressed": l.id === selectedLayer ? "true" : "false"
      }, l.label);
      b.addEventListener("click", function () {
        selectedLayer = l.id;
        layerRow.querySelectorAll(".globe-mode-btn").forEach(function (x) {
          x.classList.remove("globe-mode-active");
          x.setAttribute("aria-pressed", "false");
        });
        b.classList.add("globe-mode-active");
        b.setAttribute("aria-pressed", "true");
        renderLayer(l.id);
      });
      layerRow.appendChild(b);
    });
    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Intelligence layers"), layerRow, layerOut
    ]));
    renderLayer(selectedLayer);

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
