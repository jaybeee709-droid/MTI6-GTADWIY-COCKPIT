import React from 'react';
import { Text, View } from 'react-native';
import SectionShell, { shellStyles } from '../components/SectionShell';
import TruthBlock from '../components/TruthBlock';
import { sectionById } from '../data/sections';

/**
 * Crypto World shell. Shows the canonical hierarchy SHAPE (architecture,
 * not data) and the build-record facts about the web cockpit's store —
 * clearly labelled as static reference. No taxonomy or entity records
 * are copied into the mobile shell, and nothing is presented as live.
 */
const HIERARCHY = ['Family', 'Major Activity', 'Type', 'Strategy / Variant', 'Action', 'Sub-action'];

export default function CryptoWorldScreen() {
  const section = sectionById('crypto-world');
  return (
    <SectionShell
      glyph={section.glyph}
      title={section.title}
      subtitle={section.subtitle}
      state={section.state}
    >
      <TruthBlock
        state="NOT_CONNECTED"
        note="No source is connected, so nothing was checked. The mobile shell does not read the web cockpit's Crypto World store in Build 1."
      />
      <View style={shellStyles.card}>
        <Text style={shellStyles.heading}>Canonical hierarchy</Text>
        <Text style={shellStyles.caption}>
          The preserved knowledge backbone — structure only, no records copied:
        </Text>
        {HIERARCHY.map((level, i) => (
          <Text key={level} style={shellStyles.bodyText}>
            {'  '.repeat(i)}
            {i > 0 ? '↳ ' : ''}
            {level}
          </Text>
        ))}
      </View>
      <View style={shellStyles.card}>
        <Text style={shellStyles.heading}>On the web cockpit (build record)</Text>
        <Text style={shellStyles.bodyText}>
          826 imported activity records — 28 families, the canonical 60 major activities, and 738
          types/strategies — plus 48 canonical entities (Batch 1: 26, Batch 2: 22). Every one is
          UNVERIFIED; import status is not verification.
        </Text>
        <Text style={shellStyles.caption}>
          Static reference from the 2026-11-16 build record — not live data, and not mirrored
          into this shell.
        </Text>
      </View>
    </SectionShell>
  );
}
