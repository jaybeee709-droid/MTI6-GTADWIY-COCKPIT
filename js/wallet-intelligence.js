/* MTI6-GTADWIY-COCKPIT — Wallet Intelligence foundation (continuous campaign)
 *
 * Standards-first wallet intelligence, built FRESH from the current
 * codebase. No connection code, no live provider calls, no address
 * fetching, no private keys, no seed phrases, no secrets anywhere.
 * This file records what is KNOWN about wallets — discovery,
 * connection state, and explicitly granted capabilities — and nothing
 * else. It never executes a transaction: execution stays UNAVAILABLE
 * in this build, whatever state a wallet record carries.
 *
 * The five states are strictly distinct, and an earlier state NEVER
 * implies a later one:
 *   DISCOVERED           — a wallet was detected / announced. No
 *                          session, no address, no signing.
 *   CONNECTED            — a session exists. No address shared yet,
 *                          no signing permission.
 *   ACCOUNT_ACCESSED     — an address was shared with the cockpit.
 *                          Still no signing permission. (The address
 *                          itself is NOT stored here; only the fact
 *                          that one was shared, and when.)
 *   SIGNING              — signing capability was explicitly granted
 *                          (grant record required). Still no
 *                          transaction execution.
 *   TRANSACTION_APPROVED — one specific transaction was approved
 *                          (approval reference required). Approval is
 *                          not execution: canExecuteTransaction() is
 *                          always false and requestTransaction()
 *                          always returns UNAVAILABLE.
 *   DISCONNECTED         — the session ended. A wallet may be
 *                          re-discovered from here, and only from here.
 *
 * Capabilities default to false. A signing-related capability
 * (signMessage, signTransaction, sendTransaction) is enabled only by
 * an explicit grant record { grantedBy, grantedAt, scope } and is
 * never inferred from state, from another capability, or from a
 * discovery method. A capability is only EFFECTIVE at or above its
 * minimum state (hasCapability), so a granted signing capability
 * still reports false while the wallet is merely CONNECTED.
 *
 * Reuses, never reinvents:
 *   - Truth vocabulary (Truth.TRUTH_STATES) for verificationStatus.
 *   - StarCommand.PERMISSIONS for grant permission labels
 *     (APPROVAL_REQUIRED for signing grants, READ_ONLY / ASSISTED
 *     otherwise). A permission label is a label, not an execution
 *     capability: StarCommand.hasTransactionalCapability() is still
 *     always false, and so is this module's canExecuteTransaction().
 *   - The secret-rejection patterns of BotOpsModel / KnowledgeModel
 *     (secret-looking key names and secret-looking values are both
 *     rejected by validateWallet).
 *   - The strict transition-allowlist + bounded audit-log style of
 *     BotOpsModel / StarCommand (audit max 200 entries).
 *
 * Depends on nothing at load time. Truth and StarCommand are consulted
 * through typeof guards with identical fallbacks when absent, so this
 * file loads in a bare vm context with no DOM and no network.
 * Load order when wiring: js/truth.js, js/star-command.js, then
 * js/wallet-intelligence.js.
 *
 *   WalletIntelligence.createWallet(input)          -> record (DISCOVERED)
 *   WalletIntelligence.validateWallet(record)       -> error strings []
 *   WalletIntelligence.addWallet(input)             -> stored record
 *   WalletIntelligence.getWallet(id) / listWallets()
 *   WalletIntelligence.removeWallet(id)
 *   WalletIntelligence.canTransition(from, to)
 *   WalletIntelligence.transitionWallet(id, to, note)
 *   WalletIntelligence.grantCapability(id, cap, grant)
 *   WalletIntelligence.revokeCapability(id, cap)
 *   WalletIntelligence.hasCapability(id, cap)
 *   WalletIntelligence.describeWallet(id)
 *   WalletIntelligence.summary()
 *   WalletIntelligence.canExecuteTransaction()      -> always false
 *   WalletIntelligence.requestTransaction(id, note) -> UNAVAILABLE, never runs
 *   WalletIntelligence.getAuditLog() / clearAuditLog()
 *
 * Lifecycle + capabilities extension (Wallet spec W1):
 *   WalletIntelligence.LIFECYCLE_STATES (15, closed set)
 *   WalletIntelligence.lifecycleStates()              -> the 15 states []
 *   WalletIntelligence.canTransitionLifecycle(from, to)
 *   WalletIntelligence.transitionWallet(id, to, {by, note, resolution})
 *     also still accepts the legacy (id, to, note-string) form, and the
 *     old five states keep working: they map onto the lifecycle
 *     (DISCOVERED->DISCOVERED, CONNECTED->CONNECTED,
 *     ACCOUNT_ACCESSED->CONNECTED, SIGNING->CONNECTED,
 *     TRANSACTION_APPROVED->CONNECTED, DISCONNECTED->DISCONNECTED).
 *     SECURITY_HOLD is reachable only from CONNECTED / READ_ONLY /
 *     WATCH_ONLY and exits only with an owner-approved resolution
 *     record { approvedBy, approvedAt, reason }. DISABLED is terminal
 *     unless re-enabled by an owner record of the same shape.
 *   WalletIntelligence.EXTENDED_CAPABILITIES (16, closed set)
 *   WalletIntelligence.setCapability(id, cap, granted, source[, grant])
 *     source is required for a grant; a capability with no source is
 *     UNKNOWN, never granted. CAN_EXECUTE is always false.
 *     CAN_SIGN_MESSAGE / CAN_SIGN_TRANSACTION / CAN_BROADCAST need an
 *     explicit grant record { grantedBy, grantedAt }. A WATCH_ONLY
 *     wallet can never hold signing / broadcast / execution caps.
 *   WalletIntelligence.getCapability(id, cap) / listCapabilities(id)
 *   WalletIntelligence.setWalletMode(id, mode)  (WATCH_ONLY | READ_ONLY |
 *     FULL | UNKNOWN); setGroupLabel(id, label) (8 labels, organisational
 *     only — never changes capabilities)
 *   WalletIntelligence.addAccount(id, account) / listAccounts(id) /
 *     getAccount(accountId) / validateAccount(account)
 *     Accounts never store private keys; a secret-looking publicAddress
 *     is rejected, and status VERIFIED requires a verifiedSource.
 *   WalletIntelligence.truncateAddress(address) -> first 6 + last 4
 *   WalletIntelligence.fullAddress(address, { userConfirmed: true })
 *     returns the full address only with the explicit flag, else truncated.
 *     The audit log carries truncated addresses only (notes are scrubbed).
 *
 * Freshness / resilience + RPC failover + error states (Wallet spec W13):
 *   WalletIntelligence.FRESHNESS_STATES ("FRESH" | "AGING" | "STALE" |
 *     "UNKNOWN"; FRESH ≤ 5 min, AGING ≤ 60 min, STALE beyond; no
 *     observedAt → UNKNOWN — never claimed FRESH, never "LIVE")
 *   WalletIntelligence.stampFreshness({ observedAt, receivedAt?,
 *     source, verification }, nowMs?) -> freshness metadata record
 *     { observedAt, receivedAt, cacheAge, source, verification,
 *       freshnessState }
 *   WalletIntelligence.freshnessOf(metadata, nowMs?) -> the state
 *   WalletIntelligence.withFreshness(data, freshnessInput, nowMs?)
 *     -> a copy of a balance / position snapshot carrying freshnessMeta
 *   WalletIntelligence.markStale(walletId, { reason, by }) — marks the
 *     wallet's data STALE with an audit entry (lifecycle untouched)
 *   WalletIntelligence.resolveRpcProvider(walletId, providers,
 *     { allowStaleCache?, health? }) — pure ordering; DELEGATES to
 *     NetworkIntelligence.resolveProvider when it is loaded, otherwise
 *     runs the local implementation with identical semantics
 *   WalletIntelligence.ERROR_STATES (12, closed set) /
 *     errorStates() / describeError(code, { walletId?, accountId?,
 *     networkId?, detail? }) -> structured error record (never a
 *     thrown exception for an expected state, never a zero substituted)
 *   WalletIntelligence.recordPriceConflict({ walletId?, assetId,
 *     prices, source }) / getPriceConflicts(walletId?) — a conflict
 *     record carries the conflicting prices and NO chosen value
 *   WalletIntelligence.recordProviderHealth(walletId, providerId,
 *     { health, checkedAt, source }) / providerHealth(walletId,
 *     providerId) / listProviderHealth(walletId) — checkedAt required;
 *     a record without checkedAt is UNKNOWN
 */
(function (global) {
  "use strict";

  // ---- Vocabulary (reused, with identical fallbacks) ---------------------

  var FALLBACK_TRUTH_STATES = ["NOT_CONNECTED", "UNKNOWN", "UNVERIFIED",
    "STALE", "DISABLED", "UNAVAILABLE", "VERIFIED", "LIVE"];

  var FALLBACK_PERMISSIONS = {
    INFORMATIONAL: "INFORMATIONAL",
    NAVIGATIONAL: "NAVIGATIONAL",
    READ_ONLY: "READ_ONLY",
    ASSISTED: "ASSISTED",
    APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
    TRANSACTIONAL: "TRANSACTIONAL",
    UNAVAILABLE: "UNAVAILABLE"
  };

  function truthStates() {
    if (global.Truth && Array.isArray(global.Truth.TRUTH_STATES) &&
        global.Truth.TRUTH_STATES.length) {
      return global.Truth.TRUTH_STATES.slice();
    }
    return FALLBACK_TRUTH_STATES.slice();
  }

  function permissions() {
    if (global.StarCommand && global.StarCommand.PERMISSIONS) {
      return global.StarCommand.PERMISSIONS;
    }
    return FALLBACK_PERMISSIONS;
  }

  // ---- States, capabilities, standards -----------------------------------

  var WALLET_STATES = ["DISCOVERED", "CONNECTED", "ACCOUNT_ACCESSED",
    "SIGNING", "TRANSACTION_APPROVED", "DISCONNECTED"];

  // Linear order for "at least this state" checks. DISCONNECTED sits
  // outside the progression at 0: it is a reset, not a step forward.
  var STATE_ORDER = {
    DISCONNECTED: 0,
    DISCOVERED: 1,
    CONNECTED: 2,
    ACCOUNT_ACCESSED: 3,
    SIGNING: 4,
    TRANSACTION_APPROVED: 5
  };

  // Strict allowlist. No step may be skipped: DISCOVERED -> SIGNING,
  // CONNECTED -> TRANSACTION_APPROVED, and DISCONNECTED -> CONNECTED
  // are all illegal. TRANSACTION_APPROVED may return to SIGNING (the
  // wallet is still signing-capable after the approved transaction)
  // or disconnect; it may not jump anywhere else.
  var TRANSITIONS = {
    DISCOVERED: ["CONNECTED", "DISCONNECTED"],
    CONNECTED: ["ACCOUNT_ACCESSED", "DISCONNECTED"],
    ACCOUNT_ACCESSED: ["SIGNING", "DISCONNECTED"],
    SIGNING: ["TRANSACTION_APPROVED", "DISCONNECTED"],
    TRANSACTION_APPROVED: ["SIGNING", "DISCONNECTED"],
    DISCONNECTED: ["DISCOVERED"]
  };

  // ---- Wallet lifecycle (15 states, closed set) --------------------------
  //
  // The old five states are a coarse view of a session; the lifecycle
  // is the full view of a wallet's life. The old states map onto it
  // (LEGACY_TO_LIFECYCLE below) so existing behaviour keeps working:
  // a legacy transition also moves the lifecycle state, and a
  // lifecycle transition keeps the legacy state in sync through
  // lifecycleToLegacy(). Neither view is ever collapsed to a bare
  // CONNECTED / DISCONNECTED pair.
  var LIFECYCLE_STATES = ["UNKNOWN", "DISCOVERED", "AVAILABLE",
    "NOT_INSTALLED", "NOT_CONNECTED", "CONNECTING", "CONNECTED",
    "READ_ONLY", "WATCH_ONLY", "CONNECTION_ERROR", "UNSUPPORTED",
    "STALE", "DISCONNECTED", "SECURITY_HOLD", "DISABLED"];

  var LEGACY_TO_LIFECYCLE = {
    DISCOVERED: "DISCOVERED",
    CONNECTED: "CONNECTED",
    ACCOUNT_ACCESSED: "CONNECTED",
    SIGNING: "CONNECTED",
    TRANSACTION_APPROVED: "CONNECTED",
    DISCONNECTED: "DISCONNECTED"
  };

  // Strict lifecycle allowlist. SECURITY_HOLD is reachable only from
  // CONNECTED / READ_ONLY / WATCH_ONLY, and leaving it (or leaving
  // DISABLED) additionally requires an owner-approved resolution
  // record — enforced in transitionWallet, not in this table.
  // DISABLED is terminal in the table except for the owner-record
  // re-enable back to DISCOVERED.
  var LIFECYCLE_TRANSITIONS = {
    UNKNOWN: ["DISCOVERED", "NOT_INSTALLED", "DISABLED"],
    DISCOVERED: ["AVAILABLE", "NOT_INSTALLED", "NOT_CONNECTED",
      "UNSUPPORTED", "DISABLED"],
    AVAILABLE: ["NOT_CONNECTED", "CONNECTING", "NOT_INSTALLED",
      "UNSUPPORTED", "DISABLED"],
    NOT_INSTALLED: ["AVAILABLE", "DISCOVERED", "DISABLED"],
    NOT_CONNECTED: ["CONNECTING", "AVAILABLE", "UNSUPPORTED",
      "DISCONNECTED", "DISABLED"],
    CONNECTING: ["CONNECTED", "CONNECTION_ERROR", "NOT_CONNECTED",
      "UNSUPPORTED", "DISCONNECTED"],
    CONNECTED: ["READ_ONLY", "WATCH_ONLY", "STALE", "SECURITY_HOLD",
      "NOT_CONNECTED", "CONNECTION_ERROR", "DISCONNECTED", "DISABLED"],
    READ_ONLY: ["CONNECTED", "WATCH_ONLY", "SECURITY_HOLD", "STALE",
      "DISCONNECTED", "DISABLED"],
    WATCH_ONLY: ["CONNECTED", "READ_ONLY", "SECURITY_HOLD", "STALE",
      "DISCONNECTED", "DISABLED"],
    CONNECTION_ERROR: ["CONNECTING", "NOT_CONNECTED", "DISCONNECTED",
      "DISABLED"],
    UNSUPPORTED: ["DISABLED", "DISCONNECTED"],
    STALE: ["CONNECTED", "READ_ONLY", "WATCH_ONLY", "DISCONNECTED",
      "DISABLED"],
    DISCONNECTED: ["DISCOVERED", "NOT_CONNECTED", "DISABLED"],
    SECURITY_HOLD: ["CONNECTED", "READ_ONLY", "WATCH_ONLY",
      "DISCONNECTED", "DISABLED"],
    DISABLED: ["DISCOVERED"]
  };

  var LIFECYCLE_STATE_DESCRIPTIONS = {
    UNKNOWN: "Nothing is known about this wallet yet.",
    DISCOVERED: "Detected only — no session, no address shared, no signing.",
    AVAILABLE: "Present and available to connect — no session yet.",
    NOT_INSTALLED: "Known wallet software that is not installed here.",
    NOT_CONNECTED: "Installed and available, but no session exists.",
    CONNECTING: "A connection attempt is in progress — no session yet.",
    CONNECTED: "A session exists — no address shared yet, no signing.",
    READ_ONLY: "Connected in read-only mode — reads only, no signing.",
    WATCH_ONLY: "Watch-only mode — an address is observed, never signed from.",
    CONNECTION_ERROR: "The last connection attempt failed — no session.",
    UNSUPPORTED: "This wallet is not supported by the cockpit.",
    STALE: "Connected before, but the record has not been refreshed.",
    DISCONNECTED: "Session ended — no session, no signing.",
    SECURITY_HOLD: "Frozen by an owner hold — no use until an owner-approved resolution releases it.",
    DISABLED: "Disabled — terminal unless an owner record re-enables it."
  };

  // Wallet modes. A mode is a flag on the record as well as (for
  // WATCH_ONLY / READ_ONLY) a lifecycle state: the flag governs what
  // may be granted, the state governs where the wallet may move.
  var WALLET_MODES = ["WATCH_ONLY", "READ_ONLY", "FULL", "UNKNOWN"];

  // Grouping labels are organisational only. A label never grants a
  // permission and never changes a capability — setGroupLabel only
  // writes the label, and nothing else reads it as authority.
  var GROUP_LABELS = ["PRIMARY", "TRADING", "LONG_TERM", "YIELD",
    "TEST", "WATCH_ONLY", "SECURITY_HOLD", "CUSTOM"];

  // ---- Extended capabilities (16, closed set) ---------------------------
  //
  // Derived from real supported behaviour, never fabricated. A wallet
  // record carries one entry per capability:
  //   { name, granted: bool, source }
  // source is required for a grant: a capability with no source is
  // UNKNOWN, never granted. CAN_EXECUTE is always false — execution
  // is not authorised in this build, whatever a record claims.
  var EXTENDED_CAPABILITIES = ["CAN_DISCOVER", "CAN_CONNECT",
    "CAN_READ_ADDRESS", "CAN_READ_NETWORK", "CAN_READ_BALANCES",
    "CAN_READ_TOKENS", "CAN_READ_NFTS", "CAN_READ_POSITIONS",
    "CAN_READ_ACTIVITY", "CAN_REQUEST_NETWORK_SWITCH",
    "CAN_PREPARE_TRANSACTION", "CAN_REQUEST_SIGNATURE",
    "CAN_SIGN_MESSAGE", "CAN_SIGN_TRANSACTION", "CAN_BROADCAST",
    "CAN_EXECUTE"];

  // Signing / broadcast capabilities need an explicit grant record
  // { grantedBy, grantedAt } on top of a source — never inferred.
  var EXTENDED_SIGNING_CAPABILITIES = ["CAN_SIGN_MESSAGE",
    "CAN_SIGN_TRANSACTION", "CAN_BROADCAST"];

  // A WATCH_ONLY wallet can never hold these, whatever is requested.
  var WATCH_ONLY_FORBIDDEN = ["CAN_SIGN_MESSAGE", "CAN_SIGN_TRANSACTION",
    "CAN_BROADCAST", "CAN_EXECUTE"];

  var CAPABILITIES = ["readAccounts", "signMessage", "signTransaction",
    "sendTransaction", "switchChain"];

  var SIGNING_CAPABILITIES = ["signMessage", "signTransaction",
    "sendTransaction"];

  // Minimum state at which a granted capability is EFFECTIVE. A grant
  // recorded earlier does not make the capability live before this
  // state: hasCapability() checks state as well as the grant.
  var CAPABILITY_MIN_STATE = {
    readAccounts: "CONNECTED",
    switchChain: "CONNECTED",
    signMessage: "SIGNING",
    signTransaction: "SIGNING",
    sendTransaction: "TRANSACTION_APPROVED"
  };

  // Minimum state at which a capability may be GRANTED. One step below
  // the effective state for signing capabilities, so the grant can be
  // recorded (at ACCOUNT_ACCESSED) before the wallet moves into
  // SIGNING — and so a grant can never be recorded while the wallet is
  // merely DISCOVERED or DISCONNECTED.
  var GRANT_MIN_STATE = {
    readAccounts: "CONNECTED",
    switchChain: "CONNECTED",
    signMessage: "ACCOUNT_ACCESSED",
    signTransaction: "ACCOUNT_ACCESSED",
    sendTransaction: "SIGNING"
  };

  // Default StarCommand permission label recorded on a grant. A label
  // is not an execution capability: signing grants are labelled
  // APPROVAL_REQUIRED, and no grant here ever enables a transaction.
  function defaultGrantPermission(capability) {
    var perms = permissions();
    if (SIGNING_CAPABILITIES.indexOf(capability) !== -1) {
      return perms.APPROVAL_REQUIRED;
    }
    if (capability === "readAccounts") return perms.READ_ONLY;
    return perms.ASSISTED;
  }

  var STANDARDS = ["eip-1193", "eip-6963", "walletconnect", "hardware",
    "extension", "injected"];

  // Discovery methods are metadata only: how a wallet was announced.
  // Recording a method performs no connection and fetches nothing.
  var DISCOVERY_METHODS = ["injected", "extension",
    "walletconnect-uri", "hardware", "manual"];

  var FRESHNESS_VALUES = ["fresh", "aging", "stale", "unknown"];
  var FRESH_DAYS = 7;
  var DEFAULT_MAX_AGE_DAYS = 30;
  var AUDIT_MAX = 200;

  var STATE_DESCRIPTIONS = {
    DISCOVERED: "Detected only — no session, no address shared, no signing.",
    CONNECTED: "A session exists — no address shared yet, no signing.",
    ACCOUNT_ACCESSED: "An address was shared — still no signing permission.",
    SIGNING: "Signing capability explicitly granted — still no transaction execution.",
    TRANSACTION_APPROVED: "One specific transaction approved — approval is not execution; execution stays unavailable.",
    DISCONNECTED: "Session ended — no session, no signing."
  };

  // ---- Secret rejection (same patterns as BotOpsModel / KnowledgeModel) ---

  // Key-name parts: a field named anything containing one of these is
  // rejected. Covers seed phrases and mnemonics by name, not just by
  // value, so a record can never smuggle one in under a novel key.
  var SECRET_KEY_PARTS = ["seed", "mnemonic", "privatekey", "private_key",
    "apikey", "api_key", "apisecret", "password", "secret"];

  // Secret-looking VALUES: private-key material, issued tokens, and
  // hex private keys (0x + 64 hex chars). A bare "token" is a
  // legitimate crypto term and is NOT matched. The bare words
  // (secret, password, api key, private key) are weak evidence in a
  // free-text value, so they are checked everywhere EXCEPT the label
  // — a wallet may honestly be named "Secret Wallet" — while the
  // strong patterns (PEM headers, hex keys, issued tokens) are
  // checked in the label too, since a key pasted into a label is
  // still a key.
  var SECRET_VALUE_PATTERN = /(api[_-]?key|secret|password|passwd|private[_-]?key|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-live-[a-z0-9]+|ghp_[a-z0-9]+|github_pat_[a-z0-9_]+|xox[baprs]-[a-z0-9-]+|0x[0-9a-f]{64})/i;
  var STRONG_SECRET_VALUE_PATTERN = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|0x[0-9a-f]{64}|sk-live-[a-z0-9]+|ghp_[a-z0-9]+|github_pat_[a-z0-9_]+|xox[baprs]-[a-z0-9-]+)/i;

  function isSecretKey(key) {
    var k = String(key || "").toLowerCase().replace(/[-_]/g, "");
    for (var i = 0; i < SECRET_KEY_PARTS.length; i++) {
      var part = SECRET_KEY_PARTS[i].replace(/[-_]/g, "");
      if (k.indexOf(part) !== -1) return true;
    }
    return false;
  }

  // Deep scan of a record: every key name and every string value.
  // Returns a "path" describing the first secret-looking field found,
  // or null. Never throws.
  function findSecret(value, path) {
    if (typeof value === "string") {
      var isLabel = /(^|\.)label$/.test(path || "");
      var pattern = isLabel ? STRONG_SECRET_VALUE_PATTERN : SECRET_VALUE_PATTERN;
      if (pattern.test(value)) return path || "(value)";
      return null;
    }
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i++) {
        var hit = findSecret(value[i], path + "[" + i + "]");
        if (hit) return hit;
      }
      return null;
    }
    if (value && typeof value === "object") {
      var keys = Object.keys(value);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        if (isSecretKey(key)) return (path ? path + "." : "") + key;
        var nested = findSecret(value[key], (path ? path + "." : "") + key);
        if (nested) return nested;
      }
    }
    return null;
  }

  // ---- Helpers ------------------------------------------------------------

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

  function parseDate(value) {
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function newWalletId() {
    return "wallet-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 8);
  }

  function stateAtLeast(state, minimum) {
    if (typeof STATE_ORDER[state] !== "number") return false;
    if (typeof STATE_ORDER[minimum] !== "number") return false;
    return STATE_ORDER[state] >= STATE_ORDER[minimum];
  }

  function canTransition(from, to) {
    if (typeof from !== "string" || typeof to !== "string") return false;
    var allowed = TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.indexOf(to) !== -1;
  }

  function lifecycleStates() {
    return LIFECYCLE_STATES.slice();
  }

  function canTransitionLifecycle(from, to) {
    if (typeof from !== "string" || typeof to !== "string") return false;
    var allowed = LIFECYCLE_TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.indexOf(to) !== -1;
  }

  // Keeps the legacy state in step when the lifecycle moves. The
  // lifecycle is the finer view; the legacy state only ever moves to
  // a value its own vocabulary already allows, and a lifecycle move
  // never invents a signing legacy state (SIGNING /
  // TRANSACTION_APPROVED are reached only through the legacy path
  // with its grant guards).
  function lifecycleToLegacy(to, currentLegacy) {
    if (to === "CONNECTED") {
      if (currentLegacy === "DISCOVERED" ||
          currentLegacy === "DISCONNECTED") return "CONNECTED";
      return currentLegacy;
    }
    if (to === "READ_ONLY" || to === "WATCH_ONLY") {
      if (currentLegacy === "DISCOVERED" ||
          currentLegacy === "DISCONNECTED" ||
          currentLegacy === "ACCOUNT_ACCESSED") return "CONNECTED";
      return currentLegacy;
    }
    if (to === "DISCONNECTED" || to === "CONNECTION_ERROR" ||
        to === "DISABLED") {
      return "DISCONNECTED";
    }
    if (to === "UNKNOWN" || to === "DISCOVERED" || to === "AVAILABLE" ||
        to === "NOT_INSTALLED" || to === "NOT_CONNECTED" ||
        to === "CONNECTING" || to === "UNSUPPORTED") {
      if (to === "DISCOVERED") return "DISCOVERED";
      if (currentLegacy === "CONNECTED" ||
          currentLegacy === "ACCOUNT_ACCESSED" ||
          currentLegacy === "SIGNING" ||
          currentLegacy === "TRANSACTION_APPROVED") return "DISCOVERED";
      return currentLegacy;
    }
    return currentLegacy;
  }

  // ---- Privacy: addresses are truncated everywhere except an explicit,
  // user-confirmed full-address request -----------------------------------
  //
  // truncateAddress: first 6 + last 4 characters, e.g. 0x12ab…9f34.
  // fullAddress: the full address ONLY with { userConfirmed: true },
  // otherwise the truncated form. The audit log is scrubbed the same
  // way: a full address (or secret-looking hex) never lands in it.

  function truncateAddress(address) {
    if (typeof address !== "string") return "";
    var a = address.trim();
    if (a.length <= 10) return a;
    return a.slice(0, 6) + "…" + a.slice(-4);
  }

  function fullAddress(address, options) {
    if (typeof address !== "string") return "";
    if (options && options.userConfirmed === true) return address;
    return truncateAddress(address);
  }

  function scrubAuditText(text) {
    if (typeof text !== "string" || !text) return text;
    // A 0x + 64 hex value is private-key-shaped: never log it at all.
    var scrubbed = text.replace(/0x[0-9a-fA-F]{64}/g, "[redacted]");
    // A 0x + 40 hex value is a full EVM address: log it truncated.
    scrubbed = scrubbed.replace(/0x[0-9a-fA-F]{40}/g, function (m) {
      return truncateAddress(m);
    });
    return scrubbed;
  }

  function classifyFreshness(record, maxAgeDays) {
    var max = (maxAgeDays === undefined || maxAgeDays === null) ?
      DEFAULT_MAX_AGE_DAYS : Number(maxAgeDays);
    if (!(max >= 0)) max = DEFAULT_MAX_AGE_DAYS;
    var d = parseDate((record && (record.lastSeen || record.discoveredAt)) || null);
    if (!d) return "unknown";
    var ageDays = (Date.now() - d.getTime()) / 86400000;
    if (ageDays > max) return "stale";
    if (ageDays <= FRESH_DAYS) return "fresh";
    return "aging";
  }

  function freshnessLabel(record, maxAgeDays) {
    var f = classifyFreshness(record, maxAgeDays);
    if (f === "fresh") return "Fresh";
    if (f === "aging") return "Aging";
    if (f === "stale") return "Stale";
    return "Unknown age";
  }

  // ---- Account records ----------------------------------------------------
  //
  // An account record is { accountId, walletProviderId, publicAddress,
  // networkId, addressFormat, accountType, label, watchOnly, connected,
  // verifiedSource, discoveredAt, lastSeenAt, lastRefreshAt, status }.
  // publicAddress is required and is NEVER a private key: a
  // secret-looking value (PEM header, 0x + 64 hex, issued token, or
  // any secret word) is rejected, and so is any secret-looking field
  // name anywhere in the record. status VERIFIED requires a
  // verifiedSource — a verified claim with no source is not verified.

  var PRIVATE_KEY_SHAPE = /^(0x)?[0-9a-fA-F]{64}$/;

  // Returns an array of error strings (empty = valid). Never throws.
  function validateAccount(account) {
    var errors = [];
    if (!account || typeof account !== "object" || Array.isArray(account)) {
      return ["Account record must be an object."];
    }
    if (!isNonEmptyString(account.accountId)) {
      errors.push("accountId is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(account.walletProviderId)) {
      errors.push("walletProviderId is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(account.publicAddress)) {
      errors.push("publicAddress is required and must be a non-empty string.");
    } else {
      var addr = String(account.publicAddress).trim();
      if (PRIVATE_KEY_SHAPE.test(addr) ||
          SECRET_VALUE_PATTERN.test(addr) ||
          STRONG_SECRET_VALUE_PATTERN.test(addr)) {
        errors.push("publicAddress looks like a private key or secret and must never be stored — only a public address belongs in an account record.");
      }
    }
    if (!isNonEmptyString(account.networkId)) {
      errors.push("networkId is required and must be a non-empty string.");
    }
    if (account.addressFormat !== undefined &&
        account.addressFormat !== null &&
        !isNonEmptyString(account.addressFormat)) {
      errors.push("addressFormat must be a non-empty string when present.");
    }
    if (account.accountType !== undefined &&
        account.accountType !== null &&
        !isNonEmptyString(account.accountType)) {
      errors.push("accountType must be a non-empty string when present.");
    }
    if (account.label !== undefined && account.label !== null &&
        typeof account.label !== "string") {
      errors.push("label must be a string when present.");
    }
    if (account.watchOnly !== undefined &&
        typeof account.watchOnly !== "boolean") {
      errors.push("watchOnly must be a boolean when present.");
    }
    if (account.connected !== undefined &&
        typeof account.connected !== "boolean") {
      errors.push("connected must be a boolean when present.");
    }
    if (account.status !== undefined && account.status !== null &&
        truthStates().indexOf(account.status) === -1) {
      errors.push("Unknown account status: " + account.status + ".");
    }
    if (account.status === "VERIFIED" &&
        !isNonEmptyString(account.verifiedSource)) {
      errors.push("status VERIFIED requires a verifiedSource.");
    }
    if (account.verifiedSource !== undefined &&
        account.verifiedSource !== null &&
        typeof account.verifiedSource !== "string") {
      errors.push("verifiedSource must be a string when present.");
    }
    ["discoveredAt", "lastSeenAt", "lastRefreshAt"].forEach(function (f) {
      if (account[f] !== undefined && account[f] !== null &&
          !parseDate(account[f])) {
        errors.push(f + " must be a valid date string when present.");
      }
    });
    var secretField = findSecret(account, "account");
    if (secretField) {
      errors.push("Field " + secretField +
        " looks like a secret or credential and must not be stored in an account record.");
    }
    return errors;
  }

  // ---- Validation ---------------------------------------------------------

  // Returns an array of error strings (empty = valid). Never throws.
  // A record is valid only when: it carries no secret-looking field,
  // its state is known, every signing capability it claims has a valid
  // grant record, and a SIGNING / TRANSACTION_APPROVED state is backed
  // by at least one signing grant.
  function validateWallet(record) {
    var errors = [];
    if (!record || typeof record !== "object") {
      return ["Wallet record must be an object."];
    }
    if (!isNonEmptyString(record.id)) {
      errors.push("id is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(record.label)) {
      errors.push("label is required and must be a non-empty string.");
    }
    if (record.standards !== undefined) {
      if (!isStringArray(record.standards)) {
        errors.push("standards must be an array of strings.");
      } else {
        record.standards.forEach(function (s) {
          if (STANDARDS.indexOf(s) === -1) {
            errors.push("Unknown wallet standard: " + s + ".");
          }
        });
      }
    }
    if (record.chains !== undefined && !isStringArray(record.chains)) {
      errors.push("chains must be an array of network ids (strings).");
    }
    if (record.state !== undefined &&
        WALLET_STATES.indexOf(record.state) === -1) {
      errors.push("state must be one of: " + WALLET_STATES.join(", ") + ".");
    }
    if (record.discoveryMethod !== undefined &&
        DISCOVERY_METHODS.indexOf(record.discoveryMethod) === -1) {
      errors.push("discoveryMethod must be one of: " +
        DISCOVERY_METHODS.join(", ") + ".");
    }
    if (record.verificationStatus !== undefined &&
        truthStates().indexOf(record.verificationStatus) === -1) {
      errors.push("Unknown verificationStatus: " + record.verificationStatus + ".");
    }
    if (record.freshness !== undefined &&
        FRESHNESS_VALUES.indexOf(record.freshness) === -1) {
      errors.push("freshness must be one of: " + FRESHNESS_VALUES.join(", ") + ".");
    }
    if (record.discoveredAt !== undefined && !parseDate(record.discoveredAt)) {
      errors.push("discoveredAt must be a valid date string.");
    }
    if (record.lastSeen !== undefined && !parseDate(record.lastSeen)) {
      errors.push("lastSeen must be a valid date string.");
    }
    // Capabilities: known keys only, booleans only, and every signing
    // capability set true must carry a valid grant record. A claimed
    // signing capability without a grant is rejected, never inferred.
    var caps = record.capabilities;
    if (caps !== undefined) {
      if (!caps || typeof caps !== "object" || Array.isArray(caps)) {
        errors.push("capabilities must be an object.");
      } else {
        Object.keys(caps).forEach(function (cap) {
          if (CAPABILITIES.indexOf(cap) === -1) {
            errors.push("Unknown capability: " + cap + ".");
          } else if (typeof caps[cap] !== "boolean") {
            errors.push("capability " + cap + " must be a boolean.");
          }
        });
        SIGNING_CAPABILITIES.forEach(function (cap) {
          if (caps[cap] === true) {
            var grant = record.grants && record.grants[cap];
            if (!grant || typeof grant !== "object") {
              errors.push("Signing capability " + cap +
                " is enabled but has no grant record — signing is never inferred.");
            } else {
              if (!isNonEmptyString(grant.grantedBy)) {
                errors.push("Grant for " + cap + " needs a grantedBy.");
              }
              if (!parseDate(grant.grantedAt)) {
                errors.push("Grant for " + cap + " needs a valid grantedAt timestamp.");
              }
              if (!isNonEmptyString(grant.scope)) {
                errors.push("Grant for " + cap + " needs a scope.");
              }
            }
          }
        });
      }
    }
    if (record.grants !== undefined) {
      if (!record.grants || typeof record.grants !== "object" ||
          Array.isArray(record.grants)) {
        errors.push("grants must be an object.");
      } else {
        Object.keys(record.grants).forEach(function (cap) {
          if (CAPABILITIES.indexOf(cap) === -1) {
            errors.push("Grant recorded for unknown capability: " + cap + ".");
          }
        });
      }
    }
    // A SIGNING or TRANSACTION_APPROVED state with no signing grant
    // behind it is malformed: the state must never outrun its grants.
    if (record.state === "SIGNING" || record.state === "TRANSACTION_APPROVED") {
      var hasSigningGrant = false;
      SIGNING_CAPABILITIES.forEach(function (cap) {
        if (record.grants && record.grants[cap] &&
            typeof record.grants[cap] === "object") {
          hasSigningGrant = true;
        }
      });
      if (!hasSigningGrant) {
        errors.push("state " + record.state +
          " requires at least one signing grant record.");
      }
    }
    // Lifecycle extension fields: closed vocabularies only.
    if (record.lifecycleState !== undefined &&
        LIFECYCLE_STATES.indexOf(record.lifecycleState) === -1) {
      errors.push("lifecycleState must be one of: " +
        LIFECYCLE_STATES.join(", ") + ".");
    }
    if (record.mode !== undefined &&
        WALLET_MODES.indexOf(record.mode) === -1) {
      errors.push("mode must be one of: " + WALLET_MODES.join(", ") + ".");
    }
    if (record.groupLabel !== undefined && record.groupLabel !== null &&
        GROUP_LABELS.indexOf(record.groupLabel) === -1) {
      errors.push("groupLabel must be one of: " +
        GROUP_LABELS.join(", ") + ".");
    }
    // Extended capabilities: known names only, { name, granted, source }
    // shape, a grant needs a source, CAN_EXECUTE is always false, and
    // a signing / broadcast grant needs an explicit grant record.
    // A WATCH_ONLY wallet (mode or lifecycle state) can never hold a
    // signing / broadcast / execution capability.
    var isWatchOnly = record.mode === "WATCH_ONLY" ||
      record.lifecycleState === "WATCH_ONLY";
    if (record.extendedCapabilities !== undefined) {
      var ext = record.extendedCapabilities;
      if (!ext || typeof ext !== "object" || Array.isArray(ext)) {
        errors.push("extendedCapabilities must be an object.");
      } else {
        Object.keys(ext).forEach(function (cap) {
          if (EXTENDED_CAPABILITIES.indexOf(cap) === -1) {
            errors.push("Unknown extended capability: " + cap + ".");
            return;
          }
          var entry = ext[cap];
          if (!entry || typeof entry !== "object" ||
              Array.isArray(entry)) {
            errors.push("Extended capability " + cap +
              " must be an object { name, granted, source }.");
            return;
          }
          if (entry.name !== undefined && entry.name !== cap) {
            errors.push("Extended capability " + cap +
              " has a mismatched name: " + entry.name + ".");
          }
          if (typeof entry.granted !== "boolean") {
            errors.push("Extended capability " + cap +
              " granted must be a boolean.");
            return;
          }
          if (entry.granted === true) {
            if (!isNonEmptyString(entry.source)) {
              errors.push("Extended capability " + cap +
                " is granted but has no source — a capability with no source is UNKNOWN, never granted.");
            }
            if (cap === "CAN_EXECUTE") {
              errors.push("CAN_EXECUTE is always false — execution is not authorised.");
            }
            if (isWatchOnly &&
                WATCH_ONLY_FORBIDDEN.indexOf(cap) !== -1) {
              errors.push("A WATCH_ONLY wallet can never hold " + cap + ".");
            }
            if (EXTENDED_SIGNING_CAPABILITIES.indexOf(cap) !== -1) {
              var eGrant = record.extendedGrants &&
                record.extendedGrants[cap];
              if (!eGrant || typeof eGrant !== "object" ||
                  !isNonEmptyString(eGrant.grantedBy) ||
                  !parseDate(eGrant.grantedAt)) {
                errors.push("Extended capability " + cap +
                  " is granted but has no explicit grant record (grantedBy + grantedAt) — signing is never inferred.");
              }
            }
          }
        });
      }
    }
    if (record.extendedGrants !== undefined) {
      if (!record.extendedGrants || typeof record.extendedGrants !== "object" ||
          Array.isArray(record.extendedGrants)) {
        errors.push("extendedGrants must be an object.");
      } else {
        Object.keys(record.extendedGrants).forEach(function (cap) {
          if (EXTENDED_CAPABILITIES.indexOf(cap) === -1) {
            errors.push("Extended grant recorded for unknown capability: " + cap + ".");
          }
        });
      }
    }
    // Accounts: every stored account must validate on its own, and
    // the wallet must never carry a secret-looking field.
    if (record.accounts !== undefined) {
      if (!Array.isArray(record.accounts)) {
        errors.push("accounts must be an array.");
      } else {
        record.accounts.forEach(function (acct, idx) {
          validateAccount(acct).forEach(function (e) {
            errors.push("accounts[" + idx + "]: " + e);
          });
        });
      }
    }
    var secretField = findSecret(record, "");
    if (secretField) {
      errors.push("Field " + secretField +
        " looks like a secret or credential and must not be stored in a wallet record.");
    }
    return errors;
  }

  // ---- Wallet list (in-memory only; starts EMPTY) -------------------------

  var wallets = [];
  var auditLog = [];

  function appendAudit(entry) {
    auditLog.push(entry);
    if (auditLog.length > AUDIT_MAX) {
      auditLog.splice(0, auditLog.length - AUDIT_MAX);
    }
  }

  function audit(action, walletId, from, to, note) {
    appendAudit({
      at: nowIso(),
      action: action,
      walletId: walletId || null,
      from: from === undefined ? null : from,
      to: to === undefined ? null : to,
      // Scrubbed: a full address (or secret-looking hex) never lands
      // in the audit log — truncated addresses only.
      note: typeof note === "string" ? scrubAuditText(note) : ""
    });
  }

  function defaultExtendedCapabilities() {
    var out = {};
    EXTENDED_CAPABILITIES.forEach(function (cap) {
      out[cap] = { name: cap, granted: false, source: null };
    });
    return out;
  }

  function cloneExtendedCapabilities(source) {
    var out = defaultExtendedCapabilities();
    if (source && typeof source === "object") {
      EXTENDED_CAPABILITIES.forEach(function (cap) {
        var entry = source[cap];
        if (entry && typeof entry === "object") {
          out[cap] = {
            name: cap,
            granted: entry.granted === true,
            source: typeof entry.source === "string" ? entry.source : null
          };
        }
      });
    }
    return out;
  }

  function cloneAccount(account) {
    if (!account || typeof account !== "object") return account;
    var copy = {};
    Object.keys(account).forEach(function (k) { copy[k] = account[k]; });
    return copy;
  }

  function cloneWallet(record) {
    var copy = {};
    Object.keys(record).forEach(function (k) { copy[k] = record[k]; });
    copy.standards = (record.standards || []).slice();
    copy.chains = (record.chains || []).slice();
    copy.capabilities = {};
    CAPABILITIES.forEach(function (cap) {
      copy.capabilities[cap] = !!(record.capabilities && record.capabilities[cap]);
    });
    copy.grants = {};
    if (record.grants) {
      Object.keys(record.grants).forEach(function (cap) {
        var g = record.grants[cap];
        copy.grants[cap] = g && typeof g === "object" ?
          { grantedBy: g.grantedBy, grantedAt: g.grantedAt,
            scope: g.scope, permission: g.permission } : g;
      });
    }
    // Lifecycle extension fields (defaults keep old records valid).
    copy.lifecycleState = LIFECYCLE_STATES.indexOf(record.lifecycleState) !== -1 ?
      record.lifecycleState :
      (LEGACY_TO_LIFECYCLE[record.state] || "DISCOVERED");
    copy.mode = WALLET_MODES.indexOf(record.mode) !== -1 ?
      record.mode : "UNKNOWN";
    copy.groupLabel = (record.groupLabel === undefined) ? null : record.groupLabel;
    copy.extendedCapabilities =
      cloneExtendedCapabilities(record.extendedCapabilities);
    copy.extendedGrants = {};
    if (record.extendedGrants) {
      Object.keys(record.extendedGrants).forEach(function (cap) {
        var eg = record.extendedGrants[cap];
        copy.extendedGrants[cap] = eg && typeof eg === "object" ?
          { grantedBy: eg.grantedBy, grantedAt: eg.grantedAt,
            source: eg.source } : eg;
      });
    }
    copy.accounts = Array.isArray(record.accounts) ?
      record.accounts.map(cloneAccount) : [];
    return copy;
  }

  // Builds a new wallet record. Always starts DISCOVERED, all
  // capabilities false, verificationStatus UNVERIFIED. Throws on
  // invalid input; never creates a wallet in a later state.
  function createWallet(input) {
    var data = (input && typeof input === "object") ? input : {};
    var reasons = [];
    if (!isNonEmptyString(data.label)) {
      reasons.push("label is required and must be a non-empty string.");
    }
    if (data.standards !== undefined && !isStringArray(data.standards)) {
      reasons.push("standards must be an array of strings.");
    }
    if (data.chains !== undefined && !isStringArray(data.chains)) {
      reasons.push("chains must be an array of network ids (strings).");
    }
    if (data.discoveryMethod !== undefined &&
        DISCOVERY_METHODS.indexOf(data.discoveryMethod) === -1) {
      reasons.push("discoveryMethod must be one of: " +
        DISCOVERY_METHODS.join(", ") + ".");
    }
    if (data.id !== undefined && !isNonEmptyString(data.id)) {
      reasons.push("id must be a non-empty string.");
    }
    if (reasons.length) {
      throw new Error("Invalid wallet: " + reasons.join(" "));
    }
    var stamp = nowIso();
    var record = {
      id: data.id ? data.id.trim() : newWalletId(),
      label: data.label.trim(),
      standards: data.standards ? data.standards.slice() : [],
      chains: data.chains ? data.chains.slice() : [],
      state: "DISCOVERED",
      capabilities: {
        readAccounts: false,
        signMessage: false,
        signTransaction: false,
        sendTransaction: false,
        switchChain: false
      },
      grants: {},
      discoveryMethod: data.discoveryMethod || "manual",
      discoveredAt: stamp,
      lastSeen: stamp,
      verificationStatus: "UNVERIFIED",
      freshness: "fresh",
      // Lifecycle extension: a new wallet is DISCOVERED in both views,
      // mode UNKNOWN, no group label, no extended capability granted,
      // and no accounts yet.
      lifecycleState: "DISCOVERED",
      mode: "UNKNOWN",
      groupLabel: null,
      extendedCapabilities: defaultExtendedCapabilities(),
      extendedGrants: {},
      accounts: []
    };
    var errors = validateWallet(record);
    if (errors.length) {
      throw new Error("Invalid wallet: " + errors.join(" "));
    }
    return record;
  }

  // Adds a wallet to the list. A new wallet must enter as DISCOVERED:
  // a record claiming CONNECTED or later on arrival is rejected, and
  // must reach those states through transitionWallet instead. A
  // duplicate id is rejected. Wallets appear only via this call, with
  // provenance (label + discoveryMethod); the list starts empty.
  function addWallet(input) {
    var record;
    if (input && typeof input === "object" && isNonEmptyString(input.id) &&
        typeof input.state === "string") {
      record = cloneWallet(input);
    } else {
      record = createWallet(input);
    }
    if (record.state !== "DISCOVERED") {
      throw new Error("Invalid wallet: a new wallet must enter as DISCOVERED, not " +
        record.state + ".");
    }
    var errors = validateWallet(record);
    if (errors.length) {
      throw new Error("Invalid wallet: " + errors.join(" "));
    }
    for (var i = 0; i < wallets.length; i++) {
      if (wallets[i].id === record.id) {
        throw new Error("A wallet with id " + record.id + " already exists.");
      }
    }
    wallets.push(record);
    audit("wallet-added", record.id, null, "DISCOVERED",
      "Wallet discovered via " + record.discoveryMethod + ".");
    return cloneWallet(record);
  }

  function getWallet(id) {
    if (typeof id !== "string") return null;
    for (var i = 0; i < wallets.length; i++) {
      if (wallets[i].id === id) return cloneWallet(wallets[i]);
    }
    return null;
  }

  function listWallets() {
    return wallets.map(cloneWallet);
  }

  function removeWallet(id) {
    if (typeof id !== "string") return false;
    for (var i = 0; i < wallets.length; i++) {
      if (wallets[i].id === id) {
        wallets.splice(i, 1);
        audit("wallet-removed", id, null, null, "Wallet removed from the list.");
        return true;
      }
    }
    return false;
  }

  // ---- State machines -----------------------------------------------------
  //
  // transitionWallet(id, to, noteOrOptions) serves BOTH state machines:
  //   - `to` in the old five states runs the legacy machine exactly as
  //     before (same guards, same allowlist) and moves the lifecycle
  //     state through LEGACY_TO_LIFECYCLE.
  //   - `to` in the 15 lifecycle states runs the lifecycle machine
  //     (LIFECYCLE_TRANSITIONS) and keeps the legacy state in sync.
  // The third argument accepts the legacy plain-string note or an
  // options object { by, note, resolution }. `by` names who requested
  // the move; `resolution` is an owner-approved record
  // { approvedBy, approvedAt, reason } required to leave SECURITY_HOLD
  // or to re-enable a DISABLED wallet. An illegal transition throws
  // and nothing is written.
  function transitionWallet(id, to, noteOrOptions) {
    if (typeof id !== "string") {
      throw new Error("transitionWallet requires a wallet id.");
    }
    var opts = {};
    if (typeof noteOrOptions === "string") {
      opts = { note: noteOrOptions };
    } else if (noteOrOptions && typeof noteOrOptions === "object") {
      opts = noteOrOptions;
    }
    var note = typeof opts.note === "string" ? opts.note : "";
    var wallet = null;
    var index = -1;
    for (var i = 0; i < wallets.length; i++) {
      if (wallets[i].id === id) { wallet = wallets[i]; index = i; break; }
    }
    if (!wallet) {
      throw new Error("No wallet with id " + id + ".");
    }
    if (WALLET_STATES.indexOf(to) !== -1) {
      // DISCOVERED / CONNECTED / DISCONNECTED exist in BOTH vocabularies.
      // Route by what is actually legal, fail-closed:
      //   - a SECURITY_HOLD / DISABLED wallet moves only through the
      //     lifecycle path (its resolution guard lives there);
      //   - otherwise the legacy machine wins when its move is legal
      //     (existing behaviour);
      //   - otherwise the lifecycle machine wins when its move is legal
      //     (e.g. STALE -> CONNECTED, or SECURITY_HOLD -> CONNECTED);
      //   - when neither is legal, the legacy machine throws the
      //     illegal-transition error.
      if ((wallet.lifecycleState === "SECURITY_HOLD" ||
           wallet.lifecycleState === "DISABLED") &&
          canTransitionLifecycle(wallet.lifecycleState, to)) {
        return transitionLifecycle(wallet, index, to, note, opts);
      }
      if (canTransition(wallet.state, to)) {
        return transitionLegacy(wallet, index, to, note, opts);
      }
      if (canTransitionLifecycle(wallet.lifecycleState, to)) {
        return transitionLifecycle(wallet, index, to, note, opts);
      }
      return transitionLegacy(wallet, index, to, note, opts);
    }
    if (LIFECYCLE_STATES.indexOf(to) !== -1) {
      return transitionLifecycle(wallet, index, to, note, opts);
    }
    throw new Error("Unknown wallet state: " + to + ".");
  }

  // The legacy machine, unchanged in behaviour: strict allowlist,
  // SIGNING needs a signing grant, TRANSACTION_APPROVED needs a
  // sendTransaction grant plus an approval reference in the note.
  // Added fail-closed guards: a DISABLED wallet is terminal (no
  // legacy move), a SECURITY_HOLD wallet moves only through the
  // lifecycle path with an owner-approved resolution record, and a
  // WATCH_ONLY / READ_ONLY wallet never steps into a signing legacy
  // state.
  function transitionLegacy(wallet, index, to, note, opts) {
    if (wallet.lifecycleState === "DISABLED") {
      throw new Error("Cannot move wallet " + wallet.id + ": it is DISABLED — " +
        "terminal unless re-enabled by an owner record via the lifecycle transition to DISCOVERED.");
    }
    if (wallet.lifecycleState === "SECURITY_HOLD") {
      throw new Error("Cannot move wallet " + wallet.id + ": it is on SECURITY_HOLD — " +
        "release it first via a lifecycle transition with an owner-approved resolution record.");
    }
    if ((to === "CONNECTED" || to === "ACCOUNT_ACCESSED" ||
         to === "SIGNING" || to === "TRANSACTION_APPROVED") &&
        (wallet.lifecycleState === "UNSUPPORTED" ||
         wallet.lifecycleState === "NOT_INSTALLED")) {
      throw new Error("Cannot move wallet " + wallet.id + " to " + to + ": it is " +
        wallet.lifecycleState + " — an unsupported or not-installed wallet cannot open a session.");
    }
    if ((wallet.lifecycleState === "WATCH_ONLY" ||
         wallet.lifecycleState === "READ_ONLY" ||
         wallet.mode === "WATCH_ONLY" || wallet.mode === "READ_ONLY") &&
        (to === "ACCOUNT_ACCESSED" || to === "SIGNING" ||
         to === "TRANSACTION_APPROVED")) {
      throw new Error("Cannot move wallet " + wallet.id + " to " + to + ": it is " +
        (wallet.mode === "WATCH_ONLY" || wallet.lifecycleState === "WATCH_ONLY" ?
          "WATCH_ONLY" : "READ_ONLY") + " — no signing path from a read-only wallet.");
    }
    if (!canTransition(wallet.state, to)) {
      throw new Error("Illegal wallet transition: " + wallet.state + " -> " +
        to + " is not allowed.");
    }
    if (to === "SIGNING") {
      var hasSigning = false;
      SIGNING_CAPABILITIES.forEach(function (cap) {
        if (wallet.capabilities[cap] && wallet.grants[cap]) hasSigning = true;
      });
      if (!hasSigning) {
        throw new Error("Cannot move wallet " + wallet.id + " to SIGNING: no signing " +
          "capability has been granted (a grant record is required).");
      }
    }
    if (to === "TRANSACTION_APPROVED") {
      if (!wallet.capabilities.sendTransaction || !wallet.grants.sendTransaction) {
        throw new Error("Cannot move wallet " + wallet.id + " to TRANSACTION_APPROVED: " +
          "no sendTransaction grant record exists.");
      }
      if (!isNonEmptyString(note)) {
        throw new Error("Cannot move wallet " + wallet.id + " to TRANSACTION_APPROVED: " +
          "the approval reference (note) is required — a specific transaction must be named.");
      }
    }
    var from = wallet.state;
    var updated = cloneWallet(wallet);
    updated.state = to;
    updated.lifecycleState = LEGACY_TO_LIFECYCLE[to];
    updated.lastSeen = nowIso();
    updated.freshness = classifyFreshness(updated, DEFAULT_MAX_AGE_DAYS);
    var errors = validateWallet(updated);
    if (errors.length) {
      throw new Error("Invalid wallet: " + errors.join(" "));
    }
    wallets[index] = updated;
    audit("transition", wallet.id, from, to, note);
    return cloneWallet(updated);
  }

  // The lifecycle machine. Guards, all fail-closed:
  //   - the move must be in LIFECYCLE_TRANSITIONS from the current
  //     lifecycle state;
  //   - entering SECURITY_HOLD needs a reason (note or by);
  //   - leaving SECURITY_HOLD needs an owner-approved resolution
  //     record { approvedBy, approvedAt, reason };
  //   - leaving DISABLED (only back to DISCOVERED) needs the same
  //     owner record — DISABLED is otherwise terminal;
  //   - entering SIGNING legacy states is impossible here: a
  //     SIGNING / TRANSACTION_APPROVED legacy state blocks entry to
  //     WATCH_ONLY / READ_ONLY until its grants are revoked.
  // Entering WATCH_ONLY / READ_ONLY strips extended signing and
  // broadcast capabilities (a read-only wallet holds none) and syncs
  // the mode flag; entering CONNECTED restores mode FULL from a
  // read-only mode. The legacy state is kept in sync.
  function transitionLifecycle(wallet, index, to, note, opts) {
    var from = wallet.lifecycleState;
    if (!canTransitionLifecycle(from, to)) {
      throw new Error("Illegal lifecycle transition: " + from + " -> " +
        to + " is not allowed.");
    }
    if (to === "SECURITY_HOLD") {
      if (from !== "CONNECTED" && from !== "READ_ONLY" &&
          from !== "WATCH_ONLY") {
        throw new Error("SECURITY_HOLD is reachable only from CONNECTED, " +
          "READ_ONLY or WATCH_ONLY, not from " + from + ".");
      }
      if (!isNonEmptyString(note) && !isNonEmptyString(opts.by)) {
        throw new Error("Entering SECURITY_HOLD requires a reason (note or by).");
      }
    }
    if (from === "SECURITY_HOLD" || from === "DISABLED") {
      var resolution = (opts && opts.resolution) || null;
      var resErrors = [];
      if (!resolution || typeof resolution !== "object") {
        resErrors.push("an owner-approved resolution record { approvedBy, approvedAt, reason } is required");
      } else {
        if (!isNonEmptyString(resolution.approvedBy)) {
          resErrors.push("resolution.approvedBy is required (who approved the release)");
        }
        if (!parseDate(resolution.approvedAt)) {
          resErrors.push("resolution.approvedAt must be a valid timestamp");
        }
        if (!isNonEmptyString(resolution.reason)) {
          resErrors.push("resolution.reason is required (why the hold / disablement is released)");
        }
      }
      if (resErrors.length) {
        throw new Error("Cannot leave " + from + " for wallet " + wallet.id + ": " +
          resErrors.join("; ") + ".");
      }
    }
    if ((to === "WATCH_ONLY" || to === "READ_ONLY") &&
        (wallet.state === "SIGNING" ||
         wallet.state === "TRANSACTION_APPROVED")) {
      throw new Error("Cannot move wallet " + wallet.id + " to " + to +
        ": it is in legacy state " + wallet.state +
        " — revoke its signing grants first so it steps back to ACCOUNT_ACCESSED.");
    }
    var updated = cloneWallet(wallet);
    updated.lifecycleState = to;
    updated.state = lifecycleToLegacy(to, wallet.state);
    if (to === "WATCH_ONLY" || to === "READ_ONLY") {
      updated.mode = to;
      // A read-only wallet holds no signing / broadcast capability:
      // strip the extended grants, never keep them silently.
      EXTENDED_SIGNING_CAPABILITIES.forEach(function (cap) {
        updated.extendedCapabilities[cap] = {
          name: cap, granted: false, source: null
        };
        delete updated.extendedGrants[cap];
      });
    } else if (to === "CONNECTED" &&
               (updated.mode === "WATCH_ONLY" ||
                updated.mode === "READ_ONLY")) {
      updated.mode = "FULL";
    }
    updated.lastSeen = nowIso();
    updated.freshness = classifyFreshness(updated, DEFAULT_MAX_AGE_DAYS);
    var errors = validateWallet(updated);
    if (errors.length) {
      throw new Error("Invalid wallet: " + errors.join(" "));
    }
    wallets[index] = updated;
    var auditNote = note;
    if (opts && opts.resolution) {
      auditNote += (auditNote ? " " : "") +
        "Resolution approved by " + opts.resolution.approvedBy + ".";
    }
    audit("lifecycle-transition", wallet.id, from, to, auditNote);
    return cloneWallet(updated);
  }

  // ---- Capability grants --------------------------------------------------

  // Records an explicit grant for one capability. Never inferred: the
  // grant record must name who granted it, when, and its scope. The
  // wallet must already be at or above the grant's minimum state
  // (e.g. a signing grant needs ACCOUNT_ACCESSED first — a merely
  // DISCOVERED wallet can grant nothing). The grant sets the
  // capability flag true; hasCapability() still gates effectiveness
  // on state.
  function grantCapability(id, capability, grant) {
    if (typeof id !== "string") {
      throw new Error("grantCapability requires a wallet id.");
    }
    if (CAPABILITIES.indexOf(capability) === -1) {
      throw new Error("Unknown capability: " + capability + ".");
    }
    var wallet = null;
    var index = -1;
    for (var i = 0; i < wallets.length; i++) {
      if (wallets[i].id === id) { wallet = wallets[i]; index = i; break; }
    }
    if (!wallet) {
      throw new Error("No wallet with id " + id + ".");
    }
    if (SIGNING_CAPABILITIES.indexOf(capability) !== -1 &&
        (wallet.mode === "WATCH_ONLY" || wallet.mode === "READ_ONLY" ||
         wallet.lifecycleState === "WATCH_ONLY" ||
         wallet.lifecycleState === "READ_ONLY")) {
      throw new Error("Cannot grant " + capability + " to wallet " + id +
        ": it is " + (wallet.mode === "WATCH_ONLY" ||
          wallet.lifecycleState === "WATCH_ONLY" ? "WATCH_ONLY" : "READ_ONLY") +
        " — no signing capability on a read-only wallet.");
    }
    var minState = GRANT_MIN_STATE[capability];
    if (!stateAtLeast(wallet.state, minState)) {
      throw new Error("Cannot grant " + capability + " to wallet " + id +
        ": wallet is " + wallet.state + ", grant requires at least " + minState + ".");
    }
    var g = (grant && typeof grant === "object") ? grant : {};
    var reasons = [];
    if (!isNonEmptyString(g.grantedBy)) {
      reasons.push("grant.grantedBy is required (who granted this capability).");
    }
    if (!parseDate(g.grantedAt)) {
      reasons.push("grant.grantedAt must be a valid timestamp.");
    }
    if (!isNonEmptyString(g.scope)) {
      reasons.push("grant.scope is required (what this grant covers).");
    }
    if (reasons.length) {
      throw new Error("Invalid capability grant: " + reasons.join(" "));
    }
    var updated = cloneWallet(wallet);
    updated.capabilities[capability] = true;
    updated.grants[capability] = {
      grantedBy: String(g.grantedBy).trim(),
      grantedAt: new Date(g.grantedAt).toISOString(),
      scope: String(g.scope).trim(),
      permission: isNonEmptyString(g.permission) ?
        String(g.permission).trim() : defaultGrantPermission(capability)
    };
    updated.lastSeen = nowIso();
    var errors = validateWallet(updated);
    if (errors.length) {
      throw new Error("Invalid wallet: " + errors.join(" "));
    }
    wallets[index] = updated;
    audit("capability-granted", id, wallet.state, wallet.state,
      capability + " granted by " + updated.grants[capability].grantedBy +
      " (" + updated.grants[capability].scope + ").");
    return cloneWallet(updated);
  }

  // Revokes a capability and deletes its grant record. If the wallet
  // is in SIGNING or TRANSACTION_APPROVED and this was its last
  // signing grant, the state steps back down to ACCOUNT_ACCESSED:
  // a wallet with no signing grant must not sit in a signing state.
  function revokeCapability(id, capability) {
    if (typeof id !== "string") {
      throw new Error("revokeCapability requires a wallet id.");
    }
    if (CAPABILITIES.indexOf(capability) === -1) {
      throw new Error("Unknown capability: " + capability + ".");
    }
    var wallet = null;
    var index = -1;
    for (var i = 0; i < wallets.length; i++) {
      if (wallets[i].id === id) { wallet = wallets[i]; index = i; break; }
    }
    if (!wallet) {
      throw new Error("No wallet with id " + id + ".");
    }
    var updated = cloneWallet(wallet);
    updated.capabilities[capability] = false;
    delete updated.grants[capability];
    var note = capability + " revoked.";
    if ((updated.state === "SIGNING" ||
         updated.state === "TRANSACTION_APPROVED")) {
      var stillSigning = false;
      SIGNING_CAPABILITIES.forEach(function (cap) {
        if (updated.capabilities[cap] && updated.grants[cap]) stillSigning = true;
      });
      if (!stillSigning) {
        updated.state = "ACCOUNT_ACCESSED";
        note += " Last signing grant removed — state stepped back to ACCOUNT_ACCESSED.";
      }
    }
    updated.lastSeen = nowIso();
    var errors = validateWallet(updated);
    if (errors.length) {
      throw new Error("Invalid wallet: " + errors.join(" "));
    }
    wallets[index] = updated;
    audit("capability-revoked", id, wallet.state, updated.state, note);
    return cloneWallet(updated);
  }

  // ---- Extended capabilities (16, closed set) ---------------------------
  //
  // setCapability(id, capability, granted, source[, grantRecord]):
  //   - capability must be one of the 16; granted must be a boolean.
  //   - granting (true) requires a non-empty source: a capability
  //     with no source is UNKNOWN, never granted.
  //   - CAN_EXECUTE can never be granted: execution is not authorised.
  //   - CAN_SIGN_MESSAGE / CAN_SIGN_TRANSACTION / CAN_BROADCAST need
  //     an explicit grant record { grantedBy, grantedAt } — passed as
  //     the fifth argument, or as an object source
  //     { source, grantedBy, grantedAt }. Without it the capability
  //     stays false and the call throws.
  //   - a WATCH_ONLY wallet (mode or lifecycle state) can never hold
  //     a signing / broadcast / execution capability.
  // Revoking (granted === false) needs no source and clears the grant
  // record. Every change is audit-logged. Returns the stored record.
  function setCapability(id, capability, granted, source, grantRecord) {
    if (typeof id !== "string") {
      throw new Error("setCapability requires a wallet id.");
    }
    if (EXTENDED_CAPABILITIES.indexOf(capability) === -1) {
      throw new Error("Unknown extended capability: " + capability + ".");
    }
    if (typeof granted !== "boolean") {
      throw new Error("setCapability requires granted to be a boolean.");
    }
    var wallet = null;
    var index = -1;
    for (var i = 0; i < wallets.length; i++) {
      if (wallets[i].id === id) { wallet = wallets[i]; index = i; break; }
    }
    if (!wallet) {
      throw new Error("No wallet with id " + id + ".");
    }
    if (granted === true) {
      if (capability === "CAN_EXECUTE") {
        throw new Error("CAN_EXECUTE is always false — transaction execution " +
          "is not authorised in this build, and the capability can never be granted.");
      }
      var sourceText = null;
      var grant = (grantRecord && typeof grantRecord === "object") ?
        grantRecord : null;
      if (typeof source === "string") {
        sourceText = source;
      } else if (source && typeof source === "object") {
        sourceText = typeof source.source === "string" ? source.source : null;
        if (!grant) grant = source;
      }
      if (!isNonEmptyString(sourceText)) {
        throw new Error("Cannot grant " + capability + " to wallet " + id +
          ": a source is required — a capability with no source is UNKNOWN, never granted.");
      }
      var isWatchOnly = wallet.mode === "WATCH_ONLY" ||
        wallet.lifecycleState === "WATCH_ONLY";
      if (isWatchOnly && WATCH_ONLY_FORBIDDEN.indexOf(capability) !== -1) {
        throw new Error("Cannot grant " + capability + " to wallet " + id +
          ": it is WATCH_ONLY — a watch-only wallet can never hold a signing, broadcast or execution capability.");
      }
      if ((wallet.mode === "READ_ONLY" ||
           wallet.lifecycleState === "READ_ONLY") &&
          EXTENDED_SIGNING_CAPABILITIES.indexOf(capability) !== -1) {
        throw new Error("Cannot grant " + capability + " to wallet " + id +
          ": it is READ_ONLY — no signing capability on a read-only wallet.");
      }
      if (EXTENDED_SIGNING_CAPABILITIES.indexOf(capability) !== -1) {
        if (!grant || !isNonEmptyString(grant.grantedBy) ||
            !parseDate(grant.grantedAt)) {
          throw new Error("Cannot grant " + capability + " to wallet " + id +
            ": an explicit grant record { grantedBy, grantedAt } is required — signing is never inferred. The capability stays false.");
        }
      }
      var updated = cloneWallet(wallet);
      updated.extendedCapabilities[capability] = {
        name: capability,
        granted: true,
        source: sourceText.trim()
      };
      if (EXTENDED_SIGNING_CAPABILITIES.indexOf(capability) !== -1) {
        updated.extendedGrants[capability] = {
          grantedBy: String(grant.grantedBy).trim(),
          grantedAt: new Date(grant.grantedAt).toISOString(),
          source: sourceText.trim()
        };
      }
      updated.lastSeen = nowIso();
      var errors = validateWallet(updated);
      if (errors.length) {
        throw new Error("Invalid wallet: " + errors.join(" "));
      }
      wallets[index] = updated;
      audit("capability-set", id, wallet.lifecycleState,
        updated.lifecycleState,
        capability + " granted from " + sourceText.trim() + ".");
      return cloneWallet(updated);
    }
    var revoked = cloneWallet(wallet);
    revoked.extendedCapabilities[capability] = {
      name: capability, granted: false, source: null
    };
    delete revoked.extendedGrants[capability];
    revoked.lastSeen = nowIso();
    var revokeErrors = validateWallet(revoked);
    if (revokeErrors.length) {
      throw new Error("Invalid wallet: " + revokeErrors.join(" "));
    }
    wallets[index] = revoked;
    audit("capability-set", id, wallet.lifecycleState,
      revoked.lifecycleState, capability + " revoked.");
    return cloneWallet(revoked);
  }

  function getCapability(id, capability) {
    if (typeof id !== "string") return null;
    if (EXTENDED_CAPABILITIES.indexOf(capability) === -1) return null;
    var wallet = getWallet(id);
    if (!wallet) return null;
    var entry = wallet.extendedCapabilities[capability];
    return entry ? { name: entry.name, granted: entry.granted,
      source: entry.source } : null;
  }

  function listCapabilities(id) {
    var wallet = getWallet(id);
    if (!wallet) return null;
    return EXTENDED_CAPABILITIES.map(function (cap) {
      var entry = wallet.extendedCapabilities[cap];
      return { name: cap, granted: !!entry.granted,
        source: entry.source === undefined ? null : entry.source };
    });
  }

  function capabilitySet() {
    return EXTENDED_CAPABILITIES.slice();
  }

  // ---- Wallet mode --------------------------------------------------------
  //
  // Sets the mode flag. WATCH_ONLY / READ_ONLY strip any extended
  // signing / broadcast capability the wallet held — a read-only
  // wallet holds none, and the grants do not silently survive the
  // mode change. The mode never grants anything: moving to FULL
  // restores no capability.
  function setWalletMode(id, mode) {
    if (typeof id !== "string") {
      throw new Error("setWalletMode requires a wallet id.");
    }
    if (WALLET_MODES.indexOf(mode) === -1) {
      throw new Error("Unknown wallet mode: " + mode +
        " (one of: " + WALLET_MODES.join(", ") + ").");
    }
    var wallet = null;
    var index = -1;
    for (var i = 0; i < wallets.length; i++) {
      if (wallets[i].id === id) { wallet = wallets[i]; index = i; break; }
    }
    if (!wallet) {
      throw new Error("No wallet with id " + id + ".");
    }
    var updated = cloneWallet(wallet);
    updated.mode = mode;
    if (mode === "WATCH_ONLY" || mode === "READ_ONLY") {
      EXTENDED_SIGNING_CAPABILITIES.forEach(function (cap) {
        updated.extendedCapabilities[cap] = {
          name: cap, granted: false, source: null
        };
        delete updated.extendedGrants[cap];
      });
    }
    updated.lastSeen = nowIso();
    var errors = validateWallet(updated);
    if (errors.length) {
      throw new Error("Invalid wallet: " + errors.join(" "));
    }
    wallets[index] = updated;
    audit("mode-set", id, wallet.mode, mode,
      "Wallet mode set to " + mode + ".");
    return cloneWallet(updated);
  }

  // ---- Grouping labels (organisational only) ------------------------------
  //
  // setGroupLabel only writes the label. It never changes a
  // capability, a grant, a state, or a mode: a label is a filing
  // drawer, not a permission.
  function setGroupLabel(id, label) {
    if (typeof id !== "string") {
      throw new Error("setGroupLabel requires a wallet id.");
    }
    if (GROUP_LABELS.indexOf(label) === -1) {
      throw new Error("Unknown group label: " + label +
        " (one of: " + GROUP_LABELS.join(", ") + ").");
    }
    var wallet = null;
    var index = -1;
    for (var i = 0; i < wallets.length; i++) {
      if (wallets[i].id === id) { wallet = wallets[i]; index = i; break; }
    }
    if (!wallet) {
      throw new Error("No wallet with id " + id + ".");
    }
    var updated = cloneWallet(wallet);
    updated.groupLabel = label;
    updated.lastSeen = nowIso();
    var errors = validateWallet(updated);
    if (errors.length) {
      throw new Error("Invalid wallet: " + errors.join(" "));
    }
    wallets[index] = updated;
    audit("group-label-set", id, wallet.groupLabel, label,
      "Group label set to " + label + " (organisational only — no capability changed).");
    return cloneWallet(updated);
  }

  // ---- Accounts -----------------------------------------------------------
  //
  // addAccount stores one account record on a wallet. The record is
  // validated first (validateAccount): publicAddress is required and
  // is never a private key, and status VERIFIED requires a
  // verifiedSource. A duplicate accountId on the same wallet is
  // rejected. The audit entry carries the truncated address only.
  function addAccount(walletId, account) {
    if (typeof walletId !== "string") {
      throw new Error("addAccount requires a wallet id.");
    }
    var wallet = null;
    var index = -1;
    for (var i = 0; i < wallets.length; i++) {
      if (wallets[i].id === walletId) { wallet = wallets[i]; index = i; break; }
    }
    if (!wallet) {
      throw new Error("No wallet with id " + walletId + ".");
    }
    var errors = validateAccount(account);
    if (errors.length) {
      throw new Error("Invalid account: " + errors.join(" "));
    }
    for (var j = 0; j < wallet.accounts.length; j++) {
      if (wallet.accounts[j].accountId === account.accountId) {
        throw new Error("Wallet " + walletId + " already has an account with accountId " +
          account.accountId + ".");
      }
    }
    var stamp = nowIso();
    var stored = cloneAccount(account);
    stored.accountId = String(account.accountId).trim();
    stored.walletProviderId = String(account.walletProviderId).trim();
    stored.publicAddress = String(account.publicAddress).trim();
    stored.networkId = String(account.networkId).trim();
    stored.addressFormat = account.addressFormat !== undefined &&
      account.addressFormat !== null ? String(account.addressFormat) : null;
    stored.accountType = account.accountType !== undefined &&
      account.accountType !== null ? String(account.accountType) : null;
    stored.label = account.label !== undefined && account.label !== null ?
      String(account.label) : null;
    stored.watchOnly = account.watchOnly === true;
    stored.connected = account.connected === true;
    stored.status = account.status !== undefined && account.status !== null ?
      account.status : "UNKNOWN";
    stored.verifiedSource = account.verifiedSource !== undefined &&
      account.verifiedSource !== null ? String(account.verifiedSource) : null;
    stored.discoveredAt = account.discoveredAt || stamp;
    stored.lastSeenAt = account.lastSeenAt || stamp;
    stored.lastRefreshAt = account.lastRefreshAt || stamp;
    // Freshness metadata (W13): every recorded financial data object
    // carries when it was observed, when it was received, its age,
    // its source, its verification, and its derived freshness state.
    // Never LIVE: freshness is an age judgement, not a liveness claim.
    stored.freshnessMeta = stampFreshness({
      observedAt: stored.lastRefreshAt || stored.lastSeenAt,
      receivedAt: stamp,
      source: stored.verifiedSource || "",
      verification: stored.status
    });
    var updated = cloneWallet(wallet);
    updated.accounts.push(stored);
    updated.lastSeen = stamp;
    var walletErrors = validateWallet(updated);
    if (walletErrors.length) {
      throw new Error("Invalid wallet: " + walletErrors.join(" "));
    }
    wallets[index] = updated;
    audit("account-added", walletId, null, null,
      "Account " + stored.accountId + " added (" +
      truncateAddress(stored.publicAddress) + " on " + stored.networkId + ").");
    return cloneAccount(stored);
  }

  function listAccounts(walletId) {
    if (typeof walletId !== "string") return [];
    var wallet = getWallet(walletId);
    if (!wallet) return [];
    return wallet.accounts.map(cloneAccount);
  }

  function getAccount(accountId) {
    if (typeof accountId !== "string") return null;
    for (var i = 0; i < wallets.length; i++) {
      var accounts = wallets[i].accounts || [];
      for (var j = 0; j < accounts.length; j++) {
        if (accounts[j].accountId === accountId) {
          var copy = cloneAccount(accounts[j]);
          copy.walletId = wallets[i].id;
          return copy;
        }
      }
    }
    return null;
  }

  // A capability is EFFECTIVE only when all three hold: the flag is
  // true, a grant record exists, and the wallet is at or above the
  // capability's minimum state. A granted signing capability reports
  // false while the wallet is merely CONNECTED.
  function hasCapability(id, capability) {
    if (typeof id !== "string") return false;
    if (CAPABILITIES.indexOf(capability) === -1) return false;
    var wallet = null;
    for (var i = 0; i < wallets.length; i++) {
      if (wallets[i].id === id) { wallet = wallets[i]; break; }
    }
    if (!wallet) return false;
    if (!wallet.capabilities[capability]) return false;
    if (!wallet.grants[capability]) return false;
    return stateAtLeast(wallet.state, CAPABILITY_MIN_STATE[capability]);
  }

  // ---- Freshness / resilience + RPC failover + error states (W13) --------
  //
  // Freshness is an AGE judgement, never a liveness claim: no function
  // in this section returns a "LIVE" state, and a record without an
  // observedAt is UNKNOWN — never claimed FRESH. Thresholds:
  //   FRESH  — observed within the last 5 minutes
  //   AGING  — observed within the last 60 minutes
  //   STALE  — observed more than 60 minutes ago
  //   UNKNOWN — no observedAt to judge by
  // Every financial data object the module records (account records
  // via addAccount, and any balance / position snapshot passed through
  // withFreshness) carries a freshnessMeta record
  //   { observedAt, receivedAt, cacheAge, source, verification,
  //     freshnessState }
  // cacheAge is the age of the observation in milliseconds at stamp
  // time (now - observedAt); null when there is no observedAt.
  //
  // RPC failover is a PURE ORDERING function, never a fetch. When
  // NetworkIntelligence is loaded, resolveRpcProvider DELEGATES to
  // NetworkIntelligence.resolveProvider (same ordering semantics:
  // first HEALTHY in tier order; DEGRADED only when no HEALTHY exists;
  // STALE CACHE only with explicit { allowStaleCache: true }; else
  // UNAVAILABLE) and the local implementation below is not used.
  // When NetworkIntelligence is absent, the local implementation runs
  // with IDENTICAL semantics, consulting this module's own recorded
  // provider health (recordProviderHealth) the way
  // NetworkIntelligence consults its own store. There is exactly one
  // failover ordering — never a competing one.
  //
  // Error states are a CLOSED vocabulary (ERROR_STATES). describeError
  // returns a structured record, never a thrown exception for an
  // expected state, and never a zero substituted for unavailable
  // financial data: BALANCE_UNAVAILABLE carries no balance value.
  //
  // A price conflict is never silently resolved to one price: the
  // record carries the conflicting prices and their sources and NO
  // chosen value.

  var FRESHNESS_STATES = ["FRESH", "AGING", "STALE", "UNKNOWN"];
  var FRESH_MS = 5 * 60 * 1000;
  var AGING_MS = 60 * 60 * 1000;

  function deepCopy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function freshnessStateFor(observedDate, nowMs) {
    if (!observedDate) return "UNKNOWN";
    var age = nowMs - observedDate.getTime();
    if (age < 0) age = 0; // Clock skew: an observation dated in the
    // future is treated as just observed, never as an error.
    if (age <= FRESH_MS) return "FRESH";
    if (age <= AGING_MS) return "AGING";
    return "STALE";
  }

  // Stamps freshness metadata onto a financial data observation.
  // input: { observedAt, receivedAt?, source?, verification? }.
  // verification is kept only when it is a known truth state,
  // otherwise UNKNOWN — an unverifiable verification claim is not
  // verification. Returns a fresh record; never throws.
  function stampFreshness(input, nowMs) {
    var data = (input && typeof input === "object") ? input : {};
    var now = (typeof nowMs === "number" && !isNaN(nowMs)) ? nowMs : Date.now();
    var observed = parseDate(data.observedAt);
    var received = parseDate(data.receivedAt);
    var verification = isNonEmptyString(data.verification) ?
      String(data.verification).trim() : "UNKNOWN";
    if (truthStates().indexOf(verification) === -1) verification = "UNKNOWN";
    return {
      observedAt: observed ? observed.toISOString() : null,
      receivedAt: received ? received.toISOString() : null,
      cacheAge: observed ? (now - observed.getTime()) : null,
      source: isNonEmptyString(data.source) ? String(data.source).trim() : "",
      verification: verification,
      freshnessState: freshnessStateFor(observed, now)
    };
  }

  // The freshness state of a stamped metadata record, re-derived from
  // its observedAt against now (optional nowMs for tests). A record
  // without observedAt is UNKNOWN — never claimed FRESH.
  function freshnessOf(metadata, nowMs) {
    if (!metadata || typeof metadata !== "object") return "UNKNOWN";
    var observed = parseDate(metadata.observedAt);
    var now = (typeof nowMs === "number" && !isNaN(nowMs)) ? nowMs : Date.now();
    return freshnessStateFor(observed, now);
  }

  // Pass-through for a financial data object (a balance, a position
  // snapshot): returns a shallow copy carrying freshnessMeta stamped
  // from the given freshness input. The original is never mutated.
  // Returns null when data is not an object.
  function withFreshness(data, freshnessInput, nowMs) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    var copy = {};
    Object.keys(data).forEach(function (k) { copy[k] = data[k]; });
    copy.freshnessMeta = stampFreshness(freshnessInput, nowMs);
    return copy;
  }

  // Marks a wallet's recorded data STALE: the coarse freshness flag
  // goes to "stale" and the audit log records why and by whom. The
  // reason lives in the audit entry (scrubbed like every other note),
  // not in the wallet record. The lifecycle state is untouched —
  // stale DATA is not a lifecycle move. Throws for an unknown wallet.
  function markStale(walletId, options) {
    if (typeof walletId !== "string") {
      throw new Error("markStale requires a wallet id.");
    }
    var opts = (options && typeof options === "object") ? options : {};
    var wallet = null;
    var index = -1;
    for (var i = 0; i < wallets.length; i++) {
      if (wallets[i].id === walletId) { wallet = wallets[i]; index = i; break; }
    }
    if (!wallet) {
      throw new Error("No wallet with id " + walletId + ".");
    }
    var updated = cloneWallet(wallet);
    var previous = wallet.freshness;
    updated.freshness = "stale";
    updated.staleInfo = {
      by: isNonEmptyString(opts.by) ? String(opts.by).trim() : "",
      at: nowIso(),
      previousFreshness: previous
    };
    var errors = validateWallet(updated);
    if (errors.length) {
      throw new Error("Invalid wallet: " + errors.join(" "));
    }
    wallets[index] = updated;
    var note = "Wallet data marked STALE" +
      (isNonEmptyString(opts.reason) ?
        ": " + String(opts.reason).trim() : ".") +
      (isNonEmptyString(opts.by) ?
        " Marked by " + String(opts.by).trim() + "." : "");
    audit("marked-stale", walletId, previous, "stale", note);
    return cloneWallet(updated);
  }

  // ---- Error states (closed set) ------------------------------------------
  //
  // The twelve error codes the wallet layer can report. describeError
  // returns a structured record for any of them — never a thrown
  // exception for an expected state, and never a zero substituted for
  // unavailable financial data (BALANCE_UNAVAILABLE carries no
  // balance value at all).

  var ERROR_STATES = ["WALLET_NOT_FOUND", "WALLET_NOT_CONNECTED",
    "ACCOUNT_UNAVAILABLE", "NETWORK_UNSUPPORTED", "PROVIDER_UNAVAILABLE",
    "BALANCE_UNAVAILABLE", "ASSET_UNVERIFIED",
    "POSITION_DATA_UNAVAILABLE", "PRICE_STALE", "PRICE_CONFLICT",
    "SIGNING_DISABLED", "EXECUTION_DISABLED"];

  var ERROR_MESSAGES = {
    WALLET_NOT_FOUND: "No wallet with that id is recorded — nothing was found and nothing was connected.",
    WALLET_NOT_CONNECTED: "The wallet has no session — connect it before reading accounts or balances.",
    ACCOUNT_UNAVAILABLE: "The requested account is not available on this wallet — no address or balance is shown.",
    NETWORK_UNSUPPORTED: "This network is not supported by the wallet or the cockpit.",
    PROVIDER_UNAVAILABLE: "No RPC provider is usable right now — nothing was fetched; see the failover result for why.",
    BALANCE_UNAVAILABLE: "Balance data is unavailable — no balance is shown and no zero was substituted.",
    ASSET_UNVERIFIED: "The asset is unverified — its identity has not been confirmed against a recorded source.",
    POSITION_DATA_UNAVAILABLE: "Position data is unavailable — no position is shown.",
    PRICE_STALE: "The price is stale — older than its freshness limit; do not act on it as current.",
    PRICE_CONFLICT: "Sources disagree on the price — no price was chosen; see the recorded conflict.",
    SIGNING_DISABLED: "Signing is disabled for this wallet — no signature was requested or produced.",
    EXECUTION_DISABLED: "Transaction execution is disabled in this build — nothing was executed."
  };

  function errorStates() {
    return ERROR_STATES.slice();
  }

  // Structured error record: { code, message, walletId, accountId,
  // networkId, detail, at }. An unknown code still returns a record
  // (never a throw) — it says the code is unknown, and nothing else
  // is claimed.
  function describeError(code, context) {
    var ctx = (context && typeof context === "object") ? context : {};
    var c = isNonEmptyString(code) ? String(code).trim() : "UNKNOWN_ERROR";
    return {
      code: c,
      message: ERROR_MESSAGES[c] ||
        ("Unknown wallet error code: " + c + ". Nothing was confirmed."),
      walletId: isNonEmptyString(ctx.walletId) ? ctx.walletId : null,
      accountId: isNonEmptyString(ctx.accountId) ? ctx.accountId : null,
      networkId: isNonEmptyString(ctx.networkId) ? ctx.networkId : null,
      detail: typeof ctx.detail === "string" ? ctx.detail :
        (ctx.detail === undefined || ctx.detail === null ? "" : String(ctx.detail)),
      at: nowIso()
    };
  }

  // ---- Provider health (wallet-scoped) ------------------------------------
  //
  // Same shape and same rules as NetworkIntelligence's provider health
  // (Crypto spec C11), keyed by wallet instead of network: health must
  // be in the closed set and checkedAt is REQUIRED — a health record
  // without checkedAt is UNKNOWN, because stale health is not health.
  // A report that fails validation is rejected (ok: false, errors)
  // AND the stored record for that provider becomes UNKNOWN, so a bad
  // report can never leave a stale HEALTHY standing.

  var PROVIDER_TIERS = ["PRIMARY", "FALLBACK_1", "FALLBACK_2",
    "KEYLESS_PUBLIC"];
  var PROVIDER_HEALTH_STATES = ["HEALTHY", "DEGRADED", "DOWN",
    "UNKNOWN"];
  var FAILOVER_STATES = ["HEALTHY", "DEGRADED_PROVIDER", "STALE_CACHE",
    "UNAVAILABLE"];
  var TIER_RANK = { PRIMARY: 0, FALLBACK_1: 1, FALLBACK_2: 2,
    KEYLESS_PUBLIC: 3 };

  var walletProviderHealthStore = {};

  function walletProviderHealthKey(walletId, providerId) {
    return String(walletId) + "\n" + String(providerId);
  }

  function isProviderHealthState(v) {
    return PROVIDER_HEALTH_STATES.indexOf(v) !== -1;
  }

  function recordProviderHealth(walletId, providerId, report) {
    if (!isNonEmptyString(walletId)) {
      return { ok: false, errors: ["recordProviderHealth needs a walletId."] };
    }
    if (!isNonEmptyString(providerId)) {
      return { ok: false, errors: ["recordProviderHealth needs a providerId."] };
    }
    if (!report || typeof report !== "object" || Array.isArray(report)) {
      return { ok: false, errors: ["A provider health report is required."] };
    }
    var errors = [];
    var health = report.health;
    var checkedAt = report.checkedAt;
    var checkedMs = (typeof checkedAt === "string") ? Date.parse(checkedAt) : NaN;
    if (!isProviderHealthState(health)) {
      errors.push("Unknown provider health: " + health + ".");
    }
    if (!isNonEmptyString(checkedAt) || isNaN(checkedMs)) {
      errors.push("Provider health report needs a checkedAt timestamp; a health record without checkedAt is UNKNOWN.");
    }
    var key = walletProviderHealthKey(walletId, providerId);
    if (errors.length) {
      // Fail closed: the latest report is unusable, so the provider's
      // health is UNKNOWN from here on, whatever it was before.
      var unknownRecord = {
        walletId: walletId,
        providerId: providerId,
        state: "UNKNOWN",
        checkedAt: null,
        source: isNonEmptyString(report.source) ? report.source : "",
        attemptedHealth: isNonEmptyString(health) ? health : null,
        note: "Health report rejected: " + errors.join(" ")
      };
      if (isNonEmptyString(report.detail)) unknownRecord.detail = report.detail;
      walletProviderHealthStore[key] = unknownRecord;
      return { ok: false, errors: errors, record: deepCopy(unknownRecord) };
    }
    var record = {
      walletId: walletId,
      providerId: providerId,
      state: health,
      checkedAt: checkedAt,
      source: isNonEmptyString(report.source) ? report.source : ""
    };
    if (isNonEmptyString(report.detail)) record.detail = report.detail;
    walletProviderHealthStore[key] = record;
    return { ok: true, record: deepCopy(record) };
  }

  // Latest health record for a provider, or { state: "UNKNOWN" } when
  // no valid record exists. Returns a copy, never the stored object.
  function providerHealth(walletId, providerId) {
    var rec = walletProviderHealthStore[
      walletProviderHealthKey(walletId, providerId)];
    return rec ? deepCopy(rec) : { state: "UNKNOWN" };
  }

  // All recorded health for one wallet, sorted by providerId.
  function listProviderHealth(walletId) {
    var out = [];
    Object.keys(walletProviderHealthStore).forEach(function (key) {
      var rec = walletProviderHealthStore[key];
      if (rec.walletId === walletId) out.push(deepCopy(rec));
    });
    out.sort(function (a, b) {
      return a.providerId < b.providerId ? -1 :
        (a.providerId > b.providerId ? 1 : 0);
    });
    return out;
  }

  function clearProviderHealth() {
    walletProviderHealthStore = {};
  }

  // ---- RPC failover (pure ordering, never a fetch) ------------------------
  //
  // Effective health of one chain entry (local implementation only):
  //   1. the caller's health map (options.health[providerId])
  //   2. the provider record's own health field
  //   3. the latest recorded health report for (walletId, providerId)
  //   4. UNKNOWN — untested is not healthy.
  function localEffectiveProviderHealth(walletId, provider, healthMap) {
    var id = provider && provider.providerId;
    if (healthMap && typeof healthMap === "object" &&
        isNonEmptyString(id) && isProviderHealthState(healthMap[id])) {
      return healthMap[id];
    }
    if (provider && isProviderHealthState(provider.health)) {
      return provider.health;
    }
    if (isNonEmptyString(id)) {
      var rec = walletProviderHealthStore[
        walletProviderHealthKey(walletId, id)];
      if (rec) return rec.state;
    }
    return "UNKNOWN";
  }

  // Local failover implementation — identical semantics to
  // NetworkIntelligence.resolveProvider (Crypto spec C11):
  //   1. First HEALTHY provider in tier order wins.
  //   2. A DEGRADED provider is used only when no HEALTHY provider
  //      exists in any tier (marked DEGRADED_PROVIDER).
  //   3. STALE CACHE is used only when no provider is usable and the
  //      caller explicitly allows it (marked STALE_CACHE).
  //   4. Otherwise UNAVAILABLE with provider null — a failed provider
  //      is never presented as live, and a provider is never invented.
  // UNKNOWN is not usable: untested is not healthy. KEYLESS_PUBLIC
  // sits last in tier order by design: public RPC availability is not
  // production reliability, so a keyless/public provider is never
  // promoted above a HEALTHY PRIMARY/FALLBACK.
  function localResolveRpcProvider(walletId, providers, options) {
    var opts = (options && typeof options === "object") ? options : {};
    var rawProviders = Array.isArray(providers) ? providers : [];
    var allowStaleCache = opts.allowStaleCache === true;
    var healthMap = (opts.health && typeof opts.health === "object") ?
      opts.health : null;

    // Chain entries need an id and a known tier. Invalid entries are
    // skipped — never chosen, never repaired, never fabricated.
    // Duplicates keep their first occurrence in tier order.
    var seen = {};
    var chain = [];
    rawProviders.forEach(function (p) {
      if (!p || typeof p !== "object" || Array.isArray(p)) return;
      if (!isNonEmptyString(p.providerId)) return;
      if (PROVIDER_TIERS.indexOf(p.tier) === -1) return;
      if (seen[p.providerId]) return;
      seen[p.providerId] = true;
      chain.push({
        provider: deepCopy(p),
        health: localEffectiveProviderHealth(walletId, p, healthMap)
      });
    });
    // Tier order, stable within a tier (array order preserved).
    chain.sort(function (a, b) {
      return TIER_RANK[a.provider.tier] - TIER_RANK[b.provider.tier];
    });

    var primary = null;
    chain.forEach(function (entry) {
      if (!primary && entry.provider.tier === "PRIMARY") primary = entry;
    });
    var primaryDown = !!(primary && primary.health === "DOWN");

    function finish(state, provider, reason) {
      var result = {
        state: state,
        provider: provider ? deepCopy(provider) : null,
        fallbackState: state,
        primaryDown: primaryDown,
        reason: reason
      };
      if (state === "STALE_CACHE") result.staleCache = true;
      return result;
    }

    // 1. First HEALTHY provider in tier order wins.
    for (var i = 0; i < chain.length; i++) {
      if (chain[i].health === "HEALTHY") {
        var p = chain[i].provider;
        return finish("HEALTHY", p,
          p.providerId + " (" + p.tier +
          ") is HEALTHY; chosen as first healthy provider in tier order." +
          (primaryDown ? " PRIMARY is DOWN; fallback chosen." : ""));
      }
    }
    // 2. DEGRADED only when no HEALTHY provider exists in any tier.
    for (var j = 0; j < chain.length; j++) {
      if (chain[j].health === "DEGRADED") {
        var d = chain[j].provider;
        return finish("DEGRADED_PROVIDER", d,
          "No HEALTHY provider in any tier; " + d.providerId +
          " (" + d.tier + ") is DEGRADED; degraded provider chosen." +
          (primaryDown ? " PRIMARY is DOWN; fallback chosen." : ""));
      }
    }
    // 3. Stale cache only when the caller explicitly allows it.
    if (allowStaleCache) {
      return finish("STALE_CACHE", null,
        "No provider usable" + (primaryDown ? "; PRIMARY is DOWN" : "") +
        "; stale cache allowed and used.");
    }
    // 4. Nothing usable: UNAVAILABLE, never a failed provider as live.
    return finish("UNAVAILABLE", null,
      "No provider usable" + (primaryDown ? "; PRIMARY is DOWN" : "") +
      "; stale cache not allowed; unavailable.");
  }

  // Resolves the best usable RPC provider for a wallet from an ordered
  // chain of { providerId, tier, health } entries. Pure ordering, no
  // fetch. Options: { allowStaleCache, health } where health is an
  // optional { providerId: health } map. Returns
  //   { state, provider, fallbackState, primaryDown, reason }
  // with state/fallbackState one of HEALTHY / DEGRADED_PROVIDER /
  // STALE_CACHE / UNAVAILABLE and provider null unless a real
  // provider was chosen.
  // DELEGATION: when NetworkIntelligence is loaded, this call is
  // handed to NetworkIntelligence.resolveProvider(walletId,
  // { providers, allowStaleCache, health }) — the walletId is passed
  // as the networkId, so NetworkIntelligence's own recorded health
  // for that id feeds the decision. The local implementation above
  // runs only when NetworkIntelligence is absent, with identical
  // semantics. There is one failover ordering, never a competing one.
  function resolveRpcProvider(walletId, providers, options) {
    if (global.NetworkIntelligence &&
        typeof global.NetworkIntelligence.resolveProvider === "function") {
      var opts = (options && typeof options === "object") ? options : {};
      return global.NetworkIntelligence.resolveProvider(walletId, {
        providers: Array.isArray(providers) ? providers : [],
        allowStaleCache: opts.allowStaleCache === true,
        health: (opts.health && typeof opts.health === "object") ?
          opts.health : undefined
      });
    }
    return localResolveRpcProvider(walletId, providers, options);
  }

  // ---- Price conflicts ------------------------------------------------------
  //
  // A price conflict is never silently resolved to one price: the
  // record carries the conflicting prices and their sources and NO
  // chosen value. The record also carries a structured PRICE_CONFLICT
  // error (see describeError) so a consumer can treat it as the error
  // it is, not as a price.

  var priceConflicts = [];

  function newPriceConflictId() {
    return "price-conflict-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 8);
  }

  // Records a price conflict for an asset. prices is an array of at
  // least two { value, source, observedAt? } entries with at least
  // two DIFFERENT values — identical prices do not conflict. value
  // is a finite number or a non-empty string. Throws on invalid
  // input; returns the stored record (a copy).
  function recordPriceConflict(input) {
    var data = (input && typeof input === "object") ? input : {};
    var reasons = [];
    if (!isNonEmptyString(data.assetId)) {
      reasons.push("recordPriceConflict needs an assetId.");
    }
    if (!Array.isArray(data.prices) || data.prices.length < 2) {
      reasons.push("recordPriceConflict needs at least two conflicting prices.");
    } else {
      var seenValues = {};
      var distinct = 0;
      data.prices.forEach(function (entry, idx) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          reasons.push("prices[" + idx + "] must be an object { value, source }.");
          return;
        }
        var valueOk = (typeof entry.value === "number" && isFinite(entry.value)) ||
          isNonEmptyString(entry.value);
        if (!valueOk) {
          reasons.push("prices[" + idx + "] needs a value (a finite number or a non-empty string).");
        }
        if (!isNonEmptyString(entry.source)) {
          reasons.push("prices[" + idx + "] needs a source.");
        }
        if (entry.observedAt !== undefined && entry.observedAt !== null &&
            !parseDate(entry.observedAt)) {
          reasons.push("prices[" + idx + "].observedAt must be a valid date string when present.");
        }
        if (valueOk) {
          var key = String(entry.value);
          if (!seenValues[key]) { seenValues[key] = true; distinct++; }
        }
      });
      if (data.prices.length >= 2 && distinct < 2) {
        reasons.push("A price conflict needs at least two DIFFERENT prices — identical prices do not conflict.");
      }
    }
    if (reasons.length) {
      throw new Error("Invalid price conflict: " + reasons.join(" "));
    }
    var walletId = isNonEmptyString(data.walletId) ?
      String(data.walletId).trim() : null;
    var record = {
      id: newPriceConflictId(),
      walletId: walletId,
      assetId: String(data.assetId).trim(),
      prices: data.prices.map(function (entry) {
        var p = {
          value: entry.value,
          source: String(entry.source).trim()
        };
        if (entry.observedAt !== undefined && entry.observedAt !== null) {
          p.observedAt = new Date(entry.observedAt).toISOString();
        }
        return p;
      }),
      source: isNonEmptyString(data.source) ? String(data.source).trim() : "",
      code: "PRICE_CONFLICT",
      error: describeError("PRICE_CONFLICT", {
        walletId: walletId,
        detail: "Conflicting prices recorded for " +
          String(data.assetId).trim() + " from " + data.prices.length +
          " sources; no price was chosen."
      }),
      at: nowIso()
    };
    priceConflicts.push(record);
    audit("price-conflict", record.walletId, null, null,
      "Price conflict recorded for " + record.assetId + " (" +
      record.prices.length + " sources disagree; no price chosen).");
    return deepCopy(record);
  }

  // Lists recorded price conflicts — all of them, or only those for
  // one wallet. Returns copies; a conflict record never carries a
  // chosen value.
  function getPriceConflicts(walletId) {
    var list = (typeof walletId === "string") ?
      priceConflicts.filter(function (c) { return c.walletId === walletId; }) :
      priceConflicts.slice();
    return list.map(function (c) { return deepCopy(c); });
  }

  function clearPriceConflicts() {
    priceConflicts = [];
    return true;
  }

  // ---- Truthful views -----------------------------------------------------

  // Truthful detail view for one wallet. Never claims more than the
  // state supports: a DISCOVERED wallet reports no session, no
  // address, no signing, and execution is always unavailable.
  function describeWallet(id) {
    var wallet = getWallet(id);
    if (!wallet) return null;
    var caps = {};
    CAPABILITIES.forEach(function (cap) {
      caps[cap] = {
        enabled: !!wallet.capabilities[cap],
        granted: !!wallet.grants[cap],
        effective: hasCapability(id, cap),
        grant: wallet.grants[cap] ? {
          grantedBy: wallet.grants[cap].grantedBy,
          grantedAt: wallet.grants[cap].grantedAt,
          scope: wallet.grants[cap].scope,
          permission: wallet.grants[cap].permission
        } : null
      };
    });
    return {
      id: wallet.id,
      label: wallet.label,
      standards: wallet.standards.slice(),
      chains: wallet.chains.slice(),
      state: wallet.state,
      stateDescription: STATE_DESCRIPTIONS[wallet.state] ||
        "Unknown state — nothing was confirmed.",
      lifecycleState: wallet.lifecycleState,
      lifecycleStateDescription:
        LIFECYCLE_STATE_DESCRIPTIONS[wallet.lifecycleState] ||
        "Unknown lifecycle state — nothing was confirmed.",
      mode: wallet.mode,
      groupLabel: wallet.groupLabel,
      discoveryMethod: wallet.discoveryMethod,
      discoveredAt: wallet.discoveredAt,
      lastSeen: wallet.lastSeen,
      verificationStatus: wallet.verificationStatus,
      freshness: wallet.freshness,
      freshnessLabel: freshnessLabel(wallet, DEFAULT_MAX_AGE_DAYS),
      capabilities: caps,
      extendedCapabilities: listCapabilities(id),
      // Accounts are shown with TRUNCATED addresses only — the full
      // address is never exposed through a describe view.
      accounts: (wallet.accounts || []).map(function (a) {
        var copy = cloneAccount(a);
        copy.publicAddress = truncateAddress(a.publicAddress);
        return copy;
      }),
      executionAvailable: false,
      note: "Execution is unavailable in this build. " +
        STATE_DESCRIPTIONS[wallet.state]
    };
  }

  // Counts are real counts of stored wallet records only. connected
  // counts wallets at CONNECTED or beyond; signing counts wallets in
  // SIGNING or TRANSACTION_APPROVED. executionAvailable is always
  // false — no transaction execution exists in this build.
  function summary() {
    var byState = {};
    WALLET_STATES.forEach(function (s) { byState[s] = 0; });
    var byLifecycleState = {};
    LIFECYCLE_STATES.forEach(function (s) { byLifecycleState[s] = 0; });
    var connected = 0;
    var signing = 0;
    var watchOnly = 0;
    var readOnly = 0;
    var onHold = 0;
    var disabled = 0;
    var accountCount = 0;
    wallets.forEach(function (w) {
      if (byState.hasOwnProperty(w.state)) byState[w.state] += 1;
      if (byLifecycleState.hasOwnProperty(w.lifecycleState)) {
        byLifecycleState[w.lifecycleState] += 1;
      }
      if (stateAtLeast(w.state, "CONNECTED")) connected += 1;
      if (w.state === "SIGNING" || w.state === "TRANSACTION_APPROVED") signing += 1;
      if (w.mode === "WATCH_ONLY" || w.lifecycleState === "WATCH_ONLY") watchOnly += 1;
      if (w.mode === "READ_ONLY" || w.lifecycleState === "READ_ONLY") readOnly += 1;
      if (w.lifecycleState === "SECURITY_HOLD") onHold += 1;
      if (w.lifecycleState === "DISABLED") disabled += 1;
      accountCount += (w.accounts || []).length;
    });
    return {
      total: wallets.length,
      byState: byState,
      byLifecycleState: byLifecycleState,
      connected: connected,
      signing: signing,
      watchOnly: watchOnly,
      readOnly: readOnly,
      securityHold: onHold,
      disabled: disabled,
      accounts: accountCount,
      executionAvailable: false,
      connectionState: connected > 0 ? "CONNECTED" : "NOT_CONNECTED",
      note: wallets.length === 0 ?
        "No wallets discovered — NOT_CONNECTED. Wallets appear only via explicit addWallet with provenance." :
        "Execution is unavailable in this build — no transaction can run from any wallet state."
    };
  }

  // ---- Execution: always unavailable --------------------------------------

  // There is no transaction execution in this build. This is always
  // false, whatever a wallet's state or grants say. TRANSACTION_APPROVED
  // records an approval; it does not create an execution capability,
  // and the StarCommand transactional check is likewise always false.
  function canExecuteTransaction() {
    return false;
  }

  // Never executes. Returns an UNAVAILABLE result, even for a wallet
  // in TRANSACTION_APPROVED state, even with a sendTransaction grant.
  function requestTransaction(id, note) {
    void id;
    void note;
    return {
      executed: false,
      resultState: "UNAVAILABLE",
      message: "Transaction execution is unavailable in this build. " +
        "A wallet approval records approval only — it never executes a transaction, " +
        "moves funds, or signs on the owner's behalf. Nothing was sent, signed, or moved."
    };
  }

  // ---- Audit log ----------------------------------------------------------

  function getAuditLog() {
    return auditLog.slice();
  }

  function clearAuditLog() {
    auditLog = [];
    return true;
  }

  // Test / maintenance helper: forgets every wallet and clears the
  // audit log. The list starts empty again — the honest starting state.
  // Also clears recorded price conflicts and provider health, so a
  // fresh load starts UNKNOWN there too.
  function reset() {
    wallets = [];
    auditLog = [];
    priceConflicts = [];
    walletProviderHealthStore = {};
    return true;
  }

  global.WalletIntelligence = {
    WALLET_STATES: WALLET_STATES.slice(),
    TRANSITIONS: TRANSITIONS,
    LIFECYCLE_STATES: LIFECYCLE_STATES.slice(),
    LIFECYCLE_TRANSITIONS: LIFECYCLE_TRANSITIONS,
    LEGACY_TO_LIFECYCLE: LEGACY_TO_LIFECYCLE,
    WALLET_MODES: WALLET_MODES.slice(),
    GROUP_LABELS: GROUP_LABELS.slice(),
    CAPABILITIES: CAPABILITIES.slice(),
    SIGNING_CAPABILITIES: SIGNING_CAPABILITIES.slice(),
    EXTENDED_CAPABILITIES: EXTENDED_CAPABILITIES.slice(),
    EXTENDED_SIGNING_CAPABILITIES: EXTENDED_SIGNING_CAPABILITIES.slice(),
    WATCH_ONLY_FORBIDDEN: WATCH_ONLY_FORBIDDEN.slice(),
    STANDARDS: STANDARDS.slice(),
    DISCOVERY_METHODS: DISCOVERY_METHODS.slice(),
    AUDIT_MAX: AUDIT_MAX,
    FRESH_DAYS: FRESH_DAYS,
    DEFAULT_MAX_AGE_DAYS: DEFAULT_MAX_AGE_DAYS,
    newWalletId: newWalletId,
    createWallet: createWallet,
    validateWallet: validateWallet,
    addWallet: addWallet,
    getWallet: getWallet,
    listWallets: listWallets,
    removeWallet: removeWallet,
    canTransition: canTransition,
    stateAtLeast: stateAtLeast,
    transitionWallet: transitionWallet,
    lifecycleStates: lifecycleStates,
    canTransitionLifecycle: canTransitionLifecycle,
    grantCapability: grantCapability,
    revokeCapability: revokeCapability,
    hasCapability: hasCapability,
    setCapability: setCapability,
    getCapability: getCapability,
    listCapabilities: listCapabilities,
    capabilitySet: capabilitySet,
    setWalletMode: setWalletMode,
    setGroupLabel: setGroupLabel,
    validateAccount: validateAccount,
    addAccount: addAccount,
    listAccounts: listAccounts,
    getAccount: getAccount,
    truncateAddress: truncateAddress,
    fullAddress: fullAddress,
    describeWallet: describeWallet,
    summary: summary,
    classifyFreshness: classifyFreshness,
    freshnessLabel: freshnessLabel,
    FRESHNESS_STATES: FRESHNESS_STATES.slice(),
    FRESH_MS: FRESH_MS,
    AGING_MS: AGING_MS,
    stampFreshness: stampFreshness,
    freshnessOf: freshnessOf,
    withFreshness: withFreshness,
    markStale: markStale,
    PROVIDER_TIERS: PROVIDER_TIERS.slice(),
    PROVIDER_HEALTH_STATES: PROVIDER_HEALTH_STATES.slice(),
    FAILOVER_STATES: FAILOVER_STATES.slice(),
    resolveRpcProvider: resolveRpcProvider,
    ERROR_STATES: ERROR_STATES.slice(),
    errorStates: errorStates,
    describeError: describeError,
    recordPriceConflict: recordPriceConflict,
    getPriceConflicts: getPriceConflicts,
    clearPriceConflicts: clearPriceConflicts,
    recordProviderHealth: recordProviderHealth,
    providerHealth: providerHealth,
    listProviderHealth: listProviderHealth,
    clearProviderHealth: clearProviderHealth,
    canExecuteTransaction: canExecuteTransaction,
    requestTransaction: requestTransaction,
    getAuditLog: getAuditLog,
    clearAuditLog: clearAuditLog,
    reset: reset
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
