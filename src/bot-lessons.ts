/**
 * Bot Lessons — the store where the bot system LEARNS from its own
 * mistakes (v247). A Lesson is a recorded failure with the fix and
 * the evidence, so the runtime and STAR consult it BEFORE acting
 * instead of repeating the same failure.
 *
 *  - Persisted in localStorage (mti6_bot_lessons_v1), capped at 200.
 *  - Seeded with FIVE lessons from this project's own history only
 *    (seedLessons is idempotent — it seeds only when the store is
 *    empty). No lesson is invented: every seed cites real evidence
 *    (a commit, a repo file/line, or the daily log).
 *  - recordLesson() duplicate-guards by normalized title: a failure
 *    already recorded does not get a second lesson.
 *  - consultLessons(context) returns the ACTIVE lessons whose
 *    wording matches the work about to run — the runtime calls it
 *    at the start of every executor run.
 *  - A lesson's status is ACTIVE until the owner marks it
 *    RESOLVED (resolveLesson, owner act); RESOLVED lessons stay
 *    readable as history but are never consulted.
 *
 * Lessons are records about what happened, never credentials:
 * no key value, token, or secret may appear in any field.
 */

export const LESSONS_STORE_KEY = 'mti6_bot_lessons_v1';
export const MAX_LESSONS = 200;

export type LessonStatus = 'ACTIVE' | 'RESOLVED';

export interface Lesson {
  id: string;
  title: string;
  whatWentWrong: string;
  fix: string;
  source: string;
  recordedAt: string;
  status: LessonStatus;
  changedWhat: string;
}

export type LessonDraft = Omit<Lesson, 'id' | 'recordedAt' | 'status'>;

const normTitle = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');

const slugify = (s: string): string =>
  normTitle(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'lesson';

function isLesson(r: unknown): r is Lesson {
  if (!r || typeof r !== 'object') return false;
  const l = r as Lesson;
  return (
    typeof l.id === 'string' &&
    typeof l.title === 'string' &&
    typeof l.whatWentWrong === 'string' &&
    typeof l.fix === 'string' &&
    typeof l.source === 'string' &&
    typeof l.recordedAt === 'string' &&
    (l.status === 'ACTIVE' || l.status === 'RESOLVED') &&
    typeof l.changedWhat === 'string'
  );
}

export function loadLessons(): Lesson[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(LESSONS_STORE_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter(isLesson);
  } catch {
    return [];
  }
}

function saveLessons(lessons: Lesson[]): void {
  try {
    localStorage.setItem(LESSONS_STORE_KEY, JSON.stringify(lessons.slice(0, MAX_LESSONS)));
  } catch {
    /* storage full/blocked — the in-memory result still returns */
  }
}

export function getActiveLessons(): Lesson[] {
  return loadLessons().filter((l) => l.status === 'ACTIVE');
}

export type RecordLessonResult = { ok: boolean; lesson?: Lesson; deduped?: boolean; errors?: string[] };

/** Record a lesson. Duplicate-guarded by normalized title: a
 * lesson with the same title already in the store is returned
 * with deduped: true and no second copy is written. */
export function recordLesson(draft: LessonDraft): RecordLessonResult {
  const errors: string[] = [];
  if (!draft.title || !draft.title.trim()) errors.push('A lesson needs a title.');
  if (!draft.whatWentWrong || !draft.whatWentWrong.trim()) errors.push('A lesson needs what went wrong.');
  if (!draft.fix || !draft.fix.trim()) errors.push('A lesson needs the fix.');
  if (!draft.source || !draft.source.trim()) errors.push('A lesson needs its source — the evidence, not a claim.');
  if (!draft.changedWhat || !draft.changedWhat.trim()) errors.push('A lesson needs what it changed.');
  if (errors.length) return { ok: false, errors };
  const lessons = loadLessons();
  const key = normTitle(draft.title);
  const existing = lessons.find((l) => normTitle(l.title) === key);
  if (existing) return { ok: true, lesson: existing, deduped: true };
  const at = new Date().toISOString();
  const lesson: Lesson = {
    id: `lesson-${slugify(draft.title)}-${Date.now().toString(36)}`,
    title: draft.title.trim(),
    whatWentWrong: draft.whatWentWrong.trim(),
    fix: draft.fix.trim(),
    source: draft.source.trim(),
    recordedAt: at,
    status: 'ACTIVE',
    changedWhat: draft.changedWhat.trim(),
  };
  saveLessons([lesson, ...lessons]);
  return { ok: true, lesson };
}

/* --- IMMEDIATE PATH (v247, owner direction #9: learn from a
 * mistake RIGHT AWAY) -------------------------------------------
 * recordLesson() already writes synchronously — localStorage
 * writes are synchronous, so a lesson recorded here is in the
 * store before this function returns, and consultLessons() /
 * getActiveLessons() on the VERY NEXT action see it. There is
 * no batching, no queue, no deferral: the next action cannot
 * repeat the mistake without the lesson being active.
 *
 * recordLessonNow() is that synchronous wrapper: it records,
 * guarantees the returned lesson is ACTIVE (a repeat of a
 * previously RESOLVED lesson re-activates it — the mistake
 * happened again, so the lesson is live again), and notifies
 * subscribers at once so the next action can re-read active
 * lessons immediately. The duplicate guard still holds: the
 * same mistake recorded twice stays one lesson (deduped: true),
 * never a second copy. */

export type LessonRecordedListener = (lesson: Lesson) => void;

const lessonRecordedListeners = new Set<LessonRecordedListener>();

/** Subscribe to lesson records — fired synchronously, in the
 * same call that records the lesson, so the next action can
 * re-read active lessons at once. Returns an unsubscribe
 * function. A listener throwing never breaks recording. */
export function onLessonRecorded(fn: LessonRecordedListener): () => void {
  lessonRecordedListeners.add(fn);
  return () => {
    lessonRecordedListeners.delete(fn);
  };
}

function notifyLessonRecorded(lesson: Lesson): void {
  for (const fn of [...lessonRecordedListeners]) {
    try {
      fn(lesson);
    } catch {
      /* a listener must never break recording */
    }
  }
}

/** Record a lesson NOW — synchronous, ACTIVE immediately.
 * Same validation and duplicate guard as recordLesson(). */
export function recordLessonNow(draft: LessonDraft): RecordLessonResult {
  const result = recordLesson(draft);
  if (!result.ok || !result.lesson) return result;
  if (result.deduped && result.lesson.status === 'RESOLVED') {
    // The same mistake happened again after the lesson was
    // resolved: re-activate it so it is live for the next action.
    const lessons = loadLessons();
    const reactivated: Lesson = { ...result.lesson, status: 'ACTIVE' };
    saveLessons(lessons.map((l) => (l.id === reactivated.id ? reactivated : l)));
    notifyLessonRecorded(reactivated);
    return { ok: true, lesson: reactivated };
  }
  if (!result.deduped) notifyLessonRecorded(result.lesson);
  return result;
}

/** Owner act: mark a lesson RESOLVED. It stays readable as
 * history but is never consulted again. */
export function resolveLesson(id: string): boolean {
  const lessons = loadLessons();
  const target = lessons.find((l) => l.id === id);
  if (!target || target.status === 'RESOLVED') return false;
  saveLessons(lessons.map((l) => (l.id === id ? { ...l, status: 'RESOLVED' } : l)));
  return true;
}

/**
 * consultLessons — the read the runtime and STAR do before
 * acting. Matches ACTIVE lessons whose title / what-went-wrong
 * / fix share a significant word (4+ letters) with the context
 * (executor id + label + task title, or a STAR action's words).
 * Deliberately simple keyword overlap: a lesson about a dead
 * model or a swapped coordinate is consulted before the provider
 * call or the camera fetch that would repeat it.
 */
export function consultLessons(context: string): Lesson[] {
  const words = context
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
  if (words.length === 0) return [];
  const unique = [...new Set(words)];
  return getActiveLessons().filter((l) => {
    const hay = `${l.title} ${l.whatWentWrong} ${l.fix}`.toLowerCase();
    return unique.some((w) => hay.includes(w));
  });
}

/* The five seed lessons — this project's own history only.
 * Each cites the commit / file / daily-log line that proves it. */
const SEED_LESSONS: LessonDraft[] = [
  {
    title: 'Dead OpenRouter model wired as the STAR default',
    whatWentWrong:
      'The proxy default model meta-llama/llama-3.3-70b-instruct:free no longer exists on OpenRouter — the public models list carries the paid llama-3.3-70b-instruct only and zero :free Meta variants. STAR chat failed twice with UPSTREAM_ERROR (21:52 and 21:55 UTC, 2026-11-25): not a 401 (key fine) and not a 429 (not rate-limited) — the model was simply gone.',
    fix: 'v242 switched STAR_DEFAULT_MODEL to google/gemma-4-31b-it:free, a free model verified live on OpenRouter\'s public models list the same day. Verify a model exists on the provider\'s public model list before wiring it as a default.',
    source:
      'v242 commit 48b19a6e (netlify/functions/mti6-proxy.mjs STAR_DEFAULT_MODEL switch); ~/memory/2026-11-25.md — "STAR upstream error ROOT CAUSE" (model no longer exists; OpenRouter 404 → proxy UPSTREAM_ERROR) and the 21:52/21:55 UTC failed star.chat calls.',
    changedWhat:
      'STAR\'s default model is now one verified live on the provider\'s public list, and the proxy carries upstreamStatus on UPSTREAM_ERROR so a dead model is distinguishable from a bad key.',
  },
  {
    title: 'OpenRouter free-tier 429 is model-specific until proven otherwise',
    whatWentWrong:
      'At the 5:27 PM check on 2026-11-25, the Gemma 4 31B model (google/gemma-4-31b-it:free, the v242 default) answered RATE_LIMITED on a star.chat call and one retry — upstream 429, no retry-after. STAR was configured but not answering live.',
    fix: 'v244 switched the default to nvidia/nemotron-3.5-lightning:free — a different free model family, verified live on OpenRouter\'s public models list the same day — and STAR replied live on the first call. A 429 on a free model is model-specific until proven otherwise: try another verified free model before assuming a shared cap.',
    source:
      'v244 commit fda11f50; netlify/functions/mti6-proxy.mjs L124–135 (v244 comment: 5:27 PM check, RATE_LIMITED, upstream 429, no retry-after); ~/memory/2026-11-25.md — 17:29 EST verification (both calls RATE_LIMITED), the owner\'s "Try another free model" decision, and the first live STAR reply ("Hello!") after the switch.',
    changedWhat:
      'The STAR default moved to a different verified free model family instead of assuming a shared cap; the proxy comment records the honest caveat that a shared daily free-tier cap is still possible if the new model hits the same wall.',
  },
  {
    title: 'Louisiana cameras came back in State Plane feet — inSR without outSR',
    whatWentWrong:
      'v237 set inSR 4326 but NOT outSR on the Louisiana camera handler, so the Baton Rouge and St. George ArcGIS services returned geometry in their native Louisiana State Plane feet (lat 699314, lon 3341977). Every Louisiana camera would have been silently filtered out client-side by the 50 km filter. An earlier fix attempt landed the outSR on the California handler by mistake and was caught by reading the file and reverted before the Louisiana edit.',
    fix: 'v238 added outSR: "4326" to the Louisiana handler only (both Louisiana queries). ArcGIS query params must carry both inSR and outSR, and a handler edit must land on the right handler.',
    source:
      'v238 commit 4a85c1b1; netlify/functions/mti6-proxy.mjs L1177–1180 (outSR: "4326" on the Louisiana handler); ~/memory/2026-11-25.md — live-probe bug (State Plane feet, lat 699314 / lon 3341977) and the v238 fix note (earlier edit landed on California by mistake, reverted; verified live after deploy: 102 cameras, correct degrees).',
    changedWhat:
      'The Louisiana proxy handler now sends outSR 4326 on both queries, so cameras return degrees (verified live: 102 cameras, e.g. br-1 30.4228, -91.1393).',
  },
  {
    title: 'TxDOT camera attributes carry latitude/longitude SWAPPED — use geometry only',
    whatWentWrong:
      'The TxDOT statewide camera service\'s latitude/longitude attributes are SWAPPED relative to the real position. Any fetcher reading the attributes would place every Texas camera at the wrong coordinates.',
    fix: 'The TxDOT fetcher ignores the attribute latitude/longitude entirely and reads geometry x/y only. Never trust attribute lat/lon on an ArcGIS layer without checking against geometry.',
    source:
      'src/worlds/WorldGlobe.tsx — TxDOT fetcher comment ("the attributes\' latitude and longitude are SWAPPED, so only geometry x/y are used") and the fetcher passing (a, lon, lat) from geometry; ~/memory/2026-11-25.md — "GOTCHA: the attributes\' latitude/longitude are SWAPPED — the fetcher uses geometry x/y only."',
    changedWhat:
      'The TxDOT fetcher reads geometry x/y only, so Texas cameras land at their real positions.',
  },
  {
    title: 'CoinGecko key present but unread — variable name mismatch',
    whatWentWrong:
      'Netlify holds COINGECKO_API_KEY, but the proxy reads MTI6_COINGECKO_API_KEY, so the gateway reports coingecko false even though a CoinGecko key is present in Netlify. A key being present is not the same as the code reading it.',
    fix: 'Rename the Netlify variable to MTI6_COINGECKO_API_KEY (owner step — no code change; the proxy already reads that exact name). Variable names must match exactly between the host and the code.',
    source:
      'netlify/functions/mti6-proxy.mjs L516 (pick env.MTI6_COINGECKO_API_KEY) and L575 (error text names MTI6_COINGECKO_API_KEY); ~/memory/2026-11-25.md — "Gateway reports coingecko false — proxy expects MTI6_COINGECKO_API_KEY, Netlify holds COINGECKO_API_KEY (name mismatch)" and the Netlify session note (COINGECKO_API_KEY already exists in Netlify).',
    changedWhat:
      'No code change yet — the rename is an open owner step. What changed: the keys check now compares the exact variable name the proxy reads, not just whether a key exists, so a present-but-unread key is caught instead of assumed working.',
  },
];

/** Seed the five real lessons. Idempotent: seeds only when the
 * store is empty — existing lessons (including owner-added or
 * run-recorded ones) are never overwritten or duplicated. */
export function seedLessons(): { seeded: number; alreadyPresent: boolean } {
  const existing = loadLessons();
  if (existing.length > 0) return { seeded: 0, alreadyPresent: true };
  let seeded = 0;
  for (const draft of SEED_LESSONS) {
    const r = recordLesson(draft);
    if (r.ok && !r.deduped) seeded += 1;
  }
  return { seeded, alreadyPresent: false };
}
