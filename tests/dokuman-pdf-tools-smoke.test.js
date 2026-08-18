const fs = require('fs');
const assert = require('assert');

const tools = fs.readFileSync('js/dokuman-pdf-tools.js', 'utf8');
const akademik = fs.readFileSync('js/akademik-takvim.js', 'utf8');

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
assert(tools.includes('Türkçe karakterler aynen korunur') || tools.includes('Türkçe'), 'Türkçe dosya adı koruma niyeti belgelenmeli.');
assert(tools.includes('şifreli PDF birleştirilemez'), 'Şifreli PDF için anlaşılır hata bulunmalı.');

console.log('Döküman PDF araçları smoke testleri başarılı.');
