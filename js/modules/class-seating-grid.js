/* Koruk Asistan — Sınıf oturma planı: hücre ızgarası editörü (ClassSeatingGrid)
 * Tek ızgara, tek motor: sıra / öğretmen masası / alan aynı hücre ızgarasına oturur; tahta, kapı ve pencere duvara yapışır.
 * Her koltuk bir hücredir (tekli 1×1, ikili 2×1, grup 2×2 / 3×2), bu yüzden hizalama hatası olmaz.
 * Kayıt biçimi eski editörle uyumludur: ogeler[] içinde piksel x/y/w/h + koltuklar[] yazılır (sınıf sayfasındaki önizleme ve eski sürümler okur);
 * yeni alanlar (surum 2, izgara, hx/hy/hw/hh, kenar/bas/uzunluk) yalnız bu editör tarafından okunur. Eski planlar açılırken hücrelere dökülür.
 * Dosya iki katmandan oluşur: (1) saf veri katmanı (fromStored/toStored/calc/autoPlan/buildTemplate/printModel — DOM'suz, testlenebilir),
 * (2) arayüz (açılış, çizim, sürükleme, sayfalar, yazdırma). Kabuk görünümü servis editörüyle ortaktır (.bsg-root); sınıfa özgü parçalar .csg-* ile
 * css/design-system-base.css içinde "SINIF OTURMA IZGARASI" bölümündedir. Renkler yalnız var(--ka-*) üzerinden gelir.
 */
(function(global){
'use strict';
if(global.ClassSeatingGrid)return;

/* ═════════ Yardımcılar ═════════ */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold=s=>String(s??'').replace(/[İIı]/g,'i').toLowerCase().replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
const trSort=(a,b)=>String(a).localeCompare(String(b),'tr');
let uidN=0;
const uid=p=>p+'_'+Date.now().toString(36)+'_'+(++uidN).toString(36)+Math.random().toString(36).slice(2,5);
const clone=v=>JSON.parse(JSON.stringify(v));
const posInt=v=>{const n=Math.round(Number(v));return Number.isFinite(n)&&n>=1?n:0};
const nonNeg=v=>{const n=Math.round(Number(v));return Number.isFinite(n)&&n>=0?n:0};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const LIM={minCols:3,maxCols:16,minRows:3,maxRows:20};
const HUE={k:335,e:205,'':40};
/* Sıra türleri: ad, hücre boyutu (en × boy) ve koltuk sayısı */
const DESKS={
  'tekli-sira':{ad:'Tek sıra',w:1,h:1,n:1},
  'ikili-masa':{ad:'İkili sıra',w:2,h:1,n:2},
  'grup-masasi-4':{ad:'4’lü grup',w:2,h:2,n:4},
  'grup-masasi-6':{ad:'6’lı grup',w:3,h:2,n:6}
};
const DESK_KEYS=Object.keys(DESKS);
/* Duvar öğeleri: iç ad → kayıt türü, görünen ad, varsayılan uzunluk (hücre) */
const WALLS={board:{tur:'yazi-tahtasi',ad:'Yazı tahtası',len:4},door:{tur:'kapi',ad:'Kapı',len:2},window:{tur:'pencere',ad:'Pencere',len:3}};
const WALL_BY_TUR={'yazi-tahtasi':'board',kapi:'door',pencere:'window'};
const SIDE_KEY={top:'ust',bottom:'alt',left:'sol',right:'sag'};
const SIDE_FROM_KEY={ust:'top',alt:'bottom',sol:'left',sag:'right'};
const SIDE_AD={top:'Üst',right:'Sağ',bottom:'Alt',left:'Sol'};
const PAGE={dikey:{w:794,h:1063},yatay:{w:1123,h:734}};

/* ═════════ Öğrenci modeli ═════════ */
function splitName(full){
  const t=String(full||'').trim().split(/\s+/).filter(Boolean);
  if(t.length<2)return{ad:t[0]||'',soyad:''};
  return{ad:t.slice(0,-1).join(' '),soyad:t[t.length-1]};
}
function genderOf(v){const f=fold(v).trim();return f.charAt(0)==='k'?'k':(f.charAt(0)==='e'?'e':'')}
function makeStudent(s){
  const full=String(s.name??s.ogrenciAdi??'').trim(),n=splitName(full),g=genderOf(s.gender??s.cinsiyet);
  return{id:String(s.id),full,ad:n.ad,soyad:n.soyad,no:String(s.no??s.ogrenciNo??'').trim(),g,hue:HUE[g],orphan:!!s.orphan};
}
const first=s=>(s.ad||s.full).split(' ')[0];
function shortName(m,s){const f=first(s),dup=Object.keys(m.studs).some(id=>{const o=m.studs[id];return o!==s&&first(o)===f});return dup&&s.soyad?f+' '+s.soyad.charAt(0)+'.':f}
const gText=g=>g==='k'?'Kız':(g==='e'?'Erkek':'');

/* ═════════ Izgara geometrisi ═════════ */
const isBlock=e=>e.t!=='wall';
function fits(els,cols,rows,x,y,w,h,ig){
  if(x<0||y<0||w<1||h<1||x+w>cols||y+h>rows)return false;
  return !els.some(e=>isBlock(e)&&e.id!==ig&&x<e.x+e.w&&x+w>e.x&&y<e.y+e.h&&y+h>e.y);
}
const canPlace=(m,x,y,w,h,ig)=>fits(m.els,m.grid.cols,m.grid.rows,x,y,w,h,ig);
const elAt=(m,x,y)=>m.els.filter(e=>isBlock(e)&&x>=e.x&&x<e.x+e.w&&y>=e.y&&y<e.y+e.h)[0]||null;
const wallLen=(m,side)=>(side==='top'||side==='bottom')?m.grid.cols:m.grid.rows;
function wallFits(m,side,s,n,ig){
  if(s<0||n<1||s+n>wallLen(m,side))return false;
  return !m.els.some(e=>e.t==='wall'&&e.id!==ig&&e.side===side&&s<e.s+e.n&&s+n>e.s);
}
/* Duvarda `center` hücresine en yakın boş yeri bulur; uzunluk gerekirse kısaltılır, en çok `shift` hücre kayabilir. */
function wallSpot(m,side,center,n,ig,shift){
  const L=wallLen(m,side),sh=shift==null?1:shift;
  for(let len=n;len>=1;len--){
    const base=Math.round(center-(len-1)/2);
    for(let d=0;d<=sh;d++){
      const tries=d?[base-d,base+d]:[base];
      for(let i=0;i<tries.length;i++){const s=clamp(tries[i],0,Math.max(0,L-len));if(wallFits(m,side,s,len,ig))return{s,n:len}}
    }
  }
  return null;
}
/* Yeri belli olmayan bloğu ilk boş hücreye (satır satır) koyar; yer yoksa satır ekler. */
function placeLoose(m,el){
  for(let y=0;;y++){
    if(y+el.h>m.grid.rows&&m.grid.rows<LIM.maxRows)m.grid.rows=Math.min(LIM.maxRows,y+el.h);
    if(y+el.h>m.grid.rows)return false;
    for(let x=0;x+el.w<=m.grid.cols;x++)if(fits(m.els,m.grid.cols,m.grid.rows,x,y,el.w,el.h)){el.x=x;el.y=y;m.els.push(el);return true}
  }
}
function newDesk(kind,x,y,rot){const d=DESKS[kind];return{id:uid('d'),t:'desk',k:kind,x,y,w:rot?d.h:d.w,h:rot?d.w:d.h}}
function newTeacher(m,x,y,w,h){return{id:uid('t'),t:'teacher',x,y,w:w||2,h:h||1,name:m?m.teacher:''}}
function newArea(x,y,w,h){return{id:uid('a'),t:'area',x,y,w,h,label:'Alan'}}
function newWall(k,side,s,n){return{id:uid('w'),t:'wall',k,side,s,n}}
const deskTitle=e=>e.t==='desk'?DESKS[e.k].ad:(e.t==='teacher'?'Öğretmen masası':(e.t==='area'?'Alan':WALLS[e.k].ad));

/* ═════════ Koltuk modeli ═════════
 * Koltuk anahtarı "<sıraId>.<i>": i, bloğun satır satır sayılan hücre sırasıdır. Öğrenci yerleşimi anahtarla tutulur. */
function calc(m){
  const seats=[],byKey={};
  m.els.forEach(e=>{
    if(e.t!=='desk')return;
    const n=e.w*e.h;
    for(let i=0;i<n;i++){const s={key:e.id+'.'+i,id:e.id,el:e,i,x:e.x+(i%e.w),y:e.y+Math.floor(i/e.w)};seats.push(s);byKey[s.key]=s}
  });
  seats.sort((a,b)=>a.y-b.y||a.x-b.x);
  const ys=Array.from(new Set(seats.map(s=>s.y))).sort((a,b)=>a-b),xs=Array.from(new Set(seats.map(s=>s.x))).sort((a,b)=>a-b);
  seats.forEach((s,i)=>{s.no=i+1;s.row=ys.indexOf(s.y)+1;s.col=xs.indexOf(s.x)+1});
  return{seats,byKey,total:seats.length,rows:ys.length,cols:xs.length};
}
const realStudents=m=>Object.keys(m.studs).map(id=>m.studs[id]).filter(s=>!s.orphan);
function whereMap(m,L){const w={};Object.keys(m.asg).forEach(k=>{if(m.asg[k]&&L.byKey[k]&&m.studs[m.asg[k]])w[m.asg[k]]=k});return w}
function statsOf(m,L){
  const w=whereMap(m,L),real=realStudents(m),placed=real.filter(s=>w[s.id]).length;
  const girls=real.filter(s=>s.g==='k').length,boys=real.filter(s=>s.g==='e').length;
  return{total:L.total,students:real.length,placed,free:L.total-Object.keys(w).length,waiting:real.length-placed,girls,boys,pinned:Object.keys(m.pin).filter(id=>w[id]).length,desks:m.els.filter(e=>e.t==='desk').length};
}
const posText=s=>s.row+'. sıra · '+s.col+'. sütun';
function prune(m){
  const L=calc(m);let lost=0;
  Object.keys(m.asg).forEach(k=>{if(!L.byKey[k]||!m.studs[m.asg[k]]){if(m.asg[k]&&m.studs[m.asg[k]])lost++;delete m.asg[k]}});
  const w=whereMap(m,L);
  Object.keys(m.pin).forEach(id=>{if(!w[id])delete m.pin[id]});
  return lost;
}
function gridBounds(m){
  const blocks=m.els.filter(isBlock),walls=m.els.filter(e=>e.t==='wall');
  const maxX=Math.max.apply(null,[0].concat(blocks.map(e=>e.x+e.w),walls.filter(e=>e.side==='top'||e.side==='bottom').map(e=>e.s+e.n)));
  const maxY=Math.max.apply(null,[0].concat(blocks.map(e=>e.y+e.h),walls.filter(e=>e.side==='left'||e.side==='right').map(e=>e.s+e.n)));
  return{maxX,maxY};
}

/* ═════════ Kayıtlı veri → ızgara modeli ═════════ */
function mkBinder(m){
  const byName={};Object.keys(m.studs).forEach(id=>{const k=fold(m.studs[id].full);(byName[k]=byName[k]||[]).push(id)});
  const used={};
  return function bind(key,k){
    if(!k)return;
    const sid=k.ogrenciId!=null&&k.ogrenciId!==''?String(k.ogrenciId):'',nm=String(k.isim||'').trim();
    let stu=null;
    if(sid&&m.studs[sid]&&!used[sid])stu=m.studs[sid];
    else if(nm){
      const all=byName[fold(nm)]||[],c=all.filter(id=>!used[id]);
      if(c.length===1)stu=m.studs[c[0]];
      else if(!all.length&&Object.keys(byName).length){m.dropped.push(nm)}   /* sınıftan ayrılmış öğrenci: koltuk boşalır. Sınıf listesi hiç yoksa karar verilemez, ad korunur. */
      else if(c.length>1||!all.length){const o=makeStudent({id:'x:'+key,name:nm,orphan:true});m.studs[o.id]=o;stu=o}
    }
    if(stu){used[stu.id]=1;m.asg[key]=stu.id;if(k.sabit)m.pin[stu.id]=true}
  };
}
/* Eski editörde 90° / 180° / 270° döndürülmüş sıranın koltuk sırası → yeni satır satır sıra */
function remapIdx(w0,h0,i,q){
  const c=i%w0,r=Math.floor(i/w0);
  if(q===1)return c*h0+(h0-1-r);
  if(q===2)return (h0-1-r)*w0+(w0-1-c);
  if(q===3)return (w0-1-c)*h0+r;
  return i;
}
const quarterOf=o=>{const r=((Math.round(Number(o.rotasyon)||0)%360)+360)%360;return r===90?1:(r===180?2:(r===270?3:0))};

function loadV2(m,plan,objs){
  const g=plan.izgara||{};
  m.grid.cols=clamp(posInt(g.sutun)||LIM.minCols,LIM.minCols,LIM.maxCols);
  m.grid.rows=clamp(posInt(g.satir)||LIM.minRows,LIM.minRows,LIM.maxRows);
  const bind=mkBinder(m),seen={},late=[];
  objs.forEach((o,idx)=>{
    let id=String(o.id||'');if(!id||seen[id])id=uid('e'+idx);seen[id]=1;
    if(o.kenar){
      const k=WALL_BY_TUR[o.tur],side=SIDE_FROM_KEY[o.kenar];if(!k||!side)return;
      const w=newWall(k,side,nonNeg(o.bas),Math.max(1,posInt(o.uzunluk)||WALLS[k].len));w.id=id;
      if(wallFits(m,side,w.s,w.n)){m.els.push(w)}
      else{const sp=wallSpot(m,side,w.s+w.n/2,w.n,null,wallLen(m,side));if(sp){w.s=sp.s;w.n=sp.n;m.els.push(w)}}
      return;
    }
    const x=nonNeg(o.hx),y=nonNeg(o.hy);let w=Math.max(1,posInt(o.hw)||1),h=Math.max(1,posInt(o.hh)||1),e;
    if(DESKS[o.tur]){
      const d=DESKS[o.tur];
      if(!((w===d.w&&h===d.h)||(w===d.h&&h===d.w))){w=d.w;h=d.h}
      e={id,t:'desk',k:o.tur,x,y,w,h};
    }else if(o.tur==='ogretmen-masasi'){e={id,t:'teacher',x,y,w:Math.min(w,6),h:Math.min(h,4),name:String(o.isim||'')}}
    else if(o.tur==='alan'){e={id,t:'area',x,y,w,h,label:o.isim!=null?String(o.isim):'Alan'}}
    else return;
    if(fits(m.els,m.grid.cols,m.grid.rows,e.x,e.y,e.w,e.h)){m.els.push(e);late.push([e,o])}
    else{e.x=0;e.y=0;if(placeLoose(m,e))late.push([e,o])}
  });
  late.forEach(p=>{const e=p[0],o=p[1];if(e.t!=='desk')return;const ks=Array.isArray(o.koltuklar)?o.koltuklar:[];for(let i=0;i<e.w*e.h;i++)bind(e.id+'.'+i,ks[i])});
}

/* Eski serbest tuval (piksel x/y) → hücre ızgarası: sıralar satır kümelerine, sütunlar piksel mesafesine göre dökülür. */
function migrate(m,plan,objs){
  const pg=PAGE[m.yon],bind=mkBinder(m);
  const med=a=>{const s=a.filter(Number.isFinite).sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:0};
  const blocks=[],walls=[];
  objs.forEach(o=>{
    const x=Number(o.x)||0,y=Number(o.y)||0,w=Math.max(1,Number(o.w)||1),h=Math.max(1,Number(o.h)||1),q=quarterOf(o);
    if(DESKS[o.tur]||o.tur==='ogretmen-masasi'){
      const d=DESKS[o.tur]||{w:2,h:1};
      const swap=q===1||q===3,cw=swap?d.h:d.w,ch=swap?d.w:d.h;
      const cx=x+w/2,cy=y+h/2,vw=swap?h:w,vh=swap?w:h;
      blocks.push({o,q,d,cw,ch,vx:cx-vw/2,vy:cy-vh/2,vw,vh,teacher:o.tur==='ogretmen-masasi'});
    }else if(WALL_BY_TUR[o.tur])walls.push({o,x,y,w,h});
  });
  const desks=blocks.filter(b=>!b.teacher);
  const uw=clamp(med((desks.length?desks:blocks).map(b=>b.vw/b.cw))||100,50,130),uh=clamp(med((desks.length?desks:blocks).map(b=>b.vh/b.ch))||80,40,120);
  const minX=blocks.length?Math.min.apply(null,blocks.map(b=>b.vx)):0,minY=blocks.length?Math.min.apply(null,blocks.map(b=>b.vy)):0;
  /* satır kümeleri (merkez y'ye göre) */
  const sorted=blocks.slice().sort((a,b)=>(a.vy+a.vh/2)-(b.vy+b.vh/2)||a.vx-b.vx),clusters=[];
  sorted.forEach(b=>{
    const cy=b.vy+b.vh/2,c=clusters[clusters.length-1];
    if(c&&Math.abs(cy-c.cy)<=uh*.6){c.items.push(b);c.cy=(c.cy*(c.items.length-1)+cy)/c.items.length}
    else clusters.push({cy,items:[b]});
  });
  let cols=LIM.minCols,rowY=0,prevBottom=null;
  const placed=[];
  clusters.forEach(c=>{
    const top=Math.min.apply(null,c.items.map(b=>b.vy)),hh=Math.max.apply(null,c.items.map(b=>b.ch));
    if(prevBottom!=null&&top-prevBottom>uh*.9)rowY+=Math.min(2,Math.round((top-prevBottom)/uh));
    c.items.sort((a,b)=>a.vx-b.vx);
    let end=0;
    c.items.forEach(b=>{
      const col=Math.max(end,Math.round((b.vx-minX)/uw));
      placed.push({b,x:col,y:rowY});end=col+b.cw;cols=Math.max(cols,end);
    });
    prevBottom=Math.max.apply(null,c.items.map(b=>b.vy+b.vh));
    rowY+=hh;
  });
  m.grid.cols=clamp(cols,LIM.minCols,LIM.maxCols);m.grid.rows=clamp(Math.max(rowY,LIM.minRows),LIM.minRows,LIM.maxRows);
  const late=[];
  placed.forEach(p=>{
    const b=p.b,o=b.o,e=b.teacher?{id:uid('t'),t:'teacher',x:p.x,y:p.y,w:Math.min(b.cw,6),h:Math.min(b.ch,4),name:String(o.isim||'')}:{id:uid('d'),t:'desk',k:o.tur,x:p.x,y:p.y,w:b.cw,h:b.ch};
    if(fits(m.els,m.grid.cols,m.grid.rows,e.x,e.y,e.w,e.h)){m.els.push(e);late.push([e,b])}
    else{e.x=0;e.y=0;if(placeLoose(m,e))late.push([e,b])}
  });
  late.forEach(p=>{
    const e=p[0],b=p[1];if(e.t!=='desk')return;
    const ks=Array.isArray(b.o.koltuklar)?b.o.koltuklar:[],w0=b.d.w,h0=b.d.h;
    ks.forEach((k,i)=>{if(i<w0*h0)bind(e.id+'.'+remapIdx(w0,h0,i,b.q),k)});
  });
  /* duvar öğeleri: piksel konumundan en yakın duvar ve hücre aralığı */
  walls.forEach(w=>{
    const k=WALL_BY_TUR[w.o.tur],horiz=w.w>=w.h;let side,s,n;
    if(horiz){side=(w.y+w.h/2)<pg.h/2?'top':'bottom';s=Math.round((w.x-minX)/uw);n=Math.max(1,Math.round(w.w/uw))}
    else{side=(w.x+w.w/2)<pg.w/2?'left':'right';s=Math.round((w.y-minY)/uh);n=Math.max(1,Math.round(w.h/uh))}
    const L=wallLen(m,side);n=Math.min(n,L);s=clamp(s,0,L-n);
    const sp=wallSpot(m,side,s+(n-1)/2,n,null,L);if(sp)m.els.push(Object.assign(newWall(k,side,sp.s,sp.n)));
  });
}
function fromStored(inp){
  inp=inp||{};
  const plan=inp.plan||{};
  const m={grid:{cols:0,rows:0},yon:plan.sayfaYonu==='yatay'?'yatay':'dikey',els:[],asg:{},pin:{},studs:{},dropped:[],teacher:String(inp.teacher||''),className:String(inp.className||'')};
  (inp.students||[]).forEach(s=>{const o=makeStudent(s);m.studs[o.id]=o});
  const objs=(Array.isArray(plan.ogeler)?plan.ogeler:[]).filter(o=>o&&typeof o==='object');
  if(objs.length){
    if(Number(plan.surum)===2&&plan.izgara)loadV2(m,plan,objs);else migrate(m,plan,objs);
  }
  if(!m.grid.cols){m.grid.cols=STD.cols;m.grid.rows=STD.rows}
  return m;
}

/* ═════════ Izgara modeli → kayıtlı veri ═════════ */
/* Eski editörün ve sınıf sayfasındaki önizlemenin okuduğu piksel yerleşimi: ızgara A4 sayfasına ortalanır, duvar öğeleri kenar boşluğuna yazılır. */
function pxGeom(m){
  const pg=PAGE[m.yon],M=30,cols=m.grid.cols,rows=m.grid.rows;
  const cw=clamp(Math.floor((pg.w-2*M)/cols),24,150),ch=clamp(Math.floor((pg.h-2*M)/rows),24,130);
  return{cw,ch,ox:Math.floor((pg.w-cw*cols)/2),oy:Math.floor((pg.h-ch*rows)/2),pg};
}
function toStored(m){
  const L=calc(m),G=pxGeom(m),T=14,GAP=8,out=[];
  const blocks=m.els.filter(isBlock).slice().sort((a,b)=>a.y-b.y||a.x-b.x);
  blocks.forEach(e=>{
    const o={id:e.id,hx:e.x,hy:e.y,hw:e.w,hh:e.h,x:G.ox+e.x*G.cw+2,y:G.oy+e.y*G.ch+2,w:e.w*G.cw-4,h:e.h*G.ch-4,rotasyon:0};
    if(e.t==='desk'){
      o.tur=e.k;o.isim='';
      o.koltuklar=[];
      for(let i=0;i<e.w*e.h;i++){
        const sid=m.asg[e.id+'.'+i],stu=sid?m.studs[sid]:null,k={ogrenciId:stu&&!stu.orphan?stu.id:'',isim:stu?stu.full:''};
        if(stu&&m.pin[stu.id])k.sabit=true;
        o.koltuklar.push(k);
      }
    }else if(e.t==='teacher'){o.tur='ogretmen-masasi';o.isim=e.name||'';o.koltuklar=[]}
    else{o.tur='alan';o.isim=e.label||'';o.koltuklar=[]}
    out.push(o);
  });
  m.els.filter(e=>e.t==='wall').forEach(e=>{
    const horiz=e.side==='top'||e.side==='bottom';let x,y,w,h;
    if(horiz){x=G.ox+e.s*G.cw;w=e.n*G.cw;h=T;y=e.side==='top'?G.oy-T-GAP:G.oy+m.grid.rows*G.ch+GAP}
    else{y=G.oy+e.s*G.ch;h=e.n*G.ch;w=T;x=e.side==='left'?G.ox-T-GAP:G.ox+m.grid.cols*G.cw+GAP}
    out.push({id:e.id,tur:WALLS[e.k].tur,kenar:SIDE_KEY[e.side],bas:e.s,uzunluk:e.n,x,y,w,h,rotasyon:0,isim:'',koltuklar:[]});
  });
  const count={};m.els.forEach(e=>{if(e.t==='desk')count[e.k]=(count[e.k]||0)+1});
  const dom=DESK_KEYS.slice().sort((a,b)=>(count[b]||0)-(count[a]||0))[0],door=m.els.filter(e=>e.t==='wall'&&e.k==='door')[0];
  const rowCount={};m.els.forEach(e=>{if(e.t==='desk')rowCount[e.y]=(rowCount[e.y]||0)+1});
  return{
    surum:2,sayfaYonu:m.yon,izgara:{sutun:m.grid.cols,satir:m.grid.rows},
    sutunBoslugu:12,satirBoslugu:66,
    masaTuru:count[dom]?dom:'ikili-masa',
    sutunSayisi:Math.max(1,Math.max.apply(null,[0].concat(Object.keys(rowCount).map(k=>rowCount[k])))),
    satirSayisi:Math.max(1,Object.keys(rowCount).length),
    kapiYonu:door&&door.side==='left'?'sol':'sag',
    ogeler:out
  };
}

/* ═════════ Düzen işlemleri (saf) ═════════ */
function rotateEl(m,e){
  if(!isBlock(e))return false;
  const nw=e.h,nh=e.w;
  if(nw===e.w&&nh===e.h)return true;
  const x=Math.max(0,Math.min(e.x,m.grid.cols-nw)),y=Math.max(0,Math.min(e.y,m.grid.rows-nh));
  if(!fits(m.els,m.grid.cols,m.grid.rows,x,y,nw,nh,e.id))return false;
  if(e.t==='desk'){
    const w0=e.w,h0=e.h,olds={};
    for(let i=0;i<w0*h0;i++){const k=e.id+'.'+i;if(m.asg[k])olds[i]=m.asg[k];delete m.asg[k]}
    Object.keys(olds).forEach(i=>{m.asg[e.id+'.'+(Number(i)%w0*h0+(h0-1-Math.floor(Number(i)/w0)))]=olds[i]});
  }
  e.w=nw;e.h=nh;e.x=x;e.y=y;return true;
}
function dupEl(m,e){
  if(e.t==='wall'){
    const sp=wallSpot(m,e.side,e.s+e.n+(e.n-1)/2,e.n,null,wallLen(m,e.side))||null;
    if(!sp)return null;
    const c=newWall(e.k,e.side,sp.s,sp.n);m.els.push(c);return c;
  }
  const c=clone(e);c.id=uid(e.t==='desk'?'d':(e.t==='teacher'?'t':'a'));
  if(e.t==='teacher')c.name=e.name;
  const spots=[[e.x+e.w,e.y],[e.x,e.y+e.h],[e.x-e.w,e.y],[e.x,e.y-e.h]];
  for(let i=0;i<spots.length;i++){
    if(fits(m.els,m.grid.cols,m.grid.rows,spots[i][0],spots[i][1],e.w,e.h)){c.x=spots[i][0];c.y=spots[i][1];m.els.push(c);return c}
  }
  return placeLoose(m,c)?c:null;
}
/* Sürükleyerek çizilen hücre izi için yeşil ışık: çakışmayan sıralar sırayla kabul edilir */
function paintDesks(m,kind,cells){
  const d=DESKS[kind],tmp=m.els.slice(),out=[];
  cells.forEach(c=>{
    if(fits(tmp,m.grid.cols,m.grid.rows,c.x,c.y,d.w,d.h)){const e=newDesk(kind,c.x,c.y,false);tmp.push(e);out.push(e)}
  });
  return out;
}
/* Dokunulan hücre için bir sıra yerleşimi bulur: önce hücrede, sonra dönük, sonra hücreyi kapsayacak şekilde kaydırılmış */
function deskSpot(m,kind,c){
  const d=DESKS[kind],opts=[[d.w,d.h],[d.h,d.w]];
  for(let i=0;i<opts.length;i++){
    const w=opts[i][0],h=opts[i][1];if(i&&w===opts[0][0])continue;
    for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){
      if(fits(m.els,m.grid.cols,m.grid.rows,c.x-dx,c.y-dy,w,h))return{x:c.x-dx,y:c.y-dy,w,h};
    }
  }
  return null;
}

/* ═════════ Hazır düzenler ═════════
 * Öğrenci sayısına göre boyutlanır. Hepsi: üstte yazı tahtası, sol üstte öğretmen masası, sağ arka duvarda kapı, sol duvarda pencere. */
const TEMPLATES={
  standart:{ad:'Standart sınıf',aciklama:'A4 dikey, 8 × 10: üç sütun ikili sıra, solda pencereler, sağda kapı'},
  sira2:{ad:'İkili sıralar',aciklama:'Sütun sütun ikili sıralar, aralarında koridor'},
  sira1:{ad:'Tekli sıralar',aciklama:'Her öğrenciye ayrı sıra'},
  grup4:{ad:'Grup masaları',aciklama:'4’lü masalarda grup çalışması'},
  u:{ad:'U düzeni',aciklama:'Sıralar U biçiminde, ortası açık'},
  bos:{ad:'Boş sınıf',aciklama:'Standart oda: yalnızca duvarlar ve öğretmen masası'}
};
function baseWalls(cols,rows){
  const w=[],bn=Math.min(cols,Math.max(2,Math.min(5,cols-1)));
  w.push(newWall('board','top',Math.floor((cols-bn)/2),bn));
  const dn=Math.min(2,Math.max(1,rows-2));w.push(newWall('door','right',rows-dn,dn));
  const wn=Math.min(Math.max(2,rows-3),rows-1),ws=wn+1<=rows?1:0;w.push(newWall('window','left',ws,wn));
  return w;
}
/* Varsayılan oda: A4 dikey, 8 sütun × 10 satır. Üstte tahta (sütun 1-6), sağ üstte kapı (2 hücre), solda üçer hücre aralıklı 2 hücrelik pencereler. */
const STD={cols:8,rows:10,deskTop:3,perRow:6};
function standardWalls(rows){
  const w=[newWall('board','top',1,6),newWall('door','right',0,2)];
  for(let s=1;s+2<=rows;s+=3)w.push(newWall('window','left',s,2));
  return w;
}
function buildTemplate(key,n,teacherName){
  n=Math.max(1,Number(n)||24);
  const els=[];let cols,rows,walls=null;
  const teacher=(x,y)=>els.push({id:uid('t'),t:'teacher',x,y,w:2,h:1,name:teacherName||''});
  if(key==='standart'||key==='bos'){
    cols=STD.cols;rows=STD.rows;
    els.push({id:uid('t'),t:'teacher',x:0,y:1,w:3,h:1,name:teacherName||''});
    if(key==='standart'){
      const dr=Math.max(3,Math.ceil(n/STD.perRow));
      rows=Math.min(LIM.maxRows,Math.max(STD.rows,STD.deskTop+dr));
      const lim=Math.min(dr,rows-STD.deskTop);
      for(let r=0;r<lim;r++)for(let j=0;j<3;j++)els.push(newDesk('ikili-masa',3*j,STD.deskTop+r,false));
    }
    walls=standardWalls(rows);
  }else if(key==='sira2'){
    const g=n<=8?1:(n<=16?2:(n<=34?3:4)),dr=Math.min(LIM.maxRows-1,Math.max(1,Math.ceil(n/(2*g))));
    cols=Math.max(LIM.minCols,3*g-1);rows=dr+1;
    teacher(0,0);
    for(let r=0;r<dr;r++)for(let j=0;j<g;j++)els.push(newDesk('ikili-masa',3*j,1+r,false));
  }else if(key==='sira1'){
    const k=n<=20?5:6,gs=k>=6?3:5,dr=Math.min(LIM.maxRows-1,Math.max(1,Math.ceil(n/k)));
    cols=k+Math.ceil(k/gs)-1;rows=dr+1;
    teacher(0,0);
    for(let r=0;r<dr;r++)for(let i=0;i<k;i++)els.push(newDesk('tekli-sira',i+Math.floor(i/gs),1+r,false));
  }else if(key==='grup4'){
    const gx=n<=16?2:3,gy=Math.min(Math.floor((LIM.maxRows)/3),Math.max(1,Math.ceil(n/(4*gx))));
    cols=3*gx-1;rows=3*gy;
    teacher(0,0);
    for(let i=0;i<gy;i++)for(let j=0;j<gx;j++)els.push(newDesk('grup-masasi-4',3*j,1+3*i,false));
  }else if(key==='u'){
    const h=Math.max(3,Math.ceil(n/3));
    cols=clamp(h+2,LIM.minCols,LIM.maxCols);rows=clamp(h+1,LIM.minRows,LIM.maxRows);
    teacher(Math.max(0,Math.floor((cols-2)/2)),0);
    for(let y=1;y<rows;y++){els.push(newDesk('tekli-sira',0,y,false));els.push(newDesk('tekli-sira',cols-1,y,false))}
    for(let x=1;x<cols-1;x++)els.push(newDesk('tekli-sira',x,rows-1,false));
  }
  cols=clamp(cols,LIM.minCols,LIM.maxCols);rows=clamp(rows,LIM.minRows,LIM.maxRows);
  (walls||baseWalls(cols,rows)).forEach(w=>els.push(w));
  const seats=els.reduce((a,e)=>a+(e.t==='desk'?e.w*e.h:0),0);
  return{key,cols,rows,els,seats,yon:cols>rows*1.1?'yatay':'dikey'};
}
function applyTemplate(m,t){m.grid={cols:t.cols,rows:t.rows};m.els=t.els;m.yon=t.yon;m.asg={};m.pin={}}

/* ═════════ Otomatik yerleştirme ═════════
 * mod: alfa (ad sırası) · no (okul numarası) · karisik · kizerkek (yan yana oturanlar farklı cinsiyetten)
 * Koltuklar ön sıradan arkaya, soldan sağa dolar. Sabit öğrenciler hiçbir zaman yerinden oynatılmaz. */
function shuffle(a){const r=a.slice();for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=r[i];r[i]=r[j];r[j]=t}return r}
function byNo(a,b){const x=parseInt(a.no,10),y=parseInt(b.no,10);if(Number.isFinite(x)&&Number.isFinite(y)&&x!==y)return x-y;return trSort(a.full,b.full)}
function autoPlan(m,opt){
  const L=calc(m),occ={},w0=whereMap(m,L);
  Object.keys(w0).forEach(id=>{if(opt.keep||m.pin[id])occ[w0[id]]=id});
  const placed={};Object.keys(occ).forEach(k=>{placed[occ[k]]=1});
  let pool=realStudents(m).filter(s=>!placed[s.id]);
  const mode=opt.mode||'alfa';
  if(mode==='no')pool.sort(byNo);else if(mode==='karisik')pool=shuffle(pool);else pool.sort((a,b)=>trSort(a.full,b.full));
  const free=L.seats.filter(s=>!occ[s.key]);
  if(mode==='kizerkek'){
    const q={k:pool.filter(s=>s.g==='k'),e:pool.filter(s=>s.g==='e'),'':pool.filter(s=>!s.g)};
    const genderAt=(s,dx,dy)=>{
      const nb=L.seats.filter(o=>o.id===s.id&&o.x===s.x+dx&&o.y===s.y+dy)[0];
      const sid=nb&&occ[nb.key];return sid&&m.studs[sid]?m.studs[sid].g:'';
    };
    free.forEach(s=>{
      if(!q.k.length&&!q.e.length&&!q[''].length)return;
      const near=genderAt(s,-1,0)||genderAt(s,0,-1);
      let want;
      if(near==='k')want='e';else if(near==='e')want='k';else want=q.k.length>=q.e.length?'k':'e';
      const other=want==='k'?'e':'k',pick=q[want].length?want:(q[other].length?other:'');
      const st=q[pick].shift();if(st)occ[s.key]=st.id;
    });
  }else{
    free.forEach((s,i)=>{if(pool[i])occ[s.key]=pool[i].id});
  }
  const seated={};Object.keys(occ).forEach(k=>{seated[occ[k]]=k});
  const added=realStudents(m).filter(s=>!placed[s.id]&&seated[s.id]).length;
  return{occ,added,left:realStudents(m).filter(s=>!seated[s.id]).length};
}
function autoPreviewText(m,opt){
  const p=autoPlan(m,opt);let t=p.added+' öğrenci yerleşecek';
  if(p.left)t+=' · '+p.left+' öğrenci sığmıyor';
  return t+'.';
}
function suggestions(m,w,q){
  let list=realStudents(m).filter(s=>!w[s.id]);
  if(q){const f=fold(q);list=list.filter(s=>fold(s.full+' '+s.no).indexOf(f)>-1)}
  return list.sort((a,b)=>trSort(a.full,b.full));
}

/* ═════════ Yazdırma (A4, tek sayfa) ═════════
 * Oda, sayfaya en büyük boyutta oturacak şekilde ölçeklenir; yazılar kutuya sığacak en büyük boyuta ayarlanır (ad ve soyad kesilmez).
 * Boyutlar piksel (96 dpi); renkler yalnız --ka-report-transport-* ve --ka-report-class-* tokenlarından gelir. */
function textMeasurer(){
  try{
    if(typeof document!=='undefined'){
      const c=document.createElement('canvas').getContext('2d');
      if(c&&typeof c.measureText==='function')return (t,fs,wt)=>{c.font=(wt||700)+' '+fs+'px Arial, Helvetica, sans-serif';return c.measureText(t).width*1.06};
    }
  }catch(_){}
  return (t,fs,wt)=>String(t).length*fs*((wt||700)>=700?.62:.58);
}
/* Kelimeleri satırlara böler; sığmayan tek kelime kendi satırında kalır (taşma kontrolü çağıranda). */
function wrapText(text,fs,maxW,wt,me){
  const words=String(text||'').split(/\s+/).filter(Boolean);
  if(!words.length)return[];
  const lines=[];let cur='';
  words.forEach(w=>{
    const t=cur?cur+' '+w:w;
    if(!cur||me(t,fs,wt)<=maxW)cur=t;else{lines.push(cur);cur=w}
  });
  lines.push(cur);return lines;
}
function bestFont(stu,cw,ch,me,maxFs){
  const padW=12,padH=12;
  for(let fs=maxFs;fs>=5.5;fs-=.5){
    const a=wrapText(stu.ad,fs,cw-padW,700,me),b=wrapText(stu.soyad,fs,cw-padW,500,me);
    const widest=Math.max.apply(null,[0].concat(a.map(t=>me(t,fs,700)),b.map(t=>me(t,fs,500))));
    if(widest<=cw-padW&&(a.length+b.length)*fs*1.2<=ch-padH)return fs;
  }
  return 5.5;
}
function printModel(m,info){
  info=info||{};
  const L=calc(m),st=statsOf(m,L),g=m.grid,land=m.yon==='yatay';
  const PW=land?1085:756,PH=land?756:1085,WALL=17,PAD=8;
  const date=new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});
  const teacher=String(info.teacher||m.teacher||'');
  const titleH=teacher?66:46,legendH=30,footH=22;
  const availW=PW-2*(WALL+PAD),availH=PH-titleH-legendH-footH-2*(WALL+PAD);
  let cw=Math.floor(availW/g.cols),ch=Math.floor(availH/g.rows);
  if(cw>ch*1.75)cw=Math.floor(ch*1.75);else if(ch>cw*1.5)ch=Math.floor(cw*1.5);
  cw=Math.max(34,Math.min(cw,200));ch=Math.max(30,Math.min(ch,150));
  const gw=cw*g.cols,gh=ch*g.rows,roomW=gw+2*WALL,roomH=gh+2*WALL;
  /* yazı boyutu: en uzun adı da sığdıran büyüklük; aşırı uzun tek ad herkesi küçültmesin diye 9 punto altına inilirse koltuk başına ayarlanır */
  const me=textMeasurer(),seated=[];
  L.seats.forEach(s=>{const sid=m.asg[s.key],stu=sid?m.studs[sid]:null;if(stu)seated.push({s,stu})});
  const maxFs=Math.max(8,Math.min(20,Math.round(cw*.16*2)/2));
  const best={};seated.forEach(x=>{best[x.s.key]=bestFont(x.stu,cw,ch,me,maxFs)});
  const vals=seated.map(x=>best[x.s.key]).sort((a,b)=>a-b);
  const minFs=vals.length?vals[0]:maxFs,tgtFs=vals.length?vals[Math.floor(vals.length*.15)]:maxFs;
  const fsOf=()=>Math.max(5.5,minFs);/* tüm adlar, en küçük sığan boyuta eşitlenir */
  const parts=[];
  m.els.filter(isBlock).forEach(e=>{
    const pos='left:'+(e.x*cw+3)+'px;top:'+(e.y*ch+3)+'px;width:'+(e.w*cw-6)+'px;height:'+(e.h*ch-6)+'px';
    if(e.t==='desk'){
      let cells='';
      for(let i=0;i<e.w*e.h;i++){
        const key=e.id+'.'+i,sid=m.asg[key],stu=sid?m.studs[sid]:null;
        if(stu){const fs=fsOf(key),pw=cw-12,ln=a=>a.map(t=>'<i>'+esc(t)+'</i>').join(''),la=wrapText(stu.ad,fs,pw,700,me),lb=stu.soyad?wrapText(stu.soyad,fs,pw,500,me):[];cells+='<div class="csgp-s g-'+(stu.g||'x')+'" style="font-size:'+fs+'px"><b>'+ln(la)+'</b>'+(lb.length?'<span>'+ln(lb)+'</span>':'')+'</div>'}
        else cells+='<div class="csgp-s is-empty"></div>';
      }
      parts.push('<div class="csgp-desk" style="'+pos+';grid-template-columns:repeat('+e.w+',1fr);grid-template-rows:repeat('+e.h+',1fr)">'+cells+'</div>');
    }else if(e.t==='teacher'){
      parts.push('<div class="csgp-box csgp-teacher" style="'+pos+'"><small>Öğretmen masası</small>'+(e.name?'<b>'+esc(e.name)+'</b>':'')+'</div>');
    }else{
      parts.push('<div class="csgp-box csgp-area" style="'+pos+'"><b>'+esc(e.label||'')+'</b></div>');
    }
  });
  const walls=m.els.filter(e=>e.t==='wall').map(e=>{
    const horiz=e.side==='top'||e.side==='bottom';let x,y,w,h;
    if(horiz){x=WALL+e.s*cw;w=e.n*cw;h=WALL-3;y=e.side==='top'?0:roomH-WALL+3}
    else{y=WALL+e.s*ch;h=e.n*ch;w=WALL-3;x=e.side==='left'?0:roomW-WALL+3}
    const label=WALLS[e.k].ad,vert=!horiz?' is-v':'';
    return '<div class="csgp-w k-'+e.k+vert+'" style="left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px"><span>'+esc(label)+'</span></div>';
  }).join('');
  const lg=(c,t)=>'<span class="csgp-lg"><i class="csgp-sw g-'+c+'"></i>'+t+'</span>';
  const sub=[teacher?'Sınıf öğretmeni: <b>'+esc(teacher)+'</b>':'',st.students?'<b>'+st.students+'</b> öğrenci'+(st.girls||st.boys?' ('+st.girls+' kız, '+st.boys+' erkek)':''):''].filter(Boolean).join('<span class="csgp-dot"></span>');
  const unplaced=realStudents(m).filter(s=>!whereMap(m,L)[s.id]);
  const body='<div class="csgp" style="height:'+(PH-4)+'px">'+
    '<div class="csgp-title" style="height:'+(teacher?30:44)+'px">'+esc(info.title||'Sınıf oturma düzeni')+'</div>'+(sub?'<div class="csgp-sub">'+sub+'</div>':'')+
    '<div class="csgp-roomrow"><div class="csgp-room" style="width:'+roomW+'px;height:'+roomH+'px">'+walls+'<div class="csgp-grid" style="left:'+WALL+'px;top:'+WALL+'px;width:'+gw+'px;height:'+gh+'px">'+parts.join('')+'</div></div></div>'+
    '<div class="csgp-legend">'+lg('k','Kız')+lg('e','Erkek')+(st.free?'<span class="csgp-lg"><i class="csgp-sw is-empty"></i>Boş koltuk '+st.free+'</span>':'')+(unplaced.length?'<span class="csgp-lg csgp-warn">Yerleşmeyen: '+unplaced.map(s=>esc(s.full)).join(', ')+'</span>':'')+'</div>'+
    '<div class="csgp-foot"><span>Koruk Asistan, '+esc(date)+'</span></div></div>';
  const T='var(--ka-report-transport-',C='var(--ka-report-class-';
  const extra='<style>'+
   '.csgp{position:relative;font-family:var(--ka-font,Inter,"Segoe UI",Arial,sans-serif);color:'+T+'text);line-height:1.2}.csgp *{box-sizing:border-box}'+
   '.csgp-title{display:flex;align-items:center;justify-content:center;text-align:center;font-size:20px;font-weight:800;letter-spacing:var(--ka-ls-n01,-.01em)}'+
   '.csgp-sub{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:0 10px;height:28px;margin-bottom:6px;font-size:14px;font-weight:500;color:'+T+'muted-ink)}.csgp-sub b{color:'+T+'text);font-weight:700}'+
   '.csgp-dot{display:inline-block;width:4px;height:4px;border-radius:50%;background:'+T+'border-soft);margin:0 2px}'+
   '.csgp-roomrow{display:flex;justify-content:center;padding-top:'+PAD+'px}'+
   '.csgp-room{position:relative;border:2px solid '+T+'wall);border-radius:14px;background:'+T+'body)}'+
   '.csgp-grid{position:absolute}'+
   '.csgp-w{position:absolute;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:4px;font-size:10.5px;font-weight:700;letter-spacing:.04em}'+
   '.csgp-w.is-v span{writing-mode:vertical-rl;transform:rotate(180deg)}'+
   '.csgp-w.k-board{background:'+T+'text);color:'+T+'cell)}'+
   '.csgp-w.k-door{background:repeating-linear-gradient(135deg,'+T+'door) 0 6px,'+T+'cell) 6px 12px);border:1.5px dashed '+T+'muted-ink);color:'+T+'text)}'+
   '.csgp-w.k-window{background:'+T+'glass);border:1.5px solid '+T+'glass-edge);color:'+T+'glass-ink)}'+
   '.csgp-desk{position:absolute;display:grid;gap:1.5px;overflow:hidden;border:1.5px solid '+T+'border);border-radius:9px;background:'+T+'border)}'+
   '.csgp-s{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;min-height:0;padding:4px 5px;overflow:hidden;background:'+T+'cell);text-align:center;line-height:1.18;font-family:Arial,Helvetica,sans-serif;overflow-wrap:normal;word-break:normal;hyphens:none}'+
   '.csgp-s i{display:block;font-style:normal;white-space:nowrap}'+
   '.csgp-s b{display:block;font-weight:700}.csgp-s span{display:block;font-weight:500}'+
   '.csgp-s.g-k{background:'+C+'girl-fill)}.csgp-s.g-e{background:'+C+'boy-fill)}.csgp-s.is-empty{background:'+T+'cell)}'+
   '.csgp-box{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px 6px;overflow:hidden;text-align:center;border-radius:9px}'+
   '.csgp-teacher{background:'+T+'driver);border:1.5px solid '+T+'driver-edge);color:'+T+'driver-ink)}.csgp-teacher small{font-size:11px;font-weight:700}.csgp-teacher b{font-size:14px;font-weight:800;line-height:1.15;color:'+T+'text)}'+
   '.csgp-area{border:1.5px dashed '+T+'muted-ink);background:'+T+'special);color:'+T+'muted-ink)}.csgp-area b{font-size:13px;font-weight:700}'+
   '.csgp-legend{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px 22px;margin-top:10px;font-size:12.5px;font-weight:600}'+
   '.csgp-lg{display:flex;align-items:center;gap:7px}.csgp-sw{display:inline-block;flex:none;width:18px;height:13px;border:1.5px solid '+T+'border);border-radius:4px;background:'+T+'cell)}'+
   '.csgp-sw.g-k{background:'+C+'girl-fill);border-color:'+C+'girl-edge)}.csgp-sw.g-e{background:'+C+'boy-fill);border-color:'+C+'boy-edge)}.csgp-sw.is-empty{border-style:dashed}'+
   '.csgp-warn{color:'+T+'driver-ink)}'+
   '.csgp-foot{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:flex-end;padding-top:6px;border-top:1px solid '+T+'rule);font-size:11.5px;font-weight:500;color:'+T+'muted-ink)}'+
   '</style>';
  return{body,extra,yon:m.yon,cw,ch,fs:minFs};
}

/* ═════════ Arayüz ═════════ */
let root=null,S=null,ctx=null,ac=null,ro=null,toastT=null,undoS=[],redoS=[],drag=null,eg=null,suppressUntil=0,scrollRAF=0;
const $=(sel,r)=>(r||root).querySelector(sel);
const $$=(sel,r)=>Array.prototype.slice.call((r||root).querySelectorAll(sel));
const R=n=>root.querySelector('[data-r="'+n+'"]');

const ICONS={
 undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
 redo:'<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/>',
 more:'<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
 wand:'<path d="M5 19L17 7"/><path d="M15 5l4 4"/><path d="M6 4v3M4.5 5.5h3M19 14v3M17.5 15.5h3"/>',
 pin:'<path d="M9 4h6l-1 6 3 3H7l3-3z"/><path d="M12 13v7"/>',
 search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.2-4.2"/>',
 close:'<path d="M6 6l12 12M18 6L6 18"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 minus:'<path d="M5 12h14"/>',
 trash:'<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
 up:'<path d="M6 14l6-6 6 6"/>',
 down:'<path d="M6 10l6 6 6-6"/>',
 left:'<path d="M14 6l-6 6 6 6"/>',
 right:'<path d="M10 6l6 6-6 6"/>',
 print:'<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
 user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.6-3.6 3.5-5.5 7-5.5s6.4 1.9 7 5.5"/>',
 swap:'<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
 layout:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 10v10"/>',
 eraser:'<path d="M8 20h12"/><path d="M5 15l8-8 6 6-6 6H9z"/>',
 move:'<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
 desk:'<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M12 7v10"/>',
 teacher:'<circle cx="12" cy="7" r="2.6"/><rect x="3" y="12" width="18" height="7" rx="2"/>',
 board:'<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8"/>',
 door:'<path d="M6 20V5a1 1 0 011-1h8a1 1 0 011 1v15"/><path d="M4 20h16"/><circle cx="13" cy="13" r=".9" fill="currentColor" stroke="none"/>',
 window:'<rect x="5" y="4" width="14" height="16" rx="1.5"/><path d="M12 4v16M5 12h14"/>',
 area:'<rect x="4" y="5" width="16" height="14" rx="2" stroke-dasharray="3 3"/>',
 sliders:'<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>',
 rotate:'<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 5v6h-6"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
 fit:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'
};
const ic=(n,c)=>'<svg class="bsg-ic '+(c||'')+'" viewBox="0 0 24 24" aria-hidden="true">'+ICONS[n]+'</svg>';

/* ---- Geçmiş (geri al / yinele) ve kayıt durumu ---- */
const snap=()=>JSON.stringify({grid:S.grid,yon:S.yon,els:S.els,asg:S.asg,pin:S.pin});
const dirtyKey=()=>snap();
const isDirty=()=>S.editable&&dirtyKey()!==S.saved;
function restore(j){const o=JSON.parse(j);S.grid=o.grid;S.yon=o.yon;S.els=o.els;S.asg=o.asg;S.pin=o.pin}
function commit(fn){undoS.push(snap());if(undoS.length>40)undoS.shift();redoS.length=0;fn();return prune(S)}
function doUndo(){if(!undoS.length)return;redoS.push(snap());restore(undoS.pop());S.pick=null;S.sel=null;render();hideToast()}
function doRedo(){if(!redoS.length)return;undoS.push(snap());restore(redoS.pop());S.pick=null;S.sel=null;render();hideToast()}

/* ---- Bildirim ---- */
function toast(msg,undo,ms){
  const t=R('toast');if(!t)return;
  t.innerHTML='<span>'+esc(msg)+'</span>'+(undo?'<button type="button" data-act="undo">Geri al</button>':'');
  t.hidden=false;clearTimeout(toastT);toastT=setTimeout(hideToast,ms||(undo?5200:2800));
}
function hideToast(){const t=root&&R('toast');if(t)t.hidden=true}

/* ---- Yerleştirme eylemleri ---- */
const selEl=()=>S.sel?S.els.filter(e=>e.id===S.sel)[0]||null:null;
function placeStudent(stuId,key){
  const L=calc(S),w=whereMap(S,L),src=w[stuId],occ=S.asg[key];
  if(occ===stuId){S.pick=null;render();return}
  if(occ&&S.pin[occ]){toast('Bu öğrencinin yeri sabit. Önce sabitlemeyi kaldır.');return}
  commit(()=>{
    if(src)delete S.asg[src];
    if(occ&&src)S.asg[src]=occ;
    S.asg[key]=stuId;
  });
  S.pick=null;hideSheet();
  const s=S.studs[stuId];
  if(occ&&src)toast(shortName(S,s)+' ile '+shortName(S,S.studs[occ])+' yer değiştirdi.',true);
  else if(occ)toast(shortName(S,s)+' yerleşti, '+shortName(S,S.studs[occ])+' bekleyene alındı.',true);
  else toast(shortName(S,s)+' · '+posText(L.byKey[key]),true);
  render();
}
function unseat(stuId){
  const L=calc(S),w=whereMap(S,L);if(!w[stuId])return;
  commit(()=>{delete S.asg[w[stuId]]});
  hideSheet();toast(shortName(S,S.studs[stuId])+' bekleyene alındı.',true);render();
}
function togglePin(stuId){
  const on=!S.pin[stuId];
  commit(()=>{if(on)S.pin[stuId]=true;else delete S.pin[stuId]});
  hideSheet();toast(on?shortName(S,S.studs[stuId])+' sabitlendi. Otomatik yerleştirme yerini değiştirmez.':'Sabitleme kaldırıldı.',true);render();
}
function locate(key){
  const el=$('[data-seat="'+key+'"]');if(!el)return;
  el.scrollIntoView({block:'center',inline:'center',behavior:'smooth'});
  el.classList.remove('is-flash');void el.offsetWidth;el.classList.add('is-flash');
}
function autoApply(opt){
  const p=autoPlan(S,opt),n=p.added;
  commit(()=>{S.asg=p.occ});
  hideSheet();toast(n+' öğrenci otomatik yerleşti.',true);render();
}

/* ---- Düzen eylemleri ---- */
function afterEdit(lost,msg){if(lost)toast(lost+' öğrenci bekleyene alındı.',true);else if(msg)toast(msg,true);render()}
function addDesks(list){
  commit(()=>{list.forEach(e=>S.els.push(e))});
  S.sel=list.length===1?list[0].id:null;
  afterEdit(0,list.length===1?DESKS[list[0].k].ad+' eklendi.':list.length+' sıra eklendi.');
}
function addTeacher(c){
  const t=S.els.filter(e=>e.t==='teacher')[0];
  if(t&&t.x===c.x&&t.y===c.y){S.sel=t.id;S.tool='move';render();return}
  if(t){
    if(!fits(S.els,S.grid.cols,S.grid.rows,c.x,c.y,t.w,t.h,t.id)){toast('Buraya sığmıyor.');return}
    commit(()=>{t.x=c.x;t.y=c.y});S.sel=t.id;S.tool='move';render();return;
  }
  const w=fits(S.els,S.grid.cols,S.grid.rows,c.x,c.y,2,1)?2:1;
  if(!fits(S.els,S.grid.cols,S.grid.rows,c.x,c.y,w,1)){toast('Buraya sığmıyor.');return}
  const e=newTeacher(S,c.x,c.y,w,1);
  commit(()=>{S.els.push(e)});S.sel=e.id;S.tool='move';render();
}
function addArea(x,y,w,h){
  const e=newArea(x,y,w,h);commit(()=>{S.els.push(e)});S.sel=e.id;S.tool='move';render();
}
function addWall(k,side,idx){
  const sp=wallSpot(S,side,idx,WALLS[k].len,null,1);
  if(!sp){toast('Bu duvarda yer yok.');return}
  const e=newWall(k,side,sp.s,sp.n);
  commit(()=>{S.els.push(e)});S.sel=e.id;S.tool='move';render();
}
function delEls(ids){
  const lost=commit(()=>{S.els=S.els.filter(e=>ids.indexOf(e.id)<0)});
  if(ids.indexOf(S.sel)>-1)S.sel=null;
  afterEdit(lost,ids.length+' öğe silindi.');
}
function moveEl(id,x,y){const e=S.els.filter(o=>o.id===id)[0];commit(()=>{e.x=x;e.y=y});render()}
function resizeEl(id,w,h){const e=S.els.filter(o=>o.id===id)[0];commit(()=>{e.w=w;e.h=h});render()}
function moveWall(id,side,s,n){const e=S.els.filter(o=>o.id===id)[0];commit(()=>{e.side=side;e.s=s;if(n)e.n=n});render()}
function rotateSel(){
  const e=selEl();if(!e||!isBlock(e))return;
  if(e.w===e.h){toast('Kare öğe döndürülmez.');return}
  if(!fits(S.els,S.grid.cols,S.grid.rows,Math.max(0,Math.min(e.x,S.grid.cols-e.h)),Math.max(0,Math.min(e.y,S.grid.rows-e.w)),e.h,e.w,e.id)){toast('Dönmeye yer yok.');return}
  commit(()=>{rotateEl(S,e)});render();
}
function dupSel(){
  const e=selEl();if(!e)return;
  let c=null;
  commit(()=>{c=dupEl(S,e)});
  if(!c){undoS.pop();toast('Kopyaya yer yok.');return}
  S.sel=c.id;toast('Kopyalandı.',true);render();
}
function setGrid(k,d){
  const b=gridBounds(S),g=S.grid,v=g[k]+d;
  const lo=k==='cols'?Math.max(LIM.minCols,b.maxX):Math.max(LIM.minRows,b.maxY),hi=k==='cols'?LIM.maxCols:LIM.maxRows;
  if(v<lo){toast('Küçültmek için '+(k==='cols'?'sağdaki':'alttaki')+' öğeleri taşı.');return}
  if(v>hi)return;
  commit(()=>{
    g[k]=v;
    /* büyütülürken sağ / alt duvardaki öğeler duvarla birlikte kayar; küçülmede sığmayan duvar öğesi sınırlanır */
    S.els.forEach(e=>{if(e.t!=='wall')return;const L=wallLen(S,e.side);if(e.s+e.n>L){e.n=Math.max(1,L-e.s)}});
  });
  render();
}
function loadTpl(k){
  const n=Object.keys(whereMap(S,calc(S))).length,t=buildTemplate(k,Math.max(realStudents(S).length,k==='bos'?0:12),S.teacher);
  commit(()=>{applyTemplate(S,t)});
  S.sel=null;hideSheet();toast(TEMPLATES[k].ad+' yüklendi'+(n?', '+n+' öğrenci bekleyene alındı.':'.'),true);render();
}
function nudge(dx,dy){
  const e=selEl();if(!e)return;
  if(e.t==='wall'){
    const horiz=e.side==='top'||e.side==='bottom',d=horiz?dx:dy;if(!d)return;
    if(!wallFits(S,e.side,e.s+d,e.n,e.id)){toast('Buraya sığmıyor.');return}
    moveWall(e.id,e.side,e.s+d);return;
  }
  if(!canPlace(S,e.x+dx,e.y+dy,e.w,e.h,e.id)){toast('Buraya sığmıyor.');return}
  moveEl(e.id,e.x+dx,e.y+dy);
}

/* ---- Ölçüler ve metin sığdırma: her koltuk kendi içinde yazıyı küçültür, ad soyad kesilmez ---- */
function applyMetrics(){
  const wrap=R('planwrap'),ww=wrap.clientWidth||360,wh=wrap.clientHeight||520,availW=ww-(window.innerWidth<1100?16:48)-2*20-4,availH=wh-44-18-2*20-4;
  const fitW=Math.floor(availW/S.grid.cols),fitH=Math.floor(availH/S.grid.rows/.84);
  S.fit=Math.max(30,Math.min(fitW,fitH));
  const cw0=clamp(Math.min(fitW,Math.max(fitH,46)),46,140);S.cw0=cw0;
  const lo=Math.min(cw0,30),hi=Math.max(cw0,170);
  const cw=clamp(Math.round(cw0*S.zoom),lo,hi);
  S.zoom=cw/cw0;S.atMin=cw<=lo;S.atMax=cw>=hi;
  S.m={cw,ch:Math.round(cw*.84)};
  const p=R('plan');p.style.setProperty('--cw',S.m.cw+'px');p.style.setProperty('--ch',S.m.ch+'px');
  R('zOut').disabled=S.atMin;R('zIn').disabled=S.atMax;
}
function fitIn(boxes,base,min){
  boxes.forEach(b=>{
    let fs=base,n=0;b.style.overflowWrap='normal';b.style.fontSize=fs+'px';
    const over=()=>b.scrollHeight>b.clientHeight+.5||b.scrollWidth>b.clientWidth+.5;
    while(over()&&fs>min&&n<40){fs=Math.max(min,fs-.5);b.style.fontSize=fs+'px';n++}
    if(over())b.style.overflowWrap='anywhere';
  });
}
const fitNames=()=>fitIn($$('[data-r="plan"] .bsg-nmbox'),Math.max(9,Math.min(14,S.m.cw*.17)),6.5);

/* ---- Görünüm ---- */
function seatHTML(s){
  const sid=S.asg[s.key],st=sid?S.studs[sid]:null;
  if(S.mode==='edit')return'<div class="csg-seat is-ed'+(st?' is-has is-'+(st.g||'x'):'')+'" aria-hidden="true"></div>';
  let cls='csg-seat',inner,aria,drag='';
  if(st){
    cls+=' is-has is-'+(st.g||'x');
    inner=(S.pin[st.id]?'<span class="csg-pin">'+ic('pin','xs')+'</span>':'')+'<span class="bsg-nmbox"><span class="bsg-ad">'+esc(st.ad)+'</span>'+(st.soyad?'<span class="bsg-sy">'+esc(st.soyad)+'</span>':'')+'</span>';
    aria=st.full+', '+posText(s)+(S.pin[st.id]?', sabit':'');
    if(S.editable)drag=' data-drag="seat" data-stu="'+st.id+'"';
  }else{
    if(S.pick)cls+=' is-tgt';
    inner='<span class="csg-plus">'+(S.editable?ic('plus','sm'):'')+'</span>';aria='Boş koltuk, '+posText(s);
  }
  if(S.pick&&st&&st.id===S.pick.stu)cls+=' is-from';
  return'<button type="button" class="'+cls+'" data-seat="'+s.key+'"'+drag+' aria-label="'+esc(aria)+'">'+inner+'</button>';
}
function elHTML(el,L){
  const edit=S.mode==='edit';
  const cls='bsg-el'+(edit&&S.sel===el.id?' bsg-sel':'')+(eg&&eg.active&&eg.mode==='move'&&eg.el&&eg.el.id===el.id?' bsg-moving':'');
  let inner;
  if(el.t==='desk'){
    let seats='';for(let i=0;i<el.w*el.h;i++)seats+=seatHTML(L.byKey[el.id+'.'+i]);
    inner='<div class="bsg-box csg-desk" style="--dw:'+el.w+';--dh:'+el.h+'">'+seats+'</div>';
  }else if(el.t==='teacher'){
    const one=el.h===1&&!!el.name;   /* tek satırlık masada ad tam görünsün diye başlık yazısı kalkar */
    inner='<div class="bsg-box bsg-drv'+(one?' is-one':'')+'"><span class="bsg-cap">'+ic('teacher','xs')+(one?'':' Öğretmen')+'</span><span class="bsg-nmbox">'+(el.name?'<span class="bsg-ad">'+esc(el.name)+'</span>':(edit?'<span class="bsg-ph">Adını yaz</span>':''))+'</span></div>';
  }else{
    inner='<div class="bsg-box bsg-area"><span class="bsg-nmbox"><span class="bsg-ad">'+esc(el.label||'')+'</span></span></div>';
  }
  const handle=(edit&&S.sel===el.id&&el.t!=='desk')?'<i class="bsg-rh" data-handle="1" aria-hidden="true"></i>':'';
  return'<div class="'+cls+'" data-el="'+el.id+'" style="--x:'+el.x+';--y:'+el.y+';--w:'+el.w+';--h:'+el.h+'">'+inner+handle+'</div>';
}
function wallHTML(w){
  const edit=S.mode==='edit',sel=edit&&S.sel===w.id;
  return'<div class="csg-wall is-'+w.side+' k-'+w.k+(sel?' is-sel':'')+'" data-wall="'+w.id+'" style="--s:'+w.s+';--n:'+w.n+'"><span class="csg-wl">'+esc(WALLS[w.k].ad)+'</span>'+(sel?'<i class="csg-wrh" data-whandle="1" aria-hidden="true"></i>':'')+'</div>';
}
function planHTML(L){
  if(!S.editable&&!S.els.some(el=>el.t==='desk'))return'<div class="csg-empty"><b>Oturma planı henüz hazırlanmadı</b><span>Sınıf öğretmeni planı kaydettiğinde burada görünür.</span></div>';
  let h='<div class="csg-room" data-r="room"><div class="bsg-grid" data-r="grid" style="--cols:'+S.grid.cols+';--rows:'+S.grid.rows+'">';
  S.els.forEach(el=>{if(isBlock(el))h+=elHTML(el,L)});
  h+='<div data-r="ghosts"></div></div>';
  S.els.forEach(el=>{if(el.t==='wall')h+=wallHTML(el)});
  return h+'<div data-r="wghosts"></div></div>';
}
function renderPlan(L){applyMetrics();R('plan').innerHTML=planHTML(L);fitNames()}
function renderStats(L,st){
  let h;
  if(S.mode==='place'){
    const pct=st.students?Math.round(st.placed/st.students*100):0;
    h='<div class="bsg-st-main"><div class="bsg-st-num">'+st.placed+'<span>/'+st.students+'</span></div><div class="bsg-st-lbl">öğrenci yerleşti</div>'+(S.editable?'<button class="bsg-btn" type="button" data-act="auto">'+ic('wand','sm')+'Otomatik</button>':'')+'</div>'+
      '<div class="bsg-bar" role="progressbar" aria-valuemin="0" aria-valuemax="'+st.students+'" aria-valuenow="'+st.placed+'"><i style="width:'+pct+'%"></i></div>'+
      '<div class="bsg-legend"><span><i class="csg-gd is-k"></i><b>'+st.girls+'</b> kız</span><span><i class="csg-gd is-e"></i><b>'+st.boys+'</b> erkek</span><span><i class="bsg-sw"></i><b>'+st.free+'</b> boş koltuk</span>'+(st.pinned?'<span>'+ic('pin','xs')+'<b>'+st.pinned+'</b> sabit</span>':'')+'</div>';
    if(S.editable&&st.students>st.total)h+='<p class="bsg-warn">'+ic('close','sm')+' Koltuk '+(st.students-st.total)+' kişi kısa. Düzen modunda sıra ekle.</p>';
  }else{
    h='<div class="bsg-st-main"><div class="bsg-st-num">'+st.total+'<span> koltuk</span></div><div class="bsg-st-lbl">'+st.desks+' sıra · '+S.grid.cols+' × '+S.grid.rows+' hücre</div></div>';
    if(st.students>st.total)h+='<p class="bsg-warn">'+ic('close','sm')+' '+(st.students-st.total)+' öğrenci için koltuk yok.</p>';
  }
  const el=R('stats');el.className='bsg-stats'+(S.mode==='edit'?' bsg-compact':'');el.innerHTML=h;
}
function renderPick(){
  const el=R('pick');
  if(!S.pick){el.hidden=true;el.innerHTML='';return}
  const s=S.studs[S.pick.stu],placed=!!whereMap(S,calc(S))[s.id];
  el.hidden=false;
  el.innerHTML='<p><b>'+esc(s.full)+'</b> seçili. '+(placed?'Taşımak için başka bir koltuğa dokun.':'Yerleştirmek için bir koltuğa dokun.')+'</p><button type="button" class="bsg-btn" data-act="unpick">Vazgeç</button>';
}
function waitingList(){
  const w=whereMap(S,calc(S));
  return realStudents(S).filter(s=>!w[s.id]).sort((a,b)=>trSort(a.full,b.full));
}
const initial=s=>esc((s.full||'?').charAt(0).toLocaleUpperCase('tr'));
function srow(s,L,w){
  const key=w[s.id],seat=key?L.byKey[key]:null;
  const sub=[s.no?'No '+esc(s.no):'',gText(s.g),S.pin[s.id]&&seat?'sabit':''].filter(Boolean).join(' · ');
  return'<button type="button" class="bsg-srow'+(S.pick&&S.pick.stu===s.id?' is-on':'')+'" data-stu="'+s.id+'"'+(S.editable?' data-drag="stu"':'')+'><span class="bsg-av" style="--h:'+s.hue+'">'+initial(s)+'</span><span class="bsg-si"><b>'+esc(s.full)+'</b><small>'+(sub||'&nbsp;')+'</small></span><span class="bsg-where'+(seat?'':' is-wait')+'">'+(seat?seat.row+'. sıra':'Bekliyor')+'</span></button>';
}
function renderList(){
  const L=calc(S),w=whereMap(S,L);
  let list=realStudents(S).sort((a,b)=>trSort(a.full,b.full));
  if(S.tab==='wait')list=list.filter(s=>!w[s.id]);else if(S.tab==='placed')list=list.filter(s=>w[s.id]);
  if(S.q){const f=fold(S.q);list=list.filter(s=>fold(s.full+' '+s.no).indexOf(f)>-1)}
  R('list').innerHTML=list.length?list.map(s=>srow(s,L,w)).join(''):'<p class="bsg-none">'+(S.q?'Eşleşen öğrenci yok.':(S.tab==='wait'?'Bekleyen öğrenci kalmadı.':(S.tab==='placed'?'Henüz yerleşen öğrenci yok.':'Bu sınıfa kayıtlı öğrenci yok.')))+'</p>';
}
const HINTS={
 move:'Dokun: seç. Basılı tutup sürükle: taşı. Seçince yön tuşları ve düğmeler çıkar.',
 desk:'Boş hücreye dokun: sıra ekle. Basılı tutup sürükle: arka arkaya birçok sıra ekle.',
 teacher:'Öğretmen masasının olacağı hücreye dokun, sonra adını yaz.',
 board:'Kenara yakın bir hücreye dokun: tahta o duvara eklenir. Sonra uzunluğunu ve yerini ayarla.',
 door:'Kenara yakın bir hücreye dokun: kapı o duvara eklenir. Sonra uzunluğunu ve yerini ayarla.',
 window:'Kenara yakın bir hücreye dokun: pencere o duvara eklenir. Sonra uzunluğunu ve yerini ayarla.',
 area:'Dokun: 2×1 alan ekle. Basılı tutup sürükle: dolap, kitaplık gibi alanı istediğin boyutta çiz.',
 erase:'Silinecek öğeye dokun. Basılı tutup sürükle: birçoğunu sil.'
};
function stepper(k,label,val,min,max,act){
  return'<div class="bsg-stp"><span>'+label+'</span><div><button type="button" data-act="'+act+'" data-k="'+k+'" data-d="-1" aria-label="'+label+' azalt"'+(val<=min?' disabled':'')+'>'+ic('minus','sm')+'</button><b>'+val+'</b><button type="button" data-act="'+act+'" data-k="'+k+'" data-d="1" aria-label="'+label+' artır"'+(val>=max?' disabled':'')+'>'+ic('plus','sm')+'</button></div></div>';
}
function stp2(act,k,label,val,min,max){
  return'<div class="bsg-stp2"><span>'+label+'</span><button type="button" data-act="'+act+'" data-k="'+k+'" data-d="-1" aria-label="'+label+' azalt"'+(val<=min?' disabled':'')+'>'+ic('minus','sm')+'</button><b>'+val+'</b><button type="button" data-act="'+act+'" data-k="'+k+'" data-d="1" aria-label="'+label+' artır"'+(val>=max?' disabled':'')+'>'+ic('plus','sm')+'</button></div>';
}
function propsHTML(el,L){
  const nd=(a,dx,dy,i)=>'<button type="button" data-act="nudge" data-dx="'+dx+'" data-dy="'+dy+'" aria-label="'+a+'">'+ic(i,'sm')+'</button>';
  const nudge4='<div class="bsg-nudge"><span>Konum</span>'+nd('Sola',-1,0,'left')+nd('Yukarı',0,-1,'up')+nd('Aşağı',0,1,'down')+nd('Sağa',1,0,'right')+'</div>';
  const sq=(a,i,l,c)=>'<button type="button" class="bsg-sq'+(c||'')+'" data-act="'+a+'" aria-label="'+l+'">'+ic(i,'sm')+'</button>';
  const done='<button type="button" class="bsg-btn" data-act="deselect">Tamam</button>';
  if(el.t==='wall'){
    const horiz=el.side==='top'||el.side==='bottom',max=wallLen(S,el.side);
    const sides=['top','right','bottom','left'].map(s=>'<button type="button" data-act="wside" data-v="'+s+'" aria-pressed="'+(el.side===s)+'">'+SIDE_AD[s]+'</button>').join('');
    const along='<div class="bsg-nudge"><span>Yer</span>'+(horiz?nd('Sola',-1,0,'left')+nd('Sağa',1,0,'right'):nd('Yukarı',0,-1,'up')+nd('Aşağı',0,1,'down'))+'</div>';
    return'<div class="bsg-props"><div class="bsg-ptitle"><span>'+WALLS[el.k].ad+' <small>'+SIDE_AD[el.side]+' duvar</small></span>'+done+'</div><div class="bsg-seg3 csg-four" role="group" aria-label="Duvar">'+sides+'</div>'+
      '<div class="bsg-prow">'+stp2('wlen','n','Uzunluk',el.n,1,max)+along+sq('dupsel','copy','Kopyala')+sq('delsel','trash','Sil',' bsg-dng')+'</div></div>';
  }
  if(el.t==='desk'){
    const n=el.w*el.h,placed=Array.apply(null,Array(n)).filter((_,i)=>S.asg[el.id+'.'+i]).length;
    return'<div class="bsg-props"><div class="bsg-ptitle"><span>'+DESKS[el.k].ad+' <small>'+n+' koltuk · '+placed+' öğrenci</small></span>'+done+'</div><div class="bsg-prow">'+nudge4+(n>1?sq('rot','rotate','Döndür'):'')+sq('dupsel','copy','Kopyala')+sq('delsel','trash','Sil',' bsg-dng')+'</div></div>';
  }
  const isT=el.t==='teacher';
  const field='<input data-r="elLabel" type="text" aria-label="'+(isT?'Öğretmen adı':'Etiket')+'" placeholder="'+(isT?'Öğretmen adı soyadı':'Etiket (ör. dolap)')+'" maxlength="40" value="'+esc(isT?(el.name||''):(el.label||''))+'">';
  return'<div class="bsg-props"><div class="bsg-ptitle"><span>'+(isT?'Öğretmen masası':'Alan')+'</span>'+done+'</div>'+field+
    '<div class="bsg-prow">'+stp2('size','w','En',el.w,1,isT?6:S.grid.cols)+stp2('size','h','Boy',el.h,1,isT?4:S.grid.rows)+sq('delsel','trash','Sil',' bsg-dng')+'</div><div class="bsg-prow">'+nudge4+(el.w!==el.h?sq('rot','rotate','Döndür'):'')+'</div></div>';
}
function editToolsHTML(L){
  const T=[['move','Seç','move'],['desk','Sıra','desk'],['teacher','Öğretmen','teacher'],['board','Tahta','board'],['door','Kapı','door'],['window','Pencere','window'],['area','Alan','area'],['erase','Sil','trash']];
  let h='<div class="bsg-tools" role="group" aria-label="Çizim araçları">'+T.map(t=>'<button type="button" class="bsg-tool" data-act="tool" data-t="'+t[0]+'" aria-pressed="'+(S.tool===t[0])+'">'+ic(t[2])+'<span>'+t[1]+'</span></button>').join('')+'<button type="button" class="bsg-tool" data-act="gridset">'+ic('sliders')+'<span>Ayarlar</span></button></div>';
  const sel=selEl();
  if(sel)return h+propsHTML(sel,L);
  if(S.tool==='desk')h+='<div class="bsg-seg3 csg-four csg-types" role="group" aria-label="Sıra türü">'+DESK_KEYS.map(k=>'<button type="button" data-act="dtype" data-v="'+k+'" aria-pressed="'+(S.deskType===k)+'">'+({'tekli-sira':'Tekli','ikili-masa':'İkili','grup-masasi-4':'4’lü','grup-masasi-6':'6’lı'})[k]+'</button>').join('')+'</div>';
  return h+'<p class="bsg-hint">'+HINTS[S.tool]+'</p>';
}
function renderDock(L,w){
  const wait=waitingList();
  if(S.mode==='place'){
    R('dockTitle').textContent=S.editable?'Bekleyen öğrenciler':'Öğrenciler';
    const b=R('dockBadge'),total=realStudents(S).length;b.textContent=S.editable?wait.length:total;b.classList.toggle('is-zero',S.editable&&!wait.length);b.hidden=false;
    R('strip').innerHTML=wait.length?wait.map(s=>'<button type="button" class="bsg-pill" data-stu="'+s.id+'"'+(S.editable?' data-drag="stu"':'')+' aria-pressed="'+!!(S.pick&&S.pick.stu===s.id)+'"><i class="csg-gd is-'+(s.g||'x')+'"></i>'+esc(shortName(S,s))+'</button>').join(''):'<p class="bsg-empty">'+ic('check')+(total?' Herkes yerleşti.':' Bu sınıfa kayıtlı öğrenci yok.')+'</p>';
    const counts={wait:wait.length,placed:total-wait.length,all:total};
    R('tabs').innerHTML=[['wait','Bekleyen'],['placed','Yerleşen'],['all','Tümü']].map(t=>'<button type="button" data-act="tab" data-t="'+t[0]+'" aria-pressed="'+(S.tab===t[0])+'">'+t[1]+' '+counts[t[0]]+'</button>').join('');
    renderList();
  }else{
    R('dockTitle').textContent='Düzen araçları';R('dockBadge').hidden=true;
    R('editTools').innerHTML=editToolsHTML(L);
  }
}
function renderTop(){
  const u=R('undo'),r=R('redo');
  if(u){u.disabled=!undoS.length;r.disabled=!redoS.length}
  const sv=R('save');
  if(sv){
    const d=isDirty();
    sv.disabled=!d||S.saving;sv.classList.toggle('is-dirty',d);
    sv.innerHTML=S.saving?'Kaydediliyor…':(d?'Kaydet':(S.everSaved?ic('check','sm')+'Kayıtlı':'Kaydet'));
  }
}
function render(){
  if(S.sel&&!selEl())S.sel=null;
  const L=calc(S),w=whereMap(S,L),st=statsOf(S,L),a=R('app');
  a.dataset.mode=S.mode;a.dataset.sel=(S.mode==='edit'&&S.sel)?'1':'0';
  R('mPlace').setAttribute('aria-pressed',S.mode==='place');R('mEdit').setAttribute('aria-pressed',S.mode==='edit');
  renderTop();renderStats(L,st);renderPick();renderPlan(L);renderDock(L,w);
  if(S.sheet)renderSheet();
}
/* Yazarken yalnız plan ve sayılar yenilenir; alt paneldeki kutu odağını kaybetmez. */
function refreshPlan(){const L=calc(S);renderTop();renderStats(L,statsOf(S,L));renderPlan(L)}

/* ---- Sayfalar (sheet) ---- */
function openSheet(d){hideToast();S.sheet=d;renderSheet();R('scrim').dataset.on='1';const sh=R('sheet');sh.dataset.on='1';try{sh.focus({preventScroll:true})}catch(_){}}
function hideSheet(){S.sheet=null;if(!root)return;R('scrim').dataset.on='0';R('sheet').dataset.on='0'}
const head=(big,title,sub)=>'<div class="bsg-sh-head">'+(big?'<span class="bsg-bign">'+big+'</span>':'')+'<div class="bsg-tt"><h3>'+title+'</h3>'+(sub?'<small>'+sub+'</small>':'')+'</div><button type="button" class="bsg-ibtn" data-act="closesheet" aria-label="Kapat">'+ic('close')+'</button></div>';
function candHTML(q){
  const L=calc(S),sg=suggestions(S,whereMap(S,L),q);
  if(!sg.length)return'<p class="bsg-none">'+(q?'Eşleşen bekleyen öğrenci yok.':'Bekleyen öğrenci kalmadı.')+'</p>';
  return sg.map(s=>'<button type="button" class="bsg-srow" data-act="place" data-stu="'+s.id+'"><span class="bsg-av" style="--h:'+s.hue+'">'+initial(s)+'</span><span class="bsg-si"><b>'+esc(s.full)+'</b><small>'+([s.no?'No '+esc(s.no):'',gText(s.g)].filter(Boolean).join(' · ')||'&nbsp;')+'</small></span></button>').join('');
}
function sheetSeat(){
  const L=calc(S),w=whereMap(S,L),seat=L.byKey[S.sheet.key];
  if(!seat){hideSheet();return''}
  const sid=S.asg[seat.key],st=sid?S.studs[sid]:null,pos=posText(seat),ed=S.editable;
  if(st){
    const sub=[st.no?'No '+esc(st.no):'',gText(st.g),pos].filter(Boolean).join(' · ');
    return head(seat.row,esc(st.full),sub)+'<div class="bsg-sh-body">'+(S.pin[st.id]?'<p class="bsg-info">'+ic('pin','sm')+'<span>Bu öğrencinin yeri sabit. Otomatik yerleştirme onu oynatmaz.</span></p>':'')+
      (ed?'<div class="bsg-acts"><button type="button" class="bsg-btn" data-act="move" data-stu="'+st.id+'">'+ic('swap','sm')+'Yer değiştir</button><button type="button" class="bsg-btn" data-act="pin" data-stu="'+st.id+'">'+ic('pin','sm')+(S.pin[st.id]?'Sabitliği kaldır':'Yerini sabitle')+'</button><button type="button" class="bsg-btn" data-act="unseat" data-stu="'+st.id+'">'+ic('user','sm')+'Bekleyene al</button></div>':'')+'</div>';
  }
  if(!ed)return head(seat.row,'Boş koltuk',pos)+'<div class="bsg-sh-body"><p class="bsg-info">'+ic('desk','sm')+'<span>Bu koltukta öğrenci yok.</span></p></div>';
  return head(seat.row,'Boş koltuk',pos)+'<div class="bsg-sh-body">'+
    '<label class="bsg-field"><span>Öğrenci seç</span><div class="bsg-search">'+ic('search')+'<input data-r="sq" type="search" placeholder="Ad veya okul numarası yaz" autocomplete="off"></div></label>'+
    '<div class="bsg-cand" data-r="cand">'+candHTML('')+'</div></div>';
}
const AUTO_MODES=[['alfa','Alfabetik','Ad sırasına göre, ön sıradan arkaya'],['no','Okul numarası','Numarası küçük olan öne'],['kizerkek','Kız–erkek dönüşümlü','Yan yana oturanlar farklı cinsiyetten'],['karisik','Karışık','Rastgele dağıtır, her seferinde farklı']];
function sheetAuto(){
  const o=S.auto;
  const rows=AUTO_MODES.map(m=>'<button type="button" class="bsg-srow'+(o.mode===m[0]?' is-on':'')+'" data-act="amode" data-v="'+m[0]+'" aria-pressed="'+(o.mode===m[0])+'"><span class="bsg-si"><b>'+m[1]+'</b><small>'+m[2]+'</small></span>'+(o.mode===m[0]?'<span class="csg-ck">'+ic('check','sm')+'</span>':'')+'</button>').join('');
  return head('','Otomatik yerleştir','Bekleyen öğrencileri boş koltuklara dağıtır')+'<div class="bsg-sh-body"><div class="bsg-menu">'+rows+'</div><div>'+
    '<label class="bsg-switch"><span class="bsg-tx"><b>Mevcut yerleşimi koru</b><small>Kapalıysa sabit olmayan herkes baştan yerleşir</small></span><input type="checkbox" data-opt="keep"'+(o.keep?' checked':'')+'><span class="bsg-tg"></span></label>'+
    '</div><p class="bsg-prev" data-r="autoPrev">'+esc(autoPreviewText(S,o))+'</p><div class="bsg-acts"><button type="button" class="bsg-btn" data-act="closesheet">Vazgeç</button><button type="button" class="bsg-btn bsg-pri" data-act="autogo">'+ic('wand','sm')+'Yerleştir</button></div></div>';
}
function sheetMenu(){
  const ed=S.editable;
  return head('','İşlemler','')+'<div class="bsg-sh-body"><div class="bsg-menu">'+
    '<button type="button" class="bsg-srow" data-act="print">'+ic('print')+'<span class="bsg-si"><b>Yazdır / PDF</b><small>A4 tek sayfa, büyük yazılı oturma düzeni</small></span></button>'+
    (ed?'<button type="button" class="bsg-srow" data-act="gridset">'+ic('layout')+'<span class="bsg-si"><b>Sınıf düzeni</b><small>Boyut, sayfa yönü ve hazır düzenler</small></span></button>'+
    '<button type="button" class="bsg-srow" data-act="clear">'+ic('eraser')+'<span class="bsg-si"><b>Tüm yerleşimi temizle</b><small>Sıralar kalır, öğrenciler bekleyene alınır</small></span></button>':'')+
    '</div></div>';
}
function sheetGrid(){
  const g=S.grid;
  const st=statsOf(S,calc(S));
  const n=Math.max(realStudents(S).length,12);
  const tpl=Object.keys(TEMPLATES).map(k=>{const t=buildTemplate(k,n,'');return'<button type="button" class="bsg-et" data-act="tpl" data-tpl="'+k+'">'+TEMPLATES[k].ad+'<small>'+(k==='bos'?'Yalnızca duvarlar':t.seats+' koltuk')+'</small></button>'}).join('');
  return head('','Sınıf düzeni',st.desks+' sıra · '+st.total+' koltuk')+'<div class="bsg-sh-body">'+
    '<div class="bsg-szrow">'+stepper('cols','Sütun (genişlik)',g.cols,LIM.minCols,LIM.maxCols,'gridsz')+stepper('rows','Satır (uzunluk)',g.rows,LIM.minRows,LIM.maxRows,'gridsz')+'</div>'+
    '<div class="bsg-field"><span>Sayfa yönü (yazdırma)</span><div class="bsg-seg3 bsg-two"><button type="button" data-act="orient" data-v="dikey" aria-pressed="'+(S.yon==='dikey')+'">Dikey</button><button type="button" data-act="orient" data-v="yatay" aria-pressed="'+(S.yon==='yatay')+'">Yatay</button></div></div>'+
    '<div class="bsg-field"><span>Hazır düzen (mevcut düzenin yerine geçer)</span><div class="bsg-tplgrid">'+tpl+'</div></div></div>';
}
function sheetTpl(){
  const k=S.sheet.k,n=Object.keys(whereMap(S,calc(S))).length;
  return head('','Düzeni yükle',esc(TEMPLATES[k].ad)+' · '+esc(TEMPLATES[k].aciklama))+'<div class="bsg-sh-body"><p class="bsg-info">'+ic('swap','sm')+'<span>Mevcut düzen değişir. '+(n?n+' öğrenci bekleyene alınır. ':'')+'Yükledikten sonra geri alabilirsin.</span></p><div class="bsg-acts"><button type="button" class="bsg-btn" data-act="closesheet">Vazgeç</button><button type="button" class="bsg-btn bsg-pri" data-act="tplgo" data-tpl="'+k+'">Düzeni yükle</button></div></div>';
}
function sheetLeave(){
  return head('','Kaydedilmemiş değişiklikler var','Çıkarsan bu değişiklikler kaybolur.')+'<div class="bsg-sh-body"><div class="bsg-acts"><button type="button" class="bsg-btn bsg-dng" data-act="leave">Kaydetmeden çık</button><button type="button" class="bsg-btn" data-act="closesheet">Düzenlemeye dön</button><button type="button" class="bsg-btn bsg-pri" data-act="saveleave">Kaydet ve çık</button></div></div>';
}
function renderSheet(){
  const t=S.sheet&&S.sheet.t;let h='';
  if(t==='seat')h=sheetSeat();else if(t==='auto')h=sheetAuto();else if(t==='menu')h=sheetMenu();else if(t==='tpl')h=sheetTpl();else if(t==='grid')h=sheetGrid();else if(t==='leave')h=sheetLeave();
  R('sheet').innerHTML=h;
}

/* ---- Yazdırma ---- */
function printPlan(){
  hideSheet();
  if(typeof ctx.print!=='function'){toast('Yazdırma modülü hazır değil.');return}
  const o=printModel(S,{title:ctx.title,teacher:S.teacher});
  try{ctx.print({title:ctx.title,body:o.body,extraHead:o.extra,fileName:ctx.fileName,yon:o.yon})}catch(e){console.error('[ClassSeatingGrid/print]',e);toast('Yazdırma açılamadı.')}
}

/* ---- Kayıt ve kapanış ---- */
async function save(){
  if(!S||!S.editable||S.saving||!isDirty())return true;
  S.saving=true;renderTop();
  try{
    await Promise.resolve(ctx.onSave(toStored(S)));
    S.saved=dirtyKey();S.everSaved=true;toast('Oturma planı kaydedildi.');
    return true;
  }catch(e){
    console.error('[ClassSeatingGrid/save]',e);toast('Plan kaydedilemedi: '+((e&&e.message)||e));
    return false;
  }finally{S.saving=false;if(root)renderTop()}
}
function close(force){
  if(!root)return true;
  if(!force&&isDirty()){openSheet({t:'leave'});return false}
  try{if(ac)ac.abort()}catch(_){}
  try{if(ro)ro.disconnect()}catch(_){}
  cancelAnimationFrame(scrollRAF);scrollRAF=0;
  clearTimeout(toastT);
  const cb=ctx&&ctx.onClose;
  root.remove();root=null;S=null;ac=null;ro=null;drag=null;eg=null;
  try{document.body.classList.remove('modal-open')}catch(_){}
  try{const r=global.KorukPlatformAdapter&&global.KorukPlatformAdapter.setPullToRefreshEnabled&&global.KorukPlatformAdapter.setPullToRefreshEnabled(true);if(r&&r.catch)r.catch(()=>{})}catch(_){}
  ctx=null;
  if(typeof cb==='function'){try{cb()}catch(_){}}
  return true;
}
/* Geri tuşu / Esc: önce açık sayfa, seçim, ardından kapanış (kaydedilmemiş değişiklik varsa sorar). Her zaman "işlendi" döner. */
function requestClose(){
  if(!root)return false;
  if(S.sheet){hideSheet();return true}
  if(drag||eg){cancelGestures();return true}
  if(S.pick){S.pick=null;render();return true}
  if(S.sel){S.sel=null;render();return true}
  close(false);return true;
}

/* ---- Eylem dağıtımı ---- */
function onSeatTap(key){
  if(S.pick&&S.editable){placeStudent(S.pick.stu,key);return}
  openSheet({t:'seat',key});
}
function onStuTap(id){
  const w=whereMap(S,calc(S));
  if(w[id]){locate(w[id]);return}
  if(!S.editable)return;
  S.pick=(S.pick&&S.pick.stu===id)?null:{stu:id};
  render();
}
function setMode(m){
  if(S.mode===m||(m==='edit'&&!S.editable))return;
  S.mode=m;S.pick=null;S.sel=null;hideSheet();render();
  R('planwrap').scrollTop=0;
}
function act(a,el){
  const sh=S.sheet||{};
  switch(a){
    case 'back':close(false);break;
    case 'save':save();break;
    case 'saveleave':save().then(ok=>{if(ok)close(true)});break;
    case 'leave':close(true);break;
    case 'undo':doUndo();break;
    case 'redo':doRedo();break;
    case 'menu':openSheet({t:'menu'});break;
    case 'closesheet':hideSheet();break;
    case 'zoomfit':S.zoom=S.fit/S.cw0;render();break;
    case 'zoomin':S.zoom=S.zoom+.15;render();break;
    case 'zoomout':S.zoom=S.zoom-.15;render();break;
    case 'dock':
      if(S.mode==='place'&&global.matchMedia('(max-width:899px)').matches){
        const d=R('dock'),o=d.dataset.open==='1'?'0':'1';d.dataset.open=o;R('dockToggle').setAttribute('aria-expanded',o==='1');
      }break;
    case 'tab':{S.tab=el.dataset.t;const L=calc(S);renderDock(L,whereMap(S,L));break}
    case 'mode':setMode(el.dataset.m);break;
    case 'unpick':S.pick=null;render();break;
    case 'auto':openSheet({t:'auto'});break;
    case 'amode':S.auto.mode=el.dataset.v;renderSheet();break;
    case 'autogo':autoApply(S.auto);break;
    case 'place':placeStudent(el.dataset.stu,sh.key);break;
    case 'unseat':unseat(el.dataset.stu);break;
    case 'pin':togglePin(el.dataset.stu);break;
    case 'move':S.pick={stu:el.dataset.stu};hideSheet();render();break;
    case 'tool':S.tool=el.dataset.t;S.sel=S.tool==='move'?S.sel:null;render();break;
    case 'dtype':S.deskType=el.dataset.v;render();break;
    case 'deselect':S.sel=null;render();break;
    case 'delsel':if(S.sel)delEls([S.sel]);break;
    case 'dupsel':dupSel();break;
    case 'rot':rotateSel();break;
    case 'nudge':nudge(+el.dataset.dx,+el.dataset.dy);break;
    case 'size':{
      const e=selEl();if(!e||!isBlock(e))break;
      const d=+el.dataset.d,nw=e.w+(el.dataset.k==='w'?d:0),nh=e.h+(el.dataset.k==='h'?d:0);
      if(!canPlace(S,e.x,e.y,nw,nh,e.id)){toast(d>0?'Büyümeye yer yok.':'Daha fazla küçülmez.');break}
      resizeEl(e.id,nw,nh);break;
    }
    case 'wlen':{
      const e=selEl();if(!e||e.t!=='wall')break;
      const nn=e.n+(+el.dataset.d);
      if(!wallFits(S,e.side,e.s,nn,e.id)){toast(+el.dataset.d>0?'Büyümeye yer yok.':'Daha fazla küçülmez.');break}
      moveWall(e.id,e.side,e.s,nn);break;
    }
    case 'wside':{
      const e=selEl();if(!e||e.t!=='wall'||e.side===el.dataset.v)break;
      const sp=wallSpot(S,el.dataset.v,e.s+(e.n-1)/2,e.n,e.id,wallLen(S,el.dataset.v));
      if(!sp){toast('Bu duvarda yer yok.');break}
      moveWall(e.id,el.dataset.v,sp.s,sp.n);break;
    }
    case 'gridset':hideSheet();openSheet({t:'grid'});break;
    case 'gridsz':setGrid(el.dataset.k,+el.dataset.d);break;
    case 'orient':if(S.yon!==el.dataset.v){commit(()=>{S.yon=el.dataset.v});render()}break;
    case 'tpl':openSheet({t:'tpl',k:el.dataset.tpl});break;
    case 'tplgo':loadTpl(el.dataset.tpl);break;
    case 'print':printPlan();break;
    case 'clear':{
      const n=Object.keys(whereMap(S,calc(S))).length;
      commit(()=>{S.asg={};S.pin={}});
      hideSheet();toast(n+' öğrenci bekleyene alındı.',true);render();break;
    }
  }
}
function onClick(e){
  const t=e.target;
  const a=t.closest('[data-act]');
  if(a&&root.contains(a)){if(a.tagName==='INPUT')return;act(a.dataset.act,a);return}
  if(S.mode==='place'){
    const seat=t.closest('[data-seat]');
    if(seat&&R('plan').contains(seat)){onSeatTap(seat.dataset.seat);return}
  }
  const st=t.closest('[data-stu]');
  if(st&&R('dock').contains(st))onStuTap(st.dataset.stu);
}
function onChange(e){
  const t=e.target;
  if(t.dataset.opt){S.auto[t.dataset.opt]=t.checked;const p=R('autoPrev');if(p)p.textContent=autoPreviewText(S,S.auto);return}
  if(t.dataset.r==='elLabel')S.typing=null;
}
function onInput(e){
  const t=e.target,r=t.dataset.r;
  if(r==='q'){S.q=t.value;renderList()}
  else if(r==='sq'){R('cand').innerHTML=candHTML(t.value)}
  else if(r==='elLabel'){
    const el=selEl();if(!el)return;
    if(S.typing!==el.id){commit(()=>{});S.typing=el.id}
    if(el.t==='teacher')el.name=t.value;else el.label=t.value;
    refreshPlan();
  }
}
function onKey(e){
  if(!root||!S)return;
  if(document.getElementById('kaReportPreview'))return;
  const inField=/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||'');
  if(e.key==='Escape'){if(requestClose())e.preventDefault();return}
  if(!S.editable)return;
  if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='z'&&!inField){e.preventDefault();if(e.shiftKey)doRedo();else doUndo();return}
  if(S.mode==='edit'&&S.sel&&!inField&&!S.sheet){
    const k={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    if(k){e.preventDefault();nudge(k[0],k[1])}
    else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();delEls([S.sel])}
  }
}

/* ---- Öğrenci sürükle-bırak (fare: hemen; dokunmatik: uzun basış) ---- */
function startScroll(){if(!scrollRAF)scrollRAF=requestAnimationFrame(scrollTick)}
function scrollTick(){
  scrollRAF=0;
  const g=drag&&drag.active?drag:(eg&&eg.active?eg:null);
  if(!g||!root)return;
  const wrap=R('planwrap'),r=wrap.getBoundingClientRect(),edge=56;
  let dy=0;
  if(g.lx>=r.left&&g.lx<=r.right){
    if(g.ly>=r.top-24&&g.ly<r.top+edge)dy=-Math.ceil((r.top+edge-g.ly)/6);
    else if(g.ly>r.bottom-edge&&g.ly<=r.bottom)dy=Math.ceil((g.ly-(r.bottom-edge))/6);
  }
  if(dy){
    const before=wrap.scrollTop;wrap.scrollTop=before+dy;
    if(wrap.scrollTop!==before){if(g===drag)moveGhost(g.lx,g.ly);else updateEditGhost()}
  }
  scrollRAF=requestAnimationFrame(scrollTick);
}
function clearDropMarks(){
  $$('.csg-seat.is-ok,.csg-seat.is-no-drop').forEach(n=>{n.classList.remove('is-ok','is-no-drop')});
  const d=R('dock');if(d)d.classList.remove('is-over');
}
function beginDrag(){
  if(!drag||drag.active)return;
  const s=S.studs[drag.stu];if(!s){drag=null;return}
  drag.active=true;root.classList.add('is-dragging');
  const g=document.createElement('div');g.className='bsg-ghost';
  g.innerHTML='<i class="csg-gd is-'+(s.g||'x')+'"></i>'+esc(shortName(S,s));
  root.appendChild(g);drag.ghost=g;moveGhost(drag.lx,drag.ly);startScroll();
}
function moveGhost(x,y){
  const g=drag.ghost;g.style.left=x+'px';g.style.top=y+'px';
  const el=document.elementFromPoint(x,y),seat=el&&el.closest('[data-r="plan"] [data-seat]'),dock=el&&el.closest('[data-r="dock"]');
  clearDropMarks();
  drag.target=null;drag.toDock=false;
  if(seat){
    const occ=S.asg[seat.dataset.seat];
    if(seat.dataset.stu===drag.stu){/* kendi koltuğu */}
    else if(occ&&S.pin[occ])seat.classList.add('is-no-drop');
    else{seat.classList.add('is-ok');drag.target=seat.dataset.seat}
  }else if(dock&&whereMap(S,calc(S))[drag.stu]){R('dock').classList.add('is-over');drag.toDock=true}
}
function endDrag(drop){
  if(!drag)return;
  clearTimeout(drag.timer);
  const d=drag;drag=null;
  if(d.active){
    if(d.ghost)d.ghost.remove();
    if(root)root.classList.remove('is-dragging');
    clearDropMarks();
    suppressUntil=performance.now()+150;
    if(drop){if(d.target)placeStudent(d.stu,d.target);else if(d.toDock)unseat(d.stu)}
  }
}

/* ---- Düzen hareketleri: hücreye oturan çizim, taşıma, boyutlandırma; duvar öğeleri duvar boyunca kayar ---- */
function cellAt(cx,cy,clampIt){
  const g=R('grid');if(!g)return null;
  const r=g.getBoundingClientRect(),m=S.m;
  const x=Math.floor((cx-r.left)/m.cw),y=Math.floor((cy-r.top)/m.ch);
  if(clampIt)return{x:clamp(x,0,S.grid.cols-1),y:clamp(y,0,S.grid.rows-1)};
  if(x<0||y<0||x>=S.grid.cols||y>=S.grid.rows)return null;
  return{x,y};
}
/* Bir hücreye en yakın duvar ve o duvardaki hücre sırası */
function nearestWall(c){
  const d={top:c.y,left:c.x,right:S.grid.cols-1-c.x,bottom:S.grid.rows-1-c.y};
  const side=['top','left','right','bottom'].sort((a,b)=>d[a]-d[b])[0];
  return{side,idx:(side==='top'||side==='bottom')?c.x:c.y};
}
/* İşaretçinin (hücre dışı bölge dahil) en yakın duvarı */
function wallPoint(cx,cy){
  const g=R('grid');if(!g)return null;
  const r=g.getBoundingClientRect(),m=S.m,px=cx-r.left,py=cy-r.top,W=S.grid.cols*m.cw,H=S.grid.rows*m.ch;
  const d={top:py,left:px,right:W-px,bottom:H-py};
  const side=['top','left','right','bottom'].sort((a,b)=>d[a]-d[b])[0];
  const horiz=side==='top'||side==='bottom';
  return{side,idx:horiz?clamp(Math.floor(px/m.cw),0,S.grid.cols-1):clamp(Math.floor(py/m.ch),0,S.grid.rows-1)};
}
/* Hızlı çekilen parmak hücre atlamasın diye iki nokta arasındaki tüm hücreleri doldurur */
function trail(cur){
  const a=eg.last||eg.start,n=Math.max(Math.abs(cur.x-a.x),Math.abs(cur.y-a.y));
  for(let i=0;i<=n;i++){
    const x=n?Math.round(a.x+(cur.x-a.x)*i/n):cur.x,y=n?Math.round(a.y+(cur.y-a.y)*i/n):cur.y;
    eg.cells[x+','+y]={x,y};
  }
  eg.last=cur;
}
const ghostHTML=r=>'<div class="bsg-gh'+(r.bad?' is-bad':'')+'" style="--x:'+r.x+';--y:'+r.y+';--w:'+r.w+';--h:'+r.h+'"></div>';
const wghostHTML=r=>'<div class="csg-wall is-'+r.side+' k-'+r.k+' is-ghost'+(r.bad?' is-bad':'')+'" style="--s:'+r.s+';--n:'+r.n+'"></div>';
function updateEditGhost(){
  if(!eg||!eg.active)return;
  const cur=cellAt(eg.lx,eg.ly,true),list=[],wlist=[];
  if(eg.mode==='move'){
    const e=eg.el,nx=e.x+cur.x-eg.start.x,ny=e.y+cur.y-eg.start.y;
    eg.res={x:nx,y:ny};eg.ok=canPlace(S,nx,ny,e.w,e.h,e.id);
    list.push({x:nx,y:ny,w:e.w,h:e.h,bad:!eg.ok});
  }else if(eg.mode==='resize'){
    const el=eg.el,nw=Math.max(1,cur.x-el.x+1),nh=Math.max(1,cur.y-el.y+1);
    eg.res={w:nw,h:nh};eg.ok=canPlace(S,el.x,el.y,nw,nh,el.id);
    list.push({x:el.x,y:el.y,w:nw,h:nh,bad:!eg.ok});
  }else if(eg.mode==='rect'){
    const x=Math.min(eg.start.x,cur.x),y=Math.min(eg.start.y,cur.y),w=Math.abs(cur.x-eg.start.x)+1,h=Math.abs(cur.y-eg.start.y)+1;
    eg.res={x,y,w,h};eg.ok=canPlace(S,x,y,w,h);
    list.push({x,y,w,h,bad:!eg.ok});
  }else if(eg.mode==='paint'){
    trail(cur);
    const ds=paintDesks(S,S.deskType,Object.keys(eg.cells).map(k=>eg.cells[k]));
    eg.res=ds;eg.ok=ds.length>0;
    ds.forEach(d=>list.push({x:d.x,y:d.y,w:d.w,h:d.h}));
  }else if(eg.mode==='erase'){
    trail(cur);
    Object.keys(eg.cells).forEach(k=>{const c=eg.cells[k],o=elAt(S,c.x,c.y);if(o)list.push({x:o.x,y:o.y,w:o.w,h:o.h,bad:true})});
    eg.ok=list.length>0;
  }else if(eg.mode==='wmove'){
    const e=eg.el,wp=wallPoint(eg.lx,eg.ly);
    if(wp){
      const grab=wp.side===e.side?eg.grab:Math.floor(e.n/2),L=wallLen(S,wp.side);
      const s=clamp(wp.idx-grab,0,Math.max(0,L-e.n));
      eg.res={side:wp.side,s};eg.ok=wallFits(S,wp.side,s,e.n,e.id);
      wlist.push({side:wp.side,k:e.k,s,n:Math.min(e.n,L),bad:!eg.ok});
    }
  }else if(eg.mode==='wresize'){
    const e=eg.el,horiz=e.side==='top'||e.side==='bottom';
    const idx=horiz?clamp(Math.floor((eg.lx-R('grid').getBoundingClientRect().left)/S.m.cw),0,S.grid.cols-1):clamp(Math.floor((eg.ly-R('grid').getBoundingClientRect().top)/S.m.ch),0,S.grid.rows-1);
    const nn=Math.max(1,idx-e.s+1);
    eg.res={n:nn};eg.ok=wallFits(S,e.side,e.s,nn,e.id);
    wlist.push({side:e.side,k:e.k,s:e.s,n:Math.min(nn,wallLen(S,e.side)-e.s),bad:!eg.ok});
  }
  const gh=R('ghosts');if(gh)gh.innerHTML=list.map(ghostHTML).join('');
  const wg=R('wghosts');if(wg)wg.innerHTML=wlist.map(wghostHTML).join('');
  if(eg.mode==='move'){const n=$('[data-el="'+eg.el.id+'"]');if(n)n.classList.add('bsg-moving')}
  if(eg.mode==='wmove'){const n=$('[data-wall="'+eg.el.id+'"]');if(n)n.classList.add('is-moving')}
}
function activateEdit(){
  if(!eg||eg.active)return;
  clearTimeout(eg.timer);
  const t=eg.tool;
  if(eg.kind==='whandle')eg.mode='wresize';
  else if(eg.kind==='handle')eg.mode='resize';
  else if(t==='move'&&eg.el)eg.mode=eg.el.t==='wall'?'wmove':'move';
  else if(t==='desk')eg.mode='paint';
  else if(t==='area')eg.mode='rect';
  else if(t==='erase'&&eg.kind!=='wall')eg.mode='erase';
  else eg.mode=null;
  if(eg.mode==='wmove'){
    const e=eg.el,horiz=e.side==='top'||e.side==='bottom';
    eg.grab=clamp((horiz?eg.start.x:eg.start.y)-e.s,0,e.n-1);
  }
  if(eg.mode){eg.active=true;eg.tap=false;root.classList.add('is-dragging');updateEditGhost();startScroll()}
}
function tapEdit(c,el,tool,kind){
  if(kind==='wall'&&el){
    if(tool==='erase'){delEls([el.id]);return}
    S.sel=el.id;S.tool='move';render();return;
  }
  if(tool==='move'){S.sel=el?el.id:null;render();return}
  if(tool==='desk'){
    if(el){S.sel=el.id;S.tool='move';render();return}
    const sp=deskSpot(S,S.deskType,c);
    if(!sp){toast('Buraya sığmıyor.');return}
    const e=newDesk(S.deskType,sp.x,sp.y,sp.w!==DESKS[S.deskType].w);addDesks([e]);return;
  }
  if(tool==='teacher'){
    if(el&&el.t==='teacher'){S.sel=el.id;S.tool='move';render();return}
    if(el){toast('Bu hücre dolu.');return}
    addTeacher(c);return;
  }
  if(tool==='board'||tool==='door'||tool==='window'){
    const nw=nearestWall(c);addWall(tool==='board'?'board':tool==='door'?'door':'window',nw.side,nw.idx);return;
  }
  if(tool==='area'){
    if(el){S.sel=el.id;S.tool='move';render();return}
    const a=canPlace(S,c.x,c.y,2,1)?[2,1]:(canPlace(S,c.x,c.y,1,1)?[1,1]:null);
    if(!a){toast('Buraya sığmıyor.');return}
    addArea(c.x,c.y,a[0],a[1]);return;
  }
  if(tool==='erase'){if(el)delEls([el.id])}
}
function finishEdit(){
  const g=eg;eg=null;
  if(root)root.classList.remove('is-dragging');
  const gh=root&&R('ghosts');if(gh)gh.innerHTML='';
  const wg=root&&R('wghosts');if(wg)wg.innerHTML='';
  if(!g.active){if(g.tap)tapEdit(g.start,g.el,g.tool,g.kind);return}
  suppressUntil=performance.now()+150;
  if(g.cancelled){render();return}
  if(g.mode==='move'){
    if(g.ok&&(g.res.x!==g.el.x||g.res.y!==g.el.y)){S.sel=g.el.id;moveEl(g.el.id,g.res.x,g.res.y)}
    else if(!g.ok){toast('Buraya sığmıyor.');render()}
    else{S.sel=g.el.id;render()}
  }else if(g.mode==='resize'){
    if(g.ok&&(g.res.w!==g.el.w||g.res.h!==g.el.h))resizeEl(g.el.id,g.res.w,g.res.h);
    else if(!g.ok){toast('Buraya sığmıyor.');render()}else render();
  }else if(g.mode==='rect'){
    if(g.ok)addArea(g.res.x,g.res.y,g.res.w,g.res.h);
    else{toast('Buraya sığmıyor.');render()}
  }else if(g.mode==='paint'){
    if(g.res&&g.res.length)addDesks(g.res);else render();
  }else if(g.mode==='erase'){
    const ids=[];Object.keys(g.cells).forEach(k=>{const o=elAt(S,g.cells[k].x,g.cells[k].y);if(o&&ids.indexOf(o.id)<0)ids.push(o.id)});
    if(ids.length)delEls(ids);else render();
  }else if(g.mode==='wmove'){
    if(g.ok&&g.res&&(g.res.side!==g.el.side||g.res.s!==g.el.s)){S.sel=g.el.id;moveWall(g.el.id,g.res.side,g.res.s)}
    else if(!g.ok){toast('Buraya sığmıyor.');render()}
    else{S.sel=g.el.id;render()}
  }else if(g.mode==='wresize'){
    if(g.ok&&g.res.n!==g.el.n)moveWall(g.el.id,g.el.side,g.el.s,g.res.n);
    else if(!g.ok){toast('Buraya sığmıyor.');render()}else render();
  }
}
function cancelGestures(){
  if(drag){clearTimeout(drag.timer);if(drag.ghost)drag.ghost.remove();drag=null}
  if(eg){clearTimeout(eg.timer);eg=null}
  if(root){
    root.classList.remove('is-dragging');clearDropMarks();
    const gh=R('ghosts');if(gh)gh.innerHTML='';
    const wg=R('wghosts');if(wg)wg.innerHTML='';
    $$('.bsg-moving,.csg-wall.is-moving').forEach(n=>n.classList.remove('bsg-moving','is-moving'));
  }
}

/* ---- İşaretçi dinleyicileri ---- */
function onPointerDown(e){
  if(e.pointerType==='mouse'&&e.button!==0)return;
  if(S.sheet)return;
  if(S.mode==='place'){
    if(!S.editable)return;
    const el=e.target.closest('[data-drag]');if(!el)return;
    cancelGestures();
    drag={stu:el.dataset.stu,x0:e.clientX,y0:e.clientY,lx:e.clientX,ly:e.clientY,pid:e.pointerId,type:e.pointerType,active:false,timer:null};
    if(e.pointerType!=='mouse')drag.timer=setTimeout(beginDrag,320);
    return;
  }
  if(!S.editable)return;
  const wallEl=e.target.closest('[data-wall]'),whandle=e.target.closest('[data-whandle]'),handle=e.target.closest('[data-handle]'),grid=e.target.closest('[data-r="grid"]');
  if(!wallEl&&!grid)return;
  cancelGestures();
  const c=cellAt(e.clientX,e.clientY,true);
  let target=null,kind='cell';
  if(whandle){target=selEl();kind='whandle'}
  else if(handle){target=selEl();kind='handle'}
  else if(wallEl){target=S.els.filter(o=>o.id===wallEl.dataset.wall)[0]||null;kind='wall'}
  else target=elAt(S,c.x,c.y);
  eg={pid:e.pointerId,type:e.pointerType,x0:e.clientX,y0:e.clientY,lx:e.clientX,ly:e.clientY,active:false,timer:null,start:c,tool:S.tool,el:target,kind,mode:null,cells:{},tap:true};
  if((kind==='handle'||kind==='whandle')&&target){activateEdit();e.preventDefault()}
  else if(e.pointerType!=='mouse')eg.timer=setTimeout(()=>{if(eg){eg.tap=false;activateEdit()}},280);
}
function onPointerMove(e){
  if(!root)return;
  if(drag&&e.pointerId===drag.pid){
    drag.lx=e.clientX;drag.ly=e.clientY;
    if(!drag.active){
      const dist=Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0);
      if(drag.type==='mouse'){if(dist>6)beginDrag()}
      else if(dist>10){clearTimeout(drag.timer);drag=null}
      return;
    }
    moveGhost(e.clientX,e.clientY);return;
  }
  if(eg&&e.pointerId===eg.pid){
    eg.lx=e.clientX;eg.ly=e.clientY;
    if(!eg.active){
      const d2=Math.hypot(e.clientX-eg.x0,e.clientY-eg.y0);
      if(eg.type==='mouse'){if(d2>5){activateEdit();if(!eg.active)eg.tap=false}}
      else if(d2>10){clearTimeout(eg.timer);eg=null}
      return;
    }
    updateEditGhost();
  }
}
function onPointerUp(e){
  if(!root)return;
  if(drag&&e.pointerId===drag.pid)endDrag(true);
  if(eg&&e.pointerId===eg.pid){clearTimeout(eg.timer);finishEdit()}
}
function onPointerCancel(e){
  if(!root)return;
  if(drag&&e.pointerId===drag.pid)endDrag(false);
  if(eg&&e.pointerId===eg.pid){clearTimeout(eg.timer);if(eg.active){eg.cancelled=true;finishEdit()}else eg=null}
}

/* ═════════ Açılış ═════════ */
const SKELETON=
 '<div class="bsg-app" data-r="app" data-mode="place" data-sel="0">'+
  '<header class="bsg-top">'+
   '<button type="button" class="bsg-ibtn" data-act="back" aria-label="Geri">'+ic('left')+'</button>'+
   '<div class="bsg-ttl"><h1 data-r="title">Oturma planı</h1><small data-r="sub"></small></div>'+
   '<button type="button" class="bsg-ibtn" data-r="undo" data-act="undo" aria-label="Geri al" disabled>'+ic('undo')+'</button>'+
   '<button type="button" class="bsg-ibtn" data-r="redo" data-act="redo" aria-label="Yinele" disabled>'+ic('redo')+'</button>'+
   '<button type="button" class="bsg-btn bsg-pri bsg-savebtn" data-r="save" data-act="save">Kaydet</button>'+
   '<button type="button" class="bsg-ibtn" data-act="menu" aria-label="Diğer işlemler">'+ic('more')+'</button>'+
  '</header>'+
  '<section class="bsg-stats" data-r="stats" aria-live="polite"></section>'+
  '<div class="bsg-pickbar" data-r="pick" hidden></div>'+
  '<main class="bsg-planwrap" data-r="planwrap">'+
   '<div class="bsg-zoomctl"><div><button type="button" data-act="zoomout" data-r="zOut" aria-label="Küçült">'+ic('minus','sm')+'</button><button type="button" data-act="zoomin" data-r="zIn" aria-label="Büyüt">'+ic('plus','sm')+'</button><button type="button" data-act="zoomfit" aria-label="Tamamını sığdır">'+ic('fit','sm')+'</button></div></div>'+
   '<div data-r="plan"></div>'+
  '</main>'+
  '<aside class="bsg-dock" data-r="dock" data-open="0" aria-label="Öğrenciler">'+
   '<div class="bsg-dock-head"><button type="button" class="bsg-dock-toggle" data-r="dockToggle" data-act="dock" aria-expanded="false"><span data-r="dockTitle">Bekleyen öğrenciler</span><span class="bsg-badge" data-r="dockBadge">0</span><span class="bsg-chev">'+ic('up','sm')+'</span></button></div>'+
   '<div class="bsg-strip" data-r="strip"></div>'+
   '<div class="bsg-dock-full">'+
    '<div class="bsg-search">'+ic('search')+'<input data-r="q" type="search" placeholder="Öğrenci ara (ad, soyad, numara)" autocomplete="off" aria-label="Öğrenci ara"></div>'+
    '<div class="bsg-tabs" data-r="tabs"></div>'+
    '<div class="bsg-list" data-r="list"></div>'+
   '</div>'+
   '<div class="bsg-edit-tools" data-r="editTools"></div>'+
  '</aside>'+
  '<nav class="bsg-modebar" data-r="modebar" aria-label="Çalışma modu"><div class="bsg-seg">'+
   '<button type="button" data-act="mode" data-m="place" data-r="mPlace" aria-pressed="true">'+ic('user','sm')+'Yerleştir</button>'+
   '<button type="button" data-act="mode" data-m="edit" data-r="mEdit" aria-pressed="false">'+ic('layout','sm')+'Düzen</button>'+
  '</div></nav>'+
  '<div class="bsg-scrim" data-r="scrim" data-act="closesheet" data-on="0"></div>'+
  '<div class="bsg-sheet" data-r="sheet" data-on="0" role="dialog" aria-modal="true" tabindex="-1"></div>'+
  '<div class="bsg-toast" data-r="toast" role="status" hidden></div>'+
 '</div>';

/* opts: { plan (kayıtlı belge ya da null), students:[{id,name,no,gender}], className, teacher, title, fileName, editable,
 *         onSave(payload)→Promise, onClose(), print({title,body,extraHead,fileName,yon}), host } */
function open(opts){
  opts=opts||{};
  if(root)close(true);
  const m=fromStored({plan:opts.plan,students:opts.students||[],teacher:opts.teacher||'',className:opts.className||''});
  const editable=opts.editable!==false;
  let seeded=false;
  if(editable&&!m.els.length){
    seeded=true;
    const t=buildTemplate('standart',realStudents(m).length,m.teacher);
    applyTemplate(m,t);
    m.asg=autoPlan(m,{mode:'alfa',keep:false}).occ;
  }
  ctx={onSave:opts.onSave,onClose:opts.onClose,print:opts.print,title:opts.title||'Sınıf oturma düzeni',fileName:opts.fileName||'Sinif_Oturma_Plani'};
  S=m;
  Object.assign(S,{editable,mode:'place',tab:'wait',q:'',pick:null,sel:null,tool:'move',deskType:'ikili-masa',sheet:null,zoom:1,m:{cw:64,ch:54},atMin:false,atMax:false,auto:{mode:'alfa',keep:true},saving:false,everSaved:false,typing:null});
  undoS=[];redoS=[];drag=null;eg=null;suppressUntil=0;
  prune(S);
  if(editable&&calc(S).total===0)S.mode='edit';
  S.saved=dirtyKey();
  if(seeded||(editable&&S.dropped.length))S.saved='';   /* yeni oluşturulan ya da temizlenen plan: kaydedilmemiş sayılsın */
  root=document.createElement('div');root.className='bsg-root csg-root';root.id='classSeatingGrid';root.setAttribute('data-class-seating-overlay','');
  root.innerHTML=SKELETON;
  (opts.host||document.body).appendChild(root);
  try{document.body.classList.add('modal-open')}catch(_){}
  try{const r=global.KorukPlatformAdapter&&global.KorukPlatformAdapter.setPullToRefreshEnabled&&global.KorukPlatformAdapter.setPullToRefreshEnabled(false);if(r&&r.catch)r.catch(()=>{})}catch(_){}
  R('title').textContent='Oturma planı';
  R('sub').textContent=[m.className,m.teacher,editable?'':'Görüntüleme'].filter(Boolean).join(' · ');
  ['undo','redo','save'].forEach(n=>{R(n).hidden=!editable});
  R('modebar').hidden=!editable;
  ac=new AbortController();const sg={signal:ac.signal};
  root.addEventListener('click',onClick,sg);
  root.addEventListener('change',onChange,sg);
  root.addEventListener('input',onInput,sg);
  root.addEventListener('pointerdown',onPointerDown,sg);
  root.addEventListener('contextmenu',e=>{if(e.target.closest('[data-drag],[data-r="grid"],[data-wall]'))e.preventDefault()},sg);
  document.addEventListener('pointermove',onPointerMove,sg);
  document.addEventListener('pointerup',onPointerUp,sg);
  document.addEventListener('pointercancel',onPointerCancel,sg);
  document.addEventListener('touchmove',e=>{if((drag&&drag.active)||(eg&&eg.active))e.preventDefault()},{signal:ac.signal,passive:false});
  document.addEventListener('keydown',onKey,sg);
  document.addEventListener('click',e=>{if(performance.now()<suppressUntil){e.stopPropagation();e.preventDefault()}},{signal:ac.signal,capture:true});
  global.addEventListener('beforeunload',e=>{if(root&&isDirty()){e.preventDefault();e.returnValue=''}},sg);
  render();
  if(seeded&&realStudents(S).length)toast('Plan hazırlandı: '+realStudents(S).length+' öğrenci alfabetik yerleşti. İstediğin gibi değiştirip kaydet.',null,6500);
  else if(editable&&S.dropped.length)toast(S.dropped.length+' kişi sınıftan ayrıldığı için koltuktan çıkarıldı. Kaydedince kalıcı olur.',null,6500);
  if(typeof ResizeObserver==='function'){
    ro=new ResizeObserver(()=>{if(!root||!S||(eg&&eg.active))return;const o=S.m.cw;applyMetrics();if(o!==S.m.cw)fitNames()});
    ro.observe(R('planwrap'));
  }
  return true;
}
const isOpen=()=>!!root;

global.ClassSeatingGrid={open,close,requestClose,isOpen,isDirty:()=>!!(S&&isDirty()),serialize:()=>S?toStored(S):null,
  _pure:{splitName,makeStudent,fromStored,toStored,calc,statsOf,whereMap,autoPlan,autoPreviewText,suggestions,canPlace,fits,wallFits,wallSpot,elAt,prune,gridBounds,rotateEl,dupEl,paintDesks,deskSpot,newDesk,newWall,newTeacher,newArea,buildTemplate,applyTemplate,printModel,wrapText,TEMPLATES,DESKS,WALLS,LIM,PAGE,fold,esc,shortName,realStudents,remapIdx,migrate,pxGeom,posText}};
})(window);
