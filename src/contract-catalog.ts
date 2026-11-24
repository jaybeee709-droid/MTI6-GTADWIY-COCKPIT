/* MTI6 catalogued contracts (v187, expanded v188) — the Contract
 * Discovery Registry's one-tap check list. Inclusion law (the
 * standing anchor rule + the owner's verification model,
 * 2026-11-24):
 *   1 independent source  = UNVERIFIED — never catalogued
 *   2 independent sources = SUPPORTED
 *   3+ sources            = STRONGLY SUPPORTED
 *   OWNER_CONFIRMED       = the owner confirmed the anchor
 *                           against an authoritative source
 * Sources used: Blockscout contract label (source-verified),
 * the CoinGecko contract index, and Honeypot.is token metadata —
 * all keyless, all probed 2026-11-24. Only the Approval Gate
 * decides canonical; a catalogue entry is evidence, never truth
 * and never execution authority.
 * EXCLUDED by the same law: Wormhole W (the candidate address
 * resolved to a different token on two sources), ARB and OP
 * (only one source confirmed — UNVERIFIED, not catalogued). */

export interface CataloguedContract {
  name: string;
  symbol: string;
  address: string;
  network: string;
  role: string;
  support: string;
  provenance: string;
}

const THREE = 'STRONGLY SUPPORTED (3 SOURCES)';
const BS_CG_HP = 'Blockscout (verified) + CoinGecko index + Honeypot.is, probed 2026-11-24';

export const CATALOGUED_CONTRACTS: CataloguedContract[] = [
  {
    name: 'EigenLayer EIGEN Token',
    symbol: 'EIGEN',
    address: '0xec53bf9167f50cdeb3ae105f56099aaab9061f83',
    network: 'ethereum',
    role: 'TOKEN',
    support: 'OWNER_CONFIRMED',
    provenance: 'Etherscan label, confirmed by the owner 2026-11-16',
  },
  {
    name: 'Tether USD',
    symbol: 'USDT',
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "TetherToken"`,
  },
  {
    name: 'USD Coin',
    symbol: 'USDC',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "FiatTokenProxy"`,
  },
  {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "WETH9"`,
  },
  {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "Dai"`,
  },
  {
    name: 'Chainlink Token',
    symbol: 'LINK',
    address: '0x514910771af9ca656af840dff83e8264ecf986ca',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "LinkToken"`,
  },
  {
    name: 'Uniswap Token',
    symbol: 'UNI',
    address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "Uni"`,
  },
  {
    name: 'Aave Token',
    symbol: 'AAVE',
    address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout proxy (verified)`,
  },
  {
    name: 'Lido DAO Token',
    symbol: 'LDO',
    address: '0x5a98fcbea516cf06857215779fd812ca3bef1b32',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "MiniMeToken"`,
  },
  {
    name: 'Lido Staked Ether',
    symbol: 'stETH',
    address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout proxy (verified)`,
  },
  {
    name: 'Wrapped Bitcoin',
    symbol: 'WBTC',
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "WBTC"`,
  },
  {
    name: 'Coinbase Wrapped BTC',
    symbol: 'cbBTC',
    address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "FiatTokenProxy"`,
  },
  {
    name: 'Maker Token',
    symbol: 'MKR',
    address: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "DSToken"`,
  },
  {
    name: 'Curve DAO Token',
    symbol: 'CRV',
    address: '0xd533a949740bb3306d119cc777fa900ba034cd52',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "Vyper_contract"`,
  },
  {
    name: 'Balancer Token',
    symbol: 'BAL',
    address: '0xba100000625a3754423978a60c9317c58a424e3d',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "BalancerGovernanceToken"`,
  },
  {
    name: 'Compound Governance Token',
    symbol: 'COMP',
    address: '0xc00e94cb662c3520282e6f5717214004a7f26888',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "Comp"`,
  },
  {
    name: 'Synthetix Network Token',
    symbol: 'SNX',
    address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "ProxyERC20"`,
  },
  {
    name: 'Ethena Token',
    symbol: 'ENA',
    address: '0x57e114b691db790c35207b2e685d4a43181e6061',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "ENA"`,
  },
  {
    name: 'Pendle Token',
    symbol: 'PENDLE',
    address: '0x808507121b80c02388fad14726482e061b8da827',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "PENDLE"`,
  },
  {
    name: 'Ethena USDe',
    symbol: 'USDe',
    address: '0x4c9edd5852cd905f086c759e8383e09bff1e68b3',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "USDe"`,
  },
  {
    name: 'First Digital USD',
    symbol: 'FDUSD',
    address: '0xc5f0f7b66764f6ec8c8dff7ba683102295e16409',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout proxy (verified)`,
  },
  {
    name: 'TrueUSD',
    symbol: 'TUSD',
    address: '0x0000000000085d4780b73119b644ae5ecd22b376',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout proxy (verified)`,
  },
  {
    name: 'Frax Stablecoin',
    symbol: 'FRAX',
    address: '0x853d955acef822db058eb8505911ed77f175b99e',
    network: 'ethereum',
    role: 'TOKEN',
    support: 'SUPPORTED (2 SOURCES)',
    provenance: 'CoinGecko index + Honeypot.is, probed 2026-11-24 (Blockscout read did not return)',
  },
  {
    name: 'Aave GHO Stablecoin',
    symbol: 'GHO',
    address: '0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "GhoToken"`,
  },
  {
    name: 'LayerZero Token',
    symbol: 'ZRO',
    address: '0x6985884c4392d348587b19cb9eaaf157f13271cd',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · Blockscout "LayerZeroToken"`,
  },
  {
    name: 'Ondo Token',
    symbol: 'ONDO',
    address: '0xfaba6f8e4a5e8ab82f62fe7c39859fa577269be3',
    network: 'ethereum',
    role: 'TOKEN',
    support: THREE,
    provenance: `${BS_CG_HP} · address from the CoinGecko platforms index, then confirmed on Blockscout "Ondo" + Honeypot.is`,
  },
];
