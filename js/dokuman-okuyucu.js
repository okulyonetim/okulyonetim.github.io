/* Koruk Asistan — Documents V2 document viewer compatibility proxy.
 * Gerçek motor: js/modules/document-viewer.js
 * Bu root köprü yalnız eski lazy-load yolunu geçici olarak korur.
 */
(function(global){
'use strict';
const SRC='js/modules/document-viewer.js';
const DESTEK=new Set(['pdf','doc','docx','xls','xlsx','csv','txt','png','jpg','jpeg','webp','gif','bmp','svg','ppt','pptx','rtf','odt','ods']);
const ext=s=>{try{const n=decodeURIComponent(String(s||'').split('?')[0].split('#')[0].split('/').pop()||''),i=n.lastIndexOf('.');return i<0?'':n.slice(i+1).toLowerCase();}catch(_){return'';}};
let loadPromise=null;
function engineReady(proxy){return !!(global.DokumanOkuyucu&&global.DokumanOkuyucu!==proxy&&!global.DokumanOkuyucu.__moduleProxy);}
function loadEngine(proxy){
  if(engineReady(proxy))return Promise.resolve(global.DokumanOkuyucu);
  if(loadPromise)return loadPromise;
  loadPromise=new Promise((resolve,reject)=>{
    const done=()=>engineReady(proxy)?resolve(global.DokumanOkuyucu):reject(new Error('Belge görüntüleyici modülü hazır değil.'));
    const old=[...document.scripts].find(s=>String(s.getAttribute('src')||'').split('?')[0].endsWith(SRC));
    if(old){old.addEventListener('load',done,{once:true});old.addEventListener('error',()=>reject(new Error('Belge görüntüleyici modülü yüklenemedi.')),{once:true});return;}
    const s=document.createElement('script');s.src=SRC;s.async=true;s.dataset.korukCapability='document-viewer-engine';s.onload=done;s.onerror=()=>reject(new Error('Belge görüntüleyici modülü yüklenemedi.'));document.head.appendChild(s);
  }).catch(e=>{loadPromise=null;throw e;});
  return loadPromise;
}
const proxy={
  __moduleProxy:true,
  destekliMi:value=>DESTEK.has(ext(value)),
  ac(...args){return loadEngine(proxy).then(api=>api.ac(...args));},
  kapat(){return loadEngine(proxy).then(api=>api.kapat?.());}
};
global.DokumanOkuyucu=proxy;
loadEngine(proxy).catch(e=>console.warn('[Documents/viewer-proxy]',e?.message||e));
})(window);
