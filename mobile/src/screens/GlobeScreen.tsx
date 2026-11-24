import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../theme/tokens';
import CommandBar from '../components/CommandBar';
import SectionCard from '../components/SectionCard';
import StatusPill from '../components/StatusPill';
import { sections, sectionById } from '../data/sections';
import { useOpenSection } from '../navigation/useOpenSection';
import { shellLayers } from '../components/BubbleRail';

/**
 * World Globe — the mobile home and master entry point, mirroring the
 * web cockpit where the Globe is home. Build 1 is a polished visual
 * shell: a stylised globe (no terrain/map engine is connected), the
 * five World layers with their honest NOT_CONNECTED states, and the
 * full command deck of 11 sections. No counts, prices, or activity
 * are fabricated — unavailable renders as "—", never as zero.
 */
export default function GlobeScreen() {
  const openSection = useOpenSection();
  const deckSections = sections.filter((s) => s.id !== 'globe');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <CommandBar title="World Globe" onAccounts={() => openSection(sectionById('accounts'))} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            MOBILE SHELL · BUILD 1 — interface preview. Platform data is not connected to this
            shell yet.
          </Text>
        </View>

        <View style={styles.globeWrap}>
          <View style={styles.globe}>
            <View style={[styles.meridian, styles.meridianA]} />
            <View style={[styles.meridian, styles.meridianB]} />
            <View style={[styles.parallel, styles.parallelA]} />
            <View style={[styles.parallel, styles.parallelB]} />
            <View style={styles.core} />
          </View>
          <Text style={styles.globeCaption}>
            WORLD GLOBE — visual shell · terrain / map engine not connected
          </Text>
        </View>

        <Text style={styles.heading}>World layers</Text>
        <View style={styles.card}>
          {shellLayers.map((layer) => (
            <View key={layer.id} style={styles.layerRow}>
              <Text style={styles.layerName}>{layer.short}</Text>
              <View style={styles.layerRight}>
                <Text style={styles.layerCount}>{layer.count === null ? '—' : layer.count}</Text>
                <StatusPill state={layer.state} alarm={layer.alarm} />
              </View>
            </View>
          ))}
          <Text style={styles.caption}>
            Counts show "—" because the mobile data layer is not connected. Unavailable is not
            zero.
          </Text>
        </View>

        <Text style={styles.heading}>Command deck</Text>
        <View style={styles.deck}>
          {deckSections.map((section) => (
            <SectionCard key={section.id} section={section} onPress={openSection} />
          ))}
        </View>

        <Text style={styles.caption}>
          STAR is always one tap away — the purple launcher, bottom-right. STAR is in demo mode
          on this shell.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const GLOBE_SIZE = 248;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgVoid,
  },
  content: {
    padding: spacing.s4,
    gap: spacing.s4,
    paddingBottom: spacing.s6 + 64,
  },
  banner: {
    borderWidth: 1,
    borderColor: colors.blueDim,
    borderRadius: radius.card,
    backgroundColor: colors.panel,
    padding: spacing.s3,
  },
  bannerText: {
    color: colors.blueMuted,
    fontSize: fontSize.caption,
    fontWeight: '700',
    letterSpacing: 0.4,
    lineHeight: 17,
  },
  globeWrap: {
    alignItems: 'center',
    gap: spacing.s3,
    paddingVertical: spacing.s3,
  },
  globe: {
    width: GLOBE_SIZE,
    height: GLOBE_SIZE,
    borderRadius: GLOBE_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.blueDim,
    backgroundColor: colors.panelRaised,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meridian: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.blueDeep,
    borderRadius: GLOBE_SIZE / 2,
    height: GLOBE_SIZE,
  },
  meridianA: {
    width: GLOBE_SIZE * 0.62,
  },
  meridianB: {
    width: GLOBE_SIZE * 0.28,
  },
  parallel: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.blueDeep,
    borderRadius: GLOBE_SIZE / 2,
    width: GLOBE_SIZE,
  },
  parallelA: {
    height: GLOBE_SIZE * 0.62,
  },
  parallelB: {
    height: GLOBE_SIZE * 0.28,
  },
  core: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.blueElectric,
  },
  globeCaption: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  heading: {
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.s4,
    gap: spacing.s3,
  },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s3,
  },
  layerName: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  layerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  layerCount: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '700',
    minWidth: 18,
    textAlign: 'right',
  },
  deck: {
    gap: spacing.s3,
  },
  caption: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    lineHeight: 17,
  },
});
