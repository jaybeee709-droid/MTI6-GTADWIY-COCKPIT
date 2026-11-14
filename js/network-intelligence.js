/* MTI6-GTADWIY-COCKPIT — Network Intelligence foundation
 * (continuous development campaign: Network Intelligence unit)
 *
 * Runtime foundation for the researched network universe. This layer
 * MODELS networks; it never calls an RPC endpoint, never fetches, never
 * holds a secret, and never claims a network is live. Health is UNKNOWN
 * until an explicit health report says otherwise. Nothing here executes
 * a transaction, signs anything, or connects a wallet.
 *
 * NON-EVM BY DESIGN: no Ethereum behavior is assumed. There is no
 * eth_call logic, no 18-decimal assumption (decimals belong to asset
 * records, never to a network), no EIP-155 chain-id semantics, and no
 * single account model — UTXO and account-based networks are both
 * representable. EVM-only fields (chainId, eip155, eip1559) on a
 * non-EVM network are rejected unless an explicit evmOverrideNote
 * explains why they are there.
 *
 * Truth vocabulary is REUSED, never reinvented:
 *   - verificationStatus values come from CryptoWorld.VERIFICATION_STATES
 *     when loaded, else the same closed 8-value list.
 *   - health / provider status values come from Truth.TRUTH_STATES when
 *     loaded, else the same closed 8-value list (NOT_CONNECTED, UNKNOWN,
 *     UNVERIFIED, STALE, DISABLED, UNAVAILABLE, VERIFIED, LIVE).
 *   - Secret-field rejection follows the CryptoWorld convention.
 *
 * Asset references are by string id only: nativeAsset is referenced by
 * asset-class id + network id, never by ticker alone. The asset-class
 * vocabulary itself lives in Asset Intelligence (js/asset-intelligence.js),
 * which does not exist yet at the time this file was written — so this
 * module validates the SHAPE of the reference (both ids present) and
 * does not resolve it. Resolving assetClassId against the real asset
 * registry is a follow-up once Asset Intelligence lands.
 *
 * Pure functions only: no DOM, no network, no secrets, no storage.
 * Adding a network is a data operation (addNetwork), not a code change.
 *
 * RPC FAILOVER (Crypto spec C11): resolveProvider() orders a provider
 * chain PRIMARY -> FALLBACK_1 -> FALLBACK_2 -> KEYLESS_PUBLIC by
 * declared health, never by fetching. Provider health records and the
 * bounded failover log live in memory only (no persistence): a fresh
 * load starts UNKNOWN, which is the honest default. Public RPC
 * availability is not production reliability — a KEYLESS_PUBLIC
 * provider is never promoted above a HEALTHY PRIMARY/FALLBACK.
 */
(function (global) {
  "use strict";

  // ---- Truth vocabulary, reused (never a competing copy) ----
  var VERIFICATION_STATES = (global.CryptoWorld &&
    global.CryptoWorld.VERIFICATION_STATES) || ["UNKNOWN", "DISCOVERED",
    "UNVERIFIED", "VERIFIED", "STALE", "UNAVAILABLE", "NOT_CONNECTED",
    "DISABLED"];

  var TRUTH_STATES = (global.Truth && global.Truth.TRUTH_STATES) ||
    ["NOT_CONNECTED", "UNKNOWN", "UNVERIFIED", "STALE", "DISABLED",
      "UNAVAILABLE", "VERIFIED", "LIVE"];

  // Secret-field names, same convention as CryptoWorld.SECRET_FIELDS.
  var SECRET_FIELDS = ["seedphrase", "seed", "mnemonic", "privatekey",
    "apikey", "apisecret", "password", "secret"];

  var ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  // ---- Network model vocabulary (closed lists) ----
  // VM / ecosystem of a network. OTHER covers anything not listed; the
  // detail goes in vmNotes, never in a made-up VM value.
  var VM_TYPES = ["EVM", "SVM", "MOVE", "COSMOS", "UTXO", "SUBSTRATE",
    "OTHER"];

  // Account model of a network. UTXO vs account-based is a first-class
  // distinction; MOVE networks use an object/resource model.
  var ACCOUNT_MODELS = ["ACCOUNT", "UTXO", "OBJECT", "OTHER"];

  // The account model each VM normally implies. Enforced only when both
  // vm and accountModel are present; OTHER vm accepts any model.
  var VM_ACCOUNT_MODELS = {
    EVM: "ACCOUNT",
    SVM: "ACCOUNT",
    COSMOS: "ACCOUNT",
    SUBSTRATE: "ACCOUNT",
    UTXO: "UTXO",
    MOVE: "OBJECT"
  };

  // Fields that only mean something under EVM / EIP-155 semantics.
  // chainId is nullable even for EVM networks (not every network has an
  // EVM-style chain id); on a non-EVM network a non-null chainId (or any
  // other field here) needs an explicit evmOverrideNote.
  var EVM_ONLY_FIELDS = ["chainId", "eip155", "eip1559"];

  // Relationship of an asset class to a network.
  var ASSET_RELATIONSHIPS = ["NATIVE", "WRAPPED", "BRIDGED", "SUPPORTED",
    "ISSUED_ON", "OTHER"];

  // Provider kinds. A kind is a transport label, never a live endpoint.
  var PROVIDER_KINDS = ["HTTP", "WS", "IPC", "OTHER"];

  // ---- Network families (structural examples only) ----
  // These four families are EXAMPLES of structure, not verified facts
  // about live networks: every one carries verificationStatus UNVERIFIED
  // and source "structural-example". Real network records arrive through
  // researched import with a real source, never by promoting an example.
  var FAMILIES = [
    {
      id: "ethereum-family",
      name: "Ethereum-family",
      vm: "EVM",
      accountModel: "ACCOUNT",
      description: "EVM account-based networks in the Ethereum family.",
      verificationStatus: "UNVERIFIED",
      source: "structural-example"
    },
    {
      id: "bitcoin-family",
      name: "Bitcoin-family",
      vm: "UTXO",
      accountModel: "UTXO",
      description: "UTXO-based networks in the Bitcoin family.",
      verificationStatus: "UNVERIFIED",
      source: "structural-example"
    },
    {
      id: "solana-family",
      name: "Solana-family",
      vm: "SVM",
      accountModel: "ACCOUNT",
      description: "SVM account-based networks in the Solana family.",
      verificationStatus: "UNVERIFIED",
      source: "structural-example"
    },
    {
      id: "cosmos-family",
      name: "Cosmos-family",
      vm: "COSMOS",
      accountModel: "ACCOUNT",
      description: "Cosmos/Tendermint account-based networks in the Cosmos family.",
      verificationStatus: "UNVERIFIED",
      source: "structural-example"
    }
  ];

  // ---- Example networks (structural examples only) ----
  // One example per family, demonstrating the model — including a UTXO
  // network with no chain id and no EVM fields. Endpoint labels are
  // placeholders (example.invalid): they name a slot, never a real
  // endpoint, and nothing here ever dials one. All UNVERIFIED, source
  // "structural-example".
  var EXAMPLE_NETWORKS = [
    {
      id: "ethereum-mainnet",
      name: "Ethereum",
      familyId: "ethereum-family",
      vm: "EVM",
      vmNotes: "EVM, account-based, EIP-155 chain id 1.",
      accountModel: "ACCOUNT",
      chainId: 1,
      nativeAsset: { assetClassId: "native-coins", networkId: "ethereum-mainnet", ticker: "ETH" },
      rpcProviders: [
        { kind: "HTTP", endpointLabel: "example.invalid/eth-http-1", priority: 1, status: "UNKNOWN" },
        { kind: "WS", endpointLabel: "example.invalid/eth-ws-1", priority: 2, status: "UNKNOWN" }
      ],
      fallbackProviders: [
        { kind: "HTTP", endpointLabel: "example.invalid/eth-http-fallback-1", status: "UNKNOWN" }
      ],
      health: { status: "UNKNOWN" },
      freshness: { lastChecked: null, maxAgeMs: null },
      explorer: { label: "Example explorer", urlTemplate: "https://example.invalid/tx/{txHash}" },
      walletCompatibility: ["EIP-1193"],
      assetRelationships: [
        { assetClassId: "native-coins", relationship: "NATIVE" },
        { assetClassId: "fungible-tokens", relationship: "ISSUED_ON" }
      ],
      verificationStatus: "UNVERIFIED",
      source: "structural-example"
    },
    {
      id: "bitcoin-mainnet",
      name: "Bitcoin",
      familyId: "bitcoin-family",
      vm: "UTXO",
      vmNotes: "UTXO-based, no EVM semantics, no chain id.",
      accountModel: "UTXO",
      chainId: null,
      nativeAsset: { assetClassId: "native-coins", networkId: "bitcoin-mainnet", ticker: "BTC" },
      rpcProviders: [
        { kind: "HTTP", endpointLabel: "example.invalid/btc-http-1", priority: 1, status: "UNKNOWN" }
      ],
      fallbackProviders: [],
      health: { status: "UNKNOWN" },
      freshness: { lastChecked: null, maxAgeMs: null },
      explorer: { label: "Example explorer", urlTemplate: "https://example.invalid/tx/{txHash}" },
      walletCompatibility: ["BIP-32"],
      assetRelationships: [
        { assetClassId: "native-coins", relationship: "NATIVE" }
      ],
      verificationStatus: "UNVERIFIED",
      source: "structural-example"
    },
    {
      id: "solana-mainnet",
      name: "Solana",
      familyId: "solana-family",
      vm: "SVM",
      vmNotes: "SVM, account-based, no EVM chain id.",
      accountModel: "ACCOUNT",
      chainId: null,
      nativeAsset: { assetClassId: "native-coins", networkId: "solana-mainnet", ticker: "SOL" },
      rpcProviders: [
        { kind: "HTTP", endpointLabel: "example.invalid/sol-http-1", priority: 1, status: "UNKNOWN" },
        { kind: "WS", endpointLabel: "example.invalid/sol-ws-1", priority: 2, status: "UNKNOWN" }
      ],
      fallbackProviders: [],
      health: { status: "UNKNOWN" },
      freshness: { lastChecked: null, maxAgeMs: null },
      explorer: { label: "Example explorer", urlTemplate: "https://example.invalid/tx/{txHash}" },
      walletCompatibility: ["WALLET-ADAPTER"],
      assetRelationships: [
        { assetClassId: "native-coins", relationship: "NATIVE" },
        { assetClassId: "fungible-tokens", relationship: "ISSUED_ON" }
      ],
      verificationStatus: "UNVERIFIED",
      source: "structural-example"
    },
    {
      id: "cosmos-hub",
      name: "Cosmos Hub",
      familyId: "cosmos-family",
      vm: "COSMOS",
      vmNotes: "Cosmos/Tendermint, account-based, no EVM chain id.",
      accountModel: "ACCOUNT",
      chainId: null,
      nativeAsset: { assetClassId: "native-coins", networkId: "cosmos-hub", ticker: "ATOM" },
      rpcProviders: [
        { kind: "HTTP", endpointLabel: "example.invalid/atom-http-1", priority: 1, status: "UNKNOWN" }
      ],
      fallbackProviders: [
        { kind: "HTTP", endpointLabel: "example.invalid/atom-http-fallback-1", status: "UNKNOWN" }
      ],
      health: { status: "UNKNOWN" },
      freshness: { lastChecked: null, maxAgeMs: null },
      explorer: { label: "Example explorer", urlTemplate: "https://example.invalid/tx/{txHash}" },
      walletCompatibility: ["COSMOS-KIT"],
      assetRelationships: [
        { assetClassId: "native-coins", relationship: "NATIVE" }
      ],
      verificationStatus: "UNVERIFIED",
      source: "structural-example"
    }
  ];

  // ---- Helpers ----

  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim() !== "";
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  // Default health: UNKNOWN. Health is never guessed, never inherited
  // from a provider, never "OK" by default.
  function defaultHealth() {
    return { status: "UNKNOWN" };
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

  // A label must not smuggle credentials: reject userinfo in anything
  // shaped like a URL (user:pass@host).
  function hasEmbeddedCredentials(label) {
    return /:\/\/[^\/]*@/.test(String(label));
  }

  // ---- Validation ----

  function validateProvider(p, where) {
    var errors = [];
    if (!p || typeof p !== "object" || Array.isArray(p)) {
      return [where + " must be an object."];
    }
    if (!isNonEmptyString(p.kind)) {
      errors.push(where + " needs a kind.");
    } else if (PROVIDER_KINDS.indexOf(p.kind) === -1) {
      errors.push(where + " has unknown kind: " + p.kind + ".");
    }
    if (!isNonEmptyString(p.endpointLabel)) {
      errors.push(where + " needs an endpointLabel.");
    } else if (hasEmbeddedCredentials(p.endpointLabel)) {
      errors.push(where + " endpointLabel must not contain credentials.");
    }
    if (p.status !== undefined && TRUTH_STATES.indexOf(p.status) === -1) {
      errors.push(where + " has unknown status: " + p.status + ".");
    }
    return errors;
  }

  function validateNetwork(rec) {
    var errors = [];
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) {
      return ["Network record must be an object."];
    }

    // Identity: id + name + VM. Nothing else identifies a network.
    if (!isNonEmptyString(rec.id)) {
      errors.push("A network needs a non-empty id.");
    } else if (!ID_PATTERN.test(rec.id)) {
      errors.push("Network id must be lowercase slug form (a-z, 0-9, hyphens).");
    }
    if (!isNonEmptyString(rec.name)) {
      errors.push("A network needs a non-empty name.");
    }
    if (!isNonEmptyString(rec.vm)) {
      errors.push("A network needs a vm (ecosystem).");
    } else if (VM_TYPES.indexOf(rec.vm) === -1) {
      errors.push("Unknown vm: " + rec.vm + ".");
    }

    if (rec.vmNotes !== undefined && typeof rec.vmNotes !== "string") {
      errors.push("vmNotes must be a string.");
    }

    // Account model: representable, and consistent with the VM when
    // both are stated. UTXO vs account-based must never be blurred.
    if (rec.accountModel !== undefined) {
      if (ACCOUNT_MODELS.indexOf(rec.accountModel) === -1) {
        errors.push("Unknown accountModel: " + rec.accountModel + ".");
      } else if (isNonEmptyString(rec.vm) && VM_ACCOUNT_MODELS[rec.vm] &&
          rec.accountModel !== VM_ACCOUNT_MODELS[rec.vm]) {
        errors.push("accountModel " + rec.accountModel +
          " is inconsistent with vm " + rec.vm + " (expected " +
          VM_ACCOUNT_MODELS[rec.vm] + ").");
      }
    }

    // Decimals belong to asset records, never to a network: no network
    // may carry a decimals field, so no 18-decimal assumption can hide
    // here.
    if (rec.decimals !== undefined) {
      errors.push("decimals belong to asset records, not networks; remove decimals from the network record.");
    }

    // EVM-only fields on a non-EVM network need an explicit override
    // note. chainId is nullable everywhere; a non-null chainId on a
    // non-EVM network is an EVM (EIP-155) claim and is rejected.
    var hasOverride = isNonEmptyString(rec.evmOverrideNote);
    if (isNonEmptyString(rec.vm) && rec.vm !== "EVM" && !hasOverride) {
      EVM_ONLY_FIELDS.forEach(function (field) {
        if (rec[field] !== undefined && rec[field] !== null) {
          errors.push("EVM-only field \"" + field +
            "\" on a non-EVM network (" + rec.vm +
            ") needs an explicit evmOverrideNote.");
        }
      });
    }
    if (rec.chainId !== undefined && rec.chainId !== null) {
      if (typeof rec.chainId !== "number" ||
          Math.floor(rec.chainId) !== rec.chainId || rec.chainId < 0) {
        errors.push("chainId must be a non-negative integer or null.");
      }
    }
    if (rec.evmOverrideNote !== undefined &&
        typeof rec.evmOverrideNote !== "string") {
      errors.push("evmOverrideNote must be a string.");
    }

    // Native asset: referenced by asset-class id + network id, never by
    // ticker alone. A bare string is a ticker-only reference: rejected.
    if (rec.nativeAsset !== undefined) {
      if (typeof rec.nativeAsset === "string") {
        errors.push("nativeAsset must be an asset-class + network reference, never a ticker alone.");
      } else if (typeof rec.nativeAsset !== "object" || rec.nativeAsset === null) {
        errors.push("nativeAsset must be an object { assetClassId, networkId }.");
      } else {
        if (!isNonEmptyString(rec.nativeAsset.assetClassId)) {
          errors.push("nativeAsset needs an assetClassId.");
        }
        if (!isNonEmptyString(rec.nativeAsset.networkId)) {
          errors.push("nativeAsset needs a networkId.");
        }
        if (rec.nativeAsset.ticker !== undefined &&
            typeof rec.nativeAsset.ticker !== "string") {
          errors.push("nativeAsset ticker must be a string label.");
        }
      }
    }

    // Providers: ordered by priority (rpcProviders) or array order
    // (fallbackProviders). Status, when declared, must be a truth state.
    if (rec.rpcProviders !== undefined) {
      if (!Array.isArray(rec.rpcProviders)) {
        errors.push("rpcProviders must be an array.");
      } else {
        rec.rpcProviders.forEach(function (p, i) {
          errors = errors.concat(validateProvider(p, "rpcProviders[" + i + "]"));
          if (p && typeof p === "object" && typeof p.priority !== "number") {
            errors.push("rpcProviders[" + i + "] needs a numeric priority.");
          }
        });
      }
    }
    if (rec.fallbackProviders !== undefined) {
      if (!Array.isArray(rec.fallbackProviders)) {
        errors.push("fallbackProviders must be an array.");
      } else {
        rec.fallbackProviders.forEach(function (p, i) {
          errors = errors.concat(validateProvider(p, "fallbackProviders[" + i + "]"));
        });
      }
    }

    // Health: UNKNOWN by default; a VERIFIED or LIVE claim needs the
    // report behind it (reportedAt + source), or it is rejected.
    if (rec.health !== undefined) {
      if (!rec.health || typeof rec.health !== "object") {
        errors.push("health must be an object.");
      } else {
        if (rec.health.status !== undefined &&
            TRUTH_STATES.indexOf(rec.health.status) === -1) {
          errors.push("Unknown health status: " + rec.health.status + ".");
        }
        if ((rec.health.status === "VERIFIED" || rec.health.status === "LIVE") &&
            (!isNonEmptyString(rec.health.reportedAt) ||
             !isNonEmptyString(rec.health.source))) {
          errors.push("Health " + rec.health.status +
            " needs reportedAt and source from an explicit health report.");
        }
      }
    }

    // Freshness: lastChecked / maxAgeMs shape only. Freshness is judged
    // by freshnessFor(); it is never stored as a claim of liveness.
    if (rec.freshness !== undefined) {
      if (!rec.freshness || typeof rec.freshness !== "object") {
        errors.push("freshness must be an object.");
      } else {
        if (rec.freshness.lastChecked !== undefined &&
            rec.freshness.lastChecked !== null &&
            typeof rec.freshness.lastChecked !== "string") {
          errors.push("freshness.lastChecked must be an ISO timestamp string or null.");
        }
        if (rec.freshness.maxAgeMs !== undefined &&
            rec.freshness.maxAgeMs !== null &&
            (typeof rec.freshness.maxAgeMs !== "number" || rec.freshness.maxAgeMs < 0)) {
          errors.push("freshness.maxAgeMs must be a non-negative number or null.");
        }
      }
    }

    // Explorer: label + URL pattern TEMPLATE, never a live fetch and
    // never a concrete URL. A template must contain a {placeholder}.
    if (rec.explorer !== undefined) {
      if (!rec.explorer || typeof rec.explorer !== "object") {
        errors.push("explorer must be an object.");
      } else {
        if (!isNonEmptyString(rec.explorer.label)) {
          errors.push("explorer needs a label.");
        }
        if (!isNonEmptyString(rec.explorer.urlTemplate)) {
          errors.push("explorer needs a urlTemplate.");
        } else if (rec.explorer.urlTemplate.indexOf("{") === -1 ||
            rec.explorer.urlTemplate.indexOf("}") === -1) {
          errors.push("explorer urlTemplate must be a pattern with a {placeholder}, not a concrete URL.");
        }
      }
    }

    if (rec.walletCompatibility !== undefined) {
      if (!Array.isArray(rec.walletCompatibility) ||
          rec.walletCompatibility.some(function (w) { return typeof w !== "string"; })) {
        errors.push("walletCompatibility must be an array of wallet standard ids (strings).");
      }
    }

    if (rec.assetRelationships !== undefined) {
      if (!Array.isArray(rec.assetRelationships)) {
        errors.push("assetRelationships must be an array.");
      } else {
        rec.assetRelationships.forEach(function (rel, i) {
          if (!rel || typeof rel !== "object") {
            errors.push("assetRelationships[" + i + "] must be an object.");
          } else {
            if (!isNonEmptyString(rel.assetClassId)) {
              errors.push("assetRelationships[" + i + "] needs an assetClassId.");
            }
            if (!isNonEmptyString(rel.relationship)) {
              errors.push("assetRelationships[" + i + "] needs a relationship.");
            } else if (ASSET_RELATIONSHIPS.indexOf(rel.relationship) === -1) {
              errors.push("assetRelationships[" + i + "] has unknown relationship: " + rel.relationship + ".");
            }
          }
        });
      }
    }

    if (rec.verificationStatus !== undefined &&
        VERIFICATION_STATES.indexOf(rec.verificationStatus) === -1) {
      errors.push("Unknown verificationStatus: " + rec.verificationStatus + ".");
    }
    // Present is not verified: a VERIFIED network needs a source and a
    // last-checked timestamp, or it is rejected.
    if (rec.verificationStatus === "VERIFIED" &&
        (!isNonEmptyString(rec.source) || !isNonEmptyString(rec.lastChecked))) {
      errors.push("A VERIFIED network needs a source and lastChecked timestamp.");
    }

    // No secret-looking fields anywhere in the record, at any depth.
    secretFieldErrors(rec, "", errors);

    return errors;
  }

  function validateFamily(rec) {
    var errors = [];
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) {
      return ["Network family must be an object."];
    }
    if (!isNonEmptyString(rec.id)) errors.push("A family needs a non-empty id.");
    if (!isNonEmptyString(rec.name)) errors.push("A family needs a non-empty name.");
    if (!isNonEmptyString(rec.vm)) {
      errors.push("A family needs a vm.");
    } else if (VM_TYPES.indexOf(rec.vm) === -1) {
      errors.push("Unknown vm: " + rec.vm + ".");
    }
    if (rec.accountModel !== undefined &&
        ACCOUNT_MODELS.indexOf(rec.accountModel) === -1) {
      errors.push("Unknown accountModel: " + rec.accountModel + ".");
    }
    if (rec.verificationStatus !== undefined &&
        VERIFICATION_STATES.indexOf(rec.verificationStatus) === -1) {
      errors.push("Unknown verificationStatus: " + rec.verificationStatus + ".");
    }
    secretFieldErrors(rec, "", errors);
    return errors;
  }

  // ---- Provider fallback logic (pure functions) ----
  // Providers are ordered, never probed. "Available" here means only
  // "not declared down": a provider whose declared status is DISABLED or
  // UNAVAILABLE is skipped. UNKNOWN is not down — it is untested — so
  // it stays a candidate. Nothing here claims live health.

  function providerStatus(p) {
    return (p && typeof p.status === "string") ? p.status : "UNKNOWN";
  }

  function isDeclaredDown(p) {
    var s = providerStatus(p);
    return s === "DISABLED" || s === "UNAVAILABLE";
  }

  // Ordered provider list: rpcProviders by ascending priority (stable),
  // then fallbackProviders in array order. A preference { kind } moves
  // matching-kind providers first, preserving order within each group.
  // Returns a new array; the network record is not mutated.
  function orderProviders(network, preference) {
    if (!network || typeof network !== "object") return [];
    var primaries = (network.rpcProviders || []).slice();
    primaries.sort(function (a, b) {
      var pa = (a && typeof a.priority === "number") ? a.priority : Infinity;
      var pb = (b && typeof b.priority === "number") ? b.priority : Infinity;
      return pa - pb;
    });
    var ordered = primaries.concat((network.fallbackProviders || []).slice());
    var kind = preference && (typeof preference === "string" ?
      preference : preference.kind);
    if (typeof kind === "string" && kind) {
      var matching = ordered.filter(function (p) { return p && p.kind === kind; });
      var rest = ordered.filter(function (p) { return !p || p.kind !== kind; });
      return matching.concat(rest);
    }
    return ordered;
  }

  // First provider in the ordered list that is not declared down, or
  // null when every provider is declared down (or there are none).
  // A null result means "no provider to try on record" — never a claim
  // that the network itself is down.
  function pickProvider(network, preference) {
    var ordered = orderProviders(network, preference);
    for (var i = 0; i < ordered.length; i++) {
      if (!isDeclaredDown(ordered[i])) return ordered[i];
    }
    return null;
  }

  // ---- RPC provider failover chain (Crypto spec C11) ----
  // Pure ordering, no live fetching. A provider chain is an ordered
  // array of { providerId, tier, url?, health } where tier is one of
  // PRIMARY / FALLBACK_1 / FALLBACK_2 / KEYLESS_PUBLIC and health is
  // one of HEALTHY / DEGRADED / DOWN / UNKNOWN. Selection order:
  //   1. First HEALTHY provider in tier order wins.
  //   2. A DEGRADED provider is used only when no HEALTHY provider
  //      exists in any tier (marked DEGRADED_PROVIDER).
  //   3. STALE CACHE is used only when no provider is usable and the
  //      caller explicitly allows it (marked STALE_CACHE).
  //   4. Otherwise UNAVAILABLE with provider null — a failed provider
  //      is never presented as live, and a provider is never invented.
  // UNKNOWN is not usable: untested is not healthy, so an UNKNOWN-only
  // chain is UNAVAILABLE (fail closed, like the rest of this module).
  // KEYLESS_PUBLIC sits last in tier order by design: public RPC
  // availability is not production reliability, so a keyless/public
  // provider is never promoted above a HEALTHY PRIMARY/FALLBACK.
  // providerId values SHOULD be ApiRegistry entry ids when the
  // provider is a registered source (e.g. "coingecko", "coinbase",
  // "coinpaprika", "kraken" — the registry's crypto chain is
  // primary + 2 fallbacks, the same shape as this failover chain).
  // isRegisteredProvider() reports whether the registry knows an id;
  // it is never a gate, because a network's RPC providers are not
  // all registry entries, so an unregistered id is not rejected.
  var PROVIDER_TIERS = ["PRIMARY", "FALLBACK_1", "FALLBACK_2",
    "KEYLESS_PUBLIC"];
  var PROVIDER_HEALTH_STATES = ["HEALTHY", "DEGRADED", "DOWN",
    "UNKNOWN"];
  var FAILOVER_STATES = ["HEALTHY", "DEGRADED_PROVIDER", "STALE_CACHE",
    "UNAVAILABLE"];
  var FAILOVER_LOG_MAX = 200;

  // Tier rank: PRIMARY first, KEYLESS_PUBLIC last.
  var TIER_RANK = { PRIMARY: 0, FALLBACK_1: 1, FALLBACK_2: 2,
    KEYLESS_PUBLIC: 3 };

  // In-memory only: provider health records and the failover log.
  // Nothing is persisted — a fresh load starts UNKNOWN. Health keys
  // are networkId + "\n" + providerId.
  var providerHealthStore = {};
  var failoverLogStore = [];

  function providerHealthKey(networkId, providerId) {
    return String(networkId) + "\n" + String(providerId);
  }

  function isProviderHealthState(v) {
    return PROVIDER_HEALTH_STATES.indexOf(v) !== -1;
  }

  // A providerId is a real registry slot when ApiRegistry knows it.
  // Returns true/false when the registry is loaded, null when it is
  // not (cannot verify). Never a gate: see the section comment above.
  function isRegisteredProvider(providerId) {
    if (!global.ApiRegistry ||
        typeof global.ApiRegistry.getEntry !== "function") return null;
    return global.ApiRegistry.getEntry(providerId) !== null;
  }

  // Record a provider health report { health, checkedAt, source,
  // detail }. health must be in the closed set and checkedAt is
  // REQUIRED: a health record without a checkedAt timestamp is
  // UNKNOWN — stale health is not health. A report that fails
  // validation is rejected (ok: false, errors) AND the stored record
  // for that provider becomes UNKNOWN, so a bad report can never
  // leave a stale HEALTHY standing. Returns { ok, record, errors }.
  function recordProviderHealth(networkId, providerId, report) {
    if (!isNonEmptyString(networkId)) {
      return { ok: false, errors: ["recordProviderHealth needs a networkId."] };
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
    var key = providerHealthKey(networkId, providerId);
    if (errors.length) {
      // Fail closed: the latest report is unusable, so the provider's
      // health is UNKNOWN from here on, whatever it was before.
      var unknownRecord = {
        networkId: networkId,
        providerId: providerId,
        state: "UNKNOWN",
        checkedAt: null,
        source: isNonEmptyString(report.source) ? report.source : "",
        attemptedHealth: isNonEmptyString(health) ? health : null,
        note: "Health report rejected: " + errors.join(" ")
      };
      if (isNonEmptyString(report.detail)) unknownRecord.detail = report.detail;
      providerHealthStore[key] = unknownRecord;
      return { ok: false, errors: errors, record: clone(unknownRecord) };
    }
    var record = {
      networkId: networkId,
      providerId: providerId,
      state: health,
      checkedAt: checkedAt,
      source: isNonEmptyString(report.source) ? report.source : ""
    };
    if (isNonEmptyString(report.detail)) record.detail = report.detail;
    providerHealthStore[key] = record;
    return { ok: true, record: clone(record) };
  }

  // Latest health record for a provider, or { state: "UNKNOWN" } when
  // no valid record exists. Returns a copy, never the stored object.
  function providerHealth(networkId, providerId) {
    var rec = providerHealthStore[providerHealthKey(networkId, providerId)];
    return rec ? clone(rec) : { state: "UNKNOWN" };
  }

  // All recorded health for one network, sorted by providerId.
  function listProviderHealth(networkId) {
    var out = [];
    Object.keys(providerHealthStore).forEach(function (key) {
      var rec = providerHealthStore[key];
      if (rec.networkId === networkId) out.push(clone(rec));
    });
    out.sort(function (a, b) {
      return a.providerId < b.providerId ? -1 :
        (a.providerId > b.providerId ? 1 : 0);
    });
    return out;
  }

  function clearProviderHealth() {
    providerHealthStore = {};
  }

  // Effective health of one chain entry, most specific first:
  //   1. the caller's health map (options.health[providerId])
  //   2. the provider record's own health field
  //   3. the latest recorded health report for (networkId, providerId)
  //   4. UNKNOWN — untested is not healthy.
  function effectiveProviderHealth(networkId, provider, healthMap) {
    var id = provider && provider.providerId;
    if (healthMap && typeof healthMap === "object" &&
        isNonEmptyString(id) && isProviderHealthState(healthMap[id])) {
      return healthMap[id];
    }
    if (provider && isProviderHealthState(provider.health)) {
      return provider.health;
    }
    if (isNonEmptyString(id)) {
      var rec = providerHealthStore[providerHealthKey(networkId, id)];
      if (rec) return rec.state;
    }
    return "UNKNOWN";
  }

  // Append one entry to the bounded failover log (max 200, oldest
  // dropped). The log records WHICH provider was chosen and WHY, so a
  // provider failure is never hidden.
  function appendFailoverLog(entry) {
    failoverLogStore.push(entry);
    if (failoverLogStore.length > FAILOVER_LOG_MAX) {
      failoverLogStore = failoverLogStore.slice(
        failoverLogStore.length - FAILOVER_LOG_MAX);
    }
  }

  // A copy of the failover log, oldest first.
  function failoverLog() {
    return clone(failoverLogStore);
  }

  function clearFailoverLog() {
    failoverLogStore = [];
  }

  // Resolve the best usable provider for a network from an ordered
  // chain. Options: { providers, health, allowStaleCache } where
  // providers is the ordered chain, health is an optional
  // { providerId: health } map, and allowStaleCache (default false)
  // permits the STALE_CACHE outcome. Returns
  //   { state, provider, fallbackState, primaryDown, reason }
  // with state/fallbackState one of HEALTHY / DEGRADED_PROVIDER /
  // STALE_CACHE / UNAVAILABLE and provider null unless a real
  // provider was chosen. When the PRIMARY is DOWN and a fallback is
  // chosen, primaryDown is true and the PRIMARY's failure is in the
  // reason and in the failover log entry. Nothing here fetches.
  function resolveProvider(networkId, options) {
    var opts = (options && typeof options === "object") ? options : {};
    var rawProviders = Array.isArray(opts.providers) ? opts.providers : [];
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
        provider: clone(p),
        health: effectiveProviderHealth(networkId, p, healthMap)
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
        provider: provider ? clone(provider) : null,
        fallbackState: state,
        primaryDown: primaryDown,
        reason: reason
      };
      if (state === "STALE_CACHE") result.staleCache = true;
      appendFailoverLog({
        networkId: isNonEmptyString(networkId) ? networkId : null,
        chosenProviderId: provider ? provider.providerId : null,
        fallbackState: state,
        primaryDown: primaryDown,
        reason: reason,
        at: new Date().toISOString()
      });
      return result;
    }

    // 1. First HEALTHY provider in tier order wins.
    for (var i = 0; i < chain.length; i++) {
      if (chain[i].health === "HEALTHY") {
        var p = chain[i].provider;
        var reason = p.providerId + " (" + p.tier +
          ") is HEALTHY; chosen as first healthy provider in tier order." +
          (primaryDown ? " PRIMARY is DOWN; fallback chosen." : "");
        return finish("HEALTHY", p, reason);
      }
    }
    // 2. DEGRADED only when no HEALTHY provider exists in any tier.
    for (var j = 0; j < chain.length; j++) {
      if (chain[j].health === "DEGRADED") {
        var d = chain[j].provider;
        var dReason = "No HEALTHY provider in any tier; " + d.providerId +
          " (" + d.tier + ") is DEGRADED; degraded provider chosen." +
          (primaryDown ? " PRIMARY is DOWN; fallback chosen." : "");
        return finish("DEGRADED_PROVIDER", d, dReason);
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

  // ---- Health (explicit reports only) ----
  // Health can only be set from an explicit health report record
  // { reportedAt, source, status }. There is no other path: no guessing,
  // no inference from providers, no default "OK". Returns
  // { ok: true, network } with a NEW network object, or
  // { ok: false, errors } leaving the input untouched.
  function applyHealthReport(network, report) {
    var errors = [];
    if (!network || typeof network !== "object") {
      return { ok: false, errors: ["A network record is required."] };
    }
    if (!report || typeof report !== "object") {
      return { ok: false, errors: ["A health report record is required."] };
    }
    if (!isNonEmptyString(report.reportedAt)) {
      errors.push("Health report needs reportedAt.");
    }
    if (!isNonEmptyString(report.source)) {
      errors.push("Health report needs source.");
    }
    if (!isNonEmptyString(report.status)) {
      errors.push("Health report needs status.");
    } else if (TRUTH_STATES.indexOf(report.status) === -1) {
      errors.push("Unknown health report status: " + report.status + ".");
    }
    if (errors.length) return { ok: false, errors: errors };
    var next = clone(network);
    next.health = {
      status: report.status,
      reportedAt: report.reportedAt,
      source: report.source
    };
    if (isNonEmptyString(report.note)) next.health.note = report.note;
    return { ok: true, network: next };
  }

  // Freshness of a network record at a given time (ms since epoch).
  // Returns "FRESH" when lastChecked is within maxAgeMs, "STALE" when
  // it is older, "UNKNOWN" when there is no lastChecked or no maxAgeMs
  // to judge against. UNKNOWN is honest: it says "cannot judge", never
  // "fresh".
  function freshnessFor(network, nowMs) {
    if (!network || !network.freshness) return "UNKNOWN";
    var last = network.freshness.lastChecked;
    var maxAge = network.freshness.maxAgeMs;
    if (!isNonEmptyString(last)) return "UNKNOWN";
    if (typeof maxAge !== "number" || maxAge < 0) return "UNKNOWN";
    var when = Date.parse(last);
    if (isNaN(when)) return "UNKNOWN";
    if (typeof nowMs !== "number" || isNaN(nowMs)) nowMs = Date.now();
    return (nowMs - when) <= maxAge ? "FRESH" : "STALE";
  }

  // ---- Registry operations (data operations, not code changes) ----

  function getFamily(id) {
    var found = null;
    FAMILIES.forEach(function (f) { if (f.id === id) found = f; });
    return found ? clone(found) : null;
  }

  function getExampleNetwork(id) {
    var found = null;
    EXAMPLE_NETWORKS.forEach(function (n) { if (n.id === id) found = n; });
    return found ? clone(found) : null;
  }

  function networksByFamily(records, familyId) {
    return (records || []).filter(function (r) {
      return r && r.familyId === familyId;
    });
  }

  // Add a network record to a list. Pure: returns a new list on success,
  // { ok: false, errors } on failure. Duplicate ids and invalid records
  // are rejected; nothing is overwritten silently.
  function addNetwork(records, record) {
    var errors = validateNetwork(record);
    if (errors.length) return { ok: false, errors: errors };
    var list = (records || []).slice();
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === record.id) {
        return { ok: false, errors: ["A network with id \"" + record.id + "\" already exists."] };
      }
    }
    list.push(clone(record));
    return { ok: true, records: list };
  }

  // A blank network record: identity + VM only, everything else
  // UNKNOWN / empty. The honest starting point for a researched import.
  function blankNetwork(id, name, vm) {
    return {
      id: id,
      name: name,
      vm: vm,
      vmNotes: "",
      accountModel: undefined,
      chainId: null,
      nativeAsset: undefined,
      rpcProviders: [],
      fallbackProviders: [],
      health: defaultHealth(),
      freshness: { lastChecked: null, maxAgeMs: null },
      explorer: undefined,
      walletCompatibility: [],
      assetRelationships: [],
      verificationStatus: "UNKNOWN",
      source: ""
    };
  }

  global.NetworkIntelligence = {
    VM_TYPES: VM_TYPES,
    ACCOUNT_MODELS: ACCOUNT_MODELS,
    VM_ACCOUNT_MODELS: VM_ACCOUNT_MODELS,
    EVM_ONLY_FIELDS: EVM_ONLY_FIELDS,
    ASSET_RELATIONSHIPS: ASSET_RELATIONSHIPS,
    PROVIDER_KINDS: PROVIDER_KINDS,
    VERIFICATION_STATES: VERIFICATION_STATES,
    TRUTH_STATES: TRUTH_STATES,
    FAMILIES: FAMILIES,
    EXAMPLE_NETWORKS: EXAMPLE_NETWORKS,
    defaultHealth: defaultHealth,
    validateNetwork: validateNetwork,
    validateFamily: validateFamily,
    orderProviders: orderProviders,
    pickProvider: pickProvider,
    isDeclaredDown: isDeclaredDown,
    PROVIDER_TIERS: PROVIDER_TIERS,
    PROVIDER_HEALTH_STATES: PROVIDER_HEALTH_STATES,
    FAILOVER_STATES: FAILOVER_STATES,
    FAILOVER_LOG_MAX: FAILOVER_LOG_MAX,
    resolveProvider: resolveProvider,
    recordProviderHealth: recordProviderHealth,
    providerHealth: providerHealth,
    listProviderHealth: listProviderHealth,
    clearProviderHealth: clearProviderHealth,
    failoverLog: failoverLog,
    clearFailoverLog: clearFailoverLog,
    isRegisteredProvider: isRegisteredProvider,
    applyHealthReport: applyHealthReport,
    freshnessFor: freshnessFor,
    getFamily: getFamily,
    getExampleNetwork: getExampleNetwork,
    networksByFamily: networksByFamily,
    addNetwork: addNetwork,
    blankNetwork: blankNetwork
  };
})(typeof globalThis !== "undefined" ? globalThis :
  (typeof window !== "undefined" ? window : this));
