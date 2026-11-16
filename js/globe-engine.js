/* MTI6-GTADWIY-COCKPIT — Globe Engine (Build 2: flat world map,
 * owner ruling 2026-11-16; Build 1's rotating presentation sphere
 * is replaced, per the owner's direction: "Put this outline of all
 * the countries instead of a Globe... you can see the name of each
 * country state city faded in the background of their position").
 *
 * A local canvas-2D rendering engine for the World Globe home
 * screen. It draws a FLAT world map inside .globe-visual:
 * - Outlines of ALL countries (177) from vendored public-domain
 *   Natural Earth data (js/data/world-map.js), filled very dark and
 *   stroked electric blue on black — the same scheme as the rest of
 *   the cockpit.
 * - US state outlines (52) on top, fainter and thinner.
 * - Names at their positions, FADED into the background: country
 *   names (Natural Earth's own label points) most visible, then
 *   state names, then major-city names (243, smallest and most
 *   faded) with a tiny dot at each city's real position.
 * - The selected intelligence layer's items as glowing markers on
 *   top — the same layer object (GlobeIntelligence.getLayer /
 *   listLayersLive) the screen's tabs, badges and Details panel
 *   read, handed in by the screen itself, so the plotted count can
 *   never disagree with them.
 *
 * Truth rules (do not weaken them):
 * - The MAP is real public-domain geography used as presentation:
 *   outlines and names sit at their real positions (see the data
 *   file's provenance header). It is NOT a live map feed — nothing
 *   is fetched, no tiles, no imagery, no external requests.
 * - The MARKERS are the cockpit's recorded layers, and their
 *   positions are LAYOUT, never locations: no layer item anywhere
 *   in this platform carries latitude, longitude, or any geography
 *   (GlobeIntelligence header rule: networks are logical nodes,
 *   never places). Marker anchors are a deterministic low-
 *   discrepancy spread over the map area in registry order. A
 *   marker does NOT sit in the country/state/city it happens to
 *   land on, and the Globe screen's truth label says so.
 * - Marker DATA is only: which items exist in the selected layer,
 *   their kinds, and their colours via GlobeIntelligence.colorFor
 *   (alarm red ONLY for a verified-and-active alert — that rule
 *   lives in GlobeIntelligence and is not re-decided here). The
 *   marker COUNT is data: it always equals the layer's item count.
 * - Empty layers plot nothing (OPPORTUNITIES NO_DATA, BOT_ACTIVITY
 *   NOT_CONNECTED, SECURITY_ALERTS NO_ALERTS all have zero items by
 *   construction in GlobeIntelligence). The screen's badges and
 *   panel text say why; the engine invents nothing to fill them.
 *
 * The map is STATIC (no rotation, no animation loop): it redraws
 * when the screen hands in new data and when the canvas resizes.
 * Pure presentation: no storage, no network, no data writes. If a
 * 2D context cannot be obtained, create() returns null and the
 * Globe screen keeps its pre-engine presentation unchanged. If the
 * map data file is absent, the engine still plots the layer
 * markers over the background — the screen never depends on it.
 */
(function (global) {
  "use strict";

  var TAU = Math.PI * 2;
  var FALLBACK_BLUE = "#00BFFF"; // GlobeIntelligence.COLORS.ELECTRIC_BLUE

  // Mode palettes: presentation styling only (the five globe modes
  // restyle the rendering; they change no data). TERRAIN is a muted
  // palette, NOT terrain data — the screen's label keeps that
  // disclaimer. BOUNDARIES emphasises the outlines; INTELLIGENCE
  // accents in STAR purple. Label colours are rgba so the names sit
  // faded in the background: countries strongest, states weaker,
  // cities weakest.
  var PALETTES = {
    WORLD: {
      bg: "#04070b", glow: "#10283d",
      countryFill: "rgba(14,36,56,0.88)", countryStroke: "rgba(0,191,255,0.55)", countryWidth: 0.7,
      stateStroke: "rgba(0,191,255,0.16)",
      labelCountry: "rgba(190,226,255,0.34)", labelState: "rgba(160,200,235,0.20)", labelCity: "rgba(150,185,220,0.14)",
      cityDot: "rgba(0,212,255,0.35)"
    },
    ELECTRIC: {
      bg: "#030608", glow: "#143c5a",
      countryFill: "rgba(18,52,80,0.92)", countryStroke: "rgba(0,212,255,0.85)", countryWidth: 0.8,
      stateStroke: "rgba(0,212,255,0.26)",
      labelCountry: "rgba(200,238,255,0.42)", labelState: "rgba(170,220,250,0.26)", labelCity: "rgba(160,210,245,0.18)",
      cityDot: "rgba(0,212,255,0.5)"
    },
    TERRAIN: {
      bg: "#060806", glow: "#263026",
      countryFill: "rgba(34,44,34,0.88)", countryStroke: "rgba(170,196,150,0.45)", countryWidth: 0.7,
      stateStroke: "rgba(170,196,150,0.14)",
      labelCountry: "rgba(216,226,200,0.28)", labelState: "rgba(200,210,185,0.17)", labelCity: "rgba(190,200,175,0.12)",
      cityDot: "rgba(170,196,150,0.3)"
    },
    BOUNDARIES: {
      bg: "#030405", glow: "#0a0d12",
      countryFill: "rgba(10,13,18,0.92)", countryStroke: "rgba(192,200,214,0.9)", countryWidth: 1.1,
      stateStroke: "rgba(192,200,214,0.3)",
      labelCountry: "rgba(200,208,220,0.22)", labelState: "rgba(190,198,210,0.13)", labelCity: "rgba(180,188,200,0.09)",
      cityDot: "rgba(192,200,214,0.3)"
    },
    INTELLIGENCE: {
      bg: "#050409", glow: "#1c1136",
      countryFill: "rgba(26,16,50,0.88)", countryStroke: "rgba(139,92,246,0.6)", countryWidth: 0.7,
      stateStroke: "rgba(139,92,246,0.18)",
      labelCountry: "rgba(216,200,255,0.32)", labelState: "rgba(196,178,245,0.19)", labelCity: "rgba(186,168,235,0.13)",
      cityDot: "rgba(139,92,246,0.4)"
    }
  };

  // Projection window (degrees). Latitudes beyond +/-85 are pole
  // caps with no label content; Antarctica's outline continues
  // below the window and is clipped by the canvas edge, as on most
  // flat world maps.
  var LON_MIN = -180, LON_SPAN = 360, LAT_MAX = 85, LAT_SPAN = 170;

  function create(canvas) {
    if (!canvas || typeof canvas.getContext !== "function") return null;
    var ctx = null;
    try { ctx = canvas.getContext("2d"); } catch (e) { ctx = null; }
    if (!ctx) return null;

    var doc = canvas.ownerDocument || global.document || null;
    var alive = true;
    var mode = "WORLD";
    var layer = null;
    var items = [];
    var markers = [];
    var viewW = 0, viewH = 0;
    var stats = {
      framesDrawn: 0, markersPlotted: 0,
      countriesDrawn: 0, statesDrawn: 0, citiesDrawn: 0, labelsDrawn: 0,
      mapLoaded: false,
      layerId: null, layerState: null, mode: mode,
      running: false, reducedMotion: false, angle: 0
    };

    function fit() {
      var w = canvas.clientWidth || 640;
      var h = canvas.clientHeight || 480;
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      var pw = Math.round(w * dpr), ph = Math.round(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw; canvas.height = ph;
      }
      if (typeof ctx.setTransform === "function") ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      viewW = w; viewH = h;
    }

    // Equirectangular projection, fit to the visual box with the
    // aspect preserved and the map centred (letterboxed).
    function projector() {
      var s = Math.min(viewW / LON_SPAN, viewH / LAT_SPAN);
      var ox = (viewW - LON_SPAN * s) / 2;
      var oy = (viewH - LAT_SPAN * s) / 2;
      return {
        scale: s,
        x: function (lon) { return ox + (lon - LON_MIN) * s; },
        y: function (lat) { return oy + (LAT_MAX - lat) * s; }
      };
    }

    // Trace one feature's rings. Segments jumping more than 180
    // degrees of longitude are antimeridian cuts in the source data
    // (Russia, Fiji): the pen lifts instead of streaking a line
    // across the map.
    function traceRings(rings, proj) {
      ctx.beginPath();
      for (var r = 0; r < rings.length; r++) {
        var ring = rings[r];
        var started = false;
        var prevLon = 0;
        for (var i = 0; i + 1 < ring.length; i += 2) {
          var lon = ring[i], lat = ring[i + 1];
          if (!started || Math.abs(lon - prevLon) > 180) {
            ctx.moveTo(proj.x(lon), proj.y(lat));
            started = true;
          } else {
            ctx.lineTo(proj.x(lon), proj.y(lat));
          }
          prevLon = lon;
        }
        ctx.closePath();
      }
    }

    function drawLabels(list, proj, font, style, statsKey) {
      ctx.font = font;
      ctx.fillStyle = style;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var drawn = 0;
      for (var i = 0; i < list.length; i++) {
        var it = list[i];
        var pt = it.lp || it.at;
        if (!pt) continue;
        var x = proj.x(pt[0]), y = proj.y(pt[1]);
        if (x < -40 || x > viewW + 40 || y < -10 || y > viewH + 10) continue;
        ctx.fillText(it.n, x, y);
        drawn++;
      }
      stats[statsKey] = drawn;
      return drawn;
    }

    function draw() {
      if (!alive) return;
      fit();
      if (!viewW || !viewH) return;
      var pal = PALETTES[mode] || PALETTES.WORLD;
      var proj = projector();
      var data = global.WorldMapData || null;
      stats.mapLoaded = !!(data && Array.isArray(data.countries));

      // Background: deep void with a soft central glow (the mode's
      // disc colours from Build 1, kept as the map's ambience).
      ctx.clearRect(0, 0, viewW, viewH);
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, viewW, viewH);
      var cx = viewW / 2, cy = viewH / 2;
      var grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(viewW, viewH) * 0.62);
      grad.addColorStop(0, pal.glow);
      grad.addColorStop(1, pal.bg);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, viewW, viewH);

      var labelTotal = 0;
      if (stats.mapLoaded) {
        // Country fills, then strokes (one path per country so the
        // even-odd fill honours enclaves/holes at this scale).
        var countries = data.countries;
        ctx.fillStyle = pal.countryFill;
        ctx.strokeStyle = pal.countryStroke;
        ctx.lineWidth = pal.countryWidth;
        for (var ci = 0; ci < countries.length; ci++) {
          traceRings(countries[ci].p, proj);
          ctx.fill("evenodd");
          ctx.stroke();
        }
        stats.countriesDrawn = countries.length;
        // US state outlines: fainter, thinner, no fill.
        var states = Array.isArray(data.states) ? data.states : [];
        ctx.strokeStyle = pal.stateStroke;
        ctx.lineWidth = 0.4;
        for (var si = 0; si < states.length; si++) {
          traceRings(states[si].p, proj);
          ctx.stroke();
        }
        stats.statesDrawn = states.length;
        // Faded background names at their real positions:
        // countries strongest, states weaker, cities weakest.
        var s = proj.scale;
        var countryFont = Math.max(9, Math.min(15, s * 3.1));
        labelTotal += drawLabels(countries, proj,
          "600 " + countryFont.toFixed(1) + "px system-ui, sans-serif",
          pal.labelCountry, "labelsCountries");
        labelTotal += drawLabels(states, proj,
          "500 " + (countryFont * 0.74).toFixed(1) + "px system-ui, sans-serif",
          pal.labelState, "labelsStates");
        var cities = Array.isArray(data.cities) ? data.cities : [];
        // City dots at their real positions.
        ctx.fillStyle = pal.cityDot;
        for (var ti = 0; ti < cities.length; ti++) {
          var cpt = cities[ti].at;
          ctx.beginPath();
          ctx.arc(proj.x(cpt[0]), proj.y(cpt[1]), 1.1, 0, TAU);
          ctx.fill();
        }
        stats.citiesDrawn = cities.length;
        labelTotal += drawLabels(cities, proj,
          "400 " + (countryFont * 0.58).toFixed(1) + "px system-ui, sans-serif",
          pal.labelCity, "labelsCities");
      } else {
        stats.countriesDrawn = 0;
        stats.statesDrawn = 0;
        stats.citiesDrawn = 0;
      }
      stats.labelsDrawn = labelTotal;

      // Layer markers on top: every item of the selected layer is
      // plotted, glowing in its GlobeIntelligence colour. Positions
      // are the deterministic layout spread (see header) — layout,
      // never locations.
      var r = Math.max(2.4, Math.min(4.5, proj.scale * 1.05));
      ctx.save();
      for (var mi = 0; mi < markers.length; mi++) {
        var mk = markers[mi];
        var mx = proj.x(mk.lon), my = proj.y(mk.lat);
        ctx.globalAlpha = 1;
        ctx.fillStyle = mk.color;
        ctx.strokeStyle = mk.color;
        ctx.shadowColor = mk.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, TAU);
        if (mk.hollow) { ctx.lineWidth = 1.5; ctx.stroke(); } else { ctx.fill(); }
        if (mk.alarm) {
          ctx.beginPath();
          ctx.arc(mx, my, r + 3.5, 0, TAU);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      stats.framesDrawn++;
      stats.markersPlotted = markers.length;
      stats.mode = mode;
    }

    // Deterministic presentation anchors for the layer markers: a
    // low-discrepancy (golden-ratio) spread over the map area, in
    // the order the layer returned its items. Same items in the
    // same order always produce the same anchors. Layout only.
    function anchorsFor(count) {
      var out = [];
      for (var i = 0; i < count; i++) {
        var fx = ((i + 0.5) * 0.6180339887498949) % 1;
        var fy = ((i + 0.5) * 0.7548776662466927) % 1;
        out.push({ lon: -172 + fx * 344, lat: -56 + fy * 132 });
      }
      return out;
    }

    function onResize() {
      if (canvas.isConnected === false) { destroy(); return; }
      draw();
    }

    var resizeObserver = null;
    if (typeof global.ResizeObserver === "function" && canvas.parentNode) {
      try {
        resizeObserver = new global.ResizeObserver(function () { onResize(); });
        resizeObserver.observe(canvas.parentNode);
      } catch (e) { resizeObserver = null; }
    }
    if (typeof global.addEventListener === "function") {
      global.addEventListener("resize", onResize);
    }

    function destroy() {
      if (!alive) return;
      alive = false;
      if (resizeObserver) { try { resizeObserver.disconnect(); } catch (e) {} resizeObserver = null; }
      if (typeof global.removeEventListener === "function") {
        global.removeEventListener("resize", onResize);
      }
    }

    // The screen hands in its own current layer object + mode. The
    // engine snapshots the items, derives colours and layout
    // anchors, and redraws immediately (static map — no loop).
    function setData(newLayer, newMode) {
      if (!alive) return;
      layer = newLayer || null;
      var m = String(newMode || "WORLD").toUpperCase();
      mode = PALETTES[m] ? m : "WORLD";
      items = layer && Array.isArray(layer.items) ? layer.items.slice() : [];
      var GI = global.GlobeIntelligence;
      var pos = anchorsFor(items.length);
      markers = items.map(function (it, i) {
        var color = FALLBACK_BLUE;
        try { if (GI && typeof GI.colorFor === "function") color = GI.colorFor(it); } catch (e) {}
        return {
          lon: pos[i].lon, lat: pos[i].lat,
          color: color,
          hollow: !!(it && it.kind === "ASSET_CLASS"),
          alarm: !!(it && it.alarm === true)
        };
      });
      stats.layerId = layer ? layer.id : null;
      stats.layerState = layer ? layer.state : null;
      stats.mode = mode;
      draw();
    }

    fit();
    draw();

    return {
      setData: setData,
      getStats: function () {
        return {
          framesDrawn: stats.framesDrawn,
          markersPlotted: stats.markersPlotted,
          countriesDrawn: stats.countriesDrawn,
          statesDrawn: stats.statesDrawn,
          citiesDrawn: stats.citiesDrawn,
          labelsDrawn: stats.labelsDrawn,
          mapLoaded: stats.mapLoaded,
          layerId: stats.layerId,
          layerState: stats.layerState,
          mode: stats.mode,
          running: stats.running,
          reducedMotion: stats.reducedMotion,
          angle: stats.angle
        };
      },
      stop: destroy
    };
  }

  global.GlobeEngine = { create: create, PALETTES: Object.keys(PALETTES) };
})(typeof globalThis !== "undefined" ? globalThis :
  (typeof window !== "undefined" ? window : this));
