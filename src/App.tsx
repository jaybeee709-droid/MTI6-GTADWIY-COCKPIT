import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  Bot,
  ChartColumn,
  Coins,
  Compass,
  Cpu,
  CreditCard,
  DollarSign,
  FolderKanban,
  Gauge,
  Globe,
  Landmark,
  LayoutGrid,
  Library,
  ListChecks,
  Maximize2,
  Menu,
  Mic,
  Minimize2,
  Monitor,
  PieChart,
  Pin,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  User,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import {
  MTI6_AMOUNT,
  MTI6_COLORS,
  MTI6_RAIL,
  MTI6_TOPBAR,
  MTI6_WORLD_OS,
} from './tokens';
import { DISPLAY_CURRENCIES, currencyOf } from './currencies';
import { fetchStarStatus, starChat, StarError } from './star-client';
import { buildStarSystemPrompt } from './star-context';
import { answerLocally } from './star-local';
import { STAR_EXPRESSIONS, STAR_PORTRAIT } from './star-avatar-data';
import { SPACE_BG } from './worlds/CryptoWorld';
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

export type ViewMode = 'Standard' | 'Advanced' | 'All';
export type ExecutionMode = 'Read-Only' | 'Paper / Sim' | 'Guarded Auto';

export type WorldId =
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

/** A web tab kept by the cockpit (owner revision, 2026-11-23). The
 *  page itself opens in a real browser tab — most sites refuse to be
 *  embedded inside another app — while the cockpit keeps the tab
 *  strip: open, re-open, pin. Pinned tabs persist across sessions. */
interface WebTab {
  id: string;
  title: string;
  url: string;
  pinned: boolean;
}

type AmountPanel =
  | { mode: 'list' }
  | { mode: 'actions' | 'info' | 'earns'; code: string }
  | null;

function loadWebTabs(): WebTab[] {
  try {
    const raw = localStorage.getItem('mti6-web-tabs-v1');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WebTab[];
    return Array.isArray(parsed) ? parsed.filter((t) => t && t.url && t.title) : [];
  } catch {
    return [];
  }
}

function loadDisplayCurrency(): string {
  try {
    return localStorage.getItem('mti6-display-currency-v1') ?? 'USD';
  } catch {
    return 'USD';
  }
}

const WORLDS: WorldDef[] = [
  { id: 'globe', label: 'World Map', tier: 'Standard', accent: '#00B7FF', icon: <Globe className="h-4 w-4" /> },
  { id: 'crypto', label: 'Crypto World', tier: 'Standard', accent: '#8B5CFF', icon: <Coins className="h-4 w-4" /> },
  { id: 'earnings', label: 'Earnings World', tier: 'Standard', accent: '#C8CFD8', icon: <DollarSign className="h-4 w-4" /> },
  { id: 'bots', label: 'Bot Operations', tier: 'Advanced', accent: '#00B7FF', icon: <Bot className="h-4 w-4" /> },
  { id: 'wallet', label: 'Urban Wallet', tier: 'Standard', accent: '#00B7FF', icon: <Wallet className="h-4 w-4" /> },
  { id: 'opportunities', label: 'Opportunities', tier: 'Standard', accent: '#8B5CFF', icon: <Compass className="h-4 w-4" /> },
  { id: 'positions', label: 'Positions & Assets', tier: 'Standard', accent: '#0080FF', icon: <PieChart className="h-4 w-4" /> },
  { id: 'encyclopedia', label: 'Encyclopedia', tier: 'Advanced', accent: '#8B5CFF', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'security', label: 'Security World', tier: 'Advanced', accent: '#00B7FF', icon: <Shield className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings World', tier: 'Standard', accent: '#B8B8B8', icon: <Settings className="h-4 w-4" /> },
  // Phase 1, package 4 — the 11 screens migrated in package 3, plus the
  // Crypto Workspaces index (22nd screen). Tier: Standard = everyday
  // command-center screens; Advanced = the rest. 'All' shows everything.
  { id: 'cockpit-status', label: 'Cockpit Status', tier: 'Standard', accent: '#00B7FF', icon: <Gauge className="h-4 w-4" /> },
  { id: 'knowledge', label: 'Knowledge', tier: 'Advanced', accent: '#8B5CFF', icon: <Library className="h-4 w-4" /> },
  { id: 'mission-tasks', label: 'Mission Control Tasks', tier: 'Standard', accent: '#00B7FF', icon: <ListChecks className="h-4 w-4" /> },
  { id: 'mission-projects', label: 'Mission Control Projects', tier: 'Standard', accent: '#00B7FF', icon: <FolderKanban className="h-4 w-4" /> },
  { id: 'resource-tracker', label: 'Resource Tracker', tier: 'Advanced', accent: '#0080FF', icon: <Cpu className="h-4 w-4" /> },
  { id: 'crypto-market', label: 'Crypto Market', tier: 'Standard', accent: '#8B5CFF', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'bot-profile', label: 'Bot Profile', tier: 'Advanced', accent: '#00B7FF', icon: <User className="h-4 w-4" /> },
  { id: 'operations', label: 'Operations', tier: 'Standard', accent: '#00B7FF', icon: <Wrench className="h-4 w-4" /> },
  { id: 'accounts-finance', label: 'Accounts & Finance', tier: 'Standard', accent: '#C8CFD8', icon: <Landmark className="h-4 w-4" /> },
  { id: 'web-bot-work', label: 'Web — Bot Work', tier: 'Advanced', accent: '#00B7FF', icon: <Monitor className="h-4 w-4" /> },
  { id: 'data-analytics', label: 'Data Analytics', tier: 'Standard', accent: '#8B5CFF', icon: <ChartColumn className="h-4 w-4" /> },
  { id: 'crypto-workspaces', label: 'Crypto Workspaces', tier: 'Advanced', accent: '#8B5CFF', icon: <LayoutGrid className="h-4 w-4" /> },
];

/* Platform menu content (owner revision, 2026-11-23): the menu inside
 * the clickable logo shows EVERYTHING the platform does. The ten
 * worlds get cards; the twelve screens get compact rows. Every line
 * is an honest state, not a promise — feeds are NOT_CONNECTED,
 * holdings UNAVAILABLE, records UNVERIFIED, execution DISABLED. */
const MENU_WORLD_IDS: WorldId[] = [
  'globe',
  'crypto',
  'earnings',
  'bots',
  'wallet',
  'opportunities',
  'positions',
  'encyclopedia',
  'security',
  'settings',
];

const MENU_DESC: Record<WorldId, string> = {
  globe: 'The master surface — flat map, layers, real geography',
  crypto: '24 contents · 56 workspaces — feeds NOT_CONNECTED',
  earnings: '20 earning categories — catalogue, nothing live',
  bots: 'STAR + 12 Tribe principals — propose-only',
  wallet: 'Currencies & rails — no wallet connected',
  opportunities: 'Pipeline ends at PREPARED — none live',
  positions: 'Holdings UNAVAILABLE — nothing connected',
  encyclopedia: '826 activity records — all UNVERIFIED',
  security: 'AngelSecurity — alerts UNMEASURED in this build',
  settings: 'Cockpit preferences & shell options',
  'cockpit-status': 'Shell, data & connection status',
  knowledge: 'Notes, references & the record',
  'mission-tasks': 'Mission Control task board',
  'mission-projects': 'Mission Control project board',
  'resource-tracker': 'Provider registry & capability chains',
  'crypto-market': 'Market screens — feeds NOT_CONNECTED',
  'bot-profile': 'Bot identities, roles & assignments',
  operations: 'Operations console',
  'accounts-finance': 'Accounts, rails & finance profile',
  'web-bot-work': 'Web work queue for bots',
  'data-analytics': 'Charts & analysis',
  'crypto-workspaces': 'All 56 crypto workspaces',
};

export function App() {
  const [activeWorld, setActiveWorld] = useState<WorldId>('globe');
  const [viewMode, setViewMode] = useState<ViewMode>('All');
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('Read-Only');
  const [floatingWindows, setFloatingWindows] = useState<FloatingWin[]>([]);
  const [accountsOpen, setAccountsOpen] = useState<boolean>(false);
  const [starOrbOpen, setStarOrbOpen] = useState<boolean>(false);
  // Phase 2 top bar state: the ☰ menu panel, and the screen search
  // (scope: the 22 cockpit screens — named in the UI, see renderSearchField).
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFocus, setSearchFocus] = useState<boolean>(false);
  const [phoneSearchOpen, setPhoneSearchOpen] = useState<boolean>(false);
  const activeRailBtnRef = useRef<HTMLButtonElement | null>(null);
  // Owner revision (2026-11-23): the search bar is also a web browser
  // (scope toggle SCREENS / WEB, kept tabs with pinning), the mic talks
  // to STAR, and the amount is a currency selector with pinning.
  const [searchScope, setSearchScope] = useState<'screens' | 'web'>('screens');
  const [webTabs, setWebTabs] = useState<WebTab[]>(loadWebTabs);
  const [pinnedCurrency, setPinnedCurrency] = useState<string>(loadDisplayCurrency);
  const [amountPanel, setAmountPanel] = useState<AmountPanel>(null);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'unavailable'>('idle');
  // STAR brain (2026-11-23): the panel is a real chat when the
  // gateway reports a configured provider key; until then every
  // answer is a labelled demo reply. starConfigured starts null
  // (checking) and resolves from gateway.status on mount.
  const [starConfigured, setStarConfigured] = useState<boolean | null>(null);
  const [starModel, setStarModel] = useState<string | null>(null);
  const [starThread, setStarThread] = useState<
    { role: 'user' | 'assistant'; content: string; kind: 'chat' | 'demo' | 'error' }[]
  >([]);
  const [starInput, setStarInput] = useState<string>('');
  const [starBusy, setStarBusy] = useState<boolean>(false);

  useEffect(() => {
    let live = true;
    fetchStarStatus()
      .then((s) => {
        if (live) {
          setStarConfigured(s.configured);
          setStarModel(s.model);
        }
      })
      .catch(() => {
        if (live) setStarConfigured(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const sendStar = (raw: string) => {
    const text = raw.trim();
    if (!text || starBusy) return;
    const userMsg = { role: 'user' as const, content: text, kind: 'chat' as const };
    const threadWithUser = [...starThread, userMsg];
    setStarThread(threadWithUser);
    setStarInput('');
    if (starConfigured !== true) {
      // Local brain first (v146): deterministic answers from the
      // platform's own records, still labelled DEMO; the canned
      // reply remains the fallback for anything off-records.
      const local = answerLocally(text);
      setStarThread([
        ...threadWithUser,
        {
          role: 'assistant',
          content:
            local ??
            'Demo reply — no AI backend is configured on the server yet, and that is outside what my local brain can answer from the records. Once the provider key is added in Netlify (MTI6_STAR_API_KEY), I come fully online. Nothing was acted on; execution is disabled by design.',
          kind: 'demo',
        },
      ]);
      return;
    }
    setStarBusy(true);
    const history = threadWithUser
      .filter((m) => m.kind === 'chat')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));
    starChat([{ role: 'system', content: buildStarSystemPrompt() }, ...history])
      .then(({ reply, model }) => {
        setStarModel(model);
        setStarThread((prev) => [...prev, { role: 'assistant', content: reply, kind: 'chat' }]);
      })
      .catch((err) => {
        const code = err instanceof StarError ? err.code : 'UPSTREAM_ERROR';
        if (code === 'NOT_CONFIGURED') setStarConfigured(false);
        setStarThread((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `I could not answer (${code}). Nothing was acted on.`,
            kind: 'error',
          },
        ]);
      })
      .finally(() => setStarBusy(false));
  };

  useEffect(() => {
    try {
      localStorage.setItem('mti6-web-tabs-v1', JSON.stringify(webTabs));
    } catch {
      /* storage unavailable — tabs simply do not persist */
    }
  }, [webTabs]);

  useEffect(() => {
    try {
      localStorage.setItem('mti6-display-currency-v1', pinnedCurrency);
    } catch {
      /* storage unavailable — the pin simply does not persist */
    }
  }, [pinnedCurrency]);

  const visibleWorlds = useMemo(() => {
    if (viewMode === 'Standard') return WORLDS.filter((w) => w.tier === 'Standard');
    if (viewMode === 'Advanced') return WORLDS.filter((w) => w.tier === 'Advanced' || w.id === 'globe');
    return WORLDS;
  }, [viewMode]);

  // Keep the active screen centred in the rail whenever it changes.
  // Guarded: some environments (jsdom, older engines) have no
  // scrollIntoView — centring is an enhancement, never a requirement.
  useEffect(() => {
    const el = activeRailBtnRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, [activeWorld, viewMode]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return WORLDS.filter((w) => w.label.toLowerCase().includes(q)).slice(0, 8);
  }, [searchQuery]);

  const selectSearchResult = (id: WorldId) => {
    if (!visibleWorlds.some((w) => w.id === id)) setViewMode('All');
    setActiveWorld(id);
    setSearchQuery('');
    setSearchFocus(false);
    setPhoneSearchOpen(false);
  };

  /** Web scope: a query becomes a DuckDuckGo search (keyless), a typed
   *  address becomes the page itself. Either way the page opens in a
   *  real browser tab and the cockpit keeps a tab for it below the
   *  bar, ready to pin. */
  const openWebTab = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const looksLikeUrl =
      /^https?:\/\//i.test(q) || (!q.includes(' ') && /^[^\s]+\.[a-z]{2,}/i.test(q));
    const url = looksLikeUrl
      ? q.startsWith('http')
        ? q
        : `https://${q}`
      : `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
    const title = looksLikeUrl ? q.replace(/^https?:\/\//, '') : q;
    setWebTabs((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, title, url, pinned: false },
    ]);
    window.open(url, '_blank', 'noopener,noreferrer');
    setSearchQuery('');
    setSearchFocus(false);
    setPhoneSearchOpen(false);
  };

  const togglePinTab = (id: string) =>
    setWebTabs((prev) => prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)));

  const closeWebTab = (id: string) =>
    setWebTabs((prev) => prev.filter((t) => t.id !== id));

  /** Mic: tap and talk to STAR. Uses the browser's speech recognition
   *  where it exists; where it does not, the bar says so honestly
   *  instead of pretending to listen. The transcript opens the STAR
   *  panel and is sent as a chat message — answered live when a
   *  provider is configured, or with a labelled demo reply when not. */
  const startVoice = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
      webkitSpeechRecognition?: unknown;
    };
    const Ctor =
      w.SpeechRecognition ??
      (w.webkitSpeechRecognition as typeof w.SpeechRecognition | undefined);
    if (!Ctor) {
      setVoiceState('unavailable');
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      setVoiceState('listening');
      rec.onresult = (e) => {
        const text = e.results?.[0]?.[0]?.transcript ?? '';
        setVoiceState('idle');
        if (text) {
          setStarOrbOpen(true);
          sendStar(text);
        }
      };
      rec.onerror = () => setVoiceState('idle');
      rec.onend = () => setVoiceState('idle');
      rec.start();
    } catch {
      setVoiceState('unavailable');
    }
  };

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

  /** Menu navigation: the menu shows everything, so a target outside
   *  the current view-mode filter first widens the filter to All. */
  const selectFromMenu = (id: WorldId) => {
    if (!visibleWorlds.some((w) => w.id === id)) setViewMode('All');
    setActiveWorld(id);
    setMenuOpen(false);
  };

  const renderWorldContent = (id: WorldId) => {
    switch (id) {
      case 'globe':
        return <WorldGlobe onSelectWorld={handleSelectWorld} viewMode={viewMode} />;
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

  // The top-bar search field (owner revision, 2026-11-23). Two scopes,
  //  named on the toggle: SCREENS searches the 22 cockpit screens; WEB
  //  searches the web / opens an address — the page opens in a real
  //  browser tab and the cockpit keeps a pinnable tab for it. The mic
  //  talks to STAR.
  const renderSearchField = () => (
    <div className="relative w-full">
      <div
        className="flex h-10 items-center gap-2 rounded-xl border px-3"
        style={{ backgroundColor: MTI6_TOPBAR.raised, borderColor: MTI6_TOPBAR.border }}
      >
        <Search className="h-4 w-4 shrink-0 text-[#B8B8B8]" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocus(true)}
          onBlur={() => setTimeout(() => setSearchFocus(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (searchScope === 'web') openWebTab(searchQuery);
              else if (searchResults.length > 0) selectSearchResult(searchResults[0].id);
            }
            if (e.key === 'Escape') {
              setSearchQuery('');
              setSearchFocus(false);
            }
          }}
          placeholder={searchScope === 'web' ? 'Search the web or type an address…' : 'Search screens…'}
          aria-label={
            searchScope === 'web'
              ? 'Search the web — opens in a new browser tab'
              : 'Search screens — scope: the 22 cockpit screens'
          }
          className="w-full min-w-0 bg-transparent text-sm text-white placeholder:text-[#B8B8B8] focus:outline-none"
        />
        <button
          type="button"
          onClick={startVoice}
          aria-label="Talk to STAR"
          title="Talk to STAR"
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition ${
            voiceState === 'listening'
              ? 'border-[#8B5CFF] bg-[#8B5CFF]/25 text-[#8B5CFF]'
              : 'border-white/15 text-[#B8B8B8] hover:border-[#8B5CFF]/60 hover:text-[#8B5CFF]'
          }`}
        >
          <Mic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setSearchScope((s) => (s === 'screens' ? 'web' : 'screens'))}
          aria-label={`Search scope: ${searchScope}. Tap to switch.`}
          title="Tap to switch search scope"
          className="shrink-0 rounded border border-white/15 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-[#B8B8B8] hover:border-[#00B7FF]/60 hover:text-white"
        >
          {searchScope === 'web' ? 'WEB' : 'SCREENS'}
        </button>
      </div>
      {voiceState === 'unavailable' && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-xl border border-white/15 bg-[#101010] px-3 py-2 text-[11px] text-[#B8B8B8] shadow-2xl">
          Voice input is not available in this browser — STAR cannot hear you here.
          <button
            type="button"
            onClick={() => setVoiceState('idle')}
            className="ml-2 font-semibold text-white"
          >
            OK
          </button>
        </div>
      )}
      {searchFocus && searchQuery.trim() && searchScope === 'screens' && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-white/15 bg-[#101010] shadow-2xl">
          {searchResults.length > 0 ? (
            searchResults.map((w) => (
              <button
                key={w.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSearchResult(w.id);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white hover:bg-[#202020]"
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4"
                  style={{ color: w.accent }}
                >
                  {w.icon}
                </span>
                <span className="whitespace-nowrap">{w.label}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-[#B8B8B8]">
              No matching screens in this scope.
            </div>
          )}
          <div className="border-t border-white/10 px-3 py-1.5 text-[10px] text-[#B8B8B8]">
            Scope: Screens. Tap the scope chip to search the web instead.
          </div>
        </div>
      )}
      {searchFocus && searchScope === 'web' && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-xl border border-white/15 bg-[#101010] px-3 py-2 text-[11px] text-[#B8B8B8] shadow-2xl">
          Press Enter — the page opens in a new browser tab (search runs through
          DuckDuckGo, no key, no account). The cockpit keeps a tab for it below the
          bar, so you can pin it like a browser.
        </div>
      )}
    </div>
  );

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{ backgroundColor: MTI6_COLORS.bgVoid, ...SPACE_BG }}
    >
      {/* Phase 2 Top Bar — REPLACES the Phase 1 dock (owner directive
          2026-11-23). One row, left to right: ☰ (the logo AND the menu
          control — one control, two jobs), the search bar (scope named
          in the UI: Screens), the black card glyph (opens Accounts
          Center), the asset amount (NO DATA — never $0.00; hidden on
          phone, never shrunk to fit), and the screens rail below the
          bar: horizontally scrollable, never wrapping, active screen
          centred. The rail keeps its own row at every tier — the
          directive moves it inline on ultra-wide only if all 22 screens
          fit, and 22 do not fit a 1600px bar, so that condition is
          never met. */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{ backgroundColor: MTI6_TOPBAR.surface, borderColor: MTI6_TOPBAR.border }}
      >
        <div className="mx-auto flex min-h-[56px] w-full max-w-[1600px] items-center gap-3 px-4 md:min-h-[64px]">
          {/* 1 — ☰ logo + menu control */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="MTI6 menu"
            aria-expanded={menuOpen}
            className="flex h-8 w-8 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#00B7FF]/35 bg-[#00B7FF]/10 md:h-10 md:w-10 xl:h-11 xl:w-auto xl:px-3"
          >
            <Menu
              className="h-4 w-4 md:h-5 md:w-5"
              style={{ color: MTI6_TOPBAR.logoAccent }}
            />
            <span className="hidden text-sm font-bold tracking-wide text-white xl:block">
              MTI6
            </span>
          </button>

          {/* 2 — search: inline from tablet up; icon + sheet on phone */}
          <div className="hidden min-w-0 max-w-md flex-1 md:block">{renderSearchField()}</div>
          <button
            onClick={() => setPhoneSearchOpen((v) => !v)}
            aria-label="Search screens"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#151515] text-[#B8B8B8] md:hidden"
          >
            <Search className="h-4 w-4" />
          </button>

          <div className="flex-1" />

          {/* 3 — black card glyph → the Wallet (currencies held +
              transactions; Accounts Center rails below them) */}
          <button
            onClick={() => setAccountsOpen(true)}
            aria-label="Wallet"
            className="flex h-9 w-11 shrink-0 items-center justify-center rounded-lg border md:h-10 md:w-12"
            style={{
              backgroundColor: MTI6_TOPBAR.cardGlyph,
              borderColor: MTI6_TOPBAR.cardGlyphEdge,
            }}
          >
            <CreditCard className="h-5 w-5 text-[#B8B8B8]" />
          </button>

          {/* 4 — asset amount: NO DATA with nothing connected, never
              $0.00. Hidden on phone — it does not shrink. Tappable
              (owner revision, 2026-11-23): opens the currency selector;
              choosing a currency offers Pin / Info / How it earns. */}
          <div className="relative hidden shrink-0 md:block">
            <button
              type="button"
              onClick={() => setAmountPanel((p) => (p ? null : { mode: 'list' }))}
              aria-label={`Display currency: ${pinnedCurrency}. Tap to select a currency.`}
              className="flex flex-col items-end leading-tight"
            >
              <span className="font-mono text-[9px] tracking-widest text-[#B8B8B8]">
                ASSETS · {pinnedCurrency}
              </span>
              <span className="text-sm font-semibold" style={{ color: MTI6_AMOUNT.noData }}>
                NO DATA
              </span>
            </button>
            {amountPanel && (
              <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-white/15 bg-[#101010] p-3 text-xs shadow-2xl">
                {amountPanel.mode === 'list' && (
                  <>
                    <div className="mb-2 font-mono text-[10px] tracking-widest text-[#B8B8B8]">
                      DISPLAY CURRENCY — SELECT
                    </div>
                    <div className="max-h-64 space-y-1 overflow-y-auto">
                      {DISPLAY_CURRENCIES.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => setAmountPanel({ mode: 'actions', code: c.code })}
                          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-[#202020]"
                        >
                          <span className="font-semibold text-white">
                            {c.code}
                            <span className="ml-2 font-normal text-[#B8B8B8]">{c.name}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            {c.code === pinnedCurrency && (
                              <Pin className="h-3 w-3 text-[#00B7FF]" />
                            )}
                            <span className="rounded border border-white/15 px-1 py-0.5 font-mono text-[9px] uppercase text-[#B8B8B8]">
                              {c.kind}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {amountPanel.mode === 'actions' && (
                  <>
                    <div className="mb-1 font-semibold text-white">
                      {amountPanel.code} · {currencyOf(amountPanel.code).name}
                    </div>
                    <div className="mb-2 text-[11px] text-[#B8B8B8]">
                      What do you want to do with this currency?
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setPinnedCurrency(amountPanel.code);
                          setAmountPanel(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-white hover:bg-[#202020]"
                      >
                        <Pin className="h-3.5 w-3.5 text-[#00B7FF]" /> Pin as the display currency
                      </button>
                      <button
                        type="button"
                        onClick={() => setAmountPanel({ mode: 'info', code: amountPanel.code })}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-white hover:bg-[#202020]"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-[#00B7FF]" /> Currency info
                      </button>
                      <button
                        type="button"
                        onClick={() => setAmountPanel({ mode: 'earns', code: amountPanel.code })}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-white hover:bg-[#202020]"
                      >
                        <TrendingUp className="h-3.5 w-3.5 text-[#00B7FF]" /> How {amountPanel.code} earns on MTI6
                      </button>
                      <button
                        type="button"
                        onClick={() => setAmountPanel({ mode: 'list' })}
                        className="w-full rounded-lg px-2 py-1.5 text-left text-[#B8B8B8] hover:bg-[#202020]"
                      >
                        ← All currencies
                      </button>
                    </div>
                  </>
                )}
                {amountPanel.mode === 'info' && (
                  <>
                    <div className="mb-1 font-semibold text-white">
                      {amountPanel.code} · {currencyOf(amountPanel.code).name}
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#B8B8B8]">
                      {currencyOf(amountPanel.code).info}
                    </p>
                    <p className="mt-2 font-mono text-[10px] text-[#B8B8B8]">
                      HOLDINGS: UNAVAILABLE — no wallet connected
                    </p>
                    <button
                      type="button"
                      onClick={() => setAmountPanel({ mode: 'actions', code: amountPanel.code })}
                      className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-[#B8B8B8] hover:bg-[#202020]"
                    >
                      ← Back
                    </button>
                  </>
                )}
                {amountPanel.mode === 'earns' && (
                  <>
                    <div className="mb-1 font-semibold text-white">
                      How {amountPanel.code} earns on MTI6
                    </div>
                    <div className="mb-2 text-[11px] text-[#B8B8B8]">
                      Catalogue routes in {currencyOf(amountPanel.code).earnWorld}:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {currencyOf(amountPanel.code).earnRoutes.map((r) => (
                        <span
                          key={r}
                          className="rounded border border-white/15 bg-[#151515] px-1.5 py-0.5 text-[10px] text-white"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] leading-relaxed text-[#B8B8B8]">
                      Routes are catalogue entries — nothing is live. Feeds are
                      NOT_CONNECTED and execution is DISABLED, so no earnings are
                      claimed for {amountPanel.code} yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => setAmountPanel({ mode: 'actions', code: amountPanel.code })}
                      className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-[#B8B8B8] hover:bg-[#202020]"
                    >
                      ← Back
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Phone search sheet — full width under the bar */}
        {phoneSearchOpen && (
          <div className="border-t border-white/10 px-4 py-2 md:hidden">
            {renderSearchField()}
          </div>
        )}

        {/* ☰ PLATFORM MENU (owner revision, 2026-11-23): the logo is
            the menu, and the menu shows EVERYTHING the platform does —
            all ten worlds as cards, all twelve screens as rows, one tap
            to navigate — over the shell controls in its footer. Always
            mounted (hidden while closed) so the controls, and the
            "Execution disabled by design" notice, stay in the header. */}
        <div hidden={!menuOpen} className="border-t border-white/10">
          <div className="mx-auto max-h-[72dvh] w-full max-w-[1600px] space-y-4 overflow-y-auto px-4 py-4">
            {/* Brand + platform status */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold tracking-wide">
                  {MTI6_WORLD_OS?.name ?? 'MTI6 GTADWIY COCKPIT'}
                </div>
                <div className="text-[11px] text-[#B8B8B8]">
                  Everything the platform does — every world, every screen, one tap away.
                </div>
              </div>
              <div className="font-mono text-[10px] text-[#B8B8B8]">
                WORLD ENGINE 957 NODES · ENCYCLOPEDIA 826 · ENTITIES 48 · STAR{' '}
                  {starConfigured ? 'CONNECTED' : 'DEMO / NOT_CONNECTED'}
              </div>
            </div>

            {/* Worlds */}
            <div>
              <div className="mb-2 font-mono text-[10px] tracking-widest text-[#00B7FF]">WORLDS</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
                {MENU_WORLD_IDS.map((id) => WORLDS.find((w) => w.id === id)!).map((w) => {
                  const active = activeWorld === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => selectFromMenu(w.id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        active
                          ? 'border-[#00B7FF] bg-[#00B7FF]/10'
                          : 'border-white/10 bg-[#101010] hover:border-[#00B7FF]/50'
                      }`}
                    >
                      <span
                        className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#151515] [&>svg]:h-4 [&>svg]:w-4"
                        style={{ color: w.accent }}
                      >
                        {w.icon}
                      </span>
                      <span className="block text-xs font-semibold text-white">{w.label}</span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-[#B8B8B8]">
                        {MENU_DESC[w.id]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Screens */}
            <div>
              <div className="mb-2 font-mono text-[10px] tracking-widest text-[#00B7FF]">SCREENS</div>
              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-4">
                {WORLDS.filter((w) => !MENU_WORLD_IDS.includes(w.id)).map((w) => {
                  const active = activeWorld === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => selectFromMenu(w.id)}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                        active
                          ? 'border-[#00B7FF] bg-[#00B7FF]/10 text-white'
                          : 'border-white/10 bg-[#101010] text-[#B8B8B8] hover:border-[#00B7FF]/50 hover:text-white'
                      }`}
                    >
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4"
                        style={{ color: w.accent }}
                      >
                        {w.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-semibold">{w.label}</span>
                        <span className="block truncate text-[9px] text-[#B8B8B8]">
                          {MENU_DESC[w.id]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shell controls footer */}
            <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
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

              {/* Execution Mode Strip */}
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
              </div>
            </div>
          </div>
        </div>

        {/* 5 — screens rail: scrollable, never wraps, active centred */}
        <nav
          className="mx-auto flex w-full max-w-[1600px] overflow-x-auto px-4 pb-2 pt-1"
          style={{ gap: MTI6_RAIL.gapPx }}
        >
          {visibleWorlds.map((w) => {
            const active = activeWorld === w.id;
            return (
              <button
                key={w.id}
                ref={active ? activeRailBtnRef : undefined}
                onClick={() => setActiveWorld(w.id)}
                className="flex shrink-0 items-center gap-2 rounded-xl border py-1.5 text-xs font-medium transition"
                style={{
                  paddingInline: MTI6_RAIL.itemPadXPx,
                  backgroundColor: active ? MTI6_RAIL.activeBg : MTI6_RAIL.idleBg,
                  borderColor: active ? MTI6_RAIL.activeBorder : MTI6_RAIL.idleBorder,
                  color: active ? '#FFFFFF' : '#B8B8B8',
                }}
              >
                {/* Nav-overlap fix (Phase 1 follow-up, 2026-11-22) kept:
                    the icon lives in a fixed MTI6_RAIL.iconBoxPx (16px)
                    flex box that can neither shrink nor overflow, and the
                    label is shrink-0 + nowrap, so the icon can never cover
                    the label's first letters. */}
                <span
                  className="flex shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0"
                  style={{
                    width: MTI6_RAIL.iconBoxPx,
                    height: MTI6_RAIL.iconBoxPx,
                    color: active ? w.accent : undefined,
                  }}
                >
                  {w.icon}
                </span>
                <span className="shrink-0 whitespace-nowrap">{w.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Web tab strip — the cockpit's kept browser tabs (owner
          revision, 2026-11-23). Shown only when web tabs exist.
          Clicking a tab re-opens its page in a real browser tab;
          pinning keeps it across sessions. */}
      {webTabs.length > 0 && (
        <div className="border-b border-white/10 bg-[#0b0b0b]">
          <div className="mx-auto flex w-full max-w-[1600px] items-center gap-1.5 overflow-x-auto px-4 py-1.5">
            <span className="shrink-0 font-mono text-[9px] tracking-widest text-[#B8B8B8]">
              WEB TABS
            </span>
            {webTabs.map((tab) => (
              <div
                key={tab.id}
                className={`flex shrink-0 items-center gap-1 rounded-lg border px-1.5 py-1 text-[11px] ${
                  tab.pinned
                    ? 'border-[#8B5CFF]/60 bg-[#8B5CFF]/10 text-white'
                    : 'border-white/10 bg-[#121212] text-[#B8B8B8]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => togglePinTab(tab.id)}
                  aria-label={tab.pinned ? `Unpin tab ${tab.title}` : `Pin tab ${tab.title}`}
                  title={tab.pinned ? 'Pinned — tap to unpin' : 'Pin this tab'}
                  className={tab.pinned ? 'text-[#8B5CFF]' : 'text-[#B8B8B8] hover:text-white'}
                >
                  <Pin className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => window.open(tab.url, '_blank', 'noopener,noreferrer')}
                  className="max-w-[160px] truncate hover:text-white"
                  title={tab.url}
                >
                  {tab.title}
                </button>
                <button
                  type="button"
                  onClick={() => closeWebTab(tab.id)}
                  aria-label={`Close tab ${tab.title}`}
                  className="text-[#B8B8B8] hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Wallet Slide-Over (the black card's panel) */}
      {accountsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="h-full w-full max-w-md border-l border-white/15 bg-[#101010] p-6 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-semibold">Wallet</h3>
                <div className="text-[11px] text-[#B8B8B8]">
                  Currencies held · transactions · accounts rails
                </div>
              </div>
              <button
                onClick={() => setAccountsOpen(false)}
                className="rounded-lg p-1.5 text-[#B8B8B8] hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 space-y-3 text-xs">
              <div className="rounded-xl bg-[#151515] p-3.5">
                <div className="font-semibold text-white">Currencies Held</div>
                <div className="mt-1 text-[#B8B8B8]">
                  No wallet is connected — holdings are UNAVAILABLE for every
                  currency, never $0.00.
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {DISPLAY_CURRENCIES.map((c) => (
                    <div
                      key={c.code}
                      className="flex items-center justify-between rounded-lg bg-[#101010] px-2 py-1.5"
                    >
                      <span className="font-semibold text-white">{c.code}</span>
                      <span className="font-mono text-[9px] text-[#B8B8B8]">UNAVAILABLE</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-[#151515] p-3.5">
                <div className="font-semibold text-white">Transactions</div>
                <div className="mt-1 font-mono text-[11px] text-[#B8B8B8]">
                  NO DATA — no wallet connected; no transactions are recorded.
                </div>
              </div>
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
          <div className="w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-[#00B7FF]/40 bg-[#101010] p-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <span className="font-semibold text-[#00B7FF] flex items-center gap-1.5">
                {/* STAR's face is the owner's designated portrait
                    (2026-11-16 rulings). Expression mirrors real UI
                    state only: thinking while a reply is in flight,
                    smile while the panel is open and idle — never
                    faked timing (Embodiment Build 1 honesty bound). */}
                <img
                  src={starBusy ? STAR_EXPRESSIONS.thinking : STAR_EXPRESSIONS.smile}
                  alt="STAR"
                  className="h-8 w-8 rounded-full border border-[#8B5CFF]/60 object-cover"
                />{' '}
                STAR Core Assistant
              </span>
              <button onClick={() => setStarOrbOpen(false)} className="text-[#B8B8B8] hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[#B8B8B8]">
              Active World: <strong className="text-white">{activeWorld}</strong> · Mode:{' '}
              <strong className="text-[#8B5CFF]">{executionMode}</strong>.{' '}
              {starConfigured === null
                ? 'STAR — checking the gateway… Execution disabled by design.'
                : starConfigured
                  ? `STAR — CONNECTED · ${starModel ?? 'model unknown'} · via the MTI6 gateway. Execution disabled by design.`
                  : 'STAR demo / NOT_CONNECTED — no provider key is configured on the server. Execution disabled by design.'}
            </p>
            {starThread.length > 0 && (
              <div className="mt-2 max-h-64 space-y-2 overflow-y-auto border-t border-white/10 pt-2 pr-1">
                {starThread.map((m, i) => (
                  <div
                    key={i}
                    className={`rounded-lg px-2.5 py-2 leading-relaxed ${
                      m.role === 'user'
                        ? 'ml-5 border border-[#00B7FF]/40 bg-[#00B7FF]/10'
                        : m.kind === 'error'
                          ? 'mr-5 border border-[#FFB020]/50 bg-[#FFB020]/10'
                          : m.kind === 'demo'
                            ? 'mr-5 border border-white/15 bg-[#151515] text-[#B8B8B8]'
                            : 'mr-5 border border-[#8B5CFF]/40 bg-[#8B5CFF]/10'
                    }`}
                  >
                    <div className="mb-0.5 font-mono text-[9px] text-[#B8B8B8]">
                      {m.role === 'user' ? 'YOU' : 'STAR'}
                      {m.kind === 'demo' ? ' · DEMO' : ''}
                      {m.kind === 'error' ? ' · ERROR' : ''}
                    </div>
                    <div className="whitespace-pre-wrap text-white">{m.content}</div>
                  </div>
                ))}
                {starBusy && (
                  <p className="font-mono text-[10px] text-[#B8B8B8]">STAR IS THINKING…</p>
                )}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendStar(starInput);
              }}
              className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2"
            >
              <input
                value={starInput}
                onChange={(e) => setStarInput(e.target.value)}
                placeholder="Ask STAR…"
                aria-label="Message STAR"
                className="h-9 min-w-0 flex-1 rounded-lg border border-[#8B5CFF]/40 bg-[#050505] px-2.5 text-xs text-white outline-none placeholder:text-[#B8B8B8]/70 focus:border-[#8B5CFF]"
              />
              <button
                type="submit"
                disabled={starBusy || starInput.trim().length === 0}
                aria-label="Send to STAR"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#8B5CFF] text-white transition hover:opacity-90 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
        <button
          onClick={() => setStarOrbOpen((v) => !v)}
          aria-label="STAR Orb"
          className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#00B7FF]/60 bg-[#101010] shadow-[0_0_25px_rgba(0,183,255,0.45)] transition hover:scale-105"
        >
          <img src={STAR_PORTRAIT} alt="STAR" className="h-full w-full object-cover" />
        </button>
      </div>
    </div>
  );
}

export default App;
