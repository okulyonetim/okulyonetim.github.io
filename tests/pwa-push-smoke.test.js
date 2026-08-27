const fs = require('fs');
const assert = require('assert');

const sw = fs.readFileSync('service-worker.js', 'utf8');
const apkWorkflow = fs.readFileSync('.github/workflows/build-apk.yml', 'utf8');
const communication = fs.readFileSync('js/modules/communication.js', 'utf8');
const platform = fs.readFileSync('js/core/platform/widget-adapter.js', 'utf8');

assert(!fs.existsSync('firebase-messaging-sw.js'), 'Eski ikinci service worker dosyası geri gelmemeli.');
assert(!fs.existsSync('js/push.js'), 'Emekli push UI kökü geri gelmemeli.');
assert(sw.includes('messaging.onBackgroundMessage'), 'Web push ana service worker içinde işlenmeli.');
assert(/event\.request\.mode\s*===\s*['"]navigate['"]/.test(sw), 'index.html fallback yalnız navigation isteklerinde kullanılmalı.');
assert(/status\s*:\s*503/.test(sw), 'Cache ve ağ yoksa asset istekleri 503 dönmeli.');
assert(!sw.includes('event.waitUntil(agIstegi'), 'Cache-hit ağ yenilemesi geç FetchEvent.waitUntil çağrısı kullanmamalı.');

assert(apkWorkflow.includes('cp service-worker.js www/'), 'APK web paketine ana service worker kopyalanmalı.');
assert(!apkWorkflow.includes('cp firebase-messaging-sw.js www/'), 'APK build eski messaging worker dosyasını kopyalamamalı.');

for(const token of ['PushRepository','PushService','data-news-settings','data-news-settings-save','data-news-category','data-news-hour-start','data-news-hour-end','bildirimSaatBaslangic','bildirimSaatBitis']) assert(communication.includes(token), `Haber bildirim sözleşmesi eksik: ${token}`);
assert(communication.includes("device().set('cihazlar',COL.cihazlar"), 'Cihaz bildirim tercihleri DeviceData üzerinden yazılmalı.');
assert(communication.includes("q.where('uid','==',u)"), 'Cihaz cache sorgusu aktif kullanıcıyla sınırlandırılmalı.');
assert(communication.includes('KorukPlatformAdapter?.pushToken?.({request})'), 'Communication push tokenını merkezi platform adaptöründen almalı.');
assert(communication.includes('KorukPlatformAdapter?.pushPermission?.()'), 'Communication push izin durumunu merkezi platform adaptöründen almalı.');
assert(!/Capacitor\?*\.|PushNotifications/.test(communication), 'Communication modülü native Push API kullanmamalı; platform adaptörü kullanılmalı.');
for(const token of ['pushPermission','pushToken','PushNotifications']) assert(platform.includes(token), `Platform push adaptörü eksik: ${token}`);
assert(!communication.includes('localStorage.setItem'), 'Haber bildirim tercihleri ikinci localStorage state oluşturmamalı.');
assert(!communication.includes('.collection('), 'Communication UI/repository doğrudan Firestore collection kullanmamalı.');

console.log('PWA / background push + local-first haber bildirim ayarları platform sözleşmesi başarılı.');