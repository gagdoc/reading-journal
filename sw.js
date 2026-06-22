const CACHE_NAME = "reading-journal-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/src/app.js",
  "/src/config.js",
  "/src/lib/date.js",
  "/src/lib/storage.js",
  "/src/lib/text.js",
  "/src/state/journal.js",
  "/src/services/naverBooks.js",
  "/src/ui/render.js",
  "/manifest.webmanifest",
  "/icon.svg"
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
