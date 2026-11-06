/* Ortak Sınavlar: resmî metinler, belge gövdeleri, açılır listeler ve uygulama bağlantıları */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');
const coreSrc=read('js/modules/ortak-sinav-core.js'),uiSrc=read('js/modules/ortak-sinav.js'),nav=read('js/core/app-nav.js'),shell=read('js/core/shell-ui.js'),sw=read('service-worker.js'),css=read('css/design-system-base.css'),loader=read('js/app-loader.js');
const J=x=>JSON.parse(JSON.stringify(x));

/* ── çekirdek: resmî metinler ── */
const ctx={console};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(coreSrc,ctx);
const C=ctx.OrtakSinavCore;
assert.strictEqual(C.GOREVLER.length,14,'Okulun belgesinde 14 görev maddesi var (a–k, Türkçe harf sırasıyla).');
assert.strictEqual(C.HARFLER.slice(0,14).join(''),'abcçdefgğhıijk','Madde harfleri Türk alfabesi sırasında.');
assert.strictEqual(C.KURALLAR.length,6,'Sınavda uyulması gereken 6 kural.');
assert(C.GOREVLER[0].startsWith('Ortak yazılı sınavlar öncesinde okul müdürü tarafından')&&C.GOREVLER[13].includes('“GİRDİ”')&&C.GOREVLER[13].includes('“GİRMEDİ”'),'Görev metinleri belgeden alınmış.');
assert(C.KURALLAR[0].includes('Sınav süresi 40 dakikadır.')&&C.KURALLAR[5].includes('ilgili Yönetmelik’e göre işlem yapılacaktır.'),'Kural metinleri belgeden alınmış.');
const g=C.gorevlerBelgesi({});
assert(g.includes('GÖREVLİ/GÖZETMEN ÖĞRETMENLERİN YAPACAĞI İŞ VE İŞLEMLER')&&g.includes('SINAVLARDA UYULMASI GEREKEN KURALLAR')&&g.includes('ORTAK YAZILI SINAVLARDA UYULMASI GEREKEN KURALLAR')&&g.includes('(Öğretmen tarafından sınav öncesinde sınıfta okunacaktır.)'),'Başlıklar belgedeki gibi.');
assert(g.includes('<span class="osn-no">ğ)</span>')&&g.includes('<span class="osn-no">ı)</span>')&&g.includes('<span class="osn-no">k)</span>')&&g.includes('<span class="osn-no">6)</span>'),'Harf ve numara işaretleri.');
assert.deepStrictEqual(J(C.temizListe(['a',' ','',null,' b '],C.GOREVLER)),['a','b'],'Boş maddeler çıktıya girmez.');
assert.deepStrictEqual(J(C.temizListe(undefined,['x'])),['x'],'Liste yoksa resmî metin kullanılır.');

/* ── tebliğ ── */
assert.strictEqual(C.tebligCumlesi({sinavTarihi:'2026-06-02',sinif:'7. Sınıf',ders:'Matematik',kapsam:'ülke'}),'02.06.2026 tarihinde yapılacak olan 7. Sınıf Matematik dersi ülke geneli ortak yazılı sınavına gözetmen öğretmen olarak görevlendirildiniz.','Tebliğ cümlesi okulun örneğiyle aynı.');
assert(C.tebligCumlesi({kapsam:'İlçe'}).includes('ilçe geneli')&&C.tebligCumlesi({kapsam:'saçma'}).includes('ülke geneli'),'Kapsam: ülke / il / ilçe / okul; bilinmeyen değer ülke.');
const t=C.gorevlendirmeBelgesi({ustBaslik1:'ELAZIĞ VALİLİĞİ',ustBaslik2:'İl Millî Eğitim Müdürlüğü',okul:'Koruk Ortaokulu',belgeTarihi:'2026-06-02',ogretmen:'Veysel Karani GÜL',sinif:'7. Sınıf',ders:'Matematik',kapsam:'ülke',sinavTarihi:'2026-06-02',tebligEden:'Sedat KARAGÖZ',tebligUnvan:'Tebliğ Eden Mdr Yrd'});
['T.C.','ELAZIĞ VALİLİĞİ','İl Millî Eğitim Müdürlüğü','Koruk Ortaokulu','Konu : Görevlendirme Tebliği','02/06/2026','Sn: Veysel Karani GÜL','Okudum','Gereğini bilgilerinize rica ederim.','Sedat KARAGÖZ','Tebliğ Eden Mdr Yrd','Gözetmen Öğretmenin Görevleri'].forEach(x=>assert(t.includes(x),`Tebliğde "${x}" olmalı.`));
assert(t.includes('src="assets/logo.png"'),'Okul logosu belgenin başında.');
assert(!C.gorevlendirmeBelgesi({ek:''}).includes('osn-ek'),'Ek boşsa yazılmaz.');
const tb=C.gorevlendirmeBelgesi({});
assert(tb.includes('…………………………………………')&&tb.includes('Tebliğ Eden Mdr Yrd'),'Boş tebliğde alanlar noktalı kalır.');
const xss=C.gorevlendirmeBelgesi({ogretmen:'<img src=x onerror=alert(1)>'});
assert(!xss.includes('<img src=x')&&xss.includes('&lt;img'),'Kullanıcı girdisi kaçışlanır.');

/* ── tutanak ── */
assert.strictEqual(C.sinavAdi({kapsam:'ülke',ders:'Matematik',donem:'2',sinavNo:'1'}),'ÜLKE GENELİ MATEMATİK DERSİ 2. DÖNEM 1. ORTAK YAZILI SINAVI','Sınav adı alanlardan yazılır.');
assert(C.sinavAdi({}).includes('GENELİ')&&C.sinavAdi({}).includes('ORTAK YAZILI SINAVI')&&C.sinavAdi({}).includes('…'),'Boşken noktalı şablon.');
assert.strictEqual(C.sinavAdi({sinavAdi:'  Özel ad '}),'Özel ad','Elle yazılan sınav adı önceliklidir.');
assert.strictEqual(C.sinavYeriMetni('7/a'),'7/A SINIFI');assert.strictEqual(C.sinavYeriMetni('7/A sınıfı'),'7/A SINIFI');assert.strictEqual(C.sinavYeriMetni(''),'…./A SINIFI');
const tut=C.tutanakBelgesi({okul:'Koruk Ortaokulu',kapsam:'ülke',ders:'Matematik',donem:'2',sinavNo:'1',sinavYeri:'7/A',tarih:'2026-06-02',saat:'10:00',onceKitapcik:'28',onceTeslimEden:'Sedat KARAGÖZ',onceTeslimAlan:'Veysel Karani GÜL',olumsuzlukYok:true,katilan:'27',eksiksiz:true,gozetmenAd:'Veysel Karani',gozetmenSoyad:'GÜL',sonraKitapcik:'28',sonraTeslimEden:'Veysel Karani GÜL',sonraTeslimAlan:'Sedat KARAGÖZ'});
['KORUK ORTAOKULU','ORTAK SINAV EVRAKI TESLİM TUTANAĞI','Sınav Adı','Sınav Yeri','Tarih ve Saat','02/06/2026','10 : 00','Sınav öncesinde sınav evrakı koordinatörlükten alınırken aşağıdaki kısım doldurulacaktır.','Soru Kitapçığı: 28 adet','Diğer (belirtiniz): Gözetmen Öğretmenin Görevleri','Teslim Eden','Teslim Alan','Sınav sırasında gözlenen olumsuzlukları ayrıntılı olarak belirtiniz (varsa).','İmza:','Sınav esnasında sınav ortamını bozan herhangi bir olumsuzluk yaşanmamıştır.','Sınava 27 kişi katılmıştır. Soru kitapçıkları eksiksiz alınmıştır.','Gözetmen','Sınav sonrasında sınav evrakı koordinatörlüğe teslim edilirken aşağıdaki kısım doldurulacaktır.','Sedat KARAGÖZ','Veysel Karani GÜL'].forEach(x=>assert(tut.includes(x),`Tutanakta "${x}" olmalı.`));
assert((tut.match(/osn-kutu--secili/g)||[]).length===2,'İki onay kutusu işaretli.');
const tutBos=C.tutanakBelgesi({});
assert(!tutBos.includes('osn-kutu--secili')&&tutBos.includes('……. adet')&&tutBos.includes('Sınava ….. kişi katılmıştır.'),'Boş tutanakta kutular boş, alanlar noktalı.');
assert(C.tutanakBelgesi({olumsuzluk:'<b>x</b>'}).includes('&lt;b&gt;x&lt;/b&gt;'),'Olumsuzluk metni kaçışlanır.');
assert.strictEqual(C.tarihEgik('2026-06-02'),'02/06/2026');assert.strictEqual(C.tarihNokta('2026-06-02'),'02.06.2026');assert.strictEqual(C.tarihEgik('x','-'),'-');assert.strictEqual(C.saatMetni('9:05'),'09 : 05');assert.strictEqual(C.saatMetni('','…'),'…');

/* ── ekran: açılır listeler uygulama verisinden ── */
const veri={
 ogretmenler:[{id:'t2',ad:'Zeynep',soyad:'Demir',brans:'Fen Bilimleri',aktif:true},{id:'t1',ad:'ayşe',soyad:'kaya',brans:'Matematik'},{id:'t3',ad:'Pasif',soyad:'Kişi',brans:'Türkçe',aktif:false}],
 dersListesi:[{ad:'Türkçe'},{ad:'Matematik'},{ad:'Fen Bilimleri'},{ad:'Matematik'}],
 siniflar:[{id:'c1',ad:'7-A'},{id:'c2',ad:'8-B'},{id:'c3',ad:'7-B'}],
 okulBilgileri:[{id:'ayarlar',okulAdi:'Koruk Ortaokulu',il:'Elazığ'}]
};
let acik=null;const yazdirildi=[];
const oturum={admin:true,bagliOgretmenId:'t1'};
const ui={console,Date,JSON,Promise,Array,Set,Map,String,Number,RegExp,Object};ui.window=ui;
ui.AppStore={data:k=>veri[k],get:k=>k==='session.user'?oturum:undefined,subscribe:()=>()=>{}};
ui.PermissionService={isManager:()=>false};
ui.document={getElementById:()=>acik,querySelector:()=>null};
ui.ReportEngine={printReport:(...a)=>yazdirildi.push(a),schoolInfo:()=>({okulAdi:'Koruk Ortaokulu'})};
vm.createContext(ui);
vm.runInContext(read('js/modules/sinif-baglam.js'),ui);
vm.runInContext(coreSrc,ui);
vm.runInContext(uiSrc,ui);
const M=ui.OrtakSinavModule;
const kok={innerHTML:'',querySelectorAll:()=>[],querySelector:()=>null,contains:()=>false};acik=kok;
assert.strictEqual(M.open('teblig'),true,'Tebliğ sayfası açılır.');
let h=kok.innerHTML;
assert(h.includes('data-osn-page="teblig"')&&h.includes('<h2>Ortak Sınav Görevlendirme Tebliği</h2>'),'Sayfa başlığı.');
const secenekler=(h,alan)=>{const m=new RegExp(`<select class="ka-select" data-osn="${alan}">([\\s\\S]*?)</select>`).exec(h);return m?[...m[1].matchAll(/<option value="([^"]*)"[^>]*>([^<]*)</g)].map(x=>[x[1],x[2]]):null};
const og=secenekler(h,'teblig.ogretmenId');
assert.deepStrictEqual(J(og.map(x=>x[0])),['','t1','t2'],'Öğretmen listesi ogretmenler verisinden; pasif öğretmen yok, ada göre sıralı.');
assert(og[1][1].startsWith('Ayşe KAYA')&&og[1][1].includes('(Matematik)'),'Ad biçimi ve branş gösterilir.');
assert.deepStrictEqual(J(secenekler(h,'teblig.ders').map(x=>x[1])),['— Seçin —','Fen Bilimleri','Matematik','Türkçe'],'Ders listesi dersListesi verisinden, tekrarsız ve sıralı.');
assert.deepStrictEqual(J(secenekler(h,'teblig.sinif').map(x=>x[1])),['— Seçin —','7. Sınıf','8. Sınıf'],'Sınıf düzeyleri sınıf kayıtlarından.');
assert(h.includes('value="ELAZIĞ VALİLİĞİ"')&&h.includes('value="Koruk Ortaokulu"'),'Makam ve okul adı okul kaydından gelir.');
/* öğretmen seçilince ad ve (listede varsa) branş dersi dolar */
assert.strictEqual(M.degistir('teblig.ogretmenId','t2'),true);
M.open('teblig');h=kok.innerHTML;
assert(h.includes('value="Zeynep DEMİR"'),'Öğretmen adı alana yazılır.');
assert(/<option value="Fen Bilimleri" selected>/.test(h),'Ders boşsa öğretmenin branşı seçilir.');
M.degistir('teblig.ders','Türkçe');M.degistir('teblig.ogretmenId','t1');M.open('teblig');
assert(/<option value="Türkçe" selected>/.test(kok.innerHTML),'Seçili ders başka öğretmen seçilince değişmez.');
/* gözetmen görevleri sayfası */
M.open('gorevler');h=kok.innerHTML;
assert(h.includes('data-osn-page="gorevler"')&&(h.match(/data-osn-madde="gorevler"/g)||[]).length===14&&(h.match(/data-osn-madde="kurallar"/g)||[]).length===6,'14 görev ve 6 kural düzenlenebilir.');
/* tutanak sayfası — yönetici: koordinatör kendisi (teslim eden / teslim alan), gözetmeni listeden seçer */
M.reset();M.open('tutanak');h=kok.innerHTML;
assert(h.includes('data-osn-page="tutanak"'),'Tutanak sayfası açılır.');
assert(secenekler(h,'tutanak.gozetmenId').length===3&&secenekler(h,'tutanak.ders').length===4,'Tutanakta da öğretmen ve ders listeleri uygulama verisinden.');
assert(h.includes('list="osnSiniflar"')&&h.includes('<option value="7-A">')&&h.includes('<option value="8-B">'),'Sınav yeri sınıf kayıtlarından önerilir.');
assert(/<td class="osn-imza-hucre"><b>Teslim Eden<\/b><span>Ayşe KAYA<\/span>/.test(M.belge().govde),'Yönetici hesabında evrakı veren koordinatör kendisidir.');
assert(!h.includes('value="KAYA"'),'Yöneticide gözetmen önceden seçilmez.');
M.degistir('tutanak.gozetmenId','t2');M.open('tutanak');
let b=M.belge().govde;
assert(/<td>Zeynep<\/td><td>DEMİR<\/td>/.test(b)&&/Teslim Alan<\/b><span>Zeynep DEMİR<\/span>/.test(b)&&/Teslim Eden<\/b><span>Zeynep DEMİR<\/span>/.test(b),'Gözetmen seçilince ad, soyad ve teslim alan / teslim eden dolar.');
M.degistir('tutanak.onceTeslimAlan','Elle Yazılan');
assert(M.belge().govde.includes('Elle Yazılan'),'Doldurulan alan elle değiştirilebilir.');
/* tutanak sayfası — öğretmen hesabı: gözetmen kendisidir */
oturum.admin=false;M.reset();M.open('tutanak');h=kok.innerHTML;
assert(h.includes('value="Ayşe"')&&h.includes('value="KAYA"'),'Öğretmen hesabında gözetmen adı ve soyadı hesaptaki öğretmenden gelir.');
b=M.belge().govde;
assert(/Teslim Alan<\/b><span>Ayşe KAYA<\/span>/.test(b)&&/Teslim Eden<\/b><span>Ayşe KAYA<\/span>/.test(b),'Gözetmen hem evrakı alan hem teslim eden olarak yazılır.');
assert(!/<td class="osn-imza-hucre"><b>Teslim Eden<\/b><span>Ayşe KAYA<\/span>/.test(b.slice(0,b.indexOf('Sınav sırasında'))),'Öğretmen hesabında koordinatör alanı kendi adıyla doldurulmaz.');
oturum.admin=true;M.reset();
/* sayfa bilinmiyorsa tebliğ açılır */
M.open('yok');assert(kok.innerHTML.includes('data-osn-page="teblig"'),'Bilinmeyen sayfa anahtarı tebliğe düşer.');
/* yazdırma */
M.open('tutanak');M.yazdir();
assert.strictEqual(yazdirildi.length,1);
assert.strictEqual(yazdirildi[0][0],'Ortak Sınav Evrakı Teslim Tutanağı');
assert.deepStrictEqual(J({yon:yazdirildi[0][2].yon,akis:yazdirildi[0][2].akis,kenarBosluk:yazdirildi[0][2].kenarBosluk,ozellestirilebilir:yazdirildi[0][2].ozellestirilebilir,baslikGoster:yazdirildi[0][2].baslikGoster,logoGoster:yazdirildi[0][2].logoGoster}),{yon:'dikey',akis:true,kenarBosluk:10,ozellestirilebilir:false,baslikGoster:false,logoGoster:false},'Çıktı 10 mm üst/alt boşluklu akış kipinde, özelleştirmesiz basılır.');
ui.ReportEngine.printReport=undefined;let uyari='';ui.toast=m=>uyari=m;
assert.strictEqual(M.yazdir(),false);assert(uyari.includes('Rapor motoru'),'Rapor motoru yoksa kullanıcıya haber verilir.');

/* ── uygulama bağlantıları ── */
const rows=[...nav.matchAll(/\['(ortak-[a-z]+)','([^']+)','[a-z]+','[^']*','ortak-sinav','([a-z]+)'(?:,\{y:1\})?\]/g)].map(x=>[x[1],x[2],x[3]]);
assert.deepStrictEqual(J(rows),[['ortak-teblig','Görevlendirme Tebliği','teblig'],['ortak-gorevler','Gözetmen Öğretmen Görevleri','gorevler'],['ortak-tutanak','Sınav Evrakı Teslim Tutanağı','tutanak']],'Menüde üç ayrı sayfa satırı, her biri ortak-sinav rotasının bir sayfası.');
assert(/\['ortaksinav','Ortak Sınavlar','clip','indigo',\[\s*\['ortak-teblig'/.test(nav),'"Ortak Sınavlar" menüsü katalogda.');
assert(/\['ortak-teblig'[^\n]*\{y:1\}\]/.test(nav)&&!/\['ortak-(gorevler|tutanak)'[^\n]*\{y:1\}/.test(nav),'Tebliğ yalnız İdareci arayüzünde varsayılan; gözetmen görevleri ve tutanak öğretmende de çıkar.');
assert(/ogretmen:\['ogrenci','sinav','ortaksinav',/.test(nav)&&/idareci:\['okul','evrak','personel','ogrenci','sinav','ortaksinav',/.test(nav),'Menü her iki rolde de Sınav ve Not’un hemen ardından.');
['ortak-teblig','ortak-gorevler','ortak-tutanak'].forEach(id=>assert(nav.includes(`'${id}':'`),`${id}: simge ve arama sözcüğü tanımlı.`));
assert(/if\(name==='ortak-sinav'\)\{[\s\S]*?OrtakSinavModule\.open\(page\)/.test(shell)&&shell.includes('ortak-sinav-core.js?v=1')&&shell.includes('ortak-sinav.js?v=1')&&shell.includes('sinif-baglam.js?v=2'),'Rota betikleri yükleyip sayfa anahtarıyla açar.');
assert(sw.includes('./js/modules/ortak-sinav-core.js?v=1')&&sw.includes('./js/modules/ortak-sinav.js?v=1'),'Önbelleğe alınmalı.');
assert(!/ortakSinav|ortak-sinav/.test(loader),'Menü katalogdan kurulur; app-loader’da ayrı modül kaydı yok.');

/* ── hijyen ve stil ── */
assert(!/localStorage\.setItem/.test(coreSrc+uiSrc)&&!/<style/i.test(coreSrc+uiSrc)&&!/style="/.test(coreSrc+uiSrc)&&!/createElement\(\s*['"]style/.test(coreSrc+uiSrc),'Modül depolama yazmaz, stil gömmez.');
const kagit=css.slice(css.indexOf('/* ===== A4 — Ortak Sınavlar (.osn-*)'),css.indexOf('/* ===== A4 — Öğrenci Tanıma Formu (.tif-*)'));
assert(kagit.length>500,'Kâğıt stili bulundu.');
assert(!/\d(?:\.\d+)?px/.test(kagit)&&!/#[0-9a-fA-F]{3,8}\b/.test(kagit),'Kâğıt stili sabit px / renk içermemeli (yalnız rapor belirteçleri ve mm).');
assert(/\.osn-tablo tbody tr:nth-child\(n\) td\{background:var\(--ka-report-bg\)!important\}/.test(kagit),'Rapor motorunun çift satır grisi tutanak hücrelerine uygulanmaz.');
assert(/\.osn-tablo tr\{break-inside:avoid/.test(kagit)&&/\.osn-liste li\{[^}]*break-inside:avoid/.test(kagit),'Satır ve maddeler sayfa sonunda bölünmez.');
const ekran=css.slice(css.indexOf('/* ===== ORTAK SINAVLAR (osn-*) — ekran ====='),css.indexOf("/* ===== PROJELER › MAARİF'İN KALBİNDE OYUN (mok-*) — ekran ====="));
assert(ekran.length>200&&!/\d(?:\.\d+)?px/.test(ekran)&&!/#[0-9a-fA-F]{3,8}\b/.test(ekran),'Ekran stili sabit px / renk içermemeli.');
console.log('ortak-sinav: OK');
