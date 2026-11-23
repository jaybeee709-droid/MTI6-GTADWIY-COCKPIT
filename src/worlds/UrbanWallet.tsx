import React, { useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  DollarSign,
  Eye,
  Gift,
  Landmark,
  Lock,
  PieChart,
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

// All three settlement rails are READ-ONLY / DISABLED by design.
// Execution is off — no rail is ever "execute ready" in this build.
// Balances are UNAVAILABLE: no bank, custodian, or ledger feed is
// connected, so no balance, sync time, or reconciliation figure is claimed.
const SETTLEMENT_RAILS = [
  { id: 'RAIL-A', pair: 'RAIL-A USD/JPY', corridor: 'New York Fedwire ↔ Tokyo BOJ-NET' },
  { id: 'RAIL-B', pair: 'RAIL-B EUR', corridor: 'SEPA Instant ↔ Frankfurt TARGET2' },
  { id: 'RAIL-C', pair: 'RAIL-C GBP/CAD', corridor: 'London CHAPS ↔ Toronto Lynx' },
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
              <p className="text-xs text-[#B8B8B8] mt-0.5">
                READ-ONLY / DISABLED by design — no account feed is connected, so every balance below is
                UNAVAILABLE, never zero.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-[#151515] px-4 py-2 text-right">
              <div className="text-[10px] uppercase text-[#B8B8B8]">Total Liquid Balance</div>
              <div className="text-base font-bold text-white">UNAVAILABLE</div>
              <div className="text-[10px] text-[#B8B8B8]">NOT_CONNECTED · NO_DATA</div>
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

      {/* Honest reconciliation note — no mismatch figure is claimed */}
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-4">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#B8B8B8]" />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Reconciliation state: UNAVAILABLE
            </span>
            <p className="mt-1 text-xs text-white/90">
              No ledger feed is connected, so no reconciliation result — match or mismatch — can be claimed.
              All rails are READ-ONLY / DISABLED regardless.
            </p>
          </div>
        </div>
      </div>

      {/* STAR Accountant Review Card — honest state only */}
      <div className="rounded-2xl border border-[#8B5CFF]/35 bg-[#101010] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CFF]/15 text-[#8B5CFF] border border-[#8B5CFF]/35">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">STAR Accountant Review</h3>
              <p className="mt-1 text-xs text-[#B8B8B8]">
                STAR is demo / NOT_CONNECTED in this build. No audit, reconciliation percentage, burn figure,
                or execution clearance is claimed.
              </p>
            </div>
          </div>
          <div className="text-xs text-[#B8B8B8]">Last Audit: NO_DATA</div>
        </div>
      </div>

      {/* Main Dynamic Section Content */}
      {activeSection === 'Overview' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#101010] p-4">
            <div className="flex items-center justify-between text-xs text-[#B8B8B8]">
              <span>Cash Reserves</span>
              <DollarSign className="h-4 w-4 text-[#B8B8B8]" />
            </div>
            <div className="mt-2 text-xl font-bold">UNAVAILABLE</div>
            <div className="mt-1 text-[11px] text-[#B8B8B8]">NOT_CONNECTED · NO_DATA · no APY claimed</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#101010] p-4">
            <div className="flex items-center justify-between text-xs text-[#B8B8B8]">
              <span>Black Cards Spend</span>
              <CreditCard className="h-4 w-4 text-[#00B7FF]" />
            </div>
            <div className="mt-2 text-xl font-bold">UNAVAILABLE</div>
            <div className="mt-1 text-[11px] text-[#B8B8B8]">NOT_CONNECTED · NO_DATA · no limit claimed</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#101010] p-4">
            <div className="flex items-center justify-between text-xs text-[#B8B8B8]">
              <span>Rewards &amp; Gift Vault</span>
              <Gift className="h-4 w-4 text-[#8B5CFF]" />
            </div>
            <div className="mt-2 text-xl font-bold">UNAVAILABLE</div>
            <div className="mt-1 text-[11px] text-[#8B5CFF]">NOT_CONNECTED · NO_DATA</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#101010] p-4">
            <div className="flex items-center justify-between text-xs text-[#B8B8B8]">
              <span>Settlement Rails</span>
              <ArrowLeftRight className="h-4 w-4 text-[#FF3B30]" />
            </div>
            <div className="mt-2 text-xl font-bold">3 rails · READ-ONLY</div>
            <div className="mt-1 text-[11px] text-[#B8B8B8]">Execution DISABLED on every rail</div>
          </div>
        </div>
      )}

      {activeSection === 'Cash' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {['USD · Primary Operating', 'EUR · European Liquidity', 'GBP / CAD · Commonwealth'].map((ccy) => (
            <div key={ccy} className="rounded-2xl border border-white/10 bg-[#101010] p-5">
              <div className="text-xs text-[#B8B8B8]">{ccy}</div>
              <div className="mt-2 text-xl font-bold">UNAVAILABLE</div>
              <div className="mt-2 text-xs text-[#B8B8B8]">Balance: UNAVAILABLE · APY: NO_DATA</div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'Black Cards' && (
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-2">
          <h3 className="text-sm font-semibold">Black Cards</h3>
          <p className="text-xs text-[#B8B8B8]">
            No card feed is connected. No card name, number, limit, spend, tier, or freeze state is claimed.
          </p>
          <p className="text-xs font-mono text-[#B8B8B8]">CARDS: NO_DATA · NOT_CONNECTED</p>
        </div>
      )}

      {activeSection === 'Accounts' && (
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-3">
          <h3 className="text-sm font-semibold">Connected Banking &amp; Custody Accounts</h3>
          <p className="text-xs text-[#B8B8B8]">
            No banking or custody account is connected. No institution, account, sync state, or balance is
            claimed.
          </p>
          <div className="flex items-center gap-3 rounded-xl bg-[#151515] p-3.5 text-xs">
            <Landmark className="h-4 w-4 text-[#00B7FF]" />
            <div>
              <div className="font-semibold text-white">No account connected</div>
              <div className="text-[#B8B8B8]">NOT_CONNECTED · Balance: UNAVAILABLE</div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'Rewards' && (
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-[#151515] p-4">
            <div className="text-xs text-[#B8B8B8]">Points Balance</div>
            <div className="mt-1 text-2xl font-bold text-[#00B7FF]">UNAVAILABLE</div>
            <div className="mt-1 text-xs text-[#B8B8B8]">NOT_CONNECTED · NO_DATA</div>
          </div>
          <div className="rounded-xl bg-[#151515] p-4">
            <div className="text-xs text-[#B8B8B8]">Cashback Accrued</div>
            <div className="mt-1 text-2xl font-bold text-[#B8B8B8]">UNAVAILABLE</div>
            <div className="mt-1 text-xs text-[#B8B8B8]">NOT_CONNECTED · NO_DATA</div>
          </div>
          <div className="rounded-xl bg-[#151515] p-4">
            <div className="text-xs text-[#B8B8B8]">Active Multiplier</div>
            <div className="mt-1 text-2xl font-bold text-[#8B5CFF]">NO_DATA</div>
            <div className="mt-1 text-xs text-[#B8B8B8]">NOT_CONNECTED</div>
          </div>
        </div>
      )}

      {activeSection === 'Gift Cards' && (
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-2">
          <h3 className="text-sm font-semibold">Gift Cards</h3>
          <p className="text-xs text-[#B8B8B8]">
            No gift card feed is connected. No brand, balance, or code is claimed.
          </p>
          <p className="text-xs font-mono text-[#B8B8B8]">GIFT CARDS: NO_DATA · NOT_CONNECTED</p>
        </div>
      )}

      {activeSection === 'Transactions' && (
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-2">
          <h3 className="text-sm font-semibold mb-3">Recent Ledger Transactions</h3>
          <p className="text-xs text-[#B8B8B8]">
            No transaction feed is connected. No merchant, amount, date, or rail is claimed.
          </p>
          <p className="text-xs font-mono text-[#B8B8B8]">TRANSACTIONS: NO_DATA · 0 RECORDS SHOWN</p>
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
              style={{ backgroundColor: '#101010', borderColor: 'rgba(255,255,255,0.12)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{rail.pair}</span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                      style={{
                        backgroundColor: 'rgba(255, 59, 48, 0.18)',
                        color: '#FF3B30',
                        border: '1px solid #FF3B30',
                      }}
                    >
                      READ-ONLY / DISABLED
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#B8B8B8]">{rail.corridor} · Last sync NO_DATA</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-[#B8B8B8]">Rail Liquidity</div>
                    <div className="font-mono text-sm font-semibold">UNAVAILABLE</div>
                  </div>
                  <button
                    disabled
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold cursor-not-allowed bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/40"
                  >
                    <Lock className="h-3.5 w-3.5" /> Read-Only
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs text-[#B8B8B8]">
                Execution is disabled by design. No transfer can be staged or sent from this rail.
              </p>
            </div>
          ))}

          {/* SETTLEMENT FAMILY GRID (Gemini family 17 adoption,
              2026-11-23): the concept's desktop settlement blocks,
              laid over the rails above. No settlement feed is
              connected — every block is read-only with NO DATA. */}
          <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Settlement Family</h3>
              <span className="font-mono text-[10px] text-[#B8B8B8]">
                READ-ONLY · EXECUTION DISABLED
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {[
                { name: 'FX NETTING', note: 'NETTING TOTALS: NO DATA' },
                { name: 'USD CASH MANAGEMENT', note: 'BALANCE: UNAVAILABLE' },
                { name: 'GBP CLEARING', note: 'CLEARING STATUS: NO DATA' },
                { name: 'JPY PAYMENTS', note: 'PAYMENTS: NO DATA · 0 RECORDS' },
                { name: 'SGD LIQUIDITY', note: 'LIQUIDITY: UNAVAILABLE' },
                { name: 'STAR ACCOUNTANT', note: 'LEDGER VIEW ONLY · NO ENTRIES' },
              ].map((b) => (
                <div key={b.name} className="space-y-1.5 rounded-xl bg-[#151515] p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">{b.name}</span>
                    <span className="rounded border border-white/15 bg-[#050505] px-1.5 py-0.5 font-mono text-[9px] text-[#B8B8B8]">
                      NOT CONNECTED
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-[#B8B8B8]">{b.note}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#B8B8B8]">
              Concept settlement totals are not carried over — a block
              shows a figure only when a sourced feed reports it.
            </p>
          </div>
        </div>
      )}

      {activeSection === 'Budgeting' && (
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-[#00B7FF]" /> Monthly Operating Budgets
            </h3>
            <span className="text-xs text-[#B8B8B8]">NO_DATA</span>
          </div>
          <p className="text-xs text-[#B8B8B8]">
            No budget or spend feed is connected. No category, spend, cap, or percentage is claimed.
          </p>
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
                <TrendingUp className="h-3.5 w-3.5 text-[#B8B8B8]" /> 90-Day Net Cashflow
              </div>
              <div className="mt-1 text-xl font-bold text-white">NO_DATA</div>
            </div>
            <div className="rounded-xl bg-[#151515] p-4">
              <div className="flex items-center gap-1.5 text-xs text-[#B8B8B8]">
                <Eye className="h-3.5 w-3.5 text-[#00B7FF]" /> FX Exposure
              </div>
              <div className="mt-1 text-sm font-semibold text-white">NO_DATA</div>
            </div>
            <div className="rounded-xl bg-[#151515] p-4">
              <div className="flex items-center gap-1.5 text-xs text-[#B8B8B8]">
                <Shield className="h-3.5 w-3.5 text-[#8B5CFF]" /> Treasury Runway
              </div>
              <div className="mt-1 text-xl font-bold text-white">NO_DATA</div>
            </div>
          </div>
          <p className="text-xs text-[#B8B8B8]">
            No liquidity recommendation is made — no sweep, rate, or forecast is claimed. Status:
            NOT_CONNECTED · NO_DATA.
          </p>
        </div>
      )}
    </div>
  );
};

export default UrbanWallet;
