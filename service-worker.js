/* Koruk Asistan — sade Service Worker
   Görev: uygulama kabuğunu önbelleğe almak, statik kaynakları çevrimiçiyken
   güncel ağ sürümünden, çevrimdışıyken cache'den sunmak ve Firebase Messaging
   bildirimlerini taşımak. HTML/CSS/JS enjeksiyonu YOK. */
const CACHE_ADI='oy-cache-v728';

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp({apiKey:"AIzaSyCxLLlLCA0Deu7dcQch5e1c4R5ur5FSkc",authDomain:"okul-6e302.firebaseapp.com",projectId:"okul-6e302",storageBucket:"okul-6e302.firebasestorage.app",messagingSenderId:"738103486583",appId:"1:738103486583:web:da91129b1a08f2463efe72"});
const messaging=firebase.messaging();

const ONBELLEGE_ALINACAKLAR=[
  './',
  './index.html',
  './manifest.json',
  './css/design-system.css',
  './js/core/app-config.js',
  './js/core/app-store.js',
  './js/core/device-data.js',
  './js/core/local-first-sync.js',
  './js/core/permission-service.js',
  './js/core/shell-ui.js',
  './js/modules/dashboard.js',
  './js/modules/settings.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_ADI).then(cache=>cache.addAll(ONBELLEGE_ALINACAKLAR)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_ADI).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(fetch(req).then(res=>{
    const copy=res.clone();
    caches.open(CACHE_ADI).then(cache=>cache.put(req,copy)).catch(()=>{});
    return res;
  }).catch(()=>caches.match(req).then(hit=>hit||caches.match('./index.html'))));
});

messaging.onBackgroundMessage(payload=>{
  const notification=payload?.notification||{};
  const title=notification.title||'Koruk Asistan';
  const options={body:notification.body||'',icon:'./icon-192.png',badge:'./icon-192.png',data:payload?.data||{}};
  self.registration.showNotification(title,options);
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification?.data?.url||'./';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){if('focus'in client){client.navigate?.(target);return client.focus()}}
    return clients.openWindow?clients.openWindow(target):undefined;
  }));
});
