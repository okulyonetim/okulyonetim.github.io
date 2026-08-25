const fs=require('fs');
const assert=require('assert');

const people=fs.readFileSync('js/modules/people-data.js','utf8');
const academic=fs.readFileSync('js/modules/academic-data.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');

// Browser scriptleri en azından sözdizimi olarak geçerli kalmalı.
new Function(people);
new Function(academic);
new Function(loader);

for(const name of ['SiniflarRepository','SiniflarService','YoklamaRepository','YoklamaService']){
  assert(people.includes(name),`people-data.js ${name} API'sini korumalı.`);
}
for(const name of ['SinavlarRepository','SinavlarService','YillikPlanRepository','YillikPlanService','DersSaatleriRepository','DersSaatleriService','AkademikTakvimRepository','AkademikTakvimService','DenemeSonuclariService','TestSonuclariService']){
  assert(academic.includes(name),`academic-data.js ${name} API'sini korumalı.`);
}

assert(loader.includes("define('people',['js/modules/people-data.js'"),'People grubu birleşik veri paketini yüklemeli.');
assert(loader.includes("define('academic',['js/modules/academic-data.js'"),'Academic grubu birleşik veri paketini yüklemeli.');

for(const eski of [
  'js/core/repositories/siniflar.repository.js',
  'js/core/services/siniflar.service.js',
  'js/core/repositories/yoklama.repository.js',
  'js/core/services/yoklama.service.js',
  'js/core/repositories/sinavlar.repository.js',
  'js/core/services/sinavlar.service.js',
  'js/core/repositories/yillik-plan.repository.js',
  'js/core/services/yillik-plan.service.js',
  'js/core/repositories/ders-saatleri.repository.js',
  'js/core/services/ders-saatleri.service.js',
  'js/core/repositories/akademik-takvim.repository.js',
  'js/core/services/akademik-takvim.service.js',
  'js/core/repositories/sinav-sonuclari.repository.js',
  'js/core/services/sinav-sonuclari.service.js'
]){
  assert(!loader.includes(`'${eski}'`),`${eski} v2 lazy-loader listesine geri dönmemeli.`);
}

console.log('People/academic module bundle smoke testleri başarılı.');
