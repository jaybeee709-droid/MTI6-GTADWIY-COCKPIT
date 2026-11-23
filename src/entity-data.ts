/* GENERATED 2026-11-23 by scripts/generate-entity-data.mjs from the
 * frozen entity batch files js/data/entity-batch-1.js and
 * js/data/entity-batch-2.js. DO NOT HAND-EDIT — regenerate instead.
 * The frozen sources are unchanged. Every entity is UNVERIFIED;
 * identity fields are exactly what the frozen records carry — a
 * field a record does not carry is absent, never filled in. */

export interface CanonicalEntity {
  id: string; title: string; registry: string; definition: string; batch: string;
  symbol?: string; chainId?: number; networkRef?: string; nativeAssetRef?: string;
  formerName?: string; activityRefs?: string[]; networkRefs?: string[];
}

export const ENTITY_UNIVERSE: CanonicalEntity[] = [
 {
  "id": "ethereum-mainnet",
  "title": "Ethereum",
  "registry": "chains",
  "definition": "The Ethereum mainnet network: an account-based, EVM blockchain with EIP-155 chain id 1 and ether (ETH) as its native asset.",
  "batch": "entity-batch-1",
  "chainId": 1,
  "nativeAssetRef": "eth-ethereum"
 },
 {
  "id": "bitcoin-mainnet",
  "title": "Bitcoin",
  "registry": "chains",
  "definition": "The Bitcoin mainnet network: a UTXO-based blockchain with no EVM semantics and no chain id, with bitcoin (BTC) as its native asset.",
  "batch": "entity-batch-1",
  "nativeAssetRef": "btc-bitcoin"
 },
 {
  "id": "solana-mainnet",
  "title": "Solana",
  "registry": "chains",
  "definition": "The Solana mainnet network: an account-based blockchain using the Solana VM, with SOL as its native asset.",
  "batch": "entity-batch-1",
  "nativeAssetRef": "sol-solana"
 },
 {
  "id": "cosmos-hub",
  "title": "Cosmos Hub",
  "registry": "chains",
  "definition": "The Cosmos Hub network: a Cosmos SDK blockchain (chain id cosmoshub-4) with ATOM as its native staking asset and IBC interoperability.",
  "batch": "entity-batch-1",
  "nativeAssetRef": "atom-cosmos-hub"
 },
 {
  "id": "base-mainnet",
  "title": "Base",
  "registry": "chains",
  "definition": "The Base mainnet network: an Ethereum layer-2 (OP Stack) with EIP-155 chain id 8453 that settles to Ethereum and uses ETH as its native asset.",
  "batch": "entity-batch-1",
  "chainId": 8453,
  "nativeAssetRef": "eth-ethereum"
 },
 {
  "id": "arbitrum-mainnet",
  "title": "Arbitrum One",
  "registry": "chains",
  "definition": "The Arbitrum One mainnet network: an Ethereum layer-2 optimistic rollup with EIP-155 chain id 42161 that settles to Ethereum and uses ETH as its native asset.",
  "batch": "entity-batch-1",
  "chainId": 42161,
  "nativeAssetRef": "eth-ethereum"
 },
 {
  "id": "bnb-chain-mainnet",
  "title": "BNB Smart Chain",
  "registry": "chains",
  "definition": "The BNB Smart Chain mainnet network: an EVM-compatible blockchain in the BNB Chain ecosystem (not an Ethereum layer-2) with EIP-155 chain id 56 and BNB as its native asset.",
  "batch": "entity-batch-1",
  "chainId": 56
 },
 {
  "id": "polygon-mainnet",
  "title": "Polygon PoS",
  "registry": "chains",
  "definition": "The Polygon PoS mainnet network: an EVM-compatible proof-of-stake sidechain with EIP-155 chain id 137 that checkpoints to Ethereum; its native asset is POL (formerly MATIC).",
  "batch": "entity-batch-1",
  "chainId": 137
 },
 {
  "id": "btc-bitcoin",
  "title": "Bitcoin (BTC)",
  "registry": "assets",
  "definition": "Bitcoin, the native asset of the Bitcoin network, identified by its network and canonical name — never by ticker alone.",
  "batch": "entity-batch-1",
  "symbol": "BTC",
  "networkRef": "bitcoin-mainnet"
 },
 {
  "id": "eth-ethereum",
  "title": "Ether (ETH)",
  "registry": "assets",
  "definition": "Ether, the native asset of Ethereum, also used as the native asset of the Base and Arbitrum One layer-2 networks in this batch.",
  "batch": "entity-batch-1",
  "symbol": "ETH",
  "networkRef": "ethereum-mainnet"
 },
 {
  "id": "sol-solana",
  "title": "Solana (SOL)",
  "registry": "assets",
  "definition": "SOL, the native asset of the Solana network, identified by its network and canonical name — never by ticker alone.",
  "batch": "entity-batch-1",
  "symbol": "SOL",
  "networkRef": "solana-mainnet"
 },
 {
  "id": "atom-cosmos-hub",
  "title": "Cosmos (ATOM)",
  "registry": "assets",
  "definition": "ATOM, the native staking asset of Cosmos Hub, identified by its network and canonical name — never by ticker alone.",
  "batch": "entity-batch-1",
  "symbol": "ATOM",
  "networkRef": "cosmos-hub"
 },
 {
  "id": "usdc-ethereum",
  "title": "USD Coin (USDC, Ethereum)",
  "registry": "assets",
  "definition": "USD Coin on Ethereum mainnet, identified by its network, canonical contract address, and issuer Circle. USDC deployments on other networks are distinct identities.",
  "batch": "entity-batch-1",
  "symbol": "USDC",
  "networkRef": "ethereum-mainnet"
 },
 {
  "id": "usdt-ethereum",
  "title": "Tether USD (USDT, Ethereum)",
  "registry": "assets",
  "definition": "Tether USD on Ethereum mainnet, identified by its network, canonical contract address, and issuer Tether. USDT deployments on other networks are distinct identities.",
  "batch": "entity-batch-1",
  "symbol": "USDT",
  "networkRef": "ethereum-mainnet"
 },
 {
  "id": "dai-ethereum",
  "title": "Dai (DAI, Ethereum)",
  "registry": "assets",
  "definition": "Dai on Ethereum mainnet, the stablecoin originally issued through Maker (now Sky), identified by its network, canonical contract address, and issuing protocol.",
  "batch": "entity-batch-1",
  "symbol": "DAI",
  "networkRef": "ethereum-mainnet"
 },
 {
  "id": "wbtc-ethereum",
  "title": "Wrapped Bitcoin (WBTC, Ethereum)",
  "registry": "assets",
  "definition": "Wrapped Bitcoin on Ethereum mainnet: a token representing BTC held with custodians. A distinct identity from bitcoin itself — never a match for btc-bitcoin.",
  "batch": "entity-batch-1",
  "symbol": "WBTC",
  "networkRef": "ethereum-mainnet"
 },
 {
  "id": "uni-ethereum",
  "title": "Uniswap (UNI, Ethereum)",
  "registry": "assets",
  "definition": "UNI, the governance token of the Uniswap protocol on Ethereum mainnet, identified by its network, canonical contract address, and protocol.",
  "batch": "entity-batch-1",
  "symbol": "UNI",
  "networkRef": "ethereum-mainnet"
 },
 {
  "id": "aave-ethereum",
  "title": "Aave (AAVE, Ethereum)",
  "registry": "assets",
  "definition": "AAVE, the governance token of the Aave protocol on Ethereum mainnet, identified by its network, canonical contract address, and protocol.",
  "batch": "entity-batch-1",
  "symbol": "AAVE",
  "networkRef": "ethereum-mainnet"
 },
 {
  "id": "protocol-uniswap",
  "title": "Uniswap",
  "registry": "protocols",
  "definition": "Uniswap is a decentralized exchange protocol built on automated market maker pools, including concentrated-liquidity pools.",
  "batch": "entity-batch-1",
  "activityRefs": [
   "major-token-swapping",
   "major-standard-liquidity-provision",
   "major-concentrated-liquidity-provision"
  ],
  "networkRefs": [
   "ethereum-mainnet",
   "base-mainnet",
   "arbitrum-mainnet",
   "polygon-mainnet",
   "bnb-chain-mainnet"
  ]
 },
 {
  "id": "protocol-aave",
  "title": "Aave",
  "registry": "protocols",
  "definition": "Aave is a decentralized lending protocol where users supply assets to liquidity markets and borrow against collateral.",
  "batch": "entity-batch-1",
  "activityRefs": [
   "major-asset-lending",
   "major-collateralized-borrowing"
  ],
  "networkRefs": [
   "ethereum-mainnet",
   "arbitrum-mainnet",
   "polygon-mainnet",
   "base-mainnet"
  ]
 },
 {
  "id": "protocol-compound",
  "title": "Compound",
  "registry": "protocols",
  "definition": "Compound is a decentralized lending protocol with algorithmic interest-rate markets and isolated collateral markets (Compound III).",
  "batch": "entity-batch-1",
  "activityRefs": [
   "major-asset-lending",
   "major-collateralized-borrowing"
  ],
  "networkRefs": [
   "ethereum-mainnet",
   "arbitrum-mainnet",
   "base-mainnet",
   "polygon-mainnet"
  ]
 },
 {
  "id": "protocol-sky",
  "title": "Sky",
  "registry": "protocols",
  "definition": "Sky is the collateralized debt position protocol issuing the DAI stablecoin (and USDS), formerly known as Maker — one protocol identity across the 2024 rebrand.",
  "batch": "entity-batch-1",
  "formerName": "Maker",
  "activityRefs": [
   "major-collateralized-borrowing"
  ],
  "networkRefs": [
   "ethereum-mainnet"
  ]
 },
 {
  "id": "protocol-lido",
  "title": "Lido",
  "registry": "protocols",
  "definition": "Lido is a liquid staking protocol that issues a liquid staking token representing staked ether.",
  "batch": "entity-batch-1",
  "activityRefs": [
   "major-liquid-staking"
  ],
  "networkRefs": [
   "ethereum-mainnet"
  ]
 },
 {
  "id": "protocol-curve",
  "title": "Curve",
  "registry": "protocols",
  "definition": "Curve is a decentralized exchange protocol specialized in liquidity pools of similarly priced assets such as stablecoins.",
  "batch": "entity-batch-1",
  "activityRefs": [
   "major-standard-liquidity-provision",
   "major-token-swapping"
  ],
  "networkRefs": [
   "ethereum-mainnet",
   "arbitrum-mainnet",
   "polygon-mainnet",
   "base-mainnet"
  ]
 },
 {
  "id": "protocol-gmx",
  "title": "GMX",
  "registry": "protocols",
  "definition": "GMX is a decentralized perpetuals exchange using shared liquidity pools, operating on Arbitrum One within this batch's network set.",
  "batch": "entity-batch-1",
  "activityRefs": [
   "major-perpetual-trading"
  ],
  "networkRefs": [
   "arbitrum-mainnet"
  ]
 },
 {
  "id": "protocol-jupiter",
  "title": "Jupiter",
  "registry": "protocols",
  "definition": "Jupiter is a swap aggregation and route optimization protocol on Solana.",
  "batch": "entity-batch-1",
  "activityRefs": [
   "major-swap-aggregation-route-optimization",
   "major-token-swapping"
  ],
  "networkRefs": [
   "solana-mainnet"
  ]
 },
 {
  "id": "avalanche-mainnet",
  "title": "Avalanche C-Chain",
  "registry": "chains",
  "definition": "The Avalanche C-Chain mainnet network: the EVM-compatible contract chain of the Avalanche multi-chain architecture, with EIP-155 chain id 43114 and AVAX as its native asset.",
  "batch": "entity-batch-2",
  "chainId": 43114,
  "nativeAssetRef": "avax-avalanche"
 },
 {
  "id": "optimism-mainnet",
  "title": "OP Mainnet",
  "registry": "chains",
  "definition": "The OP Mainnet network: an EVM-compatible Ethereum layer-2 (OP Stack) with EIP-155 chain id 10. Its native gas asset is Ether; OP is its governance token.",
  "batch": "entity-batch-2",
  "chainId": 10,
  "nativeAssetRef": "eth-ethereum"
 },
 {
  "id": "dydx-mainnet",
  "title": "dYdX Chain",
  "registry": "chains",
  "definition": "The dYdX Chain network: a Cosmos SDK appchain (chain id dydx-mainnet-1) operated for the dYdX protocol, with DYDX as its native staking and governance asset. The network is a distinct canonical entity from the dYdX protocol (protocol-dydx) and from the DYDX asset (dydx-dydx-chain).",
  "batch": "entity-batch-2",
  "nativeAssetRef": "dydx-dydx-chain"
 },
 {
  "id": "bnb-bnb-chain",
  "title": "BNB (BNB Chain)",
  "registry": "assets",
  "definition": "BNB is the native asset of BNB Smart Chain, used for gas and staking in the BNB Chain ecosystem. It was originally named Binance Coin; BNB is the current canonical name of the same asset.",
  "batch": "entity-batch-2",
  "symbol": "BNB",
  "networkRef": "bnb-chain-mainnet"
 },
 {
  "id": "pol-polygon",
  "title": "POL (Polygon)",
  "registry": "assets",
  "definition": "POL is the native asset of Polygon PoS, used for gas and staking. POL is the migration successor of MATIC (1:1 upgrade, 2024) — the same asset identity across the migration, not a second asset.",
  "batch": "entity-batch-2",
  "symbol": "POL",
  "networkRef": "polygon-mainnet",
  "formerName": "MATIC"
 },
 {
  "id": "avax-avalanche",
  "title": "Avalanche (AVAX)",
  "registry": "assets",
  "definition": "AVAX is the native asset of the Avalanche C-Chain, used for gas and for staking in the Avalanche network.",
  "batch": "entity-batch-2",
  "symbol": "AVAX",
  "networkRef": "avalanche-mainnet"
 },
 {
  "id": "op-optimism",
  "title": "Optimism (OP, OP Mainnet)",
  "registry": "assets",
  "definition": "OP is the governance token of OP Mainnet and the Optimism Collective. It is not the network's gas asset (Ether is); the token and the network are distinct canonical entities.",
  "batch": "entity-batch-2",
  "symbol": "OP",
  "networkRef": "optimism-mainnet"
 },
 {
  "id": "link-ethereum",
  "title": "Chainlink (LINK, Ethereum)",
  "registry": "assets",
  "definition": "LINK is the token of the Chainlink oracle network, used to pay oracle node operators and for staking/governance in the Chainlink ecosystem. The token is a distinct canonical entity from the Chainlink protocol (protocol-chainlink).",
  "batch": "entity-batch-2",
  "symbol": "LINK",
  "networkRef": "ethereum-mainnet"
 },
 {
  "id": "pyth-solana",
  "title": "Pyth Network (PYTH, Solana)",
  "registry": "assets",
  "definition": "PYTH is the governance token of the Pyth Network oracle protocol; its canonical mint is on Solana. Representations of PYTH on other networks are wrapped/bridged variants of this record, not separate assets. The token is a distinct canonical entity from the Pyth protocol (protocol-pyth).",
  "batch": "entity-batch-2",
  "symbol": "PYTH",
  "networkRef": "solana-mainnet"
 },
 {
  "id": "eigen-ethereum",
  "title": "EigenLayer (EIGEN, Ethereum)",
  "registry": "assets",
  "definition": "EIGEN is the token of EigenLayer, the Ethereum restaking protocol — its governance and staking/work token. The token is a distinct canonical entity from the EigenLayer protocol (protocol-eigenlayer).",
  "batch": "entity-batch-2",
  "symbol": "EIGEN",
  "networkRef": "ethereum-mainnet"
 },
 {
  "id": "dydx-dydx-chain",
  "title": "dYdX (DYDX, dYdX Chain)",
  "registry": "assets",
  "definition": "DYDX is the native staking and governance asset of dYdX Chain. It was originally issued on Ethereum as ethDYDX and migrated to dYdX Chain as its native asset — one asset identity across the migration; ethDYDX is an alias, not a separate asset.",
  "batch": "entity-batch-2",
  "symbol": "DYDX",
  "networkRef": "dydx-mainnet"
 },
 {
  "id": "protocol-across",
  "title": "Across",
  "registry": "protocols",
  "definition": "Intent-based cross-chain bridge protocol: solvers fill user intents on destination chains against a hub pool on Ethereum.",
  "batch": "entity-batch-2",
  "activityRefs": [
   "major-bridging",
   "major-intent-based-execution"
  ],
  "networkRefs": [
   "ethereum-mainnet",
   "arbitrum-mainnet",
   "base-mainnet",
   "optimism-mainnet",
   "polygon-mainnet"
  ]
 },
 {
  "id": "protocol-stargate",
  "title": "Stargate",
  "registry": "protocols",
  "definition": "Cross-chain liquidity transfer protocol built on LayerZero messaging, using unified liquidity pools for native asset transfers.",
  "batch": "entity-batch-2",
  "activityRefs": [
   "major-bridging",
   "major-cross-chain-routing-settlement"
  ],
  "networkRefs": [
   "ethereum-mainnet",
   "arbitrum-mainnet",
   "base-mainnet",
   "optimism-mainnet",
   "polygon-mainnet",
   "bnb-chain-mainnet",
   "avalanche-mainnet"
  ]
 },
 {
  "id": "protocol-chainlink",
  "title": "Chainlink",
  "registry": "protocols",
  "definition": "Decentralized oracle network providing data feeds, verifiable randomness and automation to smart contracts across many networks.",
  "batch": "entity-batch-2",
  "activityRefs": [],
  "networkRefs": [
   "ethereum-mainnet",
   "arbitrum-mainnet",
   "base-mainnet",
   "optimism-mainnet",
   "polygon-mainnet",
   "bnb-chain-mainnet",
   "avalanche-mainnet",
   "solana-mainnet"
  ]
 },
 {
  "id": "protocol-pyth",
  "title": "Pyth Network",
  "registry": "protocols",
  "definition": "Pull-based oracle protocol publishing first-party price data from exchanges and trading firms, originating on Solana and operating across many networks.",
  "batch": "entity-batch-2",
  "activityRefs": [],
  "networkRefs": [
   "solana-mainnet",
   "ethereum-mainnet",
   "arbitrum-mainnet",
   "base-mainnet",
   "optimism-mainnet",
   "polygon-mainnet",
   "bnb-chain-mainnet",
   "avalanche-mainnet"
  ]
 },
 {
  "id": "protocol-eigenlayer",
  "title": "EigenLayer",
  "registry": "protocols",
  "definition": "Restaking protocol on Ethereum: staked ETH and liquid staking assets can be restaked to secure additional services (AVSs).",
  "batch": "entity-batch-2",
  "activityRefs": [
   "major-restaking",
   "major-liquid-restaking"
  ],
  "networkRefs": [
   "ethereum-mainnet"
  ]
 },
 {
  "id": "protocol-yearn",
  "title": "Yearn Finance",
  "registry": "protocols",
  "definition": "Yield vault system: vaults deploy deposited assets into managed strategies and auto-compound returns for depositors.",
  "batch": "entity-batch-2",
  "activityRefs": [
   "major-automated-strategy-vaults",
   "major-yield-aggregation-auto-compounding"
  ],
  "networkRefs": [
   "ethereum-mainnet"
  ]
 },
 {
  "id": "protocol-babylon",
  "title": "Babylon",
  "registry": "protocols",
  "definition": "Bitcoin staking protocol: BTC holders stake natively on Bitcoin (self-custodial, via Bitcoin scripts/timelocks) to provide security to other chains, coordinated by the Babylon chain.",
  "batch": "entity-batch-2",
  "activityRefs": [
   "major-btcfi",
   "major-native-staking"
  ],
  "networkRefs": [
   "bitcoin-mainnet"
  ]
 },
 {
  "id": "protocol-jito",
  "title": "Jito",
  "registry": "protocols",
  "definition": "Solana liquid staking and MEV infrastructure protocol: SOL stakers receive the JitoSOL liquid staking asset while validators run Jito's block-building software.",
  "batch": "entity-batch-2",
  "activityRefs": [
   "major-liquid-staking"
  ],
  "networkRefs": [
   "solana-mainnet"
  ]
 },
 {
  "id": "protocol-kamino",
  "title": "Kamino",
  "registry": "protocols",
  "definition": "Solana lending protocol (Kamino Lend) with automated concentrated-liquidity vaults; the largest lending market on Solana.",
  "batch": "entity-batch-2",
  "activityRefs": [
   "major-asset-lending",
   "major-collateralized-borrowing"
  ],
  "networkRefs": [
   "solana-mainnet"
  ]
 },
 {
  "id": "protocol-traderjoe",
  "title": "LFJ",
  "registry": "protocols",
  "definition": "LFJ (formerly Trader Joe) is a decentralized exchange native to Avalanche, known for its Liquidity Book bin-based AMM design; also deployed on Arbitrum and BNB Chain. The project rebranded from Trader Joe to LFJ in 2024; the protocol and its JOE token continue under the new brand. Per owner ruling at the Batch 2 freeze (2026-11-16), the canonical name is the CURRENT brand LFJ with Trader Joe preserved as former name/aliases, and the permanent canonical id protocol-traderjoe is unchanged — canonical ids do not change when names or brands change. One canonical entity across the rebrand; no second LFJ record exists.",
  "batch": "entity-batch-2",
  "formerName": "Trader Joe",
  "activityRefs": [
   "major-token-swapping",
   "major-standard-liquidity-provision",
   "major-concentrated-liquidity-provision"
  ],
  "networkRefs": [
   "avalanche-mainnet",
   "arbitrum-mainnet",
   "bnb-chain-mainnet"
  ]
 },
 {
  "id": "protocol-dydx",
  "title": "dYdX",
  "registry": "protocols",
  "definition": "Decentralized perpetuals trading protocol: an order-book perpetuals exchange whose current version operates on its own appchain, dYdX Chain.",
  "batch": "entity-batch-2",
  "activityRefs": [
   "major-perpetual-trading"
  ],
  "networkRefs": [
   "dydx-mainnet"
  ]
 }
];

export const ENTITY_COUNTS = {
  total: 48,
  chains: 11,
  assets: 18,
  protocols: 19,
} as const;
