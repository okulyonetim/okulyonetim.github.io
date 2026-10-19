/* Belirli Gün ve Haftalar yeniden tasarımı: etkinlik takvimi (yakından uzağa), ayrıntı penceresi, düzenleme formu,
 * "Yeni etkinlik" penceresi (katalog) ve A4 rapor. Çizelge çekirdeği sahte bir pencerede çalıştırılır. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const core=fs.readFileSync('js/modules/rubric-settings-core.js','utf8');
const catalogSrc=fs.readFileSync('js/modules/belirli-gunler-catalog.js','utf8');
const loader=fs.readFileSync('js/modules/rubric-settings.js','utf8');
const css=fs.readFileSync('css/design-system-base.css','utf8');

const p2=n=>String(n).padStart(2,'0');
const iso=off=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+off);return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`};

function boot(data,opts={}){
  const host={dataset:{},innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};
  const win={AppStore:{data:t=>data[t]||[]},PermissionService:{can:()=>opts.canEdit!==false,apply(){}},toast(){},document:null};
  win.window=win;win.global=win;
  win.document={querySelector:s=>s==='#toolsContent'?host:null,querySelectorAll:()=>[],body:{classList:{add(){},remove(){}},insertAdjacentHTML(){}},addEventListener(){},createElement:()=>({})};
  win.CustomEvent=function(){};win.dispatchEvent=()=>{};win.console=console;
  vm.createContext(win);vm.runInContext(core,win,{filename:'rubric-settings-core.js'});
  return {win,host,api:win.ClassicCizelgelerParity};
}
const T=[{id:'t0',ad:'Ayşe',soyad:'Yılmaz',brans:'Matematik'},{id:'t1',ad:'Mehmet',soyad:'Demir',brans:'Türkçe'}];
/* Bugüne göre: 2 geçmiş (biri işaretli), 1 devam eden, 3 yaklaşan (sıra karışık), 1 tarihsiz */
const E=[
  {id:'e-far',ad:'Uzak Hafta',tarihBaslangic:iso(40),tarihBitis:iso(46),ogretmenIdler:['t0'],kontroller:[false]},
  {id:'e-past-old',ad:'Eski Gün',tarihBaslangic:iso(-30),tarihBitis:'',ogretmenIdler:[],kontroller:[false]},
  {id:'e-near',ad:'Yakın Gün',tarihBaslangic:iso(3),tarihBitis:'',ogretmenIdler:['t0','t1'],aciklama:'Pano hazırlanacak.',kontroller:[false]},
  {id:'e-now',ad:'Sürüyor Haftası',tarihBaslangic:iso(-2),tarihBitis:iso(2),ogretmenIdler:['t1'],kontroller:[false]},
  {id:'e-past-new',ad:'Geçen Gün',tarihBaslangic:iso(-5),tarihBitis:'',ogretmenIdler:['t0'],kontroller:[true]},
  {id:'e-mid',ad:'Orta Gün',tarihBaslangic:iso(12),tarihBitis:'',ogretmenIdler:[],aciklama:'Hazır katalog: 12 Ekim',katalogId:'katalog-001',katalogKaynakTarih:'12 Ekim',katalogEgitimYili:'2026',kontroller:[false]},
  {id:'e-none',ad:'Tarihsiz',tarihBaslangic:'',ogretmenIdler:[],kontroller:[false]}
];
const {api,host,win}=boot({ogretmenler:T,belirliGunler:E});

/* ---- Liste: kcz çalışma alanı, yakından uzağa sıralama ---- */
assert(api.open('Belirli Günler ve Haftalar'),'Sayfa açılmalı.');
let html=host.innerHTML;
assert(html.includes('data-classic-cizelge-page="belirliGunler"')&&html.includes('kcz-page--event'),'Sayfa kcz etkinlik çalışma alanıyla çizilmeli.');
assert(/^<section[^>]*><h3 data-cizelge-route-label/.test(html),'Rota işaretçisi sayfanın başında olmalı.');
assert(!/style="/.test(html),'Sayfa satır içi stil taşımamalı.');
assert(!html.includes('ka-cizelge-event-list')&&!html.includes('ka-cizelge-event-card'),'Eski etkinlik listesi kalmamalı.');
for(const hook of ['data-cizelge-add','data-cizelge-report','data-cizelge-excel','data-cizelge-edit','data-cizelge-check','data-kbe-open','data-kbe-card'])assert(html.includes(hook),'Davranış kancası korunmalı: '+hook);
const order=[...html.matchAll(/data-kbe-card="([^"]+)"/g)].map(m=>m[1]);
assert.deepStrictEqual(order,['e-now','e-near','e-mid','e-far','e-past-new','e-past-old','e-none'],'Sıra: devam eden → yaklaşan (yakından uzağa) → geçmiş (en yeniden eskiye) → tarihsiz. Gelen: '+order);
const secs=[...html.matchAll(/data-kbe-section="([^"]+)"/g)].map(m=>m[1]);
assert.deepStrictEqual(secs,['ongoing','upcoming','past','none'],'Bölümler sırayla: ongoing, upcoming, past, none.');
assert(html.includes('Devam edenler')&&html.includes('Yaklaşanlar')&&html.includes('Geçmiş')&&html.includes('Tarihi belirsiz'),'Bölüm başlıkları görünmeli.');
assert(/<span class="kcl-n">7<\/span><small>Etkinlik/.test(html),'Özet: toplam etkinlik.');
assert(/<span class="kcl-n">4<\/span><small>Yaklaşan/.test(html),'Özet: yaklaşan (devam eden dahil).');
assert(/<span class="kcl-n">1\/7<\/span><small>Yapıldı/.test(html),'Özet: yapıldı 1/7.');
assert(/<span class="kcl-n">1<\/span><small>Yapılmadı/.test(html),'Özet: tarihi geçmiş ve işaretlenmemiş = 1.');
assert(html.includes('Yarın')||html.includes('3 gün sonra'),'Göreli zaman etiketi görünmeli.');
assert(html.includes('Sürüyor ·'),'Devam eden etkinlik "Sürüyor" etiketi taşımalı.');
assert(!html.includes('Hazır katalog:'),'Katalogun otomatik notu kartta gösterilmemeli.');
assert(html.includes('Pano hazırlanacak.'),'Kullanıcı notu kartta görünmeli.');
assert((html.match(/data-type="belirliGunler"/g)||[]).length===7,'Her etkinlik için bir Yapıldı kontrolü.');
assert(/data-id="e-past-new" data-index="0"[^>]*checked/.test(html),'İşaretli etkinlik işaretli görünmeli.');
assert(/Öğretmen atanmadı/.test(html),'Öğretmensiz etkinlik belirtilmeli.');
assert(/kbe-card is-late/.test(html.replace(/\s+/g,' '))||html.includes('is-late'),'Geçmiş ve işaretsiz etkinlik uyarı tonu almalı.');

/* ---- Salt okunur kullanıcı: düzenleme/Excel kapalı, ayrıntı açık kalır ---- */
{const ro=boot({ogretmenler:T,belirliGunler:E},{canEdit:false});ro.api.open('Belirli Günler ve Haftalar');
 assert(!/data-cizelge-edit=/.test(ro.host.innerHTML),'Yetkisiz kullanıcıya düzenle düğmesi gösterilmemeli.');
 assert(ro.host.innerHTML.includes('data-kbe-open'),'Yetkisiz kullanıcı yine de ayrıntıyı açabilmeli.');
 assert(/data-id="e-near"[^>]*disabled/.test(ro.host.innerHTML),'Yetkisiz kullanıcı için Yapıldı kontrolü kapalı olmalı.');}

/* ---- Boş durum ---- */
{const empty=boot({ogretmenler:T,belirliGunler:[]});empty.api.open('Belirli Günler ve Haftalar');
 assert(empty.host.innerHTML.includes('Henüz etkinlik eklenmedi')&&!empty.host.innerHTML.includes('kbe-card'),'Kayıt yoksa boş durum gösterilmeli.');}

/* ---- Aynı gün: bitişi olmayan / ters tarihli kayıtlar tek gün sayılır ---- */
{const odd=boot({ogretmenler:T,belirliGunler:[{id:'o1',ad:'Ters',tarihBaslangic:iso(5),tarihBitis:iso(1),kontroller:[false]}]});odd.api.open('Belirli Günler ve Haftalar');
 assert(odd.host.innerHTML.includes('5 gün sonra')&&!odd.host.innerHTML.includes('class="kbe-span"'),'Bitişi başlangıçtan önceki kayıt tek gün gibi davranmalı.');}

/* ---- Rapor: bölümler, sütunlar, öğretmen dağılımı ---- */
let captured=null;
win.ReportEngine={printReport:async(title,body,opts)=>{captured={title,body,opts}}};
win.KorukLocalFirst={meta:async()=>null};win.AKTIF_KULLANICI={uid:'u1'};
(async()=>{
  await api.printReport('belirliGunler');
  assert(captured,'Rapor üretilmeli.');
  assert.strictEqual(captured.title,'Belirli Gün ve Haftalar');
  assert.strictEqual(captured.opts.yon,'dikey','Rapor dikey A4 olmalı.');
  const b=captured.body;
  assert(b.includes('bgr-kpis')&&b.includes('bgr-doc'),'Özet bandı ve rapor kabı olmalı.');
  for(const h of ['Başlangıç','Bitiş','Etkinlik','Sorumlu Öğretmenler','Durum','Notlar'])assert(b.includes(`<th>${h}</th>`),'Sütun başlığı korunmalı: '+h);
  const names=[...b.matchAll(/<td class="bgr-name"><b>([^<]+)<\/b>/g)].map(m=>m[1]);
  assert.deepStrictEqual(names,['Sürüyor Haftası','Yakın Gün','Orta Gün','Uzak Hafta','Geçen Gün','Eski Gün','Tarihsiz'],'Rapor da yakından uzağa sıralı olmalı. Gelen: '+names);
  const heads=[...b.matchAll(/<h3 class="bolum-baslik">([^<]+)<\/h3>/g)].map(m=>m[1]);
  assert.deepStrictEqual(heads,['Devam edenler','Yaklaşanlar','Geçmiş','Tarihi belirsiz','Öğretmen görev dağılımı'],'Rapor bölümleri. Gelen: '+heads);
  assert(b.includes('✓ Yapıldı')&&b.includes('✗ Yapılmadı')&&b.includes('Bekliyor'),'Durum metni yalnız renge bağlı olmamalı.');
  assert(b.includes('bgr-load')&&/<td class="bgr-name">Ayşe Yılmaz<\/td><td class="bgr-num">3<\/td>/.test(b),'Öğretmen görev dağılımı: Ayşe Yılmaz 3 görev (Uzak, Yakın, Geçen).');
  assert(!b.includes('Hazır katalog:'),'Raporda katalogun otomatik notu olmamalı.');
  assert(/<colgroup>(<col class="bgr-c\d">){6}<\/colgroup>/.test(b),'Sütun genişlikleri colgroup ile verilmeli (özelleştirici sütun sırasını taşır).');

  /* Rapor ayarındaki sıralama kuralı varsa tek tabloda o sıra kullanılır */
  win.KorukLocalFirst={meta:async()=>({'belirli-days':{sortRules:[{key:'name',dir:'asc'}]}})};
  captured=null;await api.printReport('belirliGunler');
  const names2=[...captured.body.matchAll(/<td class="bgr-name"><b>([^<]+)<\/b>/g)].map(m=>m[1]);
  assert.deepStrictEqual(names2,['Eski Gün','Geçen Gün','Orta Gün','Sürüyor Haftası','Tarihsiz','Uzak Hafta','Yakın Gün'],'Tasarımcı sıralaması korunmalı. Gelen: '+names2);
  assert(!/>Yaklaşanlar</.test(captured.body),'Özel sıralamada bölümlere ayrılmamalı.');

  /* ---- Ayrıntı ve form kaynak sözleşmeleri ---- */
  assert(/function openDetail\(/.test(core)&&/function beDetailInner\(/.test(core)&&core.includes('data-kbe-detail'),'Ayrıntı penceresi olmalı.');
  assert(core.includes('data-kbe-done')&&core.includes('kcz-switch'),'Ayrıntıda Yapıldı anahtarı olmalı.');
  assert(core.includes("kontroller:id?[fd.has('yapildi')]:(row?.kontroller||[false])"),'Düzenlemede Yapıldı anahtarı kontrolleri güncellemeli; yeni kayıtta [false].');
  assert(core.includes('Bitiş tarihi başlangıçtan önce olamaz.'),'Bitiş tarihi doğrulaması olmalı.');
  const form=api.ui&&win.ClassicCizelgelerParity.ui;
  assert(form&&typeof form.kczPicker==='function'&&typeof form.bindPickers==='function'&&typeof form.beRange==='function','Katalog penceresi için ortak parçalar ClassicCizelgelerParity.ui ile verilmeli.');
  assert.strictEqual(form.beRange('2026-09-06','2026-09-10'),'6–10 Eylül 2026');
  assert.strictEqual(form.beRange('2026-10-29','2026-11-04'),'29 Ekim – 4 Kasım 2026');
  assert.strictEqual(form.beRange('2026-12-28','2027-01-03'),'28 Aralık 2026 – 3 Ocak 2027');
  assert.strictEqual(form.beRange('2026-10-24',''),'24 Ekim 2026');
  assert.strictEqual(form.beRange('',''),'Tarih yok');
  assert(/function openEdit\(type,id=''\)\{if\(type===BE_TYPE&&!id&&global\.BelirliGunlerCatalog\?\.open\)return global\.BelirliGunlerCatalog\.open\(\)/.test(core),'Yeni etkinlik doğrudan katalog penceresine gitmeli.');

  /* ---- Katalog penceresi: kayıt biçimi ve doğrulamalar korunur ---- */
  for(const k of ['katalogId:item.id','katalogAy:item.ay','katalogKaynakTarih:item.kaynakTarih','katalogEgitimYili:start','kontroller:existing?.kontroller||[false]','manuel:true','tarihBitis:d.bitis===d.baslangic?\'\':d.bitis'])assert(catalogSrc.includes(k),'Katalog kayıt alanı korunmalı: '+k);
  assert(catalogSrc.includes('Listeden en az bir etkinlik seçin.')&&catalogSrc.includes('Etkinlik adı girin.')&&catalogSrc.includes('Başlangıç tarihi girin.'),'Katalog penceresi boş gönderimi uyarmalı.');
  assert(!/kayitSil/.test(catalogSrc),'Katalog penceresi mevcut kayıtları silmemeli.');
  assert(catalogSrc.includes('data-belirli-katalog-form')&&catalogSrc.includes('name="katalogSecim"')&&catalogSrc.includes('name="katalogYil"'),'Katalog form kancaları korunmalı.');
  const cat={};const cwin={AppStore:{data:()=>[]},document:{},console};cwin.window=cwin;cwin.global=cwin;vm.createContext(cwin);vm.runInContext(catalogSrc,cwin);
  const C=cwin.BelirliGunlerCatalog;
  assert(C&&C.CATALOG.length===61&&typeof C.open==='function'&&typeof C.datesFor==='function','Katalog 61 etkinlikle yüklenmeli.');
  const it=C.CATALOG.find(x=>x.ad==='Kızılay Haftası');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(C.datesFor(it,'2026'))),{baslangic:'2026-10-29',bitis:'2026-11-04',gosterim:'29 Ekim-4 Kasım'},'Ay taşan tarih aralığı eğitim yılına göre üretilmeli.');
  const jan=C.CATALOG.find(x=>x.ad==='Enerji Tasarrufu Haftası');
  assert.strictEqual(C.datesFor(jan,'2026').baslangic,'2027-01-03','Ocak–Haziran etkinlikleri ertesi takvim yılına düşmeli.');

  /* ---- Yükleyici: eski DOM yeniden sıralama yaması kalkmış, giriş koruması ve katalog yükleme duruyor ---- */
  assert(!loader.includes('installBelirliGunlerDateSort')&&!loader.includes('reorderDom'),'Eski sıralama yaması kaldırılmalı; sıralama çekirdekte.');
  assert(loader.includes('installEntryGuard')&&loader.includes('belirli-gunler-catalog.js'),'Giriş koruması ve katalog yükleme korunmalı.');

  /* ---- CSS: kapsamlı, yalnız belirteç, iki temada okunur ---- */
  const a=css.indexOf('/* ===== BELİRLİ GÜN VE HAFTALAR (kbe-*)'),z=css.indexOf('/* ===== WEB ARAYÜZÜ (≥1100px)');
  assert(a>css.indexOf('/* ===== YILLIK / BEP PLANLARI & SOSYAL KULÜPLER (kcz-*')&&a<z,'kbe bölümü kcz bölümünden sonra, WEB ARAYÜZÜ öncesinde olmalı.');
  const block=css.slice(a,z).replace(/\/\*[\s\S]*?\*\//g,'');
  assert(!/#[0-9a-fA-F]{3,8}\b/.test(block)&&!/rgba?\(\s*\d/.test(block),'kbe bölümünde sabit renk olmamalı.');
  const bad=[...block.matchAll(/(^|\})\s*([^{}@]+)\{/gm)].map(m=>m[2].trim()).filter(s=>s&&!/^\d+%|^(from|to)$/.test(s)).map(s=>s.replace(/:is\([^)]*\)/g,'')).filter(s=>s.split(',').some(x=>!/^html\[data-theme\] (#v2ModuleRoot|\.kcz-form)\b/.test(x.trim())));
  assert.deepStrictEqual(bad,[],'Seçiciler kapsamlı olmalı: '+bad.slice(0,3).join(' | '));
  for(const c of ['.kbe-card','.kbe-sec','.kbe-date','.kbe-when','.kbe-sheet__head','.kbe-facts','.kbe-people','.kbe-tabs','.kbe-item','.kbe-assign'])assert(block.includes(c),'CSS sınıfı tanımlı olmalı: '+c);
  assert(/prefers-reduced-motion/.test(block),'Azaltılmış hareket desteklenmeli.');
  const defined=new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1]));
  const undef=[...new Set([...css.slice(a,z).matchAll(/var\((--[\w-]+)/g)].map(m=>m[1]))].filter(v=>!defined.has(v));
  assert.deepStrictEqual(undef,[],'Tanımsız CSS değişkeni kullanılmamalı: '+undef);
  /* Kâğıt stili (.ka-report ...) ekran bölümlerinin (kcl/kpd/kcz) ve web arayüzü bölümünün kapsam testlerine girmesin diye
     oturma ızgarası (bsg/csg) bölümlerinden önce, ayrı bir bölümdür. */
  const ra=css.indexOf('/* ===== A4 RAPOR — Belirli Gün ve Haftalar'),kclAt=css.indexOf('/* ═══════════ SERVİS OTURMA IZGARASI');
  assert(ra>0&&ra<kclAt&&kclAt<a,'Rapor stili oturma ızgarası ve kcl/kpd/kcz ekran bölümlerinden önce, ayrı bölümde olmalı.');
  const rep=css.slice(ra,kclAt).replace(/\/\*[\s\S]*?\*\//g,'');
  for(const c of ['.bgr-kpis','.bgr-table','.bgr-st','.bgr-sub','.bgr-legend'])assert(rep.includes(c),'Rapor sınıfı tanımlı olmalı: '+c);
  assert(!/#[0-9a-fA-F]{3,8}\b/.test(rep)&&!/rgba?\(\s*\d/.test(rep),'Rapor stilinde sabit renk olmamalı; --ka-report-people-* belirteçleri kullanılmalı.');
  assert(rep.split(/\}/).every(r=>!r.includes('{')||/^\s*\.ka-report /.test(r)||!r.includes('.bgr-')),'Rapor kuralları .ka-report altında olmalı.');
  const cacheVer=Number((fs.readFileSync('service-worker.js','utf8').match(/oy-cache-v(\d+)/)||[])[1]);
  assert(cacheVer>=1324,'Servis çalışanı önbelleği yeni sürüme yükseltilmeli.');
  /* Yazdırma: boşluk @page ile verilmeli (padding yalnız ilk/son sayfada kalır); dekoratif arka plan lekeleri basılmamalı. */
  const eng=fs.readFileSync('js/modules/report-engine.js','utf8');
  assert(eng.includes("@page{size:${page};margin:${o.akis?o.kenarBosluk+'mm':'0'}}"),'Akış kipinde @page kenar boşluğu kenarBosluk olmalı (her sayfada üst/alt boşluk).');
  assert(/akis:opts\.akis===true\|\|\(opts\.akis!==false&&!String\(opts\.extraHead\|\|''\)\.trim\(\)\)/.test(eng),'Akış kipi: açıkça istenen ya da özel extraHead olmayan raporlar.');
  assert(/printCss=o\.akis\?`@media print\{[^`]*html body \.ka-report\{[^`]*padding:0!important/.test(eng),'Akış kipinde yazdırırken .ka-report padding\'i 0 olmalı (boşluk @page\'den gelir).');
  assert(eng.includes('html::before,html::after,body::before,body::after{content:none!important;display:none!important}'),'Rapor belgesinde uygulamanın arka plan lekeleri (orb) kapatılmalı.');
  console.log('belirli-gunler-redesign: OK');
})().catch(e=>{console.error(e);process.exit(1)});
