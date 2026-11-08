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
      field("Device connection", el("div", { class: "api-meta" }, navigator.onLine ? "Online" : "Offline"))
    ]));

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
