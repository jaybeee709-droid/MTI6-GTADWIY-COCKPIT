/**
 * Job Cards Panel (v247) — renders all 12 Tribe principal job
 * cards from principal-jobs.ts: principal, role, what the job
 * is, what it does, what it NEVER does, its APIs (by name only),
 * and its limits.
 *
 * Honesty line shown on the panel itself: no principal carries
 * a fixed role in code — all start UNASSIGNED and roles are
 * owner-assigned at runtime. The job on each card is the
 * principal's real seeded Scout work, not an aspiration.
 */
import React from 'react';
import { PRINCIPAL_JOBS } from '../principal-jobs';

export function JobCardsPanel() {
  return (
    <div className="rounded-lg border border-[#2a2a3a] bg-[#0b0b12] p-4">
      <div className="mb-1 text-sm font-bold tracking-wide text-white">TRIBE JOB CARDS — WHAT EACH PRINCIPAL ACTUALLY DOES</div>
      <p className="mb-3 text-xs leading-relaxed text-zinc-400">
        One card per principal, in Revelation-7 order. Roles are NOT fixed: every principal starts UNASSIGNED and the owner
        assigns roles at runtime (Research, Risk, Yield, Routing, Security, Builder, Analysis, Monitoring) — Money Radar
        routes work orders to whoever currently holds a role. Each card&apos;s job is the principal&apos;s real seeded Scout
        assignment from the governed web-harvest, verified in code.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {PRINCIPAL_JOBS.map((job) => (
          <div key={job.principalId} className="rounded-md border border-[#2a2a3a] bg-[#12121c] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-white">{job.principal}</span>
              <span className="rounded bg-[#8B5CFF]/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[#8B5CFF]">
                ROLE: {job.role ?? 'UNASSIGNED'}
              </span>
            </div>
            <p className="mt-1 text-[11px] italic leading-relaxed text-zinc-500">{job.roleNote}</p>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-200">{job.job}</p>
            <p className="mt-2 text-[11px] font-bold tracking-wide text-zinc-400">WHAT IT DOES</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-relaxed text-zinc-300">
              {job.whatItDoes.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] font-bold tracking-wide text-zinc-400">WHAT IT NEVER DOES</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-relaxed text-zinc-300">
              {job.neverDoes.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300">
              <span className="font-bold text-zinc-400">APIs: </span>
              {job.apis.join(' · ')}
            </p>
            <p className="mt-1 text-[11px] font-bold tracking-wide text-zinc-400">LIMITS</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-zinc-400">
              {job.limits.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
