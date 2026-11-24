/* MTI6 Universal Classification (v190) — the owner's STAR
 * Classification Rules + Auto-Placement model.
 *
 *   Discovery answers: something exists.
 *   Classification answers: what is it?
 *   Placement answers: where does it belong?
 *   Relationships answer: how is it connected?
 *
 * STAR LAW: STAR may classify, place, relate, and propose.
 * Only Daniel's approval workflow creates canonical truth.
 *
 * Rule 0: everything discovered becomes an Entity Candidate.
 * Rule 1: exactly one primary class per entity.
 * Rule 2: classification comes from EVIDENCE, never names alone.
 * Rule 3: UNKNOWN is valid — an uncertain subclass stays
 *         UNCLASSIFIED, never guessed.
 * Rule 4: one primary class, many roles (roles arrive with
 *         evidence; this module assigns class + subclass only).
 *
 * The category map below is DETERMINISTIC and source-stated: it
 * translates DefiLlama's own category vocabulary (measured
 * against the live index, 104 distinct categories, 2026-11-24)
 * into MTI6 classes. Anything unmapped lands in
 * PROTOCOL / UNCLASSIFIED. */

export const UNIVERSAL_CLASSES = [
  'SOURCE',
  'NETWORK',
  'ASSET',
  'PROTOCOL',
  'DEX',
  'POOL',
  'VAULT',
  'CONTRACT',
  'DAO',
  'PROPOSAL',
  'BRIDGE',
  'VALIDATOR',
  'ORGANIZATION',
  'PERSON',
  'INFRASTRUCTURE',
  'DOCUMENT',
  'OPPORTUNITY',
  'RISK',
  'STRATEGY',
  'ACTIVITY',
] as const;

export type UniversalClass = (typeof UNIVERSAL_CLASSES)[number];

/* The owner's Placement Decision Matrix: class → registry.
 * (INFRASTRUCTURE carries no matrix row in the owner's table;
 * it is placed with protocols operationally and flagged here so
 * the gap is visible rather than papered over.) */
export const PLACEMENT: Record<string, string> = {
  NETWORK: 'Network Registry',
  ASSET: 'Asset Registry',
  CONTRACT: 'Contract Registry',
  PROTOCOL: 'Protocol Registry',
  DEX: 'DEX Registry',
  POOL: 'Pool Registry',
  VAULT: 'Vault Registry',
  BRIDGE: 'Bridge Registry',
  DAO: 'Governance Registry',
  PROPOSAL: 'Governance Registry',
  ORGANIZATION: 'Organization Registry',
  PERSON: 'People Registry',
  OPPORTUNITY: 'Opportunity Registry',
  RISK: 'Risk Registry',
  STRATEGY: 'Strategy Registry',
  SOURCE: 'Source Registry',
  DOCUMENT: 'Documentation Registry',
  VALIDATOR: 'Validator Registry',
  ACTIVITY: 'Encyclopedia',
};

/* The owner's subclass vocabularies. Classification may only
 * assign a subclass that evidence supports; these lists define
 * the allowed words, not the assignments. */
export const SUBCLASS_VOCABULARY: Record<string, string[]> = {
  NETWORK: ['LAYER_1', 'LAYER_2', 'SIDECHAIN', 'APP_CHAIN', 'ROLLUP', 'COSMOS_ZONE', 'PARACHAIN', 'BITCOIN_LAYER', 'TESTNET'],
  ASSET: ['STABLECOIN', 'GOVERNANCE_TOKEN', 'UTILITY_TOKEN', 'LIQUID_STAKING_TOKEN', 'RESTAKING_TOKEN', 'LP_TOKEN', 'WRAPPED_ASSET', 'SYNTHETIC_ASSET', 'RWA_ASSET', 'MEME_ASSET', 'NFT_ASSET'],
  CONTRACT: ['TOKEN', 'ROUTER', 'FACTORY', 'TREASURY', 'GOVERNOR', 'TIMELOCK', 'POOL', 'VAULT', 'BRIDGE', 'ORACLE', 'REWARDS', 'REGISTRY', 'MULTISIG', 'PROXY'],
  PROTOCOL: ['LENDING', 'BORROWING', 'YIELD', 'YIELD_TRADING', 'DERIVATIVES', 'PERPETUALS', 'OPTIONS', 'DEX', 'CDP', 'RWA', 'ORACLE', 'INFRASTRUCTURE', 'RESTAKING', 'LIQUID_STAKING', 'NFT', 'AI', 'DEPIN', 'IDENTITY'],
  DEX: ['AMM', 'STABLE_AMM', 'CLMM', 'ORDER_BOOK', 'INTENT_BASED', 'RFQ', 'AGGREGATOR', 'PERPETUAL_DEX', 'SPOT_DEX', 'HYBRID'],
  POOL: ['STABLE_POOL', 'VOLATILE_POOL', 'CONCENTRATED_POOL', 'WEIGHTED_POOL', 'LENDING_POOL', 'STAKING_POOL', 'REWARDS_POOL'],
  VAULT: ['YIELD_VAULT', 'AUTO_COMPOUNDER', 'STRATEGY_VAULT', 'RESTAKING_VAULT', 'LP_VAULT', 'TREASURY_VAULT'],
  BRIDGE: ['MESSAGING_BRIDGE', 'LIQUIDITY_BRIDGE', 'CANONICAL_BRIDGE', 'ASSET_BRIDGE', 'CROSS_CHAIN_ROUTER'],
  DAO: ['PROTOCOL_DAO', 'FOUNDATION_DAO', 'INVESTMENT_DAO', 'GOVERNANCE_DAO', 'COMMUNITY_DAO'],
  ORGANIZATION: ['FOUNDATION', 'COMPANY', 'DAO_TREASURY', 'RESEARCH_GROUP', 'DEVELOPER_TEAM', 'VALIDATOR_GROUP'],
  OPPORTUNITY: ['YIELD', 'LP', 'GOVERNANCE', 'AIRDROP', 'POINTS', 'STAKING', 'RESTAKING', 'ARBITRAGE', 'CAMPAIGN', 'DEPIN', 'AI'],
  RISK: ['SECURITY', 'LIQUIDITY', 'GOVERNANCE', 'COUNTERPARTY', 'SMART_CONTRACT', 'BRIDGE', 'ORACLE', 'REGULATORY', 'CENTRALIZATION'],
  STRATEGY: ['SWAP', 'LP', 'FARM', 'STAKE', 'RESTAKE', 'LEND', 'BORROW', 'LOOP', 'HEDGE', 'ARBITRAGE', 'BRIDGE', 'VOTE', 'COMPOUND'],
};

/* DefiLlama category → (class, subclass). Keys are the source's
 * real categories (live-measured); values use the vocabularies
 * above wherever the owner's lists provide the word. */
const CATEGORY_MAP: Record<string, { cls: UniversalClass; subclass: string }> = {
  Dexs: { cls: 'DEX', subclass: 'UNSPECIFIED' },
  'DEX Aggregator': { cls: 'DEX', subclass: 'AGGREGATOR' },
  Bridge: { cls: 'BRIDGE', subclass: 'UNSPECIFIED' },
  'Canonical Bridge': { cls: 'BRIDGE', subclass: 'CANONICAL_BRIDGE' },
  'Cross Chain Bridge': { cls: 'BRIDGE', subclass: 'UNSPECIFIED' },
  'Bridge Aggregator': { cls: 'BRIDGE', subclass: 'CROSS_CHAIN_ROUTER' },
  Chain: { cls: 'NETWORK', subclass: 'UNSPECIFIED' },
  Lending: { cls: 'PROTOCOL', subclass: 'LENDING' },
  'Uncollateralized Lending': { cls: 'PROTOCOL', subclass: 'LENDING' },
  'Liquid Staking': { cls: 'PROTOCOL', subclass: 'LIQUID_STAKING' },
  'Liquid Restaking': { cls: 'PROTOCOL', subclass: 'RESTAKING' },
  Restaking: { cls: 'PROTOCOL', subclass: 'RESTAKING' },
  Oracle: { cls: 'PROTOCOL', subclass: 'ORACLE' },
  Yield: { cls: 'PROTOCOL', subclass: 'YIELD' },
  Farm: { cls: 'PROTOCOL', subclass: 'YIELD' },
  'Yield Aggregator': { cls: 'PROTOCOL', subclass: 'YIELD' },
  Derivatives: { cls: 'PROTOCOL', subclass: 'DERIVATIVES' },
  Options: { cls: 'PROTOCOL', subclass: 'OPTIONS' },
  'Options Vault': { cls: 'VAULT', subclass: 'STRATEGY_VAULT' },
  CDP: { cls: 'PROTOCOL', subclass: 'CDP' },
  'Algo-Stables': { cls: 'PROTOCOL', subclass: 'CDP' },
  RWA: { cls: 'PROTOCOL', subclass: 'RWA' },
  'NFT Lending': { cls: 'PROTOCOL', subclass: 'NFT' },
  'NFT Marketplace': { cls: 'PROTOCOL', subclass: 'NFT' },
  Gaming: { cls: 'PROTOCOL', subclass: 'UNSPECIFIED' },
  Privacy: { cls: 'PROTOCOL', subclass: 'UNSPECIFIED' },
  'Liquidity Manager': { cls: 'PROTOCOL', subclass: 'YIELD' },
  'Leveraged Farming': { cls: 'PROTOCOL', subclass: 'YIELD' },
  'Prediction Market': { cls: 'PROTOCOL', subclass: 'UNSPECIFIED' },
  Insurance: { cls: 'PROTOCOL', subclass: 'UNSPECIFIED' },
  Payments: { cls: 'PROTOCOL', subclass: 'UNSPECIFIED' },
  Launchpad: { cls: 'PROTOCOL', subclass: 'UNSPECIFIED' },
  'Staking Pool': { cls: 'POOL', subclass: 'STAKING_POOL' },
  'AI Agents': { cls: 'PROTOCOL', subclass: 'AI' },
};

export function classifyCategory(category: string | null): { cls: UniversalClass; subclass: string } {
  if (category && CATEGORY_MAP[category]) return CATEGORY_MAP[category];
  return { cls: 'PROTOCOL', subclass: 'UNCLASSIFIED' };
}

/* The owner's 30-dimension DEX checklist. Coverage is computed
 * ONLY from evidence a record actually carries; everything else
 * reads ABSENT — the frontier, never filled by guessing. */
export const DEX_CHECKLIST = [
  'Organization',
  'Website',
  'Docs',
  'GitHub',
  'Governance',
  'Chains',
  'Contracts',
  'Factories',
  'Routers',
  'Position Managers',
  'Treasury Contracts',
  'Native Token',
  'Pools',
  'LP Tokens',
  'Liquidity',
  'TVL',
  'Volume',
  'Fees',
  'Incentives',
  'Bribes',
  'Vote Markets',
  'Governance Proposals',
  'Delegates',
  'Yield Opportunities',
  'Vault Integrations',
  'Bridge Relationships',
  'Risk Evidence',
  'Audit Evidence',
  'Contract Evidence',
  'Relationship Graph',
] as const;

export interface DexCandidate {
  id: string;
  name: string;
  cls: 'DEX';
  subclass: string;
  chains: string[];
  url: string | null;
  github: string | null;
  tokenSymbol: string | null;
  tokenAddress: string | null;
  /* Source-carried evidence (v206, optional — older stored
   * records simply lack them and claim less coverage). */
  description?: string | null;
  audits?: number | null;
  auditLinks?: string[];
  parentSlug?: string | null;
  source: string;
  status: 'CANDIDATE';
  truthState: 'UNVERIFIED';
  discoveredAt: number;
  updatedAt: number;
}

/* Which checklist dimensions a DEX candidate's own evidence
 * covers today. Live-figure dimensions (TVL, Volume, Fees,
 * Liquidity) are deliberately NOT claimed from a stored record —
 * they are read live on surfaces or not at all. Audit Evidence
 * IS claimed when the record carries the source's own audit
 * count or audit links (v206) — that is evidence carried, not
 * a figure. */
export function dexCoverage(c: DexCandidate): string[] {
  const covered: string[] = ['Organization'];
  if (c.url) covered.push('Website');
  if (c.github) covered.push('GitHub');
  if (c.chains.length > 0) covered.push('Chains', 'Relationship Graph');
  if (c.tokenAddress) covered.push('Contracts', 'Contract Evidence');
  if (c.tokenSymbol) covered.push('Native Token');
  if ((typeof c.audits === 'number' && c.audits > 0) || (c.auditLinks && c.auditLinks.length > 0)) {
    covered.push('Audit Evidence');
  }
  return covered;
}
