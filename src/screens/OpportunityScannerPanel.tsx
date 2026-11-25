/* Opportunity Scanner panel (v214) — Crypto World's unified
 * board over everything the bots find (Money Radar signals +
 * candidates), ranked by evidence dimensions. Design adopted
 * from the owner's relayed scanner spec with the platform's
 * corrections (see OPPORTUNITY-SCANNER-RECONCILIATION-2026-
 * 11-24.md): NO composite scores, NO "VERIFIED" labels —
 * candidates are UNVERIFIED until Daniel's gate — and lanes
 * without a live source read NO_DATA by name. The scanner
 * discovers and ranks; it never executes. */
import React, { useMemo, useState } from 'react';
import { scannerBoard, SCANNER_NO_DATA_LANES, type ScannerEntry } from '../opportunity-scanner';

const micro = 'font-mono text-[10px] tracking-widest text-[#8A93A3]';
const chip =
  'rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wider';

export const OpportunityScannerPanel: React.FC = () => {
  const [lane, setLane] = useState<string>('ALL');
  const [tick, setTick] = useState(0);
  const board = useMemo(() => scannerBoard(60), [tick]);
  const lanes = Object.keys(board.laneCounts).sort();
  const shown: ScannerEntry[] = (lane === 'ALL' ? board.entries : board.entries.filter((e) => e.lane === lane)).slice(0, 12);

  return (
    <section className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className={micro}>OPPORTUNITY SCANNER — EVERY LANE THE BOTS CAN SEE</span>
        <button
          type="button"
          onClick={() => setTick((t) => t + 1)}
          className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-[#E8EAF0]"
        >
          REFRESH BOARD
        </button>
      </div>
      <div className="font-mono text-[11px] text-[#E8EAF0]">
        {board.signalCount} RADAR SIGNALS · {board.candidateCount} CANDIDATES · RANKED BY EVIDENCE — NO SCORES, NOTHING EXECUTED
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={chip} onClick={() => setLane('ALL')} style={lane === 'ALL' ? { borderColor: '#00B7FF', color: '#fff' } : { borderColor: 'rgba(255,255,255,0.15)', color: '#B8B8B8' }}>
          ALL
        </button>
        {lanes.map((l) => (
          <button
            key={l}
            type="button"
            className={chip}
            onClick={() => setLane(l)}
            style={lane === l ? { borderColor: '#00B7FF', color: '#fff' } : { borderColor: 'rgba(255,255,255,0.15)', color: '#B8B8B8' }}
          >
            {l.toUpperCase()} {board.laneCounts[l]}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="text-[11px] leading-relaxed text-[#B8B8B8]">
          The board is empty — the bots have not recorded findings yet. Run a Money Radar scan from Bot Operations
          (or ask STAR to run the radar) and the findings land here, ranked by their evidence.
        </p>
      ) : (
        <div className="space-y-1.5">
          {shown.map((e) => (
            <div key={e.id} className="rounded-md border border-white/10 px-2 py-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] font-semibold text-white">{e.title}</span>
                <span className={chip} style={{ borderColor: 'rgba(0,183,255,0.4)', color: '#00B7FF' }}>{e.lane.toUpperCase()}</span>
                <span className={chip} style={{ borderColor: 'rgba(255,255,255,0.15)', color: '#B8B8B8' }}>{e.boardState}</span>
                <span className={chip} style={{ borderColor: 'rgba(255,255,255,0.15)', color: '#B8B8B8' }}>{e.kind}</span>
              </div>
              <div className="mt-1 font-mono text-[10px] text-[#8A93A3]">
                EVIDENCE {e.evidenceCount} · SOURCES {e.sourceCount} · {e.supportStatus} · {e.freshness}
                {e.kind === 'CANDIDATE' ? ' · UNVERIFIED' : ''}
              </div>
              {e.detail && <p className="mt-0.5 text-[11px] leading-relaxed text-[#B8B8B8]">{e.detail}</p>}
            </div>
          ))}
        </div>
      )}
      <p className={micro}>
        LANES STILL NO_DATA — NO SOURCE CONNECTED, NOTHING INVENTED: {SCANNER_NO_DATA_LANES.join(' · ').toUpperCase()}
      </p>
      <p className="text-[11px] leading-relaxed text-[#B8B8B8]">
        The scanner discovers, ranks, and explains. It never executes: candidates advance only through your approval
        gate, and execution happens only in the Swap Desk, signed in your own wallet.
      </p>
    </section>
  );
};
