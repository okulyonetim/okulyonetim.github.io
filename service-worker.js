/* ====================================================================
   Okul Yönetim Paneli — Service Worker v6
   · Uygulama kabuğu çevrimdışı açılır
   · Firestore verisi IndexedDB persistence ile yönetilir
   · Web push ve PWA cache TEK service worker üzerinden çalışır
   ==================================================================== */

const CACHE_ADI = 'oy-cache-v432';

/* Firebase Messaging artık ayrı firebase-messaging-sw.js yerine bu worker'da.
   Böylece aynı /okul/ scope'u için iki service worker birbiriyle yarışmaz. */
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

/* ---- Önbelleğe alınacak uygulama dosyaları ---- */
const ONBELLEGE_ALINACAKLAR = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './css/tasima-takip.css',
  './css/servis-denetim.css',
  './css/dilekce.css',
  './optik/index.html',
  './optik/js/app.js',
  './optik/js/camera.js',
  './optik/js/canvasFormAdapter.js',
  './optik/js/canvasFormGenerator.js',
  './optik/js/formOkuyucu.js',
  './optik/js/galeriSecici.js',
  './optik/js/layoutEngine.js',
  './optik/js/omrEngine.js',
  './optik/js/optikSablonEditor.js',
  './optik/js/optikSablonMotoru.js',
  './optik/js/pdfFormGenerator.js',
  './optik/js/sayfaTespitCV.js',
  './optik/js/hassasiyetAyarlari.js',
  './optik/js/koseSecici.js',
  './js/firebase-init.js',
  './js/auth.js',
  './js/kullanici-yonetimi.js',
  './js/app.js',
  './js/ui.js',
  './js/push.js',
  './js/core/utils.js',
  './js/core/store.js',
  './js/core/event-bus.js',
  './js/core/services/istatistik.service.js',
  './js/core/repositories/kullanici-yonetimi.repository.js',
  './js/core/services/kullanici-yonetimi.service.js',
  './js/core/repositories/nobet.repository.js',
  './js/core/services/nobet.service.js',
  './js/core/repositories/siniflar.repository.js',
  './js/core/services/siniflar.service.js',
  './js/core/repositories/takvim.repository.js',
  './js/core/services/takvim.service.js',
  './js/core/repositories/personel.repository.js',
  './js/core/services/personel.service.js',
  './js/core/repositories/tasima.repository.js',
  './js/core/services/tasima.service.js',
  './js/core/repositories/servis-oturma.repository.js',
  './js/core/services/servis-oturma.service.js',
  './js/core/repositories/notlar.repository.js',
  './js/core/services/notlar.service.js',
  './js/core/repositories/sinavlar.repository.js',
  './js/core/services/sinavlar.service.js',
  './js/core/repositories/ogretmen-izin.repository.js',
  './js/core/services/ogretmen-izin.service.js',
  './js/core/repositories/ders-saatleri.repository.js',
  './js/core/services/ders-saatleri.service.js',
  './js/core/repositories/dokumanlar.repository.js',
  './js/core/services/dokumanlar.service.js',
  './js/core/repositories/harita.repository.js',
  './js/core/services/harita.service.js',
  './js/core/repositories/cizelgeler.repository.js',
  './js/core/services/cizelgeler.service.js',
  './js/core/repositories/odev-not-cizelgeleri.repository.js',
  './js/core/services/odev-not-cizelgeleri.service.js',
  './js/core/repositories/push.repository.js',
  './js/core/services/push.service.js',
  './js/core/repositories/haberler.repository.js',
  './js/core/services/haberler.service.js',
  './js/core/repositories/periyodik.repository.js',
  './js/core/services/periyodik.service.js',
  './js/core/repositories/mesajlasma.repository.js',
  './js/core/services/mesajlasma.service.js',
  './js/core/repositories/duyurular.repository.js',
  './js/core/services/duyurular.service.js',
  './js/core/repositories/anket.repository.js',
  './js/core/services/anket.service.js',
  './js/cizelgeler.js',
  './js/odev-not-cizelgeleri.js',
  './js/mesajlasma.js',
  './js/duyurular.js',
  './js/anket.js',
  './js/dashboard-ozellestirme.js',
  './js/takvim.js',
  './js/nobet.js',
  './js/periyodik.js',
  './js/tasima.js',
  './js/tasima-takip.js',
  './js/servis-oturma.js',
  './js/servis-denetim.js',
  './js/haberler.js',
  './js/mevzuat-asistan.js',
  './js/raporlama.js',
  './js/sinavlar.js',
  './js/notlar.js',
  './js/istatistikler.js',
  './js/siniflar.js',
  './js/ogretmen-detay.js',
  './js/ogretmen-izin.js',
  './js/ders-saatleri.js',
  './js/core/zengin-editor.js',
  './js/personel.js',
  './js/puantaj.js',
  './js/dilekce.js',
  './js/maas-degisiklik.js',
  './js/teblig-tebellug.js',
  './js/dokumanlar.js',
  './js/dokuman-okuyucu.js',
  './js/harita.js',
  './js/excel-import.js',
  './js/kriter-dagitim.js',
  './js/proje-degerlendirme.js',
  './js/hava-durumu.js',
  './js/ogrenciler-arama.js',
  './js/widget-bridge.js',
  './js/alt-navigasyon.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-180.png',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'
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

  if (url.includes('googleapis.com') || url.includes('accounts.google.com')) {
    return;
  }

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

  if (
    url.includes('cdnjs.cloudflare.com') ||
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
        /* FetchEvent.waitUntil yalnız dispatch sırasında güvenlidir;
           cache-hit ağ yenilemesi burada bilinçli fire-and-forget çalışır. */
        agIstegi.catch(() => {});
        return onbellek;
      }

      const agYanit = await agIstegi;
      if (agYanit) return agYanit;

      /* Yalnız sayfa gezinmelerinde uygulama kabuğuna düş.
         JS/CSS/font isteğine HTML döndürmek MIME/syntax hatasına yol açar. */
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
