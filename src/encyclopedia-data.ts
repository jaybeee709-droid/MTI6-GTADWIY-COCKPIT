/* GENERATED 2026-11-23 by scripts/generate-encyclopedia-data.mjs from
 * the frozen canonical data files js/data/encyclopedia-batch-a.js,
 * js/data/encyclopedia-canonical-60.js and js/data/encyclopedia-batch-b.js.
 * DO NOT HAND-EDIT — regenerate instead. The frozen sources are
 * unchanged. Every record is UNVERIFIED with canonical-import
 * provenance (owner approval = approval for inclusion, not external
 * verification). TAXONOMY_IMPORTED is an import status. */

export interface EncyclopediaFamily { id: string; title: string }
export interface CanonicalMajor {
  id: string; title: string; definition: string; family: string; workspace: string;
}
export interface EncyclopediaIndexEntry { id: string; title: string; level: string; parent: string }

export const ENCYCLOPEDIA_FAMILIES: EncyclopediaFamily[] = [
 {
  "id": "family-wallet-asset-operations",
  "title": "Wallet & Asset Operations"
 },
 {
  "id": "family-trading-markets",
  "title": "Trading & Markets"
 },
 {
  "id": "family-swaps-routing",
  "title": "Swaps & Routing"
 },
 {
  "id": "family-arbitrage",
  "title": "Arbitrage"
 },
 {
  "id": "family-liquidity",
  "title": "Liquidity"
 },
 {
  "id": "family-farming-yield",
  "title": "Farming & Yield"
 },
 {
  "id": "family-staking-restaking",
  "title": "Staking & Restaking"
 },
 {
  "id": "family-lending-borrowing",
  "title": "Lending & Borrowing"
 },
 {
  "id": "family-vaults-structured",
  "title": "Vaults & Structured Strategies"
 },
 {
  "id": "family-cross-chain",
  "title": "Cross-Chain"
 },
 {
  "id": "family-mining-nodes-validators",
  "title": "Mining / Nodes / Validators"
 },
 {
  "id": "family-derivatives-synthetics",
  "title": "Derivatives / Synthetics"
 },
 {
  "id": "family-stablecoins",
  "title": "Stablecoins"
 },
 {
  "id": "family-governance-dao",
  "title": "Governance / DAO"
 },
 {
  "id": "family-insurance-risk",
  "title": "Insurance / Risk Markets"
 },
 {
  "id": "family-payments-settlement",
  "title": "Payments / Settlement"
 },
 {
  "id": "family-rwa-structured-credit",
  "title": "RWA / Structured Credit"
 },
 {
  "id": "family-nftfi",
  "title": "NFT-Fi"
 },
 {
  "id": "family-btcfi",
  "title": "BTCFi"
 },
 {
  "id": "family-mev-block",
  "title": "MEV / Block Infrastructure"
 },
 {
  "id": "family-modular-zk",
  "title": "Modular / ZK Infrastructure"
 },
 {
  "id": "family-depin-compute",
  "title": "DePIN / Compute"
 },
 {
  "id": "family-prediction-oracles",
  "title": "Prediction / Oracles"
 },
 {
  "id": "family-desci-ip-rights",
  "title": "DeSci / IP / Rights"
 },
 {
  "id": "family-refi-environmental",
  "title": "ReFi / Environmental Markets"
 },
 {
  "id": "family-gamefi-socialfi-media",
  "title": "GameFi / SocialFi / Media"
 },
 {
  "id": "family-capital-formation",
  "title": "Capital Formation"
 },
 {
  "id": "family-privacy-identity",
  "title": "Privacy / Identity Infrastructure"
 }
];

export const CANONICAL_60: CanonicalMajor[] = [
 {
  "id": "major-hold-store-assets",
  "title": "Hold & Store Assets",
  "definition": "Maintain supported digital assets under wallet/account custody without treating holding itself as an earning promise.",
  "family": "family-wallet-asset-operations",
  "workspace": "WALLET_ASSET_CENTER"
 },
 {
  "id": "major-transfer-assets",
  "title": "Transfer Assets",
  "definition": "Send or receive supported digital assets between blockchain addresses or accounts through supported on-chain transfer mechanisms.",
  "family": "family-wallet-asset-operations",
  "workspace": "WALLET_ASSET_CENTER"
 },
 {
  "id": "major-asset-permission-management",
  "title": "Asset Permission Management",
  "definition": "Inspect and manage supported token approvals, allowances, permissions and revocations.",
  "family": "family-wallet-asset-operations",
  "workspace": "WALLET_ASSET_CENTER"
 },
 {
  "id": "major-wrap-unwrap-assets",
  "title": "Wrap & Unwrap Assets",
  "definition": "Convert between supported native and wrapped representations of an asset.",
  "family": "family-wallet-asset-operations",
  "workspace": "WALLET_ASSET_CENTER"
 },
 {
  "id": "major-spot-trading",
  "title": "Spot Trading",
  "definition": "Buy or sell crypto assets through decentralized/on-chain spot markets.",
  "family": "family-trading-markets",
  "workspace": "TRADING_TERMINAL"
 },
 {
  "id": "major-algorithmic-strategy-trading",
  "title": "Algorithmic & Strategy Trading",
  "definition": "Apply defined trading strategies or automation to supported decentralized markets.",
  "family": "family-trading-markets",
  "workspace": "TRADING_TERMINAL"
 },
 {
  "id": "major-decentralized-market-making",
  "title": "Decentralized Market Making",
  "definition": "Provide executable market liquidity or quotes through supported decentralized market structures.",
  "family": "family-trading-markets",
  "workspace": "TRADING_TERMINAL"
 },
 {
  "id": "major-token-swapping",
  "title": "Token Swapping",
  "definition": "Exchange one supported on-chain asset for another.",
  "family": "family-swaps-routing",
  "workspace": "SWAP_LAB"
 },
 {
  "id": "major-swap-aggregation-route-optimization",
  "title": "Swap Aggregation & Route Optimization",
  "definition": "Compare and route swaps across eligible liquidity venues and paths.",
  "family": "family-swaps-routing",
  "workspace": "SWAP_LAB"
 },
 {
  "id": "major-intent-based-execution",
  "title": "Intent-Based Execution",
  "definition": "Express a desired on-chain outcome and use supported solver/filler mechanisms to seek fulfillment.",
  "family": "family-swaps-routing",
  "workspace": "SWAP_LAB"
 },
 {
  "id": "major-cross-dex-arbitrage",
  "title": "Cross-DEX Arbitrage",
  "definition": "Evaluate price differences for equivalent assets across decentralized exchanges.",
  "family": "family-arbitrage",
  "workspace": "ARBITRAGE_CENTER"
 },
 {
  "id": "major-triangular-cyclic-arbitrage",
  "title": "Triangular & Cyclic Arbitrage",
  "definition": "Evaluate multi-asset/multi-hop cycles that return to the starting asset.",
  "family": "family-arbitrage",
  "workspace": "ARBITRAGE_CENTER"
 },
 {
  "id": "major-cross-chain-arbitrage",
  "title": "Cross-Chain Arbitrage",
  "definition": "Evaluate price discrepancies for related assets across supported blockchain networks.",
  "family": "family-arbitrage",
  "workspace": "ARBITRAGE_CENTER"
 },
 {
  "id": "major-stablecoin-peg-arbitrage",
  "title": "Stablecoin & Peg Arbitrage",
  "definition": "Evaluate deviations between supported pegged assets and their reference values.",
  "family": "family-arbitrage",
  "workspace": "ARBITRAGE_CENTER"
 },
 {
  "id": "major-flash-capital-arbitrage",
  "title": "Flash-Capital Arbitrage",
  "definition": "Use supported atomic flash-capital mechanisms as part of an arbitrage strategy.",
  "family": "family-arbitrage",
  "workspace": "ARBITRAGE_CENTER"
 },
 {
  "id": "major-standard-liquidity-provision",
  "title": "Standard Liquidity Provision",
  "definition": "Supply assets to conventional decentralized liquidity pools.",
  "family": "family-liquidity",
  "workspace": "LIQUIDITY_LAB"
 },
 {
  "id": "major-concentrated-liquidity-provision",
  "title": "Concentrated Liquidity Provision",
  "definition": "Provide liquidity inside defined price ranges.",
  "family": "family-liquidity",
  "workspace": "LIQUIDITY_LAB"
 },
 {
  "id": "major-single-sided-liquidity",
  "title": "Single-Sided Liquidity",
  "definition": "Provide one asset to supported liquidity structures designed to accept single-sided deposits.",
  "family": "family-liquidity",
  "workspace": "LIQUIDITY_LAB"
 },
 {
  "id": "major-automated-liquidity-management",
  "title": "Automated Liquidity Management",
  "definition": "Manage liquidity positions through supported automated range/rebalancing strategies.",
  "family": "family-liquidity",
  "workspace": "LIQUIDITY_LAB"
 },
 {
  "id": "major-programmable-hook-liquidity",
  "title": "Programmable & Hook-Based Liquidity",
  "definition": "Participate in supported pools using programmable/custom pool behavior.",
  "family": "family-liquidity",
  "workspace": "LIQUIDITY_LAB"
 },
 {
  "id": "major-just-in-time-liquidity",
  "title": "Just-in-Time Liquidity",
  "definition": "Provide supported short-duration liquidity positioned around specific order flow.",
  "family": "family-liquidity",
  "workspace": "LIQUIDITY_LAB"
 },
 {
  "id": "major-yield-farming-liquidity-mining",
  "title": "Yield Farming & Liquidity Mining",
  "definition": "Deploy eligible positions into incentive/reward programs associated with liquidity or protocol participation.",
  "family": "family-farming-yield",
  "workspace": "FARMING_YIELD_LAB"
 },
 {
  "id": "major-yield-aggregation-auto-compounding",
  "title": "Yield Aggregation & Auto-Compounding",
  "definition": "Optimize and compound underlying yield sources through aggregator/vault orchestration.",
  "family": "family-farming-yield",
  "workspace": "FARMING_YIELD_LAB"
 },
 {
  "id": "major-stablecoin-yield-strategies",
  "title": "Stablecoin Yield Strategies",
  "definition": "Deploy supported stable assets into eligible lending, liquidity, vault or related yield structures.",
  "family": "family-farming-yield",
  "workspace": "FARMING_YIELD_LAB"
 },
 {
  "id": "major-native-staking",
  "title": "Native Staking",
  "definition": "Stake native proof-of-stake assets directly or through supported delegation mechanisms.",
  "family": "family-staking-restaking",
  "workspace": "STAKING_RESTAKING_CENTER"
 },
 {
  "id": "major-liquid-staking",
  "title": "Liquid Staking",
  "definition": "Stake supported assets while receiving a liquid representation of the staked position.",
  "family": "family-staking-restaking",
  "workspace": "STAKING_RESTAKING_CENTER"
 },
 {
  "id": "major-restaking",
  "title": "Restaking",
  "definition": "Use eligible already-staked assets to participate in additional supported security mechanisms.",
  "family": "family-staking-restaking",
  "workspace": "STAKING_RESTAKING_CENTER"
 },
 {
  "id": "major-liquid-restaking",
  "title": "Liquid Restaking",
  "definition": "Participate in restaking while using a liquid representation of the restaked position.",
  "family": "family-staking-restaking",
  "workspace": "STAKING_RESTAKING_CENTER"
 },
 {
  "id": "major-protocol-token-staking",
  "title": "Protocol Token Staking",
  "definition": "Stake protocol/governance assets for supported protocol-defined rights, rewards or participation.",
  "family": "family-staking-restaking",
  "workspace": "STAKING_RESTAKING_CENTER"
 },
 {
  "id": "major-asset-lending",
  "title": "Asset Lending",
  "definition": "Supply assets to decentralized credit markets for borrower-funded interest or other documented return sources.",
  "family": "family-lending-borrowing",
  "workspace": "LENDING_STRUCTURED_CREDIT"
 },
 {
  "id": "major-collateralized-borrowing",
  "title": "Collateralized Borrowing",
  "definition": "Borrow supported assets against qualifying on-chain collateral.",
  "family": "family-lending-borrowing",
  "workspace": "LENDING_STRUCTURED_CREDIT"
 },
 {
  "id": "major-isolated-market-borrowing",
  "title": "Isolated-Market Borrowing",
  "definition": "Borrow within lending markets whose collateral/loan parameters and risk are isolated by design.",
  "family": "family-lending-borrowing",
  "workspace": "LENDING_STRUCTURED_CREDIT"
 },
 {
  "id": "major-credit-delegation-undercollateralized-credit",
  "title": "Credit Delegation & Undercollateralized Credit",
  "definition": "Participate in supported lending structures where borrowing power or credit is delegated or otherwise not fully backed by the borrower's direct collateral.",
  "family": "family-lending-borrowing",
  "workspace": "LENDING_STRUCTURED_CREDIT"
 },
 {
  "id": "major-atomic-flash-credit",
  "title": "Atomic & Flash Credit",
  "definition": "Use supported single-transaction credit mechanisms such as flash loans, swaps or protocol-specific flash minting.",
  "family": "family-lending-borrowing",
  "workspace": "LENDING_STRUCTURED_CREDIT"
 },
 {
  "id": "major-leveraged-recursive-lending",
  "title": "Leveraged & Recursive Lending Strategies",
  "definition": "Use repeated supply/borrow relationships to create defined leveraged, looping or recursive positions.",
  "family": "family-lending-borrowing",
  "workspace": "LENDING_STRUCTURED_CREDIT"
 },
 {
  "id": "major-liquidations",
  "title": "Liquidations",
  "definition": "Monitor and participate in protocol-defined liquidation processes where legitimately supported.",
  "family": "family-lending-borrowing",
  "workspace": "LENDING_STRUCTURED_CREDIT"
 },
 {
  "id": "major-automated-strategy-vaults",
  "title": "Automated Strategy Vaults",
  "definition": "Deposit into supported vaults that execute predefined financial strategies.",
  "family": "family-vaults-structured",
  "workspace": "VAULT_AUTOMATION_LAB"
 },
 {
  "id": "major-structured-product-vaults",
  "title": "Structured Product Vaults",
  "definition": "Use vault structures that package multiple financial mechanisms into a defined strategy.",
  "family": "family-vaults-structured",
  "workspace": "VAULT_AUTOMATION_LAB"
 },
 {
  "id": "major-yield-tokenization",
  "title": "Yield Tokenization",
  "definition": "Separate supported yield-bearing positions into principal/yield components or equivalent instruments.",
  "family": "family-vaults-structured",
  "workspace": "VAULT_AUTOMATION_LAB"
 },
 {
  "id": "major-yield-fixed-rate-trading",
  "title": "Yield & Fixed-Rate Trading",
  "definition": "Trade or manage supported on-chain yield/rate exposures, including maturity-based instruments.",
  "family": "family-vaults-structured",
  "workspace": "VAULT_AUTOMATION_LAB"
 },
 {
  "id": "major-bridging",
  "title": "Bridging",
  "definition": "Move supported assets or representations through verified cross-chain bridge mechanisms.",
  "family": "family-cross-chain",
  "workspace": "CROSS_CHAIN_CENTER"
 },
 {
  "id": "major-cross-chain-routing-settlement",
  "title": "Cross-Chain Routing & Settlement",
  "definition": "Coordinate supported cross-chain routes, messages, intents, solvers, fillers and settlement.",
  "family": "family-cross-chain",
  "workspace": "CROSS_CHAIN_CENTER"
 },
 {
  "id": "major-cross-chain-liquidity-provision",
  "title": "Cross-Chain Liquidity Provision",
  "definition": "Supply liquidity to supported cross-chain transfer/routing infrastructure.",
  "family": "family-cross-chain",
  "workspace": "CROSS_CHAIN_CENTER"
 },
 {
  "id": "major-validator-operation",
  "title": "Validator Operation",
  "definition": "Operate or participate in supported blockchain validation infrastructure.",
  "family": "family-mining-nodes-validators",
  "workspace": "NETWORK_NODE_VALIDATOR_CENTER"
 },
 {
  "id": "major-node-operation",
  "title": "Node Operation",
  "definition": "Operate supported blockchain or decentralized-network nodes that provide network, data, relay, RPC, storage, validation-adjacent, or other protocol-defined infrastructure services.",
  "family": "family-mining-nodes-validators",
  "workspace": "NETWORK_NODE_VALIDATOR_CENTER"
 },
 {
  "id": "major-mining-proof-of-work",
  "title": "Mining & Proof-of-Work Participation",
  "definition": "Provide supported proof-of-work/hashrate resources and track resulting protocol-defined rewards/costs.",
  "family": "family-mining-nodes-validators",
  "workspace": "NETWORK_NODE_VALIDATOR_CENTER"
 },
 {
  "id": "major-perpetual-trading",
  "title": "Perpetual Trading",
  "definition": "Trade supported perpetual derivative markets.",
  "family": "family-derivatives-synthetics",
  "workspace": "DERIVATIVES_SYNTHETICS_CENTER"
 },
 {
  "id": "major-futures-trading",
  "title": "Futures Trading",
  "definition": "Trade supported decentralized futures structures.",
  "family": "family-derivatives-synthetics",
  "workspace": "DERIVATIVES_SYNTHETICS_CENTER"
 },
 {
  "id": "major-options-trading-writing",
  "title": "Options Trading & Writing",
  "definition": "Buy, sell/write or otherwise manage supported on-chain options positions.",
  "family": "family-derivatives-synthetics",
  "workspace": "DERIVATIVES_SYNTHETICS_CENTER"
 },
 {
  "id": "major-synthetic-assets-cdp",
  "title": "Synthetic Assets & CDP Systems",
  "definition": "Mint, trade, redeem or manage supported synthetic/collateralized-debt instruments.",
  "family": "family-derivatives-synthetics",
  "workspace": "DERIVATIVES_SYNTHETICS_CENTER"
 },
 {
  "id": "major-governance-participation",
  "title": "Governance Participation",
  "definition": "Participate in supported decentralized proposals, voting and delegation.",
  "family": "family-governance-dao",
  "workspace": "GOVERNANCE_DAO_CENTER"
 },
 {
  "id": "major-gauge-incentive-markets",
  "title": "Gauge & Incentive Markets",
  "definition": "Participate in supported protocol-defined emissions, gauge, voting-power and governance-incentive mechanisms.",
  "family": "family-governance-dao",
  "workspace": "GOVERNANCE_DAO_CENTER"
 },
 {
  "id": "major-insurance-risk-underwriting",
  "title": "Insurance & Risk Underwriting",
  "definition": "Provide or acquire supported decentralized coverage/risk-market positions.",
  "family": "family-insurance-risk",
  "workspace": "INSURANCE_RISK_MARKETS"
 },
 {
  "id": "major-payments-settlement",
  "title": "Payments & Settlement",
  "definition": "Use supported on-chain assets and payment rails to transfer value for payments, recurring or streamed payments, merchant settlement, payroll/distributions, and other legitimate settlement obligations.",
  "family": "family-payments-settlement",
  "workspace": "PAYMENTS_SETTLEMENT_CENTER"
 },
 {
  "id": "major-real-world-asset-finance",
  "title": "Real-World Asset Finance",
  "definition": "Participate in supported tokenized real-world-asset markets and documented associated cash-flow structures.",
  "family": "family-rwa-structured-credit",
  "workspace": "RWA_TOKENIZED_ASSETS"
 },
 {
  "id": "major-structured-credit-tranche-finance",
  "title": "Structured Credit & Tranche Finance",
  "definition": "Participate in supported private-credit, receivable, trade-finance and tranche-based structures.",
  "family": "family-rwa-structured-credit",
  "workspace": "RWA_TOKENIZED_ASSETS"
 },
 {
  "id": "major-nft-fi",
  "title": "NFT-Fi",
  "definition": "Use NFTs in supported financial structures such as collateral, lending or liquidity.",
  "family": "family-nftfi",
  "workspace": "NFTFI_CENTER"
 },
 {
  "id": "major-btcfi",
  "title": "BTCFi",
  "definition": "Participate in supported Bitcoin-native or Bitcoin-linked decentralized financial activities.",
  "family": "family-btcfi",
  "workspace": "BTCFI_CENTER"
 },
 {
  "id": "major-depin-compute-participation",
  "title": "DePIN & Decentralized Compute Participation",
  "definition": "Provide supported compute, storage, connectivity, sensing or other decentralized physical/digital infrastructure resources.",
  "family": "family-depin-compute",
  "workspace": "DEPIN_COMPUTE_CENTER"
 },
 {
  "id": "major-prediction-oracle-markets",
  "title": "Prediction & Oracle Markets",
  "definition": "Participate in supported prediction-market and oracle/data-resolution economic mechanisms.",
  "family": "family-prediction-oracles",
  "workspace": "PREDICTION_ORACLE_CENTER"
 }
];

export const ENCYCLOPEDIA_INDEX: EncyclopediaIndexEntry[] = [
 {
  "id": "family-wallet-asset-operations",
  "title": "Wallet & Asset Operations",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-trading-markets",
  "title": "Trading & Markets",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-swaps-routing",
  "title": "Swaps & Routing",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-arbitrage",
  "title": "Arbitrage",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-liquidity",
  "title": "Liquidity",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-farming-yield",
  "title": "Farming & Yield",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-staking-restaking",
  "title": "Staking & Restaking",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-lending-borrowing",
  "title": "Lending & Borrowing",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-vaults-structured",
  "title": "Vaults & Structured Strategies",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-cross-chain",
  "title": "Cross-Chain",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-mining-nodes-validators",
  "title": "Mining / Nodes / Validators",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-derivatives-synthetics",
  "title": "Derivatives / Synthetics",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-stablecoins",
  "title": "Stablecoins",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-governance-dao",
  "title": "Governance / DAO",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-insurance-risk",
  "title": "Insurance / Risk Markets",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-payments-settlement",
  "title": "Payments / Settlement",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-rwa-structured-credit",
  "title": "RWA / Structured Credit",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-nftfi",
  "title": "NFT-Fi",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-btcfi",
  "title": "BTCFi",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-mev-block",
  "title": "MEV / Block Infrastructure",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-modular-zk",
  "title": "Modular / ZK Infrastructure",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-depin-compute",
  "title": "DePIN / Compute",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-prediction-oracles",
  "title": "Prediction / Oracles",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-desci-ip-rights",
  "title": "DeSci / IP / Rights",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-refi-environmental",
  "title": "ReFi / Environmental Markets",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-gamefi-socialfi-media",
  "title": "GameFi / SocialFi / Media",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-capital-formation",
  "title": "Capital Formation",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "family-privacy-identity",
  "title": "Privacy / Identity Infrastructure",
  "level": "FAMILY",
  "parent": ""
 },
 {
  "id": "major-hold-store-assets",
  "title": "Hold & Store Assets",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-wallet-asset-operations"
 },
 {
  "id": "major-transfer-assets",
  "title": "Transfer Assets",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-wallet-asset-operations"
 },
 {
  "id": "major-asset-permission-management",
  "title": "Asset Permission Management",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-wallet-asset-operations"
 },
 {
  "id": "major-wrap-unwrap-assets",
  "title": "Wrap & Unwrap Assets",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-wallet-asset-operations"
 },
 {
  "id": "major-spot-trading",
  "title": "Spot Trading",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-trading-markets"
 },
 {
  "id": "major-algorithmic-strategy-trading",
  "title": "Algorithmic & Strategy Trading",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-trading-markets"
 },
 {
  "id": "major-decentralized-market-making",
  "title": "Decentralized Market Making",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-trading-markets"
 },
 {
  "id": "major-token-swapping",
  "title": "Token Swapping",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-swaps-routing"
 },
 {
  "id": "major-swap-aggregation-route-optimization",
  "title": "Swap Aggregation & Route Optimization",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-swaps-routing"
 },
 {
  "id": "major-intent-based-execution",
  "title": "Intent-Based Execution",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-swaps-routing"
 },
 {
  "id": "major-cross-dex-arbitrage",
  "title": "Cross-DEX Arbitrage",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-arbitrage"
 },
 {
  "id": "major-triangular-cyclic-arbitrage",
  "title": "Triangular & Cyclic Arbitrage",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-arbitrage"
 },
 {
  "id": "major-cross-chain-arbitrage",
  "title": "Cross-Chain Arbitrage",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-arbitrage"
 },
 {
  "id": "major-stablecoin-peg-arbitrage",
  "title": "Stablecoin & Peg Arbitrage",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-arbitrage"
 },
 {
  "id": "major-flash-capital-arbitrage",
  "title": "Flash-Capital Arbitrage",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-arbitrage"
 },
 {
  "id": "major-standard-liquidity-provision",
  "title": "Standard Liquidity Provision",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-liquidity"
 },
 {
  "id": "major-concentrated-liquidity-provision",
  "title": "Concentrated Liquidity Provision",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-liquidity"
 },
 {
  "id": "major-single-sided-liquidity",
  "title": "Single-Sided Liquidity",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-liquidity"
 },
 {
  "id": "major-automated-liquidity-management",
  "title": "Automated Liquidity Management",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-liquidity"
 },
 {
  "id": "major-programmable-hook-liquidity",
  "title": "Programmable & Hook-Based Liquidity",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-liquidity"
 },
 {
  "id": "major-just-in-time-liquidity",
  "title": "Just-in-Time Liquidity",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-liquidity"
 },
 {
  "id": "major-yield-farming-liquidity-mining",
  "title": "Yield Farming & Liquidity Mining",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-farming-yield"
 },
 {
  "id": "major-yield-aggregation-auto-compounding",
  "title": "Yield Aggregation & Auto-Compounding",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-farming-yield"
 },
 {
  "id": "major-stablecoin-yield-strategies",
  "title": "Stablecoin Yield Strategies",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-farming-yield"
 },
 {
  "id": "major-native-staking",
  "title": "Native Staking",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-staking-restaking"
 },
 {
  "id": "major-liquid-staking",
  "title": "Liquid Staking",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-staking-restaking"
 },
 {
  "id": "major-restaking",
  "title": "Restaking",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-staking-restaking"
 },
 {
  "id": "major-liquid-restaking",
  "title": "Liquid Restaking",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-staking-restaking"
 },
 {
  "id": "major-protocol-token-staking",
  "title": "Protocol Token Staking",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-staking-restaking"
 },
 {
  "id": "major-asset-lending",
  "title": "Asset Lending",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-lending-borrowing"
 },
 {
  "id": "major-collateralized-borrowing",
  "title": "Collateralized Borrowing",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-lending-borrowing"
 },
 {
  "id": "major-isolated-market-borrowing",
  "title": "Isolated-Market Borrowing",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-lending-borrowing"
 },
 {
  "id": "major-credit-delegation-undercollateralized-credit",
  "title": "Credit Delegation & Undercollateralized Credit",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-lending-borrowing"
 },
 {
  "id": "major-atomic-flash-credit",
  "title": "Atomic & Flash Credit",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-lending-borrowing"
 },
 {
  "id": "major-leveraged-recursive-lending",
  "title": "Leveraged & Recursive Lending Strategies",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-lending-borrowing"
 },
 {
  "id": "major-liquidations",
  "title": "Liquidations",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-lending-borrowing"
 },
 {
  "id": "major-automated-strategy-vaults",
  "title": "Automated Strategy Vaults",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-vaults-structured"
 },
 {
  "id": "major-structured-product-vaults",
  "title": "Structured Product Vaults",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-vaults-structured"
 },
 {
  "id": "major-yield-tokenization",
  "title": "Yield Tokenization",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-vaults-structured"
 },
 {
  "id": "major-yield-fixed-rate-trading",
  "title": "Yield & Fixed-Rate Trading",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-vaults-structured"
 },
 {
  "id": "major-bridging",
  "title": "Bridging",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-cross-chain"
 },
 {
  "id": "major-cross-chain-routing-settlement",
  "title": "Cross-Chain Routing & Settlement",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-cross-chain"
 },
 {
  "id": "major-cross-chain-liquidity-provision",
  "title": "Cross-Chain Liquidity Provision",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-cross-chain"
 },
 {
  "id": "major-validator-operation",
  "title": "Validator Operation",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-mining-nodes-validators"
 },
 {
  "id": "major-node-operation",
  "title": "Node Operation",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-mining-nodes-validators"
 },
 {
  "id": "major-mining-proof-of-work",
  "title": "Mining & Proof-of-Work Participation",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-mining-nodes-validators"
 },
 {
  "id": "major-perpetual-trading",
  "title": "Perpetual Trading",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-derivatives-synthetics"
 },
 {
  "id": "major-futures-trading",
  "title": "Futures Trading",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-derivatives-synthetics"
 },
 {
  "id": "major-options-trading-writing",
  "title": "Options Trading & Writing",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-derivatives-synthetics"
 },
 {
  "id": "major-synthetic-assets-cdp",
  "title": "Synthetic Assets & CDP Systems",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-derivatives-synthetics"
 },
 {
  "id": "major-governance-participation",
  "title": "Governance Participation",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-governance-dao"
 },
 {
  "id": "major-gauge-incentive-markets",
  "title": "Gauge & Incentive Markets",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-governance-dao"
 },
 {
  "id": "major-insurance-risk-underwriting",
  "title": "Insurance & Risk Underwriting",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-insurance-risk"
 },
 {
  "id": "major-payments-settlement",
  "title": "Payments & Settlement",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-payments-settlement"
 },
 {
  "id": "major-real-world-asset-finance",
  "title": "Real-World Asset Finance",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-rwa-structured-credit"
 },
 {
  "id": "major-structured-credit-tranche-finance",
  "title": "Structured Credit & Tranche Finance",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-rwa-structured-credit"
 },
 {
  "id": "major-nft-fi",
  "title": "NFT-Fi",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-nftfi"
 },
 {
  "id": "major-btcfi",
  "title": "BTCFi",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-btcfi"
 },
 {
  "id": "major-depin-compute-participation",
  "title": "DePIN & Decentralized Compute Participation",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-depin-compute"
 },
 {
  "id": "major-prediction-oracle-markets",
  "title": "Prediction & Oracle Markets",
  "level": "MAJOR_ACTIVITY",
  "parent": "family-prediction-oracles"
 },
 {
  "id": "type-standard-liquidity-provision-full-range-lp",
  "title": "Full-Range LP",
  "level": "TYPE",
  "parent": "major-standard-liquidity-provision"
 },
 {
  "id": "type-standard-liquidity-provision-protocol-specific-standard-amm-lp",
  "title": "Protocol-Specific Standard AMM LP",
  "level": "TYPE",
  "parent": "major-standard-liquidity-provision"
 },
 {
  "id": "type-standard-liquidity-provision-stable-correlated-asset-lp",
  "title": "Stable/Correlated-Asset LP",
  "level": "TYPE",
  "parent": "major-standard-liquidity-provision"
 },
 {
  "id": "type-standard-liquidity-provision-standard-dual-asset-lp",
  "title": "Standard Dual-Asset LP",
  "level": "TYPE",
  "parent": "major-standard-liquidity-provision"
 },
 {
  "id": "strategy-standard-liquidity-provision-stable-correlated-asset-lp-correlated-pair-lp",
  "title": "Correlated-Pair LP",
  "level": "STRATEGY",
  "parent": "type-standard-liquidity-provision-stable-correlated-asset-lp"
 },
 {
  "id": "strategy-standard-liquidity-provision-standard-dual-asset-lp-fee-capture-lp",
  "title": "Fee-Capture LP",
  "level": "STRATEGY",
  "parent": "type-standard-liquidity-provision-standard-dual-asset-lp"
 },
 {
  "id": "strategy-standard-liquidity-provision-protocol-specific-standard-amm-lp-incentivized-lp",
  "title": "Incentivized LP",
  "level": "STRATEGY",
  "parent": "type-standard-liquidity-provision-protocol-specific-standard-amm-lp"
 },
 {
  "id": "strategy-standard-liquidity-provision-standard-dual-asset-lp-passive-lp",
  "title": "Passive LP",
  "level": "STRATEGY",
  "parent": "type-standard-liquidity-provision-standard-dual-asset-lp"
 },
 {
  "id": "strategy-standard-liquidity-provision-stable-correlated-asset-lp-stable-pair-lp",
  "title": "Stable-Pair LP",
  "level": "STRATEGY",
  "parent": "type-standard-liquidity-provision-stable-correlated-asset-lp"
 },
 {
  "id": "type-concentrated-liquidity-provision-concentrated-range-position",
  "title": "Concentrated-Range Position",
  "level": "TYPE",
  "parent": "major-concentrated-liquidity-provision"
 },
 {
  "id": "type-concentrated-liquidity-provision-managed-concentrated-position",
  "title": "Managed Concentrated Position",
  "level": "TYPE",
  "parent": "major-concentrated-liquidity-provision"
 },
 {
  "id": "type-concentrated-liquidity-provision-programmable-concentrated-position",
  "title": "Programmable Concentrated Position",
  "level": "TYPE",
  "parent": "major-concentrated-liquidity-provision"
 },
 {
  "id": "strategy-concentrated-liquidity-provision-concentrated-range-position-active-range",
  "title": "Active Range",
  "level": "STRATEGY",
  "parent": "type-concentrated-liquidity-provision-concentrated-range-position"
 },
 {
  "id": "strategy-concentrated-liquidity-provision-managed-concentrated-position-automated-range-management",
  "title": "Automated Range Management",
  "level": "STRATEGY",
  "parent": "type-concentrated-liquidity-provision-managed-concentrated-position"
 },
 {
  "id": "strategy-concentrated-liquidity-provision-programmable-concentrated-position-fee-optimization",
  "title": "Fee Optimization",
  "level": "STRATEGY",
  "parent": "type-concentrated-liquidity-provision-programmable-concentrated-position"
 },
 {
  "id": "strategy-concentrated-liquidity-provision-concentrated-range-position-narrow-range",
  "title": "Narrow Range",
  "level": "STRATEGY",
  "parent": "type-concentrated-liquidity-provision-concentrated-range-position"
 },
 {
  "id": "strategy-concentrated-liquidity-provision-concentrated-range-position-passive-range",
  "title": "Passive Range",
  "level": "STRATEGY",
  "parent": "type-concentrated-liquidity-provision-concentrated-range-position"
 },
 {
  "id": "strategy-concentrated-liquidity-provision-managed-concentrated-position-range-rebalancing",
  "title": "Range Rebalancing",
  "level": "STRATEGY",
  "parent": "type-concentrated-liquidity-provision-managed-concentrated-position"
 },
 {
  "id": "strategy-concentrated-liquidity-provision-managed-concentrated-position-volatility-adaptive-range",
  "title": "Volatility-Adaptive Range",
  "level": "STRATEGY",
  "parent": "type-concentrated-liquidity-provision-managed-concentrated-position"
 },
 {
  "id": "strategy-concentrated-liquidity-provision-concentrated-range-position-wide-range",
  "title": "Wide Range",
  "level": "STRATEGY",
  "parent": "type-concentrated-liquidity-provision-concentrated-range-position"
 },
 {
  "id": "type-single-sided-liquidity-internally-balanced-single-sided-deposit",
  "title": "Internally Balanced Single-Sided Deposit",
  "level": "TYPE",
  "parent": "major-single-sided-liquidity"
 },
 {
  "id": "type-single-sided-liquidity-native-single-sided-deposit",
  "title": "Native Single-Sided Deposit",
  "level": "TYPE",
  "parent": "major-single-sided-liquidity"
 },
 {
  "id": "type-single-sided-liquidity-vault-managed-single-sided-deposit",
  "title": "Vault-Managed Single-Sided Deposit",
  "level": "TYPE",
  "parent": "major-single-sided-liquidity"
 },
 {
  "id": "strategy-single-sided-liquidity-internally-balanced-single-sided-deposit-automated-pair-conversion",
  "title": "Automated Pair Conversion",
  "level": "STRATEGY",
  "parent": "type-single-sided-liquidity-internally-balanced-single-sided-deposit"
 },
 {
  "id": "strategy-single-sided-liquidity-native-single-sided-deposit-single-asset-lp-deployment",
  "title": "Single-Asset LP Deployment",
  "level": "STRATEGY",
  "parent": "type-single-sided-liquidity-native-single-sided-deposit"
 },
 {
  "id": "strategy-single-sided-liquidity-vault-managed-single-sided-deposit-single-sided-yield-optimization",
  "title": "Single-Sided Yield Optimization",
  "level": "STRATEGY",
  "parent": "type-single-sided-liquidity-vault-managed-single-sided-deposit"
 },
 {
  "id": "type-automated-liquidity-management-alm-vault",
  "title": "ALM Vault",
  "level": "TYPE",
  "parent": "major-automated-liquidity-management"
 },
 {
  "id": "type-automated-liquidity-management-multi-position-liquidity-manager",
  "title": "Multi-Position Liquidity Manager",
  "level": "TYPE",
  "parent": "major-automated-liquidity-management"
 },
 {
  "id": "type-automated-liquidity-management-range-manager",
  "title": "Range Manager",
  "level": "TYPE",
  "parent": "major-automated-liquidity-management"
 },
 {
  "id": "type-automated-liquidity-management-rebalancing-manager",
  "title": "Rebalancing Manager",
  "level": "TYPE",
  "parent": "major-automated-liquidity-management"
 },
 {
  "id": "strategy-automated-liquidity-management-range-manager-automated-range-rebalancing",
  "title": "Automated Range Rebalancing",
  "level": "STRATEGY",
  "parent": "type-automated-liquidity-management-range-manager"
 },
 {
  "id": "strategy-automated-liquidity-management-rebalancing-manager-cost-aware-rebalancing",
  "title": "Cost-Aware Rebalancing",
  "level": "STRATEGY",
  "parent": "type-automated-liquidity-management-rebalancing-manager"
 },
 {
  "id": "strategy-automated-liquidity-management-alm-vault-fee-reinvestment",
  "title": "Fee-Reinvestment",
  "level": "STRATEGY",
  "parent": "type-automated-liquidity-management-alm-vault"
 },
 {
  "id": "strategy-automated-liquidity-management-multi-position-liquidity-manager-multi-range-allocation",
  "title": "Multi-Range Allocation",
  "level": "STRATEGY",
  "parent": "type-automated-liquidity-management-multi-position-liquidity-manager"
 },
 {
  "id": "strategy-automated-liquidity-management-multi-position-liquidity-manager-position-migration",
  "title": "Position Migration",
  "level": "STRATEGY",
  "parent": "type-automated-liquidity-management-multi-position-liquidity-manager"
 },
 {
  "id": "strategy-automated-liquidity-management-rebalancing-manager-volatility-adaptive-rebalancing",
  "title": "Volatility-Adaptive Rebalancing",
  "level": "STRATEGY",
  "parent": "type-automated-liquidity-management-rebalancing-manager"
 },
 {
  "id": "type-programmable-hook-liquidity-custom-accounting-pool",
  "title": "Custom-Accounting Pool",
  "level": "TYPE",
  "parent": "major-programmable-hook-liquidity"
 },
 {
  "id": "type-programmable-hook-liquidity-custom-curve-pool",
  "title": "Custom-Curve Pool",
  "level": "TYPE",
  "parent": "major-programmable-hook-liquidity"
 },
 {
  "id": "type-programmable-hook-liquidity-dynamic-fee-pool",
  "title": "Dynamic-Fee Pool",
  "level": "TYPE",
  "parent": "major-programmable-hook-liquidity"
 },
 {
  "id": "type-programmable-hook-liquidity-embedded-order-pool",
  "title": "Embedded-Order Pool",
  "level": "TYPE",
  "parent": "major-programmable-hook-liquidity"
 },
 {
  "id": "type-programmable-hook-liquidity-hook-enabled-pool",
  "title": "Hook-Enabled Pool",
  "level": "TYPE",
  "parent": "major-programmable-hook-liquidity"
 },
 {
  "id": "strategy-programmable-hook-liquidity-embedded-order-pool-automated-order-strategy",
  "title": "Automated Order Strategy",
  "level": "STRATEGY",
  "parent": "type-programmable-hook-liquidity-embedded-order-pool"
 },
 {
  "id": "strategy-programmable-hook-liquidity-custom-curve-pool-custom-pricing-strategy",
  "title": "Custom Pricing Strategy",
  "level": "STRATEGY",
  "parent": "type-programmable-hook-liquidity-custom-curve-pool"
 },
 {
  "id": "strategy-programmable-hook-liquidity-dynamic-fee-pool-dynamic-fee-strategy",
  "title": "Dynamic Fee Strategy",
  "level": "STRATEGY",
  "parent": "type-programmable-hook-liquidity-dynamic-fee-pool"
 },
 {
  "id": "strategy-programmable-hook-liquidity-hook-enabled-pool-hook-based-incentive-strategy",
  "title": "Hook-Based Incentive Strategy",
  "level": "STRATEGY",
  "parent": "type-programmable-hook-liquidity-hook-enabled-pool"
 },
 {
  "id": "strategy-programmable-hook-liquidity-hook-enabled-pool-oracle-aware-strategy",
  "title": "Oracle-Aware Strategy",
  "level": "STRATEGY",
  "parent": "type-programmable-hook-liquidity-hook-enabled-pool"
 },
 {
  "id": "strategy-programmable-hook-liquidity-custom-accounting-pool-programmable-liquidity-management",
  "title": "Programmable Liquidity Management",
  "level": "STRATEGY",
  "parent": "type-programmable-hook-liquidity-custom-accounting-pool"
 },
 {
  "id": "type-just-in-time-liquidity-atomic-short-duration-liquidity-position",
  "title": "Atomic/Short-Duration Liquidity Position",
  "level": "TYPE",
  "parent": "major-just-in-time-liquidity"
 },
 {
  "id": "type-just-in-time-liquidity-jit-concentrated-position",
  "title": "JIT Concentrated Position",
  "level": "TYPE",
  "parent": "major-just-in-time-liquidity"
 },
 {
  "id": "strategy-just-in-time-liquidity-atomic-short-duration-liquidity-position-backrun-associated-jit",
  "title": "Backrun-Associated JIT",
  "level": "STRATEGY",
  "parent": "type-just-in-time-liquidity-atomic-short-duration-liquidity-position"
 },
 {
  "id": "strategy-just-in-time-liquidity-jit-concentrated-position-fee-capture-jit",
  "title": "Fee-Capture JIT",
  "level": "STRATEGY",
  "parent": "type-just-in-time-liquidity-jit-concentrated-position"
 },
 {
  "id": "strategy-just-in-time-liquidity-jit-concentrated-position-large-flow-jit-provision",
  "title": "Large-Flow JIT Provision",
  "level": "STRATEGY",
  "parent": "type-just-in-time-liquidity-jit-concentrated-position"
 },
 {
  "id": "type-yield-farming-liquidity-mining-incentive-farming",
  "title": "Incentive Farming",
  "level": "TYPE",
  "parent": "major-yield-farming-liquidity-mining"
 },
 {
  "id": "type-yield-farming-liquidity-mining-lp-farming",
  "title": "LP Farming",
  "level": "TYPE",
  "parent": "major-yield-farming-liquidity-mining"
 },
 {
  "id": "type-yield-farming-liquidity-mining-multi-protocol-farming",
  "title": "Multi-Protocol Farming",
  "level": "TYPE",
  "parent": "major-yield-farming-liquidity-mining"
 },
 {
  "id": "type-yield-farming-liquidity-mining-single-asset-farming",
  "title": "Single-Asset Farming",
  "level": "TYPE",
  "parent": "major-yield-farming-liquidity-mining"
 },
 {
  "id": "type-yield-farming-liquidity-mining-stablecoin-farming",
  "title": "Stablecoin Farming",
  "level": "TYPE",
  "parent": "major-yield-farming-liquidity-mining"
 },
 {
  "id": "strategy-yield-farming-liquidity-mining-single-asset-farming-delta-hedged-farming",
  "title": "Delta-Hedged Farming",
  "level": "STRATEGY",
  "parent": "type-yield-farming-liquidity-mining-single-asset-farming"
 },
 {
  "id": "strategy-yield-farming-liquidity-mining-multi-protocol-farming-farm-rotation",
  "title": "Farm Rotation",
  "level": "STRATEGY",
  "parent": "type-yield-farming-liquidity-mining-multi-protocol-farming"
 },
 {
  "id": "strategy-yield-farming-liquidity-mining-incentive-farming-incentive-stacking",
  "title": "Incentive Stacking",
  "level": "STRATEGY",
  "parent": "type-yield-farming-liquidity-mining-incentive-farming"
 },
 {
  "id": "strategy-yield-farming-liquidity-mining-lp-farming-leveraged-farming",
  "title": "Leveraged Farming",
  "level": "STRATEGY",
  "parent": "type-yield-farming-liquidity-mining-lp-farming"
 },
 {
  "id": "strategy-yield-farming-liquidity-mining-lp-farming-reward-harvesting",
  "title": "Reward Harvesting",
  "level": "STRATEGY",
  "parent": "type-yield-farming-liquidity-mining-lp-farming"
 },
 {
  "id": "strategy-yield-farming-liquidity-mining-lp-farming-reward-reinvestment",
  "title": "Reward Reinvestment",
  "level": "STRATEGY",
  "parent": "type-yield-farming-liquidity-mining-lp-farming"
 },
 {
  "id": "type-yield-aggregation-auto-compounding-auto-compounder",
  "title": "Auto-Compounder",
  "level": "TYPE",
  "parent": "major-yield-aggregation-auto-compounding"
 },
 {
  "id": "type-yield-aggregation-auto-compounding-cross-chain-yield-optimizer",
  "title": "Cross-Chain Yield Optimizer",
  "level": "TYPE",
  "parent": "major-yield-aggregation-auto-compounding"
 },
 {
  "id": "type-yield-aggregation-auto-compounding-governance-gauge-optimizer",
  "title": "Governance/Gauge Optimizer",
  "level": "TYPE",
  "parent": "major-yield-aggregation-auto-compounding"
 },
 {
  "id": "type-yield-aggregation-auto-compounding-lending-optimizer",
  "title": "Lending Optimizer",
  "level": "TYPE",
  "parent": "major-yield-aggregation-auto-compounding"
 },
 {
  "id": "type-yield-aggregation-auto-compounding-lp-optimizer",
  "title": "LP Optimizer",
  "level": "TYPE",
  "parent": "major-yield-aggregation-auto-compounding"
 },
 {
  "id": "type-yield-aggregation-auto-compounding-multi-strategy-vault",
  "title": "Multi-Strategy Vault",
  "level": "TYPE",
  "parent": "major-yield-aggregation-auto-compounding"
 },
 {
  "id": "type-yield-aggregation-auto-compounding-restaking-optimizer",
  "title": "Restaking Optimizer",
  "level": "TYPE",
  "parent": "major-yield-aggregation-auto-compounding"
 },
 {
  "id": "type-yield-aggregation-auto-compounding-staking-optimizer",
  "title": "Staking Optimizer",
  "level": "TYPE",
  "parent": "major-yield-aggregation-auto-compounding"
 },
 {
  "id": "type-yield-aggregation-auto-compounding-yield-optimizer",
  "title": "Yield Optimizer",
  "level": "TYPE",
  "parent": "major-yield-aggregation-auto-compounding"
 },
 {
  "id": "strategy-yield-aggregation-auto-compounding-auto-compounder-cost-aware-compounding",
  "title": "Cost-Aware Compounding",
  "level": "STRATEGY",
  "parent": "type-yield-aggregation-auto-compounding-auto-compounder"
 },
 {
  "id": "strategy-yield-aggregation-auto-compounding-auto-compounder-harvest-swap-redeposit",
  "title": "Harvest-Swap-Redeposit",
  "level": "STRATEGY",
  "parent": "type-yield-aggregation-auto-compounding-auto-compounder"
 },
 {
  "id": "strategy-yield-aggregation-auto-compounding-multi-strategy-vault-multi-protocol-allocation",
  "title": "Multi-Protocol Allocation",
  "level": "STRATEGY",
  "parent": "type-yield-aggregation-auto-compounding-multi-strategy-vault"
 },
 {
  "id": "strategy-yield-aggregation-auto-compounding-multi-strategy-vault-rate-aware-reallocation",
  "title": "Rate-Aware Reallocation",
  "level": "STRATEGY",
  "parent": "type-yield-aggregation-auto-compounding-multi-strategy-vault"
 },
 {
  "id": "strategy-yield-aggregation-auto-compounding-auto-compounder-reward-harvesting",
  "title": "Reward Harvesting",
  "level": "STRATEGY",
  "parent": "type-yield-aggregation-auto-compounding-auto-compounder"
 },
 {
  "id": "strategy-yield-aggregation-auto-compounding-yield-optimizer-risk-adjusted-allocation",
  "title": "Risk-Adjusted Allocation",
  "level": "STRATEGY",
  "parent": "type-yield-aggregation-auto-compounding-yield-optimizer"
 },
 {
  "id": "strategy-yield-aggregation-auto-compounding-yield-optimizer-strategy-reallocation",
  "title": "Strategy Reallocation",
  "level": "STRATEGY",
  "parent": "type-yield-aggregation-auto-compounding-yield-optimizer"
 },
 {
  "id": "strategy-yield-aggregation-auto-compounding-auto-compounder-threshold-based-compounding",
  "title": "Threshold-Based Compounding",
  "level": "STRATEGY",
  "parent": "type-yield-aggregation-auto-compounding-auto-compounder"
 },
 {
  "id": "type-stablecoin-yield-strategies-rwa-backed-stablecoin-yield",
  "title": "RWA-Backed Stablecoin Yield",
  "level": "TYPE",
  "parent": "major-stablecoin-yield-strategies"
 },
 {
  "id": "type-stablecoin-yield-strategies-stablecoin-farming",
  "title": "Stablecoin Farming",
  "level": "TYPE",
  "parent": "major-stablecoin-yield-strategies"
 },
 {
  "id": "type-stablecoin-yield-strategies-stablecoin-lending-yield",
  "title": "Stablecoin Lending Yield",
  "level": "TYPE",
  "parent": "major-stablecoin-yield-strategies"
 },
 {
  "id": "type-stablecoin-yield-strategies-stablecoin-lp-yield",
  "title": "Stablecoin LP Yield",
  "level": "TYPE",
  "parent": "major-stablecoin-yield-strategies"
 },
 {
  "id": "type-stablecoin-yield-strategies-stablecoin-vault-yield",
  "title": "Stablecoin Vault Yield",
  "level": "TYPE",
  "parent": "major-stablecoin-yield-strategies"
 },
 {
  "id": "type-stablecoin-yield-strategies-yield-bearing-stablecoin-position",
  "title": "Yield-Bearing Stablecoin Position",
  "level": "TYPE",
  "parent": "major-stablecoin-yield-strategies"
 },
 {
  "id": "strategy-stablecoin-yield-strategies-stablecoin-vault-yield-auto-compounded-stable-yield",
  "title": "Auto-Compounded Stable Yield",
  "level": "STRATEGY",
  "parent": "type-stablecoin-yield-strategies-stablecoin-vault-yield"
 },
 {
  "id": "strategy-stablecoin-yield-strategies-stablecoin-vault-yield-diversified-stablecoin-allocation",
  "title": "Diversified Stablecoin Allocation",
  "level": "STRATEGY",
  "parent": "type-stablecoin-yield-strategies-stablecoin-vault-yield"
 },
 {
  "id": "strategy-stablecoin-yield-strategies-stablecoin-vault-yield-fixed-variable-yield-allocation",
  "title": "Fixed/Variable Yield Allocation",
  "level": "STRATEGY",
  "parent": "type-stablecoin-yield-strategies-stablecoin-vault-yield"
 },
 {
  "id": "strategy-stablecoin-yield-strategies-yield-bearing-stablecoin-position-peg-risk-aware-allocation",
  "title": "Peg-Risk-Aware Allocation",
  "level": "STRATEGY",
  "parent": "type-stablecoin-yield-strategies-yield-bearing-stablecoin-position"
 },
 {
  "id": "strategy-stablecoin-yield-strategies-stablecoin-lending-yield-single-stablecoin-lending",
  "title": "Single-Stablecoin Lending",
  "level": "STRATEGY",
  "parent": "type-stablecoin-yield-strategies-stablecoin-lending-yield"
 },
 {
  "id": "strategy-stablecoin-yield-strategies-stablecoin-lp-yield-stable-pair-lp",
  "title": "Stable-Pair LP",
  "level": "STRATEGY",
  "parent": "type-stablecoin-yield-strategies-stablecoin-lp-yield"
 },
 {
  "id": "type-native-staking-delegated-staking",
  "title": "Delegated Staking",
  "level": "TYPE",
  "parent": "major-native-staking"
 },
 {
  "id": "type-native-staking-pooled-staking",
  "title": "Pooled Staking",
  "level": "TYPE",
  "parent": "major-native-staking"
 },
 {
  "id": "type-native-staking-solo-staking",
  "title": "Solo Staking",
  "level": "TYPE",
  "parent": "major-native-staking"
 },
 {
  "id": "strategy-native-staking-delegated-staking-delegated-non-custodial-staking",
  "title": "Delegated Non-Custodial Staking",
  "level": "STRATEGY",
  "parent": "type-native-staking-delegated-staking"
 },
 {
  "id": "strategy-native-staking-solo-staking-direct-validator-staking",
  "title": "Direct Validator Staking",
  "level": "STRATEGY",
  "parent": "type-native-staking-solo-staking"
 },
 {
  "id": "strategy-native-staking-pooled-staking-reward-reinvestment",
  "title": "Reward Reinvestment",
  "level": "STRATEGY",
  "parent": "type-native-staking-pooled-staking"
 },
 {
  "id": "strategy-native-staking-delegated-staking-validator-selection",
  "title": "Validator Selection",
  "level": "STRATEGY",
  "parent": "type-native-staking-delegated-staking"
 },
 {
  "id": "type-liquid-staking-delegated-liquid-staking",
  "title": "Delegated Liquid Staking",
  "level": "TYPE",
  "parent": "major-liquid-staking"
 },
 {
  "id": "type-liquid-staking-pooled-liquid-staking",
  "title": "Pooled Liquid Staking",
  "level": "TYPE",
  "parent": "major-liquid-staking"
 },
 {
  "id": "type-liquid-staking-rebasing-lst",
  "title": "Rebasing LST",
  "level": "TYPE",
  "parent": "major-liquid-staking"
 },
 {
  "id": "type-liquid-staking-value-accruing-lst",
  "title": "Value-Accruing LST",
  "level": "TYPE",
  "parent": "major-liquid-staking"
 },
 {
  "id": "strategy-liquid-staking-rebasing-lst-hold-lst",
  "title": "Hold LST",
  "level": "STRATEGY",
  "parent": "type-liquid-staking-rebasing-lst"
 },
 {
  "id": "strategy-liquid-staking-value-accruing-lst-lst-collateral-deployment",
  "title": "LST Collateral Deployment",
  "level": "STRATEGY",
  "parent": "type-liquid-staking-value-accruing-lst"
 },
 {
  "id": "strategy-liquid-staking-value-accruing-lst-lst-lending",
  "title": "LST Lending",
  "level": "STRATEGY",
  "parent": "type-liquid-staking-value-accruing-lst"
 },
 {
  "id": "strategy-liquid-staking-pooled-liquid-staking-lst-liquidity-provision",
  "title": "LST Liquidity Provision",
  "level": "STRATEGY",
  "parent": "type-liquid-staking-pooled-liquid-staking"
 },
 {
  "id": "strategy-liquid-staking-pooled-liquid-staking-lst-looping",
  "title": "LST Looping",
  "level": "STRATEGY",
  "parent": "type-liquid-staking-pooled-liquid-staking"
 },
 {
  "id": "strategy-liquid-staking-delegated-liquid-staking-lst-yield-stacking",
  "title": "LST Yield Stacking",
  "level": "STRATEGY",
  "parent": "type-liquid-staking-delegated-liquid-staking"
 },
 {
  "id": "type-restaking-lst-restaking",
  "title": "LST Restaking",
  "level": "TYPE",
  "parent": "major-restaking"
 },
 {
  "id": "type-restaking-native-restaking",
  "title": "Native Restaking",
  "level": "TYPE",
  "parent": "major-restaking"
 },
 {
  "id": "type-restaking-service-network-specific-restaking",
  "title": "Service/Network-Specific Restaking",
  "level": "TYPE",
  "parent": "major-restaking"
 },
 {
  "id": "type-restaking-shared-security-restaking",
  "title": "Shared-Security Restaking",
  "level": "TYPE",
  "parent": "major-restaking"
 },
 {
  "id": "strategy-restaking-native-restaking-base-staking-restaking",
  "title": "Base Staking + Restaking",
  "level": "STRATEGY",
  "parent": "type-restaking-native-restaking"
 },
 {
  "id": "strategy-restaking-shared-security-restaking-multi-service-allocation",
  "title": "Multi-Service Allocation",
  "level": "STRATEGY",
  "parent": "type-restaking-shared-security-restaking"
 },
 {
  "id": "strategy-restaking-lst-restaking-restaking-reward-stacking",
  "title": "Restaking Reward Stacking",
  "level": "STRATEGY",
  "parent": "type-restaking-lst-restaking"
 },
 {
  "id": "strategy-restaking-service-network-specific-restaking-restaking-vault-allocation",
  "title": "Restaking Vault Allocation",
  "level": "STRATEGY",
  "parent": "type-restaking-service-network-specific-restaking"
 },
 {
  "id": "strategy-restaking-shared-security-restaking-risk-diversified-restaking",
  "title": "Risk-Diversified Restaking",
  "level": "STRATEGY",
  "parent": "type-restaking-shared-security-restaking"
 },
 {
  "id": "type-liquid-restaking-liquid-restaking-token-position",
  "title": "Liquid Restaking Token Position",
  "level": "TYPE",
  "parent": "major-liquid-restaking"
 },
 {
  "id": "type-liquid-restaking-multi-service-liquid-restaking-position",
  "title": "Multi-Service Liquid Restaking Position",
  "level": "TYPE",
  "parent": "major-liquid-restaking"
 },
 {
  "id": "type-liquid-restaking-restaking-vault-receipt",
  "title": "Restaking Vault Receipt",
  "level": "TYPE",
  "parent": "major-liquid-restaking"
 },
 {
  "id": "strategy-liquid-restaking-liquid-restaking-token-position-lrt-holding",
  "title": "LRT Holding",
  "level": "STRATEGY",
  "parent": "type-liquid-restaking-liquid-restaking-token-position"
 },
 {
  "id": "strategy-liquid-restaking-liquid-restaking-token-position-lrt-lending",
  "title": "LRT Lending",
  "level": "STRATEGY",
  "parent": "type-liquid-restaking-liquid-restaking-token-position"
 },
 {
  "id": "strategy-liquid-restaking-liquid-restaking-token-position-lrt-liquidity",
  "title": "LRT Liquidity",
  "level": "STRATEGY",
  "parent": "type-liquid-restaking-liquid-restaking-token-position"
 },
 {
  "id": "strategy-liquid-restaking-liquid-restaking-token-position-lrt-looping",
  "title": "LRT Looping",
  "level": "STRATEGY",
  "parent": "type-liquid-restaking-liquid-restaking-token-position"
 },
 {
  "id": "strategy-liquid-restaking-multi-service-liquid-restaking-position-lrt-multi-layer-yield-strategy",
  "title": "LRT Multi-Layer Yield Strategy",
  "level": "STRATEGY",
  "parent": "type-liquid-restaking-multi-service-liquid-restaking-position"
 },
 {
  "id": "strategy-liquid-restaking-restaking-vault-receipt-lrt-vault-compounding",
  "title": "LRT Vault Compounding",
  "level": "STRATEGY",
  "parent": "type-liquid-restaking-restaking-vault-receipt"
 },
 {
  "id": "type-protocol-token-staking-governance-staking",
  "title": "Governance Staking",
  "level": "TYPE",
  "parent": "major-protocol-token-staking"
 },
 {
  "id": "type-protocol-token-staking-lock-based-governance-staking",
  "title": "Lock-Based Governance Staking",
  "level": "TYPE",
  "parent": "major-protocol-token-staking"
 },
 {
  "id": "type-protocol-token-staking-revenue-fee-linked-protocol-staking",
  "title": "Revenue/fee-linked Protocol Staking",
  "level": "TYPE",
  "parent": "major-protocol-token-staking"
 },
 {
  "id": "type-protocol-token-staking-vote-escrow-style-staking",
  "title": "Vote-Escrow Style Staking",
  "level": "TYPE",
  "parent": "major-protocol-token-staking"
 },
 {
  "id": "strategy-protocol-token-staking-vote-escrow-style-staking-gauge-emission-direction",
  "title": "Gauge/Emission Direction",
  "level": "STRATEGY",
  "parent": "type-protocol-token-staking-vote-escrow-style-staking"
 },
 {
  "id": "strategy-protocol-token-staking-governance-staking-governance-participation-via-stake",
  "title": "Governance Participation via Stake",
  "level": "STRATEGY",
  "parent": "type-protocol-token-staking-governance-staking"
 },
 {
  "id": "strategy-protocol-token-staking-revenue-fee-linked-protocol-staking-incentive-optimization",
  "title": "Incentive Optimization",
  "level": "STRATEGY",
  "parent": "type-protocol-token-staking-revenue-fee-linked-protocol-staking"
 },
 {
  "id": "strategy-protocol-token-staking-lock-based-governance-staking-lock-duration-strategy",
  "title": "Lock-Duration Strategy",
  "level": "STRATEGY",
  "parent": "type-protocol-token-staking-lock-based-governance-staking"
 },
 {
  "id": "strategy-protocol-token-staking-revenue-fee-linked-protocol-staking-protocol-reward-staking",
  "title": "Protocol Reward Staking",
  "level": "STRATEGY",
  "parent": "type-protocol-token-staking-revenue-fee-linked-protocol-staking"
 },
 {
  "id": "type-asset-lending-curated-lending-vault",
  "title": "Curated Lending Vault",
  "level": "TYPE",
  "parent": "major-asset-lending"
 },
 {
  "id": "type-asset-lending-isolated-lending-market",
  "title": "Isolated Lending Market",
  "level": "TYPE",
  "parent": "major-asset-lending"
 },
 {
  "id": "type-asset-lending-permissioned-lending-market",
  "title": "Permissioned Lending Market",
  "level": "TYPE",
  "parent": "major-asset-lending"
 },
 {
  "id": "type-asset-lending-pooled-lending-market",
  "title": "Pooled Lending Market",
  "level": "TYPE",
  "parent": "major-asset-lending"
 },
 {
  "id": "type-asset-lending-stablecoin-lending",
  "title": "Stablecoin Lending",
  "level": "TYPE",
  "parent": "major-asset-lending"
 },
 {
  "id": "type-asset-lending-tokenized-rwa-lending-market",
  "title": "Tokenized/RWA Lending Market",
  "level": "TYPE",
  "parent": "major-asset-lending"
 },
 {
  "id": "strategy-asset-lending-curated-lending-vault-curator-managed-lending-allocation",
  "title": "Curator-Managed Lending Allocation",
  "level": "STRATEGY",
  "parent": "type-asset-lending-curated-lending-vault"
 },
 {
  "id": "strategy-asset-lending-isolated-lending-market-direct-isolated-market-supply",
  "title": "Direct Isolated-Market Supply",
  "level": "STRATEGY",
  "parent": "type-asset-lending-isolated-lending-market"
 },
 {
  "id": "strategy-asset-lending-stablecoin-lending-diversified-stablecoin-lending",
  "title": "Diversified Stablecoin Lending",
  "level": "STRATEGY",
  "parent": "type-asset-lending-stablecoin-lending"
 },
 {
  "id": "strategy-asset-lending-permissioned-lending-market-eligibility-gated-lending",
  "title": "Eligibility-Gated Lending",
  "level": "STRATEGY",
  "parent": "type-asset-lending-permissioned-lending-market"
 },
 {
  "id": "strategy-asset-lending-permissioned-lending-market-institutional-lending-allocation",
  "title": "Institutional Lending Allocation",
  "level": "STRATEGY",
  "parent": "type-asset-lending-permissioned-lending-market"
 },
 {
  "id": "strategy-asset-lending-curated-lending-vault-lending-vault-reallocation",
  "title": "Lending-Vault Reallocation",
  "level": "STRATEGY",
  "parent": "type-asset-lending-curated-lending-vault"
 },
 {
  "id": "strategy-asset-lending-isolated-lending-market-lltv-aware-market-selection",
  "title": "LLTV-Aware Market Selection",
  "level": "STRATEGY",
  "parent": "type-asset-lending-isolated-lending-market"
 },
 {
  "id": "strategy-asset-lending-pooled-lending-market-multi-asset-lending-allocation",
  "title": "Multi-Asset Lending Allocation",
  "level": "STRATEGY",
  "parent": "type-asset-lending-pooled-lending-market"
 },
 {
  "id": "strategy-asset-lending-curated-lending-vault-multi-market-lending-allocation",
  "title": "Multi-Market Lending Allocation",
  "level": "STRATEGY",
  "parent": "type-asset-lending-curated-lending-vault"
 },
 {
  "id": "strategy-asset-lending-isolated-lending-market-oracle-aware-market-selection",
  "title": "Oracle-Aware Market Selection",
  "level": "STRATEGY",
  "parent": "type-asset-lending-isolated-lending-market"
 },
 {
  "id": "strategy-asset-lending-pooled-lending-market-utilization-aware-lending",
  "title": "Utilization-Aware Lending",
  "level": "STRATEGY",
  "parent": "type-asset-lending-pooled-lending-market"
 },
 {
  "id": "strategy-asset-lending-pooled-lending-market-variable-rate-supply",
  "title": "Variable-Rate Supply",
  "level": "STRATEGY",
  "parent": "type-asset-lending-pooled-lending-market"
 },
 {
  "id": "type-collateralized-borrowing-efficiency-mode-borrowing",
  "title": "Efficiency-Mode Borrowing",
  "level": "TYPE",
  "parent": "major-collateralized-borrowing"
 },
 {
  "id": "type-collateralized-borrowing-multi-collateral-borrowing",
  "title": "Multi-Collateral Borrowing",
  "level": "TYPE",
  "parent": "major-collateralized-borrowing"
 },
 {
  "id": "type-collateralized-borrowing-permissioned-collateralized-borrowing",
  "title": "Permissioned Collateralized Borrowing",
  "level": "TYPE",
  "parent": "major-collateralized-borrowing"
 },
 {
  "id": "type-collateralized-borrowing-pooled-overcollateralized-borrowing",
  "title": "Pooled Overcollateralized Borrowing",
  "level": "TYPE",
  "parent": "major-collateralized-borrowing"
 },
 {
  "id": "type-collateralized-borrowing-rwa-backed-borrowing",
  "title": "RWA-Backed Borrowing",
  "level": "TYPE",
  "parent": "major-collateralized-borrowing"
 },
 {
  "id": "strategy-collateralized-borrowing-multi-collateral-borrowing-collateral-allocation",
  "title": "Collateral Allocation",
  "level": "STRATEGY",
  "parent": "type-collateralized-borrowing-multi-collateral-borrowing"
 },
 {
  "id": "strategy-collateralized-borrowing-pooled-overcollateralized-borrowing-collateral-diversification",
  "title": "Collateral Diversification",
  "level": "STRATEGY",
  "parent": "type-collateralized-borrowing-pooled-overcollateralized-borrowing"
 },
 {
  "id": "strategy-collateralized-borrowing-pooled-overcollateralized-borrowing-conservative-ltv-borrowing",
  "title": "Conservative-LTV Borrowing",
  "level": "STRATEGY",
  "parent": "type-collateralized-borrowing-pooled-overcollateralized-borrowing"
 },
 {
  "id": "strategy-collateralized-borrowing-efficiency-mode-borrowing-correlated-asset-borrowing",
  "title": "Correlated-Asset Borrowing",
  "level": "STRATEGY",
  "parent": "type-collateralized-borrowing-efficiency-mode-borrowing"
 },
 {
  "id": "strategy-collateralized-borrowing-permissioned-collateralized-borrowing-eligibility-gated-credit",
  "title": "Eligibility-Gated Credit",
  "level": "STRATEGY",
  "parent": "type-collateralized-borrowing-permissioned-collateralized-borrowing"
 },
 {
  "id": "strategy-collateralized-borrowing-multi-collateral-borrowing-health-factor-buffer-management",
  "title": "Health-Factor Buffer Management",
  "level": "STRATEGY",
  "parent": "type-collateralized-borrowing-multi-collateral-borrowing"
 },
 {
  "id": "strategy-collateralized-borrowing-efficiency-mode-borrowing-lst-eth-e-mode-borrowing",
  "title": "LST/ETH E-Mode Borrowing",
  "level": "STRATEGY",
  "parent": "type-collateralized-borrowing-efficiency-mode-borrowing"
 },
 {
  "id": "strategy-collateralized-borrowing-efficiency-mode-borrowing-stablecoin-e-mode-borrowing",
  "title": "Stablecoin E-Mode Borrowing",
  "level": "STRATEGY",
  "parent": "type-collateralized-borrowing-efficiency-mode-borrowing"
 },
 {
  "id": "strategy-collateralized-borrowing-rwa-backed-borrowing-tokenized-asset-collateral-borrowing",
  "title": "Tokenized-Asset Collateral Borrowing",
  "level": "STRATEGY",
  "parent": "type-collateralized-borrowing-rwa-backed-borrowing"
 },
 {
  "id": "strategy-collateralized-borrowing-pooled-overcollateralized-borrowing-variable-rate-borrowing",
  "title": "Variable-Rate Borrowing",
  "level": "STRATEGY",
  "parent": "type-collateralized-borrowing-pooled-overcollateralized-borrowing"
 },
 {
  "id": "type-isolated-market-borrowing-curated-isolated-borrow-market",
  "title": "Curated Isolated Borrow Market",
  "level": "TYPE",
  "parent": "major-isolated-market-borrowing"
 },
 {
  "id": "type-isolated-market-borrowing-immutable-parameter-isolated-market",
  "title": "Immutable-Parameter Isolated Market",
  "level": "TYPE",
  "parent": "major-isolated-market-borrowing"
 },
 {
  "id": "type-isolated-market-borrowing-single-collateral-single-loan-market",
  "title": "Single-Collateral/Single-Loan Market",
  "level": "TYPE",
  "parent": "major-isolated-market-borrowing"
 },
 {
  "id": "strategy-isolated-market-borrowing-single-collateral-single-loan-market-irm-aware-borrowing",
  "title": "IRM-Aware Borrowing",
  "level": "STRATEGY",
  "parent": "type-isolated-market-borrowing-single-collateral-single-loan-market"
 },
 {
  "id": "strategy-isolated-market-borrowing-single-collateral-single-loan-market-isolated-collateral-selection",
  "title": "Isolated Collateral Selection",
  "level": "STRATEGY",
  "parent": "type-isolated-market-borrowing-single-collateral-single-loan-market"
 },
 {
  "id": "strategy-isolated-market-borrowing-single-collateral-single-loan-market-liquidation-buffer-management",
  "title": "Liquidation-Buffer Management",
  "level": "STRATEGY",
  "parent": "type-isolated-market-borrowing-single-collateral-single-loan-market"
 },
 {
  "id": "strategy-isolated-market-borrowing-single-collateral-single-loan-market-lltv-aware-borrowing",
  "title": "LLTV-Aware Borrowing",
  "level": "STRATEGY",
  "parent": "type-isolated-market-borrowing-single-collateral-single-loan-market"
 },
 {
  "id": "strategy-isolated-market-borrowing-single-collateral-single-loan-market-oracle-aware-borrowing",
  "title": "Oracle-Aware Borrowing",
  "level": "STRATEGY",
  "parent": "type-isolated-market-borrowing-single-collateral-single-loan-market"
 },
 {
  "id": "type-credit-delegation-undercollateralized-credit-credit-delegation",
  "title": "Credit Delegation",
  "level": "TYPE",
  "parent": "major-credit-delegation-undercollateralized-credit"
 },
 {
  "id": "type-credit-delegation-undercollateralized-credit-institutional-private-credit",
  "title": "Institutional Private Credit",
  "level": "TYPE",
  "parent": "major-credit-delegation-undercollateralized-credit"
 },
 {
  "id": "type-credit-delegation-undercollateralized-credit-permissioned-credit-facility",
  "title": "Permissioned Credit Facility",
  "level": "TYPE",
  "parent": "major-credit-delegation-undercollateralized-credit"
 },
 {
  "id": "type-credit-delegation-undercollateralized-credit-receivable-invoice-credit",
  "title": "Receivable/Invoice Credit",
  "level": "TYPE",
  "parent": "major-credit-delegation-undercollateralized-credit"
 },
 {
  "id": "type-credit-delegation-undercollateralized-credit-undercollateralized-credit",
  "title": "Undercollateralized Credit",
  "level": "TYPE",
  "parent": "major-credit-delegation-undercollateralized-credit"
 },
 {
  "id": "strategy-credit-delegation-undercollateralized-credit-undercollateralized-credit-borrower-credit-underwriting",
  "title": "Borrower-Credit Underwriting",
  "level": "STRATEGY",
  "parent": "type-credit-delegation-undercollateralized-credit-undercollateralized-credit"
 },
 {
  "id": "strategy-credit-delegation-undercollateralized-credit-undercollateralized-credit-credit-limit-allocation",
  "title": "Credit-Limit Allocation",
  "level": "STRATEGY",
  "parent": "type-credit-delegation-undercollateralized-credit-undercollateralized-credit"
 },
 {
  "id": "strategy-credit-delegation-undercollateralized-credit-credit-delegation-delegated-borrowing-power",
  "title": "Delegated Borrowing Power",
  "level": "STRATEGY",
  "parent": "type-credit-delegation-undercollateralized-credit-credit-delegation"
 },
 {
  "id": "strategy-credit-delegation-undercollateralized-credit-credit-delegation-delegated-credit-allocation",
  "title": "Delegated Credit Allocation",
  "level": "STRATEGY",
  "parent": "type-credit-delegation-undercollateralized-credit-credit-delegation"
 },
 {
  "id": "strategy-credit-delegation-undercollateralized-credit-permissioned-credit-facility-eligibility-gated-credit-participation",
  "title": "Eligibility-Gated Credit Participation",
  "level": "STRATEGY",
  "parent": "type-credit-delegation-undercollateralized-credit-permissioned-credit-facility"
 },
 {
  "id": "strategy-credit-delegation-undercollateralized-credit-institutional-private-credit-institutional-credit-allocation",
  "title": "Institutional Credit Allocation",
  "level": "STRATEGY",
  "parent": "type-credit-delegation-undercollateralized-credit-institutional-private-credit"
 },
 {
  "id": "strategy-credit-delegation-undercollateralized-credit-receivable-invoice-credit-invoice-finance-allocation",
  "title": "Invoice-Finance Allocation",
  "level": "STRATEGY",
  "parent": "type-credit-delegation-undercollateralized-credit-receivable-invoice-credit"
 },
 {
  "id": "strategy-credit-delegation-undercollateralized-credit-receivable-invoice-credit-receivable-backed-lending",
  "title": "Receivable-Backed Lending",
  "level": "STRATEGY",
  "parent": "type-credit-delegation-undercollateralized-credit-receivable-invoice-credit"
 },
 {
  "id": "type-atomic-flash-credit-atomic-debt-restructuring",
  "title": "Atomic Debt Restructuring",
  "level": "TYPE",
  "parent": "major-atomic-flash-credit"
 },
 {
  "id": "type-atomic-flash-credit-flash-mint",
  "title": "Flash Mint",
  "level": "TYPE",
  "parent": "major-atomic-flash-credit"
 },
 {
  "id": "type-atomic-flash-credit-flash-swap",
  "title": "Flash Swap",
  "level": "TYPE",
  "parent": "major-atomic-flash-credit"
 },
 {
  "id": "type-atomic-flash-credit-multi-asset-flash-loan",
  "title": "Multi-Asset Flash Loan",
  "level": "TYPE",
  "parent": "major-atomic-flash-credit"
 },
 {
  "id": "type-atomic-flash-credit-single-asset-flash-loan",
  "title": "Single-Asset Flash Loan",
  "level": "TYPE",
  "parent": "major-atomic-flash-credit"
 },
 {
  "id": "strategy-atomic-flash-credit-single-asset-flash-loan-atomic-arbitrage-financing",
  "title": "Atomic Arbitrage Financing",
  "level": "STRATEGY",
  "parent": "type-atomic-flash-credit-single-asset-flash-loan"
 },
 {
  "id": "strategy-atomic-flash-credit-single-asset-flash-loan-atomic-collateral-swap",
  "title": "Atomic Collateral Swap",
  "level": "STRATEGY",
  "parent": "type-atomic-flash-credit-single-asset-flash-loan"
 },
 {
  "id": "strategy-atomic-flash-credit-single-asset-flash-loan-atomic-debt-refinancing",
  "title": "Atomic Debt Refinancing",
  "level": "STRATEGY",
  "parent": "type-atomic-flash-credit-single-asset-flash-loan"
 },
 {
  "id": "strategy-atomic-flash-credit-single-asset-flash-loan-atomic-liquidation-financing",
  "title": "Atomic Liquidation Financing",
  "level": "STRATEGY",
  "parent": "type-atomic-flash-credit-single-asset-flash-loan"
 },
 {
  "id": "strategy-atomic-flash-credit-flash-mint-atomic-mint-burn-liquidity",
  "title": "Atomic Mint/Burn Liquidity",
  "level": "STRATEGY",
  "parent": "type-atomic-flash-credit-flash-mint"
 },
 {
  "id": "strategy-atomic-flash-credit-flash-swap-atomic-route-financing",
  "title": "Atomic Route Financing",
  "level": "STRATEGY",
  "parent": "type-atomic-flash-credit-flash-swap"
 },
 {
  "id": "strategy-atomic-flash-credit-atomic-debt-restructuring-collateral-migration",
  "title": "Collateral Migration",
  "level": "STRATEGY",
  "parent": "type-atomic-flash-credit-atomic-debt-restructuring"
 },
 {
  "id": "strategy-atomic-flash-credit-atomic-debt-restructuring-debt-position-migration",
  "title": "Debt Position Migration",
  "level": "STRATEGY",
  "parent": "type-atomic-flash-credit-atomic-debt-restructuring"
 },
 {
  "id": "strategy-atomic-flash-credit-flash-swap-dex-native-atomic-liquidity",
  "title": "DEX-Native Atomic Liquidity",
  "level": "STRATEGY",
  "parent": "type-atomic-flash-credit-flash-swap"
 },
 {
  "id": "strategy-atomic-flash-credit-flash-mint-flash-mint-debt-restructuring",
  "title": "Flash-Mint Debt Restructuring",
  "level": "STRATEGY",
  "parent": "type-atomic-flash-credit-flash-mint"
 },
 {
  "id": "type-leveraged-recursive-lending-automated-leverage-vault",
  "title": "Automated Leverage Vault",
  "level": "TYPE",
  "parent": "major-leveraged-recursive-lending"
 },
 {
  "id": "type-leveraged-recursive-lending-leveraged-yield-position",
  "title": "Leveraged Yield Position",
  "level": "TYPE",
  "parent": "major-leveraged-recursive-lending"
 },
 {
  "id": "type-leveraged-recursive-lending-lrt-loop",
  "title": "LRT Loop",
  "level": "TYPE",
  "parent": "major-leveraged-recursive-lending"
 },
 {
  "id": "type-leveraged-recursive-lending-lst-loop",
  "title": "LST Loop",
  "level": "TYPE",
  "parent": "major-leveraged-recursive-lending"
 },
 {
  "id": "type-leveraged-recursive-lending-stablecoin-leverage-loop",
  "title": "Stablecoin Leverage Loop",
  "level": "TYPE",
  "parent": "major-leveraged-recursive-lending"
 },
 {
  "id": "type-leveraged-recursive-lending-supply-borrow-loop",
  "title": "Supply-Borrow Loop",
  "level": "TYPE",
  "parent": "major-leveraged-recursive-lending"
 },
 {
  "id": "strategy-leveraged-recursive-lending-automated-leverage-vault-automated-deleveraging",
  "title": "Automated Deleveraging",
  "level": "STRATEGY",
  "parent": "type-leveraged-recursive-lending-automated-leverage-vault"
 },
 {
  "id": "strategy-leveraged-recursive-lending-automated-leverage-vault-automated-leverage-adjustment",
  "title": "Automated Leverage Adjustment",
  "level": "STRATEGY",
  "parent": "type-leveraged-recursive-lending-automated-leverage-vault"
 },
 {
  "id": "strategy-leveraged-recursive-lending-stablecoin-leverage-loop-correlated-stablecoin-looping",
  "title": "Correlated-Stablecoin Looping",
  "level": "STRATEGY",
  "parent": "type-leveraged-recursive-lending-stablecoin-leverage-loop"
 },
 {
  "id": "strategy-leveraged-recursive-lending-supply-borrow-loop-health-factor-aware-looping",
  "title": "Health-Factor-Aware Looping",
  "level": "STRATEGY",
  "parent": "type-leveraged-recursive-lending-supply-borrow-loop"
 },
 {
  "id": "strategy-leveraged-recursive-lending-leveraged-yield-position-leveraged-lending",
  "title": "Leveraged Lending",
  "level": "STRATEGY",
  "parent": "type-leveraged-recursive-lending-leveraged-yield-position"
 },
 {
  "id": "strategy-leveraged-recursive-lending-leveraged-yield-position-leveraged-staking",
  "title": "Leveraged Staking",
  "level": "STRATEGY",
  "parent": "type-leveraged-recursive-lending-leveraged-yield-position"
 },
 {
  "id": "strategy-leveraged-recursive-lending-lrt-loop-lrt-collateral-looping",
  "title": "LRT Collateral Looping",
  "level": "STRATEGY",
  "parent": "type-leveraged-recursive-lending-lrt-loop"
 },
 {
  "id": "strategy-leveraged-recursive-lending-lst-loop-lst-collateral-looping",
  "title": "LST Collateral Looping",
  "level": "STRATEGY",
  "parent": "type-leveraged-recursive-lending-lst-loop"
 },
 {
  "id": "strategy-leveraged-recursive-lending-supply-borrow-loop-recursive-supply-borrow",
  "title": "Recursive Supply/Borrow",
  "level": "STRATEGY",
  "parent": "type-leveraged-recursive-lending-supply-borrow-loop"
 },
 {
  "id": "strategy-leveraged-recursive-lending-supply-borrow-loop-target-leverage-looping",
  "title": "Target-Leverage Looping",
  "level": "STRATEGY",
  "parent": "type-leveraged-recursive-lending-supply-borrow-loop"
 },
 {
  "id": "type-liquidations-auction-based-liquidation",
  "title": "Auction-Based Liquidation",
  "level": "TYPE",
  "parent": "major-liquidations"
 },
 {
  "id": "type-liquidations-collateral-liquidation",
  "title": "Collateral Liquidation",
  "level": "TYPE",
  "parent": "major-liquidations"
 },
 {
  "id": "type-liquidations-flash-funded-liquidation",
  "title": "Flash-Funded Liquidation",
  "level": "TYPE",
  "parent": "major-liquidations"
 },
 {
  "id": "type-liquidations-full-liquidation",
  "title": "Full Liquidation",
  "level": "TYPE",
  "parent": "major-liquidations"
 },
 {
  "id": "type-liquidations-partial-liquidation",
  "title": "Partial Liquidation",
  "level": "TYPE",
  "parent": "major-liquidations"
 },
 {
  "id": "strategy-liquidations-collateral-liquidation-collateral-discount-evaluation",
  "title": "Collateral-Discount Evaluation",
  "level": "STRATEGY",
  "parent": "type-liquidations-collateral-liquidation"
 },
 {
  "id": "strategy-liquidations-collateral-liquidation-cost-aware-liquidation",
  "title": "Cost-Aware Liquidation",
  "level": "STRATEGY",
  "parent": "type-liquidations-collateral-liquidation"
 },
 {
  "id": "strategy-liquidations-flash-funded-liquidation-flash-liquidity-funded-liquidation",
  "title": "Flash-Liquidity-Funded Liquidation",
  "level": "STRATEGY",
  "parent": "type-liquidations-flash-funded-liquidation"
 },
 {
  "id": "strategy-liquidations-collateral-liquidation-health-factor-monitoring",
  "title": "Health-Factor Monitoring",
  "level": "STRATEGY",
  "parent": "type-liquidations-collateral-liquidation"
 },
 {
  "id": "strategy-liquidations-collateral-liquidation-liquidation-monitoring",
  "title": "Liquidation Monitoring",
  "level": "STRATEGY",
  "parent": "type-liquidations-collateral-liquidation"
 },
 {
  "id": "strategy-liquidations-collateral-liquidation-liquidation-route-optimization",
  "title": "Liquidation Route Optimization",
  "level": "STRATEGY",
  "parent": "type-liquidations-collateral-liquidation"
 },
 {
  "id": "type-automated-strategy-vaults-asynchronous-vault",
  "title": "Asynchronous Vault",
  "level": "TYPE",
  "parent": "major-automated-strategy-vaults"
 },
 {
  "id": "type-automated-strategy-vaults-auto-compound-vault",
  "title": "Auto-Compound Vault",
  "level": "TYPE",
  "parent": "major-automated-strategy-vaults"
 },
 {
  "id": "type-automated-strategy-vaults-cross-chain-strategy-vault",
  "title": "Cross-Chain Strategy Vault",
  "level": "TYPE",
  "parent": "major-automated-strategy-vaults"
 },
 {
  "id": "type-automated-strategy-vaults-leveraged-strategy-vault",
  "title": "Leveraged Strategy Vault",
  "level": "TYPE",
  "parent": "major-automated-strategy-vaults"
 },
 {
  "id": "type-automated-strategy-vaults-managed-allocation-vault",
  "title": "Managed Allocation Vault",
  "level": "TYPE",
  "parent": "major-automated-strategy-vaults"
 },
 {
  "id": "type-automated-strategy-vaults-managed-multi-strategy-vault",
  "title": "Managed Multi-Strategy Vault",
  "level": "TYPE",
  "parent": "major-automated-strategy-vaults"
 },
 {
  "id": "type-automated-strategy-vaults-single-strategy-vault",
  "title": "Single-Strategy Vault",
  "level": "TYPE",
  "parent": "major-automated-strategy-vaults"
 },
 {
  "id": "type-automated-strategy-vaults-tokenized-yield-vault",
  "title": "Tokenized Yield Vault",
  "level": "TYPE",
  "parent": "major-automated-strategy-vaults"
 },
 {
  "id": "strategy-automated-strategy-vaults-managed-allocation-vault-allocation-rebalancing",
  "title": "Allocation Rebalancing",
  "level": "STRATEGY",
  "parent": "type-automated-strategy-vaults-managed-allocation-vault"
 },
 {
  "id": "strategy-automated-strategy-vaults-asynchronous-vault-async-deposit-redemption-management",
  "title": "Async Deposit/Redemption Management",
  "level": "STRATEGY",
  "parent": "type-automated-strategy-vaults-asynchronous-vault"
 },
 {
  "id": "strategy-automated-strategy-vaults-asynchronous-vault-delayed-settlement-position",
  "title": "Delayed-Settlement Position",
  "level": "STRATEGY",
  "parent": "type-automated-strategy-vaults-asynchronous-vault"
 },
 {
  "id": "strategy-automated-strategy-vaults-managed-allocation-vault-manager-curator-allocation",
  "title": "Manager/Curator Allocation",
  "level": "STRATEGY",
  "parent": "type-automated-strategy-vaults-managed-allocation-vault"
 },
 {
  "id": "strategy-automated-strategy-vaults-managed-multi-strategy-vault-strategy-allocation",
  "title": "Strategy Allocation",
  "level": "STRATEGY",
  "parent": "type-automated-strategy-vaults-managed-multi-strategy-vault"
 },
 {
  "id": "strategy-automated-strategy-vaults-tokenized-yield-vault-vault-wrapper-routing",
  "title": "Vault Wrapper Routing",
  "level": "STRATEGY",
  "parent": "type-automated-strategy-vaults-tokenized-yield-vault"
 },
 {
  "id": "strategy-automated-strategy-vaults-tokenized-yield-vault-vault-share-holding",
  "title": "Vault-Share Holding",
  "level": "STRATEGY",
  "parent": "type-automated-strategy-vaults-tokenized-yield-vault"
 },
 {
  "id": "type-structured-product-vaults-basis-trading-vault",
  "title": "Basis-Trading Vault",
  "level": "TYPE",
  "parent": "major-structured-product-vaults"
 },
 {
  "id": "type-structured-product-vaults-credit-tranche-vault",
  "title": "Credit-Tranche Vault",
  "level": "TYPE",
  "parent": "major-structured-product-vaults"
 },
 {
  "id": "type-structured-product-vaults-delta-neutral-vault",
  "title": "Delta-Neutral Vault",
  "level": "TYPE",
  "parent": "major-structured-product-vaults"
 },
 {
  "id": "type-structured-product-vaults-fixed-income-vault",
  "title": "Fixed-Income Vault",
  "level": "TYPE",
  "parent": "major-structured-product-vaults"
 },
 {
  "id": "type-structured-product-vaults-institutional-rwa-structured-vault",
  "title": "Institutional/RWA Structured Vault",
  "level": "TYPE",
  "parent": "major-structured-product-vaults"
 },
 {
  "id": "type-structured-product-vaults-options-vault",
  "title": "Options Vault",
  "level": "TYPE",
  "parent": "major-structured-product-vaults"
 },
 {
  "id": "type-structured-product-vaults-principal-protected-buffered-structure",
  "title": "Principal-Protected/Buffered Structure",
  "level": "TYPE",
  "parent": "major-structured-product-vaults"
 },
 {
  "id": "strategy-structured-product-vaults-basis-trading-vault-basis-capture-strategy",
  "title": "Basis-Capture Strategy",
  "level": "STRATEGY",
  "parent": "type-structured-product-vaults-basis-trading-vault"
 },
 {
  "id": "strategy-structured-product-vaults-options-vault-covered-call-strategy",
  "title": "Covered-Call Strategy",
  "level": "STRATEGY",
  "parent": "type-structured-product-vaults-options-vault"
 },
 {
  "id": "strategy-structured-product-vaults-delta-neutral-vault-delta-hedged-yield-strategy",
  "title": "Delta-Hedged Yield Strategy",
  "level": "STRATEGY",
  "parent": "type-structured-product-vaults-delta-neutral-vault"
 },
 {
  "id": "strategy-structured-product-vaults-credit-tranche-vault-dynamic-tranche-reallocation",
  "title": "Dynamic Tranche Reallocation",
  "level": "STRATEGY",
  "parent": "type-structured-product-vaults-credit-tranche-vault"
 },
 {
  "id": "strategy-structured-product-vaults-fixed-income-vault-fixed-variable-rate-allocation",
  "title": "Fixed/Variable Rate Allocation",
  "level": "STRATEGY",
  "parent": "type-structured-product-vaults-fixed-income-vault"
 },
 {
  "id": "strategy-structured-product-vaults-basis-trading-vault-funding-basis-hedging",
  "title": "Funding/Basis Hedging",
  "level": "STRATEGY",
  "parent": "type-structured-product-vaults-basis-trading-vault"
 },
 {
  "id": "strategy-structured-product-vaults-credit-tranche-vault-junior-tranche-allocation",
  "title": "Junior-Tranche Allocation",
  "level": "STRATEGY",
  "parent": "type-structured-product-vaults-credit-tranche-vault"
 },
 {
  "id": "strategy-structured-product-vaults-fixed-income-vault-maturity-ladder-allocation",
  "title": "Maturity-Ladder Allocation",
  "level": "STRATEGY",
  "parent": "type-structured-product-vaults-fixed-income-vault"
 },
 {
  "id": "strategy-structured-product-vaults-institutional-rwa-structured-vault-permissioned-strategy-allocation",
  "title": "Permissioned Strategy Allocation",
  "level": "STRATEGY",
  "parent": "type-structured-product-vaults-institutional-rwa-structured-vault"
 },
 {
  "id": "strategy-structured-product-vaults-options-vault-put-writing-strategy",
  "title": "Put-Writing Strategy",
  "level": "STRATEGY",
  "parent": "type-structured-product-vaults-options-vault"
 },
 {
  "id": "strategy-structured-product-vaults-institutional-rwa-structured-vault-rwa-income-allocation",
  "title": "RWA Income Allocation",
  "level": "STRATEGY",
  "parent": "type-structured-product-vaults-institutional-rwa-structured-vault"
 },
 {
  "id": "strategy-structured-product-vaults-credit-tranche-vault-senior-tranche-allocation",
  "title": "Senior-Tranche Allocation",
  "level": "STRATEGY",
  "parent": "type-structured-product-vaults-credit-tranche-vault"
 },
 {
  "id": "type-yield-tokenization-maturity-based-yield-position",
  "title": "Maturity-Based Yield Position",
  "level": "TYPE",
  "parent": "major-yield-tokenization"
 },
 {
  "id": "type-yield-tokenization-principal-token",
  "title": "Principal Token",
  "level": "TYPE",
  "parent": "major-yield-tokenization"
 },
 {
  "id": "type-yield-tokenization-standardized-yield-position",
  "title": "Standardized Yield Position",
  "level": "TYPE",
  "parent": "major-yield-tokenization"
 },
 {
  "id": "type-yield-tokenization-yield-token",
  "title": "Yield Token",
  "level": "TYPE",
  "parent": "major-yield-tokenization"
 },
 {
  "id": "strategy-yield-tokenization-yield-token-long-yield-exposure",
  "title": "Long Yield Exposure",
  "level": "STRATEGY",
  "parent": "type-yield-tokenization-yield-token"
 },
 {
  "id": "strategy-yield-tokenization-maturity-based-yield-position-maturity-selection",
  "title": "Maturity Selection",
  "level": "STRATEGY",
  "parent": "type-yield-tokenization-maturity-based-yield-position"
 },
 {
  "id": "strategy-yield-tokenization-maturity-based-yield-position-principal-yield-split",
  "title": "Principal/Yield Split",
  "level": "STRATEGY",
  "parent": "type-yield-tokenization-maturity-based-yield-position"
 },
 {
  "id": "strategy-yield-tokenization-principal-token-pt-collateral-deployment",
  "title": "PT Collateral Deployment",
  "level": "STRATEGY",
  "parent": "type-yield-tokenization-principal-token"
 },
 {
  "id": "strategy-yield-tokenization-principal-token-pt-discount-acquisition",
  "title": "PT Discount Acquisition",
  "level": "STRATEGY",
  "parent": "type-yield-tokenization-principal-token"
 },
 {
  "id": "strategy-yield-tokenization-principal-token-pt-hold-to-maturity",
  "title": "PT Hold-to-Maturity",
  "level": "STRATEGY",
  "parent": "type-yield-tokenization-principal-token"
 },
 {
  "id": "strategy-yield-tokenization-yield-token-yield-points-exposure",
  "title": "Yield/Points Exposure",
  "level": "STRATEGY",
  "parent": "type-yield-tokenization-yield-token"
 },
 {
  "id": "type-yield-fixed-rate-trading-fixed-rate-position",
  "title": "Fixed-Rate Position",
  "level": "TYPE",
  "parent": "major-yield-fixed-rate-trading"
 },
 {
  "id": "type-yield-fixed-rate-trading-principal-token-trading",
  "title": "Principal-Token Trading",
  "level": "TYPE",
  "parent": "major-yield-fixed-rate-trading"
 },
 {
  "id": "type-yield-fixed-rate-trading-variable-yield-position",
  "title": "Variable-Yield Position",
  "level": "TYPE",
  "parent": "major-yield-fixed-rate-trading"
 },
 {
  "id": "type-yield-fixed-rate-trading-yield-hedge-position",
  "title": "Yield Hedge Position",
  "level": "TYPE",
  "parent": "major-yield-fixed-rate-trading"
 },
 {
  "id": "type-yield-fixed-rate-trading-yield-rate-market",
  "title": "Yield-Rate Market",
  "level": "TYPE",
  "parent": "major-yield-fixed-rate-trading"
 },
 {
  "id": "type-yield-fixed-rate-trading-yield-token-trading",
  "title": "Yield-Token Trading",
  "level": "TYPE",
  "parent": "major-yield-fixed-rate-trading"
 },
 {
  "id": "strategy-yield-fixed-rate-trading-fixed-rate-position-fixed-rate-lock-strategy",
  "title": "Fixed-Rate Lock Strategy",
  "level": "STRATEGY",
  "parent": "type-yield-fixed-rate-trading-fixed-rate-position"
 },
 {
  "id": "strategy-yield-fixed-rate-trading-principal-token-trading-fixed-rate-positioning",
  "title": "Fixed-Rate Positioning",
  "level": "STRATEGY",
  "parent": "type-yield-fixed-rate-trading-principal-token-trading"
 },
 {
  "id": "strategy-yield-fixed-rate-trading-yield-rate-market-fixed-vs-variable-yield-rotation",
  "title": "Fixed-vs-Variable Yield Rotation",
  "level": "STRATEGY",
  "parent": "type-yield-fixed-rate-trading-yield-rate-market"
 },
 {
  "id": "strategy-yield-fixed-rate-trading-yield-token-trading-long-yield-strategy",
  "title": "Long-Yield Strategy",
  "level": "STRATEGY",
  "parent": "type-yield-fixed-rate-trading-yield-token-trading"
 },
 {
  "id": "strategy-yield-fixed-rate-trading-principal-token-trading-maturity-roll-strategy",
  "title": "Maturity-Roll Strategy",
  "level": "STRATEGY",
  "parent": "type-yield-fixed-rate-trading-principal-token-trading"
 },
 {
  "id": "strategy-yield-fixed-rate-trading-principal-token-trading-pt-discount-trading",
  "title": "PT Discount Trading",
  "level": "STRATEGY",
  "parent": "type-yield-fixed-rate-trading-principal-token-trading"
 },
 {
  "id": "strategy-yield-fixed-rate-trading-yield-hedge-position-rate-hedging-strategy",
  "title": "Rate-Hedging Strategy",
  "level": "STRATEGY",
  "parent": "type-yield-fixed-rate-trading-yield-hedge-position"
 },
 {
  "id": "strategy-yield-fixed-rate-trading-variable-yield-position-variable-yield-exposure",
  "title": "Variable-Yield Exposure",
  "level": "STRATEGY",
  "parent": "type-yield-fixed-rate-trading-variable-yield-position"
 },
 {
  "id": "strategy-yield-fixed-rate-trading-yield-hedge-position-yield-hedging-strategy",
  "title": "Yield-Hedging Strategy",
  "level": "STRATEGY",
  "parent": "type-yield-fixed-rate-trading-yield-hedge-position"
 },
 {
  "id": "strategy-yield-fixed-rate-trading-yield-token-trading-yield-volatility-positioning",
  "title": "Yield-Volatility Positioning",
  "level": "STRATEGY",
  "parent": "type-yield-fixed-rate-trading-yield-token-trading"
 },
 {
  "id": "type-spot-trading-aggregated-spot-trade",
  "title": "Aggregated Spot Trade",
  "level": "TYPE",
  "parent": "major-spot-trading"
 },
 {
  "id": "type-spot-trading-direct-pool-spot-trade",
  "title": "Direct-Pool Spot Trade",
  "level": "TYPE",
  "parent": "major-spot-trading"
 },
 {
  "id": "type-spot-trading-limit-conditional-spot-trade",
  "title": "Limit/Conditional Spot Trade",
  "level": "TYPE",
  "parent": "major-spot-trading"
 },
 {
  "id": "type-spot-trading-scheduled-time-distributed-spot-trade",
  "title": "Scheduled/Time-Distributed Spot Trade",
  "level": "TYPE",
  "parent": "major-spot-trading"
 },
 {
  "id": "strategy-spot-trading-direct-pool-spot-trade-breakout-trading",
  "title": "Breakout Trading",
  "level": "STRATEGY",
  "parent": "type-spot-trading-direct-pool-spot-trade"
 },
 {
  "id": "strategy-spot-trading-aggregated-spot-trade-cost-aware-spot-execution",
  "title": "Cost-Aware Spot Execution",
  "level": "STRATEGY",
  "parent": "type-spot-trading-aggregated-spot-trade"
 },
 {
  "id": "strategy-spot-trading-scheduled-time-distributed-spot-trade-dca-execution",
  "title": "DCA Execution",
  "level": "STRATEGY",
  "parent": "type-spot-trading-scheduled-time-distributed-spot-trade"
 },
 {
  "id": "strategy-spot-trading-limit-conditional-spot-trade-limit-price-execution",
  "title": "Limit-Price Execution",
  "level": "STRATEGY",
  "parent": "type-spot-trading-limit-conditional-spot-trade"
 },
 {
  "id": "strategy-spot-trading-direct-pool-spot-trade-mean-reversion-trading",
  "title": "Mean-Reversion Trading",
  "level": "STRATEGY",
  "parent": "type-spot-trading-direct-pool-spot-trade"
 },
 {
  "id": "strategy-spot-trading-direct-pool-spot-trade-momentum-trading",
  "title": "Momentum Trading",
  "level": "STRATEGY",
  "parent": "type-spot-trading-direct-pool-spot-trade"
 },
 {
  "id": "strategy-spot-trading-direct-pool-spot-trade-range-trading",
  "title": "Range Trading",
  "level": "STRATEGY",
  "parent": "type-spot-trading-direct-pool-spot-trade"
 },
 {
  "id": "strategy-spot-trading-direct-pool-spot-trade-scalping",
  "title": "Scalping",
  "level": "STRATEGY",
  "parent": "type-spot-trading-direct-pool-spot-trade"
 },
 {
  "id": "strategy-spot-trading-direct-pool-spot-trade-slippage-aware-spot-execution",
  "title": "Slippage-Aware Spot Execution",
  "level": "STRATEGY",
  "parent": "type-spot-trading-direct-pool-spot-trade"
 },
 {
  "id": "strategy-spot-trading-direct-pool-spot-trade-swing-trading",
  "title": "Swing Trading",
  "level": "STRATEGY",
  "parent": "type-spot-trading-direct-pool-spot-trade"
 },
 {
  "id": "strategy-spot-trading-direct-pool-spot-trade-trend-following",
  "title": "Trend Following",
  "level": "STRATEGY",
  "parent": "type-spot-trading-direct-pool-spot-trade"
 },
 {
  "id": "strategy-spot-trading-scheduled-time-distributed-spot-trade-twap-execution",
  "title": "TWAP Execution",
  "level": "STRATEGY",
  "parent": "type-spot-trading-scheduled-time-distributed-spot-trade"
 },
 {
  "id": "type-algorithmic-strategy-trading-agent-assisted-trading",
  "title": "Agent-Assisted Trading",
  "level": "TYPE",
  "parent": "major-algorithmic-strategy-trading"
 },
 {
  "id": "type-algorithmic-strategy-trading-automated-execution",
  "title": "Automated Execution",
  "level": "TYPE",
  "parent": "major-algorithmic-strategy-trading"
 },
 {
  "id": "type-algorithmic-strategy-trading-conditional-trading",
  "title": "Conditional Trading",
  "level": "TYPE",
  "parent": "major-algorithmic-strategy-trading"
 },
 {
  "id": "type-algorithmic-strategy-trading-portfolio-rebalancing-automation",
  "title": "Portfolio Rebalancing Automation",
  "level": "TYPE",
  "parent": "major-algorithmic-strategy-trading"
 },
 {
  "id": "type-algorithmic-strategy-trading-rule-based-trading",
  "title": "Rule-Based Trading",
  "level": "TYPE",
  "parent": "major-algorithmic-strategy-trading"
 },
 {
  "id": "type-algorithmic-strategy-trading-scheduled-trading",
  "title": "Scheduled Trading",
  "level": "TYPE",
  "parent": "major-algorithmic-strategy-trading"
 },
 {
  "id": "type-algorithmic-strategy-trading-signal-based-trading",
  "title": "Signal-Based Trading",
  "level": "TYPE",
  "parent": "major-algorithmic-strategy-trading"
 },
 {
  "id": "strategy-algorithmic-strategy-trading-conditional-trading-conditional-execution",
  "title": "Conditional Execution",
  "level": "STRATEGY",
  "parent": "type-algorithmic-strategy-trading-conditional-trading"
 },
 {
  "id": "strategy-algorithmic-strategy-trading-automated-execution-cost-aware-execution",
  "title": "Cost-Aware Execution",
  "level": "STRATEGY",
  "parent": "type-algorithmic-strategy-trading-automated-execution"
 },
 {
  "id": "strategy-algorithmic-strategy-trading-scheduled-trading-dca-strategy",
  "title": "DCA Strategy",
  "level": "STRATEGY",
  "parent": "type-algorithmic-strategy-trading-scheduled-trading"
 },
 {
  "id": "strategy-algorithmic-strategy-trading-automated-execution-laddered-execution",
  "title": "Laddered Execution",
  "level": "STRATEGY",
  "parent": "type-algorithmic-strategy-trading-automated-execution"
 },
 {
  "id": "strategy-algorithmic-strategy-trading-rule-based-trading-mean-reversion-algorithm",
  "title": "Mean-Reversion Algorithm",
  "level": "STRATEGY",
  "parent": "type-algorithmic-strategy-trading-rule-based-trading"
 },
 {
  "id": "strategy-algorithmic-strategy-trading-rule-based-trading-momentum-algorithm",
  "title": "Momentum Algorithm",
  "level": "STRATEGY",
  "parent": "type-algorithmic-strategy-trading-rule-based-trading"
 },
 {
  "id": "strategy-algorithmic-strategy-trading-agent-assisted-trading-risk-bounded-execution",
  "title": "Risk-Bounded Execution",
  "level": "STRATEGY",
  "parent": "type-algorithmic-strategy-trading-agent-assisted-trading"
 },
 {
  "id": "strategy-algorithmic-strategy-trading-signal-based-trading-signal-triggered-strategy",
  "title": "Signal-Triggered Strategy",
  "level": "STRATEGY",
  "parent": "type-algorithmic-strategy-trading-signal-based-trading"
 },
 {
  "id": "strategy-algorithmic-strategy-trading-portfolio-rebalancing-automation-target-allocation-rebalancing",
  "title": "Target-Allocation Rebalancing",
  "level": "STRATEGY",
  "parent": "type-algorithmic-strategy-trading-portfolio-rebalancing-automation"
 },
 {
  "id": "strategy-algorithmic-strategy-trading-rule-based-trading-trend-following-algorithm",
  "title": "Trend-Following Algorithm",
  "level": "STRATEGY",
  "parent": "type-algorithmic-strategy-trading-rule-based-trading"
 },
 {
  "id": "strategy-algorithmic-strategy-trading-scheduled-trading-twap-strategy",
  "title": "TWAP Strategy",
  "level": "STRATEGY",
  "parent": "type-algorithmic-strategy-trading-scheduled-trading"
 },
 {
  "id": "strategy-algorithmic-strategy-trading-signal-based-trading-volatility-responsive-strategy",
  "title": "Volatility-Responsive Strategy",
  "level": "STRATEGY",
  "parent": "type-algorithmic-strategy-trading-signal-based-trading"
 },
 {
  "id": "type-decentralized-market-making-amm-market-making",
  "title": "AMM Market Making",
  "level": "TYPE",
  "parent": "major-decentralized-market-making"
 },
 {
  "id": "type-decentralized-market-making-automated-market-making",
  "title": "Automated Market Making",
  "level": "TYPE",
  "parent": "major-decentralized-market-making"
 },
 {
  "id": "type-decentralized-market-making-concentrated-market-making",
  "title": "Concentrated Market Making",
  "level": "TYPE",
  "parent": "major-decentralized-market-making"
 },
 {
  "id": "type-decentralized-market-making-intent-solver-market-making",
  "title": "Intent/Solver Market Making",
  "level": "TYPE",
  "parent": "major-decentralized-market-making"
 },
 {
  "id": "type-decentralized-market-making-inventory-based-market-making",
  "title": "Inventory-Based Market Making",
  "level": "TYPE",
  "parent": "major-decentralized-market-making"
 },
 {
  "id": "type-decentralized-market-making-rfq-quote-based-market-making",
  "title": "RFQ/Quote-Based Market Making",
  "level": "TYPE",
  "parent": "major-decentralized-market-making"
 },
 {
  "id": "strategy-decentralized-market-making-automated-market-making-cost-aware-market-making",
  "title": "Cost-Aware Market Making",
  "level": "STRATEGY",
  "parent": "type-decentralized-market-making-automated-market-making"
 },
 {
  "id": "strategy-decentralized-market-making-inventory-based-market-making-inventory-rebalancing",
  "title": "Inventory Rebalancing",
  "level": "STRATEGY",
  "parent": "type-decentralized-market-making-inventory-based-market-making"
 },
 {
  "id": "strategy-decentralized-market-making-intent-solver-market-making-inventory-based-solver-filling",
  "title": "Inventory-Based Solver Filling",
  "level": "STRATEGY",
  "parent": "type-decentralized-market-making-intent-solver-market-making"
 },
 {
  "id": "strategy-decentralized-market-making-inventory-based-market-making-inventory-risk-management",
  "title": "Inventory-Risk Management",
  "level": "STRATEGY",
  "parent": "type-decentralized-market-making-inventory-based-market-making"
 },
 {
  "id": "strategy-decentralized-market-making-rfq-quote-based-market-making-liquidity-aware-quoting",
  "title": "Liquidity-Aware Quoting",
  "level": "STRATEGY",
  "parent": "type-decentralized-market-making-rfq-quote-based-market-making"
 },
 {
  "id": "strategy-decentralized-market-making-rfq-quote-based-market-making-spread-management",
  "title": "Spread Management",
  "level": "STRATEGY",
  "parent": "type-decentralized-market-making-rfq-quote-based-market-making"
 },
 {
  "id": "strategy-decentralized-market-making-amm-market-making-two-sided-market-making",
  "title": "Two-Sided Market Making",
  "level": "STRATEGY",
  "parent": "type-decentralized-market-making-amm-market-making"
 },
 {
  "id": "strategy-decentralized-market-making-concentrated-market-making-volatility-adaptive-quoting",
  "title": "Volatility-Adaptive Quoting",
  "level": "STRATEGY",
  "parent": "type-decentralized-market-making-concentrated-market-making"
 },
 {
  "id": "type-token-swapping-cross-protocol-swap",
  "title": "Cross-Protocol Swap",
  "level": "TYPE",
  "parent": "major-token-swapping"
 },
 {
  "id": "type-token-swapping-direct-pool-swap",
  "title": "Direct-Pool Swap",
  "level": "TYPE",
  "parent": "major-token-swapping"
 },
 {
  "id": "type-token-swapping-exact-input-swap",
  "title": "Exact-Input Swap",
  "level": "TYPE",
  "parent": "major-token-swapping"
 },
 {
  "id": "type-token-swapping-exact-output-swap",
  "title": "Exact-Output Swap",
  "level": "TYPE",
  "parent": "major-token-swapping"
 },
 {
  "id": "type-token-swapping-multi-hop-swap",
  "title": "Multi-Hop Swap",
  "level": "TYPE",
  "parent": "major-token-swapping"
 },
 {
  "id": "type-token-swapping-split-route-swap",
  "title": "Split-Route Swap",
  "level": "TYPE",
  "parent": "major-token-swapping"
 },
 {
  "id": "type-token-swapping-stable-correlated-asset-swap",
  "title": "Stable/Correlated-Asset Swap",
  "level": "TYPE",
  "parent": "major-token-swapping"
 },
 {
  "id": "strategy-token-swapping-cross-protocol-swap-cost-aware-swap",
  "title": "Cost-Aware Swap",
  "level": "STRATEGY",
  "parent": "type-token-swapping-cross-protocol-swap"
 },
 {
  "id": "strategy-token-swapping-direct-pool-swap-direct-route-execution",
  "title": "Direct-Route Execution",
  "level": "STRATEGY",
  "parent": "type-token-swapping-direct-pool-swap"
 },
 {
  "id": "strategy-token-swapping-multi-hop-swap-multi-hop-execution",
  "title": "Multi-Hop Execution",
  "level": "STRATEGY",
  "parent": "type-token-swapping-multi-hop-swap"
 },
 {
  "id": "strategy-token-swapping-exact-input-swap-price-impact-aware-swap",
  "title": "Price-Impact-Aware Swap",
  "level": "STRATEGY",
  "parent": "type-token-swapping-exact-input-swap"
 },
 {
  "id": "strategy-token-swapping-exact-output-swap-slippage-constrained-swap",
  "title": "Slippage-Constrained Swap",
  "level": "STRATEGY",
  "parent": "type-token-swapping-exact-output-swap"
 },
 {
  "id": "strategy-token-swapping-split-route-swap-split-route-execution",
  "title": "Split-Route Execution",
  "level": "STRATEGY",
  "parent": "type-token-swapping-split-route-swap"
 },
 {
  "id": "strategy-token-swapping-stable-correlated-asset-swap-stable-route-swap",
  "title": "Stable-Route Swap",
  "level": "STRATEGY",
  "parent": "type-token-swapping-stable-correlated-asset-swap"
 },
 {
  "id": "type-swap-aggregation-route-optimization-cost-aware-router",
  "title": "Cost-Aware Router",
  "level": "TYPE",
  "parent": "major-swap-aggregation-route-optimization"
 },
 {
  "id": "type-swap-aggregation-route-optimization-dex-aggregator",
  "title": "DEX Aggregator",
  "level": "TYPE",
  "parent": "major-swap-aggregation-route-optimization"
 },
 {
  "id": "type-swap-aggregation-route-optimization-multi-protocol-router",
  "title": "Multi-Protocol Router",
  "level": "TYPE",
  "parent": "major-swap-aggregation-route-optimization"
 },
 {
  "id": "type-swap-aggregation-route-optimization-pathfinding-router",
  "title": "Pathfinding Router",
  "level": "TYPE",
  "parent": "major-swap-aggregation-route-optimization"
 },
 {
  "id": "type-swap-aggregation-route-optimization-smart-order-router",
  "title": "Smart Order Router",
  "level": "TYPE",
  "parent": "major-swap-aggregation-route-optimization"
 },
 {
  "id": "type-swap-aggregation-route-optimization-split-route-optimizer",
  "title": "Split-Route Optimizer",
  "level": "TYPE",
  "parent": "major-swap-aggregation-route-optimization"
 },
 {
  "id": "strategy-swap-aggregation-route-optimization-smart-order-router-best-output-routing",
  "title": "Best-Output Routing",
  "level": "STRATEGY",
  "parent": "type-swap-aggregation-route-optimization-smart-order-router"
 },
 {
  "id": "strategy-swap-aggregation-route-optimization-dex-aggregator-fallback-routing",
  "title": "Fallback Routing",
  "level": "STRATEGY",
  "parent": "type-swap-aggregation-route-optimization-dex-aggregator"
 },
 {
  "id": "strategy-swap-aggregation-route-optimization-dex-aggregator-liquidity-depth-routing",
  "title": "Liquidity-Depth Routing",
  "level": "STRATEGY",
  "parent": "type-swap-aggregation-route-optimization-dex-aggregator"
 },
 {
  "id": "strategy-swap-aggregation-route-optimization-pathfinding-router-multi-hop-pathfinding",
  "title": "Multi-Hop Pathfinding",
  "level": "STRATEGY",
  "parent": "type-swap-aggregation-route-optimization-pathfinding-router"
 },
 {
  "id": "strategy-swap-aggregation-route-optimization-cost-aware-router-network-cost-aware-routing",
  "title": "Network-Cost-Aware Routing",
  "level": "STRATEGY",
  "parent": "type-swap-aggregation-route-optimization-cost-aware-router"
 },
 {
  "id": "strategy-swap-aggregation-route-optimization-multi-protocol-router-route-re-quote",
  "title": "Route Re-Quote",
  "level": "STRATEGY",
  "parent": "type-swap-aggregation-route-optimization-multi-protocol-router"
 },
 {
  "id": "strategy-swap-aggregation-route-optimization-smart-order-router-simulation-validated-routing",
  "title": "Simulation-Validated Routing",
  "level": "STRATEGY",
  "parent": "type-swap-aggregation-route-optimization-smart-order-router"
 },
 {
  "id": "strategy-swap-aggregation-route-optimization-smart-order-router-slippage-aware-routing",
  "title": "Slippage-Aware Routing",
  "level": "STRATEGY",
  "parent": "type-swap-aggregation-route-optimization-smart-order-router"
 },
 {
  "id": "strategy-swap-aggregation-route-optimization-split-route-optimizer-split-path-routing",
  "title": "Split-Path Routing",
  "level": "STRATEGY",
  "parent": "type-swap-aggregation-route-optimization-split-route-optimizer"
 },
 {
  "id": "type-intent-based-execution-batch-auction-intent",
  "title": "Batch-Auction Intent",
  "level": "TYPE",
  "parent": "major-intent-based-execution"
 },
 {
  "id": "type-intent-based-execution-cross-chain-intent",
  "title": "Cross-Chain Intent",
  "level": "TYPE",
  "parent": "major-intent-based-execution"
 },
 {
  "id": "type-intent-based-execution-filler-based-execution",
  "title": "Filler-Based Execution",
  "level": "TYPE",
  "parent": "major-intent-based-execution"
 },
 {
  "id": "type-intent-based-execution-intent-aggregation",
  "title": "Intent Aggregation",
  "level": "TYPE",
  "parent": "major-intent-based-execution"
 },
 {
  "id": "type-intent-based-execution-signed-trade-intent",
  "title": "Signed Trade Intent",
  "level": "TYPE",
  "parent": "major-intent-based-execution"
 },
 {
  "id": "type-intent-based-execution-solver-auction",
  "title": "Solver Auction",
  "level": "TYPE",
  "parent": "major-intent-based-execution"
 },
 {
  "id": "strategy-intent-based-execution-batch-auction-intent-batch-settlement",
  "title": "Batch Settlement",
  "level": "STRATEGY",
  "parent": "type-intent-based-execution-batch-auction-intent"
 },
 {
  "id": "strategy-intent-based-execution-solver-auction-best-execution-bidding",
  "title": "Best-Execution Bidding",
  "level": "STRATEGY",
  "parent": "type-intent-based-execution-solver-auction"
 },
 {
  "id": "strategy-intent-based-execution-batch-auction-intent-coincidence-of-wants-matching",
  "title": "Coincidence-of-Wants Matching",
  "level": "STRATEGY",
  "parent": "type-intent-based-execution-batch-auction-intent"
 },
 {
  "id": "strategy-intent-based-execution-signed-trade-intent-constraint-aware-settlement",
  "title": "Constraint-Aware Settlement",
  "level": "STRATEGY",
  "parent": "type-intent-based-execution-signed-trade-intent"
 },
 {
  "id": "strategy-intent-based-execution-solver-auction-cost-aware-solver-routing",
  "title": "Cost-Aware Solver Routing",
  "level": "STRATEGY",
  "parent": "type-intent-based-execution-solver-auction"
 },
 {
  "id": "strategy-intent-based-execution-intent-aggregation-intent-batching",
  "title": "Intent Batching",
  "level": "STRATEGY",
  "parent": "type-intent-based-execution-intent-aggregation"
 },
 {
  "id": "strategy-intent-based-execution-intent-aggregation-multi-venue-intent-fulfillment",
  "title": "Multi-Venue Intent Fulfillment",
  "level": "STRATEGY",
  "parent": "type-intent-based-execution-intent-aggregation"
 },
 {
  "id": "strategy-intent-based-execution-filler-based-execution-private-liquidity-filling",
  "title": "Private-Liquidity Filling",
  "level": "STRATEGY",
  "parent": "type-intent-based-execution-filler-based-execution"
 },
 {
  "id": "strategy-intent-based-execution-solver-auction-solver-competition",
  "title": "Solver Competition",
  "level": "STRATEGY",
  "parent": "type-intent-based-execution-solver-auction"
 },
 {
  "id": "type-cross-dex-arbitrage-atomic-arbitrage",
  "title": "Atomic Arbitrage",
  "level": "TYPE",
  "parent": "major-cross-dex-arbitrage"
 },
 {
  "id": "type-cross-dex-arbitrage-inventory-funded-arbitrage",
  "title": "Inventory-Funded Arbitrage",
  "level": "TYPE",
  "parent": "major-cross-dex-arbitrage"
 },
 {
  "id": "type-cross-dex-arbitrage-multi-venue-arbitrage",
  "title": "Multi-Venue Arbitrage",
  "level": "TYPE",
  "parent": "major-cross-dex-arbitrage"
 },
 {
  "id": "type-cross-dex-arbitrage-route-based-arbitrage",
  "title": "Route-Based Arbitrage",
  "level": "TYPE",
  "parent": "major-cross-dex-arbitrage"
 },
 {
  "id": "type-cross-dex-arbitrage-two-venue-arbitrage",
  "title": "Two-Venue Arbitrage",
  "level": "TYPE",
  "parent": "major-cross-dex-arbitrage"
 },
 {
  "id": "strategy-cross-dex-arbitrage-multi-venue-arbitrage-cost-aware-arbitrage",
  "title": "Cost-Aware Arbitrage",
  "level": "STRATEGY",
  "parent": "type-cross-dex-arbitrage-multi-venue-arbitrage"
 },
 {
  "id": "strategy-cross-dex-arbitrage-inventory-funded-arbitrage-inventory-based-arbitrage",
  "title": "Inventory-Based Arbitrage",
  "level": "STRATEGY",
  "parent": "type-cross-dex-arbitrage-inventory-funded-arbitrage"
 },
 {
  "id": "strategy-cross-dex-arbitrage-route-based-arbitrage-multi-dex-route-arbitrage",
  "title": "Multi-DEX Route Arbitrage",
  "level": "STRATEGY",
  "parent": "type-cross-dex-arbitrage-route-based-arbitrage"
 },
 {
  "id": "strategy-cross-dex-arbitrage-route-based-arbitrage-simulation-validated-arbitrage",
  "title": "Simulation-Validated Arbitrage",
  "level": "STRATEGY",
  "parent": "type-cross-dex-arbitrage-route-based-arbitrage"
 },
 {
  "id": "strategy-cross-dex-arbitrage-multi-venue-arbitrage-slippage-aware-arbitrage",
  "title": "Slippage-Aware Arbitrage",
  "level": "STRATEGY",
  "parent": "type-cross-dex-arbitrage-multi-venue-arbitrage"
 },
 {
  "id": "strategy-cross-dex-arbitrage-two-venue-arbitrage-two-venue-spread-capture",
  "title": "Two-Venue Spread Capture",
  "level": "STRATEGY",
  "parent": "type-cross-dex-arbitrage-two-venue-arbitrage"
 },
 {
  "id": "type-triangular-cyclic-arbitrage-cross-dex-cycle",
  "title": "Cross-DEX Cycle",
  "level": "TYPE",
  "parent": "major-triangular-cyclic-arbitrage"
 },
 {
  "id": "type-triangular-cyclic-arbitrage-graph-discovered-arbitrage-cycle",
  "title": "Graph-Discovered Arbitrage Cycle",
  "level": "TYPE",
  "parent": "major-triangular-cyclic-arbitrage"
 },
 {
  "id": "type-triangular-cyclic-arbitrage-multi-asset-cyclic-arbitrage",
  "title": "Multi-Asset Cyclic Arbitrage",
  "level": "TYPE",
  "parent": "major-triangular-cyclic-arbitrage"
 },
 {
  "id": "type-triangular-cyclic-arbitrage-single-dex-cycle",
  "title": "Single-DEX Cycle",
  "level": "TYPE",
  "parent": "major-triangular-cyclic-arbitrage"
 },
 {
  "id": "type-triangular-cyclic-arbitrage-three-asset-triangular-arbitrage",
  "title": "Three-Asset Triangular Arbitrage",
  "level": "TYPE",
  "parent": "major-triangular-cyclic-arbitrage"
 },
 {
  "id": "strategy-triangular-cyclic-arbitrage-single-dex-cycle-atomic-cycle-execution",
  "title": "Atomic Cycle Execution",
  "level": "STRATEGY",
  "parent": "type-triangular-cyclic-arbitrage-single-dex-cycle"
 },
 {
  "id": "strategy-triangular-cyclic-arbitrage-single-dex-cycle-cost-aware-cycle-selection",
  "title": "Cost-Aware Cycle Selection",
  "level": "STRATEGY",
  "parent": "type-triangular-cyclic-arbitrage-single-dex-cycle"
 },
 {
  "id": "strategy-triangular-cyclic-arbitrage-cross-dex-cycle-liquidity-aware-cycle-selection",
  "title": "Liquidity-Aware Cycle Selection",
  "level": "STRATEGY",
  "parent": "type-triangular-cyclic-arbitrage-cross-dex-cycle"
 },
 {
  "id": "strategy-triangular-cyclic-arbitrage-multi-asset-cyclic-arbitrage-multi-hop-cycle",
  "title": "Multi-Hop Cycle",
  "level": "STRATEGY",
  "parent": "type-triangular-cyclic-arbitrage-multi-asset-cyclic-arbitrage"
 },
 {
  "id": "strategy-triangular-cyclic-arbitrage-three-asset-triangular-arbitrage-three-hop-cycle",
  "title": "Three-Hop Cycle",
  "level": "STRATEGY",
  "parent": "type-triangular-cyclic-arbitrage-three-asset-triangular-arbitrage"
 },
 {
  "id": "type-cross-chain-arbitrage-bridge-dependent-arbitrage",
  "title": "Bridge-Dependent Arbitrage",
  "level": "TYPE",
  "parent": "major-cross-chain-arbitrage"
 },
 {
  "id": "type-cross-chain-arbitrage-cross-l2-arbitrage",
  "title": "Cross-L2 Arbitrage",
  "level": "TYPE",
  "parent": "major-cross-chain-arbitrage"
 },
 {
  "id": "type-cross-chain-arbitrage-intent-solver-cross-chain-arbitrage",
  "title": "Intent/Solver Cross-Chain Arbitrage",
  "level": "TYPE",
  "parent": "major-cross-chain-arbitrage"
 },
 {
  "id": "type-cross-chain-arbitrage-same-asset-cross-chain-arbitrage",
  "title": "Same-Asset Cross-Chain Arbitrage",
  "level": "TYPE",
  "parent": "major-cross-chain-arbitrage"
 },
 {
  "id": "type-cross-chain-arbitrage-wrapped-canonical-asset-arbitrage",
  "title": "Wrapped/Canonical Asset Arbitrage",
  "level": "TYPE",
  "parent": "major-cross-chain-arbitrage"
 },
 {
  "id": "strategy-cross-chain-arbitrage-bridge-dependent-arbitrage-bridge-cost-aware-arbitrage",
  "title": "Bridge-Cost-Aware Arbitrage",
  "level": "STRATEGY",
  "parent": "type-cross-chain-arbitrage-bridge-dependent-arbitrage"
 },
 {
  "id": "strategy-cross-chain-arbitrage-cross-l2-arbitrage-cross-l2-price-rebalancing",
  "title": "Cross-L2 Price Rebalancing",
  "level": "STRATEGY",
  "parent": "type-cross-chain-arbitrage-cross-l2-arbitrage"
 },
 {
  "id": "strategy-cross-chain-arbitrage-same-asset-cross-chain-arbitrage-finality-aware-arbitrage",
  "title": "Finality-Aware Arbitrage",
  "level": "STRATEGY",
  "parent": "type-cross-chain-arbitrage-same-asset-cross-chain-arbitrage"
 },
 {
  "id": "strategy-cross-chain-arbitrage-wrapped-canonical-asset-arbitrage-inventory-on-both-chains-strategy",
  "title": "Inventory-on-Both-Chains Strategy",
  "level": "STRATEGY",
  "parent": "type-cross-chain-arbitrage-wrapped-canonical-asset-arbitrage"
 },
 {
  "id": "strategy-cross-chain-arbitrage-bridge-dependent-arbitrage-settlement-aware-arbitrage",
  "title": "Settlement-Aware Arbitrage",
  "level": "STRATEGY",
  "parent": "type-cross-chain-arbitrage-bridge-dependent-arbitrage"
 },
 {
  "id": "strategy-cross-chain-arbitrage-intent-solver-cross-chain-arbitrage-solver-routed-arbitrage",
  "title": "Solver-Routed Arbitrage",
  "level": "STRATEGY",
  "parent": "type-cross-chain-arbitrage-intent-solver-cross-chain-arbitrage"
 },
 {
  "id": "type-stablecoin-peg-arbitrage-algorithmic-peg-arbitrage",
  "title": "Algorithmic-Peg Arbitrage",
  "level": "TYPE",
  "parent": "major-stablecoin-peg-arbitrage"
 },
 {
  "id": "type-stablecoin-peg-arbitrage-cross-chain-stablecoin-arbitrage",
  "title": "Cross-Chain Stablecoin Arbitrage",
  "level": "TYPE",
  "parent": "major-stablecoin-peg-arbitrage"
 },
 {
  "id": "type-stablecoin-peg-arbitrage-cross-dex-stablecoin-arbitrage",
  "title": "Cross-DEX Stablecoin Arbitrage",
  "level": "TYPE",
  "parent": "major-stablecoin-peg-arbitrage"
 },
 {
  "id": "type-stablecoin-peg-arbitrage-redemption-market-price-arbitrage",
  "title": "Redemption/Market-Price Arbitrage",
  "level": "TYPE",
  "parent": "major-stablecoin-peg-arbitrage"
 },
 {
  "id": "type-stablecoin-peg-arbitrage-stablecoin-to-stablecoin-arbitrage",
  "title": "Stablecoin-to-Stablecoin Arbitrage",
  "level": "TYPE",
  "parent": "major-stablecoin-peg-arbitrage"
 },
 {
  "id": "type-stablecoin-peg-arbitrage-stablecoin-reference-peg-arbitrage",
  "title": "Stablecoin/Reference Peg Arbitrage",
  "level": "TYPE",
  "parent": "major-stablecoin-peg-arbitrage"
 },
 {
  "id": "strategy-stablecoin-peg-arbitrage-cross-dex-stablecoin-arbitrage-cost-aware-peg-arbitrage",
  "title": "Cost-Aware Peg Arbitrage",
  "level": "STRATEGY",
  "parent": "type-stablecoin-peg-arbitrage-cross-dex-stablecoin-arbitrage"
 },
 {
  "id": "strategy-stablecoin-peg-arbitrage-cross-chain-stablecoin-arbitrage-cross-chain-peg-arbitrage",
  "title": "Cross-Chain Peg Arbitrage",
  "level": "STRATEGY",
  "parent": "type-stablecoin-peg-arbitrage-cross-chain-stablecoin-arbitrage"
 },
 {
  "id": "strategy-stablecoin-peg-arbitrage-cross-dex-stablecoin-arbitrage-cross-venue-peg-arbitrage",
  "title": "Cross-Venue Peg Arbitrage",
  "level": "STRATEGY",
  "parent": "type-stablecoin-peg-arbitrage-cross-dex-stablecoin-arbitrage"
 },
 {
  "id": "strategy-stablecoin-peg-arbitrage-stablecoin-to-stablecoin-arbitrage-liquidity-aware-peg-arbitrage",
  "title": "Liquidity-Aware Peg Arbitrage",
  "level": "STRATEGY",
  "parent": "type-stablecoin-peg-arbitrage-stablecoin-to-stablecoin-arbitrage"
 },
 {
  "id": "strategy-stablecoin-peg-arbitrage-stablecoin-to-stablecoin-arbitrage-stablecoin-pair-spread-capture",
  "title": "Stablecoin Pair Spread Capture",
  "level": "STRATEGY",
  "parent": "type-stablecoin-peg-arbitrage-stablecoin-to-stablecoin-arbitrage"
 },
 {
  "id": "type-hold-store-assets-self-custody-wallet-holding",
  "title": "Self-Custody Wallet Holding",
  "level": "TYPE",
  "parent": "major-hold-store-assets"
 },
 {
  "id": "type-hold-store-assets-hardware-cold-wallet-holding",
  "title": "Hardware/Cold Wallet Holding",
  "level": "TYPE",
  "parent": "major-hold-store-assets"
 },
 {
  "id": "type-hold-store-assets-smart-contract-wallet-holding",
  "title": "Smart-Contract Wallet Holding",
  "level": "TYPE",
  "parent": "major-hold-store-assets"
 },
 {
  "id": "type-hold-store-assets-multisignature-wallet-holding",
  "title": "Multisignature Wallet Holding",
  "level": "TYPE",
  "parent": "major-hold-store-assets"
 },
 {
  "id": "type-hold-store-assets-segregated-wallet-holding",
  "title": "Segregated Wallet Holding",
  "level": "TYPE",
  "parent": "major-hold-store-assets"
 },
 {
  "id": "strategy-hold-store-assets-self-custody-wallet-holding-long-term-asset-holding",
  "title": "Long-Term Asset Holding",
  "level": "STRATEGY",
  "parent": "type-hold-store-assets-self-custody-wallet-holding"
 },
 {
  "id": "strategy-hold-store-assets-self-custody-wallet-holding-operational-wallet-separation",
  "title": "Operational Wallet Separation",
  "level": "STRATEGY",
  "parent": "type-hold-store-assets-self-custody-wallet-holding"
 },
 {
  "id": "strategy-hold-store-assets-hardware-cold-wallet-holding-cold-storage-allocation",
  "title": "Cold-Storage Allocation",
  "level": "STRATEGY",
  "parent": "type-hold-store-assets-hardware-cold-wallet-holding"
 },
 {
  "id": "strategy-hold-store-assets-multisignature-wallet-holding-multi-approver-custody",
  "title": "Multi-Approver Custody",
  "level": "STRATEGY",
  "parent": "type-hold-store-assets-multisignature-wallet-holding"
 },
 {
  "id": "strategy-hold-store-assets-segregated-wallet-holding-asset-segregation",
  "title": "Asset Segregation",
  "level": "STRATEGY",
  "parent": "type-hold-store-assets-segregated-wallet-holding"
 },
 {
  "id": "strategy-hold-store-assets-segregated-wallet-holding-risk-bounded-wallet-allocation",
  "title": "Risk-Bounded Wallet Allocation",
  "level": "STRATEGY",
  "parent": "type-hold-store-assets-segregated-wallet-holding"
 },
 {
  "id": "type-transfer-assets-send",
  "title": "Send",
  "level": "TYPE",
  "parent": "major-transfer-assets"
 },
 {
  "id": "type-transfer-assets-receive",
  "title": "Receive",
  "level": "TYPE",
  "parent": "major-transfer-assets"
 },
 {
  "id": "type-transfer-assets-native-asset-transfer",
  "title": "Native Asset Transfer",
  "level": "TYPE",
  "parent": "major-transfer-assets"
 },
 {
  "id": "type-transfer-assets-token-transfer",
  "title": "Token Transfer",
  "level": "TYPE",
  "parent": "major-transfer-assets"
 },
 {
  "id": "type-transfer-assets-nft-transfer",
  "title": "NFT Transfer",
  "level": "TYPE",
  "parent": "major-transfer-assets"
 },
 {
  "id": "type-transfer-assets-batch-transfer",
  "title": "Batch Transfer",
  "level": "TYPE",
  "parent": "major-transfer-assets"
 },
 {
  "id": "type-asset-permission-management-token-allowance-permission",
  "title": "Token Allowance Permission",
  "level": "TYPE",
  "parent": "major-asset-permission-management"
 },
 {
  "id": "type-asset-permission-management-operator-permission",
  "title": "Operator Permission",
  "level": "TYPE",
  "parent": "major-asset-permission-management"
 },
 {
  "id": "type-asset-permission-management-signature-based-permission",
  "title": "Signature-Based Permission",
  "level": "TYPE",
  "parent": "major-asset-permission-management"
 },
 {
  "id": "type-asset-permission-management-delegated-session-permission",
  "title": "Delegated/Session Permission",
  "level": "TYPE",
  "parent": "major-asset-permission-management"
 },
 {
  "id": "type-asset-permission-management-contract-interaction-permission",
  "title": "Contract Interaction Permission",
  "level": "TYPE",
  "parent": "major-asset-permission-management"
 },
 {
  "id": "strategy-asset-permission-management-token-allowance-permission-least-privilege-permissions",
  "title": "Least-Privilege Permissions",
  "level": "STRATEGY",
  "parent": "type-asset-permission-management-token-allowance-permission"
 },
 {
  "id": "strategy-asset-permission-management-token-allowance-permission-allowance-limited-permissions",
  "title": "Allowance-Limited Permissions",
  "level": "STRATEGY",
  "parent": "type-asset-permission-management-token-allowance-permission"
 },
 {
  "id": "strategy-asset-permission-management-delegated-session-permission-time-bounded-permissions",
  "title": "Time-Bounded Permissions",
  "level": "STRATEGY",
  "parent": "type-asset-permission-management-delegated-session-permission"
 },
 {
  "id": "strategy-asset-permission-management-operator-permission-purpose-specific-permissions",
  "title": "Purpose-Specific Permissions",
  "level": "STRATEGY",
  "parent": "type-asset-permission-management-operator-permission"
 },
 {
  "id": "strategy-asset-permission-management-contract-interaction-permission-permission-exposure-minimization",
  "title": "Permission Exposure Minimization",
  "level": "STRATEGY",
  "parent": "type-asset-permission-management-contract-interaction-permission"
 },
 {
  "id": "strategy-asset-permission-management-token-allowance-permission-periodic-permission-review",
  "title": "Periodic Permission Review",
  "level": "STRATEGY",
  "parent": "type-asset-permission-management-token-allowance-permission"
 },
 {
  "id": "type-wrap-unwrap-assets-native-wrapped-asset-conversion",
  "title": "Native/Wrapped Asset Conversion",
  "level": "TYPE",
  "parent": "major-wrap-unwrap-assets"
 },
 {
  "id": "type-wrap-unwrap-assets-protocol-wrapped-asset-conversion",
  "title": "Protocol-Wrapped Asset Conversion",
  "level": "TYPE",
  "parent": "major-wrap-unwrap-assets"
 },
 {
  "id": "type-wrap-unwrap-assets-wrapper-migration",
  "title": "Wrapper Migration",
  "level": "TYPE",
  "parent": "major-wrap-unwrap-assets"
 },
 {
  "id": "strategy-wrap-unwrap-assets-native-wrapped-asset-conversion-native-wrapped-parity-management",
  "title": "Native/Wrapped Parity Management",
  "level": "STRATEGY",
  "parent": "type-wrap-unwrap-assets-native-wrapped-asset-conversion"
 },
 {
  "id": "strategy-wrap-unwrap-assets-protocol-wrapped-asset-conversion-wrapper-compatibility-selection",
  "title": "Wrapper Compatibility Selection",
  "level": "STRATEGY",
  "parent": "type-wrap-unwrap-assets-protocol-wrapped-asset-conversion"
 },
 {
  "id": "strategy-wrap-unwrap-assets-native-wrapped-asset-conversion-conversion-cost-awareness",
  "title": "Conversion Cost Awareness",
  "level": "STRATEGY",
  "parent": "type-wrap-unwrap-assets-native-wrapped-asset-conversion"
 },
 {
  "id": "type-flash-capital-arbitrage-flash-loan-funded-arbitrage",
  "title": "Flash-Loan-Funded Arbitrage",
  "level": "TYPE",
  "parent": "major-flash-capital-arbitrage"
 },
 {
  "id": "type-flash-capital-arbitrage-flash-swap-funded-arbitrage",
  "title": "Flash-Swap-Funded Arbitrage",
  "level": "TYPE",
  "parent": "major-flash-capital-arbitrage"
 },
 {
  "id": "type-flash-capital-arbitrage-flash-mint-funded-arbitrage",
  "title": "Flash-Mint-Funded Arbitrage",
  "level": "TYPE",
  "parent": "major-flash-capital-arbitrage"
 },
 {
  "id": "type-flash-capital-arbitrage-multi-asset-flash-capital-arbitrage",
  "title": "Multi-Asset Flash-Capital Arbitrage",
  "level": "TYPE",
  "parent": "major-flash-capital-arbitrage"
 },
 {
  "id": "strategy-flash-capital-arbitrage-flash-loan-funded-arbitrage-flash-funded-cross-dex-arbitrage",
  "title": "Flash-Funded Cross-DEX Arbitrage",
  "level": "STRATEGY",
  "parent": "type-flash-capital-arbitrage-flash-loan-funded-arbitrage"
 },
 {
  "id": "strategy-flash-capital-arbitrage-flash-loan-funded-arbitrage-flash-funded-cyclic-arbitrage",
  "title": "Flash-Funded Cyclic Arbitrage",
  "level": "STRATEGY",
  "parent": "type-flash-capital-arbitrage-flash-loan-funded-arbitrage"
 },
 {
  "id": "strategy-flash-capital-arbitrage-flash-loan-funded-arbitrage-flash-funded-peg-arbitrage",
  "title": "Flash-Funded Peg Arbitrage",
  "level": "STRATEGY",
  "parent": "type-flash-capital-arbitrage-flash-loan-funded-arbitrage"
 },
 {
  "id": "strategy-flash-capital-arbitrage-flash-loan-funded-arbitrage-cost-aware-flash-arbitrage",
  "title": "Cost-Aware Flash Arbitrage",
  "level": "STRATEGY",
  "parent": "type-flash-capital-arbitrage-flash-loan-funded-arbitrage"
 },
 {
  "id": "type-bridging-canonical-native-bridge",
  "title": "Canonical/Native Bridge",
  "level": "TYPE",
  "parent": "major-bridging"
 },
 {
  "id": "type-bridging-lock-and-mint-bridge",
  "title": "Lock-and-Mint Bridge",
  "level": "TYPE",
  "parent": "major-bridging"
 },
 {
  "id": "type-bridging-burn-and-mint-bridge",
  "title": "Burn-and-Mint Bridge",
  "level": "TYPE",
  "parent": "major-bridging"
 },
 {
  "id": "type-bridging-liquidity-network-bridge",
  "title": "Liquidity-Network Bridge",
  "level": "TYPE",
  "parent": "major-bridging"
 },
 {
  "id": "type-bridging-intent-based-bridge",
  "title": "Intent-Based Bridge",
  "level": "TYPE",
  "parent": "major-bridging"
 },
 {
  "id": "strategy-bridging-canonical-native-bridge-same-asset-bridging",
  "title": "Same-Asset Bridging",
  "level": "STRATEGY",
  "parent": "type-bridging-canonical-native-bridge"
 },
 {
  "id": "strategy-bridging-canonical-native-bridge-bridge-route-selection",
  "title": "Bridge-Route Selection",
  "level": "STRATEGY",
  "parent": "type-bridging-canonical-native-bridge"
 },
 {
  "id": "strategy-bridging-canonical-native-bridge-finality-aware-bridging",
  "title": "Finality-Aware Bridging",
  "level": "STRATEGY",
  "parent": "type-bridging-canonical-native-bridge"
 },
 {
  "id": "strategy-bridging-canonical-native-bridge-cost-aware-bridging",
  "title": "Cost-Aware Bridging",
  "level": "STRATEGY",
  "parent": "type-bridging-canonical-native-bridge"
 },
 {
  "id": "strategy-bridging-liquidity-network-bridge-liquidity-aware-bridging",
  "title": "Liquidity-Aware Bridging",
  "level": "STRATEGY",
  "parent": "type-bridging-liquidity-network-bridge"
 },
 {
  "id": "type-cross-chain-routing-settlement-cross-chain-route-aggregation",
  "title": "Cross-Chain Route Aggregation",
  "level": "TYPE",
  "parent": "major-cross-chain-routing-settlement"
 },
 {
  "id": "type-cross-chain-routing-settlement-cross-chain-intent-routing",
  "title": "Cross-Chain Intent Routing",
  "level": "TYPE",
  "parent": "major-cross-chain-routing-settlement"
 },
 {
  "id": "type-cross-chain-routing-settlement-relayer-filler-settlement",
  "title": "Relayer/Filler Settlement",
  "level": "TYPE",
  "parent": "major-cross-chain-routing-settlement"
 },
 {
  "id": "type-cross-chain-routing-settlement-solver-based-cross-chain-settlement",
  "title": "Solver-Based Cross-Chain Settlement",
  "level": "TYPE",
  "parent": "major-cross-chain-routing-settlement"
 },
 {
  "id": "type-cross-chain-routing-settlement-message-based-cross-chain-settlement",
  "title": "Message-Based Cross-Chain Settlement",
  "level": "TYPE",
  "parent": "major-cross-chain-routing-settlement"
 },
 {
  "id": "type-cross-chain-routing-settlement-chained-cross-chain-execution",
  "title": "Chained Cross-Chain Execution",
  "level": "TYPE",
  "parent": "major-cross-chain-routing-settlement"
 },
 {
  "id": "strategy-cross-chain-routing-settlement-cross-chain-route-aggregation-multi-route-cross-chain-routing",
  "title": "Multi-Route Cross-Chain Routing",
  "level": "STRATEGY",
  "parent": "type-cross-chain-routing-settlement-cross-chain-route-aggregation"
 },
 {
  "id": "strategy-cross-chain-routing-settlement-cross-chain-route-aggregation-cost-aware-cross-chain-routing",
  "title": "Cost-Aware Cross-Chain Routing",
  "level": "STRATEGY",
  "parent": "type-cross-chain-routing-settlement-cross-chain-route-aggregation"
 },
 {
  "id": "strategy-cross-chain-routing-settlement-cross-chain-route-aggregation-finality-aware-route-selection",
  "title": "Finality-Aware Route Selection",
  "level": "STRATEGY",
  "parent": "type-cross-chain-routing-settlement-cross-chain-route-aggregation"
 },
 {
  "id": "strategy-cross-chain-routing-settlement-cross-chain-route-aggregation-liquidity-aware-cross-chain-routing",
  "title": "Liquidity-Aware Cross-Chain Routing",
  "level": "STRATEGY",
  "parent": "type-cross-chain-routing-settlement-cross-chain-route-aggregation"
 },
 {
  "id": "strategy-cross-chain-routing-settlement-relayer-filler-settlement-relayer-filler-selection",
  "title": "Relayer/Filler Selection",
  "level": "STRATEGY",
  "parent": "type-cross-chain-routing-settlement-relayer-filler-settlement"
 },
 {
  "id": "strategy-cross-chain-routing-settlement-solver-based-cross-chain-settlement-solver-routed-settlement",
  "title": "Solver-Routed Settlement",
  "level": "STRATEGY",
  "parent": "type-cross-chain-routing-settlement-solver-based-cross-chain-settlement"
 },
 {
  "id": "strategy-cross-chain-routing-settlement-chained-cross-chain-execution-destination-action-routing",
  "title": "Destination-Action Routing",
  "level": "STRATEGY",
  "parent": "type-cross-chain-routing-settlement-chained-cross-chain-execution"
 },
 {
  "id": "strategy-cross-chain-routing-settlement-cross-chain-route-aggregation-fallback-cross-chain-routing",
  "title": "Fallback Cross-Chain Routing",
  "level": "STRATEGY",
  "parent": "type-cross-chain-routing-settlement-cross-chain-route-aggregation"
 },
 {
  "id": "type-cross-chain-liquidity-provision-bridge-liquidity-pool",
  "title": "Bridge Liquidity Pool",
  "level": "TYPE",
  "parent": "major-cross-chain-liquidity-provision"
 },
 {
  "id": "type-cross-chain-liquidity-provision-relayer-filler-liquidity",
  "title": "Relayer/Filler Liquidity",
  "level": "TYPE",
  "parent": "major-cross-chain-liquidity-provision"
 },
 {
  "id": "type-cross-chain-liquidity-provision-hub-and-spoke-cross-chain-liquidity",
  "title": "Hub-and-Spoke Cross-Chain Liquidity",
  "level": "TYPE",
  "parent": "major-cross-chain-liquidity-provision"
 },
 {
  "id": "type-cross-chain-liquidity-provision-cross-chain-inventory-liquidity",
  "title": "Cross-Chain Inventory Liquidity",
  "level": "TYPE",
  "parent": "major-cross-chain-liquidity-provision"
 },
 {
  "id": "type-cross-chain-liquidity-provision-cross-chain-liquidity-vault",
  "title": "Cross-Chain Liquidity Vault",
  "level": "TYPE",
  "parent": "major-cross-chain-liquidity-provision"
 },
 {
  "id": "strategy-cross-chain-liquidity-provision-cross-chain-inventory-liquidity-cross-chain-inventory-rebalancing",
  "title": "Cross-Chain Inventory Rebalancing",
  "level": "STRATEGY",
  "parent": "type-cross-chain-liquidity-provision-cross-chain-inventory-liquidity"
 },
 {
  "id": "strategy-cross-chain-liquidity-provision-hub-and-spoke-cross-chain-liquidity-route-liquidity-allocation",
  "title": "Route Liquidity Allocation",
  "level": "STRATEGY",
  "parent": "type-cross-chain-liquidity-provision-hub-and-spoke-cross-chain-liquidity"
 },
 {
  "id": "strategy-cross-chain-liquidity-provision-cross-chain-liquidity-vault-utilization-aware-cross-chain-liquidity",
  "title": "Utilization-Aware Cross-Chain Liquidity",
  "level": "STRATEGY",
  "parent": "type-cross-chain-liquidity-provision-cross-chain-liquidity-vault"
 },
 {
  "id": "strategy-cross-chain-liquidity-provision-cross-chain-inventory-liquidity-cost-aware-cross-chain-rebalancing",
  "title": "Cost-Aware Cross-Chain Rebalancing",
  "level": "STRATEGY",
  "parent": "type-cross-chain-liquidity-provision-cross-chain-inventory-liquidity"
 },
 {
  "id": "strategy-cross-chain-liquidity-provision-hub-and-spoke-cross-chain-liquidity-multi-chain-liquidity-allocation",
  "title": "Multi-Chain Liquidity Allocation",
  "level": "STRATEGY",
  "parent": "type-cross-chain-liquidity-provision-hub-and-spoke-cross-chain-liquidity"
 },
 {
  "id": "strategy-cross-chain-liquidity-provision-relayer-filler-liquidity-relayer-liquidity-allocation",
  "title": "Relayer Liquidity Allocation",
  "level": "STRATEGY",
  "parent": "type-cross-chain-liquidity-provision-relayer-filler-liquidity"
 },
 {
  "id": "type-validator-operation-solo-validator-operation",
  "title": "Solo Validator Operation",
  "level": "TYPE",
  "parent": "major-validator-operation"
 },
 {
  "id": "type-validator-operation-validator-as-a-service-operation",
  "title": "Validator-as-a-Service Operation",
  "level": "TYPE",
  "parent": "major-validator-operation"
 },
 {
  "id": "type-validator-operation-distributed-validator-operation",
  "title": "Distributed Validator Operation",
  "level": "TYPE",
  "parent": "major-validator-operation"
 },
 {
  "id": "type-validator-operation-validator-client-operation",
  "title": "Validator Client Operation",
  "level": "TYPE",
  "parent": "major-validator-operation"
 },
 {
  "id": "type-validator-operation-validator-monitoring-operation",
  "title": "Validator Monitoring Operation",
  "level": "TYPE",
  "parent": "major-validator-operation"
 },
 {
  "id": "type-validator-operation-validator-key-signing-architecture",
  "title": "Validator Key/Signing Architecture",
  "level": "TYPE",
  "parent": "major-validator-operation"
 },
 {
  "id": "type-node-operation-full-node",
  "title": "Full Node",
  "level": "TYPE",
  "parent": "major-node-operation"
 },
 {
  "id": "type-node-operation-archive-node",
  "title": "Archive Node",
  "level": "TYPE",
  "parent": "major-node-operation"
 },
 {
  "id": "type-node-operation-light-node",
  "title": "Light Node",
  "level": "TYPE",
  "parent": "major-node-operation"
 },
 {
  "id": "type-node-operation-rpc-node",
  "title": "RPC Node",
  "level": "TYPE",
  "parent": "major-node-operation"
 },
 {
  "id": "type-node-operation-execution-node",
  "title": "Execution Node",
  "level": "TYPE",
  "parent": "major-node-operation"
 },
 {
  "id": "type-node-operation-consensus-beacon-node",
  "title": "Consensus/Beacon Node",
  "level": "TYPE",
  "parent": "major-node-operation"
 },
 {
  "id": "type-node-operation-indexing-data-node",
  "title": "Indexing/Data Node",
  "level": "TYPE",
  "parent": "major-node-operation"
 },
 {
  "id": "type-node-operation-relay-network-node",
  "title": "Relay/Network Node",
  "level": "TYPE",
  "parent": "major-node-operation"
 },
 {
  "id": "type-mining-proof-of-work-participation-solo-mining",
  "title": "Solo Mining",
  "level": "TYPE",
  "parent": "major-mining-proof-of-work"
 },
 {
  "id": "type-mining-proof-of-work-participation-pool-mining",
  "title": "Pool Mining",
  "level": "TYPE",
  "parent": "major-mining-proof-of-work"
 },
 {
  "id": "type-mining-proof-of-work-participation-hashrate-marketplace-mining",
  "title": "Hashrate Marketplace Mining",
  "level": "TYPE",
  "parent": "major-mining-proof-of-work"
 },
 {
  "id": "type-mining-proof-of-work-participation-merge-auxiliary-mining-where-supported",
  "title": "Merge/Auxiliary Mining where supported",
  "level": "TYPE",
  "parent": "major-mining-proof-of-work"
 },
 {
  "id": "type-mining-proof-of-work-participation-asic-mining",
  "title": "ASIC Mining",
  "level": "TYPE",
  "parent": "major-mining-proof-of-work"
 },
 {
  "id": "type-mining-proof-of-work-participation-gpu-mining-where-supported",
  "title": "GPU Mining where supported",
  "level": "TYPE",
  "parent": "major-mining-proof-of-work"
 },
 {
  "id": "type-mining-proof-of-work-participation-cpu-mining-where-supported",
  "title": "CPU Mining where supported",
  "level": "TYPE",
  "parent": "major-mining-proof-of-work"
 },
 {
  "id": "type-perpetual-trading-long-perpetual-position",
  "title": "Long Perpetual Position",
  "level": "TYPE",
  "parent": "major-perpetual-trading"
 },
 {
  "id": "type-perpetual-trading-short-perpetual-position",
  "title": "Short Perpetual Position",
  "level": "TYPE",
  "parent": "major-perpetual-trading"
 },
 {
  "id": "type-perpetual-trading-isolated-margin-perpetual",
  "title": "Isolated-Margin Perpetual",
  "level": "TYPE",
  "parent": "major-perpetual-trading"
 },
 {
  "id": "type-perpetual-trading-cross-margin-perpetual",
  "title": "Cross-Margin Perpetual",
  "level": "TYPE",
  "parent": "major-perpetual-trading"
 },
 {
  "id": "type-perpetual-trading-multi-collateral-perpetual",
  "title": "Multi-Collateral Perpetual",
  "level": "TYPE",
  "parent": "major-perpetual-trading"
 },
 {
  "id": "type-perpetual-trading-oracle-priced-perpetual",
  "title": "Oracle-Priced Perpetual",
  "level": "TYPE",
  "parent": "major-perpetual-trading"
 },
 {
  "id": "type-futures-trading-long-futures-position",
  "title": "Long Futures Position",
  "level": "TYPE",
  "parent": "major-futures-trading"
 },
 {
  "id": "type-futures-trading-short-futures-position",
  "title": "Short Futures Position",
  "level": "TYPE",
  "parent": "major-futures-trading"
 },
 {
  "id": "type-futures-trading-fixed-maturity-future",
  "title": "Fixed-Maturity Future",
  "level": "TYPE",
  "parent": "major-futures-trading"
 },
 {
  "id": "type-futures-trading-cash-settled-future",
  "title": "Cash-Settled Future",
  "level": "TYPE",
  "parent": "major-futures-trading"
 },
 {
  "id": "type-futures-trading-deliverable-asset-settled-future-where-supported",
  "title": "Deliverable/Asset-Settled Future where supported",
  "level": "TYPE",
  "parent": "major-futures-trading"
 },
 {
  "id": "type-futures-trading-rolling-futures-position",
  "title": "Rolling Futures Position",
  "level": "TYPE",
  "parent": "major-futures-trading"
 },
 {
  "id": "type-options-trading-writing-call-option-position",
  "title": "Call Option Position",
  "level": "TYPE",
  "parent": "major-options-trading-writing"
 },
 {
  "id": "type-options-trading-writing-put-option-position",
  "title": "Put Option Position",
  "level": "TYPE",
  "parent": "major-options-trading-writing"
 },
 {
  "id": "type-options-trading-writing-option-buying",
  "title": "Option Buying",
  "level": "TYPE",
  "parent": "major-options-trading-writing"
 },
 {
  "id": "type-options-trading-writing-option-writing",
  "title": "Option Writing",
  "level": "TYPE",
  "parent": "major-options-trading-writing"
 },
 {
  "id": "type-options-trading-writing-european-style-option-where-supported",
  "title": "European-Style Option where supported",
  "level": "TYPE",
  "parent": "major-options-trading-writing"
 },
 {
  "id": "type-options-trading-writing-american-style-option-where-supported",
  "title": "American-Style Option where supported",
  "level": "TYPE",
  "parent": "major-options-trading-writing"
 },
 {
  "id": "type-options-trading-writing-on-chain-option-position",
  "title": "On-Chain Option Position",
  "level": "TYPE",
  "parent": "major-options-trading-writing"
 },
 {
  "id": "type-synthetic-assets-cdp-systems-collateralized-debt-position",
  "title": "Collateralized Debt Position",
  "level": "TYPE",
  "parent": "major-synthetic-assets-cdp"
 },
 {
  "id": "type-synthetic-assets-cdp-systems-synthetic-asset-position",
  "title": "Synthetic Asset Position",
  "level": "TYPE",
  "parent": "major-synthetic-assets-cdp"
 },
 {
  "id": "type-synthetic-assets-cdp-systems-overcollateralized-synthetic-issuance",
  "title": "Overcollateralized Synthetic Issuance",
  "level": "TYPE",
  "parent": "major-synthetic-assets-cdp"
 },
 {
  "id": "type-synthetic-assets-cdp-systems-debt-backed-synthetic-asset",
  "title": "Debt-Backed Synthetic Asset",
  "level": "TYPE",
  "parent": "major-synthetic-assets-cdp"
 },
 {
  "id": "type-synthetic-assets-cdp-systems-synthetic-stable-asset",
  "title": "Synthetic Stable Asset",
  "level": "TYPE",
  "parent": "major-synthetic-assets-cdp"
 },
 {
  "id": "type-synthetic-assets-cdp-systems-synthetic-market-position",
  "title": "Synthetic Market Position",
  "level": "TYPE",
  "parent": "major-synthetic-assets-cdp"
 },
 {
  "id": "type-synthetic-assets-cdp-systems-multi-collateral-cdp",
  "title": "Multi-Collateral CDP",
  "level": "TYPE",
  "parent": "major-synthetic-assets-cdp"
 },
 {
  "id": "type-governance-participation-token-holder-governance",
  "title": "Token-Holder Governance",
  "level": "TYPE",
  "parent": "major-governance-participation"
 },
 {
  "id": "type-governance-participation-delegated-governance",
  "title": "Delegated Governance",
  "level": "TYPE",
  "parent": "major-governance-participation"
 },
 {
  "id": "type-governance-participation-proposal-governance",
  "title": "Proposal Governance",
  "level": "TYPE",
  "parent": "major-governance-participation"
 },
 {
  "id": "type-governance-participation-on-chain-voting",
  "title": "On-Chain Voting",
  "level": "TYPE",
  "parent": "major-governance-participation"
 },
 {
  "id": "type-governance-participation-off-chain-signal-voting",
  "title": "Off-Chain/Signal Voting",
  "level": "TYPE",
  "parent": "major-governance-participation"
 },
 {
  "id": "type-governance-participation-representative-delegate-governance",
  "title": "Representative/Delegate Governance",
  "level": "TYPE",
  "parent": "major-governance-participation"
 },
 {
  "id": "type-governance-participation-treasury-governance",
  "title": "Treasury Governance",
  "level": "TYPE",
  "parent": "major-governance-participation"
 },
 {
  "id": "type-gauge-incentive-markets-liquidity-gauge",
  "title": "Liquidity Gauge",
  "level": "TYPE",
  "parent": "major-gauge-incentive-markets"
 },
 {
  "id": "type-gauge-incentive-markets-gauge-weight-market",
  "title": "Gauge-Weight Market",
  "level": "TYPE",
  "parent": "major-gauge-incentive-markets"
 },
 {
  "id": "type-gauge-incentive-markets-emission-allocation-market",
  "title": "Emission-Allocation Market",
  "level": "TYPE",
  "parent": "major-gauge-incentive-markets"
 },
 {
  "id": "type-gauge-incentive-markets-vote-incentive-market",
  "title": "Vote-Incentive Market",
  "level": "TYPE",
  "parent": "major-gauge-incentive-markets"
 },
 {
  "id": "type-gauge-incentive-markets-permissionless-reward-gauge",
  "title": "Permissionless Reward Gauge",
  "level": "TYPE",
  "parent": "major-gauge-incentive-markets"
 },
 {
  "id": "type-gauge-incentive-markets-cross-chain-gauge",
  "title": "Cross-Chain Gauge",
  "level": "TYPE",
  "parent": "major-gauge-incentive-markets"
 },
 {
  "id": "type-gauge-incentive-markets-governance-incentive-market",
  "title": "Governance-Incentive Market",
  "level": "TYPE",
  "parent": "major-gauge-incentive-markets"
 },
 {
  "id": "type-insurance-risk-underwriting-protocol-cover",
  "title": "Protocol Cover",
  "level": "TYPE",
  "parent": "major-insurance-risk-underwriting"
 },
 {
  "id": "type-insurance-risk-underwriting-smart-contract-cover",
  "title": "Smart-Contract Cover",
  "level": "TYPE",
  "parent": "major-insurance-risk-underwriting"
 },
 {
  "id": "type-insurance-risk-underwriting-depeg-cover",
  "title": "Depeg Cover",
  "level": "TYPE",
  "parent": "major-insurance-risk-underwriting"
 },
 {
  "id": "type-insurance-risk-underwriting-slashing-cover",
  "title": "Slashing Cover",
  "level": "TYPE",
  "parent": "major-insurance-risk-underwriting"
 },
 {
  "id": "type-insurance-risk-underwriting-bridge-cross-chain-cover",
  "title": "Bridge/Cross-Chain Cover",
  "level": "TYPE",
  "parent": "major-insurance-risk-underwriting"
 },
 {
  "id": "type-insurance-risk-underwriting-risk-sharing-pool",
  "title": "Risk-Sharing Pool",
  "level": "TYPE",
  "parent": "major-insurance-risk-underwriting"
 },
 {
  "id": "type-insurance-risk-underwriting-underwriting-pool",
  "title": "Underwriting Pool",
  "level": "TYPE",
  "parent": "major-insurance-risk-underwriting"
 },
 {
  "id": "type-insurance-risk-underwriting-parametric-cover-where-supported",
  "title": "Parametric Cover where supported",
  "level": "TYPE",
  "parent": "major-insurance-risk-underwriting"
 },
 {
  "id": "strategy-validator-operation-validator-client-operation-validator-client-diversity",
  "title": "Validator Client Diversity",
  "level": "STRATEGY",
  "parent": "type-validator-operation-validator-client-operation"
 },
 {
  "id": "strategy-validator-operation-distributed-validator-operation-high-availability-validator-operation",
  "title": "High-Availability Validator Operation",
  "level": "STRATEGY",
  "parent": "type-validator-operation-distributed-validator-operation"
 },
 {
  "id": "strategy-validator-operation-distributed-validator-operation-failover-aware-validator-operation",
  "title": "Failover-Aware Validator Operation",
  "level": "STRATEGY",
  "parent": "type-validator-operation-distributed-validator-operation"
 },
 {
  "id": "strategy-validator-operation-validator-monitoring-operation-uptime-aware-validator-management",
  "title": "Uptime-Aware Validator Management",
  "level": "STRATEGY",
  "parent": "type-validator-operation-validator-monitoring-operation"
 },
 {
  "id": "strategy-validator-operation-validator-key-signing-architecture-slashing-risk-aware-operation",
  "title": "Slashing-Risk-Aware Operation",
  "level": "STRATEGY",
  "parent": "type-validator-operation-validator-key-signing-architecture"
 },
 {
  "id": "strategy-validator-operation-validator-monitoring-operation-validator-duty-monitoring",
  "title": "Validator Duty Monitoring",
  "level": "STRATEGY",
  "parent": "type-validator-operation-validator-monitoring-operation"
 },
 {
  "id": "strategy-validator-operation-solo-validator-operation-validator-infrastructure-separation",
  "title": "Validator Infrastructure Separation",
  "level": "STRATEGY",
  "parent": "type-validator-operation-solo-validator-operation"
 },
 {
  "id": "strategy-node-operation-full-node-client-diversity",
  "title": "Client Diversity",
  "level": "STRATEGY",
  "parent": "type-node-operation-full-node"
 },
 {
  "id": "strategy-node-operation-full-node-node-redundancy",
  "title": "Node Redundancy",
  "level": "STRATEGY",
  "parent": "type-node-operation-full-node"
 },
 {
  "id": "strategy-node-operation-rpc-node-high-availability-node-operation",
  "title": "High-Availability Node Operation",
  "level": "STRATEGY",
  "parent": "type-node-operation-rpc-node"
 },
 {
  "id": "strategy-node-operation-rpc-node-rpc-load-distribution",
  "title": "RPC Load Distribution",
  "level": "STRATEGY",
  "parent": "type-node-operation-rpc-node"
 },
 {
  "id": "strategy-node-operation-relay-network-node-peer-connectivity-management",
  "title": "Peer Connectivity Management",
  "level": "STRATEGY",
  "parent": "type-node-operation-relay-network-node"
 },
 {
  "id": "strategy-node-operation-archive-node-storage-aware-node-operation",
  "title": "Storage-Aware Node Operation",
  "level": "STRATEGY",
  "parent": "type-node-operation-archive-node"
 },
 {
  "id": "strategy-node-operation-archive-node-state-data-retention-management",
  "title": "State/Data Retention Management",
  "level": "STRATEGY",
  "parent": "type-node-operation-archive-node"
 },
 {
  "id": "strategy-node-operation-full-node-node-synchronization-management",
  "title": "Node Synchronization Management",
  "level": "STRATEGY",
  "parent": "type-node-operation-full-node"
 },
 {
  "id": "strategy-mining-proof-of-work-participation-pool-mining-pool-selection",
  "title": "Pool Selection",
  "level": "STRATEGY",
  "parent": "type-mining-proof-of-work-participation-pool-mining"
 },
 {
  "id": "strategy-mining-proof-of-work-participation-hashrate-marketplace-mining-hashrate-allocation",
  "title": "Hashrate Allocation",
  "level": "STRATEGY",
  "parent": "type-mining-proof-of-work-participation-hashrate-marketplace-mining"
 },
 {
  "id": "strategy-mining-proof-of-work-participation-pool-mining-multi-pool-allocation",
  "title": "Multi-Pool Allocation",
  "level": "STRATEGY",
  "parent": "type-mining-proof-of-work-participation-pool-mining"
 },
 {
  "id": "strategy-mining-proof-of-work-participation-asic-mining-hardware-utilization-management",
  "title": "Hardware Utilization Management",
  "level": "STRATEGY",
  "parent": "type-mining-proof-of-work-participation-asic-mining"
 },
 {
  "id": "strategy-mining-proof-of-work-participation-solo-mining-power-cost-aware-mining",
  "title": "Power-Cost-Aware Mining",
  "level": "STRATEGY",
  "parent": "type-mining-proof-of-work-participation-solo-mining"
 },
 {
  "id": "strategy-mining-proof-of-work-participation-solo-mining-difficulty-aware-mining",
  "title": "Difficulty-Aware Mining",
  "level": "STRATEGY",
  "parent": "type-mining-proof-of-work-participation-solo-mining"
 },
 {
  "id": "strategy-mining-proof-of-work-participation-merge-auxiliary-mining-where-supported-network-aware-mining-allocation",
  "title": "Network-Aware Mining Allocation",
  "level": "STRATEGY",
  "parent": "type-mining-proof-of-work-participation-merge-auxiliary-mining-where-supported"
 },
 {
  "id": "strategy-perpetual-trading-long-perpetual-position-directional-long-perpetual",
  "title": "Directional Long Perpetual",
  "level": "STRATEGY",
  "parent": "type-perpetual-trading-long-perpetual-position"
 },
 {
  "id": "strategy-perpetual-trading-short-perpetual-position-directional-short-perpetual",
  "title": "Directional Short Perpetual",
  "level": "STRATEGY",
  "parent": "type-perpetual-trading-short-perpetual-position"
 },
 {
  "id": "strategy-perpetual-trading-long-perpetual-position-delta-hedged-perpetual",
  "title": "Delta-Hedged Perpetual",
  "level": "STRATEGY",
  "parent": "type-perpetual-trading-long-perpetual-position"
 },
 {
  "id": "strategy-perpetual-trading-long-perpetual-position-basis-funding-positioning",
  "title": "Basis/Funding Positioning",
  "level": "STRATEGY",
  "parent": "type-perpetual-trading-long-perpetual-position"
 },
 {
  "id": "strategy-perpetual-trading-long-perpetual-position-funding-aware-positioning",
  "title": "Funding-Aware Positioning",
  "level": "STRATEGY",
  "parent": "type-perpetual-trading-long-perpetual-position"
 },
 {
  "id": "strategy-perpetual-trading-cross-margin-perpetual-market-neutral-perpetual-positioning",
  "title": "Market-Neutral Perpetual Positioning",
  "level": "STRATEGY",
  "parent": "type-perpetual-trading-cross-margin-perpetual"
 },
 {
  "id": "strategy-perpetual-trading-isolated-margin-perpetual-margin-aware-position-management",
  "title": "Margin-Aware Position Management",
  "level": "STRATEGY",
  "parent": "type-perpetual-trading-isolated-margin-perpetual"
 },
 {
  "id": "strategy-futures-trading-long-futures-position-directional-long-futures",
  "title": "Directional Long Futures",
  "level": "STRATEGY",
  "parent": "type-futures-trading-long-futures-position"
 },
 {
  "id": "strategy-futures-trading-short-futures-position-directional-short-futures",
  "title": "Directional Short Futures",
  "level": "STRATEGY",
  "parent": "type-futures-trading-short-futures-position"
 },
 {
  "id": "strategy-futures-trading-fixed-maturity-future-calendar-spread-positioning",
  "title": "Calendar-Spread Positioning",
  "level": "STRATEGY",
  "parent": "type-futures-trading-fixed-maturity-future"
 },
 {
  "id": "strategy-futures-trading-fixed-maturity-future-basis-positioning",
  "title": "Basis Positioning",
  "level": "STRATEGY",
  "parent": "type-futures-trading-fixed-maturity-future"
 },
 {
  "id": "strategy-futures-trading-long-futures-position-futures-hedging",
  "title": "Futures Hedging",
  "level": "STRATEGY",
  "parent": "type-futures-trading-long-futures-position"
 },
 {
  "id": "strategy-futures-trading-long-futures-position-market-neutral-futures-positioning",
  "title": "Market-Neutral Futures Positioning",
  "level": "STRATEGY",
  "parent": "type-futures-trading-long-futures-position"
 },
 {
  "id": "strategy-options-trading-writing-call-option-position-long-call",
  "title": "Long Call",
  "level": "STRATEGY",
  "parent": "type-options-trading-writing-call-option-position"
 },
 {
  "id": "strategy-options-trading-writing-put-option-position-long-put",
  "title": "Long Put",
  "level": "STRATEGY",
  "parent": "type-options-trading-writing-put-option-position"
 },
 {
  "id": "strategy-options-trading-writing-call-option-position-covered-call",
  "title": "Covered Call",
  "level": "STRATEGY",
  "parent": "type-options-trading-writing-call-option-position"
 },
 {
  "id": "strategy-options-trading-writing-put-option-position-cash-secured-put",
  "title": "Cash-Secured Put",
  "level": "STRATEGY",
  "parent": "type-options-trading-writing-put-option-position"
 },
 {
  "id": "strategy-options-trading-writing-put-option-position-protective-put",
  "title": "Protective Put",
  "level": "STRATEGY",
  "parent": "type-options-trading-writing-put-option-position"
 },
 {
  "id": "strategy-options-trading-writing-call-option-position-call-spread",
  "title": "Call Spread",
  "level": "STRATEGY",
  "parent": "type-options-trading-writing-call-option-position"
 },
 {
  "id": "strategy-options-trading-writing-put-option-position-put-spread",
  "title": "Put Spread",
  "level": "STRATEGY",
  "parent": "type-options-trading-writing-put-option-position"
 },
 {
  "id": "strategy-options-trading-writing-call-option-position-collar",
  "title": "Collar",
  "level": "STRATEGY",
  "parent": "type-options-trading-writing-call-option-position"
 },
 {
  "id": "strategy-options-trading-writing-option-buying-straddle",
  "title": "Straddle",
  "level": "STRATEGY",
  "parent": "type-options-trading-writing-option-buying"
 },
 {
  "id": "strategy-options-trading-writing-option-buying-strangle",
  "title": "Strangle",
  "level": "STRATEGY",
  "parent": "type-options-trading-writing-option-buying"
 },
 {
  "id": "strategy-synthetic-assets-cdp-systems-overcollateralized-synthetic-issuance-collateralized-synthetic-minting",
  "title": "Collateralized Synthetic Minting",
  "level": "STRATEGY",
  "parent": "type-synthetic-assets-cdp-systems-overcollateralized-synthetic-issuance"
 },
 {
  "id": "strategy-synthetic-assets-cdp-systems-synthetic-asset-position-synthetic-exposure",
  "title": "Synthetic Exposure",
  "level": "STRATEGY",
  "parent": "type-synthetic-assets-cdp-systems-synthetic-asset-position"
 },
 {
  "id": "strategy-synthetic-assets-cdp-systems-collateralized-debt-position-collateral-ratio-management",
  "title": "Collateral-Ratio Management",
  "level": "STRATEGY",
  "parent": "type-synthetic-assets-cdp-systems-collateralized-debt-position"
 },
 {
  "id": "strategy-synthetic-assets-cdp-systems-collateralized-debt-position-debt-position-management",
  "title": "Debt Position Management",
  "level": "STRATEGY",
  "parent": "type-synthetic-assets-cdp-systems-collateralized-debt-position"
 },
 {
  "id": "strategy-synthetic-assets-cdp-systems-synthetic-market-position-synthetic-asset-hedging",
  "title": "Synthetic Asset Hedging",
  "level": "STRATEGY",
  "parent": "type-synthetic-assets-cdp-systems-synthetic-market-position"
 },
 {
  "id": "strategy-synthetic-assets-cdp-systems-multi-collateral-cdp-multi-collateral-allocation",
  "title": "Multi-Collateral Allocation",
  "level": "STRATEGY",
  "parent": "type-synthetic-assets-cdp-systems-multi-collateral-cdp"
 },
 {
  "id": "strategy-governance-participation-token-holder-governance-direct-governance-voting",
  "title": "Direct Governance Voting",
  "level": "STRATEGY",
  "parent": "type-governance-participation-token-holder-governance"
 },
 {
  "id": "strategy-governance-participation-delegated-governance-governance-delegation",
  "title": "Governance Delegation",
  "level": "STRATEGY",
  "parent": "type-governance-participation-delegated-governance"
 },
 {
  "id": "strategy-governance-participation-representative-delegate-governance-delegate-selection",
  "title": "Delegate Selection",
  "level": "STRATEGY",
  "parent": "type-governance-participation-representative-delegate-governance"
 },
 {
  "id": "strategy-governance-participation-proposal-governance-proposal-participation",
  "title": "Proposal Participation",
  "level": "STRATEGY",
  "parent": "type-governance-participation-proposal-governance"
 },
 {
  "id": "strategy-governance-participation-proposal-governance-proposal-evaluation",
  "title": "Proposal Evaluation",
  "level": "STRATEGY",
  "parent": "type-governance-participation-proposal-governance"
 },
 {
  "id": "strategy-governance-participation-token-holder-governance-voting-power-allocation",
  "title": "Voting-Power Allocation",
  "level": "STRATEGY",
  "parent": "type-governance-participation-token-holder-governance"
 },
 {
  "id": "strategy-governance-participation-treasury-governance-treasury-governance-participation",
  "title": "Treasury Governance Participation",
  "level": "STRATEGY",
  "parent": "type-governance-participation-treasury-governance"
 },
 {
  "id": "strategy-gauge-incentive-markets-gauge-weight-market-gauge-weight-allocation",
  "title": "Gauge-Weight Allocation",
  "level": "STRATEGY",
  "parent": "type-gauge-incentive-markets-gauge-weight-market"
 },
 {
  "id": "strategy-gauge-incentive-markets-vote-incentive-market-vote-incentive-participation",
  "title": "Vote-Incentive Participation",
  "level": "STRATEGY",
  "parent": "type-gauge-incentive-markets-vote-incentive-market"
 },
 {
  "id": "strategy-gauge-incentive-markets-liquidity-gauge-multi-gauge-allocation",
  "title": "Multi-Gauge Allocation",
  "level": "STRATEGY",
  "parent": "type-gauge-incentive-markets-liquidity-gauge"
 },
 {
  "id": "strategy-gauge-incentive-markets-liquidity-gauge-incentive-aware-gauge-selection",
  "title": "Incentive-Aware Gauge Selection",
  "level": "STRATEGY",
  "parent": "type-gauge-incentive-markets-liquidity-gauge"
 },
 {
  "id": "strategy-gauge-incentive-markets-cross-chain-gauge-cross-chain-gauge-allocation",
  "title": "Cross-Chain Gauge Allocation",
  "level": "STRATEGY",
  "parent": "type-gauge-incentive-markets-cross-chain-gauge"
 },
 {
  "id": "strategy-gauge-incentive-markets-permissionless-reward-gauge-reward-source-diversification",
  "title": "Reward-Source Diversification",
  "level": "STRATEGY",
  "parent": "type-gauge-incentive-markets-permissionless-reward-gauge"
 },
 {
  "id": "strategy-insurance-risk-underwriting-protocol-cover-cover-purchase-allocation",
  "title": "Cover Purchase/Allocation",
  "level": "STRATEGY",
  "parent": "type-insurance-risk-underwriting-protocol-cover"
 },
 {
  "id": "strategy-insurance-risk-underwriting-protocol-cover-multi-risk-cover-allocation",
  "title": "Multi-Risk Cover Allocation",
  "level": "STRATEGY",
  "parent": "type-insurance-risk-underwriting-protocol-cover"
 },
 {
  "id": "strategy-insurance-risk-underwriting-underwriting-pool-underwriting-allocation",
  "title": "Underwriting Allocation",
  "level": "STRATEGY",
  "parent": "type-insurance-risk-underwriting-underwriting-pool"
 },
 {
  "id": "strategy-insurance-risk-underwriting-risk-sharing-pool-risk-pool-diversification",
  "title": "Risk-Pool Diversification",
  "level": "STRATEGY",
  "parent": "type-insurance-risk-underwriting-risk-sharing-pool"
 },
 {
  "id": "strategy-insurance-risk-underwriting-protocol-cover-coverage-limit-selection",
  "title": "Coverage-Limit Selection",
  "level": "STRATEGY",
  "parent": "type-insurance-risk-underwriting-protocol-cover"
 },
 {
  "id": "strategy-insurance-risk-underwriting-protocol-cover-coverage-duration-selection",
  "title": "Coverage-Duration Selection",
  "level": "STRATEGY",
  "parent": "type-insurance-risk-underwriting-protocol-cover"
 },
 {
  "id": "strategy-insurance-risk-underwriting-underwriting-pool-underwriting-capacity-allocation",
  "title": "Underwriting Capacity Allocation",
  "level": "STRATEGY",
  "parent": "type-insurance-risk-underwriting-underwriting-pool"
 },
 {
  "id": "type-payments-settlement-peer-to-peer-payment",
  "title": "Peer-to-Peer Payment",
  "level": "TYPE",
  "parent": "major-payments-settlement"
 },
 {
  "id": "type-payments-settlement-merchant-payment",
  "title": "Merchant Payment",
  "level": "TYPE",
  "parent": "major-payments-settlement"
 },
 {
  "id": "type-payments-settlement-stablecoin-payment",
  "title": "Stablecoin Payment",
  "level": "TYPE",
  "parent": "major-payments-settlement"
 },
 {
  "id": "type-payments-settlement-recurring-payment",
  "title": "Recurring Payment",
  "level": "TYPE",
  "parent": "major-payments-settlement"
 },
 {
  "id": "type-payments-settlement-streaming-payment",
  "title": "Streaming Payment",
  "level": "TYPE",
  "parent": "major-payments-settlement"
 },
 {
  "id": "type-payments-settlement-payroll-distribution",
  "title": "Payroll/Distribution",
  "level": "TYPE",
  "parent": "major-payments-settlement"
 },
 {
  "id": "type-payments-settlement-cross-chain-payment",
  "title": "Cross-Chain Payment",
  "level": "TYPE",
  "parent": "major-payments-settlement"
 },
 {
  "id": "type-payments-settlement-payment-routing",
  "title": "Payment Routing",
  "level": "TYPE",
  "parent": "major-payments-settlement"
 },
 {
  "id": "type-real-world-asset-finance-tokenized-fund-interest",
  "title": "Tokenized Fund Interest",
  "level": "TYPE",
  "parent": "major-real-world-asset-finance"
 },
 {
  "id": "type-real-world-asset-finance-tokenized-public-debt-instrument",
  "title": "Tokenized Public-Debt Instrument",
  "level": "TYPE",
  "parent": "major-real-world-asset-finance"
 },
 {
  "id": "type-real-world-asset-finance-tokenized-real-estate-interest",
  "title": "Tokenized Real-Estate Interest",
  "level": "TYPE",
  "parent": "major-real-world-asset-finance"
 },
 {
  "id": "type-real-world-asset-finance-tokenized-commodity-interest",
  "title": "Tokenized Commodity Interest",
  "level": "TYPE",
  "parent": "major-real-world-asset-finance"
 },
 {
  "id": "type-real-world-asset-finance-tokenized-revenue-royalty-interest",
  "title": "Tokenized Revenue/Royalty Interest",
  "level": "TYPE",
  "parent": "major-real-world-asset-finance"
 },
 {
  "id": "type-real-world-asset-finance-nav-based-rwa-share",
  "title": "NAV-Based RWA Share",
  "level": "TYPE",
  "parent": "major-real-world-asset-finance"
 },
 {
  "id": "type-real-world-asset-finance-rwa-secondary-market-interest",
  "title": "RWA Secondary-Market Interest",
  "level": "TYPE",
  "parent": "major-real-world-asset-finance"
 },
 {
  "id": "type-structured-credit-tranche-finance-senior-credit-tranche",
  "title": "Senior Credit Tranche",
  "level": "TYPE",
  "parent": "major-structured-credit-tranche-finance"
 },
 {
  "id": "type-structured-credit-tranche-finance-mezzanine-credit-tranche",
  "title": "Mezzanine Credit Tranche",
  "level": "TYPE",
  "parent": "major-structured-credit-tranche-finance"
 },
 {
  "id": "type-structured-credit-tranche-finance-junior-first-loss-tranche",
  "title": "Junior/First-Loss Tranche",
  "level": "TYPE",
  "parent": "major-structured-credit-tranche-finance"
 },
 {
  "id": "type-structured-credit-tranche-finance-private-credit-pool-interest",
  "title": "Private-Credit Pool Interest",
  "level": "TYPE",
  "parent": "major-structured-credit-tranche-finance"
 },
 {
  "id": "type-structured-credit-tranche-finance-receivable-finance-interest",
  "title": "Receivable-Finance Interest",
  "level": "TYPE",
  "parent": "major-structured-credit-tranche-finance"
 },
 {
  "id": "type-structured-credit-tranche-finance-trade-finance-interest",
  "title": "Trade-Finance Interest",
  "level": "TYPE",
  "parent": "major-structured-credit-tranche-finance"
 },
 {
  "id": "type-structured-credit-tranche-finance-tranched-credit-pool",
  "title": "Tranched Credit Pool",
  "level": "TYPE",
  "parent": "major-structured-credit-tranche-finance"
 },
 {
  "id": "type-nft-fi-nft-liquidity-pool",
  "title": "NFT Liquidity Pool",
  "level": "TYPE",
  "parent": "major-nft-fi"
 },
 {
  "id": "type-nft-fi-nft-rental-leasing-position",
  "title": "NFT Rental/Leasing Position",
  "level": "TYPE",
  "parent": "major-nft-fi"
 },
 {
  "id": "type-nft-fi-fractional-nft-interest",
  "title": "Fractional NFT Interest",
  "level": "TYPE",
  "parent": "major-nft-fi"
 },
 {
  "id": "type-nft-fi-nft-revenue-receivable-interest",
  "title": "NFT Revenue/Receivable Interest",
  "level": "TYPE",
  "parent": "major-nft-fi"
 },
 {
  "id": "type-nft-fi-nft-option-position",
  "title": "NFT Option Position",
  "level": "TYPE",
  "parent": "major-nft-fi"
 },
 {
  "id": "type-nft-fi-nft-portfolio-index-position",
  "title": "NFT Portfolio/Index Position",
  "level": "TYPE",
  "parent": "major-nft-fi"
 },
 {
  "id": "type-btcfi-native-btc-collateral-position",
  "title": "Native-BTC Collateral Position",
  "level": "TYPE",
  "parent": "major-btcfi"
 },
 {
  "id": "type-btcfi-bitcoin-linked-lending-market",
  "title": "Bitcoin-Linked Lending Market",
  "level": "TYPE",
  "parent": "major-btcfi"
 },
 {
  "id": "type-btcfi-bitcoin-security-staking-position",
  "title": "Bitcoin Security/Staking Position",
  "level": "TYPE",
  "parent": "major-btcfi"
 },
 {
  "id": "type-btcfi-bitcoin-liquidity-market",
  "title": "Bitcoin Liquidity Market",
  "level": "TYPE",
  "parent": "major-btcfi"
 },
 {
  "id": "type-btcfi-bitcoin-linked-yield-position",
  "title": "Bitcoin-Linked Yield Position",
  "level": "TYPE",
  "parent": "major-btcfi"
 },
 {
  "id": "type-btcfi-bitcoin-settlement-channel-position",
  "title": "Bitcoin Settlement-Channel Position",
  "level": "TYPE",
  "parent": "major-btcfi"
 },
 {
  "id": "type-btcfi-bitcoin-linked-synthetic-position",
  "title": "Bitcoin-Linked Synthetic Position",
  "level": "TYPE",
  "parent": "major-btcfi"
 },
 {
  "id": "type-depin-compute-participation-decentralized-compute-provision",
  "title": "Decentralized Compute Provision",
  "level": "TYPE",
  "parent": "major-depin-compute-participation"
 },
 {
  "id": "type-depin-compute-participation-decentralized-storage-provision",
  "title": "Decentralized Storage Provision",
  "level": "TYPE",
  "parent": "major-depin-compute-participation"
 },
 {
  "id": "type-depin-compute-participation-decentralized-retrieval-provision",
  "title": "Decentralized Retrieval Provision",
  "level": "TYPE",
  "parent": "major-depin-compute-participation"
 },
 {
  "id": "type-depin-compute-participation-connectivity-bandwidth-provision",
  "title": "Connectivity/Bandwidth Provision",
  "level": "TYPE",
  "parent": "major-depin-compute-participation"
 },
 {
  "id": "type-depin-compute-participation-sensor-data-collection-provision",
  "title": "Sensor/Data Collection Provision",
  "level": "TYPE",
  "parent": "major-depin-compute-participation"
 },
 {
  "id": "type-depin-compute-participation-mapping-location-infrastructure",
  "title": "Mapping/Location Infrastructure",
  "level": "TYPE",
  "parent": "major-depin-compute-participation"
 },
 {
  "id": "type-depin-compute-participation-decentralized-energy-infrastructure",
  "title": "Decentralized Energy Infrastructure",
  "level": "TYPE",
  "parent": "major-depin-compute-participation"
 },
 {
  "id": "type-prediction-oracle-markets-binary-outcome-prediction-market",
  "title": "Binary-Outcome Prediction Market",
  "level": "TYPE",
  "parent": "major-prediction-oracle-markets"
 },
 {
  "id": "type-prediction-oracle-markets-multi-outcome-prediction-market",
  "title": "Multi-Outcome Prediction Market",
  "level": "TYPE",
  "parent": "major-prediction-oracle-markets"
 },
 {
  "id": "type-prediction-oracle-markets-scalar-prediction-market",
  "title": "Scalar Prediction Market",
  "level": "TYPE",
  "parent": "major-prediction-oracle-markets"
 },
 {
  "id": "type-prediction-oracle-markets-conditional-prediction-market",
  "title": "Conditional Prediction Market",
  "level": "TYPE",
  "parent": "major-prediction-oracle-markets"
 },
 {
  "id": "type-prediction-oracle-markets-data-feed-oracle-market",
  "title": "Data-Feed Oracle Market",
  "level": "TYPE",
  "parent": "major-prediction-oracle-markets"
 },
 {
  "id": "type-prediction-oracle-markets-event-resolution-oracle-market",
  "title": "Event-Resolution Oracle Market",
  "level": "TYPE",
  "parent": "major-prediction-oracle-markets"
 },
 {
  "id": "type-prediction-oracle-markets-decentralized-oracle-reporting",
  "title": "Decentralized Oracle Reporting",
  "level": "TYPE",
  "parent": "major-prediction-oracle-markets"
 },
 {
  "id": "strategy-real-world-asset-finance-tokenized-fund-interest-rwa-asset-class-allocation",
  "title": "RWA Asset-Class Allocation",
  "level": "STRATEGY",
  "parent": "type-real-world-asset-finance-tokenized-fund-interest"
 },
 {
  "id": "strategy-real-world-asset-finance-tokenized-public-debt-instrument-maturity-aware-rwa-allocation",
  "title": "Maturity-Aware RWA Allocation",
  "level": "STRATEGY",
  "parent": "type-real-world-asset-finance-tokenized-public-debt-instrument"
 },
 {
  "id": "strategy-real-world-asset-finance-nav-based-rwa-share-nav-aware-rwa-participation",
  "title": "NAV-Aware RWA Participation",
  "level": "STRATEGY",
  "parent": "type-real-world-asset-finance-nav-based-rwa-share"
 },
 {
  "id": "strategy-real-world-asset-finance-tokenized-public-debt-instrument-rwa-duration-allocation",
  "title": "RWA Duration Allocation",
  "level": "STRATEGY",
  "parent": "type-real-world-asset-finance-tokenized-public-debt-instrument"
 },
 {
  "id": "strategy-real-world-asset-finance-rwa-secondary-market-interest-rwa-liquidity-aware-allocation",
  "title": "RWA Liquidity-Aware Allocation",
  "level": "STRATEGY",
  "parent": "type-real-world-asset-finance-rwa-secondary-market-interest"
 },
 {
  "id": "strategy-real-world-asset-finance-tokenized-revenue-royalty-interest-rwa-cash-flow-allocation",
  "title": "RWA Cash-Flow Allocation",
  "level": "STRATEGY",
  "parent": "type-real-world-asset-finance-tokenized-revenue-royalty-interest"
 },
 {
  "id": "strategy-real-world-asset-finance-tokenized-fund-interest-diversified-tokenized-asset-allocation",
  "title": "Diversified Tokenized-Asset Allocation",
  "level": "STRATEGY",
  "parent": "type-real-world-asset-finance-tokenized-fund-interest"
 },
 {
  "id": "strategy-structured-credit-tranche-finance-senior-credit-tranche-seniority-based-credit-allocation",
  "title": "Seniority-Based Credit Allocation",
  "level": "STRATEGY",
  "parent": "type-structured-credit-tranche-finance-senior-credit-tranche"
 },
 {
  "id": "strategy-structured-credit-tranche-finance-mezzanine-credit-tranche-mezzanine-tranche-allocation",
  "title": "Mezzanine-Tranche Allocation",
  "level": "STRATEGY",
  "parent": "type-structured-credit-tranche-finance-mezzanine-credit-tranche"
 },
 {
  "id": "strategy-structured-credit-tranche-finance-junior-first-loss-tranche-first-loss-capital-allocation",
  "title": "First-Loss Capital Allocation",
  "level": "STRATEGY",
  "parent": "type-structured-credit-tranche-finance-junior-first-loss-tranche"
 },
 {
  "id": "strategy-structured-credit-tranche-finance-tranched-credit-pool-multi-tranche-credit-allocation",
  "title": "Multi-Tranche Credit Allocation",
  "level": "STRATEGY",
  "parent": "type-structured-credit-tranche-finance-tranched-credit-pool"
 },
 {
  "id": "strategy-structured-credit-tranche-finance-tranched-credit-pool-waterfall-aware-credit-allocation",
  "title": "Waterfall-Aware Credit Allocation",
  "level": "STRATEGY",
  "parent": "type-structured-credit-tranche-finance-tranched-credit-pool"
 },
 {
  "id": "strategy-structured-credit-tranche-finance-private-credit-pool-interest-maturity-aware-credit-allocation",
  "title": "Maturity-Aware Credit Allocation",
  "level": "STRATEGY",
  "parent": "type-structured-credit-tranche-finance-private-credit-pool-interest"
 },
 {
  "id": "strategy-structured-credit-tranche-finance-receivable-finance-interest-receivable-diversification-allocation",
  "title": "Receivable-Diversification Allocation",
  "level": "STRATEGY",
  "parent": "type-structured-credit-tranche-finance-receivable-finance-interest"
 },
 {
  "id": "strategy-nft-fi-nft-liquidity-pool-nft-liquidity-allocation",
  "title": "NFT Liquidity Allocation",
  "level": "STRATEGY",
  "parent": "type-nft-fi-nft-liquidity-pool"
 },
 {
  "id": "strategy-nft-fi-nft-rental-leasing-position-nft-rental-term-selection",
  "title": "NFT Rental-Term Selection",
  "level": "STRATEGY",
  "parent": "type-nft-fi-nft-rental-leasing-position"
 },
 {
  "id": "strategy-nft-fi-fractional-nft-interest-fractional-nft-allocation",
  "title": "Fractional NFT Allocation",
  "level": "STRATEGY",
  "parent": "type-nft-fi-fractional-nft-interest"
 },
 {
  "id": "strategy-nft-fi-nft-portfolio-index-position-nft-portfolio-diversification",
  "title": "NFT Portfolio Diversification",
  "level": "STRATEGY",
  "parent": "type-nft-fi-nft-portfolio-index-position"
 },
 {
  "id": "strategy-nft-fi-nft-revenue-receivable-interest-nft-revenue-right-allocation",
  "title": "NFT Revenue-Right Allocation",
  "level": "STRATEGY",
  "parent": "type-nft-fi-nft-revenue-receivable-interest"
 },
 {
  "id": "strategy-nft-fi-nft-option-position-nft-protective-option-positioning",
  "title": "NFT Protective Option Positioning",
  "level": "STRATEGY",
  "parent": "type-nft-fi-nft-option-position"
 },
 {
  "id": "strategy-btcfi-native-btc-collateral-position-native-btc-collateral-allocation",
  "title": "Native-BTC Collateral Allocation",
  "level": "STRATEGY",
  "parent": "type-btcfi-native-btc-collateral-position"
 },
 {
  "id": "strategy-btcfi-bitcoin-linked-lending-market-bitcoin-lending-allocation",
  "title": "Bitcoin Lending Allocation",
  "level": "STRATEGY",
  "parent": "type-btcfi-bitcoin-linked-lending-market"
 },
 {
  "id": "strategy-btcfi-bitcoin-security-staking-position-bitcoin-security-allocation",
  "title": "Bitcoin Security Allocation",
  "level": "STRATEGY",
  "parent": "type-btcfi-bitcoin-security-staking-position"
 },
 {
  "id": "strategy-btcfi-bitcoin-liquidity-market-bitcoin-liquidity-allocation",
  "title": "Bitcoin Liquidity Allocation",
  "level": "STRATEGY",
  "parent": "type-btcfi-bitcoin-liquidity-market"
 },
 {
  "id": "strategy-btcfi-bitcoin-linked-yield-position-bitcoin-yield-source-diversification",
  "title": "Bitcoin Yield-Source Diversification",
  "level": "STRATEGY",
  "parent": "type-btcfi-bitcoin-linked-yield-position"
 },
 {
  "id": "strategy-btcfi-bitcoin-settlement-channel-position-settlement-channel-liquidity-allocation",
  "title": "Settlement-Channel Liquidity Allocation",
  "level": "STRATEGY",
  "parent": "type-btcfi-bitcoin-settlement-channel-position"
 },
 {
  "id": "strategy-btcfi-bitcoin-linked-synthetic-position-bitcoin-synthetic-hedging",
  "title": "Bitcoin Synthetic Hedging",
  "level": "STRATEGY",
  "parent": "type-btcfi-bitcoin-linked-synthetic-position"
 },
 {
  "id": "strategy-depin-compute-participation-decentralized-compute-provision-compute-workload-allocation",
  "title": "Compute Workload Allocation",
  "level": "STRATEGY",
  "parent": "type-depin-compute-participation-decentralized-compute-provision"
 },
 {
  "id": "strategy-depin-compute-participation-decentralized-storage-provision-storage-capacity-allocation",
  "title": "Storage Capacity Allocation",
  "level": "STRATEGY",
  "parent": "type-depin-compute-participation-decentralized-storage-provision"
 },
 {
  "id": "strategy-depin-compute-participation-decentralized-retrieval-provision-retrieval-capacity-allocation",
  "title": "Retrieval Capacity Allocation",
  "level": "STRATEGY",
  "parent": "type-depin-compute-participation-decentralized-retrieval-provision"
 },
 {
  "id": "strategy-depin-compute-participation-connectivity-bandwidth-provision-bandwidth-aware-resource-allocation",
  "title": "Bandwidth-Aware Resource Allocation",
  "level": "STRATEGY",
  "parent": "type-depin-compute-participation-connectivity-bandwidth-provision"
 },
 {
  "id": "strategy-depin-compute-participation-mapping-location-infrastructure-geographic-resource-allocation",
  "title": "Geographic Resource Allocation",
  "level": "STRATEGY",
  "parent": "type-depin-compute-participation-mapping-location-infrastructure"
 },
 {
  "id": "strategy-depin-compute-participation-decentralized-compute-provision-utilization-aware-compute-allocation",
  "title": "Utilization-Aware Compute Allocation",
  "level": "STRATEGY",
  "parent": "type-depin-compute-participation-decentralized-compute-provision"
 },
 {
  "id": "strategy-depin-compute-participation-decentralized-compute-provision-multi-network-resource-allocation",
  "title": "Multi-Network Resource Allocation",
  "level": "STRATEGY",
  "parent": "type-depin-compute-participation-decentralized-compute-provision"
 },
 {
  "id": "strategy-prediction-oracle-markets-multi-outcome-prediction-market-prediction-market-diversification",
  "title": "Prediction-Market Diversification",
  "level": "STRATEGY",
  "parent": "type-prediction-oracle-markets-multi-outcome-prediction-market"
 },
 {
  "id": "strategy-prediction-oracle-markets-binary-outcome-prediction-market-probability-aware-positioning",
  "title": "Probability-Aware Positioning",
  "level": "STRATEGY",
  "parent": "type-prediction-oracle-markets-binary-outcome-prediction-market"
 },
 {
  "id": "strategy-prediction-oracle-markets-multi-outcome-prediction-market-multi-outcome-allocation",
  "title": "Multi-Outcome Allocation",
  "level": "STRATEGY",
  "parent": "type-prediction-oracle-markets-multi-outcome-prediction-market"
 },
 {
  "id": "strategy-prediction-oracle-markets-conditional-prediction-market-conditional-market-positioning",
  "title": "Conditional-Market Positioning",
  "level": "STRATEGY",
  "parent": "type-prediction-oracle-markets-conditional-prediction-market"
 },
 {
  "id": "strategy-prediction-oracle-markets-data-feed-oracle-market-oracle-data-source-diversification",
  "title": "Oracle Data-Source Diversification",
  "level": "STRATEGY",
  "parent": "type-prediction-oracle-markets-data-feed-oracle-market"
 },
 {
  "id": "strategy-prediction-oracle-markets-decentralized-oracle-reporting-multi-reporter-oracle-participation",
  "title": "Multi-Reporter Oracle Participation",
  "level": "STRATEGY",
  "parent": "type-prediction-oracle-markets-decentralized-oracle-reporting"
 },
 {
  "id": "strategy-prediction-oracle-markets-event-resolution-oracle-market-resolution-rule-aware-participation",
  "title": "Resolution-Rule-Aware Participation",
  "level": "STRATEGY",
  "parent": "type-prediction-oracle-markets-event-resolution-oracle-market"
 },
 {
  "id": "type-real-world-asset-finance-tokenized-equity-interest",
  "title": "Tokenized Equity Interest",
  "level": "TYPE",
  "parent": "major-real-world-asset-finance"
 },
 {
  "id": "strategy-real-world-asset-finance-tokenized-equity-interest-tokenized-equity-allocation",
  "title": "Tokenized Equity Allocation",
  "level": "STRATEGY",
  "parent": "type-real-world-asset-finance-tokenized-equity-interest"
 }
];

export const ENCYCLOPEDIA_COUNTS = {
  families: 28,
  majors: 60,
  types: 334,
  strategies: 404,
  actions: 0,
  subActions: 0,
  total: 826,
} as const;
