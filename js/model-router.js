/* MTI6-GTADWIY-COCKPIT — Model router (continuous development campaign)
 *
 * Provider-neutral model routing foundation. Bot identities are
 * PERMANENT; the AI model behind a bot is interchangeable. Routing
 * returns a model ASSIGNMENT for a given bot identity + task — it
 * never renames or replaces a bot identity.
 *
 * Hard rules, in plain terms:
 *   - Metadata only. The provider registry and model catalog hold
 *     labels, capability lists, and tier labels. There are no API
 *     keys, no secret endpoints, no credentials of any kind, no live
 *     calls, and no network in this file. A model is never marked
 *     available/live without an explicit availability record.
 *   - Truth vocabulary is reused, never reinvented: availability
 *     uses Truth.TRUTH_STATES (default UNKNOWN) and verifiedQuality
 *     defaults to UNKNOWN. UNKNOWN is never silently converted to a
 *     success, a score, or a live connection.
 *   - Verified quality is never invented: verifiedQuality is UNKNOWN
 *     unless a real evaluation record exists ({state, score?, source?,
 *     checkedAt?} with source + checkedAt required for VERIFIED/LIVE).
 *   - Capability match is a hard gate: route() never returns a model
 *     that lacks a required capability, and returns an honest
 *     {candidates: [], reason: "NO_MATCHING_MODEL"} when nothing fits.
 *   - Recording an outcome never rewrites security boundaries or
 *     permissions. Routing is INFORMATIONAL only: it assigns a model,
 *     it never authorises execution, spending, or a transaction.
 *   - Degrades gracefully when Truth or StarCommand are absent: every
 *     optional global is checked with typeof first, and a missing
 *     dependency is reported as NOT_CONNECTED instead of throwing.
 *
 * Depends on js/truth.js and js/star-command.js at run time (load
 * order: truth.js, star-command.js, model-router.js). Loads in a bare
 * vm context with no DOM and no network.
 *
 *   ModelRouter.PROVIDERS / .MODELS / .CAPABILITIES / .TIERS
 *   ModelRouter.route(request)            -> {botId, task, candidates,
 *                                              reason}
 *   ModelRouter.fallbackChain(assignment, request?)
 *                                           -> [assignment, ...]
 *   ModelRouter.recordOutcome(record)     -> {recorded, ...}
 *   ModelRouter.getResultsLog() / clearResultsLog()
 *   ModelRouter.registerProvider(p) / registerModel(m)
 *   ModelRouter.setAvailability(providerId, modelId, state, record?)
 *   ModelRouter.setVerifiedQuality(providerId, modelId, quality)
 *   ModelRouter.validateProvider(p) / validateModel(m) -> [errors]
 *   ModelRouter.getAuditLog() / clearAuditLog()
 *
 * MODEL ROUTER EXTENSION — performance tracking by task class and
 * model (Master Bot Workforce spec §44 item 6 extension):
 *   ModelRouter.TASK_CLASSES              -> closed task-class list
 *   ModelRouter.recordPerformance(record) -> {recorded, ...}
 *   ModelRouter.performanceByTaskClass(taskClass) -> summary
 *   ModelRouter.performanceByModel(modelId)       -> summary
 *   ModelRouter.getPerformanceLog() / clearPerformanceLog()
 *   ModelRouter.proposeRankingChange(input) -> proposal record
 *   ModelRouter.applyRankingChange(proposalId, approval)
 *                                           -> {applied, ...}
 *   ModelRouter.getRankingProposals() / clearRankingProposals()
 * A proposal NEVER applies itself. Applying one needs an owner
 * approval record {approvedBy, approvedAt}; without it the result
 * is {applied: false, reason: "REQUIRES_APPROVAL"} and nothing
 * changes. A proposal touching a provider/security-critical model
 * (registry record with securityCritical: true) is recorded as
 * REJECTED with reason "REQUIRES_OWNER_SECURITY_APPROVAL" and can
 * never be applied, approval or not. An applied proposal adds a
 * bounded (+/-4) ranking adjustment that route() honours for that
 * task class only. route() also gains the performance signal: for
 * the request's task class (explicit request.taskClass, else
 * inferred from a single required capability that names a task
 * class), recorded success history nudges a model up and recorded
 * failures nudge it down, bounded to +/-5 — never overriding the
 * hard gates (capability match, constraints) or capability,
 * verified-quality, and availability scoring.
 */
(function (global) {
  "use strict";

  // Resolve the global object without assuming a browser: in a page
  // `window` exists; in a bare vm context only `globalThis` does.
  // (The IIFE argument below supplies it; this line is a guard only.)
  var G = global || (typeof globalThis !== "undefined" ? globalThis : {});

  function truth() { return (G.Truth && typeof G.Truth === "object") ? G.Truth : null; }

  function knownTruthStates() {
    var t = truth();
    if (t && t.TRUTH_STATES) return t.TRUTH_STATES.slice();
    return ["NOT_CONNECTED", "UNKNOWN", "UNVERIFIED", "STALE",
      "DISABLED", "UNAVAILABLE", "VERIFIED", "LIVE"];
  }

  // ---- Vocabulary -------------------------------------------------
  var CAPABILITIES = ["text", "reasoning", "code", "vision",
    "audio", "search", "tools"];

  // Tier labels. Cost/latency: low is better. Privacy: high is
  // better. Context: large is better. Ranks are 1..3 in all cases.
  var TIERS = {
    cost: ["low", "medium", "high"],
    latency: ["low", "medium", "high"],
    privacy: ["low", "medium", "high"],
    context: ["small", "medium", "large"]
  };

  function tierRank(kind, tier) {
    var list = TIERS[kind] || [];
    var i = list.indexOf(tier);
    return i === -1 ? null : i + 1;
  }

  // Fields that must never appear in a provider or model record:
  // anything credential-like or endpoint-like. These are validation
  // vocabulary only — no such value exists anywhere in this file.
  var SECRET_KEY_PARTS = ["seed", "mnemonic", "privatekey", "private_key",
    "apikey", "api_key", "apisecret", "password", "secret", "token",
    "bearer", "credential", "endpoint", "baseurl", "url", "auth"];

  var OUTCOMES = ["success", "failure", "partial"];

  // Closed task-class vocabulary for performance tracking. These are
  // kinds of work, not capabilities: a task class names what the
  // work is (analysis, planning, research), while a capability
  // names what a model can do. "other" is the honest bucket for
  // work that fits none of the named classes — never a guess.
  var TASK_CLASSES = ["text", "reasoning", "code", "research",
    "vision", "audio", "search", "analysis", "planning", "other"];

  // A required capability that names a task class directly, so
  // route() can infer the task class when the caller does not name
  // one. Only a SINGLE required capability infers a class; several
  // together name no single class, so no inference is made.
  var CAPABILITY_TASK_CLASSES = ["text", "reasoning", "code",
    "vision", "audio", "search"];

  // Ranking directions for proposals.
  var RANKING_DIRECTIONS = ["promote", "demote"];

  var RESULTS_MAX = 200;
  var AUDIT_MAX = 200;

  // Performance log: bounded at 500, oldest dropped. Ranking
  // proposals: bounded at 200. One applied proposal moves a model
  // by +/-4 for its task class only; applied adjustments for one
  // model + task class sum to at most +/-8.
  var PERFORMANCE_MAX = 500;
  var PROPOSALS_MAX = 200;
  var RANKING_ADJUSTMENT = 4;
  var RANKING_ADJUSTMENT_TOTAL_MAX = 8;

  // Performance signal in route() scoring: bounded to +/-5, so
  // recorded history can break ties and nudge rank, never override
  // capability match, verified quality, or availability.
  var PERFORMANCE_SIGNAL_MAX = 5;

  function isSecretKey(key) {
    var k = String(key || "").toLowerCase().replace(/[-_]/g, "");
    for (var i = 0; i < SECRET_KEY_PARTS.length; i++) {
      var part = SECRET_KEY_PARTS[i].replace(/[-_]/g, "");
      if (k.indexOf(part) !== -1) return true;
    }
    return false;
  }

  function asArray(value) {
    if (Array.isArray(value)) return value.slice();
    return [];
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function newId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 8);
  }

  // ---- Provider registry (metadata only) --------------------------
  // Six slots: five named providers plus an "other approved future
  // provider" extension slot. No endpoints, no keys, no credentials.
  var PROVIDERS = [
    {
      id: "openai",
      label: "GPT / OpenAI",
      kinds: ["hosted-api"],
      notes: "Hosted API provider. Metadata only — no key, endpoint, or live connection is recorded here."
    },
    {
      id: "gemini",
      label: "Gemini / Google",
      kinds: ["hosted-api"],
      notes: "Hosted API provider. Metadata only — no key, endpoint, or live connection is recorded here."
    },
    {
      id: "huggingface",
      label: "Hugging Face / open-model providers",
      kinds: ["hosted-api", "open-weights"],
      notes: "Open-model hub and hosted inference providers. Metadata only — no key, endpoint, or live connection is recorded here."
    },
    {
      id: "microsoft-github",
      label: "Microsoft / GitHub capabilities",
      kinds: ["hosted-api"],
      notes: "Microsoft / GitHub hosted model capabilities (including GitHub Models and Copilot-class assistance). Metadata only — no key, endpoint, or live connection is recorded here."
    },
    {
      id: "local",
      label: "Local models",
      kinds: ["local"],
      notes: "Models run on the user's own device. Highest privacy tier by design; no data leaves the device through this router."
    },
    {
      id: "other",
      label: "Other approved future provider",
      kinds: ["hosted-api"],
      notes: "Extension slot for a future provider approved by the owner. No provider is implied by this slot; register a real provider record before routing to it."
    }
  ];

  // ---- Model catalog (metadata only) ------------------------------
  // Capability-class entries for well-known public models. Every
  // entry is metadata only: availability UNKNOWN and verifiedQuality
  // UNKNOWN until a real record exists. Nothing here claims a live
  // connection, a measured quality score, or an MTI6 execution.
  var MODELS = [
    {
      providerId: "openai", modelId: "gpt-4o",
      capabilities: ["text", "reasoning", "code", "vision"],
      contextTier: "large", costTier: "high", latencyTier: "medium",
      privacyTier: "low", availability: "UNKNOWN", verifiedQuality: "UNKNOWN",
      notes: "Flagship hosted text model. Availability unconfirmed."
    },
    {
      providerId: "openai", modelId: "gpt-4o-mini",
      capabilities: ["text", "code", "vision"],
      contextTier: "medium", costTier: "low", latencyTier: "low",
      privacyTier: "low", availability: "UNKNOWN", verifiedQuality: "UNKNOWN",
      notes: "Light hosted text model. Availability unconfirmed."
    },
    {
      providerId: "gemini", modelId: "gemini-2.5-pro",
      capabilities: ["text", "reasoning", "code", "vision", "audio"],
      contextTier: "large", costTier: "high", latencyTier: "high",
      privacyTier: "low", availability: "UNKNOWN", verifiedQuality: "UNKNOWN",
      notes: "Flagship hosted multimodal model. Availability unconfirmed."
    },
    {
      providerId: "gemini", modelId: "gemini-2.5-flash",
      capabilities: ["text", "reasoning", "code", "vision"],
      contextTier: "medium", costTier: "low", latencyTier: "low",
      privacyTier: "low", availability: "UNKNOWN", verifiedQuality: "UNKNOWN",
      notes: "Light hosted multimodal model. Availability unconfirmed."
    },
    {
      providerId: "huggingface", modelId: "llama-3.3-70b-instruct",
      capabilities: ["text", "reasoning", "code"],
      contextTier: "large", costTier: "medium", latencyTier: "high",
      privacyTier: "medium", availability: "UNKNOWN", verifiedQuality: "UNKNOWN",
      notes: "Open-weights instruction model. Availability unconfirmed."
    },
    {
      providerId: "huggingface", modelId: "mistral-7b-instruct",
      capabilities: ["text", "code"],
      contextTier: "small", costTier: "low", latencyTier: "low",
      privacyTier: "medium", availability: "UNKNOWN", verifiedQuality: "UNKNOWN",
      notes: "Small open-weights instruction model. Availability unconfirmed."
    },
    {
      providerId: "microsoft-github", modelId: "github-copilot-class",
      capabilities: ["text", "code"],
      contextTier: "medium", costTier: "medium", latencyTier: "medium",
      privacyTier: "low", availability: "UNKNOWN", verifiedQuality: "UNKNOWN",
      notes: "Copilot-class hosted coding assistance. Availability unconfirmed."
    },
    {
      providerId: "local", modelId: "local-small-llm",
      capabilities: ["text"],
      contextTier: "small", costTier: "low", latencyTier: "low",
      privacyTier: "high", availability: "UNKNOWN", verifiedQuality: "UNKNOWN",
      notes: "Small on-device model. Availability unconfirmed; no live check has run."
    },
    {
      providerId: "local", modelId: "local-medium-llm",
      capabilities: ["text", "reasoning", "code"],
      contextTier: "medium", costTier: "low", latencyTier: "medium",
      privacyTier: "high", availability: "UNKNOWN", verifiedQuality: "UNKNOWN",
      notes: "Medium on-device model. Availability unconfirmed; no live check has run."
    }
  ];

  // ---- Validation (knowledge-model style: error list, no throw) ---
  function validateProvider(provider) {
    var errors = [];
    if (!provider || typeof provider !== "object") {
      return ["Provider must be an object."];
    }
    Object.keys(provider).forEach(function (k) {
      if (isSecretKey(k)) {
        errors.push("Secret-looking field not allowed in a provider record: " + k + ".");
      }
    });
    if (!provider.id || typeof provider.id !== "string") {
      errors.push("Provider needs a string id.");
    }
    if (!provider.label || typeof provider.label !== "string") {
      errors.push("Provider needs a string label.");
    }
    if (provider.kinds !== undefined && !Array.isArray(provider.kinds)) {
      errors.push("Provider kinds must be an array.");
    }
    return errors;
  }

  function validateQuality(quality, errors) {
    if (quality === undefined || quality === null) return;
    if (quality === "UNKNOWN") return;
    if (typeof quality === "string") {
      if (knownTruthStates().indexOf(quality) === -1) {
        errors.push("Unknown verifiedQuality state: " + quality + ".");
      }
      return;
    }
    if (typeof quality !== "object") {
      errors.push("verifiedQuality must be \"UNKNOWN\" or an object {state, score?, source?, checkedAt?}.");
      return;
    }
    var state = quality.state || "UNKNOWN";
    if (knownTruthStates().indexOf(state) === -1) {
      errors.push("Unknown verifiedQuality state: " + state + ".");
    }
    if (quality.score !== undefined &&
        (typeof quality.score !== "number" || quality.score < 0 || quality.score > 1)) {
      errors.push("verifiedQuality score must be a number between 0 and 1.");
    }
    // A VERIFIED/LIVE quality claim needs a source and a timestamp,
    // exactly like a VERIFIED knowledge entry. Without both, the
    // claim is rejected, never silently accepted.
    if (state === "VERIFIED" || state === "LIVE") {
      if (!quality.source) {
        errors.push("A VERIFIED/LIVE verifiedQuality needs a source.");
      }
      if (!quality.checkedAt) {
        errors.push("A VERIFIED/LIVE verifiedQuality needs a checkedAt timestamp.");
      }
    }
    Object.keys(quality).forEach(function (k) {
      if (isSecretKey(k)) {
        errors.push("Secret-looking field not allowed in verifiedQuality: " + k + ".");
      }
    });
  }

  function validateModel(model) {
    var errors = [];
    if (!model || typeof model !== "object") {
      return ["Model must be an object."];
    }
    Object.keys(model).forEach(function (k) {
      if (isSecretKey(k)) {
        errors.push("Secret-looking field not allowed in a model record: " + k + ".");
      }
    });
    if (!model.providerId || typeof model.providerId !== "string") {
      errors.push("Model needs a string providerId.");
    } else if (!providerById(model.providerId)) {
      errors.push("Unknown providerId: " + model.providerId + ".");
    }
    if (!model.modelId || typeof model.modelId !== "string") {
      errors.push("Model needs a string modelId.");
    }
    if (model.capabilities !== undefined) {
      if (!Array.isArray(model.capabilities)) {
        errors.push("Model capabilities must be an array.");
      } else {
        model.capabilities.forEach(function (c) {
          if (CAPABILITIES.indexOf(c) === -1) {
            errors.push("Unknown capability: " + c + ".");
          }
        });
      }
    }
    [["contextTier", "context"], ["costTier", "cost"],
     ["latencyTier", "latency"], ["privacyTier", "privacy"]].forEach(function (pair) {
      var field = pair[0], kind = pair[1];
      if (model[field] !== undefined && tierRank(kind, model[field]) === null) {
        errors.push("Unknown " + field + ": " + model[field] +
          " (use " + TIERS[kind].join(", ") + ").");
      }
    });
    if (model.availability !== undefined &&
        knownTruthStates().indexOf(model.availability) === -1) {
      errors.push("Unknown availability state: " + model.availability + ".");
    }
    // securityCritical is an owner-set flag, not a score: it marks a
    // model whose ranking must never be changed by a proposal.
    if (model.securityCritical !== undefined && typeof model.securityCritical !== "boolean") {
      errors.push("securityCritical must be a boolean.");
    }
    validateQuality(model.verifiedQuality, errors);
    return errors;
  }

  function validateOutcome(record) {
    var errors = [];
    if (!record || typeof record !== "object") {
      return ["Outcome record must be an object."];
    }
    Object.keys(record).forEach(function (k) {
      if (isSecretKey(k)) {
        errors.push("Secret-looking field not allowed in an outcome record: " + k + ".");
      }
    });
    if (!record.botId || typeof record.botId !== "string") {
      errors.push("Outcome record needs a string botId.");
    }
    if (!record.modelId || typeof record.modelId !== "string") {
      errors.push("Outcome record needs a string modelId.");
    }
    if (!record.task || typeof record.task !== "string") {
      errors.push("Outcome record needs a string task.");
    }
    if (OUTCOMES.indexOf(record.outcome) === -1) {
      errors.push("Unknown outcome: " + record.outcome +
        " (use " + OUTCOMES.join(", ") + ").");
    }
    if (record.latencyMs !== undefined &&
        (typeof record.latencyMs !== "number" || record.latencyMs < 0)) {
      errors.push("latencyMs must be a non-negative number.");
    }
    return errors;
  }

  // Verification for a performance record: a Truth state, as a bare
  // state string or as {state, source?, checkedAt?}. The rule is the
  // same as for verifiedQuality elsewhere: VERIFIED/LIVE needs a
  // source and a checkedAt timestamp, and without both the claim is
  // rejected, never silently accepted. One deliberate difference
  // from verifiedQuality: a bare "VERIFIED"/"LIVE" string is also
  // rejected, because a bare string carries no source or timestamp
  // at all — a performance record claiming verification must be
  // able to name what verified it and when. "UNKNOWN" (or an
  // omitted verification) means the outcome was not verified —
  // never a success claim.
  function validateVerification(verification, errors) {
    if (verification === undefined || verification === null) return;
    if (typeof verification === "string") {
      if (knownTruthStates().indexOf(verification) === -1) {
        errors.push("Unknown verification state: " + verification + ".");
      } else if (verification === "VERIFIED" || verification === "LIVE") {
        errors.push("A VERIFIED/LIVE verification needs a source and a checkedAt timestamp; a bare state string carries neither.");
      }
      return;
    }
    if (typeof verification !== "object") {
      errors.push("verification must be a Truth state string or an object {state, source?, checkedAt?}.");
      return;
    }
    var state = verification.state || "UNKNOWN";
    if (knownTruthStates().indexOf(state) === -1) {
      errors.push("Unknown verification state: " + state + ".");
    }
    if (state === "VERIFIED" || state === "LIVE") {
      if (!verification.source) {
        errors.push("A VERIFIED/LIVE verification needs a source.");
      }
      if (!verification.checkedAt) {
        errors.push("A VERIFIED/LIVE verification needs a checkedAt timestamp.");
      }
    }
    Object.keys(verification).forEach(function (k) {
      if (isSecretKey(k)) {
        errors.push("Secret-looking field not allowed in verification: " + k + ".");
      }
    });
  }

  function validatePerformance(record) {
    var errors = [];
    if (!record || typeof record !== "object") {
      return ["Performance record must be an object."];
    }
    Object.keys(record).forEach(function (k) {
      if (isSecretKey(k)) {
        errors.push("Secret-looking field not allowed in a performance record: " + k + ".");
      }
    });
    if (!record.modelId || typeof record.modelId !== "string") {
      errors.push("Performance record needs a string modelId.");
    }
    if (TASK_CLASSES.indexOf(record.taskClass) === -1) {
      errors.push("Unknown taskClass: " + record.taskClass +
        " (use " + TASK_CLASSES.join(", ") + ").");
    }
    if (OUTCOMES.indexOf(record.outcome) === -1) {
      errors.push("Unknown outcome: " + record.outcome +
        " (use " + OUTCOMES.join(", ") + ").");
    }
    validateVerification(record.verification, errors);
    if (record.latencyMs !== undefined &&
        (typeof record.latencyMs !== "number" || record.latencyMs < 0)) {
      errors.push("latencyMs must be a non-negative number.");
    }
    if (record.costNote !== undefined && typeof record.costNote !== "string") {
      errors.push("costNote must be a string.");
    }
    if (record.retries !== undefined &&
        (typeof record.retries !== "number" || record.retries < 0 ||
         Math.floor(record.retries) !== record.retries)) {
      errors.push("retries must be a non-negative integer.");
    }
    if (record.fallbackUsed !== undefined && typeof record.fallbackUsed !== "boolean") {
      errors.push("fallbackUsed must be a boolean.");
    }
    if (record.usefulness !== undefined && record.usefulness !== null &&
        (typeof record.usefulness !== "number" ||
         Math.floor(record.usefulness) !== record.usefulness ||
         record.usefulness < 1 || record.usefulness > 5)) {
      errors.push("usefulness must be a 1-5 integer rating or null.");
    }
    if (record.correction !== undefined && record.correction !== null) {
      if (typeof record.correction !== "object") {
        errors.push("correction must be a correction record object or null.");
      } else {
        Object.keys(record.correction).forEach(function (k) {
          if (isSecretKey(k)) {
            errors.push("Secret-looking field not allowed in correction: " + k + ".");
          }
        });
        if (record.correction.by !== undefined && typeof record.correction.by !== "string") {
          errors.push("correction.by must be a string (owner id or worker id).");
        }
        if (record.correction.note !== undefined && typeof record.correction.note !== "string") {
          errors.push("correction.note must be a string.");
        }
        if (record.correction.at !== undefined && typeof record.correction.at !== "string") {
          errors.push("correction.at must be a string timestamp.");
        }
      }
    }
    return errors;
  }

  // A ranking proposal names a real registered model (a proposal for
  // a phantom model is refused), a closed task class, a direction,
  // and a reason. proposedBy names who proposed it (owner id or
  // worker id) — a proposal is a record of a suggestion, never an
  // application of a change.
  function validateRankingProposal(input) {
    var errors = [];
    if (!input || typeof input !== "object") {
      return ["Ranking proposal must be an object."];
    }
    Object.keys(input).forEach(function (k) {
      if (isSecretKey(k)) {
        errors.push("Secret-looking field not allowed in a ranking proposal: " + k + ".");
      }
    });
    if (!input.modelId || typeof input.modelId !== "string") {
      errors.push("Ranking proposal needs a string modelId.");
    } else if (!modelsByModelId(input.modelId).length) {
      errors.push("Unknown model: " + input.modelId + ".");
    }
    if (TASK_CLASSES.indexOf(input.taskClass) === -1) {
      errors.push("Unknown taskClass: " + input.taskClass +
        " (use " + TASK_CLASSES.join(", ") + ").");
    }
    if (RANKING_DIRECTIONS.indexOf(input.direction) === -1) {
      errors.push("Unknown direction: " + input.direction +
        " (use " + RANKING_DIRECTIONS.join(", ") + ").");
    }
    if (!input.reason || typeof input.reason !== "string" || !input.reason.trim()) {
      errors.push("Ranking proposal needs a non-empty string reason.");
    }
    if (!input.proposedBy || typeof input.proposedBy !== "string" || !input.proposedBy.trim()) {
      errors.push("Ranking proposal needs a non-empty string proposedBy.");
    }
    return errors;
  }

  // An owner approval record: who approved, and when. The scope is
  // the proposal itself (proposalId), so no separate scope string
  // is needed here — unlike learning proposals, which carry their
  // own target.
  function validateRankingApproval(approval) {
    var errors = [];
    if (!approval || typeof approval !== "object") {
      return ["Approval must be an object {approvedBy, approvedAt}."];
    }
    if (!approval.approvedBy || typeof approval.approvedBy !== "string" || !approval.approvedBy.trim()) {
      errors.push("approval.approvedBy is required and must be a non-empty string.");
    }
    if (!approval.approvedAt || typeof approval.approvedAt !== "string" || !approval.approvedAt.trim()) {
      errors.push("approval.approvedAt is required and must be a non-empty string.");
    }
    return errors;
  }

  // ---- Lookups ------------------------------------------------------
  function providerById(id) {
    for (var i = 0; i < PROVIDERS.length; i++) {
      if (PROVIDERS[i].id === id) return PROVIDERS[i];
    }
    return null;
  }

  function modelById(providerId, modelId) {
    for (var i = 0; i < MODELS.length; i++) {
      if (MODELS[i].providerId === providerId && MODELS[i].modelId === modelId) {
        return MODELS[i];
      }
    }
    return null;
  }

  // All registry entries sharing one modelId (modelIds are unique
  // per provider, not globally). Ranking proposals match by modelId
  // alone, so the security-critical check is fail-closed: if ANY
  // entry with that modelId is security-critical, the model counts
  // as security-critical.
  function modelsByModelId(modelId) {
    var out = [];
    for (var i = 0; i < MODELS.length; i++) {
      if (MODELS[i].modelId === modelId) out.push(MODELS[i]);
    }
    return out;
  }

  // A model is provider/security-critical when its registry record
  // carries securityCritical: true. The flag is set at registration
  // by the owner; it marks a model whose ranking must never be
  // changed by a proposal — only an owner security approval could
  // ever touch it, and no such approval path exists in this unit,
  // so proposals touching it are rejected outright.
  function isSecurityCriticalModel(modelId) {
    var matches = modelsByModelId(modelId);
    for (var i = 0; i < matches.length; i++) {
      if (matches[i].securityCritical === true) return true;
    }
    return false;
  }

  function providerLabel(id) {
    var p = providerById(id);
    return p ? p.label : id;
  }

  // ---- In-memory state: results log + audit log --------------------
  // Both are bounded (max 200) and in-memory only: no storage, no
  // network. Recording an outcome never rewrites security boundaries
  // or permissions; routing stays INFORMATIONAL.
  var resultsLog = [];
  var auditLog = [];

  // Performance log (bounded at 500, oldest dropped) and ranking
  // proposals (bounded at 200). Applied ranking adjustments are
  // kept as their own small list so route() can honour them without
  // re-scanning proposals; they are created only by
  // applyRankingChange with an owner approval record. In-memory
  // only: no storage, no network.
  var performanceLog = [];
  var rankingProposals = [];
  var rankingAdjustments = [];

  function appendAudit(entry) {
    auditLog.unshift(entry);
    if (auditLog.length > AUDIT_MAX) auditLog.length = AUDIT_MAX;
  }

  function auditRoute(request, result) {
    appendAudit({
      at: new Date().toISOString(),
      kind: "route",
      botId: request && request.botId ? String(request.botId) : "",
      task: request && request.task ? String(request.task) : "",
      candidates: result.candidates.length,
      reason: result.reason
    });
  }

  // Per-model aggregates from the recorded results log. Outcomes are
  // recorded, never invented: a model with no recorded outcomes has
  // no history signal at all (null), not an assumed success rate.
  function historyFor(modelId) {
    var successes = 0, failures = 0, partials = 0, total = 0;
    for (var i = 0; i < resultsLog.length; i++) {
      if (resultsLog[i].modelId !== modelId) continue;
      total++;
      if (resultsLog[i].outcome === "success") successes++;
      else if (resultsLog[i].outcome === "failure") failures++;
      else if (resultsLog[i].outcome === "partial") partials++;
    }
    if (!total) return null;
    return {
      total: total, successes: successes, failures: failures,
      partials: partials,
      // Signed history signal, clamped to [-10, +10]: each recorded
      // failure demotes by 2, each success promotes by 2, a partial
      // counts as half a success. Never invented — zero when empty.
      adjustment: Math.max(-10, Math.min(10, 2 * (successes - failures) + partials))
    };
  }

  // ---- Scoring ------------------------------------------------------
  // Deterministic, documented weights. Capability match outranks cost:
  // every required capability is worth 10 and each extra capability
  // +3 (capped at +9), while the cheapest cost tier is worth at most
  // +6 — so a more capable model always beats a cheaper, less capable
  // one when both meet the required capabilities.
  var AVAILABILITY_SCORE = {
    LIVE: 8, VERIFIED: 6, UNKNOWN: 0, UNVERIFIED: -2, STALE: -6
  };
  // Models known to be unreachable are never candidates at all.
  var AVAILABILITY_EXCLUDED = ["UNAVAILABLE", "DISABLED", "NOT_CONNECTED"];

  function qualityScore(quality) {
    if (!quality || quality === "UNKNOWN") return 0;
    if (typeof quality === "string") return 0;
    if ((quality.state === "VERIFIED" || quality.state === "LIVE") &&
        typeof quality.score === "number") {
      return quality.score * 20;
    }
    return 0;
  }

  // The task class a route request is scored under. An explicit
  // request.taskClass wins (route() already rejected an unknown
  // one). Otherwise a SINGLE required capability that names a task
  // class directly (text, reasoning, code, vision, audio, search)
  // infers it; several required capabilities together name no
  // single class, so no class is inferred and no performance signal
  // applies. Returns null when no class applies.
  function resolveTaskClass(request) {
    if (!request || typeof request !== "object") return null;
    if (request.taskClass !== undefined && request.taskClass !== null) {
      return TASK_CLASSES.indexOf(request.taskClass) !== -1
        ? request.taskClass : null;
    }
    var required = asArray(request.requiredCapabilities);
    if (required.length === 1 &&
        CAPABILITY_TASK_CLASSES.indexOf(required[0]) !== -1) {
      return required[0];
    }
    return null;
  }

  // Recorded performance for one model + task class, from the
  // performance log only. Returns null when nothing is recorded —
  // no history is never treated as a failure.
  function performanceFor(modelId, taskClass) {
    var successes = 0, failures = 0, partials = 0, total = 0;
    for (var i = 0; i < performanceLog.length; i++) {
      var rec = performanceLog[i];
      if (rec.modelId !== modelId || rec.taskClass !== taskClass) continue;
      total++;
      if (rec.outcome === "success") successes++;
      else if (rec.outcome === "failure") failures++;
      else if (rec.outcome === "partial") partials++;
    }
    if (!total) return null;
    return {
      total: total, successes: successes, failures: failures,
      partials: partials,
      // Signed signal, clamped to +/-5: each recorded failure
      // demotes by 2, each success promotes by 2, a partial counts
      // as half a success. Small on purpose — it breaks ties and
      // nudges rank, never overrides capability, verified quality,
      // or availability.
      adjustment: Math.max(-PERFORMANCE_SIGNAL_MAX,
        Math.min(PERFORMANCE_SIGNAL_MAX,
          2 * (successes - failures) + partials))
    };
  }

  // Total applied ranking adjustment for one model + task class:
  // one applied proposal is +/-4; several sum, clamped to +/-8.
  // Returns 0 when no applied proposal covers this model + class.
  function appliedRankingAdjustment(modelId, taskClass) {
    var total = 0;
    for (var i = 0; i < rankingAdjustments.length; i++) {
      var adj = rankingAdjustments[i];
      if (adj.modelId === modelId && adj.taskClass === taskClass) {
        total += adj.adjustment;
      }
    }
    return Math.max(-RANKING_ADJUSTMENT_TOTAL_MAX,
      Math.min(RANKING_ADJUSTMENT_TOTAL_MAX, total));
  }

  function scoreModel(model, request) {
    var required = asArray(request.requiredCapabilities);
    var reasons = [];
    var score = 0;

    // Capability match (hard-gated before scoring; extras add up).
    score += required.length * 10;
    reasons.push("matches all " + required.length + " required " +
      (required.length === 1 ? "capability" : "capabilities") +
      (required.length ? " (" + required.join(", ") + ")" : "") + ".");
    var extra = 0;
    model.capabilities.forEach(function (c) {
      if (required.indexOf(c) === -1) extra++;
    });
    if (extra) {
      var extraBonus = Math.min(9, extra * 3);
      score += extraBonus;
      reasons.push("adds " + extra + " extra " +
        (extra === 1 ? "capability" : "capabilities") + " (+" + extraBonus + ").");
    }

    // Verified quality: only a real evaluation record counts.
    var qs = qualityScore(model.verifiedQuality);
    if (qs > 0) {
      score += qs;
      reasons.push("verified quality score " +
        model.verifiedQuality.score + " (+" + qs.toFixed(1) + ").");
    } else {
      reasons.push("verified quality UNKNOWN — no evaluation record; no score assumed.");
    }

    // Availability: LIVE/VERIFIED help; UNKNOWN is neutral; anything
    // worse is penalised. A model is never claimed live here.
    var av = AVAILABILITY_SCORE[model.availability];
    if (av === undefined) av = 0;
    score += av;
    reasons.push("availability " + model.availability +
      (av > 0 ? " (+" + av + ")" : av < 0 ? " (" + av + ")" : " — not confirmed live") + ".");

    // Latency / cost: low is better, worth at most +6 each.
    var latRank = tierRank("latency", model.latencyTier);
    var latBonus = latRank === 1 ? 6 : latRank === 2 ? 3 : 0;
    score += latBonus;
    reasons.push("latency tier " + model.latencyTier + " (+" + latBonus + ").");
    var costRank = tierRank("cost", model.costTier);
    var costBonus = costRank === 1 ? 6 : costRank === 2 ? 3 : 0;
    score += costBonus;
    reasons.push("cost tier " + model.costTier + " (+" + costBonus + ").");

    // Context: meeting the requested context earns +4.
    if (request.constraints && request.constraints.contextNeeded) {
      score += 4;
      reasons.push("context tier " + model.contextTier +
        " meets requested " + request.constraints.contextNeeded + " (+4).");
    }

    // Privacy: high is better, worth at most +6.
    var privRank = tierRank("privacy", model.privacyTier);
    var privBonus = privRank === 3 ? 6 : privRank === 2 ? 3 : 0;
    score += privBonus;
    reasons.push("privacy tier " + model.privacyTier + " (+" + privBonus + ").");

    // Historical MTI6 results: recorded outcomes only.
    var hist = historyFor(model.modelId);
    if (hist) {
      score += hist.adjustment;
      reasons.push("MTI6 results log: " + hist.successes + " success, " +
        hist.failures + " failure, " + hist.partials + " partial in " +
        hist.total + " recorded " + (hist.total === 1 ? "outcome" : "outcomes") +
        " (" + (hist.adjustment >= 0 ? "+" : "") + hist.adjustment + ").");
    } else {
      reasons.push("no recorded MTI6 outcomes for this model; no history assumed.");
    }

    // Task-class performance signal: recorded performance for the
    // request's task class only, bounded to +/-5. A model with a
    // recorded success history for the class ranks above an
    // otherwise identical model without one; recorded failures
    // demote it. No recorded performance means no signal at all.
    var taskClass = resolveTaskClass(request);
    if (taskClass) {
      var perf = performanceFor(model.modelId, taskClass);
      if (perf) {
        score += perf.adjustment;
        reasons.push("performance log for task class " + taskClass + ": " +
          perf.successes + " success, " + perf.failures + " failure, " +
          perf.partials + " partial in " + perf.total + " recorded " +
          (perf.total === 1 ? "record" : "records") +
          " (" + (perf.adjustment >= 0 ? "+" : "") + perf.adjustment + ").");
      } else {
        reasons.push("no recorded performance for task class " + taskClass +
          "; no performance signal assumed.");
      }

      // Owner-approved ranking adjustments for this model + class.
      var rankAdj = appliedRankingAdjustment(model.modelId, taskClass);
      if (rankAdj !== 0) {
        score += rankAdj;
        reasons.push("owner-approved ranking adjustment for task class " +
          taskClass + " (" + (rankAdj >= 0 ? "+" : "") + rankAdj + ").");
      }
    }

    return { score: score, reasons: reasons };
  }

  function constraintsPass(model, constraints) {
    if (!constraints) return { pass: true, reason: "" };
    if (constraints.maxCostTier !== undefined) {
      var maxCost = tierRank("cost", constraints.maxCostTier);
      if (maxCost === null) return { pass: false, reason: "unknown maxCostTier: " + constraints.maxCostTier };
      if (tierRank("cost", model.costTier) > maxCost) {
        return { pass: false, reason: "cost tier " + model.costTier + " exceeds max " + constraints.maxCostTier };
      }
    }
    if (constraints.maxLatencyTier !== undefined) {
      var maxLat = tierRank("latency", constraints.maxLatencyTier);
      if (maxLat === null) return { pass: false, reason: "unknown maxLatencyTier: " + constraints.maxLatencyTier };
      if (tierRank("latency", model.latencyTier) > maxLat) {
        return { pass: false, reason: "latency tier " + model.latencyTier + " exceeds max " + constraints.maxLatencyTier };
      }
    }
    if (constraints.minPrivacyTier !== undefined) {
      var minPriv = tierRank("privacy", constraints.minPrivacyTier);
      if (minPriv === null) return { pass: false, reason: "unknown minPrivacyTier: " + constraints.minPrivacyTier };
      if (tierRank("privacy", model.privacyTier) < minPriv) {
        return { pass: false, reason: "privacy tier " + model.privacyTier + " is below min " + constraints.minPrivacyTier };
      }
    }
    if (constraints.contextNeeded !== undefined) {
      var needCtx = tierRank("context", constraints.contextNeeded);
      if (needCtx === null) return { pass: false, reason: "unknown contextNeeded: " + constraints.contextNeeded };
      if (tierRank("context", model.contextTier) < needCtx) {
        return { pass: false, reason: "context tier " + model.contextTier + " is below needed " + constraints.contextNeeded };
      }
    }
    return { pass: true, reason: "" };
  }

  function assignmentFor(botId, model) {
    return {
      botId: botId,
      modelId: model.modelId,
      providerId: model.providerId,
      providerLabel: providerLabel(model.providerId)
    };
  }

  // ---- Routing ------------------------------------------------------
  function route(request) {
    var req = (request && typeof request === "object") ? request : {};
    var botId = typeof req.botId === "string" ? req.botId : "";
    var task = typeof req.task === "string" ? req.task : "";
    var base = { botId: botId, task: task, candidates: [], reason: "" };

    if (!botId || !task) {
      base.reason = "INVALID_REQUEST";
      auditRoute(req, base);
      return base;
    }

    var required = asArray(req.requiredCapabilities);
    var unknownCap = null;
    required.forEach(function (c) {
      if (CAPABILITIES.indexOf(c) === -1 && !unknownCap) unknownCap = c;
    });
    if (unknownCap) {
      base.reason = "INVALID_REQUEST";
      base.detail = "Unknown required capability: " + unknownCap + ".";
      auditRoute(req, base);
      return base;
    }

    // An explicitly named task class must be in the closed set.
    // (An omitted taskClass is fine — it is inferred from a single
    // required capability, or no performance signal applies.)
    if (req.taskClass !== undefined && req.taskClass !== null &&
        TASK_CLASSES.indexOf(req.taskClass) === -1) {
      base.reason = "INVALID_REQUEST";
      base.detail = "Unknown taskClass: " + req.taskClass + ".";
      auditRoute(req, base);
      return base;
    }

    var scored = [];
    MODELS.forEach(function (model) {
      // Hard gate 1: every required capability must be present.
      var missing = [];
      required.forEach(function (c) {
        if (model.capabilities.indexOf(c) === -1) missing.push(c);
      });
      if (missing.length) return;
      // Hard gate 2: known-unreachable models are never candidates.
      if (AVAILABILITY_EXCLUDED.indexOf(model.availability) !== -1) return;
      // Hard gate 3: constraints.
      var check = constraintsPass(model, req.constraints);
      if (!check.pass) return;
      var s = scoreModel(model, req);
      scored.push({ model: model, score: s.score, reasons: s.reasons });
    });

    if (!scored.length) {
      base.reason = "NO_MATCHING_MODEL";
      base.detail = "No registered model meets the required capabilities" +
        (required.length ? " (" + required.join(", ") + ")" : "") +
        " within the given constraints, or every matching model is known unreachable.";
      auditRoute(req, base);
      return base;
    }

    // Rank: score desc, then availability (LIVE > VERIFIED > UNKNOWN
    // > UNVERIFIED > STALE), then cheaper, then faster, then modelId
    // for a deterministic order.
    var availRank = { LIVE: 5, VERIFIED: 4, UNKNOWN: 3, UNVERIFIED: 2, STALE: 1 };
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      var av = (availRank[b.model.availability] || 0) - (availRank[a.model.availability] || 0);
      if (av) return av;
      var cost = tierRank("cost", a.model.costTier) - tierRank("cost", b.model.costTier);
      if (cost) return cost;
      var lat = tierRank("latency", a.model.latencyTier) - tierRank("latency", b.model.latencyTier);
      if (lat) return lat;
      return a.model.modelId < b.model.modelId ? -1 : a.model.modelId > b.model.modelId ? 1 : 0;
    });

    base.candidates = scored.map(function (entry) {
      return {
        assignment: assignmentFor(botId, entry.model),
        model: clone(entry.model),
        score: entry.score,
        reasons: entry.reasons
      };
    });
    base.reason = "OK";
    auditRoute(req, base);
    return base;
  }

  // ---- Fallback chains ----------------------------------------------
  // Ordered alternatives for a chosen assignment: same-provider other
  // models first (by routing rank when a request is given, else by
  // tier preference), then other providers by rank. The chosen model
  // itself is never in its own fallback list, and the bot identity
  // is carried through unchanged.
  function fallbackChain(assignment, request) {
    var out = [];
    if (!assignment || typeof assignment !== "object") return out;
    var botId = typeof assignment.botId === "string" ? assignment.botId : "";
    var chosen = modelById(assignment.providerId, assignment.modelId);
    if (!chosen) return out;

    function rankList(models) {
      if (request && typeof request === "object" && (request.botId || request.task)) {
        var req = clone(request);
        req.botId = botId || req.botId || "";
        req.task = req.task || "fallback";
        var routed = route(req);
        var order = {};
        routed.candidates.forEach(function (c, i) { order[c.model.modelId] = i; });
        return models.slice().sort(function (a, b) {
          var ia = order[a.modelId], ib = order[b.modelId];
          if (ia === undefined) ia = 1000;
          if (ib === undefined) ib = 1000;
          return ia - ib;
        });
      }
      return models.slice().sort(function (a, b) {
        var cost = tierRank("cost", a.costTier) - tierRank("cost", b.costTier);
        if (cost) return cost;
        var lat = tierRank("latency", a.latencyTier) - tierRank("latency", b.latencyTier);
        if (lat) return lat;
        var priv = tierRank("privacy", b.privacyTier) - tierRank("privacy", a.privacyTier);
        if (priv) return priv;
        return a.modelId < b.modelId ? -1 : a.modelId > b.modelId ? 1 : 0;
      });
    }

    var sameProvider = MODELS.filter(function (m) {
      return m.providerId === chosen.providerId && m.modelId !== chosen.modelId &&
        AVAILABILITY_EXCLUDED.indexOf(m.availability) === -1;
    });
    var otherProviders = MODELS.filter(function (m) {
      return m.providerId !== chosen.providerId &&
        AVAILABILITY_EXCLUDED.indexOf(m.availability) === -1;
    });
    rankList(sameProvider).forEach(function (m) { out.push(assignmentFor(botId, m)); });
    rankList(otherProviders).forEach(function (m) { out.push(assignmentFor(botId, m)); });
    return out;
  }

  // ---- Outcome recording --------------------------------------------
  function recordOutcome(record) {
    var errors = validateOutcome(record);
    if (errors.length) {
      return { recorded: false, errors: errors };
    }
    var entry = {
      botId: String(record.botId),
      modelId: String(record.modelId),
      task: String(record.task),
      outcome: record.outcome,
      at: record.at ? String(record.at) : new Date().toISOString()
    };
    if (record.latencyMs !== undefined) entry.latencyMs = record.latencyMs;
    if (record.costNote !== undefined) entry.costNote = String(record.costNote);
    resultsLog.push(entry);
    if (resultsLog.length > RESULTS_MAX) {
      resultsLog.splice(0, resultsLog.length - RESULTS_MAX);
    }
    appendAudit({
      at: entry.at, kind: "outcome", botId: entry.botId,
      modelId: entry.modelId, task: entry.task, outcome: entry.outcome
    });
    return { recorded: true, entry: clone(entry), logSize: resultsLog.length };
  }

  // ---- Performance tracking by task class and model -------------
  // Records are stored, never invented: every figure in a summary
  // comes from recorded performance only. Rates are null, never a
  // fabricated number, when there is no data behind them.
  function recordPerformance(record) {
    var errors = validatePerformance(record);
    if (errors.length) {
      return { recorded: false, errors: errors };
    }
    var entry = {
      modelId: String(record.modelId),
      taskClass: record.taskClass,
      outcome: record.outcome,
      verification: record.verification === undefined
        ? "UNKNOWN" : clone(record.verification),
      at: record.at ? String(record.at) : new Date().toISOString()
    };
    if (record.latencyMs !== undefined) entry.latencyMs = record.latencyMs;
    if (record.costNote !== undefined) entry.costNote = String(record.costNote);
    if (record.retries !== undefined) entry.retries = record.retries;
    if (record.fallbackUsed !== undefined) entry.fallbackUsed = record.fallbackUsed;
    if (record.correction !== undefined && record.correction !== null) {
      entry.correction = clone(record.correction);
    } else {
      entry.correction = null;
    }
    if (record.usefulness !== undefined && record.usefulness !== null) {
      entry.usefulness = record.usefulness;
    } else {
      entry.usefulness = null;
    }
    performanceLog.push(entry);
    if (performanceLog.length > PERFORMANCE_MAX) {
      performanceLog.splice(0, performanceLog.length - PERFORMANCE_MAX);
    }
    appendAudit({
      at: entry.at, kind: "performance", modelId: entry.modelId,
      taskClass: entry.taskClass, outcome: entry.outcome
    });
    return { recorded: true, entry: clone(entry), logSize: performanceLog.length };
  }

  function getPerformanceLog() { return clone(performanceLog); }
  function clearPerformanceLog() { performanceLog.length = 0; return true; }

  function roundRate(value) {
    return Math.round(value * 10000) / 10000;
  }

  function emptyPerformanceSummary() {
    return {
      total: 0, success: 0, failure: 0, partial: 0,
      successRate: null, avgLatencyMs: null, fallbackRate: null,
      correctionCount: 0
    };
  }

  // One summary over a set of performance records. successRate and
  // fallbackRate are null when there are no records at all;
  // avgLatencyMs is null when no record carries latency data.
  // Nothing is ever filled in with an assumed rate.
  function summarizePerformance(records) {
    var summary = emptyPerformanceSummary();
    var latencySum = 0, latencyCount = 0, fallbackCount = 0;
    records.forEach(function (rec) {
      summary.total++;
      if (rec.outcome === "success") summary.success++;
      else if (rec.outcome === "failure") summary.failure++;
      else if (rec.outcome === "partial") summary.partial++;
      if (typeof rec.latencyMs === "number") {
        latencySum += rec.latencyMs;
        latencyCount++;
      }
      if (rec.fallbackUsed === true) fallbackCount++;
      if (rec.correction !== undefined && rec.correction !== null) {
        summary.correctionCount++;
      }
    });
    if (summary.total > 0) {
      summary.successRate = roundRate(summary.success / summary.total);
      summary.fallbackRate = roundRate(fallbackCount / summary.total);
    }
    if (latencyCount > 0) {
      summary.avgLatencyMs = Math.round((latencySum / latencyCount) * 100) / 100;
    }
    return summary;
  }

  // Grouped breakdown of one record set by one key (modelId or
  // taskClass): each group is a full summary plus its key, sorted
  // by key so the order is deterministic.
  function groupedPerformance(records, key) {
    var groups = {};
    records.forEach(function (rec) {
      var k = rec[key];
      if (!groups[k]) groups[k] = [];
      groups[k].push(rec);
    });
    var out = [];
    Object.keys(groups).sort().forEach(function (k) {
      var summary = summarizePerformance(groups[k]);
      summary[key] = k;
      out.push(summary);
    });
    return out;
  }

  function performanceByTaskClass(taskClass) {
    if (TASK_CLASSES.indexOf(taskClass) === -1) {
      return { ok: false, errors: ["Unknown taskClass: " + taskClass +
        " (use " + TASK_CLASSES.join(", ") + ")."] };
    }
    var records = performanceLog.filter(function (rec) {
      return rec.taskClass === taskClass;
    });
    var summary = summarizePerformance(records);
    summary.taskClass = taskClass;
    summary.byModel = groupedPerformance(records, "modelId");
    return summary;
  }

  function performanceByModel(modelId) {
    if (!modelId || typeof modelId !== "string") {
      return { ok: false, errors: ["performanceByModel needs a string modelId."] };
    }
    var records = performanceLog.filter(function (rec) {
      return rec.modelId === modelId;
    });
    var summary = summarizePerformance(records);
    summary.modelId = modelId;
    summary.byTaskClass = groupedPerformance(records, "taskClass");
    return summary;
  }

  // ---- Ranking proposals (never self-applying) --------------------
  function findRankingProposal(proposalId) {
    for (var i = 0; i < rankingProposals.length; i++) {
      if (rankingProposals[i].proposalId === proposalId) return rankingProposals[i];
    }
    return null;
  }

  // Records a ranking suggestion. The returned record has state
  // "PROPOSED" and applied: false — proposing NEVER applies a
  // ranking change. A proposal touching a provider/security-critical
  // model is recorded with state "REJECTED" and rejectionReason
  // "REQUIRES_OWNER_SECURITY_APPROVAL" instead: it is recorded so
  // the attempt is visible, it is never applied, and no approval
  // can rescue it — critical provider/security approval can never
  // be bypassed by a ranking proposal.
  function proposeRankingChange(input) {
    var errors = validateRankingProposal(input);
    if (errors.length) {
      return { ok: false, errors: errors };
    }
    var proposal = {
      proposalId: newId("rank"),
      modelId: String(input.modelId),
      taskClass: input.taskClass,
      direction: input.direction,
      reason: String(input.reason).trim(),
      proposedBy: String(input.proposedBy).trim(),
      state: "PROPOSED",
      applied: false,
      createdAt: new Date().toISOString()
    };
    if (isSecurityCriticalModel(proposal.modelId)) {
      proposal.state = "REJECTED";
      proposal.rejectionReason = "REQUIRES_OWNER_SECURITY_APPROVAL";
      rankingProposals.push(proposal);
      if (rankingProposals.length > PROPOSALS_MAX) {
        rankingProposals.splice(0, rankingProposals.length - PROPOSALS_MAX);
      }
      appendAudit({
        at: proposal.createdAt, kind: "ranking-proposal-rejected",
        proposalId: proposal.proposalId, modelId: proposal.modelId,
        taskClass: proposal.taskClass, direction: proposal.direction,
        reason: proposal.rejectionReason
      });
      return clone(proposal);
    }
    rankingProposals.push(proposal);
    if (rankingProposals.length > PROPOSALS_MAX) {
      rankingProposals.splice(0, rankingProposals.length - PROPOSALS_MAX);
    }
    appendAudit({
      at: proposal.createdAt, kind: "ranking-proposal",
      proposalId: proposal.proposalId, modelId: proposal.modelId,
      taskClass: proposal.taskClass, direction: proposal.direction
    });
    return clone(proposal);
  }

  // Applies a PROPOSED ranking proposal — only with an owner
  // approval record {approvedBy, approvedAt}. Without one the
  // result is {applied: false, reason: "REQUIRES_APPROVAL"} and
  // nothing changes. The security boundary is checked BEFORE the
  // approval check: a REJECTED (security-critical) proposal stays
  // rejected, approval or not. Applying records the application
  // and creates the bounded ranking adjustment route() honours for
  // that model + task class; it does not itself execute anything.
  function applyRankingChange(proposalId, approval) {
    var proposal = findRankingProposal(proposalId);
    if (!proposal) {
      return { applied: false, reason: "NOT_FOUND" };
    }
    if (proposal.state === "REJECTED") {
      return { applied: false,
        reason: proposal.rejectionReason || "REQUIRES_OWNER_SECURITY_APPROVAL" };
    }
    if (proposal.state === "APPLIED") {
      return { applied: false, reason: "ALREADY_APPLIED" };
    }
    if (proposal.state !== "PROPOSED") {
      return { applied: false, reason: "NOT_PROPOSED" };
    }
    if (!approval) {
      return { applied: false, reason: "REQUIRES_APPROVAL" };
    }
    var approvalErrors = validateRankingApproval(approval);
    if (approvalErrors.length) {
      return { applied: false, reason: "INVALID_APPROVAL", errors: approvalErrors };
    }
    proposal.state = "APPLIED";
    proposal.applied = true;
    proposal.appliedAt = new Date().toISOString();
    proposal.approval = {
      approvedBy: String(approval.approvedBy).trim(),
      approvedAt: String(approval.approvedAt).trim()
    };
    rankingAdjustments.push({
      proposalId: proposal.proposalId,
      modelId: proposal.modelId,
      taskClass: proposal.taskClass,
      direction: proposal.direction,
      adjustment: proposal.direction === "promote"
        ? RANKING_ADJUSTMENT : -RANKING_ADJUSTMENT,
      appliedAt: proposal.appliedAt,
      approvedBy: proposal.approval.approvedBy
    });
    appendAudit({
      at: proposal.appliedAt, kind: "ranking-applied",
      proposalId: proposal.proposalId, modelId: proposal.modelId,
      taskClass: proposal.taskClass, direction: proposal.direction,
      approvedBy: proposal.approval.approvedBy
    });
    return { applied: true, proposal: clone(proposal) };
  }

  function getRankingProposals() { return clone(rankingProposals); }
  function clearRankingProposals() {
    rankingProposals.length = 0;
    rankingAdjustments.length = 0;
    return true;
  }

  // ---- Registry management ------------------------------------------
  function registerProvider(provider) {
    var errors = validateProvider(provider);
    if (errors.length) return { ok: false, errors: errors };
    if (providerById(provider.id)) {
      return { ok: false, errors: ["Provider already registered: " + provider.id + "."] };
    }
    PROVIDERS.push({
      id: provider.id, label: provider.label,
      kinds: asArray(provider.kinds), notes: provider.notes ? String(provider.notes) : ""
    });
    return { ok: true, provider: clone(providerById(provider.id)) };
  }

  function registerModel(model) {
    var errors = validateModel(model);
    if (errors.length) return { ok: false, errors: errors };
    if (modelById(model.providerId, model.modelId)) {
      return { ok: false, errors: ["Model already registered: " + model.providerId + "/" + model.modelId + "."] };
    }
    var entry = {
      providerId: model.providerId, modelId: model.modelId,
      capabilities: asArray(model.capabilities),
      contextTier: model.contextTier || "small",
      costTier: model.costTier || "medium",
      latencyTier: model.latencyTier || "medium",
      privacyTier: model.privacyTier || "low",
      availability: model.availability || "UNKNOWN",
      verifiedQuality: model.verifiedQuality === undefined ? "UNKNOWN" : clone(model.verifiedQuality),
      securityCritical: model.securityCritical === true,
      notes: model.notes ? String(model.notes) : ""
    };
    MODELS.push(entry);
    return { ok: true, model: clone(entry) };
  }

  // Availability is only ever set by an explicit record. VERIFIED or
  // LIVE requires a source and a checkedAt timestamp; without both
  // the request is refused and the previous state is kept.
  function setAvailability(providerId, modelId, state, record) {
    var model = modelById(providerId, modelId);
    if (!model) return { ok: false, errors: ["Unknown model: " + providerId + "/" + modelId + "."] };
    if (knownTruthStates().indexOf(state) === -1) {
      return { ok: false, errors: ["Unknown availability state: " + state + "."] };
    }
    if (state === "VERIFIED" || state === "LIVE") {
      var rec = record || {};
      if (!rec.source) {
        return { ok: false, errors: ["A VERIFIED/LIVE availability needs a source. State not changed."] };
      }
      if (!rec.checkedAt) {
        return { ok: false, errors: ["A VERIFIED/LIVE availability needs a checkedAt timestamp. State not changed."] };
      }
    }
    model.availability = state;
    appendAudit({
      at: new Date().toISOString(), kind: "availability",
      modelId: modelId, providerId: providerId, state: state
    });
    return { ok: true, model: clone(model) };
  }

  function setVerifiedQuality(providerId, modelId, quality) {
    var model = modelById(providerId, modelId);
    if (!model) return { ok: false, errors: ["Unknown model: " + providerId + "/" + modelId + "."] };
    var errors = [];
    validateQuality(quality, errors);
    if (errors.length) return { ok: false, errors: errors };
    model.verifiedQuality = quality === undefined ? "UNKNOWN" : clone(quality);
    return { ok: true, model: clone(model) };
  }

  // ---- Read access ------------------------------------------------
  // listProviders/listModels return copies — callers cannot mutate
  // the registry through them. The PROVIDERS/MODELS properties
  // exposed below are the live registry references (same pattern as
  // other MTI6 modules); registry changes go through register* only.
  function listProviders() { return clone(PROVIDERS); }
  function listModels() { return clone(MODELS); }
  function getResultsLog() { return clone(resultsLog); }
  function clearResultsLog() { resultsLog.length = 0; return true; }
  function getAuditLog() { return clone(auditLog); }
  function clearAuditLog() { auditLog.length = 0; return true; }

  function getStatusText() {
    var t = truth();
    var availNote = t ? "Truth states in use." : "Truth not loaded — using built-in truth states (NOT_CONNECTED).";
    return "ModelRouter: " + PROVIDERS.length + " providers, " + MODELS.length +
      " models, " + resultsLog.length + " recorded outcomes (max " + RESULTS_MAX +
      "), " + performanceLog.length + " recorded performance records (max " +
      PERFORMANCE_MAX + "), " + rankingProposals.length +
      " ranking proposals. All model availability UNKNOWN unless an explicit record exists. " +
      availNote + " No live provider connection exists; routing is metadata only.";
  }

  G.ModelRouter = {
    PROVIDERS: PROVIDERS,
    MODELS: MODELS,
    CAPABILITIES: CAPABILITIES,
    TIERS: TIERS,
    OUTCOMES: OUTCOMES,
    TASK_CLASSES: TASK_CLASSES,
    RANKING_DIRECTIONS: RANKING_DIRECTIONS,
    RESULTS_MAX: RESULTS_MAX,
    AUDIT_MAX: AUDIT_MAX,
    PERFORMANCE_MAX: PERFORMANCE_MAX,
    PROPOSALS_MAX: PROPOSALS_MAX,
    RANKING_ADJUSTMENT: RANKING_ADJUSTMENT,
    route: route,
    fallbackChain: fallbackChain,
    recordOutcome: recordOutcome,
    getResultsLog: getResultsLog,
    clearResultsLog: clearResultsLog,
    recordPerformance: recordPerformance,
    performanceByTaskClass: performanceByTaskClass,
    performanceByModel: performanceByModel,
    getPerformanceLog: getPerformanceLog,
    clearPerformanceLog: clearPerformanceLog,
    proposeRankingChange: proposeRankingChange,
    applyRankingChange: applyRankingChange,
    getRankingProposals: getRankingProposals,
    clearRankingProposals: clearRankingProposals,
    isSecurityCriticalModel: isSecurityCriticalModel,
    registerProvider: registerProvider,
    registerModel: registerModel,
    setAvailability: setAvailability,
    setVerifiedQuality: setVerifiedQuality,
    validateProvider: validateProvider,
    validateModel: validateModel,
    validateOutcome: validateOutcome,
    validatePerformance: validatePerformance,
    validateRankingProposal: validateRankingProposal,
    getAuditLog: getAuditLog,
    clearAuditLog: clearAuditLog,
    listProviders: listProviders,
    listModels: listModels,
    getStatusText: getStatusText
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
