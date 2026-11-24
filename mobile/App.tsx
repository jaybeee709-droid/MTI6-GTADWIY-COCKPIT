import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import StarLauncher from './src/components/StarLauncher';
import StarPanel from './src/components/StarPanel';
import { colors } from './src/theme/tokens';

/**
 * MTI6 Mobile Cockpit — Build 1.
 *
 * A phone-native shell for the MTI6 platform: a separate interface
 * into the same canonical platform as the web cockpit, which remains
 * untouched. The STAR launcher floats above every screen, exactly as
 * STAR stays reachable across the web command deck.
 */
export default function App() {
  const [starOpen, setStarOpen] = useState(false);
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <RootNavigator />
        {!starOpen && <StarLauncher onPress={() => setStarOpen(true)} />}
        <StarPanel visible={starOpen} onClose={() => setStarOpen(false)} />
        <StatusBar style="light" />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgVoid,
  },
});
