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
 *
 * Crypto World extension (spec C10): the same bar also searches the
 * Crypto World registries — Major Activities, Types, Strategies,
 * assets, networks, protocols, positions, opportunities — through
 * searchCryptoWorld() below. Every source is behind a defensive
 * typeof check (absent registry -> source skipped, never a crash);
 * results are local only, carry no price or balance, and point at
 * real screens. The existing Encyclopedia source is kept as-is;
 * results it already covered are not duplicated in the Crypto World
 * section.
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

  // ---- UNIVERSAL SEARCH — PHASE 1 (manual search only) ----------------
  // Pure helpers at module scope so tests can drive them without a DOM.
  // Phases 2, 3 and 4 are NOT built here: the only later-phase content
  // in this file is an honest "not built yet" note. Sessions are plain
  // groupings, never fake browser-process isolation. No new IndexedDB
  // store, no Opportunity creation, no automatic downloads.
  var ONION_LABEL = (global.SearchUrl && global.SearchUrl.ONION_LABEL) || "ONION SERVICE";
  var TOR_REQUIRED = (global.SearchUrl && global.SearchUrl.TOR_REQUIRED) || "TOR ACCESS REQUIRED";

  // §45 manual prefixes. "saved:" maps to the existing knowledge mode.
  var PREFIX_SOURCES = { web: "web", crypto: "crypto", github: "github",
    news: "news", encyclopedia: "encyclopedia", saved: "knowledge" };
  function parsePrefix(raw) {
    var q = String(raw || "").trim();
    var m = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(q);
    if (!m) return { source: null, query: q, prefix: null, blocked: false, reason: "" };
    var p = m[1].toLowerCase();
    if (p === "bot") return { source: null, query: m[2], prefix: "bot:", blocked: true,
      reason: "Bot research is Phase 2 — not built yet. This is a manual search; nothing was sent to a bot." };
    if (p === "onion") return { source: null, query: m[2], prefix: "onion:", blocked: true,
      reason: "Onion/Tor work is Phase 4 — not built yet. The address was not fetched and not sent to any search provider." };
    if (PREFIX_SOURCES[p]) return { source: PREFIX_SOURCES[p], query: m[2], prefix: p + ":", blocked: false, reason: "" };
    return { source: null, query: q, prefix: null, blocked: false, reason: "" };
  }

  // The 20 known routes (same set as js/app.js ROUTES). Internal-route
  // navigation only ever targets one of these; anything else is a
  // search, never a navigation. Bare words are NOT routes: typing
  // "encyclopedia" searches the encyclopedia — only "#/route" navigates.
  var KNOWN_ROUTES = ["dashboard", "vault", "tasks", "projects", "expenses",
    "globe", "crypto", "crypto-world", "bot-ops", "wallets", "opportunities",
    "earn", "positions", "encyclopedia", "operations", "accounts", "web",
    "analytics", "security", "settings"];
  function isOnionText(text) {
    var t = String(text || "").trim().toLowerCase();
    return /(^|[\/:])[^\/\s]*\.onion(\/|\?|#|$)/.test(t);
  }
  // URL classification. Uses the SearchUrl module when it is loaded
  // (sibling worker's contract); otherwise the local fallback below,
  // which implements the same shape. Never fetches anything.
  function classifyInput(text) {
    var t = String(text || "").trim();
    if (global.SearchUrl && typeof global.SearchUrl.classify === "function") {
      try { return global.SearchUrl.classify(t); } catch (e) {}
    }
    if (isOnionText(t)) return { kind: "onion", url: t, route: null, param: null, host: null, scheme: null, label: ONION_LABEL };
    var hm = /^#\/([A-Za-z0-9-]+)(?:\/([^#\s]*))?$/.exec(t);
    if (hm && KNOWN_ROUTES.indexOf(hm[1]) !== -1) {
      return { kind: "internal-route", url: null, route: hm[1], param: hm[2] || null, host: null, scheme: null, label: hm[1] };
    }
    var dm = /^mticockpit:\/\/([A-Za-z0-9-]+)(?:\/([^#\s]*))?$/.exec(t.toLowerCase());
    if (dm) {
      if (KNOWN_ROUTES.indexOf(dm[1]) !== -1) return { kind: "deep-link", url: null, route: dm[1], param: dm[2] || null, host: null, scheme: "mticockpit", label: dm[1] };
      return { kind: "deep-link", url: null, route: null, param: null, host: null, scheme: "mticockpit", label: t };
    }
    if (/^https?:\/\//i.test(t)) return { kind: /^https/i.test(t) ? "https" : "http", url: t, route: null, param: null, host: null, scheme: /^https/i.test(t) ? "https" : "http", label: t };
    var sm = /^([a-z][a-z0-9+.-]*):/i.exec(t);
    if (sm) return { kind: "unknown-scheme", url: null, route: null, param: null, host: null, scheme: sm[1].toLowerCase(), label: t };
    return { kind: "text", url: null, route: null, param: null, host: null, scheme: null, label: t };
  }

  // §4/§47 AUTO fail-closed. StarCommand.classify over-triggers on
  // topic words ("Bitcoin staking" is a search topic per §47, and
  // "show staking in the encyclopedia" is an encyclopedia query), so
  // the classifier alone is not the gate: it must ALSO read as a
  // financial ACTION — a leading action verb, an amount being sent,
  // or "cash out". A topic mention never blocks a search.
  var FINANCIAL_ACTION_RE = /^\s*(buy|sell|swap|send|withdraw|claim|stake|lend|borrow|bridge|cash\s*out)\b/i;
  var FINANCIAL_AMOUNT_RE = /\b(send|transfer|pay|withdraw|cash\s*out)\b[^a-z0-9]{0,12}\$?\s*\d/i;
  function isFinancialAction(text) {
    var t = String(text || "").trim();
    if (!t) return false;
    var classified = null;
    if (global.StarCommand && typeof global.StarCommand.classify === "function") {
      try { classified = global.StarCommand.classify(t); } catch (e) { classified = null; }
    }
    var actionShaped = FINANCIAL_ACTION_RE.test(t) || FINANCIAL_AMOUNT_RE.test(t) || /\bcash\s*out\b/i.test(t);
    if (classified) {
      var transactional = classified.permission === "TRANSACTIONAL" || classified.intent === "APPROVAL_REQUIRED";
      return transactional && actionShaped;
    }
    return actionShaped;
  }

  // §32 wallet-link warning patterns (URL/title of a result). Claim /
  // airdrop / mint / swap / bridge / signature / wallet-connect
  // wording flags a result on its own. "Staking" alone does not: a
  // Wikipedia article titled "Staking" is not a wallet link — staking
  // only flags when it appears with wallet-action wording (connect,
  // claim, mint, airdrop, wallet, sign) in the same result.
  var WALLET_LINK_RE = /wallet[- ]?connect|claim|airdrop|\bmint\b|swap|bridge|signature|connect (a|your|the) wallet/i;
  var WALLET_STAKE_RE = /stak/i;
  var WALLET_ACTION_RE = /connect|claim|wallet|mint|airdrop|sign/i;
  function walletWarningFor(text) {
    var s = String(text || "");
    if (WALLET_LINK_RE.test(s)) return true;
    return WALLET_STAKE_RE.test(s) && WALLET_ACTION_RE.test(s);
  }

  // §3 source states, via the SearchProviders registry when loaded,
  // else a truthful local fallback (local sources are available;
  // network sources are available only when their scout loaded).
  function sourceStateFor(sourceId) {
    var id = String(sourceId || "auto").toLowerCase();
    if (global.SearchProviders && typeof global.SearchProviders.sourceState === "function") {
      try { return global.SearchProviders.sourceState(id) || "UNKNOWN"; } catch (e) {}
    }
    if (id === "bot" || id === "onion") return "UNAVAILABLE";
    if (id === "app" || id === "knowledge" || id === "encyclopedia" || id === "page" || id === "auto" || id === "web") return "AVAILABLE";
    if (id === "crypto") return (global.PriceScout ? "AVAILABLE" : "NOT_CONNECTED");
    if (id === "github" || id === "news") return (global.KnowledgeScout ? "AVAILABLE" : "NOT_CONNECTED");
    return "UNKNOWN";
  }

  // Web providers, via the SearchProviders registry when loaded, else
  // the four template providers (no key, plain search URLs).
  var FALLBACK_WEB_PROVIDERS = [
    { providerId: "duckduckgo", displayName: "DuckDuckGo", searchUrlTemplate: "https://duckduckgo.com/?q={q}" },
    { providerId: "google", displayName: "Google", searchUrlTemplate: "https://www.google.com/search?q={q}" },
    { providerId: "bing", displayName: "Bing", searchUrlTemplate: "https://www.bing.com/search?q={q}" },
    { providerId: "brave", displayName: "Brave", searchUrlTemplate: "https://search.brave.com/search?q={q}" }
  ];
  function webProviders() {
    if (global.SearchProviders && typeof global.SearchProviders.listWebProviders === "function") {
      try {
        var list = global.SearchProviders.listWebProviders();
        if (Array.isArray(list) && list.length) return list;
      } catch (e) {}
    }
    return FALLBACK_WEB_PROVIDERS.slice();
  }
  function defaultWebProvider() {
    if (global.SearchProviders && typeof global.SearchProviders.getDefaultWebProvider === "function") {
      try { return global.SearchProviders.getDefaultWebProvider() || "duckduckgo"; } catch (e) {}
    }
    return "duckduckgo";
  }
  function buildWebSearchUrl(providerId, query) {
    if (global.SearchProviders && typeof global.SearchProviders.buildSearchUrl === "function") {
      try {
        var u = global.SearchProviders.buildSearchUrl(providerId, query);
        if (u) return u;
      } catch (e) {}
    }
    var found = null;
    webProviders().forEach(function (p) { if (p.providerId === providerId) found = p; });
    if (!found || !found.searchUrlTemplate) return null;
    return String(found.searchUrlTemplate).replace("{q}", encodeURIComponent(query));
  }

  // §17 save a result to Knowledge. KnowledgeModel validates first
  // (secret-looking fields are rejected, honestly); KnowledgeScout
  // stamps the saved entry UNVERIFIED — this function never upgrades it.
  function saveResult(entry) {
    var e = entry || {};
    if (global.KnowledgeModel && typeof global.KnowledgeModel.validateKnowledgeEntry === "function") {
      var errors;
      try { errors = global.KnowledgeModel.validateKnowledgeEntry(e); } catch (err) { errors = ["Validation failed: " + err.message]; }
      if (errors && errors.length) return { ok: false, saved: null, errors: errors, cite: null };
    }
    if (!global.KnowledgeScout || typeof global.KnowledgeScout.addKnowledge !== "function") {
      return { ok: false, saved: null, errors: ["KnowledgeScout did not load — nothing was saved."], cite: null };
    }
    var saved;
    try {
      saved = global.KnowledgeScout.addKnowledge({
        topic: e.title || e.topic || "", url: e.url || "",
        text: e.text || e.snippet || "", source: e.source || "manual-search", kind: "scraped"
      });
    } catch (err) { return { ok: false, saved: null, errors: ["Save failed: " + err.message], cite: null }; }
    var cite = null;
    if (global.KnowledgeModel && typeof global.KnowledgeModel.cite === "function") {
      try { cite = global.KnowledgeModel.cite(saved); } catch (err) { cite = null; }
    }
    return { ok: true, saved: saved, errors: [], cite: cite };
  }

  // §48 minimal honest "Send to STAR": opens the STAR overlay and
  // prefills its input with a reference line (title, URL, origin).
  // The user still sends it themselves — nothing is sent automatically
  // and no tab content is captured (URL/title/origin only).
  function sendToStar(title, url, origin) {
    var line = String(title || "Untitled") + " — " + String(url || "") +
      " (origin: " + String(origin || "MANUAL SEARCH") + ", UNVERIFIED unless stated)";
    if (global.StarOverlay && typeof global.StarOverlay.open === "function") {
      try { global.StarOverlay.open(); } catch (e) {}
    }
    var filled = false;
    try {
      var input = document.querySelector ? document.querySelector(".star-input") : null;
      if (input) { input.value = line; filled = true; }
    } catch (e) { filled = false; }
    return { line: line, opened: !!(global.StarOverlay && typeof global.StarOverlay.open === "function"), filled: filled };
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

  // ---- Crypto World extension (spec C10) -------------------------------
  // Local-only search over the Crypto World registries. Additive: it
  // reuses the existing architecture (same rendering, same "nothing
  // found" honesty) and never builds a second search engine. Every
  // source is behind a defensive typeof check: an absent registry is
  // skipped, never a crash. Empty query -> []. No live data, no
  // prices, no balances: a result never carries a price or balance.
  // Every result is {kind, id, title, subtitle, route, source,
  // verificationStatus}; route is always a real screen. Taxonomy
  // results keep route "#/encyclopedia" (pinned by
  // global-search-crypto-test.js) and carry the entry id, so the
  // rendered link deep-links to #/encyclopedia/<id> through the
  // router's per-entry route.
  var CRYPTO_SEARCH_MAX_PER_SOURCE = 10;
  var CRYPTO_SEARCH_MAX_TOTAL = 50;
  // Source order in the combined result list (taxonomy first).
  var CRYPTO_SOURCE_ORDER = ["major-activity", "type", "strategy",
    "asset", "network", "protocol", "position", "opportunity"];

  // Match quality on the indexed fields: 3 exact name, 2 prefix,
  // 1 substring, 0 no match. Case-insensitive.
  function cryptoMatchScore(fields, q) {
    var best = 0;
    (fields || []).forEach(function (f) {
      var v = String(f || "").toLowerCase().trim();
      if (!v) return;
      if (v === q) best = Math.max(best, 3);
      else if (v.indexOf(q) === 0) best = Math.max(best, 2);
      else if (v.indexOf(q) !== -1) best = Math.max(best, 1);
    });
    return best;
  }
  function cryptoSortScored(list) {
    list.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      var ta = String(a.title || "").toLowerCase();
      var tb = String(b.title || "").toLowerCase();
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    });
    return list;
  }
  function cryptoResult(kind, id, title, subtitle, route, source, verificationStatus) {
    return { kind: kind, id: id, title: title, subtitle: subtitle || "",
      route: route, source: source,
      verificationStatus: verificationStatus || "UNKNOWN" };
  }

  // Encyclopedia records, via the bridge when loaded (store first,
  // batch data fallback), else straight from CryptoWorld, else [].
  // Never throws; an unreadable store is an empty source, not a crash.
  function cryptoWorldRecords() {
    if (global.EncyclopediaBridge && typeof global.EncyclopediaBridge.loadRecords === "function") {
      try {
        var r = global.EncyclopediaBridge.loadRecords();
        if (r && typeof r.then === "function") {
          return r.then(function (d) {
            return (d && Array.isArray(d.records)) ? d.records : [];
          }).catch(function () { return []; });
        }
        return Promise.resolve((r && Array.isArray(r.records)) ? r.records : []);
      } catch (e) { return Promise.resolve([]); }
    }
    if (global.CryptoWorld && typeof global.CryptoWorld.getAllRecords === "function") {
      try { return global.CryptoWorld.getAllRecords().catch(function () { return []; }); }
      catch (e) { return Promise.resolve([]); }
    }
    return Promise.resolve([]);
  }

  // Tolerant read of an optional peer module's list: tries each named
  // function in turn, then each named array. Absent module, absent
  // function, thrown error -> [] (source skipped, never a crash).
  function peerList(mod, fnNames, arrayNames) {
    if (!mod) return [];
    var i;
    for (i = 0; i < fnNames.length; i++) {
      if (typeof mod[fnNames[i]] === "function") {
        try {
          var out = mod[fnNames[i]]();
          return Array.isArray(out) ? out : [];
        } catch (e) { return []; }
      }
    }
    for (i = 0; i < arrayNames.length; i++) {
      if (Array.isArray(mod[arrayNames[i]])) return mod[arrayNames[i]];
    }
    return [];
  }

  // Search every Crypto World source. Returns a Promise of normalized
  // results, capped at 10 per source and 50 total, ordered by source
  // priority, then exact > prefix > substring within a source.
  function searchCryptoWorld(query) {
    var q = String(query || "").trim().toLowerCase();
    if (!q) return Promise.resolve([]);
    return cryptoWorldRecords().then(function (records) {
      var byId = {};
      (records || []).forEach(function (r) {
        if (r && typeof r.id === "string") byId[r.id] = r;
      });
      function titleOf(id) {
        var r = byId[id];
        return r ? (r.title || id) : id;
      }
      var groups = {};
      CRYPTO_SOURCE_ORDER.forEach(function (k) { groups[k] = []; });
      function push(kind, fields, result) {
        var score = cryptoMatchScore(fields, q);
        if (score > 0) { result.score = score; groups[kind].push(result); }
      }

      // Major Activities / Types / Strategies (canonical 60 + Batch B).
      (records || []).forEach(function (rec) {
        if (!rec || typeof rec.title !== "string") return;
        var fields = [rec.title].concat(rec.aliases || []);
        if (rec.level === "MAJOR_ACTIVITY") {
          push("major-activity", fields, cryptoResult("major-activity", rec.id, rec.title,
            "Major Activity · Crypto World", "#/encyclopedia", "CryptoWorld", rec.verificationStatus));
        } else if (rec.level === "TYPE") {
          push("type", fields, cryptoResult("type", rec.id, rec.title,
            "Type of " + titleOf(rec.parentRef), "#/encyclopedia", "CryptoWorld", rec.verificationStatus));
        } else if (rec.level === "STRATEGY") {
          push("strategy", fields, cryptoResult("strategy", rec.id, rec.title,
            "Strategy of " + titleOf(rec.parentRef), "#/encyclopedia", "CryptoWorld", rec.verificationStatus));
        }
      });

      // Assets: AssetIntelligence classes (by label / id) plus any
      // assets-registry records (by title / canonicalName / symbol /
      // assetClass). No individual asset is invented: only records the
      // registries actually hold are returned.
      peerList(global.AssetIntelligence, ["listClasses"], ["CLASSES"]).forEach(function (c) {
        if (!c) return;
        push("asset", [c.label || c.canonicalName, c.id, c.description],
          cryptoResult("asset", c.id, c.label || c.canonicalName || c.id,
            "Asset class" + (c.id ? " · " + c.id : ""), "#/crypto-world",
            "AssetIntelligence", c.verificationStatus));
      });
      (records || []).forEach(function (rec) {
        if (!rec || rec.registry !== "assets" || typeof rec.title !== "string") return;
        push("asset", [rec.title, rec.canonicalName, rec.symbol, rec.assetClass],
          cryptoResult("asset", rec.id, rec.title,
            "Asset" + (rec.assetClass ? " · " + rec.assetClass : ""), "#/crypto-world",
            "CryptoWorld", rec.verificationStatus));
      });

      // Networks: NetworkIntelligence example networks (by name / vm)
      // plus any chains-registry records.
      peerList(global.NetworkIntelligence, ["listNetworks", "getExampleNetworks"],
        ["EXAMPLE_NETWORKS", "NETWORKS"]).forEach(function (n) {
        if (!n) return;
        push("network", [n.name || n.canonicalName, n.id, n.vm, n.ecosystem],
          cryptoResult("network", n.id, n.name || n.canonicalName || n.id,
            "Network" + (n.vm ? " · " + n.vm : ""), "#/crypto-world",
            "NetworkIntelligence", n.verificationStatus));
      });
      (records || []).forEach(function (rec) {
        if (!rec || rec.registry !== "chains" || typeof rec.title !== "string") return;
        push("network", [rec.title, rec.name, rec.vm, rec.ecosystem],
          cryptoResult("network", rec.id, rec.title,
            "Network" + (rec.vm ? " · " + rec.vm : ""), "#/crypto-world",
            "CryptoWorld", rec.verificationStatus));
      });

      // Protocols: ProtocolIntelligence when loaded (by name / category)
      // plus any protocols-registry records. Absent module -> skipped.
      peerList(global.ProtocolIntelligence, ["listProtocols", "getAllProtocols"],
        ["PROTOCOLS", "protocols"]).forEach(function (p) {
        if (!p) return;
        push("protocol", [p.name, p.id, p.category],
          cryptoResult("protocol", p.id, p.name || p.id,
            "Protocol" + (p.category ? " · " + p.category : ""), "#/crypto-world",
            "ProtocolIntelligence", p.verificationStatus));
      });
      (records || []).forEach(function (rec) {
        if (!rec || rec.registry !== "protocols" || typeof rec.title !== "string") return;
        push("protocol", [rec.title, rec.name, rec.category],
          cryptoResult("protocol", rec.id, rec.title,
            "Protocol" + (rec.category ? " · " + rec.category : ""), "#/crypto-world",
            "CryptoWorld", rec.verificationStatus));
      });

      // Positions: PositionIntelligence when loaded (by asset / protocol
      // / activity) plus any positions-registry records. Route is the
      // real Wallets screen. Absent module -> skipped.
      peerList(global.PositionIntelligence, ["listPositions", "getAllPositions"],
        ["POSITIONS", "positions"]).forEach(function (pos) {
        if (!pos) return;
        var pSub = [pos.protocol, pos.activity, pos.majorActivityId]
          .filter(function (x) { return !!x; }).join(" · ") || "Position";
        push("position", [pos.title, pos.asset, pos.protocol, pos.activity,
          pos.majorActivityId, pos.id],
          cryptoResult("position", pos.id, pos.title || pos.asset || pos.id,
            pSub, "#/wallets", "PositionIntelligence", pos.verificationStatus));
      });
      (records || []).forEach(function (rec) {
        if (!rec || rec.registry !== "positions") return;
        push("position", [rec.title, rec.asset, rec.protocol, rec.activity,
          rec.majorActivityId, rec.id],
          cryptoResult("position", rec.id, rec.title || rec.asset || rec.id,
            "Position", "#/wallets", "CryptoWorld", rec.verificationStatus));
      });

      // Opportunities: OpportunityIntelligence (by asset / strategy).
      // Route is the real Opportunities screen.
      peerList(global.OpportunityIntelligence, ["listOpportunities"],
        ["opportunities"]).forEach(function (op) {
        if (!op) return;
        var stratTitle = op.strategyId ? titleOf(op.strategyId) : "";
        var typeTitle = op.typeId ? titleOf(op.typeId) : "";
        var assetLabel = (op.assetRef && op.assetRef.assetClassId) || "";
        var protoName = (op.protocolRef && op.protocolRef.name) || "";
        var oTitle = stratTitle || op.id;
        var oSub = [assetLabel, typeTitle, protoName]
          .filter(function (x) { return !!x; }).join(" · ") || "Opportunity";
        push("opportunity", [oTitle, op.id, assetLabel, stratTitle, typeTitle, protoName],
          cryptoResult("opportunity", op.id, oTitle, oSub,
            "#/opportunities", "OpportunityIntelligence", op.verificationStatus));
      });

      var out = [];
      CRYPTO_SOURCE_ORDER.forEach(function (kind) {
        cryptoSortScored(groups[kind]);
        groups[kind].slice(0, CRYPTO_SEARCH_MAX_PER_SOURCE).forEach(function (r) {
          if (out.length < CRYPTO_SEARCH_MAX_TOTAL) { delete r.score; out.push(r); }
        });
      });
      return out;
    });
  }

  function searchWeb(query) {    var jobs = [];
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
    // Phase 1 bar controls (added in index.html; every access guarded
    // so older stubs that lack them keep working).
    var newTabBtn = document.getElementById("global-search-new-tab");
    var barStarBtn = document.getElementById("global-search-star-btn");
    var stateChip = document.getElementById("global-search-source-state");
    var webProviderSelect = document.getElementById("global-search-web-provider");
    var sourceBtn = document.getElementById("global-search-source-btn");
    var sourceMenu = document.getElementById("global-search-source-menu");
    // Workspace state: tabs/sessions/history live in the sibling
    // modules when loaded; these locals only track which tab/session
    // this bar is currently working in.
    var currentSessionId = null;
    var activeTabId = null;
    var plainTextOverride = false;
    var lastQuery = "";
    var lastSource = "auto";
    var lastProvider = defaultWebProvider();
    // Test-visible last-action records (set only once the export
    // object below exists; init can run before it when the document
    // is already loaded, so guard).
    function noteSave(res) { if (global.GlobalSearch) global.GlobalSearch.lastSaveResult = res; }
    function noteStar(res) { if (global.GlobalSearch) global.GlobalSearch.lastStarSend = res; }
    function noteExport(json) { if (global.GlobalSearch) global.GlobalSearch.lastExportJson = json; }

    function show(html) { results.innerHTML = html; results.classList.remove("hidden"); }
    function hide() { results.classList.add("hidden"); results.innerHTML = ""; }
    function esc(s) {
      return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    // Phase 1: every result section carries a visible ORIGIN label, and
    // external (API/web) sections flag wallet-link patterns (§32).
    // opts: { origin, external }. Existing callers pass the origin.
    function section(title, items, renderItem, opts) {
      if (!items.length) return "";
      var o = opts || {};
      var origin = o.origin ? ' <span class="search-origin">ORIGIN: ' + esc(o.origin) + "</span>" : "";
      return "<h3>" + esc(title) + origin + "</h3><ul class=\"price-offer-list\">" + items.map(function (it, i) {
        var html = renderItem(it, i);
        if (o.external && walletWarningFor(html)) {
          html = html.replace("</li>", ' <span class="wallet-warning">Wallet link — opening does not connect a wallet or sign anything</span></li>');
          if (html.indexOf("wallet-warning") === -1) html += ' <span class="wallet-warning">Wallet link — opening does not connect a wallet or sign anything</span>';
        }
        return html;
      }).join("") + "</ul>";
    }
    // Per-result actions: Save to Knowledge + Send to STAR. Values are
    // escaped into data attributes; the click delegation below reads
    // them back. Nothing here executes anything.
    function acts(title, url, origin, text) {
      return ' <button type="button" class="btn btn-ghost btn-sm search-save-btn" data-save-title="' + esc(title) +
        '" data-save-url="' + esc(url || "") + '" data-save-origin="' + esc(origin || "MANUAL SEARCH") +
        '" data-save-text="' + esc(String(text || "").slice(0, 200)) + '">Save</button>' +
        ' <button type="button" class="btn btn-ghost btn-sm search-star-btn" data-star-title="' + esc(title) +
        '" data-star-url="' + esc(url || "") + '" data-star-origin="' + esc(origin || "MANUAL SEARCH") + '">Send to STAR</button>';
    }
    function footer() {
      return "<div class=\"search-workspace-footer\"><div id=\"global-search-save-status\" class=\"api-meta\" aria-live=\"polite\"></div>" +
        "<div class=\"search-freshness\">UNVERIFIED where applicable — saved knowledge and web results are not automatically verified truth. News is not automatically verified truth.</div>" +
        "<div class=\"search-angel\">Web security: NOT CONNECTED — no live scanner in this build</div>" +
        "<div><button class=\"btn btn-ghost btn-sm\" type=\"button\" id=\"global-search-history-btn\">History</button> " +
        "<button class=\"btn btn-ghost btn-sm\" type=\"button\" id=\"global-search-close\">Close results</button> " +
        "<a href=\"#/web\" class=\"btn btn-ghost btn-sm\" data-hide=\"1\">Open Web window</a></div></div>";
    }
    // Full-web fallback: the cockpit's own sources are Wikipedia, Hacker
    // News, crypto, GitHub, and saved knowledge — they are NOT a general
    // search engine, so a general query can legitimately return nothing
    // here. These plain links hand the same query to real search engines
    // in the phone's default browser, which is how a browser search box
    // behaves. No fetch, no key, nothing blocked by the page can stop a link.
    // Phase 1: the default Web provider (registry, persisted) comes
    // first; the other providers follow. URLs come from the registry's
    // buildSearchUrl (template + encoding only), never from a guess.
    function engineLinks(query) {
      var providers = webProviders();
      var def = lastProvider || defaultWebProvider();
      var ordered = providers.slice().sort(function (a, b) {
        if (a.providerId === def) return -1;
        if (b.providerId === def) return 1;
        return 0;
      });
      var links = ordered.map(function (p) {
        var url = buildWebSearchUrl(p.providerId, query);
        if (!url) return "";
        return "<li><a href=\"" + esc(url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">Search " + esc(p.displayName || p.providerId) + " for “" + esc(query) + "”</a></li>";
      }).join("");
      if (/\b(youtube|video|videos)\b/i.test(query)) {
        var terms = query.replace(/\b(give me|show me|find|youtube|videos?)\b/gi, "").trim() || query;
        links += "<li><a href=\"https://www.youtube.com/results?search_query=" + encodeURIComponent(terms) + "\" target=\"_blank\" rel=\"noopener noreferrer\">Search YouTube for “" + esc(terms) + "”</a></li>";
      }
      return "<h3>More on the web (full search) <span class=\"search-origin\">ORIGIN: WEB SEARCH</span></h3><ul class=\"price-offer-list\">" + links + "</ul>";
    }
    // ---- Phase 1 workspace chrome -------------------------------------
    // The tab strip lives INSIDE the results overlay, never as a
    // permanent page element: closing the panel leaves the current
    // screen intact. When the SearchTabs module is absent, a single
    // static tab chip is rendered so the workspace still reads as one.
    // Coordinator assembly fix: the real SearchTabs module identifies
    // tabs by `tabId` (frozen contract); Worker 3's harness stub used
    // `id`. Accept either, preferring tabId, so both shapes work.
    function tabIdOf(t) {
      if (!t) return null;
      return t.tabId || t.id || null;
    }
    function tabStripHtml(query, source) {
      var strip = "<div class=\"search-tab-strip\" role=\"tablist\" aria-label=\"Search tabs\">";
      var tabs = null;
      if (global.SearchTabs && typeof global.SearchTabs.listTabs === "function") {
        try { tabs = global.SearchTabs.listTabs(currentSessionId); } catch (e) { tabs = null; }
      }
      if (tabs && tabs.length) {
        tabs.forEach(function (t) {
          var tid = tabIdOf(t);
          var active = activeTabId && tid === activeTabId;
          strip += '<button type="button" role="tab" class="search-tab' + (active ? " active" : "") + '"' +
            ' data-tab-action="activate" data-tab-id="' + esc(tid) + '">' + esc(t.title || t.query || query) +
            (t.pinned ? " 📌" : "") +
            ' <span class="search-tab-close" data-tab-action="close" data-tab-id="' + esc(tid) + '" aria-label="Close tab">×</span></button>';
        });
      } else {
        strip += '<button type="button" role="tab" class="search-tab active">' + esc(query) + "</button>";
      }
      strip += '<button type="button" class="search-tab-new" data-tab-action="new" aria-label="New search tab">+</button>';
      strip += '<button type="button" class="search-tab-menu-btn" data-tab-action="menu" aria-label="Tab actions">Tabs ▾</button>';
      strip += "</div>";
      strip += '<div id="global-search-tabs-menu" class="search-tabs-menu hidden">' +
        '<button type="button" data-tab-action="duplicate">Duplicate</button>' +
        '<button type="button" data-tab-action="pin">Pin / unpin</button>' +
        '<button type="button" data-tab-action="rename">Rename</button>' +
        '<button type="button" data-tab-action="move-left">Move left</button>' +
        '<button type="button" data-tab-action="move-right">Move right</button>' +
        '<button type="button" data-tab-action="close-others">Close others</button>' +
        '<button type="button" data-tab-action="restore">Restore recently closed</button></div>';
      return strip;
    }
    function workspaceHeader(query, source, providerName) {
      return "<div class=\"search-workspace-header\"><div class=\"search-query-header\">Query: “" + esc(query) +
        "” · Source: " + esc(source) + (providerName ? " · Provider: " + esc(providerName) : "") +
        ' · <span class="search-origin">ORIGIN: MANUAL SEARCH</span></div></div>';
    }
    function finish(html) {
      var wrapped = workspaceHeader(lastQuery, lastSource, lastProvider) + tabStripHtml(lastQuery, lastSource) + html;
      show(wrapped + footer());
      var close = document.getElementById("global-search-close");
      if (close) close.addEventListener("click", hide);
      var histBtn = document.getElementById("global-search-history-btn");
      if (histBtn) histBtn.addEventListener("click", function () { showHistoryPanel(); });
      var plainBtn = document.getElementById("global-search-plain-text");
      if (plainBtn) plainBtn.addEventListener("click", function () { plainTextOverride = true; run(); });
      var copyBtn = document.getElementById("global-search-copy-onion");
      if (copyBtn) copyBtn.addEventListener("click", copyOnionAddress);
      var saveOnionBtn = document.getElementById("global-search-save-onion");
      if (saveOnionBtn) saveOnionBtn.addEventListener("click", saveOnionReference);
      results.querySelectorAll("[data-hide]").forEach(function (el) { el.addEventListener("click", hide); });
    }

    // ---- Phase 1 helpers (inside init: they own the bar + panel) -----
    function selectedSourceId() { return select ? String(select.value || "auto") : "auto"; }
    function updateSourceChip() {
      if (!stateChip) return;
      var st = sourceStateFor(selectedSourceId());
      stateChip.textContent = st;
      stateChip.setAttribute("data-state", st);
    }
    function populateWebProviders() {
      if (!webProviderSelect) return;
      var list = webProviders();
      webProviderSelect.innerHTML = list.map(function (p) {
        return '<option value="' + esc(p.providerId) + '"' + (p.providerId === lastProvider ? " selected" : "") + ">" + esc(p.displayName || p.providerId) + "</option>";
      }).join("");
    }
    function toggleWebProvider() {
      if (!webProviderSelect) return;
      var showIt = selectedSourceId() === "web" || selectedSourceId() === "auto";
      if (webProviderSelect.classList) {
        if (showIt) webProviderSelect.classList.remove("hidden");
        else webProviderSelect.classList.add("hidden");
      }
    }
    // Mobile (≤640px) compact source menu: the select is hidden there
    // and this button + menu replace it, listing the sources with
    // their truthful state. No dead controls: every item picks a source.
    function renderSourceMenu() {
      if (!sourceMenu) return;
      var sources = [["auto", "Auto (bot picks)"], ["app", "This app"], ["web", "Web"],
        ["crypto", "Crypto"], ["github", "GitHub"], ["news", "News"],
        ["knowledge", "Saved knowledge"], ["encyclopedia", "Encyclopedia"], ["page", "Page (URL)"]];
      sourceMenu.innerHTML = sources.map(function (s) {
        return '<button type="button" data-source-pick="' + s[0] + '">' + esc(s[1]) + " — " + esc(sourceStateFor(s[0])) + "</button>";
      }).join("");
    }
    function currentSessionTemporary() {
      if (!currentSessionId || !global.SearchTabs || typeof global.SearchTabs.getSession !== "function") return false;
      try {
        var s = global.SearchTabs.getSession(currentSessionId);
        return !!(s && (s.temporary === true || s.isTemporary === true));
      } catch (e) { return false; }
    }
    function openTabForSearch(query, source) {
      if (!global.SearchTabs) return;
      try {
        if (typeof global.SearchTabs.getActiveTab === "function" && typeof global.SearchTabs.updateTab === "function") {
          var active = global.SearchTabs.getActiveTab();
          if (active && tabIdOf(active)) {
            activeTabId = tabIdOf(active);
            global.SearchTabs.updateTab(tabIdOf(active), { query: query, source: source, title: query });
            return;
          }
        }
        if (typeof global.SearchTabs.newTab === "function") {
          var t = global.SearchTabs.newTab({ query: query, source: source, sessionId: currentSessionId, title: query });
          if (t && tabIdOf(t)) activeTabId = tabIdOf(t);
          else if (typeof t === "string") activeTabId = t;
          else if (typeof global.SearchTabs.getActiveTab === "function") {
            var a2 = global.SearchTabs.getActiveTab();
            if (a2 && tabIdOf(a2)) activeTabId = tabIdOf(a2);
          }
        }
      } catch (e) {}
    }
    function recordSearchHistory(query, source) {
      if (!global.SearchHistory || typeof global.SearchHistory.record !== "function") return;
      try {
        global.SearchHistory.record({ query: query, source: source, origin: "MANUAL SEARCH",
          sessionId: currentSessionId, temporary: currentSessionTemporary() });
      } catch (e) {}
    }
    function setSaveStatus(text) {
      var el = document.getElementById("global-search-save-status");
      if (el) el.textContent = text;
    }
    // Onion COPY: clipboard when available, else select the address
    // text so the user can copy it by hand. Never a fetch, never a
    // provider call — the address only ever leaves via the clipboard.
    function copyOnionAddress() {
      var addrEl = document.getElementById("global-search-onion-address");
      var addr = addrEl ? (addrEl.textContent || "") : "";
      if (!addr) return;
      var done = function () { setSaveStatus("Onion address copied — paste it into Tor Browser yourself. This page did not fetch it."); };
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          var p = navigator.clipboard.writeText(addr);
          if (p && typeof p.then === "function") { p.then(done, function () { setSaveStatus("Copy failed — select the address text and copy it by hand."); }); return; }
          done(); return;
        }
      } catch (e) {}
      try { if (addrEl && typeof addrEl.select === "function") addrEl.select(); } catch (e2) {}
      setSaveStatus("Clipboard is unavailable here — the address text is selected; copy it by hand and paste it into Tor Browser.");
    }
    function saveOnionReference() {
      var addrEl = document.getElementById("global-search-onion-address");
      var addr = addrEl ? (addrEl.textContent || "") : "";
      if (!addr) { setSaveStatus("No onion address to save."); return; }
      var res = saveResult({ title: addr, url: addr, text: "Onion service reference saved from manual search. Not fetched, not verified.",
        source: "onion-reference", verificationStatus: "UNVERIFIED" });
      noteSave(res);
      if (res.ok) setSaveStatus("Saved as UNVERIFIED reference. " + (res.cite || ""));
      else setSaveStatus("Not saved: " + res.errors.join(" "));
    }
    // History panel: list + Run again, save-history toggle, temporary
    // session toggle, Clear session, Clear all, Export (explicit
    // download of the JSON, user action only — never automatic).
    function showHistoryPanel() {
      var entries = [];
      var enabled = true;
      if (global.SearchHistory) {
        try { enabled = typeof global.SearchHistory.isEnabled === "function" ? global.SearchHistory.isEnabled() : true; } catch (e) {}
        try { entries = typeof global.SearchHistory.list === "function" ? (global.SearchHistory.list() || []) : []; } catch (e) { entries = []; }
      }
      var tempNote = "";
      if (global.SearchTabs && typeof global.SearchTabs.temporaryNote === "function") {
        try { tempNote = global.SearchTabs.temporaryNote() || ""; } catch (e) {}
      }
      var body = "<h3>Search history</h3>" +
        '<div class="api-meta">Save history: ' + (enabled ? "ON" : "OFF") +
        ' · Session: ' + (currentSessionTemporary() ? "MTI6 TEMPORARY SESSION" : "default") +
        (tempNote ? " — " + esc(tempNote) : "") + "</div>";
      if (!entries.length) body += '<div class="api-meta">No search history recorded.</div>';
      else body += '<ul class="price-offer-list">' + entries.slice(0, 20).map(function (en) {
        return "<li>“" + esc(en.query || "") + "” · " + esc(en.source || "") +
          ' <button type="button" class="btn btn-ghost btn-sm" data-history-action="run-again" data-history-query="' + esc(en.query || "") + '">Run again</button></li>';
      }).join("") + "</ul>";
      body += '<div class="search-history-actions">' +
        '<button type="button" class="btn btn-ghost btn-sm" data-history-action="toggle-save">Save history: ' + (enabled ? "ON — turn off" : "OFF — turn on") + "</button> " +
        '<button type="button" class="btn btn-ghost btn-sm" data-history-action="toggle-temp">Temporary session</button> ' +
        '<button type="button" class="btn btn-ghost btn-sm" data-history-action="clear-session">Clear session</button> ' +
        '<button type="button" class="btn btn-ghost btn-sm" data-history-action="clear-all">Clear all</button> ' +
        '<button type="button" class="btn btn-ghost btn-sm" data-history-action="export">Export</button></div>';
      finish(body);
    }
    function doHistoryAction(action, target) {
      var H = global.SearchHistory, T = global.SearchTabs;
      if (action === "run-again") {
        var q = target.getAttribute ? target.getAttribute("data-history-query") : "";
        if (q) { input.value = q; plainTextOverride = true; run(); }
        return;
      }
      if (action === "toggle-save" && H && typeof H.setEnabled === "function") {
        try { H.setEnabled(!H.isEnabled()); } catch (e) {}
        showHistoryPanel(); return;
      }
      if (action === "toggle-temp" && T) {
        try {
          if (currentSessionTemporary()) {
            if (typeof T.setTemporary === "function") T.setTemporary(currentSessionId, false);
            currentSessionId = null;
          } else {
            var s = null;
            if (typeof T.createSession === "function") s = T.createSession("MTI6 TEMPORARY SESSION", { temporary: true });
            if (s && (s.sessionId || s.id)) currentSessionId = s.sessionId || s.id;
            else if (typeof s === "string") currentSessionId = s;
            if (typeof T.setTemporary === "function" && currentSessionId) T.setTemporary(currentSessionId, true);
          }
        } catch (e) {}
        showHistoryPanel(); return;
      }
      if (action === "clear-session" && H && typeof H.clearSession === "function") {
        try { H.clearSession(currentSessionId); } catch (e) {}
        showHistoryPanel(); return;
      }
      if (action === "clear-all" && H && typeof H.clearAll === "function") {
        try { H.clearAll(); } catch (e) {}
        showHistoryPanel(); return;
      }
      if (action === "export" && H && typeof H.exportJson === "function") {
        var json = "";
        try { json = H.exportJson(); } catch (e) { json = "[]"; }
        noteExport(json);
        try {
          if (typeof Blob !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL) {
            var blob = new Blob([json], { type: "application/json" });
            var a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "mti6-search-history.json";
            if (document.body && document.body.appendChild) document.body.appendChild(a);
            if (typeof a.click === "function") a.click();
            if (a.remove) a.remove();
          }
        } catch (e) {}
        setSaveStatus("History exported as JSON (explicit download).");
        return;
      }
    }
    function doTabAction(action, target) {
      var T = global.SearchTabs;
      if (!T) return;
      // Sync the module's active-tab pointer from the tab module first:
      // tab operations (e.g. duplicate) can move the active tab without
      // this closure knowing, and a stale pointer would pin/rename the
      // wrong tab.
      try {
        var ga = typeof T.getActiveTab === "function" ? T.getActiveTab() : null;
        if (ga && tabIdOf(ga)) activeTabId = tabIdOf(ga);
      } catch (e) {}
      var id = target.getAttribute ? target.getAttribute("data-tab-id") : null;
      try {
        if (action === "new") {
          if (typeof T.newTab === "function") {
            var nt = T.newTab({ query: "", source: selectedSourceId(), sessionId: currentSessionId, title: "New search" });
            if (nt && tabIdOf(nt)) activeTabId = tabIdOf(nt);
          }
          input.value = ""; input.focus(); finish(workspaceHeader("", selectedSourceId(), lastProvider) + tabStripHtml("", selectedSourceId()) + '<div class="api-meta">New tab — type a search above.</div>');
          return;
        }
        if (action === "menu") {
          var menu = document.getElementById("global-search-tabs-menu");
          if (menu && menu.classList) menu.classList.toggle("hidden");
          return;
        }
        if (action === "activate" && id && typeof T.activateTab === "function") {
          T.activateTab(id); activeTabId = id;
          var tab = typeof T.getTab === "function" ? T.getTab(id) : null;
          if (tab && tab.query) { input.value = tab.query; plainTextOverride = true; run(); }
          return;
        }
        if (action === "close" && id && typeof T.closeTab === "function") { T.closeTab(id); finish(tabStripHtml(lastQuery, lastSource) + '<div class="api-meta">Tab closed.</div>'); return; }
        if (action === "duplicate" && activeTabId && typeof T.duplicateTab === "function") { T.duplicateTab(activeTabId); finish(tabStripHtml(lastQuery, lastSource) + '<div class="api-meta">Tab duplicated.</div>'); return; }
        if (action === "pin" && activeTabId && typeof T.pinTab === "function") {
          var cur = typeof T.getTab === "function" ? T.getTab(activeTabId) : null;
          T.pinTab(activeTabId, !(cur && cur.pinned)); finish(tabStripHtml(lastQuery, lastSource) + '<div class="api-meta">Tab pin toggled.</div>'); return;
        }
        if (action === "rename" && activeTabId && typeof T.renameTab === "function") {
          var name = (typeof prompt === "function") ? prompt("Rename tab:", "") : null;
          if (name) { T.renameTab(activeTabId, name); finish(tabStripHtml(lastQuery, lastSource) + '<div class="api-meta">Tab renamed.</div>'); }
          return;
        }
        if ((action === "move-left" || action === "move-right") && activeTabId && typeof T.moveTab === "function") {
          T.moveTab(activeTabId, action === "move-left" ? -1 : 1); finish(tabStripHtml(lastQuery, lastSource) + '<div class="api-meta">Tab moved.</div>'); return;
        }
        if (action === "close-others" && activeTabId && typeof T.closeOthers === "function") {
          T.closeOthers(activeTabId); finish(tabStripHtml(lastQuery, lastSource) + '<div class="api-meta">Other tabs closed.</div>'); return;
        }
        if (action === "restore" && typeof T.listClosed === "function" && typeof T.restoreClosed === "function") {
          var closed = T.listClosed() || [];
          if (closed.length) T.restoreClosed(tabIdOf(closed[0]));
          finish(tabStripHtml(lastQuery, lastSource) + '<div class="api-meta">' + (closed.length ? "Tab restored." : "Nothing recently closed.") + "</div>");
          return;
        }
      } catch (e) {}
    }
    // One delegated click handler on the results overlay for every
    // Phase 1 control rendered as HTML (Save / Send to STAR / tabs /
    // history / source picks). Wired once here, never per-render, so
    // re-rendering the panel cannot stack listeners.
    function attrOf(el, name) {
      if (!el) return null;
      if (typeof el.getAttribute === "function") {
        try { var v = el.getAttribute(name); if (v !== null && v !== undefined) return v; } catch (e) {}
      }
      if (el.dataset) return el.dataset[name.replace(/^data-/, "").replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); })] || null;
      return null;
    }
    function resultsClick(ev) {
      var t = ev && ev.target ? ev.target : null;
      if (!t) return;
      var guard = 0;
      while (t && guard++ < 4) {
        var saveTitle = attrOf(t, "data-save-title");
        if (saveTitle !== null && saveTitle !== undefined) {
          var res = saveResult({ title: saveTitle, url: attrOf(t, "data-save-url") || "",
            text: attrOf(t, "data-save-text") || "", source: attrOf(t, "data-save-origin") || "manual-search" });
          noteSave(res);
          setSaveStatus(res.ok ? "Saved to Knowledge — UNVERIFIED. " + (res.cite || "") : "Not saved: " + res.errors.join(" "));
          return;
        }
        var starTitle = attrOf(t, "data-star-title");
        if (starTitle !== null && starTitle !== undefined) {
          noteStar(sendToStar(starTitle, attrOf(t, "data-star-url") || "", attrOf(t, "data-star-origin") || "MANUAL SEARCH"));
          setSaveStatus("Sent to STAR as a reference — you still send it yourself in STAR.");
          return;
        }
        var tabAction = attrOf(t, "data-tab-action");
        if (tabAction) { doTabAction(tabAction, t); return; }
        var histAction = attrOf(t, "data-history-action");
        if (histAction) { doHistoryAction(histAction, t); return; }
        var sourcePick = attrOf(t, "data-source-pick");
        if (sourcePick) {
          if (select) select.value = sourcePick;
          updateSourceChip(); toggleWebProvider();
          if (sourceMenu && sourceMenu.classList) sourceMenu.classList.add("hidden");
          input.focus();
          return;
        }
        t = t.parentNode || null;
      }
    }
    if (results && typeof results.addEventListener === "function") results.addEventListener("click", resultsClick);
    if (select) select.addEventListener("change", function () { updateSourceChip(); toggleWebProvider(); });
    if (webProviderSelect) webProviderSelect.addEventListener("change", function () {
      lastProvider = webProviderSelect.value || lastProvider;
      if (global.SearchProviders && typeof global.SearchProviders.setDefaultWebProvider === "function") {
        try { global.SearchProviders.setDefaultWebProvider(lastProvider); } catch (e) {}
      }
    });
    if (newTabBtn) newTabBtn.addEventListener("click", function () {
      doTabAction("new", newTabBtn);
      try { input.focus(); } catch (e) {}
    });
    if (barStarBtn) barStarBtn.addEventListener("click", function () {
      if (global.StarOverlay && typeof global.StarOverlay.open === "function") {
        try { global.StarOverlay.open(); } catch (e) {}
      }
    });
    if (sourceBtn) sourceBtn.addEventListener("click", function () {
      renderSourceMenu();
      if (sourceMenu && sourceMenu.classList) sourceMenu.classList.toggle("hidden");
    });
    populateWebProviders();
    updateSourceChip();
    toggleWebProvider();
    renderSourceMenu();

    function run() {
      var raw = input.value.trim();
      if (!raw) { hide(); return; }
      // §45: an optional leading prefix overrides the source select
      // (the select stays the default). Blocked prefixes never execute.
      var parsed = parsePrefix(raw);
      if (parsed.blocked) {
        lastQuery = raw; lastSource = "auto";
        finish('<div class="api-meta">' + esc(parsed.reason) + "</div>");
        return;
      }
      var query = parsed.query || raw;
      if (!query) { hide(); return; }
      // §9/§10/§33/§34 URL handling, before any search mode runs.
      var cls = classifyInput(query);
      if (cls.kind === "onion") {
        lastQuery = query; lastSource = "page";
        openTabForSearch(ONION_LABEL, "page");
        finish("<h3>" + esc(ONION_LABEL) + "</h3><div class=\"api-meta\">" + esc(TOR_REQUIRED) +
          " — this address was NOT fetched and was NOT sent to any search provider. Open it in Tor Browser yourself.</div>" +
          '<div class="api-meta">Address: <span id="global-search-onion-address">' + esc(query) + "</span></div>" +
          '<div><button type="button" class="btn btn-ghost btn-sm" id="global-search-copy-onion">COPY ADDRESS</button> ' +
          '<button type="button" class="btn btn-ghost btn-sm" id="global-search-save-onion">SAVE AS UNVERIFIED REFERENCE</button></div>');
        return;
      }
      if (cls.kind === "internal-route" || (cls.kind === "deep-link" && cls.route)) {
        try { location.hash = "#/" + cls.route + (cls.param ? "/" + cls.param : ""); } catch (e) {}
        hide();
        return;
      }
      if (cls.kind === "deep-link" || cls.kind === "unknown-scheme") {
        lastQuery = query; lastSource = "auto";
        finish('<div class="api-meta">Cannot open this ' + (cls.kind === "deep-link" ? "deep link" : "scheme") +
          " — \u201C" + esc(cls.scheme || cls.label || query) + "\u201D names no known MTI6 screen. Nothing was launched.</div>");
        return;
      }
      if (cls.kind === "https" || cls.kind === "http") {
        lastQuery = query; lastSource = "page";
        openTabForSearch(query, "page");
        recordSearchHistory(query, "page");
        var headUrl = "<div class=\"api-meta\">URL — open it externally below. Search never injects anything into the URL; it is used exactly as pasted.</div>";
        if (!global.KnowledgeScout || typeof global.KnowledgeScout.scrapePublicPage !== "function") {
          finish(headUrl + '<ul class="price-offer-list"><li><a href="' + esc(query) + '" target="_blank" rel="noopener noreferrer">Open externally</a></li></ul>');
          return;
        }
        show(headUrl + '<div class="api-meta">Reading public page text…</div>');
        global.KnowledgeScout.scrapePublicPage(query).then(function (r) {
          if (r.status !== "live") {
            finish(headUrl + "<div class=\"api-meta\">" + esc(r.note) + "</div><ul class=\"price-offer-list\"><li><a href=\"" + esc(query) + "\" target=\"_blank\" rel=\"noopener noreferrer\">Open externally</a></li></ul>");
            return;
          }
          finish(headUrl + "<h3>" + esc(r.title || r.url) + ' <span class="search-origin">ORIGIN: WEB SEARCH</span></h3><div class="web-text">' + esc(r.text.slice(0, 1500)) + "</div><ul class=\"price-offer-list\"><li><a href=\"" + esc(r.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">Open externally</a></li></ul>");
        });
        return;
      }
      var picked = pickSource(query, parsed.source || (select ? select.value : "auto"));
      var lower = query.toLowerCase();
      lastQuery = query; lastSource = picked.mode;
      // §4/§47 AUTO fail-closed: only when the bar is in AUTO (the
      // bot-picked "all" mode). A source the user picked explicitly is
      // their choice, and a plain-text retry bypasses this gate by
      // design — the words are then searched as text, never executed.
      if (!plainTextOverride && picked.mode === "all" && isFinancialAction(query)) {
        finish('<div class="api-meta">That reads as a financial action, not a search. Search never executes financial actions. You can search it as plain text instead.</div>' +
          '<div><button type="button" class="btn btn-ghost btn-sm" id="global-search-plain-text">Search as plain text</button></div>');
        return;
      }
      // Ambiguous non-financial command in AUTO: do not guess — show
      // the source options instead of executing or searching blindly.
      if (!plainTextOverride && picked.mode === "all" && global.StarCommand && typeof global.StarCommand.classify === "function") {
        var amb = null;
        try { amb = global.StarCommand.classify(query); } catch (e) { amb = null; }
        if (amb && amb.intent === "APPROVAL_REQUIRED" && amb.permission !== "TRANSACTIONAL") {
          finish('<div class="api-meta">That reads as a command, not a search — nothing was executed. Pick a source to search it as text instead, then press Search.</div>' +
            '<div><button type="button" class="btn btn-ghost btn-sm" data-source-pick="app">This app</button> ' +
            '<button type="button" class="btn btn-ghost btn-sm" data-source-pick="web">Web</button> ' +
            '<button type="button" class="btn btn-ghost btn-sm" data-source-pick="encyclopedia">Encyclopedia</button> ' +
            '<button type="button" class="btn btn-ghost btn-sm" data-source-pick="knowledge">Saved knowledge</button></div>');
          return;
        }
      }
      plainTextOverride = false;
      openTabForSearch(query, picked.mode);
      recordSearchHistory(query, picked.mode);
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
          var href = it.id ? "#/encyclopedia/" + esc(it.id) : "#/encyclopedia";
          return '<li><a href="' + href + '" class="global-result-link" data-hide="1">' + esc(it.title) + '</a> · ' + esc(it.level || "") + ' · ' + esc(it.verificationStatus || "UNVERIFIED") + acts(it.title, href, "ENCYCLOPEDIA", it.title) + '</li>';
        }, { origin: "ENCYCLOPEDIA" });
      }
      // Crypto World section (spec C10): normalized results with kind,
      // parent context, and a real route. The Encyclopedia source is
      // kept as-is; entries already shown here are filtered out of it
      // below so the same record is never listed twice.
      function cryptoSection(items) {
        return section("Crypto World", items, function (it) {
          // Taxonomy results deep-link to the entry; the stored route
          // field stays "#/encyclopedia" (pinned by the search test),
          // so only the rendered href carries the id. Other kinds
          // keep their real screen route.
          var href = it.route;
          if ((it.kind === "major-activity" || it.kind === "type" || it.kind === "strategy") && it.id) {
            href = "#/encyclopedia/" + it.id;
          }
          return '<li><a href="' + esc(href) + '" class="global-result-link" data-hide="1">' + esc(it.title) + '</a> · ' + esc(it.kind) + (it.subtitle ? ' · ' + esc(it.subtitle) : '') + ' · ' + esc(it.verificationStatus || "UNKNOWN") + acts(it.title, href, "ENCYCLOPEDIA", it.subtitle || it.title) + '</li>';
        }, { origin: "ENCYCLOPEDIA" });
      }
      function dedupeEnc(items, cryptoItems) {
        var seen = {};
        (cryptoItems || []).forEach(function (c) { seen[c.id] = true; });
        return (items || []).filter(function (it) { return !seen[it.id]; });
      }

      if (picked.mode === "app") {
        searchAppData(query, lower).then(function (items) {
          finish(head + section("In this app", items, function (it) {
            return '<li><a href="#/' + it.route + '" class="global-result-link" data-hide="1">' + esc(it.title) + '</a> · ' + esc(it.kind) + acts(it.title, "#/" + it.route, "MANUAL SEARCH", it.title) + '</li>';
          }, { origin: "MANUAL SEARCH" }) || head + "<div class=\"api-meta\">Nothing found in the app for “" + esc(query) + "”.</div>");
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
            return "<li>" + esc(it.label) + (it.actor ? " · " + esc(it.actor) : "") + acts(it.label, "", "API SEARCH", it.label) + "</li>";
          }, { origin: "API SEARCH", external: true }));
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
            return "<li><a href=\"" + esc(it.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + esc(it.title) + "</a>" + acts(it.title, it.url, "API SEARCH", it.title) + "</li>";
          }, { origin: "API SEARCH", external: true }));
        });
        return;
      }
      if (picked.mode === "knowledge") {
        var hits = [];
        try { hits = global.KnowledgeScout ? global.KnowledgeScout.searchKnowledge(query) : []; } catch (e) { hits = []; }
        finish(head + section("Saved bot knowledge", hits, function (e) {
          return "<li>“" + esc(e.topic) + "” · " + esc(e.source) + " · saved " + esc(String(e.fetchedAt || "").slice(0, 10)) + acts(e.topic, e.url || "", "SAVED KNOWLEDGE", e.text || "") + "</li>";
        }, { origin: "SAVED KNOWLEDGE" }) || head + "<div class=\"api-meta\">No saved bot knowledge matched. Scrape and save a page on this topic in the Scouts panel first.</div>");
        return;
      }
      if (picked.mode === "encyclopedia") {
        Promise.all([encyclopediaItems(query), searchCryptoWorld(query)]).then(function (parts) {
          var items = parts[0];
          var cryptoItems = parts[1] || [];
          if (items === null) { finish(head + "<div class=\"api-meta\">Encyclopedia data did not load.</div>"); return; }
          var body = cryptoSection(cryptoItems) + encyclopediaSection(dedupeEnc(items, cryptoItems));
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
            return "<li><a href=\"" + esc(w.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + esc(w.title) + "</a> — " + esc(w.snippet) + acts(w.title, w.url, "API SEARCH", w.snippet) + "</li>";
          }, { origin: "API SEARCH", external: true }) + section("Hacker News", web.hn, function (h) {
            return "<li><a href=\"" + esc(h.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + esc(h.title) + "</a>" + acts(h.title, h.url, "API SEARCH", h.title) + "</li>";
          }, { origin: "API SEARCH", external: true }) + engineLinks(query));
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
      var cryptoP = searchCryptoWorld(query);
      Promise.all([appP, webP, priceP, encP, cryptoP]).then(function (parts) {
        var appItems = parts[0], web = parts[1], price = parts[2], encItems = parts[3], cryptoItems = parts[4] || [];
        var html = head;
        html += section("In this app", appItems, function (it) {
          return '<li><a href="#/' + it.route + '" class="global-result-link" data-hide="1">' + esc(it.title) + '</a> · ' + esc(it.kind) + acts(it.title, "#/" + it.route, "MANUAL SEARCH", it.title) + '</li>';
        }, { origin: "MANUAL SEARCH" });
        if (price && price.price !== null) {
          html += "<h3>Crypto price</h3><ul class=\"price-offer-list\"><li>" + esc(price.name || price.symbol) + ": $" + Number(price.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " · " + esc(price.status) + " from " + esc(price.source || "—") + "</li></ul>";
        }
        html += section("Saved bot knowledge", know, function (e) {
          return "<li>“" + esc(e.topic) + "” · " + esc(e.source) + " · saved " + esc(String(e.fetchedAt || "").slice(0, 10)) + acts(e.topic, e.url || "", "SAVED KNOWLEDGE", e.text || "") + "</li>";
        }, { origin: "SAVED KNOWLEDGE" });
        html += section("Wikipedia", web.wiki, function (w) {
          return "<li><a href=\"" + esc(w.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + esc(w.title) + "</a> — " + esc(w.snippet) + acts(w.title, w.url, "API SEARCH", w.snippet) + "</li>";
        }, { origin: "API SEARCH", external: true });
        html += section("Hacker News", web.hn, function (h) {
          return "<li><a href=\"" + esc(h.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + esc(h.title) + "</a>" + acts(h.title, h.url, "API SEARCH", h.title) + "</li>";
        }, { origin: "API SEARCH", external: true });
        if (encItems && encItems.length) html += encyclopediaSection(dedupeEnc(encItems, cryptoItems));
        if (cryptoItems.length) html += cryptoSection(cryptoItems);
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
    // Stage 2 fix-up (Nov 14, 2026, Defect 1): the results panel must
    // close on route change. Result links and the footer link hide it
    // via [data-hide], but sidebar / quick-nav / STAR navigation changes
    // the hash without touching the panel, so it used to persist across
    // navigation until the page was reloaded. This listener closes it on
    // every hashchange. It lives here (the panel's owner) — the router in
    // app.js is not touched.
    window.addEventListener("hashchange", hide);
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

  global.GlobalSearch = { isUrl: isUrl, isYouTube: isYouTube, stripTags: stripTags, pickSource: pickSource, searchCryptoWorld: searchCryptoWorld, CRYPTO_SEARCH_MAX_PER_SOURCE: CRYPTO_SEARCH_MAX_PER_SOURCE, CRYPTO_SEARCH_MAX_TOTAL: CRYPTO_SEARCH_MAX_TOTAL,
    // UNIVERSAL SEARCH — PHASE 1 exports (manual search only).
    parsePrefix: parsePrefix, classifyInput: classifyInput, isFinancialAction: isFinancialAction,
    walletWarningFor: walletWarningFor, sourceStateFor: sourceStateFor,
    webProviders: webProviders, defaultWebProvider: defaultWebProvider, buildWebSearchUrl: buildWebSearchUrl,
    saveResult: saveResult, sendToStar: sendToStar,
    ONION_LABEL: ONION_LABEL, TOR_REQUIRED: TOR_REQUIRED,
    lastSaveResult: null, lastStarSend: null, lastExportJson: null };
})(window);
