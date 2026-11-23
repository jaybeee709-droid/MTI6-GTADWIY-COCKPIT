// Operations — migrated from js/modules/operations.js
//
// The Operations shell: Mission Control, Resource Tracker,
// Infrastructure, System Health, API / Data Health, and Automation
// Status. Every status is real state. Infrastructure shows NOT
// CONNECTED because no infrastructure system reports to it. System
// Health reads the live connection (navigator.onLine — a real
// browser value); the service-worker state and cached app version
// are UNKNOWN in this build because they are read from the deployed
// vanilla service worker, which this React build does not verify.
// Automation Status is honest: nothing runs in the background except
// the approved encyclopedia import at boot.

import React from 'react';
import { Settings } from 'lucide-react';
import { EmptyState, MonoLine, Panel, ScreenHeader, StatusPill } from './shared';

export const OperationsScreen: React.FC = () => {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : false;

  return (
    <div className="space-y-5 text-white">
      <ScreenHeader
        icon={Settings}
        title="Operations"
        subtitle="Mission Control, resources, infrastructure, and system health"
        note="Statuses below are real — unknown means unknown, never guessed."
      />

      <Panel title="Mission Control">
        <p className="text-xs text-[#B8B8B8]">
          Tasks and Projects live here. Missions and Activity are planned — not built.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg bg-[#151515] px-3 py-1.5 text-xs text-[#B8B8B8]">Tasks</span>
          <span className="rounded-lg bg-[#151515] px-3 py-1.5 text-xs text-[#B8B8B8]">Projects</span>
        </div>
        <p className="mt-3 text-xs text-[#B8B8B8]">Missions: planned — not built · Activity: planned — not built</p>
      </Panel>

      <Panel title="Resource Tracker">
        <p className="text-xs text-[#B8B8B8]">Spending and resources, stored locally on this device.</p>
        <p className="mt-2 text-xs text-[#B8B8B8]">
          The Resource Tracker screen holds the ledger; its totals are UNAVAILABLE in this build (store not
          connected), never zero.
        </p>
      </Panel>

      <Panel title="Infrastructure">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[#B8B8B8]">
            Infrastructure appears here only when a real system reports it.
          </p>
          <StatusPill status="NOT CONNECTED" />
        </div>
        <MonoLine>INFRASTRUCTURE: NOT_CONNECTED · NO_DATA</MonoLine>
      </Panel>

      <Panel title="System Health">
        <div className="space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#151515] p-3">
            <span className="text-[#B8B8B8]">Connection</span>
            <span className="font-semibold">{online ? 'Online' : 'Offline'}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#151515] p-3">
            <span className="text-[#B8B8B8]">Service worker</span>
            <span className="font-semibold">UNKNOWN — not verified in this build</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#151515] p-3">
            <span className="text-[#B8B8B8]">Cached app version</span>
            <span className="font-semibold">UNKNOWN — not read from the deployed service worker here</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#151515] p-3">
            <span className="text-[#B8B8B8]">Background workers</span>
            <span className="font-semibold">None connected</span>
          </div>
        </div>
      </Panel>

      <Panel title="API / Data Health">
        <p className="text-xs text-[#B8B8B8]">
          Live API usage counts live on the Cockpit Status dashboard (API Health &amp; Usage panel) — which
          reports NO_DATA in this build, because no usage store is wired.
        </p>
      </Panel>

      <Panel title="Automation Status">
        <EmptyState>
          No automation is running. Approved encyclopedia imports run once at app boot; nothing else runs in the
          background.
        </EmptyState>
      </Panel>
    </div>
  );
};
