/**
 * Principal assignments — the React surface of the canonical
 * assignment system in js/tribe-principals.js (Item 5): the SAME
 * localStorage key (mti6_principal_assignments_v1) and the SAME
 * snapshot shape — an array of {id, currentRole, currentTask,
 * history: [{at, by, change, note}]}, saving only principals that
 * carry something, history capped at 100 entries.
 *
 * Identity is NEVER persisted and never changes: it comes from the
 * canonical roster (TRIBE_PRINCIPALS). Role labels are assignment
 * labels from the closed list — never bot names. STAR is not a
 * principal and cannot be assigned here. Assignments are records,
 * not activity: an assigned principal is not "live" — no worker
 * runtime exists, and workers stay 0 active / NOT_CONNECTED.
 */
import { TRIBE_PRINCIPALS } from './worlds-data';

export const ASSIGNMENT_STORE_KEY = 'mti6_principal_assignments_v1';
const MAX_PERSISTED_HISTORY = 100;

export const ROLE_LABELS = [
  'Research',
  'Risk',
  'Yield',
  'Routing',
  'Security',
  'Builder',
  'Analysis',
  'Monitoring',
] as const;

export interface AssignmentHistoryEntry {
  at: string;
  by: string;
  change: string;
  note: string;
}

export interface PrincipalAssignment {
  id: string;
  currentRole: string | null;
  currentTask: string | null;
  history: AssignmentHistoryEntry[];
}

export type AssignmentMap = Record<string, PrincipalAssignment>;

const canonicalIds = new Set(TRIBE_PRINCIPALS.map((p) => p.id));

export function loadAssignments(): AssignmentMap {
  const map: AssignmentMap = {};
  try {
    const raw = localStorage.getItem(ASSIGNMENT_STORE_KEY);
    if (!raw) return map;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return map;
    for (const saved of parsed) {
      if (!saved || typeof saved !== 'object' || !canonicalIds.has(saved.id)) continue;
      const history = Array.isArray(saved.history)
        ? saved.history
            .filter(
              (h: unknown): h is AssignmentHistoryEntry =>
                !!h &&
                typeof h === 'object' &&
                typeof (h as AssignmentHistoryEntry).at === 'string' &&
                typeof (h as AssignmentHistoryEntry).change === 'string',
            )
            .slice(-MAX_PERSISTED_HISTORY)
            .map((h: AssignmentHistoryEntry) => ({
              at: h.at,
              by: typeof h.by === 'string' && h.by ? h.by : 'system',
              change: h.change,
              note: typeof h.note === 'string' ? h.note : '',
            }))
        : [];
      map[saved.id] = {
        id: saved.id,
        currentRole: typeof saved.currentRole === 'string' && saved.currentRole ? saved.currentRole : null,
        currentTask: typeof saved.currentTask === 'string' && saved.currentTask ? saved.currentTask : null,
        history,
      };
    }
  } catch {
    return {};
  }
  return map;
}

export function saveAssignments(map: AssignmentMap): void {
  try {
    const snapshot = Object.values(map).filter(
      (a) => a.currentRole !== null || a.currentTask !== null || a.history.length > 0,
    );
    localStorage.setItem(ASSIGNMENT_STORE_KEY, JSON.stringify(snapshot));
  } catch {
    /* storage unavailable — assignments stay in memory for this session */
  }
}

function withEntry(
  map: AssignmentMap,
  id: string,
  change: string,
  note: string,
  apply: (a: PrincipalAssignment) => PrincipalAssignment,
): AssignmentMap {
  if (!canonicalIds.has(id)) return map;
  const current: PrincipalAssignment =
    map[id] ?? { id, currentRole: null, currentTask: null, history: [] };
  const entry: AssignmentHistoryEntry = {
    at: new Date().toISOString(),
    by: 'owner',
    change,
    note: note.trim(),
  };
  const next = apply({ ...current, history: [...current.history, entry].slice(-MAX_PERSISTED_HISTORY) });
  const out = { ...map, [id]: next };
  saveAssignments(out);
  return out;
}

export function assignRole(map: AssignmentMap, id: string, role: string, note: string): AssignmentMap {
  if (!(ROLE_LABELS as readonly string[]).includes(role)) return map;
  return withEntry(map, id, `ROLE → ${role}`, note, (a) => ({ ...a, currentRole: role }));
}

export function assignTask(map: AssignmentMap, id: string, task: string, note: string): AssignmentMap {
  const t = task.trim();
  if (!t) return map;
  return withEntry(map, id, `TASK → ${t}`, note, (a) => ({ ...a, currentTask: t }));
}

export function unassign(map: AssignmentMap, id: string, note: string): AssignmentMap {
  return withEntry(map, id, 'UNASSIGNED', note, (a) => ({ ...a, currentRole: null, currentTask: null }));
}
