import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing, touch } from '../theme/tokens';
import BubbleRail, { shellLayers } from './BubbleRail';

interface Props {
  title: string;
  onAccounts: () => void;
}

/**
 * The mobile command bar — the phone counterpart of the web cockpit's
 * Phase C top command bar: section title, a (not-yet-wired) Universal
 * Search field shown honestly as unavailable, the black credit-card
 * Accounts launcher, and the electric-blue status bubble rail.
 */
export default function CommandBar({ title, onAccounts }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Pressable
          onPress={onAccounts}
          accessibilityRole="button"
          accessibilityLabel="Open Accounts panel"
          style={({ pressed }) => [styles.accountsBtn, pressed && styles.accountsBtnPressed]}
        >
          <View style={styles.cardGlyph}>
            <View style={styles.cardStripe} />
            <View style={styles.cardChip} />
          </View>
          <Text style={styles.accountsLabel}>Accounts</Text>
        </Pressable>
      </View>
      <View style={styles.searchShell}>
        <Text style={styles.searchText}>Universal Search — not wired in the mobile shell yet</Text>
      </View>
      <BubbleRail layers={shellLayers} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s3,
    paddingBottom: spacing.s3,
    gap: spacing.s3,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touch.commandBar - 16,
    gap: spacing.s3,
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.display,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  accountsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
    backgroundColor: colors.bgBlack,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.s3,
    minHeight: touch.min,
    paddingVertical: 6,
  },
  accountsBtnPressed: {
    borderColor: colors.borderActive,
  },
  cardGlyph: {
    width: 26,
    height: 18,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.silverDark,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cardStripe: {
    position: 'absolute',
    top: 3,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.silverDark,
  },
  cardChip: {
    width: 7,
    height: 5,
    marginLeft: 3,
    marginBottom: 3,
    borderRadius: 1,
    backgroundColor: colors.gold,
  },
  accountsLabel: {
    color: colors.silver,
    fontSize: fontSize.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  searchShell: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bgVoid,
    paddingHorizontal: spacing.s3,
    paddingVertical: spacing.s2,
  },
  searchText: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
  },
});
