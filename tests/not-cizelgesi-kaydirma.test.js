/* Not çizelgesinde tik/+/− sonrası liste başa sıçramaz: tam yeniden çizim kaydırmayı korur */
const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync('js/modules/gradebooks.js','utf8');
assert(/function renderKeepingGradebookScroll\(/.test(src),'renderKeepingGradebookScroll tanımlı olmalı.');
assert(/\.ka-gradebook-workspace__body/.test(src.slice(src.indexOf('function renderKeepingGradebookScroll'))),'Çalışma alanı gövdesinin kaydırması korunmalı.');
assert(!/markDirty\(\);\s*(modalClose\(\);\s*)?render\(\)/.test(src),'markDirty() sonrası çıplak render() çağrılmaz; renderKeepingGradebookScroll() kullanılır.');
console.log('not-cizelgesi-kaydirma: OK');
