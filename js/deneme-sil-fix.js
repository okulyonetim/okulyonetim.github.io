/* Koruk Asistan — deneme sınavı silme akışı v2
 * UI Firestore/IndexedDB beklemez: kayıt anında local listeden çıkar,
 * modal kapanır; tombstone + senkron kuyruğu arka planda devam eder.
 */
(function(){
'use strict';
if(window.__KORUK_DENEME_SIL_FIX_V2__)return;
window.__KORUK_DENEME_SIL_FIX_V2__=true;
let editingId=null;

function uid(){try{return window.KorukLocalFirst?.uid?.()||window.AKTIF_KULLANICI?.uid||''}catch(_){return''}}
function col(){try{return COL.denemeSinavlari||'oy_denemeSinavlari'}catch(_){return'oy_denemeSinavlari'}}
function list(){try{return window.KorukRuntimeState?.get?.('denemeSinavlari')||[]}catch(_){return[]}}
function setList(v){try{window.KorukRuntimeState?.set?.('denemeSinavlari',v)}catch(_){}}
function refresh(){
 try{if(typeof renderDenemeSinavlari==='function')renderDenemeSinavlari()}catch(_){}
 try{if(typeof _anaSayfaSayacKartiGuncelle==='function')_anaSayfaSayacKartiGuncelle()}catch(_){}
 try{window.KorukRuntimeState?.signal?.('deneme-delete-optimistic')}catch(_){}
}
function backgroundDelete(id){
 const u=uid();
 if(!window.KorukLocalFirst||!u){
   try{SinavlarRepository?.denemeSil?.(id)?.catch?.(e=>console.warn('[deneme-sil]',e))}catch(_){}
   return;
 }
 Promise.resolve().then(async()=>{
   try{await window.KorukLocalFirst.tombstone(u,'denemeSinavlari',id,true)}catch(e){console.warn('[deneme-sil] tombstone',e)}
   try{
     await window.KorukLocalFirst.queue(u,{qid:'deneme-delete:'+id,kind:'delete-doc',collection:col(),id:id,tombType:'denemeSinavlari',tombId:id});
     window.KorukLocalFirst.flush?.();
   }catch(e){console.warn('[deneme-sil] queue',e)}
 });
}
function optimisticDelete(id){
 const sid=String(id||'');if(!sid)return;
 setList(list().filter(x=>String(x?.id||'')!==sid));
 refresh();
 backgroundDelete(sid);
}
function wrapOpen(){
 const old=window.denemeModalAc;
 if(typeof old!=='function'||old.__dnSilFixV2)return false;
 const fn=function(id){
   editingId=id?String(id):null;
   const r=old.apply(this,arguments);
   const btn=document.getElementById('modalSilBtn');
   if(editingId&&btn&&btn.style.display!=='none'){
     btn.disabled=false;btn.textContent='Sil';
     btn.onclick=function(e){
       e?.preventDefault?.();e?.stopPropagation?.();
       if(!confirm('Bu deneme sınavı kaydını silmek istiyor musunuz?'))return;
       const sid=editingId;
       optimisticDelete(sid);
       if(typeof modalKapat==='function')modalKapat();
       editingId=null;
       if(typeof toast==='function')toast('Deneme sınavı silindi.');
     };
   }
   return r;
 };
 fn.__dnSilFixV2=true;fn.__dnSilFixBase=old;window.denemeModalAc=fn;return true;
}
function install(){wrapOpen()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
[250,900,2200,5000].forEach(ms=>setTimeout(install,ms));
document.addEventListener('click',e=>{if(e.target.closest?.('[onclick*="denemeModalAc"]'))setTimeout(install,0)},true);
})();
