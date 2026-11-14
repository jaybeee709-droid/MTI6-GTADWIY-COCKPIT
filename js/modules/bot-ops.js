/* MTI6-GTADWIY-COCKPIT — Bot Operations shell (master shell, Build 1)
 *
 * Four conceptual sections: STAR, TRIBES, WORKERS, LIVE WORK.
 *
 * Identity rules, enforced here: STAR is the main persistent named
 * assistant. The 12 Tribe principals are persistent named principal
 * agents — in this build every slot is UNASSIGNED, so no principal
 * name is shown. Task workers are dynamically scalable named workers;
 * none exist yet. Role labels (Research, Risk, Yield, Routing,
 * Security, Builder, Analysis, Monitoring) are assignment labels, NOT
 * bot names, and no bot is renamed after its assignment.
 *
 * Nothing is fabricated: with no worker orchestration connected, the
 * screen shows truthful empty / not-connected states. Financial fields
 * (gross, fees, gain, loss, net) appear only where real tracked data
 * exists — there is none yet, so they are stated as absent, not zero.
 *
 * Presentation modes: LIVE DATA and COMMAND THEATER show the SAME real
 * underlying data. Theater is a cinematic view of that data, never a
 * separate truth source, and never fake workers, conversations, results,
 * or missions.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  var MODE_KEY = "mti6_botops_mode_v1";
  var detailBox = null;
  var selectedSlotId = null;

  function getMode() {
    try {
      return localStorage.getItem(MODE_KEY) === "theater" ? "theater" : "live";
    } catch (e) {
      return "live";
    }
  }

  function setMode(mode) {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch (e) {}
  }

  function starStatus() {
    if (global.StarBackend && typeof global.StarBackend.getStatusLabel === "function") {
      return global.StarBackend.getStatusLabel();
    }
    return "Demo mode — no AI backend connected";
  }

  function tribeCard(slot) {
    var card = U.el("button", { class: "tribe-card tribe-card-unassigned", type: "button" }, [
      U.el("div", { class: "tribe-card-avatar", "aria-hidden": "true" }, "T" + String(slot.number).padStart(2, "0")),
      U.el("div", { class: "tribe-card-label" }, slot.label),
      U.el("div", { class: "tribe-card-status" }, "UNASSIGNED"),
      U.el("div", { class: "tribe-card-note" }, "Not assigned — a principal is named only by owner approval.")
    ]);
    card.addEventListener("click", function () {
      selectedSlotId = slot.id;
      renderDetail();
      if (detailBox && detailBox.scrollIntoView) {
        try { detailBox.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) {}
      }
    });
    return card;
  }

  function detailRow(label, value) {
    return U.el("div", { class: "status-row" }, [
      U.el("span", {}, label),
      U.el("span", { class: "status-value" }, value)
    ]);
  }

  function renderDetail() {
    if (!detailBox) return;
    detailBox.innerHTML = "";
    var slot = global.Tribes ? global.Tribes.getSlot(selectedSlotId) : null;
    if (!slot) {
      detailBox.appendChild(U.el("p", { class: "api-meta" }, "Select a Tribe slot above to see its detail."));
      return;
    }
    detailBox.appendChild(U.el("h3", {}, "Bot detail — " + slot.label));
    detailBox.appendChild(U.el("p", { class: "api-meta" },
      "Bot operational anatomy: identity, work, dependencies, telemetry, risks, results. Every value below is real state — unknown means unknown, never guessed."));
    var rows = detailBox;
    rows.appendChild(detailRow("Bot identity", slot.name || "Unassigned — no principal named"));
    rows.appendChild(detailRow("Origin Tribe", slot.label));
    rows.appendChild(detailRow("Worker ID", slot.id));
    rows.appendChild(detailRow("Current form", "Not assigned"));
    rows.appendChild(detailRow("Current assignment", slot.assignment || "None"));
    rows.appendChild(detailRow("Current role", slot.role || "—"));
    rows.appendChild(detailRow("Mode", "—"));
    rows.appendChild(detailRow("Live status", "NOT CONNECTED"));
    rows.appendChild(detailRow("Inputs / outputs", "—"));
    rows.appendChild(detailRow("Progress / telemetry", "—"));
    rows.appendChild(detailRow("Source freshness", "—"));
    rows.appendChild(detailRow("Dependencies", "—"));
    rows.appendChild(detailRow("Risk / warnings", "None reported — no live data"));
    rows.appendChild(detailRow("Costs", "No tracked data"));
    rows.appendChild(detailRow("Verified gains / losses / net", "No tracked data"));
    rows.appendChild(detailRow("Current / previous assignments", "None recorded"));
    rows.appendChild(detailRow("Completed / failed tasks", "None recorded"));
    rows.appendChild(detailRow("History / logs", "No logs — nothing has run"));
    var summonBtn = U.el("button", { class: "btn btn-secondary", type: "button" }, "Summon to session");
    summonBtn.addEventListener("click", function () {
      if (global.Participants) global.Participants.summon(slot.id);
    });
    detailBox.appendChild(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [summonBtn]));
  }

  async function render(root) {
    root.innerHTML = "";
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("bot-ops") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "Bot Operations"));
    root.appendChild(U.el("p", { class: "api-subtitle" },
      "STAR, Tribes, Workers, and Live Work. This is the operations shell — no worker orchestration is connected yet, so everything below states that plainly instead of pretending."));

    // ---- Presentation mode: Live Data vs Command Theater (same data) ----
    var mode = getMode();
    var liveBtn = U.el("button", { class: "btn " + (mode === "live" ? "btn-primary" : "btn-secondary"), type: "button" }, "Live Data");
    var theaterBtn = U.el("button", { class: "btn " + (mode === "theater" ? "btn-primary" : "btn-secondary"), type: "button" }, "Command Theater");
    var modeNote = U.el("div", { class: "api-meta" }, mode === "theater"
      ? "Command Theater is a cinematic view of the SAME real data as Live Data — not a separate source, and never fake activity."
      : "Live Data shows worker cards from real reported state only.");
    function applyMode(next) {
      setMode(next);
      var work = root.querySelector("#botops-live-work");
      if (work) work.classList.toggle("botops-theater", next === "theater");
      liveBtn.className = "btn " + (next === "live" ? "btn-primary" : "btn-secondary");
      theaterBtn.className = "btn " + (next === "theater" ? "btn-primary" : "btn-secondary");
      modeNote.textContent = next === "theater"
        ? "Command Theater is a cinematic view of the SAME real data as Live Data — not a separate source, and never fake activity."
        : "Live Data shows worker cards from real reported state only.";
    }
    liveBtn.addEventListener("click", function () { applyMode("live"); });
    theaterBtn.addEventListener("click", function () { applyMode("theater"); });
    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Presentation"),
      U.el("div", { class: "price-input-row" }, [liveBtn, theaterBtn]),
      modeNote
    ]));

    // ---- STAR ----
    var starPanel = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "🌟 STAR"),
      U.el("div", { class: "api-meta" }, "Main persistent assistant. Status: " + starStatus()),
      U.el("div", { class: "api-meta" }, "STAR answers in demo mode from the dashboard panel and from its overlay. Approval-required work is never executed silently.")
    ]);
    var openStarBtn = U.el("button", { class: "btn btn-primary", type: "button" }, "Open STAR overlay");
    openStarBtn.addEventListener("click", function () {
      if (global.StarOverlay) global.StarOverlay.open();
    });
    starPanel.appendChild(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [openStarBtn]));
    root.appendChild(starPanel);

    // ---- TRIBES ----
    var slots = global.Tribes ? global.Tribes.getSlots() : [];
    var tribeGrid = U.el("div", { class: "botops-grid" });
    slots.forEach(function (slot) { tribeGrid.appendChild(tribeCard(slot)); });
    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Tribes — 12 principal slots"),
      U.el("div", { class: "api-meta" }, "Persistent named principal agents. All 12 slots are unassigned in this build; a principal is named only by owner approval. Tap a slot for its detail."),
      tribeGrid
    ]));

    // ---- Bot detail ----
    detailBox = U.el("div", { class: "api-panel", id: "botops-detail" });
    root.appendChild(detailBox);
    renderDetail();

    // ---- WORKERS ----
    var workers = global.Tribes ? global.Tribes.getWorkersActive() : { count: 0, state: "NOT_CONNECTED", note: "Worker orchestration is not connected." };
    var workerQueueText = "Worker task queue: unavailable — worker task model not loaded.";
    if (global.BotOpsModel && typeof global.BotOpsModel.summary === "function") {
      try {
        var wq = global.BotOpsModel.summary();
        if (!wq || wq.total === 0) {
          workerQueueText = "Worker tasks queued: 0 — no worker tasks have been created.";
        } else {
          var wqParts = [];
          var wqOrder = global.BotOpsModel.TASK_STATES || [];
          wqOrder.forEach(function (st) {
            var n = wq.byState ? (wq.byState[st] || 0) : 0;
            if (n > 0) wqParts.push(st + " " + n);
          });
          workerQueueText = "Worker tasks queued: " + wq.total + " (" + wqParts.join(", ") + ") — no worker runtime is connected, so no task is live.";
        }
      } catch (e) {
        workerQueueText = "Worker task queue: unavailable — worker task model could not be read.";
      }
    }
    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Workers"),
      U.el("div", { class: "api-meta" }, "WORKERS ACTIVE: " + workers.count + " — " + workers.state),
      U.el("div", { class: "api-meta" }, workerQueueText),
      U.el("div", { class: "api-meta" }, workers.note),
      U.el("div", { class: "api-meta" }, "Role labels a worker may carry on an assignment: " +
        (global.Tribes ? global.Tribes.ROLE_LABELS.join(", ") : "—") + ". These are assignment labels, not bot names.")
    ]));

    // ---- LIVE WORK ----
    var liveWork = U.el("div", { class: "api-panel" + (mode === "theater" ? " botops-theater" : ""), id: "botops-live-work" });
    liveWork.appendChild(U.el("h3", {}, "Live Work"));
    liveWork.appendChild(U.el("div", { class: "api-meta" },
      "No live work — no workers are connected. Worker cards appear here only when real workers report real work: name/ID, origin Tribe, role, assignment, status, workspace, mode, progress, last activity, and warnings. Financial fields (gross, fees, gain, loss, net) appear only where real tracked data exists."));
    liveWork.appendChild(U.el("div", { class: "botops-empty" }, "Nothing is running."));
    root.appendChild(liveWork);
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules["bot-ops"] = { render: render };
})(window);
