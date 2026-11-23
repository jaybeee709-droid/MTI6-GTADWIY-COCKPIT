import React, { useState } from 'react';
import {
  Bot,
  Shield,
  Sliders,
  Terminal,
} from 'lucide-react';
import { TRIBE_PRINCIPALS } from '../worlds-data';

type ConsoleTab =
  | 'Overview'
  | 'Tasks'
  | 'Dependencies'
  | 'Resources'
  | 'Outputs'
  | 'Logs'
  | 'Knowledge'
  | 'Settings'
  | 'Performance'
  | 'History';

// One profile card per Tribe principal, verbatim from
// js/tribe-principals.js (Revelation 7 order). Every principal starts
// UNASSIGNED with no role and no task. There is no worker runtime in
// this build: no uptime, latency, CPU, task, output, or earnings figure
// is claimed for any tribe. STAR is not a principal — it sits above the
// tribes — and is shown here only as demo / NOT_CONNECTED.
interface TribeProfile {
  id: string;
  displayName: string;
  order: number;
}

const TRIBE_PROFILES: TribeProfile[] = TRIBE_PRINCIPALS.map((p) => ({
  id: p.id,
  displayName: p.displayName,
  order: p.order,
}));

const CONSOLE_TABS: ConsoleTab[] = [
  'Overview',
  'Tasks',
  'Dependencies',
  'Resources',
  'Outputs',
  'Logs',
  'Knowledge',
  'Settings',
  'Performance',
  'History',
];

export const BotOperations: React.FC = () => {
  const [selectedTribeId, setSelectedTribeId] = useState<string>('all');
  const [selectedProfileId, setSelectedProfileId] = useState<string>(TRIBE_PROFILES[0].id);
  const [activeTab, setActiveTab] = useState<ConsoleTab>('Overview');

  const filteredProfiles =
    selectedTribeId === 'all'
      ? TRIBE_PROFILES
      : TRIBE_PROFILES.filter((p) => p.id === selectedTribeId);

  const selectedProfile =
    TRIBE_PROFILES.find((p) => p.id === selectedProfileId) ?? TRIBE_PROFILES[0];

  const assignedCount = 0;
  const unassignedCount = TRIBE_PROFILES.length;

  return (
    <div className="space-y-6 text-white">
      {/* Header + STAR + 12 Tribes Strip */}
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00B7FF]/15 text-[#00B7FF] border border-[#00B7FF]/30">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  STAR + 12 Tribes Command Operations
                </h2>
                <span className="rounded-full bg-[#111623] px-2.5 py-0.5 text-xs font-medium text-slate-300 border border-[#1E273B]">
                  STAR · DEMO / NOT_CONNECTED
                </span>
              </div>
              <p className="text-xs text-[#B8B8B8]">
                12 Tribe principals · {assignedCount} assigned · {unassignedCount} unassigned · No worker
                runtime in this build — no live activity is claimed.
              </p>
            </div>
          </div>
        </div>

        {/* 12 Tribes Selector — canonical principals only */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedTribeId('all')}
            className={`shrink-0 rounded-xl border px-3 py-2 text-left transition ${
              selectedTribeId === 'all'
                ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-white'
                : 'border-white/10 bg-[#151515] text-[#B8B8B8] hover:border-white/25 hover:text-white'
            }`}
          >
            <div className="text-xs font-semibold">All 12 Tribes</div>
            <div className="text-[10px] opacity-75">UNASSIGNED · NOT_CONNECTED</div>
          </button>
          {TRIBE_PROFILES.map((tribe) => {
            const active = selectedTribeId === tribe.id;
            return (
              <button
                key={tribe.id}
                onClick={() => setSelectedTribeId(tribe.id)}
                className={`shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                  active
                    ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-white'
                    : 'border-white/10 bg-[#151515] text-[#B8B8B8] hover:border-white/25 hover:text-white'
                }`}
              >
                <div className="text-xs font-semibold">
                  {String(tribe.order).padStart(2, '0')} · {tribe.displayName}
                </div>
                <div className="text-[10px] opacity-75">UNASSIGNED · NOT_CONNECTED</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Command Theater — honest: no live panels */}
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">
          Command Theater · NO_DATA
        </h3>
        <p className="mt-2 text-xs text-[#B8B8B8]">
          No worker runtime is live in this build. There are no coexisting worker panels, no sync latency,
          no tick rates, no VaR, and no harvest figures to show. STAR is demo / NOT_CONNECTED.
        </p>
        <p className="mt-1 text-xs font-mono text-[#B8B8B8]">
          WORKERS ACTIVE: 0 · STATUS: NOT_CONNECTED · TELEMETRY: NO_DATA
        </p>
      </div>

      {/* Tribe Profile Cards — one per canonical principal */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">
            Tribe Profile Cards · {filteredProfiles.length} of {TRIBE_PROFILES.length}
          </h3>
          <span className="text-[11px] text-[#B8B8B8]">
            Identity is canonical; role and task are UNASSIGNED until recorded.
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredProfiles.map((profile) => {
            const isSelected = profile.id === selectedProfile.id;
            return (
              <div
                key={profile.id}
                onClick={() => setSelectedProfileId(profile.id)}
                className={`cursor-pointer rounded-2xl border p-5 transition ${
                  isSelected ? 'ring-1 ring-[#00B7FF]' : ''
                }`}
                style={{ backgroundColor: '#101010', borderColor: 'rgba(255,255,255,0.12)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#151515] text-[#00B7FF]">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {String(profile.order).padStart(2, '0')} · {profile.displayName}
                      </div>
                      <div className="text-xs text-[#B8B8B8]">Tribe principal · {profile.id}</div>
                    </div>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold bg-[#151515] text-[#B8B8B8] border border-white/10">
                    UNASSIGNED
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
                  <div className="rounded-lg bg-[#151515] p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-[#B8B8B8]">Current Role</div>
                    <div className="mt-0.5 text-white/90">UNASSIGNED · NO_DATA</div>
                  </div>
                  <div className="rounded-lg bg-[#151515] p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-[#B8B8B8]">Current Task</div>
                    <div className="mt-0.5 text-white/90">UNASSIGNED · NO_DATA</div>
                  </div>
                  <div className="rounded-lg bg-[#151515] p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-[#B8B8B8]">Uptime</div>
                    <div className="mt-0.5 text-white/90">NO_DATA</div>
                  </div>
                  <div className="rounded-lg bg-[#151515] p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-[#B8B8B8]">Latency / CPU</div>
                    <div className="mt-0.5 text-white/90">NO_DATA</div>
                  </div>
                  <div className="rounded-lg bg-[#151515] p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-[#B8B8B8]">Output</div>
                    <div className="mt-0.5 text-white/90">NO_DATA — no worker runtime</div>
                  </div>
                  <div className="rounded-lg bg-[#151515] p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-[#B8B8B8]">History</div>
                    <div className="mt-0.5 text-white/90">No assignments recorded</div>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-[#151515] p-2.5 text-xs text-[#B8B8B8]">
                  Controls disabled — no worker runtime in this build. Execution is disabled by design.
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 10-Tab Bot Command Console */}
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-[#00B7FF]" />
            <h3 className="text-sm font-semibold">
              Bot Command Console —{' '}
              <span className="text-[#00B7FF]">
                {String(selectedProfile.order).padStart(2, '0')} · {selectedProfile.displayName}
              </span>
            </h3>
          </div>
          <span className="text-xs text-[#B8B8B8]">CPU NO_DATA · Latency NO_DATA</span>
        </div>

        {/* 10 Tabs */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-white/10 pb-2">
          {CONSOLE_TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'bg-[#00B7FF] text-black font-semibold'
                    : 'bg-[#151515] text-[#B8B8B8] hover:bg-[#202020] hover:text-white'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Tab Content — honest states only */}
        <div className="mt-4 rounded-xl border border-white/10 bg-[#151515] p-4 text-xs">
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <div className="text-[#B8B8B8]">Assignment State</div>
                <div className="mt-1 text-sm font-semibold text-white">UNASSIGNED</div>
              </div>
              <div>
                <div className="text-[#B8B8B8]">Current Role</div>
                <div className="mt-1 text-white">NO_DATA</div>
              </div>
              <div>
                <div className="text-[#B8B8B8]">Latest Artifact</div>
                <div className="mt-1 text-white">NO_DATA</div>
              </div>
            </div>
          )}

          {activeTab === 'Tasks' && (
            <div className="text-[#B8B8B8]">Tasks: NO_DATA — no task is assigned to this principal.</div>
          )}

          {activeTab === 'Dependencies' && (
            <div className="text-[#B8B8B8]">
              Dependencies: NO_DATA — no live dependency is connected.
            </div>
          )}

          {activeTab === 'Resources' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-[#101010] p-3">
                <div className="text-[#B8B8B8]">Compute Allocation</div>
                <div className="mt-1 text-base font-semibold">NO_DATA</div>
              </div>
              <div className="rounded-lg bg-[#101010] p-3">
                <div className="text-[#B8B8B8]">Memory Footprint</div>
                <div className="mt-1 text-base font-semibold">NO_DATA</div>
              </div>
              <div className="rounded-lg bg-[#101010] p-3">
                <div className="text-[#B8B8B8]">Queue Depth</div>
                <div className="mt-1 text-base font-semibold">NO_DATA</div>
              </div>
            </div>
          )}

          {activeTab === 'Outputs' && (
            <div className="text-[#B8B8B8]">Outputs: NO_DATA — no worker runtime, no artifacts.</div>
          )}

          {activeTab === 'Logs' && (
            <div className="text-[#B8B8B8]">Logs: NO_DATA — no log stream is connected.</div>
          )}

          {activeTab === 'Knowledge' && (
            <div className="text-white/90">
              Linked Encyclopedia Nodes: NO_DATA — encyclopedia content not migrated in this package.
            </div>
          )}

          {activeTab === 'Settings' && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#00B7FF]" />
                <span>
                  Execution Mode: <strong className="text-white">DISABLED — read-only by design</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#32D74B]" />
                <span>
                  Circuit Breaker: <strong className="text-white">NO_DATA</strong>
                </span>
              </div>
            </div>
          )}

          {activeTab === 'Performance' && (
            <div className="flex flex-wrap items-center gap-6">
              <div>
                Success Rate: <strong>NO_DATA</strong>
              </div>
              <div>
                Avg Latency: <strong>NO_DATA</strong>
              </div>
              <div>
                Uptime: <strong>NO_DATA</strong>
              </div>
            </div>
          )}

          {activeTab === 'History' && (
            <div className="text-[#B8B8B8]">History: no assignments recorded for this principal.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BotOperations;
