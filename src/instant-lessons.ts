/**
 * Instant Lessons — the IMMEDIATE learning path (v247, owner
 * direction #9, 2026-11-25 ~6:43 PM: NEVER MAKE MISTAKES, and
 * IF one happens, LEARN FROM IT RIGHT AWAY).
 *
 * The moment a mistake / failure / error is detected — a failed
 * run, a wrong answer, a bad call, a refused action — its lesson
 * is recorded AT ONCE, not later, not in a batch, and it is
 * ACTIVE for the very next action: the runtime and STAR check
 * lessons before acting (consultLessons), so the same mistake
 * is not repeated.
 *
 * Why it is synchronous: recordLessonNow() in src/bot-lessons.ts
 * writes through localStorage, and localStorage writes are
 * synchronous — the lesson is in the store before this function
 * returns. No queue, no timer, no deferral. A caller that
 * records a lesson and then immediately consults lessons sees
 * it. Every lesson still cites real evidence (what happened,
 * what the fix was, source + time) — never an invented lesson.
 */

import {
  recordLessonNow,
  type Lesson,
  type LessonDraft,
  type RecordLessonResult,
} from './bot-lessons';
import { mistakeAlertForLesson } from './mistake-alerts';

export type MistakeKind = 'FAILED_RUN' | 'WRONG_ANSWER' | 'BAD_CALL' | 'REFUSED_ACTION';

export interface MistakeReport {
  kind: MistakeKind;
  whatWentWrong: string;
  fix: string;
  source: string;
}

const KIND_LABEL: Record<MistakeKind, string> = {
  FAILED_RUN: 'Failed run',
  WRONG_ANSWER: 'Wrong answer',
  BAD_CALL: 'Bad call',
  REFUSED_ACTION: 'Refused action',
};

/** What an instant lesson changes — the same line on every
 * instant lesson, so the guarantee is visible in the record. */
export const INSTANT_LESSON_CHANGED_WHAT =
  'Lesson recorded immediately on detection and ACTIVE for the very next action — the runtime and STAR consult lessons before acting, so this mistake is not repeated.';

/**
 * learnFromMistakeNow — record a lesson from a detected mistake
 * SYNCHRONOUSLY and return the recorded lesson (ACTIVE before
 * this function returns). The duplicate guard still holds: the
 * same mistake recorded twice stays one lesson (the existing
 * ACTIVE lesson is returned, deduped). Returns null only when
 * the report lacks required evidence (title / what went wrong /
 * fix / source) — a lesson is never recorded without evidence.
 */
export function learnFromMistakeNow(mistake: MistakeReport): Lesson | null {
  const label = KIND_LABEL[mistake.kind];
  const draft: LessonDraft = {
    title: `${label}: ${mistake.whatWentWrong}`,
    whatWentWrong: mistake.whatWentWrong,
    fix: mistake.fix,
    source: mistake.source,
    changedWhat: INSTANT_LESSON_CHANGED_WHAT,
  };
  const result: RecordLessonResult = recordLessonNow(draft);
  if (!result.ok || !result.lesson) return null;
  // v247 direction #10 — a newly recorded (or re-activated)
  // lesson also raises an immediate owner ALERT at once. A
  // deduped repeat raises no second alert. Alert storage failure
  // never breaks the lesson recording.
  if (!result.deduped) {
    try {
      mistakeAlertForLesson(result.lesson);
    } catch {
      /* alert is best-effort; the lesson stands */
    }
  }
  return result.lesson;
}

/**
 * reportWrongAnswer — the STAR wrong-answer hook. The coordinator
 * wires this to the STAR wrong-answer feedback button in App.tsx:
 * the owner flags a wrong STAR answer with the question, what
 * STAR said, and the right answer, and a WRONG_ANSWER lesson is
 * recorded at once (source 'star-feedback'), ACTIVE for STAR's
 * very next answer. Returns the recorded lesson, or null when
 * the report lacks the question / answer / correction.
 */
export function reportWrongAnswer(question: string, answer: string, correction: string): Lesson | null {
  const q = question.trim();
  const a = answer.trim();
  const c = correction.trim();
  if (!q || !a || !c) return null;
  const draft: LessonDraft = {
    title: `Wrong answer: ${q.slice(0, 100)}`,
    whatWentWrong: `STAR answered "${a}" to the question "${q}". The correct answer is "${c}".`,
    fix: `When asked "${q}", answer "${c}" — the owner-corrected answer recorded from STAR feedback.`,
    source: 'star-feedback',
    changedWhat: INSTANT_LESSON_CHANGED_WHAT,
  };
  const result: RecordLessonResult = recordLessonNow(draft);
  if (!result.ok || !result.lesson) return null;
  // v247 direction #10 — the wrong answer also raises an
  // immediate owner ALERT (newly recorded or re-activated only).
  if (!result.deduped) {
    try {
      mistakeAlertForLesson(result.lesson);
    } catch {
      /* alert is best-effort; the lesson stands */
    }
  }
  return result.lesson;
}

/** The honest line for the panel / STAR: the goal is zero
 * mistakes; the guarantee is instant learning when one slips
 * through. */
export function instantLessonsNote(): string {
  return 'Goal: zero mistakes. Guarantee: the moment one is detected, its lesson is recorded at once and is ACTIVE for the very next action — the runtime and STAR check lessons before acting.';
}
