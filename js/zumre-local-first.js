/* Koruk Asistan — Zümre local-first köprüsü
 * Mevcut CizelgelerService/Repository akışını korur.
 */
(function(){
'use strict';
if(window.__KH_ZUMRE_LOCAL_FIRST__) return;
window.__KH_ZUMRE_LOCAL_FIRST__=true;
const TYPE='zumre', CACHE_TYPE='zumre';
let installed=false;
function uid(){return window.KorukLocalFirst?.uid?.()||window.AKTIF_KULLANICI?.uid||''}
function col(){try{return COL.zumre}catch(_){return 'oy_zumre'}}
function clean(o){if(!o)return o;const x={...o};delete x._localPending;delete x._localUpdatedAt;return x}
function sameCore(a,b){
  if(!a||!b)return false;
  const aa=clean(a),bb=clean(b),keys=['ogretmenId','brans','sinif','tarih1','tarih2','tarih3','aciklama'];
  if(keys.some(k=>String(aa[k]||'')!==String(bb[k]||'')))return false;
  return JSON.stringify(Array.isArray(aa.kontroller)?aa.kontroller:[])===JSON.stringify(Array.isArray(bb.kontroller)?bb.kontroller:[]);
}
async function cached(){return window.KorukLocalFirst?window.KorukLocalFirst.cached(uid(),CACHE_TYPE,[]):[]}
async function save(list){if(window.KorukLocalFirst)await window.KorukLocalFirst.cache(uid(),CACHE_TYPE,list)}
async function tombs(){return window.KorukLocalFirst?window.KorukLocalFirst.tombstones(uid(),TYPE):{}}
function publish(list){
  try{if(typeof cizelgeVerileri!=='undefined'){cizelgeVerileri.zumre=list}}catch(_){}
  try{if(typeof renderCizelge==='function')renderCizelge('zumre')}catch(_){}
  window.dispatchEvent(new CustomEvent('koruk:zumre-local',{detail:{count:list.length}}));
}
async function optimistic(id,data,mode){
  let list=await cached();
  if(mode==='delete') list=list.filter(x=>x.id!==id);
  else{
    const row={id,...data,_localPending:true,_localUpdatedAt:Date.now()};
    const i=list.findIndex(x=>x.id===id);
    if(i>=0)list[i]={...list[i],...row};else list.push(row);
  }
  await save(list);publish(list);return list;
}
async function reconcile(remote){
  const local=await cached(),ts=await tombs();
  const map=new Map((remote||[]).filter(x=>!ts[x.id]).map(x=>[x.id,x]));
  for(const l of local){
    if(ts[l.id])continue;
    if(l._localPending){const r=map.get(l.id);map.set(l.id,r&&sameCore(l,r)?r:l)}
  }
  const merged=[...map.values()];await save(merged);return merged;
}
function localId(){return 'zm_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)}
function install(){
  if(installed)return true;
  if(!window.KorukLocalFirst||typeof CizelgelerRepository==='undefined'||typeof CizelgelerService==='undefined')return false;
  installed=true;
  const listenOriginal=CizelgelerRepository.kayitlariDinle.bind(CizelgelerRepository);
  CizelgelerRepository.kayitlariDinle=function(tip,cb,err){
    if(tip!==TYPE)return listenOriginal(tip,cb,err);
    let alive=true,seq=0;
    (async()=>{const l=await cached(),ts=await tombs();const safe=l.filter(x=>!ts[x.id]);if(alive&&safe.length)cb(safe)})();
    const unsub=listenOriginal(tip,async arr=>{const my=++seq;try{const merged=await reconcile(arr);if(alive&&my===seq)cb(merged)}catch(e){if(err)err(e)}},err);
    return()=>{alive=false;try{if(typeof unsub==='function')unsub()}catch(_){}};
  };
  const saveOriginal=CizelgelerService.kayitKaydet.bind(CizelgelerService);
  const delOriginal=CizelgelerService.kayitSil.bind(CizelgelerService);
  const toggleOriginal=CizelgelerService.kontrolToggle.bind(CizelgelerService);
  CizelgelerService.kayitKaydet=async function(tip,mevcutId,veri){
    if(tip!==TYPE)return saveOriginal(tip,mevcutId,veri);
    if(!this._yetkiKontrol(tip))throw new Error('yetkisiz');
    const id=mevcutId||localId(),data={...veri};
    if(!mevcutId&&!data.eklenmeTarihi)data.eklenmeTarihi=new Date().toISOString();
    await optimistic(id,data,'upsert');
    await window.KorukLocalFirst.queue(uid(),{qid:'zm-save:'+id,kind:'set-doc',collection:col(),id,data:clean(data),merge:true});
    window.KorukLocalFirst.flush();return{id,local:true};
  };
  CizelgelerService.kayitSil=async function(tip,id){
    if(tip!==TYPE)return delOriginal(tip,id);
    if(!this._yetkiKontrol(tip))throw new Error('yetkisiz');
    await optimistic(id,null,'delete');await window.KorukLocalFirst.tombstone(uid(),TYPE,id,true);
    await window.KorukLocalFirst.queue(uid(),{qid:'zm-delete:'+id,kind:'delete-doc',collection:col(),id,tombType:TYPE,tombId:id});
    window.KorukLocalFirst.flush();return true;
  };
  CizelgelerService.kontrolToggle=async function(tip,id,kontroller){
    if(tip!==TYPE)return toggleOriginal(tip,id,kontroller);
    if(!this._yetkiKontrol(tip))throw new Error('yetkisiz');
    const list=await cached(),old=list.find(x=>x.id===id)||{};
    await optimistic(id,{...old,kontroller:[...kontroller]},'upsert');
    await window.KorukLocalFirst.queue(uid(),{qid:'zm-toggle:'+id,kind:'update-doc',collection:col(),id,data:{kontroller:[...kontroller]}});
    window.KorukLocalFirst.flush();return true;
  };
  (async()=>{const l=await cached();if(l.length)publish(l)})();
  return true;
}
let n=0,t=setInterval(()=>{if(install()||++n>160)clearInterval(t)},50);
})();