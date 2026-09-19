/* Koruk Asistan — Servis Oturma Grid Editörü v2
 * Tablo tabanlı servis şablonu:
 * - Hücre bazlı Koltuk / Kapı / Şoför / Sil
 * - Çoklu hücre seçimi + Birleştir / Ayır
 * - Sütun genişliğini parmak/mouse ile sürükleyerek ayarlama
 * - Satır / sütun ekleme-silme
 * - Öğrenci atama
 * - Grid şablonunu servis planıyla birlikte saklama
 */
(function(global){
'use strict';
if(global.GridSeatingEditor)return;

const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=m=>global.toast?.(m);
const serviceName=s=>s?.servisAdi||s?.guzergah||s?.plaka||'Servis';
const students=sid=>arr('veliler').filter(v=>String(v.servisId||'')===String(sid||'')).slice().sort((a,b)=>String(a.ogrenciAdi||'').localeCompare(String(b.ogrenciAdi||''),'tr'));
const canEdit=()=>{const u=global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};if(u.admin!==true&&(u.bagliOgretmenId||u.ogretmenId))return false;return !global.PermissionService||global.PermissionService.can('transport.seating.edit','edit')};
const cell=()=>({type:'empty',studentId:null});
const cloneCell=x=>({type:x?.type||'empty',studentId:x?.studentId||null,...(x?.rowSpan>1?{rowSpan:x.rowSpan}:{}),...(x?.colSpan>1?{colSpan:x.colSpan}:{}),...(x?.masterR!=null?{masterR:x.masterR,masterC:x.masterC}:{})});
const isCovered=x=>x?.type==='merged';

function defaultGrid(){
 const g=Array.from({length:6},()=>Array.from({length:4},cell));
 g[0][0]={type:'driver',studentId:null};
 [[0,1],[0,2],[1,0],[1,1],[2,0],[2,1],[2,2],[3,0],[3,1],[3,2],[4,0],[4,1],[4,2],[5,0],[5,1],[5,2]].forEach(([r,c])=>g[r][c]={type:'seat',studentId:null});
 g[1][3]={type:'door',studentId:null};
 return g;
}

function normalizeGrid(g){
 if(!Array.isArray(g)||!g.length)return defaultGrid();
 const cols=Math.max(1,...g.map(r=>Array.isArray(r)?r.length:0));
 const out=g.map(r=>{const row=Array.from({length:cols},cell);(Array.isArray(r)?r:[]).forEach((x,c)=>row[c]=cloneCell(x));return row});
 return out;
}

function gridFromLegacy(plan){
 if(plan?.grid&&Array.isArray(plan.grid))return normalizeGrid(plan.grid);
 if(!plan)return defaultGrid();
 if(Array.isArray(plan.elements)&&plan.elements.length){
  const rows=new Map();
  plan.elements.forEach((el,idx)=>{const r=Number(el.row??0);if(!rows.has(r))rows.set(r,[]);rows.get(r).push({el,idx})});
  const sorted=[...rows.entries()].sort((a,b)=>a[0]-b[0]);
  const cols=Math.max(1,...sorted.map(([,x])=>x.length));
  const g=sorted.map(([,items])=>{
   const row=Array.from({length:cols},cell);
   items.forEach((x,c)=>{const e=x.el,p=e.properties||{};row[c]={type:e.type==='sofor'||p.soforYani?'driver':e.type==='kapi'||p.kapiSag||p.konum==='kapi'?'door':e.visible===false?'empty':'seat',studentId:e.studentId||null}});
   return row;
  });
  return normalizeGrid(g);
 }
 const yer=Array.isArray(plan.yerlesim)?plan.yerlesim:[], kol=Array.isArray(plan.koltuklar)?plan.koltuklar:[];
 if(!yer.length)return defaultGrid();
 const rowMap=new Map();
 yer.forEach((y,idx)=>{const r=Number(y.sira??0);if(!rowMap.has(r))rowMap.set(r,[]);rowMap.get(r).push({y,idx})});
 let seatNo=0;
 const rows=[...rowMap.entries()].sort((a,b)=>a[0]-b[0]);
 const cols=Math.max(1,...rows.map(([,x])=>x.length));
 return rows.map(([,items])=>{
  const row=Array.from({length:cols},cell);
  items.forEach((x,c)=>{const y=x.y;if(y.soforYani)row[c]={type:'driver',studentId:null};else if(y.kapiSag||y.konum==='kapi')row[c]={type:'door',studentId:null};else{seatNo++;const k=kol.find(z=>Number(z.no)===seatNo);row[c]={type:'seat',studentId:k?.ogrenciId||null}}});
  return row;
 });
}

function seatNumbers(g){
 const m={};let n=0;
 g.forEach((r,ri)=>r.forEach((x,ci)=>{if(x.type==='seat')m[ri+','+ci]=++n}));
 return m;
}
function stats(g){
 let total=0,filled=0;
 g.forEach(r=>r.forEach(x=>{if(x.type==='seat'){total++;if(x.studentId)filled++}}));
 return{total,filled,empty:total-filled};
}
function selectionBounds(){
 const a=[...state.selected];
 if(!a.length)return null;
 const pts=a.map(k=>k.split(',').map(Number));
 const minR=Math.min(...pts.map(p=>p[0])),maxR=Math.max(...pts.map(p=>p[0]),minR);
 const minC=Math.min(...pts.map(p=>p[1])),maxC=Math.max(...pts.map(p=>p[1]),minC);
 return{minR,maxR,minC,maxC};
}
function selectionIsRectangle(){
 const b=selectionBounds();if(!b)return false;
 for(let r=b.minR;r<=b.maxR;r++)for(let c=b.minC;c<=b.maxC;c++)if(!state.selected.has(r+','+c))return false;
 return true;
}
function anchorOf(r,c){
 const x=state.grid[r]?.[c];
 if(!x)return null;
 return x.type==='merged'?[x.masterR,x.masterC]:[r,c];
}

function cellHtml(x,r,c,nums,tool){
 const key=r+','+c;
 if(isCovered(x))return '';
 const selected=state.selected.has(key);
 const spanR=x.rowSpan>1?' rowspan="'+x.rowSpan+'"':'';
 const spanC=x.colSpan>1?' colspan="'+x.colSpan+'"':'';
 const cls='gse-cell '+(selected?'gse-selected ':'')+(x.type==='empty'?'gse-empty':x.type==='door'?'gse-door':x.type==='driver'?'gse-driver':'gse-seat '+(x.studentId?'gse-filled':''));
 if(x.type==='empty'){
  const icon={seat:'ti-armchair',door:'ti-door',driver:'ti-steering-wheel'}[tool]||'';
  return '<td class="'+cls+'" data-r="'+r+'" data-c="'+c+'"'+spanR+spanC+'>'+(icon?'<i class="ti '+icon+' gse-hint"></i>':'')+'</td>';
 }
 if(x.type==='door')return '<td class="'+cls+'" data-r="'+r+'" data-c="'+c+'"'+spanR+spanC+'><i class="ti ti-door"></i><b>Kapı</b></td>';
 if(x.type==='driver')return '<td class="'+cls+'" data-r="'+r+'" data-c="'+c+'"'+spanR+spanC+'><i class="ti ti-steering-wheel"></i><b>Şoför</b></td>';
 const st=state.students.find(s=>s.id===x.studentId),name=st?.ogrenciAdi||'';
 return '<td class="'+cls+'" data-r="'+r+'" data-c="'+c+'"'+spanR+spanC+'><span class="gse-no">'+(nums[key]||'')+'</span><i class="ti ti-armchair"></i>'+(name?'<span class="gse-name">'+esc(name)+'</span>':'')+(x.colSpan>1||x.rowSpan>1?'<small class="gse-merged-badge">↔ '+(x.colSpan||1)+' × ↕ '+(x.rowSpan||1)+'</small>':'')+'</td>';
}
function gridHtml(g,tool){
 const nums=seatNumbers(g);
 let html='<table class="gse-table"><colgroup>';
 const widths=state.colWidths||[];
 for(let c=0;c<(g[0]?.length||1);c++)html+='<col style="width:'+Math.max(54,Number(widths[c]||82))+'px">';
 html+='</colgroup><thead><tr><th></th>';
 for(let c=0;c<(g[0]?.length||1);c++)html+='<th class="gse-col-head" data-col="'+c+'"><span>'+String.fromCharCode(65+c)+'</span><i class="gse-resizer" data-resize-col="'+c+'"></i></th>';
 html+='</tr></thead><tbody>';
 g.forEach((row,r)=>{
  html+='<tr>';
  let emitted=false;
  row.forEach((x,c)=>{
   if(isCovered(x))return;
   html+=cellHtml(x,r,c,nums,tool);emitted=true;
  });
  html+='</tr>';
 });
 return html+'</tbody></table>';
}

let state=null;

function pickerHtml(r,c){
 const x=state.grid[r][c],nums=seatNumbers(state.grid),no=nums[r+','+c]||'?',current=state.students.find(s=>s.id===x.studentId);
 const assigned={};state.grid.forEach((row,ri)=>row.forEach((cl,ci)=>{if(cl.studentId)assigned[cl.studentId]=nums[ri+','+ci]}));
 const items=state.students.map(s=>{const taken=assigned[s.id]&&s.id!==x.studentId;return '<button class="gse-pick '+(s.id===x.studentId?'active ':'')+(taken?'taken':'')+'" data-id="'+esc(s.id)+'" '+(taken?'disabled':'')+'>'+esc(s.ogrenciAdi)+(s.sinifAdi?' <small>'+esc(s.sinifAdi)+'</small>':'')+(assigned[s.id]?'<em>'+assigned[s.id]+'. koltuk</em>':'')+'</button>'}).join('')||'<span class="gse-muted">Bu serviste öğrenci yok.</span>';
 return '<div class="gse-picker"><div class="gse-picker-head"><b>'+no+'. koltuk'+(current?' — '+esc(current.ogrenciAdi):'')+'</b><button id="gse-pick-close">×</button></div><div class="gse-pick-list">'+items+'</div><button id="gse-pick-clear" class="gse-clear">Koltuğu boşalt</button></div>';
}
function closePicker(){document.getElementById('gsePickerArea')?.replaceChildren()}
function openPicker(r,c){
 const a=document.getElementById('gsePickerArea');if(!a)return;
 a.innerHTML=pickerHtml(r,c);
 a.querySelector('#gse-pick-close').onclick=closePicker;
 a.querySelector('#gse-pick-clear').onclick=()=>{state.grid[r][c].studentId=null;closePicker();renderGrid()};
 a.querySelectorAll('.gse-pick:not([disabled])').forEach(b=>b.onclick=()=>{const id=b.dataset.id;state.grid.forEach(row=>row.forEach(cl=>{if(cl.studentId===id)cl.studentId=null}));state.grid[r][c].studentId=id;closePicker();renderGrid()});
}

function onCell(r,c){
 if(!state)return;
 const actual=anchorOf(r,c)||[r,c],rr=actual[0],cc=actual[1],x=state.grid[rr][cc];
 if(!state.editable)return;
 if(state.tool==='select'){state.selected.has(rr+','+cc)?state.selected.delete(rr+','+cc):state.selected.add(rr+','+cc);renderGrid();return}
 if(state.tool==='seat'&&x.type==='seat'){openPicker(rr,cc);return}
 closePicker();
 if(state.tool==='seat'){x.type='seat';x.studentId=null}
 else if(state.tool==='door'){x.type=x.type==='door'?'empty':'door';x.studentId=null}
 else if(state.tool==='driver'){x.type=x.type==='driver'?'empty':'driver';x.studentId=null}
 else if(state.tool==='erase'){x.type='empty';x.studentId=null;x.rowSpan=undefined;x.colSpan=undefined}
 renderGrid();
}

function bindGrid(){
 document.querySelectorAll('#gseGridWrap .gse-cell').forEach(td=>td.onclick=()=>onCell(+td.dataset.r,+td.dataset.c));
 document.querySelectorAll('#gseGridWrap .gse-resizer').forEach(handle=>{
  const start=e=>{
   e.preventDefault();e.stopPropagation();
   const col=+handle.dataset.resizeCol,startX=(e.touches?e.touches[0].clientX:e.clientX),base=Number(state.colWidths[col]||82);
   const move=ev=>{const x=ev.touches?ev.touches[0].clientX:ev.clientX;state.colWidths[col]=Math.max(54,Math.min(260,base+(x-startX)));renderGrid()};
   const end=()=>{document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',end);document.removeEventListener('touchmove',move);document.removeEventListener('touchend',end)};
   document.addEventListener('mousemove',move,{passive:false});document.addEventListener('mouseup',end);document.addEventListener('touchmove',move,{passive:false});document.addEventListener('touchend',end);
  };
  handle.addEventListener('mousedown',start);handle.addEventListener('touchstart',start,{passive:false});
 });
}

function renderGrid(){
 const w=document.getElementById('gseGridWrap');if(w)w.innerHTML=gridHtml(state.grid,state.tool);
 const s=stats(state.grid),st=document.getElementById('gseStats');
 if(st)st.innerHTML='<b>'+s.total+'</b> koltuk <b>'+s.filled+'</b> dolu <b>'+s.empty+'</b> boş <b>'+state.grid.length+' × '+(state.grid[0]?.length||0)+'</b> <span>Seçili: <b>'+state.selected.size+'</b></span>';
 updateMergeButtons();bindGrid();
}
function updateMergeButtons(){
 const ok=state?.selected.size>=2&&selectionIsRectangle();
 document.getElementById('gse-merge')?.toggleAttribute('disabled',!ok);
 const un=state?.selected.size>0&&[...state.selected].some(k=>state.grid[+k.split(',')[0]][+k.split(',')[1]].type==='merged'||state.grid[+k.split(',')[0]][+k.split(',')[1]].rowSpan>1||state.grid[+k.split(',')[0]][+k.split(',')[1]].colSpan>1);
 document.getElementById('gse-unmerge')?.toggleAttribute('disabled',!un);
}

function mergeSelected(){
 if(!selectionIsRectangle()||state.selected.size<2){toast('Birleştirmek için dikdörtgen bir alan seçin.');return}
 const b=selectionBounds();let nonEmpty=[];
 for(let r=b.minR;r<=b.maxR;r++)for(let c=b.minC;c<=b.maxC;c++){const x=state.grid[r][c];if(x.type!=='empty'&&x.type!=='merged')nonEmpty.push([r,c,x])}
 if(nonEmpty.length>1){toast('Birleştirmeden önce seçili alanda yalnızca bir dolu hücre bırakın.');return}
 const anchor=state.grid[b.minR][b.minC];
 const keep=nonEmpty[0]?.[2]||anchor;
 for(let r=b.minR;r<=b.maxR;r++)for(let c=b.minC;c<=b.maxC;c++){
  if(r===b.minR&&c===b.minC)continue;
  state.grid[r][c]={type:'merged',studentId:null,masterR:b.minR,masterC:b.minC};
 }
 state.grid[b.minR][b.minC]=cloneCell(keep);
 state.grid[b.minR][b.minC].rowSpan=b.maxR-b.minR+1;
 state.grid[b.minR][b.minC].colSpan=b.maxC-b.minC+1;
 state.selected.clear();renderGrid();
}
function unmergeSelected(){
 const targets=new Set();
 state.selected.forEach(k=>{const [r,c]=k.split(',').map(Number),a=anchorOf(r,c);if(a)targets.add(a[0]+','+a[1])});
 targets.forEach(k=>{
  const [r,c]=k.split(',').map(Number),x=state.grid[r][c],rs=x.rowSpan||1,cs=x.colSpan||1;
  for(let rr=r;rr<r+rs;rr++)for(let cc=c;cc<c+cs;cc++)if(rr!==r||cc!==c)state.grid[rr][cc]=cell();
  delete x.rowSpan;delete x.colSpan;state.grid[r][c]=x;
 });
 state.selected.clear();renderGrid();
}

function gridToLegacy(g){
 const elements=[],yerlesim=[];let no=0;
 g.forEach((row,r)=>row.forEach((x,c)=>{
  if(x.type==='empty'||x.type==='merged')return;
  const isSeat=x.type==='seat';if(isSeat)no++;
  const p={konum:x.type==='door'?'kapi':x.type==='driver'?'sofor':(c===0?'sol-dis':c===1?'sol-ic':c===2?'sag-ic':'sag-dis'),kapiSag:x.type==='door',soforYani:x.type==='driver',studentName:'',stop:'',note:'',reserved:false};
  if(x.rowSpan>1)p.rowSpan=x.rowSpan;if(x.colSpan>1)p.colSpan=x.colSpan;
  elements.push({id:'el_'+r+'_'+c,type:x.type==='driver'?'sofor':'koltuk',seatNumber:isSeat?no:null,studentId:x.studentId||null,row:r,column:c,locked:false,visible:true,color:null,properties:p});
  yerlesim.push({sira:r,konum:p.konum,aktif:true,kapiSag:p.kapiSag,soforYani:p.soforYani,rowSpan:x.rowSpan||1,colSpan:x.colSpan||1});
 }));
 return{elements,yerlesim,semaVersiyon:2,guncellendi:new Date().toISOString()};
}

function css(){
 return '<style>'+
 '.gse-wrap{font-family:var(--font-sans,system-ui);color:var(--text-primary)}'+
 '.gse-toolbar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:4px 0 12px}.gse-toolbar button{font:inherit;font-size:13px;padding:8px 11px;border:1px solid var(--border);border-radius:10px;background:transparent;color:var(--text-primary);touch-action:manipulation}.gse-toolbar .active{background:var(--bg-accent);color:var(--text-accent);border-color:var(--border-accent)}.gse-toolbar button:disabled{opacity:.38;cursor:not-allowed}.gse-toolbar .layout-btn{background:var(--surface-1)}'+
 '.gse-stats{display:flex;gap:16px;flex-wrap:wrap;padding:9px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);font-size:13px;color:var(--text-secondary)}.gse-stats b{color:var(--text-primary);font-weight:600}'+
 '.gse-grid-wrap{overflow:auto;margin:12px 0;padding-bottom:6px}.gse-table{border-collapse:collapse;table-layout:fixed;min-width:max-content}.gse-table col{transition:width .05s}.gse-table th{height:26px;background:var(--surface-1);border:1px solid var(--border);font-size:11px;color:var(--text-muted);position:relative;user-select:none}.gse-col-head{min-width:54px}.gse-resizer{position:absolute;right:-3px;top:0;width:7px;height:100%;cursor:col-resize;z-index:5}.gse-resizer:after{content:"";position:absolute;left:2px;top:7px;height:12px;border-left:2px dotted var(--text-muted);opacity:.5}.gse-cell{width:100%;height:74px;border:1px solid var(--border);text-align:center;vertical-align:middle;position:relative;padding:4px;box-sizing:border-box;overflow:hidden;cursor:pointer}.gse-empty{background:var(--surface-1)}.gse-hint{opacity:.15;font-size:22px}.gse-seat{background:var(--surface-2)}.gse-seat.gse-filled{background:var(--bg-accent)}.gse-seat .ti{display:block;font-size:21px;color:var(--text-muted);margin:2px auto}.gse-filled .ti{color:var(--text-accent)}.gse-no{position:absolute;top:5px;left:6px;font-size:10px;color:var(--text-muted)}.gse-name{display:block;font-size:11px;line-height:1.12;font-weight:700;white-space:normal;overflow-wrap:anywhere;word-break:normal}.gse-door{background:var(--bg-warning);color:var(--text-warning)}.gse-door .ti,.gse-driver .ti{font-size:21px;display:block}.gse-door b,.gse-driver b{font-size:11px}.gse-driver{background:var(--bg-success);color:var(--text-success)}'+
 '.gse-selected{outline:3px solid var(--border-accent);outline-offset:-3px;box-shadow:inset 0 0 0 999px rgba(0,120,255,.10)}.gse-merged-badge{display:block;margin-top:3px;color:var(--text-accent);font-size:9px}'+
 '.gse-picker{margin-top:10px;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2)}.gse-picker-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.gse-picker-head button{border:0;background:transparent;font-size:22px}.gse-pick-list{display:flex;flex-wrap:wrap;gap:6px;max-height:240px;overflow:auto}.gse-pick{border:1px solid var(--border);border-radius:9px;background:var(--surface-1);padding:8px 10px;color:var(--text-primary)}.gse-pick.active{background:var(--bg-accent)}.gse-pick.taken{opacity:.35}.gse-pick small,.gse-pick em{display:block;font-size:10px;color:var(--text-muted);font-style:normal}.gse-clear{margin-top:10px;border:1px solid var(--border-danger);color:var(--text-danger);background:transparent;border-radius:8px;padding:7px 10px}.gse-footer{display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--border)}.gse-footer button{flex:1;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--surface-1);color:var(--text-primary);font-weight:600}.gse-footer .save{background:var(--bg-accent);color:var(--text-accent);border-color:var(--border-accent)}.gse-muted{color:var(--text-muted)}'+
 '@media(max-width:600px){.gse-cell{height:70px}.gse-name{font-size:10px}.gse-toolbar button{padding:7px 9px}.gse-resizer{width:12px;right:-6px}.gse-col-head{height:30px}}'+
 '</style>';
}

function shell(s){
 const st=stats(state.grid);
 return css()+'<div class="gse-wrap"><div class="gse-toolbar">'+
 '<span style="font-size:12px;color:var(--text-muted)">Araç:</span>'+
 '<button id="gse-seat" class="active">💺 Koltuk</button><button id="gse-door">🚪 Kapı</button><button id="gse-driver">🎯 Şoför</button><button id="gse-erase">⌫ Sil</button>'+
 '<button id="gse-select" class="layout-btn">☑ Seç</button><button id="gse-merge" class="layout-btn" disabled>🔗 Birleştir</button><button id="gse-unmerge" class="layout-btn" disabled>⛓ Ayır</button>'+
 '<button id="gse-add-row">＋ Satır</button><button id="gse-del-row">− Satır</button><button id="gse-add-col">＋ Sütun</button><button id="gse-del-col">− Sütun</button><button id="gse-clear">🗑 Temizle</button>'+
 '</div><div class="gse-stats" id="gseStats"><b>'+st.total+'</b> koltuk <b>'+st.filled+'</b> dolu <b>'+st.empty+'</b> boş <b>'+state.grid.length+' × '+(state.grid[0]?.length||0)+'</b> <span>Seçili: <b>0</b></span></div>'+
 '<div id="gseGridWrap" class="gse-grid-wrap">'+gridHtml(state.grid,state.tool)+'</div><div id="gsePickerArea"></div>'+
 '<div class="gse-footer">'+(state.editable?'<button id="gse-cancel">Vazgeç</button><button id="gse-save" class="save">💾 Kaydet</button>':'<button id="gse-cancel">Kapat</button>')+'</div></div>';
}

function render(s){
 const old=document.getElementById('gseOverlay');if(old)old.remove();
 const ov=document.createElement('div');ov.id='gseOverlay';ov.className='ka-modal-backdrop';
 const box=document.createElement('div');box.className='ka-modal';box.style.cssText='width:min(96vw,760px);max-height:92vh;overflow:auto';
 box.innerHTML='<div class="ka-modal__header"><div><h2>💺 Oturma Planı — '+esc(serviceName(s))+'</h2><small>'+esc(s.plaka||'')+'</small></div><button class="ka-icon-button" id="gse-close">×</button></div><div class="ka-modal__body">'+shell(s)+'</div>';
 ov.appendChild(box);document.body.appendChild(ov);
 const tools={seat:'gse-seat',door:'gse-door',driver:'gse-driver',erase:'gse-erase',select:'gse-select'};
 Object.entries(tools).forEach(([t,id])=>document.getElementById(id)?.addEventListener('click',()=>{state.tool=t;Object.values(tools).forEach(x=>document.getElementById(x)?.classList.remove('active'));document.getElementById(id)?.classList.add('active');renderGrid()}));
 document.getElementById('gse-merge')?.addEventListener('click',mergeSelected);
 document.getElementById('gse-unmerge')?.addEventListener('click',unmergeSelected);
 document.getElementById('gse-add-row')?.addEventListener('click',()=>{const cols=state.grid[0]?.length||4;state.grid.push(Array.from({length:cols},cell));state.selected.clear();renderGrid()});
 document.getElementById('gse-del-row')?.addEventListener('click',()=>{if(state.grid.length>1)state.grid.pop();state.selected.clear();renderGrid()});
 document.getElementById('gse-add-col')?.addEventListener('click',()=>{state.grid.forEach(r=>r.push(cell()));state.colWidths.push(82);state.selected.clear();renderGrid()});
 document.getElementById('gse-del-col')?.addEventListener('click',()=>{if((state.grid[0]?.length||0)>1){state.grid.forEach(r=>r.pop());state.colWidths.pop();state.selected.clear();renderGrid()}});
 document.getElementById('gse-clear')?.addEventListener('click',()=>{if(confirm('Tüm hücreleri temizlemek istiyor musunuz?')){state.grid=state.grid.map(r=>r.map(cell));state.selected.clear();renderGrid()}});
 document.getElementById('gse-close')?.addEventListener('click',close);
 document.getElementById('gse-cancel')?.addEventListener('click',close);
 document.getElementById('gse-save')?.addEventListener('click',async()=>{
  const b=document.getElementById('gse-save');b.disabled=true;b.textContent='Kaydediliyor…';
  try{
   const plan=gridToLegacy(state.grid);
   plan.grid=state.grid;
   plan.colWidths=state.colWidths;
   plan.rowHeights=state.rowHeights;
   plan.sablon='ozel';
   await global.ServisOturmaService?.planKaydet?.(state.servisId,plan,false);
   toast('Oturma planı kaydedildi.');close();global.TransportModule?.render?.();
  }catch(e){b.disabled=false;b.textContent='💾 Kaydet';toast('Kayıt hatası: '+(e?.message||e))}
 });
 bindGrid();
}
function close(){document.getElementById('gseOverlay')?.remove();state=null}
function open(servisId){
 const s=arr('servisler').find(x=>x.id===servisId);if(!s)return;
 const raw=global.DeviceData?.get?.('servisOturma',servisId)||{};
 state={servisId,grid:gridFromLegacy(raw),tool:'seat',editable:canEdit(),students:students(servisId),selected:new Set(),colWidths:Array.isArray(raw.colWidths)?raw.colWidths.slice():[],rowHeights:Array.isArray(raw.rowHeights)?raw.rowHeights.slice():[]};
 const cols=state.grid[0]?.length||4;while(state.colWidths.length<cols)state.colWidths.push(82);
 state.colWidths=state.colWidths.slice(0,cols);
 render(s);
}
if(global.TransportModule)global.TransportModule={...global.TransportModule,openBusEditor:open};
global.GridSeatingEditor={open,close};
})(window);
