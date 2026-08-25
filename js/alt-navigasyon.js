/* Koruk Asistan — Navigasyon bootstrap v2
   Yalnız gerçek navigasyon davranışını başlatır.
   Tasarım, local-first, rapor, sınav veya modernizer dosyaları BURADAN yüklenmez. */
(function(){
'use strict';
if(window.__KORUK_NAV_BOOTSTRAP_V2__)return;
window.__KORUK_NAV_BOOTSTRAP_V2__=true;

function load(src,key){
  if(document.querySelector('script[data-'+key+']')||[...document.scripts].some(s=>(s.getAttribute('src')||'').split('?')[0]===src.split('?')[0]))return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src=src;s.async=false;s.setAttribute('data-'+key,'1');
    s.onload=resolve;s.onerror=()=>reject(new Error('navigation-load:'+src));document.head.appendChild(s);
  });
}
function bindActive(){
  const nav=document.getElementById('bottomNav');
  if(!nav||nav.dataset.activeStateBound==='1')return;
  nav.dataset.activeStateBound='1';
  function activate(item){
    nav.querySelectorAll('.bn-item').forEach(btn=>{btn.classList.remove('active');btn.removeAttribute('aria-current')});
    if(item){item.classList.add('active');item.setAttribute('aria-current','page')}
  }
  nav.addEventListener('click',e=>{const item=e.target.closest('.bn-item');if(item&&nav.contains(item))activate(item)},true);
  window.KorukAltNavAktifYap=target=>{const item=typeof target==='string'?nav.querySelector(target):target;if(item?.classList?.contains('bn-item'))activate(item)};
}
function dashboardBridge(){
  const panel=document.getElementById('tab-panel');
  if(!panel||panel.dataset.korukRenderBridge==='1')return;
  panel.dataset.korukRenderBridge='1';let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;window.dispatchEvent(new CustomEvent('koruk:dashboard-render'))})}).observe(panel,{childList:true});
}
async function start(){
  try{await load('js/alt-navigasyon-core.js','alt-nav-core')}catch(e){console.error('[Navigation]',e)}
  bindActive();dashboardBridge();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
