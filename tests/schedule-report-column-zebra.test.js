const fs=require('fs');
const assert=require('assert');

const fix=fs.readFileSync('js/core/schedule-report-column-zebra.js','utf8');
const redesign=fs.readFileSync('js/core/schedule-report-redesign.js','utf8');
const engine=fs.readFileSync('js/modules/report-engine.js','utf8');
const init=fs.readFileSync('js/firebase-init.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

new Function(fix);
assert(engine.includes('.ka-report tbody tr:nth-child(even) td{background:#f7faf8!important}'),'Merkezi rapor motorundaki temel satır zebra kaynağı beklenmedik biçimde değişmiş.');
assert(redesign.includes("const dayClass=i=>i%2===0?'ka-sr-day-a':'ka-sr-day-b'"),'Ders programı gün bazlı sütun sınıflarını üretmeli.');
assert(!fix.includes('nth-child(even)')&&!fix.includes('nth-child(odd)'),'Ders programı zebra düzeltmesi kendi içinde satır bazlı zebra üretmemeli.');
for(const token of [
  '.ka-report .ka-sr-report tbody tr>td.ka-sr-day-a{background:#fbfdfc!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}',
  '.ka-report .ka-sr-report tbody tr>td.ka-sr-day-b{background:#fff!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}',
  '.ka-report .ka-sr-report thead tr>th.ka-sr-day-a{background:#f3f7f5!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}',
  '.ka-report .ka-sr-report thead tr>th.ka-sr-day-b{background:#fafcfb!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}'
])assert(fix.includes(token),`Sütun zebra öncelik kuralı eksik: ${token}`);
assert(fix.includes('data-ka-report-soft-fill'),'Ortak raporlar için hafif dolgu katmanı eksik.');
assert(fix.includes('background:#f3f6f4!important'),'Ortak rapor başlık dolgusu yeterince açık değil.');
assert(fix.includes('function classTeacherName(')&&fix.includes('Sınıf Öğretmeni:'),'Sınıf ders programına sınıf öğretmeni ekleme desteği eksik.');
assert(fix.includes('function installMenuPullRefresh(')&&fix.includes(".ka-menu-layer:not([hidden])"),'Menü açıkken pull-to-refresh desteği eksik.');

const window={};
new Function('window',fix)(window);
let scheduleOpts=null,otherOpts=null;
window.ReportEngine={printReport:(title,body,opts)=>{if(title==='schedule')scheduleOpts=opts;else otherOpts=opts;return opts}};
window.ReportEngine.printReport('schedule','', {extraHead:'<style>.ka-sr-report{}</style>',fontSize:7});
assert(scheduleOpts.extraHead.includes('data-ka-schedule-column-zebra'),'Ders programı çıktısına sütun zebra öncelik stili eklenmedi.');
assert(scheduleOpts.extraHead.includes('data-ka-report-soft-fill'),'Ders programına ortak hafif dolgu stili eklenmedi.');
assert(scheduleOpts.fontSize===7,'Rapor seçenekleri zebra düzeltmesinde korunmalı.');
window.ReportEngine.printReport('other','',{extraHead:'<style>.other-report{}</style>'});
assert(!otherOpts.extraHead.includes('data-ka-schedule-column-zebra'),'Ders programı dışındaki raporlara sütun zebra uygulanmamalı.');
assert(otherOpts.extraHead.includes('data-ka-report-soft-fill'),'Diğer raporlara ortak hafif dolgu uygulanmalı.');

assert(init.includes('schedule-report-column-zebra.js?v=938'),'Sütun zebra runtime uygulama başlangıcında yüklenmeli.');
assert(sw.includes("'./js/core/schedule-report-column-zebra.js?v=938'"),'Sütun zebra runtime offline precache içinde olmalı.');
const cache=sw.match(/const CACHE_ADI='oy-cache-v(\d+)'/);
assert(cache&&Number(cache[1])>=938,'Service Worker cache sürümü sütun zebra düzeltmesi için yeterli olmalı.');

console.log('Rapor hafif dolgu + ders programı zebra + menü yenileme sözleşmesi başarılı.');
