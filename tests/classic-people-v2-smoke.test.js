const fs=require('fs');
const assert=require('assert');
const people=fs.readFileSync('js/modules/people.js','utf8');

assert(people.includes("DeviceData/IndexedDB -> AppStore -> UI"),'People local-first veri sınırı korunmalı.');
assert(people.includes("device().add('siniflar',COL.siniflar"),'Sınıf yazımı DeviceData üzerinden kalmalı.');
assert(people.includes("device().add('veliler',COL.veliler"),'Öğrenci/veli yazımı DeviceData üzerinden kalmalı.');
assert(!people.includes('db.collection('),'People UI/repository doğrudan Firestore kullanmamalı.');
assert(!people.includes('localStorage.setItem('),'People kalıcı veriyi localStorage ile yazmamalı.');

for(const tab of ['teachers','classes','students']) assert(people.includes(`data-people-tab=\"${tab}\"`),`People sekmesi eksik: ${tab}`);
for(const label of ['Öğretmenler','Okuldaki öğretmenlerin bilgileri','Ada veya branşa göre ara...','Tümü','İlkokul','Ortaokul']) assert(people.includes(label),`Klasik Öğretmenler ekranı öğesi eksik: ${label}`);
for(const col of ['Ad Soyad','Ünvan','Branş','Okul','Telefon','E-posta','Sorumlu Sınıf']) assert(people.includes(`<th>${col}</th>`),`Öğretmenler tablo sütunu eksik: ${col}`);
for(const col of ['Sınıf','Seviye','Sınıf Öğretmeni','Öğrenci','Kız','Erkek','Derslik']) assert(people.includes(`<th>${col}</th>`),`Sınıflar tablo sütunu eksik: ${col}`);
for(const item of ['👨‍🎓 Öğrenciler','Tüm Sınıflar','Tüm','Kız','Erkek','peopleClassFilter','peopleGenderFilter']) assert(people.includes(item),`Klasik Öğrenciler filtre öğesi eksik: ${item}`);
assert(people.includes('ka-table ka-people-table'),'Öğretmenler/Sınıflar masaüstü tablo anatomisi korunmalı.');
assert(people.includes('ka-people-student-list'),'Öğrenciler ayrı kart listesi olarak kalmalı.');

console.log('Classic People V2 görünüm + local-first sözleşmesi başarılı.');
