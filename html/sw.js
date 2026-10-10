const CACHE_NAME = 'japan-trip-cache-v1';
const STATIC_ASSETS = [
  './itinerary-full-v2.html',
  './manifest.json',
  '../ticket/00_toyoko_inn_haneda_airport_1.png',
  '../ticket/01_toyoko_inn_asakusabashi_1.png',
  '../ticket/01_toyoko_inn_asakusabashi_2.png',
  '../ticket/02_kuretake_inn_fujinomiya.png',
  '../ticket/03_hotel_associa_shizuoka.png',
  '../ticket/04_habitacion_station_kawaguchiko.png',
  '../ticket/05_hotel_little_bird_oku_asakusa.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignore Firebase WebSocket and RTDB calls
  if (url.origin.includes('firebase') || url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Network-first for HTML, Cache-first for images/fonts
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('./itinerary-full-v2.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        return response;
      }).catch(() => {
        // Fallback for images if needed
        return null;
      });
    })
  );
});
