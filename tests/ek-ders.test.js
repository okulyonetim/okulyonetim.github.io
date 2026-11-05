const assert=require('assert');const fs=require('fs');const {execSync}=require('child_process');
const read=p=>fs.readFileSync(p,'utf8');
const mod=read('js/modules/ek-ders.js'),shell=read('js/core/shell-ui.js'),nav=read('js/core/app-nav.js'),sw=read('service-worker.js'),base=read('css/design-system-base.css'),ds=read('css/design-system.css');
new Function('window',mod);

/* 1) Kişisel veri: onay yazısı / çizelge PDF'leri (T.C. kimlik no, imza kodu) herkese açık depoya KONMAZ */
const izlenen=execSync('git ls-files',{encoding:'utf8'}).split('\n');
assert(!izlenen.some(f=>/(EKD_|Onay_Cizelgesi|Ek_Ders_Ucret|document_9)/i.test(f)),'Ek ders onay belgeleri (kişisel veri içerir) depoya eklenmemeli; sayfadan özel depolamaya yüklenir.');
assert(/gorunurluk:'kisisel'/.test(mod)&&mod.includes("KATEGORI='Ek Ders İşlemleri'"),'Belgeler "Kişisel" görünürlükte, Ek Ders İşlemleri kategorisinde saklanmalı.');
assert(mod.includes('DokumanlarService.dokumanEkle')&&mod.includes('DokumanlarService.dokumanSil')&&mod.includes('DocumentsModule?.openDocument')&&mod.includes('DocumentsModule?.downloadDocument'),'Yükleme/silme/açma/indirme mevcut Dokümanlar altyapısını kullanmalı (ikinci depolama yolu yok).');
assert(mod.indexOf('dokumanEkle')<mod.indexOf('for(const d of eskiler)'),'Değiştirmede eski belge yeni yükleme BAŞARILI olduktan sonra silinmeli.');
assert(mod.includes("application/pdf")&&mod.includes('MAX_BOYUT'),'Yalnız PDF ve boyut sınırı denetlenmeli.');

/* 1b) Evrak türleri: hiçbiri aya/döneme bağlı değil; türü başına tek dosya, yenisi eskisinin yerine geçer */
for(const id of ['yazi','cizelge'])assert(new RegExp(`\\{id:'${id}',kabul:'pdf'`).test(mod),id+' PDF kabul etmeli.');
for(const id of ['ilkokul','ortaokul','maas'])assert(new RegExp(`\\{id:'${id}',kabul:'xlsx'`).test(mod),id+' Excel (.xlsx) kabul etmeli.');
assert(!/donem/i.test(mod.replace(/ekDersDonem/g,'')),'Hiçbir evrak aya/döneme bağlı olmamalı (ay/yıl seçimi, dönem anahtarı, kayıtlı dönem düğmesi yok).');
assert(!mod.includes('ekDersDonem')&&!mod.includes('data-kek-ay')&&!mod.includes('data-kek-yil'),'Yükleme kaydına dönem yazılmamalı; ay/yıl seçimi olmamalı.');
assert(mod.includes('const belgeler=tur=>tumBelgeler().filter(d=>d.ekDersTur===tur.id)'),'Evrak, yalnız türüne göre bulunmalı (türü başına tek dosya).');
assert(!/kabul:'txt'/.test(mod)&&!mod.includes('text/plain'),'Bu evraklar Excel biçimindedir; text biçimi kalmamalı.');
assert(/xlsx:\{[^}]*uygun:f=>\/\\\.xlsx\$\/i\.test/.test(mod)&&/pdf:\{[^}]*uygun:f=>f\.type==='application\/pdf'/.test(mod),'Kabul edilen biçim her tür için ayrı denetlenmeli (xlsx: uzantı, pdf: tür/uzantı).');
assert(mod.includes('girdi.accept=KABUL[hedef.kabul].accept')&&!/<input type="file"[^>]*accept=/.test(mod),'Dosya seçici kabul türü, tıklanan evrak türüne göre ayarlanmalı.');
assert(mod.includes('spreadsheetml.sheet')&&mod.includes('{type:kabul.mime}'),'Türü boş gelen dosya, biçiminin doğru türüyle depoya gitmeli.');
assert(!mod.includes('data-kek-indir}')&&/data-kek-ac="\$\{esc\(d\.id\)\}"/.test(mod),'Belge adı uygulama içi okuyucuda açılmalı (Excel yerel okunur, dış servise gönderilmez).');
const w={AppStore:{},PermissionService:{},toast(){}};new Function('window',mod)(w);
assert.deepStrictEqual(Object.keys(w.EkDersModule).sort(),['open','render','unmount'],'Modül yalnız open/unmount/render sunmalı (dönem yardımcıları kaldırıldı).');

/* 3) Menü + yönlendirme + önbellek */
assert(nav.includes("['ek-ders','Ek Ders İşlemleri','wallet'")&&/\['ek-ders','Ek Ders İşlemleri'[^\]]*'ek-ders','',\{y:1\}\]/.test(nav),'Menüde Personel İşleri altında yönetici sayfası olarak "Ek Ders İşlemleri" bulunmalı.');
assert(shell.includes("name==='ek-ders'")&&shell.includes("loadScript?.('js/modules/ek-ders.js?v=5')")&&shell.includes("loadScript?.('js/modules/documents.js')")&&shell.includes('EkDersModule.open'),'Kabuk rotası ek-ders.js ve documents.js\'i ihtiyaç anında yüklemeli.');
assert(sw.includes("'./js/modules/ek-ders.js?v=5'"),'Sayfa çevrimdışı önbellekte olmalı.');
for(const c of ['.kek-bolum__baslik{','.kek-dosya{','.kek-dosya__ad{'])assert(base.includes(c)&&!ds.includes(c),c+' yalnız tabanda tanımlı olmalı.');
const pin=(f,re)=>Number(read(f).match(re)[1]);
assert(pin('index.html',/shell-ui\.js\?v=(\d+)/)===pin('service-worker.js',/shell-ui\.js\?v=(\d+)/)&&pin('index.html',/app-nav\.js\?v=(\d+)/)===pin('service-worker.js',/app-nav\.js\?v=(\d+)/),'index ve SW sürüm pinleri eşleşmeli.');
assert(pin('css/design-system.css',/design-system-base\.css\?v=(\d+)/)>=1381&&pin('service-worker.js',/CACHE_ADI\s*=\s*'oy-cache-v(\d+)'/)>=1475,'CSS ve önbellek sürümü artırılmalı.');
console.log('Ek Ders İşlemleri sözleşmesi başarılı.');
