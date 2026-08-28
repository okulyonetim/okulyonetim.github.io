const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('js/modules/assistant.js','utf8');
const index=fs.readFileSync('index.html','utf8');
new Function(src);

const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
assert(!index.includes('<script src="js/modules/assistant.js" defer></script>'),'V2 AI Asistan ilk açılışta eager yüklenmemeli.');
assert(sw.includes("'./js/modules/assistant.js'"),'V2 AI Asistan offline Service Worker cache içinde bulunmalı.');
assert(loader.includes("define('communication',['js/modules/communication.js','js/modules/assistant.js'])"),'V2 AI Asistan Communication lazy bundle ile yüklenmeli.');
assert(src.includes("const API='https://okul-ai-asistan.sedonet23.workers.dev'"),'Mevcut AI Worker uç noktası korunmalı.');
for(const type of ['ogretmenler','siniflar','veliler','gorevler','hatirlaticilar','notlar','sinavlar','servisler','nobetAtamalari','personel']) assert(src.includes(`arr('${type}')`),`AI bağlamı ${type} verisini AppStore üzerinden kullanmalı.`);
assert(src.includes('global.NotlarService.notKaydet'),'Not/metin taslakları mevcut NotlarService üzerinden kaydedilmeli.');
assert(src.includes('global.TakvimService.gorevKaydet'),'Görev taslağı mevcut TakvimService üzerinden kaydedilmeli.');
assert(src.includes('global.TakvimService.hatirlaticiKaydet'),'Hatırlatıcı taslağı mevcut TakvimService üzerinden kaydedilmeli.');
assert(src.includes("const toolPermission=name=>(name==='taslak_not'||name==='taslak_metin')?'notlar':'takvim'"),'AI taslakları gerçek Notlar/Takvim yetki alanlarına eşlenmeli.');
assert(src.includes('const canSaveTool=name=>global.duzenleyebilir?.(toolPermission(name))!==false'),'Taslak kaydı servisle aynı edit yetki modelini kullanmalı.');
assert(src.includes('data-ka-permission="${permission}"')&&src.includes('data-ka-write="${permission}"'),'Taslak Kaydet düğmesi PermissionService görünürlük/yazma sözleşmesine bağlanmalı.');
const saveIndex=src.indexOf('async function saveDraft()');
assert(saveIndex>=0&&src.slice(saveIndex,saveIndex+260).includes('if(!canSaveTool(name))'),'saveDraft DOM üzerinden doğrudan çağrılsa bile edit yetkisini yeniden doğrulamalı.');
assert(src.includes("e.detail?.name==='communication'"),'AI Asistan Communication V2 yaşam döngüsüne bağlanmalı.');
assert(!src.includes('db.collection'),'AI Asistan doğrudan Firestore kullanmamalı.');
assert(!src.includes('localStorage'),'AI Asistan ayrı legacy storage üretmemeli.');
assert(!src.includes('telefon:'),'AI Worker bağlamına telefon alanı gönderilmemeli.');
assert(!src.includes('style="'),'AI Asistan inline CSS üretmemeli; design-system.css kullanılmalı.');

console.log('V2 AI Asistan + taslak edit permission sözleşmesi başarılı.');
