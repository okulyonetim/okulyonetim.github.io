/* Koruk Asistan — global modal interaction fix v3 */
(function(){
'use strict';
if(window.__MODAL_INTERACTION_FIX_V3__) return;
window.__MODAL_INTERACTION_FIX_V3__=true;

function acikMi(el){
  if(!el) return false;
  return el.classList.contains('show') || el.classList.contains('active') || el.classList.contains('acik');
}
function temizleElement(el){
  if(!el || acikMi(el)) return;
  el.classList.remove('show','active','acik');
  el.style.removeProperty('display');
  el.style.removeProperty('pointer-events');
  el.style.removeProperty('visibility');
  el.removeAttribute('aria-modal');
}
function kilitDurumunuEsitle(){
  const ana=document.getElementById('modalOverlay');
  const detay=document.getElementById('detayOverlay');
  const acik=acikMi(ana)||acikMi(detay);
  if(!acik){
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
    temizleElement(ana);
    temizleElement(detay);
    try{ if(typeof window._pullToRefreshAyarla==='function') window._pullToRefreshAyarla(true); }catch(_){}
  }
}
function resmiKapat(){
  const ana=document.getElementById('modalOverlay');
  const detay=document.getElementById('detayOverlay');
  if(acikMi(ana)){
    try{ if(typeof window.modalKapat==='function') window.modalKapat(); else ana.classList.remove('show','active','acik'); }
    catch(_){ ana.classList.remove('show','active','acik'); }
  }
  if(acikMi(detay)){
    try{ if(typeof window.detayPanelKapat==='function') window.detayPanelKapat(); else detay.classList.remove('show','active','acik'); }
    catch(_){ detay.classList.remove('show','active','acik'); }
  }
  requestAnimationFrame(kilitDurumunuEsitle);
  setTimeout(kilitDurumunuEsitle,50);
  setTimeout(kilitDurumunuEsitle,220);
}

/* Alt navigasyon modal katmaninin disinda kalir; sekme degisiminde modal once kapanir. */
document.addEventListener('pointerdown',function(e){
  if(e.target.closest?.('.bottom-nav')) resmiKapat();
},true);

/* Vazgec/Kapat/Sil sonrasi gorunmez overlay veya body kilidi kalmasin. */
document.addEventListener('click',function(e){
  const btn=e.target.closest?.('#modalOverlay button,#detayOverlay button');
  if(!btn) return;
  const txt=(btn.textContent||'').trim().toLocaleLowerCase('tr');
  const onclick=btn.getAttribute('onclick')||'';
  if(/vazgeç|kapat|sil/.test(txt) || /modalKapat|detayPanelKapat/.test(onclick)){
    setTimeout(kilitDurumunuEsitle,0);
    setTimeout(kilitDurumunuEsitle,100);
    setTimeout(kilitDurumunuEsitle,260);
  }
},false);

function baslat(){
  const ana=document.getElementById('modalOverlay');
  const detay=document.getElementById('detayOverlay');
  const gozlemci=new MutationObserver(()=>requestAnimationFrame(kilitDurumunuEsitle));
  if(ana) gozlemci.observe(ana,{attributes:true,attributeFilter:['class','style']});
  if(detay) gozlemci.observe(detay,{attributes:true,attributeFilter:['class','style']});
  kilitDurumunuEsitle();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat,{once:true}); else baslat();
})();
