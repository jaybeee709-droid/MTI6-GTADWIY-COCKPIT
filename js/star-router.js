/* MTI6-GTADWIY-COCKPIT — Star 3.0 agent / task routing (V1)
 *
 * Layer 4 of 4 in the Star 3.0 architecture:
 *   1. Star chat UI        -> js/modules/star.js
 *   2. Conversation state  -> js/star-state.js
 *   3. AI-provider/backend -> js/star-backend.js
 *   4. Agent/task routing  -> this file
 *
 * The router decides WHAT KIND of work a message is asking for. In V1 it
 * does NOT execute external work. Anything that would change data outside
 * this device, change a repository, spend money, or delegate to another
 * agent is marked requiresApproval: true, and the UI must present that
 * as "approval required — not executed" instead of running it.
 *
 * Extension points — register a specialist or temporary bot here, in one
 * place, instead of scattering if/else logic through the UI:
 *   StarRouter.registerBot("scout", { description, keywords, requiresApproval });
 *   StarRouter.createTemporaryBot("research-123", { task, ttlMinutes });
 *   StarRouter.requestVoiceInput() / requestVideoInput() — V1 stubs that
 *     report "coming soon" so the UI buttons can stay disabled honestly.
 */
(function (global) {
  "use strict";

  var bots = {
    vault: { description: "Knowledge Vault specialist", keywords: ["note", "vault", "idea"], requiresApproval: false },
    tasks: { description: "Mission Control specialist", keywords: ["task", "todo", "mission"], requiresApproval: false },
    expenses: { description: "Resource Tracker specialist", keywords: ["expense", "spend", "money", "budget"], requiresApproval: false },
    projects: { description: "Projects specialist", keywords: ["project", "milestone"], requiresApproval: false },
    scout: { description: "Web research / scout bot", keywords: ["research", "scout", "look up", "web"], requiresApproval: true },
    github: { description: "GitHub development tasks", keywords: ["github", "code", "deploy", "preview", "branch", "pull request"], requiresApproval: true },
    delegate: { description: "Task delegation to a worker bot", keywords: ["delegate", "assign", "worker"], requiresApproval: true },
    prices: { description: "Price Scouts (read-only)", keywords: ["price", "prices", "stock", "crypto", "bitcoin", "btc", "ethereum", "eth", "solana"], requiresApproval: false },
    activity: { description: "GitHub activity scout (read-only)", keywords: ["github activity", "repo activity", "recent commits"], requiresApproval: false },
    news: { description: "News scout (read-only)", keywords: ["news", "headlines", "top stories"], requiresApproval: false },
    knowledge: { description: "Saved bot knowledge (read-only)", keywords: ["saved knowledge", "bot knowledge"], requiresApproval: false },
    general: { description: "General Star assistant", keywords: [], requiresApproval: false }
  };

  var temporaryBots = {};

  function registerBot(name, info) {
    if (!name || !info) return false;
    bots[String(name)] = {
      description: info.description || String(name),
      keywords: Array.isArray(info.keywords) ? info.keywords : [],
      requiresApproval: !!info.requiresApproval
    };
    return true;
  }

  function createTemporaryBot(name, info) {
    // Temporary worker bots: named, scoped to one task, and expirable.
    // V1 only records them; execution is a future step behind approval.
    if (!name) return null;
    temporaryBots[String(name)] = {
      task: (info && info.task) || "",
      ttlMinutes: (info && info.ttlMinutes) || 60,
      createdAt: new Date().toISOString(),
      requiresApproval: true
    };
    return temporaryBots[String(name)];
  }

  function route(text) {
    var lower = String(text == null ? "" : text).toLowerCase();
    var slash = /^\/([a-z0-9_-]+)\b/.exec(lower);
    if (slash && bots[slash[1]]) {
      return { bot: slash[1], action: "route", requiresApproval: bots[slash[1]].requiresApproval, temporary: false };
    }
    var best = "general";
    var bestScore = 0;
    Object.keys(bots).forEach(function (name) {
      var score = 0;
      bots[name].keywords.forEach(function (kw) {
        if (kw && lower.indexOf(kw) !== -1) score += 1;
      });
      if (score > bestScore) { bestScore = score; best = name; }
    });
    return { bot: best, action: "route", requiresApproval: bots[best].requiresApproval, temporary: false };
  }

  function approvalNotice(routed) {
    if (!routed || !routed.requiresApproval) return "";
    return " Approval required: “" + routed.bot + "” work is not executed in Star 3.0 V1. " +
      "Tell Star you approve, and a future version will queue this as an approval-required action instead of running it silently.";
  }

  // Future voice / video hooks. V1 reports honestly that they are not
  // ready, so the UI can keep those buttons disabled with a clear label.
  function requestVoiceInput() {
    return { supported: false, reason: "Voice mode is coming soon — the microphone button is reserved for it." };
  }

  function requestVideoInput() {
    return { supported: false, reason: "Video mode is coming soon — the camera button is reserved for it." };
  }

  global.StarRouter = {
    route: route,
    registerBot: registerBot,
    createTemporaryBot: createTemporaryBot,
    approvalNotice: approvalNotice,
    requestVoiceInput: requestVoiceInput,
    requestVideoInput: requestVideoInput,
    listBots: function () { return Object.keys(bots); }
  };
})(window);
