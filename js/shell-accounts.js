/* MTI6-GTADWIY-COCKPIT — shell Accounts panel (Responsive Phase C,
 * owner-authorized 2026-11-15).
 *
 * The black credit-card launcher in the top command bar opens this
 * panel OVER the current screen (the route underneath never changes).
 * The panel is a HOST, not a second implementation: every value comes
 * from the existing WalletIntelligence.summary() at open time, and the
 * full destinations remain Wallets and Accounts & Finance, reached by
 * the panel's own buttons. No balances or financial figures are shown
 * unless the wallet system itself reports them — it reports none, so
 * the panel says so. Execution state is read from
 * WalletIntelligence.canExecuteTransaction(), never assumed.
 */
(function (global) {
  "use strict";

  var U = global.U;

  function el(tag, attrs, children) {
    if (U && typeof U.el === "function") return U.el(tag, attrs, children);
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    (children || []).forEach(function (c) { n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }

  function buildContent(panel) {
    panel.innerHTML = "";
    var WI = global.WalletIntelligence;
    var head = el("div", { class: "accounts-panel-head" }, [
      el("h3", {}, "Accounts"),
      el("button", { class: "btn btn-ghost btn-sm", type: "button", "aria-label": "Close Accounts panel" }, "✕")
    ]);
    head.querySelector("button").addEventListener("click", close);
    panel.appendChild(head);

    if (!WI || typeof WI.summary !== "function") {
      panel.appendChild(el("p", { class: "api-meta" }, "Wallet system: NOT_LOADED — account state cannot be read right now."));
    } else {
      var s = null;
      try { s = WI.summary(); } catch (e) { s = null; }
      if (!s) {
        panel.appendChild(el("p", { class: "api-meta" }, "Wallet system did not answer — account state is UNKNOWN, not zero."));
      } else {
        panel.appendChild(el("div", { class: "accounts-rows" }, [
          el("p", {}, "Connection: " + s.connectionState),
          el("p", {}, "Wallets discovered: " + s.total + " · Accounts: " + s.accounts),
          el("p", {}, "Balances: UNAVAILABLE — no wallet is connected, and an unavailable balance is never shown as zero."),
          el("p", {}, "Execution: " + (s.executionAvailable ? "AVAILABLE" : "DISABLED") + " — transaction execution does not exist in this build.")
        ]));
        if (s.note) panel.appendChild(el("p", { class: "api-meta" }, s.note));
      }
    }

    var nav = el("div", { class: "accounts-panel-nav" }, [
      el("button", { class: "btn btn-primary", type: "button" }, "Open Wallets"),
      el("button", { class: "btn btn-ghost", type: "button" }, "Open Accounts & Finance")
    ]);
    nav.children[0].addEventListener("click", function () { close(); global.location.hash = "#/wallets"; });
    nav.children[1].addEventListener("click", function () { close(); global.location.hash = "#/accounts"; });
    panel.appendChild(nav);
  }

  function open() {
    var panel = document.getElementById("accounts-panel");
    var btn = document.getElementById("accounts-btn");
    if (!panel) return;
    buildContent(panel);
    panel.classList.remove("hidden");
    if (btn) btn.setAttribute("aria-expanded", "true");
  }

  function close() {
    var panel = document.getElementById("accounts-panel");
    var btn = document.getElementById("accounts-btn");
    if (panel) panel.classList.add("hidden");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function isOpen() {
    var panel = document.getElementById("accounts-panel");
    return !!panel && !panel.classList.contains("hidden");
  }

  var initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    var btn = document.getElementById("accounts-btn");
    if (!btn) return;
    btn.addEventListener("click", function () { isOpen() ? close() : open(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) close();
    });
    document.addEventListener("click", function (e) {
      if (!isOpen()) return;
      var panel = document.getElementById("accounts-panel");
      if (panel && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close();
    });
    global.addEventListener("hashchange", close);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.ShellAccounts = { open: open, close: close };
})(window);
