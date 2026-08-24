/* Koruk Asistan — nöbet raporu resmî tatil kenarlığı */
(function(){
'use strict';
if(window.__KORUK_NOBET_TATIL_BORDER__)return;
window.__KORUK_NOBET_TATIL_BORDER__=true;

function nobetRaporuMu(html){
  const s=String(html||'');
  return s.includes('ÖĞRETMEN NÖBET ÇİZELGESİ') || s.includes('nobet-resmi-tatil');
}
function stilEkle(html){
  const s=String(html||'');
  if(!nobetRaporuMu(s) || s.includes('koruk-nobet-tatil-border-fix'))return s;
  const css=`<style id="koruk-nobet-tatil-border-fix">
    .nobet-main-table .nobet-resmi-tatil td,
    .nobet-resmi-tatil td{
      border-top:1.2px solid #C8A640!important;
      border-bottom:1.2px solid #C8A640!important;
    }
    .nobet-main-table .nobet-resmi-tatil td:first-child,
    .nobet-resmi-tatil td:first-child{border-left:1.2px solid #C8A640!important;}
    .nobet-main-table .nobet-resmi-tatil td:last-child,
    .nobet-resmi-tatil td:last-child{border-right:1.2px solid #C8A640!important;}
  </style>`;
  return css+s;
}
function kur(){
  const fn=window._raporPenceresiniAc;
  if(typeof fn!=='function' || fn.__korukTatilBorderFix)return false;
  // Nöbet raporu sarmalayıcısı hazırsa onun DIŞINA sarılır; iş akışını değiştirmez.
  if(!fn.__korukNobetA4)return false;
  const sarilan=function(htmlIcerik,baslik,secenekler){
    return fn.call(this,stilEkle(htmlIcerik),baslik,secenekler);
  };
  Object.keys(fn).forEach(k=>{try{sarilan[k]=fn[k]}catch(_){}});
  sarilan.__korukTatilBorderFix=true;
  window._raporPenceresiniAc=sarilan;
  return true;
}
function dene(){if(kur())return;}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',dene,{once:true});else dene();
window.addEventListener('load',dene,{once:true});
// Rapor düğmesine dokunulduğunda lazy rapor motoru yüklenmiş olabilir.
document.addEventListener('click',e=>{
  if(e.target.closest?.('[onclick*="raporNobetListesi"],#nobetRaporBtn,.nobet-rapor-btn')){
    setTimeout(dene,0);setTimeout(dene,120);setTimeout(dene,500);
  }
},true);
[300,1000,2500,5000].forEach(ms=>setTimeout(dene,ms));
})();
