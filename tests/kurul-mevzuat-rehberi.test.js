const test = require('node:test'), assert = require('node:assert'), fs = require('fs');
const src = fs.readFileSync('js/modules/committees.js', 'utf8');
const CATALOG = JSON.parse(src.match(/const CATALOG=(\[.*\]);/)[1]);
const MEV = JSON.parse(src.match(/const MEV=(\{.*\});/)[1]);

test('her katalog kaydının mevzuat bilgisi var ve alanları dolu', () => {
  for (const c of CATALOG) {
    const m = MEV[c.ad];
    assert.ok(m, c.ad + ' için mevzuat bilgisi yok');
    assert.ok(String(m[0]).length > 5, c.ad + ' dayanak');
    assert.ok(String(m[2]).length > 5, c.ad + ' oluşum');
    assert.ok(Array.isArray(m[3]) && m[3].length >= 1, c.ad + ' görevler');
    assert.ok(['a', 'b', 'c'].includes(m[4]), c.ad + ' doğrulama düzeyi');
  }
});
test('katalogda olmayan mevzuat kaydı yok ve adlar tekil', () => {
  const names = CATALOG.map(c => c.ad);
  assert.strictEqual(new Set(names).size, names.length);
  assert.deepStrictEqual(Object.keys(MEV).filter(k => !names.includes(k)), []);
});
test('yönetmelikten doğrulanan kurullar madde numarasıyla yer alır', () => {
  assert.match(MEV['Öğretmenler Kurulu'][1], /34/);
  assert.match(MEV['Zümre Öğretmenler Kurulu'][1], /35/);
  assert.match(MEV['Şube Öğretmenler Kurulu'][1], /36/);
  assert.strictEqual(MEV['Öğretmenler Kurulu'][4], 'a');
});
test('detay, form ve rehber entegrasyonu bağlı', () => {
  assert.match(src, /section\('Mevzuat Bilgisi'/);
  assert.match(src, /data-guide>📚 Mevzuat Rehberi/);
  assert.match(src, /applyMev\(c\.ad\)/);
  assert.match(src, /data-guide-create/);
});
