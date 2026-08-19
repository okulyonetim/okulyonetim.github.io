const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('js/native-report-preview.js', 'utf8');
const akademik = fs.readFileSync('js/akademik-takvim.js', 'utf8');
const raporlama = fs.readFileSync('js/raporlama.js', 'utf8');

assert(akademik.includes("s.src = 'js/native-report-preview.js'"), 'Native rapor önizleme katmanı uygulama açılışında yüklenmeli.');
assert(src.includes('window.uygulamaHtmlYazdir = sarmal'), 'Ortak HTML yazdırma köprüsü native önizleme katmanıyla sarılmalı.');
assert(src.includes('window.Capacitor.Plugins.PrintPlugin'), 'Önizleme yalnız gerçek native PrintPlugin ortamında devreye girmeli.');
assert(src.includes("if (!nativePrintVarMi()) return gercekYazdirFn"), 'Web/PWA yazdırma davranışı değiştirilmemeli.');
assert(src.includes("id=\"nativeRaporFrame\""), 'Android raporu ayrı iframe önizleme alanında gösterilmeli.');
assert(src.includes('frame.srcdoc = onizlemeHtmlHazirla'), 'Rapor HTML’i iframe srcdoc ile uygulama içinde önizlenmeli.');
assert(src.includes('.rapor-toolbar{display:none!important}'), 'İç rapor toolbarı native önizlemede gizlenip tek toolbar standardı kullanılmalı.');
assert(src.includes('zoomEt(-10)') && src.includes('zoomEt(+10)'), 'Native rapor önizlemesinde + / - zoom bulunmalı.');
assert(src.includes('zoomSigdir') && src.includes('zoomYuz'), 'Native rapor önizlemesinde Sığdır ve %100 kontrolleri bulunmalı.');
assert(src.includes('🖨 Yazdır / PDF Kaydet'), 'Tek aksiyon Android sistem yazdırma/PDF kaydet ekranını açmalı.');
assert(src.includes('aktifRapor.yazdir('), 'Önizleme sonrası gerçek işlem orijinal uygulamaHtmlYazdir/PrintPlugin hattına dönmeli.');
assert(!src.includes('window.print()'), 'Native önizleme katmanı window.print kullanmamalı.');
assert(src.includes('ÇĞİÖŞÜçğıöşü'), 'Türkçe rapor dosya adları temizlenirken Türkçe karakterler korunmalı.');
assert(src.includes('_pullToRefreshAyarla(false)') && src.includes('_pullToRefreshAyarla(true)'), 'Önizleme sırasında pull-to-refresh güvenli biçimde kapatılıp geri açılmalı.');

assert(raporlama.includes('uygulamaHtmlYazdir(tamHtml, dosyaAdi, yon);'), 'Genel rapor üreticisi ortak native yazdırma köprüsünü kullanmaya devam etmeli.');

console.log('Native rapor önizleme smoke testleri başarılı.');
