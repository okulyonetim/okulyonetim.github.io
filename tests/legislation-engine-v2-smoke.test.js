const fs=require('fs');const assert=require('assert');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');const sw=fs.readFileSync('service-worker.js','utf8');const css=fs.readFileSync('css/design-system.css','utf8');
assert(!shell.includes("['Mevzuat','📖','documents','mevzuat']")&&!shell.includes("page==='mevzuat'"),'Mevzuat menü/rota uygulamadan kaldırılmalı.');
assert(!shell.includes('LegislationEngine')&&!shell.includes('LegislationModule'),'Mevzuat runtime modülü ShellUI içinde kalmamalı.');
for(const f of ['js/modules/legislation.js','js/modules/legislation-ui.js','tests/legislation-page-redesign.test.js']) assert(!fs.existsSync(f),`${f} kaldırılmış olmalı.`);
assert(!fs.existsSync('worker/mevzuat-ai'),'Mevzuat AI Worker paketi repodan kaldırılmış olmalı.');
assert(!sw.includes('js/modules/legislation')&&sw.includes("const CACHE_ADI='oy-cache-v937';"),'Service Worker Mevzuat dosyalarını önbelleğe almamalı ve cache yükseltilmeli.');
assert(!css.includes('ka-legislation'),'Mevzuata özel ölü tasarım kuralları kaldırılmalı.');
console.log('Mevzuat özelliği uygulama/runtime/repo katmanlarından tamamen emekli edildi.');
