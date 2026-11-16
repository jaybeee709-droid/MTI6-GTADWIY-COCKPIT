import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import type { TruthState } from '../theme/tokens';

/**
 * Status bubble rail — mirrors the web cockpit's Phase C bubble rail
 * (js/shell-bubbles.js): one bubble per World Globe layer. Bubbles are
 * electric blue in normal operation; a bubble turns red ONLY when its
 * layer reports a genuine alarm, and then also carries a "!" marker.
 *
 * In Build 1 the mobile data layer is not connected, so every layer is
 * NOT_CONNECTED and every count is null, rendered as "—" (unavailable
 * is not zero). No alarm is ever fabricated.
 */
export interface GlobeLayer {
  id: string;
  short: string;
  state: TruthState;
  count: number | null;
  alarm: boolean;
}

export const shellLayers: GlobeLayer[] = [
  { id: 'WORLD', short: 'World', state: 'NOT_CONNECTED', count: null, alarm: false },
  { id: 'CRYPTO', short: 'Crypto', state: 'NOT_CONNECTED', count: null, alarm: false },
  { id: 'OPPORTUNITIES', short: 'Opps', state: 'NOT_CONNECTED', count: null, alarm: false },
  { id: 'BOT_ACTIVITY', short: 'Bots', state: 'NOT_CONNECTED', count: null, alarm: false },
  { id: 'SECURITY_ALERTS', short: 'Alerts', state: 'NOT_CONNECTED', count: null, alarm: false },
];

export default function BubbleRail({ layers }: { layers: GlobeLayer[] }) {
  return (
    <View style={styles.rail} accessibilityLabel="Platform status">
      {layers.map((layer) => {
        const color = layer.alarm ? colors.redAlarm : colors.blueElectric;
        const countText = layer.count === null ? '—' : String(layer.count);
        const a11y = `${layer.short} — ${layer.state} · ${countText}${layer.alarm ? ' — ALARM' : ''}`;
        return (
          <View
            key={layer.id}
            style={[styles.bubble, { borderColor: color }, layer.alarm && styles.bubbleAlarm]}
            accessibilityLabel={a11y}
          >
            {layer.alarm ? (
              <Text style={[styles.alarmMark, { color }]}>!</Text>
            ) : (
              <View style={[styles.dot, { backgroundColor: color }]} />
            )}
            <Text style={styles.short}>{layer.short}</Text>
            <Text style={[styles.count, { color }]}>{countText}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s2,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: colors.panel,
  },
  bubbleAlarm: {
    backgroundColor: 'rgba(255, 60, 60, 0.14)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  alarmMark: {
    fontSize: 11,
    fontWeight: '800',
  },
  short: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  count: {
    fontSize: 11,
    fontWeight: '700',
  },
});
