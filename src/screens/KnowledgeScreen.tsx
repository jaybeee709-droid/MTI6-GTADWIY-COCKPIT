// Knowledge — migrated from js/modules/vault.js
//
// The Knowledge Vault: the user's own notes (title, body, category,
// tags, pinned, archived), with Active / Research Archive / All
// views, text search, and a category filter. Notes live in the
// vanilla app's local IndexedDB "notes" store, which this React
// build does not read — so no note is shown here rather than an
// invented one, and the counts are NOT_CONNECTED, never zero.
//
// DISTINCT from Encyclopedia (already in the React app): the
// Encyclopedia is the canonical 60-entity Platform Brain taxonomy;
// the Vault is the user's personal notes. They are not merged.

import React, { useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { EmptyState, MonoLine, Panel, ScreenHeader, TabBar } from './shared';

const VIEWS = ['Active', 'Research Archive', 'All'] as const;
type VaultView = (typeof VIEWS)[number];

export const KnowledgeScreen: React.FC = () => {
  const [view, setView] = useState<VaultView>('Active');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const emptyText =
    view === 'Research Archive'
      ? 'The Research Archive is empty. Archive a note from the Active view to send it here.'
      : 'No notes yet. Create your first note to get started.';

  return (
    <div className="space-y-5 text-white">
      <ScreenHeader
        icon={BookOpen}
        title="Knowledge Vault"
        subtitle="Your notes — Active, Research Archive, All · search, categories, tags, pinned"
        note="Not the Encyclopedia: the Encyclopedia is the canonical Platform Brain taxonomy; the Vault is your personal notes. Notes live in the vanilla app's local store, which this build does not read."
      />

      <Panel>
        <TabBar tabs={VIEWS} active={view} onSelect={(t) => setView(t as VaultView)} />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#151515] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[#B8B8B8]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="w-full bg-transparent text-xs text-white placeholder-[#B8B8B8] outline-none"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#151515] px-3 py-2 text-xs text-white outline-none"
          >
            <option value="all">All categories</option>
          </select>
        </div>
        <p className="mt-3 text-xs text-[#B8B8B8]">
          No categories are listed: categories are derived from stored notes, and no notes are connected in this
          build.
        </p>
      </Panel>

      <Panel title={`Notes — ${view}`}>
        <EmptyState>
          {emptyText} The notes store is NOT_CONNECTED in this build, so this empty state is the honest one — no
          note title, body, tag, or category is claimed.
        </EmptyState>
        <MonoLine>NOTES: NOT_CONNECTED · NO_DATA · VIEW: {view.toUpperCase()}</MonoLine>
        <p className="mt-3 text-xs text-[#B8B8B8]">
          Vanilla note structure carried over for when the store connects: title, body (first 160 characters
          shown), category badge, #tags, pinned star, Updated timestamp, and Edit / Archive / Restore / Delete
          actions. New notes require a title or content before saving.
        </p>
      </Panel>
    </div>
  );
};
