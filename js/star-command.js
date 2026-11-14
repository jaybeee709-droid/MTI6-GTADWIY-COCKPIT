/* MTI6-GTADWIY-COCKPIT — Star command foundation (Priorities 2 + 3)
 *
 * The fail-closed command layer for Star 3.0. It classifies a line of
 * text into an intent, declares the permission that intent needs, and
 * either executes it through a real, already-loaded capability or
 * refuses honestly. It never simulates a successful execution.
 *
 * Hard rules, in plain terms:
 *   - INFORMATIONAL never implies TRANSACTIONAL. Naming a financial
 *     action (buy, sell, trade, swap, stake, lend, borrow, bridge,
 *     claim, withdraw, send money) is always APPROVAL_REQUIRED with permission
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
 *
 * Wallet commands (Wallet spec W11, step 9) extend this same system
 * with a WALLET intent (READ_ONLY). They read only what
 * WalletIntelligence / OpportunityIntelligence / NetworkIntelligence
 * actually hold, through typeof guards, and never invent a wallet,
 * a balance, a position, an opportunity, or a network-health reading:
 * nothing connected is NOT_CONNECTED, never a fabricated number.
 * Transaction-like words ("send $500", "cash out") stay TRANSACTIONAL
 * and fail closed with reason EXECUTION_DISABLED. "simulate this
 * strategy" returns a SIMULATION record only — mode SIMULATION,
 * executed false, never presented as a real execution. Costs use the
 * 10-label cost vocabulary and are UNKNOWN unless a sourced value
 * exists; UNKNOWN is never zero. No command here signs, broadcasts,
 * or executes anything.
 *
 * Crypto World commands (Crypto spec C8) extend this same system
 * with a CRYPTO intent (READ_ONLY, weight 70, above the generic
 * STATUS / NAVIGATION / COMPARE candidates). They read only what the
 * canonical Encyclopedia (Batch A + canonical 60 + Batch B records),
 * AssetIntelligence, NetworkIntelligence, OpportunityIntelligence,
 * RiskIntelligence, and TreasuryMandates actually hold, through
 * typeof guards, and never invent a Type, a Strategy, a network, a
 * position, an opportunity, a risk score, or a bot assignment:
 * nothing on record is NO_SUCH_ACTIVITY / NO_SUCH_TYPE /
 * NO_SUCH_OPPORTUNITY / UNKNOWN / NOT_CONNECTED, never a fabricated
 * entry. EXPLAIN, ANALYZE, SIMULATE, PREPARE, and EXECUTE are
 * different intentions: a question about SWAP, STAKE, BRIDGE, LEND,
 * or BORROW never becomes execution — the transactional blockers in
 * parseCommand fail those closed with reason EXECUTION_DISABLED
 * before dispatch runs. A structural list phrase ("show types under
 * lending") names a Major Activity, never an execution, even when
 * the name contains a word like "lending".
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
    WALLET: "WALLET",
    CRYPTO: "CRYPTO",
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
  // what something is is not asking to do it. "Bridge" / "bridging"
  // is a financial execution too (moving assets cross-chain), so a
  // bridge question with an actor ("bridge my ETH") fails closed
  // like every other execution word.
  var TRANSACTIONAL_RE = /\b(buy|buying|sell|selling|trade|trading|swap|swapping|stake|staking|lend|lending|borrow|borrowing|bridge|bridging|claim|claiming|withdraw|withdrawing)\b|\bsend money\b|\bsend\b[^.]{0,40}\b(bitcoin|btc|eth|sol|crypto|tokens?|coins?|money)\b/;

  var APPROVAL_RE = /\b(deploy|deploying|github|pull request|merge|commit|push|delegate|delegating|assign\b[^.]{0,30}\bworker|create (a )?worker|code change|change the code|update the code|fix the code)\b/;

  // Transaction-like words the verb list misses: "send $500" names an
  // amount, not an asset word, and "cash out" is a withdrawal phrase.
  // Both stay TRANSACTIONAL and fail closed like every other
  // execution word. Kept narrow (an amount or "cash out" must be
  // present) so "send a message" is not misread as a payment.
  var TRANSACTIONAL_SEND_AMOUNT_RE = /\bsend\b[^.]{0,40}(\$|€|£|usd|eur|gbp)?\s?\d/;
  var TRANSACTIONAL_CASHOUT_RE = /\bcash(ing)?\s*out\b|\bcashout\b/;

  // Cost vocabulary (Wallet spec W11 / D4). UNKNOWN is a state, never
  // a zero: a cost entry is either { kind, state: "UNKNOWN" } or a
  // sourced value, never an invented number.
  var COST_VOCABULARY = ["NETWORK_GAS_COST", "PROTOCOL_FEE",
    "TRADING_SWAP_FEE", "SLIPPAGE", "BORROW_COST", "FUNDING_COST",
    "BRIDGE_COST", "PERFORMANCE_FEE", "INFRASTRUCTURE_COST",
    "EXIT_COST", "UNKNOWN"];

  // Wallet read commands. Each maps to a walletAction; dispatchWallet
  // reads the real registries (typeof-guarded) and reports honest
  // empty states. "balance" is a read, not an execution: with nothing
  // connected it answers NOT_CONNECTED, never a number.
  var WALLET_ACTIONS = {
    LIST: "list",
    STATUS: "status",
    BALANCE: "balance",
    ASSETS: "assets",
    POSITIONS: "positions",
    OPPORTUNITIES: "opportunities",
    ANALYZE: "analyze",
    NETWORK_HEALTH: "networkHealth",
    COSTS: "costs",
    SIMULATE: "simulate"
  };

  // Crypto World read commands (Crypto spec C8). Each maps to a
  // cryptoAction; dispatchCrypto reads the real registries
  // (typeof-guarded) and reports honest empty states. A definition
  // question stays a question: only a crypto-world-scoped phrasing
  // ("what is staking in crypto world") is a CRYPTO explain — a plain
  // "what is staking" stays KNOWLEDGE, as before. "Opportunities for
  // X" stays WALLET; only "opportunities involving X" is CRYPTO.
  var CRYPTO_ACTIONS = {
    EXPLAIN: "explain",
    TYPES_UNDER: "typesUnder",
    STRATEGIES_UNDER: "strategiesUnder",
    ASSET_NETWORK: "assetNetwork",
    POSITION: "position",
    OPPORTUNITIES: "opportunities",
    RISK_COMPARE: "riskCompare",
    BLOCKED_REASONS: "blockedReasons",
    BOT_ASSIGNMENTS: "botAssignments"
  };

  // Read-only GitHub activity is a scout question, not a GitHub action.
  var GITHUB_ACTIVITY_RE = /\b(github|repo)\b[^.]{0,30}\b(activity|commits?)\b|recent commits/;

  var STATUS_RE = /\bstatus\b|how are you|what'?s connected|what is connected|are you (connected|online|there|working)|what'?s your status|are we connected/;

  var NAV_RE = /^(go to|goto|take me to|navigate to|open|show me|show|bring me to|go)\b/;

  var SEARCH_RE = /\b(search|find|look up|lookup)\b/;

  var EXPLAIN_RE = /^(what is|what are|what'?s|what does|explain|tell me about|define|how does|how do|how is)\b|\b(tell me about|explain)\b/;

  var QUESTION_RE = /^(what|which|how|why|when|where|explain|tell me|define)\b/;
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

  // Matches a wallet read phrase to a walletAction, or null. Checked
  // in a fixed order so the most specific phrase wins: balance before
  // list ("show my wallet balance" names a balance, not a wallet
  // list), status before list, opportunities before assets. The asset
  // for an opportunities request is the text after "for", unless it
  // is just "this asset" (no asset named); the strategy for a
  // simulation is the text after "simulate", unless it is just "this
  // strategy" (no strategy named). Returns parameters for parseCommand.
  function matchWalletAction(lower, clean) {
    var asset = null;
    var strategy = null;
    var m;
    if (/\b(wallet balance|my balance|show (my )?balance)\b/.test(lower)) {
      return { walletAction: WALLET_ACTIONS.BALANCE };
    }
    if (/\bwallet status\b|\bshow (my )?wallet status\b/.test(lower)) {
      return { walletAction: WALLET_ACTIONS.STATUS };
    }
    if (/\bnetwork health\b/.test(lower)) {
      return { walletAction: WALLET_ACTIONS.NETWORK_HEALTH };
    }
    if (/\bcompare costs\b|\bcost comparison\b/.test(lower)) {
      return { walletAction: WALLET_ACTIONS.COSTS };
    }
    if (/\bopportunit(?:y|ies) for\b/.test(lower)) {
      m = clean.match(/opportunit(?:y|ies)\s+for\s+(.+?)\s*$/i);
      if (m) {
        var raw = m[1].replace(/^(the|a|an)\s+/i, "").trim();
        if (raw && !/^this asset$/i.test(raw)) asset = raw;
      }
      return { walletAction: WALLET_ACTIONS.OPPORTUNITIES, asset: asset };
    }
    if (/\banaly[sz]e\b[^.]{0,40}\bwallet\b/.test(lower)) {
      return { walletAction: WALLET_ACTIONS.ANALYZE };
    }
    if (/\bsimulate\b/.test(lower)) {
      m = clean.match(/simulate\s+(.+?)\s*$/i);
      if (m) {
        var s = m[1].replace(/^(this|the|a|an)\s+/i, "").trim();
        if (s && !/^strategy$/i.test(s)) strategy = s;
      }
      return { walletAction: WALLET_ACTIONS.SIMULATE, strategy: strategy };
    }
    if (/\b(show|list|my) (my )?assets\b|\bmy assets\b/.test(lower)) {
      return { walletAction: WALLET_ACTIONS.ASSETS };
    }
    if (/\b(show|list|my) (my )?positions\b|\bmy positions\b/.test(lower)) {
      return { walletAction: WALLET_ACTIONS.POSITIONS };
    }
    if (/\b(my wallets|list (my )?wallets|show (my )?wallets)\b/.test(lower)) {
      return { walletAction: WALLET_ACTIONS.LIST };
    }
    return null;
  }

  // The subject named after a preposition ("under", "involving",
  // "on", "analyzing", "blocked"), with a leading article stripped.
  // A bare "this/that" subject names nothing on its own, so it
  // returns null and the dispatcher asks which one was meant instead
  // of guessing.
  function subjectAfter(clean, re) {
    var m = clean.match(re);
    if (!m) return null;
    var s = m[1].replace(/^(the|a|an)\s+/i, "").trim();
    if (!s) return null;
    if (/^(this|that)\s+(type|asset|opportunity|position)?\s*$/i.test(s)) return null;
    if (/^(this|that|it)\s*$/i.test(s)) return null;
    return s;
  }

  // Matches a Crypto World read phrase to a cryptoAction, or null.
  // Checked in a fixed order so the most specific phrase wins: the
  // structural lists first (their subject names can contain words
  // like "lending"), then the asset-network, position, opportunity,
  // risk, blocked-reason, and bot-assignment phrases, with the
  // crypto-world-scoped definition question last. Returns parameters
  // for parseCommand.
  function matchCryptoAction(lower, clean) {
    var subject;
    if (/\btypes?\b[^.]{0,30}\bunder\b/.test(lower)) {
      subject = subjectAfter(clean, /\btypes?\s+under\s+(.+?)\s*$/i);
      return { cryptoAction: CRYPTO_ACTIONS.TYPES_UNDER, activity: subject };
    }
    if (/\bstrateg\w*\b[^.]{0,30}\bunder\b/.test(lower)) {
      subject = subjectAfter(clean, /\bstrateg\w*\s+under\s+(.+?)\s*$/i);
      return { cryptoAction: CRYPTO_ACTIONS.STRATEGIES_UNDER, type: subject };
    }
    if (/\b(what|which) network is\b[^.]{0,40}\bon\b/.test(lower)) {
      var asset = subjectAfter(clean, /\b(?:what|which) network is\s+(.+?)\s+on\b/i);
      return { cryptoAction: CRYPTO_ACTIONS.ASSET_NETWORK, asset: asset };
    }
    if (/\bexplain\b[^.]{0,20}\bposition\b/.test(lower) || /\bwhat is\b[^.]{0,20}\bposition\b/.test(lower)) {
      var pos = subjectAfter(clean, /\bposition\s+(.+?)\s*$/i);
      return { cryptoAction: CRYPTO_ACTIONS.POSITION, position: pos };
    }
    if (/\bopportunit\w*\b[^.]{0,20}\binvolving\b/.test(lower)) {
      var oppAsset = subjectAfter(clean, /\binvolving\s+(.+?)\s*$/i);
      return { cryptoAction: CRYPTO_ACTIONS.OPPORTUNITIES, asset: oppAsset };
    }
    if (/\bcompare\b[^.]{0,20}\brisk\b/.test(lower)) {
      return { cryptoAction: CRYPTO_ACTIONS.RISK_COMPARE };
    }
    if (/\bwhy\b[^.]{0,40}\bblocked\b/.test(lower)) {
      var opp = subjectAfter(clean, /\bwhy is\s+(.+?)\s+blocked\b/i);
      return { cryptoAction: CRYPTO_ACTIONS.BLOCKED_REASONS, opportunity: opp };
    }
    if (/\bwhich bots?\b[^.]{0,30}\banalyzing\b/.test(lower)) {
      var subj = subjectAfter(clean, /\banalyzing\s+(.+?)\s*\??\s*$/i);
      return { cryptoAction: CRYPTO_ACTIONS.BOT_ASSIGNMENTS, subject: subj };
    }
    if (/\bcrypto( world)?\b/.test(lower) &&
        /^(what is|what are|what'?s|explain|tell me about|define|how does|how do)\b/.test(lower)) {
      var topic = clean.replace(/\bin crypto( world)?\b/i, " ").trim();
      topic = stripLeading(topic, /^(what is|what are|what'?s|what does|explain|tell me about|define|how does|how do|how is)\b/i);
      topic = stripLeading(topic, /^(the|a|an)\b/i).trim();
      return { cryptoAction: CRYPTO_ACTIONS.EXPLAIN, topic: topic || clean };
    }
    return null;
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

    // A structural encyclopedia list ("show types under lending",
    // "show strategies under curated lending vault") names a Major
    // Activity or a Type, never an execution — even when the name
    // contains a word like "lending" that the transactional detector
    // would otherwise catch. Same principle as the questionOnly guard
    // above: naming a thing is not asking to do it.
    var isStructuralList = /\b(show|list|what)\b[^.]{0,40}\b(types|strategies)\b[^.]{0,30}\bunder\b/.test(norm);

    var candidates = [];

    // Blocking intents always outrank everything else: fail closed.
    if (!questionOnly && !isStructuralList && TRANSACTIONAL_RE.test(lower)) {
      var verb = (lower.match(/\b(buy|buying|sell|selling|trade|trading|swap|swapping|stake|staking|lend|lending|borrow|borrowing|bridge|bridging|claim|claiming|withdraw|withdrawing)\b/) || [null, ""])[1] || "send";
      candidates.push({ intent: INTENTS.APPROVAL_REQUIRED, weight: 100, permission: PERMISSIONS.TRANSACTIONAL, approvalRequired: true, executionCapability: TRANSACTIONAL_UNAVAILABLE, resultState: "UNAVAILABLE", parameters: { action: verb }, requestedAction: verb });
    }
    if (!questionOnly && !isStructuralList && (TRANSACTIONAL_SEND_AMOUNT_RE.test(lower) || TRANSACTIONAL_CASHOUT_RE.test(lower))) {
      var amountVerb = TRANSACTIONAL_CASHOUT_RE.test(lower) ? "cash out" : "send";
      candidates.push({ intent: INTENTS.APPROVAL_REQUIRED, weight: 100, permission: PERMISSIONS.TRANSACTIONAL, approvalRequired: true, executionCapability: TRANSACTIONAL_UNAVAILABLE, resultState: "UNAVAILABLE", parameters: { action: amountVerb }, requestedAction: amountVerb });
    }
    if (!questionOnly && APPROVAL_RE.test(lower) && !GITHUB_ACTIVITY_RE.test(lower)) {
      var act = /\bdeploy/.test(lower) ? "deploy" : (/\bdelegate\b/.test(lower) ? "delegate" : (/\bgithub\b/.test(lower) ? "github" : "approval-required work"));
      candidates.push({ intent: INTENTS.APPROVAL_REQUIRED, weight: 90, permission: PERMISSIONS.APPROVAL_REQUIRED, approvalRequired: true, executionCapability: "UNAVAILABLE — approval-required work is never executed by StarCommand.", resultState: "APPROVAL_REQUIRED", parameters: { action: act }, requestedAction: act });
    }

    if (STATUS_RE.test(lower)) {
      candidates.push({ intent: INTENTS.STATUS, weight: 50, permission: PERMISSIONS.READ_ONLY, approvalRequired: false, executionCapability: "READ_ONLY — local status only; no counts are invented.", resultState: "NOT_EXECUTED", parameters: {}, requestedAction: "status" });
    }

    // Wallet reads (W11 step 9). Weight 60 so a wallet phrase beats
    // the generic STATUS (50) and NAVIGATION (50) candidates it also
    // matches ("show my wallets" is a wallet list, not a screen hop;
    // "show wallet status" is a wallet read, not a Star status check;
    // "compare costs" is a wallet cost read, not a generic compare).
    // Transactional and approval blockers above already outrank this.
    var walletAction = matchWalletAction(lower, clean);
    if (walletAction) {
      candidates.push({ intent: INTENTS.WALLET, weight: 60, permission: PERMISSIONS.READ_ONLY, approvalRequired: false, executionCapability: "READ_ONLY — wallet reads only; execution is always disabled.", resultState: "NOT_EXECUTED", parameters: walletAction, requestedAction: "wallet:" + walletAction.walletAction });
    }

    // Crypto World reads (C8). Weight 70 so a crypto phrase beats the
    // generic STATUS (50), NAVIGATION (50), COMPARE (40), KNOWLEDGE
    // (40), and BOT (30) candidates it also matches ("show types
    // under lending" is a crypto list, not a screen hop; "compare
    // risk" is a crypto risk read, not a generic compare; "which bots
    // are analyzing this" is a crypto assignment read, not a bot
    // status check). Transactional and approval blockers above already
    // outrank this.
    var cryptoAction = matchCryptoAction(lower, clean);
    if (cryptoAction) {
      candidates.push({ intent: INTENTS.CRYPTO, weight: 70, permission: PERMISSIONS.READ_ONLY, approvalRequired: false, executionCapability: "READ_ONLY — Crypto World reads only; execution is always disabled.", resultState: "NOT_EXECUTED", parameters: cryptoAction, requestedAction: "crypto:" + cryptoAction.cryptoAction });
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
    if (cmd.intent === INTENTS.WALLET) return "A wallet read request; read-only, execution always disabled, and nothing connected is reported as NOT_CONNECTED, never invented.";
    if (cmd.intent === INTENTS.CRYPTO) return "A Crypto World read request; read-only, execution always disabled, and nothing not on record is invented — an unknown activity, type, or opportunity is reported as NO_SUCH_*, never fabricated.";
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
      var txnRes = result(cmd, false, "UNAVAILABLE",
        "EXECUTION_DISABLED — this asks for a financial action (buy, sell, trade, swap, stake, lend, borrow, bridge, claim, withdrawal, sending funds, or cashing out). " +
        TRANSACTIONAL_UNAVAILABLE + ". Nothing was bought, sold, traded, sent, or moved.");
      // The execution-disabled state, in the result itself: executed
      // false and reason EXECUTION_DISABLED. Kept alongside the
      // UNAVAILABLE resultState so existing callers still see the
      // transactional refusal they already handle.
      txnRes.reason = "EXECUTION_DISABLED";
      return txnRes;
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
      return dispatchKnowledge(cmd, topic, false);
    }

    if (cmd.intent === INTENTS.STATUS) {
      return result(cmd, true, "EXECUTED", getStatusText());
    }

    if (cmd.intent === INTENTS.CRYPTO) {
      return dispatchCrypto(cmd);
    }

    if (cmd.intent === INTENTS.WALLET) {
      return dispatchWallet(cmd);
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

  // Shared definition / structural answering for KNOWLEDGE / EXPLAIN
  // and for CRYPTO EXPLAIN. The bridge answers when loaded (a sync
  // string, a sync object, or a Promise of either); a bridge "no
  // match" (found === false) falls back to saved knowledge before
  // admitting no answer. When crypto is true, the no-source message
  // says the knowledge source is not loaded, in Crypto World terms.
  // Behavior for the KNOWLEDGE path is unchanged.
  function dispatchKnowledge(cmd, topic, crypto) {
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
    if (crypto) {
      return result(cmd, false, "NOT_CONNECTED",
        "The knowledge source is not loaded — the Encyclopedia bridge is not connected, and no saved knowledge answered that, so I have no definition to give and did not invent one.");
    }
    return result(cmd, false, "NOT_CONNECTED",
      "The Encyclopedia bridge is not connected, and no saved knowledge answered that — so I have no answer to give, and I did not invent one.");
  }

  // ---- Wallet commands (Wallet spec W11, step 9) ------------------------
  //
  // Every handler reads only what the real registries hold, through
  // typeof guards, and reports honest empty states. There is no
  // balance source, no asset-holdings source, and no positions source
  // in staging, and no live RPC check — so those reads answer
  // NOT_CONNECTED / UNAVAILABLE / NO_POSITIONS / UNKNOWN, never a
  // fabricated number. Nothing here signs, broadcasts, or executes.

  function walletModule() {
    return (global.WalletIntelligence &&
      typeof global.WalletIntelligence.listWallets === "function") ?
      global.WalletIntelligence : null;
  }

  function walletListSafe() {
    var WI = walletModule();
    if (!WI) return null;
    try {
      var list = WI.listWallets();
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return null;
    }
  }

  function walletSummarySafe() {
    var WI = walletModule();
    if (!WI || typeof WI.summary !== "function") return null;
    try {
      return WI.summary();
    } catch (e) {
      return null;
    }
  }

  function walletConnectedCount(wallets) {
    var n = 0;
    (wallets || []).forEach(function (w) {
      if (w && (w.state === "CONNECTED" || w.state === "ACCOUNT_ACCESSED" ||
          w.state === "SIGNING" || w.state === "TRANSACTION_APPROVED")) n++;
    });
    return n;
  }

  // Every cost kind UNKNOWN, value null — UNKNOWN is a state, never a
  // zero, and a cost is either UNKNOWN or a sourced value, never an
  // invented number.
  function unknownCosts() {
    return COST_VOCABULARY.map(function (kind) {
      return { kind: kind, state: "UNKNOWN", value: null };
    });
  }

  function costsText(costs) {
    return costs.map(function (c) { return c.kind + ": " + c.state; }).join("; ");
  }

  // The SIMULATION record. If a transaction-preparation module is
  // ever loaded with a simulate() shape, its record is used (forced
  // to mode SIMULATION, executed false); otherwise the local record
  // below is built. Either way it is a simulation only — never a
  // real execution, never signed, never broadcast.
  function buildSimulation(cmd) {
    var strategy = (cmd.parameters && cmd.parameters.strategy) || null;
    var TP = global.TransactionPreparation;
    if (TP && typeof TP.simulate === "function") {
      try {
        var prepared = TP.simulate(strategy);
        if (prepared && typeof prepared === "object") {
          prepared.mode = "SIMULATION";
          prepared.simulation = true;
          prepared.executed = false;
          if (!prepared.costs) prepared.costs = unknownCosts();
          return prepared;
        }
      } catch (e) {
        /* fall through to the local record */
      }
    }
    return {
      mode: "SIMULATION",
      simulation: true,
      executed: false,
      executionState: "NOT_EXECUTED",
      strategy: strategy,
      strategyNamed: !!strategy,
      costs: unknownCosts(),
      verificationStatus: "UNVERIFIED",
      warnings: ["Simulation only — nothing was executed, signed, broadcast, or moved."],
      note: "A simulation record, not a transaction. Execution is disabled in this build."
    };
  }

  function dispatchWallet(cmd) {
    var action = (cmd.parameters && cmd.parameters.walletAction) || "";
    var WI = walletModule();
    var wallets = walletListSafe();

    if (action === WALLET_ACTIONS.LIST) {
      if (!WI || wallets === null) {
        return result(cmd, false, "NOT_CONNECTED",
          "Wallet intelligence is not connected, so no wallets have been discovered — NOT_CONNECTED. No wallet was invented.");
      }
      if (wallets.length === 0) {
        return result(cmd, false, "NOT_CONNECTED",
          "No wallets have been discovered — NOT_CONNECTED. Wallets appear only when explicitly discovered; none was invented.");
      }
      var lines = wallets.map(function (w) {
        var desc = "";
        if (WI && typeof WI.describeWallet === "function") {
          try {
            var d = WI.describeWallet(w.id);
            if (d && d.stateDescription) desc = " — " + d.stateDescription;
          } catch (e) {}
        }
        return (w.label || w.id) + " (" + (w.state || "UNKNOWN") + desc + ")";
      });
      var listRes = result(cmd, true, "EXECUTED",
        wallets.length + (wallets.length === 1 ? " wallet discovered: " : " wallets discovered: ") +
        lines.join("; ") + ". Execution is unavailable for every wallet.");
      listRes.wallets = wallets.map(function (w) {
        return { id: w.id, label: w.label, state: w.state || "UNKNOWN" };
      });
      listRes.connectionState = walletConnectedCount(wallets) > 0 ? "CONNECTED" : "NOT_CONNECTED";
      return listRes;
    }

    if (action === WALLET_ACTIONS.STATUS) {
      if (!WI || wallets === null) {
        return result(cmd, false, "NOT_CONNECTED",
          "Wallet intelligence is not connected — wallet, account, network, and connection state are all NOT_CONNECTED. Nothing was invented.");
      }
      var summary = walletSummarySafe();
      var byState = summary && summary.byState ? summary.byState : {};
      var stateParts = Object.keys(byState).map(function (s) { return s + ": " + byState[s]; }).join(", ");
      var statusRes = result(cmd, true, "EXECUTED",
        "Wallet status: " + (summary ? summary.total : wallets.length) + " wallet(s) discovered" +
        (stateParts ? " (" + stateParts + ")" : "") +
        "; connected: " + walletConnectedCount(wallets) +
        "; connection: " + (summary && summary.connectionState ? summary.connectionState : "NOT_CONNECTED") +
        ". Accounts: UNKNOWN — no account data source is connected, so no account is claimed. " +
        "Networks: UNKNOWN — no live network check is connected, so no network is claimed healthy or down. " +
        "Execution: unavailable — no transaction can run from any wallet state.");
      statusRes.walletSummary = summary;
      statusRes.connectionState = summary && summary.connectionState ? summary.connectionState : "NOT_CONNECTED";
      return statusRes;
    }

    if (action === WALLET_ACTIONS.BALANCE) {
      if (!WI || wallets === null || wallets.length === 0 || walletConnectedCount(wallets) === 0) {
        return result(cmd, false, "NOT_CONNECTED",
          "No wallet is connected, so no balance is available — NOT_CONNECTED. No balance was invented, and no number was guessed.");
      }
      var balRes = result(cmd, false, "UNAVAILABLE",
        "A wallet is connected, but no balance source is connected, so no balance is available — UNAVAILABLE. No balance was invented.");
      balRes.connectionState = "CONNECTED";
      balRes.balances = [];
      return balRes;
    }

    if (action === WALLET_ACTIONS.ASSETS) {
      if (!WI || wallets === null || wallets.length === 0 || walletConnectedCount(wallets) === 0) {
        return result(cmd, false, "NOT_CONNECTED",
          "No wallet is connected, so no assets are available — NOT_CONNECTED. No asset or balance was invented.");
      }
      var assetRes = result(cmd, false, "UNAVAILABLE",
        "A wallet is connected, but no asset-holdings source is connected, so no assets are available — UNAVAILABLE. No asset or balance was invented.");
      assetRes.connectionState = "CONNECTED";
      assetRes.assets = [];
      return assetRes;
    }

    if (action === WALLET_ACTIONS.POSITIONS) {
      if (!WI || wallets === null || wallets.length === 0 || walletConnectedCount(wallets) === 0) {
        return result(cmd, false, "NOT_CONNECTED",
          "No wallet is connected, so no positions are available — NOT_CONNECTED. No position was invented.");
      }
      var posRes = result(cmd, false, "NO_POSITIONS",
        "No positions are recorded for the connected accounts — NO_POSITIONS. No position source is connected, so this is the absence of records, not a confirmed zero. No position was invented.");
      posRes.connectionState = "CONNECTED";
      posRes.positions = [];
      return posRes;
    }

    if (action === WALLET_ACTIONS.OPPORTUNITIES) {
      var OI = (global.OpportunityIntelligence &&
        typeof global.OpportunityIntelligence.listOpportunities === "function") ?
        global.OpportunityIntelligence : null;
      if (!OI) {
        return result(cmd, false, "NOT_CONNECTED",
          "Opportunity intelligence is not connected, so no opportunities are available — NOT_CONNECTED. No opportunity was invented.");
      }
      var asset = (cmd.parameters && cmd.parameters.asset) || null;
      if (!asset) {
        return result(cmd, false, "NO_OPPORTUNITIES",
          "No asset was named, so no opportunities can be matched — NO_OPPORTUNITIES. Name an asset, for example \u201Cshow opportunities for bitcoin\u201D. No opportunity was invented.");
      }
      var all = [];
      try {
        all = OI.listOpportunities() || [];
      } catch (e) {
        all = [];
      }
      var needle = String(asset).toLowerCase();
      var matches = all.filter(function (o) {
        if (!o) return false;
        var hay = [
          o.assetRef && o.assetRef.assetClassId,
          o.assetRef && o.assetRef.chain,
          o.strategyId, o.typeId, o.majorActivityId, o.id
        ].join(" ").toLowerCase();
        return hay.indexOf(needle) !== -1;
      });
      if (matches.length === 0) {
        var noneRes = result(cmd, false, "NO_OPPORTUNITIES",
          "No opportunities are recorded for \u201C" + asset + "\u201D — NO_OPPORTUNITIES. No opportunity was invented.");
        noneRes.asset = asset;
        noneRes.opportunities = [];
        return noneRes;
      }
      var oppLines = matches.map(function (o) {
        var unknown = 0;
        (o.costs || []).forEach(function (c) { if (c && c.state === "UNKNOWN") unknown++; });
        return (o.id || "(no id)") + " — verification: " + (o.verificationStatus || "UNKNOWN") +
          ", freshness: " + (o.freshness || "unknown") +
          ", costs UNKNOWN: " + unknown;
      });
      var oppRes = result(cmd, true, "EXECUTED",
        matches.length + (matches.length === 1 ? " opportunity" : " opportunities") +
        " recorded for \u201C" + asset + "\u201D: " + oppLines.join("; ") +
        ". Eligibility is not claimed — these are recorded opportunities only, never promised returns.");
      oppRes.asset = asset;
      oppRes.opportunities = matches;
      return oppRes;
    }

    if (action === WALLET_ACTIONS.ANALYZE) {
      if (!WI || wallets === null || wallets.length === 0) {
        return result(cmd, false, "NOT_CONNECTED",
          "No wallet has been discovered, so there is nothing to analyze — NOT_CONNECTED. No wallet was invented.");
      }
      var target = null;
      var lowerText = String(cmd.text || "").toLowerCase();
      wallets.forEach(function (w) {
        if (w && w.label && lowerText.indexOf(String(w.label).toLowerCase()) !== -1) target = w;
      });
      if (!target && wallets.length === 1) target = wallets[0];
      if (!target) {
        var names = wallets.map(function (w) { return w.label || w.id; }).join(", ");
        return result(cmd, false, "NEEDS_REVIEW",
          "More than one wallet is discovered (" + names + ") and no wallet was named, so I did not guess which to analyze. Say which wallet, for example \u201Canalyze the " + (wallets[0].label || wallets[0].id) + " wallet\u201D.",
          "ambiguous");
      }
      var detail = null;
      if (typeof WI.describeWallet === "function") {
        try { detail = WI.describeWallet(target.id); } catch (e) { detail = null; }
      }
      var d = detail || target;
      var caps = [];
      if (d.capabilities) {
        Object.keys(d.capabilities).forEach(function (cap) {
          var c = d.capabilities[cap];
          var effective = c && typeof c === "object" ? !!c.effective : !!c;
          caps.push(cap + ": " + (effective ? "effective" : "not effective"));
        });
      }
      var warnings = [];
      if (d.freshness === "stale") warnings.push("Freshness is stale — the record is older than its freshness limit.");
      if (d.verificationStatus === "UNVERIFIED" || d.verificationStatus === "UNKNOWN") {
        warnings.push("Verification is " + (d.verificationStatus || "UNKNOWN") + " — nothing about this wallet is confirmed beyond its recorded state.");
      }
      if (d.state === "DISCOVERED") warnings.push("Discovered only — no session, no address shared, no signing.");
      var analysisRes = result(cmd, true, "EXECUTED",
        "Wallet analysis (analysis only — no fund authority): " + (d.label || d.id) +
        ". State: " + (d.state || "UNKNOWN") +
        (d.stateDescription ? " — " + d.stateDescription : "") +
        ". Networks: " + ((d.chains && d.chains.length) ? d.chains.join(", ") : "none recorded") +
        ". Standards: " + ((d.standards && d.standards.length) ? d.standards.join(", ") : "none recorded") +
        ". Discovery: " + (d.discoveryMethod || "unknown") +
        ". Freshness: " + (d.freshnessLabel || d.freshness || "unknown") +
        ". Verification: " + (d.verificationStatus || "UNKNOWN") +
        ". Capabilities: " + (caps.length ? caps.join("; ") : "none recorded") +
        ". Assets: no balance source is connected, so no asset total is claimed. " +
        (warnings.length ? "Warnings: " + warnings.join(" ") : "No warnings.") +
        " Execution: unavailable (EXECUTION_DISABLED).");
      analysisRes.wallet = d;
      return analysisRes;
    }

    if (action === WALLET_ACTIONS.NETWORK_HEALTH) {
      var NI = global.NetworkIntelligence || null;
      if (!NI) {
        return result(cmd, false, "NOT_CONNECTED",
          "Network intelligence is not connected, so network health is UNKNOWN — NOT_CONNECTED. No network is claimed healthy or down.");
      }
      var health = { status: "UNKNOWN" };
      if (typeof NI.defaultHealth === "function") {
        try { health = NI.defaultHealth() || health; } catch (e) {}
      }
      var netRes = result(cmd, true, "EXECUTED",
        "Network health: " + (health.status || "UNKNOWN") +
        " — no live RPC check is connected, so no network is claimed healthy or down and no provider is claimed reachable. No health reading was invented.");
      netRes.networkHealth = health;
      return netRes;
    }

    if (action === WALLET_ACTIONS.COSTS) {
      var costs = unknownCosts();
      // Final-audit integration (Nov 14): read RECORDED costs from
      // CostIntelligence when it is loaded. Only KNOWN records with a
      // sourced finite value, currency, and source are reflected; an
      // ESTIMATED record stays UNKNOWN (an estimate is not a known cost),
      // and when the module is absent or empty every cost stays UNKNOWN.
      // Nothing is invented, and no total is ever claimed.
      var knownKinds = {};
      var CI = global.CostIntelligence || null;
      if (CI && typeof CI.getCosts === "function") {
        try {
          var recorded = CI.getCosts({ state: "KNOWN" }) || [];
          recorded.forEach(function (rec) {
            if (!rec || COST_VOCABULARY.indexOf(rec.kind) === -1) return;
            if (typeof rec.value !== "number" || !isFinite(rec.value) ||
                rec.value < 0) return;
            if (!rec.currency || !rec.source) return;
            for (var i = 0; i < costs.length; i++) {
              if (costs[i].kind === rec.kind) {
                costs[i] = { kind: rec.kind, state: "KNOWN",
                  value: rec.value, currency: rec.currency,
                  source: rec.source, checkedAt: rec.checkedAt || null };
                knownKinds[rec.kind] = true;
                break;
              }
            }
          });
        } catch (e) {}
      }
      var knownCount = Object.keys(knownKinds).length;
      var costRes = result(cmd, true, "EXECUTED",
        "Cost comparison — " + (knownCount > 0 ?
          knownCount + " cost kind(s) have a recorded sourced value; the rest are UNKNOWN (UNKNOWN is never zero, and no cost was invented): " :
          "every cost is UNKNOWN (UNKNOWN is never zero, and no cost was invented): ") +
        costsText(costs) + ". No total is claimed across mixed or unknown costs.");
      costRes.costs = costs;
      return costRes;
    }

    if (action === WALLET_ACTIONS.SIMULATE) {
      var sim = buildSimulation(cmd);
      var simRes = result(cmd, false, "SIMULATION",
        "SIMULATION — this is a simulation record only (mode SIMULATION), not a real execution. " +
        (sim.strategy ? "Strategy: \u201C" + sim.strategy + "\u201D. " : "No strategy was named. ") +
        "Costs: " + costsText(sim.costs || unknownCosts()) + ". " +
        "Nothing was executed, signed, broadcast, or moved.");
      simRes.simulation = sim;
      simRes.mode = "SIMULATION";
      return simRes;
    }

    return result(cmd, false, "NOT_EXECUTED",
      "That wallet request was recognised but has no handler, so nothing was run.",
      "unsupported intent");
  }

  // ---- Crypto World commands (Crypto spec C8) -------------------------
  //
  // Every handler reads only what the real registries hold, through
  // typeof guards, and reports honest empty states. Nothing here signs,
  // broadcasts, or executes: EXPLAIN / ANALYZE / SIMULATE / PREPARE /
  // EXECUTE are different intentions, and a question about SWAP, STAKE,
  // BRIDGE, LEND, or BORROW never becomes execution — the transactional
  // blockers in parseCommand already fail those closed with reason
  // EXECUTION_DISABLED before dispatch runs.

  var CRYPTO_BATCH_GLOBALS = ["EncyclopediaBatchA", "EncyclopediaCanonical60", "EncyclopediaBatchB"];

  // The canonical encyclopedia records, merged from the three loaded
  // batch data files in the same order the EncyclopediaBridge merges
  // them (Batch A, canonical 60, Batch B; first record wins on a
  // duplicate id). Returns null when no batch data file is loaded at
  // all — the caller then reports NOT_CONNECTED, never an invented
  // record.
  function cryptoBatchRecords() {
    var records = [];
    var seen = {};
    var loaded = false;
    CRYPTO_BATCH_GLOBALS.forEach(function (name) {
      var b = global[name];
      if (b && Array.isArray(b.records)) {
        loaded = true;
        b.records.forEach(function (r) {
          if (r && typeof r.id === "string" && !seen[r.id]) { seen[r.id] = true; records.push(r); }
        });
      }
    });
    return loaded ? records : null;
  }

  // Name resolution over canonical records, mirroring the bridge's
  // findSubject: exact id / title / alias first, then a substring
  // title / alias hit, preferring the given levels. A lower-ranked
  // (preferred-level) substring match beats a higher-ranked exact
  // match, and ties go to exact: "lending" is an exact alias of the
  // Lending & Borrowing family, but the Major Activity "Asset
  // Lending" is the subject a Types query means. Returns the record
  // or null — never a near miss presented as a match.
  function findCryptoRecord(records, name, preferredLevels) {
    var q = String(name || "").trim().toLowerCase();
    if (!q) return null;
    function rank(r) {
      var i = (preferredLevels || []).indexOf(r.level);
      return i === -1 ? 99 : i;
    }
    var exact = null, sub = null;
    (records || []).forEach(function (r) {
      if (!r || typeof r.title !== "string") return;
      if (r.id === q || r.title.toLowerCase() === q ||
          (r.aliases || []).some(function (a) { return String(a).toLowerCase() === q; })) {
        if (!exact || rank(r) < rank(exact)) exact = r;
      }
    });
    (records || []).forEach(function (r) {
      if (!r || typeof r.title !== "string") return;
      var titleHit = r.title.toLowerCase().indexOf(q) !== -1;
      var aliasHit = (r.aliases || []).some(function (a) { return String(a).toLowerCase().indexOf(q) !== -1; });
      if (titleHit || aliasHit) {
        if (!sub || rank(r) < rank(sub)) sub = r;
      }
    });
    if (exact && (!sub || rank(exact) <= rank(sub))) return exact;
    return sub;
  }

  function cryptoRecordLine(r) {
    return "\u201C" + r.title + "\u201D (" + (r.level || "no level") + ", " +
      (r.verificationStatus || "UNKNOWN") + ")";
  }

  function cryptoRecordSummary(r) {
    return { id: r.id, title: r.title, level: r.level || null,
      verificationStatus: r.verificationStatus || "UNKNOWN" };
  }

  // Types under a Major Activity id. The bridge answers from its own
  // (possibly store-primed) records when it has the Major Activity;
  // otherwise the merged batch records answer. Returns null only when
  // no record source exists at all.
  function cryptoTypesUnder(majorId) {
    var EB = global.EncyclopediaBridge;
    if (EB && typeof EB.typesUnder === "function") {
      try {
        var t = EB.typesUnder(majorId);
        if (t && t.major) return { types: t.types || [], major: t.major, source: t.source || "encyclopedia-bridge" };
      } catch (e) {}
    }
    var records = cryptoBatchRecords();
    if (!records) return null;
    var major = null;
    records.forEach(function (r) { if (r && r.id === majorId) major = r; });
    if (!major) return { types: [], major: null, source: "batch-data" };
    var types = records.filter(function (r) { return r && r.level === "TYPE" && r.parentRef === majorId; });
    return { types: types, major: major, source: "batch-data" };
  }

  // Strategies under a Type id. Same bridge-first, batch-fallback shape.
  function cryptoStrategiesUnder(typeId) {
    var EB = global.EncyclopediaBridge;
    if (EB && typeof EB.strategiesUnder === "function") {
      try {
        var s = EB.strategiesUnder(typeId);
        if (s && s.type) return { strategies: s.strategies || [], type: s.type, source: s.source || "encyclopedia-bridge" };
      } catch (e) {}
    }
    var records = cryptoBatchRecords();
    if (!records) return null;
    var type = null;
    records.forEach(function (r) { if (r && r.id === typeId) type = r; });
    if (!type) return { strategies: [], type: null, source: "batch-data" };
    var strategies = records.filter(function (r) { return r && r.level === "STRATEGY" && r.parentRef === typeId; });
    return { strategies: strategies, type: type, source: "batch-data" };
  }

  // Last resort for a structural list when the batch data files are
  // not loaded but the bridge is: ask the bridge's async structural
  // answer (it resolves the subject name itself, from store-primed
  // records when it has them) and translate found === false into
  // NO_SUCH_*. Returns a result, a Promise of one, or null when the
  // bridge cannot answer at all.
  function cryptoBridgeListFallback(cmd, kind, name, noSuchState, noSuchLabel) {
    var EB = global.EncyclopediaBridge;
    if (!EB || typeof EB.answerStructural !== "function") return null;
    var answered;
    try {
      answered = EB.answerStructural(kind === "types" ?
        ("show types under " + name) : ("show strategies under " + name));
    } catch (e) {
      return null;
    }
    function translate(answer) {
      if (!answer || answer.found === false) {
        var noRes = result(cmd, false, noSuchState,
          "No " + noSuchLabel + " called \u201C" + name + "\u201D is in the loaded Encyclopedia — " + noSuchState + ". Nothing was invented.",
          "no such " + noSuchLabel.toLowerCase());
        return noRes;
      }
      var text = bridgeText(answer);
      var okRes = result(cmd, true, "EXECUTED",
        text || ("Recorded entries for \u201C" + name + "\u201D are listed from the Encyclopedia."));
      okRes.recordIds = (answer && answer.recordIds) || [];
      okRes.source = (answer && answer.source) || "encyclopedia-bridge";
      return okRes;
    }
    if (answered && typeof answered.then === "function") {
      return answered.then(translate).catch(function () {
        return result(cmd, false, "NOT_CONNECTED", "The Encyclopedia bridge could not answer that right now — nothing was invented.");
      });
    }
    if (answered && typeof answered === "object" && answered.found === false) return translate(answered);
    if (bridgeText(answered)) {
      return translate({ found: true, text: bridgeText(answered),
        recordIds: (answered && answered.recordIds) || [], source: "encyclopedia-bridge" });
    }
    return null;
  }

  // The canonical risk dimensions, each with its own state — never
  // one unexplained score. RiskIntelligence answers first when it is
  // loaded (its compareRisk, when present, may carry per-dimension
  // states); otherwise the canonical CryptoWorld dimensions, then
  // OpportunityIntelligence's copy of them. Null when no dimension
  // source is loaded at all.
  function cryptoRiskDimensions() {
    var RI = global.RiskIntelligence;
    if (RI) {
      if (typeof RI.compareRisk === "function") {
        try {
          var compared = RI.compareRisk();
          if (Array.isArray(compared) && compared.length) {
            return { dimensions: compared.map(function (d) {
              if (typeof d === "string") return { dimension: d, state: "UNKNOWN" };
              return { dimension: d.dimension || d.name || String(d), state: d.state || "UNKNOWN" };
            }), source: "RiskIntelligence" };
          }
        } catch (e) {}
      }
      var list = null;
      if (typeof RI.riskDimensions === "function") {
        try { list = RI.riskDimensions(); } catch (e) {}
      }
      if (!list && Array.isArray(RI.RISK_DIMENSIONS)) list = RI.RISK_DIMENSIONS;
      if (Array.isArray(list) && list.length) {
        return { dimensions: list.map(function (d) {
          if (typeof d === "string") return { dimension: d, state: "UNKNOWN" };
          return { dimension: d.dimension || d.name || String(d), state: d.state || "UNKNOWN" };
        }), source: "RiskIntelligence" };
      }
    }
    var CW = global.CryptoWorld;
    if (CW && Array.isArray(CW.RISK_DIMENSIONS) && CW.RISK_DIMENSIONS.length) {
      return { dimensions: CW.RISK_DIMENSIONS.map(function (d) { return { dimension: d, state: "UNKNOWN" }; }),
        source: "CryptoWorld" };
    }
    var OI = global.OpportunityIntelligence;
    if (OI && Array.isArray(OI.RISK_DIMENSIONS) && OI.RISK_DIMENSIONS.length) {
      return { dimensions: OI.RISK_DIMENSIONS.map(function (d) { return { dimension: d, state: "UNKNOWN" }; }),
        source: "OpportunityIntelligence" };
    }
    return null;
  }

  // Finds an opportunity by id (exact first, then substring over the
  // id and the taxonomy / asset refs). Returns { module, opportunity }.
  function findCryptoOpportunity(name) {
    var OI = (global.OpportunityIntelligence &&
      typeof global.OpportunityIntelligence.listOpportunities === "function") ?
      global.OpportunityIntelligence : null;
    if (!OI) return { module: false, opportunity: null };
    var all = [];
    try { all = OI.listOpportunities() || []; } catch (e) { all = []; }
    var needle = String(name || "").trim().toLowerCase();
    var found = null;
    all.forEach(function (o) {
      if (!o || found) return;
      if (String(o.id || "").toLowerCase() === needle) found = o;
    });
    if (!found) {
      all.forEach(function (o) {
        if (!o || found) return;
        var hay = [o.id, o.strategyId, o.typeId, o.majorActivityId,
          o.assetRef && o.assetRef.assetClassId,
          o.assetRef && o.assetRef.chain].join(" ").toLowerCase();
        if (needle && hay.indexOf(needle) !== -1) found = o;
      });
    }
    return { module: true, opportunity: found };
  }

  // Opportunities involving a named asset: the same recorded-only
  // filter the wallet read uses (asset class, chain, strategy, type,
  // major activity, id). None recorded is NO_OPPORTUNITIES, never a
  // fabricated opportunity.
  function cryptoOpportunitiesFor(cmd, asset) {
    var OI = (global.OpportunityIntelligence &&
      typeof global.OpportunityIntelligence.listOpportunities === "function") ?
      global.OpportunityIntelligence : null;
    if (!OI) {
      return result(cmd, false, "NOT_CONNECTED",
        "Opportunity intelligence is not connected, so no opportunities are available — NOT_CONNECTED. No opportunity was invented.");
    }
    var all = [];
    try { all = OI.listOpportunities() || []; } catch (e) { all = []; }
    var needle = String(asset).toLowerCase();
    var matches = all.filter(function (o) {
      if (!o) return false;
      var hay = [
        o.assetRef && o.assetRef.assetClassId,
        o.assetRef && o.assetRef.chain,
        o.strategyId, o.typeId, o.majorActivityId, o.id
      ].join(" ").toLowerCase();
      return hay.indexOf(needle) !== -1;
    });
    if (matches.length === 0) {
      var noneRes = result(cmd, false, "NO_OPPORTUNITIES",
        "No opportunities are recorded involving \u201C" + asset + "\u201D — NO_OPPORTUNITIES. No opportunity was invented.");
      noneRes.asset = asset;
      noneRes.opportunities = [];
      return noneRes;
    }
    var oppLines = matches.map(function (o) {
      var unknown = 0;
      (o.costs || []).forEach(function (c) { if (c && c.state === "UNKNOWN") unknown++; });
      return (o.id || "(no id)") + " — verification: " + (o.verificationStatus || "UNKNOWN") +
        ", freshness: " + (o.freshness || "unknown") +
        ", costs UNKNOWN: " + unknown;
    });
    var oppRes = result(cmd, true, "EXECUTED",
      matches.length + (matches.length === 1 ? " opportunity" : " opportunities") +
      " recorded involving \u201C" + asset + "\u201D: " + oppLines.join("; ") +
      ". Eligibility is not claimed — these are recorded opportunities only, never promised returns.");
    oppRes.asset = asset;
    oppRes.opportunities = matches;
    return oppRes;
  }

  // A money field is UNKNOWN when it is null or undefined; otherwise
  // the sourced amount and currency, never an invented number.
  function cryptoMoneyText(m) {
    if (m === null || m === undefined) return "UNKNOWN";
    if ((typeof m.amount === "number" || typeof m.amount === "string") && m.amount !== "") {
      return m.amount + " " + (m.currency || "");
    }
    return "recorded (no amount)";
  }

  // A truthful one-position explanation from the recorded fields only:
  // references, verification, freshness, and money as UNKNOWN when no
  // sourced value is recorded. Explanation only — never an execution.
  function cryptoPositionText(p) {
    var parts = [];
    parts.push("Position \u201C" + (p.id || "(no id)") + "\u201D");
    parts.push("network: " + (p.networkId || "UNKNOWN"));
    parts.push("assets: " + ((p.assetIds && p.assetIds.length) ? p.assetIds.join(", ") : "none recorded"));
    if (p.protocolId) parts.push("protocol: " + p.protocolId);
    if (p.activityId) parts.push("activity: " + p.activityId);
    if (p.strategyId) parts.push("strategy: " + p.strategyId);
    parts.push("verification: " + (p.verificationStatus || "UNKNOWN"));
    parts.push("freshness: " + (p.freshness || "unknown"));
    parts.push("size: " + cryptoMoneyText(p.size));
    parts.push("current value: " + cryptoMoneyText(p.currentValue));
    parts.push("P&L: " + cryptoMoneyText(p.pnl));
    parts.push("fees: " + cryptoMoneyText(p.fees));
    return parts.join("; ") + ". Explanation only — nothing was executed, and no value was invented.";
  }

  function dispatchCrypto(cmd) {
    var action = (cmd.parameters && cmd.parameters.cryptoAction) || "";
    var name, records, rec, res;

    if (action === CRYPTO_ACTIONS.EXPLAIN) {
      var topic = (cmd.parameters && cmd.parameters.topic) || cmd.text;
      return dispatchKnowledge(cmd, topic, true);
    }

    if (action === CRYPTO_ACTIONS.TYPES_UNDER) {
      name = (cmd.parameters && cmd.parameters.activity) || null;
      if (!name) {
        return result(cmd, false, "NEEDS_REVIEW",
          "No Major Activity was named, so I did not guess which one — say which Major Activity, for example \u201Cshow types under asset lending\u201D.",
          "ambiguous");
      }
      records = cryptoBatchRecords();
      if (!records) {
        var fbTypes = cryptoBridgeListFallback(cmd, "types", name, "NO_SUCH_ACTIVITY", "Major Activity");
        if (fbTypes) return fbTypes;
        return result(cmd, false, "NOT_CONNECTED",
          "The Encyclopedia is not loaded — no canonical records are available, so no Types were listed and none were invented.");
      }
      rec = findCryptoRecord(records, name, ["MAJOR_ACTIVITY", "FAMILY"]);
      if (!rec || rec.level !== "MAJOR_ACTIVITY") {
        var notMajor = rec ? (" \u201C" + rec.title + "\u201D is a " + (rec.level || "record") +
          ", not a Major Activity, so no Types belong under it.") : "";
        var noAct = result(cmd, false, "NO_SUCH_ACTIVITY",
          "No Major Activity called \u201C" + name + "\u201D is in the loaded Encyclopedia — NO_SUCH_ACTIVITY." +
          notMajor + " No Types were invented.",
          "no such activity");
        noAct.activity = name;
        return noAct;
      }
      var t = cryptoTypesUnder(rec.id);
      if (!t) {
        return result(cmd, false, "NOT_CONNECTED",
          "The Encyclopedia is not loaded — no canonical records are available, so no Types were listed and none were invented.");
      }
      var types = t.types || [];
      res = result(cmd, true, "EXECUTED",
        cryptoRecordLine(rec) + " has " + types.length + " recorded Type(s)" +
        (types.length ? ": " + types.map(cryptoRecordLine).join("; ") : " — none recorded, not a guess.") +
        ". Every imported record is UNVERIFIED until it meets the verification requirements; imported is not verified.");
      res.majorActivity = { id: rec.id, title: rec.title };
      res.types = types.map(cryptoRecordSummary);
      res.source = t.source;
      return res;
    }

    if (action === CRYPTO_ACTIONS.STRATEGIES_UNDER) {
      name = (cmd.parameters && cmd.parameters.type) || null;
      if (!name) {
        return result(cmd, false, "NEEDS_REVIEW",
          "No Type was named, so I did not guess which one — say which Type, for example \u201Cshow strategies under curated lending vault\u201D.",
          "ambiguous");
      }
      records = cryptoBatchRecords();
      if (!records) {
        var fbStrategies = cryptoBridgeListFallback(cmd, "strategies", name, "NO_SUCH_TYPE", "Type");
        if (fbStrategies) return fbStrategies;
        return result(cmd, false, "NOT_CONNECTED",
          "The Encyclopedia is not loaded — no canonical records are available, so no Strategies were listed and none were invented.");
      }
      rec = findCryptoRecord(records, name, ["TYPE", "MAJOR_ACTIVITY"]);
      if (!rec || rec.level !== "TYPE") {
        var notType = rec ? (" \u201C" + rec.title + "\u201D is a " + (rec.level || "record") +
          ", not a Type, so no Strategies belong under it.") : "";
        var noType = result(cmd, false, "NO_SUCH_TYPE",
          "No Type called \u201C" + name + "\u201D is in the loaded Encyclopedia — NO_SUCH_TYPE." +
          notType + " No Strategies were invented.",
          "no such type");
        noType.type = name;
        return noType;
      }
      var s = cryptoStrategiesUnder(rec.id);
      if (!s) {
        return result(cmd, false, "NOT_CONNECTED",
          "The Encyclopedia is not loaded — no canonical records are available, so no Strategies were listed and none were invented.");
      }
      var strategies = s.strategies || [];
      res = result(cmd, true, "EXECUTED",
        cryptoRecordLine(rec) + " has " + strategies.length + " recorded Strategie(s)" +
        (strategies.length ? ": " + strategies.map(cryptoRecordLine).join("; ") : " — none recorded, not a guess.") +
        ". Every imported record is UNVERIFIED until it meets the verification requirements; imported is not verified.");
      res.type = { id: rec.id, title: rec.title };
      res.strategies = strategies.map(cryptoRecordSummary);
      res.source = s.source;
      return res;
    }

    if (action === CRYPTO_ACTIONS.ASSET_NETWORK) {
      var asset = (cmd.parameters && cmd.parameters.asset) || null;
      if (!asset) {
        return result(cmd, false, "NEEDS_REVIEW",
          "No asset was named — \u201Cthis asset\u201D names no asset on its own, so I did not guess which one. Say which asset, for example \u201Cwhat network is SOL on\u201D.",
          "ambiguous");
      }
      // AssetIntelligence classifies asset descriptors, not networks:
      // a bare ticker alone never identifies an asset, so a class
      // lookup here honestly returns UNKNOWN. The network itself is
      // resolved from NetworkIntelligence's structural example
      // networks, by native-asset ticker or network name — never
      // guessed.
      var assetClass = "UNKNOWN";
      var AI = global.AssetIntelligence;
      if (AI && typeof AI.classify === "function") {
        try {
          var classified = AI.classify({ ticker: asset });
          if (classified && classified.classId) assetClass = classified.classId;
        } catch (e) {}
      }
      var NI = global.NetworkIntelligence;
      if (!NI || !Array.isArray(NI.EXAMPLE_NETWORKS)) {
        var ncRes = result(cmd, false, "NOT_CONNECTED",
          "Network intelligence is not connected, so the network for \u201C" + asset + "\u201D is UNKNOWN — NOT_CONNECTED. No network was guessed.");
        ncRes.asset = asset;
        ncRes.assetClass = assetClass;
        ncRes.network = null;
        return ncRes;
      }
      var needle = String(asset).toLowerCase();
      var net = null;
      NI.EXAMPLE_NETWORKS.forEach(function (n) {
        if (!n || net) return;
        var ticker = n.nativeAsset && n.nativeAsset.ticker ? String(n.nativeAsset.ticker).toLowerCase() : "";
        if (ticker && ticker === needle) net = n;
        else if (String(n.name || "").toLowerCase() === needle) net = n;
        else if (String(n.id || "").toLowerCase() === needle) net = n;
      });
      if (!net) {
        var unkRes = result(cmd, false, "UNKNOWN",
          "No network is recorded for \u201C" + asset + "\u201D — UNKNOWN. The asset is not in the network registry, so no network was guessed.",
          "unknown asset");
        unkRes.asset = asset;
        unkRes.assetClass = assetClass;
        unkRes.network = null;
        return unkRes;
      }
      var netRes = result(cmd, true, "EXECUTED",
        "\u201C" + asset + "\u201D is the native asset of " + net.name + " (" + net.id + "). " +
        "Network verification: " + (net.verificationStatus || "UNKNOWN") +
        " — this is a structural example network, not a live holding and not a live network check. " +
        "Asset class: " + assetClass + " (a ticker alone never identifies an asset).");
      netRes.asset = asset;
      netRes.assetClass = assetClass;
      netRes.network = { id: net.id, name: net.name, verificationStatus: net.verificationStatus || "UNKNOWN" };
      return netRes;
    }

    if (action === CRYPTO_ACTIONS.POSITION) {
      var PI = global.PositionIntelligence;
      if (!PI) {
        return result(cmd, false, "NOT_CONNECTED",
          "Position intelligence is not connected — no positions are recorded, so there is nothing to explain — NOT_CONNECTED. No position was invented.");
      }
      // A position module, if one is loaded, is read only through the
      // shapes it offers: a named position by id, otherwise the
      // recorded list (one recorded position explains itself; several
      // unnamed ones ask which was meant). Money is UNKNOWN when no
      // sourced value is recorded — never an invented number.
      try {
        var posSubject = (cmd.parameters && cmd.parameters.position) || null;
        if (posSubject && typeof PI.getPosition === "function") {
          var one = PI.getPosition(posSubject);
          if (one) {
            var oneRes = result(cmd, true, "EXECUTED", cryptoPositionText(one));
            oneRes.position = one;
            return oneRes;
          }
          var noPos = result(cmd, false, "NO_SUCH_POSITION",
            "No position called \u201C" + posSubject + "\u201D is recorded — NO_SUCH_POSITION. No position was invented.",
            "no such position");
          noPos.position = posSubject;
          return noPos;
        }
        if (typeof PI.listPositions === "function") {
          var positions = PI.listPositions() || [];
          if (!positions.length) {
            return result(cmd, false, "NO_POSITIONS",
              "No positions are recorded — NO_POSITIONS. No position was invented.");
          }
          if (positions.length === 1) {
            var onlyRes = result(cmd, true, "EXECUTED", cryptoPositionText(positions[0]));
            onlyRes.position = positions[0];
            return onlyRes;
          }
          return result(cmd, false, "NEEDS_REVIEW",
            positions.length + " positions are recorded and none was named, so I did not guess which to explain — say which position, for example \u201Cexplain position " + (positions[0].id || "") + "\u201D.",
            "ambiguous");
        }
        if (typeof PI.explainPosition === "function") {
          var explained = PI.explainPosition(posSubject);
          var explainedText = bridgeText(explained);
          if (explainedText) return result(cmd, true, "EXECUTED", explainedText);
        }
      } catch (e) {}
      return result(cmd, false, "NOT_CONNECTED",
        "Position intelligence is loaded but offered no explanation for that position — UNKNOWN. No position was invented.");
    }

    if (action === CRYPTO_ACTIONS.OPPORTUNITIES) {
      var oppAsset = (cmd.parameters && cmd.parameters.asset) || null;
      if (!oppAsset) {
        return result(cmd, false, "NEEDS_REVIEW",
          "No asset was named, so no opportunities can be matched — name an asset, for example \u201Cshow opportunities involving SOL\u201D. No opportunity was invented.",
          "ambiguous");
      }
      return cryptoOpportunitiesFor(cmd, oppAsset);
    }

    if (action === CRYPTO_ACTIONS.RISK_COMPARE) {
      var dims = cryptoRiskDimensions();
      if (!dims) {
        return result(cmd, false, "NOT_CONNECTED",
          "Risk intelligence is not connected and no canonical risk dimensions are loaded, so no risk comparison is available — NOT_CONNECTED. No risk score was invented.");
      }
      var riskRes = result(cmd, true, "EXECUTED",
        "Risk comparison — each dimension is listed separately with its own state; no single score is given, because risk is never one unexplained number: " +
        dims.dimensions.map(function (d) { return d.dimension + ": " + d.state; }).join("; ") +
        ". Source: " + dims.source + ". All states are as recorded — nothing here is a safety claim, and nothing was executed.");
      riskRes.dimensions = dims.dimensions;
      riskRes.source = dims.source;
      return riskRes;
    }

    if (action === CRYPTO_ACTIONS.BLOCKED_REASONS) {
      var oppName = (cmd.parameters && cmd.parameters.opportunity) || null;
      if (!oppName) {
        return result(cmd, false, "NEEDS_REVIEW",
          "No opportunity was named, so I did not guess which one is blocked — say which opportunity, for example \u201Cwhy is <opportunity id> blocked\u201D.",
          "ambiguous");
      }
      var foundOpp = findCryptoOpportunity(oppName);
      if (!foundOpp.module) {
        return result(cmd, false, "NOT_CONNECTED",
          "Opportunity intelligence is not connected, so no opportunity can be checked — NOT_CONNECTED. Nothing was invented.");
      }
      if (!foundOpp.opportunity) {
        var noOpp = result(cmd, false, "NO_SUCH_OPPORTUNITY",
          "No opportunity called \u201C" + oppName + "\u201D is recorded — NO_SUCH_OPPORTUNITY. No blocking reason was invented.",
          "no such opportunity");
        noOpp.opportunity = oppName;
        return noOpp;
      }
      var o = foundOpp.opportunity;
      var reasons = [];
      var verification = o.verificationStatus || "UNKNOWN";
      if (verification !== "VERIFIED") {
        reasons.push("Verification is " + verification + " — the opportunity is not verified, so it is not treated as actionable.");
      } else {
        reasons.push("Verification is VERIFIED — that alone does not make it executable; execution is disabled in this build.");
      }
      var freshness = o.freshness || "unknown";
      if (freshness === "fresh") {
        reasons.push("Freshness is fresh.");
      } else {
        reasons.push("Freshness is " + freshness + " — the record is not confirmed current.");
      }
      var reqs = (o.qualification && o.qualification.requirements) || [];
      var accessNotes = o.qualification && o.qualification.accessNotes;
      if (reqs.length) {
        reasons.push("Eligibility requirements recorded: " + reqs.join("; ") + ". Eligibility is not claimed met — the requirements are only listed.");
      } else {
        reasons.push("Eligibility: no requirements are recorded, so eligibility is UNKNOWN, not established." +
          (accessNotes ? " Access notes: " + accessNotes : ""));
      }
      var TM = global.TreasuryMandates;
      if (TM && typeof TM.summary === "function") {
        try {
          var sum = TM.summary();
          reasons.push("Mandate state: " + (sum ? sum.totalMandates : 0) + " mandate(s) recorded, " +
            (sum ? sum.activeMandates : 0) + " ACTIVE. No mandate in this build authorizes execution.");
        } catch (e) {
          reasons.push("Mandate state: UNKNOWN — the mandate summary could not be read.");
        }
      } else {
        reasons.push("Mandate state: UNKNOWN — no mandate source is connected.");
      }
      reasons.push("Execution is disabled in this build (EXECUTION_DISABLED) — a blocked-or-not answer never becomes an execution.");
      var blockedRes = result(cmd, true, "EXECUTED",
        "Why \u201C" + (o.id || oppName) + "\u201D is not treated as actionable: " + reasons.join(" "));
      blockedRes.opportunity = o;
      blockedRes.blockedReasons = reasons;
      return blockedRes;
    }

    if (action === CRYPTO_ACTIONS.BOT_ASSIGNMENTS) {
      var subject = (cmd.parameters && cmd.parameters.subject) || null;
      var CBA = global.CryptoBotAssignments;
      if (CBA) {
        var assigned = null;
        try {
          if (typeof CBA.assignmentsFor === "function") {
            assigned = CBA.assignmentsFor(subject);
          } else if (typeof CBA.listAssignments === "function") {
            assigned = subject ? CBA.listAssignments({ subjectId: subject }) : CBA.listAssignments();
          }
        } catch (e) { assigned = null; }
        if (Array.isArray(assigned)) {
          var lines = assigned.map(function (a) {
            if (!a) return "(unnamed)";
            return (a.principalId || a.workerId || a.botId || a.id || "(unnamed)") +
              " — role " + (a.roleId || "unknown") + ", status " + (a.status || "UNKNOWN");
          });
          var cbaRes = result(cmd, true, "EXECUTED",
            assigned.length ?
              "Bot assignments for \u201C" + (subject || "this") + "\u201D: " + lines.join("; ") + ". No bot was started and nothing was changed." :
              "No bots are assigned to \u201C" + (subject || "this") + "\u201D — none recorded, not a guess. No bot was started and nothing was changed.");
          cbaRes.subject = subject;
          cbaRes.assignments = assigned;
          return cbaRes;
        }
      }
      // A named opportunity may carry a worker assignment in
      // OpportunityIntelligence; that is the only per-subject
      // assignment record that exists in staging.
      if (subject) {
        var fo = findCryptoOpportunity(subject);
        if (fo.module && fo.opportunity) {
          var OI3 = global.OpportunityIntelligence;
          var workerStatus = "UNASSIGNED";
          try {
            if (typeof OI3.workerStatus === "function") workerStatus = OI3.workerStatus(fo.opportunity);
          } catch (e) {}
          var wa = fo.opportunity.workerAssignment || null;
          var botRes = result(cmd, true, "EXECUTED",
            "Bot assignments for \u201C" + (fo.opportunity.id || subject) + "\u201D: worker status " + workerStatus +
            (wa && wa.workerId ? " — assigned worker " + wa.workerId + " (source: " + (wa.source || "unknown") + ")." :
              " — no worker is assigned.") +
            " No bot was started and nothing was changed.");
          botRes.subject = subject;
          botRes.opportunityId = fo.opportunity.id;
          botRes.workerStatus = workerStatus;
          botRes.workerAssignment = wa;
          return botRes;
        }
      }
      return result(cmd, false, "NOT_CONNECTED",
        "No bot-assignment source is connected — NOT_CONNECTED. No bots are claimed to be analyzing anything, and no worker was invented." +
        (subject ? " (Subject: \u201C" + subject + "\u201D.)" : ""));
    }

    return result(cmd, false, "NOT_EXECUTED",
      "That crypto request was recognised but has no handler, so nothing was run.",
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
    COST_VOCABULARY: COST_VOCABULARY.slice(),
    WALLET_ACTIONS: WALLET_ACTIONS,
    CRYPTO_ACTIONS: CRYPTO_ACTIONS,
    parseCommand: parseCommand,
    classify: classify,
    execute: execute,
    getAuditLog: getAuditLog,
    clearAuditLog: clearAuditLog,
    getStatusText: getStatusText,
    hasTransactionalCapability: hasTransactionalCapability
  };
})(window);
