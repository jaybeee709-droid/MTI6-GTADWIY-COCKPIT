import React from 'react';
import { Text, View } from 'react-native';
import SectionShell, { shellStyles } from '../components/SectionShell';
import StatusPill from '../components/StatusPill';
import { sectionById } from '../data/sections';

/**
 * Accounts & Finance shell — mirrors the web cockpit's Accounts panel,
 * which hosts WalletIntelligence.summary() verbatim: NOT_CONNECTED,
 * balances UNAVAILABLE, execution DISABLED. The 6-rung capability
 * ladder is the platform's retained permission model; EXECUTE stays
 * disabled unless separately designed, secured, owner-approved,
 * implemented and verified.
 */
const LADDER = ['MONITOR', 'ANALYZE', 'RECOMMEND', 'PREPARE', 'OWNER APPROVAL', 'EXECUTE'];

export default function AccountsScreen() {
  const section = sectionById('accounts');
  return (
    <SectionShell
      glyph={section.glyph}
      title={section.title}
      subtitle={section.subtitle}
      state={section.state}
    >
      <View style={shellStyles.card}>
        <View style={shellStyles.rowBetween}>
          <Text style={shellStyles.rowLabel}>Connection</Text>
          <StatusPill state="NOT_CONNECTED" />
        </View>
        <View style={shellStyles.rowBetween}>
          <Text style={shellStyles.rowLabel}>Accounts</Text>
          <Text style={shellStyles.rowValue}>—</Text>
        </View>
        <View style={shellStyles.rowBetween}>
          <Text style={shellStyles.rowLabel}>Balances</Text>
          <StatusPill state="UNAVAILABLE" />
        </View>
        <View style={shellStyles.rowBetween}>
          <Text style={shellStyles.rowLabel}>Execution</Text>
          <StatusPill state="DISABLED" />
        </View>
        <Text style={shellStyles.caption}>
          The same summary the web cockpit's Accounts panel shows. An unavailable balance is not
          a zero balance.
        </Text>
      </View>

      <View style={shellStyles.card}>
        <Text style={shellStyles.heading}>Capability ladder</Text>
        <View style={shellStyles.chipRow}>
          {LADDER.map((rung) => (
            <View key={rung} style={shellStyles.chip}>
              <Text style={shellStyles.chipText}>{rung}</Text>
            </View>
          ))}
        </View>
        <Text style={shellStyles.caption}>
          The retained permission progression. EXECUTE is disabled — on the platform,
          canExecuteTransaction() always returns false today.
        </Text>
      </View>
    </SectionShell>
  );
}
