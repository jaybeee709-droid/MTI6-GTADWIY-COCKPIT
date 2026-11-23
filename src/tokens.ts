export const MTI6_COLORS = {
  bgVoid: '#050505',
  bgPrimary: '#101010',
  bgElevated: '#151515',
  bgInteractive: '#202020',
  accentCyan: '#00B7FF',
  accentBlue: '#0080FF',
  accentViolet: '#8B5CFF',
  statusDanger: '#FF3B30',
  statusSuccess: '#32D74B',
  textPrimary: '#FFFFFF',
  textSecondary: '#B8B8B8',
} as const;

export type MTI6ColorToken = keyof typeof MTI6_COLORS;

export type WorldAccent =
  | typeof MTI6_COLORS.accentCyan
  | typeof MTI6_COLORS.accentBlue
  | typeof MTI6_COLORS.accentViolet;

export interface WorldShellConfig {
  readonly id: string;
  readonly label: string;
  readonly accent: WorldAccent;
  readonly surface: typeof MTI6_COLORS.bgPrimary;
  readonly card: typeof MTI6_COLORS.bgElevated;
}

export const MTI6_WORLD_OS = {
  canvas: MTI6_COLORS.bgVoid,
  shellSurface: MTI6_COLORS.bgPrimary,
  worldCard: MTI6_COLORS.bgElevated,
  borderInteractive: MTI6_COLORS.bgInteractive,
  focusRing: MTI6_COLORS.accentBlue,
  telemetryPrimary: MTI6_COLORS.accentCyan,
  intelligenceAccent: MTI6_COLORS.accentViolet,
} as const;
