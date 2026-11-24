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
  status: string;
  worldLayer: string;
  defaultView: string;
  frame: string;
  ladderTop: string;
  gated: boolean;
  costClasses: string[];
  riskDimensions: string[];
  actions: string[];
  panelsNote: string;
  simulatorTemplate: string;
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
  ],
  "status": "PARTIAL",
  "worldLayer": "CRYPTO layer rollup",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "MONITOR",
  "gated": false,
  "costClasses": [
   "ALL"
  ],
  "riskDimensions": [
   "ALL"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source"
  ],
  "panelsNote": "FULL − Simulator action (health/entry surface, §5/§104)",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "PARTIAL",
  "worldLayer": "CRYPTO",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "MONITOR",
  "gated": false,
  "costClasses": [],
  "riskDimensions": [],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL − Costs/Risks panels render as layer state only",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "PARTIAL",
  "worldLayer": "MARKET",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "ANALYZE",
  "gated": false,
  "costClasses": [
   "TF",
   "SP",
   "NF"
  ],
  "riskDimensions": [
   "AS",
   "MK",
   "DF",
   "DP"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "PARTIAL",
  "worldLayer": "NETWORK",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "ANALYZE",
  "gated": false,
  "costClasses": [
   "NF",
   "IN"
  ],
  "riskDimensions": [
   "NW",
   "DP",
   "DF",
   "OR"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "PARTIAL",
  "worldLayer": "MARKET/YIELD/NETWORK",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "ANALYZE",
  "gated": false,
  "costClasses": [
   "PF",
   "NF"
  ],
  "riskDimensions": [
   "PR",
   "SC",
   "DP",
   "OR",
   "DF"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "PARTIAL",
  "worldLayer": "OPPORTUNITIES",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "PREPARE",
  "gated": false,
  "costClasses": [
   "ALL"
  ],
  "riskDimensions": [
   "ALL"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "ALL"
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
  ],
  "status": "PARTIAL",
  "worldLayer": "NONE",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "MONITOR",
  "gated": false,
  "costClasses": [
   "ALL"
  ],
  "riskDimensions": [
   "LV",
   "LQ",
   "MK",
   "DP"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source"
  ],
  "panelsNote": "FULL − Simulator action",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "PARTIAL",
  "worldLayer": "MY_COCKPIT",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "MONITOR",
  "gated": false,
  "costClasses": [
   "WD",
   "NF"
  ],
  "riskDimensions": [
   "AS",
   "CP",
   "DF"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source"
  ],
  "panelsNote": "FULL − Simulator action",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "PARTIAL",
  "worldLayer": "NONE",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "ANALYZE",
  "gated": false,
  "costClasses": [],
  "riskDimensions": [
   "DF",
   "DP"
  ],
  "actions": [
   "star",
   "world",
   "encyclopedia",
   "graph",
   "source"
  ],
  "panelsNote": "FULL − Simulator, Compare actions",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "PARTIAL",
  "worldLayer": "SECURITY_ALERTS",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "ANALYZE",
  "gated": false,
  "costClasses": [],
  "riskDimensions": [
   "ALL"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source"
  ],
  "panelsNote": "FULL − Simulator action",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "PARTIAL",
  "worldLayer": "SECURITY_ALERTS",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "ANALYZE",
  "gated": false,
  "costClasses": [],
  "riskDimensions": [
   "SC",
   "PR",
   "OP",
   "DP",
   "DF"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source"
  ],
  "panelsNote": "FULL − Simulator action",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "EXISTS",
  "worldLayer": "PER_RECORD",
  "defaultView": "STANDARD",
  "frame": "lite",
  "ladderTop": "MONITOR",
  "gated": false,
  "costClasses": [],
  "riskDimensions": [
   "DF"
  ],
  "actions": [
   "world",
   "graph",
   "source"
  ],
  "panelsNote": "Frame-lite: Header + Primary + Context + Intelligence[Sources, Freshness] + Actions[World, Graph, Source] (catalog surface, §72)",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "PARTIAL",
  "worldLayer": "NONE",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "MONITOR",
  "gated": false,
  "costClasses": [],
  "riskDimensions": [
   "DF"
  ],
  "actions": [
   "star",
   "world",
   "encyclopedia",
   "graph",
   "source"
  ],
  "panelsNote": "FULL − Simulator, Compare actions",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "PARTIAL",
  "worldLayer": "BOT_ACTIVITY",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "MONITOR",
  "gated": false,
  "costClasses": [],
  "riskDimensions": [
   "OP"
  ],
  "actions": [
   "star",
   "compare",
   "encyclopedia",
   "graph",
   "source"
  ],
  "panelsNote": "FULL − Simulator, World actions",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "MARKET",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "SIMULATE",
  "gated": false,
  "costClasses": [
   "TF",
   "SP",
   "SL",
   "NF"
  ],
  "riskDimensions": [
   "MK",
   "LQ",
   "LV",
   "DF"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Derivative Position"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "MARKET",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "SIMULATE",
  "gated": false,
  "costClasses": [
   "TF",
   "PF",
   "SL",
   "SP",
   "NF"
  ],
  "riskDimensions": [
   "LQ",
   "MK",
   "DF",
   "DP"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Swap"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "MARKET",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "SIMULATE",
  "gated": false,
  "costClasses": [
   "TF",
   "PF",
   "SL",
   "SP",
   "NF"
  ],
  "riskDimensions": [
   "LQ",
   "DP",
   "DF"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Swap"
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
  ],
  "status": "NOT IMPLEMENTED · NO CANONICAL FEED",
  "worldLayer": "NONE",
  "defaultView": "STANDARD",
  "frame": "lite",
  "ladderTop": "MONITOR",
  "gated": false,
  "costClasses": [
   "TF",
   "WD"
  ],
  "riskDimensions": [
   "CP",
   "MK",
   "DF"
  ],
  "actions": [
   "source"
  ],
  "panelsNote": "Frame-lite: Header + Primary + Intelligence[Sources, Freshness, Alerts] + Actions[Source]",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "MARKET",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "SIMULATE",
  "gated": false,
  "costClasses": [
   "TF",
   "PF",
   "SL",
   "SP",
   "NF",
   "BF",
   "BC"
  ],
  "riskDimensions": [
   "MK",
   "LQ",
   "DF",
   "DP",
   "LV"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Arbitrage"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "NETWORK",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "SIMULATE",
  "gated": false,
  "costClasses": [
   "BF",
   "NF",
   "SL"
  ],
  "riskDimensions": [
   "BR",
   "DP",
   "LQ",
   "DF"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Bridge"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "NETWORK",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "SIMULATE",
  "gated": false,
  "costClasses": [
   "BF",
   "NF"
  ],
  "riskDimensions": [
   "BR",
   "SC",
   "DP",
   "DF"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Bridge"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "MARKET",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "SIMULATE",
  "gated": false,
  "costClasses": [
   "PF",
   "TF",
   "SL",
   "SS"
  ],
  "riskDimensions": [
   "LQ",
   "PR",
   "MK",
   "DP"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Liquidity"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "YIELD",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "RECOMMEND",
  "gated": false,
  "costClasses": [
   "PF",
   "NF",
   "SS"
  ],
  "riskDimensions": [
   "PR",
   "LQ",
   "MK",
   "DF"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Liquidity"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "YIELD",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "RECOMMEND",
  "gated": false,
  "costClasses": [
   "NF",
   "PF",
   "SS"
  ],
  "riskDimensions": [
   "NW",
   "PR",
   "LV",
   "DP"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Staking"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "YIELD",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "RECOMMEND",
  "gated": false,
  "costClasses": [
   "PF",
   "SS"
  ],
  "riskDimensions": [
   "PR",
   "LQ",
   "AS",
   "DP"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Staking"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "YIELD",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "RECOMMEND",
  "gated": false,
  "costClasses": [
   "PF",
   "SS"
  ],
  "riskDimensions": [
   "PR",
   "LV",
   "DP",
   "SC"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Staking"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "YIELD",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "RECOMMEND",
  "gated": false,
  "costClasses": [
   "PF",
   "BC",
   "NF"
  ],
  "riskDimensions": [
   "PR",
   "LQ",
   "LV",
   "CP",
   "DP"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Lending"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "YIELD",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "SIMULATE",
  "gated": false,
  "costClasses": [
   "BC",
   "PF",
   "NF"
  ],
  "riskDimensions": [
   "LV",
   "LQ",
   "PR",
   "DF"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Borrowing"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "YIELD",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "RECOMMEND",
  "gated": false,
  "costClasses": [
   "PF",
   "SS",
   "SUB"
  ],
  "riskDimensions": [
   "PR",
   "DP",
   "MK",
   "LQ"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Vault"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "YIELD",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "RECOMMEND",
  "gated": false,
  "costClasses": [
   "PF",
   "NF",
   "SS"
  ],
  "riskDimensions": [
   "PR",
   "DP",
   "DF",
   "§25)"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Vault"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "YIELD",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "SIMULATE",
  "gated": false,
  "costClasses": [
   "PF",
   "TF",
   "SS"
  ],
  "riskDimensions": [
   "MK",
   "LQ",
   "DF",
   "DP"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Derivative Position"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "ECONOMY",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "RECOMMEND",
  "gated": false,
  "costClasses": [
   "PF",
   "BC",
   "SS"
  ],
  "riskDimensions": [
   "CP",
   "LQ",
   "PR",
   "DP"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Lending"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "MARKET",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "SIMULATE",
  "gated": false,
  "costClasses": [
   "TF",
   "FC",
   "SL"
  ],
  "riskDimensions": [
   "LV",
   "LQ",
   "MK",
   "DF"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Derivative Position"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "MARKET",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "SIMULATE",
  "gated": false,
  "costClasses": [
   "TF",
   "FC",
   "SL"
  ],
  "riskDimensions": [
   "LV",
   "MK",
   "LQ",
   "DF"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Derivative Position"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "MARKET",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "SIMULATE",
  "gated": false,
  "costClasses": [
   "TF",
   "PF",
   "SP"
  ],
  "riskDimensions": [
   "LV",
   "MK",
   "LQ"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Derivative Position"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "MARKET",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "SIMULATE",
  "gated": false,
  "costClasses": [
   "PF",
   "BC",
   "NF"
  ],
  "riskDimensions": [
   "OR",
   "LV",
   "PR",
   "DP",
   "LQ"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Derivative Position"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "NONE",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "ANALYZE",
  "gated": false,
  "costClasses": [
   "BC",
   "FC",
   "TF"
  ],
  "riskDimensions": [
   "LV",
   "LQ",
   "DP",
   "MK"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL − own Primary is an aggregation view",
  "simulatorTemplate": "Derivative Position / Borrowing"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "NETWORK",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "RECOMMEND",
  "gated": false,
  "costClasses": [
   "HW",
   "EN",
   "IN",
   "NF"
  ],
  "riskDimensions": [
   "NW",
   "OP",
   "MK",
   "DP"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Mining Economics"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "NETWORK",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "RECOMMEND",
  "gated": false,
  "costClasses": [
   "HW",
   "IN",
   "NF",
   "SUB"
  ],
  "riskDimensions": [
   "NW",
   "LV",
   "OP",
   "DP"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Validator Economics"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "NETWORK",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "MONITOR",
  "gated": false,
  "costClasses": [
   "HW",
   "IN",
   "SUB",
   "EN"
  ],
  "riskDimensions": [
   "NW",
   "OP",
   "DP",
   "DF"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "NETWORK",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "MONITOR",
  "gated": false,
  "costClasses": [
   "IN",
   "SUB"
  ],
  "riskDimensions": [
   "NW",
   "OP",
   "DF",
   "DP"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source"
  ],
  "panelsNote": "FULL − Simulator action",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "ECONOMY",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "RECOMMEND",
  "gated": false,
  "costClasses": [
   "HW",
   "IN",
   "EN"
  ],
  "riskDimensions": [
   "OP",
   "NW",
   "DP",
   "MK"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "OWNER-GATED SEAT",
  "worldLayer": "ECONOMY",
  "defaultView": "STANDARD",
  "frame": "seat",
  "ladderTop": "MONITOR",
  "gated": true,
  "costClasses": [
   "HW",
   "IN",
   "EN",
   "SUB"
  ],
  "riskDimensions": [
   "OP",
   "DP",
   "DF"
  ],
  "actions": [
   "encyclopedia"
  ],
  "panelsNote": "SEAT frame (§3)",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "OWNER-GATED SEAT",
  "worldLayer": "NETWORK",
  "defaultView": "STANDARD",
  "frame": "seat",
  "ladderTop": "MONITOR",
  "gated": true,
  "costClasses": [
   "IN"
  ],
  "riskDimensions": [
   "DP",
   "NW"
  ],
  "actions": [
   "encyclopedia"
  ],
  "panelsNote": "SEAT frame (§3)",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "OWNER-GATED SEAT",
  "worldLayer": "NETWORK",
  "defaultView": "STANDARD",
  "frame": "seat",
  "ladderTop": "MONITOR",
  "gated": true,
  "costClasses": [
   "IN",
   "SUB"
  ],
  "riskDimensions": [
   "OP",
   "DP"
  ],
  "actions": [
   "encyclopedia"
  ],
  "panelsNote": "SEAT frame (§3)",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "NETWORK",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "RECOMMEND",
  "gated": false,
  "costClasses": [
   "NF",
   "PF",
   "BF"
  ],
  "riskDimensions": [
   "AS",
   "BR",
   "PR",
   "DP"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Staking / Lending"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "ECONOMY",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "RECOMMEND",
  "gated": false,
  "costClasses": [
   "PF",
   "SS",
   "SUB"
  ],
  "riskDimensions": [
   "CP",
   "LQ",
   "PR",
   "DF"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "ECONOMY",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "RECOMMEND",
  "gated": false,
  "costClasses": [
   "PF",
   "TF",
   "NF"
  ],
  "riskDimensions": [
   "LQ",
   "AS",
   "PR",
   "MK"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "Lending"
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
  ],
  "status": "OWNER-GATED SEAT",
  "worldLayer": "ECONOMY",
  "defaultView": "STANDARD",
  "frame": "seat",
  "ladderTop": "MONITOR",
  "gated": true,
  "costClasses": [],
  "riskDimensions": [
   "AS",
   "MK"
  ],
  "actions": [
   "encyclopedia"
  ],
  "panelsNote": "SEAT frame (§3)",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "OWNER-GATED SEAT",
  "worldLayer": "ECONOMY",
  "defaultView": "STANDARD",
  "frame": "seat",
  "ladderTop": "MONITOR",
  "gated": true,
  "costClasses": [],
  "riskDimensions": [
   "AS",
   "MK"
  ],
  "actions": [
   "encyclopedia"
  ],
  "panelsNote": "SEAT frame (§3)",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "NETWORK",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "ANALYZE",
  "gated": false,
  "costClasses": [
   "PF",
   "TF"
  ],
  "riskDimensions": [
   "OR",
   "LQ",
   "MK",
   "DF"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "NETWORK",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "ANALYZE",
  "gated": false,
  "costClasses": [
   "PF",
   "IN"
  ],
  "riskDimensions": [
   "OR",
   "DP",
   "DF"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL (Dependency panel is the centerpiece: \"WHAT DEPENDS ON THIS ORACLE?\", §46)",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "MARKET",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "RECOMMEND",
  "gated": false,
  "costClasses": [
   "PF",
   "SS"
  ],
  "riskDimensions": [
   "CP",
   "PR",
   "SC",
   "DP"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "ECONOMY",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "ANALYZE",
  "gated": false,
  "costClasses": [
   "NF",
   "PF"
  ],
  "riskDimensions": [
   "PR",
   "DP",
   "OP"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "ECONOMY",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "ANALYZE",
  "gated": false,
  "costClasses": [
   "PF",
   "NF"
  ],
  "riskDimensions": [
   "PR",
   "DP",
   "MK"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "NONE"
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
  ],
  "status": "NOT IMPLEMENTED",
  "worldLayer": "ECONOMY",
  "defaultView": "STANDARD",
  "frame": "full",
  "ladderTop": "ANALYZE",
  "gated": false,
  "costClasses": [
   "NF",
   "TF",
   "SS"
  ],
  "riskDimensions": [
   "CP",
   "DF",
   "LQ"
  ],
  "actions": [
   "star",
   "compare",
   "world",
   "encyclopedia",
   "graph",
   "source",
   "simulator"
  ],
  "panelsNote": "FULL",
  "simulatorTemplate": "NONE"
 }
};
