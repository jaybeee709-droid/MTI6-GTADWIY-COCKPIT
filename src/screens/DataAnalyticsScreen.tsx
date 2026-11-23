// Data Analytics — migrated from js/modules/analytics.js
//
// Graphs from real data only, never invented numbers:
// - Crypto: 7-day price line chart (CoinGecko history) + 24h change
//   bars for the top coins (PriceScout triple fallback).
// - Spending: your own expenses by category, summed from IndexedDB.
// - Your cockpit: counts of notes, tasks (done/open), projects,
//   expenses — from IndexedDB on this device.
// - API usage: this device's calls today per source, from the
//   registry's local usage store.
// Earn has no earnings chart yet on purpose: there are no real
// earnings to chart until you connect a seller account or record
// income, and this screen will not invent any.
//
// None of those sources is wired in this React build, so every panel
// honestly reports NOT_CONNECTED / NO_DATA. Layout is single column
// on a phone, two columns on desktop (as in vanilla).

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { EmptyState, MonoLine, Panel, ScreenHeader } from './shared';

export const DataAnalyticsScreen: React.FC = () => {
  return (
    <div className="space-y-5 text-white">
      <ScreenHeader
        icon={BarChart3}
        title="Data Analytics"
        subtitle="Charts from real data only — line + bar + pie + donut panels"
        note="Crypto from live public prices, spending and counts from your own cockpit data on this device, API usage from this device's calls. Nothing here is projected or estimated — and no source is wired in this build."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Crypto — 7-day price + 24h change">
          <EmptyState>
            Could not load crypto charts right now. The BTC 7-day line chart (CoinGecko history) and the 24h
            change bars (PriceScout chain) are NOT_CONNECTED in this build — no price point or change figure is
            drawn from made-up data.
          </EmptyState>
          <MonoLine>CRYPTO CHARTS: NOT_CONNECTED · NO_DATA · READ-ONLY; NOT TRADING ADVICE</MonoLine>
        </Panel>

        <Panel title="Spending by category (your data)">
          <EmptyState>
            No expenses recorded yet — add one in Resource Tracker and it will chart here. The expenses store is
            NOT_CONNECTED in this build, so no category total or share is shown.
          </EmptyState>
          <MonoLine>SPENDING: NOT_CONNECTED · NO_DATA</MonoLine>
        </Panel>

        <Panel title="Your cockpit at a glance">
          <EmptyState>
            Notes, tasks open, tasks done, projects, and expenses are all NO_DATA in this build — the local
            stores are not connected, so no count is claimed (a donut of zeros would be a lie about an empty
            cockpit).
          </EmptyState>
          <MonoLine>COCKPIT COUNTS: NOT_CONNECTED · NO_DATA</MonoLine>
        </Panel>

        <Panel title="API calls today (this device)">
          <EmptyState>
            No API calls recorded on this device today yet. Refresh a price or load news and the bars appear
            here. Full detail lives in the API Health panel on the dashboard — which also reports NO_DATA in this
            build.
          </EmptyState>
          <MonoLine>API USAGE: NOT_CONNECTED · NO_DATA</MonoLine>
        </Panel>
      </div>

      <Panel title="Earnings">
        <EmptyState>
          Earn has no earnings chart yet on purpose: there are no real earnings to chart until you connect a
          seller account or record income, and this screen will not invent any.
        </EmptyState>
        <MonoLine>EARNINGS CHART: NO_DATA — BY DESIGN, NOT BY ERROR</MonoLine>
      </Panel>
    </div>
  );
};
