import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw, X } from 'lucide-react';

import {
  CRYPTO_WORKSPACES,
  CRYPTO_WORKSPACE_GROUPS,
  type CryptoWorkspaceRow,
  type WorkspaceGroupId,
} from '../crypto-workspaces-data';
import { CRYPTO_WORLD_CONTENTS, CRYPTO_CONTENT_GROUPS } from '../worlds-data';

/* Crypto Sphere — the LENS (Phase 2, step 5 — owner directive
 * 2026-11-23, decision D3).
 *
 * Selecting the Crypto layer presents this sphere INSTEAD of pins:
 * crypto has no flat-map geography (D6), so its view is a
 * RELATIONSHIP view — the 56 registry workspaces as nodes, clustered
 * by their registry group, each node carrying its recorded registry
 * state (status111, ladder top, gating) and nothing else. No live
 * feed is connected; no price, balance, or activity is rendered.
 *
 * D3 layering, as the data honestly supports it: the FUNCTION source
 * is the 56-workspace registry (the sphere itself); the GROUPING
 * layer in the panel is the 24 canonical contents from js/worlds.js
 * under their four content groups. The canonical registry maps
 * workspaces to encyclopedia families — that bridge is not mirrored
 * into this app, so no workspace-to-content mapping is invented here.
 */

const GROUP_COLORS: Record<WorkspaceGroupId, string> = {
  core: '#00B7FF',
  trading: '#8B5CFF',
  routing: '#0080FF',
  yield: '#C8CFD8',
  derivatives: '#B79CFF',
  infrastructure: '#7FA8C9',
  specialized: '#0057B8',
};

const RADIUS = 10;

function hash01(text: string, salt: number): number {
  let h = 2166136261 + salt * 97;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Deterministic point on the sphere (fibonacci lattice). */
function spherePoint(index: number, total: number): THREE.Vector3 {
  const y = 1 - (index / Math.max(1, total - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = index * 2.399963;
  return new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
}

interface NodeDatum {
  row: CryptoWorkspaceRow;
  position: THREE.Vector3;
}

function buildNodes(): { nodes: NodeDatum[]; centres: Map<WorkspaceGroupId, THREE.Vector3> } {
  const groups = CRYPTO_WORKSPACE_GROUPS.map((g) => g.id);
  const centres = new Map<WorkspaceGroupId, THREE.Vector3>();
  groups.forEach((gid, i) => {
    centres.set(gid, spherePoint(i, groups.length).multiplyScalar(RADIUS));
  });
  const nodes: NodeDatum[] = CRYPTO_WORKSPACES.map((row) => {
    const centre = centres.get(row.group)!.clone();
    // Deterministic jitter around the group centre, capped so clusters
    // stay readable; the position is layout, never geography or data.
    const jitter = new THREE.Vector3(
      hash01(row.id, 1) - 0.5,
      hash01(row.id, 2) - 0.5,
      hash01(row.id, 3) - 0.5,
    ).multiplyScalar(3.4);
    const position = centre.add(jitter).normalize().multiplyScalar(RADIUS);
    return { row, position };
  });
  return { nodes, centres };
}

export const CryptoSphere: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const glRef = useRef<HTMLDivElement | null>(null);
  const [webglDown, setWebglDown] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<CryptoWorkspaceRow | null>(null);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const nodeMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const rotationRef = useRef({ x: 0.35, y: 0.6 });
  const cameraZRef = useRef(26);

  const { nodes, centres } = useMemo(buildNodes, []);

  const selectWorkspace = (row: CryptoWorkspaceRow | null) => {
    selectedRef.current = row?.id ?? null;
    setSelectedWorkspace(row);
    // Re-apply highlight immediately for meshes that already exist.
    nodeMeshesRef.current.forEach((mesh, id) => {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const datum = nodes.find((n) => n.row.id === id);
      if (!datum) return;
      if (id === row?.id) {
        mat.color.set('#FFFFFF');
        mesh.scale.setScalar(1.9);
      } else {
        mat.color.set(GROUP_COLORS[datum.row.group]);
        mesh.scale.setScalar(1);
      }
    });
  };

  /* ---- three.js sphere (once) ---- */
  useEffect(() => {
    const gl = glRef.current;
    if (!gl) return;
    if (typeof window === 'undefined' || !('WebGLRenderingContext' in window)) {
      setWebglDown(true);
      return;
    }
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setWebglDown(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    gl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050505');
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 200);
    camera.position.set(0, 0, cameraZRef.current);

    const world = new THREE.Group();
    scene.add(world);

    // The shell — a relationship surface, not a planet.
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS, 40, 28),
      new THREE.MeshBasicMaterial({
        color: '#8B5CFF',
        wireframe: true,
        transparent: true,
        opacity: 0.08,
      }),
    );
    world.add(shell);

    // Workspace nodes + spokes to their group centres.
    const nodeGeo = new THREE.SphereGeometry(0.22, 12, 10);
    const linePositions: number[] = [];
    for (const datum of nodes) {
      const mat = new THREE.MeshBasicMaterial({ color: GROUP_COLORS[datum.row.group] });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      mesh.position.copy(datum.position);
      mesh.userData.workspaceId = datum.row.id;
      world.add(mesh);
      nodeMeshesRef.current.set(datum.row.id, mesh);
      const centre = centres.get(datum.row.group)!;
      linePositions.push(datum.position.x, datum.position.y, datum.position.z);
      linePositions.push(centre.x * 0.92, centre.y * 0.92, centre.z * 0.92);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ color: '#8B5CFF', transparent: true, opacity: 0.22 }),
    );
    world.add(lines);
    // Group centres as slightly larger anchor nodes.
    centres.forEach((pos, gid) => {
      const anchor = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 12, 10),
        new THREE.MeshBasicMaterial({ color: GROUP_COLORS[gid] }),
      );
      anchor.position.copy(pos.clone().multiplyScalar(0.92));
      world.add(anchor);
    });

    // Picking.
    const raycaster = new THREE.Raycaster();
    const pointerVec = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerVec, camera);
      const hits = raycaster.intersectObjects([...nodeMeshesRef.current.values()]);
      const id = hits[0]?.object.userData.workspaceId as string | undefined;
      const row = id ? CRYPTO_WORKSPACES.find((w) => w.id === id) ?? null : null;
      selectWorkspace(row);
    };
    renderer.domElement.addEventListener('click', onClick);

    // Drag rotate + wheel zoom (native listeners on the container).
    const pointers = new Map<number, { x: number; y: number }>();
    let lastInteraction = 0;
    const onPointerDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      gl.setPointerCapture(e.pointerId);
      lastInteraction = performance.now();
    };
    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      rotationRef.current.y += (e.offsetX - prev.x) * 0.008;
      rotationRef.current.x += (e.offsetY - prev.y) * 0.008;
      rotationRef.current.x = Math.max(-1.4, Math.min(1.4, rotationRef.current.x));
      lastInteraction = performance.now();
    };
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      lastInteraction = performance.now();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraZRef.current = Math.max(15, Math.min(44, cameraZRef.current + e.deltaY * 0.02));
      lastInteraction = performance.now();
    };
    gl.addEventListener('pointerdown', onPointerDown);
    gl.addEventListener('pointermove', onPointerMove);
    gl.addEventListener('pointerup', onPointerUp);
    gl.addEventListener('pointercancel', onPointerUp);
    gl.addEventListener('wheel', onWheel, { passive: false });

    const resize = () => {
      const w = gl.clientWidth;
      const h = gl.clientHeight;
      if (w > 0 && h > 0) {
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    const loop = () => {
      try {
        // Gentle idle rotation — presentation of structure, not data.
        if (pointers.size === 0 && performance.now() - lastInteraction > 2500) {
          rotationRef.current.y += 0.0016;
        }
        world.rotation.set(rotationRef.current.x, rotationRef.current.y, 0);
        camera.position.z = cameraZRef.current;
        renderer.render(scene, camera);
      } catch {
        setWebglDown(true);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      gl.removeEventListener('pointerdown', onPointerDown);
      gl.removeEventListener('pointermove', onPointerMove);
      gl.removeEventListener('pointerup', onPointerUp);
      gl.removeEventListener('pointercancel', onPointerUp);
      gl.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('click', onClick);
      nodeMeshesRef.current.clear();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry.dispose();
          const mat = obj.material as THREE.Material;
          mat.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === gl) gl.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contentsByGroup = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const content of CRYPTO_WORLD_CONTENTS) {
      const group = CRYPTO_CONTENT_GROUPS[content] ?? 'Other';
      map.set(group, [...(map.get(group) ?? []), content]);
    }
    return [...map.entries()];
  }, []);

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#050505]/[.98]">
      {/* Lens header */}
      <div className="flex items-center justify-between gap-3 border-b border-[#8B5CFF]/30 bg-[#101010] px-4 py-2.5">
        <div>
          <div className="font-mono text-xs font-semibold text-[#8B5CFF]">
            CRYPTO SPHERE — RELATIONSHIP LENS
          </div>
          <div className="text-[11px] text-[#B8B8B8]">
            Not geography: the 56 registry workspaces and their groups. Drag to
            rotate, scroll to zoom, click a node for its recorded state.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Reset sphere view"
            onClick={() => {
              rotationRef.current = { x: 0.35, y: 0.6 };
              cameraZRef.current = 26;
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-[#151515] text-white hover:border-[#8B5CFF]/60"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the Crypto Sphere and return to the flat map"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#8B5CFF]/50 bg-[#8B5CFF]/15 px-3 font-mono text-[11px] text-white hover:bg-[#8B5CFF]/25"
          >
            <X className="h-4 w-4" /> FLAT MAP
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Sphere canvas */}
        <div ref={glRef} className="relative min-h-[300px] flex-1 touch-none select-none">
          {webglDown && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <p className="max-w-sm font-mono text-[11px] text-[#B8B8B8]">
                SPHERE UNAVAILABLE IN THIS ENVIRONMENT — WebGL is required for
                the 3D lens. The registry state beside it is complete: nothing
                was fetched and nothing is hidden.
              </p>
            </div>
          )}
        </div>

        {/* Selector + detail panel */}
        <div className="w-full shrink-0 space-y-4 overflow-y-auto border-t border-white/10 bg-[#0b0b0b] p-3 md:w-80 md:border-l md:border-t-0">
          {selectedWorkspace && (
            <div className="rounded-xl border border-[#8B5CFF]/50 bg-[#101010] p-3">
              <div className="text-xs font-semibold text-white">{selectedWorkspace.title}</div>
              <div className="mt-1.5 space-y-1 font-mono text-[10px] text-[#B8B8B8]">
                <div>
                  GROUP:{' '}
                  {CRYPTO_WORKSPACE_GROUPS.find((g) => g.id === selectedWorkspace.group)?.label}
                </div>
                <div>REGISTRY STATUS: {selectedWorkspace.status}</div>
                <div>LADDER TOP: {selectedWorkspace.ladderTop} — EXECUTION DISABLED</div>
                {selectedWorkspace.gated && (
                  <div>OWNER-GATED SEAT — no canonical activity; none invented</div>
                )}
                <div>FRAME: {selectedWorkspace.frame.toUpperCase()}</div>
              </div>
              <button
                type="button"
                onClick={() => selectWorkspace(null)}
                className="mt-2 font-mono text-[10px] text-[#8B5CFF]"
              >
                CLEAR SELECTION
              </button>
            </div>
          )}

          {selectedContent && (
            <div className="rounded-xl border border-white/15 bg-[#101010] p-3">
              <div className="text-xs font-semibold text-white">{selectedContent}</div>
              <div className="mt-1 font-mono text-[10px] text-[#B8B8B8]">
                CONTENT GROUP: {CRYPTO_CONTENT_GROUPS[selectedContent] ?? '—'}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#B8B8B8]">
                A canonical Crypto World content (js/worlds.js). No live feed is
                connected for any content — the sphere renders recorded registry
                state only, never prices or activity.
              </p>
            </div>
          )}

          <div>
            <div className="mb-1.5 font-mono text-[10px] tracking-widest text-[#8B5CFF]">
              CONTENTS — THE 24 (CANONICAL)
            </div>
            {contentsByGroup.map(([group, contents]) => (
              <div key={group} className="mb-2">
                <div className="mb-1 text-[10px] font-semibold text-[#B8B8B8]">{group}</div>
                <div className="flex flex-wrap gap-1">
                  {contents.map((content) => (
                    <button
                      key={content}
                      type="button"
                      onClick={() =>
                        setSelectedContent((c) => (c === content ? null : content))
                      }
                      className={`rounded border px-1.5 py-1 text-[10px] transition ${
                        selectedContent === content
                          ? 'border-[#8B5CFF] bg-[#8B5CFF]/20 text-white'
                          : 'border-white/10 bg-[#151515] text-[#B8B8B8] hover:border-[#8B5CFF]/50 hover:text-white'
                      }`}
                    >
                      {content}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-1.5 font-mono text-[10px] tracking-widest text-[#8B5CFF]">
              WORKSPACES — THE 56 (REGISTRY)
            </div>
            {CRYPTO_WORKSPACE_GROUPS.map((group) => (
              <div key={group.id} className="mb-2">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold text-[#B8B8B8]">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: GROUP_COLORS[group.id] }}
                  />
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {CRYPTO_WORKSPACES.filter((w) => w.group === group.id).map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => selectWorkspace(w)}
                      className={`flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left text-[10px] transition ${
                        selectedWorkspace?.id === w.id
                          ? 'bg-[#8B5CFF]/20 text-white'
                          : 'text-[#B8B8B8] hover:bg-[#151515] hover:text-white'
                      }`}
                    >
                      <span className="truncate">{w.title}</span>
                      <span className="shrink-0 font-mono text-[8px] text-[#B8B8B8]">
                        {w.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="border-t border-white/10 pt-2 font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
            EXECUTION CAPABILITY: EXECUTION DISABLED ON EVERY REGISTRY ROW ·
            FEEDS NOT_CONNECTED · NODE POSITIONS ARE LAYOUT, NEVER GEOGRAPHY OR
            MARKET DATA
          </p>
        </div>
      </div>
    </div>
  );
};
