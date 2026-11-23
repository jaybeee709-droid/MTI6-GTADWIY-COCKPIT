import React, { useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  Bot,
  ChartColumn,
  Coins,
  Compass,
  Cpu,
  DollarSign,
  FolderKanban,
  Gauge,
  Globe,
  Landmark,
  Layers,
  LayoutGrid,
  Library,
  ListChecks,
  Maximize2,
  Minimize2,
  Monitor,
  PieChart,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  User,
  UserCheck,
  Wallet,
  Wrench,
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
import {
  CockpitStatusScreen,
  KnowledgeScreen,
  MissionControlTasksScreen,
  MissionControlProjectsScreen,
  ResourceTrackerScreen,
  CryptoMarketScreen,
  BotProfileScreen,
  OperationsScreen,
  AccountsFinanceScreen,
  WebBotWorkScreen,
  DataAnalyticsScreen,
  CryptoWorkspacesScreen,
} from './screens';

type ViewMode = 'Standard' | 'Advanced' | 'All';
type ExecutionMode = 'Read-Only' | 'Paper / Sim' | 'Guarded Auto';

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
  | 'settings'
  | 'cockpit-status'
  | 'knowledge'
  | 'mission-tasks'
  | 'mission-projects'
  | 'resource-tracker'
  | 'crypto-market'
  | 'bot-profile'
  | 'operations'
  | 'accounts-finance'
  | 'web-bot-work'
  | 'data-analytics'
  | 'crypto-workspaces';

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
  // Phase 1, package 4 — the 11 screens migrated in package 3, plus the
  // Crypto Workspaces index (22nd screen). Tier: Standard = everyday
  // command-center screens; Advanced = the rest. 'All' shows everything.
  { id: 'cockpit-status', label: 'Cockpit Status', tier: 'Standard', accent: '#00B7FF', icon: <Gauge className="h-4 w-4" /> },
  { id: 'knowledge', label: 'Knowledge', tier: 'Advanced', accent: '#8B5CFF', icon: <Library className="h-4 w-4" /> },
  { id: 'mission-tasks', label: 'Mission Control Tasks', tier: 'Standard', accent: '#00B7FF', icon: <ListChecks className="h-4 w-4" /> },
  { id: 'mission-projects', label: 'Mission Control Projects', tier: 'Standard', accent: '#00B7FF', icon: <FolderKanban className="h-4 w-4" /> },
  { id: 'resource-tracker', label: 'Resource Tracker', tier: 'Advanced', accent: '#32D74B', icon: <Cpu className="h-4 w-4" /> },
  { id: 'crypto-market', label: 'Crypto Market', tier: 'Standard', accent: '#8B5CFF', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'bot-profile', label: 'Bot Profile', tier: 'Advanced', accent: '#00B7FF', icon: <User className="h-4 w-4" /> },
  { id: 'operations', label: 'Operations', tier: 'Standard', accent: '#32D74B', icon: <Wrench className="h-4 w-4" /> },
  { id: 'accounts-finance', label: 'Accounts & Finance', tier: 'Standard', accent: '#32D74B', icon: <Landmark className="h-4 w-4" /> },
  { id: 'web-bot-work', label: 'Web — Bot Work', tier: 'Advanced', accent: '#00B7FF', icon: <Monitor className="h-4 w-4" /> },
  { id: 'data-analytics', label: 'Data Analytics', tier: 'Standard', accent: '#8B5CFF', icon: <ChartColumn className="h-4 w-4" /> },
  { id: 'crypto-workspaces', label: 'Crypto Workspaces', tier: 'Advanced', accent: '#8B5CFF', icon: <LayoutGrid className="h-4 w-4" /> },
];

export function App() {
  const [activeWorld, setActiveWorld] = useState<WorldId>('globe');
  const [viewMode, setViewMode] = useState<ViewMode>('All');
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('Read-Only');
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
        return <CryptoWorld onOpenWorkspaces={() => setActiveWorld('crypto-workspaces')} />;
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
      case 'cockpit-status':
        return <CockpitStatusScreen />;
      case 'knowledge':
        return <KnowledgeScreen />;
      case 'mission-tasks':
        return <MissionControlTasksScreen />;
      case 'mission-projects':
        return <MissionControlProjectsScreen />;
      case 'resource-tracker':
        return <ResourceTrackerScreen />;
      case 'crypto-market':
        return <CryptoMarketScreen />;
      case 'bot-profile':
        return <BotProfileScreen />;
      case 'operations':
        return <OperationsScreen />;
      case 'accounts-finance':
        return <AccountsFinanceScreen />;
      case 'web-bot-work':
        return <WebBotWorkScreen />;
      case 'data-analytics':
        return <DataAnalyticsScreen />;
      case 'crypto-workspaces':
        return <CryptoWorkspacesScreen />;
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
                22-Screen Sovereign Operating Shell · STAR demo / NOT_CONNECTED
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
            <span className="text-[10px] font-mono text-[#B8B8B8]">Execution disabled by design</span>
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#151515] px-2 py-1">
              <Activity className="h-3.5 w-3.5 text-[#00B7FF] mr-1" />
              {(['Read-Only', 'Paper / Sim', 'Guarded Auto'] as ExecutionMode[]).map(
                (em) => (
                  <button
                    key={em}
                    onClick={() => setExecutionMode(em)}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                      executionMode === em
                        ? 'bg-[#8B5CFF] text-white'
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

        {/* 22-Screen Navigation Dock */}
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
                {/* Nav-overlap fix (Phase 1 follow-up, 2026-11-22): the icon
                    lives in a fixed 16px flex box that can neither shrink nor
                    overflow, and the SVG inside is forced to 16px, so the
                    icon can never cover the label's first letters. The label
                    is shrink-0 + nowrap so it never compresses under the
                    icon. Previously both spans were unguarded flex items,
                    and the live preview showed the icon clipping 1–3 letters
                    of every label, worse as the width shrank. */}
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0"
                  style={{ color: active ? w.accent : undefined }}
                >
                  {w.icon}
                </span>
                <span className="shrink-0 whitespace-nowrap">{w.label}</span>
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
                <div className="mt-1 text-[#FF3B30] font-semibold">READ-ONLY / DISABLED · Balance UNAVAILABLE</div>
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
              <strong className="text-[#8B5CFF]">{executionMode}</strong>. STAR demo / NOT_CONNECTED — no live tribal status. Execution disabled by design.
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
