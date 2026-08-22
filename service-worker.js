/* ====================================================================
   Okul Yönetim Paneli — Service Worker v7
   ==================================================================== */
const CACHE_ADI = 'oy-cache-v537';

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
  './','./index.html','./manifest.json',
  './css/styles.css','./css/tasima-takip.css','./css/servis-denetim.css','./css/dilekce.css','./css/sinif-oturma.css','./css/devamsizlik-cizelgesi.css',
  './css/web-shell-fix.css','./css/web-sidebar-v2.css','./css/dashboard-yeni.css','./css/dashboard-home.css','./css/dashboard-home-neutral.css','./css/dashboard-home-colors.css','./css/alt-navigation-theme.css','./css/checkbox-standard.css','./css/modal-interaction-fix.css',
  './js/firebase-init.js','./js/auth.js','./js/ozellik-katalogu.js','./js/app.js','./js/ui.js','./js/push.js',
  './js/core/utils.js','./js/core/store.js','./js/core/event-bus.js','./js/alt-navigasyon.js','./js/alt-navigasyon-core.js','./js/alt-navigation-list-theme.js','./js/ui-stability-fixes.js','./js/app-pages-theme.js','./js/modal-interaction-fix.js','./js/rapor-preview.js','./js/nobet-rapor.js','./js/school-data-consistency.js',
  './js/dashboard-v2-init.js','./js/web-sidebar-v2.js','./js/dashboard-home.js','./js/dashboard-duyuru.js','./js/dashboard-home-shared.js','./js/dashboard-home-enhancements.js','./js/dashboard-teacher-school-summary.js','./js/role-ui-hardening.js',
  './assets/icon-192.png','./assets/icon-512.png','./assets/icon-180.png'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_ADI).then(cache=>Promise.allSettled(ONBELLEGE_ALINACAKLAR.map(url=>cache.add(url).catch(err=>console.warn('[SW] Önbelleklenemedi:',url,err))))));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n!==CACHE_ADI).map(n=>caches.delete(n)))));self.clients.claim()});
function apiIstegiMi(url){return url.includes('firestore.googleapis.com')||url.includes('identitytoolkit.googleapis.com')||url.includes('securetoken.googleapis.com')||url.includes('firebaseinstallations.googleapis.com')||url.includes('fcmregistrations.googleapis.com')}
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;if(apiIstegiMi(event.request.url))return;const net=fetch(event.request).then(response=>{if(response&&response.status===200&&response.type!=='opaque'){const copy=response.clone();caches.open(CACHE_ADI).then(cache=>cache.put(event.request,copy)).catch(()=>{})}return response});if(event.request.mode==='navigate'){event.respondWith(net.catch(async()=>{const cached=await caches.match(event.request);if(cached)return cached;const shell=await caches.match('./index.html');if(shell)return shell;return new Response('Çevrimdışı',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})}));return}event.respondWith(net.catch(async()=>{const cached=await caches.match(event.request);if(cached)return cached;return new Response('Kaynak çevrimdışı kullanılamıyor.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})}))});
messaging.onBackgroundMessage(payload=>{const n=payload?.notification||{},data=payload?.data||{};return self.registration.showNotification(n.title||'Koruk İlk-Ortaokulu',{body:n.body||data.body||'Yeni bir bildiriminiz var.',icon:n.icon||'./assets/icon-192.png',badge:'./assets/icon-192.png',data:{url:data.url||data.link||'./'}})});
self.addEventListener('push',event=>{if(event.data)return;event.waitUntil(self.registration.showNotification('Koruk İlk-Ortaokulu',{body:'Yeni bir bildiriminiz var.',icon:'./assets/icon-192.png',badge:'./assets/icon-192.png',data:{url:'./'}}))});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=event.notification?.data?.url||'./';event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c){c.navigate(url).catch(()=>{});return c.focus()}}return clients.openWindow?clients.openWindow(url):null}))});
