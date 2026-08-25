/* Koruk Asistan — Leaflet harita kütüphanesi lazy loader
 * Yalnız üçüncü taraf Leaflet assetlerini yükler.
 * Uygulama görünümü css/design-system.css tarafından yönetilir. */
(function(){
'use strict';
const JS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const CSS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
let hazirPromise=null;

function cssYukle(){
  if([...document.styleSheets].some(s=>String(s.href||'').includes('leaflet@1.9.4/dist/leaflet.css')))return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const mevcut=[...document.querySelectorAll('link[rel="stylesheet"]')].find(x=>x.href===CSS||String(x.href||'').includes('leaflet@1.9.4/dist/leaflet.css'));
    if(mevcut){if(mevcut.sheet)return resolve();mevcut.addEventListener('load',resolve,{once:true});mevcut.addEventListener('error',()=>reject(new Error('Harita stili yüklenemedi.')),{once:true});return;}
    const l=document.createElement('link');l.rel='stylesheet';l.href=CSS;l.dataset.korukExternal='leaflet';l.onload=resolve;l.onerror=()=>reject(new Error('Harita stili yüklenemedi.'));document.head.appendChild(l);
  });
}
function jsYukle(){
  if(typeof window.L!=='undefined')return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const mevcut=[...document.scripts].find(s=>s.src===JS||String(s.src||'').includes('leaflet@1.9.4/dist/leaflet.js'));
    if(mevcut){mevcut.addEventListener('load',resolve,{once:true});mevcut.addEventListener('error',()=>reject(new Error('Harita kütüphanesi yüklenemedi.')),{once:true});return;}
    const s=document.createElement('script');s.src=JS;s.async=true;s.dataset.korukExternal='leaflet';s.onload=resolve;s.onerror=()=>reject(new Error('Harita kütüphanesi yüklenemedi.'));document.head.appendChild(s);
  });
}
function hazir(){
  if(typeof window.L!=='undefined')return cssYukle();
  if(hazirPromise)return hazirPromise;
  hazirPromise=Promise.all([cssYukle(),jsYukle()]).then(()=>true).catch(e=>{hazirPromise=null;throw e});
  return hazirPromise;
}
window.MapLibs={hazir};
})();
