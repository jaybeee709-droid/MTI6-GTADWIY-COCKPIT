/* MTI6-GTADWIY-COCKPIT — Price Scouts panel (V1)
 *
 * Dashboard panel for the three PriceScout adapters. This file owns
 * ONLY the panel: inputs, buttons, and result rendering. All price
 * logic, caching, and source handling live in js/price-scout.js.
 *
 * Rules shown in the panel, not hidden in code:
 *   - Every price shows its source and fetch time.
 *   - Live, Cached, and Stale are labelled as such.
 *   - A source that is not connected shows no price at all.
 *   - Price checks are read-only. Nothing here buys, sells, or trades.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  function badge(status) {
    var label = status === "live" ? "Live" : status === "cached" ? "Cached" : status === "stale" ? "Stale" : status === "not_connected" ? "Not connected" : status === "empty" ? "No match" : "Error";
    return U.el("span", { class: "price-badge price-badge-" + status }, label);
  }

  function renderPanel() {
    var panel = U.el("section", { class: "price-panel", "aria-label": "Price Scouts" }, [
      U.el("div", { class: "price-header" }, [
        U.el("div", {}, [
          U.el("h2", { class: "price-title" }, "💲 Price Scouts"),
          U.el("div", { class: "price-subtitle" }, "Live crypto, stock-ready, product-ready. Every price shows its source and time. Read-only — no buying or trading here.")
        ])
      ]),

      // Crypto (live)
      U.el("div", { class: "price-card" }, [
        U.el("div", { class: "price-card-head" }, [
          U.el("h3", { class: "price-card-title" }, "Crypto — Live"),
          U.el("button", { class: "btn btn-ghost btn-sm price-refresh-btn", type: "button" }, "Refresh")
        ]),
        U.el("div", { class: "price-status" }, "Loading live crypto prices… (cached for 5 minutes; public sources are rate-limited, so this does not auto-refresh.)"),
        U.el("div", { class: "price-list" })
      ]),

      // Stocks (source-ready)
      U.el("div", { class: "price-card" }, [
        U.el("div", { class: "price-card-head" }, [
          U.el("h3", { class: "price-card-title" }, "Stocks — Source not connected yet"),
          badge("not_connected")
        ]),
        U.el("div", { class: "price-input-row" }, [
          U.el("input", { class: "input price-ticker-input", type: "text", placeholder: "Ticker, e.g. AAPL", "aria-label": "Stock ticker", autocomplete: "off" }),
          U.el("button", { class: "btn btn-primary price-stock-btn", type: "button" }, "Check")
        ]),
        U.el("div", { class: "price-result price-stock-result" },
          "Watchlist: AAPL, MSFT, GOOGL, TSLA, NVDA, AMZN, META — no prices shown until a server-side stock proxy is configured, because stock APIs need a key or block browser fetches. That proxy holds any key server-side; it never goes in this page.")
      ]),

      // Products (Shopify storefronts)
      U.el("div", { class: "price-card" }, [
        U.el("div", { class: "price-card-head" }, [
          U.el("h3", { class: "price-card-title" }, "Products — Shopify stores"),
          badge("live")
        ]),
        U.el("div", { class: "price-input-row" }, [
          U.el("input", { class: "input price-store-input", type: "text", placeholder: "Store domain, e.g. example.myshopify.com", "aria-label": "Shopify store domain", autocomplete: "off" }),
          U.el("input", { class: "input price-product-input", type: "text", placeholder: "Product name", "aria-label": "Product name", autocomplete: "off" }),
          U.el("button", { class: "btn btn-primary price-product-btn", type: "button" }, "Search")
        ]),
        U.el("div", { class: "price-result price-product-result" },
          "Enter a Shopify store domain and a product name to check that store's public catalog (the same catalog its own themes use). There is no universal free product-price API, so general retail lookup needs a retailer/catalog source configured server-side.")
      ])
    ]);

    if (!global.PriceScout) {
      var statusEl = panel.querySelector(".price-status");
      if (statusEl) statusEl.textContent = "Price scouts did not load. Reload the dashboard and try again.";
      return panel;
    }

    var S = global.PriceScout;

    function renderCrypto(results, force) {
      var list = panel.querySelector(".price-list");
      var status = panel.querySelector(".price-status");
      if (!list) return;
      list.innerHTML = "";
      results.forEach(function (r) {
        if (r.status === "error") {
          list.appendChild(U.el("div", { class: "price-row" }, [
            U.el("span", { class: "price-symbol" }, r.symbol),
            U.el("span", { class: "price-note" }, r.note || "Unavailable.")
          ]));
          return;
        }
        var change = typeof r.change24h === "number"
          ? U.el("span", { class: "price-change " + (r.change24h >= 0 ? "price-up" : "price-down") }, (r.change24h >= 0 ? "+" : "") + r.change24h.toFixed(2) + "% 24h")
          : U.el("span", { class: "price-change" }, "");
        list.appendChild(U.el("div", { class: "price-row" }, [
          U.el("span", { class: "price-symbol" }, r.symbol + (r.name ? " · " + r.name : "")),
          U.el("span", { class: "price-value" }, S.fmtPrice(r.price)),
          change,
          badge(r.status),
          U.el("span", { class: "price-time" }, r.source + " · " + S.fmtTime(r.fetchedAt))
        ]));
      });
      if (status) status.textContent = "Crypto prices above are " + (results.some(function (r) { return r.status === "live"; }) ? "live" : "cached/stale") + " from CoinGecko (Coinbase fallback). Refresh re-checks after the 5-minute cache expires, or forces a fresh check.";
    }

    function loadCrypto(force) {
      var status = panel.querySelector(".price-status");
      if (status) status.textContent = "Loading live crypto prices…";
      S.getCryptoBatch(["BTC", "ETH", "SOL"], { force: !!force }).then(function (results) {
        renderCrypto(results, force);
      }).catch(function () {
        if (status) status.textContent = "Could not reach a crypto price source right now. Try Refresh in a minute.";
      });
    }

    var refreshBtn = panel.querySelector(".price-refresh-btn");
    if (refreshBtn) refreshBtn.addEventListener("click", function () { loadCrypto(true); });

    var stockBtn = panel.querySelector(".price-stock-btn");
    var tickerInput = panel.querySelector(".price-ticker-input");
    function checkStock() {
      var result = panel.querySelector(".price-stock-result");
      var sym = tickerInput ? tickerInput.value.trim().toUpperCase() : "";
      if (!sym) { if (result) result.textContent = "Enter a ticker symbol, for example AAPL."; return; }
      if (result) result.textContent = "Checking " + sym + "…";
      S.getStock(sym, {}).then(function (r) {
        if (result) {
          result.innerHTML = "";
          result.appendChild(badge(r.status));
          result.appendChild(U.el("span", {}, " " + S.formatResult(r)));
        }
      });
    }
    if (stockBtn) stockBtn.addEventListener("click", checkStock);
    if (tickerInput) tickerInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); checkStock(); } });

    var productBtn = panel.querySelector(".price-product-btn");
    var storeInput = panel.querySelector(".price-store-input");
    var productInput = panel.querySelector(".price-product-input");
    function checkProduct() {
      var result = panel.querySelector(".price-product-result");
      var store = storeInput ? storeInput.value.trim() : "";
      var query = productInput ? productInput.value.trim() : "";
      if (result) result.textContent = "Searching " + store + " for “" + query + "”…";
      S.getProducts(store, query, {}).then(function (r) {
        if (!result) return;
        result.innerHTML = "";
        result.appendChild(badge(r.status));
        if (r.status === "error" || r.status === "empty") {
          result.appendChild(U.el("span", {}, " " + (r.note || "No matching products found in that store's catalog.")));
          return;
        }
        result.appendChild(U.el("span", {}, " " + r.offers.length + " offer(s) from " + r.store + ", fetched " + S.fmtTime(r.fetchedAt) + ":"));
        var list = U.el("ul", { class: "price-offer-list" });
        r.offers.forEach(function (o) {
          list.appendChild(U.el("li", {}, (o.title + (o.variant ? " — " + o.variant : "") + ": " + S.fmtPrice(o.price) + (o.compareAt ? " (was " + S.fmtPrice(o.compareAt) + ")" : "") + (o.available ? "" : " — out of stock"))));
        });
        result.appendChild(list);
      });
    }
    if (productBtn) productBtn.addEventListener("click", checkProduct);
    if (productInput) productInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); checkProduct(); } });

    loadCrypto(false);
    return panel;
  }

  global.PriceUI = { renderPanel: renderPanel };
})(window);
