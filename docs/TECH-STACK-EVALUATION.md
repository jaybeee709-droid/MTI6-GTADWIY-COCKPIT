# Tech Stack Evaluation: MTI6 World-Based OS Foundation

## 1. Objective
Evaluate the free, open-source React + Vite + TypeScript + Tailwind CSS foundation for MTI6-GTADWIY-COCKPIT while preserving compatibility with the existing vanilla ES2015+ local-first PWA baseline and static Netlify hosting.

## 2. Recommended Free Foundation Stack
- React: Component model for isolated World modules, persistent OS shell, and deterministic state updates.
- Vite: Fast zero-cost dev server and static bundle output compatible with static hosting and Service Worker caching.
- TypeScript: Strict typing for World manifests, telemetry payloads, and design tokens in src/tokens.ts.
- Tailwind CSS: Utility-first styling mapped directly to the MTI6 color palette (#050505, #101010, #151515, #202020, #00B7FF, #0080FF, #8B5CFF, #FF3B30, #32D74B, #FFFFFF, #B8B8B8) with zero runtime CSS overhead.

## 3. World-Based OS Architecture Fit
- Modular World Registry: Each World registers metadata, accent token, and lazy-loaded entry point.
- Local-First Data Layer: Retains IndexedDB and Service Worker offline support with typed wrappers.
- Zero Paid Dependencies: 100% MIT/Apache-2.0 open-source toolchain with no proprietary SaaS lock-in.

## 4. Migration & Coexistence Notes
- Existing vanilla JS/CSS modules remain intact on the development branch during incremental foundation setup.
- Design tokens in src/tokens.ts serve as the single source of truth across both documentation and UI components.
