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
  for(const k of ['gTarih','yer','saat','program','plaka','sofor','kira','sube:0','k:0','e:0','toplam','veli','idareci','ogretmenler','amac','baslik','th1','th17'])
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
