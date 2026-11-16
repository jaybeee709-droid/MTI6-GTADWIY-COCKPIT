import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer, DarkTheme, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/tokens';
import type { DeckTabParamList, RootStackParamList } from './types';
import GlobeScreen from '../screens/GlobeScreen';
import SectionsScreen from '../screens/SectionsScreen';
import CryptoWorldScreen from '../screens/CryptoWorldScreen';
import BotOperationsScreen from '../screens/BotOperationsScreen';
import OpportunitiesScreen from '../screens/OpportunitiesScreen';
import EarningsScreen from '../screens/EarningsScreen';
import PositionsScreen from '../screens/PositionsScreen';
import EncyclopediaScreen from '../screens/EncyclopediaScreen';
import OperationsScreen from '../screens/OperationsScreen';
import AccountsScreen from '../screens/AccountsScreen';
import SecurityScreen from '../screens/SecurityScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<DeckTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bgVoid,
    card: colors.panel,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.blueElectric,
    notification: colors.redAlarm,
  },
};

function tabIcon(glyph: string) {
  return function TabIcon() {
    return <Text style={{ fontSize: 19 }}>{glyph}</Text>;
  };
}

function DeckTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 6,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.blueElectric,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
      }}
    >
      <Tab.Screen
        name="Globe"
        component={GlobeScreen}
        options={{ title: 'Globe', tabBarIcon: tabIcon('🌐') }}
      />
      <Tab.Screen
        name="CryptoWorld"
        component={CryptoWorldScreen}
        options={{ title: 'Crypto', tabBarIcon: tabIcon('₿') }}
      />
      <Tab.Screen
        name="BotOperations"
        component={BotOperationsScreen}
        options={{ title: 'Bots', tabBarIcon: tabIcon('🤖') }}
      />
      <Tab.Screen
        name="Opportunities"
        component={OpportunitiesScreen}
        options={{ title: 'Opps', tabBarIcon: tabIcon('🎯') }}
      />
      <Tab.Screen
        name="Sections"
        component={SectionsScreen}
        options={{ title: 'Deck', tabBarIcon: tabIcon('☰') }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.panel },
          headerTintColor: colors.blueElectric,
          headerTitleStyle: { color: colors.textPrimary, fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bgVoid },
        }}
      >
        <Stack.Screen name="Deck" component={DeckTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Earnings" component={EarningsScreen} options={{ title: 'Earnings' }} />
        <Stack.Screen
          name="Positions"
          component={PositionsScreen}
          options={{ title: 'Positions & Assets' }}
        />
        <Stack.Screen
          name="Encyclopedia"
          component={EncyclopediaScreen}
          options={{ title: 'Encyclopedia' }}
        />
        <Stack.Screen
          name="Operations"
          component={OperationsScreen}
          options={{ title: 'Operations' }}
        />
        <Stack.Screen
          name="Accounts"
          component={AccountsScreen}
          options={{ title: 'Accounts & Finance' }}
        />
        <Stack.Screen name="Security" component={SecurityScreen} options={{ title: 'Security' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
