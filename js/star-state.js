/* MTI6-GTADWIY-COCKPIT — Star 3.0 conversation state (V1)
 *
 * Layer 2 of 4 in the Star 3.0 architecture:
 *   1. Star chat UI        -> js/modules/star.js
 *   2. Conversation state  -> this file
 *   3. AI-provider/backend -> js/star-backend.js
 *   4. Agent/task routing  -> js/star-router.js
 *
 * This file owns ONLY conversation state. It never talks to a network,
 * never holds an API key, and never executes an action. It stores messages
 * locally (localStorage, same offline-first approach as the rest of the
 * cockpit) so a conversation survives a reload on the device.
 *
 * Extension points (future, no behaviour change in V1):
 *   - Conversation memory: replace load/save with a CockpitDB store and
 *     add summarisation here, behind the same getMessages/addMessage API.
 *   - Multi-session chats: add a sessionId argument to addMessage and
 *     keep one message list per session.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "mti6_star_chat_v1";
  var MAX_MESSAGES = 200;

  var messages = [];
  var listeners = [];
  var loaded = false;

  function load() {
    if (loaded) return messages;
    loaded = true;
    try {
      var raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        messages = parsed.filter(function (m) {
          return m && (m.role === "user" || m.role === "star") && typeof m.text === "string";
        });
      }
    } catch (e) {
      messages = [];
    }
    return messages;
  }

  function save() {
    try {
      if (global.localStorage) {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      }
    } catch (e) {
      // Storage full or unavailable (private mode, etc.): conversation
      // still works in memory for this session; do not crash the panel.
    }
  }

  function notify() {
    listeners.slice().forEach(function (fn) {
      try { fn(getMessages()); } catch (e) { /* listener failure must not break chat */ }
    });
  }

  function addMessage(role, text) {
    load();
    var clean = String(text == null ? "" : text).trim();
    if (!clean) return null;
    var msg = {
      id: "star-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
      role: role === "star" ? "star" : "user",
      text: clean,
      at: new Date().toISOString()
    };
    messages.push(msg);
    if (messages.length > MAX_MESSAGES) {
      messages = messages.slice(messages.length - MAX_MESSAGES);
    }
    save();
    notify();
    return msg;
  }

  function getMessages() {
    load();
    return messages.slice();
  }

  function clear() {
    messages = [];
    save();
    notify();
  }

  function subscribe(fn) {
    if (typeof fn === "function") listeners.push(fn);
    return function unsubscribe() {
      listeners = listeners.filter(function (f) { return f !== fn; });
    };
  }

  // Future memory hook: callers can attach a summariser that receives the
  // full message list. V1 ships with no summariser attached.
  function getSummaryHint() {
    var list = getMessages();
    return {
      messageCount: list.length,
      lastUserMessage: (function () {
        for (var i = list.length - 1; i >= 0; i--) {
          if (list[i].role === "user") return list[i].text;
        }
        return "";
      })()
    };
  }

  global.StarState = {
    addMessage: addMessage,
    getMessages: getMessages,
    clear: clear,
    subscribe: subscribe,
    getSummaryHint: getSummaryHint,
    STORAGE_KEY: STORAGE_KEY
  };
})(window);
