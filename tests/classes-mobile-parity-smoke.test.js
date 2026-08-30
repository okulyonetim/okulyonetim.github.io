const fs=require('fs');
const assert=require('assert');

const classes=fs.readFileSync('js/modules/classes-mobile-parity.js','utf8');
const seating=fs.readFileSync('js/modules/class-seating.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

new Function(classes);
new Function(seating);

for(const [name,src] of [['classes',classes],['seating',seating]]){
  assert(!/\bdb\s*\.\s*collection\s*\(/.test(src),`${name}: doğrudan Firestore kullanmamalı.`);
  assert(!/localStorage\s*\.\s*setItem\s*\(/.test(src),`${name}: kalıcı localStorage yazımı yapmamalı.`);
  assert(!/\bDeviceData\s*\.\s*(?:list|get|listen|persist|add|update|set|remove)\s*\(/.test(src),`${name}: UI DeviceData katmanına doğrudan inmemeli.`);
  assert(!/createElement\(\s*['"]style['"]\s*\)/.test(src),`${name}: runtime style üretmemeli.`);
}

for(const marker of ['SINIF YÖNETİMİ','TOPLAM SINIF','TOPLAM ÖĞRENCİ','KIZ ÖĞRENCİ','ERKEK ÖĞRENCİ','Bilgiler','Öğrenciler (','Ders Programı','GENEL BİLGİLER','Oturma Planı','Excel','e-Okul']){
  assert(classes.includes(marker),`Sınıflar görünür parite öğesi eksik: ${marker}`);
}
assert(!classes.includes('>Aktif<')&&!classes.includes('Aktif</span>'),'Sınıf detayındaki Aktif rozeti geri gelmemeli.');
const info=classes.match(/function infoBody\([\s\S]*?function studentActions/)?.[0]||'';
assert(info.includes('GENEL BİLGİLER'),'Bilgiler sekmesi genel bilgileri göstermeli.');
assert(!info.includes('ogrenciAdi')&&!info.includes('studentCard(')&&!info.includes('Öğrenci Ekle'),'Bilgiler sekmesi öğrenci listesini/işlemlerini tekrar etmemeli.');
const studentSection=classes.match(/function studentsBody\([\s\S]*?function scheduleBody/)?.[0]||'';
assert(studentSection.includes('studentActions')&&studentSection.includes('studentCard'),'Öğrenci listesi yalnız Öğrenciler sekmesinin gövdesinde bulunmalı.');
assert(classes.indexOf("['info','Bilgiler']")<classes.indexOf("['students',`Öğrenciler")&&classes.indexOf("['students',`Öğrenciler")<classes.indexOf("['schedule','Ders Programı']"),'Detay sekme sırası Bilgiler → Öğrenciler → Ders Programı olmalı.');
for(const api of ['global.SiniflarService.sinifKaydet','global.SiniflarService.veliKaydet','global.PeopleImportUI.importStudents','global.PeopleImportUI.importEOkul']) assert(classes.includes(api),`Canonical sınıf servisi eksik: ${api}`);

for(const marker of ['tekli-sira','ikili-masa','grup-masasi-4','grup-masasi-6','ogretmen-masasi','kapi','pencere','yazi-tahtasi','data-so-portrait','data-so-landscape','data-so-move-all','data-so-lock','data-so-pool']) assert(seating.includes(marker),`Oturma planı motor öğesi eksik: ${marker}`);
assert(seating.includes('global.SinifOturmaService.planKaydet(classId,serialize())'),'Oturma planı canonical local-first servisle kaydedilmeli.');
assert(seating.includes('global.ReportEngine.printReport'),'Oturma planı çıktısı tek ReportEngine kullanmalı.');
assert(seating.includes('global.SinifOturma={ac:open'),'Legacy public SinifOturma.ac API geri gelmeli.');

const peopleRegistry=loader.match(/define\('people',\[([^\]]+)\]\)/)?.[1]||'';
for(const src of ["'js/modules/people.js'","'js/modules/people-import.js'","'js/modules/people-classic-ui.js'","'js/modules/classes-mobile-parity.js'"]) assert(peopleRegistry.includes(src),`People loader kaynağı eksik: ${src}`);
assert(peopleRegistry.indexOf("'js/modules/people-classic-ui.js'")<peopleRegistry.indexOf("'js/modules/classes-mobile-parity.js'"),'Sınıflar mobil parite katmanı exact People UI sonrasında yüklenmeli.');
assert(sw.includes("'./js/modules/classes-mobile-parity.js'")&&sw.includes("'./js/modules/class-seating.js'"),'Sınıflar parite ve oturma motoru offline kabukta olmalı.');
assert(sw.includes("CACHE_ADI='oy-cache-v805'"),'Sınıflar düzeltmesinde statik cache sürümü yenilenmeli.');

console.log('Sınıflar mobil parite + gerçek oturma planı davranış kilidi başarılı.');
