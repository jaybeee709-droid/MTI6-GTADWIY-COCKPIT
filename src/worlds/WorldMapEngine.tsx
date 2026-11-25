import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Minus, Plus, RotateCcw } from 'lucide-react';

import { MTI6_MAP, zoomLevelFor, type MTI6ZoomLevel } from '../tokens';
import {
  WorldData,
  getWorldGeo,
  projectLat,
  unprojectLat,
  type MapBaseStyle,
} from '../world-data';

/* Flat world map engine (Phase 2, step 3 — owner directive 2026-11-23).
 *
 * THE MAP IS THE INTERFACE: a three.js WebGL plane under an
 * OrthographicCamera looking straight down. The plane carries, bottom
 * to top: the vendored Natural Earth VECTOR FLOOR (rendered to a
 * texture — always present, works offline, the map is never blank),
 * then keyless OSM raster tiles resolved through WorldData.baseMap,
 * fetched ON SETTLE only (debounced after the gesture ends), viewport
 * tiles only. Markers are DOM elements positioned by projection —
 * keyboard-focusable, screen-reader labelled, 44px touch targets.
 *
 * Projection is Web Mercator in degree units (see world-data.ts):
 * OSM tiles are Mercator, so the floor is Mercator too — an
 * equirectangular floor under Mercator tiles would drift off the
 * coastlines. Zoom is CONTINUOUS; the ten named levels are UI labels
 * read from MTI6_ZOOM_BREAKPOINTS (owner decision D5).
 *
 * HARD RULE: a record with no verified location is never placed here.
 * Markers arrive only through props from layer code that holds a real
 * location; this engine ships with none.
 */

export interface MapMarker {
  id: string;
  lon: number;
  lat: number;
  label: string;
  color?: string;
}

export interface MapViewReport {
  lon: number;
  lat: number;
  zoom: number;
  level: MTI6ZoomLevel;
}

export interface MapEngineStatus {
  base: 'RASTER' | 'FLOOR' | 'ENGINE_UNAVAILABLE';
  tileZoom: number;
  tilesLoaded: number;
  tilesFailed: number;
  // v222 — deep zoom + terrain honesty: overZoom is true when the
  // view zoom is past the tile source's native max (the native tiles
  // are scaled up and the panel says so); terrain reports the
  // hillshade layer's own state.
  overZoom: boolean;
  nativeTileZoom: number;
  terrain: 'OFF' | 'HILLSHADE' | 'LOADING' | 'FAILED';
  shadeTiles: number;
  // v224 — day/night terminator: true while the night plane is on.
  night: boolean;
  // v228 — time travel + cinematic: the simulated epoch ms the
  // terminator is computed for (null = live), and whether the
  // cinematic camera (drift + smooth fly-to) is running.
  simTime: number | null;
  cinematic: boolean;
}

export type MapTerrainMode = 'off' | 'hillshade';

interface WorldMapEngineProps {
  markers?: MapMarker[];
  onViewChange?: (view: MapViewReport) => void;
  onStatusChange?: (status: MapEngineStatus) => void;
  onMarkerSelect?: (marker: MapMarker) => void;
  // Geocode focus (v170): when nonce changes, centre the view on
  // the point at City zoom (D5: z10–12). Points only ever come
  // from a real provider result — never from a guess.
  focusPoint?: { lon: number; lat: number; nonce: number } | null;
  // v222 — map-view selector: base style and terrain hillshade.
  baseStyle?: MapBaseStyle;
  terrain?: MapTerrainMode;
  // v223 — Visual Universe: wireframe floor (Globe Designer) and
  // the route colour / pulse for markers.
  floorMode?: 'filled' | 'wireframe';
  defaultMarkerColor?: string;
  markerPulse?: boolean;
  // v224 — Living World: day/night terminator (default on).
  night?: boolean;
  // v228 — Time travel: an epoch-ms the terminator is computed
  // for instead of now (null = live). Cinematic: slow drift +
  // smooth fly-to camera (camera work only, never data).
  simTime?: number | null;
  cinematic?: boolean;
  // v225 — Place Intelligence: relationship links drawn on the
  // map between two real points (focus ↔ nearby node), plus a
  // ring on the focused marker. Coordinates are projected with
  // the same math as the markers, so lines track the map.
  links?: { id: string; from: { lon: number; lat: number }; to: { lon: number; lat: number } }[];
  ringMarkerId?: string;
  // v231 — Command Mode "What's here?": a tap on empty map
  // (not a marker, not a drag) reports the geographic point.
  onMapTap?: (p: { lat: number; lon: number }) => void;
}

interface ViewState {
  cx: number; // centre, projected x (= lon)
  cy: number; // centre, projected y (Mercator degree units)
  zoom: number; // continuous; integer part ≈ slippy tile zoom
}

const WORLD = 360; // projected world is 360 x 360 degree-units
const INITIAL_VIEW: ViewState = { cx: 0, cy: 20, zoom: 1.15 };
const SETTLE_MS = 250;
const TILE_CACHE_MAX = 120;

function halfExtents(view: ViewState, w: number, h: number) {
  const halfH = 180 / Math.pow(2, view.zoom);
  const halfW = h > 0 ? halfH * (w / h) : halfH;
  return { halfW, halfH };
}

function clampView(view: ViewState, w: number, h: number): ViewState {
  // v222 — deep zoom: the cap is 21 (Google Maps street level).
  // Tile sources serve natively to z19 (terrain to z15); past that
  // the native tiles are scaled up and the panel labels it
  // OVER-ZOOM. The named Location level (D5, maxZoom 20) still
  // reads 'Location' at 21 — zoomLevelFor falls through to it.
  const zoom = Math.max(0, Math.min(21, view.zoom));
  const { halfW, halfH } = halfExtents({ ...view, zoom }, w, h);
  const cx = halfW >= 180 ? 0 : Math.max(-(180 - halfW), Math.min(180 - halfW, view.cx));
  const cy = halfH >= 180 ? 0 : Math.max(-(180 - halfH), Math.min(180 - halfH, view.cy));
  return { cx, cy, zoom };
}

/** Render the vendored Natural Earth geography to a canvas texture.
 *  Returns null where no 2D canvas exists (the plane then carries the
 *  flat ocean colour — the floor is a colour before it is a picture).
 *  v223 — wireframe mode: no land fill, bright coastline strokes
 *  only (the Wireframe / Tron globe types). */
function buildFloorCanvas(wireframe = false): HTMLCanvasElement | null {
  const geo = getWorldGeo();
  if (!geo) return null;
  const S = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const x = (lon: number) => ((lon + 180) / WORLD) * S;
  const y = (lat: number) => ((180 - projectLat(lat)) / WORLD) * S;

  const ocean = ctx.createLinearGradient(0, 0, 0, S);
  ocean.addColorStop(0, MTI6_MAP.ocean);
  ocean.addColorStop(1, MTI6_MAP.oceanDeep);
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, S, S);

  // Graticule every 20 degrees.
  ctx.strokeStyle = MTI6_MAP.graticule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let lon = -160; lon <= 160; lon += 20) {
    ctx.moveTo(x(lon), 0);
    ctx.lineTo(x(lon), S);
  }
  for (let lat = -60; lat <= 60; lat += 20) {
    ctx.moveTo(0, y(lat));
    ctx.lineTo(S, y(lat));
  }
  ctx.stroke();

  const trace = (rings: number[][]) => {
    ctx.beginPath();
    for (const ring of rings) {
      for (let i = 0; i + 1 < ring.length; i += 2) {
        const px = x(ring[i]);
        const py = y(ring[i + 1]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
  };

  if (wireframe) {
    // Wireframe: coastlines only, bright cyan, no fill, no states.
    ctx.strokeStyle = '#00E5FF';
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1.5;
    for (const c of geo.countries) {
      trace(c.p);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return canvas;
  }

  // Land fill, then coastlines, then state borders (lines only).
  for (const c of geo.countries) trace(c.p);
  ctx.fillStyle = MTI6_MAP.land;
  ctx.fill();
  ctx.strokeStyle = MTI6_MAP.coastline;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 1.1;
  for (const c of geo.countries) {
    trace(c.p);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = MTI6_MAP.borderLine;
  ctx.lineWidth = 0.7;
  for (const s of geo.states) {
    trace(s.p);
    ctx.stroke();
  }
  return canvas;
}

/* ---- day/night terminator (v224, Living World) ----
 * The night side of the planet, computed from real UTC time with
 * the standard NOAA solar-position equations — no provider, no
 * feed, just the clock. A 512² canvas (soft twilight band) is
 * drawn as a translucent plane above the raster (z=1.5), so night
 * falls on streets and satellite imagery alike. Recomputed every
 * 5 minutes; the terminator moves ~1.25° in that time. */
function buildNightCanvas(now: Date): HTMLCanvasElement | null {
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(S, S);
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start) / 86400000);
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hour - 12) / 24);
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  const sinDecl = Math.sin(decl);
  const cosDecl = Math.cos(decl);
  const data = img.data;
  for (let py = 0; py < S; py++) {
    const lat = (unprojectLat(180 - (py / S) * 360) * Math.PI) / 180;
    const sinLat = Math.sin(lat);
    const cosLat = Math.cos(lat);
    for (let px = 0; px < S; px++) {
      const lon = (px / S) * 360 - 180;
      const tst = hour * 60 + eqtime + 4 * lon;
      let ha = tst / 4 - 180;
      if (ha < -180) ha += 360;
      if (ha > 180) ha -= 360;
      const cosZ = sinLat * sinDecl + cosLat * cosDecl * Math.cos((ha * Math.PI) / 180);
      // Day above +0.08, full night below -0.08, soft twilight between.
      const alpha = cosZ >= 0.08 ? 0 : cosZ <= -0.08 ? 140 : Math.round((140 * (0.08 - cosZ)) / 0.16);
      const i = (py * S + px) * 4;
      data[i] = 2;
      data[i + 1] = 6;
      data[i + 2] = 24;
      data[i + 3] = alpha;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/* ---- terrain hillshade (v222) ----
 * AWS Terrain Tiles serve terrarium PNGs: elevation (metres) is
 * encoded per pixel as (R*256 + G + B/256) - 32768. The bucket
 * returns Access-Control-Allow-Origin: * (verified 2026-11-25),
 * so the browser can read the pixels. A standard 315°/45° hillshade
 * is computed from the elevation grid; flat ground (slope ~ 0)
 * renders fully transparent, lit slopes faint white, shadowed
 * slopes dark — the shade is an overlay, never a replacement for
 * the base. Native terrarium zoom is z15; past that the z15 tile
 * is reused at the larger mesh size (over-zoom, labelled). */
const TERRAIN_TILE_URL =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const TERRAIN_MAX_ZOOM = 15;

function decodeTerrariumToHillshade(img: HTMLImageElement, cellSizeM: number): HTMLCanvasElement | null {
  const S = 256;
  const src = document.createElement('canvas');
  src.width = S;
  src.height = S;
  const sctx = src.getContext('2d');
  if (!sctx) return null;
  sctx.drawImage(img, 0, 0);
  let data: Uint8ClampedArray;
  try {
    data = sctx.getImageData(0, 0, S, S).data;
  } catch {
    return null; // tainted canvas — the tile is unusable, not an error
  }
  // Elevation grid, one value per pixel.
  const elev = new Float32Array(S * S);
  for (let i = 0; i < S * S; i += 1) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    elev[i] = r * 256 + g + b / 256 - 32768;
  }
  const out = document.createElement('canvas');
  out.width = S;
  out.height = S;
  const octx = out.getContext('2d');
  if (!octx) return null;
  const imgData = octx.createImageData(S, S);
  const od = imgData.data;
  // Hillshade: sun azimuth 315°, altitude 45°. cellSizeM is the
  // ground metres per pixel at this tile zoom (passed in by the
  // caller) — the shade needs relative relief, not survey precision.
  const az = (315 * Math.PI) / 180;
  const alt = (45 * Math.PI) / 180;
  const cosAlt = Math.cos(alt);
  const sinAlt = Math.sin(alt);
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const i = y * S + x;
      const xl = elev[y * S + Math.max(0, x - 1)];
      const xr = elev[y * S + Math.min(S - 1, x + 1)];
      const yt = elev[Math.max(0, y - 1) * S + x];
      const yb = elev[Math.min(S - 1, y + 1) * S + x];
      const dzdx = (xr - xl) / (2 * cellSizeM);
      const dzdy = (yb - yt) / (2 * cellSizeM);
      const slope = Math.atan(Math.hypot(dzdx, dzdy));
      const aspect = Math.atan2(dzdy, -dzdx);
      const shade =
        sinAlt * Math.cos(slope) + cosAlt * Math.sin(slope) * Math.cos(az - aspect);
      const s01 = Math.max(0, Math.min(1, (shade + 1) / 2));
      const o = i * 4;
      if (s01 > 0.5) {
        // Lit slope: faint white, stronger the steeper the light.
        od[o] = 255;
        od[o + 1] = 255;
        od[o + 2] = 255;
        od[o + 3] = Math.round((s01 - 0.5) * 2 * 46);
      } else if (s01 < 0.5) {
        // Shadowed slope: dark, stronger the deeper the shadow.
        od[o] = 0;
        od[o + 1] = 0;
        od[o + 2] = 0;
        od[o + 3] = Math.round((0.5 - s01) * 2 * 140);
      } else {
        od[o + 3] = 0; // flat — fully transparent
      }
    }
  }
  octx.putImageData(imgData, 0, 0);
  return out;
}

interface ShadeEntry {
  mesh: THREE.Mesh;
  loaded: boolean;
}

interface TileEntry {
  mesh: THREE.Mesh;
  loaded: boolean;
}

export const WorldMapEngine: React.FC<WorldMapEngineProps> = ({
  markers = [],
  onViewChange,
  onStatusChange,
  onMarkerSelect,
  focusPoint = null,
  baseStyle = 'streets',
  terrain = 'off',
  floorMode = 'filled',
  defaultMarkerColor,
  markerPulse = false,
  night = true,
  simTime = null,
  cinematic = false,
  links = [],
  ringMarkerId,
  onMapTap,
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // v231 — the tap callback lives in a ref so the gesture
  // effect (mounted once) always calls the latest handler.
  const onMapTapRef = useRef(onMapTap);
  onMapTapRef.current = onMapTap;
  const glRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<ViewState>(INITIAL_VIEW);
  const [engineDown, setEngineDown] = useState(false);

  // v222 — hillshade tile cache (parallel to the raster cache).
  const shadeRef = useRef<Map<string, ShadeEntry>>(new Map());
  const shadeLoadingRef = useRef<Set<string>>(new Set());
  const shadeFailedRef = useRef<Set<string>>(new Set());
  const terrainStateRef = useRef<MapEngineStatus['terrain']>('OFF');
  // v222 — tile source changes (streets <-> satellite <-> floor) must
  // clear the raster cache: tile keys are z/x/y and would otherwise
  // show the old source's tiles under the new one.
  const lastBaseStyleRef = useRef<MapBaseStyle>(baseStyle);
  const baseStyleRef = useRef(baseStyle);
  baseStyleRef.current = baseStyle;
  const terrainRef = useRef(terrain);
  terrainRef.current = terrain;
  const floorMatRef = useRef<THREE.MeshBasicMaterial | null>(null);

  // v223 — wireframe floor: rebuild the floor texture when the
  // Globe Designer switches the floor mode.
  useEffect(() => {
    const mat = floorMatRef.current;
    if (!mat) return;
    const canvas = buildFloorCanvas(floorMode === 'wireframe');
    if (!canvas) return;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    mat.map?.dispose();
    mat.map = tex;
    mat.needsUpdate = true;
  }, [floorMode]);

  // Geocode focus lives with applyView below (v228 fly-to) —
  // the old instant focus effect was removed, not duplicated.

  const viewRef = useRef(view);
  const sizeRef = useRef(size);
  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    tileGroup: THREE.Group;
    shadeGroup: THREE.Group;
  } | null>(null);
  const tilesRef = useRef<Map<string, TileEntry>>(new Map());
  const loadingRef = useRef<Set<string>>(new Set());
  const failedRef = useRef<Set<string>>(new Set());
  const statusRef = useRef<MapEngineStatus>({
    base: 'FLOOR',
    tileZoom: 0,
    tilesLoaded: 0,
    tilesFailed: 0,
    overZoom: false,
    nativeTileZoom: 19,
    terrain: 'OFF',
    shadeTiles: 0,
    night: true,
    simTime: null,
    cinematic: false,
  });

  // v224 — night plane refs + toggle + 5-minute refresh. The plane
  // is created in the setup effect; these effects only drive it.
  const nightMeshRef = useRef<THREE.Mesh | null>(null);
  const nightRef = useRef(night);
  nightRef.current = night;
  // v228 — time travel + cinematic refs (mirror the props so the
  // interval and the animation loop always read the latest value
  // without re-subscribing).
  const simTimeRef = useRef<number | null>(simTime);
  simTimeRef.current = simTime;
  const cinematicRef = useRef(cinematic);
  cinematicRef.current = cinematic;
  const flyAnimRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  useEffect(() => {
    const mesh = nightMeshRef.current;
    if (mesh) mesh.visible = night;
    statusRef.current = { ...statusRef.current, night };
    onStatusChange?.(statusRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [night]);
  useEffect(() => {
    const id = window.setInterval(() => {
      const mesh = nightMeshRef.current as (THREE.Mesh & { material: THREE.MeshBasicMaterial }) | null;
      if (!mesh || !nightRef.current) return;
      // v228 — a simulated time drives the terminator instead of
      // now; live time refreshes every 5 minutes as before.
      const canvas = buildNightCanvas(new Date(simTimeRef.current ?? Date.now()));
      if (!canvas) return;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      mesh.material.map?.dispose();
      mesh.material.map = tex;
      mesh.material.needsUpdate = true;
    }, 300000);
    return () => window.clearInterval(id);
  }, []);
  // v228 — time travel: rebuild the night canvas immediately when
  // the simulated time changes (the 5-minute interval only keeps
  // live time fresh), and report the simulated time in status.
  useEffect(() => {
    const mesh = nightMeshRef.current as (THREE.Mesh & { material: THREE.MeshBasicMaterial }) | null;
    if (mesh && nightRef.current) {
      const canvas = buildNightCanvas(new Date(simTime ?? Date.now()));
      if (canvas) {
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        mesh.material.map?.dispose();
        mesh.material.map = tex;
        mesh.material.needsUpdate = true;
      }
    }
    statusRef.current = { ...statusRef.current, simTime };
    onStatusChange?.(statusRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simTime]);
  // v228 — cinematic: report the camera state in status.
  useEffect(() => {
    statusRef.current = { ...statusRef.current, cinematic };
    onStatusChange?.(statusRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cinematic]);

  const applyView = (next: ViewState) => {
    const clamped = clampView(next, sizeRef.current.w, sizeRef.current.h);
    viewRef.current = clamped;
    setView(clamped);
  };

  // v228 — cinematic fly-to: when cinematic is on, a new focus
  // glides to its point over ~1.2 s (easeInOutCubic) instead of
  // jumping; when off, the jump is instant (the old behaviour).
  // A newer focus, a drag, or cinematic switching off cancels
  // the glide in flight. (This effect replaces the old instant
  // focus effect that lived above applyView.)
  const lastFocusNonce = useRef(0);
  useEffect(() => {
    if (!focusPoint) return;
    if (focusPoint.nonce === lastFocusNonce.current) return;
    lastFocusNonce.current = focusPoint.nonce;
    const target = { cx: focusPoint.lon, cy: projectLat(focusPoint.lat), zoom: 11 };
    if (flyAnimRef.current !== null) {
      cancelAnimationFrame(flyAnimRef.current);
      flyAnimRef.current = null;
    }
    if (!cinematicRef.current) {
      applyView(target);
      return;
    }
    const start = viewRef.current;
    const startTime = performance.now();
    const dur = 1200;
    const tick = (t: number) => {
      const p = Math.max(0, Math.min(1, (t - startTime) / dur));
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      applyView({
        cx: start.cx + (target.cx - start.cx) * e,
        cy: start.cy + (target.cy - start.cy) * e,
        zoom: start.zoom + (target.zoom - start.zoom) * e,
      });
      if (p < 1 && cinematicRef.current) {
        flyAnimRef.current = requestAnimationFrame(tick);
      } else {
        flyAnimRef.current = null;
      }
    };
    flyAnimRef.current = requestAnimationFrame(tick);
    return () => {
      if (flyAnimRef.current !== null) {
        cancelAnimationFrame(flyAnimRef.current);
        flyAnimRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPoint]);

  // v228 — cinematic drift: while cinematic is on, the view
  // centre drifts slowly eastward (~0.07°/s — a slow camera,
  // not data). It pauses while the user drags, while a fly-to
  // is running, and the moment cinematic switches off. Applied
  // at most every 100 ms so the engine is not re-rendered
  // every frame.
  useEffect(() => {
    if (!cinematic) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const step = (t: number) => {
      const dt = Math.min(100, t - last);
      last = t;
      acc += dt;
      if (acc >= 100 && !draggingRef.current && flyAnimRef.current === null) {
        const v = viewRef.current;
        applyView({ ...v, cx: v.cx + 0.0072 * (acc / 100) });
        acc = 0;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cinematic]);

  /* ---- three.js setup (once) ---- */
  useEffect(() => {
    const gl = glRef.current;
    if (!gl) return;
    // Capability gate BEFORE touching any canvas: environments with no
    // WebGL interface (jsdom, very old engines) get the honest
    // ENGINE_UNAVAILABLE state without a single context attempt.
    if (typeof window === 'undefined' || !('WebGLRenderingContext' in window)) {
      setEngineDown(true);
      statusRef.current = { ...statusRef.current, base: 'ENGINE_UNAVAILABLE' };
      onStatusChange?.(statusRef.current);
      return;
    }
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setEngineDown(true);
      statusRef.current = { ...statusRef.current, base: 'ENGINE_UNAVAILABLE' };
      onStatusChange?.(statusRef.current);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    gl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(MTI6_MAP.oceanDeep);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    camera.position.set(0, 0, 100);

    // The vector floor.
    const floorCanvas = buildFloorCanvas();
    let floorMat: THREE.MeshBasicMaterial;
    if (floorCanvas) {
      const tex = new THREE.CanvasTexture(floorCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      floorMat = new THREE.MeshBasicMaterial({ map: tex });
    } else {
      floorMat = new THREE.MeshBasicMaterial({ color: MTI6_MAP.ocean });
    }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD), floorMat);
    floor.position.z = 0;
    scene.add(floor);
    floorMatRef.current = floorMat;

    const tileGroup = new THREE.Group();
    scene.add(tileGroup);
    // v222 — hillshade group sits between the floor (z=0) and the
    // raster tiles (z=1): the shade darkens relief without hiding
    // either layer beneath or above it.
    const shadeGroup = new THREE.Group();
    scene.add(shadeGroup);
    // v224 — night plane above the raster (z=1.5): the terminator
    // darkens floor, hillshade and raster alike. DOM markers sit
    // above it and stay lit.
    // v228 — a persisted simulated time drives the first
    // terminator canvas too, not just live time.
    const nightCanvas = buildNightCanvas(new Date(simTime ?? Date.now()));
    if (nightCanvas) {
      const nightTex = new THREE.CanvasTexture(nightCanvas);
      nightTex.colorSpace = THREE.SRGBColorSpace;
      const nightMat = new THREE.MeshBasicMaterial({ map: nightTex, transparent: true, depthWrite: false });
      const nightMesh = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD), nightMat);
      nightMesh.position.z = 1.5;
      nightMesh.visible = nightRef.current;
      scene.add(nightMesh);
      nightMeshRef.current = nightMesh;
    }
    threeRef.current = { renderer, scene, camera, tileGroup, shadeGroup };

    let raf = 0;
    const loop = () => {
      try {
        const v = viewRef.current;
        const { w, h } = sizeRef.current;
        const { halfW, halfH } = halfExtents(v, w, h);
        camera.left = -halfW;
        camera.right = halfW;
        camera.top = halfH;
        camera.bottom = -halfH;
        camera.position.x = v.cx;
        camera.position.y = v.cy;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      } catch {
        // A renderer that fails mid-flight degrades to the honest
        // ENGINE_UNAVAILABLE state instead of taking the screen down.
        setEngineDown(true);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      tilesRef.current.forEach((entry) => {
        entry.mesh.geometry.dispose();
        (entry.mesh.material as THREE.MeshBasicMaterial).map?.dispose();
        (entry.mesh.material as THREE.Material).dispose();
      });
      tilesRef.current.clear();
      shadeRef.current.forEach((entry) => {
        entry.mesh.geometry.dispose();
        (entry.mesh.material as THREE.MeshBasicMaterial).map?.dispose();
        (entry.mesh.material as THREE.Material).dispose();
      });
      shadeRef.current.clear();
      floorMat.map?.dispose();
      floorMat.dispose();
      floor.geometry.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === gl) gl.removeChild(renderer.domElement);
      threeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- sizing ---- */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const applySize = (width: number, height: number) => {
      const next = { w: Math.max(0, width), h: Math.max(0, height) };
      sizeRef.current = next;
      setSize(next);
      const t = threeRef.current;
      if (t && next.w > 0 && next.h > 0) t.renderer.setSize(next.w, next.h);
      // Re-clamp the centre for the new aspect.
      viewRef.current = clampView(viewRef.current, next.w, next.h);
      setView(viewRef.current);
    };
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        const rect = entries[0].contentRect;
        applySize(rect.width, rect.height);
      });
      ro.observe(wrap);
      return () => ro.disconnect();
    }
    // Fallback for environments without ResizeObserver (e.g. jsdom):
    // measure once and on window resize. Sizing is an enhancement —
    // its absence must never take the screen down.
    const measure = () => {
      const rect = wrap.getBoundingClientRect();
      applySize(rect.width, rect.height);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  /* ---- report the view upward ---- */
  useEffect(() => {
    onViewChange?.({
      lon: view.cx,
      lat: unprojectLat(view.cy),
      zoom: view.zoom,
      level: zoomLevelFor(view.zoom),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  /* ---- tiles: fetch on SETTLE, viewport only ---- */
  useEffect(() => {
    if (engineDown) return;
    const t = setTimeout(() => {
      syncTiles();
      syncShade();
    }, SETTLE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, size, engineDown, baseStyle, terrain]);

  const reportStatus = (tileZoom: number, nativeTileZoom: number) => {
    let loaded = 0;
    tilesRef.current.forEach((e) => {
      if (e.loaded) loaded += 1;
    });
    let shadeLoaded = 0;
    shadeRef.current.forEach((e) => {
      if (e.loaded) shadeLoaded += 1;
    });
    const next: MapEngineStatus = {
      base: loaded > 0 ? 'RASTER' : 'FLOOR',
      tileZoom,
      tilesLoaded: loaded,
      tilesFailed: failedRef.current.size,
      overZoom: Math.round(viewRef.current.zoom) > nativeTileZoom,
      nativeTileZoom,
      terrain: terrainStateRef.current,
      shadeTiles: shadeLoaded,
      night: nightRef.current,
      simTime: simTimeRef.current,
      cinematic: cinematicRef.current,
    };
    statusRef.current = next;
    onStatusChange?.(next);
  };

  /** Remove every raster tile mesh (source change or floor mode). */
  const clearTiles = () => {
    const three = threeRef.current;
    if (!three) return;
    tilesRef.current.forEach((entry) => {
      three.tileGroup.remove(entry.mesh);
      entry.mesh.geometry.dispose();
      (entry.mesh.material as THREE.MeshBasicMaterial).map?.dispose();
      (entry.mesh.material as THREE.Material).dispose();
    });
    tilesRef.current.clear();
    loadingRef.current.clear();
  };

  /** Remove every hillshade mesh (terrain off, or a view reset). */
  const clearShade = () => {
    const three = threeRef.current;
    if (!three) return;
    shadeRef.current.forEach((entry) => {
      three.shadeGroup.remove(entry.mesh);
      entry.mesh.geometry.dispose();
      (entry.mesh.material as THREE.MeshBasicMaterial).map?.dispose();
      (entry.mesh.material as THREE.Material).dispose();
    });
    shadeRef.current.clear();
    shadeLoadingRef.current.clear();
  };

  const syncTiles = () => {
    const three = threeRef.current;
    if (!three) return;
    const v = viewRef.current;
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;
    const style = baseStyleRef.current;
    // A source change invalidates the whole raster cache (same
    // z/x/y keys, different imagery) — clear before syncing.
    if (lastBaseStyleRef.current !== style) {
      lastBaseStyleRef.current = style;
      clearTiles();
    }
    const base = WorldData.baseMapStyle(style);
    // Floor mode: no tiles at all — the vector floor is the map.
    if (style === 'floor' || !base.tileUrlTemplate) {
      clearTiles();
      three.tileGroup.visible = false;
      reportStatus(0, 0);
      return;
    }
    three.tileGroup.visible = true;
    const tz = Math.max(0, Math.min(base.maxTileZoom, Math.round(v.zoom)));
    const n = Math.pow(2, tz);
    const tileSize = WORLD / n;
    const { halfW, halfH } = halfExtents(v, w, h);

    const txMin = Math.max(0, Math.floor((v.cx - halfW + 180) / tileSize));
    const txMax = Math.min(n - 1, Math.floor((v.cx + halfW + 180) / tileSize));
    const tyMin = Math.max(0, Math.floor((180 - (v.cy + halfH)) / tileSize));
    const tyMax = Math.min(n - 1, Math.floor((180 - (v.cy - halfH)) / tileSize));

    const needed = new Set<string>();
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    for (let tx = txMin; tx <= txMax; tx += 1) {
      for (let ty = tyMin; ty <= tyMax; ty += 1) {
        const key = `${tz}/${tx}/${ty}`;
        needed.add(key);
        if (tilesRef.current.has(key) || loadingRef.current.has(key)) continue;
        loadingRef.current.add(key);
        const url = base.tileUrlTemplate
          .replace('{z}', String(tz))
          .replace('{x}', String(tx))
          .replace('{y}', String(ty));
        const mat = new THREE.MeshBasicMaterial({ transparent: false });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(tileSize, tileSize), mat);
        mesh.position.set(-180 + (tx + 0.5) * tileSize, 180 - (ty + 0.5) * tileSize, 1);
        mesh.visible = false;
        three.tileGroup.add(mesh);
        const entry: TileEntry = { mesh, loaded: false };
        tilesRef.current.set(key, entry);
        loader.load(
          url,
          (tex) => {
            loadingRef.current.delete(key);
            tex.colorSpace = THREE.SRGBColorSpace;
            mat.map = tex;
            mat.needsUpdate = true;
            entry.loaded = true;
            mesh.visible = true;
            reportStatus(tz, base.maxTileZoom);
          },
          undefined,
          () => {
            // A failed tile is not an error state: the vector floor
            // shows through, and the status line says FLOOR.
            loadingRef.current.delete(key);
            failedRef.current.add(key);
            three.tileGroup.remove(mesh);
            mesh.geometry.dispose();
            mat.dispose();
            tilesRef.current.delete(key);
            reportStatus(tz, base.maxTileZoom);
          },
        );
      }
    }

    // Evict far-away tiles beyond the cache cap.
    if (tilesRef.current.size > TILE_CACHE_MAX) {
      tilesRef.current.forEach((entry, key) => {
        if (tilesRef.current.size <= TILE_CACHE_MAX) return;
        if (needed.has(key)) return;
        three.tileGroup.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        (entry.mesh.material as THREE.MeshBasicMaterial).map?.dispose();
        (entry.mesh.material as THREE.Material).dispose();
        tilesRef.current.delete(key);
      });
    }
    reportStatus(tz, base.maxTileZoom);
  };

  /* ---- terrain hillshade: fetch on SETTLE, viewport only ---- */
  const syncShade = () => {
    const three = threeRef.current;
    if (!three) return;
    if (terrainRef.current !== 'hillshade') {
      if (shadeRef.current.size > 0) clearShade();
      if (terrainStateRef.current !== 'OFF') {
        terrainStateRef.current = 'OFF';
        reportStatus(Math.round(viewRef.current.zoom), 19);
      }
      return;
    }
    const v = viewRef.current;
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;
    // Terrarium serves natively to z15; past that the z15 tile is
    // reused at the larger mesh size (over-zoom, labelled).
    const tz = Math.max(0, Math.min(TERRAIN_MAX_ZOOM, Math.round(v.zoom)));
    const n = Math.pow(2, tz);
    const tileSize = WORLD / n;
    const { halfW, halfH } = halfExtents(v, w, h);
    const txMin = Math.max(0, Math.floor((v.cx - halfW + 180) / tileSize));
    const txMax = Math.min(n - 1, Math.floor((v.cx + halfW + 180) / tileSize));
    const tyMin = Math.max(0, Math.floor((180 - (v.cy + halfH)) / tileSize));
    const tyMax = Math.min(n - 1, Math.floor((180 - (v.cy - halfH)) / tileSize));
    // Ground metres per pixel at this tile zoom (equator figure;
    // latitude-corrected per tile row below via the centre lat).
    const latRad = (unprojectLat(v.cy) * Math.PI) / 180;
    const cellSizeM = (40075016 * Math.cos(latRad)) / Math.pow(2, tz + 8);
    const needed = new Set<string>();
    for (let tx = txMin; tx <= txMax; tx += 1) {
      for (let ty = tyMin; ty <= tyMax; ty += 1) {
        const key = `shade/${tz}/${tx}/${ty}`;
        needed.add(key);
        if (shadeRef.current.has(key) || shadeLoadingRef.current.has(key)) continue;
        shadeLoadingRef.current.add(key);
        const url = TERRAIN_TILE_URL.replace('{z}', String(tz)).replace('{x}', String(tx)).replace('{y}', String(ty));
        const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(tileSize, tileSize), mat);
        mesh.position.set(-180 + (tx + 0.5) * tileSize, 180 - (ty + 0.5) * tileSize, 0.5);
        mesh.visible = false;
        three.shadeGroup.add(mesh);
        const entry: ShadeEntry = { mesh, loaded: false };
        shadeRef.current.set(key, entry);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          shadeLoadingRef.current.delete(key);
          const shadeCanvas = decodeTerrariumToHillshade(img, cellSizeM);
          if (!shadeCanvas) {
            shadeFailedRef.current.add(key);
            three.shadeGroup.remove(mesh);
            mesh.geometry.dispose();
            mat.dispose();
            shadeRef.current.delete(key);
            terrainStateRef.current = 'FAILED';
            reportStatus(Math.round(viewRef.current.zoom), 19);
            return;
          }
          const tex = new THREE.CanvasTexture(shadeCanvas);
          tex.colorSpace = THREE.SRGBColorSpace;
          mat.map = tex;
          mat.needsUpdate = true;
          entry.loaded = true;
          mesh.visible = true;
          terrainStateRef.current = 'HILLSHADE';
          reportStatus(Math.round(viewRef.current.zoom), 19);
        };
        img.onerror = () => {
          shadeLoadingRef.current.delete(key);
          shadeFailedRef.current.add(key);
          three.shadeGroup.remove(mesh);
          mesh.geometry.dispose();
          mat.dispose();
          shadeRef.current.delete(key);
          terrainStateRef.current = 'FAILED';
          reportStatus(Math.round(viewRef.current.zoom), 19);
        };
        if (terrainStateRef.current === 'OFF') terrainStateRef.current = 'LOADING';
        img.src = url;
      }
    }
    if (shadeRef.current.size > TILE_CACHE_MAX) {
      shadeRef.current.forEach((entry, key) => {
        if (shadeRef.current.size <= TILE_CACHE_MAX) return;
        if (needed.has(key)) return;
        three.shadeGroup.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        (entry.mesh.material as THREE.MeshBasicMaterial).map?.dispose();
        (entry.mesh.material as THREE.Material).dispose();
        shadeRef.current.delete(key);
      });
    }
    reportStatus(Math.round(viewRef.current.zoom), 19);
  };

  /* ---- gestures: drag pan, wheel zoom-to-cursor, pinch, dblclick ---- */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let lastPinchDist = 0;
    // v231 — the press that may become a tap: its position,
    // time, and whether it started on a button (a marker or a
    // control — those keep their own clicks, never a map tap).
    let downAt: { x: number; y: number; t: number; onButton: boolean } | null = null;

    const worldAt = (px: number, py: number) => {
      const v = viewRef.current;
      const { w, h } = sizeRef.current;
      const { halfW, halfH } = halfExtents(v, w, h);
      return {
        wx: v.cx + (px / w - 0.5) * 2 * halfW,
        wy: v.cy + (0.5 - py / h) * 2 * halfH,
      };
    };
    const zoomAt = (px: number, py: number, nextZoom: number) => {
      const v = viewRef.current;
      const { w, h } = sizeRef.current;
      if (w === 0 || h === 0) return;
      const { wx, wy } = worldAt(px, py);
      const clampedZoom = Math.max(0, Math.min(21, nextZoom));
      const { halfW, halfH } = halfExtents({ ...v, zoom: clampedZoom }, w, h);
      applyView({
        cx: wx - (px / w - 0.5) * 2 * halfW,
        cy: wy - (0.5 - py / h) * 2 * halfH,
        zoom: clampedZoom,
      });
    };

    const onPointerDown = (e: PointerEvent) => {
      // v231 — tap positions come from client coords against
      // the wrap's box, not offsetX: the press may land on the
      // canvas child (its own offset origin) while the release
      // retargets to the wrap under pointer capture, and the two
      // origins disagree by the canvas offset.
      const rect = wrap.getBoundingClientRect();
      pointers.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top });
      wrap.setPointerCapture(e.pointerId);
      downAt = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        t: Date.now(),
        onButton: (e.target as HTMLElement | null)?.closest?.('button') !== null,
      };
      // v228 — a drag takes the camera from cinematic: stop any
      // fly-to in flight and mark the drag so the drift pauses.
      draggingRef.current = true;
      if (flyAnimRef.current !== null) {
        cancelAnimationFrame(flyAnimRef.current);
        flyAnimRef.current = null;
      }
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        lastPinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      // v231 — same wrap-relative client coords as pointerdown:
      // offsetX changes origin between the canvas child and the
      // wrap under pointer capture, which would jump the pan.
      const rect = wrap.getBoundingClientRect();
      const now = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      pointers.set(e.pointerId, now);
      const v = viewRef.current;
      const { w, h } = sizeRef.current;
      if (w === 0 || h === 0) return;
      if (pointers.size === 1) {
        const { halfW, halfH } = halfExtents(v, w, h);
        applyView({
          ...v,
          cx: v.cx - ((now.x - prev.x) / w) * 2 * halfW,
          cy: v.cy + ((now.y - prev.y) / h) * 2 * halfH,
        });
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastPinchDist > 0 && dist > 0) {
          zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, v.zoom + Math.log2(dist / lastPinchDist));
        }
        lastPinchDist = dist;
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      // v231 — a tap is a short, near-motionless single-pointer
      // press on empty map (not on a marker or control button,
      // not a drag, not a pinch). It reports the geographic
      // point so the globe can answer "What's here?".
      if (downAt && pointers.size === 1 && !downAt.onButton) {
        const rect = wrap.getBoundingClientRect();
        const moved = Math.hypot(e.clientX - rect.left - downAt.x, e.clientY - rect.top - downAt.y);
        if (moved < 6 && Date.now() - downAt.t < 500) {
          const { wx, wy } = worldAt(downAt.x, downAt.y);
          onMapTapRef.current?.({ lat: unprojectLat(wy), lon: wx });
        }
      }
      downAt = null;
      pointers.delete(e.pointerId);
      lastPinchDist = 0;
      if (pointers.size === 0) draggingRef.current = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.offsetX, e.offsetY, viewRef.current.zoom - e.deltaY * 0.0025);
    };
    const onDblClick = (e: MouseEvent) => {
      zoomAt(e.offsetX, e.offsetY, viewRef.current.zoom + 1);
    };

    wrap.addEventListener('pointerdown', onPointerDown);
    wrap.addEventListener('pointermove', onPointerMove);
    wrap.addEventListener('pointerup', onPointerUp);
    wrap.addEventListener('pointercancel', onPointerUp);
    wrap.addEventListener('wheel', onWheel, { passive: false });
    wrap.addEventListener('dblclick', onDblClick);
    return () => {
      wrap.removeEventListener('pointerdown', onPointerDown);
      wrap.removeEventListener('pointermove', onPointerMove);
      wrap.removeEventListener('pointerup', onPointerUp);
      wrap.removeEventListener('pointercancel', onPointerUp);
      wrap.removeEventListener('wheel', onWheel);
      wrap.removeEventListener('dblclick', onDblClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { halfW, halfH } = halfExtents(view, size.w, size.h);
  const level = zoomLevelFor(view.zoom);
  const attribution = WorldData.baseMapStyle(baseStyle).attribution;

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none select-none overflow-hidden"
      style={{ backgroundColor: MTI6_MAP.oceanDeep }}
      aria-label="Flat world map. Drag to pan, scroll to zoom."
    >
      <div ref={glRef} className="absolute inset-0" />

      {engineDown && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="max-w-sm font-mono text-[11px] text-[#B8B8B8]">
            MAP ENGINE UNAVAILABLE IN THIS ENVIRONMENT — WebGL is required for the
            flat map. Geography data is vendored locally; nothing was fetched.
          </p>
        </div>
      )}

      {/* DOM markers, positioned by projection. 44px targets. */}
      <div className="pointer-events-none absolute inset-0">
        {/* v225 — relationship links: focus ↔ nearby node, drawn
            in the same % space as the markers (viewBox 0 0 100 100
            maps 1:1 to the container; off-screen ends are clipped
            by the SVG bounds). */}
        {links.length > 0 && size.w > 0 && (
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {links.map((l) => {
              const fx = ((l.from.lon - (view.cx - halfW)) / (2 * halfW)) * 100;
              const fy = ((view.cy + halfH - projectLat(l.from.lat)) / (2 * halfH)) * 100;
              const tx = ((l.to.lon - (view.cx - halfW)) / (2 * halfW)) * 100;
              const ty = ((view.cy + halfH - projectLat(l.to.lat)) / (2 * halfH)) * 100;
              return (
                <line
                  key={l.id}
                  x1={fx}
                  y1={fy}
                  x2={tx}
                  y2={ty}
                  vectorEffect="non-scaling-stroke"
                  stroke={defaultMarkerColor ?? MTI6_MAP.marker}
                  strokeWidth={1.5}
                  strokeOpacity={0.65}
                  strokeDasharray="4 3"
                />
              );
            })}
          </svg>
        )}
        {size.w > 0 &&
          markers.map((m) => {
            const wx = m.lon;
            const wy = projectLat(m.lat);
            const left = ((wx - (view.cx - halfW)) / (2 * halfW)) * 100;
            const top = ((view.cy + halfH - wy) / (2 * halfH)) * 100;
            if (left < -5 || left > 105 || top < -5 || top > 105) return null;
            const color = m.color ?? defaultMarkerColor ?? MTI6_MAP.marker;
            return (
              <button
                key={m.id}
                type="button"
                aria-label={m.label}
                title={m.label}
                onClick={() => onMarkerSelect?.(m)}
                className={`pointer-events-auto absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center${markerPulse ? ' mti6-marker-pulse' : ''}${m.id === ringMarkerId ? ' mti6-marker-ring' : ''}`}
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <span
                  className="block h-3 w-3 rounded-full border-2"
                  style={{ backgroundColor: color, borderColor: MTI6_MAP.oceanDeep }}
                />
              </button>
            );
          })}
      </div>

      {/* Zoom level chip */}
      <div className="pointer-events-none absolute right-2 top-2 rounded border border-white/15 bg-[#0b0b0b]/85 px-2 py-1 font-mono text-[10px] text-[#B8B8B8]">
        <span className="font-semibold text-white">{level}</span> · z{view.zoom.toFixed(1)}
      </div>

      {/* Attribution — required by the OSM tile policy, and honest
          about the floor beneath the tiles. */}
      <div className="pointer-events-none absolute bottom-1 left-2 font-mono text-[10px] text-white/60">
        {attribution} · Floor: Natural Earth (public domain)
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => applyView({ ...viewRef.current, zoom: viewRef.current.zoom + 1 })}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-[#101010]/90 text-white hover:border-[#00B7FF]/60"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => applyView({ ...viewRef.current, zoom: viewRef.current.zoom - 1 })}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-[#101010]/90 text-white hover:border-[#00B7FF]/60"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Reset view"
          onClick={() => applyView(INITIAL_VIEW)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-[#101010]/90 text-white hover:border-[#00B7FF]/60"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
