# Priority 1 — Orphaned live-data capabilities, now surfaced (v252)

Date: 2026-11-28
Branch: `development`
Base commit: `78e893e` (the gap map)
Scope: Priority 1 only, as authorised. No lifecycle engine, no dependency/cascade engine,
no tokenomics, no treasury, no MEV, no protocol-intelligence expansion, no new workspaces.

## What was done

Seven panels were added to Crypto World, each calling a `live-data.ts` function that already
existed and was already governed, but was consumed by no screen.

New file: `src/worlds/CryptoLiveSurfaces.tsx`
Edited: `src/worlds/CryptoWorld.tsx` (one import, one mount point)

## Capabilities surfaced

| Panel | Calls | Source chain | Was rendered by |
|---|---|---|---|
| Stablecoins | `fetchStablecoins()` | DefiLlama Stablecoins | nothing |
| Perp funding | `fetchPerpFunding()` | Hyperliquid | nothing |
| Yield-trading markets | `fetchPendleMarkets(chainId)` | Pendle (Ethereum / Base) | nothing |
| Protocol index | `fetchProtocolIndex()` | DefiLlama Protocols | nothing |
| DEX volumes | `fetchDexVolumes()` | DefiLlama DEX Overview | nothing |
| Protocol fees | `fetchProtocolFees()` | DefiLlama Fees Overview | nothing |
| Governance proposals | `fetchGovernanceProposals()` | Snapshot GraphQL | nothing |

Eight of the fourteen orphans the audit named are now surfaced. Six were deliberately left
alone and are listed below with the reason.

## Deliberately not surfaced in Priority 1

| Capability | Why not |
|---|---|
| `fetchAddressBalances()` | Already consumed — `SwapDeskPanel.tsx` line 121 |
| `fetchBridgeFee()` | Already consumed — `SwapDeskPanel.tsx` line 147 |
| `fetchSwapQuote()` | Already consumed — `SwapDeskPanel.tsx` line 164 |
| `fetchHoneypotCheck()` | Already consumed by the Swap Desk handoff gate |
| `fetchDexPairIntel()` | Needs a token address as input; belongs on a per-token surface, not a Crypto World panel |
| `fetchGeckoTerminalPrice()` | Same — per-token input |
| `fetchBitcoinTip()` | A chain-state read, not a Crypto World market surface |
| `fetchWeather()` | Belongs to the Globe, not Crypto World |

So the true remaining orphan count at the end of Priority 1 is **four** per-token / off-domain
fetchers (`fetchDexPairIntel`, `fetchGeckoTerminalPrice`, `fetchBitcoinTip`, `fetchWeather`),
each of which needs a product decision about where it belongs rather than a panel here.

## Rules honoured

- No new APIs, no new provider keys, no new fetch paths — every call was already exported and
  already governed by the governor (dedupe + TTL).
- Every figure renders through `ProvenanceChip`, so LIVE / CACHED / STALE / NO_DATA is visible
  per figure and tappable to source, status, fetch time and fallback chain.
- NO_DATA renders as an honest empty state. No figure is invented; no unmeasured value shows
  as zero.
- Nothing writes, signs, trades, or moves funds. Every panel is read-only.
- `main` untouched. Work on `development` only.

## Honesty guards written into the panels

Four places where a raw number could read as a claim, and what was written instead:

1. **Stablecoin peg deviation** — labelled as the source's own observation at fetch time, not
   a stability claim, and the amber flag at >=1% is explicitly a display threshold, not a risk
   score.
2. **Perp funding** — labelled as what a position pays or receives to be held; not a return,
   not a recommendation, not a tradeable quote; the panel states it holds no positions.
3. **Pendle implied APY** — a market price, not a promise of yield and not a fixed rate; PT/YT
   instruments are explicitly not priced here.
4. **Protocol fees** — states plainly that a collected fee is not owner income and not a token
   holder return, and makes no claim about who receives it.

## Verification status

`scripts/route-smoke-test.mjs` asserts 22 routes with expected headings. `CryptoWorld.tsx`'s
heading (`CRYPTO INTEL COMMAND`) is unchanged and no route was added, so the route assertions
are unaffected. The panels mount inside the existing Crypto World route, so the
distinct-render check and the fabricated-string denylist both continue to apply to them.

**NOT YET RUN:** `tsc && vite build` and the jsdom route smoke test. The environment used for
this change has no network and no `node_modules`, so neither could execute here. Both must be
run in the clone before this change is treated as verified. Until then this is an unbuilt,
untested commit.

## Remaining orphaned capabilities

Four, all listed in the table above. None is a Crypto World market surface; each needs a
placement decision before it is wired anywhere.
