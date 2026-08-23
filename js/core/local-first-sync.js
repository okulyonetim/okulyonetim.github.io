/* Koruk Asistan - Local First Sync v1
   Kritik islemler once telefonda uygulanir, Firestore senkronu arkada yapilir. */
(function(){
'use strict';
if(window.KorukLocalFirst) return;
const DB='koruk-local-first-v1', VER=1, STORE='kv';
let dbp=null, flushing=false;
function open(){
  if(dbp) return dbp;
  dbp=new Promise((resolve,reject)=>{const r=indexedDB.open(DB,VER);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  return dbp;
}
async function get(k,def=null){try{const d=await open();return await new Promise((res,rej)=>{const r=d.transaction(STORE,'readonly').objectStore(STORE).get(k);r.onsuccess=()=>res(r.result===undefined?def:r.result);r.onerror=()=>rej(r.error)})}catch(_){return def}}
async function set(k,v){const d=await open();return new Promise((res,rej)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).put(v,k);t.oncomplete=()=>res(v);t.onerror=()=>rej(t.error)})}
async function del(k){const d=await open();return new Promise((res,rej)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).delete(k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}
const key=(uid,s)=>`u:${uid||'anon'}:${s}`;
async function queue(uid,op){const k=key(uid,'queue'),q=await get(k,[]);q.push({...op,qid:op.qid||`${Date.now()}-${Math.random().toString(36).slice(2)}`,createdAt:Date.now(),tries:0});await set(k,q);schedule();return q[q.length-1]}
async function tombstone(uid,type,id,on=true){const k=key(uid,`tomb:${type}`),x=await get(k,{});if(on)x[id]=Date.now();else delete x[id];await set(k,x);return x}
async function tombstones(uid,type){return get(key(uid,`tomb:${type}`),{})}
async function cache(uid,type,data){return set(key(uid,`cache:${type}`),data)}
async function cached(uid,type,def=[]){return get(key(uid,`cache:${type}`),def)}
function uid(){try{return window.AKTIF_KULLANICI?.uid||''}catch(_){return''}}
async function run(op){
 if(!window.db) throw new Error('db-yok');
 if(op.kind==='delete-doc') return db.collection(op.collection).doc(op.id).delete();
 if(op.kind==='update-doc') return db.collection(op.collection).doc(op.id).set(op.data,{merge:true});
 if(op.kind==='delete-query') {const s=await db.collection(op.collection).where(op.field,'==',op.value).get();if(s.empty)return;const b=db.batch();s.docs.forEach(d=>b.delete(d.ref));return b.commit()}
 throw new Error('op-bilinmiyor');
}
async function flush(){if(flushing||!navigator.onLine)return;const u=uid();if(!u)return;flushing=true;const k=key(u,'queue');try{let q=await get(k,[]),left=[];for(const op of q){try{await run(op);if(op.tombType&&op.tombId)await tombstone(u,op.tombType,op.tombId,false)}catch(e){op.tries=(op.tries||0)+1;op.lastError=String(e?.message||e);left.push(op)}}await set(k,left)}finally{flushing=false}}
let timer=null;function schedule(){clearTimeout(timer);timer=setTimeout(flush,500)}
window.addEventListener('online',()=>setTimeout(flush,250));document.addEventListener('visibilitychange',()=>{if(!document.hidden)flush()});setInterval(flush,15000);
window.KorukLocalFirst={get,set,del,queue,tombstone,tombstones,cache,cached,flush,schedule,uid};
})();