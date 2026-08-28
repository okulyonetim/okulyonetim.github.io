from pathlib import Path

SW=Path('service-worker.js')
TEST=Path('tests/classic-shell-v2-smoke.test.js')

sw=SW.read_text()
test=TEST.read_text()

marker="const messaging=firebase.messaging();\n\nconst ONBELLEGE_ALINACAKLAR=["
insert="const messaging=firebase.messaging();\n\nconst FIREBASE_SDK=[\n  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',\n  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',\n  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',\n  'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js',\n  'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js'\n];\n\nconst ONBELLEGE_ALINACAKLAR=["
if marker not in sw:
    raise SystemExit('Firebase SDK insertion marker not found')
sw=sw.replace(marker,insert,1)

old="self.addEventListener('install',event=>{\n  event.waitUntil(caches.open(CACHE_ADI).then(cache=>\n    Promise.allSettled(ONBELLEGE_ALINACAKLAR.map(url=>cache.add(url).catch(err=>console.warn('[SW] Önbelleklenemedi:',url,err))))\n  ));\n  self.skipWaiting();\n});"
new="self.addEventListener('install',event=>{\n  event.waitUntil(caches.open(CACHE_ADI).then(cache=>Promise.all([\n    Promise.allSettled(ONBELLEGE_ALINACAKLAR.map(url=>cache.add(url).catch(err=>console.warn('[SW] Önbelleklenemedi:',url,err)))),\n    Promise.allSettled(FIREBASE_SDK.map(async url=>{try{const response=await fetch(url,{mode:'no-cors',cache:'no-store'});await cache.put(url,response)}catch(err){console.warn('[SW] Firebase SDK önbelleklenemedi:',url,err)}}))\n  ])));\n  self.skipWaiting();\n});"
if old not in sw:
    raise SystemExit('service worker install contract not found')
sw=sw.replace(old,new,1)

marker="function apiIstegiMi(url){return url.includes('firestore.googleapis.com')||url.includes('identitytoolkit.googleapis.com')||url.includes('securetoken.googleapis.com')||url.includes('firebaseinstallations.googleapis.com')||url.includes('fcmregistrations.googleapis.com');}"
insert="function firebaseSdkIstegiMi(req){try{const u=new URL(req.url);return u.origin==='https://www.gstatic.com'&&u.pathname.startsWith('/firebasejs/10.12.2/')&&/-compat\\.js$/.test(u.pathname)}catch(_){return false}}\nasync function firebaseSdkCacheFirst(event){const cached=await caches.match(event.request);if(cached)return cached;try{const response=await fetch(event.request);if(response){const copy=response.clone();event.waitUntil(caches.open(CACHE_ADI).then(cache=>cache.put(event.request,copy)).catch(()=>{}));}return response}catch(_){return new Response('',{status:503,headers:{'Content-Type':'application/javascript; charset=utf-8'}})}}\n"+marker
if marker not in sw:
    raise SystemExit('API matcher marker not found')
sw=sw.replace(marker,insert,1)

old="self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;if(apiIstegiMi(event.request.url))return;if(event.request.mode==='navigate'){event.respondWith(navigasyonNetworkFirst(event));return;}if(kodKaynakMi(event.request)){event.respondWith(kodNetworkFirst(event));return;}if(statikKaynakMi(event.request))event.respondWith(statikSWR(event));});"
new="self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;if(firebaseSdkIstegiMi(event.request)){event.respondWith(firebaseSdkCacheFirst(event));return;}if(apiIstegiMi(event.request.url))return;if(event.request.mode==='navigate'){event.respondWith(navigasyonNetworkFirst(event));return;}if(kodKaynakMi(event.request)){event.respondWith(kodNetworkFirst(event));return;}if(statikKaynakMi(event.request))event.respondWith(statikSWR(event));});"
if old not in sw:
    raise SystemExit('fetch routing contract not found')
sw=sw.replace(old,new,1)

marker="const sameOriginStartup=[...shell.matchAll(/<script src=\\\"(?!https?:|\\/\\/)([^\\\"]+)\\\" defer><\\\\/script>/g)].map(m=>'./'+m[1].replace(/^\\.\\//,''));"
if marker not in test:
    # tolerate actual source escaping form
    marker="const sameOriginStartup=[...shell.matchAll(/<script src=\"(?!https?:|\/\/)([^\"]+)\" defer><\\/script>/g)].map(m=>'./'+m[1].replace(/^\.\//,''));"
if marker not in test:
    raise SystemExit('same-origin startup assertion marker not found')
addition="\nconst firebaseStartup=[...shell.matchAll(/<script src=\"(https:\\/\\/www\\.gstatic\\.com\\/firebasejs\\/10\\.12\\.2\\/firebase-[^\"]+-compat\\.js)\" defer><\\/script>/g)].map(m=>m[1]);\nfor(const src of firebaseStartup) assert(sw.includes(`'${src}'`),`Firebase startup SDK Service Worker cache listesinde bulunmalı: ${src}`);\nassert(sw.includes('function firebaseSdkIstegiMi(req)')&&sw.includes('firebaseSdkCacheFirst(event)'),'Firebase SDK istekleri çevrimdışında cache-first karşılanmalı.');"
if addition.strip() not in test:
    test=test.replace(marker,marker+addition,1)

SW.write_text(sw)
TEST.write_text(test)
