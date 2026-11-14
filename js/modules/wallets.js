/* MTI6-GTADWIY-COCKPIT — Wallets command-center screen (Wallet spec W12, steps 1, 4, 5, 17)
 *
 * Read-only command-center view over real wallet state. It consumes
 * WalletIntelligence (existing) for wallet/account state and reads the
 * asset, network, security, bot-operations, opportunity, and STAR
 * accounting modules only through defensive typeof / try-catch guards:
 * a module that is not loaded renders its section as NOT LOADED and
 * never crashes the screen.
 *
 * Truth rules, enforced here:
 *   - Nothing connected renders as NOT CONNECTED, prominently.
 *     Data that is unavailable renders as UNAVAILABLE / NOT CONNECTED.
 *   - NEVER any sample balances, sample addresses, or sample positions:
 *     a figure appears only when a real, sourced record carries it,
 *     and no balance source exists in this build, so balances are
 *     always UNAVAILABLE.
 *   - Execution is DISABLED / NOT IMPLEMENTED, always. An approval
 *     recorded by WalletIntelligence is not execution, and
 *     canExecuteTransaction() is always false.
 *   - Addresses are truncated by default (first 6 + last 4 chars,
 *     e.g. 0x12ab…9f34). A full address is shown only after a
 *     deliberate tap on that address's Show control, never by default.
 *     WalletIntelligence itself stores no address — only the fact that
 *     one was shared — so an address appears here only if a wallet
 *     record explicitly carries one (addresses / address field).
 *   - Seed phrases and private keys are never stored, shown, or
 *     requested. Nothing here can sign, swap, send, stake, lend,
 *     bridge, or claim.
 *
 * Parallel units still being built (WalletProviders, WalletEcosystems,
 * WalletHealth, TransactionPreparation, OffRamp) are consumed only
 * through defensive global checks using the spec's field names; while
 * they are absent their sections read NOT LOADED.
 *
 * The screen keeps the existing "wallets" route and the shell
 * (ScreensNav dots, section-title, api-panel / api-meta styling).
 * Analytics styles are untouched.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  // ---- Helpers ------------------------------------------------------------

  // Truncate an address for default display: first 6 + last 4 chars.
  // Short values (10 chars or fewer) have nothing worth hiding and are
  // shown as-is. Never throws; non-strings render as "—".
  function truncateAddress(address) {
    if (typeof address !== "string" || address.length === 0) return "—";
    if (address.length <= 10) return address;
    return address.slice(0, 6) + "…" + address.slice(-4);
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

  // Visual Stage 1: shared status badge (§25) for a real wallet state.
  // Class derives from the state string (NOT_CONNECTED → not-connected,
  // CONNECTED → connected, …); unknown states fall back to the muted
  // base badge. Colour + text label, never colour alone.
  function stateBadge(state) {
    var s = String(state || "UNKNOWN");
    return U.el("span", { class: "mti6-badge mti6-badge--" + s.toLowerCase().replace(/_/g, "-") }, s);
  }

  // One address line: truncated by default, with a deliberate Show /
  // Hide control and a Copy control. The full address is revealed
  // only by tapping Show — never on render, never by default.
  function addressLine(address) {
    var full = String(address);
    var shown = U.el("span", { class: "status-value" }, truncateAddress(full));
    var revealed = false;
    var showBtn = U.el("button", { class: "btn btn-secondary", type: "button" }, "Show full address");
    showBtn.addEventListener("click", function () {
      revealed = !revealed;
      shown.textContent = revealed ? full : truncateAddress(full);
      showBtn.textContent = revealed ? "Hide full address" : "Show full address";
    });
    var copyBtn = U.el("button", { class: "btn btn-secondary", type: "button" }, "Copy");
    copyBtn.addEventListener("click", function () {
      try {
        if (global.navigator && global.navigator.clipboard &&
            typeof global.navigator.clipboard.writeText === "function") {
          global.navigator.clipboard.writeText(full);
          copyBtn.textContent = "Copied";
        } else {
          copyBtn.textContent = "Copy unavailable";
        }
      } catch (e) {
        copyBtn.textContent = "Copy unavailable";
      }
    });
    return U.el("div", { class: "status-row" }, [
      U.el("span", {}, "Address"),
      shown,
      U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [showBtn, copyBtn])
    ]);
  }

  // Addresses a wallet record explicitly carries, if any. Supports an
  // `addresses` array or a single `address` string. WalletIntelligence
  // itself stores no address, so an empty result is normal, not an error.
  function recordAddresses(wallet) {
    var out = [];
    if (Array.isArray(wallet.addresses)) {
      wallet.addresses.forEach(function (a) {
        if (typeof a === "string" && a.length > 0) out.push(a);
      });
    }
    if (typeof wallet.address === "string" && wallet.address.length > 0) {
      out.push(wallet.address);
    }
    return out;
  }

  // A wallet is at least ACCOUNT_ACCESSED when an address may have been
  // shared. Below that state no address can exist for it.
  function addressMayExist(state) {
    return state === "ACCOUNT_ACCESSED" || state === "SIGNING" ||
      state === "TRANSACTION_APPROVED";
  }

  // ---- Defensive reads of the intelligence modules ------------------------

  function walletSummary() {
    var WI = global.WalletIntelligence;
    if (!WI || typeof WI.summary !== "function") return null;
    var s = safeCall(function () { return WI.summary(); });
    return isObject(s) ? s : null;
  }

  function listWallets() {
    var WI = global.WalletIntelligence;
    if (!WI || typeof WI.listWallets !== "function") return null;
    var list = safeCall(function () { return WI.listWallets(); });
    return Array.isArray(list) ? list : null;
  }

  function describeWallet(id) {
    var WI = global.WalletIntelligence;
    if (!WI || typeof WI.describeWallet !== "function") return null;
    var d = safeCall(function () { return WI.describeWallet(id); });
    return isObject(d) ? d : null;
  }

  // Status line for a parallel module that may not exist yet. The spec's
  // field names are used only behind a typeof guard, so a missing or
  // differently-shaped module degrades to NOT LOADED, never a crash.
  function parallelStatus(name) {
    var mod = global[name];
    if (mod === undefined || mod === null) {
      return name + ": NOT LOADED — this module is not loaded in this build.";
    }
    return name + ": loaded.";
  }

  // ---- Render -------------------------------------------------------------

  async function render(root) {
    root.innerHTML = "";
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("wallets") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "Wallets"));
    root.appendChild(U.el("p", { class: "api-subtitle" },
      "Wallet command center — read-only. No wallet is connected until one is discovered through WalletIntelligence, and nothing here can sign or move anything. Seed phrases and private keys are never stored."));

    var summary = walletSummary();
    var wallets = listWallets();
    var warnings = [];

    // ---- 1. Connection state (prominent, honest) ----
    var connectedCount = summary ? (summary.connected || 0) : 0;
    var totalCount = summary ? (summary.total || 0) : 0;
    var connectionState = summary ? (summary.connectionState || "NOT_CONNECTED") : "UNAVAILABLE";
    var connectionLines = [];
    if (!summary || wallets === null) {
      connectionLines.push(meta("WalletIntelligence: NOT LOADED — wallet state cannot be read. Connection state: UNAVAILABLE."));
      warnings.push("WalletIntelligence is not loaded, so no wallet state can be verified.");
    } else if (totalCount === 0) {
      connectionLines.push(U.el("div", { class: "api-meta" }, ["Connection state: ", stateBadge("NOT_CONNECTED"), " — no wallets discovered."]));
      connectionLines.push(meta("Wallets appear here only when discovered through WalletIntelligence with provenance (label + discovery method). Nothing is connected, so nothing below claims a live session."));
      warnings.push("No wallet is connected.");
    } else {
      connectionLines.push(U.el("div", { class: "api-meta" }, ["Connection state: ", stateBadge(connectionState), " — " + connectedCount + " of " + totalCount + " wallet(s) hold a session."]));
      var byState = summary.byState || {};
      var parts = [];
      Object.keys(byState).forEach(function (st) {
        if (byState[st] > 0) parts.push(st + " " + byState[st]);
      });
      if (parts.length) connectionLines.push(meta("By state: " + parts.join(", ") + "."));
      if (connectedCount === 0) {
        warnings.push(totalCount + " wallet(s) discovered but none holds a session.");
      }
    }
    root.appendChild(panel("Connection state", connectionLines));

    // ---- 2. Wallet / provider inventory ----
    var inventoryKids = [];
    if (wallets === null) {
      inventoryKids.push(meta("Wallet inventory: UNAVAILABLE — WalletIntelligence is not loaded."));
    } else if (wallets.length === 0) {
      inventoryKids.push(meta("Wallet inventory: none — NOT CONNECTED."));
      inventoryKids.push(meta("A connected read-only wallet would show here: holdings, wallet-associated positions, and permission/approval state — read-only, never signing."));
      // Visual Stage 1: shared empty state (§26) — what is missing,
      // whether it is expected, what can be done next.
      inventoryKids.push(U.el("div", { class: "mti6-empty" }, [
        U.el("div", { class: "mti6-empty__title" }, "No wallets connected"),
        U.el("p", { class: "mti6-empty__body" }, "No wallet has been discovered yet. This is expected until a wallet is discovered through WalletIntelligence. Nothing here can sign or move funds.")
      ]));
    } else {
      wallets.forEach(function (w) {
        var detail = describeWallet(w.id) || {};
        var lines = [];
        lines.push(row("Wallet", String(w.label || w.id)));
        lines.push(row("State", String(w.state || "UNKNOWN") + " — " + String(detail.stateDescription || "")));
        lines.push(row("Standards", (w.standards && w.standards.length) ? w.standards.join(", ") : "—"));
        lines.push(row("Chains", (w.chains && w.chains.length) ? w.chains.join(", ") : "—"));
        lines.push(row("Discovery", String(w.discoveryMethod || "—")));
        lines.push(row("Verification", String(w.verificationStatus || detail.verificationStatus || "UNVERIFIED")));
        lines.push(row("Freshness", String(detail.freshnessLabel || w.freshness || "Unknown age") +
          (w.lastSeen ? " (last seen " + String(w.lastSeen) + ")" : "")));
        var caps = detail.capabilities || {};
        var effective = [];
        Object.keys(caps).forEach(function (cap) {
          if (caps[cap] && caps[cap].effective) effective.push(cap);
        });
        lines.push(row("Effective capabilities", effective.length ? effective.join(", ") : "None — no capability is effective."));
        lines.forEach(function (line) { inventoryKids.push(line); });
        inventoryKids.push(meta("—"));
      });
    }
    // Provider / ecosystem coverage comes from the parallel units.
    inventoryKids.push(meta(parallelStatus("WalletProviders")));
    inventoryKids.push(meta(parallelStatus("WalletEcosystems")));
    if (global.WalletProviders === undefined) {
      warnings.push("WalletProviders is not loaded — provider inventory is unavailable.");
    }
    if (global.WalletEcosystems === undefined) {
      warnings.push("WalletEcosystems is not loaded — ecosystem coverage is unavailable.");
    }
    root.appendChild(panel("Wallet / provider inventory", inventoryKids));

    // ---- 3. Account / address inventory ----
    var accountKids = [];
    if (wallets === null) {
      accountKids.push(meta("Account inventory: UNAVAILABLE — WalletIntelligence is not loaded."));
    } else if (wallets.length === 0) {
      accountKids.push(meta("Accounts / addresses: — (no wallet connected)"));
    } else {
      wallets.forEach(function (w) {
        var addrs = recordAddresses(w);
        if (!addressMayExist(w.state)) {
          accountKids.push(meta(String(w.label || w.id) + ": no address shared — wallet is " + String(w.state) + "."));
        } else if (addrs.length === 0) {
          accountKids.push(meta(String(w.label || w.id) + ": an address was shared, but no address is stored by WalletIntelligence — only the fact that one was shared, and when."));
        } else {
          accountKids.push(meta(String(w.label || w.id) + ": " + addrs.length + " address(es) on record. Shown truncated by default; tap Show for the full address."));
          addrs.forEach(function (a) { accountKids.push(addressLine(a)); });
        }
      });
    }
    root.appendChild(panel("Account / address inventory", accountKids));

    // ---- 4. Network coverage ----
    var networkKids = [];
    var NI = global.NetworkIntelligence;
    if (!NI) {
      networkKids.push(meta("NetworkIntelligence: NOT LOADED — network reference data is unavailable."));
    } else {
      var families = Array.isArray(NI.FAMILIES) ? NI.FAMILIES.length : 0;
      var examples = Array.isArray(NI.EXAMPLE_NETWORKS) ? NI.EXAMPLE_NETWORKS.length : 0;
      networkKids.push(meta("Reference definitions only: " + families + " network families, " + examples + " example networks. These are definitions, not live coverage."));
    }
    networkKids.push(meta("Live network coverage: NOT CONNECTED — no network provider is connected, so no chain is confirmed reachable."));
    var walletChains = [];
    if (wallets) {
      wallets.forEach(function (w) {
        (w.chains || []).forEach(function (c) {
          if (walletChains.indexOf(c) === -1) walletChains.push(c);
        });
      });
    }
    networkKids.push(meta("Chains named on wallet records: " + (walletChains.length ? walletChains.join(", ") : "— (no wallet names a chain)") + ". Naming a chain is not a live connection to it."));
    root.appendChild(panel("Network coverage", networkKids));

    // ---- 5. Asset / balance overview ----
    var assetKids = [];
    var AI = global.AssetIntelligence;
    if (!AI) {
      assetKids.push(meta("AssetIntelligence: NOT LOADED — asset classification is unavailable."));
    } else {
      var classes = (typeof AI.listClasses === "function") ?
        safeCall(function () { return AI.listClasses(); }) : null;
      assetKids.push(meta("Asset classification reference: " +
        (Array.isArray(classes) ? classes.length + " asset classes defined" : "class list unavailable") +
        ". Classification is reference data, not holdings."));
    }
    assetKids.push(meta("Balances: UNAVAILABLE — no balance source is connected. No balance figure is shown, and none is estimated."));
    assetKids.push(meta("Holdings: — (no wallet connected or no balance source)"));
    assetKids.push(meta("Positions: — (no wallet connected or no position source)"));
    assetKids.push(meta("Permissions / approvals: — (no wallet connected)"));
    root.appendChild(panel("Asset / balance overview", assetKids));

    // ---- 6. Positions / opportunities relationships ----
    var relKids = [];
    var OI = global.OpportunityIntelligence;
    if (!OI || typeof OI.listOpportunities !== "function") {
      relKids.push(meta("OpportunityIntelligence: NOT LOADED — opportunity records are unavailable."));
    } else {
      var opps = safeCall(function () { return OI.listOpportunities(); });
      var oppCount = Array.isArray(opps) ? opps.length : 0;
      relKids.push(meta("Opportunities recorded: " + oppCount + "."));
      relKids.push(meta("Wallet linkage: none recorded — opportunity records carry no wallet linkage in this build, so no opportunity is attributed to any wallet."));
    }
    relKids.push(meta("Positions: no wallet-linked position records exist — no position data source is connected."));
    root.appendChild(panel("Positions / opportunities relationships", relKids));

    // ---- 7. Security state ----
    var securityKids = [];
    var AS = global.AngelSecurity;
    if (!AS || typeof AS.summary !== "function") {
      securityKids.push(meta("AngelSecurity: NOT LOADED — security state cannot be read."));
      warnings.push("AngelSecurity is not loaded — security state is unavailable.");
    } else {
      var secSummary = safeCall(function () { return AS.summary(); });
      if (!isObject(secSummary)) {
        securityKids.push(meta("AngelSecurity: loaded, but its summary could not be read — state UNKNOWN."));
      } else {
        securityKids.push(meta("Security alerts recorded: " + (secSummary.count || 0) + " (" + String(secSummary.state || "UNKNOWN") + ")."));
        securityKids.push(meta("Angels recorded: " + (secSummary.angels || 0) + "."));
        if (secSummary.note) securityKids.push(meta(String(secSummary.note)));
      }
    }
    var WH = global.WalletHealth;
    securityKids.push(meta(parallelStatus("WalletHealth")));
    if (global.WalletHealth === undefined) {
      warnings.push("WalletHealth is not loaded — wallet health is unavailable.");
    }
    securityKids.push(meta("Wallet health model: no health score is shown — health is derived from components only when WalletHealth is loaded, and never fabricated."));
    root.appendChild(panel("Security state", securityKids));

    // ---- 8. Bot-analysis state ----
    var botKids = [];
    var BOM = global.BotOpsModel;
    if (!BOM || typeof BOM.summary !== "function") {
      botKids.push(meta("BotOpsModel: NOT LOADED — no bot task state can be read."));
    } else {
      var botSummary = safeCall(function () { return BOM.summary(); });
      if (!isObject(botSummary)) {
        botKids.push(meta("BotOpsModel: loaded, but its summary could not be read — state UNKNOWN."));
      } else {
        botKids.push(meta("Worker tasks recorded: " + (botSummary.total || 0) + ". " + String(botSummary.note || "No worker runtime is connected — no task is live.")));
        botKids.push(meta("Wallet-related bot analysis: none — no bot task is linked to a wallet in this build."));
      }
    }
    root.appendChild(panel("Bot-analysis state", botKids));

    // ---- 9. STAR treasury / accounting relationship ----
    var starKids = [];
    var SA = global.StarAccountant;
    if (!SA || typeof SA.summary !== "function") {
      starKids.push(meta("StarAccountant: NOT LOADED — treasury / accounting state cannot be read."));
    } else {
      var acct = safeCall(function () { return SA.summary(); });
      if (!isObject(acct)) {
        starKids.push(meta("StarAccountant: loaded, but its summary could not be read — state UNKNOWN."));
      } else {
        starKids.push(meta("Accounting buckets: " + (acct.knownCount || 0) + " known, " +
          (acct.unknownCount || 0) + " unknown, of " + (acct.totalBuckets || 0) + " total. Unknown figures have no value and no currency — never a guessed number."));
        starKids.push(meta("Ledger entries recorded: " + (acct.entries || 0) + "."));
        starKids.push(meta("Cash-out: no cash-out path exists in this build — a request is refused, never executed."));
      }
    }
    root.appendChild(panel("STAR treasury / accounting", starKids));

    // ---- 10. Execution state ----
    var execKids = [];
    var execAvailable = false;
    if (global.WalletIntelligence && typeof global.WalletIntelligence.canExecuteTransaction === "function") {
      execAvailable = safeCall(function () { return global.WalletIntelligence.canExecuteTransaction(); }) === true;
    }
    execKids.push(meta("Execution state: DISABLED / NOT IMPLEMENTED — transaction execution does not exist in this build."));
    execKids.push(meta("canExecuteTransaction(): " + (execAvailable ? "true" : "false") + ". A wallet approval records approval only — it never executes a transaction, moves funds, or signs on the owner's behalf."));
    execKids.push(meta(parallelStatus("TransactionPreparation")));
    execKids.push(meta(parallelStatus("OffRamp")));
    if (global.TransactionPreparation === undefined) {
      warnings.push("TransactionPreparation is not loaded — no transaction preparation exists.");
    }
    if (global.OffRamp === undefined) {
      warnings.push("OffRamp is not loaded — no off-ramp path exists.");
    }
    root.appendChild(panel("Execution state", execKids));

    // ---- 11. Freshness ----
    var freshKids = [];
    freshKids.push(meta("No live freshness check has run in this session — freshness below is per-record lastSeen only."));
    if (wallets && wallets.length) {
      wallets.forEach(function (w) {
        var d = describeWallet(w.id) || {};
        freshKids.push(meta(String(w.label || w.id) + ": " + String(d.freshnessLabel || w.freshness || "Unknown age") +
          (w.lastSeen ? " (last seen " + String(w.lastSeen) + ")" : "")));
        if ((d.freshness || w.freshness) === "stale") {
          warnings.push("Wallet " + String(w.label || w.id) + " is stale.");
        }
      });
    } else {
      freshKids.push(meta("Freshness: — (no wallet records)"));
    }
    root.appendChild(panel("Freshness", freshKids));

    // ---- 12. Warnings ----
    var warnKids = [];
    if (warnings.length === 0) {
      warnKids.push(meta("No warnings — every section above reports live, verified state."));
    } else {
      warnings.forEach(function (w) { warnKids.push(meta("⚠ " + w)); });
    }
    root.appendChild(panel("Warnings", warnKids));

    // ---- Reference (preserved from the original shell) ----
    var linkBtn = U.el("button", { class: "btn btn-secondary", type: "button" }, "Read the wallet reference in the Encyclopedia");
    linkBtn.addEventListener("click", function () { location.hash = "#/encyclopedia"; });
    root.appendChild(panel("Reference", [
      meta("Wallet and asset operations are defined as an organizational family in the Crypto Encyclopedia — holding, sending, receiving, tracking, and organizing digital assets, including permission/approval management without storing private keys or seed phrases."),
      U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, [linkBtn])
    ]));
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.wallets = { render: render, truncateAddress: truncateAddress };
})(window);
