/* ====================================================================
   Okul Yönetim Paneli — Service Worker v7
   · Uygulama kabuğu çevrimdışı açılır
   · Ağır modüller ilk kurulumda değil, ihtiyaç anında runtime-cache edilir
   · Firestore verisi IndexedDB persistence ile yönetilir
   · Web push ve PWA cache TEK service worker üzerinden çalışır
   ==================================================================== */

const CACHE_ADI = 'oy-cache-v441';

/* Firebase Messaging artık ayrı firebase-messaging-sw.js yerine bu worker'da. */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCxLLlLCA0Deu7dcQchUWeY5cR5ur5FSkc",
  authDomain: "okul-6e302.firebaseapp.com",
  projectId: "okul-6e302",
  storageBucket: "okul-6e302.firebasestorage.app",
  messagingSenderId: "738103486583",
  appId: "1:738103486583:web:da91129b1a08f2463efe72"
});

const messaging = firebase.messaging();

/*
 * Yalnız gerçek uygulama kabuğu install sırasında önbelleğe alınır.
 * Optik, harita, Excel/PDF/Word görüntüleyici ve diğer ağır özellikler
 * kullanıcı ilgili ekrana girdiğinde fetch handler tarafından cache'e alınır.
 */
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
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_ADI).then((cache) => Promise.allSettled(
      ONBELLEGE_ALINACAKLAR.map(url =>
        cache.add(url).catch(err => console.warn('[SW] Önbelleklenemedi:', url, err))
      )
    ))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((isimler) => Promise.all(
      isimler.filter((i) => i !== CACHE_ADI).map((i) => caches.delete(i))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  /* Firestore/Auth ağ isteklerini SW cache katmanına sokma. */
  if (url.includes('googleapis.com') || url.includes('accounts.google.com')) {
    return;
  }

  /* Ağır optik modülü ilk kullanımda alınır ve runtime cache'e yazılır. */
  if (url.includes('/optik/')) {
    event.respondWith(
      fetch(event.request.url, { cache: 'reload' })
        .then((yanit) => {
          if (yanit && yanit.status === 200) {
            caches.open(CACHE_ADI).then(c => c.put(event.request, yanit.clone()));
          }
          return yanit;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  /* Ağır CDN kaynakları da ihtiyaç anında runtime cache'e alınır. */
  if (
    url.includes('cdnjs.cloudflare.com') ||
    url.includes('unpkg.com') ||
    url.includes('cdn.jsdelivr.net') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      fetch(event.request.url, { cache: 'reload' })
        .then((yanit) => {
          if (yanit && yanit.status === 200) {
            caches.open(CACHE_ADI).then(c => c.put(event.request, yanit.clone()));
          }
          return yanit;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_ADI).then(async (cache) => {
      const onbellek = await cache.match(event.request);
      const agIstegi = fetch(event.request.url, { cache: 'reload' })
        .then((yanit) => {
          if (yanit && yanit.status === 200) cache.put(event.request, yanit.clone());
          return yanit;
        })
        .catch(() => null);

      if (onbellek) {
        agIstegi.catch(() => {});
        return onbellek;
      }

      const agYanit = await agIstegi;
      if (agYanit) return agYanit;

      if (event.request.mode === 'navigate') {
        const kabuk = await cache.match('./index.html');
        if (kabuk) return kabuk;
      }

      return new Response('Çevrimdışı ve kaynak önbellekte bulunamadı.', {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    })
  );
});

/* Firebase web push: notification ve data-only mesajları tek yerde ele al. */
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const notification = payload.notification || {};
  const baslik = notification.title || data.baslik || 'Koruk Okul Paneli';
  const govde = notification.body || data.icerik || data.body || '';
  const kategori = data.kategori || null;

  return self.registration.showNotification(baslik, {
    body: govde,
    icon: data.icon || './assets/icon-192.png',
    badge: data.badge || './assets/icon-192.png',
    data: { ...data, kategori },
    tag: data.tag || (kategori ? `okul-${kategori}` : 'okul-panel'),
    renotify: true
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const kategori = event.notification.data && event.notification.data.kategori;
  const hedefUrl = kategori ? `./index.html?bildirimKategori=${encodeURIComponent(kategori)}` : './index.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes('index.html') || client.url.endsWith('/')) {
          if (kategori && 'postMessage' in client) {
            client.postMessage({ type: 'BILDIRIM_ACILDI', kategori });
          }
          return client.focus();
        }
      }
      return clients.openWindow(hedefUrl);
    })
  );
});
