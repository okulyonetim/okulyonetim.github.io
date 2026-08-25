const fs=require('fs');
const assert=require('assert');

const people=fs.readFileSync('js/modules/people-data.js','utf8');
const academic=fs.readFileSync('js/modules/academic-data.js','utf8');
const management=fs.readFileSync('js/modules/management-data.js','utf8');
const communication=fs.readFileSync('js/modules/communication-data.js','utf8');
const transport=fs.readFileSync('js/modules/transport-data.js','utf8');
const documents=fs.readFileSync('js/modules/documents-data.js','utf8');
const settings=fs.readFileSync('js/modules/settings-data.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');

for(const source of [people,academic,management,communication,transport,documents,settings,loader]) new Function(source);

for(const name of ['SiniflarRepository','SiniflarService','YoklamaRepository','YoklamaService']) assert(people.includes(name),`people-data.js ${name} API'sini korumalı.`);
for(const name of ['SinavlarRepository','SinavlarService','YillikPlanRepository','YillikPlanService','DersSaatleriRepository','DersSaatleriService','AkademikTakvimRepository','AkademikTakvimService','DenemeSonuclariService','TestSonuclariService']) assert(academic.includes(name),`academic-data.js ${name} API'sini korumalı.`);
for(const name of ['PersonelRepository','PersonelService','PeriyodikRepository','PeriyodikService','OgretmenIzinRepository','OgretmenIzinService']) assert(management.includes(name),`management-data.js ${name} API'sini korumalı.`);
for(const name of ['TakvimService','NotlarRepository','NotlarService','DuyurularRepository','DuyurularService','AnketRepository','AnketService','PushRepository','PushService','HaberlerRepository','HaberlerService']) assert(communication.includes(name),`communication-data.js ${name} API'sini korumalı.`);
for(const name of ['TasimaRepository','TasimaService','ServisOturmaRepository','ServisOturmaService','SinifOturmaRepository','SinifOturmaService']) assert(transport.includes(name),`transport-data.js ${name} API'sini korumalı.`);
for(const name of ['DokumanlarRepository','DokumanlarService']) assert(documents.includes(name),`documents-data.js ${name} API'sini korumalı.`);
for(const name of ['KullaniciYonetimiRepository','KullaniciYonetimiService','DepolamaSinirService']) assert(settings.includes(name),`settings-data.js ${name} API'sini korumalı.`);

for(const bundle of ['people-data.js','academic-data.js','management-data.js','communication-data.js','transport-data.js','documents-data.js','settings-data.js']){
  assert(loader.includes(`js/modules/${bundle}`),`${bundle} AppLoader registry'sinde olmalı.`);
}
assert(loader.includes("define('management',['js/core/repositories/takvim.repository.js'"),'Öğretmen izin servisi için TakvimRepository önce yüklenmeli.');
assert(loader.includes("define('transport',['js/modules/people-data.js'"),'Taşıma servisi için people-data önce yüklenmeli.');

for(const eski of [
  'js/core/repositories/siniflar.repository.js','js/core/services/siniflar.service.js',
  'js/core/repositories/yoklama.repository.js','js/core/services/yoklama.service.js',
  'js/core/repositories/sinavlar.repository.js','js/core/services/sinavlar.service.js',
  'js/core/repositories/yillik-plan.repository.js','js/core/services/yillik-plan.service.js',
  'js/core/repositories/ders-saatleri.repository.js','js/core/services/ders-saatleri.service.js',
  'js/core/repositories/akademik-takvim.repository.js','js/core/services/akademik-takvim.service.js',
  'js/core/repositories/sinav-sonuclari.repository.js','js/core/services/sinav-sonuclari.service.js',
  'js/core/repositories/personel.repository.js','js/core/services/personel.service.js',
  'js/core/repositories/periyodik.repository.js','js/core/services/periyodik.service.js',
  'js/core/repositories/ogretmen-izin.repository.js','js/core/services/ogretmen-izin.service.js',
  'js/core/services/takvim.service.js',
  'js/core/repositories/notlar.repository.js','js/core/services/notlar.service.js',
  'js/core/repositories/duyurular.repository.js','js/core/services/duyurular.service.js',
  'js/core/repositories/anket.repository.js','js/core/services/anket.service.js',
  'js/core/repositories/push.repository.js','js/core/services/push.service.js',
  'js/core/repositories/haberler.repository.js','js/core/services/haberler.service.js',
  'js/core/repositories/tasima.repository.js','js/core/services/tasima.service.js',
  'js/core/repositories/servis-oturma.repository.js','js/core/services/servis-oturma.service.js',
  'js/core/repositories/sinif-oturma.repository.js','js/core/services/sinif-oturma.service.js',
  'js/core/repositories/dokumanlar.repository.js','js/core/services/dokumanlar.service.js',
  'js/core/repositories/kullanici-yonetimi.repository.js','js/core/services/kullanici-yonetimi.service.js',
  'js/core/services/depolama-sinir.service.js'
]) assert(!loader.includes(`'${eski}'`),`${eski} v2 lazy-loader listesine geri dönmemeli.`);

for(const korunan of [
  'js/core/repositories/takvim.repository.js',
  'js/core/repositories/mesajlasma.repository.js','js/core/services/mesajlasma.service.js',
  'js/core/repositories/nobet.repository.js','js/core/services/nobet.service.js'
]) assert(loader.includes(`'${korunan}'`),`${korunan} geçiş süresince ayrı yüklenmeli.`);

console.log('Tüm v2 module bundle smoke testleri başarılı.');
