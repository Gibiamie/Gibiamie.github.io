const CACHE = 'firststep-beta-0.3.2-github';
const ASSETS = [
  './', './index.html', './styles.css?v=0.3.2', './bundle-loader.js?v=0.3.2', './bundle.part1.txt', './bundle.part2.txt', './bundle.part3.txt', './bundle.part4.txt', './bundle.part5.txt', './bundle.part6.txt', './bundle.part7.txt', './bundle.part8.txt',
  './manifest.webmanifest', './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin || event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match('./index.html')))
  );
});
