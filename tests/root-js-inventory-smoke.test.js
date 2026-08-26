const fs=require('fs');
const assert=require('assert');

const allowed={
  'app-loader.js':'bootstrap-loader',
  'auth.js':'authentication-bootstrap',
  'dokuman-okuyucu.js':'documents-v2-lazy-capability-pending-module-move',
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
assert(allowed['dokuman-okuyucu.js'].includes('pending-module-move'),
  'Belge görüntüleyici root dosyası kalıcı kabul edilmemeli; Documents V2 modülüne taşıma borcu görünür kalmalı.');

console.log(`Kök JS envanteri başarılı (${actual.length} dosya): ${actual.map(f=>`${f}=${allowed[f]}`).join(', ')}`);
