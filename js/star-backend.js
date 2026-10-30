/* MTI6-GTADWIY-COCKPIT — Star 3.0 backend communication (V1)
 *
 * Layer 3 of 4 in the Star 3.0 architecture:
 *   1. Star chat UI        -> js/modules/star.js
 *   2. Conversation state  -> js/star-state.js
 *   3. AI-provider/backend -> this file
 *   4. Agent/task routing  -> js/star-router.js
 *
 * SECURITY RULE — never break this: no API key, token, or secret may be
 * placed in this file or in any other frontend JavaScript. A real AI
 * backend, when one is connected later, must hold its own keys on the
 * server side and be reached through a same-origin proxy endpoint that
 * the user configures outside this code. This file deliberately ships
 * with NO endpoint configured, so there is nothing to leak.
 *
 * V1 mode: "demo". The demo backend answers locally, on-device, with no
 * network call at all. The UI must always label this clearly as demo
 * mode so a demo answer is never mistaken for a live AI answer.
 *
 * Future backend hook (no behaviour change in V1):
 *   StarBackend.configure({ mode: "remote", endpoint: "/api/star" });
 * That endpoint, if ever set by a secure setup step outside this file,
 * must be a server-side proxy — never a third-party API URL with a key
 * in the browser. If mode is "remote" but no endpoint is set, send()
 * falls back to demo mode and reports that in its result.
 */
(function (global) {
  "use strict";

  var config = {
    mode: "demo", // "demo" | "remote"
    endpoint: null // server-side proxy path only; never set a key here
  };

  function isDemo() {
    return config.mode !== "remote" || !config.endpoint;
  }

  function getStatusLabel() {
    if (isDemo()) return "Demo mode — no AI backend connected";
    return "Connected — live backend";
  }

  function configure(next) {
    if (!next || typeof next !== "object") return config;
    if (next.mode === "remote" || next.mode === "demo") config.mode = next.mode;
    // Only accept a relative, same-origin proxy path. Reject absolute
    // third-party URLs outright so a key-bearing endpoint cannot be
    // smuggled in through configuration.
    if (typeof next.endpoint === "string" && next.endpoint.indexOf("/") === 0) {
      config.endpoint = next.endpoint;
    }
    return { mode: config.mode, endpoint: config.endpoint };
  }

  function demoReply(text, context) {
    var lower = String(text).toLowerCase();
    var hint = "";
    if (/\b(task\w*|todo|mission)\b/.test(lower)) {
      hint = " For tasks, I can already point you at Mission Control — in a future version I will be able to create and list tasks for you, with your approval first.";
    } else if (/\b(note\w*|vault|idea)\b/.test(lower)) {
      hint = " For notes, the Knowledge Vault is where everything lives locally — a future version will let me search it for you.";
    } else if (/\b(expense\w*|spend\w*|money|budget)\b/.test(lower)) {
      hint = " For spending, the Resource Tracker holds your local totals — a future version will be able to summarise them for you.";
    } else if (/\b(project\w*|milestone)\b/.test(lower)) {
      hint = " For projects, the Projects screen tracks milestones locally — a future version will be able to report progress for you.";
    } else if (/\b(github|code|deploy|preview)\b/.test(lower)) {
      hint = " For GitHub work, actions that change a repository will always need your approval first — that rule is built into the router, not just the chat.";
    }
    var ctx = context && context.summaryHint && context.summaryHint.messageCount
      ? " (This demo conversation has " + context.summaryHint.messageCount + " messages so far.)"
      : "";
    return "Star 3.0 demo: I understood — “" + String(text).slice(0, 200) + "”." +
      " I am running in local demo mode, so this is not a live AI answer and I have not changed any of your notes, tasks, expenses, or projects." +
      hint + ctx +
      " When a secure backend is connected, this same panel will use it — no keys will ever live in this page.";
  }

  // Returns a Promise<{ text: string, mode: "demo" | "remote", routed?: object }>
  // The UI passes a small context object (for example a summary hint from
  // StarState); the backend never reads CockpitDB directly in V1.
  function send(text, context) {
    var clean = String(text == null ? "" : text).trim();
    if (!clean) return Promise.resolve({ text: "", mode: isDemo() ? "demo" : "remote" });
    if (isDemo()) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve({ text: demoReply(clean, context || {}), mode: "demo" });
        }, 350);
      });
    }
    // Remote path — server-side proxy only. No Authorization header and
    // no key is ever constructed here; the proxy authenticates itself.
    return global.fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: clean, context: context || {} })
    }).then(function (res) {
      if (!res.ok) throw new Error("backend_error");
      return res.json();
    }).then(function (data) {
      return { text: String((data && data.text) || ""), mode: "remote" };
    }).catch(function () {
      // A failed live backend must degrade to an honest demo answer,
      // never to a silent failure or a fabricated live answer.
      return { text: demoReply(clean, context || {}) + " (Live backend was unreachable, so this fell back to demo mode.)", mode: "demo" };
    });
  }

  global.StarBackend = {
    send: send,
    configure: configure,
    isDemo: isDemo,
    getStatusLabel: getStatusLabel
  };
})(window);
