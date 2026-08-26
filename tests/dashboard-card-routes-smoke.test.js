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
console.log('Dashboard kart bağlantıları ve geniş mobil yerleşim smoke testi başarılı.');
