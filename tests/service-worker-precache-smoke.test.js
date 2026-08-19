const fs = require('fs');
const assert = require('assert');
const sw = fs.readFileSync('service-worker.js', 'utf8');

assert(sw.includes("const CACHE_ADI = 'oy-cache-v442'"), 'Service Worker cache sürümü v442 olmalı.');
assert(sw.includes("'./index.html'"), 'Ana uygulama kabuğu precache içinde kalmalı.');
assert(sw.includes("'./css/styles.css'"), 'Temel stil precache içinde kalmalı.');
assert(sw.includes("'./js/app.js'"), 'Ana uygulama betiği precache içinde kalmalı.');
assert(sw.includes("'./js/ui-stability-fixes.js'"), 'UI kararlılık yükleyicisi precache içinde kalmalı.');
assert(sw.includes("'./js/dashboard-mobile-v4.js'"), 'Ana sayfa v4 çevrimdışı kullanım için precache edilmeli.');
assert(sw.includes("'./js/dashboard-mobile-v4-polish.js'"), 'Mobil dashboard ince ayar katmanı precache edilmeli.');
const liste = sw.slice(sw.indexOf('const ONBELLEGE_ALINACAKLAR'), sw.indexOf("self.addEventListener('install'"));
for (const agir of ['./optik/index.html','./optik/js/app.js','xlsx.full.min.js','exceljs.min.js','pdf.min.js','mammoth.browser.min.js','leaflet.js']) assert(!liste.includes(agir), `${agir} ilk kurulum precache listesinden çıkarılmalı.`);
assert(sw.includes("fetch(event.request)"), 'İhtiyaç anında ağdan kaynak yükleme devam etmeli.');
assert(sw.includes("caches.open(CACHE_ADI).then(cache => cache.put(event.request, copy))"), 'Başarıyla yüklenen GET kaynakları runtime-cache edilmeli.');
assert(sw.includes("caches.match(event.request)"), 'Çevrimdışı durumda runtime cache fallback kullanılmalı.');
console.log('Service Worker precache performans smoke testleri başarılı.');
