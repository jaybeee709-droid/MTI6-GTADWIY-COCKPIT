/* MTI6-GTADWIY-COCKPIT — Bot Operations shell (master shell, Build 1;
 * Bot Operations Advancement, continuous development campaign)
 *
 * Four conceptual sections: STAR, TRIBES, WORKERS, LIVE WORK — plus
 * Wallet task templates and an Angel Security summary.
 *
 * Identity rules, enforced here: STAR is the main persistent named
 * assistant. The 12 Tribe principals are persistent named principal
 * agents — the drawer shows the CANONICAL principals (JUDAH, REUBEN,
 * GAD, ASHER, NAPHTALI, MANASSEH, SIMEON, LEVI, ISSACHAR, ZEBULUN,
 * JOSEPH, BENJAMIN, Revelation 7 order, stable ids tribe-judah …
 * tribe-benjamin) from TribePrincipals when it is loaded, with the
 * same roster as a closed fallback when it is not. Assignment state
 * still comes from BotOpsModel (describeBot on a reconciled slot): a
 * principal with no real assignment shows UNASSIGNED, never an
 * invented role. Task workers are dynamically scalable named workers;
 * none are live. Role labels (Research, Risk, Yield, Routing,
 * Security, Builder, Analysis, Monitoring) are assignment labels, NOT
 * bot names, and no bot is renamed after its assignment.
 *
 * Nothing is fabricated: with no worker orchestration connected, the
 * screen shows truthful empty / not-connected states. WORKERS ACTIVE
 * is always 0 / NOT_CONNECTED — the count is never derived from a
 * queued task, a UI card, or a saved object. Financial fields (gross,
 * fees, gain, loss, net) appear only where real tracked data exists —
 * there is none yet, so they are stated as absent, not zero. Detail
 * views carry every spec field, UNKNOWN / null when not known.
 *
 * Presentation modes: LIVE DATA and COMMAND THEATER show the SAME real
 * underlying data. Theater is a cinematic view of that data, never a
 * separate truth source, and never fake workers, conversations, results,
 * or missions.
 *
 * Wallet task templates are TEMPLATES only: a task appears in the list
 * only when created through BotOpsModel.createWorkerTask (the Create
 * button on a template). Templates alone create nothing. The same
 * holds for the crypto task templates (one per crypto analysis role,
 * Crypto spec C7): buildCryptoTaskTemplates lists them,
 * createCryptoTaskFromTemplate creates from one.
 *
 * "Bring <principal>" buttons call Participants.openPrincipal when
 * the Participants global provides it; when it does not, the button
 * shows a "participant window unavailable" state and does nothing —
 * never a crash. (Participants is built by the parallel
 * multi-participant unit; this screen only probes for it.)
 *
 * Pure data builders (no DOM) are exported on the module object for
 * tests: buildDrawerPrincipals, buildPrincipalDetail,
 * buildWorkerDetail, getWorkersActive, buildAngelSummary,
 * buildWalletTaskTemplates, createWalletTaskFromTemplate,
 * buildCryptoTaskTemplates, createCryptoTaskFromTemplate,
 * bringPrincipal, participantsAvailable.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  var MODE_KEY = "mti6_botops_mode_v1";
  var detailBox = null;
  var currentRoot = null;
  var selectedSlotId = null;
  var selectedWorkerId = null;
  var lastTemplateMessage = "";

  // ---- Canonical roster fallback ---------------------------------------
  // Used ONLY when TribePrincipals is not loaded. Same ids, names and
  // Revelation 7 order as js/tribe-principals.js — never a different
  // roster. Every fallback principal starts UNASSIGNED with null
  // role/task and empty history.
  var CANONICAL_PRINCIPALS = [
    { id: "tribe-judah", displayName: "JUDAH", order: 1 },
    { id: "tribe-reuben", displayName: "REUBEN", order: 2 },
    { id: "tribe-gad", displayName: "GAD", order: 3 },
    { id: "tribe-asher", displayName: "ASHER", order: 4 },
    { id: "tribe-naphtali", displayName: "NAPHTALI", order: 5 },
    { id: "tribe-manasseh", displayName: "MANASSEH", order: 6 },
    { id: "tribe-simeon", displayName: "SIMEON", order: 7 },
    { id: "tribe-levi", displayName: "LEVI", order: 8 },
    { id: "tribe-issachar", displayName: "ISSACHAR", order: 9 },
    { id: "tribe-zebulun", displayName: "ZEBULUN", order: 10 },
    { id: "tribe-joseph", displayName: "JOSEPH", order: 11 },
    { id: "tribe-benjamin", displayName: "BENJAMIN", order: 12 }
  ];

  // ---- Wallet task templates (from the governing Wallet spec) ----------
  // Templates only: no task exists until one is created through
  // BotOpsModel.createWorkerTask. Roles are BotOpsModel role labels.
  var WALLET_TASK_TEMPLATES = [
    { key: "monitor-wallet", title: "Monitor wallet", role: "Monitoring",
      description: "Watch a wallet for changes and report what is actually observed — never a fabricated balance or movement." },
    { key: "verify-balance-data", title: "Verify balance data", role: "Analysis",
      description: "Check reported balance data against its source and record whether it verified, not a new balance." },
    { key: "classify-asset", title: "Classify asset", role: "Analysis",
      description: "Classify an asset into the known taxonomy from real evidence; unknown stays unknown." },
    { key: "inspect-position", title: "Inspect position", role: "Analysis",
      description: "Inspect a position's real recorded state — size, venue and source — without inventing one." },
    { key: "analyze-opportunity", title: "Analyze opportunity", role: "Research",
      description: "Analyse an opportunity from real evidence; eligibility stays UNKNOWN without evidence." },
    { key: "check-gas", title: "Check gas", role: "Analysis",
      description: "Check the gas cost of a route from a real source; no cost is ever assumed or zeroed." },
    { key: "simulate-route", title: "Simulate route", role: "Routing",
      description: "Simulate a route in simulation state only — a simulation is never presented as an execution." },
    { key: "security-investigation", title: "Security investigation", role: "Security",
      description: "Investigate a security signal with provenance; findings are descriptive only, never transactional." }
  ];

  // ---- Crypto task templates (Crypto spec C7, §99-12) ------------------
  // Templates only: no task exists until one is created through
  // BotOpsModel.createWorkerTask. One template per crypto analysis
  // role (js/crypto-bot-assignments.js). Roles are BotOpsModel role
  // labels: each crypto role maps to the closest of the 8 closed
  // labels (Research, Risk, Yield, Routing, Security, Builder,
  // Analysis, Monitoring); the crypto role is kept on cryptoRole so
  // the mapping never loses which analysis role the task is for.
  var CRYPTO_TASK_TEMPLATES = [
    { key: "crypto-asset", title: "Analyze asset", role: "Analysis", cryptoRole: "asset",
      description: "Analyse a crypto asset from real evidence — never an invented balance, price, or holding." },
    { key: "crypto-network", title: "Analyze network", role: "Analysis", cryptoRole: "network",
      description: "Analyse a network from real evidence — never an invented chain state or activity count." },
    { key: "crypto-protocol", title: "Analyze protocol", role: "Research", cryptoRole: "protocol",
      description: "Analyse a protocol from real evidence — never an invented yield, rate, or eligibility." },
    { key: "crypto-liquidity", title: "Analyze liquidity", role: "Analysis", cryptoRole: "liquidity",
      description: "Analyse liquidity from real evidence — never an invented depth, rate, or slippage figure." },
    { key: "crypto-market", title: "Analyze market", role: "Research", cryptoRole: "market",
      description: "Analyse a market from real evidence — never an invented price, volume, or trend." },
    { key: "crypto-risk", title: "Analyze risk", role: "Risk", cryptoRole: "risk",
      description: "Analyse risk as risk DIMENSIONS only, never scores — record which dimensions apply and what is unknown about each." },
    { key: "crypto-cost", title: "Analyze cost", role: "Analysis", cryptoRole: "cost",
      description: "Analyse cost from real evidence using the approved cost vocabulary (labels only, UNKNOWN never becomes zero)." },
    { key: "crypto-wallet", title: "Analyze wallet", role: "Monitoring", cryptoRole: "wallet",
      description: "Analyse a wallet relationship from real evidence — never an invented balance or movement, never a seed phrase or private key." },
    { key: "crypto-opportunity-discovery", title: "Discover opportunity", role: "Research", cryptoRole: "opportunity-discovery",
      description: "Discover a candidate opportunity from real evidence only — a candidate is unverified until checked, never a promised return." },
    { key: "crypto-opportunity-verification", title: "Verify opportunity", role: "Analysis", cryptoRole: "opportunity-verification",
      description: "Verify a discovered opportunity against its sources and record whether it verified, with evidence." },
    { key: "crypto-routing", title: "Analyze route", role: "Routing", cryptoRole: "routing",
      description: "Analyse a route from real evidence — a route analysis is never an execution, and simulation is never presented as execution." },
    { key: "crypto-bridge", title: "Analyze bridge", role: "Routing", cryptoRole: "bridge",
      description: "Analyse a bridge from real evidence — never an invented bridge rate, time, or safety claim." },
    { key: "crypto-lending", title: "Analyze lending", role: "Analysis", cryptoRole: "lending",
      description: "Analyse a lending activity from real evidence — never an invented rate, APY, or guaranteed return." },
    { key: "crypto-staking", title: "Analyze staking", role: "Yield", cryptoRole: "staking",
      description: "Analyse a staking activity from real evidence — never an invented reward rate or guaranteed return." },
    { key: "crypto-restaking", title: "Analyze restaking", role: "Yield", cryptoRole: "restaking",
      description: "Analyse a restaking activity from real evidence — never an invented reward rate or guaranteed return." },
    { key: "crypto-yield", title: "Analyze yield", role: "Yield", cryptoRole: "yield",
      description: "Analyse a yield activity from real evidence — never an invented APY, rate, or guaranteed earning." },
    { key: "crypto-derivatives", title: "Analyze derivatives", role: "Analysis", cryptoRole: "derivatives",
      description: "Analyse a derivatives activity from real evidence — never an invented price, leverage outcome, or guaranteed profit." },
    { key: "crypto-synthetic", title: "Analyze synthetic asset", role: "Analysis", cryptoRole: "synthetic",
      description: "Analyse a synthetic asset from real evidence — never an invented peg, backing, or safety claim." },
    { key: "crypto-rwa", title: "Analyze real-world asset", role: "Research", cryptoRole: "rwa",
      description: "Analyse a real-world-asset activity from real evidence — never an invented backing, value, or legal claim." },
    { key: "crypto-nft", title: "Analyze NFT activity", role: "Research", cryptoRole: "nft",
      description: "Analyse an NFT activity from real evidence — never an invented price, rarity, or value." },
    { key: "crypto-depin", title: "Analyze DePIN activity", role: "Research", cryptoRole: "depin",
      description: "Analyse a DePIN activity from real evidence — never an invented reward rate or guaranteed earning." },
    { key: "crypto-oracle", title: "Analyze oracle", role: "Security", cryptoRole: "oracle",
      description: "Analyse an oracle from real evidence — never an invented price feed or trust claim; oracle manipulation is THREAT knowledge, never a strategy." },
    { key: "crypto-btcfi", title: "Analyze BTCFi activity", role: "Research", cryptoRole: "btcfi",
      description: "Analyse a BTCFi activity from real evidence — never an invented rate or guaranteed return." },
    { key: "crypto-provider", title: "Analyze provider", role: "Monitoring", cryptoRole: "provider",
      description: "Analyse a data provider from real evidence — a provider check is never a claim that its data is verified." },
    { key: "crypto-security-intelligence", title: "Security intelligence", role: "Security", cryptoRole: "security-intelligence",
      description: "Analyse a security signal from real evidence with provenance — findings are descriptive only, never transactional." }
  ];

  function getMode() {
    try {
      return localStorage.getItem(MODE_KEY) === "theater" ? "theater" : "live";
    } catch (e) {
      return "live";
    }
  }

  function setMode(mode) {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch (e) {}
  }

  function starStatus() {
    if (global.StarBackend && typeof global.StarBackend.getStatusLabel === "function") {
      return global.StarBackend.getStatusLabel();
    }
    return "Demo mode — no AI backend connected";
  }

  // ---- Pure data builders (no DOM — tested in a bare vm) ----------------

  function fallbackPrincipal(entry) {
    return {
      id: entry.id,
      displayName: entry.displayName,
      order: entry.order,
      status: "ACTIVE",
      assignmentState: "UNASSIGNED",
      currentRole: null,
      currentTask: null,
      history: []
    };
  }

  // The 12 canonical principal records, in Revelation 7 order.
  // TribePrincipals when loaded; the closed fallback roster otherwise.
  function principalRecords() {
    var tp = global.TribePrincipals;
    if (tp && typeof tp.listPrincipals === "function") {
      try {
        var list = tp.listPrincipals();
        if (Array.isArray(list) && list.length === 12) return list;
      } catch (e) {}
    }
    return CANONICAL_PRINCIPALS.map(fallbackPrincipal);
  }

  function findPrincipal(principalId) {
    if (typeof principalId !== "string") return null;
    var tp = global.TribePrincipals;
    if (tp && typeof tp.getPrincipal === "function") {
      try {
        var p = tp.getPrincipal(principalId);
        if (p) return p;
      } catch (e) {}
    }
    var list = principalRecords();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === principalId) return list[i];
    }
    return null;
  }

  // The slot shape BotOpsModel.describeBot expects, built from a
  // canonical principal. The canonical displayName is the slot's name
  // (the identity is real and owner-approved); the assignment state is
  // the principal's real assignment state, so describeBot reports
  // UNASSIGNED until a real assignment exists.
  function reconciledSlot(p) {
    return {
      id: p.id,
      label: p.displayName,
      name: p.displayName,
      status: p.assignmentState || "UNASSIGNED",
      role: p.currentRole || null,
      assignment: p.currentTask || null
    };
  }

  // Real connected worker count. Always 0 / NOT_CONNECTED: no worker
  // runtime exists, so the count is never derived from a queued task,
  // a UI card, a worker record, or a saved object. Delegates to the
  // first loaded model that reports it, and forces the honest count.
  function getWorkersActive() {
    var fallback = {
      count: 0,
      state: "NOT_CONNECTED",
      note: "No worker orchestration is connected. Workers appear here only when a real worker system reports them."
    };
    var sources = [global.BotOpsModel, global.Tribes, global.WorkerEngine];
    for (var i = 0; i < sources.length; i++) {
      var src = sources[i];
      if (src && typeof src.getWorkersActive === "function") {
        try {
          var r = src.getWorkersActive();
          if (r && typeof r === "object") {
            return {
              count: 0,
              state: "NOT_CONNECTED",
              note: typeof r.note === "string" && r.note ? r.note : fallback.note
            };
          }
        } catch (e) {}
      }
    }
    return fallback;
  }

  // Count of worker RECORDS under one principal (WorkerEngine records
  // only). A record is not a live worker: this count is never shown as
  // active workers, only as records.
  function workerRecordCount(principalId) {
    var we = global.WorkerEngine;
    if (!we || typeof we.listWorkers !== "function") return 0;
    try {
      var list = we.listWorkers();
      if (!Array.isArray(list)) return 0;
      var n = 0;
      for (var i = 0; i < list.length; i++) {
        var w = list[i];
        if (!w) continue;
        if (w.parentPrincipalId === principalId || w.parentTribeId === principalId) n++;
      }
      return n;
    } catch (e) {
      return 0;
    }
  }

  // The 12 drawer entries in Revelation 7 order: canonical principal,
  // assignment state from BotOpsModel, and ONLY the real active-worker
  // count under each (0 / NOT_CONNECTED until a real worker runtime
  // exists).
  function buildDrawerPrincipals() {
    var active = getWorkersActive();
    return principalRecords().map(function (p) {
      var assignmentState = p.assignmentState || "UNASSIGNED";
      var role = p.currentRole || null;
      var task = p.currentTask || null;
      var bom = global.BotOpsModel;
      if (bom && typeof bom.describeBot === "function") {
        try {
          var bot = bom.describeBot(reconciledSlot(p));
          if (bot) {
            assignmentState = bot.status || assignmentState;
            role = bot.role || null;
            task = bot.assignment || null;
          }
        } catch (e) {}
      }
      return {
        id: p.id,
        displayName: p.displayName,
        order: p.order,
        assignmentState: assignmentState,
        currentRole: role,
        currentTask: task,
        workersActive: { count: active.count, state: active.state },
        workerRecords: workerRecordCount(p.id)
      };
    });
  }

  function participantsAvailable() {
    return !!(global.Participants &&
      typeof global.Participants.openPrincipal === "function");
  }

  // "Bring <principal>": opens the principal in a participant window
  // when the Participants global provides openPrincipal; otherwise
  // reports unavailable and does nothing — never a crash. Note the
  // Participants global may exist (js/participants.js) without
  // openPrincipal yet: the probe checks the FUNCTION, not the global.
  function bringPrincipal(principalId) {
    if (!participantsAvailable()) {
      return { ok: false, reason: "participant window unavailable" };
    }
    try {
      global.Participants.openPrincipal(principalId);
      return { ok: true, reason: null };
    } catch (e) {
      return { ok: false, reason: e && e.message ? e.message : String(e) };
    }
  }

  function dashToNull(value) {
    return value === "—" ? null : value;
  }

  // Full truthful detail record for one canonical principal. Every
  // spec field is always present: unknown values are null (or
  // "UNKNOWN" for the closed-set fields, [] for the list fields),
  // never invented. Uses BotOpsModel.describeIdentity when available
  // and falls back to the principal record + UNKNOWN fields.
  // Returns null for an unknown principal id.
  function buildPrincipalDetail(principalId) {
    var p = findPrincipal(principalId);
    if (!p) return null;
    var identity = null;
    var bom = global.BotOpsModel;
    if (bom && typeof bom.describeIdentity === "function") {
      try { identity = bom.describeIdentity("principal", principalId); } catch (e) { identity = null; }
    }
    var bot = null;
    if (bom && typeof bom.describeBot === "function") {
      try { bot = bom.describeBot(reconciledSlot(p)); } catch (e) { bot = null; }
    }
    var warnings = [];
    if (bot && typeof bot.warnings === "string" &&
        bot.warnings !== "None reported — no live data" && bot.warnings) {
      warnings = [bot.warnings];
    }
    return {
      kind: "principal",
      id: p.id,
      displayName: p.displayName,
      canonicalName: identity && identity.canonicalName ? identity.canonicalName : p.displayName,
      parentTribe: p.displayName,
      organizationalParent: identity && identity.organizationalParent ? identity.organizationalParent : null,
      role: identity && identity.role !== undefined ? identity.role : (p.currentRole || null),
      currentRole: identity && identity.role !== undefined ? identity.role : (p.currentRole || null),
      task: identity && identity.currentTask !== undefined ? identity.currentTask : (p.currentTask || null),
      currentTask: identity && identity.currentTask !== undefined ? identity.currentTask : (p.currentTask || null),
      status: identity && identity.status ? identity.status : (p.status || "UNKNOWN"),
      assignmentState: bot && bot.status ? bot.status : (p.assignmentState || "UNASSIGNED"),
      liveStatus: "NOT_CONNECTED",
      model: identity ? identity.model : null,
      tools: identity && Array.isArray(identity.tools) ? identity.tools.slice() : [],
      inputs: bot ? dashToNull(bot.inputs) : null,
      outputs: bot ? dashToNull(bot.outputs) : null,
      evidence: null,
      dependencies: bot ? dashToNull(bot.dependencies) : null,
      warnings: warnings,
      permission: identity && Array.isArray(identity.permissions) && identity.permissions.length
        ? identity.permissions[0] : null,
      permissions: identity && Array.isArray(identity.permissions) ? identity.permissions.slice() : [],
      autonomyLevel: identity && identity.autonomyLevel ? identity.autonomyLevel : "UNKNOWN",
      health: identity && identity.health ? identity.health : "UNKNOWN",
      heartbeat: null,
      cost: null,
      gain: null,
      loss: null,
      net: null,
      workerRecords: workerRecordCount(p.id),
      history: identity && Array.isArray(identity.history) ? identity.history.slice()
        : (Array.isArray(p.history) ? p.history.slice() : []),
      controls: {
        bring: {
          label: "Bring " + p.displayName,
          available: participantsAvailable(),
          unavailableReason: participantsAvailable() ? null : "participant window unavailable"
        }
      }
    };
  }

  function entryMessage(entry) {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object" && typeof entry.message === "string") return entry.message;
    return null;
  }

  function normalizeEntries(list) {
    if (!Array.isArray(list)) return [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var m = entryMessage(list[i]);
      if (m) out.push(m);
    }
    return out;
  }

  // Full truthful detail record for one worker. Every spec field is
  // always present: unknown values are null (or "UNKNOWN" for the
  // closed-set fields, [] for the list fields), never invented.
  // Reads WorkerEngine when available, else BotOpsModel
  // .describeIdentity("worker", id); an unknown worker id still
  // returns the full record with UNKNOWN/null values, never null.
  // Returns null only for a missing/empty id.
  function buildWorkerDetail(workerId) {
    if (typeof workerId !== "string" || !workerId) return null;
    var w = null;
    var we = global.WorkerEngine;
    if (we && typeof we.getWorker === "function") {
      try { w = we.getWorker(workerId); } catch (e) { w = null; }
    }
    var identity = null;
    if (!w) {
      var bom = global.BotOpsModel;
      if (bom && typeof bom.describeIdentity === "function") {
        try { identity = bom.describeIdentity("worker", workerId); } catch (e) { identity = null; }
      }
    }
    var rec = {
      kind: "worker",
      workerId: workerId,
      id: workerId,
      canonicalName: null,
      displayName: null,
      parentPrincipalId: null,
      parentTribeId: null,
      currentRole: null,
      role: null,
      currentTask: null,
      currentTaskId: null,
      model: null,
      tools: [],
      permissions: [],
      permission: null,
      autonomyLevel: "UNKNOWN",
      status: "UNKNOWN",
      liveStatus: "NOT_CONNECTED",
      health: "UNKNOWN",
      heartbeat: null,
      inputs: null,
      outputs: null,
      evidence: null,
      dependencies: null,
      warnings: [],
      errors: [],
      cost: null,
      gain: null,
      loss: null,
      net: null,
      history: []
    };
    if (w) {
      rec.canonicalName = typeof w.canonicalName === "string" ? w.canonicalName : null;
      rec.displayName = rec.canonicalName;
      rec.parentPrincipalId = typeof w.parentPrincipalId === "string" ? w.parentPrincipalId
        : (typeof w.parentTribeId === "string" ? w.parentTribeId : null);
      rec.parentTribeId = rec.parentPrincipalId;
      rec.currentRole = typeof w.currentRole === "string" ? w.currentRole : null;
      rec.role = rec.currentRole;
      rec.currentTask = typeof w.currentTask === "string" ? w.currentTask
        : (typeof w.currentTaskId === "string" ? w.currentTaskId : null);
      rec.currentTaskId = rec.currentTask;
      rec.model = (w.model !== undefined && w.model !== null) ? w.model
        : (w.modelAssignment !== undefined ? w.modelAssignment : null);
      rec.tools = Array.isArray(w.tools) ? w.tools.slice()
        : (Array.isArray(w.toolAssignments) ? w.toolAssignments.slice() : []);
      rec.permissions = Array.isArray(w.permissions) ? w.permissions.slice()
        : (Array.isArray(w.permissionProfile) ? w.permissionProfile.slice() : []);
      rec.permission = rec.permissions.length ? rec.permissions[0] : null;
      rec.autonomyLevel = typeof w.autonomyLevel === "string" ? w.autonomyLevel : "UNKNOWN";
      rec.status = typeof w.status === "string" ? w.status : "UNKNOWN";
      rec.health = typeof w.health === "string" ? w.health : "UNKNOWN";
      rec.heartbeat = (typeof w.lastHeartbeat === "number") ? w.lastHeartbeat
        : (typeof w.lastHeartbeatAt === "number" ? w.lastHeartbeatAt : null);
      rec.warnings = normalizeEntries(w.warnings);
      rec.errors = normalizeEntries(w.errors);
      rec.history = Array.isArray(w.history) ? w.history.slice() : [];
    } else if (identity) {
      rec.canonicalName = identity.canonicalName;
      rec.displayName = identity.displayName;
      rec.parentPrincipalId = identity.organizationalParent;
      rec.parentTribeId = identity.organizationalParent;
      rec.currentRole = identity.role;
      rec.role = identity.role;
      rec.currentTask = identity.currentTask;
      rec.currentTaskId = identity.currentTask;
      rec.model = identity.model;
      rec.tools = Array.isArray(identity.tools) ? identity.tools.slice() : [];
      rec.permissions = Array.isArray(identity.permissions) ? identity.permissions.slice() : [];
      rec.permission = rec.permissions.length ? rec.permissions[0] : null;
      rec.autonomyLevel = identity.autonomyLevel || "UNKNOWN";
      rec.status = identity.status || "UNKNOWN";
      rec.health = identity.health || "UNKNOWN";
      rec.history = Array.isArray(identity.history) ? identity.history.slice() : [];
    }
    return rec;
  }

  // Angel Security summary for this screen. NO_ALERTS honestly when
  // the alert store is empty; real alerts listed with severity /
  // state / affectedSystem when present. No fabricated alerts. When
  // AngelSecurity is not loaded the state is UNKNOWN — never claimed
  // clear.
  function buildAngelSummary() {
    var as = global.AngelSecurity;
    if (!as || typeof as.summary !== "function") {
      return {
        available: false,
        state: "UNKNOWN",
        count: 0,
        byState: {},
        bySeverity: {},
        byDomain: {},
        confirmedCount: 0,
        unconfirmedCount: 0,
        angels: 0,
        alerts: [],
        note: "Angel Security module is not loaded — alert state is unknown, not clear."
      };
    }
    var s;
    try {
      s = as.summary();
    } catch (e) {
      return {
        available: false,
        state: "UNKNOWN",
        count: 0,
        byState: {},
        bySeverity: {},
        byDomain: {},
        confirmedCount: 0,
        unconfirmedCount: 0,
        angels: 0,
        alerts: [],
        note: "Angel Security summary could not be read — alert state is unknown, not clear."
      };
    }
    var alerts = [];
    if (typeof as.listAlerts === "function") {
      try {
        var raw = as.listAlerts();
        if (Array.isArray(raw)) {
          alerts = raw.map(function (a) {
            return {
              id: a.id,
              title: a.title,
              severity: a.severity,
              state: a.state,
              affectedSystem: a.affectedSystem,
              domain: a.domain,
              detectedAt: a.detectedAt,
              alertClass: a.alertClass !== undefined ? a.alertClass : null
            };
          });
        }
      } catch (e) {
        alerts = [];
      }
    }
    return {
      available: true,
      state: s.state || (s.count === 0 ? "NO_ALERTS" : "ALERTS_PRESENT"),
      count: typeof s.count === "number" ? s.count : alerts.length,
      byState: s.byState || {},
      bySeverity: s.bySeverity || {},
      byDomain: s.byDomain || {},
      confirmedCount: typeof s.confirmedCount === "number" ? s.confirmedCount : 0,
      unconfirmedCount: typeof s.unconfirmedCount === "number" ? s.unconfirmedCount : 0,
      angels: typeof s.angels === "number" ? s.angels : 0,
      alerts: alerts,
      note: typeof s.note === "string" ? s.note : ""
    };
  }

  // Wallet task templates, as copies (callers mutating one never touch
  // the registry).
  function buildWalletTaskTemplates() {
    return WALLET_TASK_TEMPLATES.map(function (t) {
      return {
        key: t.key,
        title: t.title,
        role: t.role,
        description: t.description,
        inputs: [],
        outputs: []
      };
    });
  }

  function findWalletTemplate(key) {
    for (var i = 0; i < WALLET_TASK_TEMPLATES.length; i++) {
      if (WALLET_TASK_TEMPLATES[i].key === key) return WALLET_TASK_TEMPLATES[i];
    }
    return null;
  }

  // Creates a real worker task from a wallet template, through
  // BotOpsModel.createWorkerTask + saveTask. Returns {ok, task} or
  // {ok:false, reason}. A template on its own never creates a task.
  function createWalletTaskFromTemplate(templateKey, overrides) {
    var template = findWalletTemplate(templateKey);
    if (!template) {
      return { ok: false, reason: "Unknown wallet task template: " + templateKey + "." };
    }
    var bom = global.BotOpsModel;
    if (!bom || typeof bom.createWorkerTask !== "function" || typeof bom.saveTask !== "function") {
      return { ok: false, reason: "BotOpsModel is not loaded — no task can be created." };
    }
    var data = overrides && typeof overrides === "object" ? overrides : {};
    var input = {
      title: template.title,
      role: template.role,
      tribeId: data.tribeId === undefined ? null : data.tribeId,
      principal: data.principal === undefined ? null : data.principal,
      goal: data.goal === undefined ? null : data.goal,
      inputs: Array.isArray(data.inputs) ? data.inputs.slice() : [],
      outputs: Array.isArray(data.outputs) ? data.outputs.slice() : []
    };
    try {
      var task = bom.createWorkerTask(input);
      bom.saveTask(task);
      return { ok: true, task: task, reason: null };
    } catch (e) {
      return { ok: false, reason: e && e.message ? e.message : String(e) };
    }
  }

  // Crypto task templates, as copies (callers mutating one never
  // touch the registry). One template per crypto analysis role.
  function buildCryptoTaskTemplates() {
    return CRYPTO_TASK_TEMPLATES.map(function (t) {
      return {
        key: t.key,
        title: t.title,
        role: t.role,
        cryptoRole: t.cryptoRole,
        description: t.description,
        inputs: [],
        outputs: []
      };
    });
  }

  function findCryptoTemplate(key) {
    for (var i = 0; i < CRYPTO_TASK_TEMPLATES.length; i++) {
      if (CRYPTO_TASK_TEMPLATES[i].key === key) return CRYPTO_TASK_TEMPLATES[i];
    }
    return null;
  }

  // Creates a real worker task from a crypto template, through
  // BotOpsModel.createWorkerTask + saveTask. Returns {ok, task} or
  // {ok:false, reason}. A template on its own never creates a task.
  // The crypto role is recorded in dataProvenance so the task keeps
  // its analysis role even though BotOpsModel stores the mapped
  // closed-set role label.
  function createCryptoTaskFromTemplate(templateKey, overrides) {
    var template = findCryptoTemplate(templateKey);
    if (!template) {
      return { ok: false, reason: "Unknown crypto task template: " + templateKey + "." };
    }
    var bom = global.BotOpsModel;
    if (!bom || typeof bom.createWorkerTask !== "function" || typeof bom.saveTask !== "function") {
      return { ok: false, reason: "BotOpsModel is not loaded — no task can be created." };
    }
    var data = overrides && typeof overrides === "object" ? overrides : {};
    var input = {
      title: template.title,
      role: template.role,
      tribeId: data.tribeId === undefined ? null : data.tribeId,
      principal: data.principal === undefined ? null : data.principal,
      goal: data.goal === undefined ? null : data.goal,
      dataProvenance: "crypto-bot-assignments:" + template.cryptoRole,
      inputs: Array.isArray(data.inputs) ? data.inputs.slice() : [],
      outputs: Array.isArray(data.outputs) ? data.outputs.slice() : []
    };
    try {
      var task = bom.createWorkerTask(input);
      bom.saveTask(task);
      return { ok: true, task: task, reason: null };
    } catch (e) {
      return { ok: false, reason: e && e.message ? e.message : String(e) };
    }
  }

  // ---- Render helpers --------------------------------------------------------

  function tribeCard(entry) {
    var assigned = entry.assignmentState !== "UNASSIGNED";
    var card = U.el("button", { class: "tribe-card" + (assigned ? "" : " tribe-card-unassigned"), type: "button" }, [
      U.el("div", { class: "tribe-card-avatar", "aria-hidden": "true" }, entry.displayName.slice(0, 2)),
      U.el("div", { class: "tribe-card-label" }, entry.displayName),
      U.el("div", { class: "tribe-card-status" }, entry.assignmentState),
      U.el("div", { class: "tribe-card-note" }, assigned
        ? ("Role: " + (entry.currentRole || "—") + " · Task: " + (entry.currentTask || "—"))
        : "Not assigned — a principal is named only by owner approval."),
      U.el("div", { class: "tribe-card-note" }, "Workers active: " + entry.workersActive.count + " — " + entry.workersActive.state),
      entry.workerRecords > 0
        ? U.el("div", { class: "tribe-card-note" }, "Worker records: " + entry.workerRecords + " (records only — not live workers)")
        : null
    ]);
    var bringBtn = U.el("button", {
      class: "btn btn-secondary",
      type: "button",
      disabled: participantsAvailable() ? undefined : true
    }, participantsAvailable() ? ("Bring " + entry.displayName) : "Participant window unavailable");
    bringBtn.addEventListener("click", function (ev) {
      if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
      var result = bringPrincipal(entry.id);
      if (!result.ok) {
        bringBtn.textContent = "Participant window unavailable";
        bringBtn.disabled = true;
      }
    });
    card.appendChild(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [bringBtn]));
    card.addEventListener("click", function () {
      selectedSlotId = entry.id;
      selectedWorkerId = null;
      renderDetail();
      if (detailBox && detailBox.scrollIntoView) {
        try { detailBox.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) {}
      }
    });
    return card;
  }

  function detailRow(label, value) {
    return U.el("div", { class: "status-row" }, [
      U.el("span", {}, label),
      U.el("span", { class: "status-value" }, value)
    ]);
  }

  function fmtValue(value) {
    if (value === null || value === undefined) return "UNKNOWN";
    if (Array.isArray(value)) return value.length ? value.join(", ") : "None recorded";
    if (typeof value === "object") {
      try { return JSON.stringify(value); } catch (e) { return "UNKNOWN"; }
    }
    return String(value);
  }

  function fmtMoneyField(value) {
    return value === null || value === undefined ? "No tracked data" : fmtValue(value);
  }

  function historyLines(history) {
    if (!Array.isArray(history) || history.length === 0) {
      return U.el("div", { class: "api-meta" }, "No logs — nothing has run");
    }
    var box = U.el("div", { class: "api-meta" }, []);
    history.forEach(function (h) {
      var text = h && typeof h === "object"
        ? ((h.at || "") + " — " + (h.change || h.note || (h.from + " -> " + h.to) || "") + (h.by ? " (" + h.by + ")" : ""))
        : String(h);
      box.appendChild(U.el("div", {}, text));
    });
    return box;
  }

  function renderDetail() {
    if (!detailBox) return;
    detailBox.innerHTML = "";
    if (selectedWorkerId) {
      var w = buildWorkerDetail(selectedWorkerId);
      detailBox.appendChild(U.el("h3", {}, "Worker detail — " + (w.canonicalName || w.workerId)));
      detailBox.appendChild(U.el("p", { class: "api-meta" },
        "Worker operational anatomy: identity, work, dependencies, telemetry, risks, results. Every value below is real state — unknown means unknown, never guessed. A worker record is not a live worker."));
      var rows = detailBox;
      rows.appendChild(detailRow("Worker ID", w.workerId));
      rows.appendChild(detailRow("Canonical name", w.canonicalName || "UNKNOWN"));
      rows.appendChild(detailRow("Parent principal", w.parentPrincipalId || "UNKNOWN"));
      rows.appendChild(detailRow("Current role", w.currentRole || "UNKNOWN"));
      rows.appendChild(detailRow("Current task", w.currentTask || "UNKNOWN"));
      rows.appendChild(detailRow("Model", fmtValue(w.model)));
      rows.appendChild(detailRow("Tools", fmtValue(w.tools)));
      rows.appendChild(detailRow("Permissions", fmtValue(w.permissions)));
      rows.appendChild(detailRow("Status", w.status));
      rows.appendChild(detailRow("Live status", w.liveStatus));
      rows.appendChild(detailRow("Health", w.health));
      rows.appendChild(detailRow("Heartbeat", w.heartbeat === null ? "UNKNOWN — no heartbeat recorded" : String(w.heartbeat)));
      rows.appendChild(detailRow("Inputs / outputs", fmtValue(w.inputs) + " / " + fmtValue(w.outputs)));
      rows.appendChild(detailRow("Evidence", fmtValue(w.evidence)));
      rows.appendChild(detailRow("Dependencies", fmtValue(w.dependencies)));
      rows.appendChild(detailRow("Warnings", w.warnings.length ? w.warnings.join("; ") : "None reported"));
      rows.appendChild(detailRow("Errors", w.errors.length ? w.errors.join("; ") : "None reported"));
      rows.appendChild(detailRow("Costs", fmtMoneyField(w.cost)));
      rows.appendChild(detailRow("Verified gains / losses / net",
        fmtMoneyField(w.gain) + " / " + fmtMoneyField(w.loss) + " / " + fmtMoneyField(w.net)));
      rows.appendChild(detailRow("Autonomy level", w.autonomyLevel));
      rows.appendChild(detailRow("History / logs", ""));
      rows.appendChild(historyLines(w.history));
      return;
    }
    var detail = selectedSlotId ? buildPrincipalDetail(selectedSlotId) : null;
    if (!detail) {
      detailBox.appendChild(U.el("p", { class: "api-meta" }, "Select a Tribe principal above, or a worker below, to see its detail."));
      return;
    }
    detailBox.appendChild(U.el("h3", {}, "Bot detail — " + detail.displayName));
    detailBox.appendChild(U.el("p", { class: "api-meta" },
      "Bot operational anatomy: identity, work, dependencies, telemetry, risks, results. Every value below is real state — unknown means unknown, never guessed."));
    var d = detailBox;
    d.appendChild(detailRow("Bot identity", detail.canonicalName));
    d.appendChild(detailRow("Parent Tribe", detail.parentTribe));
    d.appendChild(detailRow("Organizational parent", detail.organizationalParent || "UNKNOWN"));
    d.appendChild(detailRow("Assignment state", detail.assignmentState));
    d.appendChild(detailRow("Current role", detail.currentRole || "UNKNOWN"));
    d.appendChild(detailRow("Current task", detail.currentTask || "UNKNOWN"));
    d.appendChild(detailRow("Identity status", detail.status));
    d.appendChild(detailRow("Live status", detail.liveStatus));
    d.appendChild(detailRow("Model", fmtValue(detail.model)));
    d.appendChild(detailRow("Tools", fmtValue(detail.tools)));
    d.appendChild(detailRow("Inputs / outputs", fmtValue(detail.inputs) + " / " + fmtValue(detail.outputs)));
    d.appendChild(detailRow("Evidence", fmtValue(detail.evidence)));
    d.appendChild(detailRow("Dependencies", fmtValue(detail.dependencies)));
    d.appendChild(detailRow("Warnings", detail.warnings.length ? detail.warnings.join("; ") : "None reported — no live data"));
    d.appendChild(detailRow("Permission", detail.permission || "UNKNOWN"));
    d.appendChild(detailRow("Autonomy level", detail.autonomyLevel));
    d.appendChild(detailRow("Health", detail.health));
    d.appendChild(detailRow("Heartbeat", detail.heartbeat === null ? "UNKNOWN — no heartbeat recorded" : String(detail.heartbeat)));
    d.appendChild(detailRow("Costs", fmtMoneyField(detail.cost)));
    d.appendChild(detailRow("Verified gains / losses / net",
      fmtMoneyField(detail.gain) + " / " + fmtMoneyField(detail.loss) + " / " + fmtMoneyField(detail.net)));
    d.appendChild(detailRow("Worker records", detail.workerRecords === 0
      ? "0 — no worker records under this principal"
      : String(detail.workerRecords) + " (records only — not live workers)"));
    d.appendChild(detailRow("History / logs", ""));
    d.appendChild(historyLines(detail.history));
    var bringBtn = U.el("button", {
      class: "btn btn-secondary",
      type: "button",
      disabled: detail.controls.bring.available ? undefined : true
    }, detail.controls.bring.available ? detail.controls.bring.label : "Participant window unavailable");
    bringBtn.addEventListener("click", function () {
      var result = bringPrincipal(detail.id);
      if (!result.ok) {
        bringBtn.textContent = "Participant window unavailable";
        bringBtn.disabled = true;
      }
    });
    detailBox.appendChild(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [bringBtn]));
  }

  async function render(root) {
    currentRoot = root;
    root.innerHTML = "";
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("bot-ops") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "Bot Operations"));
    root.appendChild(U.el("p", { class: "api-subtitle" },
      "STAR, Tribes, Workers, and Live Work. This is the operations shell — no worker orchestration is connected yet, so everything below states that plainly instead of pretending."));

    // ---- Presentation mode: Live Data vs Command Theater (same data) ----
    var mode = getMode();
    var liveBtn = U.el("button", { class: "btn " + (mode === "live" ? "btn-primary" : "btn-secondary"), type: "button" }, "Live Data");
    var theaterBtn = U.el("button", { class: "btn " + (mode === "theater" ? "btn-primary" : "btn-secondary"), type: "button" }, "Command Theater");
    var modeNote = U.el("div", { class: "api-meta" }, mode === "theater"
      ? "Command Theater is a cinematic view of the SAME real data as Live Data — not a separate source, and never fake activity."
      : "Live Data shows worker cards from real reported state only.");
    function applyMode(next) {
      setMode(next);
      var work = root.querySelector("#botops-live-work");
      if (work) work.classList.toggle("botops-theater", next === "theater");
      liveBtn.className = "btn " + (next === "live" ? "btn-primary" : "btn-secondary");
      theaterBtn.className = "btn " + (next === "theater" ? "btn-primary" : "btn-secondary");
      modeNote.textContent = next === "theater"
        ? "Command Theater is a cinematic view of the SAME real data as Live Data — not a separate source, and never fake activity."
        : "Live Data shows worker cards from real reported state only.";
    }
    liveBtn.addEventListener("click", function () { applyMode("live"); });
    theaterBtn.addEventListener("click", function () { applyMode("theater"); });
    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Presentation"),
      U.el("div", { class: "price-input-row" }, [liveBtn, theaterBtn]),
      modeNote
    ]));

    // ---- STAR ----
    var starPanel = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "🌟 STAR"),
      U.el("div", { class: "api-meta" }, "Main persistent assistant. Status: " + starStatus()),
      U.el("div", { class: "api-meta" }, "STAR answers in demo mode from the dashboard panel and from its overlay. Approval-required work is never executed silently.")
    ]);
    var openStarBtn = U.el("button", { class: "btn btn-primary", type: "button" }, "Open STAR overlay");
    openStarBtn.addEventListener("click", function () {
      if (global.StarOverlay) global.StarOverlay.open();
    });
    starPanel.appendChild(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [openStarBtn]));
    root.appendChild(starPanel);

    // ---- TRIBES (12 canonical principals) ----
    var principals = buildDrawerPrincipals();
    var tribeGrid = U.el("div", { class: "botops-grid" });
    principals.forEach(function (entry) { tribeGrid.appendChild(tribeCard(entry)); });
    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Tribes — 12 canonical principals"),
      U.el("div", { class: "api-meta" }, "Persistent named principal agents in Revelation 7 order. A principal with no real assignment shows UNASSIGNED — never an invented role. Workers active under each principal is the real connected count (0 / NOT_CONNECTED until a real worker runtime exists). Tap a principal for its detail."),
      tribeGrid
    ]));

    // ---- Bot / worker detail ----
    detailBox = U.el("div", { class: "api-panel", id: "botops-detail" });
    root.appendChild(detailBox);
    renderDetail();

    // ---- WORKERS ----
    var workers = getWorkersActive();
    var workerQueueText = "Worker task queue: unavailable — worker task model not loaded.";
    if (global.BotOpsModel && typeof global.BotOpsModel.summary === "function") {
      try {
        var wq = global.BotOpsModel.summary();
        if (!wq || wq.total === 0) {
          workerQueueText = "Worker tasks queued: 0 — no worker tasks have been created.";
        } else {
          var wqParts = [];
          var wqOrder = global.BotOpsModel.TASK_STATES || [];
          wqOrder.forEach(function (st) {
            var n = wq.byState ? (wq.byState[st] || 0) : 0;
            if (n > 0) wqParts.push(st + " " + n);
          });
          workerQueueText = "Worker tasks queued: " + wq.total + " (" + wqParts.join(", ") + ") — no worker runtime is connected, so no task is live.";
        }
      } catch (e) {
        workerQueueText = "Worker task queue: unavailable — worker task model could not be read.";
      }
    }
    var workersPanel = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Workers"),
      U.el("div", { class: "api-meta" }, ["WORKERS ACTIVE: " + workers.count + " — ",
        // Visual Stage 1: shared status badge (§25) — colour + text label,
        // never colour alone. Class derives from the real state string
        // (NOT_CONNECTED → not-connected, CONNECTED → connected, …).
        U.el("span", { class: "mti6-badge mti6-badge--" + String(workers.state || "UNKNOWN").toLowerCase().replace(/_/g, "-") }, String(workers.state))]),
      U.el("div", { class: "api-meta" }, workerQueueText),
      U.el("div", { class: "api-meta" }, workers.note),
      U.el("div", { class: "api-meta" }, "Role labels a worker may carry on an assignment: " +
        (global.Tribes ? global.Tribes.ROLE_LABELS.join(", ") : "—") + ". These are assignment labels, not bot names.")
    ]);
    // Real worker records (WorkerEngine) — records only, never live
    // workers. Tap a record for its detail.
    var workerRecords = [];
    if (global.WorkerEngine && typeof global.WorkerEngine.listWorkers === "function") {
      try { workerRecords = global.WorkerEngine.listWorkers() || []; } catch (e) { workerRecords = []; }
    }
    if (workerRecords.length === 0) {
      workersPanel.appendChild(U.el("div", { class: "api-meta" },
        "Worker records: 0 — no worker records exist. A record is not a live worker."));
    } else {
      workersPanel.appendChild(U.el("div", { class: "api-meta" },
        "Worker records: " + workerRecords.length + " (records only — no worker runtime is connected, so no record is live). Tap a record for its detail."));
      workerRecords.forEach(function (rec) {
        var recBtn = U.el("button", { class: "btn btn-secondary", type: "button" },
          (rec.canonicalName || rec.workerId) + " — " + (rec.currentRole || "UNKNOWN") +
          " · under " + (rec.parentPrincipalId || rec.parentTribeId || "UNKNOWN") +
          " · " + (rec.status || "UNKNOWN"));
        recBtn.addEventListener("click", function () {
          selectedWorkerId = rec.workerId;
          selectedSlotId = null;
          renderDetail();
          if (detailBox && detailBox.scrollIntoView) {
            try { detailBox.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) {}
          }
        });
        workersPanel.appendChild(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [recBtn]));
      });
    }
    root.appendChild(workersPanel);

    // ---- WALLET TASK TEMPLATES (templates only — no fake tasks) ----
    var templatesPanel = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Wallet task templates"),
      U.el("div", { class: "api-meta" }, "Task templates from the governing Wallet spec. A template creates nothing on its own: a task appears in the worker task list only when created through BotOpsModel.createWorkerTask (the Create button below)."),
      U.el("div", { class: "api-meta" }, lastTemplateMessage)
    ]);
    buildWalletTaskTemplates().forEach(function (t) {
      var createBtn = U.el("button", { class: "btn btn-secondary", type: "button" }, "Create task");
      createBtn.addEventListener("click", function () {
        var result = createWalletTaskFromTemplate(t.key);
        if (result.ok) {
          lastTemplateMessage = "Created worker task \"" + t.title + "\" (id " + result.task.id + ", state UNASSIGNED). It now appears in the worker task list below.";
        } else {
          lastTemplateMessage = "Could not create task \"" + t.title + "\": " + result.reason;
        }
        if (currentRoot) render(currentRoot);
      });
      templatesPanel.appendChild(U.el("div", { class: "status-row" }, [
        U.el("span", {}, t.title + " — " + t.role),
        createBtn
      ]));
      templatesPanel.appendChild(U.el("div", { class: "api-meta" }, t.description));
    });
    // Real worker tasks only (created through BotOpsModel).
    var realTasks = [];
    if (global.BotOpsModel && typeof global.BotOpsModel.listTasks === "function") {
      try { realTasks = global.BotOpsModel.listTasks() || []; } catch (e) { realTasks = []; }
    }
    if (realTasks.length === 0) {
      templatesPanel.appendChild(U.el("div", { class: "api-meta" },
        "Worker tasks: 0 — no worker tasks have been created."));
    } else {
      templatesPanel.appendChild(U.el("div", { class: "api-meta" },
        "Worker tasks: " + realTasks.length + " — created through BotOpsModel.createWorkerTask only; no task is live."));
      realTasks.forEach(function (task) {
        templatesPanel.appendChild(U.el("div", { class: "status-row" }, [
          U.el("span", {}, task.title || task.id),
          U.el("span", { class: "status-value" }, (task.role || "UNKNOWN") + " · " + (task.state || "UNKNOWN"))
        ]));
      });
    }
    root.appendChild(templatesPanel);

    // ---- ANGEL SECURITY SUMMARY ----
    var angel = buildAngelSummary();
    var angelPanel = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Angel Security"),
      U.el("div", { class: "api-meta" }, "Angel Security alerts. No alert is ever fabricated: an empty store reports NO_ALERTS honestly.")
    ]);
    if (!angel.available) {
      angelPanel.appendChild(U.el("div", { class: "api-meta" }, "Alert state: UNKNOWN — " + angel.note));
    } else if (angel.state === "NO_ALERTS") {
      angelPanel.appendChild(U.el("div", { class: "api-meta" }, "NO_ALERTS — " + angel.note));
    } else {
      angelPanel.appendChild(U.el("div", { class: "api-meta" },
        "Alerts: " + angel.count + " (" + angel.confirmedCount + " confirmed, " + angel.unconfirmedCount + " unconfirmed). " + angel.note));
      angel.alerts.forEach(function (a) {
        angelPanel.appendChild(U.el("div", { class: "status-row" }, [
          U.el("span", {}, (a.title || a.id) + " — " + (a.severity || "UNKNOWN") + " · " + (a.state || "UNKNOWN")),
          U.el("span", { class: "status-value" }, a.affectedSystem || "UNKNOWN")
        ]));
      });
    }
    root.appendChild(angelPanel);

    // ---- LIVE WORK ----
    var liveWork = U.el("div", { class: "api-panel" + (mode === "theater" ? " botops-theater" : ""), id: "botops-live-work" });
    liveWork.appendChild(U.el("h3", {}, "Live Work"));
    liveWork.appendChild(U.el("div", { class: "api-meta" },
      "No live work — no workers are connected. Worker cards appear here only when real workers report real work: name/ID, origin Tribe, role, assignment, status, workspace, mode, progress, last activity, and warnings. Financial fields (gross, fees, gain, loss, net) appear only where real tracked data exists."));
    liveWork.appendChild(U.el("div", { class: "botops-empty" }, "Nothing is running."));
    root.appendChild(liveWork);
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules["bot-ops"] = {
    render: render,
    buildDrawerPrincipals: buildDrawerPrincipals,
    buildPrincipalDetail: buildPrincipalDetail,
    buildWorkerDetail: buildWorkerDetail,
    getWorkersActive: getWorkersActive,
    buildAngelSummary: buildAngelSummary,
    buildWalletTaskTemplates: buildWalletTaskTemplates,
    createWalletTaskFromTemplate: createWalletTaskFromTemplate,
    buildCryptoTaskTemplates: buildCryptoTaskTemplates,
    createCryptoTaskFromTemplate: createCryptoTaskFromTemplate,
    bringPrincipal: bringPrincipal,
    participantsAvailable: participantsAvailable,
    WALLET_TASK_TEMPLATES: WALLET_TASK_TEMPLATES,
    CRYPTO_TASK_TEMPLATES: CRYPTO_TASK_TEMPLATES,
    CANONICAL_PRINCIPALS: CANONICAL_PRINCIPALS
  };
})(window);
