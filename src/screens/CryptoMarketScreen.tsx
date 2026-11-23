// Crypto Market — the TRADING TERMINAL (Phase 2, step 6 — owner
// directive 2026-11-23).
//
// The execution boundary is drawn FIRST, before any terminal element:
// this screen can build an UNSIGNED proposal and stop. It cannot
// place, sign, broadcast, or settle an order — execution capability
// is EXECUTION DISABLED on every registry row, and the ladder's
// EXECUTE rung stays disabled here too. No returns figure appears
// anywhere: no projected profit, no APY, no performance promise.
//
// PriceScout is not wired into this React build, so the chart, the
// watchlist, and the order book render their honest NO DATA state —
// no price, change, candle, bid, or ask is invented. The chart frame
// (grid, axes, crosshair) is real UI over MTI6_CHART tokens; the
// crosshair reads NO DATA at every point because there is no series
// to read. When a feed is wired, the series lands in this frame.
//
// The chart colour law is scoped to this screen's chart and order
// controls ONLY: green = BUY, red = SELL, amber = WARNING / WATCH.
// It never leaks into world accents, chips, or the status strip.

import React, { useRef, useState } from 'react';
import { ChevronDown, Lock, TrendingUp } from 'lucide-react';
import { MonoLine, Panel, ScreenHeader, StatusPill } from './shared';
import { MTI6_CHART } from '../tokens';

const PRICE_COINS = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'LTC', 'ADA'] as const;
const CHART_RANGES = ['1d', '7d', '30d'] as const;

interface Proposal {
  id: number;
  side: 'BUY' | 'SELL';
  pair: string;
  amount: string;
  limit: string;
  preparedAt: string;
}

const LADDER = ['MONITOR', 'ANALYZE', 'RECOMMEND', 'PREPARE', 'OWNER APPROVAL', 'EXECUTE'];

export const CryptoMarketScreen: React.FC = () => {
  const [coin, setCoin] = useState<string>('BTC');
  const [range, setRange] = useState<string>('7d');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState<string>('');
  const [limit, setLimit] = useState<string>('');
  const [panelOpen, setPanelOpen] = useState<boolean>(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const amountNum = Number(amount);
  const limitNum = Number(limit);
  const proposalReady =
    amount.trim() !== '' && limit.trim() !== '' && amountNum > 0 && limitNum > 0;

  const buildProposal = () => {
    if (!proposalReady) return;
    setProposals((prev) => [
      {
        id: prev.length + 1,
        side,
        pair: `${coin}/USD`,
        amount,
        limit,
        preparedAt: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  };

  const onChartPointer = (e: React.PointerEvent) => {
    const el = chartRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCrosshair({
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    });
  };

  const bookPanel = (
    <Panel title="Order book">
      <p className="font-mono text-[11px] text-[#B8B8B8]">
        NO DATA — no feed is connected, so no bids or asks exist to show.
        None are invented.
      </p>
      <MonoLine>ORDER BOOK: NOT_CONNECTED · NO_DATA</MonoLine>
    </Panel>
  );

  const positionsPanel = (
    <Panel title="Positions">
      <p className="font-mono text-[11px] text-[#B8B8B8]">
        NO DATA — no account or wallet is connected, so no position exists
        to show. An unconnected position is never shown as zero.
      </p>
      <MonoLine>POSITIONS: NOT_CONNECTED · NO_DATA</MonoLine>
    </Panel>
  );

  return (
    <div className="space-y-4 text-white">
      <ScreenHeader
        icon={TrendingUp}
        title="Crypto Market"
        subtitle="Trading terminal — prepare-only. The boundary below governs everything on this screen."
        note="PriceScout (CoinGecko → Coinbase → CoinPaprika) is not wired in this build, so no price is shown. Stocks need a server-side proxy first — no stock price is shown either."
      />

      {/* 1 — THE EXECUTION BOUNDARY, FIRST */}
      <section
        aria-label="Execution boundary"
        className="rounded-2xl border-2 border-[#FF3B30]/70 bg-[#FF3B30]/[.06] p-4"
      >
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#FF3B30]" />
          <div>
            <h2 className="text-sm font-bold tracking-wide">
              EXECUTION BOUNDARY — EXECUTION DISABLED BY DESIGN
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#B8B8B8]">
              This terminal can build an <strong className="text-white">unsigned proposal</strong>{' '}
              and stop. It cannot place, sign, broadcast, or settle an order.
              Execution capability is EXECUTION DISABLED on every registry row.
              No returns are projected anywhere on this screen — no profit
              figure, no APY, no performance promise.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1 font-mono text-[10px]">
              {LADDER.map((rung, i) => (
                <React.Fragment key={rung}>
                  <span
                    className={`rounded border px-1.5 py-0.5 ${
                      rung === 'EXECUTE'
                        ? 'border-[#FF3B30]/60 text-[#FF3B30] line-through'
                        : rung === 'PREPARE'
                          ? 'border-[#00B7FF]/60 text-white'
                          : 'border-white/15 text-[#B8B8B8]'
                    }`}
                  >
                    {rung}
                    {rung === 'EXECUTE' ? ' — DISABLED' : ''}
                  </span>
                  {i < LADDER.length - 1 && <span className="text-[#B8B8B8]">→</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2 — THE TERMINAL GRID (per-tier layout, directive step 6) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_280px] xl:grid-cols-[220px_1fr_320px] 2xl:grid-cols-[220px_1fr_240px_240px_360px]">
        {/* Chart — phone full width ~45vh, tablet ~55vh, desktop main column */}
        <div className="md:col-start-1 md:row-start-1 xl:col-start-2">
          <Panel title={`Chart — ${coin}/USD · ${range}`}>
            <div className="mb-2 flex flex-wrap gap-1">
              {CHART_RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`rounded border px-2 py-1 font-mono text-[10px] ${
                    range === r
                      ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-white'
                      : 'border-white/10 bg-[#151515] text-[#B8B8B8] hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
              <span className="ml-auto font-mono text-[10px] text-[#B8B8B8]">
                FEED: NOT_CONNECTED
              </span>
            </div>
            <div
              ref={chartRef}
              onPointerMove={onChartPointer}
              onPointerDown={onChartPointer}
              onPointerLeave={() => setCrosshair(null)}
              className="relative h-[45vh] touch-none overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0b] md:h-[55vh] xl:h-[60vh]"
              role="img"
              aria-label={`Price chart for ${coin} — no data, feed not connected`}
            >
              {/* Grid (MTI6_CHART.gridLine) */}
              <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                {[0.25, 0.5, 0.75].map((f) => (
                  <line
                    key={`h${f}`}
                    x1="0"
                    x2="100%"
                    y1={`${f * 100}%`}
                    y2={`${f * 100}%`}
                    stroke={MTI6_CHART.gridLine}
                    strokeWidth="1"
                  />
                ))}
                {[0.25, 0.5, 0.75].map((f) => (
                  <line
                    key={`v${f}`}
                    y1="0"
                    y2="100%"
                    x1={`${f * 100}%`}
                    x2={`${f * 100}%`}
                    stroke={MTI6_CHART.gridLine}
                    strokeWidth="1"
                  />
                ))}
              </svg>
              {/* Crosshair (MTI6_CHART.crosshair) — reads NO DATA: no series exists */}
              {crosshair && (
                <>
                  <div
                    className="absolute inset-y-0 w-px"
                    style={{ left: `${crosshair.x * 100}%`, backgroundColor: MTI6_CHART.crosshair }}
                  />
                  <div
                    className="absolute inset-x-0 h-px"
                    style={{ top: `${crosshair.y * 100}%`, backgroundColor: MTI6_CHART.crosshair }}
                  />
                  <div
                    className="absolute rounded border border-[#00B7FF]/60 bg-[#050505]/90 px-1.5 py-0.5 font-mono text-[9px] text-white"
                    style={{
                      left: `${Math.min(88, crosshair.x * 100)}%`,
                      top: `${Math.max(2, crosshair.y * 100 - 8)}%`,
                    }}
                  >
                    {coin}/USD · NO DATA
                  </div>
                </>
              )}
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <p className="max-w-sm font-mono text-[11px] leading-relaxed text-[#B8B8B8]">
                  NO DATA — {coin}/USD ({range}) history is NOT_CONNECTED. No
                  chart is drawn from made-up data; the frame lights up when a
                  feed is wired, labelled with its source and status.
                </p>
              </div>
              <span
                className="absolute bottom-1.5 right-2 font-mono text-[9px]"
                style={{ color: MTI6_CHART.axisText }}
              >
                PRICE AXIS: —
              </span>
            </div>
            <MonoLine>
              CHART: NOT_CONNECTED · NO_DATA · SOURCE: PRICESCOUT NOT WIRED
            </MonoLine>
          </Panel>
        </div>

        {/* Order panel — phone: bottom sheet, collapsed by default;
            tablet right column 280px; desktop 320px; ultra-wide 360px */}
        <div className="md:col-start-2 md:row-start-1 xl:col-start-3 2xl:col-start-5">
          <Panel title="Order panel — prepare only">
            <button
              type="button"
              onClick={() => setPanelOpen((o) => !o)}
              aria-expanded={panelOpen}
              className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-[#151515] px-3 py-2 font-mono text-[11px] text-white md:hidden"
            >
              {panelOpen ? 'HIDE ORDER PANEL' : 'SHOW ORDER PANEL — PREPARE ONLY'}
              <ChevronDown
                className={`h-4 w-4 transition ${panelOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <div className={`${panelOpen ? 'mt-3 block' : 'hidden'} md:mt-0 md:block`}>
              {/* Side toggle — chart colour law, scoped to these controls */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSide('BUY')}
                  aria-pressed={side === 'BUY'}
                  className="h-11 rounded-lg font-mono text-xs font-bold text-white transition"
                  style={{
                    backgroundColor: side === 'BUY' ? MTI6_CHART.up : '#151515',
                    border: `1px solid ${MTI6_CHART.up}`,
                    opacity: side === 'BUY' ? 1 : 0.75,
                  }}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setSide('SELL')}
                  aria-pressed={side === 'SELL'}
                  className="h-11 rounded-lg font-mono text-xs font-bold text-white transition"
                  style={{
                    backgroundColor: side === 'SELL' ? MTI6_CHART.down : '#151515',
                    border: `1px solid ${MTI6_CHART.down}`,
                    opacity: side === 'SELL' ? 1 : 0.75,
                  }}
                >
                  SELL
                </button>
              </div>

              <div className="mt-3 space-y-2">
                <label className="block">
                  <span className="font-mono text-[10px] text-[#B8B8B8]">
                    PAIR
                  </span>
                  <div className="mt-0.5 rounded-lg border border-white/10 bg-[#151515] px-3 py-2 font-mono text-xs">
                    {coin}/USD
                  </div>
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] text-[#B8B8B8]">
                    AMOUNT ({coin})
                  </span>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="mt-0.5 w-full rounded-lg border border-white/10 bg-[#151515] px-3 py-2 font-mono text-xs text-white outline-none focus:border-[#0080FF]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] text-[#B8B8B8]">
                    LIMIT PRICE (USD) — YOUR FIGURE; NO LIVE PRICE EXISTS TO
                    CHECK IT AGAINST
                  </span>
                  <input
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="mt-0.5 w-full rounded-lg border border-white/10 bg-[#151515] px-3 py-2 font-mono text-xs text-white outline-none focus:border-[#0080FF]"
                  />
                </label>
              </div>

              {!proposalReady && (
                <p
                  className="mt-3 rounded-lg border px-3 py-2 font-mono text-[10px]"
                  style={{ borderColor: MTI6_CHART.watch, color: MTI6_CHART.watch }}
                >
                  WATCH — proposal incomplete: an amount and a limit price
                  above zero are both required to build a proposal.
                </p>
              )}

              <button
                type="button"
                onClick={buildProposal}
                disabled={!proposalReady}
                className="mt-3 h-11 w-full rounded-lg bg-[#00B7FF] font-mono text-xs font-bold text-[#050505] transition disabled:cursor-not-allowed disabled:bg-[#202020] disabled:text-[#B8B8B8]"
              >
                BUILD UNSIGNED PROPOSAL
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="mt-2 h-11 w-full cursor-not-allowed rounded-lg border border-[#FF3B30]/50 font-mono text-xs font-bold text-[#FF3B30] opacity-60"
              >
                EXECUTE — DISABLED BY DESIGN
              </button>
              <p className="mt-2 font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
                A proposal is an unsigned, unsent record of intent held in
                this session only. Building one moves no funds and contacts
                no venue.
              </p>
            </div>
          </Panel>
        </div>

        {/* Order book + positions — own columns only at ultra-wide */}
        <div className="hidden 2xl:col-start-3 2xl:row-start-1 2xl:block">{bookPanel}</div>
        <div className="hidden 2xl:col-start-4 2xl:row-start-1 2xl:block">{positionsPanel}</div>

        {/* Watchlist */}
        <div className="md:col-span-2 md:row-start-2 xl:col-span-1 xl:col-start-1 xl:row-start-1 2xl:col-start-1">
          <Panel title="Watchlist — 7 coins">
            <div className="space-y-1.5">
              {PRICE_COINS.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => setCoin(sym)}
                  aria-pressed={coin === sym}
                  className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-left transition ${
                    coin === sym
                      ? 'border border-[#8B5CFF]/60 bg-[#8B5CFF]/10'
                      : 'bg-[#151515] hover:bg-[#1b1b1b]'
                  }`}
                >
                  <span className="text-sm font-semibold">{sym}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-bold">UNAVAILABLE</span>
                    <span className="text-[10px] text-[#B8B8B8]">24h: NO_DATA</span>
                    <StatusPill status="NOT_CONNECTED" />
                  </span>
                </button>
              ))}
            </div>
            <MonoLine>PRICES: NOT_CONNECTED · NO_DATA · SOURCE: PRICESCOUT NOT WIRED</MonoLine>
          </Panel>
        </div>

        {/* Order book + positions stacked below the terminal under ultra-wide */}
        <div className="md:col-span-2 md:row-start-3 xl:col-span-3 2xl:hidden">
          <div className="grid gap-4 md:grid-cols-2">
            {bookPanel}
            {positionsPanel}
          </div>
        </div>
      </div>

      {/* 3 — PREPARED PROPOSALS (session-only, unsigned) */}
      <Panel title="Prepared proposals — this session only">
        {proposals.length === 0 ? (
          <p className="font-mono text-[11px] text-[#B8B8B8]">
            NONE PREPARED — build one from the order panel. A prepared
            proposal is as far as this terminal goes.
          </p>
        ) : (
          <div className="space-y-2">
            {proposals.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#151515] p-3"
              >
                <span className="font-mono text-xs">
                  <span
                    className="font-bold"
                    style={{ color: p.side === 'BUY' ? MTI6_CHART.up : MTI6_CHART.down }}
                  >
                    {p.side}
                  </span>{' '}
                  {p.amount} · {p.pair} @ limit {p.limit} USD
                </span>
                <span className="font-mono text-[10px] text-[#B8B8B8]">
                  PREPARED {p.preparedAt} · UNSIGNED · NOT SENT · EXECUTION
                  DISABLED
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Stocks">
        <p className="text-xs leading-relaxed text-[#B8B8B8]">
          Stocks are not live on this screen — they need a server-side proxy
          first, so no stock price is shown rather than a fake one. Watchlist
          tickers in vanilla (AAPL, MSFT, GOOGL, TSLA, NVDA, AMZN, META) carry
          no prices until that proxy is configured.
        </p>
        <MonoLine>STOCKS: NOT_CONNECTED · NO_DATA</MonoLine>
      </Panel>
    </div>
  );
};
