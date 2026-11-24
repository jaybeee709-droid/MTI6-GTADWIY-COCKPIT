/* MTI6-GTADWIY-COCKPIT — Raw Archive Layer (Fabric Layer 2).
 *
 * The replayable archive the Ingestion Fabric calls for, built
 * as its own layer per the owner's decision (2026-11-24): NOT
 * inside CockpitDB (which stays v3, lean, canonical) — a
 * separate bounded archive in the app layer.
 *
 * Every governed fetch that flows through live-data's fetchJson
 * appends one record: source host, endpoint, timestamp, and
 * the payload as received. Bounds are explicit and stated on
 * the surface: at most 300 records (oldest evicted), each
 * payload excerpt capped at 1,500 chars — this is an evidence
 * archive for audit and replay of what the app actually saw,
 * not a full-fidelity data warehouse, and it never feeds
 * canonical stores directly: candidates still enter through
 * the engines, exactly as the Fabric's own flow requires.
 */

export interface RawArchiveEntry {
  id: string;
  source: string; // endpoint host, e.g. api.coingecko.com
  endpoint: string; // full URL as called
  at: number;
  bytes: number; // full payload size as received
  excerpt: string; // first EXCERPT_CHARS of the payload
  truncated: boolean;
}

const KEY = 'mti6_raw_archive_v1';
export const RAW_ARCHIVE_MAX = 300;
export const RAW_ARCHIVE_EXCERPT_CHARS = 1500;

export function loadRawArchive(): RawArchiveEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRawArchive(entries: RawArchiveEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, RAW_ARCHIVE_MAX)));
  } catch {
    /* storage full/blocked — the archive yields, the fetch never does */
  }
}

/* Append one fetch to the archive. Never throws: archiving is
 * evidence-keeping, and a failure here must not break the
 * governed fetch it observes. */
export function recordRawArchive(source: string, endpoint: string, payloadText: string): void {
  try {
    const text = typeof payloadText === 'string' ? payloadText : '';
    const entry: RawArchiveEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source,
      endpoint,
      at: Date.now(),
      bytes: text.length,
      excerpt: text.slice(0, RAW_ARCHIVE_EXCERPT_CHARS),
      truncated: text.length > RAW_ARCHIVE_EXCERPT_CHARS,
    };
    saveRawArchive([entry, ...loadRawArchive()]);
  } catch {
    /* see above */
  }
}

export function rawArchiveSummary(): {
  total: number;
  bySource: { source: string; count: number; lastAt: number }[];
  latest: RawArchiveEntry | null;
} {
  const entries = loadRawArchive();
  const map = new Map<string, { source: string; count: number; lastAt: number }>();
  for (const e of entries) {
    const row = map.get(e.source) ?? { source: e.source, count: 0, lastAt: 0 };
    row.count += 1;
    row.lastAt = Math.max(row.lastAt, e.at);
    map.set(e.source, row);
  }
  return {
    total: entries.length,
    bySource: [...map.values()].sort((a, b) => b.lastAt - a.lastAt),
    latest: entries[0] ?? null,
  };
}
