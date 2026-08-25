const fs=require('fs');
const assert=require('assert');

const loader=fs.readFileSync('js/app-loader.js','utf8');
const core=fs.readFileSync('js/core/core.js','utf8');
const dataBundles=['duty-data','people-data','academic-data','management-data','messaging-data','communication-data','transport-data','documents-data','tools-data','settings-data'];
const uiBundles=['dashboard','people','academic','management','communication','transport','documents','tools','settings'];
const source={};
for(const name of dataBundles) source[name]=fs.readFileSync(`js/modules/${name}.js`,'utf8');
for(const name of uiBundles) source[name]=fs.readFileSync(`js/modules/${name}.js`,'utf8');
for(const text of [...Object.values(source),loader,core]) new Function(text);

const apiContracts={
 'duty-data':['NobetRepository','NobetService','batchCommit','otomatikDagitimUygula','excelOgretmenEslestir'],
 'people-data':['SiniflarRepository','SiniflarService','YoklamaRepository','YoklamaService'],
 'academic-data':['SinavlarRepository','SinavlarService','YillikPlanRepository','YillikPlanService','DersSaatleriRepository','DersSaatleriService','AkademikTakvimRepository','AkademikTakvimService','DenemeSonuclariService','TestSonuclariService'],
 'management-data':['PersonelRepository','PersonelService','PeriyodikRepository','PeriyodikService','OgretmenIzinRepository','OgretmenIzinService'],
 'messaging-data':['MesajlasmaRepository','MesajlasmaService'],
 'communication-data':['TakvimRepository','TakvimService','NotlarRepository','NotlarService','DuyurularRepository','DuyurularService','AnketRepository','AnketService','PushRepository','PushService','HaberlerRepository','HaberlerService'],
 'transport-data':['TasimaRepository','TasimaService','ServisOturmaRepository','ServisOturmaService','SinifOturmaRepository','SinifOturmaService'],
 'documents-data':['DokumanlarRepository','DokumanlarService'],
 'tools-data':['KontrolListeleriRepository','KontrolListeleriService','HaritaRepository','HaritaService','CizelgelerRepository','CizelgelerService','prepareControlLists','prepareMap','prepareForms','FORM_TYPES'],
 'settings-data':['KullaniciYonetimiRepository','KullaniciYonetimiService','DepolamaSinirService']
};
for(const [bundle,names] of Object.entries(apiContracts)) for(const name of names) assert(source[bundle].includes(name),`${bundle}.js ${name} API'sini korumalı.`);

const uiGlobal={dashboard:'DashboardModule',people:'PeopleModule',academic:'AcademicModule',management:'ManagementModule',communication:'CommunicationModule',transport:'TransportModule',documents:'DocumentsModule',tools:'ToolsModule',settings:'SettingsModule'};
for(const [bundle,globalName] of Object.entries(uiGlobal)){
  assert(source[bundle].includes(`window.${globalName}`)||source[bundle].includes(`global.${globalName}`),`${bundle}.js tek V2 UI sahibi olmalı.`);
  assert(!/\bdb\.collection\s*\(/.test(source[bundle]),`${bundle}.js doğrudan Firestore kullanmamalı.`);
}
for(const api of ['window.DeviceData','deviceAdd','deviceUpdate','deviceSet','deviceRemove']) assert(core.includes(api),`Core ${api} sözleşmesini içermeli.`);
assert(core.includes("queue(uid(),{kind:'set-doc'"),'DeviceData yazmaları mevcut offline queue kullanmalı.');
assert(core.includes("tombstone(u,type,id,true)"),'DeviceData silmede tombstone kullanmalı.');
for(const bundle of dataBundles){
  for(const forbidden of ['localStorage','onSnapshot','db.collection','db.batch']) assert(!source[bundle].includes(forbidden),`${bundle} doğrudan ${forbidden} kullanmamalı.`);
  assert(source[bundle].includes('DeviceData'),`${bundle} merkezi DeviceData kullanmalı.`);
}
assert(source['tools-data'].includes("where('olusturanUid','==',u.uid)"),'Harita favorileri normal kullanıcıda sahiplik filtresiyle senkronize edilmeli.');
assert(source['tools-data'].includes("['sosyalKulupler','sok','zumre','bepPlani','rehberlik','maarifRapor','belirliGunler','digerEvrak']"),'Çizelge tipleri mevcut gerçek koleksiyonları korumalı.');
assert(source['duty-data'].includes('batchYeriSil')&&source['duty-data'].includes('batchAmirSil'),'Nöbet batch sözleşmesi cihaz-first kalmalı.');
assert(source['academic-data'].includes('storage.ref()'),'Academic binary dosyası Storage üzerinden yönetilmeli.');
assert(source['documents-data'].includes('storage.ref()'),'Documents binary dosyası Storage üzerinden yönetilmeli.');
assert(source['communication-data'].includes('storage.ref()'),'Duyuru görselleri Storage üzerinden yönetilmeli.');
assert(source['messaging-data'].includes('storage.ref()'),'Mesaj dosyaları Storage üzerinden yönetilmeli.');
function registry(name){return loader.match(new RegExp(`define\\('${name}',\\[(.*?)\\]\\);`))?.[1]||''}
for(const [name,file] of Object.entries({dashboard:'dashboard.js',people:'people.js',academic:'academic.js',management:'management.js',communication:'communication.js',transport:'transport.js',documents:'documents.js',tools:'tools.js',settings:'settings.js'})) assert(registry(name).includes(`'js/modules/${file}'`),`${name} tek temiz UI yüklemeli.`);
assert(registry('tools').includes("'js/modules/tools-data.js'"),'Tools birleşik tools-data yüklemeli.');
for(const old of ['kontrol-listeleri.repository.js','kontrol-listeleri.service.js','harita.repository.js','harita.service.js']) assert(!registry('tools').includes(old),`Tools legacy data dosyasını yüklememeli: ${old}`);
assert(loader.includes('prepareAccountLocalData'),'Hesap/kota verisi başlangıçta cihaz cache ine alınmalı.');
console.log('Dokuz V2 modülü local-first ve tek UI sahibi: smoke test başarılı.');
