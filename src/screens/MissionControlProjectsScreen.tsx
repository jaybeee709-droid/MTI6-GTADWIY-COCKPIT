// Mission Control — Projects, migrated from js/modules/projects.js
//
// Vanilla structure: projects with name, status (Active / On Hold /
// Completed / Cancelled), notes, and milestones (title, due date,
// done), with progress = done milestones / all milestones for that
// project. Projects and milestones live in the vanilla app's local
// IndexedDB stores, which this React build does not read — so no
// project, milestone, or progress percentage is shown here rather
// than an invented one.

import React from 'react';
import { FolderKanban } from 'lucide-react';
import { EmptyState, MonoLine, Panel, ScreenHeader } from './shared';

const PROJECT_STATUSES = ['Active', 'On Hold', 'Completed', 'Cancelled'] as const;

export const MissionControlProjectsScreen: React.FC = () => {
  return (
    <div className="space-y-5 text-white">
      <ScreenHeader
        icon={FolderKanban}
        title="Mission Control — Projects"
        subtitle="Projects with milestone progress · newest updated first"
        note="Projects and milestones live in the vanilla app's local stores, which this build does not read — no project, milestone, or progress percentage is claimed."
      />

      <Panel title="Project statuses">
        <div className="flex flex-wrap gap-2">
          {PROJECT_STATUSES.map((s) => (
            <span key={s} className="rounded-lg bg-[#151515] px-3 py-1.5 text-xs text-[#B8B8B8]">
              {s}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#B8B8B8]">
          Progress is measured, never guessed: done milestones ÷ all milestones for the project. A project with
          no milestones shows 0% in vanilla only because the milestone list was read and found empty — with no
          store connected here, progress is UNMEASURED, not 0%.
        </p>
      </Panel>

      <Panel title="Project list">
        <EmptyState>
          No projects yet. Create one to start tracking milestones. The projects and milestones stores are
          NOT_CONNECTED in this build, so this empty state is the honest one.
        </EmptyState>
        <MonoLine>PROJECTS: NOT_CONNECTED · NO_DATA · MILESTONES: NOT_CONNECTED · NO_DATA</MonoLine>
        <p className="mt-3 text-xs text-[#B8B8B8]">
          Vanilla project-card structure carried over for when the stores connect: status badge, progress bar
          with percentage, notes, milestone checklist (title, due date, done toggle, remove), "+ Add Milestone",
          and Edit Project / Delete Project actions. Deleting a project deletes its milestones too.
        </p>
      </Panel>
    </div>
  );
};
