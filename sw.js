const CACHE_NAME = 'speedtest-cache-v1.0';
const FONT_CACHE_NAME = 'font-cache-v1.0';
const urlsToCache = [
    '/speedtest/',
    '/speedtest/index.html',
    '/speedtest/style.css',
    '/speedtest/light.css',
    '/speedtest/dark.css',
    '/speedtest/script.js',
    '/speedtest/192x192.png',
    '/speedtest/512x512.png'
];

// Enhanced Network First Strategy with timeout
async function networkFirst(request) {
    // For font files and external resources, cache them separately
    if (request.url.includes('cdnjs.cloudflare.com')) {
        return cacheFirst(request, FONT_CACHE_NAME);
    }

    try {
        // Define a timeout for the network request
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Network request timeout')), 3000);
        });
        
        // Race between network request and timeout
        const networkResponse = await Promise.race([
            fetch(request.clone()),
            timeoutPromise
        ]);
        
        // If network is successful, update cache and return response
        if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
            console.log('Network request successful, cached for:', request.url);
            return networkResponse;
        } else {
            // Network responded but with an error status
            console.log('Network responded with error, trying cache for:', request.url);
            const cachedResponse = await caches.match(request);
            
            if (cachedResponse) {
                console.log('Found in cache:', request.url);
                return cachedResponse;
            }
            
            // If no cached version, return network response anyway or a fallback
            return networkResponse || createOfflineResponse(request);
        }
    } catch (error) {
        console.error('Network request failed, using cache for:', request.url, error);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            console.log('Serving from cache:', request.url);
            return cachedResponse;
        }
        
        // If not in cache, return a custom offline response
        return createOfflineResponse(request);
    }
}

// Cache First strategy for external resources like fonts
async function cacheFirst(request, cacheName = CACHE_NAME) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('Failed to fetch and cache:', request.url);
        return new Response("Resource unavailable", { status: 503 });
    }
}

// Create appropriate offline response based on request type
function createOfflineResponse(request) {
    // If it's an HTML page request
    if (request.headers.get('Accept').includes('text/html')) {
        return new Response(
            `<html><body>
                <h1>یک خطای اتصال رخ داده است</h1>
                <p>لطفاً اتصال اینترنت خود را بررسی کنید</p>
            </body></html>`, 
            { 
                status: 503, 
                headers: { 'Content-Type': 'text/html; charset=UTF-8' } 
            }
        );
    }
    
    // For API requests or other resources
    return new Response("Offline", { status: 503 });
}

self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    // Immediately take control of the page
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell...');
                return cache.addAll(urlsToCache);
            })
            .then(() => console.log('Service Worker: App shell cached successfully'))
            .catch(error => console.error('Service Worker: Failed to cache app shell:', error))
    );
});

self.addEventListener('fetch', event => {
    console.log('Service Worker: Fetching', event.request.url);
    event.respondWith(networkFirst(event.request));
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    // Claim clients so the service worker starts controlling current pages
    self.clients.claim();
    
    const cacheWhitelist = [CACHE_NAME, FONT_CACHE_NAME];
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