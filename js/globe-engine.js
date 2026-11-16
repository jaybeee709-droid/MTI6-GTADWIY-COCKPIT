/* MTI6-GTADWIY-COCKPIT — Globe Engine (Build 1, roadmap item 13)
 *
 * A local canvas-2D rendering engine for the World Globe home
 * screen. It draws a shaded presentation sphere with a projected
 * graticule and plots one marker per item of the intelligence layer
 * the Globe screen currently has selected — the same layer object
 * (GlobeIntelligence.getLayer / listLayersLive) the screen's tabs,
 * badges and Details panel already read, handed in by the screen
 * itself, so the plotted set can never disagree with them.
 *
 * Truth rules (do not weaken them):
 * - DATA is only: which items exist in the selected layer, their
 *   kinds, and their colours via GlobeIntelligence.colorFor (alarm
 *   red ONLY for a verified-and-active alert — that rule lives in
 *   GlobeIntelligence and is not re-decided here). The marker COUNT
 *   is data: it always equals the selected layer's item count.
 * - GEOMETRY is presentation only. No layer item anywhere in this
 *   platform carries latitude, longitude, or any geography
 *   (GlobeIntelligence header rule: networks are logical nodes,
 *   never places). Marker anchors are therefore assigned by a
 *   deterministic Fibonacci-sphere distribution over the layer's
 *   items in registry order — layout, never a location. The Globe
 *   screen's truth label says exactly that.
 * - Nothing is fetched: no tiles, no imagery, no terrain, no
 *   external requests of any kind. The sphere's shading and
 *   graticule are drawn locally and claim no geography.
 * - Empty layers plot nothing (OPPORTUNITIES NO_DATA, BOT_ACTIVITY
 *   NOT_CONNECTED, SECURITY_ALERTS NO_ALERTS all have zero items by
 *   construction in GlobeIntelligence). The screen's badges and
 *   panel text say why; the engine invents nothing to fill them.
 *
 * Motion rules: slow rotation (one revolution per ROTATION_MS)
 * only while running; prefers-reduced-motion yields static frames
 * and no loop; the loop stops while the document is hidden and
 * self-terminates when the canvas leaves the DOM (route change),
 * so a re-render never leaves an orphan loop behind.
 *
 * Pure presentation: no storage, no network, no data writes. If a
 * 2D context cannot be obtained, create() returns null and the
 * Globe screen keeps its pre-engine presentation unchanged.
 */
(function (global) {
  "use strict";

  var TAU = Math.PI * 2;
  var ROTATION_MS = 150000; // one revolution per 150 s — slow drift
  var GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  var FALLBACK_BLUE = "#00BFFF"; // GlobeIntelligence.COLORS.ELECTRIC_BLUE

  // Mode palettes: presentation styling only (the five globe modes
  // restyle the rendering; they change no data). Disc shades mirror
  // the app's navy/black surfaces; TERRAIN is a muted palette, NOT
  // terrain data — the screen's label keeps that disclaimer.
  var PALETTES = {
    WORLD:        { disc: ["#10283d", "#04070b"], graticule: "rgba(0,191,255,0.16)", limb: "rgba(0,191,255,0.55)" },
    ELECTRIC:     { disc: ["#143c5a", "#030608"], graticule: "rgba(0,212,255,0.28)", limb: "rgba(0,212,255,0.85)" },
    TERRAIN:      { disc: ["#263026", "#060806"], graticule: "rgba(170,196,150,0.15)", limb: "rgba(170,196,150,0.45)" },
    BOUNDARIES:   { disc: ["#0a0d12", "#030405"], graticule: "rgba(192,200,214,0.32)", limb: "rgba(192,200,214,0.65)" },
    INTELLIGENCE: { disc: ["#1c1136", "#050409"], graticule: "rgba(139,92,246,0.20)", limb: "rgba(139,92,246,0.55)" }
  };

  function prefersReducedMotion() {
    try {
      return typeof global.matchMedia === "function" &&
        global.matchMedia("(prefers-reduced-motion: reduce)").matches === true;
    } catch (e) { return false; }
  }

  // Deterministic presentation anchors: a Fibonacci-sphere spread
  // over the items in the order the layer returned them. Same items
  // in the same order always produce the same anchors.
  function anchorsFor(items) {
    var n = items.length;
    var out = [];
    for (var i = 0; i < n; i++) {
      var y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
      var rad = Math.sqrt(Math.max(0, 1 - y * y));
      var theta = GOLDEN_ANGLE * i;
      out.push({ x: Math.cos(theta) * rad, y: y, z: Math.sin(theta) * rad });
    }
    return out;
  }

  function create(canvas) {
    if (!canvas || typeof canvas.getContext !== "function") return null;
    var ctx = null;
    try { ctx = canvas.getContext("2d"); } catch (e) { ctx = null; }
    if (!ctx) return null;

    var doc = canvas.ownerDocument || global.document || null;
    var raf = typeof global.requestAnimationFrame === "function"
      ? function (fn) { return global.requestAnimationFrame(fn); } : null;
    var caf = typeof global.cancelAnimationFrame === "function"
      ? function (id) { global.cancelAnimationFrame(id); } : null;

    var reduced = prefersReducedMotion();
    var alive = true;
    var running = false;
    var rafId = null;
    var lastTs = null;
    var angle = 0;
    var mode = "WORLD";
    var layer = null;
    var items = [];
    var anchors = [];
    var viewW = 0, viewH = 0;
    var stats = {
      framesDrawn: 0, markersPlotted: 0, markersFront: 0,
      layerId: null, layerState: null, mode: mode,
      running: false, reducedMotion: reduced, angle: 0
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

    // Orthographic projection of a unit-sphere point, rotated by
    // `angle` around the vertical axis. z > 0 faces the viewer.
    function project(px, py, pz) {
      var cosA = Math.cos(angle), sinA = Math.sin(angle);
      return { x: px * cosA + pz * sinA, y: py, z: -px * sinA + pz * cosA };
    }

    function graticulePath(cx, cy, R) {
      var lat, lon, i, p, started;
      ctx.beginPath();
      // Parallels every 15 degrees.
      for (lat = -75; lat <= 75; lat += 15) {
        var phi = lat * Math.PI / 180;
        started = false;
        for (lon = -180; lon <= 180; lon += 6) {
          var lam = lon * Math.PI / 180;
          p = project(Math.cos(phi) * Math.sin(lam), Math.sin(phi), Math.cos(phi) * Math.cos(lam));
          if (p.z > 0) {
            var sx = cx + p.x * R, sy = cy - p.y * R;
            if (started) ctx.lineTo(sx, sy); else { ctx.moveTo(sx, sy); started = true; }
          } else started = false;
        }
      }
      // Meridians every 15 degrees.
      for (lon = 0; lon < 180; lon += 15) {
        var lam2 = lon * Math.PI / 180;
        started = false;
        for (i = -90; i <= 90; i += 6) {
          var phi2 = i * Math.PI / 180;
          p = project(Math.cos(phi2) * Math.sin(lam2), Math.sin(phi2), Math.cos(phi2) * Math.cos(lam2));
          if (p.z > 0) {
            var mx = cx + p.x * R, my = cy - p.y * R;
            if (started) ctx.lineTo(mx, my); else { ctx.moveTo(mx, my); started = true; }
          } else started = false;
        }
      }
    }

    function draw() {
      if (!alive) return;
      fit();
      if (!viewW || !viewH) return;
      var cx = viewW / 2, cy = viewH / 2;
      var R = Math.min(viewW, viewH) / 2 - 6;
      if (R < 12) R = 12;
      var pal = PALETTES[mode] || PALETTES.WORLD;
      ctx.clearRect(0, 0, viewW, viewH);
      // Shaded sphere disc.
      var grad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.08, cx, cy, R);
      grad.addColorStop(0, pal.disc[0]);
      grad.addColorStop(1, pal.disc[1]);
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.fillStyle = grad;
      ctx.fill();
      // Graticule (front hemisphere only).
      graticulePath(cx, cy, R);
      ctx.strokeStyle = pal.graticule;
      ctx.lineWidth = 1;
      ctx.stroke();
      // Limb.
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.strokeStyle = pal.limb;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Markers: every item of the selected layer is plotted. The
      // far side shows through at low alpha (x-ray presentation), so
      // the plotted count always equals the layer's item count.
      var r = Math.max(2.2, Math.min(5, R / 90));
      var front = 0;
      for (var i = 0; i < anchors.length; i++) {
        var a = anchors[i];
        var p = project(a.x, a.y, a.z);
        var isFront = p.z > 0;
        if (isFront) front++;
        var sx2 = cx + p.x * R, sy2 = cy - p.y * R;
        ctx.globalAlpha = isFront ? 1 : 0.16;
        ctx.fillStyle = a.color;
        ctx.strokeStyle = a.color;
        ctx.beginPath();
        ctx.arc(sx2, sy2, r, 0, TAU);
        if (a.hollow) { ctx.lineWidth = 1.5; ctx.stroke(); } else { ctx.fill(); }
        if (a.alarm && isFront) {
          ctx.beginPath();
          ctx.arc(sx2, sy2, r + 3.5, 0, TAU);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      stats.framesDrawn++;
      stats.markersPlotted = anchors.length;
      stats.markersFront = front;
      stats.angle = angle;
      stats.mode = mode;
    }

    function loop(ts) {
      if (!alive) { running = false; stats.running = false; return; }
      if (canvas.isConnected === false) { destroy(); return; }
      if (typeof ts === "number") {
        if (lastTs !== null) angle += ((ts - lastTs) / ROTATION_MS) * TAU;
        lastTs = ts;
      }
      draw();
      rafId = raf(loop);
    }

    function startLoop() {
      if (!alive || reduced || !raf || running) return;
      if (doc && doc.hidden) return;
      running = true;
      stats.running = true;
      lastTs = null;
      rafId = raf(loop);
    }

    function stopLoop() {
      running = false;
      stats.running = false;
      lastTs = null;
      if (rafId !== null && caf) { try { caf(rafId); } catch (e) {} }
      rafId = null;
    }

    function onVisibility() {
      if (!doc) return;
      if (doc.hidden) stopLoop();
      else {
        if (canvas.isConnected === false) { destroy(); return; }
        startLoop();
      }
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
    if (doc && typeof doc.addEventListener === "function") {
      doc.addEventListener("visibilitychange", onVisibility);
    }
    if (typeof global.addEventListener === "function") {
      global.addEventListener("resize", onResize);
    }

    function destroy() {
      if (!alive) return;
      alive = false;
      stopLoop();
      if (resizeObserver) { try { resizeObserver.disconnect(); } catch (e) {} resizeObserver = null; }
      if (doc && typeof doc.removeEventListener === "function") {
        doc.removeEventListener("visibilitychange", onVisibility);
      }
      if (typeof global.removeEventListener === "function") {
        global.removeEventListener("resize", onResize);
      }
    }

    // The screen hands in its own current layer object + mode. The
    // engine snapshots the items, derives anchors and colours, draws
    // immediately, and keeps the loop state honest.
    function setData(newLayer, newMode) {
      if (!alive) return;
      layer = newLayer || null;
      var m = String(newMode || "WORLD").toUpperCase();
      mode = PALETTES[m] ? m : "WORLD";
      items = layer && Array.isArray(layer.items) ? layer.items.slice() : [];
      var GI = global.GlobeIntelligence;
      var pos = anchorsFor(items);
      anchors = items.map(function (it, i) {
        var color = FALLBACK_BLUE;
        try { if (GI && typeof GI.colorFor === "function") color = GI.colorFor(it); } catch (e) {}
        return {
          x: pos[i].x, y: pos[i].y, z: pos[i].z,
          color: color,
          hollow: !!(it && it.kind === "ASSET_CLASS"),
          alarm: !!(it && it.alarm === true)
        };
      });
      stats.layerId = layer ? layer.id : null;
      stats.layerState = layer ? layer.state : null;
      stats.mode = mode;
      draw();
      startLoop();
    }

    fit();
    draw();

    return {
      setData: setData,
      getStats: function () {
        return {
          framesDrawn: stats.framesDrawn,
          markersPlotted: stats.markersPlotted,
          markersFront: stats.markersFront,
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
