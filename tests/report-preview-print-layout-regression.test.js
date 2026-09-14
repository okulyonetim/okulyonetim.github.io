const fs=require('fs');const assert=require('assert');
const engine=fs.readFileSync('js/modules/report-engine.js','utf8');const css=fs.readFileSync('css/design-system.css','utf8');const schedule=fs.readFileSync('js/core/schedule-report-redesign.js','utf8');const index=fs.readFileSync('index.html','utf8');const init=fs.readFileSync('js/firebase-init.js','utf8');const sw=fs.readFileSync('service-worker.js','utf8');
new Function(engine);new Function(schedule);
assert(engine.includes('async function inlineReportAssets(html)'),'Rapor logosu HTML içine gömülmeli.');
assert(engine.includes('box-sizing:border-box;width:${w}!important;min-height:${h}!important'),'A4 rapor padding dahil sayfa ölçüsünde kalmalı.');
assert(engine.includes('class="dv3h dv3h-report"'),'Rapor araç çubuğu özel responsive sınıf kullanmalı.');
assert(engine.includes('>🖨 Yazdır</button>'),'Mobil yazdır düğmesi kısa ve görünür etiket kullanmalı.');
assert(css.includes('.dv3h.dv3h-report')&&css.includes('grid-template-areas:"close title title title print" "minus zoom plus . ."'),'Mobil rapor araç çubuğu taşmayan grid düzenine sahip olmalı.');
assert(schedule.includes('border:.65pt solid #7f9189!important')&&schedule.includes('border:.55pt solid #9eaca6!important'),'Çarşaf hücre kenarlıkları daha belirgin olmalı.');
assert(index.includes('css/design-system.css?v=942'),'Yeni mobil rapor stili güncel design-system sürümüyle yüklenmeli.');
assert(init.includes('schedule-report-redesign.js?v=941'),'Yeni çarşaf rapor stili yüklenmeli.');
const cache=sw.match(/const CACHE_ADI='oy-cache-v(\d+)'/);assert(cache&&Number(cache[1])>=941,'Yeni rapor dosyaları için SW cache yükseltilmeli.');
console.log('Rapor logo, tek sayfa, kenarlık ve mobil Yazdır regresyon testi başarılı.');
// CI retrigger: report print layout contract
