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
