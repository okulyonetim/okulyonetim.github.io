/* Koruk Asistan — Deneme sayacı local-first uyumluluk köprüsü
 * Asıl uygulama js/deneme-sayac-local-first-v2.js tarafından yönetilir.
 * Eski dinamik loader bu dosyayı çağırmaya devam edebildiği için çift wrapper
 * oluşmasını engeller.
 */
(function(){
'use strict';
if(window.__KORUK_EXAM_LOCAL_FIRST_V2__)return;
if(document.querySelector('script[data-koruk-exam-local-v2]'))return;
var s=document.createElement('script');
s.src='js/deneme-sayac-local-first-v2.js?v=2';
s.async=false;
s.setAttribute('data-koruk-exam-local-v2','1');
document.head.appendChild(s);
})();