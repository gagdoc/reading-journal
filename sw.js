const CACHE_NAME = "reading-journal-v2";

function assetUrl(path) {
  return new URL(path, self.location).href;
}

const APP_SHELL = [
  assetUrl("./"),
  assetUrl("./index.html"),
  assetUrl("./styles.css?v=15"),
  assetUrl("./src/app.js?v=25"),
  assetUrl("./src/config.js?v=7"),
  assetUrl("./src/lib/date.js?v=7"),
  assetUrl("./src/lib/storage.js?v=7"),
  assetUrl("./src/lib/text.js?v=7"),
  assetUrl("./src/state/journal.js?v=8"),
  assetUrl("./src/services/naverBooks.js?v=8"),
  assetUrl("./src/ui/render.js?v=10"),
  assetUrl("./manifest.webmanifest"),
  assetUrl("./icon.svg"),
  assetUrl("./apple-touch-icon.png"),
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.destination === "script" || request.destination === "style" || /\.(js|css)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.includes("/api/books/search")) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match(assetUrl("./index.html"));
  }
}
