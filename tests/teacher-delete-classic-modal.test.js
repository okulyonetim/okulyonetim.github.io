const fs=require('fs');
const assert=require('assert');
const feature=fs.readFileSync('js/core/teacher-delete-lifecycle.js','utf8');
assert(feature.includes("[data-exact-teacher-edit]"),'Klasik öğretmen Düzenle tıklaması yakalanmalı.');
assert(feature.includes("[data-exact-people-modal]"),'Klasik People modalı taranmalı.');
assert(feature.includes("Öğretmen Düzenle"),'Yalnız öğretmen düzenleme modalına sil eylemi eklenmeli.');
assert(feature.includes(".classic-modal-actions"),'Klasik modal alt eylem alanı desteklenmeli.');
assert(feature.includes("global.TeacherDeleteLifecycle={deleteTeacher,scan}"),'Silme tek güvenli yaşam döngüsünden yürümeli.');
console.log('Klasik öğretmen düzenleme modalı sil butonu sözleşmesi başarılı.');
