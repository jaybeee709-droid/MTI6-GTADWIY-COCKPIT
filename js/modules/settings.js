/* MTI6-GTADWIY-COCKPIT — Settings module */
(function (global) {
  "use strict";
  const { el } = U;

  async function render(root) {
    const theme = await getSetting("theme", "dark");
    const currency = await getSetting("currency", "USD");

    root.innerHTML = "";
    root.appendChild(el("div", { class: "view-header" }, [el("h1", {}, "Settings")]));

    root.appendChild(section("Appearance", [
      field("Theme", themeToggle(theme)),
      field("Currency for Expense Tracker", currencySelect(currency))
    ]));

    root.appendChild(section("STAR & Tribe Appearance", [
      field("STAR overlay", starOverlayField()),
      field("Tribe avatar appearance", el("div", { class: "api-meta" }, "12 Tribe principal slots are unassigned. Avatars are set only when a principal is named by owner approval — no appearance is cloned or invented.")),
      field("Worker visual / form presentation", el("div", { class: "api-meta" }, "Default form. No custom worker forms are assigned, and no worker is shown as active."))
    ]));

    root.appendChild(section("Sound & Voice", [
      field("Master volume", volumeField()),
      field("Interface sounds", soundsToggleField()),
      field("Alerts", alertsToggleField()),
      field("STAR voice", starVoiceField()),
      field("Tribe voices", el("div", { class: "api-meta" }, "Not assigned — no Tribe voices are configured.")),
      field("Worker voices", el("div", { class: "api-meta" }, "Not assigned — no worker voices are configured.")),
      field("Future voice model", el("div", { class: "api-meta" }, "Future, user-authorized voice models only. No person's voice is cloned without appropriate authorization."))
    ]));

    root.appendChild(section("Device Permissions / Connections", [
      el("div", { id: "perm-rows" }, "Checking…"),
      field("STAR connection", el("div", { class: "api-meta" }, global.StarBackend && typeof global.StarBackend.getStatusLabel === "function" ? global.StarBackend.getStatusLabel() : "Demo mode — no AI backend connected")),
      field("Device connection", el("div", { class: "api-meta" }, navigator.onLine ? "Online" : "Offline")),
      field("Screen Lock", wakeLockField())
    ]));

    root.appendChild(starBackendSection());

    root.appendChild(searchPrivacySection());

    root.appendChild(section("Data Management", [
      field("Storage used", el("div", { id: "storage-estimate" }, "Calculating…")),
      actionRow("Export backup (encrypted)", "Save all your data to a password-protected file you can keep or move to another device.", "Export", () => openExportDialog()),
      actionRow("Import backup", "Restore data from a previously exported encrypted backup file.", "Import", () => openImportDialog()),
      actionRow("Reset application", "Permanently erase every note, task, expense, and project stored on this device.", "Reset", () => openResetDialog(), true)
    ]));

    root.appendChild(section("App Status", [
      el("div", { id: "app-status-rows" }, "Checking…"),
      actionRow(
        "Install app",
        "Add MTI6-GTADWIY-COCKPIT to your home screen so it opens like any other app.",
        "Install",
        () => triggerInstall()
      ),
      actionRow(
        "Check for updates",
        "Ask the app to look for a newer version right now, instead of waiting for the next visit.",
        "Check Now",
        (ev) => checkForUpdateNow(ev.currentTarget)
      )
    ]));

    root.appendChild(section("About", [
      el("p", { class: "about-text" }, "MTI6-GTADWIY-COCKPIT runs entirely on this device. There is no cloud sync, no account, and no server — your data never leaves your phone unless you export a backup yourself."),
      el("p", { class: "about-text" }, "Version 1 — stable cockpit foundation.")
    ]));

    populateStorageEstimate(root);
    populateAppStatus(root);
    populatePermissionRows(root);
  }

  // ---- STAR Backend (roadmap item 14: design + inert plumbing) ----
  // The configuration surface for a future live STAR connection.
  // Endpoint + model only — there is deliberately NO API key field:
  // a provider key must never be typed into this app; when the owner
  // authorizes a connection, the key lives only in the server
  // gateway's environment (Netlify), and this app talks to the
  // gateway at /api/mti6. Saving an endpoint does NOT connect STAR
  // and never claims to: the status below comes verbatim from
  // StarBackend, and the only check offered is the Phase 1 gateway's
  // own gateway.status — which today reports no provider configured.
  function starBackendSection() {
    const B = global.StarBackend;
    const children = [];

    const statusText = B && typeof B.getStatus === "function"
      ? B.getStatus().state + " — " + B.getStatusLabel()
      : "NOT_CONNECTED — Demo mode — no AI backend connected";
    const statusNode = el("div", { class: "api-meta", id: "settings-star-backend-status" }, statusText);
    children.push(field("Connection status", statusNode));

    const cfg = B && typeof B.getConfig === "function" ? B.getConfig() : { endpoint: "", model: "" };
    const endpointInput = el("input", {
      class: "input", id: "settings-star-endpoint", type: "text",
      placeholder: "/api/mti6", value: cfg.endpoint || "",
      "aria-label": "STAR backend endpoint"
    });
    children.push(field("Backend endpoint", endpointInput));
    children.push(el("div", { class: "api-meta" }, "Same-origin gateway path only (for example /api/mti6) — third-party provider URLs are rejected. Saving an endpoint does not connect STAR and does not verify anything: chat keeps answering in demo mode until the server gateway is authorized and a provider is connected by the owner."));

    const modelInput = el("input", {
      class: "input", id: "settings-star-model", type: "text",
      placeholder: "Model name — chosen with the provider, later",
      value: cfg.model || "",
      "aria-label": "STAR backend model"
    });
    children.push(field("Model", modelInput));
    children.push(el("div", { class: "api-meta" }, "A model name only, sent to the gateway with each message once a provider is connected. It is not a credential."));

    children.push(field("Provider key", el("div", { class: "api-meta" }, "There is no API key field in this app, by design. A provider key must never be typed into this page or stored in this app — when the owner authorizes a connection, the key belongs in the server gateway's environment (Netlify dashboard), and this app only ever talks to the gateway at /api/mti6.")));

    const note = el("div", { class: "api-meta", id: "settings-star-backend-note", "aria-live": "polite" }, "");
    const saveBtn = el("button", { class: "btn btn-secondary", id: "settings-star-save", type: "button" }, "Save endpoint");
    saveBtn.addEventListener("click", () => {
      if (!B || typeof B.configure !== "function") {
        note.textContent = "StarBackend did not load — nothing was saved.";
        return;
      }
      B.configure({ endpoint: endpointInput.value.trim(), model: modelInput.value.trim() });
      const st = B.getStatus();
      statusNode.textContent = st.state + " — " + B.getStatusLabel();
      note.textContent = st.configured
        ? "Endpoint saved — not verified. STAR remains in demo mode: the gateway has no STAR provider until the owner authorizes one, so no connection is claimed."
        : "No endpoint is saved. STAR is in demo mode — no AI backend connected.";
    });
    const checkBtn = el("button", { class: "btn btn-secondary", id: "settings-star-check", type: "button" }, "Check gateway");
    checkBtn.addEventListener("click", async () => {
      if (!B || typeof B.checkGateway !== "function") {
        note.textContent = "StarBackend did not load — the gateway could not be checked.";
        return;
      }
      note.textContent = "Checking the gateway…";
      const r = await B.checkGateway();
      if (r.reachable) {
        note.textContent = "Gateway check: reachable — the Phase 1 gateway answered gateway.status." +
          (r.note ? " It reports: “" + r.note + "”" : "") +
          " STAR itself is still not connected — the gateway has no STAR provider until the owner authorizes one.";
      } else {
        note.textContent = "Gateway check: UNREACHABLE — the gateway did not answer (" + (r.error ? r.error.message : "unknown error") + "). STAR remains in demo mode.";
      }
    });
    children.push(el("div", { class: "toggle-row" }, [saveBtn, checkBtn]));
    children.push(note);

    return section("STAR Backend", children);
  }

  // ---- Search & Privacy (Universal Search Phase 1 completion, P1.1) ----
  // Every control here wires an EXISTING mechanism — nothing new is
  // stored: the default web provider persists through the provider
  // registry (the same key the search bar's own provider select
  // writes, so there is never a second, competing default), and
  // history controls call SearchHistory directly. Where a search
  // type has exactly one provider in this build, the row says so —
  // no inert selector pretends a choice exists.
  function searchPrivacySection() {
    const P = global.SearchProviders;
    const H = global.SearchHistory;
    const children = [];

    // Default web provider — a real choice among the four launch
    // providers; the bar reads the same stored default.
    if (P && typeof P.listWebProviders === "function" && typeof P.setDefaultWebProvider === "function") {
      const current = typeof P.getDefaultWebProvider === "function" ? P.getDefaultWebProvider() : "duckduckgo";
      const select = el("select", { class: "input", id: "settings-search-provider", "aria-label": "Default web search provider" },
        P.listWebProviders().map((p) => el("option", { value: p.providerId, selected: p.providerId === current || undefined }, p.displayName || p.providerId)));
      select.addEventListener("change", () => {
        if (P.setDefaultWebProvider(select.value)) {
          setSearchStatus(`Default web provider: ${select.selectedOptions[0].textContent}. The search bar uses this provider first.`);
          U.toast("Default web provider updated");
        } else {
          setSearchStatus("That provider could not be set as the default.");
        }
      });
      children.push(field("Default web provider", select));
      children.push(el("div", { class: "api-meta" }, "Used first by the search bar's full-web links. Stored on this device only; the bar's provider menu writes the same setting."));
    } else {
      children.push(field("Default web provider", el("div", { class: "api-meta" }, "Provider registry did not load — the search bar keeps its built-in default (DuckDuckGo).")));
    }

    // Providers by type — truthful rows for the types where this
    // build has exactly one serving provider (or a fallback chain).
    children.push(field("Technical", el("div", { class: "api-meta" }, "GitHub (public) — the only technical provider in this build. Public repos and events only; private content is never sent to an external provider.")));
    children.push(field("Crypto prices", el("div", { class: "api-meta" }, "CoinGecko → Coinbase → CoinPaprika fallback chain (PriceScout). A chain, not a single default — the first source that answers wins.")));
    children.push(field("News", el("div", { class: "api-meta" }, "Hacker News (Algolia). RSS / Atom feeds: REQUIRES SETUP — not enabled until a server-side proxy is owner-approved.")));
    children.push(field("AI / search backend", el("div", { class: "api-meta" }, "REQUIRES SETUP — no key lives in this app; a key-required provider runs only through the private gateway with owner approval.")));

    // Search history — toggle + count + clear/export actions.
    if (H && typeof H.isEnabled === "function") {
      const toggle = el("button", { class: "btn btn-secondary", id: "settings-search-history-toggle", type: "button" }, H.isEnabled() ? "On" : "Off");
      const count = el("span", { class: "api-meta", id: "settings-search-history-count" }, searchHistoryCountText(H));
      toggle.addEventListener("click", () => {
        const next = !H.isEnabled();
        H.setEnabled(next);
        toggle.textContent = next ? "On" : "Off";
        count.textContent = searchHistoryCountText(H);
        setSearchStatus(next ? "Search history saving is ON — searches are recorded on this device only." : "Search history saving is OFF — nothing is recorded.");
      });
      const wrap = el("div", { class: "toggle-row" }, [toggle, count]);
      children.push(field("Search history", wrap));

      const clearSessionBtn = el("button", { class: "btn btn-secondary", id: "settings-search-clear-session", type: "button" }, "Clear session");
      clearSessionBtn.addEventListener("click", () => {
        // The bar records the default session's entries under "" and
        // a named session's entries under its sessionId; the current
        // session is whichever the active tab belongs to, so clear
        // both buckets that could hold "current" entries.
        const sids = [""];
        try {
          const at = global.SearchTabs && typeof global.SearchTabs.getActiveTab === "function" ? global.SearchTabs.getActiveTab() : null;
          if (at && typeof at.sessionId === "string" && at.sessionId && sids.indexOf(at.sessionId) === -1) sids.push(at.sessionId);
        } catch (e) {}
        let removed = 0;
        if (typeof H.clearSession === "function") sids.forEach((sid) => { removed += H.clearSession(sid); });
        count.textContent = searchHistoryCountText(H);
        setSearchStatus(`Cleared ${removed} search${removed === 1 ? "" : "es"} recorded in the current session.`);
      });
      children.push(field("Clear session history", clearSessionBtn));
      children.push(el("div", { class: "api-meta" }, "Removes the searches recorded in the current session (the active search tab's session). Other sessions' entries stay."));

      const clearAllBtn = el("button", { class: "btn btn-secondary", id: "settings-search-clear-all", type: "button" }, "Clear all");
      clearAllBtn.addEventListener("click", () => {
        if (typeof H.clearAll === "function") H.clearAll();
        count.textContent = searchHistoryCountText(H);
        setSearchStatus("All search history on this device was cleared.");
      });
      children.push(field("Clear all history", clearAllBtn));

      const exportBtn = el("button", { class: "btn btn-secondary", id: "settings-search-export", type: "button" }, "Export");
      exportBtn.addEventListener("click", () => {
        const json = typeof H.exportJson === "function" ? H.exportJson() : "[]";
        try {
          if (typeof Blob !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL) {
            const blob = new Blob([json], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "mti6-search-history.json";
            if (document.body && document.body.appendChild) document.body.appendChild(a);
            if (typeof a.click === "function") a.click();
            if (a.remove) a.remove();
          }
        } catch (e) {}
        setSearchStatus("Search history exported as JSON (explicit download — nothing is sent anywhere).");
      });
      children.push(field("Export history", exportBtn));
    } else {
      children.push(field("Search history", el("div", { class: "api-meta" }, "Search history module did not load.")));
    }

    // Temporary sessions — the honest label, verbatim from SearchTabs.
    const tempNote = global.SearchTabs && typeof global.SearchTabs.temporaryNote === "function"
      ? global.SearchTabs.temporaryNote()
      : "A temporary session keeps no search history in MTI6. It is not Tor Browser and not private/incognito mode.";
    children.push(field("Temporary sessions", el("div", { class: "api-meta" }, tempNote + " Start one from the search results History panel.")));
    children.push(field("What history keeps", el("div", { class: "api-meta" }, "Only the query text, source, origin and time — one storage key, at most 100 entries, on this device only. Never credentials, form data, page text, or URL query strings; a query that looks like a credential is not recorded at all.")));
    children.push(el("div", { class: "api-meta", id: "settings-search-status", "aria-live": "polite" }, ""));

    return section("Search & Privacy", children);
  }

  function searchHistoryCountText(H) {
    if (!H.isEnabled()) return "History is off — nothing is recorded or shown.";
    const n = typeof H.list === "function" ? (H.list() || []).length : 0;
    return `${n} search${n === 1 ? "" : "es"} recorded on this device`;
  }

  function setSearchStatus(text) {
    const node = document.getElementById("settings-search-status");
    if (node) node.textContent = text;
  }

  // Screen Lock (v111, corrected owner language): the toggle is
  // the OWNER PREFERENCE — Screen Lock ON means the device may dim
  // or sleep on its normal timeout; OFF means MTI6 keeps the screen
  // awake while this tab is visible. The ACTUAL WAKE LOCK STATE is
  // a separate fact from the preference: a lock is only ACTIVE when
  // one is actually held. The module owns the state; this row only
  // renders it and flips the persisted choice through the one
  // central setScreenLock capability STAR commands use too.
  function screenLockPreferenceText(s) {
    if (!s) return "Screen Lock: UNKNOWN — preference is not available.";
    return s.screenLockOn
      ? "Screen Lock: ON — the screen may dim or sleep normally."
      : "Screen Lock: OFF — the screen stays awake while this tab is visible.";
  }

  function wakeLockStateText(s) {
    if (!s) return "Wake lock: UNKNOWN — wake-lock state is not available.";
    if (s.state === "ACTIVE") return "Wake lock: ACTIVE — a lock is held, so the screen is being kept lit while this tab is visible.";
    if (s.state === "RELEASED") return "Wake lock: RELEASED — no lock is held.";
    if (s.state === "NOT_SUPPORTED") return "Wake lock: NOT_SUPPORTED — this browser has no Wake Lock API, so the screen cannot be kept lit by the cockpit.";
    if (s.state === "FAILED") return "Wake lock: FAILED — the wake-lock request was rejected" + (s.reason ? " (" + s.reason + ")" : "") + ".";
    return "Wake lock: REQUESTING — a request is in flight.";
  }

  function wakeLockField() {
    const W = global.WakeLock;
    if (!W || typeof W.getState !== "function") {
      return el("div", { class: "api-meta" }, "Screen lock is NOT_AVAILABLE — the wake-lock module did not load.");
    }
    const wrap = el("div", { class: "toggle-row" });
    const toggle = el("button", { class: "btn btn-secondary", id: "settings-wake-lock-toggle", type: "button" }, W.isScreenLockOn() ? "On" : "Off");
    const prefEl = el("span", { class: "api-meta", id: "settings-screen-lock-preference" }, screenLockPreferenceText(W.getState()));
    const stateEl = el("span", { class: "api-meta", id: "settings-wake-lock-state" }, wakeLockStateText(W.getState()));
    toggle.addEventListener("click", () => {
      const next = !W.isScreenLockOn();
      W.setScreenLock(next);
      toggle.textContent = next ? "On" : "Off";
      prefEl.textContent = screenLockPreferenceText(W.getState());
      stateEl.textContent = wakeLockStateText(W.getState());
    });
    if (typeof W.onChange === "function") {
      // v113: the toggle follows the SAME central change the text
      // lines follow — a STAR-driven setScreenLock notifies here,
      // so the button must re-render its pressed state live too,
      // not only when it is clicked (which updates it directly).
      // The click handler's optimistic update stays harmless: this
      // re-asserts the same value from the central state.
      W.onChange(function (s) {
        toggle.textContent = s.screenLockOn ? "On" : "Off";
        prefEl.textContent = screenLockPreferenceText(s);
        stateEl.textContent = wakeLockStateText(s);
      });
    }
    wrap.appendChild(toggle);
    wrap.appendChild(prefEl);
    wrap.appendChild(stateEl);
    return wrap;
  }

  // ---- STAR & Tribe Appearance / Sound & Voice / Permissions (Build 1) ----

  function starOverlayField() {
    const wrap = el("div", { class: "toggle-row" });
    const btn = el("button", { class: "btn btn-secondary" }, "Open STAR overlay");
    btn.addEventListener("click", () => {
      if (global.StarOverlay) global.StarOverlay.open();
      else U.toast("STAR overlay is not available right now.");
    });
    wrap.appendChild(btn);
    return wrap;
  }

  function volumeField() {
    const wrap = el("div", { class: "toggle-row" });
    const slider = el("input", { class: "input", type: "range", min: "0", max: "100", step: "5", value: "80", "aria-label": "Master volume" });
    const label = el("span", { class: "api-meta" }, "80%");
    slider.addEventListener("input", async () => {
      label.textContent = slider.value + "%";
      await CockpitDB.put("settings", { key: "master_volume", value: Number(slider.value) });
    });
    CockpitDB.get("settings", "master_volume").then((row) => {
      if (row && typeof row.value === "number") {
        slider.value = String(row.value);
        label.textContent = row.value + "%";
      }
    }).catch(() => {});
    wrap.appendChild(slider);
    wrap.appendChild(label);
    return wrap;
  }

  function simpleToggle(key, fallback, note) {
    const wrap = el("div", { class: "toggle-row" });
    const btn = el("button", { class: "btn btn-secondary" }, "Off");
    btn.addEventListener("click", async () => {
      const cur = btn.textContent === "On";
      btn.textContent = cur ? "Off" : "On";
      await CockpitDB.put("settings", { key, value: !cur });
      U.toast(`${note} ${!cur ? "on" : "off"}`);
    });
    CockpitDB.get("settings", key).then((row) => {
      btn.textContent = row ? (row.value ? "On" : "Off") : (fallback ? "On" : "Off");
    }).catch(() => {});
    wrap.appendChild(btn);
    return wrap;
  }

  function soundsToggleField() {
    // Honest shell: no interface sounds are wired yet — the preference
    // is stored now so it applies when they are.
    const wrap = el("div", { class: "toggle-row" });
    wrap.appendChild(simpleToggle("interface_sounds", false, "Interface sounds"));
    wrap.appendChild(el("span", { class: "api-meta" }, "Stored for when sounds are wired — none play yet."));
    return wrap;
  }

  function alertsToggleField() {
    return simpleToggle("alert_sounds", true, "Alert sounds");
  }

  function starVoiceField() {
    // Same voice preference the Security screen uses, kept in sync
    // through the shared localStorage key.
    const KEY = "mti6_star_style_v1";
    const select = el("select", { class: "input", "aria-label": "STAR voice" }, [
      el("option", { value: "Default" }, "Default"),
      el("option", { value: "Warm" }, "Warm"),
      el("option", { value: "Bright" }, "Bright")
    ]);
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (saved.voice) select.value = saved.voice;
    } catch (e) {}
    select.addEventListener("change", () => {
      try {
        const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
        saved.voice = select.value;
        localStorage.setItem(KEY, JSON.stringify(saved));
      } catch (e) {}
      U.toast("STAR voice updated");
    });
    return select;
  }

  async function permissionState(name) {
    try {
      if (!navigator.permissions || typeof navigator.permissions.query !== "function") {
        return "Unknown — this browser did not report a state";
      }
      const res = await navigator.permissions.query({ name });
      if (res.state === "granted") return "Granted";
      if (res.state === "denied") return "Denied";
      return "Not granted yet — the app asks only when you use it";
    } catch (e) {
      return "Unknown — this browser did not report a state";
    }
  }

  async function populatePermissionRows(root) {
    const node = root.querySelector("#perm-rows");
    if (!node) return;
    node.innerHTML = "";
    node.appendChild(statusRow("Camera permission", await permissionState("camera"), ""));
    node.appendChild(statusRow("Microphone permission", await permissionState("microphone"), ""));
    node.appendChild(statusRow("Speaker / output", "Default output — no separate output selection yet", ""));
    node.appendChild(statusRow("Remote device control", "Not implemented — this app does not control other devices", ""));
  }

  async function populateAppStatus(root) {
    const node = root.querySelector("#app-status-rows");
    if (!node) return;
    node.innerHTML = "";

    const online = navigator.onLine;
    node.appendChild(statusRow("Connection", online ? "Online" : "Offline", online ? "status-ok" : "status-warn"));

    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.active) {
          node.appendChild(statusRow("Offline support", "Active — this app works without a connection", "status-ok"));
        } else if (reg) {
          node.appendChild(statusRow("Offline support", "Installing…", "status-warn"));
        } else {
          node.appendChild(statusRow("Offline support", "Not yet active — reload the app once to enable it", "status-warn"));
        }
      } catch (e) {
        node.appendChild(statusRow("Offline support", "Unavailable in this browser", "status-warn"));
      }
    } else {
      node.appendChild(statusRow("Offline support", "Not supported by this browser", "status-warn"));
    }

    try {
      const keys = await caches.keys();
      node.appendChild(statusRow("Cached app version", keys.length ? keys[keys.length - 1] : "Not cached yet", ""));
    } catch (e) {
      node.appendChild(statusRow("Cached app version", "Unavailable", ""));
    }

    const installed = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    node.appendChild(statusRow("Installed to home screen", installed ? "Yes" : "Not yet", installed ? "status-ok" : ""));
  }

  function statusRow(label, value, valueClass) {
    return el("div", { class: "status-row" }, [
      el("span", {}, label),
      el("span", { class: `status-value ${valueClass || ""}` }, value)
    ]);
  }

  function triggerInstall() {
    const topBarBtn = document.getElementById("install-btn");
    if (topBarBtn && !topBarBtn.classList.contains("hidden")) {
      topBarBtn.click();
      return;
    }
    const installed = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    if (installed) {
      U.toast("This app is already installed on this device.");
    } else {
      U.toast('Use your browser menu → "Add to Home screen" to install.', "info");
    }
  }

  async function checkForUpdateNow(btn) {
    await U.withButtonLoading(btn, "Checking…", async () => {
      if (!global.CockpitApp || typeof global.CockpitApp.checkForUpdate !== "function") {
        U.toast("Update check isn't available in this browser.", "error");
        return;
      }
      const result = await global.CockpitApp.checkForUpdate();
      if (result.checked) {
        U.toast("Checked for updates — you'll see a Reload banner if one's ready.");
      } else {
        U.toast("Couldn't check for updates right now.", "error");
      }
    })();
  }

  async function populateStorageEstimate(root) {
    const node = root.querySelector("#storage-estimate");
    if (!node) return;
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const usedMB = ((est.usage || 0) / (1024 * 1024)).toFixed(2);
        const quotaMB = ((est.quota || 0) / (1024 * 1024)).toFixed(0);
        node.textContent = `${usedMB} MB used of ~${quotaMB} MB available on this device`;
      } catch (e) {
        node.textContent = "Not available on this browser";
      }
    } else {
      node.textContent = "Not available on this browser";
    }
  }

  function section(title, children) {
    return el("div", { class: "settings-section" }, [el("h2", { class: "section-title" }, title), ...children]);
  }

  function field(label, control) {
    return el("div", { class: "field-row" }, [el("label", { class: "field-label" }, label), control]);
  }

  function actionRow(title, desc, btnLabel, onClick, danger) {
    return el("div", { class: "action-row" }, [
      el("div", {}, [el("div", { class: "action-title" }, title), el("div", { class: "action-desc" }, desc)]),
      el("button", { class: `btn ${danger ? "btn-danger" : "btn-secondary"}`, onclick: onClick }, btnLabel)
    ]);
  }

  function themeToggle(theme) {
    const wrap = el("div", { class: "toggle-row" });
    const btn = el("button", { class: "btn btn-secondary" }, theme === "dark" ? "Dark (cockpit)" : "Light");
    btn.addEventListener("click", async () => {
      const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", cur);
      await CockpitDB.put("settings", { key: "theme", value: cur });
      btn.textContent = cur === "dark" ? "Dark (cockpit)" : "Light";
      U.toast(`Switched to ${cur} mode`);
    });
    wrap.appendChild(btn);
    return wrap;
  }

  function currencySelect(current) {
    const options = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR"];
    const select = el(
      "select",
      {
        class: "input",
        onchange: async (e) => {
          await CockpitDB.put("settings", { key: "currency", value: e.target.value });
          try {
            localStorage.setItem("cockpit_currency", e.target.value);
          } catch (err) {}
          U.toast("Currency updated");
        }
      },
      options.map((c) => el("option", { value: c, selected: c === current || undefined }, c))
    );
    return select;
  }

  async function getSetting(key, fallback) {
    const row = await CockpitDB.get("settings", key);
    return row ? row.value : fallback;
  }

  function openExportDialog() {
    const overlay = el("div", { class: "modal-overlay" });
    const passInput = el("input", { class: "input", type: "password", placeholder: "Create a backup passphrase" });
    const confirmInput = el("input", { class: "input", type: "password", placeholder: "Confirm passphrase" });
    const box = el("div", { class: "modal-box" }, [
      el("h2", {}, "Export Encrypted Backup"),
      el("p", { class: "about-text" }, "Your backup file is encrypted with this passphrase. Keep it safe — without it, the backup cannot be restored."),
      el("label", { class: "field-label" }, "Passphrase"),
      passInput,
      el("label", { class: "field-label" }, "Confirm"),
      confirmInput,
      el("div", { class: "modal-actions" }, [
        el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "Cancel"),
        el("button", {
          class: "btn btn-primary",
          onclick: async (ev) => {
            if (passInput.value !== confirmInput.value) {
              U.fieldError(confirmInput, "Passphrases don't match.");
              return;
            }
            U.clearFieldError(confirmInput);
            const btn = ev.currentTarget;
            await U.withButtonLoading(btn, "Encrypting…", async () => {
              try {
                const envelope = await CockpitBackup.createEncryptedExport(passInput.value);
                const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
                CockpitBackup.downloadTextFile(`mti6-gtadwiy-cockpit-backup-${stamp}.json`, envelope);
                await CockpitDB.logActivity("settings", "Exported encrypted backup");
                overlay.remove();
                U.toast("Backup exported");
              } catch (e) {
                U.toast(e.message || "Export failed", "error");
              }
            })();
          }
        }, "Export")
      ])
    ]);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    passInput.focus();
  }

  function openImportDialog() {
    const overlay = el("div", { class: "modal-overlay" });
    const fileInput = el("input", { class: "input", type: "file", accept: "application/json,.json" });
    const passInput = el("input", { class: "input", type: "password", placeholder: "Backup passphrase" });
    const modeSelect = el("select", { class: "input" }, [
      el("option", { value: "replace" }, "Replace all current data"),
      el("option", { value: "merge" }, "Merge with current data")
    ]);
    const box = el("div", { class: "modal-box" }, [
      el("h2", {}, "Import Backup"),
      el("label", { class: "field-label" }, "Backup file"),
      fileInput,
      el("label", { class: "field-label" }, "Passphrase"),
      passInput,
      el("label", { class: "field-label" }, "Import mode"),
      modeSelect,
      el("div", { class: "modal-actions" }, [
        el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "Cancel"),
        el("button", {
          class: "btn btn-primary",
          onclick: async (ev) => {
            const file = fileInput.files && fileInput.files[0];
            if (!file) {
              U.toast("Choose a backup file", "error");
              return;
            }
            const btn = ev.currentTarget;
            await U.withButtonLoading(btn, "Restoring…", async () => {
              try {
                const text = await file.text();
                const data = await CockpitBackup.decryptImport(text, passInput.value);
                await CockpitDB.importAll(data, { merge: modeSelect.value === "merge" });
                await CockpitDB.logActivity("settings", "Imported backup", null);
                overlay.remove();
                U.toast("Backup restored. Reloading…");
                setTimeout(() => location.reload(), 900);
              } catch (e) {
                U.toast(e.message || "Import failed", "error");
              }
            })();
          }
        }, "Import")
      ])
    ]);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function openResetDialog() {
    const overlay = el("div", { class: "modal-overlay" });
    const confirmInput = el("input", { class: "input", placeholder: 'Type "RESET" to confirm' });
    const box = el("div", { class: "modal-box" }, [
      el("h2", {}, "Reset Application"),
      el("p", { class: "about-text" }, "This permanently deletes every note, task, expense, project, and milestone stored on this device. This cannot be undone. Export a backup first if you want to keep your data. Your theme, currency, and dashboard widget layout are kept as-is."),
      confirmInput,
      el("div", { class: "modal-actions" }, [
        el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "Cancel"),
        el("button", {
          class: "btn btn-danger",
          onclick: async (ev) => {
            if (confirmInput.value.trim().toUpperCase() !== "RESET") {
              U.fieldError(confirmInput, 'Type "RESET" (all caps) to confirm.');
              return;
            }
            U.clearFieldError(confirmInput);
            const btn = ev.currentTarget;
            await U.withButtonLoading(btn, "Erasing…", async () => {
              await CockpitDB.clearAll({ preserve: ["settings", "widgets"] });
              overlay.remove();
              U.toast("Application reset. Reloading…");
              setTimeout(() => location.reload(), 900);
            })();
          }
        }, "Erase Everything")
      ])
    ]);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.settings = { render, getSetting };
})(window);
