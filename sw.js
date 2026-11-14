/* MTI6-GTADWIY-COCKPIT — service worker
 * Caches the entire app shell so the app keeps working with no network at all.
 * All user data lives in IndexedDB on the device, never touched by this file.
 */

const CACHE_VERSION = "mti6-gtadwiy-cockpit-v31";
const APP_SHELL = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.json",
  "./css/style.css",
  "./js/utils.js",
  "./js/truth.js",
  "./js/api-client.js",
  "./js/db.js",
  "./js/backup.js",
  "./js/star-state.js",
  "./js/star-backend.js",
  "./js/star-router.js",
  "./js/star-command.js",
  "./js/api-registry.js",
  "./js/price-scout.js",
  "./js/knowledge.js",
  "./js/knowledge-model.js",
  "./js/github-dev.js",
  "./js/crypto-world.js",
  "./js/data/encyclopedia-batch-a.js",
  "./js/data/encyclopedia-canonical-60.js",
  "./js/data/encyclopedia-batch-b.js",
  "./js/encyclopedia-import.js",
  "./js/app.js",
  "./js/modules/star.js",
  "./js/tribes.js",
  "./js/bot-ops-model.js",
  "./js/nav.js",
  "./js/window-manager.js",
  "./js/participants.js",
  "./js/star-overlay.js",
  "./js/modules/prices.js",
  "./js/modules/api-health.js",
  "./js/modules/scouts.js",
  "./js/modules/devcenter.js",
  "./js/modules/crypto-world.js",
  "./js/modules/encyclopedia.js",
  "./js/encyclopedia-bridge.js",
  "./js/screens-nav.js",
  "./js/modules/globe.js",
  "./js/modules/crypto.js",
  "./js/modules/accounts.js",
  "./js/modules/earn.js",
  "./js/modules/web.js",
  "./js/modules/security.js",
  "./js/charts.js",
  "./js/modules/analytics.js",
  "./js/global-search.js",
  "./js/modules/dashboard.js",
  "./js/modules/vault.js",
  "./js/modules/tasks.js",
  "./js/modules/expenses.js",
  "./js/modules/projects.js",
  "./js/modules/settings.js",
  "./js/modules/bot-ops.js",
  "./js/modules/wallets.js",
  "./js/modules/opportunities.js",
  "./js/modules/positions.js",
  "./js/modules/operations.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/icon.svg",
  "./favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
  // v13 fix (Oct 31, 2026): the old "wait for the user to tap Reload" design
  // left phones stuck on stale shells (blank screens, missing search bar)
  // across rapid preview pushes. Take over immediately instead; app.js
  // already reloads the page on controllerchange, so the user lands on the
  // new version on their next visit instead of a stuck old one. The update
  // banner in app.js remains as a fallback prompt.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The page asks a waiting worker to take over immediately once the user
// accepts the "Reload" banner.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Cache-first for the app shell, with a network update-in-background for
// same-origin GET requests. Cross-origin GETs (public APIs such as
// CoinGecko, GitHub, Hacker News, Wikipedia, Open-Meteo) are NOT cached:
// the handler below returns early for them and lets the network answer.
// Page navigations that can't be served from cache AND fail on the network
// fall back to offline.html.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = req.mode === "navigate";

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          if (cached) return cached;
          if (isNavigation) return caches.match("./offline.html");
          return caches.match("./index.html");
        });
      return cached || networkFetch;
    })
  );
});
