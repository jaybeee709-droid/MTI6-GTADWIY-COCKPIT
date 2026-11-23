import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  History,
  Layers,
  Network,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Shield,
  Sliders,
  Sparkles,
  Terminal,
  TrendingUp,
  Zap,
} from 'lucide-react';

type BotStatus = 'default' | 'working' | 'success' | 'warning' | 'critical';

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

interface BotProfile {
  id: string;
  name: string;
  tribe: string;
  role: string;
  status: BotStatus;
  purpose: string;
  task: string;
  input: string;
  output: string;
  dependencies: string[];
  warnings: string[];
  history: string[];
  latencyMs: number;
  cpuPct: number;
  uptime: string;
}

const STATUS_STYLE: Record<
  BotStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  default: {
    label: 'Default / Standby',
    color: '#00B7FF',
    bg: 'rgba(0, 183, 255, 0.12)',
    border: 'rgba(0, 183, 255, 0.35)',
  },
  working: {
    label: 'Working',
    color: '#8B5CFF',
    bg: 'rgba(139, 92, 255, 0.14)',
    border: 'rgba(139, 92, 255, 0.40)',
  },
  success: {
    label: 'Success',
    color: '#32D74B',
    bg: 'rgba(50, 215, 75, 0.12)',
    border: 'rgba(50, 215, 75, 0.38)',
  },
  warning: {
    label: 'Warning',
    color: '#FFB800',
    bg: 'rgba(255, 184, 0, 0.14)',
    border: 'rgba(255, 184, 0, 0.40)',
  },
  critical: {
    label: 'Critical',
    color: '#FF3B30',
    bg: 'rgba(255, 59, 48, 0.14)',
    border: 'rgba(255, 59, 48, 0.45)',
  },
};

const TWELVE_TRIBES = [
  { id: 'all', name: 'All 12 Tribes', lead: 'STAR Core', activeCount: 12 },
  { id: 'research', name: '01 · Alpha Research', lead: 'Orion-R1', activeCount: 4 },
  { id: 'risk', name: '02 · Sentinel Risk', lead: 'Aegis-K9', activeCount: 3 },
  { id: 'builder', name: '03 · Forge Builder', lead: 'Vulcan-B4', activeCount: 5 },
  { id: 'yield', name: '04 · Harvest Yield', lead: 'Ceres-Y2', activeCount: 4 },
  { id: 'execution', name: '05 · Velocity Execution', lead: 'Hermes-X7', activeCount: 3 },
  { id: 'liquidity', name: '06 · Depth Liquidity', lead: 'Nereus-L3', activeCount: 2 },
  { id: 'macro', name: '07 · Horizon Macro', lead: 'Atlas-M8', activeCount: 3 },
  { id: 'arb', name: '08 · Prism Arbitrage', lead: 'Vector-A5', activeCount: 2 },
  { id: 'compliance', name: '09 · Ledger Compliance', lead: 'Themis-C1', activeCount: 2 },
  { id: 'treasury', name: '10 · Vault Treasury', lead: 'Plutus-T6', activeCount: 3 },
  { id: 'security', name: '11 · Bastion Security', lead: 'Cerberus-S0', activeCount: 4 },
  { id: 'analytics', name: '12 · Cortex Analytics', lead: 'Minerva-D2', activeCount: 3 },
];

const INITIAL_BOTS: BotProfile[] = [
  {
    id: 'bot-research',
    name: 'Orion-R1 · Research Worker',
    tribe: 'research',
    role: 'Research',
    status: 'working',
    purpose: 'Synthesize multi-venue orderbook microstructure, on-chain flows, and catalyst signals.',
    task: 'Scanning BTC/ETH perpetual funding divergence & L2 TVL inflows',
    input: 'Pyth L1/L2 feeds, Dune SQL stream, X/GitHub dev velocity',
    output: 'Alpha Conviction Packet #409 (Score: 0.87)',
    dependencies: ['STAR Orchestrator', 'Cortex Analytics', 'Horizon Macro'],
    warnings: ['Minor rate-limit jitter on Secondary Indexer (auto-retried)'],
    history: ['14:02 UTC · Published Packet #408', '13:45 UTC · Ingested 18,400 ticks'],
    latencyMs: 42,
    cpuPct: 64,
    uptime: '99.98%',
  },
  {
    id: 'bot-risk',
    name: 'Aegis-K9 · Risk Worker',
    tribe: 'risk',
    role: 'Risk',
    status: 'warning',
    purpose: 'Enforce portfolio VaR ceilings, drawdown circuit breakers, and rail reconciliation.',
    task: 'Auditing RAIL-A USD/JPY settlement drift & perp margin utilization',
    input: 'Position ledger, Urban Wallet rail telemetry, Volatility surface',
    output: 'Risk Envelope Clearance + RAIL-A Read-Only Lock',
    dependencies: ['STAR Orchestrator', 'Bastion Security', 'Vault Treasury'],
    warnings: ['RAIL-A USD/JPY reconciliation mismatch detected (-¥142,500)'],
    history: ['14:04 UTC · Locked RAIL-A Execute', '13:30 UTC · Stress test passed'],
    latencyMs: 18,
    cpuPct: 51,
    uptime: '99.99%',
  },
  {
    id: 'bot-builder',
    name: 'Vulcan-B4 · Builder Worker',
    tribe: 'builder',
    role: 'Builder',
    status: 'success',
    purpose: 'Compile, verify, and stage automated strategy pipelines and cockpit modules.',
    task: 'Verified World Engine routing & strategy dependency graph',
    input: 'Encyclopedia Strategy AST, TypeScript compiler, Sandbox runner',
    output: 'Build Artifact v4.12.0-rc2 (0 errors)',
    dependencies: ['STAR Orchestrator', 'Cortex Analytics'],
    warnings: [],
    history: ['14:01 UTC · Build #884 passed', '13:15 UTC · Deployed canary hook'],
    latencyMs: 95,
    cpuPct: 38,
    uptime: '99.95%',
  },
  {
    id: 'bot-yield',
    name: 'Ceres-Y2 · Yield Worker',
    tribe: 'yield',
    role: 'Yield',
    status: 'default',
    purpose: 'Optimize idle stablecoin & staking allocations across whitelisted vaults.',
    task: 'Standing by for STAR capital rotation window (Next epoch in 14m)',
    input: 'Aave/Morpho APY curves, Gas oracle, Treasury cash buffer',
    output: 'Rebalance Proposal: +42 bps net APY',
    dependencies: ['STAR Orchestrator', 'Sentinel Risk', 'Vault Treasury'],
    warnings: [],
    history: ['13:00 UTC · Harvested 1,240 USDC', '11:30 UTC · Rebalanced Vault B'],
    latencyMs: 31,
    cpuPct: 22,
    uptime: '99.99%',
  },
  {
    id: 'bot-sentinel',
    name: 'Cerberus-S0 · Rail Guard',
    tribe: 'security',
    role: 'Security',
    status: 'critical',
    purpose: 'Monitor API keys, anomalous withdrawals, and settlement rail integrity.',
    task: 'Holding Critical Alert on RAIL-A reconciliation variance',
    input: 'Audit log stream, Hardware key attestations, Settlement webhooks',
    output: 'CRITICAL_HOLD_RAIL_A + Pager Dispatch',
    dependencies: ['STAR Orchestrator', 'Sentinel Risk'],
    warnings: ['CRITICAL: RAIL-A mismatch exceeds $500 threshold; execution disabled'],
    history: ['14:04 UTC · Triggered Kill-Switch Guard', '12:10 UTC · Rotated session token'],
    latencyMs: 12,
    cpuPct: 79,
    uptime: '100.0%',
  },
];

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
  const [selectedTribe, setSelectedTribe] = useState<string>('all');
  const [bots, setBots] = useState<BotProfile[]>(INITIAL_BOTS);
  const [selectedBotId, setSelectedBotId] = useState<string>(INITIAL_BOTS[0].id);
  const [activeTab, setActiveTab] = useState<ConsoleTab>('Overview');
  const [theaterRunning, setTheaterRunning] = useState<boolean>(true);

  const filteredBots =
    selectedTribe === 'all' ? bots : bots.filter((b) => b.tribe === selectedTribe);

  const selectedBot = bots.find((b) => b.id === selectedBotId) ?? bots[0];

  const handleBotStatus = (id: string, nextStatus: BotStatus) => {
    setBots((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              status: nextStatus,
              history: [`Just now · Status changed to ${STATUS_STYLE[nextStatus].label}`, ...b.history],
            }
          : b,
      ),
    );
  };

  const theaterWorkers = [
    { role: 'Research', bot: bots[0], metric: '18.4k ticks/m' },
    { role: 'Risk', bot: bots[1], metric: 'VaR 1.8% / 3.0%' },
    { role: 'Builder', bot: bots[2], metric: '0 build errors' },
    { role: 'Yield', bot: bots[3], metric: '+42 bps queued' },
  ];

  return (
    <div className="space-y-6 text-white">
      {/* Header + STAR + 12 Tribes Strip */}
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00B7FF]/15 text-[#00B7FF] border border-[#00B7FF]/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  STAR + 12 Tribes Command Operations
                </h2>
                <span className="rounded-full bg-[#32D74B]/15 px-2.5 py-0.5 text-xs font-medium text-[#32D74B] border border-[#32D74B]/30">
                  STAR ONLINE
                </span>
              </div>
              <p className="text-xs text-[#B8B8B8]">
                Autonomous multi-tribe orchestration across Research, Risk, Builder, Yield &amp; Security
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheaterRunning((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#151515] px-3 py-1.5 text-xs font-medium hover:bg-[#202020] transition"
            >
              {theaterRunning ? (
                <>
                  <Pause className="h-3.5 w-3.5 text-[#FFB800]" /> Pause Theater
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 text-[#32D74B]" /> Resume Theater
                </>
              )}
            </button>
          </div>
        </div>

        {/* 12 Tribes Selector */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {TWELVE_TRIBES.map((tribe) => {
            const active = selectedTribe === tribe.id;
            return (
              <button
                key={tribe.id}
                onClick={() => setSelectedTribe(tribe.id)}
                className={`shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                  active
                    ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-white'
                    : 'border-white/10 bg-[#151515] text-[#B8B8B8] hover:border-white/25 hover:text-white'
                }`}
              >
                <div className="text-xs font-semibold">{tribe.name}</div>
                <div className="text-[10px] opacity-75">
                  {tribe.lead} · {tribe.activeCount} units
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Command Theater: STAR coordinating Research, Risk, Builder, Yield in coexisting panels */}
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className={`h-4 w-4 ${theaterRunning ? 'text-[#8B5CFF] animate-pulse' : 'text-[#B8B8B8]'}`} />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">
              Live Command Theater · Coexisting Worker Panels
            </h3>
          </div>
          <span className="text-xs text-[#B8B8B8]">
            STAR Coordinator Sync: <strong className="text-[#00B7FF]">14ms</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {theaterWorkers.map(({ role, bot, metric }) => {
            const st = STATUS_STYLE[bot.status];
            return (
              <div
                key={role}
                onClick={() => setSelectedBotId(bot.id)}
                className="cursor-pointer rounded-xl border p-4 transition hover:brightness-110"
                style={{ backgroundColor: '#151515', borderColor: st.border }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: st.color }}>
                    {role} Panel
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                </div>
                <div className="mt-2 text-sm font-semibold text-white">{bot.name}</div>
                <p className="mt-1 text-xs text-[#B8B8B8] line-clamp-2">{bot.task}</p>
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[11px] text-[#B8B8B8]">
                  <span>{metric}</span>
                  <span className="font-mono text-white/80">{bot.latencyMs}ms</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Executive Bot Profile Cards */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">
            Executive Bot Profile Cards
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            {(Object.keys(STATUS_STYLE) as BotStatus[]).map((k) => (
              <span key={k} className="flex items-center gap-1.5 text-[#B8B8B8]">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_STYLE[k].color }}
                />
                {STATUS_STYLE[k].label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredBots.map((bot) => {
            const st = STATUS_STYLE[bot.status];
            const isSelected = bot.id === selectedBot.id;
            return (
              <div
                key={bot.id}
                onClick={() => setSelectedBotId(bot.id)}
                className={`cursor-pointer rounded-2xl border p-5 transition ${
                  isSelected ? 'ring-1 ring-[#00B7FF]' : ''
                }`}
                style={{
                  backgroundColor: '#101010',
                  borderColor: st.border,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl border"
                      style={{ backgroundColor: st.bg, borderColor: st.border, color: st.color }}
                    >
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{bot.name}</div>
                      <div className="text-xs text-[#B8B8B8]">
                        Tribe: {bot.tribe.toUpperCase()} · Uptime {bot.uptime}
                      </div>
                    </div>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{ backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                  >
                    {st.label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
                  <div className="rounded-lg bg-[#151515] p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-[#B8B8B8]">Purpose</div>
                    <div className="mt-0.5 text-white/90">{bot.purpose}</div>
                  </div>
                  <div className="rounded-lg bg-[#151515] p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-[#B8B8B8]">Task</div>
                    <div className="mt-0.5 text-white/90">{bot.task}</div>
                  </div>
                  <div className="rounded-lg bg-[#151515] p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-[#B8B8B8]">Input</div>
                    <div className="mt-0.5 text-white/90">{bot.input}</div>
                  </div>
                  <div className="rounded-lg bg-[#151515] p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-[#B8B8B8]">Output</div>
                    <div className="mt-0.5 text-[#00B7FF]">{bot.output}</div>
                  </div>
                  <div className="rounded-lg bg-[#151515] p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-[#B8B8B8]">Dependencies</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {bot.dependencies.map((dep) => (
                        <span
                          key={dep}
                          className="rounded bg-[#202020] px-1.5 py-0.5 text-[10px] text-white/85"
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#151515] p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-[#B8B8B8]">Warnings</div>
                    {bot.warnings.length > 0 ? (
                      <div className="mt-0.5 flex items-start gap-1 text-[#FFB800]">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{bot.warnings[0]}</span>
                      </div>
                    ) : (
                      <div className="mt-0.5 flex items-center gap-1 text-[#32D74B]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> No active warnings
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-[#151515] p-2.5 text-xs">
                  <div className="text-[10px] font-semibold uppercase text-[#B8B8B8]">History</div>
                  <div className="mt-1 space-y-0.5 text-[11px] text-white/80">
                    {bot.history.slice(0, 2).map((h, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-[#B8B8B8]" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Controls */}
                <div
                  className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[10px] font-semibold uppercase text-[#B8B8B8]">Controls</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => handleBotStatus(bot.id, 'working')}
                      className="flex items-center gap-1 rounded-lg bg-[#8B5CFF]/20 px-2.5 py-1 text-[11px] font-medium text-[#8B5CFF] hover:bg-[#8B5CFF]/30"
                    >
                      <Play className="h-3 w-3" /> Run
                    </button>
                    <button
                      onClick={() => handleBotStatus(bot.id, 'default')}
                      className="flex items-center gap-1 rounded-lg bg-[#00B7FF]/15 px-2.5 py-1 text-[11px] font-medium text-[#00B7FF] hover:bg-[#00B7FF]/25"
                    >
                      <Pause className="h-3 w-3" /> Standby
                    </button>
                    <button
                      onClick={() => handleBotStatus(bot.id, 'success')}
                      className="flex items-center gap-1 rounded-lg bg-[#32D74B]/15 px-2.5 py-1 text-[11px] font-medium text-[#32D74B] hover:bg-[#32D74B]/25"
                    >
                      <RotateCcw className="h-3 w-3" /> Verify
                    </button>
                  </div>
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
              Bot Command Console — <span className="text-[#00B7FF]">{selectedBot.name}</span>
            </h3>
          </div>
          <span className="text-xs text-[#B8B8B8]">
            CPU {selectedBot.cpuPct}% · Latency {selectedBot.latencyMs}ms
          </span>
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

        {/* Tab Content */}
        <div className="mt-4 rounded-xl border border-white/10 bg-[#151515] p-4 text-xs">
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <div className="text-[#B8B8B8]">Active Role</div>
                <div className="mt-1 text-sm font-semibold text-white">{selectedBot.role}</div>
              </div>
              <div>
                <div className="text-[#B8B8B8]">Current Directive</div>
                <div className="mt-1 text-white">{selectedBot.task}</div>
              </div>
              <div>
                <div className="text-[#B8B8B8]">Latest Artifact</div>
                <div className="mt-1 text-[#00B7FF]">{selectedBot.output}</div>
              </div>
            </div>
          )}

          {activeTab === 'Tasks' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-[#101010] p-2.5">
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#8B5CFF]" /> {selectedBot.task}
                </span>
                <span className="text-[#8B5CFF]">IN PROGRESS</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#101010] p-2.5">
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#32D74B]" /> Heartbeat telemetry sync with STAR Core
                </span>
                <span className="text-[#32D74B]">COMPLETED</span>
              </div>
            </div>
          )}

          {activeTab === 'Dependencies' && (
            <div className="flex flex-wrap gap-2">
              {selectedBot.dependencies.map((d) => (
                <div key={d} className="flex items-center gap-2 rounded-lg bg-[#101010] px-3 py-2">
                  <Network className="h-4 w-4 text-[#00B7FF]" />
                  <span>{d}</span>
                  <span className="text-[#32D74B]">CONNECTED</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Resources' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-[#101010] p-3">
                <div className="flex items-center gap-1.5 text-[#B8B8B8]">
                  <Cpu className="h-3.5 w-3.5" /> Compute Allocation
                </div>
                <div className="mt-1 text-base font-semibold">{selectedBot.cpuPct}% vCPU</div>
              </div>
              <div className="rounded-lg bg-[#101010] p-3">
                <div className="flex items-center gap-1.5 text-[#B8B8B8]">
                  <Database className="h-3.5 w-3.5" /> Memory Footprint
                </div>
                <div className="mt-1 text-base font-semibold">1.42 GB / 4.00 GB</div>
              </div>
              <div className="rounded-lg bg-[#101010] p-3">
                <div className="flex items-center gap-1.5 text-[#B8B8B8]">
                  <Layers className="h-3.5 w-3.5" /> Queue Depth
                </div>
                <div className="mt-1 text-base font-semibold">3 Pending Packets</div>
              </div>
            </div>
          )}

          {activeTab === 'Outputs' && (
            <div className="space-y-2 font-mono text-[11px]">
              <div className="rounded-lg bg-[#101010] p-3 text-[#00B7FF]">
                {`{ "bot": "${selectedBot.id}", "output": "${selectedBot.output}", "verified": true }`}
              </div>
            </div>
          )}

          {activeTab === 'Logs' && (
            <div className="space-y-1 font-mono text-[11px] text-[#B8B8B8]">
              <div>[14:04:12] INFO  STAR_BUS synced directive to {selectedBot.id}</div>
              <div>[14:04:15] DEBUG Input stream healthy ({selectedBot.latencyMs}ms)</div>
              {selectedBot.warnings.map((w, idx) => (
                <div key={idx} className="text-[#FFB800]">[14:04:19] WARN  {w}</div>
              ))}
            </div>
          )}

          {activeTab === 'Knowledge' && (
            <div className="text-white/90">
              Linked Encyclopedia Nodes: <span className="text-[#00B7FF]">Market Microstructure → Liquidity → Execution Safeguards</span>
            </div>
          )}

          {activeTab === 'Settings' && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#00B7FF]" />
                <span>Execution Mode: <strong className="text-white">Guarded Autonomous</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#32D74B]" />
                <span>Circuit Breaker: <strong className="text-[#32D74B]">Armed</strong></span>
              </div>
            </div>
          )}

          {activeTab === 'Performance' && (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#32D74B]" />
                <span>Success Rate: <strong>99.4%</strong></span>
              </div>
              <div>Avg Latency: <strong>{selectedBot.latencyMs}ms</strong></div>
              <div>Uptime: <strong>{selectedBot.uptime}</strong></div>
            </div>
          )}

          {activeTab === 'History' && (
            <div className="space-y-1.5">
              {selectedBot.history.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-white/85">
                  <History className="h-3.5 w-3.5 text-[#00B7FF]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BotOperations;
