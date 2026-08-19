const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html','utf8');
const loader = fs.readFileSync('js/map-libs.js','utf8');
const akademik = fs.readFileSync('js/akademik-takvim.js','utf8');
const harita = fs.readFileSync('js/harita.js','utf8');
const kullanici = fs.readFileSync('js/kullanici-yonetimi.js','utf8');

assert(!index.includes('leaflet@1.9.4/dist/leaflet.css'), 'Leaflet CSS ilk açılıştan çıkarılmalı.');
assert(!index.includes('leaflet@1.9.4/dist/leaflet.js'), 'Leaflet JS ilk açılıştan çıkarılmalı.');
assert(loader.includes("window.MapLibs={hazir}"), 'Ortak Leaflet loader window.MapLibs.hazir sunmalı.');
assert(loader.includes('Promise.all([cssYukle(),jsYukle()])'), 'Leaflet CSS ve JS birlikte kullanım anında yüklenmeli.');
assert(loader.includes('hazirPromise=null; throw e;'), 'Leaflet yüklemesi hata verirse yeniden deneme mümkün olmalı.');
assert(akademik.includes("s.src = 'js/map-libs.js'"), 'Leaflet ortak loader uygulamada yüklenmeli.');

assert(harita.includes('async function haritaBaslat()'), 'Ana harita başlangıcı async olmalı.');
assert(harita.includes('await window.MapLibs.hazir();'), 'Ana harita Leaflet hazır olmadan L.map çağırmamalı.');
assert(harita.indexOf('await window.MapLibs.hazir();') < harita.indexOf("L.map('haritaKonteyner'"), 'Ana haritada Leaflet beklemesi L.map öncesinde olmalı.');

assert(kullanici.includes('.then(async snap =>'), 'Yönetici konum verisi harita yüklenmesini bekleyebilmeli.');
assert(kullanici.includes('await _konumHaritaOlustur();'), 'Konum filtresi uygulanmadan önce harita kurulmalı.');
assert(kullanici.includes('async function _konumHaritaOlustur()'), 'Yönetici konum haritası async olmalı.');
assert(kullanici.includes('await window.MapLibs.hazir();'), 'Yönetici konum haritası Leaflet hazır olmasını beklemeli.');

console.log('Leaflet lazy-load smoke testleri başarılı.');
