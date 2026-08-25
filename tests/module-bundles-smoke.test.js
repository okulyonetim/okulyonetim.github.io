const fs=require('fs');
const assert=require('assert');

const loader=fs.readFileSync('js/app-loader.js','utf8');
const core=fs.readFileSync('js/core/core.js','utf8');
const dataBundles=['people-data','academic-data','management-data','messaging-data','communication-data','transport-data','documents-data','settings-data'];
const uiBundles=['dashboard','people','academic','management','communication','transport','documents','settings'];
const source={};
for(const name of dataBundles) source[name]=fs.readFileSync(`js/modules/${name}.js`,'utf8');
for(const name of uiBundles) source[name]=fs.readFileSync(`js/modules/${name}.js`,'utf8');
for(const text of [...Object.values(source),loader,core]) new Function(text);

const apiContracts={
 'people-data':['SiniflarRepository','SiniflarService','YoklamaRepository','YoklamaService'],
 'academic-data':['SinavlarRepository','SinavlarService','YillikPlanRepository','YillikPlanService','DersSaatleriRepository','DersSaatleriService','AkademikTakvimRepository','AkademikTakvimService','DenemeSonuclariService','TestSonuclariService'],
 'management-data':['PersonelRepository','PersonelService','PeriyodikRepository','PeriyodikService','OgretmenIzinRepository','OgretmenIzinService'],
 'messaging-data':['MesajlasmaRepository','MesajlasmaService'],
 'communication-data':['TakvimRepository','TakvimService','NotlarRepository','NotlarService','DuyurularRepository','DuyurularService','AnketRepository','AnketService','PushRepository','PushService','HaberlerRepository','HaberlerService'],
 'transport-data':['TasimaRepository','TasimaService','ServisOturmaRepository','ServisOturmaService','SinifOturmaRepository','SinifOturmaService'],
 'documents-data':['DokumanlarRepository','DokumanlarService'],
 'settings-data':['KullaniciYonetimiRepository','KullaniciYonetimiService','DepolamaSinirService']
};
for(const [bundle,names] of Object.entries(apiContracts)) for(const name of names) assert(source[bundle].includes(name),`${bundle}.js ${name} API'sini korumalı.`);

const uiGlobal={dashboard:'DashboardModule',people:'PeopleModule',academic:'AcademicModule',management:'ManagementModule',communication:'CommunicationModule',transport:'TransportModule',documents:'DocumentsModule',settings:'SettingsModule'};
for(const [bundle,globalName] of Object.entries(uiGlobal)){
  assert(source[bundle].includes(`window.${globalName}`),`${bundle}.js tek V2 UI sahibi olmalı.`);
  assert(!/\bdb\.collection\s*\(/.test(source[bundle]),`${bundle}.js doğrudan Firestore kullanmamalı.`);
}
for(const bundle of ['academic','management','communication','transport','documents','settings']){
  assert(source[bundle].includes('SyncEngine'),`${bundle}.js merkezi SyncEngine kullanmalı.`);
  assert(source[bundle].includes('localHydrate'),`${bundle}.js önce cihaz cache'ini hydrate etmeli.`);
}

for(const api of ['window.DeviceData','deviceAdd','deviceUpdate','deviceSet','deviceRemove']) assert(core.includes(api),`Core ${api} sözleşmesini içermeli.`);
assert(core.includes("queue(uid(),{kind:'set-doc'"),'DeviceData yazmaları mevcut offline queue kullanmalı.');
assert(core.includes("tombstone(u,type,id,true)"),'DeviceData silmede tombstone kullanmalı.');
for(const bundle of ['people-data','academic-data','management-data','messaging-data','communication-data','transport-data','documents-data','settings-data']){
  for(const forbidden of ['localStorage','onSnapshot','db.collection']) assert(!source[bundle].includes(forbidden),`${bundle} doğrudan ${forbidden} kullanmamalı.`);
  assert(source[bundle].includes('DeviceData'),`${bundle} merkezi DeviceData kullanmalı.`);
}
assert(source['academic-data'].includes('storage.ref()'),'Academic takvim binary dosyası Storage üzerinden yönetilmeli.');
assert(source['documents-data'].includes('storage.ref()'),'Documents binary dosyası Storage üzerinden yönetilmeli.');
assert(source['communication-data'].includes('storage.ref()'),'Duyuru görselleri Storage üzerinden yönetilmeli.');
assert(source['messaging-data'].includes('storage.ref()'),'Mesaj dosyaları Storage üzerinden yönetilmeli.');

function registry(name){return loader.match(new RegExp(`define\\('${name}',\\[(.*?)\\]\\);`))?.[1]||''}
assert(registry('dashboard').includes("'js/modules/dashboard.js'"),'Dashboard yalnız temiz V2 UI yüklemeli.');
for(const legacy of ['js/app.js','js/ui.js','js/alt-navigasyon.js','js/sistem-bar.js','js/hava-durumu.js']) assert(!registry('dashboard').includes(legacy),`Dashboard legacy dosyayı yüklememeli: ${legacy}`);
assert(registry('people').includes("'js/modules/people-data.js'")&&registry('people').includes("'js/modules/people.js'"),'People data + tek UI olmalı.');
for(const legacy of ['js/siniflar.js','js/ogrenciler-arama.js','js/ogretmen-detay.js','js/yoklama.js']) assert(!registry('people').includes(legacy),`People legacy dosyayı yüklememeli: ${legacy}`);
for(const dep of ['js/modules/settings-data.js','js/modules/academic-data.js','js/deneme-sinavlari-stability.js','js/modules/academic.js']) assert(registry('academic').includes(`'${dep}'`),`Academic ${dep} yüklemeli.`);
for(const legacy of ['js/sinavlar.js','js/yillik-plan.js','js/ders-saatleri.js','js/akademik-takvim.js','js/sinav-sonuclari.js','js/deneme-sinavlari-modern.js']) assert(!registry('academic').includes(legacy),`Academic legacy dosyayı yüklememeli: ${legacy}`);
assert(registry('management').includes("'js/modules/management.js'"),'Management tek temiz UI yüklemeli.');
assert(!registry('management').includes('takvim.repository.js'),'Management hatırlatıcı için ayrı TakvimRepository yüklememeli.');
for(const legacy of ['js/nobet.js','js/periyodik.js','js/personel.js','js/dilekce.js','js/puantaj.js','js/ogretmen-izin.js']) assert(!registry('management').includes(`'${legacy}'`),`Management legacy dosyayı yüklememeli: ${legacy}`);
assert(registry('communication').includes("'js/modules/messaging-data.js'"),'Communication birleşik messaging-data yüklemeli.');
assert(registry('communication').includes("'js/modules/communication.js'"),'Communication tek temiz UI yüklemeli.');
for(const old of ['takvim.repository.js','mesajlasma.repository.js','mesajlasma.service.js']) assert(!registry('communication').includes(old),`Communication eski data dosyasını yüklememeli: ${old}`);
for(const legacy of ['js/mesajlasma.js','js/duyurular.js','js/anket.js','js/haberler.js','js/takvim.js','js/notlar.js']) assert(!registry('communication').includes(`'${legacy}'`),`Communication legacy dosyayı yüklememeli: ${legacy}`);
assert(registry('transport').includes("'js/modules/transport.js'"),'Transport tek temiz UI yüklemeli.');
for(const legacy of ['js/tasima.js','js/servis-oturma.js','js/sinif-oturma.js','js/tasima-takip.js','js/servis-denetim.js']) assert(!registry('transport').includes(`'${legacy}'`),`Transport legacy dosyayı yüklememeli: ${legacy}`);
assert(registry('documents').includes("'js/modules/settings-data.js'")&&registry('documents').includes("'js/modules/documents.js'"),'Documents kota servisi + tek temiz UI yüklemeli.');
assert(registry('settings').includes("'js/modules/settings.js'"),'Settings tek temiz UI yüklemeli.');
assert(loader.includes('prepareAccountLocalData'),'Hesap/kota verisi başlangıçta cihaz cache ine alınmalı.');
console.log('Sekiz ana V2 modülü local-first ve tek UI sahibi: smoke test başarılı.');
