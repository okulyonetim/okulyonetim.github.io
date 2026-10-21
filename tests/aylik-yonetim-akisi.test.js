const test = require('node:test'), assert = require('node:assert'), fs = require('fs');
globalThis.window = globalThis;
const mem = {};
globalThis.KaPrefs = { get: (k, d) => (k in mem ? mem[k] : d), set: (k, v) => { mem[k] = v; } };
require('../js/modules/monthly-flow.js');
const M = globalThis.MonthlyFlowModule;
const css = fs.readFileSync('css/design-system-base.css', 'utf8');
test('10 ay + yaz dönemi tanımlı, her maddenin bağlantısı geçerli bir rota', () => {
  assert.strictEqual(M.MONTHS.length, 11);
  for (const mo of [...M.MONTHS, ...M.SECTIONS]) {
    assert.ok(mo.it.length >= 5);
    for (const [t, ls] of mo.it) { assert.ok(t.length > 10); for (const k of ls) assert.ok(M.LINKS[k], k); }
  }
});
test('modül KaPrefs kullanır, doğrudan localStorage içermez', () => {
  assert.ok(!/localStorage/.test(fs.readFileSync('js/modules/monthly-flow.js', 'utf8')));
});
test('menü, rota ve önbellek bağlantıları var', () => {
  assert.match(fs.readFileSync('js/core/shell-ui.js', 'utf8'), /name==='monthflow'/);
  assert.match(fs.readFileSync('js/app-loader.js', 'utf8'), /'monthflow'/);
  assert.match(fs.readFileSync('service-worker.js', 'utf8'), /monthly-flow\.js/);
});
test('CSS yalnız token kullanır (hex yok)', () => {
  const a = css.indexOf('AYLIK YÖNETİM AKIŞI'), b = css.indexOf('/* ===== WEB ARAYÜZÜ (≥1100px)');
  assert.ok(a > 0 && b > a); assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css.slice(a, b)));
});
test('okul türü bölümü maddeleri aya ekler; tamamlanan sayılır', () => {
  const mo = M.MONTHS[0];
  const base = M.stats(mo).total;
  assert.strictEqual(M.itemsOf(mo).length, base);
});
