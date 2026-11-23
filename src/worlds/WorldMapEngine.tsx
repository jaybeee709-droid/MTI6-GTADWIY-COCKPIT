import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Minus, Plus, RotateCcw } from 'lucide-react';

import { MTI6_MAP, zoomLevelFor, type MTI6ZoomLevel } from '../tokens';
import {
  WorldData,
  getWorldGeo,
  projectLat,
  unprojectLat,
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
}

interface WorldMapEngineProps {
  markers?: MapMarker[];
  onViewChange?: (view: MapViewReport) => void;
  onStatusChange?: (status: MapEngineStatus) => void;
  onMarkerSelect?: (marker: MapMarker) => void;
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
  const zoom = Math.max(0, Math.min(20, view.zoom));
  const { halfW, halfH } = halfExtents({ ...view, zoom }, w, h);
  const cx = halfW >= 180 ? 0 : Math.max(-(180 - halfW), Math.min(180 - halfW, view.cx));
  const cy = halfH >= 180 ? 0 : Math.max(-(180 - halfH), Math.min(180 - halfH, view.cy));
  return { cx, cy, zoom };
}

/** Render the vendored Natural Earth geography to a canvas texture.
 *  Returns null where no 2D canvas exists (the plane then carries the
 *  flat ocean colour — the floor is a colour before it is a picture). */
function buildFloorCanvas(): HTMLCanvasElement | null {
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

interface TileEntry {
  mesh: THREE.Mesh;
  loaded: boolean;
}

export const WorldMapEngine: React.FC<WorldMapEngineProps> = ({
  markers = [],
  onViewChange,
  onStatusChange,
  onMarkerSelect,
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const glRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<ViewState>(INITIAL_VIEW);
  const [engineDown, setEngineDown] = useState(false);

  const viewRef = useRef(view);
  const sizeRef = useRef(size);
  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    tileGroup: THREE.Group;
  } | null>(null);
  const tilesRef = useRef<Map<string, TileEntry>>(new Map());
  const loadingRef = useRef<Set<string>>(new Set());
  const failedRef = useRef<Set<string>>(new Set());
  const statusRef = useRef<MapEngineStatus>({
    base: 'FLOOR',
    tileZoom: 0,
    tilesLoaded: 0,
    tilesFailed: 0,
  });

  const applyView = (next: ViewState) => {
    const clamped = clampView(next, sizeRef.current.w, sizeRef.current.h);
    viewRef.current = clamped;
    setView(clamped);
  };

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

    const tileGroup = new THREE.Group();
    scene.add(tileGroup);
    threeRef.current = { renderer, scene, camera, tileGroup };

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
    const t = setTimeout(() => syncTiles(), SETTLE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, size, engineDown]);

  const reportStatus = (tileZoom: number) => {
    let loaded = 0;
    tilesRef.current.forEach((e) => {
      if (e.loaded) loaded += 1;
    });
    const next: MapEngineStatus = {
      base: loaded > 0 ? 'RASTER' : 'FLOOR',
      tileZoom,
      tilesLoaded: loaded,
      tilesFailed: failedRef.current.size,
    };
    statusRef.current = next;
    onStatusChange?.(next);
  };

  const syncTiles = () => {
    const three = threeRef.current;
    if (!three) return;
    const v = viewRef.current;
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;
    const base = WorldData.baseMap(unprojectLat(v.cy), v.cx, v.zoom);
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
            reportStatus(tz);
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
            reportStatus(tz);
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
    reportStatus(tz);
  };

  /* ---- gestures: drag pan, wheel zoom-to-cursor, pinch, dblclick ---- */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let lastPinchDist = 0;

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
      const clampedZoom = Math.max(0, Math.min(20, nextZoom));
      const { halfW, halfH } = halfExtents({ ...v, zoom: clampedZoom }, w, h);
      applyView({
        cx: wx - (px / w - 0.5) * 2 * halfW,
        cy: wy - (0.5 - py / h) * 2 * halfH,
        zoom: clampedZoom,
      });
    };

    const onPointerDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      wrap.setPointerCapture(e.pointerId);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        lastPinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const now = { x: e.offsetX, y: e.offsetY };
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
      pointers.delete(e.pointerId);
      lastPinchDist = 0;
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
  const attribution = WorldData.baseMap(0, 0, view.zoom).attribution;

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
        {size.w > 0 &&
          markers.map((m) => {
            const wx = m.lon;
            const wy = projectLat(m.lat);
            const left = ((wx - (view.cx - halfW)) / (2 * halfW)) * 100;
            const top = ((view.cy + halfH - wy) / (2 * halfH)) * 100;
            if (left < -5 || left > 105 || top < -5 || top > 105) return null;
            const color = m.color ?? MTI6_MAP.marker;
            return (
              <button
                key={m.id}
                type="button"
                aria-label={m.label}
                title={m.label}
                onClick={() => onMarkerSelect?.(m)}
                className="pointer-events-auto absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
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
