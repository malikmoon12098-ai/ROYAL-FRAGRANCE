const cacheName = 'dev-ai-v1';
const assets = [
  '/',
  'index.html',
  'style.css',
  'app.js',
  'logo.svg',
  'manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});
