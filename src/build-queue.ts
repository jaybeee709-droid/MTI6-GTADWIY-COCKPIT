/**
 * Build Queue — the BUILDER track (v243): what the bot team has
 * prepared for Muse to build. The bots do NOT write code and never
 * run builds — code is written by Muse in the clone. What the team
 * CAN do in-page is research, spec, and verification, recorded as
 * evidence on each item: what was checked, what the finding was,
 * and the source (file, screen, or gateway read). A build item is
 * PREPARED work; Muse implements it; the owner marks it
 * IMPLEMENTED when it lands (or SUPERSEDED when it is dropped).
 *
 * Seeded from the v242 follow-ons (F2/F3/F4/F6), each verified
 * still unbuilt before it was listed. Every record here is
 * UNVERIFIED preparation — never a build claim. Page-open only,
 * like the rest of the team loop: a closed page runs nothing.
 */
import { listRadarCandidates } from './money-radar';
import { loadTasks } from './worker-tasks';
import * as swapDesk from './swap-desk';

export const BUILD_QUEUE_KEY = 'mti6_build_queue_v1';
const BUILD_QUEUE_SEED_KEY = 'mti6_build_queue_seed_v1';
const MAX_BUILD_ITEMS = 100;

export type BuildItemStatus = 'PREPARED' | 'IMPLEMENTED' | 'SUPERSEDED';
export type BuildItemKind = 'SPEC' | 'RESEARCH' | 'VERIFICATION' | 'BUILD_PREP';

export interface BuildEvidence {
  at: string;
  checked: string;
  finding: string;
  source: string;
}

export interface BuildItem {
  id: string;
  title: string;
  kind: BuildItemKind;
  principalId: string | null;
  status: BuildItemStatus;
  spec: string;
  verifyId: 'f2' | 'f3' | 'f4' | 'f6' | null;
  evidence: BuildEvidence[];
  createdAt: string;
  updatedAt: string;
}

const stamp = (): string => new Date().toISOString();

function ev(checked: string, finding: string, source: string): BuildEvidence {
  return { at: stamp(), checked, finding, source };
}

function seedItems(): BuildItem[] {
  const now = stamp();
  return [
    {
      id: 'build-f2-radar-strip',
      title: 'F2 — Swap Desk radar strip',
      kind: 'BUILD_PREP',
      principalId: 'tribe-judah',
      status: 'PREPARED',
      spec: 'Add a radar strip to the Swap Desk: the strongest radar candidate appears on the desk with a PREPARE FROM CANDIDATE action that fills the desk from the candidate (asset, direction, amount within the $50 boundary). The desk still only prepares — approval and signature stay with the owner.',
      verifyId: 'f2',
      evidence: [
        ev(
          'prepareSwap signature',
          'Manual input only (from/to/amount/network) — no radar-candidate input path exists',
          'src/swap-desk.ts:193',
        ),
        ev(
          'Radar candidates available to the desk',
          'listRadarCandidates() returns recorded UNVERIFIED candidates; nothing in the desk consumes them',
          'src/money-radar.ts',
        ),
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'build-f3-dry-run-rotation',
      title: 'F3 — Dry-run as 7th continuous-discovery rotation step',
      kind: 'BUILD_PREP',
      principalId: 'tribe-gad',
      status: 'PREPARED',
      spec: 'Add dry-run as the 7th step of the continuous-discovery rotation, so the paper evaluation runs on its own cadence while the page is open. Dry-run only — nothing is prepared, signed, or moved.',
      verifyId: 'f3',
      evidence: [
        ev(
          'Continuous-discovery ROTATION',
          '6 steps (money-radar, dex-scan, bridge-scan, pool-vault-scan, opportunity-scan, catalog-check) — dry-run absent',
          'src/worlds/BotOperations.tsx:318-324',
        ),
        ev(
          'dry-run executor exists',
          'dry-run is a runtime executor since v242, so the rotation can call it once added',
          'src/worker-runtime.ts:472',
        ),
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'build-f4-star-task-creation',
      title: 'F4 — STAR task creation from chat',
      kind: 'SPEC',
      principalId: 'tribe-levi',
      status: 'PREPARED',
      spec: 'Let STAR create and assign tasks from chat: "STAR, assign JUDAH to verify X" records a task in the canonical queue (role + principal + UNASSIGNED), visible in Bot Operations. STAR runs executors today but creates nothing.',
      verifyId: 'f4',
      evidence: [
        ev(
          'createTask callers',
          'Called only from BotOperations UI, money-radar dispatch, and runAdHocTask (Monitoring) — no chat path exists',
          'src/worker-tasks.ts',
        ),
        ev(
          'runtimeCommandFor',
          'Chat commands resolve to executors only; no task-creation verb exists',
          'src/worker-runtime.ts:909',
        ),
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'build-f6-windy-twitch-wiring',
      title: 'F6 — Windy webcam + Twitch Helix live-status wiring',
      kind: 'SPEC',
      principalId: 'tribe-asher',
      status: 'PREPARED',
      spec: 'Wire Windy webcams and Twitch Helix live status through the proxy: a cameras.windy action (key in Netlify) and a twitch.live action (client id + secret in Netlify). Both read-only observation — no broadcast, no account actions.',
      verifyId: 'f6',
      evidence: [
        ev(
          'Proxy actions',
          'No windy/twitch action in netlify/functions/mti6-proxy.mjs — the Windy comment says not wired',
          'netlify/functions/mti6-proxy.mjs:76',
        ),
        ev(
          'gateway.status providers',
          'windy/twitch absent from providersConfigured; keys present in Netlify as secrets (Windy + Twitch placed 2026-11-25)',
          'gateway.status 2026-11-25',
        ),
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function loadBuildQueue(): BuildItem[] {
  try {
    const raw = localStorage.getItem(BUILD_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (b): b is BuildItem =>
        !!b &&
        typeof b === 'object' &&
        typeof b.id === 'string' &&
        typeof b.title === 'string' &&
        Array.isArray(b.evidence),
    );
  } catch {
    return [];
  }
}

export function saveBuildQueue(items: BuildItem[]): BuildItem[] {
  const bounded = [...items]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, MAX_BUILD_ITEMS);
  try {
    localStorage.setItem(BUILD_QUEUE_KEY, JSON.stringify(bounded));
  } catch {
    /* storage unavailable — the queue stays in memory for this session */
  }
  return bounded;
}

/* Seed once, on first sight: the four v242 follow-ons, each
 * verified still unbuilt before it was listed. A separate marker
 * key means the owner emptying the queue never re-seeds it. */
export function ensureBuildQueueSeeded(): BuildItem[] {
  try {
    if (localStorage.getItem(BUILD_QUEUE_SEED_KEY)) return loadBuildQueue();
    const seeded = saveBuildQueue(seedItems());
    try {
      localStorage.setItem(BUILD_QUEUE_SEED_KEY, '1');
    } catch {
      /* marker lost — the next load seeds again only if empty */
    }
    return seeded;
  } catch {
    return loadBuildQueue();
  }
}

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item';

export function addBuildItem(
  items: BuildItem[],
  input: { title: string; kind: BuildItemKind; principalId: string | null; spec: string },
): BuildItem[] {
  const title = input.title.trim();
  if (!title) return items;
  const now = stamp();
  const base = `build-${slug(title)}`;
  let id = base;
  let n = 2;
  while (items.some((b) => b.id === id)) id = `${base}-${n++}`;
  const item: BuildItem = {
    id,
    title,
    kind: input.kind,
    principalId: input.principalId,
    status: 'PREPARED',
    spec: input.spec.trim(),
    verifyId: null,
    evidence: [],
    createdAt: now,
    updatedAt: now,
  };
  return saveBuildQueue([item, ...items]);
}

export function addBuildEvidence(
  items: BuildItem[],
  id: string,
  input: { checked: string; finding: string; source: string },
): BuildItem[] {
  const item = items.find((b) => b.id === id);
  if (!item || !input.checked.trim() || !input.finding.trim()) return items;
  const next = items.map((b) =>
    b.id === id
      ? {
          ...b,
          evidence: [...b.evidence, ev(input.checked.trim(), input.finding.trim(), input.source.trim() || 'owner note')],
          updatedAt: stamp(),
        }
      : b,
  );
  return saveBuildQueue(next);
}

export function setBuildItemStatus(
  items: BuildItem[],
  id: string,
  status: BuildItemStatus,
): BuildItem[] {
  if (!items.some((b) => b.id === id)) return items;
  return saveBuildQueue(
    items.map((b) => (b.id === id ? { ...b, status, updatedAt: stamp() } : b)),
  );
}

export function setBuildItemPrincipal(
  items: BuildItem[],
  id: string,
  principalId: string | null,
): BuildItem[] {
  if (!items.some((b) => b.id === id)) return items;
  return saveBuildQueue(
    items.map((b) => (b.id === id ? { ...b, principalId, updatedAt: stamp() } : b)),
  );
}

export interface BuildVerifyContext {
  rotation: string[];
}

/* Re-verify one PREPARED item against the live platform state.
 * Each verdict is computed from what is actually present right
 * now — never from the seed text. When the feature lands, the
 * same check flips: that is how the queue knows it is done. */
export async function verifyBuildItem(
  item: BuildItem,
  ctx: BuildVerifyContext,
): Promise<string> {
  if (item.verifyId === 'f2') {
    const cands = listRadarCandidates();
    const hasStrip =
      typeof (swapDesk as unknown as Record<string, unknown>).prepareFromCandidate === 'function';
    return hasStrip
      ? `Radar strip present: prepareFromCandidate exists in the Swap Desk; ${cands.length} radar candidate(s) recorded.`
      : `${cands.length} radar candidate(s) recorded; Swap Desk still takes manual input only — no prepare-from-candidate path exists. F2 still unbuilt.`;
  }
  if (item.verifyId === 'f3') {
    const inRotation = ctx.rotation.includes('dry-run');
    return inRotation
      ? `dry-run IS in the continuous-discovery rotation (${ctx.rotation.length} steps). F3 built.`
      : `dry-run NOT in the rotation (${ctx.rotation.length} steps: ${ctx.rotation.join(', ')}). F3 still unbuilt.`;
  }
  if (item.verifyId === 'f4') {
    const tasks = loadTasks();
    const starCreated = tasks.filter((t) =>
      t.history.some((h) => (h.note ?? '').includes('STAR chat')),
    ).length;
    return starCreated > 0
      ? `${starCreated} task(s) created from STAR chat recorded. F4 path exists.`
      : '0 tasks created from STAR chat recorded; chat commands resolve to executors only. F4 still unbuilt.';
  }
  if (item.verifyId === 'f6') {
    try {
      const res = await fetch('/api/mti6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'gateway.status' }),
      });
      const env = (await res.json().catch(() => null)) as {
        ok?: boolean;
        data?: { actions?: string[]; providersConfigured?: Record<string, boolean> };
      } | null;
      if (!env?.ok || !Array.isArray(env.data?.actions)) {
        return 'Gateway did not answer a status report — Windy/Twitch wiring not verifiable from this page.';
      }
      const actions = env.data.actions;
      const windy = actions.some((a) => a.includes('windy'));
      const twitch = actions.some((a) => a.includes('twitch'));
      if (windy && twitch) return 'Gateway exposes Windy and Twitch actions. F6 built.';
      if (windy || twitch)
        return `Gateway exposes ${windy ? 'Windy' : 'Twitch'} only; the other is still unwired. F6 partly built.`;
      return 'Gateway exposes no Windy or Twitch action. F6 still unbuilt.';
    } catch {
      return 'Gateway unreachable from this page (preview serves no /api/mti6) — Windy/Twitch wiring not verifiable here.';
    }
  }
  return 'No live verification for this item — evidence is owner-recorded only.';
}

export function buildQueueSummary(): {
  total: number;
  prepared: number;
  implemented: number;
  superseded: number;
  readyTitles: string[];
} {
  const items = loadBuildQueue();
  return {
    total: items.length,
    prepared: items.filter((b) => b.status === 'PREPARED').length,
    implemented: items.filter((b) => b.status === 'IMPLEMENTED').length,
    superseded: items.filter((b) => b.status === 'SUPERSEDED').length,
    readyTitles: items.filter((b) => b.status === 'PREPARED').map((b) => b.title),
  };
}

export function buildQueueSummaryText(): string {
  const s = buildQueueSummary();
  if (s.total === 0)
    return `From the platform's own records: the Build Queue is empty — no build work has been prepared yet. The team prepares research, spec, and verification only; it writes no code.`;
  const ready =
    s.readyTitles.length > 0
      ? ` Ready to build: ${s.readyTitles.join('; ')}.`
      : ' Nothing is ready to build right now.';
  return `From the platform's own records: the Build Queue holds ${s.total} item(s) — ${s.prepared} PREPARED, ${s.implemented} IMPLEMENTED, ${s.superseded} SUPERSEDED.${ready} Each item carries its spec and its evidence (what was checked, what was found, source). The bots prepared the work — they write no code; Muse writes the code in the clone. Nothing here is built until the owner marks it IMPLEMENTED.`;
}
