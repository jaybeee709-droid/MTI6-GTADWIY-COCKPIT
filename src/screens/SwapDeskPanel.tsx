/* Swap Desk panel (v210) — the wallet leg of the execution
 * track on the Crypto Market (trading) screen. Owner decisions
 * D1 (execution YES) + D2 FINAL (DEX only, no KYC venue),
 * 2026-11-24. The desk prepares and records; it never signs,
 * broadcasts, or holds keys — signing happens in Daniel's own
 * wallet via the sign handoff (v211: live Honeypot.is security
 * gate + fresh quote + the venue's own interface). Fetch
 * discipline matches the app: quotes and balances load on
 * button press only, through the governed live-data chains,
 * and every figure carries its provenance. */
import React, { useState } from 'react';
import {
  SWAPPABLE_TOKENS,
  SWAP_DESK_LAW,
  DESK_CAPITAL_BOUNDARY_USD,
  loadWatchWallet,
  saveWatchWallet,
  clearWatchWallet,
  loadPreparedSwaps,
  prepareSwap,
  approvePreparedSwap,
  handoffSwap,
  quoteFreshness,
  swappableOn,
  type DeskNetwork,
  type PreparedSwap,
  type WatchWallet,
} from '../swap-desk';
import {
  fetchSwapQuote,
  fetchAddressBalances,
  rawFromHuman,
  fmtUsd,
  type Observation,
  type SwapQuote,
  type AddressBalances,
} from '../live-data';
import { ProvenanceChip } from '../ProvenanceChip';

const micro = 'font-mono text-[10px] tracking-widest text-[#8A93A3]';
const btn =
  'rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 font-mono text-[11px] text-[#E8EAF0] disabled:opacity-40';
const inputCls =
  'w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 font-mono text-xs text-[#E8EAF0]';

export const SwapDeskPanel: React.FC = () => {
  const [watch, setWatch] = useState<WatchWallet | null>(() => loadWatchWallet());
  const [watchInput, setWatchInput] = useState('');
  const [balances, setBalances] = useState<Observation<AddressBalances> | null>(null);
  const [balBusy, setBalBusy] = useState(false);
  const [fromSym, setFromSym] = useState('USDC');
  const [toSym, setToSym] = useState('WETH');
  const [amount, setAmount] = useState('100');
  const [quote, setQuote] = useState<Observation<SwapQuote> | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [prepBusy, setPrepBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [swaps, setSwaps] = useState<PreparedSwap[]>(() => loadPreparedSwaps());
  const [handoffBusy, setHandoffBusy] = useState<string | null>(null);
  const [handoffBox, setHandoffBox] = useState<{ swap: PreparedSwap; link: string } | null>(null);
  const [network, setNetwork] = useState<DeskNetwork>('ethereum');
  const tokensOn = swappableOn(network);

  const switchNetwork = (n: DeskNetwork) => {
    setNetwork(n);
    setQuote(null);
    setBalances(null);
    setMsg(
      n === 'base'
        ? 'Base — the low-fee leg. Same wallet address, same safety gate; quotes run Paraswap → KyberSwap → CoW Swap, balances read from the public Base RPC.'
        : 'Ethereum mainnet — quotes run Paraswap → KyberSwap → CoW Swap; balances read from Blockscout.',
    );
  };

  const doSaveWatch = () => {
    const w = saveWatchWallet(watchInput);
    if (!w) {
      setMsg('That is not a valid Ethereum address — the watch wallet was not saved.');
      return;
    }
    setWatch(w);
    setWatchInput('');
    setBalances(null);
    setMsg('Watch wallet saved (read-only). Balances are read per network — Blockscout on Ethereum, the public Base RPC on Base; the address is public information, never a key.');
  };

  const doBalances = async () => {
    if (!watch || balBusy) return;
    setBalBusy(true);
    try {
      setBalances(await fetchAddressBalances(watch.address, network, swappableOn('base')));
    } finally {
      setBalBusy(false);
    }
  };

  const doQuote = async () => {
    const from = tokensOn.find((t) => t.symbol === fromSym);
    const to = tokensOn.find((t) => t.symbol === toSym);
    if (!from || !to || quoteBusy) return;
    const raw = rawFromHuman(amount, from.decimals);
    if (!raw) {
      setMsg('Amount is not a valid positive number for this token.');
      return;
    }
    setQuoteBusy(true);
    try {
      setQuote(await fetchSwapQuote(from, to, raw, watch?.address, network));
    } finally {
      setQuoteBusy(false);
    }
  };

  const doPrepare = async () => {
    if (prepBusy) return;
    setPrepBusy(true);
    try {
      const r = await prepareSwap(fromSym, toSym, amount, network);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setSwaps(loadPreparedSwaps());
      setMsg(`Prepared: ${r.swap.fromAmount} ${r.swap.fromSymbol} → ~${r.swap.toAmount} ${r.swap.toSymbol} (quote: ${r.swap.quoteSource ?? 'unknown'}, ${r.swap.quoteStatus}). PREPARED only — approve it below, then SIGN HANDOFF takes it to your wallet.`);
    } finally {
      setPrepBusy(false);
    }
  };

  const doApprove = (id: string) => {
    approvePreparedSwap(id);
    setSwaps(loadPreparedSwaps());
  };

  const doHandoff = async (id: string) => {
    if (handoffBusy) return;
    setHandoffBusy(id);
    try {
      const r = await handoffSwap(id);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setSwaps(loadPreparedSwaps());
      setHandoffBox({ swap: r.swap, link: r.link });
      setMsg(`Handoff ready: fresh quote ${r.swap.fromAmount} ${r.swap.fromSymbol} → ~${r.swap.toAmount} ${r.swap.toSymbol} (${r.swap.quoteSource ?? 'unknown'}, ${r.swap.quoteStatus}). Security gate passed — open the venue, compare its numbers with this quote, and sign with your wallet only if they match your intent.`);
    } finally {
      setHandoffBusy(null);
    }
  };

  const heldCatalogued = (balances?.value?.tokens ?? []).filter((t) =>
    SWAPPABLE_TOKENS.some((s) => s.address.toLowerCase() === t.address.toLowerCase()),
  );
  const heldOther = (balances?.value?.tokens ?? []).length - heldCatalogued.length;

  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className={micro}>SWAP DESK — WALLET LEG (D2 · DEX ONLY)</span>
        <span className={micro}>PREPARE → OWNER APPROVAL → YOU SIGN</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={micro}>NETWORK</span>
        {(['ethereum', 'base'] as DeskNetwork[]).map((n) => (
          <button
            key={n}
            type="button"
            className={btn}
            onClick={() => switchNetwork(n)}
            aria-pressed={network === n}
            style={network === n ? { borderColor: '#00B7FF', color: '#FFFFFF' } : undefined}
          >
            {n === 'base' ? 'BASE (LOW FEE)' : 'ETHEREUM'}
          </button>
        ))}
        <span className={micro}>{tokensOn.length} TOKENS ON {network.toUpperCase()}</span>
      </div>

      {/* Watch wallet — read-only */}
      <div className="space-y-1.5">
        <div className={micro}>WATCH WALLET (READ-ONLY)</div>
        {watch ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-all font-mono text-[11px] text-[#E8EAF0]">{watch.address}</span>
            <button type="button" className={btn} onClick={doBalances} disabled={balBusy}>
              {balBusy ? 'LOADING…' : 'LOAD BALANCES'}
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                clearWatchWallet();
                setWatch(null);
                setBalances(null);
              }}
            >
              CLEAR
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className={inputCls}
              placeholder="Your public wallet address (0x…)"
              value={watchInput}
              onChange={(e) => setWatchInput(e.target.value)}
              aria-label="Watch wallet address"
            />
            <button type="button" className={btn} onClick={doSaveWatch}>
              SAVE
            </button>
          </div>
        )}
        {balances && (
          <div className="space-y-1">
            {balances.value ? (
              <>
                <div className="font-mono text-[11px] text-[#E8EAF0]">
                  ETH {balances.value.eth ?? '—'}
                  {heldCatalogued.map((t) => (
                    <span key={t.address}> · {t.symbol} {t.amount}</span>
                  ))}
                </div>
                {heldOther > 0 && (
                  <div className={micro}>
                    + {heldOther} OTHER TOKEN{heldOther === 1 ? '' : 'S'} NOT IN THE CATALOGUE — HELD, NOT PRICED HERE
                  </div>
                )}
              </>
            ) : (
              <div className={micro}>BALANCES: NO_DATA — {network === 'base' ? 'THE BASE RPC' : 'BLOCKSCOUT'} DID NOT ANSWER</div>
            )}
            <ProvenanceChip obs={balances} compact />
          </div>
        )}
      </div>

      {/* Quote + prepare */}
      <div className="space-y-1.5">
        <div className={micro}>QUOTE + PREPARE ({tokensOn.length} SWAPPABLE TOKENS ON {network.toUpperCase()})</div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className={micro}>FROM</span>
            <select className={inputCls} value={fromSym} onChange={(e) => setFromSym(e.target.value)} aria-label="From token">
              {tokensOn.map((t) => (
                <option key={`${t.network}-${t.symbol}`} value={t.symbol}>{t.symbol}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={micro}>TO</span>
            <select className={inputCls} value={toSym} onChange={(e) => setToSym(e.target.value)} aria-label="To token">
              {tokensOn.map((t) => (
                <option key={`${t.network}-${t.symbol}`} value={t.symbol}>{t.symbol}</option>
              ))}
            </select>
          </label>
          <label className="block w-28">
            <span className={micro}>AMOUNT</span>
            <input className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" />
          </label>
          <button type="button" className={btn} onClick={doQuote} disabled={quoteBusy}>
            {quoteBusy ? 'QUOTING…' : 'GET QUOTE'}
          </button>
          <button type="button" className={btn} onClick={doPrepare} disabled={prepBusy}>
            {prepBusy ? 'PREPARING…' : 'PREPARE SWAP'}
          </button>
        </div>
        {quote && (
          <div className="space-y-1">
            {quote.value ? (
              <div className="font-mono text-[11px] text-[#E8EAF0]">
                {amount} {fromSym} → ~{quote.value.toAmount} {toSym}
                {quote.value.gasCostUsd !== null ? ` · EST. GAS ${fmtUsd(quote.value.gasCostUsd)}` : ''}
              </div>
            ) : (
              <div className={micro}>QUOTE: NO_DATA — NO AGGREGATOR ANSWERED</div>
            )}
            <ProvenanceChip obs={quote} compact />
          </div>
        )}
        {msg && <p className="text-[11px] leading-relaxed text-[#B8B8B8]">{msg}</p>}
      </div>

      {/* Prepared swaps */}
      <div className="space-y-1.5">
        <div className={micro}>PREPARED SWAPS ({swaps.length})</div>
        {swaps.length === 0 ? (
          <p className="text-[11px] text-[#B8B8B8]">None prepared yet. A prepared swap is an intent record with the quote observed at preparation — not a trade.</p>
        ) : (
          swaps.slice(0, 8).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 px-2 py-1.5">
              <span className="font-mono text-[11px] text-[#E8EAF0]">
                {s.fromAmount} {s.fromSymbol} → ~{s.toAmount} {s.toSymbol}
                <span className="text-[#8A93A3]"> · {s.network.toUpperCase()} · {s.quoteSource ?? '—'} · {s.state}{s.state === 'PREPARED' ? ` · QUOTE ${quoteFreshness(s)}` : ''}</span>
              </span>
              {s.state === 'PREPARED' && (
                <button type="button" className={btn} onClick={() => doApprove(s.id)}>
                  APPROVE
                </button>
              )}
              {s.state === 'OWNER_APPROVED' && (
                <button type="button" className={btn} onClick={() => doHandoff(s.id)} disabled={handoffBusy === s.id}>
                  {handoffBusy === s.id ? 'CHECKING…' : 'SIGN HANDOFF'}
                </button>
              )}
              {s.state === 'HANDED_OFF' && (
                <span className={micro}>→ {s.handoffVenue ?? 'VENUE'} · AWAITING YOUR SIGNATURE THERE</span>
              )}
            </div>
          ))
        )}
        {handoffBox && (
          <div className="space-y-1.5 rounded-md border border-white/15 bg-black/30 px-2 py-2">
            <div className={micro}>SIGN IN YOUR WALLET — {handoffBox.swap.fromAmount} {handoffBox.swap.fromSymbol} → ~{handoffBox.swap.toAmount} {handoffBox.swap.toSymbol}</div>
            <a
              href={handoffBox.link}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-md border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-[11px] text-[#E8EAF0]"
            >
              OPEN IN UNISWAP TO SIGN
            </a>
            <p className="text-[11px] leading-relaxed text-[#B8B8B8]">
              The venue opens with your exact pair and amount. Its own quote rules there — compare it with the desk's fresh
              quote above before you sign, and sign only if it matches your intent. MTI6 never sees your key and cannot
              sign or send anything.
              {handoffBox.swap.safety
                ? ` Security gate: Honeypot.is on ${handoffBox.swap.toSymbol} — honeypot: ${handoffBox.swap.safety.toIsHoneypot === null ? 'UNMEASURED' : handoffBox.swap.safety.toIsHoneypot ? 'YES' : 'NO'}, risk: ${handoffBox.swap.safety.toRisk ?? 'unknown'}; catalogue support ${handoffBox.swap.safety.toSupport}.`
                : ''}
            </p>
          </div>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-[#B8B8B8]">{SWAP_DESK_LAW}</p>
      <p className={micro}>
        CAPITAL BOUNDARY (D3): ${DESK_CAPITAL_BOUNDARY_USD} STARTING CAPITAL, SET BY DANIEL 2026-11-24 — A SINGLE STABLECOIN-DENOMINATED PREPARATION ABOVE IT IS REFUSED; EVERY SWAP STILL NEEDS ITS OWN OWNER APPROVAL, AND SIGNING HAPPENS ONLY IN HIS WALLET. QUOTE CHAINS (KEYLESS, PROBED LIVE 2026-11-24): ETHEREUM PARASWAP → KYBERSWAP → COW SWAP · BASE PARASWAP → KYBERSWAP. SECURITY GATE: EVERY HANDOFF RUNS A LIVE HONEYPOT.IS CHECK ON THE TOKEN YOU WOULD RECEIVE — A HONEYPOT FLAG REFUSES THE HANDOFF.
      </p>
    </section>
  );
};
