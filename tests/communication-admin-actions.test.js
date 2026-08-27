const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/communication.js','utf8');
for(const token of ['data-announcement-new','data-announcement-edit','data-announcement-filter','data-poll-new','data-news-source-new','data-news-source-edit','openAnnouncementModal','openPollModal','openNewsSourceModal']) assert(src.includes(token),`İletişim yönetim UI sözleşmesi eksik: ${token}`);
for(const service of ['DuyurularService?.duyuruKaydet','AnketService?.anketOlustur','HaberlerService?.kaynakKaydet']) assert(src.includes(service),`İletişim yönetim işlemi mevcut service üzerinden yapılmalı: ${service}`);
assert(!src.includes('.collection('),'Communication UI doğrudan Firestore collection kullanmamalı.');
console.log('Communication yönetim aksiyonları sözleşmesi başarılı.');