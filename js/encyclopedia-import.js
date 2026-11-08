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
 */
(function (global) {
  "use strict";

  var GLOBE_VIEWS = ["MARKET", "YIELD", "NETWORK", "ECONOMY", "MY_COCKPIT"];

  function batches() {
    var list = [];
    if (global.EncyclopediaBatchA) list.push(global.EncyclopediaBatchA);
    if (global.EncyclopediaCanonical60) list.push(global.EncyclopediaCanonical60);
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
  async function importBatch(batch) {
    var out = { batch: batch.batch, label: batch.label || batch.batch,
      total: batch.records.length, imported: 0, alreadyPresent: 0, rejected: [] };
    var existing;
    try {
      existing = await readStore();
    } catch (e) {
      existing = [];
    }
    var CW = global.CryptoWorld;
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
    var summary = { imported: 0, alreadyPresent: 0, rejected: [], batches: [] };
    var list = batches();
    for (var i = 0; i < list.length; i++) {
      var one = await importBatch(list[i]);
      summary.batches.push(one);
      summary.imported += one.imported;
      summary.alreadyPresent += one.alreadyPresent;
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
        total: batch.records.length, imported: 0, pending: 0, rejected: [] };
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
    batches: batches,
    checkBatchRecord: checkBatchRecord,
    importBatch: importBatch,
    importAll: importAll,
    report: report,
    syncTaxonomyMeta: syncTaxonomyMeta
  };
})(window);
