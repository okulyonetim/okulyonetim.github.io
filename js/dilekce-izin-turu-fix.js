/* Dilekçe izin türü seçim düzeltmesi.
   Kayıtlı/elle düzenlenmiş şablon aktifken dilekce.js, form değişikliğini
   serbest düzenleme korumasına sokuyor. Mobil native select'te bu durum
   seçimin Yıllık İzin'e geri dönmesine yol açabiliyor.
   İzin türü değişmeden hemen önce mevcut "şablona sıfırla" akışını
   çalıştırıyoruz; böylece dilekce.js'in kendi state ve çıktı üretim mantığı
   değişmeden yeni izin türünü kabul ediyor. */
(function(){
  'use strict';

  document.addEventListener('change', function(e){
    const select = e.target;
    if(!select || select.id !== 'dlk_izinTuru') return;

    const panel = select.closest('#dlkFormPanel');
    if(!panel) return;

    const secilen = select.value;
    const sifirla = panel.querySelector('#dlk_govdeSifirla');
    if(sifirla && typeof sifirla.onclick === 'function'){
      // Target onchange çalışmadan önce dilekce.js içindeki
      // tamIcerikManuel/govdeManuel durumunu temizler.
      sifirla.onclick();
      // Sıfırlama iframe'i yeniler fakat form select'ini yeniden çizmez.
      // Android native select değerini garanti altına al.
      select.value = secilen;
    }
  }, true);
})();
