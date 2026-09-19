/* Koruk Asistan — Servis Oturma Grid Editörü
 * Hücre tabanlı şablon: Koltuk / Kapı / Şoför / Sil.
 * Satır ve sütun ekleme-silme, öğrenci atama ve rapor desteği.
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

function defaultGrid(){
 const g=Array.from({length:6},()=>Array.from({length:4},cell));
 g[0][0]={type:'driver',studentId:null};
 [[0,1],[0,2],[1,0],[1,1],[2,0],[2,1],[2,2],[3,0],[3,1],[3,2],[4,0],[4,1],[4,2],[5,0],[5,1],[5,2]].forEach(([r,c])=>g[r][c]={type:'seat',studentId:null});
 g[1][3]={type:'door',studentId:null};
 return g;
}

function gridFromLegacy(plan){
 if(!plan)return defaultGrid();
 if(Array.isArray(plan.elements)&&plan.elements.length){
  const rows=new Map();
  plan.elements.forEach((el,idx)=>{const r=Number(el.row??0);if(!rows.has(r))rows.set(r,[]);rows.get(r).push({el,idx})});
  const sorted=[...rows.entries()].sort((a,b)=>a[0]-b[0]);
  const cols=Math.max(1,...sorted.map(([,x])=>x.length));
  return sorted.map(([,items])=>{
   const row=Array.from({length:cols},cell);
   items.forEach((x,c)=>{const e=x.el,p=e.properties||{};row[c]={type:e.type==='sofor'||p.soforYani?'driver':e.type==='kapi'||p.kapiSag||p.konum==='kapi'?'door':e.visible===false?'empty':'seat',studentId:e.studentId||null}});
   return row;
  });
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

function seatNumbers(g){const m={};let n=0;g.forEach((r,ri)=>r.forEach((x,ci)=>{if(x.type==='seat')m[ri+','+ci]=++n}));return m}
function stats(g){let total=0,filled=0;g.forEach(r=>r.forEach(x=>{if(x.type==='seat'){total++;if(x.studentId)filled++}}));return{total,filled,empty:total-filled}}

function cellHtml(x,r,c,nums,tool){
 const key=r+','+c;
 if(x.type==='empty'){const icon={seat:'ti-armchair',door:'ti-door',driver:'ti-steering-wheel'}[tool]||'';return '<td class="gse-cell gse-empty" data-r="'+r+'" data-c="'+c+'">'+(icon?'<i class="ti '+icon+' gse-hint"></i>':'')+'</td>'}
 if(x.type==='door')return '<td class="gse-cell gse-door" data-r="'+r+'" data-c="'+c+'"><i class="ti ti-door"></i><b>Kapı</b></td>';
 if(x.type==='driver')return '<td class="gse-cell gse-driver" data-r="'+r+'" data-c="'+c+'"><i class="ti ti-steering-wheel"></i><b>Şoför</b></td>';
 const st=state?.students.find(s=>s.id===x.studentId),name=st?.ogrenciAdi||'';
 return '<td class="gse-cell gse-seat '+(x.studentId?'gse-filled':'')+'" data-r="'+r+'" data-c="'+c+'"><span class="gse-no">'+(nums[key]||'')+'</span><i class="ti ti-armchair"></i>'+(name?'<span class="gse-name">'+esc(name)+'</span>':'')+'</td>';
}
function gridHtml(g,tool){const nums=seatNumbers(g);return '<table class="gse-table"><tbody>'+g.map((r,ri)=>'<tr>'+r.map((x,ci)=>cellHtml(x,ri,ci,nums,tool)).join('')+'</tr>').join('')+'</tbody></table>'}

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
 const x=state.grid[r][c];
 if(!state.editable){if(x.type==='seat'&&x.studentId){const s=state.students.find(v=>v.id===x.studentId);toast(s?.ogrenciAdi||'Öğrenci')}return}
 if(state.tool==='seat'&&x.type==='seat'){openPicker(r,c);return}
 closePicker();
 if(state.tool==='seat'){x.type='seat';x.studentId=null}
 if(state.tool==='door'){x.type=x.type==='door'?'empty':'door';x.studentId=null}
 if(state.tool==='driver'){x.type=x.type==='driver'?'empty':'driver';x.studentId=null}
 if(state.tool==='erase'){x.type='empty';x.studentId=null}
 renderGrid();
}
function bindGrid(){document.querySelectorAll('#gseGridWrap .gse-cell').forEach(td=>td.onclick=()=>onCell(+td.dataset.r,+td.dataset.c))}
function renderGrid(){
 const w=document.getElementById('gseGridWrap');if(w)w.innerHTML=gridHtml(state.grid,state.tool);
 const s=stats(state.grid),st=document.getElementById('gseStats');if(st)st.innerHTML='<b>'+s.total+'</b> koltuk <b>'+s.filled+'</b> dolu <b>'+s.empty+'</b> boş <b>'+state.grid.length+' × '+(state.grid[0]?.length||0)+'</b>';
 bindGrid();
}

function legacy(g){
 const elements=[],yerlesim=[];let no=0;
 g.forEach((row,r)=>row.forEach((x,c)=>{
  if(x.type==='empty')return;
  const isSeat=x.type==='seat';if(isSeat)no++;
  const p={konum:x.type==='door'?'kapi':x.type==='driver'?'sofor':(c===0?'sol-dis':c===1?'sol-ic':c===2?'sag-ic':'sag-dis'),kapiSag:x.type==='door',soforYani:x.type==='driver',studentName:'',stop:'',note:'',reserved:false};
  elements.push({id:'el_'+r+'_'+c,type:x.type==='driver'?'sofor':'koltuk',seatNumber:isSeat?no:null,studentId:x.studentId||null,row:r,column:c,locked:false,visible:true,color:null,properties:p});
  yerlesim.push({sira:r,konum:p.konum,aktif:true,kapiSag:p.kapiSag,soforYani:p.soforYani});
 }));
 return{elements,yerlesim,semaVersiyon:2,guncellendi:new Date().toISOString()};
}

function css(){
 return '<style>'+
 '.gse-wrap{font-family:var(--font-sans,system-ui);color:var(--text-primary)}'+
 '.gse-toolbar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:4px 0 12px}.gse-toolbar button{font:inherit;font-size:13px;padding:8px 11px;border:1px solid var(--border);border-radius:10px;background:transparent;color:var(--text-primary)}.gse-toolbar .active{background:var(--bg-accent);color:var(--text-accent);border-color:var(--border-accent)}'+
 '.gse-stats{display:flex;gap:16px;flex-wrap:wrap;padding:9px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);font-size:13px;color:var(--text-secondary)}.gse-stats b{color:var(--text-primary);font-weight:600}'+
 '.gse-grid-wrap{overflow:auto;margin:12px 0}.gse-table{border-collapse:collapse;min-width:max-content}.gse-cell{width:82px;height:74px;border:1px solid var(--border);text-align:center;vertical-align:middle;position:relative;padding:4px;box-sizing:border-box}.gse-empty{background:var(--surface-1)}.gse-hint{opacity:.15;font-size:22px}.gse-seat{background:var(--surface-2)}.gse-seat.gse-filled{background:var(--bg-accent)}.gse-seat .ti{display:block;font-size:21px;color:var(--text-muted);margin:2px auto}.gse-filled .ti{color:var(--text-accent)}.gse-no{position:absolute;top:5px;left:6px;font-size:10px;color:var(--text-muted)}.gse-name{display:block;font-size:11px;line-height:1.12;font-weight:700;white-space:normal;overflow-wrap:anywhere;word-break:normal}.gse-door{background:var(--bg-warning);color:var(--text-warning)}.gse-door .ti,.gse-driver .ti{font-size:21px;display:block}.gse-door b,.gse-driver b{font-size:11px}.gse-driver{background:var(--bg-success);color:var(--text-success)}'+
 '.gse-picker{margin-top:10px;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2)}.gse-picker-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.gse-picker-head button{border:0;background:transparent;font-size:22px}.gse-pick-list{display:flex;flex-wrap:wrap;gap:6px;max-height:240px;overflow:auto}.gse-pick{border:1px solid var(--border);border-radius:9px;background:var(--surface-1);padding:8px 10px;color:var(--text-primary)}.gse-pick.active{background:var(--bg-accent)}.gse-pick.taken{opacity:.35}.gse-pick small,.gse-pick em{display:block;font-size:10px;color:var(--text-muted);font-style:normal}.gse-clear{margin-top:10px;border:1px solid var(--border-danger);color:var(--text-danger);background:transparent;border-radius:8px;padding:7px 10px}.gse-footer{display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--border)}.gse-footer button{flex:1;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--surface-1);color:var(--text-primary);font-weight:600}.gse-footer .save{background:var(--bg-accent);color:var(--text-accent);border-color:var(--border-accent)}.gse-muted{color:var(--text-muted)}'+
 '@media(max-width:600px){.gse-cell{width:72px;height:70px}.gse-name{font-size:10px}.gse-toolbar button{padding:7px 9px}}'+
 '</style>';
}

function shell(s){
 const st=stats(state.grid);
 return css()+'<div class="gse-wrap"><div class="gse-toolbar">'+
 '<span style="font-size:12px;color:var(--text-muted)">Araç:</span>'+
 '<button id="gse-seat" class="active">💺 Koltuk</button><button id="gse-door">🚪 Kapı</button><button id="gse-driver">🎯 Şoför</button><button id="gse-erase">⌫ Sil</button>'+
 '<button id="gse-add-row">＋ Satır</button><button id="gse-del-row">− Satır</button><button id="gse-add-col">＋ Sütun</button><button id="gse-del-col">− Sütun</button><button id="gse-clear">🗑 Temizle</button>'+
 '</div><div class="gse-stats" id="gseStats"><b>'+st.total+'</b> koltuk <b>'+st.filled+'</b> dolu <b>'+st.empty+'</b> boş <b>'+state.grid.length+' × '+(state.grid[0]?.length||0)+'</b></div>'+
 '<div id="gseGridWrap" class="gse-grid-wrap">'+gridHtml(state.grid,state.tool)+'</div><div id="gsePickerArea"></div>'+
 '<div class="gse-footer">'+(state.editable?'<button id="gse-cancel">Vazgeç</button><button id="gse-save" class="save">💾 Kaydet</button>':'<button id="gse-cancel">Kapat</button>')+'</div></div>';
}

function render(s){
 const old=document.getElementById('gseOverlay');if(old)old.remove();
 const ov=document.createElement('div');ov.id='gseOverlay';ov.className='ka-modal-backdrop';
 const box=document.createElement('div');box.className='ka-modal';box.style.cssText='width:min(96vw,760px);max-height:92vh;overflow:auto';
 box.innerHTML='<div class="ka-modal__header"><div><h2>💺 Oturma Planı — '+esc(serviceName(s))+'</h2><small>'+esc(s.plaka||'')+'</small></div><button class="ka-icon-button" id="gse-close">×</button></div><div class="ka-modal__body">'+shell(s)+'</div>';
 ov.appendChild(box);document.body.appendChild(ov);
 const tools={seat:'gse-seat',door:'gse-door',driver:'gse-driver',erase:'gse-erase'};
 Object.entries(tools).forEach(([t,id])=>document.getElementById(id)?.addEventListener('click',()=>{state.tool=t;Object.values(tools).forEach(x=>document.getElementById(x)?.classList.remove('active'));document.getElementById(id)?.classList.add('active');renderGrid()}));
 document.getElementById('gse-add-row')?.addEventListener('click',()=>{const cols=state.grid[0]?.length||4;state.grid.push(Array.from({length:cols},cell));renderGrid()});
 document.getElementById('gse-del-row')?.addEventListener('click',()=>{if(state.grid.length>1)state.grid.pop();renderGrid()});
 document.getElementById('gse-add-col')?.addEventListener('click',()=>{state.grid.forEach(r=>r.push(cell()));renderGrid()});
 document.getElementById('gse-del-col')?.addEventListener('click',()=>{if((state.grid[0]?.length||0)>1)state.grid.forEach(r=>r.pop());renderGrid()});
 document.getElementById('gse-clear')?.addEventListener('click',()=>{if(confirm('Tüm hücreleri temizlemek istiyor musunuz?')){state.grid=state.grid.map(r=>r.map(cell));renderGrid()}});
 document.getElementById('gse-close')?.addEventListener('click',close);
 document.getElementById('gse-cancel')?.addEventListener('click',close);
 document.getElementById('gse-save')?.addEventListener('click',async()=>{const b=document.getElementById('gse-save');b.disabled=true;b.textContent='Kaydediliyor…';try{const legacy=legacy(state.grid);await global.ServisOturmaService?.planElementsKaydet?.(state.servisId,'ozel',legacy.elements,false);toast('Oturma planı kaydedildi.');close();global.TransportModule?.render?.()}catch(e){b.disabled=false;b.textContent='💾 Kaydet';toast('Kayıt hatası: '+(e?.message||e))}});
 bindGrid();
}
function close(){document.getElementById('gseOverlay')?.remove();state=null}
function open(servisId){
 const s=arr('servisler').find(x=>x.id===servisId);if(!s)return;
 const raw=global.DeviceData?.get?.('servisOturma',servisId)||{};
 state={servisId,grid:gridFromLegacy(raw),tool:'seat',editable:canEdit(),students:students(servisId)};
 render(s);
}
if(global.TransportModule)global.TransportModule={...global.TransportModule,openBusEditor:open};
global.GridSeatingEditor={open,close};
})(window);
