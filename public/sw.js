// ──────────────────────────────────────────────
// WPS Service ERP — Service Worker
// Phase 2: Offline caching (cache-first for static, network-first for API)
// Phase 3: Push notifications + Background Sync
// ──────────────────────────────────────────────

const CACHE_NAME = 'wps-v1';
const STATIC_ASSETS = ['/', '/dashboard', '/offline'];

// ──────────────────────────────────────────────
// Install — ön belleğe kritik statik dosyaları al
// ──────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// ──────────────────────────────────────────────
// Activate — eski cache'leri temizle
// ──────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

// ──────────────────────────────────────────────
// Fetch — cache-first for static, network-first for API
// ──────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API istekleri: network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Statik assetler: cache-first
  if (request.method === 'GET') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Diğer her şey: network
  event.respondWith(fetch(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Çevrimdışı ve cache'de yok → offline sayfası
    if (request.destination === 'document') {
      const offlinePage = await caches.match('/offline');
      if (offlinePage) return offlinePage;
    }
    return new Response('Çevrimdışı', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    return new Response(JSON.stringify({ error: 'Çevrimdışı — istek kuyruğa alındı' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ──────────────────────────────────────────────
// Push Bildirimleri
// ──────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    const title = data.title ?? 'WPS Service';
    const options = {
      body: data.body ?? '',
      icon: data.icon ?? '/icon-192.png',
      badge: data.badge ?? '/icon-72.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url ?? '/dashboard',
      },
      actions: [
        { action: 'open', title: 'Aç' },
        { action: 'close', title: 'Kapat' },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    // Düz metin bildirim
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('WPS Service', {
        body: text,
        icon: '/icon-192.png',
        badge: '/icon-72.png',
        vibrate: [200, 100, 200],
        data: { url: '/dashboard' },
      }),
    );
  }
});

// ──────────────────────────────────────────────
// Bildirim Tıklaması
// ──────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data?.url ?? '/dashboard';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Açık bir pencere varsa ona odaklan
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'NAVIGATE', url: targetUrl });
            return;
          }
        }
        // Açık pencere yoksa yeni pencere aç
        return clients.openWindow(targetUrl);
      }),
  );
});

// ──────────────────────────────────────────────
// Background Sync
// ──────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  const tag = event.tag;

  if (tag === 'sync-forms' || tag === 'sync-photos' || tag === 'sync-payments') {
    event.waitUntil(handleSyncEvent(tag));
  }
});

async function handleSyncEvent(tag) {
  // Tüm açık client'lara sync olayını bildir
  // Client tarafındaki sync-queue.ts syncAll() fonksiyonunu tetikler
  const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });

  const message = {
    type: 'SYNC_TRIGGER',
    tag,
    timestamp: Date.now(),
  };

  for (const client of allClients) {
    client.postMessage(message);
  }

  // Eğer açık client yoksa, sync etiketi bir sonraki açılışta işlenmek üzere kalır
  if (allClients.length === 0) {
    console.log(`[sw] ${tag} için açık client bulunamadı — bir sonraki oturumda işlenecek`);
  }
}

// ──────────────────────────────────────────────
// Message handler — client'tan gelen mesajlar
// ──────────────────────────────────────────────

self.addEventListener('message', (event) => {
  const { type } = event.data;

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (type === 'SYNC_TRIGGER') {
    // Client'tan manuel sync tetikleme
    handleSyncEvent(event.data.tag ?? 'sync-forms');
  }
});
