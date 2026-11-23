# MTI6-GTADWIY-COCKPIT OWNER DIRECTIVE — PHASE 1 UNIFIED APPLICATION

Received from Daniel, 2026-11-22 ~23:33 EST. Recorded verbatim. This is the
authoritative build direction for the unified application.

## GOAL

Build ONE unified MTI6 application.

Do not maintain parallel systems.

The React architecture may become the foundation, but MTI6's vision, structure,
design language, worlds, STAR, Tribes, and command-center identity remain
canonical and must be preserved.

DO NOT MERGE TO MAIN.

Development only.

## CURRENT STATE

Vanilla v119 currently contains 22 screens:

- Cockpit Status
- Knowledge
- Mission Control Tasks
- Mission Control Projects
- Resource Tracker
- World Globe
- Crypto Market
- Crypto World
- Bot Operations
- Bot Profile
- Crypto Workspace
- Wallets
- Opportunities
- Earnings
- Positions & Assets
- Encyclopedia
- Operations
- Accounts & Finance
- Web – Bot Work
- Data Analytics
- Security & Bot Style
- Settings

React shell currently contains:

- World Globe
- Crypto World
- Earnings World
- Bot Operations
- Urban Wallet
- Opportunities
- Positions & Assets
- Encyclopedia
- Security World
- Settings World

React shell also contains:

- Standard Mode
- Advanced Mode
- All Mode
- Execution Mode strip
- STAR Orb
- Floating Windows
- Accounts Slide-over

## TARGET STATE

ONE APPLICATION

ONE NAVIGATION SYSTEM

ONE SOURCE OF TRUTH

MANY WORKSPACES

NO DUPLICATE SYSTEMS

NO SPLIT APP EXPERIENCE

## REQUIRED WORKSPACES

The unified React MTI6 must contain:

1. World Globe (Primary Home)
2. Crypto World
3. Earnings World
4. Bot Operations
5. Cockpit Status
6. Knowledge
7. Mission Control Tasks
8. Mission Control Projects
9. Resource Tracker
10. Crypto Market
11. Bot Profile
12. Crypto Workspace
13. Wallets
14. Opportunities
15. Positions & Assets
16. Encyclopedia
17. Operations
18. Accounts & Finance
19. Web – Bot Work
20. Data Analytics
21. Security
22. Settings

All routes must exist.

All workspaces must mount.

No dead navigation.

No placeholder routes unless clearly marked.

## WORLD GLOBE REQUIREMENTS

World Globe remains the master entry point.

World Globe remains the home page.

World Globe must support future layers and overlays.

World Globe remains the central navigation hub for the MTI6 ecosystem.

## STAR REQUIREMENTS

STAR remains the primary assistant.

STAR must be globally accessible.

STAR launcher remains persistent.

STAR can eventually open screens, assets, encyclopedia entries, and bot
workspaces through floating windows.

## TRIBES REQUIREMENTS

Preserve all 12 Tribe principals.

Do not reduce the Tribe system.

Complete all missing Tribe profiles.

Support future worker spawning architecture.

Support future assignment and telemetry architecture.

## CRYPTO WORLD REQUIREMENTS

Restore the approved 24 Crypto World contents.

Crypto World becomes the master crypto intelligence workspace.

Preserve workspace expansion capability.

Prepare structure for:

- Trading
- Swaps
- Arbitrage
- Liquidity
- Yield
- Staking
- Restaking
- Lending
- Vaults
- Derivatives
- Synthetics
- Governance
- RWA
- NFT-Fi
- Insurance
- BTCFi
- DePIN
- AI Compute
- Routing
- Infrastructure
- Identity
- Modular
- Analytics
- Research

Do not remove existing approved structures.

## EARNINGS WORLD REQUIREMENTS

Restore approved 20 Earnings categories.

Preserve existing researched ideas.

Preserve expansion capability.

Support future earnings intelligence and opportunity discovery layers.

## DESIGN REQUIREMENTS

Preserve MTI6 identity.

Preserve command-center appearance.

Preserve electric-blue theme language.

Preserve cockpit feel.

Preserve floating windows.

Preserve command-deck experience.

DO NOT convert MTI6 into a generic SaaS dashboard.

The upgraded application must feel MORE like MTI6, not less.

## BUILD REQUIREMENTS

Fix mount failures.

Fix routing issues.

Fix build failures.

Fix startup issues.

Verify navigation.

Verify responsive layouts.

Verify desktop.

Verify tablet.

Verify mobile.

Build must be green.

## DELIVERABLES REQUIRED

When reporting status, provide:

- Branch name
- Commit hash
- Build status
- Test status
- Screens migrated count
- Screens remaining count
- Routes verified count
- Outstanding blockers
- Deploy Preview URL

## PHASE 2

ONLY AFTER PHASE 1 IS GREEN:

Expand:

- Crypto intelligence
- World Engine
- Encyclopedia relationships
- Opportunity Engine
- Analytics
- Security intelligence
- Bot telemetry
- Mission Control
- Infrastructure intelligence
- Cross-world linking

DO NOT MERGE TO MAIN.

COMPLETE PHASE 1 FIRST.

---

## NOTES (Muse, recorded at receipt — not part of the directive)

- The directive's "prepare structure for" list (24 items) is NOT the approved
  24 Crypto World contents from the 2026-11-22 Worlds taxonomy (js/worlds.js).
  It adds Synthetics, AI Compute, Routing, Infrastructure, Identity, Modular,
  Analytics, Research, Yield, Liquidity and drops Borrowing, AI Tokens, Nodes,
  Validators, Cross-Chain, Oracle, Modular Infrastructure, Identity
  Infrastructure (Yield Farming → Yield). The directive itself says "Restore
  the approved 24" and "Do not remove existing approved structures", so the
  approved 24 stay canonical; the new list is recorded as the Phase 2
  structure-preparation target, not a replacement. Do not silently swap lists.
- Name mapping (shell names vs directive names): Urban Wallet = Wallets,
  Security World = Security, Settings World = Settings, Crypto Workspaces =
  Crypto Workspace. Routes exist under the shell's names; the 22 map 1:1.
  Renaming nav labels to the directive's exact names is a polish follow-up,
  not a Phase 1 blocker — flag it to Daniel in the checkpoint.
- The directive arrived AFTER the Phase 1 push (remote head 0a69392f,
  approved by Daniel). Phase 1 in the preview is the checkpoint subject;
  the directive's verification requirements (navigation, responsive
  layouts, desktop/tablet/mobile) are being verified in the live preview
  now. Phase 2 starts only after Phase 1 is green — per the directive.
