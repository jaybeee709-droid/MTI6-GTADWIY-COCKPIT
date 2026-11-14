/* MTI6-GTADWIY-COCKPIT — Search provider registry (Universal Search Phase 1)
 *
 * Safe manual search only. This file lists the providers the Phase 1
 * search bar may use and the source choices it may offer. It performs
 * NO network call, NO scrape, and stores NO secret: every provider
 * below is keyless and browser-direct, except the two that are
 * explicitly marked REQUIRES_SETUP (RSS and the AI backend), which
 * need a server-side proxy and owner approval before they can run.
 * No key, token, password, or wallet value appears in this file.
 *
 * Load order: after js/api-registry.js. The registry is read through
 * a typeof guard only (sourceState); everything in this file works
 * when ApiRegistry is absent, using the static records below, which
 * mirror the ApiRegistry entries as of this build. This file never
 * probes a provider live — runtimeStatus describes how the provider
 * is configured in this build, not a live reachability check
 * (lastChecked stays null until a real check runs elsewhere).
 *
 * Phase 1 scope only: there is no bot-research scope and no onion /
 * Tor scope here. Do NOT add them — they are Phase 2 / Phase 4.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "mti6_search_default_provider_v1";
  var DEFAULT_WEB_PROVIDER = "duckduckgo";

  // The 9 source choices of the Phase 1 search bar, in the order the
  // bar shows them (matches the #global-search-source options in
  // index.html). No bot-research scope, no onion scope.
  var SOURCES = [
    { id: "auto", label: "Auto (bot picks)" },
    { id: "app", label: "This app" },
    { id: "web", label: "Web" },
    { id: "crypto", label: "Crypto" },
    { id: "github", label: "GitHub" },
    { id: "news", label: "News" },
    { id: "knowledge", label: "Saved knowledge" },
    { id: "encyclopedia", label: "Encyclopedia" },
    { id: "page", label: "Page (URL)" }
  ];

  // Every record has EXACTLY these 11 fields: providerId, displayName,
  // searchType, searchUrlTemplate, apiAvailable, apiKeyRequired,
  // proxyRequired, privacyNotes, runtimeStatus, ownerEnabled,
  // verificationStatus, lastChecked. {q} in a template is the query
  // (for github-public it is an "owner/repo" name; for the crypto
  // chain it is the provider's own coin/symbol id — see privacyNotes).
  // A null template means "no direct URL for this provider".
  var PROVIDERS = [
    {
      providerId: "duckduckgo", displayName: "DuckDuckGo", searchType: "web",
      searchUrlTemplate: "https://duckduckgo.com/?q={q}",
      apiAvailable: false, apiKeyRequired: false, proxyRequired: false,
      privacyNotes: "Browser-direct web launch. The query is sent to DuckDuckGo in the browser address bar; no key, no proxy, and the cockpit itself sends nothing.",
      runtimeStatus: "AVAILABLE", ownerEnabled: true,
      verificationStatus: "UNVERIFIED", lastChecked: null
    },
    {
      providerId: "google", displayName: "Google", searchType: "web",
      searchUrlTemplate: "https://www.google.com/search?q={q}",
      apiAvailable: false, apiKeyRequired: false, proxyRequired: false,
      privacyNotes: "Browser-direct web launch. The query is sent to Google in the browser address bar; no key, no proxy, and the cockpit itself sends nothing.",
      runtimeStatus: "AVAILABLE", ownerEnabled: true,
      verificationStatus: "UNVERIFIED", lastChecked: null
    },
    {
      providerId: "bing", displayName: "Bing", searchType: "web",
      searchUrlTemplate: "https://www.bing.com/search?q={q}",
      apiAvailable: false, apiKeyRequired: false, proxyRequired: false,
      privacyNotes: "Browser-direct web launch. The query is sent to Bing in the browser address bar; no key, no proxy, and the cockpit itself sends nothing.",
      runtimeStatus: "AVAILABLE", ownerEnabled: true,
      verificationStatus: "UNVERIFIED", lastChecked: null
    },
    {
      providerId: "brave", displayName: "Brave Search", searchType: "web",
      searchUrlTemplate: "https://search.brave.com/search?q={q}",
      apiAvailable: false, apiKeyRequired: false, proxyRequired: false,
      privacyNotes: "Browser-direct web launch. The query is sent to Brave Search in the browser address bar; no key, no proxy, and the cockpit itself sends nothing.",
      runtimeStatus: "AVAILABLE", ownerEnabled: true,
      verificationStatus: "UNVERIFIED", lastChecked: null
    },
    {
      providerId: "wikipedia", displayName: "Wikipedia", searchType: "api",
      searchUrlTemplate: "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={q}&format=json&origin=*",
      apiAvailable: true, apiKeyRequired: false, proxyRequired: false,
      privacyNotes: "Keyless browser-direct API search, already called by global-search.js. Public encyclopedia content only; no login.",
      runtimeStatus: "AVAILABLE", ownerEnabled: true,
      verificationStatus: "VERIFIED", lastChecked: null
    },
    {
      providerId: "hacker-news", displayName: "Hacker News (Algolia)", searchType: "api",
      searchUrlTemplate: "https://hn.algolia.com/api/v1/search?query={q}&hitsPerPage=5",
      apiAvailable: true, apiKeyRequired: false, proxyRequired: false,
      privacyNotes: "Keyless browser-direct API search, already called by global-search.js. Public stories only; no login.",
      runtimeStatus: "AVAILABLE", ownerEnabled: true,
      verificationStatus: "VERIFIED", lastChecked: null
    },
    {
      providerId: "github-public", displayName: "GitHub (public)", searchType: "api",
      searchUrlTemplate: "https://api.github.com/repos/{q}/events?per_page=10",
      apiAvailable: true, apiKeyRequired: false, proxyRequired: false,
      privacyNotes: "{q} is an \"owner/repo\" name. Public repos and events only (unauthenticated limit 60/hour per the API registry). Private data needs a token held server-side and is NOT available here — private access is never claimed.",
      runtimeStatus: "AVAILABLE", ownerEnabled: true,
      verificationStatus: "VERIFIED", lastChecked: null
    },
    {
      providerId: "rss", displayName: "RSS / Atom Feeds", searchType: "news",
      searchUrlTemplate: null,
      apiAvailable: false, apiKeyRequired: false, proxyRequired: true,
      privacyNotes: "Needs the server-side proxy the API registry already describes as planned. Many feeds block browser requests, so this is NOT browser-direct. Not enabled until the owner approves the proxy.",
      runtimeStatus: "REQUIRES_SETUP", ownerEnabled: false,
      verificationStatus: "NOT_CONFIGURED", lastChecked: null
    },
    {
      providerId: "coingecko", displayName: "CoinGecko", searchType: "api",
      searchUrlTemplate: "https://api.coingecko.com/api/v3/simple/price?ids={q}&vs_currencies=usd&include_24hr_change=true",
      apiAvailable: true, apiKeyRequired: false, proxyRequired: false,
      privacyNotes: "{q} is a CoinGecko coin id (for example \"bitcoin\"). Keyless browser-direct price lookup, already called by price-scout.js. Public tier limit per the API registry (about 30 calls/minute); no limit invented here.",
      runtimeStatus: "AVAILABLE", ownerEnabled: true,
      verificationStatus: "VERIFIED", lastChecked: null
    },
    {
      providerId: "coinbase", displayName: "Coinbase Spot", searchType: "api",
      searchUrlTemplate: "https://api.coinbase.com/v2/prices/{q}-USD/spot",
      apiAvailable: true, apiKeyRequired: false, proxyRequired: false,
      privacyNotes: "{q} is a currency symbol (for example \"BTC\"). Keyless browser-direct spot price, already called by price-scout.js. Provider limit — see Coinbase docs; not invented here.",
      runtimeStatus: "AVAILABLE", ownerEnabled: true,
      verificationStatus: "VERIFIED", lastChecked: null
    },
    {
      providerId: "coinpaprika", displayName: "CoinPaprika", searchType: "api",
      searchUrlTemplate: "https://api.coinpaprika.com/v1/tickers/{q}",
      apiAvailable: true, apiKeyRequired: false, proxyRequired: false,
      privacyNotes: "{q} is a CoinPaprika ticker id. Keyless browser-direct price lookup, already called by price-scout.js. Provider limit — see CoinPaprika docs; not invented here.",
      runtimeStatus: "AVAILABLE", ownerEnabled: true,
      verificationStatus: "VERIFIED", lastChecked: null
    },
    {
      providerId: "encyclopedia-local", displayName: "Encyclopedia (local)", searchType: "local",
      searchUrlTemplate: null,
      apiAvailable: false, apiKeyRequired: false, proxyRequired: false,
      privacyNotes: "Local-only: searches the Crypto World encyclopedia records already imported on this device. Nothing leaves the device.",
      runtimeStatus: "AVAILABLE", ownerEnabled: true,
      verificationStatus: "VERIFIED", lastChecked: null
    },
    {
      providerId: "app-local", displayName: "This app (local)", searchType: "local",
      searchUrlTemplate: null,
      apiAvailable: false, apiKeyRequired: false, proxyRequired: false,
      privacyNotes: "Local-only: vault notes, tasks, projects and expenses from IndexedDB on this device. Nothing leaves the device.",
      runtimeStatus: "AVAILABLE", ownerEnabled: true,
      verificationStatus: "VERIFIED", lastChecked: null
    },
    {
      providerId: "knowledge-local", displayName: "Saved knowledge (local)", searchType: "local",
      searchUrlTemplate: null,
      apiAvailable: false, apiKeyRequired: false, proxyRequired: false,
      privacyNotes: "Local-only: saved bot knowledge on this device. Nothing leaves the device.",
      runtimeStatus: "AVAILABLE", ownerEnabled: true,
      verificationStatus: "VERIFIED", lastChecked: null
    },
    {
      providerId: "ai-backend", displayName: "AI / Search Backend", searchType: "api",
      searchUrlTemplate: null,
      apiAvailable: false, apiKeyRequired: true, proxyRequired: true,
      privacyNotes: "Server-side proxy for live AI/search knowledge. The key lives server-side and is NEVER in this file. Needs owner approval before any signup, key, or use — not configured in Phase 1.",
      runtimeStatus: "REQUIRES_SETUP", ownerEnabled: false,
      verificationStatus: "NOT_CONFIGURED", lastChecked: null
    }
  ];

  var WEB_PROVIDER_IDS = ["duckduckgo", "google", "bing", "brave"];

  function copyRecord(rec) {
    return {
      providerId: rec.providerId, displayName: rec.displayName,
      searchType: rec.searchType, searchUrlTemplate: rec.searchUrlTemplate,
      apiAvailable: rec.apiAvailable, apiKeyRequired: rec.apiKeyRequired,
      proxyRequired: rec.proxyRequired, privacyNotes: rec.privacyNotes,
      runtimeStatus: rec.runtimeStatus, ownerEnabled: rec.ownerEnabled,
      verificationStatus: rec.verificationStatus, lastChecked: rec.lastChecked
    };
  }

  function findRecord(id) {
    if (typeof id !== "string") return null;
    for (var i = 0; i < PROVIDERS.length; i++) {
      if (PROVIDERS[i].providerId === id) return PROVIDERS[i];
    }
    return null;
  }

  function listProviders() {
    var out = [];
    for (var i = 0; i < PROVIDERS.length; i++) out.push(copyRecord(PROVIDERS[i]));
    return out;
  }

  function getProvider(id) {
    try {
      var rec = findRecord(id);
      return rec ? copyRecord(rec) : null;
    } catch (e) { return null; }
  }

  function isWebProvider(id) {
    for (var i = 0; i < WEB_PROVIDER_IDS.length; i++) {
      if (WEB_PROVIDER_IDS[i] === id) return true;
    }
    return false;
  }

  function listWebProviders() {
    var out = [];
    for (var i = 0; i < WEB_PROVIDER_IDS.length; i++) {
      var rec = findRecord(WEB_PROVIDER_IDS[i]);
      if (rec && rec.ownerEnabled) out.push(copyRecord(rec));
    }
    return out;
  }

  function readStoredDefault() {
    try {
      if (typeof global.localStorage === "undefined" || !global.localStorage) return null;
      if (typeof global.localStorage.getItem !== "function") return null;
      return global.localStorage.getItem(STORAGE_KEY);
    } catch (e) { return null; }
  }

  function getDefaultWebProvider() {
    try {
      var stored = readStoredDefault();
      if (typeof stored === "string") {
        var rec = findRecord(stored);
        if (rec && isWebProvider(stored) && rec.ownerEnabled) return stored;
      }
      return DEFAULT_WEB_PROVIDER;
    } catch (e) { return DEFAULT_WEB_PROVIDER; }
  }

  function setDefaultWebProvider(id) {
    try {
      if (typeof id !== "string" || !isWebProvider(id)) return false;
      var rec = findRecord(id);
      if (!rec || !rec.ownerEnabled) return false;
      if (typeof global.localStorage === "undefined" || !global.localStorage) return false;
      if (typeof global.localStorage.setItem !== "function") return false;
      global.localStorage.setItem(STORAGE_KEY, id);
      return true;
    } catch (e) { return false; }
  }

  // Builds a launch URL from the provider template + encoded query
  // only. Never adds a key, token, or wallet value — the URL is the
  // template with {q} replaced by encodeURIComponent(query).
  function buildSearchUrl(providerId, query) {
    try {
      var rec = findRecord(providerId);
      if (!rec) return null;
      if (!rec.ownerEnabled) return null;
      if (typeof rec.searchUrlTemplate !== "string" || !rec.searchUrlTemplate) return null;
      if (query === null || query === undefined) return null;
      var q = String(query).trim();
      if (q === "") return null;
      return rec.searchUrlTemplate.split("{q}").join(encodeURIComponent(q));
    } catch (e) { return null; }
  }

  // typeof-guarded layer checks. A layer that is not loaded is
  // reported NOT_CONNECTED, never faked as AVAILABLE.
  function layerPresent(name) {
    try {
      return typeof global[name] !== "undefined" && !!global[name];
    } catch (e) { return false; }
  }

  function hasApiEntry(id) {
    try {
      if (typeof global.ApiRegistry === "undefined" || !global.ApiRegistry) return false;
      if (typeof global.ApiRegistry.getEntry !== "function") return false;
      return !!global.ApiRegistry.getEntry(id);
    } catch (e) { return false; }
  }

  function sourceState(sourceId) {
    try {
      if (typeof sourceId !== "string") return "UNAVAILABLE";
      switch (sourceId) {
        case "bot":
        case "onion":
          // No bot-research scope and no onion scope in Phase 1.
          return "UNAVAILABLE";
        case "auto":
          // Auto can pick any source that is actually there; the web
          // launch providers need no loaded layer, so Auto is
          // available whenever this registry is loaded.
          return (sourceState("app") === "AVAILABLE" ||
            sourceState("web") === "AVAILABLE" ||
            sourceState("crypto") === "AVAILABLE" ||
            sourceState("github") === "AVAILABLE" ||
            sourceState("news") === "AVAILABLE" ||
            sourceState("knowledge") === "AVAILABLE" ||
            sourceState("encyclopedia") === "AVAILABLE" ||
            sourceState("page") === "AVAILABLE") ? "AVAILABLE" : "NOT_CONNECTED";
        case "app":
          // This app: IndexedDB via CockpitDB.getAll (global-search.js).
          return (layerPresent("CockpitDB") && typeof global.CockpitDB.getAll === "function")
            ? "AVAILABLE" : "NOT_CONNECTED";
        case "web":
          return listWebProviders().length > 0 ? "AVAILABLE" : "NOT_CONNECTED";
        case "crypto":
          // Crypto prices: PriceScout, backed by the ApiRegistry chain.
          return (layerPresent("PriceScout") || hasApiEntry("coingecko"))
            ? "AVAILABLE" : "NOT_CONNECTED";
        case "github":
          return (layerPresent("GitHubDev") || hasApiEntry("github-public"))
            ? "AVAILABLE" : "NOT_CONNECTED";
        case "news":
          // News: the Hacker News API entry in the ApiRegistry
          // (RSS is REQUIRES_SETUP and is not the news layer).
          return hasApiEntry("hacker-news") ? "AVAILABLE" : "NOT_CONNECTED";
        case "knowledge":
          return layerPresent("KnowledgeModel") ? "AVAILABLE" : "NOT_CONNECTED";
        case "encyclopedia":
          return (layerPresent("EncyclopediaBridge") || layerPresent("CryptoWorld"))
            ? "AVAILABLE" : "NOT_CONNECTED";
        case "page":
          // Page (URL): the public-page-text entry in the ApiRegistry.
          return hasApiEntry("web-page-text") ? "AVAILABLE" : "NOT_CONNECTED";
        default:
          return "UNAVAILABLE";
      }
    } catch (e) { return "UNAVAILABLE"; }
  }

  global.SearchProviders = {
    SOURCES: SOURCES,
    listProviders: listProviders,
    getProvider: getProvider,
    listWebProviders: listWebProviders,
    getDefaultWebProvider: getDefaultWebProvider,
    setDefaultWebProvider: setDefaultWebProvider,
    buildSearchUrl: buildSearchUrl,
    sourceState: sourceState
  };
})(window);
