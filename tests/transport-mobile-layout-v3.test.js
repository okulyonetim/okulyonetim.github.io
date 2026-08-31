const fs=require('fs');
const assert=require('assert');
const css=fs.readFileSync('css/design-system.css','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
for(const token of ['Taşıma — mobil yerleşim düzeltmesi v3','grid-template-columns:repeat(2,minmax(0,1fr))!important','.ka-transport-student-row>[data-transport-remove-student]','.ka-transport-detail-actions>[data-transport-excel]','.ka-transport-service-card__side .ka-btn[data-service-edit]']) assert(css.includes(token),`Eksik mobil taşıma kuralı: ${token}`);
assert(css.includes('white-space:nowrap!important'),'Taşıma etiketleri tek satırda tutulmalı.');
assert(/CACHE_ADI='oy-cache-v(\d+)'/.test(sw) && Number(sw.match(/CACHE_ADI='oy-cache-v(\d+)'/)[1])>=813,'Yeni taşıma CSS için cache artırılmalı.');
console.log('Taşıma mobil yerleşim v3 başarılı.');
