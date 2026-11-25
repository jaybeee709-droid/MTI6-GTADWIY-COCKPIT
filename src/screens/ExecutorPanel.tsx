/* D6 executor console (v219) — the dry-run stage's control
 * panel. It decides and logs; it cannot sign, broadcast, or
 * spend. The kill switch is layer 1 of the paper's three:
 * the in-app halt flag, checked before every decision. */
import React, { useState } from 'react';
import {
  EXECUTOR_DAILY_CAP_USD,
  EXECUTOR_MODE,
  EXECUTOR_PER_TRADE_USD,
  closePilotPosition,
  executorSummary,
  loadExecutorRuns,
  runDryRunCycle,
  setExecutorHalted,
} from '../executor';

const micro = 'font-mono text-[10px] tracking-widest text-[#8A93A3]';

export const ExecutorPanel: React.FC = () => {
  const [summary, setSummary] = useState(() => executorSummary());
  const [runs, setRuns] = useState(() => loadExecutorRuns());
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = () => {
    setSummary(executorSummary());
    setRuns(loadExecutorRuns());
  };

  const onRun = async () => {
    setRunning(true);
    setMsg(null);
    try {
      const run = await runDryRunCycle();
      refresh();
      setMsg(
        run.decisions.length
          ? `${run.decisions[0].decision} — ${run.decisions[0].ruleFired}. ${run.decisions[0].reason}`
          : run.note,
      );
    } catch (e) {
      setMsg(`Run failed: ${e instanceof Error ? e.message : 'unknown error'}. Nothing was decided and nothing was signed.`);
    } finally {
      setRunning(false);
    }
  };

  const onHalt = (halted: boolean) => {
    setExecutorHalted(halted);
    refresh();
    setMsg(halted ? 'Kill switch ON — the executor is halted. It will evaluate nothing until you resume it.' : 'Kill switch OFF — the executor may run dry-run cycles again.');
  };

  const onClosePosition = () => {
    closePilotPosition();
    refresh();
    setMsg('Pilot position closed (dry-run record only — nothing real was open). The one-position rule is free again.');
  };

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <span className={micro}>D6 EXECUTOR — {EXECUTOR_MODE} · BASE ONLY · CAPS ${EXECUTOR_PER_TRADE_USD}/TRADE · ${EXECUTOR_DAILY_CAP_USD}/DAY</span>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#B8B8B8]">
        <span>
          Runs: {summary.runs} · Would-be trades: {summary.wouldBeTrades} · Would-be volume: ${summary.wouldBeVolumeUsd} (today ${summary.todayWouldBeVolumeUsd}) ·
          Pilot position: {summary.pilotPositionOpen ? 'OPEN' : 'NONE'} · Kill switch: {summary.halted ? 'ON — HALTED' : 'OFF'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRun}
          disabled={running || summary.halted}
          className="rounded-lg border border-[#8B5CFF]/50 bg-[#8B5CFF]/20 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {running ? 'RUNNING…' : 'RUN DRY-RUN CYCLE'}
        </button>
        <button
          type="button"
          onClick={() => onHalt(!summary.halted)}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white"
        >
          {summary.halted ? 'RESUME EXECUTOR' : 'HALT EXECUTOR'}
        </button>
        {summary.pilotPositionOpen && (
          <button
            type="button"
            onClick={onClosePosition}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white"
          >
            CLOSE PILOT POSITION
          </button>
        )}
      </div>
      {msg && <p className="text-[11px] leading-relaxed text-[#B8B8B8]">{msg}</p>}
      {runs.length === 0 ? (
        <p className="text-[11px] leading-relaxed text-[#B8B8B8]">
          No runs yet. A run evaluates the strongest radar candidate against the paper's gates and logs what would have happened — quote, Honeypot check, caps, and the rule that fired.
        </p>
      ) : (
        <div className="space-y-1.5">
          {runs.slice(0, 6).map((run) => (
            <div key={run.id} className="rounded-md border border-white/10 px-2 py-1.5">
              <div className="font-mono text-[10px] tracking-wider text-[#8A93A3]">
                {new Date(run.ranAt).toLocaleString()} · {run.mode}
                {run.halted ? ' · HALTED' : ''}
              </div>
              {run.decisions.map((d, i) => (
                <div key={i} className="mt-1 text-[11px] leading-relaxed text-[#E8EAF0]">
                  <span className="font-mono font-semibold">{d.decision}</span> — {d.ruleFired}: {d.reason}
                  {d.quoteSource ? ` Quote: ${d.quoteSource} (${d.quoteStatus}), ${d.toAmount} ${d.toSymbol}.` : ''}
                  {d.honeypot !== null ? ` Honeypot: ${d.honeypot ? 'YES' : 'NO'}.` : ''}
                </div>
              ))}
              <div className="mt-1 text-[11px] leading-relaxed text-[#B8B8B8]">{run.note}</div>
            </div>
          ))}
        </div>
      )}
      <p className={micro}>
        D6 ACCEPTED WITH CONSTRAINTS 2026-11-24 (DANIEL: "BUILD D6 NOW") — DRY-RUN ONLY: THIS PANEL DECIDES AND LOGS; IT CANNOT SIGN, BROADCAST, OR SPEND. THE LIVE PILOT NEEDS DANIEL'S SEPARATE DECISION AFTER HE REVIEWS THE DRY-RUN LOG, PLUS A HOT WALLET HE CREATES AND FUNDS AND A KEY HE PLACES IN NETLIFY HIMSELF.
      </p>
    </div>
  );
};
