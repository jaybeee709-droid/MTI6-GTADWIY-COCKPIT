/* MTI6-GTADWIY-COCKPIT — Star 3.0 backend communication (V2 plumbing)
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
 * V2 (roadmap item 14, design + plumbing only — NO connection): the
 * transport below is real but inert until the owner saves an endpoint
 * in Settings. With no endpoint saved — the shipped default — send()
 * behaves byte-for-byte like V1: local demo answers, no network call
 * at all, and the UI labels it demo mode so a demo answer is never
 * mistaken for a live AI answer.
 *
 * Configuration surface: endpoint + model, persisted in localStorage
 * under SETTINGS_KEY by Settings (owner-entered). There is NO API key
 * field anywhere in the frontend, by design — keys live only in the
 * server gateway's environment when the owner authorizes a provider
 * (see files/star-live-backend-design.md). The endpoint must be a
 * relative, same-origin gateway path (for example "/api/mti6");
 * absolute third-party URLs are rejected outright so a key-bearing
 * endpoint cannot be smuggled in through configuration.
 *
 * Transport contract (active only once an endpoint is saved): POST
 * the gateway envelope { action: "star.chat", payload: { message,
 * model, context } } to the configured endpoint and read the standard
 * gateway envelope back ({ ok, data: { text } }). Failures are
 * classified — NOT_CONFIGURED / UNREACHABLE / PROVIDER_ERROR /
 * TIMEOUT — and any failure degrades that answer to the honest local
 * demo reply with the failure class named, never to a silent failure
 * or a fabricated live answer. Today's Phase 1 gateway has no
 * star.chat action (its allowlist is gateway.status / gateway.ping),
 * so a saved endpoint answers PROVIDER_ERROR (UNSUPPORTED_ACTION)
 * until the owner authorizes the gateway expansion — the status
 * therefore stays "endpoint saved — not verified", and isDemo()
 * stays true until a star.chat exchange actually succeeds.
 */
(function (global) {
  "use strict";

  var SETTINGS_KEY = "mti6_star_backend_v1";
  var DEFAULT_TIMEOUT_MS = 15000;

  var ERRORS = {
    NOT_CONFIGURED: "NOT_CONFIGURED",
    UNREACHABLE: "UNREACHABLE",
    PROVIDER_ERROR: "PROVIDER_ERROR",
    TIMEOUT: "TIMEOUT"
  };

  var config = {
    mode: "demo", // "demo" | "remote" (owner intent; see isDemo)
    endpoint: null, // server-side proxy path only; never set a key here
    model: "", // provider model name; a name only, never a credential
    timeoutMs: DEFAULT_TIMEOUT_MS
  };

  // True only after a star.chat exchange has actually succeeded in
  // this session. Saving an endpoint never sets this — configuration
  // is not connection, and every status consumer (chat panel,
  // Settings, overlay, StarCommand status, Bot Operations) reads
  // isDemo()/getStatusLabel(), so no surface can claim "connected"
  // before a real exchange proves it.
  var verifiedLive = false;

  function storage() {
    try { return global.localStorage || null; } catch (e) { return null; }
  }

  // A configured endpoint must be a path on this origin, nothing
  // else. A leading "/" alone is not sufficient: "//host/path" is a
  // protocol-relative URL that fetch() resolves OFF-origin, "/\host"
  // is its backslash twin, and tab/newline characters are stripped
  // by URL parsing, which would smuggle the same "//host" shape past
  // a naive prefix check ("/\t/host"). All three are rejected here,
  // at both acceptance points (saved-config load and configure()).
  function isSameOriginPath(p) {
    if (typeof p !== "string" || p.length === 0) return false;
    if (/[\t\n\r]/.test(p)) return false;
    if (p.charAt(0) !== "/") return false;
    var second = p.charAt(1);
    if (second === "/" || second === "\\") return false;
    return true;
  }

  function loadPersisted() {
    var ls = storage();
    if (!ls) return;
    try {
      var raw = ls.getItem(SETTINGS_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return;
      if (isSameOriginPath(saved.endpoint)) {
        config.endpoint = saved.endpoint;
        config.mode = "remote";
      }
      if (typeof saved.model === "string") config.model = saved.model.slice(0, 120);
    } catch (e) { /* unreadable saved config: stay unconfigured */ }
  }

  function persist() {
    var ls = storage();
    if (!ls) return;
    try {
      ls.setItem(SETTINGS_KEY, JSON.stringify({
        endpoint: config.endpoint || "",
        model: config.model || ""
      }));
    } catch (e) { /* persistence is best-effort; in-memory config stands */ }
  }

  function isConfigured() {
    return typeof config.endpoint === "string" && config.endpoint.length > 0;
  }

  function isDemo() {
    return !verifiedLive;
  }

  function getStatusLabel() {
    if (verifiedLive) return "Connected — live backend";
    if (isConfigured()) {
      return "Endpoint saved — not verified. Star remains in demo mode until the server gateway is authorized and connected.";
    }
    return "Demo mode — no AI backend connected";
  }

  function getStatus() {
    return {
      state: verifiedLive ? "CONNECTED" : (isConfigured() ? "ENDPOINT_SAVED_UNVERIFIED" : "NOT_CONNECTED"),
      mode: isDemo() ? "demo" : "remote",
      configured: isConfigured(),
      verifiedLive: verifiedLive,
      endpoint: config.endpoint || "",
      model: config.model || "",
      label: getStatusLabel()
    };
  }

  function getConfig() {
    return {
      endpoint: config.endpoint || "",
      model: config.model || "",
      timeoutMs: config.timeoutMs
    };
  }

  function configure(next) {
    if (!next || typeof next !== "object") return getConfig();
    if (next.mode === "remote" || next.mode === "demo") config.mode = next.mode;
    var dirty = false;
    if (typeof next.endpoint === "string") {
      if (next.endpoint === "") {
        // Explicit clear: back to the shipped unconfigured state.
        config.endpoint = null;
        config.mode = "demo";
        verifiedLive = false;
        dirty = true;
      } else if (isSameOriginPath(next.endpoint)) {
        // Only a relative, same-origin proxy path is accepted.
        config.endpoint = next.endpoint;
        config.mode = "remote";
        dirty = true;
      }
      // Absolute URLs are ignored, exactly as in V1.
    }
    if (typeof next.model === "string") {
      config.model = next.model.trim().slice(0, 120);
      dirty = true;
    }
    if (typeof next.timeoutMs === "number" && next.timeoutMs > 0) {
      config.timeoutMs = Math.floor(next.timeoutMs);
    }
    if (dirty) persist();
    return getConfig();
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

  function demoSend(clean, context) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve({ text: demoReply(clean, context || {}), mode: "demo" });
      }, 350);
    });
  }

  function transportError(code, message, extra) {
    var err = { code: code, message: message };
    if (extra) {
      Object.keys(extra).forEach(function (k) { err[k] = extra[k]; });
    }
    return err;
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var controller = null;
      var opts = options;
      if (typeof AbortController === "function") {
        try {
          controller = new AbortController();
          opts = {};
          Object.keys(options).forEach(function (k) { opts[k] = options[k]; });
          opts.signal = controller.signal;
        } catch (e) { controller = null; }
      }
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        if (controller) { try { controller.abort(); } catch (e) {} }
        var err = new Error("STAR backend request timed out.");
        err.name = "AbortError";
        reject(err);
      }, timeoutMs);
      global.fetch(url, opts).then(function (res) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(res);
      }, function (err) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  // The real transport. Only runs when an endpoint is configured.
  // Resolves { text, mode: "remote", error: null } on a genuine
  // gateway success; rejects with a taxonomy error object otherwise.
  function sendRemote(clean, context) {
    var body = JSON.stringify({
      action: "star.chat",
      payload: { message: clean, model: config.model || "", context: context || {} }
    });
    return fetchWithTimeout(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body
    }, config.timeoutMs).then(function (res) {
      return res.json().then(function (data) {
        return { res: res, data: data };
      }, function () {
        return { res: res, data: null };
      });
    }).then(function (r) {
      if (!r.res.ok) {
        var gw = r.data && r.data.error ? r.data.error : null;
        throw transportError(ERRORS.PROVIDER_ERROR,
          "The configured STAR endpoint returned HTTP " + r.res.status + ".",
          {
            status: r.res.status,
            gatewayCode: gw && gw.code ? gw.code : null,
            gatewayMessage: gw && gw.message ? gw.message : null
          });
      }
      if (!r.data || typeof r.data !== "object") {
        throw transportError(ERRORS.PROVIDER_ERROR,
          "The configured STAR endpoint returned a malformed response.", {});
      }
      if (r.data.ok === false) {
        var ge = r.data.error || {};
        throw transportError(ERRORS.PROVIDER_ERROR,
          "The gateway refused the STAR request" + (ge.code ? " (" + ge.code + ")" : "") + ".",
          { gatewayCode: ge.code || null, gatewayMessage: ge.message || null });
      }
      var text = null;
      if (r.data.data && typeof r.data.data.text === "string") text = r.data.data.text;
      else if (typeof r.data.text === "string") text = r.data.text;
      if (text == null) {
        throw transportError(ERRORS.PROVIDER_ERROR,
          "The configured STAR endpoint answered without reply text.", {});
      }
      verifiedLive = true;
      return { text: text, mode: "remote", error: null };
    }).catch(function (err) {
      if (err && err.code && ERRORS[err.code]) throw err;
      if (err && err.name === "AbortError") {
        throw transportError(ERRORS.TIMEOUT,
          "The configured STAR endpoint timed out.", {});
      }
      throw transportError(ERRORS.UNREACHABLE,
        "The configured STAR endpoint could not be reached.", {});
    });
  }

  function fallbackSuffix(code) {
    if (code === ERRORS.TIMEOUT) {
      return " (The configured STAR endpoint timed out, so this fell back to demo mode.)";
    }
    if (code === ERRORS.UNREACHABLE) {
      return " (The configured STAR endpoint could not be reached, so this fell back to demo mode.)";
    }
    if (code === ERRORS.PROVIDER_ERROR) {
      return " (The configured STAR endpoint returned an error, so this fell back to demo mode.)";
    }
    return " (The configured STAR endpoint did not answer, so this fell back to demo mode.)";
  }

  // Returns a Promise<{ text: string, mode: "demo" | "remote", error?: object }>
  // The UI passes a small context object (for example a summary hint from
  // StarState); the backend never reads CockpitDB directly.
  function send(text, context) {
    var clean = String(text == null ? "" : text).trim();
    if (!clean) return Promise.resolve({ text: "", mode: isDemo() ? "demo" : "remote" });
    if (!isConfigured()) {
      // NOT_CONFIGURED: exactly the V1 demo behaviour, no fetch at all.
      return demoSend(clean, context || {});
    }
    return sendRemote(clean, context || {}).catch(function (err) {
      var e = err && err.code && ERRORS[err.code]
        ? err
        : transportError(ERRORS.UNREACHABLE, "The configured STAR endpoint could not be reached.", {});
      // A failed live backend degrades to an honest demo answer with
      // the failure class named — never a silent failure, never a
      // fabricated live answer.
      return demoSend(clean, context || {}).then(function (r) {
        r.text += fallbackSuffix(e.code);
        r.error = e;
        return r;
      });
    });
  }

  // Verifies the Phase 1 gateway through the EXISTING allowlisted
  // actions only (gateway.status via MTI6API). This reports gateway
  // reachability; it never changes STAR's connection state — a
  // reachable Phase 1 gateway still has no STAR provider.
  function checkGateway() {
    var api = global.MTI6API;
    if (!api || typeof api.status !== "function") {
      return Promise.resolve({
        reachable: false,
        error: transportError(ERRORS.UNREACHABLE, "The gateway client (MTI6API) is not loaded.", {}),
        note: null,
        providers: null,
        actions: null
      });
    }
    return api.status().then(function (result) {
      var data = (result && result.data) || {};
      return {
        reachable: true,
        error: null,
        note: typeof data.note === "string" ? data.note : null,
        providers: Array.isArray(data.providers) ? data.providers : [],
        actions: Array.isArray(data.actions) ? data.actions : []
      };
    }).catch(function (e) {
      return {
        reachable: false,
        error: transportError(ERRORS.UNREACHABLE,
          (e && e.message) || "The gateway could not be reached.", {}),
        note: null,
        providers: null,
        actions: null
      };
    });
  }

  loadPersisted();

  global.StarBackend = {
    send: send,
    configure: configure,
    isDemo: isDemo,
    getStatusLabel: getStatusLabel,
    getStatus: getStatus,
    getConfig: getConfig,
    checkGateway: checkGateway,
    ERRORS: ERRORS,
    SETTINGS_KEY: SETTINGS_KEY
  };
})(window);
