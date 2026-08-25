/* Geçici uyumluluk köprüsü.
   Eski index.html halen bu yolu çağırıyor. Yeni giriş kabuğu doğrudan core.js yükler. */
(function(){
'use strict';
if(window.KorukCore)return;
if(document.querySelector('script[data-koruk-unified-core]'))return;
const s=document.createElement('script');
s.src='js/core/core.js';
s.async=false;
s.dataset.korukUnifiedCore='1';
s.onerror=()=>console.error('[KorukCore] core.js yüklenemedi');
document.head.appendChild(s);
})();
