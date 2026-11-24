// MTI6 React app — Worlds taxonomy (single source for the React shell).
//
// This file MIRRORS js/worlds.js VERBATIM (owner directive 2026-11-22).
// js/worlds.js is the ONE canonical declaration; this file is its React
// mirror so CryptoWorld.tsx and EarningsWorld.tsx never carry a second,
// driftable copy of the lists. If the directive changes, change
// js/worlds.js first, then mirror the change here.
//
// The 24 Crypto World contents and the 20 Earnings categories below are
// verbatim, in the directive's order. Do not rename, reorder, add, or
// remove entries.
//
// Earnings detail strings (EARNINGS_DETAILS) are copied VERBATIM from
// js/modules/earn.js (the DETAILS map there, Oct 31, 2026 researched
// ideas). They carry definitions only — never a rate or a promise.
//
// The 12 Tribe principals (TRIBE_PRINCIPALS) mirror js/tribe-principals.js
// verbatim (owner ruling 05:56 EST Nov 14, 2026, Revelation 7 order).
// All 12 start UNASSIGNED with no role/task. The in-page worker
// runtime (v171+) executes recorded tasks while the app is open,
// but no principal is ever displayed as a standing "live" state —
// only their recorded, executed work is shown.

export const DIRECTIVE_DATE = '2026-11-22';

export const CRYPTO_WORLD_CONTENTS: string[] = [
  'Trading',
  'Swaps',
  'Arbitrage',
  'Staking',
  'Restaking',
  'Yield Farming',
  'Liquidity',
  'Lending',
  'Borrowing',
  'Vaults',
  'Derivatives',
  'BTCFi',
  'DePIN',
  'AI Tokens',
  'Governance',
  'Nodes',
  'Validators',
  'Cross-Chain',
  'NFT-Fi',
  'Insurance',
  'Oracle',
  'RWA',
  'Modular Infrastructure',
  'Identity Infrastructure',
];

export const EARNINGS_CATEGORIES: string[] = [
  'Cashback',
  'Reward Programs',
  'Loyalty Points',
  'Gift Cards',
  'Rebates',
  'Coupons',
  'Referral Programs',
  'Affiliate Programs',
  'Survey Opportunities',
  'Freelance Opportunities',
  'AI Service Opportunities',
  'Content Creation Earnings',
  'Gig Economy Opportunities',
  'Local Money-Making Opportunities',
  'Banking Bonuses',
  'Savings Rewards',
  'Promotional Offers',
  'Commerce Opportunities',
  'Rental Opportunities',
  'Side Hustles',
];

export const SIMPLE_RULE = {
  cryptoWorld: 'Crypto = Crypto World',
  earnings: 'Anything that makes money and is NOT crypto = Earnings',
};

export const MEMBERSHIP_RULE = {
  cryptoWorld:
    'If it is fundamentally a crypto activity, asset, protocol, chain, token, validator, LP position, or on-chain strategy, it belongs in Crypto World.',
  earnings: 'If it is not primarily a crypto activity, it belongs in Earnings.',
};

// Rule note (verbatim from js/worlds.js): the 24 named Crypto World
// contents do not name every Master Directive scope item (Mining,
// Prediction Markets, GameFi, SocialFi, DeSci, ReFi, AI Compute,
// Bridges, DEX, Routing as named). The RULE decides anything not named:
// those are fundamentally crypto activities, so they remain Crypto World
// under the rule, not under the list. Nothing was removed by the list.
// The rule is the authority for anything the list does not name.
export const RULE_NOTE =
  'The 24 named Crypto World contents do not name every scope item (Mining, Prediction Markets, GameFi, SocialFi, DeSci, ReFi, AI Compute, Bridges, DEX, Routing). The RULE decides anything not named: those are fundamentally crypto activities, so they remain Crypto World under the rule, not under the list. Nothing was removed by the list.';

// Rule-covered extras shown ONLY in a separate section explicitly
// labelled as rule-covered under the membership rule — never as named
// contents. These six were present in the shell before this package;
// they stay here, under the rule, and nowhere else.
export const RULE_COVERED_EXTRAS: string[] = [
  'Mining',
  'MEV',
  'AI Compute',
  'Prediction Markets',
  'GameFi',
  'SocialFi',
];

// UI-only grouping of the 24 contents, used solely so Crypto World's
// section tabs can filter the grid. This is NOT a canonical
// classification and must never be presented as one.
export type CryptoGroup = 'Markets' | 'Yield & Credit' | 'Infrastructure' | 'Assets & Sectors';

export const CRYPTO_CONTENT_GROUPS: Record<string, CryptoGroup> = {
  Trading: 'Markets',
  Swaps: 'Markets',
  Arbitrage: 'Markets',
  Derivatives: 'Markets',
  Liquidity: 'Markets',
  Staking: 'Yield & Credit',
  Restaking: 'Yield & Credit',
  'Yield Farming': 'Yield & Credit',
  Lending: 'Yield & Credit',
  Borrowing: 'Yield & Credit',
  Vaults: 'Yield & Credit',
  Nodes: 'Infrastructure',
  Validators: 'Infrastructure',
  'Cross-Chain': 'Infrastructure',
  'Modular Infrastructure': 'Infrastructure',
  'Identity Infrastructure': 'Infrastructure',
  Oracle: 'Infrastructure',
  DePIN: 'Infrastructure',
  BTCFi: 'Assets & Sectors',
  'AI Tokens': 'Assets & Sectors',
  Governance: 'Assets & Sectors',
  'NFT-Fi': 'Assets & Sectors',
  Insurance: 'Assets & Sectors',
  RWA: 'Assets & Sectors',
};

// Earnings detail per category — VERBATIM from js/modules/earn.js
// (DETAILS map). The 6 researched ideas dated Oct 31, 2026 live inside
// these strings (Survey, Freelance, Content Creation, and the 3 Commerce
// ideas, separated by " | "). All other categories carry a definitional
// line only: what the category is, never a rate or a promise.
export const EARNINGS_DETAILS: Record<string, string> = {
  Cashback:
    "A percentage of a purchase returned to you by the seller or a rewards program. Check the program's current terms.",
  'Reward Programs':
    "Points or credit earned for purchases or activity, redeemable under the program's terms.",
  'Loyalty Points':
    "Points earned for repeat purchases with one seller, redeemable under the program's terms.",
  'Gift Cards':
    'Cards bought at a discount or earned as a reward, spendable only with the named seller.',
  Rebates:
    "Money back after a purchase, claimed with proof of purchase under the offer's terms.",
  Coupons:
    'Discounts on purchases from the seller or a coupon program. Check expiry and terms.',
  'Referral Programs':
    "A bonus when someone you refer signs up or buys. Check the program's current terms; payouts usually require identity verification.",
  'Affiliate Programs':
    'A commission when someone buys through your referral link. Payouts require identity and bank/tax verification.',
  'Survey Opportunities':
    'Surveys and microtasks: Small paid tasks and surveys. Payouts usually require identity verification at cash-out. Effort: low skill, low pay per hour — treat as pocket money, not income.',
  'Freelance Opportunities':
    'Freelance services: Sell a skill you already have (writing, design, repair, admin) on freelance marketplaces. Payouts require identity and bank/PayPal verification. Effort: high, pay varies by skill and client.',
  'AI Service Opportunities':
    'Paid work on AI tasks — labelling, reviewing, or testing — where offered. Payouts require identity verification.',
  'Content Creation Earnings':
    'Content and affiliate: Earn from content, referrals, or affiliate links once you have an audience. Payouts require identity and bank/tax verification. Effort: slow to build, no guaranteed income.',
  'Gig Economy Opportunities':
    'Short paid jobs through gig platforms (delivery, driving, task work). Payouts require identity and bank verification.',
  'Local Money-Making Opportunities':
    'Paid work near you — yard work, cleaning, moving help, local errands. Agree the pay before you start.',
  'Banking Bonuses':
    "Cash bonuses for opening or using a bank account under the bank's terms. Check the requirements and any fees.",
  'Savings Rewards':
    "Interest or rewards paid on savings under the account's terms. Rates change — check the current terms.",
  'Promotional Offers':
    'Limited-time offers from sellers. Check the terms, expiry, and any spending requirement.',
  'Commerce Opportunities':
    'Sell handmade or vintage (Etsy-style): Make or source items and sell them in your own shop. Payouts require identity and bank verification. Effort: making + listing + shipping. | Sell used items (eBay-style): Sell items you own. Payouts require identity and bank verification. Effort: listing + shipping; watch fees and returns. | Print-on-demand: Designs printed on shirts, mugs, and more by a third party. Payouts require identity and bank verification. Effort: design + marketing; sales are not guaranteed.',
  'Rental Opportunities':
    "Earn by renting out something you own — a room, a car, equipment — under the platform's terms and local rules.",
  'Side Hustles':
    'Small income streams alongside other work. The categories above carry the honest catches.',
};

// The 12 Tribe principals — verbatim from js/tribe-principals.js
// (Revelation 7 order; do not reorder, rename, or respell).
export interface TribePrincipal {
  id: string;
  displayName: string;
  order: number;
}

export const TRIBE_PRINCIPALS: TribePrincipal[] = [
  { id: 'tribe-judah', displayName: 'JUDAH', order: 1 },
  { id: 'tribe-reuben', displayName: 'REUBEN', order: 2 },
  { id: 'tribe-gad', displayName: 'GAD', order: 3 },
  { id: 'tribe-asher', displayName: 'ASHER', order: 4 },
  { id: 'tribe-naphtali', displayName: 'NAPHTALI', order: 5 },
  { id: 'tribe-manasseh', displayName: 'MANASSEH', order: 6 },
  { id: 'tribe-simeon', displayName: 'SIMEON', order: 7 },
  { id: 'tribe-levi', displayName: 'LEVI', order: 8 },
  { id: 'tribe-issachar', displayName: 'ISSACHAR', order: 9 },
  { id: 'tribe-zebulun', displayName: 'ZEBULUN', order: 10 },
  { id: 'tribe-joseph', displayName: 'JOSEPH', order: 11 },
  { id: 'tribe-benjamin', displayName: 'BENJAMIN', order: 12 },
];
