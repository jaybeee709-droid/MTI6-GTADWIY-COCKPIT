import React from 'react';
import { Text, View } from 'react-native';
import SectionShell, { shellStyles } from '../components/SectionShell';
import TruthBlock from '../components/TruthBlock';
import StatusPill from '../components/StatusPill';
import { sectionById } from '../data/sections';
import { tribePrincipals } from '../data/tribes';

/**
 * Bot Operations shell: STAR (demo), the 12 persistent Tribe
 * principals (identities from the canonical roster), and the worker
 * layer — which is a record system only on the platform today, with
 * no runtime. Workers active is "—", never a fabricated number.
 */
export default function BotOperationsScreen() {
  const section = sectionById('bot-ops');
  return (
    <SectionShell
      glyph={section.glyph}
      title={section.title}
      subtitle={section.subtitle}
      state={section.state}
    >
      <View style={shellStyles.card}>
        <View style={shellStyles.rowBetween}>
          <Text style={shellStyles.heading}>✨ STAR</Text>
          <StatusPill state="DEMO" />
        </View>
        <Text style={shellStyles.bodyText}>
          The main persistent assistant, above the Tribe principals. On this shell STAR is the
          demo panel behind the purple launcher — backend not connected.
        </Text>
      </View>

      <View style={shellStyles.card}>
        <Text style={shellStyles.heading}>Tribe principals</Text>
        <Text style={shellStyles.caption}>
          The 12 persistent principals — permanent identities. Roles are assignments, never
          identity replacements.
        </Text>
        <View style={shellStyles.chipRow}>
          {tribePrincipals.map((p) => (
            <View key={p.id} style={shellStyles.chip}>
              <Text style={shellStyles.chipText}>{p.displayName}</Text>
            </View>
          ))}
        </View>
      </View>

      <TruthBlock
        state="NOT_CONNECTED"
        note="Worker runtime is not connected. Bot Operations on the platform is a truthful record system today — assignments can be recorded, but no worker executes them."
      >
        <View style={shellStyles.rowBetween}>
          <Text style={shellStyles.rowLabel}>Workers active</Text>
          <Text style={shellStyles.rowValue}>—</Text>
        </View>
        <View style={shellStyles.rowBetween}>
          <Text style={shellStyles.rowLabel}>Assignments</Text>
          <Text style={shellStyles.rowValue}>Not mirrored</Text>
        </View>
      </TruthBlock>
    </SectionShell>
  );
}
