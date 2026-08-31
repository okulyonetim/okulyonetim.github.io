const fs=require('fs');
const assert=require('assert');
const css=fs.readFileSync('css/design-system.css','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
for(const token of ['Taşıma — mobil buton düzeni v2','.ka-transport-filters .ka-btn:not(.ka-btn--secondary)','.ka-transport-service-card__side .ka-btn[data-service-edit]','.ka-transport-detail__toolbar [data-transport-detail-delete]','grid-template-columns:repeat(2,minmax(0,1fr))']) assert(css.includes(token),`Taşıma buton düzeni eksik: ${token}`);
assert(css.includes('white-space:nowrap'),'Taşıma aksiyon etiketleri satır kırmamalı.');
assert(/CACHE_ADI='oy-cache-v(\d+)'/.test(sw) && Number(sw.match(/CACHE_ADI='oy-cache-v(\d+)'/)[1])>=812,'Yeni taşıma CSS sürümü için cache artırılmalı.');
console.log('Taşıma mobil buton düzeni başarılı.');
