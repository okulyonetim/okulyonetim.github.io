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
assert(tools.includes("replace(/[\\u0000-\\u001f<>:\"/\\\\|?*]+/g, '-')"), 'Dosya adı yalnız dosya sistemi için geçersiz karakterleri temizlemeli.');
assert(!tools.includes('.normalize('), 'Dosya adı temizliği Türkçe karakterleri ASCII dönüşümüne zorlamamalı.');
assert(tools.includes('şifreli PDF birleştirilemez'), 'Şifreli PDF için anlaşılır hata bulunmalı.');

// PDF araçları artık Dökümanlar modalında normal sekmeler olarak görünmemeli;
// bağımsız menü/özellik hedeflerinden açılmalı.
assert(tools.includes('window.pdfIslemleriAc'), 'PDF İşlemleri alt menü açıcı bulunmalı.');
assert(tools.includes('window.pdfResimdenAc'), 'Resimden PDF bağımsız açıcı bulunmalı.');
assert(tools.includes('window.pdfBirlestirAc'), 'PDF Birleştir bağımsız açıcı bulunmalı.');
assert(tools.includes("goster('dok_sekme_resim',false)"), 'Normal Döküman Ekle akışında Resimden PDF sekmesi gizlenmeli.');
assert(tools.includes("goster('dok_sekme_birlestir',false)"), 'Normal Döküman Ekle akışında PDF Birleştir sekmesi gizlenmeli.');

// Navigasyon Düzeni > Yeni Öğe Ekle listesinde iki PDF aracı ve öğrenci
// devamsızlığı bağımsız özellikler olarak bulunmalı.
assert(tools.includes("id:'pdf_resimden'"), 'Resimden PDF merkezi özellik kataloğunda bağımsız hedef olmalı.');
assert(tools.includes("id:'pdf_birlestir'"), 'PDF Birleştir merkezi özellik kataloğunda bağımsız hedef olmalı.');
assert(tools.includes("id:'ogrenci_devamsizlik'"), 'Öğrenci Devamsızlığı merkezi özellik kataloğunda bağımsız hedef olmalı.');
assert(tools.includes("ad:'Öğrenci Devamsızlığı'"), 'Öğrenci Devamsızlığı Türkçe adı korunmalı.');
assert(tools.includes("grup:'g7'"), 'PDF İşlemleri varsayılan olarak Döküman & Evraklar grubunda olmalı.');
assert(tools.includes("grup:'g1'"), 'Öğrenci Devamsızlığı varsayılan olarak Öğretmen & Öğrenciler grubunda olmalı.');
assert(tools.includes("sekmeAd:'@ozellik:pdf_islemleri'"), 'PDF İşlemleri menüsü merkezi özellik hedefini kullanmalı.');
assert(tools.includes("sekmeAd:'@ozellik:ogrenci_devamsizlik'"), 'Öğrenci Devamsızlığı bağımsız özellik hedefini kullanmalı.');

console.log('Döküman PDF araçları smoke testleri başarılı.');