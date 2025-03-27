const CACHE_NAME = 'speedtest-cache-v1.0'; // Changed cache name
const urlsToCache = [
    '/speedtest',
    '/speedtest/index.html',
    '/speedtest/style.css',
    '/speedtest/light.css',
    '/speedtest/dark.css',
    '/speedtest/script.js',
    '/speedtest/192x192.png',
    '/speedtest/512x512.png'
];

// Network First Strategy
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        // Check if we received a valid response
        if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        } else {
             // If network fails or returns an error, try the cache
             console.log('Network request failed, trying cache for:', request.url);
             const cachedResponse = await caches.match(request);
             return cachedResponse || new Response("Network error and not in cache", { status: 404 });
        }
    } catch (error) {
        console.error('Fetch failed; returning cache or error for:', request.url, error);
        const cachedResponse = await caches.match(request);
        // If cache is also empty, return a specific error or fallback page
        return cachedResponse || new Response("Offline and not in cache", { status: 503 });
    }
}

self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell...');
                // Use addAll() which takes an array of URLs
                return cache.addAll(urlsToCache);
            })
            .then(() => console.log('Service Worker: App shell cached successfully'))
            .catch(error => console.error('Service Worker: Failed to cache app shell:', error))
    );
});

self.addEventListener('fetch', event => {
    console.log('Service Worker: Fetching', event.request.url);
    // Use Network First Strategy for all requests
    event.respondWith(networkFirst(event.request));
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => console.log('Service Worker: Activated successfully'))
    );
}); 