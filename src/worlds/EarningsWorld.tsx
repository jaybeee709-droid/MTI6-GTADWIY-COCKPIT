import React, { useState } from 'react';
import {
  DollarSign,
  BookOpen,
  Search,
} from 'lucide-react';
import {
  EARNINGS_CATEGORIES,
  EARNINGS_DETAILS,
  SIMPLE_RULE,
  MEMBERSHIP_RULE,
} from '../worlds-data';

// Tabs: 'All 20' plus one tab per category — selecting a tab filters the
// grid to that category only. No monthly ranges, no effort ratings, no
// rates, no promises anywhere in this screen.
const TABS: string[] = ['All 20', ...EARNINGS_CATEGORIES];

export const EarningsWorld: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('All 20');
  const [query, setQuery] = useState('');

  const visibleCategories = EARNINGS_CATEGORIES.filter((name) => {
    if (activeTab !== 'All 20' && name !== activeTab) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      name.toLowerCase().includes(q) ||
      (EARNINGS_DETAILS[name] ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#06070B] text-slate-100 p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#32D74B]/10 border border-[#32D74B]/40 flex items-center justify-center text-[#32D74B]">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-wide text-white">EARNINGS WORLD · NON-CRYPTO INCOME</h1>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#00B7FF]/10 border border-[#00B7FF]/40 text-[#00B7FF]">
                FIAT &amp; REAL-ECONOMY ONLY
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {SIMPLE_RULE.earnings}. {MEMBERSHIP_RULE.earnings}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              The 20 categories below are verbatim from the owner directive 2026-11-22. No rates, no promises.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#111623] border border-[#1E273B] text-slate-300">
            NO_DATA · NO RATES PROMISED
          </span>
        </div>
      </div>

      {/* Category Tabs — each tab filters the grid */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition ${
                isActive
                  ? 'bg-[#111623] border-[#32D74B] text-[#32D74B]'
                  : 'bg-[#0C0F17] border-[#1E273B] text-slate-400 hover:text-[#00B7FF] hover:border-[#00B7FF]/50'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Honest strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400">CATEGORIES</div>
          <div className="text-sm font-mono font-semibold text-white">{EARNINGS_CATEGORIES.length} categories</div>
          <div className="text-[11px] text-slate-500">Directive 2026-11-22, verbatim order</div>
        </div>

        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400">RESEARCHED IDEAS</div>
          <div className="text-sm font-mono font-semibold text-white">6 ideas · Oct 31, 2026</div>
          <div className="text-[11px] text-slate-500">Carried verbatim under their categories</div>
        </div>

        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400">RATES / EARNINGS</div>
          <div className="text-sm font-mono font-semibold text-white">NO_DATA</div>
          <div className="text-[11px] text-slate-500">No rate or earnings figure is promised</div>
        </div>

        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400">SIGN-UP</div>
          <div className="text-sm font-mono font-semibold text-white">SELF SIGN-UP ONLY</div>
          <div className="text-[11px] text-slate-500">No bot signs you up; check current terms first</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-[#00B7FF]" />
              <h2 className="text-sm font-semibold tracking-wide text-white">
                THE 20 EARNINGS CATEGORIES · SHOWING {visibleCategories.length} OF {EARNINGS_CATEGORIES.length}
              </h2>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter categories..."
              className="px-3 py-1.5 rounded-lg bg-[#111623] border border-[#1E273B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00B7FF]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleCategories.map((name) => {
              const detail = EARNINGS_DETAILS[name] ?? '';
              // Commerce Opportunities carries 3 ideas in one string,
              // separated by " | " — render each idea verbatim.
              const ideas = detail.split(' | ');
              return (
                <div
                  key={name}
                  className="rounded-lg border border-[#1E273B] bg-[#111623] p-3.5 space-y-2"
                >
                  <div className="text-xs font-semibold text-white">{name}</div>
                  {ideas.map((idea, i) => (
                    <p key={i} className="text-[11px] text-slate-400">
                      {idea}
                    </p>
                  ))}
                  <div className="pt-1">
                    <span className="inline-block px-2 py-0.5 rounded text-[9px] font-mono font-semibold bg-[#111623] border border-[#1E273B] text-slate-400">
                      NO_DATA · NO RATE PROMISED
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-500">
            Crypto earning is not here: Yield / Capital and Infrastructure / Network Earning live in Crypto
            World, with rates NOT_CONNECTED and no earnings figure derived. Anything promising money with no
            identity check at payout should be treated as a red flag, not an opportunity.
          </p>
        </div>

        {/* Right: Earnings notes */}
        <div className="space-y-4">
          <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#00B7FF]" />
              <h3 className="text-sm font-semibold text-white">EARNINGS NOTES</h3>
            </div>
            <p className="text-xs text-slate-400">
              Research only, no auto-signup: no earnings are promised, no rates are invented, and no bot
              signs you up — you sign up yourself with your own details after checking the platform&apos;s
              current terms.
            </p>
            <p className="text-xs text-slate-400">
              The 6 researched ideas from Oct 31, 2026 are kept under their categories (Freelance,
              Commerce ×3, Content Creation, Surveys) — nothing from the old list was dropped.
            </p>
            <div className="text-[11px] font-mono text-slate-500">STATUS: NOT_CONNECTED · NO_DATA</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsWorld;
