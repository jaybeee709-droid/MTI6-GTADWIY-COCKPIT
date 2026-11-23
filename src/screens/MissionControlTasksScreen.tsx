// Mission Control — Tasks, migrated from js/modules/tasks.js
//
// Vanilla structure: tasks with title, notes, priority (Low /
// Medium / High / Critical), status (Not Started / In Progress /
// Blocked / Done), due date, overdue flag, and "Clear Completed"
// when done tasks exist. Tasks live in the vanilla app's local
// IndexedDB "tasks" store, which this React build does not read —
// so no task is shown here rather than an invented one, and no
// count (open, overdue, or done) is claimed.

import React, { useState } from 'react';
import { ListChecks } from 'lucide-react';
import { EmptyState, MonoLine, Panel, ScreenHeader } from './shared';

const STATUSES = ['Not Started', 'In Progress', 'Blocked', 'Done'] as const;
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

export const MissionControlTasksScreen: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  return (
    <div className="space-y-5 text-white">
      <ScreenHeader
        icon={ListChecks}
        title="Mission Control — Tasks"
        subtitle="Tasks sorted by priority (Critical → Low), then due date · overdue flagged · Done clears"
        note="Tasks live in the vanilla app's local store, which this build does not read — no task, count, or due date is claimed."
      />

      <Panel>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#151515] px-3 py-2 text-xs text-white outline-none"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#151515] px-3 py-2 text-xs text-white outline-none"
            aria-label="Filter by priority"
          >
            <option value="all">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-xs text-[#B8B8B8]">
          Filters: status {filterStatus === 'all' ? 'All statuses' : filterStatus} · priority{' '}
          {filterPriority === 'all' ? 'All priorities' : filterPriority}. They filter the task list once the
          store connects; with no store connected they filter nothing.
        </p>
      </Panel>

      <Panel title="Task list">
        <EmptyState>
          No tasks match. Create a task to start tracking work. The tasks store is NOT_CONNECTED in this build,
          so this empty state is the honest one — no open, overdue, or done count is claimed.
        </EmptyState>
        <MonoLine>TASKS: NOT_CONNECTED · NO_DATA</MonoLine>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[#151515] p-3.5">
            <div className="text-xs font-semibold">Statuses</div>
            <p className="mt-1 text-xs text-[#B8B8B8]">{STATUSES.join(' · ')}</p>
            <p className="mt-1 text-xs text-[#B8B8B8]">
              Checking a task off marks it Done; unchecking returns it to In Progress.
            </p>
          </div>
          <div className="rounded-xl bg-[#151515] p-3.5">
            <div className="text-xs font-semibold">Priorities</div>
            <p className="mt-1 text-xs text-[#B8B8B8]">{PRIORITIES.join(' · ')}</p>
            <p className="mt-1 text-xs text-[#B8B8B8]">
              A task past its due date and not Done is flagged overdue. "Clear Completed" appears only when done
              tasks exist.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
};
