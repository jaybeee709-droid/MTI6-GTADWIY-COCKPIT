/* Bot Recall — relevance-ranked memory (v247, owner direction
 * 2026-11-25 ~6:42 PM EST: equip the bots to be SUPER INTELLIGENT,
 * part 4 — REMEMBERING EVERYTHING, recalled by relevance).
 *
 * recallFor() searches everything the bots remember — Bot Memory
 * records, active lessons, active project knowledge, and open
 * tasks — for keyword overlap with the question, ranks by
 * relevance, and returns the top `budget` items (default 8).
 *
 * Ranking: a query word in the title scores more than in the
 * summary, which scores more than in the body. Recency is a
 * tiebreak only — a newer record never outranks a more relevant
 * older one. Each result carries a one-line why-it-matched.
 *
 * HONEST BOUNDS: memory is persistent but bounded by storage
 * and the models' context, so recall is prioritized, not
 * literally everything at once — RECALL_BUDGET_NOTE says so
 * wherever recall is shown.
 *
 * EXCLUSIONS: recall never returns the personal-details archive,
 * personal mail, or phone messages. Those are never in the
 * stores — and this function also refuses to match a stray
 * record whose text mentions them: any candidate whose source
 * text matches the exclusion patterns is skipped.
 */

import { loadMemories } from './bot-memory';
import { getActiveLessons } from './bot-lessons';
import { getActiveProjectKnowledge } from './project-knowledge';
import { loadTasks } from './worker-tasks';

/** The honest line shown wherever recall results appear. */
export const RECALL_BUDGET_NOTE =
  'Recall is prioritized by relevance and bounded by storage and model context — the most relevant records, not literally everything at once.';

/** Default recall budget: the most relevant 8 records. */
export const DEFAULT_RECALL_BUDGET = 8;

export type RecallSourceKind = 'MEMORY' | 'LESSON' | 'PROJECT_KNOWLEDGE' | 'TASK';

export interface RecallItem {
  source: RecallSourceKind;
  id: string;
  title: string;
  /** The one-line text shown for the record (summary / fix / title). */
  text: string;
  /** One line: which question words matched, and where. */
  why: string;
  /** Relevance score (higher = more relevant). */
  score: number;
  /** ISO timestamp of the record, for the recency tiebreak. */
  at: string;
}

/* --- Exclusion guard (same categories as the project-knowledge
 * guard, matched on wording only — no personal detail appears
 * here) ------------------------------------------------------------ */

const EXCLUDED_RE =
  /personal-details-archive|personal (mail|email|message|inbox)|\bphone\b|\bsms\b|\btext messages?\b|\btext threads?\b/i;

function isExcluded(text: string): boolean {
  return EXCLUDED_RE.test(text);
}

/* --- Scoring ----------------------------------------------------------- */

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'what', 'when',
  'where', 'which', 'have', 'has', 'had', 'are', 'was', 'were', 'been',
  'does', 'did', 'how', 'why', 'about', 'into', 'over', 'under', 'your',
  'our', 'their', 'there', 'here', 'tell', 'show', 'list', 'give', 'know',
]);

/** Query words: lowercase, 3+ letters, stopwords dropped. */
export function recallWords(question: string): string[] {
  const words = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return [...new Set(words)];
}

interface ScoredCandidate {
  item: RecallItem;
  atMs: number;
}

function scoreCandidate(
  source: RecallSourceKind,
  id: string,
  title: string,
  summary: string,
  body: string,
  at: string,
  words: string[],
): ScoredCandidate | null {
  const titleLower = title.toLowerCase();
  const summaryLower = summary.toLowerCase();
  const bodyLower = body.toLowerCase();
  let score = 0;
  const titleHits: string[] = [];
  const summaryHits: string[] = [];
  const bodyHits: string[] = [];
  for (const w of words) {
    if (titleLower.includes(w)) {
      score += 3;
      titleHits.push(w);
    } else if (summaryLower.includes(w)) {
      score += 2;
      summaryHits.push(w);
    } else if (bodyLower.includes(w)) {
      score += 1;
      bodyHits.push(w);
    }
  }
  if (score === 0) return null;
  const parts: string[] = [];
  if (titleHits.length > 0) parts.push(`"${titleHits.join('", "')}" in the title`);
  if (summaryHits.length > 0) parts.push(`"${summaryHits.join('", "')}" in the summary`);
  if (bodyHits.length > 0) parts.push(`"${bodyHits.join('", "')}" in the details`);
  const why = `Matched ${parts.join('; ')}.`;
  return {
    item: { source, id, title, text: summary || body || title, why, score, at },
    atMs: Date.parse(at) || 0,
  };
}

/* --- Recall ------------------------------------------------------------ */

/**
 * Search Bot Memory, active lessons, active project knowledge,
 * and open tasks for the question; return the top `budget`
 * items ranked by relevance (recency breaks ties only).
 * Returns [] for an empty question. Excluded sources (the
 * personal-details archive, personal mail, phone/SMS) are
 * never returned, even if a stray record mentions them.
 */
export function recallFor(question: string, budget: number = DEFAULT_RECALL_BUDGET): RecallItem[] {
  const words = recallWords(question);
  if (words.length === 0) return [];
  const limit = Number.isFinite(budget) && budget > 0 ? Math.floor(budget) : DEFAULT_RECALL_BUDGET;
  const scored: ScoredCandidate[] = [];

  const consider = (c: ScoredCandidate | null) => {
    if (c) scored.push(c);
  };

  // Bot Memory — ACTIVE records only (superseded/deleted are history).
  for (const r of loadMemories()) {
    if (r.status !== 'ACTIVE' || !r.subject || !r.summary) continue;
    const combined = `${r.subject} ${r.summary} ${r.refs.join(' ')} ${r.provenance.source}`;
    if (isExcluded(combined)) continue;
    consider(
      scoreCandidate(
        'MEMORY',
        r.id,
        r.subject,
        r.summary,
        r.refs.join(' '),
        r.provenance.recordedAt,
        words,
      ),
    );
  }

  // Active lessons.
  for (const l of getActiveLessons()) {
    const combined = `${l.title} ${l.whatWentWrong} ${l.fix} ${l.source}`;
    if (isExcluded(combined)) continue;
    consider(
      scoreCandidate(
        'LESSON',
        l.id,
        l.title,
        l.whatWentWrong,
        `${l.fix} ${l.changedWhat} ${l.source}`,
        l.recordedAt,
        words,
      ),
    );
  }

  // Active project knowledge.
  for (const p of getActiveProjectKnowledge()) {
    const combined = `${p.title} ${p.summary} ${p.sourceRef} ${p.source}`;
    if (isExcluded(combined)) continue;
    consider(
      scoreCandidate(
        'PROJECT_KNOWLEDGE',
        p.id,
        p.title,
        p.summary,
        `${p.sourceRef} ${p.source}`,
        p.recordedAt,
        words,
      ),
    );
  }

  // Open tasks only — COMPLETE / FAILED / CANCELED are done.
  const OPEN_STATES = ['UNASSIGNED', 'QUEUED', 'WAITING', 'ACTIVE', 'BLOCKED', 'PAUSED'];
  for (const t of loadTasks()) {
    if (!OPEN_STATES.includes(t.state)) continue;
    const combined = `${t.title} ${t.role} ${t.principal ?? ''}`;
    if (isExcluded(combined)) continue;
    consider(
      scoreCandidate(
        'TASK',
        t.id,
        t.title,
        `${t.role}${t.principal ? ` — ${t.principal}` : ''} — ${t.state}`,
        (t.inputs ?? []).join(' '),
        t.updatedAt || t.createdAt,
        words,
      ),
    );
  }

  scored.sort((a, b) => b.item.score - a.item.score || b.atMs - a.atMs);
  return scored.slice(0, limit).map((s) => s.item);
}
