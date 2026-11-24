/* MTI6 catalogued contracts (v187) — the Contract Discovery
 * Registry's one-tap check list. Inclusion law (the standing
 * anchor rule): an entry exists ONLY with provenance —
 * OWNER_CONFIRMED (the owner confirmed the anchor against an
 * authoritative source) or TWO_SOURCE (the address was checked
 * the same day against TWO independent keyless sources: the
 * Blockscout contract label AND the CoinGecko contract index,
 * and both agreed on identity; every entry below also read
 * source-verified on Blockscout at cataloguing time).
 * A catalogue entry is discovery evidence, not canonical truth:
 * checking one records the live explorer state in the registry;
 * nothing here promotes an entity or grants execution. */

export interface CataloguedContract {
  name: string;
  symbol: string;
  address: string;
  network: string;
  role: string;
  provenance: string;
}

export const CATALOGUED_CONTRACTS: CataloguedContract[] = [
  {
    name: 'EigenLayer EIGEN Token',
    symbol: 'EIGEN',
    address: '0xec53bf9167f50cdeb3ae105f56099aaab9061f83',
    network: 'ethereum',
    role: 'TOKEN',
    provenance: 'OWNER_CONFIRMED · Etherscan label, confirmed by the owner 2026-11-16',
  },
  {
    name: 'Tether USD',
    symbol: 'USDT',
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    network: 'ethereum',
    role: 'TOKEN',
    provenance: 'TWO_SOURCE 2026-11-24 · Blockscout "TetherToken" (verified) + CoinGecko tether',
  },
  {
    name: 'USD Coin',
    symbol: 'USDC',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    network: 'ethereum',
    role: 'TOKEN',
    provenance: 'TWO_SOURCE 2026-11-24 · Blockscout "FiatTokenProxy" (verified) + CoinGecko usd-coin',
  },
  {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    network: 'ethereum',
    role: 'TOKEN',
    provenance: 'TWO_SOURCE 2026-11-24 · Blockscout "WETH9" (verified) + CoinGecko weth',
  },
  {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    network: 'ethereum',
    role: 'TOKEN',
    provenance: 'TWO_SOURCE 2026-11-24 · Blockscout "Dai" (verified) + CoinGecko dai',
  },
  {
    name: 'Chainlink Token',
    symbol: 'LINK',
    address: '0x514910771af9ca656af840dff83e8264ecf986ca',
    network: 'ethereum',
    role: 'TOKEN',
    provenance: 'TWO_SOURCE 2026-11-24 · Blockscout "LinkToken" (verified) + CoinGecko chainlink',
  },
  {
    name: 'Uniswap Token',
    symbol: 'UNI',
    address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    network: 'ethereum',
    role: 'TOKEN',
    provenance: 'TWO_SOURCE 2026-11-24 · Blockscout "Uni" (verified) + CoinGecko uniswap',
  },
  {
    name: 'Aave Token',
    symbol: 'AAVE',
    address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    network: 'ethereum',
    role: 'TOKEN',
    provenance: 'TWO_SOURCE 2026-11-24 · Blockscout proxy (verified) + CoinGecko aave',
  },
  {
    name: 'Lido DAO Token',
    symbol: 'LDO',
    address: '0x5a98fcbea516cf06857215779fd812ca3bef1b32',
    network: 'ethereum',
    role: 'TOKEN',
    provenance: 'TWO_SOURCE 2026-11-24 · Blockscout "MiniMeToken" (verified) + CoinGecko lido-dao',
  },
  {
    name: 'Lido Staked Ether',
    symbol: 'stETH',
    address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    network: 'ethereum',
    role: 'TOKEN',
    provenance: 'TWO_SOURCE 2026-11-24 · Blockscout proxy (verified) + CoinGecko staked-ether',
  },
];
