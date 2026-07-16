// Deliberately not versioned up when assets are *added*: `activate` purges
// every cache except this one, so renaming it would drop the shell entries a
// user already has and leave them with an empty cache until the next online
// visit refills it. The fetch handler below is network-first, so freshness
// comes from the network anyway — cache busting buys nothing here.
const CACHE_NAME = "offline-companion-shell-v1";

self.addEventListener("install", (event) => {
  // KaTeX fetches its fonts lazily, only when a formula first renders. The
  // network-first handler below covers that fine while online, but a student
  // whose first equation happens offline would get a page of fallback glyphs.
  // Precache them up front so math renders offline even if none was ever
  // shown online. Best-effort per asset: one 404 must not reject install and
  // leave the app with no service worker at all.
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const res = await fetch("/katex/precache.json", { cache: "no-cache" });
        const urls = await res.json();
        await Promise.all(urls.map((url) => cache.add(url).catch(() => {})));
      } catch {
        // Manifest missing or offline — fonts fall back to runtime caching.
      }
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first for same-origin app shell requests, falling back to cache when
// offline. Model weight downloads (huggingface.co, MLC CDN) are left untouched —
// WebLLM manages its own Cache Storage entry for those.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
