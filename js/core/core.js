/* Koruk Asistan — Core v1
   Tek uygulama çekirdeği: AppStore + EventBus + IndexedDB + SyncEngine + Bootstrap.
   Veri akışı: IndexedDB -> AppStore -> UI; Firestore yalnız arka plan senkronizasyonudur.
   Mevcut IndexedDB adı/anahtarları ve firebase-init.js COL haritası korunur. */
(function(){
'use strict';
if(window.KorukCore&&window.KorukCore.version===1)return;

/* ========================= APP STORE ========================= */
const state={
  session:{user:null,role:null,ready:false},
  ui:{theme:'light',route:'panel',online:navigator.onLine,syncing:false,pendingWrites:0,lastSyncAt:null},
  data:Object.create(null),
  meta:{hydrated:false,booted:false}
};
const listeners=new Map(),anyListeners=new Set();
function pathGet(path){return String(path||'').split('.').filter(Boolean).reduce((o,k)=>o==null?undefined:o[k],state)}
function emit(path,value){
  listeners.get(path)?.forEach(fn=>{try{fn(value,path,state)}catch(e){console.error('[AppStore]',e)}});
  anyListeners.forEach(fn=>{try{fn(path,value,state)}catch(e){console.error('[AppStore:any]',e)}});
  try{window.dispatchEvent(new CustomEvent('koruk:store-change',{detail:{path,value}}))}catch(_){}
}
function pathSet(path,value){
  const parts=String(path||'').split('.').filter(Boolean);if(!parts.length)return;
  let node=state;for(let i=0;i<parts.length-1;i++){const k=parts[i];if(!node[k]||typeof node[k]!=='object')node[k]={};node=node[k]}
  node[parts.at(-1)]=value;emit(path,value);return value;
}
function setData(type,value){state.data[type]=value;emit('data.'+type,value);return value}
function hydrateStore(data){if(data&&typeof data==='object')Object.entries(data).forEach(([k,v])=>state.data[k]=v);state.meta.hydrated=true;emit('meta.hydrated',true);return state.data}
function subscribe(path,fn,{immediate=false}={}){if(!listeners.has(path))listeners.set(path,new Set());listeners.get(path).add(fn);if(immediate)try{fn(pathGet(path),path,state)}catch(e){console.error('[AppStore]',e)}return()=>listeners.get(path)?.delete(fn)}
window.AppStore={__v2:true,get:pathGet,set:pathSet,data:t=>state.data[t],setData,hydrate:hydrateStore,subscribe,subscribeAll:fn=>(anyListeners.add(fn),()=>anyListeners.delete(fn)),snapshot:()=>{try{return structuredClone(state)}catch(_){return JSON.parse(JSON.stringify(state))}},get state(){return state},getir:pathGet,ayarla:pathSet,abone:(p,f)=>subscribe(p,f)};
window.addEventListener('online',()=>AppStore.set('ui.online',true),{passive:true});
window.addEventListener('offline',()=>AppStore.set('ui.online',false),{passive:true});

/* ========================= EVENT BUS ========================= */
if(!window.EventBus){
  const events=new Map();
  window.EventBus={
    yayinla(name,data){events.get(name)?.forEach(fn=>{try{fn(data)}catch(e){console.error('[EventBus]',name,e)}})},
    dinle(name,fn){if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);return()=>events.get(name)?.delete(fn)},
    emit(name,data){this.yayinla(name,data)},on(name,fn){return this.dinle(name,fn)}
  };
}

/* ========================= LOCAL DB ========================= */
const DB='koruk-local-first-v1',VER=1,STORE='kv';
let dbp=null,flushing=false,flushTimer=null;
function open(){
  if(dbp)return dbp;
  dbp=new Promise((resolve,reject)=>{
    let done=false;const to=setTimeout(()=>{if(done)return;done=true;dbp=null;reject(new Error('indexeddb-timeout'))},6000);
    const r=indexedDB.open(DB,VER);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};
    r.onsuccess=()=>{if(done)return;done=true;clearTimeout(to);resolve(r.result)};
    r.onerror=()=>{if(done)return;done=true;clearTimeout(to);dbp=null;reject(r.error)};
    r.onblocked=()=>{if(done)return;done=true;clearTimeout(to);dbp=null;reject(new Error('indexeddb-blocked'))};
  });return dbp;
}
async function get(k,def=null){try{const d=await open();return await new Promise((res,rej)=>{const r=d.transaction(STORE,'readonly').objectStore(STORE).get(k);r.onsuccess=()=>res(r.result===undefined?def:r.result);r.onerror=()=>rej(r.error)})}catch(_){return def}}
async function set(k,v){const d=await open();return new Promise((res,rej)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).put(v,k);t.oncomplete=()=>res(v);t.onerror=()=>rej(t.error)})}
async function setMany(entries){if(!entries?.length)return;const d=await open();return new Promise((res,rej)=>{const t=d.transaction(STORE,'readwrite'),s=t.objectStore(STORE);entries.forEach(([k,v])=>s.put(v,k));t.oncomplete=res;t.onerror=()=>rej(t.error)})}
async function del(k){const d=await open();return new Promise((res,rej)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).delete(k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}
const key=(u,s)=>`u:${u||'anon'}:${s}`;
function uid(){try{return window.AKTIF_KULLANICI?.uid||AppStore.get('session.user')?.uid||''}catch(_){return''}}
async function queue(u,op){const k=key(u,'queue'),q=await get(k,[]),qid=op.qid||`${Date.now()}-${Math.random().toString(36).slice(2)}`,next={...op,qid,createdAt:op.createdAt||Date.now(),tries:op.tries||0},i=q.findIndex(x=>x.qid===qid);if(i>=0)q[i]=next;else q.push(next);await set(k,q);scheduleFlush();return next}
async function pending(u=uid()){return u?get(key(u,'queue'),[]):[]}
async function tombstone(u,type,id,on=true){const k=key(u,`tomb:${type}`),x=await get(k,{});if(on)x[id]=Date.now();else delete x[id];await set(k,x);return x}
const tombstones=(u,type)=>get(key(u,`tomb:${type}`),{});
const cache=(u,type,data)=>set(key(u,`cache:${type}`),data);
const cached=(u,type,def=[])=>get(key(u,`cache:${type}`),def);
async function cacheMany(u,data){if(!u||!data||typeof data!=='object')return;const rows=Object.entries(data).map(([type,val])=>[key(u,`cache:${type}`),val]);rows.push([key(u,'meta:lastLocalWriteAt'),Date.now()]);await setMany(rows);return data}
async function hydrateLocal(u,types,defaults={}){const out={};for(const type of types||[])out[type]=await cached(u,type,Object.prototype.hasOwnProperty.call(defaults,type)?defaults[type]:[]);return out}
async function meta(u,name,value){const k=key(u,`meta:${name}`);if(arguments.length>=3){await set(k,value);return value}return get(k,null)}
async function runWrite(op){if(!window.db)throw new Error('db-yok');const ref=op.id?db.collection(op.collection).doc(op.id):null;if(op.kind==='delete-doc')return ref.delete();if(op.kind==='set-doc')return ref.set(op.data,{merge:!!op.merge});if(op.kind==='update-doc')return ref.set(op.data,{merge:true});if(op.kind==='delete-query'){const s=await db.collection(op.collection).where(op.field,'==',op.value).get();if(s.empty)return;const b=db.batch();s.docs.forEach(d=>b.delete(d.ref));return b.commit()}throw new Error('op-bilinmiyor')}
async function flushWrites(){if(flushing||!navigator.onLine)return;const u=uid();if(!u)return;flushing=true;const k=key(u,'queue');try{const q=await get(k,[]),left=[];for(const op of q){try{await runWrite(op);if(op.tombType&&op.tombId)await tombstone(u,op.tombType,op.tombId,false)}catch(e){op.tries=(op.tries||0)+1;op.lastError=String(e?.message||e);op.lastTryAt=Date.now();left.push(op)}}await set(k,left);AppStore.set('ui.pendingWrites',left.length);window.dispatchEvent(new CustomEvent('koruk:sync-state',{detail:{pending:left.length}}));return left.length}finally{flushing=false}}
function scheduleFlush(){clearTimeout(flushTimer);flushTimer=setTimeout(flushWrites,350)}
window.KorukLocalFirst={open,get,set,setMany,del,queue,pending,tombstone,tombstones,cache,cached,cacheMany,hydrate:hydrateLocal,meta,markBootstrap:(u,d={})=>meta(u,'bootstrap',{ready:true,completedAt:Date.now(),...d}),bootstrapState:u=>meta(u,'bootstrap'),isBootstrapReady:async u=>!!(await meta(u,'bootstrap'))?.ready,flush:flushWrites,schedule:scheduleFlush,uid};

/* ========================= SYNC ENGINE ========================= */
let syncing=false,syncTimer=null;const registered=new Map();
function syncReady(){return !!(window.db&&uid())}
function register(type,collection,opts={}){if(type&&collection)registered.set(type,{type,collection,...opts})}
async function localHydrate(types){const u=uid();if(!u)return{};const names=types?.length?types:Array.from(registered.keys()),data=await hydrateLocal(u,names,{});AppStore.hydrate(data);return data}
async function fetchCollection(def){let q=db.collection(def.collection);if(typeof def.query==='function')q=def.query(q)||q;const snap=await q.get();return snap.docs.map(doc=>({id:doc.id,...doc.data()}))}
async function pull(types){if(!syncReady()||!navigator.onLine)return{updated:0,skipped:true};const names=types?.length?types:Array.from(registered.keys());if(!names.length)return{updated:0};syncing=true;AppStore.set('ui.syncing',true);let updated=0;try{for(const name of names){const def=registered.get(name);if(!def)continue;try{const rows=await fetchCollection(def);await cache(uid(),name,rows);AppStore.setData(name,rows);updated++}catch(e){console.warn('[SyncEngine]',name,e?.message||e)}}const now=Date.now();await meta(uid(),'lastSyncAt',now);AppStore.set('ui.lastSyncAt',now);return{updated}}finally{syncing=false;AppStore.set('ui.syncing',false)}}
async function sync(types){if(syncing)return;await flushWrites();return pull(types)}
function scheduleSync(ms=1200){clearTimeout(syncTimer);syncTimer=setTimeout(()=>sync(),ms)}
window.SyncEngine={register,unregister:t=>registered.delete(t),localHydrate,pull,flush:flushWrites,sync,schedule:scheduleSync,definitions:()=>Array.from(registered.values()).map(x=>({...x})),get syncing(){return syncing}};

/* ========================= BOOTSTRAP ========================= */
const CORE_TYPES=['ogretmenler','dersProgrami','siniflar','veliler','servisler','nobetAtamalari','nobetYerleri','sinavlar','denemeSinavlari','duyurular','haberler','gorevler','hatirlaticilar','ogretmenIzinleri','notlar'];
let bootPromise=null,booted=false;
function waitFor(test,timeout=12000,step=50){return new Promise((resolve,reject)=>{const start=Date.now(),tick=()=>{let ok=false;try{ok=!!test()}catch(_){}if(ok)return resolve(true);if(Date.now()-start>=timeout)return reject(new Error('bootstrap-timeout'));setTimeout(tick,step)};tick()})}
function registerCore(){if(!window.COL)return;const pairs={ogretmenler:COL.ogretmenler,dersProgrami:COL.dersProgrami,siniflar:COL.siniflar,veliler:COL.veliler,servisler:COL.servisler,nobetAtamalari:COL.nobetAtamalari,nobetYerleri:COL.nobetYerleri,sinavlar:COL.sinavlar,denemeSinavlari:COL.denemeSinavlari,duyurular:COL.duyurular,haberler:COL.haberler,gorevler:COL.gorevler,hatirlaticilar:COL.hatirlaticilar,ogretmenIzinleri:COL.ogretmenIzinleri,notlar:COL.notlar};Object.entries(pairs).forEach(([type,col])=>col&&register(type,col))}
async function start(){if(bootPromise)return bootPromise;bootPromise=(async()=>{await waitFor(()=>window.COL&&window.AppStore&&window.KorukLocalFirst);await waitFor(()=>window.AKTIF_KULLANICI?.uid).catch(()=>false);if(!window.AKTIF_KULLANICI?.uid)return false;AppStore.set('session.user',AKTIF_KULLANICI);AppStore.set('session.role',window.AKTIF_ROL||null);registerCore();await localHydrate(CORE_TYPES);AppStore.set('session.ready',true);AppStore.set('meta.hydrated',true);window.dispatchEvent(new CustomEvent('koruk:app-ready',{detail:{source:'device'}}));setTimeout(()=>sync(CORE_TYPES),100);AppStore.set('meta.booted',true);booted=true;return true})().catch(e=>{console.warn('[AppBootstrap]',e?.message||e);return false});return bootPromise}
window.AppBootstrap={start,CORE_TYPES,get started(){return booted}};

window.addEventListener('online',()=>{scheduleFlush();scheduleSync(250)},{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){scheduleFlush();scheduleSync(250)}});
setInterval(flushWrites,12000);
window.KorukCore={version:1,start};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
