import React, { useState } from 'react';
import {
  Bot,
  Compass,
  DollarSign,
  Search,
  Send,
  Sparkles,
  Terminal,
  TrendingUp,
} from 'lucide-react';
import {
  EARNINGS_CATEGORIES,
  EARNINGS_DETAILS,
  SIMPLE_RULE,
  MEMBERSHIP_RULE,
} from '../worlds-data';

const TABS: string[] = ['All 20', ...EARNINGS_CATEGORIES];

const SCANNER_ITEMS = [
  { name: 'B2B SaaS Micro-Tools', channel: 'Direct Recurring', status: 'EXPANSION-GATED' },
  { name: 'Local Service Dispatch', channel: 'Retainer Ops', status: 'READ-ONLY' },
  { name: 'Digital Templates Store', channel: 'E-Commerce', status: 'NOT CONNECTED' },
];

const EARNINGS_TREND = [
  { label: 'M1', val: 38 },
  { label: 'M2', val: 52 },
  { label: 'M3', val: 61 },
  { label: 'M4', val: 79 },
  { label: 'M5', val: 85 },
];

export const EarningsWorld: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('All 20');
  const [query, setQuery] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiLogs, setAiLogs] = useState<string[]>([
    '[AI #8B5CFF] Earnings & Operational Hub ready (NON-CRYPTO ONLY)',
    '[STATUS] Payout & Stripe rails: NOT CONNECTED · READ-ONLY',
  ]);

  const visibleCategories = EARNINGS_CATEGORIES.filter((name) => {
    if (activeTab !== 'All 20' && name !== activeTab) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      name.toLowerCase().includes(q) ||
      (EARNINGS_DETAILS[name] ?? '').toLowerCase().includes(q)
    );
  });

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = aiInput.trim();
    if (!cmd) return;
    setAiLogs((prev) => [
      `> ${cmd}`,
      `[AI #8B5CFF] Logged "${cmd}" in READ-ONLY mode.`,
      ...prev.slice(0, 6),
    ]);
    setAiInput('');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border border-[#00B7FF]/25 bg-[#101010] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#050505] border border-[#00B7FF]/50 flex items-center justify-center text-[#00B7FF]">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold tracking-wide">EARNINGS WORLD · OPERATIONAL HUB</h1>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#8B5CFF]/15 border border-[#8B5CFF]/40 text-[#8B5CFF]">
                STRICT NON-CRYPTO
              </span>
            </div>
            <p className="text-xs text-[#B8B8B8]">{SIMPLE_RULE} · {MEMBERSHIP_RULE}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
              <Compass className="h-4 w-4" />
              <span>NON-CRYPTO OPPORTUNITY SCANNER</span>
            </div>
            <div className="space-y-2">
              {SCANNER_ITEMS.map((item) => (
                <div key={item.name} className="p-2.5 rounded-lg bg-[#151515] border border-white/10 space-y-1">
                  <div className="text-xs font-semibold text-white">{item.name}</div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#B8B8B8]">
                    <span>{item.channel}</span>
                    <span className="text-[#00B7FF]">{item.status}</span>
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
              <span className="text-[10px] font-mono text-[#B8B8B8]">$0.00 LIVE</span>
            </div>
            <div className="rounded-lg bg-[#050505] border border-white/10 p-3">
              <svg viewBox="0 0 260 100" className="w-full h-24">
                {EARNINGS_TREND.map((pt, i) => {
                  const x = 16 + i * 48;
                  const h = pt.val * 0.75;
                  return (
                    <g key={pt.label}>
                      <rect x={x} y={82 - h} width="26" height={h} rx="3" fill="#00B7FF" fillOpacity="0.85" />
                      <text x={x + 6} y="96" fill="#B8B8B8" fontSize="9" fontFamily="monospace">
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Center Pane: Bot Operations Management + 20 Earnings Categories */}
        <div className="xl:col-span-5 rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
              <Bot className="h-4 w-4" />
              <span>BOT OPERATIONS & EARNINGS LANES</span>
            </div>
            <div className="relative w-44">
              <Search className="h-3 w-3 text-[#B8B8B8] absolute left-2.5 top-2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter lanes..."
                className="w-full pl-7 pr-2 py-1 rounded bg-[#050505] border border-white/15 text-[11px] text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  activeTab === tab
                    ? 'bg-[#00B7FF] text-[#050505] font-semibold'
                    : 'bg-[#151515] text-[#B8B8B8] border border-white/10'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {visibleCategories.map((name) => (
              <div key={name} className="p-2.5 rounded-lg bg-[#151515] border border-white/10 space-y-1">
                <div className="text-xs font-semibold text-white">{name}</div>
                <p className="text-[11px] text-[#B8B8B8] line-clamp-2">{EARNINGS_DETAILS[name]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane: #8B5CFF Purple AI Assistant Command Console */}
        <div className="xl:col-span-3 rounded-xl border border-[#8B5CFF]/50 bg-[#101010] p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#8B5CFF]/25 pb-2">
              <div className="flex items-center gap-2 text-xs font-mono text-[#8B5CFF]">
                <Sparkles className="h-4 w-4" />
                <span>AI COMMAND CONSOLE</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#8B5CFF]/15 border border-[#8B5CFF]/40 text-[#8B5CFF]">
                #8B5CFF
              </span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-[11px]">
              {aiLogs.map((log, i) => (
                <div
                  key={i}
                  className={`p-2 rounded bg-[#151515] border-l-2 ${
                    log.startsWith('>') ? 'border-white text-white' : 'border-[#8B5CFF] text-[#B8B8B8]'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleAiSubmit} className="flex items-center gap-2 pt-2 border-t border-white/10">
            <Terminal className="h-3.5 w-3.5 text-[#8B5CFF] shrink-0" />
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask AI Console..."
              className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-[#8B5CFF]/40 text-xs text-white focus:outline-none focus:border-[#8B5CFF]"
            />
            <button
              type="submit"
              className="p-1.5 rounded bg-[#8B5CFF] text-white hover:opacity-90 transition"
              aria-label="Submit AI command"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
