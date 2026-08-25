const fs = require('fs');
const assert = require('assert');

const dosyalar = [
  'js/raporlama.js',
  'js/puantaj.js',
  'js/tasima-takip.js',
  'js/dilekce.js',
  'js/sinavlar.js',
  'js/sinif-oturma.js',
  'js/kontrol-listeleri.js',
  'js/ogretmen-liste-olusturucu.js',
  'js/teblig-tebellug.js',
  'js/kriter-dagitim.js',
  'js/proje-degerlendirme.js'
];

const sorunlar = [];
for (const yol of dosyalar) {
  const src = fs.readFileSync(yol, 'utf8');
  if (!src.includes('window.print()')) continue;

  const guvenli = src.includes('uygulamaHtmlYazdir') ||
    src.includes('_raporPenceresiniAc') ||
    src.includes('uygulamaDosyaKaydet');

  if (!guvenli) {
    sorunlar.push(`${yol}: window.print() var fakat güvenli native yazdırma/kaydetme yönlendirmesi bulunamadı`);
  }
}

assert.strictEqual(sorunlar.length, 0, `Native yazdırma standardı dışında kalan rapor modülleri:\n${sorunlar.join('\n')}`);

const raporlama = fs.readFileSync('js/raporlama.js', 'utf8');
assert(raporlama.includes("window.Capacitor.Plugins && window.Capacitor.Plugins.PrintPlugin"), 'Genel raporlama native PrintPlugin varlığını doğrulamalı.');
assert(raporlama.includes("if(nativeVarMi && typeof uygulamaHtmlYazdir === 'function')"), 'Genel raporlama native ortamda popup yerine uygulamaHtmlYazdir kullanmalı.');
assert(raporlama.includes('uygulamaHtmlYazdir(tamHtml, dosyaAdi, yon);'), 'Rapor HTML’i yön bilgisiyle native yazdırmaya aktarılmalı.');

const sinavlar = fs.readFileSync('js/sinavlar.js', 'utf8');
assert(sinavlar.includes('_raporPenceresiniAc'), 'Sınav raporları ortak rapor penceresi/native PrintPlugin hattını kullanmalı.');

const sinifOturma = fs.readFileSync('js/sinif-oturma.js', 'utf8');
assert(sinifOturma.includes('uygulamaDosyaKaydet'), 'Sınıf oturma PDF çıktısı Android’de native dosya kaydetme köprüsünü kullanmalı.');

const tools = fs.readFileSync('js/modules/tools.js', 'utf8');
assert(tools.includes('const CizelgelerRepository='), 'Çizelgeler veri katmanı tools.js içinde kalmalı.');
assert(tools.includes('global.CizelgelerService=CizelgelerService'), 'Çizelgeler servis API’si tools.js içinde korunmalı.');

assert(raporlama.includes('id="rapor-viewport"'), 'Web/PWA rapor önizlemesi ayrı viewport kullanmalı.');
assert(raporlama.includes('function zoomSigdir()'), 'Rapor önizlemesinde genişliğe sığdır bulunmalı.');
assert(raporlama.includes("scene.style.width = Math.ceil(w * scale) + 'px'"), 'Rapor zoom sahnesinin fiziksel genişliği ölçekle eşleşmeli.');
assert(raporlama.includes("#icerik-sarici { transform-origin: top left"), 'Rapor zoom yalnız içerik alanında uygulanmalı.');
assert(raporlama.includes('.rapor-viewport { overflow:visible !important; }'), 'Yazdırmada önizleme viewport kısıtı kaldırılmalı.');

console.log('Rapor native yazdırma yönlendirme smoke testleri başarılı.');