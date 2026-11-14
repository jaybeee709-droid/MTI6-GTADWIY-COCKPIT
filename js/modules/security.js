/* MTI6-GTADWIY-COCKPIT — Security screen
 * Two honest pieces, kept separate:
 * 1. Bot look & voice (cosmetic): pick Star's avatar look and a
 *    voice style, previewed with the device's own speech engine.
 *    The voice choice is stored locally and will be used when
 *    voice output is enabled — Star does not speak yet in chat.
 * 2. Camera preview (permission-only, local-only): a live preview
 *    that runs only while this screen is open and you tapped
 *    Allow. Nothing is recorded, sent, or used to identify anyone.
 *    Stop closes the camera immediately.
 * 3. Devices & alerts (account APIs, not cameras): check signed-in
 *    devices directly in each account. One item is still open from
 *    the Oct 31 Gmail summary: the Oct 30 Linux sign-in, awaiting
 *    the owner's confirmation whether it was them.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  var STYLE_KEY = "mti6_star_style_v1";
  var AVATARS = ["🌟", "🤖", "🐱", "🔮"];
  var VOICES = [
    { name: "Default", rate: 1, pitch: 1 },
    { name: "Warm", rate: 0.9, pitch: 0.8 },
    { name: "Bright", rate: 1.15, pitch: 1.2 }
  ];

  function loadStyle() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(STYLE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : { avatar: "🌟", voice: "Default" };
    } catch (e) { return { avatar: "🌟", voice: "Default" }; }
  }
  function saveStyle(style) {
    try { if (global.localStorage) global.localStorage.setItem(STYLE_KEY, JSON.stringify(style)); } catch (e) {}
  }

  /* ---- Angel Security dashboard (Visual Build Stage 2, W5) ------------
   * Read-only view over AngelSecurity + AngelIdentities. Every read
   * is guarded: if a module is not loaded, its area renders
   * NOT LOADED — never a crash, never a claim of "clear". The alert
   * store starts empty by design; zero alerts renders an honest
   * NO_ALERTS empty state, never a fabricated threat map or count.
   * The emergency pause control is disabled and labelled as such:
   * no live control path exists in this build. Single scrolling
   * dashboard — no tabs: the four sections do not need sub-views.
   */

  var ANGEL_SEVERITY_CARD_CLASS = {
    CRITICAL: "angel-alert-card--critical",
    HIGH: "angel-alert-card--caution",
    CAUTION: "angel-alert-card--caution",
    INFORMATIONAL: "angel-alert-card--info",
    UNKNOWN: "angel-alert-card--info"
  };

  function angelSecurity() {
    try {
      var m = global.AngelSecurity;
      return (m && typeof m === "object") ? m : null;
    } catch (e) { return null; }
  }

  function angelIdentities() {
    try {
      var m = global.AngelIdentities;
      return (m && typeof m === "object") ? m : null;
    } catch (e) { return null; }
  }

  function angelText(value, fallback) {
    return (typeof value === "string" && value.trim().length) ? value : (fallback || "UNKNOWN");
  }

  function angelCount(value) {
    return (typeof value === "number" && isFinite(value)) ? value : 0;
  }

  function angelSafeListAlerts() {
    var m = angelSecurity();
    if (!m || typeof m.listAlerts !== "function") return null;
    try {
      var out = m.listAlerts();
      return Array.isArray(out) ? out : null;
    } catch (e) { return null; }
  }

  function angelSafeSummary() {
    var m = angelSecurity();
    if (!m || typeof m.summary !== "function") return null;
    try {
      var out = m.summary();
      return (out && typeof out === "object") ? out : null;
    } catch (e) { return null; }
  }

  function angelSafeListAngels() {
    var m = angelSecurity();
    if (!m || typeof m.listAngels !== "function") return null;
    try {
      var out = m.listAngels();
      return Array.isArray(out) ? out : null;
    } catch (e) { return null; }
  }

  function angelSafeGetAngel(id) {
    var m = angelSecurity();
    if (!m || typeof m.getAngel !== "function" || typeof id !== "string") return null;
    try { return m.getAngel(id) || null; } catch (e) { return null; }
  }

  // Angel Security angel records carry no display name; the record
  // id is the honest identifier. Never map an id to an identity
  // name — no such mapping exists in either module.
  function angelLabel(id) {
    if (typeof id !== "string" || !id) return "Unassigned";
    return angelSafeGetAngel(id)
      ? ("Angel " + id)
      : ("Angel " + id + " (record not found in the Angel store)");
  }

  function angelNotLoaded(label) {
    return U.el("div", { class: "mti6-card" }, [
      U.el("h3", {}, label),
      U.el("div", { class: "mti6-alert mti6-alert--caution" }, "NOT LOADED — the Angel Security module is not loaded in this build, so nothing is shown here. This is not a claim that anything is clear.")
    ]);
  }

  // Stage 1 metric markup (§24): label + value use the shared
  // .mti6-metric__label / __value classes (unclassed inner divs
  // would render at default size, outside the metric system).
  function angelMetric(label, value) {
    return U.el("div", { class: "mti6-metric" }, [
      U.el("div", { class: "mti6-metric__label" }, label),
      U.el("div", { class: "mti6-metric__value" }, String(value))
    ]);
  }

  function angelAlertCard(alert) {
    var severity = angelText(alert.severity, "UNKNOWN");
    var cardClass = "angel-alert-card " +
      (ANGEL_SEVERITY_CARD_CLASS[severity] || "angel-alert-card--info");
    var evidence = Array.isArray(alert.evidence) ? alert.evidence : [];
    var history = Array.isArray(alert.history) ? alert.history : [];
    var mitigation = (alert.mitigation && typeof alert.mitigation === "object")
      ? (angelText(alert.mitigation.text, "") + " — by " + angelText(alert.mitigation.by, "UNKNOWN") + " at " + U.fmtDateTime(alert.mitigation.at))
      : "None recorded";
    var resolution = (alert.resolution && typeof alert.resolution === "object")
      ? (angelText(alert.resolution.text, "") + " — by " + angelText(alert.resolution.by, "UNKNOWN") + " at " + U.fmtDateTime(alert.resolution.at))
      : null;
    var starNote = (alert.starNotification && typeof alert.starNotification === "object")
      ? ("Notified at " + U.fmtDateTime(alert.starNotification.notifiedAt) + " — " + angelText(alert.starNotification.summary, ""))
      : "Not notified — no STAR notification record";
    var detailsKids = [];
    evidence.forEach(function (e) {
      detailsKids.push(U.el("div", { class: "api-meta" },
        (e && e.kind ? String(e.kind) : "UNKNOWN") + ": " +
        (e && e.reference ? String(e.reference) : "UNKNOWN") +
        " (recorded " + U.fmtDateTime(e && e.recordedAt) + ")"));
    });
    if (!evidence.length) {
      detailsKids.push(U.el("div", { class: "api-meta" }, "No evidence entries recorded."));
    }
    var related = [];
    if (Array.isArray(alert.relatedAssets) && alert.relatedAssets.length) {
      related.push("Related assets: " + alert.relatedAssets.join(", "));
    }
    if (Array.isArray(alert.relatedNetworks) && alert.relatedNetworks.length) {
      related.push("Related networks: " + alert.relatedNetworks.join(", "));
    }
    if (related.length) {
      detailsKids.push(U.el("div", { class: "api-meta" }, related.join(" · ")));
    }
    if (history.length) {
      detailsKids.push(U.el("div", { class: "api-meta" }, "History:"));
      history.forEach(function (h) {
        detailsKids.push(U.el("div", { class: "api-meta" },
          (h && h.from ? String(h.from) : "—") + " → " +
          (h ? String(h.to) : "UNKNOWN") + " at " + U.fmtDateTime(h && h.at) +
          " by " + (h && h.by ? String(h.by) : "UNKNOWN") +
          (h && h.note ? (" — " + String(h.note)) : "")));
      });
    }
    var cardKids = [
      U.el("div", { class: "mti6-badge" }, "Severity: " + severity),
      U.el("h4", {}, angelText(alert.title, "Untitled alert")),
      U.el("p", {}, angelText(alert.description, "")),
      U.el("div", { class: "api-meta" }, "Alert class: " + angelText(alert.alertClass, "Unclassified") + " · Affected subsystem: " + angelText(alert.affectedSystem, "UNKNOWN") + " · Source: " + angelText(alert.source, "UNKNOWN")),
      U.el("div", { class: "api-meta" }, "Verification state: " + angelText(alert.state, "UNKNOWN") + " · Started: " + U.fmtDateTime(alert.detectedAt) + " · Current status: " + angelText(alert.state, "UNKNOWN") + " · Last updated: " + U.fmtDateTime(alert.lastUpdated)),
      U.el("div", { class: "api-meta" }, "Assigned Angel: " + angelLabel(alert.assignedAngelId)),
      U.el("div", { class: "api-meta" }, "Mitigation: " + mitigation),
      resolution ? U.el("div", { class: "api-meta" }, "Resolution: " + resolution) : null,
      U.el("div", { class: "api-meta" }, "STAR notification: " + starNote),
      U.el("details", {}, [U.el("summary", {}, "Evidence (" + evidence.length + " entries) — expand to view")].concat(detailsKids))
    ];
    return U.el("div", { class: cardClass }, cardKids);
  }

  function angelAlertGroup(title, alerts) {
    var kids = [U.el("h3", {}, title + " (" + alerts.length + ")")];
    if (!alerts.length) {
      kids.push(U.el("div", { class: "api-meta" }, "None recorded."));
    } else {
      alerts.forEach(function (a) { kids.push(angelAlertCard(a)); });
    }
    return U.el("div", { class: "mti6-card" }, kids);
  }

  // Module-independent: a disabled control with an honest label.
  // Rendered even when AngelSecurity is not loaded, because it
  // depends on no module — it must never pretend to pause anything.
  function angelEmergencyCard() {
    return U.el("div", { class: "mti6-card" }, [
      U.el("h3", {}, "Emergency controls"),
      U.el("button", { class: "mti6-btn", type: "button", disabled: true }, "Emergency pause"),
      U.el("div", { class: "mti6-alert mti6-alert--caution" }, "Emergency pause: NOT CONNECTED — no live control path exists in this build; pausing is a future owner control")
    ]);
  }

  function renderAngelDashboard(root) {
    var dash = U.el("div", { class: "angel-dash" }, []);
    var statusEl = U.el("div", { class: "mti6-screen-header__status" }, "");
    dash.appendChild(U.el("div", { class: "mti6-screen-header" }, [
      U.el("div", { class: "mti6-screen-header__icon" }, "🛡️"),
      U.el("div", { class: "mti6-screen-header__title" }, "Angel Security"),
      U.el("div", { class: "mti6-screen-header__desc" }, "Separate from the Twelve Tribes. Descriptive only: alerts are recorded from real evidence, never invented, and nothing here executes anything."),
      statusEl
    ]));

    var sec = angelSecurity();
    if (!sec) {
      statusEl.textContent = "NOT LOADED";
      dash.appendChild(angelNotLoaded("Angel Security dashboard"));
      dash.appendChild(angelEmergencyCard());
      root.appendChild(dash);
      return;
    }
    var summary = angelSafeSummary();
    var alerts = angelSafeListAlerts();
    if (!summary || !alerts) {
      statusEl.textContent = "NOT LOADED";
      dash.appendChild(angelNotLoaded("Angel Security dashboard"));
      dash.appendChild(angelEmergencyCard());
      root.appendChild(dash);
      return;
    }
    statusEl.textContent = angelText(summary.state, "UNKNOWN");

    // ---- Counts (from summary().byState — real counts only) ----------
    var byState = summary.byState || {};
    var n = function (s) { return angelCount(byState[s]); };
    var activeCount = n("DETECTED") + n("CONFIRMED") + n("ACTIVE");
    var verifyingCount = n("VERIFYING");
    var mitigatingCount = n("MITIGATING");
    var resolvedCount = n("RESOLVED") + n("POST_INCIDENT_REVIEW");
    dash.appendChild(U.el("div", { class: "mti6-card" }, [
      U.el("h3", {}, "Alert counts"),
      angelMetric("Total alerts", summary.count),
      angelMetric("Active alerts", activeCount),
      angelMetric("Verifying alerts", verifyingCount),
      angelMetric("Mitigations in progress", mitigatingCount),
      angelMetric("Resolved incidents", resolvedCount),
      angelMetric("Angel workers recorded", angelCount(summary.angels)),
      summary.note ? U.el("div", { class: "api-meta" }, String(summary.note)) : null
    ]));

    // ---- Security domains (categories only) ---------------------------
    var domains = Array.isArray(sec.DOMAINS) ? sec.DOMAINS : [];
    var angels = angelSafeListAngels();
    var domainKids = [
      U.el("h3", {}, "Security domains"),
      U.el("div", { class: "api-meta" }, "The Angel identity registry records no domain assignment: domains are categories, not assignments — assignment happens only through an Angel Security alert/workflow record.")
    ];
    if (!domains.length) {
      domainKids.push(U.el("div", { class: "mti6-alert mti6-alert--caution" }, "NOT LOADED — no security domain list is available from the Angel Security module."));
    }
    domains.forEach(function (d) {
      var count = (summary.byDomain && typeof summary.byDomain[d.id] === "number")
        ? summary.byDomain[d.id] : 0;
      var covering = angels ? angels.filter(function (a) {
        return a && Array.isArray(a.domains) && a.domains.indexOf(d.id) !== -1;
      }) : [];
      var angelLine = covering.length
        ? covering.map(function (a) { return "Angel " + a.id; }).join(", ")
        : "None recorded";
      domainKids.push(U.el("div", { class: "angel-domain-row" }, [
        U.el("div", {}, angelText(d.label, d.id) + " — " + count + " alert" + (count === 1 ? "" : "s")),
        U.el("div", { class: "api-meta" }, angelText(d.description, "")),
        U.el("div", { class: "api-meta" }, "Assigned Angel workers: " + angelLine)
      ]));
    });
    dash.appendChild(U.el("div", { class: "mti6-card" }, domainKids));

    // ---- Alert lists, filtered by state -------------------------------
    function inStates(list) {
      return alerts.filter(function (a) {
        return a && list.indexOf(a.state) !== -1;
      });
    }
    if (!alerts.length) {
      dash.appendChild(U.el("div", { class: "mti6-empty" }, [
        U.el("div", { class: "mti6-empty__title" }, "NO_ALERTS — no alerts recorded"),
        U.el("div", { class: "mti6-empty__body" }, "What is missing: no alerts are recorded in the Angel Security store. Whether this is expected: yes — the alert store starts empty and gains entries only from real evidence with full provenance. What happens next: Angel Security monitors continuously, and an alert created from real evidence would appear here with its severity, evidence, and assigned Angel. Whether this is safe: no evidence of any incident — this states only that no alert has been recorded, not that the cockpit is proven clear.")
      ]));
    } else {
      dash.appendChild(angelAlertGroup("Active alerts", inStates(["DETECTED", "CONFIRMED", "ACTIVE"])));
      dash.appendChild(angelAlertGroup("Verifying alerts", inStates(["VERIFYING"])));
      dash.appendChild(angelAlertGroup("Mitigations", inStates(["MITIGATING"])));
      dash.appendChild(angelAlertGroup("Resolved incidents", inStates(["RESOLVED", "POST_INCIDENT_REVIEW"])));
    }

    // ---- Coverage summary: subsystems + angels + STAR -----------------
    var subsystems = [];
    alerts.forEach(function (a) {
      if (a && a.affectedSystem && subsystems.indexOf(a.affectedSystem) === -1) {
        subsystems.push(a.affectedSystem);
      }
    });
    var domainsWithAlerts = domains.filter(function (d) {
      return summary.byDomain && summary.byDomain[d.id] > 0;
    }).map(function (d) { return angelText(d.label, d.id); });
    var notified = alerts.filter(function (a) { return a && a.starNotification; }).length;
    var assigned = alerts.filter(function (a) {
      return a && typeof a.assignedAngelId === "string" && a.assignedAngelId;
    }).length;
    var ident = angelIdentities();
    var identLine;
    if (!ident || typeof ident.listApproved !== "function" ||
        typeof ident.listPendingVerification !== "function") {
      identLine = "Angel identity registry: NOT LOADED — the identity registry is not loaded in this build.";
    } else {
      try {
        var approved = ident.listApproved();
        var pending = ident.listPendingVerification();
        identLine = "Angel identities: " + approved.length + " approved (" +
          approved.map(function (i) { return i.displayName; }).join(", ") + "), " +
          pending.length + " pending verification (" +
          pending.map(function (i) { return i.displayName; }).join(", ") +
          "). Pending identities are not assignable to live work until approved.";
      } catch (e) {
        identLine = "Angel identity registry: NOT LOADED — the identity registry could not be read.";
      }
    }
    dash.appendChild(U.el("div", { class: "mti6-card" }, [
      U.el("h3", {}, "Coverage summary"),
      U.el("div", { class: "api-meta" }, "Domains with alerts: " + (domainsWithAlerts.length ? domainsWithAlerts.join(", ") : "None — no domain has an alert recorded.")),
      U.el("div", { class: "api-meta" }, "Affected subsystems: " + (subsystems.length ? subsystems.join(", ") : "None recorded — no alerts exist.")),
      U.el("div", { class: "api-meta" }, "Assigned Angel workers: " + assigned + " of " + alerts.length + " alerts assigned; " + angelCount(summary.angels) + " Angel workers recorded in the Angel store."),
      U.el("div", { class: "api-meta" }, alerts.length
        ? ("STAR notification: " + notified + " of " + alerts.length + " alerts carry a STAR notification record.")
        : "STAR notification: UNKNOWN — no alerts recorded, so no notification state exists."),
      U.el("div", { class: "api-meta" }, identLine)
    ]));

    // ---- Emergency controls (disabled by design — no live path) -------
    dash.appendChild(angelEmergencyCard());

    root.appendChild(dash);
  }

  async function render(root) {
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("security") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "🛡️ Security & Bot Style"));
    root.appendChild(U.el("p", { class: "api-subtitle" }, "Look and voice are cosmetic choices stored on this device. Camera is a local preview only. Real device security comes from checking signed-in devices in each account — not from a camera watching you."));

    var style = loadStyle();
    var styleOut = U.el("div", { class: "api-meta" }, "Current look: " + style.avatar + " · Voice: " + style.voice);
    var avatarRow = U.el("div", { class: "price-input-row" });
    AVATARS.forEach(function (a) {
      var b = U.el("button", { class: "btn btn-ghost", type: "button" }, a);
      b.addEventListener("click", function () { style.avatar = a; saveStyle(style); styleOut.textContent = "Current look: " + style.avatar + " · Voice: " + style.voice; });
      avatarRow.appendChild(b);
    });
    var voiceRow = U.el("div", { class: "price-input-row" });
    VOICES.forEach(function (v) {
      var b = U.el("button", { class: "btn btn-ghost btn-sm", type: "button" }, v.name + " (preview)");
      b.addEventListener("click", function () {
        style.voice = v.name; saveStyle(style); styleOut.textContent = "Current look: " + style.avatar + " · Voice: " + style.voice;
        try {
          if ("speechSynthesis" in window) {
            var utter = new SpeechSynthesisUtterance("Hello, this is Star, in the " + v.name + " voice.");
            utter.rate = v.rate; utter.pitch = v.pitch; window.speechSynthesis.speak(utter);
          } else { styleOut.textContent += " — voice preview is not supported by this browser."; }
        } catch (e) { styleOut.textContent += " — voice preview failed on this device."; }
      });
      voiceRow.appendChild(b);
    });
    root.appendChild(U.el("div", { class: "api-panel" }, [U.el("h3", {}, "Bot look & voice"), avatarRow, voiceRow, styleOut]));

    var video = document.createElement("video");
    video.setAttribute("playsinline", "");
    video.style.width = "100%";
    video.style.display = "none";
    var camOut = U.el("div", { class: "api-meta" }, "Camera is off. Tap Start preview to allow it once, on this device only. Nothing is recorded or sent.");
    var stream = null;
    var startBtn = U.el("button", { class: "btn btn-primary", type: "button" }, "Start camera preview");
    var stopBtn = U.el("button", { class: "btn btn-ghost", type: "button" }, "Stop camera");
    startBtn.addEventListener("click", function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camOut.textContent = "Camera is not available in this browser."; return; }
      navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(function (s) {
        stream = s; video.srcObject = s; video.style.display = "block"; video.play();
        camOut.textContent = "Camera preview is live on this device only. Nothing is recorded, sent, or used to identify anyone. Tap Stop camera to close it.";
      }).catch(function () { camOut.textContent = "Camera permission was not granted. Nothing was recorded."; });
    });
    stopBtn.addEventListener("click", function () {
      if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      video.style.display = "none"; camOut.textContent = "Camera is off.";
    });
    root.appendChild(U.el("div", { class: "api-panel" }, [U.el("h3", {}, "Camera preview (local only)"), U.el("div", { class: "price-input-row" }, [startBtn, stopBtn]), camOut]));
    root.querySelectorAll(".api-panel")[1].appendChild(video);

    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Devices & alerts"),
      U.el("div", { class: "api-meta" }, "Open item from your Gmail summary (Oct 31): a Google sign-in on a Linux device on Oct 30 at 10:51 a.m. is still awaiting your confirmation whether it was you. If it was not you, secure the account at myaccount.google.com directly — never through an emailed link."),
      U.el("div", { class: "api-meta" }, "Check signed-in devices directly: Google — myaccount.google.com device activity; GitHub — github.com settings, Applications. A web page cannot list your devices for you without each account's own login and permission.")
    ]));

    renderAngelDashboard(root);
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.security = { render: render };
})(window);
