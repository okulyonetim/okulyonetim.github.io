/* Koruk Asistan — akordeon navigasyon tam ekran + scroll düzeltmesi v4 */
(function(){
'use strict';
function cssKur(){
  if(document.getElementById('an-scroll-fix-v4')) return;
  const s=document.createElement('style');
  s.id='an-scroll-fix-v4';
  s.textContent=`
    /* Mobilde açılan navigasyon katmanları alt navigasyonun ÜSTÜNDE biter.
       Alt navigasyon her zaman görünür ve tıklanabilir kalır. */
    .an-grid-katman,
    .an-liste-katman,
    .an-profil-katman{
      position:fixed !important;
      top:0 !important;
      right:0 !important;
      bottom:calc(72px + env(safe-area-inset-bottom, 0px)) !important;
      left:0 !important;
      inset:auto !important;
      width:100vw !important;
      height:auto !important;
      max-width:none !important;
      max-height:none !important;
      border-radius:0 !important;
      z-index:9600 !important; /* bottom-nav 9700'ün altında */
      min-height:0 !important;
    }
    .an-liste-katman{
      display:flex !important;
      flex-direction:column !important;
      overflow:hidden !important;
    }
    .an-liste-katman .an-liste-baslik,
    .an-liste-katman .an-liste-head{
      flex:0 0 auto !important;
      position:relative !important;
      z-index:2 !important;
    }
    #anListeGovde,.an-liste-govde{
      flex:1 1 0 !important;
      min-height:0 !important;
      height:0 !important;
      max-height:none !important;
      overflow-y:scroll !important;
      overflow-x:hidden !important;
      -webkit-overflow-scrolling:touch !important;
      overscroll-behavior-y:contain !important;
      touch-action:pan-y !important;
      scrollbar-gutter:stable;
      padding-bottom:24px !important;
    }
    /* Menü açıkken de ana alt navigasyon görünür/tıklanabilir kalmalı. */
    body.an-tam-ekran-nav-acik .bottom-nav,
    .bottom-nav{
      visibility:visible !important;
      opacity:1 !important;
      pointer-events:auto !important;
      z-index:9700 !important;
    }
    @media (min-width:1024px){
      .an-grid-katman,
      .an-liste-katman,
      .an-profil-katman{
        width:min(960px,calc(100vw - var(--sidebar-w) - 80px)) !important;
        height:min(78vh,780px) !important;
        max-width:960px !important;
        max-height:min(78vh,780px) !important;
        inset:auto auto 28px 50% !important;
        transform:translateX(-50%) !important;
        border-radius:24px !important;
        z-index:9800 !important;
      }
      .an-grid-katman:not(.acik){ transform:translate(-50%,100vh) !important; }
      .an-liste-katman:not(.acik){ transform:translateX(calc(-50% + 100vw)) !important; }
      .an-profil-katman:not(.acik){ transform:translateX(calc(-50% - 100vw)) !important; }
      body.an-tam-ekran-nav-acik .bottom-nav{ visibility:visible !important; opacity:1 !important; pointer-events:auto !important; }
    }
  `;
  document.head.appendChild(s);
}
function durumGuncelle(){
  cssKur();
  const katmanlar=[...document.querySelectorAll('.an-grid-katman,.an-liste-katman,.an-profil-katman')];
  const acik=katmanlar.some(k=>k.classList.contains('acik'));
  document.body.classList.toggle('an-tam-ekran-nav-acik',acik && window.innerWidth<1024);
}
function uygula(){
  cssKur();
  const gov=document.getElementById('anListeGovde')||document.querySelector('.an-liste-govde');
  if(gov){
    gov.style.flex='1 1 0';
    gov.style.minHeight='0';
    gov.style.height='0';
    gov.style.maxHeight='none';
    gov.style.overflowY='scroll';
    gov.style.overflowX='hidden';
    gov.style.webkitOverflowScrolling='touch';
    gov.style.overscrollBehaviorY='contain';
    gov.style.touchAction='pan-y';
  }
  durumGuncelle();
  return !!gov;
}
function acilanBasligiGoster(e){
  const b=e.target&&e.target.closest?e.target.closest('.an-akordeon-baslik'):null;
  if(!b)return;
  setTimeout(()=>{
    uygula();
    const gov=document.getElementById('anListeGovde')||document.querySelector('.an-liste-govde');
    if(!gov||b.getAttribute('aria-expanded')!=='true')return;
    const panel=b.nextElementSibling;
    const hedef=panel&&panel.getBoundingClientRect().height?panel:b;
    const hr=hedef.getBoundingClientRect(),gr=gov.getBoundingClientRect();
    if(hr.bottom>gr.bottom-12) gov.scrollBy({top:hr.bottom-gr.bottom+40,behavior:'smooth'});
    else if(b.getBoundingClientRect().top<gr.top+8) gov.scrollBy({top:b.getBoundingClientRect().top-gr.top-12,behavior:'smooth'});
  },160);
}
let deneme=0;const t=setInterval(()=>{if(uygula()||++deneme>120)clearInterval(t);},100);
document.addEventListener('DOMContentLoaded',()=>setTimeout(uygula,0));
document.addEventListener('click',acilanBasligiGoster,true);
window.addEventListener('resize',uygula,{passive:true});
new MutationObserver(()=>uygula()).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
