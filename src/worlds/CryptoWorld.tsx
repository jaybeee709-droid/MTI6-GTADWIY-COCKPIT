import React, { useState } from 'react';
import {
  Coins,
  Lock,
  ShieldAlert,
  Network,
  Wallet,
  BookOpen,
  Activity,
  Layers,
  Database,
  ArrowLeftRight,
} from 'lucide-react';
import {
  CRYPTO_WORLD_CONTENTS,
  CRYPTO_CONTENT_GROUPS,
  RULE_COVERED_EXTRAS,
  RULE_NOTE,
  MEMBERSHIP_RULE,
  type CryptoGroup,
} from '../worlds-data';

export type CryptoSectionId =
  | 'Dashboard'
  | 'Intelligence'
  | 'Networks'
  | 'Assets'
  | 'Protocols'
  | 'Activities'
  | 'Portfolio'
  | 'Positions'
  | 'Cost Engine'
  | 'Encyclopedia';

const CRYPTO_SECTIONS: CryptoSectionId[] = [
  'Dashboard',
  'Intelligence',
  'Networks',
  'Assets',
  'Protocols',
  'Activities',
  'Portfolio',
  'Positions',
  'Cost Engine',
  'Encyclopedia',
];

// Each section tab filters the content — the grid is never identical on
// every tab. Groups are a UI-only grouping (see worlds-data.ts), not a
// canonical classification.
function sectionGroup(section: CryptoSectionId): CryptoGroup | 'ALL' | null {
  switch (section) {
    case 'Dashboard':
    case 'Activities':
      return 'ALL';
    case 'Networks':
      return 'Infrastructure';
    case 'Assets':
      return 'Assets & Sectors';
    case 'Protocols':
      return 'Yield & Credit';
    case 'Intelligence':
      return 'Markets';
    default:
      return null;
  }
}

const NETWORKS = [
  { name: 'Ethereum Mainnet', chainId: '1', status: 'NOT_CONNECTED' },
  { name: 'Arbitrum One', chainId: '42161', status: 'NOT_CONNECTED' },
  { name: 'Base', chainId: '8453', status: 'NOT_CONNECTED' },
  { name: 'Solana', chainId: 'mainnet-beta', status: 'NOT_CONNECTED' },
  { name: 'Bitcoin', chainId: 'btc-l1', status: 'NOT_CONNECTED' },
];

export interface CryptoWorldProps {
  /** Phase 1, package 4: navigate to the Crypto Workspaces index route. */
  onOpenWorkspaces?: () => void;
}

export const CryptoWorld: React.FC<CryptoWorldProps> = ({ onOpenWorkspaces }) => {
  const [activeSection, setActiveSection] = useState<CryptoSectionId>('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const group = sectionGroup(activeSection);
  const visibleContents =
    group === null
      ? []
      : group === 'ALL'
        ? CRYPTO_WORLD_CONTENTS
        : CRYPTO_WORLD_CONTENTS.filter((name) => CRYPTO_CONTENT_GROUPS[name] === group);

  const filteredContents = visibleContents.filter((name) =>
    name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const filteredExtras = RULE_COVERED_EXTRAS.filter((name) =>
    name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const showExtras = activeSection === 'Dashboard' || activeSection === 'Activities';

  return (
    <div className="min-h-screen bg-[#06070B] text-slate-100 p-4 md:p-6 space-y-5">
      {/* Header & Mandatory Read-Only / Boundary Pills */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#111623] border border-[#1E273B] flex items-center justify-center text-sky-400">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-wide text-white">CRYPTO WORLD · STRICTLY ON-CHAIN</h1>
            <p className="text-xs text-slate-400">
              Everything crypto only · {CRYPTO_WORLD_CONTENTS.length} named contents (owner directive 2026-11-22)
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{MEMBERSHIP_RULE.cryptoWorld}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-amber-500/10 border border-amber-500/40 text-amber-300">
            EXECUTE DISABLED / READ-ONLY
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-[#111623] border border-[#1E273B] text-slate-300">
            NOT_CONNECTED
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-[#111623] border border-[#1E273B] text-slate-400">
            NO_DATA
          </span>
          {onOpenWorkspaces && (
            <button
              type="button"
              onClick={onOpenWorkspaces}
              className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-purple-500/10 border border-purple-500/40 text-purple-300 hover:bg-purple-500/20 transition"
            >
              56 WORKSPACES →
            </button>
          )}
        </div>
      </div>

      {/* Section Navigation — each tab filters the content below */}
      <div className="flex flex-wrap gap-2">
        {CRYPTO_SECTIONS.map((section) => {
          const isActive = section === activeSection;
          return (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition ${
                isActive
                  ? 'bg-[#111623] border-sky-400 text-white'
                  : 'bg-[#0C0F17] border-[#1E273B] text-slate-400 hover:text-slate-200'
              }`}
            >
              {section.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>WALLET / CUSTODY</span>
            <Wallet className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-sm font-mono font-semibold text-white">NOT_CONNECTED</div>
          <div className="text-[11px] text-slate-500">Signer &amp; key execution disabled</div>
        </div>

        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>PORTFOLIO / POSITIONS</span>
            <Database className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-sm font-mono font-semibold text-white">NO_DATA</div>
          <div className="text-[11px] text-slate-500">Read-only telemetry awaiting feed</div>
        </div>

        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>EXECUTION GUARD</span>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-sm font-mono font-semibold text-amber-300">EXECUTE DISABLED / READ-ONLY</div>
          <div className="text-[11px] text-slate-500">Zero transaction signing permitted</div>
        </div>

        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>NAMED CONTENTS</span>
            <Lock className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-sm font-mono font-semibold text-purple-300">{CRYPTO_WORLD_CONTENTS.length} CONTENTS</div>
          <div className="text-[11px] text-slate-500">Directive 2026-11-22 · no rates, no promises</div>
        </div>
      </div>

      {/* Section-Specific View */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-4">
          {group !== null ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-sky-400" />
                  <h2 className="text-sm font-semibold tracking-wide text-white">
                    {activeSection.toUpperCase()} · {filteredContents.length} OF {CRYPTO_WORLD_CONTENTS.length} NAMED CONTENTS
                    {group !== 'ALL' ? ` · GROUP: ${group.toUpperCase()} (UI GROUPING ONLY)` : ''}
                  </h2>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter contents..."
                  className="px-3 py-1.5 rounded-lg bg-[#111623] border border-[#1E273B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {filteredContents.map((name) => (
                  <div
                    key={name}
                    className="rounded-lg border border-[#1E273B] bg-[#111623] p-3 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{name}</div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {CRYPTO_CONTENT_GROUPS[name]} · UI GROUPING ONLY
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">Status: NOT_CONNECTED · Data: NO_DATA</p>
                    </div>
                    <div className="pt-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[9px] font-mono font-semibold bg-amber-500/10 border border-amber-500/40 text-amber-300">
                        EXECUTE DISABLED / READ-ONLY
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {showExtras && filteredExtras.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-semibold tracking-wide text-white">
                    RULE-COVERED — NOT NAMED CONTENTS
                  </h3>
                  <p className="text-[11px] text-slate-400">{RULE_NOTE}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {filteredExtras.map((name) => (
                      <div key={name} className="rounded-lg border border-[#1E273B] bg-[#111623] p-3 space-y-2">
                        <div className="text-xs font-semibold text-white">{name}</div>
                        <p className="text-[11px] text-slate-400">
                          Crypto World under the membership rule — not one of the 24 named contents.
                        </p>
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-mono font-semibold bg-[#111623] border border-[#1E273B] text-slate-400">
                          RULE-COVERED · NOT_CONNECTED · NO_DATA
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : activeSection === 'Portfolio' || activeSection === 'Positions' ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold tracking-wide text-white">
                {activeSection.toUpperCase()} · NO_DATA
              </h2>
              <p className="text-xs text-slate-400">
                No positions feed is connected. Positions value: UNAVAILABLE — never zero. No holdings, no
                balances, and no profit/loss figure are shown until a live read-only feed is connected.
              </p>
              <p className="text-xs font-mono text-slate-500">POSITIONS VALUE: UNAVAILABLE · RECORDS: NO_DATA</p>
            </div>
          ) : activeSection === 'Cost Engine' ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold tracking-wide text-white">COST ENGINE · NO_DATA</h2>
              <p className="text-xs text-slate-400">
                No gas, fee, or slippage feed is connected. Nothing here is an estimate of a real cost.
              </p>
              <p className="text-xs font-mono text-slate-500">GAS / PRIORITY EST.: NO_DATA · SLIPPAGE: NO_DATA</p>
            </div>
          ) : (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold tracking-wide text-white">CRYPTO ENCYCLOPEDIA · NO_DATA</h2>
              <p className="text-xs text-slate-400">
                The encyclopedia content has not been migrated into this build. No entries are shown here
                rather than invented ones. Status: NOT_CONNECTED · NO_DATA.
              </p>
            </div>
          )}
        </div>

        {/* Right: Networks, Cost Engine, Encyclopedia */}
        <div className="space-y-4">
          <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">NETWORKS &amp; ASSETS</h3>
            </div>
            <div className="space-y-2">
              {NETWORKS.map((net) => (
                <div
                  key={net.name}
                  className="rounded-lg border border-[#1E273B] bg-[#111623] px-3 py-2 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">{net.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">CHAIN: {net.chainId}</div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#06070B] border border-[#1E273B] text-slate-400">
                    {net.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">COST ENGINE &amp; INTELLIGENCE</h3>
            </div>
            <div className="rounded-lg border border-[#1E273B] bg-[#111623] p-3 text-xs text-slate-300 space-y-1">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-400">GAS / PRIORITY EST.</span>
                <span>NO_DATA</span>
              </div>
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-400">SLIPPAGE / MEV TAX</span>
                <span>NO_DATA</span>
              </div>
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-400">PROTOCOLS INDEXED</span>
                <span className="text-sky-300">READ-ONLY</span>
              </div>
            </div>
          </div>

          <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">CRYPTO ENCYCLOPEDIA</h3>
            </div>
            <p className="text-xs text-slate-400">
              Encyclopedia content has not been migrated into this build — no entries are shown rather than
              invented ones.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <Layers className="h-3.5 w-3.5" />
              <span>NOT_CONNECTED · NO_DATA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoWorld;
