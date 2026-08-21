/* Koruk Asistan — eski dashboard özelleştirme uyumluluk köprüsü
 * Eski kart kataloğu ve DOM taşıma motoru kaldırıldı.
 * Dosya adı yalnız index.html ve app.js geriye dönük çağrıları için korunur.
 * Yeni mobil ana sayfanın DOM'una müdahale etmez.
 */
(function(){
'use strict';
window.dashboardOzellestirmeUygula=function(){ return false; };
window.dashboardAltTercihUygula=function(){ return false; };
window.dashboardOzellestirModalAc=function(){
  if(typeof toast==='function') toast('Yeni ana sayfa düzenleyicisi temiz sürümde yeniden hazırlanıyor.');
};
window.dashboardAltDuzenModalAc=function(){
  if(typeof toast==='function') toast('Bu eski dashboard düzenleyicisi artık kullanılmıyor.');
};
})();
