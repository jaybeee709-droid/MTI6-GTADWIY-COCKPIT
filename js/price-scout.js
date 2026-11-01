/* MTI6-GTADWIY-COCKPIT — Price Scouts (V1)
 *
 * One data layer for all three price categories, built on the same rules
 * as Star 3.0:
 *   - No API key, token, or secret in this file or any frontend file.
 *   - Every price carries its source and the time it was fetched.
 *   - A stale price is never presented as live: it is labelled cached
 *     or stale, with its fetch time shown.
 *   - A missing source is never filled with a fake price. Stocks and
 *     general product prices return "not_connected" until a server-side
 *     source is configured — see configure() below.
 *
 * Adapters (V1):
 *   crypto   — LIVE from the browser, no key. CoinGecko public API
 *              (CORS-enabled) first, Coinbase public spot as fallback.
 *              Cache TTL 5 minutes. Rate limits are shared/public, so
 *              the panel fetches on open/Refresh only, never polls.
 *   stocks   — SOURCE-READY, not live in the browser yet. Yahoo and
 *              most keyed stock APIs either block browser fetches
 *              (CORS) or need a key. Live stocks need a server-side
 *              proxy (for example a Netlify function) that calls the
 *              stock API and holds any key server-side. Configure it
 *              with a relative proxy path only — never a key here.
 *   products — LIVE for Shopify storefronts, no key. A Shopify store
 *              exposes its catalog at <store>/products.json, which
 *              the store's own themes use. There is no universal free
 *              product-price API, so general retail lookup stays
 *              "not_connected" until a retailer/catalog API is
 *              configured server-side.
 *
 * Cache: localStorage, per category + symbol/store + query. This is
 * the "saved knowledge" half of the hybrid: stable, offline, and
 * timestamped. Live fetch is the other half, used when the cache is
 * expired or the user taps Refresh.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "mti6_price_cache_v1";
  var TTL = { crypto: 5 * 60 * 1000, stocks: 5 * 60 * 1000, products: 12 * 60 * 60 * 1000 };
  var FETCH_TIMEOUT_MS = 10000;

  var config = {
    stockProxyEndpoint: null // relative, same-origin proxy path only; never a key or third-party URL
  };

  var CRYPTO_IDS = {
    BTC: "bitcoin", ETH: "ethereum", SOL: "solana", DOGE: "dogecoin",
    XRP: "xrp", LTC: "litecoin", ADA: "cardano"
  };
  var CRYPTO_NAMES = {
    BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", DOGE: "Dogecoin",
    XRP: "XRP", LTC: "Litecoin", ADA: "Cardano"
  };
  var COINPAPRIKA_IDS = {
    BTC: "btc-bitcoin", ETH: "eth-ethereum", SOL: "sol-solana", DOGE: "doge-dogecoin",
    XRP: "xrp-xrp", LTC: "ltc-litecoin", ADA: "ada-cardano"
  };

  // Usage recording, if the API registry is loaded. Never blocks a lookup.
  function recordUsage(apiId, ok, status) {
    try {
      if (global.ApiRegistry && typeof global.ApiRegistry.record === "function") {
        global.ApiRegistry.record(apiId, !!ok, status === undefined ? null : status);
      }
    } catch (e) {}
  }
  var STOCK_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "TSLA", "NVDA", "AMZN", "META"];

  function configure(next) {
    if (!next || typeof next !== "object") return { stockProxyEndpoint: config.stockProxyEndpoint };
    if (typeof next.stockProxyEndpoint === "string" && next.stockProxyEndpoint.indexOf("/") === 0) {
      config.stockProxyEndpoint = next.stockProxyEndpoint;
    }
    return { stockProxyEndpoint: config.stockProxyEndpoint };
  }

  function loadCache() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) { return {}; }
  }

  function saveCache(cache) {
    try {
      if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (e) { /* cache failure must not break price lookup */ }
  }

  function cacheKey(category, key) {
    return category + ":" + String(key).toUpperCase();
  }

  function getCached(category, key) {
    var entry = loadCache()[cacheKey(category, key)];
    if (!entry) return null;
    return {
      data: entry.data,
      fetchedAt: entry.fetchedAt,
      fresh: (Date.now() - new Date(entry.fetchedAt).getTime()) < (TTL[category] || TTL.crypto)
    };
  }

  function putCache(category, key, data) {
    var cache = loadCache();
    cache[cacheKey(category, key)] = { data: data, fetchedAt: new Date().toISOString() };
    saveCache(cache);
  }

  function fetchJson(url) {
    var controller = null;
    var signal = undefined;
    try {
      if (typeof AbortController !== "undefined") {
        controller = new AbortController();
        signal = controller.signal;
        setTimeout(function () { try { controller.abort(); } catch (e) {} }, FETCH_TIMEOUT_MS);
      }
    } catch (e) {}
    return global.fetch(url, signal ? { signal: signal } : {}).then(function (res) {
      if (!res.ok) throw new Error("http_" + res.status);
      return res.json();
    });
  }

  function fmtPrice(value) {
    var n = Number(value);
    if (!isFinite(n)) return "—";
    var decimals = n > 0 && n < 1 ? 4 : 2;
    return n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function fmtTime(iso) {
    try { return new Date(iso).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }); }
    catch (e) { return iso || ""; }
  }

  // ---- Crypto (live) ---------------------------------------------------
  function getCrypto(symbol, opts) {
    var sym = String(symbol || "").toUpperCase().trim();
    var id = CRYPTO_IDS[sym];
    if (!id) return Promise.resolve({ category: "crypto", symbol: sym, status: "error", price: null, note: "Unknown crypto symbol. Try BTC, ETH, SOL, DOGE, XRP, LTC, or ADA." });
    var force = opts && opts.force;
    if (!force) {
      var cached = getCached("crypto", sym);
      if (cached && cached.fresh) {
        var d = cached.data;
        return Promise.resolve({ category: "crypto", symbol: sym, name: CRYPTO_NAMES[sym], price: d.price, change24h: d.change24h, currency: "USD", source: d.source, fetchedAt: cached.fetchedAt, status: "cached" });
      }
    }
    // Triple fallback chain, per the API registry: CoinGecko ->
    // Coinbase -> CoinPaprika -> last cached value (stale) -> error.
    // Binance is deliberately NOT in this chain: it blocks
    // browser-origin requests. Each attempt is recorded for the
    // usage / rate-limit list.
    var url = "https://api.coingecko.com/api/v3/simple/price?ids=" + encodeURIComponent(id) + "&vs_currencies=usd&include_24hr_change=true";
    function staleOrError() {
      var stale = getCached("crypto", sym);
      if (stale) return { category: "crypto", symbol: sym, name: CRYPTO_NAMES[sym], price: stale.data.price, change24h: stale.data.change24h, currency: "USD", source: stale.data.source, fetchedAt: stale.fetchedAt, status: "stale" };
      return { category: "crypto", symbol: sym, status: "error", price: null, note: "Could not reach a crypto price source right now (CoinGecko, Coinbase, and CoinPaprika all failed). Try Refresh in a minute — public sources are rate-limited." };
    }
    function tryCoinPaprika() {
      var paprikaId = COINPAPRIKA_IDS[sym];
      if (!paprikaId) return Promise.resolve(staleOrError());
      return fetchJson("https://api.coinpaprika.com/v1/tickers/" + paprikaId).then(function (data) {
        var quote = data && data.quotes && data.quotes.USD;
        var amount = quote && Number(quote.price);
        if (!isFinite(amount)) throw new Error("bad_response");
        recordUsage("coinpaprika", true, 200);
        var result = { category: "crypto", symbol: sym, name: CRYPTO_NAMES[sym], price: amount, change24h: typeof quote.percent_change_24h === "number" ? quote.percent_change_24h : null, currency: "USD", source: "CoinPaprika", fetchedAt: new Date().toISOString(), status: "live" };
        putCache("crypto", sym, { price: result.price, change24h: result.change24h, source: result.source });
        return result;
      }).catch(function () { recordUsage("coinpaprika", false, null); return staleOrError(); });
    }
    function tryCoinbase() {
      if (["BTC", "ETH", "LTC", "SOL"].indexOf(sym) === -1) return tryCoinPaprika();
      return fetchJson("https://api.coinbase.com/v2/prices/" + sym + "-USD/spot").then(function (data) {
        var amount = data && data.data && Number(data.data.amount);
        if (!isFinite(amount)) throw new Error("bad_response");
        recordUsage("coinbase", true, 200);
        var result = { category: "crypto", symbol: sym, name: CRYPTO_NAMES[sym], price: amount, change24h: null, currency: "USD", source: "Coinbase", fetchedAt: new Date().toISOString(), status: "live" };
        putCache("crypto", sym, { price: result.price, change24h: null, source: result.source });
        return result;
      }).catch(function () { recordUsage("coinbase", false, null); return tryCoinPaprika(); });
    }
    return fetchJson(url).then(function (data) {
      var row = data && data[id];
      if (!row || typeof row.usd !== "number") throw new Error("bad_response");
      recordUsage("coingecko", true, 200);
      var result = { category: "crypto", symbol: sym, name: CRYPTO_NAMES[sym], price: row.usd, change24h: typeof row.usd_24h_change === "number" ? row.usd_24h_change : null, currency: "USD", source: "CoinGecko", fetchedAt: new Date().toISOString(), status: "live" };
      putCache("crypto", sym, { price: result.price, change24h: result.change24h, source: result.source });
      return result;
    }).catch(function () { recordUsage("coingecko", false, null); return tryCoinbase(); });
  }

  function getCryptoBatch(symbols, opts) {
    return Promise.all((symbols || []).map(function (s) { return getCrypto(s, opts); }));
  }

  // 7-day price history (CoinGecko market_chart, public, no key).
  // Returns {status, symbol, points:[{t, price}], source} or an honest
  // error result — never invented points. Used by the Crypto screen
  // chart and the Analytics screen. Cached under the crypto TTL to
  // respect the public rate limit.
  function getCryptoHistory(symbol, days) {
    var sym = String(symbol || "").toUpperCase().trim();
    var id = CRYPTO_IDS[sym];
    if (!id) return Promise.resolve({ status: "error", symbol: sym, points: [], note: "Unknown crypto symbol." });
    var d = Number(days) || 7;
    if (d !== 1 && d !== 7 && d !== 30) d = 7;
    var cached = getCached("history", sym + "/" + d);
    if (cached && cached.fresh) return Promise.resolve({ status: "cached", symbol: sym, points: cached.data.points, source: "CoinGecko", fetchedAt: cached.fetchedAt });
    var url = "https://api.coingecko.com/api/v3/coins/" + encodeURIComponent(id) + "/market_chart?vs_currency=usd&days=" + d;
    return fetchJson(url).then(function (data) {
      var prices = (data && data.prices) || [];
      if (!prices.length) throw new Error("bad_response");
      recordUsage("coingecko", true, 200);
      var step = Math.max(1, Math.floor(prices.length / 60));
      var points = [];
      for (var i = 0; i < prices.length; i += step) {
        points.push({ t: prices[i][0], price: prices[i][1] });
      }
      if (points[points.length - 1].t !== prices[prices.length - 1][0]) points.push({ t: prices[prices.length - 1][0], price: prices[prices.length - 1][1] });
      putCache("history", sym + "/" + d, { points: points });
      return { status: "live", symbol: sym, points: points, source: "CoinGecko", fetchedAt: new Date().toISOString() };
    }).catch(function () {
      recordUsage("coingecko", false, null);
      var stale = getCached("history", sym + "/" + d);
      if (stale) return { status: "stale", symbol: sym, points: stale.data.points, source: "CoinGecko", fetchedAt: stale.fetchedAt };
      return { status: "error", symbol: sym, points: [], note: "Could not load price history from CoinGecko right now. No chart is drawn rather than a fake one." };
    });
  }

  // ---- Stocks (source-ready) -------------------------------------------
  function getStock(symbol, opts) {
    var sym = String(symbol || "").toUpperCase().trim();
    if (!sym) return Promise.resolve({ category: "stocks", symbol: sym, status: "error", price: null, note: "Enter a ticker symbol, for example AAPL." });
    if (!config.stockProxyEndpoint) {
      return Promise.resolve({
        category: "stocks", symbol: sym, status: "not_connected", price: null,
        note: "Live stock source not connected yet. Stock APIs need a key or block browser fetches, so live stocks need a server-side proxy that calls the stock API and holds any key server-side. No price is shown here rather than a fake one."
      });
    }
    var url = config.stockProxyEndpoint + "?symbol=" + encodeURIComponent(sym);
    return fetchJson(url).then(function (data) {
      var price = data && Number(data.price);
      if (!isFinite(price)) throw new Error("bad_response");
      var result = { category: "stocks", symbol: sym, price: price, change24h: typeof data.change === "number" ? data.change : null, currency: "USD", source: "Configured stock proxy", fetchedAt: new Date().toISOString(), status: "live" };
      putCache("stocks", sym, { price: result.price, change24h: result.change24h, source: result.source });
      return result;
    }).catch(function () {
      var stale = getCached("stocks", sym);
      if (stale) return { category: "stocks", symbol: sym, price: stale.data.price, change24h: stale.data.change24h, currency: "USD", source: stale.data.source, fetchedAt: stale.fetchedAt, status: "stale" };
      return { category: "stocks", symbol: sym, status: "error", price: null, note: "The configured stock source could not be reached. No price is shown rather than a fake one." };
    });
  }

  // ---- Products (Shopify storefronts) ----------------------------------
  function cleanStoreDomain(input) {
    var s = String(input || "").trim().toLowerCase()
      .replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:.*$/, "");
    return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(s) ? s : "";
  }

  function getProducts(storeInput, query, opts) {
    var store = cleanStoreDomain(storeInput);
    var q = String(query || "").trim().toLowerCase();
    if (!store) return Promise.resolve({ category: "products", status: "error", offers: [], note: "Enter a store domain, for example a Shopify store domain, to check its catalog." });
    if (!q) return Promise.resolve({ category: "products", status: "error", offers: [], note: "Enter a product name to search for in that store's catalog." });
    var cacheId = store + "/" + q;
    if (!(opts && opts.force)) {
      var cached = getCached("products", cacheId);
      if (cached && cached.fresh) return Promise.resolve({ category: "products", status: "cached", store: store, query: q, offers: cached.data.offers, fetchedAt: cached.fetchedAt });
    }
    return fetchJson("https://" + store + "/products.json?limit=250").then(function (data) {
      var products = (data && data.products) || [];
      var offers = [];
      products.forEach(function (p) {
        if (!p || String(p.title || "").toLowerCase().indexOf(q) === -1) return;
        (p.variants || []).slice(0, 3).forEach(function (v) {
          offers.push({
            title: p.title, variant: v.title && v.title !== "Default Title" ? v.title : "",
            price: Number(v.price), compareAt: v.compare_at_price ? Number(v.compare_at_price) : null,
            available: !!v.available, sku: v.sku || ""
          });
        });
      });
      offers = offers.slice(0, 10);
      var result = { category: "products", status: offers.length ? "live" : "empty", store: store, query: q, offers: offers, fetchedAt: new Date().toISOString() };
      recordUsage("shopify", true, 200);
      putCache("products", cacheId, { offers: offers });
      return result;
    }).catch(function () {
      recordUsage("shopify", false, null);
      var stale = getCached("products", cacheId);
      if (stale) return { category: "products", status: "stale", store: store, query: q, offers: stale.data.offers, fetchedAt: stale.fetchedAt };
      return { category: "products", status: "error", offers: [], note: "Could not read that store's catalog. It may not be a Shopify store, it may block browser fetches, or the domain may be wrong. No price is shown rather than a fake one." };
    });
  }

  // ---- Star chat helper --------------------------------------------------
  // Parses a free-text price question into one adapter call and returns
  // a plain-text answer Star can display, always with source and time.
  // Returns null when the text is not a price question.
  function answer(text) {
    var lower = String(text || "").toLowerCase();
    if (!/\b(price|prices|stock|crypto|bitcoin|ethereum|solana|btc|eth)\b/.test(lower)) return Promise.resolve(null);
    var cryptoMatch = null;
    Object.keys(CRYPTO_IDS).forEach(function (sym) {
      if (lower.indexOf(sym.toLowerCase()) !== -1 || lower.indexOf(CRYPTO_IDS[sym]) !== -1) cryptoMatch = sym;
    });
    if (cryptoMatch) {
      return getCrypto(cryptoMatch, {}).then(function (r) { return formatResult(r); });
    }
    var ticker = /\$?([a-z]{1,5})\b/.exec(lower);
    var sym = ticker ? ticker[1].toUpperCase() : "";
    if (STOCK_SYMBOLS.indexOf(sym) !== -1) {
      return getStock(sym, {}).then(function (r) { return formatResult(r); });
    }
    return Promise.resolve(
      "Price Scouts: I can check crypto live right now (try “BTC price”), stocks once a stock source is connected (try “AAPL price” to see that status), " +
      "and Shopify store products from the Prices panel, where you enter the store domain and product name. " +
      "Every price I show comes with its source and fetch time, and I never show a fake price for a source that is not connected."
    );
  }

  function formatResult(r) {
    if (!r) return "";
    if (r.status === "not_connected" || r.status === "error") {
      return (r.symbol ? r.symbol + ": " : "") + (r.note || "Price unavailable.");
    }
    var change = typeof r.change24h === "number" ? " (" + (r.change24h >= 0 ? "+" : "") + r.change24h.toFixed(2) + "% in 24h)" : "";
    var freshness = r.status === "live" ? "Live" : r.status === "cached" ? "Cached" : "Stale (last good value)";
    return r.symbol + (r.name ? " (" + r.name + ")" : "") + ": " + fmtPrice(r.price) + change +
      " — " + freshness + " from " + r.source + ", fetched " + fmtTime(r.fetchedAt) + ". Read-only price check; not trading advice.";
  }

  global.PriceScout = {
    configure: configure,
    getCrypto: getCrypto,
    getCryptoBatch: getCryptoBatch,
    getCryptoHistory: getCryptoHistory,
    getStock: getStock,
    getProducts: getProducts,
    answer: answer,
    formatResult: formatResult,
    fmtPrice: fmtPrice,
    fmtTime: fmtTime,
    CRYPTO_SYMBOLS: Object.keys(CRYPTO_IDS),
    STOCK_SYMBOLS: STOCK_SYMBOLS,
    TTL: TTL
  };
})(window);
