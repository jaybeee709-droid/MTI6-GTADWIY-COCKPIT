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
 * badges, view zoom, reset, layer toggles, Details panel,
 * full screen via the browser Fullscreen API) and a collapsible
 * .globe-side-panel showing the selected layer's detail. The visual
 * area is a 2D shell, never labelled as a 3D terrain engine.
 *
 * Globe Engine Build 1 (roadmap item 13): js/globe-engine.js renders
 * a local canvas presentation globe inside the visual area and plots
 * one marker per item of the SELECTED intelligence layer — the same
 * layer objects this screen's tabs, badges and Details panel read
 * (getLayerSafe), handed to the engine on every layer/mode refresh.
 * No layer item carries geography anywhere in this platform, so
 * marker anchors are deterministic presentation layout (a
 * Fibonacci-sphere spread in registry order), never locations; the
 * truth label inside the visual says so. If the engine or a 2D
 * canvas context is unavailable, the screen keeps its previous
 * presentation (label only) — nothing here depends on it.
 *
 * Globe Map Build 2 (owner ruling, 2026-11-16): the sphere is
 * replaced by a FLAT world map, drawn locally from vendored
 * public-domain Natural Earth data (js/data/world-map.js): outlines
 * of all countries in the same electric-blue scheme, US state
 * outlines fainter, and country/state/city names faded into the
 * background at their real positions. The map is presentation
 * geography, NOT a live map feed — nothing is fetched. The layer
 * markers remain layout, never locations: a marker does not sit in
 * the country it happens to land on, and the truth label says so.
 *
 * Names-off ruling (owner, 2026-11-16, later the same day): the
 * country/state/city name labels are hidden for now
 * (LABELS_ENABLED = false in js/globe-engine.js). Outlines, city
 * points and layer markers are unchanged, and the vendored label
 * points stay in the data file for when names return.
 *
 * Alert Mode (owner ruling, 2026-11-16: "when there alerts, the
 * world map fades into that [red map]"): while the cockpit's
 * genuine alarm condition holds, the map fades into a red alert
 * presentation and a banner names the real count. The trigger is
 * the ONE existing derivation — GlobeIntelligence.layerHasAlarm(
 * "SECURITY_ALERTS"), the same hasAlarm the shell bubble rail
 * reads: an alert counts only when GlobeIntelligence flagged it
 * (a verified CONFIRMED/ACTIVE-family alert). A DETECTED or
 * VERIFYING alert never triggers it, and this screen never
 * re-derives which states count. Alert records carry no
 * geography, so the mode is a global red presentation of the
 * recorded alert state — no regional hotspots, no arcs, no
 * locations — and the truth label says so while it is on.
 * AngelSecurity has no live detectors; nothing here claims
 * live detection.
 *
 * Live World Build 1 (owner direction, 2026-11-16): the Globe
 * screen becomes the Live World surface, on the local engine
 * enhanced in place (mapping-stack audit Option 1 — no new
 * dependencies, no tiles, no framework):
 * - REAL pan/zoom: the engine holds a view transform (centre +
 *   scale); drag pans, wheel/pinch zoom, + / − / Reset drive it,
 *   and tiers run WORLD → REGION → COUNTRY → LOCAL. The old CSS
 *   "presentation zoom" is gone — zoom now re-projects the
 *   vendored geography. Its honesty limit stands: the outlines
 *   are coarse (110m), so zoom shows them larger; it is not
 *   satellite imagery and there is no street-level detail.
 * - LOCATION CONTEXT: tapping the map inverse-projects the tap
 *   to lon/lat; near a vendored city the context names that city
 *   and its country (real dataset positions), otherwise it shows
 *   coordinates with an honest land/ocean label from the coarse
 *   outlines. The context card states the data truth plainly.
 * - SEARCH THIS AREA queries only what is genuinely available
 *   for the point: live weather from Open-Meteo (keyless, the
 *   same API this screen already uses) as a result card with its
 *   observation time and a SOURCE: Open-Meteo line; a recorded-
 *   layers line that says the cockpit's layers are global state
 *   with no geography; and the MEDIA SELECTOR whose twelve
 *   categories are all honestly NOT_CONNECTED — no provider is
 *   connected yet, so no media results exist and none are
 *   invented. FIND MORE is present in its gated state: discovery
 *   workers are not running yet.
 * - EXPLORE / ME toggle: Explore is the active mode. Me Mode is
 *   LOCATION OFF — it is not wired in this build, no device
 *   location is requested, read or inferred, and Explore never
 *   implies the owner is physically at the place on screen.
 *
 * Full-Screen World Shell (owner direction 2026-11-16): the Globe
 * route is full-bleed and the controls that used to stack in rows
 * under the map now live in two overlay rows ON the visual — a
 * TOP ROLL (layer chips, Explore/Me, view readout + zoom, mode
 * tabs, quick layer toggles, Details, Full screen, mode note) and
 * a BOTTOM ROLL (the recorded-layers readout line, SEARCH THIS
 * AREA / FIND MORE, the Live World note, and the truth label
 * verbatim as the roll's last line). Same elements, same
 * handlers, same honest states — only their parents changed.
 * The Live World panel below the stage keeps the location
 * context card, the search results and the Media Selector.
 *
 * Globe Explore Build (owner direction 2026-11-16, later):
 * - EXACT PLACE: the context card names the US STATE as well
 *   (engine stateAt over the vendored state rings) — "Houston,
 *   Texas, United States of America".
 * - CAPITAL: a state-capitals table (code, below) names the
 *   capital; when the capital is one of the vendored places,
 *   a Zoom-to-capital button centres the view on it at LOCAL
 *   tier. Capitals outside the vendored places are named
 *   without a button — their positions are never invented.
 * - AREA SELECTOR: at COUNTRY tier or deeper (and in Explore)
 *   a chip selector — TRAFFIC · BUSINESS · CITY · TOWN ·
 *   LIVE CAMS · PICS · STREET IMAGERY · SOCIAL. CITY/TOWN are
 *   local lenses over the vendored places (nearest first,
 *   real distances); the places data carries no size field,
 *   so both show the same nearest-places list and say so.
 *   The rest are provider categories in their honest
 *   NOT_CONNECTED state, same discipline as the Media Selector.
 * - EXPLORE: STAR walks the map with the owner — the view
 *   centres on the place at LOCAL tier, STAR's guide card
 *   names the real place under the view, and a tap arrow pad
 *   (or the arrow keys) walks the view in third-of-screen
 *   steps. Presentation only: the guide line is computed from
 *   the vendored data after every step, never narrated.
 *   Vehicle morphing (car/boat/plane/drone) is future owner
 *   direction — nothing for it is built here.
 *
 * World Lens package (World OS directive §§1/9/13; architecture
 * §7): the Globe gains the World OS surfaces, all view state
 * over the ONE location context — never a data fork:
 * - WORLD LENS selector in the top roll: ten lenses (REALITY ·
 *   LIVE · TRAFFIC · TRANSIT · WEATHER · OPPORTUNITIES ·
 *   SECURITY · BOT ACTIVITY · SOURCE COVERAGE · SIMULATOR),
 *   each with a state badge DERIVED from the same layer reads
 *   and wiring the rest of the screen uses. A lens emphasises
 *   its existing layer where one exists; TRAFFIC / TRANSIT /
 *   LIVE / SIMULATOR carry their honest states (SIMULATOR is a
 *   labelled NOT BUILT seat and opens nothing).
 * - COVERAGE readout in the Live World panel: for the current
 *   context, one (kind, state, basis) row per coverage kind,
 *   computed only from vendored presence, the connected
 *   Open-Meteo source, and the platform's GLOBAL layer states
 *   (labelled global, never area coverage) — everything else
 *   is a GAP worded MTI6-relatively ("MTI6 has no … source for
 *   this area"). Land/ocean and tier aware; no heatmap (that
 *   rendering is a future layer), no missions (they open with
 *   the registry + worker runtime).
 * - TRANSPORT ROUTES selector: every mode (DRIVING · WALKING ·
 *   BOAT/FERRY · FLIGHT · RAIL · TRANSIT · DRONE) for any place
 *   — all countries, islands, everywhere. Choosing a mode sets
 *   the on-screen TRAVEL CONTEXT (from = the location context,
 *   to = an owner-picked destination); the guide's line names
 *   the mode (presentation only). Routing is NOT_CONNECTED —
 *   no route line is ever drawn without a routing source.
 * - GEOGRAPHIC ALERT AREAS: a verified-and-active alert
 *   (GlobeIntelligence.isVerifiedActiveAlert) recorded WITH an
 *   area glows red at its REAL coordinates on the map, in
 *   every lens. Area-less alerts keep the v78 global Alert
 *   Mode exactly; DETECTED/VERIFYING alerts never glow.
 * - SKY joins the Area Selector as a labelled NOT_CONNECTED
 *   seat — nothing above the atmosphere is drawn or implied.
 * The module also publishes the session's last location
 * context + travel context as MTI6GlobeContext, the small
 * getter the Security intake's "Use current Globe context"
 * button reads. Observations stay in session state; nothing
 * here writes canonical storage.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  var MODE_KEY = "mti6_globe_mode_v1";
  var MODES = [
    { id: "WORLD", label: "World", note: "Whole-world overview. Weather and headlines below are live public data; there is no live map feed connected." },
    { id: "ELECTRIC", label: "Electric", note: "Electric view. Map boundaries use electric blue/cyan. The map is vendored public-domain data drawn locally; no live map or route data is connected — styling only." },
    { id: "TERRAIN", label: "Terrain", note: "Terrain view. No terrain data is connected — nothing is rendered as terrain." },
    { id: "BOUNDARIES", label: "Boundaries", note: "Boundaries view. Outlines are vendored public-domain Natural Earth data drawn locally — not a live boundary feed." },
    { id: "INTELLIGENCE", label: "Intelligence", note: "Intelligence layer. No live intelligence feeds are connected — the headlines below are the only live layer." }
  ];

  // Intelligence layer selector (same five layers as GlobeIntelligence).
  var LAYER_BUTTONS = [
    { id: "WORLD", label: "World" },
    { id: "CRYPTO", label: "Crypto" },
    { id: "OPPORTUNITIES", label: "Opportunities" },
    { id: "BOT_ACTIVITY", label: "Bot Activity" },
    { id: "SECURITY_ALERTS", label: "Security Alerts" },
    // Capability Router addition (v92): earthquakes are genuine
    // geographic observations with real coordinates, so they get
    // their own layer — but the layer is module-local (NOT part of
    // GlobeIntelligence, whose five layers stay canonical) and it
    // starts honestly NO_DATA: items exist only after the owner
    // taps "Load earthquakes" in the Live World panel. Markers are
    // DOM markers at the events' real projected coordinates, never
    // the layout positions the record layers use.
    { id: "EARTHQUAKES", label: "Earthquakes" },
    // Transitland v1 (v118, owner ruling D4): transit stops are
    // genuine geographic observations with real coordinates, so
    // they get their own layer — the same module-local pattern as
    // EARTHQUAKES (NOT part of GlobeIntelligence, whose five
    // layers stay canonical), starting honestly NO_DATA: stops
    // exist only after the owner taps "Load transit near here"
    // in the Live World panel. Markers are DOM markers at the
    // stops' real projected coordinates, never the layout
    // positions the record layers use. Tap-to-load only; no
    // background polling, no SEARCH THIS AREA card, no fares.
    { id: "TRANSIT", label: "Transit" }
  ];

  // Media Selector categories (Live World directive §9). Every
  // category is a view over connected providers' results; no
  // provider is connected yet, so every category renders its
  // honest NOT_CONNECTED state and zero results — counts are
  // never hard-coded and results are never invented.
  var MEDIA_CATEGORIES = [
    "ALL", "LIVE CAMS", "TRAFFIC CAMS", "PUBLIC CAMS", "WEBCAMS",
    "LIVE VIDEO", "PHOTOS", "STREET IMAGERY", "TIMELAPSES",
    "SOCIAL / PUBLIC VIDEO", "BUSINESS / TOURISM", "OWNER CAMERAS"
  ];

  // US state capitals (Globe Explore Build). Keys are the
  // vendored state names EXACTLY as they appear in
  // js/data/world-map.js (50 states + District of Columbia +
  // Puerto Rico). This table names capitals only — coordinates
  // are NEVER stored here; a capital's position is resolved at
  // runtime from the vendored places (findVendoredCity below),
  // and a capital that is not a vendored place gets no zoom
  // button. The vendored places are world capitals and major
  // metros, so most state capitals honestly do not resolve.
  var STATE_CAPITALS = {
    "Alabama": "Montgomery", "Alaska": "Juneau", "Arizona": "Phoenix",
    "Arkansas": "Little Rock", "California": "Sacramento", "Colorado": "Denver",
    "Connecticut": "Hartford", "Delaware": "Dover",
    "District of Columbia": "Washington", "Florida": "Tallahassee",
    "Georgia": "Atlanta", "Hawaii": "Honolulu", "Idaho": "Boise",
    "Illinois": "Springfield", "Indiana": "Indianapolis", "Iowa": "Des Moines",
    "Kansas": "Topeka", "Kentucky": "Frankfort", "Louisiana": "Baton Rouge",
    "Maine": "Augusta", "Maryland": "Annapolis", "Massachusetts": "Boston",
    "Michigan": "Lansing", "Minnesota": "Saint Paul", "Mississippi": "Jackson",
    "Missouri": "Jefferson City", "Montana": "Helena", "Nebraska": "Lincoln",
    "Nevada": "Carson City", "New Hampshire": "Concord", "New Jersey": "Trenton",
    "New Mexico": "Santa Fe", "New York": "Albany", "North Carolina": "Raleigh",
    "North Dakota": "Bismarck", "Ohio": "Columbus", "Oklahoma": "Oklahoma City",
    "Oregon": "Salem", "Pennsylvania": "Harrisburg", "Puerto Rico": "San Juan",
    "Rhode Island": "Providence", "South Carolina": "Columbia",
    "South Dakota": "Pierre", "Tennessee": "Nashville", "Texas": "Austin",
    "Utah": "Salt Lake City", "Vermont": "Montpelier", "Virginia": "Richmond",
    "Washington": "Olympia", "West Virginia": "Charleston",
    "Wisconsin": "Madison", "Wyoming": "Cheyenne"
  };

  // Area Selector categories (Globe Explore Build). CITY and
  // TOWN are local lenses over the vendored places; the others
  // are provider categories. AREA_MEDIA_MAP names the Media
  // Selector category each media chip mirrors, so the chip
  // renders that category's exact row.
  var AREA_CATEGORIES = [
    "TRAFFIC", "BUSINESS", "CITY", "TOWN",
    "LIVE CAMS", "PICS", "STREET IMAGERY", "SOCIAL", "SKY"
  ];
  var AREA_MEDIA_MAP = {
    "LIVE CAMS": "LIVE CAMS", "PICS": "PHOTOS",
    "STREET IMAGERY": "STREET IMAGERY", "SOCIAL": "SOCIAL / PUBLIC VIDEO"
  };

  // Explore / zoom-to-capital land at LOCAL tier (engine tiers:
  // LOCAL starts at scale 20, max is 40).
  var EXPLORE_SCALE = 24;

  // World Lens selector (World OS §13): view state over the one
  // location context. LENS_LAYER names the existing layer a lens
  // emphasises; lenses without an entry change no layer. Badges
  // are derived at render from the same reads as everything else
  // on this screen — never hard-coded prose about the world.
  var LENSES = [
    { id: "REALITY", label: "Reality" },
    { id: "LIVE", label: "Live" },
    { id: "TRAFFIC", label: "Traffic" },
    { id: "TRANSIT", label: "Transit" },
    { id: "WEATHER", label: "Weather" },
    { id: "OPPORTUNITIES", label: "Opportunities" },
    { id: "SECURITY", label: "Security" },
    { id: "BOT_ACTIVITY", label: "Bot activity" },
    { id: "SOURCE_COVERAGE", label: "Source coverage" },
    { id: "SIMULATOR", label: "Simulator" }
  ];
  var LENS_LAYER = {
    REALITY: "WORLD", WEATHER: "WORLD",
    OPPORTUNITIES: "OPPORTUNITIES", SECURITY: "SECURITY_ALERTS",
    BOT_ACTIVITY: "BOT_ACTIVITY"
  };
  var activeLens = "REALITY";

  // Transportation Routes (owner direction: all transportation
  // routes, in all countries, islands, everywhere). The travel
  // context is session state: a mode, an origin (the current
  // location context) and an owner-picked destination. Routing
  // itself is NOT_CONNECTED — this state never draws a line.
  var ROUTE_MODES = ["DRIVING", "WALKING", "BOAT/FERRY", "FLIGHT", "RAIL", "TRANSIT", "DRONE"];
  var travelState = { mode: null, from: null, to: null, capturing: false };

  // The session's last location context, published for the
  // Security intake's "Use current Globe context" button (the
  // brief's small published getter). Snapshots only — label +
  // real pick coordinates; the full pick stays on the screen.
  var lastGlobeContext = null;
  global.MTI6GlobeContext = {
    getLocationContext: function () {
      return lastGlobeContext
        ? { label: lastGlobeContext.label, lat: lastGlobeContext.lat, lon: lastGlobeContext.lon }
        : null;
    },
    getTravelContext: function () {
      function snap(p) { return p ? { label: p.label, lat: p.lat, lon: p.lon } : null; }
      return {
        mode: travelState.mode,
        from: snap(travelState.from),
        to: snap(travelState.to),
        routing: "NOT_CONNECTED"
      };
    }
  };

  // Coverage kinds with no connected source today (World OS
  // §§1/9). On land all of them are gaps; over open ocean only
  // the marine-appropriate kinds are listed (architecture §3.2:
  // an ocean point generates no traffic/transit/camera gaps).
  var GAP_KINDS_LAND = [
    "LIVE CAMERAS", "REFRESHED CAMERAS", "STREET IMAGERY", "PUBLIC PHOTOS",
    "LIVESTREAMS", "TRAFFIC", "TRANSIT", "ENVIRONMENTAL SENSORS",
    "SATELLITE / REMOTE OBSERVATIONS", "EVENTS", "GOVERNMENT DATA",
    "DEVICE SENSORS", "OWNER CAMERAS"
  ];
  var GAP_KINDS_OCEAN = ["ENVIRONMENTAL SENSORS", "SATELLITE / REMOTE OBSERVATIONS", "GOVERNMENT DATA"];
  var STREET_LEVEL_KINDS = ["STREET IMAGERY", "REFRESHED CAMERAS", "PUBLIC PHOTOS"];

  // One document-level fullscreenchange listener for the whole module
  // (render() can run more than once; never attach it twice).
  var fsListenerAdded = false;

  // The current render's top-roll ResizeObserver (overlay anchoring,
  // below). render() is this module's whole lifecycle — a new render
  // replaces the screen — so the previous render's observer is
  // disconnected when the next render wires its own.
  var rollHeightObserver = null;

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
  // live map feed is connected. Globe Map Build 2: a local engine
  // draws a flat world map from vendored public-domain Natural
  // Earth outlines and city points — they sit at their real
  // positions; country, state and city names are hidden for now
  // by owner direction (2026-11-16; LABELS_ENABLED in
  // js/globe-engine.js). The glowing markers are this cockpit's
  // recorded layers and their positions are presentation layout,
  // not locations (no layer item carries geography). Live World
  // Build 1: pan and zoom are real view controls on this same
  // local data, and weather appears only via SEARCH THIS AREA.
  var ZOOM_TRUTH = " Drag, scroll or use + / − to pan and zoom: the zoom is a real view zoom on this same local data — the outlines are coarse (110m), so zooming shows them larger, not satellite imagery and not street-level detail. Weather appears only when you search an area, live from the provider that answers (National Weather Service for US points, Open-Meteo worldwide) with its source shown.";
  function truthLabelForMode(mode) {
    if (mode === "TERRAIN") return "2D visual shell — not a 3D terrain engine. No terrain data is connected. A local engine draws a flat world map from public-domain Natural Earth outlines and city points; country, state and city names are hidden for now by owner direction; marker positions are layout, not locations." + ZOOM_TRUTH;
    return "No live map feed is connected — a local engine draws this flat world map from public-domain Natural Earth outlines and city points. Country, state and city names are hidden for now by owner direction. The glowing markers are this cockpit's recorded layers; marker positions are layout, not locations." + ZOOM_TRUTH;
  }

  // Alert Mode truth sentence, appended to the truth label only
  // while the alarm holds: the red presentation reflects RECORDED
  // alerts (AngelSecurity holds no live detectors and none is
  // claimed), and alert records carry no geography.
  var ALERT_TRUTH_SUFFIX = " Alert mode is on — this red presentation reflects security alerts recorded as confirmed/active; alert records carry no geography, so no marker shows where an alert is, and no live detection feed is connected.";

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

    // ---- Screen header (Stage 1 primitives) -------------------------
    var headerStatus = U.el("div", { class: "mti6-screen-header__status" }, []);
    root.appendChild(U.el("header", { class: "mti6-screen-header" }, [
      U.el("span", { class: "mti6-screen-header__icon", "aria-hidden": "true" }, "🌍"),
      U.el("h2", { class: "mti6-screen-header__title" }, "World Globe"),
      U.el("p", { class: "mti6-screen-header__desc" }, "Home of MTI6 — the whole-platform World Engine"),
      headerStatus
    ]));

    // Item 9 (capstone): layers derived from the World Engine graph
    // are preferred. The graph collection is async (the Crypto World
    // store lives in IndexedDB), so the screen paints immediately
    // from the synchronous per-registry layers and swaps in the
    // graph-derived layers when collection completes — same states,
    // same counts, one canonical source. If the graph path fails,
    // the synchronous layers simply stay.
    var liveLayers = null;
    // Module-local EARTHQUAKES layer (see the LAYER_BUTTONS note):
    // observations from WorldData.earthquakes, kept apart from
    // GlobeIntelligence's canonical five layers.
    var quakeLayer = { id: "EARTHQUAKES", label: "Earthquakes", state: "NO_DATA", items: [], count: 0, enabled: true,
      note: "No earthquakes loaded yet — tap “Load earthquakes” in the Live World panel. Positions will be the events' real coordinates." };
    var quakePoints = []; // [{lat, lon, label}] real coordinates for the DOM markers
    // Module-local TRANSIT layer (v118, owner ruling D4 — same
    // pattern as EARTHQUAKES above): stops from
    // WorldData.transitStops, kept apart from
    // GlobeIntelligence's canonical five layers.
    var transitLayer = { id: "TRANSIT", label: "Transit", state: "NO_DATA", items: [], count: 0, enabled: true,
      note: "No transit stops loaded yet — tap “Load transit near here” in the Live World panel. Markers sit at the stops' real coordinates." };
    var transitPoints = []; // [{lat, lon, label, onestopId, name}] real coordinates for the DOM markers

    function getLayerSafe(id) {
      if (id === "EARTHQUAKES") return quakeLayer;
      if (id === "TRANSIT") return transitLayer;
      if (liveLayers) {
        for (var i = 0; i < liveLayers.length; i++) {
          if (liveLayers[i] && liveLayers[i].id === id) return liveLayers[i];
        }
      }
      var GI = global.GlobeIntelligence;
      if (!GI || typeof GI.getLayer !== "function") return null;
      try { return GI.getLayer(id); } catch (e) { return null; }
    }

    function listLayersSafe() {
      if (liveLayers && liveLayers.length) return liveLayers;
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
    var truthLabel = U.el("div", { class: "api-meta globe-roll__truth" }, truthLabelForMode(mode));
    var visual = U.el("div", { class: "globe-visual globe-mode-" + mode.toLowerCase(), id: "globe-visual" }, [
      truthLabel
    ]);
    stage.appendChild(visual);

    // Alert Mode banner: carries no text and stays hidden unless
    // the genuine alarm condition holds (refreshAlertMode below).
    var alertBanner = U.el("div", { class: "globe-alert-banner", role: "alert" }, "");
    visual.appendChild(alertBanner);
    var alertState = { on: false, count: 0 };

    // Globe Engine: a canvas flat world map inside the visual area
    // (absolutely positioned by CSS; the truth label stays above
    // it). The engine is presentation only — if it or a
    // 2D context is unavailable, the canvas is removed again and the
    // screen is exactly its pre-engine self. The plotted data is
    // handed in by plotGlobe() from this screen's own layer reads.
    var globeEngine = null;
    try {
      if (global.GlobeEngine && typeof global.GlobeEngine.create === "function") {
        var globeCanvas = U.el("canvas", { class: "globe-canvas", "aria-hidden": "true" }, []);
        visual.appendChild(globeCanvas);
        globeEngine = global.GlobeEngine.create(globeCanvas);
        if (!globeEngine) {
          try { visual.removeChild(globeCanvas); } catch (e) {}
        }
      }
    } catch (e) { globeEngine = null; }

    // Geographic alert areas (World Lens package): DOM glow
    // markers inside the visual, one per VERIFIED-ACTIVE alert
    // that carries an area, positioned through the engine's real
    // project() transform at the alert's recorded coordinates.
    // The derivation reads AngelSecurity records directly and
    // qualifies them ONLY through GlobeIntelligence's one
    // isVerifiedActiveAlert — DETECTED/VERIFYING never glow,
    // area-less alerts never gain a point (they keep the global
    // Alert Mode below). Pulse is transform/opacity only.
    var glowLayer = U.el("div", { class: "globe-glow-layer", "aria-hidden": "true" }, []);
    visual.appendChild(glowLayer);
    var glowPoints = [];

    // Earthquake markers (v92): DOM markers at the observations'
    // REAL coordinates, projected exactly like the alert glows.
    // Visible only while the EARTHQUAKES layer is selected and
    // points were actually loaded through the router.
    var quakeLayerEl = U.el("div", { class: "globe-quake-layer", "aria-hidden": "true" }, []);
    visual.appendChild(quakeLayerEl);

    function refreshQuakeMarkers() {
      quakeLayerEl.innerHTML = "";
      if (selectedLayer !== "EARTHQUAKES") return;
      quakePoints.forEach(function (p) {
        quakeLayerEl.appendChild(U.el("span", { class: "globe-quake-marker", title: p.label }, ""));
      });
      positionQuakeMarkers();
    }

    function positionQuakeMarkers() {
      if (!globeEngine || typeof globeEngine.project !== "function") return;
      var wpx = 0, hpx = 0;
      try {
        if (globeCanvas) { wpx = globeCanvas.clientWidth || 0; hpx = globeCanvas.clientHeight || 0; }
      } catch (e) {}
      quakeLayerEl.querySelectorAll(".globe-quake-marker").forEach(function (m, i) {
        var p = quakePoints[i];
        if (!p || selectedLayer !== "EARTHQUAKES") { m.style.display = "none"; return; }
        var px = null;
        try { px = globeEngine.project(p.lon, p.lat); } catch (e) {}
        if (!px || px.x < 0 || px.y < 0 || px.x > wpx || px.y > hpx) { m.style.display = "none"; return; }
        m.style.display = "";
        m.style.left = px.x + "px";
        m.style.top = px.y + "px";
      });
    }

    // Transit stop markers (v118, D4): DOM markers at the stops'
    // REAL coordinates, projected exactly like the earthquake
    // markers and the alert glows. Visible only while the TRANSIT
    // layer is selected and stops were actually loaded through
    // the router. Each marker is a button: tapping it loads that
    // stop's departures (TODAY + TOMORROW) in the panel below.
    // The stop list in the Live World panel offers the same
    // action without a map tap.
    var transitLayerEl = U.el("div", { class: "globe-transit-layer", "aria-hidden": "true" }, []);
    visual.appendChild(transitLayerEl);

    function refreshTransitMarkers() {
      transitLayerEl.innerHTML = "";
      if (selectedLayer !== "TRANSIT") return;
      transitPoints.forEach(function (p) {
        var m = U.el("button", { class: "globe-transit-marker", type: "button", title: p.label }, "");
        m.addEventListener("click", function (e) {
          try { if (e && typeof e.stopPropagation === "function") e.stopPropagation(); } catch (err) {}
          loadDeparturesForStop(p.onestopId, p.name);
        });
        transitLayerEl.appendChild(m);
      });
      positionTransitMarkers();
    }

    function positionTransitMarkers() {
      if (!globeEngine || typeof globeEngine.project !== "function") return;
      var wpx = 0, hpx = 0;
      try {
        if (globeCanvas) { wpx = globeCanvas.clientWidth || 0; hpx = globeCanvas.clientHeight || 0; }
      } catch (e) {}
      transitLayerEl.querySelectorAll(".globe-transit-marker").forEach(function (m, i) {
        var p = transitPoints[i];
        if (!p || selectedLayer !== "TRANSIT") { m.style.display = "none"; return; }
        var px = null;
        try { px = globeEngine.project(p.lon, p.lat); } catch (e) {}
        if (!px || px.x < 0 || px.y < 0 || px.x > wpx || px.y > hpx) { m.style.display = "none"; return; }
        m.style.display = "";
        m.style.left = px.x + "px";
        m.style.top = px.y + "px";
      });
    }

    function alertAreaPoints() {
      var AS = global.AngelSecurity, GI = global.GlobeIntelligence;
      if (!AS || !GI || typeof AS.listAlerts !== "function" ||
          typeof GI.isVerifiedActiveAlert !== "function") return [];
      try {
        return (AS.listAlerts() || []).filter(function (a) {
          return a && a.area && isFinite(a.area.lat) && isFinite(a.area.lon) &&
            GI.isVerifiedActiveAlert(a);
        }).map(function (a) {
          return {
            id: a.id,
            label: (a.area.label || a.title || "Verified active alert"),
            lat: +a.area.lat, lon: +a.area.lon
          };
        });
      } catch (e) { return []; }
    }

    function positionAlertGlows() {
      if (!globeEngine || typeof globeEngine.project !== "function") return;
      var wpx = 0, hpx = 0;
      try {
        if (globeCanvas) { wpx = globeCanvas.clientWidth || 0; hpx = globeCanvas.clientHeight || 0; }
      } catch (e) {}
      glowLayer.querySelectorAll(".globe-alert-glow").forEach(function (m, i) {
        var p = glowPoints[i];
        if (!p) { m.style.display = "none"; return; }
        var px = null;
        try { px = globeEngine.project(p.lon, p.lat); } catch (e) {}
        if (!px || (wpx && (px.x < 0 || px.y < 0 || px.x > wpx || px.y > hpx))) {
          m.style.display = "none";
          return;
        }
        m.style.display = "";
        m.style.left = px.x + "px";
        m.style.top = px.y + "px";
      });
    }

    function refreshAlertAreas() {
      glowPoints = alertAreaPoints();
      glowLayer.innerHTML = "";
      glowPoints.forEach(function (p) {
        var m = U.el("div", { class: "globe-alert-glow" }, []);
        m.setAttribute("data-alert-id", String(p.id));
        m.setAttribute("data-lat", String(p.lat));
        m.setAttribute("data-lon", String(p.lon));
        m.setAttribute("title", p.label);
        glowLayer.appendChild(m);
      });
      positionAlertGlows();
    }

    // Hand the engine the screen's current layer + mode. Called on
    // every layer/mode refresh (including both async layer swaps),
    // so the plotted markers always match the badges and the panel.
    function plotGlobe() {
      if (!globeEngine) return;
      // EARTHQUAKES and TRANSIT never go to the canvas engine:
      // their items are real-coordinate observations drawn as DOM
      // markers, and the engine would plot them at layout
      // positions — wrong geography.
      try { globeEngine.setData((selectedLayer === "EARTHQUAKES" || selectedLayer === "TRANSIT") ? null : getLayerSafe(selectedLayer), mode); } catch (e) {}
    }

    // The alarm condition, read ONLY from GlobeIntelligence's own
    // derivation: layerHasAlarm("SECURITY_ALERTS") is the single
    // source the shell bubble rail's red state also comes from,
    // and the count is the number of items that same layer
    // derivation flagged alarm. This screen never inspects alert
    // lifecycle states itself — which states count as an alarm is
    // GlobeIntelligence's decision, made once, there.
    function currentAlertMode() {
      var GI = global.GlobeIntelligence;
      if (!GI || typeof GI.layerHasAlarm !== "function") return { on: false, count: 0 };
      try {
        if (!GI.layerHasAlarm("SECURITY_ALERTS")) return { on: false, count: 0 };
        var count = 0;
        var layer = typeof GI.getLayer === "function" ? GI.getLayer("SECURITY_ALERTS") : null;
        if (layer && Array.isArray(layer.items)) {
          layer.items.forEach(function (it) { if (it && it.alarm === true) count++; });
        }
        return { on: true, count: count };
      } catch (e) { return { on: false, count: 0 }; }
    }

    function applyTruthLabel() {
      truthLabel.textContent = truthLabelForMode(mode) + (alertState.on ? ALERT_TRUTH_SUFFIX : "");
    }

    // Push the current alarm state to the banner, the truth
    // label, the visual frame and the engine's palette. Called at
    // the end of every existing refresh (mode, layer, graph
    // swap), so the map's alarm presentation can never disagree
    // with the layer badges the same refresh just painted.
    function refreshAlertMode() {
      alertState = currentAlertMode();
      if (alertState.on) {
        alertBanner.textContent = "⚠ ALERT MODE — " + alertState.count +
          " confirmed/active security alert(s) recorded";
        alertBanner.classList.add("globe-alert-banner--on");
        visual.classList.add("globe-visual--alert");
      } else {
        alertBanner.textContent = "";
        alertBanner.classList.remove("globe-alert-banner--on");
        visual.classList.remove("globe-visual--alert");
      }
      applyTruthLabel();
      if (globeEngine && typeof globeEngine.setAlertMode === "function") {
        try { globeEngine.setAlertMode(alertState.on); } catch (e) {}
      }
      // Area glows ride the same refresh: the set of glowing
      // points is re-derived from the alert records every time
      // the alarm presentation is, so the two can never disagree.
      refreshAlertAreas();
    }

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
    // (Full-Screen World Shell: the wrapper rows are no longer
    // appended to the stage — their children move into the two
    // overlay rolls assembled after the Live World panel below.)
    var modeNoteEl = U.el("div", { class: "api-meta globe-mode-note" }, modeNote(mode));
    var modeTabs = U.el("div", { class: "mti6-tabs", role: "group", "aria-label": "World Globe visual mode" }, []);
    var modeControls = U.el("div", { class: "globe-controls" }, [modeTabs, modeNoteEl]);

    // ---- Controls row 2: layer tabs, each with its real-state badge -
    var layerTabs = U.el("div", { class: "mti6-tabs", role: "group", "aria-label": "World Globe intelligence layer" }, []);
    var layerControls = U.el("div", { class: "globe-controls globe-controls--layers" }, [
      U.el("h3", { class: "globe-controls__heading" }, "Intelligence layers"), layerTabs
    ]);

    // ---- Controls row 3: zoom, reset, layer toggles, Details, full screen
    var zoomReadout = U.el("span", { class: "api-meta" }, "");
    var zoomOutBtn = U.el("button", { class: "btn", type: "button", "aria-label": "Zoom out" }, "−");
    var zoomInBtn = U.el("button", { class: "btn", type: "button", "aria-label": "Zoom in" }, "+");
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
    // Live World mode toggle (directive §§14–15): Explore is the
    // active mode; Me Mode stays LOCATION OFF in this build (its
    // handlers are wired with the Live World panel below).
    var exploreBtn = U.el("button", { class: "btn", type: "button", "aria-pressed": "true" }, "Explore");
    var meBtn = U.el("button", { class: "btn", type: "button", "aria-pressed": "false" }, "Me · LOCATION OFF");
    actionControls.appendChild(exploreBtn);
    actionControls.appendChild(meBtn);

    root.appendChild(stage);

    // ---- Live World panel (Build 1) ----------------------------------
    // Location context + SEARCH THIS AREA + Media Selector, sitting
    // under the stage like the Weather / Headlines panels. Everything
    // here reads real state only: the context comes from the owner's
    // own tap on the map, weather comes live from Open-Meteo, the
    // recorded-layers line is derived from the same layer reads the
    // tabs use, and the media categories show their genuine
    // NOT_CONNECTED state (no provider connected yet).
    var liveState = { context: null, searching: false };
    var liveContextBody = U.el("div", { class: "globe-live-context__body" },
      "No area selected yet — tap or click the map to set a location context.");
    var liveResults = U.el("div", { class: "globe-live-results" }, []);
    var liveNote = U.el("div", { class: "api-meta globe-live-note" },
      "Explore mode: you are looking at a place on the map — MTI6 does not take you to be there. Pan, zoom and tap to explore it.");
    var searchAreaBtn = U.el("button", { class: "btn btn-primary", type: "button" }, "Search this area");
    var findMoreBtn = U.el("button", { class: "btn", type: "button" }, "Find more");

    function fmtCoord(v, pos, neg) {
      return Math.abs(v).toFixed(2) + "° " + (v >= 0 ? pos : neg);
    }

    function renderContext() {
      liveContextBody.innerHTML = "";
      var c = liveState.context;
      if (exploreAreaBtn) exploreAreaBtn.disabled = !c;
      if (transitBtn) transitBtn.disabled = !c; // transit loads need a location context too (v118, D4)
      if (!c) {
        liveContextBody.textContent = "No area selected yet — tap or click the map to set a location context.";
        updateSelectorVisibility();
        renderCoverage();
        refreshLensUI();
        return;
      }
      // Exact place (Globe Explore Build): city, STATE, country —
      // the state comes from the engine's stateAt over the
      // vendored state rings (the city's own point first, the
      // tap point as fallback) and is shown only when resolved.
      var stateName = c.city ? (c.city.state || c.state || null) : (c.state || null);
      var title;
      if (c.city) {
        var parts = [c.city.name];
        if (stateName) parts.push(stateName);
        if (c.city.country) parts.push(c.city.country);
        title = parts.join(", ");
      } else if (c.country) {
        title = (stateName ? stateName + ", " : "") + c.country + " — unnamed area";
      } else {
        title = "Open ocean — unnamed area";
      }
      liveContextBody.appendChild(U.el("div", { class: "globe-live-context__title" }, title));
      liveContextBody.appendChild(U.el("div", { class: "api-meta" },
        "Latitude " + fmtCoord(c.lat, "N", "S") + " · Longitude " + fmtCoord(c.lon, "E", "W") +
        " · Zoom tier: " + c.tier));
      if (!c.city) {
        liveContextBody.appendChild(U.el("div", { class: "api-meta" },
          c.land
            ? "Land area — no named place in the local map data at this point; the country above comes from the coarse outlines, not from a place lookup."
            : "Open ocean — no land outline in the local map data contains this point."));
      }
      // Capital of the state: named from the capitals table;
      // the Zoom button exists only when the capital resolves
      // to a vendored place — otherwise the line says why not
      // and no position is invented.
      var actionRow = U.el("div", { class: "globe-controls globe-live-actions" }, []);
      if (stateName && STATE_CAPITALS[stateName]) {
        var cap = capitalForState(stateName);
        var capLine = U.el("div", { class: "api-meta globe-live-capital" }, "Capital: " + cap.name);
        if (cap.city) {
          var capBtn = U.el("button", { class: "btn", type: "button" }, "Zoom to capital");
          capBtn.addEventListener("click", function () { zoomToCapital(stateName); });
          actionRow.appendChild(capBtn);
        } else {
          capLine.textContent = "Capital: " + cap.name +
            " — not one of the local places, so no zoom target is offered; its position is not invented.";
        }
        liveContextBody.appendChild(capLine);
      }
      var exploreCtxBtn = U.el("button", { class: "btn btn-primary", type: "button" }, "Explore this area");
      exploreCtxBtn.addEventListener("click", function () { enterExplore(); });
      actionRow.appendChild(exploreCtxBtn);
      liveContextBody.appendChild(actionRow);
      liveContextBody.appendChild(U.el("div", { class: "api-meta" },
        "Local map data (Natural Earth, public domain) — outlines are coarse (110m); no street-level detail."));
      updateSelectorVisibility();
      renderCoverage();
      refreshLensUI();
    }

    // A short place label for a pick: the vendored city + its
    // state when the tap named one, the state/country otherwise,
    // honest coordinates over open ocean. Used for the travel
    // context's from/to and the published Globe context — always
    // from the pick itself, never from a marker.
    function placeLabel(pick) {
      if (!pick) return null;
      if (pick.city) {
        var st = pick.city.state || pick.state || null;
        return pick.city.name + (st ? ", " + st : "");
      }
      if (pick.country) return (pick.state ? pick.state + ", " : "") + pick.country;
      return "Open ocean — " + fmtCoord(pick.lat, "N", "S") + ", " + fmtCoord(pick.lon, "E", "W");
    }

    function setContextFromPick(pick) {
      if (!pick) return;
      liveState.context = pick;
      // The travel context's origin IS the current location
      // context, and the published snapshot follows the pick.
      var label = placeLabel(pick);
      lastGlobeContext = { label: label, lat: pick.lat, lon: pick.lon };
      travelState.from = { label: label, lat: pick.lon, lon: pick.lat };
      refreshRoutesUI();
      liveResults.innerHTML = "";
      renderContext();
      liveNote.textContent = "Location context set. Tap SEARCH THIS AREA to ask what is genuinely available for this area.";
    }

    // The recorded-layers line: counts derived live from the same
    // layer reads as the tabs/badges — never hard-coded — with the
    // standing truth that these layers carry no geography.
    function layerCountsLine() {
      var parts = [];
      LAYER_BUTTONS.forEach(function (l) {
        var layer = getLayerSafe(l.id);
        var count = layer && layer.items ? layer.items.length : 0;
        var state = layer ? layer.state : "NOT_LOADED";
        parts.push(l.label + " " + count + " (" + state + ")");
      });
      return parts.join(" · ");
    }

    function resultCard(title, stateLabel, bodyLines, sourceLine) {
      var card = U.el("div", { class: "globe-live-card" }, []);
      var head = [U.el("span", { class: "globe-live-card__title" }, title)];
      if (stateLabel) {
        head.push(U.el("span", { class: badgeClassForState(stateLabel) }, stateLabel));
      }
      card.appendChild(U.el("div", { class: "globe-live-card__head" }, head));
      bodyLines.forEach(function (line) {
        card.appendChild(U.el("div", { class: "api-meta" }, line));
      });
      if (sourceLine) {
        card.appendChild(U.el("div", { class: "globe-live-source" }, sourceLine));
      }
      return card;
    }

    // Capability Router result cards (v92, Free-First Fallback
    // Directive): the SOURCE line names the provider that ACTUALLY
    // answered; a fallback is shown when it happened; a cache answer
    // past its freshness is LAST_KNOWN, never relabelled current.
    function chainSummary(res) {
      if (!res || !res.failures || !res.failures.length) return "";
      return res.failures.map(function (f) { return f.provider + " (" + f.failureState + ")"; }).join(" → ");
    }
    function weatherCardFromResult(res, c) {
      if (res && res.observations && res.observations.length) {
        var o = res.observations[0], d = o.details || {};
        var lines = [];
        if (d.shortForecast) {
          lines.push("Now: " + o.value + o.unit + " — " + d.shortForecast + (d.windSpeed ? "; wind " + d.windSpeed + (d.windDirection ? " " + d.windDirection : "") : ""));
        } else {
          lines.push("Now: " + o.value + o.unit + (d.windSpeedKmh != null ? ", wind " + d.windSpeedKmh + " km/h, direction " + d.windDirectionDeg + "°" : ""));
        }
        lines.push("Observed: " + fmtTime(o.observedAt) + " (the source's observation time — a snapshot reading, not a live feed)");
        lines.push("Coordinates used: " + c.lat + ", " + c.lon);
        if (res.freshnessState === "LAST_KNOWN") {
          lines.push("The provider chain is OFFLINE for this area right now (" + chainSummary(res) + ") — this is the LAST KNOWN reading from " + res.provider + ", retrieved " + fmtTime(res.retrievedAt) + ", labelled as such and never as current.");
        } else if (res.fromCache) {
          lines.push("Served from the router's cache within its freshness window — original provider and times preserved, never relabelled.");
        }
        if (res.fallbackPosition > 0) {
          lines.push("Fallback: the primary source could not answer (" + chainSummary(res) + ") — this reading is " + res.provider + "'s, labelled as such.");
        }
        var badge = res.freshnessState === "LAST_KNOWN" ? "LAST_KNOWN" : (res.freshnessState === "STALE" ? "STALE" : "STATIC SNAPSHOT");
        return resultCard("Weather — current conditions", badge, lines, "SOURCE: " + res.provider);
      }
      return resultCard("Weather — current conditions", "OFFLINE", [
        "No weather provider could answer for this area right now. No weather is shown rather than invented — try again when the connection is back.",
        "Chain attempted: " + (chainSummary(res) || "no provider answered") + "."
      ], "SOURCE: none answered");
    }
    function alertsCardFromResult(res) {
      if (res && res.provider && res.observations) {
        if (!res.observations.length) {
          return resultCard("Weather alerts — this point", "NO_ALERTS", [
            "No active NWS alerts for this point — the National Weather Service answered and recorded none.",
            "That is the provider's answer for this point and moment, not a general claim of safety."
          ], "SOURCE: National Weather Service");
        }
        var lines = res.observations.slice(0, 6).map(function (o) {
          var d = o.details || {};
          return (o.value || "Alert") + " — " + (d.severity || "severity not stated") + " · expires " + fmtTime(d.expires);
        });
        if (res.observations.length > 6) lines.push("+ " + (res.observations.length - 6) + " more active alerts at this point.");
        lines.push("Headline: " + ((res.observations[0].details || {}).headline || "see the alert text from the source"));
        return resultCard("Weather alerts — this point", "ACTIVE ALERTS", lines, "SOURCE: National Weather Service");
      }
      return resultCard("Weather alerts — this point", "NO_DATA", [
        "Weather alerts could not be determined for this point: " + (chainSummary(res) || "no provider answered") + ".",
        "Silence is not claimed as calm — the alerts state here is unknown, not clear."
      ], null);
    }

    // SEARCH THIS AREA (directive §11): an explicit owner tap, and
    // only then are sources asked — panning/zooming/tapping the map
    // queries nothing. Weather now comes through the Capability
    // Router (Free-First Fallback Directive): WorldData.weather
    // runs NWS (US points) → Open-Meteo (worldwide) → cache, and
    // the card names the provider that ACTUALLY answered. For US
    // points the same tap also asks WorldData.alerts (NWS). The
    // recorded-layers line and the Media Selector state their own
    // truths beside it.
    searchAreaBtn.addEventListener("click", function () {
      var c = liveState.context;
      if (!c) {
        liveNote.textContent = "Tap or click the map to choose an area first — then SEARCH THIS AREA queries that area.";
        return;
      }
      if (liveState.searching) return;
      liveState.searching = true;
      liveResults.innerHTML = "";
      var weatherSlot = U.el("div", {}, "Asking the weather capability for the current conditions at the selected point…");
      liveResults.appendChild(weatherSlot);
      liveResults.appendChild(resultCard("MTI6 recorded layers", null, [
        layerCountsLine(),
        "These layers are global recorded state with no geography — they are not results for this area, and their positions on the map are layout, not locations."
      ], null));
      var PR = global.ProviderRouter;
      if (!PR || !PR.WorldData || typeof PR.WorldData.weather !== "function") {
        liveState.searching = false;
        weatherSlot.innerHTML = "";
        weatherSlot.appendChild(resultCard("Weather — current conditions", "NOT_CONNECTED", [
          "The Capability Router did not load (NOT_LOADED), so no provider was asked. No weather is shown rather than invented."
        ], null));
        return;
      }
      var isUS = c.country === "United States of America";
      var alertsSlot = null;
      if (isUS) {
        alertsSlot = U.el("div", {}, "Asking the National Weather Service for active alerts at this point…");
        liveResults.appendChild(alertsSlot);
      }
      PR.WorldData.weather(c.lat, c.lon, { forceFresh: true }).then(function (res) {
        liveState.searching = false;
        weatherSlot.innerHTML = "";
        weatherSlot.appendChild(weatherCardFromResult(res, c));
      }).catch(function () {
        liveState.searching = false;
        weatherSlot.innerHTML = "";
        weatherSlot.appendChild(resultCard("Weather — current conditions", "OFFLINE", [
          "The weather capability failed unexpectedly. No weather is shown rather than invented."
        ], null));
      });
      if (alertsSlot) {
        PR.WorldData.alerts(c.lat, c.lon, { forceFresh: true }).then(function (res) {
          alertsSlot.innerHTML = "";
          alertsSlot.appendChild(alertsCardFromResult(res));
        }).catch(function () {
          alertsSlot.innerHTML = "";
          alertsSlot.appendChild(alertsCardFromResult(null));
        });
      }
    });

    // FIND MORE (directive §12) in its honest gated state: the Web
    // Discovery workers do not exist yet, so the button explains
    // instead of fabricating research.
    findMoreBtn.addEventListener("click", function () {
      liveNote.textContent = "Discovery workers are not running yet — web research arrives with a later authorized phase. Nothing was searched and nothing was invented.";
    });

    // Explore / Me Mode (directive §§14–15). Explore is active. Me
    // Mode is NOT wired in this build: tapping it explains, keeps
    // LOCATION OFF, and never requests, reads or infers a device
    // location. Explore never implies the owner is at the place.
    exploreBtn.addEventListener("click", function () {
      exploreBtn.setAttribute("aria-pressed", "true");
      meBtn.setAttribute("aria-pressed", "false");
      liveNote.textContent = "Explore mode: you are looking at a place on the map — MTI6 does not take you to be there. Pan, zoom and tap to explore it.";
    });
    meBtn.addEventListener("click", function () {
      exploreBtn.setAttribute("aria-pressed", "true");
      meBtn.setAttribute("aria-pressed", "false");
      liveNote.textContent = "Me Mode is LOCATION OFF: it needs your explicit device-location permission, and it is not wired in this build — no location was requested, read or inferred. Explore mode never implies you are physically at the place on screen.";
    });

    var mediaList = U.el("div", { class: "globe-live-media-list" }, []);
    MEDIA_CATEGORIES.forEach(function (cat) {
      mediaList.appendChild(U.el("div", { class: "globe-live-media-row" }, [
        U.el("span", { class: "globe-live-media-row__name" }, cat),
        U.el("span", { class: badgeClassForState("NOT_CONNECTED") }, "NOT_CONNECTED"),
        U.el("span", { class: "api-meta" }, "no provider connected yet")
      ]));
    });

    // ---- Globe Explore Build: places, capitals, selector, walk ----
    // Everything below reads the vendored data and the engine's
    // real view only. Distances are computed from the real
    // coordinates; provider categories stay NOT_CONNECTED.

    // Resolve a place name to its vendored record. Exact match
    // first; vendored names sometimes carry a qualifier after a
    // comma ("Washington,  D.C."), so the head name matches too.
    function findVendoredCity(name) {
      var data = global.WorldMapData;
      if (!data || !Array.isArray(data.cities) || !name) return null;
      var i;
      for (i = 0; i < data.cities.length; i++) {
        if (data.cities[i].n === name) return data.cities[i];
      }
      var want = String(name).toLowerCase();
      for (i = 0; i < data.cities.length; i++) {
        var head = String(data.cities[i].n).split(",")[0].replace(/\s+/g, " ").trim().toLowerCase();
        if (head === want) return data.cities[i];
      }
      return null;
    }

    function capitalForState(stateName) {
      var name = STATE_CAPITALS[stateName] || null;
      return { name: name, city: name ? findVendoredCity(name) : null };
    }

    function distanceKm(lon1, lat1, lon2, lat2) {
      var R = 6371;
      var dLat = (lat2 - lat1) * Math.PI / 180;
      var dLon = (lon2 - lon1) * Math.PI / 180;
      var s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2);
      var a = s1 * s1 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * s2 * s2;
      return 2 * R * Math.asin(Math.sqrt(a));
    }

    // The vendored places nearest a point, nearest first, with
    // real computed distances. The data carries no size field —
    // this list is the whole CITY/TOWN lens (see areaResultNode).
    function nearestPlaces(lon, lat, limit) {
      var data = global.WorldMapData;
      if (!data || !Array.isArray(data.cities)) return [];
      var out = [];
      for (var i = 0; i < data.cities.length; i++) {
        var c = data.cities[i];
        out.push({ name: c.n, at: [c.at[0], c.at[1]], km: distanceKm(lon, lat, c.at[0], c.at[1]) });
      }
      out.sort(function (a, b) { return a.km - b.km; });
      return out.slice(0, limit || 8);
    }

    // A truthful one-line description of a point: the nearest
    // vendored place when close, the state/country from the
    // outlines, and an honest between-places / ocean reading
    // otherwise. Drives the STAR guide line and the selector's
    // area label — computed fresh after every step.
    function descriptorText(lon, lat) {
      var geo = null;
      try { if (globeEngine && typeof globeEngine.describeAt === "function") geo = globeEngine.describeAt(lon, lat); } catch (e) {}
      var near = nearestPlaces(lon, lat, 1);
      var n0 = near.length ? near[0] : null;
      var state = geo ? geo.state : null;
      var country = geo ? geo.country : null;
      var region = state && country ? state + ", " + country : (country || null);
      if (n0 && n0.km <= 30) {
        return n0.name + (region ? ", " + region : "");
      }
      if (country) {
        return "open country" + (region ? " in " + region : "") + " — between named places" +
          (n0 ? " (nearest: " + n0.name + ", " + Math.round(n0.km) + " km)" : "");
      }
      return "open ocean at " + fmtCoord(lat, "N", "S") + ", " + fmtCoord(lon, "E", "W") +
        (n0 ? " (nearest named place: " + n0.name + ", " + Math.round(n0.km) + " km)" : "");
    }

    // ---- Area Selector ---------------------------------------------
    var currentTier = "WORLD";
    var activeAreaCat = null;
    var chipRows = [];
    var selectorArea = U.el("div", { class: "api-meta globe-selector__area" }, "");
    var selectorResult = U.el("div", { class: "globe-selector__result" }, []);
    var exploreResult = U.el("div", { class: "globe-explore__result" }, []);

    function buildChipRow() {
      var row = U.el("div", { class: "globe-selector__chips", role: "group", "aria-label": "Area selector" }, []);
      AREA_CATEGORIES.forEach(function (cat) {
        var b = U.el("button", { class: "globe-chip", type: "button", "aria-pressed": "false" }, cat);
        b.setAttribute("data-area-cat", cat);
        b.addEventListener("click", function () { selectAreaCategory(cat); });
        row.appendChild(b);
      });
      chipRows.push(row);
      return row;
    }

    // The point the selector describes: the view centre while
    // exploring, the location context otherwise.
    function selectorAnchor() {
      if (walk.active && globeEngine) {
        try { var v = globeEngine.getView(); return { lon: v.lon, lat: v.lat }; } catch (e) {}
      }
      var c = liveState.context;
      if (!c) return null;
      if (c.city) return { lon: c.city.at[0], lat: c.city.at[1] };
      return { lon: c.lon, lat: c.lat };
    }

    function mediaRowFor(cat) {
      return U.el("div", { class: "globe-live-media-row" }, [
        U.el("span", { class: "globe-live-media-row__name" }, AREA_MEDIA_MAP[cat]),
        U.el("span", { class: badgeClassForState("NOT_CONNECTED") }, "NOT_CONNECTED"),
        U.el("span", { class: "api-meta" }, "no provider connected yet")
      ]);
    }

    // One result node per category, built fresh from real state
    // every time it renders (both hosts get their own node).
    function areaResultNode(cat) {
      var anchor = selectorAnchor();
      if (!anchor) {
        return U.el("div", { class: "api-meta" }, "Choose an area on the map first.");
      }
      if (cat === "CITY" || cat === "TOWN") {
        // Local lens over the vendored places. The data has no
        // population/size field, so CITY and TOWN cannot be
        // honestly split — both show this same list and say so.
        var card = U.el("div", { class: "globe-live-card" }, []);
        card.appendChild(U.el("div", { class: "globe-live-card__head" }, [
          U.el("span", { class: "globe-live-card__title" }, "Places near here")
        ]));
        card.appendChild(U.el("div", { class: "api-meta" },
          "Nearest places in the local map data — distances computed from the real coordinates."));
        var list = U.el("ul", { class: "price-offer-list" });
        nearestPlaces(anchor.lon, anchor.lat, 8).forEach(function (p) {
          var suffix = "";
          try {
            if (globeEngine && typeof globeEngine.describeAt === "function") {
              var g = globeEngine.describeAt(p.at[0], p.at[1]);
              var reg = g.state && g.country ? g.state + ", " + g.country : g.country;
              if (reg) suffix = " · " + reg;
            }
          } catch (e) {}
          list.appendChild(U.el("li", {}, p.name + " — " + Math.round(p.km) + " km" + suffix));
        });
        card.appendChild(list);
        card.appendChild(U.el("div", { class: "api-meta" },
          "The local places data does not rank places by size, so CITY and TOWN show this same nearest-places list — no size distinction is invented."));
        return card;
      }
      if (cat === "TRAFFIC" || cat === "BUSINESS") {
        return resultCard(cat.charAt(0) + cat.slice(1).toLowerCase() + " — this area", "NOT_CONNECTED", [
          "No " + cat.toLowerCase() + " provider is connected yet — no results exist for this area and none are invented, and result counts are never hard-coded."
        ], null);
      }
      if (cat === "SKY") {
        // The labelled sky seat (architecture §7.5): no sky or
        // airspace source is connected, so the seat shows its
        // state and nothing above the atmosphere is drawn,
        // tinted or implied.
        return resultCard("Sky — this area", "NOT_CONNECTED", [
          "Sky / airspace sources — NOT_CONNECTED; no provider connected yet.",
          "Satellite and airspace sources are source-catalog candidates, not connected feeds — a satellite observation carries an acquisition time and is never a live feed."
        ], null);
      }
      if (AREA_MEDIA_MAP[cat]) {
        var wrap = U.el("div", {}, []);
        wrap.appendChild(U.el("div", { class: "api-meta" },
          "Same honest state as the Media selector — for this area too:"));
        wrap.appendChild(mediaRowFor(cat));
        return wrap;
      }
      return U.el("div", { class: "api-meta" }, "");
    }

    function renderAreaResults() {
      if (!activeAreaCat) return;
      selectorResult.innerHTML = "";
      selectorResult.appendChild(areaResultNode(activeAreaCat));
      exploreResult.innerHTML = "";
      exploreResult.appendChild(areaResultNode(activeAreaCat));
    }

    function selectAreaCategory(cat) {
      activeAreaCat = cat;
      chipRows.forEach(function (row) {
        row.querySelectorAll(".globe-chip").forEach(function (b) {
          var on = b.getAttribute("data-area-cat") === cat;
          if (on) b.classList.add("globe-chip--active"); else b.classList.remove("globe-chip--active");
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
      });
      renderAreaResults();
    }

    // Exiting Explore clears the selection entering it set
    // (enterExplore selects CITY): no chip stays lit and no
    // result card lingers under an unselected selector.
    function clearAreaCategory() {
      activeAreaCat = null;
      chipRows.forEach(function (row) {
        row.querySelectorAll(".globe-chip").forEach(function (b) {
          b.classList.remove("globe-chip--active");
          b.setAttribute("aria-pressed", "false");
        });
      });
      selectorResult.innerHTML = "";
      exploreResult.innerHTML = "";
    }

    function refreshSelectorArea() {
      var a = selectorAnchor();
      selectorArea.textContent = a ? "Area: " + descriptorText(a.lon, a.lat) : "";
    }

    // The selector presents when a context exists AND the view
    // is at COUNTRY tier or deeper — or whenever Explore is
    // open (the owner's "selectors pop up" while exploring).
    function updateSelectorVisibility() {
      var show = !!liveState.context &&
        (walk.active || currentTier === "COUNTRY" || currentTier === "LOCAL");
      if (show) selectorSection.classList.remove("globe-selector--hidden");
      else selectorSection.classList.add("globe-selector--hidden");
      if (show) refreshSelectorArea();
    }

    var selectorSection = U.el("div", { class: "globe-selector globe-selector--hidden" }, [
      U.el("h4", { class: "globe-live-media__heading" }, "Area selector"),
      selectorArea,
      buildChipRow(),
      selectorResult
    ]);

    // ---- Explore: walk the place with STAR --------------------------
    var walk = { active: false, anchor: null };
    var exploreAreaBtn = U.el("button", { class: "btn btn-primary", type: "button" }, "Explore this area");
    exploreAreaBtn.disabled = true;
    exploreAreaBtn.addEventListener("click", function () { enterExplore(); });

    function starFaceSrc() {
      var exprs = global.STAR_AVATAR_EXPRESSIONS;
      var s = exprs && typeof exprs.smile === "string" && exprs.smile ? exprs.smile : null;
      if (!s) {
        var idle = global.STAR_AVATAR_SRC;
        s = typeof idle === "string" && idle ? idle : null;
      }
      return s;
    }

    var guideLine = U.el("div", { class: "globe-explore__speech" }, "");
    var guideFigure = U.el("div", { class: "globe-explore__figure" }, []);
    var faceSrc = starFaceSrc();
    if (faceSrc) {
      guideFigure.appendChild(U.el("img", {
        class: "globe-explore__img", src: faceSrc, alt: "STAR, your guide"
      }, []));
    } else {
      guideFigure.appendChild(U.el("span", { class: "globe-explore__glyph", "aria-hidden": "true" }, "✨"));
    }
    var exitExploreBtn = U.el("button", { class: "btn", type: "button" }, "Exit explore");
    exitExploreBtn.addEventListener("click", function () { exitExplore(); });
    var exploreBar = U.el("div", { class: "globe-explore__bar" }, [
      guideFigure,
      U.el("div", { class: "globe-explore__guide" }, [
        U.el("div", { class: "globe-explore__name" }, "STAR — your guide"),
        guideLine
      ]),
      exitExploreBtn
    ]);

    function arrowBtn(glyph, label, cls, dx, dy) {
      var b = U.el("button", {
        class: "globe-explore__arrow " + cls, type: "button", "aria-label": label
      }, glyph);
      b.addEventListener("click", function () { walkStep(dx, dy); });
      return b;
    }
    var explorePad = U.el("div", { class: "globe-explore__pad", role: "group", "aria-label": "Walk the map" }, [
      arrowBtn("▲", "Walk north", "globe-explore__arrow--up", 0, 1),
      arrowBtn("◀", "Walk west", "globe-explore__arrow--left", -1, 0),
      arrowBtn("◎", "Back to the explored place", "globe-explore__arrow--centre", 0, 0),
      arrowBtn("▶", "Walk east", "globe-explore__arrow--right", 1, 0),
      arrowBtn("▼", "Walk south", "globe-explore__arrow--down", 0, -1)
    ]);
    var exploreChipsHost = U.el("div", { class: "globe-explore__chips" }, [buildChipRow()]);
    // Bar + selector chips + selector result stack in one top
    // container, so they can never overlap each other at any
    // width; the arrow pad rides the right-centre, clear of
    // the STAR launcher and the Presence card.
    var exploreTop = U.el("div", { class: "globe-explore__top" }, [
      exploreBar, exploreChipsHost, exploreResult
    ]);
    var exploreOverlay = U.el("div", {
      class: "globe-explore globe-explore--hidden", "aria-label": "Explore this area with STAR"
    }, [exploreTop, explorePad]);

    function updateGuide() {
      if (!globeEngine) return;
      var v = null;
      try { v = globeEngine.getView(); } catch (e) {}
      if (!v) return;
      guideLine.textContent = "Exploring " + descriptorText(v.lon, v.lat) +
        " — tap the arrows to walk the map." +
        (travelState.mode ? " STAR travels by: " + travelState.mode + "." : "");
    }

    var bobTimer = null;
    function bobStar() {
      guideFigure.classList.add("globe-explore__figure--walking");
      if (bobTimer) clearTimeout(bobTimer);
      bobTimer = setTimeout(function () {
        guideFigure.classList.remove("globe-explore__figure--walking");
      }, 480);
    }

    function visibleSpanDeg() {
      var wpx = 800, hpx = 600;
      try {
        if (globeCanvas) {
          wpx = globeCanvas.clientWidth || wpx;
          hpx = globeCanvas.clientHeight || hpx;
        }
      } catch (e) {}
      var a = globeEngine.unproject(0, hpx / 2);
      var b = globeEngine.unproject(wpx, hpx / 2);
      var c = globeEngine.unproject(wpx / 2, 0);
      var d = globeEngine.unproject(wpx / 2, hpx);
      var slon = Math.abs(b.lon - a.lon);
      if (slon > 180) slon = 360 - slon;
      return { lon: slon, lat: Math.abs(c.lat - d.lat) };
    }

    // One walk step: a third of the visible span in that
    // direction, applied directly through the engine's view
    // API (no tweening, like every other view change here).
    function walkStep(dx, dy) {
      if (!walk.active || !globeEngine) return;
      try {
        if (dx === 0 && dy === 0) {
          var v0 = globeEngine.getView();
          globeEngine.setView({ lon: walk.anchor.lon, lat: walk.anchor.lat, scale: v0.scale });
        } else {
          var span = visibleSpanDeg();
          var v = globeEngine.getView();
          globeEngine.setView({
            lon: v.lon + dx * span.lon / 3,
            lat: v.lat + dy * span.lat / 3
          });
        }
      } catch (e) {}
      bobStar();
      updateGuide();
      refreshSelectorArea();
      renderAreaResults();
      syncViewUI();
    }

    function exploreKeys(e) {
      if (!walk.active) return;
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" || t.isContentEditable)) return;
      var dx = 0, dy = 0;
      if (e.key === "ArrowUp") dy = 1;
      else if (e.key === "ArrowDown") dy = -1;
      else if (e.key === "ArrowLeft") dx = -1;
      else if (e.key === "ArrowRight") dx = 1;
      else return;
      if (e.preventDefault) e.preventDefault();
      walkStep(dx, dy);
    }

    function enterExplore() {
      var c = liveState.context;
      if (!c || !globeEngine) {
        liveNote.textContent = "Tap or click the map to choose an area first — then Explore walks that place with STAR.";
        return;
      }
      walk.anchor = c.city
        ? { lon: c.city.at[0], lat: c.city.at[1] }
        : { lon: c.lon, lat: c.lat };
      walk.active = true;
      try { globeEngine.setView({ lon: walk.anchor.lon, lat: walk.anchor.lat, scale: EXPLORE_SCALE }); } catch (e) {}
      exploreOverlay.classList.remove("globe-explore--hidden");
      try { document.addEventListener("keydown", exploreKeys); } catch (e) {}
      updateGuide();
      updateSelectorVisibility();
      // The selector pops up with Explore, opened on the
      // places lens so the area immediately shows real content.
      selectAreaCategory("CITY");
      syncViewUI();
      liveNote.textContent = "Exploring with STAR: tap the arrows (or use the arrow keys) to walk the map. The guide line and the selector always name the real place under the view.";
    }

    function exitExplore() {
      walk.active = false;
      exploreOverlay.classList.add("globe-explore--hidden");
      try { document.removeEventListener("keydown", exploreKeys); } catch (e) {}
      clearAreaCategory();
      updateSelectorVisibility();
    }

    // Zoom to the state capital: centre the view on the
    // capital's real vendored position at LOCAL tier, then let
    // the engine's own pick name the new context.
    function zoomToCapital(stateName) {
      var cap = capitalForState(stateName);
      if (!cap || !cap.city || !globeEngine) return;
      var lon = cap.city.at[0], lat = cap.city.at[1];
      try {
        globeEngine.setView({ lon: lon, lat: lat, scale: EXPLORE_SCALE });
        var px = globeEngine.project(lon, lat);
        var pick = globeEngine.pickAt(px.x, px.y);
        if (pick) setContextFromPick(pick);
      } catch (e) {}
      syncViewUI();
    }

    // ---- World Lens selector (World OS §13) ----------------------
    // View state over the one location context: chips in the top
    // roll (assembled with the rolls below), a card in this panel.
    // Selecting a lens emphasises its existing layer where one
    // exists and NEVER queries a provider or forks data.
    var lensHeading = U.el("h3", { class: "globe-controls__heading" }, "World Lens");
    var lensTabs = U.el("div", { class: "mti6-tabs globe-lens-tabs", role: "group", "aria-label": "World Lens selector" }, []);
    var lensCardBody = U.el("div", { class: "globe-lens-card" }, []);

    function lensLabel(id) {
      for (var i = 0; i < LENSES.length; i++) if (LENSES[i].id === id) return LENSES[i].label;
      return id;
    }

    // [badge text, badge class token], derived at render from
    // the same layer reads and wiring as the rest of the screen.
    function lensBadgeParts(id) {
      if (id === "REALITY") return global.WorldMapData ? ["AVAILABLE", "AVAILABLE"] : ["NOT_LOADED", "NOT_LOADED"];
      if (id === "LIVE") return ["WEATHER ONLY", "AVAILABLE"];
      if (id === "TRAFFIC" || id === "TRANSIT") return ["NOT_CONNECTED", "NOT_CONNECTED"];
      if (id === "WEATHER") return ["AVAILABLE", "AVAILABLE"];
      if (id === "SOURCE_COVERAGE") {
        return liveState.context ? ["AVAILABLE", "AVAILABLE"] : ["NO AREA", "NO_DATA"];
      }
      if (id === "SIMULATOR") return ["NOT BUILT", "NOT_CONNECTED"];
      var layer = getLayerSafe(LENS_LAYER[id]);
      if (!layer) return ["NOT_LOADED", "NOT_LOADED"];
      return [layer.state + " · " + (layer.items ? layer.items.length : 0), layer.state];
    }

    function lensNote(id) {
      switch (id) {
        case "LIVE": return "Live lens: only currently available live or near-live sources — today that is weather (the provider that answers via SEARCH THIS AREA: National Weather Service for US points, Open-Meteo worldwide) and real-coordinate earthquake markers when loaded; every other live category is honestly empty.";
        case "TRAFFIC": return "Traffic lens: NOT_CONNECTED — no traffic source is connected, so nothing is shown as traffic.";
        case "TRANSIT": return "Transit lens: NOT_CONNECTED — no transit source is connected (GTFS / GTFS-RT are catalog candidates).";
        case "WEATHER": return "Weather lens: the weather capability is connected through the Capability Router (National Weather Service for US points, Open-Meteo worldwide) — SEARCH THIS AREA takes this area's reading with the answering provider and observation time shown.";
        case "OPPORTUNITIES": return "Opportunities lens: the Opportunities layer, global recorded state with no geography — its badge is its real state.";
        case "SECURITY": return "Security lens: the Security Alerts layer — alarm red is reserved for verified-and-active alerts; an alert with an area glows at its real point.";
        case "BOT_ACTIVITY": return "Bot activity lens: recorded workforce state only — workers are NOT_CONNECTED, and no bot motion is shown that was not recorded.";
        case "SOURCE_COVERAGE": return "Source coverage lens: the Coverage readout in the Live World panel lists what MTI6 has for this area — and its gaps.";
        case "SIMULATOR": return "Simulator lens: NOT BUILT — a labelled seat for the future derived-world reconstruction (World OS §13/§20).";
        default: return modeNote(mode);
      }
    }

    function refreshModeNote() {
      modeNoteEl.textContent = activeLens === "REALITY" ? modeNote(mode) : lensNote(activeLens);
    }

    function lensLines(id) {
      if (id === "REALITY") return [
        "The base world: vendored country and state outlines and named places at their real positions, with the recorded layers as they stand.",
        "The mode tabs (World / Electric / Terrain / Boundaries / Intelligence) are palettes over this same data — styling only. Terrain renders nothing as terrain: no terrain data is connected."
      ];
      if (id === "LIVE") return [
        "Only currently available live or near-live sources appear under this lens.",
        "Today exactly one live geographic capability is connected: weather, taken explicitly when you tap SEARCH THIS AREA through the capability router — National Weather Service for US points, Open-Meteo worldwide. Earthquakes load on request at real coordinates. Every media category is NOT_CONNECTED, so the Live lens is weather + hazards only — nothing else is presented as live."
      ];
      if (id === "TRAFFIC") return [
        "No traffic provider is connected yet — no traffic results exist for any area and none are invented. The 511/DOT family is a source-catalog CANDIDATE under terms review."
      ];
      if (id === "TRANSIT") return [
        "No transit provider is connected yet — GTFS and GTFS-RT feeds are source-catalog CANDIDATEs. No routes, vehicles or stations are shown."
      ];
      if (id === "WEATHER") return [
        "Weather for the current area comes through the capability router — National Weather Service primary for US points, Open-Meteo worldwide, cache last — a STATIC SNAPSHOT with its observation time and answering source shown, never a live feed.",
        liveState.context ? "Use the button below (the same SEARCH THIS AREA path) to take this area's reading." : "Tap the map to set an area first — then SEARCH THIS AREA takes its weather reading."
      ];
      if (id === "OPPORTUNITIES" || id === "BOT_ACTIVITY") {
        var layer = getLayerSafe(LENS_LAYER[id]);
        return [
          lensLabel(id) + " layer: " + (layer ? layer.state + " · " + (layer.items ? layer.items.length : 0) : "NOT_LOADED") + ".",
          id === "OPPORTUNITIES"
            ? "Global recorded state with no geography — nothing is pinned to this area, and zero records means zero, honestly."
            : "Worker records only — no worker runtime is connected, so no bot activity is live and none is implied."
        ];
      }
      if (id === "SECURITY") {
        var slayer = getLayerSafe("SECURITY_ALERTS");
        return [
          "Security Alerts layer: " + (slayer ? slayer.state + " · " + (slayer.items ? slayer.items.length : 0) : "NOT_LOADED") + ".",
          "Alarm red is reserved for verified-and-active alerts (CONFIRMED / ACTIVE / MITIGATING). An alert recorded with an area glows red at its real point on the map; an area-less verified-active alert keeps the global red presentation."
        ];
      }
      if (id === "SOURCE_COVERAGE") return [
        liveState.context
          ? "The Coverage readout below lists, for this area, what MTI6 has and what it lacks — each row naming the basis it was computed from."
          : "Tap the map to set an area — the Coverage readout binds to the location context and computes only what can honestly be computed for it."
      ];
      if (id === "SIMULATOR") return [
        "Simulator — NOT_CONNECTED · derived-world reconstruction is a future layer (World OS §13/§20)",
        "Nothing is simulated here yet: no derived world and no uncertainty rendering. The seat is reserved and labelled until the simulator exists."
      ];
      return [];
    }

    function renderLensCard() {
      lensCardBody.innerHTML = "";
      var parts = lensBadgeParts(activeLens);
      lensCardBody.appendChild(U.el("div", { class: "globe-live-card__head" }, [
        U.el("span", { class: "globe-live-card__title" }, "Lens: " + lensLabel(activeLens)),
        U.el("span", { class: badgeClassForState(parts[1]) }, parts[0])
      ]));
      lensLines(activeLens).forEach(function (line) {
        lensCardBody.appendChild(U.el("div", { class: "api-meta" }, line));
      });
      if (activeLens === "WEATHER") {
        var wxBtn = U.el("button", { class: "btn", type: "button" }, "Search this area for weather");
        wxBtn.disabled = !liveState.context;
        wxBtn.addEventListener("click", function () { searchAreaBtn.click(); });
        lensCardBody.appendChild(U.el("div", { class: "globe-controls globe-live-actions" }, [wxBtn]));
      }
    }

    function refreshLensUI() {
      lensTabs.innerHTML = "";
      LENSES.forEach(function (l) {
        var parts = lensBadgeParts(l.id);
        var active = l.id === activeLens;
        var b = U.el("button", {
          class: "mti6-tab" + (active ? " mti6-tab--active" : ""),
          type: "button",
          "aria-pressed": active ? "true" : "false"
        }, [
          U.el("span", {}, l.label + " "),
          U.el("span", { class: badgeClassForState(parts[1]) }, parts[0])
        ]);
        b.setAttribute("data-lens", l.id);
        b.addEventListener("click", function () { selectLens(l.id); });
        lensTabs.appendChild(b);
      });
      renderLensCard();
      if (activeLens === "SOURCE_COVERAGE") coverageSection.classList.add("globe-coverage--focus");
      else coverageSection.classList.remove("globe-coverage--focus");
    }

    function selectLens(id) {
      activeLens = id;
      var layerId = LENS_LAYER[id];
      if (layerId && layerId !== selectedLayer) selectLayer(layerId);
      refreshLensUI();
      refreshModeNote();
      if (id === "SOURCE_COVERAGE" && liveState.context) {
        try {
          if (typeof coverageSection.scrollIntoView === "function") coverageSection.scrollIntoView();
        } catch (e) {}
      }
    }

    // ---- Coverage readout (World OS §§1/9; architecture §3) -------
    // Bound to the location context; hidden until one exists.
    // Rows are (kind, state, basis) triples computed ONLY from
    // vendored presence, the connected Open-Meteo source, and
    // the platform's global layer states — labelled global,
    // never presented as coverage of this area.
    var coverageBody = U.el("div", { class: "globe-coverage__body" }, []);
    var coverageSection = U.el("div", { class: "globe-coverage globe-coverage--hidden" }, [
      U.el("h4", { class: "globe-live-media__heading" }, "Coverage here"),
      coverageBody
    ]);

    function coverageRow(name, badgeText, badgeToken, basis) {
      return U.el("div", { class: "globe-live-media-row globe-coverage-row" }, [
        U.el("span", { class: "globe-live-media-row__name" }, name),
        U.el("span", { class: badgeClassForState(badgeToken) }, badgeText),
        U.el("span", { class: "api-meta" }, basis)
      ]);
    }

    // The weather capability's recorded outcomes (NWS + Open-Meteo
    // through the Capability Router), read from the ApiRegistry
    // usage journal — measured, never assumed. Returns the most
    // recent outcome across both providers, or null before any call.
    function weatherUsage() {
      try {
        if (!global.ApiRegistry || typeof global.ApiRegistry.getUsage !== "function") return null;
        var all = global.ApiRegistry.getUsage();
        var latest = null, calls = 0;
        for (var i = 0; i < all.length; i++) {
          if (all[i].id !== "nws" && all[i].id !== "open-meteo") continue;
          calls += all[i].callsToday || 0;
          if (all[i].lastAt && (!latest || all[i].lastAt > latest.lastAt)) latest = all[i];
        }
        if (!latest) return null;
        latest = { lastOk: latest.lastOk, callsToday: calls };
        return latest;
      } catch (e) {}
      return null;
    }

    function renderCoverage() {
      coverageBody.innerHTML = "";
      var c = liveState.context;
      if (!c) {
        coverageSection.classList.add("globe-coverage--hidden");
        return;
      }
      coverageSection.classList.remove("globe-coverage--hidden");
      var land = !!c.land;
      // MAP — vendored presence at this point (Input A).
      if (land) {
        coverageBody.appendChild(coverageRow("MAP", "COVERED", "AVAILABLE",
          "Vendored outlines resolve this point" + (c.country ? " to " + c.country : "") +
          " — local Natural Earth data on this device (coarse 110m outlines)."));
      } else {
        coverageBody.appendChild(coverageRow("MAP", "BASE WORLD", "STATIC SNAPSHOT",
          "The vendored base map covers this point — open ocean: no land outline contains it."));
      }
      // PLACES — named places only; the data has no businesses.
      var near = nearestPlaces(c.lon, c.lat, 8);
      var within = near.filter(function (p) { return p.km <= 500; });
      if (within.length) {
        coverageBody.appendChild(coverageRow("PLACES", "COVERED", "AVAILABLE",
          within.length + " named place(s) in the local data within 500 km — nearest: " + near[0].name +
          ", " + Math.round(near[0].km) + " km. Named places only — the local data holds no business records."));
      } else {
        coverageBody.appendChild(coverageRow("PLACES", "NO_DATA", "NO_DATA",
          "No named place within 500 km in the local data" +
          (near.length ? " — nearest: " + near[0].name + ", " + Math.round(near[0].km) + " km." : ".")));
      }
      // WEATHER — the connected weather capability (Input B):
      // a capability statement; an observation only on request.
      var om = weatherUsage();
      var wxBasis = "The weather capability answers any coordinates on Earth (National Weather Service for US points, Open-Meteo worldwide, through the capability router) — coverage, not an observation: tap SEARCH THIS AREA to take this area's reading.";
      if (om && om.callsToday > 0) {
        wxBasis += om.lastOk ? " Last recorded check: OK." : " Last recorded check: FAILED — declared unavailable from the recorded outcome, not assumed.";
      }
      coverageBody.appendChild(coverageRow("WEATHER", "AVAILABLE", "AVAILABLE", wxBasis));
      coverageBody.appendChild(U.el("div", { class: "globe-live-source" }, "SOURCE: National Weather Service (US points) · Open-Meteo (worldwide) — capability router"));
      // WORLD ENGINE KNOWLEDGE — global platform state (Input C),
      // labelled global so it can never pose as area coverage.
      coverageBody.appendChild(coverageRow("WORLD ENGINE KNOWLEDGE", "GLOBAL", "STATIC SNAPSHOT",
        "Platform-wide recorded state, not coverage of this area: " + layerCountsLine() +
        ". Layer items carry no geography by design."));
      // GAPS — kinds appropriate to this area with no connected
      // source, worded MTI6-relatively (architecture §3.2).
      var kinds = (land ? GAP_KINDS_LAND : GAP_KINDS_OCEAN).slice();
      var suppressed = [];
      if (c.tier === "WORLD") {
        kinds = kinds.filter(function (k) {
          if (STREET_LEVEL_KINDS.indexOf(k) !== -1) { suppressed.push(k); return false; }
          return true;
        });
      }
      kinds.forEach(function (k) {
        coverageBody.appendChild(coverageRow(k, "NO CONNECTED SOURCE", "NOT_CONNECTED",
          "MTI6 has no " + k.toLowerCase() + " source for this area — a statement about MTI6's coverage, not about the place."));
      });
      // The three world states (directive §12), honestly held.
      coverageBody.appendChild(U.el("div", { class: "api-meta" },
        "World states: CACHED BASE WORLD — this base map is vendored locally and works offline · ONLINE WORLD — live sources answer when the network allows · LIVE SOURCES UNAVAILABLE is declared per source from recorded outcomes (weather capability: " +
        (om ? (om.callsToday > 0 ? (om.lastOk ? "last check OK" : "last check FAILED") : "no check recorded yet") : "no registry read available") + ")."));
      // GAPS summary + the gated Find more (no missions yet).
      var gaps = U.el("div", { class: "globe-coverage__gaps" }, []);
      gaps.appendChild(U.el("div", { class: "globe-live-context__heading" }, "Gaps for this area"));
      var gapList = U.el("ul", { class: "price-offer-list" });
      kinds.forEach(function (k) {
        gapList.appendChild(U.el("li", {}, "MTI6 has no " + k.toLowerCase() + " source for this area"));
      });
      gaps.appendChild(gapList);
      if (!land) {
        gaps.appendChild(U.el("div", { class: "api-meta" },
          "Land-only coverage kinds (traffic, transit, street imagery, cameras and the rest) are not listed for open ocean — there is nothing there for them to cover."));
      }
      if (suppressed.length) {
        gaps.appendChild(U.el("div", { class: "api-meta" },
          "Street-level kinds (" + suppressed.join(", ") + ") are not listed at WORLD tier — zoom in and the readout follows the view."));
      }
      gaps.appendChild(U.el("div", { class: "api-meta" },
        "Gap missions open with the World Resource Registry and the worker runtime — neither is built yet, so no mission is opened and no research is simulated. FIND MORE stays in its gated state:"));
      var covFindMore = U.el("button", { class: "btn", type: "button" }, "Find more");
      covFindMore.addEventListener("click", function () { findMoreBtn.click(); });
      gaps.appendChild(U.el("div", { class: "globe-controls globe-live-actions" }, [covFindMore]));
      coverageBody.appendChild(gaps);
    }

    // ---- Transport Routes selector (World OS §13 routing seat) ----
    // Modes for any place worldwide. The travel context is kept
    // on screen (panel lines + the bottom-roll line); the guide
    // travels by the chosen mode — presentation only. Routing is
    // NOT_CONNECTED: no route geometry exists anywhere in this
    // build, and none is drawn.
    var routeModeRow = U.el("div", { class: "globe-selector__chips", role: "group", "aria-label": "Transportation route mode" }, []);
    var routeChips = {};
    ROUTE_MODES.forEach(function (m) {
      var b = U.el("button", { class: "globe-chip", type: "button", "aria-pressed": "false" }, m);
      b.setAttribute("data-route-mode", m);
      b.addEventListener("click", function () { selectRouteMode(m); });
      routeChips[m] = b;
      routeModeRow.appendChild(b);
    });
    var routeFromLine = U.el("div", { class: "api-meta globe-routes__line" }, "");
    var routeToLine = U.el("div", { class: "api-meta globe-routes__line" }, "");
    var setDestBtn = U.el("button", { class: "btn", type: "button", "aria-pressed": "false" }, "Set destination");
    setDestBtn.addEventListener("click", function () {
      travelState.capturing = !travelState.capturing;
      refreshRoutesUI();
      if (travelState.capturing) {
        liveNote.textContent = "Tap the map to set the destination — or tap Set destination again (or press Esc) to cancel. The tap is consumed as the destination; your location context stays as the origin.";
      }
    });
    var clearRouteBtn = U.el("button", { class: "btn", type: "button" }, "Clear route");
    clearRouteBtn.addEventListener("click", function () {
      travelState.mode = null;
      travelState.to = null;
      travelState.capturing = false;
      refreshRoutesUI();
      if (walk.active) updateGuide();
    });
    var routesSection = U.el("div", { class: "globe-routes" }, [
      U.el("h4", { class: "globe-live-media__heading" }, "Transport routes"),
      U.el("div", { class: "api-meta" },
        "A selector for all transportation routes — every mode, for any place: all countries, islands, everywhere. Choosing a mode sets your travel context and the mode STAR travels by in Explore (presentation only — a form grants no capability). Routing itself is NOT_CONNECTED: no routing provider is connected (OSRM is the source-catalog candidate; its demo server is not for production), so no route line is drawn."),
      routeModeRow,
      routeFromLine,
      routeToLine,
      U.el("div", { class: "globe-controls globe-live-actions" }, [setDestBtn, clearRouteBtn])
    ]);
    var routeLine = U.el("div", { class: "api-meta globe-roll__route" }, "");

    function refreshRoutesUI() {
      ROUTE_MODES.forEach(function (m) {
        var b = routeChips[m];
        if (!b) return;
        var on = travelState.mode === m;
        if (on) b.classList.add("globe-chip--active"); else b.classList.remove("globe-chip--active");
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      routeFromLine.textContent = "From: " + (travelState.from ? travelState.from.label : "— tap the map to set a location context");
      routeToLine.textContent = "To: " + (travelState.to ? travelState.to.label : "(no destination set)");
      setDestBtn.textContent = travelState.capturing ? "Tap the map for the destination — tap again or Esc to cancel" : "Set destination";
      setDestBtn.setAttribute("aria-pressed", travelState.capturing ? "true" : "false");
      routeLine.textContent = travelState.mode
        ? "Route: " + travelState.mode + " · " + (travelState.from ? travelState.from.label : "(no origin set)") +
          " → " + (travelState.to ? travelState.to.label : "(no destination set)") + " · Routing NOT_CONNECTED"
        : "Route: no mode selected · Routing NOT_CONNECTED";
    }

    function selectRouteMode(m) {
      travelState.mode = m;
      if (!travelState.from && liveState.context) {
        var c = liveState.context;
        travelState.from = { label: placeLabel(c), lat: c.lat, lon: c.lon };
      }
      refreshRoutesUI();
      if (walk.active) updateGuide();
    }

    function completeDestination(pick) {
      travelState.capturing = false;
      if (pick) {
        travelState.to = { label: placeLabel(pick), lat: pick.lat, lon: pick.lon };
        liveNote.textContent = "Destination set: " + travelState.to.label +
          ". Routing is NOT_CONNECTED — no route line is drawn; the travel context stays on screen.";
      }
      refreshRoutesUI();
    }

    // Esc cancels a destination capture in progress.
    function routeKeys(e) {
      if (!travelState.capturing) return;
      if (e.key === "Escape") {
        travelState.capturing = false;
        refreshRoutesUI();
        liveNote.textContent = "Destination capture cancelled — no destination was set.";
      }
    }
    try { document.addEventListener("keydown", routeKeys); } catch (e) {}

    // Place search (v92): name → coordinates through the
    // Capability Router's geocode capability (Open-Meteo
    // Geocoding). Explicit tap only. Choosing a result centres
    // the map there and sets the location context from the map's
    // OWN vendored data at that point (pickAt / describeAt) — the
    // geocoder's coordinates steer the view; the context's place
    // identity still comes from MTI6's own geography.
    var placeInput = U.el("input", { class: "price-input", type: "text", "aria-label": "Place name to search" });
    placeInput.setAttribute("placeholder", "Place name — e.g. Houston, Reykjavík, Kyoto");
    var placeBtn = U.el("button", { class: "btn", type: "button" }, "Search places");
    var placeResults = U.el("div", { class: "globe-place-results" }, []);
    var placeNote = U.el("div", { class: "api-meta" },
      "Place search asks Open-Meteo Geocoding (through the Capability Router) only when you tap Search. Results carry their source; choosing one centres the map and sets the location context from the map's own vendored data.");
    function gotoPlace(o) {
      var lat = o.location.lat, lon = o.location.lon;
      if (globeEngine && typeof globeEngine.setView === "function") {
        try { globeEngine.setView({ lon: lon, lat: lat, scale: 12 }); } catch (e) {}
      }
      var pick = null;
      if (globeEngine && typeof globeEngine.pickAt === "function" && typeof globeEngine.project === "function") {
        try {
          var px = globeEngine.project(lon, lat);
          if (px) pick = globeEngine.pickAt(px.x, px.y);
        } catch (e) {}
      }
      if (pick) { setContextFromPick(pick); }
      else {
        var d = describeAt(lon, lat);
        setContextFromPick({ lat: lat, lon: lon, city: null, country: d.country, state: d.state, land: d.land, tier: "COUNTRY" });
      }
      syncViewUI();
      liveNote.textContent = "Place selected: " + o.value + " — centred on the map; the location context above is set from the map's own vendored data at that point.";
    }
    placeBtn.addEventListener("click", function () {
      var q = String(placeInput.value || "").trim();
      placeResults.innerHTML = "";
      if (!q) { placeNote.textContent = "Type a place name first — nothing was searched."; return; }
      var PR = global.ProviderRouter;
      if (!PR || !PR.WorldData || typeof PR.WorldData.geocode !== "function") {
        placeNote.textContent = "Place search is NOT_CONNECTED — the Capability Router did not load (NOT_LOADED), so no provider was asked.";
        return;
      }
      placeNote.textContent = "Asking Open-Meteo Geocoding for “" + q + "”…";
      PR.WorldData.geocode(q).then(function (res) {
        placeResults.innerHTML = "";
        if (!res || !res.observations || !res.observations.length) {
          placeNote.textContent = res && res.provider
            ? res.provider + " answered with no matching place for “" + q + "”. Nothing was centred and nothing was invented."
            : "Place search could not be answered (" + chainSummary(res || {}) + "). Nothing was centred and nothing was invented.";
          return;
        }
        placeNote.textContent = res.observations.length + " place(s) for “" + q + "” · SOURCE: " + res.provider +
          (res.freshnessState === "LAST_KNOWN" ? " · LAST_KNOWN (cached answer, labelled as such)" : "") + " — tap one to go there.";
        res.observations.forEach(function (o) {
          var d = o.details || {};
          var b = U.el("button", { class: "btn globe-place-result", type: "button" }, [
            U.el("span", {}, o.value + (d.admin1 ? " — " + d.admin1 : "") + (d.country ? ", " + d.country : "")),
            U.el("span", { class: "api-meta" }, " " + o.location.lat + ", " + o.location.lon + (d.population ? " · population " + d.population : ""))
          ]);
          b.addEventListener("click", function () { gotoPlace(o); });
          placeResults.appendChild(b);
        });
      }).catch(function () {
        placeNote.textContent = "Place search failed unexpectedly — nothing was centred and nothing was invented.";
      });
    });
    placeInput.addEventListener("keydown", function (e) { if (e.key === "Enter") placeBtn.click(); });
    var placeSection = U.el("div", { class: "globe-place-search" }, [
      U.el("h4", { class: "globe-live-media-title" }, "Place search"),
      U.el("div", { class: "globe-route-row" }, [placeInput, placeBtn]),
      placeResults,
      placeNote
    ]);

    // Natural Events (v92): explicit loads through the router.
    // Earthquakes (USGS) feed the EARTHQUAKES layer (real-
    // coordinate DOM markers); NASA EONET natural events — the
    // general Natural Events model: categories, named upstream
    // sources, geometry — are listed here with the sources EONET
    // records for each event. No background fetching — nothing
    // is asked until a button is tapped.
    var quakeBtn = U.el("button", { class: "btn", type: "button" }, "Load earthquakes");
    var eventsBtn = U.el("button", { class: "btn", type: "button" }, "Load natural events");
    var geoStatus = U.el("div", { class: "api-meta" },
      "Earthquakes: USGS real-time feed (M4.5+, past day) through the Capability Router. Natural events: NASA EONET's curated catalogue. Both load only on tap.");
    var eventsList = U.el("div", { class: "globe-geo-events" }, []);
    quakeBtn.addEventListener("click", function () {
      var PR = global.ProviderRouter;
      if (!PR || !PR.WorldData || typeof PR.WorldData.earthquakes !== "function") {
        geoStatus.textContent = "Earthquakes are NOT_CONNECTED — the Capability Router did not load (NOT_LOADED), so no provider was asked.";
        return;
      }
      geoStatus.textContent = "Asking the USGS earthquake feed…";
      PR.WorldData.earthquakes({ forceFresh: true }).then(function (res) {
        quakePoints = (res.observations || []).map(function (o) {
          return { lat: o.location.lat, lon: o.location.lon, label: "M" + o.value + " — " + ((o.details || {}).place || "earthquake") };
        });
        quakeLayer.items = (res.observations || []).map(function (o) {
          return { id: o.observationId, label: "M" + o.value + " — " + ((o.details || {}).place || "earthquake"),
            state: "OBSERVED", source: "USGS Earthquake Catalog" };
        });
        quakeLayer.count = quakeLayer.items.length;
        if (res.observations && res.observations.length) {
          quakeLayer.state = res.freshnessState === "LAST_KNOWN" ? "LAST_KNOWN" : "CURRENT";
          quakeLayer.note = "USGS real-time feed (M4.5+, past day), feed generated " + fmtTime(res.observedAt) +
            " · freshness " + res.freshnessState + (res.fromCache ? " (router cache — original provider and times preserved)" : "") +
            ". Markers sit at the events' real coordinates.";
          geoStatus.textContent = quakeLayer.items.length + " earthquakes loaded · SOURCE: USGS Earthquake Catalog · feed generated " +
            fmtTime(res.observedAt) + " · " + res.freshnessState + ". The Earthquakes layer is selected — markers are at real coordinates.";
          selectLayer("EARTHQUAKES");
        } else {
          quakeLayer.state = "NO_DATA";
          quakeLayer.note = "The earthquake capability returned no data (" + chainSummary(res) + "). No markers are shown rather than invented.";
          geoStatus.textContent = "No earthquake data: " + chainSummary(res) + ". Nothing was plotted.";
          refreshLayerUI();
        }
      }).catch(function () {
        geoStatus.textContent = "The earthquake capability failed unexpectedly — nothing was plotted.";
      });
    });
    eventsBtn.addEventListener("click", function () {
      var PR = global.ProviderRouter;
      if (!PR || !PR.WorldData || typeof PR.WorldData.naturalEvents !== "function") {
        geoStatus.textContent = "Natural events are NOT_CONNECTED — the Capability Router did not load (NOT_LOADED), so no provider was asked.";
        return;
      }
      geoStatus.textContent = "Asking NASA EONET for open natural events…";
      eventsList.innerHTML = "";
      PR.WorldData.naturalEvents({ forceFresh: true }).then(function (res) {
        if (!res.observations || !res.observations.length) {
          geoStatus.textContent = res.provider
            ? "NASA EONET answered: no open natural events in the current catalogue window. That is the catalogue's answer, not a claim that nothing is happening on Earth."
            : "Natural events could not be loaded (" + chainSummary(res) + "). Nothing was listed rather than invented.";
          return;
        }
        geoStatus.textContent = res.observations.length + " open natural events · SOURCE: NASA EONET · " + res.freshnessState +
          " — each event names the upstream source EONET records for it; NEAR-LIVE/OBSERVED, never live video.";
        res.observations.slice(0, 12).forEach(function (o) {
          var d = o.details || {};
          eventsList.appendChild(U.el("div", { class: "globe-geo-event" }, [
            U.el("span", {}, o.value),
            U.el("span", { class: "api-meta" }, " " + (d.categories || "") + " · " + fmtTime(o.observedAt) +
              " · via " + ((d.sources && d.sources.length) ? d.sources.join(", ") : "source not recorded") + " · SOURCE: NASA EONET")
          ]));
        });
        if (res.observations.length > 12) {
          eventsList.appendChild(U.el("div", { class: "api-meta" }, "+ " + (res.observations.length - 12) + " more open events in the catalogue window."));
        }
      }).catch(function () {
        geoStatus.textContent = "The natural-events capability failed unexpectedly — nothing was listed.";
      });
    });
    var geoSection = U.el("div", { class: "globe-geo-section" }, [
      U.el("h4", { class: "globe-live-media-title" }, "Natural Events"),
      U.el("div", { class: "globe-route-row" }, [quakeBtn, eventsBtn]),
      geoStatus,
      eventsList
    ]);

    // Transit (v118, owner ruling D4): stops + departures from
    // Transitland through the Capability Router — the Globe's
    // first proxy-routed provider. Tap-to-load only: nothing is
    // asked until "Load transit near here" is tapped, and no
    // background polling or retry loop ever asks again. The load
    // uses the current location context (the owner's own tap on
    // the map). Stops render as DOM markers at their real
    // coordinates on the TRANSIT layer; tapping a stop (marker
    // or list row) loads its departures for TODAY + TOMORROW
    // (D4(d)). Every departure is labelled REALTIME or SCHEDULED
    // from the router's normalized records — a scheduled time is
    // never presented as a live prediction. Cached data is
    // labelled LAST_KNOWN with its retrieval time, never
    // CURRENT. No fares, no agency_fare_url, no journey
    // planning, no SEARCH THIS AREA card — all out of v1 scope
    // (D2/D4/D6). The Globe consumes ONLY the
    // WorldData.transit* capability — never Transitland, the
    // proxy, or MTI6API directly.
    var transitBtn = U.el("button", { class: "btn", type: "button" }, "Load transit near here");
    var transitStatus = U.el("div", { class: "api-meta" },
      "Transit: stops + departures from Transitland through the Capability Router. Loads only on tap — no background polling. Tap the map first to set a location context.");
    var transitStopsList = U.el("div", { class: "globe-geo-events" }, []);
    var transitDeps = U.el("div", { class: "globe-geo-events" }, []);
    var transitSelection = { stopKey: null, stopName: null }; // the stop whose departures are shown

    function transitDistance(m) {
      if (m === null || m === undefined || !isFinite(m)) return null;
      if (m < 1000) return Math.round(m) + " m";
      return (m / 1000).toFixed(1) + " km";
    }
    function transitDayStr(isoStr, offsetDays) {
      try {
        var d = new Date(isoStr);
        d.setDate(d.getDate() + offsetDays);
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      } catch (e) { return null; }
    }
    // Map §12 quota line (the wording the map proposes): this
    // device's count only — the Interline dashboard is
    // authoritative for remaining quota.
    function transitQuotaLine(q) {
      if (!q) return "";
      return "Transitland Explorer — " + q.used + " calls this device this month · Interline dashboard is authoritative.";
    }
    function transitStateLine(res) {
      var parts = [];
      if (res && res.transitState) parts.push("Provider state: " + res.transitState);
      if (res && res.quota) parts.push(transitQuotaLine(res.quota));
      return parts.join(" · ");
    }

    function renderTransitStops(res) {
      transitStopsList.innerHTML = "";
      transitDeps.innerHTML = "";
      transitSelection.stopKey = null; transitSelection.stopName = null;
      var obs = (res && res.observations) || [];
      transitPoints = obs.map(function (o) {
        var rec = (o.details || {}).transitRecord || {};
        var loc = o.location || {};
        return { lat: loc.lat, lon: loc.lon, onestopId: rec.onestopId, name: rec.name,
          label: (rec.name || "Stop") + (rec.onestopId ? " (" + rec.onestopId + ")" : "") };
      }).filter(function (p) { return isFinite(p.lat) && isFinite(p.lon); });
      transitLayer.items = obs.map(function (o) {
        var rec = (o.details || {}).transitRecord || {};
        var dist = transitDistance(rec.distanceM);
        return { id: rec.onestopId || o.observationId, label: (rec.name || "Stop") + (dist ? " — " + dist : ""),
          state: "OBSERVED", source: "Transitland REST API" };
      });
      transitLayer.count = transitLayer.items.length;
      if (obs.length) {
        transitLayer.state = res.freshnessState === "LAST_KNOWN" ? "LAST_KNOWN" : "CURRENT";
        transitLayer.note = obs.length + " transit stops near this point · SOURCE: Transitland REST API · " +
          "retrieved " + fmtTime(res.observedAt || res.retrievedAt) + " · freshness " + res.freshnessState +
          (res.fromCache ? " (router cache — original provider and times preserved)" : "") +
          ". Markers sit at the stops' real coordinates.";
        transitStatus.textContent = obs.length + " transit stops loaded · SOURCE: Transitland REST API · " +
          "retrieved " + fmtTime(res.observedAt || res.retrievedAt) + " · " + res.freshnessState +
          (res.fromCache ? " (LAST_KNOWN — the last known reading, not current)" : "") +
          ". " + transitStateLine(res) + " Tap a stop for its departures.";
        obs.forEach(function (o) {
          var rec = (o.details || {}).transitRecord || {};
          var dist = transitDistance(rec.distanceM);
          var routes = (rec.routesServing || []).map(function (r) { return r.shortName || r.longName || r.onestopId; })
            .filter(function (x) { return !!x; });
          var row = U.el("button", { class: "globe-place-result", type: "button" }, [
            U.el("span", {}, rec.name || "Stop"),
            U.el("span", { class: "api-meta" }, " " + (rec.onestopId || "") + (dist ? " · " + dist : "") +
              (routes.length ? " · routes: " + routes.join(", ") : ""))
          ]);
          row.addEventListener("click", function () { loadDeparturesForStop(rec.onestopId, rec.name); });
          transitStopsList.appendChild(row);
        });
        selectLayer("TRANSIT");
      } else {
        transitLayer.state = "NO_DATA";
        transitLayer.note = "Transitland answered with no stops for this point (" + chainSummary(res) + "). No markers are shown rather than invented.";
        transitStatus.textContent = "No transit stops: " + (res.note || chainSummary(res) ||
          "the provider answered with no stops in this radius — the provider's answer, not a claim no transit exists here.") +
          " " + transitStateLine(res) + " Nothing was plotted.";
        refreshLayerUI();
      }
    }

    transitBtn.addEventListener("click", function () {
      var PR = global.ProviderRouter;
      var c = liveState.context;
      if (!c || !isFinite(c.lat) || !isFinite(c.lon)) {
        transitStatus.textContent = "No area selected yet — tap the map to set a location context before loading transit.";
        return;
      }
      if (!PR || !PR.WorldData || typeof PR.WorldData.transitStops !== "function") {
        transitStatus.textContent = "Transit is NOT_CONNECTED — the Capability Router did not load (NOT_LOADED), so no provider was asked.";
        return;
      }
      transitStatus.textContent = "Asking Transitland for stops near this point…";
      // v1 default radius/limit: a walkable 1 km, at most 20 stops
      // — explicit bounds so one tap cannot spend the budget on an
      // unbounded response. The router re-checks both server-side.
      PR.WorldData.transitStops(c.lat, c.lon, { radius: 1000, limit: 20 }).then(function (res) {
        renderTransitStops(res);
      }).catch(function () {
        transitStatus.textContent = "The transit capability failed unexpectedly — nothing was plotted.";
      });
    });

    function loadDeparturesForStop(onestopId, stopName) {
      var PR = global.ProviderRouter;
      transitDeps.innerHTML = "";
      if (!onestopId) {
        transitStatus.textContent = "That stop has no Onestop ID, so its departures cannot be asked for — nothing was invented.";
        return;
      }
      if (!PR || !PR.WorldData || typeof PR.WorldData.transitDepartures !== "function") {
        transitStatus.textContent = "Transit is NOT_CONNECTED — the Capability Router did not load (NOT_LOADED), so no provider was asked.";
        return;
      }
      transitSelection.stopKey = onestopId; transitSelection.stopName = stopName || null;
      transitStatus.textContent = "Asking Transitland for departures from " + (stopName || onestopId) + " (today + tomorrow)…";
      // SEQUENTIAL, not parallel: the two calls share the
      // router's departures cache key (stopKey only — relative
      // date is not part of it), and the router dedupes concurrent
      // calls on that key, so a parallel TOMORROW call would
      // silently return TODAY's result. Awaiting TODAY first lets
      // the in-flight entry clear before TOMORROW is asked. The
      // router's cache key is a known follow-up (a later router
      // package can key it by stopKey + relativeDate); the
      // render below already groups by each record's own service
      // date and dedupes, so the display stays honest either way.
      PR.WorldData.transitDepartures(onestopId, { relativeDate: "TODAY", limit: 20 }).then(function (todayRes) {
        return PR.WorldData.transitDepartures(onestopId, { relativeDate: "TOMORROW", limit: 20 }).then(function (tomorrowRes) {
          return [{ day: "TODAY", res: todayRes }, { day: "TOMORROW", res: tomorrowRes }];
        }, function () { return [{ day: "TODAY", res: todayRes }, { day: "TOMORROW", res: null }]; });
      }, function () {
        return PR.WorldData.transitDepartures(onestopId, { relativeDate: "TOMORROW", limit: 20 }).then(function (tomorrowRes) {
          return [{ day: "TODAY", res: null }, { day: "TOMORROW", res: tomorrowRes }];
        }, function () { return [{ day: "TODAY", res: null }, { day: "TOMORROW", res: null }]; });
      }).then(function (days) {
        renderTransitDepartures(onestopId, stopName, days);
      });
    }

    function renderTransitDepartures(stopKey, stopName, days) {
      transitDeps.innerHTML = "";
      // Group by the record's OWN service date, never by which
      // call returned it: the two relative-date calls share one
      // router cache entry, so a LAST_KNOWN fallback can return
      // one day's departures for the other day's call. A cached
      // tomorrow must never be shown under "Today". A record
      // whose service date is neither day is left out and counted
      // — never relabelled.
      var todayStr = null, tomorrowStr = null;
      days.forEach(function (d) {
        if (d.res && d.res.retrievedAt) {
          if (d.day === "TODAY" && !todayStr) todayStr = transitDayStr(d.res.retrievedAt, 0);
          if (d.day === "TOMORROW" && !tomorrowStr) tomorrowStr = transitDayStr(d.res.retrievedAt, 1);
        }
      });
      var groups = { TODAY: [], TOMORROW: [] };
      var freshByDay = { TODAY: null, TOMORROW: null };
      var stateByDay = { TODAY: null, TOMORROW: null };
      var unmatched = 0;
      var seen = {}; // dedupe: the two calls share one router cache
      // entry, so a LAST_KNOWN fallback can return the same
      // departures twice — one record, one row, never a duplicate.
      days.forEach(function (d) {
        var res = d.res;
        if (!res) { stateByDay[d.day] = "PROVIDER_ERROR"; return; }
        freshByDay[d.day] = { state: res.freshnessState, at: res.observedAt || res.retrievedAt, fromCache: !!res.fromCache };
        stateByDay[d.day] = res.transitState || ((res.observations && res.observations.length) ? "PRIMARY_AVAILABLE" : "NO_DATA");
        (res.observations || []).forEach(function (o) {
          var rec = (o.details || {}).transitRecord || null;
          if (!rec) return;
          var key = (rec.routeOnestopId || "") + "|" + (rec.displayTime || "") + "|" + (rec.headsign || "") + "|" + (rec.serviceDate || "");
          if (seen[key]) return;
          seen[key] = true;
          if (rec.serviceDate && todayStr && rec.serviceDate === todayStr) { groups.TODAY.push(rec); return; }
          if (rec.serviceDate && tomorrowStr && rec.serviceDate === tomorrowStr) { groups.TOMORROW.push(rec); return; }
          if (rec.serviceDate) { unmatched++; return; }
          groups[d.day].push(rec); // no service date recorded — the call it came from is the only signal
        });
      });
      transitDeps.appendChild(U.el("div", { class: "api-meta" },
        "Departures from " + (stopName || stopKey) + " (" + stopKey + ") — today + tomorrow · SOURCE: Transitland REST API"));
      ["TODAY", "TOMORROW"].forEach(function (day) {
        var label = day === "TODAY" ? "Today" : "Tomorrow";
        var dateStr = day === "TODAY" ? todayStr : tomorrowStr;
        var recs = groups[day];
        var fresh = freshByDay[day];
        transitDeps.appendChild(U.el("div", { class: "globe-live-context__title" }, label + (dateStr ? " — " + dateStr : "")));
        var meta = [];
        if (fresh) {
          meta.push(fresh.state === "LAST_KNOWN"
            ? "LAST_KNOWN — retrieved " + fmtTime(fresh.at) + " (the last known reading, not current)"
            : "CURRENT — retrieved " + fmtTime(fresh.at));
        }
        if (stateByDay[day]) meta.push("Provider state: " + stateByDay[day]);
        if (meta.length) transitDeps.appendChild(U.el("div", { class: "api-meta" }, meta.join(" · ")));
        if (!recs.length) {
          transitDeps.appendChild(U.el("div", { class: "api-meta" },
            stateByDay[day] === "PROVIDER_ERROR"
              ? "Departures for " + label.toLowerCase() + " could not be loaded — the provider did not answer. Nothing was listed rather than invented."
              : "No departures for " + label.toLowerCase() + " in the returned data — the provider's answer, not a claim no service exists."));
          return;
        }
        var realtime = recs.filter(function (r) { return r.timeKind === "REALTIME"; }).length;
        if (realtime === 0) {
          transitDeps.appendChild(U.el("div", { class: "api-meta" }, "Schedule only — no live data for this feed."));
        }
        recs.forEach(function (rec) {
          var routeLabel = rec.routeShortName || rec.routeLongName || rec.routeOnestopId || "Route";
          transitDeps.appendChild(U.el("div", { class: "globe-geo-event" }, [
            U.el("span", {}, routeLabel + " → " + (rec.headsign || "—")),
            U.el("span", { class: badgeClassForState(rec.timeKind === "REALTIME" ? "CURRENT" : "SCHEDULED") }, rec.timeKind),
            U.el("span", { class: "api-meta" }, " " + (rec.displayTime || "") +
              (rec.agencyName ? " · " + rec.agencyName : ""))
          ]));
        });
      });
      if (unmatched > 0) {
        transitDeps.appendChild(U.el("div", { class: "api-meta" },
          unmatched + " departure(s) from an earlier cached day were not shown — their service date is neither today nor tomorrow."));
      }
      transitDeps.appendChild(U.el("div", { class: "globe-live-source" },
        "SOURCE: Transitland REST API · Transitland + per-agency data (see the trip's feed)"));
      transitStatus.textContent = "Departures from " + (stopName || stopKey) + " loaded (today + tomorrow) · SOURCE: Transitland REST API. " +
        transitStateLine(days[0].res || days[1].res);
    }

    var transitSection = U.el("div", { class: "globe-geo-section globe-transit-section" }, [
      U.el("h4", { class: "globe-live-media-title" }, "Transit"),
      U.el("div", { class: "globe-route-row" }, [transitBtn]),
      transitStatus,
      transitStopsList,
      transitDeps
    ]);

    var livePanel = U.el("section", { class: "api-panel globe-live-panel", "aria-label": "Live World" }, [
      U.el("h3", {}, "Live World"),
      placeSection,
      U.el("div", { class: "globe-live-context" }, [
        U.el("div", { class: "globe-live-context__heading" }, "Location context"),
        liveContextBody
      ]),
      lensCardBody,
      coverageSection,
      selectorSection,
      U.el("div", { class: "globe-controls globe-live-actions" }, [searchAreaBtn]),
      liveResults,
      U.el("h4", { class: "globe-live-media__heading" }, "Media selector"),
      U.el("div", { class: "api-meta" },
        "Media for an area appears here only from connected providers, every item with its source shown. No media provider is connected yet, so every category is honestly NOT_CONNECTED and shows no results — nothing is invented to fill them, and result counts are never hard-coded."),
      mediaList,
      routesSection,
      geoSection,
      transitSection,
      U.el("div", { class: "globe-controls globe-live-actions" }, [findMoreBtn]),
      liveNote
    ]);
    root.appendChild(livePanel);

    // ---- Full-Screen World Shell: the two rolls ON the map ---------
    // Assembled here, once every control exists. The elements are
    // the SAME nodes with the SAME handlers wired below — only
    // their parents change (appendChild reparents). The bottom
    // roll joins the visual BEFORE the top roll and the truth
    // label is its first DOM child, so the truth label keeps its
    // long-standing position as the first .api-meta inside the
    // visual; flex `order` (css/style.css), not DOM order, lays
    // the roll out visually: actions line, note, truth line last.
    var readoutLine = U.el("div", { class: "globe-roll__layers", role: "status" }, "");
    var topRoll = U.el("div", { class: "globe-roll globe-roll--top", "aria-label": "Globe controls" }, []);
    var bottomRoll = U.el("div", { class: "globe-roll globe-roll--bottom", "aria-label": "Live World area actions and readouts" }, []);
    bottomRoll.appendChild(truthLabel);
    bottomRoll.appendChild(U.el("div", { class: "globe-roll__main" }, [readoutLine, routeLine, searchAreaBtn, findMoreBtn, exploreAreaBtn]));
    bottomRoll.appendChild(liveNote);
    visual.appendChild(bottomRoll);
    // Explore overlay rides ON the map, above the canvas and
    // below the rolls (CSS z-order): the guide bar under the
    // top roll, the arrow pad at the right-centre — clear of
    // the STAR launcher (bottom-right) and the Presence card
    // (bottom-left), both of which live at app level.
    visual.appendChild(exploreOverlay);
    function rollGroup(children) {
      var g = U.el("div", { class: "globe-roll__group" }, []);
      children.forEach(function (c) { if (c) g.appendChild(c); });
      return g;
    }
    topRoll.appendChild(rollGroup([layerControls.querySelector(".globe-controls__heading"), layerTabs]));
    topRoll.appendChild(rollGroup([exploreBtn, meBtn]));
    topRoll.appendChild(rollGroup([zoomOutBtn, zoomReadout, zoomInBtn, resetBtn]));
    topRoll.appendChild(rollGroup([modeTabs]));
    topRoll.appendChild(rollGroup([lensHeading, lensTabs]));
    topRoll.appendChild(rollGroup([toggleBtns.SECURITY_ALERTS, toggleBtns.OPPORTUNITIES, toggleBtns.BOT_ACTIVITY]));
    topRoll.appendChild(rollGroup([detailsBtn, fsBtn]));
    topRoll.appendChild(rollGroup([modeNoteEl]));
    visual.appendChild(topRoll);

    // ---- Overlay anchoring: the roll publishes its height ----------
    // Since the top roll WRAPS, its height is a runtime quantity
    // (one line at wide widths, many on a phone), and the two
    // top-anchored overlays — the Explore guide bar and the Alert
    // Mode banner — cannot be calibrated to a constant. The roll
    // therefore PUBLISHES its measured height as --globe-roll-top-h
    // on the visual (the shared positioning context both overlays
    // anchor to), and their CSS consumes it with the original
    // designed clearances. A ResizeObserver refires exactly when
    // wrapping changes the height (viewport resize, badge text,
    // mode note). The Explore chips row and result card stack
    // inside .globe-explore__top, so they ride the same anchor.
    // If the browser has no ResizeObserver the variable is never
    // set and the CSS px fallbacks reproduce the pre-wrap offsets
    // — no regression path. Standing rule: any future
    // top-anchored Globe overlay consumes --globe-roll-top-h,
    // never a new fixed top constant.
    function publishRollHeight() {
      try {
        var h = topRoll.offsetHeight;
        // A not-yet-laid-out roll reads 0; skip it so the CSS
        // fallback stands until a real measurement exists.
        if (h > 0) visual.style.setProperty("--globe-roll-top-h", h + "px");
      } catch (e) {}
    }
    publishRollHeight();
    if (rollHeightObserver) {
      try { rollHeightObserver.disconnect(); } catch (e) {}
      rollHeightObserver = null;
    }
    if (typeof global.ResizeObserver === "function") {
      try {
        rollHeightObserver = new global.ResizeObserver(function () { publishRollHeight(); });
        rollHeightObserver.observe(topRoll);
      } catch (e) { rollHeightObserver = null; }
    }
    // The two Live World action wrappers in the panel are empty
    // now (their buttons live in the bottom roll) — remove them
    // so the panel keeps no dead gaps.
    livePanel.querySelectorAll(".globe-live-actions").forEach(function (w) {
      if (!w.children.length) w.remove();
    });

    // ---- Refreshers ---------------------------------------------------
    // Live World Build 1: the zoom controls drive the engine's
    // REAL view transform (centre + scale over the vendored data).
    // The readout names the current tier and scale and keeps the
    // honesty line: this is view zoom on coarse local outlines —
    // not satellite imagery, not street-level detail. The engine's
    // onViewChange callback keeps the readout true for wheel,
    // drag and pinch zooms too.
    function syncViewUI() {
      var v = null;
      try { if (globeEngine && typeof globeEngine.getView === "function") v = globeEngine.getView(); } catch (e) {}
      if (!v) {
        zoomReadout.textContent = "Map view unavailable — the map engine did not start.";
        zoomOutBtn.disabled = true;
        zoomInBtn.disabled = true;
        return;
      }
      zoomReadout.textContent = "View: " + v.tier + " tier · " +
        (Math.round(v.scale * 10) / 10) + "× — real view zoom on the local map data (not satellite, not street level)";
      zoomOutBtn.disabled = v.scale <= v.minScale;
      zoomInBtn.disabled = v.scale >= v.maxScale;
      // The Area Selector follows the view tier (COUNTRY or
      // deeper presents it) — tracked here because every view
      // change, however driven, funnels through this readout.
      if (v.tier !== currentTier) {
        currentTier = v.tier;
        updateSelectorVisibility();
      }
      // Alert-area glows track the real view transform.
      positionAlertGlows();
      // Earthquake markers track it too (real coordinates).
      positionQuakeMarkers();
    }

    function refreshModeUI() {
      // The mode class rides on the stage as well as the visual, so
      // the existing .globe-mode-<mode> .globe-mode-note descendant
      // rules keep matching the note in the controls row.
      stage.className = "globe-stage globe-mode-" + mode.toLowerCase();
      visual.className = "globe-visual globe-mode-" + mode.toLowerCase();
      applyTruthLabel();
      refreshModeNote();
      modeTabs.querySelectorAll(".mti6-tab").forEach(function (x) {
        var active = x.getAttribute("data-mode") === mode;
        // add/remove instead of classList.toggle: identical in a real
        // browser, and works in a minimal stub DOM without toggle.
        if (active) x.classList.add("mti6-tab--active"); else x.classList.remove("mti6-tab--active");
        x.setAttribute("aria-pressed", active ? "true" : "false");
      });
      refreshHeader();
      plotGlobe();
      refreshAlertMode();
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
      byId.EARTHQUAKES = quakeLayer; // module-local layer, merged for the chips
      byId.TRANSIT = transitLayer; // module-local layer, merged for the chips
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
      plotGlobe();
      refreshAlertMode();
      refreshQuakeMarkers();
      refreshTransitMarkers();
      // Lens badges and the coverage GLOBAL row read the same
      // layer states — they refresh with the layers, including
      // the async graph swap, so they can never drift apart.
      refreshLensUI();
      renderCoverage();
      // Bottom-roll readout line: the same live derivation the
      // SEARCH THIS AREA layers card uses — never hard-coded.
      try { readoutLine.textContent = layerCountsLine(); } catch (e) {}
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
      try { if (globeEngine && typeof globeEngine.zoomOut === "function") globeEngine.zoomOut(); } catch (e) {}
      syncViewUI();
    });
    zoomInBtn.addEventListener("click", function () {
      try { if (globeEngine && typeof globeEngine.zoomIn === "function") globeEngine.zoomIn(); } catch (e) {}
      syncViewUI();
    });

    resetBtn.addEventListener("click", function () {
      mode = "WORLD";
      setMode("WORLD");
      selectedLayer = "WORLD";
      try { if (globeEngine && typeof globeEngine.resetView === "function") globeEngine.resetView(); } catch (e) {}
      refreshModeUI();
      refreshLayerUI();
      syncViewUI();
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

    // ---- Engine interaction wiring (Live World Build 1) --------------
    // Taps on the map set the location context; any view change
    // (buttons, wheel, drag, pinch) keeps the readout truthful.
    if (globeEngine && typeof globeEngine.setInteractionHandlers === "function") {
      try {
        globeEngine.setInteractionHandlers({
          onTap: function (pick) {
            // A destination capture consumes the tap as the
            // route's destination; the location context (the
            // origin) is deliberately left standing.
            if (travelState.capturing) { completeDestination(pick); return; }
            setContextFromPick(pick);
          },
          onViewChange: function () { syncViewUI(); }
        });
      } catch (e) {}
    }

    // ---- Initial paint --------------------------------------------------
    syncViewUI();
    renderContext();
    refreshRoutesUI();
    refreshModeUI();
    refreshLayerUI();

    // Swap in the World Engine graph-derived layers when ready.
    try {
      var GI9 = global.GlobeIntelligence;
      if (GI9 && typeof GI9.listLayersLive === "function") {
        GI9.listLayersLive().then(function (layers) {
          if (Array.isArray(layers) && layers.length) {
            liveLayers = layers;
            refreshLayerUI();
          }
        }).catch(function () {});
      }
    } catch (e) {}

    // Cold-load consistency (owner fix, 2026-11-15): the graph swap
    // above can collect BEFORE the boot import finishes registering
    // entities — app.js starts EncyclopediaImport.importAll() in the
    // background by design, and registration happens inside that run —
    // leaving this first paint holding a pre-registration snapshot
    // (World 4 / Crypto 38) for the whole session. importAll() hands
    // every concurrent caller the ONE shared in-flight boot run, so
    // awaiting it here uses the existing completion signal: no
    // polling, no timers, no duplicate import. When it settles,
    // re-collect ONCE and swap only if the layers actually changed,
    // so a warm paint is never repainted needlessly. Counts are
    // always derived from the fresh collection — nothing hard-coded.
    try {
      var EI = global.EncyclopediaImport;
      if (EI && typeof EI.importAll === "function" &&
          GI9 && typeof GI9.listLayersLive === "function") {
        EI.importAll().then(function () {
          return GI9.listLayersLive();
        }).then(function (layers) {
          if (!Array.isArray(layers) || !layers.length) return;
          if (typeof root.isConnected === "boolean" && !root.isConnected) return;
          var changed = !liveLayers || liveLayers.length !== layers.length;
          for (var i = 0; !changed && i < layers.length; i++) {
            var a = layers[i], b = liveLayers[i];
            if (!a || !b || a.id !== b.id || a.state !== b.state || a.count !== b.count ||
                (a.items || []).length !== (b.items || []).length) changed = true;
          }
          if (changed) {
            liveLayers = layers;
            refreshLayerUI();
          }
        }).catch(function () {});
      }
    } catch (e) {}

    // ---- Weather (real live public data, via the Capability Router) ---
    // Same panel, same honesty: the reading now comes through
    // WorldData.weather, so US points are answered by the National
    // Weather Service and the output names the provider that
    // ACTUALLY answered — never a hard-coded source.
    var lat = U.el("input", { class: "price-input", type: "text", value: "40.71", "aria-label": "Latitude" });
    var lon = U.el("input", { class: "price-input", type: "text", value: "-74.00", "aria-label": "Longitude" });
    var btn = U.el("button", { class: "btn btn-primary", type: "button" }, "Load weather");
    var out = U.el("div", { class: "api-meta" }, "Enter latitude/longitude (default: New York City) and tap Load weather.");
    btn.addEventListener("click", function () {
      var la = parseFloat(lat.value), lo = parseFloat(lon.value);
      var PR = global.ProviderRouter;
      if (!PR || !PR.WorldData || typeof PR.WorldData.weather !== "function") {
        out.textContent = "Weather is NOT_CONNECTED — the Capability Router did not load (NOT_LOADED), so no provider was asked.";
        return;
      }
      out.textContent = "Loading weather…";
      PR.WorldData.weather(la, lo).then(function (res) {
        if (!res || !res.observations || !res.observations.length) {
          out.textContent = "No weather data for those coordinates (" + chainSummary(res || {}) + "). Nothing is shown rather than invented.";
          return;
        }
        var o = res.observations[0], d = o.details || {};
        var reading = d.shortForecast
          ? o.value + o.unit + " — " + d.shortForecast
          : o.value + o.unit + ", wind " + d.windSpeedKmh + " km/h, direction " + d.windDirectionDeg + "°";
        out.textContent = "Now: " + reading + " · " + res.provider + " · " + fmtTime(o.observedAt) +
          (res.freshnessState === "LAST_KNOWN" ? " · LAST_KNOWN (the chain could not answer just now — this is the last known reading, not current)" : "") +
          (res.fallbackPosition > 0 ? " · fallback (" + chainSummary(res) + ")" : "");
      }).catch(function () {
        out.textContent = "The weather capability failed unexpectedly. Check the coordinates and try again.";
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
