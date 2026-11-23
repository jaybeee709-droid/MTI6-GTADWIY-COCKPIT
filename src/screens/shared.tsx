// Shared building blocks for the migrated screens (src/screens/*).
//
// Visual language matches the existing shell (OtherWorlds.tsx etc.):
// #101010 panels, white/10 borders, #00B7FF accent, #B8B8B8 secondary
// text. These are presentation helpers only — they carry no data and
// no second source of truth.

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export const ScreenHeader: React.FC<{
  icon: LucideIcon;
  title: string;
  subtitle: string;
  note?: string;
  accent?: string;
}> = ({ icon: Icon, title, subtitle, note, accent = '#00B7FF' }) => (
  <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
    <div className="flex items-center gap-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl border"
        style={{ backgroundColor: `${accent}26`, color: accent, borderColor: `${accent}4D` }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-xs text-[#B8B8B8]">{subtitle}</p>
        {note ? <p className="mt-0.5 text-xs text-[#B8B8B8]">{note}</p> : null}
      </div>
    </div>
  </div>
);

export const Panel: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
    {title ? <h3 className="mb-3 text-sm font-semibold">{title}</h3> : null}
    {children}
  </div>
);

export const StatusPill: React.FC<{ status: string; tone?: 'neutral' | 'warn' | 'bad' | 'ok' }> = ({
  status,
  tone = 'neutral',
}) => {
  const tones: Record<string, string> = {
    neutral: 'bg-[#151515] text-[#B8B8B8] border-white/10',
    warn: 'bg-[#FFB800]/15 text-[#FFB800] border-[#FFB800]/40',
    bad: 'bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/40',
    ok: 'bg-[#32D74B]/15 text-[#32D74B] border-[#32D74B]/40',
  };
  return (
    <span
      className={`inline-block shrink-0 rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${tones[tone]}`}
    >
      {status}
    </span>
  );
};

export const TabBar: React.FC<{
  tabs: readonly string[];
  active: string;
  onSelect: (tab: string) => void;
}> = ({ tabs, active, onSelect }) => (
  <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
    {tabs.map((t) => (
      <button
        key={t}
        onClick={() => onSelect(t)}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
          active === t
            ? 'bg-[#00B7FF] font-semibold text-black'
            : 'bg-[#151515] text-[#B8B8B8] hover:bg-[#202020] hover:text-white'
        }`}
      >
        {t}
      </button>
    ))}
  </div>
);

export const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="rounded-xl bg-[#151515] p-4 text-xs text-[#B8B8B8]">{children}</p>
);

export const MonoLine: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-2 font-mono text-[11px] text-[#B8B8B8]">{children}</p>
);
