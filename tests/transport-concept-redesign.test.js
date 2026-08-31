const fs=require('fs');
const assert=require('assert');
const js=fs.readFileSync('js/modules/transport.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
for(const token of ['ka-transport-service-hero','ka-transport-info-grid','ka-transport-students-card','ka-transport-student-avatar','ka-transport-chip--president','ka-transport-action-grid']) assert(js.includes(token),`Yeni taşıma markup eksik: ${token}`);
for(const token of ['Taşıma — premium açık/koyu konsept v4','[data-theme=\"dark\"] .ka-transport-service-hero','grid-template-columns:repeat(4,minmax(0,1fr))','ka-transport-remove']) assert(css.includes(token),`Yeni taşıma tema kuralı eksik: ${token}`);
assert(/CACHE_ADI='oy-cache-v(\d+)'/.test(sw)&&Number(sw.match(/CACHE_ADI='oy-cache-v(\d+)'/)[1])>=814,'Transport redesign cache artışı eksik.');
console.log('Taşıma açık/koyu konsept redesign başarılı.');
