const fs=require('fs');
const assert=require('assert');

const bridge=fs.readFileSync('js/modules/rubric-tools.js','utf8');
const engine=fs.readFileSync('js/modules/rubric-tools-engine.js','utf8');
const v2=engine+'\n'+bridge;
const roots=['js/kriter-dagitim.js','js/proje-degerlendirme.js','js/modules/rubric-tools-v2-engine.js'];

assert(!bridge.includes('js/kriter-dagitim.js')&&!bridge.includes('js/proje-degerlendirme.js'),
  'Production Tools bridge legacy rubric rootlarını artık yüklememeli.');
assert(!bridge.includes('rubric-settings-parity.js'),
  'Rubric ayar parity için ayrı adapter dosyası yeniden oluşturulmamalı.');
assert(bridge.includes("const ENGINE='js/modules/rubric-tools-engine.js'"),
  'Rubric bridge kalıcı lazy engine yolunu kullanmalı.');

const parity={
  customDelete:engine.includes('rtdeletecustom')&&engine.includes('Sil, varsayılana dön')&&engine.includes('delete full.dersOzel[target]'),
  directCategoryCreate:engine.includes("prompt('Yeni kategori adı')")&&engine.includes('full.dersOzel[n]=clone(full.varsayilan)')&&engine.includes("personalSet('rubric',full)"),
  destructiveOverwriteConfirm:engine.includes('Okul varsayılanı mevcut cihaz ayarının üzerine yüklensin mi?')&&engine.includes('global.confirm'),
  noObserverPatch:!bridge.includes('MutationObserver')&&!bridge.includes('installSettingsParity')
};
assert(Object.values(parity).every(Boolean),'Rubric V2 ayar davranışı engine içinde tek sahipli değil.');
assert.deepStrictEqual(roots.filter(p=>fs.existsSync(p)),[],
  'Legacy/geçiş rubric motorları emekliye ayrılmış kalmalı.');

console.log('Rubric legacy emeklilik kapısı:',JSON.stringify({ready:true,parity}));
