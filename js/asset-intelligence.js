/* MTI6-GTADWIY-COCKPIT — Asset Intelligence foundation (continuous campaign)
 *
 * Extensible runtime registry of asset CLASSES (not individual assets):
 * what kind of thing an asset is, how classes relate to each other, and
 * how to classify an asset descriptor without ever identifying it by
 * ticker alone. Read-only reference layer: no prices, no APYs, no
 * opportunities, no network calls, no secrets, no execution.
 *
 * Rules, fail-closed throughout:
 *   - Classes only. No individual asset is hard-coded here (no BTC,
 *     ETH, or any other named asset as data). A class describes a
 *     structure/mechanism, never a specific coin or token.
 *   - classify() NEVER identifies an asset by ticker alone. It needs
 *     at least two independent identity signals (chain/network +
 *     contract address, or chain + name + source, and so on). Ticker /
 *     symbol never counts as an identity signal. Insufficient identity
 *     returns class UNKNOWN / verificationStatus UNVERIFIED with a
 *     clear reason.
 *   - Verification/freshness/truth states come from the Truth
 *     vocabulary (js/truth.js, loaded before this file). Nothing is
 *     marked VERIFIED without provenance (a source AND a timestamp);
 *     a VERIFIED claim without both is downgraded to UNVERIFIED.
 *   - validateAssetDescriptor() rejects secret-looking fields and
 *     ticker-only identification, following the secret-rejection
 *     pattern of js/knowledge-model.js.
 *   - INFORMATIONAL never implies TRANSACTIONAL. Classifying an asset
 *     is not authorization or capability to move it.
 *
 * Depends on js/truth.js only (for the shared truth vocabulary).
 * Pure functions: no DOM, no network, no secrets, no storage.
 *
 * Asset-domains extension (Wallet spec W4 / Crypto spec §99-4):
 * 15 further classes, an asset lifecycle with a validated transition
 * table, an asset identity registry (registerAsset), domain models for
 * stablecoins / wrapped-bridged / liquid-staking / LP positions, NFT
 * relationship classes, and a canonical-vocabulary reconciliation
 * against CryptoWorld.ASSET_CLASSES (the canonical vocabulary is the
 * authority; UNMAPPED entries are notes, never new canonical classes).
 * isTransactionallyAuthorized() is ALWAYS false in this build.
 */
var AssetIntelligence = (function (global) {
  "use strict";

  var FALLBACK_TRUTH_STATES = ["NOT_CONNECTED", "UNKNOWN", "UNVERIFIED",
    "STALE", "DISABLED", "UNAVAILABLE", "VERIFIED", "LIVE"];
  var CONFIDENCES = ["low", "medium", "high", "unknown"];
  var FRESH_DAYS = 7;
  var DEFAULT_MAX_AGE_DAYS = 30;

  // Same secret-key parts as js/knowledge-model.js (normalised the
  // same way: lowercased, dashes/underscores stripped, substring).
  var SECRET_KEY_PARTS = ["seed", "mnemonic", "privatekey", "private_key",
    "apikey", "api_key", "apisecret", "password", "secret"];

  // Identity signals: fields that independently help identify an
  // asset. Ticker / symbol is deliberately NOT in this list: tickers
  // are ambiguous and reused across chains and assets.
  var IDENTITY_FIELDS = ["chain", "network", "contractAddress", "address",
    "name", "source", "protocol"];

  function truth() { return global.Truth || null; }

  function knownVerificationStates() {
    var states = [];
    var t = truth();
    if (t && t.TRUTH_STATES) states = states.concat(t.TRUTH_STATES);
    if (global.CryptoWorld && global.CryptoWorld.VERIFICATION_STATES) {
      states = states.concat(global.CryptoWorld.VERIFICATION_STATES);
    }
    if (!states.length) states = FALLBACK_TRUTH_STATES.slice();
    return states;
  }

  // ---- Asset-class registry -------------------------------------------
  // Each class: id, label, description (one sentence), traits
  // (distinguishing features), relationships (edges to other classes).
  // Relationship types:
  //   "underlying" — this class is built on / represents a claim on
  //                  the target class (the derivation edge).
  //   "splits"     — this class splits the target class into parts
  //                  (principal / yield); a derivation edge as well.
  //   "related"    — a notable non-derivation link; NOT a derivation.
  var CLASSES = [
    {
      id: "native-currency",
      label: "Native currency",
      description: "A blockchain's own currency, issued by the chain protocol itself and used to pay network fees.",
      traits: ["Pays network gas and fees", "Issued by the chain protocol itself",
        "Has no contract address", "Fungible and divisible"],
      relationships: [
        { type: "related", target: "wrapped-asset", note: "Native currencies are commonly wrapped into fungible tokens for use in contracts." },
        { type: "related", target: "liquid-staking-asset", note: "Native currencies are commonly staked, with liquid-staking assets issued against the stake." }
      ]
    },
    {
      id: "token",
      label: "Token",
      description: "A fungible asset issued by a smart contract on a chain, identified by its contract address.",
      traits: ["Issued by a smart contract", "Identified by a contract address",
        "Fungible and transferable", "Lives on one chain unless bridged or wrapped"],
      relationships: []
    },
    {
      id: "stablecoin",
      label: "Stablecoin",
      description: "A token designed to hold a stable value relative to a stated reference, such as a fiat currency.",
      traits: ["Stated peg or reference value", "Backed by reserves, collateral, or an algorithm",
        "Redeemable or convertible per its mechanism", "Exposed to depeg risk"],
      relationships: [
        { type: "underlying", target: "token", note: "A stablecoin is issued as a fungible token." },
        { type: "related", target: "distressed-depegged-asset", note: "A stablecoin that loses its peg is described by the distressed/depegged class." }
      ]
    },
    {
      id: "wrapped-asset",
      label: "Wrapped asset",
      description: "A token that represents another asset one-to-one, minted when the underlying asset is locked and burned when it is released.",
      traits: ["One-to-one claim on a locked underlying asset", "Minted on lock, burned on release",
        "Custodial or contract-held backing", "Trades under its own contract address"],
      relationships: [
        { type: "underlying", target: "native-currency", note: "Wraps a chain's native currency for use in contracts." },
        { type: "underlying", target: "token", note: "Wraps a token from its home chain or form." }
      ]
    },
    {
      id: "bridged-asset",
      label: "Bridged asset",
      description: "A token minted on a destination chain to represent an asset locked on a source chain, moved through a bridge.",
      traits: ["Minted on a destination chain against a lock elsewhere", "Depends on a bridge and its validators or contracts",
        "Carries bridge risk in addition to asset risk", "May differ in name or symbol from the source asset"],
      relationships: [
        { type: "underlying", target: "native-currency", note: "Bridges a native currency across chains." },
        { type: "underlying", target: "token", note: "Bridges a token across chains." },
        { type: "underlying", target: "stablecoin", note: "Bridges a stablecoin across chains." }
      ]
    },
    {
      id: "liquid-staking-asset",
      label: "Liquid-staking asset",
      description: "A tradable receipt token issued against staked native currency, letting the holder keep liquidity while the stake earns yield.",
      traits: ["Receipt for staked native currency", "Tradable while the stake remains locked",
        "Accrues staking yield", "Redeemable for the staked asset per its mechanism"],
      relationships: [
        { type: "underlying", target: "native-currency", note: "Represents staked native currency." }
      ]
    },
    {
      id: "restaking-asset",
      label: "Restaking asset",
      description: "An already-staked asset restaked to secure additional services or networks, adding further slashing exposure.",
      traits: ["Restakes an already-staked asset", "Secures additional services beyond the home chain",
        "Adds slashing exposure from each secured service", "Built on a liquid-staking asset or a direct stake"],
      relationships: [
        { type: "underlying", target: "liquid-staking-asset", note: "Restakes a liquid-staking asset." },
        { type: "underlying", target: "native-currency", note: "Restakes a direct native-currency stake." }
      ]
    },
    {
      id: "receipt-token",
      label: "Receipt token",
      description: "A token evidencing a deposit or claim in a vault, lending pool, or strategy, redeemable for the underlying position.",
      traits: ["Evidences a deposit or claim", "Issued by a vault, pool, or strategy contract",
        "Redeemable for the underlying position", "May accrue yield while held"],
      relationships: [
        { type: "underlying", target: "vault-asset", note: "A vault share is commonly issued as a receipt token." },
        { type: "related", target: "credit-lending-asset", note: "Lending pools issue receipt tokens against supplied assets." },
        { type: "related", target: "lp-position", note: "Liquidity-pool shares are commonly issued as receipt tokens." }
      ]
    },
    {
      id: "lp-position",
      label: "LP position",
      description: "A liquidity-provider position in a pool, representing a share of the pooled assets and the fees they earn.",
      traits: ["Share of a liquidity pool", "Earns a share of pool fees",
        "Exposed to impermanent loss against the pooled assets", "May be represented by a receipt token"],
      relationships: [
        { type: "underlying", target: "token", note: "Pools hold tokens supplied by providers." },
        { type: "underlying", target: "stablecoin", note: "Pools commonly pair a token with a stablecoin." },
        { type: "underlying", target: "native-currency", note: "Pools commonly pair a token with the native currency." }
      ]
    },
    {
      id: "vault-asset",
      label: "Vault asset",
      description: "A tokenized share in a managed vault or strategy that deploys deposited assets according to the vault's rules.",
      traits: ["Share in a managed vault or strategy", "Deploys deposits per the vault's rules",
        "Value tracks the vault's holdings and performance", "Commonly issued as a receipt token"],
      relationships: [
        { type: "underlying", target: "token", note: "Vaults deploy deposited tokens." },
        { type: "underlying", target: "lp-position", note: "Vaults commonly deploy into liquidity positions." },
        { type: "related", target: "receipt-token", note: "Vault shares are commonly issued as receipt tokens." }
      ]
    },
    {
      id: "principal-yield-asset",
      label: "Principal/yield asset",
      description: "One side of a split yield-bearing asset, representing either the principal claim or the yield claim, but not both.",
      traits: ["One side of a principal/yield split", "Principal side redeems the underlying at maturity",
        "Yield side collects the yield until maturity", "Trades separately from its counterpart side"],
      relationships: [
        { type: "underlying", target: "liquid-staking-asset", note: "Splits a liquid-staking asset into principal and yield." },
        { type: "underlying", target: "receipt-token", note: "Splits a yield-bearing receipt token into principal and yield." },
        { type: "underlying", target: "vault-asset", note: "Splits a yield-bearing vault share into principal and yield." },
        { type: "splits", target: "liquid-staking-asset", note: "A principal/yield pair splits a liquid-staking asset." },
        { type: "splits", target: "receipt-token", note: "A principal/yield pair splits a yield-bearing receipt token." },
        { type: "splits", target: "vault-asset", note: "A principal/yield pair splits a yield-bearing vault share." }
      ]
    },
    {
      id: "synthetic-asset",
      label: "Synthetic asset",
      description: "A token that tracks the value of another asset, index, or market without holding the tracked thing itself.",
      traits: ["Tracks a reference value without holding it", "Backed by collateral, a position, or a mechanism",
        "Exposed to oracle and collateral risk", "Redeemable or settled per its mechanism"],
      relationships: [
        { type: "underlying", target: "token", note: "Synthetics commonly track a token's value." },
        { type: "underlying", target: "native-currency", note: "Synthetics commonly track a native currency's value." },
        { type: "related", target: "derivative", note: "Synthetics and derivatives both derive value from a reference." }
      ]
    },
    {
      id: "derivative",
      label: "Derivative",
      description: "A contract whose value derives from an underlying asset or market, such as a future, option, or perpetual position.",
      traits: ["Value derives from an underlying asset or market", "Defined by contract terms, not by holding the asset",
        "May carry leverage, expiry, or funding terms", "Settled in an asset rather than the underlying itself"],
      relationships: [
        { type: "underlying", target: "token", note: "Derivatives commonly reference a token." },
        { type: "underlying", target: "native-currency", note: "Derivatives commonly reference a native currency." },
        { type: "underlying", target: "synthetic-asset", note: "Derivatives may reference a synthetic asset." }
      ]
    },
    {
      id: "nft",
      label: "NFT",
      description: "A non-fungible token representing a unique item, identified by its contract address and token id.",
      traits: ["Non-fungible and unique", "Identified by contract address plus token id",
        "Carries metadata describing the item", "Not interchangeable with another token of the same contract"],
      relationships: []
    },
    {
      id: "rwa-tokenized-asset",
      label: "RWA / tokenized asset",
      description: "A token representing ownership of, or a claim on, an off-chain real-world asset such as property, debt, or commodities.",
      traits: ["Represents an off-chain real-world asset", "Depends on an issuer, custodian, or legal structure",
        "May carry transfer restrictions", "Value tracks the off-chain asset, not only the market"],
      relationships: [
        { type: "related", target: "token", note: "Tokenized real-world assets are issued as tokens." }
      ]
    },
    {
      id: "depin-asset",
      label: "DePIN asset",
      description: "A token tied to a decentralized physical-infrastructure network, rewarding participants who provide hardware or services.",
      traits: ["Tied to a physical-infrastructure network", "Rewards hardware or service provision",
        "Value depends on real-world network usage", "Issued by the network's protocol"],
      relationships: [
        { type: "underlying", target: "token", note: "DePIN rewards and access are issued as tokens." }
      ]
    },
    {
      id: "gamefi-asset",
      label: "GameFi asset",
      description: "A token or in-game item used inside a game or virtual world, earned or spent through gameplay.",
      traits: ["Used inside a game or virtual world", "Earned, spent, or traded through gameplay",
        "May be a fungible token or a unique item", "Value depends on the game's economy and players"],
      relationships: [
        { type: "underlying", target: "token", note: "GameFi currencies are issued as tokens." },
        { type: "underlying", target: "nft", note: "GameFi items are commonly issued as NFTs." }
      ]
    },
    {
      id: "socialfi-asset",
      label: "SocialFi asset",
      description: "A token or item tied to a creator, community, or social graph, granting access, influence, or a share of creator value.",
      traits: ["Tied to a creator, community, or social graph", "Grants access, influence, or a share of value",
        "Value depends on the creator or community", "May be a fungible token or a unique item"],
      relationships: [
        { type: "underlying", target: "token", note: "SocialFi assets are commonly issued as tokens." },
        { type: "underlying", target: "nft", note: "SocialFi items are commonly issued as NFTs." }
      ]
    },
    {
      id: "btcfi-asset",
      label: "BTCFi asset",
      description: "An asset built on or around Bitcoin, using Bitcoin as settlement, security, or collateral for additional functionality.",
      traits: ["Built on or around Bitcoin", "Uses Bitcoin as settlement, security, or collateral",
        "Adds functionality Bitcoin alone does not provide", "Exposed to Bitcoin's chain and market risk"],
      relationships: [
        { type: "underlying", target: "native-currency", note: "BTCFi is built on Bitcoin as the native currency." },
        { type: "underlying", target: "token", note: "BTCFi assets are commonly issued as tokens on Bitcoin layers." }
      ]
    },
    {
      id: "credit-lending-asset",
      label: "Credit / lending asset",
      description: "An asset representing a loan, credit line, or lending position, with borrower and lender roles and repayment terms.",
      traits: ["Represents a loan, credit line, or lending position", "Defined by borrower, lender, and repayment terms",
        "Exposed to borrower default and collateral risk", "May be tokenized for transfer or trading"],
      relationships: [
        { type: "underlying", target: "token", note: "Lending positions commonly involve tokens." },
        { type: "underlying", target: "stablecoin", note: "Loans are commonly denominated in stablecoins." },
        { type: "underlying", target: "receipt-token", note: "Supplied assets are commonly evidenced by receipt tokens." }
      ]
    },
    {
      id: "distressed-depegged-asset",
      label: "Distressed / depegged asset",
      description: "An asset trading far from its stated peg or reference value, or otherwise impaired, described here as a condition rather than an issuance mechanism.",
      traits: ["Trading far from its stated peg or reference value", "A condition, not an issuance mechanism",
        "Often paired with impaired redemption or backing", "May recover, persist, or fail; no outcome is assumed"],
      relationships: [
        { type: "underlying", target: "stablecoin", note: "Most commonly a stablecoin that has lost its peg." },
        { type: "underlying", target: "token", note: "May be a token trading far from its reference value." },
        { type: "underlying", target: "synthetic-asset", note: "May be a synthetic whose backing or oracle has failed." }
      ]
    },
    {
      id: "experimental-emerging-asset",
      label: "Experimental / emerging asset",
      description: "A newly discovered asset class or mechanism that does not yet fit an established class and awaits classification.",
      traits: ["Newly discovered or newly proposed", "Does not yet fit an established class",
        "Insufficient information to classify confidently", "Awaiting owner review and classification"],
      relationships: []
    },
    {
      id: "governance-token",
      label: "Governance token",
      description: "A token conferring voting rights over a protocol or DAO, letting holders propose and decide changes.",
      traits: ["Confers voting rights", "Issued by a protocol or DAO",
        "Votes carry weight per the protocol's rules", "May also carry economic rights, but voting is the distinguishing trait"],
      relationships: [
        { type: "underlying", target: "token", note: "Governance rights are issued as a fungible token." }
      ]
    },
    // ---- Asset-domains extension (Wallet spec W4 / Crypto spec §99-4) --
    // New classes below are spec classes, NOT canonical CryptoWorld
    // classes: each carries canonicalMapping null (UNMAPPED) unless the
    // canonical vocabulary has a matching label. See
    // canonicalReconciliation() for the full mapping table. No class
    // here is an individual asset: classes describe structure only.
    {
      id: "payment-asset",
      label: "Payment asset",
      description: "A token used primarily to pay for goods, services, or settlement between parties.",
      traits: ["Used as a medium of exchange", "Accepted for payment or settlement",
        "Value depends on acceptance, not on a yield mechanism", "Fungible and transferable"],
      relationships: [
        { type: "underlying", target: "token", note: "Payment assets are issued as fungible tokens." },
        { type: "related", target: "stablecoin", note: "Stablecoins are commonly used as payment assets." }
      ],
      canonicalMapping: null
    },
    {
      id: "utility-token",
      label: "Utility token",
      description: "A token that grants access to, or use of, a protocol's services, features, or resources.",
      traits: ["Grants access to a service or feature", "Spent or held to use the protocol",
        "Value depends on the service it unlocks", "Issued by the protocol it serves"],
      relationships: [
        { type: "underlying", target: "token", note: "Utility rights are issued as a fungible token." },
        { type: "related", target: "protocol-token", note: "A protocol's own token commonly also carries utility." }
      ],
      canonicalMapping: null
    },
    {
      id: "protocol-token",
      label: "Protocol token",
      description: "A token issued by a protocol that represents participation in, or a claim tied to, the protocol itself.",
      traits: ["Issued by the protocol itself", "Represents participation in the protocol",
        "Distinct from a token that only unlocks one service", "May carry governance or economic rights"],
      relationships: [
        { type: "underlying", target: "token", note: "Protocol participation is issued as a fungible token." },
        { type: "related", target: "utility-token", note: "Protocol tokens commonly also carry utility." },
        { type: "related", target: "governance-token", note: "Protocol tokens commonly also carry voting rights." }
      ],
      canonicalMapping: null
    },
    {
      id: "reward-incentive-token",
      label: "Reward / incentive token",
      description: "A token distributed as a reward or incentive for participation, contribution, or usage.",
      traits: ["Distributed as a reward or incentive", "Earned by participation or contribution",
        "Issued on a schedule or per action", "May also be usable as a payment or utility token"],
      relationships: [
        { type: "underlying", target: "token", note: "Rewards and incentives are issued as fungible tokens." },
        { type: "related", target: "utility-token", note: "Reward tokens commonly also carry utility." }
      ],
      canonicalMapping: null
    },
    {
      id: "exchange-platform-token",
      label: "Exchange / platform token",
      description: "A token issued by an exchange or platform, commonly used for fee discounts, access, or platform benefits.",
      traits: ["Issued by an exchange or platform", "Commonly used for fee discounts or access",
        "Value depends on the platform and its users", "May carry governance or revenue-share claims"],
      relationships: [
        { type: "underlying", target: "token", note: "Exchange and platform benefits are issued as fungible tokens." },
        { type: "related", target: "utility-token", note: "Exchange tokens commonly also carry utility." }
      ],
      canonicalMapping: null
    },
    {
      id: "index-basket-asset",
      label: "Index / basket asset",
      description: "A token representing a share in a basket or index of underlying assets, tracking their combined value.",
      traits: ["Represents a share in a basket or index", "Tracks the combined value of the underlying assets",
        "Redeemable for the underlying basket per its mechanism", "Rebalanced per the index rules"],
      relationships: [
        { type: "underlying", target: "token", note: "Index and basket shares are issued as fungible tokens." },
        { type: "related", target: "synthetic-asset", note: "Index assets and synthetics both track a reference value." }
      ],
      canonicalMapping: null
    },
    {
      id: "security-investment-token",
      label: "Security / investment token",
      description: "A token representing a regulated security or investment interest, such as equity or debt, subject to transfer restrictions.",
      traits: ["Represents a security or investment interest", "Subject to transfer restrictions",
        "Depends on an issuer and a legal structure", "Value tracks the underlying security, not only the market"],
      relationships: [
        { type: "underlying", target: "token", note: "Security and investment interests are issued as tokens." },
        { type: "related", target: "rwa-tokenized-asset", note: "Security tokens are commonly tokenized real-world assets." }
      ],
      canonicalMapping: null
    },
    {
      id: "ai-compute-asset",
      label: "AI / compute asset",
      description: "A token tied to artificial-intelligence or compute services, rewarding or paying for model inference, training, or compute capacity.",
      traits: ["Tied to AI or compute services", "Rewards or pays for inference, training, or capacity",
        "Value depends on real compute demand", "Issued by the network or protocol providing the service"],
      relationships: [
        { type: "underlying", target: "token", note: "AI and compute access is issued as a token." },
        { type: "related", target: "depin-asset", note: "Compute networks are commonly decentralized physical-infrastructure networks." }
      ],
      canonicalMapping: null
    },
    {
      id: "oracle-data-asset",
      label: "Oracle / data asset",
      description: "A token tied to an oracle or data service, rewarding data provision or paying for verified off-chain data.",
      traits: ["Tied to an oracle or data service", "Rewards data provision or pays for verified data",
        "Value depends on data demand and correctness", "Exposed to oracle and data-source risk"],
      relationships: [
        { type: "underlying", target: "token", note: "Oracle and data access is issued as a token." },
        { type: "related", target: "depin-asset", note: "Data networks are commonly decentralized physical-infrastructure networks." }
      ],
      canonicalMapping: null
    },
    {
      id: "storage-network-resource-asset",
      label: "Storage / network-resource asset",
      description: "A token tied to a storage or network-resource service, rewarding or paying for storage capacity, bandwidth, or other shared resources.",
      traits: ["Tied to storage or a shared network resource", "Rewards or pays for capacity or bandwidth",
        "Value depends on real resource demand", "Issued by the network providing the resource"],
      relationships: [
        { type: "underlying", target: "token", note: "Storage and resource access is issued as a token." },
        { type: "related", target: "depin-asset", note: "Storage networks are commonly decentralized physical-infrastructure networks." }
      ],
      canonicalMapping: null
    },
    {
      id: "compromised-asset",
      label: "Compromised asset",
      description: "An asset whose issuer, contract, or backing is known to be compromised, described here as a condition rather than an issuance mechanism.",
      traits: ["Issuer, contract, or backing is known to be compromised", "A condition, not an issuance mechanism",
        "Redemption, backing, or control may be impaired", "No recovery is assumed"],
      relationships: [
        { type: "underlying", target: "token", note: "Most commonly a token whose contract or issuer is compromised." },
        { type: "related", target: "stablecoin", note: "May be a stablecoin whose backing or issuer is compromised." },
        { type: "related", target: "distressed-depegged-asset", note: "A compromised asset commonly also trades far from its reference value." }
      ],
      canonicalMapping: null
    },
    {
      id: "migrated-superseded-asset",
      label: "Migrated / superseded asset",
      description: "An asset that has been replaced by a newer contract or version through migration, described here as a condition rather than an issuance mechanism.",
      traits: ["Replaced by a newer contract or version", "A condition, not an issuance mechanism",
        "The old representation may stop being honoured", "Migration terms come from the issuer, never assumed"],
      relationships: [
        { type: "underlying", target: "token", note: "Most commonly a token replaced by a newer contract." },
        { type: "related", target: "compromised-asset", note: "Migration sometimes follows a compromise; the two conditions stay distinct." }
      ],
      canonicalMapping: null
    },
    {
      id: "yield-bearing-asset",
      label: "Yield-bearing asset",
      description: "An asset that accrues yield or rewards while held, through staking, lending, or a vault mechanism.",
      traits: ["Accrues yield or rewards while held", "Yield comes from staking, lending, or a vault mechanism",
        "The yield mechanism is the distinguishing trait", "No yield rate is stated or promised here"],
      relationships: [
        { type: "related", target: "liquid-staking-asset", note: "Liquid-staking assets are one kind of yield-bearing asset." },
        { type: "related", target: "receipt-token", note: "Yield-bearing receipt tokens evidence a yield-bearing deposit." },
        { type: "related", target: "vault-asset", note: "Vault shares are commonly yield-bearing." }
      ],
      canonicalMapping: "Yield-bearing assets"
    },
    {
      id: "collateral-asset",
      label: "Collateral asset",
      description: "An asset pledged as collateral to secure a loan, position, or obligation, retrievable only when the obligation is settled.",
      traits: ["Pledged as collateral for an obligation", "Retrievable only when the obligation is settled",
        "Exposed to liquidation if the obligation fails", "A role an asset plays, not an issuance mechanism"],
      relationships: [
        { type: "related", target: "token", note: "Tokens are commonly pledged as collateral." },
        { type: "related", target: "stablecoin", note: "Stablecoins are commonly pledged as collateral." },
        { type: "related", target: "native-currency", note: "Native currencies are commonly pledged as collateral." }
      ],
      canonicalMapping: "Collateral assets"
    },
    {
      id: "prediction-market-position",
      label: "Prediction-market position",
      description: "A position in a prediction or event market representing a stake on a stated outcome, settled when the event resolves.",
      traits: ["A stake on a stated outcome", "Settled when the event resolves",
        "Value depends on the outcome and the market", "Exposed to resolution and oracle risk"],
      relationships: [
        { type: "related", target: "token", note: "Prediction positions are commonly issued as tokens." },
        { type: "related", target: "derivative", note: "Prediction positions and derivatives both derive value from a reference event." }
      ],
      canonicalMapping: "Prediction-market positions"
    }
  ];

  var CLASS_BY_ID = {};
  CLASSES.forEach(function (c) { CLASS_BY_ID[c.id] = c; });

  // Class-distinguishing signals. A descriptor carries these as boolean
  // fields (isWrapped, isLP, ...) or as entries in a `hints` array
  // (e.g. ["wrapped"], ["lp", "pool"]). A generic "token" hint is NOT
  // a signal: nearly every class is a token, so it cannot distinguish.
  var CLASS_SIGNALS = {
    "native-currency": { fields: ["isNative"], hints: ["native", "gas-token", "base-currency"] },
    "token": { fields: ["isToken"], hints: [] },
    "stablecoin": { fields: ["isStablecoin", "isPegged"], hints: ["stablecoin", "pegged", "stable"] },
    "wrapped-asset": { fields: ["isWrapped"], hints: ["wrapped"] },
    "bridged-asset": { fields: ["isBridged"], hints: ["bridged", "bridge"] },
    "liquid-staking-asset": { fields: ["isLiquidStaking"], hints: ["liquid-staking", "liquidstaking", "lst"] },
    "restaking-asset": { fields: ["isRestaking"], hints: ["restaking", "restaked", "lrt"] },
    "receipt-token": { fields: ["isReceipt"], hints: ["receipt", "receipt-token"] },
    "lp-position": { fields: ["isLP", "isLiquidityPosition"], hints: ["lp", "liquidity-pool", "liquidity-position", "pool-share"] },
    "vault-asset": { fields: ["isVault"], hints: ["vault", "vault-share"] },
    "principal-yield-asset": { fields: ["isPrincipalYield", "isPrincipal", "isYieldToken"], hints: ["principal-yield", "principal", "yield-token", "yield-split"] },
    "synthetic-asset": { fields: ["isSynthetic"], hints: ["synthetic", "synth"] },
    "derivative": { fields: ["isDerivative"], hints: ["derivative", "future", "option", "perpetual"] },
    "nft": { fields: ["isNFT"], hints: ["nft", "non-fungible"] },
    "rwa-tokenized-asset": { fields: ["isRWA", "isTokenized"], hints: ["rwa", "tokenized", "real-world-asset"] },
    "depin-asset": { fields: ["isDePIN"], hints: ["depin", "physical-infrastructure"] },
    "gamefi-asset": { fields: ["isGameFi"], hints: ["gamefi", "game", "gaming"] },
    "socialfi-asset": { fields: ["isSocialFi"], hints: ["socialfi", "creator-token", "social-token"] },
    "btcfi-asset": { fields: ["isBTCFi"], hints: ["btcfi", "bitcoin-fi"] },
    "credit-lending-asset": { fields: ["isCredit", "isLending"], hints: ["credit", "lending", "loan"] },
    "distressed-depegged-asset": { fields: ["isDistressed", "isDepegged"], hints: ["distressed", "depegged", "depeg"] },
    "experimental-emerging-asset": { fields: ["isExperimental"], hints: ["experimental", "emerging", "unclassified"] },
    "governance-token": { fields: ["isGovernance"], hints: ["governance", "dao-token"] },
    "payment-asset": { fields: ["isPayment"], hints: ["payment", "payment-token", "settlement"] },
    "utility-token": { fields: ["isUtility"], hints: ["utility", "utility-token"] },
    "protocol-token": { fields: ["isProtocolToken"], hints: ["protocol-token", "protocol"] },
    "reward-incentive-token": { fields: ["isReward", "isIncentive"], hints: ["reward", "incentive", "reward-token", "incentive-token"] },
    "exchange-platform-token": { fields: ["isExchangeToken", "isPlatformToken"], hints: ["exchange-token", "platform-token", "exchange", "platform"] },
    "index-basket-asset": { fields: ["isIndex", "isBasket"], hints: ["index", "basket", "index-token", "basket-token"] },
    "security-investment-token": { fields: ["isSecurityToken", "isInvestmentToken"], hints: ["security-token", "investment-token", "security", "equity-token"] },
    "ai-compute-asset": { fields: ["isAICompute"], hints: ["ai-compute", "compute", "ai-token", "gpu-token"] },
    "oracle-data-asset": { fields: ["isOracle", "isDataToken"], hints: ["oracle", "oracle-token", "data-token"] },
    "storage-network-resource-asset": { fields: ["isStorage", "isNetworkResource"], hints: ["storage", "storage-token", "network-resource"] },
    "compromised-asset": { fields: ["isCompromised"], hints: ["compromised", "hacked", "exploited"] },
    "migrated-superseded-asset": { fields: ["isMigrated", "isSuperseded"], hints: ["migrated", "superseded", "migration"] },
    "yield-bearing-asset": { fields: ["isYieldBearing"], hints: ["yield-bearing", "yieldbearing"] },
    "collateral-asset": { fields: ["isCollateral"], hints: ["collateral", "collateral-asset"] },
    "prediction-market-position": { fields: ["isPredictionMarket"], hints: ["prediction-market", "prediction", "event-market"] }
  };

  // Standard-based hints: a token standard alone never identifies an
  // asset, but some standards are class-distinguishing. ERC-20 is
  // deliberately absent: it is shared by too many classes to mean one.
  var STANDARD_SIGNALS = {
    "erc-721": "nft",
    "erc721": "nft",
    "erc-1155": "nft",
    "erc1155": "nft",
    "erc-4626": "vault-asset",
    "erc4626": "vault-asset"
  };

  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim() !== "";
  }

  function parseDate(value) {
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function ageDays(descriptor) {
    var d = parseDate((descriptor && (descriptor.fetchedAt || descriptor.lastChecked)) || null);
    if (!d) return null;
    return (Date.now() - d.getTime()) / 86400000;
  }

  function classifyFreshness(descriptor, maxAgeDays) {
    var max = (maxAgeDays === undefined || maxAgeDays === null) ?
      DEFAULT_MAX_AGE_DAYS : Number(maxAgeDays);
    if (!(max >= 0)) max = DEFAULT_MAX_AGE_DAYS;
    var age = ageDays(descriptor);
    if (age === null) return "unknown";
    if (age > max) return "stale";
    if (age <= FRESH_DAYS) return "fresh";
    return "aging";
  }

  function freshnessLabel(freshness) {
    if (freshness === "fresh") return "Fresh";
    if (freshness === "aging") return "Aging";
    if (freshness === "stale") return "Stale";
    return "Unknown age";
  }

  function getClass(classId) {
    if (typeof classId !== "string") return null;
    return CLASS_BY_ID[classId] || null;
  }

  function listClasses() {
    return CLASSES.slice();
  }

  function classIds() {
    return CLASSES.map(function (c) { return c.id; });
  }

  // Direct underlying edges only (type "underlying").
  function underlyingOf(classId) {
    var cls = getClass(classId);
    if (!cls) return [];
    var out = [];
    cls.relationships.forEach(function (r) {
      if (r.type === "underlying" && out.indexOf(r.target) === -1) {
        out.push(r.target);
      }
    });
    return out;
  }

  // Direct split edges only (type "splits"): the classes this class
  // splits into parts.
  function splitSourcesOf(classId) {
    var cls = getClass(classId);
    if (!cls) return [];
    var out = [];
    cls.relationships.forEach(function (r) {
      if (r.type === "splits" && out.indexOf(r.target) === -1) {
        out.push(r.target);
      }
    });
    return out;
  }

  // Derivation edges: "underlying" and "splits" both mean the source
  // class derives from the target. "related" edges never count.
  function derivationTargets(classId) {
    var cls = getClass(classId);
    if (!cls) return [];
    var out = [];
    cls.relationships.forEach(function (r) {
      if ((r.type === "underlying" || r.type === "splits") &&
          out.indexOf(r.target) === -1) {
        out.push(r.target);
      }
    });
    return out;
  }

  // All classes directly derived from the given class.
  function derivedClasses(classId) {
    if (!getClass(classId)) return [];
    return CLASSES.filter(function (c) {
      return derivationTargets(c.id).indexOf(classId) !== -1;
    }).map(function (c) { return c.id; });
  }

  // Transitive derivation check over underlying/splits edges. A class
  // is never its own derivative. Unknown ids are never derivatives.
  function isDerivativeOf(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    if (a === b) return false;
    if (!getClass(a) || !getClass(b)) return false;
    var visited = {};
    var queue = derivationTargets(a);
    while (queue.length) {
      var current = queue.shift();
      if (current === b) return true;
      if (visited[current]) continue;
      visited[current] = true;
      derivationTargets(current).forEach(function (t) {
        if (!visited[t]) queue.push(t);
      });
    }
    return false;
  }

  function relatedClasses(classId) {
    var cls = getClass(classId);
    if (!cls) return [];
    var out = [];
    cls.relationships.forEach(function (r) {
      if (r.type === "related" && out.indexOf(r.target) === -1) {
        out.push(r.target);
      }
    });
    return out;
  }

  // ---- Identity --------------------------------------------------------
  // Which independent identity signals does this descriptor carry?
  // Ticker / symbol never counts: it is ambiguous and reused.
  function identitySignals(descriptor) {
    var signals = [];
    if (!descriptor || typeof descriptor !== "object") return signals;
    IDENTITY_FIELDS.forEach(function (f) {
      if (isNonEmptyString(descriptor[f]) && signals.indexOf(f) === -1) {
        signals.push(f);
      }
    });
    return signals;
  }

  function isSecretKey(key) {
    var k = String(key || "").toLowerCase().replace(/[-_]/g, "");
    for (var i = 0; i < SECRET_KEY_PARTS.length; i++) {
      var part = SECRET_KEY_PARTS[i].replace(/[-_]/g, "");
      if (k.indexOf(part) !== -1) return true;
    }
    return false;
  }

  // ---- Classification --------------------------------------------------
  function scoreClasses(descriptor) {
    var hints = [];
    if (Array.isArray(descriptor.hints)) {
      descriptor.hints.forEach(function (h) {
        if (typeof h === "string") hints.push(h.toLowerCase().trim());
      });
    }
    var standard = isNonEmptyString(descriptor.standard) ?
      descriptor.standard.toLowerCase().trim() : "";
    var scores = {};
    CLASSES.forEach(function (c) {
      var spec = CLASS_SIGNALS[c.id] || { fields: [], hints: [] };
      var reasons = [];
      spec.fields.forEach(function (f) {
        if (descriptor[f] === true) reasons.push("Field " + f + " is set.");
      });
      spec.hints.forEach(function (h) {
        if (hints.indexOf(h) !== -1) reasons.push("Hint \"" + h + "\" matches.");
      });
      if (standard && STANDARD_SIGNALS[standard] === c.id) {
        reasons.push("Standard " + descriptor.standard + " matches this class.");
      }
      if (isNonEmptyString(descriptor.peg) &&
          (c.id === "stablecoin" || c.id === "distressed-depegged-asset")) {
        reasons.push("A peg target is stated.");
      }
      if (isNonEmptyString(descriptor.underlyingClass) &&
          derivationTargets(c.id).indexOf(descriptor.underlyingClass) !== -1) {
        reasons.push("Underlying class " + descriptor.underlyingClass + " matches this class's derivation.");
      }
      if (reasons.length) scores[c.id] = reasons;
    });
    return scores;
  }

  // Verification status for a classification result. VERIFIED survives
  // only with a source AND a timestamp; anything stale is STALE.
  // Nothing is upgraded to VERIFIED here.
  function resolveVerificationStatus(descriptor, freshness) {
    var claimed = descriptor.verificationStatus;
    var hasProvenance = isNonEmptyString(descriptor.source) &&
      !!parseDate(descriptor.fetchedAt || descriptor.lastChecked);
    if (freshness === "stale") return "STALE";
    if (claimed === "VERIFIED") {
      return hasProvenance ? "VERIFIED" : "UNVERIFIED";
    }
    if (typeof claimed === "string" &&
        knownVerificationStates().indexOf(claimed) !== -1) {
      return claimed;
    }
    return "UNVERIFIED";
  }

  function classify(descriptor) {
    var d = (descriptor && typeof descriptor === "object") ? descriptor : {};
    var freshness = classifyFreshness(d, DEFAULT_MAX_AGE_DAYS);
    var provenance = {
      source: isNonEmptyString(d.source) ? String(d.source) : "",
      fetchedAt: (d.fetchedAt || d.lastChecked) ? String(d.fetchedAt || d.lastChecked) : ""
    };
    var signals = identitySignals(d);
    var hasTickerOnly = (isNonEmptyString(d.ticker) || isNonEmptyString(d.symbol)) &&
      signals.length === 0;

    function result(classId, confidence, reasons, verificationStatus) {
      var cls = getClass(classId);
      return {
        classId: classId,
        classLabel: cls ? cls.label : "Unknown",
        confidence: confidence,
        reasons: reasons,
        verificationStatus: verificationStatus,
        freshness: freshness,
        freshnessLabel: freshnessLabel(freshness),
        identitySignals: signals,
        provenance: provenance
      };
    }

    // Identity gate: fewer than two independent signals is never
    // enough, and a ticker alone is never an identity signal.
    if (signals.length < 2) {
      var identityReason;
      if (hasTickerOnly) {
        identityReason = "Ticker-only identification is not sufficient: a ticker alone never identifies an asset.";
      } else if (signals.length === 0) {
        identityReason = "No identity signals supplied: at least two independent signals are required (for example chain plus contract address, or chain plus name plus source).";
      } else {
        identityReason = "Only one identity signal supplied (" + signals[0] + "): at least two independent signals are required.";
      }
      return result("UNKNOWN", "unknown", [identityReason], "UNVERIFIED");
    }

    var scores = scoreClasses(d);
    var best = null;
    var bestCount = 0;
    var tied = [];
    Object.keys(scores).forEach(function (id) {
      var n = scores[id].length;
      if (n > bestCount) {
        best = id;
        bestCount = n;
        tied = [id];
      } else if (n === bestCount && n > 0) {
        tied.push(id);
      }
    });

    if (!best) {
      return result("UNKNOWN", "unknown",
        ["Identity is sufficient (" + signals.join(", ") + "), but no class-distinguishing traits were supplied."],
        resolveVerificationStatus(d, freshness));
    }

    if (tied.length > 1) {
      return result("UNKNOWN", "low",
        ["Ambiguous: the supplied traits match more than one class (" + tied.join(", ") + "); no class is chosen on a tie."],
        resolveVerificationStatus(d, freshness));
    }

    var reasons = scores[best].slice();
    reasons.unshift("Identity signals: " + signals.join(", ") + ".");
    var confidence = bestCount >= 2 ? "high" : "medium";
    var verificationStatus = resolveVerificationStatus(d, freshness);
    if (verificationStatus === "UNVERIFIED" &&
        d.verificationStatus === "VERIFIED") {
      reasons.push("VERIFIED claim rejected: a VERIFIED classification needs a source and a timestamp.");
    }
    return result(best, confidence, reasons, verificationStatus);
  }

  // ---- Validation ------------------------------------------------------
  // Strict gate for an asset descriptor. Returns an array of error
  // strings; an empty array means the descriptor passes. Does not
  // throw, never fabricates, never accepts a secret field.
  function validateAssetDescriptor(descriptor) {
    var errors = [];
    if (!descriptor || typeof descriptor !== "object") {
      return ["Asset descriptor must be an object."];
    }
    Object.keys(descriptor).forEach(function (k) {
      if (isSecretKey(k)) {
        errors.push("Secret-looking field not allowed in an asset descriptor: " + k + ".");
      }
    });
    var signals = identitySignals(descriptor);
    var hasTicker = isNonEmptyString(descriptor.ticker) ||
      isNonEmptyString(descriptor.symbol);
    if (signals.length === 0 && hasTicker) {
      errors.push("Ticker-only identification is not sufficient: an asset descriptor needs at least two independent identity signals (for example chain plus contract address, or chain plus name plus source).");
    } else if (signals.length < 2) {
      errors.push("Asset descriptor needs at least two independent identity signals; only " + signals.length + " supplied" +
        (signals.length === 1 ? " (" + signals[0] + ")" : "") + ".");
    }
    if (descriptor.classId !== undefined) {
      if (typeof descriptor.classId !== "string" ||
          (!getClass(descriptor.classId) && descriptor.classId !== "UNKNOWN")) {
        errors.push("Unknown asset class: " + descriptor.classId + ".");
      }
    }
    if (descriptor.verificationStatus !== undefined) {
      if (knownVerificationStates().indexOf(descriptor.verificationStatus) === -1) {
        errors.push("Unknown verification status: " + descriptor.verificationStatus + ".");
      }
    }
    if (descriptor.confidence !== undefined &&
        CONFIDENCES.indexOf(String(descriptor.confidence).toLowerCase()) === -1) {
      errors.push("Unknown confidence: " + descriptor.confidence + " (use low, medium, high, or unknown).");
    }
    if (descriptor.verificationStatus === "VERIFIED") {
      if (!descriptor.source) {
        errors.push("A VERIFIED asset descriptor needs a source.");
      }
      if (!descriptor.lastChecked && !descriptor.fetchedAt) {
        errors.push("A VERIFIED asset descriptor needs a lastChecked/fetchedAt timestamp.");
      }
    }
    if (descriptor.hints !== undefined) {
      if (!Array.isArray(descriptor.hints) ||
          descriptor.hints.some(function (h) { return typeof h !== "string"; })) {
        errors.push("hints must be an array of strings.");
      }
    }
    if (descriptor.underlyingClass !== undefined &&
        !getClass(descriptor.underlyingClass)) {
      errors.push("Unknown underlyingClass: " + descriptor.underlyingClass + ".");
    }
    if (descriptor.relationships !== undefined && !Array.isArray(descriptor.relationships)) {
      errors.push("relationships must be an array.");
    }
    return errors;
  }

  // A class record never claims VERIFIED: the registry describes
  // classes, and class definitions carry no provenance. Used by tests
  // and by any future registry import gate.
  function validateClassRecord(cls) {
    var errors = [];
    if (!cls || typeof cls !== "object") return ["Class record must be an object."];
    if (!isNonEmptyString(cls.id)) errors.push("Class record needs an id.");
    if (!isNonEmptyString(cls.label)) errors.push("Class record needs a label.");
    if (!isNonEmptyString(cls.description)) errors.push("Class record needs a one-sentence description.");
    if (!Array.isArray(cls.traits) || !cls.traits.length ||
        cls.traits.some(function (t) { return !isNonEmptyString(t); })) {
      errors.push("Class record needs a non-empty traits array of strings.");
    }
    if (!Array.isArray(cls.relationships)) {
      errors.push("Class record needs a relationships array.");
    } else {
      cls.relationships.forEach(function (r) {
        if (!r || typeof r !== "object") {
          errors.push("Relationship must be an object.");
        } else {
          if (["underlying", "splits", "related"].indexOf(r.type) === -1) {
            errors.push("Unknown relationship type: " + r.type + ".");
          }
          if (!getClass(r.target)) {
            errors.push("Relationship target is not a known class: " + r.target + ".");
          }
        }
      });
    }
    if (cls.verificationStatus === "VERIFIED") {
      errors.push("A class record must not claim VERIFIED: class definitions carry no provenance.");
    }
    return errors;
  }

  // ---- Asset lifecycle (closed set) ------------------------------------
  // DISCOVERED / VERIFIED / SUPPORTED / TRANSACTIONALLY_AUTHORIZED are
  // four different things and are kept distinct on purpose:
  //   DISCOVERED  — the asset has been seen; nothing is known about it.
  //   VERIFIED    — identity/provenance checked (a lifecycle position,
  //                 not a permission).
  //   SUPPORTED   — the platform models/supports the asset class; still
  //                 not permission to move money.
  //   TRANSACTIONALLY_AUTHORIZED — does not exist as a lifecycle state
  //     in this build: isTransactionallyAuthorized() is ALWAYS false.
  //     Discovery is NOT trust, verification is NOT support, support is
  //     NOT permission to move money. INFORMATIONAL never implies
  //     TRANSACTIONAL.
  var LIFECYCLE_STATES = ["DISCOVERED", "IDENTITY_CHECK", "VERIFIED",
    "CLASSIFIED", "SUPPORTED", "STALE", "QUARANTINED", "COMPROMISED",
    "DEPEGGED", "DEPRECATED", "SUPERSEDED", "MIGRATED", "DELISTED",
    "ABANDONED", "REJECTED", "UNKNOWN"];

  // Validated transition table. ABANDONED and REJECTED are terminal:
  // nothing leaves them. Every other state lists only the states it may
  // move to; anything not listed is rejected, never silently allowed.
  var LIFECYCLE_TRANSITIONS = {
    UNKNOWN: ["DISCOVERED", "REJECTED"],
    DISCOVERED: ["IDENTITY_CHECK", "REJECTED"],
    IDENTITY_CHECK: ["VERIFIED", "REJECTED", "UNKNOWN"],
    VERIFIED: ["CLASSIFIED", "STALE", "QUARANTINED", "REJECTED"],
    CLASSIFIED: ["SUPPORTED", "STALE", "QUARANTINED", "DEPRECATED", "REJECTED"],
    SUPPORTED: ["STALE", "QUARANTINED", "COMPROMISED", "DEPEGGED",
      "DEPRECATED", "SUPERSEDED", "MIGRATED", "DELISTED", "ABANDONED"],
    STALE: ["IDENTITY_CHECK", "VERIFIED", "QUARANTINED", "REJECTED", "ABANDONED"],
    QUARANTINED: ["IDENTITY_CHECK", "VERIFIED", "COMPROMISED", "REJECTED", "ABANDONED"],
    COMPROMISED: ["QUARANTINED", "MIGRATED", "SUPERSEDED", "DELISTED", "ABANDONED"],
    DEPEGGED: ["SUPPORTED", "QUARANTINED", "DELISTED", "ABANDONED"],
    DEPRECATED: ["SUPERSEDED", "MIGRATED", "DELISTED", "ABANDONED"],
    SUPERSEDED: ["MIGRATED", "DELISTED", "ABANDONED"],
    MIGRATED: ["DELISTED", "ABANDONED"],
    DELISTED: ["ABANDONED"],
    ABANDONED: [],
    REJECTED: []
  };

  function lifecycleStates() {
    return LIFECYCLE_STATES.slice();
  }

  function allowedTransitions(state) {
    if (typeof state !== "string") return [];
    return (LIFECYCLE_TRANSITIONS[state] || []).slice();
  }

  // Move a registered asset to a new lifecycle state. Returns
  // { ok: true, asset } with a NEW copy of the record (the stored
  // record is updated, with the move appended to lifecycleHistory), or
  // { ok: false, errors } leaving the record untouched. `opts` is
  // optional { by, note } for the history entry; neither is required.
  function transitionAsset(assetId, to, opts) {
    var errors = [];
    if (!isNonEmptyString(assetId)) {
      return { ok: false, errors: ["transitionAsset needs a non-empty assetId."] };
    }
    var stored = ASSETS[assetId];
    if (!stored) {
      return { ok: false, errors: ["Unknown asset id: " + assetId + "."] };
    }
    if (typeof to !== "string" || LIFECYCLE_STATES.indexOf(to) === -1) {
      return { ok: false, errors: ["Unknown lifecycle state: " + to + "."] };
    }
    if (to === stored.lifecycleState) {
      return { ok: false, errors: ["Asset \"" + assetId + "\" is already " + to + "; a transition must change state."] };
    }
    if (allowedTransitions(stored.lifecycleState).indexOf(to) === -1) {
      return { ok: false, errors: ["Lifecycle transition " + stored.lifecycleState + " -> " + to + " is not allowed."] };
    }
    var options = (opts && typeof opts === "object") ? opts : {};
    if (options.by !== undefined && typeof options.by !== "string") {
      errors.push("transition by must be a string.");
    }
    if (options.note !== undefined && typeof options.note !== "string") {
      errors.push("transition note must be a string.");
    }
    if (errors.length) return { ok: false, errors: errors };
    var next = cloneRecord(stored);
    next.lifecycleHistory.push({
      from: stored.lifecycleState,
      to: to,
      by: typeof options.by === "string" ? options.by : "",
      note: typeof options.note === "string" ? options.note : "",
      at: new Date().toISOString()
    });
    next.lifecycleState = to;
    ASSETS[assetId] = next;
    return { ok: true, asset: cloneRecord(next) };
  }

  // TRANSACTIONALLY_AUTHORIZED is always false in this foundation
  // build. There is no state, record, or flag that makes it true:
  // discovery is not trust, verification is not support, and support
  // is not permission to move money. A real authorization path does
  // not exist in this module.
  function isTransactionallyAuthorized(assetId) {
    return false;
  }

  // ---- Asset identity registry -----------------------------------------
  // Risk states for an asset record. There is deliberately no
  // "RISK_FREE" value: no asset is risk-free, and a record claiming
  // RISK_FREE is rejected (see validateAssetRecord). Stablecoin
  // records in particular never carry riskState "RISK_FREE".
  var RISK_STATES = ["UNKNOWN", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
  var FRESHNESS_VALUES = ["fresh", "aging", "stale", "unknown"];
  var CAPABILITY_STATES = (global.CryptoWorld && global.CryptoWorld.MODES) ?
    global.CryptoWorld.MODES.concat(["UNKNOWN"]) :
    ["INFORMATIONAL", "MONITORING", "SIMULATION", "MANUAL", "CONNECTED",
      "TRANSACTIONAL", "DISABLED", "UNKNOWN"];
  var NATIVE_OR_TOKEN = ["native", "token"];

  // NFT relationship classes (closed set). An NFT record never carries
  // isCurrency: true — an NFT is a unique item, not currency.
  var NFT_RELATIONSHIP_CLASSES = ["collectible", "art/media", "game asset",
    "membership/access", "credential", "domain", "tokenized right",
    "financial-position NFT", "unknown"];

  function nftRelationshipClasses() {
    return NFT_RELATIONSHIP_CLASSES.slice();
  }

  // Identity anchors: fields that independently help identify an asset.
  // A symbol/ticker is NOT one of them. registerAsset needs at least
  // two anchors, the same bar classify() applies to descriptors.
  var ASSET_IDENTITY_ANCHORS = ["networkId", "contractAddress",
    "mintAddress", "issuer", "canonicalName", "protocol"];

  // Network family of the four structural-example networks from
  // js/network-intelligence.js, used only to pick the address-shape
  // rule. Any other networkId is family-unknown: its addresses are
  // accepted as non-empty strings without a shape check, and the
  // record says so by leaving networkFamily unset.
  var KNOWN_NETWORK_FAMILIES = {
    "ethereum-mainnet": "ethereum-family",
    "bitcoin-mainnet": "bitcoin-family",
    "solana-mainnet": "solana-family",
    "cosmos-hub": "cosmos-family"
  };

  var ADDRESS_SHAPES = {
    "ethereum-family": /^0x[0-9a-fA-F]{40}$/,
    "solana-family": /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    "cosmos-family": /^[a-z0-9]+1[0-9a-z]{38,}$/
  };

  // In-memory registry of asset identity records, keyed by assetId.
  // Records are data, never code: adding an asset never changes this
  // module. No individual asset is hard-coded here.
  var ASSETS = {};

  function cloneRecord(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function unknownOr(value) {
    return isNonEmptyString(value) ? String(value) : "UNKNOWN";
  }

  function networkFamilyFor(record) {
    if (isNonEmptyString(record.networkFamily)) return record.networkFamily;
    if (isNonEmptyString(record.networkId) &&
        KNOWN_NETWORK_FAMILIES[record.networkId]) {
      return KNOWN_NETWORK_FAMILIES[record.networkId];
    }
    return "";
  }

  // Strict gate for an asset identity record. Returns an array of error
  // strings; an empty array means the record passes. Does not throw,
  // never fabricates, never accepts a secret field, never accepts a
  // ticker-only identity, and never accepts a "risk-free" claim.
  function validateAssetRecord(record) {
    var errors = [];
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return ["Asset record must be an object."];
    }
    Object.keys(record).forEach(function (k) {
      if (isSecretKey(k)) {
        errors.push("Secret-looking field not allowed in an asset record: " + k + ".");
      }
    });
    if (!isNonEmptyString(record.assetId)) {
      errors.push("Asset record needs a non-empty assetId.");
    }
    // Identity: at least two independent anchors. A record with only a
    // symbol (or ticker) and no networkId / contractAddress /
    // mintAddress / issuer is rejected as ticker-only identification.
    var anchors = [];
    ASSET_IDENTITY_ANCHORS.forEach(function (f) {
      if (isNonEmptyString(record[f])) anchors.push(f);
    });
    var hasTicker = isNonEmptyString(record.symbol) || isNonEmptyString(record.ticker);
    if (anchors.length === 0 && hasTicker) {
      errors.push("Ticker-only identification is not sufficient: an asset record needs at least two independent identity anchors (for example networkId plus contractAddress, mintAddress, or issuer).");
    } else if (anchors.length < 2) {
      errors.push("Asset record needs at least two independent identity anchors; only " + anchors.length + " supplied" +
        (anchors.length === 1 ? " (" + anchors[0] + ")" : "") + ".");
    }
    if (record.assetClass !== undefined) {
      if (typeof record.assetClass !== "string" ||
          (!getClass(record.assetClass) && record.assetClass !== "UNKNOWN")) {
        errors.push("Unknown asset class: " + record.assetClass + ".");
      }
    }
    if (record.nativeOrToken !== undefined &&
        NATIVE_OR_TOKEN.indexOf(record.nativeOrToken) === -1) {
      errors.push("nativeOrToken must be \"native\" or \"token\".");
    }
    // A native asset has no contract address (see the native-currency
    // class traits); a contract address on a native record is rejected.
    if (record.nativeOrToken === "native" && isNonEmptyString(record.contractAddress)) {
      errors.push("A native asset has no contract address.");
    }
    // Address shape, per network family, when the network is known.
    // Unknown family: no shape check is possible; the address is
    // accepted as a non-empty string and nothing is claimed about it.
    var family = networkFamilyFor(record);
    if (isNonEmptyString(record.networkFamily) &&
        isNonEmptyString(record.networkId) &&
        KNOWN_NETWORK_FAMILIES[record.networkId] &&
        record.networkFamily !== KNOWN_NETWORK_FAMILIES[record.networkId]) {
      errors.push("networkFamily \"" + record.networkFamily +
        "\" does not match the family of network \"" + record.networkId + "\".");
    }
    if (family === "bitcoin-family") {
      if (isNonEmptyString(record.contractAddress)) {
        errors.push("A Bitcoin-family (UTXO) asset has no contract address.");
      }
      if (isNonEmptyString(record.mintAddress)) {
        errors.push("A Bitcoin-family (UTXO) asset has no mint address.");
      }
    } else if (family === "solana-family") {
      if (isNonEmptyString(record.contractAddress)) {
        errors.push("A Solana-family asset has no contract address; use mintAddress.");
      }
      if (isNonEmptyString(record.mintAddress) &&
          !ADDRESS_SHAPES["solana-family"].test(record.mintAddress)) {
        errors.push("mintAddress does not match the Solana-family address shape.");
      }
    } else if (family === "ethereum-family") {
      if (isNonEmptyString(record.mintAddress)) {
        errors.push("An Ethereum-family asset has no mint address; use contractAddress.");
      }
      if (isNonEmptyString(record.contractAddress) &&
          !ADDRESS_SHAPES["ethereum-family"].test(record.contractAddress)) {
        errors.push("contractAddress does not match the Ethereum-family address shape (0x plus 40 hex characters).");
      }
    } else if (family === "cosmos-family") {
      if (isNonEmptyString(record.mintAddress)) {
        errors.push("A Cosmos-family asset has no mint address; use contractAddress.");
      }
      if (isNonEmptyString(record.contractAddress) &&
          !ADDRESS_SHAPES["cosmos-family"].test(record.contractAddress)) {
        errors.push("contractAddress does not match the Cosmos-family address shape.");
      }
    }
    ["canonicalName", "symbol", "networkId", "contractAddress",
      "mintAddress", "tokenStandard", "issuer", "protocol",
      "underlyingAsset", "referenceAsset", "wrapperRelationship",
      "bridgeRelationship", "collateralModel", "subtype"].forEach(function (f) {
      if (record[f] !== undefined && record[f] !== null &&
          typeof record[f] !== "string") {
        errors.push(f + " must be a string.");
      }
    });
    if (record.verificationStatus !== undefined) {
      if (knownVerificationStates().indexOf(record.verificationStatus) === -1) {
        errors.push("Unknown verification status: " + record.verificationStatus + ".");
      } else if (record.verificationStatus === "VERIFIED") {
        if (!isNonEmptyString(record.source)) {
          errors.push("A VERIFIED asset record needs a source.");
        }
        if (!isNonEmptyString(record.lastChecked) && !isNonEmptyString(record.fetchedAt)) {
          errors.push("A VERIFIED asset record needs a lastChecked/fetchedAt timestamp.");
        }
      }
    }
    if (record.riskState !== undefined) {
      if (record.riskState === "RISK_FREE") {
        errors.push("No asset is risk-free: riskState \"RISK_FREE\" is never accepted.");
      } else if (RISK_STATES.indexOf(record.riskState) === -1) {
        errors.push("Unknown riskState: " + record.riskState + ".");
      }
    }
    if (record.freshness !== undefined &&
        FRESHNESS_VALUES.indexOf(record.freshness) === -1) {
      errors.push("Unknown freshness: " + record.freshness + " (use fresh, aging, stale, or unknown).");
    }
    if (record.lifecycleState !== undefined &&
        LIFECYCLE_STATES.indexOf(record.lifecycleState) === -1) {
      errors.push("Unknown lifecycleState: " + record.lifecycleState + ".");
    }
    if (record.capabilityState !== undefined &&
        CAPABILITY_STATES.indexOf(record.capabilityState) === -1) {
      errors.push("Unknown capabilityState: " + record.capabilityState + ".");
    }
    if (record.assetClass === "nft" && record.isCurrency === true) {
      errors.push("An NFT record must not carry isCurrency: true; an NFT is a unique item, not currency.");
    }
    if (record.nftRelationshipClass !== undefined &&
        NFT_RELATIONSHIP_CLASSES.indexOf(record.nftRelationshipClass) === -1) {
      errors.push("Unknown NFT relationship class: " + record.nftRelationshipClass + ".");
    }
    return errors;
  }

  // Register an asset identity record. Returns { ok: true, asset } on
  // success (a copy of the stored record, with defaults filled) or
  // { ok: false, errors } on failure. Duplicate assetIds are rejected;
  // nothing is overwritten silently. Defaults: verificationStatus
  // UNVERIFIED, freshness "unknown", riskState UNKNOWN, lifecycleState
  // DISCOVERED, capabilityState UNKNOWN.
  function registerAsset(record) {
    var errors = validateAssetRecord(record);
    if (errors.length) return { ok: false, errors: errors };
    if (ASSETS[record.assetId]) {
      return { ok: false, errors: ["An asset with assetId \"" + record.assetId + "\" is already registered."] };
    }
    var stored = cloneRecord(record);
    if (stored.verificationStatus === undefined) stored.verificationStatus = "UNVERIFIED";
    if (stored.freshness === undefined) stored.freshness = "unknown";
    if (stored.riskState === undefined) stored.riskState = "UNKNOWN";
    if (stored.lifecycleState === undefined) stored.lifecycleState = "DISCOVERED";
    if (stored.capabilityState === undefined) stored.capabilityState = "UNKNOWN";
    if (stored.assetClass === "nft") stored.isCurrency = false;
    stored.lifecycleHistory = [];
    ASSETS[stored.assetId] = stored;
    return { ok: true, asset: cloneRecord(stored) };
  }

  function getAsset(assetId) {
    if (typeof assetId !== "string" || !ASSETS[assetId]) return null;
    return cloneRecord(ASSETS[assetId]);
  }

  function listAssets() {
    return Object.keys(ASSETS).map(function (id) { return cloneRecord(ASSETS[id]); });
  }

  function assetIds() {
    return Object.keys(ASSETS);
  }

  // ---- Domain models (record shapes + validators, not live data) ------
  // Each describe* returns null for an unknown asset id, and an
  // UNKNOWN-filled record for a known asset without data. No figures
  // are ever invented: every field the record does not supply is
  // "UNKNOWN" (or "unknown" for freshness). These describe structure;
  // they never claim a price, a backing amount, or a redemption outcome.

  function describeStablecoin(assetId) {
    var rec = getAsset(assetId);
    if (!rec) return null;
    var riskState = (rec.riskState && rec.riskState !== "RISK_FREE") ?
      rec.riskState : "UNKNOWN";
    return {
      assetId: rec.assetId,
      assetClass: rec.assetClass || "UNKNOWN",
      referenceAsset: unknownOr(rec.referenceAsset),
      issuer: unknownOr(rec.issuer),
      backingModel: unknownOr(rec.backingModel),
      collateral: unknownOr(rec.collateralModel || rec.collateral),
      reserveRedemptionModel: unknownOr(rec.reserveRedemptionModel),
      nativeNetwork: unknownOr(rec.networkId),
      contractOrMint: unknownOr(rec.contractAddress || rec.mintAddress),
      bridgeWrapper: unknownOr(rec.bridgeRelationship || rec.wrapperRelationship),
      liquidity: "UNKNOWN",
      priceDeviation: "UNKNOWN",
      depegStatus: rec.lifecycleState === "DEPEGGED" ? "DEPEGGED" : "UNKNOWN",
      verificationStatus: rec.verificationStatus || "UNVERIFIED",
      freshness: rec.freshness || "unknown",
      riskState: riskState
    };
  }

  function describeWrappedBridged(assetId) {
    var rec = getAsset(assetId);
    if (!rec) return null;
    return {
      assetId: rec.assetId,
      assetClass: rec.assetClass || "UNKNOWN",
      originalAsset: unknownOr(rec.underlyingAsset),
      originalNetwork: unknownOr(rec.sourceNetwork || rec.underlyingNetwork),
      wrapper: unknownOr(rec.wrapperRelationship),
      bridge: unknownOr(rec.bridgeRelationship),
      destinationNetworkAsset: rec.assetId,
      redemptionDependency: unknownOr(rec.redemptionDependency),
      liquidity: "UNKNOWN",
      securityDependency: unknownOr(rec.securityDependency),
      verificationStatus: rec.verificationStatus || "UNVERIFIED",
      freshness: rec.freshness || "unknown"
    };
  }

  function describeLiquidStaking(assetId) {
    var rec = getAsset(assetId);
    if (!rec) return null;
    return {
      assetId: rec.assetId,
      assetClass: rec.assetClass || "UNKNOWN",
      underlying: unknownOr(rec.underlyingAsset),
      stakedPosition: unknownOr(rec.stakedPosition),
      receiptToken: rec.assetId,
      validatorOperatorDependency: unknownOr(rec.validatorOperatorDependency),
      rewardMechanism: unknownOr(rec.rewardMechanism),
      redemption: unknownOr(rec.redemption || rec.reserveRedemptionModel),
      withdrawalDelay: unknownOr(rec.withdrawalDelay),
      liquidity: "UNKNOWN",
      slashingRisk: unknownOr(rec.slashingRisk),
      protocolRisk: unknownOr(rec.protocolRisk),
      priceDeviation: "UNKNOWN",
      verificationStatus: rec.verificationStatus || "UNVERIFIED",
      freshness: rec.freshness || "unknown"
    };
  }

  function describeLpPosition(assetId) {
    var rec = getAsset(assetId);
    if (!rec) return null;
    return {
      assetId: rec.assetId,
      assetClass: rec.assetClass || "UNKNOWN",
      pool: unknownOr(rec.pool),
      assets: unknownOr(rec.poolAssets),
      weightsRange: unknownOr(rec.weightsRange),
      shareOrNft: unknownOr(rec.shareOrNft),
      fees: unknownOr(rec.fees),
      incentives: unknownOr(rec.incentives),
      liquidityDepth: "UNKNOWN",
      impermanentLossExposure: unknownOr(rec.impermanentLossExposure),
      rangeExposure: unknownOr(rec.rangeExposure),
      withdrawalExitPath: unknownOr(rec.withdrawalExitPath),
      network: unknownOr(rec.networkId),
      protocol: unknownOr(rec.protocol),
      costs: unknownOr(rec.costs),
      // An LP position is NOT a normal token balance: it is a share of
      // a pool, exposed to impermanent loss and to the pool's exit
      // path. It must never be counted as a plain token holding.
      isTokenBalance: false,
      verificationStatus: rec.verificationStatus || "UNVERIFIED",
      freshness: rec.freshness || "unknown"
    };
  }

  // ---- NFT relationship classes ----------------------------------------
  // Assign an NFT relationship class to a registered NFT record.
  // Returns { ok: true, asset } or { ok: false, errors }. The record
  // never carries isCurrency: true afterwards.
  function classifyNft(assetId, relationshipClass) {
    if (!isNonEmptyString(assetId)) {
      return { ok: false, errors: ["classifyNft needs a non-empty assetId."] };
    }
    var stored = ASSETS[assetId];
    if (!stored) {
      return { ok: false, errors: ["Unknown asset id: " + assetId + "."] };
    }
    if (typeof relationshipClass !== "string" ||
        NFT_RELATIONSHIP_CLASSES.indexOf(relationshipClass) === -1) {
      return { ok: false, errors: ["Unknown NFT relationship class: " + relationshipClass + "."] };
    }
    if (stored.assetClass !== undefined && stored.assetClass !== "UNKNOWN" &&
        stored.assetClass !== "nft") {
      return { ok: false, errors: ["classifyNft applies to NFT records; asset \"" + assetId + "\" is class " + stored.assetClass + "."] };
    }
    var next = cloneRecord(stored);
    next.nftRelationshipClass = relationshipClass;
    next.isCurrency = false;
    ASSETS[assetId] = next;
    return { ok: true, asset: cloneRecord(next) };
  }

  // ---- Canonical-vocabulary reconciliation -----------------------------
  // CryptoWorld.ASSET_CLASSES is the canonical vocabulary and the
  // authority. Every spec class added by this unit is listed here with
  // its canonical counterpart, or null when it has none. UNMAPPED is a
  // note, not a new canonical class: nothing here invents or renames a
  // canonical class. The three canonical classes that had no
  // AssetIntelligence counterpart (Yield-bearing assets, Collateral
  // assets, Prediction-market positions) gained one in this unit and
  // are listed as MAPPED.
  var CANONICAL_RECONCILIATION = [
    { specClass: "payment-asset", specLabel: "Payment asset", canonicalClass: null, status: "UNMAPPED" },
    { specClass: "utility-token", specLabel: "Utility token", canonicalClass: null, status: "UNMAPPED" },
    { specClass: "governance-token", specLabel: "Governance token", canonicalClass: "Governance tokens", status: "MAPPED" },
    { specClass: "protocol-token", specLabel: "Protocol token", canonicalClass: null, status: "UNMAPPED" },
    { specClass: "reward-incentive-token", specLabel: "Reward / incentive token", canonicalClass: null, status: "UNMAPPED" },
    { specClass: "exchange-platform-token", specLabel: "Exchange / platform token", canonicalClass: null, status: "UNMAPPED" },
    { specClass: "index-basket-asset", specLabel: "Index / basket asset", canonicalClass: null, status: "UNMAPPED" },
    { specClass: "security-investment-token", specLabel: "Security / investment token", canonicalClass: null, status: "UNMAPPED" },
    { specClass: "ai-compute-asset", specLabel: "AI / compute asset", canonicalClass: null, status: "UNMAPPED" },
    { specClass: "oracle-data-asset", specLabel: "Oracle / data asset", canonicalClass: null, status: "UNMAPPED" },
    { specClass: "storage-network-resource-asset", specLabel: "Storage / network-resource asset", canonicalClass: null, status: "UNMAPPED" },
    { specClass: "compromised-asset", specLabel: "Compromised asset", canonicalClass: null, status: "UNMAPPED" },
    { specClass: "migrated-superseded-asset", specLabel: "Migrated / superseded asset", canonicalClass: null, status: "UNMAPPED" },
    { specClass: "yield-bearing-asset", specLabel: "Yield-bearing asset", canonicalClass: "Yield-bearing assets", status: "MAPPED" },
    { specClass: "collateral-asset", specLabel: "Collateral asset", canonicalClass: "Collateral assets", status: "MAPPED" },
    { specClass: "prediction-market-position", specLabel: "Prediction-market position", canonicalClass: "Prediction-market positions", status: "MAPPED" }
  ];

  function canonicalReconciliation() {
    return cloneRecord(CANONICAL_RECONCILIATION);
  }

  var api = {
    CLASSES: CLASSES,
    CLASS_SIGNALS: CLASS_SIGNALS,
    CONFIDENCES: CONFIDENCES,
    IDENTITY_FIELDS: IDENTITY_FIELDS,
    LIFECYCLE_STATES: LIFECYCLE_STATES,
    LIFECYCLE_TRANSITIONS: LIFECYCLE_TRANSITIONS,
    RISK_STATES: RISK_STATES,
    NFT_RELATIONSHIP_CLASSES: NFT_RELATIONSHIP_CLASSES,
    CANONICAL_RECONCILIATION: CANONICAL_RECONCILIATION,
    getClass: getClass,
    listClasses: listClasses,
    classIds: classIds,
    underlyingOf: underlyingOf,
    splitSourcesOf: splitSourcesOf,
    derivedClasses: derivedClasses,
    isDerivativeOf: isDerivativeOf,
    relatedClasses: relatedClasses,
    identitySignals: identitySignals,
    classify: classify,
    classifyFreshness: classifyFreshness,
    freshnessLabel: freshnessLabel,
    validateAssetDescriptor: validateAssetDescriptor,
    validateClassRecord: validateClassRecord,
    lifecycleStates: lifecycleStates,
    allowedTransitions: allowedTransitions,
    transitionAsset: transitionAsset,
    isTransactionallyAuthorized: isTransactionallyAuthorized,
    registerAsset: registerAsset,
    validateAssetRecord: validateAssetRecord,
    getAsset: getAsset,
    listAssets: listAssets,
    assetIds: assetIds,
    describeStablecoin: describeStablecoin,
    describeWrappedBridged: describeWrappedBridged,
    describeLiquidStaking: describeLiquidStaking,
    describeLpPosition: describeLpPosition,
    nftRelationshipClasses: nftRelationshipClasses,
    classifyNft: classifyNft,
    canonicalReconciliation: canonicalReconciliation,
    DEFAULT_MAX_AGE_DAYS: DEFAULT_MAX_AGE_DAYS
  };

  global.AssetIntelligence = api;
  return api;
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
