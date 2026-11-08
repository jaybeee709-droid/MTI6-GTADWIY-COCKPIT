/* MTI6-GTADWIY-COCKPIT — Wallets shell (master shell, Build 1)
 *
 * Read-only reference shell. No wallet is connected, no balance or
 * address is shown, and nothing here can sign, swap, send, stake, lend,
 * bridge, or claim. Seed phrases and private keys are never stored —
 * the wallet reference definitions live in the Encyclopedia
 * (family-wallet-asset-operations), not in this screen.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  async function render(root) {
    root.innerHTML = "";
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("wallets") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "Wallets"));
    root.appendChild(U.el("p", { class: "api-subtitle" },
      "Urban matte-black wallet view. No wallet is connected — this screen is a read-only reference shell. It never stores seed phrases or private keys, and it cannot sign or move anything."));

    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Connected wallets"),
      U.el("div", { class: "api-meta" }, "Connected wallets: none — NOT CONNECTED"),
      U.el("div", { class: "api-meta" }, "A connected read-only wallet would show here: holdings, wallet-associated positions, and permission/approval state — read-only, never signing.")
    ]));

    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "What a wallet holds"),
      U.el("div", { class: "api-meta" }, "Holdings: — (no wallet connected)"),
      U.el("div", { class: "api-meta" }, "Positions: — (no wallet connected)"),
      U.el("div", { class: "api-meta" }, "Permissions / approvals: — (no wallet connected)")
    ]));

    var linkBtn = U.el("button", { class: "btn btn-secondary", type: "button" }, "Read the wallet reference in the Encyclopedia");
    linkBtn.addEventListener("click", function () { location.hash = "#/encyclopedia"; });
    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Reference"),
      U.el("div", { class: "api-meta" }, "Wallet and asset operations are defined as an organizational family in the Crypto Encyclopedia — holding, sending, receiving, tracking, and organizing digital assets, including permission/approval management without storing private keys or seed phrases."),
      U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [linkBtn])
    ]));
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.wallets = { render: render };
})(window);
