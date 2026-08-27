const fs=require('fs');
const assert=require('assert');

const firebase=fs.readFileSync('js/firebase-init.js','utf8');
const rules=fs.readFileSync('firestore.rules','utf8');
const ui=fs.readFileSync('js/modules/teacher-list.js','utf8');

assert(firebase.includes("ogretmenListeSablon:'oy_ogretmenListeSablon'"),'Öğretmen liste şablonu merkezi COL haritasında kalmalı.');
assert(firebase.includes("ogretmenListeKayit:'oy_ogretmenListeKayit'"),'Öğretmen liste kayıtları merkezi COL haritasında kalmalı.');
assert(rules.includes('match /oy_ogretmenListeSablon/{id}'),'Öğretmen liste şablonu sahiplik kuralı korunmalı.');
assert(rules.includes('match /oy_ogretmenListeKayit/{id}'),'Öğretmen liste kayıt sahiplik kuralı korunmalı.');
assert(rules.includes('request.resource.data.ogretmenId == kendiOgretmenIdsi()'),'Öğretmen liste yazmaları bağlı öğretmen kimliğiyle sınırlandırılmalı.');

for(const token of [
  'secilenKeyler','sutunSirasi','ozelSutunlar','satirlar','sutunGenislikleri','sutunHizalama','baslikBilgisi',
  'Sıra No','Ad Soyad','Öğrenci No','Cinsiyet','Veli Adı','Telefon 1','Telefon 2','Adres','Servis','Sosyal Kulüp','Notlar',
  'data-teacher-list-column','data-teacher-list-move','data-teacher-list-align','data-teacher-list-width','data-teacher-list-custom-add',
  'data-teacher-list-report','data-teacher-list-excel','data-teacher-list-save','data-teacher-list-template-save',
  'A4 Önizleme / PDF',"Excel'e Aktar",'Dikey A4','Yatay A4'
]) assert(ui.includes(token),`Öğrenci Listesi Oluşturucu gerçek davranış sözleşmesi eksik: ${token}`);

assert(ui.includes("SyncEngine.register('ogretmenListeSablon'"),'Liste şablonları merkezi SyncEngine ile hydrate edilmeli.');
assert(ui.includes("SyncEngine.register('ogretmenListeKayit'"),'Kayıtlı çizelgeler merkezi SyncEngine ile hydrate edilmeli.');
assert(ui.includes("device().set('ogretmenListeSablon'"),'Şablon yazımı merkezi DeviceData üzerinden kalmalı.');
assert(ui.includes("device().add('ogretmenListeKayit'"),'Çizelge yazımı merkezi DeviceData üzerinden kalmalı.');
assert(ui.includes('global.OgretmenListeUI={open:openUI,render:renderUI,newDraft,openRecord,openReport,exportExcel}'),'Zengin Liste Oluşturucu UI API sözleşmesi korunmalı.');

console.log('Öğrenci Listesi Oluşturucu: gerçek koleksiyon + local-first + sütun/şablon/A4/Excel sözleşmesi başarılı.');
