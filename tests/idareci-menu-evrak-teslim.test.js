const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

/* ── yardımcı: tarayıcı olmadan bir core/modül dosyasını yükle ── */
function load(path,extra={}){
  const listeners=[];
  const win={addEventListener:(t,f)=>listeners.push([t,f]),dispatchEvent:()=>true,CustomEvent:function(){},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},...extra};
  win.window=win;
  vm.runInNewContext(fs.readFileSync(path,'utf8'),win,{filename:path});
  return win;
}

const nav=load('js/core/app-nav.js');
assert(nav.AppNav,'AppNav yüklenmeli.');
const src=fs.readFileSync('js/core/app-nav.js','utf8');

/* ── idareci menüsü: 9 kategori, kartlar ve çok sayfalı araçlar ── */
const idareciBlock=src.slice(src.indexOf("  idareci:[\n    {key:'yonetim'"),src.indexOf("const SUITES="));
const cats=[...idareciBlock.matchAll(/\{key:'(yonetim|evrak|mali|guvenlik|sinav|ogrenci|projeler|tasima|diger)',label:'([^']+)'/g)].map(m=>m[2]);
assert.deepStrictEqual(cats,['Genel Yönetim','Evrak - Özlük','Mali İşler','Güvenlik - Denetim','Sınav - Kurs','Öğrenci İşleri','Projeler','Taşıma - Pansiyon - Gezi','Diğer Araçlar'],'İdareci menüsü 9 kategoriye ayrılmalı.');
assert(!/key:'personel',label:'Personel işlemleri'/.test(src)&&!/key:'rapor',label:'Raporlar ve denetim'/.test(src),'Eski 4 gruplu idareci yapısı kaldırılmalı.');

const toolIds=new Set([...src.matchAll(/^ \['([a-z0-9-]+)','[^']+','[a-z]+','[a-z]+',/gm)].map(m=>m[1]));
const suites=Object.fromEntries([...src.matchAll(/'([a-z-]+)':\{label:'[^']+',tone:'[a-z]+',sub:'[^']+',pages:\[([^\]]+)\]\}/g)].map(m=>[m[1],[...m[2].matchAll(/'([a-z0-9-]+)'/g)].map(x=>x[1])]));
assert(Object.keys(suites).length>=6,'Çok sayfalı araçlar (SUITES) tanımlı olmalı.');
const used=new Map();
Object.entries(suites).forEach(([id,pages])=>{
  assert(pages.length>=2,`${id}: çok sayfalı araç en az 2 sayfa içermeli.`);
  pages.forEach(p=>{assert(toolIds.has(p),`${id}: sayfa "${p}" araç kataloğunda yok.`);assert(!used.has(p),`"${p}" iki araçta birden yer alıyor.`);used.set(p,id)});
});
const cardIds=[...idareciBlock.matchAll(/ids:\[([^\]]*)\]/g)].flatMap(m=>[...m[1].matchAll(/'([a-z0-9-]+)'/g)].map(x=>x[1]));
assert.strictEqual(new Set(cardIds).size,cardIds.length,'İdareci menüsünde aynı kart iki kez listelenmemeli.');
cardIds.forEach(id=>assert(toolIds.has(id)||suites[id],`Kart "${id}" ne araç ne de çok sayfalı araç.`));
cardIds.filter(id=>toolIds.has(id)).forEach(id=>assert(!used.has(id),`"${id}" hem kart hem bir aracın sayfası olamaz.`));

/* ── Öğretmenden İstenecekler: üç sayfa, rota, izin ── */
assert.deepStrictEqual(suites['ogretmenden-istenecekler'],['evrak-teslim','evrak-teblig-donem1','evrak-teblig-sonu'],'Öğretmenden İstenecekler sayfaları: çizelge + iki tebliğ yazısı.');
const loader=fs.readFileSync('js/app-loader.js','utf8');
['evrak-teslim','evrak-teblig-donem1','evrak-teblig-sonu'].forEach(p=>{
  assert(loader.includes(`registerPageRoute('${p}'`),`${p} sayfa rotası kayıtlı olmalı.`);
  assert(src.includes(`'management:${p}'`),`${p} öğretmen hesabına kapalı olmalı.`);
  assert(fs.readFileSync('js/core/role-permission-bridge.js','utf8').includes(`'management:${p}':'management.evrakTeslim'`),`${p} yetkisi bridge'de tanımlı olmalı.`);
});
assert(loader.includes("['management.evrakTeslim'")&&loader.includes("['management.evrakTeslim.edit'"),'Yetki kataloğunda okuma ve düzenleme tanımlı olmalı.');
assert(fs.readFileSync('service-worker.js','utf8').includes('./js/modules/evrak-teslim.js?v='),'Modül önbelleğe alınmalı.');

/* ── evrak listeleri: her dönemin kendi listesi ── */
const ev=load('js/modules/evrak-teslim.js');
const page=ev.EvrakTeslimPage;
assert(page&&Array.isArray(page.KATALOG),'EvrakTeslimPage.KATALOG açık olmalı.');
const per={};page.KATALOG.forEach(e=>{(per[e.donem]=per[e.donem]||[]).push(e)});
assert.deepStrictEqual([per.basi.length,per.donem1.length,per.sonu.length],[62,33,26],'Sene başı 62, 1. dönem sonu 33, sene sonu 26 evrak içermeli.');
assert.strictEqual(new Set(page.KATALOG.map(e=>e.id)).size,page.KATALOG.length,'Evrak kimlikleri tüm dönemlerde benzersiz olmalı.');
[...per.donem1,...per.sonu].forEach(e=>assert(e.yazi&&e.yazi!==e.ad,`${e.id}: tebliğ yazısı için ayrı yazı metni olmalı.`));
assert(per.donem1.find(e=>/ŞÖK/.test(e.ad)).kimden==='rehber'&&per.sonu.find(e=>/zümre/.test(e.ad)).kimden==='zumre','ŞÖK sınıf rehberlerinden, zümre toplantısı zümre başkanlarından istenmeli.');
assert(per.donem1.filter(e=>e.grup==='rehberlik').every(e=>e.kimden==='herkes'),'Dönem sonu rehberlik evrakları herkesten istenir.');

/* ── çok sayfalı araç şeridi ── */
const pages=fs.readFileSync('js/core/nav-pages.js','utf8');
assert(pages.includes('renderSuiteBar')&&pages.includes("'koruk:shell-route'")&&pages.includes('replace:true'),'Sayfa şeridi rota olayına bağlı olmalı ve sayfalar arası geçişte geri yığınını şişirmemeli.');
assert(fs.readFileSync('js/core/shell-ui.js','utf8').includes('replaceNext'),'routeModule replace seçeneğini desteklemeli.');
assert(!/ka-nav-group\b/.test(pages),'Eski grup satırı (ka-nav-group) ana menüden kaldırılmalı.');
assert(!/ka-nav-group\b/.test(fs.readFileSync('css/design-system-base.css','utf8')),'Eski grup satırı CSS’i kaldırılmalı.');
console.log('idareci menü + evrak teslim testleri geçti');
