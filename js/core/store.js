/* Koruk Asistan — AppStore v2
   Uygulamanın tek çalışma-zamanı state kaynağıdır.
   Firestore UI'ya doğrudan veri vermez; LocalDB/SyncEngine -> AppStore -> UI akışı kullanılır. */
(function(){
'use strict';
if(window.AppStore&&window.AppStore.__v2)return;

const state={
  session:{user:null,role:null,ready:false},
  ui:{theme:'light',route:'panel',online:navigator.onLine,syncing:false,pendingWrites:0,lastSyncAt:null},
  data:Object.create(null),
  meta:{hydrated:false,booted:false}
};
const listeners=new Map();
const anyListeners=new Set();

function pathGet(path){
  return String(path||'').split('.').filter(Boolean).reduce((o,k)=>o==null?undefined:o[k],state);
}
function pathSet(path,value){
  const parts=String(path||'').split('.').filter(Boolean);
  if(!parts.length)return;
  let node=state;
  for(let i=0;i<parts.length-1;i++){
    const k=parts[i];
    if(!node[k]||typeof node[k]!=='object')node[k]={};
    node=node[k];
  }
  node[parts[parts.length-1]]=value;
  emit(path,value);
}
function emit(path,value){
  const direct=listeners.get(path);
  if(direct)direct.forEach(fn=>{try{fn(value,path,state)}catch(e){console.error('[AppStore]',e)}});
  anyListeners.forEach(fn=>{try{fn(path,value,state)}catch(e){console.error('[AppStore:any]',e)}});
  try{window.dispatchEvent(new CustomEvent('koruk:store-change',{detail:{path,value}}))}catch(_){}
}
function patchData(type,value){state.data[type]=value;emit('data.'+type,value);return value}
function hydrate(data){
  if(data&&typeof data==='object')Object.entries(data).forEach(([k,v])=>{state.data[k]=v});
  state.meta.hydrated=true;emit('meta.hydrated',true);return state.data;
}
function subscribe(path,fn,{immediate=false}={}){
  if(!listeners.has(path))listeners.set(path,new Set());
  listeners.get(path).add(fn);
  if(immediate){try{fn(pathGet(path),path,state)}catch(e){console.error('[AppStore]',e)}}
  return()=>listeners.get(path)?.delete(fn);
}
function subscribeAll(fn){anyListeners.add(fn);return()=>anyListeners.delete(fn)}
function snapshot(){try{return structuredClone(state)}catch(_){return JSON.parse(JSON.stringify(state))}}

const api={
  __v2:true,get:pathGet,set:pathSet,data:(type)=>state.data[type],setData:patchData,hydrate,
  subscribe,subscribeAll,snapshot,get state(){return state},
  getir:pathGet,ayarla:pathSet,abone:(path,fn)=>subscribe(path,fn)
};
window.AppStore=api;
window.addEventListener('online',()=>api.set('ui.online',true),{passive:true});
window.addEventListener('offline',()=>api.set('ui.online',false),{passive:true});

/* Geçiş süresince eski dev index.html'i tek seferde değiştirmeden yeni çekirdeği
   güvenli sırayla yükler. index.html sadeleştirilince bu loader kaldırılacak. */
function load(src,test){
  if(test())return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-koruk-core="'+src+'"]');
    if(existing){existing.addEventListener('load',resolve,{once:true});return;}
    const s=document.createElement('script');s.src=src;s.async=false;s.dataset.korukCore=src;
    s.onload=resolve;s.onerror=()=>reject(new Error('core-load:'+src));document.head.appendChild(s);
  });
}
(async()=>{
  try{
    await load('js/core/local-first-sync.js',()=>!!window.KorukLocalFirst);
    await load('js/core/sync-engine.js',()=>!!window.SyncEngine);
    await load('js/core/app-bootstrap.js',()=>!!window.AppBootstrap);
  }catch(e){console.warn('[KorukCore]',e?.message||e)}
})();
})();
