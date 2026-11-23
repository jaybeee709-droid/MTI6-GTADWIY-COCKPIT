// Resource Tracker — migrated from js/modules/expenses.js
//
// A local ledger only: entries are Expense / Asset / Purchase, with
// description, amount, category, and date, grouped by month, with a
// category breakdown. NO payment or financial-transaction features.
// Entries live in the vanilla app's local IndexedDB "expenses"
// store, which this React build does not read — so every total here
// is UNAVAILABLE, never zero: a zero would claim the month was
// measured and nothing was spent, which is false when the store is
// not connected.

import React, { useState } from 'react';
import { Wallet } from 'lucide-react';
import { EmptyState, MonoLine, Panel, ScreenHeader } from './shared';

const KINDS = [
  { id: 'expense', label: 'Expense' },
  { id: 'asset', label: 'Asset' },
  { id: 'purchase', label: 'Purchase' },
] as const;

export const ResourceTrackerScreen: React.FC = () => {
  const [kindFilter, setKindFilter] = useState('all');

  return (
    <div className="space-y-5 text-white">
      <ScreenHeader
        icon={Wallet}
        title="Resource Tracker"
        subtitle="Local ledger only — expenses, assets & purchases by month · no payment or transaction features"
        note="Entries live in the vanilla app's local store, which this build does not read — every total is UNAVAILABLE, never zero."
      />

      <Panel>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#151515] px-3 py-2 text-xs text-white outline-none"
            aria-label="Filter by kind"
          >
            <option value="all">All kinds</option>
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
          <span className="rounded-xl border border-white/10 bg-[#151515] px-3 py-2 text-xs text-[#B8B8B8]">
            Month: NOT_CONNECTED — months are derived from stored entries
          </span>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Month total', sub: 'NOT_CONNECTED — month not selected from any store' },
          { label: 'Running total (all time)', sub: 'NOT_CONNECTED — no entries counted' },
          { label: 'Top category', sub: 'NOT_CONNECTED — no breakdown measured' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-[#101010] p-4">
            <div className="text-xs text-[#B8B8B8]">{card.label}</div>
            <div className="mt-2 text-xl font-bold">UNAVAILABLE</div>
            <div className="mt-1 text-xs text-[#B8B8B8]">{card.sub}</div>
          </div>
        ))}
      </div>

      <Panel title="Category Breakdown">
        <EmptyState>
          No expenses to break down yet this month. The expenses store is NOT_CONNECTED in this build, so no
          category share is shown — a breakdown bar would claim a measured total.
        </EmptyState>
        <MonoLine>BREAKDOWN: NOT_CONNECTED · NO_DATA</MonoLine>
      </Panel>

      <Panel title="Expenses, Assets & Purchases This Month">
        <EmptyState>
          Nothing logged for this month and filter yet. Kind filter: {kindFilter === 'all' ? 'All kinds' : kindFilter}.
        </EmptyState>
        <MonoLine>ENTRIES: NOT_CONNECTED · NO_DATA</MonoLine>
        <p className="mt-3 text-xs text-[#B8B8B8]">
          Vanilla entry structure carried over for when the store connects: kind badge (Expense / Asset /
          Purchase), category badge, date, amount, and Edit / Delete actions. New entries require a description
          and an amount of zero or more.
        </p>
      </Panel>
    </div>
  );
};
