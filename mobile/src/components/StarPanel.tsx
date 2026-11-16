import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme/tokens';
import StatusPill from './StatusPill';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * The STAR panel — an honest demo presentation, mirroring the web
 * cockpit: STAR's backend is demo-only (star-backend V1, no endpoint
 * configured), so this panel says so, offers no fabricated answers,
 * and keeps its input, microphone and camera disabled with truthful
 * labels — the same states the web shell shows.
 */
export default function StarPanel({ visible, onClose }: Props) {
  if (!visible) return null;
  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.starGlyph}>✨</Text>
          <View style={styles.headerBody}>
            <Text style={styles.title}>STAR</Text>
            <Text style={styles.subtitle}>Main persistent assistant</Text>
          </View>
          <StatusPill state="DEMO" />
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close STAR"
            style={styles.closeBtn}
          >
            <Text style={styles.closeGlyph}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.message}>
          <Text style={styles.messageText}>
            STAR is in demo presentation mode. My live backend is not connected, so from this
            mobile shell I can't run commands, do research, or reach the World Engine yet —
            and I won't pretend otherwise.
          </Text>
          <Text style={styles.demoFooter}>STAR demo — no live AI connected.</Text>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            editable={false}
            placeholder="STAR backend not connected"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Message STAR — disabled, backend not connected"
          />
          <Pressable
            disabled
            accessibilityLabel="Voice input is not connected yet"
            style={[styles.toolBtn, styles.toolBtnDisabled]}
          >
            <Text style={styles.toolGlyph}>🎙</Text>
          </Pressable>
          <Pressable
            disabled
            accessibilityLabel="Camera is not connected yet"
            style={[styles.toolBtn, styles.toolBtnDisabled]}
          >
            <Text style={styles.toolGlyph}>📷</Text>
          </Pressable>
        </View>
        <Text style={styles.caption}>
          Voice input and camera stay off until they are genuinely built and you turn them on.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    zIndex: 200, // web --z-modal
  },
  sheet: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.s4,
    gap: spacing.s4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  starGlyph: {
    fontSize: 24,
  },
  headerBody: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeGlyph: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  message: {
    backgroundColor: colors.panelRaised,
    borderWidth: 1,
    borderColor: colors.purpleAi,
    borderRadius: radius.card,
    padding: spacing.s4,
    gap: spacing.s2,
  },
  messageText: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    lineHeight: 21,
  },
  demoFooter: {
    color: colors.purpleAi,
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bgVoid,
    color: colors.textMuted,
    paddingHorizontal: spacing.s3,
    minHeight: 44,
    fontSize: fontSize.body,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panelRaised,
  },
  toolBtnDisabled: {
    opacity: 0.45,
  },
  toolGlyph: {
    fontSize: 17,
  },
  caption: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    lineHeight: 17,
  },
});
