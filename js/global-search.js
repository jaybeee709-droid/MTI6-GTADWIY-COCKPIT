/* MTI6-GTADWIY-COCKPIT — Global search bar (V1)
 * One search bar in the app shell, visible on EVERY screen.
 * One query searches, in order:
 *   1. This app (local only): vault notes, tasks, projects, expenses
 *      from IndexedDB via CockpitDB.getAll. Nothing leaves the device.
 *   2. Saved bot knowledge (local only).
 *   3. The web, no key, browser-direct: Wikipedia summaries and
 *      Hacker News search, plus a crypto price if the query is a
 *      known ticker (via PriceScout's triple fallback chain).
 *   4. A pasted URL: YouTube plays in the Web window; a public page
 *      shows its readable text there; a blocked page gets a
 *      default-browser link, never a bypass.
 * Results appear in a content window right under the bar, on
 * whatever screen is open. Tapping an app result jumps to that
 * screen. Tapping "Open in Web window" jumps to #/web.
 * What this bar does NOT search: the phone's files, other apps,
 * or private accounts. A web page cannot reach those — they are
 * sandboxed away from the browser.
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

  function searchAppData(query, lower) {
    var jobs = [];
    if (!global.CockpitDB || typeof global.CockpitDB.getAll !== "function") return Promise.resolve([]);
    var stores = [
      { store: "notes", route: "vault", titleOf: function (x) { return x.title || "(untitled note)"; }, bodyOf: function (x) { return (x.title || "") + " " + (x.body || "") + " " + (x.category || ""); } },
      { store: "tasks", route: "tasks", titleOf: function (x) { return x.title || "(untitled task)"; }, bodyOf: function (x) { return (x.title || "") + " " + (x.notes || ""); } },
      { store: "projects", route: "projects", titleOf: function (x) { return x.name || "(untitled project)"; }, bodyOf: function (x) { return (x.name || "") + " " + (x.description || ""); } },
      { store: "expenses", route: "expenses", titleOf: function (x) { return x.title || x.description || "(expense)"; }, bodyOf: function (x) { return (x.title || "") + " " + (x.description || "") + " " + (x.category || ""); } }
    ];
    stores.forEach(function (s) {
      jobs.push(global.CockpitDB.getAll(s.store).then(function (rows) {
        return (rows || []).filter(function (x) { return s.bodyOf(x).toLowerCase().indexOf(lower) !== -1; })
          .slice(0, 5).map(function (x) { return { kind: s.store, route: s.route, title: s.titleOf(x) }; });
      }).catch(function () { return []; }));
    });
    return Promise.all(jobs).then(function (groups) {
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

    function run() {
      var query = input.value.trim();
      if (!query) { hide(); return; }
      show("<div class=\"api-meta\">Searching the cockpit and the web for “" + esc(query) + "”…</div>");
      var lower = query.toLowerCase();
      var appP = searchAppData(query, lower);
      var know = [];
      try { know = global.KnowledgeScout ? global.KnowledgeScout.searchKnowledge(query) : []; } catch (e) { know = []; }
      var webP = searchWeb(query);
      var priceP = Promise.resolve(null);
      if (global.PriceScout && /^(btc|eth|sol|doge|xrp|ltc|ada)(\s+price)?$/i.test(query)) {
        priceP = global.PriceScout.getCrypto(query.replace(/\s+price$/i, ""), {}).catch(function () { return null; });
      }
      Promise.all([appP, webP, priceP]).then(function (parts) {
        var appItems = parts[0], web = parts[1], price = parts[2];
        var html = "";
        html += section("In this app", appItems, function (it) {
          return "<li><a href=\"#/" + it.route + "\" class=\"global-result-link\" data-hide=\"1\">" + esc(it.title) + "</a> · " + esc(it.kind) + "</li>";
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
        if (isUrl(query)) {
          html += "<h3>Link</h3><ul class=\"price-offer-list\"><li>" + (isYouTube(query) ? "YouTube link — open the Web window and paste it there to play it embedded." : "Public page link — open the Web window and paste it there to read its text, or open it in your default browser below.") + " <a href=\"" + esc(query) + "\" target=\"_blank\" rel=\"noopener\">Open in default browser</a></li></ul>";
        }
        if (!html) html = "<div class=\"api-meta\">Nothing found for “" + esc(query) + "” in the cockpit, saved knowledge, Wikipedia, or Hacker News. Try a shorter word, or paste a full URL.</div>";
        html += "<div><button class=\"btn btn-ghost btn-sm\" type=\"button\" id=\"global-search-close\">Close results</button> <a href=\"#/web\" class=\"btn btn-ghost btn-sm\" data-hide=\"1\">Open Web window</a></div>";
        show(html);
        var close = document.getElementById("global-search-close");
        if (close) close.addEventListener("click", hide);
        results.querySelectorAll("[data-hide]").forEach(function (el) { el.addEventListener("click", hide); });
      }).catch(function () {
        show("<div class=\"api-meta\">Search hit an error. Your cockpit data was not changed — try again.</div>");
      });
    }

    btn.addEventListener("click", run);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); run(); } });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  global.GlobalSearch = { isUrl: isUrl, isYouTube: isYouTube, stripTags: stripTags };
})(window);
