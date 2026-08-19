/* Koruk Asistan — modal durum ve tema kontrast kararlılık düzeltmeleri */
(function(){
'use strict';
function scriptYukle(src,key){
  if(document.querySelector('script[data-'+key+']'))return;
  const s=document.createElement('script');s.src=src;s.async=false;s.setAttribute('data-'+key,'1');document.head.appendChild(s);
}
scriptYukle('js/theme-contrast-fixes.js','theme-contrast');
scriptYukle('js/excel-visual-fidelity.js','excel-visual-fidelity');
scriptYukle('js/excel-visual-fidelity-v3.js','excel-visual-fidelity-v3');

let sarildi=false,deneme=0;
function kur(){
  if(sarildi)return true;
  if(typeof window.dokumanYukleModalAc!=='function')return false;
  const eski=window.dokumanYukleModalAc;
  window.dokumanYukleModalAc=function(){
    const r=eski.apply(this,arguments);
    requestAnimationFrame(()=>{
      const b=document.getElementById('modalKaydetBtn');
      if(!b)return;
      b.style.display='';
      b.disabled=false;
      b.removeAttribute('aria-disabled');
      b.textContent='💾 Kaydet';
      const resim=document.getElementById('dok_panel_resim');
      const bir=document.getElementById('dok_panel_birlestir');
      if(bir&&bir.style.display!=='none')b.disabled=true;
      else if(resim&&resim.style.display!=='none'&&!window._dokResimPdfBlob)b.disabled=true;
    });
    return r;
  };
  sarildi=true;
  return true;
}
const t=setInterval(()=>{if(kur()||++deneme>120)clearInterval(t);},100);
document.addEventListener('DOMContentLoaded',()=>setTimeout(kur,0));
})();
