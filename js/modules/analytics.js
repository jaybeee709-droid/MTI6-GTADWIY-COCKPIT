/* MTI6-GTADWIY-COCKPIT — Data Analytics screen
 * Graphs from real data only, never invented numbers:
 * - Crypto: 7-day price line chart (CoinGecko history) + 24h change
 *   bars for the top coins (PriceScout triple fallback).
 * - Spending: your own expenses by category, summed from IndexedDB.
 * - Your cockpit: counts of notes, tasks (done/open), projects,
 *   expenses — from IndexedDB on this device.
 * - API usage: this device's calls today per source, from the
 *   registry's local usage store.
 * Earn has no earnings chart yet on purpose: there are no real
 * earnings to chart until you connect a seller account or record
 * income, and this screen will not invent any.
 * Layout: single column on a phone, two columns on desktop.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  function fmtMoney(n) {
    return Number(n || 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  }

  async function render(root) {
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("analytics") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "📊 Data Analytics"));
    root.appendChild(U.el("p", { class: "api-subtitle" }, "Charts from real data only. Crypto from live public prices, spending and counts from your own cockpit data on this device, API usage from this device's calls. Nothing here is projected or estimated."));

    var grid = U.el("div", { class: "analytics-grid" });

    // ---- Crypto section ----
    var cryptoPanel = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Crypto — 7-day price + 24h change"),
      U.el("div", { class: "api-meta" }, "Loading crypto charts…")
    ]);
    grid.appendChild(cryptoPanel);
    if (global.PriceScout && global.Charts) {
      global.PriceScout.getCryptoHistory("BTC", 7).then(function (r) {
        var body = "";
        if (r.status !== "error" && r.points.length) {
          body += global.Charts.lineChart(r.points.map(function (p) { return { x: p.t, y: p.price }; }), { color: "#f7931a", label: "BTC price (USD)" });
        } else {
          body += '<div class="api-meta">' + (r.note || "No BTC history available.") + "</div>";
        }
        return global.PriceScout.getCryptoBatch(["BTC", "ETH", "SOL", "DOGE", "XRP"], {}).then(function (results) {
          var changes = results.filter(function (x) { return typeof x.change24h === "number"; })
            .map(function (x) { return { label: x.symbol, value: Math.round(x.change24h * 100) / 100 }; });
          body += "<h3>24h change (%)</h3>" + global.Charts.barChart(changes);
          body += '<div class="api-meta">Sources: CoinGecko history + PriceScout chain. Read-only; not trading advice.</div>';
          cryptoPanel.innerHTML = "";
          cryptoPanel.appendChild(U.el("h3", {}, "Crypto — 7-day price + 24h change"));
          cryptoPanel.appendChild(U.el("div", { html: body }));
        });
      }).catch(function () {
        cryptoPanel.appendChild(U.el("div", { class: "api-meta" }, "Could not load crypto charts right now."));
      });
    }

    // ---- Spending section (own data) ----
    var spendPanel = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Spending by category (your data)"),
      U.el("div", { class: "api-meta" }, "Loading…")
    ]);
    grid.appendChild(spendPanel);
    if (global.CockpitDB && global.Charts) {
      global.CockpitDB.getAll("expenses").then(function (rows) {
        var totals = {};
        (rows || []).forEach(function (e) {
          var cat = e.category || "Uncategorized";
          totals[cat] = (totals[cat] || 0) + (Number(e.amount) || 0);
        });
        var items = Object.keys(totals).map(function (k) { return { label: k, value: Math.round(totals[k] * 100) / 100 }; })
          .sort(function (a, b) { return b.value - a.value; }).slice(0, 8);
        spendPanel.innerHTML = "";
        spendPanel.appendChild(U.el("h3", {}, "Spending by category (your data)"));
        if (!items.length) {
          spendPanel.appendChild(U.el("div", { class: "api-meta" }, "No expenses recorded yet — add one in Resource Tracker and it will chart here."));
        } else {
          spendPanel.appendChild(U.el("div", { html: global.Charts.barChart(items) }));
          spendPanel.appendChild(U.el("div", { class: "api-meta" }, "Total: " + fmtMoney(items.reduce(function (s, i) { return s + i.value; }, 0)) + " across " + (rows || []).length + " expense(s)."));
        }
      }).catch(function () {
        spendPanel.appendChild(U.el("div", { class: "api-meta" }, "Could not read expenses right now."));
      });
    }

    // ---- Cockpit counts + API usage ----
    var countsPanel = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Your cockpit at a glance"),
      U.el("div", { class: "api-meta" }, "Loading…")
    ]);
    grid.appendChild(countsPanel);
    if (global.CockpitDB && global.Charts) {
      Promise.all([
        global.CockpitDB.getAll("notes").catch(function () { return []; }),
        global.CockpitDB.getAll("tasks").catch(function () { return []; }),
        global.CockpitDB.getAll("projects").catch(function () { return []; }),
        global.CockpitDB.getAll("expenses").catch(function () { return []; })
      ]).then(function (parts) {
        var tasks = parts[1];
        var done = tasks.filter(function (t) { return t.done || t.status === "done" || t.completed; }).length;
        var items = [
          { label: "Notes", value: parts[0].length },
          { label: "Tasks open", value: tasks.length - done },
          { label: "Tasks done", value: done },
          { label: "Projects", value: parts[2].length },
          { label: "Expenses", value: parts[3].length }
        ];
        countsPanel.innerHTML = "";
        countsPanel.appendChild(U.el("h3", {}, "Your cockpit at a glance"));
        countsPanel.appendChild(U.el("div", { html: global.Charts.barChart(items) }));
      });
    }
    var apiPanel = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "API calls today (this device)"),
      U.el("div", { class: "api-meta" }, "Loading…")
    ]);
    grid.appendChild(apiPanel);
    if (global.ApiRegistry && global.Charts) {
      try {
        var usage = global.ApiRegistry.getUsage ? global.ApiRegistry.getUsage() : [];
        var list = Array.isArray(usage) ? usage : Object.keys(usage).map(function (k) { return usage[k]; });
        var items = list.map(function (u) {
          return { label: u.id || u.name || "?", value: (u.callsToday || u.calls || 0) };
        }).filter(function (i) { return i.value > 0; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 8);
        apiPanel.innerHTML = "";
        apiPanel.appendChild(U.el("h3", {}, "API calls today (this device)"));
        if (!items.length) {
          apiPanel.appendChild(U.el("div", { class: "api-meta" }, "No API calls recorded on this device today yet. Refresh a price or load news and the bars appear here. Full detail lives in the API Health panel on the dashboard."));
        } else {
          apiPanel.appendChild(U.el("div", { html: global.Charts.barChart(items) }));
        }
      } catch (e) {
        apiPanel.appendChild(U.el("div", { class: "api-meta" }, "Could not read API usage right now."));
      }
    }

    root.appendChild(grid);
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.analytics = { render: render };
})(window);
