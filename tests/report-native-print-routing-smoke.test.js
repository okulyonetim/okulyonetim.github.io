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
  'js/cizelgeler.js',
  'js/kriter-dagitim.js',
  'js/proje-degerlendirme.js'
];

const sorunlar = [];
for (const yol of dosyalar) {
  const src = fs.readFileSync(yol, 'utf8');
  if (!src.includes('window.print()')) continue;
  if (!src.includes('uygulamaHtmlYazdir')) {
    sorunlar.push(`${yol}: window.print() var fakat uygulamaHtmlYazdir native köprüsü bulunamadı`);
  }
}

assert.strictEqual(sorunlar.length, 0, `Native yazdırma standardı dışında kalan rapor modülleri:\n${sorunlar.join('\n')}`);

const raporlama = fs.readFileSync('js/raporlama.js', 'utf8');
assert(raporlama.includes("window.Capacitor.Plugins && window.Capacitor.Plugins.PrintPlugin"), 'Genel raporlama native PrintPlugin varlığını doğrulamalı.');
assert(raporlama.includes("if(nativeVarMi && typeof uygulamaHtmlYazdir === 'function')"), 'Genel raporlama native ortamda popup yerine uygulamaHtmlYazdir kullanmalı.');
assert(raporlama.includes('uygulamaHtmlYazdir(tamHtml, dosyaAdi, yon);'), 'Rapor HTML’i yön bilgisiyle native yazdırmaya aktarılmalı.');

console.log('Rapor native yazdırma yönlendirme smoke testleri başarılı.');
