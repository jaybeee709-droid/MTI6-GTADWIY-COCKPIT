/* MTI6-GTADWIY-COCKPIT — Star command foundation (Priorities 2 + 3)
 *
 * The fail-closed command layer for Star 3.0. It classifies a line of
 * text into an intent, declares the permission that intent needs, and
 * either executes it through a real, already-loaded capability or
 * refuses honestly. It never simulates a successful execution.
 *
 * Hard rules, in plain terms:
 *   - INFORMATIONAL never implies TRANSACTIONAL. Naming a financial
 *     action (buy, sell, trade, swap, stake, lend, borrow, claim,
 *     withdraw, send money) is always APPROVAL_REQUIRED with permission
 *     TRANSACTIONAL, and TRANSACTIONAL is never enabled: there are no
 *     capability records anywhere in the command path, so the
 *     transactional check is always false and the command is never
 *     executed. The enum existing does not enable anything.
 *   - GitHub, deployment, code changes, and delegating work to a worker
 *     are always APPROVAL_REQUIRED and are never executed here.
 *   - Unknown commands are not executed. Ambiguous commands are not
 *     executed; Star asks for clarification (NEEDS_REVIEW).
 *   - Navigation only ever sets location.hash to one of the 20 known
 *     routes in this file. An unknown destination navigates nowhere.
 *   - No network, no secrets, no database writes, no media-device
 *     access, no wallet or money code in this file. It degrades
 *     gracefully when other globals are absent: every optional global
 *     is checked with typeof first, and a missing capability is
 *     reported as NOT_CONNECTED instead of throwing.
 *
 * Depends on nothing at load time. EncyclopediaBridge and truth.js may
 * not exist yet (they are being written in parallel); this module only
 * calls them through typeof guards at execute time.
 *
 *   StarCommand.parseCommand(text, source) -> command object
 *   StarCommand.classify(text)             -> { intent, permission,
 *                                               approvalRequired, reason }
 *   StarCommand.execute(command)           -> result object (or a Promise
 *                                               of one when the encyclopedia
 *                                               bridge answers async)
 *   StarCommand.getAuditLog() / clearAuditLog()
 */
(function (global) {
  "use strict";

  var INTENTS = {
    NAVIGATION: "NAVIGATION",
    SEARCH: "SEARCH",
    KNOWLEDGE: "KNOWLEDGE",
    EXPLAIN: "EXPLAIN",
    OPEN: "OPEN",
    COMPARE: "COMPARE",
    STATUS: "STATUS",
    BOT: "BOT",
    WORKER: "WORKER",
    SETTINGS: "SETTINGS",
    ANALYTICS: "ANALYTICS",
    RESEARCH: "RESEARCH",
    MONITOR: "MONITOR",
    APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
    UNAVAILABLE: "UNAVAILABLE"
  };

  var PERMISSIONS = {
    INFORMATIONAL: "INFORMATIONAL",
    NAVIGATIONAL: "NAVIGATIONAL",
    READ_ONLY: "READ_ONLY",
    ASSISTED: "ASSISTED",
    APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
    TRANSACTIONAL: "TRANSACTIONAL",
    UNAVAILABLE: "UNAVAILABLE"
  };

  var AUDIT_KEY = "mti6_command_audit_v1";
  var AUDIT_MAX = 200;

  var TRANSACTIONAL_UNAVAILABLE =
    "UNAVAILABLE — no transactional capability exists in this cockpit";

  // The 20 known routes (same set as js/app.js ROUTES). Navigation may
  // only ever target one of these; anything else is an unknown route.
  var ROUTES = {
    dashboard: { label: "Cockpit Status", aliases: ["cockpit status", "cockpit", "dashboard"] },
    vault: { label: "Knowledge", aliases: ["knowledge", "knowledge vault", "vault"] },
    tasks: { label: "Mission Control — Tasks", aliases: ["mission control tasks", "mission control", "tasks"] },
    projects: { label: "Mission Control — Projects", aliases: ["mission control projects", "projects"] },
    expenses: { label: "Resource Tracker", aliases: ["resource tracker", "expenses", "spending"] },
    globe: { label: "World Globe", aliases: ["world globe", "globe", "home"] },
    crypto: { label: "Crypto Market", aliases: ["crypto market", "crypto"] },
    "crypto-world": { label: "Crypto World", aliases: ["crypto world"] },
    "bot-ops": { label: "Bot Operations", aliases: ["bot operations", "bot ops"] },
    wallets: { label: "Wallets", aliases: ["wallets", "wallet"] },
    opportunities: { label: "Opportunities", aliases: ["opportunities"] },
    earn: { label: "Earnings", aliases: ["earnings", "earn"] },
    positions: { label: "Positions & Assets", aliases: ["positions and assets", "positions", "assets"] },
    encyclopedia: { label: "Encyclopedia", aliases: ["encyclopedia"] },
    operations: { label: "Operations", aliases: ["operations"] },
    accounts: { label: "Accounts & Finance", aliases: ["accounts and finance", "accounts"] },
    web: { label: "Web — Bot Work", aliases: ["web bot work", "web"] },
    analytics: { label: "Data Analytics", aliases: ["data analytics", "analytics"] },
    security: { label: "Security & Bot Style", aliases: ["security and bot style", "security"] },
    settings: { label: "Settings", aliases: ["settings"] }
  };

  // Words that name a financial execution. Gerunds are included so
  // "start staking my tokens" is caught, but a definition question
  // ("what is staking") is guarded out before this test runs — asking
  // what something is is not asking to do it.
  var TRANSACTIONAL_RE = /\b(buy|buying|sell|selling|trade|trading|swap|swapping|stake|staking|lend|lending|borrow|borrowing|claim|claiming|withdraw|withdrawing)\b|\bsend money\b|\bsend\b[^.]{0,40}\b(bitcoin|btc|eth|sol|crypto|tokens?|coins?|money)\b/;

  var APPROVAL_RE = /\b(deploy|deploying|github|pull request|merge|commit|push|delegate|delegating|assign\b[^.]{0,30}\bworker|create (a )?worker|code change|change the code|update the code|fix the code)\b/;

  // Read-only GitHub activity is a scout question, not a GitHub action.
  var GITHUB_ACTIVITY_RE = /\b(github|repo)\b[^.]{0,30}\b(activity|commits?)\b|recent commits/;

  var STATUS_RE = /\bstatus\b|how are you|what'?s connected|what is connected|are you (connected|online|there|working)|what'?s your status|are we connected/;

  var NAV_RE = /^(go to|goto|take me to|navigate to|open|show me|show|bring me to|go)\b/;

  var SEARCH_RE = /\b(search|find|look up|lookup)\b/;

  var EXPLAIN_RE = /^(what is|what are|what'?s|what does|explain|tell me about|define|how does|how do|how is)\b|\b(tell me about|explain)\b/;

  var QUESTION_RE = /^(what|how|why|when|where|explain|tell me|define)\b/;
  var ACTOR_RE = /\b(i|me|my|mine)\b/;

  var BARE_AMBIGUOUS = ["do it", "that one", "this one", "do that", "yes", "ok", "okay", "go ahead", "do it now", "that", "this", "it", "huh"];

  function newId() {
    return "cmd-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function normalize(s) {
    return String(s == null ? "" : s).toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[—–-]/g, " ")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ").trim();
  }

  function findRoute(text) {
    var norm = normalize(text);
    if (!norm) return null;
    var padded = " " + norm + " ";
    var candidates = [];
    Object.keys(ROUTES).forEach(function (key) {
      var phrases = [ROUTES[key].label].concat(ROUTES[key].aliases || []).concat([key]);
      phrases.forEach(function (p) {
        var phrase = normalize(p);
        if (phrase) candidates.push({ phrase: phrase, route: key, label: ROUTES[key].label });
      });
    });
    // Longest phrase first, so "crypto world" beats "crypto" and
    // "mission control tasks" beats "mission control".
    candidates.sort(function (a, b) { return b.phrase.length - a.phrase.length; });
    for (var i = 0; i < candidates.length; i++) {
      if (padded.indexOf(" " + candidates[i].phrase + " ") !== -1) return candidates[i];
    }
    return null;
  }

  function stripLeading(text, re) {
    return String(text || "").replace(re, "").trim();
  }

  function baseCommand(clean, source) {
    return {
      id: newId(),
      text: clean,
      intent: INTENTS.UNAVAILABLE,
      parameters: {},
      source: source || "star",
      requestedAction: clean,
      permission: PERMISSIONS.UNAVAILABLE,
      approvalRequired: false,
      executionCapability: "UNAVAILABLE — no capability matches this command.",
      resultState: "NOT_EXECUTED",
      errorState: "",
      audit: null
    };
  }

  function finishAudit(cmd) {
    cmd.audit = {
      id: cmd.id,
      at: new Date().toISOString(),
      text: cmd.text,
      intent: cmd.intent,
      permission: cmd.permission,
      executed: false,
      resultState: cmd.resultState
    };
    return cmd;
  }

  // The transactional check for the command path. There are no
  // capability records anywhere in the command path — a command never
  // carries one, and this module never consults a registry — so this
  // is always false. The enum existing does not enable anything, and
  // no record can be smuggled in through a command object.
  function hasTransactionalCapability(command) {
    void command;
    return false;
  }

  function parseCommand(text, source) {
    var clean = text == null ? "" : String(text).trim();
    var cmd = baseCommand(clean, source);
    if (!clean) {
      cmd.errorState = "empty";
      cmd.resultState = "NOT_EXECUTED";
      return finishAudit(cmd);
    }

    var norm = normalize(clean);
    var lower = clean.toLowerCase();

    // Bare vague phrases ("do it", "that one") name no action at all.
    if (BARE_AMBIGUOUS.indexOf(norm) !== -1) {
      cmd.errorState = "ambiguous";
      cmd.resultState = "NEEDS_REVIEW";
      return finishAudit(cmd);
    }

    // A definition question ("what is staking", "how does staking work")
    // with no first-person actor is a question, not an execution
    // request, so the blocking detectors below do not fire on it.
    var isQuestion = QUESTION_RE.test(norm);
    var hasActor = ACTOR_RE.test(norm);
    var questionOnly = isQuestion && !hasActor;

    var candidates = [];

    // Blocking intents always outrank everything else: fail closed.
    if (!questionOnly && TRANSACTIONAL_RE.test(lower)) {
      var verb = (lower.match(/\b(buy|buying|sell|selling|trade|trading|swap|swapping|stake|staking|lend|lending|borrow|borrowing|claim|claiming|withdraw|withdrawing)\b/) || [null, ""])[1] || "send";
      candidates.push({ intent: INTENTS.APPROVAL_REQUIRED, weight: 100, permission: PERMISSIONS.TRANSACTIONAL, approvalRequired: true, executionCapability: TRANSACTIONAL_UNAVAILABLE, resultState: "UNAVAILABLE", parameters: { action: verb }, requestedAction: verb });
    }
    if (!questionOnly && APPROVAL_RE.test(lower) && !GITHUB_ACTIVITY_RE.test(lower)) {
      var act = /\bdeploy/.test(lower) ? "deploy" : (/\bdelegate\b/.test(lower) ? "delegate" : (/\bgithub\b/.test(lower) ? "github" : "approval-required work"));
      candidates.push({ intent: INTENTS.APPROVAL_REQUIRED, weight: 90, permission: PERMISSIONS.APPROVAL_REQUIRED, approvalRequired: true, executionCapability: "UNAVAILABLE — approval-required work is never executed by StarCommand.", resultState: "APPROVAL_REQUIRED", parameters: { action: act }, requestedAction: act });
    }

    if (STATUS_RE.test(lower)) {
      candidates.push({ intent: INTENTS.STATUS, weight: 50, permission: PERMISSIONS.READ_ONLY, approvalRequired: false, executionCapability: "READ_ONLY — local status only; no counts are invented.", resultState: "NOT_EXECUTED", parameters: {}, requestedAction: "status" });
    }

    var navMatch = NAV_RE.exec(norm);
    if (navMatch) {
      var found = findRoute(clean);
      var isOpen = navMatch[1] === "open";
      candidates.push({
        intent: isOpen ? INTENTS.OPEN : INTENTS.NAVIGATION,
        weight: found ? 50 : 40,
        permission: PERMISSIONS.NAVIGATIONAL,
        approvalRequired: false,
        executionCapability: "NAVIGATION — hash routing to a known screen only.",
        resultState: "NOT_EXECUTED",
        errorState: found ? "" : "unknown route",
        parameters: found ? { route: found.route, routeLabel: found.label } : { route: null, routeLabel: null },
        requestedAction: found ? "navigate:" + found.route : "navigate:unknown"
      });
    }

    if (/\bcompare\b|\bversus\b|\bvs\.?\b/.test(lower)) {
      candidates.push({ intent: INTENTS.COMPARE, weight: 40, permission: PERMISSIONS.INFORMATIONAL, approvalRequired: false, executionCapability: "INFORMATIONAL — comparison only; never executes a trade or swap.", resultState: "NOT_EXECUTED", parameters: { query: clean }, requestedAction: "compare" });
    }

    if (/\bprice\b/.test(lower) && /\b(btc|eth|sol|doge|xrp|bitcoin|ethereum|solana|crypto)\b/.test(lower)) {
      candidates.push({ intent: INTENTS.SEARCH, weight: 45, permission: PERMISSIONS.INFORMATIONAL, approvalRequired: false, executionCapability: "SEARCH — GlobalSearch when loaded, otherwise NOT_CONNECTED.", resultState: "NOT_EXECUTED", parameters: { query: clean }, requestedAction: "search:" + clean });
    } else if (SEARCH_RE.test(lower) || GITHUB_ACTIVITY_RE.test(lower)) {
      var query = stripLeading(clean, /^(search for|search|find|look up|lookup)\b/i);
      candidates.push({ intent: INTENTS.SEARCH, weight: 40, permission: PERMISSIONS.INFORMATIONAL, approvalRequired: false, executionCapability: "SEARCH — GlobalSearch when loaded, otherwise NOT_CONNECTED.", resultState: "NOT_EXECUTED", parameters: { query: query || clean }, requestedAction: "search:" + (query || clean) });
    }

    if (EXPLAIN_RE.test(lower)) {
      var topic = stripLeading(clean, /^(what is|what are|what'?s|what does|explain|tell me about|define|how does|how do|how is)\b/i);
      topic = stripLeading(topic, /^(the|a|an)\b/i);
      candidates.push({ intent: INTENTS.KNOWLEDGE, weight: 40, permission: PERMISSIONS.INFORMATIONAL, approvalRequired: false, executionCapability: "KNOWLEDGE — EncyclopediaBridge when loaded, otherwise NOT_CONNECTED.", resultState: "NOT_EXECUTED", parameters: { topic: topic || clean }, requestedAction: "explain:" + (topic || clean) });
    }

    if (/\b(bots?|tribes?)\b/.test(lower)) {
      candidates.push({ intent: INTENTS.BOT, weight: 30, permission: PERMISSIONS.READ_ONLY, approvalRequired: false, executionCapability: "READ_ONLY — bot and tribe status only.", resultState: "NOT_EXECUTED", parameters: {}, requestedAction: "bot status" });
    }
    if (/\b(workers?)\b/.test(lower)) {
      candidates.push({ intent: INTENTS.WORKER, weight: 30, permission: PERMISSIONS.READ_ONLY, approvalRequired: false, executionCapability: "READ_ONLY — worker status only.", resultState: "NOT_EXECUTED", parameters: {}, requestedAction: "worker status" });
    }
    if (/\bsettings\b/.test(lower) || (/\b(change|switch|set|update)\b/.test(lower) && /\b(theme|setting|currency|language|mode)\b/.test(lower))) {
      candidates.push({ intent: INTENTS.SETTINGS, weight: 30, permission: PERMISSIONS.ASSISTED, approvalRequired: false, executionCapability: "ASSISTED — Star can explain a setting; it does not change settings by command.", resultState: "NOT_EXECUTED", parameters: {}, requestedAction: "settings" });
    }
    if (/\b(analytics|spending|earnings|charts?)\b/.test(lower)) {
      candidates.push({ intent: INTENTS.ANALYTICS, weight: 30, permission: PERMISSIONS.READ_ONLY, approvalRequired: false, executionCapability: "READ_ONLY — analytics are read-only.", resultState: "NOT_EXECUTED", parameters: {}, requestedAction: "analytics" });
    }
    if (/^(research|investigate|look into)\b/.test(norm)) {
      candidates.push({ intent: INTENTS.RESEARCH, weight: 30, permission: PERMISSIONS.INFORMATIONAL, approvalRequired: false, executionCapability: "INFORMATIONAL — reading only.", resultState: "NOT_EXECUTED", parameters: { query: clean }, requestedAction: "research:" + clean });
    }
    if (/^(monitor|watch|track)\b/.test(norm)) {
      candidates.push({ intent: INTENTS.MONITOR, weight: 30, permission: PERMISSIONS.READ_ONLY, approvalRequired: false, executionCapability: "READ_ONLY — monitoring is not connected.", resultState: "NOT_EXECUTED", parameters: { query: clean }, requestedAction: "monitor:" + clean });
    }

    if (!candidates.length) {
      cmd.errorState = "unknown command";
      cmd.resultState = "NOT_EXECUTED";
      return finishAudit(cmd);
    }

    var max = 0;
    candidates.forEach(function (c) { if (c.weight > max) max = c.weight; });
    var tops = candidates.filter(function (c) { return c.weight === max; });
    // Two different intents with equal top confidence: do not guess.
    var distinct = [];
    tops.forEach(function (c) { if (distinct.indexOf(c.intent) === -1) distinct.push(c.intent); });
    if (distinct.length > 1) {
      cmd.errorState = "ambiguous";
      cmd.resultState = "NEEDS_REVIEW";
      cmd.parameters = { candidates: distinct };
      return finishAudit(cmd);
    }

    var win = tops[0];
    cmd.intent = win.intent;
    cmd.permission = win.permission;
    cmd.approvalRequired = win.approvalRequired;
    cmd.executionCapability = win.executionCapability;
    cmd.resultState = win.resultState;
    cmd.errorState = win.errorState || "";
    cmd.parameters = win.parameters || {};
    cmd.requestedAction = win.requestedAction || clean;
    // A KNOWLEDGE question phrased as "explain X" keeps the EXPLAIN
    // intent; "what is X" keeps KNOWLEDGE. Both execute the same way.
    if (cmd.intent === INTENTS.KNOWLEDGE && /^(explain|tell me about)\b/.test(lower)) {
      cmd.intent = INTENTS.EXPLAIN;
    }
    return finishAudit(cmd);
  }

  function reasonFor(cmd) {
    if (cmd.permission === PERMISSIONS.TRANSACTIONAL) {
      return "Financial execution words were found; no transactional capability exists in this cockpit, so the request needs owner approval and is not executed.";
    }
    if (cmd.intent === INTENTS.APPROVAL_REQUIRED) {
      return "This names GitHub, deployment, code changes, or delegating work, which always needs owner approval and is never executed by StarCommand.";
    }
    if (cmd.resultState === "NEEDS_REVIEW") {
      return "The request is ambiguous; StarCommand asks for clarification instead of guessing.";
    }
    if (cmd.intent === INTENTS.NAVIGATION || cmd.intent === INTENTS.OPEN) {
      return cmd.parameters && cmd.parameters.route ? "Navigation to a known screen." : "A navigation phrase with no known screen.";
    }
    if (cmd.intent === INTENTS.SEARCH) return "A search request; informational only.";
    if (cmd.intent === INTENTS.KNOWLEDGE || cmd.intent === INTENTS.EXPLAIN) return "An explanation request; informational only.";
    if (cmd.intent === INTENTS.STATUS) return "A status request; read-only.";
    if (cmd.intent === INTENTS.COMPARE) return "A comparison request; informational only, never a trade.";
    if (cmd.errorState === "empty") return "No command text was given.";
    if (cmd.intent === INTENTS.UNAVAILABLE) return "No command pattern matched; the request is not executed.";
    return "Classified as " + cmd.intent + "; read-only or assisted, never executed without a real capability.";
  }

  function classify(text) {
    var cmd;
    try {
      cmd = parseCommand(text);
    } catch (e) {
      cmd = baseCommand("", "star");
      cmd.errorState = "unknown command";
    }
    return {
      intent: cmd.intent,
      permission: cmd.permission,
      approvalRequired: cmd.approvalRequired,
      reason: reasonFor(cmd)
    };
  }

  // ---- Audit log (bounded, newest first, never breaks execution) ----
  function readAudit() {
    try {
      if (!global.localStorage) return [];
      var raw = global.localStorage.getItem(AUDIT_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function appendAudit(record) {
    try {
      if (!global.localStorage) return false;
      var log = readAudit();
      log.unshift(record);
      if (log.length > AUDIT_MAX) log.length = AUDIT_MAX;
      global.localStorage.setItem(AUDIT_KEY, JSON.stringify(log));
      return true;
    } catch (e) {
      return false;
    }
  }

  function getAuditLog() {
    return readAudit().slice();
  }

  function clearAuditLog() {
    try {
      if (global.localStorage) global.localStorage.removeItem(AUDIT_KEY);
    } catch (e) {
      /* audit clear failure is not an execution failure */
    }
    return true;
  }

  // ---- Truthful status: only real, synchronously readable state ----
  function getStatusText() {
    var parts = [];
    parts.push("Star status (local only — StarCommand has no live AI backend of its own):");
    if (global.StarBackend && typeof global.StarBackend.isDemo === "function") {
      try {
        parts.push(global.StarBackend.isDemo()
          ? "Star backend: demo mode — no AI backend is connected."
          : "Star backend: connected (live backend).");
      } catch (e) {
        parts.push("Star backend state: UNKNOWN.");
      }
    } else {
      parts.push("Star backend state: UNKNOWN — StarBackend is not loaded.");
    }
    if (global.Tribes && typeof global.Tribes.getWorkersActive === "function") {
      try {
        var w = global.Tribes.getWorkersActive();
        parts.push("Workers active: " + (w && typeof w.count === "number" ? w.count : "UNKNOWN") +
          " — " + (w && w.state ? w.state : "UNKNOWN") + ".");
      } catch (e) {
        parts.push("Workers: UNKNOWN.");
      }
    } else {
      parts.push("Workers active: UNKNOWN — NOT_CONNECTED (no worker system is loaded, so no count is claimed).");
    }
    parts.push("Crypto World counts: UNKNOWN — counts are not available synchronously from StarCommand, and no number is guessed here.");
    parts.push("Nothing was changed by this status check.");
    return parts.join(" ");
  }

  // The encyclopedia bridge answers with a string, or with an object
  // carrying a .text string (async: a Promise of either). Anything
  // else is "no answer" — never a fabricated one.
  function bridgeText(answer) {
    if (typeof answer === "string" && answer.trim()) return answer;
    if (answer && typeof answer.text === "string" && answer.text.trim()) return answer.text;
    return null;
  }

  // Saved-knowledge fallback for a KNOWLEDGE/EXPLAIN question the
  // encyclopedia bridge could not match. The bridge answers structural
  // questions from canonical records; saved bot knowledge answers
  // everything else the user saved. A bridge "no match" must not
  // swallow a saved answer that exists — the old Star flow answered
  // from saved knowledge first, and this preserves that.
  function scoutAnswer(cmd) {
    if (global.KnowledgeScout && typeof global.KnowledgeScout.answer === "function") {
      try {
        var known = global.KnowledgeScout.answer(cmd.text);
        if (typeof known === "string" && known.trim()) return known;
      } catch (e) {}
    }
    return null;
  }

  function result(cmd, executed, resultState, message, errorState) {
    var r = {
      executed: !!executed,
      resultState: resultState,
      message: message,
      text: message,
      intent: cmd.intent,
      permission: cmd.permission,
      commandId: cmd.id
    };
    if (errorState) r.errorState = errorState;
    if (cmd.parameters && cmd.parameters.route) r.route = cmd.parameters.route;
    return r;
  }

  function dispatch(cmd) {
    // TRANSACTIONAL permission always fails closed, whatever the intent.
    if (cmd.permission === PERMISSIONS.TRANSACTIONAL) {
      return result(cmd, false, "UNAVAILABLE",
        "This asks for a financial action (buy, sell, trade, swap, stake, lend, borrow, claim, or withdrawal). " +
        TRANSACTIONAL_UNAVAILABLE + ". Nothing was bought, sold, traded, or moved.");
    }
    if (cmd.intent === INTENTS.APPROVAL_REQUIRED) {
      return result(cmd, false, "APPROVAL_REQUIRED",
        "This needs owner approval and is not executed: \u201C" + cmd.text.slice(0, 200) + "\u201D. " +
        "GitHub, deployment, code changes, and delegating work to a worker are approval-required in Star 3.0 V1, " +
        "and StarCommand never runs them on its own.");
    }
    if (cmd.errorState === "ambiguous" || cmd.resultState === "NEEDS_REVIEW") {
      return result(cmd, false, "NEEDS_REVIEW",
        "That is ambiguous — I cannot tell which screen, search, or question you mean, so I did nothing. " +
        "Please say it exactly, for example \u201Cgo to Encyclopedia\u201D or \u201Csearch for staking\u201D.",
        "ambiguous");
    }
    if (cmd.intent === INTENTS.UNAVAILABLE) {
      if (cmd.errorState === "empty") {
        return result(cmd, false, "NOT_EXECUTED", "I did not receive a command — nothing was run.", "empty");
      }
      return result(cmd, false, "NOT_EXECUTED",
        "I do not recognise that as a Star command, so I did nothing. Try \u201Cgo to Encyclopedia\u201D, " +
        "\u201Csearch for staking\u201D, \u201Cwhat is staking\u201D, or \u201Cstatus\u201D.",
        "unknown command");
    }

    if (cmd.intent === INTENTS.NAVIGATION || cmd.intent === INTENTS.OPEN) {
      var route = cmd.parameters && cmd.parameters.route;
      if (!route || !ROUTES[route]) {
        return result(cmd, false, "NOT_EXECUTED",
          "There is no screen called \u201C" + cmd.text.slice(0, 120) + "\u201D in this cockpit, so I did not navigate anywhere. " +
          "Known screens include World Globe, Encyclopedia, Crypto World, Bot Operations, and Settings.",
          "unknown route");
      }
      try {
        if (global.location) global.location.hash = "#/" + route;
      } catch (e) {
        return result(cmd, false, "NOT_EXECUTED", "Navigation to " + ROUTES[route].label + " failed in this browser — nothing changed.", "navigation failed");
      }
      var label = ROUTES[route].label;
      return result(cmd, true, "EXECUTED", "Opened " + label + ".");
    }

    if (cmd.intent === INTENTS.SEARCH) {
      var query = (cmd.parameters && cmd.parameters.query) || cmd.text;
      if (global.GlobalSearch && typeof global.GlobalSearch.runSearch === "function") {
        try {
          global.GlobalSearch.runSearch(query);
        } catch (e) {
          return result(cmd, false, "NOT_EXECUTED", "Search failed while running — nothing was changed.", "search failed");
        }
        return result(cmd, true, "EXECUTED", "Searched for \u201C" + query + "\u201D. Results are shown in the global search bar.");
      }
      return result(cmd, false, "NOT_CONNECTED",
        "Search is not connected right now — GlobalSearch did not load, so nothing was searched.");
    }

    if (cmd.intent === INTENTS.KNOWLEDGE || cmd.intent === INTENTS.EXPLAIN) {
      var topic = (cmd.parameters && cmd.parameters.topic) || cmd.text;
      if (global.EncyclopediaBridge && typeof global.EncyclopediaBridge.answerStructural === "function") {
        var bridged;
        try {
          bridged = global.EncyclopediaBridge.answerStructural(topic);
        } catch (e) {
          return result(cmd, false, "NOT_CONNECTED", "The Encyclopedia bridge could not answer that right now — nothing was invented.");
        }
        if (bridged && typeof bridged.then === "function") {
          // Async bridge: resolve to the same result shape, never a
          // simulated answer. A bridge "no match" (found === false)
          // falls back to saved knowledge before admitting no answer.
          return bridged.then(function (answer) {
            if (answer && answer.found === false) {
              var knownAsync = scoutAnswer(cmd);
              if (knownAsync) return result(cmd, true, "EXECUTED", knownAsync);
            }
            var asyncText = bridgeText(answer);
            if (asyncText) {
              return result(cmd, true, "EXECUTED", asyncText);
            }
            return result(cmd, false, "NOT_EXECUTED",
              "The Encyclopedia has no structural answer for \u201C" + topic + "\u201D yet — nothing was invented.",
              "no answer");
          }).catch(function () {
            return result(cmd, false, "NOT_CONNECTED", "The Encyclopedia bridge could not answer that right now — nothing was invented.");
          });
        }
        if (bridged && typeof bridged === "object" && bridged.found === false) {
          var knownSync = scoutAnswer(cmd);
          if (knownSync) return result(cmd, true, "EXECUTED", knownSync);
        }
        var bridgedText = bridgeText(bridged);
        if (bridgedText) {
          return result(cmd, true, "EXECUTED", bridgedText);
        }
        return result(cmd, false, "NOT_EXECUTED",
          "The Encyclopedia has no structural answer for \u201C" + topic + "\u201D yet — nothing was invented.",
          "no answer");
      }
      var known = scoutAnswer(cmd);
      if (known) return result(cmd, true, "EXECUTED", known);
      return result(cmd, false, "NOT_CONNECTED",
        "The Encyclopedia bridge is not connected, and no saved knowledge answered that — so I have no answer to give, and I did not invent one.");
    }

    if (cmd.intent === INTENTS.STATUS) {
      return result(cmd, true, "EXECUTED", getStatusText());
    }

    // Classified but not executable by StarCommand: COMPARE, BOT,
    // WORKER, SETTINGS, ANALYTICS, RESEARCH, MONITOR. Never executed.
    var notes = {};
    notes[INTENTS.COMPARE] = "Comparing is informational only in this cockpit — I did not execute any trade or swap, and Star command does not run comparisons yet. Ask for a price, or open Data Analytics to compare figures there.";
    notes[INTENTS.BOT] = "Bot status is read-only, and Star command does not list or start bots yet. No bot was started and nothing was changed.";
    notes[INTENTS.WORKER] = "Worker status is read-only, and no worker system is connected. No worker was assigned and nothing was changed.";
    notes[INTENTS.SETTINGS] = "Star command does not change settings by itself. Open Settings from the drawer to change a setting — nothing was changed here.";
    notes[INTENTS.ANALYTICS] = "Analytics are read-only. Open Data Analytics to see the charts — nothing was changed here.";
    notes[INTENTS.RESEARCH] = "Research is not connected as a Star command yet, so nothing was researched and nothing was changed.";
    notes[INTENTS.MONITOR] = "Monitoring is not connected, so nothing is being watched and nothing was changed.";
    return result(cmd, false, "NOT_EXECUTED",
      notes[cmd.intent] || "That is classified as " + cmd.intent + ", which Star command does not execute — nothing was changed.",
      "unsupported intent");
  }

  function execute(command) {
    var cmd = null;
    if (typeof command === "string") {
      try {
        cmd = parseCommand(command);
      } catch (e) {
        cmd = baseCommand(command, "star");
        cmd.errorState = "unknown command";
      }
    } else if (command && typeof command === "object") {
      cmd = command;
    } else {
      cmd = baseCommand("", "star");
      cmd.errorState = "empty";
    }
    if (!cmd.id) cmd.id = newId();
    if (!cmd.text) cmd.text = "";
    if (!cmd.intent) cmd.intent = INTENTS.UNAVAILABLE;
    if (!cmd.permission) cmd.permission = PERMISSIONS.UNAVAILABLE;

    var out = null;
    try {
      out = dispatch(cmd);
    } catch (e) {
      out = result(cmd, false, "NOT_EXECUTED", "That command could not be run safely, so nothing was changed.", "execution error");
    }

    function auditFor(res) {
      appendAudit({
        id: cmd.id,
        at: new Date().toISOString(),
        text: cmd.text,
        intent: cmd.intent,
        permission: cmd.permission,
        executed: !!res.executed,
        resultState: res.resultState
      });
      return res;
    }

    // Audit every execute() call. A failed audit write never breaks
    // execution: appendAudit already swallows its own errors.
    if (out && typeof out.then === "function") {
      return out.then(auditFor, function (err) {
        var fallback = result(cmd, false, "NOT_CONNECTED", "The Encyclopedia bridge could not answer that right now — nothing was invented.");
        return auditFor(fallback);
      });
    }
    return auditFor(out);
  }

  var routeLabels = {};
  Object.keys(ROUTES).forEach(function (key) { routeLabels[key] = ROUTES[key].label; });

  global.StarCommand = {
    INTENTS: INTENTS,
    PERMISSIONS: PERMISSIONS,
    ROUTES: routeLabels,
    AUDIT_KEY: AUDIT_KEY,
    AUDIT_MAX: AUDIT_MAX,
    parseCommand: parseCommand,
    classify: classify,
    execute: execute,
    getAuditLog: getAuditLog,
    clearAuditLog: clearAuditLog,
    getStatusText: getStatusText,
    hasTransactionalCapability: hasTransactionalCapability
  };
})(window);
