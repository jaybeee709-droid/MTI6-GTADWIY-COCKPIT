/* MTI6-GTADWIY-COCKPIT — GitHub read-only dev layer (V1)
 * Read-only reads of PUBLIC GitHub repo data, no sign-in, no token,
 * no Authorization header, and no writes of any kind. This layer can
 * never merge, comment, create, or change anything on GitHub — it only
 * reports what the public API already shows, for the Development
 * Center panel. Unauthenticated GitHub reads share a 60/hour limit,
 * so results are cached (15 minutes, matching the github-public
 * registry entry) and every call is counted in ApiRegistry usage.
 * Private repos are reported honestly as needing sign-in, never
 * worked around.
 */
(function (global) {
  "use strict";
  var CACHE_KEY = "mti6_github_dev_v1";
  var TTL_MS = 15 * 60 * 1000;
  var TIMEOUT_MS = 10000;
  var API = "https://api.github.com";

  function record(ok, status) {
    try {
      if (global.ApiRegistry && typeof global.ApiRegistry.record === "function") {
        global.ApiRegistry.record("github-public", ok, status);
      }
    } catch (e) {}
  }

  function fetchJson(url) {
    var controller = null, signal = undefined;
    try {
      if (typeof AbortController !== "undefined") {
        controller = new AbortController();
        signal = controller.signal;
        setTimeout(function () { try { controller.abort(); } catch (e) {} }, TIMEOUT_MS);
      }
    } catch (e) {}
    return global.fetch(url, signal ? { signal: signal } : {}).then(function (res) {
      if (!res.ok) {
        var err = new Error("http_" + res.status);
        err.status = res.status;
        err.resetAt = null;
        try {
          var reset = res.headers && res.headers.get ? res.headers.get("x-ratelimit-reset") : null;
          if (reset) err.resetAt = new Date(parseInt(reset, 10) * 1000).toISOString();
        } catch (e) {}
        throw err;
      }
      return res.json();
    });
  }

  function loadCache() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveCache(cache) {
    try {
      if (global.localStorage) global.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {}
  }

  function cached(key) {
    var cache = loadCache();
    var entry = cache[key];
    if (entry && Date.now() - entry.at < TTL_MS) return entry.data;
    return null;
  }

  function store(key, data) {
    var cache = loadCache();
    cache[key] = { at: Date.now(), data: data };
    saveCache(cache);
  }

  function clean(owner, repo) {
    var o = String(owner || "").trim(), r = String(repo || "").trim();
    if (!o || !r) return null;
    return { owner: o, repo: r, base: API + "/repos/" + encodeURIComponent(o) + "/" + encodeURIComponent(r) };
  }

  function shortSha(sha) { return String(sha || "").slice(0, 7) || "—"; }

  function errorNote(err) {
    if (err && err.status === 404) {
      return "Repo or pull request not found, or it is private — private repos need sign-in and are not read from here.";
    }
    if (err && err.status === 403) {
      return "GitHub refused the read (unauthenticated limit is 60/hour, shared across all GitHub reads on this device)" +
        (err.resetAt ? ". Limit resets around " + err.resetAt + "." : ". Try again later.");
    }
    return "Could not reach the GitHub API for that repo. Check the owner/repo spelling, or try again when you have signal.";
  }

  function getPullRequest(owner, repo, number) {
    var c = clean(owner, repo);
    var n = parseInt(number, 10);
    if (!c || isNaN(n)) return Promise.resolve({ status: "error", note: "Enter a GitHub owner, repo, and pull request number." });
    var key = c.owner + "/" + c.repo + "/pr/" + n;
    var hit = cached(key);
    if (hit) return Promise.resolve(hit);
    return fetchJson(c.base + "/pulls/" + n).then(function (pr) {
      record(true, 200);
      var data = {
        number: pr.number, title: pr.title || "", state: pr.state || "",
        merged: !!pr.merged_at, mergedAt: pr.merged_at || null,
        mergeable: (pr.mergeable === true || pr.mergeable === false) ? pr.mergeable : null,
        headRef: pr.head ? pr.head.ref : "", headSha: pr.head ? pr.head.sha : "",
        baseRef: pr.base ? pr.base.ref : "", baseSha: pr.base ? pr.base.sha : "",
        htmlUrl: pr.html_url || "", updatedAt: pr.updated_at || "", createdAt: pr.created_at || ""
      };
      var out = { status: "live", source: "GitHub API", fetchedAt: new Date().toISOString(), pr: data };
      store(key, out);
      return out;
    }).catch(function (err) {
      record(false, err && err.status ? err.status : null);
      return { status: "error", note: errorNote(err) };
    });
  }

  function getRepo(owner, repo) {
    var c = clean(owner, repo);
    if (!c) return Promise.resolve({ status: "error", note: "Enter a GitHub owner and repo." });
    var key = c.owner + "/" + c.repo + "/repo";
    var hit = cached(key);
    if (hit) return Promise.resolve(hit);
    return fetchJson(c.base).then(function (r) {
      record(true, 200);
      var data = {
        description: r.description || "", defaultBranch: r.default_branch || "",
        pushedAt: r.pushed_at || "", openIssues: r.open_issues_count,
        stars: r.stargazers_count, forks: r.forks_count,
        private: !!r.private, htmlUrl: r.html_url || ""
      };
      var out = { status: "live", source: "GitHub API", fetchedAt: new Date().toISOString(), repo: data };
      store(key, out);
      return out;
    }).catch(function (err) {
      record(false, err && err.status ? err.status : null);
      return { status: "error", note: errorNote(err) };
    });
  }

  function getBranches(owner, repo) {
    var c = clean(owner, repo);
    if (!c) return Promise.resolve({ status: "error", note: "Enter a GitHub owner and repo." });
    var key = c.owner + "/" + c.repo + "/branches";
    var hit = cached(key);
    if (hit) return Promise.resolve(hit);
    return fetchJson(c.base + "/branches?per_page=20").then(function (list) {
      record(true, 200);
      var items = (Array.isArray(list) ? list : []).map(function (b) {
        return { name: b.name || "", sha: b.commit ? b.commit.sha : "" };
      });
      var out = { status: "live", source: "GitHub API", fetchedAt: new Date().toISOString(), branches: items };
      store(key, out);
      return out;
    }).catch(function (err) {
      record(false, err && err.status ? err.status : null);
      return { status: "error", note: errorNote(err) };
    });
  }

  function getRepoStatus(owner, repo, number) {
    return Promise.all([getPullRequest(owner, repo, number), getRepo(owner, repo), getBranches(owner, repo)])
      .then(function (parts) {
        var failed = parts.filter(function (p) { return p.status === "error"; });
        if (failed.length === parts.length) return failed[0];
        return {
          status: "live", source: "GitHub API", fetchedAt: new Date().toISOString(),
          pr: parts[0].status === "live" ? parts[0].pr : null,
          prNote: parts[0].status === "error" ? parts[0].note : null,
          repo: parts[1].status === "live" ? parts[1].repo : null,
          repoNote: parts[1].status === "error" ? parts[1].note : null,
          branches: parts[2].status === "live" ? parts[2].branches : [],
          branchesNote: parts[2].status === "error" ? parts[2].note : null
        };
      });
  }

  global.GitHubDev = {
    getPullRequest: getPullRequest, getRepo: getRepo, getBranches: getBranches,
    getRepoStatus: getRepoStatus, shortSha: shortSha, CACHE_KEY: CACHE_KEY
  };
})(window);
