const fs=require('fs');
const assert=require('assert');

const people=fs.readFileSync('js/modules/people-data.js','utf8');
const peopleUi=fs.readFileSync('js/modules/people.js','utf8');
const academic=fs.readFileSync('js/modules/academic-data.js','utf8');
const academicUi=fs.readFileSync('js/modules/academic.js','utf8');
const management=fs.readFileSync('js/modules/management-data.js','utf8');
const managementUi=fs.readFileSync('js/modules/management.js','utf8');
const communication=fs.readFileSync('js/modules/communication-data.js','utf8');
const transport=fs.readFileSync('js/modules/transport-data.js','utf8');
const documents=fs.readFileSync('js/modules/documents-data.js','utf8');
const settings=fs.readFileSync('js/modules/settings-data.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');

for(const source of [people,peopleUi,academic,academicUi,management,managementUi,communication,transport,documents,settings,loader]) new Function(source);

for(const name of ['SiniflarRepository','SiniflarService','YoklamaRepository','YoklamaService']) assert(people.includes(name),`people-data.js ${name} API'sini korumalı.`);
assert(peopleUi.includes('window.PeopleModule'),'people.js tek v2 People UI sahibi olmalı.');
assert(peopleUi.includes('AppStore?.data'),'people.js veriyi AppStore/cihaz katmanından okumalı.');
assert(!/\bdb\.collection\s*\(/.test(peopleUi),'people.js doğrudan Firestore kullanmamalı.');

for(const name of ['SinavlarRepository','SinavlarService','YillikPlanRepository','YillikPlanService','DersSaatleriRepository','DersSaatleriService','AkademikTakvimRepository','AkademikTakvimService','DenemeSonuclariService','TestSonuclariService']) assert(academic.includes(name),`academic-data.js ${name} API'sini korumalı.`);
assert(academicUi.includes('window.AcademicModule'),'academic.js tek v2 Academic UI sahibi olmalı.');
assert(academicUi.includes('SyncEngine.register'),'academic.js ek koleksiyonlarını SyncEngine ile kaydetmeli.');
assert(academicUi.includes('SyncEngine.localHydrate'),'academic.js önce cihaz cache’ini hydrate etmeli.');
assert(!/\bdb\.collection\s*\(/.test(academicUi),'academic.js doğrudan Firestore kullanmamalı.');

for(const name of ['PersonelRepository','PersonelService','PeriyodikRepository','PeriyodikService','OgretmenIzinRepository','OgretmenIzinService']) assert(management.includes(name),`management-data.js ${name} API'sini korumalı.`);
assert(managementUi.includes('window.ManagementModule'),'management.js tek v2 Management UI sahibi olmalı.');
assert(managementUi.includes('SyncEngine.localHydrate'),'management.js önce cihaz cache’ini hydrate etmeli.');
assert(!/\bdb\.collection\s*\(/.test(managementUi),'management.js doğrudan Firestore kullanmamalı.');

for(const name of ['TakvimService','NotlarRepository','NotlarService','DuyurularRepository','DuyurularService','AnketRepository','AnketService','PushRepository','PushService','HaberlerRepository','HaberlerService']) assert(communication.includes(name),`communication-data.js ${name} API'sini korumalı.`);
for(const name of ['TasimaRepository','TasimaService','ServisOturmaRepository','ServisOturmaService','SinifOturmaRepository','SinifOturmaService']) assert(transport.includes(name),`transport-data.js ${name} API'sini korumalı.`);
for(const name of ['DokumanlarRepository','DokumanlarService']) assert(documents.includes(name),`documents-data.js ${name} API'sini korumalı.`);
for(const name of ['KullaniciYonetimiRepository','KullaniciYonetimiService','DepolamaSinirService']) assert(settings.includes(name),`settings-data.js ${name} API'sini korumalı.`);

for(const bundle of ['people-data.js','academic-data.js','management-data.js','communication-data.js','transport-data.js','documents-data.js','settings-data.js']) assert(loader.includes(`js/modules/${bundle}`),`${bundle} AppLoader registry'sinde olmalı.`);
const peopleLine=loader.match(/define\('people',\[(.*?)\]\);/)?.[1]||'';
for(const dep of ['js/modules/people-data.js','js/modules/people.js']) assert(peopleLine.includes(`'${dep}'`),`People grubu ${dep} yüklemeli.`);
for(const legacy of ['js/siniflar.js','js/ogrenciler-arama.js','js/ogretmen-detay.js','js/yoklama.js']) assert(!peopleLine.includes(legacy),`V2 People eski UI dosyasını yüklememeli: ${legacy}`);

const academicLine=loader.match(/define\('academic',\[(.*?)\]\);/)?.[1]||'';
for(const dep of ['js/modules/academic-data.js','js/deneme-sinavlari-stability.js','js/modules/academic.js']) assert(academicLine.includes(`'${dep}'`),`Academic grubu ${dep} yüklemeli.`);
for(const legacy of ['js/sinavlar.js','js/yillik-plan.js','js/ders-saatleri.js','js/akademik-takvim.js','js/sinav-sonuclari.js','js/deneme-sinavlari-modern.js']) assert(!academicLine.includes(legacy),`V2 Academic eski UI/modernizer dosyasını yüklememeli: ${legacy}`);

const managementLine=loader.match(/define\('management',\[(.*?)\]\);/)?.[1]||'';
for(const dep of ['js/core/repositories/takvim.repository.js','js/core/repositories/nobet.repository.js','js/core/services/nobet.service.js','js/modules/management-data.js','js/modules/management.js']) assert(managementLine.includes(`'${dep}'`),`Management grubu ${dep} yüklemeli.`);
for(const legacy of ['js/nobet.js','js/periyodik.js','js/personel.js','js/dilekce.js','js/puantaj.js','js/ogretmen-izin.js']) assert(!managementLine.includes(`'${legacy}'`),`V2 Management eski UI dosyasını yüklememeli: ${legacy}`);

assert(loader.includes("define('transport',['js/modules/people-data.js'"),'Taşıma servisi için people-data önce yüklenmeli.');
const dashboardLine=loader.match(/define\('dashboard',\[(.*?)\]\);/)?.[1]||'';
for(const dep of ['js/core/repositories/takvim.repository.js','js/core/repositories/mesajlasma.repository.js','js/core/services/mesajlasma.service.js','js/modules/communication-data.js']) assert(dashboardLine.includes(`'${dep}'`),`Dashboard ${dep} ortak bağımlılığını yüklemeli.`);
assert(dashboardLine.indexOf('js/modules/communication-data.js') < dashboardLine.indexOf('js/app.js'),'Dashboard servisleri app.js çalışmadan önce hazır olmalı.');

for(const eski of [
  'js/core/repositories/siniflar.repository.js','js/core/services/siniflar.service.js','js/core/repositories/yoklama.repository.js','js/core/services/yoklama.service.js',
  'js/core/repositories/sinavlar.repository.js','js/core/services/sinavlar.service.js','js/core/repositories/yillik-plan.repository.js','js/core/services/yillik-plan.service.js',
  'js/core/repositories/ders-saatleri.repository.js','js/core/services/ders-saatleri.service.js','js/core/repositories/akademik-takvim.repository.js','js/core/services/akademik-takvim.service.js',
  'js/core/repositories/sinav-sonuclari.repository.js','js/core/services/sinav-sonuclari.service.js','js/core/repositories/personel.repository.js','js/core/services/personel.service.js',
  'js/core/repositories/periyodik.repository.js','js/core/services/periyodik.service.js','js/core/repositories/ogretmen-izin.repository.js','js/core/services/ogretmen-izin.service.js',
  'js/core/services/takvim.service.js','js/core/repositories/notlar.repository.js','js/core/services/notlar.service.js','js/core/repositories/duyurular.repository.js','js/core/services/duyurular.service.js',
  'js/core/repositories/anket.repository.js','js/core/services/anket.service.js','js/core/repositories/push.repository.js','js/core/services/push.service.js',
  'js/core/repositories/haberler.repository.js','js/core/services/haberler.service.js','js/core/repositories/tasima.repository.js','js/core/services/tasima.service.js',
  'js/core/repositories/servis-oturma.repository.js','js/core/services/servis-oturma.service.js','js/core/repositories/sinif-oturma.repository.js','js/core/services/sinif-oturma.service.js',
  'js/core/repositories/dokumanlar.repository.js','js/core/services/dokumanlar.service.js','js/core/repositories/kullanici-yonetimi.repository.js','js/core/services/kullanici-yonetimi.service.js','js/core/services/depolama-sinir.service.js'
]) assert(!loader.includes(`'${eski}'`),`${eski} v2 lazy-loader listesine geri dönmemeli.`);
for(const korunan of ['js/core/repositories/takvim.repository.js','js/core/repositories/mesajlasma.repository.js','js/core/services/mesajlasma.service.js','js/core/repositories/nobet.repository.js','js/core/services/nobet.service.js']) assert(loader.includes(`'${korunan}'`),`${korunan} geçiş süresince ayrı yüklenmeli.`);
console.log('Tüm v2 module bundle + temiz People/Academic/Management UI + dashboard dependency smoke testleri başarılı.');
