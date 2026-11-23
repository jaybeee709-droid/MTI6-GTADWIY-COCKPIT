import React, { useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  Bot,
  Coins,
  Compass,
  DollarSign,
  Globe,
  Layers,
  Maximize2,
  Minimize2,
  PieChart,
  Settings,
  Shield,
  Sparkles,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import { MTI6_COLORS, MTI6_WORLD_OS } from './tokens';
import { WorldGlobe } from './worlds/WorldGlobe';
import { CryptoWorld } from './worlds/CryptoWorld';
import { EarningsWorld } from './worlds/EarningsWorld';
import { BotOperations } from './worlds/BotOperations';
import { UrbanWallet } from './worlds/UrbanWallet';
import {
  OpportunitiesWorld,
  PositionsAssetsWorld,
  EncyclopediaWorld,
  SecurityWorld,
  SettingsWorld,
} from './worlds/OtherWorlds';

type ViewMode = 'Standard' | 'Advanced' | 'All';
type ExecutionMode = 'Read-Only' | 'Paper / Sim' | 'Guarded Auto' | 'Live';

type WorldId =
  | 'globe'
  | 'crypto'
  | 'earnings'
  | 'bots'
  | 'wallet'
  | 'opportunities'
  | 'positions'
  | 'encyclopedia'
  | 'security'
  | 'settings';

interface WorldDef {
  id: WorldId;
  label: string;
  tier: 'Standard' | 'Advanced';
  accent: string;
  icon: React.ReactNode;
}

interface FloatingWin {
  id: WorldId;
  title: string;
  minimized: boolean;
}

const WORLDS: WorldDef[] = [
  { id: 'globe', label: 'World Globe', tier: 'Standard', accent: '#00B7FF', icon: <Globe className="h-4 w-4" /> },
  { id: 'crypto', label: 'Crypto World', tier: 'Standard', accent: '#8B5CFF', icon: <Coins className="h-4 w-4" /> },
  { id: 'earnings', label: 'Earnings World', tier: 'Standard', accent: '#32D74B', icon: <DollarSign className="h-4 w-4" /> },
  { id: 'bots', label: 'Bot Operations', tier: 'Advanced', accent: '#00B7FF', icon: <Bot className="h-4 w-4" /> },
  { id: 'wallet', label: 'Urban Wallet', tier: 'Standard', accent: '#00B7FF', icon: <Wallet className="h-4 w-4" /> },
  { id: 'opportunities', label: 'Opportunities', tier: 'Standard', accent: '#8B5CFF', icon: <Compass className="h-4 w-4" /> },
  { id: 'positions', label: 'Positions & Assets', tier: 'Standard', accent: '#32D74B', icon: <PieChart className="h-4 w-4" /> },
  { id: 'encyclopedia', label: 'Encyclopedia', tier: 'Advanced', accent: '#8B5CFF', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'security', label: 'Security World', tier: 'Advanced', accent: '#FF3B30', icon: <Shield className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings World', tier: 'Standard', accent: '#B8B8B8', icon: <Settings className="h-4 w-4" /> },
];

export function App() {
  const [activeWorld, setActiveWorld] = useState<WorldId>('globe');
  const [viewMode, setViewMode] = useState<ViewMode>('All');
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('Guarded Auto');
  const [floatingWindows, setFloatingWindows] = useState<FloatingWin[]>([]);
  const [accountsOpen, setAccountsOpen] = useState<boolean>(false);
  const [starOrbOpen, setStarOrbOpen] = useState<boolean>(false);

  const visibleWorlds = useMemo(() => {
    if (viewMode === 'Standard') return WORLDS.filter((w) => w.tier === 'Standard');
    if (viewMode === 'Advanced') return WORLDS.filter((w) => w.tier === 'Advanced' || w.id === 'globe');
    return WORLDS;
  }, [viewMode]);

  const handleSelectWorld = (worldId: string) => {
    const match = WORLDS.find((w) => w.id === worldId);
    if (match) {
      setActiveWorld(match.id);
      return;
    }
    if (worldId === 'wallet' || worldId === 'urban-wallet') setActiveWorld('wallet');
    else if (worldId === 'bots' || worldId === 'bot-operations') setActiveWorld('bots');
    else setActiveWorld('globe');
  };

  const renderWorldContent = (id: WorldId) => {
    switch (id) {
      case 'globe':
        return <WorldGlobe onSelectWorld={handleSelectWorld} />;
      case 'crypto':
        return <CryptoWorld />;
      case 'earnings':
        return <EarningsWorld />;
      case 'bots':
        return <BotOperations />;
      case 'wallet':
        return <UrbanWallet />;
      case 'opportunities':
        return <OpportunitiesWorld />;
      case 'positions':
        return <PositionsAssetsWorld />;
      case 'encyclopedia':
        return <EncyclopediaWorld />;
      case 'security':
        return <SecurityWorld />;
      case 'settings':
        return <SettingsWorld />;
      default:
        return <WorldGlobe onSelectWorld={handleSelectWorld} />;
    }
  };

  const openFloatingWindow = (id: WorldId) => {
    const def = WORLDS.find((w) => w.id === id);
    if (!def) return;
    setFloatingWindows((prev) => {
      if (prev.some((w) => w.id === id)) return prev;
      return [...prev, { id, title: def.label, minimized: false }];
    });
  };

  const closeFloatingWindow = (id: WorldId) => {
    setFloatingWindows((prev) => prev.filter((w) => w.id !== id));
  };

  const toggleMinimizeWindow = (id: WorldId) => {
    setFloatingWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w)),
    );
  };

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{ backgroundColor: MTI6_COLORS.bgVoid }}
    >
      {/* Persistent Top OS Bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00B7FF]/15 text-[#00B7FF] border border-[#00B7FF]/35">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-wide">
                {MTI6_WORLD_OS?.name ?? 'MTI6 GTADWIY COCKPIT'}
              </div>
              <div className="text-[11px] text-[#B8B8B8]">
                10-World Sovereign Operating Shell · STAR Active
              </div>
            </div>
          </div>

          {/* View Modes (Standard | Advanced | All) */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#151515] p-1">
            {(['Standard', 'Advanced', 'All'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  viewMode === mode
                    ? 'bg-[#00B7FF] text-black font-semibold'
                    : 'text-[#B8B8B8] hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Execution Mode Strip + Accounts Center Trigger */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#151515] px-2 py-1">
              <Activity className="h-3.5 w-3.5 text-[#00B7FF] mr-1" />
              {(['Read-Only', 'Paper / Sim', 'Guarded Auto', 'Live'] as ExecutionMode[]).map(
                (em) => (
                  <button
                    key={em}
                    onClick={() => setExecutionMode(em)}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                      executionMode === em
                        ? em === 'Live'
                          ? 'bg-[#FF3B30] text-white'
                          : 'bg-[#8B5CFF] text-white'
                        : 'text-[#B8B8B8] hover:text-white'
                    }`}
                  >
                    {em}
                  </button>
                ),
              )}
            </div>

            <button
              onClick={() => openFloatingWindow(activeWorld)}
              className="rounded-xl border border-white/15 bg-[#151515] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#202020]"
            >
              Pop Out World
            </button>

            <button
              onClick={() => setAccountsOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-[#00B7FF]/40 bg-[#00B7FF]/15 px-3 py-1.5 text-xs font-semibold text-[#00B7FF] hover:bg-[#00B7FF]/25"
            >
              <UserCheck className="h-3.5 w-3.5" /> Accounts Center
            </button>
          </div>
        </div>

        {/* 10-World Navigation Dock */}
        <nav className="mx-auto mt-3 flex max-w-[1600px] gap-1.5 overflow-x-auto pb-1">
          {visibleWorlds.map((w) => {
            const active = activeWorld === w.id;
            return (
              <button
                key={w.id}
                onClick={() => setActiveWorld(w.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-white'
                    : 'border-white/10 bg-[#121212] text-[#B8B8B8] hover:border-white/25 hover:text-white'
                }`}
              >
                <span style={{ color: active ? w.accent : undefined }}>{w.icon}</span>
                <span>{w.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main World Viewport */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 md:p-6">
        {renderWorldContent(activeWorld)}
      </main>

      {/* Floating Window Manager */}
      {floatingWindows.length > 0 && (
        <div className="fixed bottom-20 left-4 z-40 flex flex-wrap gap-3 max-w-[90vw]">
          {floatingWindows.map((win) => (
            <div
              key={win.id}
              className="w-[380px] rounded-2xl border border-white/20 bg-[#101010] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-[#181818] px-3 py-2">
                <span className="text-xs font-semibold text-white">{win.title} · Floating</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleMinimizeWindow(win.id)}
                    className="rounded p-1 text-[#B8B8B8] hover:bg-white/10 hover:text-white"
                  >
                    {win.minimized ? (
                      <Maximize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Minimize2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => closeFloatingWindow(win.id)}
                    className="rounded p-1 text-[#B8B8B8] hover:bg-[#FF3B30]/20 hover:text-[#FF3B30]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {!win.minimized && (
                <div className="max-h-[320px] overflow-y-auto p-3">
                  {renderWorldContent(win.id)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Accounts Center Slide-Over */}
      {accountsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="h-full w-full max-w-md border-l border-white/15 bg-[#101010] p-6 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-semibold">Accounts Center</h3>
              <button
                onClick={() => setAccountsOpen(false)}
                className="rounded-lg p-1.5 text-[#B8B8B8] hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 space-y-3 text-xs">
              <div className="rounded-xl bg-[#151515] p-3.5">
                <div className="font-semibold text-white">Sovereign Treasury Profile</div>
                <div className="mt-1 text-[#B8B8B8]">Execution Mode: {executionMode}</div>
              </div>
              <div className="rounded-xl bg-[#151515] p-3.5">
                <div className="font-semibold text-white">RAIL-A USD/JPY Custody</div>
                <div className="mt-1 text-[#FF3B30] font-semibold">EXECUTE DISABLED / READ-ONLY</div>
              </div>
              <div className="rounded-xl bg-[#151515] p-3.5">
                <div className="font-semibold text-white">RAIL-B EUR &amp; RAIL-C GBP/CAD</div>
                <div className="mt-1 text-[#32D74B]">Synced &amp; Ready</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Lower-Right STAR Orb */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
        {starOrbOpen && (
          <div className="w-80 rounded-2xl border border-[#00B7FF]/40 bg-[#101010] p-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <span className="font-semibold text-[#00B7FF] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> STAR Core Assistant
              </span>
              <button onClick={() => setStarOrbOpen(false)} className="text-[#B8B8B8] hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[#B8B8B8]">
              Active World: <strong className="text-white">{activeWorld}</strong> · Mode:{' '}
              <strong className="text-[#8B5CFF]">{executionMode}</strong>. All 12 Tribes nominal; RAIL-A held in Read-Only.
            </p>
          </div>
        )}
        <button
          onClick={() => setStarOrbOpen((v) => !v)}
          aria-label="STAR Orb"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-[#00B7FF]/60 bg-gradient-to-br from-[#00B7FF] to-[#8B5CFF] text-white shadow-[0_0_25px_rgba(0,183,255,0.45)] transition hover:scale-105"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

export default App;
