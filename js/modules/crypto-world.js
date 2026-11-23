/* MTI6-GTADWIY-COCKPIT — Crypto World command-center screen (Crypto spec C9, §99-20 UI pass)
 * Renders the Crypto World from js/crypto-world.js and the loaded
 * encyclopedia registries: the 60-way taxonomy status, activity
 * families, per-registry counts, and a Major Activity → Type →
 * Strategy drill-down — all derived from real records only. No
 * network calls, no wallet, no transactions, no prices, no balances,
 * no promised returns. If the local store cannot be read, the screen
 * says so honestly and the rest of the app is unaffected.
 *
 * Command-center rules, enforced here:
 *   - The 60 Major Activities are the stable backbone (canonical
 *     data); Types / Strategies come from the Batch B records (738).
 *     Counts are real, from the loaded registries — never invented.
 *   - STANDARD / ADVANCED / ALL are PRESENTATION filters on the ONE
 *     canonical Encyclopedia: STANDARD shows titles + counts only,
 *     ADVANCED adds definitions, verification status and source, ALL
 *     is ADVANCED plus the full registry/family listings below.
 *     They never select a different taxonomy — there is only one.
 *   - The drill-down stops at Strategy. Actions / Sub-actions are
 *     NOT imported (Batch C/D/E are not authorized), and the screen
 *     says so at the Strategy level instead of inventing them.
 *   - Parallel modules (PositionIntelligence, CostIntelligence,
 *     RiskIntelligence, ProtocolIntelligence, MarketIntelligence and
 *     the rest) are consumed only through defensive global checks:
 *     a module that is not loaded renders its section as NOT LOADED
 *     and never crashes the screen. Only the spec's field names are
 *     used, behind typeof guards.
 *   - Nothing is dumped in bulk: the drill-down lists one level at
 *     a time, with a search filter on Major Activities, and long
 *     reference lists are counts, not hundreds of rows.
 * Rendering only — all taxonomy, validation, and storage live in
 * crypto-world.js. Analytics is untouched by this screen.
 *
 * Pure data builders (no DOM) are exported on the module object for
 * tests: buildTaxonomyIndex, buildDrillDown, buildOverview,
 * buildModuleStates, buildFreshness, buildAngelSummary,
 * buildBotSummary, buildOpportunitySummary.
 *
 * Stage 2 tab switcher: OVERVIEW is the default tab and renders the
 * whole screen stacked, exactly as before — the tabs filter from
 * ALL. Each other tab shows only its section(s). The default stays
 * stacked so the render smoke test's assertions (60 majors, the
 * NOT LOADED sections, freshness, knowledge) hold without touching
 * the test: the test file lives outside this worker's edit scope.
 * Drill-down levels carry real breadcrumbs, relationship chips
 * (family / verification / source, ADVANCED and ALL only — STANDARD
 * stays titles + counts), a source/verification panel, and an
 * "Open in Encyclopedia" link per item to #/encyclopedia/<id>.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  var VIEW_KEY = "mti6_cryptoworld_view_v1";
  var VIEW_FILTERS = ["STANDARD", "ADVANCED", "ALL"];
  var ACTIONS_NOT_IMPORTED_NOTE =
    "Actions and Sub-actions are not imported — Batch C/D/E are not authorized, " +
    "so the drill-down stops at Strategy. No Action or Sub-action record exists in this build.";

  var viewFilter = "ALL";
  var searchQuery = "";
  var selectedMajorId = null;
  var selectedTypeId = null;
  var currentRoot = null;
  var activitiesListBox = null;

  // Entity pipeline surface state (P4). Filters are presentation only,
  // scoped to this surface: candidates are searchable ONLY here, never
  // in general search (design §24).
  var pipelineStageFilter = "ALL";
  var pipelineKindFilter = "ALL";
  var pipelineQuery = "";
  var pipelineStatus = "";
  var OWNER_ACTOR = { type: "OWNER", ref: "owner" };

  // Stage 2 tab switcher. OVERVIEW is the default and renders the
  // whole screen stacked (tabs filter from ALL); every other tab
  // shows only its section(s). Tab ids are the section tags used in
  // render(); "overview" is also the tag for the overview panel,
  // the 60-way taxonomy, freshness, and the reference sections.
  var TABS = [
    { id: "overview", label: "OVERVIEW" },
    { id: "activities", label: "ACTIVITIES" },
    { id: "assets", label: "ASSETS" },
    { id: "networks", label: "NETWORKS" },
    { id: "protocols", label: "PROTOCOLS" },
    { id: "pipeline", label: "PIPELINE" },
    { id: "positions", label: "POSITIONS" },
    { id: "opportunities", label: "OPPORTUNITIES" },
    { id: "risk", label: "RISK" },
    { id: "costs", label: "COSTS" },
    { id: "bots", label: "BOTS" },
    { id: "security", label: "SECURITY" }
  ];
  var activeTab = "overview";

  try {
    var savedView = (typeof localStorage !== "undefined") ? localStorage.getItem(VIEW_KEY) : null;
    if (savedView && VIEW_FILTERS.indexOf(savedView) !== -1) viewFilter = savedView;
  } catch (e) {}

  function setViewFilter(next) {
    if (VIEW_FILTERS.indexOf(next) === -1) return;
    viewFilter = next;
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(VIEW_KEY, next);
    } catch (e) {}
  }

  // Call fn only when it is a function; swallow errors and return null.
  // A module that fails to answer renders as unavailable, never as a
  // crash of the whole screen.
  function safeCall(fn) {
    try {
      return (typeof fn === "function") ? fn() : null;
    } catch (e) {
      return null;
    }
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function meta(text) {
    return U.el("div", { class: "api-meta" }, text);
  }

  function panel(title, children) {
    var kids = [U.el("h3", {}, title)].concat(children || []);
    return U.el("div", { class: "api-panel" }, kids);
  }

  function row(label, value) {
    return U.el("div", { class: "status-row" }, [
      U.el("span", {}, label),
      U.el("span", { class: "status-value" }, value)
    ]);
  }

  function section(title, body) {
    return U.el("div", { class: "api-panel" }, [
      U.el("h2", { class: "api-title" }, title),
      U.el("div", { class: "api-meta" }, body)
    ]);
  }

  function labelList(items) {
    var list = U.el("ul", { class: "price-offer-list" });
    items.forEach(function (t) { list.appendChild(U.el("li", {}, t)); });
    return list;
  }

  function notLoadedLine(name, what) {
    return name + ": NOT LOADED — " + what + " is unavailable in this build.";
  }

  // ---- Pure data builders (no DOM) --------------------------------------

  // Index the loaded records into the taxonomy spine: the 60 Major
  // Activities (canonical backbone), Types under each Major, Strategies
  // under each Type. Counts are real; a Major with no Types is listed
  // with a count of 0, never hidden and never padded.
  function buildTaxonomyIndex(records) {
    var recs = Array.isArray(records) ? records : [];
    var majors = [];
    var typesByMajor = {};
    var strategiesByType = {};
    var familyTitles = {};
    var typeCount = 0;
    var strategyCount = 0;
    var verifiedCount = 0;
    recs.forEach(function (r) {
      if (!r || typeof r !== "object") return;
      if (r.verificationStatus === "VERIFIED") verifiedCount++;
      if (r.level === "FAMILY" && typeof r.id === "string" && typeof r.title === "string") {
        familyTitles[r.id] = r.title;
      }
      if (r.level === "MAJOR_ACTIVITY") {
        majors.push(r);
      } else if (r.level === "TYPE") {
        typeCount++;
        var parent = typeof r.parentRef === "string" ? r.parentRef : "";
        (typesByMajor[parent] = typesByMajor[parent] || []).push(r);
      } else if (r.level === "STRATEGY") {
        strategyCount++;
        var tparent = typeof r.parentRef === "string" ? r.parentRef : "";
        (strategiesByType[tparent] = strategiesByType[tparent] || []).push(r);
      }
    });
    return {
      majors: majors,
      typesByMajor: typesByMajor,
      strategiesByType: strategiesByType,
      familyTitles: familyTitles,
      counts: {
        majors: majors.length,
        types: typeCount,
        strategies: strategyCount,
        verified: verifiedCount,
        total: recs.length
      }
    };
  }

  function strategiesUnderMajor(index, majorId) {
    var total = 0;
    (index.typesByMajor[majorId] || []).forEach(function (t) {
      total += (index.strategiesByType[t.id] || []).length;
    });
    return total;
  }

  function matchesQuery(record, query) {
    var q = (query || "").trim().toLowerCase();
    if (!q) return true;
    var hay = ((record.title || "") + " " + ((record.aliases || []).join(" "))).toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function drillItem(record, childCount, childKind, filter, family) {
    return {
      id: record.id,
      title: record.title || record.id,
      definition: (filter === "ADVANCED" || filter === "ALL") ? (record.definition || "") : "",
      verificationStatus: record.verificationStatus || "UNKNOWN",
      source: (filter === "ADVANCED" || filter === "ALL") ? (record.source || "") : "",
      importBatch: (filter === "ADVANCED" || filter === "ALL") ? (record.importBatch || "") : "",
      family: family || "",
      childCount: childCount,
      childKind: childKind
    };
  }

  // Pure drill-down state for one level. selection is
  // { majorId, typeId } (both null = Major Activities list).
  // filter is STANDARD / ADVANCED / ALL; query filters Major
  // Activities by title/alias substring only. The drill-down stops
  // at Strategy: the strategies level always carries the honest
  // "Actions/Sub-actions not imported" note.
  function buildDrillDown(index, selection, filter, query) {
    var sel = selection || {};
    var f = VIEW_FILTERS.indexOf(filter) !== -1 ? filter : "ALL";
    var majorId = typeof sel.majorId === "string" ? sel.majorId : null;
    var typeId = typeof sel.typeId === "string" ? sel.typeId : null;

    // Resolve a Major Activity's family id to its Batch A family
    // title when the family record is loaded; otherwise the raw
    // family id is the honest value. Types and Strategies carry no
    // family of their own — they inherit their Major Activity's.
    function familyLabelFor(record) {
      if (!record || typeof record.primaryFamily !== "string" || !record.primaryFamily) return "";
      return (index.familyTitles && index.familyTitles[record.primaryFamily]) || record.primaryFamily;
    }

    if (majorId) {
      var major = null;
      index.majors.forEach(function (m) { if (m.id === majorId) major = m; });
      if (!major) {
        return {
          level: "majors", major: null, type: null, breadcrumb: null,
          items: index.majors.filter(function (m) { return matchesQuery(m, query); })
            .map(function (m) { return drillItem(m, (index.typesByMajor[m.id] || []).length, "Types", f, familyLabelFor(m)); }),
          note: "The selected Major Activity is not in the loaded records — showing all Major Activities."
        };
      }
      if (typeId) {
        var type = null;
        (index.typesByMajor[majorId] || []).forEach(function (t) { if (t.id === typeId) type = t; });
        if (!type) {
          return {
            level: "types", major: major, type: null, breadcrumb: "All Major Activities",
            items: (index.typesByMajor[majorId] || []).map(function (t) {
              return drillItem(t, (index.strategiesByType[t.id] || []).length, "Strategies", f, familyLabelFor(major));
            }),
            note: "The selected Type is not under \"" + (major.title || majorId) + "\" — showing its Types."
          };
        }
        return {
          level: "strategies", major: major, type: type,
          breadcrumb: "Types under " + (major.title || majorId),
          items: (index.strategiesByType[typeId] || []).map(function (s) {
            return drillItem(s, 0, "Actions", f, familyLabelFor(major));
          }),
          note: ACTIONS_NOT_IMPORTED_NOTE
        };
      }
      return {
        level: "types", major: major, type: null, breadcrumb: "All Major Activities",
        items: (index.typesByMajor[majorId] || []).map(function (t) {
          return drillItem(t, (index.strategiesByType[t.id] || []).length, "Strategies", f, familyLabelFor(major));
        }),
        note: (index.typesByMajor[majorId] || []).length === 0
          ? "No Types are recorded under \"" + (major.title || majorId) + "\" — nothing is recorded, not a guess."
          : ""
      };
    }
    return {
      level: "majors", major: null, type: null, breadcrumb: null,
      items: index.majors.filter(function (m) { return matchesQuery(m, query); })
        .map(function (m) {
          var item = drillItem(m, (index.typesByMajor[m.id] || []).length, "Types", f, familyLabelFor(m));
          item.strategyCount = strategiesUnderMajor(index, m.id);
          return item;
        }),
      note: ""
    };
  }

  // Overview counts from the loaded records and the registry counts.
  function buildOverview(records, counts, metaRec) {
    var index = buildTaxonomyIndex(records);
    return {
      registryCounts: counts || {},
      majors: index.counts.majors,
      types: index.counts.types,
      strategies: index.counts.strategies,
      verified: index.counts.verified,
      totalRecords: index.counts.total,
      taxonomyStatus: metaRec ? (metaRec.status || "UNKNOWN") : "UNKNOWN",
      taxonomyImported: metaRec ? (metaRec.importedCategoryCount || 0) : 0,
      taxonomyExpected: metaRec ? (metaRec.expectedCategoryCount || 60) : 60
    };
  }

  // Availability of every parallel module this screen reads, probed
  // defensively: a missing global is NOT LOADED, never a crash, and a
  // global without the expected function is reported the same way.
  var MODULE_PROBES = [
    { name: "CryptoWorld", fn: "getAllRecords", what: "encyclopedia records" },
    { name: "EncyclopediaBridge", fn: "getRecord", what: "encyclopedia lookups" },
    { name: "AssetIntelligence", fn: "listClasses", what: "asset classification" },
    { name: "NetworkIntelligence", fn: null, what: "network reference data" },
    { name: "OpportunityIntelligence", fn: "listOpportunities", what: "opportunity records" },
    { name: "PositionIntelligence", fn: null, what: "position records" },
    { name: "CostIntelligence", fn: null, what: "cost records" },
    { name: "RiskIntelligence", fn: null, what: "risk records" },
    { name: "ProtocolIntelligence", fn: null, what: "protocol records" },
    { name: "MarketIntelligence", fn: null, what: "market data" },
    { name: "AngelSecurity", fn: "summary", what: "security alerts" },
    { name: "BotOpsModel", fn: "summary", what: "bot task state" },
    { name: "Truth", fn: "labelFor", what: "truth vocabulary" }
  ];

  function buildModuleStates() {
    return MODULE_PROBES.map(function (probe) {
      var mod = global[probe.name];
      var loaded = !!mod && (!probe.fn || typeof mod[probe.fn] === "function");
      return {
        name: probe.name,
        loaded: loaded,
        note: loaded ? (probe.name + ": loaded.") : notLoadedLine(probe.name, probe.what)
      };
    });
  }

  function moduleLoaded(name, fn) {
    var mod = global[name];
    return !!mod && (!fn || typeof mod[fn] === "function");
  }

  // Freshness of the loaded records: how many carry a source, how
  // many carry a last-checked timestamp, how many are verified. No
  // live freshness check runs here — this is per-record state only.
  function buildFreshness(records) {
    var recs = Array.isArray(records) ? records : [];
    var withSource = 0;
    var withLastChecked = 0;
    var verified = 0;
    var unverified = 0;
    recs.forEach(function (r) {
      if (!r || typeof r !== "object") return;
      if (typeof r.source === "string" && r.source) withSource++;
      if (typeof r.lastChecked === "string" && r.lastChecked) withLastChecked++;
      if (r.verificationStatus === "VERIFIED") verified++;
      else unverified++;
    });
    return {
      total: recs.length,
      withSource: withSource,
      withLastChecked: withLastChecked,
      verified: verified,
      unverified: unverified,
      note: "No live freshness check has run in this session — freshness below is per-record source and last-checked state only."
    };
  }

  // Angel Security summary for this screen. NO_ALERTS honestly when
  // the alert store is empty; real alerts listed with severity /
  // state / affectedSystem when present. No fabricated alerts. When
  // AngelSecurity is not loaded the state is UNKNOWN — never claimed
  // clear.
  function buildAngelSummary() {
    var fallback = {
      available: false, state: "UNKNOWN", count: 0,
      confirmedCount: 0, unconfirmedCount: 0, angels: 0, alerts: [],
      note: "AngelSecurity: NOT LOADED — security alerts are unavailable in this build."
    };
    if (!moduleLoaded("AngelSecurity", "summary")) return fallback;
    var s = safeCall(function () { return global.AngelSecurity.summary(); });
    if (!isObject(s)) {
      fallback.note = "Angel Security summary could not be read — alert state is unknown, not clear.";
      return fallback;
    }
    var alerts = [];
    if (typeof global.AngelSecurity.listAlerts === "function") {
      var raw = safeCall(function () { return global.AngelSecurity.listAlerts(); });
      if (Array.isArray(raw)) {
        alerts = raw.map(function (a) {
          return {
            id: a.id, title: a.title, severity: a.severity, state: a.state,
            affectedSystem: a.affectedSystem, domain: a.domain, detectedAt: a.detectedAt
          };
        });
      }
    }
    return {
      available: true,
      state: s.state || (s.count === 0 ? "NO_ALERTS" : "ALERTS_PRESENT"),
      count: typeof s.count === "number" ? s.count : alerts.length,
      confirmedCount: typeof s.confirmedCount === "number" ? s.confirmedCount : 0,
      unconfirmedCount: typeof s.unconfirmedCount === "number" ? s.unconfirmedCount : 0,
      angels: typeof s.angels === "number" ? s.angels : 0,
      alerts: alerts,
      note: typeof s.note === "string" ? s.note : ""
    };
  }

  // Bot task state: real stored task counts from BotOpsModel, plus
  // worker assignments recorded on opportunities. Active workers are
  // always the model's own honest count (0 / NOT_CONNECTED until a
  // real worker runtime exists) — never derived from a queued task.
  function buildBotSummary() {
    var out = {
      available: false, totalTasks: 0, active: 0, byState: {},
      assignedOpportunities: 0, totalOpportunities: 0,
      note: "BotOpsModel: NOT LOADED — bot task state is unavailable in this build."
    };
    if (moduleLoaded("BotOpsModel", "summary")) {
      var s = safeCall(function () { return global.BotOpsModel.summary(); });
      if (isObject(s)) {
        out.available = true;
        out.totalTasks = typeof s.total === "number" ? s.total : 0;
        out.active = typeof s.active === "number" ? s.active : 0;
        out.byState = isObject(s.byState) ? s.byState : {};
        out.note = typeof s.note === "string" ? s.note : "";
      } else {
        out.note = "BotOpsModel is loaded, but its summary could not be read — state UNKNOWN.";
      }
    }
    if (moduleLoaded("OpportunityIntelligence", "listOpportunities")) {
      var opps = safeCall(function () { return global.OpportunityIntelligence.listOpportunities(); });
      if (Array.isArray(opps)) {
        out.totalOpportunities = opps.length;
        var assigned = 0;
        opps.forEach(function (o) { if (o && o.workerAssignment) assigned++; });
        out.assignedOpportunities = assigned;
      }
    }
    return out;
  }

  // Opportunity state: the list starts EMPTY in OpportunityIntelligence
  // and gains entries only through addOpportunity(). A count of 0 is
  // honest — no opportunity is seeded, invented, or implied. Costs on
  // recorded opportunities are UNKNOWN unless sourced; no return, APY,
  // profit, or yield figure is ever shown.
  function buildOpportunitySummary() {
    var out = {
      available: false, count: 0, assigned: 0,
      costsUnknown: 0, costsSourced: 0,
      note: "OpportunityIntelligence: NOT LOADED — opportunity records are unavailable in this build."
    };
    if (!moduleLoaded("OpportunityIntelligence", "listOpportunities")) return out;
    var opps = safeCall(function () { return global.OpportunityIntelligence.listOpportunities(); });
    if (!Array.isArray(opps)) {
      out.note = "OpportunityIntelligence is loaded, but its opportunity list could not be read.";
      return out;
    }
    out.available = true;
    out.count = opps.length;
    opps.forEach(function (o) {
      if (!o) return;
      if (o.workerAssignment) out.assigned++;
      (Array.isArray(o.costs) ? o.costs : []).forEach(function (c) {
        if (c && c.value !== undefined && c.value !== null) out.costsSourced++;
        else out.costsUnknown++;
      });
    });
    out.note = out.count === 0
      ? "No opportunities are recorded — the opportunity list starts empty and gains entries only through a validated import. No opportunity is shown, implied, or promised."
      : out.count + " opportunity record(s). Costs are UNKNOWN unless sourced; no return, APY, profit, or yield figure is recorded or shown.";
    return out;
  }

  // Entity pipeline summary (P4): real counts from the candidate
  // records — candidates are proposals, never canonical, and this
  // surface is the ONLY place they are visible (design §22/§24).
  // Stage counts include the gate-owned stages (GATED / REGISTERED)
  // alongside the P3 stages and terminals.
  var PIPELINE_STAGES = ["DISCOVERED", "IDENTIFIED", "DEDUPED", "CLASSIFIED",
    "RESOLVED", "MAPPED", "PREPARED", "GATED", "REGISTERED", "REJECTED", "DUPLICATE"];
  function buildPipelineSummary(candidates, frozenBatches) {
    var byStage = {};
    PIPELINE_STAGES.forEach(function (s) { byStage[s] = 0; });
    var stale = 0;
    var ECmod = global.EntityCandidates;
    (Array.isArray(candidates) ? candidates : []).forEach(function (c) {
      if (!c) return;
      if (byStage.hasOwnProperty(c.pipelineStage)) byStage[c.pipelineStage]++;
      if (ECmod && typeof ECmod.isStale === "function" && safeCall(function () { return ECmod.isStale(c); })) stale++;
    });
    var frozen = 0, imported = 0;
    (Array.isArray(frozenBatches) ? frozenBatches : []).forEach(function (b) {
      if (!b) return;
      if (b.status === "FROZEN") frozen++;
      if (b.status === "IMPORTED") imported++;
    });
    return {
      total: Array.isArray(candidates) ? candidates.length : 0,
      byStage: byStage,
      stale: stale,
      frozenBatches: frozen,
      importedBatches: imported,
      prepared: byStage.PREPARED || 0
    };
  }

  function pipelineFilterCandidates(candidates) {
    var q = pipelineQuery.trim().toLowerCase();
    return (Array.isArray(candidates) ? candidates : []).filter(function (c) {
      if (!c) return false;
      if (pipelineStageFilter !== "ALL" && c.pipelineStage !== pipelineStageFilter) return false;
      if (pipelineKindFilter !== "ALL" && c.proposedKind !== pipelineKindFilter) return false;
      if (!q) return true;
      var hay = ((c.proposedName || "") + " " + (c.id || "") + " " +
        ((c.aliases || []).join(" ")) + " " + (c.ticker || "") + " " +
        ((c.resolution && c.resolution.canonicalId) || "")).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  // ---- Entity pipeline surface (P4) ----------------------------------
  // Candidates + the owner authority gate. Everything renders through
  // U.el text paths — candidate names/evidence are user-supplied text
  // and are never injected as HTML (design §28). Actions follow the
  // Item 8 pattern: on failure only the status line changes (inputs
  // survive); on success the screen re-renders from real records.
  var pipelineStatusEl = null;
  function pipelineFail(errors) {
    pipelineStatus = "Not done: " + (Array.isArray(errors) ? errors.join(" ") : String(errors));
    if (pipelineStatusEl) pipelineStatusEl.textContent = pipelineStatus;
  }
  function pipelineDone(message) {
    pipelineStatus = message;
    if (currentRoot) render(currentRoot);
  }
  function runPipelineAction(promise, successMessage) {
    Promise.resolve(promise).then(function (res) {
      if (res && res.ok) pipelineDone(successMessage);
      else pipelineFail(res && res.errors ? res.errors : ["Unknown failure."]);
    }).catch(function (e) { pipelineFail([e && e.message ? e.message : String(e)]); });
  }
  function pipeField(labelText, input) {
    return U.el("div", { class: "api-meta", style: "margin-top:8px" }, [
      U.el("div", {}, labelText), input
    ]);
  }
  function pipeText(placeholder) {
    return U.el("input", { class: "price-input", type: "text", placeholder: placeholder });
  }
  function pipeSelect(values) {
    var sel = U.el("select", { class: "price-input" }, []);
    values.forEach(function (v) { sel.appendChild(U.el("option", { value: v }, v)); });
    return sel;
  }
  function pipeBtn(label, onClick) {
    var b = U.el("button", { class: "btn btn-secondary btn-sm", type: "button" }, label);
    b.addEventListener("click", onClick);
    return b;
  }
  function splitList(s) {
    return String(s || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function pipelineCandidateBlock(c) {
    var EC = global.EntityCandidates;
    var kids = [];
    kids.push(U.el("h4", {}, (c.proposedName || c.id) + " — " + (c.proposedKind || "?") + " · " + c.pipelineStage));
    kids.push(meta("Candidate: " + c.id + " · Type: " + (c.candidateType || "NEW_ENTITY") +
      (c.targetCanonicalId ? " · Target: " + c.targetCanonicalId : "") +
      " · Truth: " + (c.truthState || "UNVERIFIED") + " (candidates are always UNVERIFIED)"));
    kids.push(meta("Proposed canonical id: " + ((c.resolution && c.resolution.canonicalId) || c.proposedId || "not resolved yet") +
      ((c.resolution && c.resolution.confidence) ? " (" + c.resolution.confidence + ")" : "")));
    var dd = c.dedupe || {};
    kids.push(meta("Dedupe: " + (dd.verdict || "NOT_RUN") +
      (dd.matchedCanonicalId ? " · matches canonical " + dd.matchedCanonicalId : "") +
      (dd.matchedCandidateId ? " · matches candidate " + dd.matchedCandidateId : "") +
      (dd.checkedBy ? " · checked by " + dd.checkedBy : "")));
    var ev = Array.isArray(c.evidence) ? c.evidence : [];
    kids.push(meta("Evidence: " + ev.length + (ev.length
      ? " — " + ev.map(function (e) { return e.kind + ": " + e.ref; }).join("; ")
      : " — none attached. Absence of evidence caps a candidate below PREPARED.")));
    kids.push(meta("Identity signals: " + ((c.identitySignals || []).length) +
      " · Discovered by " + (c.discoveredBy ? c.discoveredBy.type + ":" + c.discoveredBy.ref : "UNKNOWN") +
      " at " + (c.discoveredAt || "UNKNOWN") +
      (EC && EC.isStale(c) ? " · STALE (over " + EC.STALE_DAYS + " days in the pipeline)" : "")));
    if (c.pipelineStage === "REJECTED" && c.rejection) {
      kids.push(meta("Rejected by " + c.rejection.by + ": " + c.rejection.reason));
    }
    if (c.preparedBatchRef) kids.push(meta("Batch: " + c.preparedBatchRef));
    var actions = [];
    function act(label, fn) { actions.push(pipeBtn(label, fn)); }
    if (EC) {
      if (c.pipelineStage === "DISCOVERED") {
        act("Mark IDENTIFIED", function () {
          runPipelineAction(EC.transitionCandidate(c.id, "IDENTIFIED", OWNER_ACTOR, {}), c.id + " is IDENTIFIED.");
        });
      } else if (c.pipelineStage === "IDENTIFIED") {
        act("Run dedupe", function () {
          runPipelineAction(EC.runDedupe(c.id, OWNER_ACTOR), "Dedupe ran for " + c.id + ".");
        });
      } else if (c.pipelineStage === "DEDUPED") {
        act("Classify", function () {
          runPipelineAction(EC.transitionCandidate(c.id, "CLASSIFIED", OWNER_ACTOR, {}), c.id + " is CLASSIFIED.");
        });
      } else if (c.pipelineStage === "CLASSIFIED") {
        act("Resolve identity (propose only)", function () {
          runPipelineAction(EC.resolveIdentity(c.id, OWNER_ACTOR, {}), "Identity proposed for " + c.id + " — propose mode only, nothing registered.");
        });
      } else if (c.pipelineStage === "RESOLVED") {
        var targetsIn = pipeText("Draft targets: canonical ids, comma-separated");
        targetsIn.value = (c.networkRefs || []).join(", ");
        kids.push(pipeField("Relationship draft targets (existing canonical ids or canonical-60 majors only)", targetsIn));
        act("Map relationships (drafts only)", function () {
          var drafts = splitList(targetsIn.value).map(function (t) { return { type: "REF", targetId: t }; });
          runPipelineAction(EC.mapRelationships(c.id, drafts, OWNER_ACTOR), c.id + " is MAPPED (drafts only — not live edges).");
        });
      } else if (c.pipelineStage === "MAPPED") {
        act("Prepare for the gate", function () {
          runPipelineAction(EC.transitionCandidate(c.id, "PREPARED", OWNER_ACTOR, {}), c.id + " is PREPARED — it is now in the authority gate review list.");
        });
      } else if (c.pipelineStage === "PREPARED") {
        kids.push(meta("PREPARED — waiting in the authority gate review list below. PREPARED is not REGISTERED and not VERIFIED."));
      } else if (c.pipelineStage === "GATED") {
        kids.push(meta("GATED — frozen into " + (c.preparedBatchRef || "a batch") + ". Registration happens only when the owner imports that batch through the two-phase gate."));
      } else if (c.pipelineStage === "REGISTERED") {
        kids.push(meta("REGISTERED through the two-phase import gate as part of " + (c.preparedBatchRef || "a frozen batch") + ". Truth remains UNVERIFIED."));
      }
    }
    if (actions.length) {
      kids.push(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, actions));
    }
    return U.el("div", { class: "api-panel" }, kids);
  }

  function pipelineIntakePanel() {
    var EC = global.EntityCandidates;
    var nameIn = pipeText("Entity name, e.g. Drift Protocol");
    var kindSel = pipeSelect(["PROTOCOL", "ASSET", "NETWORK"]);
    var tickerIn = pipeText("Ticker (assets only)");
    var categoryIn = pipeText("Category (protocols, e.g. DEX, LENDING, BRIDGE)");
    var networksIn = pipeText("Network refs, comma-separated canonical ids");
    var aliasesIn = pipeText("Aliases, comma-separated");
    var formerIn = pipeText("Former name (rebrands only)");
    var anchorAddrIn = pipeText("Contract / mint address (optional anchor)");
    var anchorNetIn = pipeText("Anchor network ref (required with an address)");
    var anchorKindSel = pipeSelect(["contract", "mint"]);
    var signalTypeIn = pipeText("Identity signal type"); signalTypeIn.value = "OFFICIAL_DOC";
    var signalValueIn = pipeText("Identity signal — what identifies it");
    var signalSourceIn = pipeText("Identity signal source (citation)");
    var evKindSel = pipeSelect(EC ? EC.EVIDENCE_KINDS : ["OWNER_STATEMENT"]);
    var evRefIn = pipeText("Evidence reference — URL, id, or owner note (optional at intake)");
    var submit = pipeBtn("Record candidate at DISCOVERED", function () {
      var draft = {
        proposedKind: kindSel.value,
        proposedName: nameIn.value.trim(),
        aliases: splitList(aliasesIn.value),
        networkRefs: splitList(networksIn.value),
        identitySignals: []
      };
      if (tickerIn.value.trim()) draft.ticker = tickerIn.value.trim();
      if (categoryIn.value.trim()) draft.category = categoryIn.value.trim();
      if (formerIn.value.trim()) draft.formerName = formerIn.value.trim();
      if (anchorAddrIn.value.trim()) {
        draft.contractAnchors = [{ address: anchorAddrIn.value.trim(), networkRef: anchorNetIn.value.trim(), kind: anchorKindSel.value }];
      }
      if (signalValueIn.value.trim()) {
        draft.identitySignals.push({ type: signalTypeIn.value.trim() || "OFFICIAL_DOC", value: signalValueIn.value.trim(), source: signalSourceIn.value.trim() });
      }
      if (evRefIn.value.trim()) {
        draft.evidence = [{ kind: evKindSel.value, ref: evRefIn.value.trim(), capturedBy: "OWNER:owner" }];
      }
      runPipelineAction(EC.createCandidate(draft, OWNER_ACTOR),
        "Candidate recorded at DISCOVERED. It is a proposal — UNVERIFIED and invisible to every canonical view.");
    });
    return panel("Owner candidate intake", [
      meta("Record an entity you have identified. Intake creates a candidate at DISCOVERED with your provenance — it registers nothing, verifies nothing, and the candidate stays invisible to the Globe, the World Engine, search, and every canonical count until it passes the whole pipeline and your authority gate."),
      pipeField("Name", nameIn),
      pipeField("Kind", kindSel),
      pipeField("Ticker", tickerIn),
      pipeField("Category", categoryIn),
      pipeField("Network refs", networksIn),
      pipeField("Aliases", aliasesIn),
      pipeField("Former name", formerIn),
      pipeField("Anchor address", anchorAddrIn),
      pipeField("Anchor network ref", anchorNetIn),
      pipeField("Anchor kind", anchorKindSel),
      pipeField("Identity signal type", signalTypeIn),
      pipeField("Identity signal", signalValueIn),
      pipeField("Identity signal source", signalSourceIn),
      pipeField("Evidence kind", evKindSel),
      pipeField("Evidence reference", evRefIn),
      U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [submit])
    ]);
  }

  function pipelineEvidencePanel(candidates) {
    var EC = global.EntityCandidates;
    var open = (candidates || []).filter(function (c) {
      return c && ["REJECTED", "DUPLICATE", "REGISTERED"].indexOf(c.pipelineStage) === -1;
    });
    var sel = U.el("select", { class: "price-input" }, []);
    open.forEach(function (c) {
      sel.appendChild(U.el("option", { value: c.id }, (c.proposedName || c.id) + " (" + c.pipelineStage + ")"));
    });
    var kindSel = pipeSelect(EC ? EC.EVIDENCE_KINDS : ["OWNER_STATEMENT"]);
    var refIn = pipeText("Evidence reference — URL, id, or owner note");
    var submit = pipeBtn("Attach evidence (append-only)", function () {
      if (!sel.value) { pipelineFail(["No open candidate to attach evidence to."]); return; }
      runPipelineAction(
        EC.addEvidence(sel.value, { kind: kindSel.value, ref: refIn.value.trim(), capturedBy: "OWNER:owner" }, OWNER_ACTOR),
        "Evidence attached to " + sel.value + ". Provenance is append-only — it is never rewritten.");
    });
    return panel("Attach evidence", [
      meta("Evidence is append-only provenance. Corrections add entries; history is never rewritten. A candidate needs at least one evidence entry before it can be PREPARED."),
      pipeField("Candidate", sel),
      pipeField("Evidence kind", kindSel),
      pipeField("Evidence reference", refIn),
      U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [submit])
    ]);
  }

  function pipelineGatePanel(prepared) {
    var EG = global.EntityGate;
    var NI = global.NetworkIntelligence;
    var kids = [
      meta("The authority gate. Only the owner can freeze, return, or reject — STAR and workers can prepare candidates, never gate them. FREEZE INTO BATCH builds a frozen batch artifact in the Batch 1/2 shape and pre-validates it against the real import gate: a batch the gate would block is never frozen. Registration then happens only by importing the frozen batch through the two-phase gate (validate all, zero writes on any failure).")
    ];
    if (!prepared.length) {
      kids.push(meta("No PREPARED candidates are waiting. The review list is honestly empty."));
      return panel("🏛️ Authority gate — review list", kids);
    }
    var block = U.el("div", {}, []);
    prepared.forEach(function (c) {
      var rowKids = [];
      var check = U.el("input", { type: "checkbox" });
      check.checked = true;
      check.setAttribute("data-freeze-id", c.id);
      rowKids.push(U.el("div", { class: "api-meta" }, [
        check,
        U.el("span", {}, " Freeze " + (c.proposedName || c.id) + " → " +
          ((c.resolution && c.resolution.canonicalId) || "?") + " (" + c.proposedKind + ", " +
          ((c.evidence || []).length) + " evidence, dedupe " + ((c.dedupe && c.dedupe.verdict) || "NOT_RUN") + ")")
      ]));
      if (c.proposedKind === "NETWORK") {
        var vmSel = pipeSelect(NI && Array.isArray(NI.VM_TYPES) ? NI.VM_TYPES : ["EVM", "SVM", "COSMOS", "UTXO", "MOVE", "SUBSTRATE"]);
        vmSel.setAttribute("data-comp-vm", c.id);
        var chainIn = pipeText("EIP-155 chain id (blank = none / non-EVM)");
        chainIn.setAttribute("data-comp-chain", c.id);
        rowKids.push(pipeField("VM (owner states it at the gate — the candidate schema does not carry it)", vmSel));
        rowKids.push(pipeField("Chain id", chainIn));
      }
      if (c.proposedKind === "ASSET") {
        var notSel = pipeSelect(["", "native", "token"]);
        notSel.setAttribute("data-comp-not", c.id);
        var classIn = pipeText("Asset class (blank = UNKNOWN)");
        classIn.setAttribute("data-comp-class", c.id);
        rowKids.push(pipeField("Native or token (blank = unstated)", notSel));
        rowKids.push(pipeField("Asset class", classIn));
      }
      if (c.proposedKind === "PROTOCOL") {
        var actIn = pipeText("Activity refs — canonical-60 major ids, comma-separated (drafts also apply)");
        actIn.setAttribute("data-comp-act", c.id);
        rowKids.push(pipeField("Activity refs", actIn));
      }
      var noteIn = pipeText("Return note — what evidence is needed");
      noteIn.setAttribute("data-return-note", c.id);
      var reasonIn = pipeText("Reject reason (required, retained)");
      reasonIn.setAttribute("data-reject-reason", c.id);
      rowKids.push(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [
        pipeBtn("RETURN FOR EVIDENCE", function () {
          runPipelineAction(EG.returnForEvidence(c.id, OWNER_ACTOR, { note: noteIn.value }),
            c.id + " returned for evidence (back to MAPPED).");
        }),
        pipeBtn("REJECT", function () {
          runPipelineAction(EG.rejectFromGate(c.id, OWNER_ACTOR, { reason: reasonIn.value }),
            c.id + " REJECTED at the gate — retained as dedupe memory.");
        })
      ]));
      rowKids.push(pipeField("Return note", noteIn));
      rowKids.push(pipeField("Reject reason", reasonIn));
      block.appendChild(U.el("div", { class: "api-panel" }, rowKids));
    });
    kids.push(block);
    var freezeBtn = pipeBtn("FREEZE INTO BATCH (checked candidates)", function () {
      var ids = [];
      var completions = {};
      block.querySelectorAll("input[data-freeze-id]").forEach(function (box) {
        if (!box.checked) return;
        var id = box.getAttribute("data-freeze-id");
        ids.push(id);
        var comp = {};
        var vm = block.querySelector("[data-comp-vm=\"" + id + "\"]");
        if (vm && vm.value) comp.vm = vm.value;
        var chain = block.querySelector("[data-comp-chain=\"" + id + "\"]");
        if (chain && chain.value.trim()) {
          var n = parseInt(chain.value.trim(), 10);
          comp.chainId = isNaN(n) ? chain.value.trim() : n;
        }
        var not = block.querySelector("[data-comp-not=\"" + id + "\"]");
        if (not && not.value) comp.nativeOrToken = not.value;
        var cls = block.querySelector("[data-comp-class=\"" + id + "\"]");
        if (cls && cls.value.trim()) comp.assetClass = cls.value.trim();
        var act = block.querySelector("[data-comp-act=\"" + id + "\"]");
        if (act && act.value.trim()) comp.activityRefs = splitList(act.value);
        completions[id] = comp;
      });
      if (!ids.length) { pipelineFail(["No candidate is checked for freezing."]); return; }
      runPipelineAction(EG.freezeIntoBatch(ids, OWNER_ACTOR, { completions: completions }),
        "Frozen into a new entity batch. Candidates are GATED — registration still requires importing the batch through the two-phase gate below.");
    });
    kids.push(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [freezeBtn]));
    return panel("🏛️ Authority gate — review list", kids);
  }

  function pipelineFrozenPanel(frozenBatches) {
    var EG = global.EntityGate;
    var kids = [meta("Frozen batches are artifacts of the gate, in the exact Batch 1/2 shape. IMPORT runs the existing two-phase import gate — the only path from candidate to canonical. A blocked import writes nothing and leaves the batch FROZEN and its candidates GATED.")];
    if (!frozenBatches.length) {
      kids.push(meta("No frozen batches. Nothing has been frozen at the gate yet."));
      return panel("❄️ Frozen batches", kids);
    }
    frozenBatches.forEach(function (b) {
      var lines = [
        row("Batch", b.batch + " — " + (b.label || "")),
        row("Status", b.status),
        row("Records", (b.records || []).length + " (" + (b.networks || []).length + " networks, " +
          (b.assets || []).length + " assets, " + (b.protocols || []).length + " protocols)"),
        row("Frozen by", (b.frozenBy || "UNKNOWN") + " at " + (b.frozenAt || "UNKNOWN")),
        row("Candidates", (b.candidateIds || []).join(", "))
      ];
      if (b.importReport) {
        lines.push(row("Last import", "imported " + b.importReport.imported + ", already present " +
          b.importReport.alreadyPresent + (b.importReport.blocked ? ", BLOCKED — zero writes" : "")));
      }
      if (b.status === "FROZEN" && EG) {
        lines.push(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [
          pipeBtn("IMPORT THROUGH THE TWO-PHASE GATE", function () {
            runPipelineAction(EG.importFrozenBatch(b.batch, OWNER_ACTOR),
              b.batch + " imported through the two-phase gate and registered. Truth remains UNVERIFIED.");
          })
        ]));
      }
      kids.push(U.el("div", { class: "api-panel" }, lines));
    });
    return panel("❄️ Frozen batches", kids);
  }

  function buildPipelinePanel(candidates, frozenBatches) {
    var EC = global.EntityCandidates, EG = global.EntityGate;
    var kids = [];
    kids.push(meta("The governed front door for Entity Universe growth. A candidate is a PROPOSAL, never a canonical entity: candidates and frozen-batch artifacts are excluded from every canonical view (Globe, World Engine, Encyclopedia, Universal Search, registry counts). Discovery is not verification — every candidate is UNVERIFIED at every stage, and PREPARED is not REGISTERED."));
    pipelineStatusEl = U.el("div", { class: "api-meta", style: "margin-top:10px" }, pipelineStatus || "");
    kids.push(pipelineStatusEl);
    if (!EC || !EG) {
      kids.push(meta(notLoadedLine(!EC ? "EntityCandidates" : "EntityGate", "the entity pipeline")));
      return panel("🧬 Entity pipeline — candidates & authority gate", kids);
    }
    var summary = buildPipelineSummary(candidates, frozenBatches);
    kids.push(row("Candidates recorded", String(summary.total)));
    PIPELINE_STAGES.forEach(function (s) {
      if (summary.byStage[s]) kids.push(row("Stage " + s, String(summary.byStage[s])));
    });
    kids.push(row("Stale candidates (flag only, never auto-rejected)", String(summary.stale)));
    kids.push(row("Frozen batches", summary.frozenBatches + " frozen, " + summary.importedBatches + " imported"));
    var stageSel = pipeSelect(["ALL"].concat(PIPELINE_STAGES));
    stageSel.value = pipelineStageFilter;
    stageSel.addEventListener("change", function () { pipelineStageFilter = stageSel.value; if (currentRoot) render(currentRoot); });
    var kindSel = pipeSelect(["ALL", "NETWORK", "ASSET", "PROTOCOL"]);
    kindSel.value = pipelineKindFilter;
    kindSel.addEventListener("change", function () { pipelineKindFilter = kindSel.value; if (currentRoot) render(currentRoot); });
    var queryIn = U.el("input", { class: "cw-filter-input", type: "search", placeholder: "Filter candidates by name (this surface only)…", value: pipelineQuery, "aria-label": "Filter candidates by name" });
    queryIn.addEventListener("change", function () {
      pipelineQuery = queryIn.value || "";
      if (currentRoot) render(currentRoot);
    });
    kids.push(U.el("div", { class: "price-input-row" }, [stageSel, kindSel, queryIn]));
    var filtered = pipelineFilterCandidates(candidates);
    if (!filtered.length) {
      kids.push(meta(candidates && candidates.length
        ? "No candidate matches this filter — nothing is recorded under it, not a guess."
        : "No candidates are recorded. The pipeline starts empty and gains entries only through intake — nothing is seeded or invented."));
    }
    filtered.forEach(function (c) { kids.push(pipelineCandidateBlock(c)); });
    var wrap = panel("🧬 Entity pipeline — candidates & authority gate", kids);
    var outer = U.el("div", {}, [wrap, pipelineIntakePanel(), pipelineEvidencePanel(candidates),
      pipelineGatePanel((candidates || []).filter(function (c) { return c && c.pipelineStage === "PREPARED"; })),
      pipelineFrozenPanel(frozenBatches)]);
    return outer;
  }

  // ---- Render helpers -----------------------------------------------------

  function filterButton(label, active) {
    var btn = U.el("button", {
      class: "btn " + (active ? "btn-primary" : "btn-secondary"),
      type: "button"
    }, label);
    btn.addEventListener("click", function () {
      setViewFilter(label);
      if (currentRoot) render(currentRoot);
    });
    return btn;
  }

  // ---- Drill-down chrome: breadcrumbs, chips, encyclopedia links -----
  // Relationship chips show only real values, and only in ADVANCED /
  // ALL: STANDARD stays titles + counts only, per the filter's
  // contract. A chip is text, never colour alone.
  function chip(text) {
    return U.el("span", { class: "mti6-chip" }, text);
  }

  function chipsRow(parts) {
    var chips = [];
    (parts || []).forEach(function (p) { if (p) chips.push(chip(p)); });
    if (!chips.length) return null;
    return U.el("div", {}, chips);
  }

  function showDetailChips() {
    return viewFilter === "ADVANCED" || viewFilter === "ALL";
  }

  // Family title for a raw record, resolved through the index's
  // Batch A family titles; the raw family id is the honest fallback.
  function familyTitleOf(record, index) {
    if (!record || typeof record.primaryFamily !== "string" || !record.primaryFamily) return "";
    return (index.familyTitles && index.familyTitles[record.primaryFamily]) || record.primaryFamily;
  }

  // Chips for one drill-down item (a buildDrillDown item: family is
  // already resolved on it).
  function itemChips(item) {
    if (!showDetailChips()) return null;
    return chipsRow([
      item.family ? "Family: " + item.family : "",
      item.verificationStatus ? "Verification: " + item.verificationStatus : "",
      item.source ? "Source: " + item.source : ""
    ]);
  }

  // Chips for a raw parent record (the Major at Types level, the Type
  // at Strategies level). A Type has no family of its own, so an
  // inherited family label from its Major may be passed in.
  function recordChips(record, index, inheritedFamily) {
    if (!showDetailChips() || !record) return null;
    var family = familyTitleOf(record, index) || inheritedFamily || "";
    return chipsRow([
      family ? "Family: " + family : "",
      record.verificationStatus ? "Verification: " + record.verificationStatus : "",
      record.source ? "Source: " + record.source : ""
    ]);
  }

  // Source / verification panel for one level's parent record: the
  // cited source and the import batch it arrived in. Both fields are
  // ADVANCED / ALL fields, so the panel only renders in those views.
  function sourcePanel(record) {
    if (!showDetailChips() || !record) return null;
    return meta("Source: " + (record.source || "not recorded") +
      " · Imported by: " + (record.importBatch || "not recorded"));
  }

  function encyclopediaLink(id) {
    return U.el("a", {
      class: "btn btn-secondary btn-sm",
      href: "#/encyclopedia/" + encodeURIComponent(id)
    }, "Open in Encyclopedia");
  }

  // Real breadcrumb for the drill-down level: every level above the
  // current one is a clickable button, the current level is plain
  // text. Separators carry .mti6-breadcrumb__sep.
  function breadcrumbBar(state, index) {
    var bar = U.el("div", { class: "mti6-breadcrumb" });
    function crumbBtn(label, onPick) {
      var b = U.el("button", { class: "btn btn-secondary btn-sm", type: "button" }, label);
      b.addEventListener("click", function () {
        onPick();
        renderActivitiesList(index);
      });
      return b;
    }
    function sep() {
      return U.el("span", { class: "mti6-breadcrumb__sep" }, ">");
    }
    if (state.level === "majors") {
      bar.appendChild(U.el("span", {}, "All Major Activities"));
    } else if (state.level === "types") {
      bar.appendChild(crumbBtn("All Major Activities", function () {
        selectedMajorId = null;
        selectedTypeId = null;
      }));
      bar.appendChild(sep());
      bar.appendChild(U.el("span", {}, state.major.title || state.major.id));
    } else {
      bar.appendChild(crumbBtn("All Major Activities", function () {
        selectedMajorId = null;
        selectedTypeId = null;
      }));
      bar.appendChild(sep());
      bar.appendChild(crumbBtn(state.major.title || state.major.id, function () {
        selectedTypeId = null;
      }));
      bar.appendChild(sep());
      bar.appendChild(U.el("span", {}, state.type.title || state.type.id));
    }
    return bar;
  }

  // Renders one drill-down level into the activities list box, from
  // the pure buildDrillDown builder. Clicking a row moves one level
  // deeper; the breadcrumb moves back up. Only this box is rebuilt —
  // the filter buttons and search input keep their state.
  function renderActivitiesList(index) {
    if (!activitiesListBox) return;
    activitiesListBox.innerHTML = "";
    var state = buildDrillDown(index,
      { majorId: selectedMajorId, typeId: selectedTypeId }, viewFilter, searchQuery);
    activitiesListBox.appendChild(breadcrumbBar(state, index));
    if (state.level === "types" && state.major) {
      activitiesListBox.appendChild(U.el("h3", {}, state.major.title || state.major.id));
      if (state.major.definition && (viewFilter === "ADVANCED" || viewFilter === "ALL")) {
        activitiesListBox.appendChild(meta(state.major.definition));
      }
      activitiesListBox.appendChild(meta("Verification: " + (state.major.verificationStatus || "UNKNOWN") +
        " · Types under this Major Activity: " + state.items.length));
      var majorChips = recordChips(state.major, index, "");
      if (majorChips) activitiesListBox.appendChild(majorChips);
      var majorSource = sourcePanel(state.major);
      if (majorSource) activitiesListBox.appendChild(majorSource);
    }
    if (state.level === "strategies" && state.type) {
      activitiesListBox.appendChild(U.el("h3", {}, state.type.title || state.type.id));
      if (state.type.definition && (viewFilter === "ADVANCED" || viewFilter === "ALL")) {
        activitiesListBox.appendChild(meta(state.type.definition));
      }
      activitiesListBox.appendChild(meta("Verification: " + (state.type.verificationStatus || "UNKNOWN") +
        " · Strategies under this Type: " + state.items.length));
      var typeChips = recordChips(state.type, index, familyTitleOf(state.major, index));
      if (typeChips) activitiesListBox.appendChild(typeChips);
      var typeSource = sourcePanel(state.type);
      if (typeSource) activitiesListBox.appendChild(typeSource);
    }
    if (state.level === "majors") {
      activitiesListBox.appendChild(meta(state.items.length + " of " + index.majors.length +
        " Major Activities shown" + (searchQuery ? " (filter: \"" + searchQuery + "\")" : "") +
        " — one canonical backbone, never a separate taxonomy per view."));
      if (showDetailChips()) {
        var verifiedMajors = index.majors.filter(function (m) { return m.verificationStatus === "VERIFIED"; }).length;
        var sources = {};
        index.majors.forEach(function (m) {
          if (typeof m.source === "string" && m.source) sources[m.source] = true;
        });
        var sourceNames = Object.keys(sources);
        activitiesListBox.appendChild(meta("Verification: " + verifiedMajors + " of " + index.majors.length + " VERIFIED" +
          (sourceNames.length ? " · Source: " + sourceNames.join(", ") : "")));
      }
    }
    if (state.items.length === 0) {
      activitiesListBox.appendChild(meta(state.level === "majors"
        ? "No Major Activity matches that filter — nothing is recorded under it, not a guess."
        : "Nothing is recorded at this level — not a guess."));
    }
    state.items.forEach(function (item) {
      var label = item.title;
      if (state.level === "majors") {
        label += " — " + item.childCount + " Types · " + (item.strategyCount || 0) + " Strategies";
      } else if (state.level === "types") {
        label += " — " + item.childCount + " Strategies";
      }
      if ((viewFilter === "ADVANCED" || viewFilter === "ALL") && item.verificationStatus) {
        label += " · " + item.verificationStatus;
      }
      if (state.level === "strategies") {
        activitiesListBox.appendChild(U.el("div", { class: "status-row" }, [
          U.el("span", {}, label),
          U.el("span", { class: "status-value" }, item.verificationStatus)
        ]));
        if (item.definition) activitiesListBox.appendChild(meta(item.definition));
        var sChips = itemChips(item);
        if (sChips) activitiesListBox.appendChild(sChips);
        activitiesListBox.appendChild(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [encyclopediaLink(item.id)]));
      } else {
        var btn = U.el("button", { class: "btn btn-secondary", type: "button" }, label);
        btn.addEventListener("click", function () {
          if (state.level === "majors") {
            selectedMajorId = item.id;
            selectedTypeId = null;
          } else if (state.level === "types") {
            selectedTypeId = item.id;
          }
          renderActivitiesList(index);
        });
        activitiesListBox.appendChild(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [btn]));
        if (item.definition) activitiesListBox.appendChild(meta(item.definition));
        var iChips = itemChips(item);
        if (iChips) activitiesListBox.appendChild(iChips);
        var majorActions = [encyclopediaLink(item.id)];
        // CW-2 (additive): a Major Activity resolves to its primary
        // workspace through the Screen Registry (§90) — the drill-
        // down keeps its own navigation; this link is the resolver's
        // doorway into the shared workspace frame.
        if (state.level === "majors" && global.CryptoWorkspaceRegistry) {
          var wsRes = global.CryptoWorkspaceRegistry.resolveMajor(item.id);
          var wsObj = wsRes ? global.CryptoWorkspaceRegistry.getWorkspace(wsRes.primary) : null;
          if (wsObj) {
            majorActions.push(U.el("a", {
              class: "btn btn-primary btn-sm",
              href: global.CryptoWorkspaceRegistry.hrefFor(wsObj, item.id)
            }, "Open workspace: " + wsObj.title));
          }
        }
        activitiesListBox.appendChild(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, majorActions));
      }
    });
    if (state.note) activitiesListBox.appendChild(meta(state.note));
  }

  async function render(root) {
    currentRoot = root;
    activitiesListBox = null;
    root.innerHTML = "";
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("crypto-world") : U.el("div", {}, ""));

    var CW = global.CryptoWorld;
    var records = [];
    var storeNote = null;
    try {
      if (CW) {
        await CW.ensureTaxonomyMeta();
        records = await CW.getAllRecords();
      }
    } catch (e) {
      storeNote = "Local registry store could not be read on this device — counts below are unavailable, not zero by proof.";
    }
    var counts = CW ? CW.countByRegistry(records) : {};
    var metaRec = null;
    try { metaRec = CW ? await CW.getTaxonomyMeta() : null; } catch (e) { metaRec = null; }
    metaRec = metaRec || (CW ? CW.defaultTaxonomyMeta() : { expectedCategoryCount: 60, importedCategoryCount: 0, status: "TAXONOMY_IMPORT_PENDING" });

    var index = buildTaxonomyIndex(records);
    var overview = buildOverview(records, counts, metaRec);

    // Screen header (Stage 1 primitives): taxonomy status and real
    // record counts as badges — colour + text label, never colour
    // alone. IMPORTED is deliberately not green: imported is not
    // verified, so it takes the muted unverified variant.
    var taxBadgeClass = metaRec.status === "TAXONOMY_IMPORTED" ? "mti6-badge--unverified" : "mti6-badge--unknown";
    root.appendChild(
      U.el("div", { class: "mti6-screen-header" }, [
        U.el("span", { class: "mti6-screen-header__icon" }, "💱"),
        U.el("h1", { class: "mti6-screen-header__title" }, "MTI6 Crypto World"),
        U.el("p", { class: "mti6-screen-header__desc" },
          "Part 1 maps the Crypto World so Star can later answer what an asset can do, " +
          "which protocols support an activity, and what the risks are. Mapping an opportunity " +
          "is not promising income: prices, yields, and positions can gain or lose."),
        U.el("div", { class: "mti6-screen-header__status" }, [
          U.el("span", { class: "mti6-badge mti6-badge--read-only" }, "REGISTRY FOUNDATION — READ ONLY"),
          U.el("span", { class: "mti6-badge " + taxBadgeClass }, String(metaRec.status).replace(/_/g, " ")),
          U.el("span", { class: "mti6-badge" }, overview.majors + " / " + overview.taxonomyExpected + " MAJOR ACTIVITIES"),
          U.el("span", { class: "mti6-badge" }, overview.totalRecords + " RECORDS")
        ]),
        U.el("div", { class: "mti6-screen-header__actions" }, [
          U.el("a", { class: "btn btn-primary btn-sm", href: "#/encyclopedia" }, "📖 Open the Crypto Encyclopedia")
        ])
      ])
    );

    // Tab switcher. OVERVIEW (the default) renders the whole screen
    // stacked; each other tab narrows to its section(s).
    var tabBar = U.el("div", { class: "mti6-tabs", role: "tablist" });
    TABS.forEach(function (tab) {
      var btn = U.el("button", {
        class: "mti6-tab" + (activeTab === tab.id ? " mti6-tab--active" : ""),
        type: "button",
        role: "tab",
        "aria-selected": activeTab === tab.id ? "true" : "false"
      }, tab.label);
      btn.addEventListener("click", function () {
        if (activeTab === tab.id) return;
        activeTab = tab.id;
        if (currentRoot) render(currentRoot);
      });
      tabBar.appendChild(btn);
    });
    root.appendChild(tabBar);

    if (storeNote) root.appendChild(U.el("div", { class: "api-meta" }, storeNote));

    // Sections are collected with their tab tag, then appended per
    // the active tab: OVERVIEW shows everything, any other tab shows
    // only its own sections.
    var sections = [];
    function addSection(tab, el) {
      sections.push({ tab: tab, el: el });
    }

    // ---- 1. Overview -----------------------------------------------------
    var overviewKids = [
      meta("Command center over the loaded Crypto World registries. Every count below is real — from the records actually loaded, never invented."),
      row("Major Activities (canonical backbone)", String(overview.majors) + " / " + overview.taxonomyExpected),
      row("Types", String(overview.types)),
      row("Strategies", String(overview.strategies)),
      row("Records verified against a cited source", String(overview.verified) + " of " + overview.totalRecords),
      row("Taxonomy status", String(overview.taxonomyStatus).replace(/_/g, " ")),
      row("Assets / Chains / Protocols (registry records)",
        (counts.assets || 0) + " / " + (counts.chains || 0) + " / " + (counts.protocols || 0)),
      row("Positions (registry records)", String(counts.positions || 0)),
      row("Risks (registry records)", String(counts.risks || 0))
    ];
    addSection("overview", panel("Overview", overviewKids));

    // ---- 1b. World contents (owner directive, 2026-11-22) --------------
    // The 24 named Crypto World contents, rendered from js/worlds.js
    // so the list can never drift from the canonical declaration.
    // The rule decides anything the list does not name.
    var W = global.Worlds;
    if (W && W.CRYPTO_WORLD && Array.isArray(W.CRYPTO_WORLD.contents)) {
      var worldKids = [
        meta("Crypto World contains everything crypto only. The 24 named contents below are the owner's directive of 2026-11-22, in order."),
        labelList(W.CRYPTO_WORLD.contents),
        meta(W.SIMPLE_RULE ? W.SIMPLE_RULE.cryptoWorld : "Crypto = Crypto World"),
        meta(W.CRYPTO_WORLD.membershipRule || ""),
        meta("Note: the 24 above are the named contents. The rule decides anything not named — if it is fundamentally a crypto activity, it belongs in Crypto World. So Mining, Prediction Markets, GameFi, SocialFi, DeSci and ReFi remain Crypto World under the rule, not under the list. Anything that makes money and is NOT crypto belongs in Earnings (#/earn).")
      ];
      addSection("overview", panel("💱 Crypto World — contents", worldKids));
    } else {
      addSection("overview", panel("💱 Crypto World — contents", [
        meta("Worlds: NOT LOADED — the Crypto World contents are unavailable in this build.")
      ]));
    }

    // ---- 2. Activities drill-down ----------------------------------------
    var activitiesPanel = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Activities — Major Activities, Types & Strategies"),
      meta("One canonical Encyclopedia. STANDARD / ADVANCED / ALL change how much detail this panel shows — never which taxonomy: STANDARD shows titles + counts only, ADVANCED adds definitions, verification status and source. Tap a Major Activity to list its Types; tap a Type to list its Strategies."),
      U.el("div", { class: "price-input-row" }, VIEW_FILTERS.map(function (f) { return filterButton(f, viewFilter === f); }))
    ]);
    var searchInput = U.el("input", {
      class: "cw-filter-input", type: "search", placeholder: "Filter Major Activities by name…",
      value: searchQuery, "aria-label": "Filter Major Activities by name"
    });
    searchInput.addEventListener("input", function () {
      searchQuery = searchInput.value || "";
      selectedMajorId = null;
      selectedTypeId = null;
      renderActivitiesList(index);
    });
    activitiesPanel.appendChild(U.el("div", { class: "price-input-row" }, [searchInput]));
    activitiesListBox = U.el("div", {});
    activitiesPanel.appendChild(activitiesListBox);
    addSection("activities", activitiesPanel);

    // ---- 2b. Workspaces index (CW-2, additive) ---------------------------
    // The two-level §92 navigation: groups -> workspaces, generated
    // from the Screen Registry (F-26) so this menu and the taxonomy
    // can never drift apart. Seats carry their EXPANSION-GATED
    // marker — visible, so the universe's shape is honest, but
    // never styled as live workspaces.
    var REG = global.CryptoWorkspaceRegistry;
    if (REG) {
      var wsKids = [meta("All " + REG.WORKSPACES.length + " registered workspaces by group. Workspaces on the shared frame (CW-2) render their registry scope over the same canonical records; the design-time §111 status is shown as recorded in the CW-1 registry — a frame surface is not data integration, and EXECUTION is DISABLED on every workspace.")];
      REG.GROUPS.forEach(function (g) {
        wsKids.push(U.el("h4", {}, g.label));
        REG.byGroup(g.id).forEach(function (w) {
          var chip = w.gated ? "EXPANSION-GATED SEAT"
            : w.route === "crypto-ws" ? "WORKSPACE FRAME (CW-2) · design status: " + w.status111
            : w.status111;
          wsKids.push(U.el("div", { class: "status-row" }, [
            U.el("a", { href: REG.hrefFor(w), class: "cw2-rec-link" }, w.title),
            U.el("span", { class: "status-value" }, chip)
          ]));
        });
      });
      addSection("activities", panel("Workspaces — the 56 registered surfaces", wsKids));
    }

    // ---- 3. 60-WAY TAXONOMY (preserved from the Part 1 screen) -----------
    var verifiedMajorCount = records.filter(function (r) { return r.level === "MAJOR_ACTIVITY" && r.verificationStatus === "VERIFIED"; }).length;
    var taxonomyNote = metaRec.status === "TAXONOMY_IMPORTED"
      ? "The 60 canonical Major Activities are imported. Imported is not verified — every activity stays UNVERIFIED until it is checked against a cited external source."
      : "The authoritative category names are not in this app yet. Real Way records appear " +
        "only when their names and definitions are imported and verified — nothing here is a placeholder opportunity.";
    var taxKids = [
      U.el("h2", { class: "api-title" }, "💎 60-WAY TAXONOMY"),
      U.el("div", { class: "api-meta" }, "STATUS: " + String(metaRec.status).replace(/_/g, " ")),
      U.el("div", { class: "api-meta" }, "Canonical Taxonomy: " + metaRec.importedCategoryCount + " / " + metaRec.expectedCategoryCount + " IMPORTED"),
      U.el("div", { class: "api-meta" }, "External Verification: " + verifiedMajorCount + " / " + metaRec.expectedCategoryCount + " VERIFIED"),
      U.el("div", { class: "api-meta" }, taxonomyNote)
    ];
    if (metaRec.status !== "TAXONOMY_IMPORTED") {
      taxKids.push(U.el("button", {
        class: "btn btn-primary btn-sm", type: "button", disabled: true,
        title: "Import arrives when the authoritative category list is supplied and verified."
      }, "Import Taxonomy"));
    } else {
      taxKids.push(U.el("div", { class: "api-meta" }, "Canonical 60 imported — browse the Major Activities in the Encyclopedia."));
    }
    addSection("overview", U.el("div", { class: "api-panel" }, taxKids));

    // ---- 4. Assets --------------------------------------------------------
    var assetKids = [
      meta((counts.assets || 0) + " asset records. Asset classes below are schema labels, not holdings. " +
        "Unknown contracts display UNKNOWN / NOT VERIFIED / NOT CONNECTED.")
    ];
    var AI = global.AssetIntelligence;
    if (!AI || typeof AI.listClasses !== "function") {
      assetKids.push(meta(notLoadedLine("AssetIntelligence", "asset classification")));
    } else {
      var classes = safeCall(function () { return AI.listClasses(); });
      assetKids.push(meta("Asset classification reference: " +
        (Array.isArray(classes) ? classes.length + " asset classes defined" : "class list unavailable") +
        ". Classification is reference data, not holdings. No individual asset is named here; a class describes a structure, never a specific coin or token."));
    }
    assetKids.push(meta("Balances: UNAVAILABLE — no balance source is connected. No balance figure is shown, and none is estimated."));
    addSection("assets", panel("💰 Assets", assetKids));
    addSection("assets", labelList(CW ? CW.ASSET_CLASSES : []));

    // ---- 5. Networks ------------------------------------------------------
    var networkKids = [meta((counts.chains || 0) + " chain records.")];
    var NI = global.NetworkIntelligence;
    if (!NI) {
      networkKids.push(meta(notLoadedLine("NetworkIntelligence", "network reference data")));
    } else {
      var families = Array.isArray(NI.FAMILIES) ? NI.FAMILIES.length : 0;
      var examples = Array.isArray(NI.EXAMPLE_NETWORKS) ? NI.EXAMPLE_NETWORKS.length : 0;
      networkKids.push(meta("Reference definitions only: " + families + " network families, " + examples +
        " example networks. These are structural examples (UNVERIFIED, source \"structural-example\"), not live coverage."));
      if (Array.isArray(NI.EXAMPLE_NETWORKS)) {
        networkKids.push(meta("Example networks: " + NI.EXAMPLE_NETWORKS.map(function (n) {
          return (n.name || n.id) + " (" + (n.vm || "?") + ", health " +
            ((n.health && n.health.status) || "UNKNOWN") + ")";
        }).join("; ") + "."));
      }
    }
    networkKids.push(meta("Live network coverage: NOT CONNECTED — no network provider is connected, so no chain is confirmed reachable."));
    addSection("networks", panel("⛓️ Chains / Networks", networkKids));

    // ---- 6. Protocols -----------------------------------------------------
    var protocolKids = [meta((counts.protocols || 0) + " protocol records.")];
    if (!moduleLoaded("ProtocolIntelligence")) {
      protocolKids.push(meta(notLoadedLine("ProtocolIntelligence", "protocol records")));
    }
    var protocolRecords = records.filter(function (r) { return r && r.registry === "protocols"; });
    if (protocolRecords.length) {
      var withActivity = protocolRecords.filter(function (p) {
        return Array.isArray(p.activityRefs) && p.activityRefs.length > 0;
      }).length;
      protocolKids.push(meta(withActivity + " of " + protocolRecords.length +
        " protocol records name the activities they support. A protocol record is a reference, never a live connection."));
    } else {
      protocolKids.push(meta("No protocol records are loaded — nothing is claimed about which protocols support which activity."));
    }
    addSection("protocols", panel("🏛️ Protocols / DApps", protocolKids));

    // ---- 7. Positions -----------------------------------------------------
    var positionKids = [meta((counts.positions || 0) + " position records in the registry.")];
    if (!moduleLoaded("PositionIntelligence")) {
      positionKids.push(meta(notLoadedLine("PositionIntelligence", "position state")));
    }
    positionKids.push(meta("Positions are recorded relationships (asset, network, venue, source) — no balance, no value, and no gain/loss figure is shown, because no position source is connected."));
    addSection("positions", panel("📍 Positions", positionKids));

    // ---- 8. Opportunities -------------------------------------------------
    var opp = buildOpportunitySummary();
    var oppKids = [];
    if (!opp.available) {
      oppKids.push(meta(opp.note));
    } else {
      oppKids.push(meta("Opportunities recorded: " + opp.count + "."));
      oppKids.push(meta("Worker-assigned opportunities: " + opp.assigned + " of " + opp.count + "."));
      oppKids.push(meta("Costs on recorded opportunities: " + opp.costsSourced + " sourced, " + opp.costsUnknown + " UNKNOWN. A cost is UNKNOWN until a sourced value exists — never assumed, never zeroed."));
      oppKids.push(meta(opp.note));
    }
    addSection("opportunities", panel("🎯 Opportunities", oppKids));

    // ---- 9. Risk ----------------------------------------------------------
    var riskKids = [
      meta("Risk dimensions below are categories only. Part 1 assigns no risk scores and no risk verdicts.")
    ];
    if (!moduleLoaded("RiskIntelligence")) {
      riskKids.push(meta(notLoadedLine("RiskIntelligence", "risk records")));
    }
    var riskRecords = records.filter(function (r) { return r && r.registry === "risks"; });
    riskKids.push(meta((counts.risks || 0) + " risk records in the registry."));
    var threatCount = 0;
    var defenseCount = 0;
    riskRecords.forEach(function (r) {
      if (r.classification === "THREAT") threatCount++;
      else if (r.classification === "DEFENSE") defenseCount++;
    });
    if (riskRecords.length) {
      riskKids.push(meta("THREAT/DEFENSE classifications on risk records: " + threatCount + " THREAT, " + defenseCount +
        " DEFENSE. Threats are recorded in the risks registry only — never as Strategies."));
    }
    addSection("risk", panel("⚠️ Risks (dimensions, no scores)", riskKids));
    addSection("risk", labelList(CW ? CW.RISK_DIMENSIONS : []));

    // ---- 10. Costs --------------------------------------------------------
    var costKids = [];
    if (!moduleLoaded("CostIntelligence")) {
      costKids.push(meta(notLoadedLine("CostIntelligence", "cost records")));
    }
    costKids.push(meta("Costs are UNKNOWN by default. A cost entry is either UNKNOWN or a sourced value (value + currency + source + checkedAt) — an unsourced value is never kept."));
    if (opp.available) {
      costKids.push(meta("Costs on recorded opportunities: " + opp.costsSourced + " sourced, " + opp.costsUnknown + " UNKNOWN."));
    }
    if (!moduleLoaded("MarketIntelligence")) {
      costKids.push(meta(notLoadedLine("MarketIntelligence", "market prices")));
      costKids.push(meta("No price is shown on this screen — prices live on the Crypto Market screen, from live sources only, never from this registry."));
    }
    addSection("costs", panel("💸 Costs", costKids));

    // ---- 11. Bots assigned ------------------------------------------------
    var bots = buildBotSummary();
    var botKids = [];
    if (!bots.available) {
      botKids.push(meta(bots.note));
    } else {
      botKids.push(meta("Worker tasks recorded: " + bots.totalTasks + "."));
      var activeStates = [];
      Object.keys(bots.byState).forEach(function (st) {
        if (bots.byState[st] > 0) activeStates.push(st + " " + bots.byState[st]);
      });
      if (activeStates.length) botKids.push(meta("By state: " + activeStates.join(", ") + "."));
      botKids.push(meta("Workers active: " + bots.active + " — NOT_CONNECTED. No worker runtime is connected, so no task is live."));
      botKids.push(meta("Opportunities with a worker assigned: " + bots.assignedOpportunities + " of " + bots.totalOpportunities + "."));
      if (bots.note) botKids.push(meta(bots.note));
    }
    botKids.push(meta("Role labels a worker may carry on an assignment (Research, Risk, Yield, Routing, Security, Builder, Analysis, Monitoring) are assignment labels, not bot names."));
    addSection("bots", panel("🤖 Bots assigned", botKids));

    // ---- 12. Security alerts ----------------------------------------------
    var angel = buildAngelSummary();
    var angelKids = [];
    if (!angel.available) {
      angelKids.push(meta("Alert state: UNKNOWN — " + angel.note));
    } else if (angel.state === "NO_ALERTS") {
      angelKids.push(meta("NO_ALERTS — " + angel.note));
    } else {
      angelKids.push(meta("Alerts: " + angel.count + " (" + angel.confirmedCount + " confirmed, " +
        angel.unconfirmedCount + " unconfirmed). " + angel.note));
      angelKids.push(meta("Angels recorded: " + angel.angels + "."));
      angel.alerts.slice(0, 20).forEach(function (a) {
        angelKids.push(row((a.title || a.id) + " — " + (a.severity || "UNKNOWN") + " · " + (a.state || "UNKNOWN"),
          a.affectedSystem || "UNKNOWN"));
      });
      if (angel.alerts.length > 20) {
        angelKids.push(meta("Showing the first 20 of " + angel.alerts.length + " alerts — see the Security screen for the full list."));
      }
    }
    addSection("security", panel("🛡️ Security alerts", angelKids));

    // ---- 13. Data freshness -----------------------------------------------
    var fresh = buildFreshness(records);
    var freshKids = [
      meta(fresh.note),
      row("Records loaded", String(fresh.total)),
      row("Records with a source", String(fresh.withSource)),
      row("Records with a last-checked timestamp", String(fresh.withLastChecked)),
      row("Verified / unverified", fresh.verified + " / " + fresh.unverified),
      row("Taxonomy status", String(metaRec.status).replace(/_/g, " "))
    ];
    addSection("overview", panel("🕒 Data freshness", freshKids));

    // ---- 14. Knowledge / explanations --------------------------------------
    var knowKids = [
      meta("What the states mean. Imported is not verified: IMPORTED means the 60 canonical Major Activities are in the encyclopedia; VERIFIED means an entry was checked against a cited external source. Every activity stays UNVERIFIED until that check happens.")
    ];
    var T = global.Truth;
    if (!T || typeof T.labelFor !== "function" || !Array.isArray(T.TRUTH_STATES)) {
      knowKids.push(meta(notLoadedLine("Truth", "truth vocabulary")));
      knowKids.push(meta("Truth states: NOT_CONNECTED, UNKNOWN, UNVERIFIED, STALE, DISABLED, UNAVAILABLE, VERIFIED, LIVE. Nothing is a success unless it is VERIFIED or LIVE."));
    } else {
      T.TRUTH_STATES.forEach(function (st) {
        knowKids.push(row(T.labelFor(st), T.describe ? T.describe(st) : ""));
      });
    }
    if (!moduleLoaded("EncyclopediaBridge", "getRecord")) {
      knowKids.push(meta(notLoadedLine("EncyclopediaBridge", "encyclopedia lookups")));
    } else {
      knowKids.push(meta("EncyclopediaBridge is loaded: record lookups, Types under a Major Activity, and Strategies under a Type all read the same loaded records as this screen."));
    }
    knowKids.push(meta("Definitions on this screen come from the canonical encyclopedia records (source \"canonical-import\"). A definition that merely repeats a title, promises a return, or names a protocol without a source is not a definition this screen will show."));
    addSection("overview", panel("📚 Knowledge / explanations", knowKids));

    // ---- Activity families — organizational labels only (preserved) --------
    addSection("activities", section("🧭 Activity Families (organizational only)",
      "Families organize activities. They are not opportunities, earning guarantees, " +
      "protocols, assets, strategies, or the 60 Ways. Part 2 fills activities family-by-family."));
    addSection("activities", labelList(CW ? CW.ACTIVITY_FAMILIES.map(function (f) { return f.id + ". " + f.name; }) : []));

    addSection("bots", section("🤖 Bot Capabilities",
      (counts.botcapabilities || 0) + " bot capability records. Part 1 capabilities are research-only; " +
      "nothing here can transact, and INFORMATIONAL never implies TRANSACTIONAL."));
    addSection("overview", section("🔌 Data Sources",
      (counts.datasources || 0) + " data-source records added in Part 1. No new live source was connected; " +
      "the existing API registry is unchanged."));
    addSection("overview", section("🔭 Intelligence (future questions)",
      "Once records exist, this layer will answer from real state only: what can I do with this asset, " +
      "which protocols support this activity, which chains can I use, what activities exist under a Way, " +
      "what are the risks, what can bots research, what needs wallet approval, and what is informational " +
      "versus transactional."));
    addSection("overview", section("🧭 Discovery",
      "New findings follow DISCOVERED → VERIFY → CLASSIFY → OWNER APPROVAL → ADD. " +
      "Nothing discovered by a bot becomes authoritative on its own; rejected, duplicate, stale, " +
      "and needs-review outcomes are kept as statuses."));

    // ---- 15. Entity pipeline (P4): candidates + authority gate ---------
    // Candidate data is read through EntityCandidates (direct store
    // reads), NEVER through the canonical records above: candidates
    // and frozen-batch artifacts are excluded from `records` by the
    // CryptoWorld.getAllRecords canonical view, so nothing in this
    // section can inflate a canonical count, the graph, or search.
    var pipeCandidates = null;
    var pipeFrozen = [];
    if (global.EntityCandidates && typeof global.EntityCandidates.listCandidates === "function") {
      try { pipeCandidates = await global.EntityCandidates.listCandidates(); } catch (e) { pipeCandidates = null; }
    }
    if (global.EntityGate && typeof global.EntityGate.listFrozenBatches === "function") {
      try { pipeFrozen = await global.EntityGate.listFrozenBatches(); } catch (e) { pipeFrozen = []; }
    }
    addSection("pipeline", buildPipelinePanel(pipeCandidates, pipeFrozen));

    // Append per the active tab: OVERVIEW shows everything, any other
    // tab shows only its own sections. The drill-down list is only
    // built when its panel is on screen.
    sections.forEach(function (s) {
      if (activeTab === "overview" || s.tab === activeTab) root.appendChild(s.el);
    });
    if (activitiesListBox) renderActivitiesList(index);
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules["crypto-world"] = {
    render: render,
    buildTaxonomyIndex: buildTaxonomyIndex,
    buildDrillDown: buildDrillDown,
    buildOverview: buildOverview,
    buildModuleStates: buildModuleStates,
    buildFreshness: buildFreshness,
    buildAngelSummary: buildAngelSummary,
    buildBotSummary: buildBotSummary,
    buildOpportunitySummary: buildOpportunitySummary,
    buildPipelineSummary: buildPipelineSummary,
    getViewFilter: function () { return viewFilter; },
    setViewFilter: setViewFilter,
    ACTIONS_NOT_IMPORTED_NOTE: ACTIONS_NOT_IMPORTED_NOTE
  };
})(window);
