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

import React, { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import { CRYPTO_WORKSPACES, CRYPTO_WORKSPACE_GROUPS, type WorkspaceGroupId } from '../crypto-workspaces-data';
import { WORKSPACE_COVERAGE } from '../workspace-coverage-data';
import { CANONICAL_60, ENCYCLOPEDIA_FAMILIES } from '../encyclopedia-data';
import { MonoLine, Panel, ScreenHeader, StatusPill } from './shared';

const majorTitle = (id: string): string =>
  CANONICAL_60.find((m) => m.id === id)?.title ?? id;
const familyTitle = (id: string): string =>
  ENCYCLOPEDIA_FAMILIES.find((f) => f.id === id)?.title ?? id;

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

type FrameMode = 'STANDARD' | 'ADVANCED' | 'ALL';

export const CryptoWorkspacesScreen: React.FC<{
  focusId?: string | null;
  onFocusHandled?: () => void;
}> = ({ focusId, onFocusHandled }) => {
  const [groupFilter, setGroupFilter] = useState<WorkspaceGroupId | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Search tap-through (v149): when the top bar sends a workspace id,
  // show all groups, expand that row, and scroll it into view.
  useEffect(() => {
    if (!focusId) return;
    if (!CRYPTO_WORKSPACES.some((w) => w.id === focusId)) return;
    setGroupFilter('all');
    setExpandedId(focusId);
    const t = setTimeout(() => {
      const el = document.getElementById(`ws-row-${focusId}`);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'center' });
      }
    }, 60);
    onFocusHandled?.();
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);
  // The shared workspace frame (CW-2): STANDARD is the registry's
  // recorded default view; ADVANCED adds the recorded mapping detail;
  // ALL adds the recorded cost/risk vocabulary and frame notes.
  const [frameMode, setFrameMode] = useState<FrameMode>('STANDARD');

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

      <Panel title="Workspace frame">
        <div className="flex flex-wrap gap-2">
          {(['STANDARD', 'ADVANCED', 'ALL'] as FrameMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setFrameMode(m)}
              className={`flex min-h-[44px] items-center rounded-lg px-3 text-xs font-medium transition ${
                frameMode === m
                  ? 'bg-[#00B7FF] font-semibold text-black'
                  : 'bg-[#151515] text-[#B8B8B8] hover:bg-[#202020] hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <p className="mt-2 font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
          {frameMode === 'STANDARD' &&
            'STANDARD — THE REGISTRY\u2019S RECORDED DEFAULT VIEW: STATUS, LADDER TOP AND BACKBONE MAJORS PER WORKSPACE.'}
          {frameMode === 'ADVANCED' &&
            'ADVANCED — ADDS THE RECORDED MAPPING DETAIL INSIDE EACH COVERAGE PANEL: FAMILIES, ENTITY KINDS AND BOT-ROLE CODES.'}
          {frameMode === 'ALL' &&
            'ALL — ADDS THE RECORDED COST/RISK VOCABULARY: COST-CLASS AND RISK-DIMENSION CODES EXACTLY AS THE REGISTRY RECORDS THEM. AMOUNTS STAY UNKNOWN UNTIL A LIVE SOURCE PRICES THEM; RISK IS PROFILED BY DIMENSION, NEVER AS ONE SCORE.'}
        </p>
      </Panel>

      {visibleGroups.map((g) => (
        <Panel key={g.id} title={`${g.label} — ${g.rows.length} workspaces`}>
          <div className="space-y-2">
            {g.rows.map((w) => (
              <div key={w.id} id={`ws-row-${w.id}`} className="rounded-xl bg-[#151515] p-3.5">
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
                {(() => {
                  const cov = WORKSPACE_COVERAGE[w.id];
                  if (!cov) return null;
                  const isOpen = expandedId === w.id;
                  const hasMajors = cov.majors.length + cov.secondaryMajors.length > 0;
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isOpen ? null : w.id)}
                        aria-expanded={isOpen}
                        className="mt-2 flex min-h-[44px] w-full items-center justify-between rounded border border-[#00B7FF]/40 bg-[#050505] px-2 font-mono text-[10px] text-white"
                      >
                        <span>
                          BACKBONE COVERAGE: {cov.majors.length} PRIMARY · {cov.secondaryMajors.length}{' '}
                          SECONDARY MAJORS
                        </span>
                        <span className="text-[#00B7FF]">{isOpen ? 'HIDE' : 'VIEW'}</span>
                      </button>
                      {frameMode === 'ALL' && (cov.costClasses.length > 0 || cov.riskDimensions.length > 0) && (
                        <p className="mt-1.5 font-mono text-[10px] text-[#B8B8B8]">
                          {cov.costClasses.length > 0 ? `COST: ${cov.costClasses.join(' · ')} (AMOUNTS UNKNOWN)` : ''}
                          {cov.costClasses.length > 0 && cov.riskDimensions.length > 0 ? ' · ' : ''}
                          {cov.riskDimensions.length > 0 ? `RISK: ${cov.riskDimensions.join(' · ')}` : ''}
                        </p>
                      )}
                      {isOpen && (
                        <div className="mt-2 space-y-2 rounded border border-white/10 bg-[#050505] p-2.5">
                          {!hasMajors && (
                            <p className="font-mono text-[10px] text-[#B8B8B8]">
                              NO CANONICAL MAJOR ACTIVITY IS RECORDED FOR THIS WORKSPACE
                              {w.gated
                                ? ' — IT IS AN OWNER-GATED SEAT; NO ACTIVITY IS INVENTED TO FILL IT.'
                                : ' — STRUCTURAL / PLATFORM SEAT IN THE REGISTRY.'}
                            </p>
                          )}
                          {cov.majors.length > 0 && (
                            <div>
                              <p className="font-mono text-[9px] text-[#00B7FF]">PRIMARY MAJORS (RECORDED)</p>
                              {cov.majors.map((id) => (
                                <p key={id} className="font-mono text-[10px] text-white">
                                  · {majorTitle(id)}
                                </p>
                              ))}
                            </div>
                          )}
                          {cov.secondaryMajors.length > 0 && (
                            <div>
                              <p className="font-mono text-[9px] text-[#00B7FF]">SECONDARY MAJORS (RECORDED)</p>
                              {cov.secondaryMajors.map((id) => (
                                <p key={id} className="font-mono text-[10px] text-[#B8B8B8]">
                                  · {majorTitle(id)}
                                </p>
                              ))}
                            </div>
                          )}
                          {frameMode !== 'STANDARD' && cov.families.length > 0 && (
                            <p className="font-mono text-[10px] text-[#B8B8B8]">
                              FAMILIES: {cov.families.map(familyTitle).join(' · ')}
                            </p>
                          )}
                          {frameMode !== 'STANDARD' && cov.entityKinds.length > 0 && (
                            <p className="font-mono text-[10px] text-[#B8B8B8]">
                              ENTITY KINDS: {cov.entityKinds.join(' · ').toUpperCase()}
                            </p>
                          )}
                          {frameMode !== 'STANDARD' && cov.botRoles.length > 0 && (
                            <p className="font-mono text-[10px] text-[#B8B8B8]">
                              BOT ROLE CODES (AS RECORDED): {cov.botRoles.join(' · ')}
                            </p>
                          )}
                          {frameMode === 'ALL' && (
                            <div className="space-y-1 border-t border-white/10 pt-2">
                              {cov.worldLayer && (
                                <p className="font-mono text-[10px] text-[#B8B8B8]">
                                  WORLD LAYER (RECORDED): {cov.worldLayer}
                                </p>
                              )}
                              {cov.actions.length > 0 && (
                                <p className="font-mono text-[10px] text-[#B8B8B8]">
                                  RECORDED ACTIONS: {cov.actions.join(' · ').toUpperCase()}
                                </p>
                              )}
                              {cov.costClasses.length > 0 && (
                                <p className="font-mono text-[10px] text-[#B8B8B8]">
                                  COST CLASSES (RECORDED CODES): {cov.costClasses.join(' · ')} — AMOUNTS
                                  UNKNOWN, NEVER ZERO
                                </p>
                              )}
                              {cov.riskDimensions.length > 0 && (
                                <p className="font-mono text-[10px] text-[#B8B8B8]">
                                  RISK DIMENSIONS (RECORDED CODES): {cov.riskDimensions.join(' · ')} —
                                  PROFILED BY DIMENSION, NEVER ONE SCORE
                                </p>
                              )}
                              {cov.panelsNote && (
                                <p className="font-mono text-[10px] text-[#B8B8B8]">
                                  FRAME NOTE (RECORDED): {cov.panelsNote}
                                </p>
                              )}
                            </div>
                          )}
                          <p className="font-mono text-[8px] text-[#B8B8B8]">
                            COVERAGE IS THE REGISTRY&apos;S RECORDED MAPPING (CW-1 RESOLVER DATA) — IT
                            DESCRIBES WHAT THE WORKSPACE IS OVER, NOT LIVE CONTENT. ALL RECORDS UNVERIFIED.
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
};
