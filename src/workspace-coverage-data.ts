/* GENERATED 2026-11-23 by scripts/generate-workspace-coverage.mjs
 * from js/crypto-workspace-registry.js joined to the frozen
 * canonical-60. The registry's recorded workspace coverage:
 * which backbone Major Activities (primary + secondary), families,
 * entity kinds and bot-role codes each workspace carries — exactly
 * as recorded in the canonical registry (CW-1 resolver data).
 * DO NOT HAND-EDIT — regenerate instead. */

export interface WorkspaceCoverage {
  majors: string[];
  secondaryMajors: string[];
  families: string[];
  entityKinds: string[];
  botRoles: string[];
}

export const WORKSPACE_COVERAGE: Record<string, WorkspaceCoverage> = {
 "home": {
  "majors": [],
  "secondaryMajors": [
   "major-hold-store-assets"
  ],
  "families": [
   "ALL"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "ALL"
  ]
 },
 "globe": {
  "majors": [],
  "secondaryMajors": [],
  "families": [
   "ALL"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "NET",
   "AST",
   "PRO",
   "SRD"
  ]
 },
 "markets-assets": {
  "majors": [
   "major-wrap-unwrap-assets"
  ],
  "secondaryMajors": [
   "major-payments-settlement",
   "major-spot-trading",
   "major-stablecoin-peg-arbitrage",
   "major-stablecoin-yield-strategies"
  ],
  "families": [
   "family-wallet-asset-operations",
   "family-trading-markets",
   "family-swaps-routing",
   "family-payments-settlement"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "AST",
   "MKT",
   "VAL",
   "SRD"
  ]
 },
 "networks": {
  "majors": [],
  "secondaryMajors": [],
  "families": [
   "family-cross-chain",
   "family-mining-nodes-validators",
   "family-btcfi",
   "family-prediction-oracles"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "NET",
   "INF",
   "VAL",
   "SRD"
  ]
 },
 "protocols": {
  "majors": [],
  "secondaryMajors": [
   "major-governance-participation"
  ],
  "families": [
   "ALL"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "PRO",
   "VAL",
   "SRD",
   "SEC"
  ]
 },
 "opportunities": {
  "majors": [],
  "secondaryMajors": [],
  "families": [
   "ALL"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "MKT",
   "YLD",
   "ARB",
   "RSK",
   "VAL"
  ]
 },
 "positions": {
  "majors": [],
  "secondaryMajors": [],
  "families": [
   "ALL"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "VAL"
  ]
 },
 "portfolio": {
  "majors": [
   "major-hold-store-assets",
   "major-transfer-assets"
  ],
  "secondaryMajors": [
   "major-asset-permission-management"
  ],
  "families": [
   "family-wallet-asset-operations"
  ],
  "entityKinds": [
   "networks",
   "assets"
  ],
  "botRoles": [
   "AST",
   "VAL"
  ]
 },
 "intelligence": {
  "majors": [],
  "secondaryMajors": [
   "major-algorithmic-strategy-trading"
  ],
  "families": [
   "ALL"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "ALL"
  ]
 },
 "risk": {
  "majors": [],
  "secondaryMajors": [
   "major-insurance-risk-underwriting",
   "major-liquidations"
  ],
  "families": [
   "ALL"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "RSK",
   "SEC",
   "VAL"
  ]
 },
 "security": {
  "majors": [
   "major-asset-permission-management"
  ],
  "secondaryMajors": [],
  "families": [
   "family-wallet-asset-operations"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "SEC",
   "RSK",
   "VAL"
  ]
 },
 "encyclopedia": {
  "majors": [],
  "secondaryMajors": [],
  "families": [
   "ALL"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "VAL",
   "SRD"
  ]
 },
 "live-data": {
  "majors": [],
  "secondaryMajors": [],
  "families": [
   "ALL"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "MKT",
   "VAL",
   "SRD"
  ]
 },
 "bot-ops": {
  "majors": [],
  "secondaryMajors": [],
  "families": [
   "ALL"
  ],
  "entityKinds": [],
  "botRoles": [
   "ALL"
  ]
 },
 "trading": {
  "majors": [
   "major-algorithmic-strategy-trading",
   "major-decentralized-market-making",
   "major-spot-trading"
  ],
  "secondaryMajors": [
   "major-just-in-time-liquidity"
  ],
  "families": [
   "family-trading-markets"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "MKT",
   "AST",
   "VAL"
  ]
 },
 "swap": {
  "majors": [
   "major-intent-based-execution",
   "major-token-swapping"
  ],
  "secondaryMajors": [
   "major-swap-aggregation-route-optimization",
   "major-triangular-cyclic-arbitrage",
   "major-wrap-unwrap-assets"
  ],
  "families": [
   "family-swaps-routing"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "MKT",
   "RTE",
   "VAL"
  ]
 },
 "dex-aggregation": {
  "majors": [
   "major-swap-aggregation-route-optimization"
  ],
  "secondaryMajors": [
   "major-cross-dex-arbitrage",
   "major-intent-based-execution",
   "major-token-swapping"
  ],
  "families": [
   "family-swaps-routing",
   "family-arbitrage"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "MKT",
   "RTE",
   "SRD",
   "COD"
  ]
 },
 "cex-intelligence": {
  "majors": [],
  "secondaryMajors": [],
  "families": [],
  "entityKinds": [],
  "botRoles": [
   "MKT",
   "SRD",
   "COD"
  ]
 },
 "arbitrage": {
  "majors": [
   "major-cross-chain-arbitrage",
   "major-cross-dex-arbitrage",
   "major-flash-capital-arbitrage",
   "major-stablecoin-peg-arbitrage",
   "major-triangular-cyclic-arbitrage"
  ],
  "secondaryMajors": [
   "major-atomic-flash-credit"
  ],
  "families": [
   "family-arbitrage"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "ARB",
   "MKT",
   "RTE",
   "VAL"
  ]
 },
 "cross-chain-routing": {
  "majors": [
   "major-cross-chain-liquidity-provision",
   "major-cross-chain-routing-settlement"
  ],
  "secondaryMajors": [
   "major-bridging",
   "major-cross-chain-arbitrage",
   "major-intent-based-execution"
  ],
  "families": [
   "family-cross-chain"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "RTE",
   "NET",
   "VAL"
  ]
 },
 "bridge": {
  "majors": [
   "major-bridging"
  ],
  "secondaryMajors": [
   "major-cross-chain-liquidity-provision",
   "major-cross-chain-routing-settlement"
  ],
  "families": [
   "family-cross-chain"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "RTE",
   "SEC",
   "VAL"
  ]
 },
 "liquidity": {
  "majors": [
   "major-automated-liquidity-management",
   "major-concentrated-liquidity-provision",
   "major-just-in-time-liquidity",
   "major-programmable-hook-liquidity",
   "major-single-sided-liquidity",
   "major-standard-liquidity-provision"
  ],
  "secondaryMajors": [
   "major-cross-chain-liquidity-provision",
   "major-decentralized-market-making",
   "major-yield-farming-liquidity-mining"
  ],
  "families": [
   "family-liquidity"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "YLD",
   "MKT",
   "VAL"
  ]
 },
 "yield-farming": {
  "majors": [
   "major-stablecoin-yield-strategies",
   "major-yield-farming-liquidity-mining"
  ],
  "secondaryMajors": [
   "major-standard-liquidity-provision",
   "major-yield-aggregation-auto-compounding"
  ],
  "families": [
   "family-farming-yield"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "YLD",
   "VAL"
  ]
 },
 "staking": {
  "majors": [
   "major-native-staking",
   "major-protocol-token-staking"
  ],
  "secondaryMajors": [
   "major-btcfi",
   "major-liquid-staking",
   "major-restaking",
   "major-validator-operation"
  ],
  "families": [
   "family-staking-restaking"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "YLD",
   "NET",
   "VAL"
  ]
 },
 "liquid-staking": {
  "majors": [
   "major-liquid-staking"
  ],
  "secondaryMajors": [
   "major-liquid-restaking"
  ],
  "families": [
   "family-staking-restaking"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "YLD",
   "VAL"
  ]
 },
 "restaking": {
  "majors": [
   "major-liquid-restaking",
   "major-restaking"
  ],
  "secondaryMajors": [],
  "families": [
   "family-staking-restaking"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "YLD",
   "RSK",
   "VAL"
  ]
 },
 "lending": {
  "majors": [
   "major-asset-lending",
   "major-atomic-flash-credit",
   "major-credit-delegation-undercollateralized-credit",
   "major-leveraged-recursive-lending",
   "major-liquidations"
  ],
  "secondaryMajors": [
   "major-btcfi",
   "major-collateralized-borrowing",
   "major-flash-capital-arbitrage",
   "major-isolated-market-borrowing",
   "major-nft-fi",
   "major-yield-fixed-rate-trading"
  ],
  "families": [
   "family-lending-borrowing"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "YLD",
   "RSK",
   "VAL"
  ]
 },
 "borrowing": {
  "majors": [
   "major-collateralized-borrowing",
   "major-isolated-market-borrowing"
  ],
  "secondaryMajors": [
   "major-leveraged-recursive-lending",
   "major-liquidations"
  ],
  "families": [
   "family-lending-borrowing"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "YLD",
   "RSK",
   "VAL"
  ]
 },
 "vaults": {
  "majors": [
   "major-automated-strategy-vaults",
   "major-structured-product-vaults"
  ],
  "secondaryMajors": [
   "major-automated-liquidity-management",
   "major-options-trading-writing",
   "major-yield-aggregation-auto-compounding",
   "major-yield-tokenization"
  ],
  "families": [
   "family-vaults-structured"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "YLD",
   "VAL"
  ]
 },
 "yield-aggregation": {
  "majors": [
   "major-yield-aggregation-auto-compounding"
  ],
  "secondaryMajors": [
   "major-asset-lending",
   "major-automated-strategy-vaults",
   "major-stablecoin-yield-strategies",
   "major-yield-farming-liquidity-mining"
  ],
  "families": [
   "family-farming-yield"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "YLD",
   "VAL"
  ]
 },
 "yield-trading": {
  "majors": [
   "major-yield-fixed-rate-trading",
   "major-yield-tokenization"
  ],
  "secondaryMajors": [
   "major-structured-product-vaults"
  ],
  "families": [
   "family-vaults-structured"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "YLD",
   "MKT",
   "VAL"
  ]
 },
 "structured-credit": {
  "majors": [
   "major-structured-credit-tranche-finance"
  ],
  "secondaryMajors": [
   "major-credit-delegation-undercollateralized-credit",
   "major-real-world-asset-finance",
   "major-structured-product-vaults"
  ],
  "families": [
   "family-rwa-structured-credit",
   "family-lending-borrowing"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "YLD",
   "RSK",
   "VAL"
  ]
 },
 "perpetuals": {
  "majors": [
   "major-perpetual-trading"
  ],
  "secondaryMajors": [],
  "families": [
   "family-derivatives-synthetics"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "MKT",
   "RSK",
   "VAL"
  ]
 },
 "futures": {
  "majors": [
   "major-futures-trading"
  ],
  "secondaryMajors": [],
  "families": [
   "family-derivatives-synthetics"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "MKT",
   "VAL"
  ]
 },
 "options": {
  "majors": [
   "major-options-trading-writing"
  ],
  "secondaryMajors": [],
  "families": [
   "family-derivatives-synthetics"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "MKT",
   "VAL"
  ]
 },
 "synthetics-cdp": {
  "majors": [
   "major-synthetic-assets-cdp"
  ],
  "secondaryMajors": [],
  "families": [
   "family-derivatives-synthetics"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "PRO",
   "RSK",
   "VAL"
  ]
 },
 "margin-leverage": {
  "majors": [],
  "secondaryMajors": [
   "major-collateralized-borrowing",
   "major-futures-trading",
   "major-leveraged-recursive-lending",
   "major-liquidations",
   "major-perpetual-trading",
   "major-synthetic-assets-cdp"
  ],
  "families": [
   "family-lending-borrowing",
   "family-derivatives-synthetics"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "RSK",
   "VAL"
  ]
 },
 "mining": {
  "majors": [
   "major-mining-proof-of-work"
  ],
  "secondaryMajors": [],
  "families": [
   "family-mining-nodes-validators"
  ],
  "entityKinds": [
   "networks",
   "assets"
  ],
  "botRoles": [
   "INF",
   "NET",
   "VAL"
  ]
 },
 "validators": {
  "majors": [
   "major-validator-operation"
  ],
  "secondaryMajors": [
   "major-native-staking"
  ],
  "families": [
   "family-mining-nodes-validators"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "INF",
   "NET",
   "VAL"
  ]
 },
 "nodes": {
  "majors": [
   "major-node-operation"
  ],
  "secondaryMajors": [
   "major-validator-operation"
  ],
  "families": [
   "family-mining-nodes-validators"
  ],
  "entityKinds": [
   "networks",
   "protocols"
  ],
  "botRoles": [
   "INF",
   "NET",
   "VAL"
  ]
 },
 "rpc-infrastructure": {
  "majors": [],
  "secondaryMajors": [
   "major-node-operation"
  ],
  "families": [
   "family-mining-nodes-validators"
  ],
  "entityKinds": [
   "networks"
  ],
  "botRoles": [
   "INF",
   "SRD",
   "COD",
   "VAL"
  ]
 },
 "depin": {
  "majors": [
   "major-depin-compute-participation"
  ],
  "secondaryMajors": [],
  "families": [
   "family-depin-compute"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "INF",
   "NET",
   "SRD"
  ]
 },
 "ai-compute": {
  "majors": [],
  "secondaryMajors": [
   "major-depin-compute-participation"
  ],
  "families": [
   "family-depin-compute"
  ],
  "entityKinds": [
   "networks",
   "protocols"
  ],
  "botRoles": [
   "INF",
   "SRD",
   "VAL"
  ]
 },
 "modular": {
  "majors": [],
  "secondaryMajors": [],
  "families": [
   "family-modular-zk"
  ],
  "entityKinds": [
   "networks"
  ],
  "botRoles": [
   "INF",
   "NET",
   "SRD"
  ]
 },
 "identity": {
  "majors": [],
  "secondaryMajors": [],
  "families": [
   "family-privacy-identity"
  ],
  "entityKinds": [],
  "botRoles": [
   "INF",
   "SRD",
   "VAL"
  ]
 },
 "btcfi": {
  "majors": [
   "major-btcfi"
  ],
  "secondaryMajors": [
   "major-native-staking",
   "major-wrap-unwrap-assets"
  ],
  "families": [
   "family-btcfi"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "YLD",
   "PRO",
   "VAL"
  ]
 },
 "rwa": {
  "majors": [
   "major-real-world-asset-finance"
  ],
  "secondaryMajors": [
   "major-structured-credit-tranche-finance"
  ],
  "families": [
   "family-rwa-structured-credit"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "PRO",
   "AST",
   "VAL",
   "SRD"
  ]
 },
 "nftfi": {
  "majors": [
   "major-nft-fi"
  ],
  "secondaryMajors": [],
  "families": [
   "family-nftfi"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "AST",
   "MKT",
   "VAL"
  ]
 },
 "gamefi": {
  "majors": [],
  "secondaryMajors": [],
  "families": [
   "family-gamefi-socialfi-media"
  ],
  "entityKinds": [],
  "botRoles": [
   "AST",
   "SRD",
   "VAL"
  ]
 },
 "socialfi": {
  "majors": [],
  "secondaryMajors": [],
  "families": [
   "family-gamefi-socialfi-media"
  ],
  "entityKinds": [],
  "botRoles": [
   "AST",
   "SRD",
   "VAL"
  ]
 },
 "prediction": {
  "majors": [
   "major-prediction-oracle-markets"
  ],
  "secondaryMajors": [],
  "families": [
   "family-prediction-oracles"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "MKT",
   "VAL"
  ]
 },
 "oracle": {
  "majors": [],
  "secondaryMajors": [
   "major-prediction-oracle-markets",
   "major-synthetic-assets-cdp"
  ],
  "families": [
   "family-prediction-oracles"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "PRO",
   "NET",
   "VAL",
   "RSK"
  ]
 },
 "insurance": {
  "majors": [
   "major-insurance-risk-underwriting"
  ],
  "secondaryMajors": [],
  "families": [
   "family-insurance-risk"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "RSK",
   "PRO",
   "VAL"
  ]
 },
 "governance": {
  "majors": [
   "major-governance-participation"
  ],
  "secondaryMajors": [
   "major-gauge-incentive-markets"
  ],
  "families": [
   "family-governance-dao"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "GOV",
   "VAL"
  ]
 },
 "gauges": {
  "majors": [
   "major-gauge-incentive-markets"
  ],
  "secondaryMajors": [
   "major-protocol-token-staking"
  ],
  "families": [
   "family-governance-dao"
  ],
  "entityKinds": [
   "networks",
   "assets",
   "protocols"
  ],
  "botRoles": [
   "GOV",
   "YLD",
   "VAL"
  ]
 },
 "payments": {
  "majors": [
   "major-payments-settlement"
  ],
  "secondaryMajors": [
   "major-transfer-assets"
  ],
  "families": [
   "family-payments-settlement"
  ],
  "entityKinds": [
   "networks",
   "assets"
  ],
  "botRoles": [
   "AST",
   "NET",
   "VAL"
  ]
 }
};
