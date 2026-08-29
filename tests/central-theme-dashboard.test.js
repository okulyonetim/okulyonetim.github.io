const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const settings=fs.readFileSync('js/modules/settings.js','utf8');
const dashboard=fs.readFileSync('js/modules/dashboard.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');

new Function(shell);
new Function(settings);
new Function(dashboard);

assert(html.includes("localStorage.getItem('ka-theme')"),'İlk boyamada merkezi tema tercihi okunmalı.');
assert(html.includes("document.documentElement.setAttribute('data-theme',t)"),'İlk boyama açık/koyu tema attribute sözleşmesini uygulamalı.');
assert(shell.includes("document.documentElement.setAttribute('data-theme',next)"),'Shell açık ve koyu temayı aynı merkezi attribute üzerinden uygulamalı.');
assert(shell.includes("localStorage.setItem('ka-theme',next)"),'İlk boyama için tema tercihi hafif bootstrap aynasına yazılmalı.');
assert(shell.includes("KorukLocalFirst.meta(uid,'theme',next)"),'Kullanıcı tema tercihi mevcut local-first meta altyapısında kalmalı.');
assert(settings.includes("['appearance','Görünüm','Açık ve koyu tema']"),'Ayarlar ekranında merkezi Görünüm sayfası bulunmalı.');
assert(settings.includes("ShellUI?.applyTheme?.(b.dataset.themeChoice)"),'Ayarlar ikinci tema motoru açmadan ShellUI merkezi tema API sini kullanmalı.');
assert(css.includes('[data-theme="dark"]'),'Tek Design System koyu tema tokenlarını içermeli.');
assert(css.includes('--ka-primary:#53d6a4'),'Koyu tema okul kimliğine uygun zümrüt ana vurgu kullanmalı.');
assert(css.includes('.ka-theme-picker'),'Tema seçici ayrı CSS dosyası değil merkezi Design System içinde olmalı.');
assert(css.includes('.ka-home-social'),'Öğretmen dashboard sosyal bağlantıları merkezi Design System tarafından stillenmeli.');

assert(dashboard.includes("function announcementSection(){if(!cardVisible('announcements'))return''")&&dashboard.includes("if(!d)return'';"),'Duyuru yoksa dashboard boş duyuru kartı üretmemeli.');
assert(dashboard.includes("function trialCounterSection(){const list=arr('denemeSinavlari').filter(x=>x?.sayacDurumu?.aktif===true)"),'Deneme kartı yalnız gerçek sayaç aktifken görünmeli.');
assert(!dashboard.includes("sayacDurumu?.aktif===true||String(x?.tarih||'').slice(0,10)===today"),'Bugünün denemesi sayaç başlatılmadan dashboardda gösterilmemeli.');
assert(dashboard.includes("function teacherShell(){return`${cardVisible('welcome')?hero():''}${statsSection()}${announcementSection()}${pollSection()}${trialCounterSection()}"),'Öğretmen ana sayfası onaylanan rol sırasını kullanmalı.');
assert(dashboard.includes("function socialSection(){const school=arr('okulBilgileri')")&&dashboard.includes('sosyalLinkler'),'Sosyal medya kartları gerçek okulBilgileri.sosyalLinkler modelinden gelmeli.');
assert(dashboard.includes("function allTodayDutySection(){if(isAdmin())return''"),'Öğretmen ana sayfası okulun bugünkü nöbetçilerini ayrıca gösterebilmeli.');
assert(dashboard.includes('function weekDutySection(){const[a,b]=weekRange()'),'Haftalık nöbet programı öğretmen ana sayfasında da kullanılabilir olmalı.');

console.log('Merkezi açık/koyu tema ve öğretmen dashboard sözleşmesi başarılı.');
