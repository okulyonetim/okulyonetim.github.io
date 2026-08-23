/* Koruk Asistan - Deneme sayaci local-first v1 */
(function(){
'use strict';
if(window.__KORUK_EXAM_LOCAL_FIRST__)return;window.__KORUK_EXAM_LOCAL_FIRST__=true;
function col(){try{return COL.denemeSinavlari}catch(_){return 'oy_denemeSinavlari'}}
function install(){
 if(!window.KorukLocalFirst||typeof SinavlarService==='undefined')return false;
 if(SinavlarService.__localFirstSayac)return true;
 SinavlarService.__localFirstSayac=true;
 const original=SinavlarService.denemeSayacDurdur.bind(SinavlarService);
 SinavlarService.denemeSayacDurdur=async function(id,kayit){
   if(!this._sayacYetkiKontrol(kayit))throw new Error('yetkisiz');
   const now=new Date().toISOString();
   try{
     const d=(typeof denemeSinavlari!=='undefined'?denemeSinavlari:[]).find(x=>x.id===id);
     if(d){d.sayacDurumu={...(d.sayacDurumu||{}),aktif:false,durdurulmaTarihi:now};}
     if(typeof renderDenemeSinavlari==='function')renderDenemeSinavlari();
     if(typeof window._sayacOvGuncelle==='function')window._sayacOvGuncelle();
     window.dispatchEvent(new CustomEvent('koruk:deneme-sayac-local',{detail:{id,aktif:false}}));
   }catch(_){}
   const uid=KorukLocalFirst.uid();
   await KorukLocalFirst.set('exam-stop:'+uid+':'+id,{aktif:false,at:Date.now()});
   await KorukLocalFirst.queue(uid,{kind:'update-doc',collection:col(),id:id,data:{sayacDurumu:{...(kayit?.sayacDurumu||{}),aktif:false,durdurulmaTarihi:now}}});
   KorukLocalFirst.flush();
   return true;
 };
 const listen=SinavlarRepository.denemeSinavlariniDinle.bind(SinavlarRepository);
 SinavlarRepository.denemeSinavlariniDinle=function(cb,err){
   return listen(async arr=>{
     const uid=KorukLocalFirst.uid();
     for(const d of arr||[]){const s=await KorukLocalFirst.get('exam-stop:'+uid+':'+d.id,null);if(s&&s.aktif===false&&d.sayacDurumu?.aktif){d.sayacDurumu={...(d.sayacDurumu||{}),aktif:false,durdurulmaTarihi:new Date(s.at).toISOString()};}}
     cb(arr);
   },err);
 };
 return true;
}
let n=0,t=setInterval(()=>{if(install()||++n>100)clearInterval(t)},100);
})();