/* Koruk Asistan — Ödev/Not çizelgesi etkileşim düzeltmeleri */
(function(){
'use strict';
if(window.__ONC_INTERACTION_FIX__)return;window.__ONC_INTERACTION_FIX__=true;

function temizleModalSinifi(){
  if(!document.getElementById('oncModal') && !document.getElementById('oncMiniModal')){
    document.body.classList.remove('onc-modal-open');
  }
}

function kapatMini(){
  const el=document.getElementById('oncMiniModal');
  if(!el)return false;
  el.remove();temizleModalSinifi();return true;
}
function kapatYeni(){
  const el=document.getElementById('oncModal');
  if(!el)return false;
  el.remove();temizleModalSinifi();return true;
}

// Inline onclick başka bir katman tarafından yutulsa bile Kapat düğmesi çalışsın.
document.addEventListener('click',function(e){
  const btn=e.target.closest?.('#oncDetayOverlay button');
  if(!btn)return;
  const metin=(btn.textContent||'').trim().toLocaleLowerCase('tr');
  if(!metin.includes('kapat'))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(typeof window.oncDetayKapatIste==='function')window.oncDetayKapatIste();
  else{
    document.getElementById('oncDetayOverlay')?.remove();
    document.body.classList.remove('onc-detail-open');
  }
},true);

// Yeni çizelge / mini modal arka planına dokunulduğunda sadece boş alana basılmışsa kapat.
document.addEventListener('click',function(e){
  if(e.target?.id==='oncMiniModal'){kapatMini();return}
  if(e.target?.id==='oncModal'){kapatYeni()}
},false);

window.oncMiniModalKapat=window.oncMiniModalKapat||kapatMini;
window.oncYeniModalKapat=window.oncYeniModalKapat||kapatYeni;
})();
