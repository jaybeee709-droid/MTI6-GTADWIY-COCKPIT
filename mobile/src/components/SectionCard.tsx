import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme/tokens';
import type { SectionDef } from '../data/sections';
import StatusPill from './StatusPill';

interface Props {
  section: SectionDef;
  onPress: (section: SectionDef) => void;
}

/** A tappable deck card for one canonical section. */
export default function SectionCard({ section, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress(section)}
      accessibilityRole="button"
      accessibilityLabel={`${section.title} — ${section.subtitle}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Text style={styles.glyph}>{section.glyph}</Text>
      <View style={styles.body}>
        <Text style={styles.title}>{section.title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {section.subtitle}
        </Text>
      </View>
      <StatusPill state={section.state} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.s3,
    minHeight: 72,
  },
  cardPressed: {
    borderColor: colors.borderActive,
    backgroundColor: colors.panelRaised,
  },
  glyph: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
  },
});
