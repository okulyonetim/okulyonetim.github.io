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

/* ── menü düzeni: sekmeli/çok sayfalı araç yok; her sayfa ayrı, menüleri ve alt menüyü kullanıcı seçer ── */
const pagesSrc=fs.readFileSync('js/core/nav-pages.js','utf8');
const editorSrc=fs.readFileSync('js/core/nav-editor.js','utf8');
assert(!/\bSUITES\b|suiteOf|suiteTool|renderSuiteBar|ka-suite/.test(src+pagesSrc+fs.readFileSync('css/design-system-base.css','utf8')),'Çok sayfalı (sekmeli) araç yapısı kalmamalı; her sayfa ayrı araçtır.');
assert(!/\bGROUPS\b|\bCOMM_IDS\b|\bPROGRAM_IDS\b|key:'personel',label:'Personel işlemleri'/.test(src),'Eski sabit grup/sekme tabloları kalmamalı; menüler DEFAULT_LAYOUT ve kullanıcı düzeninden gelir.');
const toolIds=new Set(nav.AppNav.catalog().map(t=>t.id));
const defs={ogretmen:nav.AppNav.defaultLayout('ogretmen'),idareci:nav.AppNav.defaultLayout('idareci')};
for(const [role,def] of Object.entries(defs)){
  assert.strictEqual(def.bar.length,5,`${role}: alt menü 5 yuvadan oluşmalı.`);
  assert(def.bar.includes('me'),`${role}: Ben sayfası alt menüde bulunmalı.`);
  assert.strictEqual(new Set(def.bar).size,5,`${role}: alt menüde aynı yuva iki kez olmamalı.`);
  const menuIds=def.menus.map(m=>m.id);
  assert.strictEqual(new Set(menuIds).size,menuIds.length,`${role}: menü kimlikleri benzersiz olmalı.`);
  def.bar.filter(k=>k.startsWith('menu:')).forEach(k=>assert(menuIds.includes(k.slice(5)),`${role}: alt menüdeki ${k} tanımlı bir menü olmalı.`));
  def.menus.forEach(m=>{
    assert(m.ad&&m.ids.length>=2,`${role}/${m.id}: menüde en az iki sayfa olmalı.`);
    assert.strictEqual(new Set(m.ids).size,m.ids.length,`${role}/${m.id}: aynı sayfa bir menüde iki kez olmamalı.`);
    m.ids.forEach(id=>assert(toolIds.has(id),`${role}/${m.id}: "${id}" araç kataloğunda yok.`));
  });
}
const adminIds=new Set(defs.idareci.menus.flatMap(m=>m.ids)),teacherIds=new Set(defs.ogretmen.menus.flatMap(m=>m.ids));
['monthflow','tasks','evrak-teslim','evrak-teblig-donem1','evrak-teblig-sonu','staff-leaves','puantaj','dilekce-izin','attendance','teblig','diploma-request','diploma-response','documents','pdf-images','pdf-merge','written','trial','results','plans','bep-hazirla','form-bep']
  .forEach(id=>assert(adminIds.has(id),`İdareci varsayılan menüsünde "${id}" ayrı bir sayfa olarak yer almalı.`));
['plans','form-maarif','bep-hazirla','form-bep','written','tutanak','student-attendance'].forEach(id=>assert(teacherIds.has(id),`Öğretmen varsayılan menüsünde "${id}" bulunmalı.`));
assert(pagesSrc.includes('register(kind,def)')||pagesSrc.includes('const register='),'NavPages düzenleme sayfalarını register() ile almalı.');
['menu-edit','bar-pick','menu-add'].forEach(k=>assert(editorSrc.includes(`pages().register('${k}'`),`NavEditor ${k} sayfasını kaydetmeli.`));
['layoutRaw','saveLayout','resetLayout','defaultLayout','recent','noteOpened'].forEach(f=>assert(new RegExp(`\\b${f}\\b`).test(src.slice(src.indexOf('global.AppNav={'))),`AppNav ${f} dışa vermeli.`));
assert(src.includes('oy_kullaniciTercihleri')&&src.includes('remoteSet'),'Menü düzeni hesaba eşitlenmeli (kullanıcı tercih belgesi).');

/* ── Öğretmenden İstenecekler: üç sayfa, rota, izin ── */
const loader=fs.readFileSync('js/app-loader.js','utf8');
['evrak-teslim','evrak-teblig-donem1','evrak-teblig-sonu'].forEach(p=>{
  assert(loader.includes(`registerPageRoute('${p}'`),`${p} sayfa rotası kayıtlı olmalı.`);
  assert(src.includes(`'management:${p}'`),`${p} öğretmen hesabına kapalı olmalı.`);
  assert(fs.readFileSync('js/core/role-permission-bridge.js','utf8').includes(`'management:${p}':'management.evrakTeslim'`),`${p} yetkisi bridge'de tanımlı olmalı.`);
});
assert(loader.includes("['management.evrakTeslim'")&&loader.includes("['management.evrakTeslim.edit'"),'Yetki kataloğunda okuma ve düzenleme tanımlı olmalı.');
assert(fs.readFileSync('service-worker.js','utf8').includes('./js/modules/evrak-teslim.js?v='),'Modül önbelleğe alınmalı.');

/* ── evrak listeleri: her dönemin kendi listesi ── */
const katalogWin=load('js/modules/evrak-katalog.js');
const ev=load('js/modules/evrak-teslim.js',{EvrakKatalog:katalogWin.EvrakKatalog});
const page=ev.EvrakTeslimPage;
assert(page&&Array.isArray(page.KATALOG),'EvrakTeslimPage.KATALOG açık olmalı.');
const per={};page.KATALOG.forEach(e=>{(per[e.donem]=per[e.donem]||[]).push(e)});
assert.deepStrictEqual([per.basi.length,per.donem1.length,per.sonu.length],[62,33,26],'Sene başı 62, 1. dönem sonu 33, sene sonu 26 evrak içermeli.');
assert.strictEqual(new Set(page.KATALOG.map(e=>e.id)).size,page.KATALOG.length,'Evrak kimlikleri tüm dönemlerde benzersiz olmalı.');
[...per.donem1,...per.sonu].forEach(e=>assert(e.yazi&&e.yazi!==e.ad,`${e.id}: tebliğ yazısı için ayrı yazı metni olmalı.`));
assert(per.donem1.find(e=>/ŞÖK/.test(e.ad)).kimden==='rehber'&&per.sonu.find(e=>/zümre/.test(e.ad)).kimden==='zumre','ŞÖK sınıf rehberlerinden, zümre toplantısı zümre başkanlarından istenmeli.');
assert(per.donem1.filter(e=>e.grup==='rehberlik').every(e=>e.kimden==='herkes'),'Dönem sonu rehberlik evrakları herkesten istenir.');

/* ── çok sayfalı araç şeridi ── */
assert(fs.readFileSync('js/core/shell-ui.js','utf8').includes('replaceNext'),'routeModule replace seçeneğini desteklemeli.');
assert(!/ka-nav-group\b/.test(pagesSrc),'Eski grup satırı (ka-nav-group) ana menüden kaldırılmalı.');
assert(!/ka-nav-group\b/.test(fs.readFileSync('css/design-system-base.css','utf8')),'Eski grup satırı CSS’i kaldırılmalı.');
console.log('idareci menü + evrak teslim testleri geçti');
