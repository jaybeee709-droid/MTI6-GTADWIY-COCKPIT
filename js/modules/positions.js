/* MTI6-GTADWIY-COCKPIT — Positions & Assets shell (master shell, Build 1)
 *
 * No positions are tracked and no asset values are shown. Positions
 * appear here only from a connected read-only source the owner
 * approves. Nothing is fabricated: no balances, no gains, no losses,
 * no net — those fields stay absent until real tracked data exists.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  async function render(root) {
    root.innerHTML = "";
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("positions") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "Positions & Assets"));
    root.appendChild(U.el("p", { class: "api-subtitle" },
      "No positions are tracked. Positions and assets appear here only from a connected read-only source you approve — nothing is estimated or invented."));

    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Positions"),
      U.el("div", { class: "api-meta" }, "Positions tracked: none — NOT CONNECTED"),
      U.el("div", { class: "api-meta" }, "Gross result, fees, gain, loss, and net appear only where real tracked data exists. There is none yet.")
    ]));

    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Assets"),
      U.el("div", { class: "api-meta" }, "Assets tracked: none — NOT CONNECTED"),
      U.el("div", { class: "api-meta" }, "Live crypto prices are read-only on the Crypto Market screen; prices are not positions.")
    ]));

    var marketBtn = U.el("button", { class: "btn btn-secondary", type: "button" }, "Open Crypto Market (read-only prices)");
    marketBtn.addEventListener("click", function () { location.hash = "#/crypto"; });
    root.appendChild(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [marketBtn]));
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.positions = { render: render };
})(window);
