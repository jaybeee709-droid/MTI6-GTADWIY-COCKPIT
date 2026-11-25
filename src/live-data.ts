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

/* ------------- exact decimal helpers (BigInt — no float money) ------- */
export function rawFromHuman(amount: string, decimals: number): string | null {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(amount.trim());
  if (!m) return null;
  const fracIn = m[2] ?? '';
  if (fracIn.length > decimals && /[^0]/.test(fracIn.slice(decimals))) return null;
  const frac = fracIn.padEnd(decimals, '0').slice(0, decimals);
  const raw = BigInt(m[1]) * 10n ** BigInt(decimals) + BigInt(frac === '' ? '0' : frac);
  return raw > 0n ? raw.toString() : null;
}

export function humanFromRaw(raw: string, decimals: number, maxFrac = 6): string {
  let v: bigint;
  try { v = BigInt(raw); } catch { return '0'; }
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const rem = v % base;
  if (rem === 0n) return whole.toString();
  let frac = rem.toString().padStart(decimals, '0').replace(/0+$/, '');
  if (frac.length > maxFrac) frac = frac.slice(0, maxFrac);
  return `${whole}.${frac}`;
}

/* ------------- DEX swap quotes (keyless aggregators — v210) ------------
 * The Swap Desk's quote chain, probed live 2026-11-24:
 * Paraswap, KyberSwap Aggregator and CoW Swap all answer
 * keyless with real quotes (LI.FI's keyless tier was rate-
 * limited at first contact — excluded until it earns a place).
 * A quote is an observation, never a trade: nothing here
 * signs, broadcasts, or settles anything. */
export interface SwapQuoteToken {
  address: string;
  symbol: string;
  decimals: number;
}

export interface SwapQuote {
  fromSymbol: string;
  toSymbol: string;
  fromAmountRaw: string;
  toAmountRaw: string;
  toAmount: string;
  gasCostUsd: number | null;
  validTo: number | null;
}

export function fetchSwapQuote(
  from: SwapQuoteToken,
  to: SwapQuoteToken,
  fromAmountRaw: string,
  fromAddress?: string,
  network: 'ethereum' | 'base' = 'ethereum',
): Promise<Observation<SwapQuote>> {
  /* Base leg (v213): Paraswap + KyberSwap probed LIVE on Base
   * 2026-11-24 (100 USDbC -> ~0.05986 WETH from both, agreeing).
   * CoW's Base endpoint did not answer the probe — CoW stays
   * in the Ethereum chain only, where it was proven. */
  const chain =
    network === 'base' ? ['Paraswap', 'KyberSwap Aggregator'] : ['Paraswap', 'KyberSwap Aggregator', 'CoW Swap'];
  return governed<SwapQuote>(
    `swapquote:${network}:${from.address.toLowerCase()}:${to.address.toLowerCase()}:${fromAmountRaw}`,
    30_000,
    chain,
    async () => {
      try {
        const j = (await fetchJson(
          `https://api.paraswap.io/prices?srcToken=${from.address}&destToken=${to.address}&amount=${fromAmountRaw}&srcDecimals=${from.decimals}&destDecimals=${to.decimals}&side=SELL&network=${network === 'base' ? 8453 : 1}`,
        )) as { priceRoute?: { destAmount?: unknown; gasCostUSD?: unknown } } | null;
        const pr = j?.priceRoute;
        if (pr && typeof pr.destAmount === 'string') {
          return {
            value: {
              fromSymbol: from.symbol, toSymbol: to.symbol, fromAmountRaw,
              toAmountRaw: pr.destAmount,
              toAmount: humanFromRaw(pr.destAmount, to.decimals),
              gasCostUsd: pr.gasCostUSD ? Number(pr.gasCostUSD) : null,
              validTo: null,
            },
            source: 'Paraswap',
          };
        }
      } catch { /* fall through to the next source */ }
      try {
        const j = (await fetchJson(
          `https://aggregator-api.kyberswap.com/${network}/api/v1/routes?tokenIn=${from.address}&tokenOut=${to.address}&amountIn=${fromAmountRaw}`,
        )) as { data?: { routeSummary?: { amountOut?: unknown; gasUsd?: unknown } } } | null;
        const rs = j?.data?.routeSummary;
        if (rs && typeof rs.amountOut === 'string') {
          return {
            value: {
              fromSymbol: from.symbol, toSymbol: to.symbol, fromAmountRaw,
              toAmountRaw: rs.amountOut,
              toAmount: humanFromRaw(rs.amountOut, to.decimals),
              gasCostUsd: rs.gasUsd ? Number(rs.gasUsd) : null,
              validTo: null,
            },
            source: 'KyberSwap Aggregator',
          };
        }
      } catch { /* fall through to the next source */ }
      if (network === 'base') return null;
      try {
        const addr = fromAddress ?? '0x0000000000000000000000000000000000000000';
        const j = (await fetchJsonPost('https://api.cow.fi/mainnet/api/v1/quote', {
          sellToken: from.address, buyToken: to.address, from: addr, receiver: addr,
          sellAmountBeforeFee: fromAmountRaw, kind: 'sell', signingScheme: 'eip712',
        })) as { quote?: { buyAmount?: unknown; validTo?: unknown } } | null;
        const q = j?.quote;
        if (q && typeof q.buyAmount === 'string') {
          return {
            value: {
              fromSymbol: from.symbol, toSymbol: to.symbol, fromAmountRaw,
              toAmountRaw: q.buyAmount,
              toAmount: humanFromRaw(q.buyAmount, to.decimals),
              gasCostUsd: null,
              validTo: typeof q.validTo === 'number' ? q.validTo : null,
            },
            source: 'CoW Swap',
          };
        }
      } catch { /* no source answered */ }
      return null;
    },
  );
}

/* ------------- address balances (Blockscout — keyless, read-only) ----- */
export interface AddressBalances {
  eth: string | null;
  tokens: { symbol: string; address: string; amount: string; decimals: number }[];
}

export function fetchAddressBalances(
  address: string,
  network: 'ethereum' | 'base' = 'ethereum',
  baseTokens: { symbol: string; address: string; decimals: number }[] = [],
): Promise<Observation<AddressBalances>> {
  if (network === 'base') {
    /* Base balances via public JSON-RPC (v213): Blockscout
     * Base was bot-walled from the probe host, while the Base
     * RPC endpoints answered every call live 2026-11-24
     * (eth_blockNumber / eth_call / eth_getBalance). Native
     * balance + balanceOf for the desk's Base tokens only;
     * zero balances are not holdings and are not listed. */
    return governed<AddressBalances>(`balances:baserpc:${address.toLowerCase()}`, 120_000, ['Base RPC'], async () => {
      const rpc = async (method: string, params: unknown[]): Promise<string | null> => {
        for (const url of ['https://mainnet.base.org', 'https://base-rpc.publicnode.com']) {
          try {
            const j = (await fetchJsonPost(url, { jsonrpc: '2.0', id: 1, method, params })) as { result?: unknown } | null;
            if (j && typeof j.result === 'string') return j.result;
          } catch { /* try the next endpoint */ }
        }
        return null;
      };
      const balHex = await rpc('eth_getBalance', [address, 'latest']);
      let eth: string | null = null;
      if (balHex) {
        try { eth = humanFromRaw(BigInt(balHex).toString(), 18); } catch { eth = null; }
      }
      const tokens: AddressBalances['tokens'] = [];
      const padded = address.toLowerCase().replace('0x', '').padStart(64, '0');
      for (const t of baseTokens) {
        const r = await rpc('eth_call', [{ to: t.address, data: `0x70a08231${padded}` }, 'latest']);
        if (!r) continue;
        try {
          const raw = BigInt(r);
          if (raw === 0n) continue;
          tokens.push({ symbol: t.symbol, address: t.address, amount: humanFromRaw(raw.toString(), t.decimals), decimals: t.decimals });
        } catch { /* an unreadable balance is skipped, never guessed */ }
      }
      if (eth === null && tokens.length === 0) return null;
      return { value: { eth, tokens }, source: 'Base RPC (public)' };
    });
  }
  return governed<AddressBalances>(`balances:blockscout:${address.toLowerCase()}`, 120_000, ['Blockscout'], async () => {
    const info = (await fetchJson(`https://eth.blockscout.com/api/v2/addresses/${address}`)) as
      { coin_balance?: unknown } | null;
    const eth = info && typeof info.coin_balance === 'string' ? humanFromRaw(info.coin_balance, 18) : null;
    const tokens: AddressBalances['tokens'] = [];
    try {
      const tb = (await fetchJson(`https://eth.blockscout.com/api/v2/addresses/${address}/token-balances`)) as unknown;
      if (Array.isArray(tb)) {
        for (const it of tb as { token?: { symbol?: unknown; decimals?: unknown; address_hash?: unknown; address?: unknown }; value?: unknown }[]) {
          const t = it?.token;
          const dec = Number(t?.decimals);
          if (!t || typeof t.symbol !== 'string' || typeof it.value !== 'string' || !Number.isFinite(dec)) continue;
          tokens.push({
            symbol: t.symbol,
            address: String(t.address_hash ?? t.address ?? ''),
            amount: humanFromRaw(it.value, dec),
            decimals: dec,
          });
        }
      }
    } catch { /* the token list is unavailable; the ETH balance still stands */ }
    if (eth === null && tokens.length === 0) return null;
    return { value: { eth, tokens }, source: 'Blockscout' };
  });
}

/* ------------- token safety (Honeypot.is — keyless) -------------------
 * The Swap Desk's pre-sign security gate source, probed live
 * 2026-11-24. Simulates a buy/sell against the token and
 * reports honeypot status + taxes + a risk summary. A safety
 * observation, not a guarantee — the desk refuses a handoff
 * only on a positive honeypot flag, and shows the rest. */
export interface HoneypotCheck {
  isHoneypot: boolean;
  risk: string | null;
  buyTax: number | null;
  sellTax: number | null;
}

export function fetchHoneypotCheck(address: string, chainId = 1): Promise<Observation<HoneypotCheck>> {
  return governed<HoneypotCheck>(`honeypot:${chainId}:${address.toLowerCase()}`, 600_000, ['Honeypot.is'], async () => {
    const j = (await fetchJson(`https://api.honeypot.is/v2/IsHoneypot?address=${address}&chainID=${chainId}`)) as {
      honeypotResult?: { isHoneypot?: unknown };
      summary?: { risk?: unknown };
      simulationResult?: { buyTax?: unknown; sellTax?: unknown };
    } | null;
    const hp = j?.honeypotResult?.isHoneypot;
    if (typeof hp !== 'boolean') return null;
    return {
      value: {
        isHoneypot: hp,
        risk: typeof j?.summary?.risk === 'string' ? j.summary.risk : null,
        buyTax: typeof j?.simulationResult?.buyTax === 'number' ? j.simulationResult.buyTax : null,
        sellTax: typeof j?.simulationResult?.sellTax === 'number' ? j.simulationResult.sellTax : null,
      },
      source: 'Honeypot.is',
    };
  });
}

/* ------------- weather (Open-Meteo — keyless, probed 2026-11-24) ------ */
export interface WeatherNow {
  tempF: number;
  feelsF: number | null;
  humidity: number | null;
  windMph: number | null;
  code: number;
  highF: number | null;
  lowF: number | null;
}

export function fetchWeather(lat: number, lon: number): Promise<Observation<WeatherNow>> {
  return governed<WeatherNow>(`weather:openmeteo:${lat},${lon}`, 600_000, ['Open-Meteo'], async () => {
    const j = (await fetchJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=1`,
    )) as {
      current?: { temperature_2m?: unknown; apparent_temperature?: unknown; relative_humidity_2m?: unknown; wind_speed_10m?: unknown; weather_code?: unknown };
      daily?: { temperature_2m_max?: unknown[]; temperature_2m_min?: unknown[] };
    } | null;
    const c = j?.current;
    if (!c || typeof c.temperature_2m !== 'number' || typeof c.weather_code !== 'number') return null;
    const num = (v: unknown): number | null => (typeof v === 'number' ? v : null);
    return {
      value: {
        tempF: c.temperature_2m,
        feelsF: num(c.apparent_temperature),
        humidity: num(c.relative_humidity_2m),
        windMph: num(c.wind_speed_10m),
        code: c.weather_code,
        highF: num(j?.daily?.temperature_2m_max?.[0]),
        lowF: num(j?.daily?.temperature_2m_min?.[0]),
      },
      source: 'Open-Meteo',
    };
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
