const test = require('node:test'), assert = require('node:assert'), fs = require('fs');
globalThis.window = globalThis;
require('../js/modules/gezi.js');
const G = globalThis.GeziModule;
const css = fs.readFileSync('css/design-system-base.css', 'utf8');
const sample = () => ({ ...G.reset(), gTarih: '2026-11-10', yer: 'Anıtkabir', saat: '08:00 - 14:00', program: '08:00 Hareket\n14:00 Dönüş', amac: 'Amaç <b>x</b>', subeler: [{ sube: '6/A', k: '12', e: '14' }, { sube: '6/B', k: '10', e: '11' }], ogretmenler: ['Ali Veli', ''], plaka: '06 ABC 123', sofor: 'Hasan' });

test('şube toplamı kız+erkek toplamıdır', () => assert.strictEqual(G.toplam(sample()), 47));
test('plan tablosu gezi bilgilerini içerir ve metni kaçışlar', () => {
  const h = G.paper({ ...sample(), doc: 'plan-ici' });
  assert.match(h, /OKUL GEZİ PLANI/); assert.match(h, /10\.11\.2026/); assert.match(h, /Anıtkabir/); assert.match(h, /06 ABC 123/);
  assert.ok(!h.includes('<b>x</b>')); assert.match(h, /<b>47<\/b>/);
  assert.match(G.paper({ ...sample(), doc: 'plan-disi' }), /İL DIŞI OKUL GEZİ PLANI/);
});
test('onay yazısı: il içi müdür yardımcısı teklif eder, okul müdürü olur verir; il dışında makam alanı kullanılır', () => {
  const ici = G.paper({ ...sample(), doc: 'onay-ici', teklif: 'Ayşe YILMAZ', mudur: 'Mehmet DEMİR' });
  assert.match(ici, /Ayşe YILMAZ/); assert.match(ici, /Müdür Yardımcısı/); assert.match(ici, /O L U R/); assert.match(ici, /Okul Müdürü/);
  const disi = G.paper({ ...sample(), doc: 'onay-disi', makam: 'Mamak İlçe Milli Eğitim Müdürlüğüne' });
  assert.match(disi, /MAMAK İLÇE MİLLİ EĞİTİM MÜDÜRLÜĞÜNE/);
});
test('düzenlenebilir alanlar yalnızca önizlemede (edit) bulunur', () => {
  const s = { ...sample(), doc: 'onay-ici' };
  assert.ok(G.paper(s, true).includes('contenteditable'));
  assert.ok(!G.paper(s).includes('contenteditable'));
  assert.ok(!G.reportBody(s).includes('contenteditable'));
});
test('veli izin belgesi bir sayfada 3 nüsha', () => {
  const h = G.paper({ ...sample(), doc: 'veli' });
  assert.strictEqual((h.match(/GEZİ VELİ İZİN BELGESİ/g) || []).length, 3);
});
test('amaç önerileri değişir ve gezi yerini kullanır', () => {
  const a = G.amacMetni({ yer: 'Anıtkabir', amacIdx: 0 }), b = G.amacMetni({ yer: 'Anıtkabir', amacIdx: 1 });
  assert.notStrictEqual(a, b); assert.match(a, /Anıtkabir/);
});
test('menü, yönlendirme, önbellek ve stil bağlı; yeni CSS kapsamlı ve renk kodsuz', () => {
  for (const f of ['js/core/shell-ui.js', 'js/app-loader.js']) assert.match(fs.readFileSync(f, 'utf8'), /\['Gezi Planı','🚌','gezi'\]/);
  assert.match(fs.readFileSync('js/core/shell-ui.js', 'utf8'), /name==='gezi'/);
  assert.match(fs.readFileSync('service-worker.js', 'utf8'), /js\/modules\/gezi\.js/);
  const blok = css.slice(css.indexOf('A4 FORM — Gezi planı'), css.indexOf('SERVİS OTURMA IZGARASI'));
  assert.ok(blok.length > 500); assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(blok), 'hex renk olmamalı');
});

test('Gezi Planı Oluştur sekmesi: ilk sekme, öğrenci çözümleme ve belge üretimi', () => {
  assert.strictEqual(G.DOCS[0][0], 'olustur');
  const o = G.ogrenciCoz('Sınıf;No;Ad Soyad\n6/A;12;Ali Can;11111111110;Veli Can;0555\n6/B\t7\tAyşe Su');
  assert.strictEqual(o.length, 2); assert.strictEqual(o[0].veli, 'Veli Can'); assert.strictEqual(o[1].ad, 'Ayşe Su');
  const s = { ...sample(), ogrenciler: o, veliler: 'Veli Bir\nVeli İki', kafile: 'Kafile K', araclar: [{ tur: 'Otobüs', plaka: '06 XY 1', sofor: 'Şoför Ş', koltuk: '8' }] };
  const veli = G.BELGE.veli(s);
  assert.strictEqual((veli.match(/GEZİ VELİ İZİN BELGESİ/g) || []).length, 2); assert.match(veli, /Ali Can/);
  assert.match(G.BELGE.liste(s), /Ayşe Su/); assert.match(G.BELGE.surucu(s), /Şoför Ş/);
  const ot = G.BELGE.oturma(s); assert.match(ot, /Kafile K \(Kafile Başkanı\)/); assert.match(ot, /Ali Can \(6\/A\)/);
  assert.match(G.BELGE.plan(s), /06 XY 1/); assert.match(G.BELGE.plan(s), /<td colspan="3">2<\/td>/);
});

test('EK-10 beyanı ve EK-6 sözleşmesi resmî metinle üretilir', () => {
  const s = { ...sample(), okul: 'Koruk Ortaokulu', il: 'Elazığ', ilce: 'Merkez', acente: 'Deneme Turizm', ucret: '12.500', saat: '07:00 - 18:00', araclar: [{ plaka: '23 AB 1', sofor: 'Şoför Ş' }] };
  const b = G.BELGE.surucu(s); assert.match(b, /EK-10 SÜRÜCÜ\/MUAVİN\/REHBER/); assert.match(b, /Kabahatler Kanununun 35 inci/); assert.match(b, /Şoför Ş/);
  const z = G.BELGE.sozlesme(s); assert.match(z, /EK-6 EĞİTİM KURUMLARI GEZİLERİ ÇERÇEVE SÖZLEŞMESİ/); assert.match(z, /Deneme Turizm/); assert.match(z, /12\.500/); assert.match(z, /07:00/); assert.match(z, /\(Merkez \/ Elazığ\)/);
});
