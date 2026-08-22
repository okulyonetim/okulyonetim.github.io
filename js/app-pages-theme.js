/* Koruk Asistan — sayfa teması yardımcıları */
(function(){
'use strict';
if(window.__APP_PAGES_THEME_JS__) return;
window.__APP_PAGES_THEME_JS__=true;

/* Uygulama geneli daha açık koyu tema paleti. */
if(!document.querySelector('link[data-soft-dark-theme]')){
  const temaLink=document.createElement('link');
  temaLink.rel='stylesheet';
  temaLink.href='css/dark-theme-soft.css?v=1';
  temaLink.setAttribute('data-soft-dark-theme','1');
  document.head.appendChild(temaLink);
}

function modalSinifEkle(cls){
  const ov=document.getElementById('modalOverlay');
  if(!ov) return;
  if(ov.classList.contains('ap-ogretmen-modal')||ov.classList.contains('ap-sinif-modal')||ov.classList.contains('ap-ogrenci-modal')){
    ov.classList.remove('ap-ogretmen-modal','ap-sinif-modal','ap-ogrenci-modal');
  }
  if(cls) ov.classList.add(cls);
}
function ogretmenModalIsaretle(){ modalSinifEkle('ap-ogretmen-modal'); }
function sinifModalIsaretle(){ modalSinifEkle('ap-sinif-modal'); }
function ogrenciModalIsaretle(){ modalSinifEkle('ap-ogrenci-modal'); }
function modalTemaTemizle(){ modalSinifEkle(''); }
function sinifDetayIsaretle(){ const ov=document.getElementById('detayOverlay'); if(ov) ov.classList.add('ap-sinif-detay'); }
function sinifDetayTemizle(){ const ov=document.getElementById('detayOverlay'); if(ov&&ov.classList.contains('ap-sinif-detay')) ov.classList.remove('ap-sinif-detay'); }

document.addEventListener('click',function(e){
  const btn=e.target.closest?.('button,[role="button"],tr.row-clickable,[onclick]');
  if(!btn) return;
  const onclick=btn.getAttribute('onclick')||'';
  const text=(btn.textContent||'').trim();
  const ogretmenSekmesinde=!!btn.closest('#tab-ogretmenler');
  const sinifSekmesinde=!!btn.closest('#tab-siniflar');
  const ogrenciSekmesinde=!!btn.closest('#tab-ogrenciler');
  const sinifDetayinda=!!btn.closest('#detayOverlay.ap-sinif-detay');
  if(ogretmenSekmesinde && (onclick.includes('ogretmenModalAc') || /düzenle|yeni öğretmen/i.test(text))){ requestAnimationFrame(ogretmenModalIsaretle); return; }
  if(sinifSekmesinde && (onclick.includes('sinifModalAc') || /düzenle|yeni sınıf/i.test(text))) requestAnimationFrame(sinifModalIsaretle);
  if(sinifSekmesinde && (onclick.includes('sinifDetayAc') || btn.matches('tr.row-clickable'))) requestAnimationFrame(sinifDetayIsaretle);
  if(ogrenciSekmesinde && /ogrenciDetayModalAc|sinifVeliModalAc|sinifOgrenciExcelModalAc/.test(onclick)){ requestAnimationFrame(ogrenciModalIsaretle); return; }
  if(sinifDetayinda){
    if(onclick.includes('sinifModalAc')) requestAnimationFrame(sinifModalIsaretle);
    if(/sinifVeliModalAc|sinifOgrenciExcelModalAc|ogrenciDetayModalAc/.test(onclick)) requestAnimationFrame(sinifModalIsaretle);
  }
},true);

const baslat=function(){
  const ov=document.getElementById('modalOverlay');
  if(ov){
    const mo=new MutationObserver(function(){
      const gorunur=ov.classList.contains('show')||ov.classList.contains('active')||getComputedStyle(ov).display!=='none';
      if(!gorunur){ mo.disconnect(); modalTemaTemizle(); mo.observe(ov,{attributes:true,attributeFilter:['class','style']}); }
    });
    mo.observe(ov,{attributes:true,attributeFilter:['class','style']});
  }
  const det=document.getElementById('detayOverlay');
  if(det){
    const mo2=new MutationObserver(function(){
      const gorunur=det.classList.contains('active')||det.classList.contains('show')||getComputedStyle(det).display!=='none';
      if(!gorunur){ mo2.disconnect(); sinifDetayTemizle(); mo2.observe(det,{attributes:true,attributeFilter:['class','style']}); }
    });
    mo2.observe(det,{attributes:true,attributeFilter:['class','style']});
  }
};
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat,{once:true}); else baslat();
})();