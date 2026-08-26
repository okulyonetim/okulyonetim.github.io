const fs = require('fs');
const assert = require('assert');

const sw = fs.readFileSync('service-worker.js', 'utf8');
const apkWorkflow = fs.readFileSync('.github/workflows/build-apk.yml', 'utf8');

assert(!fs.existsSync('firebase-messaging-sw.js'), 'Eski ikinci service worker dosyası geri gelmemeli.');
assert(!fs.existsSync('js/push.js'), 'Emekli push UI kökü geri gelmemeli.');
assert(sw.includes('messaging.onBackgroundMessage'), 'Web push ana service worker içinde işlenmeli.');
assert(/event\.request\.mode\s*===\s*['"]navigate['"]/.test(sw), 'index.html fallback yalnız navigation isteklerinde kullanılmalı.');
assert(/status\s*:\s*503/.test(sw), 'Cache ve ağ yoksa asset istekleri 503 dönmeli.');
assert(!sw.includes('event.waitUntil(agIstegi'), 'Cache-hit ağ yenilemesi geç FetchEvent.waitUntil çağrısı kullanmamalı.');

assert(apkWorkflow.includes('cp service-worker.js www/'), 'APK web paketine ana service worker kopyalanmalı.');
assert(!apkWorkflow.includes('cp firebase-messaging-sw.js www/'), 'APK build eski messaging worker dosyasını kopyalamamalı.');

console.log('PWA / background push sözleşmesi başarılı.');