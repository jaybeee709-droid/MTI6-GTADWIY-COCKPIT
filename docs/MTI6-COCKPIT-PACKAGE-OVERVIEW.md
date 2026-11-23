# MTI6-GTADWIY Cockpit Package Overview

Received from Daniel, 2026-11-22 ~23:52 EST — the other AI's tightened,
"builder-proof" version of the cockpit package spec. Recorded verbatim below.
The ZIP itself (mti6-gtadwiy-cockpit-complete.zip) has NOT been received by
Muse — not in the repo, Drive, or workspace as of 2026-11-22 ~23:52 EST.
Daniel must attach it here or drop it in Drive for Muse to use it.

---

The archive **mti6-gtadwiy-cockpit-complete.zip** contains the complete
MTI6-GTADWIY Cockpit framework, screen architecture, design system, React/Vite
source, and build references required to continue development on the
**development branch only**.

## Core Framework

### Application Shell

**Location**

```text
src/App.tsx
src/tokens.ts
```

Provides the foundational Cockpit OS shell:

- Persistent Top Command Bar
- Universal Search
- Standard / Advanced / All View Modes
- MANUAL / MANUAL+AI / AUTO Execution Strip
- Black-Card Accounts Panel
- Left World Menu
- Floating Window System
- Responsive Phone / Tablet / Desktop Layouts
- STAR Launcher Orb

### STAR Launcher

Position:

```text
Bottom Right
```

States:

```text
#8B5CFF = Idle
#00B7FF = Active / Engaged
```

Requirements:

- Persistent across all screens
- Can open independently of current world
- Supports future multi-bot participation model
- Must remain available from all routes

---

# World Globe & World Engine

**Location**

```text
src/worlds/WorldGlobe.tsx
src/worlds/OtherWorlds.tsx
```

## World Globe

World Globe is the:

```text
Primary Home Screen
Primary Navigation Hub
Primary Intelligence Hub
Master Application Entry Point
```

Supported Globe Views:

```text
1. Command View
2. Realistic Earth View
3. Earnings View
4. Crypto View
5. Opportunities View
6. Asset View
7. Intelligence View
```

Additional Components:

```text
Transitland Departures
Domain Radar System
World Status Monitoring
```

## Domain Radars

```text
Crypto Radar
Earnings Radar
Opportunities Radar
Assets Radar
Intelligence Radar
```

---

## Encyclopedia / World Engine

The World Engine is the platform's canonical knowledge model.

Everything connects through:

```text
Family
 → Major Activity
   → Type
     → Strategy
       → Action
         → Sub-Action
```

Applies to:

```text
Crypto World
Earnings World
Bot Operations
Opportunities
Assets
Accounts
Security
Settings
Encyclopedia
```

Muse should treat the World Engine as the system-of-record relationship graph.

---

# Crypto World

**Location**

```text
src/worlds/CryptoWorld.tsx
```

Crypto World contains only:

```text
Blockchain Activities
Digital Assets
Protocols
Infrastructure
On-Chain Intelligence
```

Explicit Requirements:

```text
EXECUTE DISABLED
READ ONLY
NOT CONNECTED
EXPANSION GATED
```

No financial execution.

No transaction signing.

No wallet control.

No live fund movement.

Until explicitly authorized in future phases.

---

# Earnings World

**Location**

```text
src/worlds/EarningsWorld.tsx
```

Purpose:

```text
All Non-Crypto Income Systems
```

Examples:

```text
Work Opportunities
Business Opportunities
Affiliate Systems
Rewards
Offers
Task Networks
Other Income Streams
```

Separation Rule:

```text
Crypto activities remain in Crypto World.

Non-crypto income activities remain in Earnings World.
```

These two worlds are intentionally separate.

---

# Bot Operations

**Location**

```text
src/worlds/BotOperations.tsx
```

Contains:

```text
STAR
12 Persistent Tribe Avatars
Dynamic Worker Scaling
Command Theater
Bot Operations Hub
```

## Command Theater

Provides:

```text
Live Task Presentation
Bot Activity Visualization
System Monitoring
Workload Routing
```

## Bot Console

10-tab architecture including:

```text
Identity
Role
Tasks
Inputs
Outputs
Dependencies
Performance
Telemetry
History
Controls
```

## Status Colors

```text
Electric Blue = Active
Purple = Assistant
Green = Healthy
Amber = Warning
Red = Critical
```

Important:

```text
Role labels are assignments.

Role labels are not permanent bot identities.
```

---

# Urban Wallet

**Location**

```text
src/worlds/UrbanWallet.tsx
```

Contains:

```text
Cash Views
Black Card Views
Settlement Rail Monitoring
```

Requirements:

```text
Read Only
No Financial Execution
No Live Asset Movement
```

Purpose:

```text
Visibility
Organization
Monitoring
```

Not custody.

Not payments.

Not transfers.

---

# Security World

**Location**

```text
src/worlds/OtherWorlds.tsx
```

Includes:

```text
Permissions
Audit Logs
Bot Limits
Access Policies
System Safeguards
```

Emergency Controls:

```text
#FF3B30
Emergency Kill Switches
```

Purpose:

```text
Security Governance
Permission Management
Operational Protection
```

---

# Settings World

**Location**

```text
src/worlds/OtherWorlds.tsx
```

Includes:

```text
Appearance Studio
Voice
Notifications
Layout Controls
Accessibility
```

## Appearance Studio

Special Rule:

```text
Appearance Studio controls the visual customization system for the entire platform.
```

Not limited to one screen.

Platform-wide scope.

---

# Design References

**Location**

```text
screens/
```

Reference Assets:

```text
screens/mti6-cockpit-os.html
screens/mti6-gtadwiy-design-system.html
```

Purpose:

```text
Visual Reference
Layout Behavior
Interaction Patterns
Styling Guidance
```

These files are reference implementations and should guide UI construction.

---

# Documentation

**Location**

```text
docs/
```

Primary Documents:

```text
MTI6-DESIGN-SYSTEM.md
TECH-STACK-EVALUATION.md
```

Provide:

```text
Design Standards
Component Standards
Architecture Guidance
Technology Decisions
```

---

# Build & Deployment

Includes:

```text
React
Vite
TypeScript
Tailwind
Netlify
```

Build Process:

```bash
npm install
npm run build
```

Output:

```text
dist/
```

Preview:

```text
Netlify Deploy Preview
```

---

# Development Rules

## Branching

```text
Build on DEVELOPMENT branch only.
```

Do Not Modify:

```text
main branch
production branch
production deployment
```

Unless explicitly approved.

---

# Architectural Rules That Must Not Be Altered

```text
World Globe is the Home Screen.

World Engine is the Canonical Knowledge Layer.

Crypto World and Earnings World remain separate.

STAR remains the primary assistant.

12 Tribe architecture is preserved.

Execution remains disabled for financial actions.

Read-only intelligence architecture is preserved.

Permission-first security model is preserved.

Appearance Studio remains platform-wide.

Floating window system remains supported.
```

---

# Build Priority

```text
1. Core Shell Framework
2. Navigation & Routing
3. World Globe
4. World Engine Integration
5. Crypto World
6. Earnings World
7. Bot Operations
8. Urban Wallet
9. Security
10. Settings
11. Encyclopedia Expansion
12. Advanced Automation Phases
```

**Muse Instruction:** Continue development from the existing React + Vite +
TypeScript + Tailwind framework, preserve all architectural constraints above,
work only on the development branch, and leave main/production untouched unless
Daniel explicitly authorizes otherwise.

---

## RECONCILIATION NOTES (Muse, recorded at receipt — not part of the spec)

Conflicts between this spec and the actual Phase 1 app / Daniel's own
directives. Do NOT silently adopt the spec where it conflicts — Daniel decides.

1. EXECUTION STRIP: the spec says "MANUAL / MANUAL+AI / AUTO". The app has
   Read-Only / Paper / Sim / Guarded Auto, and 'Live' was removed per the
   no-financial-execution rule (NOT lifted). MANUAL/AUTO mode names imply
   execution capability. Do not adopt them without Daniel reconciling them
   with the no-execution rule.
2. STAR ORB POSITION: the spec says Bottom Right. The app has the orb
   bottom-LEFT (browser-verified 2026-11-22). Moving it needs Daniel's call.
3. LEFT WORLD MENU: the spec lists a Left World Menu. The app has a top nav
   dock (22-screen dock) — no left menu exists. Is the left menu a future
   addition or a spec error? Needs Daniel's call.
4. WORLD ENGINE HIERARCHY (Family → Major Activity → Type → Strategy →
   Action → Sub-Action): the other AI's model. It has NOT been checked
   against the actual World Engine (vanilla: 976 nodes / 1026 edges). Do not
   treat it as canonical until verified against the real engine.
5. BUILD PRIORITY #4 (World Engine Integration): Daniel's Phase 1 directive
   puts World Engine in Phase 2 — only after Phase 1 is green. Phase 1 stays
   first; the spec's priority does not move World Engine into Phase 1.
6. STAR COLOR STATES (#8B5CFF idle / #00B7FF active): fine as a design spec,
   but current STAR reads "demo / NOT_CONNECTED" — the states apply when STAR
   is live, not now. Do not present them as current states.
7. CONSISTENT (no conflict): Crypto/Earnings separation, read-only + no
   execution, 12 Tribes, Appearance Studio platform-wide, Globe as home,
   STAR as primary assistant, floating windows, development-only, main untouched.
