/* MTI6-GTADWIY-COCKPIT — Wallet Ecosystems (continuous campaign, Wallet spec W3)
 *
 * Wallet ecosystem models for Solana, Bitcoin, and non-EVM extensibility.
 * This file MODELS ecosystems; it never connects to a wallet, never calls
 * an RPC endpoint, never fetches, never holds a secret, and never claims
 * an ecosystem is live. Every balance, UTXO value, and health state is
 * UNKNOWN until an explicit, sourced report says otherwise. Nothing here
 * executes a transaction, signs anything, or moves funds.
 *
 * Three rules, fail-closed throughout:
 *   - Solana is modeled on its own terms (base58 public-key identity,
 *     SPL tokens), never forced through an EVM-shaped model. There is
 *     no chainId, no ERC-20, and no 18-decimal assumption here.
 *   - Bitcoin is UTXO-oriented: value lives in UTXOs, not in an
 *     account balance. BTCFi is a separate boolean flag (btcFi), never
 *     conflated with plain BTC holding. No EVM smart-contract interface
 *     is ever pretended to exist for Bitcoin.
 *   - Non-EVM extensibility descriptors are DESCRIBED, never SUPPORTED:
 *     DESCRIBED means the model is defined in this file, NOT that a
 *     live integration exists. No ecosystem is marked SUPPORTED without
 *     an implemented capability behind it. A record that applies
 *     EVM-shaped fields (numeric chainId + erc20) to a non-EVM
 *     ecosystem is rejected with reason "EVM_SHAPE_FOR_NON_EVM".
 *
 * Truth vocabulary is REUSED, never reinvented: balance / UTXO / fee
 * states come from Truth.TRUTH_STATES when loaded, else the same
 * closed 8-value list. Secret-field rejection follows the
 * CryptoWorld / WalletIntelligence convention.
 *
 * Depends on nothing at load time. Truth is consulted through a
 * typeof guard with an identical fallback, so this file loads in a
 * bare vm context with no DOM and no network.
 * Load order when wiring: js/truth.js, js/network-intelligence.js,
 * js/wallet-intelligence.js, js/asset-intelligence.js, then
 * js/wallet-ecosystems.js.
 *
 *   WalletEcosystems.describeSolana()                  -> ecosystem descriptor
 *   WalletEcosystems.describeBitcoin()                 -> ecosystem descriptor
 *   WalletEcosystems.validateSolanaAccount(record)     -> error strings []
 *   WalletEcosystems.validateBitcoinAccount(record)    -> error strings []
 *   WalletEcosystems.listEcosystems()                  -> descriptors []
 *   WalletEcosystems.describeEcosystem(id)             -> descriptor | null
 *   WalletEcosystems.validateEcosystemRecord(record)   -> error strings []
 *   WalletEcosystems.blankSolanaAccount() / blankBitcoinAccount()
 */
var WalletEcosystems = (function (global) {
  "use strict";

  // ---- Truth vocabulary, reused (never a competing copy) ----

  var FALLBACK_TRUTH_STATES = ["NOT_CONNECTED", "UNKNOWN", "UNVERIFIED",
    "STALE", "DISABLED", "UNAVAILABLE", "VERIFIED", "LIVE"];

  function truthStates() {
    if (global.Truth && Array.isArray(global.Truth.TRUTH_STATES) &&
        global.Truth.TRUTH_STATES.length) {
      return global.Truth.TRUTH_STATES.slice();
    }
    return FALLBACK_TRUTH_STATES.slice();
  }

  // Secret-field names, same convention as CryptoWorld.SECRET_FIELDS.
  var SECRET_FIELDS = ["seedphrase", "seed", "mnemonic", "privatekey",
    "apikey", "apisecret", "password", "secret"];

  var ECOSYSTEM_STATUSES = ["DESCRIBED", "SUPPORTED"];

  // ---- Helpers ----

  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim() !== "";
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isKnownState(state) {
    return truthStates().indexOf(state) !== -1;
  }

  // Recursively collect secret-looking field names. Keys are checked
  // case-insensitively, at every depth of plain objects and arrays.
  function secretFieldErrors(value, path, errors) {
    if (Array.isArray(value)) {
      value.forEach(function (item, i) {
        secretFieldErrors(item, path + "[" + i + "]", errors);
      });
      return;
    }
    if (!value || typeof value !== "object") return;
    Object.keys(value).forEach(function (k) {
      if (SECRET_FIELDS.indexOf(k.toLowerCase()) !== -1) {
        errors.push("Secret field not allowed: " + path + k + ".");
      }
      secretFieldErrors(value[k], path + k + ".", errors);
    });
  }

  // A balance amount is honest only as a non-negative finite number
  // or the literal string "UNKNOWN". Anything else — a missing amount,
  // a negative number, a guessed string — is rejected, never invented.
  function validateAmount(amount, where, errors) {
    if (amount === "UNKNOWN") return;
    if (typeof amount === "number" && isFinite(amount) && amount >= 0) return;
    errors.push(where + " must be a non-negative number or \"UNKNOWN\"; " +
      "a balance is never fabricated.");
  }

  // ---- Solana -----------------------------------------------------------
  // Modeled separately, never through an EVM-shaped model: identity is
  // a base58 public key, the native asset is SOL, fungible tokens are
  // SPL tokens, NFTs are SPL-based non-fungible assets. No chainId,
  // no ERC-20, no EVM RPC anywhere in this model.

  // Base58 alphabet: excludes 0, O, I, l. Solana public keys are
  // 32-44 base58 characters (32 bytes encoded).
  var BASE58_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

  var SOLANA_DESCRIPTOR = {
    ecosystem: "solana",
    nativeAsset: "SOL",
    addressFormat: "base58",
    tokenStandard: "SPL",
    walletIdentity: "public-key identity: the wallet is identified by " +
      "its base58 public key; there is no separate account number.",
    publicAddress: "base58-encoded public key (32-44 characters).",
    network: { id: "solana-mainnet", label: "Solana mainnet", state: "UNKNOWN" },
    balances: [],
    nftAssets: [],
    tokenizedAssets: [],
    positions: [],
    verificationStatus: "UNVERIFIED",
    source: "structural-model",
    note: "Model only: no live connection, no balance is fetched. " +
      "Balances are UNKNOWN until a sourced report provides them."
  };

  function describeSolana() {
    return clone(SOLANA_DESCRIPTOR);
  }

  // A Solana balance entry: { asset, amount, state }. amount may be
  // "UNKNOWN" — that is the honest default, never a fabricated number.
  function validateSolanaBalance(entry, where, errors) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(where + " must be an object { asset, amount, state }.");
      return;
    }
    if (!isNonEmptyString(entry.asset)) {
      errors.push(where + " needs an asset label.");
    }
    if (entry.amount === undefined) {
      errors.push(where + " needs an amount (a non-negative number or \"UNKNOWN\").");
    } else {
      validateAmount(entry.amount, where + ".amount", errors);
    }
    if (entry.state === undefined) {
      errors.push(where + " needs a state.");
    } else if (!isKnownState(entry.state)) {
      errors.push(where + " has unknown state: " + entry.state + ".");
    }
  }

  function validateSolanaAccount(record) {
    var errors = [];
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return ["Solana account record must be an object."];
    }
    if (record.ecosystem !== undefined && record.ecosystem !== "solana") {
      errors.push("Solana account record has ecosystem \"" + record.ecosystem +
        "\", not \"solana\".");
    }
    // Cross-ecosystem rule: an EVM-shaped record (numeric chainId +
    // erc20) applied to Solana is rejected, never coerced.
    if (typeof record.chainId === "number" && record.erc20 !== undefined) {
      errors.push("EVM_SHAPE_FOR_NON_EVM: a numeric chainId plus erc20 " +
        "fields are EVM-shaped and do not apply to the Solana ecosystem.");
    }
    if (!isNonEmptyString(record.publicAddress)) {
      errors.push("A Solana account needs a publicAddress (base58 public key).");
    } else if (!BASE58_PATTERN.test(record.publicAddress)) {
      errors.push("publicAddress is not a valid base58 Solana address " +
        "(32-44 base58 characters, excluding 0, O, I, l).");
    }
    if (!isNonEmptyString(record.network)) {
      errors.push("A Solana account needs a network id.");
    }
    if (record.walletIdentity !== undefined &&
        typeof record.walletIdentity !== "string") {
      errors.push("walletIdentity must be a string.");
    }
    if (record.balances !== undefined) {
      if (!Array.isArray(record.balances)) {
        errors.push("balances must be an array of { asset, amount, state }.");
      } else {
        record.balances.forEach(function (b, i) {
          validateSolanaBalance(b, "balances[" + i + "]", errors);
        });
      }
    }
    ["nftAssets", "tokenizedAssets", "positions"].forEach(function (field) {
      if (record[field] !== undefined && !Array.isArray(record[field])) {
        errors.push(field + " must be an array.");
      }
    });
    if (record.verificationStatus !== undefined &&
        !isKnownState(record.verificationStatus)) {
      errors.push("Unknown verificationStatus: " + record.verificationStatus + ".");
    }
    secretFieldErrors(record, "", errors);
    return errors;
  }

  function blankSolanaAccount() {
    return {
      ecosystem: "solana",
      nativeAsset: "SOL",
      addressFormat: "base58",
      tokenStandard: "SPL",
      walletIdentity: "",
      publicAddress: "",
      network: "",
      balances: [],
      nftAssets: [],
      tokenizedAssets: [],
      positions: [],
      verificationStatus: "UNKNOWN"
    };
  }

  // ---- Bitcoin ----------------------------------------------------------
  // UTXO-oriented: value lives in unspent outputs, not in an account
  // balance. There is no EVM smart-contract interface for Bitcoin and
  // none is pretended here. BTCFi is a separate boolean flag (btcFi):
  // true means Bitcoin is being used through a BTCFi mechanism, false
  // (the default) means plain BTC holding — the two are never conflated.

  var BITCOIN_ADDRESS_FORMATS = ["P2PKH", "P2SH", "P2WPKH", "P2TR"];

  // Address shape per type. These are format checks only: a matching
  // shape does not prove the address exists or holds funds.
  var BITCOIN_ADDRESS_PATTERNS = {
    // Legacy: base58, starts with 1, 26-35 chars.
    P2PKH: /^[1][1-9A-HJ-NP-Za-km-z]{25,34}$/,
    // Script: base58, starts with 3, 26-35 chars.
    P2SH: /^[3][1-9A-HJ-NP-Za-km-z]{25,34}$/,
    // Native SegWit: bech32, bc1q + 38 chars (lowercase bech32 alphabet).
    P2WPKH: /^bc1q[02-9ac-hj-np-z]{38}$/,
    // Taproot: bech32m, bc1p + 58 chars (lowercase bech32 alphabet).
    P2TR: /^bc1p[02-9ac-hj-np-z]{58}$/
  };

  // A transaction id is a 64-hex-character hash. vout is the output
  // index within that transaction (a non-negative integer).
  var TXID_PATTERN = /^[0-9a-fA-F]{64}$/;

  var BITCOIN_DESCRIPTOR = {
    ecosystem: "bitcoin",
    nativeAsset: "BTC",
    addressFormats: BITCOIN_ADDRESS_FORMATS.slice(),
    utxo: { utxos: [], totalConfirmed: "UNKNOWN", totalUnconfirmed: "UNKNOWN", state: "UNKNOWN" },
    network: { id: "bitcoin-mainnet", label: "Bitcoin mainnet", state: "UNKNOWN" },
    transactionHistory: [],
    feeState: { state: "UNKNOWN" },
    btcFi: false,
    verificationStatus: "UNVERIFIED",
    source: "structural-model",
    note: "Model only: UTXO-oriented, no live connection, no balance " +
      "is fetched. BTCFi (btcFi) is a separate flag, never conflated " +
      "with plain BTC holding. No EVM smart-contract interface exists " +
      "for Bitcoin and none is claimed."
  };

  function describeBitcoin() {
    return clone(BITCOIN_DESCRIPTOR);
  }

  // A UTXO entry: { txid, vout, value, confirmations, state }. value
  // may be "UNKNOWN" — that is the honest default, never an invented
  // amount. confirmations may be "UNKNOWN" (unconfirmed / unreported).
  function validateUtxo(entry, where, errors) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(where + " must be an object { txid, vout, value, confirmations, state }.");
      return;
    }
    if (!isNonEmptyString(entry.txid)) {
      errors.push(where + " needs a txid.");
    } else if (!TXID_PATTERN.test(entry.txid)) {
      errors.push(where + ".txid must be a 64-hex-character transaction id.");
    }
    if (entry.vout === undefined) {
      errors.push(where + " needs a vout (output index).");
    } else if (typeof entry.vout !== "number" ||
        Math.floor(entry.vout) !== entry.vout || entry.vout < 0) {
      errors.push(where + ".vout must be a non-negative integer.");
    }
    if (entry.value === undefined) {
      errors.push(where + " needs a value (a non-negative number or \"UNKNOWN\").");
    } else {
      validateAmount(entry.value, where + ".value", errors);
    }
    if (entry.confirmations !== undefined && entry.confirmations !== "UNKNOWN") {
      if (typeof entry.confirmations !== "number" ||
          Math.floor(entry.confirmations) !== entry.confirmations ||
          entry.confirmations < 0) {
        errors.push(where + ".confirmations must be a non-negative integer or \"UNKNOWN\".");
      }
    }
    if (entry.state === undefined) {
      errors.push(where + " needs a state.");
    } else if (!isKnownState(entry.state)) {
      errors.push(where + " has unknown state: " + entry.state + ".");
    }
  }

  function validateBitcoinAccount(record) {
    var errors = [];
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return ["Bitcoin account record must be an object."];
    }
    if (record.ecosystem !== undefined && record.ecosystem !== "bitcoin") {
      errors.push("Bitcoin account record has ecosystem \"" + record.ecosystem +
        "\", not \"bitcoin\".");
    }
    // Cross-ecosystem rule: EVM-shaped fields do not apply to Bitcoin.
    if (typeof record.chainId === "number" && record.erc20 !== undefined) {
      errors.push("EVM_SHAPE_FOR_NON_EVM: a numeric chainId plus erc20 " +
        "fields are EVM-shaped and do not apply to the Bitcoin ecosystem.");
    }
    // No EVM smart-contract interface exists for Bitcoin: an
    // EVM-style contract field on a Bitcoin record is rejected.
    if (record.contractAddress !== undefined || record.erc20 !== undefined) {
      errors.push("Bitcoin has no EVM smart-contract interface: " +
        "contractAddress / erc20 fields do not apply to a Bitcoin account.");
    }
    if (!isNonEmptyString(record.addressFormat)) {
      errors.push("A Bitcoin account needs an addressFormat " +
        "(one of: " + BITCOIN_ADDRESS_FORMATS.join(", ") + ").");
    } else if (BITCOIN_ADDRESS_FORMATS.indexOf(record.addressFormat) === -1) {
      errors.push("Unknown Bitcoin addressFormat: " + record.addressFormat +
        " (one of: " + BITCOIN_ADDRESS_FORMATS.join(", ") + ").");
    }
    if (!isNonEmptyString(record.publicAddress)) {
      errors.push("A Bitcoin account needs a publicAddress.");
    } else if (isNonEmptyString(record.addressFormat) &&
        BITCOIN_ADDRESS_PATTERNS[record.addressFormat] &&
        !BITCOIN_ADDRESS_PATTERNS[record.addressFormat].test(record.publicAddress)) {
      errors.push("publicAddress does not match the stated addressFormat " +
        record.addressFormat + ".");
    }
    if (!isNonEmptyString(record.network)) {
      errors.push("A Bitcoin account needs a network id.");
    }
    if (record.utxo !== undefined) {
      if (!record.utxo || typeof record.utxo !== "object" ||
          Array.isArray(record.utxo)) {
        errors.push("utxo must be an object { utxos, totalConfirmed, totalUnconfirmed, state }.");
      } else {
        if (record.utxo.utxos !== undefined) {
          if (!Array.isArray(record.utxo.utxos)) {
            errors.push("utxo.utxos must be an array.");
          } else {
            record.utxo.utxos.forEach(function (u, i) {
              validateUtxo(u, "utxo.utxos[" + i + "]", errors);
            });
          }
        }
        ["totalConfirmed", "totalUnconfirmed"].forEach(function (field) {
          if (record.utxo[field] !== undefined) {
            validateAmount(record.utxo[field], "utxo." + field, errors);
          }
        });
        if (record.utxo.state !== undefined && !isKnownState(record.utxo.state)) {
          errors.push("utxo.state has unknown state: " + record.utxo.state + ".");
        }
      }
    }
    if (record.transactionHistory !== undefined &&
        !Array.isArray(record.transactionHistory)) {
      errors.push("transactionHistory must be an array.");
    }
    if (record.feeState !== undefined) {
      if (!record.feeState || typeof record.feeState !== "object") {
        errors.push("feeState must be an object.");
      } else if (record.feeState.state !== undefined &&
          !isKnownState(record.feeState.state)) {
        errors.push("feeState.state has unknown state: " + record.feeState.state + ".");
      }
    }
    // BTCFi is a separate boolean flag, never conflated with plain BTC
    // holding: it must be a boolean when present, never a balance, a
    // string, or an implied claim.
    if (record.btcFi !== undefined && typeof record.btcFi !== "boolean") {
      errors.push("btcFi must be a boolean flag (true = BTCFi mechanism in use, " +
        "false = plain BTC holding); it is never a balance or a string.");
    }
    if (record.verificationStatus !== undefined &&
        !isKnownState(record.verificationStatus)) {
      errors.push("Unknown verificationStatus: " + record.verificationStatus + ".");
    }
    secretFieldErrors(record, "", errors);
    return errors;
  }

  function blankBitcoinAccount() {
    return {
      ecosystem: "bitcoin",
      nativeAsset: "BTC",
      addressFormats: BITCOIN_ADDRESS_FORMATS.slice(),
      addressFormat: "",
      publicAddress: "",
      network: "",
      utxo: { utxos: [], totalConfirmed: "UNKNOWN", totalUnconfirmed: "UNKNOWN", state: "UNKNOWN" },
      transactionHistory: [],
      feeState: { state: "UNKNOWN" },
      btcFi: false,
      verificationStatus: "UNKNOWN"
    };
  }

  // ---- Non-EVM extensibility descriptors --------------------------------
  // DESCRIBED means the model is defined in this file — address format,
  // token standard, RPC architecture, wallet standard — NOT that a live
  // integration exists. No ecosystem is marked SUPPORTED: there is no
  // implemented capability behind any of these yet, so SUPPORTED would
  // be a false claim. Adding a live integration later means changing
  // that ecosystem's status AND landing the capability; the status
  // alone is never flipped.

  var ECOSYSTEMS = [
    {
      ecosystem: "sui",
      label: "Sui",
      addressFormat: "0x-prefixed hex (32-byte address)",
      tokenStandard: "SUI coin / Move objects (fungible via Coin<T>)",
      rpcArchitecture: "JSON-RPC served by a Sui full node (sui_getObject / sui_getBalance style calls are labels, not live endpoints)",
      walletStandard: "Sui Wallet Standard",
      vm: "MOVE",
      accountModel: "OBJECT",
      status: "DESCRIBED",
      verificationStatus: "UNVERIFIED",
      source: "structural-model",
      note: "DESCRIBED means the model is defined, not that a live integration exists."
    },
    {
      ecosystem: "aptos",
      label: "Aptos",
      addressFormat: "0x-prefixed hex (32-byte address)",
      tokenStandard: "Aptos Coin / fungible assets (Move)",
      rpcArchitecture: "REST / JSON-RPC served by an Aptos full node (labels, not live endpoints)",
      walletStandard: "Aptos Wallet Standard (AIP-62)",
      vm: "MOVE",
      accountModel: "OBJECT",
      status: "DESCRIBED",
      verificationStatus: "UNVERIFIED",
      source: "structural-model",
      note: "DESCRIBED means the model is defined, not that a live integration exists."
    },
    {
      ecosystem: "ton",
      label: "TON",
      addressFormat: "base64 user-friendly address (EQ... / UQ...) or raw workchain:hash form",
      tokenStandard: "Jetton (fungible) / NFT (non-fungible)",
      rpcArchitecture: "TON HTTP API / ADNL (labels, not live endpoints)",
      walletStandard: "TON Connect",
      vm: "OTHER",
      accountModel: "ACCOUNT",
      status: "DESCRIBED",
      verificationStatus: "UNVERIFIED",
      source: "structural-model",
      note: "DESCRIBED means the model is defined, not that a live integration exists."
    },
    {
      ecosystem: "xrp-ledger",
      label: "XRP Ledger",
      addressFormat: "base58 classic address (r... prefix)",
      tokenStandard: "XRP (native) / IOU trust lines (issued currency)",
      rpcArchitecture: "rippled JSON-RPC / WebSocket (labels, not live endpoints)",
      walletStandard: "XRP Ledger wallet (Xaman-style signing is a label, not a connection)",
      vm: "OTHER",
      accountModel: "ACCOUNT",
      status: "DESCRIBED",
      verificationStatus: "UNVERIFIED",
      source: "structural-model",
      note: "DESCRIBED means the model is defined, not that a live integration exists."
    },
    {
      ecosystem: "cardano",
      label: "Cardano",
      addressFormat: "bech32 address (addr1... prefix)",
      tokenStandard: "Native tokens / multi-asset (no smart contract needed to issue)",
      rpcArchitecture: "Ogmios / Koios / Blockfrost-style APIs (labels, not live endpoints)",
      walletStandard: "CIP-30 (dApp wallet bridge)",
      vm: "OTHER",
      accountModel: "ACCOUNT",
      status: "DESCRIBED",
      verificationStatus: "UNVERIFIED",
      source: "structural-model",
      note: "DESCRIBED means the model is defined, not that a live integration exists."
    },
    {
      ecosystem: "cosmos",
      label: "Cosmos",
      addressFormat: "bech32 address (cosmos1... prefix)",
      tokenStandard: "Cosmos SDK tokens / IBC-transferable assets",
      rpcArchitecture: "Cosmos SDK REST / Tendermint RPC (labels, not live endpoints)",
      walletStandard: "Cosmos Kit / Keplr",
      vm: "COSMOS",
      accountModel: "ACCOUNT",
      status: "DESCRIBED",
      verificationStatus: "UNVERIFIED",
      source: "structural-model",
      note: "DESCRIBED means the model is defined, not that a live integration exists."
    },
    {
      ecosystem: "polkadot",
      label: "Polkadot",
      addressFormat: "SS58 address",
      tokenStandard: "Native / parachain assets (Substrate pallets)",
      rpcArchitecture: "Substrate JSON-RPC (Polkadot API style; labels, not live endpoints)",
      walletStandard: "Polkadot.js / Substrate wallet injection",
      vm: "SUBSTRATE",
      accountModel: "ACCOUNT",
      status: "DESCRIBED",
      verificationStatus: "UNVERIFIED",
      source: "structural-model",
      note: "DESCRIBED means the model is defined, not that a live integration exists."
    }
  ];

  var ECOSYSTEM_BY_ID = {};
  ECOSYSTEMS.forEach(function (e) { ECOSYSTEM_BY_ID[e.ecosystem] = e; });

  // Solana and Bitcoin are first-class ecosystems too: their full
  // models live above (describeSolana / describeBitcoin), and their
  // descriptor rows here keep listEcosystems() complete. Their status
  // is DESCRIBED for the same reason: the model is defined, no live
  // integration exists.
  var SOLANA_ROW = {
    ecosystem: "solana",
    label: "Solana",
    addressFormat: "base58",
    tokenStandard: "SPL",
    rpcArchitecture: "Solana JSON-RPC / WebSocket (labels, not live endpoints)",
    walletStandard: "Solana Wallet Adapter",
    vm: "SVM",
    accountModel: "ACCOUNT",
    status: "DESCRIBED",
    verificationStatus: "UNVERIFIED",
    source: "structural-model",
    note: "Full model: describeSolana(). DESCRIBED means the model is defined, not that a live integration exists."
  };

  var BITCOIN_ROW = {
    ecosystem: "bitcoin",
    label: "Bitcoin",
    addressFormat: "P2PKH / P2SH / P2WPKH / P2TR",
    tokenStandard: "BTC (native, UTXO) / no token standard",
    rpcArchitecture: "Bitcoin Core JSON-RPC (labels, not live endpoints)",
    walletStandard: "BIP-32 / BIP-39 derivation (labels only; no keys are ever handled here)",
    vm: "UTXO",
    accountModel: "UTXO",
    status: "DESCRIBED",
    verificationStatus: "UNVERIFIED",
    source: "structural-model",
    note: "Full model: describeBitcoin(). DESCRIBED means the model is defined, not that a live integration exists."
  };

  function listEcosystems() {
    var rows = [clone(SOLANA_ROW), clone(BITCOIN_ROW)];
    ECOSYSTEMS.forEach(function (e) { rows.push(clone(e)); });
    return rows;
  }

  function describeEcosystem(id) {
    if (typeof id !== "string") return null;
    if (id === "solana") return clone(SOLANA_ROW);
    if (id === "bitcoin") return clone(BITCOIN_ROW);
    var found = ECOSYSTEM_BY_ID[id];
    return found ? clone(found) : null;
  }

  // A generic ecosystem record: { ecosystem, addressFormat,
  // tokenStandard, rpcArchitecture, walletStandard, status }. The
  // record must match the known descriptor for its ecosystem: an
  // address format or token standard that contradicts the descriptor
  // is rejected. EVM-shaped fields on a non-EVM ecosystem are
  // rejected with reason "EVM_SHAPE_FOR_NON_EVM". A record claiming
  // SUPPORTED is rejected: no live integration exists behind any
  // ecosystem in this file, so SUPPORTED would be a false claim.
  function validateEcosystemRecord(record) {
    var errors = [];
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return ["Ecosystem record must be an object."];
    }
    if (!isNonEmptyString(record.ecosystem)) {
      errors.push("An ecosystem record needs an ecosystem id.");
      return errors.concat([]);
    }
    var known = describeEcosystem(record.ecosystem);
    if (!known) {
      errors.push("Unknown ecosystem: " + record.ecosystem + ".");
      return errors;
    }
    // Cross-ecosystem rule: never force a non-EVM ecosystem into a
    // numeric chain id + EVM RPC + ERC-20 shape. All eight ecosystems
    // in this module are non-EVM, so any such record is rejected.
    if (typeof record.chainId === "number" && record.erc20 !== undefined) {
      errors.push("EVM_SHAPE_FOR_NON_EVM: a numeric chainId plus erc20 " +
        "fields are EVM-shaped and do not apply to the non-EVM ecosystem \"" +
        record.ecosystem + "\".");
    }
    if (record.chainId !== undefined && record.chainId !== null) {
      errors.push("EVM_SHAPE_FOR_NON_EVM: chainId is an EVM (EIP-155) " +
        "field and does not apply to the non-EVM ecosystem \"" +
        record.ecosystem + "\".");
    }
    if (record.erc20 !== undefined) {
      errors.push("EVM_SHAPE_FOR_NON_EVM: erc20 is an EVM token shape " +
        "and does not apply to the non-EVM ecosystem \"" +
        record.ecosystem + "\".");
    }
    if (record.addressFormat !== undefined &&
        record.addressFormat !== known.addressFormat) {
      errors.push("addressFormat \"" + record.addressFormat +
        "\" does not match the descriptor for \"" + record.ecosystem +
        "\" (" + known.addressFormat + ").");
    }
    if (record.tokenStandard !== undefined &&
        record.tokenStandard !== known.tokenStandard) {
      errors.push("tokenStandard \"" + record.tokenStandard +
        "\" does not match the descriptor for \"" + record.ecosystem +
        "\" (" + known.tokenStandard + ").");
    }
    if (record.rpcArchitecture !== undefined &&
        record.rpcArchitecture !== known.rpcArchitecture) {
      errors.push("rpcArchitecture does not match the descriptor for \"" +
        record.ecosystem + "\".");
    }
    if (record.walletStandard !== undefined &&
        record.walletStandard !== known.walletStandard) {
      errors.push("walletStandard \"" + record.walletStandard +
        "\" does not match the descriptor for \"" + record.ecosystem +
        "\" (" + known.walletStandard + ").");
    }
    if (record.status !== undefined) {
      if (ECOSYSTEM_STATUSES.indexOf(record.status) === -1) {
        errors.push("Unknown ecosystem status: " + record.status +
          " (one of: " + ECOSYSTEM_STATUSES.join(", ") + ").");
      } else if (record.status === "SUPPORTED") {
        errors.push("An ecosystem record must not claim SUPPORTED: no " +
          "live integration exists behind \"" + record.ecosystem +
          "\" in this build, so SUPPORTED would be a false claim.");
      }
    }
    if (record.verificationStatus !== undefined &&
        !isKnownState(record.verificationStatus)) {
      errors.push("Unknown verificationStatus: " + record.verificationStatus + ".");
    }
    secretFieldErrors(record, "", errors);
    return errors;
  }

  var api = {
    ECOSYSTEM_STATUSES: ECOSYSTEM_STATUSES.slice(),
    BITCOIN_ADDRESS_FORMATS: BITCOIN_ADDRESS_FORMATS.slice(),
    SOLANA_DESCRIPTOR: SOLANA_DESCRIPTOR,
    BITCOIN_DESCRIPTOR: BITCOIN_DESCRIPTOR,
    ECOSYSTEMS: ECOSYSTEMS,
    describeSolana: describeSolana,
    validateSolanaAccount: validateSolanaAccount,
    blankSolanaAccount: blankSolanaAccount,
    describeBitcoin: describeBitcoin,
    validateBitcoinAccount: validateBitcoinAccount,
    blankBitcoinAccount: blankBitcoinAccount,
    listEcosystems: listEcosystems,
    describeEcosystem: describeEcosystem,
    validateEcosystemRecord: validateEcosystemRecord
  };

  global.WalletEcosystems = api;
  return api;
})(typeof globalThis !== "undefined" ? globalThis :
  (typeof window !== "undefined" ? window : this));
