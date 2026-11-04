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

  function isTransactionalCapability(cap) {
    return !!cap && cap.mode === "TRANSACTIONAL" && cap.verificationStatus === "VERIFIED";
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
    return errors;
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
    entriesByRegistry: entriesByRegistry, getEntry: getEntry,
    relatedEntries: relatedEntries, danglingRefs: danglingRefs,
    searchEntries: searchEntries
  };
})(window);
