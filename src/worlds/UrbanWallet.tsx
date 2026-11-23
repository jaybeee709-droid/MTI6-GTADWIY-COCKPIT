import React, { useState } from 'react';
import {
  AlertOctagon,
  ArrowLeftRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Eye,
  Gift,
  Landmark,
  Lock,
  PieChart,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';

type WalletSection =
  | 'Overview'
  | 'Cash'
  | 'Black Cards'
  | 'Accounts'
  | 'Rewards'
  | 'Gift Cards'
  | 'Transactions'
  | 'Transfers / Settlement Rails'
  | 'Budgeting'
  | 'Financial Intelligence';

const SECTIONS: WalletSection[] = [
  'Overview',
  'Cash',
  'Black Cards',
  'Accounts',
  'Rewards',
  'Gift Cards',
  'Transactions',
  'Transfers / Settlement Rails',
  'Budgeting',
  'Financial Intelligence',
];

const SETTLEMENT_RAILS = [
  {
    id: 'RAIL-A',
    pair: 'RAIL-A USD/JPY',
    corridor: 'New York Fedwire ↔ Tokyo BOJ-NET',
    status: 'EXECUTE DISABLED / READ-ONLY',
    readOnly: true,
    mismatch: true,
    mismatchMessage:
      'RECONCILIATION MISMATCH (-¥142,500 / -$934.12): Ledger hash divergence between Tokyo custodian and STAR Treasury. Execution locked until manual sign-off.',
    balance: '$412,800.00 / ¥62,940,000',
    lastSync: '14:04:11 UTC',
  },
  {
    id: 'RAIL-B',
    pair: 'RAIL-B EUR',
    corridor: 'SEPA Instant ↔ Frankfurt TARGET2',
    status: 'ACTIVE · EXECUTE READY',
    readOnly: false,
    mismatch: false,
    mismatchMessage: '',
    balance: '€285,400.00',
    lastSync: '14:04:48 UTC',
  },
  {
    id: 'RAIL-C',
    pair: 'RAIL-C GBP/CAD',
    corridor: 'London CHAPS ↔ Toronto Lynx',
    status: 'ACTIVE · EXECUTE READY',
    readOnly: false,
    mismatch: false,
    mismatchMessage: '',
    balance: '£118,250.00 / C$204,900.00',
    lastSync: '14:04:45 UTC',
  },
];

const BLACK_CARDS = [
  {
    name: 'MTI6 Obsidian Black',
    last4: '8841',
    limit: '$250,000',
    spent: '$18,420',
    tier: '5.0x Sovereign Points',
    frozen: false,
  },
  {
    name: 'Urban Executive Titanium',
    last4: '4019',
    limit: '$100,000',
    spent: '$6,190',
    tier: '3.5% Cashback + FX Zero',
    frozen: false,
  },
];

const TRANSACTIONS = [
  { id: 'TX-9041', merchant: 'AWS Cloud Infrastructure', category: 'Infra', amount: '-$2,410.00', date: 'Today, 13:42', rail: 'Black Card •8841' },
  { id: 'TX-9040', merchant: 'SEPA Treasury Settlement', category: 'Transfer', amount: '+€15,000.00', date: 'Today, 11:18', rail: 'RAIL-B EUR' },
  { id: 'TX-9039', merchant: 'Bloomberg Terminal Pro', category: 'Data', amount: '-$2,200.00', date: 'Yesterday', rail: 'Black Card •4019' },
  { id: 'TX-9038', merchant: 'Sovereign Lounge & Travel', category: 'Travel', amount: '-$840.50', date: 'Nov 20', rail: 'Black Card •8841' },
];

export const UrbanWallet: React.FC = () => {
  const [activeSection, setActiveSection] = useState<WalletSection>('Overview');
  const [selectedRail, setSelectedRail] = useState<string>('RAIL-A');

  return (
    <div className="space-y-6 text-white">
      {/* Top Header */}
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00B7FF]/15 text-[#00B7FF] border border-[#00B7FF]/30">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Urban Wallet &amp; Treasury</h2>
              <p className="text-xs text-[#B8B8B8]">
                Multi-currency cash, Black Cards, settlement rails, budgeting &amp; STAR Accountant oversight
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-[#151515] px-4 py-2 text-right">
              <div className="text-[10px] uppercase text-[#B8B8B8]">Total Liquid Balance</div>
              <div className="text-base font-bold text-white">$1,184,920.45</div>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {SECTIONS.map((sec) => {
            const active = activeSection === sec;
            return (
              <button
                key={sec}
                onClick={() => setActiveSection(sec)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'bg-[#00B7FF] text-black font-semibold'
                    : 'bg-[#151515] text-[#B8B8B8] hover:bg-[#202020] hover:text-white'
                }`}
              >
                {sec}
              </button>
            );
          })}
        </div>
      </div>

      {/* Persistent #FF3B30 RAIL-A Reconciliation Mismatch Banner */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
        style={{
          backgroundColor: 'rgba(255, 59, 48, 0.12)',
          borderColor: '#FF3B30',
        }}
      >
        <div className="flex items-start gap-3">
          <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0 text-[#FF3B30]" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF3B30]">
                RAIL-A USD/JPY Reconciliation Mismatch Alert
              </span>
              <span className="rounded bg-[#FF3B30]/20 px-2 py-0.5 text-[10px] font-bold text-[#FF3B30] border border-[#FF3B30]/40">
                EXECUTE DISABLED / READ-ONLY
              </span>
            </div>
            <p className="mt-1 text-xs text-white/90">
              Custodian balance diverges by -¥142,500 (-$934.12) from STAR Treasury ledger. Transfers on RAIL-A are locked to Read-Only.
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveSection('Transfers / Settlement Rails')}
          className="rounded-lg border border-[#FF3B30]/60 bg-[#FF3B30]/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#FF3B30]/30"
        >
          Inspect Rail
        </button>
      </div>

      {/* STAR Accountant Review Card */}
      <div className="rounded-2xl border border-[#8B5CFF]/35 bg-[#101010] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CFF]/15 text-[#8B5CFF] border border-[#8B5CFF]/35">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">STAR Accountant Review</h3>
                <span className="rounded-full bg-[#FFB800]/15 px-2 py-0.5 text-[10px] font-semibold text-[#FFB800]">
                  1 Exception Flagged
                </span>
              </div>
              <p className="mt-1 text-xs text-[#B8B8B8]">
                Automated daily close: Cash &amp; Black Card ledgers reconciled (99.92%). RAIL-A USD/JPY variance isolated; RAIL-B EUR and RAIL-C GBP/CAD cleared for execution. Monthly burn is 11.4% under budget.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#B8B8B8]">
            <CheckCircle2 className="h-4 w-4 text-[#32D74B]" />
            <span>Last Audit: 14:04 UTC</span>
          </div>
        </div>
      </div>

      {/* Main Dynamic Section Content */}
      {activeSection === 'Overview' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#101010] p-4">
            <div className="flex items-center justify-between text-xs text-[#B8B8B8]">
              <span>Cash Reserves</span>
              <DollarSign className="h-4 w-4 text-[#32D74B]" />
            </div>
            <div className="mt-2 text-xl font-bold">$642,100.00</div>
            <div className="mt-1 text-[11px] text-[#32D74B]">+4.82% APY Treasury Sweep</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#101010] p-4">
            <div className="flex items-center justify-between text-xs text-[#B8B8B8]">
              <span>Black Cards Spend</span>
              <CreditCard className="h-4 w-4 text-[#00B7FF]" />
            </div>
            <div className="mt-2 text-xl font-bold">$24,610.00</div>
            <div className="mt-1 text-[11px] text-[#B8B8B8]">$350,000 combined limit</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#101010] p-4">
            <div className="flex items-center justify-between text-xs text-[#B8B8B8]">
              <span>Rewards &amp; Gift Vault</span>
              <Gift className="h-4 w-4 text-[#8B5CFF]" />
            </div>
            <div className="mt-2 text-xl font-bold">482,900 pts</div>
            <div className="mt-1 text-[11px] text-[#8B5CFF]">≈ $7,243.50 + $1,850 Gift Cards</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#101010] p-4">
            <div className="flex items-center justify-between text-xs text-[#B8B8B8]">
              <span>Settlement Rails</span>
              <ArrowLeftRight className="h-4 w-4 text-[#FF3B30]" />
            </div>
            <div className="mt-2 text-xl font-bold">2 Active / 1 Locked</div>
            <div className="mt-1 text-[11px] text-[#FF3B30]">RAIL-A Read-Only (Mismatch)</div>
          </div>
        </div>
      )}

      {activeSection === 'Cash' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { ccy: 'USD · Primary Operating', bal: '$412,800.00', apy: '4.85% APY' },
            { ccy: 'EUR · European Liquidity', bal: '€285,400.00', apy: '3.40% APY' },
            { ccy: 'GBP / CAD · Commonwealth', bal: '£118,250 / C$204,900', apy: '4.10% APY' },
          ].map((item) => (
            <div key={item.ccy} className="rounded-2xl border border-white/10 bg-[#101010] p-5">
              <div className="text-xs text-[#B8B8B8]">{item.ccy}</div>
              <div className="mt-2 text-xl font-bold">{item.bal}</div>
              <div className="mt-2 text-xs text-[#32D74B]">{item.apy}</div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'Black Cards' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {BLACK_CARDS.map((card) => (
            <div
              key={card.last4}
              className="rounded-2xl border border-white/15 bg-gradient-to-br from-[#181818] to-[#0A0A0A] p-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{card.name}</span>
                <CreditCard className="h-5 w-5 text-[#00B7FF]" />
              </div>
              <div className="mt-6 font-mono text-lg tracking-widest text-white/90">
                •••• •••• •••• {card.last4}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-[#B8B8B8]">
                <span>Cycle Spend: <strong className="text-white">{card.spent}</strong> / {card.limit}</span>
                <span className="text-[#00B7FF]">{card.tier}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'Accounts' && (
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-3">
          <h3 className="text-sm font-semibold">Connected Banking &amp; Custody Accounts</h3>
          {[
            { bank: 'JPMorgan Chase Private Client', mask: '••9912', status: 'Synced', bal: '$412,800.00' },
            { bank: 'Mercury Treasury Sweep', mask: '••3104', status: 'Synced', bal: '$229,300.00' },
            { bank: 'MUFG Tokyo FX Custody', mask: '••7740', status: 'Mismatch Flagged', bal: '¥62,940,000' },
          ].map((acc) => (
            <div key={acc.mask} className="flex items-center justify-between rounded-xl bg-[#151515] p-3.5 text-xs">
              <div className="flex items-center gap-3">
                <Landmark className="h-4 w-4 text-[#00B7FF]" />
                <div>
                  <div className="font-semibold text-white">{acc.bank} ({acc.mask})</div>
                  <div className={acc.status === 'Synced' ? 'text-[#32D74B]' : 'text-[#FF3B30]'}>{acc.status}</div>
                </div>
              </div>
              <div className="font-mono text-sm font-semibold">{acc.bal}</div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'Rewards' && (
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-[#151515] p-4">
            <div className="text-xs text-[#B8B8B8]">Sovereign Points Balance</div>
            <div className="mt-1 text-2xl font-bold text-[#00B7FF]">482,900 pts</div>
            <div className="mt-1 text-xs text-[#B8B8B8]">1.5¢/pt Travel &amp; Airline Transfer</div>
          </div>
          <div className="rounded-xl bg-[#151515] p-4">
            <div className="text-xs text-[#B8B8B8]">Cashback Accrued (YTD)</div>
            <div className="mt-1 text-2xl font-bold text-[#32D74B]">$6,420.18</div>
            <div className="mt-1 text-xs text-[#B8B8B8]">Auto-swept to USD Treasury</div>
          </div>
          <div className="rounded-xl bg-[#151515] p-4">
            <div className="text-xs text-[#B8B8B8]">Active Multiplier</div>
            <div className="mt-1 text-2xl font-bold text-[#8B5CFF]">5.0x</div>
            <div className="mt-1 text-xs text-[#B8B8B8]">Cloud, AI &amp; Sovereign Travel</div>
          </div>
        </div>
      )}

      {activeSection === 'Gift Cards' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { brand: 'Apple Store Sovereign', bal: '$750.00', code: 'APL-•••-991' },
            { brand: 'Amazon Corporate', bal: '$600.00', code: 'AMZ-•••-442' },
            { brand: 'Delta Air Lines', bal: '$500.00', code: 'DAL-•••-108' },
          ].map((gc) => (
            <div key={gc.brand} className="rounded-2xl border border-white/10 bg-[#101010] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{gc.brand}</span>
                <Gift className="h-4 w-4 text-[#8B5CFF]" />
              </div>
              <div className="mt-2 text-xl font-bold text-white">{gc.bal}</div>
              <div className="mt-1 font-mono text-xs text-[#B8B8B8]">{gc.code}</div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'Transactions' && (
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-2">
          <h3 className="text-sm font-semibold mb-3">Recent Ledger Transactions</h3>
          {TRANSACTIONS.map((tx) => (
            <div key={tx.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#151515] p-3 text-xs">
              <div>
                <div className="font-semibold text-white">{tx.merchant}</div>
                <div className="text-[#B8B8B8]">{tx.id} · {tx.category} · {tx.rail} · {tx.date}</div>
              </div>
              <div className={`font-mono text-sm font-semibold ${tx.amount.startsWith('+') ? 'text-[#32D74B]' : 'text-white'}`}>
                {tx.amount}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'Transfers / Settlement Rails' && (
        <div className="space-y-4">
          {SETTLEMENT_RAILS.map((rail) => (
            <div
              key={rail.id}
              onClick={() => setSelectedRail(rail.id)}
              className={`cursor-pointer rounded-2xl border p-5 transition ${
                selectedRail === rail.id ? 'ring-1 ring-[#00B7FF]' : ''
              }`}
              style={{
                backgroundColor: '#101010',
                borderColor: rail.mismatch ? '#FF3B30' : 'rgba(255,255,255,0.12)',
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{rail.pair}</span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                      style={{
                        backgroundColor: rail.readOnly ? 'rgba(255, 59, 48, 0.18)' : 'rgba(50, 215, 75, 0.15)',
                        color: rail.readOnly ? '#FF3B30' : '#32D74B',
                        border: `1px solid ${rail.readOnly ? '#FF3B30' : 'rgba(50, 215, 75, 0.4)'}`,
                      }}
                    >
                      {rail.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#B8B8B8]">{rail.corridor} · Last sync {rail.lastSync}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-[#B8B8B8]">Rail Liquidity</div>
                    <div className="font-mono text-sm font-semibold">{rail.balance}</div>
                  </div>
                  <button
                    disabled={rail.readOnly}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                      rail.readOnly
                        ? 'cursor-not-allowed bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/40'
                        : 'bg-[#00B7FF] text-black hover:brightness-110'
                    }`}
                  >
                    {rail.readOnly ? (
                      <>
                        <Lock className="h-3.5 w-3.5" /> Read-Only
                      </>
                    ) : (
                      <>
                        <ArrowLeftRight className="h-3.5 w-3.5" /> Execute Transfer
                      </>
                    )}
                  </button>
                </div>
              </div>

              {rail.mismatch && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#FF3B30]/15 p-3 text-xs text-[#FF3B30] border border-[#FF3B30]/40">
                  <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{rail.mismatchMessage}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeSection === 'Budgeting' && (
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-[#00B7FF]" /> Monthly Operating Budgets
            </h3>
            <span className="text-xs text-[#32D74B]">11.4% Under Total Cap</span>
          </div>
          {[
            { cat: 'Compute & AI Infrastructure', spent: 6400, cap: 9000 },
            { cat: 'Market Data & Feeds', spent: 3100, cap: 4000 },
            { cat: 'Travel & Executive Ops', spent: 2850, cap: 5000 },
          ].map((b) => {
            const pct = Math.round((b.spent / b.cap) * 100);
            return (
              <div key={b.cat} className="rounded-xl bg-[#151515] p-3.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{b.cat}</span>
                  <span className="text-[#B8B8B8]">${b.spent.toLocaleString()} / ${b.cap.toLocaleString()} ({pct}%)</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-[#202020]">
                  <div className="h-2 rounded-full bg-[#00B7FF]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeSection === 'Financial Intelligence' && (
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#8B5CFF]" />
            <h3 className="text-sm font-semibold">Financial Intelligence &amp; Cashflow Forecasting</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-[#151515] p-4">
              <div className="flex items-center gap-1.5 text-xs text-[#B8B8B8]">
                <TrendingUp className="h-3.5 w-3.5 text-[#32D74B]" /> 90-Day Net Cashflow
              </div>
              <div className="mt-1 text-xl font-bold text-[#32D74B]">+$148,200</div>
            </div>
            <div className="rounded-xl bg-[#151515] p-4">
              <div className="flex items-center gap-1.5 text-xs text-[#B8B8B8]">
                <Eye className="h-3.5 w-3.5 text-[#00B7FF]" /> FX Exposure Alert
              </div>
              <div className="mt-1 text-sm font-semibold text-white">JPY Unhedged: 14.2%</div>
            </div>
            <div className="rounded-xl bg-[#151515] p-4">
              <div className="flex items-center gap-1.5 text-xs text-[#B8B8B8]">
                <Shield className="h-3.5 w-3.5 text-[#8B5CFF]" /> Treasury Runway
              </div>
              <div className="mt-1 text-xl font-bold text-white">48+ Months</div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#151515] p-3 text-xs text-[#B8B8B8]">
            <span>STAR Liquidity Recommendation: Sweep $45,000 idle checking into 4.85% Treasury Vault.</span>
            <RefreshCw className="h-3.5 w-3.5 text-[#00B7FF]" />
          </div>
        </div>
      )}
    </div>
  );
};

export default UrbanWallet;
