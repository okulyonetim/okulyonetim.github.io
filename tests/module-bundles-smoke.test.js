const fs=require('fs');
const assert=require('assert');

const loader=fs.readFileSync('js/app-loader.js','utf8');
const core=fs.readFileSync('js/core/core.js','utf8');

const moduleFiles={
  dashboard:'js/modules/dashboard.js',
  people:'js/modules/people.js',
  academic:'js/modules/academic.js',
  management:'js/modules/management.js',
  communication:'js/modules/communication.js',
  transport:'js/modules/transport.js',
  documents:'js/modules/documents.js',
  tools:'js/modules/tools.js',
  settings:'js/modules/settings.js',
  dutyData:'js/modules/duty-data.js',
  transportData:'js/modules/transport-data.js',
  settingsData:'js/modules/settings-data.js',
  reportEngine:'js/modules/report-engine.js'
};
const source=Object.fromEntries(Object.entries(moduleFiles).map(([name,file])=>[name,fs.readFileSync(file,'utf8')]));
for(const text of [...Object.values(source),loader,core]) new Function(text);

const apiContracts={
  dutyData:['NobetRepository','NobetService','batchCommit','otomatikDagitimUygula','excelOgretmenEslestir'],
  people:['SiniflarRepository','SiniflarService','YoklamaRepository','YoklamaService','PeopleModule'],
  academic:['SinavlarRepository','SinavlarService','YillikPlanRepository','YillikPlanService','DersSaatleriRepository','DersSaatleriService','AkademikTakvimRepository','AkademikTakvimService','DenemeSonuclariService','TestSonuclariService','AcademicModule'],
  management:['PersonelRepository','PersonelService','PeriyodikRepository','PeriyodikService','OgretmenIzinRepository','OgretmenIzinService','ManagementModule'],
  communication:['MesajlasmaRepository','MesajlasmaService','TakvimRepository','TakvimService','NotlarRepository','NotlarService','DuyurularRepository','DuyurularService','AnketRepository','AnketService','HaberlerRepository','HaberlerService','CommunicationModule'],
  transportData:['TasimaRepository','TasimaService','ServisOturmaRepository','ServisOturmaService','SinifOturmaRepository','SinifOturmaService'],
  documents:['DokumanlarRepository','DokumanlarService','DocumentsModule'],
  tools:['KontrolListeleriRepository','KontrolListeleriService','HaritaRepository','HaritaService','CizelgelerRepository','CizelgelerService','DevamsizlikCizelgesiRepository','DevamsizlikCizelgesiService','OdevNotCizelgeleriRepository','OdevNotCizelgeleriService','prepareControlLists','prepareMap','prepareForms','prepareAttendance','prepareGradebooks','FORM_TYPES','GRADE_TYPES','ToolsModule'],
  settingsData:['KullaniciYonetimiRepository','KullaniciYonetimiService','DepolamaSinirService']
};
for(const [bundle,names] of Object.entries(apiContracts)) for(const name of names) assert(source[bundle].includes(name),`${moduleFiles[bundle]} ${name} API'sini korumalı.`);

const uiGlobal={dashboard:'DashboardModule',people:'PeopleModule',academic:'AcademicModule',management:'ManagementModule',communication:'CommunicationModule',transport:'TransportModule',documents:'DocumentsModule',tools:'ToolsModule',settings:'SettingsModule'};
for(const [bundle,globalName] of Object.entries(uiGlobal)){
  assert(source[bundle].includes(`window.${globalName}`)||source[bundle].includes(`global.${globalName}`),`${bundle}.js tek V2 UI sahibi olmalı.`);
  assert(!/\bdb\.collection\s*\(/.test(source[bundle]),`${bundle}.js doğrudan Firestore kullanmamalı.`);
}

for(const api of ['window.DeviceData','deviceAdd','deviceUpdate','deviceSet','deviceRemove']) assert(core.includes(api),`Core ${api} sözleşmesini içermeli.`);
assert(core.includes("queue(uid(),{kind:'set-doc'"),'DeviceData yazmaları mevcut offline queue kullanmalı.');
assert(core.includes("tombstone(u,type,id,true)"),'DeviceData silmede tombstone kullanmalı.');

for(const bundle of ['dutyData','people','academic','management','communication','transportData','documents','tools','settingsData']){
  for(const forbidden of ['localStorage','onSnapshot','db.collection','db.batch']) assert(!source[bundle].includes(forbidden),`${bundle} doğrudan ${forbidden} kullanmamalı.`);
  assert(source[bundle].includes('DeviceData'),`${bundle} merkezi DeviceData kullanmalı.`);
}

assert(source.tools.includes("where('olusturanUid','==',u.uid)"),'Harita favorileri normal kullanıcıda sahiplik filtresiyle senkronize edilmeli.');
assert(source.tools.includes("where('sahipUid','==',u.uid)"),'Ödev/Not çizelgeleri normal kullanıcıda sahiplik filtresiyle senkronize edilmeli.');
assert(source.tools.includes("['sosyalKulupler','sok','zumre','bepPlani','rehberlik','maarifRapor','belirliGunler','digerEvrak']"),'Çizelge tipleri mevcut gerçek koleksiyonları korumalı.');
assert(source.tools.includes("_belgeId(yil,ay){return `${yil}-${ay}`"),'Devamsızlık belge ID şeması YIL-AY olarak korunmalı.');
assert(source.dutyData.includes('batchYeriSil')&&source.dutyData.includes('batchAmirSil'),'Nöbet batch sözleşmesi cihaz-first kalmalı.');
assert(source.academic.includes('storage.ref()'),'Academic binary dosyası Storage üzerinden yönetilmeli.');
assert(source.documents.includes('storage.ref()'),'Documents binary dosyası Storage üzerinden yönetilmeli.');
assert(source.communication.includes('storage.ref()'),'Communication binary dosyaları Storage üzerinden yönetilmeli.');

function registry(name){return loader.match(new RegExp(`define\\('${name}',\\[(.*?)\\]\\);`))?.[1]||''}
for(const [name,file] of Object.entries({dashboard:'dashboard.js',people:'people.js',academic:'academic.js',management:'management.js',communication:'communication.js',transport:'transport.js',documents:'documents.js',tools:'tools.js',settings:'settings.js'})) assert(registry(name).includes(`'js/modules/${file}'`),`${name} kendi tek UI modülünü yüklemeli.`);
for(const old of ['people-data.js','academic-data.js','management-data.js','messaging-data.js','communication-data.js','documents-data.js','tools-data.js']) assert(!loader.includes(old),`Legacy data paketi loader'a geri dönmemeli: ${old}`);
assert(registry('management').includes("'js/modules/duty-data.js'"),'Management nöbet rotasyon motorunu yüklemeli.');
assert(registry('transport').includes("'js/modules/transport-data.js'"),'Transport veri/yerleşim sözleşmesini yüklemeli.');
assert(registry('transport').includes("'js/modules/report-engine.js'"),'Transport ortak ReportEngine kullanmalı.');
assert(loader.includes('prepareAccountLocalData'),'Hesap/kota verisi başlangıçta cihaz cache ine alınmalı.');

console.log('Dokuz V2 modülü güncel konsolidasyon ağacında local-first: smoke test başarılı.');
