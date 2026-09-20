const fs=require('fs');
const src=fs.readFileSync('js/core/admin-password-reset.js','utf8');
new Function(src);
if(!src.includes('ensureTeachersLoaded')) throw new Error('Öğretmen verisi modal öncesi yüklenmiyor');
if(!src.includes('dataset.originalTeacherId')) throw new Error('Mevcut öğretmen bağlantısı korunmuyor');
if(!src.includes('dataset.teacherDirty')) throw new Error('Öğretmen seçimi değişikliği izlenmiyor');
if(!src.includes("querySelectorAll('[data-user-password-panel]')")) throw new Error('Eski parola paneli temizlenmiyor');
if(!src.includes('korukPasswordEditor')) throw new Error('Yeni parola modalı işaretlenmiyor');
console.log('admin password teacher link regression: ok');
