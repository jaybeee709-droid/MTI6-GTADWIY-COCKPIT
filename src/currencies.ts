/* Display currencies for the top-bar amount selector and the wallet
 * panel (owner revision, 2026-11-23).
 *
 * This is a CATALOGUE: the currencies the cockpit can display, what
 * each one is, and the platform routes through which it can earn —
 * named from the canonical Crypto World contents and Earnings World
 * categories in js/worlds.js. A route listed here is a catalogue
 * entry, NOT live income: no wallet is connected, feeds are
 * NOT_CONNECTED, execution is DISABLED, and no earnings are claimed
 * for any currency.
 */

export interface DisplayCurrency {
  code: string;
  name: string;
  kind: 'fiat' | 'crypto';
  info: string;
  /** Platform earning routes for this currency (catalogue names). */
  earnRoutes: string[];
  /** Which world the routes live in. */
  earnWorld: 'Earnings World' | 'Crypto World';
}

export const DISPLAY_CURRENCIES: DisplayCurrency[] = [
  {
    code: 'USD',
    name: 'US Dollar',
    kind: 'fiat',
    info: 'Primary settlement currency of the cockpit. Custody rail RAIL-A covers USD/JPY. No account is connected in this build, so no balance exists to show.',
    earnRoutes: [
      'Cashback',
      'Banking Bonuses',
      'Referral Programs',
      'Affiliate Programs',
      'Survey Opportunities',
      'Freelance Opportunities',
      'Gig Economy Opportunities',
      'Side Hustles',
    ],
    earnWorld: 'Earnings World',
  },
  {
    code: 'EUR',
    name: 'Euro',
    kind: 'fiat',
    info: 'Custody rail RAIL-B covers EUR. No account is connected in this build, so no balance exists to show.',
    earnRoutes: ['Cashback', 'Referral Programs', 'Affiliate Programs', 'Freelance Opportunities', 'Commerce Opportunities'],
    earnWorld: 'Earnings World',
  },
  {
    code: 'GBP',
    name: 'British Pound',
    kind: 'fiat',
    info: 'Custody rail RAIL-C covers GBP/CAD. No account is connected in this build, so no balance exists to show.',
    earnRoutes: ['Cashback', 'Banking Bonuses', 'Referral Programs', 'Affiliate Programs', 'Commerce Opportunities'],
    earnWorld: 'Earnings World',
  },
  {
    code: 'JPY',
    name: 'Japanese Yen',
    kind: 'fiat',
    info: 'Custody rail RAIL-A covers USD/JPY. No account is connected in this build, so no balance exists to show.',
    earnRoutes: ['Referral Programs', 'Affiliate Programs', 'Commerce Opportunities', 'Content Creation Earnings'],
    earnWorld: 'Earnings World',
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    kind: 'fiat',
    info: 'Custody rail RAIL-C covers GBP/CAD. No account is connected in this build, so no balance exists to show.',
    earnRoutes: ['Cashback', 'Banking Bonuses', 'Survey Opportunities', 'Gig Economy Opportunities'],
    earnWorld: 'Earnings World',
  },
  {
    code: 'BTC',
    name: 'Bitcoin',
    kind: 'crypto',
    info: 'Bitcoin. The platform tracks BTC through the Trading and BTCFi contents of Crypto World. No wallet is connected, so no holding exists to show.',
    earnRoutes: ['Trading', 'BTCFi', 'Lending', 'Borrowing', 'Vaults', 'Cross-Chain'],
    earnWorld: 'Crypto World',
  },
  {
    code: 'ETH',
    name: 'Ethereum',
    kind: 'crypto',
    info: 'Ethereum. The platform tracks ETH through the Staking, Restaking and Trading contents of Crypto World. No wallet is connected, so no holding exists to show.',
    earnRoutes: ['Trading', 'Staking', 'Restaking', 'Yield Farming', 'Lending', 'Vaults', 'Derivatives'],
    earnWorld: 'Crypto World',
  },
  {
    code: 'SOL',
    name: 'Solana',
    kind: 'crypto',
    info: 'Solana. The platform tracks SOL through the Trading and Staking contents of Crypto World. No wallet is connected, so no holding exists to show.',
    earnRoutes: ['Trading', 'Staking', 'Yield Farming', 'Liquidity', 'DePIN'],
    earnWorld: 'Crypto World',
  },
  {
    code: 'USDC',
    name: 'USD Coin',
    kind: 'crypto',
    info: 'USD Coin — a dollar-denominated stablecoin tracked through the Lending and Vaults contents of Crypto World. No wallet is connected, so no holding exists to show.',
    earnRoutes: ['Lending', 'Yield Farming', 'Vaults', 'Liquidity', 'Trading'],
    earnWorld: 'Crypto World',
  },
  {
    code: 'USDT',
    name: 'Tether',
    kind: 'crypto',
    info: 'Tether — a dollar-denominated stablecoin tracked through the Lending and Vaults contents of Crypto World. No wallet is connected, so no holding exists to show.',
    earnRoutes: ['Lending', 'Yield Farming', 'Vaults', 'Liquidity', 'Trading'],
    earnWorld: 'Crypto World',
  },
];

export function currencyOf(code: string): DisplayCurrency {
  return DISPLAY_CURRENCIES.find((c) => c.code === code) ?? DISPLAY_CURRENCIES[0];
}
