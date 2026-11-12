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
    return list;
  }

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

  // Batch B taxonomy meta (U3: approved in principle; the record is
  // created ONLY by the batch-b branch below, which never executes until
  // a Batch B batch is wired — no batch-b batch exists in this step, so
  // this helper never runs and no taxonomy-meta-batch-b record is created
  // in the live store now).
  async function syncBatchBMeta(existing) {
    var d = db();
    if (!d || typeof d.put !== "function") return;
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
        out.rejected.push({ id: d.rec.id, reasons: ["Store write failed: " + (e && e.message ? e.message : String(e))] });
      }
    }
    // Sync the Batch B meta record only when this run actually imported
    // something: an idempotent re-run (all alreadyPresent) must not
    // create or touch any record.
    if (out.imported > 0) {
      try { await syncBatchBMeta(existing); } catch (e) {}
    }
    return out;
  }

  function db() {
    return global.CockpitDB || null;
  }

  function readStore() {
    var CW = global.CryptoWorld;
    if (CW && typeof CW.getAllRecords === "function") return CW.getAllRecords();
    var d = db();
    if (d && typeof d.getAll === "function") return d.getAll("cryptoWorld");
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
      total: batch.records.length, imported: 0, alreadyPresent: 0, corrected: 0, rejected: [] };
    var existing;
    try {
      existing = await readStore();
    } catch (e) {
      existing = [];
    }
    var CW = global.CryptoWorld;
    if (batch.kind === "batch-b") {
      return importBatchB(batch, existing, out);
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
        out.rejected.push({ id: rec.id, reasons: ["Store write failed: " + (e && e.message ? e.message : String(e))] });
      }
    }
    return out;
  }

  async function importAll() {
    var summary = { imported: 0, alreadyPresent: 0, corrected: 0, rejected: [], batches: [] };
    var list = batches();
    for (var i = 0; i < list.length; i++) {
      var one = await importBatch(list[i]);
      summary.batches.push(one);
      summary.imported += one.imported;
      summary.alreadyPresent += one.alreadyPresent;
      summary.corrected += one.corrected || 0;
      summary.rejected = summary.rejected.concat(one.rejected);
    }
    try { await syncTaxonomyMeta(); } catch (e) {}
    return summary;
  }

  // Live report for the encyclopedia panel: no writes, derived from the
  // batch data plus the current store contents.
  async function report() {
    var existing;
    try {
      existing = await readStore();
    } catch (e) {
      existing = [];
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
    syncBatchBMeta: syncBatchBMeta
  };
})(window);
