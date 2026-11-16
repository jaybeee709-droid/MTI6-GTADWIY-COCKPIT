import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, spacing, type TruthState } from '../theme/tokens';
import StatusPill from './StatusPill';

interface Props {
  glyph: string;
  title: string;
  subtitle: string;
  state: TruthState;
  children: React.ReactNode;
}

/** Shared layout for shell section screens: dark deck background,
 *  section header with its honest state, then the section content. */
export default function SectionShell({ glyph, title, subtitle, state, children }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.glyph}>{glyph}</Text>
          <View style={styles.headerBody}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <StatusPill state={state} />
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export const shellStyles = StyleSheet.create({
  heading: {
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontWeight: '700',
    marginTop: spacing.s2,
  },
  bodyText: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    lineHeight: 20,
  },
  caption: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    lineHeight: 17,
  },
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.s4,
    gap: spacing.s2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s2,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.s3,
    paddingVertical: 6,
    backgroundColor: colors.panelRaised,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s3,
  },
  rowLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
  },
  rowValue: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgVoid,
  },
  content: {
    padding: spacing.s4,
    gap: spacing.s4,
    paddingBottom: spacing.s6 + 64, // clear the floating STAR launcher
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  glyph: {
    fontSize: 26,
    width: 34,
    textAlign: 'center',
  },
  headerBody: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.display,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
  },
});
