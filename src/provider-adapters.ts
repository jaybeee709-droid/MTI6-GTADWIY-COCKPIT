import type { CostClass } from './world-data';

/* Provider adapters & contracts (Phase 2, step 7 — owner directive
 * 2026-11-23, decision D1).
 *
 * This registry is the contract surface for map/imagery providers.
 * Registering an adapter here does NOT wire it: an adapter becomes
 * real only when every step of the ACTIVATION CONTRACT below is met,
 * and keyed providers additionally require the owner's explicit
 * approval (D1) plus the Netlify-proxy rule — secrets live only in
 * Netlify environment variables, and calls go
 * client → /api/mti6 proxy → provider (the TRANSITLANDAPIKEY
 * precedent). No adapter in this file contains a key, an endpoint
 * with credentials, or any network code.
 *
 * D1 ruling for this build: keyless chain only. Mapbox, MapTiler and
 * Cesium ion are PLANNED candidates — registered so the decision is
 * visible, never wired, never called, never counted in a chain.
 */

export type AdapterCapability = 'baseMap' | 'terrain' | 'vectorOverlay' | 'placeDetail';

export type AdapterStatus =
  | 'ACTIVE_CHAIN' // in the live fallback chain, calls happen under the governor
  | 'FLOOR' // vendored locally; the final fallback, always available
  | 'CANDIDATE' // registered, keyless, not wired in this build
  | 'PLANNED' // keyed provider held for an owner decision — not wired, not called
  | 'NOT_CONNECTED'; // the capability itself has no adapter

export interface ProviderAdapter {
  id: string;
  provider: string;
  capabilities: AdapterCapability[];
  costClass: CostClass;
  status: AdapterStatus;
  /** Code path exists and the engine uses it. */
  wired: boolean;
  /** Network calls are made (under the governor / fetch-on-settle). */
  called: boolean;
  requiresOwnerApproval: boolean;
  secretHandling: 'NONE_KEYLESS' | 'LOCAL_VENDORED' | 'NETLIFY_PROXY_ONLY';
  attribution?: string;
  note: string;
}

export const PROVIDER_ADAPTERS: ProviderAdapter[] = [
  {
    id: 'osm-raster',
    provider: 'OpenStreetMap',
    capabilities: ['baseMap'],
    costClass: 'FREE_WITH_LIMITS',
    status: 'ACTIVE_CHAIN',
    wired: true,
    called: true,
    requiresOwnerApproval: false,
    secretHandling: 'NONE_KEYLESS',
    attribution: '© OpenStreetMap contributors',
    note: 'Chain head for baseMap. Keyless tiles fetched on settle, viewport only, through the governor. Tile usage policy applies.',
  },
  {
    id: 'natural-earth-floor',
    provider: 'Natural Earth (vendored)',
    capabilities: ['vectorOverlay'],
    costClass: 'LOCAL',
    status: 'FLOOR',
    wired: true,
    called: false,
    requiresOwnerApproval: false,
    secretHandling: 'LOCAL_VENDORED',
    note: 'Public-domain geography bundled in the repo (js/data/world-map.js). The floor: no state in which the map is blank; works offline.',
  },
  {
    id: 'aws-terrain-tiles',
    provider: 'AWS Terrain Tiles',
    capabilities: ['terrain'],
    costClass: 'FREE_WITH_LIMITS',
    status: 'CANDIDATE',
    wired: false,
    called: false,
    requiresOwnerApproval: false,
    secretHandling: 'NONE_KEYLESS',
    attribution: 'Terrain Tiles — Terarium (AWS Open Data)',
    note: 'Elevation candidate (terrarium encoding). Registered only — hillshade renders only when an adapter package wires it under the governor.',
  },
  {
    id: 'mapbox',
    provider: 'Mapbox',
    capabilities: ['baseMap', 'terrain'],
    costClass: 'FREEMIUM',
    status: 'PLANNED',
    wired: false,
    called: false,
    requiresOwnerApproval: true,
    secretHandling: 'NETLIFY_PROXY_ONLY',
    note: 'D1: NOT wired this build. Deep-zoom street-level imagery is a paid surface — activation is an owner decision with pricing checked at approval time. Token would live only in Netlify env; all calls via the /api/mti6 proxy.',
  },
  {
    id: 'maptiler',
    provider: 'MapTiler',
    capabilities: ['baseMap', 'terrain'],
    costClass: 'FREEMIUM',
    status: 'PLANNED',
    wired: false,
    called: false,
    requiresOwnerApproval: true,
    secretHandling: 'NETLIFY_PROXY_ONLY',
    note: 'D1: NOT wired this build. Same activation contract as Mapbox — owner approval, proxy-only key handling, pricing verified at approval time.',
  },
  {
    id: 'cesium-ion',
    provider: 'Cesium ion',
    capabilities: ['baseMap', 'terrain'],
    costClass: 'FREEMIUM',
    status: 'PLANNED',
    wired: false,
    called: false,
    requiresOwnerApproval: true,
    secretHandling: 'NETLIFY_PROXY_ONLY',
    note: 'D1: NOT wired this build. 3D terrain/imagery candidate; the map stays flat regardless (owner ruling) — ion would serve tiles only, never a globe.',
  },
];

/** placeDetail has no adapter in this build — the capability itself. */
export const PLACE_DETAIL_ADAPTER: ProviderAdapter = {
  id: 'place-detail-none',
  provider: '—',
  capabilities: ['placeDetail'],
  costClass: 'UNKNOWN',
  status: 'NOT_CONNECTED',
  wired: false,
  called: false,
  requiresOwnerApproval: true,
  secretHandling: 'NETLIFY_PROXY_ONLY',
  note: 'No place-detail provider is registered. Overpass POI was ruled a later follow-on (D2). Until an adapter is approved, placeDetail answers NOT_CONNECTED.',
};

export const ALL_ADAPTERS: ProviderAdapter[] = [...PROVIDER_ADAPTERS, PLACE_DETAIL_ADAPTER];

export function adaptersFor(capability: AdapterCapability): ProviderAdapter[] {
  return ALL_ADAPTERS.filter((a) => a.capabilities.includes(capability));
}

/* The activation contract — every step must hold before an adapter's
 * `wired` may become true. The checklist is derived from the adapter
 * record itself, so a PLANNED adapter shows exactly what is missing. */
export interface ActivationStep {
  step: string;
  met: boolean;
}

export function activationChecklist(adapter: ProviderAdapter): ActivationStep[] {
  return [
    {
      step: 'Owner approval recorded (keyed providers are never added silently)',
      met: !adapter.requiresOwnerApproval && adapter.status !== 'PLANNED',
    },
    {
      step: 'Secret held only in Netlify env; calls routed client → /api/mti6 proxy → provider',
      met: adapter.secretHandling !== 'NETLIFY_PROXY_ONLY' || adapter.wired,
    },
    {
      step: 'Cost class verified at approval time (exact class, never blanket-labelled)',
      met: adapter.costClass !== 'UNKNOWN' && adapter.status !== 'PLANNED',
    },
    {
      step: 'Fallback chain keeps the Natural Earth floor last — the map is never blank',
      met: true,
    },
    {
      step: 'Attribution surfaced in the UI wherever the source renders',
      met: adapter.attribution !== undefined || adapter.status === 'FLOOR',
    },
    {
      step: 'Governor limits set (fetch on settle, viewport only, no tile storm)',
      met: adapter.called ? adapter.wired : false,
    },
  ];
}
