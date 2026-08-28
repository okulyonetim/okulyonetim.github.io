/* Koruk Asistan — sade Service Worker
   Görev: uygulama kabuğunu önbelleğe almak, statik kaynakları çevrimiçiyken
   güncel ağ sürümünden, çevrimdışıyken cache'den sunmak ve Firebase Messaging
   bildirimlerini taşımak. HTML/CSS/JS enjeksiyonu YOK. */
const CACHE_ADI='oy-cache-v765';

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp({apiKey:"AIzaSyCxLLlLCA0Deu7dcQch5e1c4R5ur5FSkc",authDomain:"okul-6e302.firebaseapp.com",projectId:"okul-6e302",storageBucket:"okul-6e302.firebasestorage.app",messagingSenderId:"738103486583",appId:"1:738103486583:web:da91129b1a08f2463efe72"});
const messaging=firebase.messaging();

const FIREBASE_SDK=[
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js'
];

const ONBELLEGE_ALINACAKLAR=[
  './','./index.html','./manifest.json',
  './css/design-system.css',
  './js/firebase-init.js','./js/core/core.js','./js/core/platform/widget-adapter.js','./js/core/shell-ui.js','./js/modules/school-live-status.js','./js/modules/report-engine.js','./js/modules/dashboard.js','./js/modules/people.js','./js/modules/academic.js','./js/modules/management.js','./js/modules/communication.js','./js/modules/transport.js','./js/modules/documents.js','./js/modules/tools.js','./js/modules/teacher-list.js','./js/modules/map-ui.js','./js/modules/settings.js',
  './js/modules/payroll-change.js','./js/modules/assistant.js','./js/modules/legislation.js','./js/modules/legislation-ui.js',
  './js/modules/rubric-settings.js','./js/modules/rubric-tools.js','./js/modules/rubric-tools-engine.js',
  './js/modules/document-viewer.js',
  './js/auth.js','./js/app-loader.js',
  './assets/icon-192.png','./assets/icon-512.png','./assets/icon-180.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_ADI).then(cache=>Promise.all([
    Promise.allSettled(ONBELLEGE_ALINACAKLAR.map(url=>cache.add(url).catch(err=>console.warn('[SW] Önbelleklenemedi:',url,err)))),
    Promise.allSettled(FIREBASE_SDK.map(async url=>{try{const response=await fetch(url,{mode:'no-cors',cache:'no-store'});await cache.put(url,response)}catch(err){console.warn('[SW] Firebase SDK önbelleklenemedi:',url,err)}}))
  ])));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n!==CACHE_ADI).map(n=>caches.delete(n)))));self.clients.claim();});
function firebaseSdkIstegiMi(req){try{const u=new URL(req.url);return u.origin==='https://www.gstatic.com'&&u.pathname.startsWith('/firebasejs/10.12.2/')&&/-compat\.js$/.test(u.pathname)}catch(_){return false}}
async function firebaseSdkCacheFirst(event){const cached=await caches.match(event.request);if(cached)return cached;try{const response=await fetch(event.request);if(response){const copy=response.clone();event.waitUntil(caches.open(CACHE_ADI).then(cache=>cache.put(event.request,copy)).catch(()=>{}));}return response}catch(_){return new Response('',{status:503,headers:{'Content-Type':'application/javascript; charset=utf-8'}})}}
function apiIstegiMi(url){return url.includes('firestore.googleapis.com')||url.includes('identitytoolkit.googleapis.com')||url.includes('securetoken.googleapis.com')||url.includes('firebaseinstallations.googleapis.com')||url.includes('fcmregistrations.googleapis.com');}
function statikKaynakMi(req){try{const u=new URL(req.url);if(u.origin!==self.location.origin)return false;return /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|json|woff2?)$/i.test(u.pathname);}catch(_){return false;}}
function kodKaynakMi(req){try{const u=new URL(req.url);return u.origin===self.location.origin&&/\.(?:js|css)$/i.test(u.pathname);}catch(_){return false;}}
async function kodNetworkFirst(event){
  try{
    const response=await fetch(event.request,{cache:'no-store'});
    if(response&&response.status===200&&response.type!=='opaque'){
      const copy=response.clone();
      event.waitUntil(caches.open(CACHE_ADI).then(cache=>cache.put(event.request,copy)).catch(()=>{}));
    }
    return response;
  }catch(_){
    return await caches.match(event.request)||new Response('Kaynak çevrimdışı kullanılamıyor.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }
}
async function statikSWR(event){const cached=await caches.match(event.request);const yenile=fetch(event.request).then(response=>{if(response&&response.status===200&&response.type!=='opaque'){const copy=response.clone();caches.open(CACHE_ADI).then(cache=>cache.put(event.request,copy)).catch(()=>{});}return response;}).catch(()=>null);if(cached){event.waitUntil(yenile);return cached;}return(await yenile)||new Response('Kaynak çevrimdışı kullanılamıyor.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
async function navigasyonNetworkFirst(event){try{const response=await fetch(event.request,{cache:'no-store'});if(response&&response.status===200){const copy=response.clone();event.waitUntil(caches.open(CACHE_ADI).then(cache=>cache.put(event.request,copy)).catch(()=>{}));}return response}catch(_){return await caches.match(event.request)||await caches.match('./index.html')||new Response('Çevrimdışı',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})}}
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;if(firebaseSdkIstegiMi(event.request)){event.respondWith(firebaseSdkCacheFirst(event));return;}if(apiIstegiMi(event.request.url))return;if(event.request.mode==='navigate'){event.respondWith(navigasyonNetworkFirst(event));return;}if(kodKaynakMi(event.request)){event.respondWith(kodNetworkFirst(event));return;}if(statikKaynakMi(event.request))event.respondWith(statikSWR(event));});
messaging.onBackgroundMessage(payload=>{const n=payload?.notification||{},data=payload?.data||{};return self.registration.showNotification(n.title||'Koruk İlk-Ortaokulu',{body:n.body||data.body||'Yeni bir bildiriminiz var.',icon:n.icon||'./assets/icon-192.png',badge:'./assets/icon-192.png',data:{url:data.url||data.link||'./'}});});
self.addEventListener('notificationclick',event=>{event.notification.close();const hedef=event.notification?.data?.url||'./';event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c){c.navigate?.(hedef);return c.focus();}}return clients.openWindow?clients.openWindow(hedef):null;}));});