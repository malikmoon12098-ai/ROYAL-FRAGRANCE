const CACHE_NAME = 'abu-asim-admin-v1';
const ASSETS = [
    '/admin/dashboard.html',
    '/admin/css/admin.css',
    '/admin/js/admin.js',
    '/assets/logo.png',
    '/css/main.css',
    '/js/data.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
