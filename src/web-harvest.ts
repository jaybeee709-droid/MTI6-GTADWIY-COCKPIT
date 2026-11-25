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

/* The twelve Scouts, seeded only when the owner has no
 * assignments yet — one per Tribe principal, one source each,
 * covering the platform's registered keyless sources. Every
 * seed URL was verified live from this host (2026-11-25):
 * HTTP 200 with Access-Control-Allow-Origin: *, so a browser
 * read works. NOT seeded, on the same probe: CoinPaprika
 * tickers, GeckoTerminal token price and Beefy vaults all
 * answer 200 with NO CORS header (a browser read is refused
 * — they record FAILED, never silently), and GitHub commits
 * answers 403 from this host (rate-limited). The owner adds
 * any other source through the form — any https URL, any
 * kind. */
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
  {
    principalId: 'tribe-reuben',
    principalName: 'REUBEN',
    sourceName: 'Coinbase ETH Spot',
    url: 'https://api.coinbase.com/v2/prices/ETH-USD/spot',
    kind: 'PRICES',
    active: true,
  },
  {
    principalId: 'tribe-gad',
    principalName: 'GAD',
    sourceName: 'DefiLlama Protocols',
    url: 'https://api.llama.fi/protocols',
    kind: 'OTHER',
    active: true,
  },
  {
    principalId: 'tribe-asher',
    principalName: 'ASHER',
    sourceName: 'DefiLlama Chains',
    url: 'https://api.llama.fi/v2/chains',
    kind: 'OTHER',
    active: true,
  },
  {
    principalId: 'tribe-naphtali',
    principalName: 'NAPHTALI',
    sourceName: 'DefiLlama Stablecoins',
    url: 'https://stablecoins.llama.fi/stablecoins',
    kind: 'PRICES',
    active: true,
  },
  {
    principalId: 'tribe-manasseh',
    principalName: 'MANASSEH',
    sourceName: 'DefiLlama Fees',
    url: 'https://api.llama.fi/overview/fees',
    kind: 'OTHER',
    active: true,
  },
  {
    principalId: 'tribe-simeon',
    principalName: 'SIMEON',
    sourceName: 'Pendle Markets ETH',
    url: 'https://api-v2.pendle.finance/core/v1/1/markets/active',
    kind: 'YIELDS',
    active: true,
  },
  {
    principalId: 'tribe-levi',
    principalName: 'LEVI',
    sourceName: 'Hacker News Top Stories',
    url: 'https://hacker-news.firebaseio.com/v0/topstories.json',
    kind: 'NEWS',
    active: true,
  },
  {
    principalId: 'tribe-joseph',
    principalName: 'JOSEPH',
    sourceName: 'Fear & Greed Index',
    url: 'https://api.alternative.me/fng/',
    kind: 'OTHER',
    active: true,
  },
  {
    principalId: 'tribe-benjamin',
    principalName: 'BENJAMIN',
    sourceName: 'Honeypot.is WETH Check',
    url: 'https://api.honeypot.is/v2/IsHoneypot?address=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2&chainID=1',
    kind: 'OTHER',
    active: true,
  },
  // v236 — camera-discovery Scouts: the ArcGIS portal search
  // for "traffic cameras" is how the next states get found
  // (Texas statewide, Arizona, Pennsylvania, Colorado). The
  // portal search is a public JSON endpoint; if it blocks a
  // browser read it records FAILED honestly, like any other
  // source. What the Scouts bring back is RAW discovery — the
  // services get probed and wired by hand, never auto-trusted.
  {
    principalId: 'tribe-judah',
    principalName: 'JUDAH',
    sourceName: 'ArcGIS portal: traffic cameras Texas',
    url: 'https://www.arcgis.com/sharing/rest/search?q=traffic%20cameras%20Texas&type=Feature%20Service&f=json&num=20',
    kind: 'OTHER',
    active: true,
  },
  {
    principalId: 'tribe-reuben',
    principalName: 'REUBEN',
    sourceName: 'ArcGIS portal: traffic cameras Arizona',
    url: 'https://www.arcgis.com/sharing/rest/search?q=traffic%20cameras%20Arizona&type=Feature%20Service&f=json&num=20',
    kind: 'OTHER',
    active: true,
  },
  {
    principalId: 'tribe-gad',
    principalName: 'GAD',
    sourceName: 'ArcGIS portal: traffic cameras Pennsylvania',
    url: 'https://www.arcgis.com/sharing/rest/search?q=traffic%20cameras%20Pennsylvania&type=Feature%20Service&f=json&num=20',
    kind: 'OTHER',
    active: true,
  },
  {
    principalId: 'tribe-asher',
    principalName: 'ASHER',
    sourceName: 'ArcGIS portal: traffic cameras Colorado',
    url: 'https://www.arcgis.com/sharing/rest/search?q=traffic%20cameras%20Colorado&type=Feature%20Service&f=json&num=20',
    kind: 'OTHER',
    active: true,
  },
];

/** Seed schema version. v229 wrote no version key (treated as 0);
 * v232 adds seeds 4–12. v236 adds seeds 13–16 (camera-discovery
 * Scouts). Bump when the seed list grows again. */
export const HARVEST_SEED_VERSION_KEY = 'mti6_harvest_seed_v1';
export const HARVEST_SEED_VERSION = 3;

function stampHarvestSeedVersion(): void {
  try {
    localStorage.setItem(HARVEST_SEED_VERSION_KEY, String(HARVEST_SEED_VERSION));
  } catch {
    /* storage blocked — the migration simply re-runs next load */
  }
}

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
      stampHarvestSeedVersion();
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const list = parsed as HarvestAssignment[];
    /* v232 migration: devices seeded by v229 hold only seeds 1–3.
     * Append the new seeds (4–12, then 13–16 in v236) once.
     * Seeds 1–3 the owner removed are never re-added, and the
     * owner's own assignments are never touched. */
    const storedVersion = Number(localStorage.getItem(HARVEST_SEED_VERSION_KEY) ?? '0') || 0;
    if (storedVersion < HARVEST_SEED_VERSION) {
      const have = new Set(list.map((a) => a.id));
      const added: HarvestAssignment[] = [];
      SEED_ASSIGNMENTS.forEach((s, i) => {
        if (i < 3) return;
        const id = `harvest-seed-${i + 1}`;
        if (!have.has(id)) added.push({ ...s, id, createdAt: Date.now() });
      });
      stampHarvestSeedVersion();
      if (added.length === 0) return list;
      const merged = [...list, ...added];
      saveHarvestAssignments(merged);
      return merged;
    }
    return list;
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
