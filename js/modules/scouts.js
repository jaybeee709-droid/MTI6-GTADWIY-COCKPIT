/* MTI6-GTADWIY-COCKPIT — Scouts panel (V1)
 * Dashboard panel for the three read-only scouts in js/knowledge.js:
 * GitHub activity, News, and Bot Knowledge (scrape & save).
 * Rendering only — all fetching, parsing, and storage live in
 * knowledge.js. Guarded like Star/Prices: if the layer fails to
 * load, the rest of the dashboard still renders.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  function renderPanel() {
    var panel = U.el("section", { class: "api-panel", "aria-label": "Scouts and bot knowledge" }, [
      U.el("h2", { class: "api-title" }, "🔭 Scouts & Bot Knowledge"),
      U.el("div", { class: "api-subtitle" },
        "Read-only. GitHub and News come from public APIs. Bot Knowledge saves a public page's readable text locally — " +
        "topic, source, URL, and date fetched — so Star can answer from it later. Pages that block browser fetches are reported, never bypassed; no login or paywall pages.")
    ]);

    var ghOwner = U.el("input", { class: "price-input", type: "text", value: "jaybeee709-droid", "aria-label": "GitHub owner" });
    var ghRepo = U.el("input", { class: "price-input", type: "text", value: "MTI6-GTADWIY-COCKPIT", "aria-label": "GitHub repo" });
    var ghBtn = U.el("button", { class: "btn btn-primary", type: "button" }, "Load activity");
    var ghOut = U.el("div", { class: "api-meta" }, "Tap Load activity to see the latest public events for this repo.");
    ghBtn.addEventListener("click", function () {
      ghOut.textContent = "Loading…";
      global.KnowledgeScout.getGitHubActivity(ghOwner.value, ghRepo.value).then(function (r) {
        if (r.status === "error") { ghOut.textContent = r.note; return; }
        ghOut.innerHTML = "";
        ghOut.appendChild(U.el("div", {}, "Live from " + r.source + " · " + global.KnowledgeScout.fmtTime(r.fetchedAt)));
        var list = U.el("ul", { class: "price-offer-list" });
        r.items.forEach(function (it) {
          list.appendChild(U.el("li", {}, it.label + (it.actor ? " · " + it.actor : "") + (it.at ? " · " + global.KnowledgeScout.fmtTime(it.at) : "")));
        });
        ghOut.appendChild(list);
      });
    });

    var newsBtn = U.el("button", { class: "btn btn-primary", type: "button" }, "Load top stories");
    var newsOut = U.el("div", { class: "api-meta" }, "Tap Load top stories for Hacker News headlines.");
    newsBtn.addEventListener("click", function () {
      newsOut.textContent = "Loading…";
      global.KnowledgeScout.getNews(8).then(function (r) {
        if (r.status === "error") { newsOut.textContent = r.note; return; }
        newsOut.innerHTML = "";
        newsOut.appendChild(U.el("div", {}, "Live from " + r.source + " · " + global.KnowledgeScout.fmtTime(r.fetchedAt)));
        var list = U.el("ul", { class: "price-offer-list" });
        r.items.forEach(function (it) {
          list.appendChild(U.el("li", {}, it.title + " (" + it.score + " pts) — " + it.url));
        });
        newsOut.appendChild(list);
      });
    });

    var topicInput = U.el("input", { class: "price-input", type: "text", placeholder: "Topic, e.g. CoinGecko API limits", "aria-label": "Knowledge topic" });
    var urlInput = U.el("input", { class: "price-input", type: "text", placeholder: "Public page URL (https://…)", "aria-label": "Page URL to scrape" });
    var saveBtn = U.el("button", { class: "btn btn-primary", type: "button" }, "Scrape & save");
    var searchInput = U.el("input", { class: "price-input", type: "text", placeholder: "Search saved knowledge…", "aria-label": "Search saved knowledge" });
    var searchBtn = U.el("button", { class: "btn btn-ghost", type: "button" }, "Search");
    var knowOut = U.el("div", { class: "api-meta" }, "No saved knowledge yet on this device. Scrape a public page above, or ask Star — it answers from saved knowledge first.");
    function renderKnowledge(entries) {
      knowOut.innerHTML = "";
      if (!entries.length) { knowOut.textContent = "No matching saved knowledge."; return; }
      var list = U.el("ul", { class: "price-offer-list" });
      entries.forEach(function (e) {
        list.appendChild(U.el("li", {}, "“" + e.topic + "” · " + e.source + " · saved " + global.KnowledgeScout.fmtTime(e.fetchedAt) + (e.url ? " · " + e.url : "")));
      });
      knowOut.appendChild(list);
    }
    saveBtn.addEventListener("click", function () {
      if (!topicInput.value.trim() || !urlInput.value.trim()) { knowOut.textContent = "Enter both a topic and a public page URL first."; return; }
      knowOut.textContent = "Scraping… (public page only; blocked pages will be reported, not bypassed.)";
      global.KnowledgeScout.saveScrapedAsKnowledge(topicInput.value.trim(), urlInput.value.trim()).then(function (r) {
        if (r.status !== "saved") { knowOut.textContent = r.note; return; }
        knowOut.textContent = "Saved: “" + r.entry.topic + "” from " + r.entry.url;
        renderKnowledge(global.KnowledgeScout.listKnowledge());
      });
    });
    searchBtn.addEventListener("click", function () { renderKnowledge(global.KnowledgeScout.searchKnowledge(searchInput.value)); });

    panel.appendChild(U.el("div", { class: "api-row" }, [
      U.el("h3", {}, "GitHub Activity"),
      U.el("div", { class: "price-input-row" }, [ghOwner, ghRepo, ghBtn]),
      ghOut
    ]));
    panel.appendChild(U.el("div", { class: "api-row" }, [
      U.el("h3", {}, "News"),
      newsBtn, newsOut
    ]));
    panel.appendChild(U.el("div", { class: "api-row" }, [
      U.el("h3", {}, "Bot Knowledge — scrape & save"),
      U.el("div", { class: "price-input-row" }, [topicInput, urlInput, saveBtn]),
      U.el("div", { class: "price-input-row" }, [searchInput, searchBtn]),
      knowOut
    ]));
    renderKnowledge(global.KnowledgeScout.listKnowledge());
    return panel;
  }

  global.ScoutsUI = { renderPanel: renderPanel };
})(window);
