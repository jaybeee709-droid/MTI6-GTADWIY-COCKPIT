/* MTI6-GTADWIY-COCKPIT — Lifecycle Intelligence panel (v253)
 *
 * Renders the lifecycle reading from lifecycle-data.ts. Presentation
 * only: every value comes from the canonical records, and the panel
 * states its basis on screen rather than asserting a stage.
 *
 * Rules:
 *   - EXECUTE renders struck through and disabled, never as reachable.
 *   - A workspace with no canonical Major Activity says so; none is
 *     borrowed or invented.
 *   - Nothing here runs, schedules, writes, or fetches.
 */

import React, { useMemo, useState } from 'react';
import { ArrowRight, Lock, Route } from 'lucide-react';
import {
  LIFECYCLE_STAGES,
  STAGE_ASSESSMENTS,
  allWorkspaceLifecycles,
  auditStageAssessments,
  lifecycleCounts,
  stageById,
  type LifecycleStageId,
  type WorkspaceLifecycle,
} from '../lifecycle-data';
import { CRYPTO_WORKSPACE_GROUPS } from '../crypto-workspaces-data';

const micro = 'font-mono text-[10px] tracking-widest text-[#B8B8B8]';

const StageLadder: React.FC = () => (
  <div
    className="flex flex-wrap items-center gap-1 font-mono text-[10px]"
    aria-label="Lifecycle stages"
  >
    {LIFECYCLE_STAGES.map((s, i) => (
      <React.Fragment key={s.id}>
        <span
          title={s.meaning}
          className={`rounded border px-1.5 py-0.5 ${
            s.disabled
              ? 'border-[#FF3B30]/60 text-[#FF3B30] line-through'
              : 'border-[#00B7FF]/50 text-white'
          }`}
        >
          {s.label}
        </span>
        {i < LIFECYCLE_STAGES.length - 1 && <ArrowRight className="h-3 w-3 text-[#B8B8B8]" />}
      </React.Fragment>
    ))}
  </div>
);

const WorkspaceCard: React.FC<{ w: WorkspaceLifecycle }> = ({ w }) => {
  const stage = stageById(w.stage);
  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-[#151515] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-white">{w.title}</span>
        <span className="flex flex-wrap items-center gap-1.5 font-mono text-[9px]">
          {w.gated && (
            <span className="rounded border border-[#FFB020]/50 px-1.5 py-0.5 text-[#FFB020]">
              GATED SEAT
            </span>
          )}
          <span className="rounded border border-white/15 px-1.5 py-0.5 text-[#B8B8B8]">
            {w.status}
          </span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
        <span className="text-[#B8B8B8]">LIFECYCLE STAGE:</span>
        <span className="rounded border border-[#00B7FF]/60 bg-[#00B7FF]/10 px-1.5 py-0.5 text-white">
          {stage?.label ?? w.stage}
        </span>
        <span className="text-[#B8B8B8]">· GROUP {w.groupLabel.toUpperCase()}</span>
        <span className="text-[#B8B8B8]">· LADDER TOP {w.ladderTop}</span>
      </div>

      <p className="text-[11px] leading-relaxed text-[#B8B8B8]">
        <span className="text-white">WHY THIS STAGE: </span>
        {w.stageBasis}
      </p>

      {w.majorTitles.length > 0 ? (
        <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
          CANONICAL MAJORS ({w.majorTitles.length}):{' '}
          <span className="text-white">{w.majorTitles.join(' · ')}</span>
        </p>
      ) : (
        <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
          NO CANONICAL MAJOR ACTIVITY IS MAPPED TO THIS WORKSPACE — NOTHING IS BORROWED TO FILL IT.
        </p>
      )}

      {w.familyTitles.length > 0 && (
        <p className="font-mono text-[9px] text-[#B8B8B8]">
          FAMILIES: {w.familyTitles.join(' · ')}
        </p>
      )}
    </div>
  );
};

export const LifecyclePanel: React.FC = () => {
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<LifecycleStageId | 'all'>('all');

  const all = useMemo(() => allWorkspaceLifecycles(), []);
  const counts = useMemo(() => lifecycleCounts(), []);
  const audit = useMemo(() => auditStageAssessments(), []);

  const visible = all.filter(
    (w) => (groupFilter === 'all' || w.group === groupFilter) && (stageFilter === 'all' || w.stage === stageFilter),
  );

  return (
    <div className="space-y-4 rounded-xl border border-[#8B5CFF]/30 bg-[#101010] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-mono text-[#8B5CFF]">
          <Route className="h-4 w-4" />
          <span>LIFECYCLE INTELLIGENCE — WHERE AM I IN THIS ACTIVITY?</span>
        </div>
        <span className={micro}>
          {counts.workspaces} WORKSPACES · {counts.mappedMajors} MAJOR LINKS · {counts.gated} GATED
        </span>
      </div>

      <p className="text-xs leading-relaxed text-[#B8B8B8]">
        Each workspace is read against the lifecycle stage its own recorded purpose places it at.
        The stage is a READING of the registry and the canonical backbone — not a claim about you,
        your capital, or any position. Nothing on this panel runs, schedules, or executes.
      </p>

      <StageLadder />

      <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
        {LIFECYCLE_STAGES.map((s) => (
          <span
            key={s.id}
            className={`rounded border px-2 py-1 ${
              s.disabled ? 'border-[#FF3B30]/50 text-[#FF3B30]' : 'border-white/15 text-[#B8B8B8]'
            }`}
          >
            {s.label} {counts.byStage[s.id]}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className={micro}>GROUP</span>
        <button
          type="button"
          onClick={() => setGroupFilter('all')}
          className={`rounded border px-2 py-1 font-mono text-[10px] ${
            groupFilter === 'all'
              ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-white'
              : 'border-white/10 bg-[#151515] text-[#B8B8B8] hover:text-white'
          }`}
        >
          ALL
        </button>
        {CRYPTO_WORKSPACE_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGroupFilter(g.id)}
            className={`rounded border px-2 py-1 font-mono text-[10px] ${
              groupFilter === g.id
                ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-white'
                : 'border-white/10 bg-[#151515] text-[#B8B8B8] hover:text-white'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className={micro}>STAGE</span>
        <button
          type="button"
          onClick={() => setStageFilter('all')}
          className={`rounded border px-2 py-1 font-mono text-[10px] ${
            stageFilter === 'all'
              ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-white'
              : 'border-white/10 bg-[#151515] text-[#B8B8B8] hover:text-white'
          }`}
        >
          ALL
        </button>
        {LIFECYCLE_STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStageFilter(s.id)}
            className={`rounded border px-2 py-1 font-mono text-[10px] ${
              stageFilter === s.id
                ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-white'
                : 'border-white/10 bg-[#151515] text-[#B8B8B8] hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {visible.map((w) => (
          <WorkspaceCard key={w.workspaceId} w={w} />
        ))}
      </div>
      {visible.length === 0 && (
        <p className="font-mono text-[11px] text-[#B8B8B8]">
          NO WORKSPACE MATCHES THAT GROUP AND STAGE COMBINATION — AN EMPTY FILTER RESULT IS SHOWN
          AS EMPTY.
        </p>
      )}

      <details className="rounded-lg border border-white/10 bg-[#151515] p-3">
        <summary className="cursor-pointer font-mono text-[10px] text-[#00B7FF]">
          STAGE REFERENCE — DEFINITIONS AND WHAT EACH STAGE ASSESSES
        </summary>
        <div className="mt-3 space-y-3">
          {LIFECYCLE_STAGES.map((s) => {
            const a = STAGE_ASSESSMENTS.find((x) => x.stage === s.id);
            return (
              <div key={s.id} className="space-y-1 border-l-2 border-[#00B7FF]/40 pl-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-mono text-[11px] ${s.disabled ? 'text-[#FF3B30] line-through' : 'text-white'}`}>
                    {s.label}
                  </span>
                  {s.disabled && <Lock className="h-3 w-3 text-[#FF3B30]" />}
                </div>
                <p className="text-[11px] leading-relaxed text-[#B8B8B8]">{s.meaning}</p>
                <p className="font-mono text-[9px] text-[#B8B8B8]">PRODUCES: {s.produces}</p>
                {s.disabled && (
                  <p className="font-mono text-[9px] leading-relaxed text-[#FF3B30]">
                    {s.disabledReason}
                  </p>
                )}
                {a && (a.costKinds.length > 0 || a.riskDimensions.length > 0) && (
                  <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
                    {a.costKinds.length > 0 && (
                      <>COST KINDS ASSESSED: {a.costKinds.join(' · ')}. </>
                    )}
                    {a.riskDimensions.length > 0 && (
                      <>RISK DIMENSIONS ASSESSED: {a.riskDimensions.join(' · ')}.</>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </details>

      <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
        ASSESSMENT INTEGRITY: {audit.ok ? 'EVERY COST KIND AND RISK DIMENSION NAMED ABOVE EXISTS IN THE CANONICAL LISTS' : `MISMATCH — ${audit.unknownCosts.length} COST / ${audit.unknownRisks.length} RISK CODE(S) NOT FOUND`}.
        STAGES ARE READINGS OF THE REGISTRY; NO STAGE HOLDS A POSITION, AN AMOUNT, OR A RUNNER.
      </p>
    </div>
  );
};
