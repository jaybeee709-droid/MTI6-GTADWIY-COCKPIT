import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing, type TruthState } from '../theme/tokens';
import StatusPill from './StatusPill';

interface Props {
  state: TruthState;
  /** Plain-language explanation of what this state means here —
   *  phrased like the web cockpit's truth descriptions. */
  note: string;
  children?: React.ReactNode;
}

/**
 * An honest-state panel: the section's truthful state up front, why,
 * and only then any (clearly structural) content. This is how the
 * mobile shell avoids ever presenting placeholder UI as live data.
 */
export default function TruthBlock({ state, note, children }: Props) {
  return (
    <View style={styles.block}>
      <StatusPill state={state} />
      <Text style={styles.note}>{note}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.s4,
    gap: spacing.s2,
  },
  note: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    lineHeight: 20,
  },
});
