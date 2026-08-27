const fs=require('fs');
const assert=require('assert');
const people=fs.readFileSync('js/modules/people.js','utf8');

assert(people.includes("DeviceData/IndexedDB -> AppStore -> UI"),'People local-first veri sınırı korunmalı.');
assert(people.includes("device().add('siniflar',COL.siniflar"),'Sınıf yazımı DeviceData üzerinden kalmalı.');
assert(people.includes("device().add('veliler',COL.veliler"),'Öğrenci/veli yazımı DeviceData üzerinden kalmalı.');
assert(!people.includes('db.collection('),'People UI/repository doğrudan Firestore kullanmamalı.');
assert(!people.includes('localStorage.setItem('),'People kalıcı veriyi localStorage ile yazmamalı.');

for(const tab of ['teachers','classes','students']) assert(people.includes(`data-people-tab=\"${tab}\"`),`Shell yönlendirme kancası eksik: ${tab}`);
for(const marker of ['ka-teacher-directory','ka-teacher-profile','ka-teacher-summary','ka-teacher-actions','data-teacher-detail','data-teacher-edit','data-teacher-report','data-teacher-program','data-teacher-message']) assert(people.includes(marker),`Yeni Öğretmenler/profil akışı öğesi eksik: ${marker}`);
for(const marker of ['ka-class-directory','ka-class-card','data-class-level','data-class-detail','data-class-tab','data-class-seating','ka-student-directory','ka-student-card','data-student-class','data-gender-filter','data-student-detail','data-student-results','data-results-filter','ka-people-student-list','data-class-add','data-class-edit','data-class-delete','data-student-add','data-student-edit','data-student-delete','classForm','studentForm']) assert(people.includes(marker),`Sınıf/öğrenci yönetim akışı öğesi eksik: ${marker}`);
for(const label of ['Öğretmenler','Sınıflar','Öğrenciler','Öğrenci Detayı','Sınav Sonuçları','DERS PROGRAMI','NÖBETLER','KULÜP DANIŞMANLIĞI','BELİRLİ GÜN VE HAFTALAR','DİĞER EVRAK']) assert(people.includes(label),`People görünüm öğesi eksik: ${label}`);
assert(people.includes("data('denemeSonuclari')")&&people.includes("data('testSonuclari')"),'Öğrenci sonuç detayı gerçek Deneme/Test cache verilerini kullanmalı.');
assert(people.includes("data('yoklama')"),'Öğrenci detayındaki devamsızlık özeti merkezi yoklama cache ini kullanmalı.');
assert(people.includes("PermissionService.can('people.classes','edit')"),'Sınıf yazmaları merkezi people.classes edit sınırına bağlı olmalı.');
assert(people.includes("PermissionService.can('people.students.edit','edit')"),'Öğrenci yazmaları merkezi people.students.edit sınırına bağlı olmalı.');
assert(people.includes("if(count){global.toast?.(`Bu sınıfta ${count} öğrenci var."),'Öğrencili sınıf doğrudan silinmemeli.');
assert(people.includes('BelgeDurumuService'),'Öğretmen belge durumu akışı korunmalı.');

console.log('People V2 bağımsız öğretmen + sınıf + öğrenci/detay local-first yönetim sözleşmesi başarılı.');
