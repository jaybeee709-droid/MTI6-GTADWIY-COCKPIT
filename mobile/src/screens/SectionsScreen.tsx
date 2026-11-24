import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, spacing } from '../theme/tokens';
import SectionCard from '../components/SectionCard';
import { sections } from '../data/sections';
import { useOpenSection } from '../navigation/useOpenSection';

/** The full command deck: all 11 canonical sections in one list. */
export default function SectionsScreen() {
  const openSection = useOpenSection();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>All Sections</Text>
        <Text style={styles.caption}>
          The 11 canonical MTI6 sections. States shown are the mobile shell's honest Build 1
          states — nothing here claims a live connection.
        </Text>
        <View style={styles.list}>
          {sections.map((section) => (
            <SectionCard key={section.id} section={section} onPress={openSection} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgVoid,
  },
  content: {
    padding: spacing.s4,
    gap: spacing.s3,
    paddingBottom: spacing.s6 + 64,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.display,
    fontWeight: '800',
  },
  caption: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    lineHeight: 17,
  },
  list: {
    gap: spacing.s3,
  },
});
