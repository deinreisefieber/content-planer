// Mit Internet wird immer die neueste Version geladen (max. 4 Sek. warten),
// ohne Internet kommt die gespeicherte Version. Wetterdaten (fremde Server) laufen am Cache vorbei.
// Fotos von Wikimedia werden einmal geladen und bleiben dauerhaft offline verfügbar.
const CACHE = 'content-planer-v12';
const IMG_CACHE = 'planer-fotos';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== IMG_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname === 'upload.wikimedia.org') {
    e.respondWith(caches.open(IMG_CACHE).then(async cache => {
      const hit = await cache.match(e.request.url);
      if (hit) return hit;
      const res = await fetch(e.request.url, { mode: 'no-cors' });
      cache.put(e.request.url, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(e.request, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    } catch (err) {
      clearTimeout(timer);
      return (await cache.match(e.request, { ignoreSearch: true })) || Response.error();
    }
  })());
});
