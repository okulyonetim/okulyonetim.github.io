const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('js/modules/documents.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
new Function(src);

for(const hook of ['data-document-form="teblig"','data-teblig-field="tarihIso"','data-teblig-field="sayi"','data-teblig-field="konu"','data-teblig-teacher','data-teblig-add','data-teblig-role','data-teblig-remove','data-teblig-report']) assert(src.includes(hook),`Tebliğ-Tebellüğ V2 davranışı eksik: ${hook}`);
assert(src.includes("arr('ogretmenler')"),'Tebellüğ personeli mevcut AppStore öğretmen verisinden gelmeli.');
assert(src.includes("arr('okulBilgileri')"),'Rapor başlığı mevcut okul bilgilerini kullanmalı.');
assert(src.includes("PermissionService?.can?.('documents.view','preview')"),'Form erişimi merkezi documents.view yetkisine bağlı olmalı.');
assert(src.includes("PermissionService?.can?.('documents.edit','edit')"),'Form düzenleme merkezi documents.edit yetkisine bağlı olmalı.');
assert(src.includes("ReportEngine?.printReport")||src.includes("ReportEngine.printReport"),'A4/PDF çıktısı merkezi ReportEngine kullanmalı.');
assert(src.includes('Tebliğ‑Tebellüğ Belgesi')||src.includes('Tebliğ-Tebellüğ Belgesi'),'Resmi belge başlığı korunmalı.');
assert(src.includes('<th>Adı Soyadı</th>')&&src.includes('<th>Görevi</th>')&&src.includes('<th>İmza</th>'),'Tebellüğ imza tablosu korunmalı.');
assert(!src.includes('db.collection'),'Documents formu doğrudan Firestore kullanmamalı.');
assert(!src.includes("createElement('style')"),'Documents V2 kendi CSS katmanını üretmemeli.');
assert(!index.includes('<script src="js/modules/report-engine.js" defer></script>'),'ReportEngine başlangıç shelline eager dönmemeli.');
assert(loader.includes("define('documents',['js/modules/report-engine.js','js/modules/documents.js'])"),'Documents açılmadan önce merkezi ReportEngine lazy bundle içinde yüklenmeli.');

console.log('Documents V2 Tebliğ-Tebellüğ + lazy ReportEngine sözleşmesi başarılı.');
