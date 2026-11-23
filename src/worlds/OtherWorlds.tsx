import React, { useState } from 'react';
import {
  Accessibility,
  AlertOctagon,
  Bell,
  BookOpen,
  Bookmark,
  Bot,
  CheckCircle2,
  Compass,
  CreditCard,
  DollarSign,
  EyeOff,
  FileText,
  GitBranch,
  Globe,
  Key,
  Layers,
  Layout,
  Lock,
  MapPin,
  Palette,
  PieChart,
  Power,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  Volume2,
} from 'lucide-react';

/* ============================================================================
 * 1. OpportunitiesWorld
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

const OPPORTUNITIES = [
  { id: 'opp-1', title: 'SOL / Jito Restaking Basis', category: 'Trending', region: 'Global', score: 94, apy: '+18.4%', saved: true },
  { id: 'opp-2', title: 'NYC Real-World Tokenized T-Bills', category: 'Local', region: 'Local · NYC', score: 91, apy: '+5.15%', saved: false },
  { id: 'opp-3', title: 'ETH L2 Sequencer Fee Arb', category: 'Intelligence', region: 'Global', score: 88, apy: '+14.2%', saved: true },
  { id: 'opp-4', title: 'EUR/USD Carry Liquidity Pool', category: 'Discovery', region: 'Global', score: 84, apy: '+8.7%', saved: false },
];

export const OpportunitiesWorld: React.FC = () => {
  const [tab, setTab] = useState<OppTab>('Feed');
  const [savedIds, setSavedIds] = useState<string[]>(['opp-1', 'opp-3']);

  const toggleSave = (id: string) => {
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const visible = OPPORTUNITIES.filter((o) => {
    if (tab === 'Saved') return savedIds.includes(o.id);
    if (tab === 'Local') return o.region.startsWith('Local');
    if (tab === 'Global') return o.region === 'Global';
    if (tab === 'Trending') return o.score >= 88;
    return true;
  });

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
              Curated alpha across Feed, Discovery, Rankings, Trending, Local, Global &amp; STAR Intelligence
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visible.map((opp) => {
          const isSaved = savedIds.includes(opp.id);
          return (
            <div key={opp.id} className="rounded-2xl border border-white/10 bg-[#101010] p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{opp.title}</span>
                    <span className="rounded bg-[#8B5CFF]/20 px-2 py-0.5 text-[10px] font-semibold text-[#8B5CFF]">
                      Score {opp.score}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-[#B8B8B8]">
                    <span className="flex items-center gap-1">
                      {opp.region.startsWith('Local') ? <MapPin className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                      {opp.region}
                    </span>
                    <span className="text-[#32D74B] font-semibold">{opp.apy}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleSave(opp.id)}
                  className={`rounded-lg border p-2 transition ${
                    isSaved
                      ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-[#00B7FF]'
                      : 'border-white/10 bg-[#151515] text-[#B8B8B8]'
                  }`}
                >
                  <Bookmark className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-[#B8B8B8]">
                <span>View: {tab}</span>
                <span className="flex items-center gap-1 text-[#00B7FF]">
                  <Star className="h-3.5 w-3.5" /> STAR Verified
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. PositionsAssetsWorld
 * ============================================================================ */
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
            <div className="text-xl font-bold text-white">$2,842,610.00</div>
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
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-4">
          <div className="flex items-center justify-between text-xs text-[#B8B8B8]">
            <span>Crypto Positions</span>
            <Layers className="h-4 w-4 text-[#8B5CFF]" />
          </div>
          <div className="mt-2 text-xl font-bold">$1,625,840.00</div>
          <div className="mt-1 text-xs text-[#32D74B]">57.2% of Net Worth · +14.8% MTD</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-4">
          <div className="flex items-center justify-between text-xs text-[#B8B8B8]">
            <span>Cash &amp; FX Reserves</span>
            <DollarSign className="h-4 w-4 text-[#32D74B]" />
          </div>
          <div className="mt-2 text-xl font-bold">$1,184,920.45</div>
          <div className="mt-1 text-xs text-[#00B7FF]">41.7% of Net Worth · 4.6% Blended APY</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-4">
          <div className="flex items-center justify-between text-xs text-[#B8B8B8]">
            <span>Cards &amp; Points Value</span>
            <CreditCard className="h-4 w-4 text-[#00B7FF]" />
          </div>
          <div className="mt-2 text-xl font-bold">$31,849.55</div>
          <div className="mt-1 text-xs text-[#8B5CFF]">482,900 Sovereign Points Active</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 text-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Active View: {tab}</span>
          <span className="flex items-center gap-1 text-[#32D74B]">
            <TrendingUp className="h-4 w-4" /> Sharpe 2.41 · Max DD -3.8%
          </span>
        </div>
        <div className="space-y-2">
          {[
            { name: 'BTC Core Vault', weight: '32%', val: '$909,635', pnl: '+19.4%' },
            { name: 'ETH + L2 Staking', weight: '25%', val: '$716,205', pnl: '+11.2%' },
            { name: 'USD / EUR / GBP Treasury', weight: '41%', val: '$1,184,920', pnl: '+4.6%' },
            { name: 'Black Card Rewards & Points', weight: '2%', val: '$31,850', pnl: '+5.0x' },
          ].map((row) => (
            <div key={row.name} className="flex items-center justify-between rounded-xl bg-[#151515] p-3">
              <div>
                <div className="font-semibold text-white">{row.name}</div>
                <div className="text-[#B8B8B8]">Allocation: {row.weight}</div>
              </div>
              <div className="text-right font-mono">
                <div className="font-semibold text-white">{row.val}</div>
                <div className="text-[#32D74B]">{row.pnl}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. EncyclopediaWorld
 * ============================================================================ */
const ENCYCLOPEDIA_TREE = {
  Family: ['Capital Markets', 'Treasury & FX', 'Autonomous Operations'],
  'Major Activity': ['Liquidity Provision', 'Delta-Neutral Carry', 'Rail Reconciliation'],
  Type: ['Perpetual Funding Arb', 'Spot-Futures Basis', 'Cross-Border Settlement'],
  Strategy: ['STAR Adaptive Basis v4', 'BOJ-NET Read-Only Guard', 'Multi-Venue TWAP'],
  Action: ['Stage Hedge Order', 'Lock Execution Rail', 'Rebalance Vault'],
  'Sub-Action': ['Verify Margin Buffer', 'Emit Audit Hash', 'Notify STAR Orb'],
};

const DRILL_LEVELS = [
  'Family',
  'Major Activity',
  'Type',
  'Strategy',
  'Action',
  'Sub-Action',
] as const;

export const EncyclopediaWorld: React.FC = () => {
  const [selected, setSelected] = useState<Record<string, string>>({
    Family: 'Capital Markets',
    'Major Activity': 'Delta-Neutral Carry',
    Type: 'Perpetual Funding Arb',
    Strategy: 'STAR Adaptive Basis v4',
    Action: 'Stage Hedge Order',
    'Sub-Action': 'Verify Margin Buffer',
  });

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
          </div>
        </div>

        {/* Breadcrumb Path */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-xl bg-[#151515] p-3 text-xs">
          {DRILL_LEVELS.map((lvl, idx) => (
            <React.Fragment key={lvl}>
              <span className="rounded bg-[#00B7FF]/15 px-2 py-0.5 text-[#00B7FF] font-medium">
                {lvl}: {selected[lvl]}
              </span>
              {idx < DRILL_LEVELS.length - 1 && <span className="text-[#B8B8B8]">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 6-Level Interactive Drilldown Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DRILL_LEVELS.map((lvl) => (
          <div key={lvl} className="rounded-2xl border border-white/10 bg-[#101010] p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#00B7FF] mb-2">
              {lvl}
            </div>
            <div className="space-y-1.5">
              {ENCYCLOPEDIA_TREE[lvl].map((opt) => {
                const active = selected[lvl] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setSelected((prev) => ({ ...prev, [lvl]: opt }))}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                      active
                        ? 'border-[#8B5CFF] bg-[#8B5CFF]/20 text-white font-semibold'
                        : 'border-white/10 bg-[#151515] text-[#B8B8B8] hover:text-white'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* World Engine Relationships */}
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="h-4 w-4 text-[#00B7FF]" />
          <h3 className="text-sm font-semibold">World Engine Relationships</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-xs">
          <div className="rounded-xl bg-[#151515] p-3">
            <div className="text-[#B8B8B8]">Feeds Into</div>
            <div className="mt-1 font-semibold text-white">Bot Operations (Orion-R1 &amp; Vulcan-B4)</div>
          </div>
          <div className="rounded-xl bg-[#151515] p-3">
            <div className="text-[#B8B8B8]">Risk Gated By</div>
            <div className="mt-1 font-semibold text-white">Security World &amp; Urban Wallet Rails</div>
          </div>
          <div className="rounded-xl bg-[#151515] p-3">
            <div className="text-[#B8B8B8]">Capital Settled Via</div>
            <div className="mt-1 font-semibold text-white">Crypto World &amp; Positions Ledger</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. SecurityWorld
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
            { key: 'allExecution', label: 'Halt All Order Execution', desc: 'Freeze all live DEX/CEX & FX routing' },
            { key: 'railATransfer', label: 'Lock RAIL-A USD/JPY', desc: 'Enforce Read-Only during mismatch' },
            { key: 'botAutonomy', label: 'Revoke Bot Autonomy', desc: 'Force all 12 Tribes to Manual Confirm' },
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
            <div className="rounded-xl bg-[#151515] p-3.5 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#32D74B]" />
              <span>Hardware FIDO2 Keys: <strong>2 Active</strong></span>
            </div>
            <div className="rounded-xl bg-[#151515] p-3.5 flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#00B7FF]" />
              <span>Session Encryption: <strong>AES-256-GCM</strong></span>
            </div>
            <div className="rounded-xl bg-[#151515] p-3.5 flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-[#FF3B30]" />
              <span>Active Incidents: <strong>1 (RAIL-A Lock)</strong></span>
            </div>
          </div>
        )}
        {tab === 'Permissions' && (
          <div className="flex items-center gap-2 text-[#B8B8B8]">
            <Key className="h-4 w-4 text-[#00B7FF]" /> Sovereign Root Role active · Multi-sig 2/3 required for withdrawals &gt; $50,000.
          </div>
        )}
        {tab === 'Audit Logs' && (
          <div className="space-y-1.5 font-mono text-[11px] text-[#B8B8B8]">
            <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-[#FF3B30]" /> [14:04 UTC] RAIL-A locked to READ-ONLY by Cerberus-S0</div>
            <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-[#32D74B]" /> [13:12 UTC] Hardware key attestation verified</div>
          </div>
        )}
        {tab === 'Bot Permissions' && (
          <div className="flex items-center gap-2 text-[#B8B8B8]">
            <Bot className="h-4 w-4 text-[#8B5CFF]" /> 12 Tribes scoped to Read/Propose; Execution requires STAR + Sentinel Risk clearance.
          </div>
        )}
        {tab === 'Devices' && (
          <div className="flex items-center gap-2 text-[#B8B8B8]">
            <Smartphone className="h-4 w-4 text-[#00B7FF]" /> MacBook Pro M4 Max (NYC · Trusted) · iPhone 17 Pro (Biometric Passkey).
          </div>
        )}
        {tab === 'Privacy' && (
          <div className="flex items-center gap-2 text-[#B8B8B8]">
            <EyeOff className="h-4 w-4 text-[#32D74B]" /> Zero-knowledge telemetry mode enabled · Local balance masking ready.
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 5. SettingsWorld
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
            <Bell className="h-4 w-4 text-[#FFB800]" /> Critical Rail Alerts (#FF3B30) &amp; STAR Trade Confirmations: Push + In-Cockpit Toast.
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
