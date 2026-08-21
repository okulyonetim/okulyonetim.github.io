/* Koruk Asistan — global modal interaction fix v5
   Tek amaç: kapanmış overlay/modal kalıntılarının Android/WebView dokunma
   ve pull-to-refresh durumunu kilitlemesini engellemek. Mevcut modal
   fonksiyonlarını yeniden sarmalamaz veya event akışını durdurmaz. */
(function(){
'use strict';
if(window.__MODAL_INTERACTION_FIX_V5__) return;
window.__MODAL_INTERACTION_FIX_V5__=true;

function siniflaAcik(el){
  return !!el && (el.classList.contains('show') || el.classList.contains('active') || el.classList.contains('acik'));
}
function inlineAcik(el){
  if(!el) return false;
  const d=(el.style && el.style.display) || '';
  return d !== '' && d !== 'none';
}
function herhangiModalAcik(){
  if(siniflaAcik(document.getElementById('modalOverlay'))) return true;
  if(siniflaAcik(document.getElementById('detayOverlay'))) return true;
  const inlineIds=['ozelOnayModal','ilerlemeOverlay','hizliEkleModal'];
  return inlineIds.some(id=>inlineAcik(document.getElementById(id)));
}
function overlayKalıntıTemizle(){
  ['modalOverlay','detayOverlay'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el || siniflaAcik(el)) return;
    el.style.removeProperty('pointer-events');
    el.style.removeProperty('touch-action');
  });
}
function kilitTemizle(){
  overlayKalıntıTemizle();
  if(herhangiModalAcik()) return;

  const b=document.body, h=document.documentElement;
  ['modal-open','no-scroll','overflow-hidden'].forEach(c=>{b.classList.remove(c);h.classList.remove(c);});
  ['overflow','position','top','left','right','width','height','touch-action','pointer-events'].forEach(p=>b.style.removeProperty(p));
  ['overflow','position','touch-action','pointer-events'].forEach(p=>h.style.removeProperty(p));

  /* Sayaç daha önce birden fazla kez arttıysa tek bir enabled=true çağrısı
     yetmez. app.js zaten bu durum için zorunlu sıfırlama fonksiyonu içeriyor. */
  try{
    if(typeof _pullToRefreshZorlaSifirla==='function') _pullToRefreshZorlaSifirla();
    else if(typeof _pullToRefreshAyarla==='function') _pullToRefreshAyarla(true);
  }catch(_){}
}
function sonraTemizle(){
  setTimeout(kilitTemizle,0);
  requestAnimationFrame(()=>requestAnimationFrame(kilitTemizle));
  setTimeout(kilitTemizle,100);
  setTimeout(kilitTemizle,300);
}

/* Her normal tıklamanın sonunda gerçek bir modal açık değilse state'i
   doğrula. Böylece kapanış butonunun metnine/fonksiyon adına bağlı kalmayız. */
document.addEventListener('click',sonraTemizle,false);
document.addEventListener('keyup',function(e){ if(e.key==='Escape') sonraTemizle(); },false);
document.addEventListener('visibilitychange',function(){ if(!document.hidden) sonraTemizle(); },false);
window.addEventListener('pageshow',sonraTemizle,false);
window.addEventListener('focus',sonraTemizle,false);

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',sonraTemizle,{once:true});
else sonraTemizle();
})();
