/* Koruk Asistan — global modal interaction fix v3 */
(function(){
'use strict';
if(window.__MODAL_INTERACTION_FIX_V3__) return;
window.__MODAL_INTERACTION_FIX_V3__=true;

function acikMi(el){
  if(!el) return false;
  return el.classList.contains('show') || el.classList.contains('active') || el.classList.contains('acik');
}
function servisOturmaModalMi(){
  return !!document.getElementById('modalOverlay')?.querySelector('#soServisId,.so-modal-wrap');
}
function servisYerelDurumTemizle(){
  try{ if(typeof _soSurukleTemizle==='function') _soSurukleTemizle(); }catch(_){}
  try{ if(typeof _soDuzenlemeAcik!=='undefined') _soDuzenlemeAcik=false; }catch(_){}
  try{ if(typeof _soEditBuffer!=='undefined') _soEditBuffer=[]; }catch(_){}
  try{ if(typeof _soUndoYigini!=='undefined') _soUndoYigini=[]; }catch(_){}
  try{ if(typeof _soRedoYigini!=='undefined') _soRedoYigini=[]; }catch(_){}
  try{ if(typeof _soSurukleDurumu!=='undefined') _soSurukleDurumu=null; }catch(_){}
}
function kilitleriTamTemizle(){
  const ana=document.getElementById('modalOverlay');
  const detay=document.getElementById('detayOverlay');
  if(!acikMi(ana) && !acikMi(detay)){
    document.body.classList.remove('modal-open','no-scroll','overflow-hidden');
    document.documentElement.classList.remove('modal-open','no-scroll','overflow-hidden');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('touch-action');
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('touch-action');
    if(ana){
      ana.style.removeProperty('display');
      ana.style.removeProperty('pointer-events');
      ana.style.removeProperty('touch-action');
    }
  }
}
function servisModalZorlaKapat(){
  const ana=document.getElementById('modalOverlay');
  servisYerelDurumTemizle();
  try{ if(typeof window.modalKapat==='function') window.modalKapat(); }catch(_){}
  if(ana){
    ana.classList.remove('show','active','acik');
    ana.style.display='none';
    ana.style.pointerEvents='none';
  }
  requestAnimationFrame(kilitleriTamTemizle);
  setTimeout(kilitleriTamTemizle,0);
  setTimeout(kilitleriTamTemizle,60);
  setTimeout(()=>{
    if(ana && !acikMi(ana)){
      ana.style.removeProperty('display');
      ana.style.removeProperty('pointer-events');
    }
    kilitleriTamTemizle();
  },180);
}
function modalGuvenliKapat(){
  if(servisOturmaModalMi()){ servisModalZorlaKapat(); return; }
  const ana=document.getElementById('modalOverlay');
  if(acikMi(ana)){
    try{ if(typeof window.modalKapat==='function') window.modalKapat(); else ana.classList.remove('show','active','acik'); }
    catch(_){ ana.classList.remove('show','active','acik'); }
  }
  const detay=document.getElementById('detayOverlay');
  if(acikMi(detay)){
    try{ if(typeof window.detayPanelKapat==='function') window.detayPanelKapat(); else detay.classList.remove('show','active','acik'); }
    catch(_){ detay.classList.remove('show','active','acik'); }
  }
  requestAnimationFrame(kilitleriTamTemizle);
  setTimeout(kilitleriTamTemizle,40);
  setTimeout(kilitleriTamTemizle,180);
}

/* Alt navigasyona geçerken açık modal/panel resmi kapanış akışından geçirilir. */
document.addEventListener('click',function(e){
  if(e.target.closest?.('.bottom-nav')) modalGuvenliKapat();
},true);

/* Servis oturma modalındaki Vazgeç'i capture aşamasında tek kapanış yoluna al.
   Böylece ortak modal handler + sürükle/touch handler zinciri aynı tıklamada yarışmaz. */
document.addEventListener('click',function(e){
  const btn=e.target.closest?.('#modalOverlay button');
  if(!btn || !servisOturmaModalMi()) return;
  const txt=(btn.textContent||'').trim().toLocaleLowerCase('tr');
  if(!txt.includes('vazgeç') && !txt.includes('kapat')) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  servisModalZorlaKapat();
},true);

/* Diğer ortak modallarda kapanış sonrası kilitleri doğrula. */
document.addEventListener('click',function(e){
  const btn=e.target.closest?.('#modalOverlay button');
  if(!btn || servisOturmaModalMi()) return;
  const txt=(btn.textContent||'').trim().toLocaleLowerCase('tr');
  const onclick=btn.getAttribute('onclick')||'';
  if(txt.includes('vazgeç') || txt.includes('kapat') || onclick.includes('modalKapat')){
    setTimeout(kilitleriTamTemizle,0);
    setTimeout(kilitleriTamTemizle,80);
  }
},false);

const gozlemci=new MutationObserver(()=>requestAnimationFrame(kilitleriTamTemizle));
function baslat(){
  const ana=document.getElementById('modalOverlay');
  const detay=document.getElementById('detayOverlay');
  if(ana) gozlemci.observe(ana,{attributes:true,attributeFilter:['class','style']});
  if(detay) gozlemci.observe(detay,{attributes:true,attributeFilter:['class','style']});
  kilitleriTamTemizle();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat,{once:true}); else baslat();
})();