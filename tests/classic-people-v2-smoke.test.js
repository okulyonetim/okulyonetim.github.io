const fs=require('fs');
const assert=require('assert');
const people=fs.readFileSync('js/modules/people.js','utf8');

assert(people.includes("DeviceData/IndexedDB -> AppStore -> UI"),'People local-first veri sınırı korunmalı.');
assert(people.includes("device().add('siniflar',COL.siniflar"),'Sınıf yazımı DeviceData üzerinden kalmalı.');
assert(people.includes("device().add('veliler',COL.veliler"),'Öğrenci/veli yazımı DeviceData üzerinden kalmalı.');
assert(!people.includes('db.collection('),'People UI/repository doğrudan Firestore kullanmamalı.');
assert(!people.includes('localStorage.setItem('),'People kalıcı veriyi localStorage ile yazmamalı.');

for(const tab of ['teachers','classes','students']) assert(people.includes(`data-people-tab=\"${tab}\"`),`People sekmesi eksik: ${tab}`);
for(const marker of ['ka-teacher-directory','ka-teacher-profile','ka-teacher-summary','ka-teacher-actions','data-teacher-detail','data-teacher-edit','data-teacher-report','data-teacher-program','data-teacher-message']) assert(people.includes(marker),`Yeni Öğretmenler/profil akışı öğesi eksik: ${marker}`);
for(const marker of ['peopleClassFilter','peopleGenderFilter','ka-people-student-list','data-class-add','data-class-edit','data-class-delete','data-student-add','data-student-edit','data-student-delete','classForm','studentForm']) assert(people.includes(marker),`Sınıf/öğrenci yönetim akışı öğesi eksik: ${marker}`);
for(const label of ['Öğretmenler','Sınıflar','Öğrenciler','DERS PROGRAMI','NÖBETLER','KULÜP DANIŞMANLIĞI','BELİRLİ GÜN VE HAFTALAR','DİĞER EVRAK']) assert(people.includes(label),`People görünüm öğesi eksik: ${label}`);
assert(people.includes('ka-people-table'),'Sınıf veri tablosunun merkezi tablo anatomisi korunmalı.');
assert(people.includes("PermissionService.can('people.classes','edit')"),'Sınıf yazmaları merkezi people.classes edit sınırına bağlı olmalı.');
assert(people.includes("PermissionService.can('people.students.edit','edit')"),'Öğrenci yazmaları merkezi people.students.edit sınırına bağlı olmalı.');
assert(people.includes("if(count){global.toast?.(`Bu sınıfta ${count} öğrenci var."),'Öğrencili sınıf doğrudan silinmemeli.');
assert(people.includes('BelgeDurumuService'),'Öğretmen belge durumu akışı korunmalı.');

console.log('People V2 öğretmen + sınıf + öğrenci local-first yönetim sözleşmesi başarılı.');
