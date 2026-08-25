/* Koruk Asistan — Deneme sayacı local-first
 * Durdurma tombstone'u eski snapshot'ın sayacı yeniden başlatmasını engeller.
 * Daha yeni gerçek bir başlatma kaydı gelirse tombstone otomatik temizlenir.
 *
 * 2026-08-25: Eski deneme-sayac-local-first-v2.js bu dosyaya birleştirildi.
 * Bu dosya artık tek kaynak ve dinamik ara-loader kullanmıyor.
 */
(function(){
'use strict';
if(window.__KORUK_EXAM_LOCAL_FIRST__)return;window.__KORUK_EXAM_LOCAL_FIRST__=true;
const stopped=new Set();
let hydrated=false;
window.KorukExamStopState={
 isStopped:id=>stopped.has(String(id||'')),
 mark:id=>{if(id)stopped.add(String(id));window.dispatchEvent(new CustomEvent('koruk:exam-stop-state',{detail:{id:String(id||''),stopped:true}}))},
 clear:id=>{if(id)stopped.delete(String(id));window.dispatchEvent(new CustomEvent('koruk:exam-stop-state',{detail:{id:String(id||''),stopped:false}}))},
 get ready(){return hydrated}
};
function col(){try{return COL.denemeSinavlari}catch(_){return'oy_denemeSinavlari'}}
function key(id){const uid=window.KorukLocalFirst?.uid?.()||window.AKTIF_KULLANICI?.uid||'';return'exam-stop:'+uid+':'+id}
function timeMs(v){if(!v)return 0;try{if(typeof v.toMillis==='function')return v.toMillis();if(typeof v.toDate==='function')return v.toDate().getTime();const n=new Date(v).getTime();return Number.isFinite(n)?n:0}catch(_){return 0}}
async function readStop(id){if(!window.KorukLocalFirst||!id)return null;return window.KorukLocalFirst.get(key(id),null)}
async function writeStop(id,on){if(!window.KorukLocalFirst||!id)return;if(on){const v={aktif:false,at:Date.now()};await window.KorukLocalFirst.set(key(id),v);stopped.add(String(id))}else{await window.KorukLocalFirst.del(key(id));stopped.delete(String(id))}}
async function applyStops(arr){
 const list=Array.isArray(arr)?arr:[];
 await Promise.all(list.map(async d=>{
   if(!d?.id)return;
   const s=await readStop(d.id),remoteActive=!!d.sayacDurumu?.aktif;
   if(s&&s.aktif===false){
     const remoteStart=timeMs(d.sayacDurumu?.baslatmaTarihi),localStop=Number(s.at||0);
     if(remoteActive&&remoteStart>localStop){await writeStop(d.id,false);stopped.delete(String(d.id));return}
     if(remoteActive)d.sayacDurumu={...(d.sayacDurumu||{}),aktif:false,durdurulmaTarihi:d.sayacDurumu?.durdurulmaTarihi||new Date(localStop||Date.now()).toISOString()};
     stopped.add(String(d.id));
   }else if(!remoteActive){stopped.delete(String(d.id))}
 }));
 hydrated=true;return list;
}
async function hydrateCurrent(){try{const arr=window.KorukRuntimeState?.get('denemeSinavlari')||window.denemeSinavlari||[];await applyStops(arr);window.dispatchEvent(new CustomEvent('koruk:exam-stop-state',{detail:{hydrated:true}}));window.dispatchEvent(new CustomEvent('koruk:dashboard-render',{detail:{source:'exam-stop-hydrate'}}))}catch(_){hydrated=true}}
function install(){
 if(!window.KorukLocalFirst||typeof SinavlarService==='undefined'||typeof SinavlarRepository==='undefined')return false;
 if(SinavlarService.__localFirstSayac)return true;
 SinavlarService.__localFirstSayac=true;
 const startOriginal=SinavlarService.denemeSayacBaslat.bind(SinavlarService);
 SinavlarService.denemeSayacDurdur=async function(id,kayit){
   if(!this._sayacYetkiKontrol(kayit))throw new Error('yetkisiz');
   const now=new Date().toISOString();
   try{const arr=window.KorukRuntimeState?.get('denemeSinavlari')||[];const d=arr.find(x=>x.id===id);if(d)d.sayacDurumu={...(d.sayacDurumu||{}),aktif:false,durdurulmaTarihi:now}}catch(_){}
   window.KorukExamStopState.mark(id);
   window.dispatchEvent(new CustomEvent('koruk:deneme-sayac-local',{detail:{id,aktif:false}}));
   await writeStop(id,true);
   const uid=window.KorukLocalFirst.uid();
   await window.KorukLocalFirst.queue(uid,{qid:'exam-stop:'+id,kind:'update-doc',collection:col(),id,data:{sayacDurumu:{...(kayit?.sayacDurumu||{}),aktif:false,durdurulmaTarihi:now}}});
   window.KorukLocalFirst.flush();
   try{if(typeof renderDenemeSinavlari==='function')renderDenemeSinavlari();if(typeof window._sayacOvGuncelle==='function')window._sayacOvGuncelle()}catch(_){}
   return true;
 };
 SinavlarService.denemeSayacBaslat=async function(id,kayit){
   await writeStop(id,false);window.KorukExamStopState.clear(id);
   const r=await startOriginal(id,kayit);
   window.dispatchEvent(new CustomEvent('koruk:deneme-sayac-local',{detail:{id,aktif:true}}));
   return r;
 };
 const listen=SinavlarRepository.denemeSinavlariniDinle.bind(SinavlarRepository);
 SinavlarRepository.denemeSinavlariniDinle=function(cb,err){let seq=0;return listen(async arr=>{const mine=++seq;const safe=await applyStops(arr);if(mine!==seq)return;cb(safe);window.dispatchEvent(new CustomEvent('koruk:data-updated',{detail:{source:'deneme-snapshot'}}))},err)};
 hydrateCurrent();
 return true;
}
let n=0,t=setInterval(()=>{if(install()||++n>120)clearInterval(t)},50);
window.addEventListener('koruk:data-updated',e=>{if(e.detail?.source==='deneme-snapshot')return;hydrateCurrent()});
})();