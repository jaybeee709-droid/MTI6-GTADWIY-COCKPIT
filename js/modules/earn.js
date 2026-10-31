/* MTI6-GTADWIY-COCKPIT — Earn screen (research only, no auto-signup)
 * A researched list of legitimate ways to earn. No earnings are
 * promised, no rates are invented, and no bot signs you up:
 * every entry says whether payouts need identity/bank verification
 * (most do, by law) and that you sign up yourself with your own
 * details. Entries are dated Oct 31, 2026 — check each platform's
 * current terms before joining, because fees and rules change.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  var IDEAS = [
    { name: "Freelance services", detail: "Sell a skill you already have (writing, design, repair, admin) on freelance marketplaces. Payouts require identity and bank/PayPal verification. Effort: high, pay varies by skill and client." },
    { name: "Sell handmade or vintage (Etsy-style)", detail: "Make or source items and sell them in your own shop. Payouts require identity and bank verification. Effort: making + listing + shipping." },
    { name: "Sell used items (eBay-style)", detail: "Sell items you own. Payouts require identity and bank verification. Effort: listing + shipping; watch fees and returns." },
    { name: "Print-on-demand", detail: "Designs printed on shirts, mugs, and more by a third party. Payouts require identity and bank verification. Effort: design + marketing; sales are not guaranteed." },
    { name: "Content and affiliate", detail: "Earn from content, referrals, or affiliate links once you have an audience. Payouts require identity and bank/tax verification. Effort: slow to build, no guaranteed income." },
    { name: "Surveys and microtasks", detail: "Small paid tasks and surveys. Payouts usually require identity verification at cash-out. Effort: low skill, low pay per hour — treat as pocket money, not income." }
  ];

  async function render(root) {
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("earn") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "💵 Earn"));
    root.appendChild(U.el("p", { class: "api-subtitle" }, "Researched Oct 31, 2026. No bot signs you up here — you sign up yourself, with your own details, after checking the platform's current terms. Anything promising money with no identity check at payout should be treated as a red flag, not an opportunity."));
    var list = U.el("ul", { class: "price-offer-list" });
    IDEAS.forEach(function (i) { list.appendChild(U.el("li", {}, i.name + " — " + i.detail)); });
    root.appendChild(U.el("div", { class: "api-panel" }, [U.el("h3", {}, "Ways to earn, with the honest catches"), list]));
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.earn = { render: render };
})(window);
