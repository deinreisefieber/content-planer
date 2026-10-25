// Mit Internet wird immer die neueste Version geladen (max. 4 Sek. warten),
// ohne Internet kommt die gespeicherte Version. Wetterdaten (fremde Server) laufen am Cache vorbei.
const CACHE = 'content-planer-v3';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
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
