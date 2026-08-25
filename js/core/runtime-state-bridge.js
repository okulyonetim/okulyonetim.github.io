/* Koruk Asistan — Runtime State Bridge v4
 * Cihazdaki ana runtime veri kaynağı IndexedDB / KorukLocalFirst'tir.
 * Eski oyDashboardState_v2 localStorage kaydı yalnızca tek seferlik migrasyon
 * için okunur; başarılı IndexedDB yazımından sonra kaldırılır.
 */
(function(){
'use strict';
if(window.KorukRuntimeState)return;

const LEGACY_KEY='oyDashboardState_v2';
const CACHE_TYPE='runtime-state';
const NAMES=['ogretmenler','dersProgrami','siniflar','veliler','servisler','nobetAtamalari','nobetYerleri','sinavlar','denemeSinavlari','duyurular','haberler','gorevler','hatirlaticilar','ogretmenIzinleri','notlar','yillikPlanTanimlari'];

function get(n){try{switch(n){
 case'ogretmenler':return typeof ogretmenler!=='undefined'?ogretmenler:[];
 case'dersProgrami':return typeof dersProgrami!=='undefined'?dersProgrami:[];
 case'siniflar':return typeof siniflar!=='undefined'?siniflar:[];
 case'veliler':return typeof veliler!=='undefined'?veliler:[];
 case'servisler':return typeof servisler!=='undefined'?servisler:[];
 case'nobetAtamalari':return typeof nobetAtamalari!=='undefined'?nobetAtamalari:[];
 case'nobetYerleri':return typeof nobetYerleri!=='undefined'?nobetYerleri:[];
 case'sinavlar':return typeof sinavlar!=='undefined'?sinavlar:[];
 case'denemeSinavlari':return typeof denemeSinavlari!=='undefined'?denemeSinavlari:[];
 case'duyurular':return typeof duyurular!=='undefined'?duyurular:[];
 case'haberler':return typeof haberler!=='undefined'?haberler:[];
 case'gorevler':return typeof gorevler!=='undefined'?gorevler:[];
 case'hatirlaticilar':return typeof hatirlaticilar!=='undefined'?hatirlaticilar:[];
 case'ogretmenIzinleri':return typeof ogretmenIzinleri!=='undefined'?ogretmenIzinleri:[];
 case'notlar':return typeof notlar!=='undefined'?notlar:[];
 case'yillikPlanTanimlari':return typeof yillikPlanTanimlari!=='undefined'?yillikPlanTanimlari:[];
 default:return[];
 }}catch(_){return[]}}

function set(n,v){if(!Array.isArray(v))return;try{switch(n){
 case'ogretmenler':if(typeof ogretmenler!=='undefined')ogretmenler=v;break;
 case'dersProgrami':if(typeof dersProgrami!=='undefined')dersProgrami=v;break;
 case'siniflar':if(typeof siniflar!=='undefined')siniflar=v;break;
 case'veliler':if(typeof veliler!=='undefined')veliler=v;break;
 case'servisler':if(typeof servisler!=='undefined')servisler=v;break;
 case'nobetAtamalari':if(typeof nobetAtamalari!=='undefined')nobetAtamalari=v;break;
 case'nobetYerleri':if(typeof nobetYerleri!=='undefined')nobetYerleri=v;break;
 case'sinavlar':if(typeof sinavlar!=='undefined')sinavlar=v;break;
 case'denemeSinavlari':if(typeof denemeSinavlari!=='undefined')denemeSinavlari=v;break;
 case'duyurular':if(typeof duyurular!=='undefined')duyurular=v;break;
 case'haberler':if(typeof haberler!=='undefined')haberler=v;break;
 case'gorevler':if(typeof gorevler!=='undefined')gorevler=v;break;
 case'hatirlaticilar':if(typeof hatirlaticilar!=='undefined')hatirlaticilar=v;break;
 case'ogretmenIzinleri':if(typeof ogretmenIzinleri!=='undefined')ogretmenIzinleri=v;break;
 case'notlar':if(typeof notlar!=='undefined')notlar=v;break;
 case'yillikPlanTanimlari':if(typeof yillikPlanTanimlari!=='undefined')yillikPlanTanimlari=v;break;
 }}catch(_){}}

function expose(n){try{const d=Object.getOwnPropertyDescriptor(window,n);if(d&&!d.configurable)return;Object.defineProperty(window,n,{configurable:true,enumerable:false,get:()=>get(n),set:v=>set(n,v)})}catch(_){}}
function snapshotData(){const out={};NAMES.forEach(n=>{const v=get(n);if(Array.isArray(v))out[n]=v});return out}
function applyCache(cache,onlyEmpty){
 if(!cache||typeof cache!=='object')return;
 NAMES.forEach(n=>{
   if(!Array.isArray(cache[n])||!cache[n].length)return;
   if(onlyEmpty&&get(n).length)return;
   set(n,cache[n]);
 });
}

/* Eski localStorage verisi ilk açılışta ekranın boş kalmaması için yalnız
   migrasyon tamponu olarak kullanılabilir. Yeni yazımlar localStorage'a gitmez. */
let legacy={};
try{legacy=JSON.parse(localStorage.getItem(LEGACY_KEY)||'{}')||{}}catch(_){legacy={}}
applyCache(legacy,false);
NAMES.forEach(expose);
window.KorukDashboardCache=legacy;

let deviceCache={};
let deviceReady=false;
let hydratePromise=null;

async function hydrateDevice(){
 if(hydratePromise)return hydratePromise;
 hydratePromise=(async()=>{
   if(!window.KorukLocalFirst)return false;
   let uid='';
   for(let i=0;i<80&&!uid;i++){
     uid=window.KorukLocalFirst.uid();
     if(!uid)await new Promise(r=>setTimeout(r,50));
   }
   if(!uid)return false;

   const saved=await window.KorukLocalFirst.cached(uid,CACHE_TYPE,{});
   if(saved&&typeof saved==='object'&&Object.keys(saved).length){
     deviceCache=saved;
     applyCache(saved,true);
   }else if(legacy&&Object.keys(legacy).some(k=>k!=='savedAt')){
     const migrated={...legacy,savedAt:Date.now(),migratedFrom:'localStorage'};
     await window.KorukLocalFirst.cache(uid,CACHE_TYPE,migrated);
     deviceCache=migrated;
   }

   deviceReady=true;
   window.KorukDashboardCache=deviceCache;
   try{localStorage.removeItem(LEGACY_KEY)}catch(_){}
   window.dispatchEvent(new CustomEvent('koruk:data-updated',{detail:{source:'indexeddb-hydrate'}}));
   window.dispatchEvent(new CustomEvent('koruk:dashboard-render',{detail:{source:'indexeddb-hydrate'}}));
   return true;
 })().finally(()=>{hydratePromise=null});
 return hydratePromise;
}

let saveTimer=null,lastSaved='';
function saveSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,500)}
async function saveNow(){
 try{
   if(!window.KorukLocalFirst)return;
   const uid=window.KorukLocalFirst.uid();
   if(!uid)return;
   const data=snapshotData(),json=JSON.stringify(data);
   if(json===lastSaved)return;
   lastSaved=json;
   const out={savedAt:Date.now(),...data};
   await window.KorukLocalFirst.cache(uid,CACHE_TYPE,out);
   deviceCache=out;deviceReady=true;window.KorukDashboardCache=out;
 }catch(e){console.warn('[state] IndexedDB runtime cache yazılamadı',e)}
}

let signalQueued=false,lastSource='';
function signal(source){
 lastSource=source||'runtime';saveSoon();
 if(signalQueued)return;signalQueued=true;
 queueMicrotask(()=>{
   signalQueued=false;
   window.dispatchEvent(new CustomEvent('koruk:data-updated',{detail:{source:lastSource}}));
   window.dispatchEvent(new CustomEvent('koruk:dashboard-render',{detail:{source:lastSource}}));
 });
}

function wrap(name){
 const old=window[name];if(typeof old!=='function'||old.__korukStateWrapped)return false;
 const fn=function(){const r=old.apply(this,arguments);signal(name);return r};fn.__korukStateWrapped=true;window[name]=fn;return true;
}
const RENDERS=['renderDashboard','renderDuyurular','renderDuyuruPanosu','renderDenemeSinavlari','renderSinavlar','renderSiniflar','renderOgrenciler','renderDersGrid','renderNobet','renderNobetler','renderGorevler','renderHatirlaticilar','renderEvrakTakibi','renderNotlar','renderHaberler','renderBugunIzinliOgretmenler','renderYillikPlanAnaSayfa'];
function wrapAll(){RENDERS.forEach(wrap)}

[0,250,1000,3000,6500].forEach(ms=>setTimeout(wrapAll,ms));
document.addEventListener('DOMContentLoaded',()=>{wrapAll();hydrateDevice();signal('device-bootstrap')},{once:true});
window.addEventListener('koruk:data-updated',wrapAll,{passive:true});
window.addEventListener('pagehide',()=>{saveNow()},{passive:true});

window.KorukRuntimeState={
 get,set,
 snapshot:()=>({savedAt:Date.now(),...snapshotData()}),
 save:saveSoon,saveNow,signal,
 hydrate:hydrateDevice,
 applyCache:(onlyEmpty=true)=>applyCache(deviceReady?deviceCache:legacy,onlyEmpty),
 get deviceReady(){return deviceReady}
};
queueMicrotask(()=>{hydrateDevice();signal('device-cache-bootstrap')});
})();
