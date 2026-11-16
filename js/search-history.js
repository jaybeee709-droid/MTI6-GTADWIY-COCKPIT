/* MTI6-GTADWIY-COCKPIT — Search history controls (Universal Search Phase 1)
 *
 * Spec §16. Bounded localStorage only, ONE history key. No DOM, no network,
 * no IndexedDB (the database stays v3). The UI worker wires the download
 * for the explicit user Export action; this module only returns the string.
 *
 * Keys used (and no others):
 *   mti6_search_history_v1          — the entries (newest first, max 100)
 *   mti6_search_history_enabled_v1  — the on/off flag, default true
 *
 * PRIVACY — what is stored and what is never stored:
 *   - Stored per entry, ONLY: {query, source, origin, at (ISO), sessionId}.
 *   - NEVER stored: credentials, private form data, URLs with query
 *     strings that could carry tokens, or full page text. A query that
 *     itself looks like a credential (contains "password", "api_key",
 *     "secret", "seed phrase" or "private key", case-insensitive) is
 *     NOT recorded at all. A query that is a URL is stored with its
 *     query string stripped (everything from the first "?" onward).
 *   - NOTHING is recorded when history is disabled, when the entry is
 *     marked temporary, or when the entry's session is temporary
 *     (checked via global.SearchTabs.getSession when available).
 *   - A temporary session keeps no search history in MTI6. It is not
 *     Tor Browser and not private/incognito mode — the browser and
 *     network still see ordinary traffic. (See SearchTabs.temporaryNote.)
 *
 * Failure contract: never throws. localStorage may be unavailable
 * (private mode, disabled storage) — an in-memory fallback keeps the
 * flag and the entries for the session, and every function still works.
 *
 * API — exposed on global.SearchHistory (do not rename):
 *   Constants: HISTORY_KEY, MAX_ENTRIES (100).
 *   isEnabled(), setEnabled(bool), record(entry), list(),
 *   clearSession(sessionId), clearAll(), exportJson(), resetForTest().
 *   record() returns {recorded:true} or {recorded:false, reason}.
 */
(function (global) {
  "use strict";

  var HISTORY_KEY = "mti6_search_history_v1";
  var ENABLED_KEY = "mti6_search_history_enabled_v1";
  var MAX_ENTRIES = 100;
  var MAX_QUERY_LENGTH = 500;
  var SENSITIVE_PATTERNS = ["password", "api_key", "secret", "seed phrase", "private key"];

  var fallbackEnabled = true;
  var fallbackEntries = [];

  function storageAvailable() {
    try {
      return typeof global.localStorage !== "undefined" && global.localStorage !== null &&
        typeof global.localStorage.getItem === "function";
    } catch (e) {
      return false;
    }
  }

  function storageGet(key) {
    try {
      if (!storageAvailable()) return null;
      return global.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      if (!storageAvailable()) return false;
      global.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  }

  function storageRemove(key) {
    try {
      if (!storageAvailable()) return;
      global.localStorage.removeItem(key);
    } catch (e) {
      /* Storage unavailable — the in-memory fallback is the source of truth. */
    }
  }

  function readEntries() {
    var raw;
    var parsed;
    if (storageAvailable()) {
      raw = storageGet(HISTORY_KEY);
      if (raw === null || raw === undefined || raw === "") return fallbackEntries.slice();
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        return [];
      }
      if (!parsed || Object.prototype.toString.call(parsed) !== "[object Array]") return [];
      return parsed;
    }
    return fallbackEntries.slice();
  }

  function writeEntries(entries) {
    var bounded = entries.slice(0, MAX_ENTRIES);
    fallbackEntries = bounded.slice();
    if (storageAvailable()) {
      try {
        global.localStorage.setItem(HISTORY_KEY, JSON.stringify(bounded));
      } catch (e) {
        /* Quota or storage failure: the in-memory copy still holds them. */
      }
    }
    return bounded;
  }

  function isEnabled() {
    var raw;
    try {
      if (storageAvailable()) {
        raw = storageGet(ENABLED_KEY);
        if (raw === null || raw === undefined) return fallbackEnabled;
        return raw === "true";
      }
      return fallbackEnabled;
    } catch (e) {
      return fallbackEnabled;
    }
  }

  function setEnabled(value) {
    var flag = value === true;
    fallbackEnabled = flag;
    storageSet(ENABLED_KEY, flag ? "true" : "false");
    return flag;
  }

  function looksSensitive(query) {
    var lower = query.toLowerCase();
    var i;
    for (i = 0; i < SENSITIVE_PATTERNS.length; i += 1) {
      if (lower.indexOf(SENSITIVE_PATTERNS[i]) !== -1) return true;
    }
    return false;
  }

  function isTemporarySession(sessionId) {
    var tabs;
    var session;
    try {
      if (typeof sessionId !== "string" || sessionId === "") return false;
      if (!global.SearchTabs || typeof global.SearchTabs.getSession !== "function") return false;
      tabs = global.SearchTabs;
      session = tabs.getSession(sessionId);
      return !!session && session.temporary === true;
    } catch (e) {
      return false;
    }
  }

  /* A pasted URL must never keep a query string that could carry a token. */
  function sanitizeQuery(query) {
    var cleaned = query;
    var schemeAt;
    var queryAt;
    if (cleaned.length > MAX_QUERY_LENGTH) cleaned = cleaned.slice(0, MAX_QUERY_LENGTH);
    schemeAt = cleaned.indexOf("://");
    if (schemeAt !== -1) {
      queryAt = cleaned.indexOf("?", schemeAt);
      if (queryAt !== -1) cleaned = cleaned.slice(0, queryAt);
    }
    return cleaned;
  }

  function record(entry) {
    var query;
    var stored;
    var entries;
    try {
      if (!entry || typeof entry !== "object") {
        return { recorded: false, reason: "not-recorded-invalid" };
      }
      if (!isEnabled()) return { recorded: false, reason: "not-recorded-disabled" };
      if (entry.temporary === true) return { recorded: false, reason: "not-recorded-temporary" };
      if (isTemporarySession(entry.sessionId)) {
        return { recorded: false, reason: "not-recorded-temporary" };
      }
      if (typeof entry.query !== "string" || entry.query.trim() === "") {
        return { recorded: false, reason: "not-recorded-invalid" };
      }
      query = entry.query.trim();
      if (looksSensitive(query)) {
        return { recorded: false, reason: "not-recorded-sensitive" };
      }
      stored = {
        query: sanitizeQuery(query),
        source: typeof entry.source === "string" ? entry.source : "",
        origin: typeof entry.origin === "string" ? entry.origin : "",
        at: new Date().toISOString(),
        sessionId: typeof entry.sessionId === "string" ? entry.sessionId : ""
      };
      entries = readEntries();
      entries.unshift(stored);
      writeEntries(entries);
      return { recorded: true };
    } catch (e) {
      return { recorded: false, reason: "not-recorded-error" };
    }
  }

  function list() {
    try {
      if (!isEnabled()) return [];
      return readEntries().slice();
    } catch (e) {
      return [];
    }
  }

  function clearSession(sessionId) {
    var entries;
    var kept = [];
    var removed = 0;
    var i;
    try {
      if (typeof sessionId !== "string") return 0;
      entries = readEntries();
      for (i = 0; i < entries.length; i += 1) {
        if (entries[i].sessionId === sessionId) removed += 1;
        else kept.push(entries[i]);
      }
      writeEntries(kept);
      return removed;
    } catch (e) {
      return 0;
    }
  }

  function clearAll() {
    try {
      writeEntries([]);
      storageRemove(HISTORY_KEY);
      fallbackEntries = [];
      return true;
    } catch (e) {
      fallbackEntries = [];
      return true;
    }
  }

  function exportJson() {
    try {
      return JSON.stringify(list());
    } catch (e) {
      return "[]";
    }
  }

  function resetForTest() {
    fallbackEnabled = true;
    fallbackEntries = [];
    storageRemove(HISTORY_KEY);
    storageRemove(ENABLED_KEY);
  }

  global.SearchHistory = {
    HISTORY_KEY: HISTORY_KEY,
    MAX_ENTRIES: MAX_ENTRIES,
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    record: record,
    list: list,
    clearSession: clearSession,
    clearAll: clearAll,
    exportJson: exportJson,
    resetForTest: resetForTest
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
