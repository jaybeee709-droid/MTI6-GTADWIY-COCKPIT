/**
 * MTI6 Mobile Cockpit — navigation types.
 *
 * The mobile shell has two navigation layers:
 *  - DeckTabs: the five always-reachable phone destinations
 *    (World Globe home, Crypto World, Bot Operations, Opportunities,
 *    and the All Sections deck).
 *  - RootStack: the remaining sections, pushed as full screens.
 * Together they cover all 11 canonical sections.
 */
export type DeckTabParamList = {
  Globe: undefined;
  CryptoWorld: undefined;
  BotOperations: undefined;
  Opportunities: undefined;
  Sections: undefined;
};

export type RootStackParamList = {
  Deck: undefined;
  Earnings: undefined;
  Positions: undefined;
  Encyclopedia: undefined;
  Operations: undefined;
  Accounts: undefined;
  Security: undefined;
  Settings: undefined;
};
