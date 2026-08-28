const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('js/modules/payroll-change.js','utf8');
const index=fs.readFileSync('index.html','utf8');
new Function(src);

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

console.log('V2 maaş değişikliği formu sözleşmesi başarılı.');