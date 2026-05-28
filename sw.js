// Number Your Days — service worker
//
// Strategy: stale-while-revalidate for same-origin GET requests.
// Returns the cached copy immediately and updates the cache in the background
// so users see fresh content on their next visit. Fully offline-capable after
// the first successful load (the entire site is one HTML file with fonts
// inlined — no other assets to cache).
//
// Bump CACHE_NAME on every shipped change to evict the old cache cleanly.

const CACHE_NAME = "nyd-v1";
const PRECACHE = ["./", "./index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  // Activate the new SW immediately rather than waiting for all tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Skip cross-origin (Beehiiv embed, fonts.googleapis if ever added, etc.)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const networkFetch = fetch(req)
        .then((resp) => {
          if (resp && resp.ok && resp.type === "basic") cache.put(req, resp.clone());
          return resp;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
