import React, { useState } from 'react';
import {
  EXTENSION_INSTALL_STATE,
  buildExtensionSearchUrl,
  extensionStoreLabel,
  loadExtensionSearchHistory,
  recordExtensionSearch,
  type ExtensionSearchRecord,
  type ExtensionStore,
} from '../extension-search';

/**
 * EXTENSION SEARCH (v249 part 2) — a search tool, not a
 * directory: the owner types a query, picks a real store
 * (Chrome Web Store / Firefox Add-ons), and the search opens
 * the real store search page in a new browser tab. The panel
 * ALWAYS shows the honest state: NOT_SUPPORTED_IN_APP_BROWSER
 * — extensions cannot be installed or run inside the app's
 * browser; install happens in desktop Chrome/Firefox from the
 * store page. No fake listings, no fabricated extension
 * records, no hardcoded "recommended" extensions. History is
 * the owner's own searches only (query + store + time, capped
 * at 20, newest first); re-run re-opens the store URL.
 */
export function ExtensionSearchPanel() {
  const [query, setQuery] = useState('');
  const [store, setStore] = useState<ExtensionStore>('CHROME_WEB_STORE');
  const [history, setHistory] = useState<ExtensionSearchRecord[]>(() =>
    loadExtensionSearchHistory(),
  );
  const [msg, setMsg] = useState('');

  const runSearch = (q: string, s: ExtensionStore) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setMsg('ENTER A SEARCH TERM FIRST — THE STORE NEEDS A QUERY TO SEARCH.');
      return;
    }
    const url = buildExtensionSearchUrl(s, trimmed);
    window.open(url, '_blank', 'noopener,noreferrer');
    setHistory(recordExtensionSearch(trimmed, s));
    setMsg(
      `OPENED ${extensionStoreLabel(s).toUpperCase()} SEARCH IN A NEW TAB — INSTALL THE EXTENSION IN DESKTOP CHROME OR FIREFOX FROM THAT STORE PAGE, NOT IN THE APP.`,
    );
  };

  return (
    <div className="rounded-xl border border-[#8B5CFF]/40 bg-[#101010] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-[#8B5CFF]">
          EXTENSION SEARCH — SEARCH THE REAL EXTENSION STORES
        </span>
        <span className="font-mono text-[10px] text-[#FFB020]">{EXTENSION_INSTALL_STATE}</span>
      </div>
      <p className="font-mono text-[9px] leading-relaxed text-[#FFB020]">
        EXTENSIONS CANNOT BE INSTALLED OR RUN INSIDE THE APP'S BROWSER — THE APP IS A WEB PAGE,
        NOT A DESKTOP BROWSER. A SEARCH OPENS THE REAL STORE IN A NEW TAB; INSTALL THE EXTENSION
        IN DESKTOP CHROME OR FIREFOX FROM THAT STORE PAGE. NOTHING HERE INSTALLS, RUNS, OR LISTS
        EXTENSIONS IN THE APP.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runSearch(query, store);
          }}
          placeholder="Search for an extension…"
          aria-label="Extension search query"
          className="h-9 flex-1 min-w-[220px] rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none placeholder:text-[#666] focus:border-[#8B5CFF]"
        />
        <select
          value={store}
          onChange={(e) => setStore(e.target.value as ExtensionStore)}
          aria-label="Extension store"
          className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none focus:border-[#8B5CFF]"
        >
          <option value="CHROME_WEB_STORE">Chrome Web Store</option>
          <option value="FIREFOX_ADDONS">Firefox Add-ons</option>
        </select>
        <button
          type="button"
          onClick={() => runSearch(query, store)}
          aria-label="Search extensions"
          className="flex min-h-[36px] items-center rounded bg-[#8B5CFF] px-4 font-mono text-[10px] font-semibold text-white"
        >
          SEARCH EXTENSIONS
        </button>
      </div>
      {msg && <p className="font-mono text-[10px] leading-relaxed text-white">{msg}</p>}
      {history.length === 0 ? (
        <p className="font-mono text-[10px] text-[#B8B8B8]">
          NO SEARCHES YET — YOUR SEARCHES ARE RECORDED HERE ONLY (QUERY + STORE + TIME).
        </p>
      ) : (
        <div className="space-y-1">
          <span className="font-mono text-[10px] text-[#B8B8B8]">
            RECENT SEARCHES — RE-RUN RE-OPENS THE STORE SEARCH:
          </span>
          {history.map((r) => (
            <div
              key={`${r.store}:${r.query}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#050505] p-3"
            >
              <span className="text-xs text-white">
                {r.query}{' '}
                <span className="font-mono text-[9px] text-[#B8B8B8]">
                  · {extensionStoreLabel(r.store)} · {new Date(r.at).toLocaleString()}
                </span>
              </span>
              <button
                type="button"
                onClick={() => runSearch(r.query, r.store)}
                aria-label={`Re-run extension search ${r.query} ${extensionStoreLabel(r.store)}`}
                className="flex min-h-[36px] items-center rounded border border-[#8B5CFF]/60 px-3 font-mono text-[10px] text-white"
              >
                RE-RUN
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
