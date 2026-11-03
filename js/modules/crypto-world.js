/* MTI6-GTADWIY-COCKPIT — Crypto World registry screen (Part 1, read-only)
 * Renders the Crypto World foundation from js/crypto-world.js: the
 * 60-way taxonomy status, activity families, and per-registry counts
 * derived from real records only. No network calls, no wallet, no
 * transactions, no lists of actions — Part 2 fills activities
 * family-by-family. If the local store cannot be read, the screen says
 * so honestly and the rest of the app is unaffected.
 * Rendering only — all taxonomy, validation, and storage live in
 * crypto-world.js. Analytics is untouched by this screen.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

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

  async function render(root) {
    var CW = global.CryptoWorld;
    root.innerHTML = "";
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
    var meta = null;
    try { meta = CW ? await CW.getTaxonomyMeta() : null; } catch (e) { meta = null; }
    meta = meta || (CW ? CW.defaultTaxonomyMeta() : { expectedCategoryCount: 60, importedCategoryCount: 0, status: "TAXONOMY_IMPORT_PENDING" });

    if (storeNote) root.appendChild(U.el("div", { class: "api-meta" }, storeNote));

    // 60 Ways taxonomy card — metadata only, never 60 blank records.
    var importBtn = U.el("button", {
      class: "btn btn-primary btn-sm", type: "button", disabled: true,
      title: "Import arrives when the authoritative category list is supplied and verified."
    }, "Import Taxonomy");
    var taxPanel = U.el("div", { class: "api-panel" }, [
      U.el("h2", { class: "api-title" }, "💎 60-WAY TAXONOMY"),
      U.el("div", { class: "api-meta" }, "STATUS: " + String(meta.status).replace(/_/g, " ")),
      U.el("div", { class: "api-meta" }, "VERIFIED: " + meta.importedCategoryCount + " / " + meta.expectedCategoryCount),
      U.el("div", { class: "api-meta" },
        "The authoritative category names are not in this app yet. Real Way records appear " +
        "only when their names and definitions are imported and verified — nothing here is a placeholder opportunity."),
      importBtn
    ]);
    root.appendChild(taxPanel);

    // Activity families — organizational labels only.
    root.appendChild(section("🧭 Activity Families (organizational only)",
      "Families organize activities. They are not opportunities, earning guarantees, " +
      "protocols, assets, strategies, or the 60 Ways. Part 2 fills activities family-by-family."));
    root.appendChild(labelList(CW.ACTIVITY_FAMILIES.map(function (f) { return f.id + ". " + f.name; })));

    root.appendChild(section("💰 Assets",
      (counts.assets || 0) + " asset records. Asset classes below are schema labels, not holdings. " +
      "Unknown contracts display UNKNOWN / NOT VERIFIED / NOT CONNECTED."));
    root.appendChild(labelList(CW.ASSET_CLASSES));

    root.appendChild(section("⛓️ Chains / Networks", (counts.chains || 0) + " chain records."));
    root.appendChild(section("🏛️ Protocols / DApps", (counts.protocols || 0) + " protocol records."));
    root.appendChild(section("🎯 Strategies", (counts.strategies || 0) + " strategy records. A strategy (e.g. arbitrage) is not an activity (e.g. swap) and not a protocol."));
    root.appendChild(section("🤖 Bot Capabilities",
      (counts.botcapabilities || 0) + " bot capability records. Part 1 capabilities are research-only; " +
      "nothing here can transact, and INFORMATIONAL never implies TRANSACTIONAL."));
    root.appendChild(section("⚠️ Risks (dimensions, no scores)",
      "Risk dimensions below are categories only. Part 1 assigns no risk scores and no risk verdicts."));
    root.appendChild(labelList(CW.RISK_DIMENSIONS));
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
  global.CockpitModules["crypto-world"] = { render: render };
})(window);
