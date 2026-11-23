import React, { useState } from 'react';
import {
  Activity,
  Bot,
  Compass,
  Send,
  Shield,
  Sliders,
  Sparkles,
  Terminal,
  TrendingUp,
} from 'lucide-react';
import { TRIBE_PRINCIPALS } from '../worlds-data';

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

const NON_CRYPTO_OPPORTUNITIES = [
  { title: 'Micro-SaaS Billing Automation', sector: 'B2B SaaS', score: '94', status: 'EXPANSION-GATED' },
  { title: 'Local Fleet Dispatch Portal', sector: 'Logistics', score: '89', status: 'READ-ONLY' },
  { title: 'Creator Merch Fulfillment', sector: 'E-Commerce', score: '86', status: 'NOT CONNECTED' },
  { title: 'Automated Lead Enrichment', sector: 'Agency Ops', score: '82', status: 'EXPANSION-GATED' },
];

const OPERATIONAL_EARNINGS_SERIES = [
  { label: 'W1', val: 42 },
  { label: 'W2', val: 58 },
  { label: 'W3', val: 51 },
  { label: 'W4', val: 74 },
  { label: 'W5', val: 68 },
  { label: 'W6', val: 88 },
];

export const BotOperations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ConsoleTab>('Overview');
  const [selectedTribe, setSelectedTribe] = useState<string>(TRIBE_PRINCIPALS[0]?.id ?? 'tribe-1');
  const [consoleInput, setConsoleInput] = useState('');
  const [consoleHistory, setConsoleHistory] = useState<string[]>([
    '[AI CONSOLE] Purple Command Kernel (#8B5CFF) online',
    '[POLICY] Strict Non-Crypto Operational Domain enforced',
    '[STATUS] Tribe Principals staged as UNASSIGNED · NOT CONNECTED',
  ]);

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = consoleInput.trim();
    if (!cmd) return;
    setConsoleHistory((prev) => [
      `> ${cmd}`,
      `[AI #8B5CFF] Staged "${cmd}" in READ-ONLY simulation (no external execution).`,
      ...prev.slice(0, 8),
    ]);
    setConsoleInput('');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-6 space-y-5">
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
            <p className="text-xs text-[#B8B8B8]">3-Pane Operational Hub · Scanner, Bot Management & AI Command Console</p>
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
              <span className="text-[10px] font-mono text-[#B8B8B8]">LIVE RADAR</span>
            </div>
            <div className="space-y-2">
              {NON_CRYPTO_OPPORTUNITIES.map((opp) => (
                <div key={opp.title} className="p-2.5 rounded-lg bg-[#151515] border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{opp.title}</span>
                    <span className="font-mono text-[#00B7FF]">{opp.score} PTS</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#B8B8B8]">
                    <span>{opp.sector}</span>
                    <span>{opp.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-[#32D74B]">
                <TrendingUp className="h-4 w-4" />
                <span>OPERATIONAL EARNINGS</span>
              </div>
              <span className="text-[10px] font-mono text-[#B8B8B8]">$0.00 CONNECTED</span>
            </div>
            <div className="rounded-lg bg-[#050505] border border-white/10 p-3">
              <svg viewBox="0 0 300 110" className="w-full h-28">
                {OPERATIONAL_EARNINGS_SERIES.map((pt, idx) => {
                  const x = 18 + idx * 46;
                  const h = pt.val * 0.85;
                  const y = 90 - h;
                  return (
                    <g key={pt.label}>
                      <rect x={x} y={y} width="26" height={h} rx="3" fill="#00B7FF" fillOpacity="0.85" />
                      <text x={x + 6} y="104" fill="#B8B8B8" fontSize="9" fontFamily="monospace">
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Center Pane: Bot Operations Management */}
        <div className="xl:col-span-5 rounded-xl border border-white/10 bg-[#101010] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
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
                      ? 'bg-[#151515] border-[#00B7FF]'
                      : 'bg-[#050505] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{tribe.displayName}</span>
                    <Shield className="h-3.5 w-3.5 text-[#00B7FF]" />
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
            <Activity className="h-3.5 w-3.5 text-[#00B7FF]" />
            <span>Runtime: READ-ONLY · NOT CONNECTED · Zero autonomous trades or payouts executed.</span>
          </div>
        </div>

        {/* Right Pane: #8B5CFF Purple AI Assistant Command Console */}
        <div className="xl:col-span-3 rounded-xl border border-[#8B5CFF]/50 bg-[#101010] p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#8B5CFF]/25 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-mono text-[#8B5CFF]">
                <Sparkles className="h-4 w-4" />
                <span>AI COMMAND CONSOLE</span>
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
                placeholder="Issue operational command..."
                className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-[#8B5CFF]/40 text-xs text-white placeholder-[#B8B8B8]/50 focus:outline-none focus:border-[#8B5CFF]"
              />
              <button
                type="submit"
                className="p-1.5 rounded bg-[#8B5CFF] text-white hover:opacity-90 transition"
                aria-label="Send command"
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
