const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('js/modules/assistant.js','utf8');
const index=fs.readFileSync('index.html','utf8');
new Function(src);

assert(index.includes('js/modules/assistant.js'),'V2 AI Asistan üretim shell içinde yüklenmeli.');
assert(src.includes("const API='https://okul-ai-asistan.sedonet23.workers.dev'"),'Mevcut AI Worker uç noktası korunmalı.');
for(const type of ['ogretmenler','siniflar','veliler','gorevler','hatirlaticilar','notlar','sinavlar','servisler','nobetAtamalari','personel']) assert(src.includes(`arr('${type}')`),`AI bağlamı ${type} verisini AppStore üzerinden kullanmalı.`);
assert(src.includes('global.NotlarService.notKaydet'),'Not/metin taslakları mevcut NotlarService üzerinden kaydedilmeli.');
assert(src.includes('global.TakvimService.gorevKaydet'),'Görev taslağı mevcut TakvimService üzerinden kaydedilmeli.');
assert(src.includes('global.TakvimService.hatirlaticiKaydet'),'Hatırlatıcı taslağı mevcut TakvimService üzerinden kaydedilmeli.');
assert(src.includes("e.detail?.name==='communication'"),'AI Asistan Communication V2 yaşam döngüsüne bağlanmalı.');
assert(!src.includes('db.collection'),'AI Asistan doğrudan Firestore kullanmamalı.');
assert(!src.includes('localStorage'),'AI Asistan ayrı legacy storage üretmemeli.');
assert(!src.includes('telefon:'),'AI Worker bağlamına telefon alanı gönderilmemeli.');
assert(!src.includes('style="'),'AI Asistan inline CSS üretmemeli; design-system.css kullanılmalı.');

console.log('V2 AI Asistan sözleşmesi başarılı.');
