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
import { fetchPrice, fmtTime, fmtUsd } from './live-data';
import { CANONICAL_60, ENCYCLOPEDIA_COUNTS, ENCYCLOPEDIA_FAMILIES, ENCYCLOPEDIA_INDEX } from './encyclopedia-data';
import { ENTITY_UNIVERSE } from './entity-data';
import { WORKSPACE_COVERAGE } from './workspace-coverage-data';
import { CRYPTO_WORKSPACES } from './crypto-workspaces-data';
import { recordMemory } from './bot-memory';
import { transitionTask, type WorkerTask } from './worker-tasks';

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
