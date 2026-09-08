const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('js/core/settings-admin-extension.js','utf8');
new Function(src);

assert(src.includes('ka-admin-stats'),'Mobil 2x2 özet alanı eksik.');
assert(src.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'Özet kartları 2x2 mobil düzende değil.');
assert(src.includes('ka-admin-section'),'Dikey açılır bölüm mimarisi eksik.');
assert(!src.includes('<strong>Gizli alan</strong>'),'Gizli alan uyarı kartı kaldırılmalı.');
assert(src.includes('notlar:[]'),'Çoklu not veri modeli eksik.');
assert(src.includes("data-admin-note-add"),'Yeni not ekleme aksiyonu eksik.');
assert(src.includes("data-admin-note-remove"),'Not silme aksiyonu eksik.');
assert(src.includes('data-admin-note-title'),'Not başlığı alanı eksik.');
assert(src.includes('data-admin-note-date'),'Not tarih alanı eksik.');
assert(src.includes('data-admin-note-content'),'Not içerik alanı eksik.');
assert(src.includes("legacy-note"),'Eski tek not verisinin migrasyonu eksik.');
assert(src.includes("noteRows[0]?.icerik||''"),'Legacy not uyumluluğu korunmuyor.');
assert(src.includes('overflow-x:hidden'),'Mobil yatay taşma koruması eksik.');
assert(src.includes('@media(max-width:640px)'),'Mobil kırılım eksik.');

console.log('İdari bilgiler mobil tasarım + çoklu not sözleşmesi başarılı.');
