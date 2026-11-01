/* MTI6-GTADWIY-COCKPIT — app shell + hash router */
(function (global) {
  "use strict";

  const ROUTES = {
    dashboard: { label: "Cockpit Dashboard", icon: "🏠" },
    vault: { label: "Knowledge Vault", icon: "📒" },
    tasks: { label: "Mission Control — Tasks", icon: "✅" },
    projects: { label: "Mission Control — Projects", icon: "📁" },
    expenses: { label: "Resource Tracker", icon: "💰" },
    globe: { label: "World Globe", icon: "🌍" },
    crypto: { label: "Crypto Market", icon: "₿" },
    accounts: { label: "Our Accounts", icon: "💼" },
    earn: { label: "Earn", icon: "💵" },
    web: { label: "Web — Bot Work", icon: "🌐" },
    analytics: { label: "Data Analytics", icon: "📊" },
    security: { label: "Security & Bot Style", icon: "🛡️" },
    settings: { label: "Settings", icon: "⚙️" }
  };

  const ROUTE_RENDER_TIMEOUT_MS = 10000;

  function rawHash() {
    return (location.hash || "#/dashboard").replace(/^#\/?/, "");
  }

  function currentRoute() {
    const hash = rawHash();
    return ROUTES[hash] ? hash : null; // null = unknown route -> "not found"
  }

  function buildNav() {
    const nav = document.getElementById("nav-links");
    nav.innerHTML = "";
    Object.entries(ROUTES).forEach(([route, info]) => {
      const link = document.createElement("button");
      link.className = "nav-link";
      link.dataset.route = route;
      link.setAttribute("aria-current", "false");
      link.innerHTML = `<span class="nav-icon">${info.icon}</span><span class="nav-label">${info.label}</span>`;
      link.addEventListener("click", () => {
        location.hash = `#/${route}`;
        closeMobileNav();
      });
      nav.appendChild(link);
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
          onHome: () => (location.hash = "#/dashboard")
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
          onHome: () => (location.hash = "#/dashboard")
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
        U.el("button", { class: "btn btn-primary", onclick: () => (location.hash = "#/dashboard") }, "Go to dashboard")
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
    if (!location.hash) location.hash = "#/dashboard";
    wireChrome();
    wireConnectivityIndicator();
    await renderRoute();
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
