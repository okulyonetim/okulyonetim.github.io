const fs=require('fs');
const assert=require('assert');

const allowed={
  'app-loader.js':'bootstrap-loader',
  'auth.js':'authentication-bootstrap',
  'dokuman-okuyucu.js':'documents-v2-compatibility-proxy-pending-path-cutover',
  'firebase-init.js':'firebase-bootstrap',
  'harita.js':'tools-map-lazy-capability'
};

const expected=Object.keys(allowed).sort();
const actual=fs.readdirSync('js',{withFileTypes:true})
  .filter(x=>x.isFile()&&x.name.endsWith('.js'))
  .map(x=>x.name)
  .sort();

assert.deepStrictEqual(actual,expected,
  'js/ kökünde yeni/eksik dosya var. Yeni işlevler mümkünse js/modules veya js/core altında yaşamalı; kök envanter değişikliği bilinçli yapılmalı.');

for(const [file,reason] of Object.entries(allowed)){
  assert(reason&&reason.length>8,`${file} için kökte kalma gerekçesi açıkça tanımlanmalı.`);
}
assert(allowed['dokuman-okuyucu.js'].includes('compatibility-proxy'),
  'Belge görüntüleyicinin ağır motoru rootta kalmamalı; yalnız geçici compatibility proxy kabul edilir.');
assert(fs.existsSync('js/modules/document-viewer.js'),'Belge görüntüleyici gerçek motoru js/modules/document-viewer.js altında bulunmalı.');
const proxy=fs.readFileSync('js/dokuman-okuyucu.js','utf8');
assert(proxy.includes("const SRC='js/modules/document-viewer.js'"),'Root belge görüntüleyici proxy si module engine yoluna yönlenmeli.');
assert(!proxy.includes('pdfjsLib.getDocument')&&!proxy.includes('new ExcelJS.Workbook()'),'Ağır belge motoru root compatibility dosyasına geri dönmemeli.');

console.log(`Kök JS envanteri başarılı (${actual.length} dosya): ${actual.map(f=>`${f}=${allowed[f]}`).join(', ')}`);
