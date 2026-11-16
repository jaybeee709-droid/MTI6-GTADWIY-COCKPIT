/*
 * MTI6-GTADWIY-COCKPIT — Entity Candidates (P3: Candidate / Continuous
 * Discovery Foundation).
 *
 * The governed front door for Entity Universe growth. A candidate is a
 * PROPOSAL, never a canonical entity: it lives in the same cryptoWorld
 * IndexedDB store as canonical records, structurally distinguished by
 * recordKind "ENTITY_CANDIDATE" and registry "entity-candidates", and it
 * is excluded from every canonical view (CryptoWorld.getAllRecords
 * filters this recordKind out; the import gate's canonical context
 * ignores it; registries never hydrate from it).
 *
 * Pipeline (owner-ruled): DISCOVER -> IDENTIFY -> DEDUPLICATE ->
 * CLASSIFY -> RESOLVE CANONICAL IDENTITY -> MAP RELATIONSHIPS ->
 * COLLECT EVIDENCE -> PREPARE -> [AUTHORITY GATE — P4, NOT HERE] ->
 * REGISTER. This module implements the stages up to PREPARED plus the
 * terminal stages REJECTED and DUPLICATE. There is deliberately NO
 * transition into GATED or REGISTERED and NO code path in this module
 * that writes a canonical record, registers into Network/Asset/Protocol
 * Intelligence, or promotes a truth state.
 *
 * Truth rule (non-negotiable): candidates are born UNVERIFIED and
 * cannot rise inside the pipeline. PREPARED != REGISTERED != VERIFIED.
 * DISCOVERED/IDENTIFIED/DEDUPED/RESOLVED/MAPPED != VERIFIED.
 *
 * Identity rule (owner anchor rule): an uncertain identity anchor is
 * OMITTED / MARKED UNKNOWN, never filled from recollection. Dedupe and
 * resolution NEVER rely on ticker or display name alone.
 *
 * Every stage transition is a pure, actor-recorded operation: history[]
 * is append-only and each entry names the actor that performed it, so
 * future STAR / Tribe worker assignments can own stages without
 * redesign. The authority gate is never a worker stage.
 *
 * Zero financial authority: this module imports nothing from wallet or
 * execution paths and rejects any candidate carrying a financial field
 * (price / apy / tvl / balance / ...), same vocabulary as the entity
 * import gate.
 */
(function (global) {
  "use strict";

  var STORE = "cryptoWorld";
  var RECORD_KIND = "ENTITY_CANDIDATE";
  var REGISTRY = "entity-candidates";
  var STALE_DAYS = 90;

  var KINDS = ["NETWORK", "ASSET", "PROTOCOL"];
  var CANDIDATE_TYPES = ["NEW_ENTITY", "UPDATE_PROPOSAL"];
  var ACTOR_TYPES = ["OWNER", "STAR", "WORKER"];
  var EVIDENCE_KINDS = ["OWNER_STATEMENT", "OFFICIAL_DOC", "REGISTRY", "ONCHAIN_ANCHOR", "SECONDARY"];

  // Linear pipeline stages buildable in P3. GATED / REGISTERED exist in
  // the wider design vocabulary but are NOT enterable here: the
  // authority gate belongs to P4 and promotion is a separate owner act.
  var STAGES = ["DISCOVERED", "IDENTIFIED", "DEDUPED", "CLASSIFIED", "RESOLVED", "MAPPED", "PREPARED"];
  var TERMINAL_STAGES = ["REJECTED", "DUPLICATE"];
  var NEXT_STAGE = {
    DISCOVERED: "IDENTIFIED",
    IDENTIFIED: "DEDUPED",
    DEDUPED: "CLASSIFIED",
    CLASSIFIED: "RESOLVED",
    RESOLVED: "MAPPED",
    MAPPED: "PREPARED",
    PREPARED: null
  };

  // Forbidden financial keys — same vocabulary and normalisation as the
  // entity import gate (lowercase, strip - and _): a candidate is a
  // knowledge proposal and must never carry financial state.
  var FORBIDDEN_KEYS = [
    "price", "apy", "apypct", "annualpercentageyield",
    "apr", "annualpercentagerate", "tvl", "totallockedvalue",
    "balance", "balances", "holdings", "earnings", "earningsamount",
    "profit", "profits", "profitamount", "grossprofit", "netprofit",
    "return", "returns", "returnamount", "grossreturn", "netreturn",
    "expectedreturn", "roi", "yield", "yieldamount", "yieldpct",
    "income", "revenue", "fees", "fee", "marketvalue", "marketcap",
    "volume", "liquidity"
  ];
  function normaliseKey(k) {
    return String(k == null ? "" : k).toLowerCase().replace(/[-_]/g, "");
  }
  function forbiddenKeyErrors(obj, path, out) {
    if (!obj || typeof obj !== "object") return out;
    Object.keys(obj).forEach(function (k) {
      if (FORBIDDEN_KEYS.indexOf(normaliseKey(k)) !== -1) {
        out.push("Forbidden financial field on a candidate: " + (path ? path + "." : "") + k + ".");
      }
      var v = obj[k];
      if (v && typeof v === "object") forbiddenKeyErrors(v, (path ? path + "." : "") + k, out);
    });
    return out;
  }

  function db() { return global.CockpitDB || null; }
  function nowIso(now) {
    if (now) return now;
    return new Date().toISOString();
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function normText(s) {
    return String(s == null ? "" : s).toLowerCase().replace(/\s+/g, " ").trim();
  }
  function slugify(s) {
    return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function validActor(actor) {
    return !!actor && ACTOR_TYPES.indexOf(actor.type) !== -1 && typeof actor.ref === "string" && actor.ref.length > 0;
  }
  function actorLabel(actor) { return actor.type + ":" + actor.ref; }

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
  // Canonical entity records: the provenance rule shared with the import
  // gate — an entity-batch import in a canonical registry, never a
  // candidate, never taxonomy/meta.
  function isCanonicalEntity(rec) {
    if (!rec || isCandidate(rec)) return false;
    if (["chains", "assets", "protocols"].indexOf(rec.registry) === -1) return false;
    return typeof rec.importBatch === "string" && rec.importBatch.indexOf("entity-batch-") === 0;
  }

  function listCandidates(filter) {
    filter = filter || {};
    return readAll().then(function (records) {
      var out = records.filter(isCandidate);
      if (filter.stage) out = out.filter(function (c) { return c.pipelineStage === filter.stage; });
      if (filter.kind) out = out.filter(function (c) { return c.proposedKind === filter.kind; });
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
  function stageCounts() {
    return listCandidates().then(function (list) {
      var counts = { total: list.length };
      STAGES.concat(TERMINAL_STAGES).forEach(function (s) { counts[s] = 0; });
      list.forEach(function (c) { if (counts.hasOwnProperty(c.pipelineStage)) counts[c.pipelineStage] += 1; });
      return counts;
    });
  }
  function isStale(candidate, now) {
    if (!candidate || !candidate.discoveredAt) return false;
    if (TERMINAL_STAGES.indexOf(candidate.pipelineStage) !== -1) return false;
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
    if (!ev.ref || typeof ev.ref !== "string") errors.push("Evidence needs a ref (URL, id, or owner note).");
    if (!ev.capturedBy || typeof ev.capturedBy !== "string") errors.push("Evidence needs capturedBy.");
    if (ev.capturedAt && isNaN(Date.parse(ev.capturedAt))) errors.push("Evidence capturedAt must be a date.");
    return errors;
  }

  function validateDraft(draft) {
    var errors = [];
    if (!draft || typeof draft !== "object") return ["Candidate draft must be an object."];
    errors = errors.concat(forbiddenKeyErrors(draft, "", []));
    if (KINDS.indexOf(draft.proposedKind) === -1) errors.push("proposedKind must be one of " + KINDS.join(", ") + ".");
    if (!draft.proposedName || typeof draft.proposedName !== "string") errors.push("proposedName is required.");
    var ctype = draft.candidateType || "NEW_ENTITY";
    if (CANDIDATE_TYPES.indexOf(ctype) === -1) errors.push("candidateType must be NEW_ENTITY or UPDATE_PROPOSAL.");
    if (ctype === "UPDATE_PROPOSAL" && !draft.targetCanonicalId) {
      errors.push("An UPDATE_PROPOSAL candidate needs targetCanonicalId (rebrands/migrations propose against an existing canonical entity; they never silently overwrite it).");
    }
    // Truth lock: a candidate is born UNVERIFIED. Any other claimed
    // state — above all VERIFIED — is rejected outright; there is no
    // pipeline path that promotes truth.
    ["truthState", "verificationStatus"].forEach(function (k) {
      if (draft[k] !== undefined && draft[k] !== "UNVERIFIED") {
        errors.push("Candidates are always UNVERIFIED; " + k + " may not be set to " + draft[k] + ".");
      }
    });
    if (draft.aliases !== undefined && !Array.isArray(draft.aliases)) errors.push("aliases must be an array.");
    if (draft.networkRefs !== undefined && !Array.isArray(draft.networkRefs)) errors.push("networkRefs must be an array.");
    if (draft.contractAnchors !== undefined) {
      if (!Array.isArray(draft.contractAnchors)) errors.push("contractAnchors must be an array.");
      else draft.contractAnchors.forEach(function (a, i) {
        if (!a || typeof a !== "object" || !a.address || typeof a.address !== "string") {
          errors.push("contractAnchors[" + i + "] needs an address.");
        }
        if (!a || !a.networkRef || typeof a.networkRef !== "string") {
          errors.push("contractAnchors[" + i + "] needs a networkRef (anchors are network-qualified; an unqualified anchor is not identity evidence).");
        }
      });
    }
    if (draft.identitySignals !== undefined) {
      if (!Array.isArray(draft.identitySignals)) errors.push("identitySignals must be an array.");
      else draft.identitySignals.forEach(function (s, i) {
        if (!s || !s.type || !s.value || !s.source) errors.push("identitySignals[" + i + "] needs type, value, and source.");
      });
    }
    if (draft.evidence !== undefined) {
      if (!Array.isArray(draft.evidence)) errors.push("evidence must be an array.");
      else draft.evidence.forEach(function (ev, i) {
        validateEvidence(ev).forEach(function (e) { errors.push("evidence[" + i + "]: " + e); });
      });
    }
    return errors;
  }

  /* ---------------- creation ---------------- */

  function createCandidate(draft, actor, now) {
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor {type: OWNER|STAR|WORKER, ref} is required — stage work is always actor-recorded."] });
    var errors = validateDraft(draft);
    if (errors.length) return Promise.resolve({ ok: false, errors: errors });
    var at = nowIso(now);
    return readAll().then(function (records) {
      var datePart = at.slice(0, 10).replace(/-/g, "");
      var prefix = "candidate-" + (slugify(draft.proposedName) || "entity") + "-" + datePart + "-";
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
        candidateType: draft.candidateType || "NEW_ENTITY",
        targetCanonicalId: draft.targetCanonicalId || null,
        proposedKind: draft.proposedKind,
        proposedName: draft.proposedName,
        proposedId: draft.proposedId || null,
        formerName: draft.formerName || null,
        predecessorNote: draft.predecessorNote || null,
        aliases: clone(draft.aliases || []),
        ticker: draft.ticker || null,
        networkRefs: clone(draft.networkRefs || []),
        contractAnchors: clone(draft.contractAnchors || []),
        category: draft.category || null,
        identitySignals: clone(draft.identitySignals || []),
        evidence: clone(draft.evidence || []),
        discoveredBy: { type: actor.type, ref: actor.ref },
        discoveredAt: at,
        pipelineStage: "DISCOVERED",
        truthState: "UNVERIFIED",
        verificationStatus: "UNVERIFIED",
        dedupe: { verdict: "NOT_RUN", matchedCanonicalId: null, matchedCandidateId: null, signals: [], checkedAt: null, checkedBy: null },
        resolution: { canonicalId: null, confidence: null, notes: null, signals: [] },
        relationshipsDraft: [],
        preparedBatchRef: null,
        rejection: null,
        source: "candidate-discovery",
        lastReviewedAt: at.slice(0, 10),
        history: [{ from: null, to: "DISCOVERED", actor: actorLabel(actor), at: at, note: "Candidate created." }]
      };
      return persist(rec).then(function () { return { ok: true, record: rec }; });
    });
  }

  /* ---------------- stage machine ---------------- */

  // The ONLY way a candidate changes stage. Enforces: known stages,
  // linear order (no skipping), terminal-stage rules, stage entry
  // requirements, and append-only history with the actor recorded.
  // GATED / REGISTERED are refused here by construction (not in
  // STAGES / TERMINAL_STAGES): canonical promotion is P4's owner gate,
  // never a stage transition this module can perform.
  function transitionCandidate(id, toStage, actor, opts) {
    opts = opts || {};
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor is required for a stage transition."] });
    return getCandidate(id).then(function (rec) {
      if (!rec) return { ok: false, errors: ["Candidate not found: " + id + "."] };
      var from = rec.pipelineStage;
      if (TERMINAL_STAGES.indexOf(from) !== -1) {
        return { ok: false, errors: ["Candidate is in terminal stage " + from + "; terminal candidates never transition again."] };
      }
      if (toStage === "GATED" || toStage === "REGISTERED") {
        return { ok: false, errors: [toStage + " is not a P3 transition: canonical promotion happens only through the owner authority gate and the two-phase import gate (P4)."] };
      }
      if (toStage === "REJECTED") {
        if (!opts.reason) return { ok: false, errors: ["REJECTED requires a reason (retained as dedupe/audit memory)."] };
        rec.rejection = { reason: opts.reason, at: nowIso(opts.now), by: actorLabel(actor) };
      } else if (toStage === "DUPLICATE") {
        var mId = opts.matchedCanonicalId || opts.matchedCandidateId || rec.dedupe.matchedCanonicalId || rec.dedupe.matchedCandidateId;
        if (!mId) return { ok: false, errors: ["DUPLICATE requires a recorded match (matchedCanonicalId or matchedCandidateId) — an unmatched candidate cannot be declared a duplicate."] };
        if (opts.matchedCanonicalId) rec.dedupe.matchedCanonicalId = opts.matchedCanonicalId;
        if (opts.matchedCandidateId) rec.dedupe.matchedCandidateId = opts.matchedCandidateId;
        if (rec.dedupe.verdict === "NOT_RUN") rec.dedupe.verdict = "DUPLICATE";
      } else {
        if (NEXT_STAGE[from] !== toStage) {
          return { ok: false, errors: ["Illegal stage transition " + from + " -> " + toStage + ": stages advance one step at a time (next legal stage is " + (NEXT_STAGE[from] || "none") + "), or to REJECTED / DUPLICATE."] };
        }
        // Stage entry requirements (fail-closed, same spirit as the
        // import gate: a stage name is never claimed without its work).
        if (toStage === "IDENTIFIED" && (!rec.identitySignals || rec.identitySignals.length < 1)) {
          return { ok: false, errors: ["IDENTIFIED requires at least one identity signal (attach signals first)."] };
        }
        if (toStage === "DEDUPED" && rec.dedupe.verdict === "NOT_RUN") {
          return { ok: false, errors: ["DEDUPED requires a recorded dedupe run (runDedupe first)."] };
        }
        if (toStage === "DEDUPED" && (rec.dedupe.verdict === "DUPLICATE" || rec.dedupe.verdict === "VARIANT_OF")) {
          return { ok: false, errors: ["Dedupe verdict is " + rec.dedupe.verdict + " against " + (rec.dedupe.matchedCanonicalId || rec.dedupe.matchedCandidateId) + "; the candidate cannot advance as a distinct entity."] };
        }
        if (toStage === "CLASSIFIED" && rec.proposedKind === "PROTOCOL" && !rec.category) {
          return { ok: false, errors: ["CLASSIFIED requires a category for a protocol candidate."] };
        }
        if (toStage === "CLASSIFIED" && rec.proposedKind === "ASSET" && (!rec.networkRefs || rec.networkRefs.length < 1)) {
          return { ok: false, errors: ["CLASSIFIED requires at least one networkRef for an asset candidate (asset identity is network-qualified)."] };
        }
        if (toStage === "RESOLVED" && !rec.resolution.canonicalId) {
          return { ok: false, errors: ["RESOLVED requires a proposed canonical id (resolveIdentity first — propose mode only)."] };
        }
        if (toStage === "PREPARED" && (!rec.evidence || rec.evidence.length < 1)) {
          return { ok: false, errors: ["PREPARED requires at least one evidence entry with provenance (addEvidence first). Absence of evidence caps a candidate below PREPARED."] };
        }
      }
      rec.pipelineStage = toStage;
      rec.lastReviewedAt = nowIso(opts.now).slice(0, 10);
      rec.history = (rec.history || []).concat([{
        from: from, to: toStage, actor: actorLabel(actor), at: nowIso(opts.now),
        note: opts.note || (toStage === "REJECTED" ? "Rejected: " + opts.reason : "Stage advanced.")
      }]);
      return persist(rec).then(function () { return { ok: true, record: rec }; });
    });
  }

  /* ---------------- evidence (append-only) ---------------- */

  // Corrections and additions APPEND evidence; historical provenance is
  // never rewritten in place.
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
      if (!ev.capturedAt) ev.capturedAt = nowIso(now);
      rec.evidence = (rec.evidence || []).concat([ev]);
      rec.history = (rec.history || []).concat([{
        from: rec.pipelineStage, to: rec.pipelineStage, actor: actorLabel(actor), at: nowIso(now),
        note: "Evidence attached (" + ev.kind + ": " + ev.ref + ")."
      }]);
      return persist(rec).then(function () { return { ok: true, record: rec }; });
    });
  }

  function addIdentitySignals(id, signals, actor, now) {
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor is required."] });
    if (!Array.isArray(signals) || !signals.length) return Promise.resolve({ ok: false, errors: ["At least one identity signal is required."] });
    var errors = [];
    signals.forEach(function (s, i) {
      if (!s || !s.type || !s.value || !s.source) errors.push("signals[" + i + "] needs type, value, and source.");
    });
    if (errors.length) return Promise.resolve({ ok: false, errors: errors });
    return getCandidate(id).then(function (rec) {
      if (!rec) return { ok: false, errors: ["Candidate not found: " + id + "."] };
      if (TERMINAL_STAGES.indexOf(rec.pipelineStage) !== -1) return { ok: false, errors: ["Candidate is terminal (" + rec.pipelineStage + ")."] };
      rec.identitySignals = (rec.identitySignals || []).concat(clone(signals));
      rec.history = (rec.history || []).concat([{
        from: rec.pipelineStage, to: rec.pipelineStage, actor: actorLabel(actor), at: nowIso(now),
        note: "Identity signals attached (" + signals.length + ")."
      }]);
      return persist(rec).then(function () { return { ok: true, record: rec }; });
    });
  }

  /* ---------------- dedupe engine ---------------- */

  // Canonical identity index: store entity records + the loaded batch
  // module records (module records carry formerName / anchors that the
  // store projection may not repeat). Candidates are NEVER in this
  // index — a candidate can never be deduped "into" another candidate's
  // canonical identity, and canonical resolution never reads candidates.
  function canonicalIdentityIndex(records) {
    var idx = { byId: {}, names: {}, anchors: {}, assets: [] };
    function addEntity(id, names, formerName, anchors, ticker, networkRef, kind) {
      if (!id) return;
      idx.byId[id] = true;
      names = (names || []).concat(formerName ? [formerName] : []);
      names.forEach(function (n) {
        var k = normText(n);
        if (k && !idx.names[k]) idx.names[k] = id;
      });
      (anchors || []).forEach(function (a) {
        var addr = typeof a === "string" ? a : a && a.address;
        if (addr) idx.anchors[String(addr).toLowerCase()] = id;
      });
      if (kind === "ASSET") idx.assets.push({ id: id, ticker: ticker || null, networkRef: networkRef || null });
    }
    (records || []).filter(isCanonicalEntity).forEach(function (r) {
      var anchors = [];
      if (r.contractAddress) anchors.push(r.contractAddress);
      if (r.mintAddress) anchors.push(r.mintAddress);
      var kind = r.registry === "assets" ? "ASSET" : (r.registry === "protocols" ? "PROTOCOL" : "NETWORK");
      addEntity(r.id, [r.title, r.name].concat(r.aliases || []), r.formerName, anchors, r.symbol, r.networkRef, kind);
    });
    [["EncyclopediaEntityBatch1"], ["EncyclopediaEntityBatch2"]].forEach(function (g) {
      var batch = global[g[0]];
      if (!batch) return;
      (batch.networks || []).forEach(function (n) { addEntity(n.id || n.networkId, [n.name, n.canonicalName].concat(n.aliases || []), n.formerName, [], null, null, "NETWORK"); });
      (batch.assets || []).forEach(function (a) {
        var anchors = [];
        if (a.contractAddress) anchors.push(a.contractAddress);
        if (a.mintAddress) anchors.push(a.mintAddress);
        addEntity(a.assetId, [a.name, a.canonicalName].concat(a.aliases || []), a.formerName, anchors, a.symbol, a.networkId, "ASSET");
      });
      (batch.protocols || []).forEach(function (p) { addEntity(p.protocolId, [p.name, p.canonicalName].concat(p.aliases || []), p.formerName, [], null, null, "PROTOCOL"); });
    });
    return idx;
  }

  // Deterministic dedupe, design order (a)-(f). NEVER ticker alone,
  // NEVER name alone against a ticker: name evidence means full
  // name/alias/former-name equality, anchor evidence means the exact
  // network-qualified anchor, asset identity means ticker+network.
  function evaluateDedupe(candidate, records, candidates) {
    var idx = canonicalIdentityIndex(records);
    var signals = [];
    var verdict = "CLEAR", matchedCanonicalId = null, matchedCandidateId = null;
    function hit(v, id, signal) {
      // An UPDATE_PROPOSAL is expected to match its own target — that
      // match confirms the proposal's subject; it is not a duplicate.
      // Matches against any OTHER canonical entity still flag.
      if (candidate.candidateType === "UPDATE_PROPOSAL" && id && id === candidate.targetCanonicalId) {
        signals.push("update target confirmed: " + id);
        return;
      }
      if (verdict === "CLEAR" || verdict === "COLLISION_NOTED") { verdict = v; }
      if (v === "DUPLICATE" || v === "VARIANT_OF") {
        if (!matchedCanonicalId) matchedCanonicalId = id;
      }
      signals.push(signal);
    }
    // (a) exact canonical-id match (proposed id or update target)
    var proposedIds = [candidate.proposedId, candidate.targetCanonicalId].filter(Boolean);
    proposedIds.forEach(function (pid) {
      if (idx.byId[pid]) hit("DUPLICATE", pid, "canonical-id match: " + pid);
    });
    // (d) contract/mint anchor match — same anchor = same asset, any name
    (candidate.contractAnchors || []).forEach(function (a) {
      var owner = idx.anchors[String(a.address).toLowerCase()];
      if (owner) hit("DUPLICATE", owner, "contract/mint anchor match: " + a.address + " (" + a.networkRef + ")");
    });
    // (b)+(f) name / alias / former-name match (normalized, full-string)
    var myNames = [candidate.proposedName, candidate.formerName].concat(candidate.aliases || []).map(normText).filter(Boolean);
    myNames.forEach(function (n) {
      if (idx.names[n]) hit("DUPLICATE", idx.names[n], "name/alias/former-name match: \"" + n + "\"");
    });
    // (c) ticker + network pair (assets). Ticker alone NEVER dedupes:
    // a shared ticker on disjoint networks is a noted collision between
    // DISTINCT identities (network-qualified identity rule).
    if (candidate.proposedKind === "ASSET" && candidate.ticker) {
      var myTicker = normText(candidate.ticker);
      var myNets = candidate.networkRefs || [];
      idx.assets.forEach(function (a) {
        if (!a.ticker || normText(a.ticker) !== myTicker) return;
        if (a.networkRef && myNets.indexOf(a.networkRef) !== -1) {
          hit("DUPLICATE", a.id, "ticker+network match: " + candidate.ticker + " on " + a.networkRef);
        } else {
          signals.push("ticker collision on a different network (distinct identity): " + candidate.ticker + " vs " + a.id);
          if (verdict === "CLEAR") verdict = "COLLISION_NOTED";
        }
      });
      // (e) wrapped / bridged variant detection: a wrapped or bridged
      // representation of an underlying canonical asset resolves TO
      // that asset with a variant relationship — never a second
      // canonical asset, and never silently merged either: the
      // candidate is retained, marked VARIANT_OF, fully provenanced.
      var looksWrapped = /wrapped|bridged/.test(normText(candidate.proposedName)) ||
        (candidate.ticker && /^w(btc|eth|sol|bnb|avax|usdc|usdt|dai)$/.test(normText(candidate.ticker).replace(/\s+/g, "")));
      if (looksWrapped && verdict !== "DUPLICATE") {
        var underlyingTicker = normText(candidate.ticker || "").replace(/^w/, "");
        idx.assets.forEach(function (a) {
          if (a.ticker && normText(a.ticker) === underlyingTicker && a.networkRef && myNets.indexOf(a.networkRef) === -1) {
            hit("VARIANT_OF", a.id, "wrapped/bridged variant of " + a.id + " (underlying " + a.ticker + " on " + a.networkRef + ")");
          }
        });
      }
    }
    // Candidate pool (dedupe memory): same name/anchor/id evidence
    // against other candidates in ANY stage, including REJECTED and
    // DUPLICATE — a rejected candidate must not be re-proposed forever.
    (candidates || []).forEach(function (other) {
      if (!other || other.id === candidate.id) return;
      var otherNames = [other.proposedName, other.formerName].concat(other.aliases || []).map(normText).filter(Boolean);
      var nameHit = myNames.some(function (n) { return otherNames.indexOf(n) !== -1; });
      var anchorHit = (candidate.contractAnchors || []).some(function (a) {
        return (other.contractAnchors || []).some(function (b) { return String(b.address).toLowerCase() === String(a.address).toLowerCase(); });
      });
      var idHit = other.proposedId && proposedIds.indexOf(other.proposedId) !== -1;
      if (nameHit || anchorHit || idHit) {
        if (!matchedCandidateId) matchedCandidateId = other.id;
        if (verdict === "CLEAR" || verdict === "COLLISION_NOTED") verdict = "DUPLICATE";
        signals.push("candidate-pool match: " + other.id + " (" + (anchorHit ? "anchor" : idHit ? "proposed id" : "name/alias") + ", stage " + other.pipelineStage + ")");
      }
    });
    return { verdict: verdict, matchedCanonicalId: matchedCanonicalId, matchedCandidateId: matchedCandidateId, signals: signals };
  }

  function runDedupe(id, actor, now) {
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor is required to run dedupe."] });
    return Promise.all([readAll(), getCandidate(id)]).then(function (pair) {
      var records = pair[0], rec = pair[1];
      if (!rec) return { ok: false, errors: ["Candidate not found: " + id + "."] };
      if (TERMINAL_STAGES.indexOf(rec.pipelineStage) !== -1) return { ok: false, errors: ["Candidate is terminal (" + rec.pipelineStage + "); dedupe is closed."] };
      if (rec.pipelineStage !== "IDENTIFIED" && rec.dedupe.verdict !== "NOT_RUN") {
        return { ok: false, errors: ["Dedupe runs at the IDENTIFIED stage (current stage: " + rec.pipelineStage + "). Re-running a completed dedupe is not supported; corrections append evidence instead."] };
      }
      var pool = records.filter(isCandidate);
      var result = evaluateDedupe(rec, records, pool);
      rec.dedupe = {
        verdict: result.verdict, matchedCanonicalId: result.matchedCanonicalId,
        matchedCandidateId: result.matchedCandidateId, signals: result.signals,
        checkedAt: nowIso(now), checkedBy: actorLabel(actor)
      };
      return persist(rec).then(function () {
        if (result.verdict === "DUPLICATE" || result.verdict === "VARIANT_OF") {
          // Terminal: retained as dedupe memory, never canonical.
          return transitionCandidate(id, "DUPLICATE", actor, {
            now: now,
            matchedCanonicalId: result.matchedCanonicalId,
            matchedCandidateId: result.matchedCandidateId,
            note: "Dedupe verdict " + result.verdict + ": " + result.signals.join("; ")
          });
        }
        if (rec.pipelineStage === "IDENTIFIED") {
          return transitionCandidate(id, "DEDUPED", actor, { now: now, note: "Dedupe verdict " + result.verdict + "." });
        }
        return { ok: true, record: rec };
      });
    });
  }

  /* ---------------- identity resolution (PROPOSE ONLY) ---------------- */

  // Proposes a canonical id + confidence from identity evidence. This
  // function writes ONLY to the candidate record. It has no canonical
  // write path: registration exists solely behind the P4 authority gate
  // and the two-phase import gate.
  function proposeCanonicalId(candidate) {
    var slug = slugify(candidate.proposedName);
    if (candidate.proposedKind === "NETWORK") return slug || null;
    if (candidate.proposedKind === "PROTOCOL") return slug ? "protocol-" + slug.replace(/-protocol$/, "") : null;
    if (candidate.proposedKind === "ASSET") {
      var net = (candidate.networkRefs || [])[0];
      var tick = slugify(candidate.ticker || "");
      if (!net || !tick) return null;
      var netSlug = net.replace(/-mainnet$/, "").replace(/-chain$/, "");
      return tick + "-" + netSlug;
    }
    return null;
  }
  function independentSignalCount(rec) {
    var types = {};
    (rec.identitySignals || []).forEach(function (s) { types["signal:" + s.type] = true; });
    if ((rec.contractAnchors || []).length) types["anchor"] = true;
    (rec.evidence || []).forEach(function (ev) {
      if (ev.kind === "OFFICIAL_DOC" || ev.kind === "ONCHAIN_ANCHOR") types["evidence:" + ev.kind] = true;
    });
    return Object.keys(types).length;
  }
  function resolveIdentity(id, actor, opts) {
    opts = opts || {};
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor is required to resolve identity."] });
    return Promise.all([readAll(), getCandidate(id)]).then(function (pair) {
      var records = pair[0], rec = pair[1];
      if (!rec) return { ok: false, errors: ["Candidate not found: " + id + "."] };
      if (rec.pipelineStage !== "CLASSIFIED") {
        return { ok: false, errors: ["Identity resolution runs at the CLASSIFIED stage (current stage: " + rec.pipelineStage + ")."] };
      }
      var proposed = opts.proposedId || rec.proposedId || proposeCanonicalId(rec);
      if (!proposed) {
        return { ok: false, errors: ["Cannot derive a proposed canonical id (an asset candidate needs a ticker and a networkRef). Supply proposedId explicitly or complete classification first."] };
      }
      // Fail-closed: a proposed id that already exists canonically is a
      // dedupe conflict, not a resolution.
      var idx = canonicalIdentityIndex(records);
      if (idx.byId[proposed] && rec.candidateType !== "UPDATE_PROPOSAL") {
        return { ok: false, errors: ["Proposed canonical id " + proposed + " already exists canonically — this is a duplicate/update case, not a new-entity resolution."] };
      }
      if (rec.candidateType === "UPDATE_PROPOSAL" && proposed !== rec.targetCanonicalId) {
        return { ok: false, errors: ["An UPDATE_PROPOSAL resolves against its targetCanonicalId (" + rec.targetCanonicalId + "), not a new id."] };
      }
      var count = independentSignalCount(rec);
      rec.proposedId = proposed;
      rec.resolution = {
        canonicalId: proposed,
        confidence: count >= 2 ? "STRONG" : "PROPOSED",
        notes: opts.notes || (count >= 2
          ? "Proposed from " + count + " independent identity signals (propose mode only — not registered, not verified)."
          : "Proposed from a single identity signal; confidence capped at PROPOSED until a second independent signal is attached."),
        signals: (rec.identitySignals || []).map(function (s) { return s.type + ": " + s.value; })
          .concat((rec.contractAnchors || []).map(function (a) { return "anchor: " + a.address + " (" + a.networkRef + ")"; }))
      };
      return persist(rec).then(function () {
        return transitionCandidate(id, "RESOLVED", actor, { now: opts.now, note: "Identity proposed: " + proposed + " (" + rec.resolution.confidence + "). Propose mode only." });
      });
    });
  }

  /* ---------------- relationship mapping (drafts only) ---------------- */

  // Draft edges point ONLY at existing canonical ids or canonical-60
  // majors. A draft can never reference another candidate or an unknown
  // id (a candidate reference can never satisfy a canonical — or even
  // draft — relationship), and drafts are not live edges: the World
  // Engine never sees them.
  function mapRelationships(id, drafts, actor, now) {
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor is required to map relationships."] });
    if (!Array.isArray(drafts)) return Promise.resolve({ ok: false, errors: ["relationshipsDraft must be an array."] });
    return Promise.all([readAll(), getCandidate(id)]).then(function (pair) {
      var records = pair[0], rec = pair[1];
      if (!rec) return { ok: false, errors: ["Candidate not found: " + id + "."] };
      if (rec.pipelineStage !== "RESOLVED") {
        return { ok: false, errors: ["Relationship mapping runs at the RESOLVED stage (current stage: " + rec.pipelineStage + ")."] };
      }
      var canonicalIds = {};
      records.filter(isCanonicalEntity).forEach(function (r) { canonicalIds[r.id] = true; });
      records.forEach(function (r) {
        if (r && r.level === "MAJOR_ACTIVITY") canonicalIds[r.id] = true;
      });
      var errors = [];
      drafts.forEach(function (d, i) {
        if (!d || !d.type || !d.targetId) { errors.push("drafts[" + i + "] needs type and targetId."); return; }
        if (String(d.targetId).indexOf("candidate-") === 0) {
          errors.push("drafts[" + i + "] targets a candidate (" + d.targetId + "): candidates can never satisfy relationship references.");
        } else if (!canonicalIds[d.targetId]) {
          errors.push("drafts[" + i + "] targets unknown id " + d.targetId + ": draft relationships must reference existing canonical entities or canonical-60 majors.");
        }
      });
      if (errors.length) return { ok: false, errors: errors };
      rec.relationshipsDraft = clone(drafts);
      return persist(rec).then(function () {
        return transitionCandidate(id, "MAPPED", actor, { now: now, note: "Relationship drafts mapped (" + drafts.length + ", draft only — not live edges)." });
      });
    });
  }

  /* ---------------- representability ---------------- */

  // Pure conversion (no persistence): proves a canonical entity — store
  // record plus its batch module record — is representable as a
  // candidate draft without semantic loss (formerName, predecessorNote,
  // aliases, anchors, network qualification, category all carried).
  function candidateFromCanonical(storeRec, moduleRec) {
    if (!storeRec) return null;
    var kind = storeRec.registry === "chains" ? "NETWORK" : storeRec.registry === "assets" ? "ASSET" : "PROTOCOL";
    var m = moduleRec || {};
    var anchors = [];
    var addr = m.contractAddress || storeRec.contractAddress;
    var mint = m.mintAddress || storeRec.mintAddress;
    if (addr) anchors.push({ networkRef: m.networkId || storeRec.networkRef || null, address: addr, kind: "contract" });
    if (mint) anchors.push({ networkRef: m.networkId || storeRec.networkRef || null, address: mint, kind: "mint" });
    return {
      candidateType: "NEW_ENTITY",
      proposedKind: kind,
      proposedName: m.canonicalName || m.name || storeRec.title,
      proposedId: storeRec.id,
      formerName: m.formerName || storeRec.formerName || null,
      predecessorNote: m.predecessorNote || storeRec.predecessorNote || null,
      aliases: clone(m.aliases || storeRec.aliases || []),
      ticker: m.symbol || storeRec.symbol || null,
      networkRefs: m.networkId ? [m.networkId] : (m.networks ? clone(m.networks) : (storeRec.networkRef ? [storeRec.networkRef] : [])),
      contractAnchors: anchors,
      category: m.category || storeRec.category || null,
      assetClass: m.assetClass || null,
      chainId: (m.chainId !== undefined ? m.chainId : null),
      familyId: m.familyId || null,
      activityRefs: clone(m.activities || []),
      identitySignals: [],
      evidence: []
    };
  }

  /* ---------------- owner purge of the terminal pool ---------------- */

  // The ONLY deletion in this module, and it can only ever touch
  // terminal candidate records — never canonical records, never live
  // candidates. Owner-only, explicit, per design §15.
  function purgeTerminalCandidates(actor) {
    if (!validActor(actor) || actor.type !== "OWNER") {
      return Promise.resolve({ ok: false, errors: ["Only the owner can purge the terminal candidate pool."] });
    }
    var d = db();
    if (!d || typeof d.delete !== "function") return Promise.resolve({ ok: false, errors: ["CockpitDB.delete unavailable."] });
    return listCandidates().then(function (list) {
      var terminal = list.filter(function (c) { return TERMINAL_STAGES.indexOf(c.pipelineStage) !== -1; });
      var chain = Promise.resolve(0);
      terminal.forEach(function (c) {
        chain = chain.then(function (n) {
          return d.delete(STORE, c.id).then(function () { return n + 1; });
        });
      });
      return chain.then(function (n) { return { ok: true, purged: n }; });
    });
  }

  global.EntityCandidates = {
    VERSION: "P3.1",
    RECORD_KIND: RECORD_KIND,
    REGISTRY: REGISTRY,
    STAGES: STAGES.slice(),
    TERMINAL_STAGES: TERMINAL_STAGES.slice(),
    EVIDENCE_KINDS: EVIDENCE_KINDS.slice(),
    STALE_DAYS: STALE_DAYS,
    isCandidate: isCandidate,
    isCanonicalEntity: isCanonicalEntity,
    validateDraft: validateDraft,
    validateEvidence: validateEvidence,
    createCandidate: createCandidate,
    listCandidates: listCandidates,
    getCandidate: getCandidate,
    stageCounts: stageCounts,
    isStale: isStale,
    transitionCandidate: transitionCandidate,
    addEvidence: addEvidence,
    addIdentitySignals: addIdentitySignals,
    evaluateDedupe: evaluateDedupe,
    runDedupe: runDedupe,
    resolveIdentity: resolveIdentity,
    mapRelationships: mapRelationships,
    candidateFromCanonical: candidateFromCanonical,
    purgeTerminalCandidates: purgeTerminalCandidates
  };
})(window);
