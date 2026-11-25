/* MTI6 Swap Desk (v210) — the wallet leg of the execution
 * track, opened by the owner's decisions D1 (YES, 2026-11-24)
 * and D2 (FINAL: DEX only, no KYC venue, owner signs in his
 * own wallet — re-decided 2026-11-24 after the anonymity
 * correction). Base leg added v213 (owner's $50 strategy:
 * fees are the binding constraint at that size).
 *
 * What this module is: the PREPARE end of the ladder.
 *   - A read-only watch wallet (a public address — public by
 *     design, never a key, never a seed) with balances read
 *     from Blockscout.
 *   - Real DEX quotes through the governed aggregator chain
 *     (Paraswap → KyberSwap → CoW Swap → Velora, all keyless).
 *   - Prepared swap records: a pair, an amount, and the quote
 *     observed at preparation time, born PREPARED, advanced
 *     only by the owner's own approval tap to OWNER_APPROVED.
 *
 * What it never does: sign, broadcast, settle, hold keys, or
 * touch funds. Signing happens in Daniel's own wallet, via
 * the sign handoff below (v211: security gate + fresh quote +
 * the venue's own interface). A prepared swap is an intent
 * record, not a trade, and carries no calldata — at handoff
 * a fresh quote is fetched, because quotes expire in minutes
 * and a stale quote must never be signed blind.
 *
 * Swappable tokens = the Contract Catalogue's Ethereum
 * entries whose contract decimals are recorded below
 * (decimals are constants of the token contracts themselves;
 * a token without a recorded decimals value is NOT offered,
 * because a wrong decimals value misstates amounts). */
import { CATALOGUED_CONTRACTS } from './contract-catalog';
import {
  fetchSwapQuote,
  fetchHoneypotCheck,
  rawFromHuman,
  type Observation,
  type SwapQuote,
} from './live-data';
import { normalizeEvmAddress } from './contract-registry';

export const SWAP_DESK_LAW =
  "MTI6 prepares and records. It never signs, never broadcasts, never holds keys or funds. Signing happens in Daniel's own wallet. A prepared swap is not a trade.";

/** D3 (owner, 2026-11-24): the starting capital boundary is
 * $50. Enforced where it can be measured honestly: a single
 * preparation denominated in a USD stablecoin may not exceed
 * it (a stablecoin amount IS its dollar amount by the token's
 * design). Non-stable denominations are not priced by the
 * desk for all tokens, so the boundary is stated, not
 * enforced, there — every swap still needs owner approval. */
export const DESK_CAPITAL_BOUNDARY_USD = 50;
const USD_STABLES = new Set(['USDT', 'USDC', 'USDbC', 'DAI', 'PYUSD', 'USDe', 'FDUSD', 'TUSD', 'GHO', 'FRAX', 'USD1']);

const TOKEN_DECIMALS: Record<string, number> = {
  USDT: 6, USDC: 6, EURC: 6, PYUSD: 6, AXL: 6, WBTC: 8,
  WETH: 18, DAI: 18, LINK: 18, EIGEN: 18, MKR: 18, CRV: 18, BAL: 18,
  COMP: 18, SNX: 18, ENA: 18, PENDLE: 18, USDe: 18, FDUSD: 18,
  TUSD: 18, GHO: 18, ZRO: 18, ONDO: 18, FRAX: 18, USD1: 18,
  SUSHI: 18, cbETH: 18, eETH: 18, ezETH: 18, rETH: 18, rsETH: 18,
  sfrxETH: 18, wstETH: 18, ETHFI: 18, REZ: 18, SWELL: 18, USDY: 18,
  FET: 18, AGIX: 18, MOR: 18, CAKE: 18, MORPHO: 18, RENDER: 18,
};

/* Base decimals are keyed by contract ADDRESS (symbols repeat
 * across networks — USDC and WETH exist on both). Each value
 * was verified against the contract itself / Honeypot.is at
 * catalogue time (2026-11-24); see contract-catalog.ts. */
const BASE_TOKEN_DECIMALS: Record<string, number> = {
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': 6, // USDbC
  '0x940181a94a35a4569e4529a3cdfb74e38fd98631': 18, // AERO
  '0x4200000000000000000000000000000000000006': 18, // WETH (Base)
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 6, // USDC (Base)
};

export type DeskNetwork = 'ethereum' | 'base';

export interface SwappableToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  support: string;
  network: DeskNetwork;
}

export const SWAPPABLE_TOKENS: SwappableToken[] = CATALOGUED_CONTRACTS
  .filter(
    (c) =>
      (c.network === 'ethereum' && TOKEN_DECIMALS[c.symbol] !== undefined) ||
      (c.network === 'base' && BASE_TOKEN_DECIMALS[c.address.toLowerCase()] !== undefined),
  )
  .map((c) => ({
    symbol: c.symbol,
    name: c.name,
    address: c.address,
    decimals:
      c.network === 'base' ? BASE_TOKEN_DECIMALS[c.address.toLowerCase()] : TOKEN_DECIMALS[c.symbol],
    support: c.support,
    network: c.network as DeskNetwork,
  }))
  .sort((a, b) => a.symbol.localeCompare(b.symbol));

export function swappableOn(network: DeskNetwork): SwappableToken[] {
  return SWAPPABLE_TOKENS.filter((t) => t.network === network);
}

export function swappableBySymbol(symbol: string, network: DeskNetwork = 'ethereum'): SwappableToken | null {
  return SWAPPABLE_TOKENS.find((t) => t.symbol === symbol && t.network === network) ?? null;
}

/* ------------------------- watch wallet (read-only) ------------------ */
const WATCH_KEY = 'mti6_watch_wallet_v1';

export interface WatchWallet {
  address: string;
  addedAt: number;
}

export function loadWatchWallet(): WatchWallet | null {
  try {
    const raw = localStorage.getItem(WATCH_KEY);
    if (!raw) return null;
    const w = JSON.parse(raw) as WatchWallet;
    return w && typeof w.address === 'string' ? w : null;
  } catch {
    return null;
  }
}

export function saveWatchWallet(address: string): WatchWallet | null {
  const normalized = normalizeEvmAddress(address);
  if (!normalized) return null;
  const w: WatchWallet = { address: normalized, addedAt: Date.now() };
  try { localStorage.setItem(WATCH_KEY, JSON.stringify(w)); } catch { /* storage full/blocked */ }
  return w;
}

export function clearWatchWallet(): void {
  try { localStorage.removeItem(WATCH_KEY); } catch { /* nothing to clear */ }
}

/* --------------------------- prepared swaps -------------------------- */
const SWAPS_KEY = 'mti6_prepared_swaps_v1';
const SWAPS_MAX = 100;
/** A quote older than this must be re-fetched before signing. */
export const QUOTE_FRESH_MS = 15 * 60_000;

export interface PreparedSwap {
  id: string;
  createdAt: number;
  network: DeskNetwork;
  fromSymbol: string;
  toSymbol: string;
  fromAmount: string;
  fromAmountRaw: string;
  toAmount: string;
  toAmountRaw: string;
  quoteSource: string | null;
  quoteStatus: string;
  quoteFetchedAt: number | null;
  state: 'PREPARED' | 'OWNER_APPROVED' | 'HANDED_OFF';
  approvedAt: number | null;
  /** Sign handoff (v211) — set when the owner takes the swap
   * to his own wallet. The desk still signed nothing. */
  handedOffAt?: number | null;
  handoffVenue?: string | null;
  safety?: {
    checkedAt: number;
    toIsHoneypot: boolean | null;
    toRisk: string | null;
    fromSupport: string;
    toSupport: string;
  } | null;
}

export function loadPreparedSwaps(): PreparedSwap[] {
  try {
    const raw = localStorage.getItem(SWAPS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as PreparedSwap[];
    return Array.isArray(arr) ? arr.filter((s) => s && typeof s.id === 'string') : [];
  } catch {
    return [];
  }
}

function savePreparedSwaps(swaps: PreparedSwap[]): void {
  try {
    localStorage.setItem(SWAPS_KEY, JSON.stringify(swaps.slice(0, SWAPS_MAX)));
  } catch { /* storage full/blocked */ }
}

export async function prepareSwap(
  fromSymbol: string,
  toSymbol: string,
  amountHuman: string,
  network: DeskNetwork = 'ethereum',
): Promise<{ ok: true; swap: PreparedSwap; obs: Observation<SwapQuote> } | { ok: false; error: string }> {
  const from = swappableBySymbol(fromSymbol, network);
  const to = swappableBySymbol(toSymbol, network);
  if (!from || !to) return { ok: false, error: `Pair not in the swappable list for ${network} (catalogued contracts with recorded decimals only).` };
  if (from.symbol === to.symbol) return { ok: false, error: 'From and to tokens are the same.' };
  const raw = rawFromHuman(amountHuman, from.decimals);
  if (!raw) return { ok: false, error: 'Amount is not a valid positive number for this token.' };
  if (USD_STABLES.has(from.symbol) && Number(amountHuman) > DESK_CAPITAL_BOUNDARY_USD) {
    return {
      ok: false,
      error: `Over the D3 capital boundary: ${amountHuman} ${from.symbol} exceeds the $${DESK_CAPITAL_BOUNDARY_USD} starting capital Daniel set. Lower the amount, or Daniel raises the boundary as his own recorded decision.`,
    };
  }
  const watch = loadWatchWallet();
  const obs = await fetchSwapQuote(from, to, raw, watch?.address, network);
  if (!obs.value) {
    return { ok: false, error: `No quote — the aggregator chain answered NO_DATA (${obs.status}). Nothing was prepared.` };
  }
  const swap: PreparedSwap = {
    id: `swap-${Date.now()}-${from.symbol}-${to.symbol}`,
    createdAt: Date.now(),
    network,
    fromSymbol: from.symbol,
    toSymbol: to.symbol,
    fromAmount: amountHuman.trim(),
    fromAmountRaw: raw,
    toAmount: obs.value.toAmount,
    toAmountRaw: obs.value.toAmountRaw,
    quoteSource: obs.source,
    quoteStatus: obs.status,
    quoteFetchedAt: obs.fetchedAt,
    state: 'PREPARED',
    approvedAt: null,
  };
  savePreparedSwaps([swap, ...loadPreparedSwaps()]);
  return { ok: true, swap, obs };
}

/** The owner's own act, in his own app: approve one specific
 * prepared swap. Records the approval; executes nothing. */
export function approvePreparedSwap(id: string): PreparedSwap | null {
  const swaps = loadPreparedSwaps();
  const s = swaps.find((x) => x.id === id);
  if (!s || s.state !== 'PREPARED') return null;
  s.state = 'OWNER_APPROVED';
  s.approvedAt = Date.now();
  savePreparedSwaps(swaps);
  return s;
}

/* ------------------------- sign handoff (v211) ------------------------
 * The owner's approved swap leaves the desk exactly one way:
 *   1. SECURITY GATE — a live Honeypot.is check on the token
 *      he would RECEIVE. A honeypot flag REFUSES the handoff.
 *      The catalogue support levels of both tokens ride along
 *      on the record as evidence.
 *   2. FRESH QUOTE — the preparation quote is never signed
 *      blind; the desk re-quotes at handoff and the record is
 *      updated to the fresh observation.
 *   3. THE LINK — the swap opens in the venue's own interface
 *      (Uniswap, exact pair + amount prefilled) where Daniel
 *      reviews the venue's own numbers against the desk's
 *      fresh quote and signs with HIS wallet. MTI6 never sees
 *      a key, never signs, never broadcasts. */
export function signLinkFor(swap: PreparedSwap): string | null {
  const from = swappableBySymbol(swap.fromSymbol, swap.network);
  const to = swappableBySymbol(swap.toSymbol, swap.network);
  if (!from || !to) return null;
  const chain = swap.network === 'base' ? '&chain=base' : '';
  return `https://app.uniswap.org/swap?inputCurrency=${from.address}&outputCurrency=${to.address}&exactAmount=${encodeURIComponent(swap.fromAmount)}&exactField=input${chain}`;
}

export async function handoffSwap(
  id: string,
): Promise<{ ok: true; swap: PreparedSwap; link: string; obs: Observation<SwapQuote> } | { ok: false; error: string }> {
  const swaps = loadPreparedSwaps();
  const s = swaps.find((x) => x.id === id);
  if (!s) return { ok: false, error: 'Prepared swap not found.' };
  if (s.state !== 'OWNER_APPROVED') {
    return { ok: false, error: `Handoff requires OWNER_APPROVED — this swap is ${s.state}. Approve it first; the ladder has no skipped rungs.` };
  }
  const from = swappableBySymbol(s.fromSymbol, s.network);
  const to = swappableBySymbol(s.toSymbol, s.network);
  if (!from || !to) return { ok: false, error: 'Pair no longer in the swappable list — handoff refused.' };

  const safetyObs = await fetchHoneypotCheck(to.address, s.network === 'base' ? 8453 : 1);
  if (safetyObs.value?.isHoneypot === true) {
    return {
      ok: false,
      error: `SECURITY GATE: Honeypot.is flags ${to.symbol} as a HONEYPOT (you could buy but not sell). Handoff refused — the swap stays OWNER_APPROVED and nothing was sent anywhere.`,
    };
  }

  const watch = loadWatchWallet();
  const obs = await fetchSwapQuote(from, to, s.fromAmountRaw, watch?.address, s.network);
  if (!obs.value) {
    return { ok: false, error: `No fresh quote — the aggregator chain answered NO_DATA (${obs.status}). Handoff not made; a stale quote is never signed blind.` };
  }

  s.toAmount = obs.value.toAmount;
  s.toAmountRaw = obs.value.toAmountRaw;
  s.quoteSource = obs.source;
  s.quoteStatus = obs.status;
  s.quoteFetchedAt = obs.fetchedAt;
  s.safety = {
    checkedAt: Date.now(),
    toIsHoneypot: safetyObs.value ? safetyObs.value.isHoneypot : null,
    toRisk: safetyObs.value?.risk ?? null,
    fromSupport: from.support,
    toSupport: to.support,
  };
  s.state = 'HANDED_OFF';
  s.handedOffAt = Date.now();
  s.handoffVenue = 'Uniswap';
  savePreparedSwaps(swaps);
  const link = signLinkFor(s);
  if (!link) return { ok: false, error: 'Could not build the signing link — handoff recorded but link unavailable.' };
  return { ok: true, swap: s, link, obs };
}

export function quoteFreshness(swap: PreparedSwap): 'FRESH' | 'STALE' {
  if (!swap.quoteFetchedAt) return 'STALE';
  return Date.now() - swap.quoteFetchedAt <= QUOTE_FRESH_MS ? 'FRESH' : 'STALE';
}

/* ------------------------------ summary ------------------------------ */
export function swapDeskSummary(): {
  watch: WatchWallet | null;
  swappableCount: number;
  prepared: number;
  approved: number;
  handedOff: number;
  latest: PreparedSwap | null;
  baseSwappableCount: number;
} {
  const swaps = loadPreparedSwaps();
  return {
    watch: loadWatchWallet(),
    swappableCount: SWAPPABLE_TOKENS.length,
    prepared: swaps.filter((s) => s.state === 'PREPARED').length,
    approved: swaps.filter((s) => s.state === 'OWNER_APPROVED').length,
    handedOff: swaps.filter((s) => s.state === 'HANDED_OFF').length,
    latest: swaps[0] ?? null,
    baseSwappableCount: swappableOn('base').length,
  };
}

export function swapDeskSummaryText(): string {
  const s = swapDeskSummary();
  const watchLine = s.watch
    ? `Watch wallet ${s.watch.address} (read-only — balances from Blockscout on Ethereum, public Base RPC on Base).`
    : 'No watch wallet set — Daniel adds his public address in the Swap Desk on the Crypto Market screen. An address is public information, never a key.';
  const latestLine = s.latest
    ? ` Latest prepared: ${s.latest.fromAmount} ${s.latest.fromSymbol} → ~${s.latest.toAmount} ${s.latest.toSymbol} on ${s.latest.network} via ${s.latest.quoteSource ?? 'unknown source'} (${s.latest.state}${s.latest.state === 'PREPARED' ? `, quote ${quoteFreshness(s.latest).toLowerCase()}` : ''}).`
    : ' No swaps prepared yet.';
  return `Swap Desk — the execution track (D1 YES, D2 DEX only, no KYC venue, owner signs in his own wallet). ${watchLine} Swappable: ${s.swappableCount} catalogued tokens with recorded decimals across Ethereum and Base (${s.baseSwappableCount} on Base — the low-fee leg for the $50 start; Base quotes run Paraswap → KyberSwap → CoW Swap → Velora). Prepared swaps: ${s.prepared} awaiting approval, ${s.approved} owner-approved, ${s.handedOff} handed off to Daniel's wallet for signing. Every handoff passes a live Honeypot.is security gate on the token he would receive — a honeypot flag refuses the handoff.${latestLine} ${SWAP_DESK_LAW}`;
}
