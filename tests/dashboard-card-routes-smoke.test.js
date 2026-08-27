const fs=require('fs');
const assert=require('assert');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
const dash=fs.readFileSync('js/modules/dashboard.js','utf8');
new Function(shell);new Function(dash);
for(const pair of ["announcements:'communication'","news:'communication'","stats:'people'","duty:'management'","lessons:'academic'","'week-duty':'management'","exams:'academic'","schedule:'academic'","notes:'communication'","calendar:'communication'"]){
  assert(shell.includes(pair),`Dashboard kart rotası eksik: ${pair}`);
}
assert(shell.includes("closest('[data-home-section]')"),'Dashboard kart gövdesi tıklanabilir olmalı.');
assert(css.includes('padding-left:max(4px,var(--ka-safe-left))'),'Mobil ana içerik kenar boşluğu 4px/safe-area olmalı.');
assert(css.includes('.ka-home-hero,.ka-home-section{width:100%'),'Ana sayfa kartları tam kullanılabilir genişlikte olmalı.');
assert(dash.includes('data-home-section'),'Dashboard kartları rota kimliği üretmeli.');
assert(dash.includes("function teacherShell(){return`${cardVisible('welcome')?hero():''}${announcementSection()}${pollSection()}${trialCounterSection()}"),'Öğretmen ana sayfası aktif anketleri ve deneme sayacını göstermeli.');
assert(dash.includes("function adminShell(){return`${cardVisible('welcome')?hero():''}${announcementSection()}${pollSection()}${trialCounterSection()}"),'Yönetici ana sayfası aktif anketlerden sonra deneme sayacını göstermeli.');
assert(dash.includes("arr('denemeSinavlari')")&&dash.includes('sayacDurumu?.aktif')&&dash.includes('baslatmaTarihi'),'Dashboard deneme sayacı gerçek denemeSinavlari.sayacDurumu modelini kullanmalı.');
assert(dash.includes('data-dash-page=\"trial\"')&&dash.includes('Deneme Sınavları'),'Dashboard deneme kartı doğrudan Academic trial sayfasına gitmeli.');
assert(dash.includes('trialTimer=setInterval(()=>refreshTrialTimers(),1000)'),'Aktif deneme sayacı ana sayfada canlı güncellenmeli.');
console.log('Dashboard kart bağlantıları ve geniş mobil yerleşim smoke testi başarılı.');
