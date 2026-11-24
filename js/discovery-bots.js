/* MTI6-GTADWIY-COCKPIT — AI Discovery Workers (Contract Intelligence
 * + Keyless Discovery), adapted 2026-11-24 from the owner's
 * AI-assisted discovery blueprint to the REAL contracts of the
 * engines already in this repository. The blueprint's draft code
 * assumed draft fields, actor types, evidence shapes, and return
 * shapes that the engines reject; every adaptation below is forced
 * by the engines' own validators and is listed in the header of
 * the freeze/reconciliation note in the goal papers.
 *
 * Plugs into the existing pipelines — writes NOTHING canonical:
 *   1. window.EntityCandidates (js/entity-candidates.js)
 *   2. window.ResourceEngine   (js/resource-engine.js)
 * Sources catalogued for the ProviderRouter / ApiRegistry layer
 * are proposed as ResourceEngine candidates, never registered
 * directly.
 *
 * NON-NEGOTIABLE GOVERNANCE RULES (the platform's own, unchanged):
 *   - Candidate-only writes: bots NEVER write to canonical
 *     registries and NEVER promote a record past PREPARED.
 *     EntityCandidates stops at PREPARED for the owner's
 *     EntityGate; ResourceEngine's OWNER_APPROVED is set only by
 *     its owner-decision function, CONNECTED only with wiring
 *     evidence. This module calls neither.
 *   - Truth: every discovered contract/resource is born
 *     UNVERIFIED. Explorer source verification is recorded as
 *     EVIDENCE and identity signals — never as registration and
 *     never as a truth promotion.
 *   - Anchors: an uncertain identity anchor is refused
 *     (UNCERTAINANCHOR), never guessed — the standing anchor rule.
 *   - Execution boundary: EXECUTE = DISABLED. Discovering or
 *     verifying a router, vault, staking, or governance contract
 *     NEVER grants permission to call write functions or sign
 *     anything against it. This module performs reads only.
 */
(function (global) {
  "use strict";

  var CONTRACT_ROLES = [
    "TOKEN",
    "FACTORY",
    "ROUTER",
    "POOL",
    "VAULT",
    "STAKING",
    "RESTAKING",
    "LENDING_MARKET",
    "BRIDGE",
    "ORACLE",
    "GOVERNANCE",
    "TIMELOCK",
    "MULTISIG"
  ];

  /* The engines accept actor types OWNER | STAR | WORKER only
   * (ACTOR_TYPES in both modules); the blueprint's "BOTWORKER"
   * would be rejected, so both bots act as WORKER with distinct
   * refs. */
  var CONTRACT_ACTOR = { type: "WORKER", ref: "worker:contract-intelligence-bot" };
  var KEYLESS_ACTOR = { type: "WORKER", ref: "worker:keyless-discovery-bot" };

  /* ---- 1. Keyless discovery sources (no client secrets) ---- */

  var KEYLESS_DISCOVERY_SOURCES = [
    {
      id: "defillama-protocols",
      name: "DefiLlama Protocols & Chains",
      provider: "DefiLlama",
      category: "crypto-protocol",
      endpointPattern: "https://api.llama.fi/protocols",
      documentation: "https://defillama.com/docs/api",
      cors: true,
      browserDirect: true,
      provides: ["protocol-slug", "chain-tvl", "audits-link", "official-url", "github-org", "token-address"]
    },
    {
      id: "coingecko-public",
      name: "CoinGecko Public Asset Metadata",
      provider: "CoinGecko",
      category: "crypto-asset-metadata",
      endpointPattern: "https://api.coingecko.com/api/v3/coins/{id}",
      documentation: "https://docs.coingecko.com",
      cors: true,
      browserDirect: true,
      provides: ["platforms-contract-map", "asset-metadata", "official-links"]
    },
    {
      id: "dexscreener-pairs",
      name: "DexScreener Token & Pool Indexer",
      provider: "DexScreener",
      category: "dex-data",
      endpointPattern: "https://api.dexscreener.com/latest/dex/tokens/{address}",
      documentation: "https://docs.dexscreener.com/api/reference",
      cors: true,
      browserDirect: true,
      provides: ["pair-address", "dex-id", "base-token", "quote-token", "liquidity-observation"]
    },
    {
      id: "geckoterminal-public",
      name: "GeckoTerminal Public On-Chain Pools",
      provider: "GeckoTerminal (CoinGecko)",
      category: "pool-data",
      endpointPattern: "https://api.geckoterminal.com/api/v2/networks/{network}/pools/{address}",
      documentation: "https://apiguide.geckoterminal.com",
      cors: true,
      browserDirect: true,
      provides: ["pool-contracts", "dex-routing-context", "reserve-observation"]
    },
    {
      id: "chainlist-rpcs",
      name: "Chainlist Chain & Public RPC Registry",
      provider: "Chainlist (DefiLlama)",
      category: "chain-metadata",
      endpointPattern: "https://chainid.network/chains.json",
      documentation: "https://chainlist.org",
      cors: true,
      browserDirect: true,
      provides: ["chainId", "nativeCurrency", "rpc-candidates", "explorers"]
    },
    {
      id: "blockscout-v2-keyless",
      name: "Blockscout REST v2 (ETH / Base / Arbitrum / Optimism / Polygon)",
      provider: "Blockscout",
      category: "contract-verification",
      endpointPattern: "https://{chain}.blockscout.com/api/v2/smart-contracts/{address}",
      documentation: "https://docs.blockscout.com",
      cors: true,
      browserDirect: true,
      provides: ["is-verified", "abi", "compiler-version", "is-proxy", "implementation-address"]
    }
  ];

  var BLOCKSCOUT_HOSTS = {
    ethereum: "eth.blockscout.com",
    base: "base.blockscout.com",
    arbitrum: "arbitrum.blockscout.com",
    optimism: "optimism.blockscout.com",
    polygon: "polygon.blockscout.com"
  };

  /* ---- 2. Contract Intelligence Bot (propose & evidence only) ---- */

  function normalizeAddress(addr, vmType) {
    if (typeof addr !== "string") return null;
    var trimmed = addr.trim();
    if (!trimmed) return null;
    if ((vmType || "EVM") === "EVM") {
      return /^0x[a-fA-F0-9]{40}$/.test(trimmed) ? trimmed.toLowerCase() : null;
    }
    return trimmed;
  }

  /* Keyless explorer read: Blockscout REST v2 contract state.
   * Returns the verification facts as data; recording them as
   * candidate evidence is ingestDiscoveredContract's job. */
  function checkBlockscoutVerification(networkRef, address) {
    var host = BLOCKSCOUT_HOSTS[String(networkRef || "").toLowerCase()];
    var addr = normalizeAddress(address, "EVM");
    if (!host) {
      return Promise.resolve({ ok: false, errors: ["No keyless Blockscout host is catalogued for networkRef " + networkRef + "."] });
    }
    if (!addr) {
      return Promise.resolve({ ok: false, errors: ["UNCERTAINANCHOR: a valid EVM contract address is required; never guessed."] });
    }
    var url = "https://" + host + "/api/v2/smart-contracts/" + addr;
    return fetch(url, { headers: { accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("Blockscout HTTP " + res.status);
        return res.json();
      })
      .then(function (body) {
        var impls = Array.isArray(body.implementations) ? body.implementations : [];
        return {
          ok: true,
          sourceUrl: url,
          isVerified: body.is_verified === true,
          name: typeof body.name === "string" ? body.name : null,
          compilerVersion: typeof body.compiler_version === "string" ? body.compiler_version : null,
          isProxy: impls.length > 0,
          implementationAddress: impls.length && impls[0] && impls[0].address_hash
            ? normalizeAddress(impls[0].address_hash, "EVM")
            : null
        };
      })
      .catch(function (err) {
        return { ok: false, errors: ["Blockscout read failed: " + (err && err.message ? err.message : "unknown error")] };
      });
  }

  /* Ingests a discovered contract into EntityCandidates as an
   * UNVERIFIED candidate with network-qualified anchors and
   * explorer evidence, then advances it DISCOVERED -> IDENTIFIED
   * and runs the engine's deterministic dedupe. The candidate
   * stops wherever the pipeline leaves it — promotion past
   * PREPARED belongs to the owner's EntityGate, not to this bot.
   *
   * Field mapping (the engine's real draft contract):
   *   spec.entityKind  -> proposedKind (NETWORK | ASSET | PROTOCOL)
   *   spec.contractAddress + spec.networkRef
   *                    -> contractAnchors [{address, networkRef}]
   *   role / proxy / explorer state -> identitySignals + evidence
   */
  function ingestDiscoveredContract(spec) {
    var EC = global.EntityCandidates;
    if (!EC || typeof EC.createCandidate !== "function") {
      return Promise.resolve({ ok: false, errors: ["NOT_LOADED: EntityCandidates pipeline is not loaded."] });
    }
    if (!spec || typeof spec !== "object") {
      return Promise.resolve({ ok: false, errors: ["INVALID_DRAFT: contract specification object required."] });
    }
    var addr = normalizeAddress(spec.contractAddress, spec.vmType || "EVM");
    if (!addr) {
      return Promise.resolve({ ok: false, errors: ["UNCERTAINANCHOR: valid contractAddress is required; never guessed."] });
    }
    if (!spec.networkRef || typeof spec.networkRef !== "string") {
      return Promise.resolve({ ok: false, errors: ["UNCERTAINANCHOR: canonical networkRef is required (anchors are network-qualified)."] });
    }
    var role = CONTRACT_ROLES.indexOf(spec.contractRole) !== -1 ? spec.contractRole : "UNKNOWN";
    var kindRaw = String(spec.entityKind || "protocol").toUpperCase();
    var proposedKind = ["NETWORK", "ASSET", "PROTOCOL"].indexOf(kindRaw) !== -1 ? kindRaw : "PROTOCOL";
    var now = new Date().toISOString();
    var explorerStatus = spec.explorerVerified === true
      ? "VERIFIED_SOURCE_CONFIRMED"
      : spec.explorerVerified === false
        ? "UNVERIFIED_SOURCE"
        : "UNKNOWN";
    var sourceRef = spec.sourceUrl || "contract:" + spec.networkRef + ":" + addr;

    var signals = [
      { type: "CONTRACT_ROLE", value: role, source: sourceRef },
      { type: "EXPLORER_VERIFICATION", value: explorerStatus, source: sourceRef }
    ];
    var impl = normalizeAddress(spec.implementationAddress, spec.vmType || "EVM");
    if (impl) {
      signals.push({ type: "PROXY_IMPLEMENTATION", value: impl, source: sourceRef });
    }

    var draft = {
      proposedKind: proposedKind,
      proposedName: spec.name || "Unnamed contract (" + addr.slice(0, 10) + "…)",
      networkRefs: [spec.networkRef],
      contractAnchors: [{ address: addr, networkRef: spec.networkRef }],
      identitySignals: signals,
      evidence: [
        {
          kind: "ONCHAIN_ANCHOR",
          ref: sourceRef,
          capturedBy: CONTRACT_ACTOR.ref,
          capturedAt: now,
          summary: "Role: " + role + " | Explorer source state: " + explorerStatus +
            (spec.isProxy === true ? " | Proxy" + (impl ? " -> " + impl : "") : "")
        }
      ]
    };

    return EC.createCandidate(draft, CONTRACT_ACTOR, now).then(function (created) {
      if (!created || !created.ok) return created;
      var id = created.record.id;
      return EC.transitionCandidate(id, "IDENTIFIED", CONTRACT_ACTOR, { now: now, note: "Identified by contract-intelligence-bot from its recorded anchors." })
        .then(function (identified) {
          if (!identified || !identified.ok) return identified;
          return EC.runDedupe(id, CONTRACT_ACTOR, now);
        })
        .then(function (deduped) {
          if (!deduped || !deduped.ok) return deduped;
          return {
            ok: true,
            candidateId: id,
            stage: deduped.record ? deduped.record.pipelineStage : null,
            dedupeVerdict: deduped.record && deduped.record.dedupe ? deduped.record.dedupe.verdict : null,
            explorerVerificationState: explorerStatus,
            truthState: "UNVERIFIED",
            executionAuthority: "DISABLED"
          };
        });
    });
  }

  /* ---- 3. Keyless Discovery Bot (feeds ResourceEngine) ---- */

  /* Proposes a keyless API / public RPC source to ResourceEngine
   * as a candidate. It is born DISCOVERED and UNVERIFIED; nothing
   * here approves or connects it — OWNER_APPROVED belongs to the
   * engine's owner-decision function and CONNECTED to real wiring
   * evidence, neither of which this bot can supply. */
  function proposeKeylessResource(sourceSpec) {
    var RE = global.ResourceEngine;
    if (!RE || typeof RE.createCandidate !== "function") {
      return Promise.resolve({ ok: false, errors: ["NOT_LOADED: ResourceEngine is not loaded."] });
    }
    if (!sourceSpec || typeof sourceSpec !== "object" || !sourceSpec.name || !sourceSpec.provider) {
      return Promise.resolve({ ok: false, errors: ["INVALID_DRAFT: sourceSpec needs name and provider."] });
    }
    var now = new Date().toISOString();
    var draft = {
      candidateType: "SOURCE",
      name: sourceSpec.name,
      provider: sourceSpec.provider,
      domain: sourceSpec.category || "keyless-discovery",
      resourceType: "OFFICIAL_API",
      capabilities: Array.isArray(sourceSpec.provides) ? sourceSpec.provides.slice() : [],
      documentation: sourceSpec.documentation || sourceSpec.endpointPattern || null,
      apiDescription: "Keyless public endpoint candidate for Capability Router evaluation: " +
        (sourceSpec.endpointPattern || ""),
      authenticationType: "NONE",
      apiKeyRequired: false,
      oauthRequired: false,
      freeState: "FREE_KEYLESS",
      evidence: [
        {
          kind: "OFFICIAL_DOC",
          ref: sourceSpec.documentation || sourceSpec.endpointPattern,
          capturedBy: KEYLESS_ACTOR.ref,
          capturedAt: now,
          summary: "Keyless public endpoint proposed by the keyless-discovery-bot; not approved, not connected."
        }
      ]
    };
    return RE.createCandidate(draft, KEYLESS_ACTOR, now);
  }

  /* Proposes every catalogued keyless source, in order. */
  function proposeAllKeylessSources() {
    return KEYLESS_DISCOVERY_SOURCES.reduce(function (chain, src) {
      return chain.then(function (results) {
        return proposeKeylessResource(src).then(function (r) {
          results.push({ id: src.id, ok: !!(r && r.ok), errors: r && r.errors ? r.errors : undefined });
          return results;
        });
      });
    }, Promise.resolve([]));
  }

  global.MTI6DiscoveryBots = {
    CONTRACT_ROLES: CONTRACT_ROLES,
    KEYLESS_DISCOVERY_SOURCES: KEYLESS_DISCOVERY_SOURCES,
    BLOCKSCOUT_HOSTS: BLOCKSCOUT_HOSTS,
    normalizeAddress: normalizeAddress,
    checkBlockscoutVerification: checkBlockscoutVerification,
    ingestDiscoveredContract: ingestDiscoveredContract,
    proposeKeylessResource: proposeKeylessResource,
    proposeAllKeylessSources: proposeAllKeylessSources
  };
})(typeof window !== "undefined" ? window : globalThis);
