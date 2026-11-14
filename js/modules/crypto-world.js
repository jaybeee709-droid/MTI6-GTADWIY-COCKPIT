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
    var typeCount = 0;
    var strategyCount = 0;
    var verifiedCount = 0;
    recs.forEach(function (r) {
      if (!r || typeof r !== "object") return;
      if (r.verificationStatus === "VERIFIED") verifiedCount++;
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

  function drillItem(record, childCount, childKind, filter) {
    return {
      id: record.id,
      title: record.title || record.id,
      definition: (filter === "ADVANCED" || filter === "ALL") ? (record.definition || "") : "",
      verificationStatus: record.verificationStatus || "UNKNOWN",
      source: (filter === "ADVANCED" || filter === "ALL") ? (record.source || "") : "",
      importBatch: (filter === "ADVANCED" || filter === "ALL") ? (record.importBatch || "") : "",
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

    if (majorId) {
      var major = null;
      index.majors.forEach(function (m) { if (m.id === majorId) major = m; });
      if (!major) {
        return {
          level: "majors", major: null, type: null, breadcrumb: null,
          items: index.majors.filter(function (m) { return matchesQuery(m, query); })
            .map(function (m) { return drillItem(m, (index.typesByMajor[m.id] || []).length, "Types", f); }),
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
              return drillItem(t, (index.strategiesByType[t.id] || []).length, "Strategies", f);
            }),
            note: "The selected Type is not under \"" + (major.title || majorId) + "\" — showing its Types."
          };
        }
        return {
          level: "strategies", major: major, type: type,
          breadcrumb: "Types under " + (major.title || majorId),
          items: (index.strategiesByType[typeId] || []).map(function (s) {
            return drillItem(s, 0, "Actions", f);
          }),
          note: ACTIONS_NOT_IMPORTED_NOTE
        };
      }
      return {
        level: "types", major: major, type: null, breadcrumb: "All Major Activities",
        items: (index.typesByMajor[majorId] || []).map(function (t) {
          return drillItem(t, (index.strategiesByType[t.id] || []).length, "Strategies", f);
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
          var item = drillItem(m, (index.typesByMajor[m.id] || []).length, "Types", f);
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

  // Renders one drill-down level into the activities list box, from
  // the pure buildDrillDown builder. Clicking a row moves one level
  // deeper; the breadcrumb moves back up. Only this box is rebuilt —
  // the filter buttons and search input keep their state.
  function renderActivitiesList(index) {
    if (!activitiesListBox) return;
    activitiesListBox.innerHTML = "";
    var state = buildDrillDown(index,
      { majorId: selectedMajorId, typeId: selectedTypeId }, viewFilter, searchQuery);
    if (state.breadcrumb) {
      var crumb = U.el("button", { class: "btn btn-secondary btn-sm", type: "button" }, "← " + state.breadcrumb);
      crumb.addEventListener("click", function () {
        if (state.level === "strategies") selectedTypeId = null;
        else selectedMajorId = null;
        renderActivitiesList(index);
      });
      activitiesListBox.appendChild(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [crumb]));
    }
    if (state.level === "types" && state.major) {
      activitiesListBox.appendChild(U.el("h3", {}, state.major.title || state.major.id));
      if (state.major.definition && (viewFilter === "ADVANCED" || viewFilter === "ALL")) {
        activitiesListBox.appendChild(meta(state.major.definition));
      }
      activitiesListBox.appendChild(meta("Verification: " + (state.major.verificationStatus || "UNKNOWN") +
        " · Types under this Major Activity: " + state.items.length));
    }
    if (state.level === "strategies" && state.type) {
      activitiesListBox.appendChild(U.el("h3", {}, state.type.title || state.type.id));
      if (state.type.definition && (viewFilter === "ADVANCED" || viewFilter === "ALL")) {
        activitiesListBox.appendChild(meta(state.type.definition));
      }
      activitiesListBox.appendChild(meta("Verification: " + (state.type.verificationStatus || "UNKNOWN") +
        " · Strategies under this Type: " + state.items.length));
    }
    if (state.level === "majors") {
      activitiesListBox.appendChild(meta(state.items.length + " of " + index.majors.length +
        " Major Activities shown" + (searchQuery ? " (filter: \"" + searchQuery + "\")" : "") +
        " — one canonical backbone, never a separate taxonomy per view."));
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
      }
    });
    if (state.note) activitiesListBox.appendChild(meta(state.note));
  }

  async function render(root) {
    currentRoot = root;
    root.innerHTML = "";
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("crypto-world") : U.el("div", {}, ""));
    root.appendChild(
      U.el("div", { class: "view-header" }, [
        U.el("h1", {}, "MTI6 Crypto World"),
        U.el("span", { class: "badge badge-cat cockpit-callsign" }, "REGISTRY FOUNDATION — READ ONLY")
      ])
    );
    root.appendChild(
      U.el("p", { class: "about-text" },
        "Part 1 maps the Crypto World so Star can later answer what an asset can do, " +
        "which protocols support an activity, and what the risks are. Mapping an opportunity " +
        "is not promising income: prices, yields, and positions can gain or lose.")
    );
    root.appendChild(
      U.el("a", { class: "btn btn-primary btn-sm", href: "#/encyclopedia" }, "📖 Open the Crypto Encyclopedia")
    );

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

    if (storeNote) root.appendChild(U.el("div", { class: "api-meta" }, storeNote));

    var index = buildTaxonomyIndex(records);
    var overview = buildOverview(records, counts, metaRec);

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
    root.appendChild(panel("Overview", overviewKids));

    // ---- 2. Activities drill-down ----------------------------------------
    var activitiesPanel = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Activities — Major Activities, Types & Strategies"),
      meta("One canonical Encyclopedia. STANDARD / ADVANCED / ALL change how much detail this panel shows — never which taxonomy: STANDARD shows titles + counts only, ADVANCED adds definitions, verification status and source. Tap a Major Activity to list its Types; tap a Type to list its Strategies."),
      U.el("div", { class: "price-input-row" }, VIEW_FILTERS.map(function (f) { return filterButton(f, viewFilter === f); }))
    ]);
    var searchInput = U.el("input", {
      type: "search", placeholder: "Filter Major Activities by name…",
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
    root.appendChild(activitiesPanel);
    renderActivitiesList(index);

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
    root.appendChild(U.el("div", { class: "api-panel" }, taxKids));

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
    root.appendChild(panel("💰 Assets", assetKids));
    root.appendChild(labelList(CW ? CW.ASSET_CLASSES : []));

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
    root.appendChild(panel("⛓️ Chains / Networks", networkKids));

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
    root.appendChild(panel("🏛️ Protocols / DApps", protocolKids));

    // ---- 7. Positions -----------------------------------------------------
    var positionKids = [meta((counts.positions || 0) + " position records in the registry.")];
    if (!moduleLoaded("PositionIntelligence")) {
      positionKids.push(meta(notLoadedLine("PositionIntelligence", "position state")));
    }
    positionKids.push(meta("Positions are recorded relationships (asset, network, venue, source) — no balance, no value, and no gain/loss figure is shown, because no position source is connected."));
    root.appendChild(panel("📍 Positions", positionKids));

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
    root.appendChild(panel("🎯 Opportunities", oppKids));

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
    root.appendChild(panel("⚠️ Risks (dimensions, no scores)", riskKids));
    root.appendChild(labelList(CW ? CW.RISK_DIMENSIONS : []));

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
    root.appendChild(panel("💸 Costs", costKids));

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
    root.appendChild(panel("🤖 Bots assigned", botKids));

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
    root.appendChild(panel("🛡️ Security alerts", angelKids));

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
    root.appendChild(panel("🕒 Data freshness", freshKids));

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
    root.appendChild(panel("📚 Knowledge / explanations", knowKids));

    // ---- Activity families — organizational labels only (preserved) --------
    root.appendChild(section("🧭 Activity Families (organizational only)",
      "Families organize activities. They are not opportunities, earning guarantees, " +
      "protocols, assets, strategies, or the 60 Ways. Part 2 fills activities family-by-family."));
    root.appendChild(labelList(CW ? CW.ACTIVITY_FAMILIES.map(function (f) { return f.id + ". " + f.name; }) : []));

    root.appendChild(section("🤖 Bot Capabilities",
      (counts.botcapabilities || 0) + " bot capability records. Part 1 capabilities are research-only; " +
      "nothing here can transact, and INFORMATIONAL never implies TRANSACTIONAL."));
    root.appendChild(section("🔌 Data Sources",
      (counts.datasources || 0) + " data-source records added in Part 1. No new live source was connected; " +
      "the existing API registry is unchanged."));
    root.appendChild(section("🔭 Intelligence (future questions)",
      "Once records exist, this layer will answer from real state only: what can I do with this asset, " +
      "which protocols support this activity, which chains can I use, what activities exist under a Way, " +
      "what are the risks, what can bots research, what needs wallet approval, and what is informational " +
      "versus transactional."));
    root.appendChild(section("🧭 Discovery",
      "New findings follow DISCOVERED → VERIFY → CLASSIFY → OWNER APPROVAL → ADD. " +
      "Nothing discovered by a bot becomes authoritative on its own; rejected, duplicate, stale, " +
      "and needs-review outcomes are kept as statuses."));
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
    getViewFilter: function () { return viewFilter; },
    setViewFilter: setViewFilter,
    ACTIONS_NOT_IMPORTED_NOTE: ACTIONS_NOT_IMPORTED_NOTE
  };
})(window);
