/* MTI6-GTADWIY-COCKPIT — API registry, fallback chains, and usage tracking
 *
 * This is the single place where every external source the cockpit may
 * call is listed. Nothing else in the app should hard-code an API URL
 * without an entry here. That rule is what makes "add APIs automatically
 * as we build" safe instead of chaotic:
 *
 *   1. When a new bot/feature needs data, check this registry first.
 *   2. Prefer a live, no-key, CORS-enabled API (browser-direct).
 *   3. If none exists, use a keyed API through a server-side proxy —
 *      the key lives server-side, never in this page.
 *   4. Next, use a public feed / public JSON endpoint (RSS, Atom,
 *      a storefront catalog). This is the hybrid "scrape-last" step
 *      that is still structured data, not HTML parsing.
 *   5. HTML scraping is LAST, server-side only, public pages only,
 *      never behind a login or paywall, never to bypass a block or
 *      a captcha. If a site blocks it, the source is dropped, not
 *      circumvented.
 *   6. Every new source gets a fallback chain (primary + 2 fallbacks),
 *      a usage counter, a cache TTL, and a test — before it is used.
 *   7. Paid or keyed sources are NEVER added silently: they need the
 *      owner's approval first, because they can cost money.
 *
 * Fallback rule (applies to every category):
 *   try primary -> on network error, HTTP error, or 429, try
 *   fallback 1 -> then fallback 2 -> then the last cached value
 *   (labelled stale) -> then an honest error. No fake data, ever.
 *
 * Usage / rate-limit tracking:
 *   Counts in this file are THIS DEVICE's calls, stored locally.
 *   They are an estimate, not the provider's official count — shared
 *   public tiers and keyed dashboards are authoritative for their own
 *   limits. Where a provider publishes a limit, it is recorded below
 *   with its window; where it does not, the limit is "unknown" and
 *   the panel says so instead of inventing a number. Monthly
 *   windows count this calendar month's calls (monthCalls), so a
 *   monthly quota survives day rollovers.
 *
 * CORS verification (Oct 31, 2026, via response headers):
 *   CoinGecko, Coinbase, CoinPaprika, Open-Meteo, Frankfurter, and
 *   GitHub all return Access-Control-Allow-Origin: * (browser-direct).
 *   Kraken and Hacker News echo the requesting origin (browser-direct).
 *   Binance returns 451 here and blocks browser-origin requests, so
 *   Binance is NOT a browser fallback — it is server-side only.
 */
(function (global) {
  "use strict";

  var USAGE_KEY = "mti6_api_usage_v1";

  // limit: { calls: number|null, window: "minute"|"hour"|"day"|"month"|null, note: string }
  var ENTRIES = [
    // Crypto — live, browser-direct, triple chain
    { id: "coingecko", category: "crypto", name: "CoinGecko", auth: "server_key", cors: false, browserDirect: false, status: "live", limit: { calls: 100, window: "minute", note: "Demo plan: 10,000 credits/month (1 request = 1 credit), 100 calls/min — raised from 30/min in May 2026. Attribution required; no commercial license on Demo. Provider dashboard is authoritative." }, monthlyBudget: { credits: 8000, reserve: 2000, note: "Ruled MTI6 internal budget (U3(a)); the router never spends the reserve." }, ttlMs: 5 * 60 * 1000 },
    { id: "coinbase", category: "crypto", name: "Coinbase Spot", auth: "none", cors: true, browserDirect: true, status: "live", limit: { calls: null, window: null, note: "Provider limit — see Coinbase docs; not invented here." }, ttlMs: 5 * 60 * 1000 },
    { id: "coinpaprika", category: "crypto", name: "CoinPaprika", auth: "none", cors: true, browserDirect: true, status: "live", limit: { calls: null, window: null, note: "Provider limit — see CoinPaprika docs; not invented here." }, ttlMs: 5 * 60 * 1000 },
    { id: "kraken", category: "crypto", name: "Kraken Public", auth: "none", cors: true, browserDirect: true, status: "registered", note: "Registered alternative, not in the active crypto chain yet. Swap in only after a browser test on the target device.", limit: { calls: null, window: null, note: "Provider limit — see Kraken docs." }, ttlMs: 5 * 60 * 1000 },
    // Stocks — planned, server-side only
    { id: "stock-proxy", category: "stocks", name: "Stock Proxy (to be configured)", auth: "server_key", cors: false, browserDirect: false, status: "planned", note: "Relative proxy path only, e.g. a Netlify function calling Yahoo or a keyed stock API. Key held server-side.", limit: { calls: null, window: null, note: "Depends on the upstream stock API chosen." }, ttlMs: 5 * 60 * 1000 },
    // Products — live for Shopify, planned for general retail
    { id: "shopify", category: "products", name: "Shopify Storefront Catalog", auth: "none", cors: true, browserDirect: true, status: "live", note: "Per-store <store>/products.json, the catalog the store's own themes use. No universal free product API exists.", limit: { calls: null, window: null, note: "Per-store fair use; no published global limit." }, ttlMs: 12 * 60 * 60 * 1000 },
    { id: "shopsavvy", category: "products", name: "ShopSavvy Data API", auth: "server_key", cors: false, browserDirect: false, status: "planned", note: "Paid source (plans from $49/month in provider material). Needs owner approval before any signup or key.", limit: { calls: null, window: null, note: "Plan-dependent." }, ttlMs: 12 * 60 * 60 * 1000 },
    // GitHub activity — live, browser-direct for public data
    { id: "github-public", category: "github", name: "GitHub REST API (public)", auth: "none", cors: true, browserDirect: true, status: "live", note: "Public repos/events only. Private data needs a token, server-side.", limit: { calls: 60, window: "hour", note: "Unauthenticated: 60/hour. Authenticated: 5,000/hour (token, server-side)." }, ttlMs: 15 * 60 * 1000 },
    // News — live via Hacker News API; RSS is the hybrid second source
    { id: "hacker-news", category: "news", name: "Hacker News API", auth: "none", cors: true, browserDirect: true, status: "live", note: "Top stories and items, no key. General news still needs an RSS/news source per topic.", limit: { calls: null, window: null, note: "Provider limit — see Hacker News docs." }, ttlMs: 30 * 60 * 1000 },
    { id: "rss", category: "news", name: "RSS / Atom Feeds", auth: "none", cors: false, browserDirect: false, status: "planned", note: "Hybrid second source for news: structured feeds, not HTML scraping. Many feeds block browser fetches, so this is proxy/server-side or same-origin only.", limit: { calls: null, window: null, note: "Per-feed fair use." }, ttlMs: 30 * 60 * 1000 },
    { id: "wikipedia", category: "knowledge", name: "Wikipedia Search", auth: "none", cors: true, browserDirect: true, status: "live", note: "No key, browser-direct via origin=* parameter. Used by the global search bar.", limit: { calls: null, window: null, note: "Fair use; no published hard limit in the registry." }, ttlMs: 60 * 60 * 1000 },
    // Weather and forex — live, browser-direct, ready when needed
    { id: "open-meteo", category: "weather", name: "Open-Meteo", auth: "none", cors: true, browserDirect: true, status: "live", note: "No key, non-commercial use. Not yet wired into a panel — registered so a weather bot needs no new research.", limit: { calls: 10000, window: "day", note: "Approx. published daily limit." }, ttlMs: 30 * 60 * 1000 },
    // Capability Router providers (Free-First Fallback Directive, 2026-11-16).
    // These are called ONLY through js/provider-router.js — screens ask for a
    // capability (WorldData.weather, CryptoData.protocol, …), never for a
    // provider. Every attempt the router makes is recorded here, and the
    // router's health() derives from this outcome history plus its breaker.
    { id: "nws", category: "weather", name: "National Weather Service", auth: "none", cors: true, browserDirect: true, status: "live", note: "Open US government data (api.weather.gov), no key. Primary weather + alerts source for US points via the Capability Router; Open-Meteo is the worldwide fallback. NWS asks callers for an identifying User-Agent — browsers cannot set the User-Agent header, so the browser sends its own; if NWS rejects a call the router records the failure and falls back. No proxy is used (proxy expansion is owner-gated).", limit: { calls: null, window: null, note: "No numeric limit published — reasonable use. The router self-imposes a conservative 60 calls/min governor cap; that cap is MTI6's, not NWS's figure." }, ttlMs: 10 * 60 * 1000 },
    { id: "open-meteo-geocoding", category: "geocoding", name: "Open-Meteo Geocoding", auth: "none", cors: true, browserDirect: true, status: "live", note: "Place-name search for the Globe via the Capability Router (WorldData.geocode). Same operator/terms family as Open-Meteo weather: free tier, non-commercial. Photon is a CANDIDATE secondary — not wired.", limit: { calls: 10000, window: "day", note: "Free-tier guideline ≈10,000 calls/day (provider-level, as catalogued for Open-Meteo)." }, ttlMs: 24 * 60 * 60 * 1000 },
    { id: "usgs-earthquakes", category: "geohazards", name: "USGS Earthquake Catalog", auth: "none", cors: true, browserDirect: true, status: "live", note: "Real-time GeoJSON summary feeds (the surface USGS directs automated display to). WorldData.earthquakes reads the M4.5+ past-day feed; markers are the events' real coordinates. US public domain.", limit: { calls: null, window: null, note: "No rate limit published — recorded UNKNOWN in the source catalog; the router self-imposes 60 calls/min." }, ttlMs: 5 * 60 * 1000 },
    { id: "nasa-eonet", category: "events", name: "NASA EONET", auth: "none", cors: true, browserDirect: true, status: "live", note: "Curated natural events (wildfires, storms, volcanoes…) via WorldData.naturalEvents. Each event keeps the upstream source EONET records for it. Does NOT use the api.nasa.gov key gateway.", limit: { calls: null, window: null, note: "No quota published — recorded UNKNOWN in the source catalog; the router self-imposes 60 calls/min." }, ttlMs: 30 * 60 * 1000 },
    // Transit — World Data → Transit/Transportation (World Globe branch,
    // NOT Crypto World). The FIRST proxy-routed provider in the router
    // (v116, owner rulings D1 + D2 + D3, 2026-11-17): the key lives
    // ONLY in the Netlify env var TRANSITLAND_API_KEY (Functions
    // scope) and the browser never sees it. Explorer plan,
    // non-commercial use; per-agency data governance. Routing
    // Platform is DISABLED in MTI6 v1 — its separate 1,000/month
    // quota is untouched. Interline dashboard is authoritative for
    // remaining quota; this device counts only its own calls.
    // ttlMs here is the provider default (stops, slow-changing);
    // departures use their own 3-minute policy in the router
    // (map D9 proposal — awaiting the owner's ruling).
    { id: "transitland", category: "transit", name: "Transitland REST API (Interline)", auth: "server_key", cors: false, browserDirect: false, status: "live", note: "World Data → Transit/Transportation (World Globe branch, NOT Crypto World). First proxy-routed provider: the key lives ONLY in the Netlify env var TRANSITLAND_API_KEY (Functions scope); the browser never sees it. Explorer plan, non-commercial use; per-agency data governance. Routing Platform is DISABLED in MTI6 v1 — its separate 1,000/month quota is untouched. Interline dashboard is authoritative for remaining quota; this device counts only its own calls.", limit: { calls: 5000, window: "month", note: "Explorer plan: REST 5,000/month; Routing 1,000/month is a separate quota (Routing disabled in MTI6 v1). MTI6's internal budget is 4,000 REST/month with a 1,000-call reserve — see js/provider-router.js TRANSIT_MONTHLY_BUDGET. Interline dashboard is authoritative." }, ttlMs: 24 * 60 * 60 * 1000 },
    { id: "defillama", category: "crypto", name: "DefiLlama (free API)", auth: "none", cors: true, browserDirect: true, status: "live", note: "Protocol/chain TVL via CryptoData.protocol / CryptoData.chain — FREE endpoints only. The former free yield endpoints moved to the paid plan on 2026-11-13: yields are a capability gap (owner decision), never called. TVL is DefiLlama's aggregate under its own methodology — labelled, never presented as on-chain-verified.", limit: { calls: null, window: null, note: "No figure in the official docs; secondary sources report ≈300 requests / 5 min per IP. The router governor runs at 50/min and caches the /protocols snapshot instead of looping." }, ttlMs: 30 * 60 * 1000 },
    { id: "dexscreener", category: "crypto", name: "DexScreener", auth: "none", cors: true, browserDirect: true, status: "live", note: "DEX pair/token observations via CryptoData.dexPairsForToken — an indexer (current state only, no OHLCV/history), never a canonical identity authority.", limit: { calls: 300, window: "minute", note: "Documented: 300 requests/min for pairs/tokens/search; 60/min for profiles/boosts (not used). The router governor runs just under the documented limit." }, ttlMs: 5 * 60 * 1000 },
    { id: "frankfurter", category: "forex", name: "Frankfurter (ECB rates)", auth: "none", cors: true, browserDirect: true, status: "live", note: "European Central Bank reference rates, no key. Useful for currency conversion alongside prices. Current host is https://api.frankfurter.dev/v1/latest — the old api.frankfurter.app host now redirects there. No cockpit code calls Frankfurter yet; use the new host when a forex feature is built.", limit: { calls: null, window: null, note: "Fair use; no published hard limit in the registry." }, ttlMs: 60 * 60 * 1000 },
    // Bot knowledge — planned, server-side only
    { id: "web-page-text", category: "knowledge", name: "Public Page Text (browser scrape)", auth: "none", cors: true, browserDirect: true, status: "live", note: "Live but limited: works only for pages that allow browser fetches. Blocked pages are reported, never bypassed; server proxy is the route for those.", limit: { calls: null, window: null, note: "Per-page fair use; no published global limit." }, ttlMs: 60 * 60 * 1000 },
    { id: "ai-backend", category: "knowledge", name: "AI / Search Backend (to be configured)", auth: "server_key", cors: false, browserDirect: false, status: "planned", note: "Server-side proxy for live AI/search knowledge. Key held server-side; cost and limits depend on the provider chosen, so this needs owner approval first.", limit: { calls: null, window: null, note: "Provider-dependent." }, ttlMs: 60 * 60 * 1000 }
  ];

  var CHAINS = {
    crypto: ["coingecko", "coinbase", "coinpaprika"],
    stocks: ["stock-proxy"],
    products: ["shopify"],
    github: ["github-public"],
    news: ["hacker-news", "rss"],
    weather: ["nws", "open-meteo"],
    forex: ["frankfurter"],
    knowledge: ["web-page-text", "ai-backend"]
  };

  function getEntry(id) {
    for (var i = 0; i < ENTRIES.length; i++) if (ENTRIES[i].id === id) return ENTRIES[i];
    return null;
  }

  function listEntries() { return ENTRIES.slice(); }
  function getChain(category) { return (CHAINS[category] || []).slice(); }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // Calendar-month key for monthly quotas (added for Transitland,
  // 2026-11-17, package 3). Monthly counters survive day
  // rollovers — the day counters reset daily, the month counters
  // only on a new calendar month. Records written before this
  // field existed carry no month; they start fresh in the current
  // month rather than inheriting a stale count.
  function monthKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function loadUsage() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(USAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) { return {}; }
  }

  function saveUsage(usage) {
    try { if (global.localStorage) global.localStorage.setItem(USAGE_KEY, JSON.stringify(usage)); }
    catch (e) { /* usage tracking must never break a price/news lookup */ }
  }

  function record(apiId, ok, status) {
    var usage = loadUsage();
    var day = todayKey();
    var month = monthKey();
    if (!usage[apiId] || usage[apiId].day !== day) {
      // Day rollover resets the daily counters but PRESERVES the
      // monthly counters when the stored record is from this
      // calendar month; a new month (or a pre-month-field record)
      // resets them below.
      usage[apiId] = { day: day, calls: 0, success: 0, fail: 0, lastAt: null, lastOk: null, lastStatus: null, recent: [],
        month: (usage[apiId] && usage[apiId].month) || month,
        monthCalls: (usage[apiId] && usage[apiId].monthCalls) || 0,
        monthSuccess: (usage[apiId] && usage[apiId].monthSuccess) || 0,
        monthFail: (usage[apiId] && usage[apiId].monthFail) || 0 };
    }
    var u = usage[apiId];
    if (!u.month || u.month !== month) {
      u.month = month; u.monthCalls = 0; u.monthSuccess = 0; u.monthFail = 0;
    }
    u.calls += 1;
    u.monthCalls += 1;
    if (ok) { u.success += 1; u.monthSuccess += 1; } else { u.fail += 1; u.monthFail += 1; }
    u.lastAt = new Date().toISOString();
    if (ok) u.lastOk = u.lastAt;
    if (status !== undefined && status !== null) u.lastStatus = status;
    u.recent.push(Date.now());
    if (u.recent.length > 200) u.recent = u.recent.slice(u.recent.length - 200);
    saveUsage(usage);
    return u;
  }

  function getUsage() {
    var usage = loadUsage();
    var day = todayKey();
    var month = monthKey();
    return ENTRIES.map(function (e) {
      var stored = usage[e.id] || null;
      // The daily row resets when the day is stale — but the
      // MONTHLY count survives day rollovers: it is read from the
      // stored record whenever that record is from this calendar
      // month, even if its day is yesterday. A record from a
      // previous month counts as zero for this month.
      var sameMonth = stored && stored.month === month;
      var u = stored && stored.day === day ? stored : { calls: 0, success: 0, fail: 0, lastAt: null, lastOk: null, lastStatus: null, recent: [] };
      var callsThisMonth = sameMonth ? (stored.monthCalls || 0) : 0;
      var perMinute = (u.recent || []).filter(function (t) { return Date.now() - t < 60 * 1000; }).length;
      var estimatedRemaining = null;
      if (e.limit && e.limit.calls && e.limit.window === "minute") estimatedRemaining = Math.max(0, e.limit.calls - perMinute);
      if (e.limit && e.limit.calls && e.limit.window === "hour") estimatedRemaining = Math.max(0, e.limit.calls - u.calls);
      if (e.limit && e.limit.calls && e.limit.window === "day") estimatedRemaining = Math.max(0, e.limit.calls - u.calls);
      // Month window (added for Transitland, 2026-11-17, package 3):
      // remaining is the provider allowance minus this device's
      // calls this calendar month. The Interline dashboard stays
      // authoritative — this is this device's count only.
      if (e.limit && e.limit.calls && e.limit.window === "month") estimatedRemaining = Math.max(0, e.limit.calls - callsThisMonth);
      return {
        id: e.id, category: e.category, name: e.name, status: e.status, auth: e.auth,
        cors: e.cors, browserDirect: e.browserDirect, limit: e.limit, note: e.note || "",
        callsToday: u.calls, success: u.success, fail: u.fail,
        callsThisMonth: callsThisMonth,
        callsLastMinute: perMinute, lastAt: u.lastAt, lastOk: u.lastOk, lastStatus: u.lastStatus,
        estimatedRemaining: estimatedRemaining
      };
    });
  }

  function resetUsageForTest() {
    try { if (global.localStorage) global.localStorage.removeItem(USAGE_KEY); } catch (e) {}
  }

  global.ApiRegistry = {
    listEntries: listEntries, getEntry: getEntry, getChain: getChain,
    record: record, getUsage: getUsage, resetUsageForTest: resetUsageForTest,
    USAGE_KEY: USAGE_KEY
  };
})(window);
