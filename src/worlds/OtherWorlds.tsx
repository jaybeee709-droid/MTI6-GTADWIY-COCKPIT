import React, { useMemo, useState } from 'react';
import {
  Accessibility,
  AlertOctagon,
  Bell,
  BookOpen,
  Bot,
  Compass,
  Globe,
  Key,
  Layout,
  Lock,
  MapPin,
  Palette,
  PieChart,
  Power,
  Search,
  Shield,
  Smartphone,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  CANONICAL_60,
  ENCYCLOPEDIA_COUNTS,
  ENCYCLOPEDIA_FAMILIES,
  ENCYCLOPEDIA_INDEX,
} from '../encyclopedia-data';
import { ENTITY_COUNTS, ENTITY_UNIVERSE } from '../entity-data';

/* ============================================================================
 * 1. OpportunitiesWorld — honest: the pipeline ends at PREPARED with
 * 0 records. No invented opportunity, score, or APY is shown.
 * ============================================================================ */
const OPP_TABS = [
  'Feed',
  'Discovery',
  'Rankings',
  'Trending',
  'Local',
  'Global',
  'Saved',
  'Recommended',
  'Intelligence',
] as const;

type OppTab = (typeof OPP_TABS)[number];

export const OpportunitiesWorld: React.FC = () => {
  const [tab, setTab] = useState<OppTab>('Feed');

  return (
    <div className="space-y-5 text-white">
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00B7FF]/15 text-[#00B7FF] border border-[#00B7FF]/30">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Opportunities World</h2>
            <p className="text-xs text-[#B8B8B8]">
              Feed, Discovery, Rankings, Trending, Local, Global, Saved, Recommended &amp; Intelligence
            </p>
            <p className="text-xs text-[#B8B8B8] mt-0.5">
              Pipeline ends at PREPARED — no opportunity is scored or ranked until a live feed is connected.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {OPP_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === t
                  ? 'bg-[#00B7FF] text-black font-semibold'
                  : 'bg-[#151515] text-[#B8B8B8] hover:bg-[#202020] hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Globe className="h-4 w-4 text-[#00B7FF]" /> View: {tab}
        </div>
        <p className="text-xs text-[#B8B8B8]">
          0 records. No opportunity title, score, APY, region, or STAR verification is claimed in this
          build — the feed is NOT_CONNECTED and the data is NO_DATA.
        </p>
        <p className="text-xs font-mono text-[#B8B8B8]">OPPORTUNITIES: 0 RECORDS · STATUS: NOT_CONNECTED · NO_DATA</p>
        <div className="flex items-center gap-2 text-xs text-[#B8B8B8]">
          <MapPin className="h-3.5 w-3.5" /> Local and global views both report 0 records.
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. PositionsAssetsWorld — honest: every value UNAVAILABLE, never zero.
 * No net worth, allocation, PnL, or Sharpe figure is claimed.
 * ============================================================================ */
const ASSET_TABS = ['Crypto', 'Cash', 'Cards', 'Points', 'Performance', 'Allocation'] as const;
type AssetTab = (typeof ASSET_TABS)[number];

export const PositionsAssetsWorld: React.FC = () => {
  const [tab, setTab] = useState<AssetTab>('Crypto');

  return (
    <div className="space-y-5 text-white">
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#32D74B]/15 text-[#32D74B] border border-[#32D74B]/30">
              <PieChart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Positions &amp; Assets Unified Ledger</h2>
              <p className="text-xs text-[#B8B8B8]">
                Consolidated Crypto, Cash, Cards, Points, Performance &amp; Target Allocation
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase text-[#B8B8B8]">Net Worth</div>
            <div className="text-xl font-bold text-white">UNAVAILABLE</div>
            <div className="text-[10px] text-[#B8B8B8]">NOT_CONNECTED · NO_DATA — never zero</div>
          </div>
        </div>

        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {ASSET_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === t
                  ? 'bg-[#00B7FF] text-black font-semibold'
                  : 'bg-[#151515] text-[#B8B8B8] hover:bg-[#202020] hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Crypto Positions', note: 'Value: UNAVAILABLE · no allocation or PnL claimed' },
          { label: 'Cash & FX Reserves', note: 'Value: UNAVAILABLE · no APY claimed' },
          { label: 'Cards & Points Value', note: 'Value: UNAVAILABLE · no points balance claimed' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-[#101010] p-4">
            <div className="text-xs text-[#B8B8B8]">{card.label}</div>
            <div className="mt-2 text-xl font-bold">UNAVAILABLE</div>
            <div className="mt-1 text-xs text-[#B8B8B8]">{card.note}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 text-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Active View: {tab}</span>
          <span className="text-[#B8B8B8]">Sharpe: NO_DATA · Max Drawdown: NO_DATA</span>
        </div>
        <p className="text-[#B8B8B8]">
          No position rows are shown: no holding, weight, value, or return is claimed until a live
          read-only feed is connected. Positions value is UNAVAILABLE, never zero.
        </p>
        <p className="mt-2 font-mono text-[11px] text-[#B8B8B8]">POSITIONS: NO_DATA · ALLOCATION: NO_DATA · PERFORMANCE: NO_DATA</p>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. EncyclopediaWorld — the canonical taxonomy, surfaced (v136,
 * 2026-11-23, owner: "do all" on the 60-backbone audit). The records
 * below are generated mechanically from the frozen canonical data
 * files (src/encyclopedia-data.ts) — nothing retyped, nothing
 * invented. All 826 records are UNVERIFIED (TAXONOMY_IMPORTED is an
 * import status, not verification). Action and Sub-Action levels
 * honestly hold ZERO records — that depth does not exist yet.
 * ============================================================================ */
const DRILL_LEVELS: { label: string; count: number; note: string }[] = [
  { label: 'Family', count: ENCYCLOPEDIA_COUNTS.families, note: 'BATCH A · IMPORTED' },
  { label: 'Major Activity', count: ENCYCLOPEDIA_COUNTS.majors, note: 'THE CANONICAL 60 BACKBONE' },
  { label: 'Type', count: ENCYCLOPEDIA_COUNTS.types, note: 'BATCH B · IMPORTED' },
  { label: 'Strategy', count: ENCYCLOPEDIA_COUNTS.strategies, note: 'BATCH B · IMPORTED' },
  { label: 'Action', count: ENCYCLOPEDIA_COUNTS.actions, note: 'NO RECORDS EXIST AT THIS DEPTH YET' },
  { label: 'Sub-Action', count: ENCYCLOPEDIA_COUNTS.subActions, note: 'NO RECORDS EXIST AT THIS DEPTH YET' },
];

const LEVEL_LABEL: Record<string, string> = {
  FAMILY: 'FAMILY',
  MAJOR_ACTIVITY: 'MAJOR ACTIVITY',
  TYPE: 'TYPE',
  STRATEGY: 'STRATEGY',
};

const ENTITY_REGISTRY_LABEL: Record<string, string> = {
  chains: 'NETWORKS',
  assets: 'ASSETS',
  protocols: 'PROTOCOLS',
};

export const EncyclopediaWorld: React.FC = () => {
  const [backboneQuery, setBackboneQuery] = useState('');
  const [indexQuery, setIndexQuery] = useState('');
  const [entityQuery, setEntityQuery] = useState('');
  const [expandedMajor, setExpandedMajor] = useState<string | null>(null);

  const familyTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of ENCYCLOPEDIA_FAMILIES) map.set(f.id, f.title);
    return map;
  }, []);
  const entryTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of ENCYCLOPEDIA_INDEX) map.set(e.id, e.title);
    return map;
  }, []);

  const backboneGroups = useMemo(() => {
    const q = backboneQuery.trim().toLowerCase();
    const groups = new Map<string, typeof CANONICAL_60>();
    for (const m of CANONICAL_60) {
      if (
        q &&
        !m.title.toLowerCase().includes(q) &&
        !(familyTitle.get(m.family) ?? '').toLowerCase().includes(q)
      ) {
        continue;
      }
      const list = groups.get(m.family) ?? [];
      list.push(m);
      groups.set(m.family, list);
    }
    return [...groups.entries()];
  }, [backboneQuery, familyTitle]);
  const backboneShown = backboneGroups.reduce((n, [, list]) => n + list.length, 0);

  const indexMatches = useMemo(() => {
    const q = indexQuery.trim().toLowerCase();
    if (!q) return [];
    return ENCYCLOPEDIA_INDEX.filter((e) => e.title.toLowerCase().includes(q)).slice(0, 50);
  }, [indexQuery]);

  // Drill-down (v139): Batch B records hang beneath the backbone by
  // their recorded parentRef — Types under a major, Strategies under
  // a Type or directly under a major. All links come from the frozen
  // data (the generator asserted 0 unresolved parents).
  const childrenOf = useMemo(() => {
    const map = new Map<string, typeof ENCYCLOPEDIA_INDEX>();
    for (const e of ENCYCLOPEDIA_INDEX) {
      if (!e.parent) continue;
      const list = map.get(e.parent) ?? [];
      list.push(e);
      map.set(e.parent, list);
    }
    return map;
  }, []);
  const majorChildren = useMemo(() => {
    const map = new Map<string, { types: typeof ENCYCLOPEDIA_INDEX; directStrategies: typeof ENCYCLOPEDIA_INDEX; strategyTotal: number }>();
    for (const m of CANONICAL_60) {
      const kids = childrenOf.get(m.id) ?? [];
      const types = kids.filter((k) => k.level === 'TYPE');
      const directStrategies = kids.filter((k) => k.level === 'STRATEGY');
      let strategyTotal = directStrategies.length;
      for (const t of types) {
        strategyTotal += (childrenOf.get(t.id) ?? []).filter((k) => k.level === 'STRATEGY').length;
      }
      map.set(m.id, { types, directStrategies, strategyTotal });
    }
    return map;
  }, [childrenOf]);

  const entityGroups = useMemo(() => {
    const q = entityQuery.trim().toLowerCase();
    const groups = new Map<string, typeof ENTITY_UNIVERSE>();
    for (const e of ENTITY_UNIVERSE) {
      if (q && !e.title.toLowerCase().includes(q) && !(e.symbol ?? '').toLowerCase().includes(q)) {
        continue;
      }
      const list = groups.get(e.registry) ?? [];
      list.push(e);
      groups.set(e.registry, list);
    }
    return [...groups.entries()];
  }, [entityQuery]);
  const entitiesShown = entityGroups.reduce((n, [, list]) => n + list.length, 0);

  return (
    <div className="space-y-5 text-white">
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CFF]/15 text-[#8B5CFF] border border-[#8B5CFF]/35">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Encyclopedia · Platform Brain</h2>
            <p className="text-xs text-[#B8B8B8]">
              6-Layer Taxonomy Drilldown (Family → Major Activity → Type → Strategy → Action → Sub-Action) &amp; World Engine Graph
            </p>
            <p className="text-xs text-[#B8B8B8] mt-0.5">
              {ENCYCLOPEDIA_COUNTS.total} canonical records, read from the frozen taxonomy data —
              all UNVERIFIED. TAXONOMY_IMPORTED is an import status, not external verification.
            </p>
          </div>
        </div>
      </div>

      {/* 6-Level Structure — real recorded counts per level */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DRILL_LEVELS.map((lvl) => (
          <div key={lvl.label} className="rounded-2xl border border-white/10 bg-[#101010] p-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#00B7FF]">{lvl.label}</div>
            <p className="font-mono text-2xl font-bold text-white">{lvl.count}</p>
            <p className="mt-1 text-[11px] font-mono text-[#B8B8B8]">{lvl.note}</p>
          </div>
        ))}
      </div>

      {/* THE 60 BACKBONE — the Canonical 60 Major Activities, grouped
          by their recorded primary family. */}
      <div className="space-y-4 rounded-2xl border border-[#00B7FF]/25 bg-[#101010] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold">THE 60 BACKBONE — CANONICAL MAJOR ACTIVITIES</h3>
            <p className="mt-0.5 font-mono text-[10px] text-[#B8B8B8]">
              {backboneShown} OF 60 SHOWN · GROUPED BY PRIMARY FAMILY · EVERY RECORD UNVERIFIED
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#B8B8B8]" />
            <input
              type="text"
              value={backboneQuery}
              onChange={(e) => setBackboneQuery(e.target.value)}
              placeholder="Filter the 60 backbone..."
              className="w-full rounded-lg border border-white/15 bg-[#050505] py-1.5 pl-8 pr-3 text-xs text-white placeholder-[#B8B8B8]/60 focus:border-[#00B7FF] focus:outline-none"
            />
          </div>
        </div>
        {backboneGroups.length === 0 && (
          <p className="font-mono text-[11px] text-[#B8B8B8]">NO BACKBONE RECORD MATCHES THAT FILTER.</p>
        )}
        {backboneGroups.map(([familyId, majors]) => (
          <div key={familyId} className="space-y-2">
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#00B7FF]">
              <span className="font-semibold">{(familyTitle.get(familyId) ?? familyId).toUpperCase()}</span>
              <span className="text-[#B8B8B8]">· {majors.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {majors.map((m) => (
                <div key={m.id} className="space-y-1.5 rounded-lg border border-white/10 bg-[#151515] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-white">{m.title}</span>
                    <span className="shrink-0 rounded border border-white/15 bg-[#050505] px-1.5 py-0.5 font-mono text-[9px] text-[#B8B8B8]">
                      UNVERIFIED
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#B8B8B8]">{m.definition}</p>
                  <p className="font-mono text-[9px] text-[#B8B8B8]">WORKSPACE (RECORDED): {m.workspace}</p>
                  {(() => {
                    const kids = majorChildren.get(m.id);
                    if (!kids || (kids.types.length === 0 && kids.directStrategies.length === 0)) {
                      return (
                        <p className="font-mono text-[9px] text-[#B8B8B8]">
                          TYPES: 0 · STRATEGIES: 0 — NO BATCH B RECORDS UNDER THIS ACTIVITY
                        </p>
                      );
                    }
                    const isOpen = expandedMajor === m.id;
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => setExpandedMajor(isOpen ? null : m.id)}
                          aria-expanded={isOpen}
                          className="flex min-h-[44px] w-full items-center justify-between rounded border border-[#00B7FF]/40 bg-[#050505] px-2 font-mono text-[9px] text-white"
                        >
                          <span>
                            TYPES: {kids.types.length} · STRATEGIES: {kids.strategyTotal}
                          </span>
                          <span className="text-[#00B7FF]">{isOpen ? 'HIDE' : 'DRILL DOWN'}</span>
                        </button>
                        {isOpen && (
                          <div className="max-h-64 space-y-2 overflow-y-auto rounded border border-white/10 bg-[#050505] p-2">
                            {kids.types.map((t) => {
                              const tStrategies = (childrenOf.get(t.id) ?? []).filter(
                                (k) => k.level === 'STRATEGY',
                              );
                              return (
                                <div key={t.id} className="space-y-1">
                                  <p className="font-mono text-[10px] text-white">
                                    <span className="text-[#00B7FF]">TYPE</span> · {t.title}
                                  </p>
                                  {tStrategies.map((s) => (
                                    <p key={s.id} className="pl-3 font-mono text-[10px] text-[#B8B8B8]">
                                      <span className="text-[#8B5CFF]">STRATEGY</span> · {s.title}
                                    </p>
                                  ))}
                                </div>
                              );
                            })}
                            {kids.directStrategies.length > 0 && (
                              <div className="space-y-1">
                                <p className="font-mono text-[10px] text-[#00B7FF]">
                                  STRATEGIES RECORDED DIRECTLY UNDER THIS ACTIVITY
                                </p>
                                {kids.directStrategies.map((s) => (
                                  <p key={s.id} className="pl-3 font-mono text-[10px] text-[#B8B8B8]">
                                    <span className="text-[#8B5CFF]">STRATEGY</span> · {s.title}
                                  </p>
                                ))}
                              </div>
                            )}
                            <p className="font-mono text-[8px] text-[#B8B8B8]">
                              ALL RECORDS UNVERIFIED · ACTION LEVEL BELOW THIS: 0 RECORDS EXIST
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FULL INDEX — search across all 826 canonical records */}
      <div className="space-y-3 rounded-2xl border border-white/10 bg-[#101010] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold">FULL INDEX — {ENCYCLOPEDIA_COUNTS.total} RECORDS</h3>
            <p className="mt-0.5 font-mono text-[10px] text-[#B8B8B8]">
              FAMILIES · MAJOR ACTIVITIES · TYPES · STRATEGIES — SEARCH BY NAME
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#B8B8B8]" />
            <input
              type="text"
              value={indexQuery}
              onChange={(e) => setIndexQuery(e.target.value)}
              placeholder="Search all 826 records..."
              className="w-full rounded-lg border border-white/15 bg-[#050505] py-1.5 pl-8 pr-3 text-xs text-white placeholder-[#B8B8B8]/60 focus:border-[#00B7FF] focus:outline-none"
            />
          </div>
        </div>
        {indexQuery.trim() === '' ? (
          <p className="font-mono text-[11px] text-[#B8B8B8]">
            TYPE TO SEARCH — RESULTS SHOW THE RECORD&apos;S LEVEL AND ITS RECORDED PARENT.
          </p>
        ) : indexMatches.length === 0 ? (
          <p className="font-mono text-[11px] text-[#B8B8B8]">NO RECORD MATCHES THAT SEARCH.</p>
        ) : (
          <div className="space-y-1.5">
            {indexMatches.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#151515] px-3 py-2"
              >
                <span className="text-xs font-semibold text-white">{e.title}</span>
                <span className="flex items-center gap-2 font-mono text-[9px] text-[#B8B8B8]">
                  <span className="rounded border border-white/15 bg-[#050505] px-1.5 py-0.5">
                    {LEVEL_LABEL[e.level] ?? e.level}
                  </span>
                  {e.parent && <span>UNDER: {(entryTitle.get(e.parent) ?? e.parent).toUpperCase()}</span>}
                  <span>UNVERIFIED</span>
                </span>
              </div>
            ))}
            <p className="font-mono text-[9px] text-[#B8B8B8]">SHOWING UP TO 50 MATCHES.</p>
          </div>
        )}
      </div>

      {/* ENTITY UNIVERSE — the 48 canonical entities (owner-frozen
          Batches 1 + 2), generated from the frozen entity files.
          Identity fields are exactly what the frozen records carry;
          every entity is UNVERIFIED. */}
      <div className="space-y-4 rounded-2xl border border-white/10 bg-[#101010] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold">ENTITY UNIVERSE — {ENTITY_COUNTS.total} CANONICAL ENTITIES</h3>
            <p className="mt-0.5 font-mono text-[10px] text-[#B8B8B8]">
              {entitiesShown} OF {ENTITY_COUNTS.total} SHOWN · NETWORKS {ENTITY_COUNTS.chains} · ASSETS{' '}
              {ENTITY_COUNTS.assets} · PROTOCOLS {ENTITY_COUNTS.protocols} · ALL UNVERIFIED
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#B8B8B8]" />
            <input
              type="text"
              value={entityQuery}
              onChange={(e) => setEntityQuery(e.target.value)}
              placeholder="Filter entities..."
              className="w-full rounded-lg border border-white/15 bg-[#050505] py-1.5 pl-8 pr-3 text-xs text-white placeholder-[#B8B8B8]/60 focus:border-[#00B7FF] focus:outline-none"
            />
          </div>
        </div>
        {entityGroups.length === 0 && (
          <p className="font-mono text-[11px] text-[#B8B8B8]">NO ENTITY MATCHES THAT FILTER.</p>
        )}
        {entityGroups.map(([registry, entities]) => (
          <div key={registry} className="space-y-2">
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#00B7FF]">
              <span className="font-semibold">{ENTITY_REGISTRY_LABEL[registry] ?? registry.toUpperCase()}</span>
              <span className="text-[#B8B8B8]">· {entities.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {entities.map((e) => (
                <div key={e.id} className="space-y-1.5 rounded-lg border border-white/10 bg-[#151515] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-white">
                      {e.title}
                      {e.formerName && (
                        <span className="ml-1.5 font-mono text-[9px] font-normal text-[#B8B8B8]">
                          FORMERLY {e.formerName.toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 rounded border border-white/15 bg-[#050505] px-1.5 py-0.5 font-mono text-[9px] text-[#B8B8B8]">
                      UNVERIFIED
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#B8B8B8]">{e.definition}</p>
                  <p className="font-mono text-[9px] text-[#B8B8B8]">
                    {e.symbol && <>SYMBOL (RECORDED): {e.symbol} · </>}
                    {typeof e.chainId === 'number' && <>CHAIN ID (RECORDED): {e.chainId} · </>}
                    {e.activityRefs && <>BACKBONE ACTIVITIES LINKED: {e.activityRefs.length} · </>}
                    {e.networkRefs && <>NETWORKS LINKED: {e.networkRefs.length} · </>}
                    SOURCE BATCH: {e.batch.toUpperCase()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          THE ENTITY UNIVERSE STAYS CONTINUOUSLY EXPANDABLE THROUGH THE GOVERNED PIPELINE
          (CANDIDATE → OWNER FREEZE → IMPORT). DISCOVERY IS NOT VERIFICATION, AND NO ENTITY
          RECORD AUTHORIZES ANY FINANCIAL ACTION.
        </p>
      </div>

      {/* World Engine Relationships — recorded counts; the graph
          browser itself is not part of this app yet. */}
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
        <h3 className="text-sm font-semibold mb-3">World Engine Relationships</h3>
        <p className="font-mono text-[11px] text-[#B8B8B8]">
          RECORDED IN THE PLATFORM WORLD ENGINE: 957 NODES · 1007 RELATIONSHIPS · 0 UNRESOLVED.
        </p>
        <p className="mt-1 text-xs text-[#B8B8B8]">
          The interactive graph browser is not part of this app yet — no live feed, bot, risk gate,
          or settlement link is claimed here.
        </p>
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. SecurityWorld — structure kept; every claimed fact replaced with an
 * honest state. No key count, encryption claim, incident count, audit
 * entry, device, or permission is asserted without a live source.
 * ============================================================================ */
const SEC_TABS = [
  'Security Dashboard',
  'Permissions',
  'Audit Logs',
  'Bot Permissions',
  'Devices',
  'Privacy',
] as const;
type SecTab = (typeof SEC_TABS)[number];

export const SecurityWorld: React.FC = () => {
  const [tab, setTab] = useState<SecTab>('Security Dashboard');
  const [killSwitches, setKillSwitches] = useState<Record<string, boolean>>({
    allExecution: false,
    railATransfer: true,
    botAutonomy: false,
  });

  const toggleSwitch = (key: string) => {
    setKillSwitches((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-5 text-white">
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/35">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Security World &amp; Governance</h2>
            <p className="text-xs text-[#B8B8B8]">
              Security Dashboard, Permissions, Audit Logs, Bot Permissions, Devices, Privacy &amp; Emergency Kill Switches
            </p>
            <p className="text-xs text-[#B8B8B8] mt-0.5">
              Execution is DISABLED by design. Security state below is NOT_CONNECTED / NO_DATA unless a live
              source is attached.
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {SEC_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === t
                  ? 'bg-[#00B7FF] text-black font-semibold'
                  : 'bg-[#151515] text-[#B8B8B8] hover:bg-[#202020] hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* #FF3B30 Emergency Kill Switches */}
      <div
        className="rounded-2xl border p-5"
        style={{
          backgroundColor: 'rgba(255, 59, 48, 0.10)',
          borderColor: '#FF3B30',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertOctagon className="h-5 w-5 text-[#FF3B30]" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#FF3B30]">
            Emergency Kill Switches (#FF3B30)
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { key: 'allExecution', label: 'Halt All Order Execution', desc: 'Execution is already disabled by design' },
            { key: 'railATransfer', label: 'Lock RAIL-A USD/JPY', desc: 'Enforce Read-Only on RAIL-A' },
            { key: 'botAutonomy', label: 'Revoke Bot Autonomy', desc: 'No worker runtime is live in this build' },
          ].map((sw) => {
            const engaged = killSwitches[sw.key];
            return (
              <div key={sw.key} className="flex items-center justify-between rounded-xl border border-[#FF3B30]/40 bg-[#101010] p-3.5">
                <div>
                  <div className="text-xs font-semibold text-white">{sw.label}</div>
                  <div className="text-[11px] text-[#B8B8B8]">{sw.desc}</div>
                </div>
                <button
                  onClick={() => toggleSwitch(sw.key)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                    engaged
                      ? 'bg-[#FF3B30] text-white'
                      : 'bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/40 hover:bg-[#FF3B30]/25'
                  }`}
                >
                  <Power className="h-3.5 w-3.5" />
                  {engaged ? 'ENGAGED' : 'ARMED'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Security Section */}
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 text-xs">
        <div className="text-sm font-semibold mb-3">{tab}</div>
        {tab === 'Security Dashboard' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#151515] p-3.5">Hardware Keys: <strong>NO_DATA</strong></div>
            <div className="rounded-xl bg-[#151515] p-3.5">Session Encryption: <strong>NO_DATA</strong></div>
            <div className="rounded-xl bg-[#151515] p-3.5">Active Incidents: <strong>NO_DATA</strong></div>
          </div>
        )}
        {tab === 'Permissions' && (
          <div className="flex items-center gap-2 text-[#B8B8B8]">
            <Key className="h-4 w-4 text-[#00B7FF]" /> Permissions: NO_DATA — no role or multi-sig state is claimed without a live source.
          </div>
        )}
        {tab === 'Audit Logs' && (
          <div className="text-[#B8B8B8]">Audit logs: NO_DATA — no log entries are claimed in this build.</div>
        )}
        {tab === 'Bot Permissions' && (
          <div className="flex items-center gap-2 text-[#B8B8B8]">
            <Bot className="h-4 w-4 text-[#8B5CFF]" /> Bot permissions: NO_DATA — no worker runtime is live; execution is disabled by design.
          </div>
        )}
        {tab === 'Devices' && (
          <div className="flex items-center gap-2 text-[#B8B8B8]">
            <Smartphone className="h-4 w-4 text-[#00B7FF]" /> Devices: NO_DATA — no trusted device is claimed.
          </div>
        )}
        {tab === 'Privacy' && (
          <div className="flex items-center gap-2 text-[#B8B8B8]">
            <Lock className="h-4 w-4 text-[#32D74B]" /> Privacy: NO_DATA — no telemetry mode is claimed.
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 5. SettingsWorld — local UI preferences only; no live claims.
 * ============================================================================ */
const SETTINGS_TABS = [
  'Appearance Studio',
  'Voice',
  'Notifications',
  'Layout Controls',
  'Accessibility',
] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

export const SettingsWorld: React.FC = () => {
  const [tab, setTab] = useState<SettingsTab>('Appearance Studio');
  const [accent, setAccent] = useState<string>('#00B7FF');
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  return (
    <div className="space-y-5 text-white">
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00B7FF]/15 text-[#00B7FF] border border-[#00B7FF]/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Settings &amp; Appearance Studio</h2>
            <p className="text-xs text-[#B8B8B8]">
              Appearance Studio, Voice, Notifications, Layout Controls &amp; Accessibility
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {SETTINGS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === t
                  ? 'bg-[#00B7FF] text-black font-semibold'
                  : 'bg-[#151515] text-[#B8B8B8] hover:bg-[#202020] hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 text-xs">
        {tab === 'Appearance Studio' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Palette className="h-4 w-4 text-[#00B7FF]" /> Cockpit Accent Token
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Electric Cyan', hex: '#00B7FF' },
                { name: 'Sovereign Violet', hex: '#8B5CFF' },
                { name: 'Terminal Green', hex: '#32D74B' },
              ].map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setAccent(c.hex)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                    accent === c.hex ? 'border-white bg-[#202020]' : 'border-white/10 bg-[#151515]'
                  }`}
                >
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.hex }} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'Voice' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-[#00B7FF]" />
              <span>STAR Neural Voice Briefings</span>
            </div>
            <button
              onClick={() => setVoiceEnabled((v) => !v)}
              className={`rounded-lg px-3 py-1.5 font-semibold ${
                voiceEnabled ? 'bg-[#32D74B]/20 text-[#32D74B]' : 'bg-[#202020] text-[#B8B8B8]'
              }`}
            >
              {voiceEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>
        )}

        {tab === 'Notifications' && (
          <div className="flex items-center gap-2 text-[#B8B8B8]">
            <Bell className="h-4 w-4 text-[#FFB800]" /> Critical Alerts (#FF3B30): Push + In-Cockpit Toast.
          </div>
        )}

        {tab === 'Layout Controls' && (
          <div className="flex items-center gap-2 text-[#B8B8B8]">
            <Layout className="h-4 w-4 text-[#00B7FF]" /> Persistent OS Shell with Floating Window Manager &amp; View Modes (Standard | Advanced | All).
          </div>
        )}

        {tab === 'Accessibility' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Accessibility className="h-4 w-4 text-[#00B7FF]" />
              <span>Reduced Motion &amp; High-Contrast Borders</span>
            </div>
            <button
              onClick={() => setReducedMotion((v) => !v)}
              className={`rounded-lg px-3 py-1.5 font-semibold ${
                reducedMotion ? 'bg-[#00B7FF] text-black' : 'bg-[#202020] text-[#B8B8B8]'
              }`}
            >
              {reducedMotion ? 'Active' : 'Standard'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
