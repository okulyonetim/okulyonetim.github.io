const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync('js/modules/management.js', 'utf8');
const css = fs.readFileSync('css/design-system-base.css', 'utf8');
const dash = fs.readFileSync('js/modules/dashboard.js', 'utf8');

function yukle(opts = {}) {
  const yazilan = [], silinen = [], guncellenen = [];
  const win = {
    AppStore: { data: t => (opts.veri && opts.veri[t]) || [], get: () => null, subscribe: () => () => {} },
    DeviceData: {
      set: async (t, c, id, v, o) => { yazilan.push({ t, id, v, o }); },
      update: async (t, c, id, v) => { guncellenen.push({ id, v }); },
      remove: async (t, c, id) => { silinen.push(id); }
    },
    SyncEngine: opts.sync ? { register() {}, sync: opts.sync } : undefined,
    COL: { periyodikIsler: 'oy_periyodikIsler', periyodikSablon: 'oy_periyodikSablon' },
    duzenleyebilir: () => true,
    addEventListener() {}, removeEventListener() {},
    toast() {}
  };
  win.window = win;
  const ctx = vm.createContext({ ...win, window: win, globalThis: win, navigator: { onLine: opts.cevrimici !== false }, document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => ({}) }, console, setTimeout, clearTimeout, requestAnimationFrame: f => setTimeout(f, 0) });
  vm.runInContext(src, ctx);
  return { svc: win.PeriyodikService, yazilan, silinen, guncellenen };
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
  assert.match(src, /otomatikCalistir/);
  assert.doesNotMatch(src, /buAyinGorevleriniOlustur/);
  assert.match(dash, /function scanPeriodic/);
  assert.match(dash, /periyodik:\['management','tasks','Aylık İşler'\]/);
  assert.match(dash, /periodicAutoGenerate/);
  assert.match(dash, /PeriyodikService\?\.otomatikCalistir/);
  assert.doesNotMatch(src, /Bu Ayın Görevlerini Oluştur/);
});

test('kpj stilleri tasarım sözleşmesine uyar', () => {
  const a = css.indexOf('/* ===== AYLIK İŞLER (kpj-*)'), b = css.indexOf('/* ===== WEB ARAYÜZÜ (≥1100px)');
  assert.ok(a > 0 && a < b);
  const blok = css.slice(a, b);
  assert.doesNotMatch(blok, /#[0-9a-fA-F]{3,8}\b/);
  blok.split('\n').filter(l => l.includes('{') && l.trim().startsWith('html')).forEach(l => assert.match(l.trim(), /^html\[data-theme\] (#v2ModuleRoot|\.kcz-form) /));
});

const BUGUN = new Date(2026, 9, 29);
const SABLON_OKUL = [{ isAdi: 'İŞKUR işlemleri', baslangicGun: 1, bitisGun: 7 }, { isAdi: 'Nöbet İşlemleri', baslangicGun: 25, bitisGun: 30 }];

test('ad karşılaştırması büyük/küçük harf ve boşluktan bağımsız: eski sürümden kalan elle iş yeniden üretilmez', () => {
  const { svc } = yukle();
  const eski = [{ id: 'r1', isAdi: 'İŞKUR İşlemleri', baslangic: '2026-10-01', bitis: '2026-10-07' }, { id: 'r2', isAdi: ' nöbet   işlemleri ', baslangic: '2026-10-25', bitis: '2026-10-30' }];
  assert.equal(svc.eksikKurallar(SABLON_OKUL, eski, [], BUGUN).length, 0);
});

test('yinelenenleri birleştir: otomatik kalır, tamamlandı korunur, elle eklenen başka işlere dokunulmaz', async () => {
  const mevcut = [
    { id: 'pj_202610_k_maas', isAdi: 'Maaş Değişiklikleri', otomatik: true, ay: '2026-10', baslangic: '2026-10-15', bitis: '2026-10-20', tamamlandi: false },
    { id: 'rnd1', isAdi: 'Maaş Değişiklikleri', baslangic: '2026-10-15', bitis: '2026-10-20', tamamlandi: true, not: 'imzalandı' },
    { id: 'pj_202610_k_nobet', isAdi: 'Nöbet İşlemleri', otomatik: true, ay: '2026-10', baslangic: '2026-10-25', bitis: '2026-10-30' },
    { id: 'rnd2', isAdi: 'nöbet işlemleri', baslangic: '2026-10-25', bitis: '2026-10-30' },
    { id: 'rnd3', isAdi: 'Personel Puantaj İşlemleri 3 35', baslangic: '2026-10-01', bitis: '2026-10-03' },
    { id: 'rnd4', isAdi: 'Toplantı', baslangic: '2026-10-05', bitis: '2026-10-05' },
    { id: 'rnd5', isAdi: 'Toplantı', baslangic: '2026-10-06', bitis: '2026-10-06' }
  ];
  const { svc, silinen, guncellenen } = yukle();
  const n = await svc.yinelenenleriBirlestir(mevcut);
  assert.equal(n, 2);
  assert.deepEqual([...silinen].sort(), ['rnd1', 'rnd2']);
  assert.equal(guncellenen.length, 1);
  assert.equal(guncellenen[0].id, 'pj_202610_k_maas');
  assert.equal(guncellenen[0].v.tamamlandi, true);
  assert.equal(guncellenen[0].v.not, 'imzalandı');
  /* ikinci çalıştırma: kopya kalmadığı için işlem yok */
  const kalan = mevcut.filter(p => !silinen.includes(p.id));
  const b = yukle();
  assert.equal(await b.svc.yinelenenleriBirlestir(kalan), 0);
  assert.equal(b.silinen.length, 0);
});

test('farklı aylardaki aynı adlı işler birleştirilmez', async () => {
  const { svc, silinen } = yukle();
  const n = await svc.yinelenenleriBirlestir([
    { id: 'pj_202609_k_a', isAdi: 'Ek Ders İşlemleri', otomatik: true, ay: '2026-09', bitis: '2026-09-10' },
    { id: 'pj_202610_k_a', isAdi: 'Ek Ders İşlemleri', otomatik: true, ay: '2026-10', bitis: '2026-10-10' }
  ]);
  assert.equal(n, 0);
  assert.equal(silinen.length, 0);
});

test('otomatikCalistir: sunucudan çekilemezse (çevrimdışı/bayat) üretim ve birleştirme yapılmaz', async () => {
  const veri = { periyodikSablon: [{ id: 'sablon', gorevler: SABLON_OKUL }], periyodikIsler: [] };
  const cevrimdisi = yukle({ veri, cevrimici: false, sync: async () => ({ skipped: true }) });
  const r1 = await cevrimdisi.svc.otomatikCalistir({ zorla: true });
  assert.equal(r1.taze, false);
  assert.equal(cevrimdisi.yazilan.length, 0);
  const eksik = yukle({ veri, sync: async () => ({ source: 'remote', fetched: ['periyodikIsler'] }) });
  const r2 = await eksik.svc.otomatikCalistir({ zorla: true });
  assert.equal(r2.taze, false);
  assert.equal(eksik.yazilan.length, 0);
});

test('otomatikCalistir: önce şablon+işler sunucudan zorla çekilir, sonra eksikler üretilir', async () => {
  const veri = { periyodikSablon: [{ id: 'sablon', gorevler: SABLON_OKUL }], periyodikIsler: [] };
  const cagrilar = [];
  const { svc, yazilan } = yukle({ veri, sync: async (tipler, o) => { cagrilar.push({ tipler, o }); return { source: 'remote', fetched: tipler }; } });
  const r = await svc.otomatikCalistir({ zorla: true });
  assert.equal(r.taze, true);
  assert.equal(JSON.stringify(Array.from(cagrilar[0].tipler).sort()), JSON.stringify(['periyodikIsler', 'periyodikSablon']));
  assert.equal(cagrilar[0].o.force, true);
  assert.equal(yazilan.length, 2);
  assert.ok(yazilan.every(y => y.v.otomatik === true && y.id.startsWith('pj_')));
});
