const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('js/modules/payroll-change.js','utf8');
const index=fs.readFileSync('index.html','utf8');
new Function(src);

assert(index.includes('js/modules/payroll-change.js'),'V2 maaş formu üretim shell içinde yüklenmeli.');
assert(src.includes("rows('ogretmenler')"),'Maaş formu öğretmenleri AppStore/DeviceData kaynağından almalı.');
assert(src.includes("rows('personel')"),'Maaş formu diğer personeli gerçek Management personel kaynağından almalı.');
for(const section of ["B:[],C:[]","D:r.map","E:r.map","F:r.map","G:r.map","H:r.map"]) assert(src.includes(section),`Eski A-H veri modeli korunmalı: ${section}`);
assert(src.includes("PermissionService?.can?.('documents.edit','edit')"),'Form düzenleme yetkisi merkezi PermissionService ile yönetilmeli.');
assert(src.includes("ReportEngine.printReport('Maaş Değişikliği Bildirim Formu'"),'Çıktı merkezi ReportEngine kullanmalı.');
assert(src.includes("yon:'yatay'"),'Maaş formu A4 yatay çıktı üretmeli.');
assert(src.includes("data-document-form='payroll'")||src.includes("dataset.documentForm='payroll'"),'Documents ekranına maaş formu girişi eklenmeli.');
for(const forbidden of ['db.collection','onSnapshot','localStorage','document.createElement(\'style\')','document.createElement("style")']) assert(!src.includes(forbidden),`V2 maaş formu ${forbidden} kullanmamalı.`);
assert(!src.includes('style="'),'V2 maaş formu inline CSS üretmemeli; design-system.css kullanılmalı.');

console.log('V2 maaş değişikliği formu sözleşmesi başarılı.');
