/* MTI6-GTADWIY-COCKPIT — Bot Theater (v230).
 *
 * The lab floor: every working bot posted in a scene, its
 * work screen visible, with a TAKE OVER button Daniel can
 * tap when a human step is needed (a sign-in, a verification
 * click, a password — the doors automation cannot open).
 * STAR narrates what is happening, in plain words, from
 * the real state — never from invention.
 *
 * HONEST BOUNDARIES (do not soften these in the UI):
 * - The scenes are ILLUSTRATIONS of the work — a lab, a
 *   computer desk, a warehouse, a command center — not
 *   cameras. The bots are software running in this page.
 * - The work screen shows the work itself (the fetch, the
 *   request, the response, the saved excerpt, the run's
 *   evidence) — not a rendered copy of a website.
 * - A takeover is recorded the moment it happens (who,
 *   when, which task, why) and the task is BLOCKED until
 *   Daniel hands it back. A run already in flight finishes
 *   on its own and its evidence is kept — the bot simply
 *   starts nothing new on that task.
 */

export type TheaterScene = 'LAB' | 'DESK' | 'WAREHOUSE' | 'COMMAND';

export const SCENE_META: Record<TheaterScene, { label: string; line: string }> = {
  LAB: { label: 'RESEARCH LAB', line: 'benches, samples, checks' },
  DESK: { label: 'COMPUTER DESK', line: 'web work on screen' },
  WAREHOUSE: { label: 'WAREHOUSE', line: 'building and stacking' },
  COMMAND: { label: 'COMMAND CENTER', line: 'radar and monitoring' },
};

/* The setting follows the work — role first, executor second.
 * Harvest work is always DESK: it happens on a screen. */
export function sceneForTask(role: string, executorId: string | null): TheaterScene {
  if (executorId === 'money-radar' || executorId === 'opportunity-scan') return 'COMMAND';
  if (executorId === 'coverage-report' || executorId === 'link-integrity' || executorId === 'catalog-check')
    return 'LAB';
  if (role === 'Builder') return 'WAREHOUSE';
  if (role === 'Research' || role === 'Analysis' || role === 'Security') return 'LAB';
  if (role === 'Monitoring' || role === 'Risk') return 'COMMAND';
  return 'DESK';
}

export interface TakeoverRecord {
  id: string;
  at: number;
  kind: 'TASK' | 'HARVEST';
  refId: string;
  title: string;
  principal: string;
  reason: string;
}

export const TAKEOVERS_KEY = 'mti6_takeovers_v1';
export const TAKEOVERS_MAX = 100;

export function loadTakeovers(): TakeoverRecord[] {
  try {
    const raw = localStorage.getItem(TAKEOVERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as TakeoverRecord[]) : [];
  } catch {
    return [];
  }
}

export function recordTakeover(rec: Omit<TakeoverRecord, 'id' | 'at'>): TakeoverRecord[] {
  const entry: TakeoverRecord = { ...rec, id: `takeover-${Date.now()}`, at: Date.now() };
  const next = [entry, ...loadTakeovers()].slice(0, TAKEOVERS_MAX);
  try {
    localStorage.setItem(TAKEOVERS_KEY, JSON.stringify(next));
  } catch {
    /* storage full/blocked — the record yields, the takeover still stands */
  }
  return next;
}

/* STAR narrates the floor from the real state only: what is
 * running, who is running it, how long it has been going,
 * what the last harvest saved, and the latest takeover.
 * Nothing here is generated from a model — every line is
 * built from a record that exists. */
export function narrateTheater(input: {
  tasks: { id: string; title: string; principal: string | null; state: string }[];
  runningIds: string[];
  runStarts: Record<string, number>;
  executorLabelFor: (taskId: string) => string | null;
  principalName: (id: string | null) => string;
  harvestAssignments: { id: string; principalName: string; sourceName: string; active: boolean }[];
  harvestRecords: { assignmentId: string; status: string; fetchedAt: number; sourceName: string }[];
  harvestBusy: boolean;
  harvestCurrentId: string | null;
  takeovers: TakeoverRecord[];
}): string[] {
  const lines: string[] = [];
  const latestTakeover = input.takeovers[0];
  if (latestTakeover) {
    lines.push(
      `Daniel took over “${latestTakeover.title}” at ${new Date(latestTakeover.at).toLocaleTimeString('en-US', { hour12: false })} — the bot is blocked on it until he hands it back.`,
    );
  }
  for (const id of input.runningIds) {
    const t = input.tasks.find((x) => x.id === id);
    if (!t) continue;
    const started = input.runStarts[id];
    const secs = started ? Math.max(0, Math.round((Date.now() - started) / 1000)) : 0;
    const label = input.executorLabelFor(id);
    lines.push(
      `${input.principalName(t.principal)} is running “${t.title}”${label ? ` (${label})` : ''} — ${secs}s in.`,
    );
  }
  const queued = input.tasks.filter((t) => t.state === 'QUEUED' || t.state === 'WAITING').length;
  if (queued > 0) lines.push(`${queued} task${queued === 1 ? '' : 's'} posted and waiting for their turn.`);
  if (input.harvestBusy && input.harvestCurrentId) {
    const a = input.harvestAssignments.find((x) => x.id === input.harvestCurrentId);
    if (a) lines.push(`${a.principalName} is fetching ${a.sourceName} right now.`);
  } else if (input.harvestRecords.length > 0) {
    const ok = input.harvestRecords.filter((r) => r.status === 'OK').length;
    const failed = input.harvestRecords.length - ok;
    const latest = input.harvestRecords[0];
    lines.push(
      `Last harvest: ${ok} saved, ${failed} failed — latest ${latest.sourceName} at ${new Date(latest.fetchedAt).toLocaleTimeString('en-US', { hour12: false })}.`,
    );
  }
  if (lines.length === 0) {
    lines.push('Nothing is running right now. The Tribe is posted and waiting — record a task or tap RUN HARVEST.');
  }
  return lines;
}
