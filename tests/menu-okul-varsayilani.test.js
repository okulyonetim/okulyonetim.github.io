/* Okul varsayılan menü düzeni sözleşmesi:
 *   • Okul varsayılanı yoksa varsayılan düzen katalogdakiyle aynıdır (davranış değişmez).
 *   • Yönetici bir rolün düzenini okul varsayılanı yapınca, kendi düzenini kaydetmemiş herkes onu görür; kendi düzeni olan etkilenmez.
 *   • "Varsayılana dön" okul varsayılanına döner.
 *   • Katalogdaki yeni sayfa okul varsayılanına da yerleşir (yazmadan); bilerek çıkarılan sayfa geri gelmez.
 *   • Bozuk okul varsayılanı katalog varsayılanına düşer.
 *   • Yayımlama ve kaldırma yalnız yöneticiye açıktır; yayımlayınca yöneticinin kendi kopyası kalkar.
 *   • AppConfig okul varsayılanını kaydederken düşürmez; kurallar yazmayı yöneticiye bırakır. */
const fs=require('fs');
const assert=require('assert');
const {loadNav}=require('./helpers/app-nav');

const plain=x=>JSON.parse(JSON.stringify(x===undefined?null:x));
const eq=(a,b,m)=>assert.deepStrictEqual(plain(a),plain(b),m);
const T='ogretmen',K=`ka-nav-layout:u1:${T}`;

/* Sahte AppConfig: loader'daki menuDefault / get / save sözleşmesini aynı biçimde sunar. */
function boot({user={uid:'u1',admin:true},menuVarsayilan}={}){
  const cfg={row:{id:'uygulama',menuVarsayilan:menuVarsayilan||{}},saves:[]};
  const row=o=>o&&typeof o==='object'&&!Array.isArray(o)&&Array.isArray(o.menus)?o:null;
  const AppConfig={
    menuDefault:r=>row(cfg.row.menuVarsayilan?.[r]),
    get:()=>({menuVarsayilan:{...cfg.row.menuVarsayilan}}),
    save:async p=>{cfg.saves.push(p);cfg.row={...cfg.row,...p};return cfg.row}
  };
  return{...loadNav({user,extra:{AppConfig}}),cfg};
}

/* Okul için hazırlanmış örnek düzen: menüler ters sırada, bir menü yeniden adlandırılmış, alt menü ve sık kullanılanlar farklı. */
function okulDuzeni(N,{gorulenEksik=[],cikar=[]}={}){
  const def=N.defaultLayout(T);
  const menus=def.menus.map(m=>({...m,ad:m.id==='ogrenci'?'Sınıfım':m.ad,ids:m.ids.filter(id=>!cikar.includes(id))})).filter(m=>m.ids.length).reverse();
  return{v:N.LAYOUT_SURUM,bar:['home','menu:ogrenci','tools','menu:sinav','me'],menus,fav:['plans','written'],gorulen:N.scopeIds(T).filter(id=>!gorulenEksik.includes(id)),t:1};
}

/* ── okul varsayılanı yokken davranış aynıdır ── */
{
  const {N,ls}=boot();
  const catalog=plain(N.defaultLayout(T));
  assert.strictEqual(N.hasSchoolDefault(T),false);
  const L=N.layoutRaw(T);
  eq([L.bar,L.menus,L.fav,L.custom],[catalog.bar,catalog.menus,catalog.fav,false],'Okul varsayılanı yokken katalog varsayılanı görünür.');
  assert.strictEqual(ls.size,0,'Okuma hiçbir şey yazmaz.');
}

/* ── okul varsayılanı: kayıtlı düzeni olmayan görür, öbür rol etkilenmez ── */
{
  const {N}=loadNav();
  const okul=okulDuzeni(N);
  const b=boot({menuVarsayilan:{[T]:okul}}),M=b.N;
  assert.strictEqual(M.hasSchoolDefault(T),true);
  assert.strictEqual(M.hasSchoolDefault('idareci'),false,'Yalnız yayımlanan rolün varsayılanı değişir.');
  const L=M.layoutRaw(T);
  eq(L.menus.map(m=>m.id),okul.menus.map(m=>m.id),'Okulun menü sırası geçerli.');
  eq(L.menus.find(m=>m.id==='ogrenci').ad,'Sınıfım','Okulun menü adı geçerli.');
  eq(L.bar,okul.bar,'Okulun alt menüsü geçerli.');
  eq(L.fav,okul.fav,'Okulun sık kullandıkları geçerli.');
  eq(L.custom,false,'Kişisel düzen yok sayılır; varsayılanı kullanıyor.');
  eq(M.defaultLayout(T).menus.map(m=>m.id),okul.menus.map(m=>m.id),'defaultLayout etkin varsayılanı verir.');
  eq(M.layoutRaw('idareci').menus,plain(N.defaultLayout('idareci').menus),'İdareci düzeni katalogdan gelir.');
  eq(M.tabs(T).map(t=>t.key),okul.bar,'Alt menü okulun yuvalarıyla dolar.');
  eq(M.menus(T).find(m=>m.id==='ogrenci').ad,'Sınıfım','Çözülmüş menüler de okul varsayılanını izler.');
}

/* ── kişisel düzen önceliklidir; varsayılana dönünce okulun düzeni gelir ── */
{
  const {N}=loadNav();
  const okul=okulDuzeni(N);
  const {N:M,ls}=boot({menuVarsayilan:{[T]:okul}});
  const kisisel=M.layoutRaw(T);
  kisisel.menus.find(m=>m.id==='ogrenci').ad='Benim';
  M.saveLayout(kisisel,T);
  eq(M.layoutRaw(T).menus.find(m=>m.id==='ogrenci').ad,'Benim','Kişisel düzen okulunkinin üstündedir.');
  eq(M.layoutRaw(T).custom,true);
  M.resetLayout(T);
  assert(!ls.has(K),'Sıfırlayınca kişisel kayıt silinir.');
  eq(M.layoutRaw(T).menus.find(m=>m.id==='ogrenci').ad,'Sınıfım','Varsayılana dönüş okulun düzenine döner.');
}

/* ── yeni sayfa okul varsayılanına yerleşir, yazılmaz; bilerek çıkarılan sayfa geri gelmez ── */
{
  const {N}=loadNav();
  const yeni='ortak-gorevler';
  const eksik=okulDuzeni(N,{gorulenEksik:[yeni],cikar:[yeni]});
  const b=boot({menuVarsayilan:{[T]:eksik}}),M=b.N;
  const ids=M.layoutRaw(T).menus.find(m=>m.id==='ortaksinav').ids;
  assert(ids.includes(yeni),'Okul varsayılanında olmayan yeni sayfa kendi menüsüne girer.');
  assert.strictEqual(b.ls.size,0,'Yerleştirme yalnız hesaplanır, cihaza yazılmaz.');

  const menusuz=okulDuzeni(N,{gorulenEksik:['ortak-gorevler','ortak-tutanak'],cikar:['ortak-gorevler','ortak-tutanak']});
  const c=boot({menuVarsayilan:{[T]:menusuz}}).N.layoutRaw(T);
  eq(c.menus.find(m=>m.id==='ortaksinav')?.ids,['ortak-gorevler','ortak-tutanak'],'Okulun hiç görmediği menü, sayfalarıyla birlikte eklenir.');

  const bilerek=okulDuzeni(N,{cikar:['plans']});
  const d=boot({menuVarsayilan:{[T]:bilerek}}).N.layoutRaw(T);
  assert(!d.menus.flatMap(m=>m.ids).includes('plans'),'Okulun bilerek çıkardığı sayfa geri gelmez.');
}

/* ── bozuk okul varsayılanı katalog varsayılanına düşer ── */
{
  const {N}=loadNav();
  const catalog=plain(N.defaultLayout(T));
  for(const bozuk of [{menus:[]},{menus:[{id:'x',ad:'',ids:['yok-boyle-sayfa']}]},{menus:'dizi-degil'},'metin',null]){
    const M=boot({menuVarsayilan:{[T]:bozuk}}).N;
    assert.strictEqual(M.hasSchoolDefault(T),false,`Bozuk kayıt yok sayılır: ${JSON.stringify(bozuk)}`);
    eq(M.layoutRaw(T).menus,catalog.menus);
  }
}

/* ── yayımla / kaldır: yalnız yönetici; yayımlayınca yöneticinin kendi kopyası kalkar ── */
(async()=>{
  const b=boot(),M=b.N;
  assert.strictEqual(M.canPublishDefault(),true);
  const L=M.layoutRaw(T);
  L.menus.reverse();
  L.bar=['home','menu:sinav','tools','menu:ogrenci','me'];
  M.saveLayout(L,T);
  assert(b.ls.has(K),'Yönetici önce kendi düzenini kaydetti.');
  const gorunen=plain(M.layoutRaw(T));
  await M.publishDefault(T);
  const kayit=b.cfg.row.menuVarsayilan[T];
  eq([kayit.v,kayit.bar,kayit.menus.map(m=>m.id),kayit.fav],[M.LAYOUT_SURUM,gorunen.bar,gorunen.menus.map(m=>m.id),gorunen.fav],'Hesaba yönetici düzeninin kopyası yazılır.');
  eq(kayit.gorulen.filter(x=>!x.startsWith('tasi:')).length,M.scopeIds(T).length,'Görülen sayfalar kaydedilir.');
  assert(!b.ls.has(K),'Yayımlayınca yöneticinin kendi kopyası kalkar.');
  eq(M.layoutRaw(T).menus,gorunen.menus,'Yönetici aynı düzeni artık okul varsayılanından görür.');
  eq(M.layoutRaw(T).custom,false);
  assert.strictEqual(M.hasSchoolDefault(T),true);

  /* başka bir kullanıcı (kayıtlı düzeni yok) aynı hesabın verisinden okul varsayılanını görür */
  const ogr=boot({user:{uid:'u2',admin:false},menuVarsayilan:b.cfg.row.menuVarsayilan}).N;
  eq(ogr.layoutRaw(T).menus.map(m=>m.id),gorunen.menus.map(m=>m.id),'Öğretmen yayımlanan düzeni görür.');
  eq(ogr.layoutRaw(T).bar,gorunen.bar);

  /* öbür rolün varsayılanı korunur; kaldırınca yalnız bu rol katalog varsayılanına döner */
  await M.publishDefault('idareci');
  eq(Object.keys(b.cfg.row.menuVarsayilan).sort(),['idareci','ogretmen'],'Her rol ayrı saklanır.');
  await M.clearDefault(T);
  eq(Object.keys(b.cfg.row.menuVarsayilan),['idareci'],'Kaldırma yalnız seçili rolü siler.');
  assert.strictEqual(M.hasSchoolDefault(T),false);
  eq(M.layoutRaw(T).menus,plain(loadNav().N.defaultLayout(T).menus),'Kaldırınca katalog varsayılanı gelir.');

  /* yönetici olmayan yayımlayamaz ve hiçbir şey kaydedilmez */
  const k=boot({user:{uid:'u3',admin:false}}),X=k.N;
  assert.strictEqual(X.canPublishDefault(),false);
  await assert.rejects(()=>X.publishDefault(T),/yetkisiz/);
  await assert.rejects(()=>X.clearDefault(T),/yetkisiz/);
  assert.strictEqual(k.cfg.saves.length,0,'Yetkisiz denemede kayıt yapılmaz.');

  /* ── kaynak sözleşmeleri ── */
  const loader=fs.readFileSync('js/app-loader.js','utf8'),rules=fs.readFileSync('firestore.rules','utf8'),editor=fs.readFileSync('js/core/nav-editor.js','utf8');
  assert(/menuVarsayilan:menuRows\(r\.menuVarsayilan\)/.test(loader),'appConfig() okul varsayılanını düşürmemeli; saveConfig tüm belgeyi yeniden yazar.');
  assert(/window\.AppConfig=\{[^}]*\bmenuDefault\b/.test(loader),'AppConfig.menuDefault dışa açılmalı.');
  assert(/match \/oy_navDuzeni\/\{id\}\s*\{\s*allow read: if girisYapmis\(\);\s*allow write: if adminMi\(\);/.test(rules),'Okul varsayılanı herkese okunur, yalnız yöneticiye yazılır.');
  assert(/canPublishDefault\(\)\?defaultHtml\(okul\)/.test(editor),'Yayımlama düğmeleri yalnız yöneticide görünür.');
  console.log('Okul varsayılan menü düzeni sözleşmesi geçti.');
})().catch(e=>{console.error(e);process.exit(1)});
