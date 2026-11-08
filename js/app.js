/* MTI6-GTADWIY-COCKPIT — app shell + hash router */
(function (global) {
  "use strict";

  // Master shell (Build 1): World Globe is home. Cockpit Status is the
  // former dashboard, kept whole. Labels follow the master nav lists;
  // Crypto Market / Web / Data Analytics stay registered (and reachable
  // in Secondary nav) because working screens are never deleted.
  const ROUTES = {
    dashboard: { label: "Cockpit Status", icon: "🏠" },
    vault: { label: "Knowledge", icon: "📒" },
    tasks: { label: "Mission Control — Tasks", icon: "✅" },
    projects: { label: "Mission Control — Projects", icon: "📁" },
    expenses: { label: "Resource Tracker", icon: "💰" },
    globe: { label: "World Globe", icon: "🌍" },
    crypto: { label: "Crypto Market", icon: "₿" },
    "crypto-world": { label: "Crypto World", icon: "💱" },
    "bot-ops": { label: "Bot Operations", icon: "⬢" },
    wallets: { label: "Wallets", icon: "◈" },
    opportunities: { label: "Opportunities", icon: "◎" },
    earn: { label: "Earnings", icon: "💵" },
    positions: { label: "Positions & Assets", icon: "▦" },
    encyclopedia: { label: "Encyclopedia", icon: "📖" },
    operations: { label: "Operations", icon: "⚙" },
    accounts: { label: "Accounts & Finance", icon: "💼" },
    web: { label: "Web — Bot Work", icon: "🌐" },
    analytics: { label: "Data Analytics", icon: "📊" },
    security: { label: "Security & Bot Style", icon: "🛡️" },
    settings: { label: "Settings", icon: "⚙️" }
  };

  const ROUTE_RENDER_TIMEOUT_MS = 10000;

  function rawHash() {
    return (location.hash || "#/globe").replace(/^#\/?/, "");
  }

  function currentRoute() {
    const hash = rawHash();
    return ROUTES[hash] ? hash : null; // null = unknown route -> "not found"
  }

  // Master shell drawer: TRIBES on top (12 principal slots + the real
  // connected worker count, never fabricated), then Primary, then
  // Secondary navigation. Every ROUTES entry appears in exactly one
  // group via Mti6Nav; tasks/projects/expenses keep their routes and
  // are reached from Operations / Mission Control.
  function buildNav() {
    const nav = document.getElementById("nav-links");
    nav.innerHTML = "";

    if (global.Tribes) {
      const tribes = document.createElement("div");
      tribes.className = "nav-tribes";
      const tribesTitle = document.createElement("div");
      tribesTitle.className = "nav-group-title";
      tribesTitle.textContent = "Tribes";
      const grid = document.createElement("div");
      grid.className = "tribe-grid";
      grid.setAttribute("role", "list");
      grid.setAttribute("aria-label", "Tribe principal slots");
      const workersLine = document.createElement("div");
      workersLine.className = "workers-active-line";
      workersLine.textContent = "WORKERS ACTIVE: 0 — NOT CONNECTED";
      tribes.appendChild(tribesTitle);
      tribes.appendChild(grid);
      tribes.appendChild(workersLine);
      global.Tribes.getSlots().forEach((slot) => {
        const s = document.createElement("button");
        s.className = "tribe-slot tribe-slot-unassigned";
        s.type = "button";
        s.setAttribute("role", "listitem");
        s.title = slot.label + " — unassigned";
        s.setAttribute("aria-label", slot.label + ", unassigned Tribe principal slot");
        s.innerHTML = '<span class="tribe-slot-num">' + String(slot.number).padStart(2, "0") + "</span>";
        s.addEventListener("click", () => {
          location.hash = "#/bot-ops";
          closeMobileNav();
        });
        grid.appendChild(s);
      });
      nav.appendChild(tribes);
    }

    const groups = [
      { title: null, routes: global.Mti6Nav ? global.Mti6Nav.PRIMARY : Object.keys(ROUTES) },
      { title: null, routes: global.Mti6Nav ? global.Mti6Nav.SECONDARY : [] }
    ];
    // Group titles: Primary first, Secondary second.
    groups[0].title = "Navigate";
    groups[1].title = "More";
    groups.forEach((group) => {
      if (!group.routes.length) return;
      const title = document.createElement("div");
      title.className = "nav-group-title";
      title.textContent = group.title;
      nav.appendChild(title);
      group.routes.forEach((route) => {
        const info = ROUTES[route];
        if (!info) return;
        const link = document.createElement("button");
        link.className = "nav-link";
        link.dataset.route = route;
        link.setAttribute("aria-current", "false");
        const iconHtml = global.Mti6Nav ? global.Mti6Nav.iconFor(route, info.icon) : info.icon;
        link.innerHTML = `<span class="nav-icon nav-icon-${route}">${iconHtml}</span><span class="nav-label">${info.label}</span>`;
        link.addEventListener("click", () => {
          location.hash = `#/${route}`;
          closeMobileNav();
        });
        nav.appendChild(link);
      });
    });
  }

  function highlightNav(route) {
    document.querySelectorAll(".nav-link").forEach((n) => {
      const isActive = n.dataset.route === route;
      n.classList.toggle("active", isActive);
      n.setAttribute("aria-current", isActive ? "page" : "false");
    });
    const titleEl = document.getElementById("app-title");
    if (titleEl) titleEl.textContent = route && ROUTES[route] ? ROUTES[route].label : "Not Found";
    const quickNav = document.getElementById("quick-nav");
    if (quickNav && route && ROUTES[route]) {
      // The compact control only lists major destinations; leave it
      // untouched for routes it does not list.
      const hasOption = Array.from(quickNav.options).some((o) => o.value === route);
      if (hasOption) quickNav.value = route;
    }
  }

  // ---- Mobile nav drawer: backdrop click, Escape key, swipe-left, link choice ----
  function closeMobileNav() {
    document.body.classList.remove("nav-open");
  }
  function openMobileNav() {
    document.body.classList.add("nav-open");
  }

  function wireDrawerGestures() {
    const drawer = document.getElementById("side-nav");

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.body.classList.contains("nav-open")) {
        closeMobileNav();
      }
    });

    // Swipe-left-to-close on the open drawer (touch only — this is a mobile drawer gesture).
    let touchStartX = null;
    let touchStartY = null;
    drawer.addEventListener(
      "touchstart",
      (e) => {
        if (!e.touches || !e.touches.length) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );
    drawer.addEventListener(
      "touchend",
      (e) => {
        if (touchStartX === null) return;
        const touch = (e.changedTouches && e.changedTouches[0]) || null;
        if (touch) {
          const dx = touch.clientX - touchStartX;
          const dy = Math.abs(touch.clientY - touchStartY);
          // a clear, mostly-horizontal left swipe
          if (dx < -40 && dy < 60) closeMobileNav();
        }
        touchStartX = null;
        touchStartY = null;
      },
      { passive: true }
    );
  }

  // ---- Router: skeleton while loading, timeout + error panel, 404 ----
  async function renderRoute() {
    const route = currentRoute();
    const root = document.getElementById("view-root");

    if (!route) {
      highlightNav(null);
      root.setAttribute("aria-busy", "false");
      root.innerHTML = "";
      root.appendChild(notFoundPanel());
      return;
    }

    highlightNav(route);
    root.setAttribute("aria-busy", "true");
    root.innerHTML = "";
    root.appendChild(U.skeletonBlock());

    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      root.innerHTML = "";
      root.appendChild(
        U.errorPanel({
          title: "This is taking too long",
          message: "The screen didn't finish loading in time. Your data is safe on this device — try again.",
          onRetry: () => renderRoute(),
          onHome: () => (location.hash = "#/globe")
        })
      );
    }, ROUTE_RENDER_TIMEOUT_MS);

    try {
      await CockpitModules[route].render(root);
      settled = true;
      clearTimeout(timeout);
      // Lets a caller (e.g. the Dashboard's Quick Actions) act the instant a
      // module has finished rendering after a hash navigation it triggered.
      window.dispatchEvent(new CustomEvent("cockpit:route-rendered", { detail: { route } }));
    } catch (err) {
      settled = true;
      clearTimeout(timeout);
      console.error(err);
      root.innerHTML = "";
      root.appendChild(
        U.errorPanel({
          title: "Something went wrong",
          message: "This screen hit an error loading. Your data is safe — try again, or head back to the dashboard.",
          onRetry: () => renderRoute(),
          onHome: () => (location.hash = "#/globe")
        })
      );
    }
    root.setAttribute("aria-busy", "false");
  }

  function notFoundPanel() {
    return U.el("div", { class: "error-panel" }, [
      U.el("div", { class: "error-icon" }, "🧭"),
      U.el("h2", {}, "Page not found"),
      U.el("p", { class: "about-text" }, "That screen doesn't exist in this app."),
      U.el("div", { class: "modal-actions", style: "justify-content:center" }, [
        U.el("button", { class: "btn btn-primary", onclick: () => (location.hash = "#/globe") }, "Go to World Globe")
      ])
    ]);
  }

  async function applySavedTheme() {
    const theme = await CockpitModules.settings.getSetting("theme", "dark");
    document.documentElement.setAttribute("data-theme", theme);
    const currency = await CockpitModules.settings.getSetting("currency", "USD");
    try {
      localStorage.setItem("cockpit_currency", currency);
    } catch (e) {}
  }

  function wireChrome() {
    document.getElementById("menu-toggle").addEventListener("click", () => {
      document.body.classList.contains("nav-open") ? closeMobileNav() : openMobileNav();
    });
    document.getElementById("nav-scrim").addEventListener("click", closeMobileNav);
    // Permanent STAR button: opens the STAR overlay without leaving
    // the current screen.
    const starBtn = document.getElementById("star-btn");
    if (starBtn) {
      starBtn.addEventListener("click", () => {
        if (global.StarOverlay) global.StarOverlay.open();
      });
    }
    // Compact navigation control in the top bar: jump to a major
    // destination without opening the drawer.
    const quickNav = document.getElementById("quick-nav");
    if (quickNav) {
      quickNav.addEventListener("change", () => {
        if (quickNav.value) location.hash = "#/" + quickNav.value;
      });
    }
    wireDrawerGestures();
    window.addEventListener("hashchange", renderRoute);
  }

  // ---- Online / offline indicator ----
  function wireConnectivityIndicator() {
    const bar = document.getElementById("offline-indicator");
    if (!bar) return;
    function update() {
      const offline = !navigator.onLine;
      bar.classList.toggle("show", offline);
      bar.textContent = offline ? "You're offline — everything still works, changes save on this device." : "";
    }
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
  }

  async function boot() {
    buildNav();
    await applySavedTheme();
    // Normalize the default hash BEFORE wiring the hashchange listener, so
    // setting it here doesn't also fire a redundant second initial render.
    // World Globe is home in the master shell.
    if (!location.hash) location.hash = "#/globe";
    wireChrome();
    wireConnectivityIndicator();
    await renderRoute();
    // Encyclopedia content imports (approved batches only): idempotent,
    // runs in the background, never blocks boot or the first render.
    if (global.EncyclopediaImport && typeof global.EncyclopediaImport.importAll === "function") {
      global.EncyclopediaImport.importAll().catch(function () {});
    }
    registerServiceWorker();
    wireInstallPrompt();
  }

  // ---- Service worker registration + "update ready" reload banner ----
  let swRegistration = null;

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .then((reg) => {
          swRegistration = reg;

          // A worker may already be waiting from a previous visit.
          if (reg.waiting && navigator.serviceWorker.controller) {
            showUpdateBanner(reg);
          }

          reg.addEventListener("updatefound", () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller) {
                // There's an existing controller, so this is a genuine update,
                // not the very first install — safe to prompt for reload.
                showUpdateBanner(reg);
              }
            });
          });
        })
        .catch((err) => {
          console.warn("Service worker registration failed:", err);
        });

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        location.reload();
      });
    });
  }

  function showUpdateBanner(reg) {
    let banner = document.getElementById("update-banner");
    if (banner) return; // already showing
    banner = U.el("div", { id: "update-banner", class: "update-banner" }, [
      U.el("span", {}, "A new version of the app is ready."),
      U.el("button", {
        class: "btn btn-primary btn-sm",
        onclick: () => {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        }
      }, "Reload")
    ]);
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add("show"));
  }

  function checkForUpdate() {
    if (!swRegistration) {
      return Promise.resolve({ checked: false, reason: "no-service-worker" });
    }
    return swRegistration.update().then(() => ({ checked: true }));
  }

  // ---- Install prompt: Android/desktop native prompt, iOS instructions ----
  let deferredInstallPrompt = null;

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !global.MSStream;
  }

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      global.navigator.standalone === true
    );
  }

  function wireInstallPrompt() {
    const btn = document.getElementById("install-btn");
    if (!btn) return;

    if (isStandalone()) {
      btn.classList.add("hidden");
      return;
    }

    if (isIos()) {
      // iOS Safari never fires beforeinstallprompt — show the button right
      // away and walk the user through the manual steps instead.
      btn.classList.remove("hidden");
      btn.addEventListener("click", () => showIosInstallInstructions());
      return;
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      btn.classList.remove("hidden");
    });
    btn.addEventListener("click", async () => {
      if (!deferredInstallPrompt) {
        U.toast('Use your browser menu → "Add to Home screen" to install.', "info");
        return;
      }
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      btn.classList.add("hidden");
    });
    window.addEventListener("appinstalled", () => {
      btn.classList.add("hidden");
      U.toast("Installed to your home screen");
    });
  }

  function showIosInstallInstructions() {
    const overlay = U.el("div", { class: "modal-overlay" });
    const box = U.el("div", { class: "modal-box" }, [
      U.el("h2", {}, "Add to Home Screen"),
      U.el("p", { class: "about-text" }, "iPhone and iPad install apps through Safari's share menu rather than an in-page button. To install:"),
      U.el("ol", { class: "ios-steps" }, [
        U.el("li", {}, [U.el("strong", {}, "1. "), "Tap the Share icon (the square with an up arrow) in Safari's toolbar."]),
        U.el("li", {}, [U.el("strong", {}, "2. "), 'Scroll down and tap "Add to Home Screen".']),
        U.el("li", {}, [U.el("strong", {}, "3. "), 'Tap "Add" in the top-right corner.'])
      ]),
      U.el("p", { class: "about-text" }, "The app icon will then appear on your home screen and will keep working offline."),
      U.el("div", { class: "modal-actions" }, [
        U.el("button", { class: "btn btn-primary", onclick: () => overlay.remove() }, "Got it")
      ])
    ]);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  global.CockpitApp = { checkForUpdate, getRegistration: () => swRegistration };

  document.addEventListener("DOMContentLoaded", boot);
})(window);
