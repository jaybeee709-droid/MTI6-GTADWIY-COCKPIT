import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, touch } from '../theme/tokens';

interface Props {
  onPress: () => void;
}

/**
 * The persistent STAR launcher — mirrors the web cockpit's Phase C
 * launcher exactly: a 56px circle fixed bottom-right, purple at rest
 * (radial deep-purple fill, purple border, purple glow). On the web it
 * turns electric blue while STAR is talking; in Build 1 STAR is a
 * demo panel, so the launcher stays at rest and the panel itself
 * carries the DEMO label.
 */
export default function StarLauncher({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open STAR"
      style={({ pressed }) => [styles.launcher, pressed && styles.launcherPressed]}
    >
      <Text style={styles.glyph}>✨</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  launcher: {
    position: 'absolute',
    right: 16,
    bottom: 92, // clears the bottom tab bar
    width: touch.starLauncher,
    height: touch.starLauncher,
    borderRadius: touch.starLauncher / 2,
    borderWidth: 2,
    borderColor: colors.purpleAi,
    backgroundColor: colors.starDeepB,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.purpleAi,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 130, // web --z-star-launcher
  },
  launcherPressed: {
    backgroundColor: colors.starDeepA,
  },
  glyph: {
    fontSize: 24,
  },
});
