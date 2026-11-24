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
  /** Source-reported 24h pool volume in USD where the source
   * carries it (DEX pools do; lending/staking pools read null —
   * absence, never zero). */
  volumeUsd1d: number | null;
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
        volumeUsd1d: num(raw.volumeUsd1d),
      });
    }
    pools.sort((a, b) => b.tvlUsd - a.tvlUsd);
    const top = pools.slice(0, 10);
    return top.length > 0 ? { value: top, source: 'DefiLlama Yields' } : null;
  });
}

/* DefiLlama protocol index (v190) — the discovery feed for the
 * classification engine. Only the identity fields the classifier
 * uses are carried; no figures are stored in candidates (TVL is
 * read live on surfaces, never copied into a candidate record). */
export interface ProtocolIndexEntry {
  name: string;
  slug: string;
  symbol: string | null;
  category: string | null;
  url: string | null;
  chains: string[];
  github: string | null;
  tokenAddress: string | null;
  /* Evidence fields the source itself carries (v206) — identity
   * and audit evidence only; figures (tvl, mcap) stay out. */
  description: string | null;
  audits: number | null;
  auditLinks: string[];
  parentSlug: string | null;
}

export function fetchProtocolIndex(): Promise<Observation<ProtocolIndexEntry[]>> {
  return governed<ProtocolIndexEntry[]>('protocols:defillama', 600_000, ['DefiLlama Protocols'], async () => {
    const data = await fetchJson('https://api.llama.fi/protocols');
    if (!Array.isArray(data)) return null;
    const out: ProtocolIndexEntry[] = [];
    for (const raw of data as Record<string, unknown>[]) {
      if (!raw || typeof raw.name !== 'string' || typeof raw.slug !== 'string') continue;
      out.push({
        name: raw.name,
        slug: raw.slug,
        symbol: typeof raw.symbol === 'string' && raw.symbol !== '-' ? raw.symbol : null,
        category: typeof raw.category === 'string' ? raw.category : null,
        url: typeof raw.url === 'string' ? raw.url : null,
        chains: Array.isArray(raw.chains) ? (raw.chains as unknown[]).filter((c): c is string => typeof c === 'string') : [],
        github: Array.isArray(raw.github) && typeof raw.github[0] === 'string' ? (raw.github[0] as string) : null,
        tokenAddress: typeof raw.address === 'string' && raw.address.length > 0 ? raw.address : null,
        description: typeof raw.description === 'string' && raw.description.length > 0 ? raw.description : null,
        audits: typeof raw.audits === 'number' ? raw.audits : null,
        auditLinks: Array.isArray(raw.audit_links)
          ? (raw.audit_links as unknown[]).filter((c): c is string => typeof c === 'string')
          : [],
        parentSlug:
          typeof raw.parentProtocolSlug === 'string' && raw.parentProtocolSlug !== raw.slug
            ? raw.parentProtocolSlug
            : null,
      });
    }
    return out.length > 0 ? { value: out, source: 'DefiLlama Protocols' } : null;
  });
}

/* ------------- DEX volumes (DefiLlama overview — keyless) -------------
 * The overview feed reports each DEX's 24h volume AND the prior
 * day's total, so a day-over-day move rests on the source's own
 * pair of observations. Identity + volume observations only. */
export interface DexVolumeEntry {
  name: string;
  slug: string;
  total24h: number;
  prev24h: number | null;
  changePct: number | null;
  chains: string[];
}

export function fetchDexVolumes(): Promise<Observation<DexVolumeEntry[]>> {
  return governed<DexVolumeEntry[]>('dexvolumes:defillama', 600_000, ['DefiLlama DEX Overview'], async () => {
    const data = await fetchJson(
      'https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true',
    );
    const rows = (data as { protocols?: unknown } | null)?.protocols;
    if (!Array.isArray(rows)) return null;
    const out: DexVolumeEntry[] = [];
    for (const raw of rows as Record<string, unknown>[]) {
      if (!raw || typeof raw.name !== 'string' || typeof raw.slug !== 'string') continue;
      const total24h = typeof raw.total24h === 'number' ? raw.total24h : null;
      const prev24h = typeof raw.total48hto24h === 'number' ? raw.total48hto24h : null;
      if (total24h === null) continue;
      out.push({
        name: raw.name,
        slug: raw.slug,
        total24h,
        prev24h,
        changePct: prev24h !== null && prev24h > 0 ? ((total24h - prev24h) / prev24h) * 100 : null,
        chains: Array.isArray(raw.chains)
          ? (raw.chains as unknown[]).filter((c): c is string => typeof c === 'string')
          : [],
      });
    }
    out.sort((a, b) => b.total24h - a.total24h);
    return out.length > 0 ? { value: out, source: 'DefiLlama DEX Overview' } : null;
  });
}

/* ------------- Protocol fees (DefiLlama overview — keyless) -------------
 * Same governed pattern as the DEX overview: the feed reports
 * each protocol's 24h fees AND the prior day's total. Fees are
 * the protocol's own revenue observation — never the platform's
 * or the owner's earnings, and surfaces must say so. */
export interface ProtocolFeesEntry {
  name: string;
  slug: string;
  category: string | null;
  total24h: number;
  prev24h: number | null;
  changePct: number | null;
  chains: string[];
}

export function fetchProtocolFees(): Promise<Observation<ProtocolFeesEntry[]>> {
  return governed<ProtocolFeesEntry[]>('protocolfees:defillama', 600_000, ['DefiLlama Fees Overview'], async () => {
    const data = await fetchJson(
      'https://api.llama.fi/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true',
    );
    const rows = (data as { protocols?: unknown } | null)?.protocols;
    if (!Array.isArray(rows)) return null;
    const out: ProtocolFeesEntry[] = [];
    for (const raw of rows as Record<string, unknown>[]) {
      if (!raw || typeof raw.name !== 'string' || typeof raw.slug !== 'string') continue;
      const total24h = typeof raw.total24h === 'number' ? raw.total24h : null;
      const prev24h = typeof raw.total48hto24h === 'number' ? raw.total48hto24h : null;
      if (total24h === null) continue;
      out.push({
        name: raw.name,
        slug: raw.slug,
        category: typeof raw.category === 'string' ? raw.category : null,
        total24h,
        prev24h,
        changePct: prev24h !== null && prev24h > 0 ? ((total24h - prev24h) / prev24h) * 100 : null,
        chains: Array.isArray(raw.chains)
          ? (raw.chains as unknown[]).filter((c): c is string => typeof c === 'string')
          : [],
      });
    }
    out.sort((a, b) => b.total24h - a.total24h);
    return out.length > 0 ? { value: out, source: 'DefiLlama Fees Overview' } : null;
  });
}

/* ---------------- governance (Snapshot — keyless GraphQL) ------------- */

/** POST sibling of fetchJson — same timeout discipline and the
 * same Raw Archive record, for GraphQL endpoints. */
async function fetchJsonPost(url: string, body: unknown, timeoutMs = 15000): Promise<unknown> {
  if (typeof fetch !== 'function') throw new Error('fetch unavailable');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
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

export interface GovernanceProposal {
  id: string;
  title: string;
  spaceId: string;
  spaceName: string;
  state: string;
  created: number; // epoch seconds, as the source reports
  end: number; // epoch seconds
}

/** Watched Snapshot spaces — every id here was verified against
 * the Snapshot API itself on 2026-11-24 (the space query returned
 * its name). Ids that answered null (aave.eth, makerdao.eth,
 * comp-voting.eth, pendlefinance.eth, optimismgov.eth, …) are
 * EXCLUDED — a watched space is never guessed. */
export const GOVERNANCE_SPACES: { id: string; name: string }[] = [
  { id: 'uniswapgovernance.eth', name: 'Uniswap' },
  { id: 'lido-snapshot.eth', name: 'Lido' },
  { id: 'balancer.eth', name: 'Balancer' },
  { id: 'curve.eth', name: 'Curve Finance' },
  { id: 'ens.eth', name: 'ENS' },
  { id: 'arbitrumfoundation.eth', name: 'Arbitrum DAO' },
  { id: 'safe.eth', name: 'SafeDAO' },
  { id: 'gmx.eth', name: 'GMX' },
];

export function fetchGovernanceProposals(): Promise<Observation<GovernanceProposal[]>> {
  return governed<GovernanceProposal[]>('governance:snapshot', 600_000, ['Snapshot GraphQL'], async () => {
    const query = `{ proposals(first: 30, skip: 0, where: { space_in: [${GOVERNANCE_SPACES.map(
      (s) => `"${s.id}"`,
    ).join(', ')}] }, orderBy: "created", orderDirection: desc) { id title state created end space { id name } } }`;
    const data = await fetchJsonPost('https://hub.snapshot.org/graphql', { query });
    if (!isRecord(data) || !isRecord(data.data) || !Array.isArray(data.data.proposals)) return null;
    const out: GovernanceProposal[] = [];
    for (const raw of data.data.proposals as Record<string, unknown>[]) {
      if (!raw || typeof raw.id !== 'string' || typeof raw.title !== 'string') continue;
      const space = isRecord(raw.space) ? raw.space : {};
      out.push({
        id: raw.id,
        title: raw.title,
        spaceId: typeof space.id === 'string' ? space.id : '',
        spaceName: typeof space.name === 'string' ? space.name : '',
        state: typeof raw.state === 'string' ? raw.state : 'unknown',
        created: typeof raw.created === 'number' ? raw.created : 0,
        end: typeof raw.end === 'number' ? raw.end : 0,
      });
    }
    return out.length > 0 ? { value: out, source: 'Snapshot GraphQL' } : null;
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
