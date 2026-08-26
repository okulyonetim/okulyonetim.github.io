const fs=require('fs');
const assert=require('assert');

const bridge=fs.readFileSync('js/modules/rubric-tools.js','utf8');
const engine=fs.readFileSync('js/modules/rubric-tools-v2-engine.js','utf8');
const parityAdapter=fs.readFileSync('js/modules/rubric-settings-parity.js','utf8');
const v2=engine+'\n'+parityAdapter;
const roots=['js/kriter-dagitim.js','js/proje-degerlendirme.js'];

assert(!bridge.includes('js/kriter-dagitim.js')&&!bridge.includes('js/proje-degerlendirme.js'),
  'Production Tools bridge legacy rubric rootlarını artık yüklememeli.');
assert(bridge.includes("const PARITY='js/modules/rubric-settings-parity.js'")&&bridge.includes('global.AppLoader.loadScript(PARITY)'),
  'Rubric parity adapter production lazy-load zincirinde bulunmalı.');

const parity={
  customDelete:v2.includes('rtdeletecustom')&&v2.includes('Sil, varsayılana dön')&&v2.includes('delete full.dersOzel[target]'),
  inDesignSystemCategoryCreate:v2.includes('rtnewname')&&v2.includes('ka-field')&&v2.includes("personalSet('rubric',full)"),
  destructiveOverwriteConfirm:v2.includes("e.target?.id!=='rtcloud'")&&v2.includes('global.confirm')
};
const ready=Object.values(parity).every(Boolean);
const existing=roots.filter(p=>fs.existsSync(p));

if(ready){
  assert.deepStrictEqual(existing,[],
    'Rubric V2 parity tamamlandığında legacy kriter/proje rootları emekliye ayrılmalı.');
}else{
  assert.deepStrictEqual(existing,roots,
    'Rubric V2 davranış parity tamamlanmadan legacy rootlar silinmemeli.');
}

console.log('Rubric legacy emeklilik kapısı:',JSON.stringify({ready,parity,existing}));
