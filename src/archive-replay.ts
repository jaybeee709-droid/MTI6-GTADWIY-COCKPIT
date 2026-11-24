/* MTI6 Archive Replay (v204) — consolidation roadmap Phase 3:
 * the Raw Archive is replayable. Replay re-derives what it can
 * from the archived excerpts ALONE — no network, no new fetches
 * — proving the archive is a working evidence store, not a
 * dead log.
 *
 * Honesty bounds, stated in the output: excerpts are capped at
 * 1,500 chars, so most large payloads cannot be re-parsed in
 * full (counted, never hidden), and the protocol re-derivation
 * covers only the entries whose openings the excerpts carry.
 * Replay NEVER writes canonical stores: what it derives is
 * evidence about what the app saw, and candidates still enter
 * through the engines and the owner's gate. */

import { loadRawArchive } from './raw-archive';
import { classifyCategory } from './classification';

export const ARCHIVE_REPLAY_KEY = 'mti6_archive_replay_v1';

export interface ReplayDerived {
  name: string;
  category: string;
  cls: string;
  subclass: string;
}

export interface ReplaySummary {
  at: number;
  records: number;
  hosts: number;
  parseable: number;
  truncated: number;
  derived: ReplayDerived[];
}

export function replayArchive(now: number = Date.now()): ReplaySummary {
  const entries = loadRawArchive();
  const hosts = new Set<string>();
  let parseable = 0;
  let truncated = 0;
  const derived: ReplayDerived[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    hosts.add(e.source);
    if (e.truncated) truncated += 1;
    try {
      JSON.parse(e.excerpt);
      parseable += 1;
    } catch {
      /* truncated or non-JSON excerpt — counted via truncated/parseable */
    }
    if (e.source === 'api.llama.fi' && e.endpoint.includes('/protocols')) {
      const re = /"name"\s*:\s*"([^"]+)"[^}]*?"category"\s*:\s*"([^"]+)"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(e.excerpt)) !== null) {
        const name = m[1];
        if (seen.has(name)) continue;
        seen.add(name);
        const { cls, subclass } = classifyCategory(m[2]);
        derived.push({ name, category: m[2], cls, subclass });
      }
    }
  }
  return { at: now, records: entries.length, hosts: hosts.size, parseable, truncated, derived };
}

export function saveReplaySummary(s: ReplaySummary): void {
  try {
    localStorage.setItem(ARCHIVE_REPLAY_KEY, JSON.stringify(s));
  } catch {
    /* the summary still returns to its caller */
  }
}

export function loadReplaySummary(): ReplaySummary | null {
  try {
    const raw = localStorage.getItem(ARCHIVE_REPLAY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReplaySummary;
    return parsed && typeof parsed.at === 'number' && Array.isArray(parsed.derived) ? parsed : null;
  } catch {
    return null;
  }
}

export function replaySummaryText(s: ReplaySummary): string {
  const derivedLine =
    s.derived.length > 0
      ? ` Re-derived from the protocol-index excerpts alone: ${s.derived
          .slice(0, 6)
          .map((d) => `${d.name} → ${d.cls}/${d.subclass}`)
          .join(' · ')}${s.derived.length > 6 ? ` · +${s.derived.length - 6} more` : ''}.`
      : ' No protocol-index excerpts in the archive yet, so nothing re-derived.';
  return `Archive replay at ${new Date(s.at).toLocaleString()}: ${s.records} archived record(s) across ${s.hosts} host(s) · ${s.parseable} excerpt(s) re-parse in full · ${s.truncated} truncated at the 1,500-char excerpt cap (partial by design).${derivedLine} Replay used no network and wrote nothing canonical.`;
}
