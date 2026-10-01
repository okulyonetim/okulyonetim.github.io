/* Koruk Asistan — Rubric Settings compatibility loader
 * Canonical implementation: rubric-settings-core.js
 * Belirli Gün ve Haftalar katalogu mevcut çizelge formunun doğrudan veri kaynağıdır.
 * Ayrı bridge/patch dosyası kullanılmaz.
 */
(function(global){
'use strict';
let started=false;
const wait=(fn,tries=120)=>new Promise((resolve,reject)=>{let n=0;const tick=()=>{try{if(fn())return resolve(true)}catch(e){if(n>=tries)return reject(e)}if(++n>=tries)return reject(new Error('AppLoader hazır değil.'));setTimeout(tick,100)};tick()});
async function boot(){
  if(started)return;
  started=true;
  try{
    await wait(()=>typeof global.AppLoader?.loadScript==='function');
    const load=global.AppLoader.loadScript;
    await load('js/modules/rubric-settings-core.js?v=1066');
    await load('js/modules/belirli-gunler-catalog.js?v=4');
    const catalog=global.BelirliGunlerCatalog;
    if(catalog?.install)catalog.install();
    global.dispatchEvent?.(new CustomEvent('koruk:belirli-gunler-catalog-ready'));
    // Menüden açılan "Yeni Etkinlik" düğümü legacy forma düşerse doğrudan katalog ekranını aç.
    if(!document.__korukBelirliGunlerClickGuard){
      document.__korukBelirliGunlerClickGuard=true;
      document.addEventListener('click',e=>{
        const btn=e.target?.closest?.('[data-cizelge-add]');
        if(!btn)return;
        const page=document.querySelector('[data-cizelge-route-label]')?.textContent||document.title||'';
        const text=(btn.textContent||'').toLocaleLowerCase('tr');
        const route=page.toLocaleLowerCase('tr');
        if(text.includes('yeni etkinlik')&&(route.includes('belirli')||document.querySelector('#toolsContent'))){
          e.preventDefault();e.stopImmediatePropagation();
          global.BelirliGunlerCatalog?.open?.();
        }
      },true);
    }
  }catch(e){
    started=false;
    console.warn('[RubricSettings compatibility load]',e?.message||e);
  }
}
boot();
})(window);
