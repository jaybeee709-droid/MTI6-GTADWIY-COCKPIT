export const MTI6_COLORS = {
  bgVoid: '#050505',
  bgPrimary: '#101010',
  bgElevated: '#151515',
  bgInteractive: '#202020',
  accentCyan: '#00B7FF',
  accentBlue: '#0080FF',
  accentViolet: '#8B5CFF',
  statusDanger: '#FF3B30',
  statusSuccess: '#32D74B',
  textPrimary: '#FFFFFF',
  textSecondary: '#B8B8B8',
  // Phase 2 (additive): brushed silver metallic accent — Earnings and
  // finance surfaces, layer markers. Never a status colour.
  metalSilver: '#C8CFD8',
} as const;

export type MTI6ColorToken = keyof typeof MTI6_COLORS;

export type WorldAccent =
  | typeof MTI6_COLORS.accentCyan
  | typeof MTI6_COLORS.accentBlue
  | typeof MTI6_COLORS.accentViolet;

export interface WorldShellConfig {
  readonly id: string;
  readonly label: string;
  readonly accent: WorldAccent;
  readonly surface: typeof MTI6_COLORS.bgPrimary;
  readonly card: typeof MTI6_COLORS.bgElevated;
}

export const MTI6_WORLD_OS = {
  name: 'MTI6 GTADWIY COCKPIT',
  canvas: MTI6_COLORS.bgVoid,
  shellSurface: MTI6_COLORS.bgPrimary,
  worldCard: MTI6_COLORS.bgElevated,
  borderInteractive: MTI6_COLORS.bgInteractive,
  focusRing: MTI6_COLORS.accentBlue,
  telemetryPrimary: MTI6_COLORS.accentCyan,
  intelligenceAccent: MTI6_COLORS.accentViolet,
} as const;

/* ------------------------------------------------------------------ */
/* Phase 2 token extension (owner directive 2026-11-23).               */
/* EXTENSION ONLY: every token above keeps its name and value.         */
/* Colour law: cyan = command/route/boundary/telemetry; blue =         */
/* structural accent + focus ring; violet = STAR, AI console, bot      */
/* workers (never a status colour); red = ACTIVE CRITICAL ALERT ONLY;  */
/* green = VERIFIED data stream / executed transaction / optimal       */
/* health; #FFB020 = WARNING / WATCH only, never a trend colour.       */
/* ------------------------------------------------------------------ */

export const MTI6_TOPBAR = {
  surface: MTI6_COLORS.bgPrimary,
  raised: MTI6_COLORS.bgElevated,
  border: MTI6_COLORS.bgInteractive,
  heightPhone: 56,
  heightDesktop: 64,
  logoAccent: MTI6_COLORS.accentCyan,
  cardGlyph: '#0A0A0A',
  cardGlyphEdge: '#2A2A2A',
} as const;

export const MTI6_RAIL = {
  gapPx: 6,
  itemPadXPx: 12,
  activeBg: 'rgba(0,183,255,0.15)',
  activeBorder: MTI6_COLORS.accentCyan,
  idleBg: '#121212',
  idleBorder: 'rgba(255,255,255,0.10)',
  iconBoxPx: 16,
} as const;

export const MTI6_AMOUNT = {
  // With nothing connected the amount reads NO DATA — never $0.00.
  connected: MTI6_COLORS.textPrimary,
  noData: MTI6_COLORS.textSecondary,
} as const;

export const MTI6_MAP = {
  ocean: '#04121E',
  oceanDeep: '#020A12',
  land: '#0E1A12',
  landHigh: '#16241A',
  coastline: MTI6_COLORS.accentBlue,
  borderLine: 'rgba(0,183,255,0.35)',
  routeArc: MTI6_COLORS.accentCyan,
  marker: MTI6_COLORS.accentCyan,
  markerCrypto: MTI6_COLORS.accentViolet,
  markerEarnings: MTI6_COLORS.metalSilver,
  markerCritical: MTI6_COLORS.statusDanger,
  graticule: 'rgba(255,255,255,0.06)',
  selectionRing: MTI6_COLORS.accentBlue,
} as const;

export const MTI6_LAYER = {
  all: MTI6_COLORS.accentCyan,
  crypto: MTI6_COLORS.accentViolet,
  earnings: MTI6_COLORS.metalSilver,
  offline: MTI6_COLORS.textSecondary,
} as const;

export const MTI6_CHART = {
  // Scoped to the trading chart and its order controls ONLY.
  up: MTI6_COLORS.statusSuccess, // BUY
  down: MTI6_COLORS.statusDanger, // SELL
  watch: '#FFB020', // WARNING / WATCH — attention, never a trend colour
  gridLine: 'rgba(255,255,255,0.08)',
  axisText: MTI6_COLORS.textSecondary,
  crosshair: MTI6_COLORS.accentCyan,
  volumeBar: 'rgba(0,183,255,0.35)',
} as const;

// The ten named zoom levels. Zoom is CONTINUOUS; these are named states
// the UI displays as thresholds are crossed, not discrete jumps.
export const MTI6_ZOOM_LEVELS = [
  'World',
  'Continent',
  'Country',
  'State',
  'County',
  'City',
  'District',
  'Street',
  'Building',
  'Location',
] as const;

export type MTI6ZoomLevel = (typeof MTI6_ZOOM_LEVELS)[number];

// Owner decision D5 (2026-11-23): the tile-zoom cutoff behind each named
// level — a level applies while the map zoom is <= its maxZoom and above
// the previous level's maxZoom.
export const MTI6_ZOOM_BREAKPOINTS: ReadonlyArray<{
  level: MTI6ZoomLevel;
  maxZoom: number;
}> = [
  { level: 'World', maxZoom: 2 },
  { level: 'Continent', maxZoom: 3 },
  { level: 'Country', maxZoom: 5 },
  { level: 'State', maxZoom: 7 },
  { level: 'County', maxZoom: 9 },
  { level: 'City', maxZoom: 12 },
  { level: 'District', maxZoom: 14 },
  { level: 'Street', maxZoom: 17 },
  { level: 'Building', maxZoom: 19 },
  { level: 'Location', maxZoom: 20 },
] as const;

export function zoomLevelFor(zoom: number): MTI6ZoomLevel {
  for (const bp of MTI6_ZOOM_BREAKPOINTS) {
    if (zoom <= bp.maxZoom) return bp.level;
  }
  return 'Location';
}
