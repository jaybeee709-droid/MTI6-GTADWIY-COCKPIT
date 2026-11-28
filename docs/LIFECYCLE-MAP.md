# MTI6 Crypto World — Lifecycle Map

Date: 2026-11-28
Branch: `development` (dev only)
Base checkpoint before this work: `a004713943e154ff4dcd1f23804c6e61ccfbb645`
Authoritative source: `src/encyclopedia-data.ts` → `CANONICAL_60` (all 60 majors,
owner-supplied 2026-11-28), derived from `js/data/encyclopedia-canonical-60.js`

---

## 1. What this layer answers

One question, per activity and per workspace:

> **Where am I in the lifecycle of this activity?**

It is a **reading**, not a claim about the owner, his capital, or any position.

---

## 2. What it is NOT

- Not trading automation, not a workflow engine. No runner, no scheduler, no queue.
- Creates no records, writes nothing, fetches nothing, holds no position state.
- Invents no data. A stage is a label with a recorded definition; nothing is
  marked "current" for a user unless a record says so — and no lifecycle-position
  record system exists, so the honest default is a reading of the registry, stated
  as such on screen.
- Touches no execution path. `EXECUTE` is a lifecycle stage for completeness and is
  **permanently disabled**.

---

## 3. The nine stages

| # | Stage | Meaning | Produces | State |
|---|---|---|---|---|
| 1 | `DISCOVER` | An activity, asset, protocol or opportunity is noticed and recorded as noticed. Noticing is not knowing. | A discovery record (UNVERIFIED) or nothing | enabled |
| 2 | `RESEARCH` | The thing is read against its recorded sources: what it is, who records it, what the records do and do not say. | Recorded references and open questions | enabled |
| 3 | `ANALYZE` | Cost kinds and risk dimensions are assessed against evidence. | Cost lines and risk dimensions | enabled |
| 4 | `ALLOCATE` | Capital is designated to the activity — the intent step, before any asset moves. | A recorded allocation intent | enabled |
| 5 | `EXECUTE — DISABLED` | The point at which assets would move. Closed everywhere, by construction. | **NONE** | **DISABLED** |
| 6 | `MONITOR` | The recorded state is watched over time; staleness is surfaced, not hidden. | Provenance observations | enabled |
| 7 | `REBALANCE` | A change to the designated position is considered. Considering is not doing. | A recorded rebalance intent | enabled |
| 8 | `EXIT` | The activity is wound down. | A recorded exit record | enabled |
| 9 | `ARCHIVE / LEARN` | The closed activity is kept as institutional memory. | An archive record, and a lesson when a run failed | enabled |

**Why `EXECUTE` is visible but disabled:** the lifecycle is incomplete without the
stage that would move assets. It renders struck through and disabled, mirroring
`CryptoMarketScreen.tsx`'s rung treatment, so the lifecycle never becomes the first
surface in the app where execution looks available. Reason recorded on the stage:

> EXECUTION DISABLED: EXECUTE appears in no workspace `ladderTop`. Signing is the
> owner's own hand in his own wallet, outside this platform.

---

## 4. Bindings — drawn only from existing canonical data

| Bound to | Source file | How |
|---|---|---|
| 60 Major Activities | `src/encyclopedia-data.ts` → `CANONICAL_60` | `id` referenced, never re-declared |
| 56 Workspaces | `src/crypto-workspaces-data.ts` → `CRYPTO_WORKSPACES` | `id` referenced |
| 28 Families | `ENCYCLOPEDIA_FAMILIES` | `id` referenced |
| 12 Cost kinds | `src/cost-risk-data.ts` → `COST_KINDS` | `kind` strings referenced |
| 19 Risk dimensions | `src/cost-risk-data.ts` → `RISK_DIMENSIONS` | strings referenced |
| Entity Registry | `src/entity-data.ts` → `ENTITY_UNIVERSE` | available to consumers |

Nothing is re-declared. The lifecycle cannot drift from the backbone because it
holds no copy of it.

### Stage assessments

Each stage names which canonical cost kinds and risk dimensions are assessed there:

| Stage | Cost kinds assessed | Risk dimensions assessed |
|---|---|---|
| `DISCOVER` | — | — |
| `RESEARCH` | — | Protocol, Token, Data-source |
| `ANALYZE` | Network gas, Protocol fee, Trading/swap fee, Slippage, Borrow cost, Bridge cost, Performance fee, Exit cost | Market, Volatility, Liquidity, Smart-contract, Oracle, Bridge, Chain/network, Governance, Stablecoin/depeg, Counterparty/custody |
| `ALLOCATE` | — | Liquidation, Approval/allowance |
| `EXECUTE` | Network gas | Transaction/gas |
| `MONITOR` | — | Volatility, Liquidation, Chain/network |
| `REBALANCE` | Trading/swap fee, Slippage, Network gas | Market, Impermanent-loss |
| `EXIT` | Exit cost, Network gas, Slippage | Liquidity, Market |
| `ARCHIVE / LEARN` | — | — |

Validation was done offline against the authoritative lists (40 mapped, 16 honestly
unmapped, 0 mismatches). No runtime guard exists yet — `auditStageAssessments()` is a
designed guard, not built code, and nothing reports mismatches on screen today.

---

## 5. Workspace → Canonical 60 mapping

Sixty Major Activities occupy **twenty** canonical workspace homes.

### 5.1 Validated mappings — 40 registry workspaces

| Registry workspace | Canonical home |
|---|---|
| `home` | `WALLET_ASSET_CENTER` |
| `portfolio` | `WALLET_ASSET_CENTER` |
| `positions` | `WALLET_ASSET_CENTER` |
| `markets-assets` | `TRADING_TERMINAL` |
| `trading` | `TRADING_TERMINAL` |
| `swap` | `SWAP_LAB` |
| `dex-aggregation` | `SWAP_LAB` |
| `cross-chain-routing` | `CROSS_CHAIN_CENTER` |
| `bridge` | `CROSS_CHAIN_CENTER` |
| `arbitrage` | `ARBITRAGE_CENTER` |
| `liquidity` | `LIQUIDITY_LAB` |
| `yield-farming` | `FARMING_YIELD_LAB` |
| `staking` | `STAKING_RESTAKING_CENTER` |
| `liquid-staking` | `STAKING_RESTAKING_CENTER` |
| `restaking` | `STAKING_RESTAKING_CENTER` |
| `lending` | `LENDING_STRUCTURED_CREDIT` |
| `borrowing` | `LENDING_STRUCTURED_CREDIT` |
| `vaults` | `VAULT_AUTOMATION_LAB` |
| `yield-aggregation` | `VAULT_AUTOMATION_LAB` |
| `yield-trading` | `VAULT_AUTOMATION_LAB` |
| `structured-credit` | `RWA_TOKENIZED_ASSETS` |
| `perpetuals` | `DERIVATIVES_SYNTHETICS_CENTER` |
| `futures` | `DERIVATIVES_SYNTHETICS_CENTER` |
| `options` | `DERIVATIVES_SYNTHETICS_CENTER` |
| `synthetics-cdp` | `DERIVATIVES_SYNTHETICS_CENTER` |
| `margin-leverage` | `DERIVATIVES_SYNTHETICS_CENTER` |
| `mining` | `NETWORK_NODE_VALIDATOR_CENTER` |
| `validators` | `NETWORK_NODE_VALIDATOR_CENTER` |
| `nodes` | `NETWORK_NODE_VALIDATOR_CENTER` |
| `rpc-infrastructure` | `NETWORK_NODE_VALIDATOR_CENTER` |
| `depin` | `DEPIN_COMPUTE_CENTER` |
| `btcfi` | `BTCFI_CENTER` |
| `rwa` | `RWA_TOKENIZED_ASSETS` |
| `nftfi` | `NFTFI_CENTER` |
| `prediction` | `PREDICTION_ORACLE_CENTER` |
| `oracle` | `PREDICTION_ORACLE_CENTER` |
| `insurance` | `INSURANCE_RISK_MARKETS` |
| `governance` | `GOVERNANCE_DAO_CENTER` |
| `gauges` | `GOVERNANCE_DAO_CENTER` |
| `payments` | `PAYMENTS_SETTLEMENT_CENTER` |

### 5.2 Unmapped workspaces — 16

These map to **zero** canonical Major Activities, and that is truthful, not a
defect. They are intelligence or operational surfaces *over* activities, not
activities themselves:

```text
globe              networks          protocols         opportunities
intelligence       risk              security          encyclopedia
live-data          bot-ops           cex-intelligence  ai-compute
modular            identity          gamefi            socialfi
```

All 16 render **`NO CANONICAL MAJOR ACTIVITY MAPPED`**. No nearby activity is
borrowed to fill them.

### 5.3 Rejected identifiers

| Identifier | Status |
|---|---|
| `PROTOCOL_INTELLIGENCE_CENTER` | **REJECTED** — invented during design, caught by validation, absent from the mapping table. The string appears in the source only inside a comment recording the rejection. |

### 5.4 Coverage

```text
Canonical majors ...................... 60
Canonical workspace homes ............. 20
Registry workspaces ................... 56
  mapped .............................. 40
  unmapped (honest) ................... 16
Mapping mismatches .................... 0
Values not in the authoritative set ... 0
```

---

## 6. Architecture finding (carried from the gap map §1A)

The **56-Workspace Registry** and the **Canonical 60** are related but distinct
systems:

```text
Canonical 60      = an activity taxonomy — things you do
Workspace Registry = application surfaces — user / intelligence / operational
Relationship      = partial overlap, NOT 1:1
```

Sixty activities resolve to twenty homes; sixteen registry workspaces resolve to
none. Any surface reading lifecycle position must support **Mapped**, **Unmapped**
and **Multi-mapped** honestly, and must never fabricate a canonical home.

---

## 7. Constraints honoured

1. Development branch only; `main` untouched.
2. No trading automation, no wallet execution, no fund movement, no key operations.
3. No fabricated data — UNKNOWN stays UNKNOWN, unmapped stays unmapped.
4. `LIVE` / `CACHED` / `STALE` / `NO_DATA` provenance untouched.
5. No invented canonical identifiers; the frozen source is the authority.
6. No new external source, no new provider key.

---

## 8. Verification status

| Check | Result |
|---|---|
| Cost kinds referenced | ✅ 0 mismatches |
| Risk dimensions referenced | ✅ 0 mismatches |
| Workspace mapping | ✅ 0 mismatches (40 mapped) |
| Invented identifiers in table | ✅ 0 |
| Unmapped workspaces recorded | ✅ 16 |
| `tsc` / build / smoke test | ⏳ **not yet run** — must run in the clone |

The code compiles only if verified in a clone with `node_modules`. Until then this
is an unbuilt artefact.
