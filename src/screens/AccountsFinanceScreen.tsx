// Accounts & Finance — migrated from js/modules/accounts.js
//
// Read-only. Everything about money in one place, labelled honestly:
// cockpit money already in the app (Resource Tracker) and live crypto
// prices are shown or linked; selling channels are a research list,
// NOT live balances — no seller balance appears until the owner opens
// that seller account themselves (identity/bank verification is
// required for payouts) and connects it with a token through a
// server-side proxy. The store search is a BUYER catalog search
// (Shopify storefront), not a seller balance.
//
// PriceScout is not wired in this build, so the buyer-catalog search
// cannot run here either — it reports NOT_CONNECTED rather than
// returning invented offers.

import React, { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { EmptyState, MonoLine, Panel, ScreenHeader, StatusPill } from './shared';

const CHANNELS: { name: string; note: string }[] = [
  {
    name: 'Shopify',
    note: 'Sell through your own store. Payouts require identity and bank verification. Balance: not connected — needs your store owner token + server proxy.',
  },
  {
    name: 'Amazon Seller',
    note: 'Sell on a major marketplace. Payouts require identity, tax, and bank verification. Balance: not connected.',
  },
  {
    name: 'eBay',
    note: 'Sell new and used items. Payouts require identity and bank verification. Balance: not connected.',
  },
  {
    name: 'Etsy',
    note: 'Sell handmade, vintage, and craft supplies. Payouts require identity and bank verification. Balance: not connected.',
  },
  {
    name: 'Temu (seller)',
    note: "Sell through Temu's marketplace. Seller onboarding requires business verification. Balance: not connected.",
  },
  {
    name: 'Alibaba',
    note: 'Wholesale and supplier selling. Supplier onboarding requires business verification. Balance: not connected.',
  },
];

export const AccountsFinanceScreen: React.FC = () => {
  const [store, setStore] = useState('');
  const [product, setProduct] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const search = () => {
    if (!store.trim() || !product.trim()) {
      setResult('Enter a Shopify store domain and a product name first.');
      return;
    }
    setResult(
      'Buyer catalog search is NOT_CONNECTED in this build — PriceScout is not wired here, so no store catalog can be searched and no offer is shown.',
    );
  };

  return (
    <div className="space-y-5 text-white">
      <ScreenHeader
        icon={Briefcase}
        title="Our Accounts"
        subtitle="All of your money in one place — as far as it can honestly be shown today"
        note="No balance is ever guessed. Cockpit expenses live in Resource Tracker; selling-channel balances appear only after you open that seller account yourself and connect it."
      />

      <Panel title="Selling channels">
        <div className="space-y-3">
          {CHANNELS.map((c) => (
            <div key={c.name} className="rounded-xl bg-[#151515] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">{c.name}</span>
                <StatusPill status="NOT_CONNECTED" />
              </div>
              <p className="mt-1 text-xs text-[#B8B8B8]">{c.note}</p>
            </div>
          ))}
        </div>
        <MonoLine>SELLING CHANNELS: 6 LISTED · 0 BALANCES CLAIMED</MonoLine>
      </Panel>

      <Panel title="Shopify store search (buyer catalog)">
        <p className="mb-3 text-xs text-[#B8B8B8]">
          Buyer catalog search only — this is not your seller balance.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={store}
            onChange={(e) => setStore(e.target.value)}
            placeholder="Shopify store domain, e.g. allbirds.com"
            aria-label="Shopify store domain"
            className="flex-1 rounded-xl border border-white/10 bg-[#151515] px-3 py-2 text-xs text-white placeholder-[#B8B8B8] outline-none"
          />
          <input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="Product name"
            aria-label="Product name"
            className="flex-1 rounded-xl border border-white/10 bg-[#151515] px-3 py-2 text-xs text-white placeholder-[#B8B8B8] outline-none"
          />
          <button
            onClick={search}
            className="shrink-0 rounded-xl bg-[#00B7FF] px-4 py-2 text-xs font-semibold text-black transition hover:opacity-90"
          >
            Search store
          </button>
        </div>
        <div className="mt-3">
          {result ? (
            <EmptyState>{result}</EmptyState>
          ) : (
            <p className="text-xs text-[#B8B8B8]">
              Enter a store domain and a product name to check that store's public catalog (the same catalog its
              own themes use). There is no universal free product-price API, so general retail lookup needs a
              retailer/catalog source configured server-side.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
};
