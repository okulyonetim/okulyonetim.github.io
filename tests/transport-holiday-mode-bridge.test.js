const fs=require('fs');
const assert=require('assert');

const bridge=fs.readFileSync('js/core/transport-holiday-mode-bridge.js','utf8');
const firebase=fs.readFileSync('js/firebase-init.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

assert(bridge.includes('combinedHolidayRows'),'Taşıma raporu birleşik tatil kaynağını kullanmalı.');
assert(bridge.includes("global.TransportReports.takip(servisId,year,month)"),'Aylık takip butonu Tatil Modu köprüsünden çalışmalı.');
assert(bridge.includes("global.AppStore.setData('resmiTatiller',source.combinedHolidayRows())"),'Rapor üretilirken Tatil Modu günleri geçici resmi tatil görünümüne alınmalı.');
assert(bridge.includes("if(event.detail?.name==='transport')"),'Lazy yüklenen Taşıma modülü de köprülenmeli.');
assert(firebase.includes('transport-holiday-mode-bridge.js?v=931'),'Taşıma Tatil Modu köprüsü başlangıçta yüklenmeli.');
assert(sw.includes("'./js/core/transport-holiday-mode-bridge.js?v=931'"),'Taşıma Tatil Modu köprüsü offline cache içinde olmalı.');
assert(sw.includes("const CACHE_ADI='oy-cache-v931';"),'Yeni köprü için PWA cache sürümü yenilenmeli.');

console.log('Taşıma Tatil Modu köprüsü sözleşmesi başarılı.');
