import React, { useEffect, useMemo, useState } from 'react';
import {
  Accessibility,
  AlertOctagon,
  AlertTriangle,
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
import {
  ALERT_SEVERITIES,
  ALERT_TRANSITIONS,
  SECURITY_DOMAINS,
  alertCounts,
  createAlert,
  loadAngelStore,
  transitionAlert,
  type AlertState,
} from '../angel-security';
import { PROXY_ACTIONS, PROXY_ENV_NAMES, PROXY_METHOD, PROXY_PROVIDERS } from '../security-posture-data';
import { RESOURCE_PROVIDERS } from '../resource-catalog-data';
import {
  POSITION_STATUSES,
  POSITION_TYPES,
  computedPnl,
  loadPositions,
  makePositionId,
  savePositions,
  tokenBalanceFor,
  validatePosition,
  type MoneyRecord,
  type PositionRecord,
} from '../positions';
import { RISK_DIMENSIONS } from '../cost-risk-data';
import {
  loadSimulations,
  saveSimulations,
  simulate,
  type SimulationRecord,
} from '../simulator';

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

/* Owner opportunity intake (v145) — the React surface of the SAME
 * record system the Copilot-era shell built (js/opportunity-
 * intelligence.js + js/modules/opportunities.js): same localStorage
 * key (mti6_opportunities_v1), same record shape, same 10-stage
 * pipeline ending at PREPARED, same rules — numeric return fields
 * and risk scores are FORBIDDEN in opportunity records; a return
 * story is descriptive words plus its source, or nothing. Records
 * are owner-entered and UNVERIFIED; there is no feed and nothing
 * here executes. */
const OPP_STORE_KEY = 'mti6_opportunities_v1';
const OPP_STAGES = [
  'DISCOVERED',
  'IDENTIFIED',
  'DATA_VERIFIED',
  'RISK_ANALYZED',
  'DEPENDENCIES_CHECKED',
  'FRESHNESS_CHECKED',
  'SIMULATED',
  'RANKED',
  'RECOMMENDED',
  'PREPARED',
] as const;

interface OppRecord {
  id: string;
  title: string;
  assetRef: { assetClassId: string; chain: string };
  networkRef: { networkId: string };
  majorActivityId: string;
  typeId: string;
  strategyId: string;
  source: string;
  verificationStatus: string;
  pipelineState: string;
  protocolRef?: { name: string; source: string };
  returnSource?: { description: string; source: string };
}

function loadOppRecords(): OppRecord[] {
  try {
    const raw = localStorage.getItem(OPP_STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OppRecord[]) : [];
  } catch {
    return [];
  }
}

function saveOppRecords(records: OppRecord[]): void {
  try {
    localStorage.setItem(OPP_STORE_KEY, JSON.stringify(records));
  } catch {
    /* storage unavailable — records stay in memory for this session */
  }
}

const oppSlug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'untitled';

const oppInputCls =
  'h-9 w-full rounded-lg border border-white/15 bg-[#050505] px-2.5 text-xs text-white outline-none placeholder:text-[#B8B8B8]/60 focus:border-[#00B7FF]';

export const OpportunitiesWorld: React.FC = () => {
  const [tab, setTab] = useState<OppTab>('Feed');
  const [records, setRecords] = useState<OppRecord[]>(() => loadOppRecords());
  const [fTitle, setFTitle] = useState('');
  const [fMajor, setFMajor] = useState('');
  const [fAssetClass, setFAssetClass] = useState('');
  const [fChain, setFChain] = useState('');
  const [fNetwork, setFNetwork] = useState('');
  const [fProtocol, setFProtocol] = useState('');
  const [fProtocolSource, setFProtocolSource] = useState('');
  const [fReturnDesc, setFReturnDesc] = useState('');
  const [fReturnSource, setFReturnSource] = useState('');
  const [formMsg, setFormMsg] = useState('');

  const persist = (next: OppRecord[]) => {
    setRecords(next);
    saveOppRecords(next);
  };

  const submitOpp = () => {
    const title = fTitle.trim();
    if (!title) return setFormMsg('Not recorded: a title is required.');
    if (fProtocol.trim() && !fProtocolSource.trim())
      return setFormMsg('Not recorded: a protocol source is required when a protocol is named.');
    if (fReturnDesc.trim() && !fReturnSource.trim())
      return setFormMsg('Not recorded: the return description needs its source.');
    const base = `opp-${oppSlug(title)}`;
    let id = base;
    let n = 2;
    while (records.some((r) => r.id === id)) id = `${base}-${n++}`;
    const rec: OppRecord = {
      id,
      title,
      assetRef: { assetClassId: fAssetClass.trim(), chain: fChain.trim() },
      networkRef: { networkId: fNetwork.trim() },
      majorActivityId: fMajor,
      typeId: '',
      strategyId: '',
      source: 'owner-entered',
      verificationStatus: 'UNVERIFIED',
      pipelineState: 'DISCOVERED',
    };
    if (fProtocol.trim())
      rec.protocolRef = { name: fProtocol.trim(), source: fProtocolSource.trim() };
    if (fReturnDesc.trim())
      rec.returnSource = { description: fReturnDesc.trim(), source: fReturnSource.trim() };
    persist([rec, ...records]);
    setFormMsg(`Recorded at DISCOVERED (UNVERIFIED) — id ${id}.`);
    setFTitle('');
    setFProtocol('');
    setFProtocolSource('');
    setFReturnDesc('');
    setFReturnSource('');
  };

  /* CRYPTO SIMULATOR (v160; CW-9 / directive §67 / canonical
   * §99-19): creating a simulation is the ONLY way a record
   * reaches SIMULATED — the manual advance below refuses that
   * step, exactly as the canonical module refuses it. */
  const [simulations, setSimulations] = useState<SimulationRecord[]>(() => loadSimulations());
  const [simFor, setSimFor] = useState('');
  const [simAmount, setSimAmount] = useState('');
  const [simCurrency, setSimCurrency] = useState('USD');
  const [simGateMsg, setSimGateMsg] = useState('');

  const runSimulation = (r: OppRecord) => {
    const sim = simulate(r, simAmount, simCurrency);
    const nextSims = [sim, ...simulations];
    setSimulations(nextSims);
    saveSimulations(nextSims);
    const simIdx = OPP_STAGES.indexOf('SIMULATED');
    const curIdx = OPP_STAGES.indexOf(r.pipelineState as (typeof OPP_STAGES)[number]);
    if (curIdx >= 0 && curIdx < simIdx) {
      persist(records.map((x) => (x.id === r.id ? { ...x, pipelineState: 'SIMULATED' } : x)));
    }
    setSimFor('');
    setSimAmount('');
    setSimGateMsg('');
  };

  const advanceOpp = (id: string) => {
    const target = records.find((r) => r.id === id);
    if (!target) return;
    const i = OPP_STAGES.indexOf(target.pipelineState as (typeof OPP_STAGES)[number]);
    if (i >= 0 && i < OPP_STAGES.length - 1 && OPP_STAGES[i + 1] === 'SIMULATED') {
      setSimGateMsg(id);
      return;
    }
    setSimGateMsg('');
    persist(
      records.map((r) => {
        if (r.id !== id) return r;
        const j = OPP_STAGES.indexOf(r.pipelineState as (typeof OPP_STAGES)[number]);
        if (j < 0 || j >= OPP_STAGES.length - 1) return r;
        return { ...r, pipelineState: OPP_STAGES[j + 1] };
      }),
    );
  };

  const removeOpp = (id: string) => persist(records.filter((r) => r.id !== id));

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
          {records.length} owner-entered record{records.length === 1 ? '' : 's'}. No score, APY, or
          STAR verification is claimed for any of them — the discovery feed is NOT_CONNECTED; records
          below exist only because the owner entered them.
        </p>
        <p className="text-xs font-mono text-[#B8B8B8]">
          OPPORTUNITIES: {records.length} RECORDS · FEED: NOT_CONNECTED · PIPELINE TERMINAL: PREPARED
          · EXECUTION: DISABLED
        </p>
        <div className="flex items-center gap-2 text-xs text-[#B8B8B8]">
          <MapPin className="h-3.5 w-3.5" /> A record carries a location only when the owner entered
          one — none is inferred.
        </div>
      </div>

      {/* OWNER INTAKE — record at DISCOVERED */}
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-3">
        <h3 className="text-sm font-semibold">OWNER INTAKE — RECORD AN OPPORTUNITY</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Title — e.g. USDC lending on Aave (Ethereum)" aria-label="Opportunity title" className={oppInputCls} />
          <select value={fMajor} onChange={(e) => setFMajor(e.target.value)} aria-label="Major activity" className={oppInputCls}>
            <option value="">Major activity (optional) — pick from the 60 backbone</option>
            {CANONICAL_60.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
          <input value={fAssetClass} onChange={(e) => setFAssetClass(e.target.value)} placeholder="Asset class id — e.g. stablecoin (optional)" aria-label="Asset class" className={oppInputCls} />
          <input value={fChain} onChange={(e) => setFChain(e.target.value)} placeholder="Chain / network name — e.g. Ethereum (optional)" aria-label="Chain name" className={oppInputCls} />
          <input value={fNetwork} onChange={(e) => setFNetwork(e.target.value)} placeholder="Network id — e.g. ethereum-mainnet (optional)" aria-label="Network id" className={oppInputCls} />
          <input value={fProtocol} onChange={(e) => setFProtocol(e.target.value)} placeholder="Protocol name (optional)" aria-label="Protocol name" className={oppInputCls} />
          <input value={fProtocolSource} onChange={(e) => setFProtocolSource(e.target.value)} placeholder="Protocol source (required if a protocol is named)" aria-label="Protocol source" className={oppInputCls} />
          <input value={fReturnDesc} onChange={(e) => setFReturnDesc(e.target.value)} placeholder="Why it pays, in words (optional) — numbers are not allowed in records" aria-label="Return description" className={oppInputCls} />
          <input value={fReturnSource} onChange={(e) => setFReturnSource(e.target.value)} placeholder="Where that description comes from (required with a description)" aria-label="Return source" className={oppInputCls} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submitOpp}
            className="flex min-h-[44px] items-center rounded-lg bg-[#00B7FF] px-4 text-xs font-semibold text-black"
          >
            RECORD AT DISCOVERED
          </button>
          {formMsg && <span className="font-mono text-[10px] text-[#B8B8B8]">{formMsg}</span>}
        </div>
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          RECORD RULES (FROM THE CANONICAL SYSTEM): NUMERIC RETURN FIELDS AND RISK SCORES ARE
          FORBIDDEN IN OPPORTUNITY RECORDS — A RETURN STORY IS WORDS PLUS ITS SOURCE. EVERY RECORD
          STARTS UNVERIFIED AT DISCOVERED AND CAN ADVANCE ONLY TO PREPARED. THE SIMULATED STAGE IS
          REACHED ONLY BY RUNNING A SIMULATION (SIMULATE ON A RECORD) — NEVER BY THE MANUAL
          ADVANCE. NOTHING EXECUTES.
        </p>
      </div>

      {/* RECORDED OPPORTUNITIES */}
      {records.length > 0 && (
        <div className="space-y-2">
          {records.map((r) => {
            const stageIdx = OPP_STAGES.indexOf(r.pipelineState as (typeof OPP_STAGES)[number]);
            const major = CANONICAL_60.find((m) => m.id === r.majorActivityId);
            return (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-[#101010] p-4 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{r.title}</span>
                  <span className="rounded border border-[#FFB020]/50 px-2 py-0.5 font-mono text-[9px] text-white">
                    {r.pipelineState} · UNVERIFIED
                  </span>
                </div>
                <p className="font-mono text-[10px] text-[#B8B8B8]">
                  {r.id}
                  {major ? ` · MAJOR: ${major.title}` : ''}
                  {r.assetRef.chain ? ` · CHAIN: ${r.assetRef.chain}` : ''}
                  {r.protocolRef ? ` · PROTOCOL: ${r.protocolRef.name}` : ''}
                </p>
                {r.returnSource && (
                  <p className="text-xs text-[#B8B8B8]">
                    Why it pays (recorded): {r.returnSource.description} — source: {r.returnSource.source}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {stageIdx >= 0 && stageIdx < OPP_STAGES.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => advanceOpp(r.id)}
                      className="flex min-h-[44px] items-center rounded-lg border border-[#00B7FF]/50 px-3 font-mono text-[10px] text-white"
                    >
                      ADVANCE → {OPP_STAGES[stageIdx + 1]}
                    </button>
                  ) : (
                    <span className="flex min-h-[44px] items-center font-mono text-[10px] text-[#32D74B]">
                      PREPARED — TERMINAL. EXECUTION IS DISABLED BY DESIGN.
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeOpp(r.id)}
                    className="flex min-h-[44px] items-center rounded-lg border border-white/15 px-3 font-mono text-[10px] text-[#B8B8B8]"
                  >
                    REMOVE RECORD
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimFor(simFor === r.id ? '' : r.id)}
                    className="flex min-h-[44px] items-center rounded-lg border border-[#8B5CFF]/60 px-3 font-mono text-[10px] text-white"
                  >
                    SIMULATE
                  </button>
                </div>
                {simGateMsg === r.id && (
                  <p className="font-mono text-[10px] text-[#FFB020]">
                    SIMULATED IS REACHED ONLY BY RUNNING A SIMULATION — THE CANONICAL RULE. USE
                    SIMULATE ON THIS RECORD.
                  </p>
                )}
                {simFor === r.id && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                      aria-label="Simulation amount assumption"
                      placeholder="Amount assumption — blank = UNKNOWN"
                      inputMode="decimal"
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      className="h-9 w-52 rounded-lg border border-white/15 bg-[#050505] px-2.5 text-xs text-white outline-none placeholder:text-[#B8B8B8]/60"
                    />
                    <input
                      aria-label="Simulation currency"
                      value={simCurrency}
                      onChange={(e) => setSimCurrency(e.target.value)}
                      className="h-9 w-20 rounded-lg border border-white/15 bg-[#050505] px-2.5 text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => runSimulation(r)}
                      className="flex min-h-[44px] items-center rounded-lg bg-[#8B5CFF] px-3 font-mono text-[10px] font-semibold text-white"
                    >
                      RUN SIMULATION
                    </button>
                  </div>
                )}
                {simulations
                  .filter((s) => s.opportunityId === r.id)
                  .map((s) => (
                    <div key={s.id} className="rounded-lg border border-[#8B5CFF]/30 bg-[#151515] px-3 py-2 space-y-1">
                      <p className="font-mono text-[10px] text-white">
                        SIMULATION · SIMULATED — NOT EXECUTED · SIMULATION_ONLY ·{' '}
                        {new Date(s.createdAt).toLocaleString()}
                      </p>
                      <p className="font-mono text-[10px] text-[#B8B8B8]">
                        ASSUMED AMOUNT: {s.inputs.amount} {s.inputs.currency} · PRICES:{' '}
                        {s.pricesUsed.state} · COSTS: {s.costsUsed.state} (ALL{' '}
                        {s.unknownCosts.length} KINDS UNKNOWN) · EXPECTED OUTCOME:{' '}
                        {s.expectedOutcome.state} — EXPECTED NET IS NULL WHILE THE GROSS OR ANY
                        REQUIRED COST IS UNKNOWN.
                      </p>
                      <p className="font-mono text-[9px] text-[#B8B8B8]">
                        A SIMULATION WRITES NOTHING INTO POSITIONS OR EARNINGS AND EXECUTES
                        NOTHING.
                      </p>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 2. PositionsAssetsWorld — honest: every value UNAVAILABLE, never zero.
 * No net worth, allocation, PnL, or Sharpe figure is claimed.
 * ============================================================================ */

/* OWNER POSITION RECORDS (v159; CW-0 Gap 8) — the surface of the
 * canonical Position Intelligence contract (mirrored in
 * src/positions.ts). The connected-feed state above stays
 * UNAVAILABLE / NO_DATA: these are the owner's own recorded
 * positions, a separate record system. References are recorded,
 * never verified here (UNVERIFIED); money is sourced-or-UNKNOWN;
 * P/L is computed only from same-currency sourced inputs. */
const MONEY_FIELDS = [
  { key: 'size', label: 'SIZE' },
  { key: 'costBasis', label: 'COST BASIS' },
  { key: 'currentValue', label: 'CURRENT VALUE' },
  { key: 'fees', label: 'FEES' },
] as const;
type MoneyKey = (typeof MONEY_FIELDS)[number]['key'];
type MoneyDraft = Record<MoneyKey, { value: string; currency: string; source: string }>;
const emptyMoneyDraft = (): MoneyDraft => ({
  size: { value: '', currency: 'USD', source: '' },
  costBasis: { value: '', currency: 'USD', source: '' },
  currentValue: { value: '', currency: 'USD', source: '' },
  fees: { value: '', currency: 'USD', source: '' },
});
const fmtMoney = (m: MoneyRecord | null): string =>
  m ? `${m.value} ${m.currency} · src: ${m.source}` : 'UNKNOWN';

const PositionRecordsSection: React.FC = () => {
  const [records, setRecords] = useState<PositionRecord[]>(() => loadPositions());
  const [walletId, setWalletId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [networkId, setNetworkId] = useState('');
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [protocolId, setProtocolId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [type, setType] = useState<string>('staking');
  const [status, setStatus] = useState<string>('OPEN');
  const [money, setMoney] = useState<MoneyDraft>(emptyMoneyDraft);
  const [riskDims, setRiskDims] = useState<string[]>([]);
  const [riskNote, setRiskNote] = useState('');
  const [error, setError] = useState('');

  const chains = ENTITY_UNIVERSE.filter((e) => e.registry === 'chains');
  const assets = ENTITY_UNIVERSE.filter((e) => e.registry === 'assets');
  const protocols = ENTITY_UNIVERSE.filter((e) => e.registry === 'protocols');
  const inputCls =
    'rounded border border-white/15 bg-[#151515] px-2 py-1.5 text-xs text-white placeholder:text-[#777]';
  const toggleIn = (list: string[], v: string, set: (l: string[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const buildMoney = (d: { value: string; currency: string; source: string }): MoneyRecord | null => {
    if (d.value.trim() === '' && d.source.trim() === '') return null;
    return {
      value: Number(d.value),
      currency: d.currency.trim().toUpperCase(),
      source: d.source.trim(),
      checkedAt: new Date().toISOString(),
    };
  };

  const submit = () => {
    const rec: PositionRecord = {
      positionId: makePositionId(`${type}-${protocolId || 'position'}`),
      walletId: walletId.trim(),
      accountId: accountId.trim(),
      networkId,
      assetIds,
      protocolId,
      activityId,
      strategyId: null,
      type,
      status,
      size: buildMoney(money.size),
      costBasis: buildMoney(money.costBasis),
      currentValue: buildMoney(money.currentValue),
      fees: buildMoney(money.fees),
      risk: riskDims.length > 0 || riskNote.trim() ? { dimensions: riskDims, note: riskNote.trim() } : null,
      isTokenBalance: tokenBalanceFor(type),
      verificationStatus: 'UNVERIFIED',
      opportunityIds: [],
      createdAt: new Date().toISOString(),
    };
    const errors = validatePosition(rec);
    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }
    const next = [rec, ...records];
    setRecords(next);
    savePositions(next);
    setError('');
    setMoney(emptyMoneyDraft());
    setRiskDims([]);
    setRiskNote('');
  };

  const remove = (id: string) => {
    const next = records.filter((r) => r.positionId !== id);
    setRecords(next);
    savePositions(next);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">Owner Position Records</span>
        <span className="font-mono text-[10px] text-[#B8B8B8]">
          RECORDED: {records.length} · EVERY RECORD UNVERIFIED · NO FEED CONNECTED
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <input aria-label="Wallet reference" placeholder="Wallet reference (your label)" value={walletId} onChange={(e) => setWalletId(e.target.value)} className={inputCls} />
        <input aria-label="Account reference" placeholder="Account reference (your label)" value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls} />
        <select aria-label="Network" value={networkId} onChange={(e) => setNetworkId(e.target.value)} className={inputCls}>
          <option value="">Network — choose</option>
          {chains.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <select aria-label="Protocol" value={protocolId} onChange={(e) => setProtocolId(e.target.value)} className={inputCls}>
          <option value="">Protocol — choose</option>
          {protocols.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <select aria-label="Backbone activity" value={activityId} onChange={(e) => setActivityId(e.target.value)} className={inputCls}>
          <option value="">Backbone activity — choose</option>
          {CANONICAL_60.map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <select aria-label="Position type" value={type} onChange={(e) => setType(e.target.value)} className={`${inputCls} flex-1`}>
            {POSITION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select aria-label="Position status" value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} flex-1`}>
            {POSITION_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="mb-1 font-mono text-[10px] text-[#B8B8B8]">ASSETS (AT LEAST ONE)</p>
        <div className="flex flex-wrap gap-1.5">
          {assets.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => toggleIn(assetIds, a.id, setAssetIds)}
              className={`rounded border px-2 py-1 font-mono text-[9px] ${assetIds.includes(a.id) ? 'border-[#00B7FF] text-[#00B7FF]' : 'border-white/15 text-[#B8B8B8]'}`}
            >
              {a.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {MONEY_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-24 shrink-0 font-mono text-[10px] text-[#B8B8B8]">{label}</span>
            <input aria-label={`${label} value`} placeholder="value — blank = UNKNOWN" inputMode="decimal" value={money[key].value} onChange={(e) => setMoney({ ...money, [key]: { ...money[key], value: e.target.value } })} className={`${inputCls} w-28`} />
            <input aria-label={`${label} currency`} value={money[key].currency} onChange={(e) => setMoney({ ...money, [key]: { ...money[key], currency: e.target.value } })} className={`${inputCls} w-16`} />
            <input aria-label={`${label} source`} placeholder="source" value={money[key].source} onChange={(e) => setMoney({ ...money, [key]: { ...money[key], source: e.target.value } })} className={`${inputCls} flex-1`} />
          </div>
        ))}
      </div>

      <div>
        <p className="mb-1 font-mono text-[10px] text-[#B8B8B8]">RISK DIMENSIONS (OPTIONAL — DIMENSIONS ONLY, NEVER A SCORE)</p>
        <div className="flex flex-wrap gap-1.5">
          {RISK_DIMENSIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleIn(riskDims, d, setRiskDims)}
              className={`rounded border px-2 py-1 font-mono text-[9px] ${riskDims.includes(d) ? 'border-[#FFB020] text-[#FFB020]' : 'border-white/15 text-[#B8B8B8]'}`}
            >
              {d}
            </button>
          ))}
        </div>
        <input aria-label="Risk note" placeholder="Risk note (optional)" value={riskNote} onChange={(e) => setRiskNote(e.target.value)} className={`${inputCls} mt-2 w-full`} />
      </div>

      {error && <p className="font-mono text-[11px] text-[#FFB020]">{error}</p>}
      <button type="button" onClick={submit} className="rounded-lg bg-[#00B7FF] px-4 py-2 text-xs font-semibold text-black">
        RECORD POSITION
      </button>

      <div className="space-y-2">
        {records.length === 0 ? (
          <p className="font-mono text-[11px] text-[#B8B8B8]">
            NO POSITIONS RECORDED. NOTHING IS INVENTED TO FILL THIS LIST — RECORD ONE ABOVE, OR
            CONNECT A READ-ONLY FEED (NOT CONNECTED).
          </p>
        ) : (
          records.map((r) => {
            const pnl = computedPnl(r);
            return (
              <div key={r.positionId} className="rounded-lg bg-[#151515] px-3 py-2 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-white">
                    {r.type} · {r.status} · {r.networkId} · {r.protocolId}
                  </span>
                  <button type="button" onClick={() => remove(r.positionId)} className="font-mono text-[9px] text-[#FFB020]">
                    REMOVE RECORD
                  </button>
                </div>
                <p className="font-mono text-[10px] text-[#B8B8B8]">
                  WALLET {r.walletId} · ACCOUNT {r.accountId} · ASSETS {r.assetIds.join(', ')} · ACTIVITY {r.activityId} ·
                  TOKEN BALANCE: {r.isTokenBalance ? 'YES (PLAIN HOLDING)' : 'NO — A POSITION, NOT A BALANCE'} · UNVERIFIED
                </p>
                <p className="font-mono text-[10px] text-[#B8B8B8]">
                  SIZE {fmtMoney(r.size)} · COST BASIS {fmtMoney(r.costBasis)} · CURRENT VALUE {fmtMoney(r.currentValue)} ·
                  FEES {fmtMoney(r.fees)} · P/L {pnl ? `${pnl.value} ${pnl.currency} (computed from sourced inputs)` : 'UNKNOWN'}
                </p>
                {r.risk && (
                  <p className="font-mono text-[10px] text-[#B8B8B8]">
                    RISK: {r.risk.dimensions.join(', ') || 'NO DIMENSIONS RECORDED'}
                    {r.risk.note ? ` — ${r.risk.note}` : ''}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
        RECORDS MIRROR THE POSITION INTELLIGENCE CONTRACT AND PERSIST ONLY IN THIS BROWSER
        (mti6_positions_v1). A MONEY FIELD LEFT BLANK IS UNKNOWN — NEVER ZERO. P/L APPEARS ONLY
        WHEN COST BASIS AND CURRENT VALUE ARE BOTH SOURCED IN ONE CURRENCY. RECORDING A POSITION
        AUTHORIZES NOTHING AND MOVES NOTHING.
      </p>
    </div>
  );
};

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

      <PositionRecordsSection />
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

      {/* KNOWLEDGE GAPS (v144) — the gap surface the Copilot CW-0
          audit called for (§63): computed live from the canonical
          data in this app, never hand-listed. A gap is shown as a
          gap — nothing here fills, invents or authorizes anything;
          closing a data gap is a separate owner freeze decision. */}
      <div className="space-y-3 rounded-2xl border border-[#FFB020]/30 bg-[#101010] p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#FFB020]" />
          <h3 className="text-sm font-semibold">KNOWLEDGE GAPS — COMPUTED FROM THE CANONICAL DATA</h3>
        </div>
        {(() => {
          const zeroStrategyMajors = CANONICAL_60.filter(
            (m) => (majorChildren.get(m.id)?.strategyTotal ?? 0) === 0,
          );
          const familiesWithoutMajors = ENCYCLOPEDIA_FAMILIES.filter(
            (f) => !CANONICAL_60.some((m) => m.family === f.id),
          );
          const protocolsNoActivities = ENTITY_UNIVERSE.filter(
            (e) => e.registry === 'protocols' && (e.activityRefs?.length ?? 0) === 0,
          );
          return (
            <div className="space-y-2 font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
              <p>
                MAJORS WITH ZERO STRATEGIES RECORDED: {zeroStrategyMajors.length}
                {zeroStrategyMajors.length > 0 &&
                  ` — ${zeroStrategyMajors
                    .map((m) => `${m.title} (${majorChildren.get(m.id)?.types.length ?? 0} TYPES, 0 STRATEGIES)`)
                    .join(' · ')}`}
              </p>
              <p>
                FAMILIES WITH NO CANONICAL-60 MAJOR: {familiesWithoutMajors.length}
                {familiesWithoutMajors.length > 0 &&
                  ` — ${familiesWithoutMajors.map((f) => f.title).join(' · ')}`}
              </p>
              <p>
                PROTOCOLS WITH NO RECORDED BACKBONE ACTIVITIES: {protocolsNoActivities.length}
                {protocolsNoActivities.length > 0 &&
                  ` — ${protocolsNoActivities.map((e) => e.title).join(' · ')} (RECORDED AS EMPTY IN THE
                FROZEN BATCHES — INTENTIONAL IN THE SOURCE DATA)`}
              </p>
              <p>
                ACTION LEVEL: {ENCYCLOPEDIA_COUNTS.actions} RECORDS · SUB-ACTION LEVEL:{' '}
                {ENCYCLOPEDIA_COUNTS.subActions} RECORDS — THE HIERARCHY STOPS AT STRATEGY; BATCH C IS
                A SEPARATE OWNER FREEZE DECISION, NOT TAKEN.
              </p>
              <p className="text-white/60">
                GAPS ARE SURFACED, NEVER FILLED. NOTHING IN THIS PANEL AUTHORIZES NEW RECORDS.
              </p>
            </div>
          );
        })()}
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
  // Angel Security (v153) — canonical alert store
  // (mti6_angel_security_v1). Owner intake + lifecycle only;
  // there are no detectors behind this surface.
  const [angelStore, setAngelStore] = useState(() => loadAngelStore());
  const [alertDomain, setAlertDomain] = useState<string>(SECURITY_DOMAINS[0].id);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDesc, setAlertDesc] = useState('');
  const [alertSystem, setAlertSystem] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<string>('UNKNOWN');
  const [alertMsg, setAlertMsg] = useState('');
  const counts = alertCounts(angelStore.alerts);
  // API connections (v170) — live configured state read from the
  // gateway itself (gateway.status reports env PRESENCE only,
  // never a value). When the gateway can't be reached from here
  // (e.g. a local preview with no functions), the panel says so
  // instead of guessing a state.
  const [gatewayState, setGatewayState] = useState<{
    state: 'checking' | 'ok' | 'unreachable';
    configured: Record<string, boolean>;
  }>({ state: 'checking', configured: {} });
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch('/api/mti6', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'gateway.status' }),
        });
        const env = (await res.json().catch(() => null)) as
          | { ok?: boolean; data?: { providersConfigured?: Record<string, boolean> } }
          | null;
        if (!live) return;
        if (env?.ok && env.data?.providersConfigured) {
          setGatewayState({ state: 'ok', configured: env.data.providersConfigured });
        } else {
          setGatewayState({ state: 'unreachable', configured: {} });
        }
      } catch {
        if (live) setGatewayState({ state: 'unreachable', configured: {} });
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  const doCreateAlert = () => {
    const res = createAlert(angelStore, {
      domain: alertDomain,
      title: alertTitle,
      description: alertDesc,
      affectedSystem: alertSystem,
      severity: alertSeverity,
    });
    if (res.error) return setAlertMsg(res.error);
    setAngelStore(res.store);
    setAlertTitle('');
    setAlertDesc('');
    setAlertSystem('');
    setAlertMsg('');
  };
  const doTransitionAlert = (id: string, to: AlertState) => {
    const res = transitionAlert(angelStore, id, to);
    if (res.error) return setAlertMsg(res.error);
    setAngelStore(res.store);
    setAlertMsg('');
  };

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
            { key: 'botAutonomy', label: 'Revoke Bot Autonomy', desc: 'The in-page runtime runs research/check executors only — it holds no financial authority' },
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
            <Bot className="h-4 w-4 text-[#8B5CFF]" /> Bot permissions: the in-page runtime runs research/check executors only, while the app is open; financial execution is disabled by design.
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

      {/* ANGEL SECURITY (v153) — owner alert intake + lifecycle over
          the canonical store. No detectors: an alert exists only
          because the owner recorded it. New alerts start at
          DETECTED; transitions follow the canonical allowlist only,
          with the owner as the recorded actor. */}
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs text-[#FF3B30]">ANGEL SECURITY — OWNER ALERT INTAKE &amp; LIFECYCLE</span>
          <span className="font-mono text-[10px] text-[#B8B8B8]">
            ALERTS RECORDED: {angelStore.alerts.length}
            {Object.entries(counts).map(([s, n]) => ` · ${s}: ${n}`).join('')}
            {' '}· DETECTORS: NONE CONNECTED
          </span>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <select
            value={alertDomain}
            onChange={(e) => setAlertDomain(e.target.value)}
            aria-label="Alert domain"
            className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none focus:border-[#FF3B30]"
          >
            {SECURITY_DOMAINS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <select
            value={alertSeverity}
            onChange={(e) => setAlertSeverity(e.target.value)}
            aria-label="Alert severity"
            className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none focus:border-[#FF3B30]"
          >
            {ALERT_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            value={alertTitle}
            onChange={(e) => setAlertTitle(e.target.value)}
            placeholder="Alert title (required)"
            aria-label="Alert title"
            className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2.5 text-xs text-white outline-none placeholder:text-[#B8B8B8]/60 focus:border-[#FF3B30]"
          />
          <input
            value={alertSystem}
            onChange={(e) => setAlertSystem(e.target.value)}
            placeholder="Affected system (required) — e.g. wallet, star, crypto-world"
            aria-label="Affected system"
            className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2.5 text-xs text-white outline-none placeholder:text-[#B8B8B8]/60 focus:border-[#FF3B30]"
          />
          <input
            value={alertDesc}
            onChange={(e) => setAlertDesc(e.target.value)}
            placeholder="Description (required) — what was observed, in words"
            aria-label="Alert description"
            className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2.5 text-xs text-white outline-none placeholder:text-[#B8B8B8]/60 focus:border-[#FF3B30] md:col-span-2"
          />
        </div>
        <button
          type="button"
          onClick={doCreateAlert}
          className="flex min-h-[44px] items-center rounded-lg bg-[#FF3B30] px-4 text-xs font-semibold text-white"
        >
          RECORD ALERT AT DETECTED
        </button>
        {alertMsg && <p className="font-mono text-[10px] text-[#FFB020]">{alertMsg}</p>}

        {angelStore.alerts.length === 0 ? (
          <p className="font-mono text-[10px] text-[#B8B8B8]">
            NO ALERTS RECORDED — THE REGISTER IS EMPTY, NOT CLEAR. NO DETECTOR RUNS BEHIND THIS
            SURFACE, SO NOTHING IS INVENTED TO FILL IT.
          </p>
        ) : (
          <div className="space-y-2">
            {angelStore.alerts.map((a) => (
              <div key={a.id} className="rounded-lg border border-white/10 bg-[#050505] p-3 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white">{a.title}</span>
                  <span className="rounded border border-white/15 px-2 py-0.5 font-mono text-[9px] text-white">
                    {a.state} · {a.severity}
                  </span>
                </div>
                <p className="text-[11px] text-[#B8B8B8]">{a.description}</p>
                <p className="font-mono text-[9px] text-[#B8B8B8]">
                  {SECURITY_DOMAINS.find((d) => d.id === a.domain)?.label ?? a.domain} · SYSTEM {a.affectedSystem} ·
                  SOURCE {a.source} · DETECTED {a.detectedAt.slice(0, 10)} · {a.history.length} HISTORY ENTRIES
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ALERT_TRANSITIONS[a.state].map((to) => (
                    <button
                      key={to}
                      type="button"
                      onClick={() => doTransitionAlert(a.id, to)}
                      className="flex min-h-[44px] items-center rounded border border-white/15 px-2.5 font-mono text-[9px] text-[#B8B8B8] hover:text-white"
                    >
                      → {to}
                    </button>
                  ))}
                  {ALERT_TRANSITIONS[a.state].length === 0 && (
                    <span className="font-mono text-[9px] text-[#B8B8B8]">TERMINAL — NO FURTHER TRANSITIONS</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          ALERTS ARE OWNER RECORDS WITH PROVENANCE (SOURCE + DETECTED-AT). THERE IS NO DISMISSED
          STATE AND NO SHORTCUT PAST VERIFYING AND CONFIRMED. THE MAP TURNS RED ONLY FOR A
          CONFIRMED, ACTIVE ALERT — AN EMPTY REGISTER CLAIMS NOTHING.
        </p>
      </div>

      {/* API CONNECTIONS — THE PIPELINES (v170). Every provider
          the platform can use, what it unlocks, the NAME of the
          server variable that holds its key, and its LIVE
          configured state from the gateway. Values are never
          shown, never typed here, and never stored in the app —
          the owner adds them in Netlify; the gateway reports
          presence only. */}
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs text-[#00B7FF]">API CONNECTIONS — THE PIPELINES</span>
          <span className="font-mono text-[10px] text-[#B8B8B8]">
            {gatewayState.state === 'checking'
              ? 'CHECKING THE GATEWAY…'
              : gatewayState.state === 'ok'
                ? 'LIVE FROM GATEWAY.STATUS'
                : 'GATEWAY UNREACHABLE FROM HERE — STATE NOT GUESSED'}
          </span>
        </div>
        {[
          { id: 'star', name: 'STAR BRAIN (OPENROUTER)', unlocks: "STAR's live model answers, grounded in the platform's records", env: 'MTI6_STAR_API_KEY', cost: 'FREE_WITH_LIMITS' },
          { id: 'transitland', name: 'TRANSITLAND', unlocks: 'Transit stops + departures on the World Map', env: 'TRANSITLAND_API_KEY', cost: 'FREE_WITH_LIMITS' },
          { id: 'coingecko', name: 'COINGECKO (DEMO KEY)', unlocks: 'Keyed price pipeline through the gateway — higher limits; prices also flow keyless at public limits', env: 'MTI6_COINGECKO_API_KEY', cost: 'FREE_WITH_LIMITS' },
          { id: 'geoapify', name: 'GEOAPIFY', unlocks: 'Geocoding primary — GO TO PLACE on the World Map', env: 'MTI6_GEOAPIFY_KEY', cost: 'FREE_WITH_LIMITS' },
          { id: 'locationiq', name: 'LOCATIONIQ', unlocks: 'Geocoding fallback in the same chain', env: 'MTI6_LOCATIONIQ_KEY', cost: 'FREE_WITH_LIMITS' },
        ].map((p) => {
          const configured = gatewayState.configured[p.id];
          return (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 bg-[#050505] px-3 py-2">
              <div>
                <p className="font-mono text-[11px] text-white">{p.name}</p>
                <p className="font-mono text-[9px] text-[#B8B8B8]">
                  {p.unlocks} · ENV: {p.env} · {p.cost}
                </p>
              </div>
              <span
                className="rounded border px-2 py-0.5 font-mono text-[9px]"
                style={{
                  color: gatewayState.state !== 'ok' ? '#C8CFD8' : configured ? '#32D74B' : '#FFB020',
                  borderColor: 'rgba(255,255,255,0.15)',
                }}
              >
                {gatewayState.state !== 'ok' ? 'STATE UNKNOWN HERE' : configured ? 'KEY PRESENT ON SERVER' : 'NOT SET — OWNER ADDS IN NETLIFY'}
              </span>
            </div>
          );
        })}
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          HELD, NOT WIRED: MOBILITY DATABASE (REFRESH TOKEN IN THE OWNER'S ACCOUNT), HUGGING FACE
          (A FRESH TOKEN IS AN OWNER STEP), OPENAI (BILLING DECISION PENDING). PLANNED ONLY:
          MAPBOX / MAPTILER / CESIUM ION — REGISTERED AS CANDIDATES, NEVER CALLED. NOTHING
          AUTO-CONNECTS AND NOTHING IS PURCHASED.
        </p>
      </div>

      {/* PLATFORM SECURITY POSTURE (v154) — facts generated
          mechanically from the proxy source itself (its declared
          allowlist, providers, and the NAMES of the env vars it
          reads) plus credential-custody counts derived from the
          governed source catalog. No value is shown anywhere: a
          secret's existence and custody are the record, never the
          secret. */}
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs text-[#00B7FF]">PLATFORM SECURITY POSTURE</span>
          <span className="font-mono text-[10px] text-[#B8B8B8]">DERIVED FROM THE PROXY SOURCE + GOVERNED CATALOG</span>
        </div>
        <div className="space-y-1.5 font-mono text-[10px] text-[#B8B8B8]">
          <p>
            PROXY GATEWAY: {PROXY_METHOD}-ONLY · ALLOWLIST {PROXY_ACTIONS.length} ACTIONS —{' '}
            {PROXY_ACTIONS.join(' · ')}. ANY ACTION NOT LISTED IS REJECTED BEFORE ANY UPSTREAM CODE RUNS.
          </p>
          <p>PROVIDERS BEHIND THE PROXY: {PROXY_PROVIDERS.join(' · ').toUpperCase()}</p>
          <p>
            SECRET CUSTODY: THE PROXY READS {PROXY_ENV_NAMES.length} ENVIRONMENT VARIABLES BY NAME —{' '}
            {PROXY_ENV_NAMES.join(' · ')}. VALUES LIVE ONLY IN THE NETLIFY ENVIRONMENT: NEVER IN THIS
            REPOSITORY, THE FRONTEND, OR ANY RECORD.
          </p>
          <p>
            CATALOG CREDENTIAL STATES (GOVERNED SOURCES):{' '}
            {Object.entries(
              RESOURCE_PROVIDERS.reduce<Record<string, number>>((acc, p) => {
                acc[p.credentialState] = (acc[p.credentialState] ?? 0) + 1;
                return acc;
              }, {}),
            )
              .map(([k, n]) => `${k} ${n}`)
              .join(' · ')}
          </p>
          <p>
            EXECUTION BOUNDARY: FINANCIAL EXECUTION IS DISABLED BY DESIGN AT EVERY SURFACE. THE
            CAPABILITY LADDER ENDS AT OWNER APPROVAL — THE EXECUTE RUNG DOES NOT RUN.
          </p>
        </div>
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          THIS PANEL READS THE PLATFORM'S OWN DECLARED FACTS. IT IS NOT A SCAN RESULT AND NOT A
          MONITOR: IT CLAIMS NO DETECTION, NO PENETRATION TEST, AND NO LIVE SECURITY FEED.
        </p>
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
