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

test('kayıt koleksiyonu ve kurallar tanımlı, yazım yalnız DeviceData üzerinden', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8'), init = fs.readFileSync('js/firebase-init.js', 'utf8');
  assert.match(init, /veliGorusmeleri:'oy_veliGorusmeleri'/);
  const blok = rules.slice(rules.indexOf('match /oy_veliGorusmeleri/{id}'));
  assert.match(blok, /allow create: if girisYapmis\(\) && request\.resource\.data\.olusturanUid == request\.auth\.uid/);
  assert.match(blok, /allow update:[\s\S]*olusturanUid == resource\.data\.olusturanUid/);
  assert.match(blok, /allow delete: if girisYapmis\(\)[\s\S]*yoneticiMi\(\)/);
  assert.doesNotMatch(src, /firebase\.firestore|\.collection\(/);
});

test('öğretmen yalnız kendi kayıtlarını, yönetici hepsini görür; kayıt ekle/güncelle/sil çalışır', async () => {
  const store = [], log = [];
  const win = {
    AppStore: { data: t => (t === 'veliGorusmeleri' ? store : []), get: () => ({ uid: 'u1', admin: false }) },
    DeviceData: {
      add: async (t, c, v) => { const r = { id: 'k' + (store.length + 1), ...v }; store.push(r); log.push('add'); return r; },
      update: async (t, c, id, v) => { Object.assign(store.find(x => x.id === id), v); log.push('update'); },
      remove: async (t, c, id) => { store.splice(store.findIndex(x => x.id === id), 1); log.push('remove'); }
    },
    COL: { veliGorusmeleri: 'oy_veliGorusmeleri' }, toast() {}
  };
  win.window = win;
  const doc = { getElementById: () => null, querySelector: () => null };
  vm.runInContext(src, vm.createContext({ window: win, document: doc, console, confirm: () => true }));
  const m = win.ParentMeetingModule;
  store.push({ id: 'x', olusturanUid: 'u2', ogrenciAd: 'Başkası', tarih: '2026-10-01' }, { id: 'y', olusturanUid: 'u1', ogrenciAd: 'Benim', tarih: '2026-10-02' });
  assert.equal(JSON.stringify(m.records().map(r => r.ogrenciAd)), JSON.stringify(['Benim']));
  win.AppStore.get = () => ({ uid: 'u3', admin: true });
  assert.equal(m.records().length, 2);
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
  css.slice(c, d).split('\n').filter(l => l.includes('{') && !l.startsWith('@media')).forEach(l => assert.match(l.trim(), /^html\[data-theme\] #v2ModuleRoot /));
});

test('görev: ilkokulda Sınıf Öğretmeni, ortaokulda Sınıf Rehber Öğretmeni; boş formda boş', () => {
  const m = yukle();
  const td = h => (h.match(/<td class="vgf-mid vgf-bold">([^<]*)<\/td>/) || [])[1];
  assert.equal(td(m.reportBody({ sinif: '3-A' })), 'Sınıf Öğretmeni');
  assert.equal(td(m.reportBody({ sinif: '6-B' })), 'Sınıf Rehber Öğretmeni');
  assert.equal(td(m.reportBody({ sinif: '6-B', gorev: 'Müdür Yardımcısı' })), 'Müdür Yardımcısı');
  assert.equal(td(m.reportBody({ blank: true })), '&nbsp;');
});
