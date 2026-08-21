/* Koruk Asistan — global modal interaction fix v1 */
(function(){
'use strict';
if(window.__MODAL_INTERACTION_FIX__) return;
window.__MODAL_INTERACTION_FIX__=true;

function gorunur(el){
  if(!el) return false;
  const cs=getComputedStyle(el);
  return el.classList.contains('show')||el.classList.contains('active')||(cs.display!=='none'&&cs.visibility!=='hidden');
}

function kilitTemizle(){
  const ana=document.getElementById('modalOverlay');
  const detay=document.getElementById('detayOverlay');
  if(!gorunur(ana)&&!gorunur(detay)) document.body.classList.remove('modal-open');
}

function modalGuvenliKapat(){
  const ana=document.getElementById('modalOverlay');
  if(gorunur(ana)){
    try{
      if(typeof window.modalKapat==='function') window.modalKapat();
      else { ana.classList.remove('show','active'); ana.style.display='none'; }
    }catch(_){ ana.classList.remove('show','active'); ana.style.display='none'; }
  }
  const detay=document.getElementById('detayOverlay');
  if(gorunur(detay)){
    try{
      if(typeof window.detayPanelKapat==='function') window.detayPanelKapat();
      else { detay.classList.remove('show','active'); detay.style.display='none'; }
    }catch(_){ detay.classList.remove('show','active'); detay.style.display='none'; }
  }
  setTimeout(kilitTemizle,0);
}

document.addEventListener('click',function(e){
  if(!e.target.closest?.('.bottom-nav')) return;
  modalGuvenliKapat();
},true);

const gozlemci=new MutationObserver(()=>setTimeout(kilitTemizle,0));
function baslat(){
  const ana=document.getElementById('modalOverlay');
  const detay=document.getElementById('detayOverlay');
  if(ana) gozlemci.observe(ana,{attributes:true,attributeFilter:['class','style']});
  if(detay) gozlemci.observe(detay,{attributes:true,attributeFilter:['class','style']});
  kilitTemizle();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat,{once:true}); else baslat();
})();