/**
 * STAR task creation from chat (v251, F4).
 *
 * Until now STAR ran executors from chat (runtimeCommandFor) but
 * created nothing. This module is the narrow chat path that turns
 * an owner's explicit words into a recorded task — and nothing
 * else does. Rules, all enforced here:
 *
 *  - NARROWNESS: a message is a task request only when it carries
 *    a create/assign/make verb PLUS a task/job word, or an
 *    "assign <principal> to <job>" command. Ordinary questions
 *    ("what is the money radar?") never create a task.
 *  - DUPLICATE-GUARDED: an open task with the same title and the
 *    same principal is reported, never created twice.
 *  - EVIDENCE: every chat-created task carries its source and the
 *    owner's exact message in its initial history note — the note
 *    contains the string 'STAR chat' plus the owner's words. That
 *    is what the build-queue verifier counts (verifyId 'f4').
 *  - NEVER UNPROMPTED: STAR creates a task only from the owner's
 *    words in chat (direct request, or "yes" confirming a proposal
 *    STAR just made). No task is ever created from STAR's own
 *    initiative, and a bare "yes" with no pending proposal creates
 *    nothing — it falls through to the brain as an ordinary message.
 *  - CONFIRM FLOW: a proposal phrasing ("should we create a task
 *    for LEVI to ...?") stores a pending proposal and creates
 *    nothing; the owner's "yes / do it / create it" then creates
 *    the proposed task. The proposal is cleared once acted on, on
 *    "no", or when the owner changes topic (any other message).
 *
 * Tasks start UNASSIGNED with approval PENDING, exactly as
 * createTask records them. Nothing here executes, runs, or signs
 * anything; creation is a record only.
 */
import { TRIBE_PRINCIPALS } from './worlds-data';
import { ROLE_LABELS } from './principal-assignments';
import { createTask, type WorkerTask } from './worker-tasks';

export const STAR_CHAT_NOTE = 'STAR chat';

const PRINCIPAL_NAMES = TRIBE_PRINCIPALS.map((p) => p.displayName);

const OPEN_STATES: ReadonlySet<string> = new Set(['UNASSIGNED', 'QUEUED', 'WAITING', 'ACTIVE']);

export interface ParsedChatTask {
  title: string;
  role: string;
  /** Canonical tribe id (e.g. 'tribe-judah'), or null when no principal was named. */
  principal: string | null;
  /** True when the owner asked STAR to propose, not to create yet. */
  proposal: boolean;
}

export function principalDisplayName(principal: string | null): string {
  if (!principal) return 'UNASSIGNED';
  return TRIBE_PRINCIPALS.find((p) => p.id === principal)?.displayName ?? principal;
}

function resolvePrincipal(text: string): string | null {
  const lower = ` ${text.toLowerCase()} `;
  for (const p of TRIBE_PRINCIPALS) {
    if (lower.includes(` ${p.displayName.toLowerCase()} `)) return p.id;
  }
  return null;
}

function resolveRole(text: string): string {
  const q = text.toLowerCase();
  if (/\bsecurity\b/.test(q)) return 'Security';
  if (/\brisk\b/.test(q)) return 'Risk';
  if (/\byield\b/.test(q)) return 'Yield';
  if (/\brout(e|ing)\b/.test(q)) return 'Routing';
  if (/\bbuild(er|ing)?\b/.test(q)) return 'Builder';
  if (/\banalys(is|e|ing)\b/.test(q)) return 'Analysis';
  if (/\bmonitor(ing)?\b/.test(q)) return 'Monitoring';
  if (/\bresearch\b/.test(q)) return 'Research';
  return 'Research';
}

function cleanTitle(raw: string, principal: string | null): string {
  let t = raw.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim();
  if (!t) {
    return principal ? `Task for ${principalDisplayName(principal)}` : 'Task from STAR chat';
  }
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Extract the job text left after the command prefix is stripped. */
function extractJob(text: string): string {
  let s = text.trim();
  // Leading address / proposal lead-in.
  s = s.replace(/^(hey\s+)?star,?\s+/i, '');
  s = s.replace(/^should\s+(we|i|you)\s+/i, '');
  s = s.replace(/^how\s+about\s+/i, '');
  s = s.replace(/^what\s+about\s+/i, '');
  s = s.replace(/^please\s+/i, '');
  // "assign <principal> to <job>" — principal first, then the job.
  const assignPrincipal = s.match(/^assign\s+([a-z]+)\s+to\s+/i);
  if (assignPrincipal) {
    s = s.slice(assignPrincipal[0].length);
    return s.trim();
  }
  // "assign a task/job to|for <principal> [to <job>]" / "assign a task to <job>".
  const assignTask = s.match(/^assign\s+(a\s+)?(task|job)\s+(to|for)\s+/i);
  if (assignTask) {
    s = s.slice(assignTask[0].length);
    // A principal name may follow ("... to JUDAH to verify X").
    const p = s.match(/^([a-z]+)(\s+to\s+|\s*$)/i);
    if (p && PRINCIPAL_NAMES.includes(p[1].toUpperCase())) {
      s = s.slice(p[0].length);
    }
    return s.trim();
  }
  if (/^assign\s+/i.test(s)) {
    s = s.replace(/^assign\s+/i, '');
    return s.trim();
  }
  // "create|make|add|open|set up a task|job [for|to|: <job>]".
  const create = s.match(
    /^(create|make|add|open|set\s+up)\s+(a\s+)?(task|job)\s*(for\s+|to\s+|:\s*)?/i,
  );
  if (create) {
    s = s.slice(create[0].length);
    // "for|to <principal>" then an optional "to <job>".
    const forPrincipal = s.match(/^([a-z]+)(\s+to\s+|\s*$)/i);
    if (forPrincipal && PRINCIPAL_NAMES.includes(forPrincipal[1].toUpperCase())) {
      s = s.slice(forPrincipal[0].length);
    } else {
      s = s.replace(/^(for|to)\s+/i, '');
    }
    return s.trim();
  }
  return s.trim();
}

const PRINCIPAL_ALT = PRINCIPAL_NAMES.join('|');

/**
 * Parse an owner chat message into a task request, or null when it
 * is not one. Narrow by construction: a create/assign/make verb
 * PLUS a task/job word, or "assign <principal> to <job>".
 */
export function parseChatTaskRequest(text: string): ParsedChatTask | null {
  const q = text.trim();
  if (!q) return null;
  const lower = q.toLowerCase();
  const hasCreateVerb = /\b(create|make|add|open|assign|set\s+up)\b/.test(lower);
  const hasTaskWord = /\b(task|job)\b/.test(lower);
  const assignPrincipal = new RegExp(`\\bassign\\s+(${PRINCIPAL_ALT})\\s+to\\b`, 'i').test(q);
  if (!assignPrincipal && !(hasCreateVerb && hasTaskWord)) return null;

  const proposal =
    /\bshould\s+(we|i|you)\b/i.test(q) ||
    /\bhow\s+about\b/i.test(q) ||
    /\bwhat\s+about\b/i.test(q);
  const principal = resolvePrincipal(q);
  const job = extractJob(q);
  const role = resolveRole(job || q);
  return { title: cleanTitle(job, principal), role, principal, proposal };
}

/** "yes / do it / create it / go ahead" — a confirmation, nothing more. */
export function isChatConfirmation(text: string): boolean {
  return /^(yes|yeah|yep|yup|do\s+it|create\s+it|make\s+it|go\s+ahead|confirmed|ok|okay|sure|please\s+do)\b[.!]*$/i.test(
    text.trim(),
  );
}

/** "no / not now / cancel" — declines a pending proposal. */
export function isChatDecline(text: string): boolean {
  return /^(no|nope|not\s+now|never\s+mind|don'?t|cancel|forget\s+it)\b/i.test(text.trim());
}

export interface ChatTaskResult {
  tasks: WorkerTask[];
  task: WorkerTask | null;
  created: boolean;
  duplicate: boolean;
}

function findOpenDuplicate(
  tasks: WorkerTask[],
  title: string,
  principal: string | null,
): WorkerTask | undefined {
  const norm = title.trim().toLowerCase();
  return tasks.find(
    (t) =>
      t.title.trim().toLowerCase() === norm &&
      (t.principal ?? null) === (principal ?? null) &&
      OPEN_STATES.has(t.state),
  );
}

function findCreated(tasks: WorkerTask[], title: string, principal: string | null): WorkerTask | null {
  const norm = title.trim().toLowerCase();
  return (
    tasks.find(
      (t) =>
        t.title.trim().toLowerCase() === norm &&
        (t.principal ?? null) === (principal ?? null) &&
        t.state === 'UNASSIGNED' &&
        t.history.some((h) => (h.note ?? '').includes(STAR_CHAT_NOTE)),
    ) ?? null
  );
}

/**
 * Create a task from the owner's chat words — duplicate-guarded.
 * An open task with the same title and same principal is reported
 * instead of created. The initial history note carries 'STAR chat'
 * plus the owner's exact message, so the build-queue verifier can
 * count chat-created tasks.
 */
export function createTaskFromChat(
  tasks: WorkerTask[],
  input: { title: string; role: string; principal: string | null; ownerMessage: string },
): ChatTaskResult {
  const title = input.title.trim();
  const role = (ROLE_LABELS as readonly string[]).includes(input.role) ? input.role : 'Research';
  const principal = input.principal;
  if (!title) return { tasks, task: null, created: false, duplicate: false };
  const existing = findOpenDuplicate(tasks, title, principal);
  if (existing) return { tasks, task: existing, created: false, duplicate: true };
  const note = `${STAR_CHAT_NOTE} — "${input.ownerMessage.trim()}"`;
  const next = createTask(tasks, { title, role, principal, note });
  const created = findCreated(next, title, principal);
  return { tasks: next, task: created, created: created !== null, duplicate: false };
}

// --- Pending proposal (confirm flow) -------------------------------------
// Module state only: a proposal lives in this chat session, is never
// persisted as a task, and is cleared once acted on, declined, or
// superseded by a change of topic.

let pendingProposal: { title: string; role: string; principal: string | null; ownerMessage: string } | null =
  null;

export function proposeTaskFromChat(parsed: ParsedChatTask, ownerMessage: string): void {
  pendingProposal = {
    title: parsed.title,
    role: parsed.role,
    principal: parsed.principal,
    ownerMessage,
  };
}

export function getPendingProposal(): {
  title: string;
  role: string;
  principal: string | null;
  ownerMessage: string;
} | null {
  return pendingProposal;
}

export function clearPendingProposal(): void {
  pendingProposal = null;
}

/** Create the pending proposal (owner said yes). Clears it either way. */
export function confirmPendingProposal(tasks: WorkerTask[]): ChatTaskResult | null {
  const proposal = pendingProposal;
  pendingProposal = null;
  if (!proposal) return null;
  return createTaskFromChat(tasks, proposal);
}
