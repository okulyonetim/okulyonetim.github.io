const fs=require('fs');
const assert=require('assert');
const academic=fs.readFileSync('js/modules/academic.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const build=fs.readFileSync('scripts/build-client-bundles.mjs','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');

assert(!academic.includes('data-academic-tab'),'Academic modülü iç sekme üretmemeli.');
assert(academic.includes("function openPage(page,title='')"),'AcademicModule doğrudan sayfa açma API sözleşmesi sağlamalı.');
for(const page of ['schedule','written','trial','results','plans','calendar'])assert(academic.includes(`'${page}'`),`Academic ayrı sayfa hedefi eksik: ${page}`);
assert(academic.includes('denemeSayacBaslat')&&academic.includes('denemeSayacDurdur')&&academic.includes('timerState'),'Deneme sınavı sayaç davranışı korunmalı.');
for(const token of ['ka-trial-page','ka-trial-summary','Toplam deneme','Aktif sayaç','trialSort','trialSchedule','trialCounterState','data-trial-open','ka-trial-card__live','ka-trial-modal-intro','ka-trial-class-picker','openTrialCounter','renderTrialCounter','kaTrialCounterOverlay','ka-trial-counter__ring','ka-trial-counter__schedule','ka-trial-counter__follow']) assert(academic.includes(token),`Deneme Sınavları görünür paritesi eksik: ${token}`);
for(const token of ['.ka-trial-page','.ka-trial-card','.ka-trial-summary','.ka-trial-modal','.ka-trial-counter','.ka-trial-counter__ring','.ka-trial-counter__row','.ka-trial-counter__follow']) assert(css.includes(token),`Deneme Sınavları merkezi CSS yüzeyi eksik: ${token}`);
assert(!fs.existsSync('js/modules/deneme-sinavlari-modern.js'),'Deneme Sınavları ayrı modern runtime dosyasına geri bölünmemeli.');
assert(!fs.existsSync('js/modules/deneme-sayac-modern-v4.js'),'Deneme sayacı ayrı modern runtime dosyasına geri bölünmemeli.');
for(const token of ['examDayDiff','ka-written-page','ka-written-summary','Toplam sınav','7 gün içinde','ka-written-card','ka-written-meta','ka-written-modal-intro','ka-written-class-picker']) assert(academic.includes(token),`Yazılı Sınavlar görünür paritesi eksik: ${token}`);
assert(academic.includes("ready=false")&&academic.includes("if(!mounted||!ready)return")&&academic.includes("await prepareLocal();if(!mounted)return false;subscribe();ready=true;render();"),'Academic ilk boyamada önce local hydrate etmeli ve tek hazır render üretmeli.');
assert(!academic.includes('ka-written-hero')&&!academic.includes('ka-trial-hero'),'Yazılı/Deneme kendi ikinci hero başlığını üretmemeli; ortak Academic başlığı tek görsel owner olmalı.');
assert(academic.includes('data-academic-title')&&academic.includes('data-academic-description')&&academic.includes('applyAcademicMeta(title)'),'Academic ayrı sayfa başlığı ortak tek shell owner üzerinden yönetilmeli.');

for(const token of ['planCurrentWeekIndex','planTracked','ogretmenYillikPlanSecimleri','yillikPlanNotlari','data-plan-select','data-plan-note','data-plan-prev','data-plan-next']) assert(academic.includes(token),`Yıllık Plan gerçek haftalık takip sözleşmesi eksik: ${token}`);
for(const token of ['data-plan-week-overlay','ka-plan-week--overlay','data-plan-wake','data-plan-menu','bindPlanWeekGestures','openPlanMenu','openPlanWeekPicker','openPlanWeekEditor','openPlanSignDate','navigator.wakeLock','touchstart','touchend','data-plan-full']) assert(academic.includes(token),`Yıllık Plan tam ekran haftalık görünür paritesi eksik: ${token}`);
assert(!fs.existsSync('js/modules/yillik-plan.js'),'Yıllık Plan ayrı runtime JS dosyasına geri bölünmemeli.');
for(const token of ['data-plan-headings','data-plan-new','data-plan-edit','openPlanHeadings','openPlanDefinition','openPlanRows','openPlanRowEditor','baslikEkle','baslikSil','tanimEkle','tanimGuncelle','tanimSil']) assert(academic.includes(token),`Yıllık Plan yönetim sözleşmesi eksik: ${token}`);
for(const token of ['data-plan-word','openPlanWordImport','ensurePlanWordReader','mammoth.browser.min.js','data-plan-import-match','printAnnualPlan','ReportEngine.printReport']) assert(academic.includes(token),`Yıllık Plan Word/çıktı sözleşmesi eksik: ${token}`);
assert(academic.includes('AppLoader?.loadScript?.'),'Word parser uygulama açılışında değil merkezi lazy loader ile yüklenmeli.');
assert(academic.includes("PermissionService?.can?.('academic.plans','edit')")&&academic.includes("PermissionService?.can?.('academic.plans','read')"),'Yıllık Plan merkezi PermissionService kullanmalı.');
assert(academic.includes("title==='Deneme Sonuçları'")&&academic.includes("title==='Test Sonuçları'"),'Deneme ve Test Sonuçları ayrı filtrelenmiş sayfa davranışını korumalı.');
for(const token of ['ka-results-page','ka-results-summary','ssResultCard','ssResultDetail','data-ss-open','data-ss-back','ka-results-detail__actions','ka-results-table','ka-results-modal','ka-results-entry-grid']) assert(academic.includes(token),`Sınav Sonuçları görünür paritesi eksik: ${token}`);
for(const token of ['.ka-results-page','.ka-results-card','.ka-results-summary','.ka-results-detail','.ka-results-table','.ka-results-modal','.ka-results-entry-row']) assert(css.includes(token),`Sınav Sonuçları merkezi CSS yüzeyi eksik: ${token}`);
assert(!fs.existsSync('js/modules/sinav-sonuclari.js'),'Sınav Sonuçları ayrı legacy runtime dosyasına geri bölünmemeli.');
assert(shell.includes("name==='academic'&&['schedule','written','trial','results','plans','calendar'].includes(page)"),'Shell Academic sayfalarını doğrudan route etmelidir.');
assert(shell.includes('AcademicModule?.openPage?.(page,title)'),'Shell Academic sayfasını tab click ile değil openPage API ile açmalıdır.');
assert(!shell.includes('[data-academic-tab='),'Shell Academic tab selector kullanmamalı.');
assert(academic.includes('async function openPlanForLesson'),'AcademicModule ders ve sınıftan yıllık plan açma API si sağlamalı.');
assert(academic.includes('planClassLevel')&&academic.includes('planLessonKey')&&academic.includes('planCurrentWeekIndex'),'Ders-sınıf yıllık plan eşleşmesi sınıf seviyesi, ders adı ve mevcut hafta üzerinden yapılmalı.');
assert(academic.includes('new Set(planSelection()?.planIdler||[])'),'Takip edilen yıllık plan eşleşmede öncelikli olmalı.');

// Akademik Takvim: tam poster çalışma alanı doğrudan canonical AcademicModule içinde yaşamalı.
assert(!fs.existsSync('js/modules/academic-calendar-parity.js'),'Akademik Takvim ayrı parity dosyası olarak geri dönmemeli.');
for(const token of ['kaAcademicCalendarOverlay','AkademikTakvimService.gorselYukle','data-academic-calendar-file','data-academic-calendar-progress','touchstart','touchmove','dblclick','Math.min(6','zoom=2.2','caches.open','ACADEMIC_CALENDAR_CACHE','openAcademicCalendar','closeAcademicCalendar']) assert(academic.includes(token),`Akademik Takvim canonical çalışma alanı sözleşmesi eksik: ${token}`);
assert(academic.includes("page==='calendar'"),'Akademik Takvim yalnız academic/calendar sayfasında otomatik açılmalı.');
assert(academic.includes('calendarAdmin()'),'Takvim görseli değiştirme yönetici sınırında kalmalı.');
for(const forbidden of ['db.collection','firebase.firestore','localStorage.setItem'])assert(!academic.includes(forbidden),`Academic UI doğrudan legacy veri erişimi yapmamalı: ${forbidden}`);
assert(loader.includes("define('academic',[FIREBASE_STORAGE_SDK,'js/modules/report-engine.js','js/modules/academic.js'])"),'Academic loader yalnız Storage SDK + ReportEngine + canonical Academic yüklemeli.');
assert(!loader.includes('academic-calendar-parity.js'),'Academic loader ayrı takvim parity dosyası yüklememeli.');
assert(loader.includes("name==='academic'||name==='communication'||name==='documents'"),'Academic açıldığında Firebase Storage örneği merkezi loader tarafından hazırlanmalı.');
assert(build.includes("'academic.js':['js/modules/academic.js']"),'Academic üretim bundle tek canonical kaynak kullanmalı.');
assert(!build.includes('academic-calendar-parity.js'),'Academic bundle üretimi parity kaynağına bağımlı olmamalı.');

console.log('Ders-sınıf yıllık plan doğrudan açma sözleşmesi başarılı.');
console.log('Akademik Takvim tam ekran poster + admin yükleme + çevrimdışı Cache Storage paritesi başarılı.');
console.log('Academic ayrı sayfa + deneme sayacı + sonuç filtreleme sözleşmesi başarılı.');
