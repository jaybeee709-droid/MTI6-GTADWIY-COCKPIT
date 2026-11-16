/* MTI6-GTADWIY-COCKPIT — Learning / Outcome Engine (continuous development campaign)
 *
 * The learning loop for the MTI6 cockpit. Observations are recorded,
 * never invented; learning items move through a strict pipeline;
 * proposals NEVER auto-apply — applying one needs an explicit owner
 * approval record, and proposals that touch a security boundary are
 * rejected even WITH approval.
 *
 * Hard rules, in plain terms:
 *   - Pipeline stages are a closed registry with a strict transition
 *     allowlist: OBSERVE -> RECORD -> COMPARE -> DIAGNOSE -> LEARN ->
 *     PROPOSE -> SIMULATE -> VERIFY -> IMPROVE -> MONITOR, and
 *     MONITOR feeds back to OBSERVE. No jumps, no skipping, no
 *     transition out of a stage to anything but its successor.
 *   - Observations are recorded, never invented: createObservation
 *     requires {kind, subject, recordedAt, source}. An observation
 *     with no source is not recorded.
 *   - No fabricated financial outcomes: a gain/loss observation
 *     keeps its value only when an explicit sourced value record
 *     {value, currency, source, checkedAt} is supplied. Without it
 *     the value is stored as {state: "UNKNOWN"} and labelled as such.
 *   - Proposals NEVER auto-apply: applyProposal(learningId, approval)
 *     returns {applied: false, reason: "REQUIRES_APPROVAL"} without
 *     an explicit approval record {approvedBy, approvedAt, scope}.
 *   - SECURITY BOUNDARY: applyProposal REJECTS any proposal whose
 *     target is a security boundary — permissions, the THREAT/DEFENSE
 *     wall, financial execution, signing, wallet capabilities, or
 *     the Truth vocabulary itself — with reason "SECURITY_BOUNDARY",
 *     even when an approval record is supplied. Learning must never
 *     silently rewrite critical security boundaries.
 *   - Comparable memory (this unit): findSimilarCases searches the
 *     RECORDED observations and learning records only — never an
 *     invented case — ranked by kind/subject/assetClass/network/text
 *     match strength. recordCaseOutcome links a LATER verified
 *     outcome to an earlier observation ("what actually happened");
 *     without source + checkedAt, or without a sourced value for a
 *     gain/loss outcome, the outcome stays UNKNOWN with a note.
 *     caseSummary reports honest counts and the recorded date range.
 *   - Outcomes are recorded, never invented: recordOutcomeForModel /
 *     recordOutcomeForWorker append bounded outcome logs (max 200
 *     each) usable by the Model Router's history signal. A model or
 *     worker with no recorded outcomes has no history signal at all.
 *   - No network, no secrets, no storage writes, no DOM. In-memory
 *     stores only. Degrades gracefully when Truth or StarCommand are
 *     absent: every optional global is checked first, and a missing
 *     dependency is reported as NOT_CONNECTED instead of throwing.
 *
 * Depends on js/truth.js and js/star-command.js at run time (load
 * order: truth.js, star-command.js, learning-engine.js). Loads in a
 * bare vm context with no DOM and no network.
 *
 *   LearningEngine.STAGES / .OBSERVATION_KINDS / .OUTCOMES
 *   LearningEngine.SECURITY_BOUNDARY_TARGETS
 *   LearningEngine.createLearningItem(subject, by)
 *   LearningEngine.transitionLearningItem(itemId, to, by, note)
 *   LearningEngine.canTransition(from, to)
 *   LearningEngine.createObservation(input)
 *   LearningEngine.createLearningRecord(input)
 *   LearningEngine.recordSimulation(learningId, result)
 *   LearningEngine.verifyLearning(learningId, verification)
 *   LearningEngine.applyProposal(learningId, approval)
 *   LearningEngine.isSecurityBoundaryTarget(target)
 *   LearningEngine.validateObservation(o) / validateLearningRecord(r)
 *             / validateProposal(p) -> [errors]
 *   LearningEngine.recordOutcomeForModel(record)
 *   LearningEngine.recordOutcomeForWorker(record)
 *   LearningEngine.findSimilarCases(query)
 *   LearningEngine.recordCaseOutcome(observationId, outcome)
 *   LearningEngine.caseSummary()
 *   LearningEngine.getModelOutcomeLog() / getWorkerOutcomeLog()
 *   LearningEngine.getObservations() / getLearnings() / getLearningItems()
 *   LearningEngine.getAuditLog() / clearAuditLog()
 *   LearningEngine.getStatusText()
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

  // ---- Pipeline stages ------------------------------------------------
  // Strict linear chain. MONITOR feeds back to OBSERVE, closing the
  // loop; there is no other way back and no way to skip a stage.
  var STAGES = ["OBSERVE", "RECORD", "COMPARE", "DIAGNOSE", "LEARN",
    "PROPOSE", "SIMULATE", "VERIFY", "IMPROVE", "MONITOR"];

  var TRANSITIONS = {
    OBSERVE: ["RECORD"],
    RECORD: ["COMPARE"],
    COMPARE: ["DIAGNOSE"],
    DIAGNOSE: ["LEARN"],
    LEARN: ["PROPOSE"],
    PROPOSE: ["SIMULATE"],
    SIMULATE: ["VERIFY"],
    VERIFY: ["IMPROVE"],
    IMPROVE: ["MONITOR"],
    MONITOR: ["OBSERVE"]
  };

  // ---- Observation kinds ----------------------------------------------
  var OBSERVATION_KINDS = ["success", "failure", "gain", "loss",
    "cost-error", "slippage-error", "provider-failure", "model-failure",
    "prediction", "worker-performance", "owner-correction"];

  var FINANCIAL_KINDS = ["gain", "loss"];

  var OUTCOMES = ["success", "failure", "partial"];

  // ---- Security boundary ----------------------------------------------
  // Proposal targets that learning may NEVER change, approval or not.
  // Covers: permissions, the THREAT/DEFENSE wall, financial execution,
  // signing, wallet capabilities, and the Truth vocabulary itself.
  var SECURITY_BOUNDARY_TARGETS = ["permissions", "threat-defense",
    "financial-execution", "signing", "wallet-capabilities",
    "truth-vocabulary"];

  // Keyword forms of the same boundaries, matched against a proposal
  // target string (lowercased, hyphen/space normalised). A bare
  // "execution" is NOT matched: an execution-strategy improvement is
  // a legitimate learning proposal; only *financial* execution is a
  // boundary.
  var SECURITY_BOUNDARY_KEYWORDS = ["permission", "threat", "defense",
    "financial execution", "financial-execution", "signing",
    "wallet", "truth", "transactional"];

  var OUTCOME_LOG_MAX = 200;
  var AUDIT_MAX = 200;

  // Fields that must never appear in an observation's data or a
  // learning record: anything credential-like. These are validation
  // vocabulary only — no such value exists anywhere in this file.
  var SECRET_KEY_PARTS = ["seed", "mnemonic", "privatekey", "private_key",
    "apikey", "api_key", "apisecret", "password", "secret", "token",
    "bearer", "credential"];

  function isSecretKey(key) {
    var k = String(key || "").toLowerCase().replace(/[-_]/g, "");
    for (var i = 0; i < SECRET_KEY_PARTS.length; i++) {
      var part = SECRET_KEY_PARTS[i].replace(/[-_]/g, "");
      if (k.indexOf(part) !== -1) return true;
    }
    return false;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function newId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 8);
  }

  // ---- In-memory stores (no storage, no network) ---------------------
  var learningItems = [];
  var observations = [];
  var learnings = [];
  var modelOutcomeLog = [];
  var workerOutcomeLog = [];
  var auditLog = [];

  function appendAudit(entry) {
    auditLog.unshift(entry);
    if (auditLog.length > AUDIT_MAX) auditLog.length = AUDIT_MAX;
  }

  function audit(kind, detail) {
    var entry = { at: nowIso(), kind: kind };
    var key;
    for (key in detail) {
      if (Object.prototype.hasOwnProperty.call(detail, key)) {
        entry[key] = detail[key];
      }
    }
    appendAudit(entry);
    return entry;
  }

  // ---- Stage machine ---------------------------------------------------
  function canTransition(from, to) {
    if (typeof from !== "string" || typeof to !== "string") return false;
    var allowed = TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.indexOf(to) !== -1;
  }

  function findItem(id) {
    for (var i = 0; i < learningItems.length; i++) {
      if (learningItems[i].id === id) return learningItems[i];
    }
    return null;
  }

  function createLearningItem(subject, by) {
    if (!isNonEmptyString(subject)) {
      throw new Error("Invalid learning item: subject is required and must be a non-empty string.");
    }
    var stamp = nowIso();
    var item = {
      id: newId("learn"),
      stage: "OBSERVE",
      subject: subject.trim(),
      history: [{ from: null, to: "OBSERVE", at: stamp,
        by: isNonEmptyString(by) ? by : "system",
        note: "Learning item created." }]
    };
    learningItems.push(item);
    audit("item-created", { itemId: item.id, subject: item.subject });
    return clone(item);
  }

  // Moves a learning item to the next stage only. An illegal jump
  // throws and nothing is written.
  function transitionLearningItem(itemId, to, by, note) {
    if (typeof itemId !== "string") {
      throw new Error("transitionLearningItem requires a learning item id.");
    }
    if (STAGES.indexOf(to) === -1) {
      throw new Error("Unknown learning stage: " + to + ".");
    }
    var item = findItem(itemId);
    if (!item) {
      throw new Error("No learning item with id " + itemId + ".");
    }
    if (!canTransition(item.stage, to)) {
      throw new Error("Illegal learning transition: " + item.stage +
        " -> " + to + " is not allowed.");
    }
    item.history.push({
      from: item.stage, to: to, at: nowIso(),
      by: isNonEmptyString(by) ? by : "system",
      note: typeof note === "string" ? note : ""
    });
    item.stage = to;
    audit("item-transition", { itemId: item.id, from: item.history[item.history.length - 1].from, to: to });
    return clone(item);
  }

  // ---- Financial values: sourced or UNKNOWN, never invented -----------
  // A gain/loss value counts only as an explicit record
  // {value, currency, source, checkedAt}. Anything else — missing,
  // partial, wrongly typed — is stored as {state: "UNKNOWN"}.
  function normalizeFinancialValue(kind, value) {
    if (FINANCIAL_KINDS.indexOf(kind) === -1) return undefined;
    if (value && typeof value === "object" &&
        typeof value.value === "number" &&
        isNonEmptyString(value.currency) &&
        isNonEmptyString(value.source) &&
        isNonEmptyString(value.checkedAt)) {
      return {
        value: value.value,
        currency: value.currency.trim(),
        source: value.source.trim(),
        checkedAt: value.checkedAt.trim()
      };
    }
    return { state: "UNKNOWN" };
  }

  // ---- Observations ----------------------------------------------------
  // Returns an array of error strings (empty = valid). Never throws.
  function validateObservation(obs) {
    var errors = [];
    if (!obs || typeof obs !== "object") {
      return ["Observation must be an object."];
    }
    if (OBSERVATION_KINDS.indexOf(obs.kind) === -1) {
      errors.push("kind must be one of: " + OBSERVATION_KINDS.join(", ") + ".");
    }
    if (!isNonEmptyString(obs.subject)) {
      errors.push("subject is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(obs.recordedAt)) {
      errors.push("recordedAt is required and must be a non-empty string (when the observation was recorded).");
    }
    if (!isNonEmptyString(obs.source)) {
      errors.push("source is required and must be a non-empty string (observations are recorded, never invented).");
    }
    if (obs.verificationStatus !== undefined &&
        knownTruthStates().indexOf(obs.verificationStatus) === -1) {
      errors.push("Unknown verificationStatus: " + obs.verificationStatus + ".");
    }
    // A VERIFIED claim needs a source and a checked timestamp, exactly
    // like a VERIFIED knowledge entry. Without both, the claim is
    // rejected, never silently accepted.
    if (obs.verificationStatus === "VERIFIED") {
      if (!obs.source) {
        errors.push("A VERIFIED observation needs a source.");
      }
      if (!obs.checkedAt && !obs.recordedAt) {
        errors.push("A VERIFIED observation needs a checkedAt/recordedAt timestamp.");
      }
    }
    if (obs.data !== undefined && obs.data !== null) {
      if (typeof obs.data !== "object" || Array.isArray(obs.data)) {
        errors.push("data must be an object when supplied.");
      } else {
        Object.keys(obs.data).forEach(function (k) {
          if (isSecretKey(k)) {
            errors.push("Secret-looking field not allowed in observation data: " + k + ".");
          }
        });
      }
    }
    return errors;
  }

  function createObservation(input) {
    var data = (input && typeof input === "object") ? input : {};
    var errors = validateObservation(data);
    if (errors.length) {
      throw new Error("Invalid observation: " + errors.join(" "));
    }
    var obs = {
      id: newId("obs"),
      kind: data.kind,
      subject: data.subject.trim(),
      data: data.data ? clone(data.data) : {},
      recordedAt: data.recordedAt.trim(),
      source: data.source.trim(),
      verificationStatus: data.verificationStatus || "UNVERIFIED"
    };
    if (data.checkedAt) obs.checkedAt = String(data.checkedAt);
    // Gain/loss: sourced value or UNKNOWN — never an invented number.
    var finValue = normalizeFinancialValue(data.kind, data.value);
    if (finValue !== undefined) {
      obs.value = finValue;
      if (finValue.state === "UNKNOWN") {
        obs.valueNote = "Value UNKNOWN — no sourced value record {value, currency, source, checkedAt} was supplied; no amount is claimed.";
      }
    }
    observations.push(obs);
    audit("observation-recorded", { observationId: obs.id, kind: obs.kind, subject: obs.subject });
    return clone(obs);
  }

  // ---- Security boundary ----------------------------------------------
  function normalizeTarget(target) {
    return String(target || "").toLowerCase().trim()
      .replace(/[\s_]+/g, "-");
  }

  // True when a proposal target names a security boundary: an exact
  // closed-list target, or a target string containing a boundary
  // keyword (permissions, THREAT/DEFENSE, financial execution,
  // signing, wallet capabilities, Truth vocabulary, transactional).
  function isSecurityBoundaryTarget(target) {
    var norm = normalizeTarget(target);
    if (!norm) return false;
    if (SECURITY_BOUNDARY_TARGETS.indexOf(norm) !== -1) return true;
    var lowered = String(target || "").toLowerCase();
    for (var i = 0; i < SECURITY_BOUNDARY_KEYWORDS.length; i++) {
      if (lowered.indexOf(SECURITY_BOUNDARY_KEYWORDS[i]) !== -1) return true;
    }
    return false;
  }

  function proposalTargetsBoundary(proposal) {
    if (!proposal || typeof proposal !== "object") return false;
    if (isSecurityBoundaryTarget(proposal.target)) return true;
    if (isSecurityBoundaryTarget(proposal.targetType)) return true;
    return false;
  }

  // ---- Learning records and proposals ----------------------------------
  // Returns an array of error strings (empty = valid). Never throws.
  // A boundary-target proposal is NOT blocked here: recording a
  // proposal is informational; the block happens at applyProposal,
  // where it is enforced even with approval.
  function validateProposal(proposal) {
    var errors = [];
    if (!proposal || typeof proposal !== "object") {
      return ["Proposal must be an object."];
    }
    if (!isNonEmptyString(proposal.summary)) {
      errors.push("proposal.summary is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(proposal.target)) {
      errors.push("proposal.target is required and must be a non-empty string (what the proposal would change).");
    }
    if (proposal.changes !== undefined && !Array.isArray(proposal.changes)) {
      errors.push("proposal.changes must be an array when supplied.");
    }
    return errors;
  }

  function validateLearningRecord(record) {
    var errors = [];
    if (!record || typeof record !== "object") {
      return ["Learning record must be an object."];
    }
    if (record.observationIds !== undefined) {
      if (!Array.isArray(record.observationIds)) {
        errors.push("observationIds must be an array.");
      } else {
        record.observationIds.forEach(function (id) {
          if (typeof id !== "string") {
            errors.push("observationIds must contain strings only.");
          }
        });
      }
    }
    if (record.diagnosis !== undefined && record.diagnosis !== null &&
        typeof record.diagnosis !== "string") {
      errors.push("diagnosis must be a string or null.");
    }
    if (record.proposal !== undefined && record.proposal !== null) {
      validateProposal(record.proposal).forEach(function (e) {
        errors.push(e);
      });
    }
    if (record.simulationResult !== undefined && record.simulationResult !== null &&
        typeof record.simulationResult !== "object") {
      errors.push("simulationResult must be an object or null.");
    }
    if (record.verificationStatus !== undefined &&
        knownTruthStates().indexOf(record.verificationStatus) === -1) {
      errors.push("Unknown verificationStatus: " + record.verificationStatus + ".");
    }
    if (record.applied !== undefined && typeof record.applied !== "boolean") {
      errors.push("applied must be a boolean.");
    }
    return errors;
  }

  function findLearning(id) {
    for (var i = 0; i < learnings.length; i++) {
      if (learnings[i].id === id) return learnings[i];
    }
    return null;
  }

  function createLearningRecord(input) {
    var data = (input && typeof input === "object") ? input : {};
    var errors = validateLearningRecord(data);
    if (errors.length) {
      throw new Error("Invalid learning record: " + errors.join(" "));
    }
    var record = {
      id: newId("lrn"),
      observationIds: data.observationIds ? data.observationIds.slice() : [],
      diagnosis: data.diagnosis ? String(data.diagnosis) : null,
      proposal: data.proposal ? clone(data.proposal) : null,
      simulationResult: data.simulationResult ? clone(data.simulationResult) : null,
      verificationStatus: data.verificationStatus || "UNVERIFIED",
      applied: false,
      createdAt: nowIso()
    };
    learnings.push(record);
    audit("learning-created", { learningId: record.id, observations: record.observationIds.length });
    return clone(record);
  }

  // Attaches a simulation result to a learning record. Simulation is
  // descriptive only: it never applies a proposal and never changes
  // verificationStatus.
  function recordSimulation(learningId, result) {
    var record = findLearning(learningId);
    if (!record) {
      return { ok: false, errors: ["No learning record with id " + learningId + "."] };
    }
    if (record.applied) {
      return { ok: false, errors: ["Learning record " + learningId + " is already applied; simulation is no longer meaningful."] };
    }
    if (!result || typeof result !== "object") {
      return { ok: false, errors: ["Simulation result must be an object."] };
    }
    record.simulationResult = clone(result);
    audit("simulation-recorded", { learningId: learningId });
    return { ok: true, learning: clone(record) };
  }

  // Sets verificationStatus on a learning record. VERIFIED/LIVE needs
  // a source and a checkedAt timestamp, like every other VERIFIED
  // claim in the cockpit; without both the request is refused and
  // the previous status is kept.
  function verifyLearning(learningId, verification) {
    var record = findLearning(learningId);
    if (!record) {
      return { ok: false, errors: ["No learning record with id " + learningId + "."] };
    }
    var v = (verification && typeof verification === "object") ? verification : {};
    var state = v.state || v.verificationStatus;
    if (!state || knownTruthStates().indexOf(state) === -1) {
      return { ok: false, errors: ["Unknown verification state: " + state + "."] };
    }
    if (state === "VERIFIED" || state === "LIVE") {
      if (!v.source) {
        return { ok: false, errors: ["A VERIFIED/LIVE learning verification needs a source. Status not changed."] };
      }
      if (!v.checkedAt) {
        return { ok: false, errors: ["A VERIFIED/LIVE learning verification needs a checkedAt timestamp. Status not changed."] };
      }
    }
    record.verificationStatus = state;
    audit("learning-verified", { learningId: learningId, state: state });
    return { ok: true, learning: clone(record) };
  }

  // ---- Proposal application: approval-gated, boundary-blocked ---------
  function validateApproval(approval) {
    var errors = [];
    if (!approval || typeof approval !== "object") {
      return ["Approval must be an object {approvedBy, approvedAt, scope}."];
    }
    if (!isNonEmptyString(approval.approvedBy)) {
      errors.push("approval.approvedBy is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(approval.approvedAt)) {
      errors.push("approval.approvedAt is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(approval.scope)) {
      errors.push("approval.scope is required and must be a non-empty string (what the approval covers).");
    }
    return errors;
  }

  // Proposals NEVER auto-apply. Without an explicit approval record
  // the result is {applied: false, reason: "REQUIRES_APPROVAL"} and
  // nothing changes. With approval, the proposal is still rejected
  // with reason "SECURITY_BOUNDARY" when its target is a security
  // boundary — no approval can authorise rewriting permissions, the
  // THREAT/DEFENSE wall, financial execution, signing, wallet
  // capabilities, or the Truth vocabulary through learning.
  // Applying a proposal here records the application only; it does
  // not itself execute any change — the approved change is carried
  // out by the owning system, outside this engine.
  function applyProposal(learningId, approval) {
    var record = findLearning(learningId);
    if (!record) {
      return { applied: false, reason: "NOT_FOUND" };
    }
    if (!record.proposal) {
      return { applied: false, reason: "NO_PROPOSAL" };
    }
    if (record.applied) {
      return { applied: false, reason: "ALREADY_APPLIED" };
    }
    // The security boundary is checked BEFORE the approval check:
    // a boundary proposal is rejected outright, approval or not.
    if (proposalTargetsBoundary(record.proposal)) {
      audit("proposal-rejected-boundary", {
        learningId: learningId,
        target: String(record.proposal.target || "")
      });
      return { applied: false, reason: "SECURITY_BOUNDARY" };
    }
    if (!approval) {
      return { applied: false, reason: "REQUIRES_APPROVAL" };
    }
    var approvalErrors = validateApproval(approval);
    if (approvalErrors.length) {
      return { applied: false, reason: "INVALID_APPROVAL", errors: approvalErrors };
    }
    record.applied = true;
    record.appliedAt = nowIso();
    record.approval = {
      approvedBy: approval.approvedBy.trim(),
      approvedAt: approval.approvedAt.trim(),
      scope: approval.scope.trim()
    };
    audit("proposal-applied", {
      learningId: learningId,
      approvedBy: record.approval.approvedBy,
      scope: record.approval.scope
    });
    return { applied: true, learning: clone(record) };
  }

  // ---- Outcome helpers (Model Router history signal) -------------------
  // Outcomes are recorded, never invented. recordOutcomeForModel
  // forwards to ModelRouter.recordOutcome when it is loaded, so the
  // router's history signal sees the same recorded outcomes, and
  // keeps a bounded local copy (max 200). A model with no recorded
  // outcomes has no history signal at all (null from historyFor).
  function validateOutcomeRecord(record, kind) {
    var errors = [];
    if (!record || typeof record !== "object") {
      return ["Outcome record must be an object."];
    }
    Object.keys(record).forEach(function (k) {
      if (isSecretKey(k)) {
        errors.push("Secret-looking field not allowed in an outcome record: " + k + ".");
      }
    });
    if (kind === "model") {
      if (!isNonEmptyString(record.botId)) {
        errors.push("Outcome record needs a string botId.");
      }
      if (!isNonEmptyString(record.modelId)) {
        errors.push("Outcome record needs a string modelId.");
      }
    } else {
      if (!isNonEmptyString(record.workerId)) {
        errors.push("Outcome record needs a string workerId.");
      }
    }
    if (!isNonEmptyString(record.task)) {
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

  function appendBounded(log, entry) {
    log.push(entry);
    if (log.length > OUTCOME_LOG_MAX) {
      log.splice(0, log.length - OUTCOME_LOG_MAX);
    }
  }

  function recordOutcomeForModel(record) {
    var errors = validateOutcomeRecord(record, "model");
    if (errors.length) {
      return { recorded: false, errors: errors };
    }
    var entry = {
      botId: String(record.botId),
      modelId: String(record.modelId),
      task: String(record.task),
      outcome: record.outcome,
      at: record.at ? String(record.at) : nowIso()
    };
    if (record.latencyMs !== undefined) entry.latencyMs = record.latencyMs;
    if (record.costNote !== undefined) entry.costNote = String(record.costNote);
    // Forward to the Model Router when loaded, so its history signal
    // (ModelRouter historyFor) is fed by the same recorded outcomes.
    // A missing or failing router never blocks local recording.
    var forwarded = false;
    if (G.ModelRouter && typeof G.ModelRouter.recordOutcome === "function") {
      try {
        var forwardedResult = G.ModelRouter.recordOutcome({
          botId: entry.botId, modelId: entry.modelId,
          task: entry.task, outcome: entry.outcome,
          at: entry.at,
          latencyMs: entry.latencyMs, costNote: entry.costNote
        });
        forwarded = !!(forwardedResult && forwardedResult.recorded);
      } catch (e) {
        forwarded = false;
      }
    }
    appendBounded(modelOutcomeLog, entry);
    audit("model-outcome", {
      botId: entry.botId, modelId: entry.modelId,
      task: entry.task, outcome: entry.outcome,
      forwardedToModelRouter: forwarded
    });
    return { recorded: true, entry: clone(entry), logSize: modelOutcomeLog.length, forwardedToModelRouter: forwarded };
  }

  function recordOutcomeForWorker(record) {
    var errors = validateOutcomeRecord(record, "worker");
    if (errors.length) {
      return { recorded: false, errors: errors };
    }
    var entry = {
      workerId: String(record.workerId),
      task: String(record.task),
      outcome: record.outcome,
      at: record.at ? String(record.at) : nowIso()
    };
    if (record.latencyMs !== undefined) entry.latencyMs = record.latencyMs;
    if (record.note !== undefined) entry.note = String(record.note);
    appendBounded(workerOutcomeLog, entry);
    audit("worker-outcome", {
      workerId: entry.workerId, task: entry.task, outcome: entry.outcome
    });
    return { recorded: true, entry: clone(entry), logSize: workerOutcomeLog.length };
  }

  // ---- Comparable memory ---------------------------------------------
  // Historical-case retrieval over RECORDED observations and learning
  // records only. Nothing is invented: a case exists only because an
  // observation was recorded, and its outcome / whatHappened text is
  // built only from recorded fields (the observation, its linked
  // outcomes, and the linked learning record's diagnosis /
  // verification status when one exists). An empty search is honest:
  // {cases: [], total: 0, reason: "NO_MATCHING_CASES"}.
  var CASE_OUTCOMES = ["success", "failure", "gain", "loss", "partial"];

  var TEXT_STOPWORDS = ["the", "and", "for", "with", "from", "that",
    "this", "what", "when", "where", "which", "about", "into", "over",
    "under", "after", "before", "between", "through", "during",
    "your", "their", "there", "here", "have", "has", "been", "were",
    "will", "would", "could", "should"];

  function normalizeText(value) {
    return String(value || "").toLowerCase().trim();
  }

  function significantWords(text) {
    var words = normalizeText(text).split(/[^a-z0-9]+/).filter(function (w) {
      return w.length > 2 && TEXT_STOPWORDS.indexOf(w) === -1;
    });
    // De-duplicate: a shared word counts once.
    var seen = {};
    var out = [];
    words.forEach(function (w) {
      if (!seen[w]) { seen[w] = true; out.push(w); }
    });
    return out;
  }

  // assetClass / network live in the observation's recorded data
  // (assetClass, or the legacy alias asset; network, or chain).
  // Absent means not recorded — returned as null, never guessed.
  function observationAssetClass(obs) {
    var d = (obs && obs.data) || {};
    if (isNonEmptyString(d.assetClass)) return d.assetClass.trim();
    if (isNonEmptyString(d.asset)) return d.asset.trim();
    return null;
  }

  function observationNetwork(obs) {
    var d = (obs && obs.data) || {};
    if (isNonEmptyString(d.network)) return d.network.trim();
    if (isNonEmptyString(d.chain)) return d.chain.trim();
    return null;
  }

  function findObservation(id) {
    for (var i = 0; i < observations.length; i++) {
      if (observations[i].id === id) return observations[i];
    }
    return null;
  }

  function findLearningForObservation(observationId) {
    for (var i = 0; i < learnings.length; i++) {
      if (learnings[i].observationIds &&
          learnings[i].observationIds.indexOf(observationId) !== -1) {
        return learnings[i];
      }
    }
    return null;
  }

  function latestLinkedOutcome(obs) {
    var list = (obs && Array.isArray(obs.linkedOutcomes)) ? obs.linkedOutcomes : [];
    if (!list.length) return null;
    return list[list.length - 1];
  }

  // The outcome a case reports: the latest linked (later, verified)
  // outcome when one was recorded and is not UNKNOWN, else the
  // observation's own kind when it is itself an outcome kind,
  // else UNKNOWN — never invented.
  function caseOutcome(obs) {
    var linked = latestLinkedOutcome(obs);
    if (linked && linked.outcome && linked.outcome !== "UNKNOWN") return linked.outcome;
    if (["success", "failure", "gain", "loss"].indexOf(obs.kind) !== -1) return obs.kind;
    return "UNKNOWN";
  }

  // Short factual "what actually happened" string, built ONLY from
  // recorded fields: the observation (kind, date, source, value),
  // the latest linked outcome, and the linked learning record's
  // diagnosis / verification status when one exists.
  function buildWhatHappened(obs, learning) {
    var parts = [];
    parts.push("Recorded as " + obs.kind + " on " + obs.recordedAt +
      " from " + obs.source + ".");
    if (obs.value && typeof obs.value.value === "number") {
      parts.push("Value " + obs.value.value + " " + obs.value.currency +
        " (source " + obs.value.source + ", checked " +
        obs.value.checkedAt + ").");
    } else if (FINANCIAL_KINDS.indexOf(obs.kind) !== -1) {
      parts.push("Value UNKNOWN — no sourced value record was supplied.");
    }
    var linked = latestLinkedOutcome(obs);
    if (linked) {
      if (linked.outcome && linked.outcome !== "UNKNOWN") {
        var outcomePart = "Later outcome recorded: " + linked.outcome;
        if (typeof linked.value === "number" && linked.currency) {
          outcomePart += " of " + linked.value + " " + linked.currency;
        }
        if (linked.source) outcomePart += " (source " + linked.source + ")";
        if (linked.checkedAt) outcomePart += ", checked " + linked.checkedAt;
        outcomePart += ".";
        parts.push(outcomePart);
      } else {
        parts.push("Later outcome recorded as UNKNOWN — no sourced outcome record was supplied.");
      }
      if (linked.note) parts.push("Note: " + linked.note);
    }
    if (learning) {
      if (learning.diagnosis) parts.push("Learning: " + learning.diagnosis);
      if (learning.verificationStatus) {
        parts.push("Learning verification: " + learning.verificationStatus + ".");
      }
    }
    return parts.join(" ");
  }

  // Match strength: kind +3, subject +3, assetClass +2, network +2,
  // text overlap +1 per shared significant word (capped +3). Subject
  // matches case-insensitively on equality or containment either way.
  // Text overlap compares whole significant words, not substrings,
  // so "eth" does not match inside "method".
  function scoreObservation(obs, query) {
    var score = 0;
    if (isNonEmptyString(query.kind) &&
        normalizeText(query.kind) === normalizeText(obs.kind)) score += 3;
    if (isNonEmptyString(query.subject)) {
      var qs = normalizeText(query.subject);
      var os = normalizeText(obs.subject);
      if (qs === os || os.indexOf(qs) !== -1 || qs.indexOf(os) !== -1) score += 3;
    }
    var assetClass = observationAssetClass(obs);
    if (isNonEmptyString(query.assetClass) && assetClass &&
        normalizeText(query.assetClass) === normalizeText(assetClass)) score += 2;
    var network = observationNetwork(obs);
    if (isNonEmptyString(query.network) && network &&
        normalizeText(query.network) === normalizeText(network)) score += 2;
    if (isNonEmptyString(query.text)) {
      var queryWords = significantWords(query.text);
      var haystackWords = {};
      significantWords(obs.subject + " " + JSON.stringify(obs.data || {}))
        .forEach(function (w) { haystackWords[w] = true; });
      var shared = 0;
      queryWords.forEach(function (w) {
        if (haystackWords[w]) shared++;
      });
      score += Math.min(shared, 3);
    }
    return score;
  }

  // Searches recorded observations only. query is
  // {kind?, subject?, assetClass?, network?, text?, limit?}.
  // Returns {cases, total, reason}; total counts every match before
  // the limit is applied, cases is the top slice. A case carries an
  // explicit unverified flag when its verificationStatus is
  // UNVERIFIED. No match at all returns NO_MATCHING_CASES, never a
  // fabricated case.
  function findSimilarCases(query) {
    var q = (query && typeof query === "object") ? query : {};
    var limit = (typeof q.limit === "number" && q.limit > 0) ?
      Math.floor(q.limit) : 10;
    var scored = [];
    observations.forEach(function (obs) {
      var score = scoreObservation(obs, q);
      if (score <= 0) return;
      var learning = findLearningForObservation(obs.id);
      scored.push({
        observationId: obs.id,
        learningId: learning ? learning.id : null,
        kind: obs.kind,
        subject: obs.subject,
        assetClass: observationAssetClass(obs),
        network: observationNetwork(obs),
        outcome: caseOutcome(obs),
        whatHappened: buildWhatHappened(obs, learning),
        recordedAt: obs.recordedAt,
        verificationStatus: obs.verificationStatus,
        unverified: obs.verificationStatus === "UNVERIFIED",
        score: score
      });
    });
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (b.recordedAt !== a.recordedAt) return b.recordedAt < a.recordedAt ? -1 : 1;
      return a.observationId < b.observationId ? -1 : 1;
    });
    if (!scored.length) {
      return { cases: [], total: 0, reason: "NO_MATCHING_CASES" };
    }
    return { cases: scored.slice(0, limit), total: scored.length, reason: "MATCHED" };
  }

  // Links a LATER verified outcome to an earlier observation — the
  // "what actually happened" update. Requires the observation to
  // exist. The outcome record requires source + checkedAt; without
  // them the outcome stays UNKNOWN with a note, and the record is
  // still appended (as UNKNOWN) so the gap is visible, not hidden.
  // A gain/loss outcome without a sourced value/currency likewise
  // stays UNKNOWN, the same rule as createObservation. A fully
  // sourced gain/loss outcome replaces the observation's UNKNOWN
  // value with the sourced figures — never an invented number.
  // Secret-looking fields in the outcome record are rejected.
  // Returns {ok, observation, outcome} or {ok: false, errors}.
  function recordCaseOutcome(observationId, outcomeInput) {
    var obs = (typeof observationId === "string") ? findObservation(observationId) : null;
    if (!obs) {
      return { ok: false, errors: ["No observation with id " + observationId + "."] };
    }
    var input = (outcomeInput && typeof outcomeInput === "object") ? outcomeInput : {};
    var secretErrors = [];
    Object.keys(input).forEach(function (k) {
      if (isSecretKey(k)) {
        secretErrors.push("Secret-looking field not allowed in a case outcome: " + k + ".");
      }
    });
    if (secretErrors.length) {
      return { ok: false, errors: secretErrors };
    }
    var requested = isNonEmptyString(input.outcome) ? input.outcome.trim() : null;
    if (requested && CASE_OUTCOMES.indexOf(requested) === -1) {
      return { ok: false, errors: ["Unknown case outcome: " + requested +
        " (use " + CASE_OUTCOMES.join(", ") + ")."] };
    }
    var note = isNonEmptyString(input.note) ? input.note.trim() : "";
    var storedOutcome = requested || "UNKNOWN";
    var storedNote = note;
    if (!requested) {
      storedNote = "No outcome supplied; outcome stays UNKNOWN." +
        (storedNote ? " " + storedNote : "");
    }
    var hasSource = isNonEmptyString(input.source) && isNonEmptyString(input.checkedAt);
    if (!hasSource) {
      storedOutcome = "UNKNOWN";
      var missing = "Outcome UNKNOWN — no sourced outcome record {source, checkedAt} was supplied; no outcome is claimed.";
      storedNote = storedNote ? missing + " " + storedNote : missing;
    } else if ((storedOutcome === "gain" || storedOutcome === "loss") &&
        !(typeof input.value === "number" && isNonEmptyString(input.currency))) {
      storedOutcome = "UNKNOWN";
      var missingValue = "Outcome UNKNOWN — a gain/loss outcome needs a sourced value {value, currency}; no amount is claimed.";
      storedNote = storedNote ? missingValue + " " + storedNote : missingValue;
    }
    var record = {
      outcome: storedOutcome,
      source: isNonEmptyString(input.source) ? input.source.trim() : null,
      checkedAt: isNonEmptyString(input.checkedAt) ? input.checkedAt.trim() : null,
      recordedAt: nowIso(),
      note: storedNote || null
    };
    if (typeof input.value === "number") record.value = input.value;
    if (isNonEmptyString(input.currency)) record.currency = input.currency.trim();
    if (!Array.isArray(obs.linkedOutcomes)) obs.linkedOutcomes = [];
    obs.linkedOutcomes.push(record);
    if (!Array.isArray(obs.history)) obs.history = [];
    obs.history.push({
      type: "case-outcome", outcome: storedOutcome,
      at: record.recordedAt, source: record.source,
      checkedAt: record.checkedAt, note: record.note
    });
    if (storedOutcome === "gain" || storedOutcome === "loss") {
      obs.value = { value: record.value, currency: record.currency,
        source: record.source, checkedAt: record.checkedAt };
      delete obs.valueNote;
    }
    audit("case-outcome-recorded", { observationId: obs.id, outcome: storedOutcome });
    return { ok: true, observation: clone(obs), outcome: clone(record) };
  }

  // Honest counts over recorded cases only: total observations,
  // total learning records, total linked outcomes, per-kind counts,
  // and the recordedAt range of the recorded cases (null when empty).
  function caseSummary() {
    var byKind = {};
    var earliest = null;
    var latest = null;
    var linked = 0;
    observations.forEach(function (obs) {
      byKind[obs.kind] = (byKind[obs.kind] || 0) + 1;
      if (earliest === null || obs.recordedAt < earliest) earliest = obs.recordedAt;
      if (latest === null || obs.recordedAt > latest) latest = obs.recordedAt;
      if (Array.isArray(obs.linkedOutcomes)) linked += obs.linkedOutcomes.length;
    });
    return {
      totalObservations: observations.length,
      totalLearningRecords: learnings.length,
      totalLinkedOutcomes: linked,
      byKind: byKind,
      dateRange: observations.length ? { earliest: earliest, latest: latest } : null
    };
  }

  // ---- Read access -----------------------------------------------------
  function getLearningItems() { return clone(learningItems); }
  function getObservations() { return clone(observations); }
  function getLearnings() { return clone(learnings); }
  function getModelOutcomeLog() { return clone(modelOutcomeLog); }
  function getWorkerOutcomeLog() { return clone(workerOutcomeLog); }
  function getAuditLog() { return clone(auditLog); }

  function clearAuditLog() { auditLog.length = 0; return true; }

  function clearOutcomeLogs() {
    modelOutcomeLog.length = 0;
    workerOutcomeLog.length = 0;
    return true;
  }

  function getStatusText() {
    var t = truth();
    var truthNote = t ? "Truth states in use." :
      "Truth not loaded — using built-in truth states (NOT_CONNECTED).";
    var routerNote = (G.ModelRouter && typeof G.ModelRouter.recordOutcome === "function") ?
      "ModelRouter is loaded — model outcomes are forwarded to its history signal." :
      "ModelRouter is not loaded — model outcomes are kept in the local log only.";
    return "LearningEngine: " + learningItems.length + " learning items, " +
      observations.length + " observations, " + learnings.length +
      " learning records (" + learnings.filter(function (r) { return r.applied; }).length +
      " applied), " + modelOutcomeLog.length + " recorded model outcomes and " +
      workerOutcomeLog.length + " recorded worker outcomes (max " +
      OUTCOME_LOG_MAX + " each). " + truthNote + " " + routerNote +
      " No proposal applies without an explicit owner approval record, " +
      "and security-boundary proposals are never applied.";
  }

  G.LearningEngine = {
    STAGES: STAGES.slice(),
    TRANSITIONS: clone(TRANSITIONS),
    OBSERVATION_KINDS: OBSERVATION_KINDS.slice(),
    OUTCOMES: OUTCOMES.slice(),
    SECURITY_BOUNDARY_TARGETS: SECURITY_BOUNDARY_TARGETS.slice(),
    OUTCOME_LOG_MAX: OUTCOME_LOG_MAX,
    AUDIT_MAX: AUDIT_MAX,
    canTransition: canTransition,
    createLearningItem: createLearningItem,
    transitionLearningItem: transitionLearningItem,
    createObservation: createObservation,
    validateObservation: validateObservation,
    createLearningRecord: createLearningRecord,
    validateLearningRecord: validateLearningRecord,
    validateProposal: validateProposal,
    recordSimulation: recordSimulation,
    verifyLearning: verifyLearning,
    applyProposal: applyProposal,
    isSecurityBoundaryTarget: isSecurityBoundaryTarget,
    recordOutcomeForModel: recordOutcomeForModel,
    recordOutcomeForWorker: recordOutcomeForWorker,
    findSimilarCases: findSimilarCases,
    recordCaseOutcome: recordCaseOutcome,
    caseSummary: caseSummary,
    getLearningItems: getLearningItems,
    getObservations: getObservations,
    getLearnings: getLearnings,
    getModelOutcomeLog: getModelOutcomeLog,
    getWorkerOutcomeLog: getWorkerOutcomeLog,
    clearOutcomeLogs: clearOutcomeLogs,
    getAuditLog: getAuditLog,
    clearAuditLog: clearAuditLog,
    getStatusText: getStatusText
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
