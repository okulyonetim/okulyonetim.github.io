const fs=require('fs');
const assert=require('assert');

const classes=fs.readFileSync('js/modules/classes-mobile-parity.js','utf8');
const seating=fs.readFileSync('js/modules/class-seating.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const design=fs.readFileSync('css/design-system.css','utf8');
const rules=fs.readFileSync('firestore.rules','utf8');

new Function(classes);
new Function(seating);

for(const [name,src] of [['classes',classes],['seating',seating]]){
  assert(!/\bdb\s*\.\s*collection\s*\(/.test(src),`${name}: doğrudan Firestore kullanmamalı.`);
  assert(!/localStorage\s*\.\s*setItem\s*\(/.test(src),`${name}: kalıcı localStorage yazımı yapmamalı.`);
  assert(!/\bDeviceData\s*\.\s*(?:list|get|listen|persist|add|update|set|remove)\s*\(/.test(src),`${name}: UI DeviceData katmanına doğrudan inmemeli.`);
  assert(!/createElement\(\s*['"]style['"]\s*\)/.test(src),`${name}: runtime style üretmemeli.`);
}

for(const marker of ['SINIF YÖNETİMİ','TOPLAM SINIF','TOPLAM ÖĞRENCİ','KIZ ÖĞRENCİ','ERKEK ÖĞRENCİ','Bilgiler','Öğrenciler (','Ders Programı','GENEL BİLGİLER','Oturma Planı','Excel','e-Okul','data-cmp-search-clear','data-cmp-directory-excel-pick','data-cmp-directory-eokul-pick','ka-class-numbers','is-girl','is-boy','ka-class-edit','ka-class-detail-summary','ka-class-detail-tabs']){
  assert(classes.includes(marker),`Sınıflar görünür parite öğesi eksik: ${marker}`);
}
for(const marker of ['.ka-class-toolbar','.ka-class-summary-grid','.ka-class-numbers','.ka-class-edit','.ka-class-detail-summary','.ka-class-detail-tabs','.ka-class-quick-actions','.ka-class-info-row']) assert(design.includes(marker),`Sınıflar merkezi görünüm stili eksik: ${marker}`);
assert(!classes.includes("level===x?'ka-btn--danger'")&&!classes.includes("detailTab===key?'ka-btn--danger'"),'Sınıf filtre/sekmelerinde danger rengi aktif durum için kullanılmamalı.');
assert(!classes.includes('>Aktif<')&&!classes.includes('Aktif</span>'),'Sınıf detayındaki Aktif rozeti geri gelmemeli.');
const info=classes.match(/function infoBody\([\s\S]*?function studentActions/)?.[0]||'';
assert(info.includes('GENEL BİLGİLER'),'Bilgiler sekmesi genel bilgileri göstermeli.');
assert(!info.includes('ogrenciAdi')&&!info.includes('studentCard(')&&!info.includes('Öğrenci Ekle'),'Bilgiler sekmesi öğrenci listesini/işlemlerini tekrar etmemeli.');
const studentSection=classes.match(/function studentsBody\([\s\S]*?function scheduleBody/)?.[0]||'';
assert(studentSection.includes('studentActions')&&studentSection.includes('studentCard'),'Öğrenci listesi yalnız Öğrenciler sekmesinin gövdesinde bulunmalı.');
assert(classes.indexOf("['info','Bilgiler']")<classes.indexOf("['students',`Öğrenciler")&&classes.indexOf("['students',`Öğrenciler")<classes.indexOf("['schedule','Ders Programı']"),'Detay sekme sırası Bilgiler → Öğrenciler → Ders Programı olmalı.');
for(const api of ['global.SiniflarService.sinifKaydet','global.SiniflarService.veliKaydet','global.PeopleImportUI.importStudents','global.PeopleImportUI.importEOkul']) assert(classes.includes(api),`Canonical sınıf servisi eksik: ${api}`);

assert(classes.includes("active='pending'"),'Sınıflar görünüm sahibi ilk yüklemede pending başlamalı.');
const mountBody=classes.match(/function mount\([^\n]+/)?.[0]||'';
assert(mountBody.includes('root.replaceChildren()'),'İlk People mount görünür eski tasarımı basmamalı; kök boş tutulmalı.');
assert(!mountBody.includes('base.mount?.(root)'),'İlk mount başka People tasarımını render etmemeli.');
const openPageBody=classes.match(/function openPage\([^\n]+/)?.[0]||'';
assert(openPageBody.includes("next!=='classes'")&&openPageBody.includes("active='classes'"),'Görünüm sahibi alt sayfa seçildikten sonra yalnız ilgili render yolunu açmalı.');

for(const marker of ['tekli-sira','ikili-masa','grup-masasi-4','grup-masasi-6','ogretmen-masasi','kapi','pencere','yazi-tahtasi','data-so-portrait','data-so-landscape','data-so-move-all','data-so-lock','data-so-pool']) assert(seating.includes(marker),`Oturma planı motor öğesi eksik: ${marker}`);
assert(seating.includes('global.SinifOturmaService.planKaydet(classId,serialize())'),'Oturma planı canonical local-first servisle kaydedilmeli.');
assert(seating.includes('global.ReportEngine.printReport'),'Oturma planı çıktısı tek ReportEngine kullanmalı.');
assert(seating.includes('global.SinifOturma={ac:open'),'Legacy public SinifOturma.ac API geri gelmeli.');
assert(seating.includes('function clearStudentAssignments()')&&seating.includes('Sıra ve sınıf düzeni korunacak.'),'Temizle işlemi yalnız öğrenci yerleşimlerini silmeli; sınıf düzenini korumalı.');
assert(seating.includes("seat.addEventListener('click'")&&seating.includes('chooseStudent(seat)'),'Sıradaki artı/isim alanına dokunma öğrenci seçiciyi açmalı.');
assert(seating.includes("const printable=orientation==='yatay'?{w:287,h:200}:{w:200,h:287}")&&seating.includes('baslikGoster:false')&&seating.includes('logoGoster:false'),'Sınıf oturma çıktısı seçilen yönde tek A4 yazdırılabilir alana ölçeklenmeli.');

const peopleRegistry=loader.match(/define\('people',\[([^\]]+)\]\)/)?.[1]||'';
for(const src of ["'js/modules/people.js'","'js/modules/people-import.js'","'js/modules/people-classic-ui.js'","'js/modules/classes-mobile-parity.js'"]) assert(peopleRegistry.includes(src),`People loader kaynağı eksik: ${src}`);
assert(peopleRegistry.indexOf("'js/modules/people-classic-ui.js'")<peopleRegistry.indexOf("'js/modules/classes-mobile-parity.js'"),'Sınıflar tek görünüm sahibi exact People altyapısından sonra yüklenmeli.');
assert(sw.includes("'./js/modules/classes-mobile-parity.js'")&&sw.includes("'./js/modules/class-seating.js'"),'Sınıflar görünüm sahibi ve oturma motoru offline kabukta olmalı.');
const cacheVersion=Number(sw.match(/CACHE_ADI='oy-cache-v(\d+)'/)?.[1]||0);
assert(cacheVersion>=805,'Sınıflar düzeltmesinden eski bir statik cache sürümüne dönülmemeli.');

assert(seating.includes('const isTeacherUser=()=>activeUser().admin!==true&&!!activeTeacherId()')&&seating.includes('const canEdit=()=>isTeacherUser()?ownClass()'),'Sınıf oturma editörü öğretmeni yalnız kendi atanmış sınıfında düzenleyebilir yapmalı.');
assert(rules.includes('function kendiSinifiMi(sinifId)')&&rules.includes("allow create, update, delete: if moduluDuzenleyebilir('siniflar') || kendiSinifiMi(sinifId);"),'Firestore senkronizasyonu öğretmene yalnız kendi atanmış sınıfının oturma planını yazdırmalı.');
console.log('Sınıflar tek render sahibi + gerçek oturma planı davranış kilidi başarılı.');
