/* MTI6-GTADWIY-COCKPIT — Web / Bot Work screen
 * The "browser box" a web page can honestly offer:
 * - No embedded YouTube player (removed by owner choice Oct 31,
 *   2026): web search finds videos, and video links open in the
 *   phone's default browser instead.
 * - Public page URLs show their readable text via the scouts layer.
 * - Pages that block browser fetches are NOT bypassed: the window
 *   shows a link to open them in the phone's default browser.
 * - Topics search saved bot knowledge and Hacker News headlines.
 * The content window resizes (Small / Medium / Full, plus a drag
 * handle on desktop), and the activity log shows every bot step
 * with a time, so the work is visible instead of silent.
 * Clips and movies are made in Muse chat and saved to play in the
 * default browser — this page does not render movies locally.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  function isVideoLink(text) {
    return /(?:youtube\.com\/watch\?|youtu\.be\/|vimeo\.com\/)/i.test(String(text || ""));
  }

  function fmtClock() {
    try { return new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
    catch (e) { return ""; }
  }

  async function render(root) {
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("web") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "🌐 Web — Bot Work Window"));
    root.appendChild(U.el("p", { class: "api-subtitle" }, "Search box at the top, content window below, activity log under it. Paste a video link to open it in your default browser, a public page URL to read its text, or a topic to search saved knowledge and headlines. This is not another browser — it cannot open Safari, Chrome, or Tor, and it never bypasses a page that blocks it."));

    var input = U.el("input", { class: "price-input", type: "text", placeholder: "Video link, public page URL, or topic…", "aria-label": "Web search or URL" });
    var goBtn = U.el("button", { class: "btn btn-primary", type: "button" }, "Go");
    var windowEl = U.el("div", { class: "web-window web-window-medium" }, [U.el("div", { class: "api-meta" }, "Your content will appear here.")]);
    var logEl = U.el("div", { class: "api-meta" }, "Activity log — bot steps will appear here.");

    function log(msg) {
      var line = U.el("div", {}, fmtClock() + " — " + msg);
      logEl.appendChild(line);
    }
    function setSize(size) {
      windowEl.classList.remove("web-window-small", "web-window-medium", "web-window-full");
      windowEl.classList.add("web-window-" + size);
    }
    var smallBtn = U.el("button", { class: "btn btn-ghost btn-sm", type: "button" }, "Small");
    var medBtn = U.el("button", { class: "btn btn-ghost btn-sm", type: "button" }, "Medium");
    var fullBtn = U.el("button", { class: "btn btn-ghost btn-sm", type: "button" }, "Full");
    smallBtn.addEventListener("click", function () { setSize("small"); });
    medBtn.addEventListener("click", function () { setSize("medium"); });
    fullBtn.addEventListener("click", function () { setSize("full"); });

    function showText(title, body) {
      windowEl.innerHTML = "";
      windowEl.appendChild(U.el("h3", {}, title));
      windowEl.appendChild(U.el("div", { class: "web-text" }, body));
    }

    function go() {
      var value = input.value.trim();
      if (!value) return;
      log("Bot starting: " + value.slice(0, 80));
      if (isVideoLink(value)) {
        log("Video link — no embedded player; opening via default browser link (web search finds the video).");
        windowEl.innerHTML = "";
        windowEl.appendChild(U.el("p", {}, "Video links open in your phone's default browser. Use the global search bar to find videos on the web."));
        var va = document.createElement("a");
        va.href = value; va.target = "_blank"; va.rel = "noopener"; va.textContent = "Open video in your phone's default browser";
        windowEl.appendChild(va);
        return;
      }
      if (/^https?:\/\//i.test(value)) {
        log("Fetching public page text (no bypass if blocked)…");
        if (!global.KnowledgeScout) { log("Scouts layer did not load."); return; }
        global.KnowledgeScout.scrapePublicPage(value).then(function (r) {
          if (r.status !== "live") {
            log("Page blocked or unreachable — showing default-browser link instead.");
            windowEl.innerHTML = "";
            windowEl.appendChild(U.el("p", {}, r.note));
            var a = document.createElement("a");
            a.href = value; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Open in your phone's default browser";
            windowEl.appendChild(a);
            return;
          }
          log("Page text loaded from " + r.url);
          showText(r.title || r.url, r.text);
        });
        return;
      }
      log("Searching saved bot knowledge and headlines for: " + value);
      var hits = global.KnowledgeScout ? global.KnowledgeScout.searchKnowledge(value) : [];
      var text = hits.length
        ? hits.map(function (e) { return "• “" + e.topic + "” — " + e.source + " (saved " + e.fetchedAt.slice(0, 10) + ")\n" + e.text.slice(0, 400); }).join("\n\n")
        : "No saved bot knowledge matched. Try the Scouts panel to scrape and save a public page on this topic first.";
      showText("Topic: " + value, text);
      log(hits.length ? "Found " + hits.length + " saved knowledge match(es)." : "No saved knowledge match.");
    }
    goBtn.addEventListener("click", go);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); go(); } });

    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("div", { class: "price-input-row" }, [input, goBtn]),
      U.el("div", { class: "price-input-row" }, [smallBtn, medBtn, fullBtn]),
      windowEl,
      U.el("h3", {}, "Bot activity"), logEl
    ]));
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.web = { render: render };
  global.WebWork = { isVideoLink: isVideoLink };
})(window);
