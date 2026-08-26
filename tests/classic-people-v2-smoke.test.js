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
for(const marker of ['peopleClassFilter','peopleGenderFilter','ka-people-student-list']) assert(people.includes(marker),`Öğrenci filtre/liste öğesi eksik: ${marker}`);
for(const label of ['Öğretmenler','Sınıflar','Öğrenciler','DERS PROGRAMI','NÖBETLER','KULÜP DANIŞMANLIĞI','BELİRLİ GÜN VE HAFTALAR','DİĞER EVRAK']) assert(people.includes(label),`People görünüm öğesi eksik: ${label}`);
assert(people.includes('ka-people-table'),'Sınıf/öğrenci veri tablolarının merkezi tablo anatomisi korunmalı.');
assert(people.includes('BelgeDurumuService'),'Öğretmen belge durumu akışı korunmalı.');

console.log('People V2 modern profil + local-first sözleşmesi başarılı.');
