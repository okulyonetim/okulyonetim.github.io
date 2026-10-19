const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync('js/modules/parent-meeting.js', 'utf8');
const css = fs.readFileSync('css/design-system-base.css', 'utf8');
const shell = fs.readFileSync('js/core/shell-ui.js', 'utf8');
const loader = fs.readFileSync('js/app-loader.js', 'utf8');
const sw = fs.readFileSync('service-worker.js', 'utf8');

function yukle(data = {}) {
  const win = { AppStore: { data: t => data[t] || [], get: () => ({}) }, toast() {} };
  win.window = win;
  vm.runInContext(src, vm.createContext({ window: win, document: { getElementById: () => null }, console }));
  return win.ParentMeetingModule;
}

test('form çıktısı fotoğraftaki başlıkları ve alanları içerir', () => {
  const html = yukle().reportBody();
  for (const t of ['VELİ GÖRÜŞME FORMU', 'Görüşme Yapılan Velinin', 'Öğrenciye Yakınlığı', 'Görüşme Tarihi', 'Öğrencinin', 'Sınıfı ve Numarası', 'Görüşme Yapan Öğretmenin', 'Branşı ve Görevi', 'Sınıf Öğretmeni', 'Görüşme Nedeni', 'Görüşme Sırasında Konuşulanlar:', 'Sonuç ve Öneriler:', 'İmza'])
    assert.ok(html.includes(t), t);
});

test('kullanıcı metni çıktıda kaçışlanır', () => {
  const m = yukle();
  m.reset();
  const html = m.reportBody();
  assert.ok(!html.includes('<script'));
  assert.match(src, /esc\(s\.konusulanlar\)/);
});

test('form kaydedilmez: Firestore/DeviceData yazımı yok', () => {
  assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//, ''), /DeviceData|firestore|COL\.|SyncEngine/i);
});

test('rota, menü ve offline önbellek bağlı', () => {
  assert.match(shell, /name==='parentmeeting'/);
  assert.match(shell, /\['Veli Görüşme Formu','[^']+','parentmeeting'\]/);
  assert.match(loader, /\['Veli Görüşme Formu','[^']+','parentmeeting'\]/);
  assert.ok(sw.includes("'./js/modules/parent-meeting.js'"));
});

test('kağıt stili sözleşmeye uyar (renk belirteçleri, hex yok)', () => {
  const a = css.indexOf('/* ===== A4 FORM — Veli Görüşme Formu'), b = css.indexOf('/* ═══════════ SERVİS OTURMA IZGARASI');
  assert.ok(a > 0 && a < b);
  assert.doesNotMatch(css.slice(a, b), /#[0-9a-fA-F]{3,8}\b/);
  const c = css.indexOf('/* ===== VELİ GÖRÜŞME FORMU (vgf-*)'), d = css.indexOf('/* ===== WEB ARAYÜZÜ (≥1100px)');
  assert.ok(c > 0 && c < d);
  css.slice(c, d).split('\n').filter(l => l.includes('{')).forEach(l => assert.match(l.trim(), /^html\[data-theme\] #v2ModuleRoot /));
});
