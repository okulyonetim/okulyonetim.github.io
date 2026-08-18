const fs = require('fs');
const assert = require('assert');
const src = fs.readFileSync('js/yillik-plan.js', 'utf8');
assert(src.includes('const kapsayiciGenislik = kaydirma.clientWidth || document.documentElement.clientWidth || window.innerWidth || 360;'), 'Sıfır genişlikte viewport fallback bulunmalı.');
assert(src.includes('Math.max(240, kapsayiciGenislik - 40)'), 'Önizleme genişliği pozitif alt sınıra sahip olmalı.');
assert(src.includes('Math.max(0.2, Math.min(1, mevcutGenislik / YPL_A4_YATAY_PX))'), 'Zoom sıfır/negatif olmamalı.');
assert(!src.includes('const mevcutGenislik = kaydirma.clientWidth - 40;'), 'Eski negatif zoom hesabı geri gelmemeli.');
console.log('Yıllık plan önizleme smoke testleri başarılı.');
