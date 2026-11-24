// Rapor/dilekçe önizleme düzenleme, her sayfada üst-alt boşluk ve opak pencere zeminleri
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=f=>fs.readFileSync(f,'utf8');
const engSrc=read('js/modules/report-engine.js'),dlk=read('js/modules/dilekce.js'),mg=read('js/modules/management.js'),css=read('css/design-system-base.css');

function engine(){
  const win={AppStore:{data:()=>[]},location:{href:'http://x/'},document:{styleSheets:[]},navigator:{userAgent:''}};win.window=win;
  vm.runInContext(engSrc,vm.createContext({window:win,URL,console,Intl,Date,String,Array,Number,Math,Promise,setTimeout,clearTimeout,document:win.document,navigator:win.navigator}));
  return win.ReportEngine;
}

test('sabit kâğıt (extraHead) raporunda da üst/alt boşluk her sayfada tekrarlanır',()=>{
  const e=engine(),body='<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>';
  const sabit=e.documentHtml('T',body,{extraHead:'<style>.x{}</style>'});
  assert.match(sabit,/<table class="ka-pagepad"><thead>/,'extraHead olup akis verilmeyen rapor thead/tfoot boşluğu kullanmalı');
  assert.match(sabit,/<tfoot><tr><td><div class="ka-pagepad-sp"/);
  assert.ok(!/<table class="ka-pagepad">/.test(e.documentHtml('T',body,{akis:true})),'akış raporu @page boşluğunu kullanmaya devam eder');
  assert.match(e.documentHtml('T',body,{akis:true,native:true}),/<table class="ka-pagepad">/,'Android akış raporu eskisi gibi');
  assert.match(e.documentHtml('T',body,{native:true,extraHead:'<style></style>'}),/<table class="ka-pagepad">/);
});

test('önizleme düzenlenebilir; yazdır, görsel ve paylaş düzenlenmiş belgeyi kullanır',()=>{
  assert.match(engSrc,/data-report-edit/);
  assert.match(engSrc,/designMode=editing\?'on':'off'/);
  assert.ok((engSrc.match(/currentHtml\(\)/g)||[]).length>=3,'üç çıktı yolu da düzenlenmiş hâli kullanmalı');
  assert.match(engSrc,/duzenle:opts\.duzenle===true/,'printReport düzenle seçeneğini iletmeli');
  assert.match(css,/\.ka-report-preview__zoom\{display:grid;grid-template-columns:44px 64px 44px auto auto auto;/);
});

test('Dilekçe Oluştur: tarih ve konu sayfa üzerinde düzenlenir, çıktı önizlemesi düzenlenebilir açılır',()=>{
  assert.match(dlk,/const FORM_KEYS=\[[^\]]*'tarihOzel'/);
  assert.match(dlk,/\$\{ed\('tarih'\)\}/);
  assert.match(dlk,/k==='tarih'\)s\.tarihOzel=/);
  assert.match(dlk,/duzenle:true/);
  const win={AppStore:{data:()=>[],get:()=>({})},toast(){}};win.window=win;
  vm.runInContext(dlk,vm.createContext({window:win,document:{},console,Date,String,Array,Number,Math}));
  const m=win.DilekceModule,s={makam:'Koruk',acilis:false,metin:'x',tarih:'2026-11-23',tarihOzel:'24 Kasım 2026'};
  assert.ok(m.paper(s,true).includes('24 Kasım 2026'),'özel tarih metni belgede görünür');
  assert.ok(m.paper({...s,tarihOzel:''},true).includes('23.11.2026'));
  assert.ok(m.paper({...s,konu:''},true).includes('Konu:'),'boş konu önizlemede düzenlenebilir satır olarak görünür');
  assert.ok(!m.paper({...s,konu:''},false).includes('Konu:'),'çıktıda boş konu satırı basılmaz');
});

test('Dilekçe & İzinler: kayıt aynı A4 dilekçeye dönüşür; JSON öznitelik ve salt okunur önizleme yok',()=>{
  assert.ok(!/data-dilekce-yazdir/.test(mg),'JSON taşıyan tek tırnaklı öznitelik kesme işaretinde bozuluyordu');
  assert.ok(!/dilekceOnizleme|data-dilekce-preview/.test(mg),'salt okunur alan listesi önizlemesi kalkmalı');
  assert.match(mg,/DilekceModule\.print\(dilekceBelgeVerisi\(d\)\)/);
  assert.match(mg,/data-dilekce-onizle="\$\{esc\(d\.id\)\}">Önizle \/ Yazdır/);
});

test('rapor özelleştirme, servis oturma düzenleyici ve duyuru detayı pencereleri opak zemin kullanır',()=>{
  for(const sel of ['.ka-report-customizer{','#transportBusEditor .sbe-modal{','.ka-announcement-detail{']){
    const i=css.indexOf(sel);assert.ok(i>=0,sel);
    const rule=css.slice(i,css.indexOf('}',i));
    assert.match(rule,/background:var\(--pp-solid\)/,sel+' yarı saydam kart zemini kullanmamalı');
    assert.ok(!/background:var\(--ka-card-bg/.test(rule),sel);
  }
  assert.match(css,/#transportBusEditor \.sbe-modal,\n\.sbe-table-editor\{background:var\(--pp-solid\)/);
});

// ---- Gezi yazı/planları ve izin dilekçesi çıktıları ----
function gezi(){
  const win={AppStore:{data:()=>[],get:()=>({})},toast(){},localStorage:{getItem:()=>null,setItem(){}}};win.window=win;
  vm.runInContext(read('js/modules/gezi.js'),vm.createContext({window:win,console,Date,String,Array,Number,Math,JSON,Object,RegExp,Set}));
  return win.GeziModule;
}
const gSample=G=>({...G.reset(),gTarih:'2026-11-10',yer:'Anıtkabir',saat:'08:00 - 14:00',program:'08:00 Hareket',okul:'Koruk İlkokulu',subeler:[{sube:'6/A',k:'12',e:'14'}],ogretmenler:['Ali Veli'],mudur:'Mehmet DEMİR',teklif:'Ayşe YILMAZ'});

test('Gezi planı ve onay yazısında her alan sayfa üzerinde düzenlenebilir; çıktıda iz bırakmaz',()=>{
  const G=gezi();
  for(const doc of ['plan-ici','plan-disi','onay-ici','onay-disi']){
    const s={...gSample(G),doc},h=G.paper(s,true),n=(h.match(/data-gz-ed="/g)||[]).length;
    assert.ok(n>=30,`${doc}: sayfadaki alanların tamamı düzenlenebilir olmalı (${n})`);
    assert.ok(!G.paper(s).includes('contenteditable')&&!G.paper(s).includes('data-gz-b'),`${doc}: yazdırılan belgede düzenleme işareti olmamalı`);
  }
  const plan=G.paper({...gSample(G),doc:'plan-ici'},true);
  for(const k of ['gTarih','yer','saat','program','plaka','sofor','kira','sube:0','k:0','e:0','toplam','veli','idareci','ogretmenler','amac','baslik','th1','th17','soforTel','th18'])
    assert.ok(plan.includes(`data-gz-ed="${k}"`),'plan tablosunda eksik alan: '+k);
  const onay=G.paper({...gSample(G),doc:'onay-ici'},true);
  for(const k of ['ust1','ust2','ust3','sayi','yaziTarih','konu','hitap','ilgi','govde','kapanis','imzaAd','imzaUnvan','ek','olurb','olurTarih','olurAd','olurUnvan'])
    assert.ok(onay.includes(`data-gz-ed="${k}"`),'onay yazısında eksik alan: '+k);
});

test('Elle değiştirilen hesaplanan hücre çıktıda görünür; hesaplanan hâl değişince kendiliğinden bırakılır',()=>{
  const G=gezi(),s={...gSample(G),doc:'plan-ici'};
  s.ozel={toplam:{text:'26 öğrenci',base:'26'},baslik:{text:'ÖZEL BAŞLIK',base:'OKUL GEZİ PLANI'},th2:{text:'GEZİLECEK YER',base:'GEZİ YERİ'}};
  const h=G.paper(s);
  assert.match(h,/<b>26 öğrenci<\/b>/);assert.match(h,/ÖZEL BAŞLIK/);assert.match(h,/GEZİLECEK YER/);
  s.subeler[0].k='20';  // toplam 34 oldu: elle yazılan "26 öğrenci" artık geçersiz
  assert.ok(!G.paper(s).includes('26 öğrenci'));assert.match(G.paper(s),/<b>34<\/b>/);
  assert.match(G.paper(s),/ÖZEL BAŞLIK/,'hesaplanan hâli değişmeyen hücreler korunur');
});

test('Gezi çıktıları özelleştirme penceresini atlar ve düzenlenebilir önizleme açar',()=>{
  const src=read('js/modules/gezi.js');
  assert.strictEqual((src.match(/ozellestirilebilir:false,duzenle:true/g)||[]).length,2,'print ve printBelge');
  assert.match(src,/pv\.addEventListener\('input',e=>\{[^}]*sheetEdit\(root,s,el\)/);
  assert.match(src,/pv\.addEventListener\('focusout'/);
});

test('İzin ve diploma dilekçesi çıktıları başlıksız, özelleştirmesiz ve düzenlenebilir açılır; sabit okul adı yok',()=>{
  const par=read('js/modules/classic-personnel-parity.js'),doc=read('js/modules/personnel-documents.js');
  assert.match(par,/baslikGoster:false,okulAdi:' ',ozellestirilebilir:false,duzenle:true/);
  assert.ok(!par.includes("'KORUK İLK-ORTAOKULU'"));
  assert.match(doc,/ozellestirilebilir:false,duzenle:true/);
});

test('Düzenlenebilir tablo hücreleri önizlemede yuvarlak kutuya dönüşmez',()=>{
  assert.match(css,/\.ttn-sheet td\[contenteditable\],html\[data-theme\] #v2ModuleRoot \.ttn-page \.ttn-sheet th\[contenteditable\]\{border-radius:0\}/);
});

test('Veli izin belgesi şablonu sayfada düzenlenir; değişiklik her öğrencinin belgesine geçer, çıktıda iz kalmaz',()=>{
  const G=gezi(),s={...gSample(G),doc:'veli',ogrenciler:[{sinif:'6/A',no:'1',ad:'Ayşe Su',veli:'Veli S',tel:'0555'}]};
  const h=G.paper(s,true);
  for(const k of ['vbaslik','vmakam','v1','v2','v3','v4','gTarih','v5','saat','v6','yer','v7','vgereg','vl1','vl2','vl3','vl4'])assert.ok(h.includes(`data-gz-ed="${k}"`),'veli belgesinde eksik alan: '+k);
  assert.ok(!G.paper(s).includes('contenteditable'));
  s.ozel={vbaslik:{text:'GEZİ MUVAFAKAT BELGESİ',base:'GEZİ VELİ İZİN BELGESİ'},vl2:{text:'Veli:',base:'Veli adı soyadı:'}};
  const k=G.BELGE.veli(s);
  assert.match(k,/GEZİ MUVAFAKAT BELGESİ/);assert.match(k,/Veli: Veli S/);assert.match(k,/Ayşe Su/);assert.ok(!k.includes('<span data-gz'));
  assert.match(G.BELGE.veli({...s,ozel:{}}),/Veli adı soyadı: Veli S/,'elle değişiklik yokken eski metin aynen çıkar');
});

test('Başlık ve OLUR satırları tam genişlikte dokunulabilir (yazı yine ortada)',()=>{
  assert.match(css,/\.ka-report \.gzi-ust\{display:flex;flex-direction:column;align-items:stretch;text-align:center;/);
  assert.match(css,/\.ka-report \.gzi-olur\{display:flex;flex-direction:column;align-items:stretch;/);
});

test('Gezi onay yazısı: etiketler ve veli belgesindeki boşluklar da düzenlenir; boş Sayı kod yazmaz',()=>{
  const G=gezi(),s={...gSample(G),doc:'onay-ici',sayi:''};
  const h=G.paper(s,true);
  for(const k of ['sayiEt','konuEt','ilgiEt','ekEt'])assert.ok(h.includes(`data-gz-ed="${k}"`),'etiket düzenlenemiyor: '+k);
  assert.ok(!h.includes('821.04')&&!G.paper(s).includes('821.04'),'Sayı boşken belgeye kod yazılmaz');
  assert.match(G.paper(s),/<span>Sayı :<\/span> <span><\/span>/,'boş Sayı yazdırmada tamamen boş kalır (nokta da kod da yok)');
  assert.match(h,/data-gz-ed="sayi"[^>]*><\/span>/,'boş Sayı sayfada da boş, ama dokunulup yazılabilir kalır');
  assert.match(css,/\[data-gz-ed="sayi"\]:empty\{display:inline-block;min-width:/,'boş Sayı alanı dokunulabilir genişlikte kalır');
  assert.match(G.paper({...s,sayi:'821.04/7'}),/<span>821\.04\/7<\/span>/);
  assert.match(G.paper({...s,ozel:{sayiEt:{text:'Sayısı :',base:'Sayı :'}}}),/Sayısı :/);
  const v=G.paper({...gSample(G),doc:'veli'},true);
  for(const k of ['vb1','vb2','vb3','vb4','vb5','vb6','vb7'])assert.ok(v.includes(`data-gz-ed="${k}"`),'veli belgesi boşluğu düzenlenemiyor: '+k);
  assert.ok(!G.paper({...gSample(G),doc:'veli'}).includes('contenteditable'));
});

test('Okul adı başlıkta, hitapta ya da veli makamında değişince her yerde değişir',()=>{
  const src=read('js/modules/gezi.js');
  assert.match(src,/k==='ust3'\|\|k==='vmakam'\|\|k==='hitap'&&!disi/);
  assert.match(src,/set\('okul',m\[1\]\.trim\(\)\)/);
  const G=gezi(),s={...gSample(G),doc:'onay-ici',okul:'ŞEHİT REMZİ YEMEZ ORTAOKULU'};
  const h=G.paper(s,true);
  assert.match(h,/ŞEHİT REMZİ YEMEZ ORTAOKULU Müdürlüğü/);assert.match(h,/ŞEHİT REMZİ YEMEZ ORTAOKULU MÜDÜRLÜĞÜNE/);
  const y=G.paper({...s,okul:'YENİ ORTAOKUL'},true);
  assert.match(y,/YENİ ORTAOKUL Müdürlüğü/);assert.match(y,/YENİ ORTAOKUL MÜDÜRLÜĞÜNE/);
});

test('Gezi onayı: yazı tek sayfa, okul gezi planı ayrı ek sayfası; çıktıda sayfa sonu var',()=>{
  const G=gezi(),s={...gSample(G),doc:'onay-ici'};
  for(const edit of [false,true]){
    const h=G.paper(s,edit),sayfalar=h.split('<div class="gzi-sayfa">').slice(1);
    assert.strictEqual(sayfalar.length,2,'yazı + ek plan = iki sayfa');
    assert.ok(!sayfalar[0].includes('gzi-tablo')&&!sayfalar[0].includes('gzi-title'),'dilekçe sayfasında plan tablosu olmaz');
    assert.match(sayfalar[0],/Ek:/);assert.match(sayfalar[0],/O L U R/);assert.match(sayfalar[0],/Mehmet DEMİR/);
    assert.match(sayfalar[1],/<h1 class="gzi-title"/);assert.match(sayfalar[1],/gzi-tablo/);assert.ok(!sayfalar[1].includes('O L U R'));
  }
  assert.match(css,/\.ka-report \.gzi-sayfa\{break-after:page\}/);
  assert.match(G.paper({...s,doc:'onay-disi'}),/İL DIŞI OKUL GEZİ PLANI/);
});

test('Gezi onayı: elle yazılan sabit metinler (başlık, hitap, etiketler) kendiliğinden eski hâline dönmez',()=>{
  const G=gezi(),s={...gSample(G),doc:'onay-ici'};
  // varsayılan metin sonradan değişse (ör. sınıf seçimi okul adını değiştirdi) bile elle yazılan kalır
  s.ozel={ust3:{text:'KORUK İLKOKULU MÜDÜRLÜĞÜ',base:'Eski Okul Müdürlüğü'},ust1:{text:'TÜRKİYE CUMHURİYETİ',base:'T.C.'},hitap:{text:'MAKAMINA',base:'ESKİ'},sayiEt:{text:'Sayısı :',base:'?'}};
  const h=G.paper(s);
  for(const m of ['KORUK İLKOKULU MÜDÜRLÜĞÜ','TÜRKİYE CUMHURİYETİ','MAKAMINA','Sayısı :'])assert.ok(h.includes(m),'geri döndü: '+m);
  // kaynağı form alanı olan satırlar, o alan değişince yeniden hesaplanır
  const src=read('js/modules/gezi.js');
  assert.match(src,/const KAYNAK=\{[^}]*okul:\['ust3','hitap','vmakam'\]/);
  assert.match(src,/ozSil\(s,KAYNAK\[k\]\|\|\[\]\)/);
  // içi/dışı belgelerin hitap/unvan düzenlemeleri birbirini ezmez
  const d={...s,doc:'onay-disi',ozel:{hitap:{text:'İÇİ HİTABI',base:'x'}}};
  assert.ok(!G.paper(d).includes('İÇİ HİTABI'),'okul içi hitabı dışı belgesine taşınmaz');
  assert.ok(G.paper({...d,ozel:{'hitap@d':{text:'DIŞI HİTABI',base:'x'}}}).includes('DIŞI HİTABI'));
});

test('Gezi planında şoför cep telefonu alanı vardır (araç başına, plan tablosunda, EK-10 beyanında)',()=>{
  const G=gezi(),s={...gSample(G),doc:'plan-ici',araclar:[{tur:'Otobüs',plaka:'06 AB 123',sofor:'Ali Yılmaz',sofTel:'0532 111 22 33'},{tur:'Midibüs',plaka:'06 CD 456',sofor:'Veli Kaya',sofTel:'0533 444 55 66'}]};
  const h=G.paper(s);
  assert.match(h,/c\) Şoförlerin Cep Telefonu/);assert.match(h,/0532 111 22 33, 0533 444 55 66/);assert.match(h,/d\) Aracın Kira Bedeli/);
  assert.match(G.paper(s,true),/data-gz-ed="soforTel"/);
  const src=read('js/modules/gezi.js');
  assert.match(src,/\['sofTel','Şoför cep telefonu'/,'araç formunda şoför telefonu alanı');
  assert.match(src,/input\('soforTel','tel'/,'tek araç formunda şoför telefonu alanı');
  assert.match(G.BELGE.surucu(s),/SÜRÜCÜNÜN CEP TELEFONU[\s\S]*0532 111 22 33/,'EK-10 beyanında şoförün cep telefonu');
  assert.match(G.BELGE.surucu(s),/SÜRÜCÜNÜN CEP TELEFONU[\s\S]*0533 444 55 66/);
});
