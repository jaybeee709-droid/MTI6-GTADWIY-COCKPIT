/* MTI6-GTADWIY-COCKPIT — Encyclopedia content import loader (Import 1)
 * Loads approved batch data files into the existing cryptoWorld store.
 * Every record passes through the UNCHANGED CryptoWorld.validateEntry
 * first, plus the loader's own batch-contract checks (family level,
 * family set, workspace, Globe view, import batch, UNVERIFIED status with
 * canonical-import provenance). A record that fails any check is NOT
 * written and is listed in the import report with its reasons — the
 * validator is never weakened to populate the UI. Loading is idempotent:
 * a record already in the store is counted as already present and is not
 * rewritten, so re-running an import (boot, revisit, or a second device
 * sync) never duplicates entries. No new IndexedDB store, no migration,
 * no new localStorage key, no network calls, no wallet code. The report
 * is derived live from the batch data plus the store, so it is always
 * truthful about imported / pending / rejected counts.
 * Analytics is untouched by this loader.
 */
(function (global) {
  "use strict";

  var GLOBE_VIEWS = ["MARKET", "YIELD", "NETWORK", "ECONOMY", "MY_COCKPIT"];

  function batches() {
    var list = [];
    if (global.EncyclopediaBatchA) list.push(global.EncyclopediaBatchA);
    return list;
  }

  // Loader-level batch-contract checks for a Batch A family record.
  // These sit ON TOP OF validateEntry; they never replace or relax it.
  function checkBatchRecord(batch, rec) {
    var errors = [];
    var CW = global.CryptoWorld;
    if (CW && typeof CW.validateEntry === "function") {
      errors = errors.concat(CW.validateEntry(rec));
    } else {
      errors.push("CryptoWorld.validateEntry is not available.");
    }
    if (!rec || typeof rec !== "object") return errors;
    if (rec.registry !== "activities") errors.push("Batch A records must use registry \"activities\".");
    if (rec.level !== "FAMILY") errors.push("Batch A records must carry level \"FAMILY\".");
    if (rec.familySet !== batch.familySet) errors.push("Batch A records must carry familySet \"" + batch.familySet + "\".");
    if (typeof rec.workspace !== "string" || !rec.workspace.trim()) {
      errors.push("Batch A records must name a primary workspace.");
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
      var errors = checkBatchRecord(batch, rec);
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
        var errors = checkBatchRecord(batch, rec);
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
    report: report
  };
})(window);
