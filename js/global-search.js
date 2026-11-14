/* MTI6-GTADWIY-COCKPIT — Global search bar with source toggle (V2)
 * One search bar in the app shell, visible on EVERY screen, with a
 * toggle next to it. The toggle does NOT switch the browser app
 * (Chrome, Safari, Tor, etc.) — a web page cannot do that. What it
 * switches is WHERE the bots look, which is the part that actually
 * changes the answer:
 *   Auto (bot picks) — the bots choose the best source for the
 *     query and say which one they picked, right in the results.
 *   This app, Web, Crypto, GitHub, News, Saved knowledge, Page.
 * Bot auto-pick rules (visible in the results header):
 *   - A pasted URL -> Page (YouTube -> play in Web window).
 *   - A known crypto ticker (BTC, ETH, SOL…) -> Crypto prices.
 *   - "news" / "headlines" in the query -> News.
 *   - "github" / "repo" / "commit" in the query -> GitHub activity.
 *   - Anything else -> app + saved knowledge + web together.
 * Sources searched:
 *   1. This app (local only): vault notes, tasks, projects, expenses
 *      from IndexedDB via CockpitDB.getAll. Nothing leaves the device.
 *   2. Saved bot knowledge (local only).
 *   3. The web, no key, browser-direct: Wikipedia summaries and
 *      Hacker News search, plus crypto via PriceScout's triple
 *      fallback chain (CoinGecko -> Coinbase -> CoinPaprika).
 *   4. A pasted URL: page text via the scouts layer, or a
 *      default-browser link if the page blocks browser fetches.
 * What this bar does NOT search: the phone's files, other apps,
 * or private accounts. A web page cannot reach those.
 */
(function (global) {
  "use strict";

  function isUrl(text) { return /^https?:\/\//i.test(String(text || "").trim()); }
  function isYouTube(text) {
    return /(?:youtube\.com\/watch\?[^#\s]*v=|youtu\.be\/)([A-Za-z0-9_-]{11})/.test(String(text || ""));
  }
  function stripTags(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
  function record(apiId, ok) {
    try { if (global.ApiRegistry) global.ApiRegistry.record(apiId, !!ok, ok ? 200 : null); } catch (e) {}
  }

  // Bot source picker. Pure function, tested separately.
  function pickSource(query, selected) {
    var q = String(query || "").trim();
    var lower = q.toLowerCase();
    if (selected && selected !== "auto") return { mode: selected, reason: "You picked " + selected + " in the toggle." };
    if (/\b(encyclopedia|crypto world)\b/.test(lower)) return { mode: "encyclopedia", reason: "Bot picked Encyclopedia — your query asks about the Crypto World encyclopedia." };
    if (isUrl(q)) return { mode: "page", reason: "Bot picked Page — you pasted a URL." };
    if (/^(btc|eth|sol|doge|xrp|ltc|ada)(\s+price)?$/i.test(q)) return { mode: "crypto", reason: "Bot picked Crypto — that looks like a crypto ticker." };
    if (/\b(news|headlines|top stories)\b/.test(lower)) return { mode: "news", reason: "Bot picked News — your query asks for headlines." };
    if (/\b(github|repo|commit|commits)\b/.test(lower)) return { mode: "github", reason: "Bot picked GitHub — your query asks about repo activity." };
    return { mode: "all", reason: "Bot picked All — a general query, so it searched the app, saved knowledge, and the web together." };
  }

  function searchAppData(query, lower) {
    if (!global.CockpitDB || typeof global.CockpitDB.getAll !== "function") return Promise.resolve([]);
    var stores = [
      { store: "notes", route: "vault", titleOf: function (x) { return x.title || "(untitled note)"; }, bodyOf: function (x) { return (x.title || "") + " " + (x.body || "") + " " + (x.category || ""); } },
      { store: "tasks", route: "tasks", titleOf: function (x) { return x.title || "(untitled task)"; }, bodyOf: function (x) { return (x.title || "") + " " + (x.notes || ""); } },
      { store: "projects", route: "projects", titleOf: function (x) { return x.name || "(untitled project)"; }, bodyOf: function (x) { return (x.name || "") + " " + (x.description || ""); } },
      { store: "expenses", route: "expenses", titleOf: function (x) { return x.title || x.description || "(expense)"; }, bodyOf: function (x) { return (x.title || "") + " " + (x.description || "") + " " + (x.category || ""); } }
    ];
    return Promise.all(stores.map(function (s) {
      return global.CockpitDB.getAll(s.store).then(function (rows) {
        return (rows || []).filter(function (x) { return s.bodyOf(x).toLowerCase().indexOf(lower) !== -1; })
          .slice(0, 5).map(function (x) { return { kind: s.store, route: s.route, title: s.titleOf(x) }; });
      }).catch(function () { return []; });
    })).then(function (groups) {
      var out = [];
      groups.forEach(function (g) { out = out.concat(g); });
      return out;
    });
  }

  function searchWeb(query) {
    var jobs = [];
    jobs.push(fetch("https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(query) + "&format=json&origin=*")
      .then(function (res) { if (!res.ok) throw new Error("http"); return res.json(); })
      .then(function (data) {
        record("wikipedia", true);
        return ((data.query && data.query.search) || []).slice(0, 5).map(function (s) {
          return { title: s.title, snippet: stripTags(s.snippet).slice(0, 200), url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(s.title.replace(/ /g, "_")) };
        });
      }).catch(function () { record("wikipedia", false); return []; }));
    jobs.push(fetch("https://hn.algolia.com/api/v1/search?query=" + encodeURIComponent(query) + "&hitsPerPage=5")
      .then(function (res) { if (!res.ok) throw new Error("http"); return res.json(); })
      .then(function (data) {
        record("hacker-news", true);
        return (data.hits || []).filter(function (h) { return h.title; }).map(function (h) {
          return { title: h.title, snippet: "", url: h.url || ("https://news.ycombinator.com/item?id=" + h.objectID) };
        });
      }).catch(function () { record("hacker-news", false); return []; }));
    return Promise.all(jobs).then(function (parts) { return { wiki: parts[0], hn: parts[1] }; });
  }

  function init() {
    var input = document.getElementById("global-search-input");
    var btn = document.getElementById("global-search-btn");
    var select = document.getElementById("global-search-source");
    var results = document.getElementById("global-search-results");
    if (!input || !btn || !results) return;

    function show(html) { results.innerHTML = html; results.classList.remove("hidden"); }
    function hide() { results.classList.add("hidden"); results.innerHTML = ""; }
    function esc(s) {
      return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function section(title, items, renderItem) {
      if (!items.length) return "";
      return "<h3>" + esc(title) + "</h3><ul class=\"price-offer-list\">" + items.map(renderItem).join("") + "</ul>";
    }
    function footer() {
      return "<div><button class=\"btn btn-ghost btn-sm\" type=\"button\" id=\"global-search-close\">Close results</button> <a href=\"#/web\" class=\"btn btn-ghost btn-sm\" data-hide=\"1\">Open Web window</a></div>";
    }
    // Full-web fallback: the cockpit's own sources are Wikipedia, Hacker
    // News, crypto, GitHub, and saved knowledge — they are NOT a general
    // search engine, so a general query can legitimately return nothing
    // here. These plain links hand the same query to real search engines
    // in the phone's default browser, which is how a browser search box
    // behaves. No fetch, no key, nothing blocked by the page can stop a link.
    function engineLinks(query) {
      var q = encodeURIComponent(query);
      var links = "<li><a href=\"https://duckduckgo.com/?q=" + q + "\" target=\"_blank\" rel=\"noopener\">Search DuckDuckGo for “" + esc(query) + "”</a></li>"
        + "<li><a href=\"https://www.google.com/search?q=" + q + "\" target=\"_blank\" rel=\"noopener\">Search Google for “" + esc(query) + "”</a></li>";
      if (/\b(youtube|video|videos)\b/i.test(query)) {
        var terms = query.replace(/\b(give me|show me|find|youtube|videos?)\b/gi, "").trim() || query;
        links += "<li><a href=\"https://www.youtube.com/results?search_query=" + encodeURIComponent(terms) + "\" target=\"_blank\" rel=\"noopener\">Search YouTube for “" + esc(terms) + "”</a></li>";
      }
      return "<h3>More on the web (full search)</h3><ul class=\"price-offer-list\">" + links + "</ul>";
    }
    function finish(html) {
      show(html + footer());
      var close = document.getElementById("global-search-close");
      if (close) close.addEventListener("click", hide);
      results.querySelectorAll("[data-hide]").forEach(function (el) { el.addEventListener("click", hide); });
    }

    function run() {
      var query = input.value.trim();
      if (!query) { hide(); return; }
      var picked = pickSource(query, select ? select.value : "auto");
      var lower = query.toLowerCase();
      show("<div class=\"api-meta\">Searching for “" + esc(query) + "”… Bot picked: " + esc(picked.mode) + " — " + esc(picked.reason) + "</div>");
      var head = "<div class=\"api-meta\">Bot picked: " + esc(picked.mode) + " — " + esc(picked.reason) + "</div>";

      // Encyclopedia results, best-effort. Resolves to an array of
      // {id, title, level, verificationStatus}, or null when the data did
      // not load at all. Prefers the EncyclopediaBridge; falls back to a
      // direct CryptoWorld store search when the bridge is not loaded.
      function encyclopediaItems(q) {
        if (global.EncyclopediaBridge && typeof global.EncyclopediaBridge.searchEncyclopedia === "function") {
          try {
            var r = global.EncyclopediaBridge.searchEncyclopedia(q);
            if (r && typeof r.then === "function") return r.then(function (items) { return items || []; }).catch(function () { return null; });
            return Promise.resolve(r || []);
          } catch (e) { return Promise.resolve(null); }
        }
        if (global.CryptoWorld && typeof global.CryptoWorld.getAllRecords === "function" && typeof global.CryptoWorld.searchEntries === "function") {
          return global.CryptoWorld.getAllRecords().then(function (records) {
            return global.CryptoWorld.searchEntries(records || [], q).slice(0, 10).map(function (rec) {
              return { id: rec.id, title: rec.title, level: rec.level, registry: rec.registry, verificationStatus: rec.verificationStatus };
            });
          }).catch(function () { return null; });
        }
        return Promise.resolve(null);
      }
      function encyclopediaSection(items) {
        return section("Encyclopedia", items, function (it) {
          return '<li><a href="#/encyclopedia" class="global-result-link" data-hide="1">' + esc(it.title) + '</a> · ' + esc(it.level || "") + ' · ' + esc(it.verificationStatus || "UNVERIFIED") + '</li>';
        });
      }

      if (picked.mode === "app") {
        searchAppData(query, lower).then(function (items) {
          finish(head + section("In this app", items, function (it) {
            return '<li><a href="#/' + it.route + '" class="global-result-link" data-hide="1">' + esc(it.title) + '</a> · ' + esc(it.kind) + '</li>';
          }) || head + "<div class=\"api-meta\">Nothing found in the app for “" + esc(query) + "”.</div>");
        });
        return;
      }
      if (picked.mode === "crypto") {
        if (!global.PriceScout) { finish(head + "<div class=\"api-meta\">Price Scouts did not load.</div>"); return; }
        global.PriceScout.getCrypto(query.replace(/\s+price$/i, ""), {}).then(function (r) {
          if (!r || r.price === null) { finish(head + "<div class=\"api-meta\">No live price for that ticker right now.</div>"); return; }
          finish(head + "<h3>Crypto price</h3><ul class=\"price-offer-list\"><li>" + esc(r.name || r.symbol) + ": $" + Number(r.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " · " + esc(r.status) + " from " + esc(r.source || "—") + "</li></ul>");
        }).catch(function () { finish(head + "<div class=\"api-meta\">Could not load that price right now.</div>"); });
        return;
      }
      if (picked.mode === "github") {
        if (!global.KnowledgeScout) { finish(head + "<div class=\"api-meta\">Scouts layer did not load.</div>"); return; }
        global.KnowledgeScout.getGitHubActivity("jaybeee709-droid", "MTI6-GTADWIY-COCKPIT").then(function (r) {
          if (r.status === "error") { finish(head + "<div class=\"api-meta\">" + esc(r.note) + "</div>"); return; }
          finish(head + section("GitHub activity — cockpit repo", r.items, function (it) {
            return "<li>" + esc(it.label) + (it.actor ? " · " + esc(it.actor) : "") + "</li>";
          }));
        });
        return;
      }
      if (picked.mode === "news") {
        if (!global.KnowledgeScout) { finish(head + "<div class=\"api-meta\">Scouts layer did not load.</div>"); return; }
        global.KnowledgeScout.getNews(10).then(function (r) {
          if (r.status === "error") { finish(head + "<div class=\"api-meta\">" + esc(r.note) + "</div>"); return; }
          var words = lower.split(/\s+/).filter(function (w) { return w.length > 3 && ["news", "headlines", "stories"].indexOf(w) === -1; });
          var items = r.items.filter(function (it) { return !words.length || words.some(function (w) { return it.title.toLowerCase().indexOf(w) !== -1; }); });
          finish(head + section("News", items.length ? items : r.items, function (it) {
            return "<li><a href=\"" + esc(it.url) + "\" target=\"_blank\" rel=\"noopener\">" + esc(it.title) + "</a></li>";
          }));
        });
        return;
      }
      if (picked.mode === "knowledge") {
        var hits = [];
        try { hits = global.KnowledgeScout ? global.KnowledgeScout.searchKnowledge(query) : []; } catch (e) { hits = []; }
        finish(head + section("Saved bot knowledge", hits, function (e) {
          return "<li>“" + esc(e.topic) + "” · " + esc(e.source) + " · saved " + esc(String(e.fetchedAt || "").slice(0, 10)) + "</li>";
        }) || head + "<div class=\"api-meta\">No saved bot knowledge matched. Scrape and save a page on this topic in the Scouts panel first.</div>");
        return;
      }
      if (picked.mode === "encyclopedia") {
        encyclopediaItems(query).then(function (items) {
          if (items === null) { finish(head + "<div class=\"api-meta\">Encyclopedia data did not load.</div>"); return; }
          var body = encyclopediaSection(items);
          finish(head + (body || "<div class=\"api-meta\">No entry in the encyclopedia matches “" + esc(query) + "” — nothing is recorded, not a guess.</div>"));
        });
        return;
      }
      if (picked.mode === "page") {
        if (isYouTube(query)) { finish(head + "<div class=\"api-meta\">YouTube link — no embedded player; open it in your default browser.</div><ul class=\"price-offer-list\"><li><a href=\"" + esc(query) + "\" target=\"_blank\" rel=\"noopener\">Open video in default browser</a></li></ul>"); return; }
        if (!isUrl(query)) { finish(head + "<div class=\"api-meta\">Page mode needs a full URL starting with https://.</div>"); return; }
        if (!global.KnowledgeScout) { finish(head + "<div class=\"api-meta\">Scouts layer did not load.</div>"); return; }
        global.KnowledgeScout.scrapePublicPage(query).then(function (r) {
          if (r.status !== "live") {
            finish(head + "<div class=\"api-meta\">" + esc(r.note) + "</div><ul class=\"price-offer-list\"><li><a href=\"" + esc(query) + "\" target=\"_blank\" rel=\"noopener\">Open in default browser</a></li></ul>");
            return;
          }
          finish(head + "<h3>" + esc(r.title || r.url) + "</h3><div class=\"web-text\">" + esc(r.text.slice(0, 1500)) + "</div><ul class=\"price-offer-list\"><li><a href=\"" + esc(r.url) + "\" target=\"_blank\" rel=\"noopener\">Open full page in default browser</a></li></ul>");
        });
        return;
      }
      if (picked.mode === "web") {
        searchWeb(query).then(function (web) {
          finish(head + section("Wikipedia", web.wiki, function (w) {
            return "<li><a href=\"" + esc(w.url) + "\" target=\"_blank\" rel=\"noopener\">" + esc(w.title) + "</a> — " + esc(w.snippet) + "</li>";
          }) + section("Hacker News", web.hn, function (h) {
            return "<li><a href=\"" + esc(h.url) + "\" target=\"_blank\" rel=\"noopener\">" + esc(h.title) + "</a></li>";
          }) + engineLinks(query));
        });
        return;
      }
      // mode "all": app + knowledge + web + crypto-if-ticker, as before.
      var appP = searchAppData(query, lower);
      var know = [];
      try { know = global.KnowledgeScout ? global.KnowledgeScout.searchKnowledge(query) : []; } catch (e) { know = []; }
      var webP = searchWeb(query);
      var priceP = Promise.resolve(null);
      if (global.PriceScout && /^(btc|eth|sol|doge|xrp|ltc|ada)(\s+price)?$/i.test(query)) {
        priceP = global.PriceScout.getCrypto(query.replace(/\s+price$/i, ""), {}).catch(function () { return null; });
      }
      var encP = encyclopediaItems(query);
      Promise.all([appP, webP, priceP, encP]).then(function (parts) {
        var appItems = parts[0], web = parts[1], price = parts[2], encItems = parts[3];
        var html = head;
        html += section("In this app", appItems, function (it) {
          return '<li><a href="#/' + it.route + '" class="global-result-link" data-hide="1">' + esc(it.title) + '</a> · ' + esc(it.kind) + '</li>';
        });
        if (price && price.price !== null) {
          html += "<h3>Crypto price</h3><ul class=\"price-offer-list\"><li>" + esc(price.name || price.symbol) + ": $" + Number(price.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " · " + esc(price.status) + " from " + esc(price.source || "—") + "</li></ul>";
        }
        html += section("Saved bot knowledge", know, function (e) {
          return "<li>“" + esc(e.topic) + "” · " + esc(e.source) + " · saved " + esc(String(e.fetchedAt || "").slice(0, 10)) + "</li>";
        });
        html += section("Wikipedia", web.wiki, function (w) {
          return "<li><a href=\"" + esc(w.url) + "\" target=\"_blank\" rel=\"noopener\">" + esc(w.title) + "</a> — " + esc(w.snippet) + "</li>";
        });
        html += section("Hacker News", web.hn, function (h) {
          return "<li><a href=\"" + esc(h.url) + "\" target=\"_blank\" rel=\"noopener\">" + esc(h.title) + "</a></li>";
        });
        if (encItems && encItems.length) html += encyclopediaSection(encItems);
        if (isUrl(query)) {
          html += "<h3>Link</h3><ul class=\"price-offer-list\"><li>" + (isYouTube(query) ? "YouTube link — no embedded player; open it in your default browser." : "Public page link — open the Web window and paste it there to read its text, or open it in your default browser below.") + " <a href=\"" + esc(query) + "\" target=\"_blank\" rel=\"noopener\">Open in default browser</a></li></ul>";
        }
        if (html === head) html += "<div class=\"api-meta\">Nothing found for “" + esc(query) + "” in the cockpit, saved knowledge, Wikipedia, or Hacker News. The full web search below will find it.</div>";
        html += engineLinks(query);
        finish(html);
      }).catch(function () {
        finish(head + "<div class=\"api-meta\">Search hit an error. Your cockpit data was not changed — try again.</div>");
      });
    }

    btn.addEventListener("click", run);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); run(); } });
    // Lets other screens (e.g. the dashboard search) hand a query to the
    // top bar instead of dead-ending, so every search box behaves like a
    // browser search: local first, web when nothing local matches.
    global.GlobalSearch.runSearch = function (q) {
      input.value = q || "";
      if (select) select.value = "auto";
      run();
      try { window.scrollTo(0, 0); } catch (e) {}
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  global.GlobalSearch = { isUrl: isUrl, isYouTube: isYouTube, stripTags: stripTags, pickSource: pickSource };
})(window);
