/* Okul Yönetim Paneli — Service Worker v8 / performans */
const CACHE_ADI='oy-cache-v652';
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp({apiKey:"AIzaSyCxLLlLCA0Deu7dcQch5e1c4R5ur5FSkc",authDomain:"okul-6e302.firebaseapp.com",projectId:"okul-6e302",storageBucket:"okul-6e302.firebasestorage.app",messagingSenderId:"738103486583",appId:"1:738103486583:web:da91129b1a08f2463efe72"});
const messaging=firebase.messaging();

/* İlk kurulumda yüzlerce dosyayı aynı anda indirmek yerine yalnız gerçek uygulama kabuğu.
   Diğer statik kaynaklar ilk kullanıldığında stale-while-revalidate ile önbelleğe alınır. */
const ONBELLEGE_ALINACAKLAR=[
  './','./index.html','./manifest.json',
  './css/styles.css','./css/dark-theme-soft.css','./css/auth-header-redesign.css',
  './css/dashboard-home.css','./css/dashboard-home-neutral.css','./css/dashboard-home-colors.css',
  './css/dashboard-bell-modern.css','./css/dashboard-home-wide.css','./css/alt-navigation-theme.css',
  './css/deneme-sinavlari-modern.css','./css/deneme-sinavlari-fixes.css','./css/tasima-modern-v2.css',
  './js/firebase-init.js','./js/auth.js','./js/ozellik-katalogu.js','./js/app.js','./js/ui.js',
  './js/core/local-first-sync.js','./js/core/runtime-state-bridge.js',
  './js/alt-navigasyon.js','./js/alt-navigasyon-core.js','./js/ui-stability-fixes.js','./js/pull-to-refresh-guard.js',
  './js/app-pages-theme.js','./js/auth-header-redesign-v2.js','./js/mobile-header-brand.js',
  './js/dashboard-home.js','./js/dashboard-bell-modern.js','./js/dashboard-home-shared.js',
  './js/dashboard-home-bootstrap-sync.js','./js/mobile-back-navigation.js',
  './js/deneme-sinavlari-modern.js','./js/deneme-sinavlari-stability.js','./js/deneme-sil-fix.js','./js/tasima-modern-v2.js',
  './js/deneme-sayac-local-first.js','./js/deneme-sayac-local-first-v2.js','./js/deneme-sayac-runtime-v2.js',
  './assets/icon-192.png','./assets/icon-512.png','./assets/icon-180.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_ADI).then(cache=>
      Promise.allSettled(ONBELLEGE_ALINACAKLAR.map(url=>
        cache.add(url).catch(err=>console.warn('[SW] Önbelleklenemedi:',url,err))
      ))
    )
  );
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n!==CACHE_ADI).map(n=>caches.delete(n)))));
  self.clients.claim();
});

function apiIstegiMi(url){
  return url.includes('firestore.googleapis.com')||
    url.includes('identitytoolkit.googleapis.com')||
    url.includes('securetoken.googleapis.com')||
    url.includes('firebaseinstallations.googleapis.com')||
    url.includes('fcmregistrations.googleapis.com');
}
function statikKaynakMi(req){
  try{
    const u=new URL(req.url);
    if(u.origin!==self.location.origin)return false;
    return /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|json|woff2?)$/i.test(u.pathname);
  }catch(_){return false}
}
async function modernShell(response){
  try{
    if(!response||!response.ok)return response;
    let html=await response.text();
    if(!html.includes('kontrol-listeleri-modern.css'))html=html.replace('</head>','<link rel="stylesheet" href="css/kontrol-listeleri-modern.css"></head>');
    if(!html.includes('personel-belgeler-modern.css'))html=html.replace('</head>','<link rel="stylesheet" href="css/personel-belgeler-modern.css"></head>');
    if(!html.includes('sosyal-kulupler-modern.css'))html=html.replace('</head>','<link rel="stylesheet" href="css/sosyal-kulupler-modern.css"></head>');
    if(!html.includes('belirli-gunler-modern.css'))html=html.replace('</head>','<link rel="stylesheet" href="css/belirli-gunler-modern.css"></head>');
    if(!html.includes('zumre-modern.css'))html=html.replace('</head>','<link rel="stylesheet" href="css/zumre-modern.css"></head>');
    if(!html.includes('kontrol-listeleri-modern.js'))html=html.replace('</body>','<script src="js/kontrol-listeleri-modern.js"></script></body>');
    if(!html.includes('maas-degisiklik-personel-secici.js'))html=html.replace('</body>','<script src="js/maas-degisiklik-personel-secici.js"></script></body>');
    if(!html.includes('sosyal-kulupler-modern.js'))html=html.replace('</body>','<script src="js/sosyal-kulupler-modern.js"></script></body>');
    if(!html.includes('belirli-gunler-local-first.js'))html=html.replace('</body>','<script src="js/belirli-gunler-local-first.js"></script></body>');
    if(!html.includes('belirli-gunler-modern.js'))html=html.replace('</body>','<script src="js/belirli-gunler-modern.js"></script></body>');
    if(!html.includes('zumre-local-first.js'))html=html.replace('</body>','<script src="js/zumre-local-first.js"></script></body>');
    if(!html.includes('zumre-modern.js'))html=html.replace('</body>','<script src="js/zumre-modern.js"></script></body>');
    return new Response(html,{status:response.status,statusText:response.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
  }catch(e){return response}
}
async function statikSWR(event){
  const cached=await caches.match(event.request);
  const yenile=fetch(event.request).then(response=>{
    if(response&&response.status===200&&response.type!=='opaque'){
      const copy=response.clone();
      caches.open(CACHE_ADI).then(cache=>cache.put(event.request,copy)).catch(()=>{});
    }
    return response;
  }).catch(()=>null);
  if(cached){
    event.waitUntil(yenile);
    return cached;
  }
  return (await yenile)||new Response('Kaynak çevrimdışı kullanılamıyor.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
async function navigasyonHizli(event){
  const cached=await caches.match(event.request)||await caches.match('./index.html');
  const net=fetch(event.request).then(async response=>{
    if(response&&response.status===200){
      const copy=response.clone();
      caches.open(CACHE_ADI).then(cache=>cache.put(event.request,copy)).catch(()=>{});
    }
    return response;
  }).catch(()=>null);
  if(cached){
    event.waitUntil(net);
    return modernShell(cached);
  }
  const response=await net;
  if(response)return modernShell(response);
  return new Response('Çevrimdışı',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  if(apiIstegiMi(event.request.url))return;
  if(event.request.mode==='navigate'){
    event.respondWith(navigasyonHizli(event));
    return;
  }
  if(statikKaynakMi(event.request)){
    event.respondWith(statikSWR(event));
    return;
  }
  const net=fetch(event.request).then(response=>{
    if(response&&response.status===200&&response.type!=='opaque'){
      const copy=response.clone();
      caches.open(CACHE_ADI).then(cache=>cache.put(event.request,copy)).catch(()=>{});
    }
    return response;
  });
  event.respondWith(net.catch(async()=>await caches.match(event.request)||new Response('Kaynak çevrimdışı kullanılamıyor.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})));
});

messaging.onBackgroundMessage(payload=>{const n=payload?.notification||{},data=payload?.data||{};return self.registration.showNotification(n.title||'Koruk İlk-Ortaokulu',{body:n.body||data.body||'Yeni bir bildiriminiz var.',icon:n.icon||'./assets/icon-192.png',badge:'./assets/icon-192.png',data:{url:data.url||data.link||'./'}})});
self.addEventListener('push',event=>{if(event.data)return;event.waitUntil(self.registration.showNotification('Koruk İlk-Ortaokulu',{body:'Yeni bir bildiriminiz var.',icon:'./assets/icon-192.png',badge:'./assets/icon-192.png',data:{url:'./'}}))});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=event.notification?.data?.url||'./';event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c){c.navigate(url).catch(()=>{});return c.focus()}}return clients.openWindow?clients.openWindow(url):null}))});
