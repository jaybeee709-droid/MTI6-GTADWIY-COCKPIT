/* MTI6-GTADWIY-COCKPIT — Search tabs / sessions foundation (Universal Search Phase 1)
 *
 * Spec §12, §14, §15. In-memory foundation ONLY: no DOM, no network, no
 * IndexedDB (the database stays v3; persistence of tabs/sessions is a v4
 * proposal, not code). State lives only for the life of the page load.
 *
 * PRIVACY — what this module never stores:
 *   - No credentials, cookies, auth state, wallet addresses, or form data.
 *   - A tab's currentUrl holds ONLY a public URL the user pasted or
 *     navigated to, or an internal cockpit route (e.g. "#/globe"). A URL
 *     carrying userinfo (user:pass@host) is rejected and stored as "".
 *   - A tab's history holds only {query, source, at} — the search query
 *     and source, never page text or form data. History recording stops
 *     for temporary tabs/sessions (the flag is owned here; the
 *     SearchHistory module checks it before recording anything).
 *   - Temporary sessions are NOT private/incognito and NOT Tor. See
 *     TEMPORARY_LABEL and temporaryNote() — the honest wording lives
 *     here so no UI can accidentally claim anonymity.
 *
 * API — everything is exposed on global.SearchTabs (another worker codes
 * against these exact names; do not rename):
 *   Constants: MAX_TABS (12), TEMPORARY_LABEL.
 *   Sessions: createSession(name, opts), listSessions(), getSession(id),
 *     renameSession(id, name), setTemporary(sessionId, bool),
 *     closeSession(id).
 *   Tabs: newTab(opts), getActiveTab(), activateTab(id), listTabs(sessionId),
 *     getTab(id), closeTab(id), duplicateTab(id), pinTab(id, pinned),
 *     renameTab(id, title), moveTab(id, direction), closeOthers(id),
 *     listClosed(), restoreClosed(tabId), updateTab(id, patch),
 *     resetForTest().
 *   Honesty: temporaryNote().
 *
 * Failure contract: never throws on bad input. Unknown ids, empty titles
 * and null opts return false / null, never a crash. Tab ids are a counter
 * plus a timestamp — never Math.random alone for identity.
 *
 * Return-value convention: getters return shallow copies (history and
 * tabIds arrays are copied too) so callers cannot mutate internal state
 * by accident. Creation functions (newTab, duplicateTab, restoreClosed)
 * return a copy of the new tab.
 */
(function (global) {
  "use strict";

  var MAX_TABS = 12;
  var MAX_HISTORY_PER_TAB = 50;
  var MAX_CLOSED = 10;
  var TEMPORARY_LABEL = "MTI6 TEMPORARY SESSION";
  var DEFAULT_SESSION_ID = "session-general";
  var NAVIGATION_TYPES = ["search", "url", "internal", "restored"];

  var tabCounter = 0;
  var sessionCounter = 0;
  var sessions = [];
  var tabs = [];
  var closedTabs = [];
  var activeTabId = null;

  function nowISO() {
    return new Date().toISOString();
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function asString(value, fallback) {
    return typeof value === "string" ? value : fallback;
  }

  function makeTabId() {
    tabCounter += 1;
    return "tab-" + tabCounter + "-" + Date.now();
  }

  function makeSessionId() {
    sessionCounter += 1;
    return "session-" + sessionCounter + "-" + Date.now();
  }

  /* A URL carrying userinfo (user:pass@host) must never be stored. */
  function safeCurrentUrl(value) {
    if (typeof value !== "string" || value === "") return "";
    var schemeAt = value.indexOf("://");
    if (schemeAt !== -1) {
      var afterScheme = value.slice(schemeAt + 3);
      var slashAt = afterScheme.indexOf("/");
      var hostPart = slashAt === -1 ? afterScheme : afterScheme.slice(0, slashAt);
      if (hostPart.indexOf("@") !== -1) return "";
    }
    return value;
  }

  function cloneHistory(history) {
    var out = [];
    var i;
    for (i = 0; i < history.length; i += 1) {
      out.push({ query: history[i].query, source: history[i].source, at: history[i].at });
    }
    return out;
  }

  function cloneTab(tab) {
    return {
      tabId: tab.tabId,
      title: tab.title,
      query: tab.query,
      source: tab.source,
      sessionId: tab.sessionId,
      createdAt: tab.createdAt,
      lastActiveAt: tab.lastActiveAt,
      navigationType: tab.navigationType,
      currentUrl: tab.currentUrl,
      history: cloneHistory(tab.history),
      pinned: tab.pinned,
      temporary: tab.temporary,
      status: tab.status
    };
  }

  function cloneSession(session) {
    return {
      sessionId: session.sessionId,
      name: session.name,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      tabIds: session.tabIds.slice(),
      purpose: session.purpose,
      temporary: session.temporary,
      status: session.status
    };
  }

  function findSession(id) {
    var i;
    if (typeof id !== "string") return null;
    for (i = 0; i < sessions.length; i += 1) {
      if (sessions[i].sessionId === id) return sessions[i];
    }
    return null;
  }

  function findActiveSession(id) {
    var session = findSession(id);
    return session && session.status === "active" ? session : null;
  }

  function findTab(id) {
    var i;
    if (typeof id !== "string") return null;
    for (i = 0; i < tabs.length; i += 1) {
      if (tabs[i].tabId === id) return tabs[i];
    }
    return null;
  }

  function activeTabCount() {
    var count = 0;
    var i;
    for (i = 0; i < tabs.length; i += 1) {
      if (tabs[i].status === "active") count += 1;
    }
    return count;
  }

  function defaultSession() {
    return findActiveSession(DEFAULT_SESSION_ID);
  }

  function firstActiveSession() {
    var i;
    for (i = 0; i < sessions.length; i += 1) {
      if (sessions[i].status === "active") return sessions[i];
    }
    return null;
  }

  function resolveSession(sessionId) {
    var session = findActiveSession(sessionId);
    if (session) return session;
    session = defaultSession();
    if (session) return session;
    return firstActiveSession();
  }

  function detachTabFromSession(tab) {
    var session = findSession(tab.sessionId);
    var at;
    if (!session) return;
    at = session.tabIds.indexOf(tab.tabId);
    if (at !== -1) session.tabIds.splice(at, 1);
    session.updatedAt = nowISO();
  }

  function pushClosed(tab) {
    closedTabs.unshift(cloneTab(tab));
    if (closedTabs.length > MAX_CLOSED) closedTabs.length = MAX_CLOSED;
  }

  function pickNextActiveTab(closedTab) {
    var i;
    var sameSession = null;
    var any = null;
    for (i = 0; i < tabs.length; i += 1) {
      if (tabs[i].status !== "active") continue;
      if (!any) any = tabs[i];
      if (tabs[i].sessionId === closedTab.sessionId && !sameSession) sameSession = tabs[i];
    }
    return sameSession || any || null;
  }

  function createTabRecord(opts, navigationType) {
    var session = resolveSession(opts.sessionId);
    var tab;
    if (!session) return null;
    tab = {
      tabId: makeTabId(),
      title: isNonEmptyString(opts.title) ? opts.title : "New tab",
      query: asString(opts.query, ""),
      source: asString(opts.source, ""),
      sessionId: session.sessionId,
      createdAt: nowISO(),
      lastActiveAt: nowISO(),
      navigationType: navigationType,
      currentUrl: safeCurrentUrl(opts.currentUrl),
      history: [],
      pinned: opts.pinned === true,
      temporary: opts.temporary === true ? true : session.temporary,
      status: "active"
    };
    if (isNonEmptyString(tab.query) && !tab.temporary) {
      tab.history.push({ query: tab.query, source: tab.source, at: tab.createdAt });
    }
    tabs.push(tab);
    session.tabIds.push(tab.tabId);
    session.updatedAt = nowISO();
    activeTabId = tab.tabId;
    tab.lastActiveAt = nowISO();
    return tab;
  }

  function resetState() {
    var session;
    var tab;
    tabCounter = 0;
    sessionCounter = 0;
    sessions = [];
    tabs = [];
    closedTabs = [];
    activeTabId = null;
    session = {
      sessionId: DEFAULT_SESSION_ID,
      name: "General",
      createdAt: nowISO(),
      updatedAt: nowISO(),
      tabIds: [],
      purpose: "General browsing",
      temporary: false,
      status: "active"
    };
    sessions.push(session);
    tab = {
      tabId: makeTabId(),
      title: "New tab",
      query: "",
      source: "",
      sessionId: DEFAULT_SESSION_ID,
      createdAt: nowISO(),
      lastActiveAt: nowISO(),
      navigationType: "search",
      currentUrl: "",
      history: [],
      pinned: false,
      temporary: false,
      status: "active"
    };
    tabs.push(tab);
    session.tabIds.push(tab.tabId);
    activeTabId = tab.tabId;
  }

  /* ---------------- Sessions ---------------- */

  function createSession(name, opts) {
    var options = opts || {};
    var session;
    if (!isNonEmptyString(name)) return null;
    session = {
      sessionId: makeSessionId(),
      name: name.trim(),
      createdAt: nowISO(),
      updatedAt: nowISO(),
      tabIds: [],
      purpose: asString(options.purpose, ""),
      temporary: options.temporary === true,
      status: "active"
    };
    sessions.push(session);
    return cloneSession(session);
  }

  function listSessions() {
    var out = [];
    var i;
    for (i = 0; i < sessions.length; i += 1) {
      if (sessions[i].status === "active") out.push(cloneSession(sessions[i]));
    }
    return out;
  }

  function getSession(id) {
    var session = findSession(id);
    return session ? cloneSession(session) : null;
  }

  function renameSession(id, name) {
    var session = findSession(id);
    if (!session || session.status !== "active") return false;
    if (!isNonEmptyString(name)) return false;
    session.name = name.trim();
    session.updatedAt = nowISO();
    return true;
  }

  function setTemporary(sessionId, value) {
    var session = findSession(sessionId);
    var flag;
    var i;
    if (!session || session.status !== "active") return false;
    flag = value === true;
    session.temporary = flag;
    session.updatedAt = nowISO();
    /* The flag is owned here; SearchHistory checks it before recording.
       While a session is temporary, history recording stops for its tabs. */
    for (i = 0; i < tabs.length; i += 1) {
      if (tabs[i].sessionId === sessionId && tabs[i].status === "active") {
        tabs[i].temporary = flag;
      }
    }
    return true;
  }

  function closeSession(id) {
    var session = findSession(id);
    var i;
    var next;
    if (!session || session.status !== "active") return false;
    for (i = tabs.length - 1; i >= 0; i -= 1) {
      if (tabs[i].sessionId === id && tabs[i].status === "active") {
        tabs[i].status = "closed";
        pushClosed(tabs[i]);
        tabs.splice(i, 1);
      }
    }
    session.tabIds = [];
    session.status = "closed";
    session.updatedAt = nowISO();
    if (activeTabId !== null && findTab(activeTabId) === null) {
      next = pickNextActiveTab({ sessionId: id });
      activeTabId = next ? next.tabId : null;
    }
    return true;
  }

  /* ---------------- Tabs ---------------- */

  function newTab(opts) {
    var options = opts || {};
    var navigationType = "search";
    var tab;
    if (activeTabCount() >= MAX_TABS) return null;
    if (NAVIGATION_TYPES.indexOf(options.navigationType) !== -1) {
      navigationType = options.navigationType;
    }
    tab = createTabRecord(options, navigationType);
    return tab ? cloneTab(tab) : null;
  }

  function getActiveTab() {
    var tab = findTab(activeTabId);
    return tab ? cloneTab(tab) : null;
  }

  function activateTab(id) {
    var tab = findTab(id);
    if (!tab || tab.status !== "active") return false;
    activeTabId = tab.tabId;
    tab.lastActiveAt = nowISO();
    return true;
  }

  function listTabs(sessionId) {
    var out = [];
    var i;
    for (i = 0; i < tabs.length; i += 1) {
      if (tabs[i].status !== "active") continue;
      if (typeof sessionId === "string" && tabs[i].sessionId !== sessionId) continue;
      var copy = cloneTab(tabs[i]);
      copy.active = tabs[i].tabId === activeTabId;
      out.push(copy);
    }
    return out;
  }

  function getTab(id) {
    var tab = findTab(id);
    return tab && tab.status === "active" ? cloneTab(tab) : null;
  }

  function closeTab(id) {
    var tab = findTab(id);
    var at;
    var next;
    if (!tab || tab.status !== "active") return false;
    tab.status = "closed";
    pushClosed(tab);
    at = tabs.indexOf(tab);
    if (at !== -1) tabs.splice(at, 1);
    detachTabFromSession(tab);
    if (activeTabId === id) {
      next = pickNextActiveTab(tab);
      activeTabId = next ? next.tabId : null;
      if (next) next.lastActiveAt = nowISO();
    }
    return true;
  }

  function duplicateTab(id) {
    var original = findTab(id);
    var copy;
    if (!original || original.status !== "active") return null;
    if (activeTabCount() >= MAX_TABS) return null;
    copy = createTabRecord({
      title: original.title + " (copy)",
      query: original.query,
      source: original.source,
      sessionId: original.sessionId,
      navigationType: original.navigationType,
      currentUrl: original.currentUrl,
      temporary: original.temporary,
      pinned: original.pinned
    }, original.navigationType);
    if (!copy) return null;
    copy.history = cloneHistory(original.history);
    if (copy.history.length > MAX_HISTORY_PER_TAB) {
      copy.history = copy.history.slice(copy.history.length - MAX_HISTORY_PER_TAB);
    }
    /* Keep the stored record in sync with the copy above. */
    var stored = findTab(copy.tabId);
    if (stored) stored.history = cloneHistory(copy.history);
    return cloneTab(copy);
  }

  function pinTab(id, pinned) {
    var tab = findTab(id);
    if (!tab || tab.status !== "active") return false;
    tab.pinned = pinned === true;
    tab.lastActiveAt = nowISO();
    return true;
  }

  function renameTab(id, title) {
    var tab = findTab(id);
    if (!tab || tab.status !== "active") return false;
    if (!isNonEmptyString(title)) return false;
    tab.title = title.trim();
    tab.lastActiveAt = nowISO();
    return true;
  }

  function moveTab(id, direction) {
    var tab = findTab(id);
    var sessionTabs = [];
    var pos;
    var i;
    var swapWith;
    if (!tab || tab.status !== "active") return false;
    if (direction !== -1 && direction !== 1) return false;
    for (i = 0; i < tabs.length; i += 1) {
      if (tabs[i].sessionId === tab.sessionId && tabs[i].status === "active") {
        sessionTabs.push(tabs[i]);
      }
    }
    pos = sessionTabs.indexOf(tab);
    if (pos === -1) return false;
    if (direction === -1 && pos === 0) return false;
    if (direction === 1 && pos === sessionTabs.length - 1) return false;
    swapWith = sessionTabs[pos + direction];
    var a = tabs.indexOf(tab);
    var b = tabs.indexOf(swapWith);
    tabs[a] = swapWith;
    tabs[b] = tab;
    tab.lastActiveAt = nowISO();
    return true;
  }

  function closeOthers(id) {
    var tab = findTab(id);
    var i;
    var closedOne;
    if (!tab || tab.status !== "active") return false;
    for (i = tabs.length - 1; i >= 0; i -= 1) {
      if (tabs[i].tabId !== id && tabs[i].sessionId === tab.sessionId && tabs[i].status === "active") {
        closedOne = tabs[i];
        closedOne.status = "closed";
        pushClosed(closedOne);
        tabs.splice(i, 1);
        detachTabFromSession(closedOne);
      }
    }
    activeTabId = id;
    tab.lastActiveAt = nowISO();
    return true;
  }

  function listClosed() {
    var out = [];
    var i;
    for (i = 0; i < closedTabs.length; i += 1) {
      out.push(cloneTab(closedTabs[i]));
    }
    return out;
  }

  function restoreClosed(tabId) {
    var at = -1;
    var i;
    var closed;
    var restored;
    if (typeof tabId !== "string") return null;
    for (i = 0; i < closedTabs.length; i += 1) {
      if (closedTabs[i].tabId === tabId) { at = i; break; }
    }
    if (at === -1) return null;
    if (activeTabCount() >= MAX_TABS) return null;
    closed = closedTabs[at];
    closedTabs.splice(at, 1);
    restored = createTabRecord({
      title: closed.title,
      query: closed.query,
      source: closed.source,
      sessionId: closed.sessionId,
      navigationType: "restored",
      currentUrl: closed.currentUrl,
      temporary: closed.temporary,
      pinned: closed.pinned
    }, "restored");
    if (!restored) return null;
    restored.history = cloneHistory(closed.history);
    var stored = findTab(restored.tabId);
    if (stored) stored.history = cloneHistory(restored.history);
    return cloneTab(restored);
  }

  function updateTab(id, patch) {
    var tab = findTab(id);
    var next;
    if (!tab || tab.status !== "active") return false;
    if (!patch || typeof patch !== "object") return false;
    if (typeof patch.title === "string" && patch.title.trim() !== "") {
      tab.title = patch.title.trim();
    }
    if (typeof patch.source === "string") tab.source = patch.source;
    if (typeof patch.currentUrl === "string") tab.currentUrl = safeCurrentUrl(patch.currentUrl);
    if (typeof patch.query === "string" && patch.query !== tab.query) {
      tab.query = patch.query;
      /* History recording stops for temporary tabs. */
      if (!tab.temporary && patch.query !== "") {
        tab.history.push({ query: patch.query, source: tab.source, at: nowISO() });
        if (tab.history.length > MAX_HISTORY_PER_TAB) {
          tab.history = tab.history.slice(tab.history.length - MAX_HISTORY_PER_TAB);
        }
      }
    }
    tab.lastActiveAt = nowISO();
    next = findSession(tab.sessionId);
    if (next) next.updatedAt = nowISO();
    return true;
  }

  function temporaryNote() {
    return "A temporary session keeps no search history in MTI6. It is not Tor Browser and not private/incognito mode — the browser and network still see ordinary traffic.";
  }

  function resetForTest() {
    resetState();
  }

  resetState();

  global.SearchTabs = {
    MAX_TABS: MAX_TABS,
    TEMPORARY_LABEL: TEMPORARY_LABEL,
    temporaryNote: temporaryNote,
    createSession: createSession,
    listSessions: listSessions,
    getSession: getSession,
    renameSession: renameSession,
    setTemporary: setTemporary,
    closeSession: closeSession,
    newTab: newTab,
    getActiveTab: getActiveTab,
    activateTab: activateTab,
    listTabs: listTabs,
    getTab: getTab,
    closeTab: closeTab,
    duplicateTab: duplicateTab,
    pinTab: pinTab,
    renameTab: renameTab,
    moveTab: moveTab,
    closeOthers: closeOthers,
    listClosed: listClosed,
    restoreClosed: restoreClosed,
    updateTab: updateTab,
    resetForTest: resetForTest
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
