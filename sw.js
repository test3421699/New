const CACHE_NAME = 'html-explorer-v1';

// Static files to cache immediately on install
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json'
];

// Install Event: Cache the static shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Opened cache');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate Event: Clean up old caches if we update the version number
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Clearing old cache');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event: Decide how to serve responses
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // 1. Network-First Strategy for GitHub API & Raw contents
    // (Tries internet first, falls back to offline cache)
    if (url.hostname.includes('api.github.com') || url.hostname.includes('raw.githubusercontent.com')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Clone the response and save it to cache for offline use
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clonedResponse);
                    });
                    return response;
                })
                .catch(() => {
                    // If network fails (offline), return the cached version
                    return caches.match(event.request);
                })
        );
    } 
    // 2. Cache-First Strategy for local static assets (index.html, manifest, icons)
    else {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }
});