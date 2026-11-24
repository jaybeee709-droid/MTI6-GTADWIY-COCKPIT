import React from 'react';
import { Text, View } from 'react-native';
import SectionShell, { shellStyles } from '../components/SectionShell';
import TruthBlock from '../components/TruthBlock';
import { sectionById } from '../data/sections';

/**
 * Encyclopedia shell. The Encyclopedia's records live in the web
 * cockpit's store; the mobile shell does not copy canonical data, so
 * this screen shows the structure and the honest connection state.
 */
export default function EncyclopediaScreen() {
  const section = sectionById('encyclopedia');
  return (
    <SectionShell
      glyph={section.glyph}
      title={section.title}
      subtitle={section.subtitle}
      state={section.state}
    >
      <TruthBlock
        state="NOT_CONNECTED"
        note="The Encyclopedia store is not connected to the mobile shell, so no records can be browsed or searched here yet."
      />
      <View style={shellStyles.card}>
        <Text style={shellStyles.heading}>What lives there</Text>
        <Text style={shellStyles.bodyText}>
          Batch A: 28 activity families. The canonical 60 major activities (import status
          TAXONOMY_IMPORTED — an import status, not external verification). Batch B: 738 types
          and strategies. All records are UNVERIFIED until evidence promotes them.
        </Text>
        <Text style={shellStyles.caption}>
          Static reference from the 2026-11-16 build record. Canonical data stays in its one
          home — it is never duplicated into this shell as a second source of truth.
        </Text>
      </View>
    </SectionShell>
  );
}
