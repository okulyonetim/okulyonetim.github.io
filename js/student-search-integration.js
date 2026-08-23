/* Koruk Asistan — Öğrenci/Arama entegrasyonu v1 */
(function(){
'use strict';
if(window.__KH_SEARCH_INPUT_GUARD_V1__)return;window.__KH_SEARCH_INPUT_GUARD_V1__=true;
function guard(inp,name){
  if(!inp||inp.dataset.khSearchGuard==='1')return;
  inp.dataset.khSearchGuard='1';
  inp.type='search';
  inp.setAttribute('autocomplete','off');
  inp.setAttribute('autocapitalize','none');
  inp.setAttribute('spellcheck','false');
  inp.setAttribute('enterkeyhint','search');
  inp.setAttribute('role','searchbox');
  inp.setAttribute('name',name);
  inp.setAttribute('data-1p-ignore','true');
  inp.setAttribute('data-lpignore','true');
  inp.setAttribute('data-form-type','other');
  inp.readOnly=true;
  const enable=()=>{inp.readOnly=false};
  inp.addEventListener('pointerdown',enable,{passive:true});
  inp.addEventListener('touchstart',enable,{passive:true});
  inp.addEventListener('focus',enable);
}
function apply(){
  guard(document.getElementById('globalAramaInput'),'koruk_global_search_query');
  guard(document.getElementById('ogrenciArama'),'koruk_student_search_query');
  if(typeof window.khOgrenciDetayAc==='function' && window.ogrenciDetayModalAc!==window.khOgrenciDetayAc){
    if(!window.__KH_OLD_OGRENCI_DETAY__)window.__KH_OLD_OGRENCI_DETAY__=window.ogrenciDetayModalAc;
    window.ogrenciDetayModalAc=window.khOgrenciDetayAc;
  }
}
window.addEventListener('koruk:dashboard-render',apply);
document.addEventListener('click',function(e){if(e.target.closest('[data-tab="arama"],[data-tab="ogrenciler"],.bn-item'))setTimeout(apply,0)},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,0),{once:true});else setTimeout(apply,0);
})();