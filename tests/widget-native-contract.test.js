/* Android widget kaynak sözleşmesi: derleme (aapt/javac) CI'da yapılır; burada yaygın hatalar —
 * olmayan kaynak adı, manifestte eksik alıcı, plugin metodu uyuşmazlığı — daha önce yakalanır. */
const fs=require('fs'),path=require('path'),assert=require('assert');
const kok='android/app/src/main/',res=kok+'res/',java=kok+'java/com/koruk/okul/';
const oku=f=>fs.readFileSync(f,'utf8');
const adlar=(dir,uz)=>fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith(uz)).map(f=>f.slice(0,-uz.length)):[];

const layoutlar=new Set(adlar(res+'layout','.xml')),drawable=new Set(adlar(res+'drawable','.xml')),xmller=new Set(adlar(res+'xml','.xml'));
const idler=new Set();for(const l of layoutlar)for(const m of oku(res+'layout/'+l+'.xml').matchAll(/@\+id\/(\w+)/g))idler.add(m[1]);
const dizgeler=new Set([...oku(res+'values/strings.xml').matchAll(/<string name="(\w+)"/g)].map(m=>m[1]));
const javaDosyalari=adlar(java,'.java');

/* 1) Java kodundaki R.* başvuruları gerçekten var */
for(const j of javaDosyalari){
  const k=oku(java+j+'.java');
  for(const m of k.matchAll(/\bR\.(id|layout|drawable|string)\.(\w+)/g)){
    const [,tur,ad]=m;
    const var_=tur==='id'?idler.has(ad):tur==='layout'?layoutlar.has(ad):tur==='drawable'?drawable.has(ad)||fs.existsSync(res+'mipmap-xxhdpi/'+ad+'.png')||fs.existsSync(res+'drawable/'+ad+'.png'):dizgeler.has(ad);
    assert(var_,`${j}.java: R.${tur}.${ad} kaynağı yok`);
  }
}
/* 2) XML kaynaklarındaki @layout/@xml/@string/@drawable başvuruları var */
const xmlYollari=[...layoutlar].map(l=>res+'layout/'+l+'.xml').concat([...xmller].map(x=>res+'xml/'+x+'.xml'),[...drawable].map(d=>res+'drawable/'+d+'.xml'),[kok+'AndroidManifest.xml']);
for(const f of xmlYollari)for(const m of oku(f).matchAll(/@(layout|xml|string|drawable)\/(\w+)/g)){
  const [,tur,ad]=m;
  const var_=tur==='layout'?layoutlar.has(ad):tur==='xml'?xmller.has(ad):tur==='string'?dizgeler.has(ad):(drawable.has(ad)||fs.existsSync(res+'drawable/'+ad+'.png'));
  assert(var_,`${f}: @${tur}/${ad} yok`);
}
/* 3) Manifest: sekiz widget alıcısı + liste servisi */
const man=oku(kok+'AndroidManifest.xml');
const beklenen=['DersZiliWidget','BugunumWidget','OkulWidget','EtkinliklerWidget','HavaZilWidget','ModernDersZiliWidget','NobetimWidget','YemekWidget'];
for(const c of beklenen){
  assert(new RegExp(`<receiver[^>]*android:name="\\.${c}"`).test(man),`Manifestte ${c} alıcısı yok`);
  assert(javaDosyalari.includes(c),`${c}.java yok`);
}
for(const m of man.matchAll(/<receiver[^>]*android:name="\.(\w+)"[\s\S]*?android:resource="@xml\/(\w+)"/g)){
  const [,sinif,info]=m;
  if(!beklenen.includes(sinif))continue;
  const x=oku(res+'xml/'+info+'.xml');
  assert(x.includes('android:configure="com.koruk.okul.WidgetThemeConfigActivity"'),`${info}: tema seçici (configure) bağlı olmalı`);
  assert(/android:description="@string\/\w+"/.test(x),`${info}: widget açıklaması olmalı`);
  assert(/android:targetCellWidth/.test(x)&&/android:resizeMode="horizontal\|vertical"/.test(x),`${info}: hücre boyutu ve yeniden boyutlandırma tanımlı olmalı`);
}
assert(/<service[^>]*android:name="\.OkulAkisServisi"[^>]*BIND_REMOTEVIEWS|<service[^>]*BIND_REMOTEVIEWS[^>]*android:name="\.OkulAkisServisi"/.test(man.replace(/\s+/g,' ')),'OkulAkisServisi BIND_REMOTEVIEWS izniyle tanımlı olmalı');
/* 4) Bitmap widget'ları ortak tabandan türer ve gerekli soyut yöntemleri verir */
for(const c of beklenen.filter(c=>c!=='OkulWidget')){
  const k=oku(java+c+'.java');
  assert(/extends GorselWidget/.test(k),`${c} GorselWidget'tan türemeli`);
  for(const y of ['ciz(','sozlu(','hedefSayfa()','istekKodu()','varsayilanGenislik()','varsayilanYukseklik()'])assert(k.includes(y),`${c}: ${y} yok`);
}
const kodlar=beklenen.filter(c=>c!=='OkulWidget').map(c=>oku(java+c+'.java').match(/istekKodu\(\)\s*\{\s*return\s+(\d+);/)?.[1]);
assert.strictEqual(new Set(kodlar).size,kodlar.length,'istekKodu değerleri benzersiz olmalı (PendingIntent çakışmasın)');
/* 5) Dokunma hedefleri shell sayfa kimlikleridir */
const nav=oku('js/core/app-nav.js'),adapter=oku('js/core/platform/widget-adapter.js');
for(const c of beklenen.filter(c=>c!=='OkulWidget')){
  const h=oku(java+c+'.java').match(/hedefSayfa\(\)\s*\{\s*return\s+"([\w-]+)"/)?.[1];
  assert(h&&nav.includes(`['${h}',`),`${c}: hedef sayfa '${h}' app-nav.js kataloğunda yok`);
}
for(const m of adapter.matchAll(/sayfa:'([\w-]+)'/g))assert(nav.includes(`['${m[1]}',`),`widget-adapter sayfa '${m[1]}' app-nav.js kataloğunda yok`);
/* 6) JS → plugin köprüsü: adaptörün çağırdığı her plugin metodu WidgetPlugin'de @PluginMethod */
const plugin=oku(java+'WidgetPlugin.java');
for(const m of adapter.matchAll(/p\.(\w+Guncelle)\b/g))assert(new RegExp(`@PluginMethod\\s+public void ${m[1]}\\(`).test(plugin),`WidgetPlugin.${m[1]} yok`);
/* 7) Çizim: tema paleti ve sarı üstü koyu yazı */
const cizici=oku(java+'WidgetCizici.java');
assert(cizici.includes('vurguUstu')&&!/setColor\(Color\.WHITE\)/.test(cizici),'Sarı dolgu üzerinde koyu yazı (vurguUstu) kullanılmalı');
const tema=oku(java+'WidgetTheme.java');
assert(/public static Palet palet\(Context c,int id\)/.test(tema)&&tema.includes('isDark(c,id)')&&tema.includes('isTransparent(c,id)'),'Palet açık/koyu/yarı saydam seçeneğini izlemeli');
console.log('Android widget kaynak sözleşmesi başarılı.');
