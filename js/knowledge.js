/* MTI6-GTADWIY-COCKPIT — Scouts & Bot Knowledge (V1)
 *
 * Yes, bots can "scrape" knowledge — with a clear, honest boundary:
 *
 *   WHAT WORKS IN THE BROWSER (this file):
 *     - API data: GitHub public activity, Hacker News top stories.
 *     - Public-page text: fetch a public URL and extract its readable
 *       text (title + body text, scripts/styles/tags stripped, capped
 *       at 4,000 characters). This works ONLY when the page allows
 *       browser fetches (CORS). Most news/article pages do not, and
 *       that is reported honestly, not bypassed.
 *   WHAT DOES NOT HAPPEN HERE:
 *     - No login, no paywall, no captcha bypass, no private data.
 *     - No HTML scraping of a page that blocks the fetch.
 *     - For blocked pages, the real route is a server-side proxy
 *       (e.g. a Netlify function) — planned in the API registry as
 *       "ai-backend", key held server-side, needs owner approval.
 *
 * Saved knowledge is the hybrid half: scraped/fetched entries are
 * stored locally (localStorage, max 200, newest first) as structured
 * entries — topic, source, URL, date fetched, text — never raw HTML.
 * Star answers from saved knowledge first (see KnowledgeScout.answer),
 * then falls back to live APIs, then to its demo backend. A saved
 * entry is always labelled with its source and fetch date, so a stale
 * fact is never presented as fresh.
 *
 * All scout calls are read-only. Nothing here writes to GitHub,
 * sends a message, spends money, or changes cockpit data.
 */
(function (global) {
  "use strict";

  var KNOWLEDGE_KEY = "mti6_knowledge_v1";
  var MAX_ENTRIES = 200;
  var FETCH_TIMEOUT_MS = 10000;

  function recordUsage(apiId, ok, status) {
    try {
      if (global.ApiRegistry && typeof global.ApiRegistry.record === "function") {
        global.ApiRegistry.record(apiId, !!ok, status === undefined ? null : status);
      }
    } catch (e) {}
  }

  function fetchJson(url) {
    var controller = null, signal = undefined;
    try {
      if (typeof AbortController !== "undefined") {
        controller = new AbortController();
        signal = controller.signal;
        setTimeout(function () { try { controller.abort(); } catch (e) {} }, FETCH_TIMEOUT_MS);
      }
    } catch (e) {}
    return global.fetch(url, signal ? { signal: signal } : {}).then(function (res) {
      if (!res.ok) throw new Error("http_" + res.status);
      return res.json();
    });
  }

  function fetchText(url) {
    var controller = null, signal = undefined;
    try {
      if (typeof AbortController !== "undefined") {
        controller = new AbortController();
        signal = controller.signal;
        setTimeout(function () { try { controller.abort(); } catch (e) {} }, FETCH_TIMEOUT_MS);
      }
    } catch (e) {}
    return global.fetch(url, signal ? { signal: signal } : {}).then(function (res) {
      if (!res.ok) throw new Error("http_" + res.status);
      return res.text();
    });
  }

  function fmtTime(iso) {
    try { return new Date(iso).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }); }
    catch (e) { return iso || ""; }
  }

  // ---- Saved knowledge store -------------------------------------------
  function loadStore() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(KNOWLEDGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }
  function saveStore(entries) {
    try { if (global.localStorage) global.localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(entries)); }
    catch (e) {}
  }
  function addKnowledge(entry) {
    var entries = loadStore();
    var url = String(entry.url || "").trim();
    var topic = String(entry.topic || "").trim().toLowerCase();
    entries = entries.filter(function (e) { return !(String(e.url || "") === url && String(e.topic || "").toLowerCase() === topic); });
    entries.unshift({
      id: Date.now() + "-" + Math.floor(Math.random() * 100000),
      topic: entry.topic || "", source: entry.source || "", url: url,
      text: String(entry.text || "").slice(0, 4000),
      kind: entry.kind || "scraped", fetchedAt: new Date().toISOString()
    });
    entries = entries.slice(0, MAX_ENTRIES);
    saveStore(entries);
    return entries[0];
  }
  function searchKnowledge(query) {
    var q = String(query || "").toLowerCase().trim();
    if (!q) return loadStore().slice(0, 10);
    var words = q.split(/\s+/).filter(function (w) { return w.length > 2; });
    var scored = loadStore().map(function (e) {
      var hay = (e.topic + " " + e.text + " " + e.source).toLowerCase();
      var score = 0;
      words.forEach(function (w) { if (hay.indexOf(w) !== -1) score += 1; });
      if (hay.indexOf(q) !== -1) score += 2;
      return { entry: e, score: score };
    }).filter(function (s) { return s.score > 0; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 10).map(function (s) { return s.entry; });
  }
  function listKnowledge() { return loadStore(); }

  // ---- GitHub activity (public API, then commits fallback) -------------
  function getGitHubActivity(owner, repo, opts) {
    var o = String(owner || "").trim(), r = String(repo || "").trim();
    if (!o || !r) return Promise.resolve({ status: "error", note: "Enter a GitHub owner and repo, e.g. jaybeee709-droid / MTI6-GTADWIY-COCKPIT." });
    var base = "https://api.github.com/repos/" + encodeURIComponent(o) + "/" + encodeURIComponent(r);
    return fetchJson(base + "/events?per_page=10").then(function (events) {
      recordUsage("github-public", true, 200);
      var items = (Array.isArray(events) ? events : []).map(function (ev) {
        var label = ev.type || "event";
        if (ev.type === "PushEvent") label = "Pushed " + ((ev.payload && ev.payload.commits) ? ev.payload.commits.length : 0) + " commit(s)";
        if (ev.type === "PullRequestEvent") label = "Pull request " + ((ev.payload && ev.payload.action) || "");
        if (ev.type === "IssuesEvent") label = "Issue " + ((ev.payload && ev.payload.action) || "");
        return { label: label, actor: ev.actor ? ev.actor.login : "", at: ev.created_at || "" };
      });
      return { status: items.length ? "live" : "empty", source: "GitHub API", fetchedAt: new Date().toISOString(), items: items };
    }).catch(function () {
      recordUsage("github-public", false, null);
      return fetchJson(base + "/commits?per_page=5").then(function (commits) {
        recordUsage("github-public", true, 200);
        var items = (Array.isArray(commits) ? commits : []).map(function (c) {
          return { label: "Commit: " + String(c.commit && c.commit.message ? c.commit.message : "").split("\n")[0].slice(0, 80), actor: c.author ? c.author.login : "", at: c.commit && c.commit.author ? c.commit.author.date : "" };
        });
        return { status: items.length ? "live" : "empty", source: "GitHub API (commits fallback)", fetchedAt: new Date().toISOString(), items: items };
      }).catch(function () {
        recordUsage("github-public", false, null);
        return { status: "error", note: "Could not reach the GitHub API for that repo. It may be private, the name may be wrong, or the unauthenticated limit (60/hour) may be hit." };
      });
    });
  }

  // ---- News (Hacker News API; RSS needs a proxy) ------------------------
  function getNews(limit) {
    var n = Math.max(1, Math.min(10, Number(limit) || 8));
    return fetchJson("https://hacker-news.firebaseio.com/v0/topstories.json").then(function (ids) {
      var top = (Array.isArray(ids) ? ids : []).slice(0, n);
      return Promise.all(top.map(function (id) {
        return fetchJson("https://hacker-news.firebaseio.com/v0/item/" + id + ".json").catch(function () { return null; });
      })).then(function (items) {
        recordUsage("hacker-news", true, 200);
        var clean = items.filter(function (it) { return it && it.title; }).map(function (it) {
          return { title: it.title, url: it.url || ("https://news.ycombinator.com/item?id=" + it.id), score: it.score || 0, at: it.time ? new Date(it.time * 1000).toISOString() : "" };
        });
        return { status: clean.length ? "live" : "empty", source: "Hacker News API", fetchedAt: new Date().toISOString(), items: clean };
      });
    }).catch(function () {
      recordUsage("hacker-news", false, null);
      return { status: "error", note: "Could not reach the Hacker News API right now. General news RSS feeds need a server-side proxy first (see the API registry), so no RSS fallback is shown rather than a fake list." };
    });
  }

  // ---- Public-page text scrape (CORS-dependent, public only) -----------
  function stripHtml(html) {
    var text = String(html || "");
    text = text.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
    var titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, " ").trim() : "";
    text = text.replace(/<[^>]+>/g, " ");
    text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    text = text.replace(/\s+/g, " ").trim();
    return { title: title, text: text.slice(0, 4000) };
  }

  function scrapePublicPage(url) {
    var u = String(url || "").trim();
    if (!/^https?:\/\//i.test(u)) {
      return Promise.resolve({ status: "error", note: "Enter a full public URL starting with https:// — no login pages, no private links." });
    }
    return fetchText(u).then(function (html) {
      var clean = stripHtml(html);
      if (!clean.text) return { status: "error", url: u, note: "That page returned no readable text in the browser." };
      return { status: "live", url: u, title: clean.title, text: clean.text, source: "page-scrape", fetchedAt: new Date().toISOString() };
    }).catch(function () {
      return { status: "error", url: u, note: "That page blocks browser fetches (CORS) or is unreachable from this device. It is not bypassed — a server-side proxy is the route for blocked pages, and it is not configured yet." };
    });
  }

  function saveScrapedAsKnowledge(topic, url) {
    return scrapePublicPage(url).then(function (result) {
      if (result.status !== "live") return result;
      var entry = addKnowledge({ topic: topic, url: result.url, text: (result.title ? result.title + " — " : "") + result.text, source: "page-scrape", kind: "scraped" });
      return { status: "saved", entry: entry, fetchedAt: result.fetchedAt };
    });
  }

  // ---- Star helper: answer from saved knowledge, or null ----------------
  function answer(text) {
    var hits = searchKnowledge(text);
    if (!hits.length) return null;
    var top = hits[0];
    var snippet = top.text.length > 500 ? top.text.slice(0, 500) + "…" : top.text;
    return "From saved bot knowledge — “" + top.topic + "” (source: " + top.source + (top.url ? ", " + top.url : "") + ", saved " + fmtTime(top.fetchedAt) + "):\n" + snippet + "\n\nSaved knowledge is local only; for fresh data, use the Scouts panel below.";
  }

  global.KnowledgeScout = {
    addKnowledge: addKnowledge, searchKnowledge: searchKnowledge, listKnowledge: listKnowledge,
    getGitHubActivity: getGitHubActivity, getNews: getNews,
    scrapePublicPage: scrapePublicPage, saveScrapedAsKnowledge: saveScrapedAsKnowledge,
    stripHtml: stripHtml, answer: answer, fmtTime: fmtTime, KNOWLEDGE_KEY: KNOWLEDGE_KEY
  };
})(window);
