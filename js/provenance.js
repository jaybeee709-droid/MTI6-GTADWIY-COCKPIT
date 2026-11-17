/* MTI6-GTADWIY-COCKPIT — Record-level provenance (contract §5)
 *
 * Record-level provenance — one pure module (§66 step 8, Ruling 3).
 * Implements the §5.2 provenance block, the §5.3 default projection,
 * and the writer-side constructors the governed writers call at
 * write time. Field-level provenance is explicitly out of scope
 * (Ruling 3: deferred to a later extension); this model is shaped
 * so field-level can attach later as an optional `fields` map on the
 * same block, without replacing the record model.
 *
 * Contract sources: papers/files/world-engine-contract-proposal.md
 * §5 (§5.2 block, §5.3 no-invention defaults, §5.4 rules) and
 * papers/files/world-engine-contract-rulings-and-order.md Ruling 3.
 *
 * NEVER BACKFILL (Ruling 3.3, §5.3): adopting this module changes
 * zero stored records. A record without a `provenance` block projects
 * the honest §5.3 defaults — origin UNKNOWN, acquiredAt /
 * retrievedAt / observedAt null (UNKNOWN), evidence [] ("no evidence
 * recorded"), transformationHistory []. No acquisition time is ever
 * invented: not "today", not the audit date, not a batch file's
 * guess. A record's `lastReviewedAt` (a review date) is never
 * promoted into an acquisition / retrieval / observation time.
 *
 * PROVENANCE EXPLAINS; IT NEVER PROMOTES (Ruling 3.6, §5.4 rule 1):
 * a rich provenance block does not make a record VERIFIED and grants
 * no authority of any kind. The projection carries the record's
 * stored verification value separately; nothing here touches it.
 *
 * SOURCE TYPE DERIVATION (§5.3): sourceType is derived ONLY where
 * the record's own fields determine it. The derivation table is
 * total over the source values the store actually carries (measured
 * at v103: "canonical-import" 826, "owner-seed" 48, absent 4):
 *   "owner-seed"       -> OWNER_SEED
 *   "canonical-import" -> SYSTEM_IMPORT (MTI6's own canonical
 *                           import process is the system import)
 *   anything else      -> UNKNOWN (never guessed — "catalog-import"
 *                           and any future source stay UNKNOWN until
 *                           a recorded fact determines them)
 * `importBatch` is corroboration, not the determinant: the §5.3
 * example ("entity-batch-1" + "owner-seed" => OWNER_SEED) is
 * determined by the source value. A promoted record's sourceType is
 * CANDIDATE_PROMOTION, set only by the promotion writer, never
 * derived from the source value.
 *
 * CANDIDATE EXCLUSION (§0.3): the projection is a canonical-record
 * projection. Records with recordKind ENTITY_CANDIDATE,
 * FROZEN_ENTITY_BATCH, RESOURCE_CANDIDATE or RESOURCE_GAP project
 * as excluded — candidates never carry this block into the graph,
 * and their provenance stays on the candidate pipeline's own fields
 * (evidence[], identitySignals[], discoveredBy/discoveredAt,
 * history[]).
 *
 * EVIDENCE RULES: the candidate pipeline's evidence-item validation
 * (js/entity-candidates.js validateEvidence) is the contract's
 * evidence rule (Ruling 3.1); this module implements the same rules
 * and the harness cross-checks both validators on the same battery.
 *
 * APPEND-ONLY HISTORY (§5.4 rule 2): transformationHistory entries
 * are appended, never rewritten. Corrections add entries; they never
 * rewrite earlier entries. appendTransformation returns a NEW record
 * object; it never mutates its input or any earlier entry.
 *
 * WRITER CONTRACT (Ruling 3.4): the requirement lands on the
 * writers, not on existing data. js/encyclopedia-import.js stamps
 * a block at write time (plain imports via writeRecord, gate
 * promotions in importEntityBatch, corrections in
 * applyCorrections) — only for records that do not already carry
 * one, and only from facts the writer knows at write time. A block
 * already present is left entirely alone. This module is therefore
 * LOADED by the app shell (index.html + sw.js APP_SHELL) — unlike
 * the truth projection (v101) and the integrity engine (v103),
 * which no runtime surface adopts: the import gate and the entity
 * gate ARE the runtime adoption here. If the module is not loaded,
 * the writers degrade to writing without a block (never failing a
 * write for want of provenance).
 *
 * Pure functions only: no DOM, no network, no secrets, no storage.
 * Same discipline as js/truth.js and js/integrity-engine.js.
 */
(function (global) {
  "use strict";

  var CONTRACT_VERSION = "WE-CONTRACT-1";

  // §5.2 sourceType vocabulary (closed).
  var SOURCE_TYPES = ["OWNER_SEED", "OWNER_RECORDED", "OFFICIAL_DOCS",
    "REGISTRY", "PROVIDER", "CANDIDATE_PROMOTION", "SYSTEM_IMPORT",
    "UNKNOWN"];

  // Evidence-item kinds — mirrors EntityCandidates.EVIDENCE_KINDS
  // (js/entity-candidates.js); the candidate rules are the contract's
  // evidence rules (Ruling 3.1).
  var EVIDENCE_KINDS = ["OWNER_STATEMENT", "OFFICIAL_DOC",
    "REGISTRY", "ONCHAIN_ANCHOR", "SECONDARY"];

  // Record kinds excluded from every canonical view (the single
  // filter in CryptoWorld.getAllRecords): the projection does not
  // apply to them.
  var EXCLUDED_RECORD_KINDS = ["ENTITY_CANDIDATE",
    "FROZEN_ENTITY_BATCH", "RESOURCE_CANDIDATE", "RESOURCE_GAP"];

  var SYSTEM_IMPORT_ACTOR = "SYSTEM:encyclopedia-import";

  function clone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }

  function isNonEmptyString(v) {
    return typeof v === "string" && v.length > 0;
  }

  // An ISO-8601 timestamp with a time component (the shape
  // new Date().toISOString() produces). Date-only strings are not
  // acquisition/retrieval/observation times under this contract.
  function isIso(value) {
    if (typeof value !== "string") return false;
    if (value.indexOf("T") === -1) return false;
    return !isNaN(Date.parse(value));
  }

  function isPlainObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  // ---- Evidence items (candidate rules, reused) -------------------
  //
  // Mirrors EntityCandidates.validateEvidence exactly: kind in the
  // closed list, a ref (URL, id, or owner note), a capturedBy, and a
  // parseable capturedAt when present.
  function validateEvidenceItem(ev) {
    var errors = [];
    if (!isPlainObject(ev)) return ["Evidence must be an object."];
    if (EVIDENCE_KINDS.indexOf(ev.kind) === -1) {
      errors.push("Evidence kind must be one of " +
        EVIDENCE_KINDS.join(", ") + ".");
    }
    if (!isNonEmptyString(ev.ref)) {
      errors.push("Evidence needs a ref (URL, id, or owner note).");
    }
    if (!isNonEmptyString(ev.capturedBy)) {
      errors.push("Evidence needs capturedBy.");
    }
    if (ev.capturedAt && isNaN(Date.parse(ev.capturedAt))) {
      errors.push("Evidence capturedAt must be a date.");
    }
    return errors;
  }

  // ---- transformationHistory entries -------------------------------
  //
  // Append-only { at, actor, action, note } entries for governed
  // transformations of the record (import, promotion, correction).
  // Same spirit as candidate history[].
  function validateHistoryEntry(e) {
    var errors = [];
    if (!isPlainObject(e)) return ["History entry must be an object."];
    if (!isIso(e.at)) {
      errors.push("History entry needs an ISO-8601 `at` timestamp.");
    }
    if (!isNonEmptyString(e.actor)) {
      errors.push("History entry needs an actor.");
    }
    if (!isNonEmptyString(e.action)) {
      errors.push("History entry needs an action.");
    }
    if (e.note !== undefined && e.note !== null &&
        typeof e.note !== "string") {
      errors.push("History entry note must be a string.");
    }
    return errors;
  }

  // ---- The §5.2 block ----------------------------------------------
  //
  // Every field is optional; absence is always representable and
  // never blocks a read. Unknown extra keys are tolerated, not
  // rejected: field-level provenance (Ruling 3.5) will attach as an
  // optional `fields` map on this same block in its own extension.
  function validateBlock(block) {
    var errors = [];
    if (!isPlainObject(block)) return ["Provenance block must be an object."];
    if (block.source !== undefined && block.source !== null &&
        !isNonEmptyString(block.source)) {
      errors.push("Provenance source must be a non-empty string.");
    }
    if (block.origin !== undefined && block.origin !== null &&
        !isNonEmptyString(block.origin)) {
      errors.push("Provenance origin must be a non-empty string.");
    }
    if (block.sourceType !== undefined && block.sourceType !== null &&
        SOURCE_TYPES.indexOf(block.sourceType) === -1) {
      errors.push("Provenance sourceType must be one of " +
        SOURCE_TYPES.join(", ") + ".");
    }
    ["acquiredAt", "retrievedAt", "observedAt"].forEach(function (k) {
      if (block[k] !== undefined && block[k] !== null && !isIso(block[k])) {
        errors.push("Provenance " + k + " must be an ISO-8601 timestamp or null.");
      }
    });
    if (block.evidence !== undefined && block.evidence !== null) {
      if (!Array.isArray(block.evidence)) {
        errors.push("Provenance evidence must be an array.");
      } else {
        block.evidence.forEach(function (ev, i) {
          validateEvidenceItem(ev).forEach(function (e) {
            errors.push("evidence[" + i + "]: " + e);
          });
        });
      }
    }
    if (block.transformationHistory !== undefined &&
        block.transformationHistory !== null) {
      if (!Array.isArray(block.transformationHistory)) {
        errors.push("Provenance transformationHistory must be an array.");
      } else {
        block.transformationHistory.forEach(function (e, i) {
          validateHistoryEntry(e).forEach(function (err) {
            errors.push("transformationHistory[" + i + "]: " + err);
          });
        });
      }
    }
    if (block.canonicalState !== undefined && block.canonicalState !== null &&
        block.canonicalState !== "CANONICAL") {
      errors.push("Provenance canonicalState must be \"CANONICAL\".");
    }
    return errors;
  }

  // ---- Source-type derivation (§5.3) --------------------------------
  //
  // Derived ONLY where the record's own fields determine it. The
  // source value is the determinant; importBatch is corroboration.
  function deriveSourceType(record) {
    if (!isPlainObject(record)) return "UNKNOWN";
    if (record.source === "owner-seed") return "OWNER_SEED";
    if (record.source === "canonical-import") return "SYSTEM_IMPORT";
    return "UNKNOWN";
  }

  // ---- Block construction -------------------------------------------
  //
  // buildBlock assembles a §5.2 block from explicit inputs only. It
  // invents nothing: origin defaults to UNKNOWN (never assumed equal
  // to source), timestamps default to null (never "today"), evidence
  // and history default to empty. A caller that knows a value passes
  // it; a caller that does not leaves it absent.
  function buildBlock(input) {
    input = isPlainObject(input) ? input : {};
    var block = {
      source: isNonEmptyString(input.source) ? input.source : "UNKNOWN",
      origin: isNonEmptyString(input.origin) ? input.origin : "UNKNOWN",
      sourceType: input.sourceType !== undefined && input.sourceType !== null
        ? input.sourceType : deriveSourceType({ source: input.source }),
      acquiredAt: input.acquiredAt !== undefined ? input.acquiredAt : null,
      retrievedAt: input.retrievedAt !== undefined ? input.retrievedAt : null,
      observedAt: input.observedAt !== undefined ? input.observedAt : null,
      evidence: Array.isArray(input.evidence) ? clone(input.evidence) : [],
      transformationHistory: Array.isArray(input.transformationHistory)
        ? clone(input.transformationHistory) : [],
      canonicalState: "CANONICAL"
    };
    var errors = validateBlock(block);
    if (errors.length) return { ok: false, block: null, errors: errors };
    return { ok: true, block: block, errors: [] };
  }

  // Plain governed import (js/encyclopedia-import.js writeRecord):
  // the block is built ONLY from facts the writer knows at write
  // time — the record's own source, its batch, and the write time
  // (which IS the acquisition time for a record written now).
  function buildBlockForImport(record, ctx) {
    ctx = isPlainObject(ctx) ? ctx : {};
    if (!isPlainObject(record)) {
      return { ok: false, block: null,
        errors: ["buildBlockForImport needs a record object."] };
    }
    var now = ctx.now !== undefined ? ctx.now : new Date().toISOString();
    if (!isIso(now)) {
      return { ok: false, block: null,
        errors: ["buildBlockForImport needs an ISO-8601 `now` (the write time)."] };
    }
    var actor = isNonEmptyString(ctx.actor) ? ctx.actor : SYSTEM_IMPORT_ACTOR;
    return buildBlock({
      source: record.source,
      sourceType: deriveSourceType(record),
      acquiredAt: now,
      transformationHistory: [{
        at: now,
        actor: actor,
        action: "import",
        note: "Imported via batch " + (record.importBatch || "unknown") + "."
      }]
    });
  }

  // Gate promotion (js/encyclopedia-import.js importEntityBatch, for
  // batches carrying validated owner freeze provenance): the record's
  // sourceType is CANDIDATE_PROMOTION, and the history carries BOTH
  // recorded events — the owner freeze (frozenBy/frozenAt, recorded
  // facts from the frozen-batch artifact) and the import (write time).
  function buildBlockForPromotion(record, ctx) {
    ctx = isPlainObject(ctx) ? ctx : {};
    if (!isPlainObject(record)) {
      return { ok: false, block: null,
        errors: ["buildBlockForPromotion needs a record object."] };
    }
    var errors = [];
    if (!isNonEmptyString(ctx.frozenBy)) {
      errors.push("buildBlockForPromotion needs frozenBy (the recorded owner freeze actor).");
    }
    if (!isIso(ctx.frozenAt)) {
      errors.push("buildBlockForPromotion needs an ISO-8601 frozenAt (the recorded freeze time).");
    }
    if (!isNonEmptyString(ctx.batchId)) {
      errors.push("buildBlockForPromotion needs batchId.");
    }
    var now = ctx.now !== undefined ? ctx.now : new Date().toISOString();
    if (!isIso(now)) {
      errors.push("buildBlockForPromotion needs an ISO-8601 `now` (the write time).");
    }
    if (errors.length) return { ok: false, block: null, errors: errors };
    var actor = isNonEmptyString(ctx.actor) ? ctx.actor : SYSTEM_IMPORT_ACTOR;
    return buildBlock({
      source: record.source,
      sourceType: "CANDIDATE_PROMOTION",
      acquiredAt: now,
      transformationHistory: [
        {
          at: ctx.frozenAt,
          actor: ctx.frozenBy,
          action: "freeze",
          note: "Frozen into " + ctx.batchId + " by the owner authority gate."
        },
        {
          at: now,
          actor: actor,
          action: "import",
          note: "Promoted through the two-phase import gate as " + ctx.batchId + "."
        }
      ]
    });
  }

  // ---- Append-only transformation history ---------------------------
  //
  // Appends one entry to a record's provenance history and returns a
  // NEW record object; the input record and every earlier entry are
  // never mutated. A record without a block gains one built ONLY
  // from its own recorded fields — with acquiredAt null, because a
  // transformation is not an acquisition (the correction time is not
  // the time MTI6 acquired the fact). Used by applyCorrections.
  function appendTransformation(record, entry, ctx) {
    ctx = isPlainObject(ctx) ? ctx : {};
    if (!isPlainObject(record)) {
      return { ok: false, record: null,
        errors: ["appendTransformation needs a record object."] };
    }
    var at = entry && entry.at !== undefined ? entry.at
      : (ctx.now !== undefined ? ctx.now : new Date().toISOString());
    var fullEntry = {
      at: at,
      actor: entry ? entry.actor : undefined,
      action: entry ? entry.action : undefined,
      note: entry && entry.note !== undefined ? entry.note : undefined
    };
    var entryErrors = validateHistoryEntry(fullEntry);
    if (entryErrors.length) {
      return { ok: false, record: null, errors: entryErrors };
    }
    var next = clone(record);
    var block;
    if (isPlainObject(next.provenance)) {
      var blockErrors = validateBlock(next.provenance);
      if (blockErrors.length) {
        return { ok: false, record: null,
          errors: ["Existing provenance block is invalid: " + blockErrors.join(" ")] };
      }
      block = clone(next.provenance);
      if (!Array.isArray(block.transformationHistory)) {
        block.transformationHistory = [];
      }
    } else {
      var built = buildBlock({ source: next.source });
      if (!built.ok) return { ok: false, record: null, errors: built.errors };
      block = built.block;
    }
    // New array: earlier entries are never rewritten in place.
    block.transformationHistory =
      block.transformationHistory.concat([fullEntry]);
    next.provenance = block;
    return { ok: true, record: next, errors: [] };
  }

  function hasBlock(record) {
    return isPlainObject(record) && isPlainObject(record.provenance);
  }

  // ---- The §5.3 default projection -----------------------------------
  //
  // What every consumer reads. For a record WITH a valid block, the
  // block's fields are carried verbatim. For a record WITHOUT one,
  // the §5.3 defaults: source from the record's top-level `source`
  // (or UNKNOWN), origin UNKNOWN, sourceType derived only where
  // determined, all three times null, evidence [], history [].
  // A malformed carried block is never trusted: the record projects
  // the defaults plus contractBug true and the block errors.
  // A record's `lastReviewedAt` is a review date, never an
  // acquisition/retrieval/observation time — it is never read here.
  function project(record) {
    var base = {
      source: "UNKNOWN",
      origin: "UNKNOWN",
      sourceType: "UNKNOWN",
      acquiredAt: null,
      retrievedAt: null,
      observedAt: null,
      evidence: [],
      transformationHistory: [],
      canonicalState: "CANONICAL",
      hasBlock: false,
      excluded: false,
      contractBug: false,
      blockErrors: []
    };
    if (!isPlainObject(record)) {
      base.contractBug = true;
      base.blockErrors = ["project needs a record object."];
      return base;
    }
    if (EXCLUDED_RECORD_KINDS.indexOf(record.recordKind) !== -1) {
      base.excluded = true;
      base.canonicalState = null;
      base.reason = "recordKind " + record.recordKind +
        " is excluded from canonical views; its provenance stays on " +
        "the candidate pipeline's own fields.";
      if (isNonEmptyString(record.source)) base.source = record.source;
      return base;
    }
    if (isNonEmptyString(record.source)) base.source = record.source;
    if (!hasBlock(record)) {
      // §5.3 defaults: sourceType is derived only where the record's
      // own fields determine it — never guessed.
      base.sourceType = deriveSourceType(record);
      return base;
    }
    var errors = validateBlock(record.provenance);
    if (errors.length) {
      base.contractBug = true;
      base.blockErrors = errors;
      // The block's claims are untrusted, but the record's own
      // top-level source is a recorded fact: derive from it.
      base.sourceType = deriveSourceType(record);
      return base;
    }
    var b = record.provenance;
    base.hasBlock = true;
    base.source = isNonEmptyString(b.source) ? b.source : base.source;
    base.origin = isNonEmptyString(b.origin) ? b.origin : "UNKNOWN";
    base.sourceType = b.sourceType !== undefined && b.sourceType !== null
      ? b.sourceType : "UNKNOWN";
    base.acquiredAt = b.acquiredAt !== undefined ? b.acquiredAt : null;
    base.retrievedAt = b.retrievedAt !== undefined ? b.retrievedAt : null;
    base.observedAt = b.observedAt !== undefined ? b.observedAt : null;
    base.evidence = Array.isArray(b.evidence) ? clone(b.evidence) : [];
    base.transformationHistory = Array.isArray(b.transformationHistory)
      ? clone(b.transformationHistory) : [];
    base.canonicalState = b.canonicalState !== undefined &&
      b.canonicalState !== null ? b.canonicalState : null;
    return base;
  }

  // ---- Measured summary ------------------------------------------------
  //
  // Counts over a supplied record array. Every count is measured by
  // running over the array: a 0 here means the collection ran and
  // found none (computed: true). A non-array input is unmeasured:
  // counts null, computed: false — never a fake 0.
  function summarize(records) {
    var out = {
      total: null,
      withBlock: null,
      withoutBlock: null,
      bySourceType: null,
      withEvidence: null,
      unknownOrigin: null,
      computed: false
    };
    if (!Array.isArray(records)) return out;
    var bySourceType = {};
    SOURCE_TYPES.forEach(function (t) { bySourceType[t] = 0; });
    var withBlock = 0, withEvidence = 0, unknownOrigin = 0, canonical = 0;
    records.forEach(function (r) {
      var p = project(r);
      if (p.excluded) return;
      canonical++;
      if (p.hasBlock) withBlock++;
      bySourceType[p.sourceType] = (bySourceType[p.sourceType] || 0) + 1;
      if (p.evidence.length > 0) withEvidence++;
      if (p.origin === "UNKNOWN") unknownOrigin++;
    });
    out.total = records.length;
    out.withBlock = withBlock;
    out.withoutBlock = canonical - withBlock;
    out.bySourceType = bySourceType;
    out.withEvidence = withEvidence;
    out.unknownOrigin = unknownOrigin;
    out.computed = true;
    return out;
  }

  global.Provenance = {
    CONTRACT_VERSION: CONTRACT_VERSION,
    SOURCE_TYPES: SOURCE_TYPES,
    EVIDENCE_KINDS: EVIDENCE_KINDS,
    EXCLUDED_RECORD_KINDS: EXCLUDED_RECORD_KINDS,
    SYSTEM_IMPORT_ACTOR: SYSTEM_IMPORT_ACTOR,
    validateEvidenceItem: validateEvidenceItem,
    validateHistoryEntry: validateHistoryEntry,
    validateBlock: validateBlock,
    deriveSourceType: deriveSourceType,
    buildBlock: buildBlock,
    buildBlockForImport: buildBlockForImport,
    buildBlockForPromotion: buildBlockForPromotion,
    appendTransformation: appendTransformation,
    hasBlock: hasBlock,
    project: project,
    summarize: summarize
  };
})(typeof window !== "undefined" ? window : this);
