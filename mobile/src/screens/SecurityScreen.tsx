import React from 'react';
import { Text, View } from 'react-native';
import SectionShell, { shellStyles } from '../components/SectionShell';
import TruthBlock from '../components/TruthBlock';
import { sectionById } from '../data/sections';

/**
 * Security shell (Angel Security). No detector is connected to the
 * mobile shell and the web cockpit's alert store is not mirrored, so
 * alerts are UNAVAILABLE — and crucially, no alarm is shown, because
 * no alarm has been confirmed. The lifecycle shown is structure only.
 */
const LIFECYCLE = [
  'DETECTED',
  'VERIFYING',
  'CONFIRMED',
  'ACTIVE',
  'MITIGATING',
  'RESOLVED',
  'POST_INCIDENT_REVIEW',
];

export default function SecurityScreen() {
  const section = sectionById('security');
  return (
    <SectionShell
      glyph={section.glyph}
      title={section.title}
      subtitle={section.subtitle}
      state={section.state}
    >
      <TruthBlock
        state="UNAVAILABLE"
        note="No security detector is connected to the mobile shell, so alert state could not be checked. Nothing here claims the platform is either safe or under alert."
      />
      <View style={shellStyles.card}>
        <Text style={shellStyles.heading}>Alert lifecycle</Text>
        <View style={shellStyles.chipRow}>
          {LIFECYCLE.map((stage) => (
            <View key={stage} style={shellStyles.chip}>
              <Text style={shellStyles.chipText}>{stage}</Text>
            </View>
          ))}
        </View>
        <Text style={shellStyles.caption}>
          Alerts require provenance and start at DETECTED. A red alarm appears only for a
          confirmed active alert — there is none to show, so none is shown.
        </Text>
      </View>
      <View style={shellStyles.card}>
        <Text style={shellStyles.heading}>Angels</Text>
        <Text style={shellStyles.bodyText}>
          MICHAEL and GABRIEL (KJV) · RAPHAEL and URIEL (Apocrypha). Angels are a separate
          registry — never Tribe members.
        </Text>
      </View>
    </SectionShell>
  );
}
