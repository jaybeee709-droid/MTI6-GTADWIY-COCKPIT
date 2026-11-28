# MTI6 Crypto World — Gap Map (audit of `development` @ v251)

Date: 2026-11-28
Branch audited: `development`
Commit audited: `52251d30b7756dd5b3b98cf3ce73e39b7f29a297` (v251)
Method: source read of the Crypto World surfaces on that commit, plus `git log` on the branch.
Scope: Crypto World only. Earnings, Globe, Bot Operations and the shell are out of scope.

This document is an inventory of what is actually in the repository. It is not a plan,
a build authorisation, or a gap analysis derived from any external assessment.

---

## 0. Why this document exists

Three assessment documents were supplied that graded Crypto World area-by-area
(Taxonomy 95%, Protocol Intelligence 20%, Lending 10%, Simulation World 0%, and so on).
On reading the actual source on `development`, several of those grades are contradicted by
the code. This audit records what the code says, with each claim tied to a file, so later
work is not planned against assumptions that are already stale.

The branch had also advanced through v247–v251 from commits this audit did not author
(`4d180c3` v247, `97af9dc` v248, `58f67dd` v249, `08e6619` v250, `52251d3` v251).
Any roadmap written before those commits is out of date by construction.

---

## 1. Legend

- ✅ **Implemented** — real surface, real data or real record discipline.
- 🟡 **Partial** — exists and works, but shallow, narrow, or single-path.
- ⚠️ **Stub / placeholder** — the name exists; the implementation does not.
- ❌ **Missing** — no surface, no data, no reference.
- 🔁 **Supersedes older assumption** — an assessment said missing or near-zero; the code
  says otherwise. These are the items where planning against the assessment would
  duplicate work that already exists.

---

## 2. Corrections to the supplied assessments

### 2.1 🔁 "Simulation World ........... 0%" — contradicted

`src/simulator.ts` exists and is fully wired.

- It exports `simulate()`, `loadSimulations()`, `saveSimulations()` and the
  `SimulationRecord` type.
- `src/worlds/OtherWorlds.tsx` imports `loadSimulations, saveSimulations, simulate,
  type SimulationRecord` and calls them from `OpportunitiesWorld`.
- Creating a simulation is the **only** path that moves an opportunity to the `SIMULATED`
  pipeline stage: `advanceOpp()` explicitly refuses that step and routes the user to the
  simulation flow instead.
- Records carry `accountingScope: 'SIMULATION_ONLY'` and state `SIMULATED / NOT EXECUTED`.
  They write nothing into positions or earnings.

What is genuinely absent: path comparison ("$500 into lending vs staking vs RWA"), scenario
modelling, and any lifecycle framing. The record discipline is real; the modelling is not
there. Correct status: 🟡 **Partial**, not 0%.

### 2.2 🔁 "Stablecoin World ........... 5%" / "Treasury World ............. 0%" — understated

`src/live-data.ts` already exports observation functions for a large set of capabilities
beyond price and yield. Verified exports from that file:

```text
fetchPrice               fetchHistory            fetchYields
fetchStablecoins         fetchPerpFunding        fetchPendleMarkets(chainId)
fetchBridgeFee           fetchProtocolIndex      fetchDexVolumes
fetchProtocolFees        fetchGovernanceProposals
fetchDexPairIntel        fetchGeckoTerminalPrice fetchAddressBalances
fetchHoneypotCheck       fetchBitcoinTip         fetchSwapQuote
fetchWeather
```

`fetchStablecoins()` alone is the stablecoin-observation capability the assessment graded
at 5%. The gap is not the capability. See §4.

### 2.3 🔁 "Protocol Intelligence ...... 20%" — partly contradicted, with a caveat

The registry and join layer is further along than 20%:

- `src/crypto-workspaces-data.ts` — all 56 workspaces with group, status, ladder top, gating.
- `src/workspace-coverage-data.ts` — per-workspace primary/secondary majors, families,
  entity kinds, bot roles, cost classes, risk dimensions, frame and ladder.
- `src/screens/CryptoWorkspacesScreen.tsx` joins that coverage to `CANONICAL_60`,
  `ENCYCLOPEDIA_INDEX`, `ENCYCLOPEDIA_FAMILIES` and `ENTITY_UNIVERSE`, and renders a
  dedicated detail view per workspace with a recorded related-workspaces panel.
- `src/classification.ts` — 20 universal classes, a placement matrix, subclass
  vocabularies, and a 30-dimension DEX checklist with evidence-only coverage scoring.
- `src/entity-data.ts` — 48 canonical entities (chains/assets/protocols), all UNVERIFIED.
- `src/contract-registry.ts` / `src/contract-catalog.ts` — contract discovery and a
  source-counted catalogue (1 source UNVERIFIED / 2 SUPPORTED / 3+ STRONG).

What is genuinely absent: dependency edges between protocols, failure-cascade reasoning,
and per-protocol profiles. The structural registry is real; the graph reasoning is not.

---

## 3. Area-by-area inventory

| Area | Status | Evidence on `development` |
|---|---|---|
| Taxonomy / 60 backbone / 20 families / 826 records | ✅ | `CryptoWorld.tsx` renders every family with its major count; `ENCYCLOPEDIA_COUNTS` drives the totals |
| 56-workspace registry | ✅ | `crypto-workspaces-data.ts`; groups Core 14, Trading 5, Routing 2, Yield 11, Derivatives 5, Infrastructure 8, Specialized 11 |
| Per-workspace coverage joins | ✅ | `workspace-coverage-data.ts` + `CryptoWorkspacesScreen.tsx` detail view |
| Entity / asset / contract registries | ✅ | `entity-data.ts`, `asset-universe.ts`, `contract-catalog.ts` |
| Cost framework | ✅ | `cost-risk-data.ts` — 12 cost kinds, states KNOWN/UNKNOWN/ESTIMATED; UNKNOWN is null, never zero |
| Risk framework | ✅ | `cost-risk-data.ts` — 19 dimensions, states PRESENT/ABSENT/UNKNOWN, no score anywhere |
| World Engine (frozen run) | ✅ | `world-engine-data.ts` — 890 nodes, 960 edges, 0 unresolved; rendered by `WorldEnginePanel` |
| Live yields | ✅ | `fetchYields()` via DefiLlama, rendered by `LiveYieldsPanel` with a provenance chip |
| Live prices + history | ✅ | 15-source price chain and `fetchHistory`, consumed by the Crypto Market screen |
| Opportunity scanner | 🟡 | `opportunity-scanner.ts` ranks by evidence dimensions only; `SCANNER_NO_DATA_LANES` names 16 lanes with no source |
| Swap Desk | 🟡 | `swap-desk.ts` — prepare-only, $50 boundary, owner approval, sign handoff. No signing, no broadcast. |
| Simulator | 🟡 | Real record discipline, single-path, no comparison or scenario modelling (§2.1) |
| STAR local brain (crypto) | 🟡 | `star-local.ts` — 80 branches; covers registries, entities, workspaces, gaps, scanner, swap desk |
| Registries for DEX / Bridge / Pool / Vault | 🟡 | Candidate stores, filled by scans, promotion gated to the owner (`dex-registry.ts`, `bridge-registry.ts`, `pool-vault-registry.ts`) |
| Lending | ⚠️ | Workspace row + registry coverage only; no supply market, rate curve, or collateral surface |
| Borrowing | ⚠️ | Same; no health factor, LTV, or liquidation surface |
| Liquidity / Yield Farming / Vaults | ⚠️ | Workspace rows exist; no pool or vault analytics surface |
| Staking / Restaking | ⚠️ | Validator and staking panels exist in `CryptoWorld.tsx` but every metric reads `NO_DATA` and every protocol pill reads `NOT CONNECTED` / `READ-ONLY` / `EXPANSION-GATED` |
| Derivatives | ⚠️ | Workspace rows (Perpetuals, Futures, Options, Synthetics, Margin) with no surface; `fetchPerpFunding()` exists and is unwired |
| Yield Trading | ⚠️ | Workspace row; `fetchPendleMarkets()` exists and is unwired |
| RWA | ⚠️ | Workspace row; `asset-universe.ts` carries an RWA tier |
| Insurance | ❌ | No workspace id in the 56; no surface |
| NFT-Fi | ⚠️ | Workspace row only |
| MEV | ❌ | Zero references in any Crypto World file |
| DePIN | ⚠️ | Workspace row; DePIN tier in the asset universe |
| AI Compute | ⚠️ | Owner-gated seat; no activity is invented to fill it |
| Prediction Markets | ⚠️ | Workspace row only |
| Oracle | ⚠️ | Workspace row; oracle protocols in the entity universe |
| Governance | 🟡 | Workspace row; `fetchGovernanceProposals()` exists (Snapshot spaces) and is unwired |
| BTCFi | ⚠️ | Workspace row only |
| Identity / Modular | ⚠️ | Owner-gated seats |
| Infrastructure / Nodes / Validators | ⚠️ | Workspace rows; validator panel reads `NO_DATA` |
| Cross-chain / Routing | ⚠️ | Workspace rows; `fetchBridgeFee()` exists and is unwired |
| **Flash Loans** | ❌ | No workspace id in the 56 at all |
| **Liquidations** | ❌ | No workspace id in the 56 at all |
| **Lifecycle map** | ❌ | Zero references in any Crypto World file |
| **Dependency / failure cascade** | ❌ | Zero references to `cascade`; no edge model between protocols |
| **Tokenomics** | ❌ | Zero references |
| **Treasury (dedicated)** | ❌ | Zero references in any Crypto World file |
| **MEV world** | ❌ | Zero references |
| **Protocol Intelligence (graph)** | ❌ | Registry exists (§2.3); no per-protocol profile or dependency surface |

---

## 4. The finding that outranks the assessments' build order

Every capability below is **implemented and reachable in the data layer**, and **consumed by
no screen**. Verified by grepping each export name across every `.tsx`, `.ts`, and `.mjs`
file in the audited set for any reference outside `live-data.ts` itself:

| Export | Consumed outside `live-data.ts` |
|---|---|
| `fetchStablecoins` | none |
| `fetchPerpFunding` | none |
| `fetchPendleMarkets` | none |
| `fetchBridgeFee` | none |
| `fetchProtocolIndex` | none |
| `fetchDexVolumes` | none |
| `fetchProtocolFees` | none |
| `fetchGovernanceProposals` | none |
| `fetchDexPairIntel` | none |
| `fetchAddressBalances` | none |
| `fetchHoneypotCheck` | none |
| `fetchBitcoinTip` | none |
| `fetchGeckoTerminalPrice` | none |
| `fetchWeather` | none |

Only two files in the audited set import from `live-data` at all:

```text
src/worlds/CryptoWorld.tsx : import { fetchYields, fmtUsd, useObservation, useProvenanceLog } from '../live-data';
src/star-local.ts          : import { getProvenanceLog } from './live-data';
```

`CryptoMarketScreen.tsx` and `SwapDeskPanel.tsx` also consume the layer
(`fetchPrice`, `fetchHistory`, `fetchSwapQuote`) but were not part of this audit's
reading set and are listed here only so the picture is not overstated.

**Consequence.** The assessments rank "build Lending World, then Liquidation World" first.
On this commit, the cheapest meaningful gain is not those: it is **surfacing the 14
unwired capabilities**, which converts already-verified infrastructure into visible
Crypto World capability without new data sources, new keys, or new honesty risk — the
layer already enforces LIVE / CACHED / STALE / NO_DATA with a provenance record per
observation.

---

## 5. Constraints any Crypto World work must respect

These are not this document's opinions; they are already enforced in the code and are
verified by `scripts/route-smoke-test.mjs`:

1. **Execution stays disabled.** `EXECUTE` appears in no workspace's `ladderTop`.
   The Swap Desk prepares and stops; signing is the owner's own hand.
2. **Honesty strings are asserted.** The smoke test fails on any of
   `$2,842,610`, `EXECUTE READY`, `Harvested 1,240 USDC`, `$95,240`, `14 gwei`,
   `Subsea cable failover`, `Transit corridor congestion` appearing in rendered output.
3. **All 22 routes must render distinctly**, each containing its expected heading.
   Crypto World's heading is `CRYPTO INTEL COMMAND`; the workspaces index's is
   `Crypto Workspaces — All 56`.
4. **No invented values.** UNKNOWN stays UNKNOWN, NOT_CONNECTED stays NOT_CONNECTED,
   an unmeasured figure is never rendered as zero, and a gap is named rather than filled.
5. **Owner-gated seats stay gated.** Five workspaces (AI/Compute, Modular, Identity,
   GameFi, SocialFi) have no canonical Major Activity; none may be invented for them.

---

## 6. Authorisation state

`docs/FUTURE-WORK.md` on this branch records:

```text
Nothing here is authorized to build until Daniel says so, except items already
authorized elsewhere.
Workforce build gate: CLOSED. Packages P1–P15 + P-T1 unauthorized.
DO NOT MERGE TO MAIN. Development only.
```

`src/build-queue.ts` records the house rule that the bot team prepares specs and
evidence, and that code is written by Muse in the clone.

This document is an inventory only. It authorises no build, opens no package, and does
not touch `main`. Work on `development` proceeds only under the owner's explicit word.

---

## 7. Prioritised queue (proposed, not authorised)

Ranked by verified leverage against the state above.

| # | Item | Why here | Touches a gate? |
|---|---|---|---|
| 1 | Surface the 14 unwired capabilities as Crypto World panels | Largest verified gain per unit of work; no new sources, no new keys, honesty rules already enforced by the layer | No |
| 2 | Lifecycle map — 15 stages bound to real `major-*` ids | Structural backbone for every later vertical; no invented activities needed | No |
| 3 | Vertical depth in the workspace detail view | Lending, Borrowing, Staking/Restaking, Derivatives, Yield Trading, Vaults, RWA, BTCFi, Oracles, Cross-chain | No |
| 4 | Flash Loans + Liquidations workspace rows | Both are absent from the 56 registry entirely | Registry edit |
| 5 | Dependency + failure-cascade intelligence | Requires a protocol edge model that does not exist | No |
| 6 | Tokenomics, Treasury, MEV, Protocol Intelligence surfaces | All four read zero references today | No |
| 7 | STAR branches for the above | Keeps the local brain consistent with new surfaces | No |

Items 1, 3, 6 and 7 all sit inside the surfaces the assessments called missing, and none of
them requires a new external source, a new key, or an execution path.

---

## 8. Open questions for the owner

1. Does `docs/FUTURE-WORK.md`'s build gate still stand for Crypto World items, or is it
   superseded by later direction?
2. Should the 14 unwired capabilities be surfaced, or are some deliberately unwired?
3. Two RWA workspaces, one pool registry and one vault registry exist — is the intended
   shape one RWA workspace with a pool/vault split inside it?
4. Is the Crypto World content set still the canonical 24 only, or does the Phase 2
   structure list stand alongside it?

---

*End of audit. Every claim above is sourced to a file on `development` @ `52251d30`.*
