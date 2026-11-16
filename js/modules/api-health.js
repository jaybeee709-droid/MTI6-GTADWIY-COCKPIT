/* MTI6-GTADWIY-COCKPIT — API Health & Usage panel (V1)
 *
 * Shows the API registry (js/api-registry.js) as a live list: every
 * source, its fallback chain, its published limit (where one exists),
 * and this device's own call counts for today. This panel owns ONLY
 * rendering — registry data and usage counting live in api-registry.js.
 *
 * Honesty rule for this panel: counts here are this device's calls
 * only, not a provider's official total. Shared public tiers and
 * keyed dashboards are authoritative for their own limits, and where
 * a provider publishes no limit, the panel says "unknown" instead of
 * inventing a number.
 *
 * Hybrid rule, stated in the panel so it is not just a comment:
 *   API first -> public feed / public JSON second -> HTML scraping
 *   last, server-side only, public pages only, never behind a login
 *   or paywall, never to bypass a block. A blocked source is dropped.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  function fmtTime(iso) {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }); }
    catch (e) { return "—"; }
  }

  function renderPanel() {
    var panel = U.el("section", { class: "api-panel", "aria-label": "API health and usage" }, [
      U.el("div", {}, [
        U.el("h2", { class: "api-title" }, "🔌 API Health & Usage"),
        U.el("div", { class: "api-subtitle" },
          "Every source the cockpit may call, its fallback chain, and this device's calls today. " +
          "Counts here are local only — the provider's own dashboard is authoritative for keyed/shared limits. " +
          "Hybrid rule: API first, public feed / public JSON second, HTML scraping last (server-side only, public pages only, never login/paywall, never bypass a block).")
      ]),
      U.el("div", { class: "api-list" })
    ]);

    function render() {
      var list = panel.querySelector(".api-list");
      if (!list) return;
      list.innerHTML = "";
      if (!global.ApiRegistry) {
        list.appendChild(U.el("div", { class: "api-row" }, "API registry did not load. Reload the dashboard and try again."));
        return;
      }
      var usage = global.ApiRegistry.getUsage();
      var chains = {};
      ["crypto", "stocks", "products", "github", "news", "weather", "forex", "knowledge"].forEach(function (cat) {
        chains[cat] = global.ApiRegistry.getChain(cat).join(" → ") || "—";
      });
      usage.forEach(function (u) {
        var limitText = u.limit && u.limit.calls
          ? u.limit.calls.toLocaleString() + " / " + u.limit.window + (u.estimatedRemaining !== null ? " · ~" + u.estimatedRemaining + " left (this device)" : "")
          : "Unknown — see provider docs";
        list.appendChild(U.el("div", { class: "api-row" }, [
          U.el("div", { class: "api-row-top" }, [
            U.el("span", { class: "api-name" }, u.name),
            U.el("span", { class: "price-badge price-badge-" + (u.status === "live" ? "live" : u.status === "planned" ? "not_connected" : "cached") }, u.status === "live" ? "Live" : u.status === "planned" ? "Planned" : u.status)
          ]),
          U.el("div", { class: "api-meta" }, u.category + " · Auth: " + u.auth + " · Browser-direct: " + (u.browserDirect ? "yes" : "no") + " · Chain: " + chains[u.category]),
          U.el("div", { class: "api-meta" }, "Limit: " + limitText + " · Today (this device): " + u.callsToday + " calls, " + u.success + " ok, " + u.fail + " failed · Last: " + fmtTime(u.lastAt)),
          u.note ? U.el("div", { class: "api-meta" }, u.note) : null
        ]));
      });
      var refresh = panel.querySelector(".api-refresh-btn");
      if (refresh) refresh.addEventListener("click", render);
    }

    var head = panel.querySelector(".api-subtitle");
    if (head) {
      var btn = U.el("button", { class: "btn btn-ghost btn-sm api-refresh-btn", type: "button", style: "margin-top:8px" }, "Refresh usage");
      head.parentNode.appendChild(btn);
    }
    render();
    return panel;
  }

  global.ApiHealthUI = { renderPanel: renderPanel };
})(window);
