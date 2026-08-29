const fs=require('fs');
const assert=require('assert');
const people=fs.readFileSync('js/modules/people.js','utf8');
const importer=fs.readFileSync('js/modules/people-import.js','utf8');
const parity=fs.readFileSync('js/modules/classic-parity.js','utf8');
const excel=fs.readFileSync('js/modules/classic-excel-parity.js','utf8');
const live=fs.readFileSync('js/modules/school-live-status.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
new Function(importer);new Function(parity);new Function(excel);new Function(live);

assert(people.includes("DeviceData/IndexedDB -> AppStore -> UI"),'People local-first veri sınırı korunmalı.');
assert(people.includes("device().add('siniflar',COL.siniflar"),'Sınıf yazımı DeviceData üzerinden kalmalı.');
assert(people.includes("device().add('veliler',COL.veliler"),'Öğrenci/veli yazımı DeviceData üzerinden kalmalı.');
assert(!people.includes('db.collection('),'People UI/repository doğrudan Firestore kullanmamalı.');
assert(!people.includes('localStorage.setItem('),'People kalıcı veriyi localStorage ile yazmamalı.');

assert(!people.includes('data-people-tab'),'People üst seviye öğretmen/sınıf/öğrenci sekmeleri üretmemeli.');
assert(people.includes("function openPage(page,title='')"),'People doğrudan sayfa açma API sağlamalı.');
for(const page of ['teachers','classes','students']) assert(people.includes(`'${page}'`),`People doğrudan sayfa hedefi eksik: ${page}`);
for(const marker of ['ka-teacher-directory','ka-teacher-profile','ka-teacher-summary','ka-teacher-actions','data-teacher-detail','data-teacher-edit','data-teacher-report','data-teacher-program','data-teacher-message']) assert(people.includes(marker),`Yeni Öğretmenler/profil akışı öğesi eksik: ${marker}`);
for(const marker of ['ka-class-directory','ka-class-card','data-class-level','data-class-detail','data-class-tab','data-class-seating','ka-student-directory','ka-student-card','data-student-class','data-gender-filter','data-student-detail','data-student-results','data-results-filter','ka-people-student-list','data-class-add','data-class-edit','data-class-delete','data-student-add','data-student-edit','data-student-delete','classForm','studentForm']) assert(people.includes(marker),`Sınıf/öğrenci yönetim akışı öğesi eksik: ${marker}`);
for(const label of ['Öğretmenler','Sınıflar','Öğrenciler','Öğrenci Detayı','Sınav Sonuçları','DERS PROGRAMI','NÖBETLER','KULÜP DANIŞMANLIĞI','BELİRLİ GÜN VE HAFTALAR','DİĞER EVRAK']) assert(people.includes(label),`People görünüm öğesi eksik: ${label}`);
assert(people.includes('function resultEntries(type,v){')&&people.includes('for(const exam of data(type))'),'Öğrenci sonuç motoru AppStore cache tipini dinamik kullanmalı.');
assert(people.includes("resultEntries('denemeSonuclari',v)")&&people.includes("resultEntries('testSonuclari',v)"),'Öğrenci sonuç detayı gerçek Deneme/Test cache tiplerini kullanmalı.');
assert(people.includes("data('yoklama')"),'Öğrenci detayındaki devamsızlık özeti merkezi yoklama cache ini kullanmalı.');
assert(people.includes("PermissionService.can('people.classes','edit')"),'Sınıf yazmaları merkezi people.classes edit sınırına bağlı olmalı.');
assert(people.includes("PermissionService.can('people.students.edit','edit')"),'Öğrenci yazmaları merkezi people.students.edit sınırına bağlı olmalı.');
assert(people.includes("if(count){global.toast?.(`Bu sınıfta ${count} öğrenci var."),'Öğrencili sınıf doğrudan silinmemeli.');
assert(people.includes('BelgeDurumuService'),'Öğretmen belge durumu akışı korunmalı.');

assert(loader.includes("define('people',['js/modules/people.js','js/modules/people-import.js'])"),'People modülü e-Okul/Excel adaptörünü yalnız People yüklenirken bağlamalı.');
assert(sw.includes("'./js/modules/people-import.js'"),'People içe aktarma adaptörü offline kabukta önbelleğe alınmalı.');
assert(importer.includes("AppStore?.get?.('ui.route')!=='people'"),'People içe aktarma UI yalnız People rotasında etkinleşmeli.');
assert(importer.includes("SiniflarService.ogrenciVeliListesiIceAktar")&&importer.includes("SiniflarService.eOkulPlanlariniUygula"),'Excel/e-Okul yazımları canonical SiniflarService üzerinden kalmalı.');
assert(importer.includes("data-class-seating")&&importer.includes("dataset.classSeating"),'Sınıf detayı içe aktarmada görünür başlık eşlemesi yerine gerçek sınıf ID sini öncelikli kullanmalı.');
for(const marker of ['data-legacy-club-add','data-legacy-club-list','data-people-club-modal','data-legacy-teacher-section']) assert(importer.includes(marker),`Eski öğretmen detay paritesi eksik: ${marker}`);
assert(importer.includes("u.bagliOgretmenId||u.ogretmenId||''"),'Kulüp danışman yetkisi canonical öğretmen ID üzerinden çözülmeli.');
assert(importer.includes('SiniflarService.ogrenciKulupGuncelle'),'Kulüp öğrenci ekle/çıkar işlemi canonical local-first SiniflarService üzerinden kalmalı.');
assert(importer.includes('ReportEngine.printReport'),'Kulüp öğrenci listesi merkezi rapor motoruyla açılmalı.');
assert(importer.includes("teacherRows('rehberlik',id)")&&importer.includes("teacherRows('bepPlani',id)"),'Rehberlik ve Yıllık/BEP sorumlulukları öğretmen ID alanlarıyla eşleşmeli.');
assert(importer.includes('REHBERLİK')&&importer.includes('YILLIK / BEP PLANLARI'),'Eski öğretmen detayındaki sorumluluk bölümleri görünür olmalı.');

assert(importer.includes('async function parseTeacherExcel(file)'),'Eski Öğretmenler Excel ayrıştırıcısı geri gelmeli.');
for(const label of ['AD SOYAD','BRANŞ','TELEFON','E-POSTA','SORUMLU SINIF','ÜNVAN','DERECE','KADEME']) assert(importer.includes(label),`Öğretmen Excel kolonu eksik: ${label}`);
assert(importer.includes("PermissionService.can('people.teachers','edit')"),'Öğretmen Excel içe aktarma merkezi öğretmen yazma yetkisini kullanmalı.');
assert(importer.includes('global.OgretmenService.kaydet'),'Öğretmen Excel yazımı canonical OgretmenService üzerinden kalmalı.');
assert(importer.includes("e.stopImmediatePropagation();chooseTeacherExcel()"),'Eski Öğretmenler Excel düğmesi dışa aktarma yerine içe aktarma akışını açmalı.');
assert(importer.includes('kademeNo'),'Eski KADEME kolonu yeni canonical kademeNo alanına taşınmalı.');
assert(!importer.includes('db.collection('),'People içe aktarma/parite adaptörü doğrudan Firestore kullanmamalı.');

assert(importer.includes("SyncEngine.register('dersListesi',global.COL.dersListesi)"),'Haftalık norm için gerçek dersListesi koleksiyonu SyncEngine ile kaydedilmeli.');
assert(importer.includes("SyncEngine.localHydrate(['dersListesi'])"),'Ders norm tanımları önce IndexedDB/AppStore üzerinden hydrate edilmeli.');
assert(importer.includes("arr('dersProgrami').filter(d=>d.ogretmenId===id)"),'Norm hesabı öğretmenin gerçek ogretmenId ders programını kullanmalı.');
assert(importer.includes("arr('dersListesi').find(d=>d.ad===g.ders)"),'Norm hesabı ders adını gerçek dersListesi kaydıyla eşlemeli.');
assert(importer.includes('dersKayit?.haftalikSaatler')&&importer.includes('dersKayit.haftalikSaatler[String(seviye)]'),'Norm plan saati eski haftalikSaatler seviye modelinden okunmalı.');
assert(importer.includes("match(/^(\\d+)/)"),'Sınıf seviyesi eski norm davranışındaki gibi sınıf adının başındaki rakamdan çıkarılmalı.');
for(const label of ['HAFTALIK NORM ANALİZİ','Norm (plan)','Fiili (program)','Fark','TOPLAM']) assert(importer.includes(label),`Haftalık norm görünüm öğesi eksik: ${label}`);

assert(live.includes("loadScript?.('js/modules/classic-parity.js')"),'Classic parity yalnız dashboard yüklendikten sonra lazy bağlanmalı.');
assert(live.includes("loadScript?.('js/modules/classic-excel-parity.js')"),'Classic Excel parity yalnız dashboard sonrası lazy bağlanmalı.');
assert(sw.includes("'./js/modules/classic-parity.js'")&&sw.includes("'./js/modules/classic-excel-parity.js'"),'Classic parity adaptörleri offline kabukta önbelleğe alınmalı.');
assert(!parity.includes('db.collection('),'Classic parity doğrudan Firestore kullanmamalı.');
assert(!parity.includes('localStorage.setItem('),'Classic parity kalıcı veri için localStorage yazmamalı.');
assert(!excel.includes('db.collection('),'Classic Excel parity doğrudan Firestore kullanmamalı.');
assert(!excel.includes('localStorage.setItem('),'Classic Excel parity kalıcı veri için localStorage yazmamalı.');
assert(excel.includes('SiniflarService.sinifListesiIceAktar'),'Sınıf Excel canonical SiniflarService üzerinden yazmalı.');
assert(excel.includes('DersProgramiService.kaydet'),'Ders Programı Excel canonical DersProgramiService üzerinden yazmalı.');
assert(excel.includes('SinavlarService.sinavKaydet'),'Yazılı Excel canonical SinavlarService üzerinden yazmalı.');
assert(excel.includes('ReferenceListService.lessonSave'),'Ders/Branş Excel canonical referans liste servisi üzerinden yazmalı.');
for(const marker of ['Sınıf Excel','Program Excel','Yazılı Excel','data-classic-settings-list="lesson"']) assert(excel.includes(marker),`Klasik Excel görünür aksiyonu eksik: ${marker}`);
for(const label of ['SINIF ADI','DERS SAATİ','YAZILI SIRASI','SENARYO NO','YAYINEVİ','KISALTMA','haftalikSaatler']) assert(excel.includes(label),`Eski Excel veri sözleşmesi eksik: ${label}`);

assert(parity.includes("device().add('dersListesi',global.COL.dersListesi")&&parity.includes("device().update('dersListesi',global.COL.dersListesi")&&parity.includes("device().remove('dersListesi',global.COL.dersListesi"),'Ders Listesi CRUD DeviceData üzerinden kalmalı.');
assert(parity.includes("device().add('bransListesi',global.COL.bransListesi")&&parity.includes("device().update('bransListesi',global.COL.bransListesi")&&parity.includes("device().remove('bransListesi',global.COL.bransListesi"),'Branş Listesi CRUD DeviceData üzerinden kalmalı.');
assert(parity.includes("SyncEngine.localHydrate(['dersListesi','bransListesi'])"),'Ders/branş listeleri önce cihazdan hydrate edilmeli.');
assert(parity.includes("PermissionService?.can?.('settings.app.edit','edit')"),'Ders/branş yönetimi mevcut merkezi ayar yazma yetkisini kullanmalı.');
for(const label of ['Ders Listesi','Branş Listesi','Haftalık Ders Saati','Toplam sınav','7 gün içinde','Aktif sayaç']) assert(parity.includes(label),`Toplu klasik parite öğesi eksik: ${label}`);
for(const label of ['HAFTALIK NORM ANALİZİ','SOSYAL KULÜP & REHBERLİK','BELİRLİ GÜN VE HAFTALAR','BELGE DURUMU','İZİNLER / RAPORLAR','DİĞER EVRAK']) assert(parity.includes(label),`Öğretmen profil raporu parite bölümü eksik: ${label}`);
assert(parity.includes("u.bagliOgretmenId||u.ogretmenId||''"),'Profil bağlı öğretmen çözümü canonical fallback kimliğini kullanmalı.');
assert(parity.includes("x.ogretmenId===id")&&parity.includes("Array.isArray(x.ogretmenIdler)&&x.ogretmenIdler.includes(id)"),'Öğretmen sorumlulukları gerçek ID alanlarıyla eşleşmeli.');
assert(parity.includes("global.ShellUI?.routeModule?.(target[0],{bottom:'profile',page:target[1],title:target[2]})"),'Profil kartları gerçek alt sayfalara gitmeli.');

require('./lazy-chart-smoke.test.js');
console.log('People V2, öğretmen/toplu Excel ve klasik sayfa-modal local-first paritesi smoke testi başarılı.');
