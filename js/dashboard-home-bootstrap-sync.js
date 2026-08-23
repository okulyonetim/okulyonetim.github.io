/* Koruk Asistan — dashboard ilk açılış koordinatörü
 * Hızlı İşlemler gibi shared bölümler shell'den önce yüklenirse kaybolmasın.
 * Kalıcı DOM observer/interval yok; yalnız kısa ve sınırlı başlangıç tetikleri.
 */
(function(){
'use strict';
if(window.__KH_HOME_BOOT_SYNC__)return;window.__KH_HOME_BOOT_SYNC__=true;
let queued=false;
function signal(source){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;window.dispatchEvent(new CustomEvent('koruk:dashboard-render',{detail:{source:source||'boot-sync'}}))})}
[0,40,100,220,450,900,1600].forEach(ms=>setTimeout(()=>signal('boot-'+ms),ms));
window.addEventListener('koruk:data-updated',()=>signal('data-updated'));
window.addEventListener('koruk:exam-stop-state',()=>signal('exam-state'));
})();