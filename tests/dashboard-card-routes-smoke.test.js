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
assert(css.includes('padding-left:max(4px,var(--ka-safe-left))'),'Mobil ana içerik kenar boşluğu 4px/safe-area olmalı.');
assert(css.includes('.ka-home-hero,.ka-home-section{width:100%'),'Ana sayfa kartları tam kullanılabilir genişlikte olmalı.');
assert(dash.includes('data-home-section'),'Dashboard kartları rota kimliği üretmeli.');
assert(dash.includes("function teacherShell(){return`${cardVisible('welcome')?hero():''}${statsSection()}${announcementSection()}${pollSection()}${trialCounterSection()}"),'Öğretmen ana sayfası referans sırasıyla okul özeti, duyuru, anket ve aktif deneme sayacını göstermeli.');
assert(dash.includes("function adminShell(){return`${cardVisible('welcome')?hero():''}${announcementSection()}${pollSection()}${trialCounterSection()}"),'Yönetici ana sayfası aktif anketlerden sonra deneme sayacını göstermeli.');
assert(dash.includes("arr('denemeSinavlari')")&&dash.includes('sayacDurumu?.aktif')&&dash.includes('baslatmaTarihi'),'Dashboard deneme sayacı gerçek denemeSinavlari.sayacDurumu modelini kullanmalı.');
assert(dash.includes("function trialCounterSection(){const list=arr('denemeSinavlari').filter(x=>x?.sayacDurumu?.aktif===true)"),'Dashboard deneme kartı yalnız başlatılmış gerçek sayaç için görünmeli.');
assert(dash.includes('data-dash-page=\"trial\"')&&dash.includes('Deneme Sınavları'),'Dashboard deneme kartı doğrudan Academic trial sayfasına gitmeli.');
assert(dash.includes('trialTimer=setInterval(()=>refreshTrialTimers(),1000)')&&dash.includes("window.addEventListener('koruk:school-live-tick',liveTickHandler)"),'Deneme sayacı kendi presentation intervalinde kalmalı; zil kartı SchoolLiveStatus tek zaman motorunun tick eventini dinlemeli.');
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
assert(css.includes('[data-theme=\"dark\"]')&&css.includes('--ka-primary:#53d6a4')&&css.includes('.ka-theme-picker'),'Tek Design System zümrüt koyu temayı ve merkezi görünüm bile�qgenini taşımalı.');
console.log('Dashboard kart bağlantıları, öğretmen referansı ve merkezi tema smoke testi başarılı.');

assert(shell.includes("[data-dash-route],[data-dash-lesson-plan],[data-dash-reminder-index],[data-dash-external],[data-dash-quick-note]"),'Shell dashboard içi özel aksiyonları üst kart yönlendirmesine taşımamalı.');
assert(dash.includes("addEventListener('click',e=>{e.preventDefault();e.stopPropagation();return window.ShellUI?.routeModule"),'Dashboard özel rota tıklaması üst karta yayılmamalı.');
assert(dash.includes("addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();const ok=await window.ShellUI?.routeModule?.('academic'"),'Yıllık plan ders satırı tıklaması üst kart rota handlerına yayılmamalı.');
assert(dash.includes('data-dash-route=\"academic\" data-dash-page=\"schedule\" data-dash-title=\"Ders Programı\"'),'Yönetici ders satırı doğrudan Ders Programı alt sayfasına gitmeli.');
// Checkpoint: nested dashboard actions must never bubble into parent card routing.

assert(shell.includes("'today-duty':{module:'management',page:'duty',title:'Nöbet Programı'}"),'Bugünün Nöbetçileri kartı doğrudan Nöbet Programı sayfasına gitmeli.');
assert(dash.includes("mine?'<span class=\"kh-chip green\">SİZ</span>'")&&dash.includes('is-me'),'Bugünün Nöbetçileri kartında oturumdakı öğretmen açıkça isaretlenmeli.');
assert(css.includes('TEACHER DASHBOARD DAILY PRIORITY')&&css.includes('.ka-home-row.is-me'),'Öğretmen günlük öncelik görseli merkezi design-system iiݧinde kalmalı.');
// Checkpoint: teacher daily-priority dashboard package.

assert(dash.includes("x.cinsiyet==='Kadın'")&&dash.includes("x.cinsiyet==='Erkek'")&&dash.includes("x.cinsiyet==='Kız'"),'Okul Özeti gerçek öğretmen/öğrenci cinsiyet dağılımını mevcut veri modelinden üretmeli.');
assert(dash.includes("function schoolClassLevel")&&dash.includes("level>=1&&level<=4?'primary':level>=5&&level<=8?'secondary'"),'Okul Özeti ılkorokul/Ortaokul ayrımını gerçek sınıf seviyesinden üretmeli.');
assert(dash.includes("teachers=arr('ogretmenler');students=arr('veliler');classes=arr('siniflar');services=arr('servisler')"),'Okul Özeti toplam ve doğılım değerlerini aynı local-first snapshot üzerinden üretmeli.');
assert(css.includes('DASHBOARD SCHOOL SUMMARY REFERENCE')&&css.includes('.ka-school-summary-grid')&&css.includes('.ka-school-stage'),'Okul Özeti referans 2x2 kart görünümü merkezi design-system içinde kalmalı.');
assert(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))')&&css.includes('.ka-school-summary-card.is-student'),'Okul Özeti mobilde referanstaki iki sütunlu kompakt kart düzenini korumalı.');
// Checkpoint: school summary matches the compact reference layout.

assert(dash.includes("personal=collectReminders(6).filter(x=>x.gunFarki>=0&&x.gunFarki<=6)")&&dash.includes("personal.filter(x=>x.gunFark?ı===i).length"),'Öğretmen Takvim kartı yalnız kişisel reminder motorunun 7 günlük sonuçlarını saymalı.');
assert(!dash.includes("arr('hatir