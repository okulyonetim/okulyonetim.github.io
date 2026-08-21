/* Koruk Asistan — alt navigasyon kart ayar düğmesi etkileşim düzeltmesi */
(function(){
'use strict';
if(window.__ALT_NAV_SETTINGS_FIX__) return;
window.__ALT_NAV_SETTINGS_FIX__=true;

/* Kartın sağ üstündeki ayar düğmesi mevcut çekirdekte gerçek
   _menuKartDuzenle() fonksiyonuna bağlıdır. Ancak menü katmanı açık
   kalırken modal açıldığında navigasyon yüzeyi modalın üzerinde kalıp
   düğmeyi fiilen etkisiz gösteriyordu. Capture aşamasında yalnızca menü
   yüzeyini kapatıyoruz; çekirdeğin kendi click handler'ı hemen ardından
   mevcut düzenleme modalını açmaya devam ediyor. Veri/kaydetme mantığına
   müdahale edilmez. */
document.addEventListener('click',function(e){
  const btn=e.target && e.target.closest ? e.target.closest('.an-kart-duzenle-btn') : null;
  if(!btn) return;
  try{
    if(window.AltNav && typeof window.AltNav.kapat==='function') window.AltNav.kapat();
  }catch(_){}
},true);
})();
