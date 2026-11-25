/* COMMAND DECISION BOARD (v219) — the living checklist of
 * everything that is NOT code: decisions, authorizations,
 * inputs, and activations. The bottleneck stopped being
 * engineering; this board is where the queue is visible.
 * Rows come from decision-board.ts; the STAR row is checked
 * live against the gateway, and the D6 + wallet rows read
 * the executor and desk summaries. */
import React, { useEffect, useState } from 'react';
import { DECISION_BOARD_ROWS } from '../decision-board';
import { executorSummary } from '../executor';
import { swapDeskSummary } from '../swap-desk';
import { fetchStarStatus } from '../star-client';

const micro = 'font-mono text-[10px] tracking-widest text-[#8A93A3]';

export const DecisionBoardPanel: React.FC = () => {
  const [star, setStar] = useState<{ configured: boolean; model: string | null; checked: boolean }>({
    configured: false,
    model: null,
    checked: false,
  });
  useEffect(() => {
    let live = true;
    fetchStarStatus()
      .then((s) => {
        if (live) setStar({ ...s, checked: true });
      })
      .catch(() => {
        if (live) setStar({ configured: false, model: null, checked: true });
      });
    return () => {
      live = false;
    };
  }, []);
  const exec = executorSummary();
  const desk = swapDeskSummary();
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <span className={micro}>COMMAND DECISION BOARD — WHAT IS NOT CODE</span>
      <div className="space-y-1.5">
        {DECISION_BOARD_ROWS.map((row) => {
          let status = row.status;
          let extra = '';
          if (row.item === 'STAR Provider Key' && star.checked) {
            status = star.configured
              ? `CONFIGURED — live gateway check${star.model ? ` (model ${star.model})` : ''}`
              : 'IN PROGRESS — not configured (live gateway check)';
          }
          if (row.item === 'D6 Autonomous Executor') {
            extra = ` Dry-run runs: ${exec.runs} · would-be trades: ${exec.wouldBeTrades} · kill switch: ${exec.halted ? 'ON' : 'OFF'}.`;
          }
          if (row.item === 'Wallet Validation') {
            extra = ` Desk now: ${desk.prepared} prepared · ${desk.approved} approved · ${desk.handedOff} handed off.`;
          }
          return (
            <div key={row.item} className="rounded-md border border-white/10 px-2 py-1.5">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-[11px] font-semibold text-white">{row.item}</span>
                <span className="font-mono text-[10px] tracking-wider text-[#8A93A3]">OWNER: {row.owner}</span>
                <span
                  className="rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wider"
                  style={
                    row.status.startsWith('ACCEPTED')
                      ? { borderColor: 'rgba(50,215,75,0.45)', color: '#32D74B' }
                      : row.status.startsWith('WAITING') || row.status.startsWith('MISSING')
                        ? { borderColor: 'rgba(255,176,32,0.5)', color: '#FFB020' }
                        : { borderColor: 'rgba(0,183,255,0.45)', color: '#00B7FF' }
                  }
                >
                  {status}
                </span>
              </div>
              <div className="mt-1 text-[11px] leading-relaxed text-[#B8B8B8]">
                Blocking: {row.blocking}. {row.evidence}
                {extra}
              </div>
            </div>
          );
        })}
      </div>
      <p className={micro}>
        A ROW MOVES ONLY ON EVIDENCE — A DECISION, A DELIVERED DOCUMENT, OR A LIVE CHECK. NOTHING HERE IS A WISH.
      </p>
    </div>
  );
};
