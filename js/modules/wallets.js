/* MTI6-GTADWIY-COCKPIT — Wallet Command Center (Wallet Infrastructure Phase 1)
 *
 * PHASE 1 IS INFRASTRUCTURE AND UI ONLY. Nothing here can execute a
 * financial operation, and nothing here claims to.
 *
 * Truth rules enforced in this file:
 *  - No wallet is fabricated. No address, balance, position, opportunity
 *    or bot activity is invented anywhere on this screen.
 *  - No wallet record type exists yet, so WALLET INVENTORY is empty by
 *    design and says so. Adding a reference requires a persistence store
 *    the owner has NOT approved (see wallet-persistence-note below), so
 *    the add action is disabled and explains why.
 *  - Balances and asset values are NEVER generated as samples. The
 *    asset surface has no live data source, so it reports absence.
 *  - UNKNOWN stays UNKNOWN. Nothing in this file converts an unknown
 *    cost or value into zero.
 *  - EXECUTE is DISABLED and every capability leading to it is stated
 *    as unavailable, not as "coming soon".
 *
 * Security: this file never reads, writes, prompts for, or stores a seed
 * phrase, private key, wallet password, signing secret, or any other
 * credential. It has no signing path and no contract-write path.
 *
 * Storage: IndexedDB remains v3. This file does NOT touch js/db.js and
 * adds no object store. No new localStorage key is introduced here.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  // ---- Capability ladder -------------------------------------------------
  // The approved progression a bot/worker must climb before it could ever
  // move funds. Phase 1 supports the first three as READ-ONLY states and
  // leaves the rest explicitly disabled.
  var CAPABILITIES = [
    { key: "MONITOR", state: "NOT CONNECTED", enabled: false, note: "No wallet data source is connected, so there is nothing to monitor yet. This is the only rung a bot may use unattended, and only against real data." },
    { key: "ANALYZE", state: "NOT CONNECTED", enabled: false, note: "Analysis runs only on real available data. There is no connected wallet data, so analysis has nothing to operate on." },
    { key: "RECOMMEND", state: "NOT CONNECTED", enabled: false, note: "No recommendations are shown. Nothing on this screen is an earning promise, a return, or an APY." },
    { key: "PREPARE", state: "DISABLED", enabled: false, note: "Transaction preparation is not implemented and not authorized in Phase 1." },
    { key: "OWNER APPROVAL", state: "REQUIRED", enabled: false, note: "Owner approval is mandatory for any future financial action. It cannot be waived, delegated, or automated away." },
    { key: "EXECUTE", state: "DISABLED", enabled: false, note: "Execution is disabled. This build cannot sign, send, swap, bridge, stake, lend, borrow, claim, or approve anything." }
  ];

  // ---- Earning-engine readiness -----------------------------------------
  // The dimensions a future VERIFIED opportunity will have to carry. None
  // is populated, because no opportunity has been through the approved
  // discovery workflow (DISCOVERED → VERIFY → CLASSIFY → OWNER APPROVAL → ADD).
  var EARNING_DIMENSIONS = [
    "Asset involved",
    "Chain / network",
    "Opportunity / activity",
    "Strategy",
    "Protocol / source (only when verified)",
    "Estimated costs (only when actual data exists)",
    "Risk dimensions",
    "Dependencies",
    "Eligibility / access requirements",
    "Data freshness",
    "Verification state",
    "Assigned bot / worker",
    "Execution capability / state",
    "Owner approval requirement"
  ];

  var FLOW = [
    "Wallet / account",
    "Verified available assets",
    "Eligible opportunities",
    "Risk / cost evaluation",
    "Bot assignment",
    "Transaction preparation",
    "Owner approval",
    "Execution — DISABLED"
  ];

  // ---- Small builders ----------------------------------------------------

  function panel(title, children) {
    var node = U.el("div", { class: "api-panel" }, [U.el("h3", {}, title)]);
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  function meta(text) {
    return U.el("div", { class: "api-meta" }, text);
  }

  function row(label, value) {
    return U.el("div", { class: "status-row" }, [
      U.el("span", {}, label),
      U.el("span", { class: "status-value" }, value)
    ]);
  }

  function navButton(label, route) {
    var b = U.el("button", { class: "btn btn-secondary", type: "button" }, label);
    b.addEventListener("click", function () { location.hash = "#/" + route; });
    return b;
  }

  function buttonRow(buttons) {
    return U.el("div", { class: "modal-actions", style: "justify-content:flex-start" }, buttons);
  }

  function emptyState(title, lines) {
    var node = U.el("div", { class: "wallet-empty" }, [U.el("div", { class: "wallet-empty-title" }, title)]);
    (lines || []).forEach(function (l) { node.appendChild(meta(l)); });
    return node;
  }

  // ---- Render ------------------------------------------------------------

  async function render(root) {
    root.innerHTML = "";
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("wallets") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "◈ Wallets"));
    root.appendChild(U.el("p", { class: "api-subtitle" },
      "Wallet Command Center — Phase 1 foundation. No wallet is connected, no balance or position is shown, and this build cannot sign, send, swap, stake, bridge, lend, borrow, claim, or approve anything. Every value below is real state; unknown means unknown, never zero."));

    // ---- A. Wallet status -------------------------------------------------
    root.appendChild(panel("Wallet status", [
      row("Wallet connection", "NOT CONNECTED"),
      row("Wallet reference mode", "WATCH-ONLY / REFERENCE ONLY"),
      row("Connection configuration", "CONNECTION NOT CONFIGURED"),
      row("Financial execution", "EXECUTION DISABLED"),
      row("Transaction signing", "SIGNING DISABLED"),
      meta("No wallet provider, network, or read-only source is configured in this build. A connected state is shown only when real supported data backs it — it is never assumed."
      )
    ]));

    // ---- B. Wallet inventory / reference area -----------------------------
    var inventoryChildren = [];
    inventoryChildren.push(emptyState("No wallet references — empty state", [
      "0 wallet references stored. Nothing is fabricated to fill this space."
    ]));
    inventoryChildren.push(U.el("div", { class: "wallet-field-grid" }, [
      row("Wallet label", "— no wallet reference"),
      row("Supported network / chain", "— no wallet reference"),
      row("Public address", "— no wallet reference"),
      row("Connection / status state", "NOT CONNECTED"),
      row("Wallet / provider type", "— not known"),
      row("Watch-only / read-only", "Yes — reference only"),
      row("Last data refresh", "— never refreshed (no source)")
    ]));
    inventoryChildren.push(meta("A wallet reference will hold only the fields above. It never holds a seed phrase, private key, wallet password, or signing secret — those are not collected, generated, or stored anywhere in this app, and a public address is a label, not a credential."));

    var addBtn = U.el("button", { class: "btn btn-secondary", type: "button", disabled: "disabled", "aria-disabled": "true" }, "Add wallet reference — unavailable");
    inventoryChildren.push(buttonRow([addBtn]));
    inventoryChildren.push(meta("Add is disabled because storing a wallet reference needs a persistence store that does not exist yet. IndexedDB is pinned at v3 for Phase 1 — no object store was added, renamed, or removed. IndexedDB v4 requires separate owner approval, and the requirement is documented for that review rather than worked around."));
    root.appendChild(panel("Wallet inventory — reference area", inventoryChildren));

    // ---- C. Asset / balance surface ---------------------------------------
    root.appendChild(panel("Assets & balances", [
      row("Verified balances", "NONE — NOT CONNECTED"),
      row("Assets tracked", "NONE — NOT CONNECTED"),
      row("Total value", "UNKNOWN — no verified data source"),
      meta("No live balance source is approved or connected. No sample, placeholder, or example balance is ever generated on this screen, because a sample balance is indistinguishable from real money. This surface stays empty until a verified read-only source exists."
      )
    ]));

    // ---- D. Positions connection ------------------------------------------
    root.appendChild(panel("Positions & Assets", [
      meta("Positions and assets are owned by the Positions & Assets screen — this screen does not duplicate, copy, or shadow that module. When a read-only source is connected, positions appear there and this panel links to them."),
      row("Positions from this wallet", "NONE — NOT CONNECTED"),
      buttonRow([navButton("Open Positions & Assets", "positions")])
    ]));

    // ---- E. Opportunities connection --------------------------------------
    var flowList = U.el("ul", { class: "price-offer-list" });
    FLOW.forEach(function (step, i) {
      flowList.appendChild(U.el("li", {}, String(i + 1) + ". " + step));
    });
    root.appendChild(panel("Opportunities", [
      meta("Opportunities are owned by the Opportunities screen — this screen does not duplicate it. The intended flow from a wallet is: wallet/account → verified assets → eligible opportunities → risk/cost evaluation → bot assignment → transaction preparation → owner approval → execution."),
      meta("Steps 1–3 are not reachable yet because no wallet or verified asset source is connected. Execution (step 8) is disabled in Phase 1 regardless."),
      flowList,
      row("Eligible opportunities", "NONE — no verified assets"),
      buttonRow([navButton("Open Opportunities", "opportunities")])
    ]));

    // ---- Bot + wallet permission foundation -------------------------------
    var capList = U.el("div", { class: "wallet-cap-list" });
    CAPABILITIES.forEach(function (c) {
      capList.appendChild(U.el("div", { class: "wallet-cap" + (c.enabled ? "" : " wallet-cap-off") }, [
        U.el("div", { class: "wallet-cap-head" }, [
          U.el("span", { class: "wallet-cap-key" }, c.key),
          U.el("span", { class: "wallet-cap-state" }, c.state)
        ]),
        meta(c.note)
      ]));
    });
    root.appendChild(panel("Bot & wallet permissions", [
      meta("A bot or worker may eventually interact with wallet capabilities, but NO BOT CAN CONTROL FUNDS IN PHASE 1. Each rung below is a separate authorization; reaching one never implies the next."),
      capList,
      row("Bot financial control", "NONE — not granted, not grantable in Phase 1"),
      row("Workers active", "0 — NOT CONNECTED"),
      meta("Worker count is reported by the real worker system and is zero because no worker orchestration is connected. It is not incremented for display."),
      row("Tribe principals assigned to wallets", "NONE — all 12 slots unassigned"),
      meta("No Tribe principal, bot identity, or role is invented or pre-assigned to a wallet here; assignment happens only by owner approval elsewhere in the cockpit."),
      buttonRow([navButton("Open Bot Operations", "bot-ops")])
    ]));

    // ---- Earning engine foundation ----------------------------------------
    var dimList = U.el("ul", { class: "price-offer-list" });
    EARNING_DIMENSIONS.forEach(function (d) { dimList.appendChild(U.el("li", {}, d + " — not populated")); });
    root.appendChild(panel("Earning engine — readiness", [
      meta("Phase 1 builds the shape of the surface only. No earning behaviour runs, and no autonomous money-making logic exists here or is scheduled by this build."),
      meta("A future verified opportunity must be able to carry every dimension below. None is populated: no opportunity has completed the approved discovery workflow (DISCOVERED → VERIFY → CLASSIFY → OWNER APPROVAL → ADD)."),
      dimList,
      row("Estimated costs", "UNKNOWN — never assumed to be zero"),
      row("Verified APY / return", "NONE — no rates are shown or invented"),
      row("Profitability assessment", "NOT ASSESSED — no supporting data"),
      meta("Costs, returns, and profitability are stated as unknown or absent rather than as zero or as an estimate, because an invented number would read as an earning promise."
      )
    ]));

    // ---- Security & execution status --------------------------------------
    root.appendChild(panel("Security & execution status", [
      row("Seed phrase / private key storage", "NONE — never collected, requested, or stored"),
      row("Signing capability", "NONE — no signing path exists in this build"),
      row("Transaction broadcast", "DISABLED"),
      row("Contract interaction", "DISABLED — no financial contract writes"),
      row("Token approval / allowance changes", "DISABLED"),
      row("Stake / lend / borrow / bridge / claim", "DISABLED"),
      row("Bot connection to real funds", "DISABLED"),
      meta("This screen has no code path that signs, sends, swaps, bridges, stakes, lends, borrows, farms, claims, or approves an allowance. Credentials are not accepted anywhere in this app — not in the UI, not in storage, not in a log."
      )
    ]));

    // ---- Reference --------------------------------------------------------
    root.appendChild(panel("Reference", [
      meta("Wallet and asset operations are defined as an organizational family in the Crypto Encyclopedia — holding, sending, receiving, tracking, and organizing digital assets, including permission and approval management without storing private keys or seed phrases."),
      buttonRow([navButton("Read the wallet reference in the Encyclopedia", "encyclopedia")])
    ]));
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.wallets = { render: render };
})(window);
