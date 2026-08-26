const fs=require('fs');
const assert=require('assert');
const vm=require('vm');
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

const window={};
assert.doesNotThrow(()=>vm.runInNewContext(engine,{window,console,Date,Math,JSON,Object,Array,String,Number,parseInt,parseFloat,isNaN,Set,Map,Promise,Error,CustomEvent:function(){}}), 'V2 engine JavaScript olarak parse edilip yüklenebilmeli.');
assert.strictEqual(typeof window.KorukRubricToolsV2?.scoreSplit,'function','V2 scoreSplit dış test sözleşmesinde bulunmalı.');
for(const target of [0,25,50,82,100]){
  const values=window.KorukRubricToolsV2.scoreSplit(target,20,1,5);
  assert.strictEqual(values.length,20,'Dağıtım kriter sayısını korumalı.');
  assert(values.every(v=>v>=1&&v<=5),'Dağıtılan puanlar min/max aralığında kalmalı.');
  const expected=Math.max(20,Math.min(100,Math.round((target/100)*100)));
  assert.strictEqual(values.reduce((a,b)=>a+b,0),expected,'Dağıtılan toplam legacy algoritmanın hedef toplamını korumalı.');
}
const migrated=window.KorukRubricToolsV2.migrateRubric({puanMin:1,puanMax:5,puanEtiketleri:[],gruplar:[{ad:'X',kriterler:['Y']}]});
assert(migrated?.varsayilan?.gruplar?.length===1,'Eski düz rubric ayarı varsayılan yapıya migrate edilmeli.');
assert(migrated?.dersOzel?.Proje&&migrated?.dersOzel?.Konuşma,'Yerleşik Proje/Konuşma şablonları migration sırasında tamamlanmalı.');
console.log('Kriter/Proje Tools V2 engine + local-first bridge sözleşmesi başarılı.');
