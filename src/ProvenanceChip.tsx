import React, { useState } from 'react';
import { fmtTime, type Observation } from './live-data';

/* The provenance explorer, at figure level: every live figure carries
 * one of these chips. Tap it and the observation behind the figure
 * opens — source, status, fetch time, the fallback chain that was
 * walked, and the governor's note. A figure that cannot show its
 * provenance does not belong on screen; that is the rule this
 * component exists to enforce.
 */

const STATUS_COLORS: Record<Observation<unknown>['status'], string> = {
  LIVE: '#32D74B', // a verified, just-fetched stream — green's legitimate use
  CACHED: '#00B7FF',
  STALE: '#FFB020',
  NO_DATA: '#B8B8B8',
};

export const ProvenanceChip: React.FC<{ obs: Observation<unknown>; compact?: boolean }> = ({
  obs,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const color = STATUS_COLORS[obs.status];
  return (
    <span className="inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Show provenance — where this figure came from"
        className="inline-flex items-center gap-1.5 rounded border border-white/15 bg-[#101010] px-1.5 py-0.5 font-mono text-[9px] text-[#B8B8B8] transition hover:border-white/35 hover:text-white"
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        {obs.source ?? 'NO SOURCE'} · {obs.status}
        {!compact && obs.fetchedAt !== null && <> · {fmtTime(obs.fetchedAt)}</>}
      </button>
      {open && (
        <span className="mt-1 block w-64 rounded-lg border border-white/15 bg-[#0b0b0b] p-2.5 text-left font-mono text-[9px] leading-relaxed text-[#B8B8B8] shadow-xl">
          <span className="block">
            <span className="text-white">SOURCE:</span> {obs.source ?? '—'}
          </span>
          <span className="block">
            <span className="text-white">STATUS:</span>{' '}
            <span style={{ color }}>{obs.status}</span>
          </span>
          <span className="block">
            <span className="text-white">FETCHED:</span> {fmtTime(obs.fetchedAt)}
          </span>
          <span className="block">
            <span className="text-white">CHAIN:</span>{' '}
            {obs.chain.length > 0 ? obs.chain.join(' → ') : '—'}
          </span>
          <span className="mt-1 block border-t border-white/10 pt-1">{obs.note}</span>
        </span>
      )}
    </span>
  );
};
