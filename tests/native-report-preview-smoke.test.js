const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('js/modules/report-engine.js', 'utf8');
const transport = fs.readFileSync('js/modules/transport-reports.js', 'utf8');
const design = fs.readFileSync('css/design-system.css', 'utf8');
new Function(src);
new Function(transport);

assert(src.includes('global.ReportEngine='), 'Tek ReportEngine global API yayınlanmalı.');
assert(src.includes('PrintPlugin'), 'Android yazdırma tek ReportEngine içinden PrintPlugin kullanmalı.');
assert(src.includes("plugin.yazdir({html,isAdi:fileName(name),yon:"), 'Android PrintPlugin yazdir sözleşmesi korunmalı.');
assert(src.includes('previewHtml'), 'Raporlar yazdırmadan önce merkezi önizleme açmalı.');
assert(src.includes('ka-modal-backdrop') && src.includes('ka-modal'), 'Önizleme ayrı stil değil merkezi modal componentlerini kullanmalı.');
assert(src.includes('kaReportFrame'), 'A4 rapor iframe içinde uygulama içinde önizlenmeli.');
assert(src.includes('css/design-system.css'), 'Rapor HTML’i tek design-system.css kaynağını kullanmalı.');
assert(src.includes('new URL('), 'Web/PWA blob çıktısı design-system adresini mutlak çözmeli.');
assert(src.includes('🖨 Yazdır / PDF Kaydet'), 'Önizlemede tek yazdır/PDF aksiyonu bulunmalı.');
assert(src.includes('global.uygulamaHtmlYazdir='), 'Eski rapor üreticileri için ortak uyumluluk API’si korunmalı.');
assert(transport.includes('ReportEngine.printReport'), 'Taşıma raporları ortak ReportEngine üzerinden çalışmalı.');
assert(design.includes('--ka-report-bg') && design.includes('.ka-report'), 'Rapor görünümü design system token/componentleriyle yönetilmeli.');

console.log('Birleşik rapor motoru smoke testleri başarılı.');
