const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/management.js','utf8');

assert(src.includes('DeviceData/IndexedDB -> AppStore'),'Management local-first veri akışı korunmalı.');
assert(!src.includes('db.collection('),'Management doğrudan Firestore kullanmamalı.');
for(const api of ['yeriEkle','tatilEkle','atamaKaydet','amirKaydet','otomatikDagitimUygula','defterDolduToggle']) assert(src.includes(api),`Nöbet V2 servis API eksik: ${api}`);
for(const text of ['Nöbet Programı','Tarih bazlı aylık nöbet çizelgesi','+ Yeni Nöbet Yeri','🖨️ Nöbet Listesi','🔄 Otomatik Nöbet Dağıtımı','Bugünün Nöbetçileri','Resmi Tatiller','+ Tatil Ekle','‹ Önceki Ay','Sonraki Ay ›','Nöbetçi Amir']) assert(src.includes(text),`Klasik Nöbet ekranı öğesi eksik: ${text}`);
for(const hook of ['data-duty-cell','data-duty-chief','data-duty-book','data-duty-holiday-add','data-duty-auto','data-duty-month']) assert(src.includes(hook),`Nöbet etkileşim sözleşmesi eksik: ${hook}`);
assert(src.includes('class="ka-duty-grid"'),'Aylık nöbet çizelgesi tablo anatomisi korunmalı.');
assert(src.includes("device().set('nobetRotasyon',COL.nobetRotasyon"),'Rotasyon kaydı DeviceData üzerinden kalmalı.');
console.log('Classic Duty V2 görünüm + local-first sözleşmesi başarılı.');
