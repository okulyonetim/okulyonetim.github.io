const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('js/modules/assistant.js','utf8');
const index=fs.readFileSync('index.html','utf8');
new Function(src);

const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
assert(!index.includes('<script src="js/modules/assistant.js" defer></script>'),'V2 AI Asistan ilk açılışta eager yüklenmemeli.');
assert(sw.includes("'./js/modules/assistant.js'"),'V2 AI Asistan offline Service Worker cache içinde bulunmalı.');
const communicationBundle=loader.match(/define\('communication',\[([^\]]+)\]\)/)?.[1]||'';
assert(communicationBundle.includes("'js/modules/communication.js'")&&communicationBundle.includes("'js/modules/assistant.js'")&&communicationBundle.indexOf("'js/modules/communication.js'")<communicationBundle.indexOf("'js/modules/assistant.js'"),'V2 AI Asistan ek lazy bağımlılıklar olsa da Communication bundle içinde communication.js sonrasında yüklenmeli.');
assert(src.includes("const API='https://okul-ai-asistan.sedonet23.workers.dev'"),'Mevcut AI Worker uç noktası korunmalı.');
for(const type of ['ogretmenler','siniflar','veliler','gorevler','hatirlaticilar','notlar','sinavlar','servisler','nobetAtamalari','personel']) assert(src.includes(`arr('${type}')`),`AI bağlamı ${type} verisini AppStore üzerinden kullanmalı.`);
assert(src.includes("const classLabel=s=>s?.ad||[s?.seviye,s?.sube].filter(Boolean).join('-')||'?'"),'AI sınıf etiketi canonical sinif.ad alanını öncelikli kullanmalı.');
assert(src.includes('const className=id=>classLabel(classes.find(x=>x.id===id))'),'Öğrenci AI bağlamı sınıf kimliğini canonical sınıf etiketi üzerinden çözmeli.');
assert(src.includes('siniflar:classes.map(s=>({sinif:classLabel(s)'),'AI sınıf listesi canonical sınıf etiketini kullanmalı.');
assert(!src.includes("sinif:`${s.seviye||''}-${s.sube||''}`"),'AI sınıf listesi seviye/sube birleşimini ana kimlik olarak kullanmamalı.');
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

console.log('V2 AI Asistan + canonical sınıf kimliği + taslak edit permission sözleşmesi başarılı.');
