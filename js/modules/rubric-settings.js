/* Koruk Asistan — Rubric Settings compatibility loader
 * Canonical implementation: rubric-settings-core.js
 * Belirli Gün ve Haftalar katalogu mevcut çizelge formunun doğrudan veri kaynağıdır.
 * Ayrı bridge/patch dosyası kullanılmaz.
 */
(function(global){
'use strict';
let started=false;
const wait=(fn,tries=120)=>new Promise((resolve,reject)=>{let n=0;const tick=()=>{try{if(fn())return resolve(true)}catch(e){if(n>=tries)return reject(e)}if(++n>=tries)return reject(new Error('AppLoader hazır değil.'));setTimeout(tick,100)};tick()});
async function openBelirliGunlerCatalog(){
  if(global.BelirliGunlerCatalog?.open){global.BelirliGunlerCatalog.open();return true}
  if(typeof global.AppLoader?.loadScript==='function'){
    try{await global.AppLoader.loadScript('js/modules/belirli-gunler-catalog.js?v=5')}catch(e){console.warn('[BelirliGunlerCatalog load]',e?.message||e)}
  }
  return !!global.BelirliGunlerCatalog?.open?.();
}
function installEntryGuard(){
  if(document.__korukBelirliGunlerEntryGuard)return;
  document.__korukBelirliGunlerEntryGuard=true;
  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('[data-cizelge-add]');
    if(!btn)return;
    const text=(btn.textContent||'').toLocaleLowerCase('tr');
    const route=(document.querySelector('[data-cizelge-route-label]')?.textContent||document.title||'').toLocaleLowerCase('tr');
    const tools=document.querySelector('#toolsContent');
    if(!text.includes('yeni etkinlik')||(!route.includes('belirli')&&!tools))return;
    e.preventDefault();e.stopImmediatePropagation();
    openBelirliGunlerCatalog();
  },true);
}
async function boot(){
  if(started)return;
  started=true;
  try{
    await wait(()=>typeof global.AppLoader?.loadScript==='function');
    const load=global.AppLoader.loadScript;
    await load('js/modules/rubric-settings-core.js?v=1067');
    await load('js/modules/belirli-gunler-catalog.js?v=5');
    installEntryGuard();
    const catalog=global.BelirliGunlerCatalog;
    if(catalog?.install)catalog.install();
    global.dispatchEvent?.(new CustomEvent('koruk:belirli-gunler-catalog-ready'));
  }catch(e){
    started=false;
    console.warn('[RubricSettings compatibility load]',e?.message||e);
  }
}
boot();
})(window);
