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
 * - A tiny dot at each major city's real position (243).
 * - Names at their positions, FADED into the background — country
 *   names (Natural Earth's own label points) most visible, then
 *   state names, then city names — are implemented below but are
 *   currently NOT drawn: LABELS_ENABLED is false (owner ruling
 *   2026-11-16, "take the names off for now"). The vendored data
 *   keeps its label points untouched for when names return.
 * - The selected intelligence layer's items as glowing markers on
 *   top — the same layer object (GlobeIntelligence.getLayer /
 *   listLayersLive) the screen's tabs, badges and Details panel
 *   read, handed in by the screen itself, so the plotted count can
 *   never disagree with them.
 *
 * Truth rules (do not weaken them):
 * - The MAP is real public-domain geography used as presentation:
 *   outlines sit at their real positions, and so do the label
 *   points in the data (currently not drawn — see LABELS_ENABLED;
 *   see the data file's provenance header). It is NOT a live map
 *   feed — nothing is fetched, no tiles, no imagery, no external
 *   requests.
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
 *
 * Alert Mode (owner ruling, 2026-11-16: "when there alerts, the
 * world map fades into that [red map]"): the screen may hand in an
 * alert state via setAlertMode(on), driven ONLY by
 * GlobeIntelligence.layerHasAlarm("SECURITY_ALERTS") — the single
 * existing alarm derivation (an item counts only when
 * GlobeIntelligence itself flagged it alarm, i.e. a verified
 * CONFIRMED/ACTIVE-family alert). While it holds, draw() blends
 * the active mode palette toward ALERT_PALETTE (red family) with a
 * bounded ~600ms crossfade — a one-shot transition, not an
 * animation loop; under prefers-reduced-motion the switch is
 * instant. Marker colours are NOT re-decided here: they still come
 * from GlobeIntelligence.colorFor, so an unverified alert's marker
 * never turns red. Alert records carry no geography, so alert
 * mode changes colours only — never positions, never a regional
 * framing.
 *
 * Live World Build 1 (owner direction, 2026-11-16: "set
 * everything up on the screen... we should be able to zoom in
 * on any area on the map"): the map gains a REAL view transform
 * — a centre (lon/lat) plus a scale multiplier over the
 * whole-world fit — applied inside the projection, so pan and
 * zoom re-project the vendored geography itself (drag pans,
 * wheel/pinch zoom at the pointer, + / − / reset via the API).
 * This is Option 1 of the mapping-stack audit: the local engine
 * enhanced in place — zero new dependencies, no tiles, no
 * imagery, no network. Zoom tiers by scale: WORLD → REGION →
 * COUNTRY → LOCAL. Truth limits, stated on the screen as well:
 * zooming shows the SAME coarse 110m outlines larger — it is
 * not satellite imagery and there is no street-level detail in
 * the data. Tapping the map reports a geographic pick (pickAt):
 * the inverse-projected lon/lat, the nearest vendored city when
 * the tap lands within a small pixel radius of its real point
 * (cities sit at true coordinates), and land/country from
 * point-in-polygon over the vendored outlines — approximate
 * near coasts at this resolution, and labelled as such.
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
  // cities weakest. (Label colours are used only while
  // LABELS_ENABLED is on — names are off for now.)
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

  // Alert Mode palette (owner ruling 2026-11-16): the red family
  // the map fades into while a verified active security alert
  // holds. Presentation only, like the mode palettes — it restyles
  // the SAME geography and the SAME markers; it adds no data, no
  // regional framing and no hotspots (alert records have no
  // geography). The stroke red matches GlobeIntelligence's
  // ALARM_RED (#ff5c5c) so the map and its alarm markers agree.
  var ALERT_PALETTE = {
    bg: "#0a0304", glow: "#3d0d10",
    countryFill: "rgba(52,12,16,0.9)", countryStroke: "rgba(255,92,92,0.65)", countryWidth: 0.8,
    stateStroke: "rgba(255,92,92,0.2)",
    labelCountry: "rgba(255,196,188,0.34)", labelState: "rgba(246,176,168,0.20)", labelCity: "rgba(238,166,158,0.14)",
    cityDot: "rgba(255,92,92,0.4)"
  };
  var ALERT_FADE_MS = 600;

  // Palette colour interpolation for the alert crossfade: palette
  // entries are "#rrggbb" or "rgba(r,g,b,a)" strings; both parse to
  // [r,g,b,a] and mix component-wise.
  function parseColor(c) {
    if (typeof c !== "string") return [0, 0, 0, 1];
    if (c.charAt(0) === "#") {
      return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16),
        parseInt(c.slice(5, 7), 16), 1];
    }
    var m = c.match(/[\d.]+/g);
    if (!m || m.length < 3) return [0, 0, 0, 1];
    return [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1];
  }
  function mixColor(a, b, t) {
    var pa = parseColor(a), pb = parseColor(b);
    var r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
    var g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
    var bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
    var al = pa[3] + (pb[3] - pa[3]) * t;
    return "rgba(" + r + "," + g + "," + bl + "," + al.toFixed(3) + ")";
  }
  var PALETTE_COLOR_KEYS = ["bg", "glow", "countryFill", "countryStroke",
    "stateStroke", "labelCountry", "labelState", "labelCity", "cityDot"];
  function blendPalette(base, alert, t) {
    var out = {};
    for (var i = 0; i < PALETTE_COLOR_KEYS.length; i++) {
      var k = PALETTE_COLOR_KEYS[i];
      out[k] = mixColor(base[k], alert[k], t);
    }
    out.countryWidth = base.countryWidth + (alert.countryWidth - base.countryWidth) * t;
    return out;
  }

  // NAME LABELS — OFF for now (owner ruling, 2026-11-16: "look at
  // the Globe take the names off for now"). While this is false the
  // renderer draws NO country/state/city name text at all. The
  // label pass below and the label points in js/data/world-map.js
  // are deliberately left intact — flip this one constant to true
  // to bring the faded names back. City DOTS are geography, not
  // names, and are drawn either way; layer markers are data and
  // are unaffected.
  var LABELS_ENABLED = false;

  // Projection window (degrees). Latitudes beyond +/-85 are pole
  // caps with no label content; Antarctica's outline continues
  // below the window and is clipped by the canvas edge, as on most
  // flat world maps.
  var LON_MIN = -180, LON_SPAN = 360, LAT_MAX = 85, LAT_SPAN = 170;

  // Live World Build 1 view transform bounds + zoom tiers. Scale
  // is a multiplier over the whole-world fit (1 = whole world).
  // Tier boundaries are by scale only; the tier names describe
  // how specific the viewed area is, never a data resolution the
  // vendored outlines do not have.
  var VIEW_MIN_SCALE = 1, VIEW_MAX_SCALE = 40;
  var VIEW_TIERS = [
    { id: "WORLD", min: 1 },
    { id: "REGION", min: 2.5 },
    { id: "COUNTRY", min: 7 },
    { id: "LOCAL", min: 20 }
  ];
  function tierForScale(scale) {
    var tier = "WORLD";
    for (var i = 0; i < VIEW_TIERS.length; i++) {
      if (scale >= VIEW_TIERS[i].min) tier = VIEW_TIERS[i].id;
    }
    return tier;
  }

  function create(canvas) {
    if (!canvas || typeof canvas.getContext !== "function") return null;
    var ctx = null;
    try { ctx = canvas.getContext("2d"); } catch (e) { ctx = null; }
    if (!ctx) return null;

    var doc = canvas.ownerDocument || global.document || null;
    var alive = true;
    var mode = "WORLD";
    // Alert Mode state: alertOn is the handed-in alarm state,
    // alertBlend is the crossfade position (0 = mode palette,
    // 1 = alert palette). The tween fields drive the bounded
    // one-shot fade; nothing animates while the state is settled.
    var alertOn = false;
    var alertBlend = 0;
    var alertTween = null;
    var alertTweenFrom = 0;
    var alertTweenTo = 0;
    var alertTweenStart = 0;
    var layer = null;
    var items = [];
    var markers = [];
    var viewW = 0, viewH = 0;
    // Live World Build 1 view state: centre (lon/lat) + scale
    // multiplier over the whole-world fit. The default view
    // (0, 0, 1) reproduces the historical fit-to-box projection
    // exactly — every pre-existing draw is unchanged until the
    // view is moved.
    var view = { lon: 0, lat: 0, scale: 1 };
    var handlers = null;
    var stats = {
      framesDrawn: 0, markersPlotted: 0,
      countriesDrawn: 0, statesDrawn: 0, citiesDrawn: 0, labelsDrawn: 0,
      labelsCountries: 0, labelsStates: 0, labelsCities: 0,
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

    // Equirectangular projection through the Live World view
    // transform: the whole-world fit scale multiplied by
    // view.scale, centred on (view.lon, view.lat). At the default
    // view this is exactly the historical fit-to-box projection
    // (aspect preserved, letterboxed).
    function fitScale() {
      return Math.min(viewW / LON_SPAN, viewH / LAT_SPAN);
    }
    function projector() {
      var s = fitScale() * view.scale;
      return {
        scale: s,
        x: function (lon) { return viewW / 2 + (lon - view.lon) * s; },
        y: function (lat) { return viewH / 2 + (view.lat - lat) * s; }
      };
    }
    function project(lon, lat) {
      var p = projector();
      return { x: p.x(lon), y: p.y(lat) };
    }
    function unproject(x, y) {
      var s = fitScale() * view.scale;
      if (!s) return { lon: view.lon, lat: view.lat };
      return {
        lon: view.lon + (x - viewW / 2) / s,
        lat: view.lat - (y - viewH / 2) / s
      };
    }
    // Pan/zoom clamp: scale stays inside [MIN, MAX] and the view
    // centre never leaves the map window, so at least half the
    // viewport always shows map — the map can never be panned or
    // zoomed entirely away.
    function clampView() {
      if (view.scale < VIEW_MIN_SCALE) view.scale = VIEW_MIN_SCALE;
      if (view.scale > VIEW_MAX_SCALE) view.scale = VIEW_MAX_SCALE;
      if (view.lon < LON_MIN) view.lon = LON_MIN;
      if (view.lon > -LON_MIN) view.lon = -LON_MIN;
      if (view.lat < -LAT_MAX) view.lat = -LAT_MAX;
      if (view.lat > LAT_MAX) view.lat = LAT_MAX;
    }
    function notifyView() {
      if (handlers && typeof handlers.onViewChange === "function") {
        try { handlers.onViewChange(getView()); } catch (e) {}
      }
    }
    function getView() {
      return {
        lon: view.lon, lat: view.lat, scale: view.scale,
        tier: tierForScale(view.scale),
        minScale: VIEW_MIN_SCALE, maxScale: VIEW_MAX_SCALE
      };
    }
    function setView(next) {
      if (!alive || !next) return;
      if (typeof next.lon === "number" && isFinite(next.lon)) view.lon = next.lon;
      if (typeof next.lat === "number" && isFinite(next.lat)) view.lat = next.lat;
      if (typeof next.scale === "number" && isFinite(next.scale)) view.scale = next.scale;
      clampView();
      draw();
      notifyView();
    }
    // Zoom by a factor around a canvas point (CSS pixels): the
    // geographic point under that pixel stays under it.
    function zoomAt(factor, px, py) {
      if (!alive || !(factor > 0) || !isFinite(factor)) return;
      fit();
      if (!viewW || !viewH) return;
      if (typeof px !== "number") px = viewW / 2;
      if (typeof py !== "number") py = viewH / 2;
      var before = unproject(px, py);
      view.scale = view.scale * factor;
      clampView();
      var s = fitScale() * view.scale;
      if (s) {
        view.lon = before.lon - (px - viewW / 2) / s;
        view.lat = before.lat + (py - viewH / 2) / s;
      }
      clampView();
      draw();
      notifyView();
    }
    var ZOOM_STEP = 1.6;
    function zoomIn() { zoomAt(ZOOM_STEP, viewW / 2, viewH / 2); }
    function zoomOut() { zoomAt(1 / ZOOM_STEP, viewW / 2, viewH / 2); }
    // Drag pan: the map follows the pointer (content moves with
    // the drag), so the centre moves the opposite way.
    function panBy(dxPx, dyPx) {
      if (!alive) return;
      fit();
      var s = fitScale() * view.scale;
      if (!s) return;
      view.lon -= dxPx / s;
      view.lat += dyPx / s;
      clampView();
      draw();
      notifyView();
    }
    function resetView() {
      if (!alive) return;
      view = { lon: 0, lat: 0, scale: 1 };
      draw();
      notifyView();
    }

    // ---- Geographic pick (Live World Build 1) ------------------
    // Point-in-polygon over the vendored country rings. The
    // outlines are coarse (110m, coordinates rounded to 2
    // decimals), so containment near a coast is approximate —
    // the screen labels it as such.
    //
    // ANTIMERIDIAN: rings are stored CUT at +/-180, so a country
    // like Fiji arrives as pieces at both map edges. Ray casting
    // in the raw frame breaks parity for such rings (skipping the
    // cut segment unbalances the crossing count — it once made
    // La Paz, Bolivia report as Fiji). Containment is therefore
    // tested in an UNWRAPPED frame: the ring's longitudes are
    // made continuous (each step <= 180) and the test point's
    // longitude is shifted by whole turns to sit nearest the
    // ring's own longitude centre before the standard even-odd
    // ray cast (applied across all of a country's rings, so
    // enclaves/holes behave).
    function ringContains(ring, lon, lat) {
      var n = ring.length / 2;
      if (n < 3) return false;
      var xs = new Array(n);
      var prev = ring[0];
      xs[0] = prev;
      var sum = prev;
      for (var k = 1; k < n; k++) {
        var raw = ring[k * 2];
        var d = raw - prev;
        while (d > 180) { raw -= 360; d -= 360; }
        while (d < -180) { raw += 360; d += 360; }
        xs[k] = raw;
        prev = raw;
        sum += raw;
      }
      var centre = sum / n;
      var px = lon;
      while (px - centre > 180) px -= 360;
      while (px - centre < -180) px += 360;
      var inside = false;
      for (var i = 0, j = n - 1; i < n; j = i++) {
        var xi = xs[i], yi = ring[i * 2 + 1];
        var xj = xs[j], yj = ring[j * 2 + 1];
        if ((yi > lat) !== (yj > lat)) {
          var xInt = xi + (lat - yi) * (xj - xi) / (yj - yi);
          if (px < xInt) inside = !inside;
        }
      }
      return inside;
    }
    function countryAt(lon, lat) {
      var data = global.WorldMapData;
      if (!data || !Array.isArray(data.countries)) return null;
      for (var ci = 0; ci < data.countries.length; ci++) {
        var rings = data.countries[ci].p || [];
        var inside = false;
        for (var r = 0; r < rings.length; r++) {
          if (ringContains(rings[r], lon, lat)) inside = !inside;
        }
        if (inside) return data.countries[ci].n;
      }
      return null;
    }
    // US state lookup (Globe Explore Build, owner direction
    // 2026-11-16: "it should be where exactly state it is"):
    // the same unwrapped-frame containment over the vendored
    // US states rings (Census TIGER, public domain — 50 states
    // + District of Columbia + Puerto Rico). Returns the state
    // name, or null outside every vendored state (non-US land,
    // ocean, or a coastal point the coarse outlines miss —
    // the same approximate-containment honesty as countryAt).
    function stateAt(lon, lat) {
      var data = global.WorldMapData;
      if (!data || !Array.isArray(data.states)) return null;
      for (var ci = 0; ci < data.states.length; ci++) {
        var rings = data.states[ci].p || [];
        var inside = false;
        for (var r = 0; r < rings.length; r++) {
          if (ringContains(rings[r], lon, lat)) inside = !inside;
        }
        if (inside) return data.states[ci].n;
      }
      return null;
    }
    // Describe a geographic point from the vendored data alone:
    // country + US state + land flag. Used by the Explore guide
    // so its line always names the real place under the view.
    function describeAt(lon, lat) {
      var country = countryAt(lon, lat);
      return {
        lon: lon, lat: lat,
        country: country,
        state: stateAt(lon, lat),
        land: !!country
      };
    }
    // A tap lands on a city when its projected point is within
    // this many CSS pixels of the tap. Because the radius is in
    // pixels, the geographic threshold tightens as you zoom in —
    // a small threshold at the current tier, by construction.
    var CITY_PICK_RADIUS_PX = 28;
    function pickAt(px, py) {
      fit();
      var pt = unproject(px, py);
      var lon = Math.max(LON_MIN, Math.min(-LON_MIN, pt.lon));
      var lat = Math.max(-LAT_MAX, Math.min(LAT_MAX, pt.lat));
      var data = global.WorldMapData;
      var city = null;
      if (data && Array.isArray(data.cities)) {
        var proj = projector();
        var best = null, bestD = Infinity;
        for (var i = 0; i < data.cities.length; i++) {
          var c = data.cities[i];
          var dx = proj.x(c.at[0]) - px, dy = proj.y(c.at[1]) - py;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < bestD) { bestD = d; best = c; }
        }
        if (best && bestD <= CITY_PICK_RADIUS_PX) {
          city = {
            name: best.n,
            at: [best.at[0], best.at[1]],
            distancePx: Math.round(bestD * 10) / 10,
            country: countryAt(best.at[0], best.at[1]),
            state: stateAt(best.at[0], best.at[1])
          };
        }
      }
      var country = countryAt(lon, lat);
      return {
        lon: Math.round(lon * 10000) / 10000,
        lat: Math.round(lat * 10000) / 10000,
        city: city,
        country: country,
        state: stateAt(lon, lat),
        land: !!country,
        tier: tierForScale(view.scale),
        scale: view.scale
      };
    }

    // ---- Pointer interaction (Live World Build 1) --------------
    // Drag pans, the wheel zooms at the cursor, a two-pointer
    // pinch zooms at its midpoint, and a press that barely moves
    // is a TAP (the screen's location-context pick). All
    // manipulation is direct — no tweening anywhere — so
    // prefers-reduced-motion is honoured by construction.
    var pointers = {};
    var pointerCount = 0;
    var dragMoved = 0;
    var lastPinchDist = 0;

    function canvasPoint(e) {
      var left = 0, top = 0;
      try {
        if (typeof canvas.getBoundingClientRect === "function") {
          var rect = canvas.getBoundingClientRect();
          left = rect.left || 0; top = rect.top || 0;
        }
      } catch (err) {}
      var cx = e && typeof e.clientX === "number" ? e.clientX : 0;
      var cy = e && typeof e.clientY === "number" ? e.clientY : 0;
      return { x: cx - left, y: cy - top };
    }
    function onPointerDown(e) {
      if (!alive) return;
      var id = e && typeof e.pointerId === "number" ? e.pointerId : 0;
      if (!pointers[id]) pointerCount++;
      pointers[id] = canvasPoint(e);
      dragMoved = 0;
      lastPinchDist = 0;
      try { if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(id); } catch (err) {}
    }
    function onPointerMove(e) {
      if (!alive) return;
      var id = e && typeof e.pointerId === "number" ? e.pointerId : 0;
      if (!pointers[id]) return;
      var pt = canvasPoint(e);
      var prev = pointers[id];
      pointers[id] = pt;
      if (pointerCount === 1) {
        var dx = pt.x - prev.x, dy = pt.y - prev.y;
        dragMoved += Math.abs(dx) + Math.abs(dy);
        if (dx || dy) panBy(dx, dy);
      } else if (pointerCount === 2) {
        var pts = [];
        for (var k in pointers) {
          if (Object.prototype.hasOwnProperty.call(pointers, k)) pts.push(pointers[k]);
        }
        if (pts.length === 2) {
          var ddx = pts[0].x - pts[1].x, ddy = pts[0].y - pts[1].y;
          var dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (lastPinchDist > 0 && dist > 0) {
            dragMoved += Math.abs(dist - lastPinchDist);
            zoomAt(dist / lastPinchDist,
              (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
          }
          lastPinchDist = dist;
        }
      }
    }
    function onPointerUp(e) {
      if (!alive) return;
      var id = e && typeof e.pointerId === "number" ? e.pointerId : 0;
      var wasTracked = !!pointers[id];
      var pt = pointers[id] || canvasPoint(e);
      if (wasTracked) { delete pointers[id]; pointerCount--; }
      lastPinchDist = 0;
      if (wasTracked && pointerCount === 0 && dragMoved < 6) {
        if (handlers && typeof handlers.onTap === "function") {
          try { handlers.onTap(pickAt(pt.x, pt.y)); } catch (err) {}
        }
      }
    }
    function onWheel(e) {
      if (!alive) return;
      if (e && typeof e.preventDefault === "function") {
        try { e.preventDefault(); } catch (err) {}
      }
      var dy = e && typeof e.deltaY === "number" ? e.deltaY : 0;
      if (!dy) return;
      var pt = canvasPoint(e);
      zoomAt(dy < 0 ? 1.2 : 1 / 1.2, pt.x, pt.y);
    }
    var interactive = typeof canvas.addEventListener === "function";
    if (interactive) {
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
      try { canvas.addEventListener("wheel", onWheel, { passive: false }); }
      catch (err) { canvas.addEventListener("wheel", onWheel); }
      if (canvas.style) {
        canvas.style.touchAction = "none";
        canvas.style.cursor = "grab";
      }
    }
    function setInteractionHandlers(h) {
      handlers = h || null;
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

    // The palette a frame actually uses: the mode palette, the
    // alert palette, or the crossfade blend between them.
    function effectivePalette() {
      var base = PALETTES[mode] || PALETTES.WORLD;
      if (alertBlend <= 0) return base;
      if (alertBlend >= 1) return ALERT_PALETTE;
      return blendPalette(base, ALERT_PALETTE, alertBlend);
    }

    function draw() {
      if (!alive) return;
      fit();
      if (!viewW || !viewH) return;
      var pal = effectivePalette();
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
        // Skipped entirely while LABELS_ENABLED is false (owner
        // ruling 2026-11-16 — names off for now; see the constant).
        var s = proj.scale;
        var countryFont = Math.max(9, Math.min(15, s * 3.1));
        if (LABELS_ENABLED) {
          labelTotal += drawLabels(countries, proj,
            "600 " + countryFont.toFixed(1) + "px system-ui, sans-serif",
            pal.labelCountry, "labelsCountries");
          labelTotal += drawLabels(states, proj,
            "500 " + (countryFont * 0.74).toFixed(1) + "px system-ui, sans-serif",
            pal.labelState, "labelsStates");
        }
        var cities = Array.isArray(data.cities) ? data.cities : [];
        // City dots at their real positions (geography, not names —
        // drawn whether or not labels are enabled). Dots outside
        // the viewport are culled (the canvas clips regardless;
        // culling keeps zoomed draws cheap).
        ctx.fillStyle = pal.cityDot;
        for (var ti = 0; ti < cities.length; ti++) {
          var cpt = cities[ti].at;
          var cpx = proj.x(cpt[0]), cpy = proj.y(cpt[1]);
          if (cpx < -4 || cpx > viewW + 4 || cpy < -4 || cpy > viewH + 4) continue;
          ctx.beginPath();
          ctx.arc(cpx, cpy, 1.1, 0, TAU);
          ctx.fill();
        }
        stats.citiesDrawn = cities.length;
        if (LABELS_ENABLED) {
          labelTotal += drawLabels(cities, proj,
            "400 " + (countryFont * 0.58).toFixed(1) + "px system-ui, sans-serif",
            pal.labelCity, "labelsCities");
        }
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
        if (mx < -24 || mx > viewW + 24 || my < -24 || my > viewH + 24) continue;
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

    function prefersReducedMotion() {
      try {
        return !!(global.matchMedia &&
          global.matchMedia("(prefers-reduced-motion: reduce)").matches);
      } catch (e) { return false; }
    }

    function cancelAlertTween() {
      if (alertTween !== null && typeof global.cancelAnimationFrame === "function") {
        try { global.cancelAnimationFrame(alertTween); } catch (e) {}
      }
      alertTween = null;
    }

    // One crossfade step: ease the blend from its start value to
    // the target over ALERT_FADE_MS, redrawing per frame, then
    // stop — the map is static again once the fade settles.
    function alertTweenStep(ts) {
      alertTween = null;
      if (!alive) return;
      if (!alertTweenStart) alertTweenStart = ts;
      var p = (ts - alertTweenStart) / ALERT_FADE_MS;
      if (p >= 1) {
        alertBlend = alertTweenTo;
        draw();
        return;
      }
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      alertBlend = alertTweenFrom + (alertTweenTo - alertTweenFrom) * e;
      draw();
      if (typeof global.requestAnimationFrame === "function") {
        alertTween = global.requestAnimationFrame(alertTweenStep);
      } else {
        alertBlend = alertTweenTo;
        draw();
      }
    }

    // The screen hands in the alarm state (GlobeIntelligence
    // .layerHasAlarm("SECURITY_ALERTS") — see the header). Turning
    // it on/off crossfades the palette; under prefers-reduced-
    // motion (or without requestAnimationFrame) the switch is
    // instant. Colours only: geography, markers and counts are
    // exactly what setData() last handed in.
    function setAlertMode(on) {
      if (!alive) return;
      alertOn = on === true;
      var target = alertOn ? 1 : 0;
      cancelAlertTween();
      if (alertBlend === target) { draw(); return; }
      if (prefersReducedMotion() ||
          typeof global.requestAnimationFrame !== "function") {
        alertBlend = target;
        draw();
        return;
      }
      alertTweenFrom = alertBlend;
      alertTweenTo = target;
      alertTweenStart = 0;
      alertTween = global.requestAnimationFrame(alertTweenStep);
    }

    function destroy() {
      if (!alive) return;
      alive = false;
      cancelAlertTween();
      if (interactive && typeof canvas.removeEventListener === "function") {
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerUp);
        canvas.removeEventListener("wheel", onWheel);
      }
      pointers = {};
      pointerCount = 0;
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
          angle: stats.angle,
          alertMode: alertOn,
          alertBlend: alertBlend,
          viewLon: view.lon,
          viewLat: view.lat,
          viewScale: view.scale,
          viewTier: tierForScale(view.scale)
        };
      },
      setAlertMode: setAlertMode,
      getView: getView,
      setView: setView,
      zoomAt: zoomAt,
      zoomIn: zoomIn,
      zoomOut: zoomOut,
      panBy: panBy,
      resetView: resetView,
      project: project,
      unproject: unproject,
      pickAt: pickAt,
      describeAt: describeAt,
      setInteractionHandlers: setInteractionHandlers,
      stop: destroy
    };
  }

  global.GlobeEngine = {
    create: create,
    PALETTES: Object.keys(PALETTES),
    LABELS_ENABLED: LABELS_ENABLED,
    TIERS: VIEW_TIERS.map(function (t) { return t.id; }),
    tierForScale: tierForScale,
    VIEW_MIN_SCALE: VIEW_MIN_SCALE,
    VIEW_MAX_SCALE: VIEW_MAX_SCALE
  };
})(typeof globalThis !== "undefined" ? globalThis :
  (typeof window !== "undefined" ? window : this));
