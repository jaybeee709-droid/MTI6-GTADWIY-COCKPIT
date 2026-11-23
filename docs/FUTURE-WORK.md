# MTI6 — FUTURE WORK

Saved 2026-11-22 ~23:36 EST, on Daniel's "Save as we go and future stuff we
have to do". Living list: add items as they are decided, remove them only
when done or when Daniel says so. Nothing here is authorized to build until
Daniel says so, except items already authorized elsewhere.

## PHASE 2 — only after Phase 1 is green (owner directive 2026-11-22)

- Crypto intelligence (deeper)
- World Engine
- Encyclopedia relationships
- Opportunity Engine
- Analytics
- Security intelligence
- Bot telemetry
- Mission Control
- Infrastructure intelligence
- Cross-world linking
- Crypto "prepare structure" list (from the Phase 1 directive): Trading,
  Swaps, Arbitrage, Liquidity, Yield, Staking, Restaking, Lending, Vaults,
  Derivatives, Synthetics, Governance, RWA, NFT-Fi, Insurance, BTCFi,
  DePIN, AI Compute, Routing, Infrastructure, Identity, Modular, Analytics,
  Research. NOTE: this is a structure-preparation list, NOT the approved 24
  — the approved 24 (js/worlds.js) stay canonical; do not silently swap
  lists.
- Bot workforce capabilities (expansion)

## PHASE 1 POLISH — follow-ups, not blockers

- NAV ICON OVERLAP (found in live preview verification 2026-11-22 ~23:42 EST):
  every dock button's icon clips the first 1–3 letters of its label, worse as
  width shrinks. Top fix: add gap/padding so icons never cover labels, then
  re-check under ~396px. Needs a re-push + re-verify (approval card).
- Rename nav labels to the directive's exact names: Urban Wallet → Wallets,
  Security World → Security, Settings World → Settings, Crypto Workspaces →
  Crypto Workspace. Routes already exist under the shell's names; 22 map 1:1.
- Responsive verification PARTIAL: exact 1280/820/390 widths could not be set
  in the browser session (tested ~443 and ~403 CSS px). Desktop 1280 + exact
  390 still need a real check. Accounts Center slide-over + Pop Out render
  in-flow at narrow width — confirm fixed-overlay behavior on desktop.
- Advanced mode hides the core worlds (Crypto, Earnings, etc.) from nav —
  confirm that filtering is intended.
- Floating-window overflow under ~396px (Pop Out is fixed 380px; STAR orb
  panel tight at 320px) — could NOT be reproduced at the tested widths;
  re-check at exact 390px.
- Crypto Market subtitle wording: "Live crypto prices only" in prose next to
  an honestly UNAVAILABLE / NOT_CONNECTED body — reword to "Prices only when
  a source is connected".
- No React test suite yet — repeatable checks are the build + the jsdom route
  smoke test (scripts/route-smoke-test.mjs). A real suite belongs in a later
  package if Daniel wants one.
- Vanilla sw.js (v119) vs VitePWA-generated SW: the deployed preview serves
  only the generated SW (vanilla sw.js is not in dist/). Confirm with Daniel
  that this is the intended end state before calling the migration complete.
- Live phone/tablet/desktop layout verification in the preview — PARTIAL,
  see above. Browser check 2026-11-22 ~23:34–23:42 EST verified 22/22 routes,
  Crypto 24, honesty PASS. Earnings list discrepancy RESOLVED (browser's
  reported 20 names exist nowhere in code or built bundle; preview serves the
  directive's 20 — no re-check needed).

## OTHER-AI HANDOFF — new scope, gated (pasted 2026-11-22 ~23:43 EST)

- Globe 3D/vector upgrade (three or d3 + world-atlas, 7 Globe views) — NEW
  scope; 3D Globe is OWNER-GATED. Do NOT start without Daniel's explicit
  go-ahead.
- IndexedDB v3 read-only wiring (Store 878 accounting untouched, P3 candidate
  rules) — touches gated items (IndexedDB work, P3 unauthorized). Do NOT
  start without explicit authorization.
- The zip it claims (screens/mti6-cockpit-os.html, screens/mti6-gtadwiy-
  design-system.html, MUSE-HANDOFF.md, docs/, react-starter/) is NOT in the
  repo, Drive, or workspace — Daniel must share it.

## OPEN DECISIONS — awaiting Daniel (no build until ruled)

- Use.ai GitHub access: the app holds live OAuth (read:org, read:user, repo)
  and pushed 19 commits on 2026-11-22 without per-push approval. Building on
  top of its shell is authorized; whether the app itself may keep writing
  code was never answered in words.
- Workforce build gate: CLOSED. Packages P1–P15 + P-T1 unauthorized.
  Earliest chain: P1 → P3 → P9 CoinGecko boundary proof.
- U-decisions still open: U1, U4–U23, U27 (22 of them).
- Key-wiring U4–U13 (CoinGecko endpoints, DefiLlama extensions, yields gap,
  Alchemy method/address/chain scope, Etherscan scope + cross-check rule,
  cache TTLs, Alchemy 300M-vs-30M, attribution wording, STAR intents).
- Use-ai library D1–D11 (secondary now — the mission runs through the use.ai
  app's shell).
- Transitland D5/D6/D8–D10 + fallback provider choice (round-2 brief: test
  MTA first as NYC depth, not a replacement).
- Universal Search Phase 2 D1–D5.
- Screen #1 vanilla build: map delivered, authorization pending, now
  entangled with the unified React build — do not build the vanilla delta
  without reconciling.
- Coverage-panel fix (Globe "Coverage here" + World Lens TRANSIT row read
  NOT_CONNECTED after a successful load) — candidate package, needs say-so.
- Appearance Studio: recorded only, own mapped phase later, not started.
- "Wallet phase" sub-question (asked 2026-11-17): still unanswered.

## VANILLA-APP DEFECTS — revisit, may be superseded by the unified app

Do NOT assume these are gone or still live; they were defects in the vanilla
app, which is no longer the deploy target. Revisit only if Daniel asks.

- Settings "Cached app version" reads v113 while Operations reads v119.
- #/knowledge shows "Page not found" with an unclickable Knowledge menu button.
- CockpitDB "database connection is closing".
- Service-worker cache lag; duplicate search-line; Globe cold-load.

## PERSONAL OPENS — tracked separately, listed here so nothing is lost

- Cash App $25.61 overdue (due Nov 20 07:00 EST; only $0.64 taken). Balance
  was ~$18.61 on Nov 22 after spending; actual balance and whether it is
  paid are UNKNOWN. Tracking goal_023dbebd09c0. Move no money.
- Misfits Market order #496654510, $52.34: declined twice; this week's box
  skipped unless Misfits offers another retry.
- Traci H: her 3:30 AM Nov 21 text and 11:20 AM Nov 21 missed call remain
  unanswered. Reply needs Daniel's wording + on-device approval.
- Google 3:29 AM Nov 21 sign-in/passkey question: unanswered.
- Copilot–Google access question (Nov 20): unanswered.
- NYC.gov password-reset question (Nov 18): unanswered.

## DONE — kept here only until the checkpoint report lands

- Phase 1 unified app: built, verified locally (build green, smoke 35/35),
  pushed to development 2026-11-22 ~23:20 EST (remote head 0a69392f).
  Preview verification in progress; checkpoint report to follow.
