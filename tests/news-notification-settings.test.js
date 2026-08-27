const fs=require('fs');
const assert=require('assert');
const communication=fs.readFileSync('js/modules/communication.js','utf8');
const platform=fs.readFileSync('js/core/platform/widget-adapter.js','utf8');

for(const token of ['PushRepository','PushService','data-news-settings','data-news-settings-save','data-news-category','data-news-hour-start','data-news-hour-end','bildirimSaatBaslangic','bildirimSaatBitis']) assert(communication.includes(token),`Haber bildirim sözleşmesi eksik: ${token}`);
assert(communication.includes("device().set('cihazlar',COL.cihazlar"),'Cihaz bildirim tercihleri DeviceData üzerinden yazılmalı.');
assert(communication.includes("q.where('uid','==',u)"),'Cihaz cache sorgusu aktif kullanıcıyla sınırlandırılmalı.');
assert(!/Capacitor\?*\.|PushNotifications/.test(communication),'Communication modülü native Push API kullanmamalı; platform adaptörü kullanılmalı.');
for(const token of ['pushPermission','pushToken','PushNotifications']) assert(platform.includes(token),`Platform push adaptörü eksik: ${token}`);
assert(!communication.includes('localStorage.setItem'),'Haber bildirim tercihleri ikinci localStorage state oluşturmamalı.');
assert(!communication.includes('.collection('),'Communication UI/repository doğrudan Firestore collection kullanmamalı.');
console.log('Haber bildirim ayarları local-first platform sözleşmesi başarılı.');
