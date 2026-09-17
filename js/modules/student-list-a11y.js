/* Öğrenci Liste Oluşturucu — klavye ile sütun sıralama desteği. */
(function(global){
'use strict';
if(global.StudentListA11y)return;
let observer=null;
function root(){return document.getElementById('v2ModuleRoot')}
function bind(){
 const r=root();if(!r)return;
 r.querySelectorAll('[data-sl-move]').forEach(btn=>{if(btn.dataset.slA11y)return;btn.dataset.slA11y='1'});
 r.querySelectorAll('.ka-teacher-list-column,.sl-preview-col').forEach(el=>{
  if(el.dataset.slKeyboardReady)return;
  el.dataset.slKeyboardReady='1';
  el.tabIndex=0;
  el.setAttribute('role','listitem');
  el.addEventListener('keydown',e=>{
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
   const key=el.dataset.slPreviewCol||el.querySelector('[data-key]')?.dataset.key;
   if(!key)return;
   const dir=(e.key==='ArrowLeft'||e.key==='ArrowUp')?-1:1;
   const btn=r.querySelector(`[data-sl-move="${dir}"][data-key="${CSS.escape(key)}"]`);
   if(btn){e.preventDefault();btn.click();requestAnimationFrame(()=>r.querySelector(`[data-sl-preview-col="${CSS.escape(key)}"],.ka-teacher-list-column [data-key="${CSS.escape(key)}"]`)?.closest('.sl-preview-col,.ka-teacher-list-column')?.focus())}
  });
 });
}
function install(){if(observer)return;const r=root();if(!r)return;observer=new MutationObserver(()=>requestAnimationFrame(bind));observer.observe(r,{childList:true,subtree:true});bind()}
function uninstall(){observer?.disconnect();observer=null}
global.StudentListA11y={install,uninstall,refresh:bind};
install();
})(window);
