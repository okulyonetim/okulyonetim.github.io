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
function patchData(type,value){
  state.data[type]=value;
  emit('data.'+type,value);
  return value;
}
function hydrate(data){
  if(data&&typeof data==='object')Object.entries(data).forEach(([k,v])=>{state.data[k]=v});
  state.meta.hydrated=true;
  emit('meta.hydrated',true);
  return state.data;
}
function subscribe(path,fn,{immediate=false}={}){
  if(!listeners.has(path))listeners.set(path,new Set());
  listeners.get(path).add(fn);
  if(immediate){try{fn(pathGet(path),path,state)}catch(e){console.error('[AppStore]',e)}}
  return()=>listeners.get(path)?.delete(fn);
}
function subscribeAll(fn){anyListeners.add(fn);return()=>anyListeners.delete(fn)}
function snapshot(){
  try{return structuredClone(state)}catch(_){return JSON.parse(JSON.stringify(state))}
}

const api={
  __v2:true,
  get:pathGet,
  set:pathSet,
  data:(type)=>state.data[type],
  setData:patchData,
  hydrate,
  subscribe,
  subscribeAll,
  snapshot,
  get state(){return state},
  /* Eski servis/repository geçişi bitene kadar uyumluluk. */
  getir:pathGet,
  ayarla:pathSet,
  abone:(path,fn)=>subscribe(path,fn)
};
window.AppStore=api;

window.addEventListener('online',()=>api.set('ui.online',true),{passive:true});
window.addEventListener('offline',()=>api.set('ui.online',false),{passive:true});
})();
