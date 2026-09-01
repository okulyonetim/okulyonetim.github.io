const fs=require('fs');
const assert=require('assert');
const communication=fs.readFileSync('js/modules/communication.js','utf8');
for(const token of ['data-calendar-prev','data-calendar-next','data-calendar-today','data-calendar-day','data-calendar-upcoming','Takvim Özeti','Yaklaşan 30 Gün']) assert(communication.includes(token),`Takvim aylık görünüm sözleşmesi eksik: ${token}`);
assert(communication.includes("visibleCalendar('hatirlaticilar')"),'Takvim hatırlatıcıları gerçek local-first kaynaktan okumalı.');
assert(communication.includes("visibleCalendar('gorevler')"),'Takvim görevleri gerçek local-first kaynaktan okumalı.');

assert(!communication.includes('await global.TakvimService?.hatirlaticiKaydet')&&!communication.includes('await global.TakvimService?.gorevKaydet'),'Takvim UI browser scope dışında global değişkenine başvurmamalı.');
assert(communication.includes('const service=globalThis.TakvimService')&&communication.includes("submit.textContent='Kaydediliyor…'")&&communication.includes('await service.hatirlaticiKaydet')&&communication.includes('await service.gorevKaydet'),'Hatırlatıcı/Görev Kaydet butonu gerçek TakvimService çağrısını görünür bekleme durumuyla çalıştırmalı.');
assert(communication.includes("v.tamamlandi=existing?.tamamlandi===true"),'Hatırlatıcı düzenleme mevcut tamamlandı durumunu yanlışlıkla sıfırlamamalı.');
console.log('Takvim aylık görünüm sözleşmesi başarılı.');