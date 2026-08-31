const fs=require('fs');
const assert=require('assert');
const people=fs.readFileSync('js/modules/people.js','utf8');
const importer=fs.readFileSync('js/modules/people-import.js','utf8');
const exact=fs.readFileSync('js/modules/people-classic-ui.js','utf8');
const classesMobile=fs.readFileSync('js/modules/classes-mobile-parity.js','utf8');
const parity=fs.readFileSync('js/modules/classic-parity.js','utf8');
const excel=fs.readFileSync('js/modules/classic-excel-parity.js','utf8');
const live=fs.readFileSync('js/modules/school-live-status.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const build=fs.readFileSync('scripts/build-client-bundles.mjs','utf8');
new Function(importer);new Function(exact);new Function(parity);new Function(excel);new Function(live);

assert(people.includes("DeviceData/IndexedDB -> AppStore -> UI"),'People local-first veri sınırı korunmalı.');
assert(people.includes("device().add('siniflar',COL.siniflar"),'Sınıf yazımı DeviceData üzerinden kalmalı.');
assert(people.includes("device().add('veliler',COL.veliler"),'Öğrenci/veli yazımı DeviceData üzerinden kalmalı.');
assert(!people.includes('db.collection('),'People UI/repository doğrudan Firestore kullanmamalı.');
assert(!people.includes('localStorage.setItem('),'People kalıcı veriyi localStorage ile yazmamalı.');

assert(!people.includes('data-people-tab'),'People üst seviye öğretmen/sınıf/öğrenci sekmeleri üretmemeli.');
assert(people.includes("function openPage(page,title='')"),'People doğrudan sayfa açma API sağlamalı.');
for(const page of ['teachers','classes','students']) assert(people.includes(`'${page}'`),`People doğrudan sayfa hedefi eksik: ${page}`);
for(const marker of ['ka-teacher-directory','ka-teacher-profile','ka-teacher-summary','ka-teacher-actions','data-teacher-detail','data-teacher-edit','data-teacher-report','data-teacher-program','data-teacher-message']) assert(people.includes(marker),`Canonical Öğretmenler/profil akışı öğesi eksik: ${marker}`);
for(const marker of ['ka-class-directory','ka-class-card','data-class-level','data-class-detail','data-class-tab','data-class-seating','ka-student-directory','ka-student-card','data-student-class','data-gender-filter','data-student-detail','data-student-results','data-results-filter','ka-people-student-list','data-class-add','data-class-edit','data-class-delete','data-student-add','data-student-edit','data-student-delete','classForm','studentForm']) assert(people.includes(marker),`Canonical sınıf/öğrenci yönetim akışı öğesi eksik: ${marker}`);
for(const label of ['Öğretmenler','Sınıflar','Öğrenciler','Öğrenci Detayı','Sınav Sonuçları','DERS PROGRAMI','NÖBETLER','KULÜP DANIŞMANLIĞI','BELİRLİ GÜN VE HAFTALAR','DİĞER EVRAK']) assert(people.includes(label),`People veri/ayrıntı davranışı eksik: ${label}`);
assert(people.includes('function resultEntries(type,v){')&&people.includes('for(const exam of data(type))'),'Öğrenci sonuç motoru AppStore cache tipini dinamik kullanmalı.');
assert(people.includes("resultEntries('denemeSonuclari',v)")&&people.includes("resultEntries('testSonuclari',v)"),'Öğrenci sonuç detayı gerçek Deneme/Test cache tiplerini kullanmalı.');
assert(people.includes("data('yoklama')"),'Öğrenci detayındaki devamsızlık özeti merkezi yoklama cache ini kullanmalı.');
assert(people.includes("PermissionService.can('people.classes','edit')"),'Sınıf yazmaları merkezi people.classes edit sınırına bağlı olmalı.');
assert(people.includes("PermissionService.can('people.students.edit','edit')"),'Öğrenci yazmaları merkezi people.students.edit sınırına bağlı olmalı.');
assert(people.includes("if(count){global.toast?.(`Bu sınıfta ${count} öğrenci var."),'Öğrencili sınıf doğrudan silinmemeli.');
assert(people.includes('BelgeDurumuService'),'Öğretmen belge durumu akışı korunmalı.');

// Eski görünür People yapısı literal referans olarak yeni local-first servislerin üstünde çalışmalı.
assert(!/\bdb\s*\.\s*collection\s*\(/.test(exact),'Exact People UI doğrudan Firestore kullanmamalı.');
assert(!/\bDeviceData\b/.test(exact),'Exact People UI DeviceData katmanına doğrudan inmemeli.');
assert(!/localStorage\s*\.\s*setItem\s*\(/.test(exact),'Exact People UI kalıcı veriyi localStorage ile yazmamalı.');
for(const marker of ['ogm-shell','ogm-grid','ogm-card','ogm-avatar','ogm-stats','classic-table','detay-overlay','detay-panel','detay-row','data-exact-class-tab','data-exact-student-detail']) assert(exact.includes(marker),`Eski People görünür yapısı eksik: ${marker}`);
for(const api of ['global.OgretmenService.kaydet','global.SiniflarService.sinifKaydet','global.SiniflarService.veliKaydet','global.PeopleImportUI?.importTeachers','global.PeopleImportUI?.importStudents']) assert(exact.includes(api),`Exact People canonical service kapısı eksik: ${api}`);
assert(exact.includes('const canonical=global.PeopleModule')&&exact.includes('canonical.unmount?.()'),'Canonical People abonelikleri exact UI devralırken kontrollü kapatılmalı.');
assert(exact.includes('global.PeopleModule=api'),'Shell aynı PeopleModule lifecycle API ile exact UI kullanmalı.');
assert(exact.includes("if(next==='students'){stopSubs();delegated=true;canonical.mount?.(root);return canonical.openPage?.('students')!==false}"),'Öğrenciler görünür sayfası doğrudan canonical People rendererına delege edilmeli.');
assert(!exact.includes("page==='students'?studentView()"),'Classic People renderer öğrenci görünümünün ikinci sahibi olmamalı.');
const peopleReadyOwners=[people,exact,classesMobile].filter(src=>src.includes("e.detail?.name==='people'")&&src.includes("koruk:module-ready"));
assert.strictEqual(peopleReadyOwners.length,1,'People modülü için yalnız en dış yönlendirici module-ready mount sahibi olmalı.');
assert(classesMobile.includes("[data-student-detail],[data-exact-student-detail]"),'Sınıf detayından öğrenci açma canonical öğrenci kartını desteklemeli.');
for(const label of ['Program, nöbet ve sorumluluklar tek ekranda.','Sınıf Öğretmeni','Öğrenci Listesi','Bilgiler','Ders Programı','Öğrenciler']) assert(exact.includes(label),`Eski People metin/hiyerarşi paritesi eksik: ${label}`);

const peopleRegistry=loader.match(/define\('people',\[([^\]]+)\]\)/)?.[1]||'';
for(const src of ["'js/modules/people.js'","'js/modules/people-import.js'","'js/modules/people-classic-ui.js'"]) assert(peopleRegistry.includes(src),`People loader kaynağı eksik: ${src}`);
assert(peopleRegistry.indexOf("'js/modules/people.js'")<peopleRegistry.indexOf("'js/modules/people-import.js'")&&peopleRegistry.indexOf("'js/modules/people-import.js'")<peopleRegistry.indexOf("'js/modules/people-classic-ui.js'"),'People exact UI canonical servis ve importer sonrasında yüklenmeli.');
assert(sw.includes("'./js/modules/people-import.js'")&&sw.includes("'./js/modules/people-classic-ui.js'"),'People importer ve exact UI offline kabukta önbelleğe alınmalı.');
assert(build.includes("'people.js':['js/modules/people.js','js/modules/people-classic-ui.js']"),'Generated People bundle canonical veri/servis ve exact görünür UI sırasını korumalı.');

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
for(const label of ['AD SOYAD','BRANŞ','TELEFON','E-POSTA','SORUMLU SINIF','ÜNVAN','DERECE','KADEME','CİNSİYET']) assert(importer.includes(label),`Öğretmen Excel kolonu eksik: ${label}`);
assert(importer.includes('function teacherGender(v)')&&importer.includes('cinsiyet:cC>=0?teacherGender(r[cC])'),'Öğretmen Excel cinsiyet alanı canonical Kadın/Erkek değerine normalize edilerek taşınmalı.');
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
for(const marker of ['Sınıf Excel','Program Excel','Yazılı Excel']) assert(excel.includes(marker),`Klasik Excel görünür aksiyonu eksik: ${marker}`);
assert(!excel.includes('function enhanceSettings()'),'Classic Excel Settings DOM’una ikinci kez buton enjekte etmemeli.');
for(const label of ['SINIF ADI','DERS SAATİ','YAZILI SIRASI','SENARYO NO','YAYINEVİ','KISALTMA','haftalikSaatler']) assert(excel.includes(label),`Eski Excel veri sözleşmesi eksik: ${label}`);

assert(parity.includes("device().add('dersListesi',global.COL.dersListesi")&&parity.includes("device().update('dersListesi',global.COL.dersListesi")&&parity.includes("device().remove('dersListesi',global.COL.dersListesi"),'Ders Listesi CRUD DeviceData üzerinden kalmalı.');
assert(parity.includes("device().add('bransListesi',global.COL.bransListesi")&&parity.includes("device().update('bransListesi',global.COL.bransListesi")&&parity.includes("device().remove('bransListesi',global.COL.bransListesi"),'Branş Listesi CRUD DeviceData üzerinden kalmalı.');
assert(parity.includes("SyncEngine.localHydrate(['dersListesi','bransListesi'])"),'Ders/branş listeleri önce cihazdan hydrate edilmeli.');
assert(parity.includes("PermissionService?.can?.('settings.app.edit','edit')"),'Ders/branş yönetimi mevcut merkezi ayar yazma yetkisini kullanmalı.');
for(const label of ['Toplam sınav','7 gün içinde','Aktif sayaç']) assert(parity.includes(label),`Toplu klasik parite öğesi eksik: ${label}`);
assert(!parity.includes('function enhanceSettings()')&&!parity.includes('data-classic-settings-card'),'Classic parity Settings ana ekranına ikinci renderer olarak müdahale etmemeli.');
for(const label of ['HAFTALIK NORM ANALİZİ','SOSYAL KULÜP & REHBERLİK','BELİRLİ GÜN VE HAFTALAR','BELGE DURUMU','İZİNLER / RAPORLAR','DİĞER EVRAK']) assert(parity.includes(label),`Öğretmen profil raporu parite bölümü eksik: ${label}`);
assert(parity.includes("u.bagliOgretmenId||u.ogretmenId||''"),'Profil bağlı öğretmen çözümü canonical fallback kimliğini kullanmalı.');
assert(parity.includes("x.ogretmenId===id")&&parity.includes("Array.isArray(x.ogretmenIdler)&&x.ogretmenIdler.includes(id)"),'Öğretmen sorumlulukları gerçek ID alanlarıyla eşleşmeli.');
assert(parity.includes("global.ShellUI?.routeModule?.(target[0],{bottom:'profile',page:target[1],title:target[2]})"),'Profil kartları gerçek alt sayfalara gitmeli.');

require('./lazy-chart-smoke.test.js');
assert(exact.includes("const canTeacherReport=id=>teacherId()===id||(!isTeacherUser()&&can('people.teachers','edit'))"),'Öğretmen başka öğretmenin rapor butonunu görememeli; kendi raporu korunmalı.');
assert(exact.includes("canTeacherReport(id)?`<button class=\"ka-btn ka-btn--secondary\" type=\"button\" data-exact-teacher-report"),'Exact öğretmen detay toolbarı raporu öğretmen sahipliğine göre üretmeli.');
assert(people.includes('canViewTeacherReport=o=>ownProfile(o)||(!isTeacherUser()&&canEdit())'),'Canonical People de aynı öğretmen rapor sınırını korumalı.');
assert(exact.includes('function back(){')&&exact.includes('if(detail){closeDetail();return true}'),'People visible owner fiziksel geri için detay kapatma API’si sunmalı.');
console.log('People canonical local-first davranış + exact legacy görünür ekran paritesi smoke testi başarılı.');
