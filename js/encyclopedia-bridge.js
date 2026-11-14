/* MTI6-GTADWIY-COCKPIT — STAR ↔ Encyclopedia Knowledge Bridge (overnight shift, Nov 13, 2026)
 * Structural retrieval only: STAR asks about the Crypto World encyclopedia
 * and this bridge answers from the canonical records — never from a guess.
 *
 * Hierarchy (locked): Family → Major Activity → Type → Strategy/Variant.
 * There are NO Actions or Sub-actions in the encyclopedia; childrenOf says
 * so plainly instead of inventing them.
 *
 * Data sources, in order: (1) the live IndexedDB cryptoWorld store via
 * CryptoWorld.getAllRecords (async), (2) the in-memory batch data files
 * (EncyclopediaBatchA / EncyclopediaCanonical60 / EncyclopediaBatchB,
 * sync). Every result reports which source was used. If neither is
 * available, results are honest NOT_CONNECTED / UNKNOWN — never a throw,
 * never an invented record.
 *
 * Verification is NEVER upgraded here: every imported record carries
 * verificationStatus UNVERIFIED, and verificationOf reports exactly that.
 * Imported is not verified.
 *
 * INFORMATIONAL never implies TRANSACTIONAL: isInformational(record) is
 * true unless CryptoWorld.isTransactionalCapability(record) is true, and
 * that requires registry "capability" + mode TRANSACTIONAL + VERIFIED.
 * Imported encyclopedia records are activities-registry records, so for
 * them the answer is always: "informational — no transactional capability
 * on record." Nothing here is executable, and nothing here claims it is.
 *
 * No DOM, no network, no secrets. Does not depend on js/truth.js or
 * js/star-command.js (concurrent overnight work) — CryptoWorld is the
 * only optional peer, always behind a typeof guard.
 */
(function (global) {
  "use strict";

  var NO_ACTIONS_NOTE = "No Actions or Sub-actions exist under a Strategy in the encyclopedia — the hierarchy stops at Strategy/Variant.";
  var NO_MATCH_TEXT = "No entry in the encyclopedia matches that — nothing is recorded, not a guess.";

  var cachedRecords = null;
  var cachedSource = "none";

  function hasCryptoWorld() {
    return typeof global.CryptoWorld !== "undefined" && global.CryptoWorld;
  }

  // Merge the three in-memory batch data files, dedupe by id, first wins
  // (Batch A families first, then the canonical 60, then Batch B).
  function batchData() {
    var records = [];
    var seen = {};
    var batches = [global.EncyclopediaBatchA, global.EncyclopediaCanonical60, global.EncyclopediaBatchB];
    batches.forEach(function (b) {
      if (!b || !Array.isArray(b.records)) return;
      b.records.forEach(function (r) {
        if (!r || typeof r.id !== "string" || seen[r.id]) return;
        seen[r.id] = true;
        records.push(r);
      });
    });
    return { records: records, source: records.length ? "batch-data" : "none" };
  }

  // Best synchronously available records: a prior loadRecords() result
  // (which may have come from the store), else the batch data files.
  // The live store cannot be read synchronously, so sync callers use the
  // batch data until loadRecords() has primed the cache from the store.
  function syncRecords() {
    if (cachedRecords) return { records: cachedRecords, source: cachedSource };
    return batchData();
  }

  // Async load. Prefers the store when it has records; falls back to the
  // batch data files when the store cannot be read or is empty; reports
  // "none" when neither is available. Never throws.
  function loadRecords() {
    var CW = hasCryptoWorld() ? global.CryptoWorld : null;
    if (CW && typeof CW.getAllRecords === "function") {
      try {
        return CW.getAllRecords().then(function (records) {
          records = Array.isArray(records) ? records : [];
          if (records.length) {
            cachedRecords = records;
            cachedSource = "store";
            return { records: records, source: "store" };
          }
          var b = batchData();
          cachedRecords = b.records;
          cachedSource = b.source;
          return { records: b.records, source: b.source };
        }).catch(function () {
          var b2 = batchData();
          cachedRecords = b2.records;
          cachedSource = b2.source;
          return { records: b2.records, source: b2.source };
        });
      } catch (e) {
        var b3 = batchData();
        cachedRecords = b3.records;
        cachedSource = b3.source;
        return Promise.resolve({ records: b3.records, source: b3.source });
      }
    }
    var b = batchData();
    cachedRecords = b.records;
    cachedSource = b.source;
    return Promise.resolve({ records: b.records, source: b.source });
  }

  function findRecord(records, id) {
    var found = null;
    (records || []).forEach(function (r) { if (r && r.id === id) found = r; });
    return found;
  }

  function getRecord(id) {
    var data = syncRecords();
    return findRecord(data.records, id);
  }

  function recordSourceLabel(rec) {
    if (!rec) return "none";
    var label = rec.source || "canonical-import";
    if (rec.importBatch) label += " (" + rec.importBatch + ")";
    return label;
  }

  function cite(rec) {
    if (!rec) return "(no record)";
    return "“" + rec.title + "” (" + (rec.level || "no level") + ", " +
      (rec.verificationStatus || "UNKNOWN") + ", source: " + recordSourceLabel(rec) + ")";
  }

  // ---- Structural navigation -------------------------------------------

  // The Batch A family record(s) for a Major Activity, via primaryFamily
  // + relatedFamilies. Family name comes from the family record's title.
  function familyOf(majorId) {
    var data = syncRecords();
    var major = findRecord(data.records, majorId);
    var families = [];
    var note = "";
    if (!major) {
      note = "No entry in the encyclopedia matches id “" + majorId + "” — nothing is recorded, not a guess.";
    } else if (major.level !== "MAJOR_ACTIVITY") {
      note = "“" + major.title + "” is a " + (major.level || "record") + ", not a Major Activity, so it has no family of its own.";
    } else {
      var ids = [];
      if (major.primaryFamily) ids.push(major.primaryFamily);
      (major.relatedFamilies || []).forEach(function (f) { if (ids.indexOf(f) === -1) ids.push(f); });
      ids.forEach(function (fid) {
        var fam = findRecord(data.records, fid);
        families.push(fam || { id: fid, title: "UNKNOWN — family not in the loaded encyclopedia", level: "FAMILY", verificationStatus: "UNKNOWN", source: "none" });
      });
      if (!families.length) note = "“" + major.title + "” names no family in the loaded encyclopedia.";
    }
    return { majorId: majorId, major: major, families: families, source: data.source, note: note };
  }

  // All TYPE records whose parentRef === majorId.
  function typesUnder(majorId) {
    var data = syncRecords();
    var major = findRecord(data.records, majorId);
    var types = data.records.filter(function (r) {
      return r && r.level === "TYPE" && r.parentRef === majorId;
    });
    var note = "";
    if (!major) note = "No entry in the encyclopedia matches id “" + majorId + "” — nothing is recorded, not a guess.";
    else if (major.level !== "MAJOR_ACTIVITY") note = "“" + major.title + "” is a " + (major.level || "record") + ", not a Major Activity, so no Types belong under it.";
    else if (!types.length) note = "No Types are recorded under “" + major.title + "” — nothing is recorded, not a guess.";
    return { majorId: majorId, major: major, types: types, source: data.source, note: note };
  }

  // All STRATEGY records whose parentRef === typeId.
  function strategiesUnder(typeId) {
    var data = syncRecords();
    var type = findRecord(data.records, typeId);
    var strategies = data.records.filter(function (r) {
      return r && r.level === "STRATEGY" && r.parentRef === typeId;
    });
    var note = "";
    if (!type) note = "No entry in the encyclopedia matches id “" + typeId + "” — nothing is recorded, not a guess.";
    else if (type.level !== "TYPE") note = "“" + type.title + "” is a " + (type.level || "record") + ", not a Type, so no Strategies belong under it.";
    else if (!strategies.length) note = "No Strategies are recorded under “" + type.title + "” — nothing is recorded, not a guess.";
    return { typeId: typeId, type: type, strategies: strategies, source: data.source, note: note };
  }

  // Major Activities recorded under a Family (primaryFamily or
  // relatedFamilies names the family id).
  function majorsUnder(familyId) {
    var data = syncRecords();
    var family = findRecord(data.records, familyId);
    var majors = data.records.filter(function (r) {
      if (!r || r.level !== "MAJOR_ACTIVITY") return false;
      if (r.primaryFamily === familyId) return true;
      return (r.relatedFamilies || []).indexOf(familyId) !== -1;
    });
    return { familyId: familyId, family: family, majors: majors, source: data.source };
  }

  // Types under a Major Activity, Strategies under a Type, Major
  // Activities under a Family, [] for anything else — including every
  // Strategy, because no Actions or Sub-actions exist.
  function childrenOf(id) {
    var data = syncRecords();
    var rec = findRecord(data.records, id);
    if (!rec) {
      return { id: id, record: null, children: [], source: data.source,
        note: "No entry in the encyclopedia matches id “" + id + "” — nothing is recorded, not a guess." };
    }
    if (rec.level === "FAMILY") {
      var m = majorsUnder(id);
      return { id: id, record: rec, children: m.majors, source: data.source,
        note: m.majors.length ? "" : "No Major Activities are recorded under family “" + rec.title + "”." };
    }
    if (rec.level === "MAJOR_ACTIVITY") {
      var t = typesUnder(id);
      return { id: id, record: rec, children: t.types, source: data.source, note: t.note };
    }
    if (rec.level === "TYPE") {
      var s = strategiesUnder(id);
      return { id: id, record: rec, children: s.strategies, source: data.source, note: s.note };
    }
    return { id: id, record: rec, children: [], source: data.source, note: NO_ACTIONS_NOTE };
  }

  // Related records: CryptoWorld.relatedEntries when possible (it follows
  // id-based refs), plus the record's parent, siblings, children, and
  // relatedActivities targets from the same data. Never invents a link.
  function relatedRecords(id) {
    var data = syncRecords();
    var rec = findRecord(data.records, id);
    if (!rec) {
      return { id: id, record: null, related: [], source: data.source,
        note: "No entry in the encyclopedia matches id “" + id + "” — nothing is recorded, not a guess." };
    }
    var out = [];
    var seen = {};
    function add(r) {
      if (r && r.id && r.id !== id && !seen[r.id]) { seen[r.id] = true; out.push(r); }
    }
    var CW = hasCryptoWorld() ? global.CryptoWorld : null;
    if (CW && typeof CW.relatedEntries === "function") {
      try { CW.relatedEntries(data.records, rec).forEach(add); } catch (e) {}
    }
    if (rec.parentRef) add(findRecord(data.records, rec.parentRef));
    (rec.relatedActivities || []).forEach(function (target) { add(findRecord(data.records, target)); });
    if (rec.parentRef) {
      data.records.forEach(function (r) {
        if (r && r.parentRef === rec.parentRef) add(r);
      });
    }
    data.records.forEach(function (r) {
      if (r && r.parentRef === id) add(r);
    });
    return { id: id, record: rec, related: out, source: data.source,
      note: out.length ? "" : "No related entries are recorded for “" + rec.title + "” — nothing is recorded, not a guess." };
  }

  // ---- Verification, risks, informational ------------------------------

  // The record's real verificationStatus — never upgraded. All imported
  // records are UNVERIFIED; imported is not verified.
  function verificationOf(id) {
    var data = syncRecords();
    var rec = findRecord(data.records, id);
    if (!rec) {
      return { id: id, title: null, status: "UNKNOWN", source: "none",
        lastChecked: null, found: false,
        note: "No entry in the encyclopedia matches id “" + id + "” — nothing is recorded, not a guess." };
    }
    return { id: id, title: rec.title, status: rec.verificationStatus || "UNKNOWN",
      source: rec.source || "canonical-import", lastChecked: rec.lastChecked || null,
      found: true, note: "" };
  }

  // Risks records whose appliesTo includes id, plus the record itself
  // when it carries a THREAT/DEFENSE classification with a threatKind.
  // Empty is an honest empty: no risks records are associated.
  function risksFor(id) {
    var data = syncRecords();
    var rec = findRecord(data.records, id);
    var risks = [];
    var CW = hasCryptoWorld() ? global.CryptoWorld : null;
    if (CW && typeof CW.risksBySubject === "function") {
      try { risks = CW.risksBySubject(data.records, id) || []; } catch (e) { risks = []; }
    } else {
      risks = data.records.filter(function (r) {
        return r && r.registry === "risks" && (r.appliesTo || []).indexOf(id) !== -1;
      });
    }
    if (rec && (rec.classification === "THREAT" || rec.classification === "DEFENSE")) {
      var already = false;
      risks.forEach(function (r) { if (r.id === rec.id) already = true; });
      if (!already) risks = risks.concat([rec]);
    }
    return { id: id, record: rec, risks: risks, source: data.source,
      note: risks.length ? "" : "No risks records are associated with “" + (rec ? rec.title : id) + "” in the loaded encyclopedia." };
  }

  // True unless the record IS a verified transactional capability:
  // registry "capability" + mode TRANSACTIONAL + VERIFIED. Imported
  // encyclopedia records are activities-registry records, so this is
  // false for them — they are informational, never executable.
  function isInformational(record) {
    if (!record) return true;
    var CW = hasCryptoWorld() ? global.CryptoWorld : null;
    if (CW && typeof CW.isTransactionalCapability === "function") {
      try { return !CW.isTransactionalCapability(record); } catch (e) { return true; }
    }
    return !(record.registry === "capability" && record.mode === "TRANSACTIONAL" &&
      record.verificationStatus === "VERIFIED");
  }

  function informationalNote(record) {
    if (isInformational(record)) {
      return "informational — no transactional capability on record.";
    }
    return "recorded as a VERIFIED TRANSACTIONAL capability — execution still requires explicit owner approval, and this bridge never executes anything.";
  }

  // ---- Local search -----------------------------------------------------

  // Local substring search over title / aliases / definition. Title
  // matches first, then aliases, then definition. Up to 10 results.
  function searchEncyclopedia(query) {
    return loadRecords().then(function (data) {
      var q = String(query || "").trim().toLowerCase();
      if (!q) return [];
      var scored = [];
      data.records.forEach(function (r) {
        if (!r || typeof r.title !== "string") return;
        var title = r.title.toLowerCase();
        var aliases = (r.aliases || []).join(" ").toLowerCase();
        var def = String(r.definition || "").toLowerCase();
        var score = -1;
        if (title.indexOf(q) !== -1) score = 3;
        else if (aliases.indexOf(q) !== -1) score = 2;
        else if (def.indexOf(q) !== -1) score = 1;
        if (score >= 0) scored.push({ score: score, rec: r });
      });
      scored.sort(function (a, b) { return b.score - a.score; });
      return scored.slice(0, 10).map(function (s) {
        return { id: s.rec.id, title: s.rec.title, level: s.rec.level,
          registry: s.rec.registry, verificationStatus: s.rec.verificationStatus || "UNKNOWN" };
      });
    });
  }

  // ---- Structural question answering -----------------------------------

  var STOP_WORDS = ["what", "which", "who", "is", "are", "does", "do", "the",
    "a", "an", "for", "of", "under", "belong", "belongs", "belonging", "to",
    "associated", "with", "in", "contains", "contain", "contained", "holds",
    "there", "any", "about", "tell", "me", "show", "list", "give", "find",
    "on", "from", "vs", "or", "and", "its", "it"];

  function detectIntent(lower) {
    if (/\b(informational|executable|execute)\b/.test(lower)) return "informational";
    if (/\brisk/.test(lower)) return "risks";
    if (/\bverif/.test(lower)) return "verification";
    if (/\brelated\b/.test(lower)) return "related";
    if (/\bfamil/.test(lower)) return "family";
    if (/\bstrateg/.test(lower)) return "strategies";
    if (/\btype\b|\btypes\b/.test(lower)) return "types";
    return "describe";
  }

  function extractSubject(question, intent) {
    var words = String(question || "").toLowerCase().replace(/[^a-z0-9\- ]/g, " ").split(/\s+/);
    var intentWords = [];
    if (intent === "family") intentWords = ["family", "families"];
    else if (intent === "types") intentWords = ["type", "types"];
    else if (intent === "strategies") intentWords = ["strategy", "strategies"];
    else if (intent === "related") intentWords = ["related"];
    else if (intent === "verification") intentWords = ["verified", "unverified", "verification", "verify"];
    else if (intent === "risks") intentWords = ["risk", "risks"];
    else if (intent === "informational") intentWords = ["informational", "executable", "execute"];
    var kept = words.filter(function (w) {
      return w && STOP_WORDS.indexOf(w) === -1 && intentWords.indexOf(w) === -1;
    });
    return kept.join(" ").trim();
  }

  function findSubject(subject, preferredLevels) {
    var data = syncRecords();
    var q = String(subject || "").trim().toLowerCase();
    if (!q) return null;
    var exact = null, sub = null;
    function levelRank(r) {
      var i = (preferredLevels || []).indexOf(r.level);
      return i === -1 ? 99 : i;
    }
    data.records.forEach(function (r) {
      if (!r || typeof r.title !== "string") return;
      if (r.id === q || r.title.toLowerCase() === q ||
          (r.aliases || []).some(function (a) { return String(a).toLowerCase() === q; })) {
        if (!exact || levelRank(r) < levelRank(exact)) exact = r;
      }
    });
    if (exact) return exact;
    data.records.forEach(function (r) {
      if (!r || typeof r.title !== "string") return;
      var titleHit = r.title.toLowerCase().indexOf(q) !== -1;
      var aliasHit = (r.aliases || []).some(function (a) { return String(a).toLowerCase().indexOf(q) !== -1; });
      if (titleHit || aliasHit) {
        if (!sub || levelRank(r) < levelRank(sub)) sub = r;
      }
    });
    return sub;
  }

  // Text answer for a structural question. Returns a Promise resolving to
  // {text, found, recordIds, source}. Cites record title, level,
  // verification status, and source; says plainly when nothing matches.
  function answerStructural(question) {
    return loadRecords().then(function (data) {
      var q = String(question || "").trim();
      var lower = q.toLowerCase();
      var intent = detectIntent(lower);
      var subject = extractSubject(q, intent);
      var preferred = intent === "types" ? ["MAJOR_ACTIVITY", "FAMILY"] :
        intent === "strategies" ? ["TYPE", "MAJOR_ACTIVITY"] :
        intent === "family" ? ["MAJOR_ACTIVITY", "TYPE", "STRATEGY"] : [];
      var rec = findSubject(subject, preferred);
      if (!rec) {
        return { text: NO_MATCH_TEXT, found: false, recordIds: [], source: data.source };
      }
      var ids = [rec.id];
      var lines = [];
      if (intent === "family") {
        if (rec.level === "FAMILY") {
          lines.push(cite(rec) + " is itself a family.");
        } else {
          var major = rec;
          if (rec.level === "TYPE" || rec.level === "STRATEGY") {
            var parent = rec.parentRef ? findRecord(data.records, rec.parentRef) : null;
            if (parent && parent.level === "TYPE") parent = parent.parentRef ? findRecord(data.records, parent.parentRef) : null;
            if (parent && parent.level === "MAJOR_ACTIVITY") major = parent;
          }
          var fam = familyOf(major.id);
          fam.families.forEach(function (f) { ids.push(f.id); });
          if (fam.families.length) {
            lines.push(cite(major) + " belongs to family " + fam.families.map(function (f) { return "“" + f.title + "”"; }).join(", ") + ".");
          } else {
            lines.push(cite(major) + " names no family in the loaded encyclopedia.");
          }
          if (major.id !== rec.id) lines.push("Asked about " + cite(rec) + "; walked up to its Major Activity.");
        }
      } else if (intent === "types") {
        if (rec.level === "MAJOR_ACTIVITY") {
          var t = typesUnder(rec.id);
          t.types.forEach(function (x) { ids.push(x.id); });
          lines.push(cite(rec) + " has " + t.types.length + " recorded Type(s): " +
            (t.types.length ? t.types.map(function (x) { return "“" + x.title + "”"; }).join(", ") : "none recorded."));
        } else if (rec.level === "FAMILY") {
          var m = majorsUnder(rec.id);
          m.majors.forEach(function (x) { ids.push(x.id); });
          lines.push(cite(rec) + " contains " + m.majors.length + " recorded Major Activit(ies): " +
            (m.majors.length ? m.majors.map(function (x) { return "“" + x.title + "”"; }).join(", ") : "none recorded."));
        } else if (rec.level === "TYPE") {
          lines.push(cite(rec) + " is itself a Type, under Major Activity “" +
            (findRecord(data.records, rec.parentRef) || {}).title + "”. Types belong under Major Activities, not under Types.");
        } else {
          lines.push(cite(rec) + " is a Strategy. Types belong under Major Activities, not under Strategies.");
        }
      } else if (intent === "strategies") {
        if (rec.level === "TYPE") {
          var s = strategiesUnder(rec.id);
          s.strategies.forEach(function (x) { ids.push(x.id); });
          lines.push(cite(rec) + " has " + s.strategies.length + " recorded Strategie(s): " +
            (s.strategies.length ? s.strategies.map(function (x) { return "“" + x.title + "”"; }).join(", ") : "none recorded."));
        } else if (rec.level === "MAJOR_ACTIVITY") {
          var t2 = typesUnder(rec.id);
          lines.push(cite(rec) + " is a Major Activity. Strategies belong under its Types (" +
            t2.types.map(function (x) { return "“" + x.title + "”"; }).join(", ") + "), not directly under the Major Activity.");
        } else if (rec.level === "STRATEGY") {
          lines.push(cite(rec) + " is itself a Strategy, under Type “" +
            (findRecord(data.records, rec.parentRef) || {}).title + "”.");
        } else {
          lines.push(cite(rec) + " is a Family. Strategies belong under Types, under Major Activities.");
        }
      } else if (intent === "related") {
        var rel = relatedRecords(rec.id);
        rel.related.forEach(function (x) { ids.push(x.id); });
        lines.push(cite(rec) + " is related to " + rel.related.length + " recorded entr(ies): " +
          (rel.related.length ? rel.related.map(function (x) { return "“" + x.title + "” (" + (x.level || "?") + ")"; }).join(", ") : "none recorded."));
      } else if (intent === "verification") {
        var v = verificationOf(rec.id);
        lines.push(cite(rec) + " is " + v.status + ".");
        lines.push("Imported is not verified: every imported encyclopedia record is UNVERIFIED until it meets the verification requirements.");
      } else if (intent === "risks") {
        var rk = risksFor(rec.id);
        rk.risks.forEach(function (x) { ids.push(x.id); });
        if (rk.risks.length) {
          lines.push(cite(rec) + " has " + rk.risks.length + " associated risk record(s): " +
            rk.risks.map(function (x) { return "“" + x.title + "”" + (x.threatKind ? " (" + x.threatKind + ")" : ""); }).join(", ") + ".");
        } else {
          lines.push(cite(rec) + " has no risks records associated with it in the loaded encyclopedia.");
        }
      } else if (intent === "informational") {
        lines.push(cite(rec) + " is " + informationalNote(rec));
      } else {
        lines.push(cite(rec) + ".");
        if (rec.definition) lines.push(String(rec.definition).slice(0, 300));
        lines.push("It is " + informationalNote(rec));
      }
      lines.push("Data source: " + data.source + ".");
      return { text: lines.join("\n"), found: true, recordIds: ids, source: data.source };
    }).catch(function () {
      return { text: "The encyclopedia could not be read right now — no answer is recorded, not a guess.", found: false, recordIds: [], source: "none" };
    });
  }

  global.EncyclopediaBridge = {
    loadRecords: loadRecords,
    getRecord: getRecord,
    familyOf: familyOf,
    typesUnder: typesUnder,
    strategiesUnder: strategiesUnder,
    majorsUnder: majorsUnder,
    childrenOf: childrenOf,
    relatedRecords: relatedRecords,
    verificationOf: verificationOf,
    risksFor: risksFor,
    isInformational: isInformational,
    informationalNote: informationalNote,
    searchEncyclopedia: searchEncyclopedia,
    answerStructural: answerStructural
  };
})(window);
