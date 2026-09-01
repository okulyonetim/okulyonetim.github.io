const fs=require('fs');
const assert=require('assert');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
const dash=fs.readFileSync('js/modules/dashboard.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const settings=fs.readFileSync('js/modules/settings.js','utf8');
const liveStatus=fs.readFileSync('js/modules/school-live-status.js','utf8');
new Function(shell);new Function(dash);new Function(settings);new Function(liveStatus);
for(const pair of ["announcements:{module:'communication',page:'announcements'","polls:{module:'communication',page:'polls'","news:{module:'communication',page:'news'","duty:{module:'management',page:'duty'","absences:{module:'management',page:'leaves'","lessons:{module:'academic',page:'schedule'","'week-duty':{module:'management',page:'duty'","exams:{module:'academic',page:'written'","notes:{module:'communication',page:'notes'","calendar:{module:'communication',page:'calendar'"]){
  assert(shell.includes(pair),`Dashboard kartının gerçek alt sayfa rotası eksik: ${pair}`);
}
assert(shell.includes("closest('[data-home-section]')"),'Dashboard kart gövdesi tıklanabilir olmalı.');
assert(shell.includes("routeModule(target.module,{bottom:'menu',page:target.page||'',title:target.title||''})"),'Dashboard kartı yalnız modüle değil gerçek alt sayfaya gitmeli.');
assert(!shell.includes("const hero=e.target.closest('.ka-home-hero');if(hero){routeModule('academic'"),'Karşılama kartı alakasız Academic sayfasına yönlendirmemeli.');
assert(!shell.includes("stats:{module:"),'Okul Özeti gerçek hedefi olmadığı için rastgele sayfa açmamalı.');
assert(dash.includes('id=\"khBell\"')&&dash.includes('data-dash-route=\"settings\" data-dash-page=\"lesson-hours\" data-dash-title=\"Ders Saatleri\"'),'Hero canlı zil kartı doğrudan Ders Saatleri ayarına gitmeli.');
assert(dash.includes('class=\"kh-more\" data-dash-route=\"communication\" data-dash-page=\"calendar\" data-dash-title=\"Takvim\"'),'Takvim referanstaki ay başlığı düğmesinden doğrudan Takvim alt sayfasına gitmeli.');
assert(dash.includes("function routeButton(label,module,page='',title='',icon='→')"),'Dashboard footer helper alt sayfa ve başlığı taşımalı.');
assert(css.includes('padding-left:max(12px,var(--ka-safe-left))')&&css.includes('padding-right:max(12px,var(--ka-safe-right))')&&css.includes('gap:20px!important'),'Mobil ana sayfa kartları kenarlardan güvenli boşluk ve kartlar arasında belirgin dikey mesafe bırakmalı.');
assert(css.includes('.ka-home-hero,.ka-home-section{width:100%'),'Ana sayfa kartları tam kullanılabilir genişlikte olmalı.');
assert(dash.includes('data-home-section'),'Dashboard kartları rota kimliği üretmeli.');
assert(dash.includes("function teacherShell(){return`${cardVisible('welcome')?hero():''}${statsSection()}${announcementSection()}${pollSection()}${trialCounterSection()}"),'Öğretmen ana sayfası referans sırasıyla okul özeti, duyuru, anket ve aktif deneme sayacını göstermeli.');
assert(dash.includes("function adminShell(){return`${cardVisible('welcome')?hero():''}${announcementSection()}${pollSection()}${trialCounterSection()}"),'Yönetici ana sayfası aktif anketlerden sonra deneme sayacını göstermeli.');
assert(dash.includes("arr('denemeSinavlari')")&&dash.includes('trialStartMs')&&dash.includes("status:'scheduled'")&&dash.includes('sayacDurumu?.aktif'),'Dashboard deneme sayacı kayıtlı tarih/saatten otomatik çalışmalı ve legacy manuel sayaçla uyumlu kalmalı.');
assert(dash.includes("function trialCounterSection(){const list=trialLiveRows().slice(0,1)")&&dash.includes(".filter(x=>x.state.run&&x.state.remaining>0)"),'Dashboard deneme kartı yalnız zaman aralığı gerçekten aktifken görünmeli.');
assert(dash.includes('data-dash-page=\"trial\"')&&dash.includes('Deneme Sınavları'),'Dashboard deneme kartı doğrudan Academic trial sayfasına gitmeli.');
assert(dash.includes('trialTimer=setInterval(()=>refreshTrialTimers(),1000)')&&dash.includes("window.addEventListener('koruk:school-live-tick',liveTickHandler)"),'Deneme sayacı kendi presentation intervalinde kalmalı; zil kartı SchoolLiveStatus tek zaman motorunun tick eventini dinlemeli.');
assert(dash.includes("if(!mine.length)return''"),'Öğretmenin nöbet kartı yalnız gerçek nöbeti varsa görünmeli.');
assert(dash.includes('<span>Bugünkü Nöbetim</span>')&&dash.includes('class=\"kh-duty-check\"'),'Öğretmenin kendi nöbeti referans kart ve defter işaretleme davranışıyla ayrı odak olmalı.');
assert(dash.includes("section('Okul Özeti'")&&dash.includes('ka-school-summary-section'),'Okul Özeti referans kart grubu olarak üretilmeli.');
assert(dash.includes('>Not Ekle</b>')&&dash.includes('>Duyurular</b>')&&dash.includes('data-dash-page=\"announcements\"'),'Öğretmen hızlı işlemleri referanstaki dört doğrudan aksiyonu ve kesin Duyurular rotasını taşımalı.');
assert(css.includes('LEGACY DUTY CARDS — REFERENCE PORT')&&css.includes('.ka-home .kh-duty-check'),'Öğretmen nöbet görsel sözleşmesi legacy geometriyle merkezi design-system içinde olmalı.');
assert(dash.includes("collectReminders(30).filter(x=>x.kaynak!=='sinav')"),'Yazılılar öğretmen görev/takvim kartında ikinci kez gösterilmemeli.');
assert(dash.includes("title=teacherMode?'Bugünkü Derslerim':'Şu An Kim Nerede?'")&&dash.includes('data-home-section=\"lessons\"')&&dash.includes('data-dash-page=\"schedule\"'),'Öğretmen günlük ders kartı Bugünkü Derslerim kalmalı; admin aynı canonical kartta Şu An Kim Nerede bağlamını görmeli.');
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
assert(dash.includes("{module:'people',page:'teachers',title:'Öğretmenler'}")&&dash.includes("{module:'people',page:'students',title:'Öğrenciler'}")&&dash.includes("{module:'people',page:'classes',title:'Sınıflar'}")&&dash.includes("{module:'transport',page:'services',title:'Servisler'}"),'Okul Özeti dört metriği doğrudan gerçek alt sayfalarına bağlamalı.');
assert(dash.includes("function dashboardHoliday()")&&dash.includes("live.mode==='holiday'")&&dash.includes('holidayCardBody')&&dash.includes('Haftanın Nöbet Programı'),'Tatil modunda ders ve nöbet kartları aynı SchoolLiveStatus tatil durumunu göstermeli.');
assert(dash.includes('function stabilizeNewsTicker')&&dash.includes("news.classList.add('is-ready')")&&dash.includes('document.fonts?.ready')&&css.includes('.kh-news.is-ready .kh-news-track')&&!css.includes('.kh-news-track{display:flex;align-items:center;gap:0;width:max-content;animation:khTicker'),'Kayan haberler font/layout ölçülmeden animasyona başlamamalı; ölçülmüş tam loop mesafesiyle kesintisiz akmalı.');
assert(dash.includes('kh-wave')&&css.includes('@keyframes khWave')&&css.includes('khWeatherFloat'),'Karşılama eli ve hava durumu merkezi design-system animasyonlarını kullanmalı.');
assert(dash.includes("orb=isLesson?'book':isLunch?'utensils':isBreak?'coffee':'bell'")&&dash.includes('kh-icon-${esc(orb)}')&&dash.includes('kh-icon-sun')&&dash.includes("specialBell('weekend'")&&css.includes('@keyframes khBellSwing')&&css.includes('.kh-icon-home svg'),'Zil/ders/teneffüs/hafta sonu/tatil ikonları durum bazlı animasyon sınıfları taşımalı.');
console.log('Dashboard kart bağlantıları, öğretmen referansı ve merkezi tema smoke testi başarılı.');

assert(shell.includes("[data-dash-route],[data-dash-lesson-plan],[data-dash-reminder-index],[data-dash-external],[data-dash-quick-note]"),'Shell dashboard içi özel aksiyonları üst kart yönlendirmesine taşımamalı.');
assert(dash.includes("addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();const ok=await window.ShellUI?.routeModule"),'Dashboard özel rota tıklaması üst karta yayılmamalı.');
assert(dash.includes("addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();const ok=await window.ShellUI?.routeModule?.('academic'"),'Yıllık plan ders satırı tıklaması üst kart rota handlerına yayılmamalı.');
assert(dash.includes('data-dash-route=\"academic\" data-dash-page=\"schedule\" data-dash-title=\"Ders Programı\"'),'Yönetici ders satırı doğrudan Ders Programı alt sayfasına gitmeli.');
// Checkpoint: nested dashboard actions must never bubble into parent card routing.

assert(shell.includes("'today-duty':{module:'management',page:'duty',title:'Nöbet Programı'}"),'Bugünün Nöbetçileri kartı doğrudan Nöbet Programı sayfasına gitmeli.');
assert(dash.includes("mine?'<span class=\"kh-chip green\">SİZ</span>'")&&dash.includes('is-me'),'Bugünün Nöbetçileri kartında oturumdaki öğretmen açıkça işaretlenmeli.');
assert(css.includes('TEACHER DASHBOARD DAILY PRIORITY')&&css.includes('.ka-home-row.is-me'),'Öğretmen günlük öncelik görseli merkezi design-system içinde kalmalı.');
// Checkpoint: teacher daily-priority dashboard package.

assert(dash.includes('function schoolGender(v)')&&dash.includes('function genderOf(x)')&&dash.includes('x?.cinsiyeti')&&dash.includes('x?.gender'),'Okul Özeti öğretmen/öğrenci cinsiyetini eski ve yeni gerçek alan adlarından normalize etmeli.');
assert(dash.includes("function schoolClassLevel")&&dash.includes("level>=1&&level<=4?'primary':level>=5&&level<=8?'secondary'"),'Okul Özeti İlkokul/Ortaokul ayrımını gerçek sınıf seviyesinden üretmeli.');
assert(dash.includes("teachers=arr('ogretmenler'),students=arr('veliler'),classes=arr('siniflar'),services=arr('servisler')"),'Okul Özeti toplam ve dağılım değerlerini aynı local-first snapshot üzerinden üretmeli.');
assert(css.includes('DASHBOARD SCHOOL SUMMARY REFERENCE')&&css.includes('.ka-school-summary-grid')&&css.includes('.ka-school-stage'),'Okul Özeti referans 2x2 kart görünümü merkezi design-system içinde kalmalı.');
assert(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))')&&css.includes('.ka-school-summary-card.is-student'),'Okul Özeti mobilde referanstaki iki sütunlu kompakt kart düzenini korumalı.');
// Checkpoint: school summary matches the compact reference layout.

assert(dash.includes("personal=collectReminders(6).filter(x=>x.gunFarki>=0&&x.gunFarki<=6)")&&dash.includes("personal.filter(x=>x.gunFarki===i).length"),'Öğretmen Takvim kartı yalnız kişisel reminder motorunun 7 günlük sonuçlarını saymalı.');
assert(!dash.includes("arr('hatirlaticilar').filter(x=>String(x.tarih||'').slice(0,10)===iso"),'Öğretmen Takvim kartı okul-geneli hatırlatıcıları doğrudan saymamalı.');
// Checkpoint: teacher calendar counts are personal and share the canonical reminder engine.

assert(dash.includes("function liveCardView")&&dash.includes("live.mode==='lesson'")&&dash.includes("big='Teneffüs'")&&dash.includes("liveClock(live.remaining)"),'Karşılama zil kartı canonical SchoolLiveStatus durumunu canlı geri sayımla göstermeli.');
assert(dash.includes('function bellModel')&&dash.includes('class=\"ka-tabs\"')&&dash.includes('ka-tab kh-bell-node')&&dash.includes("current?'current active'"),'Gün içi akış tek yatay kaydırılabilir satır olmalı ve aktif segment merkezi pulse sınıfını taşımalı.');
assert(!dash.includes('OKUL BAŞLAMADI')&&!dash.includes('Dersler başlamadı'),'Canlı zil kartı okul başlamadı metnini üretmemeli.');
assert(liveStatus.includes('countdownLead=60*60')&&liveStatus.includes("mode:'idle'")&&liveStatus.includes('sec<first.start-countdownLead'),'Zil geri sayımı ilk dersten yalnızca 1 saat önce aktifleşmeli.');
assert(liveStatus.includes('Array.isArray(s.dersler)'),'Canlı zil motoru mevcut dersSaatleri.dersler verisini de okumalı.');
assert(dash.includes("live.mode==='after'")&&dash.includes("big='Dersler tamamlandı'")&&dash.includes("live.mode==='weekend'")&&dash.includes("big='Hafta sonu'"),'Karşılama kartı ders bitince geçmiş ilk dersi tekrar göstermemeli.');
// Checkpoint: teacher hero shares the canonical SchoolLiveStatus lesson context.

assert(dash.includes('class="kh-news"')&&dash.includes('class="kh-news-label"')&&dash.includes('class="kh-news-track"')&&dash.includes('--kh-ticker-time'),'Haberler eski dashboard-home.js kayan bant DOM sözleşmesini korumalı.');
assert(css.includes('.ka-home .kh-news-viewport{overflow:hidden;white-space:nowrap;min-width:0;padding-inline:12px')&&css.includes('mask-image:linear-gradient(to right,transparent 0,#000 12px'),'Haber şeridi etikete yapışmamalı ve kırpılan başlık kenarda yumuşatılmalı.');
assert(dash.includes('function socialIconHtml')&&dash.includes('/instagram/.test(key)')&&dash.includes('/youtube/.test(key)')&&dash.includes('socialIconHtml(x.ikon,x.etiket)'),'Sosyal bağlantı ikon anahtarları ekranda metin olarak basılmamalı; merkezi SVG ikonlara çevrilmeli.');
assert(css.includes('.ka-home .kh-social-icon>svg{width:24px;height:24px;display:block}'),'Sosyal kart SVG ikonları sabit ve taşmayan geometri kullanmalı.');
assert(!dash.includes('ka-home-news-ticker'),'Yeni taklit haber bileşeni aktif renderer içinde kalmamalı.');
assert(dash.includes('class="kh-section"')&&dash.includes('class="kh-weekday ')&&dash.includes('class="kh-weekday-head"')&&dash.includes('class="kh-mini"'),'Haftalık nöbet eski kh-section/kh-weekday DOM sözleşmesini korumalı.');
assert(dash.includes('function isDutyChief')&&dash.includes('function sortDuties')&&dash.includes('function dutyPlaceHtml'),'Haftalık nöbet eski sıralama, amir filtreleme ve yer sunum davranışlarını taşımalı.');
assert(!dash.includes('ka-week-duty-day'),'Yeni taklit haftalık nöbet bileşeni aktif renderer içinde kalmamalı.');
assert(css.includes('LEGACY DASHBOARD SURFACES — CENTRAL THEME')&&css.includes('.ka-home .kh-news')&&css.includes('.ka-home .kh-weekday'),'Legacy dashboard geometrisi merkezi design-system içinde yaşamalı.');
assert(css.includes('.ka-home .kh-news{')&&css.includes('background:var(--ka-card-bg)')&&css.includes('color:var(--ka-text)')&&css.includes('background:var(--ka-primary-soft)'),'Legacy yüzeylerin renkleri merkezi --ka-* tema tokenlarından gelmeli.');
assert(shell.includes("popoverBase(anchor,226)")&&shell.includes("p.classList.add('ka-profile-popover','ka-profile-popover--compact')"),'Header profil popupı tüm roller için kompakt 226px bildirim kartı boyutunda açılmalı.');
assert(shell.includes('ka-profile-popover__identity')&&css.includes('.ka-profile-popover--compact .ka-profile-popover__identity'),'Profil popup görünümü merkezi design-system sınıflarıyla yönetilmeli.');
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

assert(dash.includes('class="kh-hero"')&&dash.includes('id="khBell"')&&dash.includes('id="khWeather"'),'Dashboard karşılama alanı referans hero + canlı zil + hava kartı DOM sözleşmesini kullanmalı.');
assert(dash.includes('id=\"khBell\"')&&dash.includes('data-dash-route=\"settings\" data-dash-page=\"lesson-hours\" data-dash-title=\"Ders Saatleri\"'),'Hero canlı kartı canonical SchoolLiveStatus üzerinden doğrudan Ders Saatleri ayarına gitmeli.');
assert(!dash.includes('class="ka-home-hero"'),'Eski geçici ka-home-hero renderer geri dönmemeli.');
assert(css.includes('LEGACY DASHBOARD HERO — REFERENCE PORT')&&css.includes('.ka-home .kh-live-card'),'Hero referans geometrisi merkezi design-system içinde kalmalı.');

assert(dash.includes('class=\"ka-tabs\"')&&dash.includes('ka-tab kh-bell-node')&&dash.includes('GÜN İÇİ AKIŞ')&&!dash.includes('class=\"kh-bell-times\"')&&!dash.includes('class=\"kh-bell-progress\"'),'Canlı zil kartı kompakt olmalı; gün içi akış tek yatay kaydırılabilir satırda kalmalı.');
assert(dash.includes('function weatherModel()')&&dash.includes('data-dash-weather')&&dash.includes('SchoolLiveStatus?.openWeather?.()'),'Ana sayfadaki ayrı hava kartı canonical SchoolLiveStatus detayına bağlanmalı.');
assert(css.includes('VISIBLE HOME PARITY')&&css.includes('#khBell.kh-bell-modern')&&css.includes('.ka-home .kh-weather-card'),'Canlı zil ve hava kartı tasarımı tek merkezi CSS sahibinde olmalı.');

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

assert(dash.includes("function adminShell(){return`${cardVisible('welcome')?hero():''}${announcementSection()}${pollSection()}${trialCounterSection()}${newsSection()}${statsSection()}${socialSection()}${dutySection()}"),'Yönetici ana sayfası referanstaki Okul Özeti sonrası sosyal medya/okul siteleri kartını taşımalı.');
assert(dash.includes("links=Array.isArray(school.sosyalLinkler)?school.sosyalLinkler.filter(x=>x?.url):[];if(!links.length)return''"),'Sosyal medya/okul siteleri kartı gerçek okulBilgileri.sosyalLinkler verisi yoksa hiç render edilmemeli.');

assert(dash.includes('data-dash-live-status')&&dash.includes("window.addEventListener('koruk:school-live-tick',liveTickHandler)")&&dash.includes('trialTimer=setInterval(()=>refreshTrialTimers(),1000)'),'Zil kartı SchoolLiveStatus tek zaman motorunun tick eventini dinlemeli; deneme sayacı intervali ayrı yalnız kendi sayacını güncellemeli.');
assert(dash.includes('data-news-signature')&&dash.includes('freshNews.replaceWith(oldNews)')&&dash.includes('class=\"kh-news-loop\"'),'Kayan haber DOMu aynı veriyle yeniden yaratılmamalı ve kesintisiz çift şerit kullanmalı.');

assert(dash.includes('function queueRender(){if(!mounted)return;if(scrolling){pendingRender=true;return}')&&dash.includes('AppStore?.subscribe?.(p,queueRender)')&&dash.includes('scrollIdleTimer=setTimeout'),'Dashboard AppStore değişikliklerini tek frame içinde birleştirmeli ve kullanıcı kaydırırken tam DOM renderını ertelemeli.');
assert(dash.includes("'data.okulBilgileri'")&&!dash.includes("'data.personelIzinler'"),'Dashboard sosyal bağlantıları okulBilgileri değişimini dinlemeli; hizmetli/işçi izinleri ana sayfa render aboneliğine dönmemeli.');

assert(dash.includes("okulBilgileri:'okulBilgileri'")&&dash.includes("yillikPlanTanimlari:'yillikPlanTanimlari'")&&dash.includes("ogretmenYillikPlanSecimleri:'ogretmenYillikPlanSecimleri'"),'Dashboard sosyal bağlantılar ve öğretmen yıllık plan odağı için gereken verileri ilk açılışta local hydrate etmeli.');
assert(!dash.includes("personelIzinler:'personelIzinler'"),'Hizmetli/işçi izinleri dashboard local hydrate ve render akışına dönmemeli.');

assert(dash.includes("if(mounted&&root.querySelector('[data-dashboard-module]'))return mountPromise||Promise.resolve(true)"),'Dashboard aynı module-ready/load zincirinde ikinci kez mount edilmemeli.');
assert(dash.includes('if(mountPromise)return mountPromise'),'Dashboard eşzamanlı mount çağrılarını tek promise altında birleştirmeli.');

assert(dash.includes('kh-holiday-days')&&dash.includes('kh-holiday-progress')&&dash.includes('holidayProgress'),'Tatil zil kartı büyük kalan gün sayısı ve ilerleme çubuğu göstermeli.');
assert(dash.includes('function liveRenderKey(live)')&&dash.includes('key!==lastLiveRenderKey')&&dash.includes('queueRender();return'),'Canlı okul modu değiştiğinde yalnız zil değil ders/nöbet tatil kartları da yeniden render edilmeli.');
assert(css.includes('touch-action:manipulation')&&dash.includes('data-dash-route="${esc(routeInfo.module)}"'),'Okul Özeti kartları mobil dokunma yüzeyi ve canonical route verisi taşımalı.');
assert(dash.includes('readerDetails=isAdmin()')&&dash.includes('kh-home-readers'),'Admin ana sayfa duyurusunda okuyan adları ve zaman damgası doğrudan görülebilmeli.');
