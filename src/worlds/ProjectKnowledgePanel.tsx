/**
 * Project Knowledge Panel (v247) — renders the distilled
 * Gmail / Drive PROJECT-KNOWLEDGE feed for Bot Memory and STAR:
 * kind, title, summary, source + sourceRef, and status for every
 * record; the skip log (what was left out and why); and an ADD
 * form that enforces the exclusions and shows the refusal reason
 * when a record is refused.
 *
 * HONEST LINE, shown at the top: this is DISTILLED project
 * knowledge — curated records, not a live inbox or Drive
 * connection. A live sync would need a Google sign-in the owner
 * has not authorized. The app has no Gmail/Drive API access and
 * no Google OAuth; nothing here reads a live inbox or drive.
 *
 * Records are added by the owner (or by Muse during builds)
 * through the form. STAR and Bot Memory read the distilled
 * records via project-knowledge.ts — never raw mail or drive
 * content. Key NAMES only, never values.
 */
import React, { useEffect, useState } from 'react';
import {
  MAX_SUMMARY_CHARS,
  PROJECT_KNOWLEDGE_KINDS,
  PROJECT_KNOWLEDGE_SOURCES,
  addProjectKnowledge,
  getActiveProjectKnowledge,
  loadProjectKnowledge,
  loadSkippedSources,
  projectKnowledgeSummary,
  seedProjectKnowledge,
  type ProjectKnowledgeKind,
  type ProjectKnowledgeRecord,
  type ProjectKnowledgeSource,
  type SkippedSource,
} from '../project-knowledge';

const KIND_TONE: Record<string, string> = {
  HANDOFF: 'bg-[#8B5CFF]/15 text-[#B79CFF]',
  MANIFEST: 'bg-[#00B7FF]/15 text-[#7FD4FF]',
  KEY_NOTICE: 'bg-[#FFB020]/15 text-[#FFB020]',
  DEPLOY_NOTICE: 'bg-[#32D74B]/15 text-[#32D74B]',
  PAPER: 'bg-zinc-700/40 text-zinc-300',
  DIRECTIVE: 'bg-[#ff6b6b]/15 text-[#ff6b6b]',
};

export function ProjectKnowledgePanel() {
  const [records, setRecords] = useState<ProjectKnowledgeRecord[]>([]);
  const [skipped, setSkipped] = useState<SkippedSource[]>([]);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ProjectKnowledgeKind>('HANDOFF');
  const [summary, setSummary] = useState('');
  const [source, setSource] = useState<ProjectKnowledgeSource>('gmail');
  const [sourceRef, setSourceRef] = useState('');
  const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  const refresh = () => {
    setRecords(loadProjectKnowledge());
    setSkipped(loadSkippedSources());
  };

  useEffect(() => {
    seedProjectKnowledge();
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summaryStats = projectKnowledgeSummary();
  const activeCount = records.filter((r) => r.status === 'ACTIVE').length;

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const result = addProjectKnowledge({ kind, title, summary, source, sourceRef });
    if (result.ok) {
      setNotice({
        tone: 'ok',
        text: result.deduped
          ? `Already recorded — "${result.record.title}" is in the feed (duplicate title, no second record made).`
          : `Recorded — "${result.record.title}" is now in the distilled feed for STAR and Bot Memory.`,
      });
      setTitle('');
      setSummary('');
      setSourceRef('');
    } else {
      setNotice({ tone: 'bad', text: result.reason });
    }
    refresh();
  };

  return (
    <div className="rounded-lg border border-[#2a2a3a] bg-[#0b0b12] p-4">
      <div className="mb-1 text-sm font-bold tracking-wide text-white">
        PROJECT KNOWLEDGE — GMAIL / DRIVE FEED FOR BOT MEMORY &amp; STAR
      </div>
      <p className="mb-3 text-xs leading-relaxed text-zinc-400">
        DISTILLED PROJECT KNOWLEDGE — curated records, not a live inbox or Drive connection. A live
        sync would need a Google sign-in the owner has not authorized. The bots get the distilled
        project knowledge (backup handoffs and manifests, provider/key notices, deploy
        notifications, project papers and directives) — never raw inbox or drive access. Key names
        only, never values.
      </p>
      <p className="mb-3 text-xs leading-relaxed text-zinc-400">
        {records.length} record(s) · {activeCount} active · {skipped.length} source(s) left out
        (see skip log) — by kind:{' '}
        {PROJECT_KNOWLEDGE_KINDS.map((k) => `${k} ${summaryStats.byKind[k] ?? 0}`).join(' · ')}
      </p>

      {records.length === 0 ? (
        <p className="text-xs text-zinc-500">No project-knowledge records yet.</p>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="rounded-md border border-[#2a2a3a] bg-[#12121c] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
                    KIND_TONE[r.kind] ?? 'bg-zinc-700/40 text-zinc-300'
                  }`}
                >
                  {r.kind}
                </span>
                <span className="text-sm font-semibold text-white">{r.title}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
                    r.status === 'ACTIVE'
                      ? 'bg-[#32D74B]/15 text-[#32D74B]'
                      : 'bg-zinc-700/40 text-zinc-400'
                  }`}
                >
                  {r.status}
                </span>
                <span className="text-[10px] text-zinc-500">
                  recorded {new Date(r.recordedAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300">{r.summary}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                <span className="font-semibold">Source: </span>
                {r.source} — {r.sourceRef}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 border-t border-[#2a2a3a] pt-4">
        <div className="mb-1 text-sm font-bold tracking-wide text-white">
          ADD A PROJECT-KNOWLEDGE RECORD
        </div>
        <p className="mb-3 text-xs leading-relaxed text-zinc-400">
          Distilled summary only (max {MAX_SUMMARY_CHARS} chars) and a source reference (message
          subject, file name, or commit) — never raw mail/drive content, never a key value. The
          personal-details archive, personal mail unrelated to the project, and phone/SMS/text
          threads are refused outright and logged below.
        </p>
        <form onSubmit={onAdd} className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title — what the record is about"
            aria-label="Record title"
            className="w-full rounded-md border border-[#2a2a3a] bg-[#12121c] px-3 py-2 text-xs text-white placeholder:text-zinc-500"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ProjectKnowledgeKind)}
              aria-label="Record kind"
              className="rounded-md border border-[#2a2a3a] bg-[#12121c] px-3 py-2 text-xs text-white"
            >
              {PROJECT_KNOWLEDGE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as ProjectKnowledgeSource)}
              aria-label="Record source"
              className="rounded-md border border-[#2a2a3a] bg-[#12121c] px-3 py-2 text-xs text-white"
            >
              {PROJECT_KNOWLEDGE_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={`Distilled summary (max ${MAX_SUMMARY_CHARS} chars)`}
            aria-label="Distilled summary"
            rows={3}
            className="w-full rounded-md border border-[#2a2a3a] bg-[#12121c] px-3 py-2 text-xs text-white placeholder:text-zinc-500"
          />
          <p className="text-[11px] text-zinc-500">
            {summary.length}/{MAX_SUMMARY_CHARS} chars
            {summary.length > MAX_SUMMARY_CHARS ? ' — over the cap, shorten it before adding' : ''}
          </p>
          <input
            value={sourceRef}
            onChange={(e) => setSourceRef(e.target.value)}
            placeholder="Source reference — message subject, file name, or commit"
            aria-label="Source reference"
            className="w-full rounded-md border border-[#2a2a3a] bg-[#12121c] px-3 py-2 text-xs text-white placeholder:text-zinc-500"
          />
          <button
            type="submit"
            className="rounded-md bg-[#8B5CFF] px-4 py-2 text-xs font-bold text-white hover:bg-[#7a4de8]"
          >
            ADD TO PROJECT KNOWLEDGE
          </button>
        </form>
        {notice ? (
          <p
            className={`mt-2 text-xs leading-relaxed ${
              notice.tone === 'ok' ? 'text-[#32D74B]' : 'text-[#ff6b6b]'
            }`}
          >
            {notice.text}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          {getActiveProjectKnowledge().length} active record(s) readable by STAR and Bot Memory
          from this feed.
        </p>
      </div>

      <div className="mt-5 border-t border-[#2a2a3a] pt-4">
        <div className="mb-1 text-sm font-bold tracking-wide text-white">
          SKIP LOG — WHAT WAS LEFT OUT AND WHY
        </div>
        <p className="mb-3 text-xs leading-relaxed text-zinc-400">
          Ambiguous sources are left out and recorded here rather than ingested. The
          personal-details archive, personal mail unrelated to the project, and phone/SMS/text
          threads are never ingested — refusals land here with the reason.
        </p>
        {skipped.length === 0 ? (
          <p className="text-xs text-zinc-500">Nothing skipped yet.</p>
        ) : (
          <div className="space-y-2">
            {skipped.map((s) => (
              <div key={s.id} className="rounded-md border border-[#2a2a3a] bg-[#12121c] p-3">
                <p className="text-xs font-semibold text-white">{s.ref}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{s.reason}</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  recorded {new Date(s.recordedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
