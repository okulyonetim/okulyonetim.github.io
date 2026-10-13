/* Koruk Asistan — Servis oturma planı: hücre ızgarası editörü (BusSeatingGrid)
 * Tek ızgara, tek motor: koltuk / kapı / şoför / alan aynı hücre ızgarasına oturur, bu yüzden hizalama hatası olmaz.
 * Veri biçimi eski "tablo editörü" ile aynıdır (row/column/rowSpan/colSpan + layout.table, editorVersion 2);
 * kayıt sırasında ServisOturmaService eski yerlesim/koltuklar alanlarını da yazar, böylece raporlar ve eski planlar çalışır.
 * Dosya iki katmandan oluşur: (1) saf veri katmanı (fromStored/toStored/calc/autoPlan — DOM'suz, testlenebilir),
 * (2) arayüz (açılış, çizim, sürükleme, sayfalar, yazdırma). Renkler yalnız var(--ka-*) üzerinden gelir (css/design-system-base.css, "SERVİS OTURMA IZGARASI").
 */
(function(global){
'use strict';
if(global.BusSeatingGrid)return;

/* ═════════ Yardımcılar ═════════ */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold=s=>String(s??'').replace(/[İIı]/g,'i').toLowerCase().replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
const trSort=(a,b)=>String(a).localeCompare(String(b),'tr');
let uidN=0;
const uid=p=>p+'_'+Date.now().toString(36)+'_'+(++uidN).toString(36)+Math.random().toString(36).slice(2,5);
const clone=v=>JSON.parse(JSON.stringify(v));
const LIM={minCols:2,maxCols:14,minRows:2,maxRows:40};
const HUES=[40,205,140,275,335,15,175,45,95];
const SEAT_KINDS=['seat','double','special'];
const AREA_KINDS=['window','emergency','engine','luggage','empty'];

/* ═════════ Öğrenci modeli ═════════ */
function splitName(full){
  const t=String(full||'').trim().split(/\s+/).filter(Boolean);
  if(t.length<2)return{ad:t[0]||'',soyad:''};
  return{ad:t.slice(0,-1).join(' '),soyad:t[t.length-1]};
}
function makeStudent(s){
  const full=String(s.name??s.ogrenciAdi??'').trim(),n=splitName(full),sinif=String(s.className??s.sinif??'').trim(),grade=parseInt(sinif,10)||0;
  return{id:String(s.id),full,ad:n.ad,soyad:n.soyad,sinif,classId:String(s.classId||''),grade,hue:HUES[grade]??HUES[0],guardian:String(s.guardian||'').trim(),orphan:!!s.orphan,kg:''};
}
/* Kardeş tahmini: aynı veli adı + aynı soyad. Kayıtta kardeş alanı olmadığı için yalnızca bu iki bilgi birlikte eşleşirse sayılır. */
function markSiblings(studs){
  const g={};
  Object.keys(studs).forEach(id=>{const s=studs[id];if(s.orphan||!s.guardian||!s.soyad)return;const k=fold(s.guardian)+'|'+fold(s.soyad);(g[k]=g[k]||[]).push(s)});
  Object.keys(g).forEach((k,i)=>{if(g[k].length>1)g[k].forEach(s=>{s.kg='g'+i})});
}
const first=s=>(s.ad||s.full).split(' ')[0];
const mates=(m,s)=>s.kg?Object.keys(m.studs).map(id=>m.studs[id]).filter(o=>o.kg===s.kg&&o!==s):[];
function shortName(m,s){const f=first(s),dup=Object.keys(m.studs).some(id=>{const o=m.studs[id];return o!==s&&first(o)===f});return dup&&s.soyad?f+' '+s.soyad.charAt(0)+'.':f}

/* ═════════ Şablonlar (hücre koordinatı: x sütun, y satır) ═════════ */
const seatAt=(x,y)=>({type:'seat',x,y,w:1,h:1});
const rowSeats=(y,xs)=>xs.map(x=>seatAt(x,y));
function tplBuild(cols,rows,leftX,rightX,doorW,backRow,driverName){
  const e=[{type:'driver',x:0,y:0,w:1,h:1,name:driverName||''},{type:'door',x:cols-doorW,y:0,w:doorW,h:1,label:'Kapı'}];
  if(leftX.length>1)e.push(seatAt(1,0));
  for(let y=1;y<rows-1;y++)leftX.concat(rightX).forEach(x=>e.push(seatAt(x,y)));
  if(backRow)for(let x=0;x<cols;x++)e.push(seatAt(x,rows-1));
  return e;
}
const TEMPLATES={
  minibus:{ad:'Minibüs · 2+1',cols:4,rows:7,sablon:'minibus',build:d=>tplBuild(4,7,[0,1],[3],1,true,d)},
  '2x2':{ad:'Servis · 2+2',cols:5,rows:8,sablon:'2x2',build:d=>tplBuild(5,8,[0,1],[3,4],2,true,d)},
  '1x2':{ad:'Servis · 1+2',cols:4,rows:8,sablon:'1x2',build:d=>{const e=tplBuild(4,8,[0],[2,3],2,true,d);return e}},
  otobus:{ad:'Otobüs · 2+2 uzun',cols:5,rows:13,sablon:'2x2',build:d=>tplBuild(5,13,[0,1],[3,4],2,true,d)},
  empty:{ad:'Boş plan',cols:5,rows:6,sablon:'empty',build:d=>[{type:'driver',x:0,y:0,w:1,h:1,name:d||''}]}
};
function tplElements(key,driverName){return TEMPLATES[key].build(driverName).map(e=>Object.assign({id:uid(e.type)},e))}
const tplSeatCount=k=>TEMPLATES[k].build('').filter(e=>e.type==='seat').length;

/* ═════════ Kayıtlı veri → ızgara modeli ═════════ */
function kindOf(e){
  const p=(e&&e.properties)||{};
  if(e&&(e.type==='sofor'||p.kind==='driver'))return'driver';
  if(e&&(e.type==='koltuk'||e.type==='arka-koltuk'||SEAT_KINDS.includes(p.kind)))return'seat';
  if(p.kind==='door')return'door';
  return'area';
}
const posInt=v=>{const n=Number(v);return Number.isInteger(n)&&n>=1?n:0};
function fits(els,cols,rows,x,y,w,h,ig){
  if(x<0||y<0||w<1||h<1||x+w>cols||y+h>rows)return false;
  return !els.some(e=>e.id!==ig&&x<e.x+e.w&&x+w>e.x&&y<e.y+e.h&&y+h>e.y);
}
/* Yeri belli olmayan öğeyi ilk boş hücreye (satır satır) koyar; yer yoksa satır ekler. */
function placeLoose(m,el){
  for(let y=0;;y++){
    if(y+el.h>m.grid.rows&&m.grid.rows<LIM.maxRows)m.grid.rows=y+el.h;
    if(y+el.h>m.grid.rows)return false;
    for(let x=0;x+el.w<=m.grid.cols;x++)if(fits(m.els,m.grid.cols,m.grid.rows,x,y,el.w,el.h)){el.x=x;el.y=y;m.els.push(el);return true}
  }
}
/* Eski "konum" (sol-dis/sol-ic/sag-ic/sag-dis/arka) şemasından hücre ata. */
function konumCells(list){
  const has=k=>list.some(e=>(e.properties||{}).konum===k);
  const L=['sol-dis','sol-ic'].filter(has),R=['sag-ic','sag-dis'].filter(has);
  const cols=L.length+(L.length&&R.length?1:0)+R.length,xOf={};
  L.forEach((k,i)=>{xOf[k]=i});R.forEach((k,i)=>{xOf[k]=L.length+(L.length?1:0)+i});
  const aisle=L.length&&R.length?L.length:-1,out={};
  const arka=list.filter(e=>(e.properties||{}).konum==='arka');
  const lanes=[];for(let x=0;x<cols;x++)if(x!==aisle||arka.length>=cols)lanes.push(x);
  list.forEach(e=>{
    const k=(e.properties||{}).konum,y=Math.max(0,Number(e.row)||0);
    if(k==='arka'){const i=arka.indexOf(e);out[e.id]={x:lanes[i%Math.max(1,lanes.length)]??0,y:y+Math.floor(i/Math.max(1,lanes.length))};return}
    if(k in xOf)out[e.id]={x:xOf[k],y};
  });
  return{cells:out,cols:Math.max(cols,3)};
}
/* Eski serbest tuvaldeki (piksel x/y) öğeleri sütun/satır kümelerine dök. */
function clusterCells(list){
  const grp=(vals,thr)=>{const s=vals.slice().sort((a,b)=>a-b),idx=new Map();let c=-1,start=-1e9;s.forEach(v=>{if(v-start>thr){c++;start=v}idx.set(v,c)});return idx};
  const xs=grp(list.map(e=>Number(e.x)),60),ys=grp(list.map(e=>Number(e.y)),50),out={};
  list.forEach(e=>{out[e.id]={x:xs.get(Number(e.x)),y:ys.get(Number(e.y))}});
  return{cells:out};
}
function fromStored(inp){
  const raw=(Array.isArray(inp.elements)?inp.elements:[]).filter(e=>e&&e.visible!==false);
  const lay=inp.layout||{},t=lay.table||{},svc=inp.service||{};
  const m={grid:{cols:0,rows:0},els:[],seats:{},notes:{},studs:{},numMode:t.numbering==='col'?'col':'row',planAdi:inp.planAdi||'Servis Oturma Planı',sablon:inp.sablon||'custom',svcDriver:svc.driver||'',dropped:[]};
  (inp.students||[]).forEach(s=>{const o=makeStudent(s);m.studs[o.id]=o});
  markSiblings(m.studs);
  const seen={};raw.forEach((e,i)=>{if(!e.id||seen[e.id])e.id=uid('el'+i);seen[e.id]=1});
  const byName={};Object.keys(m.studs).forEach(id=>{const k=fold(m.studs[id].full);(byName[k]=byName[k]||[]).push(id)});
  const used={};
  /* 1) hücre koordinatları */
  const table=Number(t.editorVersion)===2;
  let cells={},extraCols=0;
  const loose=[];
  const tbl=raw.filter(e=>table&&posInt(e.row)&&posInt(e.column));
  const rest=raw.filter(e=>tbl.indexOf(e)<0);
  tbl.forEach(e=>{cells[e.id]={x:posInt(e.column)-1,y:posInt(e.row)-1,w:Math.max(1,posInt(e.colSpan)||1),h:Math.max(1,posInt(e.rowSpan)||1)}});
  if(rest.length){
    const withK=rest.filter(e=>(e.properties||{}).konum);
    const withXY=rest.filter(e=>!(e.properties||{}).konum&&Number.isFinite(Number(e.x))&&Number.isFinite(Number(e.y))&&(Number(e.x)||Number(e.y)));
    if(withK.length&&withK.length>=withXY.length){const r=konumCells(withK);Object.assign(cells,r.cells);extraCols=r.cols}
    else if(withXY.length){Object.assign(cells,clusterCells(withXY).cells)}
    rest.forEach(e=>{if(!cells[e.id])loose.push(e)});
  }
  let cols=Math.max(LIM.minCols,posInt(t.cols)||0,extraCols),rows=Math.max(LIM.minRows,posInt(t.rows)||0);
  Object.keys(cells).forEach(id=>{const c=cells[id];cols=Math.max(cols,c.x+(c.w||1));rows=Math.max(rows,c.y+(c.h||1))});
  m.grid.cols=Math.min(LIM.maxCols,cols);m.grid.rows=Math.min(LIM.maxRows,rows);
  /* 2) öğeleri oluştur: önce yeri belli olanlar, sonra yeri olmayanlar (koltuk numarası sırasıyla); sığmayan boş hücreye alınır */
  const keep={};raw.forEach((e,i)=>{keep[e.id]=i});
  const order=raw.slice().sort((a,b)=>{
    const ca=cells[a.id]?0:1,cb=cells[b.id]?0:1;
    return ca-cb||(ca?0:(Number(a.seatNumber)||0)-(Number(b.seatNumber)||0))||keep[a.id]-keep[b.id];
  });
  order.forEach(e=>{
    const k=kindOf(e),p=e.properties||{},c=cells[e.id];
    const el={id:String(e.id),type:k,x:c?c.x:0,y:c?c.y:0,w:Math.min(m.grid.cols,Math.max(1,(c&&c.w)||1)),h:Math.min(m.grid.rows,Math.max(1,(c&&c.h)||1)),raw:clone(e)};
    if(k==='door')el.label=p.label||'Kapı';
    if(k==='area')el.label=p.label!=null?String(p.label):'Alan';
    if(k==='driver')el.name=p.driverName!==undefined?String(p.driverName):(svc.driver||'');
    if(c&&fits(m.els,m.grid.cols,m.grid.rows,el.x,el.y,el.w,el.h))m.els.push(el);
    else{el.w=1;el.h=1;if(!placeLoose(m,el))return}
    if(k==='seat')bindSeat(m,el,e,byName,used);
  });
  return m;
}
function bindSeat(m,el,e,byName,used){
  const p=e.properties||{},sid=e.studentId!=null?String(e.studentId):'',nm=String(p.studentName||'').trim();
  let stu=null;
  if(sid&&m.studs[sid]&&!used[sid])stu=m.studs[sid];
  else if(nm){
    const all=byName[fold(nm)]||[],c=all.filter(id=>!used[id]);
    if(c.length===1)stu=m.studs[c[0]];
    else if(!all.length&&Object.keys(byName).length){m.dropped.push(nm)}   /* serviste olmayan (taşınmış/ayrılmış) öğrenci: koltuk boşalır. Servis listesi hiç yoksa karar verilemez, ad korunur. */
    else if(c.length>1||!all.length){const o=makeStudent({id:'x:'+el.id,name:nm,className:'',orphan:true});m.studs[o.id]=o;stu=o}   /* belirsiz ya da liste yok: adı kaybolmasın. Zaten başka koltukta oturan öğrencinin ikinci kaydı boş bırakılır. */
  }
  const d={};
  if(stu){used[stu.id]=1;d.stu=stu.id;const note=String(p.note||'').trim();if(note)m.notes[stu.id]=note}
  else if(p.reserved)d.res=String(p.reserveNote||'').trim()||'Rezerve';
  if(p.closed&&!stu)d.bad=true;
  if(d.stu||d.res||d.bad)m.seats[el.id]=d;
}

/* ═════════ Izgara modeli → kayıtlı veri ═════════ */
const CELL_PX=82;   /* eski tablo editörüyle uyum: 82 px'lik hücre; x/y/genişlik/yükseklik hücreden türetilir, böylece eski editör de planı bozmadan açar */
function calc(m){
  const seats=m.els.filter(e=>e.type==='seat');
  const cmp=m.numMode==='col'?(a,b)=>a.x-b.x||a.y-b.y:(a,b)=>a.y-b.y||a.x-b.x;
  seats.sort(cmp);
  const byId={},byY={};
  seats.forEach((s,i)=>{s.no=i+1;byId[s.id]=s;(byY[s.y]=byY[s.y]||[]).push(s)});
  Object.keys(byY).forEach(y=>{
    const arr=byY[y].sort((a,b)=>a.x-b.x);let u=0,prev=null;
    arr.forEach(s=>{if(!prev||s.x>prev.x+prev.w)u++;s.unit=y+':'+u;prev=s});
  });
  const ys=Object.keys(byY).map(Number).sort((a,b)=>a-b);
  seats.forEach(s=>{s.rank=ys.indexOf(s.y)+1});
  return{seats,byId,total:seats.length};
}
const sd=(m,id)=>m.seats[id]||{};
function toStored(m){
  const L=calc(m),out=[];
  m.els.forEach(el=>{
    const raw=el.raw?clone(el.raw):{},p=Object.assign({},raw.properties||{});delete p.konum;
    const base=Object.assign(raw,{id:el.id,row:el.y+1,column:el.x+1,rowSpan:el.h,colSpan:el.w,x:15+el.x*CELL_PX,y:100+el.y*CELL_PX,width:Math.max(40,el.w*CELL_PX-8),height:Math.max(40,el.h*CELL_PX-8),rotation:0,visible:true});
    if(el.type==='seat'){
      const d=sd(m,el.id),stu=d.stu?m.studs[d.stu]:null;
      if(!SEAT_KINDS.includes(p.kind))p.kind='seat';
      p.studentName=stu?stu.full:'';
      if(stu&&!stu.orphan){p.sinifAdi=stu.sinif;if(stu.classId)p.sinifId=stu.classId;else delete p.sinifId}else if(!stu){delete p.sinifAdi;delete p.sinifId}
      p.reserved=!!d.res&&!stu;if(p.reserved)p.reserveNote=d.res;else delete p.reserveNote;
      p.closed=!!d.bad&&!stu;if(!p.closed)delete p.closed;
      const note=stu?m.notes[stu.id]:'';if(note)p.note=note;else delete p.note;
      out.push(Object.assign(base,{type:'koltuk',seatNumber:L.byId[el.id].no,studentId:stu&&!stu.orphan?stu.id:null,locked:!!raw.locked,properties:p}));
    }else if(el.type==='driver'){
      p.kind='driver';p.label=p.label||'Şoför';p.driverName=el.name||'';
      out.push(Object.assign(base,{type:'sofor',seatNumber:null,studentId:null,locked:true,properties:p}));
    }else if(el.type==='door'){
      p.kind='door';p.label=el.label||'Kapı';
      out.push(Object.assign(base,{type:'vehicle',seatNumber:null,studentId:null,locked:true,properties:p}));
    }else{
      if(!AREA_KINDS.includes(p.kind))p.kind='empty';p.label=el.label||'';
      out.push(Object.assign(base,{type:'vehicle',seatNumber:null,studentId:null,locked:true,properties:p}));
    }
  });
  const cols=m.grid.cols,rows=m.grid.rows;
  return{
    elements:out,sablon:m.sablon,planAdi:m.planAdi,
    layout:{width:0,height:0,table:{editorVersion:2,rows,cols,rowHeights:Array(rows).fill(82),colWidths:Array(cols).fill(82),manualRows:Array(rows).fill(false),manualCols:Array(cols).fill(false),numbering:m.numMode},grid:{version:1}}
  };
}

/* ═════════ Sayımlar ve metinler ═════════ */
function whereMap(m,L){const w={};Object.keys(m.seats).forEach(id=>{const d=m.seats[id];if(d.stu&&L.byId[id])w[d.stu]=id});return w}
function realStudents(m){return Object.keys(m.studs).map(id=>m.studs[id]).filter(s=>!s.orphan)}
function statsOf(m,L){
  let bad=0,res=0,placed=0;
  L.seats.forEach(s=>{const d=sd(m,s.id);if(d.bad)bad++;else if(d.res)res++;else if(d.stu)placed++});
  const usable=L.total-bad-res,w=whereMap(m,L),waiting=realStudents(m).filter(s=>!w[s.id]).length;
  return{total:L.total,bad,res,placed,usable,free:usable-placed,waiting};
}
function posText(m,s,L){
  const at=x=>L.seats.some(o=>o.y===s.y&&o.x===x&&o!==s&&!(o.x===s.x));
  const right=s.x+s.w;
  const side=s.x===0?'sol cam':(right>=m.grid.cols?'sağ cam':((!at(s.x-1)||!at(right))?'koridor yanı':'ortada'));
  return s.rank+'. satır · '+side;
}

/* ═════════ Önerilen öğrenciler (boş koltuk için) ═════════ */
function suggestions(m,seat,L,w,q){
  const unit=L.seats.filter(s=>s.unit===seat.unit&&s.id!==seat.id);
  let list=Object.keys(m.studs).map(id=>m.studs[id]).filter(s=>!s.orphan&&!w[s.id]);
  if(q){const f=fold(q);list=list.filter(s=>fold(s.full+' '+s.sinif).indexOf(f)>-1)}
  return list.map(s=>{
    let score=0;const tags=[];
    unit.forEach(o=>{
      const oc=sd(m,o.id).stu;if(!oc)return;const x=m.studs[oc];
      if(s.kg&&x.kg===s.kg){score+=3;if(tags.indexOf('Kardeşi yanında')<0)tags.push('Kardeşi yanında')}
      else if(x.sinif&&x.sinif===s.sinif){score+=1;if(tags.indexOf('Aynı sınıf yanında')<0)tags.push('Aynı sınıf yanında')}
    });
    return{s,score,tags};
  }).sort((a,b)=>b.score-a.score||a.s.grade-b.s.grade||trSort(a.s.full,b.s.full));
}

/* ═════════ Otomatik yerleştirme (yan yana oturan koltuklar bir "grup" sayılır) ═════════ */
function autoPlan(m,opt){
  const L=calc(m),occ={},w0=whereMap(m,L);
  if(opt.keep){for(const k in w0)occ[w0[k]]=k}
  const placed={};for(const o in occ)placed[occ[o]]=1;
  const pool=realStudents(m).filter(s=>!placed[s.id]);
  const usable=s=>{const d=sd(m,s.id);return !d.bad&&!d.res};
  const freeSeats=()=>L.seats.filter(s=>usable(s)&&!occ[s.id]);
  const seatOf=id=>{for(const k in occ)if(occ[k]===id)return L.byId[k];return null};
  const groups=[],used={};
  pool.forEach(s=>{
    if(used[s.id])return;
    const g=opt.sib&&s.kg?pool.filter(o=>o.kg===s.kg):[s];
    g.forEach(o=>{used[o.id]=1});groups.push(g);
  });
  const gk=g=>Math.min.apply(null,g.map(s=>s.grade));
  const multi=groups.filter(g=>g.length>1),single=groups.filter(g=>g.length===1);
  if(opt.small){multi.sort((a,b)=>gk(a)-gk(b));single.sort((a,b)=>gk(a)-gk(b)||trSort(a[0].full,b[0].full))}
  multi.concat(single).forEach(g=>{
    let anchor=null;
    if(opt.sib&&g[0].kg){const mt=realStudents(m).filter(o=>o.kg===g[0].kg&&pool.indexOf(o)<0&&seatOf(o.id))[0];if(mt)anchor=seatOf(mt.id)}
    const fr=freeSeats();if(!fr.length)return;
    if(anchor){
      const same=fr.filter(s=>s.unit===anchor.unit).sort((a,b)=>Math.abs(a.x-anchor.x)-Math.abs(b.x-anchor.x));
      g.forEach(st=>{const p=same.shift()||freeSeats()[0];if(p)occ[p.id]=st.id});
      return;
    }
    if(g.length>1){
      const byU={};fr.forEach(s=>{(byU[s.unit]=byU[s.unit]||[]).push(s)});
      let unit=null;for(const u in byU){if(byU[u].length>=g.length){unit=byU[u];break}}
      const seats=unit?unit.slice(0,g.length):fr.slice(0,g.length);
      g.forEach((st,i)=>{if(seats[i])occ[seats[i].id]=st.id});
      return;
    }
    occ[fr[0].id]=g[0].id;
  });
  const seated={};for(const q in occ)seated[occ[q]]=q;
  const added=pool.filter(s=>seated[s.id]).length;
  const kgs={};realStudents(m).forEach(s=>{if(s.kg)(kgs[s.kg]=kgs[s.kg]||[]).push(s)});
  let together=0,apart=0;
  for(const g in kgs){
    const ids=kgs[g].map(s=>seated[s.id]).filter(Boolean);
    if(ids.length<2)continue;
    const us=ids.map(id=>L.byId[id].unit);
    if(us.every(x=>x===us[0]))together++;else apart++;
  }
  return{occ,added,left:pool.length-added,together,apart};
}
function autoPreviewText(m,opt){
  const p=autoPlan(m,opt);
  let t=p.added+' öğrenci yerleşecek';
  if(p.left)t+=' · '+p.left+' öğrenci sığmıyor';
  if(p.together||p.apart)t+=' · '+p.together+' kardeş grubu yan yana'+(p.apart?', '+p.apart+' grup ayrı':'');
  return t+'.';
}

/* ═════════ Düzen işlemleri (saf) ═════════ */
const elAt=(m,x,y)=>m.els.filter(e=>x>=e.x&&x<e.x+e.w&&y>=e.y&&y<e.y+e.h)[0]||null;
const canPlace=(m,x,y,w,h,ig)=>fits(m.els,m.grid.cols,m.grid.rows,x,y,w,h,ig);
function newEl(m,type,x,y,w,h){
  const e={id:uid(type),type,x,y,w,h};
  if(type==='door')e.label='Kapı';else if(type==='area')e.label='Alan';else if(type==='driver')e.name=m.svcDriver||'';
  return e;
}
function prune(m){
  const L=calc(m);let lost=0;
  Object.keys(m.seats).forEach(id=>{if(!L.byId[id]){if(m.seats[id].stu)lost++;delete m.seats[id]}});
  return lost;
}
function gridBounds(m){
  return{maxX:Math.max.apply(null,[0].concat(m.els.map(e=>e.x+e.w))),maxY:Math.max.apply(null,[0].concat(m.els.map(e=>e.y+e.h)))};
}

/* ═════════ Yazdırma gövdesi (ReportEngine.printReport'a verilir; renkler --ka-report-transport-* ) ═════════ */
function printModel(m,info){
  const L=calc(m),st=statsOf(m,L),g=m.grid;
  const cellMm=170/g.cols,rowMm=Math.round(Math.min(26,Math.max(15,cellMm*1.08))*10)/10,pt=g.cols<=5?8:(g.cols<=7?7:6);
  const cells=m.els.map(el=>{
    const pos='grid-column:'+(el.x+1)+' / span '+el.w+';grid-row:'+(el.y+1)+' / span '+el.h;
    if(el.type==='seat'){
      const s=L.byId[el.id],d=sd(m,el.id),stu=d.stu?m.studs[d.stu]:null;
      if(d.bad)return'<div class="bsgp-c x" style="'+pos+'"><i>'+s.no+'</i><b>Kapalı</b></div>';
      if(d.res)return'<div class="bsgp-c x" style="'+pos+'"><i>'+s.no+'</i><b>'+esc(d.res)+'</b></div>';
      if(stu)return'<div class="bsgp-c f" style="'+pos+'"><i>'+s.no+'</i><b>'+esc(stu.ad)+'</b><span>'+esc(stu.soyad)+'</span><em>'+esc(stu.sinif)+'</em></div>';
      return'<div class="bsgp-c e" style="'+pos+'"><i>'+s.no+'</i></div>';
    }
    if(el.type==='driver')return'<div class="bsgp-c d" style="'+pos+'"><em>Şoför</em><b>'+esc(el.name||'')+'</b></div>';
    if(el.type==='door')return'<div class="bsgp-c o" style="'+pos+'"><b>'+esc(el.label||'Kapı')+'</b></div>';
    return'<div class="bsgp-c a" style="'+pos+'"><b>'+esc(el.label||'')+'</b></div>';
  }).join('');
  const rows=L.seats.filter(s=>sd(m,s.id).stu).map(s=>({no:s.no,s:m.studs[sd(m,s.id).stu]}));
  const w=whereMap(m,L),wait=realStudents(m).filter(s=>!w[s.id]).sort((a,b)=>a.grade-b.grade||trSort(a.full,b.full));
  const driver=m.els.filter(e=>e.type==='driver')[0];
  const body='<div class="bsgp"><h1>'+esc(info.school||'')+'</h1><h2>SERVİS OTURMA PLANI</h2>'+
    '<p><b>Servis:</b> '+esc(info.name||'—')+' &nbsp; <b>Plaka:</b> '+esc(info.plate||'—')+' &nbsp; <b>Şoför:</b> '+esc((driver&&driver.name)||info.driver||'—')+'</p>'+
    '<p><b>Toplam koltuk:</b> '+st.total+' &nbsp; <b>Öğrenci:</b> '+st.placed+' &nbsp; <b>Boş:</b> '+st.free+' &nbsp; <b>Rezerve:</b> '+st.res+(st.bad?' &nbsp; <b>Kapalı:</b> '+st.bad:'')+'</p>'+
    '<div class="bsgp-bus" style="grid-template-columns:repeat('+g.cols+',minmax(0,1fr));grid-template-rows:repeat('+g.rows+','+rowMm+'mm);font-size:'+pt+'pt">'+cells+'</div>'+
    '<table class="bsgp-list"><thead><tr><th>Koltuk</th><th>Ad Soyad</th><th>Sınıf</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+x.no+'</td><td>'+esc(x.s.full)+'</td><td>'+esc(x.s.sinif)+'</td></tr>').join('')+'</tbody></table>'+
    (wait.length?'<p class="bsgp-note"><b>Koltuk atanmamış:</b> '+wait.map(s=>esc(s.full)+(s.sinif?' ('+esc(s.sinif)+')':'')).join(', ')+'</p>':'')+'</div>';
  const extra='<style>.bsgp{font-family:Arial,sans-serif;color:var(--ka-report-transport-text);font-size:9pt}.bsgp h1,.bsgp h2{text-align:center;margin:2mm 0}.bsgp p{margin:2mm 0;font-size:8pt}'+
    '.bsgp-bus{display:grid;width:min(170mm,100%);margin:5mm auto;padding:1.5mm;gap:1mm;border:1.5px solid var(--ka-report-transport-border);border-radius:7mm;background:var(--ka-report-transport-bg);box-sizing:border-box;break-inside:avoid}'+
    '.bsgp-c{position:relative;box-sizing:border-box;min-width:0;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.3mm;padding:3.2mm .8mm .8mm;overflow:hidden;text-align:center;line-height:1.1;border:1px solid var(--ka-report-transport-border-soft);border-radius:1.6mm;background:var(--ka-report-transport-cell)}'+
    '.bsgp-c b{display:block;max-width:100%;font-weight:700;overflow-wrap:anywhere}.bsgp-c span{display:block;max-width:100%;overflow-wrap:anywhere}.bsgp-c em{font-style:normal;font-size:.8em;font-weight:700;color:var(--ka-report-transport-muted)}'+
    '.bsgp-c i{position:absolute;top:.6mm;left:1mm;font-style:normal;font-size:.8em;font-weight:700;color:var(--ka-report-transport-muted)}'+
    '.bsgp-c.f{background:var(--ka-report-transport-filled);border-color:var(--ka-report-transport-border)}.bsgp-c.e{background:var(--ka-report-transport-seat);border-style:dashed}.bsgp-c.x{background:var(--ka-report-transport-rest)}'+
    '.bsgp-c.d{background:var(--ka-report-transport-driver);padding-top:.8mm}.bsgp-c.o{background:var(--ka-report-transport-door);padding-top:.8mm}.bsgp-c.a{background:var(--ka-report-transport-special);border-style:dashed;padding-top:.8mm}'+
    '.bsgp-list{width:100%;border-collapse:collapse;font-size:8pt;break-inside:auto}.bsgp-list th,.bsgp-list td{padding:1mm 2mm;border-bottom:1px solid var(--ka-report-transport-border-soft);text-align:left}.bsgp-list th{color:var(--ka-report-transport-muted)}.bsgp-list td:first-child{width:14mm;font-weight:700}.bsgp-note{color:var(--ka-report-transport-muted)}</style>';
  return{body,extra};
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
 lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
 ban:'<circle cx="12" cy="12" r="8"/><path d="M6.3 6.3l11.4 11.4"/>',
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
 wheel:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M4.5 10.5L10 11.2M19.5 10.5L14 11.2M12 14v6"/>',
 door:'<path d="M6 20V5a1 1 0 011-1h8a1 1 0 011 1v15"/><path d="M4 20h16"/><circle cx="13" cy="13" r=".9" fill="currentColor" stroke="none"/>',
 user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.6-3.6 3.5-5.5 7-5.5s6.4 1.9 7 5.5"/>',
 swap:'<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
 note:'<path d="M6 4h12v16H6z"/><path d="M9 9h6M9 13h6"/>',
 link:'<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
 layout:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 10v10"/>',
 eraser:'<path d="M8 20h12"/><path d="M5 15l8-8 6 6-6 6H9z"/>',
 move:'<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
 seat:'<path d="M7 4h10a2 2 0 012 2v6H5V6a2 2 0 012-2z"/><path d="M4 12h16v5a1 1 0 01-1 1H5a1 1 0 01-1-1z"/><path d="M7 18v2M17 18v2"/>',
 area:'<rect x="4" y="5" width="16" height="14" rx="2" stroke-dasharray="3 3"/>',
 sliders:'<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>'
};
const ic=(n,c)=>'<svg class="bsg-ic '+(c||'')+'" viewBox="0 0 24 24" aria-hidden="true">'+ICONS[n]+'</svg>';

/* ---- Geçmiş (geri al / yinele) ve kayıt durumu ---- */
const snap=()=>JSON.stringify({grid:S.grid,els:S.els,seats:S.seats,notes:S.notes,num:S.numMode,sablon:S.sablon},(k,v)=>(k==='no'||k==='unit'||k==='rank')?undefined:v);
const dirtyKey=()=>snap()+'|'+S.planAdi;
const isDirty=()=>S.editable&&dirtyKey()!==S.saved;
function restore(j){const o=JSON.parse(j);S.grid=o.grid;S.els=o.els;S.seats=o.seats;S.notes=o.notes;S.numMode=o.num||'row';S.sablon=o.sablon}
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
function placeStudent(stuId,seatId){
  const d=sd(S,seatId);
  if(d.res||d.bad){toast(d.res?'Bu koltuk rezerve.':'Bu koltuk kapalı.');return}
  const L=calc(S),w=whereMap(S,L),src=w[stuId],occ=d.stu;
  if(occ===stuId){S.pick=null;render();return}
  commit(()=>{
    if(src)delete S.seats[src].stu;
    if(occ&&src){(S.seats[src]=S.seats[src]||{}).stu=occ}
    (S.seats[seatId]=S.seats[seatId]||{}).stu=stuId;
  });
  S.pick=null;hideSheet();
  const s=S.studs[stuId],no=L.byId[seatId].no;
  if(occ&&src)toast(shortName(S,s)+' ile '+shortName(S,S.studs[occ])+' yer değiştirdi.',true);
  else if(occ)toast(shortName(S,s)+' yerleşti, '+shortName(S,S.studs[occ])+' bekleyene alındı.',true);
  else toast(shortName(S,s)+' · koltuk '+no,true);
  render();
}
function unseat(stuId){
  const L=calc(S),w=whereMap(S,L);if(!w[stuId])return;
  commit(()=>{delete S.seats[w[stuId]].stu});
  hideSheet();toast(shortName(S,S.studs[stuId])+' bekleyene alındı.',true);render();
}
function locate(seatId){
  const el=$('[data-seat="'+seatId+'"]');if(!el)return;
  el.scrollIntoView({block:'center',inline:'center',behavior:'smooth'});
  el.classList.remove('is-flash');void el.offsetWidth;el.classList.add('is-flash');
}
function autoApply(opt){
  const p=autoPlan(S,opt),n=p.added;
  commit(()=>{Object.keys(S.seats).forEach(id=>{delete S.seats[id].stu});for(const s in p.occ)(S.seats[s]=S.seats[s]||{}).stu=p.occ[s]});
  hideSheet();toast(n+' öğrenci otomatik yerleşti.',true);render();
}

/* ---- Düzen eylemleri ---- */
function afterEdit(lost,msg){if(lost)toast(lost+' öğrenci bekleyene alındı.',true);else if(msg)toast(msg,true);render()}
function addSeats(cells){
  let n=0;
  commit(()=>{cells.forEach(c=>{if(canPlace(S,c.x,c.y,1,1)){S.els.push(newEl(S,'seat',c.x,c.y,1,1));n++}});S.sablon='ozel'});
  afterEdit(0,n+' koltuk eklendi.');
}
function addShape(type,x,y,w,h){
  let e;
  commit(()=>{
    if(type==='driver'){
      const d=S.els.filter(o=>o.type==='driver')[0];
      if(d){d.x=x;d.y=y;e=d}else{e=newEl(S,'driver',x,y,1,1);S.els.push(e)}
    }else{e=newEl(S,type,x,y,w,h);S.els.push(e)}
    S.sablon='ozel';
  });
  S.sel=e.id;S.tool='move';render();
}
function delEls(ids){
  const lost=commit(()=>{S.els=S.els.filter(e=>ids.indexOf(e.id)<0);S.sablon='ozel'});
  if(ids.indexOf(S.sel)>-1)S.sel=null;
  afterEdit(lost,ids.length+' öğe silindi.');
}
function moveEl(id,x,y){const e=S.els.filter(o=>o.id===id)[0];commit(()=>{e.x=x;e.y=y;S.sablon='ozel'});render()}
function resizeEl(id,w,h){const e=S.els.filter(o=>o.id===id)[0];commit(()=>{e.w=w;e.h=h;S.sablon='ozel'});render()}
function setGrid(k,d){
  const b=gridBounds(S),g=S.grid,v=g[k]+d;
  const lo=k==='cols'?Math.max(LIM.minCols,b.maxX):Math.max(LIM.minRows,b.maxY),hi=k==='cols'?LIM.maxCols:LIM.maxRows;
  if(v<lo){toast('Küçültmek için '+(k==='cols'?'sağdaki':'alttaki')+' öğeleri taşı.');return}
  if(v>hi)return;
  commit(()=>{g[k]=v;S.sablon='ozel'});render();
}
function loadTpl(k){
  const n=Object.keys(whereMap(S,calc(S))).length;
  commit(()=>{S.grid={cols:TEMPLATES[k].cols,rows:TEMPLATES[k].rows};S.els=tplElements(k,S.svcDriver);S.seats={};S.notes={};S.sablon=TEMPLATES[k].sablon});
  S.sel=null;hideSheet();toast(TEMPLATES[k].ad+' yüklendi'+(n?', '+n+' öğrenci bekleyene alındı.':'.'),true);render();
}
function nudge(dx,dy){
  const e=selEl();if(!e)return;
  if(!canPlace(S,e.x+dx,e.y+dy,e.w,e.h,e.id)){toast('Buraya sığmıyor.');return}
  moveEl(e.id,e.x+dx,e.y+dy);
}

/* ---- Ölçüler ve metin sığdırma: her koltuk kendi içinde yazıyı küçültür, ad soyad ve sınıf kesilmez ---- */
function applyMetrics(){
  const wrap=R('planwrap'),ww=wrap.clientWidth||360,avail=Math.min(ww-32,560)-31;
  const cw0=Math.max(46,Math.min(Math.floor(avail/S.grid.cols),96));
  const lo=Math.min(cw0,54),hi=Math.max(cw0,140);
  const cw=Math.max(lo,Math.min(hi,Math.round(cw0*S.zoom)));
  S.zoom=cw/cw0;S.atMin=cw<=lo;S.atMax=cw>=hi;
  S.m={cw,ch:Math.round(cw*1.25)};
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
function seatHTML(el,L,w){
  const s=L.byId[el.id],d=sd(S,el.id),st=d.stu?S.studs[d.stu]:null;
  let cls='bsg-box bsg-seat',inner,aria,drag='';
  if(S.mode==='edit'){
    return'<div class="'+cls+' is-ed'+(d.bad?' is-bad':(d.res?' is-res':''))+'" aria-label="Koltuk '+s.no+'"><b class="bsg-big">'+s.no+'</b>'+(st?'<i class="bsg-dot"></i>':'')+'</div>';
  }
  if(d.bad){cls+=' is-bad';inner='<span class="bsg-no">'+s.no+'</span><span class="bsg-mk bsg-tr">'+ic('ban','xs')+'</span><span class="bsg-nmbox"><span class="bsg-ad">Kapalı</span></span>';aria='Koltuk '+s.no+', kapalı'}
  else if(d.res){cls+=' is-res';inner='<span class="bsg-no">'+s.no+'</span><span class="bsg-mk bsg-tr">'+ic('lock','xs')+'</span><span class="bsg-nmbox"><span class="bsg-ad">'+esc(d.res)+'</span></span>';aria='Koltuk '+s.no+', rezerve: '+d.res}
  else if(st){
    cls+=' is-has';
    let mk='';
    if(S.notes[st.id])mk+=ic('note','xs');
    if(st.kg){const near=mates(S,st).some(o=>{const ws=w[o.id];return ws&&L.byId[ws].unit===s.unit});mk+='<span class="bsg-lk'+(near?' is-near':'')+'">'+ic('link','xs')+'</span>'}
    inner='<span class="bsg-no">'+s.no+'</span>'+(st.sinif?'<span class="bsg-cls" style="--h:'+st.hue+'">'+esc(st.sinif)+'</span>':'')+'<span class="bsg-nmbox'+(mk?' bsg-pm':'')+'"><span class="bsg-ad">'+esc(st.ad)+'</span>'+(st.soyad?'<span class="bsg-sy">'+esc(st.soyad)+'</span>':'')+'</span>'+(mk?'<span class="bsg-mk">'+mk+'</span>':'');
    aria='Koltuk '+s.no+', '+st.full+(st.sinif?', '+st.sinif:'');
    if(S.editable)drag=' data-drag="seat" data-stu="'+st.id+'"';
  }else{
    if(S.pick)cls+=' is-tgt';
    inner='<span class="bsg-no">'+s.no+'</span><span class="bsg-plus">'+(S.editable?ic('plus','sm'):'')+'</span>';aria='Koltuk '+s.no+', boş';
  }
  if(S.pick&&st&&st.id===S.pick.stu)cls+=' is-from';
  return'<button type="button" class="'+cls+'" data-seat="'+el.id+'"'+drag+' aria-label="'+esc(aria)+'">'+inner+'</button>';
}
function elHTML(el,L,w){
  const edit=S.mode==='edit';
  const cls='bsg-el'+(edit&&S.sel===el.id?' bsg-sel':'')+(eg&&eg.active&&eg.mode==='move'&&eg.el&&eg.el.id===el.id?' bsg-moving':'');
  let inner;
  if(el.type==='seat')inner=seatHTML(el,L,w);
  else if(el.type==='door')inner='<div class="bsg-box bsg-door">'+ic('door','sm')+'<span class="bsg-nmbox"><span class="bsg-ad">'+esc(el.label||'Kapı')+'</span></span></div>';
  else if(el.type==='driver')inner='<div class="bsg-box bsg-drv"><span class="bsg-cap">'+ic('wheel','xs')+' Şoför</span><span class="bsg-nmbox">'+(el.name?'<span class="bsg-ad">'+esc(el.name)+'</span>':(edit?'<span class="bsg-ph">Adını yaz</span>':''))+'</span></div>';
  else inner='<div class="bsg-box bsg-area"><span class="bsg-nmbox"><span class="bsg-ad">'+esc(el.label||'')+'</span></span></div>';
  const handle=(edit&&S.sel===el.id&&el.type!=='seat')?'<i class="bsg-rh" data-handle="1" aria-hidden="true"></i>':'';
  return'<div class="'+cls+'" data-el="'+el.id+'" style="--x:'+el.x+';--y:'+el.y+';--w:'+el.w+';--h:'+el.h+'">'+inner+handle+'</div>';
}
function planHTML(L,w){
  let h='<div class="bsg-bus"><i class="bsg-ws"></i><div class="bsg-grid" data-r="grid" style="--cols:'+S.grid.cols+';--rows:'+S.grid.rows+'">';
  S.els.forEach(el=>{h+=elHTML(el,L,w)});
  return h+'<div data-r="ghosts"></div></div><div class="bsg-rear">Arka</div></div>';
}
function renderPlan(L,w){applyMetrics();R('plan').innerHTML=planHTML(L,w);fitNames()}
function renderStats(L,st){
  let h;
  if(S.mode==='place'){
    const pct=st.usable?Math.round(st.placed/st.usable*100):0;
    h='<div class="bsg-st-main"><div class="bsg-st-num">'+st.placed+'<span>/'+st.usable+'</span></div><div class="bsg-st-lbl">öğrenci yerleşti</div>'+(S.editable?'<button class="bsg-btn" type="button" data-act="auto">'+ic('wand','sm')+'Otomatik</button>':'')+'</div>'+
      '<div class="bsg-bar" role="progressbar" aria-valuemin="0" aria-valuemax="'+st.usable+'" aria-valuenow="'+st.placed+'"><i style="width:'+pct+'%"></i></div>'+
      '<div class="bsg-legend"><span><i class="bsg-sw"></i><b>'+st.free+'</b> boş</span><span><i class="bsg-sw bsg-res"></i><b>'+st.res+'</b> rezerve</span><span><i class="bsg-sw bsg-bad"></i><b>'+st.bad+'</b> kapalı</span></div>';
    if(S.editable&&st.waiting>st.free)h+='<p class="bsg-warn">'+ic('ban','sm')+' Kapasite '+(st.waiting-st.free)+' kişi kısa. Koltuk ekle ya da bir rezerveyi kaldır.</p>';
  }else{
    h='<div class="bsg-st-main"><div class="bsg-st-num">'+st.total+'<span> koltuk</span></div><div class="bsg-st-lbl">'+S.grid.cols+' × '+S.grid.rows+' hücre · '+st.usable+' kullanılabilir</div></div>';
    const n=realStudents(S).length;
    if(st.usable<n)h+='<p class="bsg-warn">'+ic('ban','sm')+' '+(n-st.usable)+' öğrenci için koltuk yok.</p>';
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
  return realStudents(S).filter(s=>!w[s.id]).sort((a,b)=>a.grade-b.grade||trSort(a.full,b.full));
}
function kgText(s,L,w){
  const m=mates(S,s);if(!m.length)return'';
  return'Kardeşi '+first(m[0])+(w[m[0].id]?' (koltuk '+L.byId[w[m[0].id]].no+')':' (bekliyor)');
}
function srow(s,L,w){
  const sid=w[s.id],seat=sid?L.byId[sid]:null,kg=kgText(s,L,w);
  return'<button type="button" class="bsg-srow'+(S.pick&&S.pick.stu===s.id?' is-on':'')+'" data-stu="'+s.id+'"'+(S.editable?' data-drag="stu"':'')+'><span class="bsg-av" style="--h:'+s.hue+'">'+esc((s.full||'?').charAt(0))+'</span><span class="bsg-si"><b>'+esc(s.full)+'</b><small>'+esc(s.sinif)+(s.orphan?(s.sinif?' · ':'')+'Serviste kayıtlı değil':'')+(kg?' · '+esc(kg):'')+'</small></span><span class="bsg-where'+(seat?'':' is-wait')+'">'+(seat?'Koltuk '+seat.no:'Bekliyor')+'</span></button>';
}
function renderList(){
  const L=calc(S),w=whereMap(S,L);
  let list=Object.keys(S.studs).map(id=>S.studs[id]).filter(s=>!s.orphan||w[s.id]).sort((a,b)=>a.grade-b.grade||trSort(a.full,b.full));
  if(S.tab==='wait')list=list.filter(s=>!w[s.id]);else if(S.tab==='placed')list=list.filter(s=>w[s.id]);
  if(S.q){const f=fold(S.q);list=list.filter(s=>fold(s.full+' '+s.sinif).indexOf(f)>-1)}
  R('list').innerHTML=list.length?list.map(s=>srow(s,L,w)).join(''):'<p class="bsg-none">'+(S.q?'Eşleşen öğrenci yok.':(S.tab==='wait'?'Bekleyen öğrenci kalmadı.':(S.tab==='placed'?'Henüz yerleşen öğrenci yok.':'Bu servise kayıtlı öğrenci yok.')))+'</p>';
}
const HINTS={
 move:'Dokun: seç. Basılı tutup sürükle: istediğin hücreye taşı.',
 seat:'Boş hücreye dokun: koltuk ekle. Basılı tutup sürükle: birçok koltuk ekle.',
 door:'Dokun: kapı ekle. Basılı tutup sürükle: istediğin boyutta kapı çiz.',
 driver:'Şoför koltuğunun olacağı hücreye dokun, sonra adını yaz.',
 area:'Basılı tutup sürükle: bagaj, merdiven gibi bir alan çiz. Dokun: 2×1 alan ekle.',
 erase:'Silinecek öğeye dokun. Basılı tutup sürükle: birçoğunu sil.'
};
function stepper(k,label,val,min,max,act){
  return'<div class="bsg-stp"><span>'+label+'</span><div><button type="button" data-act="'+act+'" data-k="'+k+'" data-d="-1" aria-label="'+label+' azalt"'+(val<=min?' disabled':'')+'>'+ic('minus','sm')+'</button><b>'+val+'</b><button type="button" data-act="'+act+'" data-k="'+k+'" data-d="1" aria-label="'+label+' artır"'+(val>=max?' disabled':'')+'>'+ic('plus','sm')+'</button></div></div>';
}
function stp2(k,label,val,min,max){
  return'<div class="bsg-stp2"><span>'+label+'</span><button type="button" data-act="size" data-k="'+k+'" data-d="-1" aria-label="'+label+' azalt"'+(val<=min?' disabled':'')+'>'+ic('minus','sm')+'</button><b>'+val+'</b><button type="button" data-act="size" data-k="'+k+'" data-d="1" aria-label="'+label+' artır"'+(val>=max?' disabled':'')+'>'+ic('plus','sm')+'</button></div>';
}
function propsHTML(el,L){
  const nd=(a,dx,dy,i)=>'<button type="button" data-act="nudge" data-dx="'+dx+'" data-dy="'+dy+'" aria-label="'+a+'">'+ic(i,'sm')+'</button>';
  const nudgeH='<div class="bsg-nudge"><span>Konum</span>'+nd('Sola',-1,0,'left')+nd('Yukarı',0,-1,'up')+nd('Aşağı',0,1,'down')+nd('Sağa',1,0,'right')+'</div>';
  const del='<button type="button" class="bsg-sq bsg-dng" data-act="delsel" aria-label="Sil">'+ic('trash','sm')+'</button>';
  if(el.type==='seat'){
    const s=L.byId[el.id];
    return'<div class="bsg-props"><div class="bsg-ptitle"><span>Koltuk '+s.no+' <small>'+posText(S,s,L)+'</small></span><button type="button" class="bsg-btn" data-act="deselect">Tamam</button></div><div class="bsg-prow">'+nudgeH+del+'</div></div>';
  }
  const title=el.type==='door'?'Kapı':(el.type==='driver'?'Şoför koltuğu':'Alan');
  const lbl=el.type==='driver'?'Şoför adı':'Etiket';
  const field='<input data-r="elLabel" type="text" aria-label="'+lbl+'" placeholder="'+(el.type==='driver'?'Şoför adı soyadı':'Etiket')+'" maxlength="40" value="'+esc(el.type==='driver'?(el.name||''):(el.label||''))+'">';
  return'<div class="bsg-props"><div class="bsg-ptitle"><span>'+title+'</span><button type="button" class="bsg-btn" data-act="deselect">Tamam</button></div>'+field+
    '<div class="bsg-prow">'+stp2('w','En',el.w,1,S.grid.cols)+stp2('h','Boy',el.h,1,S.grid.rows)+del+'</div><div class="bsg-prow">'+nudgeH+'</div></div>';
}
function editToolsHTML(L){
  const T=[['move','Taşı','move'],['seat','Koltuk','seat'],['door','Kapı','door'],['driver','Şoför','wheel'],['area','Alan','area'],['erase','Sil','trash']];
  const h='<div class="bsg-tools" role="group" aria-label="Çizim araçları">'+T.map(t=>'<button type="button" class="bsg-tool" data-act="tool" data-t="'+t[0]+'" aria-pressed="'+(S.tool===t[0])+'">'+ic(t[2])+'<span>'+t[1]+'</span></button>').join('')+'<button type="button" class="bsg-tool" data-act="gridset">'+ic('sliders')+'<span>Ayarlar</span></button></div>';
  const sel=selEl();
  return h+(sel?propsHTML(sel,L):'<p class="bsg-hint">'+HINTS[S.tool]+'</p>');
}
function renderDock(L,w,st){
  const wait=waitingList();
  if(S.mode==='place'){
    R('dockTitle').textContent=S.editable?'Bekleyen öğrenciler':'Öğrenciler';
    const b=R('dockBadge');b.textContent=S.editable?wait.length:realStudents(S).length;b.classList.toggle('is-zero',S.editable&&!wait.length);b.hidden=false;
    R('strip').innerHTML=wait.length?wait.map(s=>'<button type="button" class="bsg-pill" data-stu="'+s.id+'"'+(S.editable?' data-drag="stu"':'')+' aria-pressed="'+!!(S.pick&&S.pick.stu===s.id)+'">'+esc(shortName(S,s))+(s.sinif?'<span class="bsg-cls" style="--h:'+s.hue+'">'+esc(s.sinif)+'</span>':'')+'</button>').join(''):'<p class="bsg-empty">'+ic('check')+' Herkes yerleşti.</p>';
    const total=realStudents(S).length,counts={wait:wait.length,placed:total-wait.length,all:total};
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
    sv.innerHTML=S.saving?'Kaydediliyor…':(d?'Kaydet':(S.everSaved?ic('check','sm')+'Kaydedildi':'Kaydet'));
  }
}
function render(){
  const L=calc(S),w=whereMap(S,L),st=statsOf(S,L),a=R('app');
  a.dataset.mode=S.mode;a.dataset.sel=(S.mode==='edit'&&S.sel)?'1':'0';
  R('mPlace').setAttribute('aria-pressed',S.mode==='place');R('mEdit').setAttribute('aria-pressed',S.mode==='edit');
  renderTop();renderStats(L,st);renderPick();renderPlan(L,w);renderDock(L,w,st);
  if(S.sheet)renderSheet();
}
/* Yazarken yalnız plan ve sayılar yenilenir; alt paneldeki kutu odağını kaybetmez. */
function refreshPlan(){const L=calc(S),w=whereMap(S,L);renderTop();renderStats(L,statsOf(S,L));renderPlan(L,w)}

/* ---- Sayfalar (sheet) ---- */
function openSheet(d){hideToast();S.sheet=d;renderSheet();R('scrim').dataset.on='1';const sh=R('sheet');sh.dataset.on='1';try{sh.focus({preventScroll:true})}catch(_){}}
function hideSheet(){S.sheet=null;if(!root)return;R('scrim').dataset.on='0';R('sheet').dataset.on='0'}
const head=(big,title,sub)=>'<div class="bsg-sh-head">'+(big?'<span class="bsg-bign">'+big+'</span>':'')+'<div class="bsg-tt"><h3>'+title+'</h3>'+(sub?'<small>'+sub+'</small>':'')+'</div><button type="button" class="bsg-ibtn" data-act="closesheet" aria-label="Kapat">'+ic('close')+'</button></div>';
function candHTML(seat,L,w,q){
  const sg=suggestions(S,seat,L,w,q);
  if(!sg.length)return'<p class="bsg-none">'+(q?'Eşleşen bekleyen öğrenci yok.':'Bekleyen öğrenci kalmadı.')+'</p>';
  return sg.slice(0,q?20:6).map(x=>{
    const s=x.s;
    return'<button type="button" class="bsg-srow" data-act="place" data-stu="'+s.id+'"><span class="bsg-av" style="--h:'+s.hue+'">'+esc((s.full||'?').charAt(0))+'</span><span class="bsg-si"><b>'+esc(s.full)+'</b><small>'+esc(s.sinif)+'</small></span>'+(x.tags.length?'<span class="bsg-tag">'+esc(x.tags[0])+'</span>':'')+'</button>';
  }).join('');
}
function sheetSeat(){
  const L=calc(S),w=whereMap(S,L),seat=L.byId[S.sheet.id];
  if(!seat){hideSheet();return''}
  const d=sd(S,seat.id),st=d.stu?S.studs[d.stu]:null,pos=posText(S,seat,L),ed=S.editable;
  if(d.bad)return head(seat.no,'Koltuk kapalı',pos)+'<div class="bsg-sh-body"><p class="bsg-info">'+ic('ban','sm')+'<span>Bu koltuk plana dahil değil. Yerleştirmede ve sayımda atlanır.</span></p>'+(ed?'<div class="bsg-acts"><button type="button" class="bsg-btn bsg-pri" data-act="unbad">Koltuğu aç</button></div>':'')+'</div>';
  if(d.res)return head(seat.no,'Rezerve',esc(d.res)+' · '+pos)+'<div class="bsg-sh-body"><p class="bsg-info">'+ic('lock','sm')+'<span>Otomatik yerleştirme bu koltuğu kullanmaz.</span></p>'+(ed?'<div class="bsg-acts"><button type="button" class="bsg-btn bsg-pri" data-act="unres">Rezervi kaldır</button></div>':'')+'</div>';
  if(st){
    const m=mates(S,st)[0];let mi='';
    if(m){const ms=w[m.id];mi='<p class="bsg-info">'+ic('link','sm')+'<span>Kardeşi <b>'+esc(m.full)+'</b> ('+esc(m.sinif)+') '+(ms?(L.byId[ms].unit===seat.unit?'yanında, koltuk '+L.byId[ms].no+'.':'koltuk '+L.byId[ms].no+'’te, ayrı oturuyor.'):'henüz bekliyor.')+'</span></p>'}
    return head(seat.no,esc(st.full),esc(st.sinif)+(st.sinif?' · ':'')+pos)+'<div class="bsg-sh-body">'+mi+
      (ed?'<label class="bsg-field"><span>Not (yalnızca yöneticiler görür)</span><input data-r="note" type="text" value="'+esc(S.notes[st.id]||'')+'" placeholder="ör. öne oturmalı, ilaç saati" maxlength="80"></label>'+
      '<div class="bsg-acts"><button type="button" class="bsg-btn" data-act="move" data-stu="'+st.id+'">'+ic('swap','sm')+'Yer değiştir</button><button type="button" class="bsg-btn" data-act="unseat" data-stu="'+st.id+'">'+ic('user','sm')+'Bekleyene al</button></div>':(S.notes[st.id]?'<p class="bsg-info">'+ic('note','sm')+'<span>'+esc(S.notes[st.id])+'</span></p>':''))+'</div>';
  }
  if(!ed)return head(seat.no,'Boş koltuk',pos)+'<div class="bsg-sh-body"><p class="bsg-info">'+ic('seat','sm')+'<span>Bu koltukta öğrenci yok.</span></p></div>';
  return head(seat.no,'Boş koltuk',pos)+'<div class="bsg-sh-body">'+
    '<label class="bsg-field"><span>Öğrenci seç</span><div class="bsg-search">'+ic('search')+'<input data-r="sq" type="search" placeholder="Ad veya sınıf yaz" autocomplete="off"></div></label>'+
    '<div class="bsg-cand" data-r="cand">'+candHTML(seat,L,w,'')+'</div>'+
    '<label class="bsg-field"><span>Rezerve notu (isteğe bağlı)</span><input data-r="resnote" type="text" placeholder="ör. Rehber öğretmen" maxlength="30"></label>'+
    '<div class="bsg-acts"><button type="button" class="bsg-btn" data-act="res">'+ic('lock','sm')+'Rezerve et</button><button type="button" class="bsg-btn" data-act="bad">'+ic('ban','sm')+'Koltuğu kapat</button></div></div>';
}
function sheetAuto(){
  const o=S.auto;
  const sw=(k,t,s)=>'<label class="bsg-switch"><span class="bsg-tx"><b>'+t+'</b><small>'+s+'</small></span><input type="checkbox" data-opt="'+k+'"'+(o[k]?' checked':'')+'><span class="bsg-tg"></span></label>';
  return head('','Otomatik yerleştir','Bekleyen öğrencileri boş koltuklara dağıtır')+'<div class="bsg-sh-body"><div>'+
    sw('sib','Kardeşler yan yana','Aynı veli ve soyadlı öğrenciler bitişik koltuklara oturur')+
    sw('small','Küçük sınıflar öne','1. sınıflar öne, büyükler arkaya')+
    sw('keep','Mevcut yerleşimi koru','Kapalıysa herkes baştan yerleşir')+
    '</div><p class="bsg-prev" data-r="autoPrev">'+esc(autoPreviewText(S,o))+'</p><div class="bsg-acts"><button type="button" class="bsg-btn" data-act="closesheet">Vazgeç</button><button type="button" class="bsg-btn bsg-pri" data-act="autogo">'+ic('wand','sm')+'Yerleştir</button></div></div>';
}
function sheetMenu(){
  const ed=S.editable;
  return head('','İşlemler','')+'<div class="bsg-sh-body"><div class="bsg-menu">'+
    '<button type="button" class="bsg-srow" data-act="print">'+ic('print')+'<span class="bsg-si"><b>Yazdır / PDF</b><small>Plan ve yolcu listesi</small></span></button>'+
    (ed?'<button type="button" class="bsg-srow" data-act="clear">'+ic('eraser')+'<span class="bsg-si"><b>Tüm yerleşimi temizle</b><small>Rezerve ve kapalı koltuklar kalır</small></span></button>':'')+
    '</div>'+(ed?'<label class="bsg-field"><span>Plan adı</span><input data-r="planName" type="text" maxlength="60" value="'+esc(S.planAdi)+'"></label>':'')+'</div>';
}
function sheetGrid(){
  const g=S.grid;
  const tpl=Object.keys(TEMPLATES).map(k=>'<button type="button" class="bsg-et" data-act="tpl" data-tpl="'+k+'">'+TEMPLATES[k].ad+'<small>'+(k==='empty'?'Yalnızca şoför':tplSeatCount(k)+' koltuk')+'</small></button>').join('');
  return head('','Plan ayarları','Hücre ızgarasının boyutu ve numaralandırma')+'<div class="bsg-sh-body">'+
    '<div class="bsg-szrow">'+stepper('cols','Sütun (genişlik)',g.cols,LIM.minCols,LIM.maxCols,'gridsz')+stepper('rows','Satır (uzunluk)',g.rows,LIM.minRows,LIM.maxRows,'gridsz')+'</div>'+
    '<div class="bsg-field"><span>Koltuk numaraları</span><div class="bsg-seg3 bsg-two"><button type="button" data-act="num" data-v="row" aria-pressed="'+(S.numMode==='row')+'">Satır satır</button><button type="button" data-act="num" data-v="col" aria-pressed="'+(S.numMode==='col')+'">Sütun sütun</button></div></div>'+
    '<div class="bsg-field"><span>Hazır şablon (mevcut düzenin yerine geçer)</span><div class="bsg-tplgrid">'+tpl+'</div></div></div>';
}
function sheetTpl(){
  const k=S.sheet.k,n=Object.keys(whereMap(S,calc(S))).length;
  return head('','Şablonu yükle',esc(TEMPLATES[k].ad))+'<div class="bsg-sh-body"><p class="bsg-info">'+ic('swap','sm')+'<span>Mevcut düzen değişir. '+(n?n+' öğrenci bekleyene alınır. ':'')+'Yükledikten sonra geri alabilirsin.</span></p><div class="bsg-acts"><button type="button" class="bsg-btn" data-act="closesheet">Vazgeç</button><button type="button" class="bsg-btn bsg-pri" data-act="tplgo" data-tpl="'+k+'">Şablonu yükle</button></div></div>';
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
  const info={school:ctx.school||'',name:ctx.service.name,plate:ctx.service.plate,driver:ctx.service.driver};
  const o=printModel(S,info);
  try{ctx.print({title:(ctx.service.name||'Servis')+' Oturma Planı',body:o.body,extraHead:o.extra,fileName:(ctx.service.name||'Servis')+'_Oturma_Plani'})}catch(e){console.error('[BusSeatingGrid/print]',e);toast('Yazdırma açılamadı.')}
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
    console.error('[BusSeatingGrid/save]',e);toast('Plan kaydedilemedi: '+((e&&e.message)||e));
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
const ens=id=>S.seats[id]||(S.seats[id]={});
function onSeatTap(id){
  if(S.pick&&S.editable){placeStudent(S.pick.stu,id);return}
  openSheet({t:'seat',id});
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
    case 'zoomin':S.zoom=S.zoom+.15;render();break;
    case 'zoomout':S.zoom=S.zoom-.15;render();break;
    case 'dock':
      if(S.mode==='place'&&global.matchMedia('(max-width:899px)').matches){
        const d=R('dock'),o=d.dataset.open==='1'?'0':'1';d.dataset.open=o;R('dockToggle').setAttribute('aria-expanded',o==='1');
      }break;
    case 'tab':{S.tab=el.dataset.t;const L=calc(S);renderDock(L,whereMap(S,L),statsOf(S,L));break}
    case 'mode':setMode(el.dataset.m);break;
    case 'unpick':S.pick=null;render();break;
    case 'auto':openSheet({t:'auto'});break;
    case 'autogo':autoApply(S.auto);break;
    case 'place':placeStudent(el.dataset.stu,sh.id);break;
    case 'unseat':unseat(el.dataset.stu);break;
    case 'move':S.pick={stu:el.dataset.stu};hideSheet();render();break;
    case 'res':{const i=R('resnote'),note=((i&&i.value)||'').trim()||'Rezerve';commit(()=>{const d=ens(sh.id);d.res=note;delete d.bad});hideSheet();toast('Koltuk rezerve edildi.',true);render();break}
    case 'unres':commit(()=>{delete ens(sh.id).res});hideSheet();toast('Rezerve kaldırıldı.',true);render();break;
    case 'bad':commit(()=>{const d=ens(sh.id);d.bad=true;delete d.res});hideSheet();toast('Koltuk kapatıldı.',true);render();break;
    case 'unbad':commit(()=>{delete ens(sh.id).bad});hideSheet();toast('Koltuk yeniden açıldı.',true);render();break;
    case 'tool':S.tool=el.dataset.t;S.sel=S.tool==='move'?S.sel:null;render();break;
    case 'deselect':S.sel=null;render();break;
    case 'delsel':if(S.sel)delEls([S.sel]);break;
    case 'nudge':nudge(+el.dataset.dx,+el.dataset.dy);break;
    case 'size':{
      const e=selEl();if(!e)break;
      const nw=e.w+(el.dataset.k==='w'?+el.dataset.d:0),nh=e.h+(el.dataset.k==='h'?+el.dataset.d:0);
      if(!canPlace(S,e.x,e.y,nw,nh,e.id)){toast(+el.dataset.d>0?'Büyümeye yer yok.':'Daha fazla küçülmez.');break}
      resizeEl(e.id,nw,nh);break;
    }
    case 'gridset':openSheet({t:'grid'});break;
    case 'gridsz':setGrid(el.dataset.k,+el.dataset.d);break;
    case 'num':commit(()=>{S.numMode=el.dataset.v});render();break;
    case 'tpl':openSheet({t:'tpl',k:el.dataset.tpl});break;
    case 'tplgo':loadTpl(el.dataset.tpl);break;
    case 'print':printPlan();break;
    case 'clear':{
      const n=Object.keys(whereMap(S,calc(S))).length;
      commit(()=>{Object.keys(S.seats).forEach(id=>{delete S.seats[id].stu})});
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
  const r=t.dataset.r;
  if(r==='note'&&S.sheet&&S.sheet.t==='seat'){
    const stu=sd(S,S.sheet.id).stu;if(!stu)return;
    const v=t.value.trim();
    commit(()=>{if(v)S.notes[stu]=v;else delete S.notes[stu]});
    toast(v?'Not kaydedildi.':'Not silindi.');render();
  }else if(r==='elLabel'||r==='planName')S.typing=null;
}
function onInput(e){
  const t=e.target,r=t.dataset.r;
  if(r==='q'){S.q=t.value;renderList()}
  else if(r==='sq'){const L=calc(S);R('cand').innerHTML=candHTML(L.byId[S.sheet.id],L,whereMap(S,L),t.value)}
  else if(r==='elLabel'){
    const el=selEl();if(!el)return;
    if(S.typing!==el.id){commit(()=>{});S.typing=el.id}
    if(el.type==='driver')el.name=t.value;else el.label=t.value;
    refreshPlan();
  }else if(r==='planName'){
    S.planAdi=t.value.trim()||'Servis Oturma Planı';renderTop();
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
  $$('.bsg-seat.is-ok,.bsg-seat.is-no-drop').forEach(n=>{n.classList.remove('is-ok','is-no-drop')});
  const d=R('dock');if(d)d.classList.remove('is-over');
}
function beginDrag(){
  if(!drag||drag.active)return;
  const s=S.studs[drag.stu];if(!s){drag=null;return}
  drag.active=true;root.classList.add('is-dragging');
  const g=document.createElement('div');g.className='bsg-ghost';
  g.innerHTML=esc(shortName(S,s))+(s.sinif?'<span class="bsg-cls" style="--h:'+s.hue+'">'+esc(s.sinif)+'</span>':'');
  root.appendChild(g);drag.ghost=g;moveGhost(drag.lx,drag.ly);startScroll();
}
function moveGhost(x,y){
  const g=drag.ghost;g.style.left=x+'px';g.style.top=y+'px';
  const el=document.elementFromPoint(x,y),seat=el&&el.closest('[data-r="plan"] [data-seat]'),dock=el&&el.closest('[data-r="dock"]');
  clearDropMarks();
  drag.target=null;drag.toDock=false;
  if(seat){
    const d=sd(S,seat.dataset.seat);
    if(seat.dataset.stu===drag.stu){/* kendi koltuğu */}
    else if(d.res||d.bad)seat.classList.add('is-no-drop');
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

/* ---- Düzen hareketleri: hücreye oturan çizim, taşıma, boyutlandırma ---- */
function cellAt(cx,cy,clamp){
  const g=R('grid');if(!g)return null;
  const r=g.getBoundingClientRect(),m=S.m;
  const x=Math.floor((cx-r.left)/m.cw),y=Math.floor((cy-r.top)/m.ch);
  if(clamp)return{x:Math.max(0,Math.min(S.grid.cols-1,x)),y:Math.max(0,Math.min(S.grid.rows-1,y))};
  if(x<0||y<0||x>=S.grid.cols||y>=S.grid.rows)return null;
  return{x,y};
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
function updateEditGhost(){
  if(!eg||!eg.active)return;
  const cur=cellAt(eg.lx,eg.ly,true),list=[];
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
    Object.keys(eg.cells).forEach(k=>{const c=eg.cells[k];if(canPlace(S,c.x,c.y,1,1))list.push({x:c.x,y:c.y,w:1,h:1})});
    eg.ok=list.length>0;
  }else if(eg.mode==='erase'){
    trail(cur);
    Object.keys(eg.cells).forEach(k=>{const c=eg.cells[k],o=elAt(S,c.x,c.y);if(o)list.push({x:o.x,y:o.y,w:o.w,h:o.h,bad:true})});
    eg.ok=list.length>0;
  }
  const gh=R('ghosts');if(gh)gh.innerHTML=list.map(ghostHTML).join('');
  if(eg.mode==='move'){const n=$('[data-el="'+eg.el.id+'"]');if(n)n.classList.add('bsg-moving')}
}
function activateEdit(){
  if(!eg||eg.active)return;
  clearTimeout(eg.timer);
  const t=eg.tool;
  if(eg.handle)eg.mode='resize';
  else if(t==='move'&&eg.el)eg.mode='move';
  else if(t==='seat')eg.mode='paint';
  else if(t==='door'||t==='area')eg.mode='rect';
  else if(t==='erase')eg.mode='erase';
  else eg.mode=null;
  if(eg.mode){eg.active=true;eg.tap=false;root.classList.add('is-dragging');updateEditGhost();startScroll()}
}
function tapEdit(c,el,tool){
  if(tool==='move'){S.sel=el?el.id:null;render();return}
  if(tool==='seat'){
    if(!el)addSeats([c]);else{S.sel=el.id;S.tool='move';render()}
    return;
  }
  if(tool==='door'){
    if(el){S.sel=el.id;S.tool='move';render();return}
    const d=canPlace(S,c.x,c.y,1,2)?[1,2]:(canPlace(S,c.x,c.y,2,1)?[2,1]:(canPlace(S,c.x,c.y,1,1)?[1,1]:null));
    if(!d){toast('Buraya sığmıyor.');return}
    addShape('door',c.x,c.y,d[0],d[1]);return;
  }
  if(tool==='area'){
    if(el){S.sel=el.id;S.tool='move';render();return}
    const a=canPlace(S,c.x,c.y,2,1)?[2,1]:(canPlace(S,c.x,c.y,1,1)?[1,1]:null);
    if(!a){toast('Buraya sığmıyor.');return}
    addShape('area',c.x,c.y,a[0],a[1]);return;
  }
  if(tool==='driver'){
    const dr=S.els.filter(o=>o.type==='driver')[0];
    if(el&&el.type==='driver'){S.sel=el.id;S.tool='move';render();return}
    if(el){toast('Bu hücre dolu.');return}
    if(!canPlace(S,c.x,c.y,dr?dr.w:1,dr?dr.h:1,dr?dr.id:null)){toast('Buraya sığmıyor.');return}
    addShape('driver',c.x,c.y,1,1);return;
  }
  if(tool==='erase'){if(el)delEls([el.id])}
}
function finishEdit(){
  const g=eg;eg=null;
  if(root)root.classList.remove('is-dragging');
  const gh=root&&R('ghosts');if(gh)gh.innerHTML='';
  if(!g.active){if(g.tap)tapEdit(g.start,g.el,g.tool);return}
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
    if(g.ok)addShape(g.tool,g.res.x,g.res.y,g.res.w,g.res.h);
    else{toast('Buraya sığmıyor.');render()}
  }else if(g.mode==='paint'){
    const cells=Object.keys(g.cells).map(k=>g.cells[k]).filter(c=>canPlace(S,c.x,c.y,1,1));
    if(cells.length)addSeats(cells);else render();
  }else if(g.mode==='erase'){
    const ids=[];Object.keys(g.cells).forEach(k=>{const o=elAt(S,g.cells[k].x,g.cells[k].y);if(o&&ids.indexOf(o.id)<0)ids.push(o.id)});
    if(ids.length)delEls(ids);else render();
  }
}
function cancelGestures(){
  if(drag){clearTimeout(drag.timer);if(drag.ghost)drag.ghost.remove();drag=null}
  if(eg){clearTimeout(eg.timer);eg=null}
  if(root){root.classList.remove('is-dragging');clearDropMarks();const gh=R('ghosts');if(gh)gh.innerHTML='';const mv=$$('.bsg-moving');mv.forEach(n=>n.classList.remove('bsg-moving'))}
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
  const grid=e.target.closest('[data-r="grid"]');if(!grid)return;
  cancelGestures();
  const handle=e.target.closest('[data-handle]'),c=cellAt(e.clientX,e.clientY,true);
  const target=handle?selEl():elAt(S,c.x,c.y);
  eg={pid:e.pointerId,type:e.pointerType,x0:e.clientX,y0:e.clientY,lx:e.clientX,ly:e.clientY,active:false,timer:null,start:c,tool:S.tool,el:target,handle:!!handle,mode:null,cells:{},tap:true};
  if(handle&&target){activateEdit();e.preventDefault()}
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
   '<div class="bsg-zoomctl"><div><button type="button" data-act="zoomout" data-r="zOut" aria-label="Küçült">'+ic('minus','sm')+'</button><button type="button" data-act="zoomin" data-r="zIn" aria-label="Büyüt">'+ic('plus','sm')+'</button></div></div>'+
   '<div data-r="plan"></div>'+
  '</main>'+
  '<aside class="bsg-dock" data-r="dock" data-open="0" aria-label="Öğrenciler">'+
   '<div class="bsg-dock-head"><button type="button" class="bsg-dock-toggle" data-r="dockToggle" data-act="dock" aria-expanded="false"><span data-r="dockTitle">Bekleyen öğrenciler</span><span class="bsg-badge" data-r="dockBadge">0</span><span class="bsg-chev">'+ic('up','sm')+'</span></button></div>'+
   '<div class="bsg-strip" data-r="strip"></div>'+
   '<div class="bsg-dock-full">'+
    '<div class="bsg-search">'+ic('search')+'<input data-r="q" type="search" placeholder="Öğrenci ara (ad, soyad, sınıf)" autocomplete="off" aria-label="Öğrenci ara"></div>'+
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

/* Boş plan açılırken öğrenci sayısını karşılayan en küçük şablon seçilir. */
function pickTemplate(n){n=Number(n)||0;const order=['minibus','1x2','2x2','otobus'];for(let i=0;i<order.length;i++)if(tplSeatCount(order[i])>=n)return order[i];return'otobus'}

/* opts: { elements, layout, sablon, planAdi, students:[{id,name,className,guardian}], service:{name,plate,driver,capacity},
 *         school, editable, onSave(payload)→Promise, onClose(), print({title,body,extraHead,fileName}) } */
function open(opts){
  opts=opts||{};
  if(root)close(true);
  const svc=opts.service||{};
  const m=fromStored({elements:opts.elements,layout:opts.layout,sablon:opts.sablon,planAdi:opts.planAdi,service:{driver:svc.driver||''},students:opts.students||[]});
  const editable=opts.editable!==false;
  let seeded=false;
  if(editable&&!m.els.length){
    seeded=true;
    const k=pickTemplate(svc.capacity);
    m.grid={cols:TEMPLATES[k].cols,rows:TEMPLATES[k].rows};m.els=tplElements(k,svc.driver||'');m.sablon=TEMPLATES[k].sablon;
  }
  ctx={onSave:opts.onSave,onClose:opts.onClose,print:opts.print,school:opts.school||'',service:{name:svc.name||'',plate:svc.plate||'',driver:svc.driver||'',capacity:svc.capacity||0}};
  S=m;
  Object.assign(S,{editable,mode:'place',tab:'wait',q:'',pick:null,sel:null,tool:'move',sheet:null,zoom:1,m:{cw:60,ch:75},atMin:false,atMax:false,auto:{sib:true,small:true,keep:true},saving:false,everSaved:false,typing:null});
  undoS=[];redoS=[];drag=null;eg=null;suppressUntil=0;
  prune(S);
  if(editable&&calc(S).total===0)S.mode='edit';
  S.saved=dirtyKey();
  if(seeded||(editable&&S.dropped.length))S.saved='';   /* yeni oluşturulan ya da temizlenen plan: kaydedilmemiş sayılsın */
  root=document.createElement('div');root.className='bsg-root';root.id='busSeatingGrid';
  root.innerHTML=SKELETON;
  (opts.host||document.body).appendChild(root);
  try{document.body.classList.add('modal-open')}catch(_){}
  try{const r=global.KorukPlatformAdapter&&global.KorukPlatformAdapter.setPullToRefreshEnabled&&global.KorukPlatformAdapter.setPullToRefreshEnabled(false);if(r&&r.catch)r.catch(()=>{})}catch(_){}
  R('title').textContent=editable?'Oturma planı':'Oturma planı (görüntüleme)';
  R('sub').textContent=[ctx.service.name,ctx.service.plate].filter(Boolean).join(' · ');
  ['undo','redo','save'].forEach(n=>{R(n).hidden=!editable});
  R('modebar').hidden=!editable;
  ac=new AbortController();const sg={signal:ac.signal};
  root.addEventListener('click',onClick,sg);
  root.addEventListener('change',onChange,sg);
  root.addEventListener('input',onInput,sg);
  root.addEventListener('pointerdown',onPointerDown,sg);
  root.addEventListener('contextmenu',e=>{if(e.target.closest('[data-drag],[data-r="grid"]'))e.preventDefault()},sg);
  document.addEventListener('pointermove',onPointerMove,sg);
  document.addEventListener('pointerup',onPointerUp,sg);
  document.addEventListener('pointercancel',onPointerCancel,sg);
  document.addEventListener('touchmove',e=>{if((drag&&drag.active)||(eg&&eg.active))e.preventDefault()},{signal:ac.signal,passive:false});
  document.addEventListener('keydown',onKey,sg);
  document.addEventListener('click',e=>{if(performance.now()<suppressUntil){e.stopPropagation();e.preventDefault()}},{signal:ac.signal,capture:true});
  global.addEventListener('beforeunload',e=>{if(root&&isDirty()){e.preventDefault();e.returnValue=''}},sg);
  render();
  if(editable&&S.dropped.length)toast(S.dropped.length+' kişi serviste olmadığı için koltuktan çıkarıldı. Kaydedince kalıcı olur.',null,6500);
  if(typeof ResizeObserver==='function'){
    ro=new ResizeObserver(()=>{if(!root||!S||(eg&&eg.active))return;const o=S.m.cw;applyMetrics();if(o!==S.m.cw)fitNames()});
    ro.observe(R('planwrap'));
  }
  return true;
}
const isOpen=()=>!!root;

global.BusSeatingGrid={open,close,requestClose,isOpen,isDirty:()=>!!(S&&isDirty()),
  _pure:{splitName,makeStudent,markSiblings,fromStored,toStored,calc,autoPlan,autoPreviewText,suggestions,statsOf,whereMap,posText,canPlace,elAt,newEl,prune,gridBounds,kindOf,konumCells,clusterCells,tplElements,TEMPLATES,LIM,fold,esc,shortName,mates,pickTemplate,printModel,realStudents}};
})(window);
