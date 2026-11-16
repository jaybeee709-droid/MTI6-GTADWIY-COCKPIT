import React from 'react';
import { Text, View } from 'react-native';
import SectionShell, { shellStyles } from '../components/SectionShell';
import { sectionById } from '../data/sections';

/**
 * Settings shell. Informational rows only — Build 1 ships no working
 * preference switches, because a switch that does nothing would be a
 * dishonest control. Each row states what is actually true.
 */
const ROWS: Array<[string, string]> = [
  ['Appearance', 'Dark command deck (locked in Build 1)'],
  ['Sound & Voice', 'Preferences only — voice input is not implemented'],
  ['Camera', 'Not implemented — stays off'],
  ['Mobile data', 'This shell stores no platform data in Build 1'],
  ['About', 'MTI6 Mobile Cockpit · Build 1 · Expo SDK 58'],
];

export default function SettingsScreen() {
  const section = sectionById('settings');
  return (
    <SectionShell
      glyph={section.glyph}
      title={section.title}
      subtitle={section.subtitle}
      state={section.state}
    >
      <View style={shellStyles.card}>
        {ROWS.map(([label, value]) => (
          <View key={label} style={shellStyles.rowBetween}>
            <Text style={shellStyles.rowLabel}>{label}</Text>
            <Text style={[shellStyles.rowValue, { flexShrink: 1, textAlign: 'right' }]}>
              {value}
            </Text>
          </View>
        ))}
        <Text style={shellStyles.caption}>
          No toggles are shown in Build 1: a control that isn't wired to anything would be a
          fake control.
        </Text>
      </View>
    </SectionShell>
  );
}
