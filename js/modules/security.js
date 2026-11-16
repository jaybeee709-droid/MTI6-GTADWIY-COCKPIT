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

  // Item 8 (World Engine Depth Package, Nov 14, 2026): the dashboard
  // gains owner-driven write controls — alert intake + lifecycle
  // transitions — so the current root is kept for a full, honest
  // re-render after any owner action.
  var angelRoot = null;
  function refreshSecurity() {
    if (angelRoot) {
      try { render(angelRoot); } catch (e) {}
    }
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

  // Angel robot portraits (Angel Robots package, owner ruling
  // 2026-11-16: "the angels would be straight up robots like those
  // pics"): each APPROVED identity shows its generated robot
  // portrait from js/data/angel-portraits.js (window.ANGEL_PORTRAITS,
  // keyed by canonical identity id) beside its name. The data file
  // is OPTIONAL: a missing file, a missing entry, or an image that
  // fails to load leaves the name-only presentation exactly as
  // before. The portrait lookup runs ONLY over listApproved() —
  // REQUIRES_VERIFICATION identities (RAGUEL, SARIEL, REMIEL) are
  // listed name-only below and never get a portrait or an image.
  function angelPortraitNode(identity) {
    var portraits = global.ANGEL_PORTRAITS;
    var src = portraits && typeof portraits[identity.id] === "string" && portraits[identity.id]
      ? portraits[identity.id] : null;
    if (!src) return null;
    var img = U.el("img", {
      class: "angel-portrait-img",
      src: src,
      alt: "",
      onerror: function () {
        var frame = img.parentNode;
        if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
      }
    });
    return U.el("div", { class: "angel-portrait-medallion", "aria-hidden": "true" }, [img]);
  }

  function angelIdentitiesCard(ident) {
    if (!ident || typeof ident.listApproved !== "function" ||
        typeof ident.listPendingVerification !== "function") return null;
    var approved, pending;
    try {
      approved = ident.listApproved();
      pending = ident.listPendingVerification();
    } catch (e) { return null; }
    var kids = [U.el("h3", {}, "Angel identities")];
    approved.forEach(function (identity) {
      var rowKids = [];
      var medallion = angelPortraitNode(identity);
      if (medallion) rowKids.push(medallion);
      rowKids.push(U.el("div", {}, [
        U.el("div", {}, angelText(identity.displayName, identity.id)),
        U.el("div", { class: "api-meta" }, angelText(identity.sourceReference, "") + " · " + angelText(identity.sourceTier, "") + " · APPROVED")
      ]));
      kids.push(U.el("div", { class: "angel-identity-row" }, rowKids));
    });
    if (pending && pending.length) {
      kids.push(U.el("div", { class: "api-meta" }, "Pending verification — no portrait, not assignable to live work until approved: " +
        pending.map(function (i) { return i.displayName; }).join(", ")));
    }
    return U.el("div", { class: "mti6-card" }, kids);
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
    // Item 8: owner lifecycle controls. Only the transitions the
    // module itself allows from the current state are offered
    // (canTransitionAlert is the authority); every move is recorded
    // in the alert's history with the owner as the actor. There are
    // no detectors behind this screen — the owner is the actor.
    var secForCard = angelSecurity();
    var transKids = [];
    if (secForCard && typeof secForCard.transitionAlert === "function" &&
        typeof secForCard.canTransitionAlert === "function" &&
        Array.isArray(secForCard.ALERT_STATES)) {
      var nextStates = secForCard.ALERT_STATES.filter(function (st) {
        try { return secForCard.canTransitionAlert(alert.state, st); } catch (e) { return false; }
      });
      if (nextStates.length) {
        var transStatus = U.el("div", { class: "api-meta" }, "");
        var btnRow = U.el("div", { class: "price-input-row" }, []);
        nextStates.forEach(function (st) {
          var b = U.el("button", { class: "btn btn-ghost btn-sm", type: "button" }, "Move to " + st);
          b.addEventListener("click", function () {
            try {
              secForCard.transitionAlert(alert.id, st, "owner", "Owner transition from the Security screen.");
              refreshSecurity();
            } catch (e) {
              transStatus.textContent = "Transition failed: " + (e && e.message ? e.message : String(e));
            }
          });
          btnRow.appendChild(b);
        });
        transKids.push(U.el("div", { class: "api-meta" }, "Owner lifecycle controls — your decision, recorded in this alert's history:"));
        transKids.push(btnRow);
        transKids.push(transStatus);
      }
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
    ].concat(transKids);
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

  // Item 8: owner alert intake. The owner is the detector: this
  // records something the OWNER observed, with their provenance and
  // at least one evidence entry (the module requires both and
  // refuses anything less). createAlert forces the state to
  // DETECTED — an intake can never create a CONFIRMED or active
  // alert — and the record persists in AngelSecurity's own store
  // (mti6_angel_security_v1), surfacing identically on Crypto World
  // and the World Globe Security layer, where alarm red is reserved
  // for verified-and-active alerts only.
  function angelIntakeCard(sec) {
    function field(labelText, input) {
      return U.el("div", { class: "api-meta", style: "margin-top:8px" }, [
        U.el("div", {}, labelText),
        input
      ]);
    }
    function textIn(placeholder) {
      return U.el("input", { class: "price-input", type: "text", placeholder: placeholder });
    }
    function selectIn(values, labels) {
      var sel = U.el("select", { class: "price-input" }, []);
      values.forEach(function (v, i) {
        sel.appendChild(U.el("option", { value: v }, labels ? labels[i] : v));
      });
      return sel;
    }
    var titleIn = textIn("What happened — short title");
    var descIn = textIn("What you observed, in plain words");
    var domainSel = selectIn(
      (sec.DOMAINS || []).map(function (d) { return d.id; }),
      (sec.DOMAINS || []).map(function (d) { return d.label || d.id; }));
    var sevSel = selectIn(sec.SEVERITIES || ["UNKNOWN"]);
    var classValues = [""].concat(sec.ALERT_CLASS_IDS || []).concat(["UNKNOWN_CLASS"]);
    var classLabels = ["(no class — leave unclassified)"].concat(sec.ALERT_CLASS_IDS || []).concat(["UNKNOWN_CLASS"]);
    var classSel = selectIn(classValues, classLabels);
    var sysIn = textIn("Affected system, e.g. wallet, crypto-world, star");
    var evKindIn = textIn("Evidence kind");
    evKindIn.value = "OWNER_OBSERVATION";
    var evRefIn = textIn("Evidence reference — what you saw and where (required)");
    var sourceIn = textIn("Provenance / source");
    sourceIn.value = "owner-entered";
    var status = U.el("div", { class: "api-meta", style: "margin-top:10px" }, "");
    var submit = U.el("button", { class: "btn btn-secondary", type: "button" }, "Record alert at DETECTED");
    submit.addEventListener("click", function () {
      var now = new Date().toISOString();
      var input = {
        title: titleIn.value.trim(),
        description: descIn.value.trim(),
        domain: domainSel.value,
        severity: sevSel.value,
        affectedSystem: sysIn.value.trim(),
        source: sourceIn.value.trim() || "owner-entered",
        detectedAt: now,
        evidence: [{
          kind: evKindIn.value.trim() || "OWNER_OBSERVATION",
          reference: evRefIn.value.trim(),
          recordedAt: now
        }]
      };
      if (classSel.value) input.alertClass = classSel.value;
      try {
        var created = sec.createAlert(input);
        status.textContent = "Recorded at DETECTED (id " + created.id + "). Refreshing…";
        refreshSecurity();
      } catch (e) {
        status.textContent = "Not recorded: " + (e && e.message ? e.message : String(e));
      }
    });
    return U.el("div", { class: "mti6-card" }, [
      U.el("h3", {}, "Owner alert intake"),
      U.el("div", { class: "api-meta" }, "You are the detector. Record something YOU observed — this screen has no live detectors and creates no alerts on its own. An alert always starts at DETECTED with your provenance and evidence; creating one claims nothing about any system being monitored. The same record surfaces on Crypto World and the World Globe Security layer, where alarm red is reserved for alerts walked to verified-and-active — never for a fresh intake."),
      field("Title", titleIn),
      field("Description", descIn),
      field("Security domain", domainSel),
      field("Severity", sevSel),
      field("Alert class", classSel),
      field("Affected system", sysIn),
      field("Evidence kind", evKindIn),
      field("Evidence reference", evRefIn),
      field("Source / provenance", sourceIn),
      U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [submit]),
      status
    ]);
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
    angelRoot = root;
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

    // ---- Angel identities (registry presentation + portraits) ---------
    var identitiesCard = angelIdentitiesCard(ident);
    if (identitiesCard) dash.appendChild(identitiesCard);

    // ---- Owner alert intake (Item 8) -----------------------------------
    if (typeof sec.createAlert === "function") {
      dash.appendChild(angelIntakeCard(sec));
    }

    // ---- Emergency controls (disabled by design — no live path) -------
    dash.appendChild(angelEmergencyCard());

    root.appendChild(dash);
  }

  async function render(root) {
    // Fix-up #3, Defect C: clear the router's skeleton (js/app.js
    // renderRoute appends U.skeletonBlock() while loading). This module
    // never cleared root, so the skeleton bars persisted above the
    // Screens icon row. Established contract, as in dashboard.js.
    root.innerHTML = "";
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
