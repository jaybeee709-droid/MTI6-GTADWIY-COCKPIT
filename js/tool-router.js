/* MTI6-GTADWIY-COCKPIT — Tool Router (continuous development campaign)
 *
 * Governed capability/interface foundation for tools. Governance
 * metadata ONLY: no network calls, no secrets, no execution of any
 * tool, no DOM, no storage. A tool's EXISTENCE never implies
 * permission to use it: every tool starts enabled=false and
 * availability=UNAVAILABLE, and enabling requires an explicit grant
 * record { grantedBy, grantedAt, scope }.
 *
 * Vocabulary reuse (no competing vocabulary invented):
 *   - Availability values UNAVAILABLE / DISABLED come from
 *     Truth.TRUTH_STATES (truth.js). AVAILABLE is the one addition:
 *     the class/tool is in principle usable once granted.
 *   - Permissions reuse StarCommand.PERMISSIONS when star-command.js
 *     is loaded (INFORMATIONAL, NAVIGATIONAL, READ_ONLY, ASSISTED,
 *     APPROVAL_REQUIRED, TRANSACTIONAL, UNAVAILABLE), else the same
 *     closed list as a fallback. A tool's approvalRequirement mirrors
 *     StarCommand's APPROVAL_REQUIRED handling: approval-required work
 *     is never executed by this module — there is no execution path.
 *   - Secret detection reuses the bot-ops-model SECRET_PATTERN shape
 *     (keys / passwords / private keys / issued tokens), not ordinary
 *     words: a bare "token" is a legitimate crypto term and is NOT
 *     matched.
 *
 * Hard rules, in plain terms:
 *   - INFORMATIONAL never implies TRANSACTIONAL. Financial classes
 *     (DEX, aggregator, bridge, lending, staking, restaking, yield,
 *     derivatives, RWA, NFT) always REQUIRE_APPROVAL and their
 *     execution availability is UNAVAILABLE in this build: foundation
 *     only, no execution path exists.
 *   - Voice and camera tools are DISABLED by default and always
 *     REQUIRE_APPROVAL, never silently enabled — even when granted.
 *   - READ_ONLY classes (knowledge, market data) may be ALLOWED, but
 *     only when the tool is enabled AND available.
 *   - Unknown tool ids are DENIED with reason UNKNOWN_TOOL.
 *   - Every requestTool decision is appended to a bounded in-memory
 *     decision log (max 200). The log is in-memory only: it is never
 *     persisted to localStorage or IndexedDB by this module.
 *
 * Access kinds (extension): every tool class declares accessKinds
 * from the closed set READ, WRITE, FINANCIAL, NON_FINANCIAL,
 * SENSITIVE, DEVICE, NETWORK, EXTERNAL. A tool inherits its class's
 * accessKinds by default and may narrow them at registration, never
 * widen them. A class whose accessKinds include FINANCIAL must have
 * riskTier TRANSACTIONAL or APPROVAL_REQUIRED, and a READ_ONLY class
 * must not claim WRITE or FINANCIAL; registerTool rejects a record
 * whose class violates this. requestTool decisions carry the tool's
 * accessKinds and the accessKinds the request required
 * (requestedAccessKinds); a request whose intent requires WRITE on a
 * tool without WRITE, or names a FINANCIAL access kind on a tool
 * without FINANCIAL, is DENIED with reason ACCESS_KIND_MISMATCH.
 * Availability still never implies authorization, and authorization
 * never implies availability. toolsForAssignment(toolIds,
 * assignment) reports, per requested tool id, whether the assignment
 * authorises it ({ toolId, authorized, reason }); a worker receives
 * only authorised tools — unauthorised ones are listed with a reason,
 * never silently included. Assignment authorisation is scope only:
 * it does not check enabled/grant state, which requestTool still
 * enforces at use time.
 *
 * Depends on truth.js and star-command.js at load order time only in
 * the weak sense: both are consulted through typeof guards, and this
 * module degrades to its own identical fallback vocabularies when
 * either is absent. Script tag order (coordinator wiring):
 *   js/truth.js, then js/star-command.js, then js/tool-router.js.
 *
 *   ToolRouter.TOOL_CLASSES          -> [{ id, label, description,
 *                                           riskTier,
 *                                           defaultAvailability,
 *                                           accessKinds }]
 *   ToolRouter.ACCESS_KINDS          -> closed access-kind list
 *   ToolRouter.validateClassAccessKinds() -> [error strings] (empty = valid)
 *   ToolRouter.registerTool(record)  -> stored tool (throws on invalid)
 *   ToolRouter.grantTool(id, grant)  -> enabled tool (throws on invalid)
 *   ToolRouter.revokeTool(id)        -> disabled tool or null
 *   ToolRouter.getTool(id)           -> tool copy or null
 *   ToolRouter.listTools()           -> all tool copies
 *   ToolRouter.listToolsByClass(classId) -> tool copies in that class
 *   ToolRouter.requestTool(toolId, intent) -> decision object
 *   ToolRouter.toolsForAssignment(toolIds, assignment) -> [{ toolId,
 *                                           authorized, reason }]
 *   ToolRouter.summary()             -> honest counts
 *   ToolRouter.getDecisionLog() / clearDecisionLog()
 *   ToolRouter.resetRegistry()       -> clears tools + log (tests / reset)
 */
(function (global) {
  "use strict";

  // ---- Reused vocabularies (fallbacks identical to the source) --------

  var FALLBACK_PERMISSIONS = {
    INFORMATIONAL: "INFORMATIONAL",
    NAVIGATIONAL: "NAVIGATIONAL",
    READ_ONLY: "READ_ONLY",
    ASSISTED: "ASSISTED",
    APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
    TRANSACTIONAL: "TRANSACTIONAL",
    UNAVAILABLE: "UNAVAILABLE"
  };

  var FALLBACK_TRUTH_STATES = ["NOT_CONNECTED", "UNKNOWN", "UNVERIFIED",
    "STALE", "DISABLED", "UNAVAILABLE", "VERIFIED", "LIVE"];

  function permissions() {
    if (global.StarCommand && global.StarCommand.PERMISSIONS) {
      return global.StarCommand.PERMISSIONS;
    }
    return FALLBACK_PERMISSIONS;
  }

  function truthStates() {
    if (global.Truth && Array.isArray(global.Truth.TRUTH_STATES)) {
      return global.Truth.TRUTH_STATES;
    }
    return FALLBACK_TRUTH_STATES;
  }

  // ---- Closed vocabularies owned by this module ------------------------

  var RISK_TIERS = ["READ_ONLY", "ASSISTED", "APPROVAL_REQUIRED",
    "TRANSACTIONAL", "UNAVAILABLE"];

  // Availability is a capability state, not a truth claim: AVAILABLE
  // means the class/tool is in principle usable once granted;
  // UNAVAILABLE and DISABLED are Truth states (see truth.js).
  var AVAILABILITIES = ["AVAILABLE", "UNAVAILABLE", "DISABLED"];

  var DECISIONS = {
    ALLOWED: "ALLOWED",
    REQUIRES_APPROVAL: "REQUIRES_APPROVAL",
    DENIED: "DENIED"
  };

  // Closed access-kind set. What a tool may touch, independent of its
  // risk tier: READ/WRITE are the capability direction, FINANCIAL /
  // NON_FINANCIAL the money boundary, SENSITIVE the private-data
  // boundary, DEVICE the on-device hardware boundary, NETWORK /
  // EXTERNAL the off-device boundary. FINANCIAL and NON_FINANCIAL
  // never co-occur on one class.
  var ACCESS_KINDS = ["READ", "WRITE", "FINANCIAL", "NON_FINANCIAL",
    "SENSITIVE", "DEVICE", "NETWORK", "EXTERNAL"];

  // Per-class access kinds (spec mapping, extended to the classes the
  // spec's examples do not name: rpc-network reads over the network
  // like web; aggregator, RWA, and NFT are financial in the same
  // sense as DEX, so they share the DEX kinds).
  var CLASS_ACCESS_KINDS = {
    "web": ["READ", "NETWORK", "EXTERNAL"],
    "github-code": ["READ", "WRITE", "NETWORK", "EXTERNAL"],
    "files": ["READ", "WRITE"],
    "knowledge": ["READ", "NON_FINANCIAL"],
    "market-data": ["READ", "NON_FINANCIAL"],
    "wallet-data": ["READ", "SENSITIVE"],
    "rpc-network": ["READ", "NETWORK", "EXTERNAL"],
    "dex": ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"],
    "aggregator": ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"],
    "bridge": ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"],
    "lending": ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"],
    "staking": ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"],
    "restaking": ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"],
    "yield": ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"],
    "derivatives": ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"],
    "rwa": ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"],
    "nft": ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"],
    "security": ["READ", "SENSITIVE"],
    "voice": ["READ", "SENSITIVE", "DEVICE"],
    "camera": ["READ", "SENSITIVE", "DEVICE"],
    "device": ["READ", "WRITE", "SENSITIVE", "DEVICE"],
    "local-compute": ["READ", "WRITE", "NON_FINANCIAL"],
    "cloud-compute": ["READ", "WRITE", "NON_FINANCIAL", "NETWORK", "EXTERNAL"]
  };

  // The 23 tool classes. The campaign brief's test line says "22",
  // but the enumerated class list it gives contains 23 entries, so
  // the registry implements the full enumerated list (23).
  var TOOL_CLASSES = [
    { id: "web", label: "Web", description: "Web search and web reading through a connected web capability.", riskTier: "ASSISTED", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "NETWORK", "EXTERNAL"] },
    { id: "github-code", label: "GitHub / Code", description: "Repository and code-change work. Always approval-required; never executed by Star.", riskTier: "APPROVAL_REQUIRED", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "WRITE", "NETWORK", "EXTERNAL"] },
    { id: "files", label: "Files", description: "Local file read/write through an approved file capability.", riskTier: "ASSISTED", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "WRITE"] },
    { id: "knowledge", label: "Knowledge", description: "Saved knowledge and encyclopedia answers. Read-only.", riskTier: "READ_ONLY", defaultAvailability: "AVAILABLE", accessKinds: ["READ", "NON_FINANCIAL"] },
    { id: "market-data", label: "Market Data", description: "Price, market, and trading-activity data. Read-only; never a trade.", riskTier: "READ_ONLY", defaultAvailability: "AVAILABLE", accessKinds: ["READ", "NON_FINANCIAL"] },
    { id: "wallet-data", label: "Wallet Data", description: "Wallet balances and positions as data only. Read-only; no signing, no execution.", riskTier: "READ_ONLY", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "SENSITIVE"] },
    { id: "rpc-network", label: "RPC / Network", description: "Blockchain RPC and network reads through a connected node or provider.", riskTier: "ASSISTED", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "NETWORK", "EXTERNAL"] },
    { id: "dex", label: "DEX", description: "Decentralised-exchange interaction. Financial: always approval-required, execution unavailable.", riskTier: "TRANSACTIONAL", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"] },
    { id: "aggregator", label: "Aggregator", description: "Swap / route aggregation. Financial: always approval-required, execution unavailable.", riskTier: "TRANSACTIONAL", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"] },
    { id: "bridge", label: "Bridge", description: "Cross-chain bridging. Financial: always approval-required, execution unavailable.", riskTier: "TRANSACTIONAL", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"] },
    { id: "lending", label: "Lending", description: "Lending and borrowing. Financial: always approval-required, execution unavailable.", riskTier: "TRANSACTIONAL", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"] },
    { id: "staking", label: "Staking", description: "Staking. Financial: always approval-required, execution unavailable.", riskTier: "TRANSACTIONAL", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"] },
    { id: "restaking", label: "Restaking", description: "Restaking. Financial: always approval-required, execution unavailable.", riskTier: "TRANSACTIONAL", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"] },
    { id: "yield", label: "Yield", description: "Yield strategies. Financial: always approval-required, execution unavailable.", riskTier: "TRANSACTIONAL", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"] },
    { id: "derivatives", label: "Derivatives", description: "Derivatives. Financial: always approval-required, execution unavailable.", riskTier: "TRANSACTIONAL", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"] },
    { id: "rwa", label: "RWA", description: "Real-world-asset instruments. Financial: always approval-required, execution unavailable.", riskTier: "TRANSACTIONAL", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"] },
    { id: "nft", label: "NFT", description: "NFT interaction. Financial: always approval-required, execution unavailable.", riskTier: "TRANSACTIONAL", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "WRITE", "FINANCIAL", "NETWORK", "EXTERNAL"] },
    { id: "security", label: "Security", description: "Security scanning and threat monitoring. Assisted; threat knowledge never becomes transactional.", riskTier: "ASSISTED", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "SENSITIVE"] },
    { id: "voice", label: "Voice", description: "Microphone / voice input. Disabled by default; always requires owner approval, never silently enabled.", riskTier: "APPROVAL_REQUIRED", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "SENSITIVE", "DEVICE"] },
    { id: "camera", label: "Camera", description: "Camera / image capture. Disabled by default; always requires owner approval, never silently enabled.", riskTier: "APPROVAL_REQUIRED", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "SENSITIVE", "DEVICE"] },
    { id: "device", label: "Device", description: "On-device capabilities beyond voice and camera. Always requires owner approval.", riskTier: "APPROVAL_REQUIRED", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "WRITE", "SENSITIVE", "DEVICE"] },
    { id: "local-compute", label: "Local Compute", description: "On-device computation. Assisted.", riskTier: "ASSISTED", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "WRITE", "NON_FINANCIAL"] },
    { id: "cloud-compute", label: "Cloud Compute", description: "Off-device computation. Always requires owner approval.", riskTier: "APPROVAL_REQUIRED", defaultAvailability: "UNAVAILABLE", accessKinds: ["READ", "WRITE", "NON_FINANCIAL", "NETWORK", "EXTERNAL"] }
  ];

  // Financial classes: always REQUIRE_APPROVAL, execution availability
  // UNAVAILABLE in this build. The brief names DEX, bridge, lending,
  // staking, restaking, yield, derivatives; aggregator, RWA, and NFT
  // are financial in the same sense and are governed identically.
  var FINANCIAL_CLASSES = ["dex", "aggregator", "bridge", "lending",
    "staking", "restaking", "yield", "derivatives", "rwa", "nft"];

  // Media classes: always REQUIRE_APPROVAL, never silently enabled.
  var MEDIA_CLASSES = ["voice", "camera"];

  // Read-only classes: the only classes that may return ALLOWED, and
  // only when the tool is enabled AND available.
  var READ_ONLY_CLASSES = ["knowledge", "market-data", "wallet-data"];

  var DECISION_LOG_MAX = 200;

  // Words that name a financial execution (same boundary as
  // StarCommand's TRANSACTIONAL_RE, minus the send-money clause:
  // naming the action is enough for the router to refuse it on a
  // read-only tool). Asking what something is ("what is staking")
  // is a question, not an execution request, so a leading question
  // phrase with no first-person actor is not treated as execution.
  var EXECUTION_RE = /\b(buy|buying|sell|selling|trade|trading|swap|swapping|stake|staking|lend|lending|borrow|borrowing|claim|claiming|withdraw|withdrawing)\b/;
  var QUESTION_RE = /^(what|how|why|when|where|explain|tell me|define)\b/;
  var ACTOR_RE = /\b(i|me|my|mine)\b/;

  // Same secret shape as bot-ops-model.js: keys / passwords / private
  // keys / issued tokens. A bare "token" is NOT matched.
  var SECRET_PATTERN = /(api[_-]?key|secret|password|passwd|private[_-]?key|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-live-[a-z0-9]+|ghp_[a-z0-9]+|github_pat_[a-z0-9_]+|xox[baprs]-[a-z0-9-]+)/i;

  // ---- State (in-memory only; nothing is persisted) --------------------

  var tools = {}; // id -> tool record
  var decisionLog = []; // newest first, bounded to DECISION_LOG_MAX

  // ---- Helpers -----------------------------------------------------------

  function nowIso() {
    return new Date().toISOString();
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function isStringArray(value) {
    if (!Array.isArray(value)) return false;
    for (var i = 0; i < value.length; i++) {
      if (typeof value[i] !== "string") return false;
    }
    return true;
  }

  function classById(classId) {
    for (var i = 0; i < TOOL_CLASSES.length; i++) {
      if (TOOL_CLASSES[i].id === classId) return TOOL_CLASSES[i];
    }
    return null;
  }

  function isKnownClass(classId) {
    return classById(classId) !== null;
  }

  function isFinancialClass(classId) {
    return FINANCIAL_CLASSES.indexOf(classId) !== -1;
  }

  function isMediaClass(classId) {
    return MEDIA_CLASSES.indexOf(classId) !== -1;
  }

  function isKnownPermission(value) {
    var perms = permissions();
    return Object.keys(perms).indexOf(value) !== -1;
  }

  // ---- Access kinds ---------------------------------------------------------

  function isKnownAccessKind(value) {
    return ACCESS_KINDS.indexOf(value) !== -1;
  }

  // The class's declared access kinds (a copy; [] for an unknown id).
  function classAccessKinds(classId) {
    var kinds = CLASS_ACCESS_KINDS[classId];
    return kinds ? kinds.slice() : [];
  }

  // A class's accessKinds must be consistent with its riskTier: a
  // class claiming FINANCIAL must be TRANSACTIONAL or
  // APPROVAL_REQUIRED, and a READ_ONLY class must claim neither
  // WRITE nor FINANCIAL (read-only means read-only). Returns an
  // array of error strings (empty = valid). Never throws.
  function validateClassAccessKinds() {
    var errors = [];
    var i, j;
    for (i = 0; i < TOOL_CLASSES.length; i++) {
      var cls = TOOL_CLASSES[i];
      var kinds = cls.accessKinds;
      if (!Array.isArray(kinds) || kinds.length === 0 || !isStringArray(kinds)) {
        errors.push("Class " + cls.id + " must declare a non-empty accessKinds array of strings.");
        continue;
      }
      for (j = 0; j < kinds.length; j++) {
        if (!isKnownAccessKind(kinds[j])) {
          errors.push("Class " + cls.id + " declares unknown access kind " + kinds[j] + ".");
        }
      }
      if (kinds.indexOf("FINANCIAL") !== -1 &&
          cls.riskTier !== "TRANSACTIONAL" && cls.riskTier !== "APPROVAL_REQUIRED") {
        errors.push("Class " + cls.id + " claims FINANCIAL access but has riskTier " +
          cls.riskTier + " (FINANCIAL requires TRANSACTIONAL or APPROVAL_REQUIRED).");
      }
      if (cls.riskTier === "READ_ONLY" &&
          (kinds.indexOf("WRITE") !== -1 || kinds.indexOf("FINANCIAL") !== -1)) {
        errors.push("Class " + cls.id + " is READ_ONLY but claims " +
          (kinds.indexOf("WRITE") !== -1 ? "WRITE" : "FINANCIAL") + " access.");
      }
    }
    return errors;
  }

  // Copy an accessKinds array, dropping duplicates, preserving order.
  function dedupeKinds(kinds) {
    var out = [];
    for (var i = 0; i < kinds.length; i++) {
      if (out.indexOf(kinds[i]) === -1) out.push(kinds[i]);
    }
    return out;
  }

  // True when every kind in `subset` is also in `superset`.
  function kindsAreSubset(subset, superset) {
    for (var i = 0; i < subset.length; i++) {
      if (superset.indexOf(subset[i]) === -1) return false;
    }
    return true;
  }

  // Words that name a write / mutation request. "execute" is
  // deliberately NOT in this list: it is too generic (financial
  // tools use it for read-only consideration), and financial
  // execution is caught by EXECUTION_RE / the FINANCIAL kind instead.
  var WRITE_RE = /\b(write|writing|save|saving|update|updating|edit|editing|delete|deleting|create|creating|upload|uploading|store|storing|modify|modifying|deploy|deploying|commit|committing|push|pushing)\b/;
  var SEND_MONEY_RE = /\bsend\b[^.]{0,40}\b(bitcoin|btc|eth|sol|crypto|tokens?|coins?|money)\b/;

  // Normalises a requestTool intent into { text, requiredKinds,
  // unknownKinds }. Intent may be a string (the historical form) or
  // an object { text, accessKinds } / { action, accessKinds } naming
  // the kinds the request needs explicitly. Text-derived kinds use
  // the same question guard as the execution check: a definition
  // question ("what is staking") with no first-person actor names no
  // access kind.
  function normalizeIntent(intent) {
    var text = "";
    var explicitKinds = null;
    if (typeof intent === "string") {
      text = intent;
    } else if (intent && typeof intent === "object") {
      if (typeof intent.text === "string") text = intent.text;
      else if (typeof intent.action === "string") text = intent.action;
      if (Array.isArray(intent.accessKinds)) explicitKinds = intent.accessKinds.slice();
      else if (typeof intent.accessKind === "string") explicitKinds = [intent.accessKind];
    } else if (intent !== undefined && intent !== null) {
      text = String(intent);
    }
    var required = [];
    var unknown = [];
    if (explicitKinds) {
      for (var i = 0; i < explicitKinds.length; i++) {
        var kind = explicitKinds[i];
        if (typeof kind !== "string" || !isKnownAccessKind(kind)) {
          if (unknown.indexOf(String(kind)) === -1) unknown.push(String(kind));
        } else if (required.indexOf(kind) === -1) {
          required.push(kind);
        }
      }
    }
    if (text) {
      var norm = text.toLowerCase();
      var isQuestion = QUESTION_RE.test(norm);
      var hasActor = ACTOR_RE.test(norm);
      if (!isQuestion || hasActor) {
        if (WRITE_RE.test(norm) && required.indexOf("WRITE") === -1) required.push("WRITE");
        if ((EXECUTION_RE.test(norm) || SEND_MONEY_RE.test(norm)) &&
            required.indexOf("FINANCIAL") === -1) required.push("FINANCIAL");
      }
    }
    return { text: text, requiredKinds: required, unknownKinds: unknown };
  }

  function copyTool(tool) {
    if (!tool) return null;
    return {
      id: tool.id,
      classId: tool.classId,
      name: tool.name,
      description: tool.description,
      capabilities: tool.capabilities.slice(),
      accessKinds: tool.accessKinds ? tool.accessKinds.slice() : classAccessKinds(tool.classId),
      permissionRequirement: tool.permissionRequirement,
      approvalRequirement: tool.approvalRequirement,
      availability: tool.availability,
      enabled: tool.enabled,
      grant: tool.grant ? {
        grantedBy: tool.grant.grantedBy,
        grantedAt: tool.grant.grantedAt,
        scope: tool.grant.scope
      } : null
    };
  }

  // Scans the free-text fields of a record for secret-looking content.
  // Returns the offending field name, or null.
  function findSecretField(record, fields) {
    for (var i = 0; i < fields.length; i++) {
      var name = fields[i][0];
      var value = fields[i][1];
      if (typeof value === "string" && SECRET_PATTERN.test(value)) {
        return name;
      }
      if (Array.isArray(value)) {
        for (var j = 0; j < value.length; j++) {
          if (typeof value[j] === "string" && SECRET_PATTERN.test(value[j])) {
            return name + "[" + j + "]";
          }
        }
      }
    }
    return null;
  }

  // Risk tier -> StarCommand permission. READ_ONLY classes use
  // READ_ONLY; ASSISTED uses ASSISTED; APPROVAL_REQUIRED uses
  // APPROVAL_REQUIRED; TRANSACTIONAL uses TRANSACTIONAL; UNAVAILABLE
  // uses UNAVAILABLE.
  function permissionForTier(riskTier) {
    var perms = permissions();
    if (riskTier === "READ_ONLY") return perms.READ_ONLY;
    if (riskTier === "ASSISTED") return perms.ASSISTED;
    if (riskTier === "APPROVAL_REQUIRED") return perms.APPROVAL_REQUIRED;
    if (riskTier === "TRANSACTIONAL") return perms.TRANSACTIONAL;
    return perms.UNAVAILABLE;
  }

  // ---- Registry validation ------------------------------------------------

  // Returns an array of error strings (empty = valid). Never throws.
  function validateTool(record) {
    var errors = [];
    if (!record || typeof record !== "object") {
      return ["Tool record must be an object."];
    }
    if (!isNonEmptyString(record.id)) {
      errors.push("id is required and must be a non-empty string.");
    } else if (tools[record.id]) {
      errors.push("A tool with id " + record.id + " is already registered.");
    }
    if (!isNonEmptyString(record.classId)) {
      errors.push("classId is required and must be a non-empty string.");
    } else if (!isKnownClass(record.classId)) {
      errors.push("classId " + record.classId + " is not a known tool class.");
    }
    if (!isNonEmptyString(record.name)) {
      errors.push("name is required and must be a non-empty string.");
    }
    if (!isNonEmptyString(record.description)) {
      errors.push("description is required and must be a non-empty string.");
    }
    if (!Array.isArray(record.capabilities) || !isStringArray(record.capabilities)) {
      errors.push("capabilities must be an array of strings.");
    }
    if (record.permissionRequirement !== undefined &&
        record.permissionRequirement !== null &&
        !isKnownPermission(record.permissionRequirement)) {
      errors.push("permissionRequirement must be one of: " +
        Object.keys(permissions()).join(", ") + ".");
    }
    if (record.approvalRequirement !== undefined &&
        record.approvalRequirement !== null &&
        typeof record.approvalRequirement !== "boolean") {
      errors.push("approvalRequirement must be a boolean.");
    }
    if (record.availability !== undefined &&
        record.availability !== null &&
        AVAILABILITIES.indexOf(record.availability) === -1) {
      errors.push("availability must be one of: " + AVAILABILITIES.join(", ") + ".");
    }
    // A tool's existence never implies permission: a record that
    // arrives already enabled, or already available, is rejected —
    // enabling requires an explicit grant record via grantTool.
    if (record.enabled === true) {
      errors.push("A tool must be registered disabled (enabled=false); enabling requires an explicit grant via grantTool.");
    }
    if (record.availability === "AVAILABLE") {
      errors.push("A tool must be registered with availability UNAVAILABLE; availability is granted via grantTool, never at registration.");
    }
    // Access kinds: inherited from the class by default; an explicit
    // list must be a non-empty array of known kinds and a SUBSET of
    // the class's kinds — never wider. A tool claiming FINANCIAL
    // without its class allowing it is rejected here (the subset
    // check), and the class itself must be consistent with its risk
    // tier or no tool in that class can register.
    var clsForKinds = isNonEmptyString(record.classId) ? classById(record.classId) : null;
    if (clsForKinds) {
      var classKindErrors = validateClassAccessKinds();
      for (var ci = 0; ci < classKindErrors.length; ci++) {
        if (classKindErrors[ci].indexOf("Class " + clsForKinds.id + " ") === 0) {
          errors.push(classKindErrors[ci]);
        }
      }
      if (record.accessKinds !== undefined && record.accessKinds !== null) {
        if (!Array.isArray(record.accessKinds) || record.accessKinds.length === 0 ||
            !isStringArray(record.accessKinds)) {
          errors.push("accessKinds must be a non-empty array of strings (omit it to inherit the class's accessKinds).");
        } else {
          var unknownKinds = [];
          for (var ki = 0; ki < record.accessKinds.length; ki++) {
            if (!isKnownAccessKind(record.accessKinds[ki]) &&
                unknownKinds.indexOf(record.accessKinds[ki]) === -1) {
              unknownKinds.push(record.accessKinds[ki]);
            }
          }
          if (unknownKinds.length) {
            errors.push("accessKinds contains unknown access kind(s): " + unknownKinds.join(", ") +
              ". Known kinds: " + ACCESS_KINDS.join(", ") + ".");
          } else {
            var classKinds = classAccessKinds(record.classId);
            if (record.accessKinds.indexOf("FINANCIAL") !== -1 &&
                classKinds.indexOf("FINANCIAL") === -1) {
              errors.push("Tool claims FINANCIAL access, but class " + record.classId +
                " does not allow FINANCIAL access.");
            }
            if (!kindsAreSubset(record.accessKinds, classKinds)) {
              var wider = record.accessKinds.filter(function (k) {
                return classKinds.indexOf(k) === -1;
              });
              errors.push("accessKinds " + wider.join(", ") +
                " are wider than class " + record.classId + " allows (" +
                classKinds.join(", ") + "); a tool may only narrow its class's accessKinds.");
            }
          }
        }
      }
    } else if (record.accessKinds !== undefined && record.accessKinds !== null) {
      errors.push("accessKinds cannot be validated without a known classId.");
    }
    var secretField = findSecretField(record, [
      ["id", record.id],
      ["name", record.name],
      ["description", record.description],
      ["capabilities", record.capabilities]
    ]);
    if (secretField) {
      errors.push("Field " + secretField + " looks like a secret or credential and must not be stored in a tool record.");
    }
    return errors;
  }

  // Registers a tool. Defaults are fail-closed: enabled=false,
  // availability=UNAVAILABLE. Throws an Error listing every reason
  // on invalid input; nothing is stored.
  function registerTool(record) {
    var errors = validateTool(record);
    if (errors.length) {
      throw new Error("Invalid tool record: " + errors.join(" "));
    }
    var cls = classById(record.classId);
    var tool = {
      id: record.id.trim(),
      classId: record.classId,
      name: record.name.trim(),
      description: record.description.trim(),
      capabilities: record.capabilities.slice(),
      // Inherited from the class by default; an explicit list was
      // already validated as a subset, so store it de-duplicated.
      accessKinds: (record.accessKinds !== undefined && record.accessKinds !== null)
        ? dedupeKinds(record.accessKinds)
        : classAccessKinds(record.classId),
      permissionRequirement: record.permissionRequirement || permissionForTier(cls.riskTier),
      // Approval is required by default unless the caller explicitly
      // passes false AND the class tier is READ_ONLY. A caller cannot
      // register a financial / media / approval-required tool as
      // approval-free.
      approvalRequirement: (record.approvalRequirement === undefined || record.approvalRequirement === null)
        ? true
        : (cls.riskTier === "READ_ONLY" ? record.approvalRequirement : true),
      availability: "UNAVAILABLE",
      enabled: false,
      grant: null
    };
    tools[tool.id] = tool;
    return copyTool(tool);
  }

  // Validates an explicit grant record. Returns error strings.
  function validateGrant(grant) {
    var errors = [];
    if (!grant || typeof grant !== "object") {
      return ["Grant must be an object { grantedBy, grantedAt, scope }."];
    }
    if (!isNonEmptyString(grant.grantedBy)) {
      errors.push("grantedBy is required and must be a non-empty string (who granted it).");
    }
    if (!isNonEmptyString(grant.grantedAt)) {
      errors.push("grantedAt is required and must be a non-empty ISO timestamp string.");
    } else if (isNaN(Date.parse(grant.grantedAt))) {
      errors.push("grantedAt must be a valid ISO timestamp string.");
    }
    if (!isNonEmptyString(grant.scope)) {
      errors.push("scope is required and must be a non-empty string (what the grant covers).");
    }
    var secretField = findSecretField(grant, [
      ["grantedBy", grant.grantedBy],
      ["scope", grant.scope]
    ]);
    if (secretField) {
      errors.push("Grant field " + secretField + " looks like a secret or credential and must not be stored.");
    }
    return errors;
  }

  // Enables a tool under an explicit grant record. Financial classes
  // keep execution availability UNAVAILABLE even when granted:
  // granting a financial tool records that it may be *considered*,
  // never that it may execute — no execution path exists in this
  // build. Returns the updated tool copy; throws on invalid input.
  function grantTool(toolId, grant) {
    if (typeof toolId !== "string" || !tools[toolId]) {
      throw new Error("grantTool: no tool with id " + String(toolId) + " is registered.");
    }
    var errors = validateGrant(grant);
    if (errors.length) {
      throw new Error("Invalid grant: " + errors.join(" "));
    }
    var tool = tools[toolId];
    tool.enabled = true;
    tool.grant = {
      grantedBy: grant.grantedBy.trim(),
      grantedAt: grant.grantedAt.trim(),
      scope: grant.scope.trim()
    };
    // Financial execution stays UNAVAILABLE even after a grant.
    tool.availability = isFinancialClass(tool.classId) ? "UNAVAILABLE" : "AVAILABLE";
    return copyTool(tool);
  }

  // Revokes a grant: disabled and unavailable again. Returns the
  // updated tool copy, or null when the id is unknown.
  function revokeTool(toolId) {
    if (typeof toolId !== "string" || !tools[toolId]) return null;
    var tool = tools[toolId];
    tool.enabled = false;
    tool.availability = "UNAVAILABLE";
    tool.grant = null;
    return copyTool(tool);
  }

  function getTool(toolId) {
    if (typeof toolId !== "string") return null;
    return copyTool(tools[toolId] || null);
  }

  function listTools() {
    return Object.keys(tools).sort().map(function (id) {
      return copyTool(tools[id]);
    });
  }

  function listToolsByClass(classId) {
    if (!isKnownClass(classId)) return [];
    return listTools().filter(function (tool) {
      return tool.classId === classId;
    });
  }

  function listClasses() {
    return TOOL_CLASSES.map(function (cls) {
      return {
        id: cls.id,
        label: cls.label,
        description: cls.description,
        riskTier: cls.riskTier,
        defaultAvailability: cls.defaultAvailability,
        accessKinds: cls.accessKinds ? cls.accessKinds.slice() : []
      };
    });
  }

  // ---- Governance decision (pure computation) -----------------------------

  // Decides a request without side effects: the decision object only.
  // requestTool() wraps this and appends the decision to the audit log.
  function decide(toolId, intent) {
    var normalized = normalizeIntent(intent);
    var intentText = normalized.text;
    var requestedKinds = normalized.requiredKinds;
    var perms = permissions();

    if (typeof toolId !== "string" || !tools[toolId]) {
      return {
        decision: DECISIONS.DENIED,
        reason: "UNKNOWN_TOOL — no tool with id " + String(toolId) + " is registered. Nothing was executed.",
        permission: perms.UNAVAILABLE,
        approvalRequired: false,
        toolId: typeof toolId === "string" ? toolId : null,
        classId: null,
        intent: intentText,
        riskTier: null,
        availability: "UNAVAILABLE",
        accessKinds: [],
        requestedAccessKinds: requestedKinds.slice(),
        at: nowIso()
      };
    }

    var tool = tools[toolId];
    var cls = classById(tool.classId);
    var riskTier = cls ? cls.riskTier : "UNAVAILABLE";
    var toolKinds = tool.accessKinds ? tool.accessKinds.slice() : classAccessKinds(tool.classId);

    function base(decision, reason, permission, approvalRequired) {
      return {
        decision: decision,
        reason: reason,
        permission: permission,
        approvalRequired: approvalRequired,
        toolId: tool.id,
        classId: tool.classId,
        intent: intentText,
        riskTier: riskTier,
        availability: tool.availability,
        accessKinds: toolKinds.slice(),
        requestedAccessKinds: requestedKinds.slice(),
        at: nowIso()
      };
    }

    // Financial classes always REQUIRE_APPROVAL, and execution
    // availability is UNAVAILABLE in this build — foundation only,
    // no execution path exists. This outranks enabled/availability:
    // a granted financial tool still never returns ALLOWED.
    if (isFinancialClass(tool.classId)) {
      return base(DECISIONS.REQUIRES_APPROVAL,
        "Financial tool (" + cls.label + "): always requires owner approval, and execution availability is UNAVAILABLE in this build — foundation only, no execution path exists. Nothing was executed.",
        perms.TRANSACTIONAL, true);
    }

    // Voice and camera always REQUIRE_APPROVAL and are never silently
    // enabled — even when granted, the decision is approval, not use.
    if (isMediaClass(tool.classId)) {
      return base(DECISIONS.REQUIRES_APPROVAL,
        "Voice/camera tool: always requires owner approval and is never silently enabled. Nothing was captured.",
        perms.APPROVAL_REQUIRED, true);
    }

    if (!tool.enabled) {
      return base(DECISIONS.DENIED,
        "Tool " + tool.id + " is not enabled. Enabling requires an explicit grant record. Nothing was executed.",
        tool.permissionRequirement, tool.approvalRequirement);
    }

    if (tool.availability !== "AVAILABLE") {
      return base(DECISIONS.DENIED,
        "Tool " + tool.id + " is " + tool.availability + " — no capability is connected. Nothing was executed.",
        tool.permissionRequirement, tool.approvalRequirement);
    }

    // Access-kind mismatch: the request needs kinds this tool does
    // not have. Availability never implies authorization — an enabled
    // and available tool still refuses work outside its kinds. An
    // explicitly named kind that is not in the closed set can never
    // be satisfied. FINANCIAL mismatches carry TRANSACTIONAL
    // permission (naming a financial action never becomes
    // informational); other mismatches carry the tool's own
    // permission requirement.
    if (normalized.unknownKinds.length) {
      return base(DECISIONS.DENIED,
        "ACCESS_KIND_MISMATCH — the request names unknown access kind(s) " +
        normalized.unknownKinds.join(", ") + "; known kinds are " +
        ACCESS_KINDS.join(", ") + ". Nothing was executed.",
        tool.permissionRequirement, tool.approvalRequirement);
    }
    var missingKinds = requestedKinds.filter(function (kind) {
      return toolKinds.indexOf(kind) === -1;
    });
    if (missingKinds.length) {
      var financialMissing = missingKinds.indexOf("FINANCIAL") !== -1;
      return base(DECISIONS.DENIED,
        "ACCESS_KIND_MISMATCH — the request requires access kind(s) " +
        missingKinds.join(", ") + ", but tool " + tool.id + " only has " +
        toolKinds.join(", ") + ". Nothing was executed.",
        financialMissing ? perms.TRANSACTIONAL : tool.permissionRequirement,
        financialMissing ? true : tool.approvalRequirement);
    }

    // An execution-named intent on a read-only tool is refused:
    // INFORMATIONAL never implies TRANSACTIONAL.
    if (riskTier === "READ_ONLY" && intentText) {
      var norm = intentText.toLowerCase();
      var isQuestion = QUESTION_RE.test(norm);
      var hasActor = ACTOR_RE.test(norm);
      if (!isQuestion || hasActor) {
        if (EXECUTION_RE.test(norm)) {
          return base(DECISIONS.DENIED,
            "Intent names a financial execution, and tool " + tool.id + " is read-only: INFORMATIONAL never implies TRANSACTIONAL. Nothing was executed.",
            perms.TRANSACTIONAL, true);
        }
      }
    }

    if (riskTier === "READ_ONLY") {
      return base(DECISIONS.ALLOWED,
        "Read-only tool " + tool.id + " is enabled and available.",
        perms.READ_ONLY, false);
    }

    if (riskTier === "ASSISTED") {
      return base(DECISIONS.REQUIRES_APPROVAL,
        "Assisted tool " + tool.id + " is enabled and available, but assisted use requires owner approval. Nothing was executed.",
        perms.ASSISTED, true);
    }

    if (riskTier === "APPROVAL_REQUIRED") {
      return base(DECISIONS.REQUIRES_APPROVAL,
        "Tool " + tool.id + " is approval-required. Nothing was executed without owner approval.",
        perms.APPROVAL_REQUIRED, true);
    }

    if (riskTier === "TRANSACTIONAL") {
      return base(DECISIONS.REQUIRES_APPROVAL,
        "Transactional tool " + tool.id + ": execution availability is UNAVAILABLE in this build — foundation only, no execution path exists. Nothing was executed.",
        perms.TRANSACTIONAL, true);
    }

    return base(DECISIONS.DENIED,
      "Tool " + tool.id + " has risk tier UNAVAILABLE. Nothing was executed.",
      perms.UNAVAILABLE, false);
  }

  // ---- Audit log (in-memory, bounded, newest first) -----------------------

  function appendDecision(decision) {
    decisionLog.unshift({
      at: decision.at,
      toolId: decision.toolId,
      classId: decision.classId,
      intent: decision.intent,
      decision: decision.decision,
      reason: decision.reason,
      permission: decision.permission,
      approvalRequired: decision.approvalRequired,
      accessKinds: decision.accessKinds ? decision.accessKinds.slice() : [],
      requestedAccessKinds: decision.requestedAccessKinds ? decision.requestedAccessKinds.slice() : []
    });
    if (decisionLog.length > DECISION_LOG_MAX) {
      decisionLog.length = DECISION_LOG_MAX;
    }
  }

  // The public entry point. The decision itself is computed purely by
  // decide(); the only side effect is the bounded audit append.
  function requestTool(toolId, intent) {
    var decision = decide(toolId, intent);
    appendDecision(decision);
    return decision;
  }

  function getDecisionLog() {
    return decisionLog.map(function (entry) {
      var copy = {};
      var key;
      for (key in entry) {
        if (Object.prototype.hasOwnProperty.call(entry, key)) copy[key] = entry[key];
      }
      return copy;
    });
  }

  function clearDecisionLog() {
    decisionLog = [];
    return true;
  }

  // ---- Worker scoping -------------------------------------------------------

  // Reports, for each requested tool id, whether an assignment
  // authorises that tool: [{ toolId, authorized, reason }]. An
  // assignment is { accessKinds, classIds?, toolIds? }:
  //   - accessKinds (required for any authorisation): the kinds the
  //     assignment grants. A tool is authorised only when ALL of its
  //     accessKinds are granted — a worker that may read must not
  //     silently receive a tool that can also write or spend.
  //   - classIds (optional): a class whitelist; a tool outside it is
  //     unauthorised even when its kinds are granted.
  //   - toolIds (optional): an explicit tool whitelist; same rule.
  // Unauthorised tools are LISTED with a reason, never silently
  // included and never silently dropped: the caller must hand a
  // worker only the entries with authorized === true. This checks
  // assignment scope ONLY — not enabled/grant state or availability,
  // which requestTool still enforces at use time. Authorization
  // never implies availability, and availability never implies
  // authorization. Throws on a malformed call (non-array toolIds,
  // non-object assignment, unknown kinds/classes in the assignment);
  // unknown tool ids inside the list are per-entry UNAUTHORISED,
  // not thrown, because they are data, not a caller error.
  function toolsForAssignment(toolIds, assignment) {
    if (!Array.isArray(toolIds)) {
      throw new Error("toolsForAssignment: toolIds must be an array of tool id strings.");
    }
    if (!assignment || typeof assignment !== "object") {
      throw new Error("toolsForAssignment: assignment must be an object { accessKinds, classIds?, toolIds? }.");
    }
    var grantedKinds = null;
    if (assignment.accessKinds !== undefined && assignment.accessKinds !== null) {
      if (!Array.isArray(assignment.accessKinds) || !isStringArray(assignment.accessKinds)) {
        throw new Error("toolsForAssignment: assignment.accessKinds must be an array of strings.");
      }
      var unknownKinds = assignment.accessKinds.filter(function (k) {
        return !isKnownAccessKind(k);
      });
      if (unknownKinds.length) {
        throw new Error("toolsForAssignment: assignment names unknown access kind(s): " +
          unknownKinds.join(", ") + ". Known kinds: " + ACCESS_KINDS.join(", ") + ".");
      }
      grantedKinds = dedupeKinds(assignment.accessKinds);
    }
    var classWhitelist = null;
    if (assignment.classIds !== undefined && assignment.classIds !== null) {
      if (!Array.isArray(assignment.classIds) || !isStringArray(assignment.classIds)) {
        throw new Error("toolsForAssignment: assignment.classIds must be an array of strings.");
      }
      var unknownClasses = assignment.classIds.filter(function (c) {
        return !isKnownClass(c);
      });
      if (unknownClasses.length) {
        throw new Error("toolsForAssignment: assignment names unknown class(es): " +
          unknownClasses.join(", ") + ".");
      }
      classWhitelist = assignment.classIds.slice();
    }
    var toolWhitelist = null;
    if (assignment.toolIds !== undefined && assignment.toolIds !== null) {
      if (!Array.isArray(assignment.toolIds) || !isStringArray(assignment.toolIds)) {
        throw new Error("toolsForAssignment: assignment.toolIds must be an array of strings.");
      }
      toolWhitelist = assignment.toolIds.slice();
    }
    return toolIds.map(function (id) {
      if (typeof id !== "string" || !tools[id]) {
        return {
          toolId: typeof id === "string" ? id : null,
          authorized: false,
          reason: "UNKNOWN_TOOL — no tool with id " + String(id) + " is registered, so it cannot be assigned."
        };
      }
      var tool = tools[id];
      if (grantedKinds === null) {
        return {
          toolId: id,
          authorized: false,
          reason: "Assignment grants no access kinds, so tool " + id + " (" + tool.accessKinds.join(", ") + ") is not authorised for it."
        };
      }
      var missing = tool.accessKinds.filter(function (kind) {
        return grantedKinds.indexOf(kind) === -1;
      });
      if (missing.length) {
        return {
          toolId: id,
          authorized: false,
          reason: "Tool " + id + " requires access kind(s) " + missing.join(", ") +
            ", which the assignment does not grant (granted: " +
            (grantedKinds.length ? grantedKinds.join(", ") : "none") + ")."
        };
      }
      if (classWhitelist && classWhitelist.indexOf(tool.classId) === -1) {
        return {
          toolId: id,
          authorized: false,
          reason: "Tool " + id + " is class " + tool.classId + ", which is outside the assignment's allowed classes (" + classWhitelist.join(", ") + ")."
        };
      }
      if (toolWhitelist && toolWhitelist.indexOf(id) === -1) {
        return {
          toolId: id,
          authorized: false,
          reason: "Tool " + id + " is not in the assignment's allowed tool list."
        };
      }
      return {
        toolId: id,
        authorized: true,
        reason: "Authorised: tool access kinds (" + tool.accessKinds.join(", ") +
          ") are within the assignment's granted kinds (" + grantedKinds.join(", ") +
          "). Authorisation is not availability — use still requires an enabled grant and AVAILABLE status."
      };
    });
  }

  // ---- Summary (honest counts only) ---------------------------------------

  function summary() {
    var byClass = {};
    var byAvailability = { AVAILABLE: 0, UNAVAILABLE: 0, DISABLED: 0 };
    var byRiskTier = {};
    var byAccessKind = {};
    var i, j;
    for (i = 0; i < TOOL_CLASSES.length; i++) byClass[TOOL_CLASSES[i].id] = 0;
    for (i = 0; i < RISK_TIERS.length; i++) byRiskTier[RISK_TIERS[i]] = 0;
    for (i = 0; i < ACCESS_KINDS.length; i++) byAccessKind[ACCESS_KINDS[i]] = 0;
    var enabledTools = 0;
    var ids = Object.keys(tools);
    for (i = 0; i < ids.length; i++) {
      var tool = tools[ids[i]];
      if (byClass.hasOwnProperty(tool.classId)) byClass[tool.classId] += 1;
      if (byAvailability.hasOwnProperty(tool.availability)) {
        byAvailability[tool.availability] += 1;
      }
      var kinds = tool.accessKinds || classAccessKinds(tool.classId);
      for (j = 0; j < kinds.length; j++) {
        if (byAccessKind.hasOwnProperty(kinds[j])) byAccessKind[kinds[j]] += 1;
      }
      var cls = classById(tool.classId);
      if (cls && byRiskTier.hasOwnProperty(cls.riskTier)) {
        byRiskTier[cls.riskTier] += 1;
      }
      if (tool.enabled) enabledTools += 1;
    }
    return {
      totalTools: ids.length,
      enabledTools: enabledTools,
      totalClasses: TOOL_CLASSES.length,
      byClass: byClass,
      byAvailability: byAvailability,
      byRiskTier: byRiskTier,
      byAccessKind: byAccessKind,
      decisionLogEntries: decisionLog.length,
      decisionLogMax: DECISION_LOG_MAX,
      note: ids.length === 0
        ? "No tools are registered — a fresh registry has no enabled tools and nothing is available."
        : (byAvailability.UNAVAILABLE + byAvailability.DISABLED) + " of " + ids.length +
          " registered tool(s) are UNAVAILABLE or DISABLED; only AVAILABLE tools can return ALLOWED, and only for read-only classes."
    };
  }

  // Clears the registry and the decision log. Intended for tests and
  // for an owner-directed reset; it never touches any other module.
  function resetRegistry() {
    tools = {};
    decisionLog = [];
    return true;
  }

  global.ToolRouter = {
    TOOL_CLASSES: listClasses(),
    RISK_TIERS: RISK_TIERS.slice(),
    AVAILABILITIES: AVAILABILITIES.slice(),
    ACCESS_KINDS: ACCESS_KINDS.slice(),
    DECISIONS: DECISIONS,
    FINANCIAL_CLASSES: FINANCIAL_CLASSES.slice(),
    MEDIA_CLASSES: MEDIA_CLASSES.slice(),
    READ_ONLY_CLASSES: READ_ONLY_CLASSES.slice(),
    DECISION_LOG_MAX: DECISION_LOG_MAX,
    PERMISSIONS: permissions(),
    TRUTH_STATES: truthStates(),
    listClasses: listClasses,
    classAccessKinds: classAccessKinds,
    validateClassAccessKinds: validateClassAccessKinds,
    registerTool: registerTool,
    validateTool: validateTool,
    grantTool: grantTool,
    revokeTool: revokeTool,
    getTool: getTool,
    listTools: listTools,
    listToolsByClass: listToolsByClass,
    requestTool: requestTool,
    toolsForAssignment: toolsForAssignment,
    decide: decide,
    summary: summary,
    getDecisionLog: getDecisionLog,
    clearDecisionLog: clearDecisionLog,
    resetRegistry: resetRegistry
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
