const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html','utf8');
const src = fs.readFileSync('js/sinav-sonuclari.js','utf8');

assert(!index.includes('<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js"></script>'), 'Chart.js ana HTML ilk açılışından çıkarılmalı.');
assert(src.includes('function _ssChartYukle()'), 'Sınav sonuçları Chart.js lazy yükleyicisi içermeli.');
assert(src.includes("sc.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js'"), 'Chart.js yalnız sonuç ekranında dinamik eklenmeli.');
assert(src.includes('async function _ssOgrenciSonuclariCiz(ogrenciId)'), 'Öğrenci sonuç çizimi Chart yüklenmesini bekleyebilmeli.');
assert(src.includes('await _ssChartYukle();'), 'Grafik çiziminden önce Chart.js beklenmeli.');
assert(src.includes('if (!canvas || typeof Chart === \'undefined\') return;'), 'Chart yüklemesi başarısızsa ekran çökmemeli.');
assert(src.includes('_ssChartYukleme=null; throw e;'), 'Başarısız yükleme sonrasında yeniden deneme mümkün olmalı.');

console.log('Chart.js lazy-load smoke testleri başarılı.');
