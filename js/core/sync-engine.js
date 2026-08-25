/* Koruk Asistan — SyncEngine v1
   Firestore yalnız uzak senkronizasyon kaynağıdır.
   UI doğrudan Firestore beklemez: LocalDB -> AppStore -> UI.
   Bu çekirdek mevcut COL koleksiyon haritasını kullanır; yeni koleksiyon uydurmaz. */
(function(){
'use strict';
if(window.SyncEngine)return;

let syncing=false;
let timer=null;
const registered=new Map();

function uid(){return window.KorukLocalFirst?.uid?.()||window.AKTIF_KULLANICI?.uid||''}
function ready(){return !!(window.KorukLocalFirst&&window.AppStore&&window.db&&uid())}
function register(type,collection,opts={}){
  if(!type||!collection)return;
  registered.set(type,{type,collection,...opts});
}
function unregister(type){registered.delete(type)}

async function localHydrate(types){
  const u=uid();if(!u||!window.KorukLocalFirst)return {};
  const names=types?.length?types:Array.from(registered.keys());
  const data=await window.KorukLocalFirst.hydrate(u,names,{});
  window.AppStore?.hydrate?.(data);
  return data;
}

async function fetchCollection(def){
  let q=window.db.collection(def.collection);
  if(typeof def.query==='function')q=def.query(q)||q;
  const snap=await q.get();
  return snap.docs.map(doc=>({id:doc.id,...doc.data()}));
}

async function pull(types){
  if(!ready()||!navigator.onLine)return {updated:0,skipped:true};
  const names=types?.length?types:Array.from(registered.keys());
  if(!names.length)return {updated:0};
  syncing=true;window.AppStore.set('ui.syncing',true);
  let updated=0;
  try{
    for(const name of names){
      const def=registered.get(name);if(!def)continue;
      try{
        const rows=await fetchCollection(def);
        await window.KorukLocalFirst.cache(uid(),name,rows);
        window.AppStore.setData(name,rows);
        updated++;
      }catch(e){console.warn('[SyncEngine] pull',name,e?.message||e)}
    }
    const now=Date.now();
    await window.KorukLocalFirst.meta(uid(),'lastSyncAt',now);
    window.AppStore.set('ui.lastSyncAt',now);
    return {updated};
  }finally{
    syncing=false;window.AppStore.set('ui.syncing',false);
  }
}

async function flush(){
  if(!window.KorukLocalFirst)return 0;
  const left=await window.KorukLocalFirst.flush();
  const p=await window.KorukLocalFirst.pending(uid());
  window.AppStore?.set?.('ui.pendingWrites',p.length);
  return typeof left==='number'?left:p.length;
}

async function sync(types){
  if(syncing)return;
  await flush();
  return pull(types);
}
function schedule(ms=1200){clearTimeout(timer);timer=setTimeout(()=>sync(),ms)}
function definitions(){return Array.from(registered.values()).map(x=>({...x}))}

window.SyncEngine={register,unregister,localHydrate,pull,flush,sync,schedule,definitions,get syncing(){return syncing}};
window.addEventListener('online',()=>schedule(250),{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(250)});
})();
