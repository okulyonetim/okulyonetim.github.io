/* Koruk Asistan — geçici uyumluluk köprüsü.
 * Taşıma raporlarının gerçek sahibi artık js/modules/transport.js dosyasıdır.
 * AppLoader'daki eski yol temizlenene kadar bu dosya bilinçli olarak no-op tutulur.
 */
(function(global){
  'use strict';
  if(!global.TransportReports){
    console.debug?.('[Koruk] TransportReports transport.js tarafından sağlanacak.');
  }
})(window);
