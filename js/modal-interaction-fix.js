/* Koruk Asistan — global modal interaction fix v4
   Açılışta MutationObserver döngüsü oluşturmaz. Modal kilidi yalnızca gerçek
   kullanıcı kapanışları / alt navigasyon geçişleri sonrasında eşitlenir. */
(function(){
'use strict';
if(window.__MODAL_INTERACTION_FIX_V4__) return;
window.__MODAL_INTERACTION_FIX_V4__=true;

function acikMi(el){
  if(!el) return false;
  return el.classList.contains('show') || el.classList.contains('active') || el.classList.contains('acik');
}

function gereksizInlineTemizle(el){
  if(!el || acikMi(el)) return;
  /* Yalnız gerçekten set edilmiş değer varsa DOM'u değiştir. */
  if(el.style.display) el.style.removeProperty('display');
  if(el.style.pointerEvents) el.style.removeProperty('pointer-events');
  if(el.style.visibility) el.style.removeProperty('visibility');
  if(el.hasAttribute('aria-modal')) el.removeAttribute('aria-modal');
}

function kilitDurumunuEsitle(){
  const ana=document.getElementById('modalOverlay');
  const detay=document.getElementById('detayOverlay');
  if(acikMi(ana) || acikMi(detay)) return;

  if(document.body.classList.contains('modal-open')) document.body.classList.remove('modal-open');
  if(document.documentElement.classList.contains('modal-open')) document.documentElement.classList.remove('modal-open');
  gereksizInlineTemizle(ana);
  gereksizInlineTemizle(detay);
  try{ if(typeof window._pullToRefreshAyarla==='function') window._pullToRefreshAyarla(true); }catch(_){}
}

function kapanisSonrasiEsitle(){
  requestAnimationFrame(kilitDurumunuEsitle);
  setTimeout(kilitDurumunuEsitle,60);
  setTimeout(kilitDurumunuEsitle,220);
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
  kapanisSonrasiEsitle();
}

/* Alt navigasyona geçerken açık modal/panel önce resmi kapanışından geçirilir. */
document.addEventListener('pointerdown',function(e){
  if(e.target.closest?.('.bottom-nav')) resmiKapat();
},true);

/* Vazgeç / Kapat / Sil sonrası görünmez overlay veya body kilidi kalmasın. */
document.addEventListener('click',function(e){
  const btn=e.target.closest?.('#modalOverlay button,#detayOverlay button');
  if(!btn) return;
  const txt=(btn.textContent||'').trim().toLocaleLowerCase('tr');
  const onclick=btn.getAttribute('onclick')||'';
  if(/vazgeç|kapat|sil/.test(txt) || /modalKapat|detayPanelKapat/.test(onclick)) kapanisSonrasiEsitle();
},false);

/* Uygulama ilk açılışında bir kez stale kilit temizliği yap; observer yok. */
function baslat(){ setTimeout(kilitDurumunuEsitle,0); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat,{once:true}); else baslat();
})();
