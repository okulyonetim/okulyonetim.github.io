const fs=require('fs');
const assert=require('assert');
const shell=fs.readFileSync('index.html','utf8');
const ui=fs.readFileSync('js/core/shell-ui.js','utf8');
const core=fs.readFileSync('js/core/core.js','utf8');
const dashboard=fs.readFileSync('js/modules/dashboard.js','utf8');
const communication=fs.readFileSync('js/modules/communication.js','utf8');
const live=fs.readFileSync('js/modules/school-live-status.js','utf8');
const design=fs.readFileSync('css/design-system.css','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

assert(shell.includes('js/core/shell-ui.js'),'Yeni shell UI çekirdekten yüklenmeli.');
assert(shell.includes('js/modules/school-live-status.js'),'Canlı zil/hava V2 runtime production shell içinde bulunmalı.');
for(const action of ['home','profile','menu','search','note']) assert(shell.includes(`data-ka-shell-action="${action}"`),`Alt navigasyon eylemi eksik: ${action}`);
assert((shell.match(/data-ka-shell-action=/g)||[]).length===5,'Mobil alt navigasyon tam 5 ana eylemden oluşmalı.');
assert(shell.includes('ka-bottom-menu-icon'),'Ortadaki Menü düğmesi ayrı yükseltilmiş sunuma sahip olmalı.');
assert(shell.includes('id="kaMenuLayer"'),'Tam ekran Menü katmanı production shell içinde bulunmalı.');
assert(!shell.includes('IndexedDB verileri ekrana alınır'),'Teknik local-first açıklaması kullanıcı arayüzüne dönmemeli.');
assert(!shell.includes('data-ka-module="people"'),'Dokuz modüllü eski teknik alt navigasyon geri dönmemeli.');
assert(!shell.includes('#kaMenuLayer [data-ka-menu-route]'),'Eski capture-phase menü yönlendiricisi index.html içine geri dönmemeli.');
const shellLocalStorage=[...shell.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(([^)]*)\)/g)].map(m=>m[1]);
assert(shellLocalStorage.length>0&&shellLocalStorage.every(x=>x.includes("'ka-theme'")||x.includes('"ka-theme"')),'Production shell localStorage kullanımı yalnız ilk boyama ka-theme bootstrap aynasıyla sınırlı olmalı.');
assert(shell.includes('const KaDataPage=(()=>{')&&shell.includes('window.KaDataPage=KaDataPage'),'Veri Aktarma Merkezi mevcut public API ile korunmalı.');
for(const contract of ['importTeachers(file)','importStudents(file,classId)','importServiceStudents(file,serviceId)','downloadTemplate(type)','backupPayload()','restore(file)','driveBackup()']) assert(shell.includes(contract),`Veri Aktarma Merkezi sözleşmesi eksik: ${contract}`);

assert(core.includes('async function entriesByPrefix(prefix)')&&core.includes('async function userSnapshot(u=uid())'),'Core aktif kullanıcıya ait tüm merkezi IndexedDB kayıtlarını enumerate edebilmeli.');
assert(core.includes('userSnapshot,markBootstrap'),'KorukLocalFirst public API tam kullanıcı snapshot sözleşmesini sunmalı.');
assert(shell.includes('window.KorukLocalFirst.userSnapshot(uid)'),'JSON/Drive yedeği bütün kullanıcı IndexedDB cache/meta/tombstone/queue snapshotını kullanmalı.');
assert(shell.includes('...Object.keys(local.caches||{})'),'Backup type envanteri IndexedDB’de olup AppStore’da açılmamış cache tiplerini de içermeli.');
assert(shell.includes("version:4")&&shell.includes('sync:{queue:Array.isArray(local.queue)?local.queue:[],tombstones:local.tombstones'),'Tam local-first snapshot yeni backup formatında saklanmalı.');
assert(shell.includes('collections[type]=collection'),'Dinamik cache type -> Firestore collection eşlemesi backup içine yazılmalı.');
assert(shell.includes("window.COL?.[String(type).split(':')[0]]"),'mesajlar:<id> gibi dinamik cache tipleri gerçek ana koleksiyonuna çözülebilmeli.');
assert(shell.includes('await window.KorukLocalFirst.cache(uid,type,safe);window.AppStore?.setData?.(type,safe);'),'Restore COL karşılığı olmasa da local-only cache’i merkezi IndexedDB ve AppStore’a geri yüklemeli.');
assert(shell.includes('if(collection){for(const item of safe)')&&shell.includes('else{localOnly+=safe.length}'),'Yalnız gerçek collection eşlemesi olan tipler Firestore sync kuyruğuna eklenmeli; local-only tipler yerelde kalmalı.');
for(const localFirst of ['KorukLocalFirst.queue','KorukLocalFirst.cache','KorukLocalFirst.tombstone','KorukLocalFirst.meta','KorukLocalFirst.pending']) assert(shell.includes(localFirst),`Veri geri yükleme local-first bileşeni eksik: ${localFirst}`);
assert(shell.includes("KorukLocalFirst.meta(uid,'lastDriveBackup'")&&shell.includes("'lastDriveBackup'"),'Drive son yedek metadata’sı IndexedDB meta üzerinde tutulmalı ve yedeğe dahil edilmeli.');
assert(shell.includes("kind:'set-doc'")&&shell.includes('SyncEngine?.schedule?.(80)'),'Senkron tipler restore sonrası queue üzerinden arka plan senkronuna bırakılmalı.');

assert(ui.includes('const MENU_GROUPS=['),'Menü kategori kataloğu V2 ShellUI içinde merkezi olmalı.');
for(const key of ['people','exams','programs','communication','calendar','transport','documents','management','settings']) assert(ui.includes(`key:'${key}'`),`Eski UX kategori karşılığı eksik: ${key}`);
for(const label of ['Öğretmen & Öğrenciler','Sınavlar ve Not İşlemleri','Programlar','İletişim & Haberler','Takvim & Notlar','Taşıma','Doküman & Evraklar','İdari İşler']) assert(ui.includes(label),`Klasik Menü etiketi eksik: ${label}`);
for(const route of ['people','academic','management','communication','transport','documents','tools','settings']) assert(new RegExp(`['\"]${route}['\"]`).test(ui),`Menü V2 modül rotası eksik: ${route}`);
assert(ui.includes('data-ka-menu-group')&&ui.includes('data-ka-shell-route')&&ui.includes('data-ka-menu-back'),'İki aşamalı Menü sözleşmesi korunmalı ve route sahibi ShellUI olmalı.');
assert(!ui.includes('data-ka-menu-route'),'ShellUI eski ikinci menü yönlendiricisinin data-ka-menu-route sözleşmesini üretmemeli.');
const directPages=[
  ['Öğrenci Yoklama','tools','student-attendance'],['Öğrenci Listesi Oluşturucu','tools','student-list'],['Ödev Takip Çizelgesi','tools','homework'],['Not Çizelgesi','tools','grades'],
  ['Nöbet Programı','management','duty'],['Harita','tools','map'],['Kontrol Listeleri','tools','checklists'],['Evrak Takibi','documents','evrak'],['Aylık İşler','management','tasks'],
  ['Mevzuat','documents','mevzuat'],['Akademik Takvim','academic','calendar'],['Tebliğ-Tebellüğ İmza Sirküsü','documents','teblig'],['Puantaj & İmza Sirküsü','management','puantaj'],['Dilekçe & İzinler','management','dilekce'],['Devamsızlık Çizelgesi','tools','attendance'],
  ['Okul Bilgileri','settings','school'],['Veriler','settings','data'],['Kullanıcı İşlemleri','settings','users'],['Kullanıcı İstatistikleri','settings','statistics']
];
for(const [label,route,page] of directPages) assert(ui.includes(`['${label}'`)&&ui.includes(`'${route}','${page}'`),`Doğrudan menü hedefi eksik/yanlış: ${label} -> ${route}/${page}`);
for(const page of ['form-maarif','form-belirli','form-sok','form-rehberlik','form-bep','form-zumre','form-kulup']) assert(ui.includes(`'${page}'`),`Ayrı doküman form sayfası eksik: ${page}`);
assert(ui.includes("global.StudentPages?.open?.")&&ui.includes("global.EvrakTakipPage.open(root)")&&ui.includes("global.LegislationModule.mount(root)")&&ui.includes("global.KaDataPage.open()"),'Özel menü hedefleri gerçek mevcut API’lere bağlanmalı.');
assert(ui.includes('const CUSTOM_PAGE_ROUTES=new Map()')&&ui.includes('function registerPageRoute(page,handler)'),'ShellUI özel sayfalar için merkezi route registry sağlamalı.');
assert(ui.includes("registerPageRoute('data',async()=>{global.SettingsModule?.unmount?.();")&&ui.includes('return global.KaDataPage.open()'),'Veriler ShellUI registry üzerinden doğrudan açılmalı.');
assert(ui.includes('function init(){installBuiltInPageRoutes();'),'Yerleşik özel sayfa registry başlangıçta kurulmalı.');
assert(!ui.includes("if(name==='settings'&&page==='data'"),'Veriler normal Settings modülü yüklendikten sonra applySubpage ile yeniden yönlendirilmemeli.');
const customPos=ui.indexOf('const custom=page&&CUSTOM_PAGE_ROUTES.get(page)'),loadPos=ui.indexOf('await global.AppLoader?.load?.(name)');assert(customPos>=0&&loadPos>customPos,'Özel sayfa route’u normal modül yüklemesinden önce çözülmeli.');
assert(!ui.includes('Optik Okuma (OMR)')&&!ui.includes("key:'optik'"),'Optik okuyucu yeni Menü mimarisine dönmemeli.');
assert(dashboard.includes('function adminShell()')&&dashboard.includes('function teacherShell()'),'Admin ve öğretmen ana sayfası ayrı renderer kullanmalı.');
assert(dashboard.includes('data-dashboard-role="${isAdmin()?\'admin\':\'teacher\'}"'),'Dashboard rolü DOM sözleşmesinde görünür olmalı.');
for(const feature of ['pollSection()','absencesSection()','lessonsSection()','quickSection()','calendarSection()']) assert(dashboard.includes(feature),`Dashboard bölümü eksik: ${feature}`);
assert(ui.includes("function normalizeDashboardLayout(){return !!$('.ka-home[data-dashboard-role]')}"),'Shell dashboard sırasını yeniden düzenlememeli; rol rendererına bırakmalı.');
assert(ui.includes('syncVisibilityClasses')&&ui.includes("['girisEkrani','onayBekleniyorEkrani','app']"),'Login/onay/app görünürlüğü merkezi ka-hidden sınıfına aynalanmalı.');
assert(ui.includes("classList.toggle('ka-hidden',el.hidden)"),'Hidden ekranlar CSS tarafından tekrar görünür hale gelememeli.');
assert(ui.includes('NotlarService?.notKaydet?.(null'),'Hızlı Not kalıcı yazımı merkezi NotlarService üzerinden yapılmalı.');
assert(communication.includes("notEkle:v=>device().add('notlar',COL.notlar")&&communication.includes('notKaydet(id,v)'),'NotlarService/Repository kalıcı yazımı DeviceData üzerinden local-first yapmalı.');
assert(!ui.includes('db.collection('),'Shell UI doğrudan Firestore kullanmamalı.');
const uiLocalStorage=[...ui.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(([^)]*)\)/g)].map(m=>m[1]);
assert(uiLocalStorage.length>0&&uiLocalStorage.every(x=>x.includes("'ka-theme'")||x.includes('"ka-theme"')),'ShellUI localStorage kullanımı yalnız ka-theme ilk-boyama aynasıyla sınırlı olmalı; iş verisi IndexedDB’de kalmalı.');

assert(live.includes("AppStore?.data?.(t)"),'Canlı durum AppStore verisini okumalı.');
assert(live.includes("SyncEngine.register('dersSaatleri',global.COL.dersSaatleri)"),'Ders saatleri mevcut gerçek koleksiyonla SyncEngine üzerinden bağlanmalı.');
assert(live.includes("SyncEngine.localHydrate(['dersSaatleri'])"),'Zil sayacı önce cihazdaki ders saatlerini hydrate etmeli.');
assert(live.includes('api.open-meteo.com'),'Hava durumu doğrulanmış Open-Meteo kaynağını kullanmalı.');
assert(live.includes("KorukLocalFirst.meta(uid,'weatherSnapshot'"),'Hava durumu kısa süreli IndexedDB meta cache kullanmalı.');
assert(!live.includes('db.collection('),'Canlı durum UI doğrudan Firestore kullanmamalı.');
assert(!live.includes('localStorage.setItem('),'Canlı durum localStorage kalıcı depo yapmamalı.');
assert(!live.includes('suankiDersDurumu(')&&!live.includes('sonHavaVerisi'),'Legacy zil/hava global bağımlılıkları V2 runtimea dönmemeli.');
for(const mode of ["type:'lesson'","'lunch':'break'", "mode:'after'", "mode:'weekend'"]) assert(live.includes(mode),`Canlı zil durum sözleşmesi eksik: ${mode}`);
assert(sw.includes('./js/modules/school-live-status.js'),'Canlı durum offline PWA shell içinde önbelleğe alınmalı.');

for(const selector of ['.ka-bottom-nav','.ka-bottom-menu-icon','.ka-menu-layer','.ka-menu-grid','.ka-profile-page','.ka-search-page','.ka-quick-note','.ka-home-live','.ka-live-weather']) assert(design.includes(selector),`Merkezi design system selectorü eksik: ${selector}`);
for(const group of ['people','exams','programs','communication','calendar','transport','documents','management','settings']) assert(design.includes(`[data-ka-menu-group="${group}"]`),`Klasik Menü renk rolü eksik: ${group}`);
assert(/grid-template-columns\s*:\s*repeat\(5\s*,\s*minmax\(0\s*,\s*1fr\)\)/.test(design),'Alt navigasyon beş eşit bölümlü olmalı.');
assert(/grid-template-columns\s*:\s*repeat\(2\s*,\s*minmax\(0\s*,\s*1fr\)\)/.test(design),'Menü/profil mobil kartları iki sütun sözleşmesini taşımalı.');
console.log('Classic UX + tam IndexedDB yedek/restore + merkezi routing + rol bazlı V2 dashboard + canlı okul durumu + tema-only bootstrap sözleşmesi başarılı.');

assert(design.includes('html:not(.ka-auth-resolved) #girisEkrani'),'Mevcut Firebase oturumu çözülmeden giriş ekranı boyanmamalı.');
assert(dashboard.includes('window.SchoolLiveStatus?.status?.()')&&dashboard.includes('refreshHeroLive'),'Dashboard zil kartı ikinci sayaç motoru kurmadan canonical SchoolLiveStatus kullanmalı.');

assert(shell.includes('js/auth.js'),'Auth runtime production shell içinde bulunmalı.');
const authSrc=fs.readFileSync('js/auth.js','utf8');
assert(authSrc.includes("KorukLocalFirst.meta(uid,'authSession'")&&authSrc.includes('authSessionCacheOku(user.uid)'),'Aktif kullanıcı/rol snapshotı IndexedDB meta üzerinden local-first restore edilmeli.');
assert(authSrc.includes('authOturumuUygula(user,cached.user,cached.role,{cached:true})'),'Firebase Auth UID doğrulandıktan sonra cihazdaki oturum Firestore beklenmeden uygulanmalı.');
assert(authSrc.includes('await authSunucuOturumuGetir(user,cached)'),'Firestore kullanıcı/rol kontrolü local restore sonrasında arka plan tazelemesi olarak sürmeli.');
assert(!authSrc.includes("if(typeof uygulamaBaslat==='function')uygulamaBaslat()"),'Auth eski global dashboard başlangıcını çağırmamalı; tek başlangıç sahibi AppLoader olmalı.');
assert(authSrc.includes("'Bu cihazda çevrimdışı oturum verisi bulunmuyor. İlk açılış için internet bağlantısı gerekir.'"),'İlk kez açılan cihaz çevrimdışıysa sahte oturum üretmemeli.');

assert(live.includes("new CustomEvent('koruk:school-live-tick'")&&dashboard.includes("window.addEventListener('koruk:school-live-tick',liveTickHandler)"),'Canlı zil için tek saniyelik zaman motoru SchoolLiveStatus olmalı; dashboard yalnız tick eventini tüketmeli.');
assert(!dashboard.includes('trialTimer=setInterval(()=>{refreshTrialTimers();refreshHeroLive()},1000)'),'Dashboard ikinci bir zil intervali çalıştırmamalı.');

assert(dashboard.includes('renderFrame=0')&&dashboard.includes('cancelAnimationFrame(renderFrame)'),'Dashboard render kuyruğu unmount sırasında temizlenmeli.');

assert(dashboard.includes("SyncEngine.localHydrate(types)")&&dashboard.includes("okulBilgileri:'okulBilgileri'"),'Dashboard ek verileri Firestore beklemeden IndexedDB üzerinden hydrate etmeli.');

const appLoaderSource=fs.readFileSync('js/app-loader.js','utf8');
assert(appLoaderSource.includes('Promise.all([Promise.resolve(AppBootstrap?.start?.()),prepareAccountLocalData(user)])'),'İlk modül core ve hesap IndexedDB hydrate tamamlanmadan açılmamalı.');
const bootstrapWaitPos=appLoaderSource.indexOf('Promise.all([Promise.resolve(AppBootstrap?.start?.()),prepareAccountLocalData(user)])'),initialModulePos=appLoaderSource.indexOf('ensureInitialModule()',bootstrapWaitPos);
assert(bootstrapWaitPos>=0&&initialModulePos>bootstrapWaitPos,'Local bootstrap dashboard açılışından önce tamamlanmalı.');
assert(appLoaderSource.includes("sessionBootstrapUid='',sessionBootstrapPromise=null")&&appLoaderSource.includes('if(sessionBootstrapUid===user.uid&&sessionBootstrapPromise){permissionRefresh();return true}'),'Aynı UID için auth görünürlük ve başlangıç köprüsü tek local bootstrap promise kullanmalı.');
