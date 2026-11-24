// Cockpit Status — migrated from js/modules/dashboard.js
//
// Vanilla structure migrated: the six dashboard panels, the ten
// configurable widget types, Quick Actions, Quick Navigation, and
// Recent Activity. The vanilla screen reads the device's local
// IndexedDB stores (notes, tasks, expenses, projects, milestones,
// activity, widgets) and the PriceScout / ApiHealth / Scouts /
// DevCenter / WorldEngine layers. None of those layers is wired into
// this React build, so every panel and widget honestly reports
// NOT_CONNECTED / NO_DATA here — no count, spend figure, or activity
// entry is claimed. A failed or missing store must never silently
// read as zero (dashboard.js fix-up #3, defect A), and the same rule
// applies here.

import React, { useState } from 'react';
import { LayoutDashboard, Search } from 'lucide-react';
import { EmptyState, MonoLine, Panel, ScreenHeader, StatusPill } from './shared';
import { EXECUTORS, runtimeStoreSummary } from '../worker-runtime';

const PANELS: { name: string; state: string; note: string }[] = [
  {
    name: 'Star 3.0 Command Chat',
    state: 'NOT_CONNECTED',
    note: 'Primary AI assistant panel in vanilla. STAR is demo in this build — no provider is connected, so no chat is offered here.',
  },
  {
    name: 'Price Scouts',
    state: 'NOT_CONNECTED',
    note: 'Read-only price panel (PriceScout). No live price source is wired in this build, so no price is shown.',
  },
  {
    name: 'API Health & Usage',
    state: 'NO_DATA',
    note: 'Live API usage counts live here in vanilla. No usage store is wired in this build.',
  },
  {
    name: 'Scouts & Bot Knowledge',
    state: 'NOT_CONNECTED',
    note: 'KnowledgeScout layer is not loaded in this build, so the panel is skipped rather than rendered empty.',
  },
  {
    name: 'Development Center',
    state: 'NOT_CONNECTED',
    note: 'Read-only GitHub data panel in vanilla. No GitHub feed is wired in this build.',
  },
  {
    name: 'World Engine Health',
    state: 'NO_DATA',
    note: 'The v103 integrity report in vanilla. The WorldEngine / IntegrityEngine / WorldQuery layers are not wired in this build, so no report is claimed.',
  },
];

const WIDGET_TYPES: { type: string; label: string }[] = [
  { type: 'notes_count', label: 'Knowledge Vault count' },
  { type: 'tasks_open', label: 'Open tasks' },
  { type: 'month_spend', label: "This month's spend" },
  { type: 'active_projects', label: 'Active projects' },
  { type: 'pinned_notes', label: 'Pinned notes list' },
  { type: 'upcoming_tasks', label: 'Upcoming tasks list' },
  { type: 'recent_expenses', label: 'Recent expenses list' },
  { type: 'project_progress', label: 'Project progress list' },
  { type: 'clock_date', label: 'Date & time' },
  { type: 'spend_chart', label: '7-day spending chart' },
];

const QUICK_ACTIONS = ['New Note', 'New Task', 'Log Expense', 'New Project'];
const QUICK_NAV = ['Knowledge Vault', 'Mission Control', 'Resource Tracker', 'Projects', 'Settings'];

export const CockpitStatusScreen: React.FC = () => {
  const [query, setQuery] = useState('');

  return (
    <div className="space-y-5 text-white">
      <ScreenHeader
        icon={LayoutDashboard}
        title="MTI6 Cockpit Dashboard"
        subtitle="COMMAND CENTER — system widgets, panels, quick actions, recent activity"
        note="Local stores and live layers are not wired in this React build: every value below is NOT_CONNECTED / NO_DATA, never zero."
      />

      <Panel title="Search your cockpit">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#151515] px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-[#B8B8B8]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your notes, tasks, expenses, projects… (web search is in the top bar)"
            className="w-full bg-transparent text-xs text-white placeholder-[#B8B8B8] outline-none"
          />
        </div>
        {query.trim() ? (
          <p className="mt-3 text-xs text-[#B8B8B8]">
            Local search is unavailable in this build — the notes, tasks, expenses, and projects stores are
            NOT_CONNECTED. Nothing is claimed to match.
          </p>
        ) : null}
      </Panel>

      <Panel title="Dashboard panels">
        <div className="space-y-3">
          {PANELS.map((p) => (
            <div key={p.name} className="rounded-xl bg-[#151515] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">{p.name}</span>
                <StatusPill status={p.state} tone={p.state === 'NO_DATA' ? 'warn' : 'neutral'} />
              </div>
              <p className="mt-1 text-xs text-[#B8B8B8]">{p.note}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Worker Runtime">
        {(() => {
          const s = runtimeStoreSummary();
          return (
            <div className="space-y-2">
              <MonoLine>
                ENGINE: IN-PAGE — RUNS ONLY WHILE THE APP IS OPEN · REMOTE RUNTIME: NOT_CONNECTED
              </MonoLine>
              <MonoLine>
                EXECUTORS: {EXECUTORS.length} — {EXECUTORS.map((e) => e.label).join(' · ')}
              </MonoLine>
              <MonoLine>
                ALL-TIME FROM THE TASK STORE: {s.recorded} RECORDED · {s.completed} COMPLETED ·{' '}
                {s.failed} FAILED
              </MonoLine>
              {s.latestCompleted.length > 0 ? (
                <p className="text-xs leading-relaxed text-[#B8B8B8]">
                  Latest completed: {s.latestCompleted[0].title} — {s.latestCompleted[0].evidence}
                </p>
              ) : (
                <p className="text-xs text-[#B8B8B8]">
                  No completed runs yet — record a runtime task in Bot Operations, or ask STAR to
                  run one.
                </p>
              )}
              <p className="text-xs text-[#B8B8B8]">
                The engine performs research and checks only — it signs nothing, sends nothing, and
                moves no funds. Full run record: Bot Operations.
              </p>
            </div>
          );
        })()}
      </Panel>

      <Panel title="System Widgets">
        <p className="mb-3 text-xs text-[#B8B8B8]">
          Widget layout is user-configurable in vanilla (persisted in the widgets store). The ten widget types
          below are the configurable set — each one reads a local store that is NOT_CONNECTED here, so no widget
          value is shown.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WIDGET_TYPES.map((w) => (
            <div key={w.type} className="rounded-xl bg-[#151515] p-3.5">
              <div className="text-xs text-[#B8B8B8]">{w.label}</div>
              <div className="mt-1 text-lg font-bold">UNAVAILABLE</div>
              <div className="mt-0.5 text-[11px] text-[#B8B8B8]">NOT_CONNECTED · NO_DATA — never zero</div>
            </div>
          ))}
        </div>
        <MonoLine>WIDGETS: NOT_CONNECTED · 10 TYPES LISTED · 0 VALUES CLAIMED</MonoLine>
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Quick Actions">
          <p className="mb-3 text-xs text-[#B8B8B8]">
            In vanilla each action opens a blank create form in its screen. The create forms live in the local
            stores, so the actions are listed here without a live target.
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((a) => (
              <span key={a} className="rounded-lg bg-[#151515] px-3 py-1.5 text-xs text-[#B8B8B8]">
                {a}
              </span>
            ))}
          </div>
        </Panel>
        <Panel title="Quick Navigation">
          <div className="flex flex-wrap gap-2">
            {QUICK_NAV.map((a) => (
              <span key={a} className="rounded-lg bg-[#151515] px-3 py-1.5 text-xs text-[#B8B8B8]">
                {a}
              </span>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recent Activity">
        <EmptyState>
          No activity yet — the activity store is NOT_CONNECTED in this build, so no entry is shown rather than
          an invented one. In vanilla, the 12 most recent entries appear here.
        </EmptyState>
        <MonoLine>ACTIVITY: NOT_CONNECTED · NO_DATA</MonoLine>
      </Panel>
    </div>
  );
};
