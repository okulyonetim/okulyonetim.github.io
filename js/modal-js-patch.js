/* Koruk Asistan — modal JS patch v1
   =========================================================
   Bu dosyayı index.html'de, app.js ve ogretmen-detay.js'den
   SONRA <script src="js/modal-js-patch.js"></script> olarak ekle.

   SORUN 1 — detayPanelKapat() _pullToRefreshAyarla(true) çağırmıyor
   ogretmen-detay.js'deki mevcut detayPanelKapat sadece overlay'i kapatıyor.
   _pullToRefreshDerinlik sayacı dengesiz kalıyor → pull-to-refresh kalıcı
   olarak kilitli kalıyor, uygulama "donmuş" gibi görünüyor.

   SORUN 2 — mesajlasma.js mesajKonusmaAc() içinde body.classList.add('modal-open')
   çağırıyor ama _pullToRefreshAyarla(false) çağırmıyor.
   mesajKonusmaAc → detayPanelKapat → sayaç 0'a düşmüyor → kilitli.

   SORUN 3 — detayPanelKapat() _menuyeGeriDon() çağırmıyor.
   ========================================================= */

(function(){
  /* ── detayPanelKapat'ı yaması ── */
  const _orijinalDetayPanelKapat = window.detayPanelKapat;
  window.detayPanelKapat = function(){
    if(typeof _orijinalDetayPanelKapat === 'function') _orijinalDetayPanelKapat();
    // _pullToRefreshAyarla eksikse manuel dengele
    if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
    // Menü geri dönüşü
    if(typeof _menuyeGeriDon === 'function') _menuyeGeriDon();
  };

  /* ── mesajKonusmaAc'ı yaması: pull-to-refresh'i kapat ── */
  const _orijinalMesajKonusmaAc = window.mesajKonusmaAc;
  if(typeof _orijinalMesajKonusmaAc === 'function'){
    window.mesajKonusmaAc = function(konusmaId){
      _orijinalMesajKonusmaAc(konusmaId);
      if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);
    };
  }

  /* ── Güvenlik ağı: body.modal-open kaldırıldığında touch-action'ı temizle ── */
  (function(){
    const govde = document.body;
    new MutationObserver(function(){
      if(!govde.classList.contains('modal-open')){
        // position:fixed kaldırıldıktan sonra touch-action kalıntısını temizle
        if(govde.style.touchAction === 'none'){
          govde.style.touchAction = '';
        }
      }
    }).observe(govde, { attributes: true, attributeFilter: ['class', 'style'] });
  })();
})();
