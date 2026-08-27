const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/academic.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');

assert(src.includes('const DersProgramiRepository='),'Ders Programı V2 repository bulunmalı.');
assert(src.includes('const DersProgramiService='),'Ders Programı V2 service bulunmalı.');
assert(src.includes("device().add('dersProgrami',COL.dersProgrami"),'Ders Programı yazımı DeviceData üzerinden olmalı.');
assert(src.includes("device().update('dersProgrami',COL.dersProgrami"),'Ders Programı güncellemesi DeviceData üzerinden olmalı.');
assert(src.includes("device().remove('dersProgrami',COL.dersProgrami"),'Ders Programı silmesi DeviceData üzerinden olmalı.');
assert(!src.includes('db.collection('),'Academic doğrudan Firestore kullanmamalı.');

for(const field of ['sinif','gun','saat','ders','ogretmenId']) assert(src.includes(field),`Gerçek ders programı alanı eksik: ${field}`);
for(const text of ['Ders Programı','Bir hücreye tıklayarak ders ekleyin/düzenleyin','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Teneffüs','Öğle Arası']) assert(src.includes(text),`Klasik Ders Programı öğesi eksik: ${text}`);
for(const hook of ['data-schedule-cell','academicClassSelect','ka-schedule-table','ka-schedule-break']) assert(src.includes(hook),`Ders Programı etkileşim/DOM sözleşmesi eksik: ${hook}`);
assert(src.includes('ogretmenCakismasi'),'Öğretmenin aynı gün/saatte iki sınıfa atanması engellenmeli.');
assert(src.includes("dersProgrami:COL?.dersProgrami")&&src.includes("dersListesi:COL?.dersListesi"),'Ders Programı yardımcı verileri SyncEngine ile local-first hazırlanmalı.');
assert(src.includes("PermissionService.can('academic.schedule.edit','edit')"),'Ders Programı mutation sınırı merkezi academic.schedule.edit iznini kullanmalı.');
assert(loader.includes("['academic.schedule','Ders Programı','section']")&&loader.includes("['academic.schedule.edit','Ders Programı düzenleme','action']"),'Ders Programı izinleri merkezi rol kataloğunda görünmeli.');
assert(loader.includes("'academic.schedule':['dersProgrami']")&&loader.includes("'academic.schedule.edit':['dersProgrami']"),'Eski dersProgrami yetkisi yeni merkezi permission sistemine migrate edilmeli.');
console.log('Classic Lesson Schedule V2 görünüm + local-first + merkezi rol sözleşmesi başarılı.');
