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
function installBelirliGunlerDateSort(){
 const parity=global.ClassicCizelgelerParity;
 if(!parity||parity.__belirliGunlerDateSortInstalled)return false;
 const parse=v=>{const s=String(v||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return NaN;const t=new Date(`${s}T00:00:00`).getTime();return Number.isFinite(t)?t:NaN};
 const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d.getTime()};
 const compare=(a,b)=>{const now=today(),da=parse(a?.tarihBaslangic),db=parse(b?.tarihBaslangic),va=Number.isFinite(da),vb=Number.isFinite(db);if(!va&&!vb)return 0;if(!va)return 1;if(!vb)return-1;const fa=da>=now,fb=db>=now;if(fa!==fb)return fa?-1:1;return fa?da-db:db-da};
 const reorderDom=()=>{if(parity.currentType!=='belirliGunler')return;const list=document.querySelector('.ka-cizelge-event-list');if(!list)return;const cards=[...list.querySelectorAll('.ka-cizelge-event-card')];const dateOf=card=>{const m=String(card.querySelector('.ka-cizelge-date-range strong')?.textContent||'').match(/(\d{2})\.(\d{2})\.(\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:''};cards.sort((a,b)=>compare({tarihBaslangic:dateOf(a)},{tarihBaslangic:dateOf(b)}));cards.forEach(card=>list.appendChild(card));};
 const originalRender=parity.render;
 parity.render=function(force=false){const result=originalRender.call(parity,force);if(parity.currentType==='belirliGunler')requestAnimationFrame(reorderDom);return result};
 const originalPrint=parity.printReport;
 parity.printReport=async function(type){if(type!=='belirliGunler')return originalPrint.call(parity,type);const rows=global.AppStore?.data?.('belirliGunler');if(!Array.isArray(rows))return originalPrint.call(parity,type);const original=rows.slice();try{rows.sort(compare);return await originalPrint.call(parity,type)}finally{rows.splice(0,rows.length,...original)}};
 parity.__belirliGunlerDateSortInstalled=true;
 try{if(parity.currentType==='belirliGunler')reorderDom()}catch(_){ }
 return true;
}
(async()=>{try{await wait(()=>typeof global.AppLoader?.loadScript==='function');const load=global.AppLoader.loadScript;await load('js/modules/rubric-settings-core.js?v=1067');await load('js/modules/belirli-gunler-catalog.js?v=5');await load('js/modules/social-club-report.js?v=1');installEntryGuard();global.BelirliGunlerCatalog?.install?.();let tries=0;const timer=setInterval(()=>{if(installBelirliGunlerDateSort()||++tries>120)clearInterval(timer)},100);global.dispatchEvent?.(new CustomEvent('koruk:belirli-gunler-catalog-ready'))}catch(e){console.warn('[RubricSettings compatibility load]',e?.message||e)}})();
})(window);