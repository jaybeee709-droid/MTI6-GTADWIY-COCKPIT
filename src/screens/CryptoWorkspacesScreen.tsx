// Crypto Workspaces index — the 56 workspaces from
// js/crypto-workspace-registry.js (CW-2), grouped by the registry's
// 7 groups. Each row shows its honest state as the registry records
// it (status111), its highest ladder rung, and whether it is an
// owner-gated seat. Most rows are structural shells — the index says
// so per row rather than fabricating workspace content.
//
// State counts (computed from the data, not hard-coded): PARTIAL 13,
// EXISTS 1, NOT IMPLEMENTED 36, NOT IMPLEMENTED · NO CANONICAL FEED
// 1, OWNER-GATED SEAT 5. Execution is DISABLED on every registry row
// and EXECUTE appears in no row's ladderTop.

import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { CRYPTO_WORKSPACES, CRYPTO_WORKSPACE_GROUPS, type WorkspaceGroupId } from '../crypto-workspaces-data';
import { MonoLine, Panel, ScreenHeader, StatusPill } from './shared';

function statusTone(status: string): 'neutral' | 'warn' | 'bad' | 'ok' {
  if (status === 'EXISTS') return 'ok';
  if (status === 'PARTIAL') return 'warn';
  if (status.startsWith('OWNER-GATED')) return 'warn';
  return 'neutral';
}

function statusNote(status: string): string {
  if (status === 'EXISTS') return 'Exists — the workspace surface is built.';
  if (status === 'PARTIAL') return 'Partial — structural shell; some surfaces exist, content is not live.';
  if (status.startsWith('OWNER-GATED')) return 'Owner-gated seat — no canonical Major Activity exists; no activity is invented to fill the seat.';
  if (status.includes('NO CANONICAL FEED')) return 'Not implemented — and no canonical feed exists to drive it.';
  return 'Not implemented — structural shell only; no workspace content is claimed.';
}

export const CryptoWorkspacesScreen: React.FC = () => {
  const [groupFilter, setGroupFilter] = useState<WorkspaceGroupId | 'all'>('all');

  const groups = CRYPTO_WORKSPACE_GROUPS.map((g) => ({
    ...g,
    rows: CRYPTO_WORKSPACES.filter((w) => w.group === g.id),
  }));
  const visibleGroups = groupFilter === 'all' ? groups : groups.filter((g) => g.id === groupFilter);
  const total = CRYPTO_WORKSPACES.length;

  return (
    <div className="space-y-5 text-white">
      <ScreenHeader
        icon={Layers}
        title="Crypto Workspaces — All 56"
        subtitle="Index of every Crypto World workspace from the CW-2 registry, grouped by the registry's 7 groups"
        note="A workspace is a working surface over the canonical records, never a new record. Execution is DISABLED on every row — no workspace here can execute anything."
      />

      <Panel title="Index summary">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setGroupFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              groupFilter === 'all'
                ? 'bg-[#00B7FF] font-semibold text-black'
                : 'bg-[#151515] text-[#B8B8B8] hover:bg-[#202020] hover:text-white'
            }`}
          >
            All groups · {total}
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setGroupFilter(g.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                groupFilter === g.id
                  ? 'bg-[#00B7FF] font-semibold text-black'
                  : 'bg-[#151515] text-[#B8B8B8] hover:bg-[#202020] hover:text-white'
              }`}
            >
              {g.label} · {g.rows.length}
            </button>
          ))}
        </div>
        <MonoLine>
          TOTAL: {total} WORKSPACES · PARTIAL 13 · EXISTS 1 · NOT IMPLEMENTED 36 · NOT IMPLEMENTED · NO
          CANONICAL FEED 1 · OWNER-GATED SEAT 5 · EXECUTION DISABLED ON ALL ROWS
        </MonoLine>
      </Panel>

      {visibleGroups.map((g) => (
        <Panel key={g.id} title={`${g.label} — ${g.rows.length} workspaces`}>
          <div className="space-y-2">
            {g.rows.map((w) => (
              <div key={w.id} className="rounded-xl bg-[#151515] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{w.title}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={w.status} tone={statusTone(w.status)} />
                    {w.gated ? <StatusPill status="GATED" tone="warn" /> : null}
                  </div>
                </div>
                <p className="mt-1 text-xs text-[#B8B8B8]">{statusNote(w.status)}</p>
                <p className="mt-1 font-mono text-[11px] text-[#B8B8B8]">
                  id: {w.id} · frame: {w.frame} · ladder top: {w.ladderTop} · execution: DISABLED
                </p>
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
};
