/**
 * Bot Intelligence Panel (v247, owner direction 2026-11-25
 * ~6:42 PM EST: equip the bots to be SUPER INTELLIGENT).
 *
 * Four parts, one panel:
 *  (1) WEB-SOURCE LEARNING — the learning feed: what the bots
 *      learned from web sources (the harvest → Bot Memory loop),
 *      every entry labelled UNVERIFIED, with the
 *      continuous-learning note and a LEARN NOW button.
 *  (2) LANGUAGE — STAR's replies carry the fullest relevant
 *      context; the recall demo below is the same relevance
 *      ranking STAR's context builder uses.
 *  (3) RESPONSE TIME — the last STAR reply: the provider that
 *      answered and the measured round-trip ms (never invented);
 *      "no live reply yet — local brain is instant" until one
 *      exists. The fallback chain order stays OpenRouter →
 *      Claude → Gemini; the local brain stays instant.
 *  (4) REMEMBERING EVERYTHING — the recall demo: a question box
 *      that runs recallFor and shows the ranked results with
 *      why-each-matched, plus the memory-bounds note.
 *
 * HONEST LINES: harvested knowledge is RAW and UNVERIFIED;
 * recall is prioritized by relevance and bounded by storage
 * and model context — the most relevant records, not literally
 * everything at once. The personal-details archive, personal
 * mail, and phone messages are never in any of these stores.
 */
import React, { useEffect, useState } from 'react';
import {
  learnedFeed,
  learnFromHarvest,
  learningSummary,
  loadLearnedSkips,
  type LearnedFeedEntry,
  type LearnedSkip,
  type LearningSummary,
} from '../bot-learning';
import { RECALL_BUDGET_NOTE, recallFor, type RecallItem } from '../bot-recall';
import { getLastStarReply, type LastStarReply } from '../star-client';

const SOURCE_TONE: Record<string, string> = {
  MEMORY: 'bg-[#8B5CFF]/15 text-[#B79CFF]',
  LESSON: 'bg-[#FFB020]/15 text-[#FFB020]',
  PROJECT_KNOWLEDGE: 'bg-[#00B7FF]/15 text-[#7FD4FF]',
  TASK: 'bg-[#32D74B]/15 text-[#32D74B]',
};

export function BotIntelligencePanel() {
  const [summary, setSummary] = useState<LearningSummary>({ learned: 0, skipped: 0, pending: 0 });
  const [feed, setFeed] = useState<LearnedFeedEntry[]>([]);
  const [skips, setSkips] = useState<LearnedSkip[]>([]);
  const [question, setQuestion] = useState('');
  const [results, setResults] = useState<RecallItem[] | null>(null);
  const [lastReply, setLastReply] = useState<LastStarReply | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = () => {
    setSummary(learningSummary());
    setFeed(learnedFeed());
    setSkips(loadLearnedSkips());
    setLastReply(getLastStarReply());
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLearnNow = () => {
    const r = learnFromHarvest();
    setNotice(
      r.learned === 0 && r.skipped === 0
        ? 'Nothing new to learn — every OK harvest record is already in Bot Memory.'
        : `Learned ${r.learned} record(s)${r.projectKnowledgeAdded > 0 ? ` (${r.projectKnowledgeAdded} also added to project knowledge)` : ''}, skipped ${r.skipped}, ${r.pending} still pending.`,
    );
    refresh();
  };

  const onRecall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setResults(null);
      return;
    }
    setResults(recallFor(question));
    setLastReply(getLastStarReply());
  };

  return (
    <div className="rounded-lg border border-[#2a2a3a] bg-[#0b0b12] p-4">
      <div className="mb-1 text-sm font-bold tracking-wide text-white">
        BOT INTELLIGENCE — SUPER INTELLIGENT BOTS
      </div>
      <p className="mb-3 text-xs leading-relaxed text-zinc-400">
        The bots learn from web sources, speak from what they actually know, answer through the
        fastest provider that answers well, and remember everything they learn and do — recalled
        by relevance to the question at hand. Harvested knowledge is RAW and UNVERIFIED; unknown
        stays UNKNOWN. Nothing here invents knowledge to look smart.
      </p>

      {/* Response time — last measured STAR reply. */}
      <div className="mb-4 rounded-md border border-[#2a2a3a] bg-[#12121c] p-3">
        <div className="mb-1 text-xs font-bold tracking-wide text-white">RESPONSE TIME</div>
        {lastReply ? (
          <p className="text-xs leading-relaxed text-zinc-300">
            Last STAR reply: provider <span className="font-bold text-white">{lastReply.provider}</span>
            {' '}· model {lastReply.model} ·{' '}
            <span className="font-bold text-white">{lastReply.ms} ms</span> (measured round-trip,
            {lastReply.provider === 'local' ? ' local brain — instant' : ' live provider'}) ·{' '}
            {new Date(lastReply.at).toLocaleString()}
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-zinc-300">
            No live reply yet — local brain is instant.
          </p>
        )}
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
          Provider order is unchanged: OpenRouter first, then Claude, then Gemini. The local
          brain path is synchronous — no latency is added to it. Latency figures are measured
          on real replies only, never invented. A provider failure records an instant lesson
          at once (ACTIVE for the very next call) — see the Lessons feed.
        </p>
      </div>

      {/* Learning feed. */}
      <div className="mb-4">
        <div className="mb-1 text-xs font-bold tracking-wide text-white">
          LEARNING FEED — WHAT THE BOTS LEARNED FROM WEB SOURCES
        </div>
        <p className="mb-3 text-xs leading-relaxed text-zinc-400">
          Learning is continuous: every harvest run feeds new OK records into Bot Memory as
          UNVERIFIED research evidence (excerpts distilled to ≤500 chars). Project-relevant
          records also enter the project-knowledge feed. {summary.learned} learned ·{' '}
          {summary.skipped} skipped · {summary.pending} OK record(s) still pending.
        </p>
        <button
          type="button"
          onClick={onLearnNow}
          className="mb-3 rounded-md bg-[#8B5CFF] px-4 py-2 text-xs font-bold text-white hover:bg-[#7a4de8]"
        >
          LEARN NOW — DISTILL NEW HARVEST RECORDS
        </button>
        {notice ? (
          <p className="mb-3 text-xs leading-relaxed text-[#32D74B]">{notice}</p>
        ) : null}
        {feed.length === 0 ? (
          <p className="text-xs text-zinc-500">
            Nothing learned yet — run a harvest, then LEARN NOW.
          </p>
        ) : (
          <div className="space-y-3">
            {feed.slice(0, 10).map((f) => (
              <div key={f.memoryId} className="rounded-md border border-[#2a2a3a] bg-[#12121c] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[#FFB020]/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[#FFB020]">
                    {f.truthState}
                  </span>
                  <span className="text-sm font-semibold text-white">{f.subject}</span>
                  <span className="text-[10px] text-zinc-500">
                    learned {new Date(f.learnedAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-300">{f.summary}</p>
                {f.harvestRef ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                    <span className="font-semibold">Source: </span>
                    {f.harvestRef}
                  </p>
                ) : null}
              </div>
            ))}
            {feed.length > 10 ? (
              <p className="text-[11px] text-zinc-500">
                Showing the 10 most recent of {feed.length} learned record(s).
              </p>
            ) : null}
          </div>
        )}
        {skips.length > 0 ? (
          <div className="mt-3">
            <div className="mb-1 text-xs font-bold tracking-wide text-white">
              SKIPPED — LEFT OUT AND WHY
            </div>
            <div className="space-y-2">
              {skips.slice(0, 5).map((s) => (
                <div key={`${s.recordId}-${s.at}`} className="rounded-md border border-[#2a2a3a] bg-[#12121c] p-3">
                  <p className="text-xs font-semibold text-white">{s.ref}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">{s.reason}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Recall demo. */}
      <div className="border-t border-[#2a2a3a] pt-4">
        <div className="mb-1 text-xs font-bold tracking-wide text-white">
          RECALL — ASK THE BOTS WHAT THEY REMEMBER
        </div>
        <p className="mb-3 text-xs leading-relaxed text-zinc-400">
          Searches Bot Memory, active lessons, active project knowledge, and open tasks — ranked
          by relevance to your question (title match over summary match over details; recency
          breaks ties only). {RECALL_BUDGET_NOTE}
        </p>
        <form onSubmit={onRecall} className="mb-3 flex flex-wrap gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask what the bots remember — e.g. STAR fallback, CoinGecko key, Louisiana cameras"
            aria-label="Recall question"
            className="min-w-0 flex-1 rounded-md border border-[#2a2a3a] bg-[#12121c] px-3 py-2 text-xs text-white placeholder:text-zinc-500"
          />
          <button
            type="submit"
            className="rounded-md bg-[#8B5CFF] px-4 py-2 text-xs font-bold text-white hover:bg-[#7a4de8]"
          >
            RECALL
          </button>
        </form>
        {results === null ? null : results.length === 0 ? (
          <p className="text-xs text-zinc-500">
            Nothing matched — the bots have no record about that yet. Unknown stays UNKNOWN.
          </p>
        ) : (
          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={`${r.source}-${r.id}`} className="rounded-md border border-[#2a2a3a] bg-[#12121c] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400">#{i + 1}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
                      SOURCE_TONE[r.source] ?? 'bg-zinc-700/40 text-zinc-300'
                    }`}
                  >
                    {r.source}
                  </span>
                  <span className="text-sm font-semibold text-white">{r.title}</span>
                  <span className="text-[10px] text-zinc-500">relevance {r.score}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-300">{r.text}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{r.why}</p>
              </div>
            ))}
            <p className="text-[11px] leading-relaxed text-zinc-500">{RECALL_BUDGET_NOTE}</p>
          </div>
        )}
      </div>
    </div>
  );
}
