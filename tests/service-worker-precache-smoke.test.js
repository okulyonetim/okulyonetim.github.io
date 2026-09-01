const fs = require('fs');
const assert = require('assert');
const sw = fs.readFileSync('service-worker.js', 'utf8');

assert(/const CACHE_ADI\s*=\s*'oy-cache-v\d+'/.test(sw), 'Service Worker sürümlü cache anahtarı kullanmalı.');
const loader = fs.readFileSync('js/app-loader.js', 'utf8');
assert(sw.includes("const CACHE_ADI='oy-cache-v837'"), 'Yeni runtime ayrı v835 cache anahtarı kullanmalı.');
assert(sw.includes("self.clients.matchAll({type:'window',includeUncontrolled:true})")&&sw.includes('client.navigate(client.url)'), 'Yeni Service Worker eski runtime kullanan açık PWA pencerelerini yeni belgeye taşımalı.');
assert(loader.includes("register('./service-worker.js?v=837',{updateViaCache:'none'})")&&loader.includes('await reg.update()'), 'AppLoader Service Worker güncellemesini HTTP cache dışından zorlamalı.');
for (const f of [
  './index.html',
  './manifest.json',
  './css/design-system.css',
  './js/firebase-init.js',
  './js/core/core.js',
  './js/core/shell-ui.js',
  './js/modules/dashboard.js',
  './js/modules/rubric-settings.js',
  './js/modules/rubric-tools.js',
  './js/modules/rubric-tools-engine.js',
  './js/auth.js',
  './js/app-loader.js'
]) assert(sw.includes(`'${f}'`), `${f} çekirdek precache içinde kalmalı.`);

const liste = sw.slice(sw.indexOf('const ONBELLEGE_ALINACAKLAR'), sw.indexOf("self.addEventListener('install'"));
for (const eski of [
  './app-v2.html','./css/styles.css','./js/app.js','./js/ui.js',
  './js/core/local-first-sync.js','./js/core/sync-engine.js','./js/core/app-bootstrap.js',
  './css/web-shell-fix.css','./css/web-sidebar-v2.css','./css/dashboard-yeni.css','./css/dashboard-home.css',
  './js/ui-stability-fixes.js','./js/dashboard-v2-init.js','./js/web-sidebar-v2.js','./js/deneme-sayac-local-first-v2.js',
  './js/modules/communication-legacy-ui.js','./js/modules/academic-calendar-parity.js','./js/modules/rubric-tools-v2-engine.js','xlsx.full.min.js','exceljs.min.js','pdf.min.js','mammoth.browser.min.js','leaflet.js'
]) assert(!liste.includes(eski), `${eski} ilk kurulum precache listesinde olmamalı.`);

assert(!sw.includes('modernShell('), 'Service Worker HTML/CSS/JS enjekte etmemeli.');
assert(!sw.includes("html.replace('</head>'"), 'Service Worker tasarım dosyası enjekte etmemeli.');
assert(sw.includes('function kodKaynakMi'), 'JS/CSS için ayrı güncel-kod stratejisi bulunmalı.');
assert(sw.includes("fetch(event.request,{cache:'no-store'})"), 'JS/CSS çevrimiçiyken cache yerine güncel ağ sürümünden alınmalı.');
assert(sw.includes('kodNetworkFirst(event)'), 'JS/CSS fetch akışı network-first olmalı.');
assert(/cache\.put\(event\.request\s*,\s*copy\)/.test(sw), 'Başarılı GET kaynakları runtime-cache edilmeli.');
assert(sw.includes('caches.match(event.request)'), 'Çevrimdışı cache fallback kullanılmalı.');
console.log('Service Worker tek-shell/güncel-kod/offline-dashboard smoke testleri başarılı.');
