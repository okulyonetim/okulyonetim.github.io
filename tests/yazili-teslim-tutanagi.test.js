/* Yazılı Kâğıdı Teslim Tutanağı: mantık, belge gövdesi ve uygulama bağlantıları */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');
const coreSrc=read('js/modules/yazili-teslim-core.js'),uiSrc=read('js/modules/yazili-teslim.js'),nav=read('js/core/app-nav.js'),shell=read('js/core/shell-ui.js'),katalog=read('js/modules/evrak-katalog.js'),academic=read('js/modules/academic.js'),sw=read('service-worker.js'),css=read('css/design-system-base.css');
const ctx={console};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(coreSrc,ctx);
const C=ctx.YaziliTeslimCore,J=x=>JSON.parse(JSON.stringify(x));
new Function(uiSrc);

/* yazıyla sayı */
const yaz=[[0,'sıfır'],[1,'bir'],[7,'yedi'],[10,'on'],[12,'on iki'],[20,'yirmi'],[45,'kırk beş'],[100,'yüz'],[115,'yüz on beş'],[200,'iki yüz'],[999,'dokuz yüz doksan dokuz'],[1000,'bin'],[1500,'bin beş yüz'],[2000,'iki bin'],[-3,'sıfır'],['abc','sıfır']];
yaz.forEach(([n,t])=>assert.strictEqual(C.sayiYazi(n),t,`sayiYazi(${n})`));
assert.deepStrictEqual(J(['',' ','abc','-2','3','3,9','2.5','1500'].map(C.topSayisi)),[0,0,0,0,3,3,2,999],'Top sayısı 0–999 tam sayı.');
assert.deepStrictEqual(J(C.toplamlar([{d1:'2',d2:'3'},{d1:'1',d2:''},{d1:'x',d2:'4'}])),{d1:3,d2:7,toplam:10},'Toplamlar.');
assert.deepStrictEqual(J(C.toplamlar(null)),{d1:0,d2:0,toplam:0});

/* yazılı sınav kayıtlarından satırlar */
const sinavlar=[
 {id:'a',ogretmenId:'t1',ders:'Matematik',siniflar:'5-A, 5-B',donem:'1. Dönem',yaziliSirasi:'1. Yazılı'},
 {id:'b',ogretmenId:'t1',ders:'Matematik',siniflar:'5-A',donem:'1. Dönem',yaziliSirasi:'2. Yazılı'},
 {id:'c',ogretmenId:'t1',ders:'Matematik',siniflar:'5-A',donem:'2. Dönem',yaziliSirasi:'1. Yazılı'},
 {id:'d',ogretmenId:'t2',ders:'Türkçe',siniflar:'5-A',donem:'1. Dönem'},
 {id:'e',ogretmenId:'t1',ders:'Fen Bilimleri',sinif:'10-A',donem:'2. Dönem'},
 {id:'f',ogretmenId:'t1',ders:'',siniflar:'5-A',donem:'1. Dönem'},
 {id:'g',ogretmenId:'t1',ders:'Müzik',siniflar:'5-A',donem:''},
 null
];
assert.deepStrictEqual(JSON.parse(JSON.stringify(C.sinavSatirlari(sinavlar,'t1'))),[
 {sinif:'5-A',ders:'Matematik',d1:2,d2:1},
 {sinif:'5-B',ders:'Matematik',d1:1,d2:0},
 {sinif:'10-A',ders:'Fen Bilimleri',d1:0,d2:1}
],'Her sınav, her sınıf için bir top; sınıflar sayısal sırada; başka öğretmen / dersi / dönemi olmayan kayıt dışarıda.');
assert.deepStrictEqual(J(C.sinavSatirlari(sinavlar,'t2').map(r=>r.ders)),['Türkçe']);
assert.deepStrictEqual(J(C.sinavSatirlari(sinavlar,'')),[],'Öğretmen seçilmediyse satır üretilmez.');
assert.deepStrictEqual(J(C.sinavSatirlari(null,'t1')),[]);

/* metin biçimleri */
assert.strictEqual(C.tarihMetni('2026-10-28'),'28.10.2026');
assert.strictEqual(C.tarihMetni(''),'………………');
assert.strictEqual(C.muhatap('Koruk İlk - Ortaokulu'),'KORUK İLK - ORTAOKULU MÜDÜRLÜĞÜNE');
assert.strictEqual(C.muhatap('Koruk İlkokulu Müdürlüğü'),'KORUK İLKOKULU MÜDÜRLÜĞÜNE','Müdürlüğü yinelenmez.');
assert.strictEqual(C.muhatap(''),'……………………… MÜDÜRLÜĞÜNE');
assert.strictEqual(C.gorevMetni('Matematik'),'Matematik Öğretmeni');
assert.strictEqual(C.gorevMetni('Sınıf Öğretmeni'),'Sınıf Öğretmeni');
assert.strictEqual(C.gorevMetni(''),'……………… Öğretmeni');

/* belge */
const m={okul:'Koruk İlk - Ortaokulu',yil:'2026-2027',belgeTarihi:'2026-10-28',ogretmen:'Ayşe KAYA',brans:'Matematik',teslimAlan:'Mehmet DEMİR',teslimUnvan:'Müdür Yardımcısı',teslimTarihi:'2026-10-29',
 satirlar:[{sinif:'5-A',ders:'Matematik',d1:'2',d2:'1'},{sinif:'5-B',ders:'Fen <b>x</b>',d1:'1',d2:''}]};
const h=C.belge(m);
['YAZILI KÂĞIDI TESLİM TUTANAĞI','KORUK İLK - ORTAOKULU MÜDÜRLÜĞÜNE','2026-2027 Eğitim-Öğretim yılı içerisinde okutmuş olduğum derslerden yapmış olduğum yazılı sınavlarına ait sınav kâğıtlarının teslim alınması için;','Gereğini bilgilerinize arz ederim.','1. Dönem Yazılı Kâğıdı<br>(Top Sayısı)','2. Dönem Yazılı Kâğıdı','Toplam Yazılı Kâğıdı','Dersin Adı','Sıra<br>No','TOPLAM','Teslim Eden','Teslim Alan','Ayşe KAYA','Matematik Öğretmeni','Mehmet DEMİR','Müdür Yardımcısı','28.10.2026','29.10.2026'].forEach(t=>assert(h.includes(t),'Belgede olmalı: '+t));
assert(h.includes('Toplam <b>4</b> (dört) top sınav kâğıdı teslim edilmiştir.'),'Toplam rakam ve yazıyla.');
assert(/<tr class="ytt-toplam"><td colspan="3" class="ytt-sag">TOPLAM<\/td><td class="ytt-orta">3<\/td><td class="ytt-orta">1<\/td><td class="ytt-orta">4<\/td><\/tr>/.test(h),'Toplam satırı: 1. dönem 3, 2. dönem 1, genel 4.');
assert(h.includes('Fen &lt;b&gt;x&lt;/b&gt;')&&!h.includes('<b>x</b>'),'Metinler kaçışlanır.');
assert(!/undefined|NaN|\[object/.test(h),'Çıktıda artık değer yok.');
assert((h.match(/<tbody>[\s\S]*<\/tbody>/)[0].match(/<tr/g)||[]).length===2+1+1,'İki veri satırı, bir boş satır (en az 3) ve toplam satırı.');
assert(h.indexOf('ytt-baslik')<h.indexOf('ytt-muhatap')&&h.indexOf('ytt-basvuru')<h.indexOf('<table')&&h.indexOf('</table>')<h.indexOf('ytt-ozet')&&h.indexOf('ytt-ozet')<h.indexOf('ytt-imzalar'),'Sıra: başlık, muhatap, başvuru imzası, tablo, özet, teslim imzaları.');
assert(h.indexOf('Teslim Eden')<h.indexOf('Teslim Alan'),'Teslim eden solda, teslim alan sağda.');
const bos=C.belge({});
assert(bos.includes('Toplam <b>………</b> (…………………) top sınav kâğıdı teslim edilmiştir.'),'Boş formda noktalı özet.');
assert((bos.match(/<tbody>[\s\S]*<\/tbody>/)[0].match(/<tr/g)||[]).length===3+1,'Boş formda 3 boş satır + toplam satırı.');
assert(!/<td class="ytt-orta">0<\/td>/.test(bos),'Boş formda 0 yazılmaz.');
assert(bos.includes('……………… Öğretmeni')&&bos.includes('……………………… MÜDÜRLÜĞÜNE'),'Eksik bilgiler noktalı kalır.');
const cok=C.belge({satirlar:Array.from({length:30},(_,i)=>({sinif:'5-A',ders:'D'+i,d1:'1',d2:'1'}))});
assert(cok.includes('Toplam <b>60</b> (altmış) top'),'Çok satırda toplam ve yazıyla.');
assert(!/<tr><td class="ytt-orta">31<\/td><td><\/td>/.test(cok),'Yeterli satır varsa boş satır eklenmez.');

/* uygulama bağlantıları */
assert(/\['yazili-teslim','Yazılı Kâğıdı Teslim Tutanağı','doc'[^\]]*'yazili-teslim'\]/.test(nav),'Tutanak ve Evrak menüsünde yer almalı.');
assert(nav.includes("'yazili-teslim':'📦'")&&nav.includes("'yazili-teslim':'yazılı kağıdı"),'Simge ve arama anahtar sözcükleri.');
assert(/if\(name==='yazili-teslim'\)\{[\s\S]*?YaziliTeslimModule\.open\(\)/.test(shell)&&shell.includes("yazili-teslim-core.js?v=1")&&shell.includes("yazili-teslim.js?v=1"),'Rota modülü yükleyip açmalı.');
assert((katalog.match(/\{f:\["yazili-teslim"\],a:"yazili-teslim"\}/g)||[]).length===3,'Öğretmen Dosyası’ndaki üç yazılı kâğıdı maddesi sayfaya bağlanmalı.');
assert(academic.includes('data-written-teslim>Teslim Tutanağı</button>')&&/AppNav\?\.tool\?\.\('yazili-teslim'\)/.test(academic),'Yazılı Sınavlar sayfasında Teslim Tutanağı düğmesi.');
assert(sw.includes('yazili-teslim-core.js?v=1')&&sw.includes('yazili-teslim.js?v=1'),'Önbelleğe alınmalı.');
assert(!/localStorage\.setItem/.test(coreSrc+uiSrc)&&!/<style/i.test(coreSrc+uiSrc)&&!/style="/.test(coreSrc+uiSrc),'Modül depolama yazmaz, stil gömmez.');
/* yazdırma: her sayfada üst/alt boşluk, özelleştirme penceresi açılmaz (resmî form) */
const yz=uiSrc.slice(uiSrc.indexOf('function yazdir('),uiSrc.indexOf('function temizle('));
assert(/kenarBosluk:10/.test(yz)&&/akis:true/.test(yz)&&/yon:'dikey'/.test(yz)&&/ozellestirilebilir:false/.test(yz),'Çıktı 10 mm boşluklu akış kipinde, özelleştirmesiz basılır.');
/* CSS */
const ytt=css.slice(css.indexOf('/* ===== A4 — Yazılı Kâğıdı Teslim Tutanağı (.ytt-*)'));
const pxSiz=ytt.replace(/@media\([^)]*\)\{[\s\S]*?\n\}/g,'');
assert(!/\d(?:\.\d+)?px/.test(pxSiz)&&!/#[0-9a-fA-F]{3,8}\b/.test(ytt),'Stiller sabit px / renk içermemeli (px yalnız @media).');
assert(/\.ytt-imzalar\{[^}]*justify-content:space-between/.test(ytt)&&/\.ytt-imza\{[^}]*align-items:center[^}]*text-align:center/.test(ytt),'Teslim eden / teslim alan blokları iki uçta, yazılar blok içinde ortalı.');
assert(/\.ytt-baslik\{[^}]*text-align:center/.test(ytt)&&/\.ytt-basvuru\{[^}]*justify-content:flex-end/.test(ytt),'Başlık ortada, başvuru imzası sağda.');
assert(/\.ytt-tablo thead\{display:table-header-group\}/.test(ytt),'Başlık satırı her sayfada tekrarlanır.');
console.log('yazili-teslim-tutanagi: OK');
