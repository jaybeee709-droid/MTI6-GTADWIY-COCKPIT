/* MTI6-GTADWIY-COCKPIT — Opportunities shell (master shell, Build 1)
 *
 * No live opportunities are tracked, and nothing here is an earning
 * promise. The only real content on this screen is the 28 approved
 * Batch A organizational families, read from the local encyclopedia
 * store — reference families, not opportunities. A family becomes an
 * opportunity only through the verified discovery workflow
 * (DISCOVERED → VERIFY → CLASSIFY → OWNER APPROVAL → ADD), and none
 * has gone through it yet.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  async function render(root) {
    root.innerHTML = "";
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("opportunities") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "Opportunities"));
    root.appendChild(U.el("p", { class: "api-subtitle" },
      "No live opportunities are tracked. Mapping a family is not promising income — nothing here is an earning, a return, or an APY."));

    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "How an opportunity is verified"),
      U.el("div", { class: "api-meta" }, "Discovery workflow: DISCOVERED → VERIFY → CLASSIFY → OWNER APPROVAL → ADD. Rejected, duplicate, stale, or needs-review records are listed, never silently added. No family below has completed this workflow.")
    ]));

    var listPanel = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Reference families — Batch A (28)"),
      U.el("div", { class: "api-meta" }, "Loading families from the local encyclopedia store…")
    ]);
    root.appendChild(listPanel);

    var families = [];
    var loadError = false;
    try {
      if (global.CockpitDB && typeof global.CockpitDB.getAll === "function") {
        var all = await global.CockpitDB.getAll("cryptoWorld");
        families = (all || []).filter(function (r) {
          return r && r.registry === "activities" && r.level === "FAMILY";
        }).sort(function (a, b) {
          return String(a.title || "").localeCompare(String(b.title || ""));
        });
      }
    } catch (e) {
      loadError = true;
    }

    listPanel.innerHTML = "";
    listPanel.appendChild(U.el("h3", {}, "Reference families — Batch A (28)"));
    if (loadError) {
      listPanel.appendChild(U.el("div", { class: "api-meta" }, "Could not read the local encyclopedia store. Open the Encyclopedia once and try again."));
    } else if (!families.length) {
      listPanel.appendChild(U.el("div", { class: "api-meta" }, "No families loaded yet — open the Encyclopedia once to run the approved import."));
    } else {
      listPanel.appendChild(U.el("div", { class: "api-meta" },
        families.length + " organizational families, imported and validated (Batch A). These are reference structure, not opportunities and not earning promises."));
      var list = U.el("ul", { class: "price-offer-list" });
      families.forEach(function (f) {
        list.appendChild(U.el("li", {}, (f.title || f.id) + " — " + (f.workspace || "—") + " · " + (f.globeView || "—")));
      });
      listPanel.appendChild(list);
      var encBtn = U.el("button", { class: "btn btn-secondary", type: "button" }, "Open the Encyclopedia");
      encBtn.addEventListener("click", function () { location.hash = "#/encyclopedia"; });
      listPanel.appendChild(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [encBtn]));
    }
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.opportunities = { render: render };
})(window);
