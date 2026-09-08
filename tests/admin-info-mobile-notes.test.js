const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('js/core/settings-admin-extension.js','utf8');
new Function(src);

assert(src.includes('ka-admin-stats'),'Mobil 2x2 özet alanı eksik.');
assert(src.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'Özet kartları 2x2 mobil düzende değil.');
assert(src.includes('ka-admin-section__header'),'Sabit bölüm başlığı eksik.');
assert(!src.includes('<details class="ka-admin-section"'),'İdari bilgiler ekranında akordiyon/details kullanılmamalı.');
assert(!src.includes('.ka-admin-section>summary'),'Akordiyon summary stili kalmamalı.');
assert(src.includes('abonelikler:[]'),'Çoklu abonelik veri modeli eksik.');
assert(src.includes('data-admin-subscription-add'),'Abonelik ekleme aksiyonu eksik.');
assert(src.includes('data-admin-subscription-remove'),'Abonelik silme aksiyonu eksik.');
assert(src.includes("['Elektrik','Su','İnternet','Doğalgaz','Telefon','Diğer']"),'Esnek abonelik türleri eksik.');
assert(src.includes('resmiBilgiler:[]'),'Çoklu resmî bilgi veri modeli eksik.');
assert(src.includes('data-admin-number-unit'),'İlkokul/Ortaokul birim seçimi eksik.');
assert(src.includes("['Ortak','İlkokul','Ortaokul','Diğer']"),'Resmî bilgi birim seçenekleri eksik.');
assert(src.includes('data-admin-note-add')&&src.includes('+ Not Ekle'),'Görünür not ekleme aksiyonu eksik.');
assert(src.includes('data-admin-note-remove'),'Not silme aksiyonu eksik.');
assert(src.includes('legacy-note'),'Eski tek not verisinin migrasyonu eksik.');
assert(src.includes('overflow-x:hidden'),'Mobil yatay taşma koruması eksik.');
assert(!src.includes('<strong>Gizli alan</strong>'),'Gizli alan uyarısı geri gelmemeli.');

console.log('İdari bilgiler sabit bölümler + esnek abonelik/resmî bilgi + çoklu not sözleşmesi başarılı.');
