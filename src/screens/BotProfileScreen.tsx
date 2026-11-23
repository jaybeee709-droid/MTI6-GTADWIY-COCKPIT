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
// re-listed here. All 12 start UNASSIGNED with no role/task: there
// is no worker runtime in this build, so no principal is ever
// displayed as live. STAR is shown only as demo / NOT_CONNECTED.

import React, { useState } from 'react';
import { Bot, Star } from 'lucide-react';
import { TRIBE_PRINCIPALS } from '../worlds-data';
import { EmptyState, MonoLine, Panel, ScreenHeader, StatusPill } from './shared';

type SelectedRef = 'star' | string;

const CONVERGENCE_LINE =
  'Findings converge into ONE World Engine context — the activity section carries that line as copy only; no new data plumbing is introduced here.';

export const BotProfileScreen: React.FC = () => {
  const [selected, setSelected] = useState<SelectedRef>('star');

  const selectedPrincipal =
    selected === 'star' ? null : TRIBE_PRINCIPALS.find((p) => p.id === selected) ?? null;
  const selectedName = selected === 'star' ? 'STAR' : selectedPrincipal?.displayName ?? 'Unknown bot';

  return (
    <div className="space-y-5 text-white">
      <ScreenHeader
        icon={Bot}
        title="Bot Profiles"
        subtitle="STAR, the 12 Tribe principals, and every recorded worker — identity, recorded work, and graphs of recorded activity only"
        note="A profile is intelligence, not authority — it assigns, executes, and approves nothing. No worker runtime is live in this build."
      />

      <Panel title="Bot index">
        <p className="mb-3 text-xs text-[#B8B8B8]">
          Pick one for its full profile. Every principal below is UNASSIGNED with no role or task; STAR is demo
          / NOT_CONNECTED.
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
              {p.order}. {p.displayName} — UNASSIGNED
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
            <span className="font-semibold">UNASSIGNED — no role or task recorded</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#151515] p-3.5">
            <span className="text-[#B8B8B8]">Current task</span>
            <span className="font-semibold">NO_DATA — no worker runtime</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#151515] p-3.5">
            <span className="text-[#B8B8B8]">Status</span>
            <StatusPill status={selected === 'star' ? 'NOT_CONNECTED' : 'UNASSIGNED'} />
          </div>
        </div>
        <p className="mt-3 text-xs text-[#B8B8B8]">
          <strong className="text-white">Why?</strong> No provenance recorded for this block — the
          BotProfiles data layer (TribePrincipals / WorkerEngine / BotOpsModel) is not wired in this build, so
          nothing can be shown about where these values came from. Provenance chain: result → source →
          derivation → freshness — all UNRECORDED here.
        </p>
      </Panel>

      <Panel title={`What ${selectedName} is doing`}>
        <p className="mb-3 text-xs text-[#B8B8B8]">{CONVERGENCE_LINE}</p>
        <EmptyState>
          No recorded activity yet — no assignment, task, or history line is recorded for {selectedName} in this
          build. Nothing is invented to fill the gap.
        </EmptyState>
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
