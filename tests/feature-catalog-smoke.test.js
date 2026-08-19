const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const src = fs.readFileSync('js/ozellik-katalogu.js','utf8');
const app = fs.readFileSync('js/app.js','utf8');
const nav = fs.readFileSync('js/alt-navigasyon.js','utf8');
const editor = fs.readFileSync('js/nav-duzeni-editor.js','utf8');
const index = fs.readFileSync('index.html','utf8');
const sw = fs.readFileSync('service-worker.js','utf8');

const opened = [];
const domNodes = [
  { getAttribute:k => k==='data-tab' ? 'panel' : null, textContent:'Ana Sayfa', querySelector:()=>null },
  { getAttribute:k => k==='data-tab' ? 'ogrenciler' : null, textContent:'Öğrenciler', querySelector:()=>null }
];
const windowObj = { sekmeAc:x => opened.push(x) };
const ctx = { window: windowObj, document: { querySelectorAll:sel => sel==='[data-tab]' ? domNodes : [] }, Map, Set, String, Object, Array, console };
vm.createContext(ctx);vm.runInContext(src, ctx);
let special = 0;
windowObj.OzellikKatalogu.kaydet({ id:'yeniOzellik', ad:'Yeni Özellik', ac:()=>{ special++; } });
const list = windowObj.OzellikKatalogu.liste();
assert(list.some(x => x.deger==='panel'), 'data-tab sekmeleri otomatik keşfedilmeli.');
assert(list.some(x => x.deger==='@ozellik:yeniOzellik'), 'Kayıt edilen özel özellik Yeni Öğe listesine düşmeli.');
assert(windowObj.OzellikKatalogu.ac('panel'), 'Standart sekme açılabilmeli.');
assert.deepStrictEqual(opened, ['panel']);
assert(windowObj.OzellikKatalogu.ac('@ozellik:yeniOzellik'), 'Fonksiyon/overlay özellik açılabilmeli.');
assert.strictEqual(special, 1);
assert(app.includes('window.OzellikKatalogu.liste().map'), 'Ana sekme seçici merkezi katalogdan beslenmeli.');
assert(nav.includes('function _ozellikKatalogunuSenkronla()'), 'AltNav built-in özelliklerini otomatik kataloglamalı.');
assert(nav.includes("id:o.anahtar"), 'Yeni GRUPLAR_KATALOG öğeleri anahtarlarıyla otomatik kaydolmalı.');
assert(nav.includes('window.OzellikKatalogu.ac(eo.sekmeAd)'), 'Kaydedilen ek öğeler merkezi yürütücüyle açılmalı.');
assert(editor.includes('window.OzellikKatalogu.liste().forEach'), 'Navigasyon editörü fallback seçicisi merkezi kataloğu kullanmalı.');
const featureTag = '<script src="js/ozellik-katalogu.js"></script>';
const appTag = '<script src="js/app.js"></script>';
const featurePos = index.indexOf(featureTag), appPos = index.indexOf(appTag);
assert(featurePos >= 0 && appPos >= 0 && featurePos < appPos, 'Katalog app.js öncesinde yüklenmeli.');
assert(sw.includes("'./js/ozellik-katalogu.js'"), 'Katalog offline precache listesinde olmalı.');
assert(sw.includes("oy-cache-v444"), 'Cache sürümü v444 olmalı.');
console.log('Merkezi özellik kataloğu smoke testleri başarılı.');
