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

    // ---- 7-day price chart (clear colors, phone + desktop) -----------
    var chartTitle = U.el("h3", {}, "Price history — pick a coin");
    var chartOut = U.el("div", { class: "api-meta" }, "Tap a coin to draw its price chart from CoinGecko history. No chart is drawn from made-up data.");
    var coinBtns = ["BTC", "ETH", "SOL", "DOGE", "XRP"].map(function (sym, i) {
      var color = global.Charts ? global.Charts.COLORS[i % global.Charts.COLORS.length] : "#00e5ff";
      var b = U.el("button", { class: "btn btn-ghost btn-sm", type: "button", style: "border-color:" + color + ";color:" + color }, sym);
      b.addEventListener("click", function () { drawChart(sym, 7); });
      return b;
    });
    var dayBtns = [1, 7, 30].map(function (d) {
      var b = U.el("button", { class: "btn btn-ghost btn-sm", type: "button" }, d + "d");
      b.addEventListener("click", function () { drawChart(currentCoin, d); });
      return b;
    });
    var currentCoin = "BTC";
    function drawChart(sym, days) {
      currentCoin = sym;
      chartOut.textContent = "Loading " + sym + " history…";
      if (!global.PriceScout || typeof global.PriceScout.getCryptoHistory !== "function" || !global.Charts) {
        chartOut.textContent = "Charts did not load. Reload and try again.";
        return;
      }
      global.PriceScout.getCryptoHistory(sym, days).then(function (r) {
        if (r.status === "error" || !r.points.length) { chartOut.textContent = r.note || "No history available."; return; }
        var color = global.Charts.COLORS[["BTC", "ETH", "SOL", "DOGE", "XRP"].indexOf(sym) % global.Charts.COLORS.length];
        var pts = r.points.map(function (p) { return { x: p.t, y: p.price }; });
        var first = new Date(r.points[0].t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        var lastD = new Date(r.points[r.points.length - 1].t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        chartOut.innerHTML = global.Charts.lineChart(pts, { color: color, label: sym + " price (USD)", xLabel: first, xLabelEnd: lastD })
          + '<div class="api-meta">Source: CoinGecko history (' + r.status + '). Read-only; not trading advice.</div>';
      }).catch(function () { chartOut.textContent = "Could not load history right now."; });
    }
    root.appendChild(U.el("div", { class: "api-panel" }, [
      chartTitle,
      U.el("div", { class: "price-input-row" }, coinBtns),
      U.el("div", { class: "price-input-row" }, dayBtns),
      chartOut
    ]));
    drawChart("BTC", 7);
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.crypto = { render: render };
})(window);
