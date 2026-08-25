/* Koruk Asistan — AppBootstrap v1
   Açılış sırası:
   1) kimlik hazır
   2) IndexedDB/local cache hydrate
   3) UI kullanıma hazır
   4) Firestore arka planda sync
*/
(function(){
'use strict';
if(window.AppBootstrap)return;

const CORE_TYPES=[
  'ogretmenler','dersProgrami','siniflar','veliler','servisler',
  'nobetAtamalari','nobetYerleri','sinavlar','denemeSinavlari',
  'duyurular','haberler','gorevler','hatirlaticilar','ogretmenIzinleri','notlar'
];
let started=false;
let readyPromise=null;

function waitFor(test,timeout=8000,step=50){
  return new Promise((resolve,reject)=>{
    const start=Date.now();
    const tick=()=>{
      let ok=false;try{ok=!!test()}catch(_){}
      if(ok)return resolve(ok);
      if(Date.now()-start>=timeout)return reject(new Error('bootstrap-timeout'));
      setTimeout(tick,step);
    };tick();
  });
}
function registerCore(){
  if(!window.SyncEngine||!window.COL)return;
  const pairs={
    ogretmenler:COL.ogretmenler,dersProgrami:COL.dersProgrami,siniflar:COL.siniflar,
    veliler:COL.veliler,servisler:COL.servisler,nobetAtamalari:COL.nobetAtamalari,
    nobetYerleri:COL.nobetYerleri,sinavlar:COL.sinavlar,denemeSinavlari:COL.denemeSinavlari,
    duyurular:COL.duyurular,haberler:COL.haberler,gorevler:COL.gorevler,
    hatirlaticilar:COL.hatirlaticilar,ogretmenIzinleri:COL.ogretmenIzinleri,notlar:COL.notlar
  };
  Object.entries(pairs).forEach(([type,col])=>{if(col)SyncEngine.register(type,col)});
}

async function start(){
  if(readyPromise)return readyPromise;
  readyPromise=(async()=>{
    await waitFor(()=>window.AppStore&&window.KorukLocalFirst&&window.SyncEngine);
    /* auth.js mevcut geçiş döneminde AKTIF_KULLANICI globalini kuruyor. */
    await waitFor(()=>window.AKTIF_KULLANICI?.uid,12000).catch(()=>false);
    if(!window.AKTIF_KULLANICI?.uid)return false;

    AppStore.set('session.user',window.AKTIF_KULLANICI);
    AppStore.set('session.role',window.AKTIF_ROL||null);
    registerCore();

    /* Kullanıcı Firestore'u beklemez. */
    await SyncEngine.localHydrate(CORE_TYPES);
    AppStore.set('meta.hydrated',true);
    AppStore.set('session.ready',true);
    try{window.dispatchEvent(new CustomEvent('koruk:app-ready',{detail:{source:'device'}}))}catch(_){}

    /* Uzak kaynak yalnız arka planda günceller. */
    setTimeout(()=>SyncEngine.sync(CORE_TYPES),100);
    AppStore.set('meta.booted',true);
    started=true;
    return true;
  })().catch(e=>{console.warn('[AppBootstrap]',e?.message||e);return false});
  return readyPromise;
}

window.AppBootstrap={start,CORE_TYPES,get started(){return started}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>start(),{once:true});else start();
})();
