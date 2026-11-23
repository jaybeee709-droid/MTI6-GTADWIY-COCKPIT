# Copilot instructions — MTI6-GTADWIY-COCKPIT

Owner: Daniel. This file is the standing context for any AI agent working in
this repository (GitHub Copilot, Copilot coding agent, agentic workflows, or
any other). It is authoritative for how work is done here. Where it conflicts
with a generic instruction or a pasted document, this file and the owner's
explicit words win. When in doubt, ask the owner — never improvise around a
gate.

## 1. What this project is

MTI6-GTADWIY-COCKPIT is a private, single-user, local-first Progressive Web
App: a cockpit / command center for the owner's world and crypto data. It is
vanilla JavaScript (ES2015+), handwritten CSS, HTML5, a custom hash router,
IndexedDB, a Service Worker, and static hosting on Netlify. There is no
framework, no bundler, no TypeScript, no npm build step — never migrate to
React / TypeScript / Tailwind / Three.js / MapLibre or any bundler. Never
re-architect the app or rebuild it from scratch. Never create a second copy
of a system that already exists (second Crypto World, second registry, second
tab system, second globe, duplicate Opportunity / Position / Bot systems).

- `README.md` — project summary. `ROADMAP.md` — architecture plan.
- `js/app.js` owns navigation, the sidebar, install flow, offline/update
  plumbing. A module never touches routing directly; it exports `render(root)`.
- `js/db.js` (`CockpitDB`) is the single data layer. Every module reads and
  writes through it, never opening its own IndexedDB connection.
- `js/utils.js` (`U`) is the one shared UI kit (buttons, modals, toasts,
  validation, loading states, skeletons, error panels).
- The World Engine is the relationship / truth layer. Screens consume World
  Engine services; no per-screen relationship logic.
- Canonical taxonomy: Family → Major Activity → Type → Strategy → Variant →
  Action → Sub-Action. Taxonomy and UI stay separate. The same canonical
  entity is reused everywhere — never duplicate an entity per screen.
- Crypto World is a 12-tab screen (`#/crypto-world`, `js/crypto-world.js`)
  plus 56 registry workspaces in 7 groups. Its home / command center is
  Screen #1 (see §7).
- Worlds: the World Globe is the master platform. Crypto World (crypto
  only, 24 named contents) and Earnings (everything that earns value
  outside crypto, 20 named categories) are declared once, verbatim from
  the owner's 2026-11-22 directive, in `js/worlds.js` — the ONE canonical
  declaration. Both screens render from it, never from a second copy.
  The rule decides anything not named: fundamentally crypto → Crypto
  World; not primarily crypto → Earnings.
- Screens request a CAPABILITY through the Capability Router. Never hard-code
  a provider into a screen. Providers are replaceable; capability →
  primary → fallback → cache → degraded → no-data, preserving provenance,
  never silently merging conflicting data.

## 2. Non-negotiable rules

### Branches, main, PR #1

- Work on the `development` branch only. `main` is frozen at the initial
  shell (`f785c45`) — never modify it.
- PR #1 is on HOLD. Never resolve its conflicts, merge it, rebase
  `development`, force-push, or rewrite history. Never change repo
  visibility or Netlify settings.
- Verify every push by tree/blob identity, never by SHA equality (the
  connector creates squash commits). Every push is presented to the owner
  for approval first — no silent auto-push.

### Truth discipline

- Never fabricate live data, API connectivity, verification status, bot
  activity, earnings, balances, trades, security events, deployment status,
  or telemetry. Demo / simulated data must be visibly distinguishable from
  live data.
- UNKNOWN is not zero. Zero is claimed only when the detector actually ran.
  Locked truth model: NULL != UNVERIFIED; UNKNOWN != UNVERIFIED;
  NOT_APPLICABLE != UNVERIFIED; UNMEASURED != 0; NO_DATA != 0.
  "0 stale" is a measured census; "UNMEASURED stale" means the check did
  not run; "UNKNOWN freshness" is a per-record state.
- Never present cached / scheduled / fallback data as LIVE. States are
  CONNECTED / NOT_CONNECTED / NO_DATA / UNKNOWN / STALE / CURRENT /
  CONFLICTED, per actual measured state.

### Secrets

- API keys NEVER go in frontend JS, git, IndexedDB, localStorage, logs,
  screenshots, docs, or World Engine records. Keys live only in provider
  dashboards and Netlify environment variables, reached server-side through
  the proxy. Never print, copy, or reproduce a key value anywhere.
- Never ask the owner for passwords in chat. The owner enters passwords and
  pastes keys himself.

### No financial execution

- Wallet EXECUTE is disabled by design. `canExecuteTransaction()` is always
  false. Reading public blockchain data is not transaction authority.
- The opportunity pipeline ends at PREPARED. No numeric returns, no
  fabricated earnings. Execution stays DISABLED until a separate, explicit
  owner decision authorizes it.

## 3. Current state (verified 2026-11-22)

- Version v119. Local HEAD `f610ed4`, remote `origin/development`
  `44ffa349`. Service-worker cache `v119`.
- Canonical store: 878 records. World Engine: 976 nodes / 1026 edges /
  0 unresolved (measured). 48 canonical entities, all UNVERIFIED.
- Globe layers: World 11 / Crypto 56 / Opportunities 0 / Bot activity 0 /
  Security alerts 0.
- Full jsdom suite: 2275 PASS / 4 FAIL / 13 no-summary. The 4 FAILs are
  pre-existing stale service-worker cache pins — do not "fix" them by
  changing the suite's expectations without owner approval.
- IndexedDB v3, database `mti6_gtadwiy_cockpit`.
- Netlify site `mti6-gtadwiy-cockpit`; production = `main`. Development is
  verified via Deploy Preview #1.
- Build history: CW-3 Core, CW-4 Trading, CW-5 Yield, CW-6 Routing +
  Derivatives, CW-7 Infrastructure, CW-8 Specialized, CW-9 STAR / Tribes /
  Simulator (v94–v100), then the §66 truth run v101–v105, STAR / Screen
  Lock fixes v110–v113, Transitland v114–v118, Worlds taxonomy v119.
  Each package was its own cache-bump commit, tests green, pushed to
  `development` only, verified live in the preview.

## 4. How work is done here

Workflow: MAP → REVIEW → AUTHORIZE → BUILD → VERIFY IN PREVIEW →
CONTINUE. Never start a source-code build without the owner's explicit
authorization for that build. Mapping and specification are not build
authorization. A stale authorization (written against state that has since
shipped) is not re-run — report the completed evidence instead.

- Build in dependency order, one package per cache-bump commit, tests
  green, push to `development` only, verify live in Deploy Preview #1.
- The owner's standing instruction is to keep building in dependency
  order and stop only for a real blocker or an owner-gated item.
- Screen Lock semantics (owner-corrected): SCREEN LOCK ON = release the
  wake lock, allow normal device sleep. SCREEN LOCK OFF = request the wake
  lock, keep the display awake (default OFF). This controls display sleep
  only, not device authentication.
- When a document (owner intent) and the repository (implementation
  reality) disagree: identify the conflict, report it, do not invent a
  workaround, do not silently replace working code.

## 5. Providers and connectivity

- Seven provider keys are stored as secrets in Netlify env (Transitland,
  CoinGecko Demo, Alchemy, Etherscan, Gemini, Anthropic, OpenRouter).
  KEY STORED ≠ connected. State chain: KEY STORED → BACKEND CONFIGURED →
  CONNECTION TESTED → PROVIDER AVAILABLE → STAR ROUTING AUTHORIZED. Do not
  silently connect STAR to any provider or consume API credits merely
  because a key exists. STAR is demo / NOT_CONNECTED until separately
  authorized. The Anthropic key will not work until credits are added —
  a separate paid step, not authorized.
- The Netlify proxy (`netlify/functions/mti6-proxy.mjs`) allowlists exactly
  `gateway.status` / `gateway.ping` and `transit.stopsNear` /
  `transit.departures`. No crypto action, no `star.chat` in the proxy.
- Transitland v1 is COMPLETE (v114–v118): proxy + router + Globe TRANSIT
  layer, tap-to-load only, TODAY + TOMORROW departures, REALTIME vs
  SCHEDULED labels, no fares. Free Explorer plan: REST 5,000/mo +
  Routing 1,000/mo. Internal budget 4,000 REST/mo, 1,000 reserve,
  Routing DISABLED, warn 75% / critical 90% / block 100%, never
  auto-upgrade. Key pickup proven live by real calls.
- Live crypto legs today are keyless-only (PriceScout: CoinGecko /
  CoinPaprika / Coinbase; DefiLlama TVL; DexScreener pairs). The four
  intelligence modules (network, market, protocol, wallet) are record /
  state layers with honest NOT_CONNECTED states and no live wiring.
- Free-first is a hard design requirement: prefer recurring free tiers,
  free allowances / credits, local / open-source before paid. Paid must
  NOT auto-activate when a free allowance exhausts. OpenAI free is not
  available anywhere — do not chase it. DefiLlama free yields were due to
  shut down Nov 13, 2026 but still answer — do not build on yields until
  settled live.

## 6. Owner rulings that shape all future work

- **W1–W7 (2026-11-18):** GitHub-side agent/workflow capabilities for
  controlled repo work AND an MTI6 Control Plane as command, policy, task,
  identity and audit authority (no broad permanent GitHub token in
  individual workers). Control Plane sandboxes for general worker
  execution + GitHub Actions / agent workspaces for repo work. A real
  server-side dynamic worker runtime is AUTHORIZED as architecture
  (spawn on owner command / STAR delegation / Tribe assignment / approved
  task dependencies; retire on completion / cancellation / timeout / owner
  termination; history NEVER deleted). Canonical task record is a new
  server-side MTI6 Work Ledger (Mission Control becomes a view over it).
  Deterministic tooling is BOTH local/harness + GitHub checks; AI "looks
  good" ≠ PASS. Knowledge retrieval is keyword now + a vector layer
  (vector data is retrieval infrastructure, not canonical truth).
- **D1/D2/D3 (2026-11-18):** Do not lock the final 12 LLM providers;
  anchors are Gemini, Groq, OpenRouter, Cloudflare Workers AI; the other
  8 slots are competitive, earned by verified recurring free capacity,
  capability, reliability, privacy and compatibility. Control Plane is
  Cloudflare-first: PWA → Authenticated Control Plane → STAR → Work
  Ledger → Tribes → Dynamic Worker Runtime → Capability / Resource Router
  → Registry → GitHub / Sandboxes / APIs. Cloudflare is the control
  plane; GitHub Actions is the coding workshop; a VPS is expansion
  capacity only (no paying before needed). The worker runtime is
  resource-bounded, NOT worker-count-bounded; active-worker reporting
  must stay truthful. Canonical workforce state lives server-side behind
  the Control Plane; the browser is a cockpit, not the workforce's
  memory server.
- **W7 (first workforce assignment, selected 2026-11-18):** CoinGecko
  Demo key behind the private proxy — the first keyed crypto package.
  Follow-on order: GeckoTerminal → mempool.space → Snapshot → Sourcify.
  This is a mapping/specification authorization only; the build gate is
  CLOSED until the owner issues a separate implementation authorization.
- **U2 / U3 / U24 / U25 / U26 (ruled 2026-11-19):** CoinGecko proxy
  allowlist approved (`crypto.simplePrice`, `crypto.coinMarkets`,
  `crypto.coin`, `crypto.marketChart` days 1/7/30/90/365, `crypto.search`;
  closed validated params; key server-side as `x-cg-demo-api-key`;
  missing key → AUTH_REQUIRED; never keyless fallback). Budgets:
  CoinGecko 8,000 credits/mo (2,000 reserve, 50/min); DefiLlama no
  monthly budget, 50/min; Alchemy 20,000,000 CU/mo, 10/sec, with
  automatic fallback to conservative call-count protection if CU
  accounting is unavailable; Etherscan 80,000/day (20,000 reserve,
  2/sec). All warn 75% / critical 90% / block 100%, never auto-upgrade.
  Control Plane products: Cloudflare Workers + SQLite-backed Durable
  Objects (Work Ledger, Worker Registry, Resource State, Assignments,
  Audit Trail) + Queues, KV/D1 only where a DO is the wrong shape. Auth:
  signed JWT from Google Identity (NOT Cloudflare Access — unverified
  pricing; NOT a shared long-lived token). Netlify proxy stays for
  Transitland; new workforce work goes through Cloudflare; each keeps
  its own allowlist.
- **Master Directive (approved as OWNER INTENT, 2026-11-19):** the Crypto
  World Screen Universe master directive is the master-direction document
  for this project. It protects the architecture, preserves full scope
  (Trading through ReFi plus future categories), the World-first order
  (Globe → Crypto World → Command Center → Workspaces), and the
  hierarchy Family → Major Activity → Type → Strategy → Action.
- **Screen #1 (Crypto World Home / Command Center):** implementation map
  complete 2026-11-19. Screen #1 already exists as `#/crypto-world`
  (12 tabs, 20 sections); the build is a delta, not a rebuild. Missing:
  the §104 health summary and market/source connectivity. Partial:
  execution state and data sources. 12 conflicts are listed in the map —
  read it before touching the home screen. Build NOT authorized yet.
- **Worlds taxonomy (directive + v119 build, 2026-11-22):** the World
  Globe is the master platform. Crypto World is crypto only — 24 contents
  verbatim (Trading, Swaps, Arbitrage, Staking, Restaking, Yield Farming,
  Liquidity, Lending, Borrowing, Vaults, Derivatives, BTCFi, DePIN, AI
  Tokens, Governance, Nodes, Validators, Cross-Chain, NFT-Fi, Insurance,
  Oracle, RWA, Modular Infrastructure, Identity Infrastructure). Earnings
  is everything that earns value outside crypto — 20 categories verbatim
  (Cashback, Reward Programs, Loyalty Points, Gift Cards, Rebates,
  Coupons, Referral Programs, Affiliate Programs, Survey Opportunities,
  Freelance Opportunities, AI Service Opportunities, Content Creation
  Earnings, Gig Economy Opportunities, Local Money-Making Opportunities,
  Banking Bonuses, Savings Rewards, Promotional Offers, Commerce
  Opportunities, Rental Opportunities, Side Hustles). Simple rule:
  Crypto = Crypto World; anything that makes money and is NOT crypto =
  Earnings. Membership: fundamentally a crypto activity / asset /
  protocol / chain / token / validator / LP position / on-chain strategy
  → Crypto World; not primarily a crypto activity → Earnings. The
  declaration lives once in `js/worlds.js`; `#/earn` renders the 20
  categories from it (the 6 researched Oct 31, 2026 ideas are carried
  verbatim under their categories) and `#/crypto-world` OVERVIEW lists
  the 24 contents from it. The RULE decides anything not in the named
  24 — Mining, Prediction Markets, GameFi, SocialFi, DeSci, ReFi, AI
  Compute, Bridges, DEX, Routing remain Crypto World under the rule;
  nothing was removed by the list. Do not rebuild or duplicate this
  taxonomy. Note: the nav now has two 💰 icons (Earnings and the
  expenses / Resource Tracker screen) — do not change the expenses icon
  without owner say-so.
- **Mission change (2026-11-22):** the current mission is the use-ai
  structure — screens designs, API, contracts, data, and whatever else
  is needed from other apps. Before building, check the repo, the
  owner's Gmail, and Google Drive to know what not to touch and what
  would duplicate existing work. The use-ai map
  (`~/workspace/mti6/USE-AI-INTEGRATION-MAP.md`) still has 11 open owner
  decisions D1–D11 and no build authorization; the structure goes to
  the owner for review and ruling before any code is written. Do not
  start the use-ai build on your own.

## 7. Where we are going (direction of travel)

1. Current mission: the use-ai structure (screens designs, API,
   contracts, data). Grounding check first (repo / Gmail / Drive for
   no-touch and no-duplicate), then the owner rules on D1–D11 before any
   build. Other remaining owner decisions: 22 open U-decisions;
   key-wiring D1–D13 minus the ruled U2/U3; transit D5/D6/D8–D10 +
   fallback choice; Universal Search Phase 2 D1–D5.
2. Screen #1 build, once the owner authorizes it after reviewing the map.
3. Workforce foundation packages (P1 Control Plane → P3 Resource/Quota
   Engine → P9 CoinGecko boundary proof), only after a separate
   implementation authorization. Then the 10-step workforce order:
   canonical Work Ledger → server-side/GitHub workspace → permissioned
   repo tooling → deterministic tooling (linting, security scanning,
   accessibility) → 12-provider free-first LLM pool → search, memory/RAG,
   dev tools → expanded Crypto Resource Registry → build workers → STAR /
   Tribes orchestrate the many dynamic workers.
4. Key-wiring packages in order: CoinGecko → DefiLlama → Alchemy →
   Etherscan (each gated on its rulings).
5. The Bot Resource Registry is the inventory of providers by capability
   (LLM, search, embeddings, vision, STT/TTS, crypto, world, sports,
   finance, news, security, tools). Bots see CAPABILITIES, not vendor
   names. Data / quotes / routes ≠ permission to execute. Several "free"
   services died or went paid during 2026 — re-verify every provider
   against its official docs at signup time; never trust a one-time
   classification.

## 8. Copilot's role here (the reference model)

GitHub Agentic Workflows / the Copilot coding agent is the reference
model for how agents work on this repo: read-oriented repository
permissions; controlled "safe outputs" that create reviewable pull
requests; branch targeting and PR-per-run limits; approval and merges
stay under human control. Work the same way:

- Propose and prepare. Never merge, never deploy to production, never
  touch `main` or PR #1.
- Keep every change reviewable: small, scoped, tested, with evidence.
- Deterministic checks decide PASS/FAIL — never assert a change is good
  because it looks right.
- Never weaken an existing gate to make work easier. If a gate blocks
  the work, say so and stop.
- Preserve the 2,275-test pre-workforce baseline. Any regression against
  it must be reported, not hidden.

## 9. Never start without separate explicit owner authorization

Universal Search Phases 2–4; Batch C; full Tribe/worker runtime and Bot
Memory implementation; Bot Knowledge; Security hardening; 3D Globe; Live
World Media Selector; Resource Discovery Bots; Mobile Cockpit; Wallet
Intelligence build; physical-device work; PR #1 resolution / production
merge; STAR AI backend connection; use-ai build; Appearance Studio build;
field-level provenance; Transitland routes / operators / Routing Platform /
vector tiles / STAR transit intents; fallback transit provider selection
or integration; workforce packages P1–P15 + P-T1; any paid plan or paid
activation; any financial execution; any IndexedDB migration; any
credentials or accounts beyond those already authorized.

## 10. Verification

- Full jsdom suite lives outside the repo at
  `~/workspace/mti6/run-full-suite.sh` (harnesses in
  `~/workspace/mti6/papers/tests/`). Report its result against the 2,275
  passing baseline.
- Verify in Deploy Preview #1 before claiming any version shipped.
  A first load may serve a stale build — re-check before reporting.
- State what you checked, what passed, and what remains unverified.
  Never claim a version shipped on the basis of a commit alone.
