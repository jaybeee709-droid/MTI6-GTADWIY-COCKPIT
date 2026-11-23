import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Gift,
  Award,
  Briefcase,
  Search,
  BookOpen,
  Sparkles,
  MapPin,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';

export type EarningsSectionId =
  | 'Dashboard'
  | 'Opportunity Scanner'
  | 'Cashback'
  | 'Rewards'
  | 'Points'
  | 'Gift Cards'
  | 'Coupons'
  | 'Surveys'
  | 'AI Earnings'
  | 'Freelancing'
  | 'Gig Work'
  | 'Banking/Checking/Savings Bonuses'
  | 'Local Opportunities'
  | 'Side Hustles'
  | 'Asset Monetization'
  | 'Earnings Intelligence'
  | 'Earnings Encyclopedia';

interface IncomeStream {
  id: EarningsSectionId;
  category: string;
  estMonthly: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
}

const EARNINGS_SECTIONS: EarningsSectionId[] = [
  'Dashboard',
  'Opportunity Scanner',
  'Cashback',
  'Rewards',
  'Points',
  'Gift Cards',
  'Coupons',
  'Surveys',
  'AI Earnings',
  'Freelancing',
  'Gig Work',
  'Banking/Checking/Savings Bonuses',
  'Local Opportunities',
  'Side Hustles',
  'Asset Monetization',
  'Earnings Intelligence',
  'Earnings Encyclopedia',
];

const INCOME_STREAMS: IncomeStream[] = [
  { id: 'Opportunity Scanner', category: 'Discovery', estMonthly: '$450–$1,200', effort: 'LOW', summary: 'Real-time non-crypto income & rebate lead aggregator.' },
  { id: 'Cashback', category: 'Card & Portal', estMonthly: '$85–$240', effort: 'LOW', summary: 'Merchant portal stacking, card category multipliers & receipt rebates.' },
  { id: 'Rewards', category: 'Loyalty', estMonthly: '$60–$180', effort: 'LOW', summary: 'Retail, dining, and subscription loyalty program optimization.' },
  { id: 'Points', category: 'Travel & Bank', estMonthly: '$150–$500', effort: 'LOW', summary: 'Transferable bank & airline point valuation and redemption.' },
  { id: 'Gift Cards', category: 'Discounted Spend', estMonthly: '$40–$120', effort: 'LOW', summary: 'Discounted gift card arbitrage & bonus-category purchases.' },
  { id: 'Coupons', category: 'Checkout Savings', estMonthly: '$50–$150', effort: 'LOW', summary: 'Verified promo codes, manufacturer coupons & price-drop credits.' },
  { id: 'Surveys', category: 'Micro-Research', estMonthly: '$75–$220', effort: 'LOW', summary: 'Vetted consumer research panels & paid user-testing studies.' },
  { id: 'AI Earnings', category: 'AI & Data', estMonthly: '$400–$1,800', effort: 'MEDIUM', summary: 'RLHF evaluation, prompt QA, model benchmarking & AI workflow gigs.' },
  { id: 'Freelancing', category: 'Client Services', estMonthly: '$1,500–$6,000', effort: 'HIGH', summary: 'Design, engineering, writing, consulting & retainer contracts.' },
  { id: 'Gig Work', category: 'Flexible Labor', estMonthly: '$600–$2,200', effort: 'MEDIUM', summary: 'Local delivery, tasker platforms & on-demand field shifts.' },
  { id: 'Banking/Checking/Savings Bonuses', category: 'FI Promotions', estMonthly: '$300–$900', effort: 'LOW', summary: 'FDIC-insured checking, HYSA & brokerage direct-deposit bonuses.' },
  { id: 'Local Opportunities', category: 'Geo-Targeted', estMonthly: '$250–$1,100', effort: 'MEDIUM', summary: 'Neighborhood focus groups, mystery shopping & local event staffing.' },
  { id: 'Side Hustles', category: 'Independent', estMonthly: '$500–$2,500', effort: 'MEDIUM', summary: 'Digital templates, niche services, tutoring & weekend resale.' },
  { id: 'Asset Monetization', category: 'Real-World Assets', estMonthly: '$300–$1,600', effort: 'LOW', summary: 'Parking, storage, equipment rental & licensed media royalties.' },
];

export const EarningsWorld: React.FC = () => {
  const [activeSection, setActiveSection] = useState<EarningsSectionId>('Dashboard');
  const [query, setQuery] = useState('');

  const filteredStreams = INCOME_STREAMS.filter(
    (s) =>
      s.id.toLowerCase().includes(query.toLowerCase()) ||
      s.category.toLowerCase().includes(query.toLowerCase())
  );

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
              Cashflow, rebates, banking bonuses, AI evaluation, freelancing &amp; real-world asset yield
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#32D74B]/10 border border-[#32D74B]/40 text-[#32D74B]">
            ZERO CRYPTO LEAKAGE
          </span>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2">
        {EARNINGS_SECTIONS.map((section) => {
          const isActive = section === activeSection;
          return (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition ${
                isActive
                  ? 'bg-[#111623] border-[#32D74B] text-[#32D74B]'
                  : 'bg-[#0C0F17] border-[#1E273B] text-slate-400 hover:text-[#00B7FF] hover:border-[#00B7FF]/50'
              }`}
            >
              {section}
            </button>
          );
        })}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>ACTIVE SECTION</span>
            <TrendingUp className="h-4 w-4 text-[#32D74B]" />
          </div>
          <div className="text-sm font-mono font-semibold text-white truncate">{activeSection}</div>
          <div className="text-[11px] text-[#32D74B]">17 non-crypto modules ready</div>
        </div>

        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>BANKING BONUSES</span>
            <CreditCard className="h-4 w-4 text-[#00B7FF]" />
          </div>
          <div className="text-sm font-mono font-semibold text-white">$300–$900 / MO</div>
          <div className="text-[11px] text-[#00B7FF]">Checking &amp; savings promos</div>
        </div>

        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>CASHBACK &amp; POINTS</span>
            <Gift className="h-4 w-4 text-[#32D74B]" />
          </div>
          <div className="text-sm font-mono font-semibold text-white">STACKED</div>
          <div className="text-[11px] text-slate-400">Rewards, gift cards &amp; coupons</div>
        </div>

        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>AI &amp; FREELANCE</span>
            <Sparkles className="h-4 w-4 text-[#00B7FF]" />
          </div>
          <div className="text-sm font-mono font-semibold text-white">HIGH SIGNAL</div>
          <div className="text-[11px] text-slate-400">AI Earnings, Gig &amp; Side Hustles</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-[#00B7FF]" />
              <h2 className="text-sm font-semibold tracking-wide text-white">
                INCOME STREAMS &amp; OPPORTUNITY SCANNER
              </h2>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter income streams..."
              className="px-3 py-1.5 rounded-lg bg-[#111623] border border-[#1E273B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00B7FF]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredStreams.map((stream) => (
              <div
                key={stream.id}
                onClick={() => setActiveSection(stream.id)}
                className={`cursor-pointer rounded-lg border p-3.5 space-y-2 transition ${
                  activeSection === stream.id
                    ? 'border-[#32D74B] bg-[#111623]'
                    : 'border-[#1E273B] bg-[#111623] hover:border-[#00B7FF]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white">{stream.id}</span>
                  <span className="text-[11px] font-mono font-semibold text-[#32D74B]">{stream.estMonthly}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="text-[#00B7FF]">{stream.category}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400">EFFORT: {stream.effort}</span>
                </div>
                <p className="text-[11px] text-slate-400">{stream.summary}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Earnings Intelligence & Encyclopedia */}
        <div className="space-y-4">
          <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#32D74B]" />
              <h3 className="text-sm font-semibold text-white">EARNINGS INTELLIGENCE</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="rounded-lg border border-[#1E273B] bg-[#111623] p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#00B7FF]" />
                  <span>Top Risk-Free Yield</span>
                </div>
                <span className="font-mono text-[#32D74B]">Bank Bonuses</span>
              </div>
              <div className="rounded-lg border border-[#1E273B] bg-[#111623] p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-[#00B7FF]" />
                  <span>Highest Hourly Ceiling</span>
                </div>
                <span className="font-mono text-[#32D74B]">Freelancing / AI</span>
              </div>
              <div className="rounded-lg border border-[#1E273B] bg-[#111623] p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#00B7FF]" />
                  <span>Geo-Local Signals</span>
                </div>
                <span className="font-mono text-[#00B7FF]">Active</span>
              </div>
            </div>
          </div>

          <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#00B7FF]" />
              <h3 className="text-sm font-semibold text-white">EARNINGS ENCYCLOPEDIA</h3>
            </div>
            <p className="text-xs text-slate-400">
              Playbooks for cashback stacking, bank bonus direct-deposit rules, 1099 tax reserves, AI evaluation
              platforms, and local asset monetization—strictly fiat &amp; real-economy.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#32D74B]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>VERIFIED NON-CRYPTO DOMAIN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsWorld;
