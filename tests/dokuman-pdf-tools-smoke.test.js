const fs = require('fs');
const assert = require('assert');

const tools = fs.readFileSync('js/dokuman-pdf-tools.js', 'utf8');
const akademik = fs.readFileSync('js/akademik-takvim.js', 'utf8');
const ui = fs.readFileSync('js/ui-stability-fixes.js', 'utf8');
const core = fs.readFileSync('js/core/core.js', 'utf8');
const design = fs.readFileSync('css/design-system.css', 'utf8');
const nativePreview = fs.readFileSync('js/native-report-preview.js', 'utf8');
new Function(ui);
new Function(core);

assert(akademik.includes("s.src = 'js/dokuman-pdf-tools.js'"), 'PDF araçları gerektiğinde yüklenmeli.');
assert(tools.includes('pdf-lib@1.17.1'), 'PDF birleştirme pdf-lib ile gerçek PDF sayfa kopyalama kullanmalı.');
assert(tools.includes('hedef.copyPages(kaynak,indeksler)'), 'Birleştirme sayfaları rasterize etmeden copyPages ile kopyalamalı.');
assert(!tools.includes('pdfjsLib.getDocument'), 'Yeni PDF birleştirme katmanı PDF sayfalarını JPEG/canvas olarak render etmemeli.');
assert(tools.includes('useObjectStreams:true'), 'Birleştirilmiş PDF nesne akışlarıyla sıkıştırılmalı.');
assert(tools.includes('_dokGorselPdfIcinSinirla'), 'Resimden PDF büyük görselleri bellek için sınırlandırmalı.');
assert(tools.includes('2400'), 'Resimden PDF A4 için kontrollü uzun kenar sınırı kullanmalı.');
assert(tools.includes("compress:true"), 'jsPDF sıkıştırması etkin olmalı.');
assert(tools.includes("pdf.addImage(dataUrl,'JPEG'"), 'Resimler PDF içine JPEG olarak kontrollü eklenmeli.');
assert(tools.includes('dokumanHazirPdfOnizle'), 'Oluşturulan/birleştirilen PDF için uygulama içi önizleme bulunmalı.');
assert(tools.includes('window.DokumanOkuyucu.ac'), 'PDF önizleme ortak belge görüntüleyicisini kullanmalı.');
assert(tools.includes('uygulamaDosyaKaydet'), 'İndir/Paylaş Android ortak kayıt köprüsünü kullanmalı.');
assert(tools.includes('_dokPdfDosyaAdi'), 'PDF dosya adı temizleme standardı bulunmalı.');
assert(!tools.includes('.normalize('), 'Dosya adı temizliği Türkçe karakterleri ASCII dönüşümüne zorlamamalı.');
assert(tools.includes('şifreli PDF birleştirilemez'), 'Şifreli PDF için anlaşılır hata bulunmalı.');

/* Yeni mimari: tema/kontrast ayrı JS ile enjekte edilmez. */
assert(ui.includes('Tek tasarım kaynağı css/design-system.css'), 'Legacy UI köprüsü tek tasarım kaynağını belirtmeli.');
assert(!ui.includes('theme-contrast-fixes.js'), 'Legacy UI köprüsü ayrı kontrast JS yüklememeli.');
assert(core.includes("DB='koruk-local-first-v1'"), 'Unified core mevcut IndexedDB veritabanını korumalı.');
assert(core.includes('window.SyncEngine'), 'Unified core arka plan senkronizasyon motorunu içermeli.');
assert(core.includes('window.AppStore'), 'Unified core merkezi state kaynağını içermeli.');
assert(design.includes('[data-theme="dark"]'), 'Koyu tema design system içinde tanımlı olmalı.');
assert(design.includes('input') && design.includes('button'), 'Form ve buton stilleri merkezi design system içinde bulunmalı.');
assert(nativePreview.includes('uygulamaHtmlYazdir'), 'Native rapor önizleme ortak yazdırma köprüsünü korumalı.');

console.log('Döküman PDF araçları ve yeni çekirdek/design-system smoke testleri başarılı.');
