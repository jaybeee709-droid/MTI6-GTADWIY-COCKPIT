/**
 * Angels Panel (v247, owner direction #7, 2026-11-25) — the
 * four approved Angels (MICHAEL, GABRIEL, RAPHAEL, URIEL) with
 * their honest active states, the AngelSecurity lifecycle
 * summary, and the conditional parallel-execution policy line.
 *
 * Angels are a SEPARATE registry — never Tribe members. An
 * Angel reads ACTIVE only while it holds open alert work
 * (assigned, before RESOLVED); otherwise STANDBY. RAGUEL,
 * SARIEL and REMIEL read UNVERIFIED / NOT ACTIVATED and cannot
 * be assigned. No alerts are invented here: everything shown
 * comes from the AngelSecurity store, which holds only
 * owner-recorded alerts.
 */
import React, { useEffect, useState } from 'react';
import { angelStatus, type AngelStatusView } from '../angel-registry';
import { alertCounts, loadAngelStore, type SecurityAlert } from '../angel-security';
import { PARALLEL_POLICY, parallelStatus } from '../worker-runtime';

export function AngelsPanel() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [mode, setMode] = useState(parallelStatus());

  useEffect(() => {
    setAlerts(loadAngelStore().alerts);
    setMode(parallelStatus());
  }, []);

  const status = angelStatus(alerts);
  const counts = alertCounts(alerts);
  const approved: AngelStatusView[] = status.angels.filter((a) => a.approval === 'APPROVED');
  const unverified: AngelStatusView[] = status.angels.filter((a) => a.approval !== 'APPROVED');
  const openAlerts = alerts.filter((a) => a.state !== 'RESOLVED' && a.state !== 'POST_INCIDENT_REVIEW').length;
  const stateOrder = ['DETECTED', 'VERIFYING', 'CONFIRMED', 'ACTIVE', 'MITIGATING', 'RESOLVED', 'POST_INCIDENT_REVIEW'];

  return (
    <div className="rounded-lg border border-[#2a2a3a] bg-[#0b0b12] p-4">
      <div className="mb-1 text-sm font-bold tracking-wide text-white">ANGELS — ACTIVE ON SECURITY &amp; ALERT WORK</div>
      <p className="mb-3 text-xs leading-relaxed text-zinc-400">
        The Angels are a separate registry — never Tribe members. {status.active} active · {status.standby} on
        standby · {status.notActivated} not activated. An Angel is ACTIVE only while it holds open alert work;
        otherwise it stands by. Angels act only through the existing alert lifecycle (DETECTED → VERIFYING →
        CONFIRMED → ACTIVE → MITIGATING → RESOLVED → POST_INCIDENT_REVIEW); assignment never moves a state and
        never auto-verifies anything. The owner remains the recorded actor for owner actions.
      </p>

      <div className="space-y-3">
        {approved.map((angel) => (
          <div key={angel.id} className="rounded-md border border-[#2a2a3a] bg-[#12121c] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-white">{angel.name}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
                  angel.status === 'ACTIVE' ? 'bg-[#32D74B]/15 text-[#32D74B]' : 'bg-zinc-700/40 text-zinc-400'
                }`}
              >
                {angel.status}
              </span>
              <span className="text-[10px] text-zinc-500">
                approved ({angel.source}) · {angel.role}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300">
              {angel.openAlertCount > 0
                ? `Holding ${angel.openAlertCount} open alert(s): ${angel.openAlertIds.join(', ')}`
                : 'No open alert work.'}
              {angel.totalAssignedAlertIds.length > angel.openAlertCount
                ? ` (${angel.totalAssignedAlertIds.length - angel.openAlertCount} assigned alert(s) already resolved or in post-incident review.)`
                : ''}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-1 text-xs font-bold tracking-wide text-zinc-200">
          ALERT LIFECYCLE — {alerts.length} alert(s), {openAlerts} open
        </div>
        <p className="text-xs leading-relaxed text-zinc-400">
          {stateOrder.map((s) => `${s} ${counts[s] ?? 0}`).join(' · ')}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
          Alerts exist only because the owner recorded them — there are no detectors behind this surface, and nothing
          here invents an alert.
        </p>
      </div>

      <div className="mt-4">
        <div className="mb-1 text-xs font-bold tracking-wide text-zinc-200">
          NOT ACTIVATED — UNVERIFIED, CANNOT BE ASSIGNED
        </div>
        <p className="text-xs leading-relaxed text-zinc-400">
          {unverified.map((a) => `${a.name} (UNVERIFIED / NOT ACTIVATED)`).join(' · ')} — these three require
          verification before any use and cannot hold alert work.
        </p>
      </div>

      <p className="mt-4 border-t border-[#2a2a3a] pt-3 text-[11px] leading-relaxed text-zinc-500">
        <span className="font-semibold text-zinc-300">Parallel execution — {mode.mode}: </span>
        {PARALLEL_POLICY}
        {mode.lastDecisionAt
          ? ` Last decision: ${mode.mode} for a batch of ${mode.lastBatchSize} (${mode.reason})`
          : ' No parallel batch has been decided yet this session — rotation is running.'}
      </p>
    </div>
  );
}
