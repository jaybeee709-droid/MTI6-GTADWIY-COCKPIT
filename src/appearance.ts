/* Appearance Studio / Visual Universe (v223).
 *
 * ONE RULE ABOVE ALL: the colour law is not themeable. Status
 * colours carry meaning — green = profit / verified / executed,
 * red = ACTIVE CRITICAL ALERT ONLY, amber = warning / watch,
 * violet = STAR / AI / bot workers — and no theme, preset or
 * custom colour may reassign them. Themes change the chrome:
 * background, surfaces, accent, glow, window chrome, particles.
 * The alert-colour slots below let Daniel pick the SHADE inside
 * each meaning (a deeper critical red, a brighter warning amber)
 * — never the meaning itself.
 *
 * SECOND RULE: canonical identities are not themeable. STAR's face
 * is Daniel's portrait and his body is the ruled heroic build; the
 * 12 Tribe principals and the Angels are ruled embodiments. Themes
 * change their glow, frame and presence treatment — never the face
 * or body underneath.
 *
 * Everything here applies LIVE (no save step) and persists in
 * localStorage under APPEARANCE_KEY. The engine is documentElement
 * CSS variables + data attributes; components that need a treatment
 * read them from the DOM, so no prop threading is required except
 * for the Studio screen itself. */

export const APPEARANCE_KEY = 'mti6_appearance_v1';

/* ---- colour law: fixed, never themeable ---- */
export const STATUS_COLORS = {
  profit: '#32D74B',
  verified: '#32D74B',
  critical: '#FF3B30',
  warning: '#FFB020',
  star: '#8B5CFF',
  normal: '#00B7FF',
} as const;

export interface ThemeDef {
  id: string;
  name: string;
  blurb: string;
  bg: string;
  surface: string;
  surface2: string;
  accent: string;
  text: string;
  muted: string;
  border: string;
  glow: string;
}

export const THEMES: ThemeDef[] = [
  { id: 'electric-blue', name: 'Electric Blue Command', blurb: 'The cockpit as built — matte black, electric blue command lines, purple STAR.', bg: '#050505', surface: '#101010', surface2: '#151515', accent: '#00B7FF', text: '#FFFFFF', muted: '#B8B8B8', border: '#202020', glow: 'rgba(0,183,255,0.45)' },
  { id: 'stainless-steel', name: 'Stainless Steel Silver', blurb: 'Steel panels, white lighting, silver globe, chrome effects.', bg: '#0B0D10', surface: '#171B20', surface2: '#1F242B', accent: '#C8CFD8', text: '#F2F5F8', muted: '#9AA4B0', border: '#2C333D', glow: 'rgba(200,207,216,0.35)' },
  { id: 'black-ops', name: 'Black Ops Tactical', blurb: 'Near-black deck, muted green-grey command, red reserved for real alerts.', bg: '#030403', surface: '#0C0F0C', surface2: '#12160F', accent: '#7A8B6F', text: '#E8EDE4', muted: '#8A9484', border: '#1E241C', glow: 'rgba(122,139,111,0.35)' },
  { id: 'purple-star', name: 'Purple STAR', blurb: 'STAR violet runs the whole deck — the AI civilization look.', bg: '#070510', surface: '#120E24', surface2: '#181230', accent: '#8B5CFF', text: '#FFFFFF', muted: '#B3A8D8', border: '#2A2145', glow: 'rgba(139,92,255,0.5)' },
  { id: 'cyberpunk-neon', name: 'Cyberpunk Neon', blurb: 'Hot magenta-cyan neon on black. Loud on purpose.', bg: '#050208', surface: '#12081C', surface2: '#1A0C28', accent: '#FF2E88', text: '#FFFFFF', muted: '#C49AC8', border: '#33184A', glow: 'rgba(255,46,136,0.45)' },
  { id: 'futuristic-white', name: 'Futuristic White', blurb: 'Light deck, dark text, blue command lines. Same engine, inverted.', bg: '#F2F4F7', surface: '#FFFFFF', surface2: '#E8ECF1', accent: '#0066FF', text: '#0B0D10', muted: '#5A6472', border: '#D4DAE2', glow: 'rgba(0,102,255,0.25)' },
  { id: 'space-command', name: 'Space Command', blurb: 'Deep-space navy, starfield blacks, cyan telemetry.', bg: '#02040A', surface: '#081120', surface2: '#0C1830', accent: '#33CFFF', text: '#EAF6FF', muted: '#8FA8C4', border: '#16283F', glow: 'rgba(51,207,255,0.4)' },
  { id: 'enterprise', name: 'Enterprise Control Room', blurb: 'Muted slate, calm blues, boardroom-grade restraint.', bg: '#0D1117', surface: '#161B22', surface2: '#1C2330', accent: '#4A90D9', text: '#E6EDF3', muted: '#8B949E', border: '#2A3340', glow: 'rgba(74,144,217,0.3)' },
  { id: 'holographic-glass', name: 'Holographic Glass', blurb: 'Translucent panels, soft violet-cyan light, glass everywhere.', bg: '#060A12', surface: 'rgba(16,24,40,0.72)', surface2: 'rgba(24,34,56,0.72)', accent: '#7DD3FC', text: '#F0F9FF', muted: '#A5C4D8', border: 'rgba(125,211,252,0.25)', glow: 'rgba(125,211,252,0.4)' },
  { id: 'military-ops', name: 'Military Operations Center', blurb: 'Olive drab, amber command, stencil discipline.', bg: '#0A0B06', surface: '#14160C', surface2: '#1B1E10', accent: '#D9A441', text: '#F2EDDC', muted: '#A89E7C', border: '#2A2D1A', glow: 'rgba(217,164,65,0.35)' },
  { id: 'custom', name: 'Custom Theme', blurb: 'Your own colours, built in the Custom Builder below.', bg: '#050505', surface: '#101010', surface2: '#151515', accent: '#00B7FF', text: '#FFFFFF', muted: '#B8B8B8', border: '#202020', glow: 'rgba(0,183,255,0.45)' },
];

export type WindowStyle = 'glass' | 'steel' | 'carbon' | 'neon' | 'hud' | 'transparent' | 'deck';
export type AlertStyle = 'futuristic' | 'tactical' | 'executive' | 'ai';
export type PresenceStyle = 'hologram' | 'realistic' | 'stylized' | 'tactical' | 'futuristic';
export type EffectsLevel = 'minimal' | 'standard' | 'enhanced' | 'cinematic' | 'extreme';
export type FontScale = 'compact' | 'standard' | 'comfortable';
export type StarGlow = 'blue' | 'purple' | 'silver' | 'white' | 'gold' | 'custom';
export type StarVoice = 'executive' | 'friendly' | 'strategic' | 'scientific' | 'mentor';
export type GlobeRoute = 'blue' | 'purple' | 'gold' | 'white';
export type RouteStyle = 'solid' | 'pulse' | 'lightning' | 'laser' | 'stream';
export type GlobeType =
  | 'realistic'
  | 'satellite'
  | 'wireframe'
  | 'terrain'
  | 'tron'
  | 'holographic'
  | 'data'
  | 'network'
  | 'steel'
  | 'electric';

export interface MediaAsset {
  id: string;
  name: string;
  kind: 'wallpaper';
  source: 'User Uploaded' | 'Public Domain' | 'Creative Commons' | 'Licensed' | 'MTI6 Original';
  license: string;
  dataUrl: string;
  createdAt: number;
}

export interface ThemePreset {
  id: string;
  name: string;
  createdAt: number;
  builtin?: boolean;
  snapshot: Omit<AppearanceSettings, 'presets' | 'media'>;
}

export interface AppearanceSettings {
  themeId: string;
  customTheme: { accent: string; surface: string; bg: string } | null;
  starGlow: StarGlow;
  starGlowCustom: string;
  starAura: boolean;
  starIdle: boolean;
  starVoice: StarVoice;
  windowStyle: WindowStyle;
  windowRadius: number;
  windowOpacity: number;
  windowGlow: number;
  particlesEnabled: boolean;
  effectsLevel: EffectsLevel;
  alertStyle: AlertStyle;
  alertColors: { normal: string; warning: string; critical: string; success: string };
  dynamicMood: boolean;
  fontScale: FontScale;
  globeType: GlobeType;
  globeRoute: GlobeRoute;
  routeStyle: RouteStyle;
  globeParticles: boolean;
  tribePresence: PresenceStyle;
  media: MediaAsset[];
  activeWallpaper: string | null;
  presets: ThemePreset[];
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  themeId: 'electric-blue',
  customTheme: null,
  starGlow: 'blue',
  starGlowCustom: '#00B7FF',
  starAura: true,
  starIdle: true,
  starVoice: 'executive',
  windowStyle: 'glass',
  windowRadius: 16,
  windowOpacity: 1,
  windowGlow: 0.5,
  particlesEnabled: true,
  effectsLevel: 'standard',
  alertStyle: 'futuristic',
  alertColors: {
    normal: STATUS_COLORS.normal,
    warning: STATUS_COLORS.warning,
    critical: STATUS_COLORS.critical,
    success: STATUS_COLORS.profit,
  },
  dynamicMood: true,
  fontScale: 'standard',
  globeType: 'realistic',
  globeRoute: 'blue',
  routeStyle: 'solid',
  globeParticles: false,
  tribePresence: 'hologram',
  media: [],
  activeWallpaper: null,
  presets: [],
};

export const STAR_GLOW_COLORS: Record<StarGlow, string> = {
  blue: '#00B7FF',
  purple: '#8B5CFF',
  silver: '#C8CFD8',
  white: '#FFFFFF',
  gold: '#D9A441',
  custom: '#00B7FF',
};

export const GLOBE_ROUTE_COLORS: Record<GlobeRoute, string> = {
  blue: '#00B7FF',
  purple: '#8B5CFF',
  gold: '#D9A441',
  white: '#FFFFFF',
};

/* Built-in presets — the advisor's four example worlds, expressed
 * as snapshots of real settings (not pictures). */
export function builtinPresets(): ThemePreset[] {
  const base = (over: Partial<AppearanceSettings>): Omit<AppearanceSettings, 'presets' | 'media'> => {
    const { presets: _p, media: _m, ...rest } = { ...DEFAULT_APPEARANCE, ...over };
    return rest;
  };
  return [
    { id: 'preset-electric-blue', name: 'MTI6 Electric Blue', createdAt: 0, builtin: true, snapshot: base({ themeId: 'electric-blue', windowStyle: 'deck', tribePresence: 'hologram', effectsLevel: 'standard' }) },
    { id: 'preset-stainless', name: 'Stainless Steel', createdAt: 0, builtin: true, snapshot: base({ themeId: 'stainless-steel', windowStyle: 'steel', starGlow: 'silver', tribePresence: 'realistic', effectsLevel: 'minimal' }) },
    { id: 'preset-crypto', name: 'Crypto World', createdAt: 0, builtin: true, snapshot: base({ themeId: 'electric-blue', globeRoute: 'gold', routeStyle: 'stream', globeParticles: true, effectsLevel: 'enhanced', windowStyle: 'glass' }) },
    { id: 'preset-ai-civ', name: 'AI Civilization', createdAt: 0, builtin: true, snapshot: base({ themeId: 'purple-star', starGlow: 'purple', particlesEnabled: true, effectsLevel: 'cinematic', tribePresence: 'futuristic', windowStyle: 'neon' }) },
  ];
}

export function loadAppearance(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    if (!raw) return { ...DEFAULT_APPEARANCE, presets: [] };
    const parsed = JSON.parse(raw) as Partial<AppearanceSettings>;
    return { ...DEFAULT_APPEARANCE, ...parsed, presets: parsed.presets ?? [] };
  } catch {
    return { ...DEFAULT_APPEARANCE, presets: [] };
  }
}

export function saveAppearance(s: AppearanceSettings): void {
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(s));
  } catch {
    // Persistence is a nicety — the live application already happened.
  }
}

export function resolveTheme(s: AppearanceSettings): ThemeDef {
  const t = THEMES.find((x) => x.id === s.themeId) ?? THEMES[0];
  if (t.id !== 'custom' || !s.customTheme) return t;
  return { ...t, accent: s.customTheme.accent, surface: s.customTheme.surface, bg: s.customTheme.bg };
}

/* Globe Designer → map mapping (v223). A globe type is a preset
 * over the map-view controls: base style + terrain + floor mode.
 * The overlay treatment (Tron grid, holographic scanlines, data /
 * network dots) comes from the CSS layer keyed on
 * data-mti6-globe. Galaxy has no geography source and is not
 * offered. */
export function globeTypeToMap(globeType: GlobeType): {
  base: 'streets' | 'satellite' | 'floor';
  terrain: 'off' | 'hillshade';
  floorMode: 'filled' | 'wireframe';
} {
  switch (globeType) {
    case 'satellite':
      return { base: 'satellite', terrain: 'off', floorMode: 'filled' };
    case 'wireframe':
      return { base: 'floor', terrain: 'off', floorMode: 'wireframe' };
    case 'terrain':
      return { base: 'floor', terrain: 'hillshade', floorMode: 'filled' };
    case 'tron':
      return { base: 'floor', terrain: 'off', floorMode: 'wireframe' };
    case 'holographic':
    case 'data':
    case 'network':
    case 'steel':
    case 'electric':
      return { base: 'floor', terrain: 'off', floorMode: 'filled' };
    case 'realistic':
    default:
      return { base: 'streets', terrain: 'off', floorMode: 'filled' };
  }
}

/* The map-view key lives here so the Globe Designer can retarget
 * the map even while the World Globe screen is unmounted (the
 * screen's live listener only fires while it is mounted). */
export const MAP_VIEW_SEL_KEY = 'mti6_map_view_v1';

/** Apply a globe type to the stored map-view selection as well as
 * the appearance settings. Called by the Studio when Daniel picks
 * a globe type; the World Globe reads this key at mount, so the
 * design lands whether or not the map is on screen. */
export function applyGlobeDesign(globeType: GlobeType): void {
  try {
    const m = globeTypeToMap(globeType);
    const raw = localStorage.getItem(MAP_VIEW_SEL_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      MAP_VIEW_SEL_KEY,
      JSON.stringify({ ...prev, base: m.base, terrain: m.terrain }),
    );
  } catch {
    // The live listener covers the mounted case; this is the
    // unmounted fallback.
  }
}

export function starGlowHex(s: AppearanceSettings): string {
  return s.starGlow === 'custom' ? s.starGlowCustom : STAR_GLOW_COLORS[s.starGlow];
}

/** Apply the settings to the live document: CSS variables + data
 * attributes. Called on boot and on every change — there is no
 * save step; the cockpit IS the preview. */
export function applyAppearance(s: AppearanceSettings): void {
  if (typeof document === 'undefined') return;
  const t = resolveTheme(s);
  const root = document.documentElement;
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  set('--mti6-bg', t.bg);
  set('--mti6-surface', t.surface);
  set('--mti6-surface2', t.surface2);
  set('--mti6-accent', t.accent);
  set('--mti6-text', t.text);
  set('--mti6-muted', t.muted);
  set('--mti6-border', t.border);
  set('--mti6-glow', t.glow);
  set('--mti6-star-glow', starGlowHex(s));
  set('--mti6-route', GLOBE_ROUTE_COLORS[s.globeRoute]);
  set('--mti6-alert-normal', s.alertColors.normal);
  set('--mti6-alert-warning', s.alertColors.warning);
  set('--mti6-alert-critical', s.alertColors.critical);
  set('--mti6-alert-success', s.alertColors.success);
  set('--mti6-win-radius', `${s.windowRadius}px`);
  set('--mti6-win-opacity', String(s.windowOpacity));
  set('--mti6-win-glow', String(s.windowGlow));
  set('--mti6-font-scale', s.fontScale === 'compact' ? '13px' : s.fontScale === 'comfortable' ? '15px' : '14px');
  root.dataset.mti6Theme = t.id;
  root.dataset.mti6Window = s.windowStyle;
  root.dataset.mti6Alert = s.alertStyle;
  root.dataset.mti6Presence = s.tribePresence;
  root.dataset.mti6Globe = s.globeType;
  root.dataset.mti6Effects = s.effectsLevel;
  root.dataset.mti6StarIdle = s.starIdle ? 'on' : 'off';
  root.dataset.mti6StarAura = s.starAura ? 'on' : 'off';
  root.dataset.mti6Particles = s.particlesEnabled ? 'on' : 'off';
  root.dataset.mti6RouteStyle = s.routeStyle;
  const active = s.media.find((m) => m.id === s.activeWallpaper);
  document.body.style.backgroundImage = active ? `url(${active.dataUrl})` : '';
  document.body.style.backgroundSize = active ? 'cover' : '';
  document.body.style.backgroundAttachment = active ? 'fixed' : '';
  document.body.style.backgroundPosition = active ? 'center' : '';
  // Let live surfaces that read appearance (the World Globe's globe
  // design) re-read without a reload.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mti6:appearance'));
  }
}
