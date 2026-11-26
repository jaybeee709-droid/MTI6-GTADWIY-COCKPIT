/**
 * Extension Search (v249 part 2): search the real extension
 * stores from the app — Chrome Web Store and Firefox Add-ons.
 *
 * WHAT THIS IS — and what it is NOT:
 * - The app is a React web app. It has NO WebView that can
 *   install or run browser extensions. The app's browser cannot
 *   install or run an extension — it is a web page, not a
 *   desktop browser. That state is NOT_SUPPORTED_IN_APP_BROWSER
 *   and the panel shows it always.
 * - The desktop path: a search opens the real store search page
 *   in a new browser tab FOR THE OWNER; he installs the
 *   extension in desktop Chrome or Firefox from that store page.
 *   The app never claims an extension is installed, running, or
 *   available in the app.
 * - This is a search tool, not a directory: no fake listings,
 *   no fabricated extension records, no hardcoded "recommended"
 *   extensions. Only the query, the store, and the time are
 *   recorded, in localStorage, capped at 20, newest first.
 * - The store hosts are NOT part of the v245 Bot Browser
 *   governed session — that session stays scoped to github.com
 *   + this repo + development only. Extension search opens store
 *   pages in a real browser tab, outside the governed flow.
 */

export type ExtensionStore = 'CHROME_WEB_STORE' | 'FIREFOX_ADDONS';

/** The app's browser cannot install or run an extension — it is
 * a web page, not a desktop browser. The desktop path is to
 * install in desktop Chrome/Firefox via the store link. */
export type ExtensionInstallState = 'NOT_SUPPORTED_IN_APP_BROWSER' | 'DESKTOP_INSTALL_VIA_STORE';

export const EXTENSION_INSTALL_STATE: ExtensionInstallState =
  'NOT_SUPPORTED_IN_APP_BROWSER';

export const EXTENSION_SEARCH_HISTORY_KEY = 'mti6_extension_search_history_v1';
const MAX_EXTENSION_SEARCH_HISTORY = 20;

export interface ExtensionSearchRecord {
  query: string;
  store: ExtensionStore;
  at: string;
}

export function extensionStoreLabel(store: ExtensionStore): string {
  return store === 'CHROME_WEB_STORE' ? 'Chrome Web Store' : 'Firefox Add-ons';
}

/** The real store search URL for a query. Empty queries build
 * no URL — the panel refuses them before this is called. */
export function buildExtensionSearchUrl(store: ExtensionStore, query: string): string {
  const q = encodeURIComponent(query.trim());
  if (store === 'CHROME_WEB_STORE') {
    return `https://chromewebstore.google.com/search/${q}`;
  }
  return `https://addons.mozilla.org/en-US/firefox/search/?q=${q}`;
}

const stamp = (): string => new Date().toISOString();

function isValidRecord(r: unknown): r is ExtensionSearchRecord {
  return (
    !!r &&
    typeof r === 'object' &&
    typeof (r as ExtensionSearchRecord).query === 'string' &&
    ((r as ExtensionSearchRecord).store === 'CHROME_WEB_STORE' ||
      (r as ExtensionSearchRecord).store === 'FIREFOX_ADDONS') &&
    typeof (r as ExtensionSearchRecord).at === 'string'
  );
}

export function loadExtensionSearchHistory(): ExtensionSearchRecord[] {
  try {
    const raw = localStorage.getItem(EXTENSION_SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidRecord);
  } catch {
    return [];
  }
}

/** Record a search, newest first, capped at 20. Re-running the
 * same query on the same store refreshes its time instead of
 * duplicating the row. */
export function recordExtensionSearch(
  query: string,
  store: ExtensionStore,
): ExtensionSearchRecord[] {
  const q = query.trim();
  if (!q) return loadExtensionSearchHistory();
  const rec: ExtensionSearchRecord = { query: q, store, at: stamp() };
  const rest = loadExtensionSearchHistory().filter(
    (r) => !(r.query === q && r.store === store),
  );
  const next = [rec, ...rest].slice(0, MAX_EXTENSION_SEARCH_HISTORY);
  try {
    localStorage.setItem(EXTENSION_SEARCH_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — the history stays in memory this run */
  }
  return next;
}

export function extensionSearchSummary(): {
  state: ExtensionInstallState;
  historyCount: number;
  lastSearch: ExtensionSearchRecord | null;
} {
  const history = loadExtensionSearchHistory();
  return {
    state: EXTENSION_INSTALL_STATE,
    historyCount: history.length,
    lastSearch: history[0] ?? null,
  };
}

export function extensionSearchSummaryText(): string {
  const s = extensionSearchSummary();
  const last = s.lastSearch
    ? ` Latest recorded search: "${s.lastSearch.query}" on ${extensionStoreLabel(s.lastSearch.store)} at ${new Date(s.lastSearch.at).toLocaleString()}.`
    : ' No searches recorded yet.';
  return `From the platform's own records: extension search is ${s.state} — the app's browser cannot install or run extensions; it is a web page, not a desktop browser. The Extension Search panel on Bot Operations searches the real Chrome Web Store and Firefox Add-ons: a search opens the real store search page in a new browser tab, and the owner installs the extension in desktop Chrome or Firefox from that store page. ${s.historyCount} search(es) recorded in history.${last} No extension is installed, running, or available in the app — the panel is a search tool, not a directory, and it lists no extensions of its own.`;
}
