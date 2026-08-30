const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/management.js','utf8');

assert(src.includes('DeviceData/IndexedDB -> AppStore'),'Management local-first veri akışı korunmalı.');
assert(!src.includes('db.collection('),'Management doğrudan Firestore kullanmamalı.');
for(const api of ['yeriEkle','yeriGuncelle','yeriSil','tatilEkle','atamaKaydet','amirKaydet','exceliUygula','otomatikDagitimUygula','defterDolduToggle']) assert(src.includes(api),`Nöbet V2 servis API eksik: ${api}`);
for(const text of ['Nöbet Programı','Tarih bazlı aylık nöbet çizelgesi','📍 Nöbet Yerleri','📥 Excel’den İçe Aktar','🖨️ Nöbet Listesi','🔄 Otomatik Nöbet Dağıtımı','Bugünün Nöbetçileri','Resmi Tatiller','+ Tatil Ekle','‹ Önceki Ay','Sonraki Ay ›','Nöbetçi Amir']) assert(src.includes(text),`Klasik Nöbet ekranı öğesi eksik: ${text}`);
for(const hook of ['data-duty-cell','data-duty-chief','data-duty-book','data-duty-holiday-add','data-duty-auto','data-duty-month','data-duty-places','data-duty-excel','data-duty-place-new','data-duty-place-edit','data-duty-place-delete']) assert(src.includes(hook),`Nöbet etkileşim sözleşmesi eksik: ${hook}`);
assert(src.includes('class="ka-duty-grid"'),'Aylık nöbet çizelgesi tablo anatomisi korunmalı.');
for(const marker of ['dutyMobile','ka-duty-mobile','ka-duty-mobile-chip','ka-duty-mobile-chief','ka-duty-mobile-notice']) assert(src.includes(marker),`Mobil Nöbet görünüm sözleşmesi eksik: ${marker}`);
assert(src.includes('${dutyMobile()}${dutyGrid()}'),'Mobil ve masaüstü Nöbet Programı aynı canonical render akışından üretilmeli.');
assert(!src.includes('MutationObserver'),'Nöbet mobil görünümü sonradan DOM yamasıyla üretilmemeli.');
assert(src.includes("device().set('nobetRotasyon',COL.nobetRotasyon"),'Rotasyon kaydı DeviceData üzerinden kalmalı.');
assert(src.includes("PermissionService?.can?.('management.duty.edit','edit')"),'Nöbet yazma işlemleri merkezi management.duty.edit yetkisine bağlı kalmalı.');
assert(src.includes('DutyBookService.toggle(atama,deger)'),'Management nöbet defteri ortak çekirdek servisine delege edilmeli.');
console.log('Classic Duty V2 görünüm + local-first + yönetim araçları sözleşmesi başarılı.');