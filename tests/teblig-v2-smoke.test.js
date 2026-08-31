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
assert(src.includes('Tebliğ-Tebellüğ İmza Sirküsü'),'Eski görünür İmza Sirküsü başlığı korunmalı.');
assert(src.includes('TEBLİĞ-TEBELLÜĞ İMZA SİRKÜSÜ'),'Resmi A4 üst başlığı korunmalı.');
assert(src.includes('TARİH, SAYI VE KONUSU BELİRTİLEN YAZIYI OKUDUM VE BİLGİ EDİNDİM.'),'Eski resmi tebellüğ beyanı korunmalı.');
assert(src.includes("unvan==='Öğretmen'&&o.brans")&&src.includes('Öğrt.'),'Öğretmen görev metni eski davranış gibi branş + Öğrt. olmalı.');
assert(src.includes('<th>S.NO</th>')&&src.includes('<th>ADI VE SOYADI</th>')&&src.includes('<th>GÖREVİ</th>')&&src.includes('<th>İMZA</th>'),'Tebellüğ imza tablosunun resmi başlıkları korunmalı.');
assert(!src.includes('db.collection'),'Documents formu doğrudan Firestore kullanmamalı.');
assert(!src.includes("createElement('style')"),'Documents V2 kendi CSS katmanını üretmemeli.');
assert(!index.includes('<script src="js/modules/report-engine.js" defer></script>'),'ReportEngine başlangıç shelline eager dönmemeli.');
const documentsBundle=loader.match(/define\('documents',\[([^\]]+)\]\)/)?.[1]||'';
assert(documentsBundle.includes("'js/modules/report-engine.js'")&&documentsBundle.includes("'js/modules/documents.js'")&&documentsBundle.indexOf("'js/modules/report-engine.js'")<documentsBundle.indexOf("'js/modules/documents.js'"),'Documents açılmadan önce merkezi ReportEngine ek lazy bağımlılıklar olsa da documents.js’den önce yüklenmeli.');

console.log('Documents V2 Tebliğ-Tebellüğ + lazy ReportEngine sözleşmesi başarılı.');
