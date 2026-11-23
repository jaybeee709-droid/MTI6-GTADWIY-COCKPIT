// Migrated screens — Phase 1, package 3.
//
// Every screen is a real route component migrated from its vanilla
// module (see each file's header for the source module). None of
// them is wired into navigation here: navigation wiring is Package 4
// — this barrel exists so the navigation package can import them.
//
// Honesty rule, carried by every screen: no invented numbers,
// balances, returns, or activity. Local stores and live layers that
// are not wired in this build report NOT_CONNECTED / NO_DATA /
// UNAVAILABLE — never zero.

export { CockpitStatusScreen } from './CockpitStatusScreen';
export { KnowledgeScreen } from './KnowledgeScreen';
export { MissionControlTasksScreen } from './MissionControlTasksScreen';
export { MissionControlProjectsScreen } from './MissionControlProjectsScreen';
export { ResourceTrackerScreen } from './ResourceTrackerScreen';
export { CryptoMarketScreen } from './CryptoMarketScreen';
export { BotProfileScreen } from './BotProfileScreen';
export { OperationsScreen } from './OperationsScreen';
export { AccountsFinanceScreen } from './AccountsFinanceScreen';
export { WebBotWorkScreen } from './WebBotWorkScreen';
export { DataAnalyticsScreen } from './DataAnalyticsScreen';
export { CryptoWorkspacesScreen } from './CryptoWorkspacesScreen';
