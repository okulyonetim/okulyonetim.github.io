/* Koruk Asistan v2
   Optik okuyucu uygulamadan kaldırıldı.
   Bu geçici uyumluluk katmanı, index.html ve eski navigasyon kodundaki
   kalan çağrılar temizlenene kadar hata oluşmasını engeller. */
(function(){
  'use strict';

  function gizle(){
    const seciciler = [
      '[data-tab="optik"]',
      '[data-action="optik"]',
      '[onclick*="OptikSistemi"]',
      '[href*="optik/"]',
      '#optikAyarlarKart',
      '#optikPuanReferansKart'
    ];
    seciciler.forEach(function(s){
      document.querySelectorAll(s).forEach(function(el){ el.remove(); });
    });
  }

  window.OptikSistemi = {
    ac: function(){ return false; },
    kapat: function(){ return false; },
    acikMi: function(){ return false; }
  };
  window.OptikVeriKaynagi = null;

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gizle, { once:true });
  else gizle();
  new MutationObserver(gizle).observe(document.documentElement, { childList:true, subtree:true });
})();
