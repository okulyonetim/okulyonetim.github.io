const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('js/modules/payroll-change.js','utf8');
const personnelDocs=fs.readFileSync('js/modules/personnel-documents.js','utf8');
const appLoader=fs.readFileSync('js/app-loader.js','utf8');
const index=fs.readFileSync('index.html','utf8');
new Function(src);
new Function(personnelDocs);

const shellUi=fs.readFileSync('js/core/shell-ui.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
assert(!index.includes('<script src="js/modules/payroll-change.js" defer></script>'),'V2 maaş formu ilk açılışta eager yüklenmemeli.');
assert(sw.includes("'./js/modules/payroll-change.js'"),'V2 maaş formu offline Service Worker cache içinde bulunmalı.');
assert(shellUi.includes("loadScript?.('js/modules/payroll-change.js')"),'V2 maaş formu özel route üzerinden ihtiyaç anında lazy yüklenmeli.');
assert(src.includes("rows('ogretmenler')"),'Maaş formu öğretmenleri AppStore/DeviceData kaynağından almalı.');
assert(src.includes("rows('personel')"),'Maaş formu diğer personeli gerçek Management personel kaynağından almalı.');
for(const section of ["B:[],C:[]","D:r.map","E:r.map","F:r.map","G:r.map","H:r.map"]) assert(src.includes(section),`Eski A-H veri modeli korunmalı: ${section}`);
assert(src.includes("PermissionService?.can?.('documents.view','preview')"),'Form görüntüleme yetkisi merkezi PermissionService ile yönetilmeli.');
assert(src.includes("PermissionService?.can?.('documents.edit','edit')"),'Form düzenleme yetkisi merkezi PermissionService ile yönetilmeli.');
assert(src.includes('function open(){if(!canView())'),'Doğrudan Payroll API açılışı documents.view sınırını aşmamalı.');
assert(src.includes('function render(root=document.getElementById(\'v2ModuleRoot\')){if(!root)return false;if(!canView())'),'Render girişinde de görüntüleme sınırı korunmalı.');
assert(src.includes('function print(){if(!canView())'),'Rapor çıktısı görüntüleme yetkisini aşmamalı.');
assert(src.includes("ReportEngine.printReport('Maaş Değişikliği Bildirim Formu'"),'Çıktı merkezi ReportEngine kullanmalı.');
assert(src.includes("yon:'yatay'"),'Maaş formu A4 yatay çıktı üretmeli.');
assert(src.includes("data-document-form='payroll'")||src.includes("dataset.documentForm='payroll'"),'Documents ekranına maaş formu girişi eklenmeli.');
for(const forbidden of ['db.collection','onSnapshot','localStorage','document.createElement(\'style\')','document.createElement("style")']) assert(!src.includes(forbidden),`V2 maaş formu ${forbidden} kullanmamalı.`);
assert(!src.includes('style="'),'V2 maaş formu inline CSS üretmemeli; design-system.css kullanılmalı.');

assert(!index.includes('<script src="js/modules/personnel-documents.js" defer></script>'),'Diploma belge adaptörü ilk açılışta eager yüklenmemeli.');
assert(sw.includes("'./js/modules/personnel-documents.js'"),'Diploma belge adaptörü offline Service Worker cache içinde bulunmalı.');
assert(appLoader.includes("window.ShellUI.registerPageRoute('diploma-request'"),'Diploma kayıt talep sayfası mevcut ShellUI route registry üzerinden açılmalı.');
assert(appLoader.includes("window.ShellUI.registerPageRoute('diploma-response'"),'Diploma okul cevabı sayfası mevcut ShellUI route registry üzerinden açılmalı.');
assert(appLoader.includes("loadScript('js/modules/personnel-documents.js')"),'Diploma belge adaptörü ihtiyaç anında lazy yüklenmeli.');
assert(appLoader.includes('Diploma Kayıt Talep Dilekçesi')&&appLoader.includes('Diploma Okul Dilekçesi'),'Eski Personel İşleri > Diploma İşlemleri menü hedefleri görünür olmalı.');
assert(personnelDocs.includes('SyncEngine.register(type,col)')&&personnelDocs.includes('SyncEngine.localHydrate(types)'),'Diploma belgesi okul/öğretmen verisini önce IndexedDB/AppStore üzerinden hydrate etmeli.');
assert(personnelDocs.includes('okul.mudurId?teacherName(okul.mudurId)'),'Okul müdürü mevcut mudurId alanından gerçek öğretmen kimliğiyle çözülmeli.');
for(const field of ['adSoyad','tc','babaAdi','anneAdi','dogumYeri','dogumTarihi','mezuniyetTarihi','mezunSinif','adres']) assert(personnelDocs.includes(`name="${field}"`),`Diploma talep alanı eksik: ${field}`);
for(const field of ['adSoyad','tc','babaAdi','kizOglu','dogumTarihi','ogrenimSuresi','diplomaTarihi','diplomaSayisi','adres','cepNo','mudurAdi']) assert(personnelDocs.includes(`name="${field}"`),`Diploma okul cevabı alanı eksik: ${field}`);
assert(personnelDocs.includes('Diplomamı kaybettiğimden tarafıma diploma kayıt örneği düzenlenmesi hususunda;'),'Eski diploma talep dilekçesi gövde metni korunmalı.');
assert(personnelDocs.includes('diplomayı almaya hak kazandığı resmi kayıtların incelenmesinden anlaşılmıştır.'),'Eski diploma okul cevabı gövde metni korunmalı.');
assert(personnelDocs.includes('ReportEngine.printReport(title,body'),'Diploma çıktıları merkezi ReportEngine kullanmalı.');
for(const forbidden of ['db.collection','onSnapshot','localStorage','document.createElement(\'style\')','document.createElement("style")']) assert(!personnelDocs.includes(forbidden),`Diploma belge adaptörü ${forbidden} kullanmamalı.`);
assert(!personnelDocs.includes('style="'),'Diploma belge adaptörü inline UI CSS üretmemeli.');

console.log('V2 maaş + diploma personel belge sözleşmesi başarılı.');