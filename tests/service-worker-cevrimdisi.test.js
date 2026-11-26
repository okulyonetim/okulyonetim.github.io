const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const ORIGIN='https://okul.test';
const swKod=fs.readFileSync('service-worker.js','utf8');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);
const precache=()=>[...swKod.match(/const ONBELLEGE_ALINACAKLAR=\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(x=>x[1].replace(/^\.\//,''));

/* Uygulamanın yüklediği her yerel js/css: index.html, app-loader define listeleri, kodda anılan js/css yolları ve CSS @import zinciri. */
function referanslar(){
  const refs=new Map();
  const ekle=(u,kaynak)=>{if(!u||/^(https?:|data:|\/\/)/.test(u))return;u=u.replace(/^\.\//,'');const p=u.split('?')[0];if(!fs.existsSync(p))return;const k=refs.get(p)||{surumler:new Set(),kabukSurumler:new Set(),kaynak,kabuk:false};if(u.includes('?'))k.surumler.add(u);refs.set(p,k);return k};
  const idx=fs.readFileSync('index.html','utf8');
  for(const m of idx.matchAll(/(?:src|href)="([^"]+\.(?:js|css)[^"]*)"/g)){const k=ekle(m[1],'index.html');if(k){k.kabuk=true;if(m[1].includes('?'))k.kabukSurumler.add(m[1].replace(/^\.\//,''))}}
  for(const f of walk('js')){const t=fs.readFileSync(f,'utf8');for(const m of t.matchAll(/['"`(=]\s*((?:\.\/)?(?:js|css)\/[A-Za-z0-9_\-./]+\.(?:js|css)(?:\?v=[0-9A-Za-z]+)?)/g))ekle(m[1],f)}
  const gez=new Set();const css=p=>{if(!/\.css$/.test(p)||gez.has(p))return;gez.add(p);for(const m of fs.readFileSync(p,'utf8').matchAll(/@import\s+url\(["']?([^"')]+)["']?\)/g)){const r=path.posix.join(path.posix.dirname(p),m[1]);const k=ekle(r,'@import '+p);if(k){k.kabuk=true;if(r.includes('?'))k.kabukSurumler.add(r)}css(r.split('?')[0])}};
  for(const p of [...refs.keys()])css(p);
  return refs;
}

test('uygulamanın yüklediği her js/css servis çalışanı ön belleğinde (internetsiz ilk açılış için)',()=>{
  const bare=new Set(precache().map(u=>u.split('?')[0]));
  const eksik=[...referanslar()].filter(([p])=>!bare.has(p)).map(([p,k])=>p+' <- '+k.kaynak);
  assert.deepEqual(eksik,[],'ön bellekte olmayan dosyalar çevrimdışı açılışı bozar:\n'+eksik.join('\n'));
});

test('kabuk dosyaları (index.html ve CSS @import) ön bellekte tam sürümüyle kayıtlı',()=>{
  const tam=new Set(precache());
  const eksik=[];for(const [p,k] of referanslar())if(k.kabuk)for(const u of k.kabukSurumler)if(!tam.has(u))eksik.push(u);
  assert.deepEqual(eksik,[],'sürüm numarası ön bellek listesiyle uyuşmuyor: '+eksik.join(', '));
});

function ortam(){
  const stores=new Map(),handlers={};let online=true;
  const anahtar=(u,yoksay)=>{const x=new URL(typeof u==='string'?u:u.url,ORIGIN+'/');return yoksay?x.origin+x.pathname:x.href};
  class Response{constructor(body='',init={}){this.body=body;this.status=init.status??200;this.ok=this.status>=200&&this.status<300}clone(){return new Response(this.body,{status:this.status})}}
  const bul=(adlar,req,o)=>{for(const n of adlar){const s=stores.get(n);if(!s)continue;if(!o.ignoreSearch){const r=s.get(anahtar(req));if(r)return r}else{const k=anahtar(req,true);for(const [u,r] of s)if(anahtar(u,true)===k)return r}}return undefined};
  const fetchFn=async u=>{if(!online)throw new TypeError('çevrimdışı');return new Response('içerik:'+anahtar(u))};
  const onBellek=ad=>({async add(u){const r=await fetchFn(u);if(!r.ok)throw Error('http '+r.status);stores.get(ad).set(anahtar(u),r)},async put(req,r){stores.get(ad).set(anahtar(req),r)},async match(req,o={}){return bul([ad],req,o)},async keys(){return[...stores.get(ad).keys()].map(url=>({url}))}});
  const caches={async open(n){if(!stores.has(n))stores.set(n,new Map());return onBellek(n)},async keys(){return[...stores.keys()]},async delete(n){return stores.delete(n)},async match(req,o={}){return bul([...stores.keys()],req,o)}};
  const self_={addEventListener:(t,fn)=>{handlers[t]=fn},skipWaiting(){},clients:{claim:async()=>{},matchAll:async()=>[]},registration:{}};
  const ctx=vm.createContext({self:self_,caches,fetch:fetchFn,Response,URL,location:{origin:ORIGIN},console:{warn(){},log(){},error(){}},importScripts(){throw new Error('çevrimdışı')}});
  vm.runInContext(swKod,ctx);
  const bekle=async olay=>{const p=[];handlers[olay]({waitUntil:x=>p.push(x)});await Promise.all(p)};
  return{stores,caches,Response,
    cevrimdisi(){online=false},
    async kur(){await bekle('install');await bekle('activate')},
    async iste(url,destination='',mode='no-cors'){let cikti;const p=[];handlers.fetch({request:{url,method:'GET',destination,mode},respondWith:x=>{cikti=x},waitUntil:x=>p.push(x)});const r=cikti?await cikti:null;await Promise.allSettled(p);return r}};
}

test('yeni sürüm kurulduktan sonra internetsiz açılışta tüm js/css ve ana sayfa önbellekten gelir',async()=>{
  const o=ortam();
  await o.kur();           /* sürüm yükseltmesi: ön bellek yalnız kurulumda doldu, sayfa henüz çevrimiçi gezilmedi */
  o.cevrimdisi();
  const sonuc=[];
  for(const [p,k] of referanslar()){
    const url=ORIGIN+'/'+(([...k.surumler][0])||p);
    const r=await o.iste(url,/\.css$/.test(p)?'style':'script');
    if(!r||r.status===503)sonuc.push(p);
  }
  assert.deepEqual(sonuc,[],'internetsiz açılışta yüklenemeyen dosyalar (sayfa stilsiz/boş açılır): '+sonuc.join(', '));
  const ana=await o.iste(ORIGIN+'/','document','navigate');
  assert.ok(ana&&ana.status!==503,'ana sayfa çevrimdışı açılmalı');
});

test('sürüm yükseltmesinde eski sürümde önbelleğe alınan veri/varlıklar taşınır, eski kod taşınmaz',async()=>{
  const o=ortam();
  const eski=await o.caches.open('oy-cache-v1000');
  await eski.put(ORIGIN+'/data/bep/index.json',new o.Response('bep'));
  await eski.put(ORIGIN+'/assets/guide/kilavuz.pdf',new o.Response('pdf'));
  await eski.put(ORIGIN+'/js/modules/eski-modul.js?v=1',new o.Response('eski kod'));
  await o.kur();
  assert.ok(!(await o.caches.keys()).includes('oy-cache-v1000'),'eski ön bellek silinmeli');
  o.cevrimdisi();
  assert.equal((await o.caches.match(ORIGIN+'/data/bep/index.json'))?.body,'bep','BEP verisi taşınmalı');
  assert.equal((await o.caches.match(ORIGIN+'/assets/guide/kilavuz.pdf'))?.body,'pdf','kılavuz taşınmalı');
  assert.equal(await o.caches.match(ORIGIN+'/js/modules/eski-modul.js?v=1'),undefined,'eski kod taşınmamalı');
});
