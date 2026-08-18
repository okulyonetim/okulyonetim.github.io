const fs = require('fs');
const assert = require('assert');

const sw = fs.readFileSync('service-worker.js', 'utf8');
const push = fs.readFileSync('js/push.js', 'utf8');
const apkWorkflow = fs.readFileSync('.github/workflows/build-apk.yml', 'utf8');

assert(!fs.existsSync('firebase-messaging-sw.js'), 'Eski ikinci service worker dosyası geri gelmemeli.');
assert(sw.includes("messaging.onBackgroundMessage"), 'Web push ana service worker içinde işlenmeli.');
assert(sw.includes("event.request.mode === 'navigate'"), 'index.html fallback yalnız navigation isteklerinde kullanılmalı.');
assert(sw.includes("status: 503"), 'Cache ve ağ yoksa asset istekleri 503 dönmeli.');

assert(push.includes("register('./service-worker.js')"), 'Push tokenı ana service worker kaydıyla alınmalı.');
assert(!push.includes("register('/okul/firebase-messaging-sw.js')"), 'İkinci service worker kaydı kullanılmamalı.');
assert(push.includes('_nativePushDinleyicileriKuruldu'), 'Native push listener tekrarlarını engelleyen guard bulunmalı.');
assert(push.includes('_webOnMessageDinleyicisiKuruldu'), 'Web foreground listener tekrarlarını engelleyen guard bulunmalı.');

assert(apkWorkflow.includes('cp service-worker.js www/'), 'APK web paketine ana service worker kopyalanmalı.');
assert(!apkWorkflow.includes('cp firebase-messaging-sw.js www/'), 'APK build eski messaging worker dosyasını kopyalamamalı.');

console.log('PWA / push smoke testleri başarılı.');
