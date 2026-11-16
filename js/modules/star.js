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

  // STAR's face (owner ruling 2026-11-16): Daniel designated his
  // own portrait as STAR's avatar (js/data/star-avatar.js). The
  // identity slot shows the portrait when the data file is present;
  // if it is missing or the image fails to load, the 🌟 glyph
  // stays — exactly the pre-avatar panel.
  // STAR's expressions (Embodiment Build 1, owner direction
  // 2026-11-16): STAR_AVATAR_EXPRESSIONS carries the talking /
  // thinking / smile faces beside the idle STAR_AVATAR_SRC. Any
  // missing expression falls back to the idle face; a missing data
  // file falls back to the glyphs, exactly as before.
  function idleSrc() {
    var src = global.STAR_AVATAR_SRC;
    return typeof src === "string" && src ? src : null;
  }
  function expressionSrc(name) {
    var exprs = global.STAR_AVATAR_EXPRESSIONS;
    var s = exprs && typeof exprs[name] === "string" && exprs[name] ? exprs[name] : null;
    return s || idleSrc();
  }

  // STAR's embodied figure (Embodiment Build 1): the full
  // head-and-shoulders cutout — that IS his body — standing at the
  // top of the panel beside the name/status block. Rendered only
  // when the avatar data file loaded; without it the panel is
  // exactly the pre-embodiment panel. The figure's expression and
  // motion are driven by setStatus() below — see the state-mapping
  // note there. If the image fails to load, the figure removes
  // itself and the panel keeps its header avatar / glyph.
  function figureNode() {
    var src = idleSrc();
    if (!src) return null;
    var img = U.el("img", {
      class: "star-figure-img",
      src: src,
      alt: "",
      onerror: function () {
        var fig = img.parentNode;
        if (fig && fig.parentNode) fig.parentNode.removeChild(fig);
      }
    });
    return U.el("div", { class: "star-figure", "aria-hidden": "true" }, [img]);
  }

  function avatarNode() {
    var src = global.STAR_AVATAR_SRC;
    if (typeof src === "string" && src) {
      var img = U.el("img", {
        class: "star-avatar-img",
        src: src,
        alt: "",
        onerror: function () {
          var slot = img.parentNode;
          if (slot) slot.textContent = "🌟";
        }
      });
      return U.el("span", { class: "star-avatar", "aria-hidden": "true" }, [img]);
    }
    return U.el("span", { class: "star-avatar", "aria-hidden": "true" }, "🌟");
  }

  function renderPanel() {
    var headerEl = U.el("div", { class: "star-header" }, [
      U.el("div", { class: "star-identity" }, [
        avatarNode(),
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
    ]);
    var statusEl = U.el("div", { class: "star-status", role: "status" }, [
      U.el("span", { class: "star-status-dot", "aria-hidden": "true" }),
      U.el("span", { class: "star-status-text" }, statusText("ready"))
    ]);
    // Embodiment: when STAR has his figure, it stands at the top
    // of the panel beside the name/status block (figure left,
    // header + status in the column beside him). Without the
    // avatar data file there is no figure and no wrapper — the
    // panel's structure is exactly the pre-embodiment panel.
    var figureEl = figureNode();
    var topEls = figureEl
      ? [U.el("div", { class: "star-top" }, [
          figureEl,
          U.el("div", { class: "star-top-main" }, [headerEl, statusEl])
        ])]
      : [headerEl, statusEl];
    var panel = U.el("section", { class: "star-panel", "aria-label": "Star 3.0 command chat" }, topEls.concat([
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
    ]));

    var figureImg = panel.querySelector(".star-figure-img");
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
            "Hi, I'm Star 3.0. Ask me about your cockpit — notes, tasks, spending, or projects — and I'll answer in demo mode for now. Try “BTC price” for a live crypto price, or “cockpit status” and “how many strategies” for answers from the cockpit's real records via the World Engine. Voice, video, specialist bots, and GitHub actions are coming later, and anything that changes something outside this device will need your approval first.")
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

    // STAR's expression + motion mapping (Embodiment Build 1) —
    // the honesty core of the embodiment. The figure is driven
    // ONLY by this panel's real status state, through setStatus(),
    // the single choke point every send/reply path already passes
    // through. No timers, no polling, no simulated talking:
    //
    //   - "thinking" (setStatus("thinking")): send() sets this
    //     synchronously when a message is sent, and every reply
    //     path clears it with setStatus("ready") the moment the
    //     reply lands. In this app that interval IS the speaking
    //     interval — the reply is being produced throughout it —
    //     so the figure shows the TALKING face and the gentle bob
    //     for exactly that interval, and the launcher mirror in
    //     js/shell-chrome.js (keyed on the same .star-status-
    //     thinking class) swaps the launcher face to match.
    //   - reply completion (the thinking -> ready transition
    //     inside setStatus): the figure settles to the SMILE face
    //     and keeps it while the panel rests in the answered
    //     state; the next send flips it back to talking, and
    //     Clear (setStatus("ready") with no production in flight)
    //     returns it to idle.
    //   - ready with no reply produced yet: the IDLE face, with
    //     the slow breathing motion.
    //
    // The THINKING face (gaze up-and-to-the-side) is deliberately
    // NOT bound to any state: this chat flow has exactly one
    // production state — setStatus("thinking") fires in the same
    // tick as the send, so there is no separate pre-reply
    // deliberation moment to hang a thoughtful expression on.
    // Inventing one (a fake pause, a timer) would claim a state
    // STAR is not in. The asset ships in STAR_AVATAR_EXPRESSIONS
    // and stays unused until a real state exists for it.
    var wasThinking = false;
    function setFigure(state) {
      panel.classList.toggle("star-state-talking", state === "talking");
      panel.classList.toggle("star-state-answered", state === "smile");
      if (!figureImg) return;
      var src = state === "idle" ? idleSrc() : expressionSrc(state);
      if (src && figureImg.getAttribute("src") !== src) figureImg.src = src;
    }

    function setStatus(kind) {
      var dot = panel.querySelector(".star-status-dot");
      var text = panel.querySelector(".star-status-text");
      if (dot) dot.className = "star-status-dot" + (kind === "thinking" ? " star-status-thinking" : "");
      if (text) text.textContent = statusText(kind);
      if (kind === "thinking") {
        wasThinking = true;
        setFigure("talking");
      } else if (wasThinking) {
        wasThinking = false;
        setFigure("smile");
      } else {
        setFigure("idle");
      }
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
      if (starCmd && (blocksExecution || commandAttempt)) {
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
      // Item 7 fix (preview verification, Nov 15, 2026): the safety
      // interception above (approval-required / transactional /
      // command-shaped) still runs FIRST and is unchanged. But
      // StarCommand's STATUS intent matches any text containing
      // "status" (its STATUS_RE), which used to swallow the
      // cockpit-state questions StarWorld exists to answer
      // ("cockpit status", "bot assignments status"). So StarWorld
      // is consulted here — after the safety gate, before the
      // executable-command branch in afterWorld(). StarWorld's
      // patterns are narrow read-only state queries and it returns
      // null for everything else, so a greeting like "how are you"
      // (also a StarCommand STATUS match, by StarCommand's own
      // design) continues to StarCommand exactly as before.
      function afterWorld() {
        if (starCmd && executableCmd && !priceQuestion && !scoutQuestion) {
          var cmdResult2 = null;
          try { cmdResult2 = global.StarCommand.execute(starCmd); } catch (e) { cmdResult2 = null; }
          var finishStarCommand2 = function (r) {
            var reply = (r && r.message) ? r.message : "Star command: that could not be run, and nothing was changed.";
            if (r && r.resultState === "APPROVAL_REQUIRED") {
              var notice = global.StarRouter.approvalNotice(routed);
              if (notice) reply += notice;
            }
            if (reply) global.StarState.addMessage("star", reply);
            renderMessages();
            setStatus("ready");
          };
          if (cmdResult2 && typeof cmdResult2.then === "function") {
            cmdResult2.then(function (r) { finishStarCommand2(r); }).catch(function () { finishStarCommand2(null); });
          } else {
            finishStarCommand2(cmdResult2);
          }
          return;
        }
        continueSend();
      }
      if (global.StarWorld && typeof global.StarWorld.answer === "function") {
        global.StarWorld.answer(text).then(function (worldReply) {
          if (worldReply) {
            global.StarState.addMessage("star", worldReply);
            renderMessages();
            setStatus("ready");
          } else {
            afterWorld();
          }
        }).catch(function () { afterWorld(); });
        return;
      }
      afterWorld();
      return;
      function continueSend() {
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
      continueSend();
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
