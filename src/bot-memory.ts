// MTI6 React app — Bot Memory (React mirror of js/bot-memory.js,
// the canonical engine; ported 2026-11-23 at the owner's word from
// the v102 package built for the earlier line).
//
// MTI6's own controlled memory layer for the bot system: records
// with provenance, a truth state they keep for life, and an
// optional reviewAfter freshness horizon. The discipline is the
// frozen note's: memory is NOT remember-everything-forever.
//
//  - 7 retention kinds; every record carries provenance
//    (source + recordedBy + recordedAt).
//  - Truth discipline at the write path: VERIFIED is refused
//    outright (verification is a separate owner process that does
//    not exist; there is no verify/promote function), SUPERSEDED
//    is set only by correct(), STALE is derived from reviewAfter
//    at read time and never stored.
//  - record() dedupes on kind + normalized subject + normalized
//    summary; a REJECTED memory blocks laundering back in as
//    UNVERIFIED (the dedupe returns the REJECTED record itself).
//  - correct() and forget() are OWNER acts: corrections supersede
//    with both-way links and the original content preserved;
//    deletion is a tombstone (content removed, existence + reason
//    retained).
//  - Secret-shaped keys are rejected recursively anywhere in a
//    record — a memory may state that something happened; it may
//    never hold a credential value.
//
// Ships EMPTY: no seeding, no automatic capture, no producers
// wired. Records enter only through the governed write functions
// below. Storage is this screen-layer's local record store
// (localStorage mti6_bot_memory_v1), the React mirror pattern; the
// canonical engine persists in the cryptoWorld store.
//
// One producer-side bridge lives here (v247): recordRunFailureLesson
// turns a failed runtime run into a Bot Lesson via the lessons
// store. The worker runtime calls it from its failure path; the
// lesson store duplicate-guards by title, so a repeated failure
// does not mint a second lesson.

import { recordLesson, type Lesson } from './bot-lessons';

/** Record a failed runtime run as a Bot Lesson (v247). The
 * lesson store duplicate-guards by title, so the same executor
 * failing with the same error records once. Best-effort: a
 * lessons-store refusal never throws — the task record is the
 * primary record of the failure. */
export function recordRunFailureLesson(
  executorLabel: string,
  reason: string,
  source = 'worker-runtime',
): { ok: boolean; deduped?: boolean; lesson?: Lesson } {
  try {
    const shortReason = reason.trim().slice(0, 160) || 'The run failed.';
    const r = recordLesson({
      title: `Run failure: ${executorLabel} — ${shortReason}`,
      whatWentWrong: `The ${executorLabel} executor run failed: ${shortReason}`,
      fix: 'Not yet fixed — this lesson was recorded automatically from the failed run so the next run consults it before acting. The owner or STAR fills in the fix once the cause is known.',
      source,
      changedWhat:
        'Recorded from the failed run itself: future runs of this executor consult this lesson before acting, and the failure is no longer silent.',
    });
    // v247 direction #10 — the caller also raises the owner alert
    // from the returned lesson (newly recorded only, never a
    // deduped repeat).
    return { ok: r.ok, deduped: r.deduped, lesson: r.lesson };
  } catch {
    return { ok: false };
  }
}

export const MEMORY_KINDS = [
  'ASSIGNMENT_OUTCOME',
  'RESEARCH_EVIDENCE',
  'ENTITY_KNOWLEDGE',
  'CANDIDATE_DISCOVERY',
  'DECISION',
  'CORRECTION',
  'WORKER_HANDOFF',
] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

export const MEMORY_TRUTH_STATES = ['VERIFIED', 'UNVERIFIED', 'STALE', 'SUPERSEDED', 'REJECTED'] as const;
const RECORDABLE_TRUTH_STATES = ['UNVERIFIED', 'REJECTED'];
export const MEMORY_STATUSES = ['ACTIVE', 'SUPERSEDED', 'DELETED'] as const;

const SECRET_KEYS = [
  'seedphrase', 'seed', 'mnemonic', 'privatekey', 'apikey', 'apisecret',
  'password', 'secret', 'accesstoken', 'refreshtoken', 'bearertoken',
  'tokenvalue', 'keyvalue', 'credentialvalue', 'credentials',
];

export interface BotMemoryRecord {
  id: string;
  kind: MemoryKind;
  subject: string | null;
  summary: string | null;
  refs: string[];
  truthState: string;
  status: string;
  provenance: { source: string; recordedBy: string; recordedAt: string };
  reviewAfter: string | null;
  supersedes: string | null;
  supersededBy: string | null;
  supersededAt: string | null;
  deletedAt?: string;
  deletedBy?: string;
  forgetReason?: string;
  history: { action: string; actor: string; at: string; note?: string }[];
}

const STORAGE_KEY = 'mti6_bot_memory_v1';

const normText = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');
const identityKey = (kind: string, subject: string, summary: string): string =>
  `${kind}|${normText(subject)}|${normText(summary)}`;
const slugify = (s: string): string =>
  normText(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'memory';

function secretKeyErrors(obj: unknown, path: string, out: string[]): void {
  if (!obj || typeof obj !== 'object') return;
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (SECRET_KEYS.includes(norm)) {
      out.push(`Secret-shaped key refused at ${path}${k} — a memory may never hold a credential value.`);
    }
    secretKeyErrors((obj as Record<string, unknown>)[k], `${path}${k}.`, out);
  }
}

export function loadMemories(): BotMemoryRecord[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (r): r is BotMemoryRecord =>
        !!r && typeof r === 'object' &&
        typeof (r as BotMemoryRecord).id === 'string' &&
        (MEMORY_KINDS as readonly string[]).includes((r as BotMemoryRecord).kind) &&
        (MEMORY_STATUSES as readonly string[]).includes((r as BotMemoryRecord).status),
    );
  } catch {
    return [];
  }
}

function saveMemories(records: BotMemoryRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* storage full/blocked — the in-memory result still returns */
  }
}

export function isStale(rec: BotMemoryRecord, now?: string): boolean {
  if (!rec.reviewAfter) return false;
  const t = Date.parse(rec.reviewAfter);
  return Number.isFinite(t) && t <= Date.parse(now ?? new Date().toISOString());
}

export interface MemoryDraft {
  kind: string;
  subject: string;
  summary: string;
  truthState?: string;
  refs?: string[];
  reviewAfter?: string | null;
  source?: string;
}

function validateDraft(draft: MemoryDraft): string[] {
  const errors: string[] = [];
  if (!(MEMORY_KINDS as readonly string[]).includes(draft.kind)) {
    errors.push(`Memory kind must be one of: ${MEMORY_KINDS.join(', ')}.`);
  }
  if (typeof draft.subject !== 'string' || !draft.subject.trim()) {
    errors.push('Memory needs a subject — what the memory is about.');
  }
  if (typeof draft.summary !== 'string' || !draft.summary.trim()) {
    errors.push('Memory needs a summary — the claim or event being retained, in words.');
  }
  if (draft.truthState !== undefined) {
    if (draft.truthState === 'VERIFIED') {
      errors.push('VERIFIED is refused — verification is a separate owner process that does not exist in this module.');
    } else if (!RECORDABLE_TRUTH_STATES.includes(draft.truthState)) {
      errors.push(`Unknown truth state: ${draft.truthState}. Recordable states: ${RECORDABLE_TRUTH_STATES.join(', ')} (default UNVERIFIED).`);
    }
  }
  if (draft.refs !== undefined && (!Array.isArray(draft.refs) || draft.refs.some((r) => typeof r !== 'string' || !r.trim()))) {
    errors.push('refs must be an array of non-empty strings.');
  }
  secretKeyErrors(draft, '', errors);
  return errors;
}

export type RecordResult = { ok: boolean; record?: BotMemoryRecord; deduped?: boolean; errors?: string[] };

export function recordMemory(draft: MemoryDraft, actor: string): RecordResult {
  if (typeof actor !== 'string' || !actor.trim()) {
    return { ok: false, errors: ['A recorded-by actor is required — memory is always actor-recorded.'] };
  }
  const errors = validateDraft(draft);
  if (errors.length) return { ok: false, errors };
  const records = loadMemories();
  const key = identityKey(draft.kind, draft.subject, draft.summary);
  const existing = records.find(
    (r) => r.status === 'ACTIVE' && r.subject && r.summary && identityKey(r.kind, r.subject, r.summary) === key,
  );
  if (existing) return { ok: true, record: existing, deduped: true };
  const at = new Date().toISOString();
  const rec: BotMemoryRecord = {
    id: `mem-${slugify(draft.subject)}-${Date.now().toString(36)}`,
    kind: draft.kind as MemoryKind,
    subject: draft.subject.trim(),
    summary: draft.summary.trim(),
    refs: draft.refs ?? [],
    truthState: draft.truthState ?? 'UNVERIFIED',
    status: 'ACTIVE',
    provenance: { source: draft.source ?? 'owner', recordedBy: actor, recordedAt: at },
    reviewAfter: draft.reviewAfter ?? null,
    supersedes: null,
    supersededBy: null,
    supersededAt: null,
    history: [{ action: 'RECORDED', actor, at }],
  };
  saveMemories([rec, ...records]);
  return { ok: true, record: rec };
}

// correct() — OWNER only. The replacement keeps the original's
// kind and subject; the original's content is NOT edited — only
// its lifecycle fields advance to SUPERSEDED.
export function correctMemory(id: string, draft: MemoryDraft, actor: string): RecordResult {
  if (actor !== 'owner') {
    return { ok: false, errors: ['Only the owner can correct a memory.'] };
  }
  const records = loadMemories();
  const orig = records.find((r) => r.id === id);
  if (!orig) return { ok: false, errors: [`Memory not found: ${id}.`] };
  if (orig.status !== 'ACTIVE') return { ok: false, errors: [`Memory ${id} is ${orig.status} — only an ACTIVE memory can be corrected.`] };
  const fixed: MemoryDraft = { ...draft, kind: orig.kind, subject: orig.subject ?? draft.subject };
  const errors = validateDraft(fixed);
  if (errors.length) return { ok: false, errors };
  const at = new Date().toISOString();
  const replacement: BotMemoryRecord = {
    id: `mem-${slugify(fixed.subject)}-${Date.now().toString(36)}`,
    kind: orig.kind,
    subject: orig.subject,
    summary: fixed.summary.trim(),
    refs: fixed.refs ?? [],
    truthState: fixed.truthState ?? 'UNVERIFIED',
    status: 'ACTIVE',
    provenance: { source: fixed.source ?? 'owner', recordedBy: actor, recordedAt: at },
    reviewAfter: fixed.reviewAfter ?? null,
    supersedes: orig.id,
    supersededBy: null,
    supersededAt: null,
    history: [{ action: 'RECORDED', actor, at, note: `Correction of ${orig.id}.` }],
  };
  const superseded: BotMemoryRecord = {
    ...orig,
    status: 'SUPERSEDED',
    truthState: 'SUPERSEDED',
    supersededBy: replacement.id,
    supersededAt: at,
    history: [...orig.history, { action: 'SUPERSEDED', actor, at, note: `Superseded by ${replacement.id}.` }],
  };
  saveMemories([replacement, ...records.map((r) => (r.id === id ? superseded : r))]);
  return { ok: true, record: replacement };
}

// forget() — OWNER only, reason required. Deletion is a
// tombstone: content removed, existence + reason retained.
export function forgetMemory(id: string, reason: string, actor: string): RecordResult {
  if (actor !== 'owner') {
    return { ok: false, errors: ['Only the owner can delete a memory — deletion is a governed act, never a STAR or worker action.'] };
  }
  if (typeof reason !== 'string' || !reason.trim()) {
    return { ok: false, errors: ['forget() requires a reason — the tombstone retains the reason so the deletion stays reviewable.'] };
  }
  const records = loadMemories();
  const orig = records.find((r) => r.id === id);
  if (!orig) return { ok: false, errors: [`Memory not found: ${id}.`] };
  if (orig.status === 'DELETED') return { ok: false, errors: [`Memory ${id} is already a deleted tombstone.`] };
  const at = new Date().toISOString();
  const tomb: BotMemoryRecord = {
    id: orig.id,
    kind: orig.kind,
    subject: null,
    summary: null,
    refs: [],
    truthState: orig.truthState,
    status: 'DELETED',
    provenance: orig.provenance,
    reviewAfter: null,
    supersedes: orig.supersedes,
    supersededBy: orig.supersededBy,
    supersededAt: orig.supersededAt,
    deletedAt: at,
    deletedBy: actor,
    forgetReason: reason.trim(),
    history: [...orig.history, { action: 'FORGOTTEN', actor, at, note: reason.trim() }],
  };
  saveMemories(records.map((r) => (r.id === id ? tomb : r)));
  return { ok: true, record: tomb };
}

export interface MemorySummary {
  total: number;
  totalRetained: number;
  byKind: Record<string, number>;
  byTruthState: Record<string, number>;
  supersededCount: number;
  deletedCount: number;
  staleCount: number;
  recent: { id: string; kind: string; subject: string | null; summary: string | null; truthState: string }[];
}

// summary() — the single read-only derivation for STAR and the
// Bot Operations panel. It never writes. Truth counts cover
// ACTIVE records only; superseded and deleted records are their
// own counts, never folded in.
export function memorySummary(now?: string): MemorySummary {
  const list = loadMemories();
  const byKind: Record<string, number> = {};
  MEMORY_KINDS.forEach((k) => { byKind[k] = 0; });
  const byTruthState: Record<string, number> = {};
  MEMORY_TRUTH_STATES.forEach((t) => { byTruthState[t] = 0; });
  let active = 0;
  let supersededCount = 0;
  let deletedCount = 0;
  let staleCount = 0;
  for (const r of list) {
    if (r.status === 'DELETED') { deletedCount += 1; continue; }
    if (r.status === 'SUPERSEDED') { supersededCount += 1; continue; }
    active += 1;
    if (byKind[r.kind] !== undefined) byKind[r.kind] += 1;
    if (byTruthState[r.truthState] !== undefined) byTruthState[r.truthState] += 1;
    if (isStale(r, now)) staleCount += 1;
  }
  const recent = list
    .filter((r) => r.status === 'ACTIVE')
    .sort((a, b) => Date.parse(b.provenance.recordedAt) - Date.parse(a.provenance.recordedAt))
    .slice(0, 5)
    .map((r) => ({ id: r.id, kind: r.kind, subject: r.subject, summary: r.summary, truthState: r.truthState }));
  return { total: active, totalRetained: list.length, byKind, byTruthState, supersededCount, deletedCount, staleCount, recent };
}
