import React, { useMemo } from 'react';
import { KeyRound, ShieldCheck, Unplug } from 'lucide-react';
import { API_REGISTRY, getRegistryForPrincipal, type ApiRegistryEntry } from '../api-registry';
import { TRIBE_PRINCIPALS } from '../worlds-data';
import { SPACE_BG } from './CryptoWorld';

/* API REGISTRY PANEL — v247 part 2 (2026-11-25).
 *
 * Renders the registry from src/api-registry.ts: per-bot
 * grouping, provider, key status (NAME only — never a value),
 * monthly limit, fallback order, usage (UNKNOWN where
 * unmeasured, labelled as such), and cost class. This panel
 * documents the registry; it does not call any provider and
 * carries no secrets. */

function KeyStatusBadge({ entry }: { entry: ApiRegistryEntry }) {
  if (entry.keyName === null) {
    return (
      <span className="rounded border border-white/15 bg-[#151515] px-2 py-0.5 font-mono text-[10px] text-white/70">
        KEYLESS — NO KEY
      </span>
    );
  }
  return entry.keyStatus === 'CONFIGURED' ? (
    <span className="rounded border border-[#32D74B]/40 bg-[#32D74B]/10 px-2 py-0.5 font-mono text-[10px] text-[#32D74B]">
      CONFIGURED · {entry.keyName}
    </span>
  ) : (
    <span className="rounded border border-[#FF453A]/40 bg-[#FF453A]/10 px-2 py-0.5 font-mono text-[10px] text-[#FF453A]">
      NOT_CONFIGURED · {entry.keyName}
    </span>
  );
}

function EntryRow({ entry }: { entry: ApiRegistryEntry }) {
  const hasFallback = entry.fallbackOrder.length > 0;
  return (
    <div className="rounded-lg bg-[#151515] px-3 py-2.5 space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-white">{entry.name}</span>
          <span className="rounded border border-white/15 bg-[#101010] px-2 py-0.5 font-mono text-[10px] text-white/60">
            {entry.provider}
          </span>
          <span className="rounded border border-white/15 bg-[#101010] px-2 py-0.5 font-mono text-[10px] text-white/60">
            {entry.category.toUpperCase()}
          </span>
          {entry.wired ? (
            <span className="rounded border border-[#00B7FF]/40 bg-[#00B7FF]/10 px-2 py-0.5 font-mono text-[10px] text-[#00B7FF]">
              WIRED
            </span>
          ) : (
            <span className="rounded border border-white/15 bg-[#101010] px-2 py-0.5 font-mono text-[10px] text-white/50">
              NOT WIRED
            </span>
          )}
        </div>
        <KeyStatusBadge entry={entry} />
      </div>
      <div className="grid gap-1 font-mono text-[11px] leading-relaxed text-white/75 sm:grid-cols-2">
        <div>
          <span className="text-white/45">MONTHLY LIMIT · </span>
          {entry.monthlyLimit === 'UNKNOWN' ? (
            <span className="text-white/60">UNKNOWN</span>
          ) : (
            <span className="text-white">{entry.monthlyLimit.toLocaleString()} / month</span>
          )}
          {entry.monthlyLimitSource ? (
            <span className="text-white/45"> ({entry.monthlyLimitSource})</span>
          ) : null}
        </div>
        <div>
          <span className="text-white/45">COST CLASS · </span>
          <span className="text-white">{entry.costClass}</span>
        </div>
        <div>
          <span className="text-white/45">USAGE · </span>
          <span className="text-white/60">UNKNOWN (unmeasured — no usage metering exists in the app)</span>
        </div>
        <div>
          <span className="text-white/45">FALLBACK · </span>
          {hasFallback ? (
            <span className="text-white">
              {entry.fallbackOrder.join(' → ')}
              {entry.fallbackWired ? ' (wired)' : ' (documented only — not wired)'}
            </span>
          ) : (
            <span className="text-white/60">NO FALLBACK — single source</span>
          )}
        </div>
      </div>
      {entry.keyNote || entry.monthlyLimitNote || entry.fallbackNote || entry.wiredNote ? (
        <div className="space-y-0.5 font-mono text-[10px] leading-relaxed text-white/50">
          {entry.keyNote ? <div>KEY · {entry.keyNote}</div> : null}
          {entry.monthlyLimitNote ? <div>LIMIT · {entry.monthlyLimitNote}</div> : null}
          {entry.fallbackNote ? <div>FALLBACK · {entry.fallbackNote}</div> : null}
          {entry.wiredNote ? <div>WIRING · {entry.wiredNote}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

export function ApiRegistryPanel() {
  const groups = useMemo(() => {
    const star = getRegistryForPrincipal('star');
    const tribes = TRIBE_PRINCIPALS.map((p) => ({
      id: p.id,
      label: p.displayName,
      entries: getRegistryForPrincipal(p.id),
    })).filter((g) => g.entries.length > 0);
    return { star, tribes };
  }, []);

  const total = API_REGISTRY.length;
  const wiredFallbacks = API_REGISTRY.filter(
    (e) => e.fallbackOrder.length > 0 && e.fallbackWired,
  ).length;
  const documentedFallbacks = API_REGISTRY.filter(
    (e) => e.fallbackOrder.length > 0 && !e.fallbackWired,
  ).length;
  const noFallbacks = API_REGISTRY.filter((e) => e.fallbackOrder.length === 0).length;
  const configured = API_REGISTRY.filter(
    (e) => e.keyName !== null && e.keyStatus === 'CONFIGURED',
  ).length;
  const notConfigured = API_REGISTRY.filter(
    (e) => e.keyName !== null && e.keyStatus === 'NOT_CONFIGURED',
  ).length;
  const keyless = API_REGISTRY.filter((e) => e.keyName === null).length;

  return (
    <div className="rounded-xl border border-[#8B5CFF]/25 p-4 space-y-4" style={SPACE_BG}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-mono text-[#8B5CFF]">
          <KeyRound className="h-4 w-4" />
          <span>API REGISTRY · PER-BOT OWNERSHIP, KEYS, LIMITS &amp; FALLBACKS</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-white/60">
          <ShieldCheck className="h-3.5 w-3.5 text-[#32D74B]" />
          <span>KEY NAMES ONLY — NO VALUES ANYWHERE</span>
        </div>
      </div>

      <p className="font-mono text-[11px] leading-relaxed text-white/70">
        {total} APIs. {configured} keyed + configured, {notConfigured} keyed + not configured,{' '}
        {keyless} keyless. {wiredFallbacks} entries ride a WIRED fallback chain,{' '}
        {documentedFallbacks} carry a DOCUMENTED-ONLY chain (STAR — v246 in flight),{' '}
        {noFallbacks} have NO FALLBACK (single source). Usage is UNKNOWN on every entry: no
        usage metering exists in the app, so no count is invented. Monthly limits are shown only
        where a source names one; everything else reads UNKNOWN.
      </p>

      {groups.star.length > 0 ? (
        <section className="space-y-2">
          <h3 className="font-mono text-xs font-semibold tracking-wide text-[#8B5CFF]">
            STAR · {groups.star.length} {groups.star.length === 1 ? 'ENTRY' : 'ENTRIES'}
          </h3>
          <div className="space-y-2">
            {groups.star.map((e) => (
              <EntryRow key={e.id} entry={e} />
            ))}
          </div>
        </section>
      ) : null}

      {groups.tribes.map((g) => (
        <section key={g.id} className="space-y-2">
          <h3 className="font-mono text-xs font-semibold tracking-wide text-white">
            {g.label} · {g.entries.length} {g.entries.length === 1 ? 'ENTRY' : 'ENTRIES'}
          </h3>
          <div className="space-y-2">
            {g.entries.map((e) => (
              <EntryRow key={e.id} entry={e} />
            ))}
          </div>
        </section>
      ))}

      <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-[#101010] px-3 py-2">
        <Unplug className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/50" />
        <p className="font-mono text-[10px] leading-relaxed text-white/50">
          Registry honesty rules: CONFIGURED means the exact env name the code reads is present
          in Netlify (Nov 25 dashboard check) — a key held under a different name does not count
          (see CoinGecko). A fallback marked &ldquo;documented only&rdquo; is not wired. An
          UNKNOWN limit or usage is a gap, not a zero. This panel documents the registry; it
          does not call any provider.
        </p>
      </div>
    </div>
  );
}
