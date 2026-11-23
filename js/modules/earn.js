/* MTI6-GTADWIY-COCKPIT — Earnings screen (owner directive, 2026-11-22)
 * Earnings is the world for everything that earns value OUTSIDE of
 * crypto: the 20 categories declared in js/worlds.js, rendered here
 * in the directive's order. The simple rule: anything that makes
 * money and is NOT crypto = Earnings. If it is fundamentally a
 * crypto activity, it belongs in Crypto World, not here.
 *
 * Research only, no auto-signup: no earnings are promised, no rates
 * are invented, and no bot signs you up — you sign up yourself with
 * your own details after checking the platform's current terms.
 * Anything promising money with no identity check at payout should
 * be treated as a red flag, not an opportunity.
 *
 * The 6 researched ideas dated Oct 31, 2026 are kept below, carried
 * verbatim under their matching categories (Freelance, Commerce x3,
 * Content Creation, Surveys) — nothing from the old list was dropped.
 * The other categories carry a short definitional line only: what the
 * category is, never a rate or a promise.
 *
 * The category list itself lives ONLY in js/worlds.js. If Worlds is
 * not loaded this screen says so honestly instead of rendering a
 * second, driftable copy of the list.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  // Detail per category. Carried ideas keep their original Oct 31,
  // 2026 wording verbatim (idea name, then detail). The rest are
  // definitional only — what the category is, never a rate.
  var DETAILS = {
    "Cashback": "A percentage of a purchase returned to you by the seller or a rewards program. Check the program's current terms.",
    "Reward Programs": "Points or credit earned for purchases or activity, redeemable under the program's terms.",
    "Loyalty Points": "Points earned for repeat purchases with one seller, redeemable under the program's terms.",
    "Gift Cards": "Cards bought at a discount or earned as a reward, spendable only with the named seller.",
    "Rebates": "Money back after a purchase, claimed with proof of purchase under the offer's terms.",
    "Coupons": "Discounts on purchases from the seller or a coupon program. Check expiry and terms.",
    "Referral Programs": "A bonus when someone you refer signs up or buys. Check the program's current terms; payouts usually require identity verification.",
    "Affiliate Programs": "A commission when someone buys through your referral link. Payouts require identity and bank/tax verification.",
    "Survey Opportunities": "Surveys and microtasks: Small paid tasks and surveys. Payouts usually require identity verification at cash-out. Effort: low skill, low pay per hour — treat as pocket money, not income.",
    "Freelance Opportunities": "Freelance services: Sell a skill you already have (writing, design, repair, admin) on freelance marketplaces. Payouts require identity and bank/PayPal verification. Effort: high, pay varies by skill and client.",
    "AI Service Opportunities": "Paid work on AI tasks — labelling, reviewing, or testing — where offered. Payouts require identity verification.",
    "Content Creation Earnings": "Content and affiliate: Earn from content, referrals, or affiliate links once you have an audience. Payouts require identity and bank/tax verification. Effort: slow to build, no guaranteed income.",
    "Gig Economy Opportunities": "Short paid jobs through gig platforms (delivery, driving, task work). Payouts require identity and bank verification.",
    "Local Money-Making Opportunities": "Paid work near you — yard work, cleaning, moving help, local errands. Agree the pay before you start.",
    "Banking Bonuses": "Cash bonuses for opening or using a bank account under the bank's terms. Check the requirements and any fees.",
    "Savings Rewards": "Interest or rewards paid on savings under the account's terms. Rates change — check the current terms.",
    "Promotional Offers": "Limited-time offers from sellers. Check the terms, expiry, and any spending requirement.",
    "Commerce Opportunities": "Sell handmade or vintage (Etsy-style): Make or source items and sell them in your own shop. Payouts require identity and bank verification. Effort: making + listing + shipping. | Sell used items (eBay-style): Sell items you own. Payouts require identity and bank verification. Effort: listing + shipping; watch fees and returns. | Print-on-demand: Designs printed on shirts, mugs, and more by a third party. Payouts require identity and bank verification. Effort: design + marketing; sales are not guaranteed.",
    "Rental Opportunities": "Earn by renting out something you own — a room, a car, equipment — under the platform's terms and local rules.",
    "Side Hustles": "Small income streams alongside other work. The categories above carry the honest catches."
  };

  async function render(root) {
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("earn") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "💰 Earnings"));
    root.appendChild(U.el("p", { class: "api-subtitle" }, "Everything that earns value outside of crypto. Anything that makes money and is NOT crypto = Earnings. If it is fundamentally a crypto activity, it belongs in Crypto World, not here."));
    root.appendChild(U.el("p", { class: "api-subtitle" }, "The 6 researched ideas from Oct 31, 2026 are kept below under their categories. No bot signs you up here — you sign up yourself, with your own details, after checking the platform's current terms. Anything promising money with no identity check at payout should be treated as a red flag, not an opportunity."));

    var W = global.Worlds;
    if (!W || !W.EARNINGS || !Array.isArray(W.EARNINGS.categories)) {
      root.appendChild(U.el("div", { class: "api-panel" }, [
        U.el("h3", {}, "Earnings categories"),
        U.el("p", { class: "api-meta" }, "Worlds: NOT LOADED — the Earnings categories are unavailable in this build.")
      ]));
      return;
    }

    var list = U.el("ul", { class: "price-offer-list" });
    W.EARNINGS.categories.forEach(function (name) {
      var detail = DETAILS[name];
      list.appendChild(U.el("li", {}, detail ? (name + " — " + detail) : name));
    });
    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "The 20 Earnings categories"),
      list,
      U.el("p", { class: "api-meta" }, "Crypto earning is not here: Yield / Capital and Infrastructure / Network Earning live in Crypto World, with rates NOT_CONNECTED and no earnings figure derived.")
    ]));
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.earn = { render: render, details: DETAILS };
})(window);
