/**
 * Lessons Panel (v247) — renders every recorded bot lesson:
 * title, what went wrong, the fix, the source (evidence), the
 * status, and a line stating what the lesson changed. Reads live
 * from the lessons store (bot-lessons.ts); seeds the five real
 * project-history lessons on first render when the store is
 * empty. RESOLVED lessons stay visible as history but are marked
 * as no longer consulted.
 */
import React, { useEffect, useState } from 'react';
import { getActiveLessons, loadLessons, seedLessons, type Lesson } from '../bot-lessons';

export function LessonsPanel() {
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    seedLessons();
    setLessons(loadLessons());
  }, []);

  const activeCount = lessons.filter((l) => l.status === 'ACTIVE').length;

  return (
    <div className="rounded-lg border border-[#2a2a3a] bg-[#0b0b12] p-4">
      <div className="mb-1 text-sm font-bold tracking-wide text-white">BOT LESSONS — WHAT THE BOTS LEARNED FROM MISTAKES</div>
      <p className="mb-3 text-xs leading-relaxed text-zinc-400">
        {lessons.length} lesson(s) recorded · {activeCount} active — the worker runtime consults active lessons before every
        executor run, and failed runs record a new lesson when the error is new. Every lesson cites real evidence: a commit, a
        repo file, or the daily log. Nothing here is invented.
      </p>
      {lessons.length === 0 ? (
        <p className="text-xs text-zinc-500">No lessons recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {lessons.map((l) => (
            <div key={l.id} className="rounded-md border border-[#2a2a3a] bg-[#12121c] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white">{l.title}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
                    l.status === 'ACTIVE' ? 'bg-[#32D74B]/15 text-[#32D74B]' : 'bg-zinc-700/40 text-zinc-400'
                  }`}
                >
                  {l.status}
                </span>
                <span className="text-[10px] text-zinc-500">
                  recorded {new Date(l.recordedAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                <span className="font-semibold text-[#ff6b6b]">What went wrong: </span>
                {l.whatWentWrong}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                <span className="font-semibold text-[#32D74B]">Fix: </span>
                {l.fix}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                <span className="font-semibold text-zinc-200">Changed what: </span>
                {l.changedWhat}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                <span className="font-semibold">Source: </span>
                {l.source}
              </p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-zinc-500">
        Active lessons are consulted by the runtime before acting ({getActiveLessons().length} consulted this render) — a
        resolved lesson stays as history and is never consulted again.
      </p>
    </div>
  );
}
