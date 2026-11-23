import React, { useState } from 'react';
import {
  Accessibility,
  AlertOctagon,
  Bell,
  BookOpen,
  Bot,
  Compass,
  Globe,
  Key,
  Layout,
  Lock,
  MapPin,
  Palette,
  PieChart,
  Power,
  Shield,
  Smartphone,
  Sparkles,
  Volume2,
} from 'lucide-react';

/* ============================================================================
 * 1. OpportunitiesWorld — honest: the pipeline ends at PREPARED with
 * 0 records. No invented opportunity, score, or APY is shown.
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

export const OpportunitiesWorld: React.FC = () => {
  const [tab, setTab] = useState<OppTab>('Feed');

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
              Feed, Discovery, Rankings, Trending, Local, Global, Saved, Recommended &amp; Intelligence
            </p>
            <p className="text-xs text-[#B8B8B8] mt-0.5">
              Pipeline ends at PREPARED — no opportunity is scored or ranked until a live feed is connected.
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

      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Globe className="h-4 w-4 text-[#00B7FF]" /> View: {tab}
        </div>
        <p className="text-xs text-[#B8B8B8]">
          0 records. No opportunity title, score, APY, region, or STAR verification is claimed in this
          build — the feed is NOT_CONNECTED and the data is NO_DATA.
        </p>
        <p className="text-xs font-mono text-[#B8B8B8]">OPPORTUNITIES: 0 RECORDS · STATUS: NOT_CONNECTED · NO_DATA</p>
        <div className="flex items-center gap-2 text-xs text-[#B8B8B8]">
          <MapPin className="h-3.5 w-3.5" /> Local and global views both report 0 records.
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. PositionsAssetsWorld — honest: every value UNAVAILABLE, never zero.
 * No net worth, allocation, PnL, or Sharpe figure is claimed.
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
            <div className="text-xl font-bold text-white">UNAVAILABLE</div>
            <div className="text-[10px] text-[#B8B8B8]">NOT_CONNECTED · NO_DATA — never zero</div>
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
        {[
          { label: 'Crypto Positions', note: 'Value: UNAVAILABLE · no allocation or PnL claimed' },
          { label: 'Cash & FX Reserves', note: 'Value: UNAVAILABLE · no APY claimed' },
          { label: 'Cards & Points Value', note: 'Value: UNAVAILABLE · no points balance claimed' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-[#101010] p-4">
            <div className="text-xs text-[#B8B8B8]">{card.label}</div>
            <div className="mt-2 text-xl font-bold">UNAVAILABLE</div>
            <div className="mt-1 text-xs text-[#B8B8B8]">{card.note}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 text-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Active View: {tab}</span>
          <span className="text-[#B8B8B8]">Sharpe: NO_DATA · Max Drawdown: NO_DATA</span>
        </div>
        <p className="text-[#B8B8B8]">
          No position rows are shown: no holding, weight, value, or return is claimed until a live
          read-only feed is connected. Positions value is UNAVAILABLE, never zero.
        </p>
        <p className="mt-2 font-mono text-[11px] text-[#B8B8B8]">POSITIONS: NO_DATA · ALLOCATION: NO_DATA · PERFORMANCE: NO_DATA</p>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. EncyclopediaWorld — honest: the 6-level structure only. The
 * canonical encyclopedia has 60 entities, but that content has not been
 * migrated into this build, so no family, activity, strategy, or entry
 * is invented here. Every level reports NOT_CONNECTED / NO_DATA.
 * ============================================================================ */
const DRILL_LEVELS = [
  'Family',
  'Major Activity',
  'Type',
  'Strategy',
  'Action',
  'Sub-Action',
] as const;

export const EncyclopediaWorld: React.FC = () => {
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
            <p className="text-xs text-[#B8B8B8] mt-0.5">
              The canonical encyclopedia has 60 entities; that content has not been migrated into this
              build. No family or entry is shown here rather than an invented one.
            </p>
          </div>
        </div>
      </div>

      {/* 6-Level Structure — levels only, no invented entries */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DRILL_LEVELS.map((lvl) => (
          <div key={lvl} className="rounded-2xl border border-white/10 bg-[#101010] p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#00B7FF] mb-2">{lvl}</div>
            <p className="text-xs text-[#B8B8B8]">
              Entries: NO_DATA — encyclopedia content not migrated in this package.
            </p>
            <p className="mt-1 text-[11px] font-mono text-[#B8B8B8]">STATUS: NOT_CONNECTED</p>
          </div>
        ))}
      </div>

      {/* World Engine Relationships */}
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
        <h3 className="text-sm font-semibold mb-3">World Engine Relationships</h3>
        <p className="text-xs text-[#B8B8B8]">
          Relationship data: NO_DATA — no feed, bot, risk gate, or settlement link is claimed until the
          encyclopedia migration lands.
        </p>
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. SecurityWorld — structure kept; every claimed fact replaced with an
 * honest state. No key count, encryption claim, incident count, audit
 * entry, device, or permission is asserted without a live source.
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
            <p className="text-xs text-[#B8B8B8] mt-0.5">
              Execution is DISABLED by design. Security state below is NOT_CONNECTED / NO_DATA unless a live
              source is attached.
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
            { key: 'allExecution', label: 'Halt All Order Execution', desc: 'Execution is already disabled by design' },
            { key: 'railATransfer', label: 'Lock RAIL-A USD/JPY', desc: 'Enforce Read-Only on RAIL-A' },
            { key: 'botAutonomy', label: 'Revoke Bot Autonomy', desc: 'No worker runtime is live in this build' },
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
            <div className="rounded-xl bg-[#151515] p-3.5">Hardware Keys: <strong>NO_DATA</strong></div>
            <div className="rounded-xl bg-[#151515] p-3.5">Session Encryption: <strong>NO_DATA</strong></div>
            <div className="rounded-xl bg-[#151515] p-3.5">Active Incidents: <strong>NO_DATA</strong></div>
          </div>
        )}
        {tab === 'Permissions' && (
          <div className="flex items-center gap-2 text-[#B8B8B8]">
            <Key className="h-4 w-4 text-[#00B7FF]" /> Permissions: NO_DATA — no role or multi-sig state is claimed without a live source.
          </div>
        )}
        {tab === 'Audit Logs' && (
          <div className="text-[#B8B8B8]">Audit logs: NO_DATA — no log entries are claimed in this build.</div>
        )}
        {tab === 'Bot Permissions' && (
          <div className="flex items-center gap-2 text-[#B8B8B8]">
            <Bot className="h-4 w-4 text-[#8B5CFF]" /> Bot permissions: NO_DATA — no worker runtime is live; execution is disabled by design.
          </div>
        )}
        {tab === 'Devices' && (
          <div className="flex items-center gap-2 text-[#B8B8B8]">
            <Smartphone className="h-4 w-4 text-[#00B7FF]" /> Devices: NO_DATA — no trusted device is claimed.
          </div>
        )}
        {tab === 'Privacy' && (
          <div className="flex items-center gap-2 text-[#B8B8B8]">
            <Lock className="h-4 w-4 text-[#32D74B]" /> Privacy: NO_DATA — no telemetry mode is claimed.
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 5. SettingsWorld — local UI preferences only; no live claims.
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
            <Bell className="h-4 w-4 text-[#FFB800]" /> Critical Alerts (#FF3B30): Push + In-Cockpit Toast.
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
