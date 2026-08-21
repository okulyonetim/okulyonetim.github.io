/* Koruk Asistan — modal-interaction-fix v4
   body position:fixed kaldırıldığı için artık sadece
   güvenlik ağı olarak çalışır: hiçbir modal açık değilken
   body kilit state'i kalmışsa temizler. */
(function(){
'use strict';
if(window.__MODAL_FIX_V4__) return;
window.__MODAL_FIX_V4__ = true;

function modalAcikMi(){
  const ids = ['modalOverlay','detayOverlay'];
  if(ids.some(id=>{ const e=document.getElementById(id); return e && (e.classList.contains('active')||e.classList.contains('show')); })) return true;
  const inlines = ['ozelOnayModal','ilerlemeOverlay','hizliEkleModal'];
  return inlines.some(id=>{ const e=document.getElementById(id); return e && e.style.display && e.style.display!=='none'; });
}

function temizle(){
  if(modalAcikMi()) return;
  const b = document.body;
  // body position:fixed kalıntısı varsa temizle (eski sürüm kodundan)
  if(b.style.position === 'fixed'){
    b.style.position = '';
    b.style.top = '';
    b.style.left = '';
    b.style.right = '';
  }
  b.classList.remove('modal-open');
  b.style.removeProperty('touch-action');
  b.style.removeProperty('overflow');
  // pull-to-refresh sayacını sıfırla
  try{
    if(typeof _pullToRefreshZorlaSifirla==='function') _pullToRefreshZorlaSifirla();
  }catch(_){}
}

// Her tıklamadan 50ms sonra state'i doğrula
document.addEventListener('click', function(){ setTimeout(temizle, 50); }, true);
document.addEventListener('keyup', function(e){ if(e.key==='Escape') setTimeout(temizle,50); }, false);
})();
