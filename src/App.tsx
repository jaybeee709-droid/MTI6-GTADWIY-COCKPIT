import React, { useMemo, useState } from 'react';
import {
  Activity,
  Briefcase,
  Coins,
  Compass,
  Cpu,
  DollarSign,
  Globe,
  Layers,
  Maximize2,
  Minimize2,
  Search,
  Settings,
  Shield,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { MTI6_COLORS, MTI6_WORLD_OS } from './tokens';

type ViewMode = 'Standard' | 'Advanced' | 'All';
type ExecutionMode = 'MANUAL' | 'MANUAL+AI' | 'AUTO';

interface WorldDefinition {
  id: string;
  name: string;
  tagline: string;
  domainRule: string;
  accent: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

interface FloatingWindow {
  id: string;
  title: string;
  subtitle: string;
  minimized: boolean;
}

const WORLDS: WorldDefinition[] = [
  {
    id: 'crypto',
    name: 'Crypto World',
    tagline: 'On-chain assets, wallets & digital telemetry',
    domainRule: 'Strictly Crypto',
    accent: MTI6_COLORS.accentCyan,
    icon: Coins,
  },
  {
    id: 'earnings',
    name: 'Earnings',
    tagline: 'Fiat income, dividends & revenue streams',
    domainRule: 'Strictly Non-Crypto',
    accent: MTI6_COLORS.statusSuccess,
    icon: DollarSign,
  },
  {
    id: 'markets',
    name: 'Markets',
    tagline: 'Equities, macro indices & liquidity feeds',
    domainRule: 'Global Markets',
    accent: MTI6_COLORS.accentBlue,
    icon: Activity,
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    tagline: 'Cross-world allocation & risk balance',
    domainRule: 'Net Exposure',
    accent: MTI6_COLORS.accentCyan,
    icon: Briefcase,
  },
  {
    id: 'intelligence',
    name: 'Intelligence',
    tagline: 'Research briefs, signals & synthesis',
    domainRule: 'AI Analysis',
    accent: MTI6_COLORS.accentViolet,
    icon: Cpu,
  },
  {
    id: 'operations',
    name: 'Operations',
    tagline: 'Daily workflows & mission execution',
    domainRule: 'Ops Control',
    accent: MTI6_COLORS.accentBlue,
    icon: Layers,
  },
  {
    id: 'automation',
    name: 'Automation',
    tagline: 'Rules, triggers & scheduled pipelines',
    domainRule: 'Agentic Flows',
    accent: MTI6_COLORS.accentViolet,
    icon: Compass,
  },
  {
    id: 'security',
    name: 'Security',
    tagline: 'Zero-secret posture & read-only audits',
    domainRule: 'Zero-Secrets Enforced',
    accent: MTI6_COLORS.statusDanger,
    icon: Shield,
  },
  {
    id: 'governance',
    name: 'Governance',
    tagline: 'Policies, guardrails & branch rules',
    domainRule: 'Compliance',
    accent: MTI6_COLORS.textSecondary,
    icon: UserCheck,
  },
  {
    id: 'system',
    name: 'System',
    tagline: 'IndexedDB, PWA sync & shell preferences',
    domainRule: 'OS Kernel',
    accent: MTI6_COLORS.accentCyan,
    icon: Settings,
  },
];

export function App() {
  const [activeWorldId, setActiveWorldId] = useState<string>('globe');
  const [viewMode, setViewMode] = useState<ViewMode>('Standard');
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('MANUAL+AI');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [starOpen, setStarOpen] = useState<boolean>(false);
  const [windows, setWindows] = useState<FloatingWindow[]>([
    {
      id: 'telemetry-win',
      title: 'World Globe Telemetry',
      subtitle: '10 Self-Contained Worlds Online',
      minimized: false,
    },
  ]);

  const filteredWorlds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return WORLDS;
    return WORLDS.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.tagline.toLowerCase().includes(q) ||
        w.domainRule.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const openWindow = (id: string, title: string, subtitle: string) => {
    setWindows((prev) => {
      const existing = prev.find((w) => w.id === id);
      if (existing) {
        return prev.map((w) => (w.id === id ? { ...w, minimized: false } : w));
      }
      return [...prev, { id, title, subtitle, minimized: false }];
    });
  };

  const toggleMinimizeWindow = (id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w))
    );
  };

  const closeWindow = (id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  };

  const selectWorld = (world: WorldDefinition) => {
    setActiveWorldId(world.id);
    openWindow(`world-${world.id}`, world.name, `${world.domainRule} - ${world.tagline}`);
  };

  const activeWorld = WORLDS.find((w) => w.id === activeWorldId);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: MTI6_WORLD_OS.canvas,
        color: MTI6_COLORS.textPrimary,
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Command Bar */}
      <header
        style={{
          backgroundColor: MTI6_WORLD_OS.shellSurface,
          borderBottom: `1px solid ${MTI6_WORLD_OS.borderInteractive}`,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setActiveWorldId('globe')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor:
                activeWorldId === 'globe' ? MTI6_COLORS.bgInteractive : 'transparent',
              color: MTI6_COLORS.textPrimary,
              border: `1px solid ${
                activeWorldId === 'globe'
                  ? MTI6_WORLD_OS.focusRing
                  : MTI6_WORLD_OS.borderInteractive
              }`,
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <Globe size={18} color={MTI6_COLORS.accentCyan} />
            <span>World Globe</span>
          </button>
          <span style={{ color: MTI6_COLORS.textSecondary, fontSize: '13px' }}>
            MTI6-GTADWIY OS
          </span>
        </div>

        {/* Universal Search */}
        <div
          style={{
            flex: '1 1 280px',
            maxWidth: '460px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: MTI6_WORLD_OS.worldCard,
            border: `1px solid ${MTI6_WORLD_OS.borderInteractive}`,
            borderRadius: '8px',
            padding: '8px 12px',
          }}
        >
          <Search size={16} color={MTI6_COLORS.textSecondary} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Universal Search across 10 Worlds..."
            aria-label="Universal Search"
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: MTI6_COLORS.textPrimary,
              fontSize: '14px',
            }}
          />
        </div>

        {/* View Mode Switcher & Accounts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            role="group"
            aria-label="View Mode"
            style={{
              display: 'flex',
              backgroundColor: MTI6_WORLD_OS.worldCard,
              border: `1px solid ${MTI6_WORLD_OS.borderInteractive}`,
              borderRadius: '8px',
              padding: '3px',
            }}
          >
            {(['Standard', 'Advanced', 'All'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor:
                    viewMode === mode ? MTI6_COLORS.bgInteractive : 'transparent',
                  color:
                    viewMode === mode
                      ? MTI6_COLORS.accentCyan
                      : MTI6_COLORS.textSecondary,
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              openWindow(
                'accounts-win',
                'Accounts',
                'Read-only session directory (Zero private keys or secrets stored)'
              )
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: MTI6_COLORS.bgInteractive,
              color: MTI6_COLORS.textPrimary,
              border: `1px solid ${MTI6_WORLD_OS.borderInteractive}`,
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <UserCheck size={16} color={MTI6_COLORS.accentCyan} />
            <span>Accounts</span>
          </button>
        </div>
      </header>

      {/* Execution Mode Strip */}
      <div
        style={{
          backgroundColor: MTI6_COLORS.bgPrimary,
          borderBottom: `1px solid ${MTI6_WORLD_OS.borderInteractive}`,
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: MTI6_COLORS.textSecondary,
            }}
          >
            Execution Mode
          </span>
          {(['MANUAL', 'MANUAL+AI', 'AUTO'] as ExecutionMode[]).map((mode) => {
            const active = executionMode === mode;
            const activeColor =
              mode === 'AUTO'
                ? MTI6_COLORS.accentViolet
                : mode === 'MANUAL+AI'
                ? MTI6_COLORS.accentCyan
                : MTI6_COLORS.accentBlue;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setExecutionMode(mode)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: active ? MTI6_COLORS.bgInteractive : 'transparent',
                  color: active ? activeColor : MTI6_COLORS.textSecondary,
                  border: `1px solid ${
                    active ? activeColor : MTI6_WORLD_OS.borderInteractive
                  }`,
                }}
              >
                {mode}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: '12px', color: MTI6_COLORS.textSecondary }}>
          View: <strong style={{ color: MTI6_COLORS.textPrimary }}>{viewMode}</strong> |
          Root: <strong style={{ color: MTI6_COLORS.accentCyan }}>World Globe</strong>
        </div>
      </div>

      {/* Main OS Workspace */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* 10-World Navigation Rail */}
        <nav
          aria-label="10-World Navigation"
          style={{
            width: '240px',
            backgroundColor: MTI6_WORLD_OS.shellSurface,
            borderRight: `1px solid ${MTI6_WORLD_OS.borderInteractive}`,
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            overflowY: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveWorldId('globe')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${
                activeWorldId === 'globe'
                  ? MTI6_COLORS.accentCyan
                  : 'transparent'
              }`,
              backgroundColor:
                activeWorldId === 'globe' ? MTI6_COLORS.bgInteractive : 'transparent',
              color: MTI6_COLORS.textPrimary,
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            <Globe size={16} color={MTI6_COLORS.accentCyan} />
            <span>World Globe (Home)</span>
          </button>

          <div
            style={{
              fontSize: '11px',
              color: MTI6_COLORS.textSecondary,
              padding: '8px 8px 2px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            10 Self-Contained Worlds
          </div>

          {WORLDS.map((world) => {
            const Icon = world.icon;
            const isActive = activeWorldId === world.id;
            return (
              <button
                key={world.id}
                type="button"
                onClick={() => selectWorld(world)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${isActive ? world.accent : 'transparent'}`,
                  backgroundColor: isActive ? MTI6_COLORS.bgInteractive : 'transparent',
                  color: MTI6_COLORS.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '13px',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon size={15} color={world.accent} />
                  <span>{world.name}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Active World / Globe Canvas */}
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {activeWorldId === 'globe' ? (
            <div>
              <div
                style={{
                  backgroundColor: MTI6_WORLD_OS.worldCard,
                  border: `1px solid ${MTI6_WORLD_OS.borderInteractive}`,
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div>
                  <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>
                    World Globe — Master Home
                  </h1>
                  <p
                    style={{
                      margin: '6px 0 0',
                      color: MTI6_COLORS.textSecondary,
                      fontSize: '14px',
                    }}
                  >
                    10 self-contained Worlds. Crypto World is strictly crypto; Earnings
                    is strictly non-crypto.
                  </p>
                </div>
                <Globe size={42} color={MTI6_COLORS.accentCyan} />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '14px',
                }}
              >
                {filteredWorlds.map((world) => {
                  const Icon = world.icon;
                  return (
                    <button
                      key={world.id}
                      type="button"
                      onClick={() => selectWorld(world)}
                      style={{
                        backgroundColor: MTI6_WORLD_OS.worldCard,
                        border: `1px solid ${MTI6_WORLD_OS.borderInteractive}`,
                        borderRadius: '10px',
                        padding: '16px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: MTI6_COLORS.textPrimary,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Icon size={20} color={world.accent} />
                        <span
                          style={{
                            fontSize: '11px',
                            color: world.accent,
                            fontWeight: 600,
                          }}
                        >
                          {world.domainRule}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{world.name}</div>
                      <div style={{ fontSize: '12px', color: MTI6_COLORS.textSecondary }}>
                        {world.tagline}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            activeWorld && (
              <div
                style={{
                  backgroundColor: MTI6_WORLD_OS.worldCard,
                  border: `1px solid ${activeWorld.accent}`,
                  borderRadius: '12px',
                  padding: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <activeWorld.icon size={24} color={activeWorld.accent} />
                  <div>
                    <h1 style={{ margin: 0, fontSize: '20px' }}>{activeWorld.name}</h1>
                    <p
                      style={{
                        margin: '4px 0 0',
                        color: MTI6_COLORS.textSecondary,
                        fontSize: '13px',
                      }}
                    >
                      {activeWorld.domainRule} — {activeWorld.tagline}
                    </p>
                  </div>
                </div>
              </div>
            )
          )}
        </main>
      </div>

      {/* Floating Window Manager */}
      <section
        aria-label="Floating Window Manager"
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '260px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          pointerEvents: 'none',
          zIndex: 30,
        }}
      >
        {windows.map((win) => (
          <div
            key={win.id}
            style={{
              width: '280px',
              backgroundColor: MTI6_COLORS.bgElevated,
              border: `1px solid ${MTI6_WORLD_OS.borderInteractive}`,
              borderRadius: '10px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              pointerEvents: 'auto',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                backgroundColor: MTI6_COLORS.bgInteractive,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: win.minimized
                  ? 'none'
                  : `1px solid ${MTI6_WORLD_OS.borderInteractive}`,
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700 }}>{win.title}</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => toggleMinimizeWindow(win.id)}
                  aria-label={`Toggle ${win.title}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: MTI6_COLORS.textSecondary,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {win.minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => closeWindow(win.id)}
                  aria-label={`Close ${win.title}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: MTI6_COLORS.textSecondary,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            {!win.minimized && (
              <div
                style={{
                  padding: '12px',
                  fontSize: '12px',
                  color: MTI6_COLORS.textSecondary,
                }}
              >
                {win.subtitle}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Persistent Lower-Right STAR Orb */}
      <div
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '10px',
        }}
      >
        {starOpen && (
          <div
            style={{
              width: '300px',
              backgroundColor: MTI6_COLORS.bgElevated,
              border: `1px solid ${MTI6_WORLD_OS.intelligenceAccent}`,
              borderRadius: '12px',
              padding: '14px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.65)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <strong style={{ color: MTI6_COLORS.accentViolet, fontSize: '13px' }}>
                STAR Intelligence
              </strong>
              <span style={{ fontSize: '11px', color: MTI6_COLORS.textSecondary }}>
                {executionMode}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: MTI6_COLORS.textSecondary }}>
              Active Context: {activeWorld ? activeWorld.name : 'World Globe'} ({viewMode}{' '}
              View)
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setStarOpen((prev) => !prev)}
          aria-label="STAR Orb"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '9999px',
            border: `2px solid ${MTI6_COLORS.accentCyan}`,
            background: `radial-gradient(circle at 30% 30%, ${MTI6_COLORS.accentViolet}, ${MTI6_COLORS.bgVoid})`,
            color: MTI6_COLORS.textPrimary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: `0 0 20px ${MTI6_COLORS.accentViolet}`,
          }}
        >
          <Sparkles size={22} color={MTI6_COLORS.textPrimary} />
        </button>
      </div>
    </div>
  );
}

export default App;
