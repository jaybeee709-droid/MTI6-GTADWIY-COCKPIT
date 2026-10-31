/* MTI6-GTADWIY-COCKPIT — Crypto Market screen (read-only)
 * Focused crypto view using PriceScout's triple fallback chain
 * (CoinGecko -> Coinbase -> CoinPaprika, then cached/stale/error).
 * Stocks are not shown here as live: they are still "not connected"
 * until a server-side proxy is configured.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  function fmtPrice(value) {
    var n = Number(value);
    if (!isFinite(n)) return "—";
    return n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function render(root) {
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("crypto") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "₿ Crypto Market"));
    root.appendChild(U.el("p", { class: "api-subtitle" }, "Live crypto prices only. Stocks are not live on this screen — they need a server-side proxy first, so no stock price is shown rather than a fake one."));
    var btn = U.el("button", { class: "btn btn-primary", type: "button" }, "Refresh prices");
    var out = U.el("div", { class: "api-meta" }, "Tap Refresh prices.");
    function load(force) {
      out.textContent = "Loading…";
      if (!global.PriceScout) { out.textContent = "Price Scouts did not load. Reload and try again."; return; }
      global.PriceScout.getCryptoBatch(["BTC", "ETH", "SOL", "DOGE", "XRP", "LTC", "ADA"], { force: !!force }).then(function (results) {
        out.innerHTML = "";
        var list = U.el("ul", { class: "price-offer-list" });
        results.forEach(function (r) {
          var change = r.change24h === null || r.change24h === undefined ? "" : " (" + (r.change24h >= 0 ? "+" : "") + Number(r.change24h).toFixed(2) + "% 24h)";
          list.appendChild(U.el("li", {}, (r.name || r.symbol) + " (" + r.symbol + "): " + (r.price === null ? "unavailable" : fmtPrice(r.price)) + change + " · " + r.status + " from " + (r.source || "—")));
        });
        out.appendChild(list);
      }).catch(function () { out.textContent = "Could not load crypto prices right now. Try again in a minute."; });
    }
    btn.addEventListener("click", function () { load(true); });
    root.appendChild(U.el("div", { class: "api-panel" }, [btn, out]));
    load(false);
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.crypto = { render: render };
})(window);
