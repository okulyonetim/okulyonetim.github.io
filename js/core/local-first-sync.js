/* Koruk Asistan - Local First Sync v3
   Cihaz (IndexedDB) ana veri kaynagidir. Firestore yalnizca arka plan senkronizasyonudur.
   NOT: Mevcut DB/store/anahtar yapisi korunur; eski yerel veriler silinmez. */
(function(){
'use strict';
if(window.KorukLocalFirst) return;

const DB='koruk-local-first-v1';
const VER=1;
const STORE='kv';
let dbp=null;
let flushing=false;
let timer=null;

function open(){
  if(dbp) return dbp;
  dbp=new Promise((resolve,reject)=>{
    let done=false;
    const to=setTimeout(()=>{
      if(done) return;
      done=true;
      dbp=null;
      reject(new Error('indexeddb-timeout'));
    },6000);
    const r=indexedDB.open(DB,VER);
    r.onupgradeneeded=()=>{
      const d=r.result;
      if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    };
    r.onsuccess=()=>{
      if(done) return;
      done=true;
      clearTimeout(to);
      resolve(r.result);
    };
    r.onerror=()=>{
      if(done) return;
      done=true;
      clearTimeout(to);
      dbp=null;
      reject(r.error);
    };
    r.onblocked=()=>{
      if(done) return;
      done=true;
      clearTimeout(to);
      dbp=null;
      reject(new Error('indexeddb-blocked'));
    };
  });
  return dbp;
}

async function get(k,def=null){
  try{
    const d=await open();
    return await new Promise((res,rej)=>{
      const r=d.transaction(STORE,'readonly').objectStore(STORE).get(k);
      r.onsuccess=()=>res(r.result===undefined?def:r.result);
      r.onerror=()=>rej(r.error);
    });
  }catch(_){ return def; }
}

async function set(k,v){
  const d=await open();
  return new Promise((res,rej)=>{
    const t=d.transaction(STORE,'readwrite');
    t.objectStore(STORE).put(v,k);
    t.oncomplete=()=>res(v);
    t.onerror=()=>rej(t.error);
  });
}

async function setMany(entries){
  if(!entries || !entries.length) return;
  const d=await open();
  return new Promise((res,rej)=>{
    const t=d.transaction(STORE,'readwrite');
    const s=t.objectStore(STORE);
    entries.forEach(([k,v])=>s.put(v,k));
    t.oncomplete=()=>res();
    t.onerror=()=>rej(t.error);
  });
}

async function del(k){
  const d=await open();
  return new Promise((res,rej)=>{
    const t=d.transaction(STORE,'readwrite');
    t.objectStore(STORE).delete(k);
    t.oncomplete=res;
    t.onerror=()=>rej(t.error);
  });
}

const key=(uid,s)=>`u:${uid||'anon'}:${s}`;

function uid(){
  try{return window.AKTIF_KULLANICI?.uid||''}catch(_){return''}
}

async function queue(uid,op){
  const k=key(uid,'queue');
  const q=await get(k,[]);
  const qid=op.qid||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const next={...op,qid,createdAt:op.createdAt||Date.now(),tries:op.tries||0};
  const i=q.findIndex(x=>x.qid===qid);
  if(i>=0) q[i]=next; else q.push(next);
  await set(k,q);
  schedule();
  return next;
}

async function pending(uidValue=uid()){
  if(!uidValue) return [];
  return get(key(uidValue,'queue'),[]);
}

async function tombstone(uidValue,type,id,on=true){
  const k=key(uidValue,`tomb:${type}`);
  const x=await get(k,{});
  if(on) x[id]=Date.now(); else delete x[id];
  await set(k,x);
  return x;
}

async function tombstones(uidValue,type){
  return get(key(uidValue,`tomb:${type}`),{});
}

async function cache(uidValue,type,data){
  return set(key(uidValue,`cache:${type}`),data);
}

async function cached(uidValue,type,def=[]){
  return get(key(uidValue,`cache:${type}`),def);
}

/* Bir ilk-senkron turunda cok sayida veri grubunu TEK IndexedDB transaction ile yazar.
   Bu, localStorage'daki buyuk JSON yazimlarinin yerine kullanilacak ana giris noktasidir. */
async function cacheMany(uidValue,dataByType){
  if(!uidValue || !dataByType || typeof dataByType!=='object') return;
  const rows=Object.entries(dataByType).map(([type,data])=>[key(uidValue,`cache:${type}`),data]);
  rows.push([key(uidValue,'meta:lastLocalWriteAt'),Date.now()]);
  await setMany(rows);
  return dataByType;
}

/* Uygulama acilisinda Firestore'u beklemeden cihazdaki tum istenen veri gruplarini okur. */
async function hydrate(uidValue,types,defaults={}){
  const out={};
  for(const type of (types||[])){
    const def=Object.prototype.hasOwnProperty.call(defaults,type)?defaults[type]:[];
    out[type]=await cached(uidValue,type,def);
  }
  return out;
}

async function meta(uidValue,name,value){
  const k=key(uidValue,`meta:${name}`);
  if(arguments.length>=3){ await set(k,value); return value; }
  return get(k,null);
}

async function markBootstrap(uidValue,details={}){
  const state={
    ready:true,
    completedAt:Date.now(),
    ...details
  };
  await meta(uidValue,'bootstrap',state);
  return state;
}

async function bootstrapState(uidValue){
  return meta(uidValue,'bootstrap');
}

async function isBootstrapReady(uidValue){
  const state=await bootstrapState(uidValue);
  return !!(state&&state.ready);
}

async function run(op){
  if(!window.db) throw new Error('db-yok');
  const ref=op.id?db.collection(op.collection).doc(op.id):null;
  if(op.kind==='delete-doc') return ref.delete();
  if(op.kind==='set-doc') return ref.set(op.data,{merge:!!op.merge});
  if(op.kind==='update-doc') return ref.set(op.data,{merge:true});
  if(op.kind==='delete-query'){
    const s=await db.collection(op.collection).where(op.field,'==',op.value).get();
    if(s.empty) return;
    const b=db.batch();
    s.docs.forEach(d=>b.delete(d.ref));
    return b.commit();
  }
  throw new Error('op-bilinmiyor');
}

async function flush(){
  if(flushing||!navigator.onLine) return;
  const u=uid();
  if(!u) return;
  flushing=true;
  const k=key(u,'queue');
  try{
    const q=await get(k,[]);
    const left=[];
    for(const op of q){
      try{
        await run(op);
        if(op.tombType&&op.tombId) await tombstone(u,op.tombType,op.tombId,false);
      }catch(e){
        op.tries=(op.tries||0)+1;
        op.lastError=String(e?.message||e);
        op.lastTryAt=Date.now();
        left.push(op);
      }
    }
    await set(k,left);
    window.dispatchEvent(new CustomEvent('koruk:sync-state',{detail:{pending:left.length}}));
    return left.length;
  }finally{
    flushing=false;
  }
}

function schedule(){
  clearTimeout(timer);
  timer=setTimeout(flush,350);
}

window.addEventListener('online',()=>setTimeout(flush,150));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)flush()});
setInterval(flush,12000);

window.KorukLocalFirst={
  open,get,set,setMany,del,
  queue,pending,
  tombstone,tombstones,
  cache,cached,cacheMany,hydrate,
  meta,markBootstrap,bootstrapState,isBootstrapReady,
  flush,schedule,uid
};
})();