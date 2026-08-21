/* Koruk Asistan — sayfa teması yardımcıları */
(function(){
'use strict';
if(window.__APP_PAGES_THEME_JS__) return;
window.__APP_PAGES_THEME_JS__=true;

function ogretmenModalIsaretle(){
  const ov=document.getElementById('modalOverlay');
  if(ov) ov.classList.add('ap-ogretmen-modal');
}
function modalTemaTemizle(){
  const ov=document.getElementById('modalOverlay');
  if(ov) ov.classList.remove('ap-ogretmen-modal');
}

document.addEventListener('click',function(e){
  const btn=e.target.closest?.('button,[role="button"]');
  if(!btn) return;
  const onclick=btn.getAttribute('onclick')||'';
  const ogretmenSekmesinde=!!btn.closest('#tab-ogretmenler');
  if(ogretmenSekmesinde && (onclick.includes('ogretmenModalAc') || /düzenle|yeni öğretmen/i.test(btn.textContent||''))){
    requestAnimationFrame(ogretmenModalIsaretle);
  }
},true);

const baslat=function(){
  const ov=document.getElementById('modalOverlay');
  if(!ov) return;
  const mo=new MutationObserver(function(){
    const gorunur=ov.classList.contains('show')||ov.classList.contains('active')||getComputedStyle(ov).display!=='none';
    if(!gorunur) modalTemaTemizle();
  });
  mo.observe(ov,{attributes:true,attributeFilter:['class','style']});
};
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat,{once:true}); else baslat();
})();