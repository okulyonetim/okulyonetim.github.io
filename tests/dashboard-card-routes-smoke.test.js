const fs=require('fs');
const assert=require('assert');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
const dash=fs.readFileSync('js/modules/dashboard.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const settings=fs.readFileSync('js/modules/settings.js','utf8');
new Function(shell);new Function(dash);new Function(settings);
for(const pair of ["announcements:{module:'communication',page:'announcements'","polls:{module:'communication',page:'polls'","news:{module:'communication',page:'news'","duty:{module:'management',page:'duty'","absences:{module:'management',page:'leaves'","lessons:{module:'academic',page:'schedule'","'week-duty':{module:'management',page:'duty'","exams:{module:'academic',page:'written'","notes:{module:'communication',page:'notes'","calendar:{module:'communication',page:'calendar'"]){
  assert(shell.includes(pair),`Dashboard kartının gerçek alt sayfa rotası eksik: ${pair}`);
}
assert(shell.includes("closest('[data-home-section]')"),'Dashboard kart gövdesi tıklanabilir olmalı.');
assert(shell.includes("routeModule(target.module,{bottom:'menu',page:target.page||'',title:target.title||''})"),'Dashboard kartı yalnız modüle değil gerçek alt sayfaya gitmeli.');
assert(!shell.includes("const hero=e.target.closest('.ka-home-hero');if(hero){routeModule('academic'"),'Karşılama kartı alakasız Academic sayfasına yönlendirmemeli.');
assert(!shell.includes("stats:{module:"),'Okul Özeti gerçek hedefi olmadığı için rastgele sayfa açmamalı.');
assert(dash.includes('class=\"kh-live-card\" data-dash-route=\"academic\" data-dash-page=\"schedule\" data-dash-title=\"Ders Programı\"'),'Hero canlı kartı doğrudan Ders Programı alt sayfasına gitmeli.');
assert(dash.includes('class=\"kh-more\" data-dash-route=\"communication\" data-dash-page=\"calendar\" data-dash-title=\"Takvim\"'),'Takvim referanstaki ay başlığı düğmesinden doğrudan Takvim alt sayfasına gitmeli.');
assert(dash.includes("function routeButton(label,module,page='',title='',icon='→')"),'Dashboard footer helper alt sayfa ve başlığı taşımalı.');
assert(css.includes('padding-left:max(4px,var(--ka-safe-left))'),'Mobil ana içerik kenar boşluğu 4px/safe-area olmalı.');
assert(css.includes('.ka-home-hero,.ka-home-section{width:100%'),'Ana sayfa kartları tam kullanılabilir genişlikte olmalı.');
assert(dash.includes('data-home-section'),'Dashboard kartları rota kimliği üretmeli.');
assert(dash.includes("function teacherShell(){return`${cardVisible('welcome')?hero():''}${statsSection()}${announcementSection()}${pollSection()}${trialCounterSection()}"),'Öğretmen ana sayfası referans sırasıyla okul özeti, duyuru, anket ve aktif deneme sayacını göstermeli.');
assert(dash.includes("function adminShell(){return`${cardVisible('welcome')?hero():''}${announcementSection()}${pollSection()}${trialCounterSection()}"),'Yönetici ana sayfası aktif anketlerden sonra deneme sayacını göstermeli.');
assert(dash.includes("arr('denemeSinavlari')")&&dash.includes('sayacDurumu?.aktif')&&dash.includes('baslatmaTarihi'),'Dashboard deneme sayacı gerçek denemeSinavlari.sayacDurumu modelini kullanmalı.');
assert(dash.includes("function trialCounterSection(){const list=arr('denemeSinavlari').filter(x=>x?.sayacDurumu?.aktif===true)"),'Dashboard deneme kartı yalnız başlatılmış gerçek sayaç için görünmeli.');
assert(dash.includes('data-dash-page=\"trial\"')&&dash.includes('Deneme Sınavları'),'Dashboard deneme kartı doğrudan Academic trial sayfasına gitmeli.');
assert(dash.includes('trialTimer=setInterval(()=>refreshTrialTimers(),1000)'),'Aktif deneme sayacı ana sayfada canlı güncellenmeli.');
assert(dash.includes("if(!mine.length)return''"),'Öğretmenin nöbet kartı yalnız gerçek nöbeti varsa görünmeli.');
assert(dash.includes('<span>Bugünkü Nöbetim</span>')&&dash.includes('class=\"kh-duty-check\"'),'Öğretmenin kendi nöbeti referans kart ve defter işaretleme davranışıyla ayrı odak olmalı.');
assert(dash.includes("section('Okul Özeti'")&&dash.includes('ka-school-summary-section'),'Okul Özeti referans kart grubu olarak üretilmeli.');
assert(dash.includes('>Not Ekle</b>')&&dash.includes('>Duyurular</b>')&&dash.includes('data-dash-page=\"announcements\"'),'Öğretmen hızlı işlemleri referanstaki dört doğrudan aksiyonu ve kesin Duyurular rotasını taşımalı.');
assert(css.includes('LEGACY DUTY CARDS — REFERENCE PORT')&&css.includes('.ka-home .kh-duty-check'),'Öğretmen nöbet görsel sözleşmesi legacy geometriyle merkezi design-system içinde olmalı.');
assert(dash.includes("collectReminders(30).filter(x=>x.kaynak!=='sinav')"),'Yazılılar öğretmen görev/takvim kartında ikinci kez gösterilmemeli.');
assert(dash.includes("title=teacherMode?'Bugünkü Derslerim':'Şu Anki Dersler'")&&dash.includes('data-home-section=\"lessons\"')&&dash.includes('data-dash-page=\"schedule\"'),'Öğretmenin günlük ders kartı referanstaki Bugünkü Derslerim başlığıyla haftalık programa bağlanmalı.');
assert(dash.includes("teacherMode?'Yaklaşan Yazılı Sınavlar':'Yaklaşan Sınavlar'")&&dash.includes('class=\"kh-exam-date\"')&&dash.includes('data-dash-page=\"written\"'),'Öğretmenin yaklaşan yazılıları referans tarih gruplarıyla ayrı ve doğrudan yazılı sayfasına bağlı olmalı.');
assert(!dash.includes("${lessonsSection()}${personalScheduleSection()}"),'Öğretmen ana sayfasında ikinci Ders Programım kartı üretilmemeli.');
assert(css.includes('LEGACY TODAY LESSONS — REFERENCE PORT')&&css.includes('.kh-section[data-home-section="lessons"] .kh-row.is-now'),'Öğretmen ders kartı referans legacy geometriyle merkezi design-system içinde kalmalı.');
assert(dash.includes("${lessonsSection()}${dutySection()}${examsSection()}${upcomingSection()}${quickSection()}${calendarSection()}${notesSection()}${allTodayDutySection()}${weekDutySection()}${socialSection()}`}"),'Öğretmen ana sayfasında günlük ders, nöbet, yazılı ve görev akışı genel bilgi kartlarından önce gelmeli.');
assert(dash.includes("live=window.SchoolLiveStatus?.status?.()")&&dash.includes('<span class=\"kh-chip green\">ŞİMDİ</span>')&&dash.includes('<span class=\"kh-chip\">SIRADAKİ</span>'),'Öğretmen ders programı mevcut zil/ders durumundan referans Şimdi-Sıradaki bağlamını üretmeli.');
assert(dash.includes("function announcementSection(){if(!cardVisible('announcements'))return'';")&&dash.includes("if(!d)return'';"),'Duyuru yoksa boş duyuru kartı gösterilmemeli.');
assert(html.includes("localStorage.getItem('ka-theme')")&&html.includes("setAttribute('data-theme',t)"),'İlk boyamada merkezi açık/koyu tema uygulanmalı.');
assert(shell.includes("setAttribute('data-theme',next)")&&shell.includes("KorukLocalFirst.meta(uid,'theme',next)"),'Shell tek merkezi tema sözleşmesini ve mevcut local-first tercihi kullanmalı.');
assert(settings.includes("['appearance','Görünüm','Açık ve koyu tema']")&&settings.includes("ShellUI?.applyTheme?.(b.dataset.themeChoice)"),'Ayarlar merkezi görünüm seçicisini ikinci tema motoru açmadan kullanmalı.');
assert(css.includes('[data-theme="dark"]')&&css.includes('--ka-primary:#53d6a4')&&css.includes('.ka-theme-picker'),'Tek Design System zümrüt koyu temayı ve merkezi görünüm bileşenini taşımalı.');
console.log('Dashboard kart bağlantıları, öğretmen referansı ve merkezi tema smoke testi başarılı.');

assert(shell.includes("[data-dash-route],[data-dash-lesson-plan],[data-dash-reminder-index],[data-dash-external],[data-dash-quick-note]"),'Shell dashboard içi özel aksiyonları üst kart yönlendirmesine taşımamalı.');
assert(dash.includes("addEventListener('click',e=>{e.preventDefault();e.stopPropagation();return window.ShellUI?.routeModule"),'Dashboard özel rota tıklaması üst karta yayılmamalı.');
assert(dash.includes("addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();const ok=await window.ShellUI?.routeModule?.('academic'"),'Yıllık plan ders satırı tıklaması üst kart rota handlerına yayılmamalı.');
assert(dash.includes('data-dash-route=\"academic\" data-dash-page=\"schedule\" data-dash-title=\"Ders Programı\"'),'Yönetici ders satırı doğrudan Ders Programı alt sayfasına gitmeli.');
// Checkpoint: nested dashboard actions must never bubble into parent card routing.

assert(shell.includes("'today-duty':{module:'management',page:'duty',title:'Nöbet Programı'}"),'Bugünün Nöbetçileri kartı doğrudan Nöbet Programı sayfasına gitmeli.');
assert(dash.includes("mine?'<span class=\"kh-chip green\">SİZ</span>'")&&dash.includes('is-me'),'Bugünün Nöbetçileri kartında oturumdaki öğretmen açıkça işaretlenmeli.');
assert(css.includes('TEACHER DASHBOARD DAILY PRIORITY')&&css.includes('.ka-home-row.is-me'),'Öğretmen günlük öncelik görseli merkezi design-system içinde kalmalı.');
// Checkpoint: teacher daily-priority dashboard package.

assert(dash.includes("x.cinsiyet==='Kadın'")&&dash.includes("x.cinsiyet==='Erkek'")&&dash.includes("x.cinsiyet==='Kız'"),'Okul Özeti gerçek öğretmen/öğrenci cinsiyet dağılımını mevcut veri modelinden üretmeli.');
assert(dash.includes("function schoolClassLevel")&&dash.includes("level>=1&&level<=4?'primary':level>=5&&level<=8?'secondary'"),'Okul Özeti İlkokul/Ortaokul ayrımını gerçek sınıf seviyesinden üretmeli.');
assert(dash.includes("teachers=arr('ogretmenler'),students=arr('veliler'),classes=arr('siniflar'),services=arr('servisler')"),'Okul Özeti toplam ve dağılım değerlerini aynı local-first snapshot üzerinden üretmeli.');
assert(css.includes('DASHBOARD SCHOOL SUMMARY REFERENCE')&&css.includes('.ka-school-summary-grid')&&css.includes('.ka-school-stage'),'Okul Özeti referans 2x2 kart görünümü merkezi design-system içinde kalmalı.');
assert(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))')&&css.includes('.ka-school-summary-card.is-student'),'Okul Özeti mobilde referanstaki iki sütunlu kompakt kart düzenini korumalı.');
// Checkpoint: school summary matches the compact reference layout.

assert(dash.includes("personal=collectReminders(6).filter(x=>x.gunFarki>=0&&x.gunFarki<=6)")&&dash.includes("personal.filter(x=>x.gunFarki===i).length"),'Öğretmen Takvim kartı yalnız kişisel reminder motorunun 7 günlük sonuçlarını saymalı.');
assert(!dash.includes("arr('hatirlaticilar').filter(x=>String(x.tarih||'').slice(0,10)===iso"),'Öğretmen Takvim kartı okul-geneli hatırlatıcıları doğrudan saymamalı.');
// Checkpoint: teacher calendar counts are personal and share the canonical reminder engine.

assert(dash.includes("live.mode==='lesson'")&&dash.includes("live.nextPeriod")&&dash.includes("big=`Sonraki · ${live.nextPeriod}. Ders`"),'Öğretmen karşılama kartı canlı ders durumunu Şimdi/Sıradaki bağlamına çevirmeli.');
assert(dash.includes("live.mode==='after'")&&dash.includes("big='Dersler tamamlandı'")&&dash.includes("live.mode==='weekend'")&&dash.includes("big='Hafta sonu'"),'Karşılama kartı ders bitince geçmiş ilk dersi tekrar göstermemeli.');
// Checkpoint: teacher hero shares the canonical SchoolLiveStatus lesson context.

assert(dash.includes('class="kh-news"')&&dash.includes('class="kh-news-label"')&&dash.includes('class="kh-news-track"')&&dash.includes('--kh-ticker-time'),'Haberler eski dashboard-home.js kayan bant DOM sözleşmesini korumalı.');
assert(!dash.includes('ka-home-news-ticker'),'Yeni taklit haber bileşeni aktif renderer içinde kalmamalı.');
assert(dash.includes('class="kh-section"')&&dash.includes('class="kh-weekday ')&&dash.includes('class="kh-weekday-head"')&&dash.includes('class="kh-mini"'),'Haftalık nöbet eski kh-section/kh-weekday DOM sözleşmesini korumalı.');
assert(dash.includes('function isDutyChief')&&dash.includes('function sortDuties')&&dash.includes('function dutyPlaceHtml'),'Haftalık nöbet eski sıralama, amir filtreleme ve yer sunum davranışlarını taşımalı.');
assert(!dash.includes('ka-week-duty-day'),'Yeni taklit haftalık nöbet bileşeni aktif renderer içinde kalmamalı.');
assert(css.includes('LEGACY DASHBOARD SURFACES — CENTRAL THEME')&&css.includes('.ka-home .kh-news')&&css.includes('.ka-home .kh-weekday'),'Legacy dashboard geometrisi merkezi design-system içinde yaşamalı.');
assert(css.includes('.ka-home .kh-news{')&&css.includes('background:var(--ka-card-bg)')&&css.includes('color:var(--ka-text)')&&css.includes('background:var(--ka-primary-soft)'),'Legacy yüzeylerin renkleri merkezi --ka-* tema tokenlarından gelmeli.');
assert(shell.includes("const {name,username,photo}=profileInfo(),p=popoverBase(anchor,360)")&&shell.includes("dark?'Açık Temaya Geç':'Koyu Temaya Geç'")&&shell.includes('ka-profile-popover-legacy'),'Profil popup geçmişteki gerçek header hesap popover sözleşmesini kullanmalı.');
assert(!shell.includes('ka-profile-popover__identity'),'Ekran görüntüsünden yeniden üretilen profil popup DOMu kaldırılmalı.');
// Checkpoint: legacy news, weekly duty and profile surfaces are ported onto central themes.
// Final regression checkpoint: legacy dashboard surfaces + centralized light/dark theme.

assert(dash.includes("teacherMode=!isAdmin()&&!!tid")&&dash.includes("kh-mini${mine?' is-me':''}")&&dash.includes("x.ogretmenId===tid"),'Haftalık nöbet programı öğretmenin kendi satırını mevcut öğretmen bağlantısından vurgulamalı.');
assert(css.includes('TEACHER WEEKLY DUTY SELF HIGHLIGHT')&&css.includes('.ka-home .kh-mini.is-me'),'Öğretmenin haftalık nöbet vurgusu merkezi design-system içinde kalmalı.');
// Checkpoint: weekly duty keeps the legacy layout while highlighting the signed-in teacher.


// LEGACY ANNOUNCEMENT CARD CHECKPOINT
assert(dash.includes('class="kh-announcement ${ok?\'is-read\':\'is-unread\'}"'),'Dashboard duyurusu referans kh-announcement DOM sözleşmesini kullanmalı.');
assert(dash.includes("DuyurularService?.benOkudumMu?.(d)")&&dash.includes('data-dash-announcement-read'),'Duyuru kartı mevcut local-first okundu servisini kullanmalı.');
assert(dash.includes("DuyurularService?.okunduIsaretle?.(box.dataset.dashAnnouncementRead)"),'Dashboard Okudum işlemi mevcut DuyurularService üzerinden yazmalı.');
assert(css.includes('LEGACY DASHBOARD ANNOUNCEMENT — CENTRAL THEME')&&css.includes('.ka-home .kh-announcement-head')&&css.includes('.ka-home .kh-read-check'),'Legacy duyuru geometrisi merkezi design-system içinde kalmalı.');
assert(css.includes('background:var(--ka-primary-soft)')&&css.includes('color:var(--ka-primary)')&&css.includes('border:1px solid var(--ka-border)'),'Legacy duyuru renkleri merkezi --ka-* tokenlarından gelmeli.');
assert(!dash.includes('ka-home-announcement__mark'),'Eski duyuru geri taşındığında yeni taklit duyuru satırı aktif renderer içinde kalmamalı.');

assert(dash.includes('class="kh-quick"')&&dash.includes('data-home-section="quick"'),'Hızlı İşlemler referans kh-quick DOM sözleşmesini kullanmalı.');
assert(!dash.includes('class="ka-home-quick"'),'Yeni taklit ka-home-quick renderer içinde kalmamalı.');
assert(css.includes('LEGACY QUICK ACTIONS — REFERENCE PORT')&&css.includes('.ka-home .kh-quick button{'),'Hızlı İşlemler legacy geometrisi merkezi design-system içinde kalmalı.');
assert(css.includes('background:var(--ka-card-bg)')&&css.includes('color:var(--ka-text)')&&css.includes('var(--ka-primary-soft)'),'Hızlı İşlemler renkleri merkezi --ka-* tema tokenlarından gelmeli.');
// Checkpoint: legacy quick actions visual port.

assert(dash.includes('class="kh-social"')&&dash.includes('data-home-section="social"'),'Sosyal bağlantılar referans kh-social DOM sözleşmesini kullanmalı.');
assert(!dash.includes('class="ka-home-social"'),'Yeni taklit ka-home-social renderer içinde kalmamalı.');
assert(css.includes('LEGACY SOCIAL CARDS — REFERENCE PORT')&&css.includes('.ka-home .kh-social button{'),'Sosyal kart legacy geometrisi merkezi design-system içinde kalmalı.');
assert(!css.includes('.ka-home .kh-quick button:nth-child(1) svg{color:var(--ka-danger)}'),'Sınav Ekle genel aksiyonu danger kırmızısı kullanmamalı.');
// Checkpoint: legacy social cards visual port.

assert(dash.includes('function calendarLessons(d)')&&dash.includes('class="kh-calendar"')&&dash.includes('class="kh-day '),'Takvim referans Pazartesi-Pazar kh-calendar/kh-day DOM sözleşmesini kullanmalı.');
assert(dash.includes('data-dash-calendar-day')&&dash.includes('data-dash-calendar-reminder'),'Takvim gün seçimi ve kişisel gündem tıklaması etkileşimli kalmalı.');
assert(dash.includes("personal=collectReminders(6).filter(x=>x.gunFarki>=0&&x.gunFarki<=6)")&&dash.includes("personal.filter(x=>x.gunFarki===i).length"),'Takvim kişisel 7 günlük reminder motorunu korumalı.');
assert(!dash.includes('class="ka-home-calendar"'),'Yeni taklit ka-home-calendar renderer içinde kalmamalı.');
assert(css.includes('LEGACY INTERACTIVE CALENDAR — REFERENCE PORT')&&css.includes('.ka-home .kh-calendar{'),'Takvim legacy geometrisi merkezi design-system içinde kalmalı.');
// Checkpoint: legacy interactive calendar port.

assert(dash.includes('data-home-section="notes"')&&dash.includes('class="kh-card"')&&dash.includes('class="kh-row" data-dash-route="communication" data-dash-page="notes"'),'Notlarım referans kh-section/kh-card/kh-row sözleşmesini kullanmalı.');
assert(!dash.includes('class="ka-home-note"'),'Yeni taklit ka-home-note renderer içinde kalmamalı.');
assert(dash.includes("arr('notlar').filter(x=>u.admin||!x.sahipUid||x.sahipUid===u.uid)"),'Notlarım local-first sahiplik filtresini korumalı.');
assert(css.includes('LEGACY NOTES CARD — REFERENCE PORT')&&css.includes('.ka-home .kh-section[data-home-section="notes"] .kh-row{'),'Notlarım legacy geometrisi merkezi design-system içinde kalmalı.');
// Checkpoint: legacy notes card visual port.

assert(dash.includes('data-home-section="exams"')&&dash.includes('class="kh-exam-date"')&&dash.includes('class="kh-row" data-dash-route="academic" data-dash-page="written"'),'Sınavlar referans kh-exam-date/kh-row DOM sözleşmesini kullanmalı.');
assert(!dash.includes('ka-home-exam-row'),'Yeni taklit ka-home-exam-row renderer içinde kalmamalı.');
assert(dash.includes("filter(x=>!teacherMode||x.ogretmenId===tid)"),'Öğretmen yazılıları gerçek ogretmenId bağlantısıyla filtrelenmeli.');
assert(dash.includes("collectReminders(6).filter(x=>x.gunFarki>=0&&x.gunFarki<=6)[Number(btn.dataset.dashCalendarReminder)]"),'Takvim gündem tıklaması görünen kişisel reminder listesiyle aynı indeks uzayını kullanmalı.');
assert(css.includes('LEGACY EXAMS CARD — REFERENCE PORT')&&css.includes('.ka-home .kh-exam-date{'),'Sınav legacy geometrisi merkezi design-system içinde kalmalı.');
// Checkpoint: legacy exams visual port + calendar reminder index alignment.

assert(dash.includes('<span>Yaklaşan Etkinlik / Görevler</span>')&&dash.includes('<span>Teslim & Görev Takvimi</span>'),'Yönetici ve öğretmen yaklaşan görev başlıkları referans/kişisel sözleşmeyi korumalı.');
assert(dash.includes('data-home-section="upcoming"')&&dash.includes('class="kh-side'),'Yaklaşan görevler referans kh-card/kh-row/kh-side DOM ailesini kullanmalı.');
assert(dash.includes("teacherUpcomingRows(){return collectReminders(30).filter(x=>x.kaynak!='sinav')")||dash.includes("teacherUpcomingRows(){return collectReminders(30).filter(x=>x.kaynak!=='sinav')"),'Öğretmen görevleri canonical collectReminders motorundan gelmeli.');
assert(css.includes('LEGACY UPCOMING TASKS — REFERENCE PORT')&&css.includes('.kh-section[data-home-section="upcoming"] .kh-side'),'Yaklaşan görev legacy geometrisi merkezi design-system içinde kalmalı.');
// Checkpoint: legacy upcoming tasks / teacher delivery calendar port.

assert(dash.includes('class="kh-row${now?')&&dash.includes('data-dash-lesson-plan'),'Bugünkü Derslerim satırları referans kh-row yapısını ve yıllık plan aksiyonunu korumalı.');
assert(!dash.includes('ka-home-lessons--teacher'),'Eski yeni-taklit ders liste sınıfı aktif renderer içinde kalmamalı.');
// Checkpoint: legacy today lessons port using canonical SchoolLiveStatus.

assert(dash.includes('function teacherFocusSection()')&&dash.includes('data-home-section="lesson-focus"'),'Öğretmen referans Şu Anki/Sonraki Dersim odak kartını taşımalı.');
assert(dash.includes("live=window.SchoolLiveStatus?.status?.()")&&dash.includes("mode==='now'?'Şu Anki Dersim':'Sonraki Dersim'"),'Ders odak kartı ikinci sayaç yerine canonical SchoolLiveStatus kullanmalı.');
assert(dash.includes("arr('yillikPlanTanimlari')")&&dash.includes('function teacherLessonOutcomes'),'Ders odak kartı haftalık kazanımları gerçek yıllık plan snapshotından okumalı.');
assert(dash.includes('data-dash-lesson-plan')&&dash.includes('Yıllık Planı Aç ›'),'Ders odak kartı mevcut Academic yıllık plan açma davranışına bağlanmalı.');
assert(css.includes('LEGACY TEACHER LESSON FOCUS — REFERENCE PORT')&&css.includes('.ka-home .kh-focus'),'Ders odak kartı legacy geometrisini merkezi design-system içinde kullanmalı.');

assert(dash.includes('class="kh-hero"')&&dash.includes('class="kh-live-card"'),'Dashboard karşılama alanı referans kh-hero/kh-live-card DOM sözleşmesini kullanmalı.');
assert(dash.includes("window.SchoolLiveStatus?.status?.()")&&dash.includes("data-dash-page=\"schedule\""),'Hero canlı kartı ikinci sayaç yerine canonical SchoolLiveStatus ve merkezi Ders Programı rotasını kullanmalı.');
assert(!dash.includes('class="ka-home-hero"'),'Eski geçici ka-home-hero renderer geri dönmemeli.');
assert(css.includes('LEGACY DASHBOARD HERO — REFERENCE PORT')&&css.includes('.ka-home .kh-live-card'),'Hero referans geometrisi merkezi design-system içinde kalmalı.');

assert(dash.includes('data-dash-backtop')&&dash.includes("window.scrollY>520")&&dash.includes("window.scrollTo({top:0,behavior:'smooth'})"),'Referans yukarı dön düğmesi 520px sonrasında görünmeli ve sayfa başına dönmeli.');
assert(css.includes('LEGACY DASHBOARD BACKTOP — REFERENCE PORT')&&css.includes('.kh-backtop.is-visible'),'Yukarı dön görünümü merkezi design-system içinde kalmalı.');

assert(dash.includes('data-home-section="polls"')&&dash.includes('class="kh-dyn-item"')&&dash.includes('>ANKET</span>'),'Aktif Anketler referans kh-dynamic/kh-dyn-item yüzeyini kullanmalı.');
assert(dash.includes('data-home-section="trial-counter"')&&dash.includes('data-dash-trial-timer')&&dash.includes('data-dash-page="trial"'),'Aktif deneme/sayaç referans dinamik kart geometrisini ve gerçek sayaç davranışını korumalı.');
assert(!dash.includes("section('Aktif Anketler','📊','polls'")&&!dash.includes("section('Deneme / Sayaç','⏱️','trial-counter'"),'Geçici section tabanlı anket/deneme rendererları geri dönmemeli.');
assert(css.includes('LEGACY DASHBOARD DYNAMIC ITEMS — REFERENCE PORT')&&css.includes('.ka-home .kh-dyn-item'),'Dinamik kart görünümü merkezi design-system içinde kalmalı.');

assert(dash.includes('data-home-section="absences"')&&dash.includes('<span class="kh-chip amber">İZİNLİ</span>'),'İzinli personel kartı referans kh-section/kh-row/amber chip yüzeyini kullanmalı.');
assert(dash.includes("active=arr('ogretmenIzinleri').filter")&&!dash.includes("active=[...arr('personelIzinler'),...arr('ogretmenIzinleri')].filter")&&dash.includes('data-dash-page="leaves"'),'Ana sayfa izin kartı yalnız öğretmen izinlerini kullanmalı; hizmetli/işçi izinlerini göstermemeli.');
assert(css.includes('LEGACY ABSENCES CARD — REFERENCE PORT')&&css.includes('.ka-home .kh-chip.amber'),'İzinli vurgu rengi merkezi warning tokenından gelmeli.');

assert(dash.includes("function announcementSection(){")&&dash.includes("if(!d)return'';"),'Duyuru yoksa duyuru kartı hiç render edilmemeli.');
assert(dash.includes("function pollSection(){")&&dash.includes("if(!list.length)return'';const chart="),'Aktif anket yoksa anket kartı hiç render edilmemeli.');
assert(dash.includes("function trialCounterSection(){")&&dash.includes("if(!list.length)return'';const exam="),'Aktif deneme sınavı sayacı yoksa sayaç kartı hiç render edilmemeli.');
assert(dash.includes("function absencesSection(){if(!isAdmin())return'';")&&dash.includes("active=arr('ogretmenIzinleri').filter")&&dash.includes("if(!active.length)return'';"),'Bugün izinli öğretmen yoksa izin kartı hiç render edilmemeli.');

assert(dash.includes("active=arr('ogretmenIzinleri').filter")&&dash.includes("if(!active.length)return''")&&dash.includes('<span>Bugün İzinli Öğretmenler</span>'),'Ana sayfa izin kartı yalnız aktif öğretmen izni varsa görünmeli.');
assert(!dash.includes("active=[...arr('personelIzinler'),...arr('ogretmenIzinleri')]"),'Personel izinleri ana sayfa öğretmen izin kartına karışmamalı.');
