/* MTI6-GTADWIY-COCKPIT — Risk Intelligence foundation (Crypto spec C3, §99-10)
 *
 * Risk profiles for assets, opportunities, positions, protocols and
 * networks. Read-only reference layer: it records what is known about
 * risk, never moves assets, never signs anything, never connects a
 * wallet, never promises income, and never executes anything.
 *
 * Load order: js/risk-intelligence.js AFTER js/truth.js and
 * js/crypto-world.js. The canonical risk-dimension vocabulary is
 * reused from CryptoWorld.RISK_DIMENSIONS when loaded; the identical
 * 19-item list is the fallback when it is not. No competing
 * vocabulary is ever invented here.
 *
 * RISK IS MULTIDIMENSIONAL BY DESIGN. There is deliberately NO
 * single-score function on this module — no score, riskScore,
 * overallScore, rating, or any function that compresses a profile
 * into one unexplained number. A profile is a per-dimension record
 * of PRESENT / ABSENT / UNKNOWN with detail, evidence and a check
 * time, and profileSummary() lists every dimension with its state.
 * A count of states (how many PRESENT / ABSENT / UNKNOWN) is a
 * transparent tally, never a rating.
 *
 * Rules, fail-closed throughout:
 *   - The working set is EXACTLY the canonical vocabulary (19
 *     dimensions from Part 1). A dimension key outside it is
 *     rejected by createProfile(), never silently added.
 *   - The Crypto spec's 18 risk dimensions are reconciled against
 *     the canonical vocabulary in RECONCILIATION (see
 *     listReconciliation()). MAPPED entries name their canonical
 *     dimension; UNMAPPED entries are recorded as notes only and
 *     NEVER become new canonical dimensions.
 *   - The 3 D6-approved dimensions (SLASHING, OPERATIONAL,
 *     COMPOSABILITY) land with Batch D only. They are recorded in
 *     PENDING_DIMENSIONS as pending, and are NOT in the working set
 *     and NOT usable as dimension keys until Batch D lands.
 *   - A PRESENT dimension requires evidence: a detail string AND a
 *     checkedAt time. A PRESENT claim without both is NOT stored as
 *     PRESENT; it is stored as UNKNOWN with a note saying why.
 *   - No dimension ever carries a numeric score. Fields named
 *     score / riskScore / rating / weight / probability / severity
 *     are rejected wherever they appear in a profile.
 *   - No secret-looking fields (seed, mnemonic, private key, API
 *     key, password, secret) are accepted in a profile.
 *   - Unknown data displays UNKNOWN — never an invented value.
 *   - INFORMATIONAL never implies TRANSACTIONAL. Recording a risk
 *     is not authorization or capability to act on it.
 *   - Pure functions plus one in-memory profile list: no DOM, no
 *     network, no secrets, no storage. Profiles live only for the
 *     life of the page load.
 */
var RiskIntelligence = (function (global) {
  "use strict";

  // ---- Canonical risk-dimension vocabulary (Part 1, 19) ------------
  // Reused from CryptoWorld.RISK_DIMENSIONS when loaded; this identical
  // list is the fallback when it is not. This is the ONLY vocabulary
  // createProfile() accepts as dimension keys.
  var FALLBACK_RISK_DIMENSIONS = ["Market risk", "Volatility risk",
    "Liquidation risk", "Smart-contract risk", "Oracle risk",
    "Bridge risk", "Chain/network risk", "Validator risk",
    "Counterparty/custody risk", "Stablecoin/depeg risk",
    "Liquidity risk", "Impermanent-loss risk", "Governance risk",
    "Token risk", "Protocol risk", "Approval/allowance risk",
    "Transaction/gas risk", "Regulatory/restriction status",
    "Data-source risk"];

  var SUBJECT_TYPES = ["asset", "opportunity", "position", "protocol",
    "network"];
  var DIMENSION_STATES = ["PRESENT", "ABSENT", "UNKNOWN"];

  // ---- D6-approved dimensions: PENDING, never in the working set ----
  // Owner-approved to join the risk-dimension vocabulary with Batch D
  // only (dimensions, never scores). Recorded here so the intent is
  // not lost, and NOT added to the working set: until Batch D lands,
  // none of these may be used as a dimension key.
  var PENDING_DIMENSIONS = [
    { code: "SLASHING", status: "PENDING_BATCH_D",
      note: "D6-approved. Joins the risk-dimension vocabulary with Batch D only; not a usable dimension key until then." },
    { code: "OPERATIONAL", status: "PENDING_BATCH_D",
      note: "D6-approved. Joins the risk-dimension vocabulary with Batch D only; not a usable dimension key until then." },
    { code: "COMPOSABILITY", status: "PENDING_BATCH_D",
      note: "D6-approved. Joins the risk-dimension vocabulary with Batch D only; not a usable dimension key until then." }
  ];

  // ---- Reconciliation: spec dimensions vs canonical vocabulary -----
  // The Crypto spec names 18 risk dimensions. 13 map cleanly onto the
  // canonical vocabulary; 5 do not. UNMAPPED entries are notes, not new
  // dimensions: nothing here extends the canonical vocabulary.
  //
  //   market            -> Market risk               (MAPPED)
  //   liquidity         -> Liquidity risk            (MAPPED)
  //   smart-contract    -> Smart-contract risk       (MAPPED)
  //   protocol          -> Protocol risk             (MAPPED)
  //   bridge            -> Bridge risk               (MAPPED)
  //   oracle            -> Oracle risk               (MAPPED)
  //   issuer            -> UNMAPPED (no issuer dimension)
  //   stablecoin/depeg  -> Stablecoin/depeg risk     (MAPPED)
  //   counterparty      -> Counterparty/custody risk (MAPPED)
  //   liquidation       -> Liquidation risk          (MAPPED)
  //   slashing          -> UNMAPPED (D6 SLASHING pending Batch D)
  //   governance        -> Governance risk           (MAPPED)
  //   network           -> Chain/network risk        (MAPPED)
  //   provider/data     -> Data-source risk          (MAPPED)
  //   regulatory/access -> Regulatory/restriction status (MAPPED)
  //   concentration     -> UNMAPPED (no concentration dimension)
  //   operational       -> UNMAPPED (D6 OPERATIONAL pending Batch D)
  //   unknown           -> UNMAPPED ("unknown" is a state, not a dimension)
  var RECONCILIATION = [
    { specDimension: "market", canonicalDimension: "Market risk",
      status: "MAPPED", note: "" },
    { specDimension: "liquidity", canonicalDimension: "Liquidity risk",
      status: "MAPPED", note: "" },
    { specDimension: "smart-contract",
      canonicalDimension: "Smart-contract risk",
      status: "MAPPED", note: "" },
    { specDimension: "protocol", canonicalDimension: "Protocol risk",
      status: "MAPPED", note: "" },
    { specDimension: "bridge", canonicalDimension: "Bridge risk",
      status: "MAPPED", note: "" },
    { specDimension: "oracle", canonicalDimension: "Oracle risk",
      status: "MAPPED", note: "" },
    { specDimension: "issuer", canonicalDimension: null,
      status: "UNMAPPED",
      note: "No canonical issuer dimension. Nearest is \"Token risk\" (token structure), which is not issuer behaviour; the two are not conflated." },
    { specDimension: "stablecoin/depeg",
      canonicalDimension: "Stablecoin/depeg risk",
      status: "MAPPED", note: "" },
    { specDimension: "counterparty",
      canonicalDimension: "Counterparty/custody risk",
      status: "MAPPED", note: "" },
    { specDimension: "liquidation",
      canonicalDimension: "Liquidation risk",
      status: "MAPPED", note: "" },
    { specDimension: "slashing", canonicalDimension: null,
      status: "UNMAPPED",
      note: "No canonical slashing dimension yet. D6-approved SLASHING joins the vocabulary with Batch D only; until then it is recorded here as pending, not used." },
    { specDimension: "governance", canonicalDimension: "Governance risk",
      status: "MAPPED", note: "" },
    { specDimension: "network", canonicalDimension: "Chain/network risk",
      status: "MAPPED", note: "" },
    { specDimension: "provider/data",
      canonicalDimension: "Data-source risk",
      status: "MAPPED",
      note: "Provider/data risk is recorded against the canonical Data-source risk dimension." },
    { specDimension: "regulatory/access",
      canonicalDimension: "Regulatory/restriction status",
      status: "MAPPED",
      note: "Regulatory/access risk is recorded against the canonical Regulatory/restriction status dimension." },
    { specDimension: "concentration", canonicalDimension: null,
      status: "UNMAPPED",
      note: "No canonical concentration dimension. Concentration is not folded into another dimension; it stays unmapped until the owner adds it to the vocabulary." },
    { specDimension: "operational", canonicalDimension: null,
      status: "UNMAPPED",
      note: "No canonical operational dimension yet. D6-approved OPERATIONAL joins the vocabulary with Batch D only; until then it is recorded here as pending, not used." },
    { specDimension: "unknown", canonicalDimension: null,
      status: "UNMAPPED",
      note: "\"unknown\" is a dimension STATE (UNKNOWN), not a dimension. Every canonical dimension can be UNKNOWN; there is no separate unknown dimension." }
  ];

  // ---- Dimensions relevant per subject type (fixed mapping) ---------
  // Each list is a subset of the canonical vocabulary, in canonical
  // order. The mapping is fixed and documented, not inferred:
  //   asset       — what the asset itself exposes its holder to.
  //   opportunity — what taking the opportunity would expose the
  //                 owner to, including execution and exit risks.
  //   position    — what an existing holding is exposed to right now.
  //   protocol    — what the protocol's design and operation expose
  //                 its users to (includes Validator risk: a protocol
  //                 depends on its validators).
  //   network     — what the chain/network itself exposes its users
  //                 to (includes Validator risk and Bridge risk: a
  //                 network is judged with its validators and its
  //                 bridges to other networks).
  // Validator risk appears only for protocol and network: an asset,
  // opportunity or position does not itself run validators.
  // Impermanent-loss risk appears only for opportunity and position:
  // it is a property of providing liquidity, not of an asset, a
  // protocol, or a network on its own.
  var SUBJECT_DIMENSIONS = {
    asset: ["Market risk", "Volatility risk", "Liquidity risk",
      "Token risk", "Stablecoin/depeg risk", "Smart-contract risk",
      "Protocol risk", "Counterparty/custody risk",
      "Regulatory/restriction status", "Data-source risk",
      "Chain/network risk", "Transaction/gas risk"],
    opportunity: ["Market risk", "Volatility risk", "Liquidity risk",
      "Impermanent-loss risk", "Liquidation risk",
      "Smart-contract risk", "Oracle risk", "Bridge risk",
      "Protocol risk", "Governance risk", "Token risk",
      "Stablecoin/depeg risk", "Approval/allowance risk",
      "Transaction/gas risk", "Regulatory/restriction status",
      "Data-source risk", "Counterparty/custody risk"],
    position: ["Market risk", "Volatility risk", "Liquidation risk",
      "Liquidity risk", "Impermanent-loss risk",
      "Smart-contract risk", "Oracle risk", "Bridge risk",
      "Counterparty/custody risk", "Stablecoin/depeg risk",
      "Approval/allowance risk", "Transaction/gas risk",
      "Chain/network risk", "Governance risk", "Token risk",
      "Protocol risk"],
    protocol: ["Smart-contract risk", "Oracle risk", "Protocol risk",
      "Governance risk", "Bridge risk", "Validator risk",
      "Chain/network risk", "Token risk", "Stablecoin/depeg risk",
      "Liquidity risk", "Approval/allowance risk", "Data-source risk",
      "Regulatory/restriction status", "Counterparty/custody risk"],
    network: ["Chain/network risk", "Validator risk", "Bridge risk",
      "Oracle risk", "Transaction/gas risk", "Data-source risk",
      "Regulatory/restriction status", "Liquidity risk",
      "Governance risk", "Protocol risk"]
  };

  // Same secret-key parts as js/knowledge-model.js (normalised the
  // same way: lowercased, dashes/underscores/spaces stripped,
  // substring match). A profile must never carry a secret.
  var SECRET_KEY_PARTS = ["seed", "mnemonic", "privatekey", "apikey",
    "apisecret", "password", "secret"];

  // Numeric-rating field names. Risk is dimensions, never a number:
  // any of these, wherever it appears in a profile, rejects it.
  // (Kept module-private: no key on the exported object contains
  // this vocabulary, so no caller can mistake the module for one
  // that rates risk.)
  var FORBIDDEN_RATING_FIELDS = ["score", "riskscore", "rating",
    "weight", "probability", "severity"];

  // In-memory profile list only. Nothing is persisted.
  var profiles = [];
  var nextProfileNumber = 1;

  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim() !== "";
  }

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeKey(k) {
    return String(k).toLowerCase().replace(/[-_\s]+/g, "");
  }

  function hasSecretKey(obj) {
    var found = null;
    Object.keys(obj || {}).forEach(function (k) {
      var n = normalizeKey(k);
      SECRET_KEY_PARTS.forEach(function (part) {
        if (n.indexOf(part) !== -1) found = k;
      });
    });
    return found;
  }

  function hasForbiddenRatingField(obj) {
    var found = null;
    Object.keys(obj || {}).forEach(function (k) {
      if (FORBIDDEN_RATING_FIELDS.indexOf(normalizeKey(k)) !== -1) {
        found = k;
      }
    });
    return found;
  }

  // The working set: exactly the canonical vocabulary. CryptoWorld is
  // the authority when loaded; the fallback is byte-identical.
  function canonicalDimensions() {
    if (global.CryptoWorld &&
        Array.isArray(global.CryptoWorld.RISK_DIMENSIONS) &&
        global.CryptoWorld.RISK_DIMENSIONS.length) {
      return global.CryptoWorld.RISK_DIMENSIONS.slice();
    }
    return FALLBACK_RISK_DIMENSIONS.slice();
  }

  function listReconciliation() {
    return clone(RECONCILIATION);
  }

  function pendingDimensions() {
    return clone(PENDING_DIMENSIONS);
  }

  // Fixed per-subject-type mapping (see SUBJECT_DIMENSIONS above).
  // Returns null for an unknown subject type. Every returned
  // dimension is in the canonical working set.
  function dimensionsFor(subjectType) {
    if (SUBJECT_TYPES.indexOf(subjectType) === -1) return null;
    var known = canonicalDimensions();
    return SUBJECT_DIMENSIONS[subjectType].filter(function (d) {
      return known.indexOf(d) !== -1;
    });
  }

  // Store-blind shape/vocabulary validation. A PRESENT claim without
  // evidence is NOT an error here: createProfile downgrades it to
  // UNKNOWN with a note (see normalizeDimensionEntry). Duplicate
  // profileId is createProfile's job, not this function's.
  function validateProfile(input) {
    var errors = [];
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return ["Profile must be an object."];
    }
    var badRating = hasForbiddenRatingField(input);
    if (badRating) {
      errors.push("Profiles never carry a numeric rating: field \"" +
        badRating + "\" is not allowed.");
    }
    var badSecret = hasSecretKey(input);
    if (badSecret) {
      errors.push("Secret field not allowed in a risk profile: \"" +
        badSecret + "\".");
    }
    if (input.profileId !== undefined &&
        (typeof input.profileId !== "string")) {
      errors.push("profileId must be a string when supplied (empty means assign one on create).");
    }
    if (SUBJECT_TYPES.indexOf(input.subjectType) === -1) {
      errors.push("subjectType must be one of: " +
        SUBJECT_TYPES.join(", ") + ".");
    }
    if (!isNonEmptyString(input.subjectId)) {
      errors.push("subjectId must be a non-empty string.");
    }
    if (input.assessedBy !== undefined &&
        typeof input.assessedBy !== "string") {
      errors.push("assessedBy must be a string.");
    }
    if (input.assessedAt !== undefined &&
        typeof input.assessedAt !== "string") {
      errors.push("assessedAt must be a string.");
    }
    var dims = input.dimensions;
    if (dims !== undefined) {
      if (!dims || typeof dims !== "object" || Array.isArray(dims)) {
        errors.push("dimensions must be an object keyed by canonical risk dimension.");
      } else {
        var known = canonicalDimensions();
        Object.keys(dims).forEach(function (dim) {
          if (known.indexOf(dim) === -1) {
            errors.push("Unknown risk dimension: \"" + dim + "\". " +
              "Dimensions must come from the canonical vocabulary; nothing is silently added.");
            return;
          }
          var entry = dims[dim];
          if (!entry || typeof entry !== "object" ||
              Array.isArray(entry)) {
            errors.push("Dimension \"" + dim + "\" must be an object " +
              "with state, detail, evidence and checkedAt.");
            return;
          }
          var entryRating = hasForbiddenRatingField(entry);
          if (entryRating) {
            errors.push("Dimension \"" + dim + "\" must not carry a " +
              "numeric rating field: \"" + entryRating + "\".");
          }
          var entrySecret = hasSecretKey(entry);
          if (entrySecret) {
            errors.push("Dimension \"" + dim + "\" must not carry a " +
              "secret field: \"" + entrySecret + "\".");
          }
          if (DIMENSION_STATES.indexOf(entry.state) === -1) {
            errors.push("Dimension \"" + dim + "\" has unknown state \"" +
              entry.state + "\"; state must be PRESENT, ABSENT or UNKNOWN.");
          }
          ["detail", "evidence", "checkedAt", "note"].forEach(function (f) {
            if (entry[f] !== undefined && typeof entry[f] !== "string") {
              errors.push("Dimension \"" + dim + "\" field \"" + f +
                "\" must be a string.");
            }
          });
        });
      }
    }
    return errors;
  }

  // Normalizes one supplied dimension entry into the stored shape.
  // PRESENT needs evidence — a detail string AND a checkedAt time.
  // Without both it is stored as UNKNOWN with a note, never as
  // PRESENT. ABSENT without a check time is stored as ABSENT with a
  // note that it is unchecked until a check time is recorded.
  function normalizeDimensionEntry(entry) {
    var out = { state: "UNKNOWN", detail: "", evidence: "",
      checkedAt: "", note: "" };
    if (!entry || typeof entry !== "object") return out;
    out.detail = typeof entry.detail === "string" ? entry.detail : "";
    out.evidence = typeof entry.evidence === "string" ? entry.evidence : "";
    out.checkedAt = typeof entry.checkedAt === "string" ? entry.checkedAt : "";
    if (entry.state === "PRESENT") {
      if (isNonEmptyString(out.detail) && isNonEmptyString(out.checkedAt)) {
        out.state = "PRESENT";
      } else {
        out.state = "UNKNOWN";
        out.note = "Claimed PRESENT without evidence (a detail string " +
          "and checkedAt are both required); recorded as UNKNOWN.";
      }
    } else if (entry.state === "ABSENT") {
      out.state = "ABSENT";
      if (!isNonEmptyString(out.checkedAt)) {
        out.note = "ABSENT claimed without a checkedAt time; treat as " +
          "unchecked until a check time is recorded.";
      }
    } else {
      out.state = "UNKNOWN";
      if (isNonEmptyString(entry.note)) out.note = entry.note;
    }
    return out;
  }

  function unassessedEntry() {
    return { state: "UNKNOWN", detail: "", evidence: "", checkedAt: "",
      note: "Not assessed in this profile." };
  }

  // Creates and stores a profile. Returns { ok: true, profile } on
  // success or { ok: false, errors } on failure. The stored profile
  // carries an entry for EVERY canonical dimension (unassessed ones
  // are UNKNOWN), so a summary never silently omits a dimension.
  // profileId is assigned ("risk-profile-N") when empty or absent.
  function createProfile(input) {
    var errors = validateProfile(input);
    var profileId = "";
    if (input && typeof input.profileId === "string") {
      profileId = input.profileId.trim();
    }
    if (!profileId) profileId = "risk-profile-" + (nextProfileNumber++);
    if (getProfile(profileId)) {
      errors.push("A profile with profileId \"" + profileId +
        "\" already exists.");
    }
    if (errors.length) return { ok: false, errors: errors };
    var dims = {};
    var supplied = (input && input.dimensions) || {};
    canonicalDimensions().forEach(function (dim) {
      dims[dim] = supplied[dim] ?
        normalizeDimensionEntry(supplied[dim]) : unassessedEntry();
    });
    var profile = {
      profileId: profileId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      dimensions: dims,
      assessedAt: isNonEmptyString(input.assessedAt) ?
        input.assessedAt : new Date().toISOString(),
      assessedBy: isNonEmptyString(input.assessedBy) ?
        input.assessedBy : "UNKNOWN"
    };
    profiles.push(clone(profile));
    return { ok: true, profile: clone(profile) };
  }

  function getProfile(profileId) {
    var found = null;
    profiles.forEach(function (p) {
      if (p.profileId === profileId) found = p;
    });
    return found ? clone(found) : null;
  }

  function listProfiles() {
    return clone(profiles);
  }

  // In-memory reset (tests / fresh assessment runs). Nothing is
  // persisted anywhere, so this only clears the page-load list.
  function clearProfiles() {
    profiles = [];
    nextProfileNumber = 1;
  }

  // A profile-shaped object with every dimension UNKNOWN. Not stored
  // and not validated: pass it to createProfile() to store it (an
  // empty profileId means one is assigned on create).
  function blankProfile(subjectType, subjectId) {
    var dims = {};
    canonicalDimensions().forEach(function (dim) {
      dims[dim] = unassessedEntry();
    });
    return {
      profileId: "",
      subjectType: subjectType,
      subjectId: subjectId,
      dimensions: dims,
      assessedAt: "",
      assessedBy: "UNKNOWN"
    };
  }

  // Per-dimension summary. Lists EVERY canonical dimension with its
  // state, detail, evidence, check time and note, plus a transparent
  // tally of states (counts.present / counts.absent /
  // counts.unknown). The tally is a count of states, not a rating:
  // there is no single number that stands for the profile, and no
  // key on the returned object carries one. Returns null for an
  // unknown profileId.
  function profileSummary(profileId) {
    var profile = getProfile(profileId);
    if (!profile) return null;
    var dims = canonicalDimensions().map(function (dim) {
      var e = profile.dimensions[dim] || unassessedEntry();
      return { dimension: dim, state: e.state, detail: e.detail,
        evidence: e.evidence, checkedAt: e.checkedAt, note: e.note };
    });
    var counts = { present: 0, absent: 0, unknown: 0 };
    dims.forEach(function (d) {
      if (d.state === "PRESENT") counts.present += 1;
      else if (d.state === "ABSENT") counts.absent += 1;
      else counts.unknown += 1;
    });
    var notes = dims.filter(function (d) { return d.note; })
      .map(function (d) { return d.dimension + ": " + d.note; });
    return {
      profileId: profile.profileId,
      subjectType: profile.subjectType,
      subjectId: profile.subjectId,
      assessedAt: profile.assessedAt,
      assessedBy: profile.assessedBy,
      dimensions: dims,
      counts: counts,
      notes: notes
    };
  }

  var api = {
    RISK_DIMENSIONS: FALLBACK_RISK_DIMENSIONS,
    SUBJECT_TYPES: SUBJECT_TYPES,
    DIMENSION_STATES: DIMENSION_STATES,
    PENDING_DIMENSIONS: PENDING_DIMENSIONS,
    RECONCILIATION: RECONCILIATION,
    canonicalDimensions: canonicalDimensions,
    listReconciliation: listReconciliation,
    pendingDimensions: pendingDimensions,
    dimensionsFor: dimensionsFor,
    validateProfile: validateProfile,
    createProfile: createProfile,
    getProfile: getProfile,
    listProfiles: listProfiles,
    blankProfile: blankProfile,
    profileSummary: profileSummary,
    clearProfiles: clearProfiles
  };

  global.RiskIntelligence = api;
  return api;
})(typeof globalThis !== "undefined" ? globalThis :
  (typeof window !== "undefined" ? window : this));
