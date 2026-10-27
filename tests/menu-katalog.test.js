/* Menü kataloğu sözleşmesi: her sayfa mutlaka bir menüde görünür.
 *   • Katalog menüye göre gruplu yazılır; menüsüz sayfa yazılamaz.
 *   • Varsayılan düzen, rolün tüm sayfalarını tam bir kez içerir.
 *   • Kabukta yeni bir sayfa rotası eklenip kataloğa yazılmazsa bu test kırılır.
 *   • Kayıtlı (özelleştirilmiş) düzen güncel katalogla uzlaşır: eski sürüm sıfırlanır, yeni sayfa menüye eklenir. */
const fs=require('fs');
const assert=require('assert');
const {loadNav}=require('./helpers/app-nav');

/* vm içinden gelen diziler başka bir gerçekleme alanındadır; karşılaştırma düz JSON üzerinden yapılır. */
const plain=x=>JSON.parse(JSON.stringify(x===undefined?null:x));
const eq=(a,b,m)=>assert.deepStrictEqual(plain(a),plain(b),m);
const ROLES=['ogretmen','idareci'];
const {N}=loadNav();
const cat=N.catalog(),tree=N.menuTree();

/* ── katalog yapısı ── */
assert(cat.length>=73,'Katalog tüm sayfaları içermeli.');
eq(new Set(cat.map(t=>t.id)).size,cat.length,'Sayfa kimlikleri benzersiz olmalı.');
eq(new Set(tree.map(m=>m.id)).size,tree.length,'Menü kimlikleri benzersiz olmalı.');
cat.forEach(t=>{
  assert(t.label&&t.route,`${t.id}: ad ve rota zorunlu.`);
  assert(tree.some(m=>m.id===t.kat),`${t.id}: sayfa geçerli bir menüde yazılmalı (${t.kat}).`);
});
tree.forEach(m=>{
  assert(m.ad.length<=N.MENU_NAME_MAX,`${m.id}: menü adı en çok ${N.MENU_NAME_MAX} karakter.`);
  assert(N.MENU_ICONS.includes(m.icon)&&N.MENU_TONES.includes(m.tone),`${m.id}: simge/ton geçerli olmalı.`);
  assert(cat.some(t=>t.kat===m.id),`${m.id}: boş menü tanımlanmamalı.`);
});
const dup=fs.readFileSync('js/core/app-nav.js','utf8').replace("['guide','Kullanım Kılavuzu'","['about','Kullanım Kılavuzu'");
assert.notStrictEqual(dup,fs.readFileSync('js/core/app-nav.js','utf8'));
assert.throws(()=>loadNav({source:dup}),/iki kez yazılmış/,'Aynı sayfa iki kez yazılırsa katalog yüklenmemeli.');

/* ── varsayılan düzen: rolün her sayfası tam bir kez ── */
for(const r of ROLES){
  const def=N.defaultLayout(r),scope=N.scopeIds(r),flat=def.menus.flatMap(m=>m.ids);
  eq([...flat].sort(),[...scope].sort(),`${r}: varsayılan menüler rolün tüm sayfalarını tam bir kez içermeli.`);
  eq(N.menuOrder(r).slice().sort(),tree.map(m=>m.id).sort(),`${r}: menü sırası tüm menülerin bir sıralaması olmalı.`);
  def.menus.forEach(m=>assert(m.ids.length>=2,`${r}/${m.id}: menüde en az iki sayfa olmalı.`));
  eq(def.bar.length,5,`${r}: alt menü 5 yuva.`);
  assert(def.bar.includes('me')&&def.bar.includes('tools'),`${r}: Menü ve Ben alt menüde bulunmalı.`);
  def.bar.forEach(k=>assert(['home','program','tools','me'].includes(k)||(k.startsWith('menu:')&&def.menus.some(m=>m.id===k.slice(5)))||(k.startsWith('tool:')&&scope.includes(k.slice(5))),`${r}: geçersiz alt menü yuvası ${k}`));
  eq(N.inNoMenu(r).length,0,`${r}: varsayılan düzende menüsüz sayfa olmamalı.`);
}
eq(N.scopeIds('idareci').length,cat.length,'İdareci tüm sayfaları görür.');
assert(N.scopeIds('ogretmen').length<cat.length&&N.scopeIds('ogretmen').every(id=>!cat.find(t=>t.id===id).y),'Öğretmen yalnız yönetime özel olmayan sayfaları görür.');
const adminMenus=Object.fromEntries(N.defaultLayout('idareci').menus.map(m=>[m.id,m.ids]));
['grades','homework','rubric','project','form-maarif'].forEach(id=>assert(Object.values(adminMenus).some(ids=>ids.includes(id)),`İdareci menüsünde ${id} bulunmalı (eskiden eksikti).`));
['settings','guide','about'].forEach(id=>assert(adminMenus.ayar.includes(id),`${id} Ayarlar ve Yardım menüsünde olmalı.`));

/* ── etiketler ── */
eq([N.TAB_LABEL.home('ogretmen'),N.TAB_LABEL.home('idareci'),N.TAB_LABEL.tools('idareci'),N.TAB_LABEL.program('ogretmen'),N.TAB_LABEL.me('idareci')],['Ana Sayfa','Ana Sayfa','Menü','Programım','Ben'],'Alt çubuk adları.');
eq(N.hub().title,'Menü','Merkez sayfa başlığı Menü olmalı.');
eq(N.search('şök').map(t=>t.id),['form-sok'],'Eski kısaltmayla arama yeni sayfayı bulmalı.');
assert(N.search('tebliğ-tebellüğ').some(t=>t.id==='teblig'),'Tireli eski adla arama çalışmalı.');
assert(N.search('yoklama')[0].where.includes('Öğrenciler'),'Arama sonucu sayfanın menüsünü göstermeli.');

/* ── geri dönüş ve alt çubuk eşleşmesi ── */
eq(N.parentOf('settings',''),'me','Ayarlar menüde olsa da geri dönüşü Ben olmalı.');
eq(N.parentOf('academic','written'),'menu:sinav','Yazılı Sınavlar → Sınav ve Not menüsü.');
eq(N.tabOf('academic','written'),'tools','Alt çubukta sabit olmayan menünün sayfası Menü sekmesini aydınlatır.');
{
  const {N:T}=loadNav({user:{uid:'t1'}});
  eq(T.role(),'ogretmen','Yönetici olmayan hesap öğretmen arayüzü.');
  eq(T.parentOf('communication','messages'),'menu:iletisim','Alt çubukta sabit menü geri dönüş hedefi olmalı.');
  eq(T.tabOf('communication','messages'),'menu:iletisim');
}

/* ── rota kapsamı: kabuğa eklenen her sayfa kataloğa yazılmış olmalı ── */
const shell=fs.readFileSync('js/core/shell-ui.js','utf8'),loader=fs.readFileSync('js/app-loader.js','utf8');
const core=shell.slice(shell.indexOf('async function routeModuleCore'),shell.indexOf('/* ── alt sekmeler'));
const routes=new Set(cat.map(t=>t.route)),keys=new Set(cat.map(t=>`${t.route}:${t.page}`)),pages=new Set(cat.map(t=>t.page).filter(Boolean));
const standalone=[...core.matchAll(/^\s{2}if\(name==='([a-z-]+)'\)\{/gm)].map(m=>m[1]);
assert(standalone.length>=11,'Bağımsız rota taraması çalışmalı.');
standalone.forEach(n=>assert(routes.has(n),`Kabuktaki "${n}" rotası katalogda (app-nav.js KATALOG) bir menüye yazılmamış.`));
/* Kataloğa yazılmayan sayfa rotaları ve nedeni: Ayarlar > Veriler, Ayarlar sayfasının iç menüsünde durur. */
const PAGE_ROUTE_EXCEPTIONS=new Set(['data']);
const registered=[...new Set([...(loader+shell).matchAll(/registerPageRoute\('([a-z0-9-]+)'/g)].map(m=>m[1]))];
assert(registered.length>=10,'Sayfa rotası taraması çalışmalı.');
registered.forEach(p=>assert(PAGE_ROUTE_EXCEPTIONS.has(p)||pages.has(p)||routes.has(p),`registerPageRoute("${p}") katalogda bir menüye yazılmamış.`));
/* Bir sayfanın iç görünümleri: kendi katalog sayfasının içinde açılır, ayrıca menüde yer almaz. */
const INNER_VIEWS={
  management:['leave-annual','leave-health','leave-excuse','leave-other','leaves'],   /* İzin İşlemleri sekmeleri */
  transport:['classSeats'],                                                           /* Servis Oturma Planı görünümü */
  food:['weekly','monthly'],                                                          /* Yemek Menüsü günlük/haftalık/aylık görünümü */
  settings:['social','lesson-hours','users','statistics','account','sync','roles','app','reminders','storage']  /* Ayarlar iç menüsü */
};
for(const m of shell.matchAll(/name==='([a-z]+)'&&\[([^\]]+)\]\.includes\(page\)/g)){
  for(const p of m[2].matchAll(/'([^']+)'/g)){
    const ok=keys.has(`${m[1]}:${p[1]}`)||(INNER_VIEWS[m[1]]||[]).includes(p[1]);
    assert(ok,`Kabuktaki ${m[1]}/${p[1]} sayfası katalogda bir menüye yazılmamış (iç görünümse INNER_VIEWS'a gerekçeyle ekleyin).`);
  }
}

/* ── kayıtlı düzen: sürüm göçü ve yeni sayfa ── */
const K='ka-nav-layout:u1:idareci';
const defMenus=N.defaultLayout('idareci').menus;
const setOf=o=>JSON.parse(o);
{
  /* eski sürümlü (v yok) özel düzen: menüler ve çubuk yeni varsayılana döner, sık kullandıklar korunur, bir kez haber verilir */
  const old={menus:[{id:'okul',ad:'Okul',icon:'school',tone:'indigo',ids:['teachers','staff']}],bar:['home','menu:okul','tools','menu:okul','me'],fav:['written','plans'],t:1};
  const {N:M,ls,calls}=loadNav({store:{[K]:JSON.stringify(old)}});
  const L=M.layoutRaw('idareci');
  eq(L.menus.map(m=>m.id),defMenus.map(m=>m.id),'Eski sürümlü düzen yeni varsayılan menülere döner.');
  eq(L.fav,['written','plans'],'Sık kullandıklar korunur.');
  eq(L.custom,false,'Sıfırlanan düzen özel sayılmaz.');
  const saved=setOf(ls.get(K));
  eq([saved.v,saved.menus,saved.bar],[M.LAYOUT_SURUM,undefined,undefined],'Kayıt yeni sürümle yazılır, eski menüler atılır.');
  eq(calls.toast.length,1,'Kullanıcıya bir kez haber verilir.');
  M.layoutRaw('idareci');M.menus('idareci');
  eq(calls.toast.length,1,'Haber tekrarlanmaz.');
}
{
  /* güncel sürümlü özel düzen + katalogda sonradan eklenen sayfalar → kendi menülerine eklenir; çıkarılan sayfa geri gelmez */
  const noGrades=defMenus.map(m=>({...m,ids:m.ids.filter(id=>id!=='grades')}));
  const withoutAyar=noGrades.filter(m=>m.id!=='ayar');
  const known=N.scopeIds('idareci').filter(id=>!['guide','about','written'].includes(id));
  const cur={v:N.LAYOUT_SURUM,menus:withoutAyar.map(m=>({...m,ids:m.ids.filter(id=>id!=='written')})),bar:N.defaultLayout('idareci').bar,gorulen:known,t:1};
  const {N:M,ls}=loadNav({store:{[K]:JSON.stringify(cur)}});
  const L=M.layoutRaw('idareci'),where=id=>L.menus.filter(m=>m.ids.includes(id)).map(m=>m.id);
  eq(where('written'),['sinav'],'Yeni sayfa kendi menüsüne eklenir.');
  eq(where('guide'),['diger'],'Menüsü silinmiş kullanıcıda yeni sayfa "Diğer sayfalar"a düşer.');
  eq(where('about'),['diger']);
  eq(L.menus.find(m=>m.id==='diger').ad,'Diğer sayfalar');
  eq(where('grades'),[],'Kullanıcının çıkardığı sayfa geri gelmez (gorulen içinde).');
  assert(setOf(ls.get(K)).gorulen.includes('written'),'Eklenen sayfa görülen listesine yazılır.');
  eq(M.inNoMenu('idareci').map(t=>t.id),['settings','grades'],'Kullanıcının çıkardığı/sildirdiği sayfalar menüsüz olarak sayılır.');
  /* "Hepsini uygun menüye ekle": kendi menüsü varsa orada, yoksa Diğer sayfalar'da */
  eq(M.placeOrphans('idareci'),2,'placeOrphans menüsüz sayfaları yerleştirir.');
  const P=M.layoutRaw('idareci');
  eq(P.menus.find(m=>m.id==='sinav').ids.includes('grades'),true);
  eq(P.menus.find(m=>m.id==='diger').ids.includes('settings'),true);
  eq(M.inNoMenu('idareci').length,0);
  eq(M.placeOrphans('idareci'),0,'Eklenecek sayfa kalmadıysa 0.');
}
{
  /* saveLayout: sürüm ve görülen sayfaları yazar; kullanıcı düzeni sonraki okumada aynen gelir */
  const {N:M,ls}=loadNav();
  const L=M.layoutRaw('idareci');
  L.menus=L.menus.map(m=>m.id==='okul'?{...m,ad:'Okulum'}:m);
  M.saveLayout(L,'idareci');
  const saved=setOf(ls.get(K));
  eq([saved.v,saved.gorulen.length],[M.LAYOUT_SURUM,M.scopeIds('idareci').length]);
  eq(M.layoutRaw('idareci').menus.find(m=>m.id==='okul').ad,'Okulum','Kullanıcının menü adı korunur.');
  eq(M.layoutRaw('idareci').custom,true);
  M.resetLayout('idareci');
  eq(M.layoutRaw('idareci').menus.find(m=>m.id==='okul').ad,'Okul','Varsayılana dönüş.');
}
console.log('Menü kataloğu sözleşmesi geçti: her sayfa menüde.');
