/* Öğrenci Liste Oluşturucu — canlı sütun sıralama eklentisi.
 * Ana StudentListPage state'ine dokunmadan mevcut ↑/↓ kontrollerini kullanır.
 * Böylece sürükle-bırak sıralama, mevcut kaydet/şablon/PDF akışlarıyla aynı state'i paylaşır.
 */
(function(global){
'use strict';
if(global.StudentListLiveEnhancer)return;
let rootObserver=null,drag=null;
function root(){return document.getElementById('v2ModuleRoot')}
function page(){return root()?.querySelector('[data-student-list-page]')||null}
function managerCards(){return [...(page()?.querySelectorAll('.ka-teacher-list-column')||[])].filter(x=>x.querySelector('[data-sl-move]'))}
function managerKey(card){return card.querySelector('[data-key]')?.dataset?.key||''}
function moveButton(key,direction){return managerCards().find(c=>managerKey(c)===key)?.querySelector(`[data-sl-move="${direction}"]`)||null}
function currentManagerKeys(){return managerCards().map(managerKey).filter(Boolean)}
function reorderTo(key,targetKey){
 if(!key||!targetKey||key===targetKey)return;
 let keys=currentManagerKeys(),from=keys.indexOf(key),to=keys.indexOf(targetKey);
 if(from<0||to<0||from===to)return;
 const direction=from>to?-1:1;let guard=0;
 while(from!==to&&guard++<50){const btn=moveButton(key,direction);if(!btn)break;btn.click();keys=currentManagerKeys();from=keys.indexOf(key);to=keys.indexOf(targetKey)}
}
function installStyles(){
 if(document.getElementById('student-list-dnd-style'))return;
 const s=document.createElement('style');s.id='student-list-dnd-style';s.textContent=`
 .sl-draggable-column{transition:opacity .12s,transform .12s,box-shadow .12s}
 .sl-draggable-column.sl-dragging{opacity:.55;transform:scale(.99)}
 .sl-draggable-column.sl-drag-over{box-shadow:inset 0 0 0 2px var(--brand,#2b8f6a);border-radius:12px}
 .sl-preview-col.sl-dragging{opacity:.55}
 .sl-preview-col.sl-drag-over{box-shadow:inset 2px 0 0 var(--brand,#2b8f6a)}
 .sl-preview-dragging{touch-action:none!important}
 .sl-drag-ghost{position:fixed;pointer-events:none;z-index:99999;opacity:.9;padding:8px 12px;border-radius:10px;background:var(--surface,#10201b);border:1px solid var(--brand,#2b8f6a);box-shadow:0 8px 24px rgba(0,0,0,.25);font-weight:700;font-size:13px;transform:translate(-50%,-50%);display:none}
 `;document.head.appendChild(s);
}
function ghost(){
 let g=document.getElementById('sl-drag-ghost');
 if(!g){g=document.createElement('div');g.id='sl-drag-ghost';g.className='sl-drag-ghost';document.body.appendChild(g)}
 return g;
}
function startTouch(source,kind,label,event){
 drag={source,kind,touch:true,pointerId:event.pointerId};
 const g=ghost();g.textContent=label||'Sütun';g.style.display='block';g.style.left=`${event.clientX}px`;g.style.top=`${event.clientY}px`;
 document.body.classList.add('sl-preview-dragging');
}
function updateTouch(event){
 if(!drag?.touch)return;
 event.preventDefault();
 const g=ghost();g.style.left=`${event.clientX}px`;g.style.top=`${event.clientY}px`;
 const hit=document.elementFromPoint(event.clientX,event.clientY);
 const target=hit?.closest('.ka-teacher-list-column,[data-sl-preview-col]');
 page()?.querySelectorAll('.sl-drag-over').forEach(el=>el.classList.remove('sl-drag-over'));
 if(target)target.classList.add('sl-drag-over');
}
function finishTouch(event){
 if(!drag?.touch)return;
 const hit=document.elementFromPoint(event.clientX,event.clientY);
 const target=hit?.closest('.ka-teacher-list-column,[data-sl-preview-col]');
 const targetKey=target?.dataset?.slPreviewCol||managerKey(target)||'';
 const source=drag.source;cleanupDrag();
 if(source&&targetKey&&source!==targetKey)reorderTo(source,targetKey);
}
function cleanupDrag(){
 drag=null;
 document.body.classList.remove('sl-preview-dragging');
 const g=document.getElementById('sl-drag-ghost');if(g)g.style.display='none';
 page()?.querySelectorAll('.sl-dragging,.sl-drag-over').forEach(el=>el.classList.remove('sl-dragging','sl-drag-over'));
}
function bindManagerCard(card){
 if(card.dataset.slDragReady)return;
 card.dataset.slDragReady='1';card.draggable=true;card.classList.add('sl-draggable-column');
 const label=card.querySelector('.ka-teacher-list-column__top label');if(label)label.title='Uzun basıp / sürükleyip sütunun yerini değiştirin';
 card.addEventListener('dragstart',e=>{if(e.target.closest('button,input,select,label')){e.preventDefault();return}const k=managerKey(card);if(!k)return;drag={source:k,kind:'manager'};card.classList.add('sl-dragging');try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',k)}catch(_){} });
 card.addEventListener('dragover',e=>{if(!drag)return;e.preventDefault();card.classList.add('sl-drag-over')});
 card.addEventListener('dragleave',()=>card.classList.remove('sl-drag-over'));
 card.addEventListener('drop',e=>{e.preventDefault();card.classList.remove('sl-drag-over');const target=managerKey(card),source=drag?.source;cleanupDrag();if(source&&target&&source!==target)reorderTo(source,target)});
 card.addEventListener('dragend',cleanupDrag);
 let timer=null,startX=0,startY=0,active=false;
 card.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'||e.target.closest('button,input,select,label'))return;
  startX=e.clientX;startY=e.clientY;active=false;
  timer=setTimeout(()=>{active=true;startTouch(managerKey(card),'manager',columnText(card),e);card.setPointerCapture?.(e.pointerId)},420);
 });
 card.addEventListener('pointermove',e=>{
  if(timer&&!active&&(Math.abs(e.clientX-startX)>8||Math.abs(e.clientY-startY)>8)){clearTimeout(timer);timer=null}
  if(active)updateTouch(e);
 },{passive:false});
 card.addEventListener('pointerup',e=>{if(timer){clearTimeout(timer);timer=null}if(active)finishTouch(e);active=false});
 card.addEventListener('pointercancel',()=>{if(timer)clearTimeout(timer);timer=null;active=false;cleanupDrag()});
}
function columnText(el){return el?.querySelector('strong')?.textContent?.trim()||el?.querySelector('span')?.textContent?.trim()||'Sütun'}
function bindPreviewHeader(th){
 if(th.dataset.slHeaderDragReady)return;
 th.dataset.slHeaderDragReady='1';th.draggable=true;
 th.addEventListener('dragstart',e=>{if(e.target.closest('[data-sl-resize],input,button,select')){e.preventDefault();return}const k=th.dataset.slPreviewCol;if(!k)return;drag={source:k,kind:'preview'};th.classList.add('sl-dragging');try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',k)}catch(_){} });
 th.addEventListener('dragover',e=>{if(!drag)return;e.preventDefault();th.classList.add('sl-drag-over')});
 th.addEventListener('dragleave',()=>th.classList.remove('sl-drag-over'));
 th.addEventListener('drop',e=>{e.preventDefault();th.classList.remove('sl-drag-over');const target=th.dataset.slPreviewCol,source=drag?.source;cleanupDrag();if(source&&target&&source!==target)reorderTo(source,target)});
 th.addEventListener('dragend',cleanupDrag);
 let timer=null,startX=0,startY=0,active=false;
 th.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'||e.target.closest('[data-sl-resize],input,button,select'))return;
  startX=e.clientX;startY=e.clientY;active=false;
  timer=setTimeout(()=>{active=true;startTouch(th.dataset.slPreviewCol,'preview',columnText(th),e);th.setPointerCapture?.(e.pointerId);th.classList.add('sl-dragging')},420);
 });
 th.addEventListener('pointermove',e=>{
  if(timer&&!active&&(Math.abs(e.clientX-startX)>8||Math.abs(e.clientY-startY)>8)){clearTimeout(timer);timer=null}
  if(active)updateTouch(e);
 },{passive:false});
 th.addEventListener('pointerup',e=>{if(timer){clearTimeout(timer);timer=null}if(active)finishTouch(e);active=false});
 th.addEventListener('pointercancel',()=>{if(timer)clearTimeout(timer);timer=null;active=false;cleanupDrag()});
}
function markDraggable(){
 const p=page();if(!p)return;installStyles();
 managerCards().forEach(bindManagerCard);
 p.querySelectorAll('[data-sl-preview-col]').forEach(bindPreviewHeader);
}
function install(){if(rootObserver)return;const r=root();if(!r)return;installStyles();rootObserver=new MutationObserver(()=>requestAnimationFrame(markDraggable));rootObserver.observe(r,{childList:true,subtree:true});markDraggable()}
function uninstall(){try{rootObserver?.disconnect()}catch(_){}rootObserver=null;cleanupDrag()}
global.StudentListLiveEnhancer={install,uninstall,refresh:markDraggable};
install();
})(window);
