/* MTI6-GTADWIY-COCKPIT — Opportunities shell (master shell, Build 1)
 *
 * No live opportunities are tracked, and nothing here is an earning
 * promise. The screen carries the 28 approved Batch A organizational
 * families, read from the local encyclopedia store — reference
 * families, not opportunities.
 *
 * Item 6 (World Engine Depth Package, Nov 14, 2026): owner intake.
 * The owner can record an opportunity at DISCOVERED through
 * OpportunityIntelligence.addOpportunity; records persist locally
 * (mti6_opportunities_v1) and move only through the existing
 * pipeline, which ends at PREPARED. A recorded opportunity is an
 * owner-entered, UNVERIFIED record — not a live opportunity, not an
 * earning claim. The descriptive returnSource field says WHY an
 * opportunity pays, in words, with a source; numeric return fields
 * remain forbidden by the module's validator.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  function slugify(text) {
    return String(text || "").toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function field(labelText, input) {
    return U.el("div", { class: "api-meta", style: "margin-top:8px" }, [
      U.el("div", {}, labelText),
      input
    ]);
  }

  function textInput(placeholder, listId) {
    var attrs = { class: "price-input", type: "text", placeholder: placeholder };
    if (listId) attrs.list = listId;
    return U.el("input", attrs);
  }

  function datalist(id, values) {
    var dl = U.el("datalist", { id: id });
    (values || []).forEach(function (v) {
      dl.appendChild(U.el("option", { value: v }));
    });
    return dl;
  }

  async function render(root) {
    root.innerHTML = "";
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("opportunities") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "Opportunities"));
    root.appendChild(U.el("p", { class: "api-subtitle" },
      "No live opportunities are tracked. Recording an opportunity is not promising income — nothing here is an earning, a return, or an APY."));

    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "How an opportunity is verified"),
      U.el("div", { class: "api-meta" }, "Discovery workflow: DISCOVERED → VERIFY → CLASSIFY → OWNER APPROVAL → ADD. Rejected, duplicate, stale, or needs-review records are listed, never silently added. Owner-entered records below enter the module pipeline at DISCOVERED and advance only through it; the pipeline ends at PREPARED — there is no execution stage.")
    ]));

    // ---- Recorded opportunities + owner intake (Item 6) ----------------
    var OI = global.OpportunityIntelligence;
    var recordedPanel = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Recorded opportunities")
    ]);
    root.appendChild(recordedPanel);

    var storeRecords = [];
    var storeLoadError = false;
    try {
      if (global.CockpitDB && typeof global.CockpitDB.getAll === "function") {
        storeRecords = (await global.CockpitDB.getAll("cryptoWorld")) || [];
      }
    } catch (e) {
      storeRecords = [];
      storeLoadError = true;
    }
    var byLevel = function (level) {
      return storeRecords.filter(function (r) { return r && r.level === level; })
        .map(function (r) { return r.id; }).sort();
    };

    if (!OI || typeof OI.listOpportunities !== "function") {
      recordedPanel.appendChild(U.el("div", { class: "api-meta" },
        "OpportunityIntelligence is NOT_LOADED on this screen — recorded opportunities cannot be shown or added here."));
    } else {
      var recorded = OI.listOpportunities();
      if (!recorded.length) {
        recordedPanel.appendChild(U.el("div", { class: "api-meta" },
          "No opportunities recorded yet. Owner intake is below; records start at DISCOVERED and stay UNVERIFIED until the pipeline's own checks say otherwise."));
      } else {
        recordedPanel.appendChild(U.el("div", { class: "api-meta" },
          recorded.length + " recorded (owner-entered, persisted locally). Expected value stays UNKNOWN until the pipeline stage allows a sourced estimate."));
        var rlist = U.el("ul", { class: "price-offer-list" });
        recorded.forEach(function (o) {
          var label = (o.title || o.id) + " — " + (o.pipelineState || "DISCOVERED") +
            " · " + (o.verificationStatus || "UNVERIFIED") +
            " · expected gross: " + ((o.expectedGross && o.expectedGross.state) || "UNKNOWN");
          if (o.returnSource && o.returnSource.description) {
            label += " · pays because: " + o.returnSource.description;
          }
          rlist.appendChild(U.el("li", {}, label));
        });
        recordedPanel.appendChild(rlist);
      }

      // Intake form.
      var formPanel = U.el("div", { class: "api-panel" }, [
        U.el("h3", {}, "Owner intake — record a DISCOVERED opportunity"),
        U.el("div", { class: "api-meta" },
          "You are the source: records you enter are marked with your provenance and start UNVERIFIED at DISCOVERED. References should name real encyclopedia / registry ids — pick from the suggestions or type an id; existence is checked by the module's resolver, and an unresolved reference stays visibly unresolved, never silently fixed.")
      ]);
      root.appendChild(formPanel);

      var classIds = (global.AssetIntelligence && typeof global.AssetIntelligence.classIds === "function")
        ? global.AssetIntelligence.classIds() : [];
      var networkIds = (global.NetworkIntelligence && Array.isArray(global.NetworkIntelligence.EXAMPLE_NETWORKS))
        ? global.NetworkIntelligence.EXAMPLE_NETWORKS.map(function (n) { return n.id; }) : [];

      var titleIn = textInput("e.g. USDC lending on Aave (Ethereum)");
      var idIn = textInput("auto from title — editable");
      titleIn.addEventListener("input", function () {
        if (!idIn.dataset.touched) idIn.value = "opp-" + slugify(titleIn.value);
      });
      idIn.addEventListener("input", function () { idIn.dataset.touched = "1"; });
      var assetClassIn = textInput("asset class id, e.g. stablecoin", "opp-asset-classes");
      var chainIn = textInput("chain / network name, e.g. Ethereum");
      var networkIn = textInput("network id, e.g. ethereum-mainnet", "opp-networks");
      var protocolNameIn = textInput("protocol name (optional)");
      var protocolSourceIn = textInput("protocol source (required if a protocol is named)");
      var majorIn = textInput("major activity id", "opp-majors");
      var typeIn = textInput("type id", "opp-types");
      var strategyIn = textInput("strategy id", "opp-strategies");
      var returnDescIn = textInput("why it pays, in words (optional) — e.g. borrowers pay interest on supplied assets");
      var returnSourceIn = textInput("where that description comes from (required with a description)");
      var sourceIn = textInput("record provenance");
      sourceIn.value = "owner-entered";

      formPanel.appendChild(datalist("opp-asset-classes", classIds));
      formPanel.appendChild(datalist("opp-networks", networkIds));
      formPanel.appendChild(datalist("opp-majors", byLevel("MAJOR_ACTIVITY")));
      formPanel.appendChild(datalist("opp-types", byLevel("TYPE")));
      formPanel.appendChild(datalist("opp-strategies", byLevel("STRATEGY")));

      formPanel.appendChild(field("Title", titleIn));
      formPanel.appendChild(field("Record id", idIn));
      formPanel.appendChild(field("Asset class", assetClassIn));
      formPanel.appendChild(field("Chain / network name", chainIn));
      formPanel.appendChild(field("Network id", networkIn));
      formPanel.appendChild(field("Protocol name (optional)", protocolNameIn));
      formPanel.appendChild(field("Protocol source", protocolSourceIn));
      formPanel.appendChild(field("Major Activity id", majorIn));
      formPanel.appendChild(field("Type id", typeIn));
      formPanel.appendChild(field("Strategy id", strategyIn));
      formPanel.appendChild(field("Return source — why it pays (optional)", returnDescIn));
      formPanel.appendChild(field("Return source — provenance", returnSourceIn));
      formPanel.appendChild(field("Record source / provenance", sourceIn));

      var status = U.el("div", { class: "api-meta", style: "margin-top:10px" }, "");
      var submitBtn = U.el("button", { class: "btn btn-secondary", type: "button" }, "Record at DISCOVERED");
      submitBtn.addEventListener("click", function () {
        var rec = {
          id: idIn.value.trim(),
          title: titleIn.value.trim(),
          assetRef: { assetClassId: assetClassIn.value.trim(), chain: chainIn.value.trim() },
          networkRef: { networkId: networkIn.value.trim() },
          majorActivityId: majorIn.value.trim(),
          typeId: typeIn.value.trim(),
          strategyId: strategyIn.value.trim(),
          source: sourceIn.value.trim() || "owner-entered",
          verificationStatus: "UNVERIFIED",
          pipelineState: "DISCOVERED"
        };
        if (protocolNameIn.value.trim() || protocolSourceIn.value.trim()) {
          rec.protocolRef = { name: protocolNameIn.value.trim(), source: protocolSourceIn.value.trim() };
        }
        if (returnDescIn.value.trim() || returnSourceIn.value.trim()) {
          rec.returnSource = { description: returnDescIn.value.trim(), source: returnSourceIn.value.trim() };
        }
        var result = OI.addOpportunity(rec);
        if (!result.ok) {
          status.textContent = "Not recorded: " + result.errors.join(" ");
          return;
        }
        status.textContent = "Recorded at DISCOVERED (UNVERIFIED). Reloading the list…";
        render(root);
      });
      formPanel.appendChild(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [submitBtn]));
      formPanel.appendChild(status);
    }

    var listPanel = U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Reference families — Batch A (28)"),
      U.el("div", { class: "api-meta" }, "Loading families from the local encyclopedia store…")
    ]);
    root.appendChild(listPanel);

    var families = storeRecords.filter(function (r) {
      return r && r.registry === "activities" && r.level === "FAMILY";
    }).sort(function (a, b) {
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
    var loadError = storeLoadError;

    listPanel.innerHTML = "";
    listPanel.appendChild(U.el("h3", {}, "Reference families — Batch A (28)"));
    if (loadError) {
      listPanel.appendChild(U.el("div", { class: "api-meta" }, "Could not read the local encyclopedia store. Open the Encyclopedia once and try again."));
    } else if (!families.length) {
      listPanel.appendChild(U.el("div", { class: "api-meta" }, "No families loaded yet — open the Encyclopedia once to run the approved import."));
    } else {
      listPanel.appendChild(U.el("div", { class: "api-meta" },
        families.length + " organizational families, imported and validated (Batch A). These are reference structure, not opportunities and not earning promises."));
      var list = U.el("ul", { class: "price-offer-list" });
      families.forEach(function (f) {
        list.appendChild(U.el("li", {}, (f.title || f.id) + " — " + (f.workspace || "—") + " · " + (f.globeView || "—")));
      });
      listPanel.appendChild(list);
      var encBtn = U.el("button", { class: "btn btn-secondary", type: "button" }, "Open the Encyclopedia");
      encBtn.addEventListener("click", function () { location.hash = "#/encyclopedia"; });
      listPanel.appendChild(U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [encBtn]));
    }
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.opportunities = { render: render };
})(window);
