import React, { useState } from 'react';
import {
  Activity,
  Bot,
  Compass,
  Cpu,
  Network,
  Send,
  Shield,
  Sliders,
  Sparkles,
  Terminal,
  TrendingUp,
} from 'lucide-react';
import { TRIBE_PRINCIPALS } from '../worlds-data';
import { SPACE_BG } from './CryptoWorld';

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

// No scanner feed is connected: no opportunity names, sectors, or scores
// are shown. The scanner panel renders an honest empty state.
// No earnings feed is connected either: no weekly trend bars are shown.

export const BotOperations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ConsoleTab>('Overview');
  const [selectedTribe, setSelectedTribe] = useState<string>(TRIBE_PRINCIPALS[0]?.id ?? 'tribe-1');
  const [consoleInput, setConsoleInput] = useState('');
  // Demo console only: no AI backend is connected. Entries are logged
  // locally and nothing is executed.
  const [consoleHistory, setConsoleHistory] = useState<string[]>([
    '[DEMO] Command console — no AI backend connected',
    '[POLICY] Strict Non-Crypto Operational Domain enforced',
    '[STATUS] Tribe Principals staged as UNASSIGNED · NOT CONNECTED',
  ]);

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = consoleInput.trim();
    if (!cmd) return;
    setConsoleHistory((prev) => [
      `> ${cmd}`,
      `[DEMO] Logged "${cmd}" locally only — no AI backend, nothing executed.`,
      ...prev.slice(0, 8),
    ]);
    setConsoleInput('');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-6 space-y-5" style={SPACE_BG}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border border-[#00B7FF]/25 bg-[#101010] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#050505] border border-[#00B7FF]/50 flex items-center justify-center text-[#00B7FF]">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold tracking-wide">OPERATIONAL HUB · BOT OPERATIONS</h1>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#8B5CFF]/15 border border-[#8B5CFF]/40 text-[#8B5CFF]">
                NON-CRYPTO DOMAIN
              </span>
            </div>
            <p className="text-xs text-[#B8B8B8]">3-Pane Operational Hub · Scanner, Bot Management & Command Console (Demo)</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-[#151515] border border-[#00B7FF]/40 text-[#00B7FF]">
            READ-ONLY
          </span>
          <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-[#151515] border border-white/20 text-[#B8B8B8]">
            NOT CONNECTED
          </span>
        </div>
      </div>

      {/* Runtime truth band (Phase 2, step 8): STAR above the
          principals, workers beneath them — all of it record-keeping
          until a runtime connects. Nothing here is live. */}
      <div className="flex flex-col gap-2 rounded-xl border border-[#8B5CFF]/30 bg-[#101010] p-3 font-mono text-[11px] md:flex-row md:items-center md:justify-between">
        <span className="text-[#B8B8B8]">
          <span className="font-semibold text-[#8B5CFF]">STAR</span> — DEMO ·
          NO AI BACKEND CONNECTED · SITS ABOVE THE 12 PRINCIPALS
        </span>
        <span className="text-[#B8B8B8]">
          <span className="font-semibold text-[#8B5CFF]">TASK WORKERS</span> —
          ACTIVE: 0 · RUNTIME: NOT_CONNECTED · RECORD SYSTEM ONLY, NO
          WORKER RUNTIME EXISTS
        </span>
      </div>

      {/* NETWORK EARNING OPS (Gemini family 11 adoption, 2026-11-23):
          the concept's Network Earnings columns — validators, nodes,
          mining, DePIN — as an ops surface. No infrastructure is
          connected: every count is NO DATA, never an invented fleet.
          Mining is an ops column only; no miner is run from here. */}
      <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
            <Network className="h-4 w-4" />
            <span>NETWORK EARNING OPS</span>
          </div>
          <span className="text-[10px] font-mono text-[#B8B8B8]">
            VALIDATORS · NODES · MINING · DePIN — ALL NOT CONNECTED
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          {[
            { name: 'VALIDATORS', icon: Shield, lines: ['ACTIVE: NO DATA', 'UPTIME: NO DATA'] },
            { name: 'NODES', icon: Network, lines: ['RUNNING: NO DATA', 'SYNCED: NO DATA'] },
            { name: 'MINING', icon: Cpu, lines: ['RIGS: NO DATA', 'HASHRATE: NO DATA'] },
            { name: 'DePIN', icon: Activity, lines: ['NODES ONLINE: NO DATA', 'REWARDS: NO DATA'] },
          ].map((c) => (
            <div key={c.name} className="space-y-1.5 rounded-lg border border-white/10 bg-[#151515] p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <c.icon className="h-3.5 w-3.5 text-[#00B7FF]" />
                  {c.name}
                </span>
                <span className="rounded border border-white/15 bg-[#050505] px-1.5 py-0.5 font-mono text-[9px] text-[#B8B8B8]">
                  NOT CONNECTED
                </span>
              </div>
              {c.lines.map((l) => (
                <p key={l} className="font-mono text-[10px] text-[#B8B8B8]">{l}</p>
              ))}
            </div>
          ))}
        </div>
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          CONCEPT FLEET COUNTS (VALIDATORS, ANTMINERS, DePIN REWARDS) ARE
          NOT CARRIED OVER — A COUNT APPEARS ONLY WHEN A CONNECTED SOURCE
          REPORTS IT.
        </p>
      </div>

      {/* 3-Pane Operational Hub */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left Pane: Non-Crypto Opportunity Scanner + Operational Earnings Chart */}
        <div className="xl:col-span-4 space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
                <Compass className="h-4 w-4" />
                <span>NON-CRYPTO OPPORTUNITY SCANNER</span>
              </div>
              <span className="text-[10px] font-mono text-[#B8B8B8]">NO_DATA</span>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-[#151515] border border-white/10 space-y-1">
                <p className="text-xs text-[#B8B8B8]">No scanner feed is connected — no opportunities are shown.</p>
                <p className="text-[10px] font-mono text-white/40">OPPORTUNITIES: NO_DATA · FEED: NOT_CONNECTED</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-[#B8B8B8]">
                <TrendingUp className="h-4 w-4" />
                <span>OPERATIONAL EARNINGS</span>
              </div>
              <span className="text-[10px] font-mono text-[#B8B8B8]">NO_DATA</span>
            </div>
            <div className="rounded-lg bg-[#050505] border border-white/10 p-3 space-y-1">
              <p className="text-xs text-[#B8B8B8]">No earnings feed is connected — no trend is shown.</p>
              <p className="text-[11px] font-mono text-white/40">EARNINGS: NO_DATA · FEED: NOT_CONNECTED</p>
            </div>
          </div>
        </div>

        {/* Center Pane: Bot Operations Management */}
        <div className="xl:col-span-5 rounded-xl border border-white/10 bg-[#101010] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-[#8B5CFF]">
              <Sliders className="h-4 w-4" />
              <span>BOT OPERATIONS MANAGEMENT</span>
            </div>
            <span className="text-[10px] font-mono text-[#B8B8B8]">
              {TRIBE_PRINCIPALS.length} PRINCIPALS · UNASSIGNED
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CONSOLE_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-1 rounded text-[10px] font-mono transition ${
                  activeTab === tab
                    ? 'bg-[#00B7FF] text-[#050505] font-semibold'
                    : 'bg-[#151515] text-[#B8B8B8] border border-white/10'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {TRIBE_PRINCIPALS.map((tribe) => {
              const isSelected = tribe.id === selectedTribe;
              return (
                <button
                  key={tribe.id}
                  type="button"
                  onClick={() => setSelectedTribe(tribe.id)}
                  className={`p-3 rounded-lg border text-left transition space-y-1 ${
                    isSelected
                      ? 'bg-[#151515] border-[#8B5CFF]'
                      : 'bg-[#050505] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{tribe.displayName}</span>
                    <Shield className="h-3.5 w-3.5 text-[#8B5CFF]" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#B8B8B8]">
                    <span>TAB: {activeTab.toUpperCase()}</span>
                    <span>UNASSIGNED</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 rounded-lg bg-[#050505] border border-white/10 text-xs font-mono text-[#B8B8B8] flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-[#8B5CFF]" />
            <span>Runtime: READ-ONLY · NOT CONNECTED · Zero autonomous trades or payouts executed.</span>
          </div>
        </div>

        {/* Right Pane: #8B5CFF Purple Command Console (Demo — no AI backend) */}
        <div className="xl:col-span-3 rounded-xl border border-[#8B5CFF]/50 bg-[#101010] p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#8B5CFF]/25 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-mono text-[#8B5CFF]">
                <Sparkles className="h-4 w-4" />
                <span>COMMAND CONSOLE — DEMO</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#8B5CFF]/15 border border-[#8B5CFF]/40 text-[#8B5CFF]">
                #8B5CFF
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto font-mono text-[11px]">
              {consoleHistory.map((entry, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded bg-[#151515] border-l-2 ${
                    entry.startsWith('>') ? 'border-white text-white' : 'border-[#8B5CFF] text-[#B8B8B8]'
                  }`}
                >
                  {entry}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendCommand} className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-[#8B5CFF] shrink-0" />
              <input
                type="text"
                value={consoleInput}
                onChange={(e) => setConsoleInput(e.target.value)}
                placeholder="Log a note — demo, local only..."
                className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-[#8B5CFF]/40 text-xs text-white placeholder-[#B8B8B8]/50 focus:outline-none focus:border-[#8B5CFF]"
              />
              <button
                type="submit"
                className="p-1.5 rounded bg-[#8B5CFF] text-white hover:opacity-90 transition"
                aria-label="Log note (demo)"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
