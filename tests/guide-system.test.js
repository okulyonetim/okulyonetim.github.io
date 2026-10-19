/* Kullanım Kılavuzu / "Nasıl Kullanılır?" / Uygulama Hakkında sistemi için sözleşme testleri.
 * Kapsam: içerik tutarlılığı (veri ↔ görüntü ↔ işaret konumları), yetkiyi aşmayan görünürlük, bağlam eşleştirme,
 * arama, kişisel veri / bağlantı güvenliği, tema kuralları ve kabuğa/service worker'a bağlanma. */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const {execSync}=require('child_process');

const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

/* ---------- veri dosyasını yükle ---------- */
const dataSrc=read('js/modules/guide-data.js');
const dataWin={};dataWin.window=dataWin;
vm.runInNewContext(dataSrc,dataWin);
const D=dataWin.KorukGuideData;
assert(D&&Array.isArray(D.konular)&&D.konular.length>=10,'guide-data.js KorukGuideData.konular dolu olmalı');

/* ---------- 1) içerik tutarlılığı ---------- */
const catIds=new Set(D.kategoriler.map(c=>c.id));
const topicIds=new Set();
for(const t of D.konular){
  assert(!topicIds.has(t.id),'Konu kimliği tekrar ediyor: '+t.id);topicIds.add(t.id);
  for(const f of['baslik','ozet','ne','kategori'])assert(t[f]&&String(t[f]).trim(),`${t.id}: ${f} boş`);
  assert(catIds.has(t.kategori),`${t.id}: bilinmeyen kategori ${t.kategori}`);
  assert(Array.isArray(t.rota)&&t.rota.length>=1&&typeof t.rota[0]==='string',`${t.id}: rota [modül,sayfa] olmalı`);
  assert(Array.isArray(t.eslesme)&&t.eslesme.length,`${t.id}: eslesme boş`);
  assert(Array.isArray(t.adimlar)&&t.adimlar.length>=3,`${t.id}: en az 3 adım olmalı`);
  assert(t.kayit&&String(t.kayit).trim(),`${t.id}: "kayıt/sonuç" açıklaması eksik`);
  const screenIds=new Set();
  for(const e of t.ekranlar||[]){
    assert(!screenIds.has(e.id),`${t.id}: ekran kimliği tekrar ediyor ${e.id}`);screenIds.add(e.id);
    assert(/^[a-z0-9-]+\.webp$/.test(e.dosya||''),`${e.id}: dosya adı .webp olmalı`);
    assert(e.alt&&e.alt.length>10,`${e.id}: görsel alt metni eksik`);
    assert(Array.isArray(e.isaretler)&&e.isaretler.length>=1,`${e.id}: işaret yok`);
    e.isaretler.forEach((m,i)=>{
      assert.strictEqual(m.n,i+1,`${e.id}: işaret numaraları 1'den ardışık olmalı`);
      assert(m.baslik&&m.aciklama,`${e.id}: işaret ${m.n} başlık/açıklama eksik`);
      assert(m.sec,`${e.id}: işaret ${m.n} için seçici (sec) yok; konum otomatik üretilemez`);
    });
    /* gerçek görüntü dosyası + işaret konumları */
    const file=path.join(root,'assets/guide',e.dosya);
    assert(fs.existsSync(file),`${e.id}: assets/guide/${e.dosya} yok (ekran görüntüsü üretilmemiş)`);
    const buf=fs.readFileSync(file);
    assert(buf.length>2048&&buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP',`${e.dosya}: geçerli bir WebP değil`);
    const g=D.geometri[e.id];
    assert(Array.isArray(g)&&g.length===e.isaretler.length,`${e.id}: işaret konumları (geometri) ${e.isaretler.length} adet olmalı — "python3 scripts/guide-build.py shots" çalıştırın`);
    for(const r of g){
      assert(r.length===4&&r.every(Number.isFinite),`${e.id}: geçersiz konum`);
      assert(r[0]>=0&&r[1]>=0&&r[2]>0&&r[3]>0&&r[0]+r[2]<=100.5&&r[1]+r[3]<=100.5,`${e.id}: işaret görüntü dışına taşıyor ${JSON.stringify(r)}`);
    }
  }
  t.adimlar.forEach((a,i)=>{
    assert(a.baslik&&a.metin,`${t.id}: adım ${i+1} başlık/metin eksik`);
    if(a.ekran){
      assert(screenIds.has(a.ekran),`${t.id}: adım ${i+1} bilinmeyen ekrana bağlı: ${a.ekran}`);
      if(a.isaret){const e=t.ekranlar.find(x=>x.id===a.ekran);assert(e.isaretler.some(m=>m.n===a.isaret),`${t.id}: adım ${i+1} olmayan işarete bağlı (${a.ekran} #${a.isaret})`)}
    }
  });
  for(const r of t.iliskili||[])assert(topicIds.has(r)||D.konular.some(x=>x.id===r),`${t.id}: bilinmeyen ilişkili konu ${r}`);
  for(const s of t.sorunlar||[])assert(s.s&&s.c,`${t.id}: sorun/çözüm boş`);
}
/* görüntü dosyası artığı (veride tanımlı olmayan webp) bırakılmamalı */
const used=new Set(D.konular.flatMap(t=>(t.ekranlar||[]).map(e=>e.dosya)));
for(const f of fs.readdirSync(path.join(root,'assets/guide')).filter(f=>f.endsWith('.webp')))assert(used.has(f),`assets/guide/${f} hiçbir ekranda kullanılmıyor`);
assert(D.sss.length>=3&&D.sss.every(x=>x.s&&x.c),'SSS içeriği eksik');
assert(D.sorunlar.length>=3&&D.sorunlar.every(x=>x.s&&x.c),'Sorun giderme içeriği eksik');

/* ---------- 2) güncelleme notları gerçek kayıttan gelmeli ---------- */
assert(D.surumNotlari.length>=3&&D.surumNotKaynagi,'Sürüm notları ve kaynağı bulunmalı');
const verRe=/^\d+\.\d+\.\d+$/;
for(const n of D.surumNotlari){
  assert(verRe.test(n.surum)&&/^\d{4}-\d{2}-\d{2}$/.test(n.tarih)&&n.maddeler.length,'Geçersiz sürüm notu: '+JSON.stringify(n));
  try{execSync(`git cat-file -e ${n.commit}^{commit}`,{cwd:root,stdio:'ignore'})}
  catch(err){if(fs.existsSync(path.join(root,'.git')))assert.fail(`Sürüm notundaki commit depoda yok: ${n.commit}`)}
}

/* ---------- 3) kişisel veri ve bağlantı güvenliği ---------- */
const seedSrc=read('scripts/guide-seed.js');
for(const [name,src] of [['guide-data.js',dataSrc],['guide-seed.js',seedSrc]]){
  for(const m of src.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g))assert(/@example\.com$/.test(m[0]),`${name}: gerçek e-posta olabilir: ${m[0]}`);
  for(const m of src.matchAll(/(?<![\d.])(?:\+90|0)\s?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}(?!\d)/g))assert(/^0555 000 /.test(m[0]),`${name}: gerçek telefon olabilir: ${m[0]}`);
  assert(!/(?<!\d)\d{11}(?!\d)/.test(src.replace(/\/\*GEO:BEGIN\*\/[\s\S]*?\/\*GEO:END\*\//,'')),`${name}: 11 haneli sayı (TC kimlik no benzeri) var`);
  assert(!/AIza[0-9A-Za-z_-]{20,}|BEGIN (?:RSA )?PRIVATE KEY|apiKey|authDomain|firebaseConfig/i.test(src),`${name}: gizli anahtar / Firebase yapılandırması olamaz`);
}
const allowedUrl=/^https:\/\/(?:sedonet23\.github\.io\/okul\/?|github\.com\/okulyonetim\/(?:okulyonetim\.github\.io|optikokuyucu)(?:\/[\w./%-]*)?)$/;
const urls=[...dataSrc.matchAll(/https?:\/\/[A-Za-z0-9][^\s'"`)<>]*/g)].map(m=>m[0]);
assert(urls.length>=3,'Bağlantılar (web, APK, Optik Okuyucu) bulunmalı');
for(const u of urls)assert(allowedUrl.test(u),'İzin verilmeyen bağlantı: '+u);
assert.strictEqual(D.baglantilar.web,'https://sedonet23.github.io/okul/');
assert.strictEqual(D.baglantilar.apk,'https://github.com/okulyonetim/okulyonetim.github.io/releases/latest/download/app-release.apk');
assert.strictEqual(D.baglantilar.optik.apk,'https://github.com/okulyonetim/optikokuyucu/releases/latest/download/optik-okuyucu.apk');
assert.strictEqual(D.baglantilar.pdf,'assets/guide/Koruk_Asistan_Kullanim_Kilavuzu.pdf','PDF kılavuzunun statik adresi tanımlı olmalı');
assert(fs.existsSync(path.join(root,'scripts/guide_pdf.py')),'PDF üreticisi bulunmalı');
assert(/guide_pdf\.build_pdf\(ROOT\)/.test(read('scripts/guide-build.py')),'guide-build.py PDF üreticisini çalıştırmalı');
assert(/def draw_marks\(/.test(read('scripts/guide_pdf.py'))&&/geometri/.test(read('scripts/guide_pdf.py')),'PDF üreticisi numaralı işaretleri görsellerin üzerine çizmeli');

/* ---------- 4) guide.js statik sözleşmesi: veri yazmaz, Firestore'a bağlanmaz, temayı bozmaz ---------- */
const guideSrc=read('js/modules/guide.js');
new Function(guideSrc);
const guideCode=guideSrc.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');   // yalnızca çalışan kod taranır (açıklamalar hariç)
for(const bad of[/onSnapshot|\.collection\(|\bfirestore\b|\bfirebase\b|\bgetDoc|\bsetDoc|updateDoc|deleteDoc/i,/AppStore\.set|DeviceData|localStorage\.setItem|indexedDB/,/Capacitor|Filesystem|@capacitor/,/#[0-9a-fA-F]{3,8}\b/,/\.style\.(?:color|background)/,/<style[\s>]/,/style="[^"]*(?:color|background)\s*:/,/location\.reload|location\.href\s*=|history\.(?:push|replace)State/])
  assert(!bad.test(guideCode),'guide.js yasak desen içeriyor: '+bad);
for(const need of['KorukGuide','contextKey','topicFor','visibleTopics','canOpen','openContext','mountPage','mountAbout','aria-modal','Escape'])
  assert(guideSrc.includes(need),'guide.js içinde eksik: '+need);
assert(/rel=["']?noopener|rel="noopener/.test(guideSrc),'Dış bağlantılar noopener kullanmalı');

/* ---------- 5) davranış: bağlam eşleştirme, yetki süzme, arama ---------- */
function loadGuide(allowed){
  const win={};win.window=win;win.document={};
  win.ShellUI={canOpen:(name)=>allowed==='all'||allowed.includes(name)};
  win.KorukGuideData=D;
  vm.runInNewContext(guideSrc,win);
  return win.KorukGuide;
}
const G=loadGuide('all');
assert.strictEqual(G.contextKey(null),'dashboard:');
assert.strictEqual(G.contextKey({kind:'route',name:'people',page:'teachers'}),'people:teachers');
assert.strictEqual(G.contextKey({kind:'route',name:'settings'}),'settings:');
assert.strictEqual(G.contextKey({kind:'menu-list'}),'view:menu-list');
const map={'people:teachers':'ogretmenler','people:students':'ogrenciler','people:classes':'siniflar','academic:schedule':'ders-programi','management:duty':'nobet-programi','communication:announcements':'duyurular','documents:evrak':'evrak-takibi','reports:home':'okul-raporlari','reports:':'okul-raporlari','settings:':'ayarlar-veriler','dashboard:':'ana-ekran','dashboard:guide':'kilavuz','dashboard:about':'hakkinda','view:menu-list':'giris-gezinme'};
for(const [key,id] of Object.entries(map)){const t=G.topicFor(key);assert(t&&t.id===id,`topicFor(${key}) → ${t&&t.id}, beklenen ${id}`)}
assert.strictEqual(G.topicFor('exams:written'),null,'Rehberi olmayan sayfa null dönmeli (pencere "bulunamadı" mesajı gösterir)');
/* her konunun kendi rotası kendi rehberine götürmeli */
for(const t of D.konular){const key=`${t.rota[0]}:${t.rota[1]||''}`;const hit=G.topicFor(key);assert(hit,`${t.id}: rotası (${key}) hiçbir konuyla eşleşmiyor`)}

assert.strictEqual(G.visibleTopics().length,D.konular.length,'Tüm yetkilerle tüm konular görünmeli');
const limited=loadGuide(['dashboard']);
const vis=limited.visibleTopics().map(t=>t.id);
for(const id of['ogretmenler','ogrenciler','siniflar','ders-programi','nobet-programi','duyurular','evrak-takibi','okul-raporlari'])assert(!vis.includes(id),`Yetkisiz kullanıcıya ${id} rehberi listelenmemeli`);
assert(vis.includes('hakkinda'),'"herkes" işaretli Uygulama Hakkında her kullanıcıya görünmeli');
assert(limited.search('öğretmen').every(t=>vis.includes(t.id)),'Arama yetki dışı rehberi döndürmemeli');
const none=loadGuide([]);
assert(none.visibleTopics().some(t=>t.id==='hakkinda'),'Hiç yetkisi olmayan kullanıcı da Hakkında sayfasını görmeli');

assert(G.search('nöbet').some(t=>t.id==='nobet-programi'),'Arama "nöbet" bulmalı');
assert(G.search('NOBET').some(t=>t.id==='nobet-programi'),'Arama büyük/küçük harf ve Türkçe karakterden bağımsız olmalı');
assert(G.search('ogretmen')[0].id==='ogretmenler'||G.search('ogretmen').some(t=>t.id==='ogretmenler'),'Arama "ogretmen" (i/ı, ö/o) bulmalı');
assert.strictEqual(G.search('xqzvwy').length,0,'Alakasız arama sonuç dönmemeli');
assert.strictEqual(G.search('').length,D.konular.length,'Boş arama tüm rehberleri döndürmeli');
assert(G.search('',{cat:'iletisim'}).every(t=>t.kategori==='iletisim'),'Kategori süzgeci çalışmalı');

/* ---------- 6) kabuğa bağlanma: "?" düğmesi, rota, menü, yükleyici, service worker ---------- */
for(const page of['index.html','beta.html']){
  const html=read(page);
  assert(/data-ka-guide-help/.test(html),`${page}: üst çubukta "?" (data-ka-guide-help) düğmesi yok`);
  assert(/aria-label="Nasıl kullanılır\?"/.test(html),`${page}: "?" düğmesinin erişilebilir adı olmalı`);
}
const shell=read('js/core/shell-ui.js');
assert(/registerPageRoute\('guide'/.test(shell)&&/registerPageRoute\('about'/.test(shell),'guide/about sayfa rotaları kayıtlı olmalı');
assert(/data-ka-guide-help/.test(shell)&&/openGuideHelp/.test(shell),'Kabuk "?" düğmesini işlemeli');
assert(/\['Kullanım Kılavuzu','📖','dashboard','guide'\]/.test(read('js/app-loader.js')),'Menüde Kullanım Kılavuzu öğesi olmalı');
assert(/\['Uygulama Hakkında','ℹ️','dashboard','about'\]/.test(read('js/app-loader.js')),'Menüde Uygulama Hakkında öğesi olmalı');
assert(/define\('guide',\['js\/modules\/guide-data\.js\?v=\d+','js\/modules\/guide\.js\?v=\d+'\]\)/.test(read('js/app-loader.js')),'AppLoader guide modülünü tanımlamalı');
const sw=read('service-worker.js');
assert(sw.includes('./js/modules/guide-data.js?v=')&&sw.includes('./js/modules/guide.js?v='),'Service worker kılavuz dosyalarını ön belleğe almalı (çevrimdışı çalışsın)');

/* ---------- 7) tema: yalnızca merkezî ka-* değişkenleri ---------- */
const css=read('css/design-system.css');
const start=css.indexOf('html.ka-guide-lock');
assert(start>0,'ka-guide CSS bloğu design-system.css içinde olmalı');
const block=css.slice(start);
assert(!/#[0-9a-fA-F]{3,8}\b/.test(block.replace(/&#\d+;/g,'')),'ka-guide CSS bloğunda sabit renk (hex) olmamalı');
assert(!/\brgba?\(\s*\d/.test(block),'ka-guide CSS bloğunda sabit rgb() olmamalı; --ka-* değişkenleri kullanın');
assert(/--ka-/.test(block),'ka-guide CSS bloğu --ka-* değişkenlerini kullanmalı');

console.log('guide-system.test.js OK — '+D.konular.length+' konu, '+Object.keys(D.geometri).length+' ekran görüntüsü doğrulandı');
