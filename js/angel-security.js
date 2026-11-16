/* MTI6-GTADWIY-COCKPIT — Angel Security runtime foundation (continuous development campaign)
 *
 * Angel Security is built INTO the existing STAR / BotOps foundation.
 * It is a structural model ONLY. No DOM, no network, no secrets, no
 * live detectors, no live alerts.
 *
 * Truth rules enforced here (do not weaken them):
 * - The Angel workforce is SEPARATE from the Twelve Tribes and
 *   dynamically scalable: there is no fixed population. The angel list
 *   starts EMPTY; an angel exists only when explicitly created with
 *   provenance (createdBy + reason). No angel is ever invented.
 * - Four starting security DOMAINS are a registry (domains, NOT a
 *   four-Angel population limit): one angel may cover one or more
 *   domains, and any number of angels may cover the same domain.
 * - NEVER display fabricated live alerts. listAlerts() on a fresh
 *   module returns []. An alert is created only with full provenance
 *   (source + detectedAt + at least one evidence entry) and always
 *   starts at DETECTED — never CONFIRMED or later. The summary
 *   function reports counts by state and never presents unverified
 *   alerts as confirmed: an alert counts as confirmed only once it
 *   has walked the lifecycle to CONFIRMED (or beyond) through a
 *   recorded transition.
 * - Threat knowledge is descriptive only. It NEVER becomes
 *   transactional: reuse the Truth rule (Truth.canBeTransactional
 *   when Truth is loaded) — THREAT / DEFENSE and anything
 *   unverified, unknown, stale, unavailable, not connected, or
 *   disabled can never authorise execution. INFORMATIONAL never
 *   implies TRANSACTIONAL.
 * - Alert lifecycle is a strict state machine. There is NO dismissed
 *   state and NO shortcut: the only transitions are the allowlist
 *   below (straight lifecycle plus VERIFYING -> DETECTED when more
 *   evidence is needed). Any other transition is invalid and throws.
 * - Secret-looking content is never stored in an angel or alert
 *   record (same pattern as BotOpsModel).
 *
 * Depends on js/truth.js and js/bot-ops-model.js at load order only
 * in the sense that this module REUSES their vocabulary when they are
 * present; it degrades gracefully when they are absent (closed
 * fallback lists, same values). Load order for the page:
 *   js/truth.js -> js/bot-ops-model.js -> js/angel-security.js
 *
 *   AngelSecurity.DOMAINS / ALERT_STATES / SEVERITIES
 *   AngelSecurity.listDomains() / getDomain(id)
 *   AngelSecurity.createAngel(input) / listAngels() / getAngel(id)
 *   AngelSecurity.createAlert(input) / listAlerts(filter) / getAlert(id)
 *   AngelSecurity.canTransitionAlert(from, to)
 *   AngelSecurity.transitionAlert(id, to, by, note)
 *   AngelSecurity.assignAlert(alertId, angelId, by, note)
 *   AngelSecurity.escalateSeverity(alertId, toSeverity, reason, by)
 *   AngelSecurity.resolveAlertClass(id) (alias -> canonical class)
 *   AngelSecurity.enterSecurityHold(input) / resolveSecurityHold(holdId, input)
 *   AngelSecurity.listSecurityHolds(filter) / getSecurityHold(holdId)
 *   AngelSecurity.summary()
 *   AngelSecurity.canBeTransactional(kindOrState)
 *
 * EXTENSION (continuous development campaign, Angel Crypto + Wallet
 * Security Hooks unit): the registry grows from 25 to 37 canonical
 * classes plus 1 alias (ABNORMAL_BOT_BEHAVIOR -> BOT_BEHAVIOR_ANOMALY);
 * reportSignal classifies wallet/crypto evidence; SECURITY_HOLD is a
 * record-only hold — it blocks nothing itself, the owning module
 * enforces the block by consulting the hold list.
 *
 * EXTENSION (continuous development campaign, Angel Security
 * Extension): alert-class registry (25 classes), severity alignment
 * to the spec set INFORMATIONAL / CAUTION / HIGH / CRITICAL /
 * UNKNOWN, STAR-watching (reportSignal / watchStarAction), and
 * authorized remediation records. Remediation functions return
 * RECORDS of a decision only — they never perform the underlying
 * system change, and they never perform financial transactions.
 * watchStarAction evaluates STAR actions with the SAME suspicion
 * rules as any other actor: the actor being STAR never clears a
 * finding.
 */
(function (global) {
  "use strict";

  var STORE_KEY = "mti6_angel_security_v1";
  var MAX_ALERTS = 100;
  var MAX_ANGELS = 50;

  // ---- Security domains (registry, not a population limit) -------------
  var DOMAINS = [
    {
      id: "CYBER_IDENTITY",
      label: "Cyber Identity",
      description: "Identity and account security: credential exposure, account takeover signals, phishing and impersonation targeting the owner or the cockpit.",
      typicalSignals: [
        "Unrecognised sign-in attempt on a connected account",
        "Credential appearing in a breach report",
        "Phishing message impersonating a service the owner uses",
        "Unexpected permission or access grant on an account"
      ]
    },
    {
      id: "BLOCKCHAIN_CONTRACT",
      label: "Blockchain Contract",
      description: "Smart-contract and on-chain risk: contract behaviour, oracle and resolution integrity, and predatory on-chain execution patterns.",
      typicalSignals: [
        "Oracle price feed deviating from independent sources",
        "Contract interaction requesting unexpected approvals",
        "Resolution or settlement outcome inconsistent with its inputs",
        "Predatory execution pattern (for example sandwiching) observed on a route the owner uses"
      ]
    },
    {
      id: "FINANCIAL_WALLET",
      label: "Financial Wallet",
      description: "Wallet and funds safety: unauthorised movement, drainer or approval abuse, and wallet-connection risk. Descriptive only — this module never signs, sends, or moves funds.",
      typicalSignals: [
        "Unexpected token approval request",
        "Wallet connection to an unverified site or contract",
        "Unexplained balance change with no owner action recorded",
        "Drainer-style approval pattern on a connected wallet"
      ]
    },
    {
      id: "SYSTEM_PROVIDER_INFRASTRUCTURE",
      label: "System & Provider Infrastructure",
      description: "Infrastructure the cockpit depends on: hosting, deployment, gateway and provider availability, and the integrity of the app itself.",
      typicalSignals: [
        "Hosting or deployment provider outage affecting the preview",
        "Gateway returning unexpected errors",
        "App shell or cached asset failing integrity expectations",
        "Provider status page reporting an incident for a service in use"
      ]
    }
  ];

  // ---- Alert lifecycle (strict allowlist — no dismissed state, no
  // shortcuts). VERIFYING -> DETECTED is the only backward step: it
  // means "needs more evidence", not "dismissed".
  var ALERT_STATES = [
    "DETECTED",
    "VERIFYING",
    "CONFIRMED",
    "ACTIVE",
    "MITIGATING",
    "RESOLVED",
    "POST_INCIDENT_REVIEW"
  ];

  var ALERT_TRANSITIONS = {
    DETECTED: ["VERIFYING"],
    VERIFYING: ["CONFIRMED", "DETECTED"],
    CONFIRMED: ["ACTIVE"],
    ACTIVE: ["MITIGATING"],
    MITIGATING: ["RESOLVED"],
    RESOLVED: ["POST_INCIDENT_REVIEW"],
    POST_INCIDENT_REVIEW: []
  };

  // Severity set aligned to the owner spec (§44 Master Bot Workforce
  // spec): INFORMATIONAL / CAUTION / HIGH / CRITICAL, plus UNKNOWN
  // for unset. LOW maps to INFORMATIONAL and MEDIUM maps to CAUTION;
  // LOW and MEDIUM are NOT accepted severities in this module.
  var SEVERITIES = ["INFORMATIONAL", "CAUTION", "HIGH", "CRITICAL", "UNKNOWN"];

  // Severity order for escalation only. UNKNOWN is not a rank: an
  // UNKNOWN alert may be escalated to any ranked severity, but a
  // ranked severity may only move upward.
  var SEVERITY_RANK = { INFORMATIONAL: 1, CAUTION: 2, HIGH: 3, CRITICAL: 4 };

  // ---- Alert-class registry (25 classes from the owner spec, plus
  // the Angel Crypto + Wallet Security Hooks extension: 12 more
  // canonical classes and 1 alias entry, for 38 registry entries /
  // 37 canonical classes) --------
  // Each class carries its default security domain and default
  // severity. createAlert defaults domain/severity from the class
  // when they are not explicitly given. UNKNOWN_CLASS is NOT a
  // registry class: it is the explicit "could not be classified from
  // the evidence" marker used by reportSignal, recorded with a note.
  // An alias entry carries aliasOf and resolves to its canonical
  // class: createAlert and reportSignal store the canonical id, so
  // one concept never becomes two classes.
  var ALERT_CLASSES = [
    { id: "PROVIDER_DOWN", label: "Provider down", description: "A provider the cockpit depends on is down or unreachable.", defaultDomain: "SYSTEM_PROVIDER_INFRASTRUCTURE", defaultSeverity: "HIGH" },
    { id: "AUTH_FAILURE", label: "Authentication failure", description: "Authentication failed or an account-access signal indicates a possible takeover.", defaultDomain: "CYBER_IDENTITY", defaultSeverity: "HIGH" },
    { id: "RATE_LIMIT", label: "Rate limit", description: "A provider is rate-limiting requests from the cockpit.", defaultDomain: "SYSTEM_PROVIDER_INFRASTRUCTURE", defaultSeverity: "CAUTION" },
    { id: "STALE_DATA", label: "Stale data", description: "Data being shown or used is older than its freshness limit.", defaultDomain: "SYSTEM_PROVIDER_INFRASTRUCTURE", defaultSeverity: "CAUTION" },
    { id: "PRICE_CONFLICT", label: "Price conflict", description: "Independent price sources disagree about the same asset.", defaultDomain: "BLOCKCHAIN_CONTRACT", defaultSeverity: "HIGH" },
    { id: "RPC_FAILURE", label: "RPC failure", description: "An RPC endpoint failed or returned unexpected errors.", defaultDomain: "SYSTEM_PROVIDER_INFRASTRUCTURE", defaultSeverity: "HIGH" },
    { id: "NETWORK_DEGRADED", label: "Network degraded", description: "A network is degraded: slow, unreliable, or partially unavailable.", defaultDomain: "SYSTEM_PROVIDER_INFRASTRUCTURE", defaultSeverity: "CAUTION" },
    { id: "NETWORK_HALTED", label: "Network halted", description: "A network has halted: no new blocks or no progress.", defaultDomain: "SYSTEM_PROVIDER_INFRASTRUCTURE", defaultSeverity: "CRITICAL" },
    { id: "WALLET_ANOMALY", label: "Wallet anomaly", description: "Abnormal wallet behaviour: unexpected approvals, connections, or balance changes.", defaultDomain: "FINANCIAL_WALLET", defaultSeverity: "HIGH" },
    { id: "UNKNOWN_CONTRACT", label: "Unknown contract", description: "An interaction involves a contract the cockpit does not recognise.", defaultDomain: "BLOCKCHAIN_CONTRACT", defaultSeverity: "HIGH" },
    { id: "CONTRACT_INCIDENT", label: "Contract incident", description: "A smart contract has suffered an incident or is behaving unexpectedly.", defaultDomain: "BLOCKCHAIN_CONTRACT", defaultSeverity: "CRITICAL" },
    { id: "BRIDGE_INCIDENT", label: "Bridge incident", description: "A bridge has suffered an incident affecting cross-chain movement.", defaultDomain: "BLOCKCHAIN_CONTRACT", defaultSeverity: "CRITICAL" },
    { id: "ORACLE_INCIDENT", label: "Oracle incident", description: "An oracle feed has suffered an incident or is reporting manipulated data.", defaultDomain: "BLOCKCHAIN_CONTRACT", defaultSeverity: "CRITICAL" },
    { id: "DEPEG", label: "Depeg", description: "A stable asset has lost its peg.", defaultDomain: "BLOCKCHAIN_CONTRACT", defaultSeverity: "HIGH" },
    { id: "LIQUIDITY_COLLAPSE", label: "Liquidity collapse", description: "Liquidity for an asset or pool has collapsed.", defaultDomain: "BLOCKCHAIN_CONTRACT", defaultSeverity: "CRITICAL" },
    { id: "MODEL_FAILURE", label: "Model failure", description: "An AI model failed, returned an error, or behaved untrustworthily.", defaultDomain: "SYSTEM_PROVIDER_INFRASTRUCTURE", defaultSeverity: "HIGH" },
    { id: "TOOL_FAILURE", label: "Tool failure", description: "A governed tool failed or returned an unexpected result.", defaultDomain: "SYSTEM_PROVIDER_INFRASTRUCTURE", defaultSeverity: "CAUTION" },
    { id: "BOT_BEHAVIOR_ANOMALY", label: "Bot behaviour anomaly", description: "A bot is behaving anomalously: unexpected actions, loops, or outputs.", defaultDomain: "SYSTEM_PROVIDER_INFRASTRUCTURE", defaultSeverity: "HIGH" },
    { id: "PERMISSION_VIOLATION", label: "Permission violation", description: "An action exceeded or bypassed its granted permissions.", defaultDomain: "CYBER_IDENTITY", defaultSeverity: "CRITICAL" },
    { id: "AUTHORITY_ESCALATION", label: "Authority escalation", description: "An action attempted to gain authority beyond what was granted, including mandate violations.", defaultDomain: "CYBER_IDENTITY", defaultSeverity: "CRITICAL" },
    { id: "COST_OVERRUN", label: "Cost overrun", description: "Spending or cost exceeded its limit.", defaultDomain: "SYSTEM_PROVIDER_INFRASTRUCTURE", defaultSeverity: "CAUTION" },
    { id: "LOSS_THRESHOLD", label: "Loss threshold", description: "Losses reached or exceeded a threshold.", defaultDomain: "FINANCIAL_WALLET", defaultSeverity: "HIGH" },
    { id: "REPEATED_FAILURE", label: "Repeated failure", description: "The same failure has repeated beyond what a single failure explains.", defaultDomain: "SYSTEM_PROVIDER_INFRASTRUCTURE", defaultSeverity: "CAUTION" },
    { id: "DEPENDENCY_FAILURE", label: "Dependency failure", description: "A dependency the cockpit relies on has failed.", defaultDomain: "SYSTEM_PROVIDER_INFRASTRUCTURE", defaultSeverity: "HIGH" },
    { id: "AUDIT_FAILURE", label: "Audit failure", description: "An audit check failed or audit evidence is missing or inconsistent.", defaultDomain: "SYSTEM_PROVIDER_INFRASTRUCTURE", defaultSeverity: "HIGH" },
    // Wallet security classes (Wallet spec W6) — added by the Angel
    // Crypto + Wallet Security Hooks unit. All default to
    // FINANCIAL_WALLET except PROVIDER_CONFLICT. UNKNOWN_CONTRACT
    // already existed in the 25-class registry and is NOT duplicated
    // here.
    { id: "WALLET_DISCONNECTED", label: "Wallet disconnected", description: "A connected wallet disconnected unexpectedly, with no owner action recorded.", defaultDomain: "FINANCIAL_WALLET", defaultSeverity: "HIGH" },
    { id: "UNEXPECTED_ACCOUNT_CHANGE", label: "Unexpected account change", description: "The active wallet account changed without an owner action recorded.", defaultDomain: "FINANCIAL_WALLET", defaultSeverity: "HIGH" },
    { id: "UNEXPECTED_NETWORK_CHANGE", label: "Unexpected network change", description: "The active wallet network changed without an owner action recorded.", defaultDomain: "FINANCIAL_WALLET", defaultSeverity: "HIGH" },
    { id: "UNKNOWN_WALLET", label: "Unknown wallet", description: "A wallet the cockpit does not recognise is connected or referenced.", defaultDomain: "FINANCIAL_WALLET", defaultSeverity: "HIGH" },
    { id: "UNKNOWN_ADDRESS", label: "Unknown address", description: "An address the cockpit does not recognise is involved in wallet activity.", defaultDomain: "FINANCIAL_WALLET", defaultSeverity: "HIGH" },
    { id: "UNKNOWN_ASSET", label: "Unknown asset", description: "An asset the cockpit does not recognise is involved in wallet or crypto activity.", defaultDomain: "FINANCIAL_WALLET", defaultSeverity: "HIGH" },
    { id: "BALANCE_DATA_STALE", label: "Balance data stale", description: "Balance data is older than its freshness limit.", defaultDomain: "FINANCIAL_WALLET", defaultSeverity: "CAUTION" },
    { id: "PROVIDER_CONFLICT", label: "Provider conflict", description: "Wallet providers conflict: more than one provider claims the same wallet connection, or provider data disagrees.", defaultDomain: "SYSTEM_PROVIDER_INFRASTRUCTURE", defaultSeverity: "HIGH" },
    { id: "SUSPICIOUS_PERMISSION_REQUEST", label: "Suspicious permission request", description: "A permission request looks suspicious: unexpected scope, target, or timing.", defaultDomain: "FINANCIAL_WALLET", defaultSeverity: "HIGH" },
    { id: "SIGNATURE_REQUEST_OUTSIDE_POLICY", label: "Signature request outside policy", description: "A signature was requested outside the owner's signing policy.", defaultDomain: "FINANCIAL_WALLET", defaultSeverity: "CRITICAL" },
    { id: "MANDATE_EXCEEDED", label: "Mandate exceeded", description: "An action exceeded its mandate.", defaultDomain: "FINANCIAL_WALLET", defaultSeverity: "CRITICAL" },
    { id: "SECURITY_HOLD", label: "Security hold", description: "A security hold was placed on a wallet, asset, or account: a record that activity is paused pending review. The hold itself blocks nothing; the owning module enforces it by consulting the hold list.", defaultDomain: "FINANCIAL_WALLET", defaultSeverity: "HIGH" },
    // Alias (Crypto spec §99-11): ABNORMAL_BOT_BEHAVIOR is the same
    // concept as BOT_BEHAVIOR_ANOMALY under a different name — one
    // concept, one canonical class. The alias entry exists so the
    // name resolves; createAlert/reportSignal store the canonical
    // BOT_BEHAVIOR_ANOMALY, never a second class.
    { id: "ABNORMAL_BOT_BEHAVIOR", aliasOf: "BOT_BEHAVIOR_ANOMALY", label: "Abnormal bot behavior", description: "Alias of BOT_BEHAVIOR_ANOMALY: a bot is behaving anomalously: unexpected actions, loops, or outputs.", defaultDomain: "SYSTEM_PROVIDER_INFRASTRUCTURE", defaultSeverity: "HIGH" }
  ];

  // Remediation log bound. Remediation records are RECORDS of a
  // decision only; the owning system executes the change.
  var MAX_REMEDIATIONS = 200;

  // Security-hold log bound. Holds are RECORDS only; the owning
  // module enforces the block by consulting the hold list.
  var MAX_HOLDS = 100;

  // A remediation request naming a financial action is forbidden:
  // remediation NEVER performs financial transactions. The four
  // remediation verbs themselves (pause, quarantine, disable,
  // mark-stale) never match this pattern; the pattern catches the
  // requested target or reason naming a financial execution.
  var FINANCIAL_RE = /\b(buy|buying|sell|selling|trade|swap|swapping|stake|staking|unstake|lend|lending|borrow|borrowing|claim|claiming|withdraw|withdrawing|withdrawal|withdrawals|deposit|deposits|depositing|payment|payments|cash[- ]?out|payout|payouts|send (funds|money|tokens?|coins?)|transfer (funds|money|tokens?|coins?)|sign (a )?transaction|execute (a )?(trade|swap|transaction|withdrawal|deposit|payment|payout)|bridge (funds|assets|tokens?|coins?)|move funds)\b/i;

  var ANGEL_STATES = ["ACTIVE", "SUSPENDED"];

  // Verification states reused from Truth when loaded; same closed
  // list as the fallback in truth.js. An angel is created UNVERIFIED
  // and stays UNVERIFIED: no verification process exists in this
  // build, so no angel is ever recorded as VERIFIED here.
  var FALLBACK_TRUTH_STATES = ["NOT_CONNECTED", "UNKNOWN", "UNVERIFIED",
    "STALE", "DISABLED", "UNAVAILABLE", "VERIFIED", "LIVE"];

  var NON_TRANSACTIONAL = ["THREAT", "DEFENSE", "UNVERIFIED", "UNKNOWN",
    "STALE", "UNAVAILABLE", "NOT_CONNECTED", "DISABLED"];

  // Same secret pattern as BotOpsModel: keys/passwords/private keys/
  // issued tokens, not ordinary words (a bare "token" is a legitimate
  // crypto term and is NOT matched).
  var SECRET_PATTERN = /(api[_-]?key|secret|password|passwd|private[_-]?key|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-live-[a-z0-9]+|ghp_[a-z0-9]+|github_pat_[a-z0-9_]+|xox[baprs]-[a-z0-9-]+)/i;

  function nowIso() {
    return new Date().toISOString();
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function isStringArray(value) {
    if (!Array.isArray(value)) return false;
    for (var i = 0; i < value.length; i++) {
      if (typeof value[i] !== "string") return false;
    }
    return true;
  }

  function truthStates() {
    if (global.Truth && Array.isArray(global.Truth.TRUTH_STATES) &&
      global.Truth.TRUTH_STATES.length) {
      return global.Truth.TRUTH_STATES.slice();
    }
    return FALLBACK_TRUTH_STATES.slice();
  }

  function isKnownDomain(id) {
    for (var i = 0; i < DOMAINS.length; i++) {
      if (DOMAINS[i].id === id) return true;
    }
    return false;
  }

  function findSecretField(fields) {
    for (var i = 0; i < fields.length; i++) {
      if (typeof fields[i][1] === "string" && SECRET_PATTERN.test(fields[i][1])) {
        return fields[i][0];
      }
    }
    return null;
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // ---- Domains ----------------------------------------------------------

  function listDomains() {
    return clone(DOMAINS);
  }

  function getDomain(id) {
    if (typeof id !== "string") return null;
    for (var i = 0; i < DOMAINS.length; i++) {
      if (DOMAINS[i].id === id) return clone(DOMAINS[i]);
    }
    return null;
  }

  // ---- Alert classes ----------------------------------------------------

  function listAlertClasses() {
    return clone(ALERT_CLASSES);
  }

  function getAlertClass(id) {
    if (typeof id !== "string") return null;
    for (var i = 0; i < ALERT_CLASSES.length; i++) {
      if (ALERT_CLASSES[i].id === id) return clone(ALERT_CLASSES[i]);
    }
    return null;
  }

  function isKnownAlertClass(id) {
    return getAlertClass(id) !== null;
  }

  // Alias resolution: an alias entry (aliasOf) resolves to its
  // canonical registry entry so one concept never becomes two
  // classes. Returns the canonical entry, or null when the id is
  // unknown (or an alias cycle is detected — fail closed).
  function resolveAlertClass(id) {
    var entry = getAlertClass(id);
    if (!entry) return null;
    var seen = {};
    while (entry && entry.aliasOf) {
      if (seen[entry.id]) return null;
      seen[entry.id] = true;
      entry = getAlertClass(entry.aliasOf);
    }
    return entry;
  }

  function canonicalAlertClassId(id) {
    var entry = resolveAlertClass(id);
    return entry ? entry.id : null;
  }

  // Best-effort classification of evidence text into an alert class.
  // Returns the class id, or "UNKNOWN_CLASS" when nothing matches.
  // It never invents a class: an unmatched signal is honestly
  // UNKNOWN_CLASS with a note, and the alert still starts DETECTED.
  var EVIDENCE_CLASS_PATTERNS = [
    // Wallet / crypto hook patterns (Angel Crypto + Wallet Security
    // Hooks unit). These come FIRST because they are more specific
    // than the generic patterns below: "mandate exceeded" must reach
    // MANDATE_EXCEEDED, not AUTHORITY_ESCALATION; "wallet
    // disconnected" must reach WALLET_DISCONNECTED, not the generic
    // WALLET_ANOMALY; "stale balance" must reach BALANCE_DATA_STALE,
    // not STALE_DATA; "abnormal bot behavior" is the alias name for
    // BOT_BEHAVIOR_ANOMALY and classifies straight to the canonical
    // class.
    { re: /mandate exceeded|exceeded (its|the) mandate/, alertClass: "MANDATE_EXCEEDED" },
    { re: /signature request outside policy|signature outside policy|signing outside policy/, alertClass: "SIGNATURE_REQUEST_OUTSIDE_POLICY" },
    { re: /suspicious permission/, alertClass: "SUSPICIOUS_PERMISSION_REQUEST" },
    { re: /wallet disconnected|disconnected wallet/, alertClass: "WALLET_DISCONNECTED" },
    { re: /unexpected account change|account (changed|switched)/, alertClass: "UNEXPECTED_ACCOUNT_CHANGE" },
    { re: /unexpected network change|network (changed|switched)/, alertClass: "UNEXPECTED_NETWORK_CHANGE" },
    { re: /unknown wallet/, alertClass: "UNKNOWN_WALLET" },
    { re: /unknown address|unrecognised address|unrecognized address/, alertClass: "UNKNOWN_ADDRESS" },
    { re: /unknown asset|unrecognised asset|unrecognized asset/, alertClass: "UNKNOWN_ASSET" },
    { re: /balance (data )?stale|stale balance/, alertClass: "BALANCE_DATA_STALE" },
    { re: /provider conflict|conflicting providers?/, alertClass: "PROVIDER_CONFLICT" },
    { re: /security hold/, alertClass: "SECURITY_HOLD" },
    { re: /abnormal bot behavio[u]?r/, alertClass: "BOT_BEHAVIOR_ANOMALY" },
    { re: /privilege|escalat|assume owner|become owner|owner authority/, alertClass: "AUTHORITY_ESCALATION" },
    { re: /permission (violation|bypass)|bypass (permission|authori[sz]ation)|unauthori[sz]ed (access|permission|grant)/, alertClass: "PERMISSION_VIOLATION" },
    { re: /oracle/, alertClass: "ORACLE_INCIDENT" },
    { re: /price conflict|conflicting price|price (mismatch|disagree)/, alertClass: "PRICE_CONFLICT" },
    { re: /depeg|lost (its|the) peg/, alertClass: "DEPEG" },
    { re: /liquidity (collapse|drain)/, alertClass: "LIQUIDITY_COLLAPSE" },
    { re: /bridge/, alertClass: "BRIDGE_INCIDENT" },
    { re: /contract (incident|exploit|hack|breach)/, alertClass: "CONTRACT_INCIDENT" },
    { re: /unknown contract|unrecognised contract|unrecognized contract/, alertClass: "UNKNOWN_CONTRACT" },
    { re: /wallet|drainer|unexpected approval/, alertClass: "WALLET_ANOMALY" },
    { re: /loss (threshold|exceed|limit)/, alertClass: "LOSS_THRESHOLD" },
    { re: /cost (overrun|exceed|limit)/, alertClass: "COST_OVERRUN" },
    { re: /rate limit|rate.?limit|429/, alertClass: "RATE_LIMIT" },
    { re: /rpc/, alertClass: "RPC_FAILURE" },
    { re: /network halt|chain halt|halted/, alertClass: "NETWORK_HALTED" },
    { re: /network degrad|degraded network/, alertClass: "NETWORK_DEGRADED" },
    { re: /provider down|provider outage|provider (is )?down/, alertClass: "PROVIDER_DOWN" },
    { re: /stale/, alertClass: "STALE_DATA" },
    { re: /auth (fail|error)|authentication fail|sign-in fail|credential/, alertClass: "AUTH_FAILURE" },
    { re: /model (fail|error)|suspicious model/, alertClass: "MODEL_FAILURE" },
    { re: /unapproved tool|unknown tool|tool (fail|error|request)/, alertClass: "TOOL_FAILURE" },
    { re: /bot (behavio[u]?r|anomaly)|anomalous bot/, alertClass: "BOT_BEHAVIOR_ANOMALY" },
    { re: /repeated fail|same failure/, alertClass: "REPEATED_FAILURE" },
    { re: /dependenc\w* fail/, alertClass: "DEPENDENCY_FAILURE" },
    { re: /audit fail/, alertClass: "AUDIT_FAILURE" }
  ];

  function resolveAlertClassFromEvidence(evidence) {
    if (!Array.isArray(evidence)) return "UNKNOWN_CLASS";
    var text = evidence.map(function (e) {
      return ((e && e.kind) || "") + " " + ((e && e.reference) || "");
    }).join(" ").toLowerCase();
    for (var i = 0; i < EVIDENCE_CLASS_PATTERNS.length; i++) {
      if (EVIDENCE_CLASS_PATTERNS[i].re.test(text)) {
        return EVIDENCE_CLASS_PATTERNS[i].alertClass;
      }
    }
    return "UNKNOWN_CLASS";
  }

  // ---- Lifecycle --------------------------------------------------------

  function canTransitionAlert(from, to) {
    if (typeof from !== "string" || typeof to !== "string") return false;
    var allowed = ALERT_TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.indexOf(to) !== -1;
  }

  // Threat knowledge NEVER becomes transactional, and neither does
  // anything unverified, unknown, stale, unavailable, not connected,
  // or disabled. Delegates to Truth when loaded; the fallback applies
  // the same rule. This function alone never authorises execution.
  function canBeTransactional(kindOrState) {
    if (global.Truth && typeof global.Truth.canBeTransactional === "function") {
      return global.Truth.canBeTransactional(kindOrState);
    }
    if (kindOrState === undefined || kindOrState === null) return false;
    if (NON_TRANSACTIONAL.indexOf(String(kindOrState)) !== -1) return false;
    return String(kindOrState) === "VERIFIED" || String(kindOrState) === "LIVE";
  }

  // ---- Validation (returns error arrays, never throws) ------------------

  function validateEvidence(evidence) {
    var errors = [];
    if (!Array.isArray(evidence) || evidence.length === 0) {
      errors.push("evidence must be a non-empty array with at least one entry.");
      return errors;
    }
    for (var i = 0; i < evidence.length; i++) {
      var entry = evidence[i];
      if (!entry || typeof entry !== "object") {
        errors.push("evidence[" + i + "] must be an object.");
        continue;
      }
      if (!isNonEmptyString(entry.kind)) {
        errors.push("evidence[" + i + "].kind is required and must be a non-empty string.");
      }
      if (!isNonEmptyString(entry.reference)) {
        errors.push("evidence[" + i + "].reference is required and must be a non-empty string.");
      }
      if (!isNonEmptyString(entry.recordedAt)) {
        errors.push("evidence[" + i + "].recordedAt is required and must be a non-empty string.");
      }
    }
    return errors;
  }

  function validateAlert(alert) {
    var errors = [];
    if (!alert || typeof alert !== "object") {
      return ["Alert must be an object."];
    }
    if (!isKnownDomain(alert.domain)) {
      errors.push("domain must be one of: " + DOMAINS.map(function (d) { return d.id; }).join(", ") + ".");
    }
    if (!isNonEmptyString(alert.title)) {
      errors.push("title is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(alert.description)) {
      errors.push("description is required and must be a non-empty string.");
    }
    if (SEVERITIES.indexOf(alert.severity) === -1) {
      errors.push("severity must be one of: " + SEVERITIES.join(", ") + ".");
    }
    if (ALERT_STATES.indexOf(alert.state) === -1) {
      errors.push("state must be one of: " + ALERT_STATES.join(", ") + ".");
    }
    if (!isNonEmptyString(alert.source)) {
      errors.push("source is required and must be a non-empty string (provenance).");
    }
    if (!isNonEmptyString(alert.detectedAt)) {
      errors.push("detectedAt is required and must be a non-empty string (provenance).");
    }
    errors = errors.concat(validateEvidence(alert.evidence));
    if (!Array.isArray(alert.history)) {
      errors.push("history must be an array of transition entries.");
    }
    if (!Array.isArray(alert.relatedAssets) || !isStringArray(alert.relatedAssets)) {
      errors.push("relatedAssets must be an array of strings.");
    }
    if (!Array.isArray(alert.relatedNetworks) || !isStringArray(alert.relatedNetworks)) {
      errors.push("relatedNetworks must be an array of strings.");
    }
    if (alert.assignedAngelId !== null && typeof alert.assignedAngelId !== "string") {
      errors.push("assignedAngelId must be a string or null.");
    }
    // The assigned worker IS the angel for Angel Security, so the two
    // fields are aliases and must stay in sync: when both are set
    // they must be equal. (Older stored records without
    // assignedWorkerId are normalised on load, never rejected here
    // for a missing alias — the sync check only fires on disagreement.)
    if (alert.assignedWorkerId !== undefined && alert.assignedWorkerId !== null &&
      typeof alert.assignedWorkerId !== "string") {
      errors.push("assignedWorkerId must be a string or null.");
    }
    if (typeof alert.assignedAngelId === "string" &&
      typeof alert.assignedWorkerId === "string" &&
      alert.assignedAngelId !== alert.assignedWorkerId) {
      errors.push("assignedWorkerId must match assignedAngelId: the assigned worker IS the angel for Angel Security.");
    }
    // Alert class: a registry id, the explicit UNKNOWN_CLASS marker
    // ("could not be classified from the evidence"), or null when no
    // class was given at creation. Any other value is rejected.
    if (alert.alertClass !== undefined && alert.alertClass !== null &&
      !isKnownAlertClass(alert.alertClass) && alert.alertClass !== "UNKNOWN_CLASS") {
      errors.push("alertClass must be a known alert class, UNKNOWN_CLASS, or null.");
    }
    if (!isNonEmptyString(alert.affectedSystem)) {
      errors.push("affectedSystem is required and must be a non-empty string (for example \"wallet\", \"rpc-provider\", \"star\", \"crypto-world\").");
    }
    if (!isNonEmptyString(alert.lastUpdated)) {
      errors.push("lastUpdated is required and must be a non-empty string (ISO timestamp, updated on every transition/escalation).");
    }
    if (alert.mitigation !== undefined && alert.mitigation !== null) {
      if (typeof alert.mitigation !== "object" ||
        !isNonEmptyString(alert.mitigation.text) ||
        !isNonEmptyString(alert.mitigation.by) ||
        !isNonEmptyString(alert.mitigation.at)) {
        errors.push("mitigation must be null or a record {text, by, at} with non-empty strings.");
      }
    }
    if (alert.resolution !== undefined && alert.resolution !== null) {
      if (typeof alert.resolution !== "object" ||
        !isNonEmptyString(alert.resolution.text) ||
        !isNonEmptyString(alert.resolution.by) ||
        !isNonEmptyString(alert.resolution.at)) {
        errors.push("resolution must be null or a record {text, by, at} with non-empty strings.");
      }
    }
    if (alert.starNotification !== undefined && alert.starNotification !== null) {
      if (typeof alert.starNotification !== "object" ||
        !isNonEmptyString(alert.starNotification.notifiedAt) ||
        typeof alert.starNotification.summary !== "string") {
        errors.push("starNotification must be null or a record {notifiedAt, summary} (a record of a notification to STAR, never a live send).");
      }
    }
    if (alert.flowTrail !== undefined && !Array.isArray(alert.flowTrail)) {
      errors.push("flowTrail must be an array of flow-step records.");
    }
    var secretField = findSecretField([
      ["title", alert.title],
      ["description", alert.description],
      ["source", alert.source]
    ].concat((Array.isArray(alert.evidence) ? alert.evidence : []).map(function (e, i) {
      return ["evidence[" + i + "].reference", e && e.reference];
    })));
    if (secretField) {
      errors.push("Field " + secretField + " looks like a secret or credential and must not be stored in an alert.");
    }
    return errors;
  }

  function validateAngel(angel) {
    var errors = [];
    if (!angel || typeof angel !== "object") {
      return ["Angel must be an object."];
    }
    if (!Array.isArray(angel.domains) || angel.domains.length === 0) {
      errors.push("domains must be a non-empty array of domain ids.");
    } else {
      for (var i = 0; i < angel.domains.length; i++) {
        if (!isKnownDomain(angel.domains[i])) {
          errors.push("domains[" + i + "] is not a known domain: " + angel.domains[i] + ".");
        }
      }
    }
    if (ANGEL_STATES.indexOf(angel.state) === -1) {
      errors.push("state must be one of: " + ANGEL_STATES.join(", ") + ".");
    }
    if (!Array.isArray(angel.assignedAlertIds) || !isStringArray(angel.assignedAlertIds)) {
      errors.push("assignedAlertIds must be an array of alert ids (strings).");
    }
    if (!isNonEmptyString(angel.createdAt)) {
      errors.push("createdAt is required and must be a non-empty string.");
    }
    if (truthStates().indexOf(angel.verificationStatus) === -1) {
      errors.push("verificationStatus must be one of: " + truthStates().join(", ") + ".");
    }
    if (!isNonEmptyString(angel.createdBy)) {
      errors.push("createdBy is required and must be a non-empty string (provenance).");
    }
    if (!isNonEmptyString(angel.createdReason)) {
      errors.push("createdReason is required and must be a non-empty string (provenance).");
    }
    var secretField = findSecretField([
      ["createdBy", angel.createdBy],
      ["createdReason", angel.createdReason]
    ]);
    if (secretField) {
      errors.push("Field " + secretField + " looks like a secret or credential and must not be stored in an angel.");
    }
    return errors;
  }

  // ---- Store (localStorage with memory fallback, bounded — same
  // pattern as BotOpsModel). Angels and alerts share one store key
  // because they are one security model; the store is separate from
  // worker tasks and from Mission Control user tasks.
  var memoryFallback = { angels: [], alerts: [], remediations: [], holds: [] };

  // Older stored alerts predate the extension fields. Normalise them
  // on load so they stay usable (and stay valid under validateAlert)
  // without inventing history: affectedSystem is UNKNOWN, the class
  // is null (unclassified), mitigation/resolution/starNotification
  // are null, flowTrail is empty, and the worker alias follows the
  // angel assignment. lastUpdated falls back to updatedAt/createdAt.
  function normalizeAlert(alert) {
    if (!alert || typeof alert !== "object") return alert;
    if (!isNonEmptyString(alert.affectedSystem)) alert.affectedSystem = "UNKNOWN";
    if (alert.alertClass === undefined) alert.alertClass = null;
    if (alert.assignedWorkerId === undefined) {
      alert.assignedWorkerId = typeof alert.assignedAngelId === "string" ? alert.assignedAngelId : null;
    }
    if (!isNonEmptyString(alert.lastUpdated)) {
      alert.lastUpdated = isNonEmptyString(alert.updatedAt) ? alert.updatedAt :
        (isNonEmptyString(alert.createdAt) ? alert.createdAt : nowIso());
    }
    if (alert.mitigation === undefined) alert.mitigation = null;
    if (alert.resolution === undefined) alert.resolution = null;
    if (alert.starNotification === undefined) alert.starNotification = null;
    if (!Array.isArray(alert.flowTrail)) alert.flowTrail = [];
    return alert;
  }

  function normalizeAll(data) {
    if (data && Array.isArray(data.alerts)) {
      data.alerts = data.alerts.map(normalizeAlert);
    }
    if (!data || !Array.isArray(data.remediations)) {
      if (data) data.remediations = [];
    }
    if (!data || !Array.isArray(data.holds)) {
      if (data) data.holds = [];
    }
    return data;
  }

  function storage() {
    try {
      if (typeof localStorage !== "undefined" && localStorage) return localStorage;
    } catch (e) {}
    return null;
  }

  function loadAll() {
    var store = storage();
    if (store) {
      try {
        var raw = store.getItem(STORE_KEY);
        if (!raw) return { angels: [], alerts: [], remediations: [], holds: [] };
        var parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return { angels: [], alerts: [], remediations: [], holds: [] };
        return normalizeAll({
          angels: Array.isArray(parsed.angels) ? parsed.angels : [],
          alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
          remediations: Array.isArray(parsed.remediations) ? parsed.remediations : [],
          holds: Array.isArray(parsed.holds) ? parsed.holds : []
        });
      } catch (e) {
        return { angels: [], alerts: [], remediations: [], holds: [] };
      }
    }
    return normalizeAll({
      angels: memoryFallback.angels.slice(),
      alerts: memoryFallback.alerts.slice(),
      remediations: (memoryFallback.remediations || []).slice(),
      holds: (memoryFallback.holds || []).slice()
    });
  }

  function persistAll(data) {
    var bounded = {
      angels: data.angels.slice(0, MAX_ANGELS),
      alerts: data.alerts.slice(0, MAX_ALERTS),
      remediations: (data.remediations || []).slice(0, MAX_REMEDIATIONS),
      holds: (data.holds || []).slice(0, MAX_HOLDS)
    };
    var store = storage();
    if (store) {
      try {
        store.setItem(STORE_KEY, JSON.stringify(bounded));
      } catch (e) {}
    } else {
      memoryFallback = bounded;
    }
    return bounded;
  }

  function sortNewestFirst(records) {
    return records.slice().sort(function (a, b) {
      var ta = a && a.createdAt ? String(a.createdAt) : "";
      var tb = b && b.createdAt ? String(b.createdAt) : "";
      if (tb < ta) return -1;
      if (tb > ta) return 1;
      return 0;
    });
  }

  function newId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  // ---- Angels -----------------------------------------------------------

  // No angel is ever invented: creation requires explicit provenance
  // (createdBy + reason) and at least one known domain. A new angel
  // starts ACTIVE with verificationStatus UNVERIFIED and no assigned
  // alerts.
  function createAngel(input) {
    var reasons = [];
    var data = input && typeof input === "object" ? input : {};
    if (!isNonEmptyString(data.createdBy)) {
      reasons.push("createdBy is required and must be a non-empty string (provenance).");
    }
    if (!isNonEmptyString(data.reason)) {
      reasons.push("reason is required and must be a non-empty string (provenance).");
    }
    if (!Array.isArray(data.domains) || data.domains.length === 0) {
      reasons.push("domains must be a non-empty array of domain ids.");
    } else {
      for (var i = 0; i < data.domains.length; i++) {
        if (!isKnownDomain(data.domains[i])) {
          reasons.push("domains[" + i + "] is not a known domain: " + data.domains[i] + ".");
        }
      }
    }
    if (reasons.length) {
      throw new Error("Invalid angel: " + reasons.join(" "));
    }
    var stamp = nowIso();
    var angel = {
      id: newId("angel"),
      domains: data.domains.slice(),
      state: "ACTIVE",
      assignedAlertIds: [],
      createdAt: stamp,
      verificationStatus: "UNVERIFIED",
      createdBy: data.createdBy.trim(),
      createdReason: data.reason.trim()
    };
    var errors = validateAngel(angel);
    if (errors.length) {
      throw new Error("Invalid angel: " + errors.join(" "));
    }
    var all = loadAll();
    all.angels.unshift(angel);
    persistAll(all);
    return clone(angel);
  }

  function listAngels() {
    return sortNewestFirst(loadAll().angels).slice(0, MAX_ANGELS).map(clone);
  }

  function getAngel(id) {
    if (typeof id !== "string") return null;
    var angels = loadAll().angels;
    for (var i = 0; i < angels.length; i++) {
      if (angels[i] && angels[i].id === id) return clone(angels[i]);
    }
    return null;
  }

  // ---- Alerts -----------------------------------------------------------

  // No fabricated live alerts: creation requires full provenance
  // (source + detectedAt + at least one evidence entry) and the alert
  // ALWAYS starts at DETECTED. There is no way to create an alert in
  // CONFIRMED or any later state.
  function createAlert(input) {
    var reasons = [];
    var data = input && typeof input === "object" ? input : {};
    // Alert class, when given, must be a registry class (or the
    // explicit UNKNOWN_CLASS marker). An alias name resolves to its
    // canonical class (ABNORMAL_BOT_BEHAVIOR -> BOT_BEHAVIOR_ANOMALY)
    // and the CANONICAL id is what gets stored. Its defaults apply
    // only when domain/severity are not explicitly given.
    var classEntry = null;
    if (data.alertClass !== undefined && data.alertClass !== null) {
      if (data.alertClass === "UNKNOWN_CLASS") {
        classEntry = null;
      } else {
        classEntry = resolveAlertClass(data.alertClass);
        if (!classEntry) {
          reasons.push("alertClass must be a known alert class: " +
            ALERT_CLASSES.map(function (c) { return c.id; }).join(", ") + " (or UNKNOWN_CLASS).");
        }
      }
    }
    var resolvedDomain = data.domain ||
      (classEntry ? classEntry.defaultDomain : undefined);
    if (!isKnownDomain(resolvedDomain)) {
      reasons.push("domain must be one of: " + DOMAINS.map(function (d) { return d.id; }).join(", ") + ".");
    }
    if (!isNonEmptyString(data.title)) {
      reasons.push("title is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(data.description)) {
      reasons.push("description is required and must be a non-empty string.");
    }
    if (data.severity !== undefined && SEVERITIES.indexOf(data.severity) === -1) {
      reasons.push("severity must be one of: " + SEVERITIES.join(", ") + ".");
    }
    if (!isNonEmptyString(data.affectedSystem)) {
      reasons.push("affectedSystem is required and must be a non-empty string (for example \"wallet\", \"rpc-provider\", \"star\", \"crypto-world\").");
    }
    if (!isNonEmptyString(data.source)) {
      reasons.push("source is required and must be a non-empty string (provenance).");
    }
    if (!isNonEmptyString(data.detectedAt)) {
      reasons.push("detectedAt is required and must be a non-empty string (provenance).");
    }
    reasons = reasons.concat(validateEvidence(data.evidence));
    if (data.relatedAssets !== undefined && !isStringArray(data.relatedAssets)) {
      reasons.push("relatedAssets must be an array of strings.");
    }
    if (data.relatedNetworks !== undefined && !isStringArray(data.relatedNetworks)) {
      reasons.push("relatedNetworks must be an array of strings.");
    }
    if (reasons.length) {
      throw new Error("Invalid alert: " + reasons.join(" "));
    }
    var stamp = nowIso();
    var alert = {
      id: newId("alert"),
      domain: resolvedDomain,
      title: data.title.trim(),
      description: data.description.trim(),
      severity: data.severity !== undefined ? data.severity :
        (classEntry ? classEntry.defaultSeverity : "UNKNOWN"),
      state: "DETECTED",
      detectedAt: data.detectedAt,
      source: data.source.trim(),
      evidence: clone(data.evidence),
      history: [{
        from: null,
        to: "DETECTED",
        at: stamp,
        by: data.source.trim(),
        note: "Alert created at DETECTED with provenance (source + detectedAt + evidence)."
      }],
      relatedAssets: data.relatedAssets ? data.relatedAssets.slice() : [],
      relatedNetworks: data.relatedNetworks ? data.relatedNetworks.slice() : [],
      assignedAngelId: null,
      assignedWorkerId: null,
      // Store the canonical class id: an alias name given at creation
      // was already resolved into classEntry above, so the stored
      // alertClass is always canonical (or UNKNOWN_CLASS / null).
      alertClass: classEntry ? classEntry.id :
        (data.alertClass === "UNKNOWN_CLASS" ? "UNKNOWN_CLASS" : null),
      affectedSystem: data.affectedSystem.trim(),
      lastUpdated: stamp,
      mitigation: null,
      resolution: null,
      starNotification: null,
      flowTrail: [],
      createdAt: stamp,
      updatedAt: stamp
    };
    var errors = validateAlert(alert);
    if (errors.length) {
      throw new Error("Invalid alert: " + errors.join(" "));
    }
    var all = loadAll();
    all.alerts.unshift(alert);
    persistAll(all);
    return clone(alert);
  }

  function listAlerts(filter) {
    var alerts = sortNewestFirst(loadAll().alerts).slice(0, MAX_ALERTS);
    if (!filter || typeof filter !== "object") return alerts.map(clone);
    return alerts.filter(function (a) {
      if (filter.state !== undefined && a.state !== filter.state) return false;
      if (filter.domain !== undefined && a.domain !== filter.domain) return false;
      if (filter.severity !== undefined && a.severity !== filter.severity) return false;
      if (filter.alertClass !== undefined && a.alertClass !== filter.alertClass) return false;
      if (filter.affectedSystem !== undefined && a.affectedSystem !== filter.affectedSystem) return false;
      if (filter.assignedAngelId !== undefined && a.assignedAngelId !== filter.assignedAngelId) return false;
      return true;
    }).map(clone);
  }

  function getAlert(id) {
    if (typeof id !== "string") return null;
    var alerts = loadAll().alerts;
    for (var i = 0; i < alerts.length; i++) {
      if (alerts[i] && alerts[i].id === id) return clone(alerts[i]);
    }
    return null;
  }

  function saveAlert(updated) {
    // Keep the worker alias in sync with the angel assignment: the
    // assigned worker IS the angel for Angel Security.
    if (typeof updated.assignedAngelId === "string" &&
      (updated.assignedWorkerId === null || updated.assignedWorkerId === undefined)) {
      updated.assignedWorkerId = updated.assignedAngelId;
    }
    if (typeof updated.assignedWorkerId === "string" &&
      (updated.assignedAngelId === null || updated.assignedAngelId === undefined)) {
      updated.assignedAngelId = updated.assignedWorkerId;
    }
    var errors = validateAlert(updated);
    if (errors.length) {
      throw new Error("Invalid alert: " + errors.join(" "));
    }
    var all = loadAll();
    var found = false;
    for (var i = 0; i < all.alerts.length; i++) {
      if (all.alerts[i] && all.alerts[i].id === updated.id) {
        all.alerts[i] = updated;
        found = true;
        break;
      }
    }
    if (!found) {
      throw new Error("No alert with id " + updated.id + ".");
    }
    persistAll(all);
    return clone(updated);
  }

  // Moves an alert along the allowlist only. Every transition appends
  // a history entry with actor + note. An illegal transition throws
  // and nothing is written. There is no dismissed state and no
  // shortcut past VERIFYING.
  function transitionAlert(id, to, by, note) {
    if (typeof id !== "string") {
      throw new Error("transitionAlert requires an alert id.");
    }
    if (ALERT_STATES.indexOf(to) === -1) {
      throw new Error("Unknown alert state: " + to + ".");
    }
    if (!isNonEmptyString(by)) {
      throw new Error("transitionAlert requires an actor (by).");
    }
    var alert = getAlert(id);
    if (!alert) {
      throw new Error("No alert with id " + id + ".");
    }
    if (!canTransitionAlert(alert.state, to)) {
      throw new Error("Illegal alert transition: " + alert.state + " -> " + to + " is not allowed.");
    }
    var updated = clone(alert);
    updated.history.push({
      from: alert.state,
      to: to,
      at: nowIso(),
      by: by.trim(),
      note: typeof note === "string" ? note : ""
    });
    updated.state = to;
    updated.updatedAt = nowIso();
    updated.lastUpdated = updated.updatedAt;
    return saveAlert(updated);
  }

  // Assignment only when the angel's domains include the alert's
  // domain. Records the assignment on both records and appends a
  // history entry to the alert (state unchanged).
  function assignAlert(alertId, angelId, by, note) {
    if (typeof alertId !== "string" || typeof angelId !== "string") {
      throw new Error("assignAlert requires an alert id and an angel id.");
    }
    var alert = getAlert(alertId);
    if (!alert) {
      throw new Error("No alert with id " + alertId + ".");
    }
    var angel = getAngel(angelId);
    if (!angel) {
      throw new Error("No angel with id " + angelId + ".");
    }
    if (angel.state !== "ACTIVE") {
      throw new Error("Angel " + angelId + " is not ACTIVE and cannot take an assignment.");
    }
    if (angel.domains.indexOf(alert.domain) === -1) {
      throw new Error("Angel " + angelId + " does not cover domain " + alert.domain + " and cannot be assigned alert " + alertId + ".");
    }
    var all = loadAll();
    for (var i = 0; i < all.angels.length; i++) {
      if (all.angels[i] && all.angels[i].id === angelId) {
        if (all.angels[i].assignedAlertIds.indexOf(alertId) === -1) {
          all.angels[i].assignedAlertIds.push(alertId);
        }
        break;
      }
    }
    var updated = clone(alert);
    updated.assignedAngelId = angelId;
    updated.assignedWorkerId = angelId;
    updated.history.push({
      from: alert.state,
      to: alert.state,
      at: nowIso(),
      by: isNonEmptyString(by) ? by.trim() : "system",
      note: "Assigned to angel " + angelId + (typeof note === "string" && note ? ": " + note : ".")
    });
    updated.updatedAt = nowIso();
    updated.lastUpdated = updated.updatedAt;
    var errors = validateAlert(updated);
    if (errors.length) {
      throw new Error("Invalid alert: " + errors.join(" "));
    }
    for (var j = 0; j < all.alerts.length; j++) {
      if (all.alerts[j] && all.alerts[j].id === alertId) {
        all.alerts[j] = updated;
        break;
      }
    }
    persistAll(all);
    return clone(updated);
  }

  // Raises severity only, with a recorded reason. Same-or-lower
  // severity is rejected. The change is recorded as a history entry
  // on the alert (state unchanged) so the reason is never lost.
  function escalateSeverity(alertId, toSeverity, reason, by) {
    if (typeof alertId !== "string") {
      throw new Error("escalateSeverity requires an alert id.");
    }
    if (SEVERITIES.indexOf(toSeverity) === -1) {
      throw new Error("Unknown severity: " + toSeverity + ".");
    }
    if (!isNonEmptyString(reason)) {
      throw new Error("escalateSeverity requires a recorded reason.");
    }
    var alert = getAlert(alertId);
    if (!alert) {
      throw new Error("No alert with id " + alertId + ".");
    }
    var fromRank = SEVERITY_RANK[alert.severity];
    var toRank = SEVERITY_RANK[toSeverity];
    if (toRank === undefined) {
      throw new Error("Cannot escalate to UNKNOWN severity.");
    }
    if (fromRank !== undefined && toRank <= fromRank) {
      throw new Error("escalateSeverity only raises severity: " + alert.severity + " -> " + toSeverity + " is not an escalation.");
    }
    var updated = clone(alert);
    updated.history.push({
      from: alert.state,
      to: alert.state,
      at: nowIso(),
      by: isNonEmptyString(by) ? by.trim() : "system",
      note: "Severity escalated " + alert.severity + " -> " + toSeverity + ". Reason: " + reason.trim()
    });
    updated.severity = toSeverity;
    updated.updatedAt = nowIso();
    updated.lastUpdated = updated.updatedAt;
    return saveAlert(updated);
  }

  // ---- Mitigation, resolution, STAR notification ------------------------

  // Records mitigation work on an alert. Appends a history entry and
  // updates lastUpdated. State is unchanged: mitigation is recorded
  // work, not a lifecycle transition.
  function recordMitigation(alertId, text, by) {
    if (typeof alertId !== "string") {
      throw new Error("recordMitigation requires an alert id.");
    }
    if (!isNonEmptyString(text)) {
      throw new Error("recordMitigation requires mitigation text.");
    }
    if (!isNonEmptyString(by)) {
      throw new Error("recordMitigation requires an actor (by).");
    }
    var alert = getAlert(alertId);
    if (!alert) {
      throw new Error("No alert with id " + alertId + ".");
    }
    var updated = clone(alert);
    var stamp = nowIso();
    updated.mitigation = { text: text.trim(), by: by.trim(), at: stamp };
    updated.history.push({
      from: alert.state,
      to: alert.state,
      at: stamp,
      by: by.trim(),
      note: "Mitigation recorded: " + text.trim()
    });
    updated.updatedAt = stamp;
    updated.lastUpdated = stamp;
    return saveAlert(updated);
  }

  function recordResolution(alertId, text, by) {
    if (typeof alertId !== "string") {
      throw new Error("recordResolution requires an alert id.");
    }
    if (!isNonEmptyString(text)) {
      throw new Error("recordResolution requires resolution text.");
    }
    if (!isNonEmptyString(by)) {
      throw new Error("recordResolution requires an actor (by).");
    }
    var alert = getAlert(alertId);
    if (!alert) {
      throw new Error("No alert with id " + alertId + ".");
    }
    var updated = clone(alert);
    var stamp = nowIso();
    updated.resolution = { text: text.trim(), by: by.trim(), at: stamp };
    updated.history.push({
      from: alert.state,
      to: alert.state,
      at: stamp,
      by: by.trim(),
      note: "Resolution recorded: " + text.trim()
    });
    updated.updatedAt = stamp;
    updated.lastUpdated = stamp;
    return saveAlert(updated);
  }

  // Records that STAR was notified about an alert. This is a RECORD
  // ({notifiedAt, summary}) only: this module never sends a live
  // notification. The summary says what STAR was told, not that a
  // delivery was confirmed.
  function notifyStar(alertId, summary, by) {
    if (typeof alertId !== "string") {
      throw new Error("notifyStar requires an alert id.");
    }
    if (!isNonEmptyString(summary)) {
      throw new Error("notifyStar requires a summary of what STAR was told.");
    }
    if (!isNonEmptyString(by)) {
      throw new Error("notifyStar requires an actor (by).");
    }
    var alert = getAlert(alertId);
    if (!alert) {
      throw new Error("No alert with id " + alertId + ".");
    }
    var updated = clone(alert);
    var stamp = nowIso();
    updated.starNotification = { notifiedAt: stamp, summary: summary.trim() };
    updated.history.push({
      from: alert.state,
      to: alert.state,
      at: stamp,
      by: by.trim(),
      note: "STAR notification recorded: " + summary.trim()
    });
    updated.updatedAt = stamp;
    updated.lastUpdated = stamp;
    return saveAlert(updated);
  }

  // ---- STAR-watching (reportSignal / watchStarAction) -------------------

  // Implements the spec flow as RECORDS, never as live actions:
  //   SIGNAL -> ANGEL WORKER -> VERIFY EVIDENCE -> CLASSIFY ->
  //   SEVERITY -> SECURITY DOMAIN -> STAR -> DANIEL NOTIFICATION
  // It creates an alert in DETECTED with the classification fields
  // set from the signal and a flowTrail array recording each step
  // taken. No visible alert is created without actual evidence:
  // evidence with at least one entry is required, exactly as for
  // createAlert. The STAR and DANIEL NOTIFICATION steps are records
  // that the routing was recorded — no live notification is sent.
  function reportSignal(signal) {
    var data = signal && typeof signal === "object" ? signal : {};
    if (!isNonEmptyString(data.source)) {
      throw new Error("reportSignal requires a source (provenance).");
    }
    if (!isNonEmptyString(data.affectedSystem)) {
      throw new Error("reportSignal requires an affectedSystem.");
    }
    var evidenceErrors = validateEvidence(data.evidence);
    if (evidenceErrors.length) {
      throw new Error("Invalid signal: " + evidenceErrors.join(" "));
    }
    var alertClass;
    var classNote;
    if (data.alertClass !== undefined && data.alertClass !== null) {
      if (!isKnownAlertClass(data.alertClass)) {
        throw new Error("Unknown alertClass: " + data.alertClass + ".");
      }
      // An alias name resolves to its canonical class and the
      // canonical id is what gets stored on the alert.
      alertClass = canonicalAlertClassId(data.alertClass);
      classNote = alertClass !== data.alertClass
        ? "alertClass given in the signal as alias " + data.alertClass + "; stored as canonical " + alertClass + "."
        : "alertClass given in the signal.";
    } else {
      alertClass = resolveAlertClassFromEvidence(data.evidence);
      classNote = alertClass === "UNKNOWN_CLASS"
        ? "alertClass could not be resolved from the evidence; recorded as UNKNOWN_CLASS."
        : "alertClass resolved from the evidence.";
    }
    var classEntry = getAlertClass(alertClass);
    var domain = classEntry ? classEntry.defaultDomain : "SYSTEM_PROVIDER_INFRASTRUCTURE";
    var domainNote = classEntry
      ? "domain taken from the alert-class default."
      : "domain defaulted to SYSTEM_PROVIDER_INFRASTRUCTURE because the class could not be resolved; reclassification required.";
    var severity = data.severity !== undefined ? data.severity :
      (classEntry ? classEntry.defaultSeverity : "UNKNOWN");
    if (SEVERITIES.indexOf(severity) === -1) {
      throw new Error("severity must be one of: " + SEVERITIES.join(", ") + ".");
    }
    var stamp = nowIso();
    var title = "Signal [" + alertClass + "] on " + data.affectedSystem.trim();
    var description = isNonEmptyString(data.note) ? data.note.trim() :
      "Signal received from " + data.source.trim() + " affecting " +
      data.affectedSystem.trim() + "; class " + alertClass + ". " + classNote;
    var alert = createAlert({
      domain: domain,
      title: title,
      description: description,
      severity: severity,
      alertClass: alertClass,
      affectedSystem: data.affectedSystem.trim(),
      source: data.source.trim(),
      detectedAt: stamp,
      evidence: clone(data.evidence)
    });
    var updated = clone(alert);
    var evidenceCount = data.evidence.length;
    updated.flowTrail = [
      { step: "SIGNAL_RECEIVED", at: stamp, detail: "Signal received from " + data.source.trim() + " affecting " + data.affectedSystem.trim() + "." },
      { step: "ANGEL_WORKER", at: stamp, detail: "Signal accepted by Angel Security; no worker is assigned here — no worker count or identity is fabricated, assignment happens through assignAlert." },
      { step: "VERIFY_EVIDENCE", at: stamp, detail: "Evidence present (" + evidenceCount + " " + (evidenceCount === 1 ? "entry" : "entries") + "); verification is still pending — the alert stays DETECTED and is never auto-confirmed." },
      { step: "CLASSIFY", at: stamp, detail: "Classified as " + alertClass + ". " + classNote },
      { step: "SEVERITY", at: stamp, detail: "Severity set to " + severity + (data.severity !== undefined ? " (given in the signal)." : " (class default).") },
      { step: "SECURITY_DOMAIN", at: stamp, detail: "Domain set to " + domain + ". " + domainNote },
      { step: "STAR", at: stamp, detail: "Routed to STAR: notification recorded on the alert (starNotification). This is a record only — no live send happens in this build." },
      { step: "DANIEL_NOTIFICATION", at: stamp, detail: "Owner notification recorded for STAR to deliver; no live notification is sent by this module." }
    ];
    updated.starNotification = {
      notifiedAt: stamp,
      summary: "Signal [" + alertClass + "] on " + data.affectedSystem.trim() +
        " routed to STAR for owner attention. Recorded only — no live send."
    };
    updated.lastUpdated = stamp;
    updated.updatedAt = stamp;
    return saveAlert(updated);
  }

  // STAR-watching rules, in priority order: the first matching rule
  // decides the class. The actor is NEVER part of the decision.
  var STAR_WATCH_RULES = [
    { alertClass: "AUTHORITY_ESCALATION", severity: "CRITICAL", label: "privilege escalation / mandate violation", patterns: [/privilege.{0,30}escalat/, /escalat.{0,30}privilege/, /grant.{0,30}(admin|owner|root)/, /assume owner/, /become owner/, /owner authority/, /elevate.{0,30}(privilege|permission|role|authority)/, /mandate.{0,30}(violat|breach|exceed)/, /exceed.{0,30}mandate/] },
    { alertClass: "PERMISSION_VIOLATION", severity: "CRITICAL", label: "permission violation", patterns: [/permission.{0,30}(violation|bypass|grant)/, /grant.{0,30}permission/, /bypass.{0,30}(permission|authori[sz]ation)/, /unauthori[sz]ed (access|permission|grant|action)/] },
    { alertClass: "WALLET_ANOMALY", severity: "HIGH", label: "abnormal wallet behaviour", patterns: [/wallet.{0,40}(abnormal|unexpected|drain|unauthori[sz]ed|transfer|approval)/, /drainer/] },
    { alertClass: "LOSS_THRESHOLD", severity: "HIGH", label: "loss boundary breach", patterns: [/loss.{0,30}(threshold|exceed|limit|breach)/] },
    { alertClass: "COST_OVERRUN", severity: "CAUTION", label: "cost boundary breach", patterns: [/cost.{0,30}(overrun|exceed|limit|breach)/, /spend.{0,30}exceed/] },
    { alertClass: "PRICE_CONFLICT", severity: "HIGH", label: "conflicting provider data", patterns: [/price conflict/, /conflicting (price|provider)/, /provider.{0,30}(conflict|mismatch|disagree)/, /data (conflict|mismatch)/] },
    { alertClass: "MODEL_FAILURE", severity: "HIGH", label: "suspicious model tool request", patterns: [/suspicious model/, /model.{0,30}(tool|fail|error)/] },
    { alertClass: "TOOL_FAILURE", severity: "CAUTION", label: "suspicious tool request", patterns: [/unapproved tool/, /unknown tool/, /tool.{0,30}(request|fail|error)/] }
  ];

  // Evaluates one STAR action against the same suspicion rules that
  // apply to any other actor. THE ACTOR BEING STAR NEVER CLEARS A
  // FINDING: watchStarAction does not trust STAR, it watches STAR —
  // Angels watch STAR too (spec §44). The actor value is recorded
  // for provenance only and plays no part in the evaluation; an
  // action from any other actor is judged by the identical rules.
  // A finding is routed through reportSignal (which requires
  // evidence, so the STAR action itself becomes the evidence). A
  // clean action returns { finding: false }.
  function watchStarAction(action) {
    if (!action || typeof action !== "object") {
      throw new Error("watchStarAction requires an action object.");
    }
    if (!isNonEmptyString(action.kind)) {
      throw new Error("watchStarAction requires an action kind.");
    }
    var actor = isNonEmptyString(action.actor) ? action.actor.trim() : "STAR";
    var detail = typeof action.detail === "string" ? action.detail : "";
    var at = isNonEmptyString(action.at) ? action.at : nowIso();
    var evaluatedAt = nowIso();
    var text = (action.kind + " " + detail).toLowerCase()
      .replace(/[_-]+/g, " ").replace(/\s+/g, " ");
    for (var i = 0; i < STAR_WATCH_RULES.length; i++) {
      var rule = STAR_WATCH_RULES[i];
      for (var j = 0; j < rule.patterns.length; j++) {
        if (rule.patterns[j].test(text)) {
          var reason = actor + " action '" + action.kind + "' flagged: " + rule.label + ".";
          var alert = reportSignal({
            source: "watchStarAction: " + actor + " action " + action.kind,
            evidence: [{
              kind: "STAR_ACTION",
              reference: actor + " action '" + action.kind + "'" +
                (detail ? ": " + detail.slice(0, 500) : ""),
              recordedAt: at
            }],
            affectedSystem: "star",
            alertClass: rule.alertClass,
            severity: rule.severity,
            note: reason + (detail ? " Detail: " + detail.slice(0, 500) : "")
          });
          return {
            finding: true,
            actor: actor,
            kind: action.kind,
            alertClass: rule.alertClass,
            severity: rule.severity,
            alertId: alert.id,
            alert: clone(alert),
            reason: reason,
            evaluatedAt: evaluatedAt
          };
        }
      }
    }
    return { finding: false, actor: actor, kind: action.kind, evaluatedAt: evaluatedAt };
  }

  // ---- Authorized remediation (records only) ----------------------------

  // Each remediation requires an explicit authorization record
  // {authorizedBy, authorizedAt, reason} and is appended to a bounded
  // log (max 200, newest first). The return value is a RECORD of the
  // remediation decision ({remediationId, action, target, state:
  // "RECORDED"}) — it does NOT itself perform the underlying system
  // change; the owning system executes it. Remediation NEVER
  // performs financial transactions: a request naming a financial
  // action is rejected with FINANCIAL_REMEDIATION_FORBIDDEN.
  function recordRemediation(action, target, input) {
    var data = input && typeof input === "object" ? input : {};
    if (!isNonEmptyString(target)) {
      throw new Error(action + " requires a target.");
    }
    if (!isNonEmptyString(data.reason)) {
      throw new Error(action + " requires a reason (part of the authorization record).");
    }
    if (!isNonEmptyString(data.authorizedBy)) {
      throw new Error(action + " requires authorizedBy: remediation needs explicit authorization.");
    }
    var scanned = target + " " + data.reason;
    if (FINANCIAL_RE.test(scanned)) {
      throw new Error("FINANCIAL_REMEDIATION_FORBIDDEN: remediation never performs financial transactions; the request names a financial action.");
    }
    var stamp = nowIso();
    var record = {
      remediationId: newId("remediation"),
      action: action,
      target: target.trim(),
      actor: data.authorizedBy.trim(),
      authorizedBy: data.authorizedBy.trim(),
      authorizedAt: isNonEmptyString(data.authorizedAt) ? data.authorizedAt : stamp,
      reason: data.reason.trim(),
      state: "RECORDED",
      at: stamp,
      note: "Recorded only — the owning system executes this remediation; this module performs no system change and no financial transaction."
    };
    var all = loadAll();
    all.remediations.unshift(record);
    persistAll(all);
    return clone(record);
  }

  function pauseCapability(input) {
    var data = input && typeof input === "object" ? input : {};
    return recordRemediation("PAUSE_CAPABILITY", data.capability, data);
  }

  function quarantineData(input) {
    var data = input && typeof input === "object" ? input : {};
    return recordRemediation("QUARANTINE_DATA", data.dataRef, data);
  }

  function disableProvider(input) {
    var data = input && typeof input === "object" ? input : {};
    return recordRemediation("DISABLE_PROVIDER", data.providerId, data);
  }

  function markStale(input) {
    var data = input && typeof input === "object" ? input : {};
    return recordRemediation("MARK_STALE", data.recordRef, data);
  }

  function listRemediations() {
    return loadAll().remediations.slice(0, MAX_REMEDIATIONS).map(clone);
  }

  // ---- Security holds (records only) ------------------------------------

  // A security hold is a RECORD that activity on a target (a wallet,
  // asset, account, or address) is paused pending review. The hold
  // itself blocks nothing in this module: the owning module enforces
  // the block by consulting the hold list (listSecurityHolds /
  // getSecurityHold). Entering a hold also records a SECURITY_HOLD
  // alert (class SECURITY_HOLD, domain FINANCIAL_WALLET by default)
  // with the same provenance, so the hold is visible in the alert
  // stream as well as the hold list.
  function enterSecurityHold(input) {
    var data = input && typeof input === "object" ? input : {};
    var reasons = [];
    if (!isNonEmptyString(data.targetType)) {
      reasons.push("targetType is required and must be a non-empty string (for example \"wallet\", \"asset\", \"account\", \"address\").");
    }
    if (!isNonEmptyString(data.targetId)) {
      reasons.push("targetId is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(data.reason)) {
      reasons.push("reason is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(data.authorizedBy)) {
      reasons.push("authorizedBy is required and must be a non-empty string (provenance).");
    }
    var secretField = findSecretField([
      ["targetType", data.targetType],
      ["targetId", data.targetId],
      ["reason", data.reason],
      ["authorizedBy", data.authorizedBy]
    ]);
    if (secretField) {
      reasons.push("Field " + secretField + " looks like a secret or credential and must not be stored in a security hold.");
    }
    if (reasons.length) {
      throw new Error("Invalid security hold: " + reasons.join(" "));
    }
    var stamp = nowIso();
    var alert = createAlert({
      alertClass: "SECURITY_HOLD",
      title: "Security hold on " + data.targetType.trim() + " " + data.targetId.trim(),
      description: "Security hold placed on " + data.targetType.trim() + " " + data.targetId.trim() + ". Reason: " + data.reason.trim() + " This is a record only — the hold itself blocks nothing; the owning module enforces it.",
      affectedSystem: data.targetType.trim(),
      source: "enterSecurityHold: " + data.authorizedBy.trim(),
      detectedAt: stamp,
      evidence: [{
        kind: "SECURITY_HOLD",
        reference: "Hold placed on " + data.targetType.trim() + " " + data.targetId.trim() + ": " + data.reason.trim(),
        recordedAt: stamp
      }]
    });
    var hold = {
      holdId: newId("hold"),
      targetType: data.targetType.trim(),
      targetId: data.targetId.trim(),
      reason: data.reason.trim(),
      authorizedBy: data.authorizedBy.trim(),
      state: "ACTIVE",
      enteredAt: stamp,
      alertId: alert.id,
      resolvedBy: null,
      resolvedAt: null,
      note: null,
      history: [{
        at: stamp,
        by: data.authorizedBy.trim(),
        action: "ENTERED",
        note: data.reason.trim()
      }]
    };
    var all = loadAll();
    all.holds.unshift(hold);
    persistAll(all);
    return {
      holdId: hold.holdId,
      targetType: hold.targetType,
      targetId: hold.targetId,
      state: hold.state,
      enteredAt: hold.enteredAt
    };
  }

  // Resolving a hold REQUIRES a resolution record ({resolvedBy,
  // note}): a hold is never silently lifted. The hold moves to
  // RESOLVED with an audit entry, and the linked SECURITY_HOLD alert
  // gets its resolution recorded (state unchanged — resolution is
  // recorded work, not a lifecycle transition). Resolving an already
  // resolved hold, or an unknown hold, throws and nothing is written.
  function resolveSecurityHold(holdId, input) {
    if (typeof holdId !== "string") {
      throw new Error("resolveSecurityHold requires a hold id.");
    }
    var data = input && typeof input === "object" ? input : {};
    if (!isNonEmptyString(data.resolvedBy)) {
      throw new Error("resolveSecurityHold requires resolvedBy: a resolution record is required to lift a hold.");
    }
    if (!isNonEmptyString(data.note)) {
      throw new Error("resolveSecurityHold requires a note: a resolution record is required to lift a hold.");
    }
    var all = loadAll();
    var hold = null;
    var index = -1;
    for (var i = 0; i < all.holds.length; i++) {
      if (all.holds[i] && all.holds[i].holdId === holdId) {
        hold = clone(all.holds[i]);
        index = i;
        break;
      }
    }
    if (!hold) {
      throw new Error("No security hold with id " + holdId + ".");
    }
    if (hold.state !== "ACTIVE") {
      throw new Error("Security hold " + holdId + " is " + hold.state + " and cannot be resolved.");
    }
    var stamp = nowIso();
    hold.state = "RESOLVED";
    hold.resolvedBy = data.resolvedBy.trim();
    hold.resolvedAt = stamp;
    hold.note = data.note.trim();
    hold.history.push({
      at: stamp,
      by: data.resolvedBy.trim(),
      action: "RESOLVED",
      note: data.note.trim()
    });
    all.holds[index] = hold;
    persistAll(all);
    if (typeof hold.alertId === "string" && getAlert(hold.alertId)) {
      recordResolution(hold.alertId, data.note.trim(), data.resolvedBy.trim());
    }
    return clone(hold);
  }

  // The hold list the owning module consults to enforce a block.
  // Newest first, bounded at MAX_HOLDS. Optional filter: state,
  // targetType, targetId.
  function listSecurityHolds(filter) {
    var holds = loadAll().holds.slice().sort(function (a, b) {
      var ta = a && a.enteredAt ? String(a.enteredAt) : "";
      var tb = b && b.enteredAt ? String(b.enteredAt) : "";
      if (tb < ta) return -1;
      if (tb > ta) return 1;
      return 0;
    }).slice(0, MAX_HOLDS);
    if (!filter || typeof filter !== "object") return holds.map(clone);
    return holds.filter(function (h) {
      if (filter.state !== undefined && h.state !== filter.state) return false;
      if (filter.targetType !== undefined && h.targetType !== filter.targetType) return false;
      if (filter.targetId !== undefined && h.targetId !== filter.targetId) return false;
      return true;
    }).map(clone);
  }

  function getSecurityHold(holdId) {
    if (typeof holdId !== "string") return null;
    var holds = loadAll().holds;
    for (var i = 0; i < holds.length; i++) {
      if (holds[i] && holds[i].holdId === holdId) return clone(holds[i]);
    }
    return null;
  }

  // ---- Summary (honest counts only) -------------------------------------

  // Counts are real counts of stored alert records only. An alert
  // counts as confirmed only once it has walked the lifecycle to
  // CONFIRMED (or beyond) through a recorded transition — a DETECTED
  // or VERIFYING alert is never presented as confirmed. An empty
  // store reports state NO_ALERTS, never a fabricated "all clear"
  // from live data (there is no live data in this build).
  function summary() {
    var alerts = loadAll().alerts;
    var byState = {};
    var bySeverity = {};
    var byDomain = {};
    var i;
    for (i = 0; i < ALERT_STATES.length; i++) byState[ALERT_STATES[i]] = 0;
    for (i = 0; i < SEVERITIES.length; i++) bySeverity[SEVERITIES[i]] = 0;
    for (i = 0; i < DOMAINS.length; i++) byDomain[DOMAINS[i].id] = 0;
    var confirmed = 0;
    for (i = 0; i < alerts.length; i++) {
      var a = alerts[i];
      if (!a) continue;
      if (byState.hasOwnProperty(a.state)) byState[a.state] += 1;
      if (bySeverity.hasOwnProperty(a.severity)) bySeverity[a.severity] += 1;
      if (byDomain.hasOwnProperty(a.domain)) byDomain[a.domain] += 1;
      if (a.state !== "DETECTED" && a.state !== "VERIFYING") confirmed += 1;
    }
    return {
      count: alerts.length,
      state: alerts.length === 0 ? "NO_ALERTS" : "ALERTS_PRESENT",
      byState: byState,
      bySeverity: bySeverity,
      byDomain: byDomain,
      confirmedCount: confirmed,
      unconfirmedCount: alerts.length - confirmed,
      angels: loadAll().angels.length,
      note: alerts.length === 0
        ? "No alerts recorded — no live alert feed is connected, so no alert is claimed."
        : confirmed + " of " + alerts.length + " alert(s) reached CONFIRMED or beyond through a recorded transition; the rest are unconfirmed."
    };
  }

  global.AngelSecurity = {
    DOMAINS: listDomains(),
    DOMAIN_IDS: DOMAINS.map(function (d) { return d.id; }),
    ALERT_STATES: ALERT_STATES.slice(),
    ALERT_CLASSES: listAlertClasses(),
    ALERT_CLASS_IDS: ALERT_CLASSES.map(function (c) { return c.id; }),
    SEVERITIES: SEVERITIES.slice(),
    ANGEL_STATES: ANGEL_STATES.slice(),
    STORE_KEY: STORE_KEY,
    MAX_ALERTS: MAX_ALERTS,
    MAX_ANGELS: MAX_ANGELS,
    MAX_REMEDIATIONS: MAX_REMEDIATIONS,
    MAX_HOLDS: MAX_HOLDS,
    listDomains: listDomains,
    getDomain: getDomain,
    listAlertClasses: listAlertClasses,
    getAlertClass: getAlertClass,
    resolveAlertClass: resolveAlertClass,
    createAngel: createAngel,
    validateAngel: validateAngel,
    listAngels: listAngels,
    getAngel: getAngel,
    createAlert: createAlert,
    validateAlert: validateAlert,
    listAlerts: listAlerts,
    getAlert: getAlert,
    canTransitionAlert: canTransitionAlert,
    transitionAlert: transitionAlert,
    assignAlert: assignAlert,
    escalateSeverity: escalateSeverity,
    recordMitigation: recordMitigation,
    recordResolution: recordResolution,
    notifyStar: notifyStar,
    reportSignal: reportSignal,
    watchStarAction: watchStarAction,
    pauseCapability: pauseCapability,
    quarantineData: quarantineData,
    disableProvider: disableProvider,
    markStale: markStale,
    listRemediations: listRemediations,
    enterSecurityHold: enterSecurityHold,
    resolveSecurityHold: resolveSecurityHold,
    listSecurityHolds: listSecurityHolds,
    getSecurityHold: getSecurityHold,
    summary: summary,
    canBeTransactional: canBeTransactional
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
