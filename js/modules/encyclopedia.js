/* MTI6-GTADWIY-COCKPIT — Crypto Encyclopedia screen (v1, read-only)
 * The reference layer on Part 1's registries: entries are registry
 * records with a title and a definition, browsed by registry, searched
 * locally, and opened in a detail view with relationship links and a
 * verification badge. Presence in the encyclopedia is never presented
 * as verification. v1 seeds no entries and authors none: entries arrive
 * later through the discovery workflow or an approved import, and Way
 * records are rejected by validateEntry until an authoritative import.
 * Rendering only — entry model, validation, and queries live in
 * js/crypto-world.js. No network calls, no new CSS, no transactions.
 * Analytics is untouched by this screen.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  var LABELS = {
    assets: "Assets", chains: "Chains / Networks", protocols: "Protocols / DApps",
    activities: "Activities / Actions", strategies: "Strategies",
    ways: "60 Ways / Opportunity Taxonomy", datasources: "Data Sources",
    botcapabilities: "Bot Capabilities", risks: "Risks",
    discoveries: "Discovery Records", statuses: "Status / Verification",
    positions: "Future Positions"
  };

  function panel(title, children) {
    var kids = [U.el("h2", { class: "api-title" }, title)];
    (children || []).forEach(function (c) { kids.push(c); });
    return U.el("div", { class: "api-panel" }, kids);
  }

  function backBtn(label, onBack) {
    return U.el("button", { class: "btn btn-primary btn-sm", type: "button", onclick: onBack }, label);
  }

  function labelList(items) {
    var list = U.el("ul", { class: "price-offer-list" });
    items.forEach(function (t) { list.appendChild(U.el("li", {}, t)); });
    return list;
  }

  function badge(status) {
    return "VERIFICATION: " + String(status || "UNKNOWN").replace(/_/g, " ");
  }

  async function render(root) {
    var CW = global.CryptoWorld;
    var records = [];
    var meta = null;
    var storeNote = null;
    try {
      if (CW) {
        await CW.ensureTaxonomyMeta();
        records = await CW.getAllRecords();
        meta = await CW.getTaxonomyMeta();
      }
    } catch (e) {
      storeNote = "Local registry store could not be read on this device — counts below are unavailable, not zero by proof.";
    }
    if (!CW) storeNote = "Crypto World data layer is not loaded, so the encyclopedia cannot read entries.";
    meta = meta || (CW ? CW.defaultTaxonomyMeta() : { expectedCategoryCount: 60, importedCategoryCount: 0, status: "TAXONOMY_IMPORT_PENDING" });

    function header() {
      root.appendChild(
        U.el("div", { class: "view-header" }, [
          U.el("h1", {}, "📖 Crypto Encyclopedia"),
          U.el("span", { class: "badge badge-cat cockpit-callsign" }, "REFERENCE — READ ONLY")
        ])
      );
      root.appendChild(
        U.el("p", { class: "about-text" },
          "Reference entries for the Crypto World: definitions, relationships, risks, and " +
          "verification state. Presence here is not verification — every entry carries its " +
          "verification badge. Search below covers local entries only; the global search bar " +
          "at the top of the app remains the path to the web.")
      );
      if (storeNote) root.appendChild(U.el("div", { class: "api-meta" }, storeNote));
    }

    function showIndex() {
      root.innerHTML = "";
      header();

      // Local search.
      var input = U.el("input", { class: "price-input", type: "text", placeholder: "Search the encyclopedia (local entries only)" });
      var results = U.el("div", { class: "api-meta" }, "");
      function runSearch() {
        var hits = CW ? CW.searchEntries(records, input.value) : [];
        results.innerHTML = "";
        if (!input.value.trim()) {
          results.appendChild(U.el("span", {}, "Type a word and tap Search."));
          return;
        }
        if (!hits.length) {
          results.appendChild(U.el("span", {}, "No local entries match that search."));
          return;
        }
        var list = U.el("ul", { class: "price-offer-list" });
        hits.forEach(function (h) {
          list.appendChild(U.el("li", {}, [
            U.el("button", { class: "btn btn-primary btn-sm", type: "button", onclick: function () { showDetail(h.id, { view: "index" }); } }, h.title),
            U.el("span", {}, " — " + LABELS[h.registry] + " · " + badge(h.verificationStatus))
          ]));
        });
        results.appendChild(list);
      }
      input.onkeyup = function (ev) { if (ev && ev.key === "Enter") runSearch(); };
      root.appendChild(panel("🔍 Search the encyclopedia", [
        input,
        U.el("button", { class: "btn btn-primary btn-sm", type: "button", onclick: runSearch }, "Search"),
        results
      ]));

      // Registry index with real counts.
      var rows = U.el("ul", { class: "price-offer-list" });
      (CW ? CW.REGISTRIES : []).forEach(function (reg) {
        var count = CW.entriesByRegistry(records, reg).length;
        rows.appendChild(U.el("li", {}, [
          U.el("button", { class: "btn btn-primary btn-sm", type: "button", onclick: function () { showList(reg); } }, LABELS[reg]),
          U.el("span", {}, " — " + count + (count === 1 ? " entry" : " entries"))
        ]));
      });
      root.appendChild(panel("📚 Registry index", [
        U.el("div", { class: "api-meta" }, "Counts are real entries in the local store. Empty registries say so honestly — nothing here is padded."),
        rows
      ]));

      // 60 Ways taxonomy card — the single source of truth for the Ways.
      root.appendChild(panel("💎 60-WAY TAXONOMY", [
        U.el("div", { class: "api-meta" }, "STATUS: " + String(meta.status).replace(/_/g, " ")),
        U.el("div", { class: "api-meta" }, "VERIFIED: " + meta.importedCategoryCount + " / " + meta.expectedCategoryCount),
        U.el("div", { class: "api-meta" },
          "The authoritative category names are not in this app yet. Way entries appear only " +
          "through an authoritative import — the encyclopedia never invents them.")
      ]));

      // Schema reference — labels, not records.
      root.appendChild(panel("🧭 Activity families (schema labels, not records)", [
        U.el("div", { class: "api-meta" }, "Families organize activities. They are not opportunities, earning guarantees, protocols, assets, strategies, or the 60 Ways."),
        labelList(CW.ACTIVITY_FAMILIES.map(function (f) { return f.id + ". " + f.name; }))
      ]));
      root.appendChild(panel("💰 Asset classes (schema labels, not holdings)", [labelList(CW.ASSET_CLASSES)]));
      root.appendChild(panel("⚠️ Risk dimensions (labels only, no scores)", [labelList(CW.RISK_DIMENSIONS)]));
      root.appendChild(panel("🧭 Activity modes", [labelList(CW.MODES)]));
      root.appendChild(panel("✅ Verification states", [
        U.el("div", { class: "api-meta" }, "Present in the encyclopedia is not verified. Only VERIFIED entries carry a source and a last-checked time."),
        labelList(CW.VERIFICATION_STATES)
      ]));

      // Guided questions — what the encyclopedia answers once entries exist.
      root.appendChild(panel("🔭 Questions this encyclopedia answers", [
        U.el("div", { class: "api-meta" },
          "Each question is answered from real entries once they exist. Today, where no entries " +
          "exist yet, the honest answer is that nothing is recorded — not a guess."),
        labelList([
          "What can I do with this asset? — Assets, then its linked activities.",
          "What protocols support this activity? — Activities, then linked protocols.",
          "What chains can I use? — Assets and protocols, then linked chains.",
          "What activities exist under this Way? — 60 Ways, once the taxonomy is imported.",
          "What are the risks? — Risks linked to the entry.",
          "What can the bots research? — Bot Capabilities.",
          "What requires wallet approval? — Entries whose mode is TRANSACTIONAL and verified.",
          "What is informational versus transactional? — The entry's mode and verification badge."
        ])
      ]));
    }

    function showList(registry) {
      root.innerHTML = "";
      header();
      root.appendChild(backBtn("← Back to index", showIndex));
      var entries = CW ? CW.entriesByRegistry(records, registry) : [];
      var kids = [U.el("div", { class: "api-meta" }, entries.length + (entries.length === 1 ? " entry." : " entries."))];
      if (registry === "ways") {
        kids.push(U.el("div", { class: "api-meta" },
          "Way entries appear only through an authoritative import. Current status: " +
          String(meta.status).replace(/_/g, " ") + " — " + meta.importedCategoryCount + " / " + meta.expectedCategoryCount + " verified."));
      }
      if (!entries.length && registry !== "ways") {
        kids.push(U.el("div", { class: "api-meta" }, "No entries recorded here yet."));
      }
      var list = U.el("ul", { class: "price-offer-list" });
      entries.forEach(function (e) {
        list.appendChild(U.el("li", {}, [
          U.el("button", { class: "btn btn-primary btn-sm", type: "button", onclick: function () { showDetail(e.id, { view: "list", registry: registry }); } }, e.title),
          U.el("span", {}, " · " + badge(e.verificationStatus))
        ]));
      });
      kids.push(list);
      root.appendChild(panel("📚 " + LABELS[registry], kids));
    }

    function showDetail(id, prev) {
      root.innerHTML = "";
      header();
      root.appendChild(backBtn("← Back", function () {
        if (prev && prev.view === "list") showList(prev.registry); else showIndex();
      }));
      var entry = CW ? CW.getEntry(records, id) : null;
      if (!entry || !CW.isEntry(entry)) {
        root.appendChild(panel("Entry not found", [
          U.el("div", { class: "api-meta" }, "That entry is not in the local encyclopedia.")
        ]));
        return;
      }
      var kids = [
        U.el("div", { class: "api-meta" }, badge(entry.verificationStatus)),
        U.el("div", { class: "api-meta" }, entry.definition)
      ];
      if (entry.aliases && entry.aliases.length) {
        kids.push(U.el("div", { class: "api-meta" }, "Also known as: " + entry.aliases.join(", ")));
      }
      var related = CW.relatedEntries(records, entry);
      if (related.length) {
        var rlist = U.el("ul", { class: "price-offer-list" });
        related.forEach(function (r) {
          rlist.appendChild(U.el("li", {}, [
            U.el("button", { class: "btn btn-primary btn-sm", type: "button", onclick: function () { showDetail(r.id, { view: "detail", id: entry.id }); } }, r.title),
            U.el("span", {}, " — " + LABELS[r.registry])
          ]));
        });
        kids.push(U.el("div", { class: "api-meta" }, "Related entries:"));
        kids.push(rlist);
      }
      var dangling = CW.danglingRefs(records, entry);
      if (dangling.length) {
        kids.push(U.el("div", { class: "api-meta" }, "Not yet in the encyclopedia: " + dangling.join(", ")));
      }
      if (entry.source) kids.push(U.el("div", { class: "api-meta" }, "Source: " + entry.source));
      if (entry.sourceTimestamp) kids.push(U.el("div", { class: "api-meta" }, "Source time: " + entry.sourceTimestamp));
      if (entry.lastChecked) kids.push(U.el("div", { class: "api-meta" }, "Last checked: " + entry.lastChecked));
      if (entry.assetClass) kids.push(U.el("div", { class: "api-meta" }, "Asset class: " + entry.assetClass));
      if (entry.modes) kids.push(U.el("div", { class: "api-meta" }, "Modes: " + (Array.isArray(entry.modes) ? entry.modes.join(", ") : entry.modes)));
      root.appendChild(panel(entry.title + " — " + LABELS[entry.registry], kids));
    }

    showIndex();
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.encyclopedia = { render: render };
})(window);
