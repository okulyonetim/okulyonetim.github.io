const fs=require('fs');
const assert=require('assert');
const communication=fs.readFileSync('js/modules/communication.js','utf8');
for(const token of ['data-calendar-prev','data-calendar-next','data-calendar-today','data-calendar-day','data-calendar-upcoming','Takvim Özeti','Yaklaşan 30 Gün']) assert(communication.includes(token),`Takvim aylık görünüm sözleşmesi eksik: ${token}`);
assert(communication.includes("visibleCalendar('hatirlaticilar')"),'Takvim hatırlatıcıları gerçek local-first kaynaktan okumalı.');
assert(communication.includes("visibleCalendar('gorevler')"),'Takvim görevleri gerçek local-first kaynaktan okumalı.');
console.log('Takvim aylık görünüm sözleşmesi başarılı.');