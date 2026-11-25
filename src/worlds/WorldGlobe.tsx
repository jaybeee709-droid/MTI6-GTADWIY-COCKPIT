import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Globe,
  Layers,
  MapPin,
  Radio,
  Train,
} from 'lucide-react';

import type { ViewMode, WorldId } from '../App';
import { useCockpitDb } from '../hooks/useCockpitDb';
import { MTI6_LAYER } from '../tokens';
import { EARNINGS_LOCATION_RULES, type MapBaseStyle } from '../world-data';
import type { MapTerrainMode } from './WorldMapEngine';
import {
  GLOBE_ROUTE_COLORS,
  MAP_VIEW_SEL_KEY,
  globeTypeToMap,
  loadAppearance,
} from '../appearance';
import { fmtTime, useProvenanceLog } from '../live-data';
import {
  WorldMapEngine,
  type MapEngineStatus,
  type MapMarker,
  type MapViewReport,
} from './WorldMapEngine';
import { CryptoSphere } from './CryptoSphere';
import { SPACE_BG } from './CryptoWorld';
import { ALL_ADAPTERS } from '../provider-adapters';
import { loadAngelStore } from '../angel-security';

export interface WorldGlobeProps {
  onSelectWorld?: (world: WorldId) => void;
  viewMode?: ViewMode;
}

/* The canonical layer system (Phase 2, step 4 — owner directive
 * 2026-11-23). Eight layers on ONE map: base is always on; the other
 * seven toggle. A layer places a marker ONLY for a record with a
 * verified location — in this build every layer's record set is
 * empty or unconnected, so the map honestly carries zero markers,
 * and each layer's status line says why. */
type LayerId =
  | 'base'
  | 'crypto'
  | 'earnings'
  | 'opportunities'
  | 'positions'
  | 'transit'
  | 'security'
  | 'intelligence';

interface LayerMeta {
  id: LayerId;
  label: string;
  accent: string;
  statusText: string;
}

const earningsRuleCounts = (() => {
  const counts = { PLACE_BOUND: 0, PIN_FROM_RECORD: 0, NEVER: 0 };
  for (const rule of Object.values(EARNINGS_LOCATION_RULES)) counts[rule] += 1;
  return counts;
})();

const LAYERS: LayerMeta[] = [
  {
    id: 'base',
    label: 'Base',
    accent: MTI6_LAYER.all,
    statusText: 'ALWAYS ON — Natural Earth vector floor + keyless OSM raster. The map is never blank.',
  },
  {
    id: 'crypto',
    label: 'Crypto',
    accent: MTI6_LAYER.crypto,
    statusText:
      'SPHERE-ONLY (owner ruling D6) — crypto never pins the flat map; it opens as the Sphere lens. Zero verified crypto locations exist.',
  },
  {
    id: 'earnings',
    label: 'Earnings',
    accent: MTI6_LAYER.earnings,
    statusText: `LOCATION RULES (D4) — place-bound ${earningsRuleCounts.PLACE_BOUND} · pin-from-record ${earningsRuleCounts.PIN_FROM_RECORD} · never located ${earningsRuleCounts.NEVER}. Recorded opportunities: 0 — no pins placed.`,
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    accent: MTI6_LAYER.all,
    statusText: 'NO DATA — the opportunity pipeline holds zero records; nothing exists to place.',
  },
  {
    id: 'positions',
    label: 'Positions',
    accent: MTI6_LAYER.all,
    statusText: 'UNAVAILABLE — no account or wallet is connected; no position has a location to show.',
  },
  {
    id: 'transit',
    label: 'Transit',
    accent: MTI6_LAYER.all,
    statusText: 'READY (Not Polled) — Transitland proxy ready; no route query executed, no stops placed.',
  },
  {
    id: 'security',
    label: 'Security',
    accent: MTI6_LAYER.all,
    statusText:
      'UNMEASURED — AngelSecurity has no verified active alerts in this build. The map turns red only for a CONFIRMED, active alert.',
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    accent: MTI6_LAYER.all,
    statusText: 'UNMEASURED — intelligence layer awaiting STAR backend connection.',
  },
];

const DOMAIN_RADARS: { id: string; label: string; world: WorldId; status: string }[] = [
  { id: 'opportunity-radar', label: 'Opportunity Radar', world: 'opportunities', status: 'STANDBY · NO DATA' },
  { id: 'earnings-radar', label: 'Earnings Radar', world: 'earnings', status: 'STANDBY · NO DATA' },
  { id: 'crypto-radar', label: 'Crypto Radar', world: 'crypto', status: 'RPC NOT CONNECTED' },
  { id: 'asset-radar', label: 'Asset Radar', world: 'positions', status: 'STANDBY · NO DATA' },
  { id: 'security-radar', label: 'Security Radar', world: 'security', status: 'UNMEASURED · NO DATA' },
];

// Transit (A2/A3, 2026-11-23): stops and departures come only from
// the /api/mti6 proxy (Transitland), on the owner's explicit query —
// never polled, never invented. Without a configured server key the
// panel says NOT_CONFIGURED and places nothing.

function fmtLon(lon: number): string {
  return `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
}
function fmtLat(lat: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
}

// v225 — Place Intelligence: measured proximity only. No name
// matching, no guessed links — the edge is a haversine distance
// between two real coordinates.
function haversineM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const r = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}
const COMPASS_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function bearingCompass(aLat: number, aLon: number, bLat: number, bLon: number): string {
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return COMPASS_8[Math.round(deg / 45) % 8];
}

export const WorldGlobe: React.FC<WorldGlobeProps> = ({ onSelectWorld }) => {
  const cockpitDb = useCockpitDb();
  const [activeLayers, setActiveLayers] = useState<LayerId[]>(['base']);
  const [focusedLayer, setFocusedLayer] = useState<LayerId>('base');
  const [sphereOpen, setSphereOpen] = useState<boolean>(false);
  // v222 — map-view selector (Daniel: "zoom all the way in like
  // Google Maps to real world view"). BASE switches the tile source
  // (Streets / Satellite / Floor), TERRAIN adds the AWS hillshade
  // overlay, LENS focuses the map on one intelligence dimension
  // (Coverage = every layer's data state at once). Persisted —
  // the choice survives reloads.
  type MapLens = 'world' | 'crypto' | 'earnings' | 'security' | 'transit' | 'coverage';
  const readViewSel = (): { base: MapBaseStyle; terrain: MapTerrainMode; lens: MapLens; night: boolean; places: boolean } => {
    try {
      const raw = localStorage.getItem(MAP_VIEW_SEL_KEY);
      if (!raw) return { base: 'streets', terrain: 'off', lens: 'world', night: true, places: false };
      const parsed = JSON.parse(raw) as Partial<{ base: string; terrain: string; lens: string; night: unknown; places: unknown }>;
      return {
        base: parsed.base === 'satellite' || parsed.base === 'floor' ? (parsed.base as MapBaseStyle) : 'streets',
        terrain: parsed.terrain === 'hillshade' ? 'hillshade' : 'off',
        lens: ['world', 'crypto', 'earnings', 'security', 'transit', 'coverage'].includes(parsed.lens ?? '')
          ? (parsed.lens as MapLens)
          : 'world',
        // v224 — day/night terminator, on by default. An old saved
        // selection without the key reads ON.
        night: parsed.night === false ? false : true,
        // v226 — POI/business layer, off by default. An old saved
        // selection without the key reads OFF.
        places: parsed.places === true,
      };
    } catch {
      return { base: 'streets', terrain: 'off', lens: 'world', night: true, places: false };
    }
  };
  const [viewSel, setViewSelState] = useState(readViewSel);
  const setViewSel = (next: Partial<{ base: MapBaseStyle; terrain: MapTerrainMode; lens: MapLens; night: boolean; places: boolean }>) => {
    setViewSelState((prev) => {
      const merged = { ...prev, ...next };
      try {
        localStorage.setItem(MAP_VIEW_SEL_KEY, JSON.stringify(merged));
      } catch {
        // Persistence is a nicety — the selection still applies.
      }
      return merged;
    });
  };
  const applyLens = (lens: MapLens) => {
    setViewSel({ lens });
    if (lens === 'world' || lens === 'coverage') {
      setFocusedLayer('base');
      return;
    }
    const id = lens as LayerId;
    if (!activeLayers.includes(id)) setActiveLayers([...activeLayers, id]);
    setFocusedLayer(id);
  };
  // v223 — Globe Designer bridge: the Appearance Studio's globe
  // type is a preset over these same controls. When the Studio
  // applies one, this listener re-reads the appearance settings
  // and retargets the map (base + terrain + floor mode + route
  // colour / pulse). The MAP VIEW bar stays the live source of
  // truth — changing BASE or TERRAIN there does not rewrite the
  // Studio's stored globe type.
  const [floorMode, setFloorMode] = useState<'filled' | 'wireframe'>(() => {
    try {
      return globeTypeToMap(loadAppearance().globeType).floorMode;
    } catch {
      return 'filled';
    }
  });
  const [routeColor, setRouteColor] = useState<string>(() => {
    try {
      return GLOBE_ROUTE_COLORS[loadAppearance().globeRoute];
    } catch {
      return '#00B7FF';
    }
  });
  const [markerPulse, setMarkerPulse] = useState<boolean>(() => {
    try {
      return loadAppearance().routeStyle === 'pulse';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const onAppearance = () => {
      try {
        const a = loadAppearance();
        const m = globeTypeToMap(a.globeType);
        setFloorMode(m.floorMode);
        setRouteColor(GLOBE_ROUTE_COLORS[a.globeRoute]);
        setMarkerPulse(a.routeStyle === 'pulse');
        setViewSelState((prev) => {
          const merged = { ...prev, base: m.base as MapBaseStyle, terrain: m.terrain as MapTerrainMode };
          try {
            localStorage.setItem(MAP_VIEW_SEL_KEY, JSON.stringify(merged));
          } catch {
            // Persistence is a nicety.
          }
          return merged;
        });
      } catch {
        // Appearance read failure leaves the map as-is.
      }
    };
    window.addEventListener('mti6:appearance', onAppearance);
    return () => window.removeEventListener('mti6:appearance', onAppearance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const provenance = useProvenanceLog();
  // Live transit (A2): stops fetched through the /api/mti6 proxy
  // (Transitland) for the map centre, on the owner's explicit query —
  // never auto-polled. These are the map's first real markers: each
  // carries a location the source itself published.
  const [transitStops, setTransitStops] = useState<MapMarker[]>([]);
  // v226 — POI/business layer (D2 revisit): real businesses from
  // OpenStreetMap via Nominatim, one explicit query (never a poll).
  // Overpass was probed and is NOT wireable from this host
  // (406/502 on the primary, 000 on both mirrors); the OSM map
  // API answers but returns ~9 MB per small bbox — too heavy for
  // a read layer. Nominatim's category search returns real local
  // places with name, kind and address parts. Fair use: 1 req/s,
  // so categories run sequentially with a 1.1 s gap (only after a
  // successful request — a failed one costs no quota).
  interface PoiRecord {
    id: string;
    label: string;
    lat: number;
    lon: number;
    kind: string;
    road?: string;
    suburb?: string;
    postcode?: string;
    city?: string;
  }
  const POI_CATEGORIES = [
    { param: 'amenity', value: 'restaurant', label: 'RESTAURANTS' },
    { param: 'amenity', value: 'cafe', label: 'CAFES' },
    { param: 'amenity', value: 'fast_food', label: 'FAST FOOD' },
    { param: 'shop', value: 'supermarket', label: 'SUPERMARKETS' },
    { param: 'amenity', value: 'bar', label: 'BARS' },
  ] as const;
  const [poiMarkers, setPoiMarkers] = useState<MapMarker[]>([]);
  const [poiRecords, setPoiRecords] = useState<Record<string, PoiRecord>>({});
  const [selectedPoi, setSelectedPoi] = useState<PoiRecord | null>(null);
  const [poiQuery, setPoiQuery] = useState<{
    state: 'idle' | 'loading' | 'ok' | 'error';
    message: string;
    fetchedAt: number | null;
  }>({ state: 'idle', message: 'NOT QUERIED — Nominatim is ready; nothing has been polled.', fetchedAt: null });
  const [transitQuery, setTransitQuery] = useState<{
    state: 'idle' | 'loading' | 'ok' | 'error';
    message: string;
    fetchedAt: number | null;
  }>({ state: 'idle', message: 'NOT QUERIED — the proxy is ready; nothing has been polled.', fetchedAt: null });
  const [selectedStop, setSelectedStop] = useState<MapMarker | null>(null);
  // stop_key per marker id (Onestop ID or feed key from the stops
  // response) — the departures lookup key. A stop whose response
  // carried no key simply has no entry, and says so when asked.
  const [stopKeys, setStopKeys] = useState<Record<string, string>>({});
  const [departures, setDepartures] = useState<{
    state: 'idle' | 'loading' | 'ok' | 'error';
    message: string;
    rows: { time: string; label: string }[];
    fetchedAt: number | null;
  }>({ state: 'idle', message: '', rows: [], fetchedAt: null });
  // The concept sheet's TODAY / TOMORROW tabs — the proxy already
  // accepts relative_date, so the tab is a real second query.
  const [departuresDay, setDeparturesDay] = useState<'TODAY' | 'TOMORROW'>('TODAY');
  // Geocoding pipeline (v170): GO TO PLACE runs geo.geocode
  // through the proxy (Geoapify → LocationIQ chain). Results are
  // provider-published coordinates — choosing one places a real
  // marker and centres the map on it. With no key configured the
  // pipeline answers NOT_CONFIGURED and places nothing.
  const [placeText, setPlaceText] = useState('');
  const [placeSearch, setPlaceSearch] = useState<{
    state: 'idle' | 'loading' | 'ok' | 'error';
    message: string;
    results: { label: string; lat: number; lon: number }[];
    provider: string | null;
    fetchedAt: number | null;
  }>({ state: 'idle', message: 'NOT SEARCHED — the geocoding pipeline is ready; nothing has been polled.', results: [], provider: null, fetchedAt: null });
  const [placeMarker, setPlaceMarker] = useState<MapMarker | null>(null);
  // v225 — Place Intelligence: the focus is the selected transit
  // stop, else the placed place. Nearby nodes are transit stops
  // within 1 km, measured by haversine over real coordinates;
  // the map draws a link line from the focus to each one. Alerts
  // match only when an alert's recorded area names this place —
  // area is null unless the owner sets it at intake.
  const focusPoint = selectedStop ?? selectedPoi ?? placeMarker;
  const nearbyStops = useMemo(() => {
    if (!focusPoint) return [];
    return transitStops
      .filter((s) => s.id !== focusPoint.id)
      .map((s) => ({ stop: s, dist: haversineM(focusPoint.lat, focusPoint.lon, s.lat, s.lon) }))
      .filter((d) => d.dist <= 1000)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8);
  }, [focusPoint, transitStops]);
  const focusLinks = useMemo(
    () =>
      focusPoint
        ? nearbyStops.map((n) => ({
            id: `link-${n.stop.id}`,
            from: { lon: focusPoint.lon, lat: focusPoint.lat },
            to: { lon: n.stop.lon, lat: n.stop.lat },
          }))
        : [],
    [focusPoint, nearbyStops],
  );
  const areaAlerts = useMemo(() => {
    if (!focusPoint) return [];
    const label = focusPoint.label.toLowerCase();
    return loadAngelStore().alerts.filter(
      (a) =>
        typeof a.area === 'string' &&
        (label.includes(a.area.toLowerCase()) || a.area.toLowerCase().includes(label)),
    );
  }, [focusPoint]);
  const [mapFocus, setMapFocus] = useState<{ lon: number; lat: number; nonce: number } | null>(null);

  const searchPlace = async () => {
    const q = placeText.trim();
    if (!q) return;
    if (typeof fetch !== 'function') {
      setPlaceSearch({ state: 'error', message: 'NO FETCH IN THIS ENVIRONMENT.', results: [], provider: null, fetchedAt: null });
      return;
    }
    setPlaceSearch({ state: 'loading', message: 'SEARCHING…', results: [], provider: null, fetchedAt: null });
    try {
      const res = await fetch('/api/mti6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'geo.geocode', payload: { q } }),
      });
      const env = (await res.json().catch(() => null)) as
        | { ok?: boolean; data?: { results?: { label: string; lat: number; lon: number }[]; provider?: string }; error?: { code?: string } }
        | null;
      if (!env || !env.ok) {
        const code = env?.error?.code ?? 'UPSTREAM_ERROR';
        setPlaceSearch({
          state: 'error',
          message:
            code === 'NOT_CONFIGURED'
              ? 'NOT_CONFIGURED — no geocoding key is set on the server (MTI6_GEOAPIFY_KEY / MTI6_LOCATIONIQ_KEY). Nothing was placed.'
              : code === 'NOT_FOUND'
                ? 'NOT_FOUND — no geocoding provider found that place.'
                : `PLACE SEARCH FAILED (${code}).`,
          results: [],
          provider: null,
          fetchedAt: null,
        });
        return;
      }
      const results = Array.isArray(env.data?.results) ? env.data.results : [];
      setPlaceSearch({
        state: 'ok',
        message: `${results.length} RESULT${results.length === 1 ? '' : 'S'} — pick one to place it on the map.`,
        results,
        provider: env.data?.provider ?? null,
        fetchedAt: Date.now(),
      });
    } catch {
      setPlaceSearch({ state: 'error', message: 'PLACE SEARCH FAILED (NETWORK).', results: [], provider: null, fetchedAt: null });
    }
  };

  const choosePlace = (r: { label: string; lat: number; lon: number }) => {
    setPlaceMarker({ id: 'place-1', lon: r.lon, lat: r.lat, label: r.label });
    setMapFocus((f) => ({ lon: r.lon, lat: r.lat, nonce: (f?.nonce ?? 0) + 1 }));
  };

  const queryDepartures = async (stop: MapMarker, day: 'TODAY' | 'TOMORROW' = departuresDay) => {
    const key = stopKeys[stop.id];
    if (!key) {
      setDepartures({
        state: 'error',
        message: 'This stop carried no Transitland lookup key in the stops response — departures cannot be queried for it.',
        rows: [],
        fetchedAt: null,
      });
      return;
    }
    if (typeof fetch !== 'function') {
      setDepartures({ state: 'error', message: 'NO FETCH IN THIS ENVIRONMENT.', rows: [], fetchedAt: null });
      return;
    }
    setDepartures({ state: 'loading', message: 'QUERYING DEPARTURES…', rows: [], fetchedAt: null });
    try {
      const res = await fetch('/api/mti6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transit.departures',
          payload: { stop_key: key, limit: 8, include_alerts: false, relative_date: day },
        }),
      });
      const env = (await res.json().catch(() => null)) as
        | { ok?: boolean; data?: unknown; error?: { code?: string } }
        | null;
      if (!env || !env.ok) {
        const code = env?.error?.code ?? 'UPSTREAM_ERROR';
        setDepartures({
          state: 'error',
          message:
            code === 'AUTH_REQUIRED'
              ? 'NOT_CONFIGURED — no Transitland key is set on the server.'
              : code === 'NOT_FOUND'
                ? 'NOT_FOUND — Transitland has no departures record for this stop.'
                : `DEPARTURES QUERY FAILED (${code}).`,
          rows: [],
          fetchedAt: null,
        });
        return;
      }
      const data = env.data as {
        departures?: unknown[];
        stop?: { departures?: unknown[] };
      } | null;
      const list = data?.departures ?? data?.stop?.departures ?? [];
      const rows: { time: string; label: string }[] = [];
      for (const raw of list) {
        if (!raw || typeof raw !== 'object') continue;
        const d = raw as Record<string, unknown>;
        const stopTime = d.stop_time as Record<string, unknown> | undefined;
        const trip = d.trip as Record<string, unknown> | undefined;
        const route = trip?.route as Record<string, unknown> | undefined;
        const rawTime =
          d.departure_time ?? d.arrival_time ?? stopTime?.departure_time ?? stopTime?.arrival_time;
        let time = '—';
        if (typeof rawTime === 'string') {
          const parsed = new Date(rawTime);
          time = Number.isNaN(parsed.getTime())
            ? rawTime
            : parsed.toLocaleTimeString('en-US', { hour12: false });
        } else if (typeof rawTime === 'number') {
          time = new Date(rawTime * 1000).toLocaleTimeString('en-US', { hour12: false });
        }
        const label =
          (typeof route?.route_short_name === 'string' && route.route_short_name) ||
          (typeof route?.route_long_name === 'string' && route.route_long_name) ||
          (typeof trip?.headsign === 'string' && trip.headsign) ||
          (typeof d.headsign === 'string' && d.headsign) ||
          'Route';
        rows.push({ time, label: String(label) });
        if (rows.length >= 8) break;
      }
      setDepartures({
        state: 'ok',
        message:
          rows.length > 0
            ? `${rows.length} UPCOMING DEPARTURE${rows.length === 1 ? '' : 'S'} (SCHEDULED FEED DATA).`
            : `NO DEPARTURES RETURNED FOR THIS STOP ${day}.`,
        rows,
        fetchedAt: Date.now(),
      });
    } catch {
      setDepartures({ state: 'error', message: 'DEPARTURES QUERY FAILED (NETWORK).', rows: [], fetchedAt: null });
    }
  };

  const queryPlaces = async () => {
    if (typeof fetch !== 'function') {
      setPoiQuery({ state: 'error', message: 'NO FETCH IN THIS ENVIRONMENT.', fetchedAt: null });
      return;
    }
    const lat = mapView.lat;
    const lon = mapView.lon;
    const minLon = (lon - 0.02).toFixed(5);
    const minLat = (lat - 0.02).toFixed(5);
    const maxLon = (lon + 0.02).toFixed(5);
    const maxLat = (lat + 0.02).toFixed(5);
    setPoiQuery({ state: 'loading', message: 'QUERYING PLACES… 0/5', fetchedAt: null });
    const seen = new Set<string>();
    const markers: MapMarker[] = [];
    const records: Record<string, PoiRecord> = {};
    let failed = 0;
    for (let i = 0; i < POI_CATEGORIES.length; i++) {
      const cat = POI_CATEGORIES[i];
      setPoiQuery({
        state: 'loading',
        message: `QUERYING PLACES… ${i + 1}/5 — ${cat.label}`,
        fetchedAt: null,
      });
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=8&${cat.param}=${cat.value}&viewbox=${minLon},${minLat},${maxLon},${maxLat}&bounded=1`,
          { headers: { 'Accept-Language': 'en' } },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          place_id?: number;
          lat?: string;
          lon?: string;
          display_name?: string;
          class?: string;
          type?: string;
          address?: { road?: string; house_number?: string; suburb?: string; city?: string; town?: string; postcode?: string };
        }[];
        if (Array.isArray(data)) {
          for (const r of data) {
            if (!r || typeof r.place_id !== 'number') continue;
            const key = String(r.place_id);
            if (seen.has(key)) continue;
            const rLat = typeof r.lat === 'string' ? parseFloat(r.lat) : NaN;
            const rLon = typeof r.lon === 'string' ? parseFloat(r.lon) : NaN;
            if (!Number.isFinite(rLat) || !Number.isFinite(rLon)) continue;
            if (typeof r.display_name !== 'string' || r.display_name.length === 0) continue;
            seen.add(key);
            const name = r.display_name.split(',')[0].trim();
            const rec: PoiRecord = {
              id: `poi-${key}`,
              label: name,
              lat: rLat,
              lon: rLon,
              kind: `${r.class ?? 'place'}:${r.type ?? 'unknown'}`,
              road: r.address?.road
                ? r.address.house_number
                  ? `${r.address.house_number} ${r.address.road}`
                  : r.address.road
                : undefined,
              suburb: r.address?.suburb,
              postcode: r.address?.postcode,
              city: r.address?.city ?? r.address?.town,
            };
            records[rec.id] = rec;
            markers.push({ id: rec.id, lat: rLat, lon: rLon, label: name });
            if (markers.length >= 25) break;
          }
        }
        // Fair use: 1 req/s — wait only after a request that
        // actually reached the server.
        if (i < POI_CATEGORIES.length - 1) {
          await new Promise((r) => setTimeout(r, 1100));
        }
      } catch {
        failed += 1;
      }
      if (markers.length >= 25) break;
    }
    const limited = markers.slice(0, 25);
    setPoiMarkers(limited);
    setPoiRecords(records);
    if (limited.length === 0) {
      setPoiQuery({
        state: 'error',
        message:
          failed === POI_CATEGORIES.length
            ? 'QUERY FAILED (NETWORK) — Nominatim did not answer; no places are shown.'
            : 'NO PLACES FOUND — Nominatim answered but returned no named businesses in this area.',
        fetchedAt: null,
      });
      return;
    }
    setPoiQuery({
      state: 'ok',
      message:
        failed > 0
          ? `LIVE · ${limited.length} PLACES · ${failed} of 5 categories failed — partial results.`
          : `LIVE · ${limited.length} PLACES`,
      fetchedAt: Date.now(),
    });
  };

  const queryTransitStops = async () => {
    if (typeof fetch !== 'function') {
      setTransitQuery({ state: 'error', message: 'NO FETCH IN THIS ENVIRONMENT.', fetchedAt: null });
      return;
    }
    setTransitQuery({ state: 'loading', message: 'QUERYING TRANSITLAND VIA THE PROXY…', fetchedAt: null });
    try {
      const res = await fetch('/api/mti6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transit.stopsNear',
          payload: { lat: mapView.lat, lon: mapView.lon, radius: 1500, limit: 25 },
        }),
      });
      const env = (await res.json().catch(() => null)) as
        | { ok?: boolean; data?: unknown; error?: { code?: string; message?: string } }
        | null;
      if (!env || !env.ok) {
        const code = env?.error?.code ?? 'UPSTREAM_ERROR';
        setTransitQuery({
          state: 'error',
          message:
            code === 'AUTH_REQUIRED'
              ? 'NOT_CONFIGURED — no Transitland key is set on the server (Netlify TRANSITLAND_API_KEY). No stops are shown.'
              : `QUERY FAILED (${code}) — no stops are shown.`,
          fetchedAt: null,
        });
        setTransitStops([]);
        return;
      }
      const data = env.data as { stops?: unknown[] } | null;
      const stops: MapMarker[] = [];
      const keys: Record<string, string> = {};
      if (data && Array.isArray(data.stops)) {
        data.stops.forEach((raw, i) => {
          if (!raw || typeof raw !== 'object') return;
          const s = raw as Record<string, unknown>;
          let lat: number | null = null;
          let lon: number | null = null;
          const geom = s.geometry as { coordinates?: unknown } | undefined;
          if (geom && Array.isArray(geom.coordinates)) {
            lon = typeof geom.coordinates[0] === 'number' ? geom.coordinates[0] : null;
            lat = typeof geom.coordinates[1] === 'number' ? geom.coordinates[1] : null;
          }
          if (lat === null || lon === null) {
            const la = s.stop_lat ?? s.lat ?? s.latitude;
            const lo = s.stop_lon ?? s.lon ?? s.longitude;
            lat = typeof la === 'number' ? la : null;
            lon = typeof lo === 'number' ? lo : null;
          }
          if (lat === null || lon === null) return;
          const name =
            typeof s.stop_name === 'string'
              ? s.stop_name
              : typeof s.name === 'string'
                ? s.name
                : 'Transit stop';
          const id =
            typeof s.onestop_id === 'string'
              ? s.onestop_id
              : typeof s.id === 'string' || typeof s.id === 'number'
                ? String(s.id)
                : `stop-${i}`;
          stops.push({ id, lat, lon, label: name, color: MTI6_LAYER.all });
          const key =
            typeof s.onestop_id === 'string'
              ? s.onestop_id
              : typeof s.id === 'string' || typeof s.id === 'number'
                ? String(s.id)
                : null;
          if (key) keys[id] = key;
        });
      }
      setTransitStops(stops);
      setStopKeys(keys);
      setDepartures({ state: 'idle', message: '', rows: [], fetchedAt: null });
      setTransitQuery({
        state: 'ok',
        message: `${stops.length} STOP${stops.length === 1 ? '' : 'S'} WITHIN 1.5 KM OF THE MAP CENTRE.`,
        fetchedAt: Date.now(),
      });
    } catch {
      setTransitQuery({ state: 'error', message: 'QUERY FAILED (NETWORK) — no stops are shown.', fetchedAt: null });
      setTransitStops([]);
    }
  };
  // Log lines are UI events only (the engine initialized, a layer was
  // toggled, the zoom level changed). No line claims a live feed, a
  // latency, or an alert.
  const [activityLog, setActivityLog] = useState<string[]>([
    '[SYNC] Flat map engine initialized — Natural Earth vector floor',
    '[STATUS] Base imagery: keyless chain — OSM raster over the vector floor',
    '[STATUS] No live feed connected — map layers NOT_CONNECTED',
  ]);
  const [mapView, setMapView] = useState<MapViewReport>({
    lon: 0,
    lat: 18.6,
    zoom: 1.15,
    level: 'World',
  });
  const [engineStatus, setEngineStatus] = useState<MapEngineStatus>({
    base: 'FLOOR',
    tileZoom: 0,
    tilesLoaded: 0,
    tilesFailed: 0,
    overZoom: false,
    nativeTileZoom: 19,
    terrain: 'OFF',
    shadeTiles: 0,
    night: true,
  });
  const lastLevelRef = useRef<string>('World');

  const toggleLayer = (id: LayerId) => {
    if (id === 'base') {
      setFocusedLayer('base');
      return; // base is always on — it cannot be toggled off
    }
    const on = !activeLayers.includes(id);
    setActiveLayers(on ? [...activeLayers, id] : activeLayers.filter((item) => item !== id));
    setFocusedLayer(on ? id : 'base');
    const meta = LAYERS.find((l) => l.id === id);
    setActivityLog((log) =>
      [
        `[LAYER] ${meta?.label} ${on ? 'ON' : 'OFF'} — ${on ? meta?.statusText : 'layer hidden'}`,
        ...log,
      ].slice(0, 8),
    );
  };

  const handleViewChange = (report: MapViewReport) => {
    setMapView(report);
    if (report.level !== lastLevelRef.current) {
      lastLevelRef.current = report.level;
      setActivityLog((prev) =>
        [`[ZOOM] Level: ${report.level} (z${report.zoom.toFixed(1)})`, ...prev].slice(0, 8),
      );
    }
  };

  const focusedMeta = LAYERS.find((l) => l.id === focusedLayer) ?? LAYERS[0];
  const cryptoOn = activeLayers.includes('crypto');
  const transitOn = activeLayers.includes('transit');
  const baseLabel =
    engineStatus.base === 'ENGINE_UNAVAILABLE'
      ? 'ENGINE UNAVAILABLE'
      : viewSel.base === 'satellite'
        ? 'ESRI SATELLITE'
        : viewSel.base === 'floor'
          ? 'VECTOR FLOOR'
          : 'OSM RASTER';

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-6 space-y-5" style={SPACE_BG}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border border-[#00B7FF]/25 bg-[#101010] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#050505] border border-[#00B7FF]/50 flex items-center justify-center text-[#00B7FF]">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold tracking-wide text-white">WORLD MAP · MASTER COMMAND</h1>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#050505] border border-[#00B7FF]/40 text-[#00B7FF]">
                {activeLayers.length} LAYER{activeLayers.length === 1 ? '' : 'S'} ON
              </span>
            </div>
            <p className="text-xs text-[#B8B8B8]">
              One flat map — every world is a layer on it. No second map exists.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg border border-white/15 bg-[#151515] text-[#B8B8B8] text-xs font-mono">
            READ-ONLY · NOT CONNECTED
          </span>
          {onSelectWorld && (
            <>
              <button
                type="button"
                onClick={() => onSelectWorld('crypto')}
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#151515] border border-[#00B7FF]/40 text-[#00B7FF] hover:bg-[#00B7FF]/10 transition"
              >
                OPEN CRYPTO
              </button>
              <button
                type="button"
                onClick={() => onSelectWorld('earnings')}
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#151515] border border-[#8B5CFF]/40 text-[#8B5CFF] hover:bg-[#8B5CFF]/10 transition"
              >
                OPEN EARNINGS
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 rounded-xl border border-[#00B7FF]/25 bg-[#050505] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#101010]">
            <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
              <Radio className="h-3.5 w-3.5" />
              <span>FLAT WORLD MAP · WEBGL PLANE — {mapView.level.toUpperCase()}</span>
            </div>
            <span className="hidden text-[11px] font-mono text-[#B8B8B8] md:inline">DRAG TO PAN · SCROLL TO ZOOM · FETCH ON SETTLE</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-white/10 bg-[#0b0b0b] text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
              Transitland Proxy:{' '}
              {transitQuery.state === 'ok'
                ? `LIVE · ${transitStops.length} STOPS`
                : transitQuery.state === 'error'
                  ? 'QUERY FAILED'
                  : 'READY (Not Polled)'}
            </span>
            <span className="px-2 py-0.5 rounded border border-[#00B7FF]/40 bg-[#00B7FF]/10 text-[#00B7FF]">
              World Engine: 957 Nodes
            </span>
            <span className="px-2 py-0.5 rounded border border-[#00B7FF]/40 bg-[#00B7FF]/10 text-[#00B7FF]">
              Base: {baseLabel}
            </span>
            <span className="px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300">
              STAR Backend: NOT CONNECTED
            </span>
            <span className="px-2 py-0.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300">
              Crypto RPC: NOT CONNECTED
            </span>
            <span className="px-2 py-0.5 rounded border border-[#00B7FF]/40 bg-[#00B7FF]/10 text-[#00B7FF]">CockpitDB: {cockpitDb.status} ({cockpitDb.storeCount} stores)</span>
          </div>

          {/* v222 — MAP VIEW selector: base style, terrain hillshade,
              lens. 44px targets; the lens focuses the map on one
              intelligence dimension, Coverage shows every layer's
              data state at once. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 border-b border-white/10 bg-[#0b0b0b] text-[11px] font-mono">
            <span className="font-semibold text-white">MAP VIEW</span>
            <span className="flex items-center gap-1">
              <span className="text-[#B8B8B8]">BASE</span>
              {(['streets', 'satellite', 'floor'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setViewSel({ base: b })}
                  aria-pressed={viewSel.base === b}
                  className={`h-9 px-2.5 rounded border transition ${
                    viewSel.base === b
                      ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-white'
                      : 'border-white/15 text-[#B8B8B8] hover:border-white/40'
                  }`}
                >
                  {b === 'streets' ? 'STREETS' : b === 'satellite' ? 'SATELLITE' : 'FLOOR'}
                </button>
              ))}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[#B8B8B8]">TERRAIN</span>
              {(['off', 'hillshade'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setViewSel({ terrain: t })}
                  aria-pressed={viewSel.terrain === t}
                  className={`h-9 px-2.5 rounded border transition ${
                    viewSel.terrain === t
                      ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-white'
                      : 'border-white/15 text-[#B8B8B8] hover:border-white/40'
                  }`}
                >
                  {t === 'off' ? 'OFF' : 'HILLSHADE'}
                </button>
              ))}
            </span>
            {/* v224 — Living World: day/night terminator, computed
                from real UTC time. ON by default. */}
            <span className="flex items-center gap-1">
              <span className="text-[#B8B8B8]">NIGHT</span>
              {([true, false] as const).map((n) => (
                <button
                  key={String(n)}
                  type="button"
                  onClick={() => setViewSel({ night: n })}
                  aria-pressed={viewSel.night === n}
                  className={`h-9 px-2.5 rounded border transition ${
                    viewSel.night === n
                      ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-white'
                      : 'border-white/15 text-[#B8B8B8] hover:border-white/40'
                  }`}
                >
                  {n ? 'ON' : 'OFF'}
                </button>
              ))}
            </span>
            {/* v226 — POI/business layer (D2 revisit): real businesses
                from OpenStreetMap via Nominatim. OFF by default; the
                query runs only on the owner's explicit tap. */}
            <span className="flex items-center gap-1">
              <span className="text-[#B8B8B8]">PLACES</span>
              {([true, false] as const).map((p) => (
                <button
                  key={String(p)}
                  type="button"
                  onClick={() => setViewSel({ places: p })}
                  aria-pressed={viewSel.places === p}
                  className={`h-9 px-2.5 rounded border transition ${
                    viewSel.places === p
                      ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-white'
                      : 'border-white/15 text-[#B8B8B8] hover:border-white/40'
                  }`}
                >
                  {p ? 'ON' : 'OFF'}
                </button>
              ))}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[#B8B8B8]">LENS</span>
              {(['world', 'crypto', 'earnings', 'security', 'transit', 'coverage'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => applyLens(l)}
                  aria-pressed={viewSel.lens === l}
                  className={`h-9 px-2.5 rounded border transition ${
                    viewSel.lens === l
                      ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-white'
                      : 'border-white/15 text-[#B8B8B8] hover:border-white/40'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </span>
            <span className="text-[#B8B8B8]">ZOOM TO z21 · DRAG · SCROLL · PINCH · DOUBLE-CLICK</span>
          </div>
          {viewSel.lens === 'coverage' && (
            <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-white/10 bg-[#0b0b0b] text-[11px] font-mono">
              {LAYERS.map((l) => (
                <span
                  key={l.id}
                  title={l.statusText}
                  className="px-2 py-1 rounded border border-white/15 bg-[#101010] text-[#B8B8B8]"
                >
                  <span className="text-white">{l.label}</span>
                  {': '}
                  {activeLayers.includes(l.id) ? 'ON' : 'OFF'}
                </span>
              ))}
              <span className="px-2 py-1 text-[#B8B8B8]">Data Coverage: NO DATA / PARTIAL — hover a layer for its status</span>
            </div>
          )}

          <div className="relative w-full h-[58dvh] min-h-[340px] md:aspect-[2/1] md:h-auto xl:aspect-none xl:flex-1 xl:min-h-[460px] bg-[#050505]">
            <WorldMapEngine
              baseStyle={viewSel.base}
              terrain={viewSel.terrain}
              night={viewSel.night}
              floorMode={floorMode}
              defaultMarkerColor={routeColor}
              markerPulse={markerPulse}
              markers={[...(transitOn ? transitStops : []), ...(viewSel.places ? poiMarkers : []), ...(placeMarker ? [placeMarker] : [])]}
              focusPoint={mapFocus}
              links={focusLinks}
              ringMarkerId={focusPoint?.id}
              onViewChange={handleViewChange}
              onStatusChange={setEngineStatus}
              onMarkerSelect={(m) => {
                if (m.id.startsWith('place-')) {
                  setSelectedStop(null);
                  setSelectedPoi(null);
                  return;
                }
                if (m.id.startsWith('poi-')) {
                  setSelectedStop(null);
                  setSelectedPoi(poiRecords[m.id] ?? null);
                  setDepartures({ state: 'idle', message: '', rows: [], fetchedAt: null });
                  setDeparturesDay('TODAY');
                  return;
                }
                setSelectedStop(m);
                setSelectedPoi(null);
                setDepartures({ state: 'idle', message: '', rows: [], fetchedAt: null });
                setDeparturesDay('TODAY');
              }}
            />
            {/* v223 — globe treatment overlay (Tron grid, holographic
                scanlines, data/network dots). The treatment comes from
                data-mti6-globe on the document element; this div is
                only the layer it paints on. */}
            <div className="mti6-globe-overlay" aria-hidden="true" />
            {/* Layer chips — 44px touch targets at every tier (the
                Phase 1 chips were ~18px and failed the rule). Phone:
                overlay, scrolls horizontally. Tablet/Desktop: overlay,
                wraps. Ultra-wide: the chips move to a LEFT RAIL
                (owner ruling R2). */}
            <div className="absolute top-2 left-2 right-2 z-10 pointer-events-none flex flex-col gap-1.5 2xl:right-auto 2xl:bottom-2 2xl:w-48">
              <div className="pointer-events-auto flex gap-1.5 overflow-x-auto md:flex-wrap md:overflow-visible 2xl:flex-col 2xl:flex-nowrap 2xl:overflow-visible">
                {LAYERS.map((layer) => {
                  const isOn = activeLayers.includes(layer.id);
                  const isFocused = focusedLayer === layer.id;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => toggleLayer(layer.id)}
                      aria-pressed={isOn}
                      className={`flex h-11 shrink-0 items-center gap-2 rounded-lg border px-3 font-mono text-[11px] transition ${
                        isOn
                          ? 'bg-[#0b0b0b]/90 text-white'
                          : 'bg-[#0b0b0b]/85 border-white/15 text-[#B8B8B8] hover:border-white/40'
                      } ${isFocused ? 'ring-1 ring-[#0080FF]' : ''}`}
                      style={
                        isOn
                          ? { borderColor: layer.accent, color: '#FFFFFF' }
                          : undefined
                      }
                    >
                      <Layers
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: isOn ? layer.accent : '#B8B8B8' }}
                      />
                      <span className="whitespace-nowrap">{layer.label}</span>
                      <span className="font-mono text-[9px] text-[#B8B8B8]">
                        {layer.id === 'base' ? 'ALWAYS' : isOn ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="pointer-events-auto inline-flex max-w-full items-center gap-2 self-start px-2.5 py-1 rounded bg-[#0b0b0b]/90 border border-[#00B7FF]/30 text-[11px] font-mono text-[#B8B8B8] 2xl:self-stretch">
                <span className="font-semibold shrink-0" style={{ color: focusedMeta.accent }}>
                  {focusedMeta.label}:
                </span>
                <span className="truncate">{focusedMeta.statusText}</span>
              </div>
              {/* D6: with Crypto on, the flat map carries this notice
                  instead of pins — the sphere is the crypto view. */}
              {cryptoOn && (
                <div className="pointer-events-auto self-start rounded border border-[#8B5CFF]/50 bg-[#0b0b0b]/90 px-2.5 py-2 font-mono text-[11px] text-[#B8B8B8] 2xl:self-stretch">
                  <span className="font-semibold text-[#8B5CFF]">CRYPTO IS SPHERE-ONLY.</span>{' '}
                  No crypto pins exist on the flat map — crypto opens as a
                  relationship lens over it.
                  <button
                    type="button"
                    onClick={() => setSphereOpen(true)}
                    className="ml-2 font-semibold text-white underline decoration-[#8B5CFF] underline-offset-2"
                  >
                    OPEN SPHERE
                  </button>
                  {onSelectWorld && (
                    <button
                      type="button"
                      onClick={() => onSelectWorld('crypto')}
                      className="ml-2 font-semibold text-white underline decoration-[#8B5CFF] underline-offset-2"
                    >
                      OPEN CRYPTO WORLD
                    </button>
                  )}
                </div>
              )}
              {/* v226 — POI/business layer: an explicit Nominatim
                  query (never a poll) places real businesses. */}
              {viewSel.places && (
                <div className="pointer-events-auto self-start rounded border border-[#00B7FF]/50 bg-[#0b0b0b]/90 px-2.5 py-2 font-mono text-[11px] text-[#B8B8B8] 2xl:self-stretch">
                  <span className="font-semibold text-[#00B7FF]">PLACES — LIVE QUERY.</span>{' '}
                  {poiQuery.message}
                  {poiQuery.fetchedAt !== null && (
                    <>
                      {' '}
                      SOURCE: OPENSTREETMAP (NOMINATIM) · FETCHED{' '}
                      {new Date(poiQuery.fetchedAt).toLocaleTimeString('en-US', { hour12: false })}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={queryPlaces}
                    disabled={poiQuery.state === 'loading'}
                    className="ml-2 font-semibold text-white underline decoration-[#00B7FF] underline-offset-2 disabled:opacity-50"
                  >
                    {poiQuery.state === 'loading' ? 'QUERYING…' : 'QUERY PLACES NEAR CENTRE'}
                  </button>
                </div>
              )}
              {/* Live transit: an explicit query (never a poll) places
                  real stops — the map's first sourced markers. */}
              {transitOn && (
                <div className="pointer-events-auto self-start rounded border border-[#00B7FF]/50 bg-[#0b0b0b]/90 px-2.5 py-2 font-mono text-[11px] text-[#B8B8B8] 2xl:self-stretch">
                  <span className="font-semibold text-[#00B7FF]">TRANSIT — LIVE QUERY.</span>{' '}
                  {transitQuery.message}
                  {transitQuery.fetchedAt !== null && (
                    <>
                      {' '}
                      SOURCE: TRANSITLAND · FETCHED{' '}
                      {new Date(transitQuery.fetchedAt).toLocaleTimeString('en-US', { hour12: false })}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={queryTransitStops}
                    disabled={transitQuery.state === 'loading'}
                    className="ml-2 font-semibold text-white underline decoration-[#00B7FF] underline-offset-2 disabled:opacity-50"
                  >
                    {transitQuery.state === 'loading' ? 'QUERYING…' : 'QUERY STOPS NEAR CENTRE'}
                  </button>
                  {selectedStop && (
                    <div className="mt-1 hidden border-t border-white/10 pt-1 md:block">
                      STOP: <span className="text-white">{selectedStop.label}</span> ·{' '}
                      {selectedStop.lat.toFixed(5)}, {selectedStop.lon.toFixed(5)} · SOURCE:
                      TRANSITLAND
                      <button
                        type="button"
                        onClick={() => queryDepartures(selectedStop)}
                        disabled={departures.state === 'loading'}
                        className="ml-2 font-semibold text-white underline decoration-[#00B7FF] underline-offset-2 disabled:opacity-50"
                      >
                        {departures.state === 'loading' ? 'QUERYING…' : 'DEPARTURES'}
                      </button>
                      {departures.state !== 'idle' && (
                        <div className="mt-1">
                          <div>{departures.message}</div>
                          {departures.rows.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {departures.rows.map((r, i) => (
                                <li key={i} className="flex justify-between gap-3">
                                  <span className="truncate">{r.label}</span>
                                  <span className="shrink-0 text-white">{r.time}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {departures.fetchedAt !== null && (
                            <div>
                              SOURCE: TRANSITLAND · FETCHED{' '}
                              {new Date(departures.fetchedAt).toLocaleTimeString('en-US', {
                                hour12: false,
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Phone bottom sheet (Gemini transit concept adoption,
                2026-11-23): on phone widths the selected stop's
                departures present as a sheet over the map instead of
                the overlay block (which is md+ only). Same state, same
                query — presentation only. */}
            {transitOn && selectedStop && (
              <div className="absolute inset-x-2 bottom-2 z-20 rounded-xl border border-[#00B7FF]/50 bg-[#0b0b0b]/95 p-3 font-mono text-[11px] text-[#B8B8B8] md:hidden">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white">Stop Departures</div>
                    <div className="truncate">{selectedStop.label}</div>
                    <div>
                      {selectedStop.lat.toFixed(5)}, {selectedStop.lon.toFixed(5)} · SOURCE:
                      TRANSITLAND
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close stop departures"
                    onClick={() => setSelectedStop(null)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {(['TODAY', 'TOMORROW'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDeparturesDay(d);
                        if (departures.state !== 'idle') void queryDepartures(selectedStop, d);
                      }}
                      className={`flex h-11 flex-1 items-center justify-center rounded-lg border ${
                        departuresDay === d
                          ? 'border-[#00B7FF]/60 bg-[#00B7FF]/10 text-white'
                          : 'border-white/15 text-[#B8B8B8]'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => void queryDepartures(selectedStop)}
                    disabled={departures.state === 'loading'}
                    className="flex h-11 flex-1 items-center justify-center rounded-lg border border-[#00B7FF]/60 font-semibold text-white disabled:opacity-50"
                  >
                    {departures.state === 'loading' ? 'QUERYING…' : 'DEPARTURES'}
                  </button>
                </div>
                {departures.state !== 'idle' && (
                  <div className="mt-2">
                    <div>{departures.message}</div>
                    {departures.rows.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {departures.rows.map((r, i) => (
                          <li key={i} className="flex justify-between gap-3">
                            <span className="truncate">{r.label}</span>
                            <span className="shrink-0 text-white">{r.time}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {departures.fetchedAt !== null && (
                      <div>
                        DATA POWERED BY TRANSITLAND · SCHEDULED FEED DATA · FETCHED{' '}
                        {new Date(departures.fetchedAt).toLocaleTimeString('en-US', {
                          hour12: false,
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* The Sphere lens overlays the map panel — the map stays
                home underneath; closing the lens returns to it. */}
            {sphereOpen && cryptoOn && (
              <CryptoSphere onClose={() => setSphereOpen(false)} />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[#00B7FF]/25 bg-[#101010] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#00B7FF]" />
                <h2 className="text-sm font-semibold">Map Position</h2>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#00B7FF]/15 text-[#00B7FF] border border-[#00B7FF]/40">
                {baseLabel}
              </span>
            </div>
            <div className="text-xs text-[#B8B8B8] space-y-1 font-mono">
              <div>CENTRE: {fmtLon(mapView.lon)} · {fmtLat(mapView.lat)}</div>
              <div>LEVEL: {mapView.level} · z{mapView.zoom.toFixed(1)}</div>
              <div>
                TILES: {engineStatus.tilesLoaded} loaded · {engineStatus.tilesFailed} failed (floor beneath)
                {engineStatus.overZoom
                  ? ` · OVER-ZOOM ×${Math.pow(2, Math.max(0, Math.round(mapView.zoom) - engineStatus.nativeTileZoom))} (native z${engineStatus.nativeTileZoom})`
                  : ''}
              </div>
              <div>
                TERRAIN:{' '}
                {engineStatus.terrain === 'HILLSHADE'
                  ? `HILLSHADE — AWS Terrain Tiles · ${engineStatus.shadeTiles} shade tiles (native z15)`
                  : engineStatus.terrain === 'LOADING'
                    ? 'LOADING — AWS Terrain Tiles…'
                    : engineStatus.terrain === 'FAILED'
                      ? 'FAILED — hillshade tiles did not load (base still shows)'
                      : 'OFF — turn on HILLSHADE in MAP VIEW'}
              </div>
              <div>
                NIGHT:{' '}
                {engineStatus.night
                  ? 'ON — terminator from real UTC time (NOAA solar position, refreshed every 5 min)'
                  : 'OFF — turn on NIGHT in MAP VIEW'}
              </div>
              <div>
                MARKERS PLACED: {(transitOn ? transitStops.length : 0) + (viewSel.places ? poiMarkers.length : 0) + (placeMarker ? 1 : 0)}
                {transitOn && transitStops.length > 0
                  ? ' — Transitland stops (sourced locations)'
                  : ' — no verified locations'}
              </div>
            </div>
            <p className="text-xs text-[#B8B8B8]">
              Markers appear only for records with verified locations. Today
              that means the Transitland stops you query for; every other
              layer's record set is empty or unconnected, so the map honestly
              places none of theirs.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-2">
            <div className="text-xs font-mono text-[#00B7FF]">PROVIDER CONTRACTS</div>
            <div className="space-y-1">
              {ALL_ADAPTERS.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 font-mono text-[10px]"
                >
                  <span className="truncate text-[#B8B8B8]">{a.provider}</span>
                  <span
                    className={`shrink-0 ${
                      a.status === 'PLANNED' || a.status === 'NOT_CONNECTED'
                        ? 'text-[#FFB020]'
                        : 'text-white'
                    }`}
                  >
                    {a.status}
                    {a.status === 'PLANNED' ? ' · NOT WIRED' : ''}
                  </span>
                </div>
              ))}
            </div>
            <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
              KEYED PROVIDERS: OWNER APPROVAL + NETLIFY PROXY ONLY (D1) —
              PLANNED MEANS REGISTERED, NEVER CALLED.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-2">
            <div className="text-xs font-mono text-[#00B7FF]">GO TO PLACE — GEOCODING PIPELINE</div>
            <div className="flex gap-2">
              <input
                value={placeText}
                onChange={(e) => setPlaceText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void searchPlace();
                }}
                placeholder="Search a place…"
                className="min-h-[44px] w-full rounded border border-white/15 bg-[#050505] px-2 font-mono text-[11px] text-white outline-none placeholder:text-[#666]"
              />
              <button
                type="button"
                onClick={() => void searchPlace()}
                disabled={placeSearch.state === 'loading' || !placeText.trim()}
                className="min-h-[44px] shrink-0 rounded border border-[#00B7FF]/50 px-3 font-mono text-[11px] text-white disabled:opacity-50"
              >
                {placeSearch.state === 'loading' ? 'SEARCHING…' : 'SEARCH'}
              </button>
            </div>
            <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
              {placeSearch.message}
              {placeSearch.state === 'ok' && placeSearch.provider && placeSearch.fetchedAt && (
                <>
                  {' '}
                  SOURCE: {placeSearch.provider.toUpperCase()} · FETCHED{' '}
                  {new Date(placeSearch.fetchedAt).toLocaleTimeString('en-US', { hour12: false })}
                </>
              )}
            </p>
            {placeSearch.results.length > 0 && (
              <div className="space-y-1">
                {placeSearch.results.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => choosePlace(r)}
                    className="block min-h-[44px] w-full rounded border border-white/10 bg-[#050505] px-2 py-1.5 text-left font-mono text-[10px] text-white"
                  >
                    {r.label}
                    <span className="block text-[9px] text-[#B8B8B8]">
                      {r.lat.toFixed(5)}, {r.lon.toFixed(5)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {placeMarker && (
              <div className="space-y-1.5">
                <p className="font-mono text-[10px] text-[#B8B8B8]">
                  PLACED: <span className="text-white">{placeMarker.label}</span> — coordinates published
                  by the geocoding provider, never guessed.
                </p>
              </div>
            )}
            <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
              CHAIN: GEOAPIFY → LOCATIONIQ, THROUGH THE GATEWAY. KEYS LIVE ONLY IN THE SERVER
              ENVIRONMENT; WITH NONE SET, THIS READS NOT_CONFIGURED AND PLACES NOTHING.
            </p>
          </div>

          {/* v225 — Place Intelligence: the World Engine relationship
              overlay for the focused place or stop. Every line is a
              real record or a measured distance; the map draws the
              focus ↔ nearby-node links and rings the focus. Ask STAR
              moved here from the place card so it works for a stop
              too. */}
          {focusPoint && (
            <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-2">
              <div className="text-xs font-mono text-[#00B7FF]">
                PLACE INTELLIGENCE — WORLD ENGINE RELATIONSHIPS
              </div>
              <p className="font-mono text-[10px] text-[#B8B8B8]">
                FOCUS: <span className="text-white">{focusPoint.label}</span> ·{' '}
                {focusPoint.lat.toFixed(5)}, {focusPoint.lon.toFixed(5)} · SOURCE:{' '}
                {selectedStop ? 'TRANSITLAND' : selectedPoi ? 'OPENSTREETMAP (NOMINATIM)' : 'GEOCODING PROVIDER'}
              </p>
              {selectedPoi && (
                <div>
                  <div className="font-mono text-[10px] text-white">BUSINESS — OVERVIEW</div>
                  <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                    KIND: <span className="text-white">{selectedPoi.kind}</span>
                    {selectedPoi.road && (
                      <>
                        {' '}· ADDRESS: <span className="text-white">{selectedPoi.road}</span>
                      </>
                    )}
                    {selectedPoi.suburb && (
                      <>
                        {', '}
                        <span className="text-white">{selectedPoi.suburb}</span>
                      </>
                    )}
                    {selectedPoi.postcode && (
                      <>
                        {' '}
                        <span className="text-white">{selectedPoi.postcode}</span>
                      </>
                    )}
                    {selectedPoi.city && (
                      <>
                        {', '}
                        <span className="text-white">{selectedPoi.city}</span>
                      </>
                    )}
                  </p>
                  <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                    Products, orders and deliveries are not in OpenStreetMap — they arrive with a
                    business integration, not a map query.
                  </p>
                </div>
              )}
              <div>
                <div className="font-mono text-[10px] text-white">NEARBY NODES — WITHIN 1 KM</div>
                {transitStops.length === 0 ? (
                  <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                    NO_DATA — no transit stops queried yet. Query stops near the centre first; the map
                    then draws the links.
                  </p>
                ) : nearbyStops.length === 0 ? (
                  <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                    NO STOPS WITHIN 1 KM OF THIS PLACE — {transitStops.length} stops are on the map;
                    none is close enough to link.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-0.5">
                    {nearbyStops.map((n) => (
                      <li key={n.stop.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStop(n.stop);
                            setDepartures({ state: 'idle', message: '', rows: [], fetchedAt: null });
                            setDeparturesDay('TODAY');
                          }}
                          className="flex w-full justify-between gap-3 font-mono text-[10px] text-[#B8B8B8] hover:text-white"
                        >
                          <span className="truncate">{n.stop.label}</span>
                          <span className="shrink-0">
                            {Math.round(n.dist)} M ·{' '}
                            {bearingCompass(focusPoint.lat, focusPoint.lon, n.stop.lat, n.stop.lon)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="font-mono text-[10px] text-white">ALERTS IN THIS AREA</div>
                {areaAlerts.length === 0 ? (
                  <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                    NO_DATA — no alert carries an area for this place. Alerts record an area only when
                    the owner sets one at intake.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-0.5">
                    {areaAlerts.map((a) => (
                      <li key={a.id} className="font-mono text-[10px] text-[#B8B8B8]">
                        {a.title} · <span className="text-white">{a.state}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                WORLD ENGINE — canonical graph: 957 nodes · 1,007 relationships · 0 unresolved (live run
                over canonical records). This place has no verified link into it: encyclopedia records
                (1,840) and entities (48) carry no location, and MTI6 never links by name alone.
                Opportunities: radar candidates carry no location — nothing to pin here (D6).
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent('mti6:ask-star', {
                        detail: { text: `What does MTI6 know about ${focusPoint.label}?` },
                      }),
                    )
                  }
                  className="rounded-lg border border-[#8B5CFF]/50 bg-[#8B5CFF]/10 px-2.5 py-1.5 font-mono text-[10px] font-semibold text-[#B8B8B8] hover:text-white"
                >
                  ASK STAR ABOUT THIS PLACE
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMapFocus((f) => ({
                      lon: focusPoint.lon,
                      lat: focusPoint.lat,
                      nonce: (f?.nonce ?? 0) + 1,
                    }))
                  }
                  className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 font-mono text-[10px] font-semibold text-[#B8B8B8] hover:text-white"
                >
                  ZOOM TO FOCUS
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-[#00B7FF]">DATA PROVENANCE — THIS SESSION</div>
              <span className="font-mono text-[10px] text-[#B8B8B8]">{provenance.length}</span>
            </div>
            {provenance.length === 0 ? (
              <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                NO OBSERVATIONS YET — visit Crypto Market or Crypto World and
                every live figure the app serves registers here with its
                source, status, and fetch time. Failures register too.
              </p>
            ) : (
              <div className="space-y-1">
                {provenance.slice(0, 12).map((r) => (
                  <div
                    key={r.key}
                    className="flex items-center justify-between gap-2 font-mono text-[10px]"
                  >
                    <span className="truncate text-[#B8B8B8]">{r.label}</span>
                    <span className="shrink-0 text-white">
                      {r.source ?? '—'} ·{' '}
                      <span
                        style={{
                          color:
                            r.status === 'LIVE'
                              ? '#32D74B'
                              : r.status === 'CACHED'
                                ? '#00B7FF'
                                : r.status === 'STALE'
                                  ? '#FFB020'
                                  : '#B8B8B8',
                        }}
                      >
                        {r.status}
                      </span>
                      {r.fetchedAt !== null && <> · {fmtTime(r.fetchedAt)}</>}
                    </span>
                  </div>
                ))}
                {provenance.length > 12 && (
                  <p className="font-mono text-[9px] text-[#B8B8B8]">
                    + {provenance.length - 12} MORE — the newest 12 are shown.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-2">
            <div className="text-xs font-mono text-[#00B7FF]">COVERAGE HERE</div>
            <div className="text-xs text-[#B8B8B8] space-y-1 font-mono">
              <div>Viewport centre: {fmtLon(mapView.lon)} · {fmtLat(mapView.lat)}</div>
              <div>
                Active Layers:{' '}
                {activeLayers
                  .map((id) => LAYERS.find((l) => l.id === id)?.label)
                  .filter(Boolean)
                  .join(', ')}
              </div>
              <div>Data Coverage: NO DATA / PARTIAL</div>
              <div>Live Telemetry: UNMEASURED</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-2">
            <div className="text-xs font-mono text-[#00B7FF]">COCKPIT HEALTH</div>
            <div className="text-xs text-[#B8B8B8] space-y-1 font-mono">
              <div>System Health: PARTIAL</div>
              <div>STAR Status: DISCONNECTED</div>
              <div>Bot Status: PROPOSE-ONLY</div>
              <div>Data Status: {cockpitDb.status} ({cockpitDb.storeCount} stores)</div>
              <div>Security Status: UNMEASURED</div>
              <div>Alerts: UNMEASURED</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
              <Activity className="h-3.5 w-3.5" />
              <span>ACTIVITY LOG</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px] text-[#B8B8B8]">
              {activityLog.map((entry, idx) => (
                <div key={idx} className="p-1.5 rounded bg-[#151515] border-l-2 border-[#00B7FF]">
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {DOMAIN_RADARS.map((radar) => (
          <button
            key={radar.id}
            type="button"
            onClick={() => onSelectWorld?.(radar.world)}
            className="text-left rounded-xl border border-white/10 bg-[#101010] hover:border-[#00B7FF]/60 p-3 transition space-y-1"
          >
            <div className="text-xs font-semibold text-white">{radar.label}</div>
            <div className="text-[10px] font-mono text-[#B8B8B8]">{radar.status}</div>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Train className="h-4 w-4 text-[#00B7FF]" />
            <span>Transitland Stop Departures</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#151515] border border-white/15 text-[#B8B8B8]">
            NOT_CONNECTED
          </span>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#151515] p-3 space-y-1">
          <p className="text-xs text-[#B8B8B8]">
            No transit feed is connected in this build. No departures, stops, routes, or arrival times are
            shown — no stop IDs or minutes-away figures are claimed.
          </p>
          <p className="text-[11px] font-mono text-white/40">DEPARTURES: NO_DATA · PROVIDER: NOT_CONNECTED</p>
        </div>
      </div>
    </div>
  );
};
