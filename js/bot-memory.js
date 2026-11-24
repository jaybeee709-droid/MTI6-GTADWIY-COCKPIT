/*
 * MTI6-GTADWIY-COCKPIT — Bot Memory Engine foundation (Phase 2;
 * owner-frozen design note, files/bot-memory-engine-note.md,
 * 2026-11-15, integrated at the workforce/runtime phase per the
 * owner's sequencing).
 *
 * This is MTI6's OWN in-app memory layer — structured retention for
 * STAR, the Tribe principals and task workers. It is NOT any
 * assistant's memory of the project, and it is NOT a worker runtime:
 * workers active stays 0 / NOT_CONNECTED and nothing here executes,
 * assigns, or simulates work. The engine only RETAINS what real
 * callers hand it through record() — it invents nothing, seeds
 * nothing, and ships EMPTY. It fills only from real recorded events
 * (assignment outcomes, research evidence, gate decisions,
 * corrections, handoffs) as those systems produce them.
 *
 * CONTROLLED memory (the frozen note's non-negotiables):
 *   - Provenance on every memory: source + recordedBy + recordedAt.
 *   - Truth discipline: a memory keeps the truth state it was
 *     recorded with. Recall NEVER promotes UNVERIFIED to VERIFIED.
 *     NOTHING in this module can set VERIFIED — verification is a
 *     separate owner process that does not exist yet, so record()
 *     and correct() refuse a VERIFIED claim outright, and there is
 *     no verify/promote function at all.
 *   - SUPERSEDED is set ONLY by correct(): a correction creates a
 *     new record that supersedes the old one, linked both ways; the
 *     old record's content is preserved as history, never silently
 *     edited. STALE is never stored by hand either — freshness is
 *     DERIVED at read time from reviewAfter (isStale), so a memory
 *     ages visibly and can never hide its age behind a stored label.
 *   - Corrections and deletion are OWNER acts (the frozen note:
 *     "owner can correct or delete"), exactly as the entity gate's
 *     freeze and the Resource Engine's decisions are owner acts.
 *     STAR and workers may record() and recall(); they cannot
 *     correct() or forget().
 *   - Deletion is a TOMBSTONE: forget() removes the content
 *     (summary, subject, refs) and retains existence + provenance
 *     skeleton + the deletion reason and actor — controlled
 *     deletion, reviewable, never a silent vanish.
 *   - Dedupe: identity = kind + normalized subject + normalized
 *     summary (the pipeline's ordered identity discipline, never a
 *     name-only match). record() against an existing ACTIVE record
 *     with the same identity returns that record instead of
 *     duplicating it — including a REJECTED memory, so a rejected
 *     claim cannot be laundered back in as a fresh UNVERIFIED copy.
 *   - No remember-everything-forever: retention is deliberate —
 *     every record is written by an explicit record() call from a
 *     real caller; nothing is captured automatically.
 *   - No secret may exist in a memory: validation rejects
 *     secret-shaped keys anywhere in a record, recursively (same
 *     scan as the Resource Engine).
 *
 * Storage: records live in the existing cryptoWorld store
 * (DB_VERSION 3 — no migration, no new store) as recordKind
 * "BOT_MEMORY", registry "botmemory", excluded from every canonical
 * view at the single filter point in CryptoWorld.getAllRecords() —
 * so canonical counts (878), the World Engine graph (957/1007/0),
 * the Globe layers (11/56/0/0/0) and every Encyclopedia view are
 * byte-identical with memory records present. Memory records are
 * proposals of recollection, never canonical knowledge: they never
 * enter the Encyclopedia or the World Engine graph.
 *
 * summary() is the single read-only derivation for STAR and the Bot
 * Operations panel (EntityGate.pipelineSummary /
 * ResourceEngine.summary parity): it never writes.
 *
 * Architecture chain (frozen note): Candidate history ->
 * Knowledge/Truth layer -> Bot Memory -> STAR / Tribes / Workers ->
 * Encyclopedia / World Engine. This foundation implements the Bot
 * Memory link only; records may REFERENCE candidate/entity/record
 * ids (refs) instead of copying their content.
 */
(function (global) {
  "use strict";

  var STORE = "cryptoWorld";
  var RECORD_KIND = "BOT_MEMORY";
  var REGISTRY = "botmemory";

  var ACTOR_TYPES = ["OWNER", "STAR", "WORKER"];

  // The frozen note's retention classes.
  var KINDS = ["ASSIGNMENT_OUTCOME", "RESEARCH_EVIDENCE",
    "ENTITY_KNOWLEDGE", "CANDIDATE_DISCOVERY", "DECISION",
    "CORRECTION", "WORKER_HANDOFF"];

  // The frozen note's truth vocabulary. VERIFIED and SUPERSEDED are
  // vocabulary, not write paths: VERIFIED is set by no function in
  // this module (a separate owner verification process that does not
  // exist), SUPERSEDED only by correct(). STALE is derived from
  // reviewAfter at read time (isStale), never stored by hand.
  var TRUTH_STATES = ["VERIFIED", "UNVERIFIED", "STALE", "SUPERSEDED", "REJECTED"];
  var RECORDABLE_TRUTH_STATES = ["UNVERIFIED", "REJECTED"];

  var STATUSES = ["ACTIVE", "SUPERSEDED", "DELETED"];

  // Secret-shaped keys are rejected anywhere in a record (recursive,
  // normalized like the Resource Engine's scan). A memory may state
  // that something happened; it may never hold a credential value.
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
        out.push("Secret-shaped field is forbidden in a memory record: " + (path ? path + "." : "") + k + ". Memories record events and claims, never credential values.");
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

  function isMemory(rec) { return !!rec && rec.recordKind === RECORD_KIND; }

  // Dedupe identity: kind + normalized subject + normalized summary.
  function identityKey(kind, subject, summary) {
    return kind + "|" + normText(subject) + "|" + normText(summary);
  }
  function recordKey(rec) {
    return identityKey(rec.kind, rec.subject, rec.summary);
  }

  /* ---------------- validation ---------------- */

  function validateDraft(draft) {
    var errors = [];
    if (!draft || typeof draft !== "object") return ["Memory draft must be an object."];
    secretKeyErrors(draft, "", errors);
    if (KINDS.indexOf(draft.kind) === -1) {
      errors.push("Memory kind must be one of: " + KINDS.join(", ") + ".");
    }
    if (typeof draft.subject !== "string" || !draft.subject.trim()) {
      errors.push("Memory needs a subject (a bot/principal id or an entity/record reference).");
    }
    if (typeof draft.summary !== "string" || !draft.summary.trim()) {
      errors.push("Memory needs a summary — the claim or event being retained, in words.");
    }
    if (typeof draft.source !== "string" || !draft.source.trim()) {
      errors.push("Memory needs a provenance source (where this memory comes from — a system, a record id, an owner note).");
    }
    if (draft.truthState !== undefined && draft.truthState !== null) {
      if (draft.truthState === "VERIFIED") {
        errors.push("VERIFIED cannot be recorded: verification is a separate owner process that does not exist, and recall never promotes a memory. Record the memory as UNVERIFIED.");
      } else if (draft.truthState === "SUPERSEDED") {
        errors.push("SUPERSEDED cannot be recorded directly: it is set only by correct() when a replacement supersedes this memory.");
      } else if (draft.truthState === "STALE") {
        errors.push("STALE cannot be recorded directly: freshness is derived from reviewAfter at read time, never stored by hand.");
      } else if (RECORDABLE_TRUTH_STATES.indexOf(draft.truthState) === -1) {
        errors.push("Unknown truth state: " + draft.truthState + ". Recordable states: " + RECORDABLE_TRUTH_STATES.join(", ") + " (default UNVERIFIED).");
      }
    }
    if (draft.refs !== undefined && draft.refs !== null) {
      if (!Array.isArray(draft.refs) || draft.refs.some(function (r) { return typeof r !== "string" || !r.trim(); })) {
        errors.push("refs must be an array of record-id strings (memories reference records by id; they never copy their content).");
      }
    }
    if (draft.reviewAfter !== undefined && draft.reviewAfter !== null) {
      if (typeof draft.reviewAfter !== "string" || isNaN(Date.parse(draft.reviewAfter))) {
        errors.push("reviewAfter must be an ISO date string when present (the freshness horizon after which this memory reads STALE).");
      }
    }
    return errors;
  }

  // Full stored-record validation (used by the harness and available
  // to future integrity checks). Accepts the whole truth vocabulary
  // on READ — the write paths are what enforce the discipline.
  function validateMemory(rec) {
    var errors = [];
    if (!rec || typeof rec !== "object") return ["Memory record must be an object."];
    secretKeyErrors(rec, "", errors);
    if (rec.recordKind !== RECORD_KIND) errors.push("recordKind must be BOT_MEMORY.");
    if (KINDS.indexOf(rec.kind) === -1) errors.push("Unknown memory kind: " + rec.kind + ".");
    if (TRUTH_STATES.indexOf(rec.truthState) === -1) errors.push("Unknown truth state: " + rec.truthState + ".");
    if (STATUSES.indexOf(rec.status) === -1) errors.push("Unknown memory status: " + rec.status + ".");
    if (rec.status !== "DELETED") {
      if (typeof rec.subject !== "string" || !rec.subject.trim()) errors.push("Memory record needs a subject.");
      if (typeof rec.summary !== "string" || !rec.summary.trim()) errors.push("Memory record needs a summary.");
    }
    var p = rec.provenance || {};
    if (typeof p.source !== "string" || !p.source.trim()) errors.push("Memory record needs provenance.source.");
    if (typeof p.recordedBy !== "string" || !p.recordedBy.trim()) errors.push("Memory record needs provenance.recordedBy.");
    if (typeof p.recordedAt !== "string" || isNaN(Date.parse(p.recordedAt))) errors.push("Memory record needs provenance.recordedAt (ISO).");
    if (rec.status === "SUPERSEDED" && !rec.supersededBy) errors.push("A SUPERSEDED memory must name its replacement (supersededBy).");
    // A tombstone may retain its supersedes/supersededBy links: they
    // are chain structure (which record replaced which), not content.
    return errors;
  }

  /* ---------------- freshness (derived, never stored) ---------------- */

  // A memory is STALE when it is still ACTIVE, carries a reviewAfter
  // horizon, and that horizon has passed. Derived at read time from
  // the recorded horizon — the stored truthState is never rewritten
  // to hide or to fake age.
  function isStale(rec, now) {
    if (!rec || rec.status !== "ACTIVE") return false;
    if (!rec.reviewAfter) return false;
    var t = Date.parse(rec.reviewAfter);
    if (isNaN(t)) return false;
    var n = now ? Date.parse(now) : Date.now();
    return !isNaN(n) && n > t;
  }
  function freshnessState(rec, now) {
    if (!rec) return "UNKNOWN";
    if (rec.status === "DELETED") return "DELETED";
    if (rec.status === "SUPERSEDED") return "SUPERSEDED";
    return isStale(rec, now) ? "STALE" : "CURRENT";
  }

  /* ---------------- record ---------------- */

  function nextId(records, kind, at) {
    var datePart = at.slice(0, 10).replace(/-/g, "");
    var prefix = "botmem-" + (slugify(kind) || "memory") + "-" + datePart + "-";
    var seq = 1;
    records.forEach(function (r) {
      if (r && typeof r.id === "string" && r.id.indexOf(prefix) === 0) {
        var n = parseInt(r.id.slice(prefix.length), 10);
        if (!isNaN(n) && n >= seq) seq = n + 1;
      }
    });
    return prefix + (seq < 10 ? "0" + seq : "" + seq);
  }

  function buildRecord(draft, actor, records, at, supersedesId) {
    return {
      id: nextId(records, draft.kind, at),
      recordKind: RECORD_KIND,
      registry: REGISTRY,
      kind: draft.kind,
      subject: draft.subject.trim(),
      summary: draft.summary.trim(),
      refs: Array.isArray(draft.refs) ? draft.refs.slice() : [],
      truthState: draft.truthState || "UNVERIFIED",
      status: "ACTIVE",
      provenance: {
        source: draft.source.trim(),
        recordedBy: actorLabel(actor),
        recordedAt: at
      },
      reviewAfter: draft.reviewAfter || null,
      supersedes: supersedesId || null,
      supersededBy: null,
      supersededAt: null,
      deletedAt: null,
      deletedBy: null,
      forgetReason: null,
      history: [{
        action: supersedesId ? "RECORDED_AS_CORRECTION" : "RECORDED",
        actor: actorLabel(actor),
        at: at,
        note: supersedesId ? "Recorded as the correction superseding " + supersedesId + "." : "Recorded."
      }]
    };
  }

  // record(draft, actor, now) -> { ok, record, deduped?, errors? }
  // The ONLY way a memory enters the engine. Dedupe: an ACTIVE
  // record with the same identity (kind + subject + summary) is
  // returned instead of duplicated — dedupe memory, exactly like the
  // pipelines retain REJECTED/DUPLICATE.
  function record(draft, actor, now) {
    if (!validActor(actor)) return Promise.resolve({ ok: false, errors: ["A valid actor {type: OWNER|STAR|WORKER, ref} is required — memory is always actor-recorded."] });
    var errors = validateDraft(draft);
    if (errors.length) return Promise.resolve({ ok: false, errors: errors });
    var at = nowIso(now);
    return readAll().then(function (records) {
      var key = identityKey(draft.kind, draft.subject, draft.summary);
      var existing = null;
      records.forEach(function (r) {
        if (!existing && isMemory(r) && r.status === "ACTIVE" && recordKey(r) === key) existing = r;
      });
      if (existing) return { ok: true, record: clone(existing), deduped: true };
      var rec = buildRecord(draft, actor, records, at, null);
      return persist(rec).then(function () { return { ok: true, record: clone(rec) }; });
    }).catch(function (e) { return { ok: false, errors: [String(e && e.message || e)] }; });
  }

  /* ---------------- recall ---------------- */

  function getMemory(id) {
    return readAll().then(function (records) {
      var found = null;
      records.forEach(function (r) { if (isMemory(r) && r.id === id) found = r; });
      return found ? clone(found) : null;
    });
  }

  function listMemories() {
    return readAll().then(function (records) {
      return records.filter(isMemory).map(clone);
    });
  }

  // recall(query, now) — the read path for STAR / Tribes / Workers.
  // query: { kind, subject, truthState, staleOnly, includeSuperseded,
  //          includeDeleted }
  // Defaults return the CURRENT memory: ACTIVE records only
  // (tombstones and superseded history are excluded unless asked
  // for, by name). Recall is a pure read: it never writes and never
  // changes a record's truth state — a recalled UNVERIFIED memory is
  // returned UNVERIFIED.
  function recall(query, now) {
    query = query || {};
    return listMemories().then(function (list) {
      var out = list.filter(function (r) {
        if (r.status === "DELETED" && !query.includeDeleted) return false;
        if (r.status === "SUPERSEDED" && !query.includeSuperseded) return false;
        if (query.kind && r.kind !== query.kind) return false;
        if (query.subject && normText(r.subject) !== normText(query.subject)) return false;
        if (query.truthState && r.truthState !== query.truthState) return false;
        if (query.staleOnly && !isStale(r, now)) return false;
        return true;
      });
      out.sort(function (a, b) {
        var ta = a.provenance ? Date.parse(a.provenance.recordedAt) : 0;
        var tb = b.provenance ? Date.parse(b.provenance.recordedAt) : 0;
        return tb - ta;
      });
      return out;
    });
  }

  /* ---------------- correct (OWNER only) ---------------- */

  // correct(id, replacementDraft, opts {actor|by:"owner"}, now)
  // Creates the replacement record (supersedes: id) and marks the
  // original SUPERSEDED with supersededBy pointing at the
  // replacement. The original's content is NOT edited — its summary,
  // subject and provenance stand as recorded; only its lifecycle
  // fields (status, truthState, supersededBy, supersededAt, history)
  // advance. A correction keeps the original's kind and subject: it
  // corrects the claim about the same subject — a different subject
  // is a new memory, not a correction.
  function correct(id, draft, opts, now) {
    var owner = ownerActorFrom(opts);
    if (!owner) {
      return Promise.resolve({ ok: false, errors: ["Only the owner can correct a memory — corrections are governed acts, never a STAR or worker action (frozen note: owner can correct or delete)."] });
    }
    var errors = validateDraft(draft);
    if (errors.length) return Promise.resolve({ ok: false, errors: errors });
    var at = nowIso(now);
    return readAll().then(function (records) {
      var orig = null;
      records.forEach(function (r) { if (isMemory(r) && r.id === id) orig = r; });
      if (!orig) return { ok: false, errors: ["Memory not found: " + id + "."] };
      if (orig.status === "DELETED") return { ok: false, errors: ["Memory " + id + " is a deleted tombstone — its content is gone and cannot be corrected. Record a new memory instead."] };
      if (orig.status === "SUPERSEDED") return { ok: false, errors: ["Memory " + id + " is already SUPERSEDED by " + orig.supersededBy + " — correct the current record, not the superseded one."] };
      if (draft.kind !== orig.kind) return { ok: false, errors: ["A correction keeps the original kind (" + orig.kind + "); a different kind is a new memory, not a correction."] };
      if (normText(draft.subject) !== normText(orig.subject)) return { ok: false, errors: ["A correction keeps the original subject (" + orig.subject + "); a different subject is a new memory, not a correction."] };
      var key = identityKey(draft.kind, draft.subject, draft.summary);
      var clash = null;
      records.forEach(function (r) {
        if (!clash && isMemory(r) && r.id !== id && r.status === "ACTIVE" && recordKey(r) === key) clash = r;
      });
      if (clash) return { ok: false, errors: ["The correction would duplicate active memory " + clash.id + " (same kind + subject + summary). Forget or correct that record instead."] };
      var replacement = buildRecord(draft, owner, records, at, id);
      var updated = clone(orig);
      updated.status = "SUPERSEDED";
      updated.truthState = "SUPERSEDED";
      updated.supersededBy = replacement.id;
      updated.supersededAt = at;
      updated.history = (Array.isArray(updated.history) ? updated.history : []).concat([{
        action: "SUPERSEDED_BY_CORRECTION",
        actor: actorLabel(owner),
        at: at,
        note: "Superseded by " + replacement.id + " (owner correction). Original content preserved as history."
      }]);
      return persist(replacement).then(function () {
        return persist(updated).then(function () {
          return { ok: true, record: clone(replacement), superseded: clone(updated) };
        });
      });
    }).catch(function (e) { return { ok: false, errors: [String(e && e.message || e)] }; });
  }

  /* ---------------- forget (OWNER only) ---------------- */

  // forget(id, opts {actor|by:"owner", reason}, now) — controlled
  // deletion. The record becomes a TOMBSTONE: summary, subject and
  // refs are removed; id, kind, provenance skeleton (source,
  // recordedBy, recordedAt), the supersession links, and the
  // deletion record (deletedAt, deletedBy, forgetReason) are
  // retained so the deletion itself stays reviewable. A reason is
  // required — deletion without a stated reason is exactly the
  // silent vanish this engine exists to prevent.
  function forget(id, opts, now) {
    opts = opts || {};
    var owner = ownerActorFrom(opts);
    if (!owner) {
      return Promise.resolve({ ok: false, errors: ["Only the owner can delete a memory — deletion is a governed act, never a STAR or worker action (frozen note: owner can correct or delete)."] });
    }
    var reason = typeof opts.reason === "string" ? opts.reason.trim() : "";
    if (!reason) {
      return Promise.resolve({ ok: false, errors: ["forget() requires a reason — the tombstone retains the reason so the deletion stays reviewable."] });
    }
    var at = nowIso(now);
    return readAll().then(function (records) {
      var orig = null;
      records.forEach(function (r) { if (isMemory(r) && r.id === id) orig = r; });
      if (!orig) return { ok: false, errors: ["Memory not found: " + id + "."] };
      if (orig.status === "DELETED") return { ok: false, errors: ["Memory " + id + " is already a deleted tombstone."] };
      var tomb = {
        id: orig.id,
        recordKind: RECORD_KIND,
        registry: REGISTRY,
        kind: orig.kind,
        subject: null,
        summary: null,
        refs: [],
        truthState: orig.truthState,
        status: "DELETED",
        provenance: clone(orig.provenance),
        reviewAfter: null,
        supersedes: orig.supersedes || null,
        supersededBy: orig.supersededBy || null,
        supersededAt: orig.supersededAt || null,
        deletedAt: at,
        deletedBy: actorLabel(owner),
        forgetReason: reason,
        history: (Array.isArray(orig.history) ? orig.history : []).concat([{
          action: "FORGOTTEN",
          actor: actorLabel(owner),
          at: at,
          note: reason
        }])
      };
      return persist(tomb).then(function () { return { ok: true, record: clone(tomb) }; });
    }).catch(function (e) { return { ok: false, errors: [String(e && e.message || e)] }; });
  }

  /* ---------------- read-only summary ---------------- */

  // ONE derivation of Bot Memory state for STAR and the Bot
  // Operations panel (EntityGate.pipelineSummary /
  // ResourceEngine.summary parity): counts by kind and truth state,
  // derived stale count, tombstone count, and the most recent
  // decisions and corrections. READ-ONLY — this function never
  // writes. Truth counts cover ACTIVE records only; superseded and
  // deleted records are reported as their own counts, never folded
  // into a truth state they no longer hold.
  function summary(now) {
    return listMemories().then(function (list) {
      var byKind = {};
      KINDS.forEach(function (k) { byKind[k] = 0; });
      var byTruthState = {};
      TRUTH_STATES.forEach(function (t) { byTruthState[t] = 0; });
      var active = 0, supersededCount = 0, deletedCount = 0, staleCount = 0;
      list.forEach(function (r) {
        if (r.status === "DELETED") { deletedCount += 1; return; }
        if (r.status === "SUPERSEDED") { supersededCount += 1; return; }
        active += 1;
        if (byKind.hasOwnProperty(r.kind)) byKind[r.kind] += 1;
        if (byTruthState.hasOwnProperty(r.truthState)) byTruthState[r.truthState] += 1;
        if (isStale(r, now)) staleCount += 1;
      });
      function brief(r) {
        return {
          id: r.id, kind: r.kind, subject: r.subject, summary: r.summary,
          truthState: r.truthState,
          recordedBy: r.provenance ? r.provenance.recordedBy : null,
          recordedAt: r.provenance ? r.provenance.recordedAt : null
        };
      }
      var decisions = list.filter(function (r) { return r.status === "ACTIVE" && r.kind === "DECISION"; })
        .sort(function (a, b) { return Date.parse(b.provenance.recordedAt) - Date.parse(a.provenance.recordedAt); })
        .slice(0, 5).map(brief);
      var corrections = list.filter(function (r) { return r.status === "SUPERSEDED"; })
        .sort(function (a, b) { return Date.parse(b.supersededAt || 0) - Date.parse(a.supersededAt || 0); })
        .slice(0, 5).map(function (r) {
          return {
            id: r.id, kind: r.kind, subject: r.subject, summary: r.summary,
            supersededBy: r.supersededBy, supersededAt: r.supersededAt
          };
        });
      var recent = list.filter(function (r) { return r.status === "ACTIVE"; })
        .sort(function (a, b) { return Date.parse(b.provenance.recordedAt) - Date.parse(a.provenance.recordedAt); })
        .slice(0, 5).map(brief);
      return {
        total: active,
        totalRetained: list.length,
        byKind: byKind,
        kindOrder: KINDS.slice(),
        byTruthState: byTruthState,
        truthStateOrder: TRUTH_STATES.slice(),
        staleCount: staleCount,
        supersededCount: supersededCount,
        deletedCount: deletedCount,
        decisions: decisions,
        corrections: corrections,
        recent: recent
      };
    }).catch(function () { return null; });
  }

  global.BotMemory = {
    VERSION: "BM-1",
    STORE: STORE, RECORD_KIND: RECORD_KIND, REGISTRY: REGISTRY,
    KINDS: KINDS, TRUTH_STATES: TRUTH_STATES,
    RECORDABLE_TRUTH_STATES: RECORDABLE_TRUTH_STATES, STATUSES: STATUSES,
    isMemory: isMemory, identityKey: identityKey,
    validateDraft: validateDraft, validateMemory: validateMemory,
    isStale: isStale, freshnessState: freshnessState,
    record: record, recall: recall, getMemory: getMemory,
    listMemories: listMemories,
    correct: correct, forget: forget, summary: summary
  };
})(typeof window !== "undefined" ? window : this);
