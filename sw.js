const CACHE_NAME = "reading-journal-v3";

function assetUrl(path) {
  return new URL(path, self.location).href;
}

const APP_SHELL = [
  assetUrl("./"),
  assetUrl("./index.html"),
  assetUrl("./styles.css"),
  assetUrl("./src/app.js"),
  assetUrl("./src/config.js"),
  assetUrl("./src/lib/date.js"),
  assetUrl("./src/lib/storage.js"),
  assetUrl("./src/lib/text.js"),
  assetUrl("./src/state/journal.js"),
  assetUrl("./src/services/naverBooks.js"),
  assetUrl("./src/ui/render.js"),
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

  if (request.url.includes("/api/books/search")) {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html")));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html")));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
