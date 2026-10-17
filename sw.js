// Service worker: keeps a copy of the app so it works offline (research.md R10).
//
// Network first: when online, the newest files are always used (and the copy updated);
// when offline, the copy is used. Bump CACHE when the file list changes.

const CACHE = "alfinity-v1";
const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "js/debug.js",
  "js/defaults.js",
  "js/export.js",
  "js/fractal.js",
  "js/input.js",
  "js/main.js",
  "js/palette.js",
  "js/render/cpu.js",
  "js/render/gpu.js",
  "js/render/renderer.js",
  "js/render/shaders.js",
  "js/render/worker.js",
  "js/settings.js",
  "js/state.js",
  "js/storage.js",
  "js/ui/colors.js",
  "js/ui/details.js",
  "js/ui/download.js",
  "js/ui/favorites.js",
  "js/ui/image.js",
  "js/ui/julia.js",
  "js/ui/panel.js",
  "js/ui/status.js",
  "js/ui/toolbar.js",
  "js/view.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })
        .then((cached) => cached ?? caches.match("./"))),
  );
});
