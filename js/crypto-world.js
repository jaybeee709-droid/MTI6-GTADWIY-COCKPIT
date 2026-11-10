/* MTI6-GTADWIY-COCKPIT — Crypto World registry foundation (Part 1)
 * READ ONLY. This layer maps the Crypto World; it never moves assets,
 * never signs anything, never connects a wallet, and never promises
 * income. Mapping an opportunity is not promising a return.
 *
 * Twelve distinct first-class registries, linked by id, never one flat
 * list: assets, chains, protocols, activities, strategies, ways,
 * datasources, botcapabilities, risks, discoveries, statuses,
 * positions. A capability record (protocol x chain x asset class x
 * activity x mode x status) is a relationship, not a permission:
 * INFORMATIONAL never implies TRANSACTIONAL, and a capability counts
 * as transactional only when its own mode is TRANSACTIONAL and its
 * verification status is VERIFIED.
 *
 * No network calls, no secrets. The schema has no field for a seed
 * phrase, private key, API token, or password, and validation rejects
 * records carrying one. Unknown data displays UNKNOWN, NOT VERIFIED,
 * or NOT CONNECTED — never an invented value.
 *
 * The 60 Ways taxonomy is import-pending: the authoritative category
 * names are not in this codebase, so Part 1 stores exactly ONE
 * taxonomy metadata record (expected 60, imported 0, status
 * TAXONOMY_IMPORT_PENDING) and zero Way records. Real Way records are
 * added only when their names and definitions are imported and
 * verified. The A–Z activity families are organizational labels only:
 * they are not opportunities, earning guarantees, protocols, assets,
 * strategies, or the 60 Ways.
 */
(function (global) {
  "use strict";

  var STORE = "cryptoWorld";
  var TAXONOMY_META_ID = "taxonomy-meta";

  var REGISTRIES = ["assets", "chains", "protocols", "activities", "strategies",
    "ways", "datasources", "botcapabilities", "risks", "discoveries", "statuses", "positions"];

  var ASSET_CLASSES = [
    "Native coins", "Fungible tokens", "Stablecoins", "Wrapped assets",
    "Bridged assets", "Governance tokens", "Liquidity-pool positions / LP assets",
    "Yield-bearing assets", "Liquid-staking assets", "Liquid-restaking assets",
    "Synthetic assets", "Tokenized real-world assets", "Derivative instruments",
    "Vault/share tokens", "Lending receipt tokens", "Collateral assets",
    "Prediction-market positions", "NFTs / digital assets", "Gaming/metaverse assets",
    "Experimental / newly discovered assets"
  ];

  var ACTIVITY_FAMILIES = [
    { id: "A", name: "Wallet and asset operations" },
    { id: "B", name: "DEX and exchange activities" },
    { id: "C", name: "Liquidity activities" },
    { id: "D", name: "Yield farming and vault activities" },
    { id: "E", name: "Staking and restaking activities" },
    { id: "F", name: "Lending, borrowing and credit activities" },
    { id: "G", name: "Derivatives and leveraged-market activities" },
    { id: "H", name: "Cross-chain and interoperability activities" },
    { id: "I", name: "DAO and governance activities" },
    { id: "J", name: "Launch, incentive and distribution activities" },
    { id: "K", name: "Stablecoin mechanisms and activities" },
    { id: "L", name: "Tokenized real-world-asset activities" },
    { id: "M", name: "Prediction and event-market activities" },
    { id: "N", name: "Payments, commerce and settlement activities" },
    { id: "O", name: "Mining, validation and network-service activities" },
    { id: "P", name: "Smart-contract and protocol-development activities" },
    { id: "Q", name: "Research, discovery and monitoring activities" },
    { id: "R", name: "Security, risk and wallet-protection activities" },
    { id: "S", name: "Portfolio, records and reporting activities" },
    { id: "T", name: "Social, gaming, creator and community activities" },
    { id: "U", name: "Infrastructure, node and data-service activities" },
    { id: "V", name: "Identity, reputation and credential activities" },
    { id: "W", name: "Insurance and risk-transfer activities" },
    { id: "X", name: "Privacy-preserving activities" },
    { id: "Y", name: "Recovery, migration and emergency activities" },
    { id: "Z", name: "Newly discovered activities awaiting classification" }
  ];

  var MODES = ["INFORMATIONAL", "MONITORING", "SIMULATION", "MANUAL",
    "CONNECTED", "TRANSACTIONAL", "DISABLED"];

  var VERIFICATION_STATES = ["UNKNOWN", "DISCOVERED", "UNVERIFIED", "VERIFIED",
    "STALE", "UNAVAILABLE", "NOT_CONNECTED", "DISABLED"];

  var RISK_DIMENSIONS = ["Market risk", "Volatility risk", "Liquidation risk",
    "Smart-contract risk", "Oracle risk", "Bridge risk", "Chain/network risk",
    "Validator risk", "Counterparty/custody risk", "Stablecoin/depeg risk",
    "Liquidity risk", "Impermanent-loss risk", "Governance risk", "Token risk",
    "Protocol risk", "Approval/allowance risk", "Transaction/gas risk",
    "Regulatory/restriction status", "Data-source risk"];

  // Future execution lifecycle — LABELS ONLY in Part 1. No step here
  // executes anything, and no step is reachable from this module.
  var TX_LIFECYCLE = ["DISCOVER", "RESEARCH", "SIMULATE", "PREVIEW", "RISK_CHECK",
    "OWNER_APPROVAL", "WALLET_CONFIRMATION", "SUBMIT", "CONFIRM", "FAIL"];

  var DISCOVERY_WORKFLOW = ["DISCOVERED", "VERIFY", "CLASSIFY", "OWNER_APPROVAL", "ADD"];
  var DISCOVERY_END_STATES = ["REJECTED", "DUPLICATE", "STALE", "NEEDS_REVIEW"];

  var SECRET_FIELDS = ["seedphrase", "seed", "mnemonic", "privatekey", "apikey",
    "apisecret", "password", "secret"];

  // ---- Batch B pre-import gate (Nov 10, 2026) — shared constants ----
  // Taxonomy levels. FAMILY / MAJOR_ACTIVITY are roots (no parentRef);
  // TYPE parents to a canonical Major Activity; STRATEGY parents to a Type.
  var LEVELS = ["FAMILY", "MAJOR_ACTIVITY", "TYPE", "STRATEGY"];
  var ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  var MAJOR_ID_PATTERN = /^major-[a-z0-9-]+$/;

  // THREAT/DEFENSE vocabulary (owner-approved, closed lists — extend only
  // by owner directive). threatKind is the enumerated kind on a risks
  // record; the denylist below is the exact-title vocabulary wall.
  var THREAT_KINDS = ["ORACLE_MANIPULATION", "FALSE_REPORTING",
    "RESOLUTION_MANIPULATION", "PREDATORY_LIQUIDATION", "MEV_PREDATORY",
    "DEFENSE_MONITORING"];
  var THREAT_TITLE_DENYLIST = [
    "oracle lag exploitation",
    "stale price exploitation",
    "oracle manipulation",
    "false reporting",
    "resolution manipulation",
    "predatory liquidation via oracle timing",
    "sandwiching",
    "predatory frontrunning",
    "intentionally worsening another users execution"
  ];

  // Normalize a title for the denylist: lowercase, drop apostrophes,
  // collapse hyphens/spaces/underscores to a single space. This is an
  // exact-string match after normalization — no substring matching, no
  // stemming, no similarity scoring. It is defense in depth only: it does
  // NOT replace owner semantic review, and exact-string matching does not
  // solve semantic classification of novel variants.
  function normalizeThreatTitle(title) {
    return String(title || "").toLowerCase().replace(/'/g, "")
      .replace(/[-_\s]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function isThreatTitle(title) {
    return THREAT_TITLE_DENYLIST.indexOf(normalizeThreatTitle(title)) !== -1;
  }

  function defaultTaxonomyMeta() {
    return {
      id: TAXONOMY_META_ID, registry: "taxonomy",
      expectedCategoryCount: 60, importedCategoryCount: 0,
      status: "TAXONOMY_IMPORT_PENDING"
    };
  }

  function db() { return global.CockpitDB || null; }

  function getAllRecords() {
    var d = db();
    if (!d || typeof d.getAll !== "function") return Promise.resolve([]);
    return d.getAll(STORE).catch(function () { return []; });
  }

  function getTaxonomyMeta() {
    return getAllRecords().then(function (records) {
      for (var i = 0; i < records.length; i++) {
        if (records[i].id === TAXONOMY_META_ID) return records[i];
      }
      return defaultTaxonomyMeta();
    });
  }

  // Writes exactly ONE metadata record, only when none exists. It never
  // writes Way records and never overwrites an existing meta record.
  function ensureTaxonomyMeta() {
    var d = db();
    if (!d || typeof d.getAll !== "function" || typeof d.put !== "function") {
      return Promise.resolve(defaultTaxonomyMeta());
    }
    return d.getAll(STORE).then(function (records) {
      for (var i = 0; i < records.length; i++) {
        if (records[i].id === TAXONOMY_META_ID) return records[i];
      }
      var meta = defaultTaxonomyMeta();
      return d.put(STORE, meta).then(function () { return meta; });
    }).catch(function () { return defaultTaxonomyMeta(); });
  }

  function countByRegistry(records) {
    var counts = {};
    REGISTRIES.forEach(function (r) { counts[r] = 0; });
    (records || []).forEach(function (rec) {
      if (rec && counts.hasOwnProperty(rec.registry)) counts[rec.registry] += 1;
    });
    return counts;
  }

  function validateRecord(rec) {
    var errors = [];
    if (!rec || typeof rec !== "object") return ["Record must be an object."];
    if (!rec.id) errors.push("Record needs an id.");
    // "capability" is a relationship record (protocol x chain x asset
    // class x activity x mode x status), not a 13th registry.
    if (!rec.registry || (REGISTRIES.indexOf(rec.registry) === -1 && rec.registry !== "capability")) {
      errors.push("Record registry must be one of the 12 registries (or a capability relationship).");
    }
    Object.keys(rec).forEach(function (k) {
      if (SECRET_FIELDS.indexOf(k.toLowerCase()) !== -1) {
        errors.push("Secret field not allowed in a registry record: " + k + ".");
      }
    });
    if (rec.verificationStatus && VERIFICATION_STATES.indexOf(rec.verificationStatus) === -1) {
      errors.push("Unknown verification status: " + rec.verificationStatus + ".");
    }
    // Present in the registry is not verified: a VERIFIED claim needs a
    // source and a last-checked timestamp, or it is rejected.
    if (rec.verificationStatus === "VERIFIED" && (!rec.source || !rec.lastChecked)) {
      errors.push("A VERIFIED record needs a source and lastChecked timestamp.");
    }
    if (rec.assetClass && ASSET_CLASSES.indexOf(rec.assetClass) === -1) {
      errors.push("Unknown asset class: " + rec.assetClass + ".");
    }
    if (rec.modes) {
      (Array.isArray(rec.modes) ? rec.modes : [rec.modes]).forEach(function (m) {
        if (MODES.indexOf(m) === -1) errors.push("Unknown activity mode: " + m + ".");
      });
    }
    return errors;
  }

  function byRegistry(records, registry) {
    return (records || []).filter(function (r) { return r && r.registry === registry; });
  }

  function protocolsByActivity(records, activityId) {
    return byRegistry(records, "protocols").filter(function (p) {
      return (p.activityRefs || []).indexOf(activityId) !== -1;
    });
  }

  function activitiesByAssetClass(records, assetClass) {
    return byRegistry(records, "activities").filter(function (a) {
      return (a.assetClassRefs || []).indexOf(assetClass) !== -1;
    });
  }

  function chainsByAsset(records, assetId) {
    var asset = null;
    byRegistry(records, "assets").forEach(function (a) { if (a.id === assetId) asset = a; });
    if (!asset) return [];
    return byRegistry(records, "chains").filter(function (c) {
      return (asset.chainRefs || []).indexOf(c.id) !== -1;
    });
  }

  function risksBySubject(records, subjectId) {
    return byRegistry(records, "risks").filter(function (r) {
      return (r.appliesTo || []).indexOf(subjectId) !== -1;
    });
  }

  // Capability relationship query. Returns capability records only; an
  // empty result means "no verified capability on record" — never a
  // promise, and never a transaction.
  function capabilitiesFor(records, q) {
    q = q || {};
    return (records || []).filter(function (r) {
      if (!r || r.registry !== "capability") return false;
      if (q.protocol && r.protocol !== q.protocol) return false;
      if (q.chain && r.chain !== q.chain) return false;
      if (q.assetClass && r.assetClass !== q.assetClass) return false;
      if (q.activity && r.activity !== q.activity) return false;
      if (q.mode && r.mode !== q.mode) return false;
      return true;
    });
  }

  // A capability counts as transactional only when it IS a capability
  // relationship record (registry "capability") AND its own mode is
  // TRANSACTIONAL AND its verification status is VERIFIED. The registry
  // check is load-bearing: without it, any record carrying mode
  // TRANSACTIONAL + VERIFIED would satisfy this function, including a
  // risks record. (The design report §F1 described this function as
  // requiring registry "capability"; the code as written did not, so the
  // check is added here to make the stated guarantee actually true.)
  function isTransactionalCapability(cap) {
    return !!cap && cap.registry === "capability" &&
      cap.mode === "TRANSACTIONAL" && cap.verificationStatus === "VERIFIED";
  }

  // ---- Encyclopedia v1: entry model (read-only reference layer) ----
  // An entry is a registry record with a title and a definition. Entries
  // live in the existing cryptoWorld store; no new store, no new key.
  // The encyclopedia READS and RENDERS; it never authors entries.
  // Way records are rejected here in v1: they arrive only through a
  // future authoritative import, never through the encyclopedia path.
  // assetClassRefs hold class LABELS, not entry ids, so they are not
  // followed as entry links (the class reference section covers them).
  function isEntry(rec) {
    return !!rec && typeof rec.title === "string" && rec.title.trim() !== "" &&
      typeof rec.definition === "string" && rec.definition.trim() !== "";
  }

  // Batch B gate — format checks (store-blind, no existence resolution).
  // Shared by validateEntry and by the backup-restore candidate validator
  // below, so both paths enforce the same shape rules.
  function levelFormatErrors(rec) {
    var errors = [];
    if (rec.level !== undefined) {
      if (LEVELS.indexOf(rec.level) === -1) {
        errors.push("level must be one of FAMILY, MAJOR_ACTIVITY, TYPE, STRATEGY.");
      } else if (rec.level === "TYPE" || rec.level === "STRATEGY") {
        if (typeof rec.parentRef !== "string" || !rec.parentRef.trim()) {
          errors.push(rec.level + " records must name a parentRef.");
        } else if (!ID_PATTERN.test(rec.parentRef)) {
          errors.push("parentRef must be a well-formed id.");
        } else if (rec.level === "TYPE" && rec.parentRef.indexOf("major-") !== 0) {
          errors.push("TYPE parentRef must name a Major Activity (major-*).");
        } else if (rec.level === "STRATEGY" && rec.parentRef.indexOf("type-") !== 0) {
          errors.push("STRATEGY parentRef must name a Type (type-*).");
        }
      } else if (rec.parentRef !== undefined) {
        // FAMILY / MAJOR_ACTIVITY are roots: they carry no structural parent.
        errors.push(rec.level + " records must not carry a parentRef.");
      }
    }
    if (rec.relatedActivities !== undefined) {
      if (!Array.isArray(rec.relatedActivities) ||
          rec.relatedActivities.some(function (v) { return typeof v !== "string" || !MAJOR_ID_PATTERN.test(v); })) {
        errors.push("relatedActivities must be an array of Major Activity ids (major-*).");
      }
    }
    if (rec.strategySources !== undefined) {
      if (!Array.isArray(rec.strategySources) ||
          rec.strategySources.some(function (v) { return typeof v !== "string"; })) {
        errors.push("strategySources must be an array of strings.");
      }
    }
    if (rec.level === "STRATEGY" && rec.strategyKind !== undefined && rec.strategyKind !== "STRATEGY") {
      errors.push("strategyKind on a STRATEGY record must be \"STRATEGY\".");
    }
    return errors;
  }

  // Batch B gate — THREAT/DEFENSE hard wall (design §F3.2/F3.3).
  // Three independent checks; any one blocks a smuggled threat:
  // (a) classification THREAT/DEFENSE lives in the risks registry only,
  //     with an enumerated threatKind;
  // (b) a risks record must never carry TRANSACTIONAL mode, STRATEGY
  //     level, or a Type parentRef — so it can never gain transactional
  //     identity (see isTransactionalCapability above);
  // (c) an exact-title denylist blocks the 9 named threat concepts from
  //     appearing as activities/strategies records or STRATEGY levels.
  // A risks record titled with a threat concept is NOT blocked by (c):
  // the risks registry is where threats are recorded.
  function threatWallErrors(rec) {
    var errors = [];
    if (rec.registry === "risks") {
      var modes = rec.modes ? (Array.isArray(rec.modes) ? rec.modes : [rec.modes]) : [];
      if (modes.indexOf("TRANSACTIONAL") !== -1) {
        errors.push("Risks records must not carry TRANSACTIONAL mode.");
      }
      if (rec.level === "STRATEGY") {
        errors.push("Risks records must not carry level STRATEGY.");
      }
      if (typeof rec.parentRef === "string" && rec.parentRef.indexOf("type-") === 0) {
        errors.push("Risks records must not carry a Type parentRef.");
      }
    }
    if (rec.classification !== undefined) {
      if (rec.classification !== "THREAT" && rec.classification !== "DEFENSE") {
        errors.push("classification must be THREAT or DEFENSE.");
      } else {
        if (rec.registry !== "risks") {
          errors.push("THREAT/DEFENSE classification is recorded in the risks registry only.");
        }
        if (typeof rec.threatKind !== "string" || THREAT_KINDS.indexOf(rec.threatKind) === -1) {
          errors.push("A THREAT/DEFENSE record must carry a known threatKind.");
        }
      }
    }
    if (rec.registry !== "risks" &&
        (rec.registry === "activities" || rec.registry === "strategies" || rec.level === "STRATEGY") &&
        typeof rec.title === "string" && isThreatTitle(rec.title)) {
      errors.push("Title matches a THREAT/DEFENSE concept; threats are recorded in the risks registry only, never as Strategies.");
    }
    return errors;
  }

  function validateEntry(rec) {
    var errors = validateRecord(rec);
    if (!rec || typeof rec !== "object") return errors;
    if (rec.registry === "ways") {
      errors.push("Way records arrive only through an authoritative import, not through the encyclopedia.");
    }
    if (typeof rec.title !== "string" || rec.title.trim() === "") {
      errors.push("An entry needs a non-empty title.");
    }
    if (typeof rec.definition !== "string" || rec.definition.trim() === "") {
      errors.push("An entry needs a non-empty definition.");
    }
    if (rec.aliases !== undefined) {
      if (!Array.isArray(rec.aliases) || rec.aliases.some(function (a) { return typeof a !== "string"; })) {
        errors.push("aliases must be an array of strings.");
      }
    }
    ["wayRefs", "strategyRefs"].forEach(function (field) {
      if (rec[field] !== undefined) {
        if (!Array.isArray(rec[field]) || rec[field].some(function (v) { return typeof v !== "string"; })) {
          errors.push(field + " must be an array of entry ids.");
        }
      }
    });
    // Batch B pre-import gate (additive only — no existing check above
    // was weakened or removed): level / parentRef / reference format,
    // plus the THREAT/DEFENSE walls. Existence of referenced records is
    // the loader gate's job, not this store-blind validator's.
    errors = errors.concat(levelFormatErrors(rec));
    errors = errors.concat(threatWallErrors(rec));
    return errors;
  }

  // Deep equality ignoring object key order (for same-id content
  // comparison). Primitives compare by value; arrays compare in order.
  function sameRecord(a, b) {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (!sameRecord(a[i], b[i])) return false;
      return true;
    }
    var ka = Object.keys(a).sort();
    var kb = Object.keys(b).sort();
    if (ka.length !== kb.length) return false;
    for (var j = 0; j < ka.length; j++) {
      if (ka[j] !== kb[j]) return false;
      if (!sameRecord(a[ka[j]], b[ka[j]])) return false;
    }
    return true;
  }

  // General cryptoWorld candidate validation — backup-restore integrity
  // wrapper (U5). Pure and synchronous. Validates a candidate set of
  // cryptoWorld records against the COMPLETE candidate view (existing
  // compatible records + the candidate), so a restore that reintroduces a
  // parent and its child together passes, while a restore with an orphan
  // fails as a whole. Returns [{id, reasons}]; an empty array means the
  // candidate is structurally sound.
  //
  // GENERAL integrity rules only — deliberately NOT the Batch B
  // import-contract rules: importBatch, ownerApprovalStatus,
  // workspace/globeView and strategyKind are NOT required here, and a
  // TYPE parent need only be a Major Activity (no canonicalSet demand),
  // so valid historical user data restores unchanged. Batch B-specific
  // rules live only in the loader's checkBatchBRecord.
  //
  // Checks: entry shape (validateEntry) for entries; level/parentRef
  // format + THREAT/DEFENSE walls for every record (including
  // non-entries such as taxonomy-meta, which skip only the
  // title/definition shape); parent existence + level against the
  // candidate index; relatedActivities targets resolve to Major
  // Activities; strategySources entries resolve to Type ids (id form
  // only — a title-form entry cannot resolve as an id); duplicate ids
  // within the candidate with different content. Same-id content
  // differences vs EXISTING records are NOT rejected here: a restore
  // legitimately overwrites stored records with backup content.
  function validateCryptoWorldCandidate(records, existing) {
    var problems = [];
    var index = {};
    function addToIndex(r) {
      if (r && typeof r.id === "string" && !index[r.id]) index[r.id] = r;
    }
    (existing || []).forEach(addToIndex);
    (records || []).forEach(addToIndex);
    var seen = {};
    (records || []).forEach(function (rec) {
      if (!rec || typeof rec !== "object") {
        problems.push({ id: "(no id)", reasons: ["Record must be an object."] });
        return;
      }
      var id = typeof rec.id === "string" ? rec.id : "(no id)";
      var reasons = [];
      if (typeof rec.id === "string") {
        if (seen[rec.id]) {
          if (!sameRecord(seen[rec.id], rec)) {
            reasons.push("Duplicate id \"" + rec.id + "\" with different content in the restore candidate.");
          }
        } else {
          seen[rec.id] = rec;
        }
      }
      if (isEntry(rec)) {
        reasons = reasons.concat(validateEntry(rec));
      } else {
        reasons = reasons.concat(levelFormatErrors(rec));
        reasons = reasons.concat(threatWallErrors(rec));
      }
      if ((rec.level === "TYPE" || rec.level === "STRATEGY") && typeof rec.parentRef === "string" && rec.parentRef) {
        var parent = index[rec.parentRef];
        if (!parent) {
          reasons.push(rec.level + " parent \"" + rec.parentRef + "\" does not exist in the restore candidate or the existing store.");
        } else if (rec.level === "TYPE" && parent.level !== "MAJOR_ACTIVITY") {
          reasons.push("TYPE parent \"" + rec.parentRef + "\" is a " + (parent.level || "(no level)") + ", not a Major Activity.");
        } else if (rec.level === "STRATEGY" && parent.level !== "TYPE") {
          reasons.push("STRATEGY parent \"" + rec.parentRef + "\" is a " + (parent.level || "(no level)") + ", not a Type.");
        }
      }
      (rec.relatedActivities || []).forEach(function (target) {
        var t = index[target];
        if (!t || t.level !== "MAJOR_ACTIVITY") {
          reasons.push("relatedActivities target \"" + target + "\" is not a Major Activity in the restore candidate or the existing store.");
        }
      });
      (rec.strategySources || []).forEach(function (entry) {
        var s = index[entry];
        if (!s || s.level !== "TYPE") {
          reasons.push("strategySources entry \"" + entry + "\" does not resolve to a Type in the restore candidate or the existing store.");
        }
      });
      if (reasons.length) problems.push({ id: id, reasons: reasons });
    });
    return problems;
  }

  function entriesByRegistry(records, registry) {
    return (records || []).filter(function (r) {
      return r && r.registry === registry && isEntry(r);
    });
  }

  function getEntry(records, id) {
    var found = null;
    (records || []).forEach(function (r) { if (r && r.id === id) found = r; });
    return found;
  }

  // Follows only id-based refs (chainRefs, protocolRefs, activityRefs,
  // wayRefs, strategyRefs, appliesTo) to entries that actually exist.
  // Dangling refs are reported by the caller, never invented as stubs.
  function relatedEntries(records, entry) {
    if (!entry) return [];
    var ids = [];
    ["chainRefs", "protocolRefs", "activityRefs", "wayRefs", "strategyRefs", "appliesTo"].forEach(function (field) {
      (entry[field] || []).forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });
    });
    return ids.map(function (id) { return getEntry(records, id); }).filter(function (r) { return r && isEntry(r); });
  }

  function danglingRefs(records, entry) {
    if (!entry) return [];
    var ids = [];
    ["chainRefs", "protocolRefs", "activityRefs", "wayRefs", "strategyRefs", "appliesTo"].forEach(function (field) {
      (entry[field] || []).forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });
    });
    return ids.filter(function (id) {
      var found = getEntry(records, id);
      return !found || !isEntry(found);
    });
  }

  // Local-only substring search over title, aliases, and definition.
  // Empty queries return nothing; the index lists entries instead.
  function searchEntries(records, query) {
    var q = (query || "").trim().toLowerCase();
    if (!q) return [];
    return (records || []).filter(function (r) {
      if (!r || !isEntry(r)) return false;
      var hay = (r.title + " " + (r.aliases || []).join(" ") + " " + r.definition).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  global.CryptoWorld = {
    STORE: STORE, REGISTRIES: REGISTRIES, ASSET_CLASSES: ASSET_CLASSES,
    ACTIVITY_FAMILIES: ACTIVITY_FAMILIES, MODES: MODES,
    VERIFICATION_STATES: VERIFICATION_STATES, RISK_DIMENSIONS: RISK_DIMENSIONS,
    TX_LIFECYCLE: TX_LIFECYCLE, DISCOVERY_WORKFLOW: DISCOVERY_WORKFLOW,
    DISCOVERY_END_STATES: DISCOVERY_END_STATES,
    TAXONOMY_META_ID: TAXONOMY_META_ID,
    defaultTaxonomyMeta: defaultTaxonomyMeta,
    getAllRecords: getAllRecords, getTaxonomyMeta: getTaxonomyMeta,
    ensureTaxonomyMeta: ensureTaxonomyMeta, countByRegistry: countByRegistry,
    validateRecord: validateRecord, byRegistry: byRegistry,
    protocolsByActivity: protocolsByActivity,
    activitiesByAssetClass: activitiesByAssetClass,
    chainsByAsset: chainsByAsset, risksBySubject: risksBySubject,
    capabilitiesFor: capabilitiesFor,
    isTransactionalCapability: isTransactionalCapability,
    isEntry: isEntry, validateEntry: validateEntry,
    THREAT_KINDS: THREAT_KINDS,
    THREAT_TITLE_DENYLIST: THREAT_TITLE_DENYLIST,
    normalizeThreatTitle: normalizeThreatTitle,
    isThreatTitle: isThreatTitle,
    sameRecord: sameRecord,
    validateCryptoWorldCandidate: validateCryptoWorldCandidate,
    entriesByRegistry: entriesByRegistry, getEntry: getEntry,
    relatedEntries: relatedEntries, danglingRefs: danglingRefs,
    searchEntries: searchEntries
  };
})(window);
