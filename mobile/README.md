# MTI6 Mobile Cockpit — Build 1

A phone-native interface for the MTI6-GTADWIY-COCKPIT platform, built
with React Native + Expo (TypeScript). It lives entirely under
`mobile/` on the `feature/mobile-cockpit` branch and changes **no**
existing file: the web/desktop cockpit (the vanilla JS PWA at the repo
root) is preserved byte-identical.

## How it relates to the web cockpit

Both are interfaces into the same canonical MTI6 platform — the same
World Engine / Encyclopedia taxonomy / Crypto World / STAR + Tribes
architecture. The mobile shell deliberately does **not** duplicate or
redefine any canonical data: no taxonomy or entity records are copied
in. Where a future build needs platform data, it will connect to the
canonical sources, not grow a second copy here.

The visual identity is mirrored from the web cockpit's canonical
tokens (`css/style.css`): black command-deck foundation, electric blue
`#00d4ff` as the system/command color, red **only** for genuine
alarms, purple `#8b5cf6` for STAR, 44px touch targets, and the Phase C
shell furniture — command bar, electric-blue status bubble rail,
black credit-card Accounts launcher, and the floating purple STAR
launcher.

## What Build 1 contains

- Expo SDK 58 + React Navigation 7 architecture (bottom-tab deck +
  native stack), all under `src/`.
- Navigation to all 11 canonical sections: World Globe, Crypto World,
  Bot Operations / TRIBES, Opportunities, Earnings, Positions &
  Assets, Encyclopedia, Operations, Accounts & Finance, Security,
  Settings.
- A polished World Globe home shell (flagship): command bar, bubble
  rail, stylised globe visual, World layer states, full section deck.
- Design tokens as a single source (`src/theme/tokens.ts`), including
  the web cockpit's truthful-state vocabulary.
- Reusable components: `CommandBar`, `BubbleRail`, `SectionCard`,
  `StatusPill`, `TruthBlock`, `SectionShell`, `StarLauncher`,
  `StarPanel`.
- A persistent floating STAR launcher (purple at rest) opening a
  demo-labelled STAR panel.

## What is mocked / not connected — honestly

Build 1 is a shell. Nothing here is live:

- **No platform data layer.** Every section reports its truthful
  state (NOT_CONNECTED / UNAVAILABLE / UNKNOWN). Counts render as
  "—" — unavailable is never shown as zero.
- **STAR is demo presentation only** — no AI backend is connected,
  the panel fabricates no answers, and its message input, microphone
  and camera are disabled with truthful labels, exactly as on the web.
- **No worker runtime.** Bot Operations shows the canonical Tribe
  roster (identities only); workers active is "—".
- **No financial authority.** Balances are UNAVAILABLE, execution is
  DISABLED, and no earnings, positions, prices or telemetry are shown.
- **No globe engine.** The home globe is a stylised visual shell; no
  terrain/map engine is connected.
- A few numbers quoted on the Crypto World / Encyclopedia /
  Operations screens (826 records, 48 entities, cache v59, HEAD
  63461769) are **static build-record references**, labelled as such
  on-screen — not live data.

## Run it

```sh
cd mobile
npm install
npm start          # Expo dev server (Expo Go / emulator)
npm run typecheck  # tsc --noEmit
npx expo export --platform web   # compile proof / web bundle
```

No accounts, EAS project, or credentials are configured in Build 1.
