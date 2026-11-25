/* MTI6-GTADWIY-COCKPIT — Tribe Web Harvest (v229).
 *
 * Tribe members scraping the web — every source, not a fixed
 * list. A principal is assigned a source (any https URL the
 * owner adds); the harvest fetches it from this page, saves
 * the excerpt to a bounded store, and records the fetch in
 * the governed raw archive too. The store is the evidence
 * log of what the Tribe gathered — it is not knowledge, and
 * it never feeds canonical stores.
 *
 * HONEST BOUNDARIES (do not soften these in the UI):
 * - The harvest runs in this page only, while Bot Operations
 *   is open. There is no remote worker runtime, so nothing
 *   scrapes while the app is closed.
 * - Harvested content is RAW — unverified, never canonical,
 *   never shown as a price, a fact, or a VERIFIED record.
 * - Direct browser fetches only work for sources that allow
 *   browser reads (Access-Control-Allow-Origin). A source
 *   that blocks browser reads fails honestly as FAILED
 *   (NETWORK OR CORS) — it is never bypassed, and the
 *   gateway proxy is NOT opened to arbitrary URLs.
 * - Bounds are explicit: at most 200 records (oldest
 *   evicted), each excerpt capped at 1,500 chars.
 */

import { recordRawArchive } from './raw-archive';

export type HarvestKind = 'PRICES' | 'YIELDS' | 'PAIRS' | 'NEWS' | 'PAGES' | 'OTHER';

export const HARVEST_KINDS: HarvestKind[] = ['PRICES', 'YIELDS', 'PAIRS', 'NEWS', 'PAGES', 'OTHER'];

export interface HarvestAssignment {
  id: string;
  principalId: string;
  principalName: string;
  sourceName: string;
  url: string;
  kind: HarvestKind;
  active: boolean;
  createdAt: number;
}

export interface HarvestRecord {
  id: string;
  assignmentId: string;
  principalName: string;
  sourceName: string;
  url: string;
  kind: HarvestKind;
  fetchedAt: number;
  status: 'OK' | 'FAILED';
  httpStatus: number | null;
  bytes: number;
  excerpt: string;
  error: string | null;
}

export const HARVEST_ASSIGNMENTS_KEY = 'mti6_harvest_assignments_v1';
export const HARVEST_RECORDS_KEY = 'mti6_web_harvest_v1';
export const HARVEST_AUTO_KEY = 'mti6_harvest_auto_v1';
export const HARVEST_MAX_RECORDS = 200;
export const HARVEST_EXCERPT_CHARS = 1500;
/** Polite gap between source requests in one harvest run. */
export const HARVEST_GAP_MS = 1000;
/** Auto-harvest cadence while Bot Operations stays open. */
export const HARVEST_INTERVAL_MS = 15 * 60 * 1000;

/* The first three Scouts, seeded only when the owner has no
 * assignments yet. All three sources were verified live from
 * this host (2026-11-25): HTTP 200 with
 * Access-Control-Allow-Origin: *, so a browser read works.
 * The owner adds every other source through the form — any
 * https URL, any kind. */
const SEED_ASSIGNMENTS: Omit<HarvestAssignment, 'id' | 'createdAt'>[] = [
  {
    principalId: 'tribe-judah',
    principalName: 'JUDAH',
    sourceName: 'CoinGecko Markets',
    url: 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1',
    kind: 'PRICES',
    active: true,
  },
  {
    principalId: 'tribe-issachar',
    principalName: 'ISSACHAR',
    sourceName: 'DefiLlama Pools',
    url: 'https://yields.llama.fi/pools',
    kind: 'YIELDS',
    active: true,
  },
  {
    principalId: 'tribe-zebulun',
    principalName: 'ZEBULUN',
    sourceName: 'DexScreener Search ETH',
    url: 'https://api.dexscreener.com/latest/dex/search?q=ETH',
    kind: 'PAIRS',
    active: true,
  },
];

export function loadHarvestAssignments(): HarvestAssignment[] {
  try {
    const raw = localStorage.getItem(HARVEST_ASSIGNMENTS_KEY);
    if (raw === null) {
      const seeded: HarvestAssignment[] = SEED_ASSIGNMENTS.map((s, i) => ({
        ...s,
        id: `harvest-seed-${i + 1}`,
        createdAt: Date.now(),
      }));
      saveHarvestAssignments(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HarvestAssignment[]) : [];
  } catch {
    return [];
  }
}

export function saveHarvestAssignments(list: HarvestAssignment[]): void {
  try {
    localStorage.setItem(HARVEST_ASSIGNMENTS_KEY, JSON.stringify(list));
  } catch {
    /* storage full/blocked — the assignments yield, the UI still shows them */
  }
}

export function loadHarvestRecords(): HarvestRecord[] {
  try {
    const raw = localStorage.getItem(HARVEST_RECORDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as HarvestRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveHarvestRecords(list: HarvestRecord[]): void {
  try {
    localStorage.setItem(HARVEST_RECORDS_KEY, JSON.stringify(list.slice(0, HARVEST_MAX_RECORDS)));
  } catch {
    /* storage full/blocked — the records yield, the run still reports */
  }
}

/** A value becomes a harvest URL ONLY if it parses as a real
 *  http(s) URL (the same gate the Web screen uses, v155). */
export function safeHarvestUrl(text: string): string | null {
  try {
    const u = new URL(text.trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

function excerptOf(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, HARVEST_EXCERPT_CHARS);
}

async function fetchWithTimeout(url: string, timeoutMs = 12000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

/* Run every active assignment, in order, one request at a
 * time with a polite gap. Each attempt writes one record —
 * OK or FAILED — so a blocked source leaves evidence, not
 * silence. The governed raw archive gets the same fetch. */
export async function runHarvestAssignments(
  assignments: HarvestAssignment[],
  onProgress?: (a: HarvestAssignment, index: number, total: number) => void,
): Promise<HarvestRecord[]> {
  const active = assignments.filter((a) => a.active);
  const made: HarvestRecord[] = [];
  for (let i = 0; i < active.length; i += 1) {
    if (i > 0) await new Promise((r) => window.setTimeout(r, HARVEST_GAP_MS));
    const a = active[i];
    onProgress?.(a, i, active.length);
    let host = a.url;
    try {
      host = new URL(a.url).host;
    } catch {
      /* keep the raw URL as the source label */
    }
    try {
      const res = await fetchWithTimeout(a.url);
      const text = await res.text().catch(() => '');
      recordRawArchive(host, a.url, text);
      if (!res.ok) {
        made.push({
          id: `${Date.now()}-${a.id}`,
          assignmentId: a.id,
          principalName: a.principalName,
          sourceName: a.sourceName,
          url: a.url,
          kind: a.kind,
          fetchedAt: Date.now(),
          status: 'FAILED',
          httpStatus: res.status,
          bytes: text.length,
          excerpt: '',
          error: `HTTP ${res.status} — the source answered with an error, nothing was saved.`,
        });
        continue;
      }
      made.push({
        id: `${Date.now()}-${a.id}`,
        assignmentId: a.id,
        principalName: a.principalName,
        sourceName: a.sourceName,
        url: a.url,
        kind: a.kind,
        fetchedAt: Date.now(),
        status: 'OK',
        httpStatus: res.status,
        bytes: text.length,
        excerpt: excerptOf(text),
        error: null,
      });
    } catch {
      made.push({
        id: `${Date.now()}-${a.id}`,
        assignmentId: a.id,
        principalName: a.principalName,
        sourceName: a.sourceName,
        url: a.url,
        kind: a.kind,
        fetchedAt: Date.now(),
        status: 'FAILED',
        httpStatus: null,
        bytes: 0,
        excerpt: '',
        error: 'NETWORK OR CORS — the source did not allow a browser read. It was not bypassed.',
      });
    }
  }
  if (made.length > 0) {
    saveHarvestRecords([...made, ...loadHarvestRecords()]);
  }
  return made;
}

export function loadHarvestAuto(): boolean {
  try {
    return localStorage.getItem(HARVEST_AUTO_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveHarvestAuto(on: boolean): void {
  try {
    localStorage.setItem(HARVEST_AUTO_KEY, on ? 'on' : 'off');
  } catch {
    /* persistence is a nicety — the toggle still applies */
  }
}
