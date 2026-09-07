/* Koruk Asistan — Android WebView çalışma zamanı düzeltmeleri.
 * MainActivity uygulama hazır olduğunda yükler.
 * Planlı tatil formunda seçilen ancak henüz kaydedilmeyen tarihlerin,
 * arka plan senkronu nedeniyle SettingsModule yeniden render olduğunda
 * eski değere dönmesini engeller.
 */
(function(global){
'use strict';
if(global.KorukNativeRuntimeFixes)return;

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
let draft=null;
let saving=false;
let restoring=false;
let restoreQueued=false;

function card(){return q('[data-quality-holiday-card]')}
function rows(root){return qa('[data-quality-holiday-range-row]',root)}
function holidayField(el){return !!el?.matches?.('[data-quality-holiday-name],[data-quality-holiday-start],[data-quality-holiday-end],[data-quality-holiday-note]')&&!!el.closest?.('[data-quality-holiday-card]')}

function snapshot(root=card()){
  if(restoring||!root)return;
  draft={dirty:true,rows:rows(root).map((row,i)=>({
    id:String(row.dataset.holidayId||`draft-${i}`),
    ad:q('[data-quality-holiday-name]',row)?.value||'',
    baslangicTarihi:q('[data-quality-holiday-start]',row)?.value||'',
    bitisTarihi:q('[data-quality-holiday-end]',row)?.value||'',
    not:q('[data-quality-holiday-note]',row)?.value||''
  }))};
}

function applyRow(row,item){
  row.dataset.holidayId=item.id||row.dataset.holidayId||'';
  const name=q('[data-quality-holiday-name]',row),start=q('[data-quality-holiday-start]',row),end=q('[data-quality-holiday-end]',row),note=q('[data-quality-holiday-note]',row);
  if(name)name.value=item.ad||'';
  if(start)start.value=item.baslangicTarihi||'';
  if(end)end.value=item.bitisTarihi||'';
  if(note)note.value=item.not||'';
  const title=row.querySelector('.ka-row strong');
  if(title)title.textContent=item.ad||'Tatil';
}

function restore(){
  if(restoring||!draft?.dirty)return;
  const root=card();if(!root)return;
  restoring=true;
  try{
    let current=rows(root);
    const add=q('[data-quality-holiday-add]',root);
    while(current.length<draft.rows.length&&add){add.click();current=rows(root)}
    while(current.length>draft.rows.length){
      const last=current[current.length-1],remove=q('[data-quality-holiday-remove]',last);
      if(!remove)break;
      remove.click();current=rows(root);
    }
    current.forEach((row,i)=>{if(draft.rows[i])applyRow(row,draft.rows[i])});
  }finally{restoring=false}
}

function queueRestore(){
  if(restoreQueued)return;
  restoreQueued=true;
  requestAnimationFrame(()=>{restoreQueued=false;restore()});
}

function fieldChanged(e){if(holidayField(e.target))snapshot(e.target.closest('[data-quality-holiday-card]'))}
function clicked(e){
  const root=e.target.closest?.('[data-quality-holiday-card]');if(!root)return;
  if(e.target.closest('[data-quality-holiday-save]'))saving=true;
  if(e.target.closest('[data-quality-holiday-add],[data-quality-holiday-remove]'))setTimeout(()=>snapshot(root),0);
}

function start(){
  document.addEventListener('input',fieldChanged,true);
  document.addEventListener('change',fieldChanged,true);
  document.addEventListener('click',clicked,false);
  new MutationObserver(queueRestore).observe(document.documentElement,{childList:true,subtree:true});
  global.AppStore?.subscribe?.('data.dersSaatleri',()=>{
    if(saving){draft=null;saving=false;return}
    queueRestore();
  });
  global.addEventListener('koruk:app-ready',queueRestore);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')queueRestore()});
  setInterval(restore,800);
}

global.KorukNativeRuntimeFixes={snapshotHolidayDraft:snapshot,restoreHolidayDraft:restore};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
