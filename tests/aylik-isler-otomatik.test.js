const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync('js/modules/management.js', 'utf8');
const css = fs.readFileSync('css/design-system-base.css', 'utf8');
const dash = fs.readFileSync('js/modules/dashboard.js', 'utf8');

function yukle() {
  const yazilan = [];
  const win = {
    AppStore: { data: () => [], get: () => null, subscribe: () => () => {} },
    DeviceData: { set: async (t, c, id, v, o) => { yazilan.push({ t, id, v, o }); } },
    COL: { periyodikIsler: 'oy_periyodikIsler', periyodikSablon: 'oy_periyodikSablon' },
    duzenleyebilir: () => true,
    addEventListener() {}, removeEventListener() {},
    toast() {}
  };
  win.window = win;
  const ctx = vm.createContext({ ...win, window: win, globalThis: win, document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => ({}) }, console, setTimeout, clearTimeout, requestAnimationFrame: f => setTimeout(f, 0) });
  vm.runInContext(src, ctx);
  return { svc: win.PeriyodikService, yazilan };
}

const sablon = [
  { isAdi: 'Ek Ders İşlemleri', baslangicGun: 1, bitisGun: 10 },
  { isAdi: 'Yaz Dışı Rapor', baslangicGun: 5, bitisGun: 20, aylar: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6] },
  { isAdi: 'Temmuz İşi', baslangicGun: 1, bitisGun: 3, aylar: [7] },
  { isAdi: 'Kapalı Kural', baslangicGun: 1, bitisGun: 2, aktif: false },
  { isAdi: 'Ay Sonu Geçişi', baslangicGun: 25, bitisGun: 3 }
];

test('kural bu ay yalnız aktif ve uygun aylarda üretilir', () => {
  const { svc } = yukle();
  const eks = svc.eksikKurallar(sablon, [], [], new Date(2026, 9, 19));
  assert.equal(JSON.stringify(eks.map(e => e.g.isAdi)), JSON.stringify(['Ek Ders İşlemleri', 'Yaz Dışı Rapor', 'Ay Sonu Geçişi']));
  assert.equal(eks[0].id, 'pj_202610_k_ek-ders-islemleri');
  const temmuz = svc.eksikKurallar(sablon, [], [], new Date(2026, 6, 2));
  assert.ok(temmuz.some(e => e.g.isAdi === 'Temmuz İşi'));
  assert.ok(!temmuz.some(e => e.g.isAdi === 'Yaz Dışı Rapor'));
});

test('aynı ay ikinci kez veya başka cihazda çalışınca çift kayıt oluşmaz', async () => {
  const { svc, yazilan } = yukle();
  const now = new Date(2026, 9, 19);
  const r1 = await svc.otomatikOlustur(sablon, [], [], now);
  assert.equal(r1.olusturulan, 3);
  const mevcut = yazilan.map(y => ({ id: y.id, ...y.v }));
  const r2 = await svc.otomatikOlustur(sablon, mevcut, [], now);
  assert.equal(r2.olusturulan, 0);
  const eski = [{ id: 'x1', isAdi: 'Ek Ders İşlemleri', baslangic: '2026-10-01', bitis: '2026-10-10' }];
  assert.ok(!svc.eksikKurallar(sablon, eski, [], now).some(e => e.g.isAdi === 'Ek Ders İşlemleri'));
});

test('üretim kaydı durum alanlarını yazmaz (mevcut tamamlanma ezilmez) ve merge kullanır', async () => {
  const { svc, yazilan } = yukle();
  await svc.otomatikOlustur(sablon, [], [], new Date(2026, 9, 19));
  for (const y of yazilan) {
    assert.equal(y.o.merge, true);
    assert.ok(!('tamamlandi' in y.v) && !('bildirimGonderildi' in y.v));
    assert.equal(y.v.otomatik, true);
    assert.equal(y.v.ay, '2026-10');
  }
});

test('tarihler: ay sonu kısaltma ve aya taşan aralık', async () => {
  const { svc, yazilan } = yukle();
  await svc.otomatikOlustur([{ isAdi: 'Geçiş', baslangicGun: 25, bitisGun: 3 }, { isAdi: 'Uzun', baslangicGun: 1, bitisGun: 31 }], [], [], new Date(2026, 11, 5));
  const g = yazilan.find(y => y.v.isAdi === 'Geçiş').v;
  assert.equal(g.baslangic, '2026-12-25');
  assert.equal(g.bitis, '2027-01-03');
  const sub = await yukle().svc._tarihler({ baslangicGun: 1, bitisGun: 31 }, 2027, 1);
  assert.equal(sub.bitis, '2027-02-28');
});

test('silinen otomatik iş engellenir ve yeniden üretilmez', () => {
  const { svc } = yukle();
  const now = new Date(2026, 9, 19);
  assert.ok(!svc.eksikKurallar(sablon, [], ['pj_202610_k_ek-ders-islemleri'], now).some(e => e.g.isAdi === 'Ek Ders İşlemleri'));
});

test('sayfa ve hatırlatma bağlantıları', () => {
  assert.match(src, /data-pj-prev/);
  assert.match(src, /function tasksAutoRun/);
  assert.match(src, /lastRemoteSyncAt/);
  assert.match(dash, /function scanPeriodic/);
  assert.match(dash, /periyodik:\['management','tasks','Aylık İşler'\]/);
  assert.match(dash, /periodicAutoGenerate/);
  assert.doesNotMatch(src, /Bu Ayın Görevlerini Oluştur/);
});

test('kpj stilleri tasarım sözleşmesine uyar', () => {
  const a = css.indexOf('/* ===== AYLIK İŞLER (kpj-*)'), b = css.indexOf('/* ===== WEB ARAYÜZÜ (≥1100px)');
  assert.ok(a > 0 && a < b);
  const blok = css.slice(a, b);
  assert.doesNotMatch(blok, /#[0-9a-fA-F]{3,8}\b/);
  blok.split('\n').filter(l => l.includes('{') && l.trim().startsWith('html')).forEach(l => assert.match(l.trim(), /^html\[data-theme\] (#v2ModuleRoot|\.kcz-form) /));
});
