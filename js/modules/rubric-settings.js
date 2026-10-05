/* Koruk Asistan — Rubric Settings compatibility loader. */
(function(global){
'use strict';
if(global.__KorukRubricSettingsLoader)return;
global.__KorukRubricSettingsLoader=true;
const wait=(fn,tries=120)=>new Promise((resolve,reject)=>{let n=0;(function tick(){try{if(fn())return resolve(true)}catch(e){if(n>=tries)return reject(e)}if(++n>=tries)return reject(new Error('AppLoader hazır değil.'));setTimeout(tick,100)})()});
async function openBelirliGunlerCatalog(){
 if(global.BelirliGunlerCatalog?.open){global.BelirliGunlerCatalog.open();return true}
 if(global.AppLoader?.loadScript){try{await global.AppLoader.loadScript('js/modules/belirli-gunler-catalog.js?v=5')}catch(e){console.warn('[BelirliGunlerCatalog]',e?.message||e)}}
 return !!global.BelirliGunlerCatalog?.open?.();
}
function installEntryGuard(){
 if(document.__korukBelirliGunlerEntryGuard)return;document.__korukBelirliGunlerEntryGuard=true;
 document.addEventListener('click',e=>{const btn=e.target?.closest?.('[data-cizelge-add]');if(!btn)return;const text=(btn.textContent||'').toLocaleLowerCase('tr'),route=(document.querySelector('[data-cizelge-route-label]')?.textContent||document.title||'').toLocaleLowerCase('tr'),tools=document.querySelector('#toolsContent');if(!text.includes('yeni etkinlik')||(!route.includes('belirli')&&!tools))return;e.preventDefault();e.stopImmediatePropagation();openBelirliGunlerCatalog()},true);
}
(async()=>{try{await wait(()=>typeof global.AppLoader?.loadScript==='function');const load=global.AppLoader.loadScript;await load('js/modules/rubric-settings-core.js?v=1067');await load('js/modules/belirli-gunler-catalog.js?v=5');await load('js/modules/social-club-report.js?v=1');installEntryGuard();global.BelirliGunlerCatalog?.install?.();global.dispatchEvent?.(new CustomEvent('koruk:belirli-gunler-catalog-ready'))}catch(e){console.warn('[RubricSettings compatibility load]',e?.message||e)}})();
})(window);