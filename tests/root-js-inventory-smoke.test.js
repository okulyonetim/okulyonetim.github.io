const fs=require('fs');
const assert=require('assert');

const allowed=[
  'app-loader.js',
  'auth.js',
  'dokuman-okuyucu.js',
  'firebase-init.js',
  'harita.js',
  'kriter-dagitim.js',
  'proje-degerlendirme.js'
].sort();

const actual=fs.readdirSync('js',{withFileTypes:true})
  .filter(x=>x.isFile()&&x.name.endsWith('.js'))
  .map(x=>x.name)
  .sort();

assert.deepStrictEqual(actual,allowed,
  'js/ kökünde yeni/eksik dosya var. Yeni işlevler mümkünse js/modules veya js/core altında yaşamalı; kök envanter değişikliği bilinçli yapılmalı.');

console.log(`Kök JS envanteri başarılı (${actual.length} dosya).`);
