// MTI6 React app — Crypto Workspace index (single source: mirror).
//
// This file MIRRORS js/crypto-workspace-registry.js VERBATIM for the
// fields the index displays (workspaceId, title, group, status111,
// ladderTop, gated, frame). js/crypto-workspace-registry.js is the ONE
// canonical declaration (CW-2, Master Directive §89); this file is its
// React mirror so the index can never drift from the registry. If the
// registry changes, change js/crypto-workspace-registry.js first, then
// mirror the change here.
//
// Fields NOT carried over (families, majorIds, botRoles, costClasses,
// riskDimensions, actions, panelsNote, simulatorTemplate, etc.) are
// registry detail the index does not display — they stay in the
// canonical registry only, never duplicated here.
//
// Honest-state reading of the registry (verified 2026-11-22):
// 56 workspaces — Core 14, Trading 5, Routing 2, Yield/Capital 11,
// Derivatives 5, Infrastructure 8, Specialized 11.
// status111: PARTIAL 13, EXISTS 1 (Crypto Encyclopedia), NOT
// IMPLEMENTED 36, NOT IMPLEMENTED · NO CANONICAL FEED 1 (CEX
// Intelligence), OWNER-GATED SEAT 5 (AI / Compute, Modular,
// Identity, GameFi, SocialFi).
// executionCapability is EXECUTION DISABLED on every registry row and
// EXECUTE appears in no row's ladderTop — no workspace here can
// execute anything.

export type WorkspaceGroupId =
  | 'core'
  | 'trading'
  | 'routing'
  | 'yield'
  | 'derivatives'
  | 'infrastructure'
  | 'specialized';

export const CRYPTO_WORKSPACE_GROUPS: { id: WorkspaceGroupId; label: string }[] = [
  { id: 'core', label: 'Core' },
  { id: 'trading', label: 'Trading' },
  { id: 'routing', label: 'Routing / Bridges' },
  { id: 'yield', label: 'Yield / Capital' },
  { id: 'derivatives', label: 'Derivatives' },
  { id: 'infrastructure', label: 'Infrastructure / Network Earning' },
  { id: 'specialized', label: 'Specialized Economies' },
];

export interface CryptoWorkspaceRow {
  id: string;
  title: string;
  group: WorkspaceGroupId;
  /** Registry status111 — the workspace's build state, as recorded. */
  status: string;
  /** Highest §78 ladder rung the workspace's own controls may reach. Never EXECUTE. */
  ladderTop: string;
  /** Expansion-gated seat: no canonical Major Activity exists; no activity is invented. */
  gated: boolean;
  frame: 'full' | 'lite' | 'seat';
}

export const CRYPTO_WORKSPACES: CryptoWorkspaceRow[] = [
  // Core (14)
  { id: 'home', title: 'Crypto World Home / Command Center', group: 'core', status: 'PARTIAL', ladderTop: 'MONITOR', gated: false, frame: 'full' },
  { id: 'globe', title: 'Crypto Globe', group: 'core', status: 'PARTIAL', ladderTop: 'MONITOR', gated: false, frame: 'full' },
  { id: 'markets-assets', title: 'Markets & Assets', group: 'core', status: 'PARTIAL', ladderTop: 'ANALYZE', gated: false, frame: 'full' },
  { id: 'networks', title: 'Networks / Chains', group: 'core', status: 'PARTIAL', ladderTop: 'ANALYZE', gated: false, frame: 'full' },
  { id: 'protocols', title: 'Protocols', group: 'core', status: 'PARTIAL', ladderTop: 'ANALYZE', gated: false, frame: 'full' },
  { id: 'opportunities', title: 'Crypto Opportunities', group: 'core', status: 'PARTIAL', ladderTop: 'PREPARE', gated: false, frame: 'full' },
  { id: 'positions', title: 'Crypto Positions', group: 'core', status: 'PARTIAL', ladderTop: 'MONITOR', gated: false, frame: 'full' },
  { id: 'portfolio', title: 'Crypto Portfolio / Holdings', group: 'core', status: 'PARTIAL', ladderTop: 'MONITOR', gated: false, frame: 'full' },
  { id: 'intelligence', title: 'Crypto Intelligence', group: 'core', status: 'PARTIAL', ladderTop: 'ANALYZE', gated: false, frame: 'full' },
  { id: 'risk', title: 'Crypto Risk Command Center', group: 'core', status: 'PARTIAL', ladderTop: 'ANALYZE', gated: false, frame: 'full' },
  { id: 'security', title: 'Crypto Security', group: 'core', status: 'PARTIAL', ladderTop: 'ANALYZE', gated: false, frame: 'full' },
  { id: 'encyclopedia', title: 'Crypto Encyclopedia', group: 'core', status: 'EXISTS', ladderTop: 'MONITOR', gated: false, frame: 'lite' },
  { id: 'live-data', title: 'Crypto Live Data / Activity', group: 'core', status: 'PARTIAL', ladderTop: 'MONITOR', gated: false, frame: 'full' },
  { id: 'bot-ops', title: 'Crypto Bot Operations', group: 'core', status: 'PARTIAL', ladderTop: 'MONITOR', gated: false, frame: 'full' },
  // Trading (5)
  { id: 'trading', title: 'Trading Command Center', group: 'trading', status: 'NOT IMPLEMENTED', ladderTop: 'SIMULATE', gated: false, frame: 'full' },
  { id: 'swap', title: 'Swap Center', group: 'trading', status: 'NOT IMPLEMENTED', ladderTop: 'SIMULATE', gated: false, frame: 'full' },
  { id: 'dex-aggregation', title: 'DEX Aggregation', group: 'trading', status: 'NOT IMPLEMENTED', ladderTop: 'SIMULATE', gated: false, frame: 'full' },
  { id: 'cex-intelligence', title: 'CEX Intelligence', group: 'trading', status: 'NOT IMPLEMENTED · NO CANONICAL FEED', ladderTop: 'MONITOR', gated: false, frame: 'lite' },
  { id: 'arbitrage', title: 'Arbitrage Command Center', group: 'trading', status: 'NOT IMPLEMENTED', ladderTop: 'SIMULATE', gated: false, frame: 'full' },
  // Routing / Bridges (2)
  { id: 'cross-chain-routing', title: 'Cross-Chain / Routing Center', group: 'routing', status: 'NOT IMPLEMENTED', ladderTop: 'SIMULATE', gated: false, frame: 'full' },
  { id: 'bridge', title: 'Bridge Center', group: 'routing', status: 'NOT IMPLEMENTED', ladderTop: 'SIMULATE', gated: false, frame: 'full' },
  // Yield / Capital (11)
  { id: 'liquidity', title: 'Liquidity Center', group: 'yield', status: 'NOT IMPLEMENTED', ladderTop: 'SIMULATE', gated: false, frame: 'full' },
  { id: 'yield-farming', title: 'Yield Farming', group: 'yield', status: 'NOT IMPLEMENTED', ladderTop: 'RECOMMEND', gated: false, frame: 'full' },
  { id: 'staking', title: 'Staking Center', group: 'yield', status: 'NOT IMPLEMENTED', ladderTop: 'RECOMMEND', gated: false, frame: 'full' },
  { id: 'liquid-staking', title: 'Liquid Staking', group: 'yield', status: 'NOT IMPLEMENTED', ladderTop: 'RECOMMEND', gated: false, frame: 'full' },
  { id: 'restaking', title: 'Restaking', group: 'yield', status: 'NOT IMPLEMENTED', ladderTop: 'RECOMMEND', gated: false, frame: 'full' },
  { id: 'lending', title: 'Lending Center', group: 'yield', status: 'NOT IMPLEMENTED', ladderTop: 'RECOMMEND', gated: false, frame: 'full' },
  { id: 'borrowing', title: 'Borrowing Center', group: 'yield', status: 'NOT IMPLEMENTED', ladderTop: 'SIMULATE', gated: false, frame: 'full' },
  { id: 'vaults', title: 'Vault Automation', group: 'yield', status: 'NOT IMPLEMENTED', ladderTop: 'RECOMMEND', gated: false, frame: 'full' },
  { id: 'yield-aggregation', title: 'Yield Aggregation', group: 'yield', status: 'NOT IMPLEMENTED', ladderTop: 'RECOMMEND', gated: false, frame: 'full' },
  { id: 'yield-trading', title: 'Yield Trading', group: 'yield', status: 'NOT IMPLEMENTED', ladderTop: 'SIMULATE', gated: false, frame: 'full' },
  { id: 'structured-credit', title: 'Structured Credit', group: 'yield', status: 'NOT IMPLEMENTED', ladderTop: 'RECOMMEND', gated: false, frame: 'full' },
  // Derivatives (5)
  { id: 'perpetuals', title: 'Perpetuals', group: 'derivatives', status: 'NOT IMPLEMENTED', ladderTop: 'SIMULATE', gated: false, frame: 'full' },
  { id: 'futures', title: 'Futures', group: 'derivatives', status: 'NOT IMPLEMENTED', ladderTop: 'SIMULATE', gated: false, frame: 'full' },
  { id: 'options', title: 'Options', group: 'derivatives', status: 'NOT IMPLEMENTED', ladderTop: 'SIMULATE', gated: false, frame: 'full' },
  { id: 'synthetics-cdp', title: 'Synthetics / CDPs', group: 'derivatives', status: 'NOT IMPLEMENTED', ladderTop: 'SIMULATE', gated: false, frame: 'full' },
  { id: 'margin-leverage', title: 'Margin / Leverage Intelligence', group: 'derivatives', status: 'NOT IMPLEMENTED', ladderTop: 'ANALYZE', gated: false, frame: 'full' },
  // Infrastructure / Network Earning (8)
  { id: 'mining', title: 'Mining / Proof-of-Work Center', group: 'infrastructure', status: 'NOT IMPLEMENTED', ladderTop: 'RECOMMEND', gated: false, frame: 'full' },
  { id: 'validators', title: 'Validator Center', group: 'infrastructure', status: 'NOT IMPLEMENTED', ladderTop: 'RECOMMEND', gated: false, frame: 'full' },
  { id: 'nodes', title: 'Node Operations', group: 'infrastructure', status: 'NOT IMPLEMENTED', ladderTop: 'MONITOR', gated: false, frame: 'full' },
  { id: 'rpc-infrastructure', title: 'RPC / Infrastructure', group: 'infrastructure', status: 'NOT IMPLEMENTED', ladderTop: 'MONITOR', gated: false, frame: 'full' },
  { id: 'depin', title: 'DePIN', group: 'infrastructure', status: 'NOT IMPLEMENTED', ladderTop: 'RECOMMEND', gated: false, frame: 'full' },
  { id: 'ai-compute', title: 'AI / Compute', group: 'infrastructure', status: 'OWNER-GATED SEAT', ladderTop: 'MONITOR', gated: true, frame: 'seat' },
  { id: 'modular', title: 'Modular Infrastructure', group: 'infrastructure', status: 'OWNER-GATED SEAT', ladderTop: 'MONITOR', gated: true, frame: 'seat' },
  { id: 'identity', title: 'Identity Infrastructure', group: 'infrastructure', status: 'OWNER-GATED SEAT', ladderTop: 'MONITOR', gated: true, frame: 'seat' },
  // Specialized Economies (11)
  { id: 'btcfi', title: 'BTCFi', group: 'specialized', status: 'NOT IMPLEMENTED', ladderTop: 'RECOMMEND', gated: false, frame: 'full' },
  { id: 'rwa', title: 'RWA', group: 'specialized', status: 'NOT IMPLEMENTED', ladderTop: 'RECOMMEND', gated: false, frame: 'full' },
  { id: 'nftfi', title: 'NFT-Fi', group: 'specialized', status: 'NOT IMPLEMENTED', ladderTop: 'RECOMMEND', gated: false, frame: 'full' },
  { id: 'gamefi', title: 'GameFi', group: 'specialized', status: 'OWNER-GATED SEAT', ladderTop: 'MONITOR', gated: true, frame: 'seat' },
  { id: 'socialfi', title: 'SocialFi', group: 'specialized', status: 'OWNER-GATED SEAT', ladderTop: 'MONITOR', gated: true, frame: 'seat' },
  { id: 'prediction', title: 'Prediction Markets', group: 'specialized', status: 'NOT IMPLEMENTED', ladderTop: 'ANALYZE', gated: false, frame: 'full' },
  { id: 'oracle', title: 'Oracle Markets / Oracle Intelligence', group: 'specialized', status: 'NOT IMPLEMENTED', ladderTop: 'ANALYZE', gated: false, frame: 'full' },
  { id: 'insurance', title: 'Insurance / Risk Underwriting', group: 'specialized', status: 'NOT IMPLEMENTED', ladderTop: 'RECOMMEND', gated: false, frame: 'full' },
  { id: 'governance', title: 'Governance', group: 'specialized', status: 'NOT IMPLEMENTED', ladderTop: 'ANALYZE', gated: false, frame: 'full' },
  { id: 'gauges', title: 'Gauge / Incentive Markets', group: 'specialized', status: 'NOT IMPLEMENTED', ladderTop: 'ANALYZE', gated: false, frame: 'full' },
  { id: 'payments', title: 'Payments & Settlement', group: 'specialized', status: 'NOT IMPLEMENTED', ladderTop: 'ANALYZE', gated: false, frame: 'full' },
];
