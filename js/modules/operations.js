/* MTI6-GTADWIY-COCKPIT — Operations shell (master shell, Build 1)
 *
 * Mission Control lives here: Tasks, Projects, future Missions and
 * Activity, plus Resource Tracker, Infrastructure, System Health,
 * API/Data Health, and Automation Status.
 *
 * Every status is real state. Infrastructure shows NOT CONNECTED
 * because no infrastructure system reports to it. System Health reads
 * the live connection, the service-worker registration, and the cached
 * app version from the deployed service-worker file itself (unknown
 * when it cannot be read). Automation Status is honest: nothing runs
 * in the background except the approved encyclopedia import at boot.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  function navButton(label, route) {
    var b = U.el("button", { class: "btn btn-secondary", type: "button" }, label);
    b.addEventListener("click", function () { location.hash = "#/" + route; });
    return b;
  }

  async function cachedVersion() {
    try {
      var res = await fetch("./sw.js", { cache: "no-store" });
      var text = await res.text();
      var m = /CACHE_VERSION\s*=\s*"([^"]+)"/.exec(text);
      return m ? m[1] : "Unknown";
    } catch (e) {
      return "Unknown — could not read the service worker file";
    }
  }

  async function swState() {
    if (!("serviceWorker" in navigator)) return "Not supported by this browser";
    try {
      var reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active) return "Active — offline support is on";
      if (reg) return "Installing…";
      return "Not yet active — reload the app once to enable it";
    } catch (e) {
      return "Unavailable in this browser";
    }
  }

  async function render(root) {
    root.innerHTML = "";
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("operations") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "Operations"));
    root.appendChild(U.el("p", { class: "api-subtitle" },
      "Mission Control, resources, infrastructure, and system health. Statuses below are real — unknown means unknown, never guessed."));

    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Mission Control"),
      U.el("div", { class: "api-meta" }, "Tasks and Projects live here. Missions and Activity are planned — not built."),
      U.el("div", { class: "price-input-row" }, [
        navButton("Tasks", "tasks"),
        navButton("Projects", "projects")
      ]),
      U.el("div", { class: "api-meta" }, "Missions: planned — not built · Activity: planned — not built")
    ]));

    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Resource Tracker"),
      U.el("div", { class: "api-meta" }, "Spending and resources, stored locally on this device."),
      U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [navButton("Open Resource Tracker", "expenses")])
    ]));

    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Infrastructure"),
      U.el("div", { class: "api-meta" }, "Infrastructure: NOT CONNECTED — no live infrastructure data. Infrastructure appears here only when a real system reports it.")
    ]));

    var healthPanel = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "System Health"),
      U.el("div", { class: "api-meta" }, "Connection: " + (navigator.onLine ? "Online" : "Offline")),
      U.el("div", { class: "api-meta" }, "Service worker: checking…"),
      U.el("div", { class: "api-meta" }, "Cached app version: checking…"),
      U.el("div", { class: "api-meta" }, "Background workers: none connected")
    ]);
    root.appendChild(healthPanel);
    var healthRows = healthPanel.querySelectorAll(".api-meta");
    if (healthRows[1]) healthRows[1].textContent = "Service worker: " + await swState();
    if (healthRows[2]) healthRows[2].textContent = "Cached app version: " + await cachedVersion();

    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "API / Data Health"),
      U.el("div", { class: "api-meta" }, "Live API usage counts live on the Cockpit Status dashboard (API Health & Usage panel)."),
      U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [navButton("Open Cockpit Status", "dashboard")])
    ]));

    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Automation Status"),
      U.el("div", { class: "api-meta" }, "No automation is running. Approved encyclopedia imports run once at app boot; nothing else runs in the background.")
    ]));
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.operations = { render: render };
})(window);
