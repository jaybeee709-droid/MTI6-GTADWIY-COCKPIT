/* MTI6 — WorldData capability layer (React app).
 *
 * Imagery, terrain and geography are CAPABILITIES, not provider lists —
 * the same pattern as js/provider-router.js in the vanilla shell.
 * Screens and the map engine ask for a capability; the chain behind it
 * is policy data, resolved keyless-first:
 *
 *   baseMap:  1 OpenStreetMap raster tiles — keyless, FREE_WITH_LIMITS
 *                (tile usage policy; attribution required and shown)
 *             2 Natural Earth vector floor — vendored in-repo
 *                (js/data/world-map.js), public domain, works offline.
 *                THE FLOOR: no state in which the map is blank.
 *   terrain:  AWS Terrain Tiles (terrarium) — CANDIDATE. Registered,
 *             not rendered in this build; hillshade arrives with the
 *             provider-adapter package, never silently.
 *   Keyed providers (Mapbox / MapTiler / Cesium ion) are NOT in this
 *   chain. Owner decision D1 (2026-11-23): they register as PLANNED
 *   candidates only — never wired, never called — in the provider
 *   registry package. NO CLIENT SECRETS: a keyed provider would be
 *   reached through the Netlify proxy only.
 *
 * NO AUTO-FETCH: nothing in this module fetches. The map engine asks
 * for tiles on SETTLE (after a pan/zoom gesture ends), viewport only.
 */

// Side-effect import: the vendored file assigns globalThis.WorldMapData.
// It is presentation geography (Natural Earth + US Census, public
// domain), generated 2026-11-16 — the app fetches no geography.
import '../js/data/world-map.js';

export interface WorldGeoRing extends Array<number> {}

export interface WorldGeoFeature {
  /** name */
  n: string;
  /** label point [lon, lat] */
  lp: [number, number];
  /** polygon rings; each ring is a flat [lon, lat, lon, lat, ...] list */
  p: number[][];
}

export interface WorldGeoCity {
  n: string;
  at: [number, number];
}

export interface WorldGeoData {
  countries: WorldGeoFeature[];
  states: WorldGeoFeature[];
  cities: WorldGeoCity[];
}

declare global {
  // eslint-disable-next-line no-var
  var WorldMapData: WorldGeoData | undefined;
}

export function getWorldGeo(): WorldGeoData | null {
  return typeof globalThis !== 'undefined' && globalThis.WorldMapData
    ? globalThis.WorldMapData
    : null;
}

/* ------------------------------------------------------------------ */
/* Web Mercator projection, in "degree units": x = lon (-180..180),    */
/* y spans -180..180 for lat ±85.0511. In these units the projected    */
/* world is a 360x360 square and slippy-map tiles are uniform squares  */
/* of 360 / 2^z — which is what lets the vector floor and OSM raster   */
/* tiles share one plane without drifting apart.                       */
/* ------------------------------------------------------------------ */

export const MAX_MERCATOR_LAT = 85.0511;

export function projectLon(lon: number): number {
  return lon;
}

export function projectLat(lat: number): number {
  const clamped = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat));
  const phi = (clamped * Math.PI) / 180;
  const y = (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + phi / 2));
  return Math.max(-180, Math.min(180, y));
}

export function unprojectLat(y: number): number {
  const phi = 2 * Math.atan(Math.exp((y * Math.PI) / 180)) - Math.PI / 2;
  return (phi * 180) / Math.PI;
}

/* ------------------------------------------------------------------ */
/* Capability chain                                                    */
/* ------------------------------------------------------------------ */

export type CostClass =
  | 'FREE_KEYLESS'
  | 'FREE_KEY_REQUIRED'
  | 'FREE_WITH_LIMITS'
  | 'FREE_WITH_ATTRIBUTION'
  | 'FREEMIUM'
  | 'PAID'
  | 'SELF_HOSTABLE'
  | 'LOCAL'
  | 'UNKNOWN';

export interface ChainEntry {
  id: string;
  label: string;
  costClass: CostClass;
  /** IN_CHAIN = the engine will use it; FLOOR = final fallback;
   *  CANDIDATE = registered, not wired in this build. */
  state: 'IN_CHAIN' | 'FLOOR' | 'CANDIDATE';
  note: string;
}

export const BASE_MAP_CHAIN: ChainEntry[] = [
  {
    id: 'osm-raster',
    label: 'OpenStreetMap raster tiles',
    costClass: 'FREE_WITH_LIMITS',
    state: 'IN_CHAIN',
    note: 'Keyless. Tile usage policy applies; attribution shown on the map. Fetched on settle, viewport only.',
  },
  {
    id: 'natural-earth-floor',
    label: 'Natural Earth vector floor (vendored)',
    costClass: 'LOCAL',
    state: 'FLOOR',
    note: 'Public-domain geography bundled in the repo. Always available, works offline — the map is never blank.',
  },
];

export const TERRAIN_CHAIN: ChainEntry[] = [
  {
    id: 'aws-terrain-tiles',
    label: 'AWS Terrain Tiles (terrarium)',
    costClass: 'FREE_WITH_LIMITS',
    state: 'CANDIDATE',
    note: 'Elevation candidate. Registered only — hillshade is not rendered until the provider-adapter package wires it with the governor.',
  },
];

/* ------------------------------------------------------------------ */
/* Earnings location rules — owner decision D4 (2026-11-23).           */
/* Which Earnings World categories may carry geography on the map:     */
/*   PLACE_BOUND    — the category is place-bound by nature; a pin     */
/*                    still needs a specific recorded opportunity.     */
/*   PIN_FROM_RECORD — a pin ONLY from a specific recorded             */
/*                    opportunity's real location.                     */
/*   NEVER          — the category never carries location.             */
/* Category names are the canonical js/worlds.js Earnings categories.  */
/* Zero opportunity records exist in this build, so the rules currently */
/* place zero pins — they govern the moment records exist.             */
/* ------------------------------------------------------------------ */

export type EarningsLocationRule = 'PLACE_BOUND' | 'PIN_FROM_RECORD' | 'NEVER';

export const EARNINGS_LOCATION_RULES: Record<string, EarningsLocationRule> = {
  'Gig Economy Opportunities': 'PLACE_BOUND',
  'Local Money-Making Opportunities': 'PLACE_BOUND',
  'Rental Opportunities': 'PLACE_BOUND',
  'Freelance Opportunities': 'PIN_FROM_RECORD',
  'Side Hustles': 'PIN_FROM_RECORD',
  'Commerce Opportunities': 'PIN_FROM_RECORD',
  'Content Creation Earnings': 'PIN_FROM_RECORD',
  'AI Service Opportunities': 'PIN_FROM_RECORD',
  Cashback: 'NEVER',
  'Reward Programs': 'NEVER',
  'Loyalty Points': 'NEVER',
  'Gift Cards': 'NEVER',
  Rebates: 'NEVER',
  Coupons: 'NEVER',
  'Referral Programs': 'NEVER',
  'Affiliate Programs': 'NEVER',
  'Survey Opportunities': 'NEVER',
  'Banking Bonuses': 'NEVER',
  'Savings Rewards': 'NEVER',
  'Promotional Offers': 'NEVER',
};

export function earningsLocationFor(category: string): EarningsLocationRule {
  return EARNINGS_LOCATION_RULES[category] ?? 'NEVER';
}

export interface BaseMapResolution {
  kind: 'raster';
  sourceId: string;
  sourceLabel: string;
  tileUrlTemplate: string;
  attribution: string;
  maxTileZoom: number;
}

export const WorldData = {
  /** Base imagery capability. Keyless chain head: OSM raster over the
   *  vendored vector floor. The engine falls back to the floor when a
   *  tile fails — the fallback is a render state, not an error. */
  baseMap(_lat: number, _lon: number, _zoom: number): BaseMapResolution {
    return {
      kind: 'raster',
      sourceId: 'osm-raster',
      sourceLabel: 'OpenStreetMap raster',
      tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      maxTileZoom: 19,
    };
  },

  /** Vector overlay capability — the floor itself. */
  vectorOverlay(): { sourceId: string; sourceLabel: string; status: 'AVAILABLE' } {
    return {
      sourceId: 'natural-earth-floor',
      sourceLabel: 'Natural Earth + US Census (vendored, public domain)',
      status: 'AVAILABLE',
    };
  },

  /** Terrain capability — honest candidate state, not rendered yet. */
  terrain(
    _lat: number,
    _lon: number,
    _zoom: number,
  ): { status: 'CANDIDATE'; sourceLabel: string; note: string } {
    return {
      status: 'CANDIDATE',
      sourceLabel: TERRAIN_CHAIN[0].label,
      note: TERRAIN_CHAIN[0].note,
    };
  },

  /** Place detail — no provider connected in this build. */
  placeDetail(_lat: number, _lon: number): { status: 'NOT_CONNECTED' } {
    return { status: 'NOT_CONNECTED' };
  },
};
