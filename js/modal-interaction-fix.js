/* Koruk Asistan — global modal interaction fix v4
   Amaç: modal aç/kapat sonrası Android/WebView dokunma kilitlerini
   temizlemek; mevcut modal fonksiyonlarını yeniden sarmalamadan çalışmak. */
(function(){
'use strict';
if(window.__MODAL_INTERACTION_FIX_V4__) return;
window.__MODAL_INTERACTION_FIX_V4__=true;

function gorunur(el){
  if(!el) return false;
  if(el.classList.contains('show') || el.classList.contains('active') || el.classList.contains('acik')) return true;
  const cs=getComputedStyle(el);
  return cs.display!=='none' && cs.visibility!=='hidden' && cs.pointerEvents!=='none';
}
function herhangiModalAcik(){
  return [
    document.getElementById('modalOverlay'),
    document.getElementById('detayOverlay'),
    document.getElementById('ozelOnayModal'),
    document.getElementById('ilerlemeOverlay')
  ].some(gorunur);
}
function kilitTemizle(){
  if(herhangiModalAcik()) return;
  const b=document.body, h=document.documentElement;
  ['modal-open','no-scroll','overflow-hidden'].forEach(c=>{b.classList.remove(c);h.classList.remove(c);});
  ['overflow','position','top','left','right','width','touch-action','pointer-events'].forEach(p=>b.style.removeProperty(p));
  ['overflow','touch-action','pointer-events'].forEach(p=>h.style.removeProperty(p));
  const ana=document.getElementById('modalOverlay');
  const detay=document.getElementById('detayOverlay');
  [ana,detay].forEach(el=>{
    if(!el) return;
    if(!el.classList.contains('show')&&!el.classList.contains('active')&&!el.classList.contains('acik')){
      el.style.removeProperty('pointer-events');
      el.style.removeProperty('touch-action');
    }
  });
  try{
    if(typeof _pullToRefreshAyarla==='function') _pullToRefreshAyarla(true);
  }catch(_){}
}
function kapanisSonrasi(){
  requestAnimationFrame(()=>requestAnimationFrame(kilitTemizle));
  setTimeout(kilitTemizle,120);
}

/* Kapat/Vazgeç butonlarında mevcut handler'a müdahale etme; yalnızca
   handler bittikten sonra kalan global kilitleri temizle. */
document.addEventListener('click',function(e){
  const btn=e.target.closest?.('button,[role="button"]');
  if(!btn) return;
  const txt=(btn.textContent||'').trim().toLocaleLowerCase('tr');
  const onclick=btn.getAttribute?.('onclick')||'';
  if(txt.includes('vazgeç')||txt.includes('kapat')||onclick.includes('modalKapat')||onclick.includes('detayPanelKapat')) kapanisSonrasi();
},false);

/* Alt navigasyona geçişte görünmez overlay kalıntısı varsa temizle. */
document.addEventListener('click',function(e){
  if(e.target.closest?.('.bottom-nav')) kapanisSonrasi();
},false);

/* Escape ile kapanan masaüstü modalları için. */
document.addEventListener('keyup',function(e){ if(e.key==='Escape') kapanisSonrasi(); },false);

/* Sayfa tekrar öne geldiğinde eski WebView state'i kalmışsa düzelt. */
document.addEventListener('visibilitychange',function(){ if(!document.hidden) setTimeout(kilitTemizle,0); });
window.addEventListener('pageshow',()=>setTimeout(kilitTemizle,0));
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(kilitTemizle,0),{once:true});
else setTimeout(kilitTemizle,0);
})();
