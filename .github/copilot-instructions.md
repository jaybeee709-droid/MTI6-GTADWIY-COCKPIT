# Copilot Instructions - MTI6-GTADWIY-COCKPIT

Owner: Daniel. This file is the authoritative standing context for any AI agent working in this repository.

## 1. Branch Targeting Rule (Strict)
- **Target `development` ONLY.** Never commit, push, open PRs directly into, or modify `main`.
- All feature work, refactors, and configuration updates must happen exclusively on the `development` branch.

## 2. Authorized Tech Stack (Free & AI-Friendly)
The project is authorized to use the following modern, free, AI-friendly stack:
- **Core:** React 18 + Vite + TypeScript
- **Styling & UI:** Tailwind CSS + shadcn/ui + Lucide (`lucide-react`)
- **Data & 3D Visualization:** Recharts (2D charts/telemetry) + Three.js / D3 (3D World Globe & spatial views)
- **State & Persistence:** Zustand + IndexedDB (local-first persistence)
- **Hosting & PWA:** Progressive Web App (`vite-plugin-pwa`) hosted on Netlify

## 3. World-Based OS Architecture
- **Master Home:** The **World Globe** serves as the root spatial hub and master home of the OS.
- **10 Self-Contained Worlds:** Navigation is rooted at the World Globe and branches into 10 self-contained Worlds.
- **Strict Domain Separation:**
  - **Crypto World** is **strictly crypto** (digital assets, chains, wallets, on-chain telemetry).
  - **Earnings** is **strictly non-crypto** (fiat income, revenue streams, dividends, traditional payouts).
  - Never mix crypto data into Earnings or non-crypto earnings into Crypto World.
- **OS Shell Components:**
  - **Top Command Bar:** Universal Search and Accounts button.
  - **View Mode Switcher:** `Standard`, `Advanced`, and `All`.
  - **Execution Mode Strip:** `MANUAL`, `MANUAL+AI`, and `AUTO`.
  - **10-World Navigation:** Rooted at World Globe.
  - **Floating Window Manager:** Multi-window workspace management.
  - **STAR Orb:** Persistent lower-right AI assistant orb.
- **Design System:** Always use the exact MTI6 color tokens defined in `src/tokens.ts` (`MTI6_COLORS`, `MTI6_WORLD_OS`).

## 4. Security & Zero-Secrets Policy
- **Zero Storage of Secrets:** Never store, log, persist, or hardcode private keys, seed phrases, mnemonic phrases, API secrets, or sensitive credentials anywhere in the repository, IndexedDB, `localStorage`, `sessionStorage`, or client state.
- All external integrations must remain read-only or user-authorized at runtime without persisting secret material.
