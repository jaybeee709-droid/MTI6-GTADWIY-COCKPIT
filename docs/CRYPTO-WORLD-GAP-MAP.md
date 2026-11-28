# MTI6 Crypto World — Gap Map (audit of `development` @ v251, corrected 2026-11-28)

Date: 2026-11-28
Branch audited: `development`
Commit audited: `52251d30b7756dd5b3b98cf3ce73e39b7f29a297` (v251)
Correction commit base: `371d0b24d173339f7101d46fa9c0e59859c778b3`
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

## 1A. ARCHITECTURAL FINDING — the workspace registry and the Canonical 60 are distinct systems

(Added 2026-11-28, docs-only correction. Establised while validating the proposed
Lifecycle Intelligence bindings against the authoritative taxonomy.)

The 56-Workspace Registry and the Canonical 60 Major Activities are related but **not the
same system**, and the registry is not a strict 1:1 projection of the taxonomy.

**Canonical 60** (`js/data/encyclopedia-canonical-60.js`, derived into
`src/encyclopedia-data.ts` by `scripts/generate-encyclopedia-data.mjs`):

- An activity taxonomy — *things you do*.
- The authority for activity classification.
- Carries `id`, `title`, `definition`, `primaryFamily`, `workspace`, `globeView`,
  `verificationStatus`, `source`, `importBatch`, `ownerApprovalStatus`.

**Workspace Registry** (`src/crypto-workspaces-data.ts`, mirroring
`js/crypto-workspace-registry.js`):

- User surfaces, intelligence surfaces, and operational surfaces.
- Registry coverage views grouped into Core / Trading / Routing / Yield / Derivatives /
  Infrastructure / Specialized.
- Carries `id`, `title`, `group`, `status`, `ladderTop`, `gated`, `frame` — and does
  **not** carry a canonical activity id.

**Result.** A workspace is not required to have a Canonical 60 mapping. A workspace may
legitimately map to zero canonical Major Activities, and that is a truthful outcome rather
than a defect.

Workspaces that may legitimately carry **no Canonical Major Activity** mapping, because they
are surfaces *over* activities rather than activities themselves:

- Protocols
- Intelligence
- Risk
- Security
- Bot Operations
- Opportunities
- Positions
- Portfolio
- Live Data

**Correct behaviour:** `NO CANONICAL MAJOR ACTIVITY MAPPED` is an acceptable and truthful
outcome, and must never be replaced by a guessed, borrowed, aliased or inferred mapping.

Any surface that reads lifecycle position per workspace must therefore support **three**
outcomes honestly — **Mapped**, **Unmapped**, and **Multi-mapped** (a workspace whose
activities span more than one canonical major) — and must not fabricate canonical homes.

---

## 1B. CORRECTION — the family count displayed in Crypto World is stale

`src/worlds/CryptoWorld.tsx` currently renders the line:

```text
60 MAJOR ACTIVITIES ACROSS 20 FAMILIES · 334 TYPES + 404 STRATEGIES BENEATH THEM ·
```

`scripts/generate-encyclopedia-data.mjs` asserts the authoritative counts and would
`process.exit(1)` on any drift:

```text
families=28  majors=60  types=334  strategies=404  actions=1014  index=1840
```

`ENCYCLOPEDIA_FAMILIES` in `src/encyclopedia-data.ts` holds **28** entries.

**Finding:** the string `20 FAMILIES` appears stale. The displayed family count should be
reviewed against the generated canonical data and, if confirmed, corrected — or, better,
rendered from `ENCYCLOPEDIA_COUNTS.families` so it can never drift again.

This is recorded, not fixed: it is a one-line presentation string and no code change is
authorised by this document.

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
| Taxonomy / 60 backbone / 28 families / 1840 records | ✅ | `CryptoWorld.tsx` renders every family with its major count; `ENCYCLOPEDIA_COUNTS` drives the totals |
| 56-workspace registry | ✅ | `crypto-workspaces-data.ts`; groups Core 14, Trading 5, Routing 2, Yield 11, Derivatives 5, Infrastructure 8, Specialized 11 |
| Per-workspace coverage joins | ✅ | `workspace-coverage-data.ts` + `CryptoWorkspacesScreen.tsx` detail view |
| Entity / asset / contract registries | ✅ | `entity-data.ts`, `asset-universe.ts`, `contract-catalog.ts` |
| Cost framework | ✅ | `cost-risk-data.ts` — 12 cost kinds, states KNOWN/UNKNOWN/ESTIMATED; UNKNOWN is null, never zero |
| Risk framework | ✅ | `cost-risk-data.ts` — 19 dimensions, states PRESENT/ABSENT/UNKNOWN, no score anywhere |
| World Engine (frozen run) | ✅ | `world-engine-data.ts` — 890 nodes, 960 edges, 0 unresolved; rendered by `WorldEnginePanel` |
| Live yields | ✅ | `fetchYields()` via DefiLlama, rendered by `LiveYieldsPanel` with a provenance chip |
| Live prices + history | ✅ | 15-source price chain and `fetchHistory`, consumed by the Crypto Market screen |
| **Live surfaces (Priority 1, v252)** | ✅ | `src/worlds/CryptoLiveSurfaces.tsx` — 7 panels; see §4A |
| Opportunity scanner | 🟡 | `opportunity-scanner.ts` ranks by evidence dimensions only; `SCANNER_NO_DATA_LANES` names 16 lanes with no source |
| Swap Desk | 🟡 | `swap-desk.ts` — prepare-only, $50 boundary, owner approval, sign handoff. No signing, no broadcast. |
| Simulator | 🟡 | Real record discipline, single-path, no comparison or scenario modelling (§2.1) |
| STAR local brain (crypto) | 🟡 | `star-local.ts` — 80 branches; covers registries, entities, workspaces, gaps, scanner, swap desk |
| Registries for DEX / Bridge / Pool / Vault | 🟡 | Candidate stores, filled by scans, promotion gated to the owner (`dex-registry.ts`, `bridge-registry.ts`, `pool-vault-registry.ts`) |
| Lending | ⚠️ | Workspace row + registry coverage only; no supply market, rate curve, or collateral surface |
| Borrowing | ⚠️ | Same; no health factor, LTV, or liquidation surface |
| Liquidity / Yield Farming / Vaults | ⚠️ | Workspace rows exist; no pool or vault analytics surface |
| Staking / Restaking | ⚠️ | Validator and staking panels exist in `CryptoWorld.tsx` but every metric reads `NO_DATA` and every protocol pill reads `NOT CONNECTED` / `READ-ONLY` / `EXPANSION-GATED` |
| Derivatives | ⚠️ | Workspace rows (Perpetuals, Futures, Options, Synthetics, Margin) with no surface; `fetchPerpFunding()` now surfaced by the v252 live-surfaces panel |
| Yield Trading | ⚠️ | Workspace row; `fetchPendleMarkets()` now surfaced by the v252 live-surfaces panel |
| RWA | ⚠️ | Workspace row; `asset-universe.ts` carries an RWA tier |
| Insurance | ❌ | No workspace id in the 56; no surface |
| NFT-Fi | ⚠️ | Workspace row only |
| MEV | ❌ | Zero references in any Crypto World file |
| DePIN | ⚠️ | Workspace row; DePIN tier in the asset universe |
| AI Compute | ⚠️ | Owner-gated seat; no activity is invented to fill it |
| Prediction Markets | ⚠️ | Workspace row only |
| Oracle | ⚠️ | Workspace row; oracle protocols in the entity universe |
| Governance | 🟡 | Workspace row; `fetchGovernanceProposals()` now surfaced by the v252 live-surfaces panel |
| BTCFi | ⚠️ | Workspace row only |
| Identity / Modular | ⚠️ | Owner-gated seats |
| Infrastructure / Nodes / Validators | ⚠️ | Workspace rows; validator panel reads `NO_DATA` |
| Cross-chain / Routing | ⚠️ | Workspace rows; `fetchBridgeFee()` consumed by the Swap Desk |
| **Flash Loans** | ❌ | No workspace id in the 56 at all |
| **Liquidations** | ❌ | No workspace id in the 56 at all; `major-liquidations` exists in the Canonical 60 |
| **Lifecycle map** | 🟡 | Designed and built in sandbox, **on HOLD**; see §7A |
| **Dependency / failure cascade** | ❌ | Zero references to `cascade`; no edge model between protocols |
| **Tokenomics** | ❌ | Zero references |
| **Treasury (dedicated)** | ❌ | Zero references in any Crypto World file |
| **MEV world** | ❌ | Zero references |
| **Protocol Intelligence (graph)** | ❌ | Registry exists (§2.3); no per-protocol profile or dependency surface |

---

## 4. The finding that outranks the assessments' build order

Every capability below was **implemented and reachable in the data layer**, and **consumed by
no screen** at the time of the original audit. Verified by grepping each export name across
every `.tsx`, `.ts`, and `.mjs` file in the audited set for any reference outside
`live-data.ts` itself:

| Export | Consumed outside `live-data.ts` (pre-v252) |
|---|---|
| `fetchStablecoins` | none |
| `fetchPerpFunding` | none |
| `fetchPendleMarkets` | none |
| `fetchBridgeFee` | SwapDeskPanel |
| `fetchProtocolIndex` | none |
| `fetchDexVolumes` | none |
| `fetchProtocolFees` | none |
| `fetchGovernanceProposals` | none |
| `fetchDexPairIntel` | none |
| `fetchAddressBalances` | SwapDeskPanel |
| `fetchHoneypotCheck` | Swap Desk handoff gate |
| `fetchBitcoinTip` | none |
| `fetchGeckoTerminalPrice` | none |
| `fetchWeather` | none |

**Consequence.** The assessments rank "build Lending World, then Liquidation World" first.
On this commit, the cheapest meaningful gain was not those: it was **surfacing the
unwired capabilities**, which converts already-verified infrastructure into visible
Crypto World capability without new data sources, new keys, or new honesty risk — the
layer already enforces LIVE / CACHED / STALE / NO_DATA with a provenance record per
observation.

---

## 4A. Priority 1 outcome — what was surfaced, and what remains orphaned

Delivered in `src/worlds/CryptoLiveSurfaces.tsx`, mounted in `src/worlds/CryptoWorld.tsx`.

**Surfaced (7 panels, no new APIs, no new keys, no execution):**

| Panel | Calls | Source chain |
|---|---|---|
| Stablecoins | `fetchStablecoins()` | DefiLlama Stablecoins |
| Perp funding | `fetchPerpFunding()` | Hyperliquid |
| Yield-trading markets | `fetchPendleMarkets(chainId)` | Pendle (Ethereum / Base) |
| Protocol index | `fetchProtocolIndex()` | DefiLlama Protocols |
| DEX volumes | `fetchDexVolumes()` | DefiLlama DEX Overview |
| Protocol fees | `fetchProtocolFees()` | DefiLlama Fees Overview |
| Governance proposals | `fetchGovernanceProposals()` | Snapshot GraphQL |

**Still orphaned — four, each needing a placement decision rather than a panel:**

| Capability | Why it was not surfaced |
|---|---|
| `fetchDexPairIntel()` | Needs a token address as input — belongs on a per-token surface |
| `fetchGeckoTerminalPrice()` | Same — per-token input |
| `fetchBitcoinTip()` | A chain-state read, not a Crypto World market surface |
| `fetchWeather()` | Belongs to the Globe, not Crypto World |

**Verification status:** `npx tsc --noEmit` clean, `npm run build` green (1680 modules),
and `node scripts/route-smoke-test.mjs` 78/78 at commit `345e46b`. The mount fix at
`371d0b2` (the v252 push omitted `CryptoWorld.tsx`) has **not** been re-verified in a
clone as of this correction.

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
6. **No invented canonical identifiers.** The frozen source is the authority:
   `js/data/encyclopedia-canonical-60.js` → `scripts/generate-encyclopedia-data.mjs` →
   `src/encyclopedia-data.ts`. A generated copy is derived, never authoritative.

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
| 1 | Surface the unwired capabilities as Crypto World panels | Done — v252/`345e46b`, 7 panels | No |
| 2 | Lifecycle map bound to real `major-*` ids | Structural backbone for every later vertical | No |
| 3 | Vertical depth in the workspace detail view | Lending, Borrowing, Staking/Restaking, Derivatives, Yield Trading, Vaults, RWA, BTCFi, Oracles, Cross-chain | No |
| 4 | Flash Loans + Liquidations workspace rows | Both are absent from the 56 registry entirely, though `major-liquidations` and `major-atomic-flash-credit` exist canonically | Registry edit |
| 5 | Dependency + failure-cascade intelligence | Requires a protocol edge model that does not exist | No |
| 6 | Tokenomics, Treasury, MEV, Protocol Intelligence surfaces | All four read zero references today | No |
| 7 | STAR branches for the above | Keeps the local brain consistent with new surfaces | No |

---

## 7A. Lifecycle Intelligence — STATUS: HOLD

```text
Status:   HOLD — not pushed, not approved for push
Reason:   Full Canonical 60 workspace validation incomplete
```

**Validation results:**

| Check | Result |
|---|---|
| Cost kinds referenced by the stage bindings | ✅ 0 mismatches against `COST_KINDS` |
| Risk dimensions referenced by the stage bindings | ✅ 0 mismatches against `RISK_DIMENSIONS` |
| Workspace → Canonical 60 mapping | ⚠️ incomplete — authoritative tail unread |
| Stage bindings | ⚠️ blocked on the above |

**Known rejected identifier — caught before push:**

```text
PROTOCOL_INTELLIGENCE_CENTER
```

This string was written into the proposed workspace mapping and does **not** exist in the
authoritative Canonical 60 source. It was caught by validation and rejected. No guessed,
borrowed or aliased identifier replaced it; the affected workspace is to be recorded as
unmapped instead.

**Authoritative workspace values confirmed readable so far:**

```text
WALLET_ASSET_CENTER      TRADING_TERMINAL         SWAP_LAB
ARBITRAGE_CENTER         LIQUIDITY_LAB            FARMING_YIELD_LAB
STAKING_RESTAKING_CENTER LENDING_STRUCTURED_CREDIT VAULT_AUTOMATION_LAB
CROSS_CHAIN_CENTER       NETWORK_NODE_VALIDATOR_CENTER
DERIVATIVES_SYNTHETICS_CENTER
```

**Blocked on:** the remaining workspace values for all 60 majors. Both
`src/encyclopedia-data.ts` and `js/data/encyclopedia-canonical-60.js` truncate on read
through the available tooling, and repository code search returns no results for this
path. A local clone resolves it in one command:

```bash
grep -o '"workspace": "[A-Z_]*"' src/encyclopedia-data.ts | sort -u
```

**Design constraint carried forward:** the lifecycle must render three outcomes honestly —
Mapped, Unmapped, Multi-mapped — and must never fabricate a canonical home (see §1A).

---

## 8. Open questions for the owner

1. Does `docs/FUTURE-WORK.md`'s build gate still stand for Crypto World items, or is it
   superseded by later direction?
2. Should the remaining four orphaned capabilities be surfaced, or are some deliberately
   unwired?
3. Two RWA workspaces, one pool registry and one vault registry exist — is the intended
   shape one RWA workspace with a pool/vault split inside it?
4. Is the Crypto World content set still the canonical 24 only, or does the Phase 2
   structure list stand alongside it?
5. Should `NO CANONICAL MAJOR ACTIVITY MAPPED` workspaces be listed explicitly on the
   workspaces index, so the distinction in §1A is visible to the reader?

---

*End of audit. Every claim above is sourced to a file on `development` at the commit named
beside it. The docs-only correction of 2026-11-28 added §1A, §1B, §4A and §7A and updated
the taxonomy counts in §3.*
