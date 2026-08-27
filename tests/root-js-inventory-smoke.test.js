const fs=require('fs');
const path=require('path');
const assert=require('assert');

const allowed={
  'app-loader.js':'bootstrap-loader',
  'auth.js':'authentication-bootstrap',
  'firebase-init.js':'firebase-bootstrap'
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
assert(fs.existsSync('js/modules/document-viewer.js'),'Belge görüntüleyici gerçek motoru js/modules/document-viewer.js altında bulunmalı.');
assert(!fs.existsSync('js/dokuman-okuyucu.js'),'Emekli root belge görüntüleyici geri dönmemeli.');
assert(fs.existsSync('js/modules/map-ui.js'),'Harita UI motoru js/modules/map-ui.js altında bulunmalı.');
assert(!fs.existsSync('js/harita.js'),'Emekli root harita motoru geri dönmemeli.');

const opticalName=/optik|optical|\bomr\b|form[-_ ]?okuyucu|kamera[-_ ]?okuma/i;
const opticalHits=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(['.git','node_modules','dist','www'].includes(ent.name))continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory())walk(p);
    else if(opticalName.test(p.replace(/\\/g,'/')))opticalHits.push(p.replace(/\\/g,'/'));
  }
}
for(const dir of ['js','css','android/app/src/main'])if(fs.existsSync(dir))walk(dir);
assert.deepStrictEqual(opticalHits,[],`Optik okuyucu/OMR dosyaları geri dönmemeli: ${opticalHits.join(', ')}`);

for(const file of ['index.html','js/app-loader.js','js/core/shell-ui.js','service-worker.js']){
  if(!fs.existsSync(file))continue;
  const text=fs.readFileSync(file,'utf8');
  assert(!/optik okuyucu|\bomr\b|optical reader|kamera okuma|form okuyucu/i.test(text),`${file} optik okuyucu/OMR çalışma zamanı referansı içermemeli.`);
}

console.log(`Kök JS envanteri + optik okuyucu retirement başarılı (${actual.length} dosya): ${actual.map(f=>`${f}=${allowed[f]}`).join(', ')}`);
