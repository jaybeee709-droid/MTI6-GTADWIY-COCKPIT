import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, stateColors, truthLabels, type TruthState } from '../theme/tokens';

interface Props {
  state: TruthState;
  /** Genuine, confirmed alarm only — turns the pill red and adds a "!"
   *  marker so meaning never depends on colour alone (web shell rule). */
  alarm?: boolean;
}

/** Small status pill: coloured dot + truthful-state label. */
export default function StatusPill({ state, alarm = false }: Props) {
  const color = alarm ? colors.redAlarm : stateColors[state];
  const label = alarm ? 'ALARM' : truthLabels[state].toUpperCase();
  return (
    <View style={[styles.pill, { borderColor: color }, alarm && styles.pillAlarm]}>
      {alarm ? (
        <Text style={[styles.alarmMark, { color }]}>!</Text>
      ) : (
        <View style={[styles.dot, { backgroundColor: color }]} />
      )}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  pillAlarm: {
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
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
