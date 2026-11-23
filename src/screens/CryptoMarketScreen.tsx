// Crypto Market — migrated from js/modules/crypto.js
//
// Read-only live crypto view in vanilla, driven by PriceScout's
// triple fallback chain (CoinGecko → Coinbase → CoinPaprika, then
// cached / stale / error), with a 7-day history chart from CoinGecko
// (coins BTC, ETH, SOL, DOGE, XRP; price list also LTC, ADA; ranges
// 1d / 7d / 30d). Stocks are NOT live on this screen in vanilla
// either: they need a server-side proxy first, so no stock price is
// shown rather than a fake one.
//
// PriceScout is not wired into this React build, so no price is
// shown here at all — every coin reads NOT_CONNECTED / UNAVAILABLE.
// No price, 24h change, or chart point is invented.

import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { EmptyState, MonoLine, Panel, ScreenHeader, StatusPill, TabBar } from './shared';

const PRICE_COINS = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'LTC', 'ADA'] as const;
const CHART_COINS = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP'] as const;
const CHART_RANGES = ['1d', '7d', '30d'] as const;

export const CryptoMarketScreen: React.FC = () => {
  const [chartCoin, setChartCoin] = useState<string>('BTC');
  const [chartRange, setChartRange] = useState<string>('7d');

  return (
    <div className="space-y-5 text-white">
      <ScreenHeader
        icon={TrendingUp}
        title="Crypto Market"
        subtitle="Live crypto prices only — read-only, no buying or trading here"
        note="PriceScout (CoinGecko → Coinbase → CoinPaprika) is not wired in this build, so no price is shown. Stocks are not live on this screen either — they need a server-side proxy first."
      />

      <Panel title="Prices — 7 coins">
        <div className="space-y-2">
          {PRICE_COINS.map((sym) => (
            <div
              key={sym}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#151515] p-3"
            >
              <span className="text-sm font-semibold">{sym}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold">UNAVAILABLE</span>
                <span className="text-xs text-[#B8B8B8]">24h change: NO_DATA</span>
                <StatusPill status="NOT_CONNECTED" />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#B8B8B8]">
          In vanilla each row also shows its source and fetch time, and Live / Cached / Stale are labelled as
          such. A source that is not connected shows no price at all — that rule is what you see here.
        </p>
        <MonoLine>PRICES: NOT_CONNECTED · NO_DATA · SOURCE: PRICESCOUT NOT WIRED</MonoLine>
      </Panel>

      <Panel title="Price history — pick a coin">
        <TabBar tabs={CHART_COINS} active={chartCoin} onSelect={setChartCoin} />
        <TabBar tabs={CHART_RANGES} active={chartRange} onSelect={setChartRange} />
        <div className="mt-4">
          <EmptyState>
            No chart is drawn from made-up data. {chartCoin} history ({chartRange}) is NOT_CONNECTED — the
            CoinGecko history source is not wired in this build.
          </EmptyState>
        </div>
        <p className="mt-3 text-xs text-[#B8B8B8]">
          Read-only; not trading advice. In vanilla the chart is drawn from CoinGecko history only, labelled
          with its source and status.
        </p>
      </Panel>

      <Panel title="Stocks">
        <EmptyState>
          Stocks are not live on this screen — they need a server-side proxy first, so no stock price is shown
          rather than a fake one. Watchlist tickers in vanilla (AAPL, MSFT, GOOGL, TSLA, NVDA, AMZN, META) carry
          no prices until that proxy is configured.
        </EmptyState>
        <MonoLine>STOCKS: NOT_CONNECTED · NO_DATA</MonoLine>
      </Panel>
    </div>
  );
};
