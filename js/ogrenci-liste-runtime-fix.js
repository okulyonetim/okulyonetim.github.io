/* Koruk Asistan — Öğrenci Liste Oluşturucu runtime fix v1
 * Sınıf seçildiğinde Firestore şablonunu beklemeden rosterı anında açar.
 */
(function(){
'use strict';
function kur(){
 if(typeof window.olSinifSecildi!=='function'||window.olSinifSecildi.__localFirstFix)return;
 const fn=async function(sinifAdi){
  try{
   _olSeciliSinif=sinifAdi;
   _olAcikCizelgeId=null;
   _olSutunGenislikleri={};
   _olSutunHizalama={};
   const alan=document.getElementById('olCalismaAlani');
   if(!alan)return;
   if(!sinifAdi){alan.innerHTML='';return}

   // Roster bellekte mevcut; Firestore'u beklemeden çalışma alanını aç.
   _olSatirlar=olSatirlariRosterdenOlustur();
   await olCalismaAlaniOlustur(null,'');

   if(!_olSatirlar.length){
    const uyari=document.createElement('div');
    uyari.className='ol-modern-empty';
    uyari.innerHTML='<b>Bu sınıfta öğrenci bulunamadı</b><span>Sınıf ve öğrenci eşleşmelerini kontrol edin.</span>';
    alan.prepend(uyari);
   }

   // Kayıtlı sütun şablonu varsa sonradan getir ve yalnız hâlâ aynı sınıf açıksa uygula.
   try{
    const secilen=sinifAdi;
    const snap=await db.collection('oy_ogretmenListeSablon').doc(olSablonId(sinifAdi)).get();
    if(_olSeciliSinif!==secilen)return;
    if(snap.exists){
      _olSatirlar=olSatirlariRosterdenOlustur();
      await olCalismaAlaniOlustur(snap.data(),'');
    }
   }catch(e){
    console.warn('[ogrenci-liste] şablon yüklenemedi, yerel roster kullanılmaya devam ediyor',e);
   }
  }catch(e){
   console.error('[ogrenci-liste] sınıf açma hatası',e);
   const alan=document.getElementById('olCalismaAlani');
   if(alan)alan.innerHTML='<div class="ol-modern-empty"><b>Liste açılamadı</b><span>Öğrenci verileri hazırlanırken bir hata oluştu.</span></div>';
   if(typeof toast==='function')toast('Öğrenci listesi açılamadı.');
  }
 };
 fn.__localFirstFix=true;
 window.olSinifSecildi=fn;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',kur,{once:true});else kur();
setTimeout(kur,500);setTimeout(kur,1500);
})();
