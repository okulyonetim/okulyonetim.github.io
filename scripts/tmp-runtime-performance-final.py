from pathlib import Path
import re
import textwrap


def replace_once(path, old, new):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'Beklenen blok bulunamadı: {path}: {old[:120]}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


# 1) AppStore + IndexedDB + SyncEngine: toplu yerel okuma/yazma ve render patlamasını azalt.
core = Path('js/core/core.js')
s = core.read_text(encoding='utf-8')
old = "function setData(type,value){state.data[type]=value;emit('data.'+type,value);return value}"
new = old + "\nfunction setDataMany(data){if(!data||typeof data!=='object')return state.data;const changes=Object.entries(data);for(const [type,value] of changes)state.data[type]=value;for(const [type,value] of changes)emit('data.'+type,value);return data}"
if old not in s:
    raise SystemExit('AppStore.setData bulunamadı')
s = s.replace(old, new, 1)
old = "data:t=>state.data[t],setData,hydrate:hydrateStore"
if old not in s:
    raise SystemExit('AppStore export bulunamadı')
s = s.replace(old, "data:t=>state.data[t],setData,setDataMany,hydrate:hydrateStore", 1)

old = "async function get(k,def=null){try{const d=await open();return await new Promise((res,rej)=>{const r=d.transaction(STORE,'readonly').objectStore(STORE).get(k);r.onsuccess=()=>res(r.result===undefined?def:r.result);r.onerror=()=>rej(r.error)})}catch(_){return def}}"
new = old + "\nasync function getMany(keys,defaults={}){const list=[...new Set(keys||[])];if(!list.length)return{};try{const d=await open();return await new Promise((res,rej)=>{const out={},t=d.transaction(STORE,'readonly'),store=t.objectStore(STORE);for(const k of list){const r=store.get(k);r.onsuccess=()=>{out[k]=r.result===undefined?defaults[k]:r.result}}t.oncomplete=()=>{for(const k of list)if(!Object.prototype.hasOwnProperty.call(out,k))out[k]=defaults[k];res(out)};t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error||new Error('indexeddb-abort'))})}catch(_){return Object.fromEntries(list.map(k=>[k,defaults[k]]))}}"
if old not in s:
    raise SystemExit('IndexedDB get bulunamadı')
s = s.replace(old, new, 1)

old = "async function cacheMany(u,data){if(!u||!data||typeof data!=='object')return;const rows=Object.entries(data).map(([type,val])=>[key(u,`cache:${type}`),val]);rows.push([key(u,'meta:lastLocalWriteAt'),Date.now()]);await setMany(rows);return data}"
new = "async function cacheMany(u,data,{markWrite=true}={}){if(!u||!data||typeof data!=='object')return;const rows=Object.entries(data).map(([type,val])=>[key(u,`cache:${type}`),val]);if(markWrite)rows.push([key(u,'meta:lastLocalWriteAt'),Date.now()]);await setMany(rows);return data}"
if old not in s:
    raise SystemExit('cacheMany bulunamadı')
s = s.replace(old, new, 1)

old = "async function hydrateLocal(u,types,defaults={}){const out={};for(const type of types||[])out[type]=await cached(u,type,Object.prototype.hasOwnProperty.call(defaults,type)?defaults[type]:[]);return out}"
new = "async function hydrateLocal(u,types,defaults={}){const names=[...(types||[])],keys=names.map(type=>key(u,`cache:${type}`)),defs={};names.forEach((type,i)=>{defs[keys[i]]=Object.prototype.hasOwnProperty.call(defaults,type)?defaults[type]:[]});const values=await getMany(keys,defs),out={};names.forEach((type,i)=>{out[type]=values[keys[i]]});return out}"
if old not in s:
    raise SystemExit('hydrateLocal bulunamadı')
s = s.replace(old, new, 1)

old = "window.KorukLocalFirst={open,get,set,setMany,del,queue,pending,tombstone,tombstones,cache,cached,cacheMany,hydrate:hydrateLocal,meta,userSnapshot,markBootstrap:(u,d={})=>meta(u,'bootstrap',{ready:true,completedAt:Date.now(),...d}),bootstrapState:u=>meta(u,'bootstrap'),isBootstrapReady:async u=>!!(await meta(u,'bootstrap'))?.ready,flush:flushWrites,schedule:scheduleFlush,uid};"
new = old.replace('{open,get,set,setMany', '{open,get,getMany,set,setMany')
if old not in s:
    raise SystemExit('KorukLocalFirst export bulunamadı')
s = s.replace(old, new, 1)

old = "async function pull(types){if(!syncReady()||!navigator.onLine)return{updated:0,skipped:true};const names=types?.length?types:Array.from(registered.keys());if(!names.length)return{updated:0};syncing=true;AppStore.set('ui.syncing',true);let updated=0;try{for(const name of names){const def=registered.get(name);if(!def)continue;try{const rows=await fetchCollection(def);await cache(uid(),name,rows);AppStore.setData(name,rows);updated++}catch(e){console.warn('[SyncEngine]',name,e?.message||e)}}const now=Date.now();await meta(uid(),'lastSyncAt',now);AppStore.set('ui.lastSyncAt',now);return{updated}}finally{syncing=false;AppStore.set('ui.syncing',false)}}"
new = "async function pull(types){if(!syncReady()||!navigator.onLine)return{updated:0,skipped:true};const names=types?.length?types:Array.from(registered.keys());if(!names.length)return{updated:0};syncing=true;AppStore.set('ui.syncing',true);let updated=0;try{const u=uid(),data={};for(const name of names){const def=registered.get(name);if(!def)continue;try{const rows=await fetchCollection(def);data[name]=rows;updated++}catch(e){console.warn('[SyncEngine]',name,e?.message||e)}}if(updated){await cacheMany(u,data,{markWrite:false});AppStore.setDataMany(data)}const now=Date.now();await meta(u,'lastSyncAt',now);AppStore.set('ui.lastSyncAt',now);return{updated}}finally{syncing=false;AppStore.set('ui.syncing',false)}}"
if old not in s:
    raise SystemExit('SyncEngine.pull bulunamadı')
core.write_text(s.replace(old, new, 1), encoding='utf-8')


# 2) Kayan haber: mask compositing'i kaldır, GPU katmanını izole et.
design = Path('css/design-system.css')
s = design.read_text(encoding='utf-8')
s2, count = re.subn(
    r"\.ka-home \.kh-news-viewport\{[^}]*\}",
    ".ka-home .kh-news-viewport{overflow:hidden;white-space:nowrap;min-width:0;padding-inline:12px;contain:layout paint;transform:translateZ(0);backface-visibility:hidden}",
    s,
    count=1,
)
if count != 1:
    raise SystemExit(f'kh-news viewport eşleşmesi: {count}')
design.write_text(s2, encoding='utf-8')


# 3) Service Worker: uygulama kodunu ve kabuğunu ağ beklemeden cache'den sun.
sw = Path('service-worker.js')
s = sw.read_text(encoding='utf-8')
if "const CACHE_ADI='oy-cache-v867';" not in s:
    raise SystemExit('cache v867 bulunamadı')
s = s.replace("const CACHE_ADI='oy-cache-v867';", "const CACHE_ADI='oy-cache-v868';", 1)
s = s.replace("'./css/design-system.css?v=867'", "'./css/design-system.css?v=868'", 1)
s = s.replace(
    "statik kaynakları çevrimiçiyken\n   güncel ağ sürümünden, çevrimdışıyken cache'den sunmak",
    "uygulama kodunu ve kabuğunu önbellekten hızlıca sunup\n   ağı arka planda yenilemek",
    1,
)
old = """async function kodNetworkFirst(event){
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
}"""
new = """async function kodCacheFirst(event){
  const cached=await caches.match(event.request);
  const yenile=fetch(event.request,{cache:'no-store'}).then(async response=>{
    if(response&&response.status===200&&response.type!=='opaque'){
      const copy=response.clone();
      await caches.open(CACHE_ADI).then(cache=>cache.put(event.request,copy)).catch(()=>{});
    }
    return response;
  }).catch(()=>null);
  if(cached){event.waitUntil(yenile);return cached;}
  return(await yenile)||new Response('Kaynak çevrimdışı kullanılamıyor.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
}"""
if old not in s:
    raise SystemExit('kodNetworkFirst bulunamadı')
s = s.replace(old, new, 1)
old = "async function navigasyonNetworkFirst(event){try{const response=await fetch(event.request,{cache:'no-store'});if(response&&response.status===200){const copy=response.clone();event.waitUntil(caches.open(CACHE_ADI).then(cache=>cache.put(event.request,copy)).catch(()=>{}));}return response}catch(_){return await caches.match(event.request)||await caches.match('./index.html')||new Response('Çevrimdışı',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})}}"
new = "async function navigasyonCacheFirst(event){const cached=await caches.match(event.request)||await caches.match('./index.html');const yenile=fetch(event.request,{cache:'no-store'}).then(async response=>{if(response&&response.status===200){const copy=response.clone();await caches.open(CACHE_ADI).then(cache=>cache.put(event.request,copy)).catch(()=>{});}return response}).catch(()=>null);if(cached){event.waitUntil(yenile);return cached;}return(await yenile)||new Response('Çevrimdışı',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})}"
if old not in s:
    raise SystemExit('navigasyonNetworkFirst bulunamadı')
s = s.replace(old, new, 1)
old = "if(event.request.mode==='navigate'){event.respondWith(navigasyonNetworkFirst(event));return;}if(kodKaynakMi(event.request)){event.respondWith(kodNetworkFirst(event));return;}"
new = "if(event.request.mode==='navigate'){event.respondWith(navigasyonCacheFirst(event));return;}if(kodKaynakMi(event.request)){event.respondWith(kodCacheFirst(event));return;}"
if old not in s:
    raise SystemExit('SW fetch route bulunamadı')
sw.write_text(s.replace(old, new, 1), encoding='utf-8')

replace_once('index.html', 'css/design-system.css?v=867', 'css/design-system.css?v=868')


# 4) Service Worker testini yeni davranışa taşı.
p = Path('tests/service-worker-precache-smoke.test.js')
s = p.read_text(encoding='utf-8')
old = """assert(sw.includes("fetch(event.request,{cache:'no-store'})"), 'JS/CSS çevrimiçiyken cache yerine güncel ağ sürümünden alınmalı.');
assert(sw.includes('kodNetworkFirst(event)'), 'JS/CSS fetch akışı network-first olmalı.');"""
new = """assert(sw.includes('async function kodCacheFirst(event)'), 'JS/CSS anlık cache-first + arka plan yenileme stratejisine sahip olmalı.');
assert(sw.includes("const yenile=fetch(event.request,{cache:'no-store'})"), 'Cache-first kod stratejisi arka planda HTTP cache dışından güncellenmeli.');
assert(sw.includes('if(cached){event.waitUntil(yenile);return cached;}'), 'Önbellekteki JS/CSS ağ yanıtını beklemeden sunulmalı.');
assert(sw.includes('async function navigasyonCacheFirst(event)'), 'Uygulama kabuğu da yavaş ağda cache üzerinden anında açılmalı.');
assert(sw.includes('kodCacheFirst(event)')&&!sw.includes('kodNetworkFirst(event)'), 'Eski ağ bekleten JS/CSS network-first yolu geri dönmemeli.');
assert(sw.includes('navigasyonCacheFirst(event)')&&!sw.includes('navigasyonNetworkFirst(event)'), 'Eski ağ bekleten navigasyon yolu geri dönmemeli.');"""
if old not in s:
    raise SystemExit('SW test strateji bloğu bulunamadı')
p.write_text(s.replace(old, new, 1), encoding='utf-8')


# 5) Cache pinlerini v868'e taşı.
for p in Path('tests').glob('*.js'):
    s = p.read_text(encoding='utf-8')
    n = s.replace('css/design-system.css?v=867', 'css/design-system.css?v=868').replace('oy-cache-v867', 'oy-cache-v868')
    if n != s:
        p.write_text(n, encoding='utf-8')


# 6) Loader testini query-string sürüm numaralarından bağımsız yap.
p = Path('tests/module-bundles-smoke.test.js')
lines = p.read_text(encoding='utf-8').splitlines()
idx = next((i for i, line in enumerate(lines) if line.startswith("for(const [name,file] of Object.entries({dashboard:'dashboard.js'")), None)
if idx is None:
    raise SystemExit('module registry assertion bulunamadı')
lines[idx:idx+1] = [
    "function registryHas(name,file){return registry(name).split(',').map(x=>x.trim().replace(/^['\"]|['\"]$/g,'').replace(/\\?v=\\d+$/,'')).includes(`js/modules/${file}`)}",
    "for(const [name,file] of Object.entries({dashboard:'dashboard.js',people:'people.js',academic:'academic.js',management:'management.js',communication:'communication.js',transport:'transport.js',documents:'documents.js',tools:'tools.js',settings:'settings.js'})) assert(registryHas(name,file),`${name} kendi tek UI modülünü yüklemeli.`);",
]
p.write_text('\n'.join(lines) + '\n', encoding='utf-8')


# 7) Architecture checker cache-busting query parametresini stylesheet ihlali saymasın.
p = Path('scripts/check-client-architecture.mjs')
s = p.read_text(encoding='utf-8')
old = "const stylesheetLinks=[...shellHtml.matchAll(/<link\\b[^>]*rel=[\"']stylesheet[\"'][^>]*href=[\"']([^\"']+)[\"'][^>]*>/gi)].map(m=>m[1]);\nconst styleViolations=stylesheetLinks.filter(href=>href!=='css/design-system.css');"
new = "const stylesheetLinks=[...shellHtml.matchAll(/<link\\b[^>]*rel=[\"']stylesheet[\"'][^>]*href=[\"']([^\"']+)[\"'][^>]*>/gi)].map(m=>m[1]);\nconst normalizeAssetHref=href=>String(href||'').split(/[?#]/)[0];\nconst styleViolations=stylesheetLinks.filter(href=>normalizeAssetHref(href)!=='css/design-system.css');"
if old not in s:
    raise SystemExit('architecture stylesheet block bulunamadı')
s = s.replace(old, new, 1)
old = "if(stylesheetLinks.length!==1||stylesheetLinks[0]!=='css/design-system.css'){console.error('Ana kabuk yalnız css/design-system.css yüklemeli.');failed=true}"
new = "if(stylesheetLinks.length!==1||normalizeAssetHref(stylesheetLinks[0])!=='css/design-system.css'){console.error('Ana kabuk yalnız css/design-system.css yüklemeli.');failed=true}"
if old not in s:
    raise SystemExit('architecture stylesheet assertion bulunamadı')
p.write_text(s.replace(old, new, 1), encoding='utf-8')


# 8) Performans regresyon sözleşmesi.
Path('tests/runtime-performance-smoke.test.js').write_text(textwrap.dedent("""\
const fs=require('fs');
const assert=require('assert');
const core=fs.readFileSync('js/core/core.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
const dashboard=fs.readFileSync('js/modules/dashboard.js','utf8');
const index=fs.readFileSync('index.html','utf8');
new Function(core);
assert(core.includes('async function getMany(keys,defaults={})'),'IndexedDB toplu okuma kapısı bulunmalı.');
assert(core.includes('const values=await getMany(keys,defs)'),'İlk local hydrate tek toplu IndexedDB okuması kullanmalı.');
assert(!core.includes('for(const type of types||[])out[type]=await cached('),'İlk açılış veri tipleri ayrı transaction beklememeli.');
assert(core.includes('function setDataMany(data)'),'AppStore toplu veri güncellemesini desteklemeli.');
assert(core.includes("await cacheMany(u,data,{markWrite:false});AppStore.setDataMany(data)"),'Remote sync tek cache transactionı ve tek frame render burstü kullanmalı.');
assert(!core.includes('await cache(uid(),name,rows);AppStore.setData(name,rows)'),'Sync koleksiyon başına cache/render tetiklememeli.');
assert(core.includes('if(markWrite)rows.push'),'Remote cache yenilemesi local write zaman damgasını bozmamalı.');
assert(sw.includes("const CACHE_ADI='oy-cache-v868'"),'Runtime cache v868 olmalı.');
assert(sw.includes('async function kodCacheFirst(event)')&&!sw.includes('kodNetworkFirst(event)'),'JS/CSS ağ beklemeden cache-first açılmalı.');
assert(sw.includes('async function navigasyonCacheFirst(event)')&&!sw.includes('navigasyonNetworkFirst(event)'),'Uygulama kabuğu yavaş ağda cache-first açılmalı.');
assert(index.includes('css/design-system.css?v=868'),'CSS v868 yüklenmeli.');
const a=css.indexOf('.ka-home .kh-news-viewport{'),b=css.indexOf('}',a),viewport=css.slice(a,b+1);
assert(a>=0&&b>a&&!viewport.includes('mask-image'),'Kayan haber viewportunda pahalı mask compositing olmamalı.');
assert(viewport.includes('contain:layout paint')&&viewport.includes('translateZ(0)'),'Ticker compositor sınırında tutulmalı.');
assert(css.includes('will-change:transform')&&css.includes('@keyframes khTicker'),'Ticker GPU transform animasyonunu korumalı.');
assert(dashboard.includes('freshNews.replaceWith(oldNews)'),'Aynı haber akışının DOMu yeniden yaratılmamalı.');
assert(dashboard.includes('renderFrame=requestAnimationFrame'),'Dashboard veri güncellemelerini frame bazında birleştirmeli.');
console.log('Runtime performans sözleşmesi başarılı.');
"""), encoding='utf-8')

print('Runtime performance patch hazır.')
