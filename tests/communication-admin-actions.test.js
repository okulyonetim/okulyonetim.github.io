const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/communication.js','utf8');
for(const token of ['data-announcement-new','data-announcement-edit','data-announcement-filter','data-poll-new','data-news-source-new','data-news-source-edit','openAnnouncementModal','openPollModal','openNewsSourceModal']) assert(src.includes(token),`İletişim yönetim UI sözleşmesi eksik: ${token}`);
for(const service of ['DuyurularService?.duyuruKaydet','DuyurularService?.resimYukle','AnketService?.anketOlustur','HaberlerService?.kaynakKaydet']) assert(src.includes(service),`İletişim yönetim işlemi mevcut service üzerinden yapılmalı: ${service}`);
for(const token of ['resimYukle(dosya','storagePath','name="resimler"','multiple','pollAdminDetails','Kim neye oy verdi?','secenekIdler:ids,ad:']) assert(src.includes(token),`Duyuru/anket eski gerçek davranış sözleşmesi eksik: ${token}`);
assert(!src.includes('.collection('),'Communication UI doğrudan Firestore collection kullanmamalı.');
console.log('Communication yönetim + duyuru görsel + admin anket oy ayrıntısı sözleşmesi başarılı.');
