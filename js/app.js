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
    // Bot Profile (Bot Profiles + Big Screen Build): reached from
    // the sidebar TRIBES accordion, the Bot Operations grid, and
    // worker detail views — like tasks/projects/expenses it is a
    // registered route that is deliberately NOT a drawer nav link.
    "bot-profile": { label: "Bot Profile", icon: "👤" },
    // Crypto Workspace (CW-2): one route renders all 56 registry
    // workspaces through the shared frame — "#/crypto-ws/<workspace>"
    // with an optional "/<contextId>". Like bot-profile it is a
    // registered route deliberately NOT a drawer nav link; it is
    // reached from the Crypto World screen (Workspaces index +
    // "Open workspace" on every Major Activity).
    "crypto-ws": { label: "Crypto Workspace", icon: "💱" },
    wallets: { label: "Wallets", icon: "◈" },
    opportunities: { label: "Opportunities", icon: "◎" },
    earn: { label: "Earnings", icon: "💰" },
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

  // Render generation (Fix-up #3, defect A): hashchange navigation and
  // "Try again" can start a new renderRoute while an earlier one is
  // still awaiting its module (slow IndexedDB read, slow panel). The
  // earlier render's timeout or catch must not wipe the newer render's
  // finished screen with a stale error panel — that made "Try again"
  // look dead: the retry could succeed and still be replaced by the
  // first render's late error. Only the latest generation may write
  // the error/timeout panel, dispatch route-rendered, or clear
  // aria-busy; a stale render logs its error and otherwise does
  // nothing to the DOM.
  let renderGeneration = 0;

  function rawHash() {
    return (location.hash || "#/globe").replace(/^#\/?/, "");
  }

  // Hash router: "#/<route>" or "#/<route>/<param>". The first
  // segment must be a known ROUTES key; anything after the first "/"
  // is the route param, exposed as global.CockpitRouteParam (null
  // when absent) before renderRoute() calls the module's render, so
  // a screen can open a deep view — e.g. "#/encyclopedia/<id>" opens
  // that entry's detail view. highlightNav still gets the base
  // route, so the nav highlights the screen, not the param.
  function currentRoute() {
    const hash = rawHash();
    const slash = hash.indexOf("/");
    const base = slash === -1 ? hash : hash.slice(0, slash);
    if (!ROUTES[base]) {
      global.CockpitRouteParam = null;
      return null; // null = unknown route -> "not found"
    }
    let param = slash === -1 ? null : hash.slice(slash + 1);
    if (param) {
      try { param = decodeURIComponent(param); } catch (e) {}
    }
    global.CockpitRouteParam = param || null;
    return base;
  }

  // ---- Sidebar TRIBES accordion (Bot Profiles + Big Screen Build,
  // owner direction 2026-11-16) ----
  // Tapping a principal's photo expands a selector under the tribe
  // grid: the principal themself plus each worker recorded under
  // them in the real WorkerEngine records (a worker belongs to the
  // principal its record's parentPrincipalId names — see
  // js/bot-profiles.js). No recorded workers -> the honest line,
  // never an invented worker. Selecting an entry closes the drawer
  // and opens that bot's full profile (#/bot-profile/<ref>). STAR's
  // slot tops the section with the same behaviour; no workers are
  // recorded under STAR, because worker records name a Tribe
  // principal as their parent — the accordion says exactly that.
  let navAccordionEl = null;
  let navExpandedRef = null;

  function navWorkersUnder(principalId) {
    if (global.BotProfiles && typeof global.BotProfiles.workersUnder === "function") {
      try { return global.BotProfiles.workersUnder(principalId) || []; } catch (e) {}
    }
    if (global.WorkerEngine && typeof global.WorkerEngine.listWorkers === "function") {
      try {
        return (global.WorkerEngine.listWorkers() || []).filter((w) =>
          w && (w.parentPrincipalId === principalId || w.parentTribeId === principalId));
      } catch (e) {}
    }
    return [];
  }

  function syncAccordionExpanded() {
    document.querySelectorAll("#side-nav [data-accordion-ref]").forEach((n) => {
      n.setAttribute("aria-expanded", n.dataset.accordionRef === navExpandedRef ? "true" : "false");
    });
  }

  function navAccordionEntry(label, ref) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "nav-tribe-entry";
    b.textContent = label;
    b.addEventListener("click", () => {
      location.hash = "#/bot-profile/" + ref;
      closeMobileNav();
    });
    return b;
  }

  function toggleNavTribeAccordion(ref, name) {
    if (!navAccordionEl) return;
    if (navExpandedRef === ref) {
      navExpandedRef = null;
      navAccordionEl.innerHTML = "";
      navAccordionEl.classList.add("hidden");
      syncAccordionExpanded();
      return;
    }
    navExpandedRef = ref;
    navAccordionEl.innerHTML = "";
    navAccordionEl.classList.remove("hidden");
    const head = document.createElement("div");
    head.className = "nav-tribe-accordion-head";
    head.textContent = name;
    navAccordionEl.appendChild(head);
    if (ref === "star") {
      navAccordionEl.appendChild(navAccordionEntry("Profile — STAR · Main assistant", "star"));
      const none = document.createElement("div");
      none.className = "nav-tribe-none";
      none.textContent = "No workers recorded under STAR — worker records name a Tribe principal as their parent.";
      navAccordionEl.appendChild(none);
    } else {
      navAccordionEl.appendChild(navAccordionEntry("Profile — " + name + " · Principal", ref));
      const workers = navWorkersUnder(ref);
      if (!workers.length) {
        const none = document.createElement("div");
        none.className = "nav-tribe-none";
        none.textContent = "No workers recorded under " + name + " yet";
        navAccordionEl.appendChild(none);
      }
      workers.forEach((w) => {
        const wname = typeof w.canonicalName === "string" && w.canonicalName ? w.canonicalName : w.workerId;
        navAccordionEl.appendChild(navAccordionEntry(
          wname + " — " + (w.currentRole || "UNKNOWN") + " · " + (w.status || "UNKNOWN"), w.workerId));
      });
    }
    syncAccordionExpanded();
  }

  function buildNavStarSlot() {
    const starSlot = document.createElement("button");
    starSlot.type = "button";
    starSlot.className = "nav-star-slot";
    starSlot.dataset.accordionRef = "star";
    starSlot.setAttribute("aria-expanded", "false");
    starSlot.setAttribute("aria-label", "STAR — show profile selector");
    starSlot.title = "STAR — main assistant";
    if (typeof global.STAR_AVATAR_SRC === "string" && global.STAR_AVATAR_SRC) {
      const simg = document.createElement("img");
      simg.className = "nav-star-slot-img";
      simg.src = global.STAR_AVATAR_SRC;
      simg.alt = "";
      simg.setAttribute("aria-hidden", "true");
      simg.addEventListener("error", () => { simg.remove(); });
      starSlot.appendChild(simg);
    } else {
      const glyph = document.createElement("span");
      glyph.className = "nav-star-slot-glyph";
      glyph.setAttribute("aria-hidden", "true");
      glyph.textContent = "✨";
      starSlot.appendChild(glyph);
    }
    const starLabel = document.createElement("span");
    starLabel.className = "nav-star-slot-label";
    starLabel.textContent = "STAR";
    starSlot.appendChild(starLabel);
    starSlot.addEventListener("click", () => toggleNavTribeAccordion("star", "STAR"));
    return starSlot;
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
      // STAR's slot tops the section (Bot Profiles + Big Screen
      // Build). Deliberately NOT a .tribe-slot: STAR is not a Tribe
      // principal, and the principal slot census stays exactly 12.
      tribes.appendChild(buildNavStarSlot());
      tribes.appendChild(grid);
      navAccordionEl = document.createElement("div");
      navAccordionEl.className = "nav-tribe-accordion hidden";
      navAccordionEl.id = "nav-tribe-accordion";
      navExpandedRef = null;
      tribes.appendChild(navAccordionEl);
      tribes.appendChild(workersLine);
      global.Tribes.getSlots().forEach((slot) => {
        const s = document.createElement("button");
        s.className = "tribe-slot tribe-slot-unassigned";
        s.type = "button";
        s.setAttribute("role", "listitem");
        s.title = slot.label + " — unassigned";
        s.setAttribute("aria-label", slot.label + ", unassigned Tribe principal slot");
        // Principal portraits (owner ruling 2026-11-16): the slot
        // at roster position N shows that principal's generated
        // face (js/data/tribe-portraits.js, keyed by the canonical
        // TribePrincipals roster order) when the data file loaded.
        // A missing file, a missing roster, or an image that fails
        // to load keeps the numbered circle exactly as before; the
        // slot's title / aria-label captions are unchanged either
        // way.
        const roster = global.TribePrincipals && Array.isArray(global.TribePrincipals.ROSTER)
          ? global.TribePrincipals.ROSTER : null;
        const portraits = global.TRIBE_PORTRAITS;
        const entry = roster ? roster[slot.number - 1] : null;
        const src = entry && portraits && typeof portraits[entry.id] === "string" && portraits[entry.id]
          ? portraits[entry.id] : null;
        if (src) {
          s.classList.add("tribe-slot--portrait");
          const img = document.createElement("img");
          img.className = "tribe-slot-img";
          img.src = src;
          img.alt = "";
          img.setAttribute("aria-hidden", "true");
          img.addEventListener("error", () => {
            s.classList.remove("tribe-slot--portrait");
            s.innerHTML = '<span class="tribe-slot-num">' + String(slot.number).padStart(2, "0") + "</span>";
          });
          s.appendChild(img);
        } else {
          s.innerHTML = '<span class="tribe-slot-num">' + String(slot.number).padStart(2, "0") + "</span>";
        }
        // Bot Profiles + Big Screen Build: tapping the photo opens
        // the selector accordion under the grid (the principal +
        // each recorded worker under them). Without a roster entry
        // there is no principal to select, so the slot keeps its
        // original behaviour and goes to Bot Operations.
        if (entry) {
          s.dataset.accordionRef = entry.id;
          s.setAttribute("aria-expanded", "false");
        }
        s.addEventListener("click", () => {
          if (entry) {
            toggleNavTribeAccordion(entry.id, entry.displayName);
          } else {
            location.hash = "#/bot-ops";
            closeMobileNav();
          }
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
    if (quickNav) {
      // The compact control only lists major destinations. For any
      // other route (Analytics, Security, ...) show the neutral
      // placeholder instead of a stale label from the previous
      // screen (Fix-up #2, Defect 3: the label read "Wallets" on
      // Analytics and "Crypto World" on Security, because those
      // routes are not among the select's options and the value was
      // left untouched).
      const hasOption = route && ROUTES[route] && Array.from(quickNav.options).some((o) => o.value === route);
      quickNav.value = hasOption ? route : "";
    }
  }

  // ---- Nav drawer: backdrop click, Escape key, swipe-left, link choice ----
  // Full-Screen World Shell (owner direction 2026-11-16): the
  // sidebar is CLOSED by default at EVERY width and opens only
  // from the top-left ☰ as an overlay drawer — the earlier
  // >=768px docked sidebar is superseded (see css/style.css).
  // The ☰ button carries the state (aria-expanded / label), focus
  // moves into the drawer on open, and closing returns focus to
  // the ☰ when focus was inside the drawer.
  function syncMenuToggle(open) {
    const btn = document.getElementById("menu-toggle");
    if (!btn) return;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  function closeMobileNav() {
    const wasOpen = document.body.classList.contains("nav-open");
    document.body.classList.remove("nav-open");
    if (!wasOpen) return;
    syncMenuToggle(false);
    // Return focus to the ☰ only when focus is still inside the
    // drawer (a nav choice, Esc, the scrim) — never steal focus
    // from wherever the user actually is (renderRoute calls this
    // on every navigation as a safety net).
    const drawer = document.getElementById("side-nav");
    const btn = document.getElementById("menu-toggle");
    if (drawer && btn && drawer.contains(document.activeElement)) {
      try { btn.focus(); } catch (e) {}
    }
  }
  function openMobileNav() {
    document.body.classList.add("nav-open");
    syncMenuToggle(true);
    const drawer = document.getElementById("side-nav");
    if (!drawer) return;
    const first = drawer.querySelector("select, button, [href], input");
    if (first) {
      try { first.focus(); } catch (e) {}
    }
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
    // Fix-up #2, Defect 2: any navigation closes the drawer. The
    // drawer-link handlers already close it on click, but navigation
    // from quick-nav, STAR, or dashboard actions went through the
    // router only — so the drawer stayed open over the new screen
    // until manually closed. Closing here is the general safety net
    // (idempotent class removal; the drawer is an overlay at every
    // width since the Full-Screen World Shell change, 2026-11-16).
    closeMobileNav();
    const route = currentRoute();
    // Full-Screen World Shell (owner direction 2026-11-16): the
    // Globe route is full-bleed — css/style.css keys the edge-to-
    // edge stage geometry off this body class; every other route
    // keeps the normal reading layout.
    document.body.classList.toggle("route-globe", route === "globe");
    const myGeneration = ++renderGeneration;
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
      if (settled || myGeneration !== renderGeneration) return;
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
      // Fix-up #3, defect C safety net: the router appends a skeleton
      // while loading and relies on each module to clear root before
      // appending content. Four more modules (accounts, crypto, earn,
      // web) never clear root, so a leftover skeleton would persist
      // above their content. Remove any leftover skeleton after a
      // successful render — belt-and-braces alongside the module clears
      // in analytics.js/security.js. Generation-guarded like the
      // dispatch below: a stale render must not touch the newer
      // render's screen.
      if (myGeneration === renderGeneration && root.querySelectorAll) {
        var leftovers = root.querySelectorAll(".skeleton-view");
        for (var s = 0; s < leftovers.length; s++) leftovers[s].remove();
      }
      // Lets a caller (e.g. the Dashboard's Quick Actions) act the instant a
      // module has finished rendering after a hash navigation it triggered.
      // Only the latest generation dispatches: a stale render finishing
      // after a newer navigation must not fire for the old route.
      if (myGeneration === renderGeneration) {
        window.dispatchEvent(new CustomEvent("cockpit:route-rendered", { detail: { route } }));
      }
    } catch (err) {
      settled = true;
      clearTimeout(timeout);
      console.error(err);
      // A stale render's failure must not wipe the newer render's
      // finished screen (see renderGeneration above).
      if (myGeneration !== renderGeneration) return;
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
    if (myGeneration === renderGeneration) root.setAttribute("aria-busy", "false");
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
        // Fix-up #2, Defect 2: close the drawer immediately on
        // quick-nav navigation, matching the drawer-link pattern —
        // the router's renderRoute close is the safety net, this is
        // the instant one (no one-tick lag while hashchange fires).
        closeMobileNav();
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
    // Screen Lock: Screen Lock OFF (the default) asks the browser
    // to keep the screen lit while viewing the cockpit; ON releases
    // the wake lock and lets the device sleep normally. No-op where
    // the browser has no Wake Lock API — Settings says NOT_SUPPORTED.
    if (global.WakeLock && typeof global.WakeLock.init === "function") {
      global.WakeLock.init();
    }
    await renderRoute();
    // Encyclopedia content imports (approved batches only): idempotent,
    // runs in the background, never blocks boot or the first render.
    if (global.EncyclopediaImport && typeof global.EncyclopediaImport.importAll === "function") {
      global.EncyclopediaImport.importAll().catch(function () {});
    }
    // Resource Engine seed import (FREE-RESOURCE-CATALOG candidates +
    // capability gaps): idempotent by id, never overwrites a living
    // governed record, background like the encyclopedia import.
    if (global.ResourceEngine && typeof global.ResourceEngine.ensureSeeds === "function") {
      global.ResourceEngine.ensureSeeds().catch(function () {});
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
