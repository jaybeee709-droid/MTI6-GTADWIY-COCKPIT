/* MTI6-GTADWIY-COCKPIT — Star 3.0 chat UI (V1)
 *
 * Layer 1 of 4 in the Star 3.0 architecture. This file owns ONLY the
 * panel: header, message bubbles, input row, and buttons. It does not
 * own conversation storage (StarState), backend calls (StarBackend), or
 * routing decisions (StarRouter) — it calls those layers and renders
 * what they return.
 *
 * V1 behaviour, in plain terms:
 *   - Star answers in clearly labelled demo mode (no backend, no keys).
 *   - Microphone and camera buttons are present but disabled, labelled
 *     as future voice / video mode. They do nothing in V1.
 *   - Approval-required work (GitHub, delegation, web research) is never
 *     executed in V1; the panel says so instead.
 *   - Nothing here changes notes, tasks, expenses, or projects.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  function renderPanel() {
    var panel = U.el("section", { class: "star-panel", "aria-label": "Star 3.0 command chat" }, [
      U.el("div", { class: "star-header" }, [
        U.el("div", { class: "star-identity" }, [
          U.el("span", { class: "star-avatar", "aria-hidden": "true" }, "🌟"),
          U.el("div", {}, [
            U.el("h2", { class: "star-title" }, "STAR 3.0"),
            U.el("div", { class: "star-subtitle" }, "Your cockpit AI assistant — future commander of the MTI6 bot system")
          ])
        ]),
        U.el("button", {
          class: "btn btn-ghost btn-sm star-clear-btn",
          title: "Clear this demo conversation (local only)",
          "aria-label": "Clear Star conversation",
          onclick: function () {
            if (global.StarState) global.StarState.clear();
            renderMessages();
            setStatus("ready");
          }
        }, "Clear")
      ]),
      U.el("div", { class: "star-status", role: "status" }, [
        U.el("span", { class: "star-status-dot", "aria-hidden": "true" }),
        U.el("span", { class: "star-status-text" }, statusText("ready"))
      ]),
      U.el("div", { class: "star-messages", role: "log", "aria-live": "polite" }),
      U.el("div", { class: "star-input-row" }, [
        U.el("input", {
          class: "input star-input",
          type: "text",
          placeholder: "Message Star 3.0...",
          "aria-label": "Message Star 3.0",
          autocomplete: "off"
        }),
        U.el("button", {
          class: "btn btn-ghost star-icon-btn",
          type: "button",
          disabled: true,
          title: "Voice mode — coming soon",
          "aria-label": "Voice input (coming soon)"
        }, "🎤"),
        U.el("button", {
          class: "btn btn-ghost star-icon-btn",
          type: "button",
          disabled: true,
          title: "Video mode — coming soon",
          "aria-label": "Video input (coming soon)"
        }, "📷"),
        U.el("button", { class: "btn btn-primary star-send-btn", type: "button" }, "Send")
      ]),
      U.el("div", { class: "star-footnote" },
        "Demo mode: Star answers locally on this device. No AI backend is connected yet, and no keys live in this page.")
    ]);

    var input = panel.querySelector(".star-input");
    var sendBtn = panel.querySelector(".star-send-btn");
    var micBtn = panel.querySelectorAll(".star-icon-btn")[0];
    var camBtn = panel.querySelectorAll(".star-icon-btn")[1];

    function renderMessages() {
      var area = panel.querySelector(".star-messages");
      if (!area) return;
      area.innerHTML = "";
      var list = global.StarState ? global.StarState.getMessages() : [];
      if (!list.length) {
        area.appendChild(U.el("div", { class: "star-msg star-msg-star" }, [
          U.el("div", { class: "star-msg-label" }, "🌟 Star 3.0 — Demo"),
          U.el("div", { class: "star-msg-text" },
            "Hi, I'm Star 3.0. Ask me about your cockpit — notes, tasks, spending, or projects — and I'll answer in demo mode for now. Try “BTC price” for a live crypto price. Voice, video, specialist bots, and GitHub actions are coming later, and anything that changes something outside this device will need your approval first.")
        ]));
        return;
      }
      list.forEach(function (m) {
        var isUser = m.role === "user";
        area.appendChild(U.el("div", { class: "star-msg " + (isUser ? "star-msg-user" : "star-msg-star") }, [
          U.el("div", { class: "star-msg-label" }, isUser ? "You" : "🌟 Star 3.0"),
          U.el("div", { class: "star-msg-text" }, m.text)
        ]));
      });
      area.scrollTop = area.scrollHeight;
    }

    function setStatus(kind) {
      var dot = panel.querySelector(".star-status-dot");
      var text = panel.querySelector(".star-status-text");
      if (dot) dot.className = "star-status-dot" + (kind === "thinking" ? " star-status-thinking" : "");
      if (text) text.textContent = statusText(kind);
    }

    function statusText(kind) {
      if (kind === "thinking") return "Star is thinking… (demo)";
      if (global.StarBackend) return global.StarBackend.getStatusLabel();
      return "Demo mode — no AI backend connected";
    }

    function send() {
      var text = input.value.trim();
      if (!text) return;
      if (!global.StarState || !global.StarBackend || !global.StarRouter) {
        U.toast("Star 3.0 is not fully loaded yet — try again in a moment.");
        return;
      }
      global.StarState.addMessage("user", text);
      input.value = "";
      renderMessages();
      setStatus("thinking");
      var routed = global.StarRouter.route(text);
      var context = { summaryHint: global.StarState.getSummaryHint(), routed: routed };
      // StarCommand (Priorities 2 + 3): fail-closed command layer. It
      // runs before the scouts and the demo backend, but it never steals
      // a question the read-only scouts can answer: price questions stay
      // with PriceScout, and GitHub-activity / news questions stay with
      // KnowledgeScout. Approval-required and transactional requests are
      // always intercepted — buying, selling, deploying, or delegating
      // is never a price question, even when the text names a coin.
      // General conversation (no command shape) falls through to the
      // existing flow unchanged.
      var starCmd = null;
      if (global.StarCommand && typeof global.StarCommand.parseCommand === "function") {
        try { starCmd = global.StarCommand.parseCommand(text); } catch (e) { starCmd = null; }
      }
      var blocksExecution = !!starCmd && (starCmd.intent === "APPROVAL_REQUIRED" ||
        starCmd.permission === "TRANSACTIONAL" || starCmd.resultState === "NEEDS_REVIEW");
      var priceQuestion = routed.bot === "prices" && global.PriceScout && typeof global.PriceScout.answer === "function";
      var scoutQuestion = (routed.bot === "activity" || routed.bot === "news") && !!global.KnowledgeScout;
      var executableCmd = !!starCmd && (starCmd.intent === "NAVIGATION" || starCmd.intent === "OPEN" ||
        starCmd.intent === "SEARCH" || starCmd.intent === "KNOWLEDGE" || starCmd.intent === "EXPLAIN" ||
        starCmd.intent === "STATUS");
      var commandAttempt = !!starCmd && starCmd.intent === "UNAVAILABLE" && starCmd.errorState === "unknown command" &&
        /^(go|open|show|search|find|buy|sell|trade|swap|deploy|delegate|assign|create|run|set|start|do|make)\b/i.test(text.trim());
      if (starCmd && (blocksExecution || commandAttempt || (executableCmd && !priceQuestion && !scoutQuestion))) {
        var cmdResult = null;
        try { cmdResult = global.StarCommand.execute(starCmd); } catch (e) { cmdResult = null; }
        var finishStarCommand = function (r) {
          var reply = (r && r.message) ? r.message : "Star command: that could not be run, and nothing was changed.";
          if (r && r.resultState === "APPROVAL_REQUIRED") {
            var notice = global.StarRouter.approvalNotice(routed);
            if (notice) reply += notice;
          }
          if (reply) global.StarState.addMessage("star", reply);
          renderMessages();
          setStatus("ready");
        };
        if (cmdResult && typeof cmdResult.then === "function") {
          cmdResult.then(function (r) { finishStarCommand(r); }).catch(function () { finishStarCommand(null); });
        } else {
          finishStarCommand(cmdResult);
        }
        return;
      }
      // Price questions are read-only, so they go to PriceScout first
      // instead of the generic demo backend — a live crypto price, a
      // stock not-connected status, or a price help answer, always
      // with source and fetch time, never a fake price.
      if (routed.bot === "prices" && global.PriceScout && typeof global.PriceScout.answer === "function") {
        global.PriceScout.answer(text).then(function (reply) {
          if (reply) global.StarState.addMessage("star", reply);
          else global.StarState.addMessage("star", "Price Scouts: ask me for a crypto price (try “BTC price”), a stock ticker, or use the Prices panel below for store products.");
          renderMessages();
          setStatus("ready");
        }).catch(function () {
          global.StarState.addMessage("star", "Price Scouts: could not check that price right now. Try again in a minute.");
          renderMessages();
          setStatus("ready");
        });
        return;
      }
      // Saved bot knowledge first, then read-only scouts — all before
      // the generic demo backend, so a saved fact or a live scout
      // answer is never replaced by a demo reply.
      if (global.KnowledgeScout && typeof global.KnowledgeScout.answer === "function") {
        var known = global.KnowledgeScout.answer(text);
        if (known) { global.StarState.addMessage("star", known); renderMessages(); setStatus("ready"); return; }
      }
      if (routed.bot === "activity" && global.KnowledgeScout) {
        global.KnowledgeScout.getGitHubActivity("jaybeee709-droid", "MTI6-GTADWIY-COCKPIT").then(function (r) {
          if (r.status === "error") global.StarState.addMessage("star", r.note);
          else global.StarState.addMessage("star", "GitHub activity, live from " + r.source + " (" + global.KnowledgeScout.fmtTime(r.fetchedAt) + "):\n" + r.items.map(function (it) { return "• " + it.label + (it.actor ? " by " + it.actor : ""); }).join("\n"));
          renderMessages(); setStatus("ready");
        }).catch(function () { global.StarState.addMessage("star", "GitHub activity: could not reach the GitHub API right now."); renderMessages(); setStatus("ready"); });
        return;
      }
      if (routed.bot === "news" && global.KnowledgeScout) {
        global.KnowledgeScout.getNews(5).then(function (r) {
          if (r.status === "error") global.StarState.addMessage("star", r.note);
          else global.StarState.addMessage("star", "Top stories, live from " + r.source + " (" + global.KnowledgeScout.fmtTime(r.fetchedAt) + "):\n" + r.items.map(function (it) { return "• " + it.title + " — " + it.url; }).join("\n"));
          renderMessages(); setStatus("ready");
        }).catch(function () { global.StarState.addMessage("star", "News: could not reach the Hacker News API right now."); renderMessages(); setStatus("ready"); });
        return;
      }
      global.StarBackend.send(text, context).then(function (result) {
        var reply = result && result.text ? result.text : "";
        var notice = global.StarRouter.approvalNotice(routed);
        if (notice) reply += notice;
        if (reply) global.StarState.addMessage("star", reply);
        renderMessages();
        setStatus("ready");
      }).catch(function () {
        global.StarState.addMessage("star", "Star 3.0 demo: something went wrong answering that locally. Nothing was changed — please try again.");
        renderMessages();
        setStatus("ready");
      });
    }

    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); send(); }
    });
    if (micBtn) micBtn.addEventListener("click", function () { U.toast("Voice mode is coming soon."); });
    if (camBtn) camBtn.addEventListener("click", function () { U.toast("Video mode is coming soon."); });
    // Disabled buttons do not fire click in most browsers; the toasts above
    // are a fallback if a future change enables them.

    renderMessages();
    return panel;
  }

  global.StarChatUI = { renderPanel: renderPanel };
})(window);
