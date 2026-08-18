const fs = require('fs');
const assert = require('assert');
const sw = fs.readFileSync('service-worker.js', 'utf8');

assert(sw.includes("const CACHE_ADI = 'oy-cache-v439'"), 'Service Worker cache sürümü güncellenmeli.');
assert(sw.includes("'./index.html'"), 'Ana uygulama kabuğu precache içinde kalmalı.');
assert(sw.includes("'./css/styles.css'"), 'Temel stil precache içinde kalmalı.');
assert(sw.includes("'./js/app.js'"), 'Ana uygulama betiği precache içinde kalmalı.');

for (const agir of [
  './optik/index.html',
  './optik/js/app.js',
  'xlsx.full.min.js',
  'exceljs.min.js',
  'pdf.min.js',
  'mammoth.browser.min.js',
  'leaflet.js'
]) {
  const liste = sw.slice(sw.indexOf('const ONBELLEGE_ALINACAKLAR'), sw.indexOf("self.addEventListener('install'"));
  assert(!liste.includes(agir), `${agir} ilk kurulum precache listesinden çıkarılmalı.`);
}

assert(sw.includes("url.includes('/optik/')"), 'Optik kaynaklar ihtiyaç anında runtime-cache edilmeli.');
assert(sw.includes("url.includes('cdnjs.cloudflare.com')"), 'CDN kaynakları ihtiyaç anında runtime-cache edilmeli.');
console.log('Service Worker precache performans smoke testleri başarılı.');
