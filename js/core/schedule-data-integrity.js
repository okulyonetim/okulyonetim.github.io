/* Koruk Asistan — Ders programı yerel veri bütünlüğü koruması.
 * Core SyncEngine uzak veriyi AppStore'a yayınlamadan hemen önce yerel bir
 * ders ekleme/güncelleme/silme tamamlanırsa, gecikmiş uzak snapshot'ın yeni
 * yerel kaydı görünümden ve IndexedDB önbelleğinden düşürmesini engeller.
 */
(function(global){
'use strict';
if(global.KorukScheduleDataIntegrity)return;

const TYPE='dersProgrami';
const PROTECTION_MS=120000;
const protectedIds=new Map();
let installed=false,timer=null;

function now(){return Date.now()}
function prune(){const t=now();for(const[id,entry]of protectedIds)if(!entry||entry.until<=t)protectedIds.delete(id)}
function protect(id,mode='upsert'){if(!id)return;protectedIds.set(String(id),{mode,until:now()+PROTECTION_MS})}
function unprotect(id){if(id)protectedIds.delete(String(id))}
function rowsEqual(a,b){try{return JSON.stringify(a)===JSON.stringify(b)}catch(_){return a===b}}
function repairCache(rows){
  try{
    const u=global.KorukLocalFirst?.uid?.();
    if(!u||!global.KorukLocalFirst?.cache)return;
    Promise.resolve(global.KorukLocalFirst.cache(u,TYPE,rows)).catch(e=>console.warn('[ScheduleIntegrity/cache]',e?.message||e));
  }catch(e){console.warn('[ScheduleIntegrity/cache]',e?.message||e)}
}
function reconcile(incoming){
  prune();
  const current=Array.isArray(global.AppStore?.data?.(TYPE))?global.AppStore.data(TYPE):[];
  const currentById=new Map(current.filter(x=>x?.id).map(x=>[String(x.id),x]));
  const out=new Map();
  (Array.isArray(incoming)?incoming:[]).forEach((row,index)=>out.set(row?.id?String(row.id):`remote:${index}`,row));
  let changed=false;
  for(const[id,entry]of protectedIds){
    if(entry.mode==='delete'){
      if(out.delete(id))changed=true;
      continue;
    }
    const local=currentById.get(id);
    if(!local)continue;
    const remote=out.get(id);
    if(!remote||!rowsEqual(remote,local)){out.set(id,local);changed=true}
  }
  return{rows:Array.from(out.values()),changed};
}
function patchStore(){
  const store=global.AppStore;
  if(!store?.setDataMany)return false;
  if(store.setDataMany.__korukScheduleIntegrity)return true;
  const original=store.setDataMany.bind(store);
  const wrapped=function(data){
    if(!data||typeof data!=='object'||!Array.isArray(data[TYPE]))return original(data);
    const fixed=reconcile(data[TYPE]);
    if(!fixed.changed)return original(data);
    const next={...data,[TYPE]:fixed.rows};
    const result=original(next);
    repairCache(fixed.rows);
    return result;
  };
  wrapped.__korukScheduleIntegrity=true;
  wrapped.__korukOriginal=original;
  store.setDataMany=wrapped;
  return true;
}
function patchDeviceData(){
  const device=global.DeviceData;
  if(!device?.add||!device?.update||!device?.remove||!device?.newId)return false;
  if(device.__korukScheduleIntegrity)return true;
  const add=device.add.bind(device),update=device.update.bind(device),set=device.set?.bind(device),remove=device.remove.bind(device);
  device.add=async function(type,collection,data,options={}){
    if(type!==TYPE)return add(type,collection,data,options);
    const id=options?.id||device.newId();
    protect(id,'upsert');
    try{return await add(type,collection,data,{...(options||{}),id})}catch(error){unprotect(id);throw error}
  };
  device.update=async function(type,collection,id,data){
    if(type!==TYPE)return update(type,collection,id,data);
    protect(id,'upsert');
    try{return await update(type,collection,id,data)}catch(error){unprotect(id);throw error}
  };
  if(set)device.set=async function(type,collection,id,data,options={}){
    if(type!==TYPE)return set(type,collection,id,data,options);
    protect(id,'upsert');
    try{return await set(type,collection,id,data,options)}catch(error){unprotect(id);throw error}
  };
  device.remove=async function(type,collection,id){
    if(type!==TYPE)return remove(type,collection,id);
    protect(id,'delete');
    try{return await remove(type,collection,id)}catch(error){unprotect(id);throw error}
  };
  device.__korukScheduleIntegrity=true;
  return true;
}
function install(){
  const okStore=patchStore(),okDevice=patchDeviceData();
  installed=okStore&&okDevice;
  if(installed&&timer){clearInterval(timer);timer=null}
  return installed;
}
function start(){
  if(install())return;
  timer=setInterval(install,100);
  setTimeout(()=>{if(timer){clearInterval(timer);timer=null}},15000);
}

global.KorukScheduleDataIntegrity={install,protect,unprotect,reconcile,get installed(){return installed},protectedIds};
global.addEventListener?.('koruk:app-ready',install);
document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='visible')install()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
