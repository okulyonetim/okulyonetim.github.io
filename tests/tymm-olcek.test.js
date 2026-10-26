const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

function load(files,extra={}){
  const win={console,...extra};
  win.window=win;
  win.globalThis=win;
  vm.createContext(win);
  for(const f of files)vm.runInContext(fs.readFileSync(f,'utf8'),win,{filename:f});
  return win;
}
const eq=(a,b,m)=>assert.strictEqual(JSON.stringify(a),JSON.stringify(b),m);

const w=load(['js/modules/tymm-olcek-core.js']);
const C=w.TymmCore;
assert(C,'TymmCore yüklenmeli.');

/* ── yıl, dönem, sınıf ── */
assert.strictEqual(C.schoolYear(new Date(2026,9,26)),'2026-2027');
assert.strictEqual(C.schoolYear(new Date(2027,2,5)),'2026-2027');
assert.strictEqual(C.currentTerm(new Date(2026,9,26)),1,'Ekim: 1. dönem.');
assert.strictEqual(C.currentTerm(new Date(2027,1,15)),2,'Şubat: 2. dönem.');
assert.strictEqual(C.currentTerm(new Date(2027,0,15)),1,'Ocak: hâlâ 1. dönem.');
assert.strictEqual(C.classGrade({ad:'4-A'}),4);
assert.strictEqual(C.classGrade({ad:'Mavi',seviye:'2'}),2,'Kademe bilgisi sınıf adından önce gelir.');
assert.strictEqual(C.isPrimary({ad:'4/B'}),true);
assert.strictEqual(C.isPrimary({ad:'5-A'}),false,'5. sınıf ilkokul ölçeğine girmez.');
assert.strictEqual(C.branchOf('3-C'),'C');
assert.strictEqual(C.branchOf('3. Sınıf'),'','Şube harfi yoksa boş.');
eq(C.sortStudents([{ogrenciAdi:'Zeynep',ogrenciNo:'12'},{ogrenciAdi:'Ali',ogrenciNo:'3'},{ogrenciAdi:'Ece'}]).map(s=>C.studentName(s)),['Ali','Zeynep','Ece'],'Numarası olanlar numara sırasıyla; numarasız en sonda ada göre.');

/* ── ortalama ve düzey: ondalık 0,5 ve üstü üst düzey ── */
const lv=(sum,count)=>C.level(sum,count);
assert.strictEqual(lv(5,2),3,'2,5 → 3');
assert.strictEqual(lv(7,3),2,'2,33 → 2');
assert.strictEqual(lv(8,3),3,'2,67 → 3');
assert.strictEqual(lv(3,2),2,'1,5 → 2');
assert.strictEqual(lv(7,2),4,'3,5 → 4');
assert.strictEqual(lv(4,4),1,'1,0 → 1');
assert.strictEqual(lv(16,4),4,'4,0 → 4');
assert.strictEqual(lv(0,0),0,'Puan yoksa düzey yok.');
assert.strictEqual(C.avgText(8,3),'2,67');
assert.strictEqual(C.avgText(5,2),'2,5');
assert.strictEqual(C.avgText(3,1),'3');
assert.strictEqual(C.avgText(0,0),'');
assert.strictEqual(C.levelName(4),'Çok İyi');

/* ── gerçek katalog ── */
const cat={};
for(const n of C.SINIFLAR){
  cat[n]=JSON.parse(fs.readFileSync(`data/tymm/${n}.json`,'utf8'));
  assert.strictEqual(cat[n].sinif,n);
  assert.strictEqual(cat[n].yil,'2026-2027');
}
const counts=n=>{const ders=C.coursesOf(cat[n],1);return{ders:ders.length,form:ders.reduce((a,d)=>a+d.formlar.length,0),olcut:ders.reduce((a,d)=>a+C.criteriaCount(d),0)}};
eq(counts(1),{ders:5,form:19,olcut:102},'1. sınıf');
eq(counts(2),{ders:6,form:21,olcut:155},'2. sınıf');
eq(counts(3),{ders:7,form:22,olcut:194},'3. sınıf');
eq(counts(4),{ders:11,form:38,olcut:207},'4. sınıf');

for(const n of C.SINIFLAR)for(const d of C.coursesOf(cat[n],1)){
  const keys=new Set();
  for(const f of d.formlar){
    assert(!keys.has(f.key),`${n}. sınıf ${d.ad}: form anahtarı tekrar ediyor (${f.key}).`);
    keys.add(f.key);
    assert(f.olcutler.length>0,`${n}. sınıf ${d.ad} ${f.key}: ölçüt yok.`);
    for(const o of f.olcutler){
      assert(o.kod&&o.metin&&o.metin.length>8,`${n}. sınıf ${d.ad} ${f.key}: boş ölçüt ${JSON.stringify(o)}`);
      assert(!/Ortalama Değerlendirme|Sınıf Öğretmeni|İmza:/.test(o.metin),`${n}. sınıf ${d.ad}: ölçüte tablo artığı karışmış: ${o.metin}`);
    }
    if(f.gruplar)assert.strictEqual(f.gruplar.reduce((a,g)=>a+g.say,0),f.olcutler.length,`${n}. sınıf ${d.ad} ${f.key}: grup toplamı ölçüt sayısına eşit olmalı.`);
    if(f.parca)assert(f.parca[0]>=1&&f.parca[0]<=f.parca[1],`${n}. sınıf ${d.ad} ${f.key}: parça numarası.`);
  }
}
/* Katalogda kişisel veri olmamalı (PDF'lerdeki öğretmen/öğrenci satırı). */
const hamKatalog=C.SINIFLAR.map(n=>fs.readFileSync(`data/tymm/${n}.json`,'utf8')).join('\n');
assert(!/Sedat|KARAGÖZ|Hasan|Sınıf Öğretmeni|KORUK/i.test(hamKatalog),'Katalog kişi/okul adı içermemeli.');

/* ── form başlıkları ── */
const muz1=C.courseOf(cat[1],1,'muzik');
eq(muz1.formlar.map(f=>f.key),['tema-1-p1','tema-1-p2'],'1. sınıf Müzik: Dinleme ile Söyleme-Hareket ayrı form.');
assert.strictEqual(C.printTitle(muz1.formlar[0]),'1. TEMA “MÜZİK DİLİ” – DİNLEME – GÖZLEM FORMU (1/2)');
assert.strictEqual(C.printTitle(muz1.formlar[1]),'1. TEMA “MÜZİK DİLİ” – SÖYLEME VE HAREKET – GÖZLEM FORMU (2/2)');
eq(C.formLabel(muz1.formlar[0]),{etiket:'1. Tema',ad:'MÜZİK DİLİ',parca:'Dinleme · 1/2',alt:''});
const mat1=C.courseOf(cat[1],1,'matematik');
assert.strictEqual(C.printTitle(mat1.formlar[0]),'“NESNELERİN GEOMETRİSİ (1)” TEMASI – GÖZLEM FORMU','Numarasız tema numara almaz.');
assert.strictEqual(C.formLabel(mat1.formlar[0]).etiket,'Tema');
const mat2=C.courseOf(cat[2],1,'matematik');
eq(mat2.formlar.map(f=>f.no),[4,4,1,1,3,3],'2. sınıf Matematik: tema numaraları PDF’teki gibi (4, 1, 3), her biri iki form.');
const mat4=C.courseOf(cat[4],1,'matematik');
assert.strictEqual(C.printTitle(mat4.formlar[0]),'1. KONU “DOĞAL SAYILAR” – GÖZLEM FORMU');
const muz4=C.courseOf(cat[4],1,'muzik');
assert.strictEqual(C.printTitle(muz4.formlar[2]),'D. ÖĞRENME ALANI “MÜZİK KÜLTÜRÜ” – GÖZLEM FORMU');
assert.strictEqual(C.formLabel(muz4.formlar[2]).etiket,'D. Öğrenme Alanı');
const hb1=C.courseOf(cat[1],1,'hayat-bilgisi');
assert.strictEqual(C.printTitle(hb1.formlar[3]),'4. ÜNİTE “YAŞADIĞIM YER VE ÜLKEM” – GÖZLEM FORMU (1. DÖNEMDE İŞLENEN BÖLÜM)');
const tr4=C.courseOf(cat[4],1,'turkce');
eq(tr4.formlar[0].gruplar.map(g=>g.ad),['DİNLEME/İZLEME','KONUŞMA','OKUMA','YAZMA'],'Türkçe formları öğrenme alanına göre gruplanır.');
assert.strictEqual(tr4.formlar[0].olcutler.length,12);
const ing4=C.courseOf(cat[4],1,'ingilizce');
assert.strictEqual(ing4.formlar[0].olcutler[0].kod,'E4.1.L1');

/* ── puan kaydı ── */
const ctx={sahipUid:'u1',sinifId:'c4a',sinifAd:'4-A',sinif:4,sube:'A',yil:'2026-2027',donem:1,ders:'turkce'};
let doc=C.blank(ctx);
assert.strictEqual(doc.id,'tymm.u1.c4a.2026-2027.1.turkce','Belge kimliği öğretmen, sınıf, yıl, dönem ve dersten türer; aynı kimlik tekrar belge açmaz.');
const f1=tr4.formlar[0];
assert.strictEqual(C.score(doc,f1,'o1',0),0);
C.setScore(doc,f1,'o1',0,3);C.setScore(doc,f1,'o1',5,4);
assert.strictEqual(doc.puanlar['tema-1'].o1,'300004000000','Her ölçüt tek hane.');
assert.strictEqual(C.score(doc,f1,'o1',5),4);
C.setScore(doc,f1,'o1',0,9);
assert.strictEqual(C.score(doc,f1,'o1',0),4,'Puan 4’ü aşamaz.');
C.setScore(doc,f1,'o1',99,3);
assert.strictEqual(doc.puanlar['tema-1'].o1.length,12,'Aralık dışı ölçüt yok sayılır.');
C.setScore(doc,f1,'o1',0,0);C.setScore(doc,f1,'o1',5,0);
assert.strictEqual(doc.puanlar['tema-1'],undefined,'Tüm puanlar silinince form kaydı da kalkar.');

C.fillRow(doc,f1,'o2',3);
assert.strictEqual(doc.puanlar['tema-1'].o2,'333333333333');
C.fillColumn(doc,f1,['o1','o2','o3'],2,1);
assert.strictEqual(C.score(doc,f1,'o1',2),1);assert.strictEqual(C.score(doc,f1,'o2',2),1);assert.strictEqual(C.score(doc,f1,'o3',2),1);
assert.strictEqual(C.score(doc,f1,'o2',3),3,'Sütun doldurma diğer ölçütlere dokunmaz.');
C.fillColumn(doc,f1,['o1','o2','o3'],2,0);
assert.strictEqual(doc.puanlar['tema-1'].o1,undefined,'Boşaltılan öğrenci kaydı silinir.');
assert.strictEqual(doc.puanlar['tema-1'].o2,'330333333333');
C.clearForm(doc,f1,['o2']);
assert.strictEqual(doc.puanlar['tema-1'],undefined);

/* ── özet ── */
doc=C.blank(ctx);
const f2=C.courseOf(cat[4],1,'ingilizce').formlar[1]; // 4 ölçüt
C.setScore(doc,f2,'o1',0,3);C.setScore(doc,f2,'o1',1,2);
let s=C.rowSummary(doc,f2,'o1');
assert.strictEqual(s.dolu,2);assert.strictEqual(s.toplam,4);assert.strictEqual(s.tam,false);
assert.strictEqual(s.ortMetin,'2,5');assert.strictEqual(s.duzey,3);assert.strictEqual(s.duzeyAd,'İyi');
C.setScore(doc,f2,'o1',2,2);C.setScore(doc,f2,'o1',3,2);
s=C.rowSummary(doc,f2,'o1');
assert.strictEqual(s.tam,true);assert.strictEqual(s.ortMetin,'2,25');assert.strictEqual(s.duzey,2,'2,25 → Yeterli.');
s=C.rowSummary(doc,f2,'yok');
assert.strictEqual(s.dolu,0);assert.strictEqual(s.duzey,0);assert.strictEqual(s.ortMetin,'');
eq(C.formProgress(doc,f2,['o1','o2']),{dolu:4,toplam:8});
const ders=C.courseOf(cat[4],1,'ingilizce');
eq(C.courseProgress(doc,ders,['o1']),{dolu:4,toplam:24,yuzde:17});
const col=C.columnAverage(doc,f2,['o1','o2'],0);
assert.strictEqual(col.ortMetin,'3');assert.strictEqual(col.say,1);

/* ── kayıt temizliği (eski/bozuk veri) ── */
const raw={id:doc.id,sahipUid:'u1',sinifId:'c4a',sinifAd:'4-A',sinif:4,sube:'A',yil:'2026-2027',donem:1,ders:'ingilizce',
 puanlar:{'unite-2':{o1:'3x2',o2:'0000',o3:'91234999'},'yok-form':{o1:'4444'}}};
const n=C.normalize(raw,ders);
assert.strictEqual(n.puanlar['unite-2'].o1,'3020','Geçersiz haneler 0 olur, uzunluk ölçüt sayısına tamamlanır.');
assert.strictEqual(n.puanlar['unite-2'].o2,undefined,'Hiç puanı olmayan öğrenci kaydedilmez.');
assert.strictEqual(n.puanlar['unite-2'].o3,'0123','Fazla haneler kesilir, geçersiz hane yerinde 0 olur.');
assert.strictEqual(n.puanlar['yok-form'],undefined,'Katalogda olmayan form atılır.');
assert.strictEqual(n.id,doc.id,'Kimlik korunur.');

/* ── yazdırma çıktısı ── */
const wp=load(['js/modules/tymm-olcek-core.js','js/modules/tymm-olcek-print.js']);
const P=wp.TymmPrint,K=wp.TymmCore;
assert(P,'TymmPrint yüklenmeli.');
const ogrenciler=Array.from({length:3},(_,i)=>({id:'o'+i,ogrenciAdi:'Öğrenci '+(i+1),ogrenciNo:String(10+i)}));
const printForm=K.courseOf(cat[4],1,'turkce').formlar[0];
const printDoc=K.blank({sahipUid:'u1',sinifId:'c4a',sinifAd:'4-A',sinif:4,sube:'A',yil:'2026-2027',donem:1,ders:'turkce'});
K.fillRow(printDoc,printForm,'o0',3);K.setScore(printDoc,printForm,'o0',0,4);
const pc={formlar:[printForm,K.courseOf(cat[4],1,'turkce').formlar[1]],doc:printDoc,ogrenciler,okul:'Örnek İlkokulu',ilce:'Merkez',mudur:'Ali Veli',ogretmen:'Ayşe Öğretmen',yil:'2026-2027',donem:1,sinifAd:'4-A',sinif:4,sube:'A',ders:'Türkçe'};
const ph=P.html(pc);
assert.strictEqual((ph.match(/<section class="tm-page">/g)||[]).length,2,'Her form ayrı sayfada başlar.');
assert(ph.includes('MERKEZ KAYMAKAMLIĞI')&&ph.includes('ÖRNEK İLKOKULU MÜDÜRLÜĞÜ'),'Üst yazı ilçe ve okul adını büyük harfle yazar.');
assert(ph.includes('2026-2027 EĞİTİM ÖĞRETİM YILI 1. DÖNEM')&&ph.includes('4/A SINIFI TÜRKÇE DERSİ'),'Dönem ve sınıf satırları.');
assert(ph.includes('1. TEMA “OKUMA KÜLTÜRÜ” – GÖZLEM FORMU'),'Form başlığı MEB yazımıyla.');
assert(ph.includes('Ortalamanın ondalığı 0,5 ve üstüyse üst düzey'),'Açıklama satırı.');
assert.strictEqual((ph.match(/<th class="tm-oc">/g)||[]).length,24,'Her ölçüt başlıkta (12 + 12).');
assert(ph.includes('<th colspan="3">DİNLEME/İZLEME</th>'),'Türkçe grup başlıkları ölçüt sayısı kadar sütun kaplar.');
assert(ph.includes('<td class="tm-ad">Öğrenci 1</td>'),'Öğrenci adı satırda.');
assert(/<td class="tm-p">3,08<\/td><td class="tm-p">İyi<\/td>/.test(ph),'Ortalama ve düzey satırda: (4 + 3×11) / 12 = 3,08 → İyi.');
assert(ph.includes('Ayşe Öğretmen')&&ph.includes('Ali Veli')&&ph.includes('UYGUNDUR'),'İmza bölümü öğretmen ve müdürü yazar.');
const bos=P.html({...pc,okul:'',ilce:'',mudur:'',ogretmen:'',formlar:[printForm]});
assert(bos.includes('…… KAYMAKAMLIĞI')||bos.includes('…………………… KAYMAKAMLIĞI'),'İlçe boşsa noktalı yer tutucu.');
assert(!/>undefined<|>null</.test(bos),'Boş bilgilerde undefined/null yazılmaz.');
assert.strictEqual(P.dosyaAdi(pc),'TYMM_4-A_Türkçe_1_Donem','Dosya adı.');
const xss=P.html({...pc,okul:'<img src=x onerror=1>',formlar:[printForm],ogrenciler:[{id:'x',ogrenciAdi:'<b>Ad</b>',ogrenciNo:'1'}]});
assert(!xss.includes('<img src=x')&&!xss.includes('<b>Ad</b>'),'Çıktıdaki metinler kaçışlanır.');

/* ── uygulamaya bağlantılar ── */
const rd=f=>fs.readFileSync(f,'utf8');
assert(/tymmOlcekleri:'oy_tymmOlcekleri'/.test(rd('js/firebase-init.js')),'Koleksiyon COL içinde kayıtlı.');
assert(/DELTA_EXCLUDED_TYPES=new Set\([^)]*'tymmOlcekleri'/.test(rd('js/core/core.js')),'Kişisel koleksiyon delta eşitlemesinden hariç.');
const rules=rd('firestore.rules'),m=rules.match(/match \/oy_tymmOlcekleri\/\{id\} \{[\s\S]*?\n    \}/);
assert(m&&/resource\.data\.sahipUid == request\.auth\.uid/.test(m[0])&&/request\.resource\.data\.sahipUid == request\.auth\.uid/.test(m[0]),'Kural: yalnız sahibi okur/yazar.');
assert(!/allow (read|write|create|update|delete)[^;]*: if (true|girisYapmis\(\));/.test(m[0]),'Kural herkese açık değil.');
const nav=rd('js/core/app-nav.js');
assert(/\['tymm-olcek','TYMM İlkokul Ölçekleri','ruler','blue',[^\]]*'tymm-olcek'\]/.test(nav),'Araç kataloğunda.');
assert((nav.match(/'tymm-olcek'\]/g)||[]).length>=1&&/'rubric','project','tymm-olcek'\]/.test(nav)&&/'bep-hazirla','tymm-olcek'\]/.test(nav),'Öğretmen ve idareci menülerinde.');
const shell=rd('js/core/shell-ui.js');
assert(/name==='tymm-olcek'/.test(shell)&&/js\/modules\/tymm-olcek\.js/.test(shell)&&/TymmModule\.open\(\)/.test(shell),'Shell yönlendirmesi.');
const sw=rd('service-worker.js');
for(const f of ['tymm-olcek.js','tymm-olcek-core.js','tymm-olcek-print.js','data/tymm/1.json','data/tymm/2.json','data/tymm/3.json','data/tymm/4.json'])assert(sw.includes("'./"+(f.startsWith('data')?f:'js/modules/'+f)+"'"),'Çevrimdışı önbellekte: '+f);
const mod=rd('js/modules/tymm-olcek.js');
assert(!/localStorage\.setItem/.test(mod),'Modül doğrudan localStorage yazmaz (KaPrefs kullanır).');
assert(/SE\.register\(T,col,\{query:q=>!u\.uid\?q:q\.where\('sahipUid','==',u\.uid\)\}\)/.test(mod),'Eşitleme yalnız kullanıcının kendi belgelerini çeker.');

console.log('tymm-olcek core testleri geçti.');
