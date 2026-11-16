import React from 'react';
import { Text, View } from 'react-native';
import SectionShell, { shellStyles } from '../components/SectionShell';
import TruthBlock from '../components/TruthBlock';
import { sectionById } from '../data/sections';

/**
 * Earnings shell. Earnings require a connected financial authority;
 * none exists on the platform, so every figure is "—". Unavailable
 * is not zero, and no earnings are ever fabricated.
 */
export default function EarningsScreen() {
  const section = sectionById('earnings');
  return (
    <SectionShell
      glyph={section.glyph}
      title={section.title}
      subtitle={section.subtitle}
      state={section.state}
    >
      <TruthBlock
        state="UNAVAILABLE"
        note="The source could not be reached right now — there is no connected financial authority behind this screen, so no totals are shown."
      />
      <View style={shellStyles.card}>
        <View style={shellStyles.rowBetween}>
          <Text style={shellStyles.rowLabel}>Total earnings</Text>
          <Text style={shellStyles.rowValue}>—</Text>
        </View>
        <View style={shellStyles.rowBetween}>
          <Text style={shellStyles.rowLabel}>This month</Text>
          <Text style={shellStyles.rowValue}>—</Text>
        </View>
        <View style={shellStyles.rowBetween}>
          <Text style={shellStyles.rowLabel}>Sources connected</Text>
          <Text style={shellStyles.rowValue}>—</Text>
        </View>
        <Text style={shellStyles.caption}>
          A dash means unavailable. It never means zero earnings.
        </Text>
      </View>
    </SectionShell>
  );
}
