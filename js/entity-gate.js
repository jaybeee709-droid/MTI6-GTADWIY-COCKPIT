/*
 * MTI6-GTADWIY-COCKPIT — Entity Authority Gate (P4: Pipeline Surface +
 * Owner Authority Gate).
 *
 * The ONLY path from entity candidate to canonical entity. P3
 * (js/entity-candidates.js) deliberately refuses the GATED and
 * REGISTERED transitions because they belong to this layer: the
 * owner's authority gate.
 *
 * Flow (design §14, mirroring the proven batch flow):
 *   PREPARED candidates --owner FREEZE--> a frozen batch artifact in
 *   the exact Batch 1/2 shape, persisted in the store as bookkeeping
 *   (recordKind "FROZEN_ENTITY_BATCH", registry "taxonomy" — excluded
 *   from the canonical view by CryptoWorld.getAllRecords, exactly like
 *   candidates) --owner IMPORT--> the EXISTING two-phase import gate
 *   in js/encyclopedia-import.js (validate ALL, zero writes on any
 *   failure, then write + register) --> candidates become REGISTERED.
 *
 * There is no other code path here that writes a canonical record:
 * this module never calls CockpitDB.put on an entity record and never
 * calls a registry's register* function. Registration happens inside
 * EncyclopediaImport.importBatch or not at all.
 *
 * Gate rules (fail-closed, owner-only):
 *   - Only an OWNER actor may freeze, import, return, or reject.
 *     STAR and WORKER actors can prepare candidates (P3); the gate is
 *     never a worker stage (design §18).
 *   - Only PREPARED, NEW_ENTITY candidates can freeze. An
 *     UPDATE_PROPOSAL changes an existing canonical record, and the
 *     two-phase gate hard-fails same-id/different-content by design —
 *     update proposals therefore cannot ride this flow and are refused
 *     here (they remain a separate owner reconciliation path).
 *   - A freeze is pre-validated against the real import gate
 *     (EncyclopediaImport.validateEntityBatch) BEFORE anything is
 *     written: a batch the gate would block is never frozen.
 *   - REJECT requires a reason (delegated to P3's transition, which
 *     enforces it); RETURN FOR EVIDENCE requires a note and sends the
 *     candidate back to MAPPED, from which it re-advances through the
 *     normal P3 stage machine once evidence is attached.
 *   - Truth stays locked: every generated record is UNVERIFIED, the
 *     builder rejects any completion field that tries to claim
 *     otherwise, and no gate action promotes a truth state.
 *   - The import gate's per-batch hold is respected: a frozen batch
 *     becomes importable only through EncyclopediaImport's
 *     enableOwnerFrozenBatch, which requires the artifact's recorded
 *     owner freeze provenance (frozenBy "OWNER:<ref>" + frozenAt).
 *
 * Zero financial authority: this module imports nothing from wallet or
 * execution paths, and the batch builder refuses forbidden financial
 * keys in completion fields under the same vocabulary as the gates.
 */
(function (global) {
  "use strict";

  var STORE = "cryptoWorld";
  var ARTIFACT_KIND = "FROZEN_ENTITY_BATCH";
  var ARTIFACT_REGISTRY = "taxonomy";
  var ACTOR_TYPES = ["OWNER", "STAR", "WORKER"];

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
        out.push("Forbidden financial field: " + (path ? path + "." : "") + k + ".");
      }
      var v = obj[k];
      if (v && typeof v === "object") forbiddenKeyErrors(v, (path ? path + "." : "") + k, out);
    });
    return out;
  }

  function db() { return global.CockpitDB || null; }
  function EC() { return global.EntityCandidates || null; }
  function EI() { return global.EncyclopediaImport || null; }
  function nowIso(now) { return now || new Date().toISOString(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function validActor(actor) {
    return !!actor && ACTOR_TYPES.indexOf(actor.type) !== -1 &&
      typeof actor.ref === "string" && actor.ref.length > 0;
  }
  function actorLabel(actor) { return actor.type + ":" + actor.ref; }
  function ownerError(actor, action) {
    if (!validActor(actor)) return "A valid actor {type: OWNER|STAR|WORKER, ref} is required to " + action + ".";
    if (actor.type !== "OWNER") {
      return "Only the owner can " + action + " — the authority gate is never a STAR or worker stage (actor was " + actorLabel(actor) + ").";
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

  function isArtifact(rec) { return !!rec && rec.recordKind === ARTIFACT_KIND; }
  function artifactIdFor(batchId) { return "frozen-" + batchId; }

  function listFrozenBatches() {
    return readAll().then(function (records) {
      var out = records.filter(isArtifact);
      out.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
      return out;
    });
  }
  function getFrozenBatch(batchId) {
    return readAll().then(function (records) {
      for (var i = 0; i < records.length; i++) {
        if (isArtifact(records[i]) && records[i].batch === batchId) return records[i];
      }
      return null;
    });
  }

  // Next entity batch number: one past the highest entity batch the
  // import gate knows (static data files) or this gate has frozen.
  function nextBatchId(artifacts) {
    var max = 0;
    var imp = EI();
    if (imp && typeof imp.batches === "function") {
      imp.batches().forEach(function (b) {
        var m = b && typeof b.batch === "string" ? /^entity-batch-(\d+)$/.exec(b.batch) : null;
        if (m) max = Math.max(max, parseInt(m[1], 10));
      });
    }
    (artifacts || []).forEach(function (a) {
      var m = a && typeof a.batch === "string" ? /^entity-batch-(\d+)$/.exec(a.batch) : null;
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return "entity-batch-" + (max + 1);
  }

  /* ---------------- batch builder (pure) ---------------- */

  // Deterministic, provenance-only definition text. It states what the
  // record IS (an identity proposed through the pipeline and frozen by
  // the owner) and what it is NOT (verified). It invents no external
  // facts about the entity: every clause comes from the candidate's own
  // fields.
  function definitionFor(candidate, batchId) {
    var kindWord = candidate.proposedKind === "NETWORK" ? "Network identity"
      : candidate.proposedKind === "ASSET" ? "Asset identity"
      : "Protocol identity";
    var text = kindWord + " registered through the entity candidate pipeline as " + batchId +
      ", frozen by the owner from candidate " + candidate.id + ". ";
    if (candidate.proposedKind === "ASSET") {
      text += "Network: " + ((candidate.networkRefs || [])[0] || "UNKNOWN") + ". ";
      if (candidate.ticker) text += "Ticker: " + candidate.ticker + ". ";
    }
    if (candidate.proposedKind === "PROTOCOL") {
      text += "Category: " + (candidate.category || "UNKNOWN") + ". ";
      if ((candidate.networkRefs || []).length) text += "Networks: " + candidate.networkRefs.join(", ") + ". ";
    }
    if (candidate.formerName) text += "Formerly known as " + candidate.formerName + ". ";
    if (candidate.predecessorNote) text += candidate.predecessorNote + " ";
    text += "Registration records the proposal and its evidence; the identity remains UNVERIFIED.";
    return text;
  }

  // Build the Batch 1/2-shaped batch object from PREPARED candidates.
  // Pure: no store reads or writes. `completions` maps candidate id ->
  // owner-supplied freeze-time fields the candidate schema does not
  // carry (NETWORK: vm (required), chainId, familyId; ASSET:
  // nativeOrToken, assetClass, protocol; PROTOCOL: activityRefs).
  // `context.majorIds` (object set) decides which relationship drafts
  // become activityRefs — drafts to anything else stay drafts.
  function buildBatchFromCandidates(candidates, completions, context, batchId, frozenMeta) {
    completions = completions || {};
    context = context || {};
    var majorIds = context.majorIds || {};
    var errors = [];
    var networks = [], assets = [], protocols = [], records = [];

    var byId = {};
    (candidates || []).forEach(function (c) { if (c && c.id) byId[c.id] = c; });

    // A network's native asset inside the same batch: exactly one
    // native asset candidate whose first networkRef is the network.
    function nativeAssetIdFor(networkCanonicalId) {
      var found = null, count = 0;
      (candidates || []).forEach(function (c) {
        if (!c || c.proposedKind !== "ASSET") return;
        var comp = completions[c.id] || {};
        if (comp.nativeOrToken === "native" && (c.networkRefs || [])[0] === networkCanonicalId) {
          found = c.resolution && c.resolution.canonicalId; count++;
        }
      });
      return count === 1 ? found : null;
    }

    (candidates || []).forEach(function (c) {
      if (!c) { errors.push("Missing candidate in freeze set."); return; }
      var comp = completions[c.id] || {};
      errors = errors.concat(forbiddenKeyErrors(comp, "completions." + c.id, []));
      ["truthState", "verificationStatus"].forEach(function (k) {
        if (comp[k] !== undefined && comp[k] !== "UNVERIFIED") {
          errors.push("Candidate " + c.id + ": gate records are always UNVERIFIED; completion field " + k + " may not claim " + comp[k] + ".");
        }
      });
      var canonicalId = c.resolution && c.resolution.canonicalId;
      if (!canonicalId) { errors.push("Candidate " + c.id + " has no resolved canonical id."); return; }
      var definition = definitionFor(c, batchId);
      var base = {
        id: canonicalId,
        title: c.proposedName,
        definition: definition,
        aliases: clone(c.aliases || []),
        importBatch: batchId,
        lastReviewedAt: (frozenMeta && frozenMeta.frozenAt ? frozenMeta.frozenAt : new Date().toISOString()).slice(0, 10),
        source: "owner-seed",
        verificationStatus: "UNVERIFIED"
      };
      if (c.formerName) base.formerName = c.formerName;
      if (c.predecessorNote) base.predecessorNote = c.predecessorNote;

      if (c.proposedKind === "NETWORK") {
        if (!comp.vm || typeof comp.vm !== "string") {
          errors.push("Candidate " + c.id + " (" + c.proposedName + "): freezing a network requires the owner to state its vm at the gate (the candidate schema does not carry it).");
          return;
        }
        var NI = global.NetworkIntelligence;
        var net = {
          id: canonicalId,
          name: c.proposedName,
          vm: comp.vm,
          chainId: (comp.chainId === undefined ? null : comp.chainId),
          aliases: clone(c.aliases || []),
          assetRelationships: [],
          rpcProviders: [],
          fallbackProviders: [],
          health: { status: "UNKNOWN" },
          freshness: { lastChecked: null, maxAgeMs: null },
          walletCompatibility: [],
          source: "owner-seed",
          verificationStatus: "UNVERIFIED"
        };
        if (NI && NI.VM_ACCOUNT_MODELS && NI.VM_ACCOUNT_MODELS[comp.vm]) {
          net.accountModel = NI.VM_ACCOUNT_MODELS[comp.vm];
        }
        if (comp.familyId) net.familyId = comp.familyId;
        networks.push(net);
        var netRec = clone(base);
        netRec.registry = "chains";
        netRec.chainId = net.chainId;
        var nativeId = nativeAssetIdFor(canonicalId);
        if (nativeId) netRec.nativeAssetRef = nativeId;
        records.push(netRec);
      } else if (c.proposedKind === "ASSET") {
        var networkId = (c.networkRefs || [])[0] || null;
        var asset = {
          assetId: canonicalId,
          name: c.proposedName,
          canonicalName: c.proposedName,
          symbol: c.ticker || null,
          assetClass: comp.assetClass || "UNKNOWN",
          networkId: networkId,
          note: "Identity proposed through the entity candidate pipeline (candidate " + c.id + ") and frozen by the owner as " + batchId + ". UNVERIFIED.",
          source: "owner-seed",
          verificationStatus: "UNVERIFIED"
        };
        if (comp.nativeOrToken) asset.nativeOrToken = comp.nativeOrToken;
        var anchor = null;
        (c.contractAnchors || []).forEach(function (a) {
          if (!anchor && a && a.networkRef === networkId) anchor = a;
        });
        if (!anchor && (c.contractAnchors || []).length) anchor = c.contractAnchors[0];
        if (anchor && anchor.address) {
          if (anchor.kind === "mint") asset.mintAddress = anchor.address;
          else asset.contractAddress = anchor.address;
        }
        if (comp.protocol) asset.protocol = comp.protocol;
        assets.push(asset);
        var assetRec = clone(base);
        assetRec.registry = "assets";
        assetRec.symbol = c.ticker || null;
        assetRec.networkRef = networkId;
        if (comp.nativeOrToken) assetRec.nativeOrToken = comp.nativeOrToken;
        records.push(assetRec);
      } else if (c.proposedKind === "PROTOCOL") {
        var activityRefs = [];
        (c.relationshipsDraft || []).forEach(function (d) {
          if (d && majorIds[d.targetId] && activityRefs.indexOf(d.targetId) === -1) activityRefs.push(d.targetId);
        });
        (comp.activityRefs || []).forEach(function (m) {
          if (activityRefs.indexOf(m) === -1) activityRefs.push(m);
        });
        protocols.push({
          protocolId: canonicalId,
          name: c.proposedName,
          category: c.category || null,
          description: definition,
          networks: clone(c.networkRefs || []),
          activities: activityRefs.slice(),
          types: [],
          strategies: [],
          aliases: clone(c.aliases || []),
          securityState: "UNKNOWN",
          source: "owner-seed",
          verificationStatus: "UNVERIFIED"
        });
        var protoRec = clone(base);
        protoRec.registry = "protocols";
        protoRec.networkRefs = clone(c.networkRefs || []);
        protoRec.activityRefs = activityRefs.slice();
        records.push(protoRec);
      }
    });

    var batch = {
      batch: batchId,
      kind: "entity",
      label: "Entity Batch " + batchId.replace("entity-batch-", "") + " — candidate pipeline (owner-frozen)",
      networks: networks,
      assets: assets,
      protocols: protocols,
      records: records,
      frozenBy: frozenMeta ? frozenMeta.frozenBy : null,
      frozenAt: frozenMeta ? frozenMeta.frozenAt : null,
      candidateIds: (candidates || []).map(function (c) { return c && c.id; }).filter(Boolean)
    };
    return { batch: batch, errors: errors };
  }

  /* ---------------- gate transitions (gate-owned stages) ---------------- */

  // PREPARED -> GATED / GATED -> REGISTERED / PREPARED -> MAPPED are
  // performed HERE, never by the P3 stage machine (which refuses them
  // by construction). Each write appends the same append-only history
  // entry shape P3 uses, with the gate actor recorded.
  function gateTransition(candidate, toStage, actor, note, now, batchRef) {
    var from = candidate.pipelineStage;
    candidate.pipelineStage = toStage;
    if (batchRef) candidate.preparedBatchRef = batchRef;
    candidate.lastReviewedAt = nowIso(now).slice(0, 10);
    candidate.history = (candidate.history || []).concat([{
      from: from, to: toStage, actor: actorLabel(actor), at: nowIso(now), note: note
    }]);
    return persist(candidate);
  }

  /* ---------------- owner actions ---------------- */

  // FREEZE INTO BATCH: PREPARED candidates -> frozen batch artifact +
  // GATED. Pre-validated against the real import gate before any
  // write; a batch the gate would block is never frozen.
  function freezeIntoBatch(candidateIds, actor, opts) {
    opts = opts || {};
    var gateErr = ownerError(actor, "freeze candidates into a batch");
    if (gateErr) return Promise.resolve({ ok: false, errors: [gateErr] });
    var ec = EC(), imp = EI();
    if (!ec || !imp) return Promise.resolve({ ok: false, errors: ["EntityCandidates / EncyclopediaImport not loaded — the gate is unavailable."] });
    if (!Array.isArray(candidateIds) || !candidateIds.length) {
      return Promise.resolve({ ok: false, errors: ["Freeze needs at least one candidate id."] });
    }
    return Promise.all([
      Promise.all(candidateIds.map(function (id) { return ec.getCandidate(id); })),
      listFrozenBatches(),
      readAll()
    ]).then(function (parts) {
      var candidates = parts[0], artifacts = parts[1], existing = parts[2];
      var errors = [];
      candidates.forEach(function (c, i) {
        if (!c) { errors.push("Candidate not found: " + candidateIds[i] + "."); return; }
        if (c.candidateType === "UPDATE_PROPOSAL") {
          errors.push("Candidate " + c.id + " is an UPDATE_PROPOSAL against " + c.targetCanonicalId +
            ": update proposals change an existing canonical record and the two-phase gate hard-fails same-id/different-content by design. They cannot freeze into a new-entity batch; they remain a separate owner reconciliation path.");
        }
        if (c.pipelineStage !== "PREPARED") {
          errors.push("Candidate " + c.id + " is at stage " + c.pipelineStage + " — only PREPARED candidates can freeze. An unprepared candidate cannot be frozen.");
        }
        if (!c.resolution || !c.resolution.canonicalId) {
          errors.push("Candidate " + c.id + " has no resolved canonical id.");
        }
      });
      if (errors.length) return { ok: false, errors: errors };

      var batchId = nextBatchId(artifacts);
      var frozenAt = nowIso(opts.now);
      var built = buildBatchFromCandidates(candidates, opts.completions || {}, {
        majorIds: majorIdSet(existing)
      }, batchId, { frozenBy: actorLabel(actor), frozenAt: frozenAt });
      if (built.errors.length) return { ok: false, errors: built.errors };

      // Fail-closed pre-validation: run the REAL gate's Phase 1 over
      // the built batch against the live store. Any error -> refuse
      // the freeze with zero writes (no artifact, no stage change).
      var check = imp.validateEntityBatch(built.batch, existing);
      var bad = check.dispositions.filter(function (d) { return d.errors.length > 0; });
      if (bad.length || check.moduleErrors.length) {
        var gateErrors = [];
        bad.forEach(function (d) { d.errors.forEach(function (e) { gateErrors.push((d.rec && d.rec.id ? d.rec.id : "(no id)") + ": " + e); }); });
        check.moduleErrors.forEach(function (m) { m.reasons.forEach(function (e) { gateErrors.push(m.id + ": " + e); }); });
        return { ok: false, errors: ["The import gate would block this batch, so it was NOT frozen (zero writes):"].concat(gateErrors) };
      }

      var artifact = {
        id: artifactIdFor(batchId),
        recordKind: ARTIFACT_KIND,
        registry: ARTIFACT_REGISTRY,
        batch: batchId,
        kind: "entity",
        label: built.batch.label,
        candidateIds: built.batch.candidateIds.slice(),
        frozenBy: actorLabel(actor),
        frozenAt: frozenAt,
        status: "FROZEN",
        networks: built.batch.networks,
        assets: built.batch.assets,
        protocols: built.batch.protocols,
        records: built.batch.records,
        importReport: null,
        importedAt: null
      };
      return persist(artifact).then(function () {
        var chain = Promise.resolve();
        candidates.forEach(function (c) {
          chain = chain.then(function () {
            return gateTransition(c, "GATED", actor,
              "Frozen into " + batchId + " by the owner authority gate. Registration still requires the two-phase import gate.", opts.now, batchId);
          });
        });
        return chain.then(function () { return { ok: true, batchId: batchId, artifact: artifact }; });
      });
    });
  }

  function majorIdSet(existing) {
    var set = {};
    (existing || []).forEach(function (r) {
      if (r && r.level === "MAJOR_ACTIVITY" && r.id) set[r.id] = true;
    });
    return set;
  }

  // IMPORT a frozen batch through the existing two-phase gate. The
  // ONLY promotion path: this function writes no canonical record
  // itself — EncyclopediaImport.importBatch validates, writes, and
  // registers. On a blocked/failed run the candidates stay GATED and
  // the artifact stays FROZEN with the report attached.
  function importFrozenBatch(batchId, actor, opts) {
    opts = opts || {};
    var gateErr = ownerError(actor, "import a frozen batch");
    if (gateErr) return Promise.resolve({ ok: false, errors: [gateErr] });
    var ec = EC(), imp = EI();
    if (!ec || !imp) return Promise.resolve({ ok: false, errors: ["EntityCandidates / EncyclopediaImport not loaded — the gate is unavailable."] });
    if (typeof imp.enableOwnerFrozenBatch !== "function") {
      return Promise.resolve({ ok: false, errors: ["The import gate does not expose enableOwnerFrozenBatch — frozen-batch import is unavailable in this build."] });
    }
    return getFrozenBatch(batchId).then(function (artifact) {
      if (!artifact) return { ok: false, errors: ["No frozen batch artifact for " + batchId + "."] };
      if (artifact.status !== "FROZEN") {
        return { ok: false, errors: ["Batch " + batchId + " is " + artifact.status + ", not FROZEN — it cannot be imported again."] };
      }
      var batch = {
        batch: artifact.batch, kind: "entity", label: artifact.label,
        networks: clone(artifact.networks || []), assets: clone(artifact.assets || []),
        protocols: clone(artifact.protocols || []), records: clone(artifact.records || []),
        frozenBy: artifact.frozenBy, frozenAt: artifact.frozenAt,
        candidateIds: (artifact.candidateIds || []).slice()
      };
      if (!imp.enableOwnerFrozenBatch(batch)) {
        return { ok: false, errors: ["The import gate refused to enable " + batchId + " (its owner freeze provenance did not validate). Nothing was imported."] };
      }
      return imp.importBatch(batch).then(function (out) {
        var report = {
          imported: out.imported, alreadyPresent: out.alreadyPresent,
          blocked: !!out.blocked, failed: !!out.failed, disabled: !!out.disabled,
          blockReason: out.blockReason || null,
          rejected: out.rejected || [],
          registrations: out.registrations || null,
          at: nowIso(opts.now)
        };
        if (out.blocked || out.failed || out.disabled) {
          artifact.importReport = report;
          return persist(artifact).then(function () {
            return { ok: false, errors: ["Import of " + batchId + " did not complete (" +
              (out.blockReason || (out.disabled ? "batch disabled" : "import failed")) +
              "). The two-phase gate guarantees zero canonical writes on a blocked run; candidates remain GATED and the batch remains FROZEN."], report: report };
          });
        }
        artifact.status = "IMPORTED";
        artifact.importedAt = nowIso(opts.now);
        artifact.importReport = report;
        return persist(artifact).then(function () {
          var chain = Promise.resolve();
          (artifact.candidateIds || []).forEach(function (cid) {
            chain = chain.then(function () {
              return ec.getCandidate(cid).then(function (c) {
                if (c && c.pipelineStage === "GATED") {
                  return gateTransition(c, "REGISTERED", actor,
                    "Registered canonically through the two-phase import gate as " + batchId + ". Truth remains UNVERIFIED.", opts.now, batchId);
                }
              });
            });
          });
          return chain.then(function () { return { ok: true, batchId: batchId, report: report }; });
        });
      });
    });
  }

  // RETURN FOR EVIDENCE: PREPARED -> MAPPED (owner, note required).
  // The candidate re-advances through the normal P3 stage machine
  // (MAPPED -> PREPARED) once the requested evidence is attached.
  function returnForEvidence(candidateId, actor, opts) {
    opts = opts || {};
    var gateErr = ownerError(actor, "return a candidate for evidence");
    if (gateErr) return Promise.resolve({ ok: false, errors: [gateErr] });
    if (!opts.note || typeof opts.note !== "string" || !opts.note.trim()) {
      return Promise.resolve({ ok: false, errors: ["RETURN FOR EVIDENCE requires a note naming the evidence needed."] });
    }
    var ec = EC();
    if (!ec) return Promise.resolve({ ok: false, errors: ["EntityCandidates not loaded."] });
    return ec.getCandidate(candidateId).then(function (c) {
      if (!c) return { ok: false, errors: ["Candidate not found: " + candidateId + "."] };
      if (c.pipelineStage !== "PREPARED") {
        return { ok: false, errors: ["Only a PREPARED candidate can be returned for evidence (current stage: " + c.pipelineStage + ")."] };
      }
      return gateTransition(c, "MAPPED", actor,
        "Returned for evidence by the owner authority gate: " + opts.note.trim(), opts.now, null)
        .then(function (rec) { return { ok: true, record: rec }; });
    });
  }

  // REJECT from the gate review list: owner-only here; the rejection
  // itself (reason required, terminal, retained as dedupe memory) is
  // P3's transition, reused unchanged.
  function rejectFromGate(candidateId, actor, opts) {
    opts = opts || {};
    var gateErr = ownerError(actor, "reject a candidate at the gate");
    if (gateErr) return Promise.resolve({ ok: false, errors: [gateErr] });
    if (!opts.reason || typeof opts.reason !== "string" || !opts.reason.trim()) {
      return Promise.resolve({ ok: false, errors: ["REJECT requires a reason (retained as dedupe/audit memory)."] });
    }
    var ec = EC();
    if (!ec) return Promise.resolve({ ok: false, errors: ["EntityCandidates not loaded."] });
    return ec.getCandidate(candidateId).then(function (c) {
      if (!c) return { ok: false, errors: ["Candidate not found: " + candidateId + "."] };
      if (c.pipelineStage !== "PREPARED") {
        return { ok: false, errors: ["The gate review list holds PREPARED candidates; this candidate is at " + c.pipelineStage + "."] };
      }
      return ec.transitionCandidate(candidateId, "REJECTED", actor, { reason: opts.reason.trim(), now: opts.now });
    });
  }

  // The gate review list: PREPARED candidates with the display fields
  // the review UI needs (stage, dedupe verdict, evidence, resolution).
  function reviewQueue() {
    var ec = EC();
    if (!ec) return Promise.resolve([]);
    return ec.listCandidates({ stage: "PREPARED" });
  }

  /* ---------------- P5: read-only pipeline summary ----------------
   * ONE derivation of pipeline state for the P5 visibility surfaces
   * (StarWorld answers + the Bot Operations panel), so both always
   * report the same numbers from the same real records. READ-ONLY:
   * this function never writes — it reads candidates and frozen-batch
   * artifacts and derives counts, the gate queue, stale flags, and
   * recent gate decisions from the candidates' append-only history.
   *
   * Gate decisions are exactly the transitions the authority gate
   * performs: PREPARED -> GATED (freeze), GATED -> REGISTERED
   * (import), PREPARED -> MAPPED (return for evidence), and
   * PREPARED -> REJECTED (gate rejection). Stage advances and dedupe
   * verdicts inside the working pipeline are not gate decisions.
   * Stale = a candidate still in a working stage (not GATED /
   * REGISTERED / terminal) older than EntityCandidates.STALE_DAYS. */
  var GATE_STAGES = ["GATED", "REGISTERED"];
  function isGateDecision(h) {
    if (!h) return false;
    if (h.to === "GATED" || h.to === "REGISTERED") return true;
    if (h.from === "PREPARED" && (h.to === "MAPPED" || h.to === "REJECTED")) return true;
    return false;
  }
  function pipelineSummary(now) {
    var ec = EC();
    if (!ec) return Promise.resolve(null);
    return Promise.all([ec.listCandidates(), listFrozenBatches()]).then(function (res) {
      var list = res[0] || [];
      var artifacts = res[1] || [];
      var stageOrder = ec.STAGES.concat(GATE_STAGES).concat(ec.TERMINAL_STAGES);
      var counts = {};
      stageOrder.forEach(function (s) { counts[s] = 0; });
      list.forEach(function (c) {
        if (c && counts.hasOwnProperty(c.pipelineStage)) counts[c.pipelineStage] += 1;
      });
      var activeCount = 0;
      ec.STAGES.forEach(function (s) { activeCount += counts[s]; });
      var staleCount = 0;
      list.forEach(function (c) {
        if (c && ec.STAGES.indexOf(c.pipelineStage) !== -1 && ec.isStale(c, now)) staleCount += 1;
      });
      var decisions = [];
      list.forEach(function (c) {
        if (!c) return;
        (Array.isArray(c.history) ? c.history : []).forEach(function (h) {
          if (isGateDecision(h)) {
            decisions.push({
              candidateId: c.id,
              name: c.proposedName || c.id,
              from: h.from, to: h.to,
              actor: h.actor || "UNKNOWN",
              at: h.at || null,
              note: h.note || ""
            });
          }
        });
      });
      decisions.sort(function (a, b) {
        var ta = a.at ? Date.parse(a.at) : 0;
        var tb = b.at ? Date.parse(b.at) : 0;
        return tb - ta;
      });
      var frozenPending = artifacts.filter(function (a) { return a && a.status === "FROZEN"; });
      var imported = artifacts.filter(function (a) { return a && a.status === "IMPORTED"; });
      return {
        total: list.length,
        counts: counts,
        stageOrder: stageOrder,
        activeCount: activeCount,
        gateQueueCount: counts.PREPARED || 0,
        gatedCount: counts.GATED || 0,
        registeredCount: counts.REGISTERED || 0,
        terminalCount: (counts.REJECTED || 0) + (counts.DUPLICATE || 0),
        rejectedCount: counts.REJECTED || 0,
        duplicateCount: counts.DUPLICATE || 0,
        staleCount: staleCount,
        frozenPendingCount: frozenPending.length,
        frozenPendingBatches: frozenPending.map(function (a) { return a.batch; }),
        importedBatchCount: imported.length,
        decisions: decisions
      };
    }).catch(function () { return null; });
  }

  global.EntityGate = {
    VERSION: "P4.1",
    ARTIFACT_KIND: ARTIFACT_KIND,
    isArtifact: isArtifact,
    buildBatchFromCandidates: buildBatchFromCandidates,
    definitionFor: definitionFor,
    nextBatchId: nextBatchId,
    listFrozenBatches: listFrozenBatches,
    getFrozenBatch: getFrozenBatch,
    reviewQueue: reviewQueue,
    pipelineSummary: pipelineSummary,
    freezeIntoBatch: freezeIntoBatch,
    importFrozenBatch: importFrozenBatch,
    returnForEvidence: returnForEvidence,
    rejectFromGate: rejectFromGate
  };
})(window);
