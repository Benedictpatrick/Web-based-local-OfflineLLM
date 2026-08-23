const CACHE_NAME = "offline-companion-shell-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const res = await fetch("/katex/precache.json", { cache: "no-cache" });
        const urls = await res.json();
        await Promise.all(urls.map((url) => cache.add(url).catch(() => {})));
      } catch {}
    })()
  );
  // No self.skipWaiting() here: activating a new worker immediately would
  // take over an already-open tab mid-session, leaving its already-loaded
  // JS running against newly-served (mismatched) asset chunks. Instead this
  // worker sits in "waiting" until the page explicitly asks it to take over
  // (see the SKIP_WAITING message handler below and RegisterServiceWorker.tsx),
  // which only happens once the user accepts the "update available" prompt
  // and the page is about to reload anyway.
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
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
