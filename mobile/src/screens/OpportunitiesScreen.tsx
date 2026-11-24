import React from 'react';
import { Text, View } from 'react-native';
import SectionShell, { shellStyles } from '../components/SectionShell';
import TruthBlock from '../components/TruthBlock';
import { sectionById } from '../data/sections';

/**
 * Opportunities shell. The canonical pipeline SHAPE is architecture
 * and is shown as such; it ends at PREPARED and never reaches
 * EXECUTED. No opportunity records, returns, or APY figures exist in
 * this shell — return fields are forbidden in opportunity records on
 * the platform itself.
 */
const PIPELINE = [
  'DISCOVERED',
  'IDENTIFIED',
  'DATA_VERIFIED',
  'RISK_ANALYZED',
  'DEPENDENCIES_CHECKED',
  'FRESHNESS_CHECKED',
  'SIMULATED',
  'RANKED',
  'RECOMMENDED',
  'PREPARED',
];

export default function OpportunitiesScreen() {
  const section = sectionById('opportunities');
  return (
    <SectionShell
      glyph={section.glyph}
      title={section.title}
      subtitle={section.subtitle}
      state={section.state}
    >
      <TruthBlock
        state="NOT_CONNECTED"
        note="Opportunity Intelligence is not connected to the mobile shell, so no opportunities are listed. An empty list here means not connected — not that none exist."
      />
      <View style={shellStyles.card}>
        <Text style={shellStyles.heading}>Pipeline</Text>
        <View style={shellStyles.chipRow}>
          {PIPELINE.map((stage) => (
            <View key={stage} style={shellStyles.chip}>
              <Text style={shellStyles.chipText}>{stage}</Text>
            </View>
          ))}
        </View>
        <Text style={shellStyles.caption}>
          The pipeline ends at PREPARED. Nothing on this platform executes a financial action,
          and opportunity records never carry return/APY figures.
        </Text>
      </View>
    </SectionShell>
  );
}
