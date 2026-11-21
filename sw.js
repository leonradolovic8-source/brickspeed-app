// Offline cache for the BrickSpeed app. Bump VERSION when you upload new files.
const VERSION = 'bs-1.19.3';
const FILES = ['./', 'index.html', 'ble-web.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))));
  self.clients.claim();
});
// network first (so updates arrive), cache when offline
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(VERSION).then((ca) => ca.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
