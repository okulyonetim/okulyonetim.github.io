// Servis oturma planı: hücre ızgarası editörü (js/modules/bus-seating-grid.js) — veri katmanı, geri uyumluluk ve bağlantı sözleşmesi.
const fs=require('fs'),vm=require('vm'),assert=require('assert');

/* 1) Modülü DOM'suz yükle; yalnız saf katman (_pure) test edilir. */
const gridSrc=fs.readFileSync('js/modules/bus-seating-grid.js','utf8');
new Function(gridSrc);
const sandbox={};sandbox.window=sandbox;
vm.runInNewContext(gridSrc,sandbox);
const G=sandbox.BusSeatingGrid;
assert(G&&typeof G.open==='function'&&typeof G.close==='function'&&typeof G.requestClose==='function'&&typeof G.isOpen==='function','BusSeatingGrid açık arayüzü (open/close/requestClose/isOpen) olmalı.');
assert.strictEqual(G.isOpen(),false,'Açılmadan isOpen false olmalı.');
const P=G._pure;

const STU=[
  {id:'v1',name:'Zeynep Kaya',className:'3-A',classId:'c3a',guardian:'Ayşe Kaya'},
  {id:'v2',name:'Ada Yılmaz',className:'5-A',classId:'c5a',guardian:'Selma Yılmaz'},
  {id:'v3',name:'Mert Yılmaz',className:'2-B',classId:'c2b',guardian:'Selma Yılmaz'},
  {id:'v4',name:'Elif Şahin',className:'4-B',classId:'c4b',guardian:''},
  {id:'v5',name:'İpek Doğan',className:'1-A',classId:'c1a',guardian:''},
  {id:'v6',name:'Ömer Faruk Çınar',className:'6-A',classId:'c6a',guardian:''}
];
const model=(tpl,students)=>{const m=P.fromStored({elements:[],students:students||STU,service:{driver:'Hasan Çakır'}});m.grid={cols:P.TEMPLATES[tpl].cols,rows:P.TEMPLATES[tpl].rows};m.els=P.tplElements(tpl,'Hasan Çakır');m.sablon=P.TEMPLATES[tpl].sablon;return m};

/* 2) Şablonlar: koltuklar hücreye oturur, çakışma yok, ızgara sınırı içinde. */
for(const k of Object.keys(P.TEMPLATES)){
  const m=model(k);
  m.els.forEach(a=>{
    assert(a.x>=0&&a.y>=0&&a.x+a.w<=m.grid.cols&&a.y+a.h<=m.grid.rows,`${k}: öğe ızgara dışında`);
    m.els.forEach(b=>{if(a!==b)assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),`${k}: öğeler çakışıyor`)});
  });
  assert(m.els.some(e=>e.type==='driver'),`${k}: şoför koltuğu olmalı`);
}
assert.strictEqual(P.pickTemplate(0),'minibus');
assert.strictEqual(P.pickTemplate(22),'1x2');
assert.strictEqual(P.pickTemplate(45),'otobus');
assert.strictEqual(P.pickTemplate(500),'otobus');

/* 3) Gidiş-dönüş: toStored → fromStored aynı yerleşimi verir; eski editörün beklediği alanlar yazılır. */
{
  const m=model('2x2'),L=P.calc(m),byNo={};L.seats.forEach(s=>{byNo[s.no]=s.id});
  m.seats[byNo[2]]={stu:'v2'};m.seats[byNo[3]]={stu:'v3'};m.seats[byNo[6]]={stu:'v1'};
  m.seats[byNo[1]]={res:'Rehber öğretmen'};m.seats[byNo[10]]={bad:true};
  m.notes.v1='Öne oturmalı';
  m.els.filter(e=>e.type==='driver')[0].name='Ali Veli';
  const st=P.toStored(m);
  const seats=st.elements.filter(e=>e.type==='koltuk');
  assert.strictEqual(seats.length,P.calc(m).total,'her koltuk tek kayıt olmalı');
  assert.strictEqual(st.layout.table.editorVersion,2,'tablo modeli (editorVersion 2) korunmalı');
  assert.strictEqual(st.layout.table.cols,m.grid.cols);assert.strictEqual(st.layout.table.rows,m.grid.rows);
  assert(st.elements.every(e=>Number.isInteger(e.row)&&Number.isInteger(e.column)&&e.rowSpan>=1&&e.colSpan>=1),'row/column/rowSpan/colSpan yazılmalı');
  const pos=new Set(st.elements.map(e=>Math.round(e.x)+'|'+Math.round(e.y)));
  assert.strictEqual(pos.size,st.elements.length,'x/y hücreden türetilmeli: eski editör "üst üste" onarımını tetiklememeli');
  assert(st.elements.every(e=>!(e.properties&&'konum' in e.properties)),'eski konum alanı artık yazılmamalı');
  const s2=seats.filter(e=>e.studentId==='v2')[0];
  assert(s2&&s2.properties.studentName==='Ada Yılmaz'&&s2.properties.sinifAdi==='5-A'&&s2.properties.sinifId==='c5a','öğrenci adı, sınıf adı ve sınıf id yazılmalı');
  assert(seats.some(e=>e.properties.reserved&&e.properties.reserveNote==='Rehber öğretmen'),'rezerve koltuk yazılmalı');
  assert(seats.some(e=>e.properties.closed===true),'kapalı koltuk yazılmalı');
  assert(seats.filter(e=>e.studentId==='v1')[0].properties.note==='Öne oturmalı','not yazılmalı');
  const drv=st.elements.filter(e=>e.type==='sofor')[0];
  assert(drv&&drv.properties.driverName==='Ali Veli','şoför adı yazılmalı');
  assert(st.elements.some(e=>e.type==='vehicle'&&e.properties.kind==='door'),'kapı vehicle/door olarak yazılmalı');
  // geri oku
  const back=P.fromStored({elements:JSON.parse(JSON.stringify(st.elements)),layout:st.layout,sablon:st.sablon,planAdi:st.planAdi,students:STU,service:{driver:'Hasan Çakır'}});
  assert.strictEqual(JSON.stringify(back.grid),JSON.stringify(m.grid),'ızgara boyutu korunmalı');
  assert.strictEqual(back.els.length,m.els.length,'öğe sayısı korunmalı');
  const L2=P.calc(back),w=P.whereMap(back,L2);
  assert.strictEqual(L2.byId[w.v2].no,P.calc(m).byId[byNo[2]].no,'Ada aynı koltukta kalmalı');
  assert.strictEqual(L2.byId[w.v1].no,6,'Zeynep 6 numaralı koltukta kalmalı');
  assert(back.notes.v1==='Öne oturmalı');
  assert.strictEqual(back.els.filter(e=>e.type==='driver')[0].name,'Ali Veli');
  const st2=P.statsOf(back,L2);
  assert.strictEqual(st2.bad,1);assert.strictEqual(st2.res,1);assert.strictEqual(st2.placed,3);
  assert.strictEqual(st2.usable,st2.total-2,'kapalı ve rezerve koltuk kullanılabilirden düşmeli');
}

/* 4) Eski planlar: konum şeması, piksel x/y, çakışan/eksik veri hiçbir koltuğu kaybettirmemeli. */
{
  const konum=['sol-dis','sol-ic','sag-ic','sag-dis'];
  const legacy=[{id:'d',type:'sofor',x:355,y:20,properties:{kind:'driver',label:'Şoför'}}];
  let n=1;for(let r=1;r<=4;r++)konum.forEach(k=>legacy.push({id:'k'+n,type:'koltuk',seatNumber:n++,row:r,x:0,y:0,studentId:n===3?'v4':null,properties:{kind:'seat',konum:k,studentName:n===3?'Elif Şahin':''}}));
  const m=P.fromStored({elements:legacy,layout:{},students:STU,service:{driver:'Hasan'}});
  assert.strictEqual(m.els.filter(e=>e.type==='seat').length,16,'konum şemasındaki 16 koltuk de gelmeli');
  assert(m.grid.cols>=5,'iki sol + koridor + iki sağ sütun için en az 5 sütun');
  const L=P.calc(m);assert.strictEqual(L.seats.length,16);
  assert.strictEqual(P.whereMap(m,L).v4!==undefined,true,'öğrenci kimliğiyle eşleşen koltuk korunmalı');
  assert.strictEqual(m.els.filter(e=>e.type==='driver')[0].name,'Hasan','adı olmayan şoför, servisteki şoför adını almalı');

  // piksel x/y (serbest tuval)
  const px=[];[0,1,2,3].forEach(r=>[55,290,525].forEach((x,i)=>px.push({id:'p'+r+i,type:'koltuk',seatNumber:r*3+i+1,x,y:150+r*145,width:145,height:90,properties:{kind:'seat'}})));
  const m2=P.fromStored({elements:px,layout:{},students:[],service:{}});
  assert.strictEqual(m2.els.length,12);assert.strictEqual(m2.grid.cols,3,'üç x kümesi üç sütun olmalı');

  // hepsi aynı koordinatta + aynı hücreyi isteyen iki öğe: kaybolmaz, boş hücreye yayılır
  const stack=[0,1,2,3,4,5].map(i=>({id:'s'+i,type:'koltuk',seatNumber:i+1,row:1,column:1,properties:{kind:'seat'}}));
  const t2={editorVersion:2,rows:3,cols:3};
  const m3=P.fromStored({elements:stack,layout:{table:t2},students:[],service:{}});
  assert.strictEqual(m3.els.length,6,'çakışan hücreler öğe kaybettirmemeli');
  m3.els.forEach(a=>m3.els.forEach(b=>{if(a!==b)assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),'çakışma kalmamalı')}));

  // aynı öğrenci iki koltukta kayıtlıysa yalnız biri sahip olur; adı eşleşmeyen orphan korunur
  const dup=[{id:'a',type:'koltuk',row:1,column:1,studentId:'v1',properties:{kind:'seat',studentName:'Zeynep Kaya'}},{id:'b',type:'koltuk',row:1,column:2,studentId:'v1',properties:{kind:'seat',studentName:'Zeynep Kaya'}},{id:'c',type:'koltuk',row:2,column:1,properties:{kind:'seat',studentName:'Ayrılmış Öğrenci'}}];
  const m4=P.fromStored({elements:dup,layout:{table:{editorVersion:2,rows:3,cols:3}},students:STU,service:{}});
  const placed=Object.keys(m4.seats).map(k=>m4.seats[k].stu);
  assert.strictEqual(placed.filter(x=>x==='v1').length,1,'bir öğrenci iki koltuğa yerleşmemeli');
  const orphanSeat=Object.keys(m4.seats).filter(k=>m4.studs[m4.seats[k].stu]&&m4.studs[m4.seats[k].stu].orphan);
  assert.strictEqual(orphanSeat.length,1,'listede olmayan adı taşıyan koltuk korunmalı');
  assert.strictEqual(P.realStudents(m4).some(s=>s.orphan),false,'orphan bekleyen listesine girmemeli');
  const back=P.toStored(m4).elements.filter(e=>e.type==='koltuk'&&e.properties.studentName==='Ayrılmış Öğrenci');
  assert.strictEqual(back.length,1,'orphan adı kayıtta kaybolmamalı');
}

/* 5) Otomatik yerleştirme: kardeşler yan yana, kapalı/rezerve koltuk atlanır, kapasite aşımı bildirilir. */
{
  const m=model('minibus');
  const L=P.calc(m);const bad=L.seats[3],res=L.seats[4];
  m.seats[bad.id]={bad:true};m.seats[res.id]={res:'Rezerve'};
  const p=P.autoPlan(m,{sib:true,small:true,keep:false});
  assert.strictEqual(p.added,STU.length,'6 öğrenci yerleşmeli');
  assert(!p.occ[bad.id]&&!p.occ[res.id],'kapalı ve rezerve koltuğa yerleştirilmemeli');
  const seatOf={};for(const id in p.occ)seatOf[p.occ[id]]=L.byId[id];
  assert.strictEqual(seatOf.v2.unit,seatOf.v3.unit,'kardeşler (aynı veli + soyad) aynı sıra grubunda olmalı');
  assert.strictEqual(p.together,1);
  const keep=model('minibus');const L3=P.calc(keep);keep.seats[L3.seats[7].id]={stu:'v6'};
  const p2=P.autoPlan(keep,{sib:true,small:true,keep:true});
  assert.strictEqual(p2.occ[L3.seats[7].id],'v6','"mevcut yerleşimi koru" seçiliyken yerleşmiş öğrenci yerinde kalmalı');
  const tiny=model('empty');const many=[];for(let i=0;i<5;i++)many.push({id:'t'+i,name:'Öğrenci '+i,className:'1-A'});
  const mt=P.fromStored({elements:[],students:many,service:{}});mt.grid={cols:3,rows:2};mt.els=[{id:'x1',type:'seat',x:0,y:0,w:1,h:1},{id:'x2',type:'seat',x:1,y:0,w:1,h:1}];
  const p3=P.autoPlan(mt,{sib:false,small:false,keep:false});
  assert.strictEqual(p3.added,2);assert.strictEqual(p3.left,3,'sığmayanlar sayılmalı');
  assert(/3 öğrenci sığmıyor/.test(P.autoPreviewText(mt,{sib:false,small:false,keep:false})));
}

/* 6) Numaralandırma ve düzen işlemleri */
{
  const m=model('minibus');
  const byRow=P.calc(m).seats.map(s=>s.id);
  m.numMode='col';const byCol=P.calc(m).seats.map(s=>s.id);
  assert.notDeepStrictEqual(byRow,byCol,'sütun numaralandırma sırayı değiştirmeli');
  assert.strictEqual(P.canPlace(m,0,0,1,1),false,'dolu hücreye yerleştirilemez');
  assert.strictEqual(P.canPlace(m,m.grid.cols,0,1,1),false,'ızgara dışına yerleştirilemez');
  const e=P.newEl(m,'door',2,m.grid.rows-1,1,1);assert.strictEqual(e.label,'Kapı');
  m.seats['yok']={stu:'v1'};assert.strictEqual(P.prune(m),1,'silinen koltuktaki öğrenci bekleyene düşer');
  assert(!m.seats['yok']);
  const b=P.gridBounds(m);assert(b.maxX<=m.grid.cols&&b.maxY<=m.grid.rows);
}

/* 7) Yazdırma gövdesi: ad-soyad, sınıf ve şoför adı yer alır; renkler yalnız rapor tokenlarından gelir. */
{
  const m=model('minibus');const L=P.calc(m);m.seats[L.seats[1].id]={stu:'v6'};
  const o=P.printModel(m,{school:'Koruk İlk-Ortaokulu',name:'Servis 1',plate:'34 ABC 123',driver:'Hasan Çakır'});
  assert(o.body.includes('Ömer Faruk')&&o.body.includes('Çınar')&&o.body.includes('6-A'),'yazdırmada ad, soyad ve sınıf tam yer almalı');
  assert(o.body.includes('Hasan Çakır')&&o.body.includes('Servis 1')&&o.body.includes('34 ABC 123'));
  assert(!/#[0-9a-fA-F]{3,8}\b/.test(o.extra),'yazdırma stilinde sabit renk olmamalı');
  assert(o.extra.includes('--ka-report-transport-'),'yazdırma renkleri rapor tokenlarından gelmeli');
}

/* 8) Eski transport.js ile uyum: kayıt ve istatistik (ilk IIFE gerçekten çalıştırılır). */
{
  const lines=fs.readFileSync('js/modules/transport.js','utf8').split('\n');
  const start=lines.findIndex(l=>l.startsWith('(function(global){')),end=lines.findIndex((l,i)=>i>start&&l.startsWith('})(window);'));
  assert(start>=0&&end>start,'transport.js ilk IIFE bulunamadı');
  const writes=[];
  const win={AppStore:{data:()=>[]},toast(){},PermissionService:{can:()=>true},DeviceData:{set:(...a)=>{writes.push(a);return Promise.resolve()},get:()=>null,list:()=>[]}};win.window=win;
  Object.assign(win,{console,structuredClone,COL:{servisOturma:'oy_servisOturma'}});
  vm.runInNewContext(lines.slice(start,end+1).join('\n'),win);
  const stats=win.soElementIstatistik([
    {type:'koltuk',properties:{}},{type:'koltuk',studentId:'a',properties:{studentName:'A'}},{type:'koltuk',properties:{reserved:true}},
    {type:'koltuk',properties:{closed:true}},{type:'vehicle',properties:{kind:'door'}},{type:'vehicle',properties:{kind:'luggage'}},{type:'sofor'}
  ]);
  assert.deepStrictEqual({t:stats.toplam,d:stats.dolu,b:stats.bos,r:stats.rezerve},{t:3,d:1,b:1,r:1},'kapalı koltuk, kapı/alan ve şoför koltuk sayısına girmemeli');

  const m=model('minibus');const L=P.calc(m);m.seats[L.seats[1].id]={stu:'v1'};m.seats[L.seats[2].id]={bad:true};m.seats[L.seats[3].id]={res:'Rehber'};
  const st=P.toStored(m);
  return win.ServisOturmaService.planTableKaydet('srv1',st.sablon,st.elements,st.layout,st.planAdi).then(()=>{
    assert.strictEqual(writes.length,1,'planTableKaydet tek yazma yapmalı');
    const doc=writes[0][3];
    assert.strictEqual(writes[0][2],'srv1');
    assert(Array.isArray(doc.elements)&&doc.elements.length===st.elements.length,'elements aynen yazılmalı');
    assert(Array.isArray(doc.koltuklar)&&doc.koltuklar.some(k=>k.ogrenciId==='v1'&&k.ogrenciAdi==='Zeynep Kaya'&&k.sinifAdi==='3-A'),'eski koltuklar alanı (raporlar için) ad ve sınıfla yazılmalı');
    assert(Array.isArray(doc.yerlesim)&&doc.yerlesim.some(y=>y.aktif===false),'kapalı koltuk yerlesim içinde aktif:false olmalı');
    assert.strictEqual(doc.layout.table.editorVersion,2);
    const reasons=doc.koltuklar.filter(k=>k.rezerve).length;assert.strictEqual(reasons,1,'rezerve koltuk eski alanda da görünmeli');
    return runWiring();
  });
}

/* 9) Bağlantı sözleşmesi: transport.js, yükleyici, service worker, CSS, derleme betiği */
function runWiring(){
  const tr=fs.readFileSync('js/modules/transport.js','utf8'),loader=fs.readFileSync('js/app-loader.js','utf8'),sw=fs.readFileSync('service-worker.js','utf8');
  const css=fs.readFileSync('css/design-system-base.css','utf8'),entry=fs.readFileSync('css/design-system.css','utf8'),idx=fs.readFileSync('index.html','utf8'),bundles=fs.readFileSync('scripts/build-client-bundles.mjs','utf8');
  assert(/async function openGridEditor\(s\)/.test(tr)&&tr.includes("js/modules/bus-seating-grid.js?v=1"),'transport.js yeni editörü tembel yüklemeli');
  assert((tr.match(/function openBusEditor\([\s\S]*?function openLegacyBusEditor/)||[''])[0].includes('openGridEditor(s)'),'openBusEditor yeni editörü açmalı');
  assert(tr.includes('function openLegacyBusEditor(')&&tr.includes('openLegacyBusEditor(s.id)'),'yükleme hatasında eski editöre düşülmeli');
  assert(tr.includes('planTableKaydet(servisId,payload.sablon,payload.elements,payload.layout,payload.planAdi)'),'kayıt ServisOturmaService.planTableKaydet ile yapılmalı');
  assert(tr.includes("function back(){if(gridEditorOpen()){window.BusSeatingGrid.requestClose();return true}"),'geri tuşu önce yeni editöre gitmeli');
  assert(tr.includes("function closeEditor(){try{window.BusSeatingGrid?.close?.(true)}catch(_){}"),'modül kapanırken yeni editör de kapanmalı');
  assert(tr.includes('window.ReportEngine.printReport(o.title,o.body'),'yazdırma ReportEngine üzerinden olmalı');
  assert(tr.includes('SABLON_AD[p?.sablon]'),'servis oturma listesi şablon adlarını okunur göstermeli');
  const tv=loader.match(/js\/modules\/transport\.js\?v=(\d+)/)[1],stv=sw.match(/js\/modules\/transport\.js\?v=(\d+)/)[1];
  assert.strictEqual(tv,stv,'transport.js sürümü yükleyici ve service worker’da aynı olmalı');
  assert(sw.includes("./js/modules/bus-seating-grid.js?v=1"),'service worker yeni modülü önbelleğe almalı');
  const dsv=idx.match(/css\/design-system\.css\?v=(\d+)/)[1];assert(sw.includes(`./css/design-system.css?v=${dsv}`),'service worker CSS sürümü index.html ile aynı olmalı');
  assert(/design-system-base\.css\?v=\d+/.test(entry));
  assert(bundles.includes("'js/modules/bus-seating-grid.js'"),'derleme betiği yeni modülü transport paketine eklemeli');
  // CSS: ayrı bölüm, yalnız .bsg-root altında, sabit renk yok
  const i=css.indexOf('SERVİS OTURMA IZGARASI');assert(i>0,'CSS bölümü eksik');
  const wEnd=css.indexOf('WEB ARAYÜZÜ (≥1100px)',i);assert(wEnd>i,'ızgara CSS’i WEB ARAYÜZÜ bölümünden önce olmalı (web-shell-desktop sözleşmesi)');
  const sec=css.slice(css.lastIndexOf('/*',i),css.lastIndexOf('/*',wEnd)).replace(/\/\*[\s\S]*?\*\//g,'');
  assert(!/#[0-9a-fA-F]{3,8}\b|\brgba?\(\s*\d/.test(sec),'ızgara CSS’inde sabit renk olmamalı (yalnız var(--ka-*) / var(--t-*))');
  const sels=[...sec.matchAll(/(^|\})\s*([^{}@]+)\{/g)].map(m=>m[2].trim()).filter(s=>s&&!/^\d+%|^(from|to)$|^\d/.test(s));
  const loose=sels.filter(s=>s.split(',').some(x=>!/^(\.bsg-root|html\[data-theme="dark"\]\s+\.bsg-root)/.test(x.trim())));
  assert.deepStrictEqual(loose,[],'tüm ızgara CSS seçicileri .bsg-root ile kapsanmalı: '+loose.slice(0,3).join(' | '));
  // modül kendi stilini enjekte etmemeli, localStorage/Firestore kullanmamalı
  assert(!/createElement\(['"]style['"]\)|localStorage|firebase|\.collection\(/.test(gridSrc),'modül stil enjekte etmemeli ve doğrudan veri katmanına dokunmamalı');
  console.log('bus-seating-grid: OK');
}
