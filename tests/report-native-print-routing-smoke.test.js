const fs = require('fs');
const assert = require('assert');

const report = fs.readFileSync('js/modules/report-engine.js', 'utf8');
const tools = fs.readFileSync('js/modules/tools.js', 'utf8');
const design = fs.readFileSync('css/design-system.css', 'utf8');
const loader = fs.readFileSync('js/app-loader.js', 'utf8');

new Function(report);
new Function(tools);

assert(report.includes('global.ReportEngine='), 'Merkezi ReportEngine global API sağlamalı.');
assert(report.includes('Capacitor?.isNativePlatform?.()'), 'Native yazdırma capability detection ile belirlenmeli.');
assert(report.includes('Capacitor?.Plugins?.PrintPlugin'), 'Android native yazdırma yalnız PrintPlugin capability üzerinden kullanılmalı.');
assert(report.includes("document.createElement('iframe')")&&report.includes('f.srcdoc=html'), 'Web/PWA yazdırma izole iframe içinde hazırlanmalı.');
assert(report.includes('f.contentWindow?.print()'), 'Web fallback iframe contentWindow üzerinden tarayıcı yazdırmasını kullanmalı.');
assert(report.includes("new URL('css/design-system.css'"), 'Rapor stilleri merkezi design-system.css kaynağından gelmeli.');
assert(report.includes('global.uygulamaHtmlYazdir='), 'Eski rapor çağrıları için uyumluluk API’si korunmalı.');
assert(report.includes('previewHtml') && report.includes('kaReportPreview'), 'A4 rapor önizleme akışı merkezi motorda bulunmalı.');

assert(design.includes('--ka-report-bg') && design.includes('.ka-report'), 'Rapor görünümü design system içinde tanımlı olmalı.');
assert(tools.includes('const CizelgelerRepository='), 'Çizelgeler veri katmanı tools.js içinde kalmalı.');
assert(tools.includes('global.CizelgelerService=CizelgelerService'), 'Çizelgeler servis API’si tools.js içinde korunmalı.');
assert(loader.includes("define('transport',['js/modules/report-engine.js','js/modules/transport.js'])"), 'Transport raporları merkezi ReportEngine ile yüklenmeli.');

console.log('Merkezi ReportEngine native/web yazdırma smoke testleri başarılı.');
