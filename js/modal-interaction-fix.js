/* Koruk Asistan — global modal interaction fix v2 */
(function(){
'use strict';
if(window.__MODAL_INTERACTION_FIX_V2__) return;
window.__MODAL_INTERACTION_FIX_V2__=true;

function acikMi(el){
  if(!el) return false;
  return el.classList.contains('show') || el.classList.contains('active') || el.classList.contains('acik');
}

function zorlaKilitTemizle(){
  const ana=document.getElementById('modalOverlay');
  const detay=document.getElementById('detayOverlay');
  if(!acikMi(ana) && !acikMi(detay)){
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
    if(ana && !acikMi(ana)){
      ana.style.removeProperty('display');
      ana.style.removeProperty('pointer-events');
    }
  }
}

function modalGuvenliKapat(){
  const ana=document.getElementById('modalOverlay');
  if(acikMi(ana)){
    try{
      if(typeof window.modalKapat==='function') window.modalKapat();
      else ana.classList.remove('show','active','acik');
    }catch(_){ ana.classList.remove('show','active','acik'); }
  }
  const detay=document.getElementById('detayOverlay');
  if(acikMi(detay)){
    try{
      if(typeof window.detayPanelKapat==='function') window.detayPanelKapat();
      else detay.classList.remove('show','active','acik');
    }catch(_){ detay.classList.remove('show','active','acik'); }
  }
  requestAnimationFrame(zorlaKilitTemizle);
  setTimeout(zorlaKilitTemizle,40);
  setTimeout(zorlaKilitTemizle,180);
}

/* Alt navigasyona geçerken açık modal/panel resmi kapanış akışından geçirilir. */
document.addEventListener('click',function(e){
  if(e.target.closest?.('.bottom-nav')) modalGuvenliKapat();
},true);

/* Ortak modaldaki Vazgeç/Kapat düğmeleri sonrasında gövde kilidinin kesin temizlenmesi. */
document.addEventListener('click',function(e){
  const btn=e.target.closest?.('#modalOverlay button');
  if(!btn) return;
  const txt=(btn.textContent||'').trim().toLocaleLowerCase('tr');
  const onclick=btn.getAttribute('onclick')||'';
  if(txt.includes('vazgeç') || txt.includes('kapat') || onclick.includes('modalKapat')){
    setTimeout(zorlaKilitTemizle,0);
    setTimeout(zorlaKilitTemizle,80);
  }
},false);

const gozlemci=new MutationObserver(()=>requestAnimationFrame(zorlaKilitTemizle));
function baslat(){
  const ana=document.getElementById('modalOverlay');
  const detay=document.getElementById('detayOverlay');
  if(ana) gozlemci.observe(ana,{attributes:true,attributeFilter:['class','style']});
  if(detay) gozlemci.observe(detay,{attributes:true,attributeFilter:['class','style']});
  zorlaKilitTemizle();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat,{once:true}); else baslat();
})();