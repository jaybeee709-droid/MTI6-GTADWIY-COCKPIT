/* MTI6-GTADWIY-COCKPIT — Angel Identities registry (continuous development campaign)
 *
 * The Angel identity pool: canonical names an Angel Security worker may
 * be known by. This registry is SEPARATE from the Twelve Tribes and
 * must NEVER associate an Angel with a tribe: Angels are not Tribe
 * members, and no record here carries a parentTribeId or any other
 * tribe association field. Validation rejects any such field.
 *
 * Source: owner's 05:56 EST Nov 14 canonical bot identity ruling.
 * Approval is per name, with exact source provenance recorded per
 * name — NOT every angel name comes from the KJV, and this file never
 * claims otherwise:
 *   - MICHAEL — Daniel 10:13 (also Jude 1:9), KJV — APPROVED.
 *   - GABRIEL — Daniel 8:16, KJV — APPROVED.
 *   - RAPHAEL — Tobit 12:15, APOCRYPHA — APPROVED.
 *   - URIEL — 2 Esdras 4:1, APOCRYPHA — APPROVED. The ruling also
 *     allows the OTHER_OWNER_APPROVED_SCRIPTURAL_SOURCE tier for
 *     Uriel; this record keeps the ruling's primary tier APOCRYPHA
 *     and notes the allowance rather than guessing a different book.
 *   - RAGUEL, SARIEL (variant SARAQAEL), REMIEL — REQUIRES_VERIFICATION.
 *     Preserved for source verification before canonical use; never
 *     usable for live work until approved. Their source book is
 *     UNKNOWN and sourceReference is null: no source is asserted that
 *     has not been verified. Their sourceTier records the best-known
 *     candidate tier (APOCRYPHA) and is explicitly unconfirmed — the
 *     summary counts pending identities separately and does NOT fold
 *     them into the approved byTier counts.
 *
 * Truth rules enforced here (do not weaken them):
 * - Domains are categories, not assignments: every identity starts
 *   with domains [] — an Angel may work across the four security
 *   domains, and no domain is pre-assigned here. Assignment happens
 *   only through an Angel Security alert/workflow record.
 * - canAssignToWork() is a guard, not an assignment: APPROVED
 *   identities may be assigned (subject to that Angel Security
 *   record); REQUIRES_VERIFICATION identities are refused.
 * - summary() reports honest counts: byTier counts APPROVED
 *   identities only; pending identities are counted under
 *   byApprovalState and shown separately in byTierIncludingPending
 *   so the candidate tier is never presented as confirmed.
 *
 * Pure registry: no DOM, no network, no secrets, no storage, no
 * mutation of the registry at runtime. Depends on js/truth.js and
 * js/angel-security.js at load order only in the sense that this
 * module REUSES Angel Security's domain list when it is present; it
 * degrades gracefully when absent (closed fallback list, same
 * values). Load order for the page:
 *   js/truth.js -> js/angel-security.js -> js/angel-identities.js
 *
 *   AngelIdentities.SOURCE_TIERS / APPROVAL_STATES / IDENTITY_STATES
 *   AngelIdentities.listIdentities() / getIdentity(id)
 *   AngelIdentities.listApproved() / listPendingVerification()
 *   AngelIdentities.isApproved(id) / canAssignToWork(identityId)
 *   AngelIdentities.validateIdentity(identity)
 *   AngelIdentities.summary()
 */
(function (global) {
  "use strict";

  var SOURCE_TIERS = ["KJV", "APOCRYPHA",
    "OTHER_OWNER_APPROVED_SCRIPTURAL_SOURCE"];
  var APPROVAL_STATES = ["APPROVED", "REQUIRES_VERIFICATION"];
  var IDENTITY_STATES = ["ACTIVE", "PENDING_VERIFICATION"];

  // The four security domains from Angel Security (categories, not
  // assignments). Reused when Angel Security is loaded; same closed
  // list as the fallback.
  var FALLBACK_DOMAIN_IDS = ["CYBER_IDENTITY", "BLOCKCHAIN_CONTRACT",
    "FINANCIAL_WALLET", "SYSTEM_PROVIDER_INFRASTRUCTURE"];

  function domainIds() {
    if (global.AngelSecurity && Array.isArray(global.AngelSecurity.DOMAIN_IDS) &&
      global.AngelSecurity.DOMAIN_IDS.length) {
      return global.AngelSecurity.DOMAIN_IDS.slice();
    }
    return FALLBACK_DOMAIN_IDS.slice();
  }

  // Same secret pattern as AngelSecurity / BotOpsModel: keys/passwords/
  // private keys / issued tokens, not ordinary words.
  var SECRET_PATTERN = /(api[_-]?key|secret|password|passwd|private[_-]?key|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-live-[a-z0-9]+|ghp_[a-z0-9]+|github_pat_[a-z0-9_]+|xox[baprs]-[a-z0-9-]+)/i;

  // The only four names the owner ruling approves for canonical use.
  var APPROVED_NAMES = ["MICHAEL", "GABRIEL", "RAPHAEL", "URIEL"];

  // Exact approved provenance, keyed by canonical display name.
  // Validation rejects APPROVED records whose provenance differs.
  var APPROVED_PROVENANCE = {
    MICHAEL: { sourceBook: "Daniel", sourceReference: "Daniel 10:13", sourceTier: "KJV" },
    GABRIEL: { sourceBook: "Daniel", sourceReference: "Daniel 8:16", sourceTier: "KJV" },
    RAPHAEL: { sourceBook: "Tobit", sourceReference: "Tobit 12:15", sourceTier: "APOCRYPHA" },
    URIEL: { sourceBook: "2 Esdras", sourceReference: "2 Esdras 4:1", sourceTier: "APOCRYPHA" }
  };

  var PENDING_NOTE = "preserve for source verification before canonical use";

  // ---- Registry (static, frozen by construction: callers only ever
  // receive clones, and no function here mutates IDENTITIES) -----------
  var IDENTITIES = [
    {
      id: "angel-michael",
      displayName: "MICHAEL",
      variants: [],
      sourceBook: "Daniel",
      sourceReference: "Daniel 10:13",
      alsoReferencedIn: ["Jude 1:9"],
      sourceTier: "KJV",
      approvalState: "APPROVED",
      domains: [],
      state: "ACTIVE",
      provenanceNote: "Owner ruling 05:56 EST Nov 14 — canonical bot identity ruling; primary reference Daniel 10:13, also Jude 1:9."
    },
    {
      id: "angel-gabriel",
      displayName: "GABRIEL",
      variants: [],
      sourceBook: "Daniel",
      sourceReference: "Daniel 8:16",
      alsoReferencedIn: [],
      sourceTier: "KJV",
      approvalState: "APPROVED",
      domains: [],
      state: "ACTIVE",
      provenanceNote: "Owner ruling 05:56 EST Nov 14 — canonical bot identity ruling."
    },
    {
      id: "angel-raphael",
      displayName: "RAPHAEL",
      variants: [],
      sourceBook: "Tobit",
      sourceReference: "Tobit 12:15",
      alsoReferencedIn: [],
      sourceTier: "APOCRYPHA",
      approvalState: "APPROVED",
      domains: [],
      state: "ACTIVE",
      provenanceNote: "Owner ruling 05:56 EST Nov 14 — canonical bot identity ruling; APOCRYPHA source, not KJV."
    },
    {
      id: "angel-uriel",
      displayName: "URIEL",
      variants: [],
      sourceBook: "2 Esdras",
      sourceReference: "2 Esdras 4:1",
      alsoReferencedIn: [],
      sourceTier: "APOCRYPHA",
      approvalState: "APPROVED",
      domains: [],
      state: "ACTIVE",
      provenanceNote: "Owner ruling 05:56 EST Nov 14 — canonical bot identity ruling; the ruling also allows sourceTier OTHER_OWNER_APPROVED_SCRIPTURAL_SOURCE for Uriel, recorded here as APOCRYPHA (the ruling's primary tier). No different book is guessed."
    },
    {
      id: "angel-raguel",
      displayName: "RAGUEL",
      variants: [],
      sourceBook: "UNKNOWN",
      sourceReference: null,
      alsoReferencedIn: [],
      sourceTier: "APOCRYPHA",
      approvalState: "REQUIRES_VERIFICATION",
      domains: [],
      state: "PENDING_VERIFICATION",
      provenanceNote: "preserve for source verification before canonical use — candidate tier APOCRYPHA is unconfirmed; source book and reference are UNKNOWN, not asserted."
    },
    {
      id: "angel-sariel",
      displayName: "SARIEL",
      variants: ["SARAQAEL"],
      sourceBook: "UNKNOWN",
      sourceReference: null,
      alsoReferencedIn: [],
      sourceTier: "APOCRYPHA",
      approvalState: "REQUIRES_VERIFICATION",
      domains: [],
      state: "PENDING_VERIFICATION",
      provenanceNote: "preserve for source verification before canonical use — variant name SARAQAEL noted; candidate tier APOCRYPHA is unconfirmed; source book and reference are UNKNOWN, not asserted."
    },
    {
      id: "angel-remiel",
      displayName: "REMIEL",
      variants: [],
      sourceBook: "UNKNOWN",
      sourceReference: null,
      alsoReferencedIn: [],
      sourceTier: "APOCRYPHA",
      approvalState: "REQUIRES_VERIFICATION",
      domains: [],
      state: "PENDING_VERIFICATION",
      provenanceNote: "preserve for source verification before canonical use — candidate tier APOCRYPHA is unconfirmed; source book and reference are UNKNOWN, not asserted."
    }
  ];

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function findSecretField(fields) {
    for (var i = 0; i < fields.length; i++) {
      if (typeof fields[i][1] === "string" && SECRET_PATTERN.test(fields[i][1])) {
        return fields[i][0];
      }
    }
    return null;
  }

  // ---- Lookups (clones only — the registry itself is never handed out) -

  function listIdentities() {
    return IDENTITIES.map(clone);
  }

  function getIdentity(id) {
    if (typeof id !== "string") return null;
    for (var i = 0; i < IDENTITIES.length; i++) {
      if (IDENTITIES[i].id === id) return clone(IDENTITIES[i]);
    }
    return null;
  }

  function listApproved() {
    return IDENTITIES.filter(function (entry) {
      return entry.approvalState === "APPROVED";
    }).map(clone);
  }

  function listPendingVerification() {
    return IDENTITIES.filter(function (entry) {
      return entry.approvalState === "REQUIRES_VERIFICATION";
    }).map(clone);
  }

  function isApproved(id) {
    var identity = getIdentity(id);
    return !!identity && identity.approvalState === "APPROVED";
  }

  // ---- Assignment guard -------------------------------------------------

  // A guard, not an assignment: it never creates an Angel Security
  // angel or alert record. APPROVED identities may be assigned, but
  // the assignment itself still requires the Angel Security
  // alert/workflow record. REQUIRES_VERIFICATION identities are
  // refused outright — they are never usable for live work until
  // approved — and unknown ids are refused as well.
  function canAssignToWork(identityId) {
    if (typeof identityId !== "string" || !identityId) {
      return { allowed: false, identityId: identityId || null, reason: "UNKNOWN_IDENTITY" };
    }
    var identity = getIdentity(identityId);
    if (!identity) {
      return { allowed: false, identityId: identityId, reason: "UNKNOWN_IDENTITY" };
    }
    if (identity.approvalState === "REQUIRES_VERIFICATION") {
      return {
        allowed: false,
        identityId: identityId,
        reason: "REQUIRES_VERIFICATION"
      };
    }
    if (identity.approvalState === "APPROVED" && identity.state === "ACTIVE") {
      return {
        allowed: true,
        identityId: identityId,
        reason: "APPROVED — assignment still requires an Angel Security alert/workflow record; this check alone does not assign work."
      };
    }
    return {
      allowed: false,
      identityId: identityId,
      reason: "NOT_ASSIGNABLE"
    };
  }

  // ---- Validation (returns error arrays, never throws) ------------------

  // Any tribe association field is rejected: Angels are NOT members
  // of the Twelve Tribes, and this registry is SEPARATE. The field is
  // rejected whenever it is present on the record, whatever its value.
  var TRIBE_ASSOCIATION_FIELDS = ["parentTribeId", "tribeId", "tribe", "parentTribe"];

  function validateIdentity(identity) {
    var errors = [];
    if (!identity || typeof identity !== "object") {
      return ["Identity must be an object."];
    }
    var i;
    for (i = 0; i < TRIBE_ASSOCIATION_FIELDS.length; i++) {
      if (Object.prototype.hasOwnProperty.call(identity, TRIBE_ASSOCIATION_FIELDS[i])) {
        errors.push("Angels are not members of the Twelve Tribes: field " +
          TRIBE_ASSOCIATION_FIELDS[i] + " must not be present on an Angel identity.");
      }
    }
    if (!isNonEmptyString(identity.id)) {
      errors.push("id is required and must be a non-empty string.");
    } else if (identity.id.slice(0, 6) !== "angel-") {
      errors.push("id must start with \"angel-\".");
    }
    if (!isNonEmptyString(identity.displayName)) {
      errors.push("displayName is required and must be a non-empty string.");
    }
    if (identity.variants !== undefined) {
      if (!Array.isArray(identity.variants) ||
        identity.variants.some(function (v) { return typeof v !== "string"; })) {
        errors.push("variants must be an array of strings.");
      }
    }
    if (!isNonEmptyString(identity.sourceBook)) {
      errors.push("sourceBook is required and must be a non-empty string (\"UNKNOWN\" when unverified).");
    }
    if (identity.sourceReference !== null && !isNonEmptyString(identity.sourceReference)) {
      errors.push("sourceReference must be a non-empty string or null (null when unverified).");
    }
    if (SOURCE_TIERS.indexOf(identity.sourceTier) === -1) {
      errors.push("sourceTier must be one of: " + SOURCE_TIERS.join(", ") + ".");
    }
    if (APPROVAL_STATES.indexOf(identity.approvalState) === -1) {
      errors.push("approvalState must be one of: " + APPROVAL_STATES.join(", ") + ".");
    }
    if (IDENTITY_STATES.indexOf(identity.state) === -1) {
      errors.push("state must be one of: " + IDENTITY_STATES.join(", ") + ".");
    }
    if (!Array.isArray(identity.domains)) {
      errors.push("domains must be an array (empty when no domain is assigned — domains are categories, not assignments).");
    } else {
      var known = domainIds();
      for (i = 0; i < identity.domains.length; i++) {
        if (known.indexOf(identity.domains[i]) === -1) {
          errors.push("domains[" + i + "] is not a known security domain: " + identity.domains[i] + ".");
        }
      }
    }
    // Approval is per name: APPROVED is valid only for the four names
    // in the owner ruling, and only with their exact provenance.
    var upperName = isNonEmptyString(identity.displayName)
      ? identity.displayName.trim().toUpperCase() : "";
    if (identity.approvalState === "APPROVED") {
      if (APPROVED_NAMES.indexOf(upperName) === -1) {
        errors.push("approvalState APPROVED is valid only for the four owner-approved names: " +
          APPROVED_NAMES.join(", ") + ".");
      } else {
        var expected = APPROVED_PROVENANCE[upperName];
        if (identity.sourceBook !== expected.sourceBook) {
          errors.push("sourceBook for " + upperName + " must be \"" + expected.sourceBook + "\".");
        }
        if (identity.sourceReference !== expected.sourceReference) {
          errors.push("sourceReference for " + upperName + " must be \"" + expected.sourceReference + "\".");
        }
        if (identity.sourceTier !== expected.sourceTier) {
          errors.push("sourceTier for " + upperName + " must be \"" + expected.sourceTier + "\".");
        }
      }
      if (identity.state !== "ACTIVE") {
        errors.push("state must be ACTIVE for an APPROVED identity.");
      }
      if (identity.sourceReference === null) {
        errors.push("sourceReference is required (not null) for an APPROVED identity.");
      }
    }
    if (identity.approvalState === "REQUIRES_VERIFICATION") {
      if (identity.state !== "PENDING_VERIFICATION") {
        errors.push("state must be PENDING_VERIFICATION for a REQUIRES_VERIFICATION identity.");
      }
      if (!isNonEmptyString(identity.provenanceNote) ||
        identity.provenanceNote.indexOf(PENDING_NOTE) === -1) {
        errors.push("provenanceNote for a REQUIRES_VERIFICATION identity must record that it is preserved for source verification before canonical use.");
      }
      // A pending identity may carry a candidate tier, but it must not
      // assert a source book/reference it has not verified. (sourceBook
      // UNKNOWN + sourceReference null is the honest shape for all
      // three pending names in this registry.)
    }
    if (identity.alsoReferencedIn !== undefined) {
      if (!Array.isArray(identity.alsoReferencedIn) ||
        identity.alsoReferencedIn.some(function (v) { return typeof v !== "string"; })) {
        errors.push("alsoReferencedIn must be an array of strings.");
      }
    }
    var secretField = findSecretField([
      ["displayName", identity.displayName],
      ["sourceBook", identity.sourceBook],
      ["sourceReference", identity.sourceReference],
      ["provenanceNote", identity.provenanceNote]
    ]);
    if (secretField) {
      errors.push("Field " + secretField + " looks like a secret or credential and must not be stored in an identity.");
    }
    return errors;
  }

  // ---- Summary (honest counts only) -------------------------------------

  // byTier counts APPROVED identities only: a pending identity's
  // candidate tier is unconfirmed, so folding it into byTier would
  // present an unverified tier as a confirmed count. Pending
  // identities are counted under byApprovalState and shown separately
  // in byTierIncludingPending, labelled as including unverified
  // candidate tiers.
  function summary() {
    var byApprovalState = { APPROVED: 0, REQUIRES_VERIFICATION: 0 };
    var byTier = {};
    var byTierIncludingPending = {};
    var i;
    for (i = 0; i < SOURCE_TIERS.length; i++) {
      byTier[SOURCE_TIERS[i]] = 0;
      byTierIncludingPending[SOURCE_TIERS[i]] = 0;
    }
    for (i = 0; i < IDENTITIES.length; i++) {
      var entry = IDENTITIES[i];
      if (byApprovalState.hasOwnProperty(entry.approvalState)) {
        byApprovalState[entry.approvalState] += 1;
      }
      if (byTierIncludingPending.hasOwnProperty(entry.sourceTier)) {
        byTierIncludingPending[entry.sourceTier] += 1;
      }
      if (entry.approvalState === "APPROVED" && byTier.hasOwnProperty(entry.sourceTier)) {
        byTier[entry.sourceTier] += 1;
      }
    }
    return {
      total: IDENTITIES.length,
      approvedCount: byApprovalState.APPROVED,
      pendingCount: byApprovalState.REQUIRES_VERIFICATION,
      byApprovalState: byApprovalState,
      byTier: byTier,
      byTierIncludingPending: byTierIncludingPending,
      note: "byTier counts APPROVED identities only (KJV: 2, APOCRYPHA: 2). " +
        "The 3 pending identities carry an unconfirmed candidate tier and are counted " +
        "separately under REQUIRES_VERIFICATION, not in byTier."
    };
  }

  global.AngelIdentities = {
    SOURCE_TIERS: SOURCE_TIERS.slice(),
    APPROVAL_STATES: APPROVAL_STATES.slice(),
    IDENTITY_STATES: IDENTITY_STATES.slice(),
    APPROVED_NAMES: APPROVED_NAMES.slice(),
    listIdentities: listIdentities,
    getIdentity: getIdentity,
    listApproved: listApproved,
    listPendingVerification: listPendingVerification,
    isApproved: isApproved,
    canAssignToWork: canAssignToWork,
    validateIdentity: validateIdentity,
    summary: summary
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
