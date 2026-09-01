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
  reportEngine:'js/modules/report-engine.js'
};
const source=Object.fromEntries(Object.entries(moduleFiles).map(([name,file])=>[name,fs.readFileSync(file,'utf8')]));
for(const text of [...Object.values(source),loader,core]) new Function(text);

const apiContracts={
  people:['SiniflarRepository','SiniflarService','YoklamaRepository','YoklamaService','PeopleModule'],
  academic:['SinavlarRepository','SinavlarService','YillikPlanRepository','YillikPlanService','DersSaatleriRepository','DersSaatleriService','AkademikTakvimRepository','AkademikTakvimService','DenemeSonuclariService','TestSonuclariService','AcademicModule'],
  management:['NobetRepository','NobetService','batchCommit','otomatikDagitimUygula','excelOgretmenEslestir','PersonelRepository','PersonelService','PeriyodikRepository','PeriyodikService','OgretmenIzinRepository','OgretmenIzinService','ManagementModule'],
  communication:['MesajlasmaRepository','MesajlasmaService','TakvimRepository','TakvimService','NotlarRepository','NotlarService','DuyurularRepository','DuyurularService','AnketRepository','AnketService','HaberlerRepository','HaberlerService','CommunicationModule'],
  transport:['TasimaRepository','TasimaService','ServisOturmaRepository','ServisOturmaService','SinifOturmaRepository','SinifOturmaService','SO_SABLONLAR','TransportReports','TransportModule'],
  documents:['DokumanlarRepository','DokumanlarService','DocumentsModule'],
  tools:['KontrolListeleriRepository','KontrolListeleriService','HaritaRepository','HaritaService','CizelgelerRepository','CizelgelerService','DevamsizlikCizelgesiRepository','DevamsizlikCizelgesiService','OdevNotCizelgeleriRepository','OdevNotCizelgeleriService','prepareControlLists','prepareMap','prepareForms','prepareAttendance','prepareGradebooks','FORM_TYPES','GRADE_TYPES','ToolsModule'],
  settings:['KullaniciYonetimiRepository','KullaniciYonetimiService','DepolamaSinirService','SettingsModule']
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

for(const bundle of ['people','academic','management','communication','transport','documents','tools','settings']){
  for(const forbidden of ['localStorage','onSnapshot','db.collection','db.batch']) assert(!source[bundle].includes(forbidden),`${bundle} doğrudan ${forbidden} kullanmamalı.`);
  assert(source[bundle].includes('DeviceData'),`${bundle} merkezi DeviceData kullanmalı.`);
}

// Öncelikli çekirdek sayfalar rol kataloğunda gerçek, ayrı izin anahtarlarına sahip olmalı.
for(const key of [
  'academic.schedule','academic.schedule.edit',
  'communication.polls','communication.polls.edit','communication.news','communication.news.edit',
  'communication.calendar','communication.calendar.edit','communication.notes','communication.notes.edit',
  'transport.services','transport.services.edit','transport.classSeating','transport.classSeating.edit',
  'settings.school','settings.school.edit','settings.users','settings.roles.edit'
]) assert(loader.includes(`['${key}'`),`Merkezi permission kataloğu eksik: ${key}`);
for(const alias of [
  "'academic.schedule':['dersProgrami']","'academic.schedule.edit':['dersProgrami']",
  "'communication.calendar':['takvim']","'communication.calendar.edit':['takvim']",
  "'communication.notes':['notlar']","'communication.notes.edit':['notlar']",
  "'communication.news':['haberler']","'communication.polls':['anketler']",
  "'settings.school':['okulBilgileri']"
]) assert(loader.includes(alias),`Legacy permission alias sözleşmesi eksik: ${alias}`);
assert(loader.includes("'module.academic':['sinavIslemleri','yillikPlan','dersProgrami'"),'Ders Programı legacy yetkisi Academic modül görünürlüğüne de dahil edilmeli.');

assert(source.tools.includes("where('olusturanUid','==',u.uid)"),'Harita favorileri normal kullanıcıda sahiplik filtresiyle senkronize edilmeli.');
assert(source.tools.includes("where('sahipUid','==',u.uid)"),'Ödev/Not çizelgeleri normal kullanıcıda sahiplik filtresiyle senkronize edilmeli.');
assert(source.tools.includes("['sosyalKulupler','sok','zumre','bepPlani','rehberlik','maarifRapor','belirliGunler','digerEvrak']"),'Çizelge tipleri mevcut gerçek koleksiyonları korumalı.');
assert(source.tools.includes("_belgeId(yil,ay){return `${yil}-${ay}`"),'Devamsızlık belge ID şeması YIL-AY olarak korunmalı.');
assert(source.management.includes('batchYeriSil')&&source.management.includes('batchAmirSil'),'Nöbet batch sözleşmesi Management içinde cihaz-first kalmalı.');
assert(source.academic.includes('storage.ref()'),'Academic binary dosyası Storage üzerinden yönetilmeli.');
assert(source.documents.includes('storage.ref()'),'Documents binary dosyası Storage üzerinden yönetilmeli.');
assert(source.communication.includes('storage.ref()'),'Communication binary dosyaları Storage üzerinden yönetilmeli.');

// Communication servis katmanı: tüm gerçek mutation'lar yetki ve sahiplik sınırından geçmeli.
for(const token of [
  "async mesajSil(m){if(!this._yetkiKontrol())throw new Error('yetkisiz')",
  "_yetkiKontrol(){const ok=global.PermissionService?PermissionService.can('communication.calendar.edit','edit'):duzenleyebilir('takvim')",
  "hatirlaticiSil(id){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'))",
  "hatirlaticiTamamlandiGuncelle(id,d){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'))",
  "gorevSil(id){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'))",
  "gorevDurumGuncelle(id,d){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'))",
  "gorevTamamlandiGuncelle(id,d){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'))",
  "function calendarOwn(type,id)",
  "if(!calendarOwn('hatirlaticilar',id))return Promise.reject(new Error('sahip-degil'))",
  "if(!calendarOwn('gorevler',id))return Promise.reject(new Error('sahip-degil'))",
  "function noteOwn(id)",
  "_yetkiKontrol(){return global.PermissionService?PermissionService.can('communication.notes.edit','edit')",
  "notSil(id){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'))",
  "notMaddeleriGuncelle(id,m){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'))",
  "async duyuruSil(id,resimler=[]){try{requireEdit('duyurular')}",
  "anketKapat(id,k){if(!isAdmin())return Promise.reject(new Error('yetkisiz'))",
  "anketSil(id){if(!isAdmin())return Promise.reject(new Error('yetkisiz'))",
  "HaberlerService={_yetkiKontrol(){return duzenleyebilir('haberler')}",
  "haberSil(id){try{requireEdit('haberler')}",
  "kaynakSil(id){try{requireEdit('haberler')}"
]) assert(source.communication.includes(token),`Communication mutation permission sözleşmesi eksik: ${token}`);
assert(source.communication.includes("if(id&&!noteOwn(id))return Promise.reject(new Error('sahip-degil'))"),'Başkasının notu ID bilinerek güncellenememeli.');
assert(source.communication.includes("if(!noteOwn(id))return Promise.reject(new Error('sahip-degil'))"),'Başkasının notu silinememeli veya checklist maddeleri değiştirilememeli.');
for(const hook of ['visibleNotes()','data-note-add','data-note-edit','data-note-delete','data-note-item','noteForm','bindNotes(out)']) assert(source.communication.includes(hook),`Notlar yönetim UI sözleşmesi eksik: ${hook}`);
assert(source.communication.includes("arr('notlar').filter(x=>x.sahipUid===uid())"),'Normal kullanıcı Notlar UI başka kullanıcı cache kayıtlarını göstermemeli.');
assert(source.communication.includes('const safeToast=m=>window.toast?.(m)'),'Takvim/Notlar UI hata bildirim yardımcısı kendi scope içinde tanımlı olmalı.');
assert(source.communication.includes("okunduIsaretle(id){const u=uid();if(!u)return Promise.reject(new Error('kimlik-yok'));return DuyurularRepository.okunduIsaretle")&&!source.communication.includes("okunduIsaretle(id){if(!this._yetkiKontrol())"),'Duyuru okundu işaretleme kimlikli normal kullanıcı eylemi olarak edit yetkisinden bağımsız kalmalı.');
assert(source.communication.includes("oyVer(a,ids){const ben=user(),oylar="),'Anket oylama normal kullanıcı eylemi olarak admin mutation sınırından bağımsız kalmalı.');

// Taşıma: gerçek servis CRUD'u, öğrenci koruması ve ayrık rol sınırları UI/service katmanında korunmalı.
for(const token of [
  "PermissionService.can('transport.services.edit','edit')",
  "PermissionService.can('transport.seating.edit','edit')",
  "PermissionService.can('transport.classSeating.edit','edit')",
  'data-service-add','data-service-edit','data-service-delete','serviceForm',
  'servisAdi','guzergah','plaka','soforAdi','soforTelefon',
  'window.TasimaService.servisKaydet','window.TasimaService.servisSil'
]) assert(source.transport.includes(token),`Taşıma servis yönetim sözleşmesi eksik: ${token}`);
assert(source.transport.includes("arr('veliler').filter(v=>v.servisId===id).length"),'Öğrenci atanmış servis silinmeden önce bağlı öğrenci sayısı kontrol edilmeli.');
assert(source.transport.includes('Önce öğrencileri başka servise taşıyın.'),'Bağlı öğrencisi olan servis doğrudan silinmemeli.');
assert(source.transport.includes("device().add('servisler',COL.servisler")&&source.transport.includes("device().update('servisler',COL.servisler")&&source.transport.includes("device().remove('servisler',COL.servisler"),'Servis CRUD merkezi DeviceData üzerinden kalmalı.');

assert(source.documents.includes("s.src='js/modules/document-viewer.js'"),'Belge görüntüleyici yalnız dosya açılırken doğrudan module path üzerinden lazy-load edilmeli.');
assert(!source.documents.includes('js/dokuman-okuyucu.js'),'Emekli root belge görüntüleyici yolu geri dönmemeli.');
assert(source.documents.includes('data-document-open'),'Documents UI dış sekme yerine kontrollü görüntüleme eylemi kullanmalı.');
assert(source.documents.includes("PermissionService?.can?.('documents.view','preview')"),'Belge açma documents.view iznine bağlı kalmalı.');
assert(source.documents.includes('viewer.destekliMi?.')&&source.documents.includes('await viewer.ac('),'Desteklenen belge türleri uygulama içi görüntüleyiciye yönlenmeli.');
assert(source.documents.includes("window.open(url,'_blank','noopener')"),'Desteklenmeyen belge türleri ve harici URL için web fallback korunmalı.');

function registry(name){return loader.match(new RegExp(`define\\('${name}',\\[(.*?)\\]\\);`))?.[1]||''}
for(const [name,file] of Object.entries({dashboard:'dashboard.js',people:'people.js',academic:'academic.js?v=835',management:'management.js',communication:'communication.js',transport:'transport.js',documents:'documents.js',tools:'tools.js',settings:'settings.js'})) assert(registry(name).includes(`'js/modules/${file}'`),`${name} kendi tek UI modülünü yüklemeli.`);
for(const old of ['people-data.js','academic-data.js','management-data.js','messaging-data.js','communication-data.js','documents-data.js','tools-data.js','transport-data.js','settings-data.js','duty-data.js']) assert(!loader.includes(old),`Legacy data paketi loader'a geri dönmemeli: ${old}`);
assert(!registry('academic').includes('academic-calendar-parity.js'),'Academic bundle ayrı takvim parity kaynağı yüklememeli.');
assert(source.academic.includes('openAcademicCalendar')&&source.academic.includes('kaAcademicCalendarOverlay'),'Akademik Takvim davranışı canonical academic.js içinde yaşamalı.');
assert(registry('transport').includes("'js/modules/report-engine.js'"),'Transport ortak ReportEngine kullanmalı.');
assert(registry('tools').includes("'js/modules/map-ui.js'"),'Tools interaktif harita motorunu module path üzerinden lazy-load edilmeli.');
assert(!registry('tools').includes("'js/harita.js'"),'Emekli root harita yolu Tools registry ye geri dönmemeli.');
assert(loader.includes('prepareAccountLocalData'),'Hesap/kota verisi başlangıçta cihaz cache ine alınmalı.');
assert(loader.includes("const active=AppStore?.get?.('ui.route')===name")&&loader.includes("if(active){window.dispatchEvent(new CustomEvent('koruk:module-ready'"),'Lazy yüklenen bağımlılık aktif rota değilse UI mount eventi üretmemeli; eski async yükleme yeni sayfanın üstüne binmemeli.');

console.log('Dokuz V2 modülü tekilleştirilmiş local-first mimaride; çekirdek rol, Takvim/Notlar sahipliği ve Taşıma servis yönetimi smoke test başarılı.');
