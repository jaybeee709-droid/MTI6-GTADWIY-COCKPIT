/* MTI6-GTADWIY-COCKPIT — Entity Batch 1 data (foundation seed, Nov 14, 2026)
 * The first validated canonical entity seed: 8 networks, 10 assets,
 * 8 protocols — 26 records. Scope frozen by owner decision
 * Nov 14, 2026 (Option A); authored offline, validated against the
 * current module schemas (0 errors), and accepted at owner review
 * as the FOUNDATION SEED — a foundation, not the limit of the
 * Entity Universe.
 *
 * Shape: `records` are the canonical Crypto World store records
 * (registries assets / chains / protocols); `networks`, `assets`
 * and `protocols` are the matching runtime-module records with the
 * SAME ids, registered by the encyclopedia import gate's
 * dual-registration step (canonical identity stays authoritative;
 * module registration is derived state). Identity foundation only:
 * no prices, APY/APR, TVL, balances, holdings, earnings, market
 * data, or live claims anywhere in this file. Every record is
 * UNVERIFIED. Maker/Sky is ONE record (protocol-sky, formerName
 * Maker) — see the owner-reviewed artifact.
 */
(function (global) {
  "use strict";
  global.EncyclopediaEntityBatch1 = {
 "assets": [
  {
   "assetClass": "native-currency",
   "assetId": "btc-bitcoin",
   "canonicalName": "Bitcoin",
   "name": "Bitcoin",
   "nativeOrToken": "native",
   "networkId": "bitcoin-mainnet",
   "note": "Native asset of the Bitcoin network. Identity anchors: networkId + canonicalName. No contract address exists for a native asset.",
   "source": "owner-seed",
   "symbol": "BTC",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "assetClass": "native-currency",
   "assetId": "eth-ethereum",
   "canonicalName": "Ether",
   "name": "Ether",
   "nativeOrToken": "native",
   "networkId": "ethereum-mainnet",
   "note": "Native asset of Ethereum. The same ticker ETH is also the native asset of Base and Arbitrum One; those are separate network contexts of the same asset and are NOT separate records in this batch. Identity anchors: networkId + canonicalName.",
   "source": "owner-seed",
   "symbol": "ETH",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "assetClass": "native-currency",
   "assetId": "sol-solana",
   "canonicalName": "Solana",
   "name": "Solana",
   "nativeOrToken": "native",
   "networkId": "solana-mainnet",
   "note": "Native asset of Solana. Identity anchors: networkId + canonicalName.",
   "source": "owner-seed",
   "symbol": "SOL",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "assetClass": "native-currency",
   "assetId": "atom-cosmos-hub",
   "canonicalName": "Cosmos",
   "name": "Cosmos",
   "nativeOrToken": "native",
   "networkId": "cosmos-hub",
   "note": "Native staking asset of Cosmos Hub. Identity anchors: networkId + canonicalName.",
   "source": "owner-seed",
   "symbol": "ATOM",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "assetClass": "stablecoin",
   "assetId": "usdc-ethereum",
   "canonicalName": "USD Coin",
   "contractAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
   "issuer": "Circle",
   "name": "USD Coin",
   "nativeOrToken": "token",
   "networkId": "ethereum-mainnet",
   "note": "Canonical Ethereum-mainnet USDC only. USDC exists on many networks; each deployment is a distinct identity and is NOT this record. Identity anchors: networkId + contractAddress + issuer.",
   "source": "owner-seed",
   "symbol": "USDC",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "assetClass": "stablecoin",
   "assetId": "usdt-ethereum",
   "canonicalName": "Tether USD",
   "contractAddress": "0xdac17f958d2ee523a2206206994597c13d831ec7",
   "issuer": "Tether",
   "name": "Tether USD",
   "nativeOrToken": "token",
   "networkId": "ethereum-mainnet",
   "note": "Canonical Ethereum-mainnet USDT only; other deployments are distinct identities. Identity anchors: networkId + contractAddress + issuer.",
   "source": "owner-seed",
   "symbol": "USDT",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "assetClass": "stablecoin",
   "assetId": "dai-ethereum",
   "canonicalName": "Dai",
   "contractAddress": "0x6b175474e89094c44da98b954eedeac495271d0f",
   "name": "Dai",
   "nativeOrToken": "token",
   "networkId": "ethereum-mainnet",
   "note": "DAI, the stablecoin originally issued through Maker (now Sky). Identity anchors: networkId + contractAddress + protocol.",
   "protocol": "protocol-sky",
   "source": "owner-seed",
   "symbol": "DAI",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "assetClass": "wrapped-asset",
   "assetId": "wbtc-ethereum",
   "canonicalName": "Wrapped Bitcoin",
   "contractAddress": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
   "issuer": "BitGo (WBTC DAO)",
   "name": "Wrapped Bitcoin",
   "nativeOrToken": "token",
   "networkId": "ethereum-mainnet",
   "note": "WBTC is a wrapped representation of BTC on Ethereum \u2014 a distinct identity from btc-bitcoin, never a match for it. Identity anchors: networkId + contractAddress + issuer.",
   "source": "owner-seed",
   "symbol": "WBTC",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "assetClass": "governance-token",
   "assetId": "uni-ethereum",
   "canonicalName": "Uniswap",
   "contractAddress": "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
   "name": "Uniswap",
   "nativeOrToken": "token",
   "networkId": "ethereum-mainnet",
   "note": "UNI governance token (Ethereum mainnet). Identity anchors: networkId + contractAddress + protocol.",
   "protocol": "protocol-uniswap",
   "source": "owner-seed",
   "symbol": "UNI",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "assetClass": "governance-token",
   "assetId": "aave-ethereum",
   "canonicalName": "Aave",
   "contractAddress": "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
   "name": "Aave",
   "nativeOrToken": "token",
   "networkId": "ethereum-mainnet",
   "note": "AAVE governance token (Ethereum mainnet). Identity anchors: networkId + contractAddress + protocol.",
   "protocol": "protocol-aave",
   "source": "owner-seed",
   "symbol": "AAVE",
   "verificationStatus": "UNVERIFIED"
  }
 ],
 "batch": "entity-batch-1",
 "kind": "entity",
 "label": "Entity Batch 1 \u2014 foundation seed (26 entities)",
 "networks": [
  {
   "accountModel": "ACCOUNT",
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
   "chainId": 1,
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
   "id": "ethereum-mainnet",
   "name": "Ethereum",
   "nativeAsset": {
    "assetClassId": "native-coins",
    "networkId": "ethereum-mainnet",
    "ticker": "ETH"
   },
   "rpcProviders": [
    {
     "endpointLabel": "example.invalid/eth-http-1",
     "kind": "HTTP",
     "priority": 1,
     "status": "UNKNOWN"
    }
   ],
   "source": "owner-seed",
   "verificationStatus": "UNVERIFIED",
   "vm": "EVM",
   "vmNotes": "EVM, account-based, EIP-155 chain id 1.",
   "walletCompatibility": [
    "EIP-1193"
   ]
  },
  {
   "accountModel": "UTXO",
   "assetRelationships": [
    {
     "assetClassId": "native-coins",
     "relationship": "NATIVE"
    }
   ],
   "chainId": null,
   "explorer": {
    "label": "Example explorer",
    "urlTemplate": "https://example.invalid/tx/{txHash}"
   },
   "fallbackProviders": [],
   "familyId": "bitcoin-family",
   "freshness": {
    "lastChecked": null,
    "maxAgeMs": null
   },
   "health": {
    "status": "UNKNOWN"
   },
   "id": "bitcoin-mainnet",
   "name": "Bitcoin",
   "nativeAsset": {
    "assetClassId": "native-coins",
    "networkId": "bitcoin-mainnet",
    "ticker": "BTC"
   },
   "rpcProviders": [
    {
     "endpointLabel": "example.invalid/btc-http-1",
     "kind": "HTTP",
     "priority": 1,
     "status": "UNKNOWN"
    }
   ],
   "source": "owner-seed",
   "verificationStatus": "UNVERIFIED",
   "vm": "UTXO",
   "vmNotes": "UTXO-based, no EVM semantics, no chain id.",
   "walletCompatibility": [
    "BIP-32"
   ]
  },
  {
   "accountModel": "ACCOUNT",
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
   "familyId": "solana-family",
   "freshness": {
    "lastChecked": null,
    "maxAgeMs": null
   },
   "health": {
    "status": "UNKNOWN"
   },
   "id": "solana-mainnet",
   "name": "Solana",
   "nativeAsset": {
    "assetClassId": "native-coins",
    "networkId": "solana-mainnet",
    "ticker": "SOL"
   },
   "rpcProviders": [
    {
     "endpointLabel": "example.invalid/sol-http-1",
     "kind": "HTTP",
     "priority": 1,
     "status": "UNKNOWN"
    }
   ],
   "source": "owner-seed",
   "verificationStatus": "UNVERIFIED",
   "vm": "SVM",
   "vmNotes": "Solana VM, account-based, no EIP-155 chain id.",
   "walletCompatibility": [
    "WALLET-ADAPTER"
   ]
  },
  {
   "accountModel": "ACCOUNT",
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
   "id": "cosmos-hub",
   "name": "Cosmos Hub",
   "nativeAsset": {
    "assetClassId": "native-coins",
    "networkId": "cosmos-hub",
    "ticker": "ATOM"
   },
   "rpcProviders": [
    {
     "endpointLabel": "example.invalid/atom-http-1",
     "kind": "HTTP",
     "priority": 1,
     "status": "UNKNOWN"
    }
   ],
   "source": "owner-seed",
   "verificationStatus": "UNVERIFIED",
   "vm": "COSMOS",
   "vmNotes": "Cosmos SDK / CometBFT, account-based, chain id cosmoshub-4.",
   "walletCompatibility": [
    "COSMOS-KIT"
   ]
  },
  {
   "accountModel": "ACCOUNT",
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
   "chainId": 8453,
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
   "id": "base-mainnet",
   "name": "Base",
   "nativeAsset": {
    "assetClassId": "native-coins",
    "networkId": "base-mainnet",
    "ticker": "ETH"
   },
   "rpcProviders": [
    {
     "endpointLabel": "example.invalid/base-http-1",
     "kind": "HTTP",
     "priority": 1,
     "status": "UNKNOWN"
    }
   ],
   "source": "owner-seed",
   "verificationStatus": "UNVERIFIED",
   "vm": "EVM",
   "vmNotes": "EVM, account-based, EIP-155 chain id 8453. Ethereum layer-2 (OP Stack); settles to Ethereum.",
   "walletCompatibility": [
    "EIP-1193",
    "EIP-6963"
   ]
  },
  {
   "accountModel": "ACCOUNT",
   "aliases": [
    "Arbitrum"
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
   "chainId": 42161,
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
   "id": "arbitrum-mainnet",
   "name": "Arbitrum One",
   "nativeAsset": {
    "assetClassId": "native-coins",
    "networkId": "arbitrum-mainnet",
    "ticker": "ETH"
   },
   "rpcProviders": [
    {
     "endpointLabel": "example.invalid/arb-http-1",
     "kind": "HTTP",
     "priority": 1,
     "status": "UNKNOWN"
    }
   ],
   "source": "owner-seed",
   "verificationStatus": "UNVERIFIED",
   "vm": "EVM",
   "vmNotes": "EVM, account-based, EIP-155 chain id 42161. Ethereum layer-2 (optimistic rollup); settles to Ethereum.",
   "walletCompatibility": [
    "EIP-1193",
    "EIP-6963"
   ]
  },
  {
   "accountModel": "ACCOUNT",
   "aliases": [
    "BNB Chain",
    "BSC"
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
   "chainId": 56,
   "explorer": {
    "label": "Example explorer",
    "urlTemplate": "https://example.invalid/tx/{txHash}"
   },
   "fallbackProviders": [],
   "familyId": "bnb-family",
   "freshness": {
    "lastChecked": null,
    "maxAgeMs": null
   },
   "health": {
    "status": "UNKNOWN"
   },
   "id": "bnb-chain-mainnet",
   "name": "BNB Smart Chain",
   "nativeAsset": {
    "assetClassId": "native-coins",
    "networkId": "bnb-chain-mainnet",
    "ticker": "BNB"
   },
   "rpcProviders": [
    {
     "endpointLabel": "example.invalid/bnb-http-1",
     "kind": "HTTP",
     "priority": 1,
     "status": "UNKNOWN"
    }
   ],
   "source": "owner-seed",
   "verificationStatus": "UNVERIFIED",
   "vm": "EVM",
   "vmNotes": "EVM, account-based, EIP-155 chain id 56. BNB Chain ecosystem (not an Ethereum layer-2).",
   "walletCompatibility": [
    "EIP-1193",
    "EIP-6963"
   ]
  },
  {
   "accountModel": "ACCOUNT",
   "aliases": [
    "Polygon",
    "Matic Network"
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
   "chainId": 137,
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
   "id": "polygon-mainnet",
   "name": "Polygon PoS",
   "nativeAsset": {
    "assetClassId": "native-coins",
    "networkId": "polygon-mainnet",
    "ticker": "POL"
   },
   "rpcProviders": [
    {
     "endpointLabel": "example.invalid/polygon-http-1",
     "kind": "HTTP",
     "priority": 1,
     "status": "UNKNOWN"
    }
   ],
   "source": "owner-seed",
   "verificationStatus": "UNVERIFIED",
   "vm": "EVM",
   "vmNotes": "EVM, account-based, EIP-155 chain id 137. Polygon proof-of-stake sidechain; checkpoints to Ethereum.",
   "walletCompatibility": [
    "EIP-1193",
    "EIP-6963"
   ]
  }
 ],
 "protocols": [
  {
   "activities": [
    "major-token-swapping",
    "major-standard-liquidity-provision",
    "major-concentrated-liquidity-provision"
   ],
   "category": "DEX",
   "description": "Decentralized exchange protocol built on automated market maker pools, including concentrated-liquidity pools.",
   "name": "Uniswap",
   "networks": [
    "ethereum-mainnet",
    "base-mainnet",
    "arbitrum-mainnet",
    "polygon-mainnet",
    "bnb-chain-mainnet"
   ],
   "protocolId": "protocol-uniswap",
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
   "category": "LENDING",
   "description": "Decentralized lending protocol where users supply assets to liquidity markets and borrow against collateral.",
   "name": "Aave",
   "networks": [
    "ethereum-mainnet",
    "arbitrum-mainnet",
    "polygon-mainnet",
    "base-mainnet"
   ],
   "protocolId": "protocol-aave",
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
   "category": "LENDING",
   "description": "Decentralized lending protocol with algorithmic interest-rate markets and isolated collateral markets (Compound III).",
   "name": "Compound",
   "networks": [
    "ethereum-mainnet",
    "arbitrum-mainnet",
    "base-mainnet",
    "polygon-mainnet"
   ],
   "protocolId": "protocol-compound",
   "securityState": "UNKNOWN",
   "source": "owner-seed",
   "strategies": [],
   "types": [],
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activities": [
    "major-collateralized-borrowing"
   ],
   "aliases": [
    "Maker",
    "MakerDAO",
    "Maker Protocol"
   ],
   "category": "LENDING",
   "description": "Collateralized debt position protocol issuing the DAI stablecoin (and USDS); this is the protocol formerly known as Maker \u2014 one protocol identity across the 2024 rebrand, not two protocols.",
   "identityNote": "SPECIAL IDENTITY CASE (owner-directed): canonical id protocol-sky, canonical name Sky. Maker / MakerDAO are recorded as aliases of this single record. The rename is explicit (formerName: Maker) \u2014 the protocol is neither split into two unrelated records nor silently collapsed: the alias relationship is stated on the record itself.",
   "name": "Sky",
   "networks": [
    "ethereum-mainnet"
   ],
   "protocolId": "protocol-sky",
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
   "category": "STAKING",
   "description": "Liquid staking protocol that issues a liquid staking token representing staked ether.",
   "name": "Lido",
   "networks": [
    "ethereum-mainnet"
   ],
   "protocolId": "protocol-lido",
   "securityState": "UNKNOWN",
   "source": "owner-seed",
   "strategies": [],
   "types": [],
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activities": [
    "major-standard-liquidity-provision",
    "major-token-swapping"
   ],
   "category": "DEX",
   "description": "Decentralized exchange protocol specialized in liquidity pools of similarly priced assets such as stablecoins.",
   "name": "Curve",
   "networks": [
    "ethereum-mainnet",
    "arbitrum-mainnet",
    "polygon-mainnet",
    "base-mainnet"
   ],
   "protocolId": "protocol-curve",
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
   "category": "DERIVATIVES",
   "description": "Decentralized perpetuals exchange using shared liquidity pools. GMX also operates on Avalanche, which is outside this batch's network set and is deliberately not referenced.",
   "name": "GMX",
   "networks": [
    "arbitrum-mainnet"
   ],
   "protocolId": "protocol-gmx",
   "securityState": "UNKNOWN",
   "source": "owner-seed",
   "strategies": [],
   "types": [],
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activities": [
    "major-swap-aggregation-route-optimization",
    "major-token-swapping"
   ],
   "category": "AGGREGATOR",
   "description": "Swap aggregation and route optimization protocol on Solana.",
   "name": "Jupiter",
   "networks": [
    "solana-mainnet"
   ],
   "protocolId": "protocol-jupiter",
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
    "Ethereum Mainnet"
   ],
   "chainId": 1,
   "definition": "The Ethereum mainnet network: an account-based, EVM blockchain with EIP-155 chain id 1 and ether (ETH) as its native asset.",
   "id": "ethereum-mainnet",
   "importBatch": "entity-batch-1",
   "nativeAssetRef": "eth-ethereum",
   "registry": "chains",
   "source": "owner-seed",
   "title": "Ethereum",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Bitcoin Mainnet"
   ],
   "chainId": null,
   "definition": "The Bitcoin mainnet network: a UTXO-based blockchain with no EVM semantics and no chain id, with bitcoin (BTC) as its native asset.",
   "id": "bitcoin-mainnet",
   "importBatch": "entity-batch-1",
   "nativeAssetRef": "btc-bitcoin",
   "registry": "chains",
   "source": "owner-seed",
   "title": "Bitcoin",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Solana Mainnet"
   ],
   "chainId": null,
   "definition": "The Solana mainnet network: an account-based blockchain using the Solana VM, with SOL as its native asset.",
   "id": "solana-mainnet",
   "importBatch": "entity-batch-1",
   "nativeAssetRef": "sol-solana",
   "registry": "chains",
   "source": "owner-seed",
   "title": "Solana",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Cosmos",
    "Cosmos Hub Mainnet"
   ],
   "chainId": null,
   "definition": "The Cosmos Hub network: a Cosmos SDK blockchain (chain id cosmoshub-4) with ATOM as its native staking asset and IBC interoperability.",
   "id": "cosmos-hub",
   "importBatch": "entity-batch-1",
   "nativeAssetRef": "atom-cosmos-hub",
   "registry": "chains",
   "source": "owner-seed",
   "title": "Cosmos Hub",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Base Mainnet"
   ],
   "chainId": 8453,
   "definition": "The Base mainnet network: an Ethereum layer-2 (OP Stack) with EIP-155 chain id 8453 that settles to Ethereum and uses ETH as its native asset.",
   "id": "base-mainnet",
   "importBatch": "entity-batch-1",
   "nativeAssetRef": "eth-ethereum",
   "registry": "chains",
   "source": "owner-seed",
   "title": "Base",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Arbitrum",
    "Arbitrum Mainnet"
   ],
   "chainId": 42161,
   "definition": "The Arbitrum One mainnet network: an Ethereum layer-2 optimistic rollup with EIP-155 chain id 42161 that settles to Ethereum and uses ETH as its native asset.",
   "id": "arbitrum-mainnet",
   "importBatch": "entity-batch-1",
   "nativeAssetRef": "eth-ethereum",
   "registry": "chains",
   "source": "owner-seed",
   "title": "Arbitrum One",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "BNB Chain",
    "BSC",
    "Binance Smart Chain"
   ],
   "chainId": 56,
   "definition": "The BNB Smart Chain mainnet network: an EVM-compatible blockchain in the BNB Chain ecosystem (not an Ethereum layer-2) with EIP-155 chain id 56 and BNB as its native asset.",
   "id": "bnb-chain-mainnet",
   "importBatch": "entity-batch-1",
   "nativeAssetRef": null,
   "note": "BNB itself is not one of the 10 frozen asset records, so nativeAssetRef is null rather than pointing at a record outside the batch. The module-layer network record still names ticker BNB in its nativeAsset block, matching the EXAMPLE_NETWORKS convention.",
   "registry": "chains",
   "source": "owner-seed",
   "title": "BNB Smart Chain",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Polygon",
    "Matic Network",
    "Polygon Mainnet"
   ],
   "chainId": 137,
   "definition": "The Polygon PoS mainnet network: an EVM-compatible proof-of-stake sidechain with EIP-155 chain id 137 that checkpoints to Ethereum; its native asset is POL (formerly MATIC).",
   "id": "polygon-mainnet",
   "importBatch": "entity-batch-1",
   "nativeAssetRef": null,
   "note": "POL is not one of the 10 frozen asset records, so nativeAssetRef is null rather than pointing outside the batch.",
   "registry": "chains",
   "source": "owner-seed",
   "title": "Polygon PoS",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [],
   "definition": "Bitcoin, the native asset of the Bitcoin network, identified by its network and canonical name \u2014 never by ticker alone.",
   "id": "btc-bitcoin",
   "importBatch": "entity-batch-1",
   "nativeOrToken": "native",
   "networkRef": "bitcoin-mainnet",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "BTC",
   "title": "Bitcoin (BTC)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Ether"
   ],
   "definition": "Ether, the native asset of Ethereum, also used as the native asset of the Base and Arbitrum One layer-2 networks in this batch.",
   "id": "eth-ethereum",
   "importBatch": "entity-batch-1",
   "nativeOrToken": "native",
   "networkRef": "ethereum-mainnet",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "ETH",
   "title": "Ether (ETH)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [],
   "definition": "SOL, the native asset of the Solana network, identified by its network and canonical name \u2014 never by ticker alone.",
   "id": "sol-solana",
   "importBatch": "entity-batch-1",
   "nativeOrToken": "native",
   "networkRef": "solana-mainnet",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "SOL",
   "title": "Solana (SOL)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [],
   "definition": "ATOM, the native staking asset of Cosmos Hub, identified by its network and canonical name \u2014 never by ticker alone.",
   "id": "atom-cosmos-hub",
   "importBatch": "entity-batch-1",
   "nativeOrToken": "native",
   "networkRef": "cosmos-hub",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "ATOM",
   "title": "Cosmos (ATOM)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "USD Coin"
   ],
   "definition": "USD Coin on Ethereum mainnet, identified by its network, canonical contract address, and issuer Circle. USDC deployments on other networks are distinct identities.",
   "id": "usdc-ethereum",
   "importBatch": "entity-batch-1",
   "nativeOrToken": "token",
   "networkRef": "ethereum-mainnet",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "USDC",
   "title": "USD Coin (USDC, Ethereum)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Tether",
    "Tether USD"
   ],
   "definition": "Tether USD on Ethereum mainnet, identified by its network, canonical contract address, and issuer Tether. USDT deployments on other networks are distinct identities.",
   "id": "usdt-ethereum",
   "importBatch": "entity-batch-1",
   "nativeOrToken": "token",
   "networkRef": "ethereum-mainnet",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "USDT",
   "title": "Tether USD (USDT, Ethereum)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Dai"
   ],
   "definition": "Dai on Ethereum mainnet, the stablecoin originally issued through Maker (now Sky), identified by its network, canonical contract address, and issuing protocol.",
   "id": "dai-ethereum",
   "importBatch": "entity-batch-1",
   "nativeOrToken": "token",
   "networkRef": "ethereum-mainnet",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "DAI",
   "title": "Dai (DAI, Ethereum)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [
    "Wrapped Bitcoin"
   ],
   "definition": "Wrapped Bitcoin on Ethereum mainnet: a token representing BTC held with custodians. A distinct identity from bitcoin itself \u2014 never a match for btc-bitcoin.",
   "id": "wbtc-ethereum",
   "importBatch": "entity-batch-1",
   "nativeOrToken": "token",
   "networkRef": "ethereum-mainnet",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "WBTC",
   "title": "Wrapped Bitcoin (WBTC, Ethereum)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [],
   "definition": "UNI, the governance token of the Uniswap protocol on Ethereum mainnet, identified by its network, canonical contract address, and protocol.",
   "id": "uni-ethereum",
   "importBatch": "entity-batch-1",
   "nativeOrToken": "token",
   "networkRef": "ethereum-mainnet",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "UNI",
   "title": "Uniswap (UNI, Ethereum)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "aliases": [],
   "definition": "AAVE, the governance token of the Aave protocol on Ethereum mainnet, identified by its network, canonical contract address, and protocol.",
   "id": "aave-ethereum",
   "importBatch": "entity-batch-1",
   "nativeOrToken": "token",
   "networkRef": "ethereum-mainnet",
   "registry": "assets",
   "source": "owner-seed",
   "symbol": "AAVE",
   "title": "Aave (AAVE, Ethereum)",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-token-swapping",
    "major-standard-liquidity-provision",
    "major-concentrated-liquidity-provision"
   ],
   "aliases": [
    "Uniswap Protocol"
   ],
   "definition": "Uniswap is a decentralized exchange protocol built on automated market maker pools, including concentrated-liquidity pools.",
   "id": "protocol-uniswap",
   "importBatch": "entity-batch-1",
   "networkRefs": [
    "ethereum-mainnet",
    "base-mainnet",
    "arbitrum-mainnet",
    "polygon-mainnet",
    "bnb-chain-mainnet"
   ],
   "registry": "protocols",
   "source": "owner-seed",
   "title": "Uniswap",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-asset-lending",
    "major-collateralized-borrowing"
   ],
   "aliases": [
    "Aave Protocol"
   ],
   "definition": "Aave is a decentralized lending protocol where users supply assets to liquidity markets and borrow against collateral.",
   "id": "protocol-aave",
   "importBatch": "entity-batch-1",
   "networkRefs": [
    "ethereum-mainnet",
    "arbitrum-mainnet",
    "polygon-mainnet",
    "base-mainnet"
   ],
   "registry": "protocols",
   "source": "owner-seed",
   "title": "Aave",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-asset-lending",
    "major-collateralized-borrowing"
   ],
   "aliases": [
    "Compound Finance",
    "Compound Protocol"
   ],
   "definition": "Compound is a decentralized lending protocol with algorithmic interest-rate markets and isolated collateral markets (Compound III).",
   "id": "protocol-compound",
   "importBatch": "entity-batch-1",
   "networkRefs": [
    "ethereum-mainnet",
    "arbitrum-mainnet",
    "base-mainnet",
    "polygon-mainnet"
   ],
   "registry": "protocols",
   "source": "owner-seed",
   "title": "Compound",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-collateralized-borrowing"
   ],
   "aliases": [
    "Maker",
    "MakerDAO",
    "Maker Protocol"
   ],
   "definition": "Sky is the collateralized debt position protocol issuing the DAI stablecoin (and USDS), formerly known as Maker \u2014 one protocol identity across the 2024 rebrand.",
   "formerName": "Maker",
   "id": "protocol-sky",
   "importBatch": "entity-batch-1",
   "networkRefs": [
    "ethereum-mainnet"
   ],
   "note": "SPECIAL IDENTITY CASE (owner-directed): one canonical record, id protocol-sky, canonical name Sky, formerName Maker, aliases Maker/MakerDAO/Maker Protocol. Not two records; not a silent collapse \u2014 the rename relationship is stated on the record. USDS is not in this batch and is not referenced as an asset.",
   "registry": "protocols",
   "source": "owner-seed",
   "title": "Sky",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-liquid-staking"
   ],
   "aliases": [
    "Lido Finance",
    "Lido Protocol"
   ],
   "definition": "Lido is a liquid staking protocol that issues a liquid staking token representing staked ether.",
   "id": "protocol-lido",
   "importBatch": "entity-batch-1",
   "networkRefs": [
    "ethereum-mainnet"
   ],
   "registry": "protocols",
   "source": "owner-seed",
   "title": "Lido",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-standard-liquidity-provision",
    "major-token-swapping"
   ],
   "aliases": [
    "Curve Finance",
    "Curve Protocol"
   ],
   "definition": "Curve is a decentralized exchange protocol specialized in liquidity pools of similarly priced assets such as stablecoins.",
   "id": "protocol-curve",
   "importBatch": "entity-batch-1",
   "networkRefs": [
    "ethereum-mainnet",
    "arbitrum-mainnet",
    "polygon-mainnet",
    "base-mainnet"
   ],
   "registry": "protocols",
   "source": "owner-seed",
   "title": "Curve",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-perpetual-trading"
   ],
   "aliases": [
    "GMX Protocol"
   ],
   "definition": "GMX is a decentralized perpetuals exchange using shared liquidity pools, operating on Arbitrum One within this batch's network set.",
   "id": "protocol-gmx",
   "importBatch": "entity-batch-1",
   "networkRefs": [
    "arbitrum-mainnet"
   ],
   "note": "GMX also operates on Avalanche; that network is outside this batch and is deliberately not referenced.",
   "registry": "protocols",
   "source": "owner-seed",
   "title": "GMX",
   "verificationStatus": "UNVERIFIED"
  },
  {
   "activityRefs": [
    "major-swap-aggregation-route-optimization",
    "major-token-swapping"
   ],
   "aliases": [
    "Jupiter Exchange",
    "Jupiter Protocol"
   ],
   "definition": "Jupiter is a swap aggregation and route optimization protocol on Solana.",
   "id": "protocol-jupiter",
   "importBatch": "entity-batch-1",
   "networkRefs": [
    "solana-mainnet"
   ],
   "registry": "protocols",
   "source": "owner-seed",
   "title": "Jupiter",
   "verificationStatus": "UNVERIFIED"
  }
 ]
};
})(window);
