const fs=require('fs');
const assert=require('assert');
const bridge=fs.readFileSync('js/modules/rubric-tools.js','utf8');
const index=fs.readFileSync('index.html','utf8');

assert(index.includes('js/modules/rubric-tools.js'),'Rubric Tools V2 bridge production shell tarafından yüklenmeli.');
for(const token of ["key:'rubric'","script:'js/kriter-dagitim.js'","api:'KriterDagitimAraci'","key:'project'","script:'js/proje-degerlendirme.js'","api:'ProjeDegerlendirmeAraci'","global.AppLoader.loadScript(def.script)","b.dataset.rubricTool=def.key"]){
  assert(bridge.includes(token),`Rubric Tools V2 sözleşmesi eksik: ${token}`);
}
assert(!index.includes('js/kriter-dagitim.js')&&!index.includes('js/proje-degerlendirme.js'),'Legacy rubric motorları başlangıç shellinde eager yüklenmemeli.');
console.log('Kriter/Proje Tools V2 lazy bridge sözleşmesi başarılı.');
