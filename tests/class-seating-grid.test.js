// Sınıf oturma planı: hücre ızgarası editörü (js/modules/class-seating-grid.js) — veri katmanı, eski plan uyumu, yazdırma ve bağlantı sözleşmesi.
const fs=require('fs'),vm=require('vm'),assert=require('assert');

const gridSrc=fs.readFileSync('js/modules/class-seating-grid.js','utf8');
new Function(gridSrc);
const sandbox={};sandbox.window=sandbox;
vm.runInNewContext(gridSrc,sandbox);
const G=sandbox.ClassSeatingGrid;
assert(G&&typeof G.open==='function'&&typeof G.close==='function'&&typeof G.requestClose==='function'&&typeof G.isOpen==='function'&&typeof G.serialize==='function','ClassSeatingGrid açık arayüzü (open/close/requestClose/isOpen/serialize) olmalı.');
assert.strictEqual(G.isOpen(),false,'Açılmadan isOpen false olmalı.');
assert.strictEqual(G.serialize(),null,'Açık plan yokken serialize null dönmeli.');
const P=G._pure;

const NAMES=['Ali Yılmaz','Ayşe Kaya','Burak Demir','Ceren Şahin','Deniz Çelik','Elif Nur Öztürk','Furkan Aydın','Gül Akın','Hasan Kılıç','İpek Doğan','Kemal Arslan','Leyla Polat','Mehmet Ali Koç','Naz Güneş','Okan Yıldız','Pınar Eren','Rıza Tan','Selin Bulut','Tuna Çakır','Umut Aksoy','Vildan Kurt','Yağmur Sezer','Zeynep Işık','Abdurrahman Karabulut'];
const STU=NAMES.map((n,i)=>({id:'s'+i,name:n,no:String(i+1),gender:i%2?'Kız':'Erkek'}));
const model=(key,students)=>{const m=P.fromStored({plan:null,students:students||STU,teacher:'Ahmet Öğretmen',className:'3-A'});P.applyTemplate(m,P.buildTemplate(key,(students||STU).length,'Ahmet Öğretmen'));return m};

/* 1) Hazır düzenler: hücreye oturur, çakışma yok, duvar öğeleri sınır içinde, öğrenci sayısını karşılar. */
for(const k of Object.keys(P.TEMPLATES)){
  const t=P.buildTemplate(k,24,'Ahmet Öğretmen');
  t.els.forEach(a=>{
    if(a.t==='wall'){const L=(a.side==='top'||a.side==='bottom')?t.cols:t.rows;assert(a.s>=0&&a.n>=1&&a.s+a.n<=L,`${k}: duvar öğesi sınır dışında`);return}
    assert(a.x>=0&&a.y>=0&&a.x+a.w<=t.cols&&a.y+a.h<=t.rows,`${k}: öğe ızgara dışında`);
    t.els.forEach(b=>{if(a!==b&&b.t!=='wall')assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),`${k}: öğeler çakışıyor`)});
  });
  assert(t.cols>=P.LIM.minCols&&t.cols<=P.LIM.maxCols&&t.rows>=P.LIM.minRows&&t.rows<=P.LIM.maxRows,`${k}: ızgara sınırları`);
  assert(t.els.some(e=>e.t==='teacher')&&t.els.some(e=>e.k==='board')&&t.els.some(e=>e.k==='door')&&t.els.some(e=>e.k==='window'),`${k}: öğretmen masası, tahta, kapı ve pencere olmalı`);
  if(k!=='bos')assert(t.seats>=24,`${k}: 24 öğrenciye yetecek koltuk olmalı (${t.seats})`);
}
assert(P.buildTemplate('sira2',60,'').seats>=60,'Kalabalık sınıfta koltuk sayısı öğrenciyi karşılamalı.');

/* 1b) Varsayılan düzen: A4 dikey, 8 sütun × 10 satır; tahta üstte (sütun 1-6), kapı sağ üstte, sol duvarda üç pencere, 3 × 3 ikili sıra, öğretmen masası sol üstte. */
{
  const t=P.buildTemplate('standart',18,'Öğretmen Adı');
  assert.strictEqual(t.cols,8);assert.strictEqual(t.rows,10);assert.strictEqual(t.yon,'dikey','Varsayılan sayfa yönü dikey olmalı.');
  assert.strictEqual(t.seats,18);
  const desks=t.els.filter(e=>e.t==='desk');
  assert.strictEqual(desks.length,9);
  assert.strictEqual(JSON.stringify([...new Set(desks.map(d=>d.x))].sort()),'[0,3,6]');
  assert.strictEqual(JSON.stringify([...new Set(desks.map(d=>d.y))].sort()),'[3,4,5]');
  assert(desks.every(d=>d.w===2&&d.h===1),'Sıralar ikili (2 × 1) olmalı.');
  const te=t.els.find(e=>e.t==='teacher');
  assert(te.x===0&&te.y===1&&te.w===3&&te.h===1&&te.name==='Öğretmen Adı','Öğretmen masası 3 × 1, 2. satırda sol başta olmalı.');
  const wall=(k,side)=>t.els.filter(e=>e.t==='wall'&&e.k===k&&e.side===side);
  assert(wall('board','top').length===1&&wall('board','top')[0].s===1&&wall('board','top')[0].n===6,'Tahta üstte sütun 1-6.');
  assert(wall('door','right').length===1&&wall('door','right')[0].s===0&&wall('door','right')[0].n===2,'Kapı sağ duvarda ilk iki satır.');
  assert.strictEqual(JSON.stringify(wall('window','left').map(w=>[w.s,w.n])),'[[1,2],[4,2],[7,2]]','Sol duvarda üç pencere.');
  assert.strictEqual(P.buildTemplate('standart',6,'').seats,18,'Az öğrencide de varsayılan 18 koltuk korunur.');
  assert.strictEqual(P.buildTemplate('standart',30,'').rows,10);assert(P.buildTemplate('standart',30,'').seats>=30);
  const big=P.buildTemplate('standart',60,'');
  assert(big.rows>10&&big.seats>=60&&big.cols===8,'Kalabalık sınıfta yalnız satır sayısı artar.');
  assert.strictEqual(Object.keys(P.TEMPLATES)[0],'standart','Standart sınıf hazır düzenlerin başında olmalı.');
  const bos=P.buildTemplate('bos',0,'');assert(bos.cols===8&&bos.rows===10&&bos.yon==='dikey'&&bos.seats===0);
  const empty=P.fromStored({plan:null,students:[],teacher:'',className:''});
  assert(empty.grid.cols===8&&empty.grid.rows===10&&empty.yon==='dikey','Plansız boş model 8 × 10 dikey olmalı.');
  const src=fs.readFileSync('js/modules/class-seating-grid.js','utf8');
  assert(src.includes("buildTemplate('standart',realStudents(m).length,m.teacher)"),'Yeni plan ilk açılışta standart düzenle başlamalı.');
}

/* 2) Gidiş-dönüş: toStored → fromStored aynı düzeni, yerleşimi ve sabit öğrencileri verir. */
{
  const m=model('sira2'),L=P.calc(m);
  m.asg=P.autoPlan(m,{mode:'alfa',keep:false}).occ;
  const some=Object.keys(m.asg)[0];m.pin[m.asg[some]]=true;
  m.els.filter(e=>e.t==='teacher')[0].name='Zeynep Hoca';
  const st=P.toStored(m);
  assert.strictEqual(st.surum,2);assert.strictEqual(st.izgara.sutun,m.grid.cols);assert.strictEqual(st.izgara.satir,m.grid.rows);
  assert(['dikey','yatay'].includes(st.sayfaYonu),'sayfa yönü yazılmalı');
  assert(['tekli-sira','ikili-masa','grup-masasi-4','grup-masasi-6'].includes(st.masaTuru)&&st.sutunSayisi>=1&&st.satirSayisi>=1&&['sag','sol'].includes(st.kapiYonu),'eski alanlar (masaTuru/sutunSayisi/satirSayisi/kapiYonu) yazılmalı');
  const desks=st.ogeler.filter(o=>P.DESKS[o.tur]);
  assert.strictEqual(desks.reduce((a,o)=>a+o.koltuklar.length,0),L.total,'koltuk sayısı korunmalı');
  assert(desks.every(o=>o.koltuklar.length===P.DESKS[o.tur].n),'her sıra kendi türünün koltuk sayısını yazmalı');
  assert.strictEqual(desks.reduce((a,o)=>a+o.koltuklar.filter(k=>k.ogrenciId).length,0),24,'tüm öğrenciler koltuk kaydında olmalı');
  assert(desks.some(o=>o.koltuklar.some(k=>k.sabit===true)),'sabit öğrenci işaretlenmeli');
  assert(st.ogeler.some(o=>o.tur==='ogretmen-masasi'&&o.isim==='Zeynep Hoca'),'öğretmen masası adı yazılmalı');
  ['yazi-tahtasi','kapi','pencere'].forEach(t=>assert(st.ogeler.some(o=>o.tur===t&&o.kenar&&o.uzunluk>=1),`${t} duvar öğesi yazılmalı`));
  const pg=P.PAGE[st.sayfaYonu];
  st.ogeler.forEach(o=>{
    assert(o.x>=0&&o.y>=0&&o.x+o.w<=pg.w&&o.y+o.h<=pg.h,`${o.tur}: eski/önizleme piksel yerleşimi sayfa içinde olmalı`);
    assert(Number.isFinite(o.rotasyon)&&Array.isArray(o.koltuklar),'eski editörün beklediği alanlar yazılmalı');
  });
  const back=P.fromStored({plan:JSON.parse(JSON.stringify(st)),students:STU,teacher:'Ahmet Öğretmen'});
  const L2=P.calc(back);
  assert.deepStrictEqual(back.grid,m.grid);assert.strictEqual(back.els.length,m.els.length);assert.strictEqual(L2.total,L.total);
  assert.strictEqual(Object.keys(P.whereMap(back,L2)).length,24,'yerleşim gidiş-dönüşte korunmalı');
  assert.strictEqual(Object.keys(back.pin).length,1,'sabit öğrenci gidiş-dönüşte korunmalı');
  assert.strictEqual(back.yon,m.yon);
}

/* 3) Eski serbest tuval planı hücrelere dökülür; öğrenci yerleşimi, öğretmen masası ve duvar öğeleri korunur. */
{
  const old={sayfaYonu:'dikey',ogeler:[]};let id=0;
  for(let r=0;r<4;r++)for(let c=0;c<3;c++){old.ogeler.push({tur:'ikili-masa',x:40+c*250,y:200+r*164,w:224,h:98,rotasyon:0,isim:'',koltuklar:[{ogrenciId:'s'+id,isim:NAMES[id]},{ogrenciId:'s'+(id+1),isim:NAMES[id+1]}]});id+=2}
  old.ogeler.push({tur:'ogretmen-masasi',x:40,y:60,w:224,h:112,rotasyon:0,isim:'Ahmet Öğretmen',koltuklar:[]});
  old.ogeler.push({tur:'yazi-tahtasi',x:230,y:20,w:336,h:28,rotasyon:0,koltuklar:[]});
  old.ogeler.push({tur:'kapi',x:750,y:700,w:28,h:168,rotasyon:0,koltuklar:[]});
  old.ogeler.push({tur:'pencere',x:0,y:300,w:14,h:224,rotasyon:0,koltuklar:[]});
  const m=P.fromStored({plan:old,students:STU,teacher:'Ahmet Öğretmen'}),L=P.calc(m);
  assert.strictEqual(L.total,24);assert.strictEqual(Object.keys(P.whereMap(m,L)).length,24,'eski plandaki herkes yerinde kalmalı');
  assert.strictEqual(m.els.filter(e=>e.t==='desk').length,12);
  assert(m.els.some(e=>e.t==='teacher'&&e.name==='Ahmet Öğretmen'),'öğretmen masası taşınmalı');
  assert(m.els.some(e=>e.k==='door'&&e.side==='right')&&m.els.some(e=>e.k==='window'&&e.side==='left')&&m.els.some(e=>e.k==='board'&&e.side==='top'),'duvar öğeleri uygun duvara yerleşmeli');
  /* öğrenci kimliği silinmişse ad ile bulunur; sınıftan ayrılan koltuktan çıkar */
  const fewer=STU.slice(0,22);
  const m2=P.fromStored({plan:old,students:fewer,teacher:''});
  assert.strictEqual(m2.dropped.length,2,'sınıftan ayrılan iki öğrenci koltuktan çıkmalı');
  assert.strictEqual(Object.keys(P.whereMap(m2,P.calc(m2))).length,22);
  const byName=old.ogeler.map(o=>({...o,koltuklar:(o.koltuklar||[]).map(k=>({ogrenciId:'eski-'+k.ogrenciId,isim:k.isim}))}));
  const m3=P.fromStored({plan:{ogeler:byName},students:STU});
  assert.strictEqual(Object.keys(P.whereMap(m3,P.calc(m3))).length,24,'kimlik eşleşmezse ad ile eşleşmeli');
  /* dönmüş eski sıra: koltuk sırası görsel sırayla eşleşir */
  const rot={sayfaYonu:'dikey',ogeler:[{tur:'grup-masasi-6',x:100,y:100,w:200,h:140,rotasyon:90,koltuklar:[0,1,2,3,4,5].map(i=>({ogrenciId:'s'+i,isim:NAMES[i]}))}]};
  const mr=P.fromStored({plan:rot,students:STU}),d=mr.els.filter(e=>e.t==='desk')[0];
  assert.deepStrictEqual([d.w,d.h],[2,3],'90° dönmüş 6\'lı grup 2×3 olmalı');
  const at={};P.calc(mr).seats.forEach(s=>{at[mr.asg[s.key]]=[s.x-d.x,s.y-d.y]});
  assert.deepStrictEqual(at.s0,[1,0]);assert.deepStrictEqual(at.s2,[1,2]);assert.deepStrictEqual(at.s3,[0,0]);
}

/* 4) Düzen işlemleri: döndürme koltuk sırasını korur, kopyalama çakışmaz, duvar yeri bulunur. */
{
  const m=P.fromStored({plan:null,students:STU});m.grid={cols:8,rows:6};m.els=[];
  const d=P.newDesk('grup-masasi-6',1,1,false);m.els.push(d);
  for(let i=0;i<6;i++)m.asg[d.id+'.'+i]='s'+i;
  assert(P.rotateEl(m,d));assert.deepStrictEqual([d.w,d.h],[2,3]);
  const at={};P.calc(m).seats.forEach(s=>{at[m.asg[s.key]]=[s.x-d.x,s.y-d.y]});
  assert.deepStrictEqual(at.s0,[1,0]);assert.deepStrictEqual(at.s5,[0,2]);
  const c=P.dupEl(m,d);assert(c&&!m.els.some(e=>e!==c&&e.t!=='wall'&&e.id!==c.id&&c.x<e.x+e.w&&c.x+c.w>e.x&&c.y<e.y+e.h&&c.y+c.h>e.y),'kopya çakışmamalı');
  assert.strictEqual(Object.keys(m.asg).filter(k=>k.indexOf(c.id)===0).length,0,'kopyaya öğrenci taşınmamalı');
  const full=P.newDesk('ikili-masa',0,0,false);const m2=P.fromStored({plan:null,students:STU});m2.grid={cols:3,rows:3};m2.els=[full];
  {const sp=P.deskSpot(m2,'ikili-masa',{x:2,y:0});assert(sp&&sp.w===1&&sp.h===2,'sığmayan yatay sıra dik yerleşmeli')}
  assert(P.deskSpot(m2,'ikili-masa',{x:2,y:2})&&P.deskSpot(m2,'ikili-masa',{x:2,y:2}).x===1,'dokunulan hücreyi kapsayacak yer aranmalı');
  const painted=P.paintDesks(m2,'ikili-masa',[{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:0,y:2},{x:1,y:2}]);
  assert.strictEqual(painted.length,2,'sürükleyerek çizimde sıralar çakışmadan sırayla kabul edilmeli');
  const m3=P.fromStored({plan:null,students:STU});m3.grid={cols:6,rows:5};m3.els=[P.newWall('door','top',0,2)];
  assert(!P.wallFits(m3,'top',1,2)&&P.wallFits(m3,'top',2,2)&&!P.wallFits(m3,'top',5,2),'duvar öğeleri çakışmamalı ve duvar boyunu aşmamalı');
  const sp=P.wallSpot(m3,'top',0.5,3,null,1);assert(sp&&P.wallFits(m3,'top',sp.s,sp.n),'duvarda en yakın boş yer bulunmalı');
}

/* 5) Yerleştirme: kız–erkek dönüşümlü, sabit öğrenci yerinden oynamaz, mevcut yerleşim korunur. */
{
  const m=model('sira2'),L=P.calc(m);
  const alfa=P.autoPlan(m,{mode:'alfa',keep:false});
  assert.strictEqual(alfa.added,24);assert.strictEqual(alfa.left,0);
  const first=L.seats[0].key;assert.strictEqual(m.studs[alfa.occ[first]].full,'Abdurrahman Karabulut','alfabetik: ilk koltuğa ilk ad');
  const ke=P.autoPlan(m,{mode:'kizerkek',keep:false});
  const bySeat={};P.calc(m).seats.forEach(s=>{bySeat[s.id]=bySeat[s.id]||[];bySeat[s.id].push(s)});
  let mixed=0,pairs=0;Object.keys(bySeat).forEach(id=>{const a=bySeat[id];if(a.length===2){pairs++;const g=a.map(s=>m.studs[ke.occ[s.key]].g);if(g[0]&&g[1]&&g[0]!==g[1])mixed++}});
  assert.strictEqual(mixed,pairs,'kız–erkek modunda her ikili sırada farklı cinsiyet oturmalı');
  m.asg=alfa.occ;const pinned=m.asg[L.seats[3].key];m.pin[pinned]=true;
  const re=P.autoPlan(m,{mode:'karisik',keep:false});
  assert.strictEqual(re.occ[L.seats[3].key],pinned,'sabit öğrenci yeniden dağıtımda yerinde kalmalı');
  const keep=P.autoPlan(m,{mode:'karisik',keep:true});
  assert.strictEqual(keep.added,0,'koru açıkken yerleşmiş kimse oynamamalı');
  assert.strictEqual(P.autoPlan(model('bos'),{mode:'alfa',keep:false}).left,24,'koltuk yoksa kimse yerleşmemeli');
  const sg=P.suggestions(m,P.whereMap(m,P.calc(m)),'');assert.strictEqual(sg.length,0,'yerleşmiş öğrenci öneri listesinde çıkmamalı');
  delete m.asg[L.seats[0].key];
  assert.strictEqual(P.suggestions(m,P.whereMap(m,P.calc(m)),'abdur').length,1,'arama ad ile çalışmalı');
  const st=P.statsOf(m,P.calc(m));assert.strictEqual(st.waiting,1);assert.strictEqual(st.students,24);assert.strictEqual(st.girls+st.boys,24);
}

/* 6) Yazdırma: tek A4 sayfa, seçilen yön, tüm adlar ve renkler rapor tokenlarından. */
{
  const m=model('sira2');m.asg=P.autoPlan(m,{mode:'alfa',keep:false}).occ;
  for(const yon of ['dikey','yatay']){
    m.yon=yon;const o=P.printModel(m,{title:'2026 - 2027 EĞİTİM ÖĞRETİM YILI 3-A SINIFI OTURMA DÜZENİ',teacher:'Ahmet Öğretmen'});
    assert.strictEqual(o.yon,yon);
    NAMES.forEach(n=>{const sp=n.split(' ');assert(o.body.includes(P.esc(sp[sp.length-1])),`${n}: soyad çıktıda olmalı`)});
    assert(o.body.includes('OTURMA DÜZENİ')&&o.body.includes('Ahmet Öğretmen'),'başlık ve öğretmen adı olmalı');
    assert(o.extra.includes('--ka-report-transport-')&&o.extra.includes('--ka-report-class-'),'yazdırma renkleri rapor tokenlarından gelmeli');
    assert(!/#[0-9a-f]{3,8}\b/i.test(o.extra.replace(/&#\d+;/g,'')),'yazdırma stilinde sabit renk olmamalı');
    assert(o.fs>=9,'24 öğrencilik sınıfta yazı okunaklı (≥9px) kalmalı: '+o.fs);
    const w=parseFloat((o.body.match(/csgp-room" style="width:(\d+)px;height:(\d+)px/)||[])[1]),h=parseFloat((o.body.match(/csgp-room" style="width:\d+px;height:(\d+)px/)||[])[1]);
    assert(w<=(yon==='yatay'?1085:756)&&h<=(yon==='yatay'?756:1085),'oda A4 yazdırılabilir alanına sığmalı');
  }
}

/* 7) Bağlantı sözleşmesi: köprü, yetki, geri tuşu katmanı ve önbellek. */
const bridge=fs.readFileSync('js/modules/class-seating.js','utf8');new Function(bridge);
assert(bridge.includes('global.SinifOturma={')&&bridge.includes('ac:open')&&bridge.includes('kapat:')&&bridge.includes('serialize:'),'SinifOturma.ac/kapat/serialize korunmalı.');
assert(bridge.includes('const isTeacherUser=()=>activeUser().admin!==true&&!!activeTeacherId()')&&bridge.includes('const canEdit=()=>isTeacherUser()?ownClass()'),'Öğretmen yalnız kendi sınıfını düzenleyebilmeli.');
assert(bridge.includes('global.SinifOturmaService.planKaydet(id,payload)')&&bridge.includes('global.SinifOturmaService.planGetir(id)'),'Okuma ve yazma canonical local-first servisten geçmeli.');
assert(gridSrc.includes("setAttribute('data-class-seating-overlay'"),'Geri tuşu (transport.back) katmanı tanıyabilmeli.');
const sw=fs.readFileSync('service-worker.js','utf8');
assert(sw.includes("'./js/modules/class-seating-grid.js?v=3'")&&sw.includes("'./js/modules/class-seating.js'"),'Yeni motor ve köprü offline kabukta olmalı.');
const css=fs.readFileSync('css/design-system-base.css','utf8');
const a=css.indexOf('SINIF OTURMA IZGARASI (js/modules/class-seating-grid.js)'),b=css.indexOf('/* ===== SINIFLAR — liste ve detay (kcl-*)');
assert(a>-1&&b>a,'Sınıf oturma ızgarası CSS bölümü olmalı.');
const section=css.slice(css.indexOf('\n',a),b);
assert(!/#[0-9a-fA-F]{3,8}\b/.test(section)&&!/rgba?\(\s*\d/.test(section),'Bölümde sabit renk olmamalı; yalnız tema belirteçleri.');
section.split('\n').filter(l=>/^[^\/@\s}]/.test(l)).forEach(l=>{if(!/^\.bsg-root/.test(l)&&!/^@keyframes csg-/.test(l))assert.fail('Kural .bsg-root altında olmalı: '+l.slice(0,70))});
console.log('class-seating-grid: OK');
