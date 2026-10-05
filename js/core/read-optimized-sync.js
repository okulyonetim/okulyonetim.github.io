/* Koruk Asistan — Read Optimized Sync compatibility facade
 *
 * Local-first mimaride IndexedDB ilk açılış kaynağıdır; ancak yeni cihaz/tarayıcı
 * veya boş yerel önbellekte Firestore'dan ilk veri çekiminin mutlaka yapılmasını sağlar.
 * Remote-sync kararlarının sahibi core.js'tir. Bu dosya ikinci bir sync motoru oluşturmaz.
 */
(function(global){
'use strict';
if(global.__KA_READ_OPTIMIZED_SYNC__)return;
global.__KA_READ_OPTIMIZED_SYNC__=true;

const CRITICAL_TYPES=[
  'ogretmenler','dersProgrami','dersSaatleri','siniflar','veliler','servisler',
  'nobetAtamalari','nobetYerleri','servisOturma','sinavlar','denemeSinavlari',
  'ogretmenIzinleri','notlar','yemekMenuleri'
];

/* core.js içinde henüz ALL_SYNC_TYPES'e alınmamış fakat modüllerin doğrudan
   AppStore üzerinden kullandığı koleksiyonlar. Mevcut kayıt varsa tekrar
   register edilmez; böylece core.js'in özel query tanımları korunur. */
const EXTRA_TYPES=[
  'sosyalKulupler','belirliGunler','zumre','sok','bepPlani','rehberlik','maarifRapor',
  'digerEvrak','nobetRotasyon','dokumanlar','yoklama','haritaFavoriler','personel',
  'dilekceler','personelIzinler','haberKaynaklari','kullanicilar','roller','ozelMenu',
  'navDuzeni','konusmalar','mesajlar','anketler','kullaniciIstatistikleri',
  'akademikTakvim','kontrolListeleri','kontrolListeTamamlama','denemeSonuclari',
  'testSonuclari','yillikPlanBasliklari','yillikPlanTanimlari',
  'ogretmenYillikPlanSecimleri','devamsizlikCizelgesi','yillikPlanNotlari',
  'ogretmenListeSablon','ogretmenListeKayit','toplantiCizelgesi','idariBilgiler'
];

function status(){
  const ttl=Number(global.SyncEngine?.remoteTTL||24*60*60*1000);
  return Promise.resolve({
    localFirst:true,
    realtime:false,
    remoteTTL:ttl,
    periodicSyncMs:null,
    policyOwner:'core.js',
    lastRemotePullAt:Number(global.AppStore?.get?.('meta.lastRemoteSyncAt')||0)
  });
}

function registeredNames(){
  return (global.SyncEngine?.definitions?.()||[]).map(x=>x?.type).filter(Boolean);
}

function registerExtraCollections(){
  if(!global.COL||!global.SyncEngine?.register)return;
  const existing=new Set(registeredNames());
  for(const type of EXTRA_TYPES){
    if(existing.has(type))continue;
    const collection=global.COL[type];
    if(collection)global.SyncEngine.register(type,collection);
  }
}

async function cacheMissing(types){
  const u=global.KorukLocalFirst?.uid?.();
  if(!u||!global.KorukLocalFirst?.cached)return true;
  for(const type of types){
    const marker=await global.KorukLocalFirst.cached(u,type,'__ka_missing__');
    if(marker==='__ka_missing__')return true;
  }
  return false;
}

async function initialRemoteSync(){
  if(!navigator.onLine||!global.SyncEngine?.sync||!global.KorukLocalFirst)return false;
  const u=global.KorukLocalFirst.uid?.();
  if(!u)return false;
  registerExtraCollections();
  const types=registeredNames();
  if(!types.length)return false;

  /* Boş/temiz tarayıcıda mutlaka tam veri çek. Ayrıca ilk başarılı açılıştan
     sonra kritik okul verisini 15 dakikadan eskiyse yeniden doğrula. */
  const last=Number(await global.KorukLocalFirst.meta(u,'readOptimizedInitialSyncAt')||0);
  const missing=await cacheMissing(CRITICAL_TYPES);
  const stale=!last||Date.now()-last>15*60*1000;
  if(!missing&&!stale)return false;

  try{
    await global.SyncEngine.sync(types,{force:true,manual:true});
    await global.KorukLocalFirst.meta(u,'readOptimizedInitialSyncAt',Date.now());
    return true;
  }catch(error){
    console.warn('[ReadOptimizedSync] Firestore ilk/veri doğrulama senkronizasyonu başarısız:',error?.message||error);
    return false;
  }
}

async function waitAndSync(){
  for(let i=0;i<240;i++){
    if(global.SyncEngine&&global.AppStore&&global.KorukLocalFirst&&global.COL&&global.AKTIF_KULLANICI?.uid){
      if(navigator.onLine)await initialRemoteSync();
      return;
    }
    await new Promise(resolve=>setTimeout(resolve,250));
  }
}

/* app-ready olayı kaçırılmış olsa bile boot tamamlandıysa kontrolü çalıştır. */
function boot(){
  waitAndSync().catch(e=>console.warn('[ReadOptimizedSync]',e?.message||e));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
global.addEventListener('koruk:app-ready',()=>{initialRemoteSync().catch(e=>console.warn('[ReadOptimizedSync]',e?.message||e))});
global.addEventListener('online',()=>{initialRemoteSync().catch(e=>console.warn('[ReadOptimizedSync]',e?.message||e))},{passive:true});

global.KorukReadOptimized={
  remoteTTL:Number(global.SyncEngine?.remoteTTL||24*60*60*1000),
  periodicSyncMs:null,
  periodicTypes:[],
  forceSync:async function(types){
    registerExtraCollections();
    return global.SyncEngine?.sync?.(types?.length?types:registeredNames(),{force:true,manual:true});
  },
  status,
  initialRemoteSync
};
})(window);