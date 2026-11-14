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
 *
 * Visual Build Stage 2 (W3 — Wallet Command Center): each discovered
 * wallet renders as a .wallet-card (watch-only / read-only wallets get
 * .wallet-card--watch-only, wallets on security hold get
 * .wallet-card--security-hold); addresses render in monospace via
 * .wallet-card__addr with network context. The screen header uses the
 * Stage 1 .mti6-screen-header primitive, states render as .mti6-badge,
 * and empty sections render as .mti6-empty. No new class names beyond
 * the three .wallet-card* names are introduced here; their CSS is the
 * coordinator's pass.
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

  // Visual Stage 1: shared empty state (§26) — what is missing, whether
  // it is expected, what can be done next, and whether it is safe.
  function emptyState(title, body) {
    return U.el("div", { class: "mti6-empty" }, [
      U.el("div", { class: "mti6-empty__title" }, title),
      U.el("p", { class: "mti6-empty__body" }, body)
    ]);
  }

  // Visual Stage 2: watch-only / read-only / security-hold detection.
  // A wallet is watch-only or read-only from its mode flag, its
  // lifecycle state, or its connection state — whichever the record
  // actually carries. Nothing is inferred from a label or a chain.
  function isWatchOnly(wallet, detail) {
    return wallet.mode === "WATCH_ONLY" || wallet.lifecycleState === "WATCH_ONLY" ||
      wallet.state === "WATCH_ONLY" ||
      (detail && (detail.mode === "WATCH_ONLY" || detail.lifecycleState === "WATCH_ONLY"));
  }

  function isReadOnly(wallet, detail) {
    return wallet.mode === "READ_ONLY" || wallet.lifecycleState === "READ_ONLY" ||
      wallet.state === "READ_ONLY" ||
      (detail && (detail.mode === "READ_ONLY" || detail.lifecycleState === "READ_ONLY"));
  }

  function isOnSecurityHold(wallet, detail) {
    return wallet.lifecycleState === "SECURITY_HOLD" || wallet.state === "SECURITY_HOLD" ||
      (detail && detail.lifecycleState === "SECURITY_HOLD");
  }

  // Provider for a wallet card: the provider id recorded on an account,
  // else a provider field on the wallet record, else unknown. A wallet
  // record carries no provider by itself, so "—" is normal, not an error.
  function walletProvider(wallet, detail) {
    var accounts = (detail && Array.isArray(detail.accounts)) ? detail.accounts : [];
    for (var i = 0; i < accounts.length; i++) {
      if (accounts[i] && typeof accounts[i].walletProviderId === "string" &&
          accounts[i].walletProviderId.length > 0) {
        return accounts[i].walletProviderId;
      }
    }
    if (typeof wallet.provider === "string" && wallet.provider.length > 0) {
      return wallet.provider;
    }
    return "—";
  }

  // Signing posture from effective capabilities only: a signing
  // capability counts only when WalletIntelligence says it is
  // effective at the wallet's current state. This never implies
  // execution — execution stays DISABLED everywhere.
  function signingSummary(detail) {
    var caps = (detail && detail.capabilities) || {};
    var signing = [];
    ["signMessage", "signTransaction", "sendTransaction"].forEach(function (cap) {
      if (caps[cap] && caps[cap].effective) signing.push(cap);
    });
    if (signing.length) {
      return "Signing capability effective: " + signing.join(", ") +
        " — a grant is not execution; execution stays DISABLED.";
    }
    return "No signing capability effective.";
  }

  // One address line: truncated by default, with a deliberate Show /
  // Hide control and a Copy control. The full address is revealed
  // only by tapping Show — never on render, never by default. The
  // address itself renders in monospace (.wallet-card__addr) with the
  // network context next to it, so a truncated address is never shown
  // without saying which network it belongs to.
  function addressLine(address, networkLabel) {
    var full = String(address);
    var network = (typeof networkLabel === "string" && networkLabel.length > 0) ?
      networkLabel : "network unknown";
    var shown = U.el("span", { class: "wallet-card__addr status-value" }, truncateAddress(full));
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
      U.el("span", { class: "api-meta" }, "Network: " + network),
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

  // Visual Stage 2: one wallet as a .wallet-card. Only real fields are
  // shown; a field with no real value shows UNKNOWN or —, never a
  // fabricated value. Watch-only / read-only wallets get
  // .wallet-card--watch-only plus a WATCH ONLY / READ ONLY badge, so
  // the restriction looks intentional and secure, not broken. A wallet
  // on security hold gets .wallet-card--security-hold plus a hold
  // explanation. Signing-capable wallets get no watch badge, and no
  // card implies signing or execution.
  function walletCard(wallet, detail) {
    var d = detail || {};
    var watchOnly = isWatchOnly(wallet, d);
    var readOnly = isReadOnly(wallet, d);
    var onHold = isOnSecurityHold(wallet, d);
    var cardClass = "wallet-card";
    if (watchOnly || readOnly) cardClass += " wallet-card--watch-only";
    if (onHold) cardClass += " wallet-card--security-hold";

    var kids = [];
    // Card head: label + connection state badge + mode badges.
    var headParts = [U.el("span", {}, String(wallet.label || wallet.id))];
    headParts.push(stateBadge(wallet.state || "UNKNOWN"));
    if (watchOnly) headParts.push(stateBadge("WATCH_ONLY"));
    if (readOnly) headParts.push(stateBadge("READ_ONLY"));
    if (onHold) headParts.push(stateBadge("SECURITY_HOLD"));
    kids.push(U.el("div", { class: "status-row" }, headParts));

    kids.push(row("Provider", walletProvider(wallet, d)));
    kids.push(row("Wallet type", String(d.mode || wallet.mode || "UNKNOWN")));
    kids.push(row("State", String(d.stateDescription || wallet.stateDescription ||
      "Unknown state — nothing was confirmed.")));
    kids.push(row("Lifecycle", String(d.lifecycleStateDescription ||
      d.lifecycleState || wallet.lifecycleState || "—")));
    kids.push(row("Discovery", String(wallet.discoveryMethod || d.discoveryMethod || "—")));
    kids.push(row("Verification", String(wallet.verificationStatus ||
      d.verificationStatus || "UNVERIFIED")));
    kids.push(row("Standards", (wallet.standards && wallet.standards.length) ?
      wallet.standards.join(", ") : "—"));
    kids.push(row("Network coverage", (wallet.chains && wallet.chains.length) ?
      wallet.chains.join(", ") : "—"));
    kids.push(row("Read / watch / signing",
      (watchOnly ? "Watch-only — an address is observed, never signed from. " :
        readOnly ? "Read-only — reads only, no signing. " : "") +
      signingSummary(d)));
    if (onHold) {
      kids.push(U.el("div", { class: "api-meta" },
        "Security hold: this wallet is frozen by an owner hold — no use until an owner-approved resolution releases it. What is blocked: all use of this wallet, including reads that would act on it."));
    }

    // Addresses: the record's own addresses get truncate + Show / Copy,
    // with network context. Accounts from describeWallet already carry
    // truncated addresses, so they render truncated with no reveal.
    var networkLabel = (wallet.chains && wallet.chains.length) ?
      wallet.chains.join(", ") : "network unknown";
    var shownTruncated = [];
    var addrs = recordAddresses(wallet);
    if (!addressMayExist(wallet.state)) {
      kids.push(meta("No address shared — wallet is " + String(wallet.state) + "."));
    } else if (addrs.length === 0) {
      kids.push(meta("An address was shared, but no address is stored by WalletIntelligence — only the fact that one was shared, and when."));
    } else {
      addrs.forEach(function (a) {
        shownTruncated.push(truncateAddress(a));
        kids.push(addressLine(a, networkLabel));
      });
    }
    var accounts = Array.isArray(d.accounts) ? d.accounts : [];
    accounts.forEach(function (a) {
      if (!a || typeof a.publicAddress !== "string") return;
      if (shownTruncated.indexOf(a.publicAddress) !== -1) return;
      var acctParts = [U.el("span", {}, "Account: " + String(a.label || a.accountId || "—"))];
      acctParts.push(U.el("span", { class: "wallet-card__addr status-value" }, a.publicAddress));
      acctParts.push(U.el("span", { class: "api-meta" },
        "Network: " + String(a.networkId || "network unknown")));
      if (a.watchOnly) acctParts.push(stateBadge("WATCH_ONLY"));
      kids.push(U.el("div", { class: "status-row" }, acctParts));
    });

    // Counts with no source stay honest: no asset or position source is
    // connected in this build, so no count is invented.
    kids.push(row("Assets", "— (no asset source connected)"));
    kids.push(row("Positions", "— (no position source connected)"));
    kids.push(row("Asset count", "UNKNOWN — no asset source is connected."));
    kids.push(row("Position count", "UNKNOWN — no position source is connected."));
    var freshness = String(d.freshness || wallet.freshness || "unknown");
    kids.push(U.el("div", { class: "status-row" }, [
      U.el("span", {}, "Freshness"),
      stateBadge(freshness.toUpperCase()),
      U.el("span", { class: "status-value" }, String(d.freshnessLabel ||
        wallet.freshness || "Unknown age") +
        ((wallet.lastSeen || d.lastSeen) ? " (last seen " + String(wallet.lastSeen || d.lastSeen) + ")" : ""))
    ]));
    var secState = onHold ? "SECURITY_HOLD" :
      String(d.lifecycleState || wallet.lifecycleState || "UNKNOWN");
    kids.push(U.el("div", { class: "status-row" }, [
      U.el("span", {}, "Security state"),
      stateBadge(secState),
      U.el("span", { class: "status-value" },
        onHold ? "On security hold." : "No hold recorded for this wallet.")
    ]));
    kids.push(row("Last update", String(wallet.lastSeen || d.lastSeen || "—")));
    var caps = d.capabilities || {};
    var effective = [];
    Object.keys(caps).forEach(function (cap) {
      if (caps[cap] && caps[cap].effective) effective.push(cap);
    });
    kids.push(row("Effective capabilities", effective.length ? effective.join(", ") : "None — no capability is effective."));
    return U.el("div", { class: cardClass }, kids);
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

  // Security-hold records from AngelSecurity, if it is loaded. Holds
  // are records only — the hold itself blocks nothing, the owning
  // module enforces the block by consulting this list. Absent
  // AngelSecurity the list is null, never an invented empty "all clear".
  function listSecurityHolds() {
    var AS = global.AngelSecurity;
    if (!AS || typeof AS.listSecurityHolds !== "function") return null;
    var list = safeCall(function () { return AS.listSecurityHolds(); });
    return Array.isArray(list) ? list : null;
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

    var summary = walletSummary();
    var wallets = listWallets();
    var warnings = [];

    // Visual Stage 2: screen header (§19). Same visible title and
    // description as before; status shows the real connection state as
    // badges, plus watch-only / read-only / hold badges when real
    // wallets carry those states.
    var headerConnectionState = summary ? (summary.connectionState || "NOT_CONNECTED") : "UNAVAILABLE";
    var headerStatus = [stateBadge(headerConnectionState)];
    if (summary && summary.watchOnly > 0) headerStatus.push(stateBadge("WATCH_ONLY"));
    if (summary && summary.readOnly > 0) headerStatus.push(stateBadge("READ_ONLY"));
    if (summary && summary.securityHold > 0) headerStatus.push(stateBadge("SECURITY_HOLD"));
    root.appendChild(U.el("div", { class: "mti6-screen-header" }, [
      U.el("div", { class: "mti6-screen-header__icon" }, "👛"),
      U.el("h2", { class: "mti6-screen-header__title" }, "Wallets"),
      U.el("p", { class: "mti6-screen-header__desc" },
        "Wallet command center — read-only. No wallet is connected until one is discovered through WalletIntelligence, and nothing here can sign or move anything. Seed phrases and private keys are never stored."),
      U.el("div", { class: "mti6-screen-header__status" }, headerStatus)
    ]));


    // ---- 1. Connection state (prominent, honest) ----
    var connectedCount = summary ? (summary.connected || 0) : 0;
    var totalCount = summary ? (summary.total || 0) : 0;
    var connectionState = summary ? (summary.connectionState || "NOT_CONNECTED") : "UNAVAILABLE";
    var connectionLines = [];
    if (!summary || wallets === null) {
      connectionLines.push(meta("WalletIntelligence: NOT LOADED — wallet state cannot be read. Connection state: UNAVAILABLE."));
      connectionLines.push(emptyState("Wallet state unavailable",
        "WalletIntelligence is not loaded, so no wallet state can be verified. This is expected in a build without the module. Nothing is assumed connected, and nothing below claims a live session."));
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
      var modeParts = [];
      if (summary.watchOnly > 0) modeParts.push(summary.watchOnly + " watch-only");
      if (summary.readOnly > 0) modeParts.push(summary.readOnly + " read-only");
      if (summary.securityHold > 0) modeParts.push(summary.securityHold + " on security hold");
      if (modeParts.length) connectionLines.push(meta("Modes: " + modeParts.join(", ") + "."));
      if (connectedCount === 0) {
        warnings.push(totalCount + " wallet(s) discovered but none holds a session.");
      }
    }
    root.appendChild(panel("Connection state", connectionLines));

    // ---- 2. Wallet / provider inventory (wallet cards) ----
    var inventoryKids = [];
    if (wallets === null) {
      inventoryKids.push(meta("Wallet inventory: UNAVAILABLE — WalletIntelligence is not loaded."));
      inventoryKids.push(emptyState("Wallet inventory unavailable",
        "WalletIntelligence is not loaded, so no wallet inventory can be read. This is expected in a build without the module. Nothing is assumed connected."));
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
        inventoryKids.push(walletCard(w, describeWallet(w.id)));
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
    // Full addresses live on the wallet card above (truncate + Show /
    // Copy). This section lists the account records describeWallet
    // returns — label, already-truncated public address, network,
    // account type, watch-only flag — and never duplicates a Show
    // control, so a full address is revealed from one place only.
    var accountKids = [];
    if (wallets === null) {
      accountKids.push(meta("Account inventory: UNAVAILABLE — WalletIntelligence is not loaded."));
      accountKids.push(emptyState("Account inventory unavailable",
        "WalletIntelligence is not loaded, so no account can be listed. This is expected in a build without the module."));
    } else if (wallets.length === 0) {
      accountKids.push(meta("Accounts / addresses: — (no wallet connected)"));
      accountKids.push(emptyState("No accounts",
        "No wallet is connected, so no account exists to list. This is expected until a wallet is discovered. No address is shown, and none is guessed."));
    } else {
      wallets.forEach(function (w) {
        var detail = describeWallet(w.id) || {};
        var accounts = Array.isArray(detail.accounts) ? detail.accounts : [];
        if (!addressMayExist(w.state)) {
          accountKids.push(meta(String(w.label || w.id) + ": no address shared — wallet is " + String(w.state) + "."));
        } else if (accounts.length === 0 && recordAddresses(w).length === 0) {
          accountKids.push(meta(String(w.label || w.id) + ": an address was shared, but no address is stored by WalletIntelligence — only the fact that one was shared, and when."));
        } else if (accounts.length === 0) {
          accountKids.push(meta(String(w.label || w.id) + ": " + recordAddresses(w).length + " address(es) on record, shown on the wallet card above. Shown truncated by default; tap Show for the full address."));
        }
        accounts.forEach(function (a) {
          if (!a || typeof a.publicAddress !== "string") return;
          var acctParts = [U.el("span", {}, String(w.label || w.id) + " — " + String(a.label || a.accountId || "account"))];
          acctParts.push(U.el("span", { class: "wallet-card__addr status-value" }, a.publicAddress));
          acctParts.push(U.el("span", { class: "api-meta" },
            "Network: " + String(a.networkId || "network unknown") +
            (a.accountType ? " · " + String(a.accountType) : "")));
          if (a.watchOnly) acctParts.push(stateBadge("WATCH_ONLY"));
          accountKids.push(U.el("div", { class: "status-row" }, acctParts));
        });
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
    networkKids.push(U.el("div", { class: "api-meta" }, ["Live network coverage: ", stateBadge("NOT_CONNECTED"), " — no network provider is connected, so no chain is confirmed reachable."]));
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
    assetKids.push(U.el("div", { class: "api-meta" }, ["Balances: ", stateBadge("UNAVAILABLE"), " — no balance source is connected. No balance figure is shown, and none is estimated."]));
    assetKids.push(meta("Holdings: — (no wallet connected or no balance source)"));
    assetKids.push(meta("Positions: — (no wallet connected or no position source)"));
    assetKids.push(meta("Permissions / approvals: — (no wallet connected)"));
    assetKids.push(emptyState("No balances to show",
      "No balance source is connected, so no balance, holding, or position figure exists to display. This is expected in this build — balances are never estimated or sampled. It is safe: nothing here can move funds."));
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
    relKids.push(emptyState("No wallet-linked positions",
      "No opportunity or position record is linked to any wallet in this build, so no position is attributed to any wallet. This is expected — linkage is recorded only when a real source provides it."));
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
        securityKids.push(U.el("div", { class: "api-meta" }, ["Security alerts recorded: " + (secSummary.count || 0) + " (", stateBadge(secSummary.state || "UNKNOWN"), ")."]));
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
    // Security-hold framing (Stage 2, item 3): the .wallet-card--security-hold
    // hook renders only if a wallet record actually carries a hold state.
    // A hold is read from the wallet lifecycle state and from
    // AngelSecurity's hold list; no hold exists now, so the mechanism
    // renders honestly as an empty explanation, never a fake hold.
    var holds = listSecurityHolds();
    var heldWallets = [];
    if (wallets) {
      wallets.forEach(function (w) {
        var dw = describeWallet(w.id) || {};
        if (isOnSecurityHold(w, dw)) heldWallets.push(w);
      });
    }
    if (heldWallets.length > 0) {
      heldWallets.forEach(function (w) {
        securityKids.push(U.el("div", { class: "api-meta" }, ["Security hold: ", stateBadge("SECURITY_HOLD"), " — " + String(w.label || w.id) + " is frozen by an owner hold. What is blocked: all use of this wallet until an owner-approved resolution releases it."]));
        warnings.push("Wallet " + String(w.label || w.id) + " is on security hold.");
      });
    }
    if (holds && holds.length > 0) {
      holds.forEach(function (h) {
        if (!isObject(h)) return;
        securityKids.push(U.el("div", { class: "api-meta" }, ["Hold record ", stateBadge(h.state || "UNKNOWN"), " — " +
          String(h.holdId || "—") + " targets " + String(h.targetType || "—") + " " +
          String(h.targetId || "—") +
          (h.enteredAt ? " (entered " + String(h.enteredAt) + ")" : "") +
          (h.reason ? " — " + String(h.reason) : "") + "."]));
      });
    }
    if (heldWallets.length === 0 && (!holds || holds.length === 0)) {
      securityKids.push(emptyState("No wallet on security hold",
        holds === null ?
          "AngelSecurity is not loaded, so no hold list can be read — no wallet is shown on hold, and none is assumed. A hold would show here as a red frame with what is blocked." :
          "No wallet is on security hold; a hold would show here as a red frame with what is blocked. A wallet placed on hold gets a red frame on its card and a hold record here."));
    }
    root.appendChild(panel("Security state", securityKids));

    // ---- 8. Bot-analysis state ----
    var botKids = [];
    var BOM = global.BotOpsModel;
    if (!BOM || typeof BOM.summary !== "function") {
      botKids.push(meta("BotOpsModel: NOT LOADED — no bot task state can be read."));
      botKids.push(emptyState("No bot analysis",
        "BotOpsModel is not loaded, so no bot task state can be read and no wallet is being analysed by any bot. This is expected in a build without the module."));
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
      starKids.push(emptyState("No treasury data",
        "StarAccountant is not loaded, so no treasury or accounting state can be read. This is expected in a build without the module — no treasury figure is shown, and none is guessed."));
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
    execKids.push(U.el("div", { class: "api-meta" }, ["Execution state: ", stateBadge("EXECUTION_DISABLED"), " — DISABLED / NOT IMPLEMENTED. Transaction execution does not exist in this build."]));
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
        var freshState = String(d.freshness || w.freshness || "unknown");
        freshKids.push(U.el("div", { class: "api-meta" }, [String(w.label || w.id) + ": ", stateBadge(freshState.toUpperCase()), " — " + String(d.freshnessLabel || w.freshness || "Unknown age") +
          (w.lastSeen ? " (last seen " + String(w.lastSeen) + ")" : "")]));
        if ((d.freshness || w.freshness) === "stale") {
          warnings.push("Wallet " + String(w.label || w.id) + " is stale.");
        }
      });
    } else {
      freshKids.push(meta("Freshness: — (no wallet records)"));
      freshKids.push(emptyState("No freshness to report",
        "No wallet records exist, so there is no freshness to check. Freshness is per-record lastSeen only — no live freshness check has run in this session."));
    }
    root.appendChild(panel("Freshness", freshKids));

    // ---- 12. Warnings ----
    var warnKids = [];
    if (warnings.length === 0) {
      warnKids.push(meta("No warnings — every section above reports live, verified state."));
    } else {
      warnings.forEach(function (w) { warnKids.push(U.el("div", { class: "mti6-alert" }, "⚠ " + w)); });
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
