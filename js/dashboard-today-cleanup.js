/* Koruk Asistan — Bugün alanı sadeleştirme
 * Sürekli polling/MutationObserver kullanmaz; dashboard kurulana kadar kısa süre dener.
 */
(function(){
'use strict';
let deneme=0;
function uygula(){
  const grid=document.querySelector('#tab-panel.db4 .db4-today');
  if(!grid){
    if(++deneme<40)setTimeout(uygula,100);
    return;
  }
  Array.from(grid.querySelectorAll('button')).forEach(btn=>{
    const metin=(btn.textContent||'').replace(/\s+/g,' ').trim();
    if(/Bugünkü Nöbet/i.test(metin)||/Açık Görev/i.test(metin))btn.remove();
  });
  grid.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(uygula,0),{once:true});
else setTimeout(uygula,0);
})();
