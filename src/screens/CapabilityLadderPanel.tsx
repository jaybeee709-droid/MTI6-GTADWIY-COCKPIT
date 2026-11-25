/* Capability Ladder panel (v217) — the owner's six-rung
 * permission progression, rendered fresh in the React app
 * with states derived live from the desk and radar records.
 *
 * Provenance: the ladder comes from the wallet-infrastructure
 * branch (commit 4d8658d, Wallet Phase 1). It is a FRESH
 * render, never a cherry-pick: the branch's stylesheet was
 * NOT carried over — its tip commit (10d2d66) leaves
 * css/style.css empty, which would blank all styling. The
 * vanilla shell already carries its own ladder panel
 * (js/modules/wallets.js, Item 4); this is the React desk's
 * copy, and its states follow the execution decisions
 * D1/D2/D3 (DEX only, owner signs, $50 boundary).
 *
 * A rung is a permission, not a button: nothing here can be
 * clicked, granted, or escalated. EXECUTE is Daniel's own
 * hand at the venue — the platform never signs. */
import React, { useMemo } from 'react';
import { swapDeskSummary } from '../swap-desk';
import { moneyRadarSummary } from '../money-radar';

const micro = 'font-mono text-[10px] tracking-widest text-[#8A93A3]';
const chip = 'rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wider';

export const CapabilityLadderPanel: React.FC = () => {
  const desk = useMemo(() => swapDeskSummary(), []);
  const radar = useMemo(() => moneyRadarSummary(), []);
  const rungs: { n: string; state: string; evidence: string; hot: boolean }[] = [
    {
      n: '1 · MONITOR',
      state: 'ACTIVE',
      evidence: `Money Radar watches live yields, prices, volumes, fees and governance — ${radar.totalSignals} signal(s) recorded, ${radar.radarCandidates} radar candidate(s).`,
      hot: false,
    },
    {
      n: '2 · ANALYZE',
      state: 'ACTIVE',
      evidence: 'Universal classification places every protocol by evidence (20 classes); the 19-dimension risk layer scores nothing — dimensions only.',
      hot: false,
    },
    {
      n: '3 · RECOMMEND',
      state: 'ACTIVE',
      evidence: 'Radar candidates and approval packages queue for Daniel\'s review — a recommendation is a record with provenance, never an instruction to act.',
      hot: false,
    },
    {
      n: '4 · PREPARE',
      state: 'ACTIVE',
      evidence: `The Swap Desk prepares swaps with live keyless quotes (Paraswap → KyberSwap → CoW Swap, both networks) and a Honeypot.is gate — ${desk.prepared} prepared now.`,
      hot: false,
    },
    {
      n: '5 · OWNER APPROVAL',
      state: 'REQUIRED',
      evidence: `Every action needs Daniel's own tap — ${desk.approved} approved so far. Approval cannot be waived, delegated, or automated away.`,
      hot: true,
    },
    {
      n: '6 · EXECUTE',
      state: 'OWNER SIGNS',
      evidence: `Daniel signs in his own wallet at the venue (DEX only, no KYC) — ${desk.handedOff} handed off so far. MTI6 holds no keys and cannot sign, broadcast, or settle anything.`,
      hot: true,
    },
  ];
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <span className={micro}>CAPABILITY LADDER — SIX RUNGS, PERMISSION NOT POWER</span>
      <div className="space-y-1.5">
        {rungs.map((r) => (
          <div key={r.n} className="flex flex-wrap items-baseline gap-2 rounded-md border border-white/10 px-2 py-1.5">
            <span className="font-mono text-[11px] font-semibold text-white">{r.n}</span>
            <span
              className={chip}
              style={r.hot ? { borderColor: 'rgba(255,176,32,0.5)', color: '#FFB020' } : { borderColor: 'rgba(50,215,75,0.45)', color: '#32D74B' }}
            >
              {r.state}
            </span>
            <span className="text-[11px] leading-relaxed text-[#B8B8B8]">{r.evidence}</span>
          </div>
        ))}
      </div>
      <p className={micro}>
        FROM THE WALLET-INFRASTRUCTURE BRANCH (4D8658D), RENDERED FRESH WITH LIVE STATES — THE BRANCH'S STYLESHEET WAS NOT CARRIED OVER (ITS TIP LEAVES CSS/STYLE.CSS EMPTY). THE VANILLA SHELL CARRIES ITS OWN LADDER (JS/MODULES/WALLETS.JS, ITEM 4).
      </p>
    </div>
  );
};
