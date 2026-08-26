const fs=require('fs');
const assert=require('assert');

const bridge=fs.readFileSync('js/modules/rubric-tools.js','utf8');
const engine=fs.readFileSync('js/modules/rubric-tools-v2-engine.js','utf8');
const v2=engine+'\n'+bridge;
const roots=['js/kriter-dagitim.js','js/proje-degerlendirme.js'];

assert(!bridge.includes('js/kriter-dagitim.js')&&!bridge.includes('js/proje-degerlendirme.js'),
  'Production Tools bridge legacy rubric rootlarını artık yüklememeli.');
assert(!bridge.includes('rubric-settings-parity.js'),
  'Rubric ayar parity için ayrı adapter dosyası yeniden oluşturulmamalı.');

const parity={
  customDelete:v2.includes('rtdeletecustom')&&v2.includes('Sil, varsayılana dön')&&v2.includes('delete full.dersOzel[target]'),
  inDesignSystemCategoryCreate:v2.includes('rtnewname')&&v2.includes('ka-field')&&v2.includes("personalSet('rubric',full)"),
  destructiveOverwriteConfirm:v2.includes("e.target?.id!=='rtcloud'")&&v2.includes('global.confirm')
};
assert(Object.values(parity).every(Boolean),'Rubric V2 ayar davranış parity eksik.');
assert.deepStrictEqual(roots.filter(p=>fs.existsSync(p)),[],
  'Legacy kriter/proje rootları emekliye ayrılmış kalmalı.');

console.log('Rubric legacy emeklilik kapısı:',JSON.stringify({ready:true,parity}));
