const fs=require('fs');
const assert=require('assert');
const bridge=fs.readFileSync('js/modules/rubric-tools.js','utf8');
const engine=fs.readFileSync('js/modules/rubric-tools-v2-engine.js','utf8');
const index=fs.readFileSync('index.html','utf8');

assert(index.includes('js/modules/rubric-tools.js'),'Rubric Tools V2 bridge production shell tarafından yüklenmeli.');
for(const token of ["const ENGINE='js/modules/rubric-tools-v2-engine.js'","key:'rubric'","api:'KriterDagitimAraci'","key:'project'","api:'ProjeDegerlendirmeAraci'","global.AppLoader.loadScript(ENGINE)","b.dataset.rubricTool=def.key"]){
  assert(bridge.includes(token),`Rubric Tools V2 bridge sözleşmesi eksik: ${token}`);
}
for(const token of ["global.KorukRubricToolsV2={openRubric,openProject,scoreSplit,migrateRubric}","global.KriterDagitimAraci={ac()","global.ProjeDegerlendirmeAraci={ac()","RubricSettingsService","svc.personalSet(kind,full)","svc.schoolSet('rubric'","svc.schoolSet('project'","XLSX.read","uygulamaHtmlYazdir","backdrop.className='ka-modal-backdrop'","class=\"ka-card\""]){
  assert(engine.includes(token),`Rubric Tools V2 engine sözleşmesi eksik: ${token}`);
}
assert(!engine.includes('db.collection(')&&!engine.includes('firebase.firestore'),'V2 engine doğrudan Firestore kullanmamalı.');
assert(!engine.includes('localStorage.setItem('),'V2 engine localStorage kalıcı yazımı yapmamalı.');
assert(!bridge.includes("js/kriter-dagitim.js")&&!bridge.includes("js/proje-degerlendirme.js"),'Production bridge legacy root motorlarını yüklememeli.');
assert(!index.includes('js/kriter-dagitim.js')&&!index.includes('js/proje-degerlendirme.js'),'Legacy rubric motorları başlangıç shellinde eager yüklenmemeli.');
console.log('Kriter/Proje Tools V2 engine + local-first bridge sözleşmesi başarılı.');
