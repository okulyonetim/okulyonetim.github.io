const assert=require('assert'),fs=require('fs');
global.window=global;
require('../js/modules/gunun-sozleri-veri.js');
require('../js/modules/gunun-sozleri.js');
const G=global.GununSozleri,V=global.GununSozleriVeri;
const loader=fs.readFileSync('js/app-loader.js','utf8'),dash=fs.readFileSync('js/modules/dashboard.js','utf8'),settings=fs.readFileSync('js/modules/settings.js','utf8'),css=fs.readFileSync('css/design-system-base.css','utf8');
const gun=(d)=>new Date(2026,9,27+d,12,0,0);

/* Üç tür, her biri kendi havuzundan; her havuz 100'den fazla söz içerir */
assert.deepStrictEqual(G.TURLER.map(t=>t.key),['ayet','hadis','ozluSoz']);
G.TURLER.forEach(t=>{
  const liste=G.hazir(t.key),ids=liste.map(x=>x.id);
  assert(liste.length>100,`${t.key} hazır havuzu 100'den fazla söz içermeli (${liste.length}).`);
  assert.strictEqual(new Set(ids).size,ids.length,t.key+' id\'leri benzersiz olmalı.');
  assert.strictEqual(new Set(liste.map(x=>x.metin)).size,liste.length,t.key+' sözleri tekrar etmemeli.');
  liste.forEach(x=>{assert(x.metin&&x.kaynak,t.key+' her sözün metni ve kaynağı olmalı: '+x.id);assert(x.metin.length<=G.SINIR.metin&&x.kaynak.length<=G.SINIR.kaynak,t.key+' söz sınırı aşılmamalı: '+x.id)});
});
/* Eski kayıtlı ayarlar bozulmasın: ilk sürümün id'leri korunur */
[['ayet','a',18],['hadis','h',16],['ozluSoz','o',14]].forEach(([k,p,n])=>{const ids=new Set(G.hazir(k).map(x=>x.id));for(let i=1;i<=n;i++)assert(ids.has(p+String(i).padStart(2,'0')),`${k}: ${p}${String(i).padStart(2,'0')} korunmalı.`)});

/* Günlük seçim: aynı gün aynı söz (saat fark etmez), ertesi gün başka söz, havuz bitmeden tekrar yok */
const sabah=new Date(2026,9,27,0,0,1),aksam=new Date(2026,9,27,23,59,59),ertesi=new Date(2026,9,28,0,0,1);
assert.strictEqual(G.gunNo(aksam),G.gunNo(sabah),'Aynı takvim gününde gün numarası değişmemeli.');
assert.strictEqual(G.gunNo(ertesi),G.gunNo(sabah)+1,'Gece yarısı gün numarası bir artmalı.');
G.TURLER.forEach(t=>{
  assert.strictEqual(G.bugun(t.key,{},sabah).id,G.bugun(t.key,{},aksam).id,t.key+': gün içinde söz değişmemeli.');
  assert.notStrictEqual(G.bugun(t.key,{},sabah).id,G.bugun(t.key,{},ertesi).id,t.key+': ertesi gün başka söz gelmeli.');
  const n=G.havuz(t.key,{}).length,gorulen=new Set();for(let i=0;i<n;i++)gorulen.add(G.bugun(t.key,{},new Date(2026,9,27+i,12)).id);
  assert.strictEqual(gorulen.size,n,t.key+': havuz bitmeden söz tekrar etmemeli.');
  assert.strictEqual(G.bugun(t.key,{},new Date(2026,9,27+n,12)).id,G.bugun(t.key,{},new Date(2026,9,27,12)).id,t.key+': havuz bitince başa dönmeli.');
});
const art=[];for(let i=0;i<5;i++)art.push(G.bugun('ayet',{},gun(i)).id);
assert.strictEqual(new Set(art.map(x=>x.slice(0,1))).size,1,'Ayet türü yalnız ayet sözü döndürmeli.');

/* Havuz: hazır sözler kapatılır, düzenlenir; yönetici söz ekler; bozuk kayıt güvenli okunur */
const cfg={hadis:{kapali:['h01','yok','h01'],duzenle:{h02:{metin:'  Yeni   metin ',kaynak:' Okul '},h03:{metin:'   ',kaynak:'x'},yok:{metin:'x',kaynak:'y'}},ozel:[{metin:'  Kendi   sözümüz ',kaynak:'Okul'},{metin:'',kaynak:'x'}]}};
const a=G.ayar(cfg,'hadis');
assert.deepStrictEqual(a.kapali,['h01'],'Bilinmeyen / yinelenen kapalı id atılmalı.');
assert.deepStrictEqual(Object.keys(a.duzenle),['h02'],'Boş metinli ve bilinmeyen id\'li düzenleme atılmalı.');
assert.deepStrictEqual(a.duzenle.h02,{metin:'Yeni metin',kaynak:'Okul'},'Düzenleme boşlukları sadeleştirilerek okunmalı.');
const tum=G.tumu('hadis',cfg),pool=G.havuz('hadis',cfg);
assert.strictEqual(tum.length,G.hazir('hadis').length+1,'Editör listesi tüm hazır sözleri + eklenenleri içermeli.');
assert(tum.find(x=>x.id==='h01').kapali&&tum.find(x=>x.id==='h02').duzenlendi&&!tum.find(x=>x.id==='h04').duzenlendi,'Kapalı / düzenlendi bayrakları doğru olmalı.');
assert(!pool.some(x=>x.id==='h01'),'Kapatılan hazır söz havuzda olmamalı.');
assert.strictEqual(pool.find(x=>x.id==='h02').metin,'Yeni metin','Düzenlenen metin havuza yansımalı.');
assert.strictEqual(pool.filter(x=>!x.hazir).length,1,'Boş metinli söz atılmalı.');
assert(pool.some(x=>x.metin==='Kendi sözümüz'&&x.kaynak==='Okul'),'Eklenen söz normalize edilerek havuza girmeli.');
assert.strictEqual(G.havuz('ayet',cfg).length,G.hazir('ayet').length,'Bir türün ayarı diğerini etkilememeli.');
const uzun='x'.repeat(1000);
assert.strictEqual(G.ayar({ayet:{ozel:[{metin:uzun,kaynak:uzun}]}},'ayet').ozel[0].metin.length,G.SINIR.metin,'Eklenen söz uzunluk sınırına kısaltılmalı.');
assert.strictEqual(G.ayar({ayet:{ozel:Array.from({length:G.SINIR.ozel+50},()=>({metin:'a'}))}},'ayet').ozel.length,G.SINIR.ozel,'Eklenen söz sayısı sınırlı olmalı.');
['ayet','hadis','ozluSoz'].forEach(k=>{assert.doesNotThrow(()=>G.havuz(k,null));assert.doesNotThrow(()=>G.havuz(k,[1,2]));assert.doesNotThrow(()=>G.havuz(k,{[k]:{kapali:'x',duzenle:[1],ozel:7}}));assert.doesNotThrow(()=>G.bugun(k,{[k]:null}))});
/* Bir söz eklenip çıkarılınca diğerlerinin göreli sırası değişmez */
const sirasiz=G.havuz('ozluSoz',{}).map(x=>x.id),eklenmis=G.havuz('ozluSoz',{ozluSoz:{ozel:[{metin:'Yeni'}]}}).map(x=>x.id).filter(id=>id!=='ozel-1');
assert.deepStrictEqual(eklenmis,sirasiz,'Söz eklemek hazır sözlerin sırasını bozmamalı.');
const kapaliHepsi={ayet:{kapali:G.hazir('ayet').map(x=>x.id)}};
assert.strictEqual(G.bugun('ayet',kapaliHepsi),null,'Havuz boşsa kart gösterilmemeli.');
assert.strictEqual(G.bugun('ayet',{ayet:{kapali:G.hazir('ayet').map(x=>x.id),ozel:[{metin:'Tek söz'}]}}).metin,'Tek söz','Yalnız eklenen söz kalırsa her gün o gösterilmeli.');

/* Sınav: varsayılan yalnız LGS, her sınav ayrı Göster kontrolü */
const ex=loader.match(/const EXAM_DEFAULTS=(\[.*?\]);/s)[1];
assert(/LGS/.test(ex)&&!/YKS/.test(ex),'Varsayılan sınav listesinde YKS olmamalı.');
assert(loader.includes("goster:x?.goster!==false"),'Her sınavın Göster alanı AppConfig\'te olmalı.');
assert(dash.includes("x.goster!==false"),'Ana sayfa yalnız Göster işaretli sınavları sıralamalı.');
assert(settings.includes('data-exam-show')&&settings.includes('data-exam-add')&&settings.includes('data-exam-remove'),'Ayarlar sınav satırı: göster/ekle/kaldır.');

/* Belirli gün: katalog ana sayfaya karışmaz */
assert(!dash.includes('catalogSpecialDays')&&dash.includes('BelirliGunlerCatalog?.resmiGunler')&&!dash.includes('BelirliGunlerCatalog.CATALOG')&&!dash.includes('BelirliGunlerCatalog?.CATALOG'),'Ana sayfa okulun seçtiği günlere yalnız resmî bayram ve anma günlerini ekler; tüm katalog karışmaz.');
assert(/define\('dashboard',\[[^\]]*belirli-gunler-catalog\.js[^\]]*dashboard\.js/.test(loader),'Dashboard resmî günler için kataloğu yüklemeli.');

/* Ayet · hadis · özlü söz tek kartta, aynı alanda sırayla (alt alta üç kart değil) */
assert(!/\bsayingText\b|\bsayingSource\b|SAYINGS\b|sayingSection\b|weeklySayingSection\b/.test(dash+settings+loader),'Eski tek söz yapısı ve üç ayrı kart kaldırılmalı.');
const cardsBlock=loader.slice(loader.indexOf('const DASHBOARD_CARDS=['),loader.indexOf('const CARD_OPTIONS='));
assert(cardsBlock.includes("key:'sozler',label:'Günün ayeti · hadisi · özlü sözü'")&&!/key:'(ayet|hadis|ozluSoz|saying)'/.test(cardsBlock),'DASHBOARD_CARDS tek söz kartı içermeli.');
assert((loader.match(/'sozler'/g)||[]).length===3,'Her iki rolün varsayılanında ve katalogda tek söz kartı olmalı.');
assert(dash.includes('sozler:dailySayingsSection')&&!/ayet:\(\)=>|hadis:\(\)=>|ozluSoz:\(\)=>/.test(dash),'CARD_RENDERERS tek söz kartı kullanmalı.');
assert(dash.includes('data-carousel="saying"')&&dash.includes('data-slide')&&dash.includes('data-slide-dot'),'Söz kartı slayt ve nokta içermeli.');
assert(dash.includes('stopCarousels();')&&dash.includes('startCarousels();'),'Otomatik geçiş zamanlayıcıları mount/unmount ile yönetilmeli.');
assert(dash.includes("prefers-reduced-motion"),'Hareket azaltma tercihinde otomatik geçiş durmalı.');
assert(/define\('dashboard',\[[^\]]*gunun-sozleri-veri\.js[^\]]*gunun-sozleri\.js[^\]]*dashboard\.js/.test(loader)&&/define\('settings',\[[^\]]*gunun-sozleri-veri\.js[^\]]*gunun-sozleri\.js[^\]]*settings\.js/.test(loader),'Dashboard ve Ayarlar söz verisini, ardından havuz modülünü yüklemeli.');
assert(!fs.existsSync('js/modules/hafta-sozleri.js')&&!/HaftaSozleri|hafta-sozleri|buHafta|haftaNo|Haftanın söz/.test(dash+settings+loader),'Eski haftalık söz modülü kaldırılmalı.');
assert(dash.includes('G.bugun(')&&dash.includes('aria-label="Günün sözleri"'),'Ana sayfa günün sözünü GununSozleri.bugun ile almalı.');
/* Ayarlar: havuz düzenleyici */
['data-soz-ara','data-soz-filtre','data-soz-sayac','data-soz-acik','data-soz-text','data-soz-src','data-soz-geri','data-soz-sifirla','data-soz-add','data-soz-remove','data-soz-bugun','data-soz-duz'].forEach(k=>assert(settings.includes(k),'Söz editörü '+k+' içermeli.'));
assert(/readSozHavuzu[\s\S]{0,1200}kapali[\s\S]{0,300}duzenle[\s\S]{0,300}ozel/.test(settings),'Söz havuzu kapali / duzenle / ozel olarak kaydedilmeli.');
assert(/const sozGorunum=[\s\S]{0,400}data-soz-ara[\s\S]{0,200}return true/.test(settings)&&/if\(sozGorunum\(e\.target\)\)return;if\(e\.target\.closest/.test(settings),'Arama ve süzgeç "değişti" durumunu işaretlememeli.');
assert(!/localStorage\s*\.\s*setItem/.test(fs.readFileSync('js/modules/gunun-sozleri.js','utf8')+fs.readFileSync('js/modules/gunun-sozleri-veri.js','utf8')),'Söz modülleri depolamaya yazmaz.');
const sozCss=css.split('\n').filter(l=>/\.ka-soz-/.test(l)).join('\n');
assert(sozCss.includes('.ka-soz-liste')&&!/\d(?:\.\d+)?px/.test(sozCss)&&!/#[0-9a-fA-F]{3,8}\b/.test(sozCss)&&!/\.ka-soz-(?:details|list)\b/.test(sozCss),'Söz editörü stilleri yalnız tasarım belirteçleriyle yazılmalı; eski kurallar kaldırılmalı.');
console.log('ana-sayfa-gunluk-sozler: OK');
