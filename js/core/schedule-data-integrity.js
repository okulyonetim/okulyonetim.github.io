/* Koruk Asistan — Ders programı yerel veri bütünlüğü koruması.
 * Core SyncEngine uzak veriyi AppStore'a yayınlamadan hemen önce yerel bir
 * ders ekleme/güncelleme/silme tamamlanırsa, gecikmiş uzak snapshot'ın yeni
 * yerel kaydı görünümden ve IndexedDB önbelleğinden düşürmesini engeller.
 * Aynı sınıf + gün + saat için geçmişte oluşmuş mükerrer belgeler UI katmanına
 * tek ders olarak verilir. Firestore belgeleri otomatik silinmez.
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
function logicalKey(row){
  const sinif=String(row?.sinif||'').trim(),gun=String(row?.gun||'').trim(),saat=Number(row?.saat);
  if(!sinif||!gun||!Number.isFinite(saat))return'';
  return `${sinif}\u0001${gun}\u0001${saat}`;
}
function timeValue(value){
  try{
    if(value?.toMillis)return Number(value.toMillis())||0;
    if(value?.toDate)return Number(value.toDate()?.getTime?.())||0;
    if(typeof value==='number')return Number.isFinite(value)?value:0;
    const n=Date.parse(String(value||''));return Number.isFinite(n)?n:0;
  }catch(_){return 0}
}
function rowStamp(row){
  return Math.max(
    timeValue(row?.guncellenmeTarihi),timeValue(row?.updatedAt),timeValue(row?.updated_at),
    timeValue(row?.eklenmeTarihi),timeValue(row?.createdAt),timeValue(row?.created_at)
  );
}
function preferredRow(a,b){
  if(!a)return b;if(!b)return a;
  const ap=protectedIds.get(String(a?.id||'')),bp=protectedIds.get(String(b?.id||''));
  if(ap?.mode==='upsert'&&!bp?.mode)return a;
  if(bp?.mode==='upsert'&&!ap?.mode)return b;
  const at=rowStamp(a),bt=rowStamp(b);
  if(bt>at)return b;if(at>bt)return a;
  return b;
}
function dedupeRows(rows){
  prune();
  const out=[],slotIndex=new Map();let changed=false;
  for(const row of Array.isArray(rows)?rows:[]){
    if(row?.id&&protectedIds.get(String(row.id))?.mode==='delete'){changed=true;continue}
    const key=logicalKey(row);
    if(!key){out.push(row);continue}
    if(!slotIndex.has(key)){slotIndex.set(key,out.length);out.push(row);continue}
    const index=slotIndex.get(key),chosen=preferredRow(out[index],row);
    if(chosen!==out[index])out[index]=chosen;
    changed=true;
  }
  return{rows:out,changed};
}
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
  const unique=dedupeRows(Array.from(out.values()));
  return{rows:unique.rows,changed:changed||unique.changed};
}
function normalizeCurrent(){
  const current=Array.isArray(global.AppStore?.data?.(TYPE))?global.AppStore.data(TYPE):[];
  const fixed=dedupeRows(current);
  if(!fixed.changed)return current;
  global.AppStore?.setData?.(TYPE,fixed.rows);
  repairCache(fixed.rows);
  return fixed.rows;
}
function patchStore(){
  const store=global.AppStore;
  if(!store?.setData||!store?.setDataMany)return false;
  if(!store.setData.__korukScheduleIntegrity){
    const originalSet=store.setData.bind(store);
    const wrappedSet=function(type,value){
      if(type!==TYPE||!Array.isArray(value))return originalSet(type,value);
      const fixed=dedupeRows(value),result=originalSet(type,fixed.rows);
      if(fixed.changed)repairCache(fixed.rows);
      return result;
    };
    wrappedSet.__korukScheduleIntegrity=true;wrappedSet.__korukOriginal=originalSet;store.setData=wrappedSet;
  }
  if(!store.setDataMany.__korukScheduleIntegrity){
    const originalMany=store.setDataMany.bind(store);
    const wrappedMany=function(data){
      if(!data||typeof data!=='object'||!Array.isArray(data[TYPE]))return originalMany(data);
      const fixed=reconcile(data[TYPE]);
      if(!fixed.changed)return originalMany(data);
      const next={...data,[TYPE]:fixed.rows},result=originalMany(next);repairCache(fixed.rows);return result;
    };
    wrappedMany.__korukScheduleIntegrity=true;wrappedMany.__korukOriginal=originalMany;store.setDataMany=wrappedMany;
  }
  return true;
}
function patchDeviceData(){
  const device=global.DeviceData;
  if(!device?.add||!device?.update||!device?.remove||!device?.newId)return false;
  if(device.__korukScheduleIntegrity)return true;
  const add=device.add.bind(device),update=device.update.bind(device),set=device.set?.bind(device),remove=device.remove.bind(device);
  device.add=async function(type,collection,data,options={}){
    if(type!==TYPE)return add(type,collection,data,options);
    normalizeCurrent();
    const id=options?.id||device.newId();protect(id,'upsert');
    try{const result=await add(type,collection,data,{...(options||{}),id});normalizeCurrent();return result}catch(error){unprotect(id);throw error}
  };
  device.update=async function(type,collection,id,data){
    if(type!==TYPE)return update(type,collection,id,data);
    normalizeCurrent();protect(id,'upsert');
    try{const result=await update(type,collection,id,data);normalizeCurrent();return result}catch(error){unprotect(id);throw error}
  };
  if(set)device.set=async function(type,collection,id,data,options={}){
    if(type!==TYPE)return set(type,collection,id,data,options);
    normalizeCurrent();protect(id,'upsert');
    try{const result=await set(type,collection,id,data,options);normalizeCurrent();return result}catch(error){unprotect(id);throw error}
  };
  device.remove=async function(type,collection,id){
    if(type!==TYPE)return remove(type,collection,id);
    normalizeCurrent();protect(id,'delete');
    try{const result=await remove(type,collection,id);normalizeCurrent();return result}catch(error){unprotect(id);throw error}
  };
  device.__korukScheduleIntegrity=true;
  return true;
}
function friendlySaveError(error){
  const m=String(error?.message||error||'');
  if(m==='slot-dolu')return'Bu sınıfın seçilen gün ve saatinde zaten bir ders var. Mevcut dersi düzenleyin veya başka bir saat seçin.';
  if(m.startsWith('cakisma:')){const[,ad,sinif]=m.split(':');return`${ad||'Seçilen öğretmen'} bu gün ve saatte ${sinif||'başka bir'} sınıfta derse giriyor. Başka öğretmen veya saat seçin.`}
  if(m==='yetkisiz')return'Bu ders programını değiştirme yetkiniz bulunmuyor.';
  if(m.startsWith('zorunlu-alan:'))return'Ders bilgilerini eksiksiz seçin.';
  if(m==='gecersiz-saat')return'Geçerli bir ders saati seçin.';
  return`Ders kaydedilemedi: ${m||'Bilinmeyen hata'}`;
}
function saveStatusElement(){
  const modal=document.getElementById('kaAcademicScheduleModal');if(!modal)return null;
  let el=modal.querySelector('[data-schedule-save-status]');if(el)return el;
  el=document.createElement('div');el.dataset.scheduleSaveStatus='';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
  el.style.cssText='margin:0 22px 12px;padding:10px 12px;border-radius:12px;font-size:14px;line-height:1.35;display:none;background:rgba(255,255,255,.06);border:1px solid var(--ka-border);';
  modal.querySelector('.ka-modal__footer')?.before(el);return el;
}
function setSaveStatus(message,state='info'){
  const el=saveStatusElement();if(!el)return;
  el.textContent=message||'';el.style.display=message?'block':'none';
  el.style.color=state==='error'?'var(--ka-danger,#ef6b6b)':'var(--ka-text,#fff)';
}
function patchScheduleService(){
  const service=global.DersProgramiService;
  if(!service?.kaydet)return false;
  if(service.kaydet.__korukScheduleIntegrity)return true;
  const original=service.kaydet.bind(service);
  const wrapped=async function(id,veri){
    normalizeCurrent();
    const modal=document.getElementById('kaAcademicScheduleModal'),btn=modal?.querySelector('[data-save]'),oldText=btn?.textContent||'Kaydet';
    if(btn){btn.disabled=true;btn.setAttribute('aria-busy','true');btn.textContent='Kaydediliyor…'}
    setSaveStatus('Ders kaydı kontrol ediliyor…','info');
    try{
      const result=await original(id,veri);
      setSaveStatus('Ders kaydedildi.','info');
      return result;
    }catch(error){
      setSaveStatus(friendlySaveError(error),'error');
      throw error;
    }finally{
      if(btn?.isConnected){btn.disabled=false;btn.removeAttribute('aria-busy');btn.textContent=oldText}
    }
  };
  wrapped.__korukScheduleIntegrity=true;wrapped.__korukOriginal=original;service.kaydet=wrapped;return true;
}
function install(){
  const okStore=patchStore(),okDevice=patchDeviceData();patchScheduleService();
  installed=okStore&&okDevice;
  if(installed){normalizeCurrent();if(timer){clearInterval(timer);timer=null}}
  return installed;
}
function start(){
  if(!install())timer=setInterval(install,100);
  setTimeout(()=>{if(timer){clearInterval(timer);timer=null}},15000);
  new MutationObserver(()=>{patchScheduleService();if(document.getElementById('kaAcademicScheduleModal'))saveStatusElement()}).observe(document.documentElement,{childList:true,subtree:true});
}

global.KorukScheduleDataIntegrity={install,protect,unprotect,reconcile,dedupeRows,normalizeCurrent,patchScheduleService,friendlySaveError,get installed(){return installed},protectedIds};
global.addEventListener?.('koruk:app-ready',install);
global.addEventListener?.('koruk:module-ready',event=>{if(event.detail?.name==='academic')setTimeout(()=>{patchScheduleService();normalizeCurrent()},0)});
document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='visible')install()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
