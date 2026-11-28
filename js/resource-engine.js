/*
 * MTI6-GTADWIY-COCKPIT — Resource Engine foundation (Resource Discovery
 * & Integration Engine directive, 2026-11-16).
 *
 * The governed pipeline for information sources, mirroring the entity
 * pipeline (js/entity-candidates.js + js/entity-gate.js) and the
 * WORLD-RESOURCE-REGISTRY-SPEC §6 design:
 *
 *   DISCOVERED -> NORMALIZED -> DEDUPED -> RESEARCHING -> TESTED ->
 *   SECURITY_REVIEWED -> TERMS_REVIEWED -> PREPARED -> OWNER_APPROVED
 *   -> CONNECTED, plus REJECTED / SUPERSEDED (terminal, retained as
 *   resource memory) and DEGRADED (parked, from CONNECTED only, on a
 *   measured health failure).
 *
 * Governance rules (fail-closed, owner-sovereign):
 *   - OWNER_APPROVED is set ONLY by approveCandidate(), the explicit
 *     owner-decision function. transitionCandidate() refuses it by
 *     construction, exactly as the entity machine refuses GATED /
 *     REGISTERED. No other code path may set it (§35 auto-connect
 *     rule: automatic production integration NO).
 *   - CONNECTED is set ONLY by markConnected(), which requires
 *     recorded wiring evidence naming the real adapter/registry
 *     wiring. This engine RECORDS connections; it never wires code
 *     itself, never fetches, and never touches the proxy.
 *   - REJECTED records are retained forever with reason + date and
 *     block silent re-discovery of the same provider+capability:
 *     createCandidate() refuses a match against a REJECTED record
 *     unless the draft carries a materialChangeNote (§38 resource
 *     memory). DUPLICATE identity is a dedupe verdict, never a
 *     ticker/name-only match: identity = normalized provider name +
 *     documentation/authority anchor host + capability domain.
 *   - Benefit classification (§15) is explainable LABELS only. There
 *     is no numeric score anywhere in this module, and validation
 *     rejects any record carrying a score-shaped field.
 *   - NO credential value may exist in a record. The schema has
 *     fields for credential EXISTENCE and CUSTODY only
 *     (credentialState / credentialCustody); validation rejects
 *     secret-shaped keys anywhere in a record, recursively.
 *   - Health is MEASURED or UNKNOWN (§26): health() reads
 *     ProviderRouter.health() for router-wired candidates and reports
 *     UNKNOWN for everything else. Health is derived at read time and
 *     never stored on a record as a claim.
 *   - summary() is the single read-only derivation for STAR and Bot
 *     Operations (EntityGate.pipelineSummary parity): it never
 *     writes.
 *
 * Records live in the existing cryptoWorld store (DB_VERSION 3 — no
 * migration) as recordKind "RESOURCE_CANDIDATE" / "RESOURCE_GAP",
 * registry "resources", excluded from every canonical view at the
 * single filter point in CryptoWorld.getAllRecords().
 *
 * Zero financial authority: nothing here connects a provider, moves
 * money, or expands the mti6-proxy allowlist.
 */
(function (global) {
  "use strict";

  var STORE = "cryptoWorld";
  var RECORD_KIND = "RESOURCE_CANDIDATE";
  var GAP_KIND = "RESOURCE_GAP";
  var REGISTRY = "resources";
  var STALE_DAYS = 90;

  var ACTOR_TYPES = ["OWNER", "STAR", "WORKER"];

  var STAGES = ["DISCOVERED", "NORMALIZED", "DEDUPED", "RESEARCHING",
    "TESTED", "SECURITY_REVIEWED", "TERMS_REVIEWED", "PREPARED",
    "OWNER_APPROVED", "CONNECTED"];
  // DEGRADED is a parked state reachable only from CONNECTED (measured
  // health failure) and returnable to CONNECTED only through
  // restoreConnected() with fresh wiring/health evidence.
  var PARKED_STAGES = ["DEGRADED"];
  var TERMINAL_STAGES = ["REJECTED", "SUPERSEDED"];
  var NEXT_STAGE = {
    DISCOVERED: "NORMALIZED",
    NORMALIZED: "DEDUPED",
    DEDUPED: "RESEARCHING",
    RESEARCHING: "TESTED",
    TESTED: "SECURITY_REVIEWED",
    SECURITY_REVIEWED: "TERMS_REVIEWED",
    TERMS_REVIEWED: "PREPARED",
    PREPARED: null,
    OWNER_APPROVED: null,
    CONNECTED: null,
    DEGRADED: null
  };

  var CANDIDATE_TYPES = ["SOURCE", "SOFTWARE"];
  var RESOURCE_TYPES = ["OFFICIAL_API", "OPEN_DATA", "GITHUB_PROJECT",
    "MCP_SERVER", "PUBLIC_WEB", "EMBED", "FEED", "OWNER_CONNECTED", "SELF_HOSTED"];
  var AUTH_TYPES = ["NONE", "API_KEY", "OAUTH", "OWNER_ACCOUNT", "UNKNOWN"];
  // Exact cost classes (secret-governance addendum, 2026-11-16). Never
  // blanket-label a provider FREE_KEYLESS; UNKNOWN stays UNKNOWN.
  var COST_STATES = ["FREE_KEYLESS", "FREE_KEY_REQUIRED", "FREE_OAUTH",
    "FREE_WITH_LIMITS", "FREE_WITH_ATTRIBUTION", "FREEMIUM", "PAID",
    "SELF_HOSTABLE", "UNKNOWN"];
  // 8-class cost mapping (P3, mapping contract — maps, never rewrites).
  // Every live cost vocabulary maps into these eight classes; any
  // unknown input maps to UNKNOWN_REQUIRES_VERIFICATION (never
  // invented). Mapping is a pure function: it never rewrites a stored
  // record — the harness proves the seed snapshot is identical after.
  var COST_CLASSES_8 = ["FREE_KEYLESS", "FREE_RECURRING", "FREE_MONTHLY_CREDIT", "FREE_TRIAL", "SELF_HOSTED_FREE", "PAID_OPTIONAL", "PAID_REQUIRED", "UNKNOWN_REQUIRES_VERIFICATION"];
  var COST_CLASS_MAP = {
    "resource-engine": {
      FREE_KEYLESS: "FREE_KEYLESS",
      FREE_KEY_REQUIRED: "FREE_RECURRING",
      FREE_OAUTH: "FREE_RECURRING",
      FREE_WITH_LIMITS: "FREE_MONTHLY_CREDIT",
      FREE_WITH_ATTRIBUTION: "FREE_MONTHLY_CREDIT",
      FREEMIUM: "PAID_OPTIONAL",
      PAID: "PAID_REQUIRED",
      SELF_HOSTABLE: "SELF_HOSTED_FREE",
      UNKNOWN: "UNKNOWN_REQUIRES_VERIFICATION"
    },
    router: {
      FREE_KEYLESS: "FREE_KEYLESS",
      FREE_KEY_REQUIRED: "FREE_RECURRING",
      FREE_NONCOMMERCIAL: "FREE_KEYLESS"
    },
    src: {
      FREE_KEYLESS: "FREE_KEYLESS",
      FREE_KEY_REQUIRED: "FREE_RECURRING",
      FREE_WITH_LIMITS: "FREE_MONTHLY_CREDIT",
      FREE_WITH_ATTRIBUTION: "FREE_MONTHLY_CREDIT"
    }
  };
  function mapCostClass(value, vocabulary) {
    var table = COST_CLASS_MAP[vocabulary] || null;
    if (table && Object.prototype.hasOwnProperty.call(table, value)) return table[value];
    return "UNKNOWN_REQUIRES_VERIFICATION";
  }
  var CREDENTIAL_STATES = ["NONE_REQUIRED", "NOT_PROVISIONED",
    "KEY_EXISTS_PROVIDER_DASHBOARD", "KEY_IN_PROXY_ENV", "UNKNOWN"];
  var OWNER_APPROVAL_STATES = ["NOT_REQUESTED", "PENDING", "APPROVED",
    "REJECTED", "LATER"];
  var REVIEW_STATUSES = ["NOT_REVIEWED", "REVIEWED", "TERMS_REVIEW_REQUIRED"];
  var DEDUPE_VERDICTS = ["NOT_RUN", "DISTINCT", "DUPLICATE", "VARIANT_OF"];
  var EVIDENCE_KINDS = ["OFFICIAL_DOC", "ENDPOINT_PROBE", "TEST", "REVIEW",
    "OWNER_NOTE", "CATALOG", "WIRING"];
  // §15 benefit categories — explainable labels, never scores.
  var BENEFIT_LABELS = ["NEW COVERAGE", "BETTER COVERAGE", "BETTER FRESHNESS",
    "BETTER RELIABILITY", "BETTER SOURCE AUTHORITY", "BETTER GEOGRAPHIC COVERAGE",
    "LOWER COST", "NO KEY REQUIRED", "OPEN DATA", "SELF-HOSTABLE",
    "FALLBACK VALUE", "REDUNDANCY", "MOBILE BENEFIT", "WORLD GLOBE BENEFIT",
    "CRYPTO WORLD BENEFIT", "BOT BENEFIT", "DEVICE BENEFIT"];
  var GAP_STATUSES = ["OPEN", "ADDRESSED", "CLOSED_BY_OWNER"];

  // Secret-shaped keys are rejected anywhere in a record (recursive,
  // normalized like the entity gate's forbidden-key scan). A resource
  // record may state that a key EXISTS and where it is held — never
  // its value, and never under a key that could hold one.
  var SECRET_KEYS = ["seedphrase", "seed", "mnemonic", "privatekey",
    "apikey", "apisecret", "password", "secret", "accesstoken",
    "refreshtoken", "bearertoken", "tokenvalue", "keyvalue",
    "credentialvalue", "credentials"];
  function normaliseKey(k) {
    return String(k == null ? "" : k).toLowerCase().replace(/[-_]/g, "");
  }
  function secretKeyErrors(obj, path, out) {
    if (!obj || typeof obj !== "object") return out;
    Object.keys(obj).forEach(function (k) {
      var nk = normaliseKey(k);
      if (SECRET_KEYS.indexOf(nk) !== -1) {
        out.push("Secret-shaped field is forbidden in a resource record: " + (path ? path + "." : "") + k + ". Record credential existence and custody only, never a value.");
      }
      if (nk === "score" || nk === "benefitscore" || nk === "qualityscore" || nk === "trustscore") {
        out.push("Numeric scores are forbidden in resource records (§15: explainable labels only): " + (path ? path + "." : "") + k + ".");
      }
      var v = obj[k];
      if (v && typeof v === "object") secretKeyErrors(v, (path ? path + "." : "") + k, out);
    });
    return out;
  }

  function db() { return global.CockpitDB || null; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function nowIso(now) { return now || new Date().toISOString(); }
  function normText(s) {
    return String(s == null ? "" : s).toLowerCase().replace(/\s+/g, " ").trim();
  }
  function slugify(s) {
    return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function validActor(actor) {
    return !!actor && ACTOR_TYPES.indexOf(actor.type) !== -1 &&
      typeof actor.ref === "string" && actor.ref.length > 0;
  }
  function actorLabel(actor) { return actor.type + ":" + actor.ref; }
  // The owner-decision functions accept either an actor object
  // ({type:"OWNER", ref}) or the directive's decision shape
  // ({by:"owner", at, note}). Both normalize to the OWNER actor; any
  // other "by" is not the owner and is refused.
  function ownerActorFrom(opts) {
    opts = opts || {};
    if (opts.actor && validActor(opts.actor)) {
      return opts.actor.type === "OWNER" ? opts.actor : null;
    }
    if (typeof opts.by === "string" && opts.by.toLowerCase() === "owner") {
      return { type: "OWNER", ref: "owner" };
    }
    if (opts.by && typeof opts.by === "object" && opts.by.type === "OWNER" && opts.by.ref) {
      return opts.by;
    }
    return null;
  }
  function ownerError(opts, action) {
    if (!ownerActorFrom(opts)) {
      return "Only the owner can " + action + " — resource decisions are never a STAR or worker action (§35/§36).";
    }
    return null;
  }

  function readAll() {
    var d = db();
    if (!d || typeof d.getAll !== "function") return Promise.resolve([]);
    return d.getAll(STORE).catch(function () { return []; });
  }
  function persist(rec) {
    var d = db();
    if (!d || typeof d.put !== "function") return Promise.reject(new Error("CockpitDB.put unavailable."));
    return d.put(STORE, rec).then(function () { return rec; });
  }

  function isCandidate(rec) { return !!rec && rec.recordKind === RECORD_KIND; }
  function isGap(rec) { return !!rec && rec.recordKind === GAP_KIND; }

  // Identity for dedupe: normalized provider name + the documentation
  // / authority anchor host + capability domain. Name alone never
  // dedupes (Standing Anchor Rule); the anchor is the host of the
  // official documentation (or of the original source when no docs
  // are recorded).
  function anchorHost(rec) {
    var url = rec && (rec.documentation || rec.originalSource || "");
    var m = /https?:\/\/([^\/\s)]+)/i.exec(String(url));
    return m ? m[1].toLowerCase() : normText(url);
  }
  function identityKey(rec) {
    if (!rec) return "";
    return normText(rec.provider || rec.name || "") + "|" + anchorHost(rec) + "|" + normText(rec.domain || "");
  }

  function listCandidates(filter) {
    filter = filter || {};
    return readAll().then(function (records) {
      var out = records.filter(isCandidate);
      if (filter.stage) out = out.filter(function (c) { return c.pipelineStage === filter.stage; });
      if (filter.domain) out = out.filter(function (c) { return c.domain === filter.domain; });
      out.sort(function (a, b) {
        var da = a.discoveredAt || "", dbv = b.discoveredAt || "";
        if (da !== dbv) return da < dbv ? -1 : 1;
        return a.id < b.id ? -1 : 1;
      });
      return out;
    });
  }
  function getCandidate(id) {
    return readAll().then(function (records) {
      for (var i = 0; i < records.length; i++) {
        if (records[i].id === id && isCandidate(records[i])) return records[i];
      }
      return null;
    });
  }
  function listGaps(filter) {
    filter = filter || {};
    return readAll().then(function (records) {
      var out = records.filter(isGap);
      if (filter.status) out = out.filter(function (g) { return g.status === filter.status; });
      out.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
      return out;
    });
  }
  function getGap(id) {
    return readAll().then(function (records) {
      for (var i = 0; i < records.length; i++) {
        if (records[i].id === id && isGap(records[i])) return records[i];
      }
      return null;
    });
  }
  function stageCounts() {
    return listCandidates().then(function (list) {
      var counts = { total: list.length };
      STAGES.concat(PARKED_STAGES).concat(TERMINAL_STAGES).forEach(function (s) { counts[s] = 0; });
      list.forEach(function (c) { if (counts.hasOwnProperty(c.pipelineStage)) counts[c.pipelineStage] += 1; });
      return counts;
    });
  }
  function isStale(candidate, now) {
    if (!candidate || !candidate.discoveredAt) return false;
    if (TERMINAL_STAGES.indexOf(candidate.pipelineStage) !== -1) return false;
    if (candidate.pipelineStage === "CONNECTED") return false;
    var t = Date.parse(candidate.discoveredAt);
    var ref = now ? Date.parse(now) : Date.now();
    if (isNaN(t) || isNaN(ref)) return false;
    return (ref - t) > STALE_DAYS * 24 * 60 * 60 * 1000;
  }

  /* ---------------- validation ---------------- */

  function validateEvidence(ev) {
    var errors = [];
    if (!ev || typeof ev !== "object") return ["Evidence must be an object."];
    if (EVIDENCE_KINDS.indexOf(ev.kind) === -1) errors.push("Evidence kind must be one of " + EVIDENCE_KINDS.join(", ") + ".");
    if (!ev.ref || typeof ev.ref !== "string") errors.push("Evidence needs a ref (URL, document id, or owner note).");
    return errors;
  }
  function validateReview(rv, field) {
    var errors = [];
    if (rv === undefined) return errors;
    if (!rv || typeof rv !== "object") return [field + " must be an object {status, note, at, by}."];
    if (REVIEW_STATUSES.indexOf(rv.status) === -1) {
      errors.push(field + ".status must be one of " + REVIEW_STATUSES.join(", ") + ".");
    }
    return errors;
  }

  // Draft validation (creation-time). A candidate is born DISCOVERED
  // and UNVERIFIED; stages, owner decisions and connection evidence
  // are earned through the machine, never declared in a draft.
  function validateCandidateDraft(draft) {
    var errors = [];
    if (!draft || typeof draft !== "object") return ["Candidate draft must be an object."];
    errors = errors.concat(secretKeyErrors(draft, "", []));
    if (!draft.name || typeof draft.name !== "string") errors.push("name is required (the provider's own name for the resource).");
    if (!draft.provider || typeof draft.provider !== "string") errors.push("provider is required (the operating organization).");
    if (!draft.domain || typeof draft.domain !== "string") errors.push("domain is required (the capability domain, e.g. weather, geocoding, crypto-protocol).");
    var ctype = draft.candidateType || "SOURCE";
    if (CANDIDATE_TYPES.indexOf(ctype) === -1) errors.push("candidateType must be SOURCE or SOFTWARE.");
    if (draft.resourceType !== undefined && RESOURCE_TYPES.indexOf(draft.resourceType) === -1) {
      errors.push("resourceType must be one of " + RESOURCE_TYPES.join(", ") + ".");
    }
    if (draft.authenticationType !== undefined && AUTH_TYPES.indexOf(draft.authenticationType) === -1) {
      errors.push("authenticationType must be one of " + AUTH_TYPES.join(", ") + ".");
    }
    if (draft.freeState !== undefined && COST_STATES.indexOf(draft.freeState) === -1) {
      errors.push("freeState must be an exact addendum cost class: " + COST_STATES.join(", ") + ".");
    }
    if (draft.credentialState !== undefined && CREDENTIAL_STATES.indexOf(draft.credentialState) === -1) {
      errors.push("credentialState must be one of " + CREDENTIAL_STATES.join(", ") + " (existence only — never a value).");
    }
    ["verificationStatus", "truthState"].forEach(function (k) {
      if (draft[k] !== undefined && draft[k] !== "UNVERIFIED") {
        errors.push("Resource candidates are always UNVERIFIED; " + k + " may not be set to " + draft[k] + ".");
      }
    });
    if (draft.pipelineStage !== undefined) {
      errors.push("pipelineStage is set by the engine (born DISCOVERED), never by a draft.");
    }
    if (draft.ownerApprovalState !== undefined && draft.ownerApprovalState !== "NOT_REQUESTED") {
      errors.push("ownerApprovalState is earned through the pipeline and the owner's decision, never declared in a draft.");
    }
    if (draft.benefitLabels !== undefined) {
      if (!Array.isArray(draft.benefitLabels)) errors.push("benefitLabels must be an array of §15 labels.");
      else draft.benefitLabels.forEach(function (b) {
        if (BENEFIT_LABELS.indexOf(b) === -1) errors.push("Unknown benefit label: " + b + " (§15 labels only; no invented categories, no scores).");
      });
    }
    if (draft.evidence !== undefined) {
      if (!Array.isArray(draft.evidence)) errors.push("evidence must be an array.");
      else draft.evidence.forEach(function (ev, i) {
        validateEvidence(ev).forEach(function (e) { errors.push("evidence[" + i + "]: " + e); });
      });
    }
    errors = errors.concat(validateReview(draft.securityReview, "securityReview"));
    errors = errors.concat(validateReview(draft.termsReview, "termsReview"));
    return errors;
  }

  // Full-record validation — used by ensureSeeds (fail-closed import)
  // and available to whole-set integrity checks. Shape + governance
  // consistency only; stage-gate prerequisites are the machine's job.
  function validateResourceCandidate(rec) {
    var errors = [];
    if (!rec || typeof rec !== "object") return ["Record must be an object."];
    if (rec.recordKind !== RECORD_KIND) errors.push("recordKind must be RESOURCE_CANDIDATE.");
    if (rec.registry !== REGISTRY) errors.push("registry must be \"resources\".");
    if (!rec.id || typeof rec.id !== "string") errors.push("Record needs an id.");
    errors = errors.concat(secretKeyErrors(rec, "", []));
    if (!rec.name) errors.push("name is required.");
    if (!rec.provider) errors.push("provider is required.");
    if (!rec.domain) errors.push("domain is required.");
    if (CANDIDATE_TYPES.indexOf(rec.candidateType || "SOURCE") === -1) errors.push("candidateType must be SOURCE or SOFTWARE.");
    if (rec.freeState !== undefined && COST_STATES.indexOf(rec.freeState) === -1) {
      errors.push("freeState must be an exact addendum cost class (" + rec.freeState + " is not one).");
    }
    if (rec.credentialState !== undefined && CREDENTIAL_STATES.indexOf(rec.credentialState) === -1) {
      errors.push("credentialState is not a known existence state.");
    }
    if (STAGES.concat(PARKED_STAGES).concat(TERMINAL_STAGES).indexOf(rec.pipelineStage) === -1) {
      errors.push("Unknown pipelineStage: " + rec.pipelineStage + ".");
    }
    if (rec.verificationStatus !== undefined && rec.verificationStatus !== "UNVERIFIED") {
      errors.push("A resource candidate is never VERIFIED by registration; verificationStatus must be UNVERIFIED.");
    }
    if (rec.pipelineStage === "CONNECTED" && (!rec.connectionEvidence || typeof rec.connectionEvidence !== "string")) {
      errors.push("CONNECTED requires connectionEvidence naming the real wiring.");
    }
    if ((rec.pipelineStage === "OWNER_APPROVED" || rec.pipelineStage === "CONNECTED" || rec.pipelineStage === "DEGRADED") &&
        rec.ownerApprovalState !== "APPROVED") {
      errors.push("Stage " + rec.pipelineStage + " requires ownerApprovalState APPROVED (the owner's recorded decision).");
    }
    if (rec.ownerApprovalState === "APPROVED" && !rec.ownerDecision) {
      errors.push("ownerApprovalState APPROVED requires the recorded ownerDecision.");
    }
    if (rec.pipelineStage === "REJECTED" && !rec.rejection) {
      errors.push("REJECTED requires the retained rejection {reason, at, by}.");
    }
    if (rec.pipelineStage === "SUPERSEDED" && !rec.supersededBy) {
      errors.push("SUPERSEDED requires supersededBy (the surviving record).");
    }
    if (Array.isArray(rec.benefitLabels)) {
      rec.benefitLabels.forEach(function (b) {
        if (BENEFIT_LABELS.indexOf(b) === -1) errors.push("Unknown benefit label: " + b + ".");
      });
    }
    errors = errors.concat(validateReview(rec.securityReview, "securityReview"));
    errors = errors.concat(validateReview(rec.termsReview, "termsReview"));
    return errors;
  }

  function validateGap(gap) {
    var errors = [];
    if (!gap || typeof gap !== "object") return ["Gap must be an object."];
    errors = errors.concat(secretKeyErrors(gap, "", []));
    if (!gap.capability || typeof gap.capability !== "string") errors.push("A gap needs a capability.");
    if (!gap.title || typeof gap.title !== "string") errors.push("A gap needs a title.");
    if (!gap.currentState || typeof gap.currentState !== "string") {
      errors.push("A gap needs a currentState — the honest present state (NO_DATA / NOT_CONNECTED / ...), never an invented one.");
    }
    if (gap.status !== undefined && GAP_STATUSES.indexOf(gap.status) === -1) {
      errors.push("Gap status must be one of " + GAP_STATUSES.join(", ") + ".");
    }
    return errors;
  }

  /* ---------------- creation ---------------- */

  // §38 resource memory: a REJECTED record blocks silent re-discovery
  // of the same identity+capability. Re-review is possible only with
  // a materialChangeNote stating what changed.
  function rejectedMatch(records, draft) {
    var key = identityKey({
      provider: draft.provider, name: draft.name,
      documentation: draft.documentation, originalSource: draft.originalSource,
      domain: draft.domain
    });
    var found = null;
    (records || []).forEach(function (r) {
      if (found || !isCandidate(r) || r.pipelineStage !== "REJECTED") return;
      if (identityKey(r) === key) found = r;
    });
    return found;
  }

  function createCandidate(draft, actor, now) {
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor {type: OWNER|STAR|WORKER, ref} is required — discovery work is always actor-recorded."] });
    var errors = validateCandidateDraft(draft);
    if (errors.length) return Promise.resolve({ ok: false, errors: errors });
    var at = nowIso(now);
    return readAll().then(function (records) {
      var prior = rejectedMatch(records, draft);
      if (prior && !(typeof draft.materialChangeNote === "string" && draft.materialChangeNote.trim())) {
        return { ok: false, errors: ["This provider+capability was already REJECTED (" + prior.id + ", " +
          (prior.rejection ? prior.rejection.at : "date unrecorded") + ": " +
          (prior.rejection ? prior.rejection.reason : "reason unrecorded") +
          "). Resource memory blocks silent re-discovery (§38): re-review requires a materialChangeNote stating what materially changed."] };
      }
      var datePart = at.slice(0, 10).replace(/-/g, "");
      var prefix = "resource-candidate-" + (slugify(draft.provider || draft.name) || "resource") + "-" + datePart + "-";
      var seq = 1;
      records.forEach(function (r) {
        if (r && typeof r.id === "string" && r.id.indexOf(prefix) === 0) {
          var n = parseInt(r.id.slice(prefix.length), 10);
          if (!isNaN(n) && n >= seq) seq = n + 1;
        }
      });
      var rec = {
        id: prefix + (seq < 10 ? "0" + seq : "" + seq),
        recordKind: RECORD_KIND,
        registry: REGISTRY,
        candidateType: draft.candidateType || "SOURCE",
        name: draft.name,
        provider: draft.provider,
        formerName: draft.formerName || null,
        resourceType: draft.resourceType || "OFFICIAL_API",
        domain: draft.domain,
        category: draft.category || null,
        categoryNote: draft.categoryNote || null,
        capabilities: clone(draft.capabilities || [draft.domain]),
        originalSource: draft.originalSource || null,
        documentation: draft.documentation || null,
        repository: draft.repository || null,
        apiDescription: draft.apiDescription || null,
        openApiAvailable: draft.openApiAvailable === undefined ? null : draft.openApiAvailable,
        mcpAvailable: draft.mcpAvailable === undefined ? null : draft.mcpAvailable,
        authenticationType: draft.authenticationType || "UNKNOWN",
        apiKeyRequired: !!draft.apiKeyRequired,
        oauthRequired: !!draft.oauthRequired,
        credentialState: draft.credentialState || (draft.apiKeyRequired || draft.oauthRequired ? "NOT_PROVISIONED" : "NONE_REQUIRED"),
        credentialCustody: draft.credentialCustody || null,
        freeState: draft.freeState || "UNKNOWN",
        catalogCostState: draft.catalogCostState || null,
        commercialUseState: draft.commercialUseState || "UNKNOWN",
        rateLimits: draft.rateLimits || "UNKNOWN",
        geographicCoverage: draft.geographicCoverage || "UNKNOWN",
        dataCoverage: draft.dataCoverage || "UNKNOWN",
        frontendDirectPossible: draft.frontendDirectPossible === undefined ? null : draft.frontendDirectPossible,
        proxyRequired: !!draft.proxyRequired,
        selfHostable: !!draft.selfHostable,
        license: draft.license || "UNKNOWN",
        attribution: draft.attribution || null,
        cachePolicy: draft.cachePolicy || null,
        freshnessCharacteristics: draft.freshnessCharacteristics || "UNKNOWN",
        securityReview: draft.securityReview || { status: "NOT_REVIEWED", note: null, at: null, by: null },
        termsReview: draft.termsReview || { status: "NOT_REVIEWED", note: null, at: null, by: null },
        maintenanceState: draft.maintenanceState || "UNKNOWN",
        integrationComplexity: draft.integrationComplexity || "UNKNOWN",
        expectedBenefit: draft.expectedBenefit || null,
        benefitLabels: clone(draft.benefitLabels || []),
        existingProviderOverlap: draft.existingProviderOverlap || null,
        possibleFallbackFor: clone(draft.possibleFallbackFor || []),
        possibleReplacementFor: clone(draft.possibleReplacementFor || []),
        fallbackRole: draft.fallbackRole || null,
        ownerApprovalState: "NOT_REQUESTED",
        ownerDecision: null,
        pipelineStage: "DISCOVERED",
        dedupe: { verdict: "NOT_RUN", matchedCandidateId: null, matchedResourceId: null, signals: [], checkedAt: null, checkedBy: null },
        rejection: null,
        supersededBy: null,
        connectionEvidence: null,
        routerProviderId: draft.routerProviderId || null,
        gapRefs: clone(draft.gapRefs || []),
        evidence: clone(draft.evidence || []),
        discoveredThrough: draft.discoveredThrough || null,
        discoveredBy: { type: actor.type, ref: actor.ref },
        discoveredAt: at,
        source: draft.source || "worker-discovery",
        verificationStatus: "UNVERIFIED",
        lastReviewedAt: at.slice(0, 10),
        history: [{ from: null, to: "DISCOVERED", actor: actorLabel(actor), at: at,
          note: prior ? "Re-review of a previously REJECTED source with material change stated: " + draft.materialChangeNote.trim() : "Candidate created." }]
      };
      return persist(rec).then(function () { return { ok: true, record: rec }; });
    });
  }

  /* ---------------- dedupe ---------------- */

  // Multi-anchor dedupe (registry spec §8): identity key + recorded
  // signals. A candidate never dedupes into itself; a match against a
  // CONNECTED candidate is recorded as matchedResourceId (the
  // connected record IS the registry entry — there is no second
  // canonical resource store in this design).
  function runDedupe(id, actor, now) {
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor is required to run dedupe."] });
    return getCandidate(id).then(function (rec) {
      if (!rec) return { ok: false, errors: ["Candidate not found: " + id + "."] };
      if (TERMINAL_STAGES.indexOf(rec.pipelineStage) !== -1) {
        return { ok: false, errors: ["Candidate is terminal (" + rec.pipelineStage + "); its record is closed."] };
      }
      return listCandidates().then(function (all) {
        var key = identityKey(rec);
        var signals = [];
        var match = null, variant = null;
        all.forEach(function (other) {
          if (!other || other.id === rec.id) return;
          if (TERMINAL_STAGES.indexOf(other.pipelineStage) !== -1 && other.pipelineStage !== "REJECTED") return;
          var oKey = identityKey(other);
          if (oKey === key) {
            match = other;
            signals.push("same identity key (provider + documentation anchor + domain): " + other.id);
          } else if (normText(other.provider) === normText(rec.provider) && normText(other.domain) === normText(rec.domain)) {
            variant = variant || other;
            signals.push("same provider + domain, different anchor (variant candidate): " + other.id);
          }
          if (rec.documentation && other.documentation && normText(rec.documentation) === normText(other.documentation) && normText(other.domain) === normText(rec.domain)) {
            if (!match) { match = other; }
            signals.push("same documentation URL + domain: " + other.id);
          }
        });
        var verdict = "DISTINCT", matchedCandidateId = null, matchedResourceId = null;
        if (match) {
          verdict = "DUPLICATE";
          if (match.pipelineStage === "CONNECTED") matchedResourceId = match.id;
          else matchedCandidateId = match.id;
        } else if (variant) {
          verdict = "VARIANT_OF";
          matchedCandidateId = variant.id;
        }
        rec.dedupe = {
          verdict: verdict,
          matchedCandidateId: matchedCandidateId,
          matchedResourceId: matchedResourceId,
          signals: signals,
          checkedAt: nowIso(now),
          checkedBy: actorLabel(actor)
        };
        rec.history = (rec.history || []).concat([{
          from: rec.pipelineStage, to: rec.pipelineStage, actor: actorLabel(actor), at: nowIso(now),
          note: "Dedupe run: " + verdict + (matchedCandidateId || matchedResourceId ? " (match: " + (matchedResourceId || matchedCandidateId) + ")" : "") + "."
        }]);
        return persist(rec).then(function () { return { ok: true, record: rec, verdict: verdict }; });
      });
    });
  }

  /* ---------------- evidence / reviews / field updates ---------------- */

  function addEvidence(id, evidence, actor, now) {
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor is required to attach evidence."] });
    var errors = validateEvidence(evidence);
    if (errors.length) return Promise.resolve({ ok: false, errors: errors });
    return getCandidate(id).then(function (rec) {
      if (!rec) return { ok: false, errors: ["Candidate not found: " + id + "."] };
      if (TERMINAL_STAGES.indexOf(rec.pipelineStage) !== -1) {
        return { ok: false, errors: ["Candidate is terminal (" + rec.pipelineStage + "); its evidence record is closed."] };
      }
      var ev = clone(evidence);
      if (!ev.at) ev.at = nowIso(now);
      rec.evidence = (rec.evidence || []).concat([ev]);
      rec.history = (rec.history || []).concat([{
        from: rec.pipelineStage, to: rec.pipelineStage, actor: actorLabel(actor), at: nowIso(now),
        note: "Evidence attached (" + ev.kind + ": " + ev.ref + ")."
      }]);
      return persist(rec).then(function () { return { ok: true, record: rec }; });
    });
  }

  // Reviews are recorded facts (who reviewed what, when, with what
  // outcome), not stage claims: the stage machine reads them at the
  // SECURITY_REVIEWED / TERMS_REVIEWED gates.
  function recordReview(id, kind, review, actor, now) {
    review = review || {};
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor is required to record a review."] });
    if (kind !== "security" && kind !== "terms") {
      return Promise.resolve({ ok: false, errors: ["Review kind must be \"security\" or \"terms\"."] });
    }
    var status = review.status || "REVIEWED";
    if (REVIEW_STATUSES.indexOf(status) === -1) {
      return Promise.resolve({ ok: false, errors: ["Review status must be one of " + REVIEW_STATUSES.join(", ") + "."] });
    }
    return getCandidate(id).then(function (rec) {
      if (!rec) return { ok: false, errors: ["Candidate not found: " + id + "."] };
      if (TERMINAL_STAGES.indexOf(rec.pipelineStage) !== -1) {
        return { ok: false, errors: ["Candidate is terminal (" + rec.pipelineStage + "); its record is closed."] };
      }
      var field = kind === "security" ? "securityReview" : "termsReview";
      rec[field] = { status: status, note: review.note || null, at: nowIso(now), by: actorLabel(actor) };
      rec.lastReviewedAt = nowIso(now).slice(0, 10);
      rec.history = (rec.history || []).concat([{
        from: rec.pipelineStage, to: rec.pipelineStage, actor: actorLabel(actor), at: nowIso(now),
        note: (kind === "security" ? "Security" : "Terms") + " review recorded: " + status + (review.note ? " — " + review.note : "") + "."
      }]);
      return persist(rec).then(function () { return { ok: true, record: rec }; });
    });
  }

  // Research-field updates only. Governance fields (stage, owner
  // decision, truth, identity) are NOT patchable here — they move
  // through the machine and the owner functions, never by edit.
  var PATCHABLE = ["category", "categoryNote", "capabilities", "documentation",
    "repository", "apiDescription", "openApiAvailable", "mcpAvailable",
    "authenticationType", "apiKeyRequired", "oauthRequired", "credentialState",
    "credentialCustody", "freeState", "commercialUseState", "rateLimits",
    "geographicCoverage", "dataCoverage", "frontendDirectPossible",
    "proxyRequired", "selfHostable", "license", "attribution", "cachePolicy",
    "freshnessCharacteristics", "maintenanceState", "integrationComplexity",
    "expectedBenefit", "benefitLabels", "existingProviderOverlap",
    "possibleFallbackFor", "possibleReplacementFor", "fallbackRole",
    "routerProviderId", "formerName"];
  function updateCandidate(id, patch, actor, now) {
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor is required to update a candidate."] });
    if (!patch || typeof patch !== "object") return Promise.resolve({ ok: false, errors: ["A patch object is required."] });
    var secErrs = secretKeyErrors(patch, "", []);
    if (secErrs.length) return Promise.resolve({ ok: false, errors: secErrs });
    var bad = Object.keys(patch).filter(function (k) { return PATCHABLE.indexOf(k) === -1; });
    if (bad.length) {
      return Promise.resolve({ ok: false, errors: ["Fields not patchable through updateCandidate (governance moves through the stage machine / owner functions only): " + bad.join(", ") + "."] });
    }
    if (patch.freeState !== undefined && COST_STATES.indexOf(patch.freeState) === -1) {
      return Promise.resolve({ ok: false, errors: ["freeState must be an exact addendum cost class."] });
    }
    if (patch.benefitLabels !== undefined) {
      var bErr = [];
      (patch.benefitLabels || []).forEach(function (b) {
        if (BENEFIT_LABELS.indexOf(b) === -1) bErr.push("Unknown benefit label: " + b + ".");
      });
      if (bErr.length) return Promise.resolve({ ok: false, errors: bErr });
    }
    return getCandidate(id).then(function (rec) {
      if (!rec) return { ok: false, errors: ["Candidate not found: " + id + "."] };
      if (TERMINAL_STAGES.indexOf(rec.pipelineStage) !== -1) {
        return { ok: false, errors: ["Candidate is terminal (" + rec.pipelineStage + "); its record is closed."] };
      }
      Object.keys(patch).forEach(function (k) { rec[k] = clone(patch[k]); });
      rec.lastReviewedAt = nowIso(now).slice(0, 10);
      rec.history = (rec.history || []).concat([{
        from: rec.pipelineStage, to: rec.pipelineStage, actor: actorLabel(actor), at: nowIso(now),
        note: "Research fields updated: " + Object.keys(patch).join(", ") + "."
      }]);
      return persist(rec).then(function () { return { ok: true, record: rec }; });
    });
  }

  /* ---------------- stage machine ---------------- */

  // The ONLY way a candidate changes stage inside the working
  // pipeline. Enforces: known stages, linear order (no skipping),
  // terminal-stage rules, stage entry requirements, append-only
  // history with the actor recorded. OWNER_APPROVED and CONNECTED are
  // refused here by construction (not reachable targets): approval is
  // the owner's decision function and connection is an evidence
  // recording — neither is a stage transition this machine performs.
  // DEGRADED is likewise refused here; it is entered only through
  // markDegraded() from CONNECTED.
  function transitionCandidate(id, toStage, actor, opts) {
    opts = opts || {};
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor is required for a stage transition."] });
    return getCandidate(id).then(function (rec) {
      if (!rec) return { ok: false, errors: ["Candidate not found: " + id + "."] };
      var from = rec.pipelineStage;
      if (TERMINAL_STAGES.indexOf(from) !== -1) {
        return { ok: false, errors: ["Candidate is in terminal stage " + from + "; terminal candidates never transition again (retained as resource memory)."] };
      }
      if (toStage === "OWNER_APPROVED") {
        return { ok: false, errors: ["OWNER_APPROVED is not a stage transition: it is set only by the owner's decision function approveCandidate() (§35/§36)."] };
      }
      if (toStage === "CONNECTED") {
        return { ok: false, errors: ["CONNECTED is not a stage transition: it is recorded only by markConnected() with wiring evidence. The engine records connections; it never wires code itself."] };
      }
      if (toStage === "DEGRADED") {
        return { ok: false, errors: ["DEGRADED is entered only from CONNECTED through markDegraded() with a measured health failure note."] };
      }
      if (from === "DEGRADED") {
        return { ok: false, errors: ["Candidate is DEGRADED; the only way back is restoreConnected() with fresh wiring/health evidence."] };
      }
      if (toStage === "REJECTED") {
        if (!opts.reason || typeof opts.reason !== "string" || !opts.reason.trim()) {
          return { ok: false, errors: ["REJECTED requires a reason (retained as resource memory, §38)."] };
        }
        rec.rejection = { reason: opts.reason.trim(), at: nowIso(opts.now), by: actorLabel(actor) };
      } else if (toStage === "SUPERSEDED") {
        var sup = opts.supersededBy || rec.dedupe.matchedResourceId || rec.dedupe.matchedCandidateId;
        if (!sup) {
          return { ok: false, errors: ["SUPERSEDED requires supersededBy — the surviving record that replaces this one."] };
        }
        return getCandidate(sup).then(function (survivor) {
          if (!survivor) return { ok: false, errors: ["supersededBy \"" + sup + "\" is not a recorded candidate; a superseding record must exist."] };
          rec.supersededBy = sup;
          return applyTransition(rec, from, "SUPERSEDED", actor, opts,
            "Superseded by " + sup + ".");
        });
      } else {
        if (STAGES.indexOf(toStage) === -1) {
          return { ok: false, errors: ["Unknown stage: " + toStage + "."] };
        }
        if (NEXT_STAGE[from] !== toStage) {
          return { ok: false, errors: ["Illegal stage transition " + from + " -> " + toStage + ": stages advance one step at a time (next legal stage is " + (NEXT_STAGE[from] || "none") + "), or to REJECTED / SUPERSEDED."] };
        }
        // Stage entry requirements (fail-closed: a stage name is
        // never claimed without its work).
        if (toStage === "NORMALIZED" && (!rec.name || !rec.provider || !rec.domain)) {
          return { ok: false, errors: ["NORMALIZED requires name, provider and domain as the provider states them."] };
        }
        if (toStage === "DEDUPED" && rec.dedupe.verdict === "NOT_RUN") {
          return { ok: false, errors: ["DEDUPED requires a recorded dedupe run (runDedupe first)."] };
        }
        if (toStage === "DEDUPED" && (rec.dedupe.verdict === "DUPLICATE" || rec.dedupe.verdict === "VARIANT_OF")) {
          return { ok: false, errors: ["Dedupe verdict is " + rec.dedupe.verdict + " against " + (rec.dedupe.matchedResourceId || rec.dedupe.matchedCandidateId) + "; the candidate cannot advance as a distinct resource. Supersede it or reject it."] };
        }
        if (toStage === "TESTED" && !(rec.evidence || []).some(function (ev) { return ev.kind === "TEST" || ev.kind === "ENDPOINT_PROBE"; })) {
          return { ok: false, errors: ["TESTED requires a recorded capability test (evidence of kind TEST or ENDPOINT_PROBE — the record of a real test call, not a vibe)."] };
        }
        if (toStage === "SECURITY_REVIEWED" && (!rec.securityReview || rec.securityReview.status !== "REVIEWED")) {
          return { ok: false, errors: ["SECURITY_REVIEWED requires a recorded security review with status REVIEWED (recordReview first)."] };
        }
        if (toStage === "TERMS_REVIEWED") {
          if (!rec.termsReview || rec.termsReview.status === "TERMS_REVIEW_REQUIRED") {
            return { ok: false, errors: ["TERMS_REVIEW_REQUIRED stands on this candidate; it cannot pass the terms gate while the flag stands."] };
          }
          if (!rec.termsReview || rec.termsReview.status !== "REVIEWED") {
            return { ok: false, errors: ["TERMS_REVIEWED requires a recorded terms review with status REVIEWED (recordReview first)."] };
          }
          if (!rec.license || rec.license === "UNKNOWN") {
            return { ok: false, errors: ["TERMS_REVIEWED requires a known license; UNKNOWN blocks the terms gate."] };
          }
        }
        if (toStage === "PREPARED") {
          if (!rec.evidence || rec.evidence.length < 1) {
            return { ok: false, errors: ["PREPARED requires at least one evidence entry with provenance. Absence of evidence caps a candidate below PREPARED."] };
          }
          if (rec.ownerApprovalState === "NOT_REQUESTED") rec.ownerApprovalState = "PENDING";
        }
      }
      return applyTransition(rec, from, toStage, actor, opts, opts.note || null);
    });
  }
  function applyTransition(rec, from, toStage, actor, opts, defaultNote) {
    rec.pipelineStage = toStage;
    rec.lastReviewedAt = nowIso(opts.now).slice(0, 10);
    rec.history = (rec.history || []).concat([{
      from: from, to: toStage, actor: actorLabel(actor), at: nowIso(opts.now),
      note: defaultNote || (toStage === "REJECTED" ? "Rejected: " + (rec.rejection ? rec.rejection.reason : "") : "Stage advanced.")
    }]);
    return persist(rec).then(function () { return { ok: true, record: rec }; });
  }

  /* ---------------- owner decisions (§36) ---------------- */

  // THE owner approval. The only code path that can set
  // OWNER_APPROVED / ownerApprovalState APPROVED. The decision is
  // recorded with date + note and persists on the candidate.
  function approveCandidate(id, opts) {
    opts = opts || {};
    var gateErr = ownerError(opts, "approve a resource candidate");
    if (gateErr) return Promise.resolve({ ok: false, errors: [gateErr] });
    var actor = ownerActorFrom(opts);
    var at = opts.at || nowIso(opts.now);
    return getCandidate(id).then(function (rec) {
      if (!rec) return { ok: false, errors: ["Candidate not found: " + id + "."] };
      if (rec.pipelineStage !== "PREPARED") {
        return { ok: false, errors: ["Only a PREPARED candidate can be approved (current stage: " + rec.pipelineStage + "). The §36 card decides on prepared candidates; nothing is approved mid-pipeline."] };
      }
      rec.pipelineStage = "OWNER_APPROVED";
      rec.ownerApprovalState = "APPROVED";
      rec.ownerDecision = { decision: "APPROVED", by: actorLabel(actor), at: at, note: opts.note || null };
      rec.lastReviewedAt = at.slice(0, 10);
      rec.history = (rec.history || []).concat([{
        from: "PREPARED", to: "OWNER_APPROVED", actor: actorLabel(actor), at: at,
        note: "Owner decision: APPROVED" + (opts.note ? " — " + opts.note : "") + ". Approval authorizes integration planning; connection still requires real wiring recorded by markConnected()."
      }]);
      return persist(rec).then(function () { return { ok: true, record: rec }; });
    });
  }

  // Owner REJECT from the §36 card: PREPARED only, reason required,
  // terminal, retained as resource memory (§38).
  function rejectCandidate(id, opts) {
    opts = opts || {};
    var gateErr = ownerError(opts, "reject a resource candidate");
    if (gateErr) return Promise.resolve({ ok: false, errors: [gateErr] });
    var reason = opts.reason || opts.note;
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return Promise.resolve({ ok: false, errors: ["REJECT requires a reason (retained as resource memory with the decision date, §38)."] });
    }
    var actor = ownerActorFrom(opts);
    var at = opts.at || nowIso(opts.now);
    return getCandidate(id).then(function (rec) {
      if (!rec) return { ok: false, errors: ["Candidate not found: " + id + "."] };
      if (rec.pipelineStage !== "PREPARED") {
        return { ok: false, errors: ["The §36 owner card decides on PREPARED candidates; this candidate is at " + rec.pipelineStage + "."] };
      }
      rec.pipelineStage = "REJECTED";
      rec.ownerApprovalState = "REJECTED";
      rec.ownerDecision = { decision: "REJECTED", by: actorLabel(actor), at: at, note: reason.trim() };
      rec.rejection = { reason: reason.trim(), at: at, by: actorLabel(actor) };
      rec.lastReviewedAt = at.slice(0, 10);
      rec.history = (rec.history || []).concat([{
        from: "PREPARED", to: "REJECTED", actor: actorLabel(actor), at: at,
        note: "Owner decision: REJECTED — " + reason.trim()
      }]);
      return persist(rec).then(function () { return { ok: true, record: rec }; });
    });
  }

  // Owner LATER from the §36 card: the candidate stays PREPARED in
  // the queue; the deferral is recorded with date + note.
  function deferCandidate(id, opts) {
    opts = opts || {};
    var gateErr = ownerError(opts, "defer a resource candidate");
    if (gateErr) return Promise.resolve({ ok: false, errors: [gateErr] });
    var actor = ownerActorFrom(opts);
    var at = opts.at || nowIso(opts.now);
    return getCandidate(id).then(function (rec) {
      if (!rec) return { ok: false, errors: ["Candidate not found: " + id + "."] };
      if (rec.pipelineStage !== "PREPARED") {
        return { ok: false, errors: ["The §36 owner card decides on PREPARED candidates; this candidate is at " + rec.pipelineStage + "."] };
      }
      rec.ownerApprovalState = "LATER";
      rec.ownerDecision = { decision: "LATER", by: actorLabel(actor), at: at, note: opts.note || null };
      rec.lastReviewedAt = at.slice(0, 10);
      rec.history = (rec.history || []).concat([{
        from: "PREPARED", to: "PREPARED", actor: actorLabel(actor), at: at,
        note: "Owner decision: LATER" + (opts.note ? " — " + opts.note : "") + ". Candidate remains PREPARED in the decision queue."
      }]);
      return persist(rec).then(function () { return { ok: true, record: rec }; });
    });
  }

  /* ---------------- connection recording ---------------- */

  // Records that real wiring EXISTS for an owner-approved candidate.
  // The wiring evidence must name the wiring (file + mechanism); a
  // bare claim is refused. This function never wires anything itself.
  function markConnected(id, actor, opts) {
    opts = opts || {};
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor is required to record a connection."] });
    if (!opts.wiringEvidence || typeof opts.wiringEvidence !== "string" || !opts.wiringEvidence.trim()) {
      return Promise.resolve({ ok: false, errors: ["CONNECTED requires wiringEvidence naming the real adapter/registry wiring (e.g. \"js/provider-router.js CHAINS entry + ApiRegistry outcomes\"). The engine records connections; it never wires code itself."] });
    }
    return getCandidate(id).then(function (rec) {
      if (!rec) return { ok: false, errors: ["Candidate not found: " + id + "."] };
      if (rec.pipelineStage !== "OWNER_APPROVED") {
        return { ok: false, errors: ["Only an OWNER_APPROVED candidate can be recorded CONNECTED (current stage: " + rec.pipelineStage + "). Approval precedes connection, always (§35)."] };
      }
      rec.pipelineStage = "CONNECTED";
      rec.connectionEvidence = opts.wiringEvidence.trim();
      rec.evidence = (rec.evidence || []).concat([{
        kind: "WIRING", ref: "connectionEvidence", note: opts.wiringEvidence.trim(), at: nowIso(opts.now)
      }]);
      rec.lastReviewedAt = nowIso(opts.now).slice(0, 10);
      rec.history = (rec.history || []).concat([{
        from: "OWNER_APPROVED", to: "CONNECTED", actor: actorLabel(actor), at: nowIso(opts.now),
        note: "Connection recorded with wiring evidence: " + opts.wiringEvidence.trim()
      }]);
      return persist(rec).then(function () { return { ok: true, record: rec }; });
    });
  }

  // CONNECTED -> DEGRADED on a MEASURED health failure (the note must
  // state the measurement — a router health state, an observed 429 /
  // outage — not an impression).
  function markDegraded(id, actor, opts) {
    opts = opts || {};
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor is required to record degradation."] });
    if (!opts.note || typeof opts.note !== "string" || !opts.note.trim()) {
      return Promise.resolve({ ok: false, errors: ["DEGRADED requires a note stating the measured health failure (router health state / observed provider response)."] });
    }
    return getCandidate(id).then(function (rec) {
      if (!rec) return { ok: false, errors: ["Candidate not found: " + id + "."] };
      if (rec.pipelineStage !== "CONNECTED") {
        return { ok: false, errors: ["Only a CONNECTED candidate can degrade (current stage: " + rec.pipelineStage + ")."] };
      }
      rec.pipelineStage = "DEGRADED";
      rec.history = (rec.history || []).concat([{
        from: "CONNECTED", to: "DEGRADED", actor: actorLabel(actor), at: nowIso(opts.now),
        note: "Degraded on measured health failure: " + opts.note.trim()
      }]);
      return persist(rec).then(function () { return { ok: true, record: rec }; });
    });
  }

  // DEGRADED -> CONNECTED with fresh wiring/health evidence.
  function restoreConnected(id, actor, opts) {
    opts = opts || {};
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor is required to restore a connection."] });
    if (!opts.wiringEvidence || typeof opts.wiringEvidence !== "string" || !opts.wiringEvidence.trim()) {
      return Promise.resolve({ ok: false, errors: ["Restoring CONNECTED requires fresh wiring/health evidence (e.g. the router health state that recovered)."] });
    }
    return getCandidate(id).then(function (rec) {
      if (!rec) return { ok: false, errors: ["Candidate not found: " + id + "."] };
      if (rec.pipelineStage !== "DEGRADED") {
        return { ok: false, errors: ["Only a DEGRADED candidate can be restored to CONNECTED (current stage: " + rec.pipelineStage + ")."] };
      }
      rec.pipelineStage = "CONNECTED";
      rec.connectionEvidence = opts.wiringEvidence.trim();
      rec.history = (rec.history || []).concat([{
        from: "DEGRADED", to: "CONNECTED", actor: actorLabel(actor), at: nowIso(opts.now),
        note: "Connection restored with fresh evidence: " + opts.wiringEvidence.trim()
      }]);
      return persist(rec).then(function () { return { ok: true, record: rec }; });
    });
  }

  /* ---------------- capability gaps (§5) ---------------- */

  function createGap(draft, actor, now) {
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor is required to publish a capability gap."] });
    var errors = validateGap(draft);
    if (errors.length) return Promise.resolve({ ok: false, errors: errors });
    var at = nowIso(now);
    var rec = {
      id: draft.id || ("resource-gap-" + (slugify(draft.capability) || "gap") + "-" + at.slice(0, 10).replace(/-/g, "")),
      recordKind: GAP_KIND,
      registry: REGISTRY,
      capability: draft.capability,
      title: draft.title,
      currentState: draft.currentState,
      description: draft.description || null,
      currentFreeOptions: draft.currentFreeOptions || null,
      limitation: draft.limitation || null,
      paidOption: draft.paidOption === undefined ? null : draft.paidOption,
      expectedBenefit: draft.expectedBenefit || null,
      ownerDecisionRequired: draft.ownerDecisionRequired !== false,
      status: draft.status || "OPEN",
      candidateRefs: clone(draft.candidateRefs || []),
      source: draft.source || "worker-discovery",
      discoveredBy: { type: actor.type, ref: actor.ref },
      discoveredAt: at,
      history: [{ from: null, to: draft.status || "OPEN", actor: actorLabel(actor), at: at, note: "Capability gap published." }]
    };
    return persist(rec).then(function () { return { ok: true, record: rec }; });
  }

  // Links a candidate to a gap on BOTH records (gap.candidateRefs and
  // candidate.gapRefs), so the relationship resolves from either side.
  function linkGap(gapId, candidateId, actor, now) {
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor is required to link a gap."] });
    return Promise.all([getGap(gapId), getCandidate(candidateId)]).then(function (pair) {
      var gap = pair[0], cand = pair[1];
      if (!gap) return { ok: false, errors: ["Gap not found: " + gapId + "."] };
      if (!cand) return { ok: false, errors: ["Candidate not found: " + candidateId + "."] };
      var changed = false;
      gap.candidateRefs = gap.candidateRefs || [];
      if (gap.candidateRefs.indexOf(candidateId) === -1) { gap.candidateRefs.push(candidateId); changed = true; }
      cand.gapRefs = cand.gapRefs || [];
      if (cand.gapRefs.indexOf(gapId) === -1) { cand.gapRefs.push(gapId); changed = true; }
      if (!changed) return { ok: true, gap: gap, candidate: cand, alreadyLinked: true };
      gap.history = (gap.history || []).concat([{
        from: gap.status, to: gap.status, actor: actorLabel(actor), at: nowIso(now),
        note: "Candidate linked: " + candidateId + "."
      }]);
      cand.history = (cand.history || []).concat([{
        from: cand.pipelineStage, to: cand.pipelineStage, actor: actorLabel(actor), at: nowIso(now),
        note: "Linked to capability gap: " + gapId + "."
      }]);
      return persist(gap).then(function () {
        return persist(cand).then(function () { return { ok: true, gap: gap, candidate: cand }; });
      });
    });
  }

  /* ---------------- seed import ---------------- */

  // Imports the frozen catalog seeds (js/data/resource-seeds.js) on
  // first run. Idempotent by id and NEVER overwrites an existing
  // record: once a seed is in the store, the store copy is the living
  // governed record (stage moves, owner decisions) and the file is
  // only its import source. Fail-closed: any seed failing
  // validateResourceCandidate / validateGap is skipped and reported,
  // never written.
  function ensureSeeds(now) {
    var seeds = global.ResourceSeeds;
    if (!seeds || !Array.isArray(seeds.candidates)) {
      return Promise.resolve({ ok: false, written: 0, skipped: 0, errors: ["ResourceSeeds not loaded — no seeds imported."] });
    }
    return readAll().then(function (records) {
      var existing = {};
      records.forEach(function (r) { if (r && r.id) existing[r.id] = true; });
      var written = 0, skipped = 0, errors = [];
      var chain = Promise.resolve();
      function queue(rec, errs) {
        chain = chain.then(function () {
          if (existing[rec.id]) { skipped++; return null; }
          if (errs.length) { errors.push(rec.id + ": " + errs.join(" ")); return null; }
          existing[rec.id] = true;
          return persist(clone(rec)).then(function () { written++; });
        });
      }
      (seeds.candidates || []).forEach(function (rec) { queue(rec, validateResourceCandidate(rec)); });
      (seeds.gaps || []).forEach(function (rec) {
        var errs = validateGap(rec);
        if (!rec.id) errs.push("Gap needs an id.");
        queue(rec, errs);
      });
      return chain.then(function () {
        return { ok: errors.length === 0, written: written, skipped: skipped, errors: errors };
      });
    });
  }

  /* ---------------- health (§26) ---------------- */

  // Measured or UNKNOWN. Router-wired candidates read the Capability
  // Router's measured health (ProviderRouter.health(), derived from
  // ApiRegistry outcomes + breaker state). Every other candidate is
  // UNKNOWN — the engine has no measured feed for it and says so.
  function health() {
    var routerHealth = null;
    try {
      if (global.ProviderRouter && typeof global.ProviderRouter.health === "function") {
        routerHealth = global.ProviderRouter.health();
      }
    } catch (e) { routerHealth = null; }
    return listCandidates().then(function (list) {
      var byCandidate = {};
      list.forEach(function (c) {
        var state = "UNKNOWN";
        if (c.routerProviderId && routerHealth && routerHealth[c.routerProviderId]) {
          state = routerHealth[c.routerProviderId].state || "UNKNOWN";
        }
        byCandidate[c.id] = {
          candidateId: c.id,
          provider: c.provider,
          routerProviderId: c.routerProviderId || null,
          state: state,
          measured: state !== "UNKNOWN" && !!c.routerProviderId
        };
      });
      return { byCandidate: byCandidate, router: routerHealth };
    });
  }

  /* ---------------- read-only summary ---------------- */

  // ONE derivation of Resource Engine state for STAR and the Bot
  // Operations panel (EntityGate.pipelineSummary parity): counts by
  // stage, open gaps, candidates awaiting the owner's decision, and
  // recorded owner decisions. READ-ONLY — this function never writes.
  // A "decision" in the summary is an OWNER decision: an entry
  // recorded by an OWNER actor through the decision functions
  // (approve / reject / defer). Seed-import provenance and worker
  // connection recordings are history, not owner decisions, and are
  // never presented as such.
  function isOwnerDecision(h) {
    if (!h || typeof h.actor !== "string" || h.actor.indexOf("OWNER:") !== 0) return false;
    if (h.to === "OWNER_APPROVED") return true;
    if (h.from === "PREPARED" && (h.to === "REJECTED" || h.to === "PREPARED")) return true;
    return false;
  }
  function summary(now) {
    return Promise.all([listCandidates(), listGaps(), health()]).then(function (res) {
      var list = res[0] || [];
      var gaps = res[1] || [];
      var stageOrder = STAGES.concat(PARKED_STAGES).concat(TERMINAL_STAGES);
      var counts = {};
      stageOrder.forEach(function (s) { counts[s] = 0; });
      list.forEach(function (c) {
        if (c && counts.hasOwnProperty(c.pipelineStage)) counts[c.pipelineStage] += 1;
      });
      var workingCount = 0;
      STAGES.slice(0, 8).forEach(function (s) { workingCount += counts[s]; });
      var staleCount = 0;
      list.forEach(function (c) { if (c && isStale(c, now)) staleCount += 1; });
      var awaiting = list.filter(function (c) { return c && c.pipelineStage === "PREPARED"; }).map(function (c) {
        return {
          candidateId: c.id, name: c.name, provider: c.provider,
          domain: c.domain, ownerApprovalState: c.ownerApprovalState,
          freeState: c.freeState, apiKeyRequired: !!c.apiKeyRequired
        };
      });
      var decisions = [];
      list.forEach(function (c) {
        if (!c) return;
        (Array.isArray(c.history) ? c.history : []).forEach(function (h) {
          if (isOwnerDecision(h)) {
            decisions.push({
              candidateId: c.id, name: c.name || c.id,
              from: h.from, to: h.to, actor: h.actor || "UNKNOWN",
              at: h.at || null, note: h.note || ""
            });
          }
        });
      });
      decisions.sort(function (a, b) {
        var ta = a.at ? Date.parse(a.at) : 0;
        var tb = b.at ? Date.parse(b.at) : 0;
        return tb - ta;
      });
      var openGaps = gaps.filter(function (g) { return g && g.status === "OPEN"; }).map(function (g) {
        return {
          gapId: g.id, capability: g.capability, title: g.title,
          currentState: g.currentState, ownerDecisionRequired: !!g.ownerDecisionRequired,
          candidateRefs: (g.candidateRefs || []).slice()
        };
      });
      return {
        total: list.length,
        counts: counts,
        stageOrder: stageOrder,
        workingCount: workingCount,
        connectedCount: counts.CONNECTED || 0,
        degradedCount: counts.DEGRADED || 0,
        ownerApprovedCount: counts.OWNER_APPROVED || 0,
        awaitingDecision: awaiting,
        awaitingDecisionCount: awaiting.length,
        terminalCount: (counts.REJECTED || 0) + (counts.SUPERSEDED || 0),
        rejectedCount: counts.REJECTED || 0,
        supersededCount: counts.SUPERSEDED || 0,
        staleCount: staleCount,
        gapsTotal: gaps.length,
        openGaps: openGaps,
        openGapCount: openGaps.length,
        decisions: decisions.slice(0, 8),
        health: res[2]
      };
    }).catch(function () { return null; });
  }

  global.ResourceEngine = {
    VERSION: "RE-1",
    STORE: STORE, RECORD_KIND: RECORD_KIND, GAP_KIND: GAP_KIND, REGISTRY: REGISTRY,
    STAGES: STAGES, PARKED_STAGES: PARKED_STAGES, TERMINAL_STAGES: TERMINAL_STAGES,
    NEXT_STAGE: NEXT_STAGE, COST_STATES: COST_STATES, COST_CLASSES_8: COST_CLASSES_8, mapCostClass: mapCostClass, BENEFIT_LABELS: BENEFIT_LABELS,
    CREDENTIAL_STATES: CREDENTIAL_STATES, STALE_DAYS: STALE_DAYS,
    isCandidate: isCandidate, isGap: isGap, identityKey: identityKey, anchorHost: anchorHost,
    validateCandidateDraft: validateCandidateDraft,
    validateResourceCandidate: validateResourceCandidate,
    validateGap: validateGap, validateEvidence: validateEvidence,
    createCandidate: createCandidate, getCandidate: getCandidate,
    listCandidates: listCandidates, stageCounts: stageCounts,
    runDedupe: runDedupe, addEvidence: addEvidence, recordReview: recordReview,
    updateCandidate: updateCandidate, transitionCandidate: transitionCandidate,
    approveCandidate: approveCandidate, rejectCandidate: rejectCandidate,
    deferCandidate: deferCandidate,
    markConnected: markConnected, markDegraded: markDegraded, restoreConnected: restoreConnected,
    createGap: createGap, getGap: getGap, listGaps: listGaps, linkGap: linkGap,
    ensureSeeds: ensureSeeds, isStale: isStale, health: health, summary: summary
  };
})(window);
