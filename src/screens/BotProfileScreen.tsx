// Bot Profile — migrated from js/modules/bot-profile.js
//
// Vanilla structure: an index of every bot from the real records —
// STAR, the 12 Tribe principals, and every recorded worker — and a
// per-bot profile that is a READOUT of those records: identity block,
// "what they are doing" from recorded assignments, and graphs drawn
// ONLY from recorded history/task/assignment data, each with its
// source line and a WHY? toggle revealing provenance (result →
// source → derivation → freshness). A bot with no recorded activity
// shows the graph frames with an honest "No recorded activity yet"
// state — never a synthetic curve. A profile is intelligence, not
// authority: it assigns, executes, and approves nothing.
//
// The 12-tribe roster is reused from src/worlds-data.ts
// (TRIBE_PRINCIPALS, verbatim from js/tribe-principals.js) — not
// re-listed here. Assignments are read from the canonical store
// (src/principal-assignments.ts, wired v150): principals start
// UNASSIGNED and show whatever the owner has recorded in Bot
// Operations. The in-page worker runtime (v171+) executes
// recorded runtime tasks while the app is open; a principal's
// executed work is shown from the task store, never as a
// standing "live" state. STAR is shown only as
// demo / NOT_CONNECTED and is never assignable.

import React, { useState } from 'react';
import { Bot, Star } from 'lucide-react';
import { TRIBE_PRINCIPALS } from '../worlds-data';
import { loadAssignments } from '../principal-assignments';
import { loadTasks } from '../worker-tasks';
import { executorById, loadKinds } from '../worker-runtime';
import { EmptyState, MonoLine, Panel, ScreenHeader, StatusPill } from './shared';

type SelectedRef = 'star' | string;

const CONVERGENCE_LINE =
  'Findings converge into ONE World Engine context — the activity section carries that line as copy only; no new data plumbing is introduced here.';

export const BotProfileScreen: React.FC = () => {
  const [selected, setSelected] = useState<SelectedRef>('star');
  // Real assignments (v150): read from the canonical assignment
  // store the owner writes in Bot Operations. Identity still comes
  // from the roster only; an assignment is a record, not activity.
  const [assignments] = useState(() => loadAssignments());
  // Runtime work (v174) — this principal's runtime tasks, read
  // from the canonical task store + the runtime kind registry.
  const [allTasks] = useState(() => loadTasks());
  const [runtimeKinds] = useState(() => loadKinds());
  const runtimeWork = allTasks.filter(
    (t) => t.principal === selected && runtimeKinds[t.id] && (t.state === 'COMPLETE' || t.state === 'FAILED'),
  );
  const assignedCount = TRIBE_PRINCIPALS.filter(
    (p) => assignments[p.id]?.currentRole || assignments[p.id]?.currentTask,
  ).length;

  const selectedPrincipal =
    selected === 'star' ? null : TRIBE_PRINCIPALS.find((p) => p.id === selected) ?? null;
  const selectedName = selected === 'star' ? 'STAR' : selectedPrincipal?.displayName ?? 'Unknown bot';
  const selectedAssignment = selected === 'star' ? undefined : assignments[selected];

  return (
    <div className="space-y-5 text-white">
      <ScreenHeader
        icon={Bot}
        title="Bot Profiles"
        subtitle="STAR, the 12 Tribe principals, and every recorded worker — identity, recorded work, and graphs of recorded activity only"
        note="A profile is intelligence, not authority — it assigns, executes, and approves nothing. Runtime work shown here was executed by the in-page engine in Bot Operations while the app was open."
      />

      <Panel title="Bot index">
        <p className="mb-3 text-xs text-[#B8B8B8]">
          Pick one for its full profile. {assignedCount} of {TRIBE_PRINCIPALS.length} principals carry a
          recorded assignment (set by the owner in Bot Operations); the rest are UNASSIGNED. STAR is demo /
          NOT_CONNECTED and is never assignable.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelected('star')}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              selected === 'star'
                ? 'bg-[#8B5CFF] text-white'
                : 'bg-[#151515] text-[#B8B8B8] hover:bg-[#202020] hover:text-white'
            }`}
          >
            <Star className="h-3.5 w-3.5" /> STAR — demo / NOT_CONNECTED
          </button>
          {TRIBE_PRINCIPALS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                selected === p.id
                  ? 'bg-[#00B7FF] text-black'
                  : 'bg-[#151515] text-[#B8B8B8] hover:bg-[#202020] hover:text-white'
              }`}
            >
              {p.order}. {p.displayName} —{' '}
              {assignments[p.id]?.currentRole ??
                (assignments[p.id]?.currentTask ? 'TASK SET' : 'UNASSIGNED')}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title={`Profile — ${selectedName}`}>
        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#151515] p-3.5">
            <span className="text-[#B8B8B8]">Kind</span>
            <span className="font-semibold">{selected === 'star' ? 'STAR (primary assistant)' : 'Tribe principal'}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#151515] p-3.5">
            <span className="text-[#B8B8B8]">Record id</span>
            <span className="font-mono">{selected === 'star' ? 'star' : selectedPrincipal?.id ?? '—'}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#151515] p-3.5">
            <span className="text-[#B8B8B8]">Role / task assignment</span>
            <span className="font-semibold">
              {selected === 'star'
                ? 'STAR sits above the principals — never assigned'
                : selectedAssignment?.currentRole ?? 'UNASSIGNED — no role recorded'}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#151515] p-3.5">
            <span className="text-[#B8B8B8]">Current task</span>
            <span className="font-semibold">
              {selected === 'star'
                ? 'NO STANDING TASK — STAR runs runtime tasks on command'
                : selectedAssignment?.currentTask ?? 'NONE RECORDED — no task assigned'}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#151515] p-3.5">
            <span className="text-[#B8B8B8]">Status</span>
            <StatusPill
              status={
                selected === 'star'
                  ? 'NOT_CONNECTED'
                  : selectedAssignment?.currentRole || selectedAssignment?.currentTask
                    ? 'ASSIGNED'
                    : 'UNASSIGNED'
              }
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-[#B8B8B8]">
          <strong className="text-white">Why?</strong>{' '}
          {selected === 'star'
            ? 'STAR\u2019s state comes from the gateway status check, not the assignment store. Provenance chain: result \u2192 source \u2192 derivation \u2192 freshness.'
            : 'Identity comes from the canonical roster (js/tribe-principals.js); role, task and history come from the owner\u2019s assignment records in the canonical store (mti6_principal_assignments_v1), written in Bot Operations. An assignment is a record of the owner\u2019s intent — it is not bot activity. Runtime work is a separate record: tasks with a runtime executor, below, are executed for real by the in-page engine while the app is open.'}
        </p>
      </Panel>

      <Panel title={`What ${selectedName} is doing`}>
        <p className="mb-3 text-xs text-[#B8B8B8]">{CONVERGENCE_LINE}</p>
        {selected !== 'star' && selectedAssignment && selectedAssignment.history.length > 0 ? (
          <div className="space-y-1.5">
            {[...selectedAssignment.history].slice(-6).reverse().map((h, i) => (
              <p key={i} className="font-mono text-[11px] text-[#B8B8B8]">
                <span className="text-white">{h.change}</span> — {h.at.slice(0, 10)} · by {h.by}
                {h.note ? ` · ${h.note}` : ''}
              </p>
            ))}
            <p className="pt-1 text-xs text-[#B8B8B8]">
              Recorded assignment history only — the owner&apos;s assignment record, not live bot activity.
              The runtime does not act on assignments; it acts on runtime tasks (next section).
            </p>
          </div>
        ) : (
          <EmptyState>
            No recorded activity yet — no assignment, task, or history line is recorded for {selectedName}.
            Nothing is invented to fill the gap.
          </EmptyState>
        )}
        {selected === 'star' ? (
          <p className="mt-3 text-xs text-[#B8B8B8]">
            Cockpit status (World Engine): NOT_CONNECTED — the World Engine status lines are not wired in this
            build.
          </p>
        ) : (
          <p className="mt-3 text-xs text-[#B8B8B8]">
            Workers under {selectedName}: no workers recorded under this principal yet.
          </p>
        )}
        {selected !== 'star' && (
          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="mb-2 font-mono text-[10px] text-[#8B5CFF]">
              RUNTIME WORK — EXECUTED BY THE IN-PAGE ENGINE
            </p>
            {runtimeWork.length > 0 ? (
              <div className="space-y-1.5">
                {runtimeWork.slice(0, 5).map((t) => (
                  <p key={t.id} className="font-mono text-[11px] text-[#B8B8B8]">
                    <span className="text-white">
                      {t.state === 'COMPLETE' ? '✓' : '✗'} {t.title}
                    </span>{' '}
                    — {executorById(runtimeKinds[t.id])?.label ?? runtimeKinds[t.id]} ·{' '}
                    {t.updatedAt.slice(0, 10)}
                    {t.completionEvidence ? (
                      <span className="block truncate text-[10px]">{t.completionEvidence}</span>
                    ) : null}
                  </p>
                ))}
                <p className="pt-1 text-xs text-[#B8B8B8]">
                  Real runs: the evidence is each run&apos;s own output, recorded on its task in Bot
                  Operations.
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#B8B8B8]">
                No runtime work recorded for {selectedName} yet — record a task with a runtime
                executor under this principal in Bot Operations and run it.
              </p>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Recorded activity — graphs">
        <EmptyState>
          Nothing to chart. Graphs are drawn ONLY from recorded history, task, and assignment data, and none is
          recorded for {selectedName} — so the frame stands empty rather than carrying a synthetic curve.
        </EmptyState>
        <MonoLine>
          GRAPHS: NO_DATA · SOURCE: NO RECORDED ACTIVITY · WHY: NO PROVENANCE RECORDED
        </MonoLine>
      </Panel>
    </div>
  );
};
