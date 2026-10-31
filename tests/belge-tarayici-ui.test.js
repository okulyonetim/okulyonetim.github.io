/* Belge Tarayıcı (Resimden PDF) arayüz sözleşmesi: dosyalar, bağlantılar, mimari kurallar, saf yardımcılar.
 * Görüntü işleme + PDF yazıcı ayrıca tests/belge-tarayici-core.test.js içinde sınanır. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');
const ui=read('js/modules/belge-tarayici.js'),kamera=read('js/modules/belge-tarayici-kamera.js'),core=read('js/modules/belge-tarayici-core.js');
const css=read('css/design-system-base.css'),sw=read('service-worker.js'),shell=read('js/core/shell-ui.js'),nav=read('js/core/app-nav.js');
const manifest=read('android/app/src/main/AndroidManifest.xml'),documents=read('js/modules/documents.js'),engine=read('js/modules/report-engine.js');
const eq=(a,b,m)=>assert.strictEqual(JSON.stringify(a),JSON.stringify(b),m);

/* --- dosyalar derlenir --- */
for(const [ad,src] of [['belge-tarayici.js',ui],['belge-tarayici-kamera.js',kamera],['belge-tarayici-core.js',core]])new Function(src);

/* --- yükleme sürümleri: modül SRC dizisi = Service Worker ön belleği = menü rotası --- */
{
  const m=ui.match(/const SRC=\[([^\]]+)\]/);assert(m,'SRC dizisi bulunamadı');
  const src=m[1].split(',').map(s=>s.trim().replace(/^'|'$/g,''));
  assert.strictEqual(src.length,2);
  for(const s of src)assert(sw.includes("'./"+s+"'"),'Service Worker ön belleğinde yok: '+s);
  assert(sw.includes("'./js/modules/belge-tarayici.js?v=1'"),'Ana modül ön bellekte olmalı');
  assert(shell.includes("loadScript?.('js/modules/belge-tarayici.js?v=1')"),'Menü rotası ana modülü aynı sürümle yüklemeli');
}

/* --- menü ve rota: araç kimliği korunur (izin/favori anahtarları), ad ve açıklama yenilenir --- */
assert(nav.includes("['pdf-images','Belge Tarayıcı (Resimden PDF)'"),'Menü adı Belge Tarayıcı olmalı');
assert(nav.includes("'documents','pdf-images']"),'Araç kimliği/izin eşlemesi (documents:pdf-images) korunmalı');
assert(/registerPageRoute\('pdf-images',async\(ctx\)=>\{[\s\S]*?BelgeTarayici\.open\(\{onClose:\(\)=>global\.ShellUI\?\.back\?\.\(\)\}\)/.test(shell),'pdf-images rotası Belge Tarayıcı\'yı tam ekran açıp kapanınca geri dönmeli');
assert(shell.includes("registerPageRoute('pdf-merge'"),'PDF Birleştir rotası korunmalı');

/* --- eski kopyalar kaldırıldı: tek Resimden PDF arayüzü --- */
assert(!documents.includes('DocumentsPdfTools')&&!documents.includes('launchPdfTool'),'Documents içinde eski PDF çalışma alanı kalmamalı');
assert(!engine.includes('data-pdf-mode="images"')&&!engine.includes('data-pdf-orientation'),'ReportEngine modalında Resimden PDF kalmamalı');
assert(engine.includes('imagesToPdf')&&engine.includes('mergePdfs'),'ReportEngine imagesToPdf (raporlar) ve mergePdfs korunmalı');

/* --- Android: kamera izni var, donanım zorunlu değil --- */
assert(manifest.includes('android.permission.CAMERA'),'CAMERA izni eksik');
assert(/uses-feature android:name="android\.hardware\.camera" android:required="false"/.test(manifest),'Kamera donanımı zorunlu olmamalı');

/* --- mimari kurallar (scripts/check-client-architecture.mjs ile aynı ruhta) --- */
for(const [ad,src] of [['belge-tarayici.js',ui],['belge-tarayici-kamera.js',kamera]]){
  assert(!/createElement\(\s*['"]style['"]\s*\)/.test(src)&&!/<style\b/.test(src),ad+': çalışma anında <style> yok');
  assert(!/#[0-9a-fA-F]{6}\b/.test(src),ad+': sabit renk kodu yok');
  assert(!/style=["'`][^"'`]*(?:color|background|border)/.test(src),ad+': renkli satır içi stil yok');
  assert(!/position:\s*fixed/.test(src),ad+': konumlandırma CSS\'te');
  assert(!/Capacitor\?*\.|PrintPlugin|Filesystem|Browser\.|StatusBar\.|Keyboard\./.test(src),ad+': yerel API yalnız ReportEngine/platform bağdaştırıcısı üzerinden');
  assert(!/db\s*\.\s*collection\s*\(/.test(src)&&!/localStorage/.test(src),ad+': doğrudan Firestore/localStorage yok');
}
assert(ui.includes('ReportEngine')&&ui.includes('savePdfBlob')&&ui.includes('previewPdfBlob'),'Kaydet/paylaş/önizle ReportEngine üzerinden olmalı');
assert(ui.includes('DokumanlarService.dokumanEkle'),'Arşivleme DokumanlarService üzerinden olmalı');
assert(ui.includes('setPullToRefreshEnabled'),'Tam ekran araçta çekerek yenile kapatılmalı');
assert(ui.includes("role','dialog'")&&ui.includes('data-close'),'Android geri düğmesi için role=dialog + [data-close] gerekli');
assert(!/<script|eval\(|new Function\(/.test(ui+kamera),'Dinamik kod yok');

/* --- CSS: yalnız .bts-root altında, tanımlı tokenlarla --- */
{
  const bas=css.lastIndexOf('/*',css.indexOf('BELGE TARAYICI / RESİMDEN PDF')),bit=css.lastIndexOf('/*',css.indexOf('SINIF OTURMA IZGARASI'));
  assert(bas>0&&bit>bas,'CSS bloğu bulunamadı');
  const blok=css.slice(bas,bit);
  const kuralBaslari=blok.split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('/*')&&!s.startsWith('--')&&!s.startsWith('position:fixed;inset:0;z-index:1250'));
  for(const s of kuralBaslari){
    if(/^(\.bts-root|@media|@keyframes bts-|\}|from\{|to\{)/.test(s)||/^[a-z-]+:/.test(s))continue;
    assert.fail('Kural .bts-root altında değil: '+s.slice(0,80));
  }
  const kullanilan=new Set([...blok.matchAll(/var\((--[a-z0-9-]+)/g)].map(m=>m[1]));
  const tanimli=new Set([...css.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map(m=>m[1]));
  const eksik=[...kullanilan].filter(v=>!tanimli.has(v));
  eq(eksik,[],'Tanımsız tasarım tokenı: '+eksik.join(','));
  assert(!/#[0-9a-fA-F]{3,8}\b/.test(blok),'Blokta sabit renk kodu yok');
  assert(/\.bts-root \[hidden\]\{display:none!important\}/.test(blok),'[hidden] kuralı olmalı (sheet/kamera hata paneli)');
  assert(css.includes('prefers-reduced-motion:reduce){.bts-root'),'Hareket azaltma desteği');
  /* ui içindeki her sınıf CSS'te tanımlı */
  const siniflar=new Set([...ui.matchAll(/class="([^"$]*)/g)].flatMap(m=>m[1].split(/\s+/)).filter(c=>c.startsWith('bts-')));
  for(const c of siniflar)assert(blok.includes('.'+c),'CSS\'te tanımsız sınıf: '+c);
}

/* --- saf yardımcılar (DOM gerektirmeyen) --- */
{
  const stub={createElement:()=>({}),addEventListener(){}};
  const win={document:stub,navigator:{},toast(){}};win.window=win;vm.createContext(win);
  vm.runInContext(core,win);vm.runInContext(kamera,win);vm.runInContext(ui,win);
  const T=win.BelgeTarayici._t,K=win.BelgeTarayiciKamera;
  /* ayar çubukları filtreye göre: etkisiz çubuk gösterilmez */
  const gorunen=f=>T.AYARLAR.filter(s=>s.ok(f)).map(s=>s.k);
  eq(gorunen('bw'),['parlaklik','esik'],'Siyah-beyazda yalnız parlaklık ve koyuluk');
  assert(gorunen('sihirli').includes('doygunluk')&&!gorunen('sihirli').includes('golge')&&!gorunen('sihirli').includes('esik'),'Sihirli renkte gölge zaten otomatik');
  assert(gorunen('orijinal').includes('golge'),'Orijinalde gölge giderme açık');
  assert(!gorunen('gri').includes('sicaklik')&&!gorunen('belge').includes('doygunluk'),'Gri tonlu süzgeçte renk çubuğu yok');
  const tum=new Set(T.AYARLAR.map(s=>s.k));
  for(const k of Object.keys(win.BelgeTarayiciCore.varsayilanAyar()))if(k!=='filtre')assert(tum.has(k),'Ayar çubuğu eksik: '+k);
  for(const s of T.AYARLAR)assert(s.min<0||s.min===0,s.k+' aralığı');
  /* köşeler */
  assert(T.tamMi(T.TAM()),'tam kare');
  assert(!T.tamMi([{x:.1,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]),'kırpılmış kare tam değil');
  const k=T.iceriAl([{x:.1,y:.1},{x:.9,y:.1},{x:.9,y:.9},{x:.1,y:.9}]);
  assert(k[0].x>.1&&k[0].y>.1&&k[2].x<.9&&k[2].y<.9,'köşeler merkeze doğru çekilir');
  assert(k[0].x-.1<.01,'çekme küçük kalır (<%1)');
  const tamIc=T.iceriAl(T.TAM());assert(tamIc.every(p=>p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1),'sınır dışına taşmaz');
  /* kalite basamakları sıralı */
  assert(T.KALITE.dusuk.maks<T.KALITE.orta.maks&&T.KALITE.orta.maks<=T.KALITE.yuksek.maks&&T.KALITE.dusuk.q<T.KALITE.orta.q&&T.KALITE.orta.q<T.KALITE.yuksek.q,'kalite basamakları');
  /* kamera yardımcıları */
  assert.strictEqual(K.hataKodu({name:'NotAllowedError'}),'izin');assert.strictEqual(K.hataKodu({name:'NotFoundError'}),'yok');
  assert.strictEqual(K.hataKodu({name:'NotReadableError'}),'mesgul');assert.strictEqual(K.hataKodu(null),'bilinmeyen');
  const q=[{x:.1,y:.1},{x:.9,y:.1},{x:.9,y:.9},{x:.1,y:.9}];
  assert.strictEqual(K._t.kayma(q,q),0);assert.strictEqual(K._t.kayma(null,q),1);
  assert(K._t.kayma(q,q.map(p=>({x:p.x+.01,y:p.y})))<.025,'küçük titreme kararlı sayılır');
  assert.strictEqual(K.destek(),false,'getUserMedia olmayan ortamda destek yok');
}
console.log('belge-tarayici-ui: tamam');
