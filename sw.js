/* MTI6-GTADWIY-COCKPIT — service worker
 * Caches the entire app shell so the app keeps working with no network at all.
 * All user data lives in IndexedDB on the device, never touched by this file.
 */

const CACHE_VERSION = "mti6-gtadwiy-cockpit-v8";
const APP_SHELL = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.json",
  "./css/style.css",
  "./js/utils.js",
  "./js/db.js",
  "./js/backup.js",
  "./js/star-state.js",
  "./js/star-backend.js",
  "./js/star-router.js",
  "./js/api-registry.js",
  "./js/price-scout.js",
  "./js/knowledge.js",
  "./js/app.js",
  "./js/modules/star.js",
  "./js/modules/prices.js",
  "./js/modules/api-health.js",
  "./js/modules/scouts.js",
  "./js/modules/dashboard.js",
  "./js/modules/vault.js",
  "./js/modules/tasks.js",
  "./js/modules/expenses.js",
  "./js/modules/projects.js",
  "./js/modules/settings.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/icon.svg",
  "./favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
  // Deliberately NOT calling self.skipWaiting() here: a new worker should sit
  // in "waiting" until the user agrees to reload (see app.js's update banner),
  // so an update never yanks the UI out from under someone mid-edit.
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
// same-origin GET requests. Everything is same-origin — this app makes no
// cross-origin network calls at all. Page navigations that can't be served
// from cache AND fail on the network fall back to offline.html.
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
