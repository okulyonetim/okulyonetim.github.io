const fs=require('fs');
const assert=require('assert');

const fix=fs.readFileSync('js/core/duty-report-live-places.js','utf8');
const firebase=fs.readFileSync('js/firebase-init.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

assert(fix.includes("arr('nobetYerleri')"),'Rapor canlı nöbet yeri listesini okumalı.');
assert(fix.includes("arr('nobetAtamalari')"),'Rapor atamaları canlı veriden okumalı.');
assert(fix.includes("places.map(place=>`<th>${esc(String(place.ad||'Nöbet Yeri').toLocaleUpperCase('tr'))}</th>`)"),'Rapor başlıkları güncel nöbet yeri adlarından üretilmeli.');
assert(fix.includes('const span=Math.max(1,places.length+1);'),'Tatil/hafta sonu colspan değeri nöbet yeri sayısına göre dinamik olmalı.');
assert(fix.includes('item.tarih===iso&&item.yerId===place.id'),'Atamalar yalnız mevcut nöbet yeri id ile eşleştirilmeli.');
assert(fix.includes('table.dataset.dutyLivePlaces=String(places.length)'),'Rapor tablosu uygulanan canlı nöbet yeri sayısını işaretlemeli.');
assert(firebase.includes("js/core/duty-report-live-places.js?v=913"),'Canlı nöbet yeri adaptörü başlangıçta yüklenmeli.');
assert(sw.includes("'./js/core/duty-report-live-places.js?v=913'"),'Canlı nöbet yeri adaptörü offline precache içinde olmalı.');
const cache=sw.match(/const CACHE_ADI='oy-cache-v(\d+)'/);
assert(cache&&Number(cache[1])>=913,'Yeni adaptör için service worker cache sürümü yükseltilmeli.');

console.log('Nöbet raporu canlı nöbet yeri sözleşmesi başarılı.');
