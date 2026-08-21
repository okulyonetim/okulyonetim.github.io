/* Koruk Asistan — legacy modal patch devre dışı
   Global modal davranışı artık js/modal-interaction-fix.js tarafından
   tek noktadan yönetilir. Bu dosya index.html'de eski yükleme sırası
   nedeniyle tutuluyor; çift wrapper / pull-to-refresh sayaç çakışmasını
   önlemek için bilinçli olarak no-op bırakılmıştır. */
(function(){
  'use strict';
  window.__LEGACY_MODAL_PATCH_DISABLED__ = true;
})();
