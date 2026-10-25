const assert=require('assert'),fs=require('fs'),vm=require('vm');
const loader=fs.readFileSync('js/app-loader.js','utf8'),dash=fs.readFileSync('js/modules/dashboard.js','utf8'),settings=fs.readFileSync('js/modules/settings.js','utf8'),live=fs.readFileSync('js/modules/school-live-status.js','utf8'),css=fs.readFileSync('css/design-system-base.css','utf8');

/* AppConfig şemasını gerçekten çalıştır: kart kataloğu, seçenekler, varsayılanlar */
const start=loader.indexOf('const DASHBOARD_CARDS=['),end=loader.indexOf('function dashboardRows(');
const ctx={};vm.createContext(ctx);vm.runInContext(loader.slice(start,end)+';this.out={DASHBOARD_CARDS,CARD_OPTIONS,DASHBOARD_DEFAULTS,resolveOptions,examRows,onurRows,EXAM_DEFAULTS}',ctx);
const {DASHBOARD_CARDS,CARD_OPTIONS,DASHBOARD_DEFAULTS,resolveOptions,examRows,onurRows,EXAM_DEFAULTS}=ctx.out;

/* Her kartın ana sayfada çizicisi var; varsayılanlar kataloğu aşmıyor; açıklamaları dolu */
const renderers=dash.slice(dash.indexOf('const CARD_RENDERERS={'),dash.indexOf('function shell()'));
DASHBOARD_CARDS.forEach(c=>{assert(c.label&&c.desc,c.key+' adı ve açıklaması olmalı.');assert(new RegExp(`\\b${c.key}:`).test(renderers),c.key+' için CARD_RENDERERS girdisi olmalı.')});
const keys=new Set(DASHBOARD_CARDS.map(c=>c.key));assert.strictEqual(keys.size,DASHBOARD_CARDS.length,'Kart anahtarları benzersiz olmalı.');
['idareci','ogretmen'].forEach(r=>DASHBOARD_DEFAULTS[r].forEach(k=>assert(keys.has(k),`${r} varsayılanındaki ${k} katalogda olmalı.`)));
['slayt','onurPanosu','sozler'].forEach(k=>assert(keys.has(k)&&DASHBOARD_DEFAULTS.idareci.includes(k)&&DASHBOARD_DEFAULTS.ogretmen.includes(k),k+' iki rolde varsayılan olmalı.'));

/* Seçenekler: varsayılanlar, geçersiz değer düşürme, her seçenek gerçekten kullanılıyor */
const d=resolveOptions(null);
assert.strictEqual(d.welcome.zil,true);assert.strictEqual(d.welcome.hava,true);assert.strictEqual(d.absences.detay,'neden');assert.strictEqual(d.whereNow.sekme,'rooms');assert.strictEqual(d.specialDays.gun,'14');assert.strictEqual(d.sozler.sure,'8');
const r=resolveOptions({welcome:{zil:false,sehir:'  Elazığ  '},absences:{detay:'adlar'},specialDays:{gun:'999'},sozler:{hadis:'false'}});
assert.strictEqual(r.welcome.zil,false);assert.strictEqual(r.welcome.sehir,'Elazığ');assert.strictEqual(r.absences.detay,'adlar');assert.strictEqual(r.specialDays.gun,'14','Listede olmayan seçenek varsayılana dönmeli.');assert.strictEqual(r.sozler.hadis,false);
Object.entries(CARD_OPTIONS).forEach(([card,list])=>list.forEach(o=>{
  const used=new RegExp(`opt\\('${card}','${o.key}'\\)`).test(dash)||(card==='sozler'&&['ayet','hadis','ozluSoz'].includes(o.key)&&dash.includes("opt('sozler',t.key)"))||(card==='welcome'&&o.key==='sehir'&&live.includes("option?.('welcome','sehir')"));
  assert(used,`${card}.${o.key} seçeneği ana sayfada kullanılmalı.`);
  assert(['toggle','choice','text'].includes(o.type)&&o.label,`${card}.${o.key} şeması geçerli olmalı.`);
}));
assert(settings.includes('data-card-opt')&&settings.includes('readCardOptions'),'Ayarlar kart seçeneklerini şemadan çizip okumalı.');

/* Belirli gün kartı: okulun seçtikleri + resmî bayram ve anma günleri (Cumhuriyet Bayramı 29 Ekim) */
assert.strictEqual(d.specialDays.resmi,true,'Resmî günler varsayılan açık.');assert.strictEqual(resolveOptions({specialDays:{resmi:false}}).specialDays.resmi,false);
const catSrc=fs.readFileSync('js/modules/belirli-gunler-catalog.js','utf8'),cwin={};cwin.window=cwin;vm.createContext(cwin);vm.runInContext(catSrc,cwin);
const resmi=cwin.BelirliGunlerCatalog.resmiGunler();
['Cumhuriyet Bayramı','Atatürk Haftası','Ulusal Egemenlik ve Çocuk Bayramı','Atatürk’ü Anma ve Gençlik ve Spor Bayramı'].forEach(ad=>assert(resmi.some(x=>x.ad===ad&&/^\d{4}-\d{2}-\d{2}$/.test(x.tarihBaslangic)),ad+' resmî günlerde olmalı.'));
assert(resmi.some(x=>x.ad==='Cumhuriyet Bayramı'&&/-10-29$/.test(x.tarihBaslangic)),'Cumhuriyet Bayramı 29 Ekim olmalı.');
assert(!resmi.some(x=>/Madenciler|Müzeler|Anneler/.test(x.ad)),'Resmî listeye diğer katalog günleri girmemeli.');
assert(resmi.every(x=>x.katalogId&&x.ad&&x.tarihBaslangic),'Resmî gün kaydı belirliGunler biçiminde olmalı.');

/* Sınavlar: yalnız LGS varsayılan, saat desteği, her sınav ayrı */
assert.strictEqual(JSON.stringify(EXAM_DEFAULTS.map(x=>x.ad.replace(/ .*/,''))),'["LGS"]');assert.strictEqual(EXAM_DEFAULTS[0].saat,'09:30');
const ex=examRows([{ad:'LGS',tarih:'2027-06-13',saat:'09:30'},{ad:'Bursluluk',tarih:'2026-11-01',saat:'x',goster:false},{ad:'',tarih:'2026-01-01'}]);
assert.strictEqual(ex.length,2);assert.strictEqual(ex[1].saat,'');assert.strictEqual(ex[1].goster,false);assert.strictEqual(ex[0].goster,true);
assert.strictEqual(examRows(null).length,1);assert.strictEqual(examRows([]).length,0,'Boş liste hiç sınav göstermemeli.');
/* Eski sürümlerin belgeye yazdığı varsayılan LGS/YKS satırları: YKS hiçbir yerde kalmaz, yalnız onlardan oluşan liste yeni LGS varsayılanına döner */
const eski=examRows([{ad:'LGS (tahmini)',tarih:'2027-06-12'},{ad:'YKS (tahmini)',tarih:'2027-06-19',goster:true}]);
assert.strictEqual(JSON.stringify(eski.map(x=>x.ad+'|'+x.tarih+'|'+x.saat)),'["LGS (tahmini)|2027-06-13|09:30"]','Eski varsayılan satırlar yeni varsayılana dönmeli.');
const karisik=examRows([{ad:'LGS (tahmini)',tarih:'2027-06-12'},{ad:'YKS (tahmini)',tarih:'2027-06-19'},{ad:'Bursluluk',tarih:'2026-11-01'}]);
assert.strictEqual(JSON.stringify(karisik.map(x=>x.ad)),'["Bursluluk"]','Okulun girdiği sınav korunur, eski varsayılanlar düşer.');
assert.strictEqual(examRows([{ad:'YKS',tarih:'2027-06-19'}]).length,1,'Okulun kendi girdiği satıra dokunulmaz.');
assert(dash.includes('countdownParts')&&dash.includes('refreshExamCountdowns()'),'Canlı geri sayım her saniye güncellenmeli.');

/* Onur panosu */
const on=onurRows([{baslik:'Ayın Öğrencisi',ikon:'🏅',kisiler:[{ad:'Ayşe'},{ad:' '}]},{baslik:'',kisiler:[{ad:'x'}]}]);
assert.strictEqual(on.length,1);assert.strictEqual(on[0].kisiler.length,1);
assert(dash.includes('onurPanosuSection')&&css.includes('kh-onur'),'Onur panosu kartı olmalı.');

/* Slayt: ayrı belgeler, ortak geçiş motoru */
assert(dash.includes("/^slayt-\\d+$/")&&settings.includes("/^slayt-\\d+$/"),'Slayt belgeleri iki tarafta aynı kalıpla okunmalı.');
assert(dash.includes('carousels={saying:{at:0')&&dash.includes('slayt:{at:0'),'Söz ve slayt aynı geçiş motorunu kullanmalı.');

/* Ayarlar: tek seferlik bağlama, kaydedilmemiş değişiklik koruması, sıfırlama içeriği silmez */
assert(settings.includes("if(out.dataset.appEditorBound)return"),'Düzenleyici her render\'da yeniden bağlanmamalı.');
assert(settings.includes('appDirty'),'Kaydedilmemiş değişiklik varken sayfa yenilenmemeli.');
assert(/const resetConfig=\(\)=>saveConfig\(\{modules:MODULE_DEFAULTS,dashboardCards:\{\},cardOptions:null,examCountdowns:null\}\)/.test(loader),'Sıfırlama söz havuzunu, onur panosunu ve slaytları korumalı.');
console.log('ana-sayfa-ozellestirme: OK');
