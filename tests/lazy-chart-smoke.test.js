const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html','utf8');
const people = fs.readFileSync('js/modules/people.js','utf8');
const aux = fs.readFileSync('js/modules/people-import.js','utf8');

assert(!index.includes('<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js"></script>'), 'Chart.js ana HTML ilk açılışında yüklenmemeli.');
assert(people.includes('function studentResults(v)'), 'Trend grafiği güncel People öğrenci sonuç sayfasına bağlı olmalı.');
assert(aux.includes('function loadResultsChartLibrary()'), 'People yardımcı UI Chart.js lazy yükleyicisi içermeli.');
assert(aux.includes("script.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js'"), 'Chart.js yalnız sonuç ekranında dinamik eklenmeli.');
assert(aux.includes("if($('.ka-student-results'))scheduleResultChart()"), 'Grafik yalnız öğrenci sonuç ekranı açıkken hazırlanmalı.');
assert(aux.includes("closest?.('[data-student-detail]')"), 'Grafik öğrenci kimliğini gerçek data-student-detail ID değerinden izlemeli.');
assert(aux.includes("result.ogrenciId===student.id"), 'Grafik sonuçları kanonik öğrenci ID ile eşleştirmeli.');
assert(aux.includes('async function drawResultChart()'), 'Öğrenci trend grafiği asenkron çizilebilmeli.');
assert(aux.includes('await loadResultsChartLibrary()'), 'Grafik çiziminden önce Chart.js beklenmeli.');
assert(aux.includes("typeof global.Chart==='undefined'"), 'Chart yüklemesi başarısızsa sonuç ekranı çökmemeli.');
assert(aux.includes('resultChartLoadPromise=null;throw e'), 'Başarısız Chart yüklemesi sonrasında yeniden deneme mümkün olmalı.');
assert(aux.includes("label:'Deneme Net'") && aux.includes("label:'Test Net'"), 'Deneme ve test trendleri ayrı çizgiler olmalı.');
assert(aux.includes("chartColor('--ka-accent'") && aux.includes("chartColor('--ka-primary'"), 'Grafik renkleri merkezi design-system tokenlarından okunmalı.');

console.log('People öğrenci sonuç grafiği lazy-load smoke testleri başarılı.');
