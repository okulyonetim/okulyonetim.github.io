/* Koruk Asistan — akordeon navigasyon dikey kaydırma düzeltmesi v2 */
(function(){
'use strict';
function cssKur(){
  if(document.getElementById('an-scroll-fix-v2')) return;
  const s=document.createElement('style');
  s.id='an-scroll-fix-v2';
  s.textContent=`
    .an-liste-katman{
      display:flex !important;
      flex-direction:column !important;
      overflow:hidden !important;
      min-height:0 !important;
      max-height:none !important;
      height:calc(100dvh - 86px) !important;
    }
    .an-liste-katman .an-liste-baslik,
    .an-liste-katman .an-liste-head{
      flex:0 0 auto !important;
    }
    #anListeGovde,.an-liste-govde{
      flex:1 1 auto !important;
      min-height:0 !important;
      height:auto !important;
      max-height:none !important;
      overflow-y:auto !important;
      overflow-x:hidden !important;
      -webkit-overflow-scrolling:touch !important;
      overscroll-behavior-y:contain !important;
      touch-action:pan-y !important;
      scrollbar-gutter:stable;
      padding-bottom:max(28px,env(safe-area-inset-bottom)) !important;
    }
    @media (min-width:1024px){
      .an-liste-katman{
        height:min(78vh,780px) !important;
        max-height:min(78vh,780px) !important;
      }
    }
  `;
  document.head.appendChild(s);
}
function uygula(){
  cssKur();
  const gov=document.getElementById('anListeGovde')||document.querySelector('.an-liste-govde');
  if(!gov)return false;
  const kat=gov.closest('.an-liste-katman')||gov.parentElement;
  if(kat){
    kat.style.display='flex';
    kat.style.flexDirection='column';
    kat.style.minHeight='0';
    kat.style.overflow='hidden';
  }
  gov.style.flex='1 1 auto';
  gov.style.minHeight='0';
  gov.style.height='auto';
  gov.style.maxHeight='none';
  gov.style.overflowY='auto';
  gov.style.overflowX='hidden';
  gov.style.webkitOverflowScrolling='touch';
  gov.style.overscrollBehaviorY='contain';
  gov.style.touchAction='pan-y';
  return true;
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
    if(hr.bottom>gr.bottom-12)gov.scrollBy({top:Math.min(hr.bottom-gr.bottom+36,Math.max(80,gov.clientHeight*.65)),behavior:'smooth'});
    else if(b.getBoundingClientRect().top<gr.top+8)gov.scrollBy({top:b.getBoundingClientRect().top-gr.top-12,behavior:'smooth'});
  },140);
}
let deneme=0;const t=setInterval(()=>{if(uygula()||++deneme>120)clearInterval(t);},100);
document.addEventListener('DOMContentLoaded',()=>setTimeout(uygula,0));
document.addEventListener('click',acilanBasligiGoster,true);
window.addEventListener('resize',uygula,{passive:true});
new MutationObserver(()=>uygula()).observe(document.documentElement,{childList:true,subtree:true});
})();
