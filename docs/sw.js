// PondMaster — Service Worker v1.0.0
// Network-first for app files, cache as fallback for offline
// Background sync for daily logs

const CACHE_NAME = 'pondmaster-static-v1.0.0';
const SHELL_ASSETS = [
  './',
  './index.html',
  './auth.html',
  './dashboard.html',
  './pond.html',
  './calendar.html',
  './reports.html',
  './settings.html',
  './offline.html',
  './404.html',
  './demo.html',
  './privacy.html',
  './css/style.css',
  './js/app.js',
  './js/supabase.js',
  './js/theme.js',
  './js/growth.js',
  './js/pwa.js',
  './js/tour.js',
  './js/charts.js',
  './js/ai-chat.js',
  './js/demo-data.js',
  './manifest.json'
];

// Install: cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(SHELL_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  // Skip Supabase API calls
  if (url.hostname.includes('supabase')) return;

  // Skip AI provider API calls
  if (url.hostname.includes('api.openai.com') ||
      url.hostname.includes('api.anthropic.com') ||
      url.hostname.includes('api.deepseek.com') ||
      url.hostname.includes('generativelanguage.googleapis.com')) return;

  // CDN resources — network first, cache fallback
  if (url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('unpkg.com')) {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Local assets — network first, cache fallback (ensures updates are seen)
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        return caches.match(event.request, { ignoreSearch: true }).then(cached => {
          if (cached) return cached;
          // Navigation fallback to offline page
          if (event.request.mode === 'navigate') {
            return caches.match('./offline.html');
          }
        });
      })
    );
  }
});

// Background sync for offline daily logs
self.addEventListener('sync', event => {
  if (event.tag === 'sync-daily-logs') {
    event.waitUntil(syncOfflineLogs());
  }
});

async function syncOfflineLogs() {
  try {
    // Open IndexedDB and process queued logs
    const db = await openDB();
    const tx = db.transaction('offline-logs', 'readonly');
    const store = tx.objectStore('offline-logs');
    const logs = await getAllFromStore(store);

    if (logs.length === 0) return;

    // Notify clients about sync start
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'sync-start', count: logs.length });
    });

    // Process each log (actual Supabase posting handled by client)
    clients.forEach(client => {
      client.postMessage({ type: 'sync-logs', logs: logs });
    });
  } catch (err) {
    console.error('[SW] Sync failed:', err);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pondmaster-offline', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('offline-logs')) {
        db.createObjectStore('offline-logs', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Push notification handler (for future use)
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'PondMaster', {
      body: data.body || '',
      icon: './icons/icon-192.png',
      badge: './icons/icon-72.png',
      data: data.url || './'
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data)
  );
});
