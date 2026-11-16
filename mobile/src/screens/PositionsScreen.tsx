import React from 'react';
import { Text, View } from 'react-native';
import SectionShell, { shellStyles } from '../components/SectionShell';
import TruthBlock from '../components/TruthBlock';
import { sectionById } from '../data/sections';

/**
 * Positions & Assets shell. Wallet Intelligence on the platform is
 * NOT_CONNECTED and balances are UNAVAILABLE — an unavailable balance
 * is not a zero balance, and no holdings are invented here.
 */
export default function PositionsScreen() {
  const section = sectionById('positions');
  return (
    <SectionShell
      glyph={section.glyph}
      title={section.title}
      subtitle={section.subtitle}
      state={section.state}
    >
      <TruthBlock
        state="NOT_CONNECTED"
        note="No wallet source is connected, so no positions or balances were checked. Nothing listed here means not connected — not empty holdings."
      />
      <View style={shellStyles.card}>
        <View style={shellStyles.rowBetween}>
          <Text style={shellStyles.rowLabel}>Total balance</Text>
          <Text style={shellStyles.rowValue}>UNAVAILABLE</Text>
        </View>
        <View style={shellStyles.rowBetween}>
          <Text style={shellStyles.rowLabel}>Wallets connected</Text>
          <Text style={shellStyles.rowValue}>—</Text>
        </View>
        <View style={shellStyles.rowBetween}>
          <Text style={shellStyles.rowLabel}>Positions</Text>
          <Text style={shellStyles.rowValue}>—</Text>
        </View>
      </View>
    </SectionShell>
  );
}
