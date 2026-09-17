/* Öğrenci Liste Oluşturucu — canlı sütun sıralama eklentisi.
 * Ana StudentListPage state'ine dokunmadan mevcut ↑/↓ kontrollerini kullanır.
 * Böylece sürükle-bırak sıralama, mevcut kaydet/şablon/PDF akışlarıyla aynı state'i paylaşır.
 */
(function(global){
'use strict';
if(global.StudentListLiveEnhancer)return;

let rootObserver=null;
let drag=null;

function root(){return document.getElementById('v2ModuleRoot')}
function page(){return root()?.querySelector('[data-student-list-page]')||null}
function keyOf(el){return el?.dataset?.key||el?.dataset?.slPreviewCol||''}
function managerCards(){return [...(page()?.querySelectorAll('.ka-teacher-list-column')||[])].filter(x=>x.querySelector('[data-sl-move]'))}
function managerKey(card){return card.querySelector('[data-key]')?.dataset?.key||''}
function moveButton(key,direction){
 const card=managerCards().find(c=>managerKey(c)===key);
 return card?.querySelector(`[data-sl-move="${direction}"]`)||null;
}
function currentManagerKeys(){return managerCards().map(managerKey).filter(Boolean)}
function reorderTo(key,targetKey){
 if(!key||!targetKey||key===targetKey)return;
 let keys=currentManagerKeys(),from=keys.indexOf(key),to=keys.indexOf(targetKey);
 if(from<0||to<0||from===to)return;
 const direction=from>to?-1:1;
 let guard=0;
 while(from!==to&&guard++<50){
  const btn=moveButton(key,direction);
  if(!btn)break;
  btn.click();
  keys=currentManagerKeys();from=keys.indexOf(key);to=keys.indexOf(targetKey);
 }
}
function markDraggable(){
 const p=page();if(!p)return;
 managerCards().forEach(card=>{
  if(card.dataset.slDragReady)return;
  card.dataset.slDragReady='1';
  card.draggable=true;
  card.classList.add('sl-draggable-column');
  const label=card.querySelector('.ka-teacher-list-column__top label');
  if(label)label.title='Uzun basıp / sürükleyip sütunun yerini değiştirin';
  card.addEventListener('dragstart',e=>{
   const k=managerKey(card);if(!k)return;
   drag={source:k,kind:'manager'};
   card.classList.add('sl-dragging');
   try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',k)}catch(_){}
  });
  card.addEventListener('dragover',e=>{if(!drag)return;e.preventDefault();card.classList.add('sl-drag-over')});
  card.addEventListener('dragleave',()=>card.classList.remove('sl-drag-over'));
  card.addEventListener('drop',e=>{
   e.preventDefault();card.classList.remove('sl-drag-over');
   const target=managerKey(card),source=drag?.source;cleanupDrag();
   if(source&&target&&source!==target)reorderTo(source,target);
  });
  card.addEventListener('dragend',cleanupDrag);
 });

 // Mobil: pointer tabanlı uzun bas + sürükle. Buton/input gibi etkileşimleri engelle.
 managerCards().forEach(card=>{
  if(card.dataset.slTouchReady)return;
  card.dataset.slTouchReady='1';
  let timer=null,startX=0,startY=0,active=false;
  card.addEventListener('pointerdown',e=>{
   if(e.pointerType==='mouse'||e.target.closest('button,input,select,label'))return;
   startX=e.clientX;startY=e.clientY;active=false;
   timer=setTimeout(()=>{active=true;drag={source:managerKey(card),kind:'touch'};card.classList.add('sl-dragging');card.setPointerCapture?.(e.pointerId)},420);
  });
  card.addEventListener('pointermove',e=>{
   if(timer&&!active&&(Math.abs(e.clientX-startX)>8||Math.abs(e.clientY-startY)>8)){clearTimeout(timer);timer=null}
   if(!active||!drag)return;
   e.preventDefault();
   const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('.ka-teacher-list-column');
   managerCards().forEach(c=>c.classList.toggle('sl-drag-over',c===hit));
  },{passive:false});
  const finish=e=>{
   if(timer){clearTimeout(timer);timer=null}
   if(!active)return;
   const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('.ka-teacher-list-column');
   const target=hit?managerKey(hit):'';const source=drag?.source;cleanupDrag();
   if(source&&target&&source!==target)reorderTo(source,target);
  };
  card.addEventListener('pointerup',finish);
  card.addEventListener('pointercancel',()=>{if(timer)clearTimeout(timer);timer=null;cleanupDrag()});
 });

 // Önizlemede de başlıklar sürüklenebilir.
 const headers=[...p.querySelectorAll('[data-sl-preview-col]')].filter(th=>!th.querySelector('[data-sl-resize]')?.matches(':active'));
 headers.forEach(th=>{
  if(th.dataset.slHeaderDragReady)return;
  th.dataset.slHeaderDragReady='1';
  th.draggable=true;
  th.addEventListener('dragstart',e=>{
   const k=th.dataset.slPreviewCol;drag={source:k,kind:'preview'};
   th.classList.add('sl-dragging');
   try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',k)}catch(_){}
  });
  th.addEventListener('dragover',e=>{if(!drag)return;e.preventDefault();th.classList.add('sl-drag-over')});
  th.addEventListener('dragleave',()=>th.classList.remove('sl-drag-over'));
  th.addEventListener('drop',e=>{
   e.preventDefault();th.classList.remove('sl-drag-over');
   const target=th.dataset.slPreviewCol,source=drag?.source;cleanupDrag();
   if(source&&target&&source!==target)reorderTo(source,target);
  });
  th.addEventListener('dragend',cleanupDrag);
 });
}
function cleanupDrag(){
 drag=null;
 page()?.querySelectorAll('.sl-dragging,.sl-drag-over').forEach(el=>el.classList.remove('sl-dragging','sl-drag-over'));
}
function install(){
 if(rootObserver)return;
 const r=root();if(!r)return;
 rootObserver=new MutationObserver(()=>requestAnimationFrame(markDraggable));
 rootObserver.observe(r,{childList:true,subtree:true});
 markDraggable();
}
function uninstall(){try{rootObserver?.disconnect()}catch(_){}rootObserver=null;cleanupDrag()}

global.StudentListLiveEnhancer={install,uninstall,refresh:markDraggable};
install();
})(window);
