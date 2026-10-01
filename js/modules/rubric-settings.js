/* Koruk Asistan — Rubric Settings compatibility loader
 * Canonical implementation: rubric-settings-core.js
 * Belirli Gün ve Haftalar katalogu mevcut çizelge formunun doğrudan veri kaynağıdır.
 * Ayrı bridge/patch dosyası kullanılmaz.
 */
(function(global){
'use strict';
const load=global.AppLoader?.loadScript;
if(typeof load!=='function')return;
Promise.resolve(load('js/modules/rubric-settings-core.js?v=1065'))
  .then(()=>load('js/modules/belirli-gunler-catalog.js?v=3'))
  .then(()=>{
    const catalog=global.BelirliGunlerCatalog;
    if(catalog?.install) catalog.install();
    global.dispatchEvent?.(new CustomEvent('koruk:belirli-gunler-catalog-ready'));
  })
  .catch(e=>console.warn('[RubricSettings compatibility load]',e?.message||e));
})(window);
