import React, { useState } from 'react';
import {
  Coins,
  Lock,
  ShieldAlert,
  Network,
  Wallet,
  BookOpen,
  Cpu,
  Activity,
  Layers,
  Database,
  ArrowLeftRight,
} from 'lucide-react';

export type CryptoSectionId =
  | 'Dashboard'
  | 'Intelligence'
  | 'Networks'
  | 'Assets'
  | 'Protocols'
  | 'Activities'
  | 'Portfolio'
  | 'Positions'
  | 'Cost Engine'
  | 'Encyclopedia';

interface CryptoActivity {
  name: string;
  category: string;
  gate: 'EXECUTE DISABLED / READ-ONLY' | 'LOCKED · EXPANSION-GATED';
  summary: string;
}

const CRYPTO_SECTIONS: CryptoSectionId[] = [
  'Dashboard',
  'Intelligence',
  'Networks',
  'Assets',
  'Protocols',
  'Activities',
  'Portfolio',
  'Positions',
  'Cost Engine',
  'Encyclopedia',
];

const CRYPTO_ACTIVITIES: CryptoActivity[] = [
  { name: 'Trading', category: 'Spot & Orderflow', gate: 'EXECUTE DISABLED / READ-ONLY', summary: 'Orderbook depth & spot execution telemetry.' },
  { name: 'Swap', category: 'AMM Routing', gate: 'EXECUTE DISABLED / READ-ONLY', summary: 'DEX aggregator quote & slippage simulation.' },
  { name: 'Arbitrage', category: 'Cross-Venue', gate: 'LOCKED · EXPANSION-GATED', summary: 'CEX/DEX spread & triangular route scanner.' },
  { name: 'Liquidity', category: 'LP Pools', gate: 'EXECUTE DISABLED / READ-ONLY', summary: 'Concentrated liquidity fee & IL tracking.' },
  { name: 'Staking', category: 'Consensus Yield', gate: 'EXECUTE DISABLED / READ-ONLY', summary: 'Native PoS delegation & epoch reward monitor.' },
  { name: 'Restaking', category: 'Shared Security', gate: 'LOCKED · EXPANSION-GATED', summary: 'AVS operator & slashing risk matrix.' },
  { name: 'Lending', category: 'Money Markets', gate: 'EXECUTE DISABLED / READ-ONLY', summary: 'Supply APY & utilization rate curves.' },
  { name: 'Borrowing', category: 'Credit & LTV', gate: 'EXECUTE DISABLED / READ-ONLY', summary: 'Collateral health factor & liquidation bands.' },
  { name: 'Vaults', category: 'Automated Yield', gate: 'LOCKED · EXPANSION-GATED', summary: 'Strategy vault harvest & fee breakdown.' },
  { name: 'Cross Chain', category: 'Bridging', gate: 'EXECUTE DISABLED / READ-ONLY', summary: 'Canonical & intent bridge finality monitor.' },
  { name: 'Mining', category: 'PoW Hashrate', gate: 'LOCKED · EXPANSION-GATED', summary: 'Difficulty, hashprice & ASIC efficiency.' },
  { name: 'Nodes', category: 'Infrastructure', gate: 'EXECUTE DISABLED / READ-ONLY', summary: 'RPC sync height & peer health telemetry.' },
  { name: 'Validators', category: 'Consensus Ops', gate: 'LOCKED · EXPANSION-GATED', summary: 'Uptime, commission & attestation score.' },
  { name: 'Derivatives / Options / Futures / Perps', category: 'Structured Risk', gate: 'LOCKED · EXPANSION-GATED', summary: 'Funding rates, open interest & IV surface.' },
  { name: 'Governance', category: 'DAO Voting', gate: 'EXECUTE DISABLED / READ-ONLY', summary: 'Active proposals, quorum & timelock queue.' },
  { name: 'RWA', category: 'Tokenized Real Assets', gate: 'LOCKED · EXPANSION-GATED', summary: 'Treasury bill & private credit on-chain pools.' },
  { name: 'NFT-Fi', category: 'Digital Collectibles', gate: 'LOCKED · EXPANSION-GATED', summary: 'Floor-backed lending & fractional liquidity.' },
  { name: 'Insurance', category: 'Protocol Cover', gate: 'LOCKED · EXPANSION-GATED', summary: 'Smart contract exploit & depeg underwriting.' },
  { name: 'MEV', category: 'Blockspace', gate: 'LOCKED · EXPANSION-GATED', summary: 'Builder flow, sandwich protection & rebates.' },
  { name: 'DePIN', category: 'Physical Networks', gate: 'LOCKED · EXPANSION-GATED', summary: 'Wireless, sensor & storage node rewards.' },
  { name: 'AI Compute', category: 'Decentralized GPU', gate: 'LOCKED · EXPANSION-GATED', summary: 'Cluster utilization & inference settlement.' },
  { name: 'Prediction Markets', category: 'Event Contracts', gate: 'EXECUTE DISABLED / READ-ONLY', summary: 'Implied probability & resolution oracle status.' },
  { name: 'Oracles', category: 'Data Feeds', gate: 'EXECUTE DISABLED / READ-ONLY', summary: 'Price feed heartbeat & deviation thresholds.' },
  { name: 'GameFi', category: 'On-Chain Gaming', gate: 'LOCKED · EXPANSION-GATED', summary: 'In-game economy velocity & token emissions.' },
  { name: 'SocialFi', category: 'Creator Graphs', gate: 'LOCKED · EXPANSION-GATED', summary: 'Social graph keys & protocol fee share.' },
  { name: 'BTCFi', category: 'Bitcoin DeFi', gate: 'LOCKED · EXPANSION-GATED', summary: 'L2 rollups, Runes & native BTC staking.' },
  { name: 'Identity', category: 'DID & Attestations', gate: 'EXECUTE DISABLED / READ-ONLY', summary: 'ENS, verifiable credentials & sybil score.' },
  { name: 'Modular Infra', category: 'DA & Rollups', gate: 'LOCKED · EXPANSION-GATED', summary: 'Blobspace throughput & sequencer decentralization.' },
];

const NETWORKS = [
  { name: 'Ethereum Mainnet', chainId: '1', status: 'NOT CONNECTED' },
  { name: 'Arbitrum One', chainId: '42161', status: 'NOT CONNECTED' },
  { name: 'Base', chainId: '8453', status: 'NOT CONNECTED' },
  { name: 'Solana', chainId: 'mainnet-beta', status: 'NOT CONNECTED' },
  { name: 'Bitcoin', chainId: 'btc-l1', status: 'NOT CONNECTED' },
];

export const CryptoWorld: React.FC = () => {
  const [activeSection, setActiveSection] = useState<CryptoSectionId>('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredActivities = CRYPTO_ACTIVITIES.filter(
    (act) =>
      act.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#06070B] text-slate-100 p-4 md:p-6 space-y-5">
      {/* Header & Mandatory Read-Only / Boundary Pills */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#111623] border border-[#1E273B] flex items-center justify-center text-sky-400">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-wide text-white">CRYPTO WORLD · STRICTLY ON-CHAIN</h1>
            <p className="text-xs text-slate-400">
              Isolated digital-asset domain · Non-custodial telemetry &amp; protocol intelligence
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-amber-500/10 border border-amber-500/40 text-amber-300">
            EXECUTE DISABLED / READ-ONLY
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-[#111623] border border-[#1E273B] text-slate-300">
            NOT CONNECTED
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-[#111623] border border-[#1E273B] text-slate-400">
            NO DATA
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-purple-500/10 border border-purple-500/40 text-purple-300">
            LOCKED · EXPANSION-GATED
          </span>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2">
        {CRYPTO_SECTIONS.map((section) => {
          const isActive = section === activeSection;
          return (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition ${
                isActive
                  ? 'bg-[#111623] border-sky-400 text-white'
                  : 'bg-[#0C0F17] border-[#1E273B] text-slate-400 hover:text-slate-200'
              }`}
            >
              {section.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>WALLET / CUSTODY</span>
            <Wallet className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-sm font-mono font-semibold text-white">NOT CONNECTED</div>
          <div className="text-[11px] text-slate-500">Signer &amp; key execution disabled</div>
        </div>

        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>PORTFOLIO / POSITIONS</span>
            <Database className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-sm font-mono font-semibold text-white">NO DATA</div>
          <div className="text-[11px] text-slate-500">Read-only telemetry awaiting feed</div>
        </div>

        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>EXECUTION GUARD</span>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-sm font-mono font-semibold text-amber-300">EXECUTE DISABLED / READ-ONLY</div>
          <div className="text-[11px] text-slate-500">Zero transaction signing permitted</div>
        </div>

        <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>EXPANSION MODULES</span>
            <Lock className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-sm font-mono font-semibold text-purple-300">LOCKED · EXPANSION-GATED</div>
          <div className="text-[11px] text-slate-500">28+ activity rails indexed</div>
        </div>
      </div>

      {/* Section-Specific View + 28+ Activities Matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left/Center: 28+ Activities Directory */}
        <div className="xl:col-span-2 border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-sky-400" />
              <h2 className="text-sm font-semibold tracking-wide text-white">
                {activeSection.toUpperCase()} · {CRYPTO_ACTIVITIES.length} CRYPTO ACTIVITIES
              </h2>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter 28+ activities..."
              className="px-3 py-1.5 rounded-lg bg-[#111623] border border-[#1E273B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredActivities.map((act) => {
              const isLocked = act.gate === 'LOCKED · EXPANSION-GATED';
              return (
                <div
                  key={act.name}
                  className="rounded-lg border border-[#1E273B] bg-[#111623] p-3 space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">{act.name}</span>
                      <Cpu className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    </div>
                    <div className="text-[10px] font-mono text-sky-300 mt-0.5">{act.category}</div>
                    <p className="text-[11px] text-slate-400 mt-1.5">{act.summary}</p>
                  </div>
                  <div className="pt-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono font-semibold ${
                        isLocked
                          ? 'bg-purple-500/10 border border-purple-500/40 text-purple-300'
                          : 'bg-amber-500/10 border border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {act.gate}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Networks, Cost Engine, Encyclopedia */}
        <div className="space-y-4">
          <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">NETWORKS &amp; ASSETS</h3>
            </div>
            <div className="space-y-2">
              {NETWORKS.map((net) => (
                <div
                  key={net.name}
                  className="rounded-lg border border-[#1E273B] bg-[#111623] px-3 py-2 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">{net.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">CHAIN: {net.chainId}</div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#06070B] border border-[#1E273B] text-slate-400">
                    {net.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">COST ENGINE &amp; INTELLIGENCE</h3>
            </div>
            <div className="rounded-lg border border-[#1E273B] bg-[#111623] p-3 text-xs text-slate-300 space-y-1">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-400">GAS / PRIORITY EST.</span>
                <span>NO DATA</span>
              </div>
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-400">SLIPPAGE / MEV TAX</span>
                <span>NO DATA</span>
              </div>
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-400">PROTOCOLS INDEXED</span>
                <span className="text-sky-300">READ-ONLY</span>
              </div>
            </div>
          </div>

          <div className="border border-[#1E273B] bg-[#0C0F17] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">CRYPTO ENCYCLOPEDIA</h3>
            </div>
            <p className="text-xs text-slate-400">
              Reference taxonomy covering consensus, DeFi primitives, MEV, RWA, BTCFi, Modular DA, and risk boundaries.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-purple-300">
              <Layers className="h-3.5 w-3.5" />
              <span>LOCKED · EXPANSION-GATED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoWorld;
