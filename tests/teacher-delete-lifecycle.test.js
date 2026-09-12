const fs=require('fs');
const assert=require('assert');

const feature=fs.readFileSync('js/core/teacher-delete-lifecycle.js','utf8');
const firebase=fs.readFileSync('js/firebase-init.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

assert(feature.includes("data-teacher-delete"),'Mevcut öğretmen düzenleme modalında Sil eylemi bulunmalı.');
assert(feature.includes("clearClassAssignments"),'Sınıf öğretmenliği bağı silmede temizlenmeli.');
assert(feature.includes("'dersProgrami','nobetAtamalari','ogretmenYillikPlanSecimleri'"),'Aktif ders/nöbet/plan atamaları güvenli biçimde temizlenmeli.');
assert(feature.includes("clearSharedReferences"),'Kulüp ve belirli gün ortak öğretmen referansları temizlenmeli.');
assert(feature.includes("clearUserBindings"),'Bağlı kullanıcı hesabındaki öğretmen referansı temizlenmeli.');
assert(feature.includes("global.OgretmenRepository?.sil"),'Öğretmen kaydı local-first repository üzerinden en son silinmeli.');
assert(feature.includes("Tarihsel evrak ve izin kayıtları korunacak"),'Silme onayı veri kapsamını açıkça bildirmeli.');
assert(firebase.includes('teacher-delete-lifecycle.js?v=933'),'Öğretmen silme yaşam döngüsü başlangıçta yüklenmeli.');
assert(sw.includes("'./js/core/teacher-delete-lifecycle.js?v=933'"),'Yeni özellik çevrimdışı önbelleğe alınmalı.');
assert(/oy-cache-v(\d+)/.test(sw)&&Number(sw.match(/oy-cache-v(\d+)/)[1])>=933,'PWA cache sürümü yeni özellik için yenilenmeli.');

console.log('Öğretmen düzenleme güvenli silme yaşam döngüsü sözleşmesi başarılı.');
