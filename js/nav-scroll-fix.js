/* Koruk Asistan — akordeon navigasyon dikey kaydırma düzeltmesi */
(function(){
'use strict';
function uygula(){
  const gov=document.getElementById('anListeGovde');
  if(!gov)return false;
  gov.style.overflowY='auto';
  gov.style.overflowX='hidden';
  gov.style.webkitOverflowScrolling='touch';
  gov.style.overscrollBehavior='contain';
  gov.style.touchAction='pan-y';
  gov.style.minHeight='0';
  gov.style.maxHeight='100%';
  const kat=gov.parentElement;
  if(kat){kat.style.minHeight='0';kat.style.overflow='hidden';}
  return true;
}
function acilanBasligiGoster(e){
  const b=e.target&&e.target.closest?e.target.closest('.an-akordeon-baslik'):null;
  if(!b)return;
  setTimeout(()=>{
    const gov=document.getElementById('anListeGovde');
    if(!gov||b.getAttribute('aria-expanded')!=='true')return;
    const br=b.getBoundingClientRect(),gr=gov.getBoundingClientRect();
    if(br.bottom>gr.bottom-12)gov.scrollBy({top:br.bottom-gr.bottom+28,behavior:'smooth'});
    else if(br.top<gr.top+8)gov.scrollBy({top:br.top-gr.top-12,behavior:'smooth'});
  },80);
}
let deneme=0;const t=setInterval(()=>{if(uygula()||++deneme>120)clearInterval(t);},100);
document.addEventListener('DOMContentLoaded',()=>setTimeout(uygula,0));
document.addEventListener('click',acilanBasligiGoster,true);
new MutationObserver(()=>uygula()).observe(document.documentElement,{childList:true,subtree:true});
})();
