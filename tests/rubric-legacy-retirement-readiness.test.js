const fs=require('fs');
const assert=require('assert');

const bridge=fs.readFileSync('js/modules/rubric-tools.js','utf8');
const engine=fs.readFileSync('js/modules/rubric-tools-v2-engine.js','utf8');
const roots=['js/kriter-dagitim.js','js/proje-degerlendirme.js'];

assert(!bridge.includes('js/kriter-dagitim.js')&&!bridge.includes('js/proje-degerlendirme.js'),
  'Production Tools bridge legacy rubric rootlarını artık yüklememeli.');

const parity={
  customDelete:engine.includes('rtdeletecustom')||engine.includes('Sil, varsayılana dön'),
  inDesignSystemCategoryCreate:engine.includes('id="rtnewname"')||engine.includes("id='rtnewname'"),
  destructiveOverwriteConfirm:engine.includes('global.confirm(')||engine.includes('confirm(')
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
