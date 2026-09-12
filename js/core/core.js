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
function dataVisibility(type,value){
  if(type!=='sinavlar'||!Array.isArray(value))return value;
  const u=state.session.user||window.AKTIF_KULLANICI||{};
  if(u.admin===true)return value;
  const teacherId=String(u.bagliOgretmenId||u.ogretmenId||'');
  if(!teacherId)return value;
  return value.filter(row=>String(row?.ogretmenId||'')===teacherId||(!row?.ogretmenId&&!!u.uid&&row?.sahipUid===u.uid));
}
function pathGet(path){const parts=String(path||'').split('.').filter(Boolean),value=parts.reduce((o,k)=>o==null?undefined:o[k],state);return parts[0]==='data'&&parts.length===2?dataVisibility(parts[1],value):value}
function emit(path,value){
  const parts=String(path||'').split('.').filter(Boolean),exposed=parts[0]==='data'&&parts.length===2?dataVisibility(parts[1],value):value;
  listeners.get(path)?.forEach(fn=>{try{fn(exposed,path,state)}catch(e){console.error('[AppStore]',e)}});
  anyListeners.forEach(fn=>{try{fn(path,exposed,state)}catch(e){console.error('[AppStore:any]',e)}});
  try{window.dispatchEvent(new CustomEvent('koruk:store-change',{detail:{path,value:exposed}}))}catch(_){}
}
function pathSet(path,value){
  const parts=String(path||'').split('.').filter(Boolean);if(!parts.length)return;
  let node=state;for(let i=0;i<parts.length-1;i++){const k=parts[i];if(!node[k]||typeof node[k]!=='object')node[k]={};node=node[k]}
  node[parts.at(-1)]=value;emit(path,value);return value
}
function setData(type,value){state.data[type]=value;emit('data.'+type,value);return value}
function setDataMany(data){if(!data||typeof data!=='object')return state.data;const changes=Object.entries(data);for(const [type,value] of changes)state.data[type]=value;for(const [type,value] of changes)emit('data.'+type,value);return data}
function hydrateStore(data){if(data&&typeof data==='object')Object.entries(data).forEach(([k,v])=>state.data[k]=v);state.meta.hydrated=true;emit('meta.hydrated',true);return state.data}
function subscribe(path,fn,{immediate=false}={}){if(!listeners.has(path))listeners.set(path,new Set());listeners.get(path).add(fn);if(immediate)try{fn(pathGet(path),path,state)}catch(e){console.error('[AppStore]',e)}return()=>listeners.get(path)?.delete(fn)}
window.AppStore={__v2:true,get:pathGet,set:pathSet,data:t=>dataVisibility(t,state.data[t]),setData,setDataMany,hydrate:hydrateStore,subscribe,subscribeAll:fn=>(anyListeners.add(fn),()=>anyListeners.delete(fn)),snapshot:()=>{try{return structuredClone(state)}catch(_){return JSON.parse(JSON.stringify(state))}},get state(){return state},getir:pathGet,ayarla:pathSet,abone:(p,f)=>subscribe(p,f)};
window.addEventListener('online',()=>AppStore.set('ui.online',true),{passive:true});
window.addEventListener('offline',()=>AppStore.set('ui.online',false),{passive:true});


/* APK / PWA / mobil web için TEK pull-to-refresh davranışı.
   Browser/native varsayılan yenilemeleri CSS ile bastırılır; yalnız gerçek belge
   tepesinde, iç kaydırma alanı dışında ve bilinçli aşağı çekme eşiğinde yenilenir. */
(function installUnifiedPullToRefresh(){
  if(window.__kaUnifiedPullRefresh)return;window.__kaUnifiedPullRefresh=true;
  const BLOCK_SELECTOR='.ka-app-nav.ka-bottom-nav,.ka-menu-layer,.ka-modal-backdrop,.dv3,[role="dialog"],[data-ka-no-pull-refresh]';
  const ARM_DISTANCE=96,MAX_VISUAL=78,DEAD_ZONE=8;
  let tracking=false,armed=false,startX=0,startY=0,indicator=null,reloading=false;
  const docTop=()=>Math.max(0,Number(window.scrollY||document.scrollingElement?.scrollTop||0));
  function scrollableAncestor(target){
    for(let el=target instanceof Element?target:null;el&&el!==document.body&&el!==document.documentElement;el=el.parentElement){
      const style=getComputedStyle(el),oy=style.overflowY;
      if((oy==='auto'||oy==='scroll'||oy==='overlay')&&el.scrollHeight>el.clientHeight+2)return el;
    }
    return null;
  }
  function blocked(target){return !!(document.body.classList.contains('ka-layer-open')||target?.closest?.(BLOCK_SELECTOR)||scrollableAncestor(target))}
  function ensureIndicator(){
    if(indicator?.isConnected)return indicator;
    indicator=document.createElement('div');indicator.id='kaPullRefreshIndicator';indicator.hidden=true;indicator.setAttribute('aria-hidden','true');indicator.innerHTML='<img src="assets/icon-192.png" alt=""><span>Yenilemek için çek</span>';document.body.appendChild(indicator);return indicator;
  }
  function draw(raw){
    const el=ensureIndicator(),visual=Math.min(MAX_VISUAL,Math.max(0,raw)*.48);armed=raw>=ARM_DISTANCE;el.hidden=visual<2;el.classList.toggle('is-armed',armed);el.classList.remove('is-refreshing');el.style.setProperty('--ka-pull-y',`${Math.round(visual)}px`);const label=el.querySelector('span');if(label)label.textContent=armed?'Bırakınca yenile':'Yenilemek için çek';
  }
  function reset(){tracking=false;armed=false;const el=indicator;if(el&&!reloading){el.classList.remove('is-armed','is-refreshing');el.style.setProperty('--ka-pull-y','0px');el.hidden=true}}
  function begin(e){
    if(reloading||e.touches?.length!==1)return;const target=e.target instanceof Element?e.target:null;if(docTop()>1||blocked(target)){tracking=false;return}tracking=true;armed=false;startX=e.touches[0].clientX;startY=e.touches[0].clientY;
  }
  function move(e){
    if(!tracking||reloading||e.touches?.length!==1)return;const touch=e.touches[0],dx=touch.clientX-startX,dy=touch.clientY-startY;if(Math.abs(dx)>Math.abs(dy)+8){reset();return}if(dy<0||docTop()>1){reset();return}if(dy<=DEAD_ZONE)return;e.preventDefault();draw(dy);
  }
  function finish(){
    if(!tracking||reloading){if(!reloading)reset();return}const refresh=armed;tracking=false;armed=false;if(!refresh){reset();return}reloading=true;const el=ensureIndicator();el.hidden=false;el.classList.remove('is-armed');el.classList.add('is-refreshing');el.style.setProperty('--ka-pull-y','74px');const label=el.querySelector('span');if(label)label.textContent='Yenileniyor…';setTimeout(()=>window.location.reload(),120);
  }
  document.addEventListener('touchstart',begin,{capture:true,passive:true});
  document.addEventListener('touchmove',move,{capture:true,passive:false});
  document.addEventListener('touchend',finish,{capture:true,passive:true});
  document.addEventListener('touchcancel',reset,{capture:true,passive:true});
})();

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
let dbp=null,flushing=false,flushTimer=null,flushPromise=null,queueMutationChain=Promise.resolve();
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
async function getMany(keys,defaults={}){const list=[...new Set(keys||[])];if(!list.length)return{};try{const d=await open();return await new Promise((res,rej)=>{const out={},t=d.transaction(STORE,'readonly'),store=t.objectStore(STORE);for(const k of list){const r=store.get(k);r.onsuccess=()=>{out[k]=r.result===undefined?defaults[k]:r.result}}t.oncomplete=()=>{for(const k of list)if(!Object.prototype.hasOwnProperty.call(out,k))out[k]=defaults[k];res(out)};t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error||new Error('indexeddb-abort'))})}catch(_){return Object.fromEntries(list.map(k=>[k,defaults[k]]))}}
async function set(k,v){const d=await open();return new Promise((res,rej)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).put(v,k);t.oncomplete=()=>res(v);t.onerror=()=>rej(t.error)})}
async function setMany(entries){if(!entries?.length)return;const d=await open();return new Promise((res,rej)=>{const t=d.transaction(STORE,'readwrite'),s=t.objectStore(STORE);entries.forEach(([k,v])=>s.put(v,k));t.oncomplete=res;t.onerror=()=>rej(t.error)})}
async function del(k){const d=await open();return new Promise((res,rej)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).delete(k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}
async function entriesByPrefix(prefix){const d=await open();return new Promise((res,rej)=>{const out=[],r=d.transaction(STORE,'readonly').objectStore(STORE).openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return res(out);if(String(c.key).startsWith(prefix))out.push([String(c.key),c.value]);c.continue()};r.onerror=()=>rej(r.error)})}
const key=(u,s)=>`u:${u||'anon'}:${s}`;
function uid(){try{return window.AKTIF_KULLANICI?.uid||AppStore.get('session.user')?.uid||''}catch(_){return''}}
function mutateQueue(u,mutator){const k=key(u,'queue'),run=queueMutationChain.then(async()=>{const current=await get(k,[]),working=Array.isArray(current)?current.slice():[],changed=await mutator(working),next=Array.isArray(changed)?changed:working;await set(k,next);return next});queueMutationChain=run.catch(()=>{});return run}
async function queue(u,op){const qid=op.qid||`${Date.now()}-${Math.random().toString(36).slice(2)}`,next={...op,qid,createdAt:op.createdAt||Date.now(),tries:op.tries||0};await mutateQueue(u,q=>{const i=q.findIndex(x=>x.qid===qid);if(i>=0)q[i]=next;else q.push(next);return q});scheduleFlush();return next}
async function pending(u=uid()){return u?get(key(u,'queue'),[]):[]}
async function tombstone(u,type,id,on=true){const k=key(u,`tomb:${type}`),x=await get(k,{});if(on)x[id]=Date.now();else delete x[id];await set(k,x);return x}
const tombstones=(u,type)=>get(key(u,`tomb:${type}`),{});
const cache=(u,type,data)=>set(key(u,`cache:${type}`),data);
const cached=(u,type,def=[])=>get(key(u,`cache:${type}`),def);
async function cacheMany(u,data,{markWrite=true}={}){if(!u||!data||typeof data!=='object')return;const rows=Object.entries(data).map(([type,val])=>[key(u,`cache:${type}`),val]);if(markWrite)rows.push([key(u,'meta:lastLocalWriteAt'),Date.now()]);await setMany(rows);return data}
async function hydrateLocal(u,types,defaults={}){const names=[...(types||[])],keys=names.map(type=>key(u,`cache:${type}`)),defs={};names.forEach((type,i)=>{defs[keys[i]]=Object.prototype.hasOwnProperty.call(defaults,type)?defaults[type]:[]});const values=await getMany(keys,defs),out={};names.forEach((type,i)=>{out[type]=values[keys[i]]});return out}
async function meta(u,name,value){const k=key(u,`meta:${name}`);if(arguments.length>=3){await set(k,value);return value}return get(k,null)}
async function userSnapshot(u=uid()){
  if(!u)return{caches:{},tombstones:{},meta:{},queue:[]};
  const prefix=`u:${u}:`,entries=await entriesByPrefix(prefix),out={caches:{},tombstones:{},meta:{},queue:[]};
  for(const[k,v]of entries){const scope=k.slice(prefix.length);if(scope==='queue'){out.queue=Array.isArray(v)?v:[];continue}if(scope.startsWith('cache:')){out.caches[scope.slice(6)]=v;continue}if(scope.startsWith('tomb:')){out.tombstones[scope.slice(5)]=v&&typeof v==='object'?v:{};continue}if(scope.startsWith('meta:'))out.meta[scope.slice(5)]=v;}
  return out;
}
async function runWrite(op){if(!window.db)throw new Error('db-yok');const ref=op.id?db.collection(op.collection).doc(op.id):null;if(op.kind==='delete-doc')return ref.delete();if(op.kind==='set-doc')return ref.set(op.data,{merge:!!op.merge});if(op.kind==='update-doc')return ref.set(op.data,{merge:true});if(op.kind==='delete-query'){const s=await db.collection(op.collection).where(op.field,'==',op.value).get();if(s.empty)return;const b=db.batch();s.docs.forEach(d=>b.delete(d.ref));return b.commit()}throw new Error('op-bilinmiyor')}
function flushWrites(){if(!navigator.onLine)return Promise.resolve();if(flushPromise)return flushPromise;const u=uid();if(!u)return Promise.resolve();flushing=true;flushPromise=(async()=>{const q=await get(key(u,'queue'),[]),failed=new Map(),snapshotIds=new Set((Array.isArray(q)?q:[]).map(op=>op.qid));for(const original of Array.isArray(q)?q:[]){const op={...original};try{await runWrite(op);if(op.tombType&&op.tombId)await tombstone(u,op.tombType,op.tombId,false)}catch(e){op.tries=(op.tries||0)+1;op.lastError=String(e?.message||e);op.lastTryAt=Date.now();failed.set(op.qid,op)}}const finalQueue=await mutateQueue(u,current=>{const next=[];for(const op of current){if(!snapshotIds.has(op.qid)){next.push(op);continue}const retry=failed.get(op.qid);if(retry)next.push(retry)}return next});AppStore.set('ui.pendingWrites',finalQueue.length);window.dispatchEvent(new CustomEvent('koruk:sync-state',{detail:{pending:finalQueue.length}}));if(snapshotIds.size&&finalQueue.length===0&&navigator.onLine)setTimeout(()=>{try{scheduleSync(80)}catch(_){}},0);return finalQueue.length})().finally(()=>{flushing=false;flushPromise=null});return flushPromise}
function scheduleFlush(){clearTimeout(flushTimer);flushTimer=setTimeout(flushWrites,350)}
window.KorukLocalFirst={open,get,getMany,set,setMany,del,queue,pending,tombstone,tombstones,cache,cached,cacheMany,hydrate:hydrateLocal,meta,userSnapshot,markBootstrap:(u,d={})=>meta(u,'bootstrap',{ready:true,completedAt:Date.now(),...d}),bootstrapState:u=>meta(u,'bootstrap'),isBootstrapReady:async u=>!!(await meta(u,'bootstrap'))?.ready,flush:flushWrites,schedule:scheduleFlush,uid};

/* ========================= DEVICE DATA =========================
   Tüm modül repository'lerinin ortak local-first yazma/okuma kapısıdır.
   Önce AppStore + IndexedDB güncellenir; Firestore işlemi yalnız queue'ya eklenir.
   Yerel değişiklik revizyonları, aynı anda çalışan uzak okumanın yeni kaydı eski
   Firestore görüntüsüyle ezmesini engeller. */
const dataRevisions=new Map(),activeDeviceWrites=new Map();
function dataRevision(type){return Number(dataRevisions.get(type)||0)}
function markDataRevision(type){const next=dataRevision(type)+1;dataRevisions.set(type,next);return next}
function revisionSnapshot(types){return Object.fromEntries((types||[]).map(type=>[type,dataRevision(type)]))}
function beginDeviceWrite(type){activeDeviceWrites.set(type,Number(activeDeviceWrites.get(type)||0)+1)}
function endDeviceWrite(type){const next=Math.max(0,Number(activeDeviceWrites.get(type)||0)-1);if(next)activeDeviceWrites.set(type,next);else activeDeviceWrites.delete(type)}
function deviceWriteActive(type){return Number(activeDeviceWrites.get(type)||0)>0}
function deviceList(type){const v=AppStore.data(type);return Array.isArray(v)?v:[]}
function deviceId(){try{return crypto.randomUUID()}catch(_){return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`}}
async function devicePersist(type,rows){const next=Array.isArray(rows)?rows:[];markDataRevision(type);AppStore.setData(type,next);const u=uid();if(u)await cache(u,type,next);return next}
function deviceListen(type,callback){const run=v=>{try{callback(Array.isArray(v)?v:[],{source:'device'})}catch(e){console.error('[DeviceData]',type,e)}};run(deviceList(type));return AppStore.subscribe('data.'+type,run)}
async function deviceAdd(type,collection,data,{id=null}={}){beginDeviceWrite(type);try{const docId=id||deviceId(),row={id:docId,...data};await devicePersist(type,[...deviceList(type).filter(x=>x?.id!==docId),row]);await queue(uid(),{kind:'set-doc',collection,id:docId,data,dataType:type});AppStore.set('ui.pendingWrites',(await pending()).length);return{id:docId,...row}}finally{endDeviceWrite(type)}}
async function deviceUpdate(type,collection,id,data){if(!id)throw new Error('id-gerekli');beginDeviceWrite(type);try{const rows=deviceList(type),i=rows.findIndex(x=>x?.id===id),row=i>=0?{...rows[i],...data}:{id,...data},next=i>=0?rows.map((x,n)=>n===i?row:x):[...rows,row];await devicePersist(type,next);await queue(uid(),{kind:'update-doc',collection,id,data,dataType:type});AppStore.set('ui.pendingWrites',(await pending()).length);return row}finally{endDeviceWrite(type)}}
async function deviceSet(type,collection,id,data,{merge=false}={}){if(!id)throw new Error('id-gerekli');beginDeviceWrite(type);try{const rows=deviceList(type),i=rows.findIndex(x=>x?.id===id),row=merge&&i>=0?{...rows[i],...data}:{id,...data},next=i>=0?rows.map((x,n)=>n===i?row:x):[...rows,row];await devicePersist(type,next);await queue(uid(),{kind:'set-doc',collection,id,data,merge,dataType:type});AppStore.set('ui.pendingWrites',(await pending()).length);return row}finally{endDeviceWrite(type)}}
async function deviceRemove(type,collection,id){if(!id)throw new Error('id-gerekli');beginDeviceWrite(type);try{await devicePersist(type,deviceList(type).filter(x=>x?.id!==id));const u=uid();if(u)await tombstone(u,type,id,true);await queue(u,{kind:'delete-doc',collection,id,tombType:type,tombId:id,dataType:type});AppStore.set('ui.pendingWrites',(await pending()).length);return true}finally{endDeviceWrite(type)}}
function deviceGet(type,id){return deviceList(type).find(x=>x?.id===id)||null}
window.DeviceData={list:deviceList,get:deviceGet,listen:deviceListen,persist:devicePersist,add:deviceAdd,update:deviceUpdate,set:deviceSet,remove:deviceRemove,newId:deviceId};

/* Nöbet defteri işaretleme davranışı Dashboard ve Management için tek merkezde tutulur. */
function dutyBookTeacherId(){const u=window.AKTIF_KULLANICI||AppStore.get('session.user')||{};return u.bagliOgretmenId||u.ogretmenId||''}
function dutyBookCanToggle(atama){const u=window.AKTIF_KULLANICI||AppStore.get('session.user')||{},tid=dutyBookTeacherId();return !!(u.admin===true||(tid&&atama?.ogretmenId===tid))}
async function dutyBookToggle(atama,deger){if(!atama?.id)throw new Error('atama-yok');if(!dutyBookCanToggle(atama))throw new Error('sahip-degil');if(!window.COL?.nobetAtamalari)throw new Error('nobet-koleksiyonu-yok');return deviceUpdate('nobetAtamalari',COL.nobetAtamalari,atama.id,{defterDolduruldu:!!deger})}
window.DutyBookService={teacherId:dutyBookTeacherId,canToggle:dutyBookCanToggle,toggle:dutyBookToggle};

/* ========================= SYNC ENGINE ========================= */
let syncing=false,syncTimer=null;const registered=new Map(),realtimeUnsubs=new Map();
const REMOTE_BATCH_SIZE=4;
const SYNC_PRIORITY=['ogretmenler','dersProgrami','siniflar','nobetAtamalari','nobetYerleri','hatirlaticilar','gorevler','duyurular','servisler','veliler','sinavlar','denemeSinavlari','ogretmenIzinleri','notlar','haberler'];
const CORE_REALTIME_TYPES=['dersProgrami','nobetAtamalari','nobetYerleri','hatirlaticilar','gorevler','duyurular'];
function syncReady(){return !!(window.db&&uid())}
function register(type,collection,opts={}){if(type&&collection)registered.set(type,{type,collection,...opts})}
function syncNames(types){return types?.length?[...types]:Array.from(registered.keys())}
function orderedSyncNames(types){const rank=new Map(SYNC_PRIORITY.map((name,index)=>[name,index]));return[...new Set(syncNames(types))].sort((a,b)=>(rank.get(a)??999)-(rank.get(b)??999))}
async function pendingDataTypes(u){const ops=await pending(u),blocked=new Set();for(const op of Array.isArray(ops)?ops:[]){if(op?.dataType){blocked.add(op.dataType);continue}for(const[name,def]of registered)if(def.collection===op?.collection)blocked.add(name)}return blocked}
async function localHydrate(types){const u=uid();if(!u)return{};const names=syncNames(types),started=revisionSnapshot(names),data=await hydrateLocal(u,names,{}),safe={};for(const name of names)if(dataRevision(name)===started[name]&&!deviceWriteActive(name)&&Object.prototype.hasOwnProperty.call(data,name))safe[name]=data[name];AppStore.hydrate(safe);return safe}
async function fetchCollection(def){let q=db.collection(def.collection);if(typeof def.query==='function')q=def.query(q)||q;const snap=await q.get();return snap.docs.map(doc=>({id:doc.id,...doc.data()}))}
async function fetchRemoteBatch(names){const settled=await Promise.allSettled(names.map(async name=>{const def=registered.get(name);if(!def)return{name,rows:null};return{name,rows:await fetchCollection(def)}})),fetched={};for(const result of settled){if(result.status==='fulfilled'){const{name,rows}=result.value;if(Array.isArray(rows))fetched[name]=rows}else console.warn('[SyncEngine]',result.reason?.message||result.reason)}return fetched}
async function applyRemoteBatch(u,fetched,started,{source='pull'}={}){const blocked=await pendingDataTypes(u),data={},accepted=[];let skippedLocal=0;for(const[name,rows]of Object.entries(fetched||{})){if(dataRevision(name)!==started[name]||deviceWriteActive(name)||blocked.has(name)){skippedLocal++;continue}data[name]=rows;accepted.push(name)}if(accepted.length){accepted.forEach(markDataRevision);await cacheMany(u,data,{markWrite:false});AppStore.setDataMany(data);try{window.dispatchEvent(new CustomEvent('koruk:sync-partial',{detail:{source,types:[...accepted]}}))}catch(_){}}return{updated:accepted.length,skippedLocal}}
async function pull(types,baseline=null){if(!syncReady()||!navigator.onLine)return{updated:0,skipped:true};const names=orderedSyncNames(types);if(!names.length)return{updated:0};const started=baseline||revisionSnapshot(names);syncing=true;AppStore.set('ui.syncing',true);let updated=0,skippedLocal=0;try{const u=uid();for(let i=0;i<names.length;i+=REMOTE_BATCH_SIZE){const batch=names.slice(i,i+REMOTE_BATCH_SIZE),fetched=await fetchRemoteBatch(batch),applied=await applyRemoteBatch(u,fetched,started,{source:'pull'});updated+=applied.updated;skippedLocal+=applied.skippedLocal;if(i+REMOTE_BATCH_SIZE<names.length)await new Promise(resolve=>setTimeout(resolve,0))}const now=Date.now();await meta(u,'lastSyncAt',now);AppStore.set('ui.lastSyncAt',now);return{updated,skippedLocal}}finally{syncing=false;AppStore.set('ui.syncing',false)}}
async function sync(types){if(syncing)return;const names=syncNames(types),baseline=revisionSnapshot(names);await flushWrites();return pull(names,baseline)}
function scheduleSync(ms=1200){clearTimeout(syncTimer);syncTimer=setTimeout(()=>sync(),ms)}
function stopRealtime(type){const off=realtimeUnsubs.get(type);if(off){try{off()}catch(_){}realtimeUnsubs.delete(type)}}
function stopAllRealtime(){for(const type of [...realtimeUnsubs.keys()])stopRealtime(type)}
function startRealtime(types=CORE_REALTIME_TYPES){if(!syncReady()||!navigator.onLine)return false;for(const name of types){if(realtimeUnsubs.has(name))continue;const def=registered.get(name);if(!def)continue;try{let q=db.collection(def.collection);if(typeof def.query==='function')q=def.query(q)||q;const off=q.onSnapshot({includeMetadataChanges:true},snap=>{if(snap.metadata?.fromCache)return;const u=uid();if(!u)return;const started={[name]:dataRevision(name)},rows=snap.docs.map(doc=>({id:doc.id,...doc.data()}));applyRemoteBatch(u,{[name]:rows},started,{source:'realtime'}).catch(e=>console.warn('[SyncRealtime]',name,e?.message||e))},e=>console.warn('[SyncRealtime]',name,e?.message||e));realtimeUnsubs.set(name,off)}catch(e){console.warn('[SyncRealtime]',name,e?.message||e)}}return true}
window.SyncEngine={register,unregister:t=>{stopRealtime(t);return registered.delete(t)},localHydrate,pull,flush:flushWrites,sync,schedule:scheduleSync,startRealtime,stopRealtime:stopAllRealtime,definitions:()=>Array.from(registered.values()).map(x=>({...x})),get syncing(){return syncing}};

/* ========================= BOOTSTRAP ========================= */
const CORE_TYPES=['ogretmenler','dersProgrami','siniflar','veliler','servisler','nobetAtamalari','nobetYerleri','sinavlar','denemeSinavlari','duyurular','haberler','gorevler','hatirlaticilar','ogretmenIzinleri','notlar'];
let bootPromise=null,booted=false;
function waitFor(test,timeout=12000,step=50){return new Promise((resolve,reject)=>{const start=Date.now(),tick=()=>{let ok=false;try{ok=!!test()}catch(_){}if(ok)return resolve(true);if(Date.now()-start>=timeout)return reject(new Error('bootstrap-timeout'));setTimeout(tick,step)};tick()})}
function registerCore(){if(!window.COL)return;const pairs={ogretmenler:COL.ogretmenler,dersProgrami:COL.dersProgrami,siniflar:COL.siniflar,veliler:COL.veliler,servisler:COL.servisler,nobetAtamalari:COL.nobetAtamalari,nobetYerleri:COL.nobetYerleri,sinavlar:COL.sinavlar,denemeSinavlari:COL.denemeSinavlari,duyurular:COL.duyurular,haberler:COL.haberler,gorevler:COL.gorevler,hatirlaticilar:COL.hatirlaticilar,ogretmenIzinleri:COL.ogretmenIzinleri,notlar:COL.notlar};Object.entries(pairs).forEach(([type,col])=>col&&register(type,col))}
async function start(){if(bootPromise)return bootPromise;bootPromise=(async()=>{await waitFor(()=>window.COL&&window.AppStore&&window.KorukLocalFirst&&window.DeviceData);await waitFor(()=>window.AKTIF_KULLANICI?.uid).catch(()=>false);if(!window.AKTIF_KULLANICI?.uid)return false;AppStore.set('session.user',AKTIF_KULLANICI);AppStore.set('session.role',window.AKTIF_ROL||null);registerCore();const localPromise=localHydrate(CORE_TYPES),remotePromise=navigator.onLine?Promise.resolve().then(()=>pull(CORE_TYPES)).catch(e=>{console.warn('[AppBootstrap remote]',e?.message||e);return null}):Promise.resolve(null);await localPromise;AppStore.set('session.ready',true);AppStore.set('meta.hydrated',true);window.dispatchEvent(new CustomEvent('koruk:app-ready',{detail:{source:'device'}}));startRealtime(CORE_REALTIME_TYPES);void remotePromise;AppStore.set('meta.booted',true);booted=true;return true})().catch(e=>{console.warn('[AppBootstrap]',e?.message||e);return false});return bootPromise}
window.AppBootstrap={start,CORE_TYPES,get started(){return booted}};

window.addEventListener('online',()=>{scheduleFlush();startRealtime(CORE_REALTIME_TYPES);scheduleSync(120)},{passive:true});
window.addEventListener('offline',()=>{}, {passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){scheduleFlush();startRealtime(CORE_REALTIME_TYPES);scheduleSync(180)}});
setInterval(flushWrites,12000);
window.KorukCore={version:1,start};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();