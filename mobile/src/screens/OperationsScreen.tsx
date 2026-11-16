import React from 'react';
import { Text, View } from 'react-native';
import SectionShell, { shellStyles } from '../components/SectionShell';
import TruthBlock from '../components/TruthBlock';
import { sectionById } from '../data/sections';

/**
 * Operations shell. Platform facts below are the static build record
 * (what was true when this shell was built), labelled as such — they
 * are not live telemetry, and the mobile shell collects none.
 */
const ROWS: Array<[string, string]> = [
  ['Mobile shell', 'Mobile Cockpit · Build 1'],
  ['Web cockpit line', 'development · 63461769'],
  ['Web app cache', 'v59'],
  ['Web data store', 'IndexedDB v3 (web only)'],
  ['Mobile data layer', 'Not connected'],
  ['Financial execution', 'DISABLED'],
  ['STAR backend', 'NOT CONNECTED (demo)'],
];

export default function OperationsScreen() {
  const section = sectionById('operations');
  return (
    <SectionShell
      glyph={section.glyph}
      title={section.title}
      subtitle={section.subtitle}
      state={section.state}
    >
      <TruthBlock
        state="UNKNOWN"
        note="Live platform status is unknown from this shell — nothing here polls the web cockpit. The rows below are the build record as of 2026-11-16, not a live feed."
      />
      <View style={shellStyles.card}>
        {ROWS.map(([label, value]) => (
          <View key={label} style={shellStyles.rowBetween}>
            <Text style={shellStyles.rowLabel}>{label}</Text>
            <Text style={shellStyles.rowValue}>{value}</Text>
          </View>
        ))}
      </View>
    </SectionShell>
  );
}
