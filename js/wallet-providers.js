/* MTI6-GTADWIY-COCKPIT — Wallet provider registry + standards-first discovery
 * (continuous campaign, Wallet spec W2, build-order steps 2-3)
 *
 * This is the RUNTIME provider registry: implemented capabilities only.
 * It does NOT duplicate the Master Integration Registry (js/api-registry.js),
 * which is the RESEARCH registry of every external source the cockpit may
 * call. A provider listed here is SUPPORTED IN SCHEMA — a schema entry is
 * never a live integration, and runtimeStatus says what is actually true
 * right now (NOT_CONNECTED unless a live discovery said otherwise).
 *
 * What this file does:
 *   - A small seeded registry of well-known providers whose connection
 *     standards are confidently known (MetaMask, Phantom, WalletConnect /
 *     Reown, Coinbase Wallet, Ledger). Every seeded record carries
 *     verificationStatus honestly: VERIFIED only with a
 *     documentationReference AND a lastVerifiedAt; otherwise UNVERIFIED.
 *   - Standards-first discovery as pure functions that take a
 *     window-like object as an argument (never read the real window),
 *     so they are testable in node with no DOM and no network:
 *       detectInjectedProviders(windowLike, announcedProviders)
 *         EIP-1193 (window.ethereum, single or multi-provider via the
 *         providers array) and EIP-6963 (announced providers passed
 *         in). Never assumes one wallet owns window.ethereum, never
 *         hard-codes a preferred wallet, returns [] when none are
 *         present — never fabricated providers.
 *       detectSolanaProvider(windowLike)
 *         Solana Wallet Standard shape (window.solana), or null.
 *   - Registry API: listProviders, getProvider, providersByEcosystem,
 *     providersByStandard, validateProvider (error list, never throws),
 *     registerProvider (validates; duplicate walletProviderId rejected;
 *     a record claiming zeroBuildCompatible=true while requiring an
 *     sdk / dependency / projectId / secret / server proxy / OAuth is
 *     rejected as inconsistent).
 *
 * No live connections, no secrets, no API keys, no project IDs, no
 * network calls, no DOM access. Vanilla JS only, one global.
 * Depends on nothing at load time. Truth vocabulary is consulted
 * through a typeof guard with an identical fallback when absent, so
 * this file loads in a bare vm context.
 * Load order when wiring: js/truth.js, js/wallet-intelligence.js,
 * then js/wallet-providers.js.
 *
 *   WalletProviders.listProviders()                 -> provider records []
 *   WalletProviders.getProvider(id)                 -> record | null
 *   WalletProviders.providersByEcosystem(ecosystem) -> records []
 *   WalletProviders.providersByStandard(standard)   -> records []
 *   WalletProviders.validateProvider(record)        -> error strings []
 *   WalletProviders.registerProvider(record)        -> stored record
 *   WalletProviders.detectInjectedProviders(windowLike, announced)
 *                                                   -> discovery records []
 *   WalletProviders.detectSolanaProvider(windowLike)-> discovery record | null
 *   WalletProviders.reset()                         -> true (re-seeds)
 */
(function (global) {
  "use strict";

  // ---- Vocabulary (reused from Truth, with identical fallback) -----------

  var FALLBACK_TRUTH_STATES = ["NOT_CONNECTED", "UNKNOWN", "UNVERIFIED",
    "STALE", "DISABLED", "UNAVAILABLE", "VERIFIED", "LIVE"];

  function truthStates() {
    if (global.Truth && Array.isArray(global.Truth.TRUTH_STATES) &&
        global.Truth.TRUTH_STATES.length) {
      return global.Truth.TRUTH_STATES.slice();
    }
    return FALLBACK_TRUTH_STATES.slice();
  }

  // ---- Closed vocabularies -------------------------------------------------

  // Connection standards this registry knows how to discover. A
  // standard not listed here cannot be claimed by a provider record
  // until the vocabulary is extended deliberately.
  var STANDARDS = ["eip-1193", "eip-6963", "walletconnect",
    "solana-wallet-standard", "hardware", "extension", "injected"];

  var CATEGORIES = ["browser-extension", "mobile-app", "desktop-app",
    "hardware", "protocol", "smart-account", "web-wallet"];

  var CUSTODIAL_STATES = ["non-custodial", "custodial", "hybrid", "unknown"];

  // lifecycleStatus is a statement about what the cockpit can do with
  // this provider TODAY, not about the provider's health in general.
  // "CANDIDATE — ARCHITECTURE CHANGE REQUIRED" means the provider is
  // known and its standard is recorded, but using it needs work this
  // zero-build cannot do yet (a project ID, a server proxy, an SDK or
  // a transport dependency). It is never presented as a live integration.
  var LIFECYCLE_STATUSES = ["ACTIVE",
    "CANDIDATE — ARCHITECTURE CHANGE REQUIRED", "DEPRECATED", "UNKNOWN"];

  // runtimeStatus is the only field that talks about live state, and it
  // starts NOT_CONNECTED for every record. Nothing in this file ever
  // sets it to CONNECTED: only a real discovery / session may do that.
  var RUNTIME_STATUSES = ["NOT_CONNECTED", "DISCOVERED", "CONNECTED",
    "UNAVAILABLE", "UNKNOWN"];

  // The 24 spec fields every provider record carries.
  var SPEC_FIELDS = ["walletProviderId", "name", "category",
    "connectionStandards", "supportedNetworks", "supportedEcosystems",
    "browserInjected", "mobile", "desktop", "hardware", "smartAccount",
    "custodialState", "projectIdRequired", "secretRequired",
    "OAuthRequired", "serverProxyRequired", "sdkRequired",
    "dependencyRequired", "zeroBuildCompatible", "lifecycleStatus",
    "verificationStatus", "lastVerifiedAt", "documentationReference",
    "runtimeStatus"];

  // The 12 boolean capability / requirement flags.
  var BOOLEAN_FIELDS = ["browserInjected", "mobile", "desktop", "hardware",
    "smartAccount", "projectIdRequired", "secretRequired", "OAuthRequired",
    "serverProxyRequired", "sdkRequired", "dependencyRequired",
    "zeroBuildCompatible"];

  // Requirements that are incompatible with a zero-build claim. A
  // record claiming zeroBuildCompatible=true while any of these is
  // true is inconsistent and is rejected, never stored.
  var ZERO_BUILD_BLOCKERS = ["sdkRequired", "dependencyRequired",
    "projectIdRequired", "secretRequired", "serverProxyRequired",
    "OAuthRequired"];

  // ---- Secret rejection (same patterns as WalletIntelligence) --------------

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
  // Returns a "path" describing the first secret-looking field found,
  // or null. Never throws. The "name" field is treated like the label
  // in WalletIntelligence: only strong patterns are checked there, so
  // a provider honestly named with a weak word is not rejected. The
  // spec's own field names are allowlisted by key: "secretRequired"
  // is a required boolean spec field, not a smuggled credential —
  // its VALUE is still scanned like every other value.
  function findSecret(value, path) {
    if (typeof value === "string") {
      var isName = /(^|\.)name$/.test(path || "");
      var pattern = isName ? STRONG_SECRET_VALUE_PATTERN : SECRET_VALUE_PATTERN;
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
        if (SPEC_FIELDS.indexOf(key) === -1 && isSecretKey(key)) {
          return (path ? path + "." : "") + key;
        }
        var nested = findSecret(value[key], (path ? path + "." : "") + key);
        if (nested) return nested;
      }
    }
    return null;
  }

  // ---- Helpers --------------------------------------------------------------

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

  function isSlug(value) {
    return typeof value === "string" && /^[a-z0-9][a-z0-9-]*$/.test(value);
  }

  function cloneProvider(record) {
    var copy = {};
    SPEC_FIELDS.forEach(function (field) {
      var value = record[field];
      if (Array.isArray(value)) {
        copy[field] = value.slice();
      } else {
        copy[field] = value;
      }
    });
    return copy;
  }

  // ---- Seeded registry -------------------------------------------------------

  // Small set of well-known providers whose connection standards are
  // confidently known. Every seeded record is UNVERIFIED: no seeded
  // record was checked against its documentation at a recorded time
  // in this build, so none claims VERIFIED. documentationReference
  // points at the provider's official docs so a later verification
  // has somewhere to check against; lastVerifiedAt stays null until
  // that check actually happens. runtimeStatus is NOT_CONNECTED for
  // every record: a schema entry is not a live integration.
  function seedProviders() {
    return [
      {
        walletProviderId: "metamask",
        name: "MetaMask",
        category: "browser-extension",
        connectionStandards: ["eip-1193", "eip-6963"],
        supportedNetworks: ["ethereum", "evm"],
        supportedEcosystems: ["evm"],
        browserInjected: true,
        mobile: true,
        desktop: true,
        hardware: false,
        smartAccount: false,
        custodialState: "non-custodial",
        projectIdRequired: false,
        secretRequired: false,
        OAuthRequired: false,
        serverProxyRequired: false,
        sdkRequired: false,
        dependencyRequired: false,
        zeroBuildCompatible: true,
        lifecycleStatus: "ACTIVE",
        verificationStatus: "UNVERIFIED",
        lastVerifiedAt: null,
        documentationReference: "https://docs.metamask.io/",
        runtimeStatus: "NOT_CONNECTED"
      },
      {
        walletProviderId: "phantom",
        name: "Phantom",
        category: "browser-extension",
        connectionStandards: ["solana-wallet-standard"],
        supportedNetworks: ["solana"],
        supportedEcosystems: ["solana"],
        browserInjected: true,
        mobile: true,
        desktop: true,
        hardware: false,
        smartAccount: false,
        custodialState: "non-custodial",
        projectIdRequired: false,
        secretRequired: false,
        OAuthRequired: false,
        serverProxyRequired: false,
        sdkRequired: false,
        dependencyRequired: false,
        zeroBuildCompatible: true,
        lifecycleStatus: "ACTIVE",
        verificationStatus: "UNVERIFIED",
        lastVerifiedAt: null,
        documentationReference: "https://docs.phantom.com/",
        runtimeStatus: "NOT_CONNECTED"
        // Note: Phantom also ships EVM support; it is NOT recorded
        // here until it is verified against the docs at a recorded
        // time. The Solana Wallet Standard entry above is the
        // confidently known one.
      },
      {
        walletProviderId: "walletconnect",
        name: "WalletConnect (Reown)",
        category: "protocol",
        connectionStandards: ["walletconnect"],
        supportedNetworks: ["ethereum", "evm", "solana"],
        supportedEcosystems: ["evm", "solana"],
        browserInjected: false,
        mobile: true,
        desktop: true,
        hardware: false,
        smartAccount: false,
        custodialState: "non-custodial",
        projectIdRequired: true,
        secretRequired: false,
        OAuthRequired: false,
        serverProxyRequired: true,
        sdkRequired: true,
        dependencyRequired: true,
        zeroBuildCompatible: false,
        lifecycleStatus: "CANDIDATE — ARCHITECTURE CHANGE REQUIRED",
        verificationStatus: "UNVERIFIED",
        lastVerifiedAt: null,
        documentationReference: "https://docs.reown.com/walletconnect",
        runtimeStatus: "NOT_CONNECTED"
        // Candidate, not an integration: a WalletConnect project ID
        // and a server proxy are required before any live use. Nothing
        // here connects, and no project ID is stored anywhere.
      },
      {
        walletProviderId: "coinbase-wallet",
        name: "Coinbase Wallet",
        category: "browser-extension",
        connectionStandards: ["eip-1193", "eip-6963"],
        supportedNetworks: ["ethereum", "evm"],
        supportedEcosystems: ["evm"],
        browserInjected: true,
        mobile: true,
        desktop: true,
        hardware: false,
        smartAccount: false,
        custodialState: "non-custodial",
        projectIdRequired: false,
        secretRequired: false,
        OAuthRequired: false,
        serverProxyRequired: false,
        sdkRequired: false,
        dependencyRequired: false,
        zeroBuildCompatible: true,
        lifecycleStatus: "ACTIVE",
        verificationStatus: "UNVERIFIED",
        lastVerifiedAt: null,
        documentationReference: "https://docs.cloud.coinbase.com/wallet-sdk/docs",
        runtimeStatus: "NOT_CONNECTED"
      },
      {
        walletProviderId: "ledger",
        name: "Ledger",
        category: "hardware",
        connectionStandards: ["hardware"],
        supportedNetworks: ["ethereum", "evm", "solana", "bitcoin"],
        supportedEcosystems: ["evm", "solana", "bitcoin"],
        browserInjected: false,
        mobile: true,
        desktop: true,
        hardware: true,
        smartAccount: false,
        custodialState: "non-custodial",
        projectIdRequired: false,
        secretRequired: false,
        OAuthRequired: false,
        serverProxyRequired: false,
        sdkRequired: true,
        dependencyRequired: true,
        zeroBuildCompatible: false,
        lifecycleStatus: "CANDIDATE — ARCHITECTURE CHANGE REQUIRED",
        verificationStatus: "UNVERIFIED",
        lastVerifiedAt: null,
        documentationReference: "https://developers.ledger.com/",
        runtimeStatus: "NOT_CONNECTED"
        // Candidate, not an integration: a hardware transport SDK /
        // dependency is required before any live use. No device is
        // ever accessed from this registry.
      }
    ];
  }

  var providers = seedProviders();

  // ---- Validation -------------------------------------------------------------

  // Returns an array of error strings (empty = valid). Never throws.
  // A record is valid only when: it carries all 24 spec fields, its
  // vocabulary values are known, its booleans are booleans, VERIFIED
  // is backed by a documentation reference AND a verification time,
  // a zeroBuildCompatible=true claim requires nothing the zero build
  // cannot do, and it carries no secret-looking field.
  function validateProvider(record) {
    var errors = [];
    try {
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        return ["Provider record must be an object."];
      }
      SPEC_FIELDS.forEach(function (field) {
        if (record[field] === undefined) {
          errors.push(field + " is required.");
        }
      });
      if (!isSlug(record.walletProviderId)) {
        errors.push("walletProviderId is required and must be a lowercase " +
          "slug (letters, digits, hyphens, starting with a letter or digit).");
      }
      if (!isNonEmptyString(record.name)) {
        errors.push("name is required and must be a non-empty string.");
      }
      if (record.category !== undefined &&
          CATEGORIES.indexOf(record.category) === -1) {
        errors.push("category must be one of: " + CATEGORIES.join(", ") + ".");
      }
      if (record.connectionStandards !== undefined) {
        if (!isStringArray(record.connectionStandards)) {
          errors.push("connectionStandards must be an array of strings.");
        } else {
          if (record.connectionStandards.length === 0) {
            errors.push("connectionStandards must list at least one standard.");
          }
          record.connectionStandards.forEach(function (s) {
            if (STANDARDS.indexOf(s) === -1) {
              errors.push("Unknown connection standard: " + s + ".");
            }
          });
        }
      }
      if (record.supportedNetworks !== undefined &&
          !isStringArray(record.supportedNetworks)) {
        errors.push("supportedNetworks must be an array of strings.");
      }
      if (record.supportedEcosystems !== undefined &&
          !isStringArray(record.supportedEcosystems)) {
        errors.push("supportedEcosystems must be an array of strings.");
      }
      BOOLEAN_FIELDS.forEach(function (field) {
        if (record[field] !== undefined && typeof record[field] !== "boolean") {
          errors.push(field + " must be a boolean.");
        }
      });
      if (record.custodialState !== undefined &&
          CUSTODIAL_STATES.indexOf(record.custodialState) === -1) {
        errors.push("custodialState must be one of: " +
          CUSTODIAL_STATES.join(", ") + ".");
      }
      if (record.lifecycleStatus !== undefined &&
          LIFECYCLE_STATUSES.indexOf(record.lifecycleStatus) === -1) {
        errors.push("lifecycleStatus must be one of: " +
          LIFECYCLE_STATUSES.join(", ") + ".");
      }
      if (record.verificationStatus !== undefined &&
          truthStates().indexOf(record.verificationStatus) === -1) {
        errors.push("Unknown verificationStatus: " + record.verificationStatus + ".");
      }
      if (record.runtimeStatus !== undefined &&
          RUNTIME_STATUSES.indexOf(record.runtimeStatus) === -1) {
        errors.push("runtimeStatus must be one of: " +
          RUNTIME_STATUSES.join(", ") + ".");
      }
      if (record.lastVerifiedAt !== undefined && record.lastVerifiedAt !== null &&
          !parseDate(record.lastVerifiedAt)) {
        errors.push("lastVerifiedAt must be null or a valid date string.");
      }
      if (record.documentationReference !== undefined &&
          typeof record.documentationReference !== "string") {
        errors.push("documentationReference must be a string.");
      }
      // VERIFIED is earned, not claimed: it needs both a source and a time.
      if (record.verificationStatus === "VERIFIED") {
        if (!isNonEmptyString(record.documentationReference)) {
          errors.push("verificationStatus VERIFIED requires a non-empty " +
            "documentationReference.");
        }
        if (!parseDate(record.lastVerifiedAt)) {
          errors.push("verificationStatus VERIFIED requires a valid lastVerifiedAt.");
        }
      }
      // A zero-build claim must not require anything the zero build
      // cannot do. Any single blocker makes the claim inconsistent.
      if (record.zeroBuildCompatible === true) {
        ZERO_BUILD_BLOCKERS.forEach(function (field) {
          if (record[field] === true) {
            errors.push("Inconsistent provider: zeroBuildCompatible is true " +
              "but " + field + " is true — a zero-build provider cannot " +
              "require " + field + ".");
          }
        });
      }
      var secretField = findSecret(record, "");
      if (secretField) {
        errors.push("Field " + secretField +
          " looks like a secret or credential and must not be stored in a provider record.");
      }
    } catch (e) {
      errors.push("Provider validation failed: " + (e && e.message ? e.message : String(e)));
    }
    return errors;
  }

  // ---- Registry API -----------------------------------------------------------

  function listProviders() {
    return providers.map(cloneProvider);
  }

  function getProvider(id) {
    if (typeof id !== "string") return null;
    for (var i = 0; i < providers.length; i++) {
      if (providers[i].walletProviderId === id) return cloneProvider(providers[i]);
    }
    return null;
  }

  function providersByEcosystem(ecosystem) {
    if (typeof ecosystem !== "string") return [];
    var want = ecosystem.trim().toLowerCase();
    if (!want) return [];
    return providers.filter(function (p) {
      return p.supportedEcosystems.some(function (e) {
        return String(e).toLowerCase() === want;
      });
    }).map(cloneProvider);
  }

  function providersByStandard(standard) {
    if (typeof standard !== "string") return [];
    var want = standard.trim().toLowerCase();
    if (!want) return [];
    return providers.filter(function (p) {
      return p.connectionStandards.some(function (s) {
        return String(s).toLowerCase() === want;
      });
    }).map(cloneProvider);
  }

  // Validates, then stores. A duplicate walletProviderId is rejected,
  // and so is any record that fails validateProvider. Throws on
  // invalid input; never stores a partial or inconsistent record.
  function registerProvider(record) {
    var errors = validateProvider(record);
    if (errors.length) {
      throw new Error("Invalid provider: " + errors.join(" "));
    }
    for (var i = 0; i < providers.length; i++) {
      if (providers[i].walletProviderId === record.walletProviderId) {
        throw new Error("A provider with walletProviderId " +
          record.walletProviderId + " already exists.");
      }
    }
    var stored = cloneProvider(record);
    providers.push(stored);
    return cloneProvider(stored);
  }

  // Test / maintenance helper: forgets every registered provider and
  // re-seeds the registry. The honest starting state is the seed set.
  function reset() {
    providers = seedProviders();
    return true;
  }

  // ---- Standards-first discovery (pure functions) -----------------------------

  // The name a provider object claims for itself, via the flags it
  // sets on its own object. Only the two flags this registry knows
  // are read; anything else reports null — a name is never invented.
  function nameFromFlags(provider) {
    if (!provider || typeof provider !== "object") return null;
    if (provider.isMetaMask === true) return "MetaMask";
    if (provider.isCoinbaseWallet === true) return "Coinbase Wallet";
    return null;
  }

  // Discovers injected EIP-1193 / EIP-6963 providers from a
  // window-like object. Takes the window-like object as an argument
  // and never reads the real window, so it is testable in node.
  //
  //   windowLike.ethereum — a single EIP-1193 provider, or a
  //     multi-provider object whose .providers array lists several.
  //     Never assumes one wallet owns window.ethereum: every entry
  //     in the array is reported, and no entry is preferred over
  //     another.
  //   announced — an optional list of EIP-6963 announcement records
  //     { info: { uuid, name, rdns }, provider } passed in by the
  //     caller (the browser listener collects these; this function
  //     only reads the list). A provider object already seen via
  //     window.ethereum is reported once, not twice.
  //
  // Returns discovery records { standard, source, provider, rdns,
  // name, uuid, isMetaMask }, or [] when nothing is present. A name
  // is only ever the provider's own claim (a flag or an announcement
  // info block); an unidentified provider reports name null.
  function detectInjectedProviders(windowLike, announced) {
    var results = [];
    var seen = [];
    function alreadySeen(provider) {
      return seen.indexOf(provider) !== -1;
    }
    function push(record) {
      if (alreadySeen(record.provider)) return;
      seen.push(record.provider);
      results.push(record);
    }
    if (!windowLike || typeof windowLike !== "object") return results;
    var eth = windowLike.ethereum;
    if (eth && typeof eth === "object") {
      if (Array.isArray(eth.providers) && eth.providers.length > 0) {
        eth.providers.forEach(function (p) {
          if (p && typeof p === "object") {
            push({
              standard: "eip-1193",
              source: "window.ethereum.providers",
              provider: p,
              rdns: null,
              name: nameFromFlags(p),
              uuid: null,
              isMetaMask: p.isMetaMask === true
            });
          }
        });
      } else {
        push({
          standard: "eip-1193",
          source: "window.ethereum",
          provider: eth,
          rdns: null,
          name: nameFromFlags(eth),
          uuid: null,
          isMetaMask: eth.isMetaMask === true
        });
      }
    }
    if (Array.isArray(announced)) {
      announced.forEach(function (a) {
        if (!a || typeof a !== "object") return;
        var provider = a.provider;
        if (!provider || typeof provider !== "object") return;
        var info = (a.info && typeof a.info === "object") ? a.info : {};
        push({
          standard: "eip-6963",
          source: "eip6963:announceProvider",
          provider: provider,
          rdns: typeof info.rdns === "string" ? info.rdns : null,
          name: typeof info.name === "string" ? info.name : nameFromFlags(provider),
          uuid: typeof info.uuid === "string" ? info.uuid : null,
          isMetaMask: provider.isMetaMask === true
        });
      });
    }
    return results;
  }

  // Detects a Solana Wallet Standard provider shape from a window-like
  // object (window.solana). Qualifies when it is Phantom (isPhantom)
  // or when it exposes the standard connect + signTransaction
  // interface. Returns a discovery record { standard, source,
  // provider, isPhantom, name } or null when absent or not
  // standard-shaped. A name is only ever the provider's own claim.
  function detectSolanaProvider(windowLike) {
    if (!windowLike || typeof windowLike !== "object") return null;
    var sol = windowLike.solana;
    if (!sol || typeof sol !== "object") return null;
    var isPhantom = sol.isPhantom === true;
    var standardShaped = typeof sol.connect === "function" &&
      typeof sol.signTransaction === "function";
    if (!isPhantom && !standardShaped) return null;
    return {
      standard: "solana-wallet-standard",
      source: "window.solana",
      provider: sol,
      isPhantom: isPhantom,
      name: isPhantom ? "Phantom" : null
    };
  }

  global.WalletProviders = {
    SPEC_FIELDS: SPEC_FIELDS.slice(),
    STANDARDS: STANDARDS.slice(),
    CATEGORIES: CATEGORIES.slice(),
    CUSTODIAL_STATES: CUSTODIAL_STATES.slice(),
    LIFECYCLE_STATUSES: LIFECYCLE_STATUSES.slice(),
    RUNTIME_STATUSES: RUNTIME_STATUSES.slice(),
    listProviders: listProviders,
    getProvider: getProvider,
    providersByEcosystem: providersByEcosystem,
    providersByStandard: providersByStandard,
    validateProvider: validateProvider,
    registerProvider: registerProvider,
    detectInjectedProviders: detectInjectedProviders,
    detectSolanaProvider: detectSolanaProvider,
    reset: reset
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
