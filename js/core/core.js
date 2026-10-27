/* Koruk Asistan — Core v1
   Tek uygulama çekirdeği: AppStore + EventBus + IndexedDB + SyncEngine + Bootstrap.
   Veri akışı: IndexedDB -> AppStore -> UI; Firestore yalnız arka plan senkronizasyonudur.
   Remote sync politikası bu dosyanın içindedir; dışarıdan monkey-patch edilmez. */
/* Cihaza özel küçük tercihler (şablon seçimi gibi); veri değildir, senkronize edilmez. */
(function(g){if(g.KaPrefs)return;g.KaPrefs=Object.freeze({get(k,d=''){try{const v=g.localStorage?.getItem('ka-pref:'+k);return v==null?d:v}catch(_){return d}},set(k,v){try{g.localStorage?.setItem('ka-pref:'+k,String(v))}catch(_){}},
/* Hesap bazlı küçük tercih eşitlemesi: kullanıcının kendi oy_kullaniciTercihleri/{uid} belgesi (mevcut kural, yeni koleksiyon yok). Hata/çevrimdışıysa sessizce yerel çalışır. */
remoteRef(){try{const u=g.auth?.currentUser;return u&&g.db?g.db.collection('oy_kullaniciTercihleri').doc(u.uid):null}catch(_){return null}},
remoteGet(){const r=this.remoteRef();return r?r.get().then(d=>d.exists?d.data():null).catch(()=>null):Promise.resolve(null)},
remoteSet(obj){const r=this.remoteRef();return r?r.set(obj,{merge:true}).catch(()=>{}):Promise.resolve()},
/* Aynı belgeyi canlı dinler (tek dinleyici, çok abone): başka cihazdaki değişiklik gelince fn(veri) çağrılır; abone olunca son bilinen veri hemen verilir. Yerel yazma yankıları ve önbellek anlık görüntüleri atlanır. */
remoteListen(fn){
  if(typeof fn!=='function')return null;
  const ref=this.remoteRef();if(!ref)return null;
  const uid=g.auth?.currentUser?.uid||'',hub=g.__kaPrefHub||(g.__kaPrefHub={fns:new Set(),off:null,uid:'',has:false,last:null});
  hub.fns.add(fn);
  if(!hub.off||hub.uid!==uid){
    try{hub.off?.()}catch(_){}
    hub.uid=uid;hub.has=false;hub.last=null;
    try{hub.off=ref.onSnapshot({includeMetadataChanges:true},snap=>{
      if(snap.metadata?.fromCache||snap.metadata?.hasPendingWrites||(g.auth?.currentUser?.uid||'')!==hub.uid)return;
      hub.has=true;hub.last=snap.exists?snap.data():null;
      hub.fns.forEach(f=>{try{f(hub.last)}catch(e){console.warn('[KaPrefs]',e?.message||e)}});
    },()=>{hub.off=null})}catch(_){hub.off=null}
  }else if(hub.has)Promise.resolve().then(()=>{if(hub.fns.has(fn))fn(hub.last)});
  return()=>{hub.fns.delete(fn)};
}})})(window);
(function(){
'use strict';
if(window.KorukCore&&window.KorukCore.version===1)return;
const REMOTE_SYNC_TTL=24*60*60*1000;const FULL_VERIFY_TTL=7*24*60*60*1000;
/* Delta penceresi: cihaz saatleri arasındaki küçük fark ve gecikmeli gönderim payı. Çevrimdışı birikmiş yazma gönderilirken damgası yenilenir (flushWrites). */
const DELTA_SKEW_MS=2*60*1000;
const ALL_SYNC_TYPES=['kurulKomisyonlar','ogretmenler','dersProgrami','dersSaatleri','siniflar','veliler','servisler','nobetAtamalari','nobetYerleri','sinavlar','denemeSinavlari','duyurular','haberler','gorevler','hatirlaticilar','ogretmenIzinleri','notlar','yemekMenuleri','odevTakip','notCizelgesi'];
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
async function getMany(keys,defaults={}){const list=[...new Set(keys||[])];if(!list.length)return{};try{const d=await open();return await new Promise((res,rej)=>{const out={},t=d.transaction(STORE,'readonly'),store=t.objectStore(STORE);for(const k of list){const r=store.get(k);r.onsuccess=()=>{out[k]=r.result===undefined?defaults[k]:r.result}}t.oncomplete=()=>{for(const k of list)if(!Object.prototype.hasOwnProperty.call(out,k))out[k]=defaults[k];res(out)};t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error||new Error('indexeddb-abort'))})}catch(_){return Object.fromEntries(list.map(k=>[k,defaults[k]]))}}
async function set(k,v){const d=await open();return new Promise((res,rej)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).put(v,k);t.oncomplete=()=>res(v);t.onerror=()=>rej(t.error)})}
async function setMany(entries){if(!entries?.length)return;const d=await open();return new Promise((res,rej)=>{const t=d.transaction(STORE,'readwrite'),s=t.objectStore(STORE);entries.forEach(([k,v])=>s.put(v,k));t.oncomplete=res;t.onerror=()=>rej(t.error)})}
async function del(k){const d=await open();return new Promise((res,rej)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).delete(k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}
async function entriesByPrefix(prefix){const d=await open();return new Promise((res,rej)=>{const out=[],r=d.transaction(STORE,'readonly').objectStore(STORE).openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return res(out);if(String(c.key).startsWith(prefix))out.push([String(c.key),c.value]);c.continue()};r.onerror=()=>rej(r.error)})}
const key=(u,s)=>`u:${u||'anon'}:${s}`;function uid(){try{return window.AKTIF_KULLANICI?.uid||AppStore.get('session.user')?.uid||''}catch(_){return''}}
function mutateQueue(u,mutator){const k=key(u,'queue'),run=queueMutationChain.then(async()=>{const current=await get(k,[]),working=Array.isArray(current)?current.slice():[],changed=await mutator(working),next=Array.isArray(changed)?changed:working;await set(k,next);return next});queueMutationChain=run.catch(()=>{});return run}
async function queue(u,op){const qid=op.qid||`${Date.now()}-${Math.random().toString(36).slice(2)}`,next={...op,qid,createdAt:op.createdAt||Date.now(),tries:op.tries||0};await mutateQueue(u,q=>{const i=q.findIndex(x=>x.qid===qid);if(i>=0)q[i]=next;else q.push(next);return q});scheduleFlush();return next}
async function pending(u=uid()){return u?get(key(u,'queue'),[]):[]}
async function tombstone(u,type,id,on=true){const k=key(u,`tomb:${type}`),x=await get(k,{});if(on)x[id]=Date.now();else delete x[id];await set(k,x);return x}
const tombstones=(u,type)=>get(key(u,`tomb:${type}`),{});const cache=(u,type,data)=>set(key(u,`cache:${type}`),data);const cached=(u,type,def=[])=>get(key(u,`cache:${type}`),def);
async function cacheMany(u,data,{markWrite=true}={}){if(!u||!data||typeof data!=='object')return;const rows=Object.entries(data).map(([type,val])=>[key(u,`cache:${type}`),val]);if(markWrite)rows.push([key(u,'meta:lastLocalWriteAt'),Date.now()]);await setMany(rows);return data}
async function hydrateLocal(u,types,defaults={}){const names=[...(types||[])],keys=names.map(type=>key(u,`cache:${type}`)),defs={};names.forEach((type,i)=>{defs[keys[i]]=Object.prototype.hasOwnProperty.call(defaults,type)?defaults[type]:[]});const values=await getMany(keys,defs),out={};names.forEach((type,i)=>{out[type]=values[keys[i]]});return out}
async function meta(u,name,value){const k=key(u,`meta:${name}`);if(arguments.length>=3){await set(k,value);return value}return get(k,null)}
async function userSnapshot(u=uid()){if(!u)return{caches:{},tombstones:{},meta:{},queue:[]};const prefix=`u:${u}:`,entries=await entriesByPrefix(prefix),out={caches:{},tombstones:{},meta:{},queue:[]};for(const[k,v]of entries){const scope=k.slice(prefix.length);if(scope==='queue'){out.queue=Array.isArray(v)?v:[];continue}if(scope.startsWith('cache:')){out.caches[scope.slice(6)]=v;continue}if(scope.startsWith('tomb:')){out.tombstones[scope.slice(5)]=v&&typeof v==='object'?v:{};continue}if(scope.startsWith('meta:'))out.meta[scope.slice(5)]=v}return out}
function firestoreSafeValue(value,seen=new WeakSet()){if(value===undefined)return undefined;if(value===null||typeof value!=='object')return value;if(value instanceof Date)return value;if(seen.has(value))throw new Error('firestore-circular-data');seen.add(value);if(Array.isArray(value)){const out=value.map(v=>{const x=firestoreSafeValue(v,seen);return x===undefined?null:x});seen.delete(value);return out}const proto=Object.getPrototypeOf(value);if(proto!==Object.prototype&&proto!==null){seen.delete(value);return value}const out={};for(const[k,v]of Object.entries(value)){const x=firestoreSafeValue(v,seen);if(x!==undefined)out[k]=x}seen.delete(value);return out}
async function runWrite(op){if(!window.db)throw new Error('db-yok');const ref=op.id?db.collection(op.collection).doc(op.id):null;if(op.kind==='delete-doc')return ref.delete();if(op.kind==='set-doc')return ref.set(firestoreSafeValue(op.data),{merge:!!op.merge});if(op.kind==='update-doc')return ref.set(firestoreSafeValue(op.data),{merge:true});if(op.kind==='delete-query'){const s=await db.collection(op.collection).where(op.field,'==',op.value).get();if(s.empty)return;const b=db.batch();s.docs.forEach(d=>b.delete(d.ref));return b.commit()}throw new Error('op-bilinmiyor')}
const PERM_ERROR=/permission|unauthorized|insufficient|PERMISSION_DENIED/i;const MAX_PERM_TRIES=3;function flushWrites(){if(!navigator.onLine)return Promise.resolve();if(flushPromise)return flushPromise;const u=uid();if(!u)return Promise.resolve();flushing=true;flushPromise=(async()=>{const q=await get(key(u,'queue'),[]),failed=new Map(),dropped=[],snapshotIds=new Set((Array.isArray(q)?q:[]).map(op=>op.qid));for(const original of Array.isArray(q)?q:[]){const op={...original};try{if(op.data&&typeof op.data==='object'&&op.data.guncellenmeTarihi&&Date.now()-timestampValue(op.data.guncellenmeTarihi)>DELTA_SKEW_MS)op.data={...op.data,guncellenmeTarihi:new Date()};await runWrite(op);signalNote(op);if(op.tombType&&op.tombId)await tombstone(u,op.tombType,op.tombId,false)}catch(e){op.tries=(op.tries||0)+1;op.lastError=String(e?.message||e);op.lastTryAt=Date.now();if(PERM_ERROR.test(op.lastError)&&op.tries>=MAX_PERM_TRIES){dropped.push(op);console.warn('[SyncQueue] İzin hatası — işlem kuyruktan kaldırıldı:',op.kind,op.collection,op.id,op.lastError)}else{failed.set(op.qid,op)}}}const finalQueue=await mutateQueue(u,current=>{const next=[];for(const op of current){if(!snapshotIds.has(op.qid)){next.push(op);continue}const retry=failed.get(op.qid);if(retry)next.push(retry)/* dropped ops are silently removed */}return next});const firstError=[...failed.values()][0]?.lastError||null;AppStore.set('ui.syncError',firstError);AppStore.set('ui.pendingWrites',finalQueue.length);signalFlushed();window.dispatchEvent(new CustomEvent('koruk:sync-state',{detail:{pending:finalQueue.length,dropped:dropped.length}}));return finalQueue.length})().finally(()=>{flushing=false;flushPromise=null});return flushPromise}
function scheduleFlush(){clearTimeout(flushTimer);flushTimer=setTimeout(flushWrites,350)}
window.KorukLocalFirst={open,get,getMany,set,setMany,del,queue,pending,tombstone,tombstones,cache,cached,cacheMany,hydrate:hydrateLocal,meta,userSnapshot,markBootstrap:(u,d={})=>meta(u,'bootstrap',{ready:true,completedAt:Date.now(),...d}),bootstrapState:u=>meta(u,'bootstrap'),isBootstrapReady:async u=>!!(await meta(u,'bootstrap'))?.ready,flush:flushWrites,schedule:scheduleFlush,uid};
const dataRevisions=new Map(),activeDeviceWrites=new Map();function dataRevision(type){return Number(dataRevisions.get(type)||0)}function markDataRevision(type){const next=dataRevision(type)+1;dataRevisions.set(type,next);return next}function revisionSnapshot(types){return Object.fromEntries((types||[]).map(type=>[type,dataRevision(type)]))}function beginDeviceWrite(type){activeDeviceWrites.set(type,Number(activeDeviceWrites.get(type)||0)+1)}function endDeviceWrite(type){const next=Math.max(0,Number(activeDeviceWrites.get(type)||0)-1);if(next)activeDeviceWrites.set(type,next);else activeDeviceWrites.delete(type)}function deviceWriteActive(type){return Number(activeDeviceWrites.get(type)||0)>0}function deviceList(type){const v=AppStore.data(type);return Array.isArray(v)?v:[]}function deviceId(){try{return crypto.randomUUID()}catch(_){return`local-${Date.now()}-${Math.random().toString(36).slice(2)}`}}
async function devicePersist(type,rows){const next=Array.isArray(rows)?rows:[];markDataRevision(type);AppStore.setData(type,next);const u=uid();if(u)await cache(u,type,next);return next}
function writeTimestamp(data){const now=new Date();const value={...(data||{})};if(!value.guncellenmeTarihi)value.guncellenmeTarihi=now;if(!value.updatedAt)value.updatedAt=now;return value}
function deviceListen(type,callback){const run=v=>{try{callback(Array.isArray(v)?v:[],{source:'device'})}catch(e){console.error('[DeviceData]',type,e)}};run(deviceList(type));return AppStore.subscribe('data.'+type,run)}
async function deviceAdd(type,collection,data,{id=null}={}){beginDeviceWrite(type);try{const docId=id||deviceId(),row={id:docId,...writeTimestamp(data)};await devicePersist(type,[...deviceList(type).filter(x=>x?.id!==docId),row]);await queue(uid(),{kind:'set-doc',collection,id:docId,data:writeTimestamp(data),dataType:type});AppStore.set('ui.pendingWrites',(await pending()).length);return{id:docId,...row}}finally{endDeviceWrite(type)}}
async function deviceUpdate(type,collection,id,data){if(!id)throw new Error('id-gerekli');beginDeviceWrite(type);try{const rows=deviceList(type),i=rows.findIndex(x=>x?.id===id),patch=writeTimestamp(data),row=i>=0?{...rows[i],...patch}:{id,...patch},next=i>=0?rows.map((x,n)=>n===i?row:x):[...rows,row];await devicePersist(type,next);await queue(uid(),{kind:'update-doc',collection,id,data:patch,dataType:type});AppStore.set('ui.pendingWrites',(await pending()).length);return row}finally{endDeviceWrite(type)}}
async function deviceSet(type,collection,id,data,{merge=false}={}){if(!id)throw new Error('id-gerekli');beginDeviceWrite(type);try{const rows=deviceList(type),i=rows.findIndex(x=>x?.id===id),patch=writeTimestamp(data),row=merge&&i>=0?{...rows[i],...patch}:{id,...patch},next=i>=0?rows.map((x,n)=>n===i?row:x):[...rows,row];await devicePersist(type,next);await queue(uid(),{kind:'set-doc',collection,id,data:patch,merge,dataType:type});AppStore.set('ui.pendingWrites',(await pending()).length);return row}finally{endDeviceWrite(type)}}
async function deviceRemove(type,collection,id){if(!id)throw new Error('id-gerekli');beginDeviceWrite(type);try{await devicePersist(type,deviceList(type).filter(x=>x?.id!==id));const u=uid();if(u)await tombstone(u,type,id,true);await queue(u,{kind:'delete-doc',collection,id,tombType:type,tombId:id,dataType:type});AppStore.set('ui.pendingWrites',(await pending()).length);return true}finally{endDeviceWrite(type)}}
function deviceGet(type,id){return deviceList(type).find(x=>x?.id===id)||null}
window.DeviceData={list:deviceList,get:deviceGet,listen:deviceListen,persist:devicePersist,add:deviceAdd,update:deviceUpdate,set:deviceSet,remove:deviceRemove,newId:deviceId};
function dutyBookTeacherId(){const u=window.AKTIF_KULLANICI||AppStore.get('session.user')||{};return u.bagliOgretmenId||u.ogretmenId||''}function dutyBookCanToggle(atama){const u=window.AKTIF_KULLANICI||AppStore.get('session.user')||{},tid=dutyBookTeacherId();return!!(u.admin===true||(tid&&atama?.ogretmenId===tid))}async function dutyBookToggle(atama,deger){if(!atama?.id)throw new Error('atama-yok');if(!dutyBookCanToggle(atama))throw new Error('sahip-degil');if(!window.COL?.nobetAtamalari)throw new Error('nobet-koleksiyonu-yok');return deviceUpdate('nobetAtamalari',COL.nobetAtamalari,atama.id,{defterDolduruldu:!!deger})}window.DutyBookService={teacherId:dutyBookTeacherId,canToggle:dutyBookCanToggle,toggle:dutyBookToggle};
let syncing=false,syncPromise=null,syncTimer=null;const registered=new Map();const REMOTE_BATCH_SIZE=4;
const SYNC_PRIORITY=['kurulKomisyonlar','ogretmenler','dersProgrami','dersSaatleri','siniflar','nobetAtamalari','nobetYerleri','hatirlaticilar','gorevler','duyurular','servisler','veliler','sinavlar','denemeSinavlari','ogretmenIzinleri','notlar','haberler'];
function syncReady(){return!!(window.db&&uid())}
function register(type,collection,opts={}){if(type&&collection){registered.set(type,{type,collection,...opts});signalCatchUp(type)}}
function requestedSyncNames(types,options={}){if(types?.length)return[...types];return options?.force||options?.manual||options?.bootstrap?ALL_SYNC_TYPES.slice():AUTO_SYNC_TYPES.slice()}
function orderedSyncNames(types){const rank=new Map(SYNC_PRIORITY.map((name,index)=>[name,index]));return[...new Set(types||[])].sort((a,b)=>(rank.get(a)??999)-(rank.get(b)??999))}
/* Henüz sunucuya gitmemiş (kuyrukta bekleyen) yerel belge kimlikleri: yalnız bunlar sunucu verisinin üstünde korunur. */
async function pendingDocIds(u,type){const ops=await pending(u),ids=new Set(),col=registered.get(type)?.collection;for(const op of Array.isArray(ops)?ops:[])if(op?.id&&(op.dataType===type||(!op.dataType&&col&&op.collection===col)))ids.add(String(op.id));return ids}
async function pendingDataTypes(u){const ops=await pending(u),blocked=new Set();for(const op of Array.isArray(ops)?ops:[]){if(op?.dataType){blocked.add(op.dataType);continue}for(const[name,def]of registered)if(def.collection===op?.collection)blocked.add(name)}return blocked}
async function localHydrate(types){const u=uid();if(!u)return{};const names=types?.length?[...types]:ALL_SYNC_TYPES.slice(),started=revisionSnapshot(names),data=await hydrateLocal(u,names,{}),safe={};for(const name of names)if(dataRevision(name)===started[name]&&!deviceWriteActive(name)&&Object.prototype.hasOwnProperty.call(data,name))safe[name]=data[name];AppStore.hydrate(safe);return safe}
function remoteTimestamp(row){const v=row?.guncellenmeTarihi||row?.updatedAt||row?.updated_at||row?.createdAt||row?.created_at;if(v==null)return 0;if(typeof v==='number')return v;try{const d=v?.toDate?v.toDate():new Date(v);const n=d.getTime();return Number.isFinite(n)?n:0}catch(_){return 0}}
function timestampValue(v){if(v==null)return 0;if(typeof v==='number')return Number.isFinite(v)?v:0;try{const d=v?.toDate?v.toDate():new Date(v);const n=d.getTime();return Number.isFinite(n)?n:0}catch(_){return 0}}
const DELTA_EXCLUDED_TYPES=new Set(['odevTakip','notCizelgesi','bepDosyalari','tymmOlcekleri']);
async function collectionDeltaReady(u,type,rows){const k=`deltaReady:${type}`;if(DELTA_EXCLUDED_TYPES.has(type)){await meta(u,k,false);return false}let ready=await meta(u,k);if(ready===true)return true;if(!Array.isArray(rows))return false;ready=rows.every(row=>timestampValue(row?.guncellenmeTarihi)>0);await meta(u,k,ready);return ready}
async function deltaFetchCollection(def,u,last){let q=db.collection(def.collection);if(typeof def.query==='function')q=def.query(q)||q;if(!last)return null;try{if(typeof firebase!=='undefined'&&firebase.firestore?.Timestamp)q=q.where('guncellenmeTarihi','>',firebase.firestore.Timestamp.fromMillis(last-DELTA_SKEW_MS));else q=q.where('guncellenmeTarihi','>',new Date(last-DELTA_SKEW_MS));const snap=await q.get();return snap.docs.map(doc=>({id:doc.id,...doc.data()}))}catch(error){console.warn('[DeltaSync] fallback:',def.type,error?.message||error);return null}}
async function fetchCollection(def,{u,lastSync=0,forceFull=false}={}){const ready=await meta(u,`deltaReady:${def.type}`);const lastFull=Number(await meta(u,`lastFullSyncAt:${def.type}`)||0);const periodicFull=!lastFull||Date.now()-lastFull>=FULL_VERIFY_TTL;if(!forceFull&&!periodicFull&&lastSync&&ready===true){const delta=await deltaFetchCollection(def,u,lastSync);if(delta)return{rows:delta,delta:true}}let q=db.collection(def.collection);if(typeof def.query==='function')q=def.query(q)||q;const snap=await q.get();const rows=snap.docs.map(doc=>({id:doc.id,...doc.data()}));await collectionDeltaReady(u,def.type,rows);await meta(u,`lastFullSyncAt:${def.type}`,Date.now());return{rows,delta:false}}
async function fetchRemoteBatch(names,{u,lastByType={},forceFull=false}={}){const settled=await Promise.allSettled(names.map(async name=>{const def=registered.get(name);if(!def)return{name,rows:null,delta:false};const result=await fetchCollection(def,{u,lastSync:Number(lastByType[name]||0),forceFull});return{name,rows:result.rows,delta:result.delta}})),fetched={};for(const result of settled){if(result.status==='fulfilled'){const{name,rows,delta}=result.value;if(Array.isArray(rows))fetched[name]={rows,delta}}else{const message=String(result.reason?.message||result.reason||'Bilinmeyen senkronizasyon hatası');console.warn('[SyncEngine]',message);AppStore.set('ui.syncError',message)}}return fetched}
async function applyRemoteBatch(u,fetched,started,{source='pull'}={}){const blocked=await pendingDataTypes(u),data={},accepted=[];let skippedLocal=0;for(const[name,payload]of Object.entries(fetched||{})){const isDelta=!!payload?.delta;let rows=Array.isArray(payload)?payload:(payload?.rows||[]);if(isDelta){const localRows=deviceList(name);const map=new Map(localRows.map(r=>[String(r?.id||''),r]));for(const remote of rows)map.set(String(remote?.id||''),remote);const ts=await tombstones(u,name);rows=[...map.values()].filter(r=>!ts[String(r?.id||'')])}if(dataRevision(name)!==started[name]||deviceWriteActive(name)){skippedLocal++;continue}if(name!=='yemekMenuleri'&&blocked.has(name)){skippedLocal++;continue}if(name==='yemekMenuleri'){const localRows=deviceList(name);if(localRows.length){const keep=await pendingDocIds(u,name),localById=new Map(localRows.filter(x=>keep.has(String(x?.id||''))).map(x=>[String(x?.id||''),x]));rows=(Array.isArray(rows)?rows:[]).map(remote=>{const local=localById.get(String(remote?.id||''));if(!local)return remote;const mergedMenu={...(remote?.menu||{})};Object.entries(local?.menu||{}).forEach(([day,value])=>{const remoteDay=mergedMenu[day];const localItems=Array.isArray(value?.items)?value.items.map(v=>String(v??'').trim()).filter(Boolean):[];const localLegacy=[value?.corba,value?.ana,value?.yardimci,value?.tatli].map(v=>String(v??'').trim()).filter(Boolean);const remoteItems=Array.isArray(remoteDay?.items)?remoteDay.items.map(v=>String(v??'').trim()).filter(Boolean):[];const remoteLegacy=[remoteDay?.corba,remoteDay?.ana,remoteDay?.yardimci,remoteDay?.tatli].map(v=>String(v??'').trim()).filter(Boolean);if(localItems.length||localLegacy.length)mergedMenu[day]=value;else if(!remoteDay||(!remoteItems.length&&!remoteLegacy.length))mergedMenu[day]=value});return{...remote,menu:mergedMenu}});const remoteIds=new Set(rows.map(x=>String(x?.id||'')));localRows.forEach(local=>{const id=String(local?.id||'');if(keep.has(id)&&!remoteIds.has(id))rows.push(local)})}}data[name]=rows;accepted.push(name)}if(accepted.length){accepted.forEach(markDataRevision);await cacheMany(u,data,{markWrite:false});AppStore.setDataMany(data);try{window.dispatchEvent(new CustomEvent('koruk:sync-partial',{detail:{source,types:[...accepted]}}))}catch(_){}}return{updated:accepted.length,skippedLocal,accepted}}
async function cacheExists(u,type){return(await get(key(u,`cache:${type}`),'__ka_missing__'))!=='__ka_missing__'}
async function staleSyncNames(types){if(!syncReady()||!navigator.onLine)return[];const u=uid(),names=orderedSyncNames(types),now=Date.now(),stale=[];for(const type of names){if(!(await cacheExists(u,type))){stale.push(type);continue}const last=Number(await meta(u,`lastRemoteSyncAt:${type}`)||0);if(!last||now-last>=REMOTE_SYNC_TTL||await signalStale(u,type))stale.push(type)}return stale}
async function shouldRemoteSync(types,force=false){if(force)return syncReady()&&navigator.onLine;return(await staleSyncNames(types)).length>0}
async function markRemoteSync(u,names,revs={},applied=[]){const now=Date.now();for(const type of names)await meta(u,`lastRemoteSyncAt:${type}`,now);for(const type of applied)if(revs[type]!=null)await meta(u,`pulledRev:${type}`,revs[type]);AppStore.set('ui.lastSyncAt',now);AppStore.set('meta.lastRemoteSyncAt',now)}
function syncNames(types,options={}){return requestedSyncNames(types,options)}
async function pull(types,options={}){const force=options?.force===true;if(!syncReady()||!navigator.onLine)return{updated:0,skipped:true};const requested=requestedSyncNames(types,options),names=force?orderedSyncNames(requested):await staleSyncNames(requested);if(!names.length)return{updated:0,source:'local',skippedRemote:true};const started=options?.baseline||revisionSnapshot(names);syncing=true;AppStore.set('ui.syncing',true);let updated=0,skippedLocal=0,successful=[],appliedTypes=[];try{const u=uid(),lastByType={},revStart={};for(const type of names){lastByType[type]=Number(await meta(u,`lastRemoteSyncAt:${type}`)||0);revStart[type]=await meta(u,`heardRev:${type}`)}const forceFull=options?.full===true;for(let i=0;i<names.length;i+=REMOTE_BATCH_SIZE){const batch=names.slice(i,i+REMOTE_BATCH_SIZE),fetched=await fetchRemoteBatch(batch,{u,lastByType,forceFull}),applied=await applyRemoteBatch(u,fetched,started,{source:'pull'});updated+=applied.updated;skippedLocal+=applied.skippedLocal;appliedTypes.push(...(applied.accepted||[]));successful.push(...Object.keys(fetched));if(i+REMOTE_BATCH_SIZE<names.length)await new Promise(resolve=>setTimeout(resolve,0))}if(successful.length)await markRemoteSync(u,[...new Set(successful)],revStart,appliedTypes);return{updated,skippedLocal,source:'remote',types:names}}finally{syncing=false;AppStore.set('ui.syncing',false)}}
async function sync(types,options={}){if(syncPromise)return syncPromise;syncPromise=(async()=>{const names=syncNames(types,options),baseline=revisionSnapshot(names);await flushWrites();return pull(names,{...options,baseline})})().finally(()=>{syncPromise=null});return syncPromise}
function scheduleSync(ms=1200,options={}){clearTimeout(syncTimer);syncTimer=setTimeout(async()=>{try{if(await shouldRemoteSync(requestedSyncNames(undefined,options),options?.force===true))await sync(undefined,options)}catch(e){console.warn('[SyncSchedule]',e?.message||e)}},ms)}
/* ── DEĞİŞİM İŞARETİ: cihazlar arası anlık eşitleme ──
   Tek küçük belge (oy_senkron/degisim) dinlenir. Her yazma boşaltmasından sonra hangi tipin değiştiği (r: tip başına sayaç) ve hangi
   belgelerin silindiği (d: son 14 gün) bu belgeye işlenir. Dinleyen cihaz yalnız değişen ve kayıtlı tipleri çeker, silinenleri yerelden kaldırır.
   Bayatlık: tipin duyulan revizyonu (heardRev) çekilen revizyondan (pulledRev) farklıysa tip bayattır (staleSyncNames) — modüllerin kendi
   çekmeleri de buna uyar. Belge/kural yoksa (permission-denied) eski davranış (24 saatlik TTL) sorunsuz sürer. Eşitleme kararlarının tek sahibi bu dosyadır. */
const SIGNAL_COL='oy_senkron',SIGNAL_ID='degisim',SIGNAL_FULL='__tam__';
const SIGNAL_SEND_GAP_MS=2000,SIGNAL_PULL_DELAY_MS=1200,SIGNAL_MIN_PULL_GAP_MS=20000,SIGNAL_DEL_KEEP_MS=14*24*60*60*1000,SIGNAL_MAX_TRIES=3;
const signalTab=`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
let signalState='kapali',signalOff=null,signalUid='',signalLast=null,signalOut={r:{},d:{}},signalOutTimer=0,signalSending=false,signalPullTimer=0,signalPulling=false,signalDeferred=false,signalTries=0,signalDelChain=Promise.resolve(),signalHearChain=Promise.resolve(),signalWarned=false;
const signalPulledAt=new Map();
function signalSetState(state){signalState=state;try{AppStore.set('meta.syncSignal',state)}catch(_){}}
function signalTypeOf(op){
  if(op?.dataType)return op.dataType;
  for(const[name,def]of registered)if(def.collection===op?.collection)return name;
  const hit=Object.entries(window.COL||{}).find(([,col])=>col===op?.collection);
  return hit?hit[0]:'';
}
function signalMerge(a,b){
  const out={r:{...(a?.r||{}),...(b?.r||{})},d:{}};
  for(const src of [a?.d||{},b?.d||{}])for(const[type,ids]of Object.entries(src)){const to=out.d[type]||(out.d[type]={});for(const[id,at]of Object.entries(ids||{}))to[id]=Math.max(Number(to[id])||0,Number(at)||0)}
  return out;
}
const signalEmpty=o=>!Object.keys(o?.r||{}).length&&!Object.keys(o?.d||{}).length;
/* Yazıcı: başarılı her Firestore yazması giden kutuya not edilir; boşaltma bitince tek belgeyle gönderilir. */
function signalNote(op){
  const type=signalTypeOf(op);if(!type)return;
  signalOut.r[type]=1;
  if(op.kind==='delete-doc'&&op.id)(signalOut.d[type]||(signalOut.d[type]={}))[op.id]=Date.now();
  else if(op.kind==='delete-query')(signalOut.d[type]||(signalOut.d[type]={}))[SIGNAL_FULL]=Date.now();
}
function signalSchedule(ms=SIGNAL_SEND_GAP_MS){if(signalOutTimer||signalState==='reddedildi')return;signalOutTimer=setTimeout(signalSend,ms)}
function signalFlushed(){
  if(signalEmpty(signalOut)){signalApplyDeletes();return}
  const u=uid();if(u)meta(u,'signalOut',signalOut).catch(()=>{});
  signalSchedule();signalApplyDeletes();
}
async function signalSend(){
  signalOutTimer=0;
  const u=uid(),FV=window.firebase?.firestore?.FieldValue;
  if(signalSending||!u||!window.db||!FV||!navigator.onLine||signalState==='reddedildi'||signalEmpty(signalOut))return;
  const out=signalOut;signalSending=true;signalOut={r:{},d:{}};
  try{
    const payload={r:{},s:{},d:{}},now=Date.now();
    for(const type of Object.keys(out.r)){payload.r[type]=FV.increment(1);payload.s[type]=signalTab}
    for(const[type,ids]of Object.entries(out.d))payload.d[type]={...ids};
    for(const[type,ids]of Object.entries(signalLast?.d||{}))for(const[id,at]of Object.entries(ids||{}))if(now-Number(at)>SIGNAL_DEL_KEEP_MS)(payload.d[type]||(payload.d[type]={}))[id]=FV.delete();
    for(const k of ['r','s','d'])if(!Object.keys(payload[k]).length)delete payload[k];
    await db.collection(SIGNAL_COL).doc(SIGNAL_ID).set(payload,{merge:true});
    await meta(u,'signalOut',signalOut);
  }catch(e){
    signalOut=signalMerge(out,signalOut);
    const msg=String(e?.message||e);
    if(PERM_ERROR.test(msg)||e?.code==='permission-denied')signalDenied(msg);
    else{try{await meta(u,'signalOut',signalOut)}catch(_){}signalSchedule(15000)}
  }finally{signalSending=false}
  if(!signalEmpty(signalOut))signalSchedule();
}
function signalDenied(msg){
  signalSetState('reddedildi');signalStop();
  if(!signalWarned){signalWarned=true;console.warn('[SyncSignal] oy_senkron kuralı yayınlanmamış olabilir; anlık eşitleme kapalı, 24 saatlik eski eşitleme sürüyor:',msg)}
}
/* Okuyucu */
function signalStop(){
  if(signalOff){try{signalOff()}catch(_){}signalOff=null}
  clearTimeout(signalPullTimer);signalPullTimer=0;signalUid='';signalLast=null;
  if(signalState==='acik'||signalState==='baglaniyor')signalSetState('kapali');
}
function signalStart(){
  const u=uid();
  if(!u||!window.db||!navigator.onLine||signalState==='reddedildi')return false;
  if(signalOff&&signalUid===u)return true;
  signalStop();signalUid=u;signalSetState('baglaniyor');
  meta(u,'signalOut').then(saved=>{if(saved&&!signalEmpty(saved)){signalOut=signalMerge(saved,signalOut);signalSchedule()}}).catch(()=>{});
  try{
    signalOff=db.collection(SIGNAL_COL).doc(SIGNAL_ID).onSnapshot({includeMetadataChanges:true},snap=>{signalHear(u,snap).catch(e=>console.warn('[SyncSignal]',e?.message||e))},err=>{
      signalOff=null;const msg=String(err?.message||err);
      if(PERM_ERROR.test(msg)||err?.code==='permission-denied')signalDenied(msg);else signalSetState('kapali');
    });
  }catch(e){signalOff=null;signalSetState('kapali');console.warn('[SyncSignal]',e?.message||e);return false}
  return true;
}
/* Anlık görüntüler sırayla işlenir (meta okuma/yazmaları iç içe geçmesin). */
function signalHear(u,snap){signalHearChain=signalHearChain.then(()=>signalHearNow(u,snap)).catch(e=>console.warn('[SyncSignal]',e?.message||e));return signalHearChain}
async function signalHearNow(u,snap){
  if(snap.metadata?.fromCache||snap.metadata?.hasPendingWrites||uid()!==u||signalUid!==u)return;
  signalSetState('acik');
  const data=snap.exists?snap.data()||{}:{},r=data.r||{},s=data.s||{};
  signalLast={r,d:data.d||{}};
  const seen=await meta(u,'signalSeen')===true;   /* bu cihaz belgeyi daha önce gördüyse, belgede olmayan tip "hiç değişmemişti" demektir */
  let changed=false;
  for(const[type,raw]of Object.entries(r)){
    const next=Number(raw)||0,prevRaw=await meta(u,`heardRev:${type}`),prev=prevRaw==null?null:Number(prevRaw);
    if(prev===next)continue;
    await meta(u,`heardRev:${type}`,next);
    if(prev==null&&!seen){await meta(u,`pulledRev:${type}`,next);continue}   /* ilk duyuş: bu cihazın bilgisi taban kabul edilir; bayatlık o ana dek eski TTL kuralıyla sürer */
    const base=prev==null?0:prev,pulled=await meta(u,`pulledRev:${type}`);
    if(pulled==null)await meta(u,`pulledRev:${type}`,base);
    if(s[type]===signalTab&&next===base+1&&Number(pulled==null?base:pulled)===base){await meta(u,`pulledRev:${type}`,next);continue}   /* kendi yazımım: çekmeye gerek yok */
    changed=true;
  }
  if(!seen)await meta(u,'signalSeen',true);
  await signalApplyDeletes();
  let stale=changed;
  if(!stale)for(const type of registered.keys())if(await signalStale(u,type)){stale=true;break}   /* uygulama kapalıyken kaçırılanlar */
  if(stale)signalQueuePull();
}
async function signalStale(u,type){const heard=await meta(u,`heardRev:${type}`),pulled=await meta(u,`pulledRev:${type}`);return heard!=null&&pulled!=null&&Number(heard)!==Number(pulled)}
function signalCatchUp(type){
  if(signalState!=='acik')return;
  const u=uid();if(!u)return;
  signalStale(u,type).then(stale=>{if(stale)signalQueuePull()}).catch(()=>{});
}
function signalQueuePull(ms=SIGNAL_PULL_DELAY_MS){clearTimeout(signalPullTimer);signalPullTimer=setTimeout(signalPullNow,ms)}
/* Bayat ve kayıtlı tipler tek birleştirilmiş eşitlemeyle çekilir; tip başına en çok 20 sn'de bir, arka planda ertelenir. */
async function signalPullNow(){
  signalPullTimer=0;
  const u=uid();
  if(!u||signalPulling||!navigator.onLine||signalState!=='acik')return;
  if(document.hidden){signalDeferred=true;return}
  signalPulling=true;
  try{
    const now=Date.now(),due=[],full=new Set();let wait=0;
    for(const type of registered.keys()){
      if(!(await signalStale(u,type)))continue;
      const gap=SIGNAL_MIN_PULL_GAP_MS-(now-Number(signalPulledAt.get(type)||0));
      if(gap>0){wait=wait?Math.min(wait,gap):gap;continue}
      due.push(type);
      const at=signalLast?.d?.[type]?.[SIGNAL_FULL];
      if(at&&Number(at)!==Number(await meta(u,`fullSeen:${type}`)))full.add(type);
    }
    if(due.length){
      due.forEach(type=>signalPulledAt.set(type,now));
      const delta=due.filter(type=>!full.has(type));
      if(delta.length)await sync(delta,{force:true});
      if(full.size){await sync([...full],{force:true,full:true});for(const type of full)await meta(u,`fullSeen:${type}`,signalLast?.d?.[type]?.[SIGNAL_FULL]||0)}
      let still=false;for(const type of due)if(await signalStale(u,type)){still=true;break}
      signalTries=still?signalTries+1:0;
      if(still&&signalTries<SIGNAL_MAX_TRIES)wait=wait||SIGNAL_PULL_DELAY_MS*2;
    }
    if(wait)signalQueuePull(wait);
  }catch(e){console.warn('[SyncSignal]',e?.message||e)}
  finally{signalPulling=false}
}
/* Silmeler: delta çekme silineni göremez; sinyaldeki silme kaydı yerel önbellekten kaldırılır (satır silmeden sonra yenilenmediyse). */
function signalApplyDeletes(){signalDelChain=signalDelChain.then(signalApplyDeletesNow).catch(e=>console.warn('[SyncSignal]',e?.message||e));return signalDelChain}
async function signalApplyDeletesNow(){
  const u=uid(),del=signalLast?.d;if(!u||!del)return;
  const blocked=await pendingDataTypes(u);
  for(const[type,ids]of Object.entries(del)){
    if(!registered.has(type)||blocked.has(type)||deviceWriteActive(type))continue;
    const rows=await cached(u,type,[]);if(!Array.isArray(rows)||!rows.length)continue;
    const next=rows.filter(row=>{const at=Number(ids?.[String(row?.id||'')]);return!(at&&!(timestampValue(row?.guncellenmeTarihi)>at))});
    if(next.length===rows.length)continue;
    markDataRevision(type);await cacheMany(u,{[type]:next},{markWrite:false});AppStore.setDataMany({[type]:next});
    try{window.dispatchEvent(new CustomEvent('koruk:sync-partial',{detail:{source:'signal-delete',types:[type]}}))}catch(_){}
  }
}
window.addEventListener('koruk:app-ready',()=>{signalStart()});
window.addEventListener('online',()=>{signalStart();signalSchedule(500)},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)return;signalStart();if(signalDeferred){signalDeferred=false;signalQueuePull(300)}});
AppStore.subscribe('session.user',()=>{signalStart()});
window.SyncEngine={register,unregister:t=>registered.delete(t),localHydrate,pull,flush:flushWrites,sync,schedule:scheduleSync,startSignal:signalStart,stopSignal:signalStop,signalState:()=>signalState,definitions:()=>Array.from(registered.values()).map(x=>({...x})),shouldRemoteSync,get syncing(){return syncing},remoteTTL:REMOTE_SYNC_TTL};
let bootPromise=null,booted=false;
function waitFor(test,timeout=12000,step=50){return new Promise((resolve,reject)=>{const start=Date.now(),tick=()=>{let ok=false;try{ok=!!test()}catch(_){}if(ok)return resolve(true);if(Date.now()-start>=timeout)return reject(new Error('bootstrap-timeout'));setTimeout(tick,step)};tick()})}
function registerCore(){if(!window.COL)return;const pairs={kurulKomisyonlar:COL.kurulKomisyonlar,ogretmenler:COL.ogretmenler,dersProgrami:COL.dersProgrami,dersSaatleri:COL.dersSaatleri,siniflar:COL.siniflar,veliler:COL.veliler,servisler:COL.servisler,nobetAtamalari:COL.nobetAtamalari,nobetYerleri:COL.nobetYerleri,sinavlar:COL.sinavlar,denemeSinavlari:COL.denemeSinavlari,duyurular:COL.duyurular,haberler:COL.haberler,gorevler:COL.gorevler,hatirlaticilar:COL.hatirlaticilar,ogretmenIzinleri:COL.ogretmenIzinleri,notlar:COL.notlar,yemekMenuleri:COL.yemekMenuleri,odevTakip:COL.odevTakip,notCizelgesi:COL.notCizelgesi};Object.entries(pairs).forEach(([type,col])=>{if(!col)return;if(type==='odevTakip'||type==='notCizelgesi'){const u=window.AKTIF_KULLANICI||AppStore.get('session.user')||{};register(type,col,{query:q=>u.admin===true||!u.uid?q:q.where('sahipUid','==',u.uid)});return}register(type,col)})}
async function start(){if(bootPromise)return bootPromise;bootPromise=(async()=>{await waitFor(()=>window.COL&&window.AppStore&&window.KorukLocalFirst&&window.DeviceData);await waitFor(()=>window.AKTIF_KULLANICI?.uid).catch(()=>false);if(!window.AKTIF_KULLANICI?.uid){bootPromise=null;return false};AppStore.set('session.user',AKTIF_KULLANICI);AppStore.set('session.role',window.AKTIF_ROL||null);registerCore();await localHydrate(ALL_SYNC_TYPES);AppStore.set('session.ready',true);AppStore.set('meta.hydrated',true);window.dispatchEvent(new CustomEvent('koruk:app-ready',{detail:{source:'device'}}));scheduleSync(250,{bootstrap:true});AppStore.set('meta.booted',true);booted=true;return true})().catch(e=>{console.warn('[AppBootstrap]',e?.message||e);bootPromise=null;return false});return bootPromise}
window.AppBootstrap={start,CORE_TYPES:ALL_SYNC_TYPES.slice(),get started(){return booted}};
window.addEventListener('online',()=>{scheduleFlush();scheduleSync(500)},{passive:true});window.addEventListener('offline',()=>{}, {passive:true});window.addEventListener('koruk:auth-session-ready',()=>{if(!booted)start().catch(e=>console.warn('[AppBootstrap retry]',e?.message||e))});document.addEventListener('visibilitychange',()=>{if(!document.hidden){scheduleFlush();scheduleSync(800)}});setInterval(flushWrites,12000);
window.KorukCore={version:1,start};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
