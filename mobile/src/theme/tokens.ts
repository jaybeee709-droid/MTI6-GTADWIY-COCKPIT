/**
 * MTI6 Mobile Cockpit — design tokens (single source of truth).
 *
 * Values mirror the web cockpit's canonical tokens in css/style.css
 * (:root dark theme — the --mti6-* semantic set plus the Phase B
 * responsive tokens), so the phone interface speaks the same visual
 * language as the desktop/web command deck:
 *  - black/dark command-deck foundation
 *  - electric blue (#00d4ff) = the normal system/command color
 *  - red (#ff5c5c) = genuine alarm states ONLY, never decoration
 *  - purple (#8b5cf6) = STAR identity (at rest)
 *  - compact, premium, futuristic cockpit styling; 44px touch targets
 */

/** Truthful-state vocabulary, mirrored from the web cockpit's js/truth.js.
 *  DEMO is a presentation label used by STAR only (the web cockpit labels
 *  STAR's backend demo in the same way); it is not a platform truth state. */
export type TruthState =
  | 'NOT_CONNECTED'
  | 'UNKNOWN'
  | 'UNVERIFIED'
  | 'STALE'
  | 'DISABLED'
  | 'UNAVAILABLE'
  | 'VERIFIED'
  | 'LIVE'
  | 'DEMO';

export const truthLabels: Record<TruthState, string> = {
  NOT_CONNECTED: 'Not connected',
  UNKNOWN: 'Unknown',
  UNVERIFIED: 'Unverified',
  STALE: 'Stale',
  DISABLED: 'Disabled',
  UNAVAILABLE: 'Unavailable',
  VERIFIED: 'Verified',
  LIVE: 'Live',
  DEMO: 'Demo',
};

export const colors = {
  // Foundation — black command deck
  bgVoid: '#05070a', // --bg-0 / --mti6-bg-void
  bgBlack: '#000000', // --mti6-bg-black
  panel: '#0b0f16', // --bg-1 / --mti6-bg-panel
  panelRaised: '#111826', // --bg-2 / --mti6-bg-panel-raised
  panelHigh: '#182233', // --bg-3
  overlay: 'rgba(5, 7, 10, 0.92)', // --mti6-bg-overlay

  // Lines
  border: '#243043', // --line / --mti6-border
  borderActive: '#00d4ff', // --mti6-border-active

  // System / command color
  blueElectric: '#00d4ff', // --cyan / --mti6-blue-electric (operational)
  blueDim: '#0a7ea6', // --cyan-dim
  blueDeep: '#0a4a7a', // --mti6-blue-deep
  blueMuted: '#6f8fb0', // --mti6-blue-muted

  // Metallics / accents (sparing, as in the web cockpit)
  silver: '#c9d4e2', // --mti6-silver
  silverDark: '#8a9bb0', // --mti6-silver-dark
  steel: '#9fb0c3', // --mti6-steel
  gold: '#d4a017', // --mti6-gold

  // STAR identity
  purpleAi: '#8b5cf6', // --mti6-purple-ai (STAR at rest)
  starDeepA: '#3b2070', // web #star-launcher radial gradient stops
  starDeepB: '#1c0f38',

  // State colors — semantics, not decoration
  greenVerified: '#28d17c', // --green / --mti6-green-verified
  yellowCaution: '#ffb020', // --amber / --mti6-yellow-caution
  orangeHigh: '#ff8c42', // --mti6-orange-high
  redAlarm: '#ff5c5c', // --red / --mti6-red-alarm (genuine alarms ONLY)

  // Text
  textPrimary: '#eaf2fb', // --text-0
  textSecondary: '#aebcd1', // --text-1
  textMuted: '#6f7f98', // --text-2
} as const;

/** State → color, mirroring the web directive: electric blue =
 *  operational, purple = STAR at rest, red = alarm only. */
export const stateColors: Record<TruthState, string> = {
  LIVE: colors.blueElectric,
  VERIFIED: colors.greenVerified,
  UNVERIFIED: colors.yellowCaution,
  STALE: colors.yellowCaution,
  UNAVAILABLE: colors.yellowCaution,
  NOT_CONNECTED: colors.steel,
  UNKNOWN: colors.textMuted,
  DISABLED: colors.textMuted,
  DEMO: colors.purpleAi,
};

/** Spacing scale — web --space-1..6 */
export const spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 24,
  s6: 32,
} as const;

/** Radii — web --radius 14px (cards), --sheet-radius 18px (sheets) */
export const radius = {
  card: 14,
  sheet: 18,
  pill: 999,
} as const;

/** Type scale — web --fs-caption/body/title/display */
export const fontSize = {
  caption: 12,
  body: 14,
  title: 16,
  display: 22,
} as const;

/** Controls — web --touch-min/--control-h 44px, --cmdbar-h 56px */
export const touch = {
  min: 44,
  control: 44,
  controlSm: 36,
  commandBar: 56,
  starLauncher: 56,
} as const;
