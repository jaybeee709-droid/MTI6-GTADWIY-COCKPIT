/* Worker Runtime — the in-page execution engine (worker-runtime
 * phase, owner-called 2026-11-23). This is the platform's first
 * REAL worker activity, and its limits are stated on its face:
 *
 *  - It runs IN THIS PAGE, only while the page is open. A closed
 *    page runs nothing. There is still no remote/always-on
 *    runtime; that stays NOT_CONNECTED.
 *  - It executes only the executor kinds defined here — real
 *    computations and governed fetches against the platform's
 *    own data and pipelines. It cannot execute financial actions;
 *    the ladder still ends at PREPARED.
 *  - Every run moves its task through the canonical transitions
 *    (worker-tasks.ts) and completes it with the run's own
 *    evidence — the words the run actually produced. A failed
 *    run marks the task FAILED with the reason.
 *  - Every completed run writes ONE Bot Memory record
 *    (ASSIGNMENT_OUTCOME, UNVERIFIED, source 'worker-runtime') —
 *    the memory layer's first governed producer, the wiring the
 *    v165 port deliberately held for this phase.
 *
 * Which queue tasks are runtime-executable lives in a small
 * registry of its own (mti6_runtime_kinds_v1: taskId → executor
 * id), so the canonical task record keeps its exact shape.
 */
import { fetchHistory, fetchPrice, fetchYields, fmtTime, fmtUsd } from './live-data';
import { CANONICAL_60, ENCYCLOPEDIA_COUNTS, ENCYCLOPEDIA_FAMILIES, ENCYCLOPEDIA_INDEX } from './encyclopedia-data';
import { ENTITY_UNIVERSE } from './entity-data';
import { WORKSPACE_COVERAGE } from './workspace-coverage-data';
import { CRYPTO_WORKSPACES } from './crypto-workspaces-data';
import { memorySummary, recordMemory } from './bot-memory';
import { PROXY_ACTIONS, PROXY_ENV_NAMES, PROXY_PROVIDERS } from './security-posture-data';
import { createTask, loadTasks, transitionTask, type WorkerTask } from './worker-tasks';

export interface RuntimeExecutor {
  id: string;
  label: string;
  does: string;
  run: () => Promise<string>;
}

export const EXECUTORS: RuntimeExecutor[] = [
  {
    id: 'price-check',
    label: 'PRICE CHECK',
    does: 'Fetches governed BTC/ETH/SOL prices through the live-data chains and reports each value with its source and status.',
    run: async () => {
      const parts: string[] = [];
      let anyData = false;
      for (const sym of ['BTC', 'ETH', 'SOL']) {
        const obs = await fetchPrice(sym);
        if (obs.value) {
          anyData = true;
          parts.push(
            `${sym} ${fmtUsd(obs.value.price)}${obs.value.change24h !== null ? ` (${obs.value.change24h >= 0 ? '+' : ''}${obs.value.change24h.toFixed(2)}% 24h)` : ''} · ${obs.source ?? 'unknown source'} · ${obs.status} · fetched ${fmtTime(obs.fetchedAt)}`,
          );
        } else {
          parts.push(`${sym}: NO_DATA (chain ${obs.chain.join(' → ')} exhausted)`);
        }
      }
      if (!anyData) throw new Error('Every price chain returned NO_DATA.');
      return parts.join(' · ');
    },
  },
  {
    id: 'provider-status',
    label: 'PROVIDER STATUS',
    does: 'Asks the gateway which API pipelines are configured (presence only) and reports the connection state of each.',
    run: async () => {
      const res = await fetch('/api/mti6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'gateway.status' }),
      });
      const env = (await res.json().catch(() => null)) as
        | { ok?: boolean; data?: { providersConfigured?: Record<string, boolean>; star?: { configured?: boolean; model?: string | null } } }
        | null;
      if (!env?.ok || !env.data?.providersConfigured) {
        throw new Error('The gateway did not answer a status report.');
      }
      const cfg = env.data.providersConfigured;
      const line = Object.entries(cfg)
        .map(([k, v]) => `${k.toUpperCase()}: ${v ? 'KEY PRESENT' : 'NOT SET'}`)
        .join(' · ');
      return `${line} · STAR: ${env.data.star?.configured ? `CONNECTED (${env.data.star.model ?? 'model unnamed'})` : 'DEMO (no key)'}`;
    },
  },
  {
    id: 'coverage-report',
    label: 'COVERAGE REPORT',
    does: 'Computes the backbone coverage picture from the canonical records: workspace links, zero-strategy majors, empty families.',
    run: async () => {
      const rows = Object.values(WORKSPACE_COVERAGE);
      const primary = rows.reduce((n, w) => n + w.majors.length, 0);
      const secondary = rows.reduce((n, w) => n + w.secondaryMajors.length, 0);
      const childrenOf = (pid: string) => ENCYCLOPEDIA_INDEX.filter((e) => e.parent === pid);
      const zeroStrategy = CANONICAL_60.filter((m) => {
        const types = childrenOf(m.id).filter((c) => c.level === 'TYPE');
        const direct = childrenOf(m.id).filter((c) => c.level === 'STRATEGY').length;
        const under = types.reduce((n, t) => n + childrenOf(t.id).filter((c) => c.level === 'STRATEGY').length, 0);
        return direct + under === 0;
      }).map((m) => m.title);
      const famsWith = new Set(CANONICAL_60.map((m) => m.family));
      const emptyFams = ENCYCLOPEDIA_FAMILIES.filter((f) => !famsWith.has(f.id)).length;
      return `${CRYPTO_WORKSPACES.length} workspaces · ${primary} primary + ${secondary} secondary backbone links · zero-strategy majors: ${zeroStrategy.join(', ') || 'none'} · ${emptyFams} families hold no backbone major · encyclopedia ${ENCYCLOPEDIA_COUNTS.total} records`;
    },
  },
  {
    id: 'link-integrity',
    label: 'LINK INTEGRITY',
    does: 'Walks every encyclopedia parent link and entity record and counts anything that does not resolve.',
    run: async () => {
      const ids = new Set(ENCYCLOPEDIA_INDEX.map((e) => e.id));
      let unresolved = 0;
      for (const e of ENCYCLOPEDIA_INDEX) {
        if (e.parent && !ids.has(e.parent)) unresolved += 1;
      }
      const registries = { chains: 0, assets: 0, protocols: 0 } as Record<string, number>;
      for (const ent of ENTITY_UNIVERSE) registries[ent.registry] = (registries[ent.registry] ?? 0) + 1;
      return `${ENCYCLOPEDIA_INDEX.length} encyclopedia records walked · ${unresolved} unresolved parent links · ${ENTITY_UNIVERSE.length} entities (${registries.chains} networks / ${registries.assets} assets / ${registries.protocols} protocols)`;
    },
  },
];

export const executorById = (id: string): RuntimeExecutor | null =>
  EXECUTORS.find((e) => e.id === id) ?? null;

/* Phase 2 executors (v172) — the remaining live capabilities put
 * to work through the same governed paths the screens use. */
EXECUTORS.push(
  {
    id: 'yield-scan',
    label: 'YIELD SCAN',
    does: 'Fetches the governed DefiLlama yield observation for the watched projects and reports the largest pools with their source-reported APY.',
    run: async () => {
      const obs = await fetchYields();
      if (!obs.value || obs.value.length === 0) {
        throw new Error('The yield chain returned NO_DATA.');
      }
      const top = [...obs.value].sort((a, b) => b.tvlUsd - a.tvlUsd).slice(0, 3);
      const parts = top.map(
        (p) => `${p.project} ${p.symbol} (${p.chain}) APY ${p.apy.toFixed(2)}% · TVL ${fmtUsd(p.tvlUsd)}`,
      );
      return `${obs.value.length} watched pools · ${obs.source ?? 'DefiLlama'} · ${obs.status} · top by TVL: ${parts.join(' · ')} · APY is percent, source-reported, variable — not a promise`;
    },
  },
  {
    id: 'history-check',
    label: 'HISTORY CHECK',
    does: 'Fetches the governed 7-day BTC price history and computes the period move from the real series points.',
    run: async () => {
      const obs = await fetchHistory('BTC', '7d');
      if (!obs.value || obs.value.points.length < 2) {
        throw new Error('The history chain returned NO_DATA.');
      }
      const pts = obs.value.points;
      const first = pts[0].p;
      const last = pts[pts.length - 1].p;
      const move = ((last - first) / first) * 100;
      return `BTC 7d · ${pts.length} real series points · ${fmtUsd(first)} → ${fmtUsd(last)} (${move >= 0 ? '+' : ''}${move.toFixed(2)}% computed from the series) · ${obs.source ?? 'unknown source'} · ${obs.status}`;
    },
  },
  {
    id: 'geocode-check',
    label: 'GEOCODE CHECK',
    does: 'Resolves the Bronx through the gateway geocoding chain (Geoapify, then LocationIQ) and reports which provider answered with real coordinates.',
    run: async () => {
      const res = await fetch('/api/mti6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'geo.geocode', payload: { q: 'Bronx, New York' } }),
      });
      const env = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            data?: { results?: { label: string; lat: number; lon: number }[]; provider?: string };
            error?: { code?: string };
          }
        | null;
      if (!env?.ok) {
        const code = env?.error?.code ?? 'UPSTREAM_ERROR';
        throw new Error(
          code === 'AUTH_REQUIRED'
            ? 'Geocoding is NOT_CONFIGURED on the server (no provider key set yet).'
            : code === 'NOT_FOUND'
              ? 'The geocoding chain answered with no match for the Bronx query.'
              : `Geocoding query failed (${code}).`,
        );
      }
      const results = env.data?.results ?? [];
      const first = results[0];
      if (!first) throw new Error('The geocoding chain returned no results.');
      return `${env.data?.provider ?? 'geocoding chain'} answered · ${results.length} result(s) · first: ${first.label} @ ${first.lat.toFixed(4)}, ${first.lon.toFixed(4)} · pipeline live through the gateway`;
    },
  },
  {
    id: 'transit-check',
    label: 'TRANSIT CHECK',
    does: 'Queries live transit stops near the recorded Bronx reference point through the gateway (Transitland) and reports what answers.',
    run: async () => {
      const res = await fetch('/api/mti6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transit.stopsNear',
          payload: { lat: 40.8448, lon: -73.8648, radius: 1500, limit: 25 },
        }),
      });
      const env = (await res.json().catch(() => null)) as
        | { ok?: boolean; data?: { stops?: unknown[] }; error?: { code?: string } }
        | null;
      if (!env?.ok) {
        const code = env?.error?.code ?? 'UPSTREAM_ERROR';
        throw new Error(
          code === 'AUTH_REQUIRED' ? 'Transit is NOT_CONFIGURED on the server.' : `Transit query failed (${code}).`,
        );
      }
      const stops = Array.isArray(env.data?.stops) ? env.data.stops : [];
      const names: string[] = [];
      for (const raw of stops.slice(0, 3)) {
        const s = raw as Record<string, unknown>;
        const name = s.stop_name ?? s.name;
        if (typeof name === 'string' && name) names.push(name);
      }
      return `${stops.length} stops within 1500m of the Bronx reference point · Transitland via the gateway · first: ${names.join(' · ') || 'names not published'}`;
    },
  },
);

/* Phase 3 executors (v180) — the runtime reports on the
 * family's own governed stores: Bot Memory and the gateway
 * posture record. Both are pure reads over real in-app data. */
EXECUTORS.push(
  {
    id: 'memory-report',
    label: 'MEMORY REPORT',
    does: 'Summarizes Bot Memory from its own governed summary: active and retained counts, truth states, and stale records.',
    run: async () => {
      const s = memorySummary();
      const kinds = Object.entries(s.byKind)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${k} ${n}`)
        .join(' · ');
      return `Bot Memory: ${s.total} active of ${s.totalRetained} retained · UNVERIFIED ${s.byTruthState.UNVERIFIED ?? 0} · REJECTED ${s.byTruthState.REJECTED ?? 0} · ${s.staleCount} stale · kinds: ${kinds || 'none yet'} · VERIFIED is never writable by this layer`;
    },
  },
  {
    id: 'posture-check',
    label: 'POSTURE CHECK',
    does: 'Reports the gateway posture from the generated posture record: the action allowlist, the providers, and the env names the proxy reads (names only, never values).',
    run: async () =>
      `Gateway posture (from the generated record): ${PROXY_ACTIONS.length} actions allowlisted (${PROXY_ACTIONS.join(', ')}) · ${PROXY_PROVIDERS.length} providers (${PROXY_PROVIDERS.join(', ')}) · ${PROXY_ENV_NAMES.length} env names read, values never in the client`,
  },
);

/* STAR chat command matching (v172): "run a price check" and
 * its kin map to an executor. Deliberately narrow — a run verb
 * plus an executor keyword — so ordinary questions never fire
 * a run by accident. */
export function runtimeCommandFor(text: string): string | null {
  const q = text.toLowerCase();
  if (!/(run|execute|start|do)\b/.test(q)) return null;
  if (q.includes('price')) return 'price-check';
  if (q.includes('yield')) return 'yield-scan';
  if (q.includes('history')) return 'history-check';
  if (q.includes('transit') || q.includes('stop')) return 'transit-check';
  if (q.includes('geocode') || q.includes('place')) return 'geocode-check';
  if (q.includes('memory')) return 'memory-report';
  if (q.includes('posture') || q.includes('security')) return 'posture-check';
  if (q.includes('provider') || q.includes('connection')) return 'provider-status';
  if (q.includes('coverage')) return 'coverage-report';
  if (q.includes('link') || q.includes('integrity')) return 'link-integrity';
  return null;
}

// --- Runtime-kind registry (taskId → executor id) ----------------

export const RUNTIME_KINDS_KEY = 'mti6_runtime_kinds_v1';
export type RuntimeKindMap = Record<string, string>;

export function loadKinds(): RuntimeKindMap {
  try {
    const raw = localStorage.getItem(RUNTIME_KINDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: RuntimeKindMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string' && executorById(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveKinds(kinds: RuntimeKindMap): void {
  try {
    localStorage.setItem(RUNTIME_KINDS_KEY, JSON.stringify(kinds));
  } catch {
    /* storage unavailable — the registry simply does not persist */
  }
}

// --- Running a task ----------------------------------------------

export interface RunRecord {
  taskId: string;
  title: string;
  executor: string;
  startedAt: string;
  finishedAt: string;
  outcome: 'COMPLETE' | 'FAILED';
  evidence: string;
}

/* Execute one runtime task end to end. Intermediate task states
 * are pushed through `apply` as they happen, so the queue shows
 * QUEUED → ACTIVE while the work runs. The task must start in
 * UNASSIGNED or QUEUED. Completion carries the run's evidence;
 * failure marks FAILED with the reason. A completed run also
 * writes its Bot Memory record (best-effort: a memory refusal
 * never fails the run — the task record is the primary record). */
export async function runRuntimeTask(
  tasks: WorkerTask[],
  taskId: string,
  executorId: string,
  apply: (tasks: WorkerTask[]) => void,
): Promise<RunRecord> {
  const startedAt = new Date().toISOString();
  const task = tasks.find((t) => t.id === taskId);
  const executor = executorById(executorId);
  if (!task || !executor) {
    return {
      taskId,
      title: task?.title ?? taskId,
      executor: executorId,
      startedAt,
      finishedAt: new Date().toISOString(),
      outcome: 'FAILED',
      evidence: 'Task or executor not found.',
    };
  }
  let cur = tasks;
  const step = (to: 'QUEUED' | 'ACTIVE', note: string) => {
    const r = transitionTask(cur, taskId, to, { note });
    if (!r.error) {
      cur = r.tasks;
      apply(cur);
    }
  };
  if (task.state === 'UNASSIGNED') step('QUEUED', 'Queued by the worker runtime.');
  step('ACTIVE', `Worker runtime executing: ${executor.label}.`);
  try {
    const evidence = await executor.run();
    const r = transitionTask(cur, taskId, 'COMPLETE', {
      note: `Completed by the worker runtime (${executor.label}).`,
      evidence,
    });
    if (r.error) throw new Error(r.error);
    cur = r.tasks;
    apply(cur);
    try {
      recordMemory(
        {
          kind: 'ASSIGNMENT_OUTCOME',
          subject: task.title,
          summary: evidence.slice(0, 400),
          truthState: 'UNVERIFIED',
          refs: [task.id],
          source: 'worker-runtime',
        },
        task.principal ?? 'worker-runtime',
      );
    } catch {
      /* memory write is best-effort; the task record stands */
    }
    return {
      taskId,
      title: task.title,
      executor: executorId,
      startedAt,
      finishedAt: new Date().toISOString(),
      outcome: 'COMPLETE',
      evidence,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'The run failed.';
    const r = transitionTask(cur, taskId, 'FAILED', {
      note: `Worker runtime run failed: ${reason}`,
    });
    if (!r.error) {
      cur = r.tasks;
      apply(cur);
    }
    return {
      taskId,
      title: task.title,
      executor: executorId,
      startedAt,
      finishedAt: new Date().toISOString(),
      outcome: 'FAILED',
      evidence: reason,
    };
  }
}

/* Store-derived runtime summary (v177) — counts and the latest
 * completed runs, read from the canonical stores. Shared by
 * STAR's local answers and any surface that needs the runtime's
 * all-time state without rendering Bot Operations. */
export function runtimeStoreSummary(): {
  recorded: number;
  completed: number;
  failed: number;
  latestCompleted: { title: string; evidence: string }[];
} {
  const tasks = loadTasks();
  const kinds = loadKinds();
  const runtime = tasks.filter((t) => kinds[t.id]);
  return {
    recorded: runtime.length,
    completed: runtime.filter((t) => t.state === 'COMPLETE').length,
    failed: runtime.filter((t) => t.state === 'FAILED').length,
    latestCompleted: runtime
      .filter((t) => t.state === 'COMPLETE')
      .slice(0, 3)
      .map((t) => ({ title: t.title, evidence: t.completionEvidence ?? '' })),
  };
}

/* Run an executor as a fresh queue task (v172) — the path STAR
 * commands take. The task is created in the canonical store,
 * registered with its kind, executed, and left in Bot
 * Operations as the permanent record of the run. */
export async function runAdHocTask(executorId: string, title: string): Promise<RunRecord> {
  const executor = executorById(executorId);
  if (!executor) {
    return {
      taskId: '',
      title,
      executor: executorId,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      outcome: 'FAILED',
      evidence: 'Unknown executor.',
    };
  }
  const before = loadTasks();
  const next = createTask(before, { title, role: 'Monitoring', principal: null });
  if (next.length === before.length) {
    return {
      taskId: '',
      title,
      executor: executorId,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      outcome: 'FAILED',
      evidence: 'The task could not be recorded.',
    };
  }
  const created = next[0];
  const kinds = loadKinds();
  kinds[created.id] = executorId;
  saveKinds(kinds);
  return runRuntimeTask(next, created.id, executorId, () => {});
}
