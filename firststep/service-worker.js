const CACHE = 'firststep-beta-0.3.6';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=0.3.3',
  './mobile-fixes-0.3.4.css?v=0.3.4',
  './smart-venue-0.3.6.css?v=0.3.6',
  './app-0.3.3.js?v=0.3.3',
  './app-0.3.5-autotype.js?v=0.3.5',
  './smart-venue-0.3.6.js?v=0.3.6',
  './manifest.webmanifest?v=0.3.6',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin || event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate' || url.pathname.endsWith('/firststep/') || url.pathname.endsWith('/firststep/index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html')))
  );
});