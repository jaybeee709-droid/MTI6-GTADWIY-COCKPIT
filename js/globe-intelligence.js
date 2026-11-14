/* MTI6-GTADWIY-COCKPIT — World Globe Intelligence Layers (§44 item 14)
 * (continuous development campaign)
 *
 * Five intelligence layers for the World Globe home screen (#/globe):
 *   WORLD, CRYPTO, OPPORTUNITIES, BOT_ACTIVITY, SECURITY_ALERTS.
 *
 * Truth rules enforced here (do not weaken them):
 * - Layer data comes ONLY from real registries. Nothing is invented:
 *   no fabricated points, no fake locations, no invented prices, no
 *   invented opportunities, no invented bot activity, no invented alerts.
 * - WORLD: NetworkIntelligence networks — names/ids only. Networks are
 *   logical nodes (network id + VM family), NEVER geographic locations.
 *   The registry's example networks are structural examples: they are
 *   shown with their real verificationStatus (UNVERIFIED) and source
 *   ("structural-example"), never promoted to verified live networks.
 * - CRYPTO: AssetIntelligence asset classes (fallback: CryptoWorld
 *   ASSET_CLASSES) — classes and counts only, never invented prices.
 * - OPPORTUNITIES: OpportunityIntelligence — QUALIFIED opportunities
 *   only. Qualified means the normalised record is VERIFIED (source +
 *   checkedAt present — normalisation downgrades a VERIFIED claim
 *   without provenance to UNVERIFIED) and not stale. Anything else is
 *   not listed; INFORMATIONAL never implies TRANSACTIONAL.
 * - BOT_ACTIVITY: BotOpsModel / WorkerEngine — real counts only. No
 *   worker runtime exists, so workers active is always 0 and the layer
 *   is NOT_CONNECTED until a real runtime reports. Stored worker-task
 *   record counts are reported as counts, never as live activity.
 * - SECURITY_ALERTS: AngelSecurity — real alerts only. Empty means
 *   NO_ALERTS. Every real alert appears as an item with its true
 *   lifecycle state, but only a VERIFIED-and-active alert turns its
 *   representation alarm red: "verified" means the alert walked past
 *   VERIFYING to CONFIRMED or beyond through a recorded transition
 *   (the same rule AngelSecurity.summary() uses for confirmedCount),
 *   and "active" means not yet RESOLVED / POST_INCIDENT_REVIEW.
 *   A DETECTED or VERIFYING (unverified) alert is shown in its true
 *   state with alarm=false — it never turns anything red.
 * - An empty layer returns { state: "NOT_CONNECTED" | "NO_DATA" |
 *   "NO_ALERTS", items: [] }. A missing source registry returns
 *   NOT_LOADED, never a crash.
 * - Never fabricate geographic locations for blockchain / API / model /
 *   software incidents: use logical network nodes, routes, system
 *   overlays, and provider/chain indicators instead. No layer item
 *   carries latitude, longitude, coordinates, or any geography.
 * - Every layer item carries { id, label, kind, state, source,
 *   checkedAt } plus alarm (boolean). checkedAt is an ISO timestamp
 *   when the source record was last checked, or null when the source
 *   record was never checked (null is honest; a timestamp is never
 *   invented). source is always a non-empty string naming the registry
 *   the item came from.
 *
 * Colour rule: normal state is electric blue (#00BFFF, the app's
 * electric-blue token). Alarm red (#ff5c5c, the app's --red token) is
 * used ONLY for the representation of a single VERIFIED-and-active
 * alert item — never for the whole Globe, never for a warning, never
 * for an unverified alert. See colorFor(item).
 *
 * Pure data module: no DOM, no network, no secrets, no storage.
 * Load order for the page (after the registries it reads):
 *   js/truth.js -> js/angel-security.js -> js/network-intelligence.js
 *   -> js/opportunity-intelligence.js -> js/globe-intelligence.js
 * (CryptoWorld / AssetIntelligence / BotOpsModel / WorkerEngine are
 * read when present; all are behind guards.)
 *
 *   GlobeIntelligence.LAYERS / COLORS
 *   GlobeIntelligence.listLayers() / getLayer(id)
 *   GlobeIntelligence.setLayerEnabled(id, enabled)
 *   GlobeIntelligence.isVerifiedActiveAlert(alert)
 *   GlobeIntelligence.colorFor(item)
 *   GlobeIntelligence.layerHasAlarm(id)
 */
(function (global) {
  "use strict";

  // ---- Colour tokens (the app's existing tokens) ------------------------
  // Electric blue for normal state; the app's --red (#ff5c5c) for a
  // verified active alert only. Neither value is invented: both are
  // already in use in css/style.css.
  var COLORS = {
    ELECTRIC_BLUE: "#00BFFF",
    ALARM_RED: "#ff5c5c"
  };

  // ---- Layer definitions --------------------------------------------------
  var LAYER_DEFS = [
    { id: "WORLD", label: "World", source: "NetworkIntelligence" },
    { id: "CRYPTO", label: "Crypto", source: "AssetIntelligence / CryptoWorld" },
    { id: "OPPORTUNITIES", label: "Opportunities", source: "OpportunityIntelligence" },
    { id: "BOT_ACTIVITY", label: "Bot Activity", source: "BotOpsModel / WorkerEngine" },
    { id: "SECURITY_ALERTS", label: "Security Alerts", source: "AngelSecurity" }
  ];

  // Layer states. NOT_LOADED: the source registry is absent.
  // NOT_CONNECTED: the registry is present but no live/runtime
  // connection exists (BOT_ACTIVITY until a real runtime reports).
  // NO_DATA: registry present, zero records. NO_ALERTS: the security
  // special case of NO_DATA (no alerts recorded). ACTIVE: the layer
  // has items. UNVERIFIED: the layer has items but none is verified
  // (SECURITY_ALERTS with only DETECTED/VERIFYING alerts).
  var LAYER_STATES = ["NOT_LOADED", "NOT_CONNECTED", "NO_DATA",
    "NO_ALERTS", "ACTIVE", "UNVERIFIED", "DISABLED"];

  // Alert lifecycle states that count as "verified": the alert walked
  // past VERIFYING to CONFIRMED or beyond through a recorded
  // transition — the same rule AngelSecurity.summary() uses for
  // confirmedCount. RESOLVED / POST_INCIDENT_REVIEW are verified but
  // no longer active, so they are not alarms.
  var VERIFIED_ALERT_STATES = ["CONFIRMED", "ACTIVE", "MITIGATING"];

  // Per-layer enable flags. All layers start enabled; the Globe
  // screen toggles them. Stored in memory only (a view preference,
  // not cockpit data).
  var enabled = {};
  LAYER_DEFS.forEach(function (d) { enabled[d.id] = true; });

  function nowIso() {
    return new Date().toISOString();
  }

  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim() !== "";
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  // ---- Item construction --------------------------------------------------
  // Every item carries id, label, kind, state, source, checkedAt,
  // plus alarm (false unless a verified active alert). checkedAt is
  // the source record's own timestamp or null (never checked) — a
  // timestamp is never invented here.

  function makeItem(id, label, kind, state, source, checkedAt) {
    return {
      id: String(id),
      label: String(label),
      kind: String(kind),
      state: isNonEmptyString(state) ? String(state) : "UNKNOWN",
      source: isNonEmptyString(source) ? String(source) : "unknown",
      checkedAt: isNonEmptyString(checkedAt) ? String(checkedAt) : null,
      alarm: false
    };
  }

  function layerShell(def, state, items, note, extra) {
    var layer = {
      id: def.id,
      label: def.label,
      enabled: !!enabled[def.id],
      state: state,
      items: items || [],
      count: (items || []).length,
      hasAlarm: (items || []).some(function (it) { return it.alarm === true; }),
      note: note || "",
      checkedAt: nowIso()
    };
    if (extra && typeof extra === "object") {
      Object.keys(extra).forEach(function (k) { layer[k] = clone(extra[k]); });
    }
    return layer;
  }

  function findDef(id) {
    for (var i = 0; i < LAYER_DEFS.length; i++) {
      if (LAYER_DEFS[i].id === id) return LAYER_DEFS[i];
    }
    return null;
  }

  // ---- WORLD --------------------------------------------------------------
  // NetworkIntelligence networks: names/ids only, as logical nodes.
  // No geography is read, stored, or emitted — a network record has
  // no location fields, and none is added here.

  function buildWorld(def) {
    var NI = global.NetworkIntelligence;
    if (!NI) {
      return layerShell(def, "NOT_LOADED", [],
        "NetworkIntelligence did not load — no network registry is available.");
    }
    var networks = [];
    try {
      if (Array.isArray(NI.EXAMPLE_NETWORKS)) networks = NI.EXAMPLE_NETWORKS.slice();
    } catch (e) {
      return layerShell(def, "NOT_CONNECTED", [],
        "NetworkIntelligence could not be read.");
    }
    if (!networks.length) {
      return layerShell(def, "NO_DATA", [],
        "No networks are recorded in NetworkIntelligence.");
    }
    var items = networks.map(function (n) {
      if (!n || !isNonEmptyString(n.id)) return null;
      var item = makeItem(
        n.id,
        (isNonEmptyString(n.name) ? n.name : n.id) +
          (isNonEmptyString(n.vm) ? " (" + n.vm + ")" : ""),
        "NETWORK",
        isNonEmptyString(n.verificationStatus) ? n.verificationStatus : "UNKNOWN",
        isNonEmptyString(n.source) ? n.source : "NetworkIntelligence registry",
        (n.freshness && n.freshness.lastChecked) || n.lastChecked || null
      );
      // Logical node identity only: family + VM, never a place.
      item.node = "network:" + n.id;
      if (isNonEmptyString(n.familyId)) item.familyId = n.familyId;
      return item;
    }).filter(function (it) { return it !== null; });
    if (!items.length) {
      return layerShell(def, "NO_DATA", [],
        "No usable network records in NetworkIntelligence.");
    }
    return layerShell(def, "ACTIVE", items,
      "Logical network nodes from the NetworkIntelligence registry. " +
      "Example networks are structural examples (UNVERIFIED), not verified live networks. " +
      "No geographic locations are shown: networks are nodes, not places.",
      { networks: items.length });
  }

  // ---- CRYPTO -------------------------------------------------------------
  // AssetIntelligence asset classes (fallback: CryptoWorld
  // ASSET_CLASSES). Classes and counts only — never prices, never
  // balances, never returns.

  function buildCrypto(def) {
    var AI = global.AssetIntelligence;
    var CW = global.CryptoWorld;
    var items = [];
    var sourceNote = "";
    if (AI && typeof AI.listClasses === "function") {
      var classes = [];
      try { classes = AI.listClasses() || []; } catch (e) { classes = []; }
      items = classes.filter(function (c) {
        return c && isNonEmptyString(c.id);
      }).map(function (c) {
        return makeItem(c.id,
          isNonEmptyString(c.label) ? c.label : c.id,
          "ASSET_CLASS", "UNVERIFIED",
          "AssetIntelligence registry", null);
      });
      sourceNote = "Asset classes from the AssetIntelligence registry.";
    } else if (CW && Array.isArray(CW.ASSET_CLASSES)) {
      items = CW.ASSET_CLASSES.filter(isNonEmptyString).map(function (name, i) {
        return makeItem("asset-class-" + i, name,
          "ASSET_CLASS", "UNVERIFIED",
          "CryptoWorld registry", null);
      });
      sourceNote = "Asset classes from the CryptoWorld registry (AssetIntelligence not loaded).";
    } else {
      return layerShell(def, "NOT_LOADED", [],
        "Neither AssetIntelligence nor CryptoWorld loaded — no asset-class registry is available.");
    }
    if (!items.length) {
      return layerShell(def, "NO_DATA", [],
        "No asset classes are recorded.");
    }
    return layerShell(def, "ACTIVE", items,
      sourceNote + " Classes and counts only — no prices, balances, or returns are shown.",
      { assetClasses: items.length });
  }

  // ---- OPPORTUNITIES ------------------------------------------------------
  // OpportunityIntelligence — QUALIFIED opportunities only. Qualified
  // means the normalised record is VERIFIED (source + checkedAt
  // present; normalisation downgrades a VERIFIED claim without
  // provenance to UNVERIFIED) and not stale. Unqualified records are
  // not listed at all — they are not opportunities the Globe can
  // show, and listing them would imply an endorsement that does not
  // exist. INFORMATIONAL never implies TRANSACTIONAL.

  function isQualifiedOpportunity(op) {
    if (!op || typeof op !== "object") return false;
    var OI = global.OpportunityIntelligence;
    var view = op;
    if (OI && typeof OI.normalizeOpportunity === "function") {
      try { view = OI.normalizeOpportunity(op); } catch (e) { view = op; }
    }
    if (view.verificationStatus !== "VERIFIED") return false;
    if (view.freshness === "stale") return false;
    return true;
  }

  function buildOpportunities(def) {
    var OI = global.OpportunityIntelligence;
    if (!OI || typeof OI.listOpportunities !== "function") {
      return layerShell(def, "NOT_LOADED", [],
        "OpportunityIntelligence did not load — no opportunity registry is available.");
    }
    var all = [];
    try { all = OI.listOpportunities() || []; } catch (e) {
      return layerShell(def, "NOT_CONNECTED", [],
        "OpportunityIntelligence could not be read.");
    }
    var qualified = all.filter(isQualifiedOpportunity);
    if (!qualified.length) {
      return layerShell(def, "NO_DATA", [],
        all.length === 0
          ? "No opportunities are recorded in OpportunityIntelligence."
          : all.length + " opportunity record(s) exist, but none is qualified " +
            "(VERIFIED with source + checkedAt, and not stale) — so none is shown.",
        { recorded: all.length, qualified: 0 });
    }
    var items = qualified.map(function (op) {
      var view = op;
      try {
        if (typeof OI.normalizeOpportunity === "function") view = OI.normalizeOpportunity(op);
      } catch (e) {}
      var label = isNonEmptyString(view.strategyId) ? view.strategyId : view.id;
      if (isNonEmptyString(view.majorActivityId) && label !== view.majorActivityId) {
        label = view.majorActivityId + " / " + label;
      }
      var item = makeItem(view.id, label, "OPPORTUNITY",
        view.verificationStatus || "UNVERIFIED",
        isNonEmptyString(view.source) ? view.source : "OpportunityIntelligence registry",
        view.checkedAt || view.lastChecked || view.fetchedAt || null);
      if (view.networkRef && isNonEmptyString(view.networkRef.networkId)) {
        item.networkId = view.networkRef.networkId;
      }
      if (view.assetRef && isNonEmptyString(view.assetRef.assetClassId)) {
        item.assetClassId = view.assetRef.assetClassId;
      }
      return item;
    });
    return layerShell(def, "ACTIVE", items,
      "Qualified opportunities only (VERIFIED with source + checkedAt, not stale). " +
      "Showing an opportunity is informational only — it never implies authorisation to act on it.",
      { recorded: all.length, qualified: items.length });
  }

  // ---- BOT_ACTIVITY -------------------------------------------------------
  // BotOpsModel / WorkerEngine — real counts only. No worker runtime
  // exists, so workers active is always 0 and the layer stays
  // NOT_CONNECTED until a real runtime reports. Stored worker-task
  // records are counted (total + by state) but never presented as
  // live activity: an ACTIVE task record is a model state, not a
  // live worker (BotOpsModel.isLiveActive() is always false).

  function buildBotActivity(def) {
    var BOM = global.BotOpsModel;
    var WE = global.WorkerEngine;
    if (!BOM && !WE) {
      return layerShell(def, "NOT_LOADED", [],
        "Neither BotOpsModel nor WorkerEngine loaded — no bot registry is available.");
    }
    var workersActive = 0;
    var workersState = "NOT_CONNECTED";
    try {
      if (WE && typeof WE.getWorkersActive === "function") {
        var wa = WE.getWorkersActive();
        if (wa && typeof wa === "object") {
          workersActive = typeof wa.count === "number" ? wa.count : 0;
          workersState = isNonEmptyString(wa.state) ? wa.state : "NOT_CONNECTED";
        }
      } else if (BOM && typeof BOM.getWorkersActive === "function") {
        var ba = BOM.getWorkersActive();
        if (ba && typeof ba === "object") {
          workersActive = typeof ba.count === "number" ? ba.count : 0;
          workersState = isNonEmptyString(ba.state) ? ba.state : "NOT_CONNECTED";
        }
      }
    } catch (e) {
      workersActive = 0;
      workersState = "NOT_CONNECTED";
    }
    var tasksTotal = 0;
    var tasksByState = {};
    var tasksActive = 0;
    try {
      if (BOM && typeof BOM.summary === "function") {
        var s = BOM.summary();
        if (s && typeof s === "object") {
          tasksTotal = typeof s.total === "number" ? s.total : 0;
          tasksByState = (s.byState && typeof s.byState === "object") ? s.byState : {};
          // s.active is the LIVE count (always 0 without a runtime),
          // never the count of ACTIVE-state records.
          tasksActive = typeof s.active === "number" ? s.active : 0;
        }
      }
    } catch (e) {}
    var workerRecords = 0;
    try {
      if (WE && typeof WE.summary === "function") {
        var ws = WE.summary();
        if (ws && typeof ws === "object") {
          workerRecords = typeof ws.recordsCount === "number" ? ws.recordsCount : 0;
        }
      }
    } catch (e) {}
    // No live runtime, so no live activity items exist — even when
    // stored task records exist, they are records, not activity.
    // The counts below are the honest report.
    return layerShell(def, "NOT_CONNECTED", [],
      "No worker runtime is connected — no bot is live. " +
      "Workers active: 0. Stored worker-task records: " + tasksTotal +
      " (records only, not live activity).",
      {
        workersActive: workersActive,
        workersState: workersState,
        tasksTotal: tasksTotal,
        tasksByState: tasksByState,
        tasksActive: tasksActive,
        workerRecords: workerRecords
      });
  }

  // ---- SECURITY_ALERTS ----------------------------------------------------
  // AngelSecurity — real alerts only. Empty means NO_ALERTS. Every
  // real alert appears as an item with its true lifecycle state, but
  // alarm=true ONLY for a verified-and-active alert (see
  // isVerifiedActiveAlert). A DETECTED/VERIFYING alert never turns
  // its representation red, and a RESOLVED alert is history, not an
  // alarm. No geographic location is ever attached to an alert: the
  // item names the affected system / domain (a logical node), never
  // a place.

  function isVerifiedActiveAlert(alert) {
    if (!alert || typeof alert !== "object") return false;
    return VERIFIED_ALERT_STATES.indexOf(alert.state) !== -1;
  }

  function buildSecurityAlerts(def) {
    var AS = global.AngelSecurity;
    if (!AS || typeof AS.listAlerts !== "function") {
      return layerShell(def, "NOT_LOADED", [],
        "AngelSecurity did not load — no alert registry is available.");
    }
    var alerts = [];
    try { alerts = AS.listAlerts() || []; } catch (e) {
      return layerShell(def, "NOT_CONNECTED", [],
        "AngelSecurity could not be read.");
    }
    if (!alerts.length) {
      return layerShell(def, "NO_ALERTS", [],
        "No alerts recorded — no live alert feed is connected, so no alert is claimed.");
    }
    var items = alerts.filter(function (a) {
      return a && isNonEmptyString(a.id);
    }).map(function (a) {
      var item = makeItem(a.id,
        (isNonEmptyString(a.title) ? a.title : a.id) +
          (isNonEmptyString(a.severity) ? " [" + a.severity + "]" : ""),
        "SECURITY_ALERT",
        isNonEmptyString(a.state) ? a.state : "UNKNOWN",
        isNonEmptyString(a.source) ? a.source : "AngelSecurity registry",
        a.detectedAt || a.lastUpdated || a.createdAt || null);
      item.alarm = isVerifiedActiveAlert(a);
      if (isNonEmptyString(a.domain)) item.domain = a.domain;
      if (isNonEmptyString(a.severity)) item.severity = a.severity;
      if (isNonEmptyString(a.alertClass)) item.alertClass = a.alertClass;
      // Logical system identity only — never a geographic location.
      if (isNonEmptyString(a.affectedSystem)) item.affectedSystem = a.affectedSystem;
      return item;
    });
    var anyAlarm = items.some(function (it) { return it.alarm === true; });
    var verifiedCount = items.filter(function (it) {
      return VERIFIED_ALERT_STATES.indexOf(it.state) !== -1;
    }).length;
    return layerShell(def, anyAlarm ? "ACTIVE" : "UNVERIFIED", items,
      anyAlarm
        ? verifiedCount + " verified active alert(s) — shown in alarm red. " +
          "Unverified alerts are shown in their true state and never turn red."
        : items.length + " alert(s) recorded, none verified-and-active — " +
          "no representation is alarm red.",
      { alerts: items.length, verifiedActive: verifiedCount });
  }

  // ---- Public API -----------------------------------------------------------

  var BUILDERS = {
    WORLD: buildWorld,
    CRYPTO: buildCrypto,
    OPPORTUNITIES: buildOpportunities,
    BOT_ACTIVITY: buildBotActivity,
    SECURITY_ALERTS: buildSecurityAlerts
  };

  function getLayer(id) {
    var def = findDef(id);
    if (!def) return null;
    try {
      var layer = BUILDERS[id](def);
      // A disabled layer keeps its computed state but reports
      // enabled:false, so the UI can grey it out without hiding
      // the honest state behind it.
      layer.enabled = !!enabled[id];
      return layer;
    } catch (e) {
      return layerShell(def, "NOT_CONNECTED", [],
        "The " + def.label + " layer could not be read (" +
        (e && e.message ? e.message : "unknown error") + ").");
    }
  }

  function listLayers() {
    return LAYER_DEFS.map(function (d) { return getLayer(d.id); });
  }

  function setLayerEnabled(id, value) {
    if (!findDef(id)) return false;
    enabled[id] = value === true;
    return true;
  }

  // Alarm red ONLY for the representation of a single verified active
  // alert item. Everything else — including unverified alerts,
  // warnings, and every other layer — is electric blue.
  function colorFor(item) {
    if (item && item.alarm === true) return COLORS.ALARM_RED;
    return COLORS.ELECTRIC_BLUE;
  }

  function layerHasAlarm(id) {
    var layer = getLayer(id);
    return !!layer && layer.hasAlarm === true;
  }

  global.GlobeIntelligence = {
    LAYERS: LAYER_DEFS.map(function (d) { return d.id; }),
    LAYER_STATES: LAYER_STATES.slice(),
    COLORS: { ELECTRIC_BLUE: COLORS.ELECTRIC_BLUE, ALARM_RED: COLORS.ALARM_RED },
    listLayers: listLayers,
    getLayer: getLayer,
    setLayerEnabled: setLayerEnabled,
    isVerifiedActiveAlert: isVerifiedActiveAlert,
    colorFor: colorFor,
    layerHasAlarm: layerHasAlarm
  };
})(typeof globalThis !== "undefined" ? globalThis :
  (typeof window !== "undefined" ? window : this));
