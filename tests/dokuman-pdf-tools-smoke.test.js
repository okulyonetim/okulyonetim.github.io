const fs = require('fs');
const assert = require('assert');

const tools = fs.readFileSync('js/dokuman-pdf-tools.js', 'utf8');
const core = fs.readFileSync('js/core/core.js', 'utf8');
const design = fs.readFileSync('css/design-system.css', 'utf8');
const report = fs.readFileSync('js/modules/report-engine.js', 'utf8');
new Function(core);
new Function(report);

assert(tools.includes('pdf-lib@1.17.1'), 'PDF birleştirme pdf-lib ile gerçek PDF sayfa kopyalama kullanmalı.');
assert(tools.includes('hedef.copyPages(kaynak,indeksler)'), 'Birleştirme sayfaları rasterize etmeden copyPages ile kopyalamalı.');
assert(!tools.includes('pdfjsLib.getDocument'), 'Yeni PDF birleştirme katmanı PDF sayfalarını JPEG/canvas olarak render etmemeli.');
assert(tools.includes('useObjectStreams:true'), 'Birleştirilmiş PDF nesne akışlarıyla sıkıştırılmalı.');
assert(tools.includes('_dokGorselPdfIcinSinirla') && tools.includes('2400'), 'Resimden PDF büyük görselleri kontrollü sınırlandırmalı.');
assert(tools.includes("compress:true"), 'jsPDF sıkıştırması etkin olmalı.');
assert(tools.includes("pdf.addImage(dataUrl,'JPEG'"), 'Resimler PDF içine JPEG olarak kontrollü eklenmeli.');
assert(tools.includes('dokumanHazirPdfOnizle'), 'Oluşturulan/birleştirilen PDF için uygulama içi önizleme bulunmalı.');
assert(tools.includes('window.DokumanOkuyucu.ac'), 'PDF önizleme ortak belge görüntüleyicisini kullanmalı.');
assert(tools.includes('uygulamaDosyaKaydet'), 'İndir/Paylaş Android ortak kayıt köprüsünü kullanmalı.');
assert(tools.includes('_dokPdfDosyaAdi'), 'PDF dosya adı temizleme standardı bulunmalı.');
assert(!tools.includes('.normalize('), 'Dosya adı temizliği Türkçe karakterleri ASCII dönüşümüne zorlamamalı.');
assert(tools.includes('şifreli PDF birleştirilemez'), 'Şifreli PDF için anlaşılır hata bulunmalı.');

assert(core.includes("DB='koruk-local-first-v1'"), 'Unified core mevcut IndexedDB veritabanını korumalı.');
assert(core.includes('window.SyncEngine') && core.includes('window.AppStore') && core.includes('window.DeviceData'), 'Unified core AppStore + DeviceData + SyncEngine içermeli.');
assert(design.includes('[data-theme="dark"]'), 'Koyu tema design system içinde tanımlı olmalı.');
assert(design.includes('input') && design.includes('button'), 'Form ve buton stilleri merkezi design system içinde bulunmalı.');
assert(design.includes('--ka-report-bg') && design.includes('.ka-report'), 'Rapor görünümü merkezi design system içinde bulunmalı.');
assert(report.includes('global.uygulamaHtmlYazdir='), 'Birleşik ReportEngine eski rapor çağrıları için ortak yazdırma API’sini sağlamalı.');

console.log('Döküman PDF araçları ve yeni çekirdek/design-system/report smoke testleri başarılı.');
