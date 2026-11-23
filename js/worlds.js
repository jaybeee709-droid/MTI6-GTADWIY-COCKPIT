/* MTI6-GTADWIY-COCKPIT — Worlds taxonomy (owner directive, 2026-11-22)
 * The master platform is the World Globe. Under it sit two worlds:
 *
 *   - Crypto World (💱): everything crypto only.
 *   - Earnings (💰): everything that earns value outside of crypto.
 *
 * The two lists below are verbatim from the owner's directive of
 * 2026-11-22 — 24 named Crypto World contents, 20 named Earnings
 * categories. They are the ONE canonical declaration: both screens
 * render from here, so the lists can never drift apart between
 * screens. No rates, no promises, no platform endorsements live
 * here — this file declares what belongs where, nothing more.
 *
 * Simple rule (verbatim):
 *   Crypto = Crypto World
 *   Anything that makes money and is NOT crypto = Earnings
 *
 * Membership rule (verbatim): if it is fundamentally a crypto
 * activity, asset, protocol, chain, token, validator, LP position,
 * or on-chain strategy, it belongs in Crypto World. If it is not
 * primarily a crypto activity, it belongs in Earnings.
 *
 * NOTE on the list vs the rule: the 24 named Crypto World contents
 * do not name every Master Directive scope item (Mining, Prediction
 * Markets, GameFi, SocialFi, DeSci, ReFi, AI Compute, Bridges, DEX,
 * Routing as named). The RULE decides anything not named: those are
 * fundamentally crypto activities, so they remain Crypto World under
 * the rule, not under the list. Nothing was removed by the list.
 * The rule is the authority for anything the list does not name.
 */
(function (global) {
  "use strict";

  var CRYPTO_WORLD_CONTENTS = [
    "Trading",
    "Swaps",
    "Arbitrage",
    "Staking",
    "Restaking",
    "Yield Farming",
    "Liquidity",
    "Lending",
    "Borrowing",
    "Vaults",
    "Derivatives",
    "BTCFi",
    "DePIN",
    "AI Tokens",
    "Governance",
    "Nodes",
    "Validators",
    "Cross-Chain",
    "NFT-Fi",
    "Insurance",
    "Oracle",
    "RWA",
    "Modular Infrastructure",
    "Identity Infrastructure"
  ];

  var EARNINGS_CATEGORIES = [
    "Cashback",
    "Reward Programs",
    "Loyalty Points",
    "Gift Cards",
    "Rebates",
    "Coupons",
    "Referral Programs",
    "Affiliate Programs",
    "Survey Opportunities",
    "Freelance Opportunities",
    "AI Service Opportunities",
    "Content Creation Earnings",
    "Gig Economy Opportunities",
    "Local Money-Making Opportunities",
    "Banking Bonuses",
    "Savings Rewards",
    "Promotional Offers",
    "Commerce Opportunities",
    "Rental Opportunities",
    "Side Hustles"
  ];

  var SIMPLE_RULE = {
    cryptoWorld: "Crypto = Crypto World",
    earnings: "Anything that makes money and is NOT crypto = Earnings"
  };

  var MEMBERSHIP_RULE = {
    cryptoWorld: "If it is fundamentally a crypto activity, asset, protocol, chain, token, validator, LP position, or on-chain strategy, it belongs in Crypto World.",
    earnings: "If it is not primarily a crypto activity, it belongs in Earnings."
  };

  function copyList(list) {
    return list.slice();
  }

  // The rule as code. The caller declares whether the thing is
  // crypto (isCrypto === true) or a non-crypto way of making money
  // (isCrypto === false). Nothing is guessed from a name or a
  // description — a thing whose nature is unknown classifies to
  // null, never to a world by default.
  function classify(isCrypto) {
    if (isCrypto === true) return "crypto-world";
    if (isCrypto === false) return "earn";
    return null;
  }

  function listContents(worldId) {
    if (worldId === "crypto-world") return copyList(CRYPTO_WORLD_CONTENTS);
    if (worldId === "earn") return copyList(EARNINGS_CATEGORIES);
    return [];
  }

  function isNamedCryptoContent(name) {
    return CRYPTO_WORLD_CONTENTS.indexOf(name) !== -1;
  }

  function isNamedEarningsCategory(name) {
    return EARNINGS_CATEGORIES.indexOf(name) !== -1;
  }

  global.Worlds = {
    GLOBE: {
      id: "globe",
      label: "World Globe",
      icon: "🌍",
      route: "globe",
      note: "The master platform."
    },
    CRYPTO_WORLD: {
      id: "crypto-world",
      label: "Crypto World",
      icon: "💱",
      route: "crypto-world",
      description: "Everything crypto only.",
      contents: copyList(CRYPTO_WORLD_CONTENTS),
      membershipRule: MEMBERSHIP_RULE.cryptoWorld
    },
    EARNINGS: {
      id: "earn",
      label: "Earnings",
      icon: "💰",
      route: "earn",
      description: "Everything that earns value outside of crypto.",
      categories: copyList(EARNINGS_CATEGORIES),
      membershipRule: MEMBERSHIP_RULE.earnings
    },
    SIMPLE_RULE: SIMPLE_RULE,
    MEMBERSHIP_RULE: MEMBERSHIP_RULE,
    DIRECTIVE_DATE: "2026-11-22",
    classify: classify,
    listContents: listContents,
    isNamedCryptoContent: isNamedCryptoContent,
    isNamedEarningsCategory: isNamedEarningsCategory
  };
})(typeof window !== "undefined" ? window : globalThis);
