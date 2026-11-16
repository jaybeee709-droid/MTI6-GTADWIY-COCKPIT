/**
 * MTI6 Mobile Cockpit — the 11 canonical sections.
 *
 * This is navigation STRUCTURE only: names, order, glyphs and the
 * truthful shell state of each section in Build 1. It is not platform
 * data — no Encyclopedia taxonomy, entity records, balances, or any
 * other canonical data are copied here. Every section's state is the
 * honest Build 1 state of the mobile shell: its data layer is not
 * connected yet, exactly as the web cockpit would report NOT_CONNECTED
 * for an unwired source.
 */
import type { TruthState } from '../theme/tokens';
import type { DeckTabParamList, RootStackParamList } from '../navigation/types';

export type SectionTarget =
  | { kind: 'tab'; tab: keyof DeckTabParamList }
  | { kind: 'stack'; screen: keyof RootStackParamList };

export interface SectionDef {
  id: string;
  title: string;
  subtitle: string;
  glyph: string;
  target: SectionTarget;
  /** Honest Build 1 state of this section in the mobile shell. */
  state: TruthState;
}

export const sections: SectionDef[] = [
  {
    id: 'globe',
    title: 'World Globe',
    subtitle: 'Home · master entry point',
    glyph: '🌐',
    target: { kind: 'tab', tab: 'Globe' },
    state: 'NOT_CONNECTED',
  },
  {
    id: 'crypto-world',
    title: 'Crypto World',
    subtitle: 'Activities, entities, intelligence',
    glyph: '₿',
    target: { kind: 'tab', tab: 'CryptoWorld' },
    state: 'NOT_CONNECTED',
  },
  {
    id: 'bot-ops',
    title: 'Bot Operations',
    subtitle: 'STAR · Tribes · workers',
    glyph: '🤖',
    target: { kind: 'tab', tab: 'BotOperations' },
    state: 'NOT_CONNECTED',
  },
  {
    id: 'opportunities',
    title: 'Opportunities',
    subtitle: 'Pipeline to PREPARED — never EXECUTED',
    glyph: '🎯',
    target: { kind: 'tab', tab: 'Opportunities' },
    state: 'NOT_CONNECTED',
  },
  {
    id: 'earnings',
    title: 'Earnings',
    subtitle: 'Requires a connected financial authority',
    glyph: '📈',
    target: { kind: 'stack', screen: 'Earnings' },
    state: 'UNAVAILABLE',
  },
  {
    id: 'positions',
    title: 'Positions & Assets',
    subtitle: 'Wallets and holdings',
    glyph: '💼',
    target: { kind: 'stack', screen: 'Positions' },
    state: 'NOT_CONNECTED',
  },
  {
    id: 'encyclopedia',
    title: 'Encyclopedia',
    subtitle: 'Canonical knowledge backbone',
    glyph: '📚',
    target: { kind: 'stack', screen: 'Encyclopedia' },
    state: 'NOT_CONNECTED',
  },
  {
    id: 'operations',
    title: 'Operations',
    subtitle: 'Platform status and build record',
    glyph: '🛰',
    target: { kind: 'stack', screen: 'Operations' },
    state: 'UNKNOWN',
  },
  {
    id: 'accounts',
    title: 'Accounts & Finance',
    subtitle: 'Wallet Intelligence summary',
    glyph: '🏦',
    target: { kind: 'stack', screen: 'Accounts' },
    state: 'NOT_CONNECTED',
  },
  {
    id: 'security',
    title: 'Security',
    subtitle: 'Angel Security',
    glyph: '🛡',
    target: { kind: 'stack', screen: 'Security' },
    state: 'UNAVAILABLE',
  },
  {
    id: 'settings',
    title: 'Settings',
    subtitle: 'Mobile shell preferences',
    glyph: '⚙',
    target: { kind: 'stack', screen: 'Settings' },
    state: 'UNKNOWN',
  },
];

export function sectionById(id: string): SectionDef {
  const found = sections.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown section: ${id}`);
  return found;
}
