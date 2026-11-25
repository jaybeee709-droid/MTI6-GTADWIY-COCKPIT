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

/* Plain-text twin of fetchJson, for endpoints that answer a bare
 * value instead of JSON (Blockstream Esplora's tip height). Same
 * timeout discipline, same archive rule, no JSON assumption. */
async function fetchText(url: string, timeoutMs = 12000): Promise<string> {
  if (typeof fetch !== 'function') throw new Error('fetch unavailable');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'text/plain' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    try {
      recordRawArchive(new URL(url).hostname, url, text.slice(0, 200));
    } catch {
      /* archiving yields; the fetch never does */
    }
    return text;
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

export const PRICE_CHAIN = [
  'CoinGecko', 'Coinbase', 'CoinPaprika',
  'Kraken', 'OKX', 'KuCoin', 'Binance US', 'CoinLore',
  'Bitstamp', 'Bitfinex', 'Gemini', 'Gate.io', 'MEXC', 'Bitget',
  'Blockchain.com',
];

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

/* ---- keyless exchange price leg (v220) ----
 * Web-searched and probed live 2026-11-25 from the build host.
 * Every fetcher below answered its public market endpoint with
 * NO key, NO account, NO sign-in. Two famous names did NOT:
 * Binance (global) returns 451 to US IPs and Bybit 403s behind
 * CloudFront geo-blocking — both recorded in the keyless paper,
 * neither wired. Each fetcher returns null for symbols it does
 * not list, so the chain falls through to the next source. */
function pctFromOpen(last: number | null, open: number | null): number | null {
  if (last === null || open === null || open <= 0) return null;
  return ((last - open) / open) * 100;
}

const KRAKEN_PAIRS: Record<string, string> = {
  BTC: 'XBTUSD', ETH: 'ETHUSD', SOL: 'SOLUSD', XRP: 'XRPUSD',
  DOGE: 'DOGEUSD', LTC: 'LTCUSD', ADA: 'ADAUSD',
};

async function priceFromKraken(sym: string): Promise<PriceValue | null> {
  const pair = KRAKEN_PAIRS[sym];
  if (!pair) return null;
  const data = await fetchJson(`https://api.kraken.com/0/public/Ticker?pair=${pair}`);
  if (!isRecord(data) || !isRecord(data.result)) return null;
  const first = Object.values(data.result)[0];
  if (!isRecord(first) || !Array.isArray(first.c)) return null;
  const last = num(typeof first.c[0] === 'string' ? Number(first.c[0]) : first.c[0]);
  const open = num(typeof first.o === 'string' ? Number(first.o) : first.o);
  if (last === null) return null;
  return { price: last, change24h: pctFromOpen(last, open) };
}

async function priceFromOkx(sym: string): Promise<PriceValue | null> {
  const data = await fetchJson(`https://www.okx.com/api/v5/market/ticker?instId=${sym}-USDT`);
  if (!isRecord(data) || !Array.isArray(data.data) || !isRecord(data.data[0])) return null;
  const row = data.data[0];
  const last = num(typeof row.last === 'string' ? Number(row.last) : row.last);
  const open = num(typeof row.open24h === 'string' ? Number(row.open24h) : row.open24h);
  if (last === null) return null;
  return { price: last, change24h: pctFromOpen(last, open) };
}

async function priceFromKuCoin(sym: string): Promise<PriceValue | null> {
  const data = await fetchJson(`https://api.kucoin.com/api/v1/market/stats?symbol=${sym}-USDT`);
  if (isRecord(data) && isRecord(data.data)) {
    const row = data.data;
    const last = num(typeof row.last === 'string' ? Number(row.last) : row.last);
    const rate = num(typeof row.changeRate === 'string' ? Number(row.changeRate) : row.changeRate);
    if (last !== null) return { price: last, change24h: rate === null ? null : rate * 100 };
  }
  /* Stats is the strictest endpoint in the chain (it 429s under
   * load); the lighter level-1 book answers the same price when
   * stats is throttled, with no 24h change attached. */
  const book = await fetchJson(`https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${sym}-USDT`);
  if (!isRecord(book) || !isRecord(book.data)) return null;
  const price = num(typeof book.data.price === 'string' ? Number(book.data.price) : book.data.price);
  if (price === null) return null;
  return { price, change24h: null };
}

async function priceFromBinanceUs(sym: string): Promise<PriceValue | null> {
  const data = await fetchJson(`https://api.binance.us/api/v3/ticker/24hr?symbol=${sym}USDT`);
  if (!isRecord(data)) return null;
  const last = num(typeof data.lastPrice === 'string' ? Number(data.lastPrice) : data.lastPrice);
  const pct = num(typeof data.priceChangePercent === 'string' ? Number(data.priceChangePercent) : data.priceChangePercent);
  if (last === null) return null;
  return { price: last, change24h: pct };
}

const COINLORE_IDS: Record<string, string> = {
  BTC: '90', ETH: '80', SOL: '48543', XRP: '58', DOGE: '2', ADA: '257',
};

async function priceFromCoinLore(sym: string): Promise<PriceValue | null> {
  const id = COINLORE_IDS[sym];
  if (!id) return null;
  const data = await fetchJson(`https://api.coinlore.net/api/ticker/?id=${id}`);
  if (!Array.isArray(data) || !isRecord(data[0])) return null;
  const row = data[0];
  const price = num(typeof row.price_usd === 'string' ? Number(row.price_usd) : row.price_usd);
  const pct = num(typeof row.percent_change_24h === 'string' ? Number(row.percent_change_24h) : row.percent_change_24h);
  if (price === null) return null;
  return { price, change24h: pct };
}

async function priceFromBitstamp(sym: string): Promise<PriceValue | null> {
  const data = await fetchJson(`https://www.bitstamp.net/api/v2/ticker/${sym.toLowerCase()}usd`);
  if (!isRecord(data)) return null;
  const last = num(typeof data.last === 'string' ? Number(data.last) : data.last);
  const open = num(typeof data.open === 'string' ? Number(data.open) : data.open);
  if (last === null) return null;
  return { price: last, change24h: pctFromOpen(last, open) };
}

async function priceFromBitfinex(sym: string): Promise<PriceValue | null> {
  const data = await fetchJson(`https://api-pub.bitfinex.com/v2/ticker/t${sym}USD`);
  if (!Array.isArray(data) || data.length < 7) return null;
  const last = num(data[6]);
  const dailyFrac = num(data[5]);
  if (last === null) return null;
  return { price: last, change24h: dailyFrac === null ? null : dailyFrac * 100 };
}

async function priceFromGemini(sym: string): Promise<PriceValue | null> {
  const data = await fetchJson(`https://api.gemini.com/v1/pubticker/${sym.toLowerCase()}usd`);
  if (!isRecord(data)) return null;
  const last = num(typeof data.last === 'string' ? Number(data.last) : data.last);
  if (last === null) return null;
  return { price: last, change24h: null };
}

async function priceFromGateIo(sym: string): Promise<PriceValue | null> {
  const data = await fetchJson(`https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${sym}_USDT`);
  if (!Array.isArray(data) || !isRecord(data[0])) return null;
  const row = data[0];
  const last = num(typeof row.last === 'string' ? Number(row.last) : row.last);
  const pct = num(typeof row.change_percentage === 'string' ? Number(row.change_percentage) : row.change_percentage);
  if (last === null) return null;
  return { price: last, change24h: pct };
}

async function priceFromMexc(sym: string): Promise<PriceValue | null> {
  const data = await fetchJson(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${sym}USDT`);
  if (!isRecord(data)) return null;
  const last = num(typeof data.lastPrice === 'string' ? Number(data.lastPrice) : data.lastPrice);
  const pct = num(typeof data.priceChangePercent === 'string' ? Number(data.priceChangePercent) : data.priceChangePercent);
  if (last === null) return null;
  return { price: last, change24h: pct };
}

async function priceFromBitget(sym: string): Promise<PriceValue | null> {
  const data = await fetchJson(`https://api.bitget.com/api/v2/spot/market/tickers?symbol=${sym}USDT`);
  if (!isRecord(data) || !Array.isArray(data.data) || !isRecord(data.data[0])) return null;
  const row = data.data[0];
  const last = num(typeof row.lastPr === 'string' ? Number(row.lastPr) : row.lastPr);
  const open = num(typeof row.open === 'string' ? Number(row.open) : row.open);
  if (last === null) return null;
  return { price: last, change24h: pctFromOpen(last, open) };
}

async function priceFromBlockchainCom(sym: string): Promise<PriceValue | null> {
  if (sym !== 'BTC') return null;
  const data = await fetchJson('https://blockchain.info/ticker');
  if (!isRecord(data) || !isRecord(data.USD)) return null;
  const last = num(data.USD.last);
  if (last === null) return null;
  return { price: last, change24h: null };
}

/* Testable map of the whole keyless price leg: the node probe
 * calls each source directly for BTC so a broken parser is
 * caught even when CoinGecko answers first in the live chain. */
export const KEYLESS_PRICE_SOURCES: Record<string, (sym: string) => Promise<PriceValue | null>> = {
  CoinGecko: priceFromCoinGecko,
  Coinbase: priceFromCoinbase,
  CoinPaprika: priceFromCoinPaprika,
  Kraken: priceFromKraken,
  OKX: priceFromOkx,
  KuCoin: priceFromKuCoin,
  'Binance US': priceFromBinanceUs,
  CoinLore: priceFromCoinLore,
  Bitstamp: priceFromBitstamp,
  Bitfinex: priceFromBitfinex,
  Gemini: priceFromGemini,
  'Gate.io': priceFromGateIo,
  MEXC: priceFromMexc,
  Bitget: priceFromBitget,
  'Blockchain.com': priceFromBlockchainCom,
};

export function fetchPrice(sym: string): Promise<Observation<PriceValue>> {
  return governed<PriceValue>(`price:${sym}`, 120_000, PRICE_CHAIN, async () => {
    for (const [source, fn] of Object.entries(KEYLESS_PRICE_SOURCES)) {
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

/* ------------- DEX pair intel + Bitcoin chain (keyless — v220) --------
 * DexScreener (pair discovery: top pool by liquidity, pair count)
 * and GeckoTerminal (independent token-price cross-check) both
 * answer keyless, probed live 2026-11-25. Blockstream Esplora
 * answers the Bitcoin tip height as plain text — hence the
 * fetchText helper next to fetchJson. These are intelligence
 * observations: the executor attaches pair intel to its dry-run
 * decisions, and the radar reads the tip as chain health. */
export interface DexPairIntel {
  chainId: string;
  dexId: string;
  pairAddress: string;
  priceUsd: number | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  pairCount: number;
}

export function fetchDexPairIntel(address: string): Promise<Observation<DexPairIntel>> {
  return governed<DexPairIntel>(`pairintel:dexscreener:${address.toLowerCase()}`, 120_000, ['DexScreener'], async () => {
    const data = await fetchJson(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    if (!isRecord(data) || !Array.isArray(data.pairs) || data.pairs.length === 0) return null;
    const rows = (data.pairs as Record<string, unknown>[]).filter((r) => isRecord(r));
    rows.sort((a, b) => {
      const la = isRecord(a.liquidity) ? num(a.liquidity.usd) ?? 0 : 0;
      const lb = isRecord(b.liquidity) ? num(b.liquidity.usd) ?? 0 : 0;
      return lb - la;
    });
    const top = rows[0];
    if (!isRecord(top)) return null;
    const vol = isRecord(top.volume) ? num(top.volume.h24) : null;
    const liq = isRecord(top.liquidity) ? num(top.liquidity.usd) : null;
    const price = num(typeof top.priceUsd === 'string' ? Number(top.priceUsd) : top.priceUsd);
    return {
      value: {
        chainId: typeof top.chainId === 'string' ? top.chainId : 'unknown',
        dexId: typeof top.dexId === 'string' ? top.dexId : 'unknown',
        pairAddress: typeof top.pairAddress === 'string' ? top.pairAddress : '',
        priceUsd: price,
        liquidityUsd: liq,
        volume24h: vol,
        pairCount: rows.length,
      },
      source: 'DexScreener',
    };
  });
}

export function fetchGeckoTerminalPrice(address: string): Promise<Observation<{ priceUsd: number }>> {
  return governed<{ priceUsd: number }>(`geckoterminal:${address.toLowerCase()}`, 120_000, ['GeckoTerminal'], async () => {
    const data = await fetchJson(
      `https://api.geckoterminal.com/api/v2/simple/networks/eth/token_price/${address.toLowerCase()}`,
    );
    if (!isRecord(data) || !isRecord(data.data) || !isRecord(data.data.attributes)) return null;
    const prices = data.data.attributes.token_prices;
    if (!isRecord(prices)) return null;
    const raw = prices[address.toLowerCase()];
    const price = num(typeof raw === 'string' ? Number(raw) : raw);
    if (price === null) return null;
    return { value: { priceUsd: price }, source: 'GeckoTerminal' };
  });
}

export function fetchBitcoinTip(): Promise<Observation<{ height: number }>> {
  return governed<{ height: number }>('btc:tip:blockstream', 120_000, ['Blockstream Esplora'], async () => {
    const text = await fetchText('https://blockstream.info/api/blocks/tip/height');
    const height = Number(text.trim());
    if (!Number.isInteger(height) || height <= 0) return null;
    return { value: { height }, source: 'Blockstream Esplora' };
  });
}

/* ------------- category intelligence (keyless — v221) --------------
 * The advisor's category map, filtered by the owner's own
 * discipline: maximum UNIQUE intelligence per source. Each
 * fetcher below is the strongest keyless source in its
 * category, probed live 2026-11-25 — one per dimension, not
 * one per vendor. What did NOT survive probing is recorded
 * in the keyless paper, not wired: Aave (404), Compound
 * (unreachable), Morpho (unreachable), Yearn (unreachable),
 * Flashbots relay (404/405 on both hosts), Lens (Cloudflare
 * 525), Farcaster hub (unreachable), LlamaRPC + PublicNode
 * ETH (Cloudflare 525/403), dYdX indexer (404), GitHub raw
 * API (shared-IP rate limit — the connected GitHub connector
 * is the route for repo intelligence). Aevo, GMX, Wormhole,
 * Kalshi and Beefy all ANSWER keyless and are recorded as
 * verified-live alternates in the paper; they duplicate a
 * dimension the wired source already covers, so they are not
 * a second feed for the same signal. */
export interface StablecoinObs {
  symbol: string;
  name: string;
  price: number | null;
  circulatingUsd: number | null;
  pegDeviationPct: number | null;
}

export function fetchStablecoins(): Promise<Observation<StablecoinObs[]>> {
  return governed<StablecoinObs[]>('stablecoins:defillama', 600_000, ['DefiLlama Stablecoins'], async () => {
    const data = await fetchJson('https://stablecoins.llama.fi/stablecoins?includePrices=true');
    if (!isRecord(data) || !Array.isArray(data.peggedAssets)) return null;
    const out: StablecoinObs[] = [];
    for (const raw of data.peggedAssets as Record<string, unknown>[]) {
      if (!isRecord(raw) || typeof raw.symbol !== 'string') continue;
      const price = num(typeof raw.price === 'number' ? raw.price : null);
      /* circulating is keyed by peg type ({peggedUSD: n}),
       * not a bare number — the v221 probe caught the first
       * parser reading it as a number and dropping every row. */
      const circObj = isRecord(raw.circulating) ? raw.circulating : null;
      const circ =
        circObj && typeof circObj.peggedUSD === 'number'
          ? circObj.peggedUSD
          : circObj
            ? Object.values(circObj).find((v): v is number => typeof v === 'number') ?? null
            : null;
      if (circ === null || circ <= 0) continue;
      out.push({
        symbol: raw.symbol,
        name: typeof raw.name === 'string' ? raw.name : raw.symbol,
        price,
        circulatingUsd: circ,
        pegDeviationPct: price === null ? null : (price - 1) * 100,
      });
    }
    out.sort((a, b) => (b.circulatingUsd ?? 0) - (a.circulatingUsd ?? 0));
    const top = out.slice(0, 12);
    return top.length > 0 ? { value: top, source: 'DefiLlama Stablecoins' } : null;
  });
}

export interface PerpFundingObs {
  coin: string;
  fundingPct8h: number;
  markPrice: number | null;
  openInterest: number | null;
}

export function fetchPerpFunding(): Promise<Observation<PerpFundingObs[]>> {
  return governed<PerpFundingObs[]>('perpfunding:hyperliquid', 120_000, ['Hyperliquid'], async () => {
    const data = await fetchJsonPost('https://api.hyperliquid.xyz/info', { type: 'metaAndAssetCtxs' });
    if (!Array.isArray(data) || data.length < 2) return null;
    const meta = data[0] as { universe?: unknown };
    const ctxs = data[1] as unknown;
    if (!isRecord(meta) || !Array.isArray(meta.universe) || !Array.isArray(ctxs)) return null;
    const out: PerpFundingObs[] = [];
    meta.universe.forEach((u, i) => {
      if (!isRecord(u) || typeof u.name !== 'string') return;
      const ctx = ctxs[i];
      if (!isRecord(ctx)) return;
      const funding = num(typeof ctx.funding === 'string' ? Number(ctx.funding) : ctx.funding);
      if (funding === null) return;
      out.push({
        coin: u.name,
        fundingPct8h: funding * 100,
        markPrice: num(typeof ctx.markPx === 'string' ? Number(ctx.markPx) : ctx.markPx),
        openInterest: num(typeof ctx.openInterest === 'string' ? Number(ctx.openInterest) : ctx.openInterest),
      });
    });
    out.sort((a, b) => Math.abs(b.fundingPct8h) - Math.abs(a.fundingPct8h));
    return out.length > 0 ? { value: out.slice(0, 20), source: 'Hyperliquid' } : null;
  });
}

export interface PendleMarketObs {
  chainId: number;
  address: string;
  name: string;
  impliedApy: number | null;
  expiry: string | null;
}

export function fetchPendleMarkets(chainId: 1 | 8453): Promise<Observation<PendleMarketObs[]>> {
  return governed<PendleMarketObs[]>(`pendle:${chainId}`, 600_000, ['Pendle'], async () => {
    const data = await fetchJson(`https://api-v2.pendle.finance/core/v1/${chainId}/markets/active`);
    if (!isRecord(data) || !Array.isArray(data.markets)) return null;
    const out: PendleMarketObs[] = [];
    for (const raw of data.markets as Record<string, unknown>[]) {
      if (!isRecord(raw) || typeof raw.address !== 'string') continue;
      /* Implied APY lives under details.impliedApy (decimal),
       * not a top-level field — the v221 probe caught the
       * first parser reading a field that does not exist. */
      const details = isRecord(raw.details) ? raw.details : null;
      const apy = details ? num(typeof details.impliedApy === 'number' ? details.impliedApy : null) : null;
      out.push({
        chainId,
        address: raw.address,
        name: typeof raw.name === 'string' ? raw.name : raw.address.slice(0, 10),
        impliedApy: apy === null ? null : apy * 100,
        expiry: typeof raw.expiry === 'string' ? raw.expiry : null,
      });
    }
    out.sort((a, b) => (b.impliedApy ?? 0) - (a.impliedApy ?? 0));
    return out.length > 0 ? { value: out.slice(0, 20), source: 'Pendle' } : null;
  });
}

export interface BridgeFeeObs {
  fromChain: string;
  toChain: string;
  token: string;
  amountUsd: number;
  feeUsd: number | null;
  outputUsd: number | null;
  fillTimeSec: number | null;
}

const BRIDGE_USDC_ETH = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const BRIDGE_USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

/** Across bridge fee for the desk's own funding leg: $50 USDC
 * Ethereum → Base. The amount is Daniel's $50 start — the fee
 * is quoted on exactly the move he would make, not a generic
 * $1,000 example. */
export function fetchBridgeFee(): Promise<Observation<BridgeFeeObs>> {
  return governed<BridgeFeeObs>('bridge:across:usdc-eth-base-50', 120_000, ['Across'], async () => {
    const data = await fetchJson(
      `https://app.across.to/api/suggested-fees?inputToken=${BRIDGE_USDC_ETH}&outputToken=${BRIDGE_USDC_BASE}&originChainId=1&destinationChainId=8453&amount=50000000`,
    );
    if (!isRecord(data)) return null;
    /* The API's own total (totalRelayFee.total) is the fee —
     * summing the parts duplicated it in the first parser.
     * A response that parses to no fee and no output is
     * NO_DATA, not a value full of nulls. */
    const total = isRecord(data.totalRelayFee) ? data.totalRelayFee : null;
    const feeRaw = num(total && typeof total.total === 'string' ? Number(total.total) : total?.total);
    const output = num(typeof data.outputAmount === 'string' ? Number(data.outputAmount) : data.outputAmount);
    const fill = num(typeof data.estimatedFillTimeSec === 'number' ? data.estimatedFillTimeSec : null);
    if (feeRaw === null && output === null) return null;
    return {
      value: {
        fromChain: 'Ethereum',
        toChain: 'Base',
        token: 'USDC',
        amountUsd: 50,
        feeUsd: feeRaw === null ? null : feeRaw / 1e6,
        outputUsd: output === null ? null : output / 1e6,
        fillTimeSec: fill,
      },
      source: 'Across',
    };
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
 * Velora joined v220 (ParaSwap's successor host, live on both
 * networks 2026-11-25). A quote is an observation, never a
 * trade: nothing here signs, broadcasts, or settles anything. */
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
  /* Base leg: Paraswap + KyberSwap probed LIVE on Base
   * 2026-11-24 (100 USDbC -> ~0.05986 WETH from both, agreeing).
   * CoW's Base endpoint returned EMPTY on the first probe
   * (2026-11-24) but answered LIVE on re-probe the same night
   * (v215: 100 USDbC -> 0.0601452 WETH, eip712 shape) — CoW
   * joins the Base chain. LI.FI re-probed the same night:
   * still 429 code 1005 at first contact — stays excluded.
   * Velora (v220): ParaSwap's successor host (api.velora.xyz),
   * probed LIVE 2026-11-25 on BOTH networks with real
   * priceRoutes — joins as the 4th lane. OpenOcean answered
   * 400 to the documented shape twice and Odos 530s behind
   * Cloudflare from this host; neither joins the chain. */
  const chain = ['Paraswap', 'KyberSwap Aggregator', 'CoW Swap', 'Velora'];
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
      try {
        const addr = fromAddress ?? '0x0000000000000000000000000000000000000000';
        const j = (await fetchJsonPost(`https://api.cow.fi/${network === 'base' ? 'base' : 'mainnet'}/api/v1/quote`, {
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
      } catch { /* fall through to Velora */ }
      try {
        const j = (await fetchJson(
          `https://api.velora.xyz/prices?srcToken=${from.address}&destToken=${to.address}&amount=${fromAmountRaw}&network=${network === 'base' ? 8453 : 1}`,
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
            source: 'Velora',
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
