const test = require('node:test'), assert = require('node:assert'), fs = require('fs');
globalThis.window = globalThis;
globalThis.AppStore = { data: t => (t === 'appConfig' ? [{ id: 'dilimizin-zenginlikleri', ortaokul: { 3: { ogretmenler: [{ id: 't1', ad: 'Ayşe Yılmaz' }], not: 'Pano çalışması', tarih: '19–23 Ekim' } } }] : t === 'okulBilgileri' ? [{ id: 'ayarlar', okulAdi: 'Koruk Ortaokulu', mudurAdSoyad: 'Sedat Karagöz' }] : []) };
require('../js/modules/dilimiz.js');
const D = globalThis.DilimizModule;
test('ilkokul ve ortaokul planlarında 11 faaliyet; adım sayıları PDF ile aynı', () => {
  assert.strictEqual(D.PLANLAR.ilkokul.length, 11); assert.strictEqual(D.PLANLAR.ortaokul.length, 11);
  const say = p => p.reduce((s, a) => s + a[5].length, 0);
  assert.strictEqual(say(D.PLANLAR.ortaokul), 44); assert.strictEqual(say(D.PLANLAR.ilkokul), 45);
  assert.match(D.PLANLAR.ilkokul[3][2], /Çocuk Şiirleri/); assert.match(D.PLANLAR.ortaokul[8][2], /Dede Korkut/);
  assert.strictEqual(D.PLANLAR.ortaokul[10][5][2][2], 'İl Yürütme Komisyonunca belirlenecektir');
});
test('okul girişleri (sorumlu öğretmen, aylık faaliyet) yazdırma çıktısına girer', () => {
  const e = D.entry('ortaokul', 3); assert.strictEqual(e.ogretmenler[0].ad, 'Ayşe Yılmaz');
  D.reset();
  const h = D.printHtml(); assert.match(h, /İLKOKUL KADEMESİ EYLEM PLANI/); assert.ok(!h.includes('Ayşe Yılmaz'));
  assert.match(h, /Sedat Karagöz/);
});
test('modül doğrudan Firestore/localStorage kullanmaz; menü, yönlendirme ve önbellek bağlı', () => {
  const src = fs.readFileSync('js/modules/dilimiz.js', 'utf8');
  assert.ok(!/db\s*\.\s*collection|localStorage/.test(src));
  assert.match(fs.readFileSync('js/core/shell-ui.js', 'utf8'), /page==='dilimiz'/);
  assert.match(fs.readFileSync('js/app-loader.js', 'utf8'), /'documents','dilimiz'/);
  assert.match(fs.readFileSync('js/app-loader.js', 'utf8'), /dilimiz\.js','js\/modules\/documents\.js/);
  assert.match(fs.readFileSync('service-worker.js', 'utf8'), /dilimiz\.js/);
});
test('CSS yalnız token (hex yok)', () => {
  const css = fs.readFileSync('css/design-system-base.css', 'utf8'), a = css.indexOf('DİLİMİZİN ZENGİNLİKLERİ (js'), b = css.indexOf('/* ===== WEB ARAYÜZÜ (≥1100px)');
  assert.ok(a > 0 && b > a); assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css.slice(a, b)));
});
