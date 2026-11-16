/* MTI6-GTADWIY-COCKPIT — Encyclopedia content import loader (Import 1)
 * Loads approved batch data files into the existing cryptoWorld store.
 * Every record passes through the UNCHANGED CryptoWorld.validateEntry
 * first, plus the loader's own batch-contract checks. Batch A checks
 * (family level, family set, workspace, Globe view, import batch,
 * UNVERIFIED status with canonical-import provenance) are unchanged.
 * The canonical-60 batch (freeze import, Nov 8, 2026) carries the same
 * common checks plus its own contract: level MAJOR_ACTIVITY, set tag
 * canonical-60, exactly one primaryFamily that resolves to a known Batch A
 * family, optional relatedFamilies that also resolve. A record that fails
 * any check is NOT written and is listed in the import report with its
 * reasons — the validator is never weakened to populate the UI. Loading is
 * idempotent: a record already in the store is counted as already present
 * and is not rewritten, so re-running an import (boot, revisit, or a second
 * device sync) never duplicates entries. After every import run the loader
 * recomputes the taxonomy metadata from the store (count of canonical-60
 * Major Activities actually present) and flips the status to
 * TAXONOMY_IMPORTED only when all 60 are present; otherwise it stays
 * TAXONOMY_IMPORT_PENDING. No new IndexedDB store, no migration, no new
 * localStorage key, no network calls, no wallet code. The report is derived
 * live from the batch data plus the store, so it is always truthful about
 * imported / pending / rejected counts.
 * Analytics is untouched by this loader.
 *
 * Batch B pre-import gate (Nov 10, 2026, gate code only — NO Batch B
 * import): a new Batch B branch (buildBatchBIndex / checkBatchBRecord /
 * validateBatchB) validates a Batch B candidate against a candidate index
 * (store activities + batch records, order-independent) and admits it
 * only as a whole — one invalid record blocks the whole candidate with
 * zero writes. The existing canonical-60 / Batch A branches are untouched.
 * Batch B is wired (Nov 12, 2026, owner-authorized runtime wiring):
 * the Batch B data file (js/data/encyclopedia-batch-b.js) is loaded by
 * index.html and registered in batches() below, so importAll() processes
 * it on boot / Encyclopedia visit via the gate branch above.
 * A CORRECTIONS table (owner-approved only) delivers
 * the Q-BGR-10 alias correction to already-imported records.
 */
(function (global) {
  "use strict";

  var GLOBE_VIEWS = ["MARKET", "YIELD", "NETWORK", "ECONOMY", "MY_COCKPIT"];

  // Owner-approved record corrections (Q-BGR-10, U4). Explicit, auditable,
  // idempotent, and limited to the listed ids + fields: a correction entry
  // may ONLY set the named fields on the named record, and only when the
  // stored record does not already match. This table is NOT a general
  // mutation engine — no other record or field is ever touched, and no
  // entry may be added here without an owner approval.
  // Q-BGR-10: family-cross-chain drops the "Bridging" alias (Major
  // Activity #41 major-bridging is a different record and is untouched).
  var CORRECTIONS = [
    { id: "family-cross-chain", set: { aliases: ["Interoperability"] } }
  ];

  // Deep equality ignoring object key order (for same-id content
  // comparison and correction matching). Primitives compare by value;
  // arrays compare in order.
  function recordsEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (!recordsEqual(a[i], b[i])) return false;
      return true;
    }
    var ka = Object.keys(a).sort();
    var kb = Object.keys(b).sort();
    if (ka.length !== kb.length) return false;
    for (var j = 0; j < ka.length; j++) {
      if (ka[j] !== kb[j]) return false;
      if (!recordsEqual(a[ka[j]], b[ka[j]])) return false;
    }
    return true;
  }

  // Apply owner-approved corrections to already-imported records. For
  // each correction entry: if the stored record exists and any listed
  // field differs, overwrite ONLY the listed fields and count it as
  // corrected. A record that already matches is a no-op (idempotent).
  // Returns the number of stored records actually corrected.
  async function applyCorrections(existing) {
    var corrected = 0;
    for (var i = 0; i < CORRECTIONS.length; i++) {
      var c = CORRECTIONS[i];
      var stored = null;
      for (var j = 0; j < existing.length; j++) {
        if (existing[j] && existing[j].id === c.id) { stored = existing[j]; break; }
      }
      if (!stored) continue;
      var changed = false;
      var next = {};
      Object.keys(stored).forEach(function (k) { next[k] = stored[k]; });
      Object.keys(c.set).forEach(function (k) {
        if (!recordsEqual(stored[k], c.set[k])) { next[k] = c.set[k]; changed = true; }
      });
      if (!changed) continue;
      try { await writeRecord(next); } catch (e) { continue; }
      for (var k2 = 0; k2 < existing.length; k2++) {
        if (existing[k2] && existing[k2].id === c.id) existing[k2] = next;
      }
      corrected++;
    }
    return corrected;
  }

  // Read-only count of correction entries whose stored record still
  // differs (i.e. corrections pending). Used by report().
  function pendingCorrections(existing) {
    var n = 0;
    CORRECTIONS.forEach(function (c) {
      var stored = null;
      (existing || []).forEach(function (r) { if (r && r.id === c.id) stored = r; });
      if (!stored) return;
      var differs = false;
      Object.keys(c.set).forEach(function (k) {
        if (!recordsEqual(stored[k], c.set[k])) differs = true;
      });
      if (differs) n++;
    });
    return n;
  }

  function batches() {
    var list = [];
    if (global.EncyclopediaBatchA) list.push(global.EncyclopediaBatchA);
    if (global.EncyclopediaCanonical60) list.push(global.EncyclopediaCanonical60);
    if (global.EncyclopediaBatchB) list.push(global.EncyclopediaBatchB);
    if (global.EncyclopediaEntityBatch1) list.push(global.EncyclopediaEntityBatch1);
    if (global.EncyclopediaEntityBatch2) list.push(global.EncyclopediaEntityBatch2);
    return list;
  }

  // Entity import enable state, PER BATCH (owner sequence, Nov 14, 2026;
  // per-batch since the P2 wiring, Nov 16, 2026). The entity gate below
  // is WIRED — validated, reported, and visible — but a batch's import
  // leg stays disabled until the owner's separate IMPORT authorization
  // enables THAT batch. While a batch is disabled it performs zero
  // writes and zero registrations and reports itself as disabled (not
  // failed, not blocked): wiring and import are separate owner steps.
  var ENTITY_BATCH_ENABLED = {
    "entity-batch-1": true,
    "entity-batch-2": true
  };
  function entityBatchEnabled(batch) {
    if (!batch) return false;
    var key = typeof batch === "string" ? batch : batch.batch;
    return ENTITY_BATCH_ENABLED[key] === true || RUNTIME_FROZEN_BATCH_ENABLED[key] === true;
  }

  // Owner-frozen candidate batches (P4, additive, Nov 16, 2026). The
  // static per-batch hold above governs the hand-authored data files.
  // A batch produced by the Entity Authority Gate (js/entity-gate.js)
  // carries its authorization differently: the owner's FREEZE act is
  // recorded on the batch object itself (frozenBy "OWNER:<ref>" plus a
  // frozenAt timestamp, persisted in the frozen-batch artifact). Such
  // a batch becomes importable only when this function validates that
  // provenance and registers the batch id for THIS session — the
  // default stays disabled, and a batch without valid owner freeze
  // provenance is refused. The two-phase gate itself is unchanged:
  // enabling only lifts the hold; validation, zero-write-on-failure,
  // and registration all run exactly as for Batch 1/2.
  var RUNTIME_FROZEN_BATCH_ENABLED = {};
  function enableOwnerFrozenBatch(batch) {
    if (!batch || batch.kind !== "entity") return false;
    if (typeof batch.batch !== "string" || !/^entity-batch-\d+$/.test(batch.batch)) return false;
    if (typeof batch.frozenBy !== "string" || batch.frozenBy.indexOf("OWNER:") !== 0) return false;
    if (!batch.frozenAt || isNaN(Date.parse(batch.frozenAt))) return false;
    RUNTIME_FROZEN_BATCH_ENABLED[batch.batch] = true;
    return true;
  }

  // ---- Single-flight guard (Fix-up #3, defect B) ----
  // importAll is called from TWO places: fire-and-forget at boot
  // (js/app.js:343-344) and awaited on every encyclopedia screen render
  // (js/modules/encyclopedia.js:60-61). Without a guard those two calls
  // run as two interleaved full import sequences (~1656 puts for one
  // boot + one visit) with two divergent summaries. The interleaving
  // does not corrupt a healthy store — puts are idempotent by id and
  // every batch re-reads the store before validating — but it doubles
  // the write storm and makes the outcome non-deterministic, so
  // concurrent callers now share ONE in-flight run and receive the same
  // summary. The guard clears when the run settles, so a later call
  // (next visit, after a failure) starts a fresh run and can self-heal.
  var importAllInFlight = null;
  function clearInFlight() { importAllInFlight = null; }

  // Family ids known from the store (imported Batch A families) plus the
  // Batch A data file when it is loaded. Used only to validate a
  // canonical-60 record's primaryFamily / relatedFamilies.
  function knownFamilyIds(existing) {
    var ids = {};
    (existing || []).forEach(function (r) {
      if (r && r.level === "FAMILY" && typeof r.id === "string") ids[r.id] = true;
    });
    if (global.EncyclopediaBatchA && Array.isArray(global.EncyclopediaBatchA.records)) {
      global.EncyclopediaBatchA.records.forEach(function (r) {
        if (r && typeof r.id === "string") ids[r.id] = true;
      });
    }
    return ids;
  }

  // Loader-level batch-contract checks for a batch record.
  // These sit ON TOP OF validateEntry; they never replace or relax it.
  function checkBatchRecord(batch, rec, existing) {
    var errors = [];
    var CW = global.CryptoWorld;
    if (CW && typeof CW.validateEntry === "function") {
      errors = errors.concat(CW.validateEntry(rec));
    } else {
      errors.push("CryptoWorld.validateEntry is not available.");
    }
    if (!rec || typeof rec !== "object") return errors;
    var isCanonical = batch && batch.kind === "canonical-60";
    var label = isCanonical ? "Canonical-60" : "Batch A";
    if (rec.registry !== "activities") errors.push(label + " records must use registry \"activities\".");
    if (isCanonical) {
      if (rec.level !== "MAJOR_ACTIVITY") errors.push("Canonical-60 records must carry level \"MAJOR_ACTIVITY\".");
      if (rec.canonicalSet !== "canonical-60") errors.push("Canonical-60 records must carry canonicalSet \"canonical-60\".");
      var known = knownFamilyIds(existing);
      if (typeof rec.primaryFamily !== "string" || !rec.primaryFamily.trim()) {
        errors.push("Canonical-60 records must name exactly one primaryFamily.");
      } else if (!known[rec.primaryFamily]) {
        errors.push("primaryFamily \"" + rec.primaryFamily + "\" is not a known Batch A family.");
      }
      if (rec.relatedFamilies !== undefined) {
        if (!Array.isArray(rec.relatedFamilies) || rec.relatedFamilies.some(function (f) { return typeof f !== "string" || !known[f]; })) {
          errors.push("relatedFamilies must be an array of known Batch A family ids.");
        }
      }
    } else {
      if (rec.level !== "FAMILY") errors.push("Batch A records must carry level \"FAMILY\".");
      if (rec.familySet !== batch.familySet) errors.push("Batch A records must carry familySet \"" + batch.familySet + "\".");
    }
    if (typeof rec.workspace !== "string" || !rec.workspace.trim()) {
      errors.push(label + " records must name a primary workspace.");
    }
    if (GLOBE_VIEWS.indexOf(rec.globeView) === -1) {
      errors.push("globeView must be one of " + GLOBE_VIEWS.join(", ") + ".");
    }
    if (rec.importBatch !== batch.batch) errors.push("importBatch must be \"" + batch.batch + "\".");
    if (rec.verificationStatus !== "UNVERIFIED") {
      errors.push("Imported canonical records must start UNVERIFIED.");
    }
    if (rec.source !== "canonical-import") {
      errors.push("Imported canonical records must carry source \"canonical-import\".");
    }
    return errors;
  }

  // ---- Batch B pre-import gate (gate code only — no Batch B import) ----
  // Candidate index: id -> record, built ONCE per importBatch run from
  // (a) all store records with registry "activities" and (b) all records
  // in the batch being imported, in that order. Validation is therefore
  // order-independent: a Strategy resolves to its Type even when listed
  // before the Type in the batch. A batch id colliding with a store id is
  // flagged separately by the same-id content rule in validateBatchB.
  function buildBatchBIndex(batch, existing) {
    var index = {};
    (existing || []).forEach(function (r) {
      if (r && r.registry === "activities" && typeof r.id === "string" && !index[r.id]) index[r.id] = r;
    });
    (batch.records || []).forEach(function (r) {
      if (r && typeof r.id === "string" && !index[r.id]) index[r.id] = r;
    });
    return index;
  }

  // Batch B contract + parent/reference existence checks for one record.
  // Runs validateEntry first (with the gate's format checks), then the
  // Batch B contract, then existence checks against the candidate index.
  // `seenIds` holds the ids of EARLIER records in this batch (duplicate
  // detection); the caller also rejects the first occurrence.
  function checkBatchBRecord(batch, rec, index, seenIds) {
    var errors = [];
    var CW = global.CryptoWorld;
    if (CW && typeof CW.validateEntry === "function") {
      errors = errors.concat(CW.validateEntry(rec));
    } else {
      errors.push("CryptoWorld.validateEntry is not available.");
    }
    if (!rec || typeof rec !== "object") return errors;
    if (rec.registry !== "activities") errors.push("Batch B records must use registry \"activities\".");
    if (rec.level !== "TYPE" && rec.level !== "STRATEGY") {
      errors.push("Batch B records must carry level TYPE or STRATEGY.");
    }
    if (typeof rec.workspace !== "string" || !rec.workspace.trim()) {
      errors.push("Batch B records must name a primary workspace.");
    }
    if (GLOBE_VIEWS.indexOf(rec.globeView) === -1) {
      errors.push("globeView must be one of " + GLOBE_VIEWS.join(", ") + ".");
    }
    if (rec.importBatch !== "import1-batch-b") {
      errors.push("importBatch must be \"import1-batch-b\".");
    }
    if (rec.verificationStatus !== "UNVERIFIED") {
      errors.push("Imported canonical records must start UNVERIFIED.");
    }
    if (rec.source !== "canonical-import") {
      errors.push("Imported canonical records must carry source \"canonical-import\".");
    }
    if (rec.ownerApprovalStatus !== "PENDING") {
      errors.push("Batch B records must carry ownerApprovalStatus \"PENDING\".");
    }
    if (typeof rec.id === "string" && seenIds && seenIds[rec.id]) {
      errors.push("Duplicate id within batch.");
    }
    // Parent existence + level (the core check). A parent that exists
    // only in another registry does not count — the index holds
    // activities records only.
    if (typeof rec.parentRef === "string" && rec.parentRef) {
      var parent = index[rec.parentRef];
      if (rec.level === "TYPE") {
        if (!parent) {
          errors.push("TYPE parent \"" + rec.parentRef + "\" does not exist in the store or this batch.");
        } else if (parent.level !== "MAJOR_ACTIVITY" || parent.canonicalSet !== "canonical-60") {
          errors.push("TYPE parent \"" + rec.parentRef + "\" is a " + (parent.level || "(no level)") + ", not a Major Activity.");
        }
      } else if (rec.level === "STRATEGY") {
        if (!parent) {
          errors.push("STRATEGY parent \"" + rec.parentRef + "\" does not exist in the store or this batch.");
        } else if (parent.level !== "TYPE") {
          errors.push("STRATEGY parent \"" + rec.parentRef + "\" is a " + (parent.level || "(no level)") + ", not a Type.");
        }
      }
    }
    (rec.relatedActivities || []).forEach(function (target) {
      var t = index[target];
      if (!t || t.level !== "MAJOR_ACTIVITY" || t.canonicalSet !== "canonical-60") {
        errors.push("relatedActivities target \"" + target + "\" is not a canonical Major Activity.");
      }
    });
    // strategySources: authoritative Type ids ONLY. A title-form entry is
    // a rejection for a Batch B candidate — no runtime title resolution,
    // no fuzzy matching, no annotation stripping. (The duplicate Type
    // title "Stablecoin Farming" x2 makes title resolution fragile by
    // construction; normalization happens offline in the production-file
    // transform, never in the loader.)
    (rec.strategySources || []).forEach(function (entry) {
      var s = index[entry];
      if (!s || s.level !== "TYPE") {
        errors.push("strategySources entries must be authoritative Type ids.");
      }
    });
    return errors;
  }

  // Pure pre-validation for a Batch B batch: validates EVERY record
  // against the candidate index, flags duplicate ids (BOTH occurrences)
  // and same-id-different-content vs the store. No writes. Returns
  // dispositions: [{rec, errors, alreadyPresent}].
  function validateBatchB(batch, existing) {
    var index = buildBatchBIndex(batch, existing);
    var CW = global.CryptoWorld;
    var seenIds = {};
    var firstIndexById = {};
    var dispositions = [];
    for (var i = 0; i < (batch.records || []).length; i++) {
      var rec = batch.records[i];
      var errors = checkBatchBRecord(batch, rec, index, seenIds);
      if (rec && typeof rec.id === "string") {
        if (seenIds[rec.id]) {
          var first = dispositions[firstIndexById[rec.id]];
          if (first) first.errors.push("Duplicate id within batch.");
        } else {
          seenIds[rec.id] = true;
          firstIndexById[rec.id] = i;
        }
      }
      var alreadyPresent = false;
      var stored = (rec && typeof rec.id === "string" && CW && typeof CW.getEntry === "function")
        ? CW.getEntry(existing, rec.id) : null;
      if (stored) {
        if (recordsEqual(stored, rec)) {
          alreadyPresent = true;
        } else {
          errors.push("Record \"" + rec.id + "\" already exists in the store with different content.");
        }
      }
      dispositions.push({ rec: rec, errors: errors, alreadyPresent: alreadyPresent });
    }
    return dispositions;
  }

  // Batch B taxonomy meta. The record is created by the batch-b branch
  // (and healed by runImportAll below): the status is recomputed from
  // the records actually present in the store, never from what a single
  // run happened to import. Before Nov 14, 2026 (World Engine Depth
  // Package Item 2) this helper ran only on runs that imported at least
  // one record, so a store whose records were already all present kept
  // a stale BATCH_B_IMPORT_PENDING label forever; runImportAll now calls
  // it on every run — with no array argument it re-reads the store
  // itself, exactly like syncTaxonomyMeta — and writes only when the
  // stored record differs from the recomputed one.
  async function syncBatchBMeta(existing) {
    var d = db();
    if (!d || typeof d.put !== "function") return;
    if (!Array.isArray(existing)) {
      try { existing = await readStore(); } catch (e) { return; }
    }
    var count = 0;
    var current = null;
    (existing || []).forEach(function (r) {
      if (!r) return;
      if (r.id === "taxonomy-meta-batch-b") current = r;
      if (r.importBatch === "import1-batch-b") count++;
    });
    var next = {
      id: "taxonomy-meta-batch-b", registry: "taxonomy",
      expectedCount: 738, importedCount: count,
      status: count === 738 ? "BATCH_B_IMPORTED" : "BATCH_B_IMPORT_PENDING"
    };
    if (current && current.expectedCount === 738 && current.importedCount === count && current.status === next.status) return;
    try { await d.put("cryptoWorld", next); } catch (e) {}
  }

  // Two-phase Batch B import. Phase 1 validates the COMPLETE candidate
  // before writing anything; one invalid record blocks the whole
  // candidate with ZERO writes (out.blocked + out.blockReason, every
  // failing record listed). Phase 2 writes only after a clean pass.
  // Honest atomicity note: the write phase is NOT a single IndexedDB
  // transaction — this codebase has no multi-record transactions, and
  // each record is one CockpitDB.put. A device/storage write failure
  // mid-batch may therefore still produce partial physical writes; that
  // is reported per record and self-heals on the next importAll run
  // (already-written records count alreadyPresent). Do not describe the
  // write phase as fully transactional or fully atomic: the fail-closed
  // guarantee is that no write is ATTEMPTED when pre-validation fails.
  async function importBatchB(batch, existing, out) {
    var dispositions = validateBatchB(batch, existing);
    var bad = dispositions.filter(function (d) { return d.errors.length > 0; });
    if (bad.length) {
      out.blocked = true;
      out.blockReason = "Batch B import blocked: " + bad.length + " record(s) failed the parent-integrity gate.";
      bad.forEach(function (d) {
        out.rejected.push({ id: d.rec && d.rec.id ? d.rec.id : "(no id)", reasons: d.errors });
      });
      return out;
    }
    for (var j = 0; j < dispositions.length; j++) {
      var d = dispositions[j];
      if (d.alreadyPresent) { out.alreadyPresent++; continue; }
      try {
        await writeRecord(d.rec);
        existing.push(d.rec);
        out.imported++;
      } catch (e) {
        // A write failure is NOT a gate verdict: it means the store
        // could not be written, and the summary must say so (defect B).
        out.writeFailed++;
        out.failed = true;
        if (!out.writeError) out.writeError = "Store write failed: " + (e && e.message ? e.message : String(e));
        out.rejected.push({ id: d.rec.id, reasons: ["Store write failed: " + (e && e.message ? e.message : String(e))] });
      }
    }
    // Sync the Batch B meta record when this run imported something.
    // Idempotent re-runs (all alreadyPresent) are healed separately:
    // runImportAll calls syncBatchBMeta() on every run, and it writes
    // only when the stored record differs from the recomputed status.
    if (out.imported > 0) {
      try { await syncBatchBMeta(existing); } catch (e) {}
    }
    return out;
  }


  // ---- Entity batches (reusable registration gate, Nov 14, 2026) --------
  // The pipeline every entity batch flows through — Batch 1 today,
  // future owner-approved batches and gate-passed bot candidates
  // tomorrow. Two phases, mirroring the Batch B gate: Phase 1
  // validates EVERYTHING (canonical store records, runtime-module
  // records, and the cross-checks between them) and writes NOTHING
  // on any failure. Phase 2 writes the canonical store records, then
  // ENSURES each entity is registered in its runtime module
  // (AssetIntelligence / ProtocolIntelligence / NetworkIntelligence)
  // under the SAME id. Registration is derived state hydrated from
  // the canonical records: it runs on every import run (including
  // runs where every record is alreadyPresent, i.e. every fresh page
  // load), it is idempotent, and a failed or NOT_LOADED module leg
  // never blocks, alters, or hides the canonical record — it is
  // reported on the run summary instead.

  // Forbidden financial-state keys on entity identity records (P2
  // additive, owner-directed Nov 16, 2026). The vocabulary follows the
  // platform's existing forbidden-field convention
  // (OpportunityIntelligence.FORBIDDEN_RETURN_FIELDS): keys are
  // normalised — lowercase, dashes/underscores stripped — before
  // comparison, so "market-value" and "marketValue" both hit
  // "marketvalue". Identity records carry identity only: no prices,
  // returns, balances, or market data, ever.
  var FORBIDDEN_ENTITY_KEYS = ["price", "apy", "apypct",
    "annualpercentageyield", "apr", "annualpercentagerate", "tvl",
    "totallockedvalue", "balance", "balances", "holdings", "earnings",
    "profit", "expectedprofit", "projectedprofit", "return", "returns",
    "expectedreturn", "projectedreturn", "roi", "yield", "yieldpct",
    "income", "revenue", "fees", "marketvalue", "marketcap", "volume",
    "liquidity"];
  function forbiddenEntityKeyErrors(rec) {
    var errors = [];
    if (!rec || typeof rec !== "object") return errors;
    Object.keys(rec).forEach(function (k) {
      var nk = String(k).toLowerCase().replace(/[-_]/g, "");
      if (FORBIDDEN_ENTITY_KEYS.indexOf(nk) !== -1) {
        errors.push("Entity records must not carry financial-state field \"" + k + "\".");
      }
    });
    return errors;
  }

  function checkEntityStoreRecord(batch, rec) {
    var errors = [];
    var CW = global.CryptoWorld;
    if (CW && typeof CW.validateEntry === "function") {
      errors = errors.concat(CW.validateEntry(rec));
    } else {
      errors.push("CryptoWorld.validateEntry is not available.");
    }
    errors = errors.concat(forbiddenEntityKeyErrors(rec));
    if (!rec || typeof rec !== "object") return errors;
    if (["assets", "chains", "protocols"].indexOf(rec.registry) === -1) {
      errors.push("Entity records must use registry \"assets\", \"chains\", or \"protocols\".");
    }
    if (rec.importBatch !== batch.batch) errors.push("importBatch must be \"" + batch.batch + "\".");
    if (rec.verificationStatus !== "UNVERIFIED") {
      errors.push("Entity records must start UNVERIFIED.");
    }
    if (rec.source !== "owner-seed") {
      errors.push("Entity records must carry source \"owner-seed\".");
    }
    return errors;
  }

  // Pure Phase 1 for an entity batch. Returns dispositions for the
  // store records plus moduleErrors for the module records; the
  // batch may proceed only when every list is empty.
  function validateEntityBatch(batch, existing) {
    var nets = batch.networks || [];
    var assets = batch.assets || [];
    var protos = batch.protocols || [];
    var records = batch.records || [];
    var netIds = {}, assetIds = {}, protoIds = {}, storeIds = {}, majorIds = {};
    nets.forEach(function (n) { if (n && n.id) netIds[n.id] = true; });
    assets.forEach(function (a) { if (a && a.assetId) assetIds[a.assetId] = true; });
    protos.forEach(function (pr) { if (pr && pr.protocolId) protoIds[pr.protocolId] = true; });
    records.forEach(function (r) { if (r && r.id) storeIds[r.id] = true; });
    (existing || []).forEach(function (r) {
      if (r && r.level === "MAJOR_ACTIVITY" && r.id) majorIds[r.id] = true;
    });
    records.forEach(function (r) {
      if (r && r.level === "MAJOR_ACTIVITY" && r.id) majorIds[r.id] = true;
    });

    // Canonical union context (P2, owner-authorized Nov 16, 2026): the
    // existing store records that are legitimate canonical ENTITIES —
    // entity registries (chains/assets/protocols), written by an entity
    // batch (importBatch "entity-batch-*"), and not pipeline candidates
    // (recordKind ENTITY_CANDIDATE is excluded outright; candidates also
    // never carry an entity-batch importBatch tag). Reference resolution
    // may consult these ids READ-ONLY; nothing here writes, overwrites,
    // or promotes anything. Meta/taxonomy records (registry "taxonomy")
    // can never satisfy an entity reference, and resolution is keyed by
    // canonical id only — never by name, ticker, or alias.
    var ctxNetIds = {}, ctxAssetIds = {}, ctxProtoIds = {};
    (existing || []).forEach(function (r) {
      if (!r || typeof r.id !== "string") return;
      if (r.recordKind === "ENTITY_CANDIDATE") return;
      if (typeof r.importBatch !== "string" || r.importBatch.indexOf("entity-batch-") !== 0) return;
      if (r.registry === "chains") ctxNetIds[r.id] = true;
      else if (r.registry === "assets") ctxAssetIds[r.id] = true;
      else if (r.registry === "protocols") ctxProtoIds[r.id] = true;
    });
    function netKnown(id) { return !!(netIds[id] || ctxNetIds[id]); }
    function assetKnown(id) { return !!(assetIds[id] || ctxAssetIds[id]); }
    function protoKnown(id) { return !!(protoIds[id] || ctxProtoIds[id]); }

    // Contract/mint anchor uniqueness across every REGISTERED entity
    // batch plus this batch (P2 additive): one canonical anchor must
    // never establish two different asset identities. Anchors live on
    // module records, so the registered batch globals are the source.
    var anchorOwner = {};
    function claimAnchor(asset) {
      var v = asset && (asset.contractAddress || asset.mintAddress);
      if (!v || !asset.assetId) return null;
      var key = String(v).toLowerCase();
      if (anchorOwner[key] && anchorOwner[key] !== asset.assetId) {
        return "Anchor \"" + v + "\" is also claimed by " + anchorOwner[key] + ".";
      }
      anchorOwner[key] = asset.assetId;
      return null;
    }
    batches().forEach(function (b) {
      if (b && b.kind === "entity" && b !== batch) {
        (b.assets || []).forEach(function (a) { claimAnchor(a); });
      }
    });

    var moduleErrors = [];
    var NI = global.NetworkIntelligence, AI = global.AssetIntelligence, PI = global.ProtocolIntelligence;
    nets.forEach(function (n) {
      var errs = NI && typeof NI.validateNetwork === "function" ? NI.validateNetwork(n) : ["NetworkIntelligence is not available."];
      errs = errs.concat(forbiddenEntityKeyErrors(n));
      if (!storeIds[n.id]) errs.push("Network \"" + n.id + "\" has no canonical store record in this batch.");
      if (errs.length) moduleErrors.push({ id: n.id || "(no id)", kind: "network", reasons: errs });
    });
    assets.forEach(function (a) {
      var errs = AI && typeof AI.validateAssetRecord === "function" ? AI.validateAssetRecord(a) : ["AssetIntelligence is not available."];
      errs = errs.concat(forbiddenEntityKeyErrors(a));
      var anchorErr = claimAnchor(a);
      if (anchorErr) errs.push(anchorErr);
      if (!storeIds[a.assetId]) errs.push("Asset \"" + a.assetId + "\" has no canonical store record in this batch.");
      if (a.networkId && !netKnown(a.networkId)) errs.push("Asset network \"" + a.networkId + "\" is not one of this batch's networks or a canonical network.");
      if (a.protocol && !protoKnown(a.protocol)) errs.push("Asset protocol \"" + a.protocol + "\" is not one of this batch's protocols or a canonical protocol.");
      if (errs.length) moduleErrors.push({ id: a.assetId || "(no id)", kind: "asset", reasons: errs });
    });
    protos.forEach(function (pr) {
      var errs = PI && typeof PI.validateProtocol === "function" ? PI.validateProtocol(pr) : ["ProtocolIntelligence is not available."];
      errs = errs.concat(forbiddenEntityKeyErrors(pr));
      if (!storeIds[pr.protocolId]) errs.push("Protocol \"" + pr.protocolId + "\" has no canonical store record in this batch.");
      (pr.networks || []).forEach(function (n) {
        if (!netKnown(n)) errs.push("Protocol network \"" + n + "\" is not one of this batch's networks or a canonical network.");
      });
      (pr.activities || []).forEach(function (m) {
        if (!majorIds[m]) errs.push("Protocol activity \"" + m + "\" is not a known canonical Major Activity.");
      });
      if (errs.length) moduleErrors.push({ id: pr.protocolId || "(no id)", kind: "protocol", reasons: errs });
    });

    var CW = global.CryptoWorld;
    var seenIds = {}, firstIndexById = {};
    // Alias ownership is seeded from the existing canonical entities
    // (P2 additive): a new batch may not claim an alias already owned
    // by a different canonical entity. Seeding uses the same canonical
    // filter as the union context; a record re-claiming its OWN alias
    // (a batch re-validated against its own imported records) is not
    // a conflict — the owner comparison below compares ids.
    var aliasOwner = {};
    (existing || []).forEach(function (r) {
      if (!r || typeof r.id !== "string") return;
      if (r.recordKind === "ENTITY_CANDIDATE") return;
      if (typeof r.importBatch !== "string" || r.importBatch.indexOf("entity-batch-") !== 0) return;
      if (["chains", "assets", "protocols"].indexOf(r.registry) === -1) return;
      (r.aliases || []).forEach(function (a) { aliasOwner[String(a).toLowerCase()] = r.id; });
    });
    var dispositions = [];
    for (var i = 0; i < records.length; i++) {
      var rec = records[i];
      var errors = checkEntityStoreRecord(batch, rec);
      if (rec && typeof rec.id === "string") {
        if (seenIds[rec.id]) {
          var first = dispositions[firstIndexById[rec.id]];
          if (first) first.errors.push("Duplicate id within batch.");
          errors.push("Duplicate id within batch.");
        } else {
          seenIds[rec.id] = true;
          firstIndexById[rec.id] = i;
        }
        var aligned = rec.registry === "chains" ? !!netIds[rec.id]
          : rec.registry === "assets" ? !!assetIds[rec.id]
          : rec.registry === "protocols" ? !!protoIds[rec.id] : false;
        if (!aligned) errors.push("Store record \"" + rec.id + "\" has no aligned module record in this batch.");
        (rec.aliases || []).forEach(function (a) {
          var key = String(a).toLowerCase();
          if (aliasOwner[key] && aliasOwner[key] !== rec.id) {
            errors.push("Alias \"" + a + "\" is also claimed by " + aliasOwner[key] + ".");
          }
          aliasOwner[key] = rec.id;
        });
        if (rec.nativeAssetRef && !assetKnown(rec.nativeAssetRef)) {
          errors.push("nativeAssetRef \"" + rec.nativeAssetRef + "\" is not one of this batch's assets or a canonical asset.");
        }
        if (rec.networkRef && !netKnown(rec.networkRef)) {
          errors.push("networkRef \"" + rec.networkRef + "\" is not one of this batch's networks or a canonical network.");
        }
        (rec.networkRefs || []).forEach(function (n) {
          if (!netKnown(n)) errors.push("networkRefs entry \"" + n + "\" is not one of this batch's networks or a canonical network.");
        });
        (rec.activityRefs || []).forEach(function (m) {
          if (!majorIds[m]) errors.push("activityRefs entry \"" + m + "\" is not a known canonical Major Activity.");
        });
      }
      var alreadyPresent = false;
      var stored = (rec && typeof rec.id === "string" && CW && typeof CW.getEntry === "function")
        ? CW.getEntry(existing, rec.id) : null;
      if (stored) {
        if (recordsEqual(stored, rec)) {
          alreadyPresent = true;
        } else {
          errors.push("Record \"" + rec.id + "\" already exists in the store with different content.");
        }
      }
      dispositions.push({ rec: rec, errors: errors, alreadyPresent: alreadyPresent });
    }
    return { dispositions: dispositions, moduleErrors: moduleErrors };
  }

  // Ensure every batch entity is registered in its runtime module.
  // Returns per-kind outcomes; a missing module is NOT_LOADED, never
  // a silent skip, and never affects the canonical records.
  function ensureEntityRegistrations(batch) {
    var out = {
      assets: { registered: 0, alreadyRegistered: 0, failed: [] },
      protocols: { registered: 0, alreadyRegistered: 0, failed: [] },
      networks: { registered: 0, alreadyRegistered: 0, failed: [] }
    };
    var AI = global.AssetIntelligence, PI = global.ProtocolIntelligence, NI = global.NetworkIntelligence;
    (batch.assets || []).forEach(function (a) {
      if (!AI || typeof AI.registerAsset !== "function") { out.assets.failed.push({ id: a.assetId, reasons: ["AssetIntelligence NOT_LOADED"] }); return; }
      if (typeof AI.getAsset === "function" && AI.getAsset(a.assetId)) { out.assets.alreadyRegistered++; return; }
      var r = AI.registerAsset(a);
      if (r.ok) out.assets.registered++; else out.assets.failed.push({ id: a.assetId, reasons: r.errors || ["registration failed"] });
    });
    (batch.protocols || []).forEach(function (pr) {
      if (!PI || typeof PI.registerProtocol !== "function") { out.protocols.failed.push({ id: pr.protocolId, reasons: ["ProtocolIntelligence NOT_LOADED"] }); return; }
      if (typeof PI.getProtocol === "function" && PI.getProtocol(pr.protocolId)) { out.protocols.alreadyRegistered++; return; }
      var r = PI.registerProtocol(pr);
      if (r.ok) out.protocols.registered++; else out.protocols.failed.push({ id: pr.protocolId, reasons: r.errors || ["registration failed"] });
    });
    (batch.networks || []).forEach(function (n) {
      if (!NI || typeof NI.registerNetwork !== "function" || typeof NI.listNetworks !== "function") {
        out.networks.failed.push({ id: n.id, reasons: ["NetworkIntelligence registry NOT_LOADED"] }); return;
      }
      var known = false;
      NI.listNetworks().forEach(function (x) { if (x.id === n.id) known = true; });
      if (known) { out.networks.alreadyRegistered++; return; }
      var r = NI.registerNetwork(n);
      if (r.ok) out.networks.registered++; else out.networks.failed.push({ id: n.id, reasons: r.errors || ["registration failed"] });
    });
    return out;
  }

  // Entity meta record: recomputed from the store contents on every
  // run (the healed pattern), written only when changed.
  async function syncEntityMeta(batch, existing) {
    if (!batch || batch.kind !== "entity") return;
    var d = db();
    if (!d || typeof d.put !== "function") return;
    if (!Array.isArray(existing)) {
      try { existing = await readStore(); } catch (e) { return; }
    }
    var count = 0;
    var current = null;
    var metaId = "entity-meta-" + batch.batch.replace(/^entity-/, "");
    (existing || []).forEach(function (r) {
      if (!r) return;
      if (r.id === metaId) current = r;
      if (r.importBatch === batch.batch) count++;
    });
    var prefix = batch.batch.toUpperCase().replace(/-/g, "_");
    var next = {
      id: metaId, registry: "taxonomy",
      expectedCount: (batch.records || []).length, importedCount: count,
      status: count === (batch.records || []).length ? prefix + "_IMPORTED" : prefix + "_IMPORT_PENDING"
    };
    if (current && current.expectedCount === next.expectedCount && current.importedCount === count && current.status === next.status) return;
    try { await d.put("cryptoWorld", next); } catch (e) {}
  }

  // Two-phase entity import. While the batch's per-batch enable state
  // is false the batch reports disabled and performs ZERO writes and
  // ZERO registrations (wiring without import, per the owner sequence).
  async function importEntityBatch(batch, existing, out) {
    var CW = global.CryptoWorld;
    if (!entityBatchEnabled(batch)) {
      out.disabled = true;
      (batch.records || []).forEach(function (rec) {
        var stored = (rec && typeof rec.id === "string" && CW && typeof CW.getEntry === "function")
          ? CW.getEntry(existing, rec.id) : null;
        if (stored && recordsEqual(stored, rec)) out.alreadyPresent++;
      });
      return out;
    }
    var check = validateEntityBatch(batch, existing);
    var bad = check.dispositions.filter(function (d) { return d.errors.length > 0; });
    if (bad.length || check.moduleErrors.length) {
      out.blocked = true;
      out.blockReason = "Entity import blocked: " + (bad.length + check.moduleErrors.length) + " record(s) failed the entity gate.";
      bad.forEach(function (d) {
        out.rejected.push({ id: d.rec && d.rec.id ? d.rec.id : "(no id)", reasons: d.errors });
      });
      check.moduleErrors.forEach(function (m) {
        out.rejected.push({ id: m.id, reasons: m.reasons });
      });
      return out;
    }
    for (var j = 0; j < check.dispositions.length; j++) {
      var d2 = check.dispositions[j];
      if (d2.alreadyPresent) { out.alreadyPresent++; continue; }
      try {
        await writeRecord(d2.rec);
        existing.push(d2.rec);
        out.imported++;
      } catch (e) {
        out.writeFailed++;
        out.failed = true;
        if (!out.writeError) out.writeError = "Store write failed: " + (e && e.message ? e.message : String(e));
        out.rejected.push({ id: d2.rec.id, reasons: ["Store write failed: " + (e && e.message ? e.message : String(e))] });
      }
    }
    out.registrations = ensureEntityRegistrations(batch);
    try { await syncEntityMeta(batch, existing); } catch (e) {}
    return out;
  }

  function db() {
    return global.CockpitDB || null;
  }

  // Read the store WITHOUT swallowing a read failure (Fix-up #3,
  // defect B). CryptoWorld.getAllRecords() catches read errors and
  // returns [] — an unreadable store then looks exactly like an empty
  // one, and the Batch B gate evaluated against that phantom-empty
  // snapshot reports the misleading "356 records failed the
  // parent-integrity gate" (the live v37 symptom). CockpitDB.getAll
  // propagates the rejection, so it is the read path here; a failure
  // now throws to the caller, which records it instead of validating
  // against []. Falls back to CryptoWorld.getAllRecords only when
  // CockpitDB is not available at all.
  function readStore() {
    var d = db();
    if (d && typeof d.getAll === "function") return d.getAll("cryptoWorld");
    var CW = global.CryptoWorld;
    if (CW && typeof CW.getAllRecords === "function") return CW.getAllRecords();
    return Promise.resolve([]);
  }

  function writeRecord(rec) {
    var d = db();
    if (!d || typeof d.put !== "function") return Promise.reject(new Error("CockpitDB.put is not available."));
    return d.put("cryptoWorld", rec);
  }

  // Recompute the taxonomy metadata from the store. The imported count is
  // the number of canonical-60 Major Activity records actually present —
  // never a hand-typed number. Status becomes TAXONOMY_IMPORTED only when
  // all 60 are present; otherwise it stays TAXONOMY_IMPORT_PENDING. Writes
  // only when something changed, so re-running is a no-op. Never writes Way
  // records and never touches any other record.
  async function syncTaxonomyMeta() {
    var d = db();
    if (!d || typeof d.getAll !== "function" || typeof d.put !== "function") return;
    var records;
    try { records = await readStore(); } catch (e) { return; }
    var count = 0;
    var meta = null;
    records.forEach(function (r) {
      if (r && r.id === "taxonomy-meta") meta = r;
      if (r && r.level === "MAJOR_ACTIVITY" && r.canonicalSet === "canonical-60") count++;
    });
    var next = {
      id: "taxonomy-meta", registry: "taxonomy",
      expectedCategoryCount: 60, importedCategoryCount: count,
      status: count === 60 ? "TAXONOMY_IMPORTED" : "TAXONOMY_IMPORT_PENDING"
    };
    if (meta && meta.expectedCategoryCount === 60 && meta.importedCategoryCount === count && meta.status === next.status) return;
    try { await d.put("cryptoWorld", next); } catch (e) {}
  }

  // Import one batch. Never throws for bad records: they land in rejected.
  // Batch B batches (kind "batch-b") take the two-phase gate path
  // (validate-all-first, zero writes on any failure) instead of the
  // per-record skip-and-report loop used by Batch A / canonical-60.
  async function importBatch(batch) {
    var out = { batch: batch.batch, label: batch.label || batch.batch,
      total: batch.records.length, imported: 0, alreadyPresent: 0, corrected: 0, rejected: [],
      failed: false, readError: null, writeFailed: 0, writeError: null, error: null };
    var existing;
    try {
      existing = await readStore();
    } catch (e) {
      // The store could not be read: fail this batch WITHOUT evaluating
      // any gate against a phantom-empty snapshot and WITHOUT attempting
      // blind writes. Nothing here may claim the Batch B gate failed (or
      // that the store is empty) when the store was never observed. The
      // next importAll run (next boot / next visit) retries from scratch
      // and self-heals once the store is readable again.
      out.failed = true;
      out.readError = e && e.message ? e.message : String(e);
      return out;
    }
    var CW = global.CryptoWorld;
    if (batch.kind === "batch-b") {
      return importBatchB(batch, existing, out);
    }
    if (batch.kind === "entity") {
      return importEntityBatch(batch, existing, out);
    }
    // Owner-approved corrections land on already-imported records here.
    // (Skipped for the batch-b branch so a blocked Batch B candidate
    // performs zero writes of any kind.)
    try { out.corrected = await applyCorrections(existing); } catch (e) { out.corrected = 0; }
    for (var i = 0; i < batch.records.length; i++) {
      var rec = batch.records[i];
      var errors = checkBatchRecord(batch, rec, existing);
      if (errors.length) {
        out.rejected.push({ id: rec && rec.id ? rec.id : "(no id)", reasons: errors });
        continue;
      }
      var present = CW && typeof CW.getEntry === "function"
        ? CW.getEntry(existing, rec.id)
        : null;
      if (present) { out.alreadyPresent++; continue; }
      try {
        await writeRecord(rec);
        existing.push(rec);
        out.imported++;
      } catch (e) {
        // A write failure is NOT a validation rejection: the record was
        // valid, the store could not take it. Count it separately so the
        // summary (and the screen) can say the store could not be
        // written instead of silently reporting empty registries.
        out.writeFailed++;
        out.failed = true;
        if (!out.writeError) out.writeError = "Store write failed: " + (e && e.message ? e.message : String(e));
        out.rejected.push({ id: rec.id, reasons: ["Store write failed: " + (e && e.message ? e.message : String(e))] });
      }
    }
    return out;
  }

  // One import run. Never rejects for bad records or a bad store: the
  // failure is carried on the summary (failed / readFailed /
  // writeFailed / error) so every caller — including the fire-and-forget
  // boot call, whose return value is otherwise ignored — can be reported
  // by a visible surface. A batch that throws unexpectedly must not
  // abort the remaining batches: it is recorded as failed and the run
  // continues, so a failure in Batch A can never silently skip the
  // canonical 60 or Batch B. The Batch B gate itself is unchanged: a
  // genuine gate block (blocked, no read/write failure behind it) is
  // still a gate verdict, not an import failure. But when Batch B is
  // blocked BECAUSE an earlier batch failed to land its parents, the
  // summary says so explicitly — the 356-style block in that case is a
  // consequence of the failed import, not a problem with the Batch B data.
  async function runImportAll() {
    var summary = { imported: 0, alreadyPresent: 0, corrected: 0, rejected: [], batches: [],
      failed: false, readFailed: false, writeFailed: 0, error: null };
    try {
      var list = batches();
      for (var i = 0; i < list.length; i++) {
        var one;
        try {
          one = await importBatch(list[i]);
        } catch (e) {
          one = { batch: list[i].batch, label: list[i].label || list[i].batch,
            total: (list[i].records || []).length, imported: 0, alreadyPresent: 0, corrected: 0, rejected: [],
            failed: true, readError: null, writeFailed: 0, writeError: null,
            error: "Import failed: " + (e && e.message ? e.message : String(e)) };
        }
        summary.batches.push(one);
        summary.imported += one.imported;
        summary.alreadyPresent += one.alreadyPresent;
        summary.corrected += one.corrected || 0;
        summary.rejected = summary.rejected.concat(one.rejected);
        if (one.readError) summary.readFailed = true;
        summary.writeFailed += one.writeFailed || 0;
        if (one.failed) summary.failed = true;
      }
      try { await syncTaxonomyMeta(); } catch (e) {}
      try { await syncBatchBMeta(); } catch (e) {}
      for (var e = 0; e < list.length; e++) {
        if (list[e].kind === "entity") {
          try { await syncEntityMeta(list[e]); } catch (err) {}
        }
      }
    } catch (e) {
      summary.failed = true;
      summary.error = "Import failed: " + (e && e.message ? e.message : String(e));
      return summary;
    }
    if (summary.failed) {
      var parts = [];
      summary.batches.forEach(function (b) {
        if (b.readError) {
          parts.push(b.label + ": could not read the local store (" + b.readError + ").");
        } else if (b.writeFailed) {
          parts.push(b.label + ": " + b.writeFailed + " record(s) could not be written to the local store (" + (b.writeError || "store write failed") + ").");
        } else if (b.failed && b.error) {
          parts.push(b.label + ": " + b.error);
        }
      });
      var bBlocked = summary.batches.some(function (b) { return b.blocked; });
      var earlierFailed = summary.batches.some(function (b, idx) {
        return b.failed && summary.batches.slice(idx + 1).some(function (later) { return later.blocked; });
      });
      if (bBlocked && earlierFailed) {
        parts.push("Batch B was blocked as a consequence of the failed import — its parent records were never written, so the parent-integrity gate could not pass. This is not a problem with the Batch B data.");
      }
      summary.error = parts.join(" ");
    }
    return summary;
  }

  function importAll() {
    if (importAllInFlight) return importAllInFlight;
    importAllInFlight = runImportAll();
    importAllInFlight.then(clearInFlight, clearInFlight);
    return importAllInFlight;
  }

  // Live report for the encyclopedia panel: no writes, derived from the
  // batch data plus the current store contents.
  async function report() {
    var existing;
    var storeError = null;
    try {
      existing = await readStore();
    } catch (e) {
      // The store could not be read: report THAT, not a gate verdict.
      // Deriving "Batch B blocked: 356" from an unread store was the
      // live v37 misdiagnosis — the gate never saw the store at all.
      storeError = e && e.message ? e.message : String(e);
      var failed = batches().map(function (batch) {
        return { batch: batch.batch, label: batch.label || batch.batch,
          total: batch.records.length, imported: 0, pending: 0, rejected: [],
          correctionsPending: 0, blocked: false, storeReadFailed: true, storeError: storeError };
      });
      failed.storeReadFailed = true;
      failed.storeError = storeError;
      return failed;
    }
    var CW = global.CryptoWorld;
    return batches().map(function (batch) {
      var rep = { batch: batch.batch, label: batch.label || batch.batch,
        total: batch.records.length, imported: 0, pending: 0, rejected: [],
        correctionsPending: pendingCorrections(existing) };
      if (batch.kind === "batch-b") {
        var dispositions = validateBatchB(batch, existing);
        dispositions.forEach(function (d) {
          if (d.errors.length) {
            rep.rejected.push({ id: d.rec && d.rec.id ? d.rec.id : "(no id)", reasons: d.errors });
          } else if (d.alreadyPresent) {
            rep.imported++;
          } else {
            rep.pending++;
          }
        });
        if (rep.rejected.length) {
          rep.blocked = true;
          rep.blockReason = "Batch B import blocked: " + rep.rejected.length + " record(s) failed the parent-integrity gate.";
        }
        return rep;
      }
      if (batch.kind === "entity") {
        var echeck = validateEntityBatch(batch, existing);
        echeck.dispositions.forEach(function (d) {
          if (d.errors.length) {
            rep.rejected.push({ id: d.rec && d.rec.id ? d.rec.id : "(no id)", reasons: d.errors });
          } else if (d.alreadyPresent) {
            rep.imported++;
          } else {
            rep.pending++;
          }
        });
        echeck.moduleErrors.forEach(function (m) {
          rep.rejected.push({ id: m.id, reasons: m.reasons });
        });
        if (rep.rejected.length) {
          rep.blocked = true;
          rep.blockReason = "Entity import blocked: " + rep.rejected.length + " record(s) failed the entity gate.";
        }
        if (!entityBatchEnabled(batch)) rep.disabled = true;
        return rep;
      }
      batch.records.forEach(function (rec) {
        var errors = checkBatchRecord(batch, rec, existing);
        if (errors.length) {
          rep.rejected.push({ id: rec && rec.id ? rec.id : "(no id)", reasons: errors });
          return;
        }
        var present = CW && typeof CW.getEntry === "function"
          ? CW.getEntry(existing, rec.id)
          : null;
        if (present) rep.imported++; else rep.pending++;
      });
      return rep;
    });
  }

  global.EncyclopediaImport = {
    GLOBE_VIEWS: GLOBE_VIEWS,
    CORRECTIONS: CORRECTIONS,
    batches: batches,
    checkBatchRecord: checkBatchRecord,
    checkBatchBRecord: checkBatchBRecord,
    buildBatchBIndex: buildBatchBIndex,
    validateBatchB: validateBatchB,
    applyCorrections: applyCorrections,
    importBatch: importBatch,
    importAll: importAll,
    report: report,
    syncTaxonomyMeta: syncTaxonomyMeta,
    syncBatchBMeta: syncBatchBMeta,
    validateEntityBatch: validateEntityBatch,
    ensureEntityRegistrations: ensureEntityRegistrations,
    syncEntityMeta: syncEntityMeta,
    entityImportEnabled: function (batch) { return entityBatchEnabled(batch || "entity-batch-1"); },
    enableOwnerFrozenBatch: enableOwnerFrozenBatch
  };
})(window);
