/* MTI6-GTADWIY-COCKPIT — Simulation / Transaction Preparation Schema
 * + Signing States (continuous development campaign, Wallet spec W8,
 * step 13)
 *
 * Records PROPOSALS for transactions and the signing state each
 * proposal is in. Nothing here signs, broadcasts, or executes: there
 * is no signing path, no broadcast path, and no execution path in
 * this file. A proposal in state SIGNED has been RECORDED as signed
 * elsewhere; this module never performed the signing. A proposal in
 * state BROADCAST or CONFIRMED has been RECORDED as broadcast /
 * confirmed elsewhere; this module never sent anything. Execution
 * stays UNAVAILABLE: canExecuteTransaction() is always false and
 * requestExecution() always returns UNAVAILABLE.
 *
 * Amounts are sourced numbers or the explicit state UNKNOWN — never
 * invented, never defaulted to zero. A missing amount is UNKNOWN.
 * A missing estimatedGas / fees / slippage is likewise UNKNOWN.
 *
 * Destinations are shape-checked per network family (EVM: 0x + 40
 * hex; Solana: base58, 32-44 chars; Bitcoin: legacy base58 or
 * bech32). A bad destination for a known network is rejected at
 * creation. An unknown network never yields an assumed-valid
 * destination: the proposal is recorded with destinationState
 * "UNKNOWN" and the destination is never presented as valid.
 *
 * Expiration is a future ISO timestamp, required at creation. An
 * expired proposal is rejected at creation, and an expired stored
 * proposal cannot transition forward: transitionProposal() returns
 * { ok: false, reason: "EXPIRED" } and changes nothing.
 *
 * Simulation output MUST carry visible simulation state: every
 * attached simulationResult is wrapped as
 * { mode: "SIMULATION", simulatedAt, result }. A simulation never
 * changes the proposal's signing state and is never presented as a
 * real execution. A proposal with a simulationResult is still in
 * whatever signing state it was in — never "executed".
 *
 * Signing states (strict forward chain; FAILED is reachable from
 * any state except CONFIRMED; CONFIRMED is terminal; no transition
 * back to PREPARED):
 *   PREPARED -> AWAITING_SIGNATURE -> SIGNED -> BROADCAST
 *   -> CONFIRMED
 *   any (except CONFIRMED) -> FAILED
 * Every transition appends a history entry { from, to, at, by, note }.
 *
 * Vocabulary reuse (no competing vocabulary invented):
 *   - Truth states (Truth.TRUTH_STATES) for verificationStatus,
 *     consulted through a typeof guard with an identical fallback.
 *   - The bounded in-memory audit log (max 200) matches
 *     WalletIntelligence / TreasuryMandates.
 *   - The secret-rejection pattern shape of BotOpsModel /
 *     WalletIntelligence (secret-looking key names and values are
 *     rejected by validateProposal).
 *
 * Depends on nothing at load time. Truth is consulted through a
 * typeof guard with an identical fallback when absent, so this file
 * loads in a bare vm context with no DOM and no network.
 * Load order when wiring (coordinator): js/truth.js,
 * js/wallet-intelligence.js, js/treasury-mandates.js, then
 * js/transaction-preparation.js.
 *
 *   TransactionPreparation.PROPOSAL_STATES -> ["PREPARED",
 *     "AWAITING_SIGNATURE", "SIGNED", "BROADCAST", "CONFIRMED",
 *     "FAILED"]
 *   TransactionPreparation.prepareTransaction(input) -> proposal (throws on invalid)
 *   TransactionPreparation.validateProposal(record) -> error strings []
 *   TransactionPreparation.getProposal(id) / listProposals()
 *   TransactionPreparation.removeProposal(id)
 *   TransactionPreparation.canTransition(from, to)
 *   TransactionPreparation.transitionProposal(id, to, {by, note})
 *     -> { ok, proposal } | { ok: false, reason }
 *   TransactionPreparation.simulateProposal(id, result) -> proposal (throws on invalid)
 *   TransactionPreparation.isExpired(proposalOrId)
 *   TransactionPreparation.getHistory(id)
 *   TransactionPreparation.summary()
 *   TransactionPreparation.canExecuteTransaction() -> always false
 *   TransactionPreparation.requestExecution(id, note) -> UNAVAILABLE, never runs
 *   TransactionPreparation.getAuditLog() / clearAuditLog()
 *   TransactionPreparation.reset()
 */
(function (global) {
  "use strict";

  // ---- Vocabulary (reused, with identical fallback) ----------------------

  var FALLBACK_TRUTH_STATES = ["NOT_CONNECTED", "UNKNOWN", "UNVERIFIED",
    "STALE", "DISABLED", "UNAVAILABLE", "VERIFIED", "LIVE"];

  function truthStates() {
    if (global.Truth && Array.isArray(global.Truth.TRUTH_STATES) &&
        global.Truth.TRUTH_STATES.length) {
      return global.Truth.TRUTH_STATES.slice();
    }
    return FALLBACK_TRUTH_STATES.slice();
  }

  // ---- States ------------------------------------------------------------

  var PROPOSAL_STATES = ["PREPARED", "AWAITING_SIGNATURE", "SIGNED",
    "BROADCAST", "CONFIRMED", "FAILED"];

  // Strict allowlist: forward along the chain only, plus FAILED from
  // any state except CONFIRMED. CONFIRMED and FAILED are terminal.
  // There is no transition back to PREPARED.
  var TRANSITIONS = {
    PREPARED: ["AWAITING_SIGNATURE", "FAILED"],
    AWAITING_SIGNATURE: ["SIGNED", "FAILED"],
    SIGNED: ["BROADCAST", "FAILED"],
    BROADCAST: ["CONFIRMED", "FAILED"],
    CONFIRMED: [],
    FAILED: []
  };

  var TERMINAL_STATES = ["CONFIRMED", "FAILED"];

  var FRESHNESS_VALUES = ["fresh", "aging", "stale", "unknown"];
  var AUDIT_MAX = 200;

  // ---- Network families and destination shape checks ---------------------

  // Network family is derived from the network id only. Anything not
  // recognised is UNKNOWN — never guessed as EVM, Solana, or Bitcoin.
  var EVM_TOKENS = ["ethereum", "evm", "polygon", "matic", "arbitrum",
    "optimism", "base", "bsc", "binance", "avalanche", "avax", "fantom",
    "gnosis", "celo", "linea", "scroll", "zksync", "mantle", "moonbeam",
    "cronos", "blast", "mode", "zora"];

  function networkFamily(networkId) {
    var id = String(networkId || "").toLowerCase();
    if (id.indexOf("solana") !== -1) return "SOLANA";
    if (id.indexOf("bitcoin") !== -1) return "BITCOIN";
    var tokens = id.split(/[^a-z0-9]+/);
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i] === "btc") return "BITCOIN";
      if (tokens[i] === "sol") return "SOLANA";
      if (EVM_TOKENS.indexOf(tokens[i]) !== -1) return "EVM";
    }
    return "UNKNOWN";
  }

  // Shape checks only: format, never ownership, never balance, never
  // reachability. A well-formed address is not a verified recipient.
  var EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
  var SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  var BITCOIN_LEGACY = /^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/;
  var BITCOIN_BECH32 = /^bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{11,71}$/i;

  function destinationMatchesFamily(destination, family) {
    if (family === "EVM") return EVM_ADDRESS.test(destination);
    if (family === "SOLANA") return SOLANA_ADDRESS.test(destination);
    if (family === "BITCOIN") {
      return BITCOIN_LEGACY.test(destination) ||
        BITCOIN_BECH32.test(destination);
    }
    return false;
  }

  // Returns "VALID" when the destination matches its network family,
  // "UNKNOWN" when the network family is unknown (never assumed
  // valid), or null when the destination is malformed for a known
  // network (the proposal is rejected, not recorded as valid).
  function classifyDestination(destination, networkId) {
    var family = networkFamily(networkId);
    if (family === "UNKNOWN") return "UNKNOWN";
    return destinationMatchesFamily(destination, family) ? "VALID" : null;
  }

  // ---- Secret rejection (same shape as WalletIntelligence) ---------------

  var SECRET_KEY_PARTS = ["seed", "mnemonic", "privatekey", "private_key",
    "apikey", "api_key", "apisecret", "password", "secret"];

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
  // The destination address itself is excluded from the weak-value
  // check by path (an address is not a secret), but the strong
  // patterns (PEM headers, 64-hex private keys, issued tokens) still
  // apply to it — a key pasted as a destination is still a key.
  function findSecret(value, path) {
    if (typeof value === "string") {
      var isDestination = /(^|\.)destination$/.test(path || "");
      var pattern = isDestination ?
        STRONG_SECRET_VALUE_PATTERN : SECRET_VALUE_PATTERN;
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

  // ---- Helpers -----------------------------------------------------------

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

  function parseTime(value) {
    if (value === undefined || value === null) return null;
    var ms = Date.parse(value);
    return isNaN(ms) ? null : ms;
  }

  function newProposalId() {
    return "txprop-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 8);
  }

  function canTransition(from, to) {
    if (typeof from !== "string" || typeof to !== "string") return false;
    var allowed = TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.indexOf(to) !== -1;
  }

  // A sourced number, or the explicit state UNKNOWN. Missing (null /
  // undefined) is UNKNOWN, never 0. The literal string "UNKNOWN" is
  // accepted as the explicit state. Anything else is invalid.
  function normalizeSourcedNumber(value, field) {
    if (value === undefined || value === null) return "UNKNOWN";
    if (value === "UNKNOWN") return "UNKNOWN";
    if (typeof value === "number" && isFinite(value) && value >= 0) {
      return value;
    }
    throw new Error("Invalid transaction proposal: " + field +
      " must be a finite number >= 0, or the explicit state UNKNOWN " +
      "(a missing value is UNKNOWN, never 0).");
  }

  function isValidSourcedNumber(value) {
    return value === "UNKNOWN" ||
      (typeof value === "number" && isFinite(value) && value >= 0);
  }

  // ---- Store (in-memory only; starts EMPTY) ------------------------------

  var proposals = {}; // transactionProposalId -> proposal record
  var auditLog = [];

  function appendAudit(entry) {
    auditLog.push(entry);
    if (auditLog.length > AUDIT_MAX) {
      auditLog.splice(0, auditLog.length - AUDIT_MAX);
    }
  }

  function audit(action, proposalId, from, to, note) {
    appendAudit({
      at: nowIso(),
      action: action,
      proposalId: proposalId || null,
      from: from === undefined ? null : from,
      to: to === undefined ? null : to,
      note: typeof note === "string" ? note : ""
    });
  }

  function copyProposal(record) {
    if (!record) return null;
    var copy = {
      transactionProposalId: record.transactionProposalId,
      walletId: record.walletId,
      accountId: record.accountId,
      networkId: record.networkId,
      assetId: record.assetId,
      protocolId: record.protocolId,
      action: record.action,
      destination: record.destination,
      destinationState: record.destinationState,
      networkFamily: record.networkFamily,
      amount: record.amount,
      estimatedGas: record.estimatedGas,
      fees: record.fees,
      slippage: record.slippage,
      route: record.route ? record.route.slice() : null,
      dependencies: record.dependencies ? record.dependencies.slice() : [],
      simulationResult: record.simulationResult ?
        JSON.parse(JSON.stringify(record.simulationResult)) : null,
      risk: (record.risk && typeof record.risk === "object") ?
        JSON.parse(JSON.stringify(record.risk)) : record.risk,
      freshness: record.freshness,
      approvalRequirement: record.approvalRequirement,
      expiration: record.expiration,
      verificationStatus: record.verificationStatus,
      state: record.state,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      history: record.history.map(function (entry) {
        return {
          from: entry.from,
          to: entry.to,
          at: entry.at,
          by: entry.by,
          note: entry.note
        };
      })
    };
    return copy;
  }

  // ---- Validation ---------------------------------------------------------

  // Returns an array of error strings (empty = valid). Never throws.
  // A record is valid only when: its ids are non-empty strings, its
  // destination matches its network family (or the family is unknown
  // and the destination is recorded UNKNOWN, never assumed valid),
  // its sourced numbers are numbers-or-UNKNOWN (never an invented
  // zero), its expiration is a valid future timestamp, its approval
  // requirement is present, its state is known, and it carries no
  // secret-looking field.
  function validateProposal(record) {
    var errors = [];
    if (!record || typeof record !== "object") {
      return ["Transaction proposal must be an object."];
    }
    ["transactionProposalId", "walletId", "accountId", "networkId",
     "assetId"].forEach(function (field) {
      if (!isNonEmptyString(record[field])) {
        errors.push(field + " is required and must be a non-empty string.");
      }
    });
    if (record.protocolId !== undefined && record.protocolId !== null &&
        !isNonEmptyString(record.protocolId)) {
      errors.push("protocolId must be a non-empty string when present.");
    }
    if (!isNonEmptyString(record.action)) {
      errors.push("action is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(record.destination)) {
      errors.push("destination is required and must be a non-empty string.");
    } else if (isNonEmptyString(record.networkId)) {
      var destState = classifyDestination(record.destination, record.networkId);
      if (destState === null) {
        errors.push("destination \"" + record.destination + "\" is not a " +
          "valid address format for network \"" + record.networkId + "\" " +
          "(" + networkFamily(record.networkId) + ").");
      } else if (record.destinationState !== undefined &&
          record.destinationState !== destState) {
        errors.push("destinationState must be \"" + destState +
          "\" for this destination and network.");
      }
    }
    ["amount", "estimatedGas", "fees", "slippage"].forEach(function (field) {
      if (!isValidSourcedNumber(record[field])) {
        errors.push(field + " must be a finite number >= 0, or the explicit " +
          "state UNKNOWN (never an invented value).");
      }
    });
    if (record.route !== undefined && record.route !== null &&
        !isStringArray(record.route)) {
      errors.push("route must be an array of strings, or null.");
    }
    if (record.dependencies !== undefined &&
        !isStringArray(record.dependencies)) {
      errors.push("dependencies must be an array of strings.");
    }
    if (record.simulationResult !== undefined &&
        record.simulationResult !== null) {
      if (typeof record.simulationResult !== "object" ||
          record.simulationResult.mode !== "SIMULATION") {
        errors.push("simulationResult must be null, or an object with " +
          "mode \"SIMULATION\" — simulation output must always carry " +
          "visible simulation state.");
      }
    }
    if (record.freshness !== undefined &&
        FRESHNESS_VALUES.indexOf(record.freshness) === -1) {
      errors.push("freshness must be one of: " + FRESHNESS_VALUES.join(", ") + ".");
    }
    if (record.verificationStatus !== undefined &&
        truthStates().indexOf(record.verificationStatus) === -1) {
      errors.push("Unknown verificationStatus: " + record.verificationStatus + ".");
    }
    if (!isNonEmptyString(record.approvalRequirement)) {
      errors.push("approvalRequirement is required and must be a non-empty " +
        "string (e.g. \"OWNER_APPROVAL_REQUIRED\").");
    }
    if (record.expiration === undefined || record.expiration === null) {
      errors.push("expiration is required and must be a future ISO timestamp.");
    } else if (typeof record.expiration !== "string" ||
        parseTime(record.expiration) === null) {
      errors.push("expiration must be a valid ISO timestamp string.");
    } else if (parseTime(record.expiration) <= Date.now()) {
      errors.push("expiration must be in the future — an expired proposal " +
        "is rejected at creation.");
    }
    if (record.state !== undefined &&
        PROPOSAL_STATES.indexOf(record.state) === -1) {
      errors.push("state must be one of: " + PROPOSAL_STATES.join(", ") + ".");
    }
    if (record.history !== undefined && !Array.isArray(record.history)) {
      errors.push("history must be an array of transition entries.");
    }
    var secretField = findSecret(record, "");
    if (secretField) {
      errors.push("Field " + secretField +
        " looks like a secret or credential and must not be stored in a transaction proposal.");
    }
    return errors;
  }

  // ---- Creation -----------------------------------------------------------

  // Builds and stores a new proposal in state PREPARED. Throws an
  // Error listing every reason on invalid input; nothing is stored.
  // Missing amount / estimatedGas / fees / slippage become UNKNOWN,
  // never 0. An expired (or missing, or unparseable) expiration is
  // rejected at creation. A bad destination for a known network is
  // rejected at creation; an unknown network records destinationState
  // UNKNOWN and never assumes the destination is valid.
  function prepareTransaction(input) {
    var data = (input && typeof input === "object") ? input : {};
    var reasons = [];
    ["walletId", "accountId", "networkId", "assetId"].forEach(function (field) {
      if (!isNonEmptyString(data[field])) {
        reasons.push(field + " is required and must be a non-empty string.");
      }
    });
    if (data.transactionProposalId !== undefined &&
        !isNonEmptyString(data.transactionProposalId)) {
      reasons.push("transactionProposalId must be a non-empty string when present.");
    }
    if (data.protocolId !== undefined && data.protocolId !== null &&
        !isNonEmptyString(data.protocolId)) {
      reasons.push("protocolId must be a non-empty string when present.");
    }
    if (!isNonEmptyString(data.action)) {
      reasons.push("action is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(data.destination)) {
      reasons.push("destination is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(data.approvalRequirement)) {
      reasons.push("approvalRequirement is required and must be a non-empty " +
        "string (e.g. \"OWNER_APPROVAL_REQUIRED\").");
    }
    if (data.expiration === undefined || data.expiration === null) {
      reasons.push("expiration is required and must be a future ISO timestamp.");
    } else if (typeof data.expiration !== "string" ||
        parseTime(data.expiration) === null) {
      reasons.push("expiration must be a valid ISO timestamp string.");
    } else if (parseTime(data.expiration) <= Date.now()) {
      reasons.push("expiration must be in the future — an expired proposal " +
        "is rejected at creation.");
    }
    if (data.route !== undefined && data.route !== null &&
        !isStringArray(data.route)) {
      reasons.push("route must be an array of strings, or null.");
    }
    if (data.dependencies !== undefined && !isStringArray(data.dependencies)) {
      reasons.push("dependencies must be an array of strings.");
    }
    if (data.freshness !== undefined &&
        FRESHNESS_VALUES.indexOf(data.freshness) === -1) {
      reasons.push("freshness must be one of: " + FRESHNESS_VALUES.join(", ") + ".");
    }
    if (data.verificationStatus !== undefined &&
        truthStates().indexOf(data.verificationStatus) === -1) {
      reasons.push("Unknown verificationStatus: " + data.verificationStatus + ".");
    }
    if (reasons.length) {
      throw new Error("Invalid transaction proposal: " + reasons.join(" "));
    }
    // Sourced numbers: missing is UNKNOWN, never 0. This throws on
    // any other invalid value (negative, NaN, non-numeric string).
    var amount = normalizeSourcedNumber(data.amount, "amount");
    var estimatedGas = normalizeSourcedNumber(data.estimatedGas, "estimatedGas");
    var fees = normalizeSourcedNumber(data.fees, "fees");
    var slippage = normalizeSourcedNumber(data.slippage, "slippage");

    var destState = classifyDestination(data.destination, data.networkId);
    if (destState === null) {
      throw new Error("Invalid transaction proposal: destination \"" +
        data.destination + "\" is not a valid address format for network \"" +
        data.networkId + "\" (" + networkFamily(data.networkId) + ").");
    }

    var stamp = nowIso();
    var id = data.transactionProposalId ?
      data.transactionProposalId.trim() : newProposalId();
    if (proposals[id]) {
      throw new Error("A transaction proposal with id " + id + " already exists.");
    }
    var record = {
      transactionProposalId: id,
      walletId: data.walletId.trim(),
      accountId: data.accountId.trim(),
      networkId: data.networkId.trim(),
      assetId: data.assetId.trim(),
      protocolId: (data.protocolId === undefined || data.protocolId === null) ?
        null : data.protocolId.trim(),
      action: data.action.trim(),
      destination: data.destination.trim(),
      destinationState: destState,
      networkFamily: networkFamily(data.networkId),
      amount: amount,
      estimatedGas: estimatedGas,
      fees: fees,
      slippage: slippage,
      route: data.route ? data.route.slice() : null,
      dependencies: data.dependencies ? data.dependencies.slice() : [],
      simulationResult: null,
      risk: (data.risk === undefined || data.risk === null) ? "UNKNOWN" :
        ((typeof data.risk === "object") ?
          JSON.parse(JSON.stringify(data.risk)) : data.risk),
      freshness: data.freshness || "fresh",
      approvalRequirement: data.approvalRequirement.trim(),
      expiration: new Date(data.expiration).toISOString(),
      verificationStatus: data.verificationStatus || "UNVERIFIED",
      state: "PREPARED",
      createdAt: stamp,
      updatedAt: stamp,
      history: [{
        from: null,
        to: "PREPARED",
        at: stamp,
        by: "system",
        note: "Proposal prepared (record only — nothing was signed, broadcast, or executed)."
      }]
    };
    var errors = validateProposal(record);
    if (errors.length) {
      throw new Error("Invalid transaction proposal: " + errors.join(" "));
    }
    proposals[id] = record;
    audit("proposal-prepared", id, null, "PREPARED",
      "Proposal prepared for " + record.action + " on " + record.networkId +
      "; destination " + destState + "; amount " +
      (record.amount === "UNKNOWN" ? "UNKNOWN" : String(record.amount)) + ".");
    return copyProposal(record);
  }

  function getProposal(id) {
    if (typeof id !== "string") return null;
    return copyProposal(proposals[id] || null);
  }

  function listProposals() {
    return Object.keys(proposals).sort().map(function (id) {
      return copyProposal(proposals[id]);
    });
  }

  function removeProposal(id) {
    if (typeof id !== "string") return false;
    if (!proposals[id]) return false;
    delete proposals[id];
    audit("proposal-removed", id, null, null, "Proposal removed from the list.");
    return true;
  }

  // ---- Expiry -------------------------------------------------------------

  // True when the proposal's expiration is in the past. Accepts a
  // proposal record or a stored proposal id. A proposal with no
  // parseable expiration is treated as expired — fail closed — but
  // stored proposals always carry a valid future expiration at
  // creation, so this only fires for malformed outside records.
  function isExpired(proposalOrId) {
    var record = null;
    if (typeof proposalOrId === "string") {
      record = proposals[proposalOrId] || null;
    } else if (proposalOrId && typeof proposalOrId === "object") {
      record = proposalOrId;
    }
    if (!record) return false;
    var expMs = parseTime(record.expiration);
    if (expMs === null) return true;
    return expMs < Date.now();
  }

  // ---- State machine ------------------------------------------------------

  // Moves a proposal forward along the strict chain. Returns
  // { ok: true, proposal } on success, or { ok: false, reason } on
  // any rejection — unknown id, unknown target state, illegal jump,
  // terminal state, or expiry. An expired proposal cannot transition
  // forward: { ok: false, reason: "EXPIRED" }, and nothing is
  // written. This function only RECORDS the state a proposal is in;
  // it never signs, never broadcasts, never executes.
  function transitionProposal(id, to, options) {
    var opts = (options && typeof options === "object") ? options : {};
    if (typeof id !== "string" || !proposals[id]) {
      return { ok: false, reason: "UNKNOWN_PROPOSAL",
        message: "No transaction proposal with id " + String(id) + "." };
    }
    if (PROPOSAL_STATES.indexOf(to) === -1) {
      return { ok: false, reason: "UNKNOWN_STATE",
        message: "Unknown proposal state: " + String(to) + "." };
    }
    var record = proposals[id];
    if (isExpired(record)) {
      return { ok: false, reason: "EXPIRED",
        message: "Proposal " + id + " expired at " + record.expiration +
          " and cannot transition forward. Nothing was signed, broadcast, or executed." };
    }
    if (!canTransition(record.state, to)) {
      return { ok: false, reason: "ILLEGAL_TRANSITION",
        message: "Illegal proposal transition: " + record.state + " -> " +
          to + " is not allowed." };
    }
    var from = record.state;
    var stamp = nowIso();
    var updated = copyProposal(record);
    updated.state = to;
    updated.updatedAt = stamp;
    updated.history.push({
      from: from,
      to: to,
      at: stamp,
      by: isNonEmptyString(opts.by) ? String(opts.by).trim() : "UNKNOWN",
      note: typeof opts.note === "string" ? opts.note : ""
    });
    var errors = validateProposal(updated);
    if (errors.length) {
      return { ok: false, reason: "INVALID_PROPOSAL",
        message: "Invalid transaction proposal: " + errors.join(" ") };
    }
    proposals[id] = updated;
    audit("transition", id, from, to,
      typeof opts.note === "string" ? opts.note : "");
    return { ok: true, proposal: copyProposal(updated) };
  }

  function getHistory(id) {
    if (typeof id !== "string" || !proposals[id]) return null;
    return proposals[id].history.map(function (entry) {
      return {
        from: entry.from,
        to: entry.to,
        at: entry.at,
        by: entry.by,
        note: entry.note
      };
    });
  }

  // ---- Simulation ---------------------------------------------------------

  // Attaches a simulation result to a proposal. The result is always
  // wrapped with visible simulation state:
  //   { mode: "SIMULATION", simulatedAt, result }
  // The proposal's signing state is NEVER changed by a simulation,
  // and a simulated proposal is never "executed": it stays in
  // whatever state it was in. Throws on an unknown proposal or an
  // invalid result; nothing is written.
  function simulateProposal(id, result) {
    if (typeof id !== "string" || !proposals[id]) {
      throw new Error("No transaction proposal with id " + String(id) + ".");
    }
    if (result === undefined || result === null) {
      throw new Error("simulateProposal requires a simulation result " +
        "(an object or a string describing the simulated outcome).");
    }
    if (typeof result !== "object" && typeof result !== "string") {
      throw new Error("simulateProposal requires a simulation result object or string.");
    }
    var record = proposals[id];
    var stamp = nowIso();
    var updated = copyProposal(record);
    updated.simulationResult = {
      mode: "SIMULATION",
      simulatedAt: stamp,
      result: (typeof result === "object") ?
        JSON.parse(JSON.stringify(result)) : String(result)
    };
    updated.updatedAt = stamp;
    var errors = validateProposal(updated);
    if (errors.length) {
      throw new Error("Invalid transaction proposal: " + errors.join(" "));
    }
    proposals[id] = updated;
    audit("simulated", id, record.state, record.state,
      "Simulation attached (mode SIMULATION) — state unchanged at " +
      record.state + "; a simulation is never an execution.");
    return copyProposal(updated);
  }

  // ---- Truthful views -----------------------------------------------------

  // Honest counts only. executionAvailable is always false — no
  // transaction execution exists in this build.
  function summary() {
    var byState = {};
    PROPOSAL_STATES.forEach(function (s) { byState[s] = 0; });
    var ids = Object.keys(proposals);
    var expired = 0;
    var simulated = 0;
    var unknownAmount = 0;
    ids.forEach(function (id) {
      var p = proposals[id];
      if (byState.hasOwnProperty(p.state)) byState[p.state] += 1;
      if (isExpired(p)) expired += 1;
      if (p.simulationResult) simulated += 1;
      if (p.amount === "UNKNOWN") unknownAmount += 1;
    });
    return {
      total: ids.length,
      byState: byState,
      expired: expired,
      simulated: simulated,
      unknownAmount: unknownAmount,
      executionAvailable: false,
      note: ids.length === 0 ?
        "No transaction proposals exist — nothing prepared, nothing signed, nothing executed." :
        "Proposals are records only. Execution is unavailable in this build — no proposal state implies a transaction was sent."
    };
  }

  // ---- Execution: always unavailable --------------------------------------

  // There is no transaction execution in this build. This is always
  // false, whatever a proposal's state says. SIGNED / BROADCAST /
  // CONFIRMED record a state reported from elsewhere; they do not
  // create an execution capability here.
  function canExecuteTransaction() {
    return false;
  }

  // Never executes. Returns an UNAVAILABLE result, even for a
  // proposal in SIGNED or BROADCAST state.
  function requestExecution(id, note) {
    void id;
    void note;
    return {
      executed: false,
      resultState: "UNAVAILABLE",
      message: "Transaction execution is unavailable in this build. " +
        "A proposal records a proposed transaction and its signing " +
        "state only — it never signs, broadcasts, or moves funds. " +
        "Nothing was sent, signed, or moved."
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

  // Test / maintenance helper: forgets every proposal and clears the
  // audit log. The list starts empty again — the honest starting state.
  function reset() {
    proposals = {};
    auditLog = [];
    return true;
  }

  global.TransactionPreparation = {
    PROPOSAL_STATES: PROPOSAL_STATES.slice(),
    TRANSITIONS: (function () {
      var copy = {};
      var key;
      for (key in TRANSITIONS) {
        if (Object.prototype.hasOwnProperty.call(TRANSITIONS, key)) copy[key] = TRANSITIONS[key].slice();
      }
      return copy;
    })(),
    TERMINAL_STATES: TERMINAL_STATES.slice(),
    FRESHNESS_VALUES: FRESHNESS_VALUES.slice(),
    AUDIT_MAX: AUDIT_MAX,
    newProposalId: newProposalId,
    networkFamily: networkFamily,
    classifyDestination: classifyDestination,
    prepareTransaction: prepareTransaction,
    validateProposal: validateProposal,
    getProposal: getProposal,
    listProposals: listProposals,
    removeProposal: removeProposal,
    canTransition: canTransition,
    transitionProposal: transitionProposal,
    getHistory: getHistory,
    simulateProposal: simulateProposal,
    isExpired: isExpired,
    summary: summary,
    canExecuteTransaction: canExecuteTransaction,
    requestExecution: requestExecution,
    getAuditLog: getAuditLog,
    clearAuditLog: clearAuditLog,
    reset: reset
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
