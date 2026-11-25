/* Bot Learning — the web-source learning loop (v247, owner
 * direction 2026-11-25 ~6:42 PM EST: equip the bots to be SUPER
 * INTELLIGENT, part 1).
 *
 * The Tribe web harvest gathers RAW excerpts from web sources
 * (src/web-harvest.ts). This module is the learning loop that
 * turns OK harvest records into knowledge the bots can use:
 *
 *  (a) a Bot Memory record (kind RESEARCH_EVIDENCE, truthState
 *      UNVERIFIED) for every OK record — harvested excerpts are
 *      RAW and stay UNVERIFIED, never promoted; and
 *  (b) a project-knowledge record ONLY when the excerpt is
 *      project-relevant (kind PAPER, or DIRECTIVE when it reads
 *      like an owner direction/decision).
 *
 * Learning is continuous: learnFromHarvest() is safe to call on
 * every harvest run and only processes OK records it has not
 * learned yet. Learned record ids persist in localStorage
 * (mti6_bot_learned_v1, capped at 500).
 *
 * HONEST LIMITS (do not soften these in the UI):
 * - Knowledge is only what is real — UNVERIFIED stays
 *   UNVERIFIED, unknown stays UNKNOWN. Nothing here invents
 *   knowledge to look smart; distillation only shortens the
 *   stored excerpt (1,500 chars → ≤500), it never adds claims.
 * - FAILED harvest records are never learned (nothing was
 *   fetched); records with an empty excerpt are skipped.
 * - The project-knowledge exclusion guard applies at this
 *   write path too: the personal-details archive, personal mail
 *   unrelated to the project, and phone/SMS/text threads are
 *   NEVER ingested. A record the guard refuses is skipped and
 *   logged, never forced in. An ambiguous source is skipped
 *   and recorded in the skip log rather than ingested.
 * - No key value, token, or secret may appear in any field.
 */

import { loadHarvestRecords, type HarvestRecord } from './web-harvest';
import { loadMemories, recordMemory } from './bot-memory';
import {
  addProjectKnowledge,
  checkProjectKnowledgeExclusion,
  recordSkippedSource,
} from './project-knowledge';

export const LEARNED_KEY = 'mti6_bot_learned_v1';
export const LEARNED_SKIPPED_KEY = 'mti6_bot_learned_skipped_v1';
export const MAX_LEARNED_IDS = 500;
export const MAX_LEARNED_SKIPS = 200;
/** Distilled summaries are capped at 500 chars (the stored
 * harvest excerpt is already capped at 1,500). */
export const MAX_DISTILLED_CHARS = 500;

export interface LearnedSkip {
  recordId: string;
  ref: string;
  reason: string;
  at: string;
}

export interface LearningResult {
  /** OK records distilled into Bot Memory on this call. */
  learned: number;
  /** Records skipped on this call (with reasons in the skip log). */
  skipped: number;
  /** OK records still unlearned after this call. */
  pending: number;
  /** Project-knowledge records added on this call (subset of learned). */
  projectKnowledgeAdded: number;
}

export interface LearningSummary {
  /** Total harvest records learned so far (persisted ids). */
  learned: number;
  /** Total records skipped so far (persisted skip log). */
  skipped: number;
  /** OK harvest records not yet learned. */
  pending: number;
}

/* --- Learned-ids store ------------------------------------------------ */

function loadLearnedIds(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LEARNED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveLearnedIds(ids: string[]): void {
  try {
    localStorage.setItem(LEARNED_KEY, JSON.stringify(ids.slice(0, MAX_LEARNED_IDS)));
  } catch {
    /* storage full/blocked — the in-memory result still returns */
  }
}

/* --- Skip log --------------------------------------------------------- */

export function loadLearnedSkips(): LearnedSkip[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LEARNED_SKIPPED_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is LearnedSkip =>
        !!s && typeof s === 'object' &&
        typeof (s as LearnedSkip).recordId === 'string' &&
        typeof (s as LearnedSkip).reason === 'string',
    );
  } catch {
    return [];
  }
}

function saveLearnedSkips(skips: LearnedSkip[]): void {
  try {
    localStorage.setItem(LEARNED_SKIPPED_KEY, JSON.stringify(skips.slice(0, MAX_LEARNED_SKIPS)));
  } catch {
    /* storage full/blocked */
  }
}

function recordLearnedSkip(record: HarvestRecord, reason: string): void {
  const entry: LearnedSkip = {
    recordId: record.id,
    ref: `${record.sourceName} — ${record.url}`.slice(0, 200),
    reason: reason.slice(0, 500),
    at: new Date().toISOString(),
  };
  saveLearnedSkips([entry, ...loadLearnedSkips()]);
}

/* --- Distillation + project relevance ---------------------------------- */

/** Shorten only: collapse whitespace and cap at 500 chars.
 * Distillation never adds claims to the excerpt. */
export function distillExcerpt(excerpt: string): string {
  return excerpt.replace(/\s+/g, ' ').trim().slice(0, MAX_DISTILLED_CHARS);
}

/** Project relevance is narrow on purpose: the harvest's market
 * feeds (prices, yields, pairs) are platform data, not project
 * knowledge — only excerpts that mention the project itself
 * (MTI6/GTADWIY, STAR, the Tribe, the deploy/backup/handoff
 * track) qualify for the project-knowledge feed. */
const PROJECT_PHRASES = [
  'mti6',
  'gtadwiy',
  'world globe',
  'crypto world',
  'bot operations',
  'swap desk',
  'money radar',
  'deploy preview',
  'deploy notice',
  'backup',
  'handoff',
  'directive',
  'owner decision',
  'netlify',
];
const PROJECT_WORDS = ['cockpit', 'star', 'tribe'];

export function isProjectRelevant(record: HarvestRecord): boolean {
  const hay = `${record.sourceName} ${record.url} ${record.excerpt}`.toLowerCase();
  if (PROJECT_PHRASES.some((p) => hay.includes(p))) return true;
  return PROJECT_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(hay));
}

function isDirectiveLike(record: HarvestRecord): boolean {
  const hay = `${record.sourceName} ${record.excerpt}`.toLowerCase();
  return hay.includes('directive') || hay.includes('owner decision') || hay.includes('decision:');
}

/* --- The learning loop ------------------------------------------------- */

/**
 * Learn from every OK harvest record not yet learned. Safe to
 * call on every harvest run: already-learned ids are skipped,
 * FAILED records are never learned, and an empty excerpt is
 * skipped and logged. Returns what this call did.
 */
export function learnFromHarvest(): LearningResult {
  const records = loadHarvestRecords();
  const learnedIds = loadLearnedIds();
  const learnedSet = new Set(learnedIds);
  const okRecords = records.filter((r) => r.status === 'OK');

  let learned = 0;
  let skipped = 0;
  let projectKnowledgeAdded = 0;
  const newlyLearned: string[] = [];

  for (const record of okRecords) {
    if (learnedSet.has(record.id)) continue;

    const distilled = distillExcerpt(record.excerpt);
    if (!distilled) {
      recordLearnedSkip(record, 'Skipped: the harvest record has no excerpt to learn from — nothing was fetched to distill.');
      skipped += 1;
      newlyLearned.push(record.id);
      continue;
    }

    const title = `${record.sourceName} — ${record.kind} harvest`;
    const summary = `Harvested by ${record.principalName} from ${record.sourceName} (${record.url}): ${distilled}`;
    const cappedSummary = summary.slice(0, MAX_DISTILLED_CHARS);

    // The exclusion guard runs on the same text the
    // project-knowledge feed would receive. A refusal here
    // blocks BOTH writes — the record is skipped and logged,
    // never forced into either store.
    const exclusion = checkProjectKnowledgeExclusion({
      title,
      summary: cappedSummary,
      sourceRef: record.url,
    });
    if (exclusion) {
      recordLearnedSkip(record, exclusion);
      recordSkippedSource(exclusion, record.url || record.sourceName);
      skipped += 1;
      newlyLearned.push(record.id);
      continue;
    }

    // (a) Bot Memory — RAW harvest, UNVERIFIED forever at this
    // write path (recordMemory refuses VERIFIED outright).
    const mem = recordMemory(
      {
        kind: 'RESEARCH_EVIDENCE',
        subject: title,
        summary: cappedSummary,
        truthState: 'UNVERIFIED',
        refs: [record.url],
        source: 'web-harvest',
      },
      record.principalName,
    );
    if (!mem.ok) {
      recordLearnedSkip(
        record,
        `Skipped: Bot Memory refused the record — ${(mem.errors ?? ['unknown reason']).join(' ')}`,
      );
      skipped += 1;
      newlyLearned.push(record.id);
      continue;
    }

    // (b) Project knowledge — only when project-relevant, and
    // only through the guarded write path (which re-checks the
    // exclusions and duplicate-guards by title).
    if (isProjectRelevant(record)) {
      const pk = addProjectKnowledge({
        kind: isDirectiveLike(record) ? 'DIRECTIVE' : 'PAPER',
        title,
        summary: cappedSummary,
        source: 'build',
        sourceRef: `${record.sourceName} — ${record.url}`,
      });
      if (pk.ok && !pk.deduped) projectKnowledgeAdded += 1;
      // A refusal here is already logged in the
      // project-knowledge skip log by addProjectKnowledge; the
      // Bot Memory record above still stands — the harvest was
      // learned, it simply was not project knowledge.
    }

    learned += 1;
    newlyLearned.push(record.id);
  }

  if (newlyLearned.length > 0) {
    saveLearnedIds([...newlyLearned, ...learnedIds]);
  }

  const pending = loadHarvestRecords()
    .filter((r) => r.status === 'OK')
    .filter((r) => !new Set(loadLearnedIds()).has(r.id)).length;

  return { learned, skipped, pending, projectKnowledgeAdded };
}

/** Counts: learned so far, skipped so far, OK records still pending. */
export function learningSummary(): LearningSummary {
  const learnedIds = new Set(loadLearnedIds());
  const pending = loadHarvestRecords()
    .filter((r) => r.status === 'OK')
    .filter((r) => !learnedIds.has(r.id)).length;
  return {
    learned: learnedIds.size,
    skipped: loadLearnedSkips().length,
    pending,
  };
}

/** The learning feed for the panel: what the bots learned from
 * web sources, newest first. Sourced from Bot Memory records
 * written by this loop (provenance source 'web-harvest') — every
 * entry carries its UNVERIFIED truth state. */
export interface LearnedFeedEntry {
  memoryId: string;
  harvestRef: string;
  subject: string;
  summary: string;
  truthState: string;
  learnedAt: string;
}

export function learnedFeed(): LearnedFeedEntry[] {
  return loadMemories()
    .filter((r) => r.status === 'ACTIVE' && r.provenance.source === 'web-harvest')
    .sort((a, b) => Date.parse(b.provenance.recordedAt) - Date.parse(a.provenance.recordedAt))
    .map((r) => ({
      memoryId: r.id,
      harvestRef: r.refs[0] ?? '',
      subject: r.subject ?? '',
      summary: r.summary ?? '',
      truthState: r.truthState,
      learnedAt: r.provenance.recordedAt,
    }));
}
