/* Koruk Asistan — Core v1
   Tek uygulama çekirdeği: AppStore + EventBus + IndexedDB + SyncEngine + Bootstrap.
   Veri akışı: IndexedDB -> AppStore -> UI; Firestore yalnız arka plan senkronizasyonudur.
   Remote sync politikası bu dosyanın içindedir; dışarıdan monkey-patch edilmez. */
(function(){
'use strict';
if(window.KorukCore&&window.KorukCore.version===1)return;
const REMOTE_SYNC_TTL=24*60*60*1000;
const ALL_SYNC_TYPES=['ogretmenler','dersProgrami','dersSaatleri','siniflar','veliler','servisler','nobetAtamalari','nobetYerleri','sinavlar','denemeSinavlari','duyurular','haberler','gorevler','hatirlaticilar','ogretmenIzinleri','notlar','yemekMenuleri','odevTakip','notCizelgesi'];
const AUTO_SYNC_TYPES=['duyurular','hatirlaticilar','gorevler','yemekMenuleri'];
const state={session:{user:null,role:null,ready:false},ui:{theme:'light',route:'panel',online:navigator.onLine,syncing:false,pendingWrites:0,lastSyncAt:null,syncError:null},data:Object.create(null),meta:{hydrated:false,booted:false}};
const listeners=new Map(),anyListeners=new Set();
function dataVisibility(type,value){if(type!=='sinavlar'||!Array.isArray(value))return value;const u=state.session.user||window.AKTIF_KULLANICI||{};if(u.admin===true)return value;const teacherId=String(u.bagliOgretmenId||u.ogretmenId||'');if(!teacherId)return value;return value.filter(row=>String(row?.ogretmenId||'')===teacherId||(!row?.ogretmenId&&!!u.uid&&row?.sahipUid===u.uid))}
function pathGet(path){const parts=String(path||'').split('.').filter(Boolean),value=parts.reduce((o,k)=>o==null?undefined:o[k],state);return parts[0]==='data'&&parts.length===2?dataVisibility(parts[1],value):value}
function emit(path,value){const parts=String(path||'').split('.').filter(Boolean),exposed=parts[0]==='data'&&parts.length===2?dataVisibility(parts[1],value):value;listeners.get(path)?.forEach(fn=>{try{fn(exposed,path,state)}catch(e){console.error('[AppStore]',e)}});anyListeners.forEach(fn=>{try{fn(path,exposed,state)}catch(e){console.error('[AppStore:any]',e)}});try{window.dispatchEvent(new CustomEvent('koruk:store-change',{detail:{path,value:exposed}}))}catch(_){}
}
function pathSet(path,value){const parts=String(path||'').split('.').filter(Boolean);if(!parts.length)return;let node=state;for(let i=0;i<parts.length-1;i++){const k=parts[i];if(!node[k]||typeof node[k]!=='object')node[k]={};node=node[k]}node[parts.at(-1)]=value;emit(path,value);return value}
function setData(type,value){state.data[type]=value;emit('data.'+type,value);return value}
function setDataMany(data){if(!data||typeof data!=='object')return state.data;const changes=Object.entries(data);for(const[type,value]of changes)state.data[type]=value;for(const[type,value]of changes)emit('data.'+type,value);return data}
function hydrateStore(data){if(data&&typeof data==='object')Object.entries(data).forEach(([k,v])=>state.data[k]=v);state.meta.hydrated=true;emit('meta.hydrated',true);return state.data}
function subscribe(path,fn,{immediate=false}={}){if(!listeners.has(path))listeners.set(path,new Set());listeners.get(path).add(fn);if(immediate)try{fn(pathGet(path),path,state)}catch(e){console.error('[AppStore]',e)}return()=>listeners.get(path)?.delete(fn)}
window.AppStore={__v2:true,get:pathGet,set:pathSet,data:t=>dataVisibility(t,state.data[t]),setData,setDataMany,hydrate:hydrateStore,subscribe,subscribeAll:fn=>(anyListeners.add(fn),()=>anyListeners.delete(fn)),snapshot:()=>{try{return structuredClone(state)}catch(_){return JSON.parse(JSON.stringify(state))}},get state(){return state},getir:pathGet,ayarla:pathSet,abone:(p,f)=>subscribe(p,f)};
window.addEventListener('online',()=>AppStore.set('ui.online',true),{passive:true});window.addEventListener('offline',()=>AppStore.set('ui.online',false),{passive:true});
(function installPullToRefreshAdapter(){if(window.__kaUnifiedPullRefresh)return;window.__kaUnifiedPullRefresh=true;let refreshing=false;async function refresh(source='programmatic'){if(refreshing)return;refreshing=true;try{if(typeof window.SyncEngine?.sync==='function')await window.SyncEngine.sync(undefined,{force:true,manual:true});window.dispatchEvent(new CustomEvent('koruk:pull-refresh',{detail:{source}}))}catch(error){console.warn('[PullRefresh]',error?.message||error)}finally{refreshing=false}}window.KorukPullRefresh={refresh,reset(){},get refreshing(){return refreshing}}})();
if(!window.EventBus){const events=new Map();window.EventBus={yayinla(name,data){events.get(name)?.forEach(fn=>{try{fn(data)}catch(e){console.error('[EventBus]',name,e)}})},dinle(name,fn){if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);return()=>events.get(name)?.delete(fn)},emit(name,data){this.yayinla(name,data)},on(name,fn){return this.dinle(name,fn)}}}
const DB='koruk-local-first-v1',VER=1,STORE='kv';let dbp=null,flushing=false,flushTimer=null,flushPromise=null,queueMutationChain=Promise.resolve();
function open(){if(dbp)return dbp;dbp=new Promise((resolve,reject)=>{let done=false;const to=setTimeout(()=>{if(done)return;done=true;dbp=null;reject(new Error('indexeddb-timeout'))},6000);const r=indexedDB.open(DB,VER);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>{if(done)return;done=true;clearTimeout(to);resolve(r.result)};r.onerror=()=>{if(done)return;done=true;clearTimeout(to);dbp=null;reject(r.error)};r.onblocked=()=>{if(done)return;done=true;clearTimeout(to);dbp=null;reject(new Error('indexeddb-blocked'))}});return dbp}
async function get(k,def=null){try{const d=await open();return await new Promise((res,rej)=>{const r=d.transaction(STORE,'readonly').objectStore(STORE).get(k);r.onsuccess=()=>res(r.result===undefined?def:r.result);r.onerror=()=>rej(r.error)})}catch(_){return def}}
async function set(k,v){const d=await open();return new Promise((res,rej)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).put(v,k);t.oncomplete=()=>res(v);t.onerror=()=>rej(t.error)})}
async function cache(u,type,data){return set(`u:${u||'anon'}:cache:${type}`,data)}
async function cached(u,type,def=[]){return get(`u:${u||'anon'}:cache:${type}`,def)}
async function hydrateLocal(u,types){const out={};for(const type of types||[])out[type]=await cached(u,type,[]);return out}
async function queue(u,op){const k=`u:${u||'anon'}:queue`,q=await get(k,[]);q.push({...op,qid:op.qid||`${Date.now()}-${Math.random()}`});await set(k,q);return q}
async function pending(u){return get(`u:${u||'anon'}:queue`,[])}
function uid(){return window.AKTIF_KULLANICI?.uid||AppStore.get('session.user')?.uid||''}
async function runWrite(op){if(!window.db)throw new Error('db-yok');const ref=op.id?db.collection(op.collection).doc(op.id):db.collection(op.collection).doc();if(op.kind==='delete-doc')return ref.delete();return ref.set(op.data||{}, {merge:op.merge!==false})}
async function flushWrites(){if(!navigator.onLine||!window.db)return;const u=uid();if(!u)return;const q=await pending(u);for(const op of q){try{await runWrite(op)}catch(e){continue}}await set(`u:${u}:queue`,[]);AppStore.set('ui.pendingWrites',0)}
function scheduleFlush(){clearTimeout(flushTimer);flushTimer=setTimeout(flushWrites,350)}
const SYNC_META='syncMeta';
const DELTA_TYPES=new Set(['ogretmenler','dersProgrami','dersSaatleri','siniflar','veliler','servisler','nobetAtamalari','nobetYerleri','sinavlar','denemeSinavlari','duyurular','haberler','gorevler','hatirlaticilar','ogretmenIzinleri','notlar','yemekMenuleri','odevTakip','notCizelgesi']);
function timestampValue(v){if(v==null)return 0;if(typeof v==='number')return v;const d=v?.toDate?v.toDate():new Date(v);const n=d.getTime();return Number.isFinite(n)?n:0}
function rowTimestamp(row){return timestampValue(row?.guncellenmeTarihi||row?.updatedAt||row?.updated_at||row?.createdAt||row?.created_at)}
async function getSyncMeta(u){return get(`u:${u||'anon'}:${SYNC_META}`,{})}
async function setSyncMeta(u,m){return set(`u:${u||'anon'}:${SYNC_META}`,m)}
async function fetchCollection(type,{force=false}={}){if(!window.db)return null;const u=uid();if(!u)return null;const meta=await getSyncMeta(u),last=Number(meta[type]||0),now=Date.now();if(!force&&last&&now-last<REMOTE_SYNC_TTL)return null;let snap;try{snap=await db.collection(type).get()}catch(e){AppStore.set('ui.syncError',String(e?.message||e));return null}const remote=snap.docs.map(d=>({id:d.id,...d.data()}));const current=await cached(u,type,[]);const merged=DELTA_TYPES.has(type)&&last?mergeDelta(current,remote,last):remote;await cache(u,type,merged);await setSyncMeta(u,{...meta,[type]:now});return merged}
function mergeDelta(current,remote,last){const map=new Map((Array.isArray(current)?current:[]).map(r=>[String(r.id),r]));for(const r of remote){const ts=rowTimestamp(r);if(ts>=last)map.set(String(r.id),r)}return [...map.values()]}
let syncPromise=null;
async function sync(types=ALL_SYNC_TYPES,{force=false,manual=false}={}){if(syncPromise)return syncPromise;if(!navigator.onLine||!window.db)return;syncPromise=(async()=>{AppStore.set('ui.syncing',true);try{const u=uid();if(!u)return;const names=[...(types||ALL_SYNC_TYPES)];for(const type of names){const rows=await fetchCollection(type,{force:force||manual});if(rows)AppStore.setData(type,rows)}await flushWrites();AppStore.set('ui.lastSyncAt',Date.now());}finally{AppStore.set('ui.syncing',false);syncPromise=null}})();return syncPromise}
window.SyncEngine={sync,pull:sync,schedule:(ms=800)=>setTimeout(()=>sync(),ms),startRealtime:()=>()=>{},register:()=>{},get syncTypes(){return ALL_SYNC_TYPES.slice()}};
window.KorukLocalFirst={open,get,set,cache,cached,hydrate:hydrateLocal,queue,pending,flush:flushWrites,schedule:scheduleFlush,uid};
async function bootstrap(){const u=uid();if(u){const local=await hydrateLocal(u,ALL_SYNC_TYPES);hydrateStore(local);for(const[t,v]of Object.entries(local))AppStore.setData(t,v)}AppStore.set('meta.booted',true);if(navigator.onLine)await sync(AUTO_SYNC_TYPES);}
window.KorukCore={version:1,state,bootstrap,sync};
window.addEventListener('online',()=>setTimeout(()=>sync(AUTO_SYNC_TYPES),500));
window.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigator.onLine)setTimeout(()=>sync(AUTO_SYNC_TYPES),800)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrap,{once:true});else bootstrap();
})();