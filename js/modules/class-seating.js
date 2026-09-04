/* Koruk Asistan — Sınıf Oturma Planı
 * Responsive mobile editor on the canonical local-first SinifOturmaService.
 * Persistent writes: SinifOturmaService -> Repository -> DeviceData.
 * PDF/print output uses the single ReportEngine.
 */
(function(global){
'use strict';
if(global.SinifOturma)return;

const GRID=14;
const CLICK_LIMIT=7;
const HEADER_GAP=60;
const PAGE={
  dikey:{w:794,h:1123-HEADER_GAP},
  yatay:{w:1123,h:794-HEADER_GAP}
};
const SEATS={
  'tekli-sira':{count:1,cols:1,rows:1},
  'ikili-masa':{count:2,cols:2,rows:1},
  'grup-masasi-4':{count:4,cols:2,rows:2},
  'grup-masasi-6':{count:6,cols:3,rows:2}
};
const DEFAULT_SIZE={
  'tekli-sira':{w:82,h:58},
  'ikili-masa':{w:224,h:98},
  'grup-masasi-4':{w:140,h:140},
  'grup-masasi-6':{w:200,h:140},
  'ogretmen-masasi':{w:224,h:112},
  kapi:{w:28,h:168},
  pencere:{w:14,h:224},
  'yazi-tahtasi':{w:336,h:28}
};

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const snap=n=>Math.round(n/GRID)*GRID;

let classId='';
let className='';
let overlay=null;
let canvas=null;
let stage=null;
let selected=null;
let counter=0;
let orientation='dikey';
let columnGap=12;
let rowGap=66;
let baseZoom=1;
let userZoom=1;
let moveAll=false;
let locked=false;
let dirty=false;
let sizes={};
let editable=true;
let resizeHandler=null;

const currentClass=()=>arr('siniflar').find(x=>x.id===classId)||null;
const activeUser=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const activeTeacherId=()=>{const u=activeUser();return u.bagliOgretmenId||u.ogretmenId||''};
const isTeacherUser=()=>activeUser().admin!==true&&!!activeTeacherId();
const ownClass=()=>!!activeTeacherId()&&currentClass()?.sinifOgretmeniId===activeTeacherId();
const students=()=>arr('veliler')
  .filter(v=>v.sinifId===classId)
  .slice()
  .sort((a,b)=>(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));
const teacherName=()=>{
  const s=currentClass();
  const t=arr('ogretmenler').find(o=>o.id===s?.sinifOgretmeniId);
  return t?[t.ad,t.soyad].filter(Boolean).join(' '):'';
};
const canEdit=()=>isTeacherUser()?ownClass():(activeUser().admin===true||!global.PermissionService
  ||global.PermissionService.can('transport.classSeating.edit','edit')
  ||global.PermissionService.can('people.classes','edit'));

function schoolYear(){
  const d=new Date(),y=d.getFullYear();
  return d.getMonth()>=8?`${y} - ${y+1}`:`${y-1} - ${y}`;
}
function reportTitle(){
  return `${schoolYear()} EĞİTİM ÖĞRETİM YILI ${(className||'').toLocaleUpperCase('tr')} SINIFI OTURMA DÜZENİ`;
}
function resetSizes(){
  sizes={};
  Object.entries(DEFAULT_SIZE).forEach(([k,v])=>sizes[k]={...v});
}
function assigned(){
  const set=new Set();
  $$('[data-so-seat][data-student-id]',canvas).forEach(k=>{
    if(k.dataset.studentId)set.add(k.dataset.studentId);
  });
  return set;
}
function clearSeatStudent(seat){
  if(!seat)return false;
  const had=!!(seat.dataset.studentId||seat.dataset.name||seat.dataset.empty!=='true');
  delete seat.dataset.studentId;
  seat.dataset.name='';
  seat.dataset.empty='true';
  seat.textContent='+';
  seat.style.color='rgba(107,91,58,.45)';
  return had;
}
function clearStudentAssignments(){
  const seats=$$('[data-so-seat]',canvas);
  let cleared=0;
  seats.forEach(seat=>{if(clearSeatStudent(seat))cleared++;});
  if(cleared){dirty=true;refreshPool();}
  return cleared;
}

function refreshPool(){
  const pool=$('[data-so-pool]',overlay);
  const label=$('[data-so-pool-count]',overlay);
  const card=$('[data-so-pool-card]',overlay);
  if(!pool)return;
  const used=assigned();
  const all=students();
  const left=all.filter(v=>!used.has(v.id));
  if(label)label.textContent=`${left.length}/${all.length}`;
  if(card)card.hidden=all.length>0&&left.length===0;
  pool.innerHTML=left.length
    ?left.map(v=>`<div class="ka-search-result"><span>🎓</span><div><strong>${esc(v.ogrenciAdi)}</strong><small>${esc(v.ogrenciNo?'No: '+v.ogrenciNo:'Atanmamış')}</small></div></div>`).join('')
    :`<div class="ka-empty">${all.length?'Tüm öğrenciler yerleştirildi ✅':'Bu sınıfa henüz öğrenci eklenmemiş.'}</div>`;
}

function chooseStudent(seat){
  if(!editable)return;
  document.querySelector('[data-so-student-picker]')?.remove();
  const used=assigned();
  const current=seat.dataset.studentId||'';
  const available=students();
  const ov=document.createElement('div');
  ov.className='ka-modal-backdrop';
  ov.dataset.soStudentPicker='';
  ov.innerHTML=`<section class="ka-modal">
    <div class="ka-modal__header">
      <h3>Öğrenci Seç</h3>
      <button class="ka-icon-button" type="button" data-close>×</button>
    </div>
    <div class="ka-modal__body ka-stack">
      ${available.length
        ?available.map(v=>`<button type="button" class="ka-btn ka-btn--secondary" data-student="${esc(v.id)}">${v.id===current?'✓ ':''}${esc(v.ogrenciAdi)}</button>`).join('')
        :'<div class="ka-empty">Atanacak öğrenci kalmadı.</div>'}
    </div>
    <div class="ka-modal__footer">
      <button class="ka-btn ka-btn--secondary" type="button" data-free>Serbest İsim</button>
      ${seat.dataset.name?'<button class="ka-btn ka-btn--secondary" type="button" data-clear>Boşalt</button>':''}
      <button class="ka-btn ka-btn--secondary" type="button" data-close>Kapat</button>
    </div>
  </section>`;
  document.body.appendChild(ov);
  $$('[data-close]',ov).forEach(b=>b.onclick=()=>ov.remove());
  $$('[data-student]',ov).forEach(b=>b.onclick=()=>{
    const v=students().find(x=>x.id===b.dataset.student);
    if(!v)return;
    $$('[data-so-seat]',canvas).forEach(other=>{
      if(other!==seat&&other.dataset.studentId===v.id)clearSeatStudent(other);
    });
    seat.dataset.studentId=v.id;
    seat.dataset.name=v.ogrenciAdi||'';
    seat.dataset.empty='false';
    seat.textContent=v.ogrenciAdi||'';
    seat.style.color='#6b5b3a';
    ov.remove();
    dirty=true;
    refreshPool();
  });
  $('[data-free]',ov).onclick=()=>{
    const v=prompt('Öğrenci adı (serbest metin):',seat.dataset.name||'');
    if(v===null)return;
    delete seat.dataset.studentId;
    seat.dataset.name=v;
    seat.dataset.empty=v.trim()?'false':'true';
    seat.textContent=v.trim()?v:'+';
    seat.style.color=v.trim()?'#6b5b3a':'rgba(107,91,58,.45)';
    ov.remove();
    dirty=true;
    refreshPool();
  };
  $('[data-clear]',ov)?.addEventListener('click',()=>{
    delete seat.dataset.studentId;
    seat.dataset.name='';
    seat.dataset.empty='true';
    seat.textContent='+';
    seat.style.color='rgba(107,91,58,.45)';
    ov.remove();
    dirty=true;
    refreshPool();
  });
}

function setSelected(el){
  if(selected){
    selected.removeAttribute('data-selected');
    selected.style.outline='';
    selected.style.outlineOffset='';
    $$('[data-so-object-control]',selected).forEach(x=>x.hidden=true);
  }
  selected=el||null;
  if(selected){
    selected.dataset.selected='true';
    selected.style.outline='2px solid var(--ka-danger)';
    selected.style.outlineOffset='2px';
    $$('[data-so-object-control]',selected).forEach(x=>x.hidden=false);
  }
}
function fitText(el){
  $$('[data-so-seat]',el).forEach(k=>{
    const n=Math.min(k.offsetWidth,k.offsetHeight);
    k.style.fontSize=Math.max(7,Math.min(16,Math.round(n*.18)))+'px';
  });
}
function rotate(el){
  el.dataset.rotation=String((Number(el.dataset.rotation||0)+90)%360);
  el.style.transform=`rotate(${el.dataset.rotation}deg)`;
  dirty=true;
}
function sizeType(type,factor){
  if(!sizes[type])return;
  const next={
    w:Math.max(28,Math.min(504,snap(sizes[type].w*factor))),
    h:Math.max(28,Math.min(504,snap(sizes[type].h*factor)))
  };
  sizes[type]=next;
  $$(`[data-so-object][data-type="${type}"]`,canvas).forEach(el=>{
    el.style.width=next.w+'px';
    el.style.height=next.h+'px';
    fitText(el);
  });
  updateSizeLabels();
  dirty=true;
}
function control(text,pos,bg){
  const b=document.createElement('button');
  b.type='button';
  b.dataset.soObjectControl='';
  b.hidden=true;
  b.textContent=text;
  b.style.cssText=`position:absolute;${pos};width:22px;height:22px;padding:0;border:0;border-radius:50%;display:grid;place-items:center;background:${bg};color:#fff;font-weight:900;z-index:5;box-shadow:0 2px 5px #0005`;
  return b;
}

function bindDrag(el){
  let sx=0,sy=0,ox=0,oy=0,startTarget=null,moving=false,group=[];
  el.addEventListener('pointerdown',e=>{
    if(!editable||e.target.closest('[data-so-object-control]'))return;
    setSelected(el);
    sx=e.clientX; sy=e.clientY;
    ox=el.offsetLeft; oy=el.offsetTop;
    startTarget=e.target;
    moving=true;
    try{el.setPointerCapture(e.pointerId)}catch(_){}
    if(moveAll&&!locked&&SEATS[el.dataset.type]){
      group=$$('[data-so-object]',canvas)
        .filter(x=>SEATS[x.dataset.type])
        .map(x=>({el:x,x:x.offsetLeft,y:x.offsetTop}));
    }else group=[];
  });
  el.addEventListener('pointermove',e=>{
    if(!moving||locked)return;
    const dx=(e.clientX-sx)/(baseZoom*userZoom);
    const dy=(e.clientY-sy)/(baseZoom*userZoom);
    if(group.length){
      group.forEach(g=>{
        g.el.style.left=Math.max(0,Math.min(canvas.clientWidth-g.el.offsetWidth,g.x+dx))+'px';
        g.el.style.top=Math.max(0,Math.min(canvas.clientHeight-g.el.offsetHeight,g.y+dy))+'px';
      });
    }else{
      el.style.left=Math.max(0,Math.min(canvas.clientWidth-el.offsetWidth,ox+dx))+'px';
      el.style.top=Math.max(0,Math.min(canvas.clientHeight-el.offsetHeight,oy+dy))+'px';
    }
  });
  const up=e=>{
    if(!moving)return;
    moving=false;
    const dist=Math.hypot((e.clientX||sx)-sx,(e.clientY||sy)-sy);
    const dragSeat=startTarget?.closest?.('[data-so-seat]');
    if(dist>=CLICK_LIMIT&&dragSeat){
      dragSeat.dataset.soSuppressClick='true';
      setTimeout(()=>{if(dragSeat.isConnected)delete dragSeat.dataset.soSuppressClick},0);
    }
    if(!locked&&dist>=CLICK_LIMIT){
      (group.length?group.map(x=>x.el):[el]).forEach(x=>{
        x.style.left=snap(x.offsetLeft)+'px';
        x.style.top=snap(x.offsetTop)+'px';
      });
      dirty=true;
    }else if(dist<CLICK_LIMIT){
      const seat=startTarget?.closest?.('[data-so-seat]');
      if(seat){
        seat.dataset.soSuppressClick='true';
        setTimeout(()=>{if(seat.isConnected)delete seat.dataset.soSuppressClick},350);
        chooseStudent(seat);
      }else if(startTarget?.closest?.('[data-so-teacher-name]')){
        const span=startTarget.closest('[data-so-teacher-name]');
        const v=prompt('Öğretmen adı:',span.textContent||'');
        if(v!==null){
          span.textContent=v.trim()?v:'Öğretmen';
          el.dataset.name=v;
          dirty=true;
        }
      }
    }
    group=[];
  };
  el.addEventListener('pointerup',up);
  el.addEventListener('pointercancel',up);
}

function createObject(type,x,y,free=false){
  const size=sizes[type];
  if(!size)return null;
  const seatDef=SEATS[type];
  const el=document.createElement('div');
  el.dataset.soObject='';
  el.dataset.type=type;
  el.dataset.rotation='0';
  el.style.cssText=`position:absolute;display:flex;align-items:center;justify-content:center;text-align:center;font-size:11px;font-weight:700;line-height:1.1;padding:3px;border-radius:10px;touch-action:none;box-sizing:border-box;left:${free?Math.round(x):snap(x)}px;top:${free?Math.round(y):snap(y)}px;width:${size.w}px;height:${size.h}px;box-shadow:0 3px 8px #0002`;

  if(seatDef){
    el.style.background='#f4efe3';
    el.style.color='#6b5b3a';
    el.style.border='1px solid #d7cdb7';
    const grid=document.createElement('div');
    grid.style.cssText='position:absolute;inset:4px';
    for(let i=0;i<seatDef.count;i++){
      const seat=document.createElement('div');
      const c=i%seatDef.cols;
      const r=Math.floor(i/seatDef.cols);
      seat.dataset.soSeat='';
      seat.dataset.empty='true';
      seat.textContent='+';
      seat.style.cssText=`position:absolute;box-sizing:border-box;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:2px;border:1px dashed #b9aa8d;border-radius:6px;background:#ffffff99;color:rgba(107,91,58,.45);left:${c*100/seatDef.cols}%;top:${r*100/seatDef.rows}%;width:${100/seatDef.cols}%;height:${100/seatDef.rows}%;word-break:break-word`;
      if(editable){
        seat.tabIndex=0;
        seat.setAttribute('role','button');
        seat.setAttribute('aria-label','Öğrenci seç');
        seat.addEventListener('click',e=>{
          e.stopPropagation();
          if(seat.dataset.soSuppressClick==='true')return;
          chooseStudent(seat);
        });
        seat.addEventListener('keydown',e=>{
          if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();chooseStudent(seat);}
        });
      }
      grid.appendChild(seat);
    }
    el.appendChild(grid);
  }else if(type==='ogretmen-masasi'){
    el.style.background='var(--ka-primary-soft)';
    el.style.color='var(--ka-primary)';
    el.style.border='1.5px dashed var(--ka-primary)';
    const span=document.createElement('span');
    span.dataset.soTeacherName='';
    span.textContent=teacherName()||'🧑‍🏫 Öğretmen';
    span.style.fontSize='16px';
    span.style.fontWeight='800';
    el.appendChild(span);
  }else if(type==='kapi'){
    el.style.background='#fff';
    el.style.border='2px solid #c98a2e';
    el.innerHTML='<span>🚪</span>';
  }else if(type==='pencere'){
    el.style.background='#fff';
    el.style.border='2px solid #64b5f6';
  }else if(type==='yazi-tahtasi'){
    el.style.background='#213238';
    el.style.color='#fff';
    el.style.border='2px solid #0a1518';
    el.innerHTML='<span>▣ Yazı Tahtası</span>';
  }

  if(editable){
    const del=control('×','top:-9px;right:-9px','var(--ka-danger)');
    del.onclick=e=>{
      e.stopPropagation();
      el.remove();
      if(selected===el)setSelected(null);
      dirty=true;
      refreshPool();
    };
    el.appendChild(del);
    if(seatDef){
      const rot=control('↻','top:-9px;left:-9px','var(--ka-primary)');
      rot.onclick=e=>{e.stopPropagation();rotate(el)};
      el.appendChild(rot);
    }
    const plus=control('+','bottom:-9px;right:-9px','#596d65');
    plus.onclick=e=>{e.stopPropagation();sizeType(type,1.15)};
    el.appendChild(plus);
    const minus=control('−','bottom:-9px;left:-9px','#596d65');
    minus.onclick=e=>{e.stopPropagation();sizeType(type,.87)};
    el.appendChild(minus);
  }

  bindDrag(el);
  canvas.appendChild(el);
  fitText(el);
  setSelected(el);
  counter++;
  dirty=true;
  return el;
}

function zoomApply(){
  if(!canvas||!stage)return;
  const p=PAGE[orientation];
  const scale=Math.max(.2,baseZoom*userZoom);
  stage.style.width=Math.round(p.w*scale)+'px';
  stage.style.height=Math.round(p.h*scale)+'px';
  canvas.style.width=p.w+'px';
  canvas.style.height=p.h+'px';
  canvas.style.transform=`scale(${scale})`;
  canvas.style.transformOrigin='top left';
}
function fitCanvas(){
  const wrap=$('[data-so-canvas-scroll]',overlay);
  if(!wrap)return;
  const p=PAGE[orientation];
  const usable=Math.max(240,wrap.clientWidth-16);
  baseZoom=Math.min(1,usable/p.w);
  userZoom=1;
  zoomApply();
}
function orientationApply(next){
  orientation=next==='yatay'?'yatay':'dikey';
  const portrait=$('[data-so-portrait]',overlay);
  const landscape=$('[data-so-landscape]',overlay);
  [[portrait,orientation==='dikey'],[landscape,orientation==='yatay']].forEach(([button,on])=>{
    if(!button)return;
    button.classList.toggle('ka-btn--danger',on);
    button.classList.toggle('ka-btn--secondary',!on);
  });
  fitCanvas();
}
function updateZoomLabel(){
  const label=$('[data-so-zoom-label]',overlay);
  if(label)label.textContent=Math.round(baseZoom*userZoom*100)+'%';
}
function changeZoom(delta){
  userZoom=Math.max(.45,Math.min(2.5,userZoom+delta));
  zoomApply();
  updateZoomLabel();
}

function autoLayout(silent=false){
  const type=$('[data-so-table-type]',overlay)?.value||'ikili-masa';
  const cols=Math.max(1,Number($('[data-so-cols]',overlay)?.value)||3);
  const rows=Math.max(1,Number($('[data-so-rows]',overlay)?.value)||5);
  const doorRight=($('[data-so-door]',overlay)?.value||'sag')==='sag';
  if(!silent&&canvas.children.length&&!confirm('Mevcut yerleşim silinip otomatik düzene göre yeniden oluşturulacak. Devam edilsin mi?'))return;

  canvas.innerHTML='';
  setSelected(null);
  const size=sizes[type];
  const left=60;
  const top=130;
  for(let c=0;c<cols;c++){
    for(let r=0;r<rows;r++){
      createObject(type,left+c*(size.w+columnGap),top+r*(size.h+rowGap),true);
    }
  }
  const gridW=cols*size.w+(cols-1)*columnGap;
  const teacher=sizes['ogretmen-masasi'];
  const wallX=doorRight?15:left+gridW+25;
  const doorX=doorRight?left+gridW+25:15;
  const teacherX=doorRight?left:left+gridW-teacher.w;
  createObject('kapi',doorX,55,true);
  const t=createObject('ogretmen-masasi',teacherX,55,true);
  const tn=teacherName();
  if(t&&tn){
    $('[data-so-teacher-name]',t).textContent=tn;
    t.dataset.name=tn;
  }
  const win=sizes.pencere;
  const startY=55+teacher.h+24;
  const height=Math.max(0,(top+rows*size.h+(rows-1)*rowGap)-startY);
  for(let i=0;i<3;i++){
    createObject('pencere',wallX,Math.max(10,startY+(i+.5)*(height/3)-win.h/2),true);
  }
  createObject('yazi-tahtasi',Math.max(10,left+gridW/2-sizes['yazi-tahtasi'].w/2),15,true);
  setSelected(null);
  updateFitStatus();
  refreshPool();
  dirty=true;
}
function updateFitStatus(){
  const over=$$('[data-so-object]',canvas).some(el=>
    el.offsetLeft+el.offsetWidth>canvas.clientWidth||el.offsetTop+el.offsetHeight>canvas.clientHeight
  );
  const status=$('[data-so-fit-status]',overlay);
  if(status){
    status.textContent=over?'⚠ Yerleşim A4 sınırını aşıyor':'✓ A4 sınırları içinde';
    status.style.color=over?'var(--ka-danger)':'var(--ka-success)';
  }
}
function autoFill(){
  const list=students();
  const seats=$$('[data-so-seat]',canvas);
  let i=0;
  for(const k of seats){
    if(i>=list.length)break;
    const v=list[i++];
    k.dataset.studentId=v.id;
    k.dataset.name=v.ogrenciAdi||'';
    k.dataset.empty='false';
    k.textContent=v.ogrenciAdi||'';
    k.style.color='#6b5b3a';
  }
  refreshPool();
}

function updateSizeLabels(){
  const tableType=$('[data-so-table-type]',overlay)?.value||'ikili-masa';
  const map={
    masa:sizes[tableType],
    teacher:sizes['ogretmen-masasi'],
    door:sizes.kapi,
    window:sizes.pencere,
    board:sizes['yazi-tahtasi']
  };
  Object.entries(map).forEach(([k,v])=>{
    const el=$(`[data-so-size-label="${k}"]`,overlay);
    if(el&&v)el.textContent=`${v.w}×${v.h}`;
  });
}
function updateGapLabels(){
  const c=$('[data-so-col-gap]',overlay);
  const r=$('[data-so-row-gap]',overlay);
  if(c)c.textContent=columnGap+'px';
  if(r)r.textContent=rowGap+'px';
}

function serialize(){
  return{
    sinifId:classId,
    sayfaYonu:orientation,
    sutunBoslugu:columnGap,
    satirBoslugu:rowGap,
    masaTuru:$('[data-so-table-type]',overlay)?.value||'ikili-masa',
    sutunSayisi:Number($('[data-so-cols]',overlay)?.value)||3,
    satirSayisi:Number($('[data-so-rows]',overlay)?.value)||5,
    kapiYonu:$('[data-so-door]',overlay)?.value||'sag',
    ogeler:$$('[data-so-object]',canvas).map(el=>({
      tur:el.dataset.type,
      x:el.offsetLeft,
      y:el.offsetTop,
      w:el.offsetWidth,
      h:el.offsetHeight,
      rotasyon:Number(el.dataset.rotation||0),
      isim:el.dataset.name||'',
      koltuklar:$$('[data-so-seat]',el).map(k=>({
        ogrenciId:k.dataset.studentId||'',
        isim:k.dataset.name||''
      }))
    }))
  };
}

function loadPlan(p){
  canvas.innerHTML='';
  setSelected(null);
  orientation=p.sayfaYonu==='yatay'?'yatay':'dikey';
  columnGap=Number.isFinite(Number(p.sutunBoslugu))?Number(p.sutunBoslugu):12;
  rowGap=Number.isFinite(Number(p.satirBoslugu))?Number(p.satirBoslugu):66;
  if(p.masaTuru&&$('[data-so-table-type]',overlay))$('[data-so-table-type]',overlay).value=p.masaTuru;
  if(p.sutunSayisi&&$('[data-so-cols]',overlay))$('[data-so-cols]',overlay).value=p.sutunSayisi;
  if(p.satirSayisi&&$('[data-so-rows]',overlay))$('[data-so-rows]',overlay).value=p.satirSayisi;
  if(p.kapiYonu&&$('[data-so-door]',overlay))$('[data-so-door]',overlay).value=p.kapiYonu;

  for(const o of p.ogeler||[]){
    if(!DEFAULT_SIZE[o.tur])continue;
    if(Number.isFinite(Number(o.w))&&Number.isFinite(Number(o.h))){
      sizes[o.tur]={w:Number(o.w),h:Number(o.h)};
    }
    const el=createObject(o.tur,Number(o.x)||0,Number(o.y)||0,true);
    if(!el)continue;
    if(o.rotasyon){
      el.dataset.rotation=String(o.rotasyon);
      el.style.transform=`rotate(${o.rotasyon}deg)`;
    }
    if(o.isim){
      el.dataset.name=o.isim;
      const span=$('[data-so-teacher-name]',el)||$('span',el);
      if(span)span.textContent=o.isim;
    }
    (o.koltuklar||[]).forEach((k,i)=>{
      const seat=$$('[data-so-seat]',el)[i];
      if(!seat)return;
      if(k.ogrenciId)seat.dataset.studentId=k.ogrenciId;
      if(k.isim){
        seat.dataset.name=k.isim;
        seat.dataset.empty='false';
        seat.textContent=k.isim;
        seat.style.color='#6b5b3a';
      }
    });
    fitText(el);
  }
  setSelected(null);
  orientationApply(orientation);
  updateGapLabels();
  updateSizeLabels();
  updateFitStatus();
  refreshPool();
  dirty=false;
}

async function save(){
  if(!editable)return;
  const btn=$('[data-so-save]',overlay);
  const old=btn.textContent;
  btn.disabled=true;
  btn.textContent='Kaydediliyor…';
  try{
    await global.SinifOturmaService.planKaydet(classId,serialize());
    dirty=false;
    btn.textContent='✓ Kaydedildi';
    setTimeout(()=>{
      if(btn.isConnected){
        btn.textContent=old;
        btn.disabled=false;
      }
    },1200);
  }catch(e){
    global.toast?.('Kaydetme hatası: '+(e?.message||e));
    btn.disabled=false;
    btn.textContent=old;
  }
}

function reportBody(){
  const clone=canvas.cloneNode(true),p=PAGE[orientation],pxPerMm=96/25.4;
  const printable=orientation==='yatay'?{w:287,h:200}:{w:200,h:287};
  const titleH=10,stageH=printable.h-titleH;
  const scale=Math.min(1,printable.w*pxPerMm/p.w,stageH*pxPerMm/p.h)*.99;
  clone.removeAttribute('data-so-canvas');
  clone.querySelectorAll('[data-so-object-control]').forEach(x=>x.remove());
  clone.querySelectorAll('[data-so-seat][data-empty="true"]').forEach(x=>x.textContent='');
  clone.style.width=p.w+'px';
  clone.style.height=p.h+'px';
  clone.style.position='absolute';
  clone.style.left='50%';
  clone.style.top='50%';
  clone.style.margin='0';
  clone.style.transform=`translate(-50%,-50%) scale(${scale})`;
  clone.style.transformOrigin='center center';
  return `<div style="width:100%;height:${printable.h}mm;overflow:hidden"><div style="height:${titleH}mm;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:800;font-size:10pt">${esc(reportTitle())}</div><div style="position:relative;width:100%;height:${stageH}mm;overflow:hidden">${clone.outerHTML}</div></div>`;
}
async function pdf(){
  try{
    if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');
    if(!global.ReportEngine?.printReport)throw new Error('Rapor motoru yok.');
    await global.ReportEngine.printReport(reportTitle(),reportBody(),{
      fileName:`${className||'Sinif'}_Oturma_Plani`,
      yon:orientation,
      baslikGoster:false,
      logoGoster:false,
      tarihGoster:false,
      kenarBosluk:5,
      fontSize:8
    });
  }catch(e){
    console.error('[ClassSeating/pdf]',e);
    global.toast?.('PDF oluşturulamadı: '+(e?.message||e));
  }
}

function paletteButton(icon,label,type){
  return `<button class="ka-btn ka-btn--secondary" type="button" data-so-add="${type}"><span>${icon}</span>${label}</button>`;
}
function step(label,key,type){
  return `<label class="ka-field">
    <span class="ka-field__label">${label}</span>
    <div class="ka-row">
      <button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-so-size-minus="${type}">−</button>
      <b class="ka-grow" data-so-size-label="${key}" style="text-align:center"></b>
      <button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-so-size-plus="${type}">＋</button>
    </div>
  </label>`;
}

function editControls(){
  if(!editable)return'';
  return `<section class="ka-card">
    <div class="ka-card__header"><h3>➕ Sınıfa Öğe Ekle</h3></div>
    <div class="ka-card__body">
      <div class="ka-theme-picker">
        ${paletteButton('▭','Tekli Sıra','tekli-sira')}
        ${paletteButton('▬','İkili Masa','ikili-masa')}
        ${paletteButton('▦',"4'lü Grup",'grup-masasi-4')}
        ${paletteButton('▦',"6'lı Grup",'grup-masasi-6')}
        ${paletteButton('🧑‍🏫','Öğretmen','ogretmen-masasi')}
        ${paletteButton('🚪','Kapı','kapi')}
        ${paletteButton('🪟','Pencere','pencere')}
        ${paletteButton('▣','Tahta','yazi-tahtasi')}
      </div>
    </div>
  </section>
  <section class="ka-card">
    <div class="ka-card__header"><h3>🪄 Otomatik Yerleşim</h3></div>
    <div class="ka-card__body ka-stack">
      <label class="ka-field"><span class="ka-field__label">Masa türü</span><select data-so-table-type>
        <option value="tekli-sira">Tekli Sıra</option>
        <option value="ikili-masa" selected>İkili Masa</option>
        <option value="grup-masasi-4">4'lü Grup</option>
        <option value="grup-masasi-6">6'lı Grup</option>
      </select></label>
      <div class="ka-theme-picker">
        <label class="ka-field"><span class="ka-field__label">Sütun</span><input data-so-cols type="number" value="3" min="1" max="10"></label>
        <label class="ka-field"><span class="ka-field__label">Satır</span><input data-so-rows type="number" value="5" min="1" max="15"></label>
      </div>
      <label class="ka-field"><span class="ka-field__label">Kapı konumu</span><select data-so-door><option value="sol">Sol</option><option value="sag" selected>Sağ</option></select></label>
      <div class="ka-theme-picker">
        <label class="ka-field"><span class="ka-field__label">Sütun aralığı</span><div class="ka-row"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-so-col-minus>−</button><b class="ka-grow" data-so-col-gap style="text-align:center">12px</b><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-so-col-plus>＋</button></div></label>
        <label class="ka-field"><span class="ka-field__label">Satır aralığı</span><div class="ka-row"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-so-row-minus>−</button><b class="ka-grow" data-so-row-gap style="text-align:center">66px</b><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-so-row-plus>＋</button></div></label>
      </div>
    </div>
    <div class="ka-card__footer"><button class="ka-btn ka-btn--danger" type="button" data-so-auto>🪄 Otomatik Yerleştir</button></div>
  </section>
  <section class="ka-card">
    <div class="ka-card__header"><h3>📐 Öğe Boyutları</h3></div>
    <div class="ka-card__body ka-theme-picker">
      ${step('Masa','masa','table')}
      ${step('Öğretmen','teacher','ogretmen-masasi')}
      ${step('Kapı','door','kapi')}
      ${step('Pencere','window','pencere')}
      ${step('Tahta','board','yazi-tahtasi')}
    </div>
  </section>`;
}

function layoutCard(){
  return `<section class="ka-card">
    <div class="ka-card__header ka-stack">
      <div>
        <h2>Sınıf Yerleşimi</h2>
        <small class="ka-muted" data-so-fit-status></small>
      </div>
      <div class="ka-theme-picker">
        <button class="ka-btn ka-btn--danger" type="button" data-so-portrait>📄 Dikey A4</button>
        <button class="ka-btn ka-btn--secondary" type="button" data-so-landscape>📄 Yatay A4</button>
      </div>
      <div class="ka-row">
        <button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-so-zoom-minus>−</button>
        <button class="ka-btn ka-btn--secondary ka-btn--sm ka-grow" type="button" data-so-fit>🔍 Sığdır <span data-so-zoom-label></span></button>
        <button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-so-zoom-plus>＋</button>
      </div>
      ${editable?`<div class="ka-theme-picker">
        <button class="ka-btn ka-btn--secondary" type="button" data-so-move-all>🔗 Birlikte Taşı</button>
        <button class="ka-btn ka-btn--secondary" type="button" data-so-lock>🔒 Masaları Kilitle</button>
      </div>`:''}
    </div>
    <div class="dv3sheetviewport" data-so-canvas-scroll>
      <div class="dv3sheetscene" data-so-canvas-stage>
        <div class="dv3sheet" data-so-canvas style="position:relative;flex:none;border:2px solid #18231f;background-color:#fff;background-image:linear-gradient(#e5e9e7 1px,transparent 1px),linear-gradient(90deg,#e5e9e7 1px,transparent 1px);background-size:28px 28px;transform-origin:top left"></div>
      </div>
    </div>
  </section>`;
}

function scaffold(){
  return `<header class="dv3h">
    <button class="dv3btn" type="button" data-so-close>← Kapat</button>
    <div class="dv3title">
      <b>${esc(className)} Oturma Planı</b>
      <small>${esc(schoolYear())} eğitim öğretim yılı</small>
    </div>
  </header>
  <div class="dv3body">
    <div class="ka-page ka-stack">
      <section class="ka-card">
        <div class="ka-card__body ka-row">
          ${editable?'<button class="ka-btn ka-btn--secondary ka-btn--sm ka-grow" type="button" data-so-clear>🗑 Temizle</button><button class="ka-btn ka-btn--sm ka-grow" type="button" data-so-save>💾 Kaydet</button>':''}
          <button class="ka-btn ka-btn--secondary ka-btn--sm ka-grow" type="button" data-so-pdf>📄 PDF</button>
        </div>
      </section>
      <section class="ka-card" data-so-pool-card>
        <div class="ka-card__header"><h3>👥 Atanmamış Öğrenciler <span class="ka-badge" data-so-pool-count></span></h3></div>
        <div class="ka-card__body ka-stack" data-so-pool></div>
      </section>
      ${layoutCard()}
      ${editControls()}
      <div class="dv3info">${editable?'Değişiklikler otomatik kaydedilmez — bitirdiğinizde Kaydet’e basın.':'Salt okunur görünüm — düzenleme yetkiniz bulunmuyor.'}</div>
    </div>
  </div>`;
}

function bind(){
  canvas=$('[data-so-canvas]',overlay);
  stage=$('[data-so-canvas-stage]',overlay);
  $('[data-so-close]',overlay).onclick=()=>close(true);
  $('[data-so-pdf]',overlay).onclick=pdf;
  $('[data-so-clear]',overlay)?.addEventListener('click',()=>{
    const occupied=$$('[data-so-seat]',canvas).some(seat=>seat.dataset.studentId||seat.dataset.name);
    if(occupied&&confirm('Tüm öğrenci yerleşimleri temizlensin mi? Sıra ve sınıf düzeni korunacak.')){
      clearStudentAssignments();
      updateFitStatus();
    }
  });
  $('[data-so-save]',overlay)?.addEventListener('click',save);
  $$('[data-so-add]',overlay).forEach(b=>b.onclick=()=>{
    createObject(b.dataset.soAdd,30+(counter%4)*120,50+Math.floor(counter/4)*110);
    updateFitStatus();
  });
  $('[data-so-portrait]',overlay).onclick=()=>orientationApply('dikey');
  $('[data-so-landscape]',overlay).onclick=()=>orientationApply('yatay');
  $('[data-so-zoom-plus]',overlay).onclick=()=>changeZoom(.15);
  $('[data-so-zoom-minus]',overlay).onclick=()=>changeZoom(-.15);
  $('[data-so-fit]',overlay).onclick=()=>{fitCanvas();updateZoomLabel()};
  $('[data-so-auto]',overlay)?.addEventListener('click',()=>autoLayout(false));
  $('[data-so-move-all]',overlay)?.addEventListener('click',e=>{
    moveAll=!moveAll;
    e.currentTarget.classList.toggle('ka-btn--danger',moveAll);
    e.currentTarget.classList.toggle('ka-btn--secondary',!moveAll);
  });
  $('[data-so-lock]',overlay)?.addEventListener('click',e=>{
    locked=!locked;
    e.currentTarget.classList.toggle('ka-btn--danger',locked);
    e.currentTarget.classList.toggle('ka-btn--secondary',!locked);
    e.currentTarget.textContent=locked?'🔓 Kilitleri Aç':'🔒 Masaları Kilitle';
  });
  $('[data-so-col-plus]',overlay)?.addEventListener('click',()=>{columnGap=Math.min(120,columnGap+6);updateGapLabels();dirty=true});
  $('[data-so-col-minus]',overlay)?.addEventListener('click',()=>{columnGap=Math.max(0,columnGap-6);updateGapLabels();dirty=true});
  $('[data-so-row-plus]',overlay)?.addEventListener('click',()=>{rowGap=Math.min(120,rowGap+4);updateGapLabels();dirty=true});
  $('[data-so-row-minus]',overlay)?.addEventListener('click',()=>{rowGap=Math.max(0,rowGap-4);updateGapLabels();dirty=true});
  $$('[data-so-size-plus]',overlay).forEach(b=>b.onclick=()=>sizeType(b.dataset.soSizePlus==='table'?$('[data-so-table-type]',overlay).value:b.dataset.soSizePlus,1.15));
  $$('[data-so-size-minus]',overlay).forEach(b=>b.onclick=()=>sizeType(b.dataset.soSizeMinus==='table'?$('[data-so-table-type]',overlay).value:b.dataset.soSizeMinus,.87));
  $('[data-so-table-type]',overlay)?.addEventListener('change',updateSizeLabels);
  canvas.addEventListener('click',e=>{if(e.target===canvas)setSelected(null)});
  resizeHandler=()=>{fitCanvas();updateZoomLabel()};
  global.addEventListener('resize',resizeHandler);
}

async function open(id){
  classId=id;
  const s=currentClass();
  if(!s)throw new Error('Sınıf bulunamadı.');
  className=s.ad||'';
  editable=canEdit();
  close(false);
  resetSizes();
  counter=0;
  orientation='dikey';
  columnGap=12;
  rowGap=66;
  baseZoom=1;
  userZoom=1;
  moveAll=false;
  locked=false;
  dirty=false;

  overlay=document.createElement('div');
  overlay.className='dv3';
  overlay.dataset.classSeatingOverlay='';
  overlay.innerHTML=scaffold();
  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');
  bind();
  orientationApply('dikey');
  updateGapLabels();
  updateSizeLabels();

  if(global.SyncEngine&&global.COL?.sinifOturma){
    global.SyncEngine.register('sinifOturma',global.COL.sinifOturma);
    await global.SyncEngine.localHydrate(['sinifOturma']);
  }
  try{
    const doc=await global.SinifOturmaService.planGetir(classId);
    if(doc?.exists)loadPlan(doc.data());
    else{
      autoLayout(true);
      autoFill();
      dirty=false;
    }
  }catch(e){
    console.warn('[ClassSeating/load]',e);
    autoLayout(true);
    autoFill();
    dirty=false;
  }
  fitCanvas();
  updateZoomLabel();
  updateFitStatus();
  refreshPool();
  return true;
}

function close(confirmDirty=false){
  if(confirmDirty&&dirty&&!confirm('Kaydedilmemiş değişiklikler var. Yine de kapatılsın mı?'))return false;
  document.querySelector('[data-so-student-picker]')?.remove();
  if(resizeHandler)global.removeEventListener('resize',resizeHandler);
  resizeHandler=null;
  overlay?.remove();
  overlay=null;
  canvas=null;
  stage=null;
  selected=null;
  document.body.classList.remove('modal-open');
  return true;
}

global.SinifOturma={ac:open,kapat:()=>close(true),serialize:()=>canvas?serialize():null};
})(window);
