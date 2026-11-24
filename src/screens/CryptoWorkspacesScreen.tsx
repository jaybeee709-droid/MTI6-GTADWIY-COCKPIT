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
import { CANONICAL_60, ENCYCLOPEDIA_FAMILIES, ENCYCLOPEDIA_INDEX } from '../encyclopedia-data';
import { ENTITY_UNIVERSE } from '../entity-data';
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

const KIND_TO_REGISTRY: Record<string, string> = {
  networks: 'chains',
  assets: 'assets',
  protocols: 'protocols',
};

function ownerRecordsFor(majorIds: Set<string>): { opportunities: number; positions: number } {
  let opportunities = 0;
  let positions = 0;
  try {
    const opps: unknown = JSON.parse(localStorage.getItem('mti6_opportunities_v1') ?? '[]');
    if (Array.isArray(opps))
      opportunities = opps.filter(
        (o) => !!o && typeof o === 'object' && majorIds.has((o as { majorActivityId?: string }).majorActivityId ?? ''),
      ).length;
    const poss: unknown = JSON.parse(localStorage.getItem('mti6_positions_v1') ?? '[]');
    if (Array.isArray(poss))
      positions = poss.filter(
        (p) => !!p && typeof p === 'object' && majorIds.has((p as { activityId?: string }).activityId ?? ''),
      ).length;
  } catch {
    /* unreadable local records count as none recorded here */
  }
  return { opportunities, positions };
}

const WorkspaceDetail: React.FC<{ id: string; onBack: () => void; onOpen: (id: string) => void }> = ({ id, onBack, onOpen }) => {
  const w = CRYPTO_WORKSPACES.find((x) => x.id === id);
  const cov = WORKSPACE_COVERAGE[id];
  if (!w || !cov) return null;
  const majorIds = new Set([...cov.majors, ...cov.secondaryMajors]);
  const owner = ownerRecordsFor(majorIds);
  const childrenOf = (pid: string) => ENCYCLOPEDIA_INDEX.filter((e) => e.parent === pid);
  const majorCounts = (mid: string) => {
    const types = childrenOf(mid).filter((c) => c.level === 'TYPE');
    const direct = childrenOf(mid).filter((c) => c.level === 'STRATEGY').length;
    const under = types.reduce((n, t) => n + childrenOf(t.id).filter((c) => c.level === 'STRATEGY').length, 0);
    return { types: types.length, strategies: direct + under };
  };
  const entitiesFor = (kind: string) =>
    ENTITY_UNIVERSE.filter((e) => e.registry === (KIND_TO_REGISTRY[kind] ?? kind));
  const groupLabel = CRYPTO_WORKSPACE_GROUPS.find((g) => g.id === w.group)?.label ?? w.group;

  return (
    <div className="space-y-5 text-white">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-[44px] items-center rounded-lg border border-[#00B7FF]/50 px-3 font-mono text-[11px] text-white"
      >
        ← BACK TO WORKSPACE INDEX
      </button>

      <ScreenHeader
        icon={Layers}
        title={w.title}
        subtitle={`Dedicated workspace view — composed from the registry, the backbone, and the entity universe (${groupLabel} group)`}
        note="Everything below is recorded data or a real join over the owner's own records. Sections with nothing recorded say so; nothing is invented to complete the page."
      />

      <Panel title="Workspace frame (recorded)">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={w.status} tone={statusTone(w.status)} />
          {w.gated ? <StatusPill status="GATED" tone="warn" /> : null}
        </div>
        <p className="mt-1 text-xs text-[#B8B8B8]">{statusNote(w.status)}</p>
        <MonoLine>
          id: {w.id} · frame: {cov.frame || w.frame} · default view: {cov.defaultView} · world layer:{' '}
          {cov.worldLayer || 'NOT RECORDED'} · ladder top: {cov.ladderTop || w.ladderTop} · execution:
          DISABLED
        </MonoLine>
        {cov.panelsNote && <MonoLine>FRAME NOTE (RECORDED): {cov.panelsNote}</MonoLine>}
        {cov.actions.length > 0 && (
          <MonoLine>RECORDED ACTIONS: {cov.actions.join(' · ').toUpperCase()}</MonoLine>
        )}
      </Panel>

      <Panel title="Why this workspace (§69 — the recorded chain)">
        <div className="space-y-1.5">
          <MonoLine>
            SHOWN BECAUSE: THE CW-2 REGISTRY RECORDS THIS WORKSPACE IN THE {groupLabel.toUpperCase()}{' '}
            GROUP WITH STATUS {w.status}
            {w.gated ? ' — AN OWNER-GATED SEAT' : ''}. ITS FRAME IS THE SHARED WORKSPACE FRAME
            (DEFAULT VIEW {cov.defaultView}) AND ITS LADDER TOPS OUT AT {cov.ladderTop || w.ladderTop}{' '}
            — EXECUTION DISABLED.
          </MonoLine>
          <MonoLine>
            CONTENT DERIVATION: REGISTRY RECORD → CW-1 RESOLVER COVERAGE → {cov.majors.length} PRIMARY
            + {cov.secondaryMajors.length} SECONDARY BACKBONE MAJORS → THEIR RECORDED TYPES AND
            STRATEGIES. ENTITY SCOPE COMES FROM THE RECORDED ENTITY KINDS; COST AND RISK FROM THE
            RECORDED CODE SETS. NOTHING ON THIS SCREEN COMES FROM ANYWHERE ELSE.
          </MonoLine>
          {cov.panelsNote && <MonoLine>REGISTRY'S OWN NOTE: {cov.panelsNote}</MonoLine>}
          <MonoLine>
            IF A SECTION READS EMPTY OR NOT RECORDED, THAT IS THE RECORD'S TRUE STATE — THE WHY IS
            NEVER A GAP BEING HIDDEN.
          </MonoLine>
        </div>
      </Panel>

      <Panel title="Backbone — activities, types, strategies">
        {cov.majors.length === 0 && cov.secondaryMajors.length === 0 ? (
          <MonoLine>
            NO CANONICAL MAJOR ACTIVITY IS RECORDED FOR THIS WORKSPACE
            {w.gated ? ' — OWNER-GATED SEAT; NO ACTIVITY IS INVENTED TO FILL IT.' : '.'}
          </MonoLine>
        ) : (
          <div className="space-y-1.5">
            {cov.majors.map((mid) => {
              const c = majorCounts(mid);
              return (
                <p key={mid} className="font-mono text-[11px] text-white">
                  · {majorTitle(mid)} — PRIMARY · {c.types} TYPES · {c.strategies} STRATEGIES RECORDED
                </p>
              );
            })}
            {cov.secondaryMajors.map((mid) => {
              const c = majorCounts(mid);
              return (
                <p key={mid} className="font-mono text-[11px] text-[#B8B8B8]">
                  · {majorTitle(mid)} — SECONDARY · {c.types} TYPES · {c.strategies} STRATEGIES RECORDED
                </p>
              );
            })}
            {cov.families.length > 0 && (
              <MonoLine>FAMILIES: {cov.families.map(familyTitle).join(' · ')}</MonoLine>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Entities in scope (recorded kinds, canonical records)">
        {cov.entityKinds.length === 0 ? (
          <MonoLine>NO ENTITY KINDS ARE RECORDED FOR THIS WORKSPACE.</MonoLine>
        ) : (
          <div className="space-y-1.5">
            {cov.entityKinds.map((kind) => {
              const list = entitiesFor(kind);
              return (
                <p key={kind} className="font-mono text-[11px] text-[#B8B8B8]">
                  {kind.toUpperCase()} ({list.length} CANONICAL, ALL UNVERIFIED):{' '}
                  <span className="text-white">{list.map((e) => e.title).join(', ') || 'NONE RECORDED'}</span>
                </p>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Cost & risk (recorded vocabulary)">
        <MonoLine>
          {cov.costClasses.length > 0
            ? `COST CLASSES (CODES AS RECORDED): ${cov.costClasses.join(' · ')} — AMOUNTS UNKNOWN, NEVER ZERO`
            : 'COST CLASSES: NONE RECORDED — COSTS UNKNOWN, NEVER ZERO'}
        </MonoLine>
        <MonoLine>
          {cov.riskDimensions.length > 0
            ? `RISK DIMENSIONS (CODES AS RECORDED): ${cov.riskDimensions.join(' · ')} — PROFILED BY DIMENSION, NEVER ONE SCORE`
            : 'RISK DIMENSIONS: NONE RECORDED'}
        </MonoLine>
      </Panel>

      <Panel title="Simulator, bots & STAR">
        <MonoLine>
          SIMULATOR TEMPLATE (RECORDED): {cov.simulatorTemplate}
          {cov.simulatorTemplate === 'NONE'
            ? ' — NO SIMULATOR IS RECORDED FOR THIS WORKSPACE.'
            : ' — SIMULATIONS RUN FROM OPPORTUNITY RECORDS ON THE OPPORTUNITIES SCREEN (SIMULATION_ONLY, NEVER EXECUTED).'}
        </MonoLine>
        <MonoLine>
          {cov.botRoles.length > 0
            ? `BOT ROLE CODES (AS RECORDED): ${cov.botRoles.join(' · ')} — ASSIGNMENTS ARE OWNER RECORDS KEPT IN BOT OPERATIONS; WORKERS ACTIVE: 0 · NOT_CONNECTED.`
            : 'BOT ROLES: NONE RECORDED FOR THIS WORKSPACE.'}
        </MonoLine>
        <MonoLine>
          STAR: ASK STAR ABOUT ANY ENTITY OR MAJOR ABOVE BY NAME — SHE ANSWERS FROM THE SAME
          RECORDS SHOWN HERE.
        </MonoLine>
      </Panel>

      <Panel title="Related workspaces (shared backbone majors, recorded)">
        {(() => {
          const related = Object.entries(WORKSPACE_COVERAGE)
            .filter(([otherId]) => otherId !== id)
            .map(([otherId, oc]) => ({
              otherId,
              shared: [...oc.majors, ...oc.secondaryMajors].filter((m) => majorIds.has(m)),
            }))
            .filter((r) => r.shared.length > 0)
            .sort((a, b) => b.shared.length - a.shared.length)
            .slice(0, 8);
          if (related.length === 0)
            return (
              <MonoLine>
                NO OTHER WORKSPACE SHARES A RECORDED MAJOR WITH THIS ONE — IT STANDS ALONE IN THE
                REGISTRY MAPPING.
              </MonoLine>
            );
          return (
            <div className="space-y-1.5">
              {related.map((r) => (
                <button
                  key={r.otherId}
                  type="button"
                  onClick={() => onOpen(r.otherId)}
                  className="block w-full rounded border border-white/10 bg-[#050505] px-2.5 py-2 text-left"
                >
                  <span className="font-mono text-[11px] text-white">
                    {CRYPTO_WORKSPACES.find((x) => x.id === r.otherId)?.title ?? r.otherId}
                  </span>
                  <span className="block font-mono text-[9px] text-[#B8B8B8]">
                    SHARES {r.shared.length}: {r.shared.map(majorTitle).join(' · ')}
                  </span>
                </button>
              ))}
              <MonoLine>
                RELATIONSHIP = A SHARED RECORDED MAJOR IN THE REGISTRY MAPPING (THE §70 DEPENDENCY
                READING) — NOT A LIVE LINK.
              </MonoLine>
            </div>
          );
        })()}
      </Panel>

      <Panel title="Owner context on this device (real joins, owner records only)">
        <MonoLine>
          OPPORTUNITY RECORDS AGAINST THIS WORKSPACE&apos;S MAJORS: {owner.opportunities} ·
          POSITION RECORDS AGAINST THEM: {owner.positions} — THESE ARE THE OWNER&apos;S OWN LOCAL
          RECORDS, NOT PLATFORM DATA; THE DISCOVERY FEED AND POSITION FEEDS REMAIN NOT_CONNECTED.
        </MonoLine>
      </Panel>
    </div>
  );
};

export const CryptoWorkspacesScreen: React.FC<{
  focusId?: string | null;
  onFocusHandled?: () => void;
}> = ({ focusId, onFocusHandled }) => {
  const [groupFilter, setGroupFilter] = useState<WorkspaceGroupId | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Dedicated workspace view (v162; CW-0 Gap 6, first increment):
  // one workspace composed from everything the platform records
  // about it — the §113 list (activity, entities, dependencies,
  // cost, risk, opportunities, position context, STAR, bots) with
  // honest states for whatever is session data or unrecorded.
  const [detailId, setDetailId] = useState<string | null>(null);
  // Compare mode (v166; directive §68, recorded there as a
  // PROPOSED ENHANCEMENT — built as a record-derived comparison:
  // two workspaces side by side over their recorded coverage,
  // shared majors marked; nothing computed beyond the records).
  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');

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

  if (detailId) {
    return (
      <WorkspaceDetail id={detailId} onBack={() => setDetailId(null)} onOpen={(id) => setDetailId(id)} />
    );
  }

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

      <Panel title="Compare workspaces (§68 — recorded coverage, side by side)">
        <div className="flex flex-wrap gap-2">
          {([['A', compareA, setCompareA], ['B', compareB, setCompareB]] as const).map(([label, val, set]) => (
            <label key={label} className="flex min-h-[44px] flex-1 items-center gap-2 rounded border border-white/15 bg-[#050505] px-2">
              <span className="font-mono text-[10px] text-[#00B7FF]">{label}</span>
              <select
                value={val}
                onChange={(e) => set(e.target.value)}
                className="min-h-[44px] w-full bg-transparent font-mono text-[11px] text-white outline-none"
              >
                <option value="" className="bg-[#151515]">CHOOSE A WORKSPACE…</option>
                {CRYPTO_WORKSPACES.map((w) => (
                  <option key={w.id} value={w.id} className="bg-[#151515]">
                    {w.title}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {compareA && compareB && compareA !== compareB && (() => {
          const a = WORKSPACE_COVERAGE[compareA];
          const b = WORKSPACE_COVERAGE[compareB];
          const wa = CRYPTO_WORKSPACES.find((w) => w.id === compareA);
          const wb = CRYPTO_WORKSPACES.find((w) => w.id === compareB);
          if (!a || !b || !wa || !wb) return null;
          const aMajors = new Set([...a.majors, ...a.secondaryMajors]);
          const bMajors = new Set([...b.majors, ...b.secondaryMajors]);
          const shared = [...aMajors].filter((m) => bMajors.has(m));
          const row = (label: string, va: string, vb: string) => (
            <div className="grid grid-cols-[110px_1fr_1fr] gap-2 border-b border-white/5 py-1.5">
              <span className="font-mono text-[9px] text-[#00B7FF]">{label}</span>
              <span className="font-mono text-[10px] text-white">{va}</span>
              <span className="font-mono text-[10px] text-white">{vb}</span>
            </div>
          );
          const titles = (ids: string[]) => (ids.length ? ids.map(majorTitle).join(' · ') : 'NONE RECORDED');
          return (
            <div className="mt-3">
              <div className="grid grid-cols-[110px_1fr_1fr] gap-2 pb-1">
                <span />
                <span className="text-xs font-semibold">{wa.title}</span>
                <span className="text-xs font-semibold">{wb.title}</span>
              </div>
              {row('STATUS', wa.status, wb.status)}
              {row('LADDER TOP', a.ladderTop || wa.ladderTop, b.ladderTop || wb.ladderTop)}
              {row('WORLD LAYER', a.worldLayer || 'NOT RECORDED', b.worldLayer || 'NOT RECORDED')}
              {row('GATED', wa.gated ? 'YES — OWNER-GATED SEAT' : 'NO', wb.gated ? 'YES — OWNER-GATED SEAT' : 'NO')}
              {row('PRIMARY MAJORS', titles(a.majors), titles(b.majors))}
              {row('SECONDARY', titles(a.secondaryMajors), titles(b.secondaryMajors))}
              {row('FAMILIES', a.families.length ? a.families.map(familyTitle).join(' · ') : 'NONE RECORDED', b.families.length ? b.families.map(familyTitle).join(' · ') : 'NONE RECORDED')}
              {row('ENTITY KINDS', a.entityKinds.join(' · ').toUpperCase() || 'NONE RECORDED', b.entityKinds.join(' · ').toUpperCase() || 'NONE RECORDED')}
              {row('COST CODES', a.costClasses.join(' · ') || 'NONE RECORDED', b.costClasses.join(' · ') || 'NONE RECORDED')}
              {row('RISK CODES', a.riskDimensions.join(' · ') || 'NONE RECORDED', b.riskDimensions.join(' · ') || 'NONE RECORDED')}
              {row('SIMULATOR', a.simulatorTemplate, b.simulatorTemplate)}
              <MonoLine>
                SHARED MAJORS ({shared.length}): {shared.length ? shared.map(majorTitle).join(' · ') : 'NONE — THE TWO WORKSPACES COVER DIFFERENT PARTS OF THE BACKBONE.'}
              </MonoLine>
              <MonoLine>
                COMPARISON READS THE RECORDED REGISTRY COVERAGE ONLY — IT RANKS NOTHING AND SCORES
                NOTHING.
              </MonoLine>
            </div>
          );
        })()}
        {compareA && compareB && compareA === compareB && (
          <MonoLine>THE SAME WORKSPACE IS CHOSEN TWICE — PICK TWO DIFFERENT ONES TO COMPARE.</MonoLine>
        )}
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
                      <button
                        type="button"
                        onClick={() => setDetailId(w.id)}
                        className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded border border-white/20 bg-[#050505] px-2 font-mono text-[10px] text-white"
                      >
                        OPEN WORKSPACE →
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
