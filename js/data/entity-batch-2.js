/* MTI6-GTADWIY-COCKPIT — Entity Batch 2 data (expansion, Nov 16, 2026)
 * The second validated canonical entity batch: 3 networks, 8 assets,
 * 11 protocols — 22 records. Scope frozen by owner ruling Nov 16, 2026
 * as a FROZEN REVIEWED UNIT (frozen artifact entity-batch-2-records.json,
 * SHA-256 bb3dc51a61061ccf97e92b6b72dec179c1bc300346c047eabe10885e74b11b8f);
 * this file is generated from that artifact and verified
 * record-for-record against it. WIRED WITH IMPORT DISABLED: the
 * per-batch hold in js/encyclopedia-import.js keeps this batch inert
 * (zero writes, zero registrations) until the owner's separate IMPORT
 * authorization enables it.
 *
 * Shape: `records` are the canonical Crypto World store records
 * (registries assets / chains / protocols); `networks`, `assets`
 * and `protocols` are the matching runtime-module records with the
 * SAME ids, registered by the encyclopedia import gate's
 * dual-registration step (canonical identity stays authoritative;
 * module registration is derived state). Identity foundation only:
 * no prices, APY/APR, TVL, balances, holdings, earnings, market
 * data, or live claims anywhere in this file. Every record is
 * UNVERIFIED. LFJ is ONE record (protocol-traderjoe, formerName
 * "Trader Joe") — canonical ids do not change on rebrand. dYdX is
 * three distinct records (dydx-mainnet / dydx-dydx-chain /
 * protocol-dydx), never collapsed.
 */
(function (global) {
  "use strict";
  global.EncyclopediaEntityBatch2 = {
 "assets": [
  {
   "assetClass": "native-currency",
   "assetId": "bnb-bnb-chain",
   "canonicalName": "BNB",
   "name": "BNB",
   "nativeOrToken": "native",
   "networkId": "bnb-chain-mainnet",
   "note": "Native asset of BNB Smart Chain — completes the deliberate Batch 1 gap (the chain shipped with nativeAssetRef null because BNB was not in that batch). Formerly named Binance Coin. Identity anchors: networkId + canonicalName. No contract address exists for a native asset.",
   "source": "owner-seed",
   "symbol": "BNB",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "assetClass": "native-currency",
   "assetId": "pol-polygon",
   "canonicalName": "Polygon Ecosystem Token",
   "name": "POL",
   "nativeOrToken": "native",
   "networkId": "polygon-mainnet",
   "note": "Native asset of Polygon PoS — completes the deliberate Batch 1 gap. POL is the migration successor of MATIC (1:1 token upgrade, 2024): one asset identity across the migration, recorded via formerName MATIC on the canonical store record, never as two assets. Identity anchors: networkId + canonicalName.",
   "source": "owner-seed",
   "symbol": "POL",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "assetClass": "native-currency",
   "assetId": "avax-avalanche",
   "canonicalName": "Avalanche",
   "name": "Avalanche",
   "nativeOrToken": "native",
   "networkId": "avalanche-mainnet",
   "note": "Native asset of the Avalanche C-Chain. Identity anchors: networkId + canonicalName. No contract address exists for a native asset.",
   "source": "owner-seed",
   "symbol": "AVAX",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "assetClass": "governance-token",
   "assetId": "op-optimism",
   "canonicalName": "Optimism",
   "contractAddress": "0x4200000000000000000000000000000000000042",
   "name": "Optimism",
   "nativeOrToken": "token",
   "networkId": "optimism-mainnet",
   "note": "OP governance token of OP Mainnet (the network's gas asset is Ether, not OP). Identity anchors: networkId + contractAddress. Contract anchor re-checked 2026-11-15 against the OP Mainnet explorer's OP token page (GovernanceToken contract at this address) — confirmed as authored.",
   "source": "owner-seed",
   "symbol": "OP",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "assetClass": "utility-token",
   "assetId": "link-ethereum",
   "canonicalName": "Chainlink",
   "contractAddress": "0x514910771af9ca656af840dff83e8264ecf986ca",
   "name": "Chainlink",
   "nativeOrToken": "token",
   "networkId": "ethereum-mainnet",
   "note": "LINK token of the Chainlink oracle network (Ethereum mainnet canonical record). The token is a distinct canonical entity from the Chainlink protocol (protocol-chainlink). Identity anchors: networkId + contractAddress + protocol. Contract anchor re-checked 2026-11-15 against Chainlink's official LINK Token Contracts documentation (Ethereum mainnet) — confirmed as authored.",
   "protocol": "protocol-chainlink",
   "source": "owner-seed",
   "symbol": "LINK",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "assetClass": "governance-token",
   "assetId": "pyth-solana",
   "canonicalName": "Pyth Network",
   "mintAddress": "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
   "name": "Pyth Network",
   "nativeOrToken": "token",
   "networkId": "solana-mainnet",
   "note": "PYTH governance token of the Pyth Network; mintAddress carries the canonical Solana mint (Solana-family assets use mintAddress, not contractAddress — AssetIntelligence rule). Wrapped/bridged representations of PYTH on other networks resolve to this canonical record as variants, never as separate assets. The token is a distinct canonical entity from the Pyth protocol (protocol-pyth). Identity anchors: networkId + canonical mint + protocol. Mint anchor re-checked 2026-11-15 against Pyth's official token-address documentation (Solana) — confirmed as authored.",
   "protocol": "protocol-pyth",
   "source": "owner-seed",
   "symbol": "PYTH",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "assetClass": "governance-token",
   "assetId": "eigen-ethereum",
   "canonicalName": "EigenLayer",
   "contractAddress": "0xec53bf9167f50cdeb3ae105f56099aaab9061f83",
   "name": "EigenLayer",
   "nativeOrToken": "token",
   "networkId": "ethereum-mainnet",
   "note": "EIGEN token of EigenLayer, the Ethereum restaking protocol — governance and staking/work token of the protocol, a distinct canonical entity from the protocol record itself. Identity anchors: networkId + contractAddress + protocol. Contract anchor added after the P1 public re-check (2026-11-15): Etherscan's Eigen (EIGEN) token page resolves this address; an earlier unverified recollection of a different address was NOT used — the omission-first discipline caught it.",
   "protocol": "protocol-eigenlayer",
   "source": "owner-seed",
   "symbol": "EIGEN",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "assetClass": "native-currency",
   "assetId": "dydx-dydx-chain",
   "canonicalName": "dYdX",
   "name": "dYdX",
   "nativeOrToken": "native",
   "networkId": "dydx-mainnet",
   "note": "Native staking and governance asset of dYdX Chain. DYDX was originally issued on Ethereum as the ERC-20 token ethDYDX and migrated to dYdX Chain as its native asset (2023-2024 bridge migration) — one asset identity across the migration; ethDYDX is recorded as an alias, never as a separate asset. Identity anchors: networkId + canonicalName + protocol.",
   "protocol": "protocol-dydx",
   "source": "owner-seed",
   "symbol": "DYDX",
   "verificationStatus": "UNVERIFIED"
  }
 ],
 "batch": "entity-batch-2",
 "kind": "entity",
 "label": "Entity Batch 2 — expansion (22 entities)",
 "networks": [
  {
   "accountModel": "ACCOUNT",
   "aliases": [
    "Avalanche",
    "Avalanche C-Chain",
    "AVAX C-Chain"
   ],
   "assetRelationships": [
    {
     "assetClassId": "native-coins",
     "relationship": "NATIVE"
    },
    {
     "assetClassId": "fungible-tokens",
     "relationship": "ISSUED_ON"
    }
   ],
   "chainId": 43114,
   "explorer": {
    "label": "Example explorer",
    "urlTemplate": "https://example.invalid/tx/{txHash}"
   },
   "fallbackProviders": [],
   "familyId": "avalanche-family",
   "freshness": {
    "lastChecked": null,
    "maxAgeMs": null
   },
   "health": {
    "status": "UNKNOWN"
   },
   "id": "avalanche-mainnet",
   "name": "Avalanche C-Chain",
   "nativeAsset": {
    "assetClassId": "native-coins",
    "networkId": "avalanche-mainnet",
    "ticker": "AVAX"
   },
   "rpcProviders": [
    {
     "endpointLabel": "example.invalid/avax-http-1",
     "kind": "HTTP",
     "priority": 1,
     "status": "UNKNOWN"
    }
   ],
   "source": "owner-seed",
   "verificationStatus": "UNVERIFIED",
   "vm": "EVM",
   "vmNotes": "EVM, account-based, EIP-155 chain id 43114. The Avalanche C-Chain (contract chain) within the Avalanche multi-chain architecture.",
   "walletCompatibility": [
    "EIP-1193",
    "EIP-6963"
   ]
  },
  {
   "accountModel": "ACCOUNT",
   "aliases": [
    "Optimism",
    "OP Mainnet"
   ],
   "assetRelationships": [
    {
     "assetClassId": "native-coins",
     "relationship": "NATIVE"
    },
    {
     "assetClassId": "fungible-tokens",
     "relationship": "ISSUED_ON"
    }
   ],
   "chainId": 10,
   "explorer": {
    "label": "Example explorer",
    "urlTemplate": "https://example.invalid/tx/{txHash}"
   },
   "fallbackProviders": [],
   "familyId": "ethereum-family",
   "freshness": {
    "lastChecked": null,
    "maxAgeMs": null
   },
   "health": {
    "status": "UNKNOWN"
   },
   "id": "optimism-mainnet",
   "name": "OP Mainnet",
   "nativeAsset": {
    "assetClassId": "native-coins",
    "networkId": "optimism-mainnet",
    "ticker": "ETH"
   },
   "rpcProviders": [
    {
     "endpointLabel": "example.invalid/op-http-1",
     "kind": "HTTP",
     "priority": 1,
     "status": "UNKNOWN"
    }
   ],
   "source": "owner-seed",
   "verificationStatus": "UNVERIFIED",
   "vm": "EVM",
   "vmNotes": "EVM, account-based, EIP-155 chain id 10. Ethereum layer-2 built on the OP Stack. The native gas asset is Ether; OP is the network's governance token, not its gas asset.",
   "walletCompatibility": [
    "EIP-1193",
    "EIP-6963"
   ]
  },
  {
   "accountModel": "ACCOUNT",
   "aliases": [
    "dYdX Chain",
    "dYdX v4 Chain"
   ],
   "assetRelationships": [
    {
     "assetClassId": "native-coins",
     "relationship": "NATIVE"
    },
    {
     "assetClassId": "fungible-tokens",
     "relationship": "ISSUED_ON"
    }
   ],
   "chainId": null,
   "explorer": {
    "label": "Example explorer",
    "urlTemplate": "https://example.invalid/tx/{txHash}"
   },
   "fallbackProviders": [],
   "familyId": "cosmos-family",
   "freshness": {
    "lastChecked": null,
    "maxAgeMs": null
   },
   "health": {
    "status": "UNKNOWN"
   },
   "id": "dydx-mainnet",
   "name": "dYdX Chain",
   "nativeAsset": {
    "assetClassId": "native-coins",
    "networkId": "dydx-mainnet",
    "ticker": "DYDX"
   },
   "rpcProviders": [
    {
     "endpointLabel": "example.invalid/dydx-http-1",
     "kind": "HTTP",
     "priority": 1,
     "status": "UNKNOWN"
    }
   ],
   "source": "owner-seed",
   "verificationStatus": "UNVERIFIED",
   "vm": "COSMOS",
   "vmNotes": "Cosmos SDK / CometBFT, account-based, chain id dydx-mainnet-1. An appchain operated for the dYdX protocol — the network and the protocol are distinct canonical entities (see protocol-dydx).",
   "walletCompatibility": [
    "COSMOS-KIT"
   ]
  }
 ],
 "protocols": [
  {
   "activities": [
    "major-bridging",
    "major-intent-based-execution"
   ],
   "aliases": [
    "Across Protocol"
   ],
   "category": "BRIDGE",
   "description": "Intent-based cross-chain bridge protocol: solvers fill user intents on destination chains against a hub pool on Ethereum.",
   "name": "Across",
   "networks": [
    "ethereum-mainnet",
    "arbitrum-mainnet",
    "base-mainnet",
    "optimism-mainnet",
    "polygon-mainnet"
   ],
   "protocolId": "protocol-across",
   "securityState": "UNKNOWN",
   "source": "owner-seed",
   "strategies": [],
   "types": [],
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activities": [
    "major-bridging",
    "major-cross-chain-routing-settlement"
   ],
   "aliases": [
    "Stargate Finance"
   ],
   "category": "BRIDGE",
   "description": "Cross-chain liquidity transfer protocol built on LayerZero messaging, using unified liquidity pools for native asset transfers.",
   "name": "Stargate",
   "networks": [
    "ethereum-mainnet",
    "arbitrum-mainnet",
    "base-mainnet",
    "optimism-mainnet",
    "polygon-mainnet",
    "bnb-chain-mainnet",
    "avalanche-mainnet"
   ],
   "protocolId": "protocol-stargate",
   "securityState": "UNKNOWN",
   "source": "owner-seed",
   "strategies": [],
   "types": [],
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activities": [],
   "aliases": [
    "Chainlink Network"
   ],
   "category": "ORACLE",
   "description": "Decentralized oracle network providing data feeds, verifiable randomness and automation to smart contracts across many networks.",
   "identityNote": "The Chainlink protocol is a distinct canonical entity from the LINK asset (link-ethereum): the protocol is the oracle network; LINK is its token. Neither record replaces the other.",
   "name": "Chainlink",
   "networks": [
    "ethereum-mainnet",
    "arbitrum-mainnet",
    "base-mainnet",
    "optimism-mainnet",
    "polygon-mainnet",
    "bnb-chain-mainnet",
    "avalanche-mainnet",
    "solana-mainnet"
   ],
   "protocolId": "protocol-chainlink",
   "securityState": "UNKNOWN",
   "source": "owner-seed",
   "strategies": [],
   "types": [],
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activities": [],
   "aliases": [
    "Pyth"
   ],
   "category": "ORACLE",
   "description": "Pull-based oracle protocol publishing first-party price data from exchanges and trading firms, originating on Solana and operating across many networks.",
   "identityNote": "The Pyth protocol is a distinct canonical entity from the PYTH asset (pyth-solana): the protocol is the oracle network; PYTH is its governance token.",
   "name": "Pyth Network",
   "networks": [
    "solana-mainnet",
    "ethereum-mainnet",
    "arbitrum-mainnet",
    "base-mainnet",
    "optimism-mainnet",
    "polygon-mainnet",
    "bnb-chain-mainnet",
    "avalanche-mainnet"
   ],
   "protocolId": "protocol-pyth",
   "securityState": "UNKNOWN",
   "source": "owner-seed",
   "strategies": [],
   "types": [],
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activities": [
    "major-restaking",
    "major-liquid-restaking"
   ],
   "aliases": [
    "Eigen Layer"
   ],
   "category": "RESTAKING",
   "description": "Restaking protocol on Ethereum: staked ETH and liquid staking assets can be restaked to secure additional services (AVSs).",
   "identityNote": "The EigenLayer protocol is a distinct canonical entity from the EIGEN asset (eigen-ethereum).",
   "name": "EigenLayer",
   "networks": [
    "ethereum-mainnet"
   ],
   "protocolId": "protocol-eigenlayer",
   "securityState": "UNKNOWN",
   "source": "owner-seed",
   "strategies": [],
   "types": [],
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activities": [
    "major-automated-strategy-vaults",
    "major-yield-aggregation-auto-compounding"
   ],
   "aliases": [
    "Yearn",
    "yearn.finance"
   ],
   "category": "VAULT_YIELD",
   "description": "Yield vault system: vaults deploy deposited assets into managed strategies and auto-compound returns for depositors.",
   "name": "Yearn Finance",
   "networks": [
    "ethereum-mainnet"
   ],
   "protocolId": "protocol-yearn",
   "securityState": "UNKNOWN",
   "source": "owner-seed",
   "strategies": [],
   "types": [],
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activities": [
    "major-btcfi",
    "major-native-staking"
   ],
   "aliases": [
    "Babylon Protocol"
   ],
   "category": "BTCFI",
   "description": "Bitcoin staking protocol: BTC holders stake natively on Bitcoin (self-custodial, via Bitcoin scripts/timelocks) to provide security to other chains, coordinated by the Babylon chain.",
   "identityNote": "Babylon is a distinct canonical entity from the Bitcoin network (bitcoin-mainnet): the networkRefs entry names Bitcoin because BTC staking is anchored on Bitcoin; Babylon's own coordination chain is not a Batch 2 network and is not referenced as one.",
   "name": "Babylon",
   "networks": [
    "bitcoin-mainnet"
   ],
   "protocolId": "protocol-babylon",
   "securityState": "UNKNOWN",
   "source": "owner-seed",
   "strategies": [],
   "types": [],
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activities": [
    "major-liquid-staking"
   ],
   "aliases": [
    "Jito Network"
   ],
   "category": "STAKING",
   "description": "Solana liquid staking and MEV infrastructure protocol: SOL stakers receive the JitoSOL liquid staking asset while validators run Jito's block-building software.",
   "identityNote": "JitoSOL, Jito's liquid staking asset, is deliberately not a Batch 2 asset record; it is a natural future pipeline candidate. Its absence is a scope decision, not an identity claim.",
   "name": "Jito",
   "networks": [
    "solana-mainnet"
   ],
   "protocolId": "protocol-jito",
   "securityState": "UNKNOWN",
   "source": "owner-seed",
   "strategies": [],
   "types": [],
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activities": [
    "major-asset-lending",
    "major-collateralized-borrowing"
   ],
   "aliases": [
    "Kamino Finance"
   ],
   "category": "LENDING",
   "description": "Solana lending protocol (Kamino Lend) with automated concentrated-liquidity vaults; the largest lending market on Solana.",
   "name": "Kamino",
   "networks": [
    "solana-mainnet"
   ],
   "protocolId": "protocol-kamino",
   "securityState": "UNKNOWN",
   "source": "owner-seed",
   "strategies": [],
   "types": [],
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activities": [
    "major-token-swapping",
    "major-standard-liquidity-provision",
    "major-concentrated-liquidity-provision"
   ],
   "aliases": [
    "Trader Joe",
    "TraderJoe"
   ],
   "category": "DEX",
   "description": "LFJ (formerly Trader Joe) is a decentralized exchange native to Avalanche, known for its Liquidity Book bin-based AMM design; also deployed on Arbitrum and BNB Chain. The project rebranded from Trader Joe to LFJ in 2024; the protocol and its JOE token continue under the new brand. Per owner ruling at the Batch 2 freeze (2026-11-16), the canonical name is the CURRENT brand LFJ with Trader Joe preserved as former name/aliases, and the permanent canonical id protocol-traderjoe is unchanged — canonical ids do not change when names or brands change. One canonical entity across the rebrand; no second LFJ record exists.",
   "identityNote": "Trader Joe rebranded to LFJ in 2024. This record keeps the canonical name Trader Joe with LFJ recorded as an alias — a brand refresh of the same protocol with the same JOE token, stated explicitly on the record rather than silently collapsed or split. (A Sky-style canonical rename remains available as an owner ruling at freeze.)",
   "name": "LFJ",
   "networks": [
    "avalanche-mainnet",
    "arbitrum-mainnet",
    "bnb-chain-mainnet"
   ],
   "protocolId": "protocol-traderjoe",
   "securityState": "UNKNOWN",
   "source": "owner-seed",
   "strategies": [],
   "types": [],
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activities": [
    "major-perpetual-trading"
   ],
   "aliases": [
    "dYdX Protocol",
    "dYdX v4"
   ],
   "category": "DERIVATIVES",
   "description": "Decentralized perpetuals trading protocol: an order-book perpetuals exchange whose current version operates on its own appchain, dYdX Chain.",
   "identityNote": "P1 IDENTITY RULING (Option B): the dYdX protocol is a distinct canonical entity from dYdX Chain (network) and from DYDX (asset). The protocol previously operated on Ethereum/StarkEx (v3) and migrated to its own chain (v4) — an entity whose identity persisted across networks cannot be identical to any one of those networks. Collapsing it into the network record would also strip the DERIVATIVES category and the perpetual-trading encyclopedia relationship, which only protocol records carry.",
   "name": "dYdX",
   "networks": [
    "dydx-mainnet"
   ],
   "protocolId": "protocol-dydx",
   "securityState": "UNKNOWN",
   "source": "owner-seed",
   "strategies": [],
   "types": [],
   "verificationStatus": "UNVERIFIED"
  }
 ],
 "records": [
  {
   "aliases": [
    "Avalanche",
    "Avalanche C-Chain",
    "AVAX C-Chain"
   ],
   "chainId": 43114,
   "definition": "The Avalanche C-Chain mainnet network: the EVM-compatible contract chain of the Avalanche multi-chain architecture, with EIP-155 chain id 43114 and AVAX as its native asset.",
   "id": "avalanche-mainnet",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "nativeAssetRef": "avax-avalanche",
   "registry": "chains",
   "source": "owner-seed",
   "title": "Avalanche C-Chain",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Optimism",
    "OP Mainnet"
   ],
   "chainId": 10,
   "definition": "The OP Mainnet network: an EVM-compatible Ethereum layer-2 (OP Stack) with EIP-155 chain id 10. Its native gas asset is Ether; OP is its governance token.",
   "id": "optimism-mainnet",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "nativeAssetRef": "eth-ethereum",
   "note": "nativeAssetRef points at eth-ethereum, a Batch 1 asset — the correct canonical native asset of this network. This is a cross-batch reference: it resolves against the existing canonical store, not within Batch 2 alone (see the P1 validation report).",
   "registry": "chains",
   "source": "owner-seed",
   "title": "OP Mainnet",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "dYdX Chain",
    "dYdX v4 Chain"
   ],
   "chainId": null,
   "definition": "The dYdX Chain network: a Cosmos SDK appchain (chain id dydx-mainnet-1) operated for the dYdX protocol, with DYDX as its native staking and governance asset. The network is a distinct canonical entity from the dYdX protocol (protocol-dydx) and from the DYDX asset (dydx-dydx-chain).",
   "id": "dydx-mainnet",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "nativeAssetRef": "dydx-dydx-chain",
   "registry": "chains",
   "source": "owner-seed",
   "title": "dYdX Chain",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Binance Coin"
   ],
   "definition": "BNB is the native asset of BNB Smart Chain, used for gas and staking in the BNB Chain ecosystem. It was originally named Binance Coin; BNB is the current canonical name of the same asset.",
   "id": "bnb-bnb-chain",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "nativeOrToken": "native",
   "networkRef": "bnb-chain-mainnet",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "BNB",
   "title": "BNB (BNB Chain)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Polygon Ecosystem Token"
   ],
   "definition": "POL is the native asset of Polygon PoS, used for gas and staking. POL is the migration successor of MATIC (1:1 upgrade, 2024) — the same asset identity across the migration, not a second asset.",
   "formerName": "MATIC",
   "id": "pol-polygon",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "nativeOrToken": "native",
   "networkRef": "polygon-mainnet",
   "note": "SPECIAL IDENTITY CASE: formerName MATIC records the predecessor ticker/name on this single canonical record (the Maker/Sky formerName precedent applied to an asset migration). A future candidate named MATIC dedupes INTO this record via formerName + alias knowledge; MATIC must never be registered as a separate asset.",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "POL",
   "title": "POL (Polygon)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "AVAX"
   ],
   "definition": "AVAX is the native asset of the Avalanche C-Chain, used for gas and for staking in the Avalanche network.",
   "id": "avax-avalanche",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "nativeOrToken": "native",
   "networkRef": "avalanche-mainnet",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "AVAX",
   "title": "Avalanche (AVAX)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Optimism Token"
   ],
   "definition": "OP is the governance token of OP Mainnet and the Optimism Collective. It is not the network's gas asset (Ether is); the token and the network are distinct canonical entities.",
   "id": "op-optimism",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "nativeOrToken": "token",
   "networkRef": "optimism-mainnet",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "OP",
   "title": "Optimism (OP, OP Mainnet)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Chainlink Token"
   ],
   "definition": "LINK is the token of the Chainlink oracle network, used to pay oracle node operators and for staking/governance in the Chainlink ecosystem. The token is a distinct canonical entity from the Chainlink protocol (protocol-chainlink).",
   "id": "link-ethereum",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "nativeOrToken": "token",
   "networkRef": "ethereum-mainnet",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "LINK",
   "title": "Chainlink (LINK, Ethereum)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Pyth Token"
   ],
   "definition": "PYTH is the governance token of the Pyth Network oracle protocol; its canonical mint is on Solana. Representations of PYTH on other networks are wrapped/bridged variants of this record, not separate assets. The token is a distinct canonical entity from the Pyth protocol (protocol-pyth).",
   "id": "pyth-solana",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "nativeOrToken": "token",
   "networkRef": "solana-mainnet",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "PYTH",
   "title": "Pyth Network (PYTH, Solana)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Eigen Token"
   ],
   "definition": "EIGEN is the token of EigenLayer, the Ethereum restaking protocol — its governance and staking/work token. The token is a distinct canonical entity from the EigenLayer protocol (protocol-eigenlayer).",
   "id": "eigen-ethereum",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "nativeOrToken": "token",
   "networkRef": "ethereum-mainnet",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "EIGEN",
   "title": "EigenLayer (EIGEN, Ethereum)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "ethDYDX"
   ],
   "definition": "DYDX is the native staking and governance asset of dYdX Chain. It was originally issued on Ethereum as ethDYDX and migrated to dYdX Chain as its native asset — one asset identity across the migration; ethDYDX is an alias, not a separate asset.",
   "id": "dydx-dydx-chain",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "nativeOrToken": "native",
   "networkRef": "dydx-mainnet",
   "note": "SPECIAL IDENTITY CASE: the DYDX asset migrated networks (Ethereum -> dYdX Chain) without changing identity — the same pattern the dYdX protocol itself followed (see protocol-dydx identityNote). The canonical record is anchored to its current native network.",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "DYDX",
   "title": "dYdX (DYDX, dYdX Chain)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-bridging",
    "major-intent-based-execution"
   ],
   "aliases": [
    "Across Protocol"
   ],
   "definition": "Intent-based cross-chain bridge protocol: solvers fill user intents on destination chains against a hub pool on Ethereum.",
   "id": "protocol-across",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "networkRefs": [
    "ethereum-mainnet",
    "arbitrum-mainnet",
    "base-mainnet",
    "optimism-mainnet",
    "polygon-mainnet"
   ],
   "registry": "protocols",
   "source": "owner-seed",
   "title": "Across",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-bridging",
    "major-cross-chain-routing-settlement"
   ],
   "aliases": [
    "Stargate Finance"
   ],
   "definition": "Cross-chain liquidity transfer protocol built on LayerZero messaging, using unified liquidity pools for native asset transfers.",
   "id": "protocol-stargate",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "networkRefs": [
    "ethereum-mainnet",
    "arbitrum-mainnet",
    "base-mainnet",
    "optimism-mainnet",
    "polygon-mainnet",
    "bnb-chain-mainnet",
    "avalanche-mainnet"
   ],
   "registry": "protocols",
   "source": "owner-seed",
   "title": "Stargate",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [],
   "aliases": [
    "Chainlink Network"
   ],
   "definition": "Decentralized oracle network providing data feeds, verifiable randomness and automation to smart contracts across many networks.",
   "id": "protocol-chainlink",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "networkRefs": [
    "ethereum-mainnet",
    "arbitrum-mainnet",
    "base-mainnet",
    "optimism-mainnet",
    "polygon-mainnet",
    "bnb-chain-mainnet",
    "avalanche-mainnet",
    "solana-mainnet"
   ],
   "note": "activityRefs is intentionally empty: no canonical-60 major directly names oracle data provision (the known taxonomy gap recorded in the Build Resumption Map). The protocol is registered for its identity and network relationships; no activity relationship is fabricated to fill the field.",
   "registry": "protocols",
   "source": "owner-seed",
   "title": "Chainlink",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [],
   "aliases": [
    "Pyth"
   ],
   "definition": "Pull-based oracle protocol publishing first-party price data from exchanges and trading firms, originating on Solana and operating across many networks.",
   "id": "protocol-pyth",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "networkRefs": [
    "solana-mainnet",
    "ethereum-mainnet",
    "arbitrum-mainnet",
    "base-mainnet",
    "optimism-mainnet",
    "polygon-mainnet",
    "bnb-chain-mainnet",
    "avalanche-mainnet"
   ],
   "note": "activityRefs is intentionally empty: no canonical-60 major directly names oracle data provision (the known taxonomy gap recorded in the Build Resumption Map). The protocol is registered for its identity and network relationships; no activity relationship is fabricated to fill the field.",
   "registry": "protocols",
   "source": "owner-seed",
   "title": "Pyth Network",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-restaking",
    "major-liquid-restaking"
   ],
   "aliases": [
    "Eigen Layer"
   ],
   "definition": "Restaking protocol on Ethereum: staked ETH and liquid staking assets can be restaked to secure additional services (AVSs).",
   "id": "protocol-eigenlayer",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "networkRefs": [
    "ethereum-mainnet"
   ],
   "registry": "protocols",
   "source": "owner-seed",
   "title": "EigenLayer",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-automated-strategy-vaults",
    "major-yield-aggregation-auto-compounding"
   ],
   "aliases": [
    "Yearn",
    "yearn.finance"
   ],
   "definition": "Yield vault system: vaults deploy deposited assets into managed strategies and auto-compound returns for depositors.",
   "id": "protocol-yearn",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "networkRefs": [
    "ethereum-mainnet"
   ],
   "registry": "protocols",
   "source": "owner-seed",
   "title": "Yearn Finance",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-btcfi",
    "major-native-staking"
   ],
   "aliases": [
    "Babylon Protocol"
   ],
   "definition": "Bitcoin staking protocol: BTC holders stake natively on Bitcoin (self-custodial, via Bitcoin scripts/timelocks) to provide security to other chains, coordinated by the Babylon chain.",
   "id": "protocol-babylon",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "networkRefs": [
    "bitcoin-mainnet"
   ],
   "registry": "protocols",
   "source": "owner-seed",
   "title": "Babylon",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-liquid-staking"
   ],
   "aliases": [
    "Jito Network"
   ],
   "definition": "Solana liquid staking and MEV infrastructure protocol: SOL stakers receive the JitoSOL liquid staking asset while validators run Jito's block-building software.",
   "id": "protocol-jito",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "networkRefs": [
    "solana-mainnet"
   ],
   "registry": "protocols",
   "source": "owner-seed",
   "title": "Jito",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-asset-lending",
    "major-collateralized-borrowing"
   ],
   "aliases": [
    "Kamino Finance"
   ],
   "definition": "Solana lending protocol (Kamino Lend) with automated concentrated-liquidity vaults; the largest lending market on Solana.",
   "id": "protocol-kamino",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "networkRefs": [
    "solana-mainnet"
   ],
   "registry": "protocols",
   "source": "owner-seed",
   "title": "Kamino",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-token-swapping",
    "major-standard-liquidity-provision",
    "major-concentrated-liquidity-provision"
   ],
   "aliases": [
    "Trader Joe",
    "TraderJoe"
   ],
   "definition": "LFJ (formerly Trader Joe) is a decentralized exchange native to Avalanche, known for its Liquidity Book bin-based AMM design; also deployed on Arbitrum and BNB Chain. The project rebranded from Trader Joe to LFJ in 2024; the protocol and its JOE token continue under the new brand. Per owner ruling at the Batch 2 freeze (2026-11-16), the canonical name is the CURRENT brand LFJ with Trader Joe preserved as former name/aliases, and the permanent canonical id protocol-traderjoe is unchanged — canonical ids do not change when names or brands change. One canonical entity across the rebrand; no second LFJ record exists.",
   "formerName": "Trader Joe",
   "id": "protocol-traderjoe",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "networkRefs": [
    "avalanche-mainnet",
    "arbitrum-mainnet",
    "bnb-chain-mainnet"
   ],
   "note": "Owner ruling at Batch 2 freeze (2026-11-16): canonical name is the CURRENT brand LFJ; Trader Joe preserved as formerName + aliases; permanent id protocol-traderjoe unchanged (ids do not change on rebrand); ONE canonical entity across the rebrand, no second LFJ record.",
   "registry": "protocols",
   "source": "owner-seed",
   "title": "LFJ",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-perpetual-trading"
   ],
   "aliases": [
    "dYdX Protocol",
    "dYdX v4"
   ],
   "definition": "Decentralized perpetuals trading protocol: an order-book perpetuals exchange whose current version operates on its own appchain, dYdX Chain.",
   "id": "protocol-dydx",
   "importBatch": "entity-batch-2",
   "lastReviewedAt": "2026-11-16",
   "networkRefs": [
    "dydx-mainnet"
   ],
   "note": "See the module record's identityNote for the full Option B ruling: protocol, network and asset are three distinct canonical entities, related — never collapsed.",
   "registry": "protocols",
   "source": "owner-seed",
   "title": "dYdX",
   "verificationStatus": "UNVERIFIED"
  }
 ]
};
})(window);
