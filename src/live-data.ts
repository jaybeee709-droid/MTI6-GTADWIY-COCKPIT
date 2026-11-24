import { useCallback, useEffect, useRef, useState } from 'react';
import { recordRawArchive } from './raw-archive';

/* Live data + provenance (owner direction 2026-11-23: "Light up live
 * data, build the provenance explorer").
 *
 * Every live figure in the app is an OBSERVATION: a value plus its
 * provenance — which source served it, when it was fetched, whether
 * it is LIVE (just fetched), CACHED (inside its TTL), STALE (last
 * known, refetch failed — never relabelled current) or NO_DATA
 * (nothing has ever been fetched). The provenance explorer is not a
 * separate database: any figure can be tapped to reveal the
 * observation that produced it.
 *
 * Sources are keyless and public, reached directly from the client —
 * no secrets exist in this layer. Chains follow the platform's
 * fallback discipline (the vanilla PriceScout order for prices):
 * first success wins, every failure falls through, and the governor
 * below dedupes in-flight requests and enforces TTLs so no screen
 * can storm a provider.
 */

export type ObsStatus = 'LIVE' | 'CACHED' | 'STALE' | 'NO_DATA';

export interface Observation<T> {
  value: T | null;
  status: ObsStatus;
  /** Provider that served the value, e.g. 'CoinGecko'. Null when NO_DATA. */
  source: string | null;
  /** Epoch ms of the successful fetch. Null when NO_DATA. */
  fetchedAt: number | null;
  /** The fallback chain for this capability, in order. */
  chain: string[];
  note: string;
}

function noData<T>(chain: string[], note: string): Observation<T> {
  return { value: null, status: 'NO_DATA', source: null, fetchedAt: null, chain, note };
}

/* ---------------- session provenance registry ----------------
 * Every observation the governor serves is recorded here, so the
 * provenance explorer can show the whole session in one place: what
 * was fetched, from where, when, and with what status — failures
 * included. Session-only, newest first, one entry per key. */

export interface ProvenanceRecord {
  key: string;
  label: string;
  source: string | null;
  status: ObsStatus;
  fetchedAt: number | null;
  chain: string[];
  recordedAt: number;
}

const provenanceLog: ProvenanceRecord[] = [];
const provenanceListeners = new Set<() => void>();

function labelForKey(key: string): string {
  const [kind, a, b] = key.split(':');
  if (kind === 'price') return `Price · ${a}`;
  if (kind === 'history') return `History · ${a} · ${b}`;
  if (kind === 'yields') return 'Yields · watched pools';
  return key;
}

function recordProvenance<T>(key: string, obs: Observation<T>): void {
  const rec: ProvenanceRecord = {
    key,
    label: labelForKey(key),
    source: obs.source,
    status: obs.status,
    fetchedAt: obs.fetchedAt,
    chain: obs.chain,
    recordedAt: Date.now(),
  };
  const existing = provenanceLog.findIndex((r) => r.key === key);
  if (existing >= 0) provenanceLog.splice(existing, 1);
  provenanceLog.unshift(rec);
  if (provenanceLog.length > 100) provenanceLog.length = 100;
  provenanceListeners.forEach((fn) => fn());
}

export function getProvenanceLog(): ProvenanceRecord[] {
  return [...provenanceLog];
}

export function useProvenanceLog(): ProvenanceRecord[] {
  const [log, setLog] = useState<ProvenanceRecord[]>(() => getProvenanceLog());
  useEffect(() => {
    const fn = () => setLog(getProvenanceLog());
    provenanceListeners.add(fn);
    return () => {
      provenanceListeners.delete(fn);
    };
  }, []);
  return log;
}

/* ---------------- governor ---------------- */

interface CacheEntry {
  value: unknown;
  source: string;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry | null>>();

async function governed<T>(
  key: string,
  ttlMs: number,
  chain: string[],
  fetcher: () => Promise<{ value: T; source: string } | null>,
): Promise<Observation<T>> {
  const hit = cache.get(key) as CacheEntry | undefined;
  if (hit && Date.now() - hit.fetchedAt < ttlMs) {
    const obs: Observation<T> = {
      value: hit.value as T,
      status: 'CACHED',
      source: hit.source,
      fetchedAt: hit.fetchedAt,
      chain,
      note: 'Served from the governor cache inside its TTL.',
    };
    recordProvenance(key, obs);
    return obs;
  }
  let flight = inflight.get(key) as Promise<CacheEntry | null> | undefined;
  if (!flight) {
    flight = (async () => {
      try {
        const result = await fetcher();
        if (result) {
          const entry: CacheEntry = {
            value: result.value,
            source: result.source,
            fetchedAt: Date.now(),
          };
          cache.set(key, entry);
          return entry;
        }
      } catch {
        /* fall through to last-known / NO_DATA */
      }
      return null;
    })();
    inflight.set(key, flight);
    flight.finally(() => inflight.delete(key));
  }
  const entry = await flight;
  if (entry) {
    const obs: Observation<T> = {
      value: entry.value as T,
      status: 'LIVE',
      source: entry.source,
      fetchedAt: entry.fetchedAt,
      chain,
      note: 'Fetched just now from the named source.',
    };
    recordProvenance(key, obs);
    return obs;
  }
  if (hit) {
    const obs: Observation<T> = {
      value: hit.value as T,
      status: 'STALE',
      source: hit.source,
      fetchedAt: hit.fetchedAt,
      chain,
      note: 'Refetch failed — showing the last known value, labelled STALE, never as current.',
    };
    recordProvenance(key, obs);
    return obs;
  }
  const obs = noData<T>(chain, 'Every source in the chain failed or is unreachable. Nothing is invented.');
  recordProvenance(key, obs);
  return obs;
}

/* ---------------- fetch helper ---------------- */

async function fetchJson(url: string, timeoutMs = 12000): Promise<unknown> {
  if (typeof fetch !== 'function') throw new Error('fetch unavailable');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    /* Raw Archive Layer (Fabric Layer 2): every governed fetch
     * is archived as received — source, endpoint, timestamp,
     * bounded payload excerpt — in its own store, never in
     * CockpitDB. recordRawArchive never throws. */
    try {
      recordRawArchive(new URL(url).hostname, url, JSON.stringify(data) ?? '');
    } catch {
      /* archiving yields; the fetch never does */
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/* ---------------- prices ---------------- */

export interface PriceValue {
  price: number;
  change24h: number | null;
}

export const PRICE_CHAIN = ['CoinGecko', 'Coinbase', 'CoinPaprika'];

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  DOGE: 'dogecoin',
  XRP: 'ripple',
  LTC: 'litecoin',
  ADA: 'cardano',
};

const COINPAPRIKA_IDS: Record<string, string> = {
  BTC: 'btc-bitcoin',
  ETH: 'eth-ethereum',
  SOL: 'sol-solana',
  DOGE: 'doge-dogecoin',
  XRP: 'xrp-xrp',
  LTC: 'ltc-litecoin',
  ADA: 'ada-cardano',
};

async function priceFromCoinGecko(sym: string): Promise<PriceValue | null> {
  const id = COINGECKO_IDS[sym];
  if (!id) return null;
  const data = await fetchJson(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`,
  );
  if (!isRecord(data) || !isRecord(data[id])) return null;
  const price = num(data[id].usd);
  if (price === null) return null;
  return { price, change24h: num(data[id].usd_24h_change) };
}

async function priceFromCoinbase(sym: string): Promise<PriceValue | null> {
  const data = await fetchJson(
    `https://api.exchange.coinbase.com/products/${sym}-USD/stats`,
  );
  if (!isRecord(data)) return null;
  const last = num(typeof data.last === 'string' ? Number(data.last) : data.last);
  const open = num(typeof data.open === 'string' ? Number(data.open) : data.open);
  if (last === null) return null;
  return {
    price: last,
    change24h: open !== null && open > 0 ? ((last - open) / open) * 100 : null,
  };
}

async function priceFromCoinPaprika(sym: string): Promise<PriceValue | null> {
  const id = COINPAPRIKA_IDS[sym];
  if (!id) return null;
  const data = await fetchJson(`https://api.coinpaprika.com/v1/tickers/${id}`);
  if (!isRecord(data) || !isRecord(data.quotes) || !isRecord(data.quotes.USD)) return null;
  const price = num(data.quotes.USD.price);
  if (price === null) return null;
  return { price, change24h: num(data.quotes.USD.percent_change_24h) };
}

export function fetchPrice(sym: string): Promise<Observation<PriceValue>> {
  return governed<PriceValue>(`price:${sym}`, 120_000, PRICE_CHAIN, async () => {
    for (const [source, fn] of [
      ['CoinGecko', priceFromCoinGecko],
      ['Coinbase', priceFromCoinbase],
      ['CoinPaprika', priceFromCoinPaprika],
    ] as const) {
      try {
        const value = await fn(sym);
        if (value) return { value, source };
      } catch {
        /* fall through the chain */
      }
    }
    return null;
  });
}

/* ---------------- price history (chart) ---------------- */

export interface HistoryValue {
  points: { t: number; p: number }[];
}

export const HISTORY_CHAIN = ['CoinGecko', 'Coinbase'];

export function fetchHistory(
  sym: string,
  range: '1d' | '7d' | '30d',
): Promise<Observation<HistoryValue>> {
  return governed<HistoryValue>(`history:${sym}:${range}`, 300_000, HISTORY_CHAIN, async () => {
    // CoinGecko market_chart first.
    try {
      const id = COINGECKO_IDS[sym];
      if (id) {
        const days = range === '1d' ? '1' : range === '7d' ? '7' : '30';
        const data = await fetchJson(
          `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`,
        );
        if (isRecord(data) && Array.isArray(data.prices)) {
          const points = data.prices
            .filter((pt): pt is [number, number] => Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number')
            .map(([t, p]) => ({ t, p }));
          if (points.length > 1) return { value: { points }, source: 'CoinGecko' };
        }
      }
    } catch {
      /* fall through */
    }
    // Coinbase candles.
    try {
      const granularity = range === '1d' ? 3600 : range === '7d' ? 21600 : 86400;
      const data = await fetchJson(
        `https://api.exchange.coinbase.com/products/${sym}-USD/candles?granularity=${granularity}`,
      );
      if (Array.isArray(data)) {
        const points = data
          .filter((c): c is number[] => Array.isArray(c) && typeof c[0] === 'number' && typeof c[4] === 'number')
          .map((c) => ({ t: c[0] * 1000, p: c[4] }))
          .sort((a, b) => a.t - b.t);
        if (points.length > 1) return { value: { points }, source: 'Coinbase' };
      }
    } catch {
      /* fall through */
    }
    return null;
  });
}

/* ---------------- yields (DefiLlama — owner's researched chain) ------- */

export interface PoolYield {
  project: string;
  symbol: string;
  chain: string;
  tvlUsd: number;
  /** APY in PERCENT, exactly as the source reports it. Variable, not a promise. */
  apy: number;
}

export const YIELD_CHAIN = ['DefiLlama Yields'];

/** Projects the platform watches (owner's yield research, 2026-11-16).
 *  EigenLayer and Babylon do not appear in this source at all — they
 *  stay NOT_CONNECTED and are never listed here. */
const WATCHED_PROJECTS = new Set([
  'aave-v3',
  'aave-v2',
  'compound-v3',
  'lido',
  'yearn-finance',
  'curve-dex',
  'kamino',
  'uniswap-v3',
]);

export function fetchYields(): Promise<Observation<PoolYield[]>> {
  return governed<PoolYield[]>('yields:defillama', 600_000, YIELD_CHAIN, async () => {
    const data = await fetchJson('https://yields.llama.fi/pools', 30000);
    if (!isRecord(data) || !Array.isArray(data.data)) return null;
    const pools: PoolYield[] = [];
    for (const raw of data.data) {
      if (!isRecord(raw)) continue;
      const project = typeof raw.project === 'string' ? raw.project : '';
      if (!WATCHED_PROJECTS.has(project)) continue;
      const apy = num(raw.apy);
      const tvlUsd = num(raw.tvlUsd);
      if (apy === null || tvlUsd === null) continue;
      pools.push({
        project,
        symbol: typeof raw.symbol === 'string' ? raw.symbol : '—',
        chain: typeof raw.chain === 'string' ? raw.chain : '—',
        tvlUsd,
        apy,
      });
    }
    pools.sort((a, b) => b.tvlUsd - a.tvlUsd);
    const top = pools.slice(0, 10);
    return top.length > 0 ? { value: top, source: 'DefiLlama Yields' } : null;
  });
}

/* ---------------- React hook ---------------- */

export function useObservation<T>(
  load: () => Promise<Observation<T>>,
  deps: unknown[],
): { obs: Observation<T>; refresh: () => void; loading: boolean } {
  const [obs, setObs] = useState<Observation<T>>(() =>
    noData([], 'Not fetched yet.'),
  );
  const [loading, setLoading] = useState(false);
  const loadRef = useRef(load);
  loadRef.current = load;
  const runId = useRef(0);

  const refresh = useCallback(() => {
    const id = ++runId.current;
    setLoading(true);
    loadRef
      .current()
      .then((result) => {
        if (runId.current === id) {
          setObs(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (runId.current === id) setLoading(false);
      });
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { obs, refresh, loading };
}

/* ---------------- formatting ---------------- */

export function fmtUsd(v: number): string {
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: v >= 1 ? 2 : 4,
    maximumFractionDigits: v >= 1 ? 2 : 4,
  });
}

export function fmtTime(epochMs: number | null): string {
  if (epochMs === null) return '—';
  return new Date(epochMs).toLocaleTimeString('en-US', { hour12: false });
}
