/* ====================================================================
   Okul Yönetim Paneli — Service Worker v7
   · Uygulama kabuğu çevrimdışı açılır
   · Ağır modüller ilk kurulumda değil, ihtiyaç anında runtime-cache edilir
   · Firestore verisi IndexedDB persistence ile yönetilir
   · Web push ve PWA cache TEK service worker üzerinden çalışır
   ==================================================================== */

const CACHE_ADI = 'oy-cache-v444';

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCxLLlLCA0Deu7dcQch5e1c4R5ur5FSkc",
  authDomain: "okul-6e302.firebaseapp.com",
  projectId: "okul-6e302",
  storageBucket: "okul-6e302.firebasestorage.app",
  messagingSenderId: "738103486583",
  appId: "1:738103486583:web:da91129b1a08f2463efe72"
});

const messaging = firebase.messaging();

const ONBELLEGE_ALINACAKLAR = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './css/tasima-takip.css',
  './css/servis-denetim.css',
  './css/dilekce.css',
  './js/firebase-init.js',
  './js/auth.js',
  './js/ozellik-katalogu.js',
  './js/app.js',
  './js/ui.js',
  './js/push.js',
  './js/core/utils.js',
  './js/core/store.js',
  './js/core/event-bus.js',
  './js/alt-navigasyon.js',
  './js/ui-stability-fixes.js',
  './js/dashboard-mobile-v4.js',
  './js/dashboard-mobile-v4-polish.js',
  './js/dashboard-card-count-fix.js',
  './js/dashboard-mobile-v4-hotfix.js',
  './js/role-ui-hardening.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-180.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_ADI).then(cache =>
      Promise.allSettled(
        ONBELLEGE_ALINACAKLAR.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Önbelleklenemedi:', url, err))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(isimler =>
      Promise.all(isimler.filter(i => i !== CACHE_ADI).map(i => caches.delete(i)))
    )
  );
  self.clients.claim();
});

function apiIstegiMi(url) {
  return url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('securetoken.googleapis.com') ||
    url.includes('firebaseinstallations.googleapis.com') ||
    url.includes('fcmregistrations.googleapis.com');
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (apiIstegiMi(url)) return;

  const agIstegi = fetch(event.request).then(response => {
    if (response && response.status === 200 && response.type !== 'opaque') {
      const copy = response.clone();
      caches.open(CACHE_ADI).then(cache => cache.put(event.request, copy)).catch(() => {});
    }
    return response;
  });

  if (event.request.mode === 'navigate') {
    event.respondWith(
      agIstegi.catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const shell = await caches.match('./index.html');
        if (shell) return shell;
        return new Response('Çevrimdışı', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      })
    );
    return;
  }

  event.respondWith(
    agIstegi.catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response('Kaynak çevrimdışı kullanılamıyor.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })
  );
});

messaging.onBackgroundMessage(payload => {
  const n = payload && payload.notification ? payload.notification : {};
  const data = payload && payload.data ? payload.data : {};
  return self.registration.showNotification(n.title || 'Koruk İlk-Ortaokulu', {
    body: n.body || data.body || 'Yeni bir bildiriminiz var.',
    icon: n.icon || './assets/icon-192.png',
    badge: './assets/icon-192.png',
    data: { url: data.url || data.link || './' }
  });
});

self.addEventListener('push', event => {
  if (event.data) return;
  event.waitUntil(
    self.registration.showNotification('Koruk İlk-Ortaokulu', {
      body: 'Yeni bir bildiriminiz var.',
      icon: './assets/icon-192.png',
      badge: './assets/icon-192.png',
      data: { url: './' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const hedef = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
      for (const w of windows) {
        if ('focus' in w) {
          if ('navigate' in w) w.navigate(hedef);
          return w.focus();
        }
      }
      return clients.openWindow ? clients.openWindow(hedef) : null;
    })
  );
});
