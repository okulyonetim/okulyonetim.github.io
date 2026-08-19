const fs = require('fs');
const assert = require('assert');

const tools = fs.readFileSync('js/dokuman-pdf-tools.js', 'utf8');
const akademik = fs.readFileSync('js/akademik-takvim.js', 'utf8');
const ui = fs.readFileSync('js/ui-stability-fixes.js', 'utf8');
const contrast = fs.readFileSync('js/theme-contrast-fixes.js', 'utf8');
const nativePreview = fs.readFileSync('js/native-report-preview.js', 'utf8');

// Yeni katmanlar en azından JavaScript olarak derlenebilir olmalı.
new Function(ui);
new Function(contrast);

assert(akademik.includes("s.src = 'js/dokuman-pdf-tools.js'"), 'PDF araçları dokumanlar.js sonrasında yüklenmeli.');
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
assert(tools.includes("replace(/[\\u0000-\\u001f<>:\"/\\\\|?*]+/g, '-')"), 'Dosya adı yalnız dosya sistemi için geçersiz karakterleri temizlemeli.');
assert(!tools.includes('.normalize('), 'Dosya adı temizliği Türkçe karakterleri ASCII dönüşümüne zorlamamalı.');
assert(tools.includes('şifreli PDF birleştirilemez'), 'Şifreli PDF için anlaşılır hata bulunmalı.');

assert(tools.includes('window.pdfIslemleriAc'), 'PDF İşlemleri alt menü açıcı bulunmalı.');
assert(tools.includes('window.pdfResimdenAc'), 'Resimden PDF bağımsız açıcı bulunmalı.');
assert(tools.includes('window.pdfBirlestirAc'), 'PDF Birleştir bağımsız açıcı bulunmalı.');
assert(tools.includes("goster('dok_sekme_resim',false)"), 'Normal Döküman Ekle akışında Resimden PDF sekmesi gizlenmeli.');
assert(tools.includes("goster('dok_sekme_birlestir',false)"), 'Normal Döküman Ekle akışında PDF Birleştir sekmesi gizlenmeli.');

assert(tools.includes("id:'pdf_resimden'"), 'Resimden PDF merkezi özellik kataloğunda bağımsız hedef olmalı.');
assert(tools.includes("id:'pdf_birlestir'"), 'PDF Birleştir merkezi özellik kataloğunda bağımsız hedef olmalı.');
assert(tools.includes("id:'ogrenci_devamsizlik'"), 'Öğrenci Devamsızlığı merkezi özellik kataloğunda bağımsız hedef olmalı.');
assert(tools.includes("ad:'Öğrenci Devamsızlığı'"), 'Öğrenci Devamsızlığı Türkçe adı korunmalı.');
assert(tools.includes("grup:'g7'"), 'PDF İşlemleri varsayılan olarak Döküman & Evraklar grubunda olmalı.');
assert(tools.includes("grup:'g1'"), 'Öğrenci Devamsızlığı varsayılan olarak Öğretmen & Öğrenciler grubunda olmalı.');
assert(tools.includes("sekmeAd:'@ozellik:pdf_islemleri'"), 'PDF İşlemleri menüsü merkezi özellik hedefini kullanmalı.');
assert(tools.includes("sekmeAd:'@ozellik:ogrenci_devamsizlik'"), 'Öğrenci Devamsızlığı bağımsız özellik hedefini kullanmalı.');

// Aynı global modal tekrar açıldığında önceki PDF işleminden kalan disabled/display
// durumu Döküman Kaydet düğmesine sızmamalı.
assert(ui.includes("b.style.display=''"), 'Döküman Ekle her açılışta Kaydet düğmesini görünür hale getirmeli.');
assert(ui.includes('b.disabled=false'), 'Döküman Ekle her açılışta eski disabled durumunu temizlemeli.');
assert(ui.includes("b.removeAttribute('aria-disabled')"), 'Kaydet düğmesinin aria-disabled durumu da temizlenmeli.');
assert(nativePreview.includes("s.src = 'js/ui-stability-fixes.js'"), 'UI kararlılık katmanı uygulama başlangıcında yüklenmeli.');

// Açık ve koyu modda normal/hover/focus durumlarının aynı okunabilir metin
// paletini kullanması, tıklamadan önce görünmeyen yazı sorununu engeller.
assert(contrast.includes('[data-theme="dark"]'), 'Koyu mod için ayrı kontrast değişkenleri bulunmalı.');
assert(contrast.includes('.btn-ghost:hover'), 'Ghost buton hover durumu açıkça normalize edilmeli.');
assert(contrast.includes('.btn-ghost:focus-visible'), 'Ghost buton focus durumu açıkça normalize edilmeli.');
assert(contrast.includes('input::placeholder'), 'Form placeholder kontrastı normalize edilmeli.');
assert(contrast.includes('select option'), 'Select seçenekleri tema kontrastını korumalı.');
assert(contrast.includes('.detay-head .btn-ghost'), 'Renkli başlık üzerindeki ghost butonlar beyaz metni korumalı.');

console.log('Döküman PDF araçları, modal kararlılığı ve tema kontrast smoke testleri başarılı.');