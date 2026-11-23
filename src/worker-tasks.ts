/**
 * Bot work queue — the React surface of the canonical worker-task
 * store in js/bot-ops-model.js: the SAME localStorage key
 * (mti6_worker_tasks_v1), the SAME record shape and validation
 * rules, the SAME state machine:
 *
 *   UNASSIGNED → QUEUED → WAITING ⇄ ACTIVE → COMPLETE / FAILED /
 *   CANCELED, with BLOCKED and PAUSED per the model's allowlist.
 *   COMPLETE / FAILED / CANCELED are terminal. Completing requires
 *   owner-supplied completionEvidence — evidence only counts at
 *   completion. Approval is required by default (PENDING).
 *
 * Truth boundary: these are OWNER-RECORDED workflow states. A task
 * marked ACTIVE is a record that the owner marked in progress — it
 * is NOT a live worker claim. The worker runtime stays
 * NOT_CONNECTED with 0 workers active, and the UI states both
 * lines side by side so a record can never read as live activity.
 */
import { ROLE_LABELS } from './principal-assignments';

export const TASK_STORE_KEY = 'mti6_worker_tasks_v1';
const MAX_TASKS = 100;

export const TASK_STATES = [
  'UNASSIGNED',
  'QUEUED',
  'WAITING',
  'ACTIVE',
  'BLOCKED',
  'PAUSED',
  'COMPLETE',
  'FAILED',
  'CANCELED',
] as const;
export type TaskState = (typeof TASK_STATES)[number];

export const TASK_TRANSITIONS: Record<TaskState, TaskState[]> = {
  UNASSIGNED: ['QUEUED'],
  QUEUED: ['WAITING', 'ACTIVE', 'CANCELED'],
  WAITING: ['ACTIVE', 'BLOCKED', 'PAUSED', 'CANCELED'],
  ACTIVE: ['BLOCKED', 'PAUSED', 'COMPLETE', 'FAILED', 'CANCELED'],
  BLOCKED: ['WAITING', 'CANCELED'],
  PAUSED: ['WAITING', 'CANCELED'],
  COMPLETE: [],
  FAILED: [],
  CANCELED: [],
};

export interface TaskHistoryEntry {
  at: string;
  from: string | null;
  to: string;
  note: string;
}

export interface WorkerTask {
  id: string;
  title: string;
  role: string;
  tribeId: string | null;
  principal: string | null;
  state: TaskState;
  status: TaskState;
  dependencies: string[];
  approvalRequired: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'DENIED';
  inputs: string[];
  outputs: string[];
  blockerReason: string | null;
  history: TaskHistoryEntry[];
  completionEvidence: string | null;
  evidence: string | null;
  completion: string | null;
  createdAt: string;
  updatedAt: string;
}

export function loadTasks(): WorkerTask[] {
  try {
    const raw = localStorage.getItem(TASK_STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is WorkerTask =>
        !!t &&
        typeof t === 'object' &&
        typeof t.id === 'string' &&
        typeof t.title === 'string' &&
        (TASK_STATES as readonly string[]).includes(t.state),
    );
  } catch {
    return [];
  }
}

export function saveTasks(tasks: WorkerTask[]): WorkerTask[] {
  const bounded = [...tasks]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, MAX_TASKS);
  try {
    localStorage.setItem(TASK_STORE_KEY, JSON.stringify(bounded));
  } catch {
    /* storage unavailable — tasks stay in memory for this session */
  }
  return bounded;
}

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'task';

export function createTask(
  tasks: WorkerTask[],
  input: { title: string; role: string; principal: string | null },
): WorkerTask[] {
  const title = input.title.trim();
  if (!title || !(ROLE_LABELS as readonly string[]).includes(input.role)) return tasks;
  const stamp = new Date().toISOString();
  const base = `task-${slug(title)}`;
  let id = base;
  let n = 2;
  while (tasks.some((t) => t.id === id)) id = `${base}-${n++}`;
  const task: WorkerTask = {
    id,
    title,
    role: input.role,
    tribeId: null,
    principal: input.principal,
    state: 'UNASSIGNED',
    status: 'UNASSIGNED',
    dependencies: [],
    approvalRequired: true,
    approvalStatus: 'PENDING',
    inputs: [],
    outputs: [],
    blockerReason: null,
    history: [{ at: stamp, from: null, to: 'UNASSIGNED', note: 'Task created.' }],
    completionEvidence: null,
    evidence: null,
    completion: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
  return saveTasks([task, ...tasks]);
}

export function transitionTask(
  tasks: WorkerTask[],
  id: string,
  to: TaskState,
  opts: { note?: string; evidence?: string; blockerReason?: string } = {},
): { tasks: WorkerTask[]; error: string | null } {
  const task = tasks.find((t) => t.id === id);
  if (!task) return { tasks, error: 'Task not found.' };
  if (!TASK_TRANSITIONS[task.state].includes(to))
    return { tasks, error: `${task.state} → ${to} is not an allowed transition.` };
  if (to === 'COMPLETE' && !opts.evidence?.trim())
    return { tasks, error: 'Completing a task requires completion evidence — what was produced, in words.' };
  const stamp = new Date().toISOString();
  const updated: WorkerTask = {
    ...task,
    state: to,
    status: to,
    updatedAt: stamp,
    blockerReason: to === 'BLOCKED' ? (opts.blockerReason?.trim() ?? task.blockerReason) : task.blockerReason,
    history: [
      ...task.history,
      { at: stamp, from: task.state, to, note: opts.note?.trim() ?? '' },
    ],
    ...(to === 'COMPLETE'
      ? { completionEvidence: opts.evidence!.trim(), evidence: opts.evidence!.trim(), completion: stamp }
      : {}),
  };
  return { tasks: saveTasks(tasks.map((t) => (t.id === id ? updated : t))), error: null };
}

export function removeTask(tasks: WorkerTask[], id: string): WorkerTask[] {
  return saveTasks(tasks.filter((t) => t.id !== id));
}
