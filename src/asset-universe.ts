/* MTI6 Asset Universe (v191) — the owner's tiered seed universe
 * (relayed 2026-11-24). The doctrine: do NOT ingest tens of
 * thousands of listed coins as a static list. The universe is a
 * curated, tiered candidate set; each asset is classified
 * (ASSET + subclass from the owner's vocabulary, assigned from
 * the tier's own stated family — evidence, not name-guessing),
 * and contract evidence attaches ONLY from the verified
 * contract catalogue (src/contract-catalog.ts). A symbol with
 * no catalogued contract reads CONTRACT UNKNOWN (Rule 3) —
 * its contract becomes a discovery task, never a guess.
 * PT / YT tokens are recorded as FAMILIES, not symbols: they are
 * per-market instruments, discovered per protocol, not seeded. */

import { CATALOGUED_CONTRACTS } from './contract-catalog';

export interface AssetTier {
  tier: number;
  family: string;
  symbols: string[];
}

export const ASSET_TIERS: AssetTier[] = [
  { tier: 1, family: 'Native Chain Assets', symbols: ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'SUI', 'APT', 'ATOM', 'INJ', 'TIA', 'NEAR', 'TRX'] },
  { tier: 1, family: 'Stablecoins', symbols: ['USDC', 'USDT', 'DAI', 'USDe', 'FDUSD', 'PYUSD', 'GHO', 'FRAX', 'USD1', 'TUSD', 'USDbC', 'EURC'] },
  { tier: 1, family: 'Wrapped Assets', symbols: ['WBTC', 'cbBTC', 'BTCB', 'WETH', 'WBNB'] },
  { tier: 2, family: 'DEX Governance Assets', symbols: ['UNI', 'CAKE', 'AERO', 'VELO', 'JOE', 'BAL', 'CRV', 'SUSHI', 'RAY', 'ORCA', 'JUP'] },
  { tier: 3, family: 'Lending Assets', symbols: ['AAVE', 'MKR', 'COMP', 'MORPHO', 'ENA', 'ONDO'] },
  { tier: 4, family: 'Liquid Staking', symbols: ['stETH', 'cbETH', 'rETH', 'sfrxETH', 'wstETH', 'ezETH', 'eETH', 'rsETH'] },
  { tier: 5, family: 'Restaking', symbols: ['EIGEN', 'ETHFI', 'REZ', 'KELP', 'SWELL'] },
  { tier: 6, family: 'Yield Trading', symbols: ['PENDLE'] },
  { tier: 7, family: 'Infrastructure Assets', symbols: ['LINK', 'PYTH', 'ZRO', 'W', 'AXL', 'TIA'] },
  { tier: 8, family: 'RWA Assets', symbols: ['ONDO', 'OUSG', 'USDY', 'BENJI', 'OPEN'] },
  { tier: 9, family: 'AI Assets', symbols: ['TAO', 'FET', 'AGIX', 'ASI', 'IO', 'MOR'] },
  { tier: 10, family: 'DePIN Assets', symbols: ['RENDER', 'AKT', 'HNT', 'GRASS', 'NODEPAY', 'IO'] },
];

export const ASSET_FAMILIES_NOT_SYMBOLS: string[] = [
  'PT Tokens (per-market Pendle principal tokens — discovered per protocol)',
  'YT Tokens (per-market Pendle yield tokens — discovered per protocol)',
];

/* Subclass per symbol, from the owner's ASSET vocabulary, only
 * where the tier's stated family supports it. Everything else
 * stays UNCLASSIFIED (Rule 3). */
const SUBCLASS_BY_SYMBOL: Record<string, string> = {};
for (const s of ASSET_TIERS[1].symbols) SUBCLASS_BY_SYMBOL[s] = 'STABLECOIN';
for (const s of ASSET_TIERS[2].symbols) SUBCLASS_BY_SYMBOL[s] = 'WRAPPED_ASSET';
for (const s of ASSET_TIERS[3].symbols) SUBCLASS_BY_SYMBOL[s] = 'GOVERNANCE_TOKEN';
for (const s of ASSET_TIERS[4].symbols) SUBCLASS_BY_SYMBOL[s] = 'GOVERNANCE_TOKEN';
for (const s of ['stETH', 'cbETH', 'rETH', 'sfrxETH', 'wstETH']) SUBCLASS_BY_SYMBOL[s] = 'LIQUID_STAKING_TOKEN';
for (const s of ['ezETH', 'eETH', 'rsETH', 'EIGEN', 'ETHFI', 'REZ', 'KELP', 'SWELL']) SUBCLASS_BY_SYMBOL[s] = 'RESTAKING_TOKEN';
SUBCLASS_BY_SYMBOL['PENDLE'] = 'GOVERNANCE_TOKEN';
for (const s of ['LINK', 'PYTH', 'ZRO', 'W', 'AXL']) SUBCLASS_BY_SYMBOL[s] = 'UTILITY_TOKEN';
for (const s of ['OUSG', 'USDY', 'BENJI', 'OPEN']) SUBCLASS_BY_SYMBOL[s] = 'RWA_ASSET';

export interface UniverseAsset {
  symbol: string;
  cls: 'ASSET';
  subclass: string;
  tiers: number[];
  families: string[];
  contract: { address: string; network: string; support: string } | null;
}

export function assetUniverse(): UniverseAsset[] {
  const bySymbol = new Map<string, UniverseAsset>();
  const contractBySymbol = new Map(
    CATALOGUED_CONTRACTS.map((c) => [c.symbol, { address: c.address, network: c.network, support: c.support }]),
  );
  for (const t of ASSET_TIERS) {
    for (const symbol of t.symbols) {
      const existing = bySymbol.get(symbol);
      if (existing) {
        if (!existing.tiers.includes(t.tier)) existing.tiers.push(t.tier);
        if (!existing.families.includes(t.family)) existing.families.push(t.family);
        continue;
      }
      bySymbol.set(symbol, {
        symbol,
        cls: 'ASSET',
        subclass: SUBCLASS_BY_SYMBOL[symbol] ?? 'UNCLASSIFIED',
        tiers: [t.tier],
        families: [t.family],
        contract: contractBySymbol.get(symbol) ?? null,
      });
    }
  }
  return [...bySymbol.values()].sort((a, b) => a.tiers[0] - b.tiers[0] || a.symbol.localeCompare(b.symbol));
}

export function assetUniverseSummary(): {
  total: number;
  withContract: number;
  awaitingContract: number;
  tierCounts: { tier: number; family: string; count: number }[];
} {
  const assets = assetUniverse();
  return {
    total: assets.length,
    withContract: assets.filter((a) => a.contract).length,
    awaitingContract: assets.filter((a) => !a.contract).length,
    tierCounts: ASSET_TIERS.map((t) => ({ tier: t.tier, family: t.family, count: t.symbols.length })),
  };
}
