const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const sw = fs.readFileSync('service-worker.js', 'utf8');
const apkWorkflow = fs.readFileSync('.github/workflows/build-apk.yml', 'utf8');
const communication = fs.readFileSync('js/modules/communication.js', 'utf8');
const platform = fs.readFileSync('js/core/platform/widget-adapter.js', 'utf8');
const rss = fs.readFileSync('scripts/rss-fetch.js', 'utf8');

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

for(const token of ['bildirimSaatBaslangic','bildirimSaatBitis','bildirimSaatiUygunMu','Europe/Istanbul']) assert(rss.includes(token), `RSS haber saat filtresi eksik: ${token}`);
assert(rss.includes('kategoriUygunCihazlar.filter(c => bildirimSaatiUygunMu(c, saat))'), 'RSS hedef token listesi cihaz saat filtresinden geçmeli.');

// Üretim RSS dosyasındaki gerçek saat yardımcılarını firebase-admin bağımlılığını
// yüklemeden izole edip çalıştır. Böylece Client Architecture işi npm install
// gerektirmeden sınır/gece yarısı davranışını doğrulayabilir.
const helperStart = rss.indexOf('function gecerliSaatMi');
const helperEnd = rss.indexOf('async function eskiHaberleriTemizle');
assert(helperStart >= 0 && helperEnd > helperStart, 'RSS saat yardımcı fonksiyonları bulunamadı.');
const helperContext = { Intl, Date };
vm.createContext(helperContext);
vm.runInContext(
  `${rss.slice(helperStart, helperEnd)}\nthis.__helpers={bildirimSaatiUygunMu,turkiyeSaatiHHMM};`,
  helperContext
);
const { bildirimSaatiUygunMu, turkiyeSaatiHHMM } = helperContext.__helpers;

assert.strictEqual(turkiyeSaatiHHMM(new Date('2026-09-11T21:40:00Z')), '00:40', 'RSS bildirimi Türkiye yerel saatini kullanmalı.');
const gunduz = { bildirimSaatBaslangic:'07:00', bildirimSaatBitis:'23:00' };
assert.strictEqual(bildirimSaatiUygunMu(gunduz, '00:40'), false, '07:00–23:00 ayarında 00:40 bildirimi engellenmeli.');
assert.strictEqual(bildirimSaatiUygunMu(gunduz, '07:00'), true, 'Başlangıç saati dahil olmalı.');
assert.strictEqual(bildirimSaatiUygunMu(gunduz, '23:00'), true, 'Bitiş saati dahil olmalı.');
assert.strictEqual(bildirimSaatiUygunMu(gunduz, '23:01'), false, 'Bitiş saatinden sonra bildirim engellenmeli.');
const gece = { bildirimSaatBaslangic:'22:00', bildirimSaatBitis:'06:00' };
assert.strictEqual(bildirimSaatiUygunMu(gece, '23:30'), true, 'Gece yarısını aşan aralık gece tarafını desteklemeli.');
assert.strictEqual(bildirimSaatiUygunMu(gece, '05:59'), true, 'Gece yarısını aşan aralık sabah tarafını desteklemeli.');
assert.strictEqual(bildirimSaatiUygunMu(gece, '12:00'), false, 'Gece aralığının dışındaki gündüz saati engellenmeli.');
assert.strictEqual(bildirimSaatiUygunMu({}, '00:40'), true, 'Saat tercihi olmayan eski cihazlar geriye dönük uyumlu kalmalı.');

console.log('PWA / background push + local-first haber bildirim ayarları platform sözleşmesi başarılı.');